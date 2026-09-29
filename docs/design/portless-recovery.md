# Portless recovery

**Status: Open.** Proposal for the owner to accept, change, or reject. Current code is `main` at `fef137b286bec0d7ee1e96fe88f8ee420ca5b653`, merged into this branch. The diagnosis below was written on `8c93912`. The stretch table, the no-floor runs, and the tick-400 and tick-1200 event deltas were run again on the merge and match. The purse waiver, the no-floor raid, and the alternatives below were patched in locally to measure them, then removed. This note is not decided until it moves into [world simulation](world-simulation.md). It builds on [landless faction](landless-faction.md): a faction with no ports remains, and the next port comes back by the existing claim.

Runs are `createPrototypeWorld` plus `runTick`, no player commands, seeds 1847 / 2718 / 4096, 1200 ticks, Node v24.21.0, ICU 78.3. Tick numbers on events are the `tick` field. A zero stretch runs from the claim that removes the last port until the claim that returns one. `npm test` on this tree passes, 176 tests. The 72-tick hashes match `tests/fixtures/golden-hashes.json` (`d7eb02eb…`, `d0b4b449…`, `d5d9da8b…`; 8275, 8489, 8003 events). The merge did not move that fixture. M24 did not move the 400-tick fortunes recorded for M22: World Government then Free Tide power 3276.92 / 1668.52, 2988.03 / 1853.79, 3053.99 / 1349.41.

## The problem

M22 scores an autonomous voyage at −1000 when `quotedPassage` says the purse cannot cover it (`buildCandidates` in `src/sim/engine.ts`). The lead's 400-tick histories were the same after M24, and the long Free Tide gaps were ticks 77–231, 311–383, and 77–324. Re-measured here, those three are intact, and they are not the only gaps.

| Seed | Stretches through tick 1200 | Still open at 1200 |
| ---: | --- | --- |
| 1847 | 77–231 (154), 561–609 (48), 764–934 (170) | 1126 onward (74 ticks so far) |
| 2718 | 35–48 (13), 311–383 (72), 555–782 (227), 1088–1147 (59) | None |
| 4096 | 51–54 (3), 77–324 (247), 478–499 (21) | 932 onward (268 ticks so far) |

World Government does not hit zero in these 1200 ticks. The returns on the three stretches the lead named are Pax Ash (`character-14`) at Glassport, garrison 6, tick 231; Mina Vale (`character-15`) at Glassport, garrison 6, tick 383; Mina Vale at Glassport, garrison 7, tick 324.

## What the long stretches are waiting on

The raid candidate in `buildCandidates` requires a hostile held port, a faction, `troops.count >= 25`, `settlement.garrison >= 15`, `lastBattleTick` at least 18 ticks ago, and no battle already open there. Surrender, in `resolveImmediateBattle` and `completeMajorBattle`, runs only after an attacker victory, and only when garrison is still at most 15 and stability is at or below `surrenderStabilityLimit` (`src/sim/state.ts`). `garrisonRegrowth`, called from `produceSettlements` before anyone decides, adds one soldier on a fed port under its population ceiling when the world tick is a positive multiple of `max(6, round(200000 / population))`. Glassport's interval is 19. Cinder Key's is 31. `runTick` grows the garrison before it builds candidates, so a raid on a growth tick sees the new soldier.

There is no wage from the treasury. `workGross` pays the character. `tradeTax` adds the tax to the faction that holds the settlement, on `worked` and on a sale. While Free Tide holds nothing, that tax is zero and the treasury does not move. Recruit spends the personal purse, `quantity * 12`, in `resolveDecision`. Passage is `PASSAGE_COST_PER_TICK` (3) on `character-upkeep`, and only while already at sea.

### Seed 1847, ticks 77–231

Iris Stone claims Glassport at tick 77, garrison 7, stability reset to 55. Cinder Key is already garrison 8. Crown Harbor is 257. Glassport then gains on its interval: 8, 9, 10, 11, 12, 13, 14 at ticks 95, 114, 133, 152, 171, 190, 209. Tick 228 is the eighth gain. `battle-started` that tick names Pax Ash, garrison 15, 93 troops. The major battle (`isMajorBattle` in `src/sim/combat.ts`) resolves at tick 230: attacker score 270.006, defender 30.445, garrison 6, stability 47.53, limit 80, surrender offered to Pax. He claims at tick 231.

Mara Calder is on that beach at tick 77 with 436 money and 36 troops. Dax Pike is beside her with 81 troops and 5 money. Neither can raid a garrison of 7. The purse is not what Mara is missing. Over the 154 ticks Free Tide's treasury stays 3363.89. Members work 418 times for gross 6722.82, of which tax 731.85 goes to the holder of the port they are standing in, net 5990.97. They recruit 85 times, spend 4536, and add 378 troops. Passage spent at sea is 1260. Decisions recorded on those ticks and on the return tick: work 420, trade-local 170, travel 154, recruit 85, buy-provisions 85, raid 4, rest 6, claim 1. The 418 work events above are the ticks the faction is still portless.

Of the decisions taken while standing on a hostile port, 523 are blocked by `garrison-under-15`, 111 are offered a raid, 66 fail `troops-under-25`, and 3 find a battle already open. Four offers are taken. Three are Crown Harbor. Dax's battle there starts at tick 189, garrison 235, and resolves a defender victory, attacker score 115.619 against 299.947, garrison 206. The fourth is Pax's Glassport battle at tick 228. The purse check refuses 33 voyages whose pre-gate score would have won: 15 to Glassport, 10 to Cinder Key, 6 to Verdant Cay, 2 to Crown Harbor. The samples are purses of 0 against a quote of 6 or 9, and the target garrison is 7 or 8. Arriving would still not open a raid.

