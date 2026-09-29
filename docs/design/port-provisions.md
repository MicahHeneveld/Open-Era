# Port provisions

**Status: Open.** Proposal for the owner to accept, change, or reject. Current code is `main` at `789e48f`, which includes the slope-10 surrender slide (`surrenderStabilityLimit` in `src/sim/state.ts`; M19) and fast population regrowth (`garrisonRegrowth` in `src/sim/engine.ts`, called from `produceSettlements`; M20). The runs below are that unmodified tree, except the three prototypes, which were reverted. This note is not decided until it moves into [world simulation](world-simulation.md).

Runs are `createPrototypeWorld` plus `runTick`, no player commands, seeds 1847 / 2718 / 4096, 1200 ticks, Node v24.21.0, ICU 78.3. Tick numbers on events are the `tick` field. The 72-tick hashes match `tests/fixtures/golden-hashes.json` (`d3b79fce…`, `03d6d4bc…`, `a7cbf2a8…`; 8338, 8411, 8298 events).

## The problem

[Landless faction](landless-faction.md) found Crown Harbor at stability 0 under Free Tide, provisions 0, demand 5. The shortage events are tick 777 (seed 1847, garrison 6, shortage 1.149), tick 858 (2718, garrison 9, shortage 1.145), and tick 823 (4096, garrison 13, shortage 1.147). After that the shortage sits at 1.15. M20 will not regrow a garrison while `shortage !== 0`, and `floor(shortage * 0.18)` is 0, so the soldier is not removed either. The question is why the granary fails, and whether stability 0 then locks the port.

## What feeds a port

`producedStocks` (`src/sim/engine.ts`) adds `production[resource] * focusMultiplier * workerCondition`. `workerCondition` is `0.7 + (stability / 100) * 0.3`. Focus is 1.25 or 1. The function does not read garrison, faction, tax, or cargo. `consumedStocks` sets provisions demand to `round(population / 3600, 3)` and shortage to the unmet part. The other goods use `localResourceUse` and cannot cut the garrison. A battle tick skips the settlement. A fed tick adds 0.03 stability. A short tick subtracts `shortage * 0.35` stability and `min(garrison, floor(shortage * 0.18))` garrison. `garrisonRegrowth` then adds one soldier only when `shortage === 0`, garrison is under `round(population / 70)`, and the tick is a positive multiple of `max(6, round(200000 / population))`.

Crown Harbor opens at population 18000, focus arms, provisions production 5.5, stock 220, garrison 260, stability 91. Demand is 5. Glassport is 4.1 provisions against demand 2.917, Cinder Key 3.2 against 1.778, Verdant Cay 9.5 with the provisions focus, so 11.875 unpenalized, against demand 2. Population has no writer under `src/`. An empty provisions shelf prices at `1.8 * 2.5 = 4.5`.

At stability 91 the Crown Harbor increment is `5.5 * 0.973 = 5.3515`. The calculated line where that product equals 5 is stability 69.697. At the claim floor of 55 it is `5.5 * 0.865 = 4.7575`. At stability 0 it is 3.85, and the empty-shelf shortage is 1.15. Glassport's calculated line is stability 3.821. Cinder Key at stability 0 still produces 2.24. Those lines are arithmetic from the constants. On seed 1847 every non-battle Crown Harbor tick matched the stability formula, 0 mismatches.

`buy-provisions` and `resolveTrade` (`trade-local`) both emit `market-trade`. A buy removes stock and pays no tax. A sale adds stock, and `tradeTax` takes `taxRate` only on a sale: World Government 0.14, Free Tide 0.08. Neither path reads the holder. `buildCandidates` will not buy provisions when `stocks.provisions < 1`.

## Measured on main

