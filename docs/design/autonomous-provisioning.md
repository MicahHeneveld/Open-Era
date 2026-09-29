# Autonomous provisioning

**Status: Open.** Proposal for the owner to accept, change, or reject. Current code is `main` at `08a3fd377d75dc4e18f99f174fce39733ad61a98`. The variants below were patched in a local harness and taken back out. No source change is in this commit. This note is not decided until it moves into [world simulation](world-simulation.md). It follows [battle morale](battle-morale.md): M29, the outscore rule, is accepted and not built, and M28, the landless raid floor of 8 with no claim deposit, is accepted and not built and lands first.

Runs are `createPrototypeWorld` plus `runTick`, no player commands, seeds 1847 / 2718 / 4096, 1200 ticks, Node v24.21.0, ICU 78.3. Tick numbers on events are the `tick` field. A figure at tick 400 or tick 1200 is the world after that many `runTick` calls (`world.tick === 400` or `1200`). `npm test` on this tree passes, 198 tests. The 72-tick hashes match `tests/fixtures/golden-hashes.json`:

| Seed | State hash | Events |
| ---: | --- | ---: |
| 1847 | `8e081fb09f0a73c29a8ca37581552f31ad8906fe5889fe4805dcf855e97f954a` | 8301 |
| 2718 | `64e843281dcb0733918fa72393a71f25ed36bdc40ae4d56e320c7461fca91538` | 8516 |
| 4096 | `b85a681050e4e21c96ea69dab9677565253641dae0bc26ca1b230996076e81d6` | 8031 |

That is the fixture after M27. The hashes named from the earlier tree, `d7eb02eb…` / `d0b4b449…` / `d5d9da8b…` with 8275 / 8489 / 8003 events, are not this tree. Unmodified event counts at 400 and 1200 ticks are 49291 / 162328, 50352 / 166091, and 49121 / 162588. Tick-400 power is 3276.92 / 1668.52, 2988.03 / 1853.79, and 3053.99 / 1349.41, World Government then Free Tide. The upset rows and the Free Tide portless stretches match the lists in [battle morale](battle-morale.md). Verdant Cay stays neutral on every row in this note.

## The problem

[Battle morale](battle-morale.md) found the majors the weaker side wins. On this tree those majors are still there: 8, 5, and 8 defender victories whose attacker score is higher. Every one of them is a major, and every one of them ends on the morale test (morale ≤ 12, troops at least 8, health above 15, garrison not 0). The first are event ticks 550, 620, and 298. Seven of the twenty-one are fed at the upkeep on that tick. The rest have an empty hold.

The shelves those crews are standing on are empty because a captain's own `buy-provisions` can take the whole board. `marketDepth` is `round(targetStocks.provisions * 0.16, 3)`. Every port's target is 180, so the cap is 28.8. The player's quote uses it. The autonomous top-up does not. On these runs the purchases that take a faction port from a shelf of at least 1 to a shelf under 1 are 1663, 2002, and 2146. Of those, 1663, 1999, and 2143 are `buy-provisions`. The other 0, 3, and 3 are `trade-local`. The first crossing on each faction port is one `buy-provisions`, and every quantity is under 28.8:

| Seed | Port | Tick | Buyer | Quantity | Shelf after |
| ---: | --- | ---: | --- | ---: | --- |
| 1847 | Glassport | 87 | Jun Ash | 11.599 | 0 |
| 1847 | Crown Harbor | 98 | Sable Sorn | 26.8 | 0 |
| 1847 | Cinder Key | 192 | Jun Marrow | 3.351 | 0.705 |
| 2718 | Cinder Key | 44 | Kessa Calder | 7.321 | 0 |
| 2718 | Glassport | 67 | Jun Ash | 19.939 | 0 |
| 2718 | Crown Harbor | 89 | Ada Sorn | 8.351 | 0 |
| 4096 | Crown Harbor | 61 | Bram Quill | 9.194 | 0 |
| 4096 | Glassport | 68 | Niko Crow | 20.907 | 0 |
| 4096 | Cinder Key | 93 | Toma Hale | 20.89 | 0 |

Buys larger than 28.8 do happen: 60, 79, and 95 of them, and the largest single fill is 139, 135.75, and 121.144. Those are deep boards. Verdant Cay's shelf is never 0 and never under 1. The port's own fields are not what empties the faction ports. `settlement-shortage` is emitted 0 times, on every variant below, on every seed. `producedStocks` still covers the ration. End-of-tick readings with provisions exactly 0 are 274 / 487 / 837 at Crown Harbor, Glassport, and Cinder Key on 1847, 380 / 545 / 995 on 2718, and 449 / 518 / 967 on 4096. Readings under 1, which is the purchase gate, are 1044 / 957 / 1005, 1049 / 1094 / 1095, and 1088 / 1011 / 1083 on those three ports.

