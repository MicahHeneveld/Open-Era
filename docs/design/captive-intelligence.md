# Captive intelligence

**Status: Open.** Proposal for the owner to accept, change, or reject. Current code is `main` at `f8eb64c7996f6605d45208682fcb33deb2ce4de8`. The derivation below was run in a local harness and taken back out. No source change is in this commit. This note is not decided until it moves into [world simulation](world-simulation.md) or [reconnaissance](reconnaissance.md). It follows [sea sightings](sea-sightings.md): M32 reads a ship while the spans overlap and stores nothing. This is the channel for a prisoner a faction holds, and for the port a released captain carries home.

Runs are `createPrototypeWorld` plus `runTick`, no player commands, seeds 1847 / 2718 / 4096, 1200 ticks, Node v24.21.0, ICU 78.3. `npm test` on this tree passes, 200 tests. A figure at tick 0 is the world before any `runTick`. A figure at tick 72, 400, or 1200 is the world after that many calls (`world.tick` equals that number). Tick numbers on events are the `tick` field. The fixture's last event tick is 71. The committed 72-tick fixture reproduced on that unmodified tree:

| Seed | State hash | Events |
| ---: | --- | ---: |
| 1847 | `cb04ba5d392d8b1c868cc97e54cb21b21ec171edd546bb70d0d7aba86cc69c11` | 8301 |
| 2718 | `bd7d8cc44d5fa21022ecb8f8086e13dfbb9475eb025b5ae53f87e2991f90035c` | 8513 |
| 4096 | `20975bf480e5aa11eeafe1ce39c36cf5ba0fa8e2d5de2bb5887a35d7b3aecc9f` | 8031 |

The harness called the captor derivation after every `runTick` and did not write it. Those three hashes and event counts were unchanged at tick 72. Calling the derivation left `stateHash` and `rngState` unchanged.

## The settled ruling, and this note

