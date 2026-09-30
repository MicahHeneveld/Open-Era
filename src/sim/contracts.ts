import { travelDuration } from "./engine.ts";
import { clamp, marketPrice, round } from "./state.ts";
import type { Character, Relationship, SupplyContract, WorldState } from "./types.ts";

/** Missing-relationship defaults from `assessStandingOrder`, used only by the score. */
const SCORE_TRUST = 0.35;
const SCORE_RESPECT = 0.35;

/**
 * A side that has no tie yet starts here. These are the defaults
 * `evolveLocalRelationship` writes before it shifts anything.
 */
const RELATIONSHIP_BASE = {
  trust: 0.28,
  affinity: 0.25,
  respect: 0.28,
  fear: 0.08,
  grievance: 0,
  obligation: 0,
} as const;

/** The same shifts a fight under orders already writes. */
const VICTORY = { trust: 0.012, respect: 0.028, fear: -0.005, grievance: -0.006, obligation: -0.01 } as const;
const DEFEAT = { trust: -0.025, respect: -0.008, fear: 0.018, grievance: 0.035, obligation: 0.015 } as const;

export interface ContractTerms {
  buyerId: string;
  quantity: number;
  price: number;
  destinationId: string;
  deadlineTick: number;
}

export interface ContractFactors {
  commerce: number;
  margin: number;
  trust: number;
  respect: number;
  grievance: number;
  obligation: number;
  perceivedRisk: number;
}

export interface ContractAssessment {
  accepted: boolean;
  /** `travel` and `purse` are hard gates. `score` is the line. Null when accepted. */
  gate: "travel" | "purse" | "score" | null;
  /** Player-readable sentence when a hard gate refuses. Null when the score is the decision. */
  reason: string | null;
  /**
   * Null when the carrier is already at sea. That refusal happens before any
   * score, so a zero would be a placeholder, not a judgment.
   */
  score: number | null;
  threshold: number;
  factors: ContractFactors;
  travelTicks: number;
  ticksLeft: number;
  /**
   * Quantity times the provisions price where the carrier is standing.
   * Null when they are not standing anywhere. That path never scores.
   * A docked voyage that does not fit the deadline still has this price.
   */
  costBasis: number | null;
}

/** Said on the refusal the player reads. A carrier underway has no market under them. */
export const AT_SEA_REASON = "The carrier is already at sea.";

/** Said when a docked carrier cannot reach the shelf before the deadline. */
export const VOYAGE_REASON = "The voyage does not fit the deadline.";

const UNSCORED_FACTORS: ContractFactors = {
  commerce: 0,
  margin: 0,
  trust: 0,
  respect: 0,
  grievance: 0,
  obligation: 0,
  perceivedRisk: 0,
};

/**
 * Ticks the carrier still needs to reach the shelf.
 *
 * Already standing there is 0, which `travelDuration` does not return: that
 * helper's floor is 2, and a delivery that does not sail must not be refused
 * for a voyage that will not happen.
 *
 * A carrier at sea has no `locationId`. `travelDuration` then returns 1, which
 * is not the voyage to the shelf. Callers must not treat that 1 as a haul.
 */
export function contractTravelTicks(world: WorldState, carrier: Character, destinationId: string): number {
  if (carrier.travel || !carrier.locationId) return carrier.travel?.remainingTicks ?? 1;
  if (carrier.locationId === destinationId) return 0;
  return travelDuration(world, carrier, destinationId);
}

/**
 * Whether the carrier takes the haul. No RNG.
 *
 * Hard gates first. A carrier already at sea is refused before any score:
 * `travelDuration` would report 1 tick, and there is no provisions price
 * under them, so a margin on that price is zero for every offer. A docked
 * voyage that does not fit the ticks left is the same gate. The purse gate
 * is next. Only then do the weights match `assessStandingOrder`, with margin
 * in place of an order priority.
 *
 * The board price cannot be zero. `resourcePrice` clamps scarcity to at least
 * 0.55 against a provisions base of 1.8, so a carrier standing at a settlement
 * has a positive cost basis for every quantity of at least 1. Scoring is
 * reached only on that path.
 */
