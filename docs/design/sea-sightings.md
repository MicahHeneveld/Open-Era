# Sea sightings

**Status: Open.** Proposal for the owner to accept, change, or reject. Current code is `main` at `f86ad31a75159bbecfac83ffe7666c4ecf4d0b24`. The derivation below was run in a local harness and taken back out. No source change is in this commit. This note is not decided until it moves into [world simulation](world-simulation.md) or [reconnaissance](reconnaissance.md). It follows [party sightings](party-sightings.md): M21 records who was anchored in a surveyed port. This is the channel for a ship met at sea.

Runs are `createPrototypeWorld` plus `runTick`, no player commands, seeds 1847 / 2718 / 4096, 1200 ticks, Node v24.21.0, ICU 78.3. `npm test` on this tree passes, 200 tests. A figure at tick 0 is the world before any `runTick`. A figure at tick 72, 400, or 1200 is the world after that many calls (`world.tick` equals that number). Tick numbers on events are the `tick` field. The fixture's last event tick is 71. The committed 72-tick fixture reproduced on that unmodified tree:

| Seed | State hash | Events |
| ---: | --- | ---: |
| 1847 | `cb04ba5d392d8b1c868cc97e54cb21b21ec171edd546bb70d0d7aba86cc69c11` | 8301 |
| 2718 | `bd7d8cc44d5fa21022ecb8f8086e13dfbb9475eb025b5ae53f87e2991f90035c` | 8513 |
| 4096 | `20975bf480e5aa11eeafe1ce39c36cf5ba0fa8e2d5de2bb5887a35d7b3aecc9f` | 8031 |

M28 is already in this tree, and seed 2718 is the hash above. The harness called the derivation after every `runTick` and did not write it. Those three hashes and event counts were unchanged at tick 72.

## The problem

M18 stores a foreign port's garrison, population, and fortification. M21 stores who was anchored there: `troops.count` and `partyPower()`, dated, confidence 1. Both writers require the subject to be in port. `partySightingsAt` in `src/sim/engine.ts` keeps a character only when `locationId` is that settlement and `travel` is null. A party underway has `locationId` null. The port list never sees them.

[Party sightings](party-sightings.md) left sea passing for a later note, once the port record existed. The parent brief calls movement a global feed ([reconnaissance](reconnaissance.md), hazard 5): `projectCharacter` in `src/dashboard/visibility.ts` copies `locationId` and `travel` on every tier. Who is sailing where is already on the wire. What is not on the wire, once a ship has left, is the troop count, the party power, and the crew. `isDirectlyObserved` returns false when `character.travel !== null`, so a ship at sea is never the co-located tier. The faction-port clause does not reach it either.

There is still no battle between parties. A sea sighting is not a fight. It is the reading a captain gets from a ship whose path crosses theirs.

## Where a ship is

`TravelState` in `src/sim/types.ts` is `{ fromId, toId, totalTicks, remainingTicks }`. There is no sea-lane record and no ship coordinate on `WorldState`. A voyage is one direct leg. `travelDuration` in `src/sim/engine.ts` is `max(2, ceil((distanceBetween(...) / 11) * (1 - navigation / 220)))`, or 1 when `locationId` is already null. `distanceBetween` in `src/sim/state.ts` is the Euclidean distance between the two settlements' `position` fields. Nothing in between is a stop.

`resolveDecision` starts an autonomous voyage with `remainingTicks` equal to `totalTicks` and emits `travel-started`. The reducer sets `locationId` to null. `progressTravel` then emits `travel-progressed` with `remainingTicks` reduced by 1. At 0 it emits `arrived`, and the reducer sets `locationId` to `toId` and `travel` to null. `runTick` walks characters in id order. An autonomous ship decides to sail inside that walk, after the travel check, so the departure tick does not step it. The next tick does. A player `travel` command is handled in `processPlayerCommands`, which runs before that walk, so `progressTravel` steps the human on the same tick the order resolves.

A retreat uses the same shape. `retreatFromBattle` builds `retreatTravel` with `remainingTicks` equal to `totalTicks`. `progressActiveBattles` runs before the character walk and puts the attacker in the skip set, so the retreat snapshot is also unstepped. `beginPostDefeatWithdrawal` does the same. `releaseTravel` builds a voyage for a mandatory release or an escape. That call sits in `processCaptivityDeadlines`, before the walk, and the freed character is no longer captive, so the release voyage is stepped on the same tick. `character-captured` sets `locationId` to the port and `travel` to null.