[Owner questions](owner-questions.md#already-settled) records the progress log's answer to reconnaissance questions 1–8. Question 1 is no: a survey or an officer's look stores population, walls, and who was anchored. Question 2 keeps the confidence and the original date on that handoff. Questions 3–8 stay as the code already is. The phrase in that paragraph is "no captives or informants."

That answer is the survey and party-sightings slice. [Reconnaissance](reconnaissance.md) question 6 asked whether a captive may reveal beliefs, or also their orders. Question 7 asked whether an informant may sell someone else's beliefs. The slice declined both. [Party sightings](party-sightings.md) records a captive who is anchored, at `troops.count`, and does not copy `captivity`. This note does not reopen informants, public sea courses, the live garrison from another of your ports, or seeded hearsay. It does not edit owner questions. It is the captive channel that slice left closed, and it stays a proposal until Micah accepts it.

Ransom is the release already on `main`. `processCaptivityDeadlines` in `src/sim/engine.ts` draws the demand, pays what the purse can, and records the rest as a debt. This note does not change that draw, the fourteen-day term, question 24, or the captivity-debt proposal. The debt and the coins stay off both readings.

## The problem

M18 stores a foreign port's garrison, population, and fortification when someone surveys it. M21 stores who was anchored there. M32, computed on read, shows a ship whose path crosses yours, and drops the row when the ships separate. None of those is a prisoner.

A captive is already in the world. `attemptCapture` writes `captivity` and `character-captured`. `applyEvent` sets `troops.count` to 0, `locationId` to the port, and `travel` to null. `partyPower` in `src/sim/state.ts` returns 0 while `captivity` is set. The count they had is `captivity.scatteredTroops`. `runTick` then skips them, so they do not observe, plan, or work for the rest of the hold. Their `knowledge` map freezes. It is still self-only: `projectCharacter` in `src/dashboard/visibility.ts` copies `knowledge` only for the commander themselves.

What the captor's faction can already see is the co-located tier. `isDirectlyObserved` is true when the parties share a port, or when the subject is anchored in any settlement the reader's faction holds. A prisoner in a port the captor still holds is that second clause. The whole faction then sees exact skills, the live troop count of 0, `partyPower` 0, and the whole `captivity` object, including `scatteredTroops`. They do not see the prisoner's knowledge, orders, plan, or loyalty. `visibleStandingOrders` keeps an order to its issuer and its holder. `projectFactions` leaves a rival `treasury` null.

When the port changes hands, that clause stops. The prisoner is still theirs — `captorFactionId` was copied at capture and is not rewritten — but a reader who is not standing in the port drops to distant. Distant `captivity` is null. Distant `troops` is null.

The other direction is the prisoner. Standing in the port, the settlement projection is present-tense, including garrison. `runTick` never writes that look down, because the captive is skipped before `needsObservation`. On release, `captivity` is cleared. `releaseTravel` may put them on a voyage. Nothing on `WorldState` still holds the garrison they were looking at. A later read of the port is whatever belief they carried in, which the hold did not refresh.

## Where the code already is

`CAPTIVITY_MAX_DAYS` in `src/sim/engine.ts` is 14. `ticksPerDay` is 6. `attemptCapture` sets `mandatoryReleaseTick` to `world.tick + 84`, `captorFactionId` to `world.settlements[settlementId].factionId`, and `releaseDestinationId` from `selectRetreatDestination`. The causes are `major-defeat` (`completeMajorBattle`, after a lost major) and `failed-retreat` (`retreatFromBattle`). `captureChanceForRisk` in `src/sim/combat.ts` is the chance. The roll is `rng.next()`.

`processCaptivityDeadlines` runs when `world.tick >= mandatoryReleaseTick`, in id order, after production and before troop recovery, battles, and the character walk. It emits `captivity-released` with `daysHeld`, the terms, the debt, and `releaseTravel`. `escapeCaptivity` is the player command `escape-captivity`. These runs emit `captivity-escaped` 0 times.

`directObservation` and `needsObservation` in `src/sim/agency.ts` are how a standing character refreshes a port. The captive walk never reaches them. `emitCombatObservation` can still write one direct record on the battle tick, before the capture, because that call happens while `locationId` is the port. `knowledgeFor` in `src/sim/scenario.ts` is the only other writer at creation: a direct record of the starting port, a faction report at confidence 0.76 for the character's other home ports, and a rumor for the rest, backdated 3 to 30 ticks.

`partySightingsAt` keeps a character whose `locationId` is the port and whose `travel` is null. A captive qualifies. The stored `partyPower()` is 0. `eventPayloadVisible` withholds another character's payload whatever ground it happened on.

There is no rank field. Leadership is `skills.leadership`. The seat in [political layer](political-layer.md) is the issuer hardcoded in `orderFor`: `character-01` for World Government, `character-14` for Free Tide. That sort uses loyalty. This channel does not.

## The rule

Two readings. The captor's is derived when the state is projected. The prisoner's is written once, at release, because the port they were standing in is not on the world after `captivity` is cleared. No new event. No RNG draw. `WorldState.version` stays 5. The ransom draw in `processCaptivityDeadlines` stays the one draw it already is.

### What the captor's faction reads

Present only while `captivity` is set and `captivity.captorFactionId` is the reader's faction. The reader does not have to be in the port. Losing the port does not end the reading. A faction that later holds the port, and is not the captor, gets nothing from this channel. The prisoner is not a row on their own screen. Unaffiliated captives are not a faction's row. These runs had no null captor and no captive held by their own faction.

Each row, for one prisoner:

- `characterId`
- `factionId` and `archetype`, copied so the row stands alone. Both are already on every tier
- `leadership`, `skills.leadership`
- `troops`, `captivity.scatteredTroops.count`
- `partyPower`, `partyPower`'s formula with those scattered troops in place of the live count. The live function returns 0, so this number is not that field
- `observedTick`, `captivity.capturedTick`
- `source`, `"direct"`
- `confidence`, 1
- `ports`, the prisoner's beliefs about their own faction's ports, below

`ageTicks` is `max(0, world.tick - observedTick)`, computed in the projection and not stored. The first snapshot after the capture tick already has age 1, the same one-tick lag a survey has. On a completed hold the last snapshot has age 84.

A port belief is a `knowledge` entry whose `source` is `"direct"` or `"faction-report"` and whose stored `factionId` equals the prisoner's `factionId`. An unaffiliated prisoner has none. A rumor is left out, including a rumor that happens to name their faction. These runs had 0 such rumors. Each port keeps the entry's `garrisonEstimate`, `observedTick`, `confidence`, and `source`. Stocks, prices, population, and fortification stay off, including `ground`. Headless runs write no `ground`. The list is empty when they believe none of their faction's ports. Empty is an empty list, not the live holdings.

The row is on the commander's own reading of that prisoner, the way `partySighting` is. It is not copied into `troops` or `partyPower`. On a character who is not the reader, the list is null.

### What the released captain carries home

Written inside `processCaptivityDeadlines`, after settlement upkeep has already set the garrison, before the release event. One object, `releaseSighting`, on that character. Absent until the first release, so a world with no release hashes as it does now. A later release replaces it when the new `observedTick` is greater or equal. Nothing deletes it.

The object:

- `settlementId`, the prison
- `factionId`, the faction that holds that port at release
- `captorFactionId`, the faction that took them, which can differ once the port has changed hands
- `garrison`, the port's garrison after this tick's upkeep. A port in battle skips production; the garrison is then the one already on the settlement
- `parties`, every other character anchored there (`locationId` set, `travel` null), in id order, each with `troops` (`troops.count`), `partyPower()` at that moment, `observedTick`, `source` `"direct"`, `confidence` 1. A fellow prisoner is included at count 0 and power 0, which is M21's rule. `captivity` is not copied
- `observedTick`, the release event's tick
- `source`, `"direct"`
- `confidence`, 1

`ageTicks` is computed on read and not stored. The parties are the ones anchored on the last tick the prisoner is still held. Upkeep does not move people, and the character walk has not run. The garrison is the upkeep figure when that event exists.

The object is visible on the released captain's own character, as `knowledge` is. On anyone else it is null. It is not delivered to their faction, and it is not copied into their `knowledge` map. An officer's survey is still the path that hands a port to an issuer.

## What stays hidden

On the captor's row: orders, the plan, goals, personality, loyalty, relationships, money, cargo, health, morale, sailors, debts, the ransom terms, the rival treasury, and any port the prisoner does not believe their faction holds. The live garrison of those ports stays off. The seat score `leadership + loyalty * 50` stays off, because loyalty is not on the row.

On the release record: the captor's other ports, the treasury, population, fortification, stocks, prices, and the ransom. Standing in the port already shows population and fortification for that tick. This record does not keep them. M18's rule was that standing is not a survey.

`character-captured` still carries health, morale, and the roll. `eventPayloadVisible` still withholds that payload from anyone but the actor. This channel reads the character after the tick, not that payload.

## How it ages

The captor's person fields keep confidence 1. The count is not blended toward 100, and `beliefWeight` is not applied to them. The age is shown. A completed hold runs from age 1 through age 84, so it passes the settlement stale line at 18 (`ticksPerDay * 3`) and the garrison horizon at 72 (`GARRISON_FRESHNESS_TICKS` in `src/sim/agency.ts`) while the prisoner is still held. Those two labels are for settlement reports. This person row is not one, and it does not fire "Intelligence is stale".

A port belief keeps the prisoner's confidence and the prisoner's `observedTick`. The projection floors a negative tick at 0 for display and still ages from the raw tick, as `reportedAge` does. The confidence label is the garrison one: `round(clamp(confidence * exp(-age / 72), 0.08, 1), 2)`. The stale warning applies, because this line is a settlement report. A handoff does not make it younger. That is reconnaissance question 2, kept.

The release record is a direct garrison figure. Stored confidence stays 1. The label uses the same garrison weight. At the measured ages 1, 18, 84, 134, and 245 that label is 0.99, 0.78, 0.31, 0.16, and 0.08. Age 18 is the stale warning. Age 245 is on the floor. The number on the record does not move when the port's garrison moves later.

## Measurements

Captures, releases, and escapes over 1200 ticks. Every completed hold is 84 event ticks and `daysHeld` 14. Snapshot counts are the worlds after `runTick` where `captivity` is still set: from `capturedTick + 1` through the release tick, inclusive.

| Seed | Captures | Releases | Still held | Escapes | Failed retreat | Major defeat | WG rows | FT rows | WG ticks | FT ticks |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1847 | 13 | 10 | 3 | 0 | 1 | 12 | 733 | 252 | 495 | 252 |
| 2718 | 9 | 8 | 1 | 0 | 2 | 7 | 672 | 23 | 457 | 23 |
| 4096 | 13 | 10 | 3 | 0 | 3 | 10 | 756 | 147 | 610 | 105 |

A row is one prisoner on one snapshot, for that captor faction. It is the same list for every member of the faction. Self-exclusion never removed a row: no one was held by their own faction. Mara Vane (`character-01`) sees the World Government rows: 733, 672, and 756. Pax Ash (`character-14`) sees the Free Tide rows: 252, 23, and 147. Mean rows on a tick that has any: World Government 1.481, 1.47, and 1.239; Free Tide 1, 1, and 1.4.

Membership stays 13, 9, and 8. Character-ticks with both `captivity` and `travel`: 0, 0, and 0. Unpaid releases (`terms.debtValue > 0`): 9, 7, and 7. Paid in full: 1, 1, and 3. Those terms are not on either reading.

Open at tick 1200: seed 1847, Mina Vale and Corin Hale from event tick 1129 (71 snapshots, due 1213) and Bram Tern from 1197 (3 snapshots, due 1281). Seed 2718, Vale Drake from 1177 (23 snapshots, due 1261). Seed 4096, Niko Wren, Sable Morrow, and Orin Rill from 1179 (21 snapshots each, due 1263).

The earliest capture on each seed:

| Seed | Event tick | Sequence | Who | Where | Captor | Cause |
| ---: | ---: | ---: | --- | --- | --- | --- |
| 1847 | 34 | 3940 | Sable Morrow (`character-04`) | Cinder Key | Free Tide | failed-retreat |
| 2718 | 71 | 8402 | Mina Vale (`character-15`) | Crown Harbor | World Government | failed-retreat |
| 4096 | 12 | 1422 | Sable Morrow (`character-04`) | Cinder Key | Free Tide | failed-retreat |

The earliest of the three is Sable on seed 4096, event tick 12. Her first captor snapshot is `world.tick` 13. She is Free Tide's prisoner, so Mara's list does not include her.

Leadership, scattered troops, and the knowledge fingerprint were unchanged across every hold. The garrison of the prison did move. From the capture snapshot to the release record, absolute change on completed holds: seed 1847 median 4, mean 13, max 103; seed 2718 median 6.5, mean 15.375, max 53; seed 4096 median 6, mean 29.7, max 124. The upkeep garrison differed from the last held snapshot on 1 of 28 completed releases: Esme Dusk, seed 2718, event tick 495, last held 123, upkeep 124. The record uses 124. The set of anchored parties changed on all 35 holds, so the release list is not the list from the capture tick.

On the release lists, party rows were 75, 46, and 68. Of those, 5, 2, and 1 were themselves captives, at troops 0 and party power 0. Every completed release started a voyage. None stayed in the port. `releaseTravel` returned a route in every case.

Snapshots where the prison's faction was still the captor: 849, 648, and 732. Snapshots where it was not: 136, 47, and 171. At the first snapshot the captor faction's issuer was co-located on all 35 holds, so hazard 4 already shows skills and `scatteredTroops` then. The issuer's tier on the last snapshot was distant on 2, 0, and 3 holds. The reconstructed power and the port beliefs are not on the wire in either tier.

Distinct dated facts, counted once per value even when the same row is read for 84 ticks. A recapture with a new `observedTick` is a new fact. Port beliefs that repeat exactly, same estimate and same original tick, are one fact.

| Seed | People | Leadership readings | Troop readings | Port beliefs | Of those, direct | Faction-report | New facts |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1847 | 10 | 13 | 13 | 11 | 10 | 1 | 37 |
| 2718 | 6 | 9 | 9 | 5 | 5 | 0 | 23 |
| 4096 | 8 | 13 | 13 | 11 | 10 | 1 | 37 |

Faction and archetype are not in that last column. They are already public. The new facts are leadership, the captured troops and power, and the port beliefs. Holds whose port list was empty: 4, 4, and 2. Those prisoners still yield the person fields.

Port beliefs at the first snapshot of each hold, one row per belief on that hold. A belief that is unchanged on a later capture is counted again here and once in the distinct table. Age is `world.tick - observedTick`, so a report seeded at −23 is already old. Stale means age at least 18.

| Seed | Beliefs | Age min / median / mean / max | Garrison error min / median / mean / max | Stale | Faction disagrees | Belief, port not live | Live port, no belief |
| ---: | ---: | --- | --- | ---: | ---: | ---: | ---: |
| 1847 | 13 | 28 / 374 / 432.308 / 902 | 0 / 5 / 30.077 / 244 | 13 | 6 | 6 | 4 |
| 2718 | 5 | 15 / 270 / 358.2 / 834 | 1 / 2 / 1.8 / 3 | 4 | 2 | 2 | 4 |
| 4096 | 13 | 9 / 302 / 386.769 / 1210 | 0 / 3 / 55.923 / 256 | 9 | 6 | 6 | 4 |

The two faction-reports are Sable Morrow on 1847, Crown Harbor, estimate 275, confidence 0.76, raw tick −23, age 58, display confidence 0.34, live garrison 253; and Niko Wren on 4096, Crown Harbor, estimate 246, confidence 0.76, raw tick −30, age 1210, display confidence 0.08, live garrison 4. The one belief under 18 ticks is Esme Dusk on 2718, Glassport, direct, estimate 8, age 15, display confidence 0.81, live garrison 9.

Orders on the prisoner at capture. Open means pending, active, or awaiting confirmation.

| Seed | Holds with any order | Holds with an open order | Directives still open |
| ---: | ---: | ---: | --- |
| 1847 | 11 | 0 | |
| 2718 | 8 | 0 | |
| 4096 | 10 | 2 | protect 1, pressure 1 |

The two open orders are seed 4096: Sable Morrow, protect, still active through the hold, issuer `character-01`, target Crown Harbor; Esme Dusk, pressure, still active, issuer `character-14`, target `world-government`. Both name the seat. Every other order on a captive was already refused or completed. Pax, the Free Tide issuer, has no order of his own on any of his holds. The row leaves all of these off.

### Release-record ages

Latest record per captain. Age is `world.tick - observedTick`. Buckets are 0, 1–17, 18–71, and 72 or more. Tick 72 is before every release, so the map is empty there.

| Seed | Tick 72 | Tick 400 | Tick 1200 |
| ---: | --- | --- | --- |
| 1847 | 0 | 1 record, age 282, bucket 72+ | 8 records, ages 31–1082, buckets 0 / 0 / 1 / 7 |
| 2718 | 0 | 1 record, age 245, bucket 72+ | 5 records, ages 93–577, buckets 0 / 0 / 0 / 5 |
| 4096 | 0 | 4 records, ages 155, 277, 298, 304, all 72+ | 6 records, ages 108–1104, buckets 0 / 0 / 0 / 6 |

The age-31 record on 1847 at tick 1200 is Pax Ash, released at event tick 1169. Characters released more than once, and so replaced an older record: seed 1847, Mara Calder at 582 and 806, Pax at 678 and 1169. Seed 2718, Mina Vale at 155 and 1066, Esme Dusk at 495, 703, and 1107. Seed 4096, Mina at 245, 886, and 1092, Pax at 559, 658, and 1034. Records still on the characters at tick 1200: 8, 5, and 6.

### Example

Seed 2718. Mina Vale (`character-15`, Free Tide, steward) is captured at Crown Harbor on event tick 71, sequence 8402, cause `failed-retreat`. Captor is World Government. `mandatoryReleaseTick` is 155.

At `world.tick` 72 Mara Vane is at Crown Harbor, not travelling, not captive. Mina is there too. Her live `troops.count` is 0 and her live `partyPower` is 0. The captor row is leadership 25, troops 12, party power 60.244, `observedTick` 71, age 1, confidence 1, source `"direct"`. Her port list is empty. Free Tide at that tick holds Cinder Key and Glassport, garrison 7 and 7. Those two ports are not on the row. Free Tide's treasury is 3460.72 and is not on the row. Her money is 110.08 and is not on the row. Her order is a refused protect of Cinder Key issued by Pax Ash, and it is not on the row.

The row stays up through `world.tick` 155, age 84, confidence still 1. Crown Harbor's garrison on the first snapshot is 223. On the last held snapshot it is 208, and the upkeep event on the release tick is also 208. The anchored parties have changed. The release record, `observedTick` 155, is Crown Harbor, faction World Government, captor World Government, garrison 208, and four parties: Mara Vane, troops 75, party power 211.051; Vale Drake (`character-08`), troops 31, party power 107.672; Sable Sorn (`character-24`, unaffiliated), troops 107, party power 159.331; Orin Frost (`character-29`, unaffiliated), troops 90, party power 137.275. None of the four is captive.

The release event is tick 155, `daysHeld` 14, `debtValue` 0, `moneyPaid` 58.13. The voyage is `crown-harbor` → `glassport`, `totalTicks` 3. At `world.tick` 156 she has already been stepped once (`remainingTicks` 2), `captivity` is null, and the captor row is gone. The release record's age is 1. At tick 400 that record is age 245 and the garrison label is on the floor, 0.08. She is captured again at event tick 982 and released at 1066 from Cinder Key, garrison 7. That second record replaces the Crown Harbor one. At tick 1200 its age is 134 and the garrison label is 0.16.

## M29, M30, M31, M32

M29 is the accepted outscore rule, not built here. It retitles some defender victories when the attacker score was higher. That changes who is captured. This derivation does not read morale, the phase scores, or the capture roll. The counts above are this tree. M28 is already in it. M29 is not applied.

M30 is the command seat, also not in this tree. The row does not name the issuer and does not read loyalty. Pax is captured on these runs, and World Government's reading of him is the same shape as any other prisoner. His own order list is empty, so the row does not say he sits in command. A subordinate's order would, which is why orders stay off. The acting commander is a member of the prisoner's faction, not the captor's, so they do not receive the captor row. The release record stays on the released captain. The cover does not read it, does not confirm it, and does not issue from it.

M31 is the unpaid-release scar, not applied. The accepted rule takes 0.04 loyalty once when `debtValue > 0`, and the only new reader is the seat sort. This channel does not read loyalty or the debt, and the scar does not change leadership, the scattered count, or the frozen knowledge. The unpaid counts above are the releases that rule would touch. They are not an input here.

M32 is [sea sightings](sea-sightings.md). A captive has `travel` null. These runs had no character-tick with both captivity and travel, so a captive was never a sea subject or a sea observer. Every release in these runs starts a voyage, and that voyage is an ordinary sea row if the spans overlap. The sea row does not copy `captivity` and does not copy `releaseSighting`. A port survey still includes a captive who is anchored, at the live count, which is M21 and is unchanged.

The planner does not read either record. `buildCandidates` stays on `believedGarrison`. A remote `combatForecast` stays on the stored port sightings M21 already added.

## Hash

`stateHash` is `canonicalJson` of `WorldState`. The event log is counted, not hashed. The read-only captor derivation matches the fixture on all three seeds. Event counts at 1200 on that same run were 162789, 164645, and 161904. Those are not part of the fixture.

The release record cannot be rebuilt from `WorldState` after the hold. `captivity` is gone, the knowledge map was not refreshed during the hold, and the release event does not carry the garrison or the parties. The proposal writes `releaseSighting` on the captive at release and nowhere else. That write is absent at tick 72 on every seed. The fixture matches. The first world where the hash differs is the tick after the first release event: event ticks 118, 155, and 96, so `world.tick` 119, 156, and 97.

| Seed | Tick-72 hash | Tick-72 events | First differing tick | Hash there | Baseline hash there | Tick-1200 hash | Tick-1200 events |
| ---: | --- | ---: | ---: | --- | --- | --- | ---: |
| 1847 | fixture | 8301 | 119 | `e26d2dc08b96ec202a127938ad3d09456c66f62a9665b52fbec069ea4daa5221` | `2ed44ea48930162f5770d835a7605e8111ee87f0f2cf1899214acc744adce92d` | `d08c5708da66c575e24141d75560b02f052c8405e3dd7cfb122c69cc7d4c57e5` | 162789 |
| 2718 | fixture | 8513 | 156 | `034ab0278aabf1ca40cca1806db6b101ae226c1f801facf5aa77f39be66eac44` | `991709d4b9ab3d14b96a52327fc650f275721629b24e2ea33a4f78141c1c08cc` | `e46bb341470d3243a0d9aadd6d0870ea5c351ba1d2352a112293d6f4ff8d729f` | 164645 |
| 4096 | fixture | 8031 | 97 | `3d827b76fddc0da6ef75e2349f3045b40a2eb8cf96d46d31fd3bf5077a50f490` | `d313155d95150c67ea553b3a65acc9d5c8331efd17ec503351bd93317378aed2` | `ae45eb174a060257f5b83c3996cf5fae8405f954e9dd25b04eb54075998ecc09` | 161904 |

Tick-1200 baseline hashes, with no record written, were `f96da8a3051174256d790c66bf73593b0aef26480845af21b936b55a660af967`, `433c77bd80ed14c573db620f718b4a968adfd4c71a08abef5494b3bef90c7d8b`, and `2aca57fcfad1a63f6aea6bbda3bf07cdaee4edd0baddd5b2ad3015aa2e06d201`. Event counts at 1200 did not move. Records present at tick 72: 0. Records present at tick 1200: 8, 5, and 6.

Writing the captor rows onto the faction on every tick that has a prisoner does move the fixture. The first differing worlds are tick 35, 72, and 13, which are the first snapshots of Sable, Mina, and Sable. Tick-72 hashes become `a2e2be1c3d9f32392f9bc284691721a9ee3c4dd3ba2c3e6493fe61e7a09f6e7f`, `cb3849ab74ff8b1ac32ff4498bfdbf0c73cbc40069f38a5c8eba68d34db57cb6`, and `f6a879dd732b6f7cded09e251373b1a75087b2e6b8d37efb67fae78d3566e310`, with the same event counts 8301, 8513, and 8031. Entries on the factions at tick 72: 1, 1, and 3. The proposal does not use that writer. The captor list stays a projection.

`npm run golden:update` is not part of this note.

## Tests

`tests/captive-intelligence.test.ts`, new, beside `tests/party-sightings.test.ts`.

- "a captor reads the captured strength, and the live power stays zero." After a capture, the row's `troops` is `scatteredTroops.count`, `partyPower` matches the scattered formula, `observedTick` is the capture tick, `confidence` is 1, `source` is `"direct"`. Projected `troops.count` is 0 and projected `partyPower` is 0 while the reader is co-located. The row is not copied into those fields.
- "a port belief ignores a later live garrison." The prisoner's direct or faction-report entry for their own faction is on the row, with that entry's `observedTick` and `confidence`. Set the settlement garrison to 9999. The row still has the stored estimate. The live 9999 is not on the row. A port their faction holds that their knowledge does not name is absent. This is the anti-leak.
- "a rumor is not a port belief." An entry with `source` `"rumor"` is absent, including when its `factionId` is the prisoner's.
- "orders, money, and treasury stay off the row." The row JSON does not contain the order directive, the purse, or the faction treasury.
- "the captor row ends at release." Advance to the release. `captiveIntel` is null. Projected `troops` is null once the reader is not co-located.
- "a release record keeps the prison and does not follow it." `releaseSighting.garrison` is the upkeep figure from the release tick. `observedTick` is that event tick. Set the settlement garrison to 9999 afterward. The record is unchanged. `ageTicks` is `world.tick - observedTick`. A second release with a later tick replaces it. An earlier one does not.
- "another faction does not read the prisoner." A reader whose faction is not `captorFactionId` has no row, including after the port changes hands. The prisoner's own character has no captor row.
- "the captor derivation does not write the world." `stateHash` and `rngState` are unchanged across the projection. `releaseSighting` is absent until a release.

`tests/redaction.test.ts`. "a character outside the commander's observation exposes identity only" keeps `troops` null. Extend it so a distant prisoner of another faction has `captiveIntel` null. "territory the commander's faction controls counts as observed" keeps the exact live troops. The captured strength stays on `captiveIntel` and is not written into `troops`.

`tests/party-sightings.test.ts`. "a survey records anchored parties at the survey tick" already includes a captive at `troops.count`. That assertion stays. A captor row must not create a `partySightings` entry.

`tests/golden.test.ts`. "pinned seeds reproduce their committed state hash and event count" stays on the hashes in the table at the top. `npm run golden:update` is not part of this work. A headless 72-tick world has no `releaseSighting`.

The local harness was not left in the tree. The 200 tests are the unmodified tree.

## Playtest

Follow [the template](../playtests/TEMPLATE.md). Dashboard HTTP JSON only, as in [informed-commitment-002](../playtests/informed-commitment-002.md). Seed 2718, Mara Vane (`character-01`), ticks 0–156. No commands. She starts at Crown Harbor and is still there at tick 72 and at tick 156.

**Hypothesis.** With no order from Mara, World Government's reading of Mina Vale at tick 72 is the strength Mina had when she was taken, her live power stays 0, and that reading is gone once she is released.

**Ambition.** `POST /api/advance` with `ticks` 72. `GET /api/state`. Read Mina Vale (`character-15`). Advance 84 more ticks, to tick 156, and read her again.

**Success.** At tick 72 Mara's `locationId` is `crown-harbor` and her `travel` is null. Mina's `locationId` is `crown-harbor`. Her live `troops.count` is 0 and her live `partyPower` is 0. Her `captivity.scatteredTroops.count` is 12 and `captivity.capturedTick` is 71. The captor row says troops 12, party power 60.244, leadership 25, `observedTick` 71, `ageTicks` 1, `confidence` 1, `source` `"direct"`, `settlementId` `crown-harbor`, and `ports` empty. The row does not contain 7, which is the garrison of Cinder Key and of Glassport at that tick, and it does not contain her money 110.08. At tick 156 Mina's `captivity` is null, her `travel` is `crown-harbor` → `glassport` with 2 of 3 left, her projected `troops` and `partyPower` are null, and the captor row is null. Mara's own character has no `releaseSighting`. Mina's release record is on Mina, and Mara's projection of Mina leaves it null.

`PROMOTE` if tick 72 shows 60.244 on the captor row, the live power stays 0, the port list is empty, and tick 156 has no captor row. `REVISE` if the row's `observedTick` moves during the hold with no new capture, or if Cinder Key's live garrison appears on the port list. `ABANDON` if tick 72 does not show Mina captive at Crown Harbor under World Government. That capture is already on `character-captured` in the current log, so a miss means this seed no longer makes it.

## Questions for Micah

1. **While you hold someone, do you learn the ports they think their faction holds?** Default: yes, as the report they already carry, with that report's date and confidence. You do not learn the live list, and you do not learn the treasury. On the first look, beliefs that named a port the faction no longer held were 6, 2, and 6, and live ports they had no belief for were 4, 4, and 4.
2. **Do you learn their orders?** Default: no. Two holds on seed 4096 still had an open order, a protect and a pressure, and both name the person who gave it. Every other order on a prisoner was already refused or finished.
3. **What do you learn about the person?** Default: leadership, the troop count from the capture, and the party power that count gives. Faction and role are already on the character. The purse, the hold, loyalty, and the ransom stay hidden. While they are held, the live party power is 0.
4. **After they walk out, do they keep the prison?** Default: yes. One record, written at release: the port, who held it, the garrison after that morning's upkeep, and the parties anchored there. A later release replaces it. It is the one thing stored. The 72-tick hashes stay as they are, because that write first lands at world tick 97, 119, or 156. Storing the captor's reading on the faction moved all three hashes.
5. **Do they also learn the captor's other ports?** Default: no. They stood in one port. Population, walls, stocks, and the treasury stay off that record.
6. **The prisoner is still there after the report is 18 ticks old, and after 72. Do the person-fields fade?** Default: no. Leadership and the captured troop count stay as taken, confidence 1, and the age is shown. The port beliefs use the garrison horizon, the same way a settlement report does. The stale warning stays 18 ticks, and it applies to those port beliefs and to the release record.
7. **Does this change a fight, a plan, who sits in command, the loyalty loss on an unpaid release, or a ship met at sea?** Default: no. It is a reading. The outscore rule, the command seat, the scar, and a sea sighting do not read it. A captain just let out is an ordinary ship. The sea row does not say they were a prisoner.
8. **What about informants, and the ruling that the survey slice has no captives?** Default: informants stay closed. That ruling was the survey and the anchored list. This note is the captive channel those questions left out. It leaves public courses, the live garrison from your other ports, and seeded hearsay where they are.