export function assessSupplyContract(
  world: WorldState,
  carrier: Character,
  terms: ContractTerms,
): ContractAssessment {
  const ticksLeft = terms.deadlineTick - world.tick;
  const threshold = round(0.54 + carrier.personality.ambition * 0.08);
  if (carrier.travel || !carrier.locationId) {
    return {
      accepted: false,
      gate: "travel",
      reason: AT_SEA_REASON,
      score: null,
      threshold,
      factors: UNSCORED_FACTORS,
      travelTicks: carrier.travel?.remainingTicks ?? 1,
      ticksLeft,
      costBasis: null,
    };
  }

  const travelTicks = contractTravelTicks(world, carrier, terms.destinationId);
  const standing = marketPrice(world, carrier.locationId, "provisions");
  const costBasis = round(terms.quantity * standing, 2);
  const destination = world.settlements[terms.destinationId];
  const alreadyThere = travelTicks === 0;
  const neutral = destination?.factionId === null;
  const theirs = destination?.factionId !== null && destination?.factionId === carrier.factionId;
  const risk = alreadyThere || neutral || theirs ? 0.25 : 0.88;
  const relationship = carrier.relationships[terms.buyerId];
  const factors: ContractFactors = {
    commerce: round(carrier.personality.commerce * 0.30),
    margin: round(clamp((terms.price - costBasis) / costBasis, -0.25, 0.25)),
    trust: round((relationship?.trust ?? SCORE_TRUST) * 0.14),
    respect: round((relationship?.respect ?? SCORE_RESPECT) * 0.16),
    grievance: round(-(relationship?.grievance ?? 0) * 0.18),
    obligation: round((relationship?.obligation ?? 0) * 0.08),
    perceivedRisk: round(-carrier.personality.caution * risk * 0.16),
  };
  const score = round(clamp(
    factors.commerce + factors.margin + factors.trust + factors.respect + factors.grievance + factors.obligation + factors.perceivedRisk,
    0,
    1,
  ));
  const shortfall = Math.max(0, terms.quantity - carrier.cargo.provisions);
  const shortfallCost = round(shortfall * standing, 2);
  let gate: ContractAssessment["gate"] = null;
  let reason: string | null = null;
  if (travelTicks > ticksLeft) {
    gate = "travel";
    reason = VOYAGE_REASON;
  } else if (shortfall > 0 && carrier.money < shortfallCost) {
    gate = "purse";
  } else if (score < threshold) {
    gate = "score";
  }
  return {
    accepted: gate === null,
    gate,
    reason,
    score,
    threshold,
    factors,
    travelTicks,
    ticksLeft,
    costBasis,
  };
}

/** The open contract for one buyer and one carrier. Open is `offered` or `accepted`. */
export function openSupplyContract(
  world: WorldState,
  buyerId: string,
  carrierId: string,
): SupplyContract | null {
  return Object.values(world.contracts ?? {})
    .filter((contract) =>
      contract.buyerId === buyerId &&
      contract.carrierId === carrierId &&
      (contract.status === "offered" || contract.status === "accepted")
    )
    .sort((left, right) => left.id.localeCompare(right.id))[0] ?? null;
}

/** Victory or defeat, on one side. A missing tie starts from the local defaults. */
export function contractRelationship(
  from: Character,
  toId: string,
  tick: number,
  victory: boolean,
): Relationship {
  const prior = from.relationships[toId] ?? {
    characterId: toId,
    ...RELATIONSHIP_BASE,
    lastChangedTick: tick,
  };
  const delta = victory ? VICTORY : DEFEAT;
  return {
    ...prior,
    trust: round(clamp(prior.trust + delta.trust, 0, 1)),
    respect: round(clamp(prior.respect + delta.respect, 0, 1)),
    fear: round(clamp(prior.fear + delta.fear, 0, 1)),
    grievance: round(clamp(prior.grievance + delta.grievance, 0, 1)),
    obligation: round(clamp(prior.obligation + delta.obligation, 0, 1)),
    lastChangedTick: tick,
  };
}
