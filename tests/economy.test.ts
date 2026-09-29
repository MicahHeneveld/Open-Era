import assert from "node:assert/strict";
import test from "node:test";
import { dashboardState, fullEventFeed } from "../src/dashboard/view-model.ts";
import {
  believedGarrison,
  believedPrice,
  GARRISON_FRESHNESS_TICKS,
  PRICE_FRESHNESS_TICKS,
} from "../src/sim/agency.ts";
import { submitCommand } from "../src/sim/commands.ts";
import {
  marketDepth,
  passageCost,
  PASSAGE_COST_PER_TICK,
  priceDriftPerTick,
  runTick,
  tradeQuote,
} from "../src/sim/engine.ts";
import { createPrototypeWorld } from "../src/sim/scenario.ts";
import { marketPrice, round } from "../src/sim/state.ts";
import { RESOURCE_KEYS, type ResourceKey, type WorldState } from "../src/sim/types.ts";

const PLAYER = "prototype-player";

function commanderOf(world: WorldState) {
  return world.characters[world.players[PLAYER].characterId];
}

function projected(world: WorldState) {
  return dashboardState(world, [], fullEventFeed([])) as {
    tick: number;
    party: { passageCostPerTick: number; passageCostRemaining: number | null; money?: number };
    settlements: Array<Record<string, any>>;
    factions: Array<{ id: string; taxRate: number | null; treasury: number | null }>;
  };
}

test("a player order cannot clear more than the market's depth", () => {
  const world = createPrototypeWorld(1847);
  runTick(world);
  const commander = commanderOf(world);
  commander.money = 100_000;
  const settlement = world.settlements[commander.locationId!];
  settlement.stocks.arms = 5_000;
  const depth = marketDepth(settlement, "arms");
  const requested = Math.ceil(depth) + 8;

  const quote = tradeQuote(world, commander, "arms", "buy", requested);
  assert.equal(quote.limitedBy, "depth");
  assert.ok(quote.maxQuantity <= depth + 1e-9, "the quoted fill must stop at the depth");
  assert.ok(quote.maxQuantity < settlement.stocks.arms, "depth must bind before the raw stock");

  const refused = submitCommand(world, {
    playerId: PLAYER,
    type: "character-action",
    action: "buy-resource",
    resource: "arms",
    quantity: requested,
  });
  assert.equal(refused.ok, false);
  assert.equal(refused.ok === false ? refused.code : null, "market-depth");
  assert.match(refused.ok === false ? refused.error : "", /will clear/);
  assert.match(refused.ok === false ? refused.error : "", /largest whole order is 14/);

  const accepted = Math.max(1, Math.floor(quote.maxQuantity));
  assert.equal(submitCommand(world, {
    playerId: PLAYER,
    type: "character-action",
    action: "buy-resource",
    resource: "arms",
    quantity: accepted,
  }).ok, true);
  const before = commander.cargo.arms;
  runTick(world);
  assert.equal(
    Number((commander.cargo.arms - before).toFixed(3)),
    accepted,
    "an order inside the depth must fill in full",
  );
  assert.ok(accepted <= depth + 1e-9);
});

test("a sale into a deep hold is capped by the same depth", () => {
  const world = createPrototypeWorld(1847);
  runTick(world);
  const commander = commanderOf(world);
  const settlement = world.settlements[commander.locationId!];
  commander.cargo.arms = 80;
  const depth = marketDepth(settlement, "arms");
  assert.ok(80 > depth, "the hold must be deeper than the market, or this proves nothing");

  const quote = tradeQuote(world, commander, "arms", "sell", 80);
  assert.equal(quote.limitedBy, "depth");
  const refused = submitCommand(world, {
    playerId: PLAYER,
    type: "character-action",
    action: "sell-resource",
    resource: "arms",
    quantity: 80,
  });
  assert.equal(refused.ok, false);
  assert.equal(refused.ok === false ? refused.code : null, "market-depth");
});

