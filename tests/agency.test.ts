import assert from "node:assert/strict";
import test from "node:test";
import { assessStandingOrder, judgeOrderCompletion, reviewPlan } from "../src/sim/agency.ts";
import { runTick, runTicks } from "../src/sim/engine.ts";
import { DeterministicRng } from "../src/sim/rng.ts";
import { createPrototypeWorld } from "../src/sim/scenario.ts";

test("characters begin with rooted goals, beliefs, relationships, and faction orders", () => {
  const world = createPrototypeWorld(1847);
  const characters = Object.values(world.characters);

  assert.ok(characters.every((character) => character.goals.length >= 2));
  assert.ok(characters.every((character) => Object.keys(character.knowledge).length === 4));
  assert.ok(characters.every((character) => Object.keys(character.relationships).length >= 1));

  const ordered = characters.filter((character) => character.standingOrders.length > 0);
  assert.equal(ordered.length, 20);
  const assessments = ordered.map((character) => assessStandingOrder(character, character.standingOrders[0])!);
  assert.ok(assessments.some((assessment) => assessment.willComply));
  assert.ok(assessments.some((assessment) => !assessment.willComply));
});

test("initial planning records alternatives and independent order judgments", () => {
  const world = createPrototypeWorld(1847);
  const result = runTick(world);
  const reviews = result.events.filter((event) => event.type === "plan-reconsidered");

  assert.equal(reviews.length, 29);
  const assessments = reviews
    .map((event) => event.data.orderAssessment as { willComply: boolean } | null)
    .filter((assessment): assessment is { willComply: boolean } => Boolean(assessment));
  assert.equal(assessments.length, 20);
  assert.ok(assessments.some((assessment) => assessment.willComply));
  assert.ok(assessments.some((assessment) => !assessment.willComply));
  assert.ok(reviews.every((event) => Array.isArray(event.data.goalScores)));
});

test("a merchant travels according to believed prices rather than hidden true prices", () => {
  const world = createPrototypeWorld(1847);
  const merchant = world.characters["character-02"];
  merchant.locationId = "crown-harbor";
  merchant.travel = null;
  merchant.standingOrders = [];
  merchant.plan = null;
  merchant.cargo.arms = 50;
  for (const goal of merchant.goals) goal.priority = goal.kind === "build-wealth" ? 2 : 0.1;
  for (const [settlementId, knowledge] of Object.entries(merchant.knowledge)) {
    knowledge.confidence = 1;
    knowledge.observedTick = 0;
    knowledge.priceEstimate.arms = settlementId === "verdant-cay" ? 50 : 1;
  }

  const result = runTick(world);
  const decision = result.events.find(
    (event) => event.type === "decision-made" && event.actorId === merchant.id,
  );
  assert.equal((decision?.data.chosen as { action: string }).action, "travel");
  assert.equal((decision?.data.chosen as { targetId: string }).targetId, "verdant-cay");
  assert.equal((decision?.data.targetKnowledge as { priceEstimate: { arms: number } }).priceEstimate.arms, 50);
});

test("urgent survival needs can override an aggressive character's established ambition", () => {
  const world = createPrototypeWorld(1847);
  const raider = world.characters["character-14"];
  raider.cargo.provisions = 0;
  raider.plan = null;

  const result = runTick(world);
  const review = result.events.find(
    (event) => event.type === "plan-reconsidered" && event.actorId === raider.id,
  );
  assert.equal(review?.data.selectedGoalId, `${raider.id}:material-security`);
});

test("battle experiences reshape goals and may change hierarchical relationships", () => {
  const result = runTicks(createPrototypeWorld(1847), 90);
  const evolved = result.events.filter((event) => event.type === "goal-evolved");
  const relationships = result.events.filter((event) => event.type === "relationship-changed");

  assert.ok(evolved.length > 0);
  assert.ok(evolved.some((event) => event.data.trigger === "victory"));
  assert.ok(evolved.some((event) => event.data.trigger === "defeat"));
  assert.ok(relationships.length > 0);
});