## The code

`marketDepth` in `src/sim/engine.ts` is `MARKET_DEPTH_FRACTION` (0.16) times `targetStocks`. `tradeQuote` caps a player buy by that depth, and the player path in `resolveDecision` (`buy-resource`) does the same. `resolveTrade`, which is what `trade-local` calls, also caps by `marketDepth`.

`buy-provisions` does not. In `resolveDecision` the quantity is `min(desired, settlement.stocks.provisions, money / price)`, with `desired` equal to `provisionResupplyTarget` minus the hold. `provisionResupplyTarget` is `28 + troops.count * 0.25`. There is no depth term and no reserve term. `buildCandidates` scores that action at −1000 when `stocks.provisions < 1` or money is under 2. That is the whole purchase gate. [World simulation](world-simulation.md) already records the gap: the one-click provisions top-up is still not depth-capped.

`upkeepCharacter` eats the hold. It does not read the port. A shortage drains `shortage * 2.4` morale, clamped at 0. Rest adds 3. A crew that upkeep has put at 0 and that then rests is at 3, and the next hungry upkeep puts them under 12 again.

`resolveBattlePhase` ends a major when morale is at most 12, among other tests. The attacker wins that major only when the garrison is 0, or troops are at least 8 and health is above 15 and morale is above 12 and the phase wins say so. `completeMajorBattle` calls `attemptCapture` on a loss. `attemptCapture` draws once, `rng.next()`, and that draw is the one M29 keeps and ignores.

The landless gate is the `settlement.garrison >= 15` test in `buildCandidates`. M28 replaces it, for a faction that holds no settlement, with `garrison >= 8`. No claim deposit.

## What was measured

An upset is a major `battle-resolved` (the event carries `battleId`) whose outcome is `defender-victory` and whose attacker score is higher. That is the weaker side winning. Immediate battles decide by the score, so they cannot be this upset. Attacker victories with a lower attacker score were 0 on the baseline and on every stack below.

Morale-0 crew-ticks count `character-upkeep` events whose morale field is 0. That is the morale after eating and before the action. Captives and characters already in a battle are not upkept, so they are not in the count.

Shelf-empty ticks are end-of-tick readings with `stocks.provisions === 0`. The purchase gate is `< 1`. Where those two counts differ, both are named. Verdant Cay is 0 empty and 0 under 1 on every row, and it is left out of the empty column.

Starvation ticks count `character-upkeep` events with `shortage > 0`. Starvation events are `settlement-shortage`. That event count is 0 on every row. Claims are `settlement-claimed`. Every claim on every row changes the faction, so the conquest count is the claim count.

A floor variant refuses autonomous provision purchases that would leave the shelf below the floor. That is `buy-provisions` and the buy branch of `resolveTrade` when the good is provisions. The player's `buy-resource` path is unchanged, and these runs queue no player command. No variant adds an event type or an RNG draw, except M29, which spends the capture draw it would have spent on the loss and ignores the result.

**Baseline.** Today's `buy-provisions`.

**A. Depth cap.** The same `marketDepth` the player and `trade-local` already use, added to the `min` in `buy-provisions`. The cap is 28.8 for provisions.

**B. Reserve floor.** Autonomous buyers cannot take the shelf below the floor. Three floors, each taken from a number the code already uses:

- **1.** `buildCandidates` already refuses `buy-provisions` when the shelf is under 1. Leaving 1 keeps that gate open for the next captain.
- **One meal.** `round(population / 3600, 3)`, the ration `consumedStocks` eats. Crown Harbor 5, Glassport 2.917, Cinder Key 1.778, Verdant Cay 2.
- **One day of meals.** That ration times `ticksPerDay` (6). Crown Harbor 30, Glassport 17.502, Cinder Key 10.668, Verdant Cay 12. Crown Harbor's day floor is above the 28.8 depth cap.

**A+B.** The depth cap and each floor together.

**C. One day of the party's own eating.** `buy-provisions` quantity is also capped at `provisionDemand(character) * ticksPerDay`. `trade-local` is unchanged, so it can still clear 28.8. This is a per-purchase cap, not a limit of one purchase per day.

**D. One `buy-provisions` per world day.** If that character already bought provisions on a tick in the same `floor(tick / ticksPerDay)`, `buildCandidates` scores the action at −1000. The day is remembered in the harness, not on the character, so the world hash moves only when a decision or a later state changes. A field stored on the character would move the hash as soon as it was written.

