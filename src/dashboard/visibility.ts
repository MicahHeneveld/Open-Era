import { assessStandingOrder } from "../sim/agency.ts";
import { commandHolderId, factionPower, partyPower, round } from "../sim/state.ts";
import type { Character, PartySighting, SimEvent, StandingOrder, SupplyContract, WorldState } from "../sim/types.ts";

/**
 * Decides what a player may legitimately know about the rest of the world.
 *
 * The design record requires that owned assets expose exact statistics while
 * foreign plans and motives are learned through observation, reports, behaviour,
 * dialogue, and investigation, and that unknown data display as unknown rather
 * than as zero. This module is the single boundary that enforces that.
 *
 * Nothing here fabricates a value. Where knowledge has not been earned the field
 * is null, so a client renders an explicit unknown instead of a plausible-looking
 * number. Ranged combat estimates are unaffected and keep coming from
 * combatForecast, which already derives its ranges from observation and strategy.
 */

export type CharacterVisibilityTier = "self" | "co-located" | "faction" | "distant";

export type CharacterIntelligenceSource =
  | "own-character"
  | "direct-observation"
  | "faction-record"
  | "reputation";

export interface CharacterIntelligence {
  tier: CharacterVisibilityTier;
  source: CharacterIntelligenceSource;
  /** True when observed condition is reported exactly rather than withheld. */
  conditionExact: boolean;
  /** True when skills and attributes sit on the faction record. */
  capabilityExact: boolean;
  observedTick: number | null;
  ageTicks: number | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * A character is directly observed when the commander shares its location with
 * neither party travelling, or when it stands inside a settlement the commander's
 * faction controls. The second clause mirrors the standard the settlement
 * projection already applies to owned territory.
 */
function isDirectlyObserved(world: WorldState, commander: Character, character: Character): boolean {
  if (
    commander.travel === null &&
    character.travel === null &&
    commander.locationId !== null &&
    commander.locationId === character.locationId
  ) {
    return true;
  }
  if (character.locationId === null || commander.factionId === null) return false;
  // A party under way is at sea, so the port it departed is not where it is.
  if (character.travel !== null) return false;
  const settlement = world.settlements[character.locationId];
  return Boolean(settlement && settlement.factionId === commander.factionId);
}

export function characterVisibilityTier(
  world: WorldState,
  commander: Character,
  character: Character,
): CharacterVisibilityTier {
  if (character.id === commander.id) return "self";
  if (isDirectlyObserved(world, commander, character)) return "co-located";
  if (commander.factionId !== null && character.factionId === commander.factionId) return "faction";
  return "distant";
}

export function characterIntelligence(
  world: WorldState,
  commander: Character,
  character: Character,
): CharacterIntelligence {
  const tier = characterVisibilityTier(world, commander, character);
  switch (tier) {
    case "self":
      return {
        tier,
        source: "own-character",
        conditionExact: true,
        capabilityExact: true,
        observedTick: world.tick,
        ageTicks: 0,
      };
    case "co-located":
      return {
        tier,
        source: "direct-observation",
        conditionExact: true,
        capabilityExact: true,
        observedTick: world.tick,
        ageTicks: 0,
      };
    case "faction":
      return {
        tier,
        source: "faction-record",
        conditionExact: false,
        capabilityExact: true,
        observedTick: null,
        ageTicks: null,
      };
    case "distant":
      return {
        tier,
        source: "reputation",
        conditionExact: false,
        capabilityExact: false,
        observedTick: null,
        ageTicks: null,
      };
  }
}

/**
 * An order is knowable to its issuer and to the character holding it. Only the
 * commander's own orders are projected, so order detail never becomes a window
 * into someone else's chain of command.
 */
export function visibleStandingOrders(commander: Character, character: Character): StandingOrder[] {
  if (character.id === commander.id) return character.standingOrders;
  return character.standingOrders.filter((order) => order.issuerId === commander.id);
}

/**
 * The commander's own knowledge of the world, with report ages made sane.
 *
 * Hearsay seeded before the world began carries a deliberately negative
 * `observedTick` so it reads as stale from tick one. The simulation is right to
 * store it that way, but a tick-of-observation before tick 0 is not something a
 * player should be shown, so the projection floors it at 0. The internal copy is
 * untouched, and every consumer that cares already floors it itself.
 */
function projectPartySighting(
  world: WorldState,
  sighting: PartySighting,
): PartySighting & { ageTicks: number } {
  return {
    ...sighting,
    ageTicks: Math.max(0, world.tick - sighting.observedTick),
  };
}

/**
 * The commander's sightings, with the age the panel prints.
 *
 * The stored count is not pulled toward a prior. No record is null, not a
 * zero, and it is not copied into `troops`.
 */
function projectPartySightings(
  world: WorldState,
  sightings: Character["partySightings"],
): Record<string, PartySighting & { ageTicks: number }> | null {
  if (!sightings) return null;
  return Object.fromEntries(
    Object.entries(sightings).map(([characterId, sighting]) => [
      characterId,
      projectPartySighting(world, sighting),
    ]),
  );
}

function projectKnowledge(knowledge: Character["knowledge"]): Character["knowledge"] {
  return Object.fromEntries(
    Object.entries(knowledge).map(([settlementId, entry]) => [
      settlementId,
      { ...entry, observedTick: Math.max(0, entry.observedTick) },
    ]),
  ) as Character["knowledge"];
}

export interface ProjectedContract {
  id: string;
  buyerId: string;
  carrierId: string;
  destinationId: string;
  deadlineTick: number;
  status: SupplyContract["status"];
  revision: number;
  observedTick: number;
  ageTicks: number;
  source: "own-character" | "faction-report";
  quantity: number | null;
  price: number | null;
  escrow: number | null;
  good: "provisions";
}

/**
 * Contracts the commander may know about.
 *
 * The two parties see the price, the quantity, and the escrow. A faction mate
 * of either party sees that the job exists, where it goes, and whether it was
 * kept. A bystander, including someone standing next to the purse, gets no row.
 */
export function projectSupplyContracts(world: WorldState, commander: Character): ProjectedContract[] {
  return Object.values(world.contracts ?? {})
    .sort((left, right) => left.id.localeCompare(right.id))
    .flatMap((contract) => {
      const row = projectOneContract(world, commander, contract);
      return row ? [row] : [];
    });
}

function projectOneContract(
  world: WorldState,
  commander: Character,
  contract: SupplyContract,
): ProjectedContract | null {
  const party = commander.id === contract.buyerId || commander.id === contract.carrierId;
  const buyer = world.characters[contract.buyerId];
  const carrier = world.characters[contract.carrierId];
  const factionMate = commander.factionId !== null && (
    commander.factionId === buyer?.factionId || commander.factionId === carrier?.factionId
  );
  if (!party && !factionMate) return null;
  return {
    id: contract.id,
    buyerId: contract.buyerId,
    carrierId: contract.carrierId,
    destinationId: contract.destinationId,
    deadlineTick: contract.deadlineTick,
    status: contract.status,
    revision: contract.revision,
    observedTick: contract.observedTick,
    ageTicks: Math.max(0, world.tick - contract.observedTick),
    source: party ? "own-character" : "faction-report",
    good: "provisions",
    quantity: party ? contract.quantity : null,
    price: party ? contract.price : null,
    escrow: party ? contract.escrow : null,
  };
}

export function projectCharacter(
  world: WorldState,
  commander: Character,
  character: Character,
): Record<string, unknown> {
  const intelligence = characterIntelligence(world, commander, character);
  const isSelf = intelligence.tier === "self";
  const condition = intelligence.conditionExact;
  const capability = intelligence.capabilityExact;

  const standingOrders = visibleStandingOrders(commander, character);
  const storedSighting = isSelf ? undefined : commander.partySightings?.[character.id];
  const activeOrder =
    standingOrders
      .filter(
        (order) =>
          (order.status === "pending" || order.status === "active") &&
          (order.expiresTick === null || order.expiresTick > world.tick),
      )
      .sort((left, right) => right.priority - left.priority)[0] ?? null;

  return {
    id: character.id,
    name: character.name,
    archetype: character.archetype,
    controller: character.controller,
    factionId: character.factionId,
    locationId: character.locationId,
    travel: character.travel,
    money: condition ? round(character.money, 2) : null,
    cargo: condition ? character.cargo : null,
    health: condition ? round(character.health, 1) : null,
    morale: condition ? round(character.morale, 1) : null,
    sailors: condition ? character.sailors : null,
    troops: condition ? character.troops : null,
    /**
     * The dated record, beside troops. Co-located troops stay live. Away, troops
     * stay null and this is the record, or null when the commander has not seen
     * this party. It is never copied into `troops`.
     */
    partySighting: storedSighting ? projectPartySighting(world, storedSighting) : null,
    captivity: condition ? character.captivity : null,
    troopRecovery: condition ? character.troopRecovery : null,
    scars: condition ? character.scars : null,
    debts: isSelf ? character.debts : null,
    attributes: capability ? character.attributes : null,
    skills: capability ? character.skills : null,
    personality: isSelf ? character.personality : null,
    /**
     * Loyalty the cover sort reads: the seed plus any unpaid-release scar.
     * Own faction only, including a mate whose personality stays hidden.
     * A rival is null. `personality.loyalty` on the commander's own row stays the seed.
     */
    loyalty: character.factionId !== null && character.factionId === commander.factionId
      ? round(character.personality.loyalty + (character.loyaltyAdjustment ?? 0), 3)
      : null,
    partyPower: condition ? partyPower(character) : null,
    activeGoal: isSelf
      ? character.goals.find((goal) => goal.id === character.activeGoalId) ?? null
      : null,
    plan: isSelf ? character.plan : null,
    relationship: commander.relationships[character.id] ?? null,
    standingOrders,
    activeOrderAssessment: activeOrder ? assessStandingOrder(character, activeOrder) : null,
    knowledge: isSelf ? projectKnowledge(character.knowledge) : null,
    /** The commander's own map. On anyone else it is null, the same as knowledge. */
    partySightings: isSelf ? projectPartySightings(world, character.partySightings) : null,
    victories: character.victories,
    defeats: character.defeats,
    intelligence,
  };
}

export function projectFactions(world: WorldState, commander: Character): Record<string, unknown>[] {
  const ownFactionId = commander.factionId;
  return Object.values(world.factions)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((faction) => {
      const owned = faction.id === ownFactionId;
      return {
        id: faction.id,
        name: faction.name,
        color: faction.color,
        commanderId: commandHolderId(world, faction.id),
        actingCommanderId: faction.actingCommanderId ?? null,
        treasury: owned ? faction.treasury : null,
        // A faction's tax is public in a way its treasury is not: every sale in
        // its ports pays it, and a merchant has to know the rate before sailing.
        taxRate: faction.taxRate,
        power: owned ? factionPower(world, faction.id) : null,
        intelligence: {
          exact: owned,
          source: owned ? "faction-record" : "reputation",
        },
      };
    });
}

function conversationThreadId(event: SimEvent): string | null {
  const data = asRecord(event.data);
  if (!data) return null;
  const thread = asRecord(data.thread);
  const fromThread = asString(thread?.id);
  if (fromThread) return fromThread;
  const message = asRecord(data.message);
  const fromMessage = asString(message?.threadId);
  if (fromMessage) return fromMessage;
  const reply = asRecord(data.reply);
  return asString(reply?.threadId);
}

/**
 * Whether the commander may see an event's raw payload.
 *
 * Prose summaries remain available for public events, but structured payloads
 * carry hidden state. A decision-made event ships the deciding character's active
 * goal id, plan intent, private beliefs about its target, and its scored
 * alternatives; plan-reconsidered ships the whole review.
 */
export function eventPayloadVisible(
  world: WorldState,
  commander: Character,
  event: SimEvent,
): boolean {
  if (event.type.startsWith("conversation-")) {
    const threadId = conversationThreadId(event);
    if (!threadId) return false;
    return world.conversationThreads[threadId]?.participantIds.includes(commander.id) ?? false;
  }

  // The commander's own actions are entirely theirs.
  if (event.actorId === commander.id) return true;

  // A contract's payload is the two parties' business. The standing-order rule
  // is the same shape, with both parties in the issuer's place. Holding the
  // destination does not open it, and neither does sharing a faction.
  if (event.type.startsWith("contract-")) {
    const data = asRecord(event.data);
    const nested = asRecord(data?.contract);
    const buyerId = asString(data?.buyerId) ?? asString(nested?.buyerId);
    const carrierId = asString(data?.carrierId) ?? asString(nested?.carrierId);
    return commander.id === buyerId || commander.id === carrierId;
  }

  // Orders are knowable within the chain of command that issued them.
  if (event.type.startsWith("standing-order-")) {
    const orderId = asString(asRecord(event.data)?.orderId);
    const recipient = event.targetId ? world.characters[event.targetId] : undefined;
    const order = orderId
      ? recipient?.standingOrders.find((entry) => entry.id === orderId)
      : undefined;
    if (order?.issuerId === commander.id) return true;
  }

  // Anything else attributed to a character belongs to that character. Motives,
  // beliefs, and logistics stay private even for faction peers, because the
  // character projection withholds the same fields and a feed that revealed them
  // would be a back door around it.
  //
  // Note what this deliberately does not depend on: where the event happened.
  // Owning the ground a decision was taken on grants no insight into the decision
  // itself. Keying on location instead let a player gain omniscience over every
  // visitor to a port simply by capturing it.
  if (event.actorId !== undefined) return false;

  // Unattributed events are settlement or world events, where control of the
  // ground legitimately decides what the commander's administration is told.
  if (commander.factionId === null || event.settlementId === undefined) return false;
  return world.settlements[event.settlementId]?.factionId === commander.factionId;
}

/**
 * Projects one event. When the payload is withheld the summary falls back to a
 * neutral line, because the rich summaries interpolate private data such as a
 * character's stated reason for reconsidering its plan.
 */
export function projectEvent(
  world: WorldState,
  commander: Character,
  event: SimEvent,
  richSummary: string,
): Record<string, unknown> {
  const visible = eventPayloadVisible(world, commander, event);
  const actor = event.actorId ? world.characters[event.actorId]?.name ?? event.actorId : "World";
  return {
    sequence: event.sequence,
    tick: event.tick,
    day: round(event.tick / world.ticksPerDay, 2),
    type: event.type,
    actorId: event.actorId,
    targetId: event.targetId,
    settlementId: event.settlementId,
    summary: visible ? richSummary : `${actor}: ${event.type.replaceAll("-", " ")}`,
    data: visible ? event.data : null,
    payloadWithheld: !visible,
  };
}