test("after a claim at garrison 13, regrowth reaches 15 and a hostile raid is offered", () => {
  const world = createPrototypeWorld(1847);
  const claimant = world.characters["character-03"];
  const raider = world.characters["character-14"];
  const settlement = world.settlements["cinder-key"];
  assert.notEqual(raider.factionId, claimant.factionId);
  assert.ok(raider.factionId);
  claimant.locationId = settlement.id;
  claimant.travel = null;
  settlement.garrison = 13;
  settlement.stability = 18;
  settlement.surrender = {
    offeredToId: claimant.id,
    offeredTick: world.tick,
    previousFactionId: "free-tide",
  };

  const claimed = runTick(world);
  assert.ok(claimed.events.some((event) =>
    event.type === "settlement-claimed" && event.settlementId === settlement.id && event.actorId === claimant.id
  ));
  assert.equal(settlement.garrison, 13);

  raider.personality = {
    ...raider.personality,
    aggression: 0.99,
    ambition: 0.99,
    caution: 0,
    curiosity: 0,
    commerce: 0,
  };
  raider.troops.count = 120;
  raider.plan = null;

  const claims = claimed.events.filter((event) =>
    event.type === "settlement-claimed" && event.settlementId === settlement.id
  );
  let raidOffered = false;
  let crossedAt: number | null = null;
  const upkeepGarrison = new Map<number, number>();

  while (world.tick <= 62) {
    for (const character of Object.values(world.characters)) {
      if (character.id === raider.id) continue;
      character.lastBattleTick = world.tick;
      if (character.id !== claimant.id && character.locationId === settlement.id) {
        character.locationId = "crown-harbor";
        character.travel = null;
      }
    }
    raider.locationId = settlement.id;
    raider.travel = null;
    raider.captivity = null;
    raider.plan = null;
    raider.lastBattleTick = -100;
    settlement.stocks.provisions = 100_000;
    const result = runTick(world);
    for (const event of result.events) {
      if (event.type === "settlement-claimed" && event.settlementId === settlement.id) claims.push(event);
      if (
        (event.type === "settlement-upkeep" || event.type === "settlement-shortage") &&
        event.settlementId === settlement.id
      ) {
        upkeepGarrison.set(event.tick, event.data.garrison as number);
      }
      const candidates = event.data.candidates as Array<{ action?: string; targetId?: string }> | undefined;
      if (
        event.type === "decision-made" &&
        event.actorId === raider.id &&
        candidates?.some((candidate) => candidate.action === "raid" && candidate.targetId === settlement.id)
      ) {
        raidOffered = true;
        crossedAt = event.tick;
      }
    }
  }

  assert.equal(upkeepGarrison.get(31), 14);
  assert.equal(upkeepGarrison.get(62), 15);
  assert.equal(raidOffered, true);
  assert.equal(crossedAt, 62);
  assert.equal(claims.length, 1);
  assert.ok(claims.length < world.tick, "claims must not arrive on every tick");
});

test("an autonomous character claims a hostile settlement that offers surrender", () => {
  const world = createPrototypeWorld(1847);
  const claimant = world.characters["character-03"];
  const settlement = world.settlements["cinder-key"];
  claimant.locationId = settlement.id;
  claimant.travel = null;
  settlement.garrison = 8;
  settlement.stability = 18;
  settlement.surrender = {
    offeredToId: claimant.id,
    offeredTick: world.tick,
    previousFactionId: "free-tide",
  };

  const result = runTick(world);
  const claim = result.events.find((event) =>
    event.type === "settlement-claimed" && event.actorId === claimant.id
  );
  assert.ok(claim);
  assert.equal(settlement.ownerId, claimant.id);
  assert.equal(settlement.factionId, claimant.factionId);
});

test("a claimed port is not claimed or raided again while its garrison stays under 15", () => {
  const world = createPrototypeWorld(1847);
  const claimant = world.characters["character-03"];
  const settlement = world.settlements["cinder-key"];
  claimant.locationId = settlement.id;
  claimant.travel = null;
  settlement.garrison = 8;
  settlement.stability = 18;
  settlement.surrender = {
    offeredToId: claimant.id,
    offeredTick: world.tick,
    previousFactionId: "free-tide",
  };

  const claimed = runTick(world);
  assert.ok(claimed.events.some((event) =>
    event.type === "settlement-claimed" && event.settlementId === settlement.id
  ));
  assert.ok(settlement.garrison < 15);

  const later = runTicks(world, 36);
  const events = [...claimed.events, ...later.events];
  const claims = events.filter((event) =>
    event.type === "settlement-claimed" && event.settlementId === settlement.id
  );
  assert.equal(claims.length, 1);
  const raids = events.filter((event) => {
    const chosen = event.data.chosen as { action?: string; targetId?: string } | undefined;
    return event.type === "decision-made" &&
      chosen?.action === "raid" &&
      (event.settlementId === settlement.id || chosen.targetId === settlement.id);
  });
  assert.equal(raids.length, 0);
  assert.ok(settlement.garrison < 15, `garrison recovered to ${settlement.garrison}`);
});

