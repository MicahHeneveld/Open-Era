import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { dashboardState, fullEventFeed } from "../src/dashboard/view-model.ts";
import { combatForecast, selectRetreatDestination } from "../src/sim/combat.ts";
import { submitCommand } from "../src/sim/commands.ts";
import { runTick } from "../src/sim/engine.ts";
import { WorldStore } from "../src/sim/persistence.ts";
import { createPrototypeWorld } from "../src/sim/scenario.ts";
import { stateHash, surrenderStabilityLimit } from "../src/sim/state.ts";

function prepareMajorBattle(seed = 1847) {
  const world = createPrototypeWorld(seed);
  const commander = world.characters[world.players["prototype-player"].characterId];
  const settlement = world.settlements["cinder-key"];
  commander.locationId = settlement.id;
  commander.travel = null;
  commander.troops.count = 90;
  settlement.garrison = 120;
  settlement.stability = 72;
  settlement.surrender = null;
  return { world, commander, settlement };
}

test("strategy narrows the combat forecast and reveals more factors", () => {
  const { world, commander, settlement } = prepareMajorBattle();
  commander.skills.strategy = 20;
  const basic = combatForecast(world, commander.id, settlement.id);
  commander.skills.strategy = 90;
  const command = combatForecast(world, commander.id, settlement.id);

  assert.equal(basic.majorBattle, true);
  assert.equal(command.phases, 3);
  assert.ok((basic.winChance.high - basic.winChance.low) > (command.winChance.high - command.winChance.low));
  assert.ok((basic.defenderPower.high - basic.defenderPower.low) > (command.defenderPower.high - command.defenderPower.low));
  assert.equal(basic.detailLevel, "basic");
  assert.equal(command.detailLevel, "command");
  assert.ok(command.revealedFactors.some((factor) => factor.includes("defensive ground estimated")));
});

test("retreat routing prefers the nearest settlement controlled by the attacker's faction", () => {
  const world = createPrototypeWorld(1847, { playerCharacterId: "character-14" });
  assert.equal(selectRetreatDestination(world, "character-14", "crown-harbor"), "cinder-key");
  assert.equal(selectRetreatDestination(world, "character-01", "cinder-key"), "glassport");
});

test("with no friendly port, retreat goes to Verdant Cay", () => {
  const freeTide = createPrototypeWorld(1847);
  assert.equal(selectRetreatDestination(freeTide, "character-19", "glassport"), "cinder-key");
  freeTide.settlements["cinder-key"].factionId = "world-government";
  assert.equal(selectRetreatDestination(freeTide, "character-19", "glassport"), "verdant-cay");

  const worldGovernment = createPrototypeWorld(1847);
  worldGovernment.settlements["crown-harbor"].factionId = "free-tide";
  worldGovernment.settlements["glassport"].factionId = "free-tide";
  assert.equal(selectRetreatDestination(worldGovernment, "character-01", "glassport"), "verdant-cay");
});

test("a major player attack resolves one phase and refreshes local intelligence", () => {
  const { world, commander, settlement } = prepareMajorBattle();
  const submission = submitCommand(world, {
    playerId: "prototype-player",
    type: "character-action",
    action: "raid",
  });
  assert.equal(submission.ok, true);

  const result = runTick(world);
  const battle = Object.values(world.activeBattles)[0];
  assert.ok(result.events.some((event) => event.type === "battle-started"));
  assert.ok(result.events.some((event) => event.type === "battle-phase-resolved"));
  assert.ok(battle);
  assert.equal(battle.phase, 1);
  assert.equal(battle.totalPhases, 3);
  assert.equal(commander.knowledge[settlement.id].observedTick, 0);
  assert.equal(commander.knowledge[settlement.id].garrisonEstimate, settlement.garrison);
  assert.ok(!result.events.some((event) => event.type === "battle-resolved"));
  const view = dashboardState(world, result.events, fullEventFeed(result.events)) as {
    settlements: Array<{ id: string; battleInProgress: boolean; combatForecast: unknown }>;
  };
  const target = view.settlements.find((candidate) => candidate.id === settlement.id);
  assert.equal(target?.battleInProgress, true);
  assert.equal(target?.combatForecast, null);
});

