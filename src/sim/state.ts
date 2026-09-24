import { createHash } from "node:crypto";
import type {
  Character,
  ResourceKey,
  Resources,
  SimEvent,
  WorldState,
} from "./types.ts";

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function distanceBetween(
  world: WorldState,
  fromId: string,
  toId: string,
): number {
  const from = world.settlements[fromId].position;
  const to = world.settlements[toId].position;
  return Math.hypot(to.x - from.x, to.y - from.y);
}

export function marketPrice(
  world: WorldState,
  settlementId: string,
  resource: ResourceKey,
): number {
  const settlement = world.settlements[settlementId];
  const basePrices: Resources = {
    provisions: 1.8,
    arms: 5.6,
    medicine: 7.4,
    shipMaterials: 4.5,
  };
  const scarcity = settlement.targetStocks[resource] / Math.max(1, settlement.stocks[resource]);
  return round(basePrices[resource] * clamp(scarcity, 0.55, 2.5), 2);
}

export function personalPower(character: Character): number {
  const attributes = character.attributes;
  const physical =
    attributes.power * 0.36 +
    attributes.speed * 0.18 +
    attributes.endurance * 0.24 +
    attributes.resilience * 0.22;
  const healthFactor = 0.35 + (character.health / 100) * 0.65;
  return round(physical * healthFactor);
}

export function partyPower(character: Character): number {
  const troops = character.troops;
  const troopPower = troops.count * (0.65 + troops.experience * 0.8) * (0.6 + troops.discipline * 0.6);
  const leaderEffect = 1 + character.skills.leadership / 220;
  return round(personalPower(character) * 1.5 + troopPower * leaderEffect);
}