### Seed 2718, ticks 311–383

Niko Wren claims Cinder Key at tick 311, garrison 5. Glassport is 11 and already has Free Tide characters on it with hundreds to thousands in the purse (Corin Hale 848, Esme Dusk 678, at tick 300). It gains at 323, 342, and 361 (12, 13, 14). Tick 380 starts Mina's major battle at garrison 15, 158 troops. It resolves at 382, garrison 6, surrender offered. She claims at 383. Treasury stays 6823.38. Work is 229 ticks, gross 3691.88, tax 509.2, net 3182.68. Recruit spends 3540. Passage is 315. The purse check refuses 1 voyage. The wait is four regrowth steps.

### Seed 4096, ticks 77–324

Iris Stone claims Glassport at tick 77, garrison 5. The beach is not empty: Mina has 36 troops and 675 money, and Dax is captive there. Garrison reaches 15 at tick 266 with no Free Tide character anchored. It is 16 at tick 285. Esme Dusk starts a battle at tick 298, garrison 16, 104 troops, and loses in one phase; the port ends at 13 and she is captive. Mina's immediate victory is tick 323, garrison 7, surrender offered. She claims at 324. Treasury stays 3304.48. Work is 940 ticks, gross 15677.08, tax 2102.71, net 13574.37. Recruit spends 4572. Passage is 1236.07. The purse check refuses 8 voyages. Regrowth is the bulk of the 247 ticks. The empty beach at tick 266, and Esme's loss, are the rest.

The two stretches still open at tick 1200 are the same gate. From tick 1126 on 1847 every faction port is under 15 (Crown Harbor 7, Cinder Key 12, Glassport 7), and 74 ticks is shorter than Glassport's climb from 7, so no raid has been offered yet. From tick 932 on 4096 the captains do reach garrison 15 and lose it back to 12: Pax at Glassport tick 1121, Finn at Cinder Key tick 1147, Mina at Glassport tick 1178. Cooldown is 18 and the climb from 12 is three intervals. They are still landless at tick 1200. Blocked voyages in that window: 6.

The binding constraint during the stretch is the garrison test. Troops on the retaking parties are 93, 158, and 32, all past 25. The planner raids on the tick the gate opens, on 1847 and 2718. Money is real for a broke captain who wants to sail, and it is not what sets the length: the captain who retakes is already ashore, and on 1847 another captain on that beach is holding 436.

## What M22 adds

Turning off only the −1000 travel score, and leaving M23 and M24 in place, reproduces the pre-M22 history. Tick-72 counts are 8338 / 8411 / 8298, hash prefixes `d3b79fce` / `03d6d4bc` / `a7cbf2a8`. Inside 400 ticks the zero stretches are 70–98 (28) and 375–400 on 1847, 32–55 (23) on 2718, and 210–280 (70) on 4096. Tick-400 power is 2960.5 / 1244.54, 2956.17 / 1470.13, 2982.44 / 1749.98, World Government then Free Tide, the M22 baseline column.

At those earlier losses Glassport is still garrison 56 (1847) and 73 (2718), so the raid gate is open and the port falls inside the stretch: Zara Gale claims it at tick 98, garrison 8; Mara Calder at tick 55, garrison 8. M22 moves the loss to a tick where both small ports are already under 15. The recovery is then the regrowth clock. That is 154 against 28, a new 72-tick stretch on 2718 where the old run had 23, and 247 against 70.

## Candidates

Five ways to shorten the stretch, weighed on the three seeds. None of the predicates calls `rng`. A battle that then happens uses the draws `resolveImmediateBattle` and `resolveBattlePhase` already make.

**A. Waive the purse check while the faction holds no port.** The −1000 score is skipped when `factionHasPort` is false. Sea ticks still charge `min(money, 3)`. No new event.

Measured stretches for the lead's three gaps: 1847 stays 77–232 (155 ticks). 4096 becomes 77–269 (192). On 2718 the 311–383 gap does not occur, because the waiver fires at the tick-35 loss and the campaign diverges. At tick 400 Free Tide holds nothing. At tick 1200 it still holds nothing. Tick-72 hash on 2718 moves to `7229fe81…`, 8452 events. Seeds 1847 and 4096 stay on the fixture through tick 72, since their first long gap starts at 77.

**B. Let the treasury buy the passage.** Free Tide's treasury is 3363.89, 6823.38, and 3304.48 at the three losses, against quotes of 6 to 15. A treasury that pays those quotes is a narrower version of A: it creates the same voyages, and it also moves money, which A does not. A was measured. The 1847 wait stayed a full regrowth. Paying from the treasury was not given its own 1200-tick run.

**C. Prefer the nearest weak port in the planner.** `planActionBoost` (`src/sim/agency.ts`) already boosts travel toward the standing order's target. The raid is still unbuilt while garrison is under 15. On 1847 the retake starts the tick Glassport hits 15, with five Free Tide characters already there. A higher travel score does not open the gate. Not run as its own patch.

**D. A troop floor.** The retaking parties are already past 25. Decisions lost to `troops-under-25` are 66 against 523 lost to the garrison test, on the 1847 stretch. Not run.

**E. Let a landless faction raid a hostile port under garrison 15.** In `buildCandidates`, the garrison test becomes `settlement.garrison >= 15 ||` the attacker has a faction and that faction holds no settlement. Troops, cooldown, hostility, and the open-battle check stay. Surrender, the claim, and regrowth stay. No new event.