## Comparison

Empty is Crown Harbor, Glassport, then Cinder Key, each the count of ticks at exactly 0. Ports are Free Tide's faction ports.

| Rule | Seed | Upsets | Morale-0 | Empty | Starvation ticks | Claims | Ports at 400 | Ports at 1200 |
| --- | ---: | ---: | ---: | --- | ---: | ---: | --- | --- |
| Baseline | 1847 | 8 | 9752 | 274 / 487 / 837 | 18376 | 13 | Cinder Key, Glassport | none |
| Baseline | 2718 | 5 | 9749 | 380 / 545 / 995 | 18424 | 12 | Glassport | Crown Harbor |
| Baseline | 4096 | 8 | 10514 | 449 / 518 / 967 | 17738 | 9 | Glassport | none |
| A, depth | 1847 | 11 | 11063 | 426 / 498 / 835 | 20647 | 13 | Cinder Key, Glassport | Cinder Key, Crown Harbor |
| A, depth | 2718 | 15 | 8639 | 665 / 547 / 981 | 17428 | 15 | Glassport | Cinder Key, Crown Harbor |
| A, depth | 4096 | 5 | 11526 | 437 / 549 / 946 | 19073 | 10 | Glassport | Glassport |
| B, floor 1 | 1847 | 1 | 18735 | 0 / 0 / 0 | 25300 | 9 | Cinder Key, Glassport | Cinder Key, Glassport |
| B, floor 1 | 2718 | 0 | 18611 | 0 / 0 / 0 | 25831 | 13 | Glassport | none |
| B, floor 1 | 4096 | 3 | 18725 | 0 / 0 / 0 | 25384 | 12 | Glassport | Cinder Key |
| B, one meal | 1847 | 3 | 18413 | 0 / 0 / 0 | 24847 | 9 | Cinder Key, Glassport | Cinder Key, Glassport |
| B, one meal | 2718 | 0 | 18396 | 0 / 0 / 0 | 25553 | 13 | Glassport | none |
| B, one meal | 4096 | 0 | 19967 | 0 / 0 / 0 | 27126 | 12 | Cinder Key, Glassport | Cinder Key |
| B, one day | 1847 | 1 | 18104 | 0 / 0 / 0 | 24012 | 7 | Cinder Key, Glassport | Cinder Key, Glassport |
| B, one day | 2718 | 0 | 19064 | 0 / 0 / 0 | 25950 | 10 | none | Glassport |
| B, one day | 4096 | 0 | 19222 | 0 / 0 / 0 | 26106 | 8 | Cinder Key, Glassport | Cinder Key |
| A+B, floor 1 | 1847 | 2 | 18419 | 0 / 0 / 0 | 25393 | 10 | Cinder Key, Glassport | Glassport |
| A+B, floor 1 | 2718 | 2 | 17637 | 0 / 0 / 0 | 23876 | 11 | Glassport | none |
| A+B, floor 1 | 4096 | 3 | 19255 | 0 / 0 / 0 | 26377 | 12 | Cinder Key, Glassport | Cinder Key |
| A+B, one meal | 1847 | 0 | 19894 | 0 / 0 / 0 | 26819 | 11 | Cinder Key, Glassport | none |
| A+B, one meal | 2718 | 0 | 16872 | 0 / 0 / 0 | 23072 | 15 | Glassport | none |
| A+B, one meal | 4096 | 0 | 18769 | 0 / 0 / 0 | 25719 | 8 | Cinder Key, Glassport | Cinder Key |
| A+B, one day | 1847 | 2 | 18397 | 0 / 0 / 0 | 25040 | 11 | Cinder Key | none |
| A+B, one day | 2718 | 0 | 19262 | 0 / 0 / 0 | 26669 | 12 | none | Glassport |
| A+B, one day | 4096 | 1 | 19019 | 0 / 0 / 0 | 26111 | 12 | Cinder Key, Glassport | Cinder Key |
| C, day ration | 1847 | 10 | 13283 | 121 / 513 / 945 | 21975 | 9 | Glassport | none |
| C, day ration | 2718 | 13 | 11230 | 189 / 490 / 990 | 19632 | 13 | Cinder Key, Glassport | none |
| C, day ration | 4096 | 13 | 11553 | 423 / 554 / 834 | 20431 | 11 | Cinder Key | none |
| D, once a day | 1847 | 17 | 8852 | 735 / 470 / 885 | 17921 | 13 | Cinder Key | Crown Harbor, Glassport |
| D, once a day | 2718 | 11 | 11873 | 777 / 546 / 889 | 20730 | 19 | Crown Harbor, Glassport | none |
| D, once a day | 4096 | 11 | 13370 | 410 / 566 / 923 | 21322 | 7 | Cinder Key | Cinder Key, Glassport |

