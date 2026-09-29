import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { dashboardState, fullEventFeed, projectEventFeed } from "../src/dashboard/view-model.ts";
import { captivityReleasedChronicle, captivityReleasedSentence } from "../src/dashboard/wording.ts";
import { runTick, runTicks } from "../src/sim/engine.ts";
import { WorldStore } from "../src/sim/persistence.ts";
import { createPrototypeWorld } from "../src/sim/scenario.ts";
import { applyEvent, captorPartyLeader, round, splitRansom, stateHash } from "../src/sim/state.ts";
import type { Character, SimEvent, WorldState } from "../src/sim/types.ts";

function dueForRelease(
  world: WorldState,
  characterId: string,
  captorFactionId: string | null,
  money: number,
  settlementId: string,
  ownerId?: string,
): Character {
  const character = world.characters[characterId];
  character.money = money;
  character.locationId = settlementId;
  character.travel = null;
  character.captivity = {
    captorFactionId,
    settlementId,
    capturedTick: world.tick - 84,
    mandatoryReleaseTick: world.tick,
    cause: "major-defeat",
    displayedRisk: "moderate",
    scatteredTroops: { count: 200, experience: 0.2, discipline: 0.5 },
    releaseDestinationId: null,
  };
  if (ownerId) world.settlements[settlementId].ownerId = ownerId;
  return character;
}

function releaseOf(events: SimEvent[], actorId: string): SimEvent {
  const release = events.find((event) => event.type === "captivity-released" && event.actorId === actorId);
  assert.ok(release, `expected a release for ${actorId}`);
  return release;
}

test("splitRansom gives the odd cent to the treasury and sums exactly", () => {
  assert.deepEqual(splitRansom(58.13, true), { treasuryShare: 29.07, leaderShare: 29.06 });
  assert.deepEqual(splitRansom(0.01, true), { treasuryShare: 0.01, leaderShare: 0 });
  assert.deepEqual(splitRansom(0.02, true), { treasuryShare: 0.01, leaderShare: 0.01 });
  assert.deepEqual(splitRansom(0, true), { treasuryShare: 0, leaderShare: 0 });
  assert.deepEqual(splitRansom(13.4, true), { treasuryShare: 6.7, leaderShare: 6.7 });
  assert.deepEqual(splitRansom(40.01, false), { treasuryShare: 0, leaderShare: 40.01 });
  for (const paid of [0, 0.01, 0.02, 13.4, 58.13, 62.69, 106.84]) {
    const split = splitRansom(paid, true);
    assert.equal(round(split.treasuryShare + split.leaderShare, 2), paid);
    const whole = splitRansom(paid, false);
    assert.equal(whole.treasuryShare, 0);
    assert.equal(whole.leaderShare, paid);
  }
});

test("a faction ransom splits in cents and the odd cent goes to the treasury", () => {
  const world = createPrototypeWorld(1847);
  const prisoner = dueForRelease(world, "character-04", "world-government", 58.13, "crown-harbor");
  const leader = captorPartyLeader(world, prisoner);
  assert.equal(leader?.id, "character-01");
  const treasuryBefore = world.factions["world-government"].treasury;
  const leaderBefore = leader!.money;
  const snapshot = structuredClone(world);
  const release = releaseOf(runTick(world).events, "character-04");
  const terms = release.data.terms as { moneyPaid: number; debtValue: number };
  const ransom = release.data.ransom as {
    treasuryShare: number;
    leaderShare: number;
    factionTreasury: number;
    leaderMoney: number;
    leaderId: string;
  };
  assert.equal(release.type, "captivity-released");
  assert.equal(terms.moneyPaid, 58.13);
  assert.equal(terms.debtValue, 315.38);
  assert.equal(ransom.treasuryShare, 29.07);
  assert.equal(ransom.leaderShare, 29.06);
  assert.equal(round(ransom.treasuryShare + ransom.leaderShare, 2), 58.13);
  assert.equal(ransom.factionTreasury, round(treasuryBefore + 29.07, 2));
  assert.equal(ransom.leaderMoney, round(leaderBefore + 29.06, 2));
  assert.equal(ransom.factionTreasury, 18029.07);
  assert.equal(ransom.leaderMoney, 137.06);
  applyEvent(snapshot, release);
  assert.equal(snapshot.factions["world-government"].treasury, 18029.07);
  assert.equal(snapshot.characters["character-01"].money, 137.06);
  assert.equal(snapshot.characters["character-04"].money, 0);
  assert.equal(
    captivityReleasedSentence(world, release),
    "Sable Morrow was released from Crown Harbor. 58.13 was paid and 315.38 was recorded as debt. Loyalty fell. Sable Morrow paid 58.13 ransom: 29.07 to the World Government treasury and 29.06 to Mara Vane. The ransom line covers only the ransom.",
  );
});

