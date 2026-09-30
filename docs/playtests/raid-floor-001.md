# Playtest: the raid floor

## Session

- **Candidate commit:** `504996c`
- **Date:** 2026-09-29 UTC
- **Operator:** The implementing agent, Open Era Engineer, a Cursor cloud agent. This was not a fresh-context operator. The agent had already read the repository and written the surrender slide. During the session every decision was taken from the dashboard HTTP JSON (`GET /api/state`, `POST /api/commands`, `POST /api/advance`). The database, the event log, and the world report were opened only after the session stopped, for this evidence review.
- **Interface:** Dashboard over HTTP, JSON API only for every decision. Server `127.0.0.1:4371`, database `simulation-output/playtests/raid-floor-001/dashboard.sqlite`, started with `--seed 1847 --reset`.
- **Seed:** `1847`
- **Starting tick:** `0`
- **Ending tick:** `100` (day 16.7)
- **Player character:** Mara Vane (`character-01`, World Government), starting at Crown Harbor with 108 money. She did not fight and she did not survey.

## Hypothesis and ambition

**Milestone hypothesis:** Glassport changes hands once, without the commander fighting, and offshore she still cannot read its live garrison or its surrender.

**Player ambition:** Leave Glassport to the neighbours. Survey nothing there. At tick 90, read it from Crown Harbor, then sail and read the beach.

**Success signal:** The remote panel shows an estimate or a null ground. On the beach the holder is no longer unowned World Government. The log has one `settlement-claimed` for `glassport`, the `battle-resolved` that carried `surrender`, and no later raid. Remote `surrender` is null.

## Adaptive decision log

| Tick | Player-visible observation | Reasoning | Action | Outcome |
| ---: | --- | --- | --- | --- |
| 0 | At Crown Harbor. Glassport is own-faction: garrison **155**, population 10500, fortification 1.22, stability 86, `ownerId` null, `surrender` null, `surrenderOffered` false, intelligence exact, source `owned`. Ground source `owned`. Voyage **4** ticks, passage **12**. Cinder Key is a rumor: garrison ~96, population null, fortification null, ground null, `surrender` null | Glassport is still her faction's port, so the live garrison is hers to read. The ambition is to leave it alone and look again at tick 90 | Advance, no survey, no raid | Stayed at Crown Harbor. Money stayed 108 |
| 10–80 | Glassport stays exact and `owned`. Garrison 155 → 150 → 113 → 62 → 54, then 54 at ticks 40, 50, 60, 70, and 80. Population 10500 and fortification 1.22 throughout. `surrender` null. `ownerId` null | The neighbours are wearing the garrison down and the panel can still say so, because the faction has not changed. Nothing to order | Advance | No command queued |
| 90 | Still at Crown Harbor. Money 108. Glassport is no longer exact. Garrison **143**, source `faction-report`, confidence **0.18**, `garrisonIntelligence` observed tick 0, age **104**. Population **null**, fortification **null**, ground **null**, stability null. `factionId` still reads `world-government`. `ownerId` null. `surrender` **null**. `surrenderOffered` false. Cinder Key is now exact World Government, `ownerId` `character-03`, garrison 13, population 6400, fortification 1.16, `surrender` null | The 143 cannot be the beach she is about to see if the port has actually fallen: the ground is gone and the confidence has collapsed. The faction label has not moved. The quote is still 12, and she holds 108. Cinder Key's new owner is visible because that port is her faction's now, and she did not fight for it | `travel` to Glassport | HTTP 202 `command-00001` |
| 91–93 | Underway. Location null. Money 105, then 102, then 99. Glassport unchanged offshore: garrison 143, ground null, `surrender` null, faction label still `world-government` | The passage is charging 3 a tick, as quoted. The remote panel does not update while she sails | Advance | — |
| 94 | Standing on Glassport. Money **96** (108 − 12). Faction **free-tide**. Garrison **11**, population 10500, fortification 1.22, stability **55.18**. Intelligence present, source `direct-observation`, confidence 1. `surrender` null. `surrenderOffered` false. `ownerId` still null | The beach is Free Tide, not unowned World Government. The offshore 143 and the World Government label were a stale report. 11 and 55 are a port that has already been claimed. The personal owner is not on the panel | Stay and read | No further command |
| 100 | Same beach. Garrison 11, stability 55.36, faction free-tide, `surrender` null, `surrenderOffered` false, `ownerId` null. Forecast `decisive-advantage`, defender 24.1–35, factor "defensive ground is 1.22×, skill-scaled". Cinder Key still World Government, owner `character-03`, garrison 13 | Nothing new has been offered, and the garrison has not moved | Session end | Final tick 100 |

## Outcome

Mara did not survey Glassport and did not raid it. She watched her faction's garrison fall from 155 to 54 and hold there through tick 80. At tick 90 the same panel had stopped being an owned record: population and fortification were null, the ground was null, the garrison was a faction-report of 143 at confidence 0.18, and `surrender` was null, while the faction label still said World Government. She sailed the quoted passage of 12 and landed at tick 94. The beach was Free Tide, garrison 11, stability 55.18, climbing to 55.36 by tick 100. No surrender was offered to her, offshore or on the beach. Cinder Key, which she also never fought, was already World Government under `character-03`.

## Evidence review

