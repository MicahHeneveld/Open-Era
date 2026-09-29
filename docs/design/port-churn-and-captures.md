# Port churn and captures

**Status: Open.** Diagnosis for the owner to accept, change, or reject. No rule was left in the tree. `origin/main` is `2eef285bf10197277078fbb71d28322e77404d72` (PR #49, the captive-intelligence note). That merge is docs only. The runs below match the 1200-tick world recorded on `6c4c902` (PR #48, M29), including the tick-1200 state hashes named in the installment branch. M28, the landless raid floor at garrison 8, is built. M29, the outscore rule, is built.

Runs are `createPrototypeWorld` plus `runTick`, no player commands, seeds 1847 / 2718 / 4096, 1200 ticks, Node v24.21.0, ICU 78.3. Tick numbers on events are the `tick` field. A figure at tick 72 or tick 1200 is the world after that many `runTick` calls. `npm test` on this tree passes, 209 tests. The committed 72-tick fixture reproduced:

| Seed | State hash | Events |
| ---: | --- | ---: |
| 1847 | `cb04ba5d392d8b1c868cc97e54cb21b21ec171edd546bb70d0d7aba86cc69c11` | 8301 |
| 2718 | `bd7d8cc44d5fa21022ecb8f8086e13dfbb9475eb025b5ae53f87e2991f90035c` | 8513 |
| 4096 | `20975bf480e5aa11eeafe1ce39c36cf5ba0fa8e2d5de2bb5887a35d7b3aecc9f` | 8031 |

Split recovery, from the same `npm test`, replayed 572 events. Verdant Cay stays neutral on every row below, garrison 103 at tick 1200. The variants were patched into `src/sim/engine.ts` for the run and the file was restored. `git diff` on that file is empty.

## How the four trees were built

M28 and M29 are both in the source. The harness turned them off by editing the predicates, then ran the same three seeds.

**M28 off.** In `buildCandidates`, the raid test

`(settlement.garrison >= 15 || (landless && settlement.garrison >= 8))`

becomes `settlement.garrison >= 15`. Troops, the 18-tick cooldown, hostility, and the open-battle check stay. The `landless` value is still computed and is unused. No RNG call is added or removed.

**M29 off.** In `resolveBattlePhase`, `attackerWon` is `standingAttackerWin` alone. The call to `completeMajorBattle` passes `false` for the ignored-capture flag, where the built code passes `attackerWon && !standingAttackerWin`. The outscore boolean is still computed from scores that were already drawn. With the flag false, a defeat goes to `attemptCapture`, which draws the roll, and a standing win does not draw. That is the draw pattern from before M29.

**Neither** is both edits. **M28 only** is the M29 edit. **M29 only** is the M28 edit. **Both** is the unmodified source. On every tree that still has the ignore path, the harness kept the `rng.next()` and wrote the roll to a side list. That list is not on the world. The both-tree tick-1200 hashes are the ones already recorded for `6c4c902`:

| Seed | Tick-1200 state hash | Events |
| ---: | --- | ---: |
| 1847 | `02627e6545848b4f510e68fff0ea23f7357dee8d8934fe69d11669834462a31a` | 168342 |
| 2718 | `38eef8b91aa9de0290a10a04cdfa5347d9c8a5b3dbf683b64f457be51a0003d9` | 167379 |
| 4096 | `28532e3821ef6f3c5257747f11e0d0e8c4e2d4cd97cac90dbd4edb90a7e0859a` | 164952 |

The fixes in the next section are further edits on the both tree, the same way, and were restored with it.

## Why a fresh holder falls

`resolveSettlementClaim` writes the new owner and faction and sets stability to `max(55, stability)`. The event records `garrison: settlement.garrison`. It does not add the attacker's troops to that garrison, and it does not subtract them from the attacker. `applyEvent` for `settlement-claimed` copies owner, faction, and stability, clears `surrender`, and does not touch garrison or troops. The soldiers left in the port are the soldiers the fight left.

A major that ends on phase 1 uses intensity `0.34` and a ratio clamped to 3, so the defender loss rate in `resolveBattlePhase` is `(0.28 + 0.12 × 3) × 0.34` = 0.2176. From 15 that removes 3 and leaves 12. From 12 it removes 3 and leaves 9. From 9 it removes 2 and leaves 7. Every fast Crown Harbor pair on seed 1847 is that chip, twice: 12, then 9, then 7.

The raid gate is in `buildCandidates`. A faction that still holds a port can raid only at garrison 15 or more. A landless faction can raid at garrison 8 or more. Troops must be at least 25, `lastBattleTick` at least 18 ticks ago, and no battle already open there. Garrison 12 is legal for the landless faction and illegal for a faction that still has a port. Garrison 7 is legal for nobody. The second chip is what closes the gate. There is no third raid on that tick.

`runTick` resolves decisions in character-id order, after `progressActiveBattles`. A raid that ends on morale does so inside that decision: `startMajorBattle` runs phase 1 immediately, morale is at most 12, and `completeMajorBattle` runs before the next character. The raid used up the winner's action. The claim is their next decision, which is the next tick. A character with a higher id, still anchored on that beach, can raid after the claim on the claim tick itself. Their claim is then one tick later. A character with a lower id has already acted, so they raid the following tick and claim the tick after that. The gap is 1 or 2 because of that sort, not because anyone sailed in.

Surrender is offered on an attacker victory when garrison is still at most 15 and stability is at or below `surrenderStabilityLimit`. At garrison 10 and below the limit is 80. The claim floor of 55 and one phase of stability loss both sit under it. The offer names the last winner, because each victory overwrites `surrender`.

On these fast retakes the counter-raiders are already at the port (`locationId` is the port, `travel` is null). They are the faction that just lost it, and that faction now holds no port, which is why `landless` is true. Unaffiliated parties on the same dock are not offered a raid. Mara Vane is there and does not act. The previous holder's captains who did not just fight are past the 18-tick battle cooldown.

Provisions explain the morale, and they do not explain the garrison of 12. On all ten Crown Harbor counter-raids in the five fast pairs, the port shelf is 0, the attacker's cargo is 0, and the upkeep shortage is between 1.26 and 2.004. Phase morale is 3. `buildCandidates` scores `buy-provisions` at −1000 when the shelf is under 1, so standing there does not refill the hold. The major ends because morale is at most 12. M29 then calls it an attacker victory: troops are in the hundreds, health is in the 90s, the garrison is not 0, and the score is higher. `completeMajorBattle` draws the capture roll and ignores it. An immediate battle does not use that path. The one fast retake inside the fixture, Cinder Key on 2718 at ticks 35 and 36, is an immediate victory by Mina Vale, morale 77.29, shortage 0, cargo 22.547, garrison 14 down to 6. She is fed. Hunger is not that retake.

Crown Harbor's regrowth interval is 11 ticks, and regrowth requires a fed port. The counter-raid is the same tick as the claim, or the next tick. The interval never gets a turn.

### Seed 1847, Crown Harbor, 20 claims

`settlement-claimed` on Crown Harbor, both rules on. The first four ticks are the same on the M28-only tree. Tick 609 is the one the earlier list left out. It is Zara Gale, gap 12, garrison 4. The five gaps of 1 or 2 are marked.

| Tick | Claimant | Faction | Garrison on the claim | Gap |
| ---: | --- | --- | --- | ---: |
| 330 | Pax Ash | Free Tide | 12 | |
| 334 | Iris Stone | World Government | 5 | 4 |
| 364 | Pax Ash | Free Tide | 3 | 30 |
| 498 | Niko Wren | World Government | 6 | 134 |
| 595 | Pax Ash | Free Tide | 12 | 97 |
| 597 | Iris Stone | World Government | 7 | 2 |
| 609 | Zara Gale | Free Tide | 4 | 12 |
| 727 | Niko Wren | World Government | 12 | 118 |
| 728 | Finn Frost | Free Tide | 7 | 1 |
| 815 | Niko Wren | World Government | 12 | 87 |
| 848 | Pax Ash | Free Tide | 12 | 33 |
| 881 | Niko Wren | World Government | 12 | 33 |
| 882 | Finn Frost | Free Tide | 7 | 1 |
| 892 | Sable Morrow | World Government | 6 | 10 |
| 991 | Pax Ash | Free Tide | 12 | 99 |
| 993 | Sable Morrow | World Government | 7 | 2 |
| 1002 | Finn Frost | Free Tide | 6 | 9 |
| 1101 | Sable Morrow | World Government | 12 | 99 |
| 1102 | Finn Frost | Free Tide | 7 | 1 |
| 1189 | Sable Morrow | World Government | 12 | 87 |

The five fast pairs are the same shape. Two landless majors, both outscore, both phase 1, morale 3, empty holds. The claim event still says garrison 12, because that is the garrison at the moment of the claim. The two raids later in the same tick, or on the next tick, leave 7. The panel after the tick shows 7. The fresh holder never spends a tick at 12 that a later observer can see, when the counter-raiders sort after them.

| Pair | Who raids | Garrison at the decision | Left | Same tick as the claim |
| --- | --- | --- | ---: | --- |
| 595 → 597 | Niko Wren, then Iris Stone, tick 596 | 12, then 9 | 7 | No. Both sort before Pax Ash, so they raid the next tick |
| 727 → 728 | Pax Ash, then Finn Frost, tick 727 | 12, then 9 | 7 | Yes. Both sort after Niko Wren |
| 881 → 882 | Pax Ash, then Finn Frost, tick 881 | 12, then 9 | 7 | Yes |
| 991 → 993 | Niko Wren, then Sable Morrow, tick 992 | 12, then 9 | 7 | No. Both sort before Pax Ash |
| 1101 → 1102 | Pax Ash, then Finn Frost, tick 1101 | 12, then 9 | 7 | Yes. Both sort after Sable Morrow |

M28 only, no outscore, Crown Harbor claims are 330, 334, 364, 498, 628, 773, 905, and 1044. Eight claims, zero gaps of 1 or 2. The first four match. From 498 the outscore rule is what turns the retake into a win and starts the ping-pong. M29 only, floor back at 15, first differs at event tick 79 and Crown Harbor is claimed 5 times, none of them fast. Neither rule: 2 Crown Harbor claims, first difference also event tick 79. The fast pattern needs both rules.

### The other ports and seeds

Changes of hands are `settlement-claimed` counts. A fast recapture is a later claim of the same port whose gap is 1 or 2 ticks. Both rules on:

| Seed | Crown Harbor | Glassport | Cinder Key | Fast recaptures |
| ---: | --- | --- | --- | --- |
| 1847 | 20 (5 fast) | 12 (1 fast) | 8 | 6 |
| 2718 | 4 | 9 | 6 (1 fast) | 1 |
| 4096 | 0 | 14 | 5 | 0 |

The Glassport fast pair is ticks 1102 and 1104. Corin Hale claims at garrison 8. Jun Marrow, landless, raids at tick 1103, garrison 8 down to 6, outscore, morale 5.371, shortage 0.183, cargo 0, port shelf 1.249. He claims at 1104, garrison 6.

The 2718 fast pair is the fixture retake. Vale Drake claims Cinder Key at tick 35, garrison 14. Mina Vale's immediate victory is the same tick, garrison 6, and she claims at tick 36. Fed, as above.

4096 never changes Crown Harbor. From tick 856, Glassport changes hands on a 57-tick stride (856, 913, 970, 1027, 1084, 1141, then 1199). Glassport's regrowth interval is 19, and three intervals is 57, which is the climb from 12 back through 15. That is the ordinary gate, not the floor of 8.

2718 Crown Harbor claims are 960, 991, 1028, and 1114. The gaps are 31, 37, and 86. No two-tick pair.

At tick 1200, both rules on:

| Seed | Crown Harbor | Glassport | Cinder Key |
| ---: | --- | --- | --- |
| 1847 | World Government, Sable Morrow, garrison 13 | World Government, Jun Marrow, garrison 11 | Free Tide, Esme Dusk, garrison 9 |
| 2718 | World Government, Niko Wren, garrison 14 | Free Tide, Dax Pike, garrison 12 | Free Tide, Pax Ash, garrison 9 |
| 4096 | World Government, no owner, garrison 224 | World Government, Iris Stone, garrison 7 | World Government, Bram Quill, garrison 5 |

## Fixes that were measured

Each fix is on the both tree. The guard is a module-level map from port to `{ tick, previousFactionId }`, set at the start of `resolveSettlementClaim`, before `emit`. It is not a field on the world, so it does not hash by itself. The hash moves only when a decision changes.

**Claim cooldown, 3 ticks and 6 ticks.** `buildCandidates` does not offer `claim-settlement` while `world.tick - claimTick` is under 3, or under 6. Raids stay. Six ticks is one world day (`ticksPerDay` is 6). Three ticks is the smallest window that covers a gap of 1 and a gap of 2.

**Raid blackout, 6 ticks and 18 ticks.** `buildCandidates` does not offer `raid` on that port while the age of the claim is under 6, or under 18. Eighteen is the existing battle cooldown.

**Previous holder, 18 ticks.** The same blackout, only when the attacker's faction is the faction that just lost the port. Over 1200 ticks this matched the 18-tick blackout on every seed, including the tick-1200 hash. Every raid these runs blocked inside 18 ticks of a claim was the previous holder.

**Transfer of up to 10.** Before the claim event, the claimant leaves `max(0, min(troops - 25, 10))` soldiers. They are added to the garrison and taken off the party. `applyEvent` was not taught the deposit. On a forward `runTick` the mutated garrison and troops are what the rest of the tick and the hash see, because the reducer does not overwrite them. A replay of the event log would drop the deposit. The numbers below are the forward world.

Changes are listed Crown Harbor, Glassport, Cinder Key, with fast recaptures in parentheses. Upsets are major `battle-resolved` events whose outcome is `defender-victory` and whose attacker score is higher. Flips are major attacker victories at morale at most 12, troops at least 8, health above 15, garrison not 0, and a higher attacker score. The first differing tick is the event tick whose `runTick` first changes the state hash against the both tree. "Holds" means the tick-72 hash and the event count match the fixture.

| Fix | Seed | Changes (fast) | Upsets | Flips | Claims | Captures | Debts | Debt sum | 72-tick | First tick |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| Both, no fix | 1847 | 20 (5), 12 (1), 8 | 0 | 37 | 40 | 1 | 1 | 103.21 | Holds | |
| Both, no fix | 2718 | 4, 9, 6 (1) | 0 | 7 | 19 | 3 | 1 | 217.74 | Holds | |
| Both, no fix | 4096 | 0, 14, 5 | 0 | 13 | 19 | 5 | 2 | 281.65 | Holds | |
| Claim cooldown 3 | 1847 | 18, 11, 8 | 0 | 30 | 37 | 1 | 1 | 103.21 | Holds | 597 |
| Claim cooldown 3 | 2718 | 5, 8, 8 | 0 | 17 | 21 | 4 | 3 | 744.28 | Moves | 36 |
| Claim cooldown 3 | 4096 | 0, 14, 5 | 0 | 13 | 19 | 5 | 2 | 281.65 | Holds, and tick 1200 matches | |
| Claim cooldown 6 | 1847 | 21, 12, 9 | 0 | 36 | 42 | 1 | 1 | 103.21 | Holds | 334 |
| Claim cooldown 6 | 2718 | 3, 8, 8 | 0 | 12 | 19 | 4 | 3 | 744.28 | Moves | 36 |
| Claim cooldown 6 | 4096 | 0, 14, 5 | 0 | 13 | 19 | 5 | 2 | 281.65 | Holds, and tick 1200 matches | |
| Raid blackout 6 | 1847 | 20, 11, 8 | 0 | 24 | 39 | 1 | 1 | 103.21 | Holds | 331 |
| Raid blackout 6 | 2718 | 9, 11, 6 | 0 | 13 | 26 | 2 | 2 | 269.94 | Moves | 35 |
| Raid blackout 6 | 4096 | 0, 14, 5 | 0 | 11 | 19 | 5 | 2 | 281.65 | Holds | 1199 |
| Raid blackout 18 | 1847 | 11, 12, 8 | 0 | 20 | 31 | 6 | 4 | 804.30 | Holds | 79 |
| Raid blackout 18 | 2718 | 4, 11, 7 | 0 | 11 | 22 | 6 | 3 | 341.67 | Moves | 35 |
| Raid blackout 18 | 4096 | 0, 14, 5 | 0 | 11 | 19 | 5 | 2 | 281.65 | Holds | 1199 |
| Previous holder 18 | 1847 | 11, 12, 8 | 0 | 20 | 31 | 6 | 4 | 804.30 | Holds | 79 |
| Previous holder 18 | 2718 | 4, 11, 7 | 0 | 11 | 22 | 6 | 3 | 341.67 | Moves | 35 |
| Previous holder 18 | 4096 | 0, 14, 5 | 0 | 11 | 19 | 5 | 2 | 281.65 | Holds | 1199 |
| Transfer up to 10 | 1847 | 87 (20), 64 (15), 75 (16) | 0 | 113 | 226 | 8 | 5 | 443.86 | Moves | 51 |
| Transfer up to 10 | 2718 | 0, 35 (4), 49 (25) | 0 | 44 | 84 | 9 | 4 | 466.90 | Moves | 35 |
| Transfer up to 10 | 4096 | 0, 43 (11), 41 (3) | 0 | 51 | 84 | 14 | 7 | 1069.46 | Moves | 51 |

Fast recaptures are 0 on every fix except the transfer. The transfer is the one that multiplies them.

The 2718 hashes that moved:

| Fix | 72-tick hash | Events |
| --- | --- | ---: |
| Claim cooldown 3 and 6 | `2333429eb519ca422cd10b0c519863839a347ac14780249276a9d5a276b4d3e8` | 8542 |
| Raid blackout 6 | `f60a6a2f756748f9923da6cafc466957760f412ccbb49de3f246a6526cb7fb16` | 8511 |
| Raid blackout 18 and previous holder | `c386e76d401ee11bd44d20bf6237b556e65eb8af8e0c6cd850c14b969fc6123a` | 8516 |
| Transfer up to 10 | `0b252728dc2af55de1d5324e6095dd77b4f1121166370e37505461bd2b8db4d4` | 8475 |

`c386e76d…` / 8516 is the closed-unanswered hash from before the raid floor. An 18-tick blackout, for everyone or for the previous holder, erases M28 inside the fixture. The floor's only in-window event on 2718 is Mina Vale's raid at tick 35, and that raid sits inside 18 ticks of the claim that made Free Tide landless. A 6-tick raid blackout also starts there, and the hash is a third value, 8511 events. The claim cooldowns let the tick-35 raid happen and block the tick-36 claim, so the hash moves the other way, to 8542 events.

On 1847 the claim cooldown of 6 first differs at tick 334, Iris Stone's Crown Harbor claim, gap 4 after Pax at 330. That pair is one of the four claims shared with the M28-only run. The 72-tick hash still holds, because 334 is outside it. The cooldown of 3 first differs at 597, the first two-tick Crown Harbor retake. Crown Harbor still changes hands 18 times under the short cooldown and 21 times under the day cooldown. Seed 1847's capture count stays 1 and the debt stays 103.21. The wait spaces the claims out. It does not stop them, and it does not bring a capture back.

The 6-tick raid blackout on 1847 first differs at tick 331, the tick after Pax's claim at 330, and Crown Harbor still changes hands 20 times. On 4096 the 6-tick and 18-tick blackouts first differ at event tick 1199. The claim list is the both-tree list. Two outscore raids after Iris Stone's Glassport claim are skipped, flips go from 13 to 11, the tick-1200 hash moves, and the end garrison is 12 instead of 7. Captures stay 5 and the debts stay 4.73 and 276.92.

The transfer's other hashes: 1847 `8a8de11df27dd4cfb937f98d590229d731a2ee3bd1a05830395a2ea1b978f15c`, 8302 events, first tick 51. 4096 `48c9b4eea13ab5c39f373d42c83cc005dddda14707f0652a499f6fadd3bb872e`, 8042 events, first tick 51. Tick 51 is a claim on both of those seeds. Depositing enough soldiers to push the remnant toward the raid gate makes the next raid legal for a faction that still holds a port, and the port changes hands more often.

End ownership where it moved. Crown Harbor, Glassport, Cinder Key. Garrison in parentheses.

| Fix | 1847 | 2718 | 4096 |
| --- | --- | --- | --- |
| Claim cooldown 3 | World Government Orin Rill (12), Free Tide Mina Vale (12), Free Tide Finn Frost (10) | Free Tide Bram Tern (9), World Government Niko Wren (12), Free Tide Esme Dusk (11) | Same as both |
| Claim cooldown 6 | Free Tide Pax Ash (9), World Government Bram Quill (7), World Government Kessa Calder (8) | Free Tide Bram Tern (12), World Government Bram Quill (12), Free Tide Corin Hale (9) | Same as both |
| Raid blackout 6 | World Government Sable Morrow (13), Free Tide Mina Vale (12), Free Tide Bram Tern (12) | Free Tide Bram Tern (11), Free Tide Esme Dusk (12), Free Tide Corin Hale (9) | Glassport ends at garrison 12 under Iris Stone. The other two match both |
| Raid blackout 18, and previous holder | Free Tide Corin Hale (11), World Government Bram Quill (14), Free Tide Pax Ash (8) | World Government Vale Drake (12), Free Tide Mina Vale (9), World Government Niko Wren (6) | Glassport ends at garrison 12 under Iris Stone |
| Transfer up to 10 | Free Tide Zara Gale (12), World Government Ada Sorn (16), World Government Iris Stone (14) | World Government, no owner (38), Free Tide Bram Tern (12), World Government Vale Drake (14) | World Government, no owner (79), Free Tide Bram Tern (14), World Government Lio Crow (14) |

### Recommendation on the churn

Leave it. The five two-tick retakes are one port on one seed. They are the landless floor, already accepted, winning a fight the outscore rule, already accepted, now calls a victory. The other two seeds do not do this at Crown Harbor. 4096's busy port waits out the regrowth clock. 2718's only two-tick retake is the Cinder Key claim at tick 36, and that claim is inside the fixture on purpose.

A claim cooldown removes the gaps of 1 and 2 and leaves the change-of-hands count in the same range, 18 or 21 against 20 on Crown Harbor. It rewrites the 2718 fixture at tick 36. A raid blackout of 18 ticks, which is the same run as blocking only the previous holder, cuts Crown Harbor from 20 claims to 11 and raises seed 1847 from 1 capture to 6. It also puts 2718 back on the pre-floor hash. The transfer of up to 10 soldiers makes the churn worse on every seed and moves every fixture. None of the small waits brings the capture rate back.

## Where the captures went

An upset on the neither tree is the battle-morale note's census with the raid gate still at 15: 8, 5, and 8. M28 only raises that to 21, 16, and 13, which is the count recorded when M29 landed. Both rules on, the upset count is 0, 0, and 0. Those rows are flips.

| Tree | 1847 captures, debts, sum | 2718 | 4096 | Upsets | Flips |
| --- | --- | --- | --- | --- | --- |
| Neither | 11, 8, 2128.20 | 4, 2, 332.62 | 11, 6, 1043.79 | 8, 5, 8 | 0, 0, 0 |
| M28 only | 13, 9, 3428.33 | 9, 7, 2495.62 | 13, 7, 1519.13 | 21, 16, 13 | 0, 0, 0 |
| M29 only | 5, 3, 585.62 | 4, 1, 30.13 | 8, 1, 387.79 | 0, 0, 0 | 22, 9, 12 |
| Both | 1, 1, 103.21 | 3, 1, 217.74 | 5, 2, 281.65 | 0, 0, 0 | 37, 7, 13 |

M28 alone adds captures. The new raids are majors that end at morale 12 or under with a higher score, and without M29 that is a defeat. `attemptCapture` then rolls, and a severe risk captures on 0.55. M29 alone removes captures. The same class of fight is an attacker victory, and the roll is drawn and ignored. The both tree is the interaction: M28 creates the thin-garrison fights, and M29 turns them into wins, so the captures those defeats would have produced do not happen. Later fights are a different world, because the win changes who holds the port.

The toggle is this tree with the predicates switched. It is not the older tree the captivity note was measured on. Where the coins match, the ids have moved with the event sequence. On 4096 the neither-tree debts are 175.17, 242.17, 110.68, 207.88, 253.98, and 53.91, the note's six amounts, and each id is 30 above the note's id (`debt-046755` against `debt-046725`, and the same gap on the other five). On 2718 the two debt amounts match, 30.13 and 302.49, and there is a fourth capture, Zara Gale at tick 396, whose release does not create a debt. On 1847 the first six amounts match (58.18, 86.16, 453.85, 490.26, 246.05, 381.10) at ids 26 above the note, and the last two do not: this toggle has Niko Wren 244.89 and Iris Stone 167.71, and the note's Pax Ash 325.05 and Niko Wren 213.51 are absent. The capture counts are 11, 4, and 11 against the note's 10, 3, and 11. The table above is the one to use.

### The same battle, then the divergence

The first flip on each seed is the same fight as the first M28-only upset. Scores match. After that tick the worlds separate, because the both tree offers surrender and the M28-only tree captures.

Seed 1847, tick 498, Glassport, three landless majors. Corin Hale 351.601 / 35.609, morale 3, garrison left 10. Dax Pike 335.311 / 30.613, morale 3, garrison left 8. Mara Calder 203.414 / 31.632, morale 5.276, garrison left 6. On M28 only, Dax is captured, roll 0.2095 against 0.55, and Mara is captured, roll 0.2445 against 0.55. Corin's roll does not capture. On the both tree those two rolls are the ignored draws, 0.2095 and 0.2445, and there is no `character-captured`. Pax Ash's tick-594 Crown Harbor fight is the next M28-only capture, roll 0.3657 against 0.55, scores 485.298 / 48.248. The both tree's tick-594 fight is a different score, 487.975 / 63.62, and he is not captured. The win at 498 has already changed the world.

Seed 2718, tick 517, Cinder Key, Pax Ash 410.305 / 29.846, morale 8.085, garrison left 9. The M28-only roll does not capture him. The ignored roll on the both tree does not capture him either. His M28-only capture is a later fight, tick 539 at Crown Harbor, roll 0.3156 against 0.55, which the both tree does not reach.

Seed 4096, tick 475, Glassport, Pax Ash 511.279 / 26.305, morale 3, garrison left 6. M28 only captures him, roll 0.446 against 0.55. The both tree draws 0.446 and ignores it.

Ignored rolls that would have captured, `roll < captureChanceForRisk(risk)`, on the both tree: 18 of 37, 4 of 7, and 8 of 13. Those 18, 4, and 8 are the direct M29 deletions inside the both world, including fights the M28-only world never reaches. The two at tick 498 and the one at tick 475 are the deletions that are the same event.

M28's own additions, before outscore gets a turn, are the captures that exist on M28 only and on both, and not on neither. Seed 1847 shares only Sable Morrow at tick 34 (roll 0.0528 against 0.12, failed retreat at Cinder Key) across all four trees. Everything after the tick-79 divergence is a different campaign: neither's ten later captures do not recur, and M28 only writes twelve others, of which both keeps none. Seed 2718 diverges at tick 35, before neither's first capture. Mina Vale at tick 71, failed retreat at Crown Harbor, roll 0.2113 against 0.3, is on M28 only and on both, and is absent from neither and from M29 only. Seed 4096 shares Sable Morrow at 12, Dax Pike at 18, and Esme Dusk at 39 on all four trees. The next shared capture is Mina Vale at 161, on M28 only and on both, after the tick-93 divergence, so neither's Pax Ash at 310 does not happen.

### Both-tree captures and debts

| Seed | Tick | Captain | Port | Cause | Roll | Chance | Release | Debt |
| ---: | ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 1847 | 34 | Sable Morrow | Cinder Key | failed-retreat | 0.0528 | 0.12 | 118 | `debt-013680`, 103.21, creditor Free Tide |
| 2718 | 71 | Mina Vale | Crown Harbor | failed-retreat | 0.2113 | 0.3 | 155 | paid, no debt |
| 2718 | 411 | Esme Dusk | Crown Harbor | major-defeat | 0.1982 | 0.55 | 495 | `debt-064026`, 217.74, creditor World Government |
| 2718 | 621 | Zara Gale | Crown Harbor | failed-retreat | 0.228 | 0.3 | 705 | paid, no debt |
| 4096 | 12 | Sable Morrow | Cinder Key | failed-retreat | 0.0878 | 0.12 | 96 | paid, no debt |
| 4096 | 18 | Dax Pike | Glassport | major-defeat | 0.1077 | 0.12 | 102 | paid, no debt |
| 4096 | 39 | Esme Dusk | Crown Harbor | failed-retreat | 0.0067 | 0.3 | 123 | `debt-013887`, 4.73, creditor World Government |
| 4096 | 161 | Mina Vale | Crown Harbor | major-defeat | 0.4012 | 0.55 | 245 | paid, no debt |
| 4096 | 481 | Esme Dusk | Crown Harbor | major-defeat | 0.4161 | 0.55 | 565 | `debt-072047`, 276.92, creditor World Government |

Nine holds, four debts, five releases paid in full. No hold is still open at tick 1200. The sixteen debt ids in the pre-rule captivity note do not appear on this tree, and they do not appear on the neither tree either. The both-tree ids are the four above.

No `character-captured` and no `captivity-released` shares a tick with a `settlement-claimed` at the same port. A hold can still span a claim. Sable Morrow's 1847 hold at Cinder Key runs from 34 to 118 and spans Jun Marrow's claim at 70 and Pax Ash's at 80. The debt is created at 118 with creditor Free Tide, the faction at capture. On 4096, Sable's hold spans the Cinder Key claims at 51 and 94, and Dax Pike's hold spans the Glassport claims at 54 and 77. Neither of those releases creates a debt. The creditor on the row that does exist is still the faction stored at capture. The churn does not open, close, or move a debt.

### Are these captures enough

They are enough to keep the early examples, and they are not enough for the systems that were counted on the old list.

The political layer names an acting commander when the person who issues the faction's orders is captured. On these runs that person is Pax Ash for Free Tide and Mara Vane for World Government. Neither is captured. The regency the political note measured, Pax at tick 310 on seed 4096, is a neither-tree capture. It does not happen with both rules on. M30 has nothing to show in a 1200-tick run with no commands.

Loyalty drift's unpaid-release scar fires when a release leaves a debt. These runs have four such releases: 103.21, 217.74, 4.73, and 276.92. The scar would write four times. The note's longer list, including the releases that moved a regency score, does not.

Captive intelligence already remeasured this tree: 1, 3, and 5 holds, and the early ones are the ones above. The channel has prisoners. It does not have the later campaign of officers the older census was built from.

The capture rate is a problem for the command seat. It is a thin input for the scar and for the prisoner report. Turning M29 off would bring the captures back by calling a won fight a loss, which is the rule M29 was built to stop. The ignored roll is doing what it was accepted to do. The drought is the cost.

### Installments

Not worth building at these rates. The installment branch at `b80bf7d` parked the rule because the 1200-tick census on `6c4c902` did not match the sixteen debts the note was written against. This measurement is why. Four debts remain, one of them 4.73, and the sixteen ids do not recur. A day's-wage collector would be hash-neutral on the current fixture, because the first release is tick 96, 118, or 155. It would also be a rule that almost never pays, on a set of rows the old tests were not written for. Leave it parked until a capture change is accepted, or until Micah wants the collector anyway on the four debts that exist.

## Fixture movement

The both tree holds the committed fixture on all three seeds. So do M28 only on 1847 and 4096, and M29 only on 1847 and 4096. M28 only first differs at the first flip: event ticks 498, 517, and 475. M29 only and neither first differ where the floor first fires: event ticks 79, 35, and 93. On 2718 that difference is inside the fixture, which is the accepted M28 hash. Switching M28 off returns 2718 to `c386e76d…` and 8516 events. 1847 and 4096 stay on `cb04ba5d…` / 8301 and `20975bf4…` / 8031 either way.

`npm run golden:update` was not run. Nothing in this note asks for a new fixture.

## Tests to add

No new simulation test. The two predicates this diagnosis rests on are already pinned:

- `tests/agency.test.ts`, "a landless faction is offered a raid at garrison 8, and not below it or while it holds a port".
- `tests/combat.test.ts`, "a flipped outscore victory consumes the defeat path's capture roll and no roll is added to a win the old rule already had".

`tests/golden.test.ts` stays on the hashes at the top. If a later build does add a hold after a claim, the tests belong in `tests/port-churn.test.ts`: a claim leaves garrison and the claimant's troops unchanged; a landless captain already at the port is offered a raid at garrison 12 and is not offered one at garrison 7; a claim cooldown, if that is the hold, refuses the second claim inside the window and still lets the raid happen. That file should also expect the 2718 fixture to move if the hold reaches tick 35 or 36.

## Blind playtest beat

This is the beat a blind operator can run. It follows the playtest template. The candidate is the current tree, and the session checks the churn, not a new rule.

### Session

- **Candidate commit:** `2eef285bf10197277078fbb71d28322e77404d72`
- **Date:** the operator's date
- **Operator:** blind
- **Interface:** dashboard HTTP JSON, `GET /api/state?limit=200`
- **Seed:** 1847
- **Starting tick:** 0
- **Ending tick:** 729
- **Player character:** Mara Vane, `character-01`

### Hypothesis and ambition

**Milestone hypothesis.** On seed 1847, Crown Harbor passes from Zara Gale to Niko Wren to Finn Frost across state ticks 727, 728, and 729. At the tick Niko's name appears, the garrison is already 7 and the surrender block names Finn. Finn holds it the next tick at garrison 7 and stability 55.

**Player ambition.** Send no commands. Stay at Crown Harbor. Read the panel and the log.

**Success signal.** The three state reads below match, Mara's `party.locationId` is `crown-harbor` on each, and the named sequences are on the `limit=200` page. Battle and claim payloads stay withheld.

### Adaptive decision log

| Tick | Player-visible observation | Reasoning | Action | Outcome |
| ---: | --- | --- | --- | --- |
| 727 | Crown Harbor is Free Tide, owner `character-17`, garrison 12, stability 54.51. Sequence 97139 is a `battle-resolved` at event tick 726, actor `character-03`. | The port has not changed hands yet. The fight that will hand it over is already in the log. | None | Still Zara Gale |
| 728 | Crown Harbor is World Government, owner `character-03`, garrison 7, stability 47. Surrender is `{"offeredToId":"character-18","offeredTick":727,"previousFactionId":"world-government"}` and `surrenderOffered` is false. Sequences 97296 (`settlement-claimed`, event tick 727, actor `character-03`), 97353 (`battle-resolved`, actor `character-14`), and 97389 (`battle-resolved`, actor `character-18`). | Niko holds it, and the garrison is already the post-raid number. The offer names Finn. | None | Owner changed, garrison 7 |
| 729 | Crown Harbor is Free Tide, owner `character-18`, garrison 7, stability 55, surrender null. Sequence 97544 is a `settlement-claimed` at event tick 728, actor `character-18`. | Finn took the offer. The garrison did not move. | None | Free Tide, garrison 7 |

The page at state tick 727 runs from sequence 97119 to 97279. The page at 728 runs from 97280 to 97452. The page at 729 runs from 97453 to 97606. `limit=200` covers the sequences above. The default limit of 100 does not cover 97139 or 97296.

At state ticks 727 and 729 the port is not Mara's faction. Standing there, `factionId`, `ownerId`, `garrison`, and `stability` are the live values, `intelligence.exact` is false, `intelligence.present` is true, and `intelligence.source` is `direct-observation`. The surrender object is absent on that reading. At state tick 728 the port is hers, so the reading is exact, `intelligence.source` is `owned`, and the surrender object is on the settlement. `surrenderOffered` stays false because the port is her own faction.

### Outcome

From the dock, Crown Harbor is Free Tide with 12 soldiers, then World Government with 7 and an offer aimed at someone else, then Free Tide again with 7. No command was sent. The scores, the morale, and the garrison written on the claim are not in the JSON.

### Evidence review

- **World report:** state ticks 727, 728, and 729, seed 1847, Crown Harbor as in the log.
- **Metrics:** not the subject. The headless census is the rest of this note.
- **Map:** Mara remains at Crown Harbor.
- **Decision/agency traces:** withheld `decision-made` rows may sit beside the fights. Do not treat a missing payload as the absence of a raid. The battle rows above are present.
- **Conversation traces:** none required.
- **Recovery and determinism:** the golden test on this commit already reproduced the fixture, including the recovery replay of 572 events.

### Findings

### What worked

- The three panel states are distinct and readable without a command.

### Implementation defects

- The same defect the outscore session recorded: at state tick 728 a surrender block is visible beside `surrenderOffered` false, and the claim and battle payloads are withheld, so the panel garrison of 7 is the number the player can check.

### Design risks and opportunities

- A holder can appear and disappear inside two advances. This beat is the example.

### Follow-up experiments

- Seed 2718, ticks 35–36, Cinder Key, is the fixture retake. It is a different shape, an immediate battle, and it is not this beat.

### Recommendation

The session confirms the diagnosis if the three reads match. It does not promote a code change. The recommendation in this note is to leave the churn.

## Questions for Micah

1. **Crown Harbor on seed 1847 changes hands 20 times in 1200 quiet ticks, and five of those come back within two ticks. Should that stay?** Default: yes. It is the landless raid at 8 soldiers, which is already built, winning a fight the victory rule, also already built, now counts. The other seeds do not do this at Crown Harbor. A wait or a troop deposit was measured above and was worse, or it rewrote the 2718 fixture.
2. **When a captain takes a port, should some of their own soldiers stay behind as the garrison?** Default: no. Leaving up to 10, and never dropping the captain below 25, raised Crown Harbor from 20 changes of hands to 87, and it moved all three 72-tick hashes.
3. **Should the other side have to wait before they can take a port back?** Default: no. A wait of 3 ticks removes the two-tick retakes on seed 1847 and still leaves 18 changes of hands. A wait of one day leaves 21. Both rewrite seed 2718 inside the first 72 ticks, because Cinder Key is taken back at tick 36 and that retake is the fixture.
4. **Captures are now 1, 3, and 5 in these runs, and the person who gives a faction's orders is never captured. Is that too quiet?** Default: yes, it is too quiet for the command seat. Do not turn the victory rule off to get the captures back. A fight they outscored should not also imprison them. The acting commander, the unpaid-release scar, and the prisoner report will be rare until some other capture exists.
5. **Should the unpaid ransom still be collected as a day's wages?** Default: no, not yet. These runs create four debts. The sixteen debts the installment note was written against do not happen. Build the collector after captures are common enough that a 1200-tick run has more than a handful, or say so if you want it anyway on the four debts that exist.
