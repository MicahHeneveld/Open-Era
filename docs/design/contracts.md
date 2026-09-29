# Contracts

**Status: Open.** Proposal for the owner to accept, change, or reject. Current code is `main` at `75704de`, which includes the slope-10 surrender slide (M19), fast garrison regrowth (M20), and party sightings (M21). The runs below are that unmodified tree. One local guard on `issue-order` was applied to measure the fixture and then reverted. This note is not decided until it moves into [world simulation](world-simulation.md) or [autonomous characters](autonomous-characters.md).

Runs are `createPrototypeWorld` plus `runTick`, no player commands, seeds 1847 / 2718 / 4096, Node v24.21.0, ICU 78.3. Tick numbers on events are the `tick` field. The 72-tick hashes match `tests/fixtures/golden-hashes.json` (`d3b79fce…`, `03d6d4bc…`, `a7cbf2a8…`; 8338, 8411, 8298 events). Long runs are 1200 ticks.

## What already behaves like a contract

Nothing in `src/` is a contract. The [roadmap](../roadmap.md) still lists structured negotiation as untracked. Five mechanisms already bind people, or look as if they do.

**Standing orders.** `StandingOrder` is what the sim enforces. `orderFor` (`src/sim/scenario.ts`) writes one at creation for every faction member except the two leaders: id `${issuerId}:order:${character.id}`, status `pending`, no event. World Government orders come from `character-01`, Free Tide from `character-14`. Merchants get `trade-supplies`, explorers `explore`, the one Free Tide raider `pressure` on `world-government`, and the rest `protect` on the faction port. Twenty orders on every seed (5, 4, 10, 1). The leaders and `character-23`–`character-30` hold none.

`assessStandingOrder` (`src/sim/agency.ts`) scores priority, loyalty, trust, respect, alignment, obligation, grievance, and caution times a fixed risk: 0.38, 0.88, 0.25, 0.34 for protect, pressure, trade-supplies, explore. Threshold `0.54 + ambition * 0.08`. `activeStandingOrder` keeps pending and active orders, highest priority, then id. `recordOrderAssessment` accepts or refuses once, while pending. `updateOrderAdherence` emits deviation and resumption. `judgeOrderCompletion` asks the issuer to close it: protect after a day on the target, pressure after a victory against that faction or a claim that takes it, trade-supplies after one `market-trade`, explore after a direct look. The judgment draws `rng.between(-0.04, 0.04)`. Only the player command `confirm-order` closes it. `amend-order` and `cancel-order` address an id. A change of directive or target returns the order to pending.

**Debts.** `DebtObligation` is a creditor faction, two values, a tick, and reason `prisoner-release`. `processCaptivityDeadlines` is the only writer. Fourteen days after capture (14 × 6 ticks) cash on hand is paid and the remainder is pushed from `captivity-released`. Escape writes none. Nothing reads `remainingValue` again. No repayment event, no default event, and no write to `relationship.obligation`. The design text wants a broken debt to scar reputation. There is no reputation stat.

**Relationships.** Trust, affinity, respect, fear, grievance, obligation. The order score reads four of them. Writes are the seed, `evolveLocalRelationship`, and `recordBattleConsequences` when the fighter already has a tie to an order's issuer. Victory under orders: trust `+0.012`, respect `+0.028`, fear `−0.005`, grievance `−0.006`, obligation `−0.01`. Defeat: trust `−0.025`, respect `−0.008`, fear `+0.018`, grievance `+0.035`, obligation `+0.015`. Accept, refuse, and deviate do not emit `relationship-changed`.

**Messages.** `createConversationThread` and `sendConversationMessage` back `POST /api/threads` and `POST /api/messages`. `classifyMessage` can tag `trade` or `request`. The reply stores `discardedActionCount` and does not submit `proposedActions`. Asking for a delivery in prose creates no obligation.

**Trade.** `buy-resource` and `sell-resource` store `unitPrice`, and `resolveDecision` charges that quote. `buy-provisions` and `trade-local` (`resolveTrade`) emit `market-trade` the same tick. Sales pay `tradeTax`; buys do not. `trade-supplies` completes on any one of those events, with no good, quantity, or destination shelf. [Port provisions](port-provisions.md) is the gap: Crown Harbor's fields fall behind the ration, Verdant Cay never empties, and no order carries grain across.

