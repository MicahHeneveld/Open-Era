# Garrison recovery

**Status: Built (M20).** Fast population regrowth is the rule. In `produceSettlements` (`src/sim/engine.ts`), a settlement with no battle gains one garrison on its upkeep when provisions are met (`shortage === 0`), garrison is under `round(population / 70)`, and the world tick is a positive multiple of `max(6, round(200000 / population))`. Both rounds are to the nearest integer. The new garrison is the existing `settlement-upkeep` field. Shortage still only reduces garrison. Neutral ports count: Verdant Cay opens at 70 under a ceiling of 103 and ends a 400-tick run at 84. The raid gate and the slope-10 slide are unchanged. There is no new event and no RNG draw.

The interval is the world clock, not time since a claim. Tick 0 is the opening figure and is not a gain. A shortage, the ceiling, or a battle that skips the settlement drops that tick's soldier; it is not owed later. The rule reads that settlement's population, its own provision shortage, and its garrison. It does not read a treasury, a survey, or anyone's knowledge.

Tick-72 event counts after this change, Node v24.21.0, ICU 78.3: **8338 / 8411 / 8298** (seeds 1847 / 2718 / 4096). Those are the fast counts in the table below. Seeds 1847 and 4096 keep the slide's counts and still change hash, because Verdant Cay gains at ticks 28 and 56. Seed 2718 drops from 8417 to 8411 because Cinder Key, claimed at tick 32, regrows before tick 72. The sentence in [world simulation](world-simulation.md) now states this rule. The playtest is [garrison-regrowth-001](../playtests/garrison-regrowth-001.md).

The sections under this status are the proposal as it was measured. They are the record of why fast population regrowth was chosen, not a second rule.

Runs are `createPrototypeWorld` plus `runTick`, 400 ticks, seeds 1847 / 2718 / 4096, Node v22.14.0, ICU 76.1. Patches were reverted. The slide-only replay matched the [raid floor](raid-floor.md) slope-10 table, including tick-72 event counts 8338 / 8417 / 8298.

## The problem

M19 lets a battered port change hands, and `resolveSettlementClaim` copies the garrison. The raid gate in `buildCandidates` is still `settlement.garrison >= 15`. The port then sits at 6–13, autonomous raids stop, and the new owner is safe for the rest of the run. That is a frozen map.

## Where garrison is written

Nothing in the current code raises a garrison.

`produceSettlements` (`src/sim/engine.ts`) is the only peacetime settlement change. Met provision demand (`shortage === 0`; demand is `population / 3600`) adds `0.03` stability. A shortfall subtracts `shortage * 0.35` stability and `min(garrison, floor(shortage * 0.18))` garrison. The upkeep event carries `settlement.garrison - garrisonLoss`, and `applyEvent` in `src/sim/state.ts` writes it on `settlement-upkeep` and `settlement-shortage`. Loss is zero or positive. A battle tick skips the settlement.

`resolveImmediateBattle` and the battle-phase path set `defenderGarrison` to `settlement.garrison - defenderLosses`. `applyEvent` writes that on `battle-phase-resolved` and `battle-resolved`. `resolveSettlementClaim` copies the current garrison onto `settlement-claimed` and does not add to it. That arm of `applyEvent` writes owner, faction, and stability, and leaves garrison untouched.

`resolveDecision`'s `recruit` case spends money and arms and raises `character.troops.count`. The `recruited` arm writes that count and the stocks. Treasury moves only through `tradeTax`, on `market-trade` and `worked`. Neither event carries a garrison, and nothing moves soldiers between settlements.

## Measured slide

Slope 10 (`min(80, 30 + 10 * max(0, 15 - garrison))` in both resolvers) and no recovery: two claims a seed, then a stop. No later upkeep reaches garrison 15. No second raid. No character holds two ports.

| Seed | Claims | Tick 400 | Power (Free Tide / World Government) |
| ---: | --- | --- | --- |
| 1847 | Cinder Key 70, Niko Wren (`character-03`, World Government), 13. Glassport 87, Pax Ash (`character-14`, Free Tide), 11 | 13 and 11. Crown Harbor 91, unowned | 1598.27 / 2855.09 |
| 2718 | Cinder Key 32, Orin Rill (`character-09`), 13. Glassport 41, Dax Pike (`character-20`), 10 | 13 and 10. Crown Harbor 92 | 1744.72 / 2799.19 |
| 4096 | Glassport 46, Pax Ash, 6. Cinder Key 107, Rook Tern (`character-11`), 9 | 9 and 6. Crown Harbor 142 | 1967.31 / 2908.14 |

Verdant Cay stays 70. Opening power is 1139.74 / 2335.44, 1220.62 / 2475.55, and 1215.58 / 2392.28. Opening treasuries are 2800 and 18000. World Government stays ahead.

## Candidates (proposal)