After `runTick`, the dashboard reads `world.tick` already advanced. A ship still at sea has `travel` set and `remainingTicks` at least 1. A ship that arrived this tick has `travel` null. Two parties' legs are on those fields every tick. The point along the leg is not stored. `mapSvg` in `src/sim/reports.ts` draws it as `progress = 1 - remainingTicks / totalTicks` and then interpolates `settlement.position`. Nothing else reads that point. This rule does not either. It uses the tick the ship just spent, which is knowable from `remainingTicks` and `totalTicks`.

Sailed ticks are `totalTicks - remainingTicks`. Zero sailed ticks means the ship is on the departure snapshot and occupies the point at the origin of its leg. One or more sailed ticks means it occupies the half-open span from `(sailed - 1) / totalTicks`, exclusive, to `sailed / totalTicks`, inclusive. Fractions compare as integers (`sailed * otherTotal` against `otherSailed * total`), so the test does not depend on a float.

## The rule

Derived when the state is projected. No new field on `WorldState`. No new event. No RNG draw. `WorldState.version` stays 5. The observer must themselves be at sea (`travel` set). The subject is every other character who is also at sea. The observer is not a sighting of themselves. A character in port is absent. The list is empty when the observer is in port, and the projected key is null in that case, the same way an absent `partySightings` map is null.

A lane is the unordered pair `{fromId, toId}`. Opposite means one ship's `fromId` is the other's `toId`.

1. **Passing.** Opposite directions on that lane, and the spans overlap on an axis that runs from the lexicographically smaller settlement id to the larger. A ship sailing toward the larger id uses the directed span above. A ship sailing toward the smaller id sits at `remainingTicks / totalTicks`. Unstepped, that is the point 1. Stepped, the span is `[remainingTicks / totalTicks, (remainingTicks + 1) / totalTicks)`, closed at the current end and open at the previous end. Overlap, including a shared endpoint that both spans include, is a passing.
2. **Overtaking.** Same `fromId`, same `toId`, the directed spans overlap, and `totalTicks` differ. The faster ship and the slower ship both receive this kind.
3. **Sharing.** Same `fromId`, same `toId`, the directed spans overlap, and `totalTicks` are equal. Equal totals and equal `remainingTicks` are the same point, including two ships that cast off together and are both still on the departure snapshot. A ship one step ahead, same `totalTicks`, does not overlap: the spans meet at an endpoint the trailing span excludes.
4. **Arriving.** Both have `remainingTicks === 1` and the same `toId`, and the pair was not already passing, sharing, or overtaking. Different origins are allowed. This is the last sea snapshot before both dock. It is an arrival tick, not a distance: a 2-tick voyage with one tick left is halfway along its leg, and a longer voyage with one tick left is close to the port.

When sharing or overtaking is also the last tick (`remainingTicks === 1` on both), the kind stays sharing or overtaking and `arriving` is true. Passing cannot share a destination. Opposite ships are sailing toward each other's origins.

Same leg, anywhere along it, is not enough. The spans have to meet. Two ships on one route with a gap between them produce no row.

Each row, present only while the test holds:

- `characterId`
- `factionId`, copied so the row stands alone. It is already on the character projection.
- `fromId`, `toId`, the subject's leg at this read
- `kind`, `passing`, `sharing`, `overtaking`, or `arriving`
- `arriving`, true when both are on their last sea tick toward the same port
- `sailors`, `character.sailors`
- `troops`, `troops.count`
- `partyPower`, `partyPower()` at this read
- `observedTick`, `world.tick` at this read
- `source`, `"direct"`
- `confidence`, 1

`ageTicks` is `max(0, world.tick - observedTick)`, computed in the projection and not stored. On this rule that is 0 for every row that exists. The panel string is the one party sightings already print in `src/dashboard/index.html`: the count, then "N ticks old". Here that is "0 ticks old". The count is not blended. `beliefWeight` in `src/sim/agency.ts` is not applied. The garrison horizon stays 72 (`GARRISON_FRESHNESS_TICKS`). The settlement warning "Intelligence is stale" stays on settlement knowledge, at `ticksPerDay * 3` (18, because `ticksPerDay` is 6). A sea row is not a settlement report and does not fire it.

`observedTick` is the snapshot tick, matching co-located `characterIntelligence`, which stamps `world.tick` and age 0. A survey stamps the event tick, and the next read is already one tick old. A live sea row uses the snapshot, so it does not inherit that one-tick lag.

