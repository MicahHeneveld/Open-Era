# Playtest: survey readings a player can trust

## Session

- **Candidate commit:** `1049973`
- **Date:** 2026-09-29 UTC
- **Operator:** The implementing agent, Open Era Engineer, a Cursor cloud agent. This was not a fresh-context operator. The agent had already read the repository and written the polish. During the session every decision was taken from the dashboard HTTP JSON (`GET /api/state`, `POST /api/commands`, `POST /api/advance`). The database, the event log, and the world report were opened only after the session stopped, for this evidence review.
- **Interface:** Dashboard over HTTP, JSON API only for every decision. Server `127.0.0.1:4317`, database `/tmp/survey-polish-playtest.sqlite`, started with `--seed 1847 --reset`.
- **Seed:** `1847`
- **Starting tick:** `0`
- **Ending tick:** `7` (day 1.2)
- **Player character:** Mara Vane (`character-01`, World Government), starting at Crown Harbor with 80 troops and 108 money. Target: `cinder-key` (Free Tide Compact)

## Hypothesis and ambition

**Milestone hypothesis:** The four readings from the M18 session are now honest. A remote garrison says how old it is. Standing on the island, the panel and the forecast name one fortification. An explore that finishes because the officer is already there says so, and still finishes on the issue tick. A player voyage the quoted passage cannot cover is refused.

**Player ambition:** Read Cinder Key before sailing, including the age of the garrison figure. Order the officer who is already there and see whether the response says so. Sail on a purse that covers the quote. On the beach, compare the fortification on the panel with the forecast. Spend down below the homeward quote and try to sail anyway.

**Success signal:** The opening rumor is labelled with an age and does not print a negative tick. The order response and the chronicle name an officer already there. The beach forecast says `1.16×, skill-scaled` next to a panel that says `1.16×`. The short-purse voyage is HTTP 400 `insufficient-passage` and never becomes an event.

## Adaptive decision log

| Tick | Player-visible observation | Reasoning | Action | Outcome |
| ---: | --- | --- | --- | --- |
| 0 | Cinder Key rumor, garrison **~96**, `garrisonIntelligence` source `rumor`, `observedTick` **0** (the seeded −16 is not shown), `ageTicks` **16**. Panel text `Garrison ~96 16 ticks old`. Fortification null, population null. Passage to Cinder Key **15**, **5** ticks. Money 108. Niko Wren (`character-03`) is already at Cinder Key | The 96 is a rumor, and the label says it is 16 ticks old rather than the island's current garrison. The officer who can replace it is already on the island | `issue-order` explore, target `cinder-key` | HTTP 202 `command-00001`. `notice`: "Niko Wren is already at Cinder Key. The report will come from an officer already there." |
| 1 | Garrison **~110**, `garrisonIntelligence` `faction-report`, observed tick 0, age **1**. Population **6400**, fortification **1.16×**, `groundIntelligence` age 1. Panel `Garrison ~110 1 ticks old` and `Fortification 1.16× 1 ticks old`. Chronicle, both at tick 0: "Mara Vane received a survey of Cinder Key from an officer already there" and "Niko Wren was already at Cinder Key and reports the survey from an officer already there. The survey is complete and awaits confirmation." Money still 108 | The report replaced the rumor on the issue tick, and both lines say why it was immediate. The new garrison is 1 tick old, not a live count. The purse covers the quote of 15 | `travel` to Cinder Key | Accepted as `command-00002` |
| 6 | Standing on Cinder Key. Arrival event is tick 5. Money **93**. Live garrison **94**, fortification **1.16×**, `garrisonIntelligence` `direct-observation`, age **0**. The panel garrison has no age. The forecast is **null**: Sable Morrow (`character-04`) has a battle at Cinder Key (started tick 5, retreated tick 6) | Contact replaced the record with the beach. 94 against the reported 110 is the island moving, which is what the age label was for. The missing forecast is the existing rule that hides it during a visible battle, not a second wall | `recruit` | Accepted as `command-00003` (event tick 6) |
| 7 | Money **9**, troops **87**. Panel `Garrison 94` with no age, `Fortification 1.16×`. Forecast factors: confidence, "76% troop discipline", **"defensive ground is 1.16×, skill-scaled"**, "battle variance constrained by strategy 72". Strategy 72. Homeward passage still 15 | The panel and the forecast name the same wall. 9 cannot cover 15 | `travel` to Crown Harbor | HTTP 400 `{ ok: false, code: "insufficient-passage", error: "The passage to Crown Harbor costs 15; the character holds 9" }`. Not an event. Session stopped |

## Outcome

Mara read a 16-tick-old rumor of 96, then ordered Niko Wren, who was already at Cinder Key. The order response said the report would come from an officer already there, and it did, on that tick: population 6400, walls 1.16, garrison ~110 labelled 1 tick old. She sailed a passage of 15 from 108 and arrived with 93. The beach garrison was 94, with no age, because she was standing on it. The first beach poll had no forecast, because Sable Morrow was in a battle there; once that battle ended, the forecast said the defensive ground is 1.16×, skill-scaled, beside a panel that said 1.16×. Recruiting left her with 9. The voyage home was refused before the ship left.

