# Playtest: informed commitment from an officer's survey

## Session

- **Candidate commit:** `5343663`
- **Date:** 2026-09-29 UTC
- **Operator:** The implementing agent, Open Era Engineer, a Cursor cloud agent. This was not a fresh-context operator. The agent had already read the repository and written the survey slice. During the session every decision was taken from the dashboard HTTP JSON (`GET /api/state`, `POST /api/commands`, `POST /api/advance`). The database, the event log, and the world report were opened only after the session stopped, for this evidence review.
- **Interface:** Dashboard over HTTP, JSON API only for every decision
- **Seed:** `1847`
- **Starting tick:** `0`
- **Ending tick:** `21` (day 3.5)
- **Player character:** Mara Vane (`character-01`, World Government), starting at Crown Harbor with 80 troops, party power 248.522, and 108 money. Target: `cinder-key` (Free Tide Compact), never visited before this session

## Hypothesis and ambition

**Milestone hypothesis:** A commander can learn a never-visited settlement's garrison, population, and fortification before sailing, from a dated officer survey, and cannot recover the live truth any other way.

**Player ambition:** The same ambition as [informed-commitment-001](informed-commitment-001.md). Pick a hostile settlement never visited. Decide *before sailing* whether the attack is worth committing to, this time from an officer's targeted survey rather than from the opening rumor. Sail and attack, and change the plan if contact contradicts the report. Then try, deliberately, to recover the true fortification, population, and garrison of a settlement that still has no survey.

**Success signal:** The officer's report names population, fortification, and garrison with a source and a tick before any voyage. The commitment is justified from those numbers. Varying the commander's own strength, comparing an unsurveyed port, and reading the forecast text do not recover a later live garrison. Contact is allowed to disagree with the report.

## Adaptive decision log

| Tick | Player-visible observation | Reasoning | Action | Outcome |
| ---: | --- | --- | --- | --- |
| 0 | `cinder-key` rumor, confidence 0.28, age 16, `observedTick` −16, garrison 96, population null, fortification null, ground null. Forecast `contested`, win 56.789–86.29, defender 47.6–150.2, factor "defensive ground remains poorly understood". Voyage 5 ticks, passage 15. `verdant-cay` is neutral: population null, fortification null, ground null, forecast null. Niko Wren (`character-03`) is already listed at Cinder Key; her knowledge is null | The rumor is the same uninformed band as the first session. An officer of the faction is standing on the port the ambition cares about. Ordering her is a player-visible choice: location is on the character list | `issue-order` explore, target `cinder-key`, priority 0.95 | Accepted as `command-00001`. The same tick: "Niko Wren considers the survey of Cinder Key complete" |
| 1 | Cinder Key population **6400**, fortification **1.16**, garrison **110**. `groundIntelligence` `faction-report`, observed tick 0, age 1. Intelligence confidence 0.99, source `faction-report`. Forecast still `contested`, win 55.17–73.431, defender 108.4–160.4, attacker 197.4–299.6, factor "surveyed ground is 1 ticks old". Money 108, troops 80, power 248.522. Niko's knowledge still null. Verdant Cay still null ground | The defender floor jumped from 47.6 to 108.4 once the walls were in the record. Attacker floor 197.4 still clears defender ceiling 160.4. The outlook stayed `contested`, which is the opposite of the first session's headline getting more aggressive as the rumor aged | `recruit`, to move own strength and test whether the defender band hides a wall | Accepted as `command-00002` |
| 2 | Troops 88, power 262.037, money 12. Attacker 208.2–315.9. Defender 106.5–161.8, still centred near 134. Cinder Key garrison still 110, fortification still 1.16, ground age 2, confidence 0.97. Outlook still `contested` | The attacker half moved with party power. The defender centre did not. There is no equation that solves for a hidden wall, and the wall is already printed as 1.16 | `survey` of Crown Harbor, then `survey` aimed at Cinder Key while still at Crown Harbor | HTTP 400 `faction-held`: "Crown Harbor is already held by the commander's faction; its ground is on the faction's own record". HTTP 400 `not-here`: "A survey examines the settlement the character is standing in". Neither command was queued |
| 14 | Still at Crown Harbor. Money 12, troops 88, power 262.037. Cinder Key garrison still **110**, population 6400, fortification 1.16, ground age 14, confidence 0.82. Defender 89.6–175.4, attacker unchanged 208.2–315.9, win 54.275–77.904, outlook `contested`, factor "surveyed ground is 14 ticks old". Verdant Cay garrison 61, population null, fortification null, ground null, forecast null | Twelve ticks of aging widened the band and did not change the recorded garrison. Attacker floor 208.2 still clears defender ceiling 175.4, so the walls are included and the sail is still justified. The passage quote is 15 and the purse is 12 | `travel` to Cinder Key | Accepted as `command-00003` despite the short purse |
| 19 | Standing on Cinder Key. Money 0. Population 6400, fortification 1.16, garrison **94**. `groundIntelligence` `direct-observation`, observed tick 19, age 0. Forecast `favored`, win 60.156–76.899, defender 94.9–137.9, factors include "defensive ground estimated near 1.13×" and "battle variance constrained by strategy 72" | Contact matches the report on walls and population and contradicts it on the garrison (110 against 94), in her favour. The 1.13× sits beside the panel's 1.16 | Stay one tick and read the beach again | Tick 20: same figures, garrison still 94, the 1.13× factor still there |
| 20 | Same beach. Forecast still `favored`, retreat low, capture low. The report was not wrong about the thing the first session could not see | The contradiction is the garrison, and it moved in her favour. No reason to abandon the commitment | `raid` | `battle-002335` opened. Session stopped on purpose at the end of phase 1 |

