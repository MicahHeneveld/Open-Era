# The raid floor

**Status: Built (M19).** The slope-10 slide in the recommendation is the rule. `surrenderStabilityLimit` in `src/sim/state.ts` is `min(80, 30 + 10 × max(0, 15 − garrison))`. Both `resolveImmediateBattle` and `completeMajorBattle` use it, and only after an attacker victory, and only while garrison is still at most 15. The raid gate (`garrison >= 15` in `buildCandidates`), the player raid check, and peacetime upkeep are unchanged. The sentence in [world simulation](world-simulation.md) now states this rule.

Tick-72 event counts after this change, Node v24.21.0, ICU 78.3, before any later purse change: **8338 / 8417 / 8298** (seeds 1847 / 2718 / 4096). Those are the slope-10 counts in the table below. Seed 1847 stays at the fixture's 8338 events because the new claim replaces other events inside the window; the hash still moves. The playtest is [raid-floor-001](../playtests/raid-floor-001.md).

The sections under this status are the proposal as it was measured. They are the record of why slope 10 was chosen, not a second rule.

Runs are `createPrototypeWorld` plus `runTick`, 400 ticks, no player commands, seeds 1847 / 2718 / 4096, Node v22.14.0, ICU 76.1. The 72-tick hashes matched `tests/fixtures/golden-hashes.json` (`02f1aa2a…`, `76445c58…`, `12e04439…`; 8338, 8428, 8361 events). Patches were reverted.

## The problem

A faction port can be battered until autonomous raids stop and surrender has not been offered. Glassport is the case the lead named. The same shape hits other faction ports. Verdant Cay never enters it, because both checks require a faction holder. The lead's thresholds match the code. The floors match the minima, and they are not the tick-400 resting point.

## The checks

`buildCandidates` (`src/sim/engine.ts`) adds a raid only for someone standing in a hostile held port, with a faction, `troops.count >= 25`, `lastBattleTick` at least 18 ticks ago, no battle already open, and `settlement.garrison >= 15`. The score uses `believedGarrison` (`src/sim/agency.ts`) times fortification. Standing there, that function returns the live garrison at confidence 1, so the gate's direct read is the co-located figure. Under 15 the candidate is not built. `validateCharacterAction` (`src/sim/commands.ts`) has no garrison test, so a player can still raid at 14.

Surrender, in `resolveImmediateBattle` and `completeMajorBattle`, runs only after an attacker victory. It requires `garrison <= SURRENDER_GARRISON_THRESHOLD` (15), `stability <= SURRENDER_STABILITY_THRESHOLD` (30), both in `src/sim/state.ts`, and a non-null `factionId`. The offer names the victor. `settlementClaimAvailableTo` is that name, and the claim candidate fires only for them, standing there. `resolveSettlementClaim` sets owner and faction, clears the offer, and raises stability to `CLAIM_STABILITY_FLOOR` (55) when lower. Garrison is copied through. The two garrison tests meet at 15. Under 15 no raid is offered, so surrender never runs again.

## Recovery and decay

`produceSettlements` is the only peacetime change. Met provision demand (`shortage === 0`; demand is `population / 3600`) adds `0.03` stability, clamped to 0–100. A shortfall subtracts `shortage * 0.35` stability and `min(garrison, floor(shortage * 0.18))` garrison. A battle tick is skipped. An immediate victory subtracts 12 stability, a defeat 3, a phase 4 or 1.

There is no garrison recovery. Recruiting fills the attacker's party. Glassport's garrison never rose, and it had no `settlement-shortage`. After the last battle, stability climbs by `0.03` a tick and lands on the tick-400 value exactly: `39.55 + 0.03 * 310 = 48.85`, `38.38 + 0.03 * 349 = 48.85`, `30.2 + 0.03 * 354 = 40.82`. The lead's "about 39 / 38 / 30" is that low point. The port then drifts away from surrender, and 30.2 fails `<= 30`.

## Measured baseline

Glassport opens at garrison 155, stability 86, World Government, `ownerId` null. No seed emits `settlement-claimed`.

| Seed | Last victory | After | Tick 400 | Raids |
| ---: | --- | --- | --- | ---: |
| 1847 | tick 89, Dax Pike (`character-20`), 13 losses, from 27 | 14 / 39.55 | 14 / 48.85 | 8 |
| 2718 | tick 50, Corin Hale (`character-16`), 13 losses, from 23 | 10 / 38.38 | 10 / 48.85 | 8 |
| 4096 | tick 45, Pax Ash (`character-14`), 10 losses, from 16 | 6 / 30.2 | 6 / 40.82 | 7 |

