import assert from "node:assert/strict";
import test from "node:test";
import { eventPayloadVisible, projectCharacter } from "../src/dashboard/visibility.ts";
import { dashboardState, fullEventFeed } from "../src/dashboard/view-model.ts";
import { combatForecast } from "../src/sim/combat.ts";
import { submitCommand } from "../src/sim/commands.ts";
import { runTick } from "../src/sim/engine.ts";
import { createPrototypeWorld } from "../src/sim/scenario.ts";
import { applyEvent, partyPower } from "../src/sim/state.ts";
import type { Character, PartySighting, Settlement, StandingOrder, WorldState } from "../src/sim/types.ts";

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
  return tick;
}

function anchoredAt(world: WorldState, settlementId: string, exceptId: string): Character[] {
  return Object.values(world.characters)
    .filter((character) =>
      character.id !== exceptId &&
      character.locationId === settlementId &&
      character.travel === null
    )
    .sort((left, right) => left.id.localeCompare(right.id));
}

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
    reason: "stationed for the sighting test",
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

test("a survey records anchored parties at the survey tick", () => {
  const world = createPrototypeWorld(1847);
  const commander = commanderOf(world);
  const port = foreignPort(world, commander);
  const present = anchoredAt(world, port.id, commander.id);
  assert.ok(present.length >= 2, "the foreign port must open with company");
  const sailing = present[0];
  const elsewhere = Object.values(world.characters).find((character) =>
    character.id !== commander.id && character.locationId !== port.id && character.travel === null
  )!;
  sailing.travel = { fromId: port.id, toId: "crown-harbor", totalTicks: 4, remainingTicks: 2 };
  const expected = anchoredAt(world, port.id, commander.id).map((character) => ({
    id: character.id,
    troops: character.troops.count,
    partyPower: partyPower(character),
  }));
  assert.ok(expected.length >= 1);
  assert.equal(expected.some((entry) => entry.id === sailing.id), false);
  assert.equal(expected.some((entry) => entry.id === elsewhere.id), false);

  const surveyTick = surveyAt(world, port.id);
  const sightings = commander.partySightings;
  assert.ok(sightings, "the survey must store a sighting map");
  assert.equal(sightings[commander.id], undefined, "the commander is not a sighting of herself");
  assert.equal(sightings[sailing.id], undefined, "a character with travel set is absent");
  assert.equal(sightings[elsewhere.id], undefined, "a character in another port is absent");
  assert.deepEqual(
    Object.keys(sightings).sort(),
    expected.map((entry) => entry.id),
  );
  for (const entry of expected) {
    const seen: PartySighting = sightings[entry.id];
    assert.equal(seen.observedTick, surveyTick);
    assert.equal(seen.source, "direct");
    assert.equal(seen.confidence, 1);
    assert.equal(seen.troops, entry.troops);
    assert.equal(seen.partyPower, entry.partyPower);
    assert.equal(seen.travel, null);
    assert.equal(seen.locationId, port.id);
    assert.equal(seen.characterId, entry.id);
    assert.equal("captivity" in seen, false);
  }
});

test("a remote sighting ignores later troop changes", () => {
  const world = createPrototypeWorld(1847);
  const commander = commanderOf(world);
  const port = foreignPort(world, commander);
  const subject = anchoredAt(world, port.id, commander.id)[0];
  assert.ok(subject);
  const surveyTick = surveyAt(world, port.id);
  const surveyedTroops = commander.partySightings?.[subject.id]?.troops;
  assert.equal(typeof surveyedTroops, "number");
  place(commander, "crown-harbor");

  const before = combatForecast(world, commander.id, port.id);
  subject.troops.count = 9999;
  const projected = projectCharacter(world, commander, subject);
  assert.equal(projected.troops, null);
  assert.equal(projected.partyPower, null);
  const sighting = projected.partySighting as PartySighting;
  assert.equal(sighting.troops, surveyedTroops);
  assert.equal(sighting.observedTick, surveyTick);
  const after = combatForecast(world, commander.id, port.id);
  assert.deepEqual(after, before);
  assert.equal(JSON.stringify(after).includes("9999"), false);
});

