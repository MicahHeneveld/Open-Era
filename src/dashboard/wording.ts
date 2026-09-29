import { commandHolderId } from "../sim/state.ts";
import type { Character, Faction, SimEvent, WorldState } from "../sim/types.ts";

/**
 * Player-facing sentences. They are built when the state is read.
 * Nothing here writes the world, an event, or a stored cause.
 */

const OUTSCORE_CAUSE_LABEL = "taken on the dock after the other side won on a higher score";

/** The card label beside a stored `outscore-loss`. Other causes keep no extra label. */
export function causeLabelFor(cause: unknown): string | null {
  return cause === "outscore-loss" ? OUTSCORE_CAUSE_LABEL : null;
}

/**
 * A battle the payload itself rules out of a standing win.
 *
 * Troops at least 8, health above 15, morale at or below 12, garrison not 0,
 * and a higher attacker score. A finished major with morale above 12 can be a
 * standing win or an outscore win, and the battle event does not carry the
 * phase tally, so that case keeps `won at`.
 */
export function higherScoreWin(data: Record<string, unknown>): boolean {
  if (data.outcome !== "attacker-victory") return false;
  const troops = numberOrNull(data.attackerTroops);
  const health = numberOrNull(data.attackerHealth);
  const morale = numberOrNull(data.attackerMorale);
  const garrison = numberOrNull(data.defenderGarrison);
  const attackerScore = numberOrNull(data.attackerScore);
  const defenderScore = numberOrNull(data.defenderScore);
  if (
    troops === null || health === null || morale === null ||
    garrison === null || attackerScore === null || defenderScore === null
  ) return false;
  return troops >= 8 && health > 15 && morale <= 12 && garrison !== 0 && attackerScore > defenderScore;
}

/** ` on a higher score` when the payload rules the standing win out, otherwise empty. */
export function higherScoreClause(data: Record<string, unknown>): string {
  return higherScoreWin(data) ? " on a higher score" : "";
}

/**
 * Feed rows that keep the briefing sentence when the payload stays withheld.
 * `data` stays null. A decision, a contract, and an upkeep row are not in this set.
 */
export function summaryStaysWhenWithheld(type: string): boolean {
  return type === "character-captured" || type === "captivity-released" || type === "battle-resolved";
}

export function characterName(world: WorldState, id: string | undefined, fallback: string): string {
  if (!id) return fallback;
  return world.characters[id]?.name ?? id;
}