Each is one phase, an attacker victory, legal at the start and under 15 at the end, with stability still over 30. At tick 72 Glassport is 54 / 66.01 on 1847, and already floored on 2718 (10 / 39.01) and 4096 (6 / 30.98).

Cinder Key minima: 13 / 35.95 tick 70, 13 / 32.78 tick 32, 9 / 30.77 tick 65. At tick 400 it is still Free Tide (13 / 45.85, 13 / 43.82, 9 / 40.82). Crown Harbor on 2718 reaches garrison 6 at tick 387, stability 39.466, still World Government. On 1847 and 4096 its minima are 114 and 207. Verdant Cay stays 70 / 90, never raided. No ownership changes. End faction power, Free Tide then World Government: 1418.97 / 2930.12 (from 1139.74 / 2335.44), 1800.21 / 3070.58, 2098.43 / 3124.77.

`progress.md` records these Glassport minima from the M17 confirmation, and this shape on `8285f45`, which was not replayed. M18 did not change the checks.

## Candidates (proposal)

All three ran 400 ticks on the three seeds. A raid is offered only where the character stands. `believedGarrison` is then the live garrison. Fortification and population are the present-tense inputs `combatForecast` uses when `locallyObserved`. `partyPower` is the attacker's own. No prototype reads a survey, a rumor, or a remote garrison. M18 `ground` stays a dated record, absent when never taken, and the faction tier still hides another character's knowledge. Surrender is the battle just fought. Unknowns stay null.

### A. Power ratio instead of the garrison floor

`garrison >= 15` was replaced with `partyPower / observedDefense >= 1`. `observedDefense` is the co-located garrison times fortification plus `population * 0.002`, the same terms as `settlementDefensePower`. The other gates stayed.

Glassport is taken, then does not settle. Claim leaves the garrison, so defense falls toward `population * 0.002` (21 at Glassport, 12.8 at Cinder Key) and anyone with 25 troops is offered surrender again. Claims: 1847 had 37 (20 Glassport, 17 Cinder Key), first tick 38; 2718 had 36, first tick 41; 4096 had 40, first tick 46. Both ports end at garrison 0. Crown Harbor was raided 1, 1, and 0 times, and stability hit 100. Verdant Cay did not move. The map thrashes.

### B. Sliding surrender

The garrison test stays `<= 15`. Stability becomes `min(cap, 30 + slope * max(0, 15 - garrison))`, still only after an attacker victory, in both resolvers. The raid gate stays.

Slope 2, cap 60 (limits 32 / 40 / 48 at garrison 14 / 10 / 6). Seed 1847 never qualifies (39.55 against 32; Cinder Key 35.95 against 34). Its tick-400 snapshot, raid counts, and tick-72 event count matched the baseline, with no claims. Seeds 2718 and 4096 changed hands twice and stopped: Glassport to Free Tide at ticks 41 and 46 (garrison 10 and 6); Cinder Key to World Government at ticks 32 and 107 (garrison 13 and 9). No second claim. Crown Harbor stayed. Taken ports ended at stability 63–66.

Slope 10, cap 80. At garrison 14 the limit is 40, which contains the baseline blow of 39.55. At garrison 10 and below the cap is 80. This is the setting that resolves every seed.

| Seed | First claims | Tick 400 (Cinder / Glassport) | Tick-72 events |
| ---: | --- | --- | ---: |
| 1847 | Cinder Key 69–70, Niko Wren (`character-03`, World Government), 13 / 35.95. Glassport 86–87, Pax Ash, 11 / 42.46 | 13 / 64.87 and 11 / 64.36. Crown Harbor garrison 91, still World Government | 8338 (fixture count; a claim is now inside the window) |
| 2718 | Cinder Key 31–32, Orin Rill (`character-09`, World Government), 13 / 32.78. Glassport 40–41, Dax Pike (`character-20`, Free Tide), 10 / 32.08 | 13 / 66.01 and 10 / 65.74. Crown Harbor 92, unclaimed | 8417 vs 8428 |
| 4096 | Glassport 45–46, Pax Ash, 6 / 30.2. Cinder Key 106–107, Rook Tern (`character-11`, World Government), 9 / 32.03 | 9 / 63.76 and 6 / 65.59. Crown Harbor 142, unclaimed | 8298 vs 8361 |

On 1847 Glassport falls one battle early (11 / 42.46) because the tick-70 claim changes the campaign. One claim per port, nobody holds two, Verdant Cay stays independent. End power, Free Tide then World Government: 1598.27 / 2855.09, 1744.72 / 2799.19, 1967.31 / 2908.14. World Government stays ahead. The raid gate is what holds it: garrison stays at the blow (6–13), so raids stop. Restoring garrison on claim was not run. Dropping the gate brings back A's revolving door.

