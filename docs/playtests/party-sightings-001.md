# Playtest: party sightings from an officer already at Cinder Key

## Session

- **Candidate commit:** `6bfdeea`
- **Date:** 2026-09-29 UTC
- **Operator:** The implementing agent, Open Era Engineer, a Cursor cloud agent. This was not a fresh-context operator. The agent had already read the repository and written the sighting slice. During the session every decision was taken from the dashboard HTTP JSON (`GET /api/state`, `POST /api/commands`, `POST /api/advance`). The database, the event log, and the world report were opened only after the session stopped, for this evidence review.
- **Interface:** Dashboard over HTTP, JSON API only for every decision
- **Seed:** `1847`
- **Starting tick:** `0`
- **Ending tick:** `20` (day 3.3)
- **Player character:** Mara Vane (`character-01`, World Government), starting at Crown Harbor with 80 troops, party power 248.522, and 108 money. She did not sail.

## Hypothesis and ambition

**Milestone hypothesis:** A targeted explore of Cinder Key delivers the parties anchored there, dated to that tick, and those troop counts stay put after a party sails.

**Player ambition:** From Crown Harbor, `issue-order` explore, target `cinder-key`, to Niko Wren. Read the sightings. Stay there. Advance until one delivered character's `locationId` is no longer `cinder-key`, and read that character again.

**Success signal:** `partySighting.troops` is the same number as on the first read. That character's `troops` and `partyPower` are null. `observedTick` is the report tick. A character who reaches Cinder Key after the report is not on the list. Verdant Cay, never the target, has no sighted parties.

## Adaptive decision log

| Tick | Player-visible observation | Reasoning | Action | Outcome |
| ---: | --- | --- | --- | --- |
| 0 | At Crown Harbor. Money 108, troops 80, power 248.522. `partySightings` null. Cinder Key is a rumor: garrison ~96, confidence 0.28, age 16, population null, fortification null, `partyCount` null. Forecast `contested`, defender 47.6–150.2, factor "defensive ground remains poorly understood". Seven parties are listed at Cinder Key, including Niko Wren (`character-03`). Their troops and power are null. Verdant Cay garrison ~61, `partyCount` null, no sightings | The officer who can look is already on the port. The seven names are public location, not a troop count | `issue-order` explore, target `cinder-key`, to Niko Wren, priority 0.95 | HTTP 202 `command-00001`. Notice: "Niko Wren is already at Cinder Key. The report will come from an officer already there." |
| 1 | Still at Crown Harbor. The commander's map has six sightings, all `source: faction-report`, `confidence` 1, `travel` null, `locationId` `cinder-key`, `observedTick` 0, age 1. Toma Reef 42 / 94.151, Rook Tern 26 / 84.896, Mina Vale 47 / 94.352, Esme Dusk 28 / 77.004, Niko Crow 33 / 75.939, Toma Hale 16 / 69.437. Niko Wren is not on the list. Her `knowledge` and `partySightings` are null, and her own `troops` are null. Rook Tern's `locationId` is already null, sailing to Crown Harbor, 4 ticks left. His `troops` and `partyPower` are null. The sighting is still 26. Cinder Key garrison 110, population 6400, fortification 1.16, `partyCount` null. Forecast `grave-danger`, defender 508.1–752.3, factors "surveyed ground is 1 ticks old" and "sighted parties at this port are 1 ticks old". Verdant Cay has no sighting whose port is Verdant Cay | The report arrived on the issue tick. Rook has already left the port the sighting names, and the count did not follow him. Niko herself was the one looking, so she is not an entry | Stay. Advance | No further command |
| 2 | Toma Reef's `locationId` is null, sailing Cinder Key to Glassport, remaining 2. `troops` null, `partyPower` null. Sighted troops still **42**, power 94.151, `observedTick` 0, age 2, source `faction-report`. The other five counts are unchanged | This is the character the ambition named: off the port, live troops withheld, dated count stuck | Stay | No command |
| 20 | Still at Crown Harbor. Money 108. All six sightings still `observedTick` 0, age 20, same troop counts as tick 1. Rook Tern is at Verdant Cay. His `troops` and `partyPower` are null. Sighted troops still **26**. Toma Hale and Esme Dusk are at sea, troops null, counts 16 and 28. Cinder Key now also lists Sable Morrow, Lio Crow, Ada Sorn, Sable Sorn, and Kessa Dusk. None of them has a `partySighting`. `partyCount` is still null. Forecast factor "sighted parties at this port are 20 ticks old". No sighting has `locationId` `verdant-cay` | Twenty ticks did not refresh the list. People who arrived after the report are absent. Verdant Cay was never the target | Session end | Final tick 20 |