## One command, two orders

[hidden-state-visibility-001](../playtests/hidden-state-visibility-001.md) recorded two standing orders from one `issue-order`: `character-01:order:character-13` and `command-00001:standing-order`. [progress.md](../progress.md) leaves it open until the identity is decided. Reproduced on seed 1847.

Ada Sorn (`character-13`, explorer) starts at Crown Harbor with `character-01:order:character-13`, explore, no target, priority 0.78, pending. Mara issues explore, target `cinder-key`. `validateStandingOrder` checks faction, directive, target, priority, and duration. It does not read `standingOrders`. `processPlayerCommands` always builds id `${command.id}:standing-order` and emits `standing-order-issued`. `applyEvent` pushes.

`activeStandingOrder` keeps both and sorts by priority, then `localeCompare`. At the default 0.78 the seeded id sorts first (`h` before `o` in the second character).

| Tick | What the log shows |
| ---: | --- |
| 0 | `command-00001:standing-order` is issued. The seeded order is accepted. She sails for Glassport under that id. |
| 4 | She reports the Glassport survey complete. That order is `awaiting-confirmation`. |
| 5 | The command order is accepted. She sails for Cinder Key. |
| 8 | She reports the Cinder Key survey complete. |

Both end `awaiting-confirmation`. At priority 0.95 the command order is accepted at tick 0 and reports at tick 5; the seeded order is accepted at tick 6 and reports at tick 9. The completion report drops the winner out of `activeStandingOrder`, and the next review takes the one that was waiting.

`tests/commands.test.ts` ("a delivered standing order immediately enters autonomous plan review") tells Sable Morrow (`character-04`) to protect Glassport at 0.97. She already holds protect Crown Harbor at 0.78. The new id becomes active; the seeded order is still pending at tick 12 and refused at tick 24. Headless, that protect score is 0.595 against 0.616 and refuses at tick 0. The test never checks that she holds one order.

## What makes two orders the same order

The id is the identity, and each writer mints its own, so the scenario id and the command id never compare equal. `orderMutationPending` refuses a second queued mutation of one id and has no rule for two ids. Standing orders need the same rule the contract will use.

An open order is one issuer and one recipient, in `pending`, `active`, or `awaiting-confirmation`. A further `issue-order` amends that id. Directive or target is the major change `validateOrderAmendment` already computes: status returns to pending and the plan is cleared. Priority or deadline alone keeps acceptance, the revision-3 case in [human-commander-004](../playtests/human-commander-004.md). Identical terms are the existing `no-change` rejection. Cancel and confirm keep that id. A new id is minted only after the previous order is `refused`, `completed`, `expired`, or `cancelled`.

## The first contract: a paid supply run

One type: pay a carrier to land provisions on a named shelf by a deadline. `trade-supplies` never names that delivery. The port-provisions fields stay as they are.

**Terms.** Buyer, carrier, good (`provisions` only), quantity from 1 to 200 (`tradeQuantity`), destination settlement, deadline from 1 to 720 ticks (the order-duration bound), and a price. One open contract per buyer and carrier. The id is minted once from the command.

**The offer.** `offer-contract` sits beside `issue-order`: known identity, carrier autonomous, not captive, not in battle, not traveling. Faction is not required. A second offer while `offered` amends the id and asks for a new score. After `accepted` the terms are frozen. Cancel addresses the id.

No autonomous proposer here. Replies drop `proposedActions`, and these runs open no thread. A proposer keyed on an empty shelf would fire inside the fixture: Crown Harbor is empty from tick 64 on seed 4096. That version rides with the re-baseline.