### C. Siege pressure

One hostile character with a faction and at least 25 troops, standing in the port, withholds the `+0.03` and subtracts `0.12`. Once per port, not per visitor. The troop count is co-located exact. `locationId` is already public at every tier, including distant. Battles skip it, because `produceSettlements` already skips that settlement.

Pressure alone: Glassport is claimed on 1847 at tick 95 (Mina Vale, `character-15`, Free Tide, 9 / 23.95) and on 4096 at tick 46 (Pax Ash, 6 / 26.45). Seed 2718's blow is 10 / 32.08 at tick 51. Siege then takes stability to 0; garrison stays 10, owner null, faction unchanged. Cinder Key on that seed ends 13 / 0. Crown Harbor on 4096 falls at tick 226 (Pax Ash, garrison 12, stability 27.633) and is at stability 0 by tick 400. Hostiles who remain after a claim keep eroding the reset to 55, and the raid gate blocks another victory.

An offer to the strongest present hostile party (own `partyPower`, ties on id, co-located troops) does resolve Glassport on 2718, at tick 43. It also reopens taken ports. Second claims: 1847 Cinder Key 287 and Glassport 311; 2718 Cinder Key 247 and Glassport 257; 4096 Glassport 266 and Crown Harbor 319. On 4096 the capital changes hands twice.

## Recommendation (built)

Take the slope-10 slide in B. Leave the raid gate, the player raid check, and peacetime upkeep alone. M19 did that.

It is the measured rule that gives Glassport one owner on all three seeds and keeps that owner through tick 400. A keeps handing the port on. C misses 2718, or fights the port again once an offer exists outside battle. The slide reads the garrison and stability that battle just wrote, where the victor is standing. It does not read `knowledge`, a survey's `ground`, or a motive. The claim stays the existing candidate, addressed to `offeredToId`. Slope 2 leaves seed 1847 on the baseline stall.

## Tests and the golden fixture

The implementing milestone regenerates the fixture. M18 was hash-neutral and must not absorb this.

- `tests/combat.test.ts`, beside the major-battle setup. An immediate victory at garrison 14 and stability 39.55 offers surrender. Stability 50 does not. Garrison 16 and stability 20 does not. `completeMajorBattle` uses the same limit.
- `tests/agency.test.ts`, beside "an autonomous character claims a hostile settlement that offers surrender". The next tick claims the port, and later ticks emit no second `settlement-claimed` and no raid `decision-made` while garrison stays under 15.
- `tests/dashboard.test.ts`. Extend the foreign-surrender assertion: an offer to someone else stays null remotely. `surrenderOffered` already limits it to the offeree on the ground.
- `tests/survey.test.ts`. The anti-leak test stays. The predicate must not read a survey.
- `tests/golden.test.ts`. "pinned seeds reproduce their committed state hash and event count" fails until `npm run golden:update` on Node 24.21.0, ICU 78.3.
- `tests/simulation.test.ts`. "seeds that used to exhaust ambitions still have a goal after 400 ticks" stays green. Leave ownership out of it.

The first qualifying victory puts `surrender` on `battle-resolved`, then `settlement-claimed`. Later `decision-made`, travel, and `knowledge-updated` events diverge. Earlier raids do not. Ticks and tick-72 counts are the slope-10 table. Glassport's 1847 claim and Cinder Key's 4096 claim fall outside the 72-tick fixture. Prototypes were not hashed. The baseline was.

## Playtest

Follow `docs/playtests/TEMPLATE.md`. Dashboard HTTP JSON only, as in [informed-commitment-002](../playtests/informed-commitment-002.md). Seed 1847, Mara Vane (`character-01`), ticks 0–100.

**Hypothesis.** Glassport changes hands once, without the commander fighting, and offshore she still cannot read its live garrison or its surrender.

**Ambition.** Leave Glassport to the neighbours. Survey nothing there. At tick 90, read it from Crown Harbor, then sail and read the beach.

**Success.** The remote panel shows an estimate or a null ground. On the beach the holder is no longer unowned World Government. The log has one `settlement-claimed` for `glassport`, the `battle-resolved` that carried `surrender`, and no later raid. Remote `surrender` is null.

Seed 2718, same ambition, stopped after tick 50, is the confirmation. `PROMOTE` if both ports keep one owner. `REVISE` if a second claim appears or the offer is readable offshore. `ABANDON` if Glassport is still unowned World Government at the end of the 1847 window.