test("travel charges money the quoted passage said it would, and eats no extra food", () => {
  const anchor = createPrototypeWorld(1847);
  const sailing = createPrototypeWorld(1847);
  const id = sailing.players[PLAYER].characterId;
  const view = projected(sailing);
  const destination = view.settlements.find((settlement) => settlement.id !== commanderOf(sailing).locationId && settlement.passageCost != null);
  assert.ok(destination, "a destination must quote a passage cost before the commander sails");
  assert.equal(destination.passageCostPerTick, PASSAGE_COST_PER_TICK);
  assert.equal(destination.passageCost, passageCost(destination.travelTicks));
  assert.ok(destination.passageCost > 0, "a voyage must cost money, not only time");

  const foodBefore = {
    anchor: anchor.characters[id].cargo.provisions,
    sailing: sailing.characters[id].cargo.provisions,
  };
  const moneyBefore = {
    anchor: anchor.characters[id].money,
    sailing: sailing.characters[id].money,
  };

  assert.equal(submitCommand(sailing, {
    playerId: PLAYER,
    type: "character-action",
    action: "travel",
    targetId: destination.id,
  }).ok, true);

  let guard = 0;
  while (commanderOf(sailing).travel || sailing.tick === 0) {
    runTick(sailing);
    guard += 1;
    assert.ok(guard < 40, "the voyage must finish");
    if (!commanderOf(sailing).travel && sailing.tick > 0 && commanderOf(sailing).locationId === destination.id) break;
  }
  while (anchor.tick < sailing.tick) runTick(anchor);

  const spent = Number((moneyBefore.sailing - sailing.characters[id].money).toFixed(2));
  assert.equal(spent, destination.passageCost, "the purse must fall by the quoted passage and nothing else");
  assert.equal(anchor.characters[id].money, moneyBefore.anchor, "standing still must not charge a passage");

  const eaten = (before: number, world: WorldState) => Number((before - world.characters[id].cargo.provisions).toFixed(3));
  assert.equal(
    eaten(foodBefore.sailing, sailing),
    eaten(foodBefore.anchor, anchor),
    "provisions must burn at the same rate at sea and at anchor",
  );
});

test("a destination tax is public offshore, and a live price expires next tick", () => {
  const world = createPrototypeWorld(1847);
  const commander = commanderOf(world);
  const state = projected(world);

  for (const settlement of state.settlements) {
    const live = world.settlements[settlement.id];
    const expected = live.factionId ? world.factions[live.factionId].taxRate : 0;
    assert.equal(settlement.taxRate, expected, `${settlement.id} must publish its tax`);
    assert.equal(typeof settlement.taxRate, "number");
    if (settlement.id !== commander.locationId) {
      assert.equal(settlement.market, null, "a remote market is still not a quote");
    }
  }

  const remoteOwned = state.settlements.find((settlement) =>
    settlement.id !== commander.locationId && settlement.intelligence?.exact === true
  );
  assert.ok(remoteOwned, "an owned port the commander is not standing in");
  assert.equal(remoteOwned.priceQuote.live, true, "an owned board is the current price");
  assert.equal(remoteOwned.priceQuote.asOfTick, world.tick);
  assert.equal(remoteOwned.priceQuote.expiresTick, world.tick + 1, "a live price is only good for this tick");
  assert.equal(remoteOwned.intelligence.confidence, 1, "knowing the island exactly is not the same claim as the price lasting");
  assert.ok(remoteOwned.priceDrift, "a live own-faction board publishes its drift");
  for (const resource of RESOURCE_KEYS) {
    assert.equal(typeof remoteOwned.prices[resource], "number", "a live price stays one number, not a rumor/quote split");
    assert.equal(
      remoteOwned.priceDrift[resource],
      priceDriftPerTick(world, remoteOwned.id, resource),
      `${resource} drift must be the quiet tick, not a second price`,
    );
  }

  const remoteForeign = state.settlements.find((settlement) =>
    settlement.intelligence && settlement.intelligence.exact === false && settlement.intelligence.present === false
  );
  assert.ok(remoteForeign, "a foreign port known only by report");
  assert.equal(remoteForeign.priceQuote.live, false);
  assert.equal(remoteForeign.priceQuote.expiresTick, null, "an estimate is not given a one-tick expiry it did not earn");
  assert.equal(remoteForeign.priceDrift, null, "a report has an age, not a slope");
  for (const resource of RESOURCE_KEYS) {
    assert.equal(typeof remoteForeign.prices[resource], "number");
  }

  const here = state.settlements.find((settlement) => settlement.id === commander.locationId)!;
  assert.equal(here.market.quotedTick, world.tick);
  assert.equal(here.market.expiresTick, world.tick + 1);
  assert.equal(here.priceQuote.expiresTick, here.market.expiresTick);

  // Tax does not hide behind a missing report. Prices do.
  commander.knowledge = {};
  const bare = projected(world);
  const unreported = bare.settlements.find((settlement) => settlement.intelligence == null);
  assert.ok(unreported, "clearing hearsay must leave a settlement with no report");
  assert.equal(unreported.priceQuote, null);
  assert.equal(unreported.priceDrift, null);
  assert.equal(unreported.stocks, null, "unknown stock is null, not a board of zeros");
  assert.equal(unreported.prices, null, "unknown price is null, not a board of zeros");
  assert.equal(typeof unreported.taxRate, "number");
  assert.ok(unreported.taxRate >= 0);
});