export function factionPower(world: WorldState, factionId: string): number {
  let total = world.factions[factionId].treasury * 0.012;
  for (const settlement of Object.values(world.settlements)) {
    if (settlement.factionId === factionId) {
      total += settlement.garrison * settlement.fortification + settlement.population * 0.012;
    }
  }
  for (const character of Object.values(world.characters)) {
    if (character.factionId === factionId) total += partyPower(character);
  }
  return round(total, 2);
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableValue(nested)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

export function stateHash(world: WorldState): string {
  return createHash("sha256").update(canonicalJson(world)).digest("hex");
}

function resourcesFrom(data: Record<string, unknown>, key: string): Resources {
  return data[key] as Resources;
}

export function applyEvent(world: WorldState, event: SimEvent): void {
  const actor = event.actorId ? world.characters[event.actorId] : undefined;
  const settlement = event.settlementId ? world.settlements[event.settlementId] : undefined;

  switch (event.type) {
    case "settlement-produced":
      if (!settlement) throw new Error("Production event has no settlement");
      settlement.stocks = resourcesFrom(event.data, "stocks");
      break;
    case "settlement-upkeep":
    case "settlement-shortage":
      if (!settlement) throw new Error("Settlement upkeep event has no settlement");
      settlement.stocks = resourcesFrom(event.data, "stocks");
      settlement.stability = event.data.stability as number;
      settlement.garrison = event.data.garrison as number;
      break;
    case "character-upkeep":
    case "travel-progressed":
      if (!actor) throw new Error("Character upkeep event has no actor");
      actor.cargo = resourcesFrom(event.data, "cargo");
      actor.health = event.data.health as number;
      actor.morale = event.data.morale as number;
      actor.troops.count = event.data.troopCount as number;
      if (event.type === "travel-progressed" && actor.travel) {
        actor.travel.remainingTicks = event.data.remainingTicks as number;
      }
      break;
    case "decision-made":
      if (!actor) throw new Error("Decision event has no actor");
      actor.currentGoal = event.data.goal as string;
      actor.lastDecisionTick = world.tick;
      break;
    case "knowledge-updated":
      if (!actor) throw new Error("Knowledge event has no actor");
      actor.knowledge[event.data.settlementId as string] = event.data.knowledge as Character["knowledge"][string];
      break;
    case "plan-reconsidered":
      if (!actor) throw new Error("Plan event has no actor");
      actor.activeGoalId = event.data.selectedGoalId as string;
      actor.plan = event.data.plan as Character["plan"];
      actor.lastPlanReviewTick = world.tick;
      break;
    case "goal-progressed": {
      if (!actor) throw new Error("Goal progress event has no actor");
      const goal = actor.goals.find((candidate) => candidate.id === event.data.goalId);
      if (!goal) throw new Error(`Unknown goal: ${event.data.goalId}`);
      goal.progress = event.data.progress as number;
      goal.status = event.data.status as typeof goal.status;
      break;
    }
    case "goal-evolved": {
      if (!actor) throw new Error("Goal evolution event has no actor");
      const incoming = event.data.goal as Character["goals"][number];
      const existingIndex = actor.goals.findIndex((goal) => goal.id === incoming.id);
      if (existingIndex >= 0) actor.goals[existingIndex] = incoming;
      else actor.goals.push(incoming);
      break;
    }
    case "relationship-changed":
      if (!actor) throw new Error("Relationship event has no actor");
      actor.relationships[event.data.characterId as string] = event.data.relationship as Character["relationships"][string];
      break;
    case "travel-started":
      if (!actor) throw new Error("Travel event has no actor");
      actor.travel = event.data.travel as Character["travel"];
      actor.locationId = null;
      break;
    case "arrived":
      if (!actor) throw new Error("Arrival event has no actor");
      actor.locationId = event.data.locationId as string;
      actor.travel = null;
      break;
    case "market-trade":
      if (!actor || !settlement) throw new Error("Trade event is missing an entity");
      actor.money = event.data.characterMoney as number;
      actor.cargo = resourcesFrom(event.data, "characterCargo");
      settlement.stocks = resourcesFrom(event.data, "settlementStocks");
      if (settlement.factionId) {
        world.factions[settlement.factionId].treasury = event.data.factionTreasury as number;
      }
      break;
    case "worked":
      if (!actor || !settlement) throw new Error("Work event is missing an entity");
      actor.money = event.data.characterMoney as number;
      actor.morale = event.data.morale as number;
      if (settlement.factionId) {
        world.factions[settlement.factionId].treasury = event.data.factionTreasury as number;
      }
      break;
    case "recruited":
      if (!actor || !settlement) throw new Error("Recruitment event is missing an entity");
      actor.money = event.data.characterMoney as number;
      actor.troops.count = event.data.troopCount as number;
      settlement.stocks = resourcesFrom(event.data, "settlementStocks");
      break;
    case "rested":
      if (!actor) throw new Error("Rest event has no actor");
      actor.health = event.data.health as number;
      actor.morale = event.data.morale as number;
      actor.cargo = resourcesFrom(event.data, "cargo");
      break;
    case "battle-resolved":
      if (!actor || !settlement) throw new Error("Battle event is missing an entity");
      actor.health = event.data.attackerHealth as number;
      actor.morale = event.data.attackerMorale as number;
      actor.troops.count = event.data.attackerTroops as number;
      actor.money = event.data.attackerMoney as number;
      actor.victories = event.data.victories as number;
      actor.defeats = event.data.defeats as number;
      actor.lastBattleTick = world.tick;
      settlement.garrison = event.data.defenderGarrison as number;
      settlement.stability = event.data.settlementStability as number;
      settlement.stocks = resourcesFrom(event.data, "settlementStocks");
      break;
    case "tick-advanced":
      world.tick = event.data.nextTick as number;
      world.rngState = event.data.rngState as number;
      break;
    case "metrics-recorded":
      break;
    default:
      throw new Error(`Unknown event type: ${event.type}`);
  }

  world.nextEventSequence = Math.max(world.nextEventSequence, event.sequence + 1);
}