Eleven, eleven, and ten claims, the same counts as the landless note. Crown Harbor's claim is tick 502 (Finn Frost, `character-18`, Free Tide, garrison 6), tick 575 (Bram Tern, `character-22`, garrison 9), and tick 545 (Bram Tern, garrison 12). The upkeep on that same tick, before the claim overwrites it, has stability 24.011 / 35.603 / 41.68 and provisions 0. The claim writes `max(55, stability)`, so the port is set to 55. No second Crown Harbor claim. After 1200 ticks it is still Free Tide, stock 0, stability 0, garrison 6 / 9 / 13, price 4.5. Seed 4096 has gained one soldier since the claim and then stopped. Battle skips after the claim: 0, 0, 0. Shortage ticks after the claim: 690 of 697, 611 of 624, 636 of 654.

| Seed | Shelf first 0 | Stability falls through 69.697 | First shortage | Stability 0 |
| ---: | --- | --- | --- | --- |
| 1847 | tick 94, price 4.5 | tick 447, stock 0.232, garrison 73 | tick 451, shortage 0.01 | tick 777, shortage 1.149, garrison 6 |
| 2718 | tick 93, price 4.5 | tick 531, stock 0.639, garrison 61 | tick 538, shortage 0.102 | tick 858, shortage 1.145, garrison 9 |
| 4096 | tick 64, price 4.5 | tick 521, stock 0.413, garrison 54 | tick 529, shortage 0.047 | tick 823, shortage 1.147, garrison 13 |

| Seed | Before the claim, field / trade | After, field / trade |
| ---: | --- | --- |
| 1847 | +74.325 / −308.220 (buy 855.863 in 79, sell 547.643 in 45; 47 shortage ticks, 27 battle skips) | −644.551 / +5.510 (buy 420.122 in 56, sell 425.632 in 24) |
| 2718 | +90.290 / −317.994 (buy 774.323 in 96, sell 456.329 in 37; 36 shortage ticks, 30 skips) | −556.132 / +9.166 (buy 204.041 in 16, sell 213.207 in 12) |
| 4096 | +101.673 / −323.528 (buy 683.744 in 113, sell 360.216 in 33; 15 shortage ticks, 20 skips) | −593.986 / +18.425 (buy 390.415 in 80, sell 408.840 in 33) |

The shelf empties while World Government still holds the port. The crossing garrisons are 73, 61, and 54, above the raid gate. Production on the claim tick is in "before". Trades on that tick are in "after". Summed through the claim the fields beat the ration and purchases beat sales. The shortage ticks in that column are the end of the window. After the claim the fields fall short and trade is a small net inflow. Of the ticks after the claim, 7, 13, and 18 are fed. One of them, on seed 4096, is the soldier that makes garrison 13. `floor(1.15 * 0.18)` is 0, so the rest of the shortage removes nothing, and regrowth adds nothing. None of the three reach garrison 15.

Over the whole 1847 run, at Crown Harbor, Free Tide buys 341.173 (39) and sells 399.683 (31). World Government buys 502.311 (60) and sells 499.538 (29). Independents buy 432.501 (36) and sell 74.054 (9). The new holder is a net seller. The independents are the net buyers. Verdant Cay is where the provisions are: its stock never hits 0 (low 319.091 on the opening tick), and after 1200 ticks it is 4083.766 / 6474.588 / 3019.455, stability 100, garrison 103, the population ceiling. It emits no shortage. Glassport's first empty shelf is tick 184 / 43 / 27, Cinder Key's is 191 / 191 / 105, and neither emits `settlement-shortage`. Their minimum stabilities are 27.79, 32.44, 30.2 and 35.95, 32.78, 32.03. That is above Glassport's calculated line, and Cinder Key stays fed even at stability 0.

## Does stability 0 lock it

Stability 0 does not forbid a claim. `resolveSettlementClaim` sets stability to `max(CLAIM_STABILITY_FLOOR, stability)`. Surrender, in `resolveImmediateBattle` and `completeMajorBattle`, needs an attacker victory, garrison at most 15, and stability at or below `surrenderStabilityLimit`. At garrison 6 that limit is 80, so stability 0 passes. The raid does not. `buildCandidates` adds `raid` only when `settlement.garrison >= 15`. After the claim there are no battle skips and no raid `decision-made` against Crown Harbor. `validateCharacterAction` in `src/sim/commands.ts` has no garrison test, so a player can still order one. This run has no player commands. The autonomous port is not taken again.

