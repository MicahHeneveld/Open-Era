# Loyalty scar, remeasured

**Status: Open.** Remeasure of M31 once M30's cover sort is in the tree and the accepted dock rule is patched on beside it. No rule was left in the tree. The runs were taken on `557ed84f2c3d167907856aa47db2f6025c87e4f4` (PR #57). That commit contains `e68281b` (PR #56, M30, the acting commander while captive). M28 and M29 are built. M30 is built. M31 is accepted and not built. The dock rule, M29.1, is accepted and being built in parallel; it is not on this SHA. The harness patched it for the run and restored `src/sim/engine.ts`, `src/sim/state.ts`, and `src/sim/types.ts`.

This is a new file. [Loyalty drift](loyalty-drift.md) measured the scar on an earlier capture world, eight, two, and six writes, with regencies the outscore rule has since removed. [Captures under M29](captures-under-m29.md) counted the same scar on the dock rule before M30 wrote `actingCommanderId`. Updating either note would mix those censuses with a sort that now actually runs. The question here is only whether that live sort, fed by the dock rule's unpaid releases, still leaves the accepted scar alone.

Runs are `createPrototypeWorld` plus `runTick`, no player commands, seeds 1847 / 2718 / 4096, 1200 ticks, Node v24.21.0, ICU 78.3. Tick numbers on events are the `tick` field. A figure at tick 72 or tick 1200 is the world after that many `runTick` calls. `npm test` on this SHA passes, 216 tests. The committed 72-tick fixture reproduced, including the recovery replay of 572 events. M30 did not move it. The hashes below are the ones already in `tests/fixtures/golden-hashes.json`, the same values [captures under M29](captures-under-m29.md) recorded before the seat was built (`cb04ba5d` / `bd7d8cc4` / `20975bf4`, 8301 / 8513 / 8031):

| Seed | State hash | Events |
| ---: | --- | ---: |
| 1847 | `cb04ba5d392d8b1c868cc97e54cb21b21ec171edd546bb70d0d7aba86cc69c11` | 8301 |
| 2718 | `bd7d8cc44d5fa21022ecb8f8086e13dfbb9475eb025b5ae53f87e2991f90035c` | 8513 |
| 4096 | `20975bf480e5aa11eeafe1ce39c36cf5ba0fa8e2d5de2bb5887a35d7b3aecc9f` | 8031 |

## Where the scar would sit

`commandScore` is `skills.leadership + personality.loyalty * 50`. `selectActingCommanderId` sorts the faction mates by that score, skips the holder and anyone whose `captivity` is set, and breaks a tie toward the lower id. `assignActingCommander` runs from the `character-captured` reducer. It writes `actingCommanderId` when the captured character is the holder, or is the current cover. `clearActingCommander` runs from `captivity-released` and from `captivity-escaped`, and deletes the key when the freed character is the holder. Nothing in the tick reads `actingCommanderId` back. Orders, plans, and work keep reading `personality.loyalty`.

`processCaptivityDeadlines` runs before `progressActiveBattles` in `runTick`. A release, and the cover clear that goes with it, happen earlier in the tick than a new capture. The debt is `terms.debtValue` on `captivity-released`. `attemptCapture` stores `captorFactionId` from `settlement.factionId` at the moment of the roll. On an outscore win that settlement still belongs to the side that lost.

M29's outscore win passes `attackerWon && !standingAttackerWin` into `completeMajorBattle`. That branch draws `rng.next()` and discards it. `captureChanceForRisk` is 0.04, 0.12, 0.3, and 0.55. A loss draws inside `attemptCapture`. A standing win does not draw.