test("a ransom of one cent pays the treasury and nothing to the leader", () => {
  const world = createPrototypeWorld(1847);
  dueForRelease(world, "character-04", "world-government", 0.01, "crown-harbor");
  const snapshot = structuredClone(world);
  const release = releaseOf(runTick(world).events, "character-04");
  const ransom = release.data.ransom as { treasuryShare: number; leaderShare: number; factionTreasury: number; leaderMoney: number };
  assert.equal((release.data.terms as { moneyPaid: number }).moneyPaid, 0.01);
  assert.equal(ransom.treasuryShare, 0.01);
  assert.equal(ransom.leaderShare, 0);
  assert.equal(round(ransom.treasuryShare + ransom.leaderShare, 2), 0.01);
  applyEvent(snapshot, release);
  assert.equal(snapshot.factions["world-government"].treasury, 18000.01);
  assert.equal(snapshot.characters["character-01"].money, 108);
  assert.equal(
    captivityReleasedSentence(world, release),
    "Sable Morrow was released from Crown Harbor. 0.01 was paid and 373.5 was recorded as debt. Loyalty fell. Sable Morrow paid 0.01 ransom: 0.01 to the World Government treasury and 0 to Mara Vane. The ransom line covers only the ransom.",
  );
});

test("a ransom of zero pays nothing and leaves both balances", () => {
  const world = createPrototypeWorld(1847);
  dueForRelease(world, "character-04", "world-government", 0, "crown-harbor");
  const snapshot = structuredClone(world);
  const release = releaseOf(runTick(world).events, "character-04");
  const ransom = release.data.ransom as { treasuryShare: number; leaderShare: number };
  assert.equal((release.data.terms as { moneyPaid: number; debtValue: number }).moneyPaid, 0);
  assert.equal((release.data.terms as { debtValue: number }).debtValue, 373.51);
  assert.equal(ransom.treasuryShare, 0);
  assert.equal(ransom.leaderShare, 0);
  applyEvent(snapshot, release);
  assert.equal(snapshot.factions["world-government"].treasury, 18000);
  assert.equal(snapshot.characters["character-01"].money, 108);
  assert.equal(snapshot.characters["character-04"].money, 0);
  assert.equal(
    captivityReleasedSentence(world, release),
    "Sable Morrow was released from Crown Harbor. 0 was paid and 373.51 was recorded as debt. Loyalty fell. Sable Morrow paid 0 ransom: 0 to the World Government treasury and 0 to Mara Vane. The ransom line covers only the ransom.",
  );
});

