import { assessStandingOrder } from "../sim/agency.ts";
import { commandHolderId, factionPower, partyPower, round } from "../sim/state.ts";
import type { Character, PartySighting, SimEvent, StandingOrder, SupplyContract, TravelState, WorldState } from "../sim/types.ts";
import { causeLabelFor, learnedInPortNote, loyaltyNoteFor, seatSummaryFor, skillsWithheldNote, summaryStaysWhenWithheld } from "./wording.ts";

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

export type SeaSightingKind = "passing" | "sharing" | "overtaking" | "arriving";

/**
 * One ship met at sea, derived at read time.
 *
 * Nothing here is stored. `ageTicks` is computed for the panel and is 0 on
 * every row this rule emits, because `observedTick` is the snapshot tick.
 */
export interface SeaSighting {
  characterId: string;
  factionId: string | null;
  fromId: string;
  toId: string;
  kind: SeaSightingKind;
  arriving: boolean;
  sailors: number;
  troops: number;
  partyPower: number;
  observedTick: number;
  source: "direct";
  confidence: 1;
  ageTicks: number;
  /** The sentence the briefing lists. The troop count stays on this row. */
  summary: string;
}

interface WaterSpan {
  loNum: number;
  loDen: number;
  loClosed: boolean;
  hiNum: number;
  hiDen: number;
  hiClosed: boolean;
}

/** A ship still at sea: a voyage with at least one tick left. */
function atSea(character: Character): character is Character & { travel: TravelState } {
  const travel = character.travel;
  return travel !== null
    && travel.totalTicks >= 1
    && travel.remainingTicks >= 1
    && travel.remainingTicks <= travel.totalTicks;
}

function compareRational(aNum: number, aDen: number, bNum: number, bDen: number): number {
  const left = aNum * bDen;
  const right = bNum * aDen;
  return left < right ? -1 : left > right ? 1 : 0;
}

function pointSpan(value: number): WaterSpan {
  return {
    loNum: value,
    loDen: 1,
    loClosed: true,
    hiNum: value,
    hiDen: 1,
    hiClosed: true,
  };
}

/**
 * The stretch of the leg crossed this tick, in the ship's own direction.
 *
 * Zero sailed ticks is the departure point. Otherwise the span is open at the
 * previous end and closed at the current end.
 */
function directedSpan(travel: TravelState): WaterSpan {
  const sailed = travel.totalTicks - travel.remainingTicks;
  if (sailed <= 0) return pointSpan(0);
  return {
    loNum: sailed - 1,
    loDen: travel.totalTicks,
    loClosed: false,
    hiNum: sailed,
    hiDen: travel.totalTicks,
    hiClosed: true,
  };
}

/**
 * The same stretch on an axis that runs from the lexicographically smaller
 * settlement id to the larger. A ship sailing toward the smaller id is flipped.
 */
function axisSpan(travel: TravelState): WaterSpan {
  if (travel.fromId < travel.toId) return directedSpan(travel);
  if (travel.remainingTicks >= travel.totalTicks) return pointSpan(1);
  return {
    loNum: travel.remainingTicks,
    loDen: travel.totalTicks,
    loClosed: true,
    hiNum: travel.remainingTicks + 1,
    hiDen: travel.totalTicks,
    hiClosed: false,
  };
}

function spanEntirelyBefore(left: WaterSpan, right: WaterSpan): boolean {
  const compared = compareRational(left.hiNum, left.hiDen, right.loNum, right.loDen);
  if (compared < 0) return true;
  if (compared > 0) return false;
  return !left.hiClosed || !right.loClosed;
}

function spansOverlap(left: WaterSpan, right: WaterSpan): boolean {
  return !spanEntirelyBefore(left, right) && !spanEntirelyBefore(right, left);
}

function sameLeg(left: TravelState, right: TravelState): boolean {
  return left.fromId === right.fromId && left.toId === right.toId;
}

function oppositeLane(left: TravelState, right: TravelState): boolean {
  return left.fromId === right.toId && left.toId === right.fromId;
}

function meetingKind(observer: TravelState, subject: TravelState): { kind: SeaSightingKind; arriving: boolean } | null {
  const bothLast = observer.remainingTicks === 1 && subject.remainingTicks === 1;
  if (oppositeLane(observer, subject) && spansOverlap(axisSpan(observer), axisSpan(subject))) {
    return { kind: "passing", arriving: false };
  }
  if (sameLeg(observer, subject) && spansOverlap(directedSpan(observer), directedSpan(subject))) {
    return {
      kind: observer.totalTicks === subject.totalTicks ? "sharing" : "overtaking",
      arriving: bothLast,
    };
  }
  if (bothLast && observer.toId === subject.toId) {
    return { kind: "arriving", arriving: true };
  }
  return null;
}

function seaRow(world: WorldState, subject: Character, kind: SeaSightingKind, arriving: boolean): SeaSighting {
  const travel = subject.travel!;
  const observedTick = world.tick;
  return {
    characterId: subject.id,
    factionId: subject.factionId,
    fromId: travel.fromId,
    toId: travel.toId,
    kind,
    arriving,
    sailors: subject.sailors,
    troops: subject.troops.count,
    partyPower: partyPower(subject),
    observedTick,
    source: "direct",
    confidence: 1,
    ageTicks: Math.max(0, world.tick - observedTick),
    summary: seaSummary(world, subject, kind, arriving, subject.troops.count, Math.max(0, world.tick - observedTick)),
  };
}

