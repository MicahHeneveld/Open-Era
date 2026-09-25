import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runTick, runTicks } from "../src/sim/engine.ts";
import { WorldStore } from "../src/sim/persistence.ts";
import { createPrototypeWorld } from "../src/sim/scenario.ts";
import { canonicalJson, stateHash } from "../src/sim/state.ts";

test("the same seed produces byte-for-byte deterministic events and state", () => {
  const first = runTicks(createPrototypeWorld(1847), 24);
  const second = runTicks(createPrototypeWorld(1847), 24);

  assert.equal(stateHash(first.state), stateHash(second.state));
  assert.equal(canonicalJson(first.events), canonicalJson(second.events));
});

test("different seeds create different histories", () => {
  const first = runTicks(createPrototypeWorld(1847), 12);
  const second = runTicks(createPrototypeWorld(9051), 12);

  assert.notEqual(stateHash(first.state), stateHash(second.state));
});

test("recovery from a snapshot plus event replay matches uninterrupted simulation", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-era-recovery-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    const baseline = runTicks(createPrototypeWorld(333), 19).state;
    const interrupted = createPrototypeWorld(333);
    const store = new WorldStore(databasePath);
    store.initialize(interrupted);
    for (let index = 0; index < 13; index += 1) {
      const result = runTick(interrupted);
      store.appendTick(result.events, interrupted);
    }
    const interruptedHash = stateHash(interrupted);
    store.close();

    const reopened = new WorldStore(databasePath);
    const recovered = reopened.recover();
    assert.ok(recovered.replayedEvents > 0, "expected recovery to replay post-snapshot events");
    assert.equal(recovered.state.tick, 13);
    assert.equal(stateHash(recovered.state), interruptedHash);

    for (let index = 0; index < 6; index += 1) {
      const result = runTick(recovered.state);
      reopened.appendTick(result.events, recovered.state);
    }
    assert.equal(stateHash(recovered.state), stateHash(baseline));
    reopened.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("the pressure-test scenario exercises its connected systems", () => {
  const result = runTicks(createPrototypeWorld(1847), 24);
  const types = new Set(result.events.map((event) => event.type));

  for (const expected of [
    "decision-made",
    "settlement-produced",
    "market-trade",
    "travel-started",
    "arrived",
    "worked",
    "recruited",
    "battle-resolved",
    "metrics-recorded",
  ]) {
    assert.ok(types.has(expected), `expected an event of type ${expected}`);
  }

  const sequences = result.events.map((event) => event.sequence);
  assert.deepEqual(sequences, Array.from({ length: sequences.length }, (_, index) => index + 1));
});