The harness spends that one discarded draw. After `battle-resolved`, it takes `battle.lastPhase?.captureRisk`, or the starting forecast's risk when the phase has none, and calls `captureChanceForRisk`. The prisoner is the member of `settlement.factionId` who is standing on that port (`locationId` is the port, `travel` is null, `captivity` is null, and the character is not the attacker), with the highest `leadership + personality.loyalty * 50`. The lower id wins a tie. The dock sort does not add the scar. The roll is passed into `attemptCapture`, so there is no second `rng.next()`. The captor stored on the hold is the attacker's `factionId`, and the cause is `outscore-loss`. A neutral port, or a dock with nobody of the losing faction free on it, spends the roll and captures nobody. The victory, the surrender offer, and the garrison are the ones `battle-resolved` already wrote.

M31, as accepted, is a stored adjustment. On `captivity-released`, when the character has a faction and `terms.debtValue > 0`, the harness takes the loyalty the cover sort would already read, subtracts the step, and sets the result to `round(clamp(value, 0.05, 0.98), 3)`. It stores `loyaltyAdjustment` as that result minus `personality.loyalty`, rounded to 3 decimals, and omits the field when the adjustment is 0. It does not write `personality.loyalty`. A second unpaid release subtracts the step again. A paid release stores nothing. An escape stores nothing. The cover sort is the only reader: `commandScore` adds the adjustment before multiplying by 50. The scar is applied after `clearActingCommander` in the release reducer, so the cover that is ending does not see the holder's new scar. A scar from an earlier release is already on the character when a later capture in the same tick, or a later tick, sorts the seat.

Three trees, all of them with the dock rule:

1. No scar.
2. The accepted step, −0.04, cover sort only.
3. Two short variants. One raises the step to −0.08 and still lets only the cover sort read it. The other keeps −0.04 and writes the rounded result onto `personality.loyalty`, so orders, plans, and work see it too.

## Tree (1), the dock rule with the live seat

Captures, releases, debts, and the people taken are the dock-rule list in [captures under M29](captures-under-m29.md), measured again with `actingCommanderId` actually stored. Twelve, eight, and six captures. The same number of releases. No escapes. No hold still open at tick 1200. Unpaid releases are 11, 4, and 2, summing to 3643.86, 1161.81, and 598.41. No prisoner is held by their own faction. The event log is the chronicle; the new field on the faction is not an event. Verdant Cay stays neutral, garrison 103, on every seed.

### Seed 1847

Twelve captures, twelve releases, eleven debts, sum 3643.86.

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

Covers. The sort reads seeded loyalty. Scores are leadership plus loyalty times 50, shown to 3 decimals.

| Tick | Holder | Acting | Score | Next | Gap | Through |
| ---: | --- | --- | ---: | --- | ---: | ---: |
| 594 | Mara Vane | Jun Marrow, steward | 97.508 | Bram Quill, merchant, 94.184 | 3.324 | 678 |
| 957 | Pax Ash | Dax Pike, steward | 107.296 | Esme Dusk, raider, 94.864 | 12.432 | 1041 |
| 1058 | Pax Ash | Dax Pike | 107.296 | Esme Dusk, 94.864 | 12.432 | 1142 |

The lowest loyalty the sort reads is Finn Frost at 0.322. He has no scar on this tree. At tick 1200 Crown Harbor is Free Tide, Zara Gale, garrison 13. Glassport is Free Tide, Esme Dusk, garrison 5. Cinder Key is World Government, Rook Tern, garrison 11.

### Seed 2718

Eight captures, eight releases, four debts, sum 1161.81.

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

One cover. Iris Stone, officer, scores 106.521 and would lead the sort, and she is already captive from tick 1008. She is released at 1092. The lock keeps Ada for the remaining ticks.

| Tick | Holder | Acting | Score | Next | Gap | Through |
| ---: | --- | --- | ---: | --- | --- | ---: |
| 1034 | Mara Vane | Ada Sorn, explorer | 91.901 | Vale Drake, explorer, 91.648 | 0.253 | 1118 |

The lowest loyalty the sort reads is Niko Wren at 0.307. He is never captured. Pax is not captured. At tick 1200 Crown Harbor is Free Tide, Mara Calder, garrison 5. Glassport is World Government, Niko Wren, garrison 7. Cinder Key is World Government, Jun Marrow, garrison 8.