- **World report:** The recovered world reached tick 100 (day 16.7) with state hash `f1e9e0a1901412f323bec6f4163bff788cda58ff90383ae9a678fc04614c856b`. 29 autonomous characters and 1 human. 11,627 persisted events across 18 snapshots. 451 journeys, 507 market trades, 9 completed battles, 7 retreats, 0 captures. 1 player command accepted and 1 resolved, 0 failures. 0 player messages. Report and map at `simulation-output/playtests/raid-floor-001/`.
- **Metrics:** World Government 2,274.03 power, 20,807.57 treasury, 2 settlements. Free Tide Compact 1,009.08 power, 3,256.8 treasury, 1 settlement. Mara's party power in the end report is 235.783, record 0–0. Rival power was not on the player API during the session.
- **Map:** Generated from the recovered world. Glassport is Free Tide. Cinder Key is World Government.
- **The Glassport log:** One `settlement-claimed`, tick 87, actor Pax Ash (`character-14`, Free Tide), garrison 11, stability 55, previous faction World Government, previous owner null. The `battle-resolved` that carried `surrender` is tick 86, Pax Ash, attacker victory, garrison 11, stability 42.46, `offeredToId` `character-14`, one phase. The claim is the next tick. No `decision-made` raid or claim for Glassport after tick 87. End state: owner Pax Ash, faction Free Tide, garrison 11, stability 55.36, surrender null.
- **Cinder Key:** One `settlement-claimed`, tick 70, Niko Wren (`character-03`, World Government), garrison 13, stability 55, previous faction Free Tide. End state garrison 13, stability 55.87, still that owner. Verdant Cay stayed independent (garrison 70, stability 81, owner null). Crown Harbor stayed World Government, owner null, garrison 231.
- **Decision/agency traces:** 270 plan reviews and 588 direct knowledge updates. 40 plan-time order assessments, 14 accepted and 6 refused. 26 deviations, 25 resumptions, 13 completion reports, 0 issuer confirmations. 9 goals reshaped and 206 relationship changes.
- **Conversation traces:** No player messages were sent.
- **Recovery and determinism:** The latest snapshot is sequence 11,141. Recovering the world replayed 486 events to the hash above. It differs from the headless gate hash because one player voyage changed history.

## Findings

### What worked

- **Glassport changed hands once, and Mara did not fight.** The only Glassport claim is Pax Ash at tick 87, on the surrender his tick-86 victory wrote (11 / 42.46). That is the blow the slope-10 line was measured to contain. No later raid was chosen while the garrison stayed at 11.
- **Offshore, the live garrison and the offer were not on the panel.** At tick 90 she read 143, confidence 0.18, ground null, `surrender` null. The beach at tick 94 was garrison 11 and Free Tide. The 143 was the old faction report, not the wall she was sailing toward.
- **Cinder Key also took one owner.** Niko Wren at tick 70, garrison 13, and the panel at tick 90 already showed that owner because the port had become her faction's. She issued no order toward it.
- **The passage quote was the charge.** 4 ticks, 12 money, 108 down to 96.

### Implementation defects

None observed in the surrender slide. The remote `surrender` stayed null. The beach did not offer her a second surrender. The personal owner of a foreign port is still `ownerId: null` on the panel, including while she is standing there; the log is what names Pax Ash. That withholding is older than this milestone.

### Design risks and opportunities

- **The offshore faction label lagged the beach.** From tick 90 through 93 the panel still said `world-government` for a port the log had already given to Free Tide at tick 87. Population and fortification had already gone null, which is the signal that the owned record had ended. A commander who read only the faction id would have sailed toward the wrong flag.
- **The garrison age and the displayed tick do not describe the same moment.** At tick 90 `garrisonIntelligence.observedTick` was 0 and `ageTicks` was 104. That is the existing floor on a backdated seed report: the shown tick is clamped, and the age is counted from the raw tick. It was not introduced here.

### Follow-up experiments

- Seed 2718, below, is the confirmation the note asked for. A headless tick-400 check is what the golden window does not cover; the three-seed 400-tick goal test stayed green and does not assert ownership.

## Confirmation

Seed **2718**, same ambition, stopped after tick 50. Dashboard `127.0.0.1:4372`, database `simulation-output/playtests/raid-floor-001/dashboard-2718.sqlite`, `--seed 2718 --reset`. Mara Vane, Crown Harbor, no commands, no survey. Ending tick 50, state hash `5384774c489c3b8f66e3b756e2e7e40b247b8c363d8cdece6fd685ee68630416`, 5,859 events, 9 snapshots, recovery replayed 234 events.

She stayed at Crown Harbor. Glassport was exact and owned through tick 40 (garrison 35, `surrender` null). At tick 45 it had flipped: garrison **138**, source `faction-report`, confidence 0.3, population null, ground null, `surrender` null, faction label still `world-government`. At tick 50 the figure was still 138, confidence 0.28, `surrender` null. Cinder Key was already exact World Government at tick 35, owner `character-09`, garrison 13, `surrender` null.

The log, opened after the session: one Cinder Key claim at tick 32, Orin Rill (`character-09`, World Government), garrison 13, stability 55. One Glassport claim at tick 41, Dax Pike (`character-20`, Free Tide), garrison 10, stability 55. The surrender is on Dax Pike's tick-40 victory, garrison 10, stability 32.08. No later raid or claim in the window. End state: Glassport Free Tide, Dax Pike, garrison 10, stability 55.24; Cinder Key World Government, Orin Rill, garrison 13, stability 55.51. Faction power at tick 50: World Government 2,322.35, Free Tide 1,100.02.

Both ports kept one owner. The offer was not on the remote panel.

## Recommendation

`PROMOTE`

Glassport took one owner on seed 1847 without the commander fighting, and the offshore panel at tick 90 did not show the live garrison or a surrender. The beach was Free Tide. Seed 2718, read from Crown Harbor through tick 50, shows the same shape one claim earlier: Dax Pike holds Glassport, Orin Rill holds Cinder Key, and the remote surrender is null. No second claim on either port in either window.