## Outcome

Mara did not sail on the rumor. She ordered the officer who was already at Cinder Key, and one tick later the panel named the population, the walls, and a garrison, with a source and an age. Recruiting moved her own power and left the recorded wall at 1.16. After the record had aged fourteen ticks the attacker floor still cleared the defender ceiling, so she sailed. The beach agreed about 6400 people and walls of 1.16, and disagreed about the garrison: 94 standing there, against 110 on the report. She raided. Phase 1 went to her (attacker losses 3, defender losses 18, garrison 94 to 76, outlook of the phase `attacker-advantage`, retreat low, capture low). The battle was left there. The hypothesis is the commitment, and contact had not contradicted the walls.

Verdant Cay was polled at every stop and never grew a population, a fortification, a ground record, or a forecast.

## Evidence review

- **World report:** The recovered world reached tick 21 (day 3.5) with state hash `c3cbc1902ec67cd0bc760ceb1d54b272a6a80c4870cddef742d95ccdd4deb84b`. 29 autonomous characters and 1 human. 2,446 persisted events across 5 snapshots. 124 journeys, 99 market trades, 2 completed battles, 3 retreats, 0 captures. 4 player commands accepted and 4 resolved, 0 command failures in the log. The two survey rejections were HTTP 400 and never became events. 1 major battle still active (`battle-002335`, phase 1 of 3, started tick 20, attacker initial troops 88, defender initial garrison 94). 0 player messages. Report and map at `simulation-output/playtests/informed-commitment-002/`.
- **Metrics:** The report's faction table, which matches the tick-20 metrics row, has World Government at 2,344.68 power, 18,392.18 treasury, and 2 settlements, and Free Tide Compact at 1,023.45 power, 2,892.37 treasury, and 1 settlement. Rival power was not on the player API during the session. Mara's party power in the end report is 255.495, after the phase-1 loss of 3 troops (88 to 85). Her health is 98 and her morale is 96.65.
- **Map:** Generated from the recovered world. Cinder Key did not change hands.
- **Decision/agency traces:** 74 plan reviews and 139 direct knowledge updates. 28 plan-time order assessments, 15 accepted and 6 refused. 13 deviations, 13 resumptions, 11 completion reports, 0 issuer confirmations. 2 goals reshaped and 21 relationship changes.
- **The report event:** Tick 0, sequence 28, `knowledge-updated` on Mara, reason `explore-report`, source `faction-report`, garrison 110, population 6400, fortification 1.16, ground observed tick 0. It is the only `explore-report` in the log. Niko completed a second Cinder Key survey at tick 8 (her seeded order, which has no target). That completion did not write a second report. Ada Sorn completed a survey of Verdant Cay at tick 4. Mara's Verdant Cay entry still has no ground.
- **Arrival:** `travel-started` tick 14, Crown Harbor to Cinder Key, 5 ticks. Progress on ticks 14 through 18. `arrived` tick 18. The arrival `knowledge-updated` (reason "arrival observation") set garrison 94 and kept `ground.observedTick` at 0. While she was standing there the panel showed present-tense ground, not that stored tick. The post-battle update at tick 20 set garrison 76 and still kept the survey's ground tick.
- **Conversation traces:** No player messages were sent.
- **Recovery and determinism:** The latest snapshot is tick 18 at sequence 2086. Recovering the world replays the remaining 360 events (2,446 − 2,086) to the hash above. It differs from the headless gate hash because four player commands changed history.

