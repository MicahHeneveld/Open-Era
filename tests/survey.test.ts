import assert from "node:assert/strict";
import test from "node:test";
import { eventPayloadVisible } from "../src/dashboard/visibility.ts";
import { dashboardState, fullEventFeed } from "../src/dashboard/view-model.ts";
import { directObservation } from "../src/sim/agency.ts";
import { combatForecast } from "../src/sim/combat.ts";
import { ACTION_CAPABILITIES, COMMAND_LIMITS, submitCommand } from "../src/sim/commands.ts";
import { runTick } from "../src/sim/engine.ts";
import { createPrototypeWorld } from "../src/sim/scenario.ts";
import type { Character, Settlement, SettlementKnowledge, StandingOrder, WorldState } from "../src/sim/types.ts";

function commanderOf(world: WorldState): Character {
  return world.characters[world.players["prototype-player"].characterId];
}

function foreignPort(world: WorldState, commander: Character): Settlement {
  return Object.values(world.settlements).find((settlement) =>
    settlement.factionId !== null && settlement.factionId !== commander.factionId
  )!;
}

function place(character: Character, settlementId: string): void {
  character.locationId = settlementId;
  character.travel = null;
  character.captivity = null;
}

function surveyAt(world: WorldState, settlementId: string): number {
  const commander = commanderOf(world);
  place(commander, settlementId);
  const submitted = submitCommand(world, {
    playerId: "prototype-player",
    type: "character-action",
    action: "survey",
  });
  assert.equal(submitted.ok, true);
  const tick = world.tick;
  const events = runTick(world).events;
  const updated = events.find((event) =>
    event.type === "knowledge-updated" &&
    event.actorId === commander.id &&
    event.data.reason === "survey"
  );
  assert.ok(updated, "a survey must emit knowledge-updated");
  assert.equal(updated.tick, tick);
  return tick;
}

interface PanelSettlement {
  id: string;
  population: number | null;
  fortification: number | null;
  garrison: number | null;
  stocks: Record<string, number> | null;
  prices: Record<string, number> | null;
  factionId: string | null;
  combatForecast: { revealedFactors: string[]; defenderPower: { low: number; high: number } } | null;
  groundIntelligence: { source: string; observedTick: number; ageTicks: number } | null;
  intelligence: { exact: boolean; present: boolean; source: string } | null;
}

function panel(world: WorldState, settlementId: string): PanelSettlement {
  const state = dashboardState(world, [], fullEventFeed([])) as { settlements: PanelSettlement[] };
  return state.settlements.find((entry) => entry.id === settlementId)!;
}