| Seed | Lead's gap, now | Other zero stretches in 1200 ticks |
| ---: | --- | --- |
| 1847 | 77–78 (1). Dax raids to garrison 3, Mara Calder to 1, both on tick 77. Mara claims tick 78, garrison 1 | 592–595 (3), 1136–1137 (1) |
| 2718 | The 311 gap does not occur. The tick-35 loss returns at tick 36 (1). Four raids on that tick take Cinder Key from 14 to 6, 2, 1, and 0. Mara claims tick 36, garrison 0 | 514–518 (4), 905–906 (1), 1037–1040 (3) |
| 4096 | 77–78 (1). Mina raids to garrison 2 and claims tick 78. The tick 51–54 gap stays 3, because Glassport is already above 15 | 647–648 (1), 947–948 (1) |

At tick 1200 Free Tide holds Cinder Key and Glassport on 1847 (power 2980.8, treasury 13446.39), Crown Harbor and Glassport on 2718 (3928.19, 14574.29), and Crown Harbor and Glassport on 4096 (3410.66, 14352.89). The baseline at tick 1200 has Free Tide portless on 1847 and 4096. World Government's zero stretches under this rule are 1041–1043 on 1847 and 858–860 on 4096. Claims in 1200 ticks are 15, 17, and 19, against 13, 12, and 9. `battle-resolved` counts rise by 19, 22, and 20.

## Measured alternatives

No-floor, the rule in E above, is the reference row. The Lead rejected it. Four more rules were run on the same three seeds. The letters A–D in this section are these four rules. They are not the A–E in Candidates. None of them adds an event type or an RNG call. The battle they unlock uses the draws `resolveImmediateBattle` and `resolveBattlePhase` already make.

**A. Landless floor at 5.** When the attacker's faction holds no port, the garrison test is `settlement.garrison >= 5` instead of `>= 15`. Troops `>= 25`, the 18-tick cooldown, hostility, and the open-battle check stay. A faction that still holds a port is unchanged.

**B. Landless floor at 8.** The same predicate with `>= 8`.

**C. Attacker-relative floor.** When the faction is landless, the raid is allowed if `troops.count >= 2 * garrison`. The `troops >= 25` test still applies, and `garrison >= 15` still opens a raid for a faction that holds a port. A landless faction can also still raid at garrison 15 or more without the 2× test.

**D. B plus a claim garrison.** On every successful claim, not only a landless retake, the claimant leaves `max(0, min(troops − 25, 10))` soldiers in the port. The 25 is the existing raid troop gate, so the captain keeps a party that can raid. The 10 is the cap. The clamp at 0 is there so a captain with 25 or fewer troops does not gain any. Those soldiers are added to the garrison the fight left and subtracted from the claimant's troops. `resolveSettlementClaim` already records `garrison` and does not move troops; there is no other transfer in that function. The post-deposit garrison is what the existing `settlement-claimed` event records. The event also carries `garrisonBefore`, `troopsLeftBehind`, and `attackerTroops`. `applyEvent` writes the garrison and the troop count when `troopsLeftBehind` is present, or a replay would keep the pre-claim numbers. That is the same event type.

A second deposit, capped so the recorded garrison stays at most 14, was run as a check on that formula. It is not a separate proposal. The same uncapped deposit was also run with today's gate left at 15, so the deposit can be seen without B.

A stack tick is a tick on which two or more `decision-made` events have goal `raid` against the same settlement. The max is the largest such group. The unchanged run already has one stack tick on each seed, inside the ordinary gate: tick 69 on 1847 (Cinder Key, Niko Wren and Jun Marrow), tick 42 on 2718 (Glassport, Mina Vale, Dax Pike, and Mara Calder), and tick 37 on 4096 (Cinder Key, Jun Marrow and Orin Rill). The counts below include whichever of those ticks still happen.