A retake at the claim floor does not feed it. On seed 1847, at the end of tick 777, the port was copied, set back to World Government and `character-01`, surrender cleared, stability set to 55, and run 400 ticks. Tick 778 is shortage 0.242, stock 0, stability 54.915. Fed ticks at 836 and 880 move the garrison 6 to 7 to 8. Tick 898 is shortage 0.445. At tick 1178 it is stock 0, stability 0, garrison 8, still World Government. The same copy at stability 70 is fed on tick 778 (shortage 0, stock 0.005, stability 70.03) and gains a soldier every 11 ticks. A battle at garrison 14 on tick 869 cuts it to 6 and stability 60.76, and tick 872 claims it back for Free Tide at shortage 0.147. Seventy feeds the port until the next conquest. Fifty-five does not climb out.

## Candidates (proposal)

All three were local and reverted. The ration rule and the regrowth rule leave the 72-tick hashes and event counts on the fixture. The claim floor does not.

**A. Do not let the stability penalty cut provisions below the ration, and do not invent grain the fields do not have.** In `producedStocks`, provisions output is `max(penalized, min(unpenalized, demand))`, where `unpenalized` is `production.provisions * focusMultiplier` and `penalized` is that times `workerCondition`. Crown Harbor's unpenalized 5.5 is above demand 5, and the same is true of the other three ports (4.1, 3.2, and 11.875 against 2.917, 1.778, and 2). On these seeds the cap does not bind, so the measured run is the simpler prototype that replaced a short increment with the ration. A settlement whose production stat is 0 still shortages. That is the case `tests/economy.test.ts` already builds.

1200 ticks. No `settlement-shortage` on any port. Stability does not hit 0. The shelf can still read 0, because trade runs after the ration is eaten. Claims go from 11 / 11 / 10 to 15 / 18 / 17. Crown Harbor is claimed at 503, 576, and 562, garrison 7 / 11 / 9, and then again: six, seven, and seven Crown Harbor claims in all. Raids after the first of those: 9, 8, 10. The shortest gap between two Crown Harbor claims is 27, 74, and 67 ticks. After 1200 ticks the port is stock 0, stability 56.38 / 54.09 / 55.18, garrison 11 / 15 / 9, held by Toma Reef, Bram Tern, and Zara Gale. The extra claims are M20 working on a port that stays fed.

**B. Regrow when the shortage costs no soldier.** `garrisonRegrowth` returns 0 on a shortage only when `floor(shortage * 0.18) > 0`. Crown Harbor's shortage never reaches `1 / 0.18`, so on these seeds the rule is "regrow anyway". Hashes match the fixture. Shortage ticks stay 684 / 652 / 661, the first still 451 / 538 / 529. Claims 15 / 17 / 16. Raids after the first Crown Harbor claim: 10 / 10 / 10. Stability still falls between claims. Seeds 1847 and 2718 never reach stability 0; they end at 14.561 (garrison 13, stock 0) and 47.069. Seed 4096 touches 0 at tick 1191 and ends at 54.396 after a claim. The gate opens. The granary does not.

**C. Raise `CLAIM_STABILITY_FLOOR` from 55 to 70.** The hashes move to `092c0aa2…`, `fca574ca…`, `a7f493af…`, events 8338 / 8430 / 8289. Seed 1847 keeps 8338 events and the same tick, type, actor, settlement, and target sequence; the state hash still changes, because the tick-70 Cinder Key claim writes 70 instead of 55. Seed 2718 first differs at tick 59, seed 4096 at tick 61. Over 1200 ticks Crown Harbor still shortages on 1847 (249 ticks from 886; end stability 62.379, garrison 12, stock 0). Seed 2718 ends fed, stability 72.88, garrison 15, stock 0.306. Seed 4096 never claims it: unowned World Government, stability 100, garrison 210.

## Recommendation (proposal)

Take A, in `producedStocks`, which the published price drift already shares. No new event and no RNG draw. The shortage at this population cannot remove a soldier, cannot be climbed from stability 55, and cancels the regrowth M20 added. B reopens the gate and leaves the city hungry. C moves the fixture and still loses the port on 1847. M21 (party sightings), M22 (autonomous short-purse), and M23 (remnant) are queued. A changes no tick-72 payload, so it does not regenerate the fixture and does not need to ride with them.

