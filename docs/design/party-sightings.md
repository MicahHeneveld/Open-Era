# Party sightings

**Status: Open.** Proposal for the owner to accept, change, or reject. Current behavior is `main` at `5d2b7f0`. It is not decided until it moves into [world simulation](world-simulation.md) or [autonomous characters](autonomous-characters.md). The parent brief is [reconnaissance](reconnaissance.md).

Runs are `createPrototypeWorld` plus `runTick`, no player commands, seeds 1847 / 2718 / 4096, Node v22.14.0, ICU 76.1. Rates are the 100 states at ticks 0–99. Staleness is 400 ticks. The 72-tick hashes matched `tests/fixtures/golden-hashes.json` before any prototype (`02f1aa2a…`, `76445c58…`, `12e04439…`; 8338, 8428, 8361 events). Patches were reverted.

## The problem

M18 stores a foreign port's garrison, population, and fortification. It does not store who was standing there. [informed-commitment-002](../playtests/informed-commitment-002.md) and [survey-polish-001](../playtests/survey-polish-001.md) both ended on that gap: a commander can read the ground, and characters, parties, and factions still have no channel. Two facts are already on the wire, and this slice leaves both.

`projectCharacter` in `src/dashboard/visibility.ts` copies `locationId` and `travel` on every tier, including distant. `tests/redaction.test.ts`, "a character outside the commander's observation exposes identity only", asserts that distant `locationId`. `travel` is `{ fromId, toId, totalTicks, remainingTicks }`. Who is sailing where is a global feed. The reconnaissance brief calls that hazard 5.

The co-located tier copies `troops` and `partyPower` exactly. Co-location is two checks. The parties share a settlement and neither is travelling, or the subject is anchored in any settlement the commander's faction holds, at any distance. The second check is hazard 4. Standing in Crown Harbor, a World Government commander reads exact troops for anyone anchored in Glassport.

## What a sighting can be made of

`TravelState` is a route. `travel-started` sets `locationId` to null; `arrived` sets it to the destination and clears `travel`. `travelDuration` is `max(2, ceil((distance / 11) * (1 - navigation / 220)))`. `WorldState` has no ship coordinate. `src/sim/reports.ts` interpolates one for the SVG (`progress = 1 - remainingTicks / totalTicks`) and nothing else reads it.

There is no battle between parties. `combatForecast` takes an attacker and a settlement. `startMajorBattle` stores that forecast with `observedLocally: true`. `defenderInitialPower` is `settlementDefensePower`. Other parties in the port are not in it.

Opening placement is fixed: Crown Harbor 9, Verdant Cay 7, Cinder Key 7, Glassport 7, 99 unordered pairs. `character-14` is then moved to Crown Harbor. `character-01` starts there. The shortest leg is Glassport–Cinder Key, 23.35. The longest is Crown Harbor–Cinder Key, 55.08.

## Measured baseline

"Anchored" in these tables means `locationId` set, `travel` null, and no captivity. Captive character-ticks were 0, 11, and 84. The record proposed below includes a captive who is in the port.

| Seed | Mean pairs in port | Mean anchored | Mean at sea | Commander ticks with company | Officer-ticks off her ports, with company |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1847 | 32.53 | 16.77 | 13.23 | 96 | 420 of 431 |
| 2718 | 40.45 | 17.78 | 12.11 | 93 | 431 of 437 |
| 4096 | 41.18 | 18.52 | 10.64 | 100 | 385 of 395 |

Every tick had at least one shared port. The commander was at Crown Harbor for all 100 ticks, so `survey`, refused as `faction-held` on her own ports, had no legal target. She shared that port with 20, 20, and 23 distinct characters. Never inside her live tier: 3, 1, and 0. Of the other 2,900 character-ticks, 261, 232, and 380 were physical company, and 476, 479, and 551 were exact troops read through the other World Government port.

The officer path is the one that reaches a foreign port without her sailing. A World Government officer other than her was anchored outside World Government for 431, 437, and 395 character-ticks, median company 4, 5, and 4 other parties. Seeded explores still have no `targetId` (`orderFor`). Completions in the window: 2, 3, and 3, all untargeted, and 0 `explore-report` events. Player commands: 0.

Sea, same 100 ticks. Sailing pairs: 8592, 7235, 5662. Mean voyage 3.22, 3.26, 3.23 ticks. Same directed leg and equal `remainingTicks`: 270, 233, 178. Same leg, equal remaining, and equal `totalTicks`, so they left together: 218, 204, 144. Same leg, equal remaining, different duration: 52, 29, 34.

The interpolated point at radius 11: 1327, 1017, 851 pairs. Same origin and progress under 0.34: 395, 327, 294. Same destination and progress over 0.66: 57, 37, 29. The rest: 875, 653, 528. Median separation of every sailing pair: 23.75, 23.75, 24.14. None of those points are in `WorldState`.

