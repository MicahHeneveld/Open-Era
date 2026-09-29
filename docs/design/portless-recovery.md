# Portless recovery

**Status: Open.** Proposal for the owner to accept, change, or reject. Current code is `main` at `8c93912`, the M24 ration floor. The runs below are that tree. The purse waiver and the raid exception were patched in locally to measure them, then removed. This note is not decided until it moves into [world simulation](world-simulation.md). It builds on [landless faction](landless-faction.md): a faction with no ports remains, and the next port comes back by the existing claim.

Runs are `createPrototypeWorld` plus `runTick`, no player commands, seeds 1847 / 2718 / 4096, 1200 ticks, Node v24.21.0, ICU 78.3. Tick numbers on events are the `tick` field. A zero stretch runs from the claim that removes the last port until the claim that returns one. `npm test` on this tree passes, 173 tests. The 72-tick hashes match `tests/fixtures/golden-hashes.json` (`d7eb02eb…`, `d0b4b449…`, `d5d9da8b…`; 8275, 8489, 8003 events). M24 did not move that fixture. It also did not move the 400-tick fortunes recorded for M22: World Government then Free Tide power 3276.92 / 1668.52, 2988.03 / 1853.79, 3053.99 / 1349.41.

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

## Recommendation

Take E. One condition in `buildCandidates`. The characters who retake are already on the port, with troops past 25, and on 1847 one of them is holding 436. The stretch is the time `garrisonRegrowth` takes to put back the soldiers the loss blew away. A, the landless purse waiver, leaves that clock running: 155 and 192 ticks on 1847 and 4096, and a Free Tide that is still portless at tick 1200 on 2718. B, C, and D do not open a raid at garrison 7.

The state change is the existing battle and the existing claim. `battle-resolved` writes the lower garrison, the stability drop, the attacker's troops and money, and `surrender` when the slide passes. At garrison 7 the limit is 80, and the claim floor of 55 is under it, so an attacker victory offers surrender. `settlement-claimed` writes `ownerId`, `factionId`, and `max(55, stability)`, and copies the garrison. The faction then has a port, so the exception turns off. A second raid under 15 requires losing the last port again.

The same-tick stack is the existing rule, visible once the gate is open below 15. Each immediate battle finishes before the next character is considered, so several landless captains on one beach all swing. Seed 2718 leaves Cinder Key at garrison 0. The claim copies 0. `garrisonRegrowth` can raise it again once the port is fed. No soldier is added at the claim.

## Hash impact

The predicate adds no RNG call. The battle it unlocks uses the battle's existing draws, so `rngState` moves from the first such battle.

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

The fixture already contains M22, M23, and M24. E changes seed 2718 inside 72 ticks, so the implementing milestone regenerates the fixture. Seeds 1847 and 4096 keep their hashes. `npm run golden:update` on Node v24.21.0, ICU 78.3, when the rule is accepted. Until then the pinned test fails on 2718.

- `tests/agency.test.ts`, beside "a claimed port is not claimed or raided again while its garrison stays under 15". A landless character on a hostile port at garrison 8, with 25 troops and a clear cooldown, is offered `raid`. The same character, once their faction holds some other port, is not offered it. After the victory the next tick claims, and a later tick emits no raid `decision-made` while that faction holds a port and the garrison stays under 15.
- `tests/combat.test.ts`. The M19 case stays: an immediate victory at garrison 14 and stability 39.55 offers surrender. The new predicate does not read `surrenderStabilityLimit`. A victory at garrison 8 and stability 55 still offers surrender by the existing slide.
- `tests/golden.test.ts`. "pinned seeds reproduce their committed state hash and event count" stays on 1847 and 4096 and moves 2718 to the hash and 8502 events above.
- `tests/simulation.test.ts`. "seeds that used to exhaust ambitions still have a goal after 400 ticks" does not pin ownership. Leave it that way.

## Playtest

Follow `docs/playtests/TEMPLATE.md`. Dashboard HTTP JSON only, as in [informed-commitment-002](../playtests/informed-commitment-002.md). Seed 1847, Mara Vane (`character-01`), ticks 0–100. No survey, no raid, no other command. She is already at Crown Harbor.

**Hypothesis.** Glassport leaves Free Tide and comes back on the next tick, without Mara fighting, and it is still theirs at tick 100.

**Ambition.** Stay at Crown Harbor. At tick 80, read the log and Glassport.

**Success.** The log has `settlement-claimed` for `glassport` at tick 77, Iris Stone, garrison 7, faction `world-government`, and at tick 78, Mara Calder, garrison 1, faction `free-tide`. At tick 80 Glassport is Free Tide. At tick 100 it has not changed hands again.

`PROMOTE` if those two claims are the Glassport claims in the window and tick 100 still shows Free Tide holding it. `REVISE` if the returned garrison is 0, or if Glassport changes hands again before tick 100. `ABANDON` if tick 100 has Free Tide with no port.

Seed 2718, same ambition, stopped after tick 40, is the confirmation and the pile-on. Cinder Key is lost at tick 35, Vale Drake, garrison 14, and claimed back at tick 36, Mara Calder. The garrison on that claim is 0. `REVISE` on this seed if a garrison of 0 is not acceptable. `ABANDON` if tick 40 still has no Free Tide port.

## Questions for Micah

1. **Several of your captains are already on a beach you do not own, and you have no port left. The town has fewer than 15 soldiers. Do they all attack that same morning?** Default: yes. The world already lets every captain attack when the town has 15 or more. On seed 2718 four of them attack at once and the town is left with no soldiers. The claim keeps that number.
2. **The town comes back with however many soldiers the fight left, including zero. Should the claim add any?** Default: no. A fed town already gains one soldier on its usual interval. Adding a garrison at the claim would be a separate rule.

## Appendix

Node v24.21.0, ICU 78.3. From a checkout of `8c93912`, with dependencies installed:

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

The pre-M22 run is the same tree with that −1000 assignment removed and nothing else. The waiver is that assignment skipped when the character's faction holds no settlement. The recommended predicate is `garrison >= 15 ||` the attacker has a faction with no settlement. All three were taken back out before this note was committed.