| Rule | Seed | Landless stretches | Open at 1200 | Ports at 400 | Ports at 1200 | Claims at garrison 0 | Stack ticks | Max stack |
| --- | ---: | --- | --- | --- | --- | ---: | ---: | ---: |
| Unchanged | 1847 | 77–231 (154), 561–609 (48), 764–934 (170) | 1126 onward (74) | 2, Cinder Key and Glassport | 0 | 0 | 1 | 2 |
| Unchanged | 2718 | 35–48 (13), 311–383 (72), 555–782 (227), 1088–1147 (59) | None | 1, Glassport | 1, Crown Harbor | 0 | 1 | 3 |
| Unchanged | 4096 | 51–54 (3), 77–324 (247), 478–499 (21) | 932 onward (268) | 1, Glassport | 0 | 0 | 1 | 2 |
| No-floor | 1847 | 77–78 (1), 592–595 (3), 1136–1137 (1) | None | 1, Cinder Key | 2, Cinder Key and Glassport | 1 | 6 | 4 |
| No-floor | 2718 | 35–36 (1), 514–518 (4), 905–906 (1), 1037–1040 (3) | None | 2, Cinder Key and Glassport | 2, Crown Harbor and Glassport | 1 | 6 | 4 |
| No-floor | 4096 | 51–54 (3), 77–78 (1), 647–648 (1), 947–948 (1) | None | 1, Cinder Key | 2, Crown Harbor and Glassport | 1 | 4 | 5 |
| A, floor 5 | 1847 | 77–78 (1), 307–308 (1), 681–682 (1), 806–810 (4), 1013–1014 (1) | None | 1, Cinder Key | 2, Crown Harbor and Glassport | 0 | 6 | 4 |
| A, floor 5 | 2718 | 35–36 (1), 437–440 (3), 687–688 (1), 934–953 (19) | None | 1, Cinder Key | 1, Glassport | 0 | 3 | 4 |
| A, floor 5 | 4096 | 51–54 (3), 77–78 (1), 647–648 (1) | None | 1, Cinder Key | 1, Crown Harbor | 0 | 2 | 2 |
| B, floor 8 | 1847 | 77–80 (3), 334–364 (30), 498–501 (3) | 1129 onward (71) | 1, Crown Harbor | 0 | 0 | 3 | 3 |
| B, floor 8 | 2718 | 35–36 (1), 311–312 (1), 517–518 (1), 856–862 (6), 982–1048 (66) | None | 1, Glassport | 1, Crown Harbor | 0 | 2 | 2 |
| B, floor 8 | 4096 | 51–54 (3), 77–94 (17), 466–554 (88), 782–784 (2) | None | 2, Cinder Key and Glassport | 2, Cinder Key and Glassport | 0 | 3 | 2 |
| C, relative | 1847 | 77–78 (1), 592–595 (3), 1136–1137 (1) | None | 1, Cinder Key | 2, Cinder Key and Glassport | 1 | 6 | 4 |
| C, relative | 2718 | 35–36 (1), 514–518 (4), 905–906 (1), 1037–1040 (3) | None | 2, Cinder Key and Glassport | 2, Crown Harbor and Glassport | 1 | 6 | 4 |
| C, relative | 4096 | 51–54 (3), 77–78 (1), 647–648 (1), 947–948 (1) | None | 1, Cinder Key | 2, Crown Harbor and Glassport | 1 | 4 | 5 |
| D, B + deposit | 1847 | 210–211 (1), 364–365 (1), 462–463 (1), 524–525 (1), 872–875 (3), 1131–1134 (3), 1147–1157 (10) | None | 2, Crown Harbor and Glassport | 1, Glassport | 0 | 8 | 3 |
| D, B + deposit | 2718 | 35–36 (1), 63–64 (1), 280–281 (1), 283–284 (1), 559–560 (1), 685–688 (3), 761–764 (3), 768–784 (16), 788–836 (48), 840–842 (2), 953–955 (2), 1044–1049 (5), 1084–1090 (6) | None | 1, Cinder Key | 2, Crown Harbor and Glassport | 0 | 4 | 3 |
| D, B + deposit | 4096 | 51–54 (3), 58–61 (3), 66–76 (10), 478–479 (1), 597–598 (1), 600–608 (8), 704–705 (1), 710–711 (1), 820–823 (3), 1083–1084 (1), 1086–1087 (1), 1109–1110 (1), 1167–1168 (1) | None | 2, Cinder Key and Glassport | 2, Crown Harbor and Glassport | 0 | 7 | 4 |
| Deposit only, gate 15 | 1847 | 210–211 (1), 364–365 (1), 367–368 (1), 372–373 (1), 592–641 (49), 645–649 (4), 653–654 (1), 687–688 (1), 782–820 (38), 824–858 (34), 862–865 (3), 896–898 (2), 902–918 (16), 920–960 (40), 1018–1162 (144) | None | 2, Crown Harbor and Glassport | 1, Glassport | 0 | 0 | 0 |
| Deposit only, gate 15 | 2718 | 35–36 (1), 344–368 (24), 590–591 (1), 745–963 (218), 967–980 (13), 1175–1176 (1) | None | 1, Cinder Key | 1, Crown Harbor | 0 | 0 | 0 |
| Deposit only, gate 15 | 4096 | 51–54 (3), 58–61 (3), 66–76 (10), 478–573 (95), 577–654 (77), 716–778 (62), 782–785 (3), 790–840 (50), 877–933 (56), 935–1016 (81), 1081–1104 (23) | 1191 onward (9) | 2, Cinder Key and Glassport | 0 | 0 | 1 | 2 |

C matches no-floor on every figure above, and on the hashes and event counts below. Every landless raid in the no-floor run already had troops at least twice the garrison. The 2× test never refused one and never allowed a different one.

The garrison-0 claims are one each, all Cinder Key, all Free Tide: Dax Pike at tick 595 on 1847, Mara Calder at tick 36 on 2718, Bram Tern at tick 648 on 4096. The 2718 claim is the return from the tick-35 loss. The other two are later returns. A and the floor of 8 have none. The deposit runs have none either, and none of those claims had a pre-deposit garrison of 0. The fights did not empty the port. The add is what turns a remainder of 6 into 16.