## Evidence review

- **World report:** The recovered world reached tick 7 (day 1.2) with state hash `4c295604a568ce711ab4501dd1789bc08ad06e901d73482baf5fba8462c9993d`. 29 autonomous characters and 1 human. 847 persisted events across 4 snapshots. 51 journeys, 24 market trades, 1 completed battle, 2 retreats, 0 captures. 3 player commands accepted and 3 resolved. 0 player messages. Report and map at `simulation-output/playtests/survey-polish-001/`.
- **Metrics:** World Government 2,334.57 power, 18,072.71 treasury, 2 settlements. Free Tide Compact 1,080.4 power, 2,821.51 treasury, 1 settlement. Mara's party power in the end report is 260.348, record 0–0, location Cinder Key, money 9, troops 87. Rival power was not on the player API during the session.
- **Map:** Generated from the recovered world. Cinder Key did not change hands.
- **Decision/agency traces:** 35 plan reviews and 48 direct knowledge updates. 21 plan-time order assessments, 15 accepted and 6 refused. 8 deviations, 5 resumptions, 7 completion reports, 0 issuer confirmations.
- **The report and the beach:** The chronicle line for Niko is the already-there wording. Ada Sorn's untargeted Verdant Cay completion kept the old wording: "Ada Sorn considers the survey of Verdant Cay complete and requests confirmation." Mara's stored Cinder Key entry after arrival is source `direct`, `observedTick` 5, `garrisonEstimate` 98. The panel showed the live garrison 94 because she was co-located. `ground` is still the survey: population 6400, fortification 1.16, `observedTick` 0, source `faction-report`. The arrival carried that ground forward.
- **Internal ticks:** The player projection floored the opening rumor at 0. The simulation copy still holds Verdant Cay `observedTick` −11 (`rumor`) and Glassport −14 (`faction-report`).
- **Niko's battle:** She delivered the report and, on the same tick, started a battle at Cinder Key. She was repelled on tick 2 (day 0.3): 13 attackers and 17 defenders lost. That is why a garrison recorded as 110 was not the beach she landed on.
- **Sable Morrow:** Battle at Cinder Key from tick 5, retreat toward Glassport on tick 6, 2 troops lost in withdrawal. That is the tick the forecast was hidden.
- **The refusal:** The short-purse travel is not among the 847 events. The log's three player commands are the order, the outward voyage, and the recruit.
- **Conversation traces:** No player messages were sent.
- **Recovery and determinism:** Recovering the world replays 122 events to the hash above. It differs from the headless gate hash because three player commands changed history.

## Findings

### What worked

- **The frozen garrison is labelled as a record.** At tick 0 the panel said `~96` and `16 ticks old`, with `observedTick` 0 rather than −16. At tick 1 it said `~110` and `1 ticks old`. On the beach it said `94` and did not call that figure old.
- **One wall.** After Sable's battle ended, the panel's `1.16×` and the forecast's `defensive ground is 1.16×, skill-scaled` are the same number. Strategy 72 is named on its own factor.
- **Immediate explore stayed immediate, and said why.** The 202 carried the notice. Both chronicle lines, on tick 0, say the officer was already there. An untargeted completion in the same log did not grow that sentence.
- **The short purse never sailed.** 9 against a quote of 15 was HTTP 400 `insufficient-passage`, with the cost and the purse in the error, and it left no event.

### Implementation defects

None observed in the four readings.

The forecast was absent on the first beach poll. That is the existing gate: a visible battle hides the forecast. Sable Morrow was fighting at Cinder Key from the arrival tick until she retreated on the next tick. The following poll, with no battle, showed the skill-scaled 1.16×. It was not a contradiction between the panel and the forecast.

`1 ticks old` is the same plural the fortification label already used. This session did not treat it as a new defect.

### Design risks and opportunities

- **An officer already there still skips the voyage.** The label is honest. The report still costs no sea tick. That was the requested behavior for this polish.
- **Autonomous parties still sail on a short purse.** This session did not exercise that path. The player refusal does not apply to it.
- **Characters, parties, and factions are still unread.** Free Tide's power was in the report after the session and on no player panel during it.
- **The garrison moved during the voyage, in the way the label warned.** Reported ~110 at age 1; beach 94. Niko's repulse (17 defenders) is part of that gap. The number on the remote panel was never a promise.

### Follow-up experiments

- Order an officer who must sail, and confirm the already-there sentence does not appear.
- Leave an autonomous party with less than the passage quote and record whether refusing it is worth a golden-hash move.
- Read the beach forecast on an arrival tick when nobody else is fighting there, so the skill-scaled line is visible without waiting out another battle.

## Recommendation

`PROMOTE`

The four readings held in play. The rumor carried its age and did not print a negative tick. The officer already on the island was named, and the report still arrived on the issue tick. The beach named one fortification. The voyage the purse could not cover was refused and never entered the log.

This recommendation is for these readings. It does not close the autonomous short-purse gap, and it does not add a channel for characters, parties, or factions. It is not a merge, and this branch was not opened as a pull request.
