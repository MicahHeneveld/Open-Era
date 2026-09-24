import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { submitCommand } from "../src/sim/commands.ts";
import { runTick } from "../src/sim/engine.ts";
import { WorldStore } from "../src/sim/persistence.ts";
import { createPrototypeWorld } from "../src/sim/scenario.ts";

test("the human-controlled character never receives autonomous decisions", () => {
  const world = createPrototypeWorld(1847);
  const result = runTick(world);
  const playerCharacterId = world.players["prototype-player"].characterId;

  assert.equal(world.characters[playerCharacterId].controller.kind, "human");
  assert.ok(!result.events.some((event) => event.type === "decision-made" && event.actorId === playerCharacterId));
  assert.equal(result.events.filter((event) => event.type === "plan-reconsidered").length, 29);
});

test("a validated direct action is queued, executed once, and removed", () => {
  const world = createPrototypeWorld(1847);
  const submission = submitCommand(world, {
    playerId: "prototype-player",
    type: "character-action",
    action: "travel",
    targetId: "verdant-cay",
  });
  assert.equal(submission.ok, true);
  assert.equal(world.pendingCommands.length, 1);

  const result = runTick(world);
  const commander = world.characters[world.players["prototype-player"].characterId];
  assert.equal(world.pendingCommands.length, 0);
  assert.equal(commander.travel?.toId, "verdant-cay");
  assert.equal(result.events.filter((event) => event.type === "player-action-executed").length, 1);
  assert.equal(result.events.filter((event) => event.type === "player-command-resolved").length, 1);
});

test("server validation rejects commands outside player authority without mutating state", () => {
  const world = createPrototypeWorld(1847);
  const beforeSequence = world.nextEventSequence;
  const submission = submitCommand(world, {
    playerId: "prototype-player",
    type: "issue-order",
    characterId: "character-14",
    directive: "protect",
    targetId: "crown-harbor",
  });

  assert.deepEqual(submission, {
    ok: false,
    code: "outside-authority",
    error: "The recipient is outside the commander's faction authority",
  });
  assert.equal(world.pendingCommands.length, 0);
  assert.equal(world.nextEventSequence, beforeSequence);
});

test("a delivered standing order immediately enters autonomous plan review", () => {
  const world = createPrototypeWorld(1847);
  const recipient = world.characters["character-04"];
  const submission = submitCommand(world, {
    playerId: "prototype-player",
    type: "issue-order",
    characterId: recipient.id,
    directive: "protect",
    targetId: "glassport",
    priority: 0.97,
    expiresInTicks: 72,
  });
  assert.equal(submission.ok, true);

  const result = runTick(world);
  const issued = result.events.find((event) => event.type === "standing-order-issued" && event.targetId === recipient.id);
  const review = result.events.find((event) => event.type === "plan-reconsidered" && event.actorId === recipient.id);
  assert.ok(issued);
  assert.equal((issued.data.order as { targetId: string }).targetId, "glassport");
  assert.equal((review?.data.orderAssessment as { orderId: string }).orderId, "command-00001:standing-order");
});

test("an accepted command survives restart and resolves after event replay", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-era-command-"));
  const path = join(directory, "world.sqlite");
  try {
    const world = createPrototypeWorld(808);
    const store = new WorldStore(path);
    store.initialize(world);
    const submission = submitCommand(world, {
      playerId: "prototype-player",
      type: "character-action",
      action: "work",
    });
    assert.equal(submission.ok, true);
    if (submission.ok) store.appendTick([submission.event], world);
    store.close();

    const reopened = new WorldStore(path);
    const recovered = reopened.recover().state;
    assert.equal(recovered.pendingCommands.length, 1);
    const result = runTick(recovered);
    reopened.appendTick(result.events, recovered);
    assert.equal(recovered.pendingCommands.length, 0);
    assert.ok(result.events.some((event) => event.type === "player-command-resolved"));
    reopened.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
