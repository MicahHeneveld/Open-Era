# Landless faction

**Status: Open.** Proposal for the owner to accept, change, or reject. Current code is `main` at `0768d06`, which includes the slope-10 surrender slide (M19). Fast population regrowth, the [garrison recovery](garrison-recovery.md) proposal (M20), was applied on top for the long runs and then reverted. This note is not decided until it moves into [world simulation](world-simulation.md).

Runs are `createPrototypeWorld` plus `runTick`, no player commands, seeds 1847 / 2718 / 4096, Node v24.21.0, ICU 78.3. The 72-tick hashes matched `tests/fixtures/golden-hashes.json` before any prototype (`0720557d…`, `bd02bf90…`, `b940a89a…`; 8338, 8417, 8298 events). Patches were reverted.

## The problem

M19 lets a battered port change hands. A faction that starts with one port can then hold none. Nothing in the code deletes a faction, reassigns its members, or names that state.

## Opening

The roster is the same on all three seeds. World Government holds Crown Harbor (garrison 260, stability 91, `ownerId` null) and Glassport (155 / 86), treasury 18000, members `character-01`–`character-13`. Free Tide holds Cinder Key (115 / 73), treasury 2800, members `character-14`–`character-22`. `character-23`–`character-30` are `factionId` null. Verdant Cay is unowned, garrison 70, stability 78. Pax Ash (`character-14`) starts at Crown Harbor. Beaches hold 9, 7, 7, and 7.

Opening power, World Government then Free Tide: 2335.44 / 1139.74, 2475.55 / 1220.62, 2392.28 / 1215.58. There is no capital field. `orderFor` (`src/sim/scenario.ts`) points World Government `protect` at `crown-harbor`, Free Tide `protect` at `cinder-key`, and a Free Tide raider's `pressure` at the faction id `world-government`.

## Measured M19

Today's slide, no regrowth, 400 ticks. Two claims a seed, then a stop. End power, Free Tide then World Government: 1598.27 / 2855.09, 1744.72 / 2799.19, 1967.31 / 2908.14. Same end state as the [raid floor](raid-floor.md) slope-10 table.

| Seed | Claims | Zero ports |
| ---: | --- | --- |
| 1847 | Cinder Key 70, Niko Wren (`character-03`), garrison 13. Glassport 87, Pax Ash, garrison 11 | Free Tide after tick 70, until tick 87 |
| 2718 | Cinder Key 32, Orin Rill (`character-09`), garrison 13. Glassport 41, Dax Pike (`character-20`), garrison 10 | Free Tide after tick 32, until tick 41 |
| 4096 | Glassport 46, Pax Ash, garrison 6. Cinder Key 107, Rook Tern (`character-11`), garrison 9 | None in 400 ticks |

At tick 72 only seed 1847 is still landless. On 2718 the return at tick 41 is inside the window. On 4096 Free Tide still holds Cinder Key. Verdant Cay stays independent. Crown Harbor is still World Government at tick 400. No run threw. In the 1847 gap Free Tide recruits (Corin Hale at 71; Dax Pike at 76, 78, 82) and raids (Zara Gale at 82, Pax Ash at 86), and no completion calls a port secure.

## Measured M19 + M20

Fast regrowth in `produceSettlements`: +1 garrison when `shortage === 0`, garrison is under `round(population / 70)`, and `world.tick > 0` and `world.tick % max(6, round(200000 / population)) === 0`. Verdant Cay's tick-28 upkeep is garrison 71, shortage 0, stability 78.87, on every seed, from 70. At tick 400 it is 84.

Tick-72 counts: 8338, 8411, 8298. Hashes `d3b79fce…`, `03d6d4bc…`, `a7cbf2a8…`. On 1847 and 4096 the type counts match M19 and the Verdant Cay payload moves the hash. Cinder Key's next growth after its tick-70 claim is tick 93. On 2718 Cinder Key, claimed at 32, grows at 62, and the count falls by 6: `battle-phase-resolved` 20 → 22, `decision-made` 1163 → 1172, `settlement-upkeep` 273 → 272, `travel-started` 319 → 313. Claims inside the window stay at 2.

