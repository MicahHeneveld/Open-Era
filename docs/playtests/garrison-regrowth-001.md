# Playtest: garrison regrowth

## Session

- **Candidate commit:** `4ad3867`
- **Date:** 2026-09-29 UTC
- **Operator:** The implementing agent, Open Era Engineer, a Cursor cloud agent. This was not a fresh-context operator. The agent had already read the repository and written the regrowth rule. During the session every decision was taken from the dashboard HTTP JSON (`GET /api/state`, `POST /api/advance`). No command was sent. The database, the event log, and the world report were opened only after the session stopped, for this evidence review.
- **Interface:** Dashboard over HTTP, JSON API only. Server `127.0.0.1:4317`, database `.open-era/playtests/garrison-regrowth.sqlite`, started with `--seed 1847 --reset`.
- **Seed:** `1847`
- **Starting tick:** `0`
- **Ending tick:** `150` (day 25)
- **Player character:** Mara Vane (`character-01`, World Government), starting at Crown Harbor with 80 troops and 108 money. She did not fight and she did not survey.

## Hypothesis and ambition

**Milestone hypothesis:** Cinder Key changes hands a second time because its garrison climbed through 15, and offshore she still cannot read that live garrison.

**Player ambition:** Leave the neighbours to fight. Survey nothing. At tick 150, read both ports from Crown Harbor.

**Success signal:** The log has two `settlement-claimed` events for `cinder-key` (measured ticks 70 and 139) and an upkeep between them at garrison 15 or more. Glassport has one claim; its rearm is tick 228, outside this session. From Crown Harbor the panel shows an estimate or a null ground, and Crown Harbor itself is still unowned World Government.

## Adaptive decision log

| Tick | Player-visible observation | Reasoning | Action | Outcome |
| ---: | --- | --- | --- | --- |
| 0 | At Crown Harbor. Crown Harbor is own-faction and present: garrison **260**, population 18000, fortification 1.35, stability 91, `ownerId` null, `surrender` null. Glassport is own-faction and exact, not present: garrison **155**, population 10500, fortification 1.22, stability 86, tax 0.14. Cinder Key is a rumor: garrison ~96, confidence 0.28, age 16, population null, fortification null, ground null, faction label `free-tide`, tax 0.08, `surrender` null. Verdant Cay is a rumor: garrison ~61, ground null, forecast null | The ambition is to leave both ports alone and read them again at tick 150. Nothing here is a reason to sail or to survey | Advance, no survey, no raid | Stayed at Crown Harbor. Troops stayed 80 |
| 70 | Still at Crown Harbor, troops 80. Crown Harbor garrison **236**, stability 90.01, `ownerId` null. Glassport still exact and owned: garrison **56**, population 10500, fortification 1.22. Cinder Key unchanged as a rumor: garrison ~96, age 86, confidence 0.11, ground null, faction label still `free-tide`, tax still 0.08, `surrender` null. Verdant Cay still ~61 | The neighbours are wearing Glassport down and the panel can still say so, because the faction has not changed. Cinder Key has not moved on the panel. This read is the world at tick 70, before that tick's events | Advance | No command queued |
| 100 | Still at Crown Harbor. Cinder Key is now an owned record: faction `world-government`, `ownerId` `character-03`, garrison **14**, population 6400, fortification 1.16, intelligence exact. She did not sail and she did not survey | The port became her faction's, so the live garrison is the faction record. 14 is under the raid gate she already knows. It is not a rumor | Advance | No command queued |
| 124 | Still at Crown Harbor. Glassport is no longer exact. Garrison **143**, source `faction-report`, age 138, confidence 0.11, population null, fortification null, ground null, `surrender` null. Faction label still `world-government`. Tax **0.08**. Verdant Cay still ~61, ground null | The 143 is a stale report: the ground is gone. The tax moved from 0.14 to 0.08, which is the other faction's rate, while the label did not. The garrison figure itself did not become a live beach | Advance | No command queued |
| 139 | Still at Crown Harbor. Crown Harbor garrison **192**, `ownerId` null. Cinder Key still owned: `ownerId` `character-03`, garrison **7**, population 6400, fortification 1.16, stability 45.04, tax 0.14. `surrender` is present, offered to `character-19` at tick 138, `surrenderOffered` false. Glassport still the faction-report of 143, ground null, tax 0.08 | She can read Cinder Key because her faction holds it, including an offer that is not addressed to her. Glassport's garrison has not updated | Advance | No command queued |
| 150 | Still at Crown Harbor. Money was not on this poll; the end report has 108. Crown Harbor garrison **172**, population 18000, fortification 1.35, stability 83.2, `ownerId` null, faction `world-government`, `surrender` null. Cinder Key is a rumor again: garrison **~96**, confidence 0.08, age 166, population null, fortification null, ground null, faction label `free-tide`, tax 0.08, `ownerId` null, `surrender` null. Forecast `contested`, win 50.333–90.435, factor "defensive ground remains poorly understood". Glassport garrison **143**, faction-report, age 164, confidence 0.08, population null, fortification null, ground null, faction label still `world-government`, tax 0.08, `surrender` null. Verdant Cay garrison ~61, age 161, ground null | The tick-150 read is the one the ambition named. Neither remote port shows a live garrison or a ground record. Crown Harbor is still unowned World Government | Session end | Final tick 150. No command was ever queued |

## Outcome