Battles started: 11, 11, and 9. All 31 had at least one other party anchored at that port at the start of the tick. Other parties, not counting the attacker: seed 1847 median 3 (2–8), 2718 median 4 (2–8), 4096 median 5 (3–8). The forecast did not add them.

Staleness is the last tick of a port stay, then the subject's `troops.count` later. Stays that shared the port with someone, over 400 ticks: 1371, 1127, 1046. Stays alone: 16, 19, 16. Median stay 2, 3, and 3 ticks (means 5.44, 7.18, 8.12).

| Seed | +18 still exact | +18 mean abs | +72 still exact | +72 mean abs |
| ---: | ---: | ---: | ---: | ---: |
| 1847 | 1090/1333 | 2.12 | 824/1222 | 8.37 |
| 2718 | 885/1088 | 3.11 | 688/986 | 10.43 |
| 4096 | 793/1010 | 2.33 | 606/895 | 8.23 |

Median absolute error is 0 at both horizons on every seed. The mean is the battles. When someone left the commander's live tier, over these 100 ticks: 222, 212, and 183 departures, and 18 ticks later 149/188, 138/179, and 105/157 were still exact (means 1.92, 2.11, 3.76).

## Recommendation (proposal)

One milestone, the size of survey. Extend `survey` and the targeted `explore` delivery. Sea sightings, a passive glance, and a planner read stay out.

A sighting is earned in the two ways M18 already paid for.

1. **`survey`, on the port the commander is standing in, refused as `faction-held` when it is her faction's.** The same action that writes `ground` writes one sighting for every other character whose `locationId` is that port and whose `travel` is null. A party underway has `locationId` null and is left out. A party in another port is left out. A captive in the port is included, at the troop count they have. The sighting does not copy `captivity`.
2. **A targeted `explore` that `judgeOrderCompletion` accepts.** `deliverTargetedExploreReport` copies the same anchored list onto the issuer, `source: "faction-report"`, `observedTick` the report tick, confidence 1. No `targetId` still delivers nothing. The officer's map does not gain the list. Seeded orders have no `targetId`.

Sea passing waits. The `TravelState` rule would be same `fromId`, same `toId`, equal `remainingTicks`, and on these seeds that was mostly ships that had left together. A radius of 11 uses a coordinate that exists only in the map drawing. Either rule, recorded on every ship, is passive observation.

### The record

`partySightings` on the character, keyed by the subject id. The key is absent until the first sighting. It is not a field of `SettlementKnowledge`. Ground has to be copied through every replacement because the reducer replaces the whole entry (`retainGround`). A party is not a port, and a daily `direct local observation` must not be what keeps or drops the list.

Each value:

- `characterId`
- `locationId`, the port they were anchored in
- `travel: null`, meaning anchored. This slice does not store a heading
- `troops`, `troops.count` at the observation
- `partyPower`, `partyPower()` at the observation
- `observedTick`
- `source`, `"direct"` or `"faction-report"`
- `confidence`, 1

Those two numbers stay as seen. They are not recomputed from live experience, discipline, or leadership, which would move an old power when a hidden skill moved. Health, money, cargo, skills, and orders stay off the record.

`observedTick` is the survey tick or the report tick. A later arrival or daily refresh does not advance it. A new sighting replaces the stored one only when its `observedTick` is greater or equal. Nothing deletes one. Age is `max(0, tick - observedTick)`. The panel shows the stored count and that age. The count is not pulled toward 100, and it is null when there is no record. A later blend would use the garrison horizon in `src/sim/agency.ts`, `clamp(confidence * exp(-age / 72), 0.08, 1)`, not the 18-tick price horizon. Median error at 72 ticks was 0. `WorldState.version` stays 5, and the map is omitted so `canonicalJson` drops it. `travel: null` is the whole heading: an anchored party has no course, and parties at sea keep the live `travel` object.

### Left as it is

`locationId` and `travel` stay public at every tier. The co-located tier stays exact, including the faction-port clause. Taking either down is open questions 3 and 5. The map reads `locationId`, and so does the play that finds an officer already at Cinder Key. The sighting stores the port for a later redaction. Until then the pin is live and the sighting is the troop count. Writing the list from `directObservation` is the other candidate.

### Where it shows

On the commander's own character the map is visible, as her `knowledge` is. On anyone else the map is null. On a subject, `partySighting` sits beside `troops`. Co-located, `troops` and `partyPower` stay live. Away, both stay null and `partySighting` is the record or null. The snapshot is not copied into `troops`, so the redaction assertion that distant `troops` is null stays true. Foreign `partyCount` stays null.

The remote `combatForecast` adds the stored `partyPower` of each sighting whose `locationId` is that port, and the line `sighted parties at this port are N ticks old` uses the oldest age in the sum. A sighting older than 72 stays in, and the line says so. The local branch is unchanged: `startMajorBattle` passes `observedLocally: true`, and `totalPhases` and `captureRisk` come from that call. There is no field battle. Defending a port means that remote raid forecast.