test("retreat is the only player command during a battle and ends it with lighter consequences", () => {
  const { world, commander } = prepareMajorBattle();
  assert.equal(submitCommand(world, {
    playerId: "prototype-player",
    type: "character-action",
    action: "raid",
  }).ok, true);
  runTick(world);
  const battle = Object.values(world.activeBattles)[0];
  assert.ok(battle);

  assert.deepEqual(submitCommand(world, {
    playerId: "prototype-player",
    type: "character-action",
    action: "rest",
  }), {
    ok: false,
    code: "battle-in-progress",
    error: "Only a retreat decision is available while the character is in battle",
  });

  const healthBeforeRetreat = commander.health;
  const defeatsBeforeRetreat = commander.defeats;
  assert.equal(submitCommand(world, {
    playerId: "prototype-player",
    type: "retreat-battle",
    battleId: battle.id,
  }).ok, true);
  const result = runTick(world);
  const retreat = result.events.find((event) => event.type === "battle-retreated");
  assert.ok(retreat);
  assert.equal(retreat.data.retreatRisk, battle.lastPhase?.retreatRisk);
  assert.equal(retreat.data.captureRisk, battle.lastPhase?.captureRisk);
  assert.equal(retreat.data.retreatDestinationId, "glassport");
  const recordedWithdrawal = retreat.data.retreatTravel as { totalTicks: number; remainingTicks: number };
  assert.equal(recordedWithdrawal.remainingTicks, recordedWithdrawal.totalTicks);
  assert.equal(Object.keys(world.activeBattles).length, 0);
  assert.equal(commander.defeats, defeatsBeforeRetreat);
  assert.ok(commander.health <= healthBeforeRetreat);
  assert.ok(Number(retreat.data.pursuitLosses) < battle.attackerInitialTroops * 0.2);
  assert.equal(commander.locationId, null);
  assert.equal(commander.travel?.fromId, "cinder-key");
  assert.equal(commander.travel?.toId, "glassport");
  assert.equal(commander.travel?.remainingTicks, recordedWithdrawal.totalTicks - 1);
  assert.deepEqual(submitCommand(world, {
    playerId: "prototype-player",
    type: "character-action",
    action: "rest",
  }), {
    ok: false,
    code: "character-traveling",
    error: "The character is already traveling",
  });

  while (commander.travel) runTick(world);
  assert.equal(commander.locationId, "glassport");
  assert.equal(commander.knowledge["glassport"].source, "direct");
});

test("a continued major battle resolves by its third phase", () => {
  const { world, commander } = prepareMajorBattle(2718);
  assert.equal(submitCommand(world, {
    playerId: "prototype-player",
    type: "character-action",
    action: "raid",
  }).ok, true);

  const events = [...runTick(world).events];
  events.push(...runTick(world).events);
  events.push(...runTick(world).events);
  assert.equal(Object.keys(world.activeBattles).length, 0);
  const resolved = events.find((event) => event.type === "battle-resolved");
  assert.ok(resolved);
  assert.equal(resolved.data.phases, 3);
  assert.equal(events.filter((event) =>
    event.type === "battle-phase-resolved" && event.actorId === commander.id
  ).length, 3);
});

