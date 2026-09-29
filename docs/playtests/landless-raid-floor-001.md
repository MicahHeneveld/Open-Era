# Playtest plan: landless raid floor

This is the plan for a blind operator. It is not a completed session. Do not run it while writing the change. Do not open `src/`, `tests/`, the branch diff, or `docs/design/portless-recovery.md` during the session. Use only the dashboard HTTP JSON.

The raid-floor effect shows on seed 2718, inside the first 40 ticks. Seed 1847 does not show it until event tick 79, so 1847 is only the silent-order beat.

## Setup

- Node `v24.21.0` (`nvm use 24.21.0` if `node -v` is not that). `npm ci` first if `node_modules` is missing.
- The player is Mara Vane, `character-01`, `playerId` `prototype-player`. Do not pass another character. This plan sends no commands.
- Read state with `GET /api/state?limit=200`. Omit `beforeSequence` on the first read. The next older page is `GET /api/state?limit=200&beforeSequence=<eventPage.cursor>`.
- Advance with `POST /api/advance`. `ticks` must be an integer from 1 to 144.
- `tick` on an event is the tick the world was on while that event was written. `tick` on the state is one ahead of the events just applied.

Two sessions. Stop the dashboard between them.

## Session A — a silently closed order

**Start:** `npm run dashboard -- --reset --seed 1847` on `http://127.0.0.1:4317`.

`GET /api/health` is HTTP 200 `{"ok":true,"tick":0,"events":0}`.

**Hypothesis.** An order Mara never signs closes itself, and the card does not call that a confirmation.

**Ambition.** Send no commands. Advance to state tick 7. Read Toma Reef's order.

### Advance to state tick 6

`POST /api/advance` with body `{"ticks":6}`. HTTP 200. `tick` 6. `ticksAdvanced` 6.

`GET /api/state?limit=200`.

- `tick` 6. `party.name` `Mara Vane`. `party.locationId` `crown-harbor`. `player.characterId` `character-01`.
- Toma Reef, `character-07`, order `character-01:order:character-07`: `status` `awaiting-confirmation`. `lastReport.kind` `completion`. `lastReport.tick` 0. `lastReport.summary` `Toma Reef reports the supply transaction at Cinder Key complete and requests confirmation.`

### Advance to state tick 7

`POST /api/advance` with body `{"ticks":1}`. HTTP 200. `tick` 7. `ticksAdvanced` 1.

`GET /api/state?limit=200`.

The first page holds sequences 626 through 825 (`eventPage.oldestSequence` 626, `eventPage.newestSequence` 825, `eventPage.count` 200, `eventPage.total` 825). Sequence 713 is on this page.

- Toma's order `status` `completed`. `lastReport.kind` `closed-unanswered`. `lastReport.tick` 6. `lastReport.summary` `Mara Vane did not answer Toma Reef's completion report within a day, and the order closed.`
- Sequence 713, event `tick` 6, `day` 1, `standing-order-completed`, `actorId` `character-01`, `targetId` `character-07`, `payloadWithheld` false, summary `Mara Vane did not answer Toma Reef's completion report within a day, and the order closed.` `data.orderId` `character-01:order:character-07`. `data.reason` `issuer-silent`. `data.summary` that same sentence. No `commandId` key.
- Sequence 714, `relationship-changed`, `actorId` `character-07`, `targetId` `character-01`, `payloadWithheld` true, `data` null, summary `Toma Reef: relationship changed`.
- `briefing.items` has no item whose `orderId` is `character-01:order:character-07`.

**Withheld here.** Sequence 714's relationship payload. Do not treat `data` null on that line as a failed run.

`PROMOTE` this session if Toma's card at state tick 7 has `lastReport.kind` `closed-unanswered` and the summary above, and sequence 713 has `data.reason` `issuer-silent`. `REVISE` if the kind is `confirmed`, or if the order is `completed` already at state tick 6. `ABANDON` if sequence 713 is absent.

