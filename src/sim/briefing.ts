import { applyEvent } from "./state.ts";
import type { SimEvent, WorldState } from "./types.ts";

export interface BriefingAcknowledgementRequest {
  playerId: string;
  itemId: string;
  routineThroughSequence?: number;
}

export interface ReportingOfficerRequest {
  playerId: string;
  characterId: string | null;
}

export type BriefingMutationResult =
  | { ok: true; event: SimEvent }
  | { ok: false; code: string; error: string };

function reject(code: string, error: string): BriefingMutationResult {
  return { ok: false, code, error };
}

function emit(world: WorldState, draft: Omit<SimEvent, "sequence" | "tick">): BriefingMutationResult {
  const event: SimEvent = {
    sequence: world.nextEventSequence,
    tick: world.tick,
    ...draft,
  };
  applyEvent(world, event);
  return { ok: true, event };
}

export function acknowledgeBriefingItem(
  world: WorldState,
  request: BriefingAcknowledgementRequest,
): BriefingMutationResult {
  const player = world.players[request.playerId];
  if (!player) return reject("unknown-player", "The player session is unknown");
  if (!request.itemId || request.itemId.length > 180 || /[\r\n]/.test(request.itemId)) {
    return reject("invalid-item", "The briefing item identifier is invalid");
  }
  if (request.itemId.startsWith("confirm:") || request.itemId.startsWith("surrender:")) {
    return reject("action-required", "Unresolved decisions cannot be acknowledged away");
  }
  if (request.routineThroughSequence !== undefined) {
    if (
      !request.itemId.startsWith("routine:") ||
      !Number.isInteger(request.routineThroughSequence) ||
      request.routineThroughSequence < 1 ||
      request.routineThroughSequence >= world.nextEventSequence
    ) {
      return reject("invalid-sequence", "The routine-report sequence is invalid");
    }
  }
  return emit(world, {
    type: "briefing-item-acknowledged",
    actorId: player.characterId,
    data: {
      playerId: player.id,
      itemId: request.itemId,
      routineThroughSequence: request.routineThroughSequence,
    },
  });
}

export function assignReportingOfficer(
  world: WorldState,
  request: ReportingOfficerRequest,
): BriefingMutationResult {
  const player = world.players[request.playerId];
  if (!player) return reject("unknown-player", "The player session is unknown");
  const commander = world.characters[player.characterId];
  if (request.characterId !== null) {
    const officer = world.characters[request.characterId];
    if (!officer) return reject("unknown-character", "The reporting officer is unknown");
    if (!player.knownCharacterIds.includes(officer.id)) {
      return reject("identity-unknown", "The player has not learned this character's identity");
    }
    if (officer.controller.kind !== "autonomous" || !commander.factionId || officer.factionId !== commander.factionId) {
      return reject("ineligible-officer", "A reporting officer must be an autonomous subordinate in the commander's faction");
    }
  }
  return emit(world, {
    type: "reporting-officer-assigned",
    actorId: player.characterId,
    targetId: request.characterId ?? undefined,
    data: { playerId: player.id, characterId: request.characterId },
  });
}