1200 ticks. Power and treasury are World Government then Free Tide. A zero runs from the claim that removes the last port until the claim that returns one. Tick-1200 treasuries are 39225.43 / 15416.96, 38321.72 / 15967.8, and 41512.53 / 15346.63.

| Seed | Zero stretches | Tick 400 | Tick 1200 |
| ---: | --- | --- | --- |
| 1847 | Free Tide after 70 until 98 (Zara Gale, Glassport, garrison 8), and after 375 until 400. World Government after 933 until 1180 (Toma Reef, Glassport, garrison 7) | Free Tide holds nothing. Cinder Key 6, Niko Wren. Glassport 5, Bram Quill. Crown Harbor 122. Verdant Cay 84. Power 2960.5 / 1244.54. Treasury 27896.59 / 6470.84 | World Government: Glassport 8, Toma Reef. Free Tide: Cinder Key 14 and Crown Harbor 6 / stability 0, both Finn Frost. Verdant Cay 103. Power 4108.04 / 3196.7 |
| 2718 | Free Tide after 32 until 55 (Mara Calder, Glassport, garrison 8). World Government after 953 until 1026 (Niko Wren, Cinder Key, garrison 6) | Crown Harbor 126, still World Government. Cinder Key 12, Esme Dusk. Glassport 9, Finn Frost. Verdant Cay 84. Power 2956.17 / 1470.13 | Cinder Key 11, Niko Wren. Crown Harbor 9 / stability 0, Bram Tern. Glassport 13, Mina Vale. Verdant Cay 103. Power 4206.33 / 3649 |
| 4096 | Free Tide after 210 until 280 (Mina Vale, Cinder Key, garrison 7). World Government does not hit zero | Crown Harbor 121. Cinder Key 10, Mina Vale. Glassport 9, Pax Ash. Verdant Cay 84. Power 2982.44 / 1749.98 | Cinder Key 12 and Glassport 13, both Bram Quill. Crown Harbor 13 / stability 0, Bram Tern. Verdant Cay 103. Power 4947.08 / 2765.48 |

Eleven, eleven, and ten claims. No run threw. The 1847 tick-400 row matches the recovery note, including Free Tide at zero. Verdant Cay at tick 1200 is still unowned at garrison 103. Crown Harbor then sits at stability 0 under Free Tide, provisions 0, demand 5: tick 777 garrison 6 (shortage 1.149), 858 garrison 9 (1.145), 823 garrison 13 (1.147).

## What today's code does with no ports

Reassign the last port on a seed-1847 world and call the tick's functions. The state and `dashboardState` contain no `NaN`.

**Members, treasury, orders, officers.** Cinder Key flipped onto World Government: all 9 Free Tide ids stay, treasury stays 2800, and after 40 ticks (port restored) it is 2884.03. Both World Government ports flipped onto Free Tide: all 13 members stay, and after 24 ticks with no port of their own the treasury is still 18000. `tradeTax` pays whoever holds the settlement now. The eight Free Tide orders are unchanged. Four `protect` orders still name `cinder-key` (`character-15`, `character-16`, `character-20`, `character-21`). `character-19` still pressures `world-government`. The merchant and explorer orders still have no target. `reportingOfficerId` is chosen once in `createPrototypeWorld`. A Free Tide player still has Dax Pike (`character-20`, leadership 68) and 8 eligible officers.

**Goals, power, recruiting, retreat.** `reviewPlan` (`src/sim/agency.ts`) on Esme Dusk selects `serve-faction` at 1.3, then `expand-influence` at 1.253 and `material-security` at 0.672, and does not throw. Losing a port does not clear `goals`, which is the only way that function throws. `buildCandidates` still offers rest, work, recruit, trade, and travel. The raid gate is unchanged. `factionPower` (`src/sim/state.ts`) is `treasury * 0.012`, plus `garrison * fortification + population * 0.012` per held port, plus each member's `partyPower`. It does not divide. Free Tide goes 1139.74 → 929.54. World Government goes 2335.44 → 2545.64, or 1453.34 with both of its ports reassigned.