Under the floors, the under-1 count is 0 as well. A, C, and D still spend most faction-port ticks under 1. A's under-1 counts are 1077 / 1031 / 994, 1010 / 1086 / 1080, and 1124 / 1062 / 1047, Crown Harbor, Glassport, Cinder Key.

The depth cap does not refuse the emptying buys. Its first change, on every seed, is a fill that was already over 28.8 on a board that stayed deep: Pax Ash at Verdant Cay, tick 14, 33.316 cut to 28.8; Orin Frost at Glassport, tick 28, 29.322 cut to 28.8; Pax Ash at Glassport, tick 10, 34.08 cut to 28.8. After that the small ports still hit 0. Upsets go from 8 / 5 / 8 to 11 / 15 / 5. All 31 are still morale-test majors.

The floors do clear the empty reading. They also raise morale-0 from about 10,000 crew-ticks to about 18,000–20,000, and starvation ticks move with them. The food left on the shelf is not a port shortage. The port already ate. The crews cannot buy it. Power at tick 1200 shows the same shrinkage. Baseline is World Government 4869.27 / 5298.33 / 5936.33 and Free Tide 2941.56 / 3263.89 / 1660.6. The floor of 1 ends at 2584.56 / 2494.62 / 2508.44 and 1217.05 / 875.91 / 961.64. The day floor ends at 2719.26 / 2403.79 / 2709.39 and 1299.98 / 1051.61 / 942.27. Crown Harbor is still the opening holder, garrison 257, 257, and 248 on the floor of 1, and 248, 241, and 257 on the day floor. The battles that used to grind it down are not landing on a fed army.

The upsets that remain are the same kind of loss. On the day floor the one left is Bram Quill at Cinder Key, tick 1178, scores 166.432 / 30.304, morale 3, health 95.906, garrison 12, hold empty. On the floor of 1 the four left are Pax Ash, all morale 3, all empty holds, health 27.287, 23.534, 23.385, and 29.659. One A+B case is not a morale-test win for M29: Esme Dusk at Cinder Key on 2718, tick 682, morale 3, health 10.707. Health at or under 15 is outside the outscore rule. Every other remaining upset is inside it.

C still empties the ports. A party may buy one day of its own demand on every tick, and many parties do. Upsets go to 10 / 13 / 13. D still lets the one allowed purchase take the shelf, and the empty counts get worse at Crown Harbor. Upsets go to 17 / 11 / 11. On 1847 the log changes at tick 20, when `buy-provisions` drops out of Kessa Dusk's candidate list and the chosen action stays `travel`. The state hash first differs at world tick 45. On 2718 the log changes at tick 10 and the tick-72 event count stays 8516 while the hash moves. On 4096 the log changes at tick 11 and the hash at world tick 33.

### Who holds the ports

Personal owner, or "—" where the faction still has the opening unowned port. Garrison in parentheses. Tick 1200.

| Rule | Seed | Crown Harbor | Glassport | Cinder Key |
| --- | ---: | --- | --- | --- |
| Baseline | 1847 | World Government, Lio Crow (14) | World Government, Vale Drake (11) | World Government, Bram Quill (14) |
| Baseline | 2718 | Free Tide, Finn Frost (11) | World Government, Niko Wren (13) | World Government, Bram Quill (9) |
| Baseline | 4096 | World Government, — (225) | World Government, Bram Quill (13) | World Government, Niko Wren (13) |
| A, depth | 1847 | Free Tide, Finn Frost (14) | World Government, Niko Wren (14) | Free Tide, Finn Frost (9) |
| A, depth | 2718 | Free Tide, Bram Tern (14) | World Government, Bram Quill (12) | Free Tide, Finn Frost (14) |
| A, depth | 4096 | World Government, — (217) | Free Tide, Zara Gale (10) | World Government, Bram Quill (14) |
| B, floor 1 | 1847 | World Government, — (257) | Free Tide, Pax Ash (28) | Free Tide, Pax Ash (13) |
| B, floor 1 | 2718 | World Government, — (257) | World Government, Bram Quill (9) | World Government, Niko Wren (12) |
| B, floor 1 | 4096 | World Government, — (248) | World Government, Niko Wren (7) | Free Tide, Esme Dusk (10) |
| B, one day | 1847 | World Government, — (248) | Free Tide, Zara Gale (57) | Free Tide, Pax Ash (12) |
| B, one day | 2718 | World Government, — (241) | Free Tide, Dax Pike (30) | World Government, Niko Wren (12) |
| B, one day | 4096 | World Government, — (257) | World Government, Niko Wren (45) | Free Tide, Pax Ash (10) |