## Session B — the landless raid floor

**Start:** `npm run dashboard -- --reset --seed 2718` on `http://127.0.0.1:4317`.

`GET /api/health` is HTTP 200 `{"ok":true,"tick":0,"events":0}`.

**Hypothesis.** Free Tide loses Cinder Key and takes it back the next day with 6 soldiers left, not 0. One Free Tide captain fights. The other three on that beach do not.

**Ambition.** Send no commands. Stay at Crown Harbor. Read the log and the Cinder Key panel at state ticks 36, 37, and 40.

The note's older playtest text put Vale Drake's loss and Mina Vale's raid on one tick and called the claim garrison 14. On this build Vale's battle is event tick 34, his claim is event tick 35, Mina's raid is that same claim tick, and her claim is event tick 36. The panel can show the 6 soldiers only while the port is still World Government.

### Advance to state tick 36

`POST /api/advance` with body `{"ticks":36}`. HTTP 200. `tick` 36. `ticksAdvanced` 36. `day` 6.

`GET /api/state?limit=200`.

- `tick` 36. `day` 6. `party.name` `Mara Vane`. `party.locationId` `crown-harbor`.
- First page: `eventPage.count` 200, `eventPage.total` 4268, `eventPage.oldestSequence` 4069, `eventPage.newestSequence` 4268, `eventPage.cursor` 4069, `eventPage.hasMore` true.
- Cinder Key, `cinder-key`: `factionId` `world-government`, `ownerId` `character-08`, `garrison` 6, `stability` 43. `intelligence.exact` true, `intelligence.present` false, `intelligence.source` `owned`, `intelligence.confidence` 1, `intelligence.observedTick` 36, `intelligence.ageTicks` 0. `garrisonIntelligence.source` `owned`, `garrisonIntelligence.observedTick` 36, `garrisonIntelligence.ageTicks` 0.
- Sequence 4182, event `tick` 35, `day` 5.83, `settlement-claimed`, `actorId` `character-08`, `targetId` `free-tide`, `settlementId` `cinder-key`, `payloadWithheld` true, `data` null, summary `Vale Drake: settlement claimed`.
- Sequence 4205, event `tick` 35, `day` 5.83, `battle-resolved`, `actorId` `character-15`, `targetId` `world-government`, `settlementId` `cinder-key`, `payloadWithheld` true, `data` null, summary `Mina Vale: battle resolved`.
- That is the only `battle-resolved` event with `settlementId` `cinder-key` and event `tick` 35.
- Sequence 4221, `decision-made`, `actorId` `character-19`, summary `Esme Dusk: decision made`, `payloadWithheld` true, `data` null. No `battle-resolved` for `character-19` at event tick 35.
- Sequence 4227, `decision-made`, `actorId` `character-20`, summary `Dax Pike: decision made`, `payloadWithheld` true, `data` null. No `battle-resolved` for `character-20` at event tick 35.
- Sequence 4232, `decision-made`, `actorId` `character-21`, summary `Mara Calder: decision made`, `payloadWithheld` true, `data` null. No `battle-resolved` for `character-21` at event tick 35.

Vale's battle is one page older. `GET /api/state?limit=200&beforeSequence=4069`.

- That page includes sequence 4060, event `tick` 34, `day` 5.67, `battle-resolved`, `actorId` `character-08`, `targetId` `free-tide`, `settlementId` `cinder-key`, `payloadWithheld` true, `data` null, summary `Vale Drake: battle resolved`.

### Advance to state tick 37

`POST /api/advance` with body `{"ticks":1}`. HTTP 200. `tick` 37. `ticksAdvanced` 1.

`GET /api/state?limit=200`.