**The score.** Deterministic. No new RNG draw. Hard gates on the carrier's tick. A carrier already at sea, or with no `locationId`, refuses with gate `travel` and the reason `The carrier is already at sea.` before any score. `travelDuration` returns 1 when `locationId` is null, and that 1 is not the voyage; there is no provisions price at sea, so that path must not reach the margin. A docked carrier whose haul does not fit the ticks left refuses with the same gate and `The voyage does not fit the deadline.` Already standing at the shelf is 0 ticks, not `travelDuration`'s floor of 2. If the hold is short and the purse cannot buy the shortfall at `marketPrice` where they stand, refuse with gate `purse`. Those emit `contract-refused` with the gate and do not touch a relationship. Scoring is reached only while they are standing. `resourcePrice` clamps scarcity to at least 0.55 against a provisions base of 1.8, so that price is at least 0.99 and `costBasis` is positive for every quantity of at least 1.

Past the gates the weights match `assessStandingOrder`, including its missing-relationship defaults (trust 0.35, respect 0.35, grievance 0, obligation 0). Risk is 0.25 when they already stand at the destination or it is neutral or theirs, and 0.88 when the haul sails to another faction's port. Those are the trade-supplies and pressure risks. Margin is new: `costBasis = quantity * marketPrice` where they stand, clamped to −0.25..0.25. Commerce weighs 0.30 because a contract has no order priority.

```
commerce      = round(commerce * 0.30)
margin        = round(clamp((price - costBasis) / costBasis, -0.25, 0.25))
trust         = round(trust * 0.14)
respect       = round(respect * 0.16)
grievance     = round(-grievance * 0.18)
obligation    = round(obligation * 0.08)
perceivedRisk = round(-caution * risk * 0.16)
score         = round(clamp(sum, 0, 1))
threshold     = round(0.54 + ambition * 0.08)
```

`round` is the three-digit helper in `src/sim/state.ts`. Accept when `score >= threshold`.

Applied to tick 0 of seed 1847, this is arithmetic on the opening state, not an event the sim emitted. Zara Gale (`character-17`, Free Tide merchant) stands at Crown Harbor with 32 provisions, money 93, commerce 0.894, ambition 0.265, caution 0.496, and a seeded tie to Mara (trust 0.665, respect 0.693, grievance 0.123, obligation 0.210). Provisions are 1.47. Ten units at price 18 have cost basis 14.7 and margin 0.224. Factors 0.268, 0.224, 0.093, 0.111, −0.022, 0.017, −0.020. Score 0.671 against 0.561: accept. Price 8 clamps the margin at −0.25 and scores 0.197: refuse.

**Escrow.** The price leaves the offerer's purse when the offer is applied, not when the command is queued and not again when it is accepted. Debiting only on accept, then returning nothing on a refusal, would destroy the coins sitting in escrow, so refusal, cancel, and breach each return that escrow once. It sits on the contract, in neither purse and not in a treasury. The event carries both purses the way `market-trade` carries `characterMoney`. Fulfilment pays the carrier from that escrow, once. Refusal, cancel while offered, cancel after accept, and carrier breach return it to the buyer, once. A score refusal and a cancel while offered write no relationship. A `DebtObligation` would not collect it: the runs below never reduce `remainingValue`.

**Fulfilment and breach.** `contract-fulfilled` requires `accepted`, the carrier at the destination and not traveling, the tick before the deadline, and a hold that covers the quantity. The grain moves onto `settlement.stocks.provisions`. No `market-trade`, no `tradeTax`. Nine against ten does not count, and there is no remainder. At `world.tick >= deadlineTick`, the same test `expireStandingOrders` uses, the contract is `breached`, the grain stays aboard, and the escrow returns. No RNG on either judgment.

**Relationships.** Fulfilment writes the victory deltas on both sides. Breach, and a buyer cancel after accept, write the defeat deltas. A missing side starts from the `evolveLocalRelationship` defaults. A score refusal writes nothing.

## Measured on main

Twenty orders at tick 0, then none issued, confirmed, expired, amended, or cancelled through tick 1200. Every acceptance and refusal is tick 0. Nothing confirms them: the World Government issuer is the idle human, and Free Tide has no confirm path. Every accepted order ends `awaiting-confirmation`, except one.

| Seed | Accepted | Refused | Reported complete | Deviated / resumed at 1200 |
| ---: | ---: | ---: | ---: | --- |
| 1847 | 14 | 6 | 14 | 26 / 26 |
| 2718 | 14 | 6 | 14 | 34 / 34 |
| 4096 | 16 | 4 | 15 | 164 / 164 |