## Outcome

Mara did not sail. She ordered Niko Wren, who was already at Cinder Key, and the next read of the state carried six anchored parties dated to tick 0. Niko was not one of them. By that same read Rook Tern was already underway, his live troops null, his sighted count still 26. At tick 2 Toma Reef had left as well, still 42. At tick 20 every stored count and every `observedTick` matched the first read. Five characters standing at Cinder Key who were not on that list had no sighting. Verdant Cay never gained one.

## Evidence review

- **World report:** The recovered world reached tick 20 (day 3.3) with state hash `f334f1a32fc68767b4ea0bf9e40ab664fbe824f70d67d1df6b147ee98f64c8aa`. 29 autonomous characters and 1 human. 2,310 persisted events across 5 snapshots. 117 journeys, 95 market trades, 2 completed battles, 3 retreats, 0 captures, 0 escapes. 1 player command accepted and 1 resolved, 0 player messages. Report and map at `simulation-output/playtests/party-sightings-001/`.
- **Metrics:** World Government 2,340.22 power, 18,387.35 treasury, 2 settlements. Free Tide Compact 1,038.12 power, 2,880.15 treasury, 1 settlement. Mara's party power in the end report is 248.522, record 0–0. Her health is 100, her morale is 93.8, her money is 108, and her provisions are 24.48. Rival power was not on the player API during the session.
- **Map:** Generated from the recovered world. Mara is still at Crown Harbor.
- **The report event:** Tick 0, sequence 28, `knowledge-updated` on Mara, reason `explore-report`, six `partySightings`. It is the only `explore-report` in the log. Niko's own `partySightings` is absent. A later completion, "Niko Wren considers the survey of Cinder Key complete" on day 1.3, is her seeded order and did not write a second list. Ada Sorn's Verdant Cay completion on day 0.7 did not either.
- **Decision/agency traces:** 72 plan reviews and 132 direct knowledge updates. 28 plan-time order assessments, 15 accepted and 6 refused. 13 deviations, 11 resumptions, 11 completion reports, 0 issuer confirmations.
- **Conversation traces:** No player messages were sent.
- **Recovery and determinism:** The latest snapshot is sequence 2074. Recovering the world replays the remaining 236 events to the hash above. It differs from the headless gate hash because one player command changed history.

## Findings

### What worked

- **The list is who was anchored, dated to the report tick.** Six parties, not seven. Niko, the officer standing there, is the one who looked, so she is not an entry. Every entry is `faction-report`, confidence 1, `travel` null, `observedTick` 0.
- **Leaving the port does not refresh the count.** Rook Tern was already sailing on the first read after the report. Toma Reef was sailing at tick 2. At tick 20 Rook is on Verdant Cay. In each of those reads `troops` and `partyPower` are null, and the sighted troop count is the tick-0 number.
- **Age moves. The tick does not.** From tick 1 to tick 20 `ageTicks` went from 1 to 20 and `observedTick` stayed 0. No second report was issued.
- **A later arrival is not added.** Sable Morrow, Lio Crow, Ada Sorn, Sable Sorn, and Kessa Dusk are at Cinder Key at tick 20 with `partySighting` null.
- **Verdant Cay has no sighted parties.** Nothing in the map has `locationId` `verdant-cay`. Its `partyCount` stays null, and so does Cinder Key's.

### Implementation defects

None observed in the sighting channel. The dated count held, and a distant party's live `troops` stayed null.

One reading is easy to misread, and it is the clause this slice was told to leave alone. At tick 20 Mina Vale is at Glassport, which her faction holds, so the panel shows live troops **16** and power 63.99. The sighting beside that is still **47**. The live number is the faction-port rule, not the sighting copied into `troops`. While she was at sea on tick 1 those live fields were null.

### Design risks and opportunities

- **The six parties moved the remote forecast from `contested` to `grave-danger`.** Defender 47.6–150.2 became 508.1–752.3 once their stored power was added. That is the sum the note asked for. A commander who only reads the outlook now hears "do not raid" where the rumor said the band was wide. The age line says the parties are as old as the ground.
- **The reporting officer's own strength is not on the list.** Niko's troops stayed null. Learning the scout's count would be a different record.

### Follow-up experiments

- Survey the port in person and confirm the `direct` source, including a captive if one is in the port.
- Read the same character again after a second, older explore report and confirm the newer tick wins. The unit test covers that reducer rule. This session had only one report.

## Recommendation

`PROMOTE`

The dated count held after the party sailed, distant `troops` stayed null, `observedTick` stayed on the report tick, later arrivals were absent, and Verdant Cay gained no sightings. Niko was on Cinder Key with company and the delivered list was not empty.