All three keep the raid gate and the slope-10 slide. Regrowth runs in `produceSettlements` on a tick with no battle, only when `shortage === 0` and garrison is under `round(population / 70)`: ceilings 257, 150, 103, and 91 from populations 18000 / 10500 / 7200 / 6400. Openings are 260, 155, 70, and 115, so only Verdant Cay starts under the ceiling. The rule reads that settlement's population and its own provision shortage. It does not read `knowledge`, a survey, or another faction's treasury.

A holder who reinforces is standing in their own port, so the candidate uses their own `troops.count` and the co-located garrison. Standing there, `believedGarrison` (`src/sim/agency.ts`) is the live figure at confidence 1.

### A. Population regrowth

One soldier every `max(6, round(divisor / population))` ticks. Fast uses 200000, slow uses 500000. Cinder Key's fast interval is 31. Glassport's is 19. Verdant Cay's is 28 fast and 69 slow.

Fast, five claims on every seed. Raidable means the first later upkeep with garrison at least 15. On seed 1847, Cinder Key's claim at tick 70 leaves 13; the interval hits at 93 and 124, and 124 is the measured crossing.

| Seed | First claim → raidable | Claims | Tick 400 | Tick-72 events |
| ---: | --- | --- | ---: | ---: |
| 1847 | Cinder Key 70→124 (raid 138). Glassport 98→228 (raid 228; Zara Gale, `character-17`, Free Tide, from 8) | 5. Cinder 70, 139, 375. Glass 98, 231 | Cinder 6, Niko Wren. Glass 5, Bram Quill (`character-02`, World Government). Crown 122. Verdant 84 | 8338 |
| 2718 | Cinder Key 32→155 (raid 155). Glassport 55→171 (raid 171) | 5. Cinder 32, 156. Glass 55, 172, 362 | Cinder 12, Esme Dusk (`character-19`, Free Tide). Glass 9, Finn Frost (`character-18`). Crown 126. Verdant 84 | 8411 |
| 4096 | Glassport 46→209 (raid 209). Cinder Key 107→279 (raid 279) | 5. Glass 46, 210, 345. Cinder 107, 280 | Cinder 10, Mina Vale (`character-15`). Glass 9, Pax Ash. Crown 121. Verdant 84 | 8298 |

A later blow rearms when the ticks remain. Cinder Key on 1847, claimed at 139 from garrison 7, is raidable at 372. The same port on 2718, claimed at 156 from 5, reaches upkeep garrison 12 and is still under 15 at tick 400. End holdings are that latest blow, 5–12. None end at 0. No character holds two ports. Crown Harbor stays unowned World Government.

End power, Free Tide then World Government: 1244.54 / 2960.5, 1470.13 / 2956.17, 1749.98 / 2982.44, both above their openings, World Government ahead. On 1847 both taken ports end World Government; on 2718 and 4096 both end Free Tide.

Slow, divisor 500000. Seed 1847 rearms both (Cinder Key 70→156, Glassport 87→240) and loses Crown Harbor at tick 397 to Finn Frost, garrison 12. Seed 2718 rearms both (32→156, 41→240); Crown Harbor stays at 110. Seed 4096 does not: Glassport's best upkeep is 14, Cinder Key's is 13, and the claims stay the original two. Verdant Cay ends at 75. End power 1556.92 / 2772.11, 1506.75 / 3101.19, 1691.12 / 3014.31. Tick-72 counts match the slide: 8338 / 8417 / 8298.

### B. Treasury funding

Same ceiling, and only when fed. Every 12 ticks (fast) or 36 (slow), if the holder's own `faction.treasury` is at least 40, subtract 40 and add one soldier. Verdant Cay has no faction, so it does not buy.

Fast: 7, 8, and 7 claims. First rearm is 1847 Cinder Key 70→84 and Glassport 112→204; 2718 Cinder Key 32→84 and Glassport 55→132; 4096 Glassport 46→144 and Cinder Key 107→156. Crown Harbor ends at 53, 65, and 143, still unowned. End power 1326.2 / 2774.15, 1544.2 / 2805.23, 1422.76 / 3155.36. End treasuries 5080.3 / 27516.66, 5318.63 / 25254.67, 5100.44 / 26978.71. Tick-72 counts 8338 / 8411 / 8298.

Slow: 4, 5, and 4 claims. Cinder Key on 1847 rearms at 108; Glassport on 4096 at 360. Crown Harbor on 1847 ends at garrison 14, stability 38.631, unowned and under the gate. Mina Vale claims it on 2718 at tick 387, garrison 12. Every treasury in the six runs finishes above its opening. The lowest World Government figure is 24188.67. Tick-72 counts 8338 / 8417 / 8298. No port ends at 0, and no character holds two. A price of 40 did not bind.

### C. Holder reinforcement