test("a sighting is never newer than the observation", () => {
  const world = createPrototypeWorld(1847);
  const commander = commanderOf(world);
  const port = foreignPort(world, commander);
  const subject = anchoredAt(world, port.id, commander.id)[0];
  const surveyTick = surveyAt(world, port.id);
  const storedTroops = commander.partySightings?.[subject.id]?.troops;
  assert.equal(typeof storedTroops, "number");

  for (let step = 0; step < 4; step += 1) runTick(world);
  assert.equal(commander.partySightings?.[subject.id]?.observedTick, surveyTick);
  place(commander, "crown-harbor");
  const projected = projectCharacter(world, commander, subject);
  const sighting = projected.partySighting as PartySighting & { ageTicks: number };
  assert.equal(sighting.observedTick, surveyTick);
  assert.equal(sighting.ageTicks, world.tick - surveyTick);

  applyEvent(world, {
    sequence: world.nextEventSequence,
    tick: world.tick,
    type: "knowledge-updated",
    actorId: commander.id,
    settlementId: port.id,
    data: {
      settlementId: port.id,
      knowledge: commander.knowledge[port.id],
      reason: "explore-report",
      partySightings: [{
        characterId: subject.id,
        locationId: port.id,
        travel: null,
        troops: 1,
        partyPower: 1,
        observedTick: surveyTick - 1,
        source: "faction-report",
        confidence: 1,
      }],
    },
  });
  assert.equal(commander.partySightings?.[subject.id]?.observedTick, surveyTick);
  assert.equal(commander.partySightings?.[subject.id]?.troops, storedTroops);
  assert.equal(commander.partySightings?.[subject.id]?.source, "direct");
});

test("a targeted explore delivers sightings to the issuer only", () => {
  const world = createPrototypeWorld(1847);
  const commander = commanderOf(world);
  const port = foreignPort(world, commander);
  const officer = explorer(world, commander);
  place(commander, "crown-harbor");
  const expected = anchoredAt(world, port.id, officer.id).map((character) => character.id);
  assert.ok(expected.length >= 1, "the port must have someone besides the officer");
  stationExplorer(world, officer, port.id, true);
  port.garrison = 10;
  world.activeBattles = {};

  const events = runTick(world).events;
  const reportTick = world.tick - 1;
  const delivered = events.find((event) =>
    event.type === "knowledge-updated" &&
    event.actorId === commander.id &&
    event.data.reason === "explore-report"
  );
  assert.ok(delivered, "the issuer must receive the officer's report");
  const sightings = commander.partySightings;
  assert.ok(sightings);
  assert.deepEqual(Object.keys(sightings).sort(), [...expected].sort());
  for (const characterId of expected) {
    const seen: PartySighting = sightings[characterId];
    assert.equal(seen.source, "faction-report");
    assert.equal(seen.observedTick, reportTick);
    assert.equal(seen.confidence, 1);
    assert.equal(seen.travel, null);
    assert.equal(seen.locationId, port.id);
  }
  assert.equal(sightings[officer.id], undefined, "the reporting officer is not on the list they made");
  assert.equal(officer.partySightings, undefined, "the officer's map does not gain the list");
  assert.equal(projectCharacter(world, commander, officer).knowledge, null);

  const rival = Object.values(world.characters).find((character) => character.factionId !== commander.factionId)!;
  assert.equal(eventPayloadVisible(world, commander, delivered), true);
  assert.equal(eventPayloadVisible(world, rival, delivered), false);

  const late = Object.values(world.characters).find((character) => !sightings[character.id] && character.id !== commander.id)!;
  place(late, port.id);
  assert.equal(commander.partySightings?.[late.id], undefined, "a party placed on the port after the report is absent");
  assert.equal(
    (projectCharacter(world, commander, late).partySighting as PartySighting | null),
    null,
  );

  const untouched = createPrototypeWorld(1847);
  const untouchedCommander = commanderOf(untouched);
  const untouchedPort = foreignPort(untouched, untouchedCommander);
  const untouchedOfficer = explorer(untouched, untouchedCommander);
  place(untouchedCommander, "crown-harbor");
  stationExplorer(untouched, untouchedOfficer, untouchedPort.id, false);
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
  assert.equal(untouchedCommander.partySightings, undefined, "an untargeted explore adds nothing");
  assert.equal(
    quiet.some((event) =>
      event.type === "knowledge-updated" &&
      event.actorId === untouchedCommander.id &&
      event.data.reason === "explore-report"
    ),
    false,
  );
});

