# Battle morale

**Status: Built (M29).** The outscore rule in the recommendation is in the code and in [world simulation](world-simulation.md). The runs below were patched in locally on `main` at `5d391512cc25551ba806dcfc279db713cec82c05` (PR #33 merged) and taken back out. M28, the landless raid floor of 8, landed before this rule.

Runs are `createPrototypeWorld` plus `runTick`, no player commands, seeds 1847 / 2718 / 4096, 1200 ticks, Node v24.21.0, ICU 78.3. Tick numbers on events are the `tick` field. A figure at tick 400 or tick 1200 is the world after that many `runTick` calls (`world.tick === 400` or `1200`), the same convention as the 72-tick fixture and as the tick-400 powers in the portless note. A zero stretch runs from the claim that removes the last Free Tide port until the claim that returns one. The length is the difference of those ticks. `npm test` on this tree passes, 176 tests. The 72-tick hashes match `tests/fixtures/golden-hashes.json`:

| Seed | State hash | Events |
| ---: | --- | ---: |
| 1847 | `d7eb02eb0e6b835ee923147b855d0a91969a416115d0c3bd5c2650ff0e2b6a3f` | 8275 |
| 2718 | `d0b4b449ce9bc3fc27f0cfa15a5cc8ef04d5a2e6a9cdded2c2b11b6c4ca6583d` | 8489 |
| 4096 | `d5d9da8bb1e9c9bd86c93ccbaa570f04ea9052ea1b5d4b48f3452e2db6f0c0c7` | 8003 |

Unmodified event counts at 400 and 1200 ticks are 49265 / 162302, 50325 / 166064, and 49091 / 162558. Tick-400 power is 3276.92 / 1668.52, 2988.03 / 1853.79, and 3053.99 / 1349.41, World Government then Free Tide. Those match the portless note, so this is the same runner. The floor of 8, prototyped on its own, reproduces that note's stretches and the 2718 hash `edbface2f8d5f5e5ab3f03d59096b80d8d4a753097215f5174576ad80d3d8e98`, 8486 events.

## The two causes

Both were measured on today's rules. The raid gate stays at garrison 15. No floor.

### Hungry crews ashore

A captain who rests on Glassport or Cinder Key is usually standing on a shelf of less than 1 provision. Over 1200 end-of-tick readings the shelf is under 1 on 957 / 1094 / 1011 ticks at Glassport and 1005 / 1095 / 1083 ticks at Cinder Key. It is under 1 on 1044 / 1049 / 1088 ticks at Crown Harbor. Verdant Cay never goes under 1. Its minimum is the opening 310.

The port's own ration is not what empties those shelves. Demand is `round(population / 3600, 3)`: Crown Harbor 5, Glassport 2.917, Cinder Key 1.778, Verdant Cay 2. Unpenalized provisions output is `production.provisions` times the focus multiplier. Crown Harbor makes 5.5 against a demand of 5, Glassport 4.1 against 2.917, Cinder Key 3.2 against 1.778, and Verdant Cay 9.5 with the provisions focus, so 11.875 against 2. `producedStocks` then uses `max(penalized, min(unpenalized, demand))`, so a field that can cover the ration is not cut by stability. On these runs that output was below demand on 0 ticks, at every port, on every seed. `settlement-shortage` was emitted 0 times. The fields cover the meal. Trade is what takes the shelf under 1.

The share-of-stock cap is not what holds it there. `marketDepth` is `round(targetStocks.provisions * 0.16, 3)`, and every port's target is 180, so the cap is 28.8. `resolveTrade` (`trade-local`) and the player's `tradeQuote` use it. Autonomous `buy-provisions` does not. Its quantity is `min(desired, settlement.stocks.provisions, money / price)`, with `desired` equal to `provisionResupplyTarget` minus the hold. The trades that cross a shelf from at least 1 to under 1 are almost all `buy-provisions`. Crown Harbor: 177, 333, and 459, every one of them. Glassport: 521, 611 of 612, and 573 of 574. Cinder Key: 965, 1055 of 1057, and 1111 of 1113. The leftovers are `trade-local`: two at Cinder Key and one at Glassport on 2718, and the same two and one on 4096. The first crossing on each faction port is one `buy-provisions` that takes the remaining shelf:

| Seed | Port | Tick | Buyer | Quantity | Shelf |
| ---: | --- | ---: | --- | ---: | --- |
| 1847 | Glassport | 87 | Jun Ash | 11.599 | 11.599 → 0 |
| 1847 | Crown Harbor | 98 | Sable Sorn | 26.8 | 26.8 → 0 |
| 1847 | Cinder Key | 192 | Jun Marrow | 3.351 | 4.056 → 0.705 |
| 2718 | Cinder Key | 44 | Kessa Calder | 7.321 | 7.321 → 0 |
| 2718 | Glassport | 67 | Jun Ash | 19.939 | 19.939 → 0 |
| 2718 | Crown Harbor | 89 | Ada Sorn | 8.351 | 8.351 → 0 |
| 4096 | Crown Harbor | 61 | Bram Quill | 9.194 | 9.194 → 0 |
| 4096 | Glassport | 68 | Niko Crow | 20.907 | 20.907 → 0 |
| 4096 | Cinder Key | 93 | Toma Hale | 20.89 | 20.89 → 0 |

Every one of those quantities is under 28.8, because that was the stock, not because the cap refused a larger buy. Where the shelf is deep, `buy-provisions` does exceed 28.8: Verdant Cay has 56 / 77 / 92 such buys, and its shelf still never falls under 1. The cap is the wrong lever for the small ports.

What the captains cannot do is resupply by standing there. `upkeepCharacter` eats the hold. It does not read the port's stocks. `rest` adds 3 morale and does not buy. `buildCandidates` scores `buy-provisions` at −1000 when `stocks.provisions < 1` or money is under 2. That is the whole purchase gate. The open item in [progress.md](../../progress.md) is the player's half of the same gap: the briefing says the market is alongside and sells provisions, and an idle human has no lever. Autonomous captains do have the action. On these runs they are not choosing rest over a legal purchase.

Rests on Glassport or Cinder Key, and how the gate stood:

| Seed | Rests | Shelf 0 | Shelf under 1, above 0 | Shelf at least 1 | Blocked by the shelf | Blocked by the purse | Both | Buy was legal |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1847 | 7634 | 5676 | 1532 | 426 | 6790 | 420 | 418 | 6 |
| 2718 | 8065 | 5067 | 2842 | 156 | 7588 | 148 | 321 | 8 |
| 4096 | 7972 | 6299 | 1435 | 238 | 7497 | 223 | 237 | 15 |

On all 6 / 8 / 15 legal buys, rest still won the decision. The buy score was never the higher one. The shelf gate is the block. The purse is the smaller one. Standing on the dock does not move food into the hold, and once the shelf is under 1 the action that would move it is switched off.

Raid and battle entry is the upkeep morale on the decision tick, after the shortage drain and before the phase's +3 or −7. Of 52 / 49 / 39 raid decisions, 9 / 8 / 12 were entered at morale ≤ 12. Of those, 8 / 7 / 12 were majors and 1 / 1 / 0 were immediate. Split by the upkeep on that tick:

| Seed | Morale ≤ 12 | Severe shortage | Mild shortage | Fed, and the hold still covers a ration |
| ---: | ---: | ---: | ---: | ---: |
| 1847 | 9 | 6 | 1 | 2 |
| 2718 | 8 | 1 | 3 | 4 |
| 4096 | 12 | 1 | 3 | 8 |

Severe means `shortage * 2.4 > 3`, so the drain is larger than rest's +3. Mild means a shortage that drains 3 or less. Fed means shortage 0. Every fed entry in that table still had `cargo.provisions >= demand` after eating. On 4096, eight of the twelve low entries are fed. The hold is not empty. Earlier hunger, and `work` subtracting 0.35, left the morale low, and a fed upkeep only adds 0.04.

Rest does lift a mildly hungry captain. Of rests whose upkeep shortage was above 0 but whose drain was at most 3, 1882 of 4578, 1814 of 4635, and 1913 of 3934 ended above 12. The highest rested morale on any hungry rest was 60.982 / 57.84 / 67.482.

Rest does not lift a captain the severe drain has already put at 0. Upkeep clamps at 0, then rest adds 3, so the rested morale is 3. That happened 4372 / 4497 / 4465 times. None of those rests exceeded 12. The maximum was 3. A severe shortage can still leave morale above 12 when the captain entered the tick already high: 143 / 40 / 38 rests, of which 14 / 8 / 12 had upkeep morale already ≤ 12 and the +3 crossed 12. Those captains were not at the floor. The next upkeep puts a captain at 0 straight back under 12, because the drain is still larger than 3.

### The major-battle rule

`isMajorBattle` is troops plus garrison at least 120, or party power plus defense at least 275. `resolveBattlePhase` adds 3 morale on an attacker advantage and subtracts 7 otherwise. The battle ends when the phase count is done, troops are under 8, the garrison is 0, health is at most 15, or morale is at most 12. The attacker wins a finished major only when the garrison is 0, or troops are at least 8 and health is above 15 and morale is above 12 and the phase wins say so. An immediate battle ignores that test. Its winner is `attackerScore > defenderScore`.

The first major on every seed is tick 0, Pax Ash at Crown Harbor. Majors inside the 72-tick fixture: 10, 9, and 11 `battle-started` events, and 20, 17, and 23 phase resolutions. The lowest entry morale in that window is 66.46 / 59.5 / 73.08. No phase in the window ends at morale ≤ 12. Defender victories inside the window: 4, 5, and 7. Defender victories whose attacker score was higher: 0, 0, and 0. Nothing in this cause moves the fixture. The rule is already in the code. The captains have not yet been drained down to it.

Across 1200 ticks the defender victories with a higher attacker score are 8, 5, and 8. All 21 are majors, all end on phase 1, and all end on the morale test. Troops are in the hundreds, or 101 at the smallest. Health is in the high 80s or 90s. The score ratio is attacker score divided by defender score.

| Seed | Count | Ratio 1–2 | 2–5 | 5–10 | 10–20 | Above 20 | Minimum | Median | Maximum | First tick |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1847 | 8 | 1 | 1 | 2 | 2 | 2 | 1.037 | 11.157 | 25.132 | 550 |
| 2718 | 5 | 1 | 0 | 2 | 2 | 0 | 1.623 | 6.106 | 17.577 | 620 |
| 4096 | 8 | 0 | 1 | 2 | 4 | 1 | 3.979 | 11.215 | 21.796 | 298 |

| Tick | Seed | Attacker | Port | Scores | Ratio | Phase morale | Garrison left | Hold at entry |
| ---: | ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 550 | 1847 | Esme Dusk | Crown Harbor | 245.349 / 236.624 | 1.037 | 8.62 | 140 | Fed, cargo 65.758 |
| 551 | 1847 | Pax Ash | Glassport | 480.337 / 34.093 | 14.089 | 3 | 12 | Empty, severe |
| 837 | 1847 | Pax Ash | Cinder Key | 651.021 / 27.046 | 24.071 | 3 | 12 | Empty, severe |
| 938 | 1847 | Bram Tern | Crown Harbor | 488.77 / 138.2 | 3.537 | 3.21 | 59 | Fed, cargo 93.717 |
| 1023 | 1847 | Niko Wren | Crown Harbor | 502.548 / 51.651 | 9.730 | 3 | 12 | Empty, severe |
| 1056 | 1847 | Iris Stone | Crown Harbor | 312.955 / 58.445 | 5.355 | 3 | 12 | Empty, severe |
| 1089 | 1847 | Kessa Calder | Crown Harbor | 640.291 / 50.882 | 12.584 | 3 | 12 | Empty, severe |
| 1116 | 1847 | Pax Ash | Cinder Key | 763.796 / 30.391 | 25.132 | 3 | 12 | Empty, severe |
| 620 | 2718 | Pax Ash | Cinder Key | 581.303 / 33.072 | 17.577 | 3 | 12 | Empty, mild |
| 713 | 2718 | Corin Hale | Cinder Key | 320.564 / 27.796 | 11.533 | 5.59 | 12 | Empty, mild |
| 756 | 2718 | Finn Frost | Crown Harbor | 456.576 / 281.256 | 1.623 | 3.23 | 174 | Fed, cargo 94.937 |
| 1121 | 2718 | Mina Vale | Glassport | 223.053 / 39.93 | 5.586 | 3 | 12 | Empty, severe |
| 1178 | 2718 | Mina Vale | Glassport | 287.35 / 47.064 | 6.106 | 3 | 12 | Empty, mild |
| 298 | 4096 | Esme Dusk | Glassport | 192.971 / 48.5 | 3.979 | 8.058 | 13 | Mild, cargo 0 |
| 310 | 4096 | Pax Ash | Cinder Key | 411.226 / 26.616 | 15.450 | 6.08 | 12 | Fed, cargo 1.411 |
| 403 | 4096 | Corin Hale | Cinder Key | 258.18 / 30.091 | 8.580 | 4.258 | 12 | Empty, mild |
| 646 | 4096 | Pax Ash | Glassport | 417.243 / 33.896 | 12.310 | 11.764 | 12 | Fed, cargo 4.811 |
| 874 | 4096 | Iris Stone | Glassport | 409.605 / 40.474 | 10.120 | 3 | 12 | Empty, severe |
| 1121 | 4096 | Pax Ash | Glassport | 727.728 / 40.076 | 18.159 | 10.097 | 12 | Fed, cargo 25.572 |
| 1147 | 4096 | Finn Frost | Cinder Key | 720.553 / 33.059 | 21.796 | 3.04 | 12 | Fed, cargo 12.423 |
| 1178 | 4096 | Mina Vale | Glassport | 240.72 / 43.974 | 5.474 | 4.312 | 12 | Empty, mild |

Phase morale is entry morale plus 3, because every one of these phases was an attacker advantage and none of them clamped. Esme at tick 550 entered at 5.62. Pax at tick 551 entered at 0. Surrender does not run. It is offered only after an attacker victory, and only then does it read garrison and stability. A garrison of 140 or 174 would not qualify anyway. A garrison of 12 or 13 often would. The loss is the morale test.

Of the 21, 8 are a severe empty hold, 6 are a mild empty or partial hold, and 7 are fed with the next ration already in the hold. The small-port rows at phase morale 3 are the ones [portless recovery](portless-recovery.md) saw under the floor of 8, in the seed 1847 late stretch. They are already here, under today's gate of 15.

## Measured variants

Each variant was run on its own, and again with M28's floor prototyped on top: in `buildCandidates`, a faction that holds no port uses garrison ≥ 8 instead of ≥ 15. Troops, the 18-tick cooldown, hostility, and the open-battle check stay. No variant adds an event type. Where a variant spends an extra draw, or keeps spending one, that is named on the variant.

**Ratio.** On an attacker-advantage phase, morale gain is `round(3 * attackerScore / max(1, defenderScore))` instead of 3. The loss rates keep today's ratio, clamped to 0.2–3. A tenfold score adds about 30 morale. A tie stays at +3. No new draw is inserted. A battle that no longer ends on phase 1 does take the phase draws on the later ticks, which today's early end never reached.

**Outscore.** The battle still ends at morale ≤ 12. If troops are at least 8, health is above 15, the garrison is not 0, and the attacker score is higher, the outcome is an attacker victory. Surrender then uses the existing rule. The capture roll `attemptCapture` already draws on a defender loss is still drawn and ignored, so the flip does not delete a draw. Later ticks diverge because the victory changes the world, not because a new roll was inserted.

**Fed floor.** On phase 1 only, a party whose hold still covers one ration (`cargo.provisions >= provisionDemand`) enters at morale at least 13, before the +3 or −7. An empty hold is unchanged. No new draw.

**Rest refund.** When the hold is empty, rest adds 3 plus `round(demand * 2.4)` instead of 3. A fed hold, or a hold with anything left in it, still adds 3. No new draw. The refund is one full ration of drain, so a captain at 0 who then rests climbs by about 3 per rest tick at the next upkeep, after the first tick lands them on `3 + demand * 2.4`.

**Anchor ration.** Before upkeep, an autonomous party ashore buys this tick's shortfall from the port when the shelf is above 0 and the purse can pay, at `marketPrice`, capped by the shelf and the purse. The purchase is the existing `market-trade`. Humans are skipped, so the idle commander still starves. A shelf of 0 buys nothing. No new draw. This is the open resupply-at-anchor gap, narrowed to one ration and to autonomous parties.

**Buy gate.** `buy-provisions` is legal when the shelf is above 0, not only when it is at least 1. The purse test stays at 2 money. No new draw. The logged candidate list changes as soon as a fractional shelf would have scored −1000.

A draw, or a withdrawal that leaves the port with the defender, was not given its own run. The defeat path already withdraws or captures, and it does not offer surrender. Renaming that outcome would not return the port. The outscore variant is the version that can.

## Comparison

Upsets are defender victories whose attacker score was higher. Stretches are Free Tide's portless stretches over 1200 ticks. The second stretch column is the same variant with the floor of 8 on top. Ports are Free Tide's. "Lost ≤ 5" counts a claim of a port that was claimed at most 5 ticks earlier, for the variant alone and then for the variant plus the floor.

| Rule | Seed | Upsets | Stretches alone | Stretches with floor 8 | Ports at 400 | Ports at 1200 | Lost ≤ 5 |
| --- | ---: | ---: | --- | --- | --- | --- | --- |
| Unchanged | 1847 | 8 | 77–231 (154), 561–609 (48), 764–934 (170), 1126–open (74) | 77–80 (3), 334–364 (30), 498–501 (3), 1129–open (71) | Cinder Key, Glassport | none | 0 / 1 |
| Unchanged | 2718 | 5 | 35–48 (13), 311–383 (72), 555–782 (227), 1088–1147 (59) | 35–36 (1), 311–312 (1), 517–518 (1), 856–862 (6), 982–1048 (66) | Glassport | Crown Harbor | 0 / 1 |
| Unchanged | 4096 | 8 | 51–54 (3), 77–324 (247), 478–499 (21), 932–open (268) | 51–54 (3), 77–94 (17), 466–554 (88), 782–784 (2) | Glassport | none | 0 / 1 |
| Ratio | 1847 | 0 | 77–229 (152), 561–611 (50) | 77–80 (3), 437–459 (22), 688–691 (3), 1004–1007 (3) | Cinder Key, Glassport | Glassport | 0 / 0 |
| Ratio | 2718 | 1 | 35–48 (13), 311–383 (72), 552–592 (40), 938–1044 (106) | 35–36 (1), 313–314 (1), 516–519 (3), 886–889 (3) | Glassport | Cinder Key, Glassport | 0 / 1 |
| Ratio | 4096 | 0 | 51–54 (3), 77–313 (236), 592–706 (114) | 51–54 (3), 77–94 (17), 559–562 (3), 744–782 (38), 1150–1153 (3) | Cinder Key, Glassport | Crown Harbor, Glassport | 0 / 0 |
| Outscore | 1847 | 0 | 77–231 (154), 666–838 (172), 931–947 (16), 1142–1178 (36) | 77–80 (3), 334–364 (30), 498–499 (1), 599–609 (10), 727–728 (1), 881–882 (1), 993–1002 (9), 1101–1102 (1) | Cinder Key, Glassport | Crown Harbor, Glassport | 0 / 7 |
| Outscore | 2718 | 0 | 35–48 (13), 311–383 (72), 555–714 (159), 807–951 (144), 1009–1065 (56), 1122–1179 (57) | 35–36 (1), 311–312 (1), 517–518 (1), 871–872 (1), 1008–1009 (1) | Glassport | Glassport | 0 / 1 |
| Outscore | 4096 | 0 | 51–54 (3), 77–311 (234), 497–685 (188), 742–745 (3), 858–931 (73), 1024–1027 (3), 1084–1141 (57) | 51–54 (3), 77–94 (17), 466–476 (10), 649–685 (36), 1199–open (1) | Cinder Key, Glassport | Glassport | 0 / 0 |
| Fed floor | 1847 | 5 | 77–231 (154), 561–611 (50), 763–932 (169) | 77–80 (3), 334–364 (30), 498–501 (3), 1129–open (71) | Cinder Key, Glassport | Cinder Key | 0 / 1 |
| Fed floor | 2718 | 7 | 35–48 (13), 311–383 (72), 555–782 (227), 953–980 (27) | 35–36 (1), 311–312 (1), 514–515 (1), 992–995 (3) | Glassport | Cinder Key, Crown Harbor | 0 / 1 |
| Fed floor | 4096 | 10 | 51–54 (3), 77–324 (247), 495–744 (249), 915–964 (49) | 51–54 (3), 77–94 (17), 466–554 (88), 896–900 (4) | Glassport | Cinder Key | 0 / 1 |
| Rest refund | 1847 | 8 | 77–231 (154), 561–582 (21), 861–993 (132) | 77–80 (3), 331–342 (11), 476–479 (3), 773–776 (3), 1102–1105 (3) | Cinder Key, Glassport | Cinder Key, Glassport | 0 / 1 |
| Rest refund | 2718 | 19 | 35–48 (13), 311–685 (374) | 35–36 (1), 311–312 (1), 514–518 (4), 1086–1088 (2) | none | Cinder Key, Crown Harbor | 0 / 1 |
| Rest refund | 4096 | 8 | 51–54 (3), 77–321 (244), 440–497 (57), 881–971 (90), 1081–1122 (41) | 51–54 (3), 77–94 (17), 468–550 (82) | Glassport | Glassport | 0 / 0 |
| Anchor | 1847 | 17 | 77–231 (154), 592–818 (226) | 77–80 (3), 530–580 (50), 608–630 (22), 795–798 (3), 1136–1160 (24) | Cinder Key, Glassport | Crown Harbor, Glassport | 0 / 0 |
| Anchor | 2718 | 12 | 35–48 (13), 311–381 (70), 611–821 (210), 881–896 (15), 1067–open (133) | 35–36 (1), 311–312 (1), 628–685 (57), 913–916 (3) | Glassport | none | 0 / 1 |
| Anchor | 4096 | 8 | 51–54 (3), 77–282 (205), 809–839 (30), 1008–open (192) | 51–54 (3), 77–94 (17), 497–687 (190), 972–980 (8) | Glassport | none | 0 / 0 |
| Buy gate | 1847 | 7 | 77–229 (152), 685–776 (91), 839–875 (36), 1067–open (133) | 77–80 (3), 437–495 (58), 904–905 (1) | Cinder Key | none | 0 / 0 |
| Buy gate | 2718 | 8 | 35–48 (13), 344–609 (265), 761–995 (234) | 35–36 (1), 311–312 (1), 514–573 (59), 799–802 (3) | none | Cinder Key, Glassport | 0 / 1 |
| Buy gate | 4096 | 7 | 51–54 (3), 77–311 (234), 683–839 (156), 1086–open (114) | 51–54 (3), 77–97 (20), 497–535 (38), 761–764 (3) | Cinder Key | none | 0 / 0 |

The early portless stretches are the garrison gate. Outscore, fed floor, rest refund, and anchor leave 77–231, 35–48, and 77–something in place, because those waits end before the first upset or do not depend on it. The floor of 8 is what shortens them, and that result is M28's. What outscore changes, once the floor is on, is the late open stretch: 1129 onward on 1847 becomes a series of short holds, and 932 onward on 4096 becomes a one-tick opening at 1199.

Fed floor plus the floor of 8 leaves 1847's 1129–open (71) stretch exactly where the floor alone left it. Those late raids are empty holds. A floor on fed entry does not touch them.

Ratio leaves one upset: Pax Ash at Crown Harbor on 2718, tick 516, scores 346.857 / 240.582, ratio 1.442, phase morale 10.082, garrison left 139. Three times a near-tie is still under 12 when the captain entered near 6. The garrison would not have surrendered anyway.

| Rule | Seed | First differing event | 72-tick result | Δ at 400 | Δ at 1200 | Hash-neutral through tick 72 |
| --- | ---: | --- | --- | ---: | ---: | --- |
| Unchanged | 1847 | None | Fixture, 8275 (0) | 0 | 0 | Yes |
| Unchanged | 2718 | None | Fixture, 8489 (0) | 0 | 0 | Yes |
| Unchanged | 4096 | None | Fixture, 8003 (0) | 0 | 0 | Yes |
| Ratio | 1847 | Tick 19, Pax Ash's phase 1 at Glassport, morale 69.46 to 70.364 | `f62cf4c138dfc12c16106da095c0fa3d782bfeae59a9fb977871972f129dd327`, 8275 (0) | +36 | +2901 | No |
| Ratio | 2718 | Tick 23, Pax Ash's phase 1 at Glassport, morale 62.5 to 63.287 | `2f8a9d68bcc13b5bf192e65031e72d2d05ce57de66b503fabff324436c404259`, 8489 (0) | −628 | +1157 | No |
| Ratio | 4096 | Tick 23, Pax Ash's phase 1 at Glassport, morale 87.07 to 87.995 | Fixture, 8003 (0) | +732 | +3862 | State yes, log no |
| Outscore | 1847 | Tick 550, Esme Dusk's `battle-resolved` at Crown Harbor, defender victory to attacker victory, 245.349 / 236.624 | Fixture, 8275 (0) | 0 | +3877 | Yes |
| Outscore | 2718 | Tick 620, Pax Ash's `battle-resolved` at Cinder Key, defender victory to attacker victory, 581.303 / 33.072 | Fixture, 8489 (0) | 0 | +882 | Yes |
| Outscore | 4096 | Tick 298, Esme Dusk's `battle-resolved` at Glassport, defender victory to attacker victory, 192.971 / 48.5 | Fixture, 8003 (0) | +1038 | +2907 | Yes |
| Fed floor | 1847 | Tick 550, Esme Dusk's phase 1 at Crown Harbor, morale 8.62 to 16 | Fixture, 8275 (0) | 0 | −355 | Yes |
| Fed floor | 2718 | Tick 756, Finn Frost's phase 1 at Crown Harbor, morale 3.23 to 16 | Fixture, 8489 (0) | 0 | +88 | Yes |
| Fed floor | 4096 | Tick 310, Pax Ash's phase 1 at Cinder Key, morale 6.08 to 16 | Fixture, 8003 (0) | +254 | +2109 | Yes |
| Rest refund | 1847 | Tick 255, Iris Vale's `rested` at Cinder Key, morale 30.338 to 32.018 | Fixture, 8275 (0) | +33 | +1031 | Yes |
| Rest refund | 2718 | Tick 165, Jun Ash's `rested` at Glassport, morale 40.6 to 41.646 | Fixture, 8489 (0) | −108 | −4983 | Yes |
| Rest refund | 4096 | Tick 175, Sable Sorn's `rested` at Cinder Key, morale 34.306 to 36.255 | Fixture, 8003 (0) | +879 | +391 | Yes |
| Anchor | 1847 | Tick 236, Vale Gale's `market-trade`, bought 0.416 provisions at Glassport, where the baseline has her upkeep | Fixture, 8275 (0) | +507 | +3216 | Yes |
| Anchor | 2718 | Tick 151, Jun Ash bought 0.436 provisions at Glassport | Fixture, 8489 (0) | −130 | −1455 | Yes |
| Anchor | 4096 | Tick 108, Zara Gale bought 0.12 provisions at Crown Harbor | Fixture, 8003 (0) | +559 | +609 | Yes |
| Buy gate | 1847 | Tick 88, Iris Stone's `decision-made` at Glassport stays `work`. `buy-provisions` enters the logged candidates at 45.6 | Fixture, 8275 (0) | +490 | +2548 | Yes |
| Buy gate | 2718 | Tick 45, Orin Rill's decision stays `recruit` and the candidate list changes. The first action that changes is tick 49, Iris Stone, `rest` to `buy-provisions`, 0.994 provisions | `69ff48c30ce41f827f0ef8973b8b2215042402983b71e7a340559c343b02644a`, 8515 (+26) | +1119 | +340 | No |
| Buy gate | 4096 | Tick 62, Bram Quill's `decision-made` at Crown Harbor, `trade-local` to `buy-provisions` | `d1a857d9d9f569d9f48214c495b614d6503c324d0e47543f0ac020710700585e`, 8015 (+12) | +836 | +3320 | No |

Hash-neutral means the tick-72 state hash and the event count match the fixture. Ratio on 4096 does that, and the log does not: Pax's phase morale changes at tick 23, inside the window. The golden test hashes the world and counts events, so it would stay green. Ratio on 1847 and 2718 moves the hash with the same kind of phase, at tick 19 and tick 23, while the event count stays put.

Outscore plus the floor of 8 has the same tick-72 hash as the floor alone, on every seed: the fixture on 1847 and 4096, and `edbface2…` with 8486 events on 2718. The morale rule's first difference is after tick 72. Once M28 has regenerated 2718, outscore does not ask for a second regeneration.

Deltas are against the unmodified run. The floor's own deltas, for the row M28 already measured, are +479 / +461, +590 / −1446, and −76 / −684.

### Regression

Winnable majors speed conquest up. Claims are ports changing hands. Power is `factionPower`. Verdant Cay is neutral at tick 400 and tick 1200 on every row below, and on every stacked run. No variant colonizes it. "All three" means the three faction ports. It does not include Verdant Cay.

| Rule | Seed | Claims | World Government at 400 | Free Tide power at 400 | World Government at 1200 | Free Tide power at 1200 | Holds every faction port at 1200 |
| --- | ---: | ---: | --- | ---: | --- | ---: | --- |
| Unchanged | 1847 | 13 | Crown Harbor, 3276.92 | 1668.52 | All three, 4869.27 | 2941.56 | Yes |
| Unchanged | 2718 | 12 | Cinder Key, Crown Harbor, 2988.03 | 1853.79 | Cinder Key, Glassport, 5298.33 | 3263.89 | No |
| Unchanged | 4096 | 9 | Cinder Key, Crown Harbor, 3053.99 | 1349.41 | All three, 5936.33 | 1660.6 | Yes |
| Ratio | 1847 | 16 | Crown Harbor, 3282.64 | 1719.37 | Cinder Key, Crown Harbor, 4678.11 | 3684.74 | No |
| Ratio | 2718 | 19 | Cinder Key, Crown Harbor, 3025.98 | 1902.03 | Crown Harbor, 5339.11 | 3505.54 | No |
| Ratio | 4096 | 15 | Crown Harbor, 2913.01 | 1791.32 | Cinder Key, 5350.76 | 3301.67 | No |
| Outscore | 1847 | 25 | Crown Harbor, 3276.92 | 1668.52 | Cinder Key, 4549.69 | 4316.59 | No |
| Outscore | 2718 | 16 | Cinder Key, Crown Harbor, 2988.03 | 1853.79 | Cinder Key, Crown Harbor, 5506.1 | 3281.71 | No |
| Outscore | 4096 | 18 | Crown Harbor, 2941.85 | 1807.25 | Cinder Key, Crown Harbor, 5174.96 | 3389.52 | No |
| Fed floor | 1847 | 14 | Crown Harbor, 3276.92 | 1668.52 | Crown Harbor, Glassport, 4666.61 | 3680.62 | No |
| Fed floor | 2718 | 15 | Cinder Key, Crown Harbor, 2988.03 | 1853.79 | Glassport, 5160.42 | 2857.97 | No |
| Fed floor | 4096 | 8 | Cinder Key, Crown Harbor, 2969.39 | 1296.17 | Crown Harbor, Glassport, 5759.24 | 2530.43 | No |
| Rest refund | 1847 | 17 | Crown Harbor, 3303.48 | 1721.21 | Crown Harbor, 4737.64 | 3886.64 | No |
| Rest refund | 2718 | 11 | All three, 3187.29 | 1209.61 | Glassport, 4733.35 | 3953.2 | No |
| Rest refund | 4096 | 14 | Cinder Key, Crown Harbor, 3161.13 | 1766.42 | Cinder Key, Crown Harbor, 5976.33 | 3085.03 | No |
| Anchor | 1847 | 11 | Crown Harbor, 3339.61 | 1737.4 | Cinder Key, 4110.06 | 3295.4 | No |
| Anchor | 2718 | 11 | Cinder Key, Crown Harbor, 2944.42 | 1745.87 | All three, 5520.42 | 2814.74 | Yes |
| Anchor | 4096 | 9 | Cinder Key, Crown Harbor, 3142.51 | 1399.11 | All three, 6133.69 | 1552.19 | Yes |
| Buy gate | 1847 | 13 | Crown Harbor, Glassport, 3219.04 | 1689.82 | All three, 4654.03 | 2928.62 | Yes |
| Buy gate | 2718 | 9 | All three, 3132.83 | 1348.32 | Crown Harbor, 5357.23 | 3195.93 | No |
| Buy gate | 4096 | 9 | Crown Harbor, Glassport, 3312.07 | 1583.25 | All three, 5434.21 | 2604.92 | Yes |

Today's run already ends with World Government holding every faction port on 1847 and 4096. Free Tide's power is still large, because the captains are alive. The ports are not. Outscore reverses that end on both seeds. Free Tide holds Crown Harbor and Glassport on 1847, and Glassport on 4096. World Government's power stays in the same band. It does not run away with the map.

The stack with the floor of 8 is the world this rule would actually enter, because M28 lands first. Outscore plus the floor, at tick 1200: Free Tide holds Cinder Key on 1847 (power 3752.09, World Government 4821.73 on Crown Harbor and Glassport), Cinder Key and Glassport on 2718 (3791.59, World Government 5664.88 on Crown Harbor), and nothing on 4096 (2987.11, World Government 5626.15 on all three). The 4096 loss is one tick old. The stretch opens at 1199. At tick 400 on that seed Free Tide holds both small ports. This is not a run that handed World Government the map at the start and kept it.

The cost of the stack is turnover. Outscore alone loses 0 ports within 5 ticks of a claim. Outscore plus the floor loses 7 on 1847, 1 on 2718, and 0 on 4096. The 2718 loss is the floor's own tick 35–36 retake, Mina Vale taking Cinder Key back the tick after Vale Drake's claim. The seven on 1847 are new:

| Port | Claimed | Lost | Gap | From | To |
| --- | ---: | ---: | ---: | --- | --- |
| Crown Harbor | 330 | 334 | 4 | Free Tide | World Government |
| Crown Harbor | 595 | 597 | 2 | Free Tide | World Government |
| Crown Harbor | 727 | 728 | 1 | World Government | Free Tide |
| Crown Harbor | 881 | 882 | 1 | World Government | Free Tide |
| Crown Harbor | 991 | 993 | 2 | Free Tide | World Government |
| Crown Harbor | 1101 | 1102 | 1 | World Government | Free Tide |
| Glassport | 1102 | 1104 | 2 | Free Tide | World Government |

Claims in that stacked run are 40, 19, and 19, against 13, 12, and 9 unmodified, and against 19, 16, and 17 for the floor alone. A won raid at garrison 8 leaves a battered port, the claim goes through, the other faction is landless, and the floor lets them raid back as soon as the port has 8 soldiers. The morale bug was hiding that swing. The floor alone loses one port that fast on each seed. Outscore is what multiplies it on 1847.

Two variants make the monopoly worse, and they are not the recommendation. Rest refund on 2718 has World Government holding all three faction ports at tick 400, Free Tide power 1209.61, and one portless stretch of 374 ticks (311–685). Upsets go from 5 to 19. Anchor on 2718 and 4096 ends at tick 1200 with Free Tide holding nothing. Buy gate does the same on 1847 and 4096, and on 2718 Free Tide is already at nothing by tick 400. Feeding the crew, or letting them buy a fraction of a unit, does not stop the false defeat, and on these seeds it feeds the side that already has the ports.

## Recommendation

Take outscore. Leave the +3 morale gain, the buy gate of 1, the rest refund, and anchor resupply alone.

Outscore clears all 21 false defender victories. It is hash-neutral through tick 72 on today's tree, and it is hash-neutral through tick 72 against the floor of 8 as well. M28 can regenerate 2718 first. This rule does not ask for another golden update. It does not add an event type. The capture roll today's loss already draws is still drawn and ignored.

It does not shorten the early portless waits. Those are the garrison gate, and M28 is the rule for them. It does stop the late pattern the portless note found under the floor: a raid at garrison 8, a higher attacker score, a defender victory at morale 3, and a port left at 6. Under outscore that raid is an attacker victory, and surrender can be offered when garrison and stability already qualify.

Ratio also clears the blowouts, and with the floor it ping-pongs less: one fast loss, the tick 35 retake M28 already accepts. It misses the close fight at ratio 1.442, and it rewrites phase morale inside the fixture at tick 19 and tick 23. That moves the 1847 hash and replaces M28's 2718 hash. The count can stay the same while the hash moves, which is the awkward fixture case. It is the wrong order if M28 lands first.

Fed floor is hash-neutral and leaves the empty-hold losses in place, including 1847's 71-tick late stretch under the floor. Rest refund and anchor are hash-neutral and make the map more one-sided. The buy gate moves 2718 and 4096 inside 72 ticks and does not clear the upsets.

Resupply at anchor stays the open follow-up in the progress log. The shelves are under 1 because `buy-provisions` bought them out, the fields are covering the port's own ration, and the 16% depth cap is not what traps the captains. An automatic ration made the false defeats more common. It is a separate decision.

## Tests

`npm run golden:update` stays unrun. The fixture already matches.

- `tests/combat.test.ts`, or a new case beside the major-battle tests. A major that ends at morale ≤ 12, with troops at least 8, health above 15, and a higher attacker score, resolves `attacker-victory`. Surrender is offered when garrison and stability already pass `surrenderStabilityLimit`. The same setup with a lower attacker score stays `defender-victory`.
- The flipped victory still consumes one `rng.next()` before `completeMajorBattle` returns, the draw `attemptCapture` would have used. A later event's roll matches the defeat path's next draw. No `rng` call is added on a battle that was already an attacker victory.
- An immediate battle is unchanged: the winner is still the higher score, and morale 0 does not flip it.
- `tests/golden.test.ts`. "pinned seeds reproduce their committed state hash and event count" stays on `d7eb02eb…`, `d0b4b449…`, `d5d9da8b…` (8275, 8489, 8003). If this lands after M28, 2718 stays on M28's hash instead. Outscore does not move that hash either.
- The empty-hold gate stays. `buy-provisions` is still scored −1000 when the shelf is under 1. This milestone does not feed the crew.

## Playtest

Follow `docs/playtests/TEMPLATE.md`. Dashboard HTTP JSON only, as in [portless recovery](portless-recovery.md#playtest). Seed 4096, Mara Vane (`character-01`), ticks 0–310. No survey, no raid, no other command. She starts at Crown Harbor. The fight under test is Esme Dusk's, not hers.

**Hypothesis.** Esme Dusk's Glassport battle at event tick 298 resolves as an attacker victory. The scores stay 192.971 / 48.5. She is not captured from that battle. Ticks 0–72 are the fixture.

**Ambition.** Stay at Crown Harbor and read the log.

**Success.** The log has `battle-resolved` for `glassport` at tick 298, Esme Dusk, outcome `attacker-victory`, attacker score 192.971, defender score 48.5. It does not have `character-captured` for her from that battle. No new event type appears.

`PROMOTE` if that battle is an attacker victory and the tick-72 hash is still `d5d9da8b…`. `REVISE` if the outcome is still `defender-victory`, or if garrison 13 offers surrender when stability is above the limit. `ABANDON` if the tick-72 hash moves. The 1847 close fight at tick 550, scores 245.349 / 236.624, garrison left 140, is the check that a higher score does not hand over a town that still has far more than 15 soldiers. It is not part of this session.

The floor stack is M28's playtest plus one extra read, only if both rules are on the branch. On seed 1847, Crown Harbor is claimed at 330 and lost at 334. `REVISE` the stack, not this rule, if that four-tick loss is rejected. This session does not run the stack.

## Questions for Micah

1. **A big fight can end after one round because the captain's morale is 12 or lower, even when their side outfought the town. Should that count as their victory?** Default: yes. The town can still surrender only under the existing garrison and stability rules. Today it is recorded as the town's victory, the captain may be captured, and no surrender is offered. On these runs that happened 8, 5, and 8 times, first at ticks 550, 620, and 298.
2. **Does that include a close fight, such as 245 against 237, or only a lopsided one?** Default: any higher score. The close fight leaves Crown Harbor with about 140 soldiers, so it does not change hands. The lopsided ones are the ones that take a small port. Requiring a wide margin leaves the 1.44-ratio fight as a town victory and rewrites morale inside the first 72 ticks if the margin is applied by scaling the +3.
3. **M28 lets a faction with no port attack a town of 8 soldiers, and it lands first. With this victory rule, Crown Harbor on seed 1847 changes hands seven times within five ticks. Is that acceptable?** Default: yes. The short retake is the floor working once the attack can actually win. The floor alone already has one fast loss on each seed. Rejecting the seven means keeping a won fight as a loss, or adding a hold the portless note already measured and did not take.
4. **Should resting, or standing at a port, refill the hold from the shelf?** Default: no, not in this change. The shelf is under one unit because captains bought it out. The port's own fields are covering its ration. An automatic purchase, tried here as one ration for autonomous parties, raised the false defeats from 8 to 17 on seed 1847 and left Free Tide with no port at tick 1200 on the other two seeds. The open note about resupplying at anchor stays open. An idle player who never orders food still starves.
5. **The capture die that today's loss would have rolled is still rolled and ignored. Should it be?** Default: yes. Later luck stays aligned until the victory itself changes the world. No new event is added. Skipping the die would move every later roll on that seed.

## Re-measured when the rule landed

This section is the rule on `main` at `ef81bf3`, which already has M28. It is not one of the patched runs above. Node v24.21.0, ICU 78.3. `createPrototypeWorld` plus `runTick`, no player commands, 1200 ticks. `npm run golden:update` was not run.

The tick-72 golden test still matches `tests/fixtures/golden-hashes.json`:

| Seed | State hash | Events |
| ---: | --- | ---: |
| 1847 | `cb04ba5d392d8b1c868cc97e54cb21b21ec171edd546bb70d0d7aba86cc69c11` | 8301 |
| 2718 | `bd7d8cc44d5fa21022ecb8f8086e13dfbb9475eb025b5ae53f87e2991f90035c` | 8513 |
| 4096 | `20975bf480e5aa11eeafe1ce39c36cf5ba0fa8e2d5de2bb5887a35d7b3aecc9f` | 8031 |

Recovery replayed 572 events. The first baseline upset is event tick 498 / 517 / 475, all after tick 72.

An upset is a major `battle-resolved` whose outcome is `defender-victory` and whose attacker score is higher. That is the note's count. On this build, over 1200 ticks, that count is 21 / 16 / 13, not 8 / 5 / 8. Every row is phase 1, morale at most 12, troops at least 8, health above 15, and garrison not 0. With the rule on, the same census is 0 / 0 / 0. The 8 / 5 / 8 figure is the census from the runs above, taken while the raid gate stayed at 15. M28 lets a landless faction raid at 8, and those raids are what multiply the morale-ended majors inside this horizon.

The new outcome on every row is `attacker-victory`. Once the rule is on, only the first cluster still happens with the same scores. Later rows are fights the new world does not reach.

### 1847 — 21

| Tick | Settlement | Attacker | Defender | Old outcome | New outcome | Scores | Morale | Garrison left |
| ---: | --- | --- | --- | --- | --- | --- | ---: | ---: |
| 498 | Glassport | Corin Hale (Free Tide Compact) | World Government | defender-victory | attacker-victory | 351.601 / 35.609 | 3 | 10 |
| 498 | Glassport | Dax Pike (Free Tide Compact) | World Government | defender-victory | attacker-victory | 335.311 / 30.613 | 3 | 8 |
| 498 | Glassport | Mara Calder (Free Tide Compact) | World Government | defender-victory | attacker-victory | 203.414 / 31.632 | 5.276 | 6 |
| 594 | Crown Harbor | Pax Ash (Free Tide Compact) | World Government | defender-victory | attacker-victory | 485.298 / 48.248 | 3.788 | 12 |
| 665 | Glassport | Corin Hale (Free Tide Compact) | World Government | defender-victory | attacker-victory | 359.841 / 32.536 | 3 | 12 |
| 704 | Crown Harbor | Niko Wren (World Government) | Free Tide Compact | defender-victory | attacker-victory | 253.155 / 63.253 | 3 | 12 |
| 722 | Glassport | Mara Calder (Free Tide Compact) | World Government | defender-victory | attacker-victory | 314.981 / 42.062 | 5.19 | 12 |
| 737 | Crown Harbor | Iris Stone (World Government) | Free Tide Compact | defender-victory | attacker-victory | 304.082 / 43.92 | 3 | 12 |
| 869 | Crown Harbor | Finn Frost (Free Tide Compact) | World Government | defender-victory | attacker-victory | 422.18 / 68.459 | 3 | 12 |
| 950 | Glassport | Jun Marrow (World Government) | Free Tide Compact | defender-victory | attacker-victory | 221.985 / 33.252 | 6.142 | 12 |
| 1001 | Crown Harbor | Orin Rill (World Government) | Free Tide Compact | defender-victory | attacker-victory | 374.081 / 51.046 | 3 | 12 |
| 1007 | Glassport | Iris Stone (World Government) | Free Tide Compact | defender-victory | attacker-victory | 317.76 / 46.937 | 4.696 | 12 |
| 1064 | Glassport | Rook Tern (World Government) | Free Tide Compact | defender-victory | attacker-victory | 472.902 / 32.655 | 3 | 12 |
| 1085 | Cinder Key | Pax Ash (Free Tide Compact) | World Government | defender-victory | attacker-victory | 660.739 / 34.303 | 3 | 12 |
| 1122 | Crown Harbor | Bram Tern (Free Tide Compact) | World Government | defender-victory | attacker-victory | 387.422 / 59.925 | 3 | 12 |
| 1129 | Cinder Key | Mina Vale (Free Tide Compact) | World Government | defender-victory | attacker-victory | 350.452 / 27.146 | 3 | 10 |
| 1129 | Cinder Key | Corin Hale (Free Tide Compact) | World Government | defender-victory | attacker-victory | 570.495 / 24.558 | 3 | 8 |
| 1129 | Cinder Key | Esme Dusk (Free Tide Compact) | World Government | defender-victory | attacker-victory | 329.083 / 26.28 | 3 | 6 |
| 1159 | Glassport | Finn Frost (Free Tide Compact) | World Government | defender-victory | attacker-victory | 426.88 / 28.152 | 3 | 6 |
| 1178 | Cinder Key | Esme Dusk (Free Tide Compact) | World Government | defender-victory | attacker-victory | 389.307 / 22.555 | 3.04 | 6 |
| 1197 | Glassport | Bram Tern (Free Tide Compact) | World Government | defender-victory | attacker-victory | 524.566 / 36.219 | 3 | 6 |

The three Glassport rows at tick 498 are the same fight in the with-rule run, same scores, `defender-victory` to `attacker-victory`. Pax's Crown Harbor row at 594 does not recur. The with-rule battle at that tick is a different roll, 487.975 / 63.62, still an attacker victory at morale 3.49, garrison 12.

### 2718 — 16

| Tick | Settlement | Attacker | Defender | Old outcome | New outcome | Scores | Morale | Garrison left |
| ---: | --- | --- | --- | --- | --- | --- | ---: | ---: |
| 517 | Cinder Key | Pax Ash (Free Tide Compact) | World Government | defender-victory | attacker-victory | 410.305 / 29.846 | 8.085 | 9 |
| 539 | Crown Harbor | Pax Ash (Free Tide Compact) | World Government | defender-victory | attacker-victory | 420.967 / 200.822 | 7.78 | 100 |
| 694 | Crown Harbor | Vale Drake (World Government) | Free Tide Compact | defender-victory | attacker-victory | 665.6 / 50.741 | 3 | 7 |
| 856 | Cinder Key | Pax Ash (Free Tide Compact) | World Government | defender-victory | attacker-victory | 586.141 / 23.61 | 3 | 6 |
| 856 | Crown Harbor | Mara Calder (Free Tide Compact) | World Government | defender-victory | attacker-victory | 213.205 / 45.346 | 9.467 | 9 |
| 982 | Glassport | Pax Ash (Free Tide Compact) | World Government | defender-victory | attacker-victory | 511.816 / 29.358 | 3.04 | 9 |
| 982 | Cinder Key | Mina Vale (Free Tide Compact) | World Government | defender-victory | attacker-victory | 258.826 / 25.319 | 10.991 | 8 |
| 982 | Cinder Key | Corin Hale (Free Tide Compact) | World Government | defender-victory | attacker-victory | 439.132 / 24.298 | 3 | 6 |
| 982 | Glassport | Dax Pike (Free Tide Compact) | World Government | defender-victory | attacker-victory | 361.667 / 28.776 | 3.04 | 7 |
| 988 | Glassport | Zara Gale (Free Tide Compact) | World Government | defender-victory | attacker-victory | 132.253 / 35.728 | 3.661 | 6 |
| 1001 | Crown Harbor | Finn Frost (Free Tide Compact) | World Government | defender-victory | attacker-victory | 443.166 / 44.718 | 6.49 | 6 |
| 1023 | Crown Harbor | Corin Hale (Free Tide Compact) | World Government | defender-victory | attacker-victory | 472.832 / 43.303 | 4.89 | 6 |
| 1023 | Cinder Key | Esme Dusk (Free Tide Compact) | World Government | defender-victory | attacker-victory | 328.487 / 19.306 | 3.744 | 6 |
| 1026 | Glassport | Pax Ash (Free Tide Compact) | World Government | defender-victory | attacker-victory | 463.469 / 35.919 | 5.89 | 6 |
| 1177 | Crown Harbor | Vale Drake (World Government) | Free Tide Compact | defender-victory | attacker-victory | 496.59 / 45.272 | 10.675 | 12 |
| 1197 | Glassport | Pax Ash (Free Tide Compact) | World Government | defender-victory | attacker-victory | 706.34 / 31.681 | 10.701 | 12 |

Only Pax at Cinder Key, tick 517, is the same fight after the rule.

### 4096 — 13

| Tick | Settlement | Attacker | Defender | Old outcome | New outcome | Scores | Morale | Garrison left |
| ---: | --- | --- | --- | --- | --- | --- | ---: | ---: |
| 475 | Glassport | Pax Ash (Free Tide Compact) | World Government | defender-victory | attacker-victory | 511.279 / 26.305 | 3 | 6 |
| 513 | Glassport | Corin Hale (Free Tide Compact) | World Government | defender-victory | attacker-victory | 341.006 / 29.304 | 3 | 6 |
| 595 | Crown Harbor | Esme Dusk (Free Tide Compact) | World Government | defender-victory | attacker-victory | 337.824 / 294.135 | 11.63 | 143 |
| 775 | Cinder Key | Corin Hale (Free Tide Compact) | World Government | defender-victory | attacker-victory | 353.136 / 31.757 | 3 | 12 |
| 782 | Cinder Key | Esme Dusk (Free Tide Compact) | World Government | defender-victory | attacker-victory | 313.531 / 24.685 | 3.84 | 9 |
| 858 | Crown Harbor | Finn Frost (Free Tide Compact) | World Government | defender-victory | attacker-victory | 386.113 / 154.899 | 5.95 | 85 |
| 950 | Glassport | Pax Ash (Free Tide Compact) | World Government | defender-victory | attacker-victory | 464.65 / 32.212 | 3.216 | 12 |
| 1068 | Cinder Key | Vale Drake (World Government) | Free Tide Compact | defender-victory | attacker-victory | 235.348 / 30.127 | 3 | 9 |
| 1068 | Cinder Key | Orin Rill (World Government) | Free Tide Compact | defender-victory | attacker-victory | 393.714 / 20.212 | 3 | 7 |
| 1179 | Glassport | Niko Wren (World Government) | Free Tide Compact | defender-victory | attacker-victory | 296.858 / 29.139 | 3 | 9 |
| 1179 | Glassport | Sable Morrow (World Government) | Free Tide Compact | defender-victory | attacker-victory | 354.026 / 26.739 | 3 | 7 |
| 1179 | Cinder Key | Orin Rill (World Government) | Free Tide Compact | defender-victory | attacker-victory | 382.693 / 30.49 | 11.56 | 9 |
| 1179 | Cinder Key | Kessa Calder (World Government) | Free Tide Compact | defender-victory | attacker-victory | 524.935 / 25.229 | 3 | 7 |

Only Pax at Glassport, tick 475, is the same fight after the rule. Esme's tick 298 Glassport battle from the older playtest is not this tree.

### Crown Harbor ownership, seed 1847, 1200 ticks

A change is a `settlement-claimed` on `crown-harbor`. Before the rule, 8. After the rule, 20. The claims at 330, 334, 364, and 498 are the same in both runs. The rule's first same-fight flips are at Glassport on tick 498, and Niko Wren's Crown Harbor claim on that tick does not move.

| Tick | Who | From | To |
| ---: | --- | --- | --- |
| 330 | Pax Ash | World Government | Free Tide Compact |
| 334 | Iris Stone | Free Tide Compact | World Government |
| 364 | Pax Ash | World Government | Free Tide Compact |
| 498 | Niko Wren | Free Tide Compact | World Government |
| 628 | Zara Gale | World Government | Free Tide Compact |
| 773 | Vale Drake | Free Tide Compact | World Government |
| 905 | Bram Tern | World Government | Free Tide Compact |
| 1044 | Lio Crow | Free Tide Compact | World Government |

After the rule:

| Tick | Who | From | To |
| ---: | --- | --- | --- |
| 330 | Pax Ash | World Government | Free Tide Compact |
| 334 | Iris Stone | Free Tide Compact | World Government |
| 364 | Pax Ash | World Government | Free Tide Compact |
| 498 | Niko Wren | Free Tide Compact | World Government |
| 595 | Pax Ash | World Government | Free Tide Compact |
| 597 | Iris Stone | Free Tide Compact | World Government |
| 609 | Zara Gale | World Government | Free Tide Compact |
| 727 | Niko Wren | Free Tide Compact | World Government |
| 728 | Finn Frost | World Government | Free Tide Compact |
| 815 | Niko Wren | Free Tide Compact | World Government |
| 848 | Pax Ash | World Government | Free Tide Compact |
| 881 | Niko Wren | Free Tide Compact | World Government |
| 882 | Finn Frost | World Government | Free Tide Compact |
| 892 | Sable Morrow | Free Tide Compact | World Government |
| 991 | Pax Ash | World Government | Free Tide Compact |
| 993 | Sable Morrow | Free Tide Compact | World Government |
| 1002 | Finn Frost | World Government | Free Tide Compact |
| 1101 | Sable Morrow | Free Tide Compact | World Government |
| 1102 | Finn Frost | World Government | Free Tide Compact |
| 1189 | Sable Morrow | Free Tide Compact | World Government |