A same-faction character in a port under garrison 15, with at least 40 troops, is offered `reinforce` at score `160 + (15 - garrison) * 6`. They move `min(4 or 10, troops.count - 25)` of their own soldiers across, and the party keeps 25.

Shift 4: 58, 94, and 93 claims. The median gap from a claim to the next raidable upkeep, on ports that keep flipping, is 1–4 ticks. Free Tide ends at 756.86, 1069.09, and 975.42, below its opening. Crown Harbor stays unclaimed. Tick-400 garrisons are 14 and 9, 18 and 18, 15 and 6. Tick-72 counts 8336 / 8440 / 8348.

Shift 10: 95, 116, and 130 claims. Crown Harbor falls on 1847 from tick 375 and on 2718 at 395, 397, and 398. End power is below both openings: Free Tide 941.7 / 1154.45 / 891.72, World Government 2156.7 / 2086.96 / 2290.86. Tick-72 counts 8336 / 8380 / 8354.

No tick-400 owner holds two ports, and no port ends at 0: the shift refills through 15 and the next raid blows it down. The claim counts are the raid-floor option A's revolving door. That option reached garrison 0 by dropping the gate. This run keeps it.

## Recommendation (proposal)

Take fast population regrowth. Leave the raid gate, the slope-10 slide, recruiting, and the treasury alone.

Each port's first claim is raidable again in 54 to 172 ticks, a second claim follows, Crown Harbor stays World Government, and both factions stay above their opening power. The slow divisor misses 4096 and loses Crown Harbor on 1847. Treasury funding rearms sooner, leaves Crown Harbor at 53 and 65, loses it on 2718 at the slow rate, and never lets 40 a soldier bind. Reinforcement is the 58–130 claim loop.

Regrowth is a world step. A fed settlement under its population ceiling gains one soldier on its interval. Shortage still only reduces garrison. Put the new garrison on the existing upkeep event, which `applyEvent` already writes. No actor reads a rival to do it.

## Tests and the golden fixture

M19 is the slide. Recovery is the milestone after it. M18 was hash-neutral and must not absorb either. If M19 regenerates the fixture first, recovery regenerates it again, with `npm run golden:update` on Node 24.21.0, ICU 78.3.

- `tests/economy.test.ts`, beside the market tests. A fed settlement under the ceiling gains one garrison on its interval tick and not the tick before. A shortage gains none. A settlement at `round(population / 70)` gains none.
- `tests/agency.test.ts`, beside "an autonomous character claims a hostile settlement that offers surrender". After a claim at garrison 13, a later upkeep reaches 15 and a hostile autonomous raid is offered. Claims do not arrive every tick.
- `tests/combat.test.ts`. The M19 case stays: an immediate victory at garrison 14 and stability 39.55 offers surrender. Recovery leaves that predicate alone.
- `tests/dashboard.test.ts` and `tests/survey.test.ts`. The foreign-surrender and anti-leak assertions stay. Regrowth publishes no remote true garrison and reads no survey.
- `tests/golden.test.ts`. The pinned hashes fail until the fixture is regenerated.
- `tests/simulation.test.ts`. The 400-tick ambition test stays green.

`settlement-upkeep` garrison payloads change inside the 72-tick window on every seed: Verdant Cay opens at 70 under a ceiling of 103, and the fast interval is 28. A second raid inside the window also moves `battle-resolved`, `settlement-claimed`, `decision-made`, travel, and `knowledge-updated`. Fast tick-72 counts are 8338, 8411, and 8298, against the slide's 8338, 8417, and 8298 and the fixture's 8338, 8428, and 8361. Seed 2718 moves against the slide because Cinder Key, claimed at tick 32, regrows before tick 72. Counts on 1847 and 4096 match the slide; the payloads still change. Prototypes were not hashed.

## Playtest

Follow `docs/playtests/TEMPLATE.md`. Dashboard HTTP JSON only, as in [informed-commitment-002](../playtests/informed-commitment-002.md). Seed 1847, Mara Vane (`character-01`), ticks 0–160, with the fast rule and the slide in.

**Hypothesis.** Cinder Key changes hands a second time because its garrison climbed through 15, and offshore she still cannot read that live garrison.

**Ambition.** Leave the neighbours to fight. Survey nothing. At tick 150, read both ports from Crown Harbor.

**Success.** The log has two `settlement-claimed` events for `cinder-key` (measured ticks 70 and 139) and an upkeep between them at garrison 15 or more. Glassport has one claim; its rearm is tick 228. From Crown Harbor the panel shows an estimate or a null ground, and Crown Harbor itself is still unowned World Government.

`PROMOTE` if that second Cinder Key claim is in the log and the remote garrison is still withheld. `REVISE` if claims arrive every few ticks, or if she can read the live garrison from Crown Harbor. `ABANDON` if tick 160 still has a single claim and the garrison is the blow from tick 70.