Accepted then refused, by directive. Trade-supplies 4/1, 4/1, 5/0. Explore 2/2, 3/1, 3/1. Protect 7/3, 6/4, 7/3. Pressure 1/0 on every seed: Esme Dusk, `character-19`, from Pax Ash, target `world-government`. Explore and trade-supplies never deviate. Protect deviations are 17, 13, and 6, and those counts have stopped by tick 400. Pressure deviations at 1200 are 9, 21, and 158. She reports complete at 93 and 155 on the first two seeds, after attacker victories. On 4096 she has no attacker victory and no claim, and the order is still `active`.

The 72-tick fixture holds 13, 12, and 14 of those completion reports. Later ones are Esme on 1847 and 2718, and one protect each on 2718 (tick 96) and 4096 (tick 103). Refusals sit close to the line: Vale Drake's explore is 0.583 against 0.591; Mina Vale's protect on 2718 is 0.471 against 0.591.

| Seed | Captures, 72 / 400 / 1200 | Releases at 1200 | Created a debt | Paid in full | Still held |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1847 | 0 / 3 / 5 | 5 | 3 | 2 | 0 |
| 2718 | 1 / 5 / 10 | 8 | 3 | 5 | 2 |
| 4096 | 2 / 7 / 13 | 12 | 11 | 1 | 1 |

No release falls inside 72 ticks. First debt ticks are 225, 185, and 145. Originals run from 3.80 (Pax Ash, seed 2718, after 114.35 of a 118.15 demand) to 513.08 (`character-09`, seed 4096). On all 17 rows, `remainingValue` equals `originalValue`. Repayments: 0. Defaults: 0. Escapes: 0. Threads, messages, scheduled replies, and `conversation-*` events: 0 at 72, 400, and 1200.

`market-trade` over those 1200 ticks: 4964, 4704, 5503, all spot fills. The offer has to be a command: nothing opens a thread, and a debt row would keep `remainingValue` equal to `originalValue`, as these 17 do.

## Who can see it

Tiers are the reconnaissance set: self, co-located, faction, distant. Unknowns are null. The record carries `observedTick` of the last status change, and a source.

The parties see quantity, price, escrow, destination, deadline, status, and revision (`own-character`, age `tick - observedTick`).

A faction mate of either party sees the two ids, the destination, the deadline, and the status. Price, quantity, and escrow are null. Source `faction-report`. `visibleStandingOrders` shows an order only to its holder and its issuer, which is why Mara sees her seeded orders and not Pax Ash's order on Zara.

A bystander gets no contract row. Co-located money stays exact, so the purse drop is visible the way any purse is. Distant characters get no row. `eventPayloadVisible` uses the standing-order rule with the two parties in the issuer's place. Holding the destination does not open the payload.

**Anti-leak test.** `tests/redaction.test.ts`, beside "only the commander's own orders are projected". A distant commander has no row. A faction mate sees status and destination, with price, quantity, and escrow null, and editing the price does not change that JSON. A co-located rival has no row even when the character projection shows live money. The event payload stays withheld from anyone who is neither party, including the faction that holds the destination.

## Hash impact

The fixture already contains the tick-0 acceptances and refusals, the deviations, and those 13 / 12 / 14 completion reports. It contains no debt and no message. Changing `assessStandingOrder` or `judgeOrderCompletion` would move those events. This slice does not.

An autonomous offer would. Seed 4096's Crown Harbor shelf is empty from tick 64, inside the window. That proposer rides with M22, the autonomous short purse, which is the re-baseline already queued.

The player verb and the identity rule do not. A reverted guard in `validateStandingOrder` returned `order-already-open`, left Ada on the seeded id, and kept the hashes at `d3b79fce…`, `03d6d4bc…`, `a7cbf2a8…` (8338 / 8411 / 8298). Amend is that same command path. It stays out of the M22 diff, and it does not call `npm run golden:update`.

## Tests