### Fixture movement

The first event is the first canonical event that differs from the baseline log. The hash tick is `world.tick` on the first state hash that differs. For a rule whose only change is an event payload that `applyEvent` stores, those are the same moment: the hash moves on the following world tick.

| Rule | Seed | First event | 72-tick result |
| --- | ---: | --- | --- |
| Baseline | 1847 | None | Fixture, 8301 |
| Baseline | 2718 | None | Fixture, 8516 |
| Baseline | 4096 | None | Fixture, 8031 |
| A, depth | 1847 | Tick 14, Pax Ash at Verdant Cay, 33.316 provisions cut to 28.8 | `1a39225688cd1a9b6a4696da8b2020148e423ebb957fba093c0ceefc16b2183d`, 8275 (−26) |
| A, depth | 2718 | Tick 28, Orin Frost at Glassport, 29.322 cut to 28.8 | `d4bdbf1dcb8bd589b391c32b4945c9dbdaa717fc65ced3e27a45960f2bbe1840`, 8501 (−15) |
| A, depth | 4096 | Tick 10, Pax Ash at Glassport, 34.08 cut to 28.8 | `ff86f420e320c8c120561e670bfebbf161ab62ad346f82a42dd4344827b88238`, 8029 (−2) |
| B, floor 1 | 1847 | Tick 87, Jun Ash at Glassport, 11.599 cut to 10.599, shelf left at 1 | Fixture, 8301 |
| B, floor 1 | 2718 | Tick 44, Kessa Calder at Cinder Key, 7.321 cut to 6.321, shelf left at 1 | `62453d7722267738720153c82f4ae1f9f33d6f5e8772c348197601ca4bf45346`, 8538 (+22) |
| B, floor 1 | 4096 | Tick 61, Bram Quill at Crown Harbor, 9.194 cut to 8.194, shelf left at 1 | `28bab5fb3a39aca5aaa6e76ff4cae154feca655cc212ff4d8df39fad235068f3`, 8040 (+9) |
| B, one meal | 1847 | Tick 87, Jun Ash, 11.599 cut to 8.682, shelf left at 2.917 | Fixture, 8301 |
| B, one meal | 2718 | Tick 44, Kessa Calder, 7.321 cut to 5.543, shelf left at 1.778 | `0e86f1abb10248eb86213d4ff8226726eb7e0622ec98951d0e43fde6e0c2edf9`, 8560 (+44) |
| B, one meal | 4096 | Tick 61, Bram Quill, 9.194 cut to 4.194, shelf left at 5 | `2d14495296a7d79a41509d5747535a2b507145b9ffeef5a0dfb7066348f7dfec`, 8042 (+11) |
| B, one day | 1847 | Tick 87, Mara Calder at Glassport, 20.992 cut to 15.089, shelf left at 17.502 | Fixture, 8301 |
| B, one day | 2718 | Tick 38, Esme Dusk at Cinder Key, 3.342 cut to 2.453, shelf left at 10.668 | `53f8d99668477e81d0090cd7e3eeb3228ca4b90b01a53ca932cad83b3298ee92`, 8567 (+51) |
| B, one day | 4096 | Tick 57, Jun Ash at Crown Harbor, 21.96 cut to 5.028, shelf left at 30 | `684bffd30653d94e8224aa2c2cab6de9b8131010fe930f4d3ec764ea881130bd`, 8023 (−8) |
| C, day ration | 1847 | Tick 14, Pax Ash at Verdant Cay, 33.316 cut to 3.312 | `34b808e96e4d8abec4716437ffdf5e97440fa7232cf20909fe28ce66da359673`, 8440 (+139) |
| C, day ration | 2718 | Tick 6, Kessa Calder at Verdant Cay, 22.178 cut to 2.568 | `b9b6bb3198e30179b7e47faf8381f5d1c0c4436704eebe44de9b391c238b95a6`, 8514 (−2) |
| C, day ration | 4096 | Tick 9, Jun Ash at Crown Harbor, 21.416 cut to 2.784 | `983fc647c33f7a32ada5dcca90927e304471b554e7db29afad347af350e05fda`, 8202 (+171) |
| D, once a day | 1847 | Tick 20 log, world tick 45 hash. Kessa Dusk's candidates lose `buy-provisions`; she still travels | `3a8f507c859f715d8f9ff8aeff6f65e94d4a64ba3db00b7d0f58141a51d97a9a`, 8281 (−20) |
| D, once a day | 2718 | Tick 10 log, world tick 35 hash. Kessa Calder's `buy-provisions` score goes to −1000; she still works | `8c785e04064638b8afd9711cbc16d3f60254931f504d2eb0ec42949929a57903`, 8516 (0) |
| D, once a day | 4096 | Tick 11 log, world tick 33 hash. Pax Ash's candidates lose `buy-provisions`; he still travels | `6902a896ea1168bbf1079f6554046fea8a4034f4761694096469f3cbd539869a`, 8034 (+3) |

