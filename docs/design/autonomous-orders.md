# Autonomous orders

**Status: Open.** Proposal for the owner to accept, change, or reject. Do not build this yet. The measurements below were taken on `main` at `4e30c83390683add3ccd0eb65b33b1eda304834a` (PR #42 merged), where `npm test` passed 198 tests, Node v24.21.0, ICU 78.3. A local harness called `createPrototypeWorld` and `runTick` with no player commands, on seeds 1847 / 2718 / 4096, for 1200 ticks. The hook sat after `confirmUnansweredOrders` and before the character loop, then it was removed. No source change is in this commit. This note is not decided until it moves into [world simulation](world-simulation.md) or [autonomous characters](autonomous-characters.md).

The committed 72-tick fixture reproduced on that tree:

| Seed | State hash | Events |
| ---: | --- | ---: |
| 1847 | `8e081fb09f0a73c29a8ca37581552f31ad8906fe5889fe4805dcf855e97f954a` | 8301 |
| 2718 | `64e843281dcb0733918fa72393a71f25ed36bdc40ae4d56e320c7461fca91538` | 8516 |
| 4096 | `b85a681050e4e21c96ea69dab9677565253641dae0bc26ca1b230996076e81d6` | 8031 |

A figure at tick 0 is the world before any `runTick`. A figure at tick 72, 400, or 1200 is the world after that many calls (`world.tick` equals that number). The fixture's last event tick is 71. Tick numbers on events are the `tick` field. Upsets are `battle-resolved` events whose outcome is `defender-victory` and whose attacker score is higher. Verdant Cay stays neutral and unowned on every variant and seed, garrison 84 at tick 400 and 103 at tick 1200.

## The problem

No order is minted after tick 0. `orderFor` (`src/sim/scenario.ts`) writes the opening twenty, all `pending`. World Government's issuer is Mara Vane (`character-01`). Free Tide's is Pax Ash (`character-14`). `standing-order-issued` fires only from the player command `issue-order`. These baseline runs emit it 0 times.

[Loyalty drift](loyalty-drift.md#autonomous-commander-orders) sketched the smallest autonomous version and measured it on the pre-M27 tree. Every 24 ticks, if Pax was free and Free Tide held a port, he issued one `protect` on the Free Tide port with the highest garrison, lower settlement id on a tie. The recipient was the lowest-id free faction mate with no open order from him. Open is pending, active, or awaiting confirmation, the M25 slot. A mate who had already refused `protect` on that port was skipped. World Government did not issue. Mara never issues. The acting commander did not issue. Every issue in that 400-tick window was refused, because a completion report stayed `awaiting-confirmation` and held the slot, so the only mates who could be chosen were the opening refusers. The history still diverged at tick 24, and the ports differed by tick 400.

M27 is now in this tree. `confirmUnansweredOrders` (`src/sim/engine.ts`) closes an unsigned report, and a `completed` order does not hold the slot. The same mates become eligible again. That interaction was not measured on either tree. It is the point of this note. [Owner questions](owner-questions.md) question 46 still says the measured sketch rewrites the first 72 ticks, and the default is not to build it inside the loyalty change. This note measures the sketch again, on the tree that actually closes reports.

## The paths that already exist

`runTick` produces, runs player commands, resolves contracts, processes captivity, progresses troop recovery, progresses battles, expires orders, then calls `confirmUnansweredOrders`, then walks characters in id order. A human gets upkeep and travel and no plan review. An autonomous character may `reviewPlan` (`src/sim/agency.ts`). `recordOrderAssessment` emits `standing-order-accepted` or `standing-order-refused` only while the order is still `pending`.

`confirmUnansweredOrders` skips a report until it has waited at least one tick. A free autonomous issuer (`controller.kind` `autonomous`, `captivity` null) then signs it. Anyone else, including an idle human and a captive issuer, waits `ticksPerDay` (6). The event is `standing-order-completed` with `reason` `issuer-judgment` or `issuer-silent`. A protect completion also writes the victory relationship deltas. A pressure completion does not. The order row stays, with status `completed`.

`openStandingOrder` treats pending, active, and awaiting confirmation as the open slot. Refused, completed, expired, and cancelled do not. `activeStandingOrder` drives the plan from pending and active only.

`assessStandingOrder` scores obedience from priority, loyalty, trust, respect, alignment, obligation, grievance, and caution times a directive risk. Protect alignment is `personality.loyalty`. The threshold is `0.54 + ambition * 0.08`. An order already `active` counts as complied with. Nothing in these runs writes `personality.loyalty` after setup.

`planReviewReason` returns "scheduled strategic review" when the review is already due, before it considers a newer order. The new-order reason, "a new standing order requires consideration", is the last check: a pending order whose `issuedTick` is later than `plan.createdTick`. `reviewPlan` then draws `rng.between(-0.035, 0.035)` per goal and `rng.integer(6, 14)` for the next review. A review that would not have happened draws those extra. A review that was already going to happen still stores `orderAssessment` on the event, and a complying order writes its target onto the plan.

`judgeOrderCompletion` reports a protect only while the order is active and following, the officer is standing on the target, at least one day has passed since the status changed, and the settlement's faction is still the officer's. The score draws `rng.between(-0.04, 0.04)`.

The player issue path, in `processPlayerCommands`, builds a pending order, emits `standing-order-issued` with `data.order`, and emits `player-command-resolved`. `applyEvent` (`src/sim/state.ts`) pushes a copy onto the recipient. The id is `${command.id}:standing-order`. There is no autonomous caller.

## How the harness issued

The hook ran at the start of a tick, after reports had closed and before anyone reviewed a plan. It did not call `rng`. It did not queue a player command.

For each issue it built a `StandingOrder` in the seeded shape: directive `protect`, priority 0.67 (read from an opening Free Tide protect; every recorded issue on the sketch carried 0.67), `expiresTick` null, revision 1, status `pending`, adherence `unassessed`. The id was `${issuerId}:order:${recipientId}:${tick}`, so a later issue to the same mate is a new row. It then did what `emit` does. The event was `{ sequence: world.nextEventSequence, tick: world.tick, type: "standing-order-issued", actorId: issuer.id, targetId: recipient.id, data: { order } }`, passed through `applyEvent`, and pushed onto that tick's event list. There is no `commandId` and no `player-command-resolved`, because no command was queued. `applyEvent` only reads `data.order` for this type.

"Free" means `captivity === null`. A mate in a battle can still be chosen; their review waits until the battle loop is not skipping them. The recipient also has to be `autonomous`, which is the check `issue-order` already makes. Every Free Tide mate is autonomous, and the human skip on Pax's issues was 0.

The port is the issuer's faction port with the highest garrison, lower settlement id on a tie. The recipient, unless a variant says otherwise, is the lowest-id free autonomous faction mate with no open order from that issuer, skipping a mate who already has a `refused` `protect` on that same port.

## Variants

**Baseline.** The hook is unset.

**Sketch.** Every 24 ticks from tick 24 through the last mark inside the run, tick 1176. That is 49 marks. Pax only. Skip the mark if he is captive or Free Tide holds no port.

**After 72.** The sketch, except the first mark that qualifies is tick 96, the first multiple of 24 greater than 72. Forty-six marks. A mark inside a portless stretch or a captivity still issues nothing, so the first real issue can be later than 96.

**Slow 72.** The sketch on a 72-tick clock, from tick 72 through tick 1152. Sixteen marks. Tick 72 is the first event of the 73rd `runTick`. It is outside the fixture, whose last event tick is 71.

**On free.** No clock. On a tick where Pax's `confirmUnansweredOrders` closes at least one of his orders, issue one protect with the sketch's recipient rule. The mate who just finished is not preferred. The lowest id is.

**Successor.** No clock. Each order Pax closes is followed, on that same tick, by a new protect to that same mate, if they are free, have no open order, and have not refused protect on the chosen port. One tick can issue more than one.

**Both non-human issuers.** The sketch's clock and recipient rule, applied to Mara and to Pax, skipping an issuer whose controller is human.

`standing-order-amended`, `standing-order-cancelled`, `standing-order-expired`, and `player-command-resolved` stayed 0 on every variant and seed.

## Baseline

| Seed | Accepted | Refused | Reports | Confirms | Judgment | Silent | Events at 400 | Decisions at 400 | Events at 1200 | Decisions at 1200 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1847 | 14 | 6 | 13 | 13 | 5 | 8 | 49291 | 8081 | 162328 | 27019 |
| 2718 | 14 | 6 | 14 | 14 | 6 | 8 | 50352 | 8308 | 166091 | 27673 |
| 4096 | 16 | 4 | 15 | 15 | 5 | 10 | 49121 | 8271 | 162588 | 27116 |

Reports are `standing-order-completion-reported`. Confirms are `standing-order-completed`. One acceptance on 1847 has not reported by tick 1200. One acceptance on 4096 has not reported. Claims, battles, and upsets:

| Seed | Claims 400 / 1200 | Battles 400 / 1200 | Upsets 400 / 1200 | Pax captured | Pax released |
| ---: | --- | --- | --- | --- | --- |
| 1847 | 5 / 13 | 16 / 37 | 0 / 8 | 551, 837, 1116 | 635, 921 |
| 2718 | 6 / 12 | 17 / 33 | 0 / 5 | none | none |
| 4096 | 4 / 9 | 18 / 32 | 2 / 8 | 310, 422, 1121 | 394, 506 |

The two upsets by tick 400 are both on 4096: Esme Dusk at Glassport, tick 298, scores 192.971 / 48.5, and Pax at Cinder Key, tick 310, scores 411.226 / 26.616. The first upset on 1847 is Esme at Crown Harbor, tick 550, scores 245.349 / 236.624. The first on 2718 is Pax at Cinder Key, tick 620, scores 581.303 / 33.072.

Ports, faction and owner:

| Seed | Tick | Cinder Key | Crown Harbor | Glassport |
| ---: | ---: | --- | --- | --- |
| 1847 | 400 | Free Tide, Pax Ash, garrison 9 | World Government, unowned, 201 | Free Tide, Pax Ash, 7 |
| 1847 | 1200 | World Government, Bram Quill, 14 | World Government, Lio Crow, 14 | World Government, Vale Drake, 11 |
| 2718 | 400 | World Government, Niko Wren, 7 | World Government, unowned, 184 | Free Tide, Mina Vale, 7 |
| 2718 | 1200 | World Government, Bram Quill, 9 | Free Tide, Finn Frost, 11 | World Government, Niko Wren, 13 |
| 4096 | 400 | World Government, Iris Stone, 14 | World Government, unowned, 249 | Free Tide, Mina Vale, 11 |
| 4096 | 1200 | World Government, Niko Wren, 13 | World Government, unowned, 225 | World Government, Bram Quill, 13 |

Free Tide holds no port across these claim-to-claim stretches. A stretch still open at tick 1200 has no return claim. The length of a closed stretch is the difference of the ticks.

| Seed | Portless stretches |
| ---: | --- |
| 1847 | 77–231 (154), 561–609 (48), 764–934 (170), 1126 onward (74) |
| 2718 | 35–48 (13), 311–383 (72), 555–782 (227), 1088–1147 (59) |
| 4096 | 51–54 (3), 77–324 (247), 478–499 (21), 932 onward (268) |

At tick 24, before the sketch's first issue, the log still matches this baseline, so the roster is the baseline roster. Pax is free. The port is Cinder Key, garrison 111, 89, and 76.

On 1847, Mina Vale's opening protect is already `completed` (the sketch's later record puts that confirm at tick 7). Corin Hale, Esme Dusk, and Dax Pike still hold an open order. Zara Gale's trade order and Mara Calder's protect are `completed`. Finn Frost's explore and Bram Tern's trade are `refused`. Five mates are eligible. Three are skipped for an open order. The lowest id is Mina.

On 2718, Mina's opening protect is `refused`, so she is skipped for Cinder Key. Esme's pressure is still open. Corin's protect is `completed` (confirm at tick 11). She is the lowest id left.

On 4096, Mina has refused protect on Cinder Key, Dax is captive, Esme's pressure is open, and Corin's protect is `completed` (confirm at tick 11). She is the lowest id left.

## Sketch

The first event that is not in the baseline at that index is `standing-order-issued` at tick 24, on every seed. After that insertion is skipped, the next mismatch is the same tick:

| Seed | Issue | Next mismatch |
| ---: | --- | --- |
| 1847 | Pax to Mina Vale, protect Cinder Key, `character-14:order:character-15:24` | Mina's `plan-reconsidered`, reason "a new standing order requires consideration", selected goal recover-strength, plan target Cinder Key. The baseline event is her `decision-made`, work, at Glassport |
| 2718 | Pax to Corin Hale, protect Cinder Key | Corin's `plan-reconsidered`. The reason stays "scheduled strategic review" and the selected goal stays serve-faction. The plan target is Cinder Key. The baseline plan target is empty |
| 4096 | Pax to Corin Hale, protect Cinder Key | Corin's `plan-reconsidered`, reason "a new standing order requires consideration", selected goal serve-faction. The baseline event is her `decision-made`, work, at Cinder Key |

The 72-tick hash does not hold.

| Seed | State hash | Events |
| ---: | --- | ---: |
| 1847 | `43a9c457346c782cb384417c366389b3307ab4048d9cbe83e5a1f5db387b56b3` | 8410 |
| 2718 | `5786629507f435ff5b6c28cfa87ab72c871e128078bd7f76ce1e1257ff97cc03` | 8570 |
| 4096 | `85c644b65fece4fe109651825d38f04145fd01dc0214696093162bfd9bd861d9` | 8189 |

| Seed | Issues | Accepted | Refused | Reports | Confirms | Judgment | Silent | Reissues after a free | Same tick | Of a seeded close | Of one of these orders |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1847 | 25 | 25 | 0 | 25 | 25 | 23 | 2 | 25 | 0 | 3 | 22 |
| 2718 | 34 | 33 | 1 | 32 | 32 | 31 | 1 | 33 | 0 | 4 | 29 |
| 4096 | 27 | 22 | 5 | 22 | 22 | 21 | 1 | 24 | 0 | 6 | 18 |

A reissue is an issue to a mate who already has a `standing-order-completed` from Pax at or before that tick. All 25, 33, and 24 of those were accepts except two refusals on 4096, both Zara Gale, ticks 120 and 144, after her seeded trade confirm at tick 6. The other refusals had no prior confirm: Mina at Glassport on tick 72, on 2718 and on 4096, and Finn Frost at Cinder Key on tick 168 and at Glassport on tick 480, on 4096. Mina's opening protect on those two seeds was already a refusal, and Glassport was a port she had not refused yet.

No mark found zero eligible mates. The 49 marks are issues plus skips:

| Seed | Issues | No port | Pax captive | Last issue | Issues from tick 1000 | Most to one mate |
| ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1847 | 25 | 15 | 9 | 912 | 0 | Mina Vale, 9 |
| 2718 | 34 | 15 | 0 | 1176 | 8 | Corin Hale, 26 |
| 4096 | 27 | 13 | 9 | 1176 | 7 | Corin Hale, 9 |

Ports issued: 1847 Cinder Key 8 and Glassport 17; 2718 Cinder Key 7 and Glassport 27; 4096 Cinder Key 15 and Glassport 12. The clock is still issuing at tick 1176 on 2718 and 4096. On 1847 the marks after 912 are portless or fall while Pax is captive (312, 336, 360, 384, then 432 through 480, then 1152 and 1176). That is the brake. It is not the refusal list.

The two silent closes on 1847 are Zara, issued 168, reported 344, closed 350, during Pax's hold 311–395, and Mina, issued 408, reported 414, closed 420, during the hold 413–497. The silent close on 2718 is Corin, issued 1176, reported 1182, closed 1188, after his capture at 1178. The silent close on 4096 is Corin, issued 96, reported 949, closed 955, during the hold 940–1024. A captive issuer waits a day. The acting commander does not sign.

One acceptance on 2718 has not reported by tick 1200. Every acceptance on 1847 and 4096 has reported and been confirmed. Pax's captures on this run are 311, 413, and 1147 on 1847 (releases 395 and 497; the third hold is still open), 1178 on 2718 (still open), and 744, 844, and 940 on 4096 (releases 828, 928, and 1024).

| Seed | Events 400 | Decisions 400 | Claims 400 / 1200 | Battles 400 / 1200 | Upsets 400 / 1200 | Events 1200 | Decisions 1200 |
| ---: | ---: | ---: | --- | --- | --- | ---: | ---: |
| 1847 | 49212 | 8008 | 4 / 9 | 12 / 30 | 0 / 6 | 160176 | 26274 |
| 2718 | 51069 | 8480 | 6 / 8 | 19 / 35 | 0 / 13 | 167671 | 28193 |
| 4096 | 50348 | 8478 | 5 / 8 | 17 / 35 | 1 / 10 | 162041 | 27083 |

The upset by tick 400 on 4096 is Orin Rill at Cinder Key, tick 372, scores 304.922 / 25.494. The first on 1847 is Sable Morrow at Glassport, tick 874, scores 257.345 / 39.789. The first on 2718 is Zara Gale at Crown Harbor, tick 515, scores 282.216 / 250.517.

| Seed | Tick | Cinder Key | Crown Harbor | Glassport |
| ---: | ---: | --- | --- | --- |
| 1847 | 400 | World Government, Orin Rill, 14 | World Government, unowned, 224 | Free Tide, Corin Hale, 8 |
| 1847 | 1200 | World Government, Bram Quill, 13 | World Government, unowned, 147 | World Government, Toma Reef, 13 |
| 2718 | 400 | World Government, Ada Sorn, 7 | World Government, unowned, 129 | Free Tide, Corin Hale, 6 |
| 2718 | 1200 | World Government, Ada Sorn, 12 | World Government, unowned, 89 | Free Tide, Mina Vale, 13 |
| 4096 | 400 | Free Tide, Pax Ash, 12 | World Government, unowned, 223 | Free Tide, Esme Dusk, 10 |
| 4096 | 1200 | World Government, Lio Crow, 14 | World Government, unowned, 215 | Free Tide, Bram Tern, 13 |

Portless stretches: 1847 is 174–343 (169), 685–706 (21), and 932 onward (268). 2718 is 35–48 (13), 316–381 (65), and 685–970 (285). 4096 is 38–57 (19) and 495–862 (367).

## After 72

Hash-neutral at 72 ticks, on all three seeds. The state hash and the event count match the fixture. The first issue is not inside that window.

| Seed | First issue | Recipient and port | Next mismatch after the insertion |
| ---: | --- | --- | --- |
| 1847 | 240 | Mina Vale, Glassport, garrison 6. Marks 96 through 216 were portless | Mina's `plan-reconsidered` at tick 240. Both sides say "scheduled strategic review". The baseline selected goal is recover-strength. The variant selected goal is serve-faction |
| 2718 | 96 | Mina Vale, Glassport, garrison 9. She refuses it | Pax's `battle-started` at Crown Harbor. The events between the issue and that battle match the baseline. The battle payload matches once the id is removed. The id moves from `battle-011473` to `battle-011474`, because `startMajorBattle` reads `nextEventSequence` and the issue has already advanced it |
| 4096 | 408 | Mina Vale, Glassport, garrison 11. She refuses it. Marks 96 through 288 were portless, and 312 through 384 were his captivity | Mina's `plan-reconsidered` at tick 408, reason "a new standing order requires consideration", selected goal expand-influence. The baseline event is her `travel-progressed` toward Glassport |

On 4096 the event log matches the baseline through tick 407. Tick 400 still has 49121 events, 8271 decisions, 4 claims, 18 battles, 2 upsets, and the baseline port row.

| Seed | Issues | Accepted | Refused | Reports | Confirms | Judgment | Silent | Reissues after a free | Same tick | Still active at 1200 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1847 | 31 | 31 | 0 | 29 | 29 | 29 | 0 | 31 | 0 | 2 |
| 2718 | 39 | 37 | 2 | 32 | 32 | 32 | 0 | 37 | 0 | 5 |
| 4096 | 25 | 22 | 3 | 21 | 21 | 21 | 0 | 23 | 0 | 1 |

The two refusals on 2718 are both Mina, Glassport at tick 96 and Crown Harbor at tick 576, with no prior confirm. The three on 4096 are Mina at Glassport tick 408, Zara at Glassport tick 432 after her trade confirm at tick 6, and Finn at Glassport tick 456 with no prior confirm. Skips: 1847 no-port 11 and captive 4; 2718 no-port 3 and captive 4; 4096 no-port 10 and captive 11. No mark was short of an eligible mate. Last issue ticks are 1056, 1176, and 1176. Issues from tick 1000 are 3, 8, and 8. Most to one mate: Mina 21, Corin 18, Dax Pike 13.

| Seed | Events 400 | Decisions 400 | Claims 400 / 1200 | Battles 400 / 1200 | Upsets 400 / 1200 | Events 1200 | Decisions 1200 |
| ---: | ---: | ---: | --- | --- | --- | ---: | ---: |
| 1847 | 49626 | 8111 | 5 / 16 | 19 / 50 | 0 / 16 | 163234 | 26802 |
| 2718 | 50172 | 8136 | 6 / 18 | 19 / 45 | 0 / 10 | 164057 | 27198 |
| 4096 | 49121 | 8271 | 4 / 8 | 18 / 37 | 2 / 12 | 159698 | 26639 |

Ports at tick 400 on 1847: Cinder Key Free Tide, Corin Hale, garrison 8; Crown Harbor World Government, unowned, 87; Glassport Free Tide, Pax Ash, 12. At tick 1200: Cinder Key World Government, Niko Wren, 10; Crown Harbor World Government, Jun Marrow, 14; Glassport Free Tide, Zara Gale, 7.

Ports at tick 400 on 2718: Cinder Key World Government, Bram Quill, 7; Crown Harbor World Government, unowned, 169; Glassport Free Tide, Mina Vale, 6. At tick 1200: Cinder Key World Government, Niko Wren, 6; Crown Harbor Free Tide, Bram Tern, 10; Glassport World Government, Niko Wren, 12.

Ports at tick 1200 on 4096: Cinder Key World Government, Niko Wren, 13; Crown Harbor World Government, unowned, 163; Glassport Free Tide, Zara Gale, 6. Tick 400 matches the baseline row above.

Portless stretches: 1847 is 77–231 (154) and 1057–1180 (123). 2718 is 35–48 (13), 311–381 (70), and 606–718 (112). 4096 is 51–54 (3), 77–324 (247), and 478–590 (112). The early 4096 stretches match the baseline because the first issue is tick 408.

## Slow 72

Hash-neutral at 72 ticks, on all three seeds. The first event is tick 72, `standing-order-issued`, which the fixture does not contain.

| Seed | First issue | Accepted or refused | Next mismatch after the insertion |
| ---: | --- | --- | --- |
| 1847 | Mina Vale, Glassport, garrison 14 | Accepted at tick 72. Prior confirm tick 7 | Mina's `plan-reconsidered`, reason "a new standing order requires consideration", selected goal recover-strength, plan target Glassport. The baseline event is her `decision-made`, trade-local, at Glassport |
| 2718 | Corin Hale, Cinder Key, garrison 7 | Accepted at tick 72. Prior confirm tick 11 | Corin's `plan-reconsidered`, reason "a new standing order requires consideration", selected goal serve-faction, plan target Cinder Key. The baseline event is her `decision-made`, work, at Glassport |
| 4096 | Mina Vale, Glassport, garrison 14 | Refused at tick 72. No prior confirm | Mina's `plan-reconsidered`, reason "a new standing order requires consideration", selected goal build-power. The baseline event is her `travel-progressed` toward Glassport |

| Seed | Issues | Accepted | Refused | Reports | Confirms | Reissues after a free | Same tick | Still active at 1200 | Last issue | Most to one mate |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1847 | 12 | 12 | 0 | 12 | 12 | 12 | 0 | 0 | 1152 | Mina Vale, 11 |
| 2718 | 10 | 8 | 2 | 7 | 7 | 8 | 0 | 1 | 1152 | Corin Hale, 8 |
| 4096 | 7 | 3 | 4 | 2 | 2 | 5 | 0 | 1 | 1152 | Corin Hale, 3 |

All 12, 7, and 2 confirms are `issuer-judgment`. The refusals on 2718 are Mina at Glassport tick 432 and at Crown Harbor tick 864, neither with a prior confirm. The refusals on 4096 are Mina at Glassport tick 72, Zara at Cinder Key tick 504 after her trade confirm at tick 6, Finn at Cinder Key tick 576 with no prior confirm, and Zara at Glassport tick 1152 after that same trade confirm. Skips: 1847 no-port 4; 2718 captive 2 and no-port 4; 4096 no-port 7 and captive 2. Sixteen marks, all accounted for. Issues from tick 1000 are 3, 3, and 1.

| Seed | Events 400 | Decisions 400 | Claims 400 / 1200 | Battles 400 / 1200 | Upsets 400 / 1200 | Events 1200 | Decisions 1200 |
| ---: | ---: | ---: | --- | --- | --- | ---: | ---: |
| 1847 | 48174 | 7666 | 5 / 13 | 18 / 44 | 0 / 10 | 161681 | 26537 |
| 2718 | 50448 | 8261 | 6 / 14 | 20 / 40 | 0 / 8 | 166465 | 27772 |
| 4096 | 49994 | 8449 | 5 / 8 | 16 / 32 | 0 / 11 | 163471 | 27488 |

Ports at tick 400: 1847 Cinder Key Free Tide, Pax Ash, garrison 8, Crown Harbor World Government unowned 114, Glassport Free Tide, Pax Ash, 13. 2718 Cinder Key World Government, Niko Wren, 7, Crown Harbor World Government unowned 151, Glassport Free Tide, Mina Vale, 7. 4096 Cinder Key Free Tide, Pax Ash, 8, Crown Harbor World Government unowned 257, Glassport Free Tide, Mina Vale, 14.

Ports at tick 1200: 1847 Cinder Key Free Tide, Finn Frost, 10, Crown Harbor Free Tide, Finn Frost, 14, Glassport World Government, Bram Quill, 13. 2718 Cinder Key Free Tide, Finn Frost, 12, Crown Harbor World Government, Niko Wren, 12, Glassport World Government, Sable Morrow, 11. 4096 Cinder Key World Government, Niko Wren, 13, Crown Harbor World Government unowned 180, Glassport Free Tide, Esme Dusk, 14.

Portless stretches: 1847 is 77–248 (171), 592–725 (133), and 1044–1057 (13). 2718 is 35–48 (13), 311–383 (72), 552–833 (281), and 905–915 (10). 4096 is 51–54 (3), 77–267 (190), and 592–1048 (456).

## On free

The 72-tick hash does not hold. The first issue is the tick of the first Pax confirm that finds a port and a free Pax.

| Seed | First issue | What happened | 72-tick hash | Events |
| ---: | --- | --- | --- | ---: |
| 1847 | Tick 1, Zara Gale, Cinder Key, garrison 115 | Accepted. Her seeded trade order closed on that same tick, and she was the lowest id eligible | `91ed04e304c77d2d939d636b08e30333b3008253d4a0f1534da814d6e741fadd` | 8522 |
| 2718 | Tick 4, Finn Frost, Cinder Key, garrison 111 | Accepted. His seeded explore closed on that tick | `6dac5d4bcf84f09ef1c587d26c5fc1e5b38dad254cd55061d3cde5f9276ac1b8` | 8771 |
| 4096 | Tick 6, Zara Gale, Cinder Key, garrison 115 | Refused. Her seeded trade order closed on that tick. Finn's explore was still a refusal, so he was not the lowest id | `13a462e842554be34f9d97c2cbf13c878e2a9ed24831aa71305f363148ab7890` | 8426 |

The next mismatch, after the insertion, is a `plan-reconsidered` on that same tick: Zara on 1847 (reason "no active plan", selected goal serve-faction; the baseline selected build-wealth), Finn on 2718 (reason "no active plan", selected goal serve-faction; the baseline selected explore-world), Zara on 4096 (reason "no active plan", selected goal still build-wealth, payload hash changed).

| Seed | Issues | Accepted | Refused | Reports | Confirms | Reissues after a free | Same tick | Last issue | Most to one mate | Issues from tick 1000 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| 1847 | 77 | 76 | 1 | 75 | 75 | 76 | 76 | 1180 | Mina Vale, 58 | 5 |
| 2718 | 15 | 14 | 1 | 14 | 14 | 14 | 13 | 96 | Corin Hale, 4 | 0 |
| 4096 | 11 | 8 | 3 | 8 | 8 | 9 | 9 | 368 | Corin Hale, 8 | 0 |

The refusal on 1847 is Finn at Cinder Key, tick 13, with no prior confirm. The refusal on 2718 is Mina at Glassport, tick 95, with no prior confirm. The refusals on 4096 are Zara at Cinder Key tick 6, Finn at Cinder Key tick 14 with no prior confirm, and Mina at Glassport tick 368 with no prior confirm. All confirms are `issuer-judgment` except Corin's on 2718, issued 96, closed 110, `issuer-silent`. One acceptance on 1847 has not reported by tick 1200. Skips for captivity or no port: 0, 1, and 1. The 1847 run is the churn: 76 of 77 issues are a same-tick reissue, and it is still issuing at tick 1180.

| Seed | Events 400 | Decisions 400 | Claims 400 / 1200 | Battles 400 / 1200 | Upsets 400 / 1200 | Events 1200 | Decisions 1200 |
| ---: | ---: | ---: | --- | --- | --- | ---: | ---: |
| 1847 | 50678 | 8388 | 5 / 13 | 13 / 36 | 0 / 11 | 169031 | 28503 |
| 2718 | 51410 | 8554 | 6 / 15 | 16 / 37 | 0 / 5 | 165346 | 27645 |
| 4096 | 49721 | 8240 | 5 / 13 | 18 / 41 | 0 / 9 | 159075 | 26404 |

Ports at tick 400: 1847 Cinder Key Free Tide, Corin Hale, 14, Crown Harbor World Government unowned 222, Glassport Free Tide, Mina Vale, 12. 2718 Cinder Key World Government, Niko Wren, 5, Crown Harbor World Government unowned 218, Glassport Free Tide, Zara Gale, 7. 4096 Cinder Key Free Tide, Mina Vale, 7, Crown Harbor World Government unowned 178, Glassport Free Tide, Pax Ash, 9.

Ports at tick 1200: 1847 Cinder Key Free Tide, Mina Vale, 12, Crown Harbor Free Tide, Mina Vale, 12, Glassport World Government, Lio Crow, 8. 2718 Cinder Key World Government, Bram Quill, 9, Crown Harbor Free Tide, Bram Tern, 13, Glassport Free Tide, Bram Tern, 8. 4096 Cinder Key Free Tide, Mara Calder, 6, Crown Harbor Free Tide, Zara Gale, 12, Glassport World Government, Bram Quill, 14.

Portless stretches: 1847 is 58–67 (9) and 514–763 (249). 2718 is 32–68 (36), 373–383 (10), 554–725 (171), and 1055–1082 (27). 4096 is 57–88 (31), 153–344 (191), 623–856 (233), and 1015–1145 (130).

## Successor

The 72-tick hash does not hold. The first issue matches on-free on 2718 and 4096, and on 1847 it is the same tick-1 issue to Zara, because she is the mate whose report just closed and she is eligible. The difference is who comes next. Successor gives the job back to the mate who just finished, instead of to the lowest id.

| Seed | 72-tick hash | Events | Issues | Accepted | Refused | Reports | Confirms | Same-tick reissues | Last issue | Most to one mate |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1847 | `620fc3fab47adeb322d5293fc37d9734b2aeb018cb1c431df0b0cc50253b80b5` | 8767 | 23 | 23 | 0 | 23 | 23 | 23 | 46 | Zara Gale, 6 |
| 2718 | `e1dda8cd8745f310da4a7cc57f05e05e29327b22108cba7c2c271e8f110b408a` | 8759 | 42 | 42 | 0 | 41 | 41 | 42 | 598 | Corin Hale, 12 |
| 4096 | `9927120ef850d947125bd4d5cfafaf3fd8f114435c993747e138222957677278` | 8457 | 138 | 136 | 2 | 135 | 135 | 138 | 738 | Dax Pike, 57 |

Every issue on this variant is a same-tick reissue. The two refusals are both on 4096 at tick 6: Zara Gale and Bram Tern, each after a seeded confirm on that tick. Judgment confirms are 18, 36, and 133. Silent confirms are 5, 5, and 2. One acceptance on 2718 and one on 4096 have not reported by tick 1200. Issues from tick 1000 are 0 on every seed. The 4096 run is the runaway: 138 issues, 124 of them on Cinder Key, 57 to Dax and 41 to Corin and 38 to Mara Calder, and it continues until tick 738. Skips: 1847 no-port 1 and captive 5; 2718 captive 5; 4096 no-port 1 and captive 2.

| Seed | Events 400 | Decisions 400 | Claims 400 / 1200 | Battles 400 / 1200 | Upsets 400 / 1200 | Events 1200 | Decisions 1200 |
| ---: | ---: | ---: | --- | --- | --- | ---: | ---: |
| 1847 | 49888 | 8239 | 4 / 12 | 12 / 40 | 0 / 13 | 161354 | 26818 |
| 2718 | 51886 | 8581 | 5 / 15 | 15 / 40 | 0 / 10 | 166695 | 28013 |
| 4096 | 49698 | 8347 | 4 / 8 | 17 / 34 | 1 / 8 | 163046 | 27315 |

Ports at tick 400: 1847 Cinder Key Free Tide, Mina Vale, 14, Crown Harbor World Government unowned 222, Glassport World Government, Sable Morrow, 13. 2718 Cinder Key Free Tide, Mina Vale, 12, Crown Harbor World Government unowned 200, Glassport Free Tide, Corin Hale, 7. 4096 Cinder Key Free Tide, Mina Vale, 6, Crown Harbor World Government unowned 214, Glassport World Government, Niko Wren, 12.

Ports at tick 1200: 1847 Cinder Key World Government, Vale Drake, 12, Crown Harbor Free Tide, Zara Gale, 12, Glassport World Government, Ada Sorn, 7. 2718 Cinder Key World Government, Niko Wren, 8, Crown Harbor World Government, Bram Quill, 16, Glassport World Government, Jun Marrow, 13. 4096 Cinder Key World Government, Sable Morrow, 14, Crown Harbor World Government unowned 140, Glassport Free Tide, Dax Pike, 14.

Portless stretches: 1847 is 46–58 (12), 404–495 (91), and 687–875 (188). 2718 is 34–62 (28), 554–562 (8), 600–725 (125), and 1119 onward (81). 4096 is 47–139 (92), 229–373 (144), and 744–1027 (283).

## Both non-human issuers

Mara is human, so each of the 49 marks records a human-issuer skip and does not emit. Pax's issues match the sketch. The tick-72 hash matches the sketch hash on every seed. The tick-1200 hash matches the sketch hash on every seed (`7fb14db70668…`, `3f6d8ea11876…`, `1b4e95368f12…`). Event counts, issue counts, refusals, ports, and the first differing event match the sketch tables above. World Government adds no issuer on this tree.

## What M27 did to the sketch

On the pre-M27 measurement, a finished order stayed `awaiting-confirmation` and the slot stayed shut, and every new protect was refused. On this tree the slot opens when the report closes. The first sketch issue, on every seed, goes to a mate whose seeded order has already closed, and that issue is accepted on the same tick.

The 24-tick clock then keeps using the open slot. Same-tick reissues on the sketch, on after-72, and on slow-72 are 0. The next order waits for the next mark. When it comes, it is usually accepted: 25 of 25, 33 of 34, and 22 of 27 on the sketch. The refusal rule does stop a second protect on the same port. It does not stop the clock. `no-eligible` was 0 on every cadence variant. Whenever Pax was free and Free Tide held a port, someone took the order.

Issuing on the tick the slot opens does not wait. On-free's 76 of 77 issues on 1847 are same-tick reissues, 58 of them to Mina, and the last one is tick 1180. Successor's 138 issues on 4096 are all same-tick reissues. That is the runaway. The four-day clock is what keeps the sketch at 25, 34, and 27 issues. It does not keep the map still.

## M28, M29, M30, and M31

All four are accepted and not built. None of them was applied in these runs.

**M28, the landless raid floor.** `buildCandidates` still requires `settlement.garrison >= 15`, plus 25 troops and 18 ticks since the last battle, before it offers a raid. M28 lowers that garrison test to 8 only while the faction holds no port, and the claim keeps the garrison the fight left. The portless stretches above are the windows that rule would open. The sketch moves them. Baseline 1847 starts being portless at tick 77; the sketch starts at 174. Baseline 4096 stays portless from 77 to 324; the sketch's long stretch is 495–862. A build of autonomous orders before M28 would hand that floor a different set of waits. These runs do not say how many extra raids the floor would add on top of the sketch.

**M29, the outscore rule.** A major ends when morale is 12 or under, among other tests (`resolveBattlePhase`). The attacker wins that ended major only when the garrison is 0, or troops are at least 8 and health is above 15 and morale is above 12 and the phase wins say so. M29, not applied here, would also call it the attacker's victory when the attacker score was higher, troops are at least 8, health is above 15, and the garrison is not 0. The upset counts are the list that rule would retitle. Baseline upsets at tick 1200 are 8, 5, and 8, with 0, 0, and 2 of them by tick 400. The sketch's are 6, 13, and 10, with 0, 0, and 1 by tick 400, and the one inside 400 is a different fight from either baseline upset. After-72 leaves 16, 10, and 12. Slow-72 leaves 10, 8, and 11. Building orders first changes the list M29 was accepted against.

**M30, the command seat.** The seat is not in the code. The sketch does not let an acting commander issue, confirm, or retarget. While Pax is captive the mark is skipped: 9, 0, and 9 times on the sketch. The silent closes of the new orders sit inside those holds, because M27 waits a day when the issuer is captive. The cover does not become the signer. Giving the cover the pen would turn those skipped marks into issues by someone else. That was not run.

**M31, the unpaid-release scar.** Not applied. The accepted rule keeps orders, plans, and work on the seeded loyalty, and uses the scar only for who covers the seat. `assessStandingOrder` reads `personality.loyalty` as it stands. If M31 is built as accepted, the scar does not flip these accepts. The confirmation relationship write is already live, and it does move trust and respect before a reissue. These runs did not separate that write from the rest of the score. The refusals that did happen are named above. Several of them are a mate whose seeded order was a different directive: Zara's trade order had closed, and she then refused protect.

## Recommendation

Do not build this yet.

The sketch on this tree is not the all-refusal sketch from the loyalty note. M27 frees the slot, the lowest eligible mate is someone whose seeded order has already closed, and that protect is accepted. The 72-tick fixture moves on every seed. By tick 400 the port row has moved on every seed. The four-day clock does not run away into the hundreds of orders, and it also does not stop while Pax is free and Free Tide holds a port.

After-72 and slow-72 are the variants that are hash-neutral at 72 ticks. They still change claims, upsets, and port owners by tick 1200. After-72 on 4096 is quiet through tick 400 only because Free Tide is portless and then Pax is captive. That is a property of this seed, not a promise. On-free and successor show what happens if the close itself is the order to issue again: 77 issues on 1847, and 138 on 4096.

M28 and M29 are already accepted, and they rewrite the same landless stretches and the same upset list. An orders build before those land would pin a calendar they are going to replace. World Government does not add a second issuer while Mara is the human. The acting commander, and the loyalty scar, stay out of the pen.

## Fixture movement

None. `tests/fixtures/golden-hashes.json` stays on the three hashes and counts above. `npm run golden:update` stays unrun.

The sketch would replace the pin with `43a9c457…` / 8410, `57866295…` / 8570, and `85c644b6…` / 8189. After-72 and slow-72 would leave the pin where it is and would still need a longer one before anyone trusted the tick-1200 map. This commit does not add that pin.

## Tests

Not added. A later build would add them, and the golden line would move only if the owner accepted a variant that issues inside event ticks 0–71.

- `tests/agency.test.ts`, beside "a free autonomous issuer confirms the report on the next tick without drawing rng". A protect whose prior order from the same issuer is `completed` is eligible. A mate with an open order is skipped. A mate who has `refused` protect on that port is skipped. The chosen mate is the lowest id. The issue emits one `standing-order-issued` and does not draw rng. The next plan review is what accepts or refuses.
- `tests/golden.test.ts`. "pinned seeds reproduce their committed state hash and event count" stays on `8e081fb0…`, `64e84328…`, and `b85a6810…` (8301, 8516, 8031). The sketch fails it. After-72 and slow-72 pass it.
- `tests/commands.test.ts`. The player `issue-order` tests stay. This path is not a command, and it does not emit `player-command-resolved`.

## Playtest

Follow `docs/playtests/TEMPLATE.md`. Dashboard HTTP JSON only. No survey, no raid, no other command. Mara Vane starts at Crown Harbor. This session checks the recommendation, which is that the sketch is not built.

## Session

- **Candidate commit:** `4e30c83`
- **Date:** when the session is run
- **Operator:** Codex or human
- **Interface:** dashboard / public HTTP API
- **Seed:** 1847
- **Starting tick:** 0
- **Ending tick:** 72
- **Player character:** Mara Vane (`character-01`)

## Hypothesis and ambition

**Milestone hypothesis.** Pax does not mint a protect after tick 0. The tick-72 hash stays `8e081fb09f0a73c29a8ca37581552f31ad8906fe5889fe4805dcf855e97f954a` with 8301 events.

**Player ambition.** Stay at Crown Harbor. Advance to tick 72 with no commands.

**Success signal.** The diagnostic log has no `standing-order-issued`. The tick-72 hash and event count match the fixture.

## Adaptive decision log

| Tick | Player-visible observation | Reasoning | Action | Outcome |
| ---: | --- | --- | --- | --- |
| 0 | Mara is at Crown Harbor. One pending command is not required | The check is the absence of a new order | No command | World unchanged |
| 72 | State hash and event count | The fixture is the gate | Read the report and page the log | Hash and count match the fixture. `standing-order-issued` count is 0 |

## Outcome

Time advances. No captain mints a protect. The fixture holds.

## Evidence review

- **World report:** tick 72, seed 1847, the fixture hash.
- **Metrics:** 8301 events.
- **Map:** whatever the baseline shows. This session does not need a port to change hands.
- **Decision/agency traces:** `standing-order-issued` count is 0.
- **Conversation traces:** none required.
- **Recovery and determinism:** the golden test on this commit already reproduced the fixture, including the recovery replay of 572 events.

## Findings

### What worked

- The headless baseline matches the fixture. A dashboard advance with no commands should see the same hash.

### Implementation defects

- None observed. Nothing was built.

### Design risks and opportunities

- The sketch would fail this session. Its tick-72 hash on 1847 is `43a9c457…` with 8410 events, and the first `standing-order-issued` is tick 24, Pax to Mina Vale, protect on Cinder Key.
- A follow-up, only if someone builds the after-72 rule: seed 2718, ticks 0–96, no commands. The tick-72 hash stays the fixture. The first issue is tick 96, Pax to Mina Vale, protect on Glassport, and she refuses it on that tick. `REVISE` if that issue is present and the tick-72 hash held. `ABANDON` if the tick-72 hash moved.

### Follow-up experiments

- Seed 4096, ticks 0–408, is the quiet case of the same after-72 rule. The log matches the baseline through tick 407, because the earlier marks are portless or Pax is captive. The first issue is tick 408, and Mina refuses it.

## Recommendation

`PROMOTE` if the tick-72 hash is unchanged and the log has no `standing-order-issued`. `REVISE` if the first `standing-order-issued` has tick greater than 71. `ABANDON` if the tick-72 hash moves.

`PROMOTE` here means the recommendation of this note held: captains are not yet giving orders on their own.

## Questions for Micah

1. **Should captains start giving new orders on their own?** Default: no. The four-day version rewrites the first 72 ticks. The versions that wait until after that still change who holds the ports by tick 1200.
2. **If a later version does it, when is the first order?** Default: after the first 72 ticks. The runs that wait keep today's fixture. They are not quiet after that.
3. **How often, once it starts?** Default: every four days, and only while that captain is free and their faction holds a port. Giving a new order on the same tick a report closes ran to 77 orders on seed 1847 and 138 orders on seed 4096.
4. **Who receives the order?** Default: the free faction mate with the lowest id, skipping anyone who already has an open order from that captain, and skipping anyone who already refused this protect on that port. These runs did that. The same two or three people received most of the orders.
5. **Does your own commander do this too?** Default: no. She is the human, and these runs gave her no commands. Skipping her on all 49 marks left the same history as Free Tide alone.
6. **While the commander is in prison, does the person covering the seat give the order?** Default: no. The cover still does not issue. The four-day sketch skipped 9, 0, and 9 marks because Pax was in prison.
7. **A report has just closed, so the slot is free. Does the same job go straight back out?** Default: no. A free slot is not itself an order to give another one. On the four-day clock the next order was usually accepted. On the same-tick version it was given again immediately.