test("survey is a direct action against the settlement the commander is standing in", () => {
  const capability = ACTION_CAPABILITIES.find((entry) => entry.action === "survey");
  assert.ok(capability, "survey must be a published player action");
  assert.equal(capability.target, "current-settlement");
  assert.equal(COMMAND_LIMITS.directActionsQueued, 1);

  const world = createPrototypeWorld(1847);
  const commander = commanderOf(world);
  const port = foreignPort(world, commander);
  place(commander, port.id);

  const own = submitCommand(world, {
    playerId: "prototype-player",
    type: "character-action",
    action: "survey",
    targetId: "crown-harbor",
  });
  assert.equal(own.ok, false);
  assert.equal(own.ok === false ? own.code : null, "not-here");

  place(commander, "crown-harbor");
  const held = submitCommand(world, {
    playerId: "prototype-player",
    type: "character-action",
    action: "survey",
  });
  assert.equal(held.ok, false);
  assert.equal(held.ok === false ? held.code : null, "faction-held");

  place(commander, port.id);
  const accepted = submitCommand(world, {
    playerId: "prototype-player",
    type: "character-action",
    action: "survey",
  });
  assert.equal(accepted.ok, true);
  const blocked = submitCommand(world, {
    playerId: "prototype-player",
    type: "character-action",
    action: "work",
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.ok === false ? blocked.code : null, "action-already-queued");
});

test("a survey writes ground with the survey tick, and later presence keeps it", () => {
  const world = createPrototypeWorld(1847);
  const commander = commanderOf(world);
  const port = foreignPort(world, commander);
  const surveyTick = surveyAt(world, port.id);
  const ground = commander.knowledge[port.id].ground;
  assert.ok(ground, "the survey must store a ground record");
  assert.equal(ground.observedTick, surveyTick);
  assert.equal(ground.source, "direct");
  assert.equal(ground.population, port.population);
  assert.equal(ground.fortification, port.fortification);
  assert.equal(commander.knowledge[port.id].source, "direct");
  assert.equal(commander.knowledge[port.id].observedTick, surveyTick);

  // Standing there is still present tense. The stored survey does not freeze
  // the panel while the commander can see the walls.
  const surveyedPopulation = ground.population;
  const surveyedFortification = ground.fortification;
  port.population = surveyedPopulation + 5_000;
  port.fortification = surveyedFortification + 2;
  const present = panel(world, port.id);
  assert.equal(present.population, port.population, "standing on the island shows the ground that is there now");
  assert.equal(present.fortification, port.fortification);
  assert.equal(present.groundIntelligence?.source, "direct-observation");
  assert.equal(commander.knowledge[port.id].ground?.population, surveyedPopulation, "looking at the walls must not rewrite the survey");

  let refreshed = false;
  for (let step = 0; step < world.ticksPerDay + 2 && !refreshed; step += 1) {
    const events = runTick(world).events;
    refreshed = events.some((event) =>
      event.type === "knowledge-updated" &&
      event.actorId === commander.id &&
      event.settlementId === port.id &&
      event.data.reason === "direct local observation"
    );
  }
  assert.ok(refreshed, "a day of standing must refresh the direct record");
  assert.equal(commander.knowledge[port.id].ground?.observedTick, surveyTick, "the daily refresh must keep the survey tick");
  assert.equal(commander.knowledge[port.id].ground?.population, surveyedPopulation);
  assert.equal(commander.knowledge[port.id].ground?.fortification, surveyedFortification);
  assert.ok(commander.knowledge[port.id].observedTick > surveyTick, "the rest of the entry still refreshes");

  const home = "crown-harbor";
  assert.notEqual(home, port.id);
  assert.equal(submitCommand(world, {
    playerId: "prototype-player",
    type: "character-action",
    action: "travel",
    targetId: home,
  }).ok, true);
  let arrivedHome = false;
  for (let step = 0; step < 20 && !arrivedHome; step += 1) {
    arrivedHome = runTick(world).events.some((event) =>
      event.type === "arrived" && event.actorId === commander.id && event.settlementId === home
    );
  }
  assert.ok(arrivedHome, "the commander must reach home");
  const away = panel(world, port.id);
  assert.equal(away.population, surveyedPopulation, "away, the panel reads the survey, not the walls as they are now");
  assert.equal(away.fortification, surveyedFortification);
  assert.equal(away.groundIntelligence?.source, "direct");
  assert.equal(away.groundIntelligence?.observedTick, surveyTick);
  assert.equal(away.groundIntelligence?.ageTicks, world.tick - surveyTick);

  assert.equal(submitCommand(world, {
    playerId: "prototype-player",
    type: "character-action",
    action: "travel",
    targetId: port.id,
  }).ok, true);
  let arrivedBack = false;
  for (let step = 0; step < 20 && !arrivedBack; step += 1) {
    const events = runTick(world).events;
    arrivedBack = events.some((event) =>
      event.type === "arrived" && event.actorId === commander.id && event.settlementId === port.id
    );
    if (arrivedBack) {
      const arrival = events.find((event) =>
        event.type === "knowledge-updated" &&
        event.actorId === commander.id &&
        event.settlementId === port.id &&
        event.data.reason === "arrival observation"
      );
      assert.ok(arrival, "arrival must refresh the record");
      const carried = (arrival.data.knowledge as SettlementKnowledge).ground;
      assert.equal(carried?.observedTick, surveyTick, "arrival must carry the survey forward");
      assert.equal(carried?.population, surveyedPopulation);
    }
  }
  assert.ok(arrivedBack, "the commander must return");
  assert.equal(commander.knowledge[port.id].ground?.observedTick, surveyTick);
  assert.equal(commander.knowledge[port.id].ground?.population, surveyedPopulation);
});

test("passive presence does not invent a ground record", () => {
  const world = createPrototypeWorld(1847);
  const commander = commanderOf(world);
  const port = foreignPort(world, commander);
  place(commander, port.id);
  const before = commander.knowledge[port.id];
  assert.equal("ground" in before, false);
  runTick(world);
  const observed = commander.knowledge[port.id];
  assert.equal(observed.source, "direct");
  assert.equal("ground" in observed, false, "a daily observation must leave the ground key absent");
  const fresh = directObservation(world, commander);
  assert.ok(fresh);
  assert.equal("ground" in fresh, false);
});

function stationExplorer(
  world: WorldState,
  officer: Character,
  targetId: string,
  targeted: boolean,
): void {
  const commander = commanderOf(world);
  place(officer, targetId);
  officer.health = 90;
  officer.morale = 80;
  officer.money = 400;
  officer.cargo = { ...officer.cargo, provisions: 80, arms: 0, medicine: 0, shipMaterials: 0 };
  officer.personality = { ...officer.personality, caution: 0, ambition: 1, curiosity: 0, commerce: 0 };
  const goal = officer.goals.find((entry) => entry.status === "active") ?? officer.goals[0];
  goal.status = "active";
  officer.activeGoalId = goal.id;
  officer.plan = {
    id: "test-plan",
    goalId: goal.id,
    intent: targeted ? "stay and work" : "trade where they stand",
    preferredActions: targeted ? ["work"] : ["trade-local"],
    createdTick: world.tick,
    reviewAfterTick: world.tick + 500,
    reason: "stationed for the survey test",
    orderId: "test-explore",
  };
  officer.lastPlanReviewTick = world.tick;
  const order: StandingOrder = {
    id: "test-explore",
    issuerId: commander.id,
    directive: "explore",
    priority: 1,
    issuedTick: world.tick,
    expiresTick: null,
    revision: 1,
    status: "active",
    adherence: "following",
    statusChangedTick: world.tick,
    deviationCount: 0,
    lastReport: null,
  };
  if (targeted) order.targetId = targetId;
  officer.standingOrders = [order];
  const settlement = world.settlements[targetId];
  officer.knowledge[targetId] = {
    settlementId: targetId,
    observedTick: world.tick,
    confidence: 1,
    factionId: settlement.factionId,
    garrisonEstimate: settlement.garrison,
    stocksEstimate: { ...settlement.stocks },
    priceEstimate: { provisions: 2, arms: 2, medicine: 2, shipMaterials: 2 },
    source: "direct",
  };
}

function explorer(world: WorldState, commander: Character): Character {
  return Object.values(world.characters)
    .filter((character) =>
      character.id !== commander.id &&
      character.controller.kind === "autonomous" &&
      character.factionId === commander.factionId
    )
    .sort((left, right) => left.id.localeCompare(right.id))[0];
}

test("a targeted explore completion delivers a faction-report to the issuer only", () => {
  const world = createPrototypeWorld(1847);
  const commander = commanderOf(world);
  const port = foreignPort(world, commander);
  const officer = explorer(world, commander);
  place(commander, "crown-harbor");
  stationExplorer(world, officer, port.id, true);
  // Below the raid gate, so no one else spends this tick changing the garrison
  // the officer is about to report.
  port.garrison = 10;
  world.activeBattles = {};
  const population = port.population;
  const fortification = port.fortification;
  const garrison = port.garrison;

  const events = runTick(world).events;
  const reportTick = world.tick - 1;
  const delivered = events.find((event) =>
    event.type === "knowledge-updated" &&
    event.actorId === commander.id &&
    event.settlementId === port.id
  );
  assert.ok(delivered, "the issuer must receive the officer's survey");
  assert.equal(delivered.data.reason, "explore-report");
  assert.equal(delivered.tick, reportTick);
  const knowledge = delivered.data.knowledge as SettlementKnowledge;
  assert.equal(knowledge.source, "faction-report");
  assert.equal(knowledge.observedTick, reportTick);
  assert.equal(knowledge.garrisonEstimate, garrison);
  assert.equal(knowledge.ground?.source, "faction-report");
  assert.equal(knowledge.ground?.observedTick, reportTick);
  assert.equal(knowledge.ground?.population, population);
  assert.equal(knowledge.ground?.fortification, fortification);
  assert.equal(commander.knowledge[port.id].source, "faction-report");
  assert.equal("ground" in officer.knowledge[port.id], false, "the officer's own map does not gain a ground record");

  const peer = Object.values(world.characters).find((character) =>
    character.id !== commander.id && character.id !== officer.id && character.factionId === commander.factionId
  )!;
  const rival = Object.values(world.characters).find((character) => character.factionId !== commander.factionId)!;
  assert.equal(eventPayloadVisible(world, commander, delivered), true);
  assert.equal(eventPayloadVisible(world, officer, delivered), false);
  assert.equal(eventPayloadVisible(world, peer, delivered), false);
  assert.equal(eventPayloadVisible(world, rival, delivered), false);

  // Untargeted explore completes the same way and delivers nothing.
  const untouched = createPrototypeWorld(1847);
  const untouchedCommander = commanderOf(untouched);
  const untouchedPort = foreignPort(untouched, untouchedCommander);
  const untouchedOfficer = explorer(untouched, untouchedCommander);
  place(untouchedCommander, "crown-harbor");
  const snapshot = JSON.stringify(untouchedCommander.knowledge[untouchedPort.id]);
  stationExplorer(untouched, untouchedOfficer, untouchedPort.id, false);
  // Stay put and trade. A raid or a recruitment would be a deviation, and an
  // untargeted explore only completes while the officer is still following.
  untouchedPort.garrison = 10;
  untouched.activeBattles = {};
  untouchedOfficer.money = 20;
  untouchedOfficer.skills = { ...untouchedOfficer.skills, trade: 100 };
  untouchedOfficer.personality = {
    ...untouchedOfficer.personality,
    commerce: 1,
    ambition: 0.2,
    caution: 0,
    curiosity: 0,
    aggression: 0,
  };
  const reserve = 20 + untouchedOfficer.troops.count * 0.18;
  untouchedOfficer.cargo = { provisions: reserve + 1, arms: 0, medicine: 0, shipMaterials: 0 };
  const quiet = runTick(untouched).events;
  assert.ok(
    quiet.some((event) => event.type === "standing-order-completion-reported" && event.actorId === untouchedOfficer.id),
    "an untargeted explore can still be completed",
  );
  assert.equal(
    quiet.some((event) =>
      event.type === "knowledge-updated" &&
      event.actorId === untouchedCommander.id &&
      event.data.reason === "explore-report"
    ),
    false,
    "an untargeted explore must not deliver a report",
  );
  assert.equal(JSON.stringify(untouchedCommander.knowledge[untouchedPort.id]), snapshot);
});

test("a remote forecast reads the stored ground and ignores later truth", () => {
  const world = createPrototypeWorld(1847);
  const commander = commanderOf(world);
  const port = foreignPort(world, commander);
  const surveyTick = surveyAt(world, port.id);
  place(commander, "crown-harbor");
  world.tick = surveyTick + 12;

  const before = combatForecast(world, commander.id, port.id);
  assert.ok(before.revealedFactors.includes(`surveyed ground is ${world.tick - surveyTick} ticks old`));
  assert.equal(before.revealedFactors.includes("defensive ground remains poorly understood"), false);

  const truth = { fortification: port.fortification, population: port.population, garrison: port.garrison };
  port.fortification = 9.5;
  port.population = 400_000;
  port.garrison = 8_888;
  const after = combatForecast(world, commander.id, port.id);
  assert.deepEqual(after, before, "changing the true walls and population must not move a remote forecast");
  const serialized = JSON.stringify(after);
  for (const leaked of [port.fortification, port.population, port.garrison]) {
    assert.equal(serialized.includes(String(leaked)), false, `the forecast must not contain ${leaked}`);
  }
  const shown = panel(world, port.id);
  assert.equal(shown.population, truth.population);
  assert.equal(shown.fortification, truth.fortification);
  assert.equal(shown.groundIntelligence?.source, "direct");

  const stored = commander.knowledge[port.id];
  commander.knowledge[port.id] = {
    ...stored,
    ground: {
      ...stored.ground!,
      fortification: stored.ground!.fortification + 4,
      population: stored.ground!.population + 1_000,
    },
  };
  const shifted = combatForecast(world, commander.id, port.id);
  assert.notDeepEqual(shifted.defenderPower, before.defenderPower, "the forecast must follow the stored record");
});

test("forecast availability follows the report's owner, not the true owner", () => {
  const world = createPrototypeWorld(1847);
  const commander = commanderOf(world);
  const port = foreignPort(world, commander);
  place(commander, "crown-harbor");
  commander.troops.count = 80;
  world.activeBattles = {};
  port.surrender = null;
  const enemy = port.factionId!;
  commander.knowledge[port.id] = {
    settlementId: port.id,
    observedTick: 0,
    confidence: 0.8,
    factionId: enemy,
    garrisonEstimate: 120,
    stocksEstimate: { provisions: 10, arms: 10, medicine: 10, shipMaterials: 10 },
    priceEstimate: { provisions: 2, arms: 2, medicine: 2, shipMaterials: 2 },
    source: "faction-report",
  };

  assert.ok(panel(world, port.id).combatForecast, "a hostile report offers a forecast");
  port.factionId = null;
  assert.ok(
    panel(world, port.id).combatForecast,
    "the island changing hands in truth must not remove a forecast the report still supports",
  );
  port.factionId = enemy;
  commander.knowledge[port.id].factionId = commander.factionId;
  assert.equal(
    panel(world, port.id).combatForecast,
    null,
    "a report of the commander's own faction must not grow a forecast just because the truth is hostile",
  );
  commander.knowledge[port.id].factionId = null;
  assert.equal(panel(world, port.id).combatForecast, null, "a report with no owner is not a hostile target");

  place(commander, port.id);
  commander.knowledge[port.id].factionId = commander.factionId;
  port.factionId = enemy;
  assert.ok(panel(world, port.id).combatForecast, "standing on a hostile island uses the faction that is there");
});

test("no projected field is zero where the commander has no report", () => {
  const world = createPrototypeWorld(1847);
  const commander = commanderOf(world);
  place(commander, "crown-harbor");
  commander.knowledge = {};
  const state = dashboardState(world, [], fullEventFeed([])) as { settlements: Array<Record<string, unknown> & { id: string }> };
  const unreported = state.settlements.find((settlement) => settlement.id !== commander.locationId && settlement.id !== "glassport");
  assert.ok(unreported, "a settlement outside the faction and the commander's feet");
  // Crown Harbor and Glassport are the commander's faction, so they stay exact.
  assert.notEqual(world.settlements[unreported.id].factionId, commander.factionId);

  for (const field of [
    "population",
    "fortification",
    "garrison",
    "stocks",
    "prices",
    "stability",
    "workers",
    "focus",
    "production",
    "targetStocks",
    "partyCount",
    "market",
    "priceDrift",
    "priceQuote",
    "combatForecast",
    "groundIntelligence",
    "ownerId",
    "intelligence",
    "factionId",
  ]) {
    assert.equal(unreported[field], null, `${field} must be unknown, not a number`);
    assert.notEqual(unreported[field], 0, `${field} must not be zero`);
  }

  const publicNumbers = new Set(["taxRate", "passageCostPerTick", "x", "y", "travelTicks", "travelDays", "passageCost"]);
  const visit = (value: unknown, path: string): void => {
    if (typeof value === "number") {
      const key = path.split(".").pop() ?? path;
      if (value === 0 && !publicNumbers.has(key)) {
        assert.fail(`${path} is 0 where an unknown should be null`);
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, `${path}[${index}]`));
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, nested] of Object.entries(value)) visit(nested, `${path}.${key}`);
    }
  };
  visit(unreported, unreported.id);

  const owned = state.settlements.find((settlement) => settlement.id === "glassport")!;
  const ownedGround = owned.groundIntelligence as { source: string };
  assert.equal(ownedGround.source, "owned");
});