function seaSummary(
  world: WorldState,
  subject: Character,
  kind: SeaSightingKind,
  arriving: boolean,
  troops: number,
  ageTicks: number,
): string {
  const travel = subject.travel!;
  const from = world.settlements[travel.fromId]?.name ?? travel.fromId;
  const to = world.settlements[travel.toId]?.name ?? travel.toId;
  const dock = arriving ? ` Docks at ${to} on this tick.` : "";
  return `${subject.name} is ${kind}, ${from} to ${to}.${dock} ${troops} troops, ${ageTicks} ticks old.`;
}

export interface OutOfStretch {
  characterId: string;
  fromId: string;
  toId: string;
  remainingTicks: number;
  totalTicks: number;
  summary: string;
}

/**
 * Ships on the commander's leg whose stretch of water does not meet hers.
 * Null in port. No troop count: at sea that figure is withheld.
 */
export function outOfStretchFor(world: WorldState, observer: Character): OutOfStretch[] | null {
  if (!atSea(observer)) return null;
  const rows: OutOfStretch[] = [];
  for (const subject of Object.values(world.characters).sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0)) {
    if (subject.id === observer.id || !atSea(subject)) continue;
    if (!sameLeg(observer.travel, subject.travel)) continue;
    if (meetingKind(observer.travel, subject.travel)) continue;
    const from = world.settlements[subject.travel.fromId]?.name ?? subject.travel.fromId;
    const to = world.settlements[subject.travel.toId]?.name ?? subject.travel.toId;
    rows.push({
      characterId: subject.id,
      fromId: subject.travel.fromId,
      toId: subject.travel.toId,
      remainingTicks: subject.travel.remainingTicks,
      totalTicks: subject.travel.totalTicks,
      summary: `${subject.name} is on ${from} to ${to}, ${subject.travel.remainingTicks} of ${subject.travel.totalTicks} ticks left, and is not in the same stretch of water.`,
    });
  }
  return rows;
}

/**
 * The commander's sea list, or null when the commander is not at sea.
 *
 * Computed from the current voyages. It does not write the world, draw RNG,
 * or keep a row after the ships separate.
 */
export function seaSightingsFor(world: WorldState, observer: Character): Record<string, SeaSighting> | null {
  if (!atSea(observer)) return null;
  const rows: Record<string, SeaSighting> = {};
  for (const subject of Object.values(world.characters).sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0)) {
    if (subject.id === observer.id || !atSea(subject)) continue;
    const meeting = meetingKind(observer.travel, subject.travel);
    if (!meeting) continue;
    rows[subject.id] = seaRow(world, subject, meeting.kind, meeting.arriving);
  }
  return rows;
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
  const seaSightings = isSelf ? seaSightingsFor(world, character) : null;
  const seaSighting = isSelf ? null : seaSightingsFor(world, commander)?.[character.id] ?? null;
  const dockedTogether = !isSelf &&
    commander.travel === null &&
    character.travel === null &&
    commander.locationId !== null &&
    commander.locationId === character.locationId;
  const loyalty = character.factionId !== null && character.factionId === commander.factionId
    ? round(character.personality.loyalty + (character.loyaltyAdjustment ?? 0), 3)
    : null;
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
    /**
     * Why the hold and the purse are on this card. Only when both ships are
     * in the same port. A sea card does not get it, and neither does a remote
     * reading through an owned port, where that sentence would be false.
     */
    conditionNote: dockedTogether && commander.locationId
      ? learnedInPortNote(world.settlements[commander.locationId]?.name ?? commander.locationId)
      : null,
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
    /**
     * A ship met on this snapshot. Beside troops, and never copied into them.
     * Null when the commander is not alongside, including in port.
     */
    seaSighting,
    captivity: condition && character.captivity
      ? { ...character.captivity, causeLabel: causeLabelFor(character.captivity.cause) }
      : null,
    troopRecovery: condition ? character.troopRecovery : null,
    scars: condition ? character.scars : null,
    debts: isSelf ? character.debts : null,
    attributes: capability ? character.attributes : null,
    skills: capability ? character.skills : null,
    /** Present when skills are withheld, so a null leadership is not a missing person. */
    skillsNote: capability ? null : skillsWithheldNote(character.name, intelligence.tier, intelligence.source),
    personality: isSelf ? character.personality : null,
    /**
     * Loyalty the cover sort reads: the seed plus any unpaid-release scar.
     * Own faction only, including a mate whose personality stays hidden.
     * A rival is null. `personality.loyalty` on the commander's own row stays the seed.
     */
    loyalty,
    /** Which figure the seat reads. The commander's own card only. */
    loyaltyNote: isSelf ? loyaltyNoteFor(character, round(character.personality.loyalty + (character.loyaltyAdjustment ?? 0), 3)) : null,
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
    /** The commander's own sea list. On anyone else it is null. Null in port. */
    seaSightings,
    /** Same leg, outside her stretch. Null in port and on anyone else. */
    outOfStretch: isSelf ? outOfStretchFor(world, character) : null,
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
        seatSummary: seatSummaryFor(world, faction),
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
    summary: visible || summaryStaysWhenWithheld(event.type) ? richSummary : `${actor}: ${event.type.replaceAll("-", " ")}`,
    data: visible ? event.data : null,
    payloadWithheld: !visible,
  };
}