- Sequence 4331 is on the first page. Event `tick` 36, `day` 6, `settlement-claimed`, `actorId` `character-15`, `targetId` `world-government`, `settlementId` `cinder-key`, `payloadWithheld` true, `data` null, summary `Mina Vale: settlement claimed`.
- Cinder Key is no longer an owned reading. `factionId` `free-tide`, `garrison` 131, `stability` null, `ownerId` null. `intelligence.exact` false, `intelligence.present` false, `intelligence.source` `rumor`, `intelligence.confidence` 0.11, `intelligence.observedTick` 0, `intelligence.ageTicks` 56.

The 131 and `free-tide` on that panel are the old rumor, not the port Mina just claimed. Do not read them as the live garrison or as proof of who holds it.

### Advance to state tick 40

`POST /api/advance` with body `{"ticks":3}`. HTTP 200. `tick` 40. `ticksAdvanced` 3.

`GET /api/state?limit=200`.

- Sequence 4331 is still the `settlement-claimed` line for Mina Vale at Cinder Key. No later `settlement-claimed` on `cinder-key` has replaced it.
- The Cinder Key panel stays the rumor: `intelligence.exact` false, `intelligence.source` `rumor`, `garrison` 131, `intelligence.observedTick` 0.

**Withheld in this session.** Every `decision-made`, `battle-resolved`, and `settlement-claimed` payload above. The action on Esme's, Dax's, and Mara Calder's decisions is not in the JSON. The garrison on Vale's claim, on Mina's battle, and on Mina's claim is not in the JSON. After state tick 36, the live garrison and the live holder of Cinder Key are not on the panel. Crown Harbor's own figures are not the checkpoint.

`PROMOTE` this session if state tick 36 shows Cinder Key exact, `factionId` `world-government`, `ownerId` `character-08`, `garrison` 6, and event tick 35 has exactly one `battle-resolved` on `cinder-key`, actor `character-15`, and event tick 36 has sequence 4331, Mina Vale's claim. `REVISE` if that garrison is 0, or if event tick 35 has more than one `battle-resolved` on `cinder-key`. `ABANDON` if state tick 40 has no sequence 4331.

## Recommendation

`PROMOTE` only if both sessions promote. `REVISE` if either session revises. `ABANDON` if either session abandons.

## Session / Findings

Blind session on Node v24.21.0, `npm ci`, dashboard `http://127.0.0.1:4317`. No commands were sent. The dashboard was stopped and started again between sessions. Readings below are the HTTP JSON. A field the plan did not name is listed only where it changes what a player would believe.

**Verdict: `PROMOTE`.** Session A promotes. Session B promotes. The tick-40 first page does not contain sequence 4331; that line is one page older and is still the latest `settlement-claimed` for Cinder Key, so the abandon test is not met.

### Session A — seed 1847 — `PROMOTE`

`lastReport.kind` at state tick 7 is `closed-unanswered`, the summary is the plan's sentence, and sequence 713 has `data.reason` `issuer-silent`. The order is still `awaiting-confirmation` at state tick 6. Sequence 713 is present.