There is no `faction-report` and no relay onto an issuer. A targeted explore still delivers the anchored list only. The officer's own map does not gain sea rows, and neither does the issuer's.

On the commander's own character the list is visible, as `partySightings` is. On anyone else it is null. On a subject, `seaSighting` sits beside `partySighting` and `troops`. It is never copied into `troops`. Co-located troops stay live once both ships have docked. Away, and at sea, `troops` and `partyPower` stay null.

## What stays hidden

Identity, faction, and the live `travel` object are already on every tier. This row repeats `characterId`, `factionId`, and the leg so it can be read on its own. It does not newly reveal a destination. Hazard 5 stays as it is: the course is still public, and this slice does not take it down.

The hold stays off the row. So do money, health, morale, skills, attributes, orders, the plan, knowledge, debts, and captivity. Troop experience and discipline stay off. Only `troops.count` is kept. `partyPower()` may use the hidden skills at the moment of the read, and the number is then fixed on the row for as long as the row lasts, which is this snapshot. There is no ship-count field. One party is one voyage. `sailors` is the crew. Hold capacity in [world simulation](world-simulation.md) is 40 plus 2 per sailor, and that formula is not what the row stores.

`travel-progressed` carries cargo, health, morale, and `troopCount` on the event. `eventPayloadVisible` already withholds another character's payload. The derivation reads the character, not that payload, and it does not copy the cargo.

## How it ages

It does not age in place. The row is computed from the current `WorldState`. When the spans stop overlapping, and the arriving test fails, the row is absent. Absence is null, not a zero and not a stale count. Nothing is deleted from the hash, because nothing was written.

A contact usually lasts one snapshot. For the sample captains below, episode length (consecutive snapshots of the same observer, subject, and kind) had median 1 on every seed, minimum 1, and maximum 5, 4, and 4. The means were 1.471, 1.379, and 1.585.