A+B's first event is A's, on every seed: ticks 14, 28, and 10. On 1847 the tick-72 hash then matches A, because the floor's own first bite is tick 87. On 2718 and 4096 the floor also bites inside the window, so the tick-72 hash is neither A's nor the floor's. Those hashes are in the run log for this note; they are not recommended, and they are not repeated here as a regeneration target.

## M29

M29 is the accepted outscore rule, applied here on top of today's code and on top of the two floors that cut the upset count without also imposing the depth cap. The battle still ends at morale ≤ 12. If troops are at least 8, health is above 15, the garrison is not 0, and the attacker score is higher, the outcome is an attacker victory. `attemptCapture`'s one `rng.next()` is still drawn and ignored. Surrender uses the existing garrison and stability test.

On today's code the rule flips all 21. The upset count goes to 0, 0, and 0. The first events are the same three battles [battle morale](battle-morale.md) named:

| Seed | Tick | Battle | Scores |
| ---: | ---: | --- | --- |
| 1847 | 550 | Esme Dusk at Crown Harbor, defender victory to attacker victory | 245.349 / 236.624 |
| 2718 | 620 | Pax Ash at Cinder Key | 581.303 / 33.072 |
| 4096 | 298 | Esme Dusk at Glassport | 192.971 / 48.5 |

The tick-72 hash stays the fixture on every seed. Event-count deltas against this tree's baseline are 0 / +3878, 0 / +882, and +1039 / +2908 at ticks 400 and 1200. Claims become 25, 16, and 18. Tick-1200 power is 4549.69 / 4316.59, 5506.1 / 3281.71, and 5174.96 / 3389.52, World Government then Free Tide. At tick 1200 Free Tide holds Crown Harbor (Zara Gale, garrison 9) and Glassport (Finn Frost, garrison 12) on 1847, Glassport (Mina Vale, garrison 13) on 2718, and Glassport (Pax Ash, garrison 12) on 4096. No port is lost within five ticks of a claim. Fast losses were 0.

The floors do not make that rule unnecessary. They change the count.

The day floor leaves one major for it to flip: Bram Quill, Cinder Key, tick 1178, 166.432 / 30.304. After the flip the upset count is 0. Seeds 2718 and 4096 have no such major, and their tick-1200 state hash matches the day floor alone. Seed 1847 moves only at that battle. Claims stay 7. The end holders stay Pax Ash at Cinder Key (garrison 12) and Zara Gale at Glassport (garrison 57). Crown Harbor stays World Government, unowned, garrison 248. Power moves from 2719.26 / 1299.98 to 2711.37 / 1303.03. The tick-72 hash is the day floor's hash: the fixture on 1847, and the day floor's own moved hashes on 2718 and 4096. M29 does not ask for a second regeneration on top of the floor.

The floor of 1 leaves four majors, all morale tests with health above 15: one on 1847 (Pax Ash, Cinder Key, tick 868, 219.583 / 25.129) and three on 4096 (Pax Ash, ticks 310, 608, and 961). The rule flips all four. The upset count goes to 0. Seed 2718 has nothing to flip, and its tick-1200 hash matches the floor alone. Seed 1847's claims stay 9 and the end holders change: Free Tide finishes with nothing, where the floor alone had left Pax Ash on Cinder Key and Glassport. Seed 4096's claims go from 12 to 15, and Free Tide finishes with nothing instead of Esme Dusk on Cinder Key. The tick-72 hashes match the floor of 1, including the fixture on 1847.

A+B with the one-meal floor already has 0 upsets, so outscore would flip nothing on that row. That row is also the hungriest of the set (morale-0 19894 / 16872 / 18769) and it moves every seed inside 72 ticks because of the depth cap. It is not a reason to retire M29.

Fixing the buy does not retire the combat rule. On today's battles M29 still flips 8, 5, and 8. On the day floor it flips 1, 0, and 0. On the floor of 1 it flips 1, 0, and 3. The drop is the hungrier campaign, which has fewer of these fights left, not a world in which a higher score already wins.