| Rule | Seed | First differing event | 72-tick result | Delta at 400 | Delta at 1200 |
| --- | ---: | --- | --- | ---: | ---: |
| No-floor | 1847 | Tick 77, Dax Pike's `decision-made` on Glassport, `recruit` to `raid` | Fixture, 8275 (0) | −503 | −854 |
| No-floor | 2718 | Tick 35, Mina Vale's `decision-made` on Cinder Key, `work` to `raid` | `e1a7b2af4d10506fd5148e47b67fe02d5f65d9711146172aebd847bfb2665c64`, 8502 (+13) | +246 | −5180 |
| No-floor | 4096 | Tick 77, Mina Vale's `decision-made` on Glassport, `work` to `raid` | Fixture, 8003 (0) | +909 | +280 |
| A, floor 5 | 1847 | Tick 77, Dax Pike's `decision-made` on Glassport, `recruit` to `raid` | Fixture, 8275 (0) | −694 | −664 |
| A, floor 5 | 2718 | Tick 35, Mina Vale's `decision-made` on Cinder Key, `work` to `raid` | `a57ced2ada526239656eb15a3ece51afa556b7a8f65c616e562a08871a95caa7`, 8465 (−24) | −545 | −2676 |
| A, floor 5 | 4096 | Tick 77, Mina Vale's `decision-made` on Glassport, `work` to `raid` | Fixture, 8003 (0) | +909 | −474 |
| B, floor 8 | 1847 | Tick 79, Pax Ash's `decision-made` on Cinder Key, `trade-local` to `raid` | Fixture, 8275 (0) | +479 | +461 |
| B, floor 8 | 2718 | Tick 35, Mina Vale's `decision-made` on Cinder Key, `work` to `raid` | `edbface2f8d5f5e5ab3f03d59096b80d8d4a753097215f5174576ad80d3d8e98`, 8486 (−3) | +590 | −1446 |
| B, floor 8 | 4096 | Tick 93, Mina Vale's `decision-made` on Cinder Key, `trade-local` to `raid` | Fixture, 8003 (0) | −76 | −684 |
| C, relative | 1847 | Same event as no-floor | Fixture, 8275 (0) | −503 | −854 |
| C, relative | 2718 | Same event as no-floor | Same hash and 8502 (+13) | +246 | −5180 |
| C, relative | 4096 | Same event as no-floor | Fixture, 8003 (0) | +909 | +280 |
| D, B + deposit | 1847 | Tick 51, Finn Frost's `settlement-claimed` on Glassport, garrison 13 to 16, 3 troops left | `ca1dac0600f75bd35d2e3689b176985f095cbb98ca2b1dde6986fb431ed5c482`, 8275 (0) | −1411 | −6388 |
| D, B + deposit | 2718 | Tick 35, Vale Drake's `settlement-claimed` on Cinder Key, garrison 14 to 20, 6 troops left | `d1960e1dd2f3793bdbe7e2cb95e3d54c85babfabf71ec8ec21e8b4bd922bb638`, 8448 (−41) | −252 | −5171 |
| D, B + deposit | 4096 | Tick 51, Iris Stone's `settlement-claimed` on Cinder Key, garrison 6 to 16, 10 troops left | `af6390ab399e7649f71a8c4bd9e192df1117372146030fcb35aabe54b2741fe3`, 8014 (+11) | −1206 | −6841 |
| Deposit only, gate 15 | 1847 | Same claim as D, garrison 13 to 16 | Same 72-tick hash as D, 8275 (0) | −1386 | −7129 |
| Deposit only, gate 15 | 2718 | Same claim as D's first event, garrison 14 to 20 | `328e5274c06753b4fc6b309b3ad2bc013e07d1cb027fc678329407f60be2d534`, 8453 (−36) | −432 | −8256 |
| Deposit only, gate 15 | 4096 | Same claim as D, garrison 6 to 16 | Same 72-tick hash as D, 8014 (+11) | −1206 | −8520 |

Deltas are against the unchanged run. Event counts at 400 and 1200 on that run are 49265 / 162302, 50325 / 166064, and 49091 / 162558. A 72-tick count can match the fixture while the hash moves: D on 1847 still has 8275 events, and the claim's garrison field is what changed. Deposit-only on 2718 shares D's first event and then diverges inside the window, which is why its hash is not D's.

The capped deposit (result at most 14) also diverges inside 72 ticks on every seed. On 1847, Finn Frost's Glassport claim at tick 51 goes from 13 to 14 and leaves 1 troop. The hash is `62a9b0383425639f62ebc31322af37582777c39dfc09d5d0615cfd9707fa1d41`, 8296 events (+21). On 2718 the tick-35 claim is already at 14, so the deposit is 0 and the first difference is Mina Vale's `decision-made`, `work` to `raid`. The count stays 8489 and the hash does not: `597dc4592d23d5208a112a430c0c03490e7644a2ddde8016aeec53b33264348d`. On 4096, Iris Stone's Cinder Key claim at tick 51 goes from 6 to 14 and leaves 8. The hash is `9400dcef78660f7c6c5d017fd27eeafc27631641ddf6a3d01c89b3434385da71`, 8020 events (+17). Deltas at 400 / 1200 are −951 / −6298, +1184 / −7214, and −65 / −5174.

### What the stretches are

A and C do not make a landless faction wait. A's lead gaps are 77–78, 35–36, and 77–78. C's are the no-floor gaps. The port is already at or above 5, and the captains on the beach are already past 25, so the gate is open the tick the port is lost.

B waits only when every hostile port is under 8.

On 1847 the tick-77 loss leaves Glassport at 7, under the floor. Cinder Key is already at 8. Pax Ash raids it on tick 79 and claims it on tick 80 at garrison 3. The stretch is 77–80 (3), which is his arrival, not a regrowth climb. The 334–364 stretch (30) is a climb. Crown Harbor is at 5 when Free Tide goes landless, and it gains on its 11-tick interval: 6, 7, then 8 on tick 363. Pax claims it on tick 364 at garrison 3. The 498–501 stretch is 3 ticks. From 1129 the faction is still landless at tick 1200. Three captains start battles on Cinder Key that tick while it is still at or above 8 (Mina Vale, Corin Hale, Esme Dusk). All three lose, and the port ends at 6. Later raids, each opened on the tick Glassport or Cinder Key hits 8, also lose and leave 6. Crown Harbor climbs from 13 to 19 with no Free Tide captain standing on it. The floor is what blocks the next swing at garrison 6.

On 2718, Vale Drake's battle on tick 34 leaves Cinder Key at 14, and he claims it on tick 35. Mina Vale raids that same tick. Her fight ends at garrison 6, so Esme Dusk, Dax Pike, and Mara Calder, all on that beach, do not raid. She claims on tick 36 at garrison 6. The stretch is 1 tick, and it is not the four-captain drop to 0. The 311–312 and 517–518 gaps are the same shape, a port already at or above 8. The 982–1048 stretch (66) is the one that waits. Failed raids on tick 982 knock Glassport and Cinder Key back under 8. Further losses at 988, 1001, 1023, and 1026 reset a port from 8 to 6. Corin Hale's battle starts on tick 1045, resolves at garrison 3 on tick 1047, and she claims Crown Harbor on tick 1048.