| Checkpoint | Expected | Actual |
| --- | --- | --- |
| Health | HTTP 200 `{"ok":true,"tick":0,"events":0}` | HTTP 200 `{"ok":true,"tick":0,"events":0}` |
| `POST /api/advance` `{"ticks":6}` | HTTP 200, `tick` 6, `ticksAdvanced` 6 | HTTP 200, `"tick":6`, `"ticksAdvanced":6`. Also `"day":1`, `"eventSequence":704` |
| State tick 6, party | `tick` 6, `party.name` `Mara Vane`, `party.locationId` `crown-harbor`, `player.characterId` `character-01` | `"tick":6`, `"name":"Mara Vane"`, `"locationId":"crown-harbor"`, `"characterId":"character-01"` |
| Toma's order at state tick 6 | `status` `awaiting-confirmation`, `lastReport.kind` `completion`, `lastReport.tick` 0, summary `Toma Reef reports the supply transaction at Cinder Key complete and requests confirmation.` | `"status":"awaiting-confirmation"`, `"kind":"completion"`, `"tick":0`, `"summary":"Toma Reef reports the supply transaction at Cinder Key complete and requests confirmation."` |
| `POST /api/advance` `{"ticks":1}` | HTTP 200, `tick` 7, `ticksAdvanced` 1 | HTTP 200, `"tick":7`, `"ticksAdvanced":1`. Advance `day` is `1.1666666666666667`. The next state read says `"day":1.17` |
| State tick 7 page | oldest 626, newest 825, count 200, total 825; sequence 713 on this page | `"oldestSequence":626`, `"newestSequence":825`, `"count":200`, `"total":825`, `"cursor":626`, `"hasMore":true`. Sequences 713 and 714 are on the page |
| Toma's order at state tick 7 | `status` `completed`, `lastReport.kind` `closed-unanswered`, `lastReport.tick` 6, summary `Mara Vane did not answer Toma Reef's completion report within a day, and the order closed.` | `"status":"completed"`, `"kind":"closed-unanswered"`, `"tick":6`, `"summary":"Mara Vane did not answer Toma Reef's completion report within a day, and the order closed."` |
| Sequence 713 | event tick 6, day 1, `standing-order-completed`, actor `character-01`, target `character-07`, `payloadWithheld` false, that same summary, `data.orderId` `character-01:order:character-07`, `data.reason` `issuer-silent`, `data.summary` that sentence, no `commandId` | `"sequence":713,"tick":6,"day":1,"type":"standing-order-completed","actorId":"character-01","targetId":"character-07","summary":"Mara Vane did not answer Toma Reef's completion report within a day, and the order closed.","data":{"orderId":"character-01:order:character-07","reason":"issuer-silent","summary":"Mara Vane did not answer Toma Reef's completion report within a day, and the order closed."},"payloadWithheld":false`. No `commandId` on the event or in `data` |
| Sequence 714 | `relationship-changed`, actor `character-07`, target `character-01`, `payloadWithheld` true, `data` null, summary `Toma Reef: relationship changed` | `"sequence":714,"tick":6,"day":1,"type":"relationship-changed","actorId":"character-07","targetId":"character-01","summary":"Toma Reef: relationship changed","data":null,"payloadWithheld":true` |
| Briefing | no item whose `orderId` is `character-01:order:character-07` | The 11 briefing `orderId`s are `character-02` through `character-06` and `character-08` through `character-13`. Toma's id is absent |

Player-facing, session A. The card does not call the close a confirmation: the kind string is `closed-unanswered`, and the sentence says the order closed because Mara did not answer. The event type is still `standing-order-completed`, so a player reading types rather than sentences can take the close for a completion she signed. The briefing drops Toma's card with no replacement line. The other cards still say `"title":"Completion needs confirmation"`. Sequence 714 is only `Toma Reef: relationship changed` with `"data":null`. The relationship move has no reason and no amounts. That withhold is the one the plan allowed.

### Session B — seed 2718 — `PROMOTE`

State tick 36 shows Cinder Key exact, `factionId` `world-government`, `ownerId` `character-08`, `garrison` 6. Event tick 35 has exactly one `battle-resolved` on `cinder-key`, actor `character-15`. Event tick 36 has sequence 4331, Mina Vale's claim. The garrison is not 0. State tick 40 still has sequence 4331.

| Checkpoint | Expected | Actual |
| --- | --- | --- |
| Health | HTTP 200 `{"ok":true,"tick":0,"events":0}` | HTTP 200 `{"ok":true,"tick":0,"events":0}` |
| `POST /api/advance` `{"ticks":36}` | HTTP 200, `tick` 36, `ticksAdvanced` 36, `day` 6 | HTTP 200, `"tick":36`, `"ticksAdvanced":36`, `"day":6`, `"eventSequence":4268` |
| State tick 36, party | `tick` 36, `day` 6, `Mara Vane`, `crown-harbor` | `"tick":36`, `"day":6`, `"name":"Mara Vane"`, `"locationId":"crown-harbor"` |
| State tick 36 page | count 200, total 4268, oldest 4069, newest 4268, cursor 4069, hasMore true | `"count":200,"limit":200,"total":4268,"hasMore":true,"oldestSequence":4069,"newestSequence":4268,"cursor":4069` |
| Cinder Key at state tick 36 | `factionId` `world-government`, `ownerId` `character-08`, `garrison` 6, `stability` 43; intelligence exact true, present false, source `owned`, confidence 1, observedTick 36, ageTicks 0; garrisonIntelligence source `owned`, observedTick 36, ageTicks 0 | Those fields match, including `"garrison":6` and `"stability":43`. Also on the same object, and not in the checkpoint: `"surrender":{"offeredToId":"character-15","offeredTick":35,"previousFactionId":"world-government"}` while `"surrenderOffered":false`, `"battleInProgress":false`, `"partyCount":7` |
| Sequence 4182 | tick 35, day 5.83, `settlement-claimed`, actor `character-08`, target `free-tide`, `cinder-key`, withheld true, data null, `Vale Drake: settlement claimed` | `"sequence":4182,"tick":35,"day":5.83,"type":"settlement-claimed","actorId":"character-08","targetId":"free-tide","settlementId":"cinder-key","summary":"Vale Drake: settlement claimed","data":null,"payloadWithheld":true` |
| Sequence 4205 | tick 35, day 5.83, `battle-resolved`, actor `character-15`, target `world-government`, `cinder-key`, withheld true, data null, `Mina Vale: battle resolved`. The only such battle on that settlement and tick | That object, verbatim as quoted in the expected cell. Filter of `battle-resolved` with `settlementId` `cinder-key` and `tick` 35 returned this one event |
| Sequences 4221, 4227, 4232 | `decision-made` for `character-19` `Esme Dusk: decision made`, `character-20` `Dax Pike: decision made`, `character-21` `Mara Calder: decision made`; each withheld, data null; no `battle-resolved` for those actors at event tick 35 | `"sequence":4221,"tick":35,"day":5.83,"type":"decision-made","actorId":"character-19","settlementId":"cinder-key","summary":"Esme Dusk: decision made","data":null,"payloadWithheld":true`. 4227 is the same shape for `character-20` / `Dax Pike: decision made`. 4232 is the same shape for `character-21` / `Mara Calder: decision made`. Each of those actors has zero `battle-resolved` events on the page |
| Older page `beforeSequence=4069`, sequence 4060 | tick 34, day 5.67, `battle-resolved`, actor `character-08`, target `free-tide`, `cinder-key`, withheld true, data null, `Vale Drake: battle resolved` | HTTP 200. Page oldest 3869, newest 4068, count 200, total 4268, cursor 3869. `"sequence":4060,"tick":34,"day":5.67,"type":"battle-resolved","actorId":"character-08","targetId":"free-tide","settlementId":"cinder-key","summary":"Vale Drake: battle resolved","data":null,"payloadWithheld":true` |
| `POST /api/advance` `{"ticks":1}` | HTTP 200, `tick` 37, `ticksAdvanced` 1 | HTTP 200, `"tick":37`, `"ticksAdvanced":1`. Advance `day` is `6.166666666666667`. The state read says `"day":6.17` |
| Sequence 4331 at state tick 37 | on the first page; tick 36, day 6, `settlement-claimed`, actor `character-15`, target `world-government`, `cinder-key`, withheld true, data null, `Mina Vale: settlement claimed` | First page oldest 4185, newest 4384, total 4384. `"sequence":4331,"tick":36,"day":6,"type":"settlement-claimed","actorId":"character-15","targetId":"world-government","settlementId":"cinder-key","summary":"Mina Vale: settlement claimed","data":null,"payloadWithheld":true` |
| Cinder Key at state tick 37 | not an owned reading: `factionId` `free-tide`, `garrison` 131, `stability` null, `ownerId` null; intelligence exact false, present false, source `rumor`, confidence 0.11, observedTick 0, ageTicks 56 | Those fields match. `"garrisonIntelligence":{"source":"rumor","observedTick":0,"ageTicks":56}`. `"groundIntelligence":null` |
| `POST /api/advance` `{"ticks":3}` | HTTP 200, `tick` 40, `ticksAdvanced` 3 | HTTP 200, `"tick":40`, `"ticksAdvanced":3`. Advance `day` is `6.666666666666667`. The state read says `"day":6.67` |
| State tick 40, sequence 4331 | still the `settlement-claimed` line for Mina at Cinder Key; no later `settlement-claimed` on `cinder-key` has replaced it | **Mismatch on the specified read.** `GET /api/state?limit=200` returns oldest 4530, newest 4729, total 4729. Sequence 4331 is not on that page. That page has no `settlement-claimed` at all. `GET /api/state?limit=200&beforeSequence=4530` returns oldest 4330, newest 4529, and sequence 4331 with the same object as at state tick 37. From sequence 4331 through 4729, the only `settlement-claimed` is 4331 |
| Cinder Key at state tick 40 | rumor: exact false, source `rumor`, `garrison` 131, observedTick 0 | `"factionId":"free-tide"`, `"garrison":131`, `"stability":null`, `"ownerId":null`, `"exact":false`, `"present":false`, `"source":"rumor"`, `"confidence":0.11`, `"observedTick":0`, `"ageTicks":59`. The named rumor fields match. `ageTicks` moved from 56 to 59 |

The three withheld kinds the plan named are withheld: every `decision-made`, `battle-resolved`, and `settlement-claimed` above has `"payloadWithheld":true` and `"data":null`. Crown Harbor's figures were not used as the checkpoint. Mara's `locationId` stayed `crown-harbor` at state ticks 36, 37, and 40.

Player-facing, session B. At state tick 36 the panel is the only place the 6 soldiers appear: `"garrison":6`, `"factionId":"world-government"`, `"ownerId":"character-08"`, `"intelligence":{"exact":true,...,"source":"owned"}`. The log never says 6. Vale's claim is `Vale Drake: settlement claimed` and Mina's fight is `Mina Vale: battle resolved`, both with `"data":null`. `"present":false` sits on that exact owned reading while Mara is at Crown Harbor, which reads like "nobody is there" if `present` is taken to mean the garrison.

The same panel also carries a surrender block aimed at `character-15` on tick 35, and `"surrenderOffered":false` beside it. The battle is already over (`"battleInProgress":false`). A player cannot tell whether a surrender was offered, accepted, or only recorded.

Esme Dusk, Dax Pike, and Mara Calder are at `cinder-key` with Free Tide, troop counts 41, 38, and 44. Mina Vale is there with 28. Their lines are `Esme Dusk: decision made`, `Dax Pike: decision made`, and `Mara Calder: decision made`. The action is not in the JSON. The only way to see that they did not fight is the missing `battle-resolved` row.

At state tick 37 the owned panel is gone. The replacement is `"factionId":"free-tide"`, `"garrison":131`, `"source":"rumor"`, `"confidence":0.11`, `"observedTick":0`, `"ageTicks":56`. Mina's claim, on the same read, is `Mina Vale: settlement claimed` with `"data":null`. The rumor names Free Tide, which is also the faction that just claimed the port, so the stale 131 looks like the outcome of the claim. The `rumor` source and tick-0 observation are the only warning.

By state tick 40 the default 200-event page has moved to sequences 4530–4729. Mina's claim is gone from that page, three ticks after it was visible. A player who does not page back cannot find the capture. The panel is still the rumor, now `"ageTicks":59`, still garrison 131, still observed at tick 0.