## M28

M28 is the landless raid floor of 8, with no claim deposit, applied in `buildCandidates` only. A faction that holds a port still needs garrison 15. On today's code, before any provisioning change, the Free Tide stretches are 77–80 (3), 334–364 (30), 498–501 (3), and 1129 onward (71) on 1847; 35–36 (1), 311–312 (1), 517–518 (1), 856–862 (6), and 982–1048 (66) on 2718; 51–54 (3), 77–94 (17), 466–554 (88), and 782–784 (2) on 4096. Event deltas against this baseline are +479 / +461, +590 / −1446, and −76 / −684. One port on each seed changes hands again within five ticks: Crown Harbor 330→334 on 1847, Cinder Key 35→36 on 2718, Crown Harbor 1178→1180 on 4096. The 2718 case is the accepted pile-on: Mina Vale's `decision-made` at tick 35 changes from `work` to `raid`, and she claims Cinder Key back at tick 36, garrison 6.

Seeds 1847 and 4096 stay on the fixture. Seed 2718 does not. The new 72-tick hash is `30309060cb5fe9686c69ad1f52e89482bdb98bca9f10056fb07d5fdbfca26769`, 8513 events (−3). The previously recorded regeneration, `edbface2…` with 8486 events, was the same −3 against the pre-M27 fixture of 8489. M27 has since rebaselined the pin to 8516. The stretch, the tick-35 raid, and the −3 count are the accepted rule. The hash bytes are this tree's.

Upsets under the floor alone rise to 21, 16, and 13, all morale tests. That is the late pattern [battle morale](battle-morale.md) already measured: a raid at garrison 8, a higher attacker score, a defender victory at morale 3. At tick 1200 Free Tide holds nothing on 1847 (power 2234.23), Crown Harbor on 2718 (Corin Hale, garrison 14, power 3945.84), and Cinder Key plus Glassport on 4096 (power 3014.57).

On top of the day floor, M28 still fires at tick 35 on 2718. The first event is Mina Vale's raid, and Cinder Key is still lost and retaken across ticks 35 and 36, garrison 14 then 6. The later stretches become 311–312 (1), 533–534 (1), 840–875 (35), and 1084–1085 (1). Free Tide ends on Cinder Key (Finn Frost, garrison 9, power 975.39) and World Government keeps Crown Harbor unowned at garrison 245. The tick-72 hash is neither M28's nor the day floor's: `e92ae3166bd9d9e015404a955103e66a9bda25433afaf03f613be192e6c8a4cc`, 8493 events. The floor of 1 under the same raid produces a third 2718 hash, `541952d87c0e53a050f73f55bedd80b0e17651cd41c771287f679c12e718bae3`, 8528 events, and the same tick 35–36 retake.

The day floor plus M28 leaves 0 upsets on every seed, so M29 on top of that pair changes no tick-1200 hash, no claim count, and no holder. The floor of 1 plus M28 still has three morale-test upsets on 1847 (ticks 665, 1023, and 1045). M29 flips them. Claims on that seed go from 14 to 17, Glassport changes hands at 666 and again at 667, and Free Tide ends holding Cinder Key and Glassport instead of Glassport only. Seeds 2718 and 4096 have no remaining upset, and their tick-1200 hashes match the floor-of-1 plus M28 run.

M28's 2718 regeneration is still required. A provisioning floor does not absorb it, and it does not remove the one-tick retake at tick 35.

## Recommendation

Leave `buy-provisions` uncapped by `marketDepth`. Do not add a reserve the autonomous buyer cannot cross. Do not add the one-day quantity cap or the one-purchase-a-day gate. Let M29 retitle the 21 majors, and let M28 regenerate 2718 to this tree's hash.

The depth cap is the gap in the code, and it is the wrong quantity for the empty shelf. The buys that take Crown Harbor, Glassport, and Cinder Key under 1 are already smaller than 28.8. Applying the cap rewrites a deep-board fill at ticks 14, 28, and 10, moves all three fixture hashes, and raises the upset count on 1847 and 2718.

A reserve does make the empty count 0. It does it by leaving food the crews were buying. Morale-0 roughly doubles. Both factions' power at tick 1200 falls by about half. The upsets that survive are still empty-hold majors at morale 3. The one-meal floor and the day floor do not improve on the floor of 1 enough to be worth a higher lock: the day floor leaves the fewest upsets (1, 0, 0), and it still leaves that one for M29, at the cost of the same hunger. Stacking the depth cap on a floor moves the fixture earlier and does not feed anyone.