Mara did not survey and did not raid. She stood at Crown Harbor for 150 ticks. At tick 70 Cinder Key was still the opening rumor. By tick 100 it was her faction's port under Niko Wren, garrison 14, which she could read because an owned record is live. At tick 139 that record showed garrison 7 and a surrender offered to someone else. At tick 150 the owned record was gone: Cinder Key was again the rumor of 96, with no population, no fortification, and no ground, and Glassport was a faction-report of 143 with no ground. Crown Harbor was still unowned World Government, garrison 172. She never saw a second live garrison for a port her faction did not hold.

## Evidence review

- **World report:** The recovered world reached tick 150 (day 25) with state hash `88404770d2d65f3235392a3f9499f1a25fd1b4855f654da909bf4bc57be3809d`. 29 autonomous characters and 1 human. 17,505 persisted events across 26 snapshots. 638 journeys, 797 market trades, 14 completed battles, 10 retreats, 1 capture, 0 escapes. 0 player commands and 0 player messages. Report and map at `simulation-output/playtests/garrison-regrowth-001/`.
- **Claims:** Three `settlement-claimed` events. Cinder Key at tick 70, Niko Wren (`character-03`, World Government), garrison 13. Glassport at tick 98, Zara Gale (`character-17`, Free Tide), garrison 8. Cinder Key at tick 139, Esme Dusk (`character-19`, Free Tide), garrison 7. No other claims. That is two Cinder Key claims and one Glassport claim, not a claim on every tick.
- **The crossing:** Between those Cinder Key claims, `settlement-upkeep` first reaches garrison 15 at tick 124, with `shortage` 0. It stays 15 through tick 138. Esme Dusk's raid is tick 138. The next Cinder Key upkeep at 15 after tick 139 is not inside this session. A headless 250-tick run of the same seed, checked after the session, puts Glassport's first later upkeep at garrison 15 on tick 228, which is the rearm the note measured and which this session does not reach.
- **End state, from the report, not from the panel:** Cinder Key is Free Tide, owner `character-19`, garrison 7. Glassport is Free Tide, owner `character-17`, garrison 10. Crown Harbor is World Government, owner null, garrison 172. Verdant Cay is unowned, garrison 75. The tick-150 panel still showed Verdant Cay at ~61.
- **Metrics:** World Government 2,223.13 power, 22,232.71 treasury, 1 settlement. Free Tide Compact 1,058.87 power, 3,589.56 treasury, 2 settlements. Mara's party power is 218.798, record 0–0, money 108. Her hold's provisions are 0, her morale is 0, and her health is 59.663. Rival power was not on the player API during the session.
- **Map:** Generated from the recovered world. She is still at Crown Harbor.
- **Decision/agency traces:** 394 plan reviews and 861 direct knowledge updates. 40 plan-time order assessments, 14 accepted and 6 refused. 26 deviations, 26 resumptions, 14 completion reports, 0 issuer confirmations. 14 goals reshaped and 339 relationship changes.
- **Conversation traces:** No player messages were sent. The report counts 0 autonomous replies.
- **Recovery and determinism:** Tick 150 is a snapshot boundary, so recovering the world replayed 0 events after the latest snapshot and reproduced the hash above. The milestone gate's split recovery is the check that replays a tail; this session does not.

## Findings

### What worked

- **Cinder Key changed hands twice, and the ticks are the measured ones.** Niko Wren at tick 70 from garrison 13, then Esme Dusk at tick 139 from garrison 7. The upkeep between them hits 15 at tick 124. Glassport changes hands once, at tick 98, and is not claimed again before tick 150.
- **At tick 150 the remote garrisons are not live.** Cinder Key is the opening rumor of 96, age 166, ground null. Glassport is a faction-report of 143, age 164, ground null. The beaches are 7 and 10. Verdant Cay's panel stays ~61 while the island is at 75.
- **Crown Harbor stays unowned World Government.** Raiders hit it. The garrison she can see, because she is standing there, falls from 260 to 172. `ownerId` stays null.
- **Claims are not a revolving door.** Three claims in 150 ticks.

### Implementation defects

None observed in the regrowth rule. The second claim follows an upkeep at 15, and the tick-150 panel does not show the live garrison of a port her faction does not hold.

Two older readings showed up again and were not changed:

- **While her faction holds Cinder Key, the offshore panel is the live garrison.** At tick 100 it was 14, and at tick 139 it was 7, with the surrender object visible and `surrenderOffered` false. That is the owned-record rule. It closed again when Free Tide took the port.
- **Glassport's tax became 0.08 while the faction label stayed `world-government` and the garrison stayed 143.** The tax is the true holder's rate. The label and the garrison are the stale report. A reader can infer that the holder changed without learning the live garrison.

### Design risks and opportunities

- Standing still emptied the hold. By tick 150 morale is 0 and health is 59.663, with 80 troops still aboard and 108 money untouched. The ambition was to issue no command. The provisioning warning is the existing one; this session did not act on it.
- Crown Harbor was fought over while she watched the exact garrison fall. One capture is in the log, at Crown Harbor, and it was not hers.
- The owned window between tick 70 and tick 139 is the period in which a commander of the new faction can see the regrowth without sailing. A rival commander would still have the rumor. This session is the owning side for that interval, and the not-owning side at tick 150.

### Follow-up experiments

- Read Cinder Key at tick 150 as a Free Tide commander, who never held it, and confirm the panel is still the rumor.
- Stay through tick 228 and read Glassport again when the note says it is raidable. This session stopped at 150, with one Glassport claim.

## Recommendation

`PROMOTE`

The second Cinder Key claim is in the log, at tick 139, after an upkeep at garrison 15 on tick 124. At tick 150, from Crown Harbor, neither remote port shows a live garrison or a ground record, and Crown Harbor is still unowned World Government. Claims did not arrive every few ticks.