test("a price report fades faster than a garrison report", () => {
  const world = createPrototypeWorld(1847);
  const commander = commanderOf(world);
  world.tick = GARRISON_FRESHNESS_TICKS;
  const belief = commander.knowledge.glassport;
  belief.observedTick = 0;
  belief.confidence = 1;
  belief.priceEstimate.arms = 14;
  belief.garrisonEstimate = 155;

  const price = believedPrice(world, commander, "glassport", "arms");
  const priceWeight = 0.08;
  assert.equal(price, round(14 * priceWeight + 5.6 * (1 - priceWeight), 2));
  assert.ok(PRICE_FRESHNESS_TICKS < GARRISON_FRESHNESS_TICKS);

  const garrison = believedGarrison(world, commander, "glassport");
  assert.ok(garrison.confidence > 0.3 && garrison.confidence < 0.45, `garrison confidence was ${garrison.confidence}`);
  assert.ok(price < 8, "a twelve-day-old price has fallen toward the prior, not stayed at 14");
});

interface RoundTrip {
  outbound: ResourceKey;
  homeward: ResourceKey;
  destinationId: string;
  outboundMargin: number;
  homewardMargin: number;
}

/** Per-unit margin after the destination's tax, ignoring cent rounding. */
function unitMargin(buyPrice: number, sellPrice: number, taxRate: number): number {
  return sellPrice * (1 - taxRate) - buyPrice;
}

function taxAt(world: WorldState, settlementId: string): number {
  const factionId = world.settlements[settlementId].factionId;
  return factionId ? world.factions[factionId].taxRate : 0;
}

/**
 * A route a merchant would actually consider: two different goods, each
 * cheaper at one end than the other after tax, starting from where the
 * commander is standing.
 */
function findRoundTrip(world: WorldState, originId: string): RoundTrip | null {
  let best: RoundTrip | null = null;
  const goods = RESOURCE_KEYS.filter((resource) => resource !== "provisions");
  for (const destination of Object.values(world.settlements)) {
    if (destination.id === originId) continue;
    for (const outbound of goods) {
      for (const homeward of goods) {
        if (outbound === homeward) continue;
        const outboundMargin = unitMargin(
          marketPrice(world, originId, outbound),
          marketPrice(world, destination.id, outbound),
          taxAt(world, destination.id),
        );
        const homewardMargin = unitMargin(
          marketPrice(world, destination.id, homeward),
          marketPrice(world, originId, homeward),
          taxAt(world, originId),
        );
        if (outboundMargin <= 0.5 || homewardMargin <= 0.5) continue;
        if (!best || outboundMargin + homewardMargin > best.outboundMargin + best.homewardMargin) {
          best = { outbound, homeward, destinationId: destination.id, outboundMargin, homewardMargin };
        }
      }
    }
  }
  return best;
}