`resolveDecision`'s recruit spends money and local arms and does not read the holder. Before the reclaim, Dax Pike recruits at Cinder Key on ticks 17, 18, and 21 (8, then 8, then 2) while it is World Government, and Mina Vale recruits 8 at Glassport on tick 17. His tick-25 `settlement-claimed` writes `character.factionId`, and Cinder Key is Free Tide again. Those 40 ticks: travel 71, trade-local 49, raid 8, recruit 7, buy-provisions 6, work 6, claim 1. Members stay 9. Power ends 923.41. The World Government run raids 4 times in 24 ticks and records no claim. `selectRetreatDestination` (`src/sim/combat.ts`) prefers a friendly port, then a null-faction port, then any other. Esme Dusk leaving Glassport goes to Cinder Key while Free Tide holds it, and to Verdant Cay once it does not. A World Government character leaving Glassport, with both of that faction's ports reassigned, goes to Verdant Cay.

**The false secure report.** `judgeOrderCompletion` completes `protect` when the officer is on the order's target and the order has been active for a day. It reads `settlement.stability` and skips `settlement.factionId`. A direct call, with the order forced to `active` / `following` and `DeterministicRng` seeded at 1, returns 0.811 against 0.754: "Corin Hale reports that Cinder Key is secure…". The forced world emits that shape on its own rng, at tick 12 (Mina Vale, Mara Calder) and tick 16 (Dax Pike). The reclaim is tick 25. The natural seeds do not emit it through 400 M19 ticks or 1200 M19+M20 ticks.

**Projection.** `projectFactions` still lists Free Tide. A Free Tide commander sees treasury 2800, tax 0.08, power 929.54, source `faction-record`. A World Government commander sees that treasury and power as null, the tax still 0.08, source `reputation`. The reverse split uses tax 0.14.

`character-14`, at Crown Harbor, sees `character-15` on Cinder Key at faction tier: `factionId` `free-tide`, money null, troops null, health null, skills present, `activeGoal` null. `character-01` sees the same officer as co-located, because Cinder Key is now his faction's port (`isDirectlyObserved`): money 213, troops 47, and `activeGoal`, knowledge, and personality null. He sees `character-18` on Verdant Cay as distant: `factionId` `free-tide`, location set, money, troops, skills, personality, `activeGoal`, and knowledge null, `observedTick` null, `ageTicks` null, source `reputation`. Membership is public. The purse is not.

The settlement panel mixes a report with a live tax. Pax Ash, offshore, reads the flipped Cinder Key as `factionId` `free-tide` (seeded faction-report), garrison estimate 119, population null, `ownerId` null, confidence 0.58, `observedTick` 0, `ageTicks` 20, and `taxRate` 0.14 from `settlementTaxRate` on the live holder. Mara, standing on Crown Harbor after it is given to Free Tide, reads live garrison 260, population 18000, stability 91, `ownerId` null, panel `factionId` still `world-government` from knowledge, and `taxRate` 0.08. `needsObservation` waits `ticksPerDay` before it refreshes a direct belief. This read is the tick of the flip.

Niko Wren's tick-70 `settlement-claimed` carries `targetId` `free-tide`. `eventPayloadVisible` is true only for him. `character-01`, `character-14`, and `character-15` get `data: null` and "Niko Wren: settlement claimed", with `targetId` still on the event. The new faction id is in `data`. After the tick Mara's owned panel shows Cinder Key exactly: `ownerId` `character-03`, garrison 13, population 6400, stability 55, tax 0.14, source `owned`.

## Candidates (proposal)

400 ticks of M19+M20. The remnant adds no write. Dissolve, absorption, and defection mutate state on the tick Free Tide first hits zero (71, 33, 211). None threw. Each ends with World Government on the three faction ports, Verdant Cay at 84, and 1 / 1 / 3 claims, the ones that had already fired.

| Rule | What it writes | Members at tick 400 | World Government power |
| --- | --- | --- | --- |
| Dissolve | `factionId` null, faction record deleted. The raid gate then never opens for them | 13 World Government, 17 independent | 3381.83, 3359.2, 3445.07. Crown Harbor garrison 257, 257, 177 |
| Remnant | Nothing. The next `settlement-claimed` writes `character.factionId` | Both factions remain. See the 1200-tick table | Both powers finish above their openings |
| Absorption | Members join the other faction, treasuries summed, empty record deleted | 22 World Government, 8 independent | 4848.93, 5135.18, 5082.28 |
| Defection | Each member takes the faction of the port they stand in; sea or Verdant Cay becomes null; empty record deleted. No new RNG | World Government / independent 16/14, 18/12, 19/11 | 4093.13, 4176.28, 4428.43 |