### Seed 4096

Six captures, six releases, two debts, sum 598.41. Pax is not captured. Mara is not captured. Covers: 0.

| Tick | Captain | Port | Cause | Roll | Chance | Release | Debt |
| ---: | --- | --- | --- | ---: | ---: | ---: | ---: |
| 12 | Sable Morrow | Cinder Key | failed-retreat | 0.0878 | 0.12 | 96 | paid |
| 18 | Dax Pike | Glassport | major-defeat | 0.1077 | 0.12 | 102 | paid |
| 39 | Esme Dusk | Crown Harbor | failed-retreat | 0.0067 | 0.3 | 123 | 4.73, World Government |
| 161 | Mina Vale | Crown Harbor | major-defeat | 0.4012 | 0.55 | 245 | paid |
| 475 | Rook Tern | Glassport | outscore-loss | 0.446 | 0.55 | 559 | paid |
| 684 | Iris Stone | Glassport | outscore-loss | 0.2282 | 0.55 | 768 | 593.68, Free Tide |

The lowest loyalty the sort reads is Mina Vale at 0.311. Her release at 245 is paid, so a scar rule would not touch her. At tick 1200 Crown Harbor is World Government, no owner, garrison 257. Glassport is World Government, Bram Quill, garrison 13. Cinder Key is Free Tide, Zara Gale, garrison 12.

## Tree (2), the accepted scar

The prisoner list, the debts, the releases, and the event log match tree (1) on every tick. Event counts at tick 1200 stay 164313, 165434, and 164691. The state hash moves when the adjustment field appears, which is the first unpaid release: event tick 118, 495, and 123. Those ticks are outside the 72-tick fixture, so the fixture holds on all three seeds.

The cover names match tree (1). The scar does not rename a seat. On the one appointment where the scarred person is the one the seeded sort would have chosen, he still leads.

### Scar writes

Eleven, four, and two. Each row is an unpaid release. The stored loyalty is `round(clamp(previous − 0.04, 0.05, 0.98), 3)`. The field is the cumulative adjustment, −0.04, then −0.08, then −0.12.

Seed 1847. Finn Frost at 0.282 is the lowest loyalty the sort reads on this seed, and he is the lowest scar. His seed was 0.322. Nobody reaches 0.25. Nobody reaches 0.05.

| Tick | Character | Debt | Stored | Adjustment |
| ---: | --- | ---: | ---: | ---: |
| 118 | Sable Morrow | 103.21 | 0.537 | −0.04 |
| 582 | Jun Marrow | 317.15 | 0.690 | −0.04 |
| 678 | Mara Vane | 72.25 | 0.768 | −0.04 |
| 824 | Rook Tern | 292.08 | 0.917 | −0.04 |
| 961 | Niko Wren | 522.2 | 0.700 | −0.04 |
| 961 | Jun Marrow | 346.12 | 0.650 | −0.08 |
| 1041 | Pax Ash | 418.54 | 0.668 | −0.04 |
| 1129 | Jun Marrow | 502.15 | 0.610 | −0.12 |
| 1142 | Pax Ash | 234.73 | 0.628 | −0.08 |
| 1142 | Finn Frost | 428.28 | 0.282 | −0.04 |
| 1144 | Niko Wren | 407.15 | 0.660 | −0.08 |

Seed 2718. The lowest loyalty the sort reads is still Niko Wren at 0.307, with no scar. The lowest scar is Iris Stone at 0.750.

| Tick | Character | Debt | Stored | Adjustment |
| ---: | --- | ---: | ---: | ---: |
| 495 | Esme Dusk | 217.74 | 0.784 | −0.04 |
| 955 | Rook Tern | 534.53 | 0.793 | −0.04 |
| 1092 | Iris Stone | 371.48 | 0.750 | −0.04 |
| 1118 | Mara Vane | 38.06 | 0.835 | −0.04 |