test("a captor with no faction pays the whole ransom to the party leader", () => {
  const seeded = runTicks(createPrototypeWorld(1847), 1200);
  const nullCaptor = seeded.events.find((event) =>
    event.type === "captivity-released" &&
    (event.data.ransom as { treasuryFactionId: string | null }).treasuryFactionId === null
  );
  assert.equal(nullCaptor, undefined);

  const world = createPrototypeWorld(1847);
  const prisoner = dueForRelease(world, "character-04", null, 40.01, "verdant-cay", "character-23");
  const leader = captorPartyLeader(world, prisoner);
  assert.equal(leader?.name, "Niko Crow");
  assert.equal(leader?.factionId, null);
  const treasuryBefore = {
    "world-government": world.factions["world-government"].treasury,
    "free-tide": world.factions["free-tide"].treasury,
  };
  const leaderBefore = leader!.money;
  const snapshot = structuredClone(world);
  const release = releaseOf(runTick(world).events, "character-04");
  const terms = release.data.terms as { moneyPaid: number; debtValue: number };
  const ransom = release.data.ransom as {
    treasuryShare: number;
    leaderShare: number;
    treasuryFactionId: string | null;
    leaderId: string;
    leaderMoney: number;
  };
  assert.equal(terms.moneyPaid, 40.01);
  assert.equal(terms.debtValue, 333.5);
  assert.equal(ransom.treasuryFactionId, null);
  assert.equal(ransom.treasuryShare, 0);
  assert.equal(ransom.leaderShare, 40.01);
  assert.equal(ransom.leaderId, "character-23");
  assert.equal(ransom.leaderMoney, round(leaderBefore + 40.01, 2));
  applyEvent(snapshot, release);
  assert.equal(snapshot.characters["character-23"].money, ransom.leaderMoney);
  assert.equal(snapshot.characters["character-04"].money, 0);
  assert.equal(snapshot.factions["world-government"].treasury, treasuryBefore["world-government"]);
  assert.equal(snapshot.factions["free-tide"].treasury, treasuryBefore["free-tide"]);
  assert.equal(
    captivityReleasedSentence(world, release),
    "Sable Morrow was released from Verdant Cay. 40.01 was paid and 333.5 was recorded as debt. Loyalty fell. Sable Morrow paid 40.01 ransom: 40.01 to Niko Crow. The ransom line covers only the ransom.",
  );
});

test("the prisoner is not the party leader of their own ransom", () => {
  const world = createPrototypeWorld(1847);
  const mara = dueForRelease(world, "character-01", "world-government", 10, "crown-harbor");
  const leader = captorPartyLeader(world, mara);
  assert.equal(leader?.id, "character-05");
  assert.equal(leader?.name, "Jun Marrow");
  const release = releaseOf(runTick(world).events, "character-01");
  const ransom = release.data.ransom as { leaderId: string; treasuryShare: number; leaderShare: number };
  assert.equal(ransom.leaderId, "character-05");
  assert.notEqual(ransom.leaderId, "character-01");
  assert.equal(round(ransom.treasuryShare + ransom.leaderShare, 2), 10);
  assert.equal(
    captivityReleasedSentence(world, release).includes("to Jun Marrow"),
    true,
  );
});

test("Sable Morrow's release is visible to the prisoner and the captor", () => {
  const world = createPrototypeWorld(1847);
  const events: SimEvent[] = [];
  let tideBefore = 0;
  let paxBefore = 0;
  for (let index = 0; index < 119; index += 1) {
    if (world.tick === 118) {
      tideBefore = world.factions["free-tide"].treasury;
      paxBefore = world.characters["character-14"].money;
    }
    events.push(...runTick(world).events);
  }
  const release = events.find((event) => event.sequence === 13680);
  assert.ok(release);
  assert.equal(release.type, "captivity-released");
  assert.equal(release.tick, 118);
  const ransom = release.data.ransom as {
    treasuryShare: number;
    leaderShare: number;
    factionTreasury: number;
    leaderMoney: number;
  };
  assert.equal(ransom.treasuryShare, 6.7);
  assert.equal(ransom.leaderShare, 6.7);
  assert.equal(round(ransom.treasuryShare + ransom.leaderShare, 2), 13.4);
  assert.equal(ransom.factionTreasury, round(tideBefore + 6.7, 2));
  assert.equal(ransom.leaderMoney, round(paxBefore + 6.7, 2));
  const line = "Sable Morrow was released from Cinder Key. 13.4 was paid and 103.21 was recorded as debt. Loyalty fell. Sable Morrow paid 13.4 ransom: 6.7 to the Free Tide Compact treasury and 6.7 to Pax Ash. The ransom line covers only the ransom.";
  const chronicle = "**Sable Morrow** was released from **Cinder Key** under mandatory terms. 13.4 was paid and 103.21 was recorded as debt. Loyalty fell. **Sable Morrow** paid 13.4 ransom: 6.7 to the **Free Tide Compact** treasury and 6.7 to **Pax Ash**. The ransom line covers only the ransom.";
  assert.equal(captivityReleasedSentence(world, release), line);
  assert.equal(captivityReleasedChronicle(world, release), chronicle);
  for (const readerId of ["character-04", "character-14", "character-01"]) {
    const [row] = projectEventFeed(world, readerId, [release]);
    assert.equal(row?.summary, line, readerId);
  }
  const [prisoner] = projectEventFeed(world, "character-04", [release]);
  const [captor] = projectEventFeed(world, "character-14", [release]);
  assert.equal(prisoner?.payloadWithheld, false);
  assert.equal((prisoner?.data as { ransom: { leaderShare: number } }).ransom.leaderShare, 6.7);
  assert.equal(captor?.payloadWithheld, true);
  assert.equal(captor?.data, null);
});