## Recommendation (proposal)

Take the remnant. A faction with no ports remains. Members, treasury, tax rate, orders, and the officer link stay. A port comes back when one of them accepts a surrender. `resolveSettlementClaim` already writes `character.factionId`. No new event and no new RNG draw. Every measured zero ends in a claim except World Government on 4096, which never hits zero. `factionPower` at a port count of zero is 929.54 in the forced case.

Add one predicate in `judgeOrderCompletion`: `protect` completes only when `settlement.factionId === character.factionId`. The forced world takes the bad branch at ticks 12 and 16. The three seeds do not, through 400 M19 ticks or 1200 M19+M20 ticks, so those runs stay as measured. No new event: `settlement-claimed` already exposes `targetId` as the previous faction, and the new faction only in the actor's payload. Rival treasury and power stay null. Distant members keep a public `factionId` and a null purse, skills, goal, and `observedTick`. The live tax beside a stale flag is left as measured. Retargeting orders, naming a capital, and splitting the treasury stay out. Retreat already uses Verdant Cay.

## Tests and the golden fixture

M19 is already in the fixture. M20 moves it (8338 / 8411 / 8298, hashes above). The remnant is what those 72 ticks already contain on 1847 and 2718. Its milestone comes after M20 and does not regenerate the fixture. The protect predicate does not fire in the windows above.

- `tests/simulation.test.ts`, beside "the pressure-test scenario exercises its connected systems". Reassign the last port. The faction record, member ids, and treasury stay. `factionPower` is finite. Forty `runTick` calls do not throw. A later claim restores a port onto that `factionId`.
- `tests/agency.test.ts`, beside "accepted orders report temporary deviations, resumptions, and completion judgments". An active `protect` order does not complete once the target's `factionId` has changed, including with the officer standing there. `reviewPlan` still returns a goal.
- `tests/redaction.test.ts`, beside "a character outside the commander's observation exposes identity only". A landless mate at Verdant Cay is distant: `factionId` set, money, troops, skills, `activeGoal`, and `observedTick` null. A rival faction row has treasury null and power null.
- `tests/dashboard.test.ts`. Offshore `surrender` stays null. The exact branch runs only when `settlement.factionId === commander.factionId`.
- `tests/golden.test.ts`. "pinned seeds reproduce their committed state hash and event count" stays green. `npm run golden:update` belongs to M20.
- `tests/combat.test.ts`. The M19 surrender case stays. With no friendly port, `selectRetreatDestination` returns `verdant-cay`.

## Playtest

Follow `docs/playtests/TEMPLATE.md`. Dashboard HTTP JSON only, as in [informed-commitment-002](../playtests/informed-commitment-002.md). Seed 1847, Mara Vane (`character-01`), ticks 0–100. No survey, no raid. M19 is enough. The gap is ticks 70–87.

**Hypothesis.** Free Tide loses Cinder Key and is still a faction, and Glassport comes back to them, without Mara fighting. Offshore, Free Tide's treasury and power stay null.

**Ambition.** Stay at Crown Harbor. At tick 75, read the faction list and Cinder Key. At tick 95, read Glassport.

**Success.** `free-tide` is still listed, treasury null, power null, tax 0.08. Cinder Key is her faction's exact port. The log has the tick-70 claim, garrison 13, and by tick 95 one `settlement-claimed` for `glassport`. Tick-0 Free Tide ids still read `free-tide`.

`PROMOTE` if both claims are singular and the rival treasury stays null. `REVISE` if the row disappears, a distant purse becomes a number, or a port is claimed twice. `ABANDON` if tick 100 still has Free Tide with no port and no Glassport claim.

Seed 2718, same ambition, stopped after tick 50, is the confirmation: loss at 32, Dax Pike's return at 41, Free Tide row kept, treasury null.