test("an active battle survives snapshot and event recovery", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-era-combat-recovery-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    const { world } = prepareMajorBattle(4096);
    const store = new WorldStore(databasePath);
    store.initialize(world);
    const submission = submitCommand(world, {
      playerId: "prototype-player",
      type: "character-action",
      action: "raid",
    });
    assert.equal(submission.ok, true);
    if (submission.ok) store.appendTick([submission.event], world);
    const result = runTick(world);
    store.appendTick(result.events, world);
    const expectedHash = stateHash(world);
    store.close();

    const reopened = new WorldStore(databasePath);
    const recovered = reopened.recover().state;
    assert.equal(stateHash(recovered), expectedHash);
    assert.equal(Object.values(recovered.activeBattles)[0]?.phase, 1);
    reopened.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

/**
 * Other characters at the port can raid on the same tick. The cases below
 * assert one battle's garrison and stability, so everyone else is put on the
 * raid cooldown first.
 */
function holdOtherRaiders(world: ReturnType<typeof createPrototypeWorld>, attackerId: string): void {
  for (const character of Object.values(world.characters)) {
    if (character.id !== attackerId) character.lastBattleTick = world.tick;
  }
}

function prepareImmediateSurrender(garrison: number, stability: number) {
  const world = createPrototypeWorld(1847);
  const commander = world.characters[world.players["prototype-player"].characterId];
  const settlement = world.settlements["cinder-key"];
  holdOtherRaiders(world, commander.id);
  commander.locationId = settlement.id;
  commander.travel = null;
  commander.skills.strategy = 125;
  commander.troops.count = 40;
  commander.health = 100;
  commander.morale = 100;
  // Walls and population are flattened so the loss rate is the attacker's
  // power against the garrison alone, and the post-battle figures are exact.
  settlement.population = 0;
  settlement.fortification = 1;
  settlement.garrison = garrison;
  settlement.stability = stability;
  settlement.surrender = null;
  return { world, commander, settlement };
}

function immediateVictory(garrison: number, stability: number) {
  const prepared = prepareImmediateSurrender(garrison, stability);
  assert.equal(submitCommand(prepared.world, {
    playerId: "prototype-player",
    type: "character-action",
    action: "raid",
  }).ok, true);
  const result = runTick(prepared.world);
  const battle = result.events.find((event) =>
    event.type === "battle-resolved" && event.actorId === prepared.commander.id
  );
  assert.ok(battle);
  assert.equal(battle.data.phases, 1);
  assert.equal(battle.data.outcome, "attacker-victory");
  return { ...prepared, battle };
}

test("an immediate victory at garrison 14 and stability 39.55 offers surrender", () => {
  const { commander, settlement, battle } = immediateVictory(39, 51.52);
  assert.equal(battle.data.defenderGarrison, 14);
  assert.equal(battle.data.settlementStability, 39.55);
  assert.deepEqual(settlement.surrender, {
    offeredToId: commander.id,
    offeredTick: 0,
    previousFactionId: "free-tide",
  });
});

test("an immediate victory at garrison 14 and stability 50 does not offer surrender", () => {
  const { settlement, battle } = immediateVictory(39, 61.97);
  assert.equal(battle.data.defenderGarrison, 14);
  assert.equal(battle.data.settlementStability, 50);
  assert.equal(settlement.surrender, null);
  assert.equal(battle.data.surrender, null);
});

test("an immediate victory at garrison 16 and stability 20 does not offer surrender", () => {
  const { settlement, battle } = immediateVictory(44, 31.97);
  assert.equal(battle.data.defenderGarrison, 16);
  assert.equal(battle.data.settlementStability, 20);
  assert.equal(settlement.surrender, null);
  assert.equal(battle.data.surrender, null);
});

function majorVictoryAt(garrison: number, stability: number) {
  const world = createPrototypeWorld(1847);
  const commander = world.characters[world.players["prototype-player"].characterId];
  const settlement = world.settlements["cinder-key"];
  holdOtherRaiders(world, commander.id);
  commander.locationId = settlement.id;
  commander.travel = null;
  commander.skills.strategy = 125;
  commander.troops.count = 80;
  commander.health = 100;
  commander.morale = 100;
  settlement.population = 0;
  settlement.fortification = 1;
  settlement.garrison = 40;
  settlement.stability = 80;
  settlement.surrender = null;
  assert.equal(submitCommand(world, {
    playerId: "prototype-player",
    type: "character-action",
    action: "raid",
  }).ok, true);
  runTick(world);
  runTick(world);
  assert.equal(Object.keys(world.activeBattles).length, 1);
  settlement.garrison = garrison;
  settlement.stability = stability;
  settlement.population = 0;
  settlement.fortification = 1;
  const result = runTick(world);
  const battle = result.events.find((event) =>
    event.type === "battle-resolved" && event.actorId === commander.id
  );
  assert.ok(battle);
  assert.equal(battle.data.phases, 3);
  assert.equal(battle.data.outcome, "attacker-victory");
  return { commander, settlement, battle };
}

test("a completed major battle uses the same surrender limit", () => {
  const offered = majorVictoryAt(21, 43.55);
  assert.equal(offered.battle.data.defenderGarrison, 14);
  assert.equal(offered.battle.data.settlementStability, 39.55);
  assert.deepEqual(offered.settlement.surrender, {
    offeredToId: offered.commander.id,
    offeredTick: 2,
    previousFactionId: "free-tide",
  });

  const stable = majorVictoryAt(21, 54);
  assert.equal(stable.battle.data.defenderGarrison, 14);
  assert.equal(stable.battle.data.settlementStability, 50);
  assert.equal(stable.settlement.surrender, null);

  const garrisoned = majorVictoryAt(24, 24);
  assert.equal(garrisoned.battle.data.defenderGarrison, 16);
  assert.equal(garrisoned.battle.data.settlementStability, 20);
  assert.equal(garrisoned.settlement.surrender, null);
});

test("the ration floor does not read the surrender limit", () => {
  const low = createPrototypeWorld(1847);
  const high = createPrototypeWorld(1847);
  const lowHarbor = low.settlements["crown-harbor"];
  const highHarbor = high.settlements["crown-harbor"];
  lowHarbor.garrison = 6;
  highHarbor.garrison = 15;
  lowHarbor.stability = 0;
  highHarbor.stability = 0;
  lowHarbor.stocks.provisions = 0;
  highHarbor.stocks.provisions = 0;
  assert.equal(surrenderStabilityLimit(lowHarbor.garrison), 80);
  assert.equal(surrenderStabilityLimit(highHarbor.garrison), 30);
  assert.notEqual(
    surrenderStabilityLimit(lowHarbor.garrison),
    surrenderStabilityLimit(highHarbor.garrison),
  );

  const lowTick = runTick(low);
  const highTick = runTick(high);
  const provisionsOf = (events: typeof lowTick.events, settlementId: string) => {
    const produced = events.find((event) =>
      event.type === "settlement-produced" && event.settlementId === settlementId
    );
    return (produced?.data.stocks as { provisions: number } | undefined)?.provisions;
  };
  assert.equal(provisionsOf(lowTick.events, lowHarbor.id), 5);
  assert.equal(provisionsOf(highTick.events, highHarbor.id), 5);
  assert.equal(lowHarbor.surrender, null);
  assert.equal(highHarbor.surrender, null);
});