test("Crown Harbor left at garrison 6 and stability 0 reaches 15 and a hostile raid is offered", () => {
  const world = createPrototypeWorld(1847);
  const raider = world.characters["character-14"];
  const settlement = world.settlements["crown-harbor"];
  assert.equal(raider.factionId, "free-tide");
  assert.notEqual(raider.factionId, settlement.factionId);
  settlement.garrison = 6;
  settlement.stability = 0;
  settlement.stocks.provisions = 0;
  raider.personality = {
    ...raider.personality,
    aggression: 0.99,
    ambition: 0.99,
    caution: 0,
    curiosity: 0,
    commerce: 0,
  };
  raider.troops.count = 120;
  raider.plan = null;

  let raidOffered = false;
  let crossedAt: number | null = null;
  const upkeepGarrison = new Map<number, number>();

  while (world.tick <= 99) {
    for (const character of Object.values(world.characters)) {
      if (character.id === raider.id) continue;
      character.lastBattleTick = world.tick;
      if (character.locationId === settlement.id) {
        character.locationId = "verdant-cay";
        character.travel = null;
      }
    }
    raider.locationId = settlement.id;
    raider.travel = null;
    raider.captivity = null;
    raider.plan = null;
    raider.lastBattleTick = -100;
    const result = runTick(world);
    for (const event of result.events) {
      if (
        (event.type === "settlement-upkeep" || event.type === "settlement-shortage") &&
        event.settlementId === settlement.id
      ) {
        upkeepGarrison.set(event.tick, event.data.garrison as number);
        assert.equal(event.type, "settlement-upkeep");
        assert.equal(event.data.shortage, 0);
      }
      const candidates = event.data.candidates as Array<{ action?: string; targetId?: string }> | undefined;
      if (
        event.type === "decision-made" &&
        event.actorId === raider.id &&
        candidates?.some((candidate) => candidate.action === "raid" && candidate.targetId === settlement.id)
      ) {
        raidOffered = true;
        crossedAt = event.tick;
      }
    }
  }

  assert.equal(upkeepGarrison.get(11), 7);
  assert.equal(upkeepGarrison.get(88), 14);
  assert.equal(upkeepGarrison.get(99), 15);
  assert.equal(raidOffered, true);
  assert.equal(crossedAt, 99);
});

test("satisfying the last ambition renews opening roots and leaves battle goals finished", () => {
  const world = createPrototypeWorld(1847);
  const character = world.characters["character-25"];
  assert.equal(character.archetype, "steward");
  assert.equal(character.factionId, null);
  const security = character.goals.find((goal) => goal.kind === "material-security");
  const power = character.goals.find((goal) => goal.kind === "build-power");
  assert.ok(security && power);
  security.progress = 1;
  security.status = "satisfied";
  power.progress = 0.999;
  power.status = "active";
  character.activeGoalId = power.id;
  character.goals.push({
    id: `${character.id}:recover-strength`,
    kind: "recover-strength",
    label: "Recover strength after a consequential defeat",
    priority: 0.92,
    progress: 1,
    status: "satisfied",
    origin: "defeat at Glassport",
    createdTick: 40,
  });

  let renewed = false;
  for (let attempt = 0; attempt < 6 && !renewed; attempt += 1) {
    const result = runTick(world);
    renewed = result.events.some((event) =>
      event.type === "goal-evolved" &&
      event.actorId === character.id &&
      event.data.trigger === "satisfying every open ambition"
    );
  }
  assert.equal(renewed, true);
  const recovery = character.goals.find((goal) => goal.kind === "recover-strength");
  const renewedSecurity = character.goals.find((goal) => goal.kind === "material-security");
  const renewedPower = character.goals.find((goal) => goal.kind === "build-power");
  assert.equal(recovery?.status, "satisfied");
  assert.equal(recovery?.progress, 1);
  for (const goal of [renewedSecurity, renewedPower]) {
    assert.ok(goal);
    assert.equal(goal.status, "active");
    assert.equal(goal.progress, 0);
    assert.equal(goal.origin.startsWith("renewed: "), true);
  }
  assert.doesNotThrow(() => runTick(world));
  assert.ok(character.goals.some((goal) => goal.status === "active"));
});