test("Dax Pike at state tick 276 is not released, and his tick 901 ransom is exact", () => {
  const early = runTicks(createPrototypeWorld(1847), 276);
  assert.equal(early.state.tick, 276);
  const daxEarly = early.state.characters["character-20"];
  assert.equal(daxEarly.name, "Dax Pike");
  assert.equal(daxEarly.captivity, null);
  assert.equal(daxEarly.locationId, "glassport");
  const earlyRelease = early.events.find((event) =>
    event.type === "captivity-released" &&
    (event.actorId === "character-20" || (event.data.ransom as { leaderId?: string }).leaderId === "character-20")
  );
  assert.equal(earlyRelease, undefined);
  const view = dashboardState(early.state, early.events, fullEventFeed(early.events)) as {
    tick: number;
    day: number;
    party: { hold: { money: number }; locationId: string };
    factions: Array<{ id: string; treasury: number | null }>;
    characters: Array<{ id: string; name: string; locationId: string | null; money: number | null; captivity: unknown }>;
    events: Array<{ sequence: number; type: string; summary: string; payloadWithheld: boolean }>;
    briefing: { items: Array<{ id: string; title: string; summary: string }> };
  };
  assert.equal(view.tick, 276);
  assert.equal(view.day, 46);
  const card = view.characters.find((character) => character.id === "character-20");
  assert.equal(card?.money, null);
  assert.equal(card?.locationId, "glassport");
  assert.equal(card?.captivity, null);
  assert.equal(view.party.hold.money, 108);
  assert.equal(view.party.locationId, "crown-harbor");
  assert.equal(view.factions.find((faction) => faction.id === "world-government")?.treasury, 27132.81);
  assert.equal(view.factions.find((faction) => faction.id === "free-tide")?.treasury, null);
  const sableLine = "Sable Morrow was released from Cinder Key. 13.4 was paid and 103.21 was recorded as debt. Loyalty fell. Sable Morrow paid 13.4 ransom: 6.7 to the Free Tide Compact treasury and 6.7 to Pax Ash. The ransom line covers only the ransom.";
  const feedRelease = view.events.filter((event) => event.type === "captivity-released");
  assert.deepEqual(feedRelease.map((event) => event.sequence), [13680]);
  assert.equal(feedRelease[0]?.summary, sableLine);
  assert.equal(feedRelease[0]?.payloadWithheld, true);
  assert.equal(view.briefing.items.find((item) => item.id === "event:13680")?.title, "A captain was released");
  assert.equal(view.briefing.items.find((item) => item.id === "event:13680")?.summary, sableLine);

  const world = createPrototypeWorld(1847);
  for (let index = 0; index < 901; index += 1) runTick(world);
  assert.equal(world.tick, 901);
  const maraBefore = world.characters["character-01"].money;
  const treasuryBefore = world.factions["world-government"].treasury;
  const daxBefore = world.characters["character-20"].money;
  assert.equal(daxBefore, 62.69);
  assert.equal(maraBefore, 473.02);
  assert.equal(treasuryBefore, 39969.99);
  assert.equal(world.characters["character-20"].captivity?.settlementId, "glassport");
  const tick = runTick(world);
  const release = releaseOf(tick.events, "character-20");
  assert.equal(world.tick, 902);
  assert.equal(release.tick, 901);
  assert.equal(release.sequence, 118405);
  assert.equal(release.type, "captivity-released");
  const terms = release.data.terms as { moneyPaid: number; debtValue: number };
  const ransom = release.data.ransom as {
    treasuryShare: number;
    leaderShare: number;
    leaderId: string;
    factionTreasury: number;
    leaderMoney: number;
  };
  assert.equal(terms.moneyPaid, 62.69);
  assert.equal(terms.debtValue, 380.67);
  assert.equal(ransom.treasuryShare, 31.35);
  assert.equal(ransom.leaderShare, 31.34);
  assert.equal(round(ransom.treasuryShare + ransom.leaderShare, 2), 62.69);
  assert.equal(ransom.leaderId, "character-01");
  assert.equal(ransom.factionTreasury, 40001.34);
  assert.equal(ransom.leaderMoney, 504.36);
  assert.equal(round(treasuryBefore + ransom.treasuryShare, 2), 40001.34);
  assert.equal(round(maraBefore + ransom.leaderShare, 2), 504.36);
  assert.equal(world.characters["character-01"].money, 504.36);
  assert.equal(world.characters["character-20"].money, 0);
  assert.equal(world.characters["character-20"].debts[0]?.remainingValue, 380.67);
  const line = "Dax Pike was released from Glassport. 62.69 was paid and 380.67 was recorded as debt. Loyalty fell. Dax Pike paid 62.69 ransom: 31.35 to the World Government treasury and 31.34 to Mara Vane. The ransom line covers only the ransom.";
  assert.equal(captivityReleasedSentence(world, release), line);
  assert.equal(
    captivityReleasedChronicle(world, release),
    "**Dax Pike** was released from **Glassport** under mandatory terms. 62.69 was paid and 380.67 was recorded as debt. Loyalty fell. **Dax Pike** paid 62.69 ransom: 31.35 to the **World Government** treasury and 31.34 to **Mara Vane**. The ransom line covers only the ransom.",
  );
  const [maraRow] = projectEventFeed(world, "character-01", [release]);
  const [daxRow] = projectEventFeed(world, "character-20", [release]);
  assert.equal(maraRow?.summary, line);
  assert.equal(maraRow?.payloadWithheld, true);
  assert.equal(daxRow?.summary, line);
  assert.equal(daxRow?.payloadWithheld, false);
});