test("a remote forecast reads stored sightings and ignores later troops", () => {
  const world = createPrototypeWorld(1847);
  const commander = commanderOf(world);
  const port = foreignPort(world, commander);
  const surveyTick = surveyAt(world, port.id);
  place(commander, "crown-harbor");
  world.tick = surveyTick + 12;
  const forecast = combatForecast(world, commander.id, port.id);
  assert.ok(forecast.revealedFactors.includes(`sighted parties at this port are ${world.tick - surveyTick} ticks old`));

  const state = dashboardState(world, [], fullEventFeed([])) as {
    settlements: Array<{ id: string; partyCount: number | null }>;
  };
  assert.equal(state.settlements.find((entry) => entry.id === port.id)?.partyCount, null);
});

test("a sea row does not create a partySightings entry", () => {
  const world = createPrototypeWorld(1847);
  const commander = commanderOf(world);
  const subject = Object.values(world.characters).find((character) => character.id !== commander.id);
  assert.ok(subject);
  commander.locationId = null;
  commander.captivity = null;
  commander.travel = { fromId: "crown-harbor", toId: "glassport", totalTicks: 4, remainingTicks: 4 };
  subject.locationId = null;
  subject.captivity = null;
  subject.travel = { fromId: "crown-harbor", toId: "glassport", totalTicks: 4, remainingTicks: 4 };
  assert.equal(commander.partySightings, undefined);

  const projected = projectCharacter(world, commander, subject);
  assert.equal((projected.seaSighting as { kind: string }).kind, "sharing");
  assert.equal(commander.partySightings, undefined);
  assert.equal(subject.partySightings, undefined);
  assert.equal("partySightings" in projected && projected.partySightings === null, true);
});

test("a captor row does not create a partySightings entry", () => {
  const world = createPrototypeWorld(1847);
  const commander = commanderOf(world);
  const subject = Object.values(world.characters).find((character) =>
    character.id !== commander.id && character.factionId !== commander.factionId,
  );
  assert.ok(subject);
  subject.locationId = commander.locationId;
  subject.travel = null;
  subject.troops = { ...subject.troops, count: 0 };
  subject.captivity = {
    captorFactionId: commander.factionId,
    settlementId: commander.locationId!,
    capturedTick: 4,
    mandatoryReleaseTick: 88,
    cause: "failed-retreat",
    displayedRisk: "low",
    scatteredTroops: { count: 12, experience: subject.troops.experience, discipline: subject.troops.discipline },
    releaseDestinationId: null,
    negotiation: { negotiatorId: null, persuasion: 0, status: "unreceptive", attempts: 0, lastAttemptTick: null, openedTick: null, offer: null },
  };
  assert.equal(commander.partySightings, undefined);

  const projected = projectCharacter(world, commander, subject);
  assert.equal((projected.captiveIntel as { troops: number }).troops, 12);
  assert.equal(commander.partySightings, undefined);
  assert.equal(subject.partySightings, undefined);
  assert.equal(projected.partySightings, null);
});