## Tests and the golden fixture

The fixture already contains M19 and M20. A does not call `npm run golden:update`.

- `tests/economy.test.ts`, beside "a shortage gains no garrison, and a settlement at its population ceiling gains none". Crown Harbor at stability 55 and provisions 0 emits `settlement-upkeep`, shortage 0, increment 5. The same settlement at stability 91 keeps today's surplus increment. Verdant Cay with `production` zeroed and stock 0 still emits `settlement-shortage`. That existing assertion stays.
- `tests/economy.test.ts`, beside "a fed settlement under the ceiling gains one garrison on its interval tick and not the tick before". Crown Harbor's interval is 11. A fed tick on the interval gains one soldier. The tick before does not. A shortage that the cap cannot cover, the zeroed-production case, still gains none.
- `tests/agency.test.ts`, beside "a claimed port is not claimed or raided again while its garrison stays under 15". The 36-tick Cinder Key case stays: that port is already fed, and 36 ticks do not reach garrison 15. A Crown Harbor left at garrison 6 and stability 0, under the new rule, reaches 15 and a hostile autonomous raid is offered.
- `tests/combat.test.ts`. The M19 surrender case stays. The floor does not read `surrenderStabilityLimit`.
- `tests/golden.test.ts`. "pinned seeds reproduce their committed state hash and event count" stays green.

## Playtest

Follow `docs/playtests/TEMPLATE.md`. Dashboard HTTP JSON only, as in [informed-commitment-002](../playtests/informed-commitment-002.md). Seed 1847, Mara Vane (`character-01`), ticks 0–700, with rule A in. No survey, no raid, no trade. She is already at Crown Harbor.

**Hypothesis.** Crown Harbor changes hands and does not freeze at stability 0, and it changes hands again because the garrison climbed.

**Ambition.** Stay at Crown Harbor. At tick 520, read the port. At tick 700, read it again.

**Success.** The log has a `settlement-claimed` for `crown-harbor` at tick 503, garrison 7, and another by tick 700 (measured tick 660). At tick 520 stability is above 0. The panel is the live port, because she is standing on it.

`PROMOTE` if both claims are in the log and tick 520 is not stability 0. `REVISE` if two Crown Harbor claims land inside one garrison interval of 11 ticks, or if the shelf being 0 is presented as a shortage. `ABANDON` if tick 700 still has one Crown Harbor claim and stability 0.

## The idle commander

Not the proposal. The Engineer is looking at a player character who reaches morale 0 and health about 59.66 over 150 ticks while holding 108 money. That character is Mara on seed 1847.

She opens at Crown Harbor with money 108, provisions 36, morale 93, health 100, 17 sailors, and 80 troops. `provisionDemand` is `round(0.12 + sailors * 0.008 + troops.count * 0.004)`, which is 0.576. `runTick` skips `buildCandidates` when `controller.kind === "human"`, and this run queues no command, so she never selects `buy-provisions`. Anchored upkeep does not touch the purse. The hold is empty on tick 62. Morale is 0 on tick 131. After 150 ticks, world tick 150, she has money 108, provisions 0, morale 0, health 59.663, still at Crown Harbor.

While the hold covers the demand, morale gains 0.04 a tick and health is unchanged. Once it does not, `upkeepCharacter` subtracts `shortage * 2.4` morale and `shortage * 0.8` health. Health is clamped at 1. The market is not the reason she misses the purchase: Crown Harbor's shelf first hits 0 on tick 94, thirty-two ticks after her hold is empty, and she has more than 2 money the whole way. `buy-provisions` would have been legal. She does not act.

The other two seeds are the same shape with different opening rolls. After 150 ticks the 2718 commander has money 118, morale 0, health 57.717, hold empty since tick 42. The 4096 commander has money 134, morale 0, health 51.319, hold empty since tick 47. Rule A does not move these figures. Party upkeep does not read the settlement's fields, and an idle human never buys them.