test("seeds that used to exhaust ambitions still have a goal after 400 ticks", () => {
  for (const seed of [1847, 2718, 4096]) {
    const result = runTicks(createPrototypeWorld(seed), 400);
    assert.equal(result.state.tick, 400);
    const renewals = result.events.filter((event) =>
      event.type === "goal-evolved" && event.data.trigger === "satisfying every open ambition"
    );
    assert.ok(renewals.length > 0, `seed ${seed} never renewed an ambition`);
    assert.ok(renewals.every((event) => event.tick > 72), `seed ${seed} renewed inside the golden window`);
    for (const character of Object.values(result.state.characters)) {
      assert.ok(
        character.goals.some((goal) => goal.status === "active"),
        `${character.name} on seed ${seed} has no active goal at tick 400`,
      );
    }
  }
});

test("accepted orders report temporary deviations, resumptions, and completion judgments", () => {
  const result = runTicks(createPrototypeWorld(1847), 24);
  const deviations = result.events.filter((event) => event.type === "standing-order-deviated");
  const resumptions = result.events.filter((event) => event.type === "standing-order-resumed");
  const reports = result.events.filter((event) => event.type === "standing-order-completion-reported");

  assert.ok(deviations.length > 0);
  assert.ok(resumptions.some((event) => deviations.some((deviation) => deviation.data.orderId === event.data.orderId)));
  assert.ok(reports.length > 0);
  assert.ok(reports.every((event) => {
    const character = result.state.characters[event.actorId!];
    return character.standingOrders.some((order) =>
      order.id === event.data.orderId &&
      (order.status === "awaiting-confirmation" || order.status === "completed")
    );
  }));
});

test("an active protect order does not complete once the target's faction has changed", () => {
  const world = createPrototypeWorld(1847);
  const character = world.characters["character-16"];
  assert.equal(character.name, "Corin Hale");
  const order = character.standingOrders.find((candidate) => candidate.directive === "protect");
  assert.ok(order);
  assert.equal(order.targetId, "cinder-key");
  order.status = "active";
  order.adherence = "following";
  // One day of evidence, with this rng, scores under the threshold. Two days
  // is long enough for a faction that still holds the port to complete.
  order.statusChangedTick = world.tick - world.ticksPerDay * 2;
  character.locationId = order.targetId;
  character.travel = null;

  const held = judgeOrderCompletion(world, character, order, "rest", [], new DeterministicRng(1));
  assert.ok(held);
  assert.equal(held.score >= held.threshold, true);
  assert.match(held.summary, /Corin Hale reports that Cinder Key is secure/);

  world.settlements["cinder-key"].factionId = "world-government";
  assert.equal(character.locationId, "cinder-key");
  assert.equal(
    judgeOrderCompletion(world, character, order, "rest", [], new DeterministicRng(1)),
    null,
    "standing on a port another faction holds is not a completed protection",
  );

  // Equality, including null. An unaligned officer on an unowned port can still finish.
  character.factionId = null;
  world.settlements["cinder-key"].factionId = null;
  const unowned = judgeOrderCompletion(world, character, order, "rest", [], new DeterministicRng(1));
  assert.ok(unowned);
  assert.match(unowned.summary, /Cinder Key is secure/);

  world.settlements["cinder-key"].factionId = "world-government";
  const esme = world.characters["character-19"];
  assert.equal(esme.factionId, "free-tide");
  assert.ok(esme.goals.some((goal) => goal.status === "active"));
  const review = reviewPlan(world, esme, new DeterministicRng(1));
  assert.ok(review, "losing the last port does not leave the character with no goal");
  assert.equal(review.selectedGoalId, "character-19:serve-faction");
  assert.equal(review.goalScores[0]?.kind, "serve-faction");
});