test("a ransom release recovers from the snapshot before it", () => {
  const live = runTicks(createPrototypeWorld(1847), 119);
  const release = live.events.find((event) => event.sequence === 13680);
  assert.ok(release);
  const directory = mkdtempSync(join(tmpdir(), "open-era-ransom-recovery-"));
  const databasePath = join(directory, "world.sqlite");
  const store = new WorldStore(databasePath);
  try {
    const world = createPrototypeWorld(1847);
    store.initialize(world);
    let splitSequence: number | null = null;
    let splitJson: string | null = null;
    let splitHash: string | null = null;
    for (let index = 0; index < 119; index += 1) {
      const result = runTick(world);
      store.appendTick(result.events, world);
      if (world.tick === 118 && splitSequence === null) {
        splitSequence = result.events.at(-1)!.sequence;
        splitJson = JSON.stringify(world);
        splitHash = stateHash(world);
      }
    }
    assert.ok(splitSequence !== null && splitJson !== null && splitHash !== null);
    store.database.prepare(
      "INSERT OR REPLACE INTO snapshots(sequence, tick, state_json, state_hash) VALUES (?, ?, ?, ?)",
    ).run(splitSequence, 118, splitJson, splitHash);
    store.database.prepare("DELETE FROM snapshots WHERE tick > ?").run(118);
    const recovered = store.recover();
    assert.ok(recovered.replayedEvents > 0);
    assert.equal(recovered.state.tick, 119);
    assert.equal(stateHash(recovered.state), stateHash(live.state));
    assert.equal(recovered.state.factions["free-tide"].treasury, live.state.factions["free-tide"].treasury);
    assert.equal(recovered.state.characters["character-14"].money, live.state.characters["character-14"].money);
    assert.equal(recovered.state.characters["character-04"].money, live.state.characters["character-04"].money);
    assert.equal(recovered.state.characters["character-04"].debts.length, live.state.characters["character-04"].debts.length);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