### The adversarial redaction result

The claim under test is the one from the first session, narrowed to what a survey is supposed to change. A commander who has not visited a settlement, and who has not received a survey of it, still cannot recover its population or fortification. A commander who has received a survey can read the record, and that record is not a live feed. **The player could not recover the beach garrison from the remote panel, and the unsurveyed port stayed null.**

| Approach | Behaviour | Verdict |
| --- | --- | --- |
| Invert the forecast by varying own strength | Recruiting moved power 248.522 → 262.037 and the attacker band 197.4–299.6 → 208.2–315.9. The defender band stayed centred near 134 and only widened as the report aged (108.4–160.4, then 106.5–161.8, then 89.6–175.4). The fortification was already on the panel as 1.16 | Closed. No hidden wall to solve for. The later live garrison, 94, is not in the remote panel, which stayed 110 until landing |
| Compare a second settlement that was never surveyed | Verdant Cay stayed population null, fortification null, ground null, and forecast null at every poll, including after Ada Sorn's untargeted survey completion | Closed. An explore with no target delivered nothing |
| Mine textual fields | Remote factors named confidence, the commander's own discipline (76%), and the survey age. They did not quote 1.16 or 6400. The "1.13×" line appeared only once she was standing there | Closed while offshore. The 1.13× is the old skill-scaled local factor, newly sitting next to an exact 1.16 |
| Look for a non-null field that should be unknown | On Cinder Key before the report, population and fortification were null. After the report they were the dated record. On Verdant Cay they stayed null. Niko's projected knowledge stayed null, and no other character's knowledge was visible | No leak of another character's map. The surveyed garrison is a record, which the beach then disagreed with |

## Findings

### What worked

- **The decision existed at tick 1, and it used the walls.** The rumor invited a raid: defender floor 47.6, ground "poorly understood", win floor 56.789. The officer report put the defender floor at 108.4, named walls 1.16 and population 6400, and kept the outlook `contested`. She sailed because attacker floor 208 cleared the defender ceiling (160 fresh, 175 after twelve ticks), which is a comparison the rumor could not support. Its ceiling of 150 sat on a floor of 47.
- **Aging told the truth about width and did not refresh the record.** From tick 1 to tick 14 the garrison figure stayed 110, confidence fell 0.99 → 0.82, and the factor changed from "1 ticks old" to "14 ticks old". The win floor moved 56.789 → 55.17 → 56.27 → 54.275. The first session watched a band widen for 33 ticks before a commitment. Here the commitment was available immediately, and waiting mostly spent uncertainty.
- **Contact checked the record instead of replacing it silently.** Population and fortification matched. Garrison did not (110 reported, 94 on the beach, 76 after phase 1). The stored ground tick stayed 0 through arrival and through the battle update.
- **The hiding around the channel held.** One issuer-only `explore-report`. Untargeted completions wrote none. Character knowledge projections stayed null. Verdant Cay stayed unknown.