The alternative is the M21 map: keep the last row per subject, replace it when `observedTick` is greater or equal, and let `ageTicks` grow after the ships separate. That memory was counted in the harness and not written on the neutrality run. Its ages are under [If the row were kept](#if-the-row-were-kept). Keeping it on the character moves the fixture. The proposal leaves it out.

## Measurements

A sighting-row is one subject on one snapshot. The sample captain is the autonomous character with the most rows on that seed. No tie needed the lower id.

Mara Vane (`character-01`) had 0 sea ticks on every seed, so 0 rows, 0 distinct parties, and no earliest tick. She is the human. With no command she never enters the travel branch. The headless run does not give her a sea sighting.

| Seed | Captain | Sea ticks | Rows | Distinct parties | Earliest tick | Passing | Sharing | Overtaking | Arriving | Arriving flag |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1847 | Toma Hale (`character-27`) | 608 | 462 | 23 | 1 | 193 | 123 | 105 | 41 | 97 |
| 2718 | Zara Gale (`character-17`) | 562 | 284 | 23 | 1 | 119 | 56 | 64 | 45 | 71 |
| 4096 | Zara Gale (`character-17`) | 669 | 355 | 23 | 3 | 123 | 84 | 118 | 30 | 73 |

The arriving flag counts rows whose kind is already sharing or overtaking and whose `remainingTicks` are both 1, plus the arriving-only rows. Toma is unaffiliated. Of his 462 rows, 350 were a faction subject and 112 were unaffiliated. Zara is Free Tide. On 2718 her rows were 65 Free Tide, 135 the other faction, and 84 unaffiliated. On 4096 they were 112, 118, and 125. Rows whose `troops` were 0: 3, 2, and 0.

At ticks 72, 400, and 1200 the live list, which is the proposal, had these row counts. Every one of them has age 0.

| Seed | Captain | Tick 72 | Tick 400 | Tick 1200 |
| ---: | --- | ---: | ---: | ---: |
| 1847 | Mara Vane | 0 | 0 | 0 |
| 1847 | Toma Hale | 1 | 0 | 0 |
| 2718 | Mara Vane | 0 | 0 | 0 |
| 2718 | Zara Gale | 1 | 0 | 0 |
| 4096 | Mara Vane | 0 | 0 | 0 |
| 4096 | Zara Gale | 0 | 0 | 1 |

The earliest row on each seed is `world.tick` 1. On 4096 that is not Zara. Toma Hale's first row on 4096 is tick 1. Zara's own first on that seed is tick 3.

**Example.** Seed 1847, tick 1. Toma Hale sees Mina Vale (`character-15`, Free Tide). Both are on `cinder-key` → `glassport`, `remainingTicks` 2, `totalTicks` 2, so both are still on the departure snapshot, the same point. Kind `sharing`, `arriving` false, `confidence` 1, `source` `"direct"`, `observedTick` 1. Mina's sailors 19, troops 47, party power 94.352. Her `locationId` is null and her `captivity` is null. Her hold at that read was provisions 31.54, arms 1, medicine 1, ship materials 3, and her money was 213. None of those four cargo numbers, and not the money, go on the row.

Across every unordered pair of ships at sea, over 1200 ticks:

| Seed | Pair-ticks at sea | Same leg, spans overlap | Opposite, spans overlap | Arriving only | Same leg, no overlap | Opposite, no overlap |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1847 | 23199 | 1091 | 718 | 422 | 1597 | 1858 |
| 2718 | 17618 | 649 | 530 | 326 | 1094 | 1316 |
| 4096 | 21462 | 913 | 579 | 346 | 1765 | 1587 |

The rows that meet the rule are the overlap columns plus arriving only: 2231, 1505, and 1838 unordered pair-ticks. The captain table above is one observer's directed rows, so it counts each of those meetings from that captain's side only. The same-leg pairs that do not overlap had median progress gap 0.5 on every seed, and mean gap 0.445, 0.463, and 0.438, to the thousandth. The mean gap of every same-leg pair, overlap included, was 0.282, 0.303, and 0.307.

Character-ticks with `travel` set: 7125, 6208, and 7099. Of those, the departure snapshot (`sailed` 0) was 2448, 2095, and 2337. Character-ticks with both `captivity` and `travel`: 0, 0, and 0. Sighting-rows whose subject had just retreated or withdrawn on that tick: 8, 10, and 7. Rows whose subject was released on that tick: 13, 1, and 3. The events underneath those rows were `battle-retreated` 7, 17, 6; `post-defeat-withdrawal-started` 14, 17, 16; `captivity-released` 10, 8, 10; `captivity-escaped` 0, 0, and 0. A row can name the same subject for more than one observer, so the row counts are not the event counts.

### If the row were kept

Same contacts, last row per subject kept in the harness only, age `world.tick - observedTick`. Buckets are 0, 1–17, 18–71, and 72 or more. Eighteen is the stale-intelligence warning. Seventy-two is the garrison horizon. Mara's remembered list was empty at every read point, on every seed.

Toma Hale, seed 1847. Tick 72: 15 remembered, buckets 1 / 3 / 11 / 0, min 0, max 70, median 46. Tick 400: 23 remembered, 0 / 4 / 4 / 15, min 9, max 384, median 157. Tick 1200: 23 remembered, 0 / 2 / 2 / 19, min 5, max 1184, median 432.

Zara Gale, seed 2718. Tick 72: 14 remembered, 1 / 1 / 12 / 0, min 0, max 58, median 38. Tick 400: 21 remembered, 0 / 4 / 5 / 12, min 1, max 386, median 98. Tick 1200: 23 remembered, 0 / 2 / 1 / 20, min 4, max 1186, median 663.

Zara Gale, seed 4096. Tick 72: 15 remembered, 0 / 3 / 12 / 0, min 2, max 69, median 30. Tick 400: 23 remembered, 0 / 2 / 3 / 18, min 3, max 397, median 221. Tick 1200: 23 remembered, 1 / 1 / 1 / 20, min 0, max 1192, median 521. The one age-0 row at tick 1200 is the live row in the table above.

By tick 72 most of a kept list is already in the 18-tick bucket or older. The live rule does not show those rows.

## Hash

`stateHash` is `canonicalJson` of `WorldState`. The event log is counted, not hashed. The read-only derivation matches the fixture on all three seeds. Event counts at 1200 on that same run were 162789, 164645, and 161904. Those are not part of the fixture.

Writing the row onto every observer after each tick, replacing a stored subject only when the new `observedTick` is greater or equal, and leaving `ageTicks` off the stored object:

| Seed | State hash | Events | Characters with a map | Entries | Mara's entries |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1847 | `01532e4410ac5bcd3e2c3d2545d57011d92cd75aebce8ed034cb998a182137a9` | 8301 | 29 | 420 | 0 |
| 2718 | `22b871277014be381d1e4129637ba5567343d8f9f0b5573dbf804a501333ed01` | 8513 | 29 | 384 | 0 |
| 4096 | `c4834c7cd1a4428577e70f4d0b08689fb83e2eb4b1fb13262909037c7b30542a` | 8031 | 28 | 312 | 0 |

The event counts did not move. The hashes did. Nothing in the sim reads the field, so the history is the same history with extra bytes on the character. That is enough to miss the fixture. Writing the field only onto Mara, on the same no-command run, matched the fixture on all three seeds, with 0 entries, because she never sails in those 72 ticks. The proposal does not use that narrower writer. The derivation stays off the world for every captain, and the player's list is the projection of her own voyages.

`npm run golden:update` is not part of this note.

## Survey, port sightings, captivity, M29, M30

A snapshot cannot put the same party on both lists. The sea rule requires `travel`. `partySightingsAt` requires `travel === null` and a `locationId`. The tick they dock, `arrived` clears `travel`, the sea list loses them, and a survey is still what writes the port record. Standing in that port then, including two captains who arrived together, is the co-located tier: live troops, age 0, no sea row. The sea row is not copied into `partySightings`, and a daily `knowledge-updated` still does not carry the port list.

A captive is in port. `character-captured` clears `travel`. These runs had no character-tick with both captivity and travel, so a captive was never a sea subject or a sea observer. `partyPower()` returns 0 while `captivity` is set, and the sea row does not arise in that state. A release can put the captain back on a voyage. The rows counted above are ordinary sea rows. They do not copy `captivity`. Troops may still be 0 until `progressTroopRecoveries` returns them, and the three zero-troop rows on 1847 are whatever `troops.count` was at that read. A port survey still includes a captive who is anchored, at that count, which is M21's rule and is unchanged.

M29 is the accepted outscore rule, not built here. It retitles some defender victories when the attacker score was higher. That changes who retreats and who is captured, and therefore who is on the water. This derivation does not read morale, the phase scores, or the capture roll. The counts above are this tree, M28 already in, M29 not applied. M30 is the command seat, also not in this tree. The seat does not move a ship, and the derivation does not read loyalty or who is covering the seat. Neither milestone reads a sea row. The planner does not either. `buildCandidates` stays on `believedGarrison`. A remote `combatForecast` stays on the stored port sightings M21 already added. Sea rows are not added to that sum.

## Tests

`tests/sea-sightings.test.ts`, new, beside `tests/party-sightings.test.ts`.

- "two ships that cast off together share the departure snapshot." Same `fromId`, `toId`, `totalTicks`, and `remainingTicks` equal to `totalTicks`. The row is `sharing`, `arriving` false, `confidence` 1, `source` `"direct"`, `observedTick` equal to `world.tick`, `ageTicks` 0. `sailors`, `troops`, and `partyPower` match that tick.
- "a ship one step ahead on the same duration is not alongside." Same `totalTicks`, `remainingTicks` differ by 1. No row.
- "different durations whose spans overlap are an overtaking." The kind is `overtaking` for both captains.
- "opposite spans that meet are a passing." The kind is `passing`. A pair whose spans do not meet has no row.
- "both on the last tick, different origins, same destination, is arriving." Kind `arriving`, `arriving` true. A pair already overlapping on the same leg keeps `sharing` or `overtaking` and sets `arriving` true.
- "a ship in port is absent, and so is a captive." `travel` null produces no row. A captive with `travel` null is absent. The row has no `captivity` key.
- "the hold stays off the row." Set the subject's cargo to a sentinel. The sighting JSON does not contain it. Projected `cargo`, `money`, and `troops` stay null while both are at sea.
- "separating drops the row and does not leave a troop count." After the spans no longer overlap, `seaSighting` is null and `troops` is null. Editing `troops.count` to 9999 while they are apart does not appear in the projection.
- "the derivation does not write the world." `partySightings` stays absent. `stateHash` is unchanged across the projection. No new RNG draw: `rngState` is unchanged across the projection.

`tests/redaction.test.ts`. "a character under way is not directly observed" keeps `troops` null. Extend it so a contact fills `seaSighting.troops` and still leaves `troops` null. "a character outside the commander's observation exposes identity only" keeps `seaSighting` null when the commander is not on that leg.

`tests/party-sightings.test.ts`. "a survey records anchored parties at the survey tick" already requires a character with `travel` set to be absent. That assertion stays. A sea row must not create a `partySightings` entry.

`tests/golden.test.ts`. "pinned seeds reproduce their committed state hash and event count" stays on the hashes in the table at the top. `npm run golden:update` is not part of this work.

The local harness was not left in the tree. The 200 tests are the unmodified tree. The tick-72 comparison above is the golden assertion the projection meets.

## Playtest

Follow [the template](../playtests/TEMPLATE.md). Dashboard HTTP JSON only, as in [informed-commitment-002](../playtests/informed-commitment-002.md). Seed 1847, Mara Vane (`character-01`), ticks 0–4. She starts at Crown Harbor. One command, then no others.

This voyage was run through `submitCommand` and `runTick` in the harness, separate from the 1200-tick headless runs. Queuing travel to Glassport before the first tick is accepted. Her voyage is `crown-harbor` → `glassport`, `totalTicks` 4. Because a player order is resolved before the character walk, the tick-1 read has already stepped once (`remainingTicks` 3). She is at sea on ticks 1, 2, and 3, and at Glassport on tick 4 with `travel` null.

**Hypothesis.** Sailing Crown Harbor to Glassport, the tick-2 read names Ada Sorn on the same leg with her troop count, that count is not her live `troops`, and the sea list is gone once Mara has docked.

**Ambition.** At tick 0, `POST /api/commands` with `playerId` `prototype-player`, `type` `character-action`, `action` `travel`, `targetId` `glassport`. `POST /api/advance` with `ticks` 2. `GET /api/state`. Read Mara and Ada Sorn (`character-13`). Advance to tick 4 and read Mara again.

**Success.** At tick 2 Mara's `travel` is `crown-harbor` → `glassport`, remaining 2 of 4, `locationId` null. Ada's `travel` is `crown-harbor` → `glassport`, remaining 2 of 3. Mara's sea list has Ada: kind `overtaking`, `arriving` false, sailors 18, troops 35, party power 81.529, `confidence` 1, `source` `"direct"`, `observedTick` 2, `ageTicks` 0, `factionId` `world-government`. Ada's projected `troops` and `partyPower` are null. At tick 4 Mara's `locationId` is `glassport`, her `travel` is null, and her sea list is null. Tick 3 of the same voyage, if the operator stops there, also has a passing of Sable Sorn (`character-24`): `glassport` → `crown-harbor`, remaining 2 of 4, sailors 14, troops 36, party power 100.168, kind `passing`.

`PROMOTE` if tick 2 shows Ada's 35 on the sea row, her live troops stay null, and tick 4 has no sea list. `REVISE` if the sea row's `observedTick` moves while the spans still overlap, or if Ada's cargo or a live troop count appears on her character while she is at sea. `ABANDON` if tick 2 does not show Ada on `crown-harbor` → `glassport` with 2 of 3 left. That course is already on `travel` in the current JSON, so a miss means this seed no longer makes the crossing.

## Questions for Micah

1. **Two ships on the same route, a long way apart. Do you learn the other crew's strength?** Default: no. You learn it when the stretch of water each ship crossed this tick overlaps, or when both will dock at the same port on the next tick. The ships this rule leaves out, on the same route, were about half a voyage apart.
2. **After the ships separate, do you keep the count?** Default: no. The count is worked out when the state is read, and it is gone when the ships are no longer together. Writing it onto every captain changed all three 72-tick hashes. A kept list was already mostly 18 ticks old or older by tick 72.
3. **What do you learn about the ship?** Default: who they are, their faction, how many sailors, how many troops, and their party power, plus the heading the map already shows. The hold, the purse, health, skills, and orders stay hidden. There is no separate number of ships. One party is one voyage, and sailors are the crew.
4. **The map already shows where every ship is going. Leave that as it is?** Default: yes. This channel adds the strength of a ship you actually meet. It leaves the public course in place.
5. **Two ships that reach the same port next tick, from different islands. Does that count?** Default: yes. That is the arriving case. "One tick left" is not a distance, so they may still be far apart on the water.
6. **A prisoner, or a captain just let out.** Default: a prisoner is in port and is not a sea sighting. A captain who has been released and is sailing is an ordinary ship. The row does not say they were a prisoner. Who is anchored, including a prisoner, stays a survey.
7. **Does this change a battle forecast, what an autonomous captain does, who wins a fight, or who sits in command?** Default: no. It is a reading on the commander's screen. The planner, the port forecast, the outscore rule, and the command seat do not read it.