function sail(world: WorldState, destinationId: string): void {
  const commander = commanderOf(world);
  if (commander.locationId === destinationId) return;
  const submitted = submitCommand(world, {
    playerId: PLAYER,
    type: "character-action",
    action: "travel",
    targetId: destinationId,
  });
  assert.equal(submitted.ok, true, submitted.ok ? "" : submitted.error);
  let guard = 0;
  do {
    runTick(world);
    guard += 1;
    assert.ok(guard < 40, "the voyage must finish");
  } while (commander.travel);
  assert.equal(commander.locationId, destinationId);
}

function tradeWhole(world: WorldState, action: "buy-resource" | "sell-resource", resource: ResourceKey): number {
  const commander = commanderOf(world);
  const direction = action === "buy-resource" ? "buy" : "sell";
  const quote = tradeQuote(world, commander, resource, direction, 10_000);
  const quantity = Math.floor(quote.maxQuantity);
  assert.ok(quantity >= 1, `${action} ${resource} must be able to move at least one unit (max ${quote.maxQuantity}, limited by ${quote.limitedBy})`);
  const submitted = submitCommand(world, {
    playerId: PLAYER,
    type: "character-action",
    action,
    resource,
    quantity,
  });
  assert.equal(submitted.ok, true, submitted.ok ? "" : submitted.error);
  runTick(world);
  return quantity;
}

test("a sensible round trip competes with working the same ticks", () => {
  const tradeWorld = createPrototypeWorld(1847);
  const workWorld = createPrototypeWorld(1847);
  const originId = commanderOf(tradeWorld).locationId!;
  const route = findRoundTrip(tradeWorld, originId);
  assert.ok(
    route,
    "the opening world must contain a two-way route from the commander's port",
  );

  const opening = projected(tradeWorld);
  const destination = opening.settlements.find((settlement) => settlement.id === route.destinationId);
  assert.ok(destination);
  assert.equal(destination.taxRate, taxAt(tradeWorld, route.destinationId));
  assert.equal(route.destinationId, "glassport", "the paced route is the taxed own-faction port, not a tax-free one");
  assert.equal(destination.taxRate, 0.14);

  const tradeStart = commanderOf(tradeWorld).money;
  tradeWhole(tradeWorld, "buy-resource", route.outbound);
  sail(tradeWorld, route.destinationId);
  tradeWhole(tradeWorld, "sell-resource", route.outbound);
  tradeWhole(tradeWorld, "buy-resource", route.homeward);
  sail(tradeWorld, originId);
  tradeWhole(tradeWorld, "sell-resource", route.homeward);

  const ticks = tradeWorld.tick;
  assert.equal(workWorld.tick, 0);
  assert.ok(ticks >= 4, "the round trip must have taken real time");
  const tradeNet = Number((commanderOf(tradeWorld).money - tradeStart).toFixed(2));

  const workStart = commanderOf(workWorld).money;
  for (let tick = 0; tick < ticks; tick += 1) {
    const submitted = submitCommand(workWorld, {
      playerId: PLAYER,
      type: "character-action",
      action: "work",
    });
    assert.equal(submitted.ok, true, submitted.ok ? "" : submitted.error);
    runTick(workWorld);
  }
  const workNet = Number((commanderOf(workWorld).money - workStart).toFixed(2));
  const tradePerTick = tradeNet / ticks;
  const workPerTick = workNet / ticks;

  assert.ok(
    tradePerTick >= workPerTick,
    `trading ${route.outbound} to ${route.destinationId} and ${route.homeward} home ` +
      `(margins ${route.outboundMargin.toFixed(2)} / ${route.homewardMargin.toFixed(2)}) ` +
      `earned ${tradeNet} in ${ticks} ticks (${tradePerTick.toFixed(2)}/tick), ` +
      `against working for ${workNet} (${workPerTick.toFixed(2)}/tick)`,
  );
});