On 4096, Glassport is lost at garrison 5 on tick 77. Cinder Key is at 7. Mina Vale raids it on tick 93, once it has reached 8, and claims it on tick 94 at garrison 3. That stretch is 17 ticks. The 466–554 stretch (88) starts with Cinder Key claimed away at garrison 5. Pax Ash and Corin Hale each raid Glassport on the tick it hits 8 and lose, leaving 6. Mina Vale's battle, started on tick 551, wins, and she claims Glassport on tick 554 at garrison 3.

### How long a retaken port is held

Hold length is the ticks from the Free Tide claim that ends a landless stretch until that same port changes hands, or until tick 1200 if it has not.

Under the floor of 8, the claims that end a stretch, and how long that port then stays Free Tide:

| Seed | Claim | Garrison | Held |
| --- | --- | ---: | --- |
| 1847 | Cinder Key, tick 80, Pax Ash | 3 | 254, until 334 |
| 1847 | Crown Harbor, tick 364, Pax Ash | 3 | 134, until 498 |
| 1847 | Cinder Key, tick 501, Mina Vale | 5 | 308, until 809 |
| 2718 | Cinder Key, tick 36, Mina Vale | 6 | 275, until 311 |
| 2718 | Glassport, tick 312, Mina Vale | 4 | 205, until 517 |
| 2718 | Cinder Key, tick 518, Mina Vale | 3 | 177, until 695 |
| 2718 | Crown Harbor, tick 862, Zara Gale | 4 | 120, until 982 |
| 2718 | Crown Harbor, tick 1048, Corin Hale | 3 | Still held at 1200 (152) |
| 4096 | Glassport, tick 54, Mara Calder | 13 | 23, until 77 |
| 4096 | Cinder Key, tick 94, Mina Vale | 3 | 372, until 466 |
| 4096 | Glassport, tick 554, Mina Vale | 3 | 228, until 782 |
| 4096 | Cinder Key, tick 784, Bram Tern | 3 | Still held at 1200 (416) |

The garrison 3–6 claims are held 120 to 416 ticks. The 23-tick hold is Glassport claimed at 13, already above the floor, and the loss at tick 77 is the start of the next stretch. None of these is lost on the following tick. No B claim is at garrison 0.

A's returns are at garrison 2–4 and are held even longer: 229, 362, 124, 203, and 186 still open on 1847; 401, 247, 246, and 247 still open on 2718; 23, 246, and 347 on 4096. The hold is not where A fails. The stretch is. A's gaps are one to four ticks, except 934–953 (19) on 2718.

The deposit fails the hold when the sum crosses 15, and it often fails within a few ticks. On 4096 under D, Glassport claimed at tick 54 at garrison 14 (the fight left 13) is lost at tick 58. The tick-61 claim at garrison 17 (the fight left 7) is lost at tick 66. Later claims at 15 and 17 are lost two ticks later: Glassport at 598, Glassport at 705, Glassport at 823, Crown Harbor at 1084. It is not every time. With the deposit and today's gate of 15, Crown Harbor claimed on 1847 at tick 688, garrison 17 (the fight left 7), is held 52 ticks, until 740. A claim the deposit leaves under 15 can sit for a long stretch. On 1847 under D, Pax Ash's Glassport claim at tick 211 stays at garrison 7 (the fight left 6) and is held 153 ticks, until 364. The same quick losses show up with the deposit and today's gate, the floor of 8 turned off. On 1847, Glassport claimed at tick 365 at garrison 15 is lost at 367, and the tick-368 claim at garrison 17 is lost at 372. Crown Harbor claimed at tick 641 at garrison 16 is lost at 645. The capped deposit, which stops at 14, does not fix it. On 4096 those retakes at garrison 14 are held 4, 16, 12, 30, 28, 27, 7, 6, and 35 ticks. The one retake the cap left at garrison 6, because the claimant had nothing to spare under the formula, is held 280 ticks. Topping the town up to 14 puts it one regrowth step from the ordinary gate, and under the floor of 8 a landless enemy may raid 14 immediately.

World Government's own zero stretches under the floor of 8 are 330–332 (2) on 1847, 693–695 (2) on 2718, and 1067–1069 (2) and 1178–1180 (2) on 4096.

## Recommendation

Take the landless floor of 8. Do not take no-floor, and do not add the claim deposit.

No-floor was rejected because the return takes one tick, so being landless stops mattering, and because a same-tick stack can retake a port at garrison 0. On 2718 four captains take Cinder Key from 14 down to 0 on tick 35, and Mara Calder claims it at garrison 0 on tick 36. That row was run again on this merge and it is unchanged. C is that same row. A removes the empty town and keeps the one-tick return. The losses that correspond to the gaps the lead named come back in one tick: 77–78 on 1847, 35–36 on 2718 (the 311–383 gap does not occur, because the rule fires at the tick-35 loss), and 77–78 on 4096.

The floor of 8 is the only one of the three that still makes a landless faction wait, and only when every hostile port is under 8. The waits that show up are 30 ticks on 1847, 66 on 2718, and 17 and 88 on 4096. The original three gaps do not all land in 20–60. They are 3, 1, and 17, because another port is already at 8 or the lost port itself is. Seed 1847 is still portless at tick 1200: failed raids knock the small ports back under 8, and Crown Harbor is legal to raid and has nobody on it. That is the cost of the floor. It is also why the tick-35 pile-on stops at garrison 6 instead of 0.

The ports this rule retakes are not at 0, and they are not lost the next tick. A claim at garrison 3–6 is held 120 to 416 ticks, which is the same reason today's claims at 6 hold: a faction that still has a port cannot raid under 15, and the climb from 3 takes longer than the climb from 6.

