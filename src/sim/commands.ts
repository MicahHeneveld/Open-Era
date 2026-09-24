import { applyEvent, clamp } from "./state.ts";
import type {
  OrderDirective,
  PlayerAction,
  PlayerCommand,
  SimEvent,
  WorldState,
} from "./types.ts";

export type CommandRequest =
  | {
      playerId: string;
      type: "character-action";
      action: PlayerAction;
      targetId?: string;
    }
  | {
      playerId: string;
      type: "issue-order";
      characterId: string;
      directive: OrderDirective;
      targetId?: string;
      priority?: number;
      expiresInTicks?: number | null;
    };

export type CommandSubmission =
  | { ok: true; command: PlayerCommand; event: SimEvent }
  | { ok: false; code: string; error: string };

const actions = new Set<PlayerAction>([
  "travel",
  "buy-provisions",
  "trade-local",
  "work",
  "recruit",
  "raid",
  "rest",
]);

const directives = new Set<OrderDirective>([
  "protect",
  "pressure",
  "trade-supplies",
  "explore",
]);

function reject(code: string, error: string): CommandSubmission {
  return { ok: false, code, error };
}

function acceptedEvent(world: WorldState, command: PlayerCommand): SimEvent {
  const player = world.players[command.playerId];
  const event: SimEvent = {
    sequence: world.nextEventSequence,
    tick: world.tick,
    type: "player-command-accepted",
    actorId: player.characterId,
    targetId: command.type === "issue-order" ? command.characterId : command.targetId,
    data: {
      command,
      nextCommandSequence: world.nextCommandSequence + 1,
    },
  };
  applyEvent(world, event);
  return event;
}

function validateCharacterAction(
  world: WorldState,
  request: Extract<CommandRequest, { type: "character-action" }>,
): CommandSubmission {
  const player = world.players[request.playerId];
  const character = world.characters[player.characterId];
  if (!actions.has(request.action)) return reject("unknown-action", "That character action is not supported");
  if (character.controller.kind !== "human" || character.controller.playerId !== player.id) {
    return reject("not-controller", "The player does not control this character");
  }
  if (world.pendingCommands.some((command) => command.type === "character-action" && command.playerId === player.id)) {
    return reject("action-already-queued", "Only one direct character action may be queued at a time");
  }
  if (character.travel) return reject("character-traveling", "The character is already traveling");
  if (!character.locationId) return reject("no-location", "The character must be at a settlement to perform this action");

  const settlement = world.settlements[character.locationId];
  if (request.action === "travel") {
    if (!request.targetId || !world.settlements[request.targetId]) {
      return reject("invalid-destination", "Travel requires a known settlement destination");
    }
    if (request.targetId === character.locationId) {
      return reject("already-there", "The character is already at that settlement");
    }
  }
  if (request.action === "raid") {
    if (!character.factionId || !settlement.factionId || character.factionId === settlement.factionId) {
      return reject("not-hostile", "The current settlement is not a valid hostile raid target");
    }
    if (character.troops.count < 25) return reject("insufficient-troops", "At least 25 troops are required to raid");
  }
  if (request.action === "recruit" && (character.money < 30 || settlement.stocks.arms < 2)) {
    return reject("cannot-recruit", "Recruitment requires money and locally available arms");
  }
  if (request.action === "buy-provisions" && (character.money < 2 || settlement.stocks.provisions < 1)) {
    return reject("cannot-buy", "Provisions are unavailable or unaffordable");
  }

  const command: PlayerCommand = {
    id: `command-${String(world.nextCommandSequence).padStart(5, "0")}`,
    playerId: player.id,
    issuedTick: world.tick,
    type: "character-action",
    action: request.action,
    targetId: request.action === "raid" ? character.locationId : request.targetId,
  };
  return { ok: true, command, event: acceptedEvent(world, command) };
}

function validateStandingOrder(
  world: WorldState,
  request: Extract<CommandRequest, { type: "issue-order" }>,
): CommandSubmission {
  const player = world.players[request.playerId];
  const issuer = world.characters[player.characterId];
  const recipient = world.characters[request.characterId];
  if (!recipient) return reject("unknown-character", "The order recipient is unknown");
  if (!player.knownCharacterIds.includes(recipient.id)) {
    return reject("identity-unknown", "The player has not learned this character's identity");
  }
  if (recipient.controller.kind !== "autonomous") {
    return reject("human-recipient", "Standing orders cannot override another human-controlled character");
  }
  if (!issuer.factionId || recipient.factionId !== issuer.factionId) {
    return reject("outside-authority", "The recipient is outside the commander's faction authority");
  }
  if (!directives.has(request.directive)) return reject("unknown-directive", "That standing-order directive is not supported");
  if (request.directive === "protect" && (!request.targetId || !world.settlements[request.targetId])) {
    return reject("invalid-target", "A protection order requires a settlement target");
  }
  if (request.directive === "pressure" && (!request.targetId || !world.factions[request.targetId])) {
    return reject("invalid-target", "A pressure order requires a faction target");
  }
  if (
    (request.directive === "trade-supplies" || request.directive === "explore") &&
    request.targetId &&
    !world.settlements[request.targetId]
  ) {
    return reject("invalid-target", "That order target is not a known settlement");
  }
  const priority = request.priority ?? 0.78;
  if (!Number.isFinite(priority) || priority < 0.1 || priority > 1) {
    return reject("invalid-priority", "Order priority must be between 0.1 and 1");
  }
  const duration = request.expiresInTicks ?? null;
  if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 720)) {
    return reject("invalid-duration", "Order duration must be between 1 and 720 ticks");
  }

  const command: PlayerCommand = {
    id: `command-${String(world.nextCommandSequence).padStart(5, "0")}`,
    playerId: player.id,
    issuedTick: world.tick,
    type: "issue-order",
    characterId: recipient.id,
    directive: request.directive,
    targetId: request.targetId,
    priority: clamp(priority, 0.1, 1),
    expiresTick: duration === null ? null : world.tick + duration,
  };
  return { ok: true, command, event: acceptedEvent(world, command) };
}

export function submitCommand(world: WorldState, request: CommandRequest): CommandSubmission {
  const player = world.players[request.playerId];
  if (!player) return reject("unknown-player", "The player session is unknown");
  return request.type === "character-action"
    ? validateCharacterAction(world, request)
    : validateStandingOrder(world, request);
}