- `tests/commands.test.ts`, beside "a delivered standing order immediately enters autonomous plan review". After the Glassport issue, Sable holds one open order: the seeded id, revision 2, target `glassport`. No `command-00001:standing-order`. An issue that changes nothing is `no-change`.
- `tests/agency.test.ts`, beside "accepted orders report temporary deviations, resumptions, and completion judgments". Zara accepts price 18 and refuses price 8 at the factors above, and the second call does not advance the rng. Fulfilment of 10 adds 10 to Crown Harbor, pays her from escrow, and emits no `market-trade`. A hold of 9 does not fulfil. A passed deadline returns the escrow and writes the defeat deltas.
- `tests/redaction.test.ts`. The anti-leak test above.
- `tests/conversations.test.ts`. A message that asks for a delivery leaves `proposedActions` unsubmitted and creates no contract.
- `tests/economy.test.ts`. The shortage cases stay. Fulfilment is not production, and a headless Crown Harbor run still has no contract event.
- `tests/golden.test.ts`. "pinned seeds reproduce their committed state hash and event count" stays green.

## Playtest

The operator plan is [offer-contract-001](../playtests/offer-contract-001.md). It has not been run. The order-identity playtest (Ada, one order, no escrow) is a different session and is not this run.

Measured on this branch against the dashboard HTTP API, seed 1847, Node v24.21.0, before a blind operator plays it. The note's older table (Glassport then Cinder Key by tick 8, Zara still on 93 when the grain moves) is not this world. Scoring waits one tick, so a new offer is still `offered` after the first advance. Zara trades on her own during that tick, and she sails on the tick she delivers, so her purse after fulfilment is on the event, not on her character row.

**Hypothesis.** Paying for a delivery takes the price into escrow when the offer is applied. A price Zara accepts lands 10 provisions on Crown Harbor and pays her from that escrow, once. A price Orin refuses returns his escrow, once, and does not pay him.

**Start.** `npm run dashboard -- --reset --seed 1847`. The server listens on `http://127.0.0.1:4317`. `playerId` is `prototype-player`. Advance with `POST /api/advance` and `{"ticks":1}` (never more than 144). Read contract events from that response. Page older history with `GET /api/state?limit=200&beforeSequence=<eventPage.cursor>`.

Send Orin's offer first, then Zara's. A second Zara offer before the tick is HTTP 400 `contract-already-queued`, error `An offer to this carrier is already queued`. After the first advance, repeating Zara's terms with `expiresInTicks` 11 is HTTP 400 `no-change`, error `The offer does not change the contract`. State tick 1: Mara's money is 82, both contracts are `offered`, escrows 8 and 18. State tick 2: Orin is `refused` and the 8 is back, Zara is `fulfilled`, Mara's money is 90, Crown Harbor provisions are 236.008, and that advance contains no `market-trade`.

`PROMOTE` if those purses, escrows, the shelf, and the two contract ids match. `REVISE` if Zara is paid before the grain moves, if Orin's 8 stays out of Mara's purse, if the shelf does not gain 10, or if a `market-trade` is the delivery. `ABANDON` if `offer-contract` is `unknown-type`, or if the offer never leaves the purse and never changes the shelf. The exact bodies and readings are in the playtest file.

## Questions for Micah

1. **You give an officer a new job while they still have your old one. What happens?** Default: the new job changes the old one. Two jobs from you at once do not stick.
2. **Can you pay someone from another faction to haul grain?** Default: yes, if you know them. Orders stay inside your faction. Buying at a market already crosses it.
3. **They deliver some of the grain, not all of it. Does that count?** Default: no. The whole amount by the deadline, or the money comes back.
4. **You cancel after they agreed. Do they keep any money?** Default: no. It comes back, and trust falls by the amount a lost fight already costs.
5. **Should captains offer these hauls on their own?** Default: no. They offer when you ask. Offers on their own would change the test world's recorded history, and that belongs with the purse work already queued.
6. **Does the port tax a delivery between two people?** Default: no. Tax stays on market sales.
7. **Who sees the price?** Default: the two people see the price and the amount. Their factions see that a job exists, where it goes, and whether it was kept. Someone beside them sees purses, as today. Everyone else sees nothing.
