# Captures under M29

**Status: Open.** Proposal for the owner to accept, change, or reject. No rule was left in the tree. `origin/main` is `955ad72c38ceb793f1b20330b14660a67274ead9` (PR #53). That merge is docs only. M28, the landless raid floor at garrison 8, is built. M29, the outscore rule, is built. M30, the acting commander, M31, the unpaid-release scar, and M33, captive intelligence, are proposals. They were counted from these runs and were not written into the world.

Runs are `createPrototypeWorld` plus `runTick`, no player commands, seeds 1847 / 2718 / 4096, 1200 ticks, Node v24.21.0, ICU 78.3. Tick numbers on events are the `tick` field. A figure at tick 72 or tick 1200 is the world after that many `runTick` calls. `npm test` on this tree passes, 213 tests. The committed 72-tick fixture reproduced, including the recovery replay of 572 events:

| Seed | State hash | Events |
| ---: | --- | ---: |
| 1847 | `cb04ba5d392d8b1c868cc97e54cb21b21ec171edd546bb70d0d7aba86cc69c11` | 8301 |
| 2718 | `bd7d8cc44d5fa21022ecb8f8086e13dfbb9475eb025b5ae53f87e2991f90035c` | 8513 |
| 4096 | `20975bf480e5aa11eeafe1ce39c36cf5ba0fa8e2d5de2bb5887a35d7b3aecc9f` | 8031 |

The unmodified 1200-tick world matches the both-rules census in [port churn and captures](port-churn-and-captures.md): hashes `02627e65…`, `38eef8b9…`, and `28532e38…`, with 168342, 167379, and 164952 events. Captures are 1, 3, and 5. Pax Ash and Mara Vane are never among them. Verdant Cay stays neutral on every row below, garrison 103 at tick 1200. The variants were patched into `src/sim/engine.ts` for the run and the file was restored.

## Where the roll goes

`resolveBattlePhase` ends a major when the phase count is done, troops are under 8, health is at or below 15, morale is at or below 12, or the garrison is 0. `standingAttackerWin` is the victory this battle already had: the garrison is 0, or troops are still at least 8, health is above 15, morale is above 12, and the phase tally says the attacker. `outscoreAttackerWin` is the M29 addition: troops at least 8, health above 15, the garrison not yet 0, and a higher attacker score. Morale can be what ended the fight. The phase tally can still say defeat. A tie does not qualify. `attackerWon` is either of those. The call to `completeMajorBattle` passes `attackerWon && !standingAttackerWin` as the ignored-capture flag. That flag is true only for an outscore win the standing rule would not have given.

`completeMajorBattle` emits `battle-resolved` before it touches captivity. The outcome on that event is `attacker-victory` when `attackerWon` is true. Surrender uses the same garrison and stability limit as any other attacker victory. On a loss, `attemptCapture` draws `rng.next()` and captures when the roll is below `captureChanceForRisk`. Those chances are 0.04, 0.12, 0.3, and 0.55. The captor stored on the hold is `settlement.factionId`, which on a loss is the side that won. On an outscore win the flag is true, so the function draws that same `rng.next()` and discards it. A standing win does not draw. An immediate battle does not use this path.

The discard is doing what M29 accepted. It keeps later luck on the old stream until the victory itself changes the world. [Port churn and captures](port-churn-and-captures.md) counted the discarded rolls that would have captured the attacker: 18 of 37, 4 of 7, and 8 of 13. This run reads the same rolls. Seed 1847, tick 498, Glassport: Corin Hale draws 0.57 and would not be captured, Dax Pike draws 0.2095, Mara Calder draws 0.2445. Seed 2718, tick 517, Cinder Key: Pax Ash draws 0.6016 and would not be captured. Seed 4096, tick 475, Glassport: Pax Ash draws 0.446 and would be captured. The first outscore win on each seed is that fight, event ticks 498, 517, and 475. All three sit outside the 72-tick fixture. That is why every rule below holds the fixture. The victory is already on the event before the roll is drawn, so spending the roll on a prisoner does not rewrite the outcome line.

`attemptCapture` cannot be pointed at the defender unchanged. The settlement still belongs to the losing faction when the roll is drawn. The claim is a later decision. A prisoner taken with `captorFactionId` copied off the settlement would be held by their own side. The rules below pass the attacker's faction as the captor. The prisoner's health, morale, and troop count are their own. The roll passed in is the one already drawn, so `attemptCapture` does not draw again. Holds in these runs are 84 ticks, `daysHeld` 14, the same bound as today. No hold was of a character by their own faction.

## Who can be the losing captain

The attacker won. The roll was going to be their capture roll. Using it on them would imprison the winner of a fight they outscored. The prisoner has to be someone on the other side. Four readings were measured. The roll and the threshold stay the ones above unless a row says otherwise.

**Owner.** `settlement.ownerId`. The claim already names this person. Crown Harbor on seed 4096 still has no owner at tick 1200, and a port with no owner has no prisoner. The roll is still drawn.

**Owner, on the port.** The same person, and only when `locationId` is the port and `travel` is null. An owner who is somewhere else is left where they are. The roll is still drawn.

**On the dock.** The member of the losing faction who is standing on the port, not travelling, not already captive, and not the attacker, with the highest `leadership + loyalty * 50`. The lower id wins a tie. That is the sort [political layer](political-layer.md) uses for the acting commander. If nobody of that faction is on the dock, nobody is taken.

**Issuer.** Mara Vane for World Government, Pax Ash for Free Tide, wherever they are. This is the person the seat is about. It is also a teleport when they are not on the port.

On the baseline, before any of these captures can change the next fight, every outscore win has a free owner except one on seed 4096 (Finn Frost at Crown Harbor, tick 757, no owner). The owner is on the port for 29, 2, and 12 of the 37, 7, and 13 wins. Of the 18, 4, and 8 rolls that would have captured the attacker, the owner is on the port for 15, 0, and 7. Seed 2718's four hitting rolls are all against an owner who is somewhere else. The issuer is free on every one of those wins and is on the port for 20, 0, and 5 of them.

## The candidates

Each row is 1200 ticks. Captures are `character-captured`. Releases are `captivity-released`. A hold still open at tick 1200 is counted in captures and not in releases. Changes of hands are `settlement-claimed`, listed Crown Harbor, Glassport, Cinder Key, with a later claim 1 or 2 ticks after the previous claim of that port in parentheses. Flips are major attacker victories at morale at most 12, troops at least 8, health above 15, garrison not 0, and a higher attacker score. Upsets are major `battle-resolved` events whose outcome is `defender-victory` and whose attacker score is higher. The first tick is the event tick whose `runTick` first changes the state hash against the unmodified world. Debts are releases with `terms.debtValue > 0`. The sum is the sum of those values.

M30 counts a cover each time Pax or Mara is captured, and again if the person covering the seat is captured before the holder is released. The acting member is locked at the appointment. A higher officer walking out of prison does not rename it. The sort is allowed to see an M31 scar that has already been stored. M31 subtracts 0.04 on an unpaid release, then `round(clamp(value, 0.05, 0.98), 3)`, and does not write `personality.loyalty`. The scar count is the debt count. M33 new facts are one leadership reading and one troop reading per hold, plus a port belief counted once per port, garrison estimate, and original tick. That is the distinct-fact count in [captive intelligence](captive-intelligence.md). The baseline reproduces that note: 4, 7, and 16 new facts, and captor-snapshot rows 0 / 84, 252 / 0, and 336 / 84 for World Government then Free Tide.

| Rule | Seed | Changes (fast) | Flips | Upsets | Captures | Releases | Open | Debts | Debt sum | First tick | Pax | Mara | Covers | New facts |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | ---: |
| (d) Leave it | 1847 | 20 (5), 12 (1), 8 | 37 | 0 | 1 | 1 | 0 | 1 | 103.21 | | | | 0 | 4 |
| (d) Leave it | 2718 | 4, 9, 6 (1) | 7 | 0 | 3 | 3 | 0 | 1 | 217.74 | | | | 0 | 7 |
| (d) Leave it | 4096 | 0, 14, 5 | 13 | 0 | 5 | 5 | 0 | 2 | 281.65 | | | | 0 | 16 |
| (a) Honor, owner | 1847 | 20 (3), 13 (2), 9 | 34 | 0 | 18 | 17 | 1 | 16 | 5886.41 | 498 | 1023 | | 2 | 62 |
| (a) Honor, owner | 2718 | 0, 9, 6 (1) | 6 | 0 | 6 | 5 | 1 | 1 | 217.74 | 871 | | | 0 | 18 |
| (a) Honor, owner | 4096 | 0, 11 (1), 4 | 6 | 0 | 8 | 8 | 0 | 4 | 736.80 | 475 | | | 0 | 28 |
| (b) Fresh roll, owner | 1847 | 14 (2), 11 (1), 8 | 24 | 0 | 11 | 10 | 1 | 10 | 3393.71 | 498 | 596 | | 1 | 39 |
| (b) Fresh roll, owner | 2718 | 4, 11, 6 (1) | 13 | 0 | 8 | 8 | 0 | 5 | 1381.93 | 517 | | | 0 | 29 |
| (b) Fresh roll, owner | 4096 | 0, 11, 5 | 6 | 0 | 10 | 10 | 0 | 7 | 1298.98 | 475 | | | 0 | 34 |
| (c) Honor, owner, half | 1847 | 10 (1), 11, 8 (1) | 21 | 0 | 6 | 6 | 0 | 5 | 1597.23 | 498 | 704 | | 1 | 25 |
| (c) Honor, owner, half | 2718 | 0, 9, 6 (1) | 6 | 0 | 6 | 5 | 1 | 1 | 217.74 | 871 | | | 0 | 18 |
| (c) Honor, owner, half | 4096 | 0, 11, 6 | 9 | 0 | 6 | 6 | 0 | 3 | 550.00 | 684 | | | 0 | 21 |

(a) compares the roll already sitting in the discard to the existing chance and takes the owner. (b) still discards that roll, then draws one more and uses the new one at the same chance. (c) is (a) with the chance cut in half: 0.02, 0.06, 0.15, and 0.275. Every one of these holds the tick-72 hash and the tick-72 event count. Upsets stay 0. The outcome of the outscore fight stays `attacker-victory`.

(a) does raise the capture count, to 18, 6, and 8. Pax is taken once, on seed 1847 at tick 1023, and released at 1107 owing 395.75. The cover is Esme Dusk, because Dax Pike is already in prison from tick 1007. Esme is herself taken at 1072, and the cover steps to Corin Hale until Pax is released. That is the step-up [political layer](political-layer.md) described and did not see. Mara is never the owner of a port in these runs, so World Government's seat never covers. Sixteen of the eighteen captures on seed 1847 leave a debt. The sum is 5886.41. Four of the seventeen outscore captures on that seed, and both of the new ones on seed 2718, take an owner who is not on the port. Capture sets `locationId` to the prison, so those people are moved there. On seed 2718 the two are Toma Reef at tick 871 and Niko Wren at tick 1197. Niko is still held at tick 1200. The debts on that seed stay the one baseline debt, 217.74. The new prisoners paid.

(b) moves the hash at the first outscore win even when the story is only the extra draw. Seed 2718's discarded roll at tick 517 is 0.6016, which misses 0.55, so (a) does not diverge until the first hit at tick 871. (b) draws again at 517, the new roll is 0.1823, and Sable Morrow is taken. The miss path is visible on half of a fresh roll, measured separately: seed 4096 diverges at tick 475, and that run's outscore capture count is 0. Later fights are a different campaign because the stream moved. (b) also never captures Mara. Pax is taken once, on seed 1847 at tick 596.

(c) is quieter on seed 1847, six captures and five debts summing to 1597.23, and Pax is taken at tick 704. It is the same two teleports on seed 2718. Both of those rolls, 0.1943 and 0.0606, are under 0.275 as well as under 0.55, so half does not save them. Seed 4096 waits until tick 684, Sable Morrow, roll 0.2171 against 0.275. The tick-475 roll is 0.446, which half ignores, and the hash holds through that fight because the discarded roll was not replaced.

## The owner has to be on the port

Requiring the owner to be standing on the port removes the teleports. It also removes seed 2718. None of that seed's hitting rolls have the owner on the port, the capture list stays 3, and the tick-1200 hash matches the unmodified world, `38eef8b91aa9de0290a10a04cdfa5347d9c8a5b3dbf683b64f457be51a0003d9`, 167379 events.

| Rule | Seed | Changes (fast) | Flips | Upsets | Captures | Debts | Debt sum | First tick | Pax | Mara | Covers | New facts |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | ---: |
| Owner on the port | 1847 | 12 (2), 11, 7 | 19 | 1 | 7 | 6 | 1790.54 | 596 | 596, 1089 | | 2 | 26 |
| Owner on the port | 2718 | 4, 9, 6 (1) | 7 | 0 | 3 | 1 | 217.74 | | | | 0 | 7 |
| Owner on the port | 4096 | 0, 11, 6 | 9 | 0 | 10 | 2 | 282.12 | 475 | | | 0 | 37 |
| On the dock | 1847 | 17 (2), 11 (1), 7 | 25 | 0 | 12 | 11 | 3643.86 | 498 | 957, 1058 | 594 | 3 | 44 |
| On the dock | 2718 | 5 (1), 10, 7 (1) | 13 | 0 | 8 | 4 | 1161.81 | 871 | | 1034 | 1 | 29 |
| On the dock | 4096 | 0, 10, 4 | 6 | 0 | 6 | 2 | 598.41 | 475 | | | 0 | 22 |
| On the dock, half | 1847 | 20 (3), 11, 8 | 28 | 0 | 9 | 6 | 1711.17 | 498 | 1058 | 594 | 2 | 35 |
| On the dock, half | 2718 | 5 (1), 10, 7 (1) | 11 | 0 | 5 | 2 | 752.27 | 871 | | | 0 | 17 |
| On the dock, half | 4096 | 0, 11 (1), 5 | 7 | 0 | 11 | 6 | 1413.60 | 684 | | 832 | 1 | 41 |
| Issuer, wherever they are | 1847 | 22 (4), 13 (1), 9 | 36 | 0 | 13 | 11 | 1687.73 | 498 | six times | six times | 12 | 39 |
| Issuer, wherever they are | 2718 | 5 (1), 10, 7 (1) | 8 | 0 | 7 | 3 | 771.45 | 871 | 1007, 1168 | 871, 1147 | 4 | 19 |
| Issuer, wherever they are | 4096 | 0, 12 (1), 6 | 9 | 0 | 9 | 5 | 791.46 | 475 | 874 | 475, 931, 1141 | 4 | 29 |

The one upset is seed 1847 under "owner on the port", tick 1089, Cinder Key, Vale Drake, morale 3, troops 416, health 6.197, garrison 9, scores 518.647 / 27.843, outcome `defender-victory`. Outscore requires health above 15, so M29 leaves that fight a defender victory. It is a later battle in the changed world.

Half the dock rule is not a smaller result. Seed 4096 captures 11 people at half chance and 6 at full chance. The full-chance run takes Rook Tern at tick 475 with the baseline roll 0.446. Half ignores that roll, diverges at tick 684, and the later campaign takes more prisoners, including Mara. A missed capture leaves the officer free to fight.

The issuer reading covers the seat on every seed, and it covers it too often. Seed 1847 captures Mara six times and Pax six times. She is on the port for one of the six, tick 705. He is on the port for one of the six, tick 596. The other ten pull them to a fight they were not standing in. Twelve covers in that one quiet run is the seat changing every time the faction loses a port.

## The dock rule, in full

The rule to build is (a)'s roll and (a)'s threshold, with the prisoner taken from the dock.

On an outscore win, after `battle-resolved` is emitted, take the roll `completeMajorBattle` already draws. The chance is `captureChanceForRisk` of the phase's `captureRisk`, the same four numbers. If a member of the losing faction is on the port, free, and not the attacker, the highest `leadership + loyalty * 50` is captured, lower id on a tie. The captor is the attacker's faction. The cause on the hold is `outscore-loss`, so the chronicle does not say the prisoner lost the fight. The attacker's victory, the surrender offer, and the garrison the fight left are unchanged. No second `rng.next()`. If the dock has nobody to take, the roll is spent and the world matches today.

### Seed 1847

Twelve captures, twelve releases, eleven debts, sum 3643.86. The first is the baseline hold. The other eleven are outscore. Tick 498 spends the two rolls the churn note named, 0.2095 and 0.2445, on Jun Marrow and Lio Crow. Both are on Glassport. Corin's 0.57 still misses. The hash first differs at event tick 498.

| Tick | Captain | Port | Cause | Roll | Chance | Release | Debt |
| ---: | --- | --- | --- | ---: | ---: | ---: | ---: |
| 34 | Sable Morrow | Cinder Key | failed-retreat | 0.0528 | 0.12 | 118 | 103.21, Free Tide |
| 498 | Jun Marrow | Glassport | outscore-loss | 0.2095 | 0.55 | 582 | 317.15, Free Tide |
| 498 | Lio Crow | Glassport | outscore-loss | 0.2445 | 0.55 | 582 | paid |
| 594 | Mara Vane | Crown Harbor | outscore-loss | 0.1769 | 0.55 | 678 | 72.25, Free Tide |
| 740 | Rook Tern | Glassport | outscore-loss | 0.0163 | 0.55 | 824 | 292.08, Free Tide |
| 877 | Jun Marrow | Cinder Key | outscore-loss | 0.3352 | 0.55 | 961 | 346.12, World Government |
| 877 | Niko Wren | Crown Harbor | outscore-loss | 0.1073 | 0.55 | 961 | 522.2, Free Tide |
| 957 | Pax Ash | Crown Harbor | outscore-loss | 0.1627 | 0.55 | 1041 | 418.54, World Government |
| 1045 | Jun Marrow | Glassport | outscore-loss | 0.1837 | 0.55 | 1129 | 502.15, Free Tide |
| 1058 | Finn Frost | Crown Harbor | outscore-loss | 0.0349 | 0.55 | 1142 | 428.28, World Government |
| 1058 | Pax Ash | Cinder Key | outscore-loss | 0.2645 | 0.55 | 1142 | 234.73, World Government |
| 1060 | Niko Wren | Glassport | outscore-loss | 0.136 | 0.55 | 1144 | 407.15, Free Tide |

Covers, each 84 ticks. The scar was visible to the sort. Every name matches the sort on seeded loyalty.

| Tick | Holder | Acting | Score | Through |
| ---: | --- | --- | ---: | ---: |
| 594 | Mara Vane | Jun Marrow, steward | 97.508 | 678 |
| 957 | Pax Ash | Dax Pike, steward | 107.296 | 1041 |
| 1058 | Pax Ash | Dax Pike | 107.296 | 1142 |

Mara's unpaid release stores loyalty 0.768. Pax's two store 0.668 and then 0.628. Finn Frost's one release stores 0.282, the lowest on this seed. Nobody reaches 0.25, and nobody reaches 0.05. The scar renames no cover. Crown Harbor changes hands 17 times, two of them fast, against 20 and five. Glassport 11 (1), Cinder Key 7. Flips fall from 37 to 25.

At tick 1200 Crown Harbor is Free Tide, Zara Gale, garrison 13. Glassport is Free Tide, Esme Dusk, garrison 5. Cinder Key is World Government, Rook Tern, garrison 11.

### Seed 2718

Eight captures, eight releases, four debts, sum 1161.81. The first three are the baseline holds, including Esme Dusk's debt of 217.74. The hash matches today until event tick 871. The roll there is 0.1943, the baseline hit whose owner, Toma Reef, is not on the port. The dock has Rook Tern, and he is the one taken.

| Tick | Captain | Port | Cause | Roll | Chance | Release | Debt |
| ---: | --- | --- | --- | ---: | ---: | ---: | ---: |
| 71 | Mina Vale | Crown Harbor | failed-retreat | 0.2113 | 0.3 | 155 | paid |
| 411 | Esme Dusk | Crown Harbor | major-defeat | 0.1982 | 0.55 | 495 | 217.74, World Government |
| 621 | Zara Gale | Crown Harbor | failed-retreat | 0.228 | 0.3 | 705 | paid |
| 871 | Rook Tern | Glassport | outscore-loss | 0.1943 | 0.55 | 955 | 534.53, Free Tide |
| 1007 | Bram Tern | Glassport | outscore-loss | 0.0068 | 0.55 | 1091 | paid |
| 1008 | Iris Stone | Cinder Key | outscore-loss | 0.3065 | 0.55 | 1092 | 371.48, Free Tide |
| 1034 | Mara Vane | Crown Harbor | outscore-loss | 0.3068 | 0.55 | 1118 | 38.06, Free Tide |
| 1036 | Zara Gale | Crown Harbor | outscore-loss | 0.3363 | 0.55 | 1120 | paid |

Mara's cover is Ada Sorn, explorer, score 91.901, from tick 1034 through her release at 1118. Iris Stone scores 106.521 and would be the reporting officer, and she is already captive from tick 1008. She is released at 1092. The lock keeps Ada for the remaining 26 ticks. Pax is not captured. His loyalty on this seed is 0.533, and the seat stays his. Mara's stored loyalty is 0.835. The scar renames nothing, because the only cover is hers and the scar is stored at her release, when the cover is deleted.

Crown Harbor changes hands 5 times, one of them fast, against 4 and none. Glassport 10, Cinder Key 7 (1). Flips rise from 7 to 13. At tick 1200 Crown Harbor is Free Tide, Mara Calder, garrison 5. Glassport is World Government, Niko Wren, garrison 7. Cinder Key is World Government, Jun Marrow, garrison 8.

### Seed 4096

Six captures, six releases, two debts, sum 598.41. The first four are baseline holds that survive. Esme Dusk's second baseline hold, tick 481, debt 276.92, does not. Rook Tern is taken at tick 475 with Pax's discarded roll, 0.446. That is the same fight, and Rook is both the owner and the senior officer on the dock, so the owner reading and the dock reading agree on this prisoner. The world then separates. The hash first differs at event tick 475.

| Tick | Captain | Port | Cause | Roll | Chance | Release | Debt |
| ---: | --- | --- | --- | ---: | ---: | ---: | ---: |
| 12 | Sable Morrow | Cinder Key | failed-retreat | 0.0878 | 0.12 | 96 | paid |
| 18 | Dax Pike | Glassport | major-defeat | 0.1077 | 0.12 | 102 | paid |
| 39 | Esme Dusk | Crown Harbor | failed-retreat | 0.0067 | 0.3 | 123 | 4.73, World Government |
| 161 | Mina Vale | Crown Harbor | major-defeat | 0.4012 | 0.55 | 245 | paid |
| 475 | Rook Tern | Glassport | outscore-loss | 0.446 | 0.55 | 559 | paid |
| 684 | Iris Stone | Glassport | outscore-loss | 0.2282 | 0.55 | 768 | 593.68, Free Tide |

Pax is not captured. Mara is not captured. Covers: 0. The two debts are Esme's 4.73, loyalty stored at 0.583, and Iris's 593.68, loyalty stored at 0.726. Crown Harbor still does not change hands. Glassport changes hands 10 times against 14. Cinder Key 4 against 5. No fast pair. Flips fall from 13 to 6. At tick 1200 Crown Harbor is World Government, no owner, garrison 257. Glassport is World Government, Bram Quill, garrison 13. Cinder Key is Free Tide, Zara Gale, garrison 12.

Captor snapshots, World Government then Free Tide, are 252 / 756, 420 / 252, and 252 / 252. New facts are 44, 29, and 22, against 4, 7, and 16. Empty port lists on a hold: 0, 2, and 0.

## What this does to the three proposals

M30 has a cover to show on two seeds. Seed 1847 names Jun Marrow while Mara is held and Dax Pike while Pax is held, twice. Seed 2718 names Ada Sorn while Mara is held, because the higher officer is already a prisoner, and keeps that name after Iris is released. Seed 4096 still never captures the person who issues orders. The scar was visible to the sort on every run in the tables above, including the issuer runs. It never renamed a cover.

M31 writes once per unpaid release. On this rule that is 11, 4, and 2, against 1, 1, and 2 today. The drops stay. Nothing in the run adds the 0.04 back. The lowest stored loyalty is Finn Frost at 0.282.

M33 has more holds to read. The channel is unchanged: leadership, the scattered troop count, and the port beliefs the prisoner already carries. The new fact counts are the paragraph above. The rule does not put orders, money, or the treasury on that row.

The day's-wage collector in [captivity debts](captivity-debts.md) stays parked. These runs create more debts than the four on the current tree. They are not the sixteen the collector was written against. Building it wants this capture rule accepted first.

## Fixture

Every rule in this note holds the committed 72-tick hashes and event counts. The first outscore win is event tick 498, 517, or 475. A rule that only spends the roll already drawn diverges at the first capture, which is that tick when the roll hits and later when it misses. (a) on seed 2718 misses at 517 and diverges at 871. (c) on seed 4096 misses at 475 and diverges at 684. A rule that draws a fresh roll diverges at the first outscore win either way. Half of a fresh roll on seed 4096 diverges at 475 with no outscore capture.

`npm run golden:update` was not run. Nothing here asks for a new fixture. The tick-72 world has no outscore capture on any of these seeds.

## Tests to add

No new simulation test. The harness was removed.

If the dock rule is built, the test belongs beside "a flipped outscore victory consumes the defeat path's capture roll and no roll is added to a win the old rule already had" in `tests/combat.test.ts`. The outscore win stays `attacker-victory`. The discarded roll, when it is under the chance, captures the senior losing officer on the port and does not capture the attacker. The captor is the attacker's faction. A second `rng.next()` after the fight matches the defeat path's next draw, so the capture did not insert one. An empty dock spends the roll and captures nobody. `tests/golden.test.ts` stays on the hashes at the top.

## Recommendation

Honor the roll M29 already draws. Spend it, at the existing chance, on the senior officer of the losing faction who is standing on the port. The winner of the fight stays the attacker. The 72-tick fixture stays where it is.

The owner is the smaller lookup, and it takes people who are not there. On seed 2718 that is both of the new prisoners. Requiring the owner to be present leaves that seed identical to today, captures 3, and never covers the seat. A fresh roll moves later luck on a miss. Half the chance is not the quieter campaign: on seed 4096 the dock rule at half chance captures 11 people against 6 at the full chance. Taking Mara or Pax wherever they stand covers the seat by pulling them to a port they are not in, six times each on seed 1847. Leaving the roll discarded leaves M30 with nothing to show.

The dock rule captures 12, 8, and 6 people. Mara is held on seeds 1847 and 2718. Pax is held twice on seed 1847. Seed 4096 still holds neither. That is enough to see the cover, including a cover that starts while the higher officer is already in prison. It is not a cover on every seed.

## Questions for Micah

1. **An outscore win already draws a capture roll and throws it away. Should that roll imprison the senior officer of the losing faction who is standing on the port?** Default: yes. The fight stays the attacker's victory. The chance stays 0.04, 0.12, 0.3, or 0.55. The captor is the winner's faction. The cause is `outscore-loss`. On these runs the captures are 12, 8, and 6, and the first difference is event tick 498, 871, or 475. The 72-tick hashes stay as they are.
2. **Should the prisoner be the port's owner instead?** Default: no. The owner is a single field, and on seed 2718 both new prisoners are people who were not on the port. Requiring the owner to be standing there leaves that seed on today's hash through tick 1200, with 3 captures and no cover.
3. **Should the chance be half?** Default: no. Half of the dock rule captures 9, 5, and 11. Seed 4096 captures more people at the lower chance, because the miss at tick 475 leaves a different campaign. Half of the owner rule still teleports both of seed 2718's new prisoners. Their rolls are 0.1943 and 0.0606.
4. **Should the victory draw a new roll?** Default: no. The roll already in the discard is the one to use. A new roll moves every later draw on that seed, including when the new roll captures nobody. Half of a fresh roll on seed 4096 diverges at tick 475 and takes no one on an outscore win.
5. **Seed 4096 still never captures Pax or Mara. Is the cover on the other two seeds enough?** Default: yes. Seed 1847 covers Mara with Jun Marrow and Pax with Dax Pike, twice. Seed 2718 covers Mara with Ada Sorn, because Iris Stone is already captive, and keeps Ada after Iris is released. The scar does not rename any of those covers. A rule that captures the issuer wherever they are does cover seed 4096, and it captures Mara six times on seed 1847.
6. **Unpaid releases on this rule are 11, 4, and 2, summing to 3643.86, 1161.81, and 598.41. Should the day's-wage collector be built with it?** Default: no. The collector stays parked until this capture rule is accepted. These debts are not the sixteen it was written against.
