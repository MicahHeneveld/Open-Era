import { assessStandingOrder } from "../sim/agency.ts";
import { factionPower, marketPrice, partyPower, round } from "../sim/state.ts";
import { RESOURCE_KEYS, type SimEvent, type WorldState } from "../sim/types.ts";

function eventSummary(world: WorldState, event: SimEvent): string {
  const actor = event.actorId ? world.characters[event.actorId]?.name ?? event.actorId : "World";
  const target = event.targetId
    ? world.characters[event.targetId]?.name ?? world.settlements[event.targetId]?.name ?? world.factions[event.targetId]?.name ?? event.targetId
    : null;
  const settlement = event.settlementId ? world.settlements[event.settlementId]?.name ?? event.settlementId : null;
  switch (event.type) {
    case "player-command-accepted":
      return `Command queued for ${actor}`;
    case "player-command-resolved":
      return `${actor}: ${String(event.data.outcome).replaceAll("-", " ")}`;
    case "player-command-failed":
      return `${actor}'s command failed: ${event.data.reason}`;
    case "standing-order-issued":
      return `${actor} issued ${String((event.data.order as { directive: string }).directive).replaceAll("-", " ")} orders to ${target}`;
    case "plan-reconsidered":
      return `${actor} reconsidered their plan: ${event.data.reason}`;
    case "battle-resolved":
      return `${actor} ${event.data.outcome === "attacker-victory" ? "won" : "lost"} at ${settlement}`;
    case "arrived":
      return `${actor} arrived at ${settlement}`;
    case "travel-started":
      return `${actor} departed for ${target}`;
    case "market-trade":
      return `${actor} ${event.data.direction} ${event.data.quantity} ${event.data.resource} at ${settlement}`;
    case "goal-evolved":
      return `${actor}'s ambitions changed after ${event.data.trigger}`;
    case "settlement-shortage":
      return `${settlement} is suffering a provisions shortage`;
    default:
      return `${actor}: ${event.type.replaceAll("-", " ")}`;
  }
}

export function dashboardState(world: WorldState, events: SimEvent[]): Record<string, unknown> {
  const player = Object.values(world.players)[0];
  const commander = world.characters[player.characterId];
  return {
    tick: world.tick,
    day: round(world.tick / world.ticksPerDay, 2),
    ticksPerDay: world.ticksPerDay,
    player,
    commanderId: commander.id,
    pendingCommands: world.pendingCommands,
    factions: Object.values(world.factions).map((faction) => ({
      ...faction,
      power: factionPower(world, faction.id),
    })),
    settlements: Object.values(world.settlements).map((settlement) => ({
      ...settlement,
      prices: Object.fromEntries(RESOURCE_KEYS.map((resource) => [resource, marketPrice(world, settlement.id, resource)])),
      partyCount: Object.values(world.characters).filter((character) => character.locationId === settlement.id).length,
    })),
    characters: Object.values(world.characters).map((character) => {
      const activeGoal = character.goals.find((goal) => goal.id === character.activeGoalId) ?? null;
      const relationship = commander.relationships[character.id] ?? null;
      const activeOrder = character.standingOrders
        .filter((order) => order.expiresTick === null || order.expiresTick >= world.tick)
        .sort((left, right) => right.priority - left.priority)[0] ?? null;
      return {
        id: character.id,
        name: character.name,
        archetype: character.archetype,
        controller: character.controller,
        factionId: character.factionId,
        locationId: character.locationId,
        travel: character.travel,
        money: round(character.money, 2),
        cargo: character.cargo,
        health: round(character.health, 1),
        morale: round(character.morale, 1),
        sailors: character.sailors,
        troops: character.troops,
        attributes: character.attributes,
        skills: character.skills,
        personality: character.personality,
        partyPower: partyPower(character),
        activeGoal,
        plan: character.plan,
        relationship,
        standingOrders: character.standingOrders,
        activeOrderAssessment: activeOrder ? assessStandingOrder(character, activeOrder) : null,
        knowledge: character.knowledge,
        victories: character.victories,
        defeats: character.defeats,
      };
    }),
    events: events.map((event) => ({
      sequence: event.sequence,
      tick: event.tick,
      day: round(event.tick / world.ticksPerDay, 2),
      type: event.type,
      actorId: event.actorId,
      targetId: event.targetId,
      settlementId: event.settlementId,
      summary: eventSummary(world, event),
      data: event.data,
    })).reverse(),
  };
}