export function settlementName(world: WorldState, id: string | undefined, fallback: string): string {
  if (!id) return fallback;
  return world.settlements[id]?.name ?? id;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** The captor faction on the capture row. A test event with no target falls back to the hold. */
export function captorName(world: WorldState, event: SimEvent): string {
  if (event.targetId && world.factions[event.targetId]) return world.factions[event.targetId].name;
  const captivity = event.data.captivity;
  if (captivity && typeof captivity === "object") {
    const id = (captivity as { captorFactionId?: unknown }).captorFactionId;
    if (typeof id === "string") return world.factions[id]?.name ?? id;
  }
  return "Unknown captor";
}

/**
 * The actor of the `battle-resolved` row whose `battleId` matches this capture.
 * A read handed only the capture cannot see that name.
 */
export function namedBattleWinner(world: WorldState, event: SimEvent, events?: SimEvent[]): string | null {
  const battleId = event.data.battleId;
  if (typeof battleId !== "string" || !events) return null;
  const battle = events.find((candidate) => candidate.type === "battle-resolved" && candidate.data.battleId === battleId);
  if (!battle?.actorId) return null;
  return world.characters[battle.actorId]?.name ?? battle.actorId;
}

export function characterCapturedSentence(world: WorldState, event: SimEvent, events?: SimEvent[]): string {
  const prisoner = characterName(world, event.actorId, "Someone");
  const settlement = settlementName(world, event.settlementId, "the port");
  const captor = captorName(world, event);
  const cause = typeof event.data.cause === "string" ? event.data.cause : "";
  if (cause === "outscore-loss") {
    const winner = namedBattleWinner(world, event, events) ?? "the attacker";
    return `${captor} took ${prisoner} on the dock at ${settlement} after ${winner} won there on a higher score`;
  }
  const causeText = cause ? cause.replaceAll("-", " ") : "the fight";
  return `${captor} took ${prisoner} at ${settlement} after ${causeText}`;
}

/** Chronicle body, without the day prefix. The winner is bold only when the battle row names them. */
export function characterCapturedChronicle(world: WorldState, event: SimEvent, events?: SimEvent[]): string {
  const prisoner = characterName(world, event.actorId, "Someone");
  const settlement = settlementName(world, event.settlementId, "the port");
  const captor = captorName(world, event);
  const cause = typeof event.data.cause === "string" ? event.data.cause : "";
  if (cause === "outscore-loss") {
    const winner = namedBattleWinner(world, event, events);
    const winnerText = winner ? `**${winner}**` : "the attacker";
    return `**${captor}** took **${prisoner}** on the dock at **${settlement}** after ${winnerText} won there on a higher score; their surviving troops scattered.`;
  }
  const causeText = cause ? cause.replaceAll("-", " ") : "the fight";
  return `**${captor}** took **${prisoner}** at **${settlement}** after ${causeText}; their surviving troops scattered.`;
}

export interface SeatReturn {
  name: string;
  faction: string;
}

/**
 * The freed character is still the person who issues the faction's orders.
 * The cover has already been cleared by the time a release is read, so the
 * line names the holder who returns and does not name the cover.
 */
export function seatReturn(world: WorldState, characterId: string | undefined): SeatReturn | null {
  if (!characterId) return null;
  const character = world.characters[characterId];
  if (!character?.factionId) return null;
  if (commandHolderId(world, character.factionId) !== character.id) return null;
  const faction = world.factions[character.factionId];
  if (!faction) return null;
  return { name: character.name, faction: faction.name };
}

export function seatReturnSentence(seat: SeatReturn): string {
  return `${seat.name} holds the seat of ${seat.faction} again`;
}

export function captivityReleasedSentence(world: WorldState, event: SimEvent): string {
  const actor = characterName(world, event.actorId, "Someone");
  const settlement = settlementName(world, event.settlementId, "captivity");
  const terms = event.data.terms as { moneyPaid: number; debtValue: number };
  let sentence = `${actor} was released from ${settlement}: ${terms.moneyPaid} paid and ${terms.debtValue} recorded as debt`;
  if (typeof terms.debtValue === "number" && terms.debtValue > 0) sentence += ". Loyalty fell";
  const seat = seatReturn(world, event.actorId);
  if (seat) sentence += `. ${seatReturnSentence(seat)}`;
  return sentence;
}

export function captivityReleasedChronicle(world: WorldState, event: SimEvent): string {
  const actor = characterName(world, event.actorId, "Someone");
  const settlement = settlementName(world, event.settlementId, "captivity");
  const terms = event.data.terms as { moneyPaid: number; debtValue: number };
  let sentence = `**${actor}** was released from **${settlement}** under mandatory terms: ${terms.moneyPaid} paid and ${terms.debtValue} recorded as debt.`;
  if (typeof terms.debtValue === "number" && terms.debtValue > 0) sentence += " Loyalty fell.";
  const seat = seatReturn(world, event.actorId);
  if (seat) sentence += ` **${seat.name}** holds the seat of **${seat.faction}** again.`;
  return sentence;
}

export function captivityEscapedSentence(world: WorldState, event: SimEvent): string {
  const actor = characterName(world, event.actorId, "Someone");
  const settlement = settlementName(world, event.settlementId, "captivity");
  let sentence = `${actor} escaped captivity at ${settlement} and suffered ${event.data.injury} health damage`;
  const seat = seatReturn(world, event.actorId);
  if (seat) sentence += `. ${seatReturnSentence(seat)}`;
  return sentence;
}

export function captivityEscapedChronicle(world: WorldState, event: SimEvent, scar: { attribute: string; penalty: number } | null): string {
  const actor = characterName(world, event.actorId, "Someone");
  const settlement = settlementName(world, event.settlementId, "captivity");
  let sentence = `**${actor}** escaped captivity at **${settlement}**, suffering ${event.data.injury} health damage${scar ? ` and a permanent -${scar.penalty} ${scar.attribute} scar` : ""}.`;
  const seat = seatReturn(world, event.actorId);
  if (seat) sentence += ` **${seat.name}** holds the seat of **${seat.faction}** again.`;
  return sentence;
}

/** While a cover is set. Null when the seat is not being covered. */
export function seatSummaryFor(world: WorldState, faction: Faction): string | null {
  const actingId = faction.actingCommanderId;
  if (!actingId) return null;
  const holderId = commandHolderId(world, faction.id);
  const cover = world.characters[actingId];
  const holder = holderId ? world.characters[holderId] : undefined;
  if (!cover || !holder) return null;
  return `${cover.name} covers ${holder.name}'s seat in ${faction.name} while ${holder.name} is held. The orders stay ${holder.name}'s.`;
}

/**
 * Which figure the seat sort reads, on the commander's own card.
 * `displayedLoyalty` is that sum rounded to 3 decimals, the `loyalty` field.
 */
export function loyaltyNoteFor(character: Character, displayedLoyalty: number): string {
  const seed = character.personality.loyalty;
  const adjustment = character.loyaltyAdjustment;
  const sum = seed + (adjustment ?? 0);
  if (adjustment === undefined || adjustment === 0) {
    return `The seat reads ${sum}, personality loyalty with no stored adjustment. The loyalty figure on this card rounds that to ${displayedLoyalty}.`;
  }
  return `The seat reads ${sum}, personality loyalty ${seed} plus the stored adjustment ${adjustment}. The loyalty figure on this card rounds that to ${displayedLoyalty}. personality.loyalty is the seed and is not the figure the seat reads.`;
}

export function skillsWithheldNote(name: string, tier: string, source: string): string {
  return `${name}'s leadership is withheld on this card. The reading is ${tier} (${source}), so skills stay off the card.`;
}

export function learnedInPortNote(place: string): string {
  return `Learned at ${place}. The hold and the purse are on this card because both ships are in port.`;
}

/** The upkeep row already stores the passage. Null when this upkeep was not a voyage. */
export function passageUpkeepSentence(world: WorldState, event: SimEvent): string | null {
  const passage = event.data.passageCost;
  const left = event.data.characterMoney;
  if (typeof passage !== "number" || typeof left !== "number") return null;
  const actor = characterName(world, event.actorId, "Someone");
  return `${actor} paid ${passage} passage. ${left} left.`;
}

/**
 * The panel title. `attentionCount` stays the decision count.
 * Background lines are the items drawn beyond that count.
 */
export function attentionLabel(attentionCount: number, shownCount: number): string {
  if (attentionCount <= 0) return "Check-in · clear";
  const background = shownCount - attentionCount;
  if (background <= 0) return `Check-in · ${attentionCount} need attention`;
  const noun = background === 1 ? "1 background line is" : `${background} background lines are`;
  return `Check-in · ${attentionCount} need attention, and ${noun} listed with them.`;
}