The planner does not read sightings in this slice. `buildCandidates` still scores a raid from `believedGarrison` and the live fortification on the spot. Humans skip that function, and autonomous characters do not receive the list. Leave `believedGarrison` alone.

## Hash

`stateHash` is `canonicalJson` of `WorldState`. The event log is counted, not hashed. Knowledge sits on the character, so a field written into an entry is still in the tick-72 state after the event is gone. A forecast string sits on the battle. At tick 72 every seed had zero active battles, so a label alone is not in that snapshot. `captureRisk` from the local forecast is read on a major defeat, so a local number change can still move the world.

Prototypes, then reverted:

| Write | Tick-72 hashes | Events |
| --- | --- | --- |
| List attached inside `directObservation` whenever the observer had company | moved: `cb3b1ab8…`, `ab2cb6b1…`, `0ef67cad…` | 8338, 8428, 8361, unchanged |
| That list, entries still carrying it at tick 72 | 89, 96, and 86 entries. The commander's Crown Harbor entry was one | |
| List attached only in the `survey` case | byte-identical to the fixture. 0 `survey` events. 0 entries carried a list | 8338, 8428, 8361 |
| Remote defender center +40 | byte-identical | unchanged |
| Local defender center +40 | moved: `52447069…`, `00674734…`, `fac40380…` | 8335, 8428, 8361 |

The golden run issues no player commands, and those 100 ticks emitted 0 `explore-report` events, so a writer on `survey` and targeted delivery never runs. No new RNG draw. A human-only guard on `directObservation` still fills the commander's Crown Harbor entry, because she observes. Local defender power moved all three hashes. This milestone does not regenerate the fixture.

## Tests

`tests/party-sightings.test.ts`, new, beside `tests/survey.test.ts`.

- "a survey records anchored parties at the survey tick." `observedTick` is the survey tick, `source` is `direct`, `confidence` is 1, `troops` and `partyPower` match that tick, `travel` is null. A character with `travel` set is absent. A character in another port is absent.
- "a remote sighting ignores later troop changes." After the commander leaves, set the subject's `troops.count` to 9999. Projected `troops` and `partyPower` are null. `partySighting.troops` is the surveyed count. `partySighting.observedTick` is the survey tick. `combatForecast` is deep-equal before and after the 9999. The forecast JSON does not contain `9999`. This is the anti-leak: no live troop count remotely.
- "a sighting is never newer than the observation." Advance ticks with no new survey. `observedTick` is unchanged. `ageTicks` is `world.tick - observedTick`. An explore report dated earlier than the survey does not replace it.
- "a targeted explore delivers sightings to the issuer only." The issuer's `source` is `faction-report`. The officer's `partySightings` is absent. The officer's projected `knowledge` is null. An untargeted explore adds nothing. A party placed on the port after the report is absent. `eventPayloadVisible` is true for the issuer and false for a rival.

`tests/redaction.test.ts`. "a character outside the commander's observation exposes identity only" keeps `troops` null, and `partySighting` is null when there is no record. The snapshot must not fill `troops`. "territory the commander's faction controls counts as observed" keeps the exact troops. "a character under way is not directly observed" stays.

`tests/survey.test.ts`. "a remote forecast reads the stored ground and ignores later truth" stays. Parties on the survey must not make that equality depend on live troops.

`tests/golden.test.ts`. "pinned seeds reproduce their committed state hash and event count" stays green. `npm run golden:update` is not part of this milestone.

`tests/dashboard.test.ts` does not assert troop redaction today. The null checks live in the two files above.

## Playtest

Follow [the template](../playtests/TEMPLATE.md). Dashboard HTTP JSON only, as in [informed-commitment-002](../playtests/informed-commitment-002.md). Seed 1847, Mara Vane (`character-01`), ticks 0–20. She starts at Crown Harbor. Cinder Key opens with 7 parties. Niko Wren (`character-03`) is the World Government explorer already there, the officer that session ordered.

**Hypothesis.** A targeted explore of Cinder Key delivers the parties anchored there, dated to that tick, and those troop counts stay put after a party sails.

**Ambition.** From Crown Harbor, `issue-order` explore, target `cinder-key`, to Niko Wren. Read the sightings. Stay there. Advance until one delivered character's `locationId` is no longer `cinder-key`, and read that character again.

**Success.** `partySighting.troops` is the same number as on the first read. That character's `troops` and `partyPower` are null. `observedTick` is the report tick. A character who reaches Cinder Key after the report is not on the list. Verdant Cay, never the target, has no sighted parties.

`PROMOTE` if the dated count holds and the live troops stay null. `REVISE` if the sighting's tick moves with no new report, or if distant `troops` becomes a live count. `ABANDON` if Niko is on Cinder Key with company and the delivered list is empty.

## Left open

Sea sightings, under a route rule, once this record exists. Freezing a co-located glance, which moves the hashes. Whether `locationId` and the faction-port clause stay public. Faction strength as a labelled partial sum, the third subject in the brief. The planner, after autonomous parties hold sightings of their own.