M29 on today's code still flips 8, 5, and 8, is still hash-neutral through tick 72, and still produces the tick-1200 holders and powers measured for it before M27. The provisioning runs change that job's size only by changing the campaign. They do not make a higher score win under the current morale test. M28 still regenerates 2718, to `30309060…` and 8513 events, and the tick-35 retake is still there if a reserve is added underneath.

## Tests

`npm run golden:update` stays unrun. The recommendation does not change a tick.

- `tests/trade.test.ts`, beside "a player order cannot clear more than the market's depth". An autonomous `buy-provisions` whose `provisionResupplyTarget` exceeds `marketDepth`, on a shelf deeper than 28.8, still buys more than 28.8. That pins the gap this note measured. The player order beside it stays capped.
- `tests/golden.test.ts`. "pinned seeds reproduce their committed state hash and event count" stays on `8e081fb0…`, `64e84328…`, and `b85a6810…` (8301, 8516, 8031). A later milestone that caps `buy-provisions` moves all three, to the A hashes above.
- The M29 cases named in [battle morale](battle-morale.md) stay the right combat tests. This measurement does not add a draw and does not move their tick-72 hash on today's tree.
- The M28 golden line should regenerate 2718 to `30309060cb5fe9686c69ad1f52e89482bdb98bca9f10056fb07d5fdbfca26769` and 8513 events. `edbface2…` / 8486 was the same rule against the pre-M27 pin. Seeds 1847 and 4096 stay on the current fixture. The agency case beside "a claimed port is not claimed or raided again while its garrison stays under 15" stays the one [portless recovery](portless-recovery.md) named.

## Playtest

Follow `docs/playtests/TEMPLATE.md`. Dashboard HTTP JSON only, as in [battle morale](battle-morale.md#playtest). Seed 4096, Mara Vane (`character-01`), ticks 0–62. No survey, no raid, no other command. She starts at Crown Harbor. The buy under test is Bram Quill's, not hers. This session does not build M29. The tick-298 battle stays that note's playtest.

**Hypothesis.** Crown Harbor's shelf at state tick 61 is 8.846, under the 28.8 cap, and at state tick 62 it is 0. The buy that empties it is smaller than the cap, so the cap is not what would have saved the shelf.

**Ambition.** Stay at Crown Harbor and read the port.

**Success.** `GET /api/state` after advancing to state tick 61 shows `crown-harbor` `stocks.provisions` 8.846. After one more tick, state tick 62, that stock is 0. No new event type appears.

```bash
npm run dashboard -- --reset --seed 4096 --player-character character-01
```

The server listens on `http://127.0.0.1:4317`. `POST /api/advance` with `{"ticks": 61}`, then `{"ticks": 1}`. Do not call `POST /api/commands`.

`PROMOTE` if those two shelf readings hold. `REVISE` if state tick 61 is already above 28.8, which would mean the cap could have refused the buy that follows. `ABANDON` if state tick 62 still has a shelf above 0. The headless trade at event tick 61 is Bram Quill, 9.194 provisions, stock 0. The panel may withhold his payload. The shelf is the check.

## Questions for Micah

1. **Should a captain's own food purchase stop at the same 28.8 limit a player's purchase already uses?** Default: no. The purchases that empty Crown Harbor, Glassport, and Cinder Key are already smaller than 28.8. Putting the limit on changes a deep-board purchase at ticks 14, 28, and 10, and the false defeats go from 8 to 11 on seed 1847 and from 5 to 15 on seed 2718.
2. **Should a port keep some food that captains are not allowed to buy?** Default: no. A reserve of 1 unit, of one town meal, and of one day of town meals all stop the shelf from reading empty. They also roughly double the time crews spend at morale 0. The town was not short of food. The food was left where the crew could not take it.
3. **The victory rule for a fight the attackers outscored and still lost on morale is already accepted. Do those 8, 5, and 8 fights still get retitled?** Default: yes. They are the same fights, first at ticks 550, 620, and 298. A food reserve cuts that list only by making the crews hungrier. The reserve that leaves the fewest of them still leaves one, at tick 1178 on seed 1847.
4. **The landless raid at 8 soldiers was measured before the latest fixture. On this tree seed 2718 comes out as a different hash, with 8513 events. Should the build use that hash?** Default: yes. The waits and the tick-35 retake are the ones already accepted. The event count is still three under today's fixture. The older hash belonged to the fixture from before that.
5. **Should a captain be limited to one food purchase a day, or to no more food than that crew eats in a day?** Default: no. One day's eating, bought every tick, raised the false defeats to 10, 13, and 13. One purchase a day raised them to 17, 11, and 11. The shelf still emptied.