### Does commitment improve, or was the uncertainty carrying the tension?

Commitment improved in accuracy and got less tense. The uncertainty was carrying a lot of the tension, and the survey spent it.

The first session's drama was a widening band and a headline that got more aggressive as the report got worse. This session's drama was a quieter yes. She could see the walls, compare them with her own floor, and go. If the walls had been heavier, this is the report that would have talked her out of the raid. They were not, so the improvement shows up as a better-justified yes, not as a reversal. What tension remains is the garrison moving during the voyage (reported 110, beach 94, in her favour) and a win floor still near 54%. The attack was not finished and the port was not claimed. Those are not evidence that the commitment was right, only that the beach did not contradict the walls she had already accepted.

### Implementation defects

None observed in the survey channel. The report reached only the issuer, carried the officer's present observation, kept its tick when she arrived, and the remote forecast did not follow later truth. The four items below felt wrong in play. They are older than this slice, or they are the record being easy to misread, and they were not changed in the session.

- **On the beach the panel says fortification 1.16 and the forecast says "defensive ground estimated near 1.13×".** Same island, two numbers. The 1.13× is the pre-existing skill scaling (`1 + (1.16 − 1) × (0.35 + 0.72 × 0.65)`), newly visible beside a figure the survey made exact.
- **The opening rumor prints `intelligence.observedTick` of −16, and Verdant Cay prints −11.** A tick before the world. Settlement intelligence does not floor `observedTick` the way the commander's own knowledge list does. The survey's own `groundIntelligence.observedTick` was 0.
- **Travel was accepted with 12 money against a quoted passage of 15.** The purse was 0 on arrival. The charge is `min(money, 3)` per sea tick, so the boundary does not refuse a short purse. She had recruited before comparing the purse with the quote.
- **The JSON garrison stays 110 while confidence decays and the forecast widens.** Age lives on `intelligence.ageTicks` and `groundIntelligence.ageTicks`. A reader who looks only at `garrison` will think the island still has 110 troops. The beach then disagrees. That is the design, and it is easy to misread.

### Design risks and opportunities

- **Picking an officer who is already there makes the voyage optional.** Niko completed on the same tick the order was issued. The commander's own action slot was free; she recruited on the next tick. The spec says the delivery is the officer's present observation, so this is allowed. It is also a way to skip the cost the hypothesis described as "paying for a survey".
- **Characters, parties, and factions are still unread.** Free Tide's power was in the report after the session and on no player panel during it.
- **A frozen garrison can be mistaken for a promise.** Twelve ticks offshore, the number did not move, and the island's garrison did.

### Follow-up experiments

- Order an officer who is not already at the target, and see whether the voyage, the refusal, and the deviation are what the player actually waits on.
- Put a heavier wall on the surveyed port and see whether the same commander declines.
- Label the remote garrison with the ground age in the same place as the number, then ask a player to say whether 110 is the island or the record.
- Finish or decline the phase-1 battle in a later session. This one stopped when contact had checked the walls.

## Recommendation

`REVISE`

The slice holds. She decided from a dated report of a port she had never visited, the inversion protocol did not recover the beach, and contact confirmed the walls and the population. Golden history was not involved in this session; the gate on the candidate commit kept the three hashes byte-identical, and this playtest is not a reason to regenerate them.

`REVISE` is about the reading, not the channel. The garrison figure sits still while the island moves, and the beach then offers 1.16 and 1.13× for one fortification. An officer already on the island also completes before the order has cost anyone a voyage. None of that is a leak. It is why this session does not promote the ambition to "the player now knows the port."

This recommendation is for the playtest. It is not a merge, and this branch was not opened as a pull request.