Seed 4096. The lowest loyalty the sort reads is still Mina Vale at 0.311, with no scar. The lowest scar is Esme Dusk at 0.583. There is no cover to rename.

| Tick | Character | Debt | Stored | Adjustment |
| ---: | --- | ---: | ---: | ---: |
| 123 | Esme Dusk | 4.73 | 0.583 | −0.04 |
| 768 | Iris Stone | 593.68 | 0.726 | −0.04 |

### Covers, against tree (1)

Same appointments, same ticks, same names. The score column is the scarred score. The seeded score is what tree (1) used.

| Seed | Tick | Holder | Acting | Scarred score | Seeded score | Next | Gap |
| ---: | ---: | --- | --- | ---: | ---: | --- | ---: |
| 1847 | 594 | Mara Vane | Jun Marrow | 95.508 | 97.508 | Bram Quill, 94.184 | 1.324 |
| 1847 | 957 | Pax Ash | Dax Pike | 107.296 | 107.296 | Esme Dusk, 94.864 | 12.432 |
| 1847 | 1058 | Pax Ash | Dax Pike | 107.296 | 107.296 | Esme Dusk, 94.864 | 12.432 |
| 2718 | 1034 | Mara Vane | Ada Sorn | 91.901 | 91.901 | Vale Drake, 91.648 | 0.253 |

Jun is the case the step can reach. He is released unpaid at tick 582, twelve ticks before he is asked to cover Mara. The adjustment on him is −0.04, and times 50 that is 2 points. His seeded lead over Bram Quill was 3.324. He still leads by 1.324, 95.508 to 94.184. Dax has no scar at either of his appointments, and the gap under him is 12.432. Pax's own scars are written at his releases, ticks 1041 and 1142, which are the ticks those covers are deleted. He is the holder, so the sort skips him anyway.

Ada's lead over Vale Drake is 0.253, about 0.005 of loyalty. A −0.04 scar on Ada would be 2 points and would name Vale. Ada has no unpaid release before tick 1034, and Vale has none either. Iris is ahead of both at 106.521 and is excluded because she is captive, not because of a scar. Rook Tern's scar is already stored at tick 955, and the seeded sort and the scarred sort both still name Ada.

Seed 4096 appoints nobody. The two scars have no seat to change.

## The −0.08 step

Same dock rule, same cover-sort-only reader, step −0.08. The prisoner list and the event log still match tree (1) on every tick. The fixture holds. The state hash still diverges at event tick 118, 495, and 123. One cover changes.

On seed 1847, tick 594, the seeded sort still wants Jun Marrow at 97.508. Two times 0.04 is 4 points, and 97.508 − 4 is 93.508. That is under Bram Quill at 94.184, and under Kessa Calder at 93.936. The cover is Bram Quill, merchant, from tick 594 through Mara's release at 678. His lead over Kessa is 0.248. The other two covers stay Dax Pike. Seeds 2718 and 4096 keep Ada, and keep no cover. `actingCommanderId` is the only state that differs because of the rename, and only from tick 594 through 678. No event carries that id, which is why the chronicle matches tree (1) even though the seat name does not.

Finn Frost's one release stores 0.242. He is the lowest loyalty the sort reads on seed 1847, and the only person under 0.25 on any of these runs. He stays above 0.05. On 2718 the floor is still Niko Wren at 0.307. On 4096 it is still Mina Vale at 0.311.

## Writing the scar onto loyalty

The other variant keeps the step at −0.04 and assigns the rounded result to `personality.loyalty`, deleting the adjustment field. The cover sort then sees it because it already reads `personality.loyalty`. So do the goal scores and the order factors. The fixture still holds, because the first unpaid release is after tick 72. The event log diverges on that same release tick.

The first changed payload is a score on the release tick, later in the tick than the release, because deadlines run before decisions:

| Seed | Tick | Event | What moved |
| ---: | ---: | --- | --- |
| 1847 | 118 | Sable Morrow `plan-reconsidered` | Serve-faction score 0.906 to 0.887. Expand-influence stays 1.384 and stays first |
| 2718 | 495 | Esme Dusk `plan-reconsidered` | Serve-faction score 1.115 to 1.097. It was already third |
| 4096 | 123 | Esme Dusk `plan-reconsidered` | Serve-faction score 1.257 to 1.239. Obedience 0.669 to 0.660. The loyalty factor 0.149 to 0.140. The directive stays pressure |

By tick 1200 the campaign has moved. Captures are 13, 9, and 10, against 12, 8, and 6. Releases are 13, 6, and 10. Seed 2718 still holds Pax Ash, Corin Hale, and Dax Pike, all captured at tick 1199 on an outscore loss. Unpaid releases are 9, 5, and 7, summing to 2405.76, 1560.96, and 1820.56. The covers are a different history, not a reordering of tree (1)'s candidate list: seed 1847 names Jun Marrow at tick 910 and Kessa Calder at 928; seed 2718 names Ada Sorn at 1039 and Zara Gale for Pax at 1199; seed 4096 names Corin Hale for Pax at 646. Tree (1) had no cover on 4096, and no Pax cover on 2718.

## Fixture and tick-1200 hashes

Every tree holds the committed 72-tick hashes and event counts. `npm run golden:update` was not run. The first scar, and the first outscore capture, both sit outside that window. The first outscore captures are event ticks 498, 871, and 475, the same fights as the captures note.

A blank divergence means the per-tick event batches, or the state hash, match tree (1) through tick 1200. The state divergence is the event tick of the `runTick` whose hash first differs.

| Tree | Seed | Tick 72 | Events 72 | State divergence | Event divergence | Tick 1200 hash | Events |
| --- | ---: | --- | ---: | ---: | ---: | --- | ---: |
| (1) Dock | 1847 | matches | 8301 | | | `d106abfca8fcfabf7e821cad1059fdb50acf84661694fa06bcc07e91ae17ba45` | 164313 |
| (1) Dock | 2718 | matches | 8513 | | | `2d56e9eaf2dbb889884ad7b4465fc8043a654e42f1cf0abf5ad301765eea6001` | 165434 |
| (1) Dock | 4096 | matches | 8031 | | | `92c907be75f142774ad022bf642ed3f22f7301793e49d9c5be11f607d9d2dc5e` | 164691 |
| (2) −0.04 | 1847 | matches | 8301 | 118 | none | `95bd71dc877f4e12c77ba2f07a2f10f8e076fc32deaf997dd4cf5e4fa7d011b5` | 164313 |
| (2) −0.04 | 2718 | matches | 8513 | 495 | none | `55d48cbbdeb6e562ca4002d6e22a713a9977175e06e0383b36a3af015e53c57d` | 165434 |
| (2) −0.04 | 4096 | matches | 8031 | 123 | none | `f5355c1a254bd3df4924fd784da645b770cf01bafe6d73d8d9c99a82446715df` | 164691 |
| −0.08 | 1847 | matches | 8301 | 118 | none | `77cc9e4abfd799baac9a989f5268cfae8cf480a0469ae406177627bc227efd15` | 164313 |
| −0.08 | 2718 | matches | 8513 | 495 | none | `7760b1ac524bfae4f93a5a08e3c1b2c902d6550c2b651ab417a7ac0a889ee161` | 165434 |
| −0.08 | 4096 | matches | 8031 | 123 | none | `4b043dbd3650b22e026b94b42b4bb3c8b4700b4d595ea9247d18b207655f20fa` | 164691 |
| Loyalty written | 1847 | matches | 8301 | 118 | 118 | `19443ebef15065d37e6bcc781c6a9153554b738c6c170c891b793c23222e96db` | 165387 |
| Loyalty written | 2718 | matches | 8513 | 495 | 495 | `d9eeb42269f84d695f9351e1aab2c295868feced085bac2d176b8b5a1b75001b` | 166209 |
| Loyalty written | 4096 | matches | 8031 | 123 | 123 | `3ffa76d3e72e88bd95b63356c0be47f7eecbc2f70766f0018362336ba7fb9139` | 162222 |