The claim deposit fights that. `max(0, min(troops − 25, 10))` added to a remainder of 6–8 lands at 16–18. The ordinary raid gate opens because of the soldiers just left there. Several of those ports are lost 2 to 5 ticks later. Not all of them: one garrison-17 claim on 1847, with the deposit and today's gate, is held 52 ticks. Capping the deposit at 14 shortens the retakes to 4–35 ticks on 4096. The garrison the fight already left is the one that holds. The state change is the existing battle and the existing claim. `settlement-claimed` copies that garrison. The faction then has a port, so the floor of 8 turns off. A second raid under 15 requires losing the last port again.

## Hash impact

This section is the no-floor rule, kept because that row is the rejected baseline. The floor of 8, and the claim deposit, have their hashes in Measured alternatives. This run reproduced the hash and the 8502 count below. The type table, the purse totals, and the `rngState` values are the earlier breakdown of that same result. The predicate adds no RNG call. The battle it unlocks uses the battle's existing draws, so `rngState` moves from the first such battle.

Seeds 1847 and 4096 are inside the fixture until tick 77. Through 72 ticks the hash, the event count, and `rngState` match the fixture: `d7eb02eb0e6b835ee923147b855d0a91969a416115d0c3bd5c2650ff0e2b6a3f` (8275, rng `1404827802`) and `d5d9da8bb1e9c9bd86c93ccbaa570f04ea9052ea1b5d4b48f3452e2db6f0c0c7` (8003, rng `382409966`). The first differing event is tick 77. On 1847, Dax Pike's `decision-made` changes from `recruit` to `raid` on Glassport. On 4096, Mina Vale's changes from `work` to `raid` on Glassport.

Seed 2718 is landless at tick 35, inside the window. The first differing event is Mina's `decision-made` that tick, from `work` to `raid` on Cinder Key. The new 72-tick hash is `e1a7b2af4d10506fd5148e47b67fe02d5f65d9711146172aebd847bfb2665c64`, 8502 events, rng `712879611`. The fixture is `d0b4b449…`, 8489 events, rng `3536473515`. The count rises by 13.

| Event type | Delta at tick 72, seed 2718 |
| --- | ---: |
| worked | +37 |
| decision-made | +18 |
| goal-progressed | +18 |
| relationship-changed | +7 |
| battle-phase-resolved | +5 |
| knowledge-updated | +4 |
| recruited | +3 |
| battle-started | +1 |
| battle-resolved | +1 |
| goal-evolved | +1 |
| post-defeat-withdrawal-started | +1 |
| travel-progressed | −21 |
| market-trade | −12 |
| arrived | −10 |
| rested | −10 |
| travel-started | −7 |
| plan-reconsidered | −5 |
| standing-order-deviated | −4 |
| standing-order-resumed | −4 |
| settlement-produced | −3 |
| settlement-upkeep | −3 |
| character-upkeep | −3 |
| battle-retreated | −1 |

`settlement-claimed` stays at the same count. The claims themselves move: Cinder Key returns at tick 36 instead of Glassport at tick 48, and the next Glassport claim is tick 54.

The golden test does not see the 1847 or 4096 divergence. Event counts against the unmodified run:

| Seed | Tick 400 | Tick 1200 |
| ---: | --- | --- |
| 1847 | 48762 against 49265 (−503) | 161448 against 162302 (−854) |
| 2718 | 50571 against 50325 (+246) | 160884 against 166064 (−5180) |
| 4096 | 50000 against 49091 (+909) | 162838 against 162558 (+280) |

Money in purses plus treasuries at tick 1200: 178847.66 against 176830.05, 184340.88 against 191357.15, 182305.93 against 191349.42. `rngState` at tick 1200: `1574700749`, `997411728`, `1915518098`, against `3500711359`, `2188758066`, `1803987453`. `market-trade` at tick 1200 moves by −246, −511, and −379.

## Tests and the golden fixture

The fixture already contains M22, M23, and M24. The floor of 8 changes seed 2718 inside 72 ticks, so the implementing milestone regenerates that seed. Seeds 1847 and 4096 keep their hashes. `npm run golden:update` on Node v24.21.0, ICU 78.3, when the rule is accepted. Until then the pinned test fails on 2718.

- `tests/agency.test.ts`, beside "a claimed port is not claimed or raided again while its garrison stays under 15". A landless character on a hostile port at garrison 8, with 25 troops and a clear cooldown, is offered `raid`. The same character at garrison 7 is not. Once their faction holds some other port, garrison 8 is not offered either. After the victory the next tick claims, and a later tick emits no raid `decision-made` while that faction holds a port and the garrison stays under 15.
- `tests/combat.test.ts`. The M19 case stays: an immediate victory at garrison 14 and stability 39.55 offers surrender. The new predicate does not read `surrenderStabilityLimit`. A victory at garrison 8 and stability 55 still offers surrender by the existing slide.
- `tests/golden.test.ts`. "pinned seeds reproduce their committed state hash and event count" stays on 1847 and 4096 and moves 2718 to `edbface2f8d5f5e5ab3f03d59096b80d8d4a753097215f5174576ad80d3d8e98` and 8486 events.
- `tests/simulation.test.ts`. "seeds that used to exhaust ambitions still have a goal after 400 ticks" does not pin ownership. Leave it that way.

## Playtest

Follow `docs/playtests/TEMPLATE.md`. Dashboard HTTP JSON only, as in [informed-commitment-002](../playtests/informed-commitment-002.md). Seed 1847, Mara Vane (`character-01`), ticks 0–100. No survey, no raid, no other command. She is already at Crown Harbor.

