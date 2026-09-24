import assert from "node:assert/strict";
import test from "node:test";
import { assessStandingOrder } from "../src/sim/agency.ts";
import { runTick, runTicks } from "../src/sim/engine.ts";
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

  assert.equal(reviews.length, 30);
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
  const result = runTicks(createPrototypeWorld(1847), 30);
  const evolved = result.events.filter((event) => event.type === "goal-evolved");
  const relationships = result.events.filter((event) => event.type === "relationship-changed");

  assert.ok(evolved.length > 0);
  assert.ok(evolved.some((event) => event.data.trigger === "victory"));
  assert.ok(evolved.some((event) => event.data.trigger === "defeat"));
  assert.ok(relationships.length > 0);
});
