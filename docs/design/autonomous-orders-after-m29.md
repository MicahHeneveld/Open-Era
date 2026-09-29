# Autonomous orders after M29

**Status: Open.** Remeasurement for the owner to accept, change, or reject. Do not build this yet. The runs below are `main` at `02249420ecbed89b64c163c92a06a9aa12dd6d37` (PR #51). Node v24.21.0, ICU 78.3. `npm test` passed 213 tests. The committed 72-tick fixture reproduced, including the recovery replay of 572 events:

| Seed | State hash | Events |
| ---: | --- | ---: |
| 1847 | `cb04ba5d392d8b1c868cc97e54cb21b21ec171edd546bb70d0d7aba86cc69c11` | 8301 |
| 2718 | `bd7d8cc44d5fa21022ecb8f8086e13dfbb9475eb025b5ae53f87e2991f90035c` | 8513 |
| 4096 | `20975bf480e5aa11eeafe1ce39c36cf5ba0fa8e2d5de2bb5887a35d7b3aecc9f` | 8031 |

[Autonomous orders](autonomous-orders.md) measured this sketch on `4e30c83`, after M27 and before M28 and M29. [Port churn and captures](port-churn-and-captures.md) then measured the tree with both rules on: Crown Harbor on seed 1847 changes hands 20 times, and captures are 1, 3, and 5. Pax Ash is not among them. This note runs the same sketch, and the same variants, on that tree.

Runs are `createPrototypeWorld` plus `runTick`, no player commands, seeds 1847 / 2718 / 4096, 1200 ticks. A figure at tick 72 or tick 1200 is the world after that many `runTick` calls. Tick numbers on events are the `tick` field. The hook sat after `confirmUnansweredOrders` and before the character loop. It did not call `rng`. It was removed. `git diff` on `src/sim/engine.ts` is empty. Verdant Cay stays neutral on every row, garrison 103 at tick 1200. Upsets, a major `battle-resolved` with outcome `defender-victory` and a higher attacker score, are 0 on every row. M29 is on, and these runs do not produce one.

The headless baseline matches the port-churn both-rules world, including the tick-1200 hashes recorded there. The player buy-provisions edits on this SHA do not move a run with no commands. That note recorded 209 tests. This tree passes 213.

| Seed | Tick-1200 state hash | Events |
| ---: | --- | ---: |
| 1847 | `02627e6545848b4f510e68fff0ea23f7357dee8d8934fe69d11669834462a31a` | 168342 |
| 2718 | `38eef8b91aa9de0290a10a04cdfa5347d9c8a5b3dbf683b64f457be51a0003d9` | 167379 |
| 4096 | `28532e3821ef6f3c5257747f11e0d0e8c4e2d4cd97cac90dbd4edb90a7e0859a` | 164952 |

Changes of hands, fast recaptures in parentheses. A fast recapture is a later claim of the same port whose gap is 1 or 2 ticks. Flips are major attacker victories at morale at most 12, troops at least 8, health above 15, garrison not 0, and a higher attacker score. Captures are `character-captured`.

| Seed | Crown Harbor | Glassport | Cinder Key | Captures | Flips | Claims |
| ---: | --- | --- | --- | ---: | ---: | ---: |
| 1847 | 20 (5) | 12 (1) | 8 | 1 | 37 | 40 |
| 2718 | 4 | 9 | 6 (1) | 3 | 7 | 19 |
| 4096 | 0 | 14 | 5 | 5 | 13 | 19 |

On that baseline Pax is never captured. Free Tide's longest stretch with no port is 29 ticks on 1847 (335–364), a single tick on 2718, and 35 ticks on 4096 (650–685). Of the 49 sketch marks, 46, 48, and 48 fall while he is free and Free Tide holds a port. The post-M27 brake was the opposite shape: long portless stretches, and 9, 0, and 9 marks skipped because he was in prison.

## How the hook issued

The variants are the ones in the earlier note.

**Baseline.** The hook is unset.

**Sketch.** Every 24 ticks from tick 24 through tick 1176. Forty-nine marks. Pax only. Skip the mark if he is captive or Free Tide holds no port.

**After 72.** The sketch, from tick 96. Forty-six marks.

**Slow 72.** Every 72 ticks from tick 72 through tick 1152. Sixteen marks. Tick 72 is outside the fixture.

**On free.** No clock. On a tick where Pax's `confirmUnansweredOrders` closes at least one of his orders, issue one protect. The recipient is the sketch's lowest id, not the mate who just finished.

**Successor.** No clock. Each order he closes is followed, on that same tick, by a new protect to that same mate, if they are free, have no open order, and have not refused protect on the chosen port.

**Both non-human issuers.** The sketch's clock, applied to Mara Vane and to Pax, skipping an issuer whose controller is human.

The order is the seeded shape. Directive `protect`, priority 0.67, `expiresTick` null, revision 1, status `pending`. The id is `${issuerId}:order:${recipientId}:${tick}`. The event is `standing-order-issued` with `data.order` and no `commandId`. The port is the issuer's faction port with the highest garrison, lower settlement id on a tie. The recipient is the lowest-id free autonomous faction mate with no open order from him, skipping a mate who has already `refused` protect on that port. Open is pending, active, or awaiting confirmation.

`confirmUnansweredOrders` still closes a finished report, and a `completed` order does not hold the slot (`openStandingOrder`). `assessStandingOrder` is unchanged. A complying review writes the port onto the plan. Protect's preferred actions are `recruit`, `work`, and `travel` (`actionsForOrder`). `planActionBoost` adds 22 when the action's target is the plan target. `buildCandidates` still offers `raid` beside that. The landless test is `settlement.garrison >= 15 || (landless && settlement.garrison >= 8)`. `resolveBattlePhase` still sets `attackerWon` from `standingAttackerWin || outscoreAttackerWin`. A protect order does not edit either predicate.

## Orders

Same-tick is an issue on a tick that also closes one of Pax's orders. A run away is that pattern unbound by the clock: the close itself mints the next order, and the count keeps climbing. The clock variants have 0 same-tick issues. Their counts sit under the mark counts, 49, 46, and 16.

| Variant | Seed | Issued | Accepted | Refused | 72-tick | Same-tick | Last issue | Runs away |
| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | --- |
| Sketch | 1847 | 44 | 43 | 1 | Moves | 0 | 1176 | No |
| Sketch | 2718 | 44 | 42 | 2 | Moves | 0 | 1176 | No |
| Sketch | 4096 | 44 | 37 | 7 | Moves | 0 | 1152 | No |
| After 72 | 1847 | 42 | 42 | 0 | Holds | 0 | 1176 | No |
| After 72 | 2718 | 41 | 39 | 2 | Holds | 0 | 1176 | No |
| After 72 | 4096 | 46 | 41 | 5 | Holds | 0 | 1176 | No |
| Slow 72 | 1847 | 15 | 15 | 0 | Holds | 0 | 1152 | No |
| Slow 72 | 2718 | 15 | 13 | 2 | Holds | 0 | 1152 | No |
| Slow 72 | 4096 | 16 | 11 | 5 | Holds | 0 | 1152 | No |
| On free | 1847 | 121 | 120 | 1 | Moves | 121 | 1199 | Yes |
| On free | 2718 | 34 | 33 | 1 | Moves | 34 | 107 | No |
| On free | 4096 | 12 | 9 | 3 | Moves | 12 | 94 | No |
| Successor | 1847 | 99 | 98 | 1 | Moves | 99 | 881 | Yes |
| Successor | 2718 | 110 | 110 | 0 | Moves | 110 | 1157 | Yes |
| Successor | 4096 | 192 | 190 | 2 | Moves | 192 | 1198 | Yes |

Holds means the tick-72 hash and the event count match the fixture. After 72 and slow 72 hold on all three seeds. The sketch, on free, and successor do not.

Sketch hashes at 72 ticks:

| Seed | State hash | Events |
| ---: | --- | ---: |
| 1847 | `943b11e1de9129405e25cc404c7395c46ab04e021a1263020e05ee3b5e4f0598` | 8410 |
| 2718 | `a974a24aec4225e8e554b8ac394e6f6f86c919985dc00936e011c275f15507f9` | 8535 |
| 4096 | `7d06e166d702d9fcf61e204ca93df19f99b9add342603f7301e8ed921ebe7efc` | 8206 |

On free: `c4caf47776c37ae823a83e88dfb3a16526db62eb5c11260cd2798e2145e8db6e` / 8543, `06d598f88b1ce3d04e412544c5a3f07cc9806f599b2cf2fe85dd00f0031c7d49` / 8797, `2e00906d675c3fd95422facd9c42d30795cbc3b66188e25bc1006d0b51806032` / 8430.

Successor: `ff20b8cf0f8bded1a20701d8bde00b99a5fd14d04ef965321e593581a85a0d82` / 8838, `4b493976fab30d22a8d3d6ec77eb72bca19d75408dbb8f0167ca63e7cc0201fe` / 8865, `e15fa9a0f4ed23d1f4dd671ba45e809cb14ea7f49f59ecd261a20c03fcdfbdfc` / 8481.

The first sketch issue is the same order the post-M27 note recorded, on every seed. Tick 24 is before M28's first raid on the baseline (event ticks 79, 35, and 93) and before any flip.

| Seed | First issue |
| ---: | --- |
| 1847 | Pax to Mina Vale, protect Cinder Key, garrison 111 |
| 2718 | Pax to Corin Hale, protect Cinder Key, garrison 89 |
| 4096 | Pax to Corin Hale, protect Cinder Key, garrison 76 |

Those three are accepted. The 1847 sketch then has 8410 events at tick 72, the same count as the post-M27 sketch, and a different hash (`943b11e1…` against `43a9c457…`). On 2718 the sketch's tick-36 retake is still Mina Vale, and the claim garrison is 5 against the baseline's 6. That retake is inside the fixture. The hash moves.

Skips, against 49, 46, and 16 marks:

| Variant | Seed | No port | Pax captive | No eligible mate |
| --- | ---: | ---: | ---: | ---: |
| Sketch | 1847 | 1 | 4 | 0 |
| Sketch | 2718 | 1 | 0 | 4 |
| Sketch | 4096 | 2 | 0 | 3 |
| After 72 | 1847 | 0 | 4 | 0 |
| After 72 | 2718 | 1 | 4 | 0 |
| After 72 | 4096 | 0 | 0 | 0 |
| Slow 72 | 1847 | 1 | 0 | 0 |
| Slow 72 | 2718 | 0 | 1 | 0 |
| Slow 72 | 4096 | 0 | 0 | 0 |

The four captive marks on the sketch are one hold: Pax, failed retreat at Crown Harbor, tick 661, release 745. The baseline does not capture him. The orders do. After 72 captures him at 600 on 1847 and at 141 on 2718. Slow 72 captures him at 91 on 2718. The post-M27 sketch skipped 9, 0, and 9 marks for captivity, and 15, 15, and 13 for no port, and it never found a mark with no eligible mate.

The no-eligible marks are the new brake, and it is small. On 2718 they are ticks 480, 504, 528, and 552, all Glassport. Mina Vale and Bram Tern have refused protect there. The other six mates hold an active order. On 4096 they are ticks 504, 528, and 552, Glassport again. Mina, Zara Gale, Finn Frost, and Bram Tern have refused it. Corin Hale, Esme Dusk, Dax Pike, and Mara Calder are active. The clock does not hand the job to someone who refused that port, and it does not stack a second order. It waits.

Most orders still go to one or two mates. Sketch: Mina 31, Corin 28, Dax 28. After 72: Mina 27, Corin 29, Dax 38. Slow 72: Mina 11, Corin 10, Corin 6.

The refusals that did happen:

- Sketch, 1847: Finn at Crown Harbor, tick 1128, no prior confirm.
- Sketch, 2718: Mina at Glassport, tick 48, and Bram Tern at Glassport, tick 456, neither with a prior confirm.
- Sketch, 4096: Mina at Glassport tick 72, with no prior confirm. Zara at Cinder Key tick 144 and at Glassport tick 360, Finn at Cinder Key tick 168 and at Glassport tick 408, Bram Tern at Glassport tick 480 and at Cinder Key tick 648. Zara and Bram Tern already had a seeded confirm. Finn did not.
- On free, 1847: Finn at Cinder Key, tick 13, no prior confirm. That is the same refusal the post-M27 on-free run recorded, on the same tick.
- Successor, 4096: Zara and Bram Tern, both at tick 6, both after a seeded confirm on that tick.

On free's other two seeds stop. 2718's last issue is tick 107, and Pax is captured at 114. 4096's last issue is tick 94. Successor does not stop that way. Every one of its 99, 110, and 192 issues is a same-tick reissue. 2718 is still issuing at 1157. 4096 is still issuing at 1198, 87 of them to Dax. 1847's last issue is tick 881. On free's 1847 run is the other runaway: 121 issues, all same-tick, 87 of them to Mina, last issue tick 1199.

Both non-human issuers records 49 human skips, one per mark, and emits nothing for Mara. She is the human. The tick-72 hashes match the sketch. The tick-1200 hashes match the sketch (`86222b8a…`, `86843847…`, `504e5565…`). Issue counts, refusals, and port rows match the sketch.

## Ports, captures, and flips

Against the baseline row above. Fast recaptures are in parentheses.

| Variant | Seed | Crown Harbor | Glassport | Cinder Key | Captures | Flips | Claims |
| --- | ---: | --- | --- | --- | ---: | ---: | ---: |
| Sketch | 1847 | 12 (2) | 11 | 7 | 3 | 19 | 30 |
| Sketch | 2718 | 2 | 9 | 8 (3) | 2 | 20 | 19 |
| Sketch | 4096 | 2 (1) | 13 (1) | 8 (1) | 6 | 21 | 23 |
| After 72 | 1847 | 6 (1) | 9 | 6 | 8 | 15 | 21 |
| After 72 | 2718 | 14 (1) | 8 | 8 (1) | 6 | 28 | 30 |
| After 72 | 4096 | 0 | 10 | 6 | 6 | 7 | 16 |
| Slow 72 | 1847 | 21 (2) | 13 (2) | 8 | 4 | 31 | 42 |
| Slow 72 | 2718 | 13 (3) | 10 (1) | 9 (2) | 6 | 26 | 32 |
| Slow 72 | 4096 | 0 | 11 | 6 | 3 | 9 | 17 |
| On free | 1847 | 14 (3) | 11 | 8 (1) | 3 | 33 | 33 |
| On free | 2718 | 0 | 13 (3) | 6 (1) | 3 | 17 | 19 |
| On free | 4096 | 0 | 10 | 6 (1) | 1 | 14 | 16 |
| Successor | 1847 | 9 | 11 (2) | 7 (1) | 7 | 16 | 27 |
| Successor | 2718 | 0 | 10 (1) | 6 (1) | 5 | 15 | 16 |
| Successor | 4096 | 0 | 13 (2) | 6 | 4 | 11 | 19 |

Baseline captures are 1, 3, and 5. Baseline flips are 37, 7, and 13. No variant puts those capture counts back, and no variant leaves the flip counts where they were. After 72 on 1847 is the high capture row, 8, and it is also the low flip row on that seed, 15. The sketch on 2718 and 4096 raises flips, from 7 to 20 and from 13 to 21.

## Crown Harbor

Protect orders do both. They cut the 20-claim run on some variants, and they raise a quieter seed on others. They do not turn the retake off.

| Variant | 1847 | 2718 | 4096 |
| --- | ---: | ---: | ---: |
| Baseline | 20 (5 fast) | 4 | 0 |
| Sketch | 12 (2 fast) | 2 | 2 (1 fast) |
| After 72 | 6 (1 fast) | 14 (1 fast) | 0 |
| Slow 72 | 21 (2 fast) | 13 (3 fast) | 0 |
| On free | 14 (3 fast) | 0 | 0 |
| Successor | 9 | 0 | 0 |

The sketch removes the early 1847 campaign. The baseline's first Crown Harbor claim is Pax at tick 330. The sketch's first is Zara at tick 609. Two fast pairs remain, and they are the same chip the port-churn note described.

Ticks 825–828, Crown Harbor, sketch, seed 1847. Bram Tern's major ends at tick 825: morale 3, troops 417, health 89.513, scores 586.845 / 44.223, phase 1, garrison left 12. He claims at tick 826, garrison 12. On tick 827 Jun Marrow's major leaves garrison 9, morale 3, and Vale Drake's major leaves garrison 7, morale 3. Vale claims at tick 828, garrison 7. Ticks 1056–1059 are the same shape. Mina's major leaves garrison 12, morale 3, scores 259.916 / 61.526. She claims at 1057. On tick 1058 Niko Wren leaves 9 and Jun Marrow leaves 7. Jun claims at 1059, garrison 7. Both are landless outscore wins. The claim event still says the garrison at the moment of the claim. The two raids have already chipped 12 down to 7.

The same machine shows up where the baseline had little or none. The sketch gives 4096 two Crown Harbor claims and one fast pair. That seed has zero Crown Harbor claims on the baseline. After 72 raises 2718 from 4 claims to 14, and one of them is fast (Zara at tick 687, garrison 14, Vale Drake two ticks later). Slow 72 raises 1847 from 20 to 21 and 2718 from 4 to 13, with three fast pairs. The 72-tick clock keeps the fixture and feeds the port.

The order is what moves the crowd, and the floor and the victory rule are what change hands. A complying protect aims the officer at the faction port with the highest garrison. That is often not the beach the retake is about to happen on. Raid is still offered, at garrison 8 while the faction is landless and at 15 while it holds a port. The retake is one or two ticks, and the clock is 24. An order issued on the clock does not get a turn inside a pair that has already started. It changes who is standing there when the next pair starts. That is why the count moves in both directions, and why the pairs that remain are still morale 3, phase 1, garrison 12 then 9 then 7.

## What changed since the post-M27 measurement

The accept path did not change. M27 still opens the slot when the report closes. The first sketch issue is still accepted, on the same mate and the same port, on every seed. Same-tick reissues on the sketch, on after 72, and on slow 72 are still 0. The next order waits for the next mark, and that mark is usually accepted: 43 of 44, 42 of 44, and 37 of 44 on the sketch.

The world around that path changed, in `buildCandidates` and in `resolveBattlePhase`.

M28 lets a landless faction raid at garrison 8. A claim still leaves the garrison the fight left. Two phase-1 chips take 12 to 9 to 7, and 7 is legal for nobody. The port changes hands, or it sits for one tick, instead of staying lost for a hundred ticks. On the post-M27 baseline, Free Tide's portless stretches on 1847 were 154, 48, and 170 ticks. On this baseline the longest is 29. The sketch's no-port skips fall from 15, 15, and 13 to 1, 1, and 2 because the marks are no longer inside those stretches. Of 49 marks, 46, 48, and 48 are already open before any protect is issued.

M29 calls the morale-12 major an attacker victory when the score is higher, the troops are at least 8, health is above 15, and the garrison is not 0. The capture roll is drawn and ignored. The post-M27 sketch skipped 9, 0, and 9 marks because Pax was in prison. On this baseline he is never captured, which is the port-churn result. The sketch captures him once, on 1847, and that hold skips 4 marks. The prison brake is gone except where the orders create a hold.

With both brakes gone, the four-day clock issues 44, 44, and 44 times, against 25, 34, and 27. It is still issuing at tick 1176 on two seeds. It does not run away. The roster does fill. Four marks on 2718 and three on 4096 find every free mate either active or already refused on that port. The post-M27 runs never hit that, because the portless and prison skips kept a mate free.

On free and successor are worse than the measurement that recommended against them. On free on 1847 was 77 issues, last tick 1180. It is now 121, last tick 1199, 87 of them to Mina. Successor was 23, 42, and 138. It is now 99, 110, and 192, and the 4096 run is still issuing at tick 1198. The mechanism is the one the earlier note named. The close opens the slot, the hook fills it on that tick, the mate accepts, the job completes, the close issues again. M28 and M29 removed the stretches where that loop had nothing to protect and the holds where Pax could not sign.

After 72 and slow 72 are still the variants that hold the fixture. They are not quiet after it. After 72 cuts Crown Harbor on 1847 from 20 claims to 6, and raises 2718 from 4 to 14. Slow 72 leaves 1847 at 21 and 2718 at 13. Holding the first 72 ticks does not hold the churn.

## Recommendation

Do not build this yet. No variant.

The reason in the post-M27 note was that M28 and M29 were accepted and not built, so an orders build would pin a calendar they were going to replace. They are built. The sketch on the tree they produced still rewrites the first 72 ticks, from the same tick-24 protect. The four-day clock does not run away, and it also no longer stops: Pax is free, and Free Tide holds a port, on almost every mark.

After 72 and slow 72 keep today's fixture. Both of them move Crown Harbor, captures, and flips by tick 1200. After 72 is the row that cuts the 20-claim port, and it is also the row that turns 2718's four Crown Harbor claims into 14. Slow 72 raises both. On free and successor are the runaway, and the runaway is larger than it was.

A protect order is the wrong tool for the churn. It aims an officer at the faction port with the highest garrison. The retake is the landless raid, already built, winning a fight the victory rule, already built, now counts. The pairs that survive a run of orders are still that pair.

## Fixture movement

None. `tests/fixtures/golden-hashes.json` stays on the three hashes at the top. `npm run golden:update` stays unrun.

The sketch would replace the pin with `943b11e1…` / 8410, `a974a24a…` / 8535, and `7d06e166…` / 8206. After 72 and slow 72 would leave the pin where it is. Their tick-1200 hashes are below. This commit does not pin them.

| Variant | Seed | Tick-1200 state hash | Events |
| --- | ---: | --- | ---: |
| After 72 | 1847 | `770061ce53d61b02749628e1c5b43c61732b31d4e9b8496805c0a7d79cc77d18` | 161878 |
| After 72 | 2718 | `ad3280db9850c1b06acf27e47e8c9d3c73963e104c5de910e561330575e0c295` | 166640 |
| After 72 | 4096 | `589109127e6821784d63894f35296da509d9485cd67b3577c8be1195b0c77724` | 165620 |
| Slow 72 | 1847 | `91ee04025010c232488e756a786496cc3f89122341522d1a1bd24f84485d6e68` | 165913 |
| Slow 72 | 2718 | `80877a628c9bf532693c8b089de7e3edb317c63be7e84a823f1ec0dd983e13e8` | 166159 |
| Slow 72 | 4096 | `524df94212f552dd5f03252a2efefd8f5640022d178fcd8ae7499b050dfdc8bc` | 168131 |

## Tests

Not added. A later build would add them beside the test named in the earlier note, and the golden line would move only if the owner accepted a variant that issues inside event ticks 0–71. After 72 and slow 72 pass the golden test on this tree. The sketch, on free, and successor fail it.

## Questions for Micah

1. **Should captains start giving new protect orders on their own, on the tree that already has the landless raid and the outscore rule?** Default: no. The four-day sketch still rewrites the first 72 ticks. The versions that wait keep the fixture, and by tick 1200 they have changed who holds the ports.
2. **Should those orders be used to calm Crown Harbor?** Default: no. With no new orders it changes hands 20 times on seed 1847. A four-day protect cuts that to 12, or to 6 if the first order waits until after tick 72, and that same wait raises seed 2718 from 4 claims to 14. The two-tick retake that remains is still the landless raid winning an outscore fight. Orders move who is standing there. They do not turn that off.
3. **If a later version does issue, when is the first order?** Default: after the first 72 ticks. After 72 and the 72-tick clock keep today's fixture. The sketch does not. Waiting is not a promise about tick 1200.
4. **A report has just closed. Does the next protect go out on that same tick?** Default: no. That version issued 121 orders on seed 1847, the last of them at tick 1199, and 192 orders on seed 4096, still issuing at tick 1198. Every four days stays inside 46 orders.
5. **Every free mate already has an order, or has refused this port. What happens on the next mark?** Default: skip it. The four-day sketch did that, four marks on seed 2718 and three on seed 4096. Do not give the job to someone who refused it, and do not give them a second order while the first is open.
6. **Does your own commander do this too?** Default: no. She is the human. Skipping her on all 49 marks left the same history as Free Tide alone.
7. **While the commander is in prison, does the person covering the seat give the order?** Default: no. On the baseline he is never in prison. The sketch puts him there once, ticks 661–745 on seed 1847, and those marks issue nothing. The cover still does not get the pen.