**Hypothesis.** Glassport leaves Free Tide at tick 77 and does not come back the next tick. Cinder Key, already at 8 soldiers, comes back on tick 80 with 3 soldiers left, without Mara fighting, and it is still Free Tide at tick 100.

**Ambition.** Stay at Crown Harbor. At tick 100, read the log, Glassport, and Cinder Key.

**Success.** The log has `settlement-claimed` for `glassport` at tick 77, Iris Stone, garrison 7, faction `world-government`, and for `cinder-key` at tick 80, Pax Ash, garrison 3, faction `free-tide`. At tick 100 Cinder Key is Free Tide and Glassport is still World Government, at garrison 8.

`PROMOTE` if those two claims are the ones in the window and tick 100 still shows Free Tide holding Cinder Key at a garrison other than 0. `REVISE` if the returned garrison is 0, or if Cinder Key has changed hands again before tick 100. `ABANDON` if tick 100 has Free Tide with no port.

Seed 2718, same ambition, stopped after tick 40, is the pile-on check. Cinder Key is lost at tick 35, Vale Drake, garrison 14. Mina Vale raids that same tick. Esme Dusk, Dax Pike, and Mara Calder are on the beach and do not raid. Mina claims it at tick 36, garrison 6. `REVISE` if that claim garrison is 0, or if more than one Free Tide captain raids Cinder Key on tick 35. `ABANDON` if tick 40 still has no Free Tide port.

## Questions for Micah

1. **Several of your captains are already on a beach you do not own, and you have no port left. The town has at least 8 soldiers. Do they all attack that same morning?** Default: yes. The world already lets every captain attack when the town has 15 or more. A fight that drops the town under 8 closes the gate for the captains still waiting that morning. On seed 2718, tick 35, Mina Vale attacks and the town is left with 6 soldiers. The other three do not attack. Under no floor those four attacks left the town with none.
2. **The town comes back with the soldiers the fight left. Should the captain also leave some of their own troops there?** Default: no. On these runs the fight left 3 to 6, never zero. Leaving up to 10 more, and never dropping the captain below 25, pushes a town of 6 past 15. The town is then legal to raid again, and on these runs it was often lost within a few ticks.
3. **Is 8 the right number of soldiers for a faction with no port?** Default: 8. At 5 the return on the three losses above is one tick, which is the no-floor failure without the empty town. At 8 a town already that strong still falls the same day, and a lost fight can drop a town back under 8. Seed 1847 is still without a port at tick 1200 for that reason. A higher line was not measured.

## Appendix

Node v24.21.0, ICU 78.3. From this branch after the merge of `fef137b286bec0d7ee1e96fe88f8ee420ca5b653`, with dependencies installed:

```bash
node --version
node -p "process.versions.icu"
npm test
```

Zero stretches. A stretch is the ticks whose end state has no settlement with `factionId === "free-tide"`. The printed bounds are the claim ticks, and the gap is the difference.

```bash
node --experimental-strip-types --eval '
import { runTick } from "./src/sim/engine.ts";
import { createPrototypeWorld } from "./src/sim/scenario.ts";
for (const seed of [1847, 2718, 4096]) {
  const world = createPrototypeWorld(seed);
  let from = null;
  const rows = [];
  for (let i = 0; i < 1200; i++) {
    runTick(world);
    const tick = world.tick - 1;
    const held = Object.values(world.settlements).filter((s) => s.factionId === "free-tide").length;
    if (held === 0 && from === null) from = tick;
    if (held > 0 && from !== null) { rows.push(`${from}->${tick} (${tick - from})`); from = null; }
  }
  if (from !== null) rows.push(`${from}->open`);
  console.log(seed, rows.join(", "));
}
'
```

Garrison steps on Glassport and Cinder Key. This is the trace behind the regrowth counts. It prints only when garrison or holder changes.

```bash
node --experimental-strip-types --eval '
import { runTick } from "./src/sim/engine.ts";
import { createPrototypeWorld } from "./src/sim/scenario.ts";
const world = createPrototypeWorld(1847);
const prev = {};
for (let i = 0; i < 235; i++) {
  runTick(world);
  const tick = world.tick - 1;
  if (tick < 70) continue;
  for (const id of ["glassport", "cinder-key"]) {
    const s = world.settlements[id];
    const key = `${s.factionId}:${s.garrison}`;
    if (prev[id] === key) continue;
    const here = Object.values(world.characters)
      .filter((c) => c.factionId === "free-tide" && !c.travel && c.locationId === id)
      .map((c) => `${c.id}:${c.troops.count}t/${c.money.toFixed(0)}`).join(" ");
    console.log(tick, id, s.factionId, "g"+s.garrison, here);
    prev[id] = key;
  }
}
'
```

The refusal count needs the travel score before the −1000 assignment in `buildCandidates`. After the plan boost and `rng.between(-3.5, 3.5)`, and after the recruit and buy-provisions gates, sort once with the purse gate and once without it. A refusal is a decision whose winner without the gate is an unaffordable `travel`, and whose winner with the gate is somebody else. On the 1847 stretch that count is 33. The same pass records why a raid candidate was missing: `garrison-under-15` 523 times, offered 111, `troops-under-25` 66, `battle-open` 3.

The pre-M22 run is the same tree with that −1000 assignment removed and nothing else. The waiver is that assignment skipped when the character's faction holds no settlement. The no-floor predicate measured for E is `garrison >= 15 ||` the attacker has a faction with no settlement. The recommended predicate is `garrison >= 15`, or `garrison >= 8` when the attacker has a faction and that faction holds no settlement. The claim deposit, where it was measured, adds `max(0, min(troops − 25, 10))` inside `resolveSettlementClaim` and applies it from the existing `settlement-claimed` event. None of these calls `rng`. All of them were taken back out before this note was committed.