"Tick 72 matches" means the state hash is the committed hash in the table at the top.

## Recommendation

Build M31 as accepted.

An unpaid release stores an adjustment of −0.04, omitted while it is 0, and the cover sort is the only reader. `personality.loyalty` stays the seed. On these runs that writes 11, 4, and 2 times. The event log matches the dock rule. The 72-tick fixture stays where M30 left it. The lowest scar is Finn Frost at 0.282. The closest cover that can see a scar is Jun Marrow over Bram Quill, and after the step he still leads by 1.324. Ada's smaller gap never meets a scar. Seed 4096 still has no cover, which is the dock rule's capture list, not a reason to drop the scar.

The −0.08 step is the change to refuse. It renames Mara's cover to Bram Quill for the 84 ticks from 594 to 678, and it puts Finn at 0.242. The chronicle still does not move, because the cover does not issue orders, but the seat name does, and someone crosses 0.25. Writing the number onto `personality.loyalty` is the other change to refuse. The first payload moves on the release tick, and the capture counts become 13, 9, and 10.

Parking it would leave an accepted mark unstored. The sort that was supposed to read it is now in the tree, the releases that feed it are the dock rule's releases, and the mark does what the acceptance said it would do.

### Tests, when it is built

`npm run golden:update` stays unrun. The fixture on this SHA is the table at the top.

The test list in [loyalty drift](loyalty-drift.md) still fits, pointed at this tree. A release with `debtValue > 0` writes the adjustment −0.04, leaves `personality.loyalty` and `rngState` unchanged, and omits the field when the debt is 0. A second unpaid release subtracts another 0.04. A value that would fall under 0.05 stops at 0.05. After the adjustment, `assessStandingOrder`, the serve-faction score, and the work score match the seeded loyalty. On the headless dock-rule runs the cover names stay Jun Marrow, Dax Pike, Dax Pike, and Ada Sorn. A forced check, not a headless outcome: Jun at 97.508 with an adjustment of −0.08 scores 93.508 and Bram Quill at 94.184 leads. The commander's own faction rows include the adjusted loyalty. A rival row leaves it null. `tests/golden.test.ts` stays on the hashes at the top.

The dock rule's own test stays the one named in [captures under M29](captures-under-m29.md). This scar does not change that test. The two are separate slices.

## Questions for Micah

1. **Build the unpaid-release scar at −0.04, stored on the character and read only by the cover sort?** Default: yes. The field is omitted while it is 0. `personality.loyalty` stays the seed. On these runs it writes 11, 4, and 2 times, the event log matches the dock rule, and the 72-tick hashes stay `cb04ba5d` / `bd7d8cc4` / `20975bf4` with 8301 / 8513 / 8031 events. The first state difference is event tick 118, 495, or 123.
2. **Jun Marrow's unpaid release at tick 582 cuts his lead over Bram Quill from 3.324 to 1.324, and he still covers Mara. Should the step be larger than 0.04?** Default: no. A step of 0.08 names Bram Quill from tick 594 through 678 and stores Finn Frost at 0.242. Finn at 0.04 is 0.282, above 0.25.
3. **When a later release does land on the person the sort would have chosen, and the gap is smaller than the step, may the scar rename the cover?** Default: yes. That is the reader this rule already has. It did not happen at −0.04. Ada Sorn leads Vale Drake by 0.253, and neither of them owes a ransom before that cover starts. Iris Stone at 106.521 is skipped because she is captive.
4. **Should orders, plans, and work read the scar?** Default: no. Writing it onto `personality.loyalty` changes Sable Morrow's serve-faction score from 0.906 to 0.887 on tick 118, Esme Dusk's from 1.115 to 1.097 on tick 495, and Esme's again from 1.257 to 1.239 on tick 123, with her obedience from 0.669 to 0.660. The tick-1200 capture counts become 13, 9, and 10.
