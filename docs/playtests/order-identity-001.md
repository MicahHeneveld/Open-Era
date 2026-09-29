# Playtest: order identity

## Session

- **Candidate commit:** `f7928a7b9dd9d1df718c40219a26949d338ea976`
- **Date:** 2026-09-29 UTC
- **Operator:** A fresh-context playtest operator. This operator did not write the change. The run used only the dashboard HTTP JSON API and the playtest plan. `src/`, `tests/`, this branch's diff and log, and `docs/design/contracts.md` were not opened. The world report, the map, and the trace files were not opened.
- **Interface:** Dashboard over HTTP, JSON API only (`GET /api/health`, `GET /api/state`, `POST /api/commands`, `POST /api/advance`)
- **Seed:** `1847`
- **Starting tick:** `0`
- **Ending tick:** `6` (day 1)
- **Player character:** Mara Vane (`character-01`, `playerId` `prototype-player`)

Node was `v24.21.0` (`node -v` after selecting `.node-version`; the image default was v22.14.0). `npm ci` ran first. The process was `npm run dashboard -- --reset --seed 1847` on `http://127.0.0.1:4317`. `GET /api/health` returned HTTP 200 `{"ok":true,"tick":0,"events":0}`. That start already bound the player to `character-01`. `--player-character character-01` was not added.

At every checkpoint below, Ada Sorn (`character-13`) had one standing order, and the only order id on her card was `character-01:order:character-13`. The whole log was paged after tick 6. The string `standing-order-issued` does not appear.

## Hypothesis and ambition

**Milestone hypothesis:** A new instruction to Ada changes the order she already holds.

**Player ambition:** Tell Ada, who is already under an untargeted explore, to explore Cinder Key. See that the same order changes, that saying it again does nothing, and that the completion report still names that order.

**Success signal:** `PROMOTE` if that one order is revision 2 with target `cinder-key`, the log has no `standing-order-issued`, the repeat issue is `no-change`, and the tick-6 report names the seeded id. `REVISE` if a second order id appears, if she is still on the untargeted explore at state tick 1, or if the report names `command-00001:standing-order`. `ABANDON` if the issue is rejected or the seeded order never changes.

## Adaptive decision log

| Tick | Player-visible observation | Reasoning | Action | Outcome |
| ---: | --- | --- | --- | --- |
| 0 | Mara at `crown-harbor`. `party.hold.money` 108. Ada at `crown-harbor`, `travel` null. One order `character-01:order:character-13`, `explore`, no `targetId` key, priority 0.78, status `pending`, revision 1. Orders on Ada: 1 | She already holds an explore with no island named. A new instruction should change that order | `POST /api/commands` issue-order explore `cinder-key` | HTTP 202. Stored as `amend-order` on that same id. State stays tick 0. Still 1 order, still revision 1, still no `targetId` |
| 0 | One pending command, `command-00001` | The world has not moved yet | `POST /api/advance` `{"ticks":1}` | HTTP 200, state tick 1. Amendment, resolution, and acceptance are on tick 0. No `standing-order-issued`. Ada is at sea for Cinder Key. The one order is revision 2, target `cinder-key`, status `active` |
| 1 | Same order, same target | Saying the same thing again should not mint another order | Same `issue-order` body | HTTP 400 `no-change`. State stays tick 1. Still 1 order |
| 1 | Ada `travel` `crown-harbor` → `cinder-key`, 4 ticks, 4 remaining | Four sea ticks should land her | `POST /api/advance` `{"ticks":4}` | HTTP 200, state tick 5. Ada at `cinder-key`, `travel` null. Order still `active`, revision 2. Arrival event tick 4, payload withheld. Still 1 order |
| 5 | She is on the island the order names | The next tick is when a survey would be reported | `POST /api/advance` `{"ticks":1}` | HTTP 200, state tick 6. Order `awaiting-confirmation`, revision 2, `lastReport.kind` `completion`, `lastReport.tick` 5. Briefing item names the seeded id. Still 1 order |

### Orders Mara has issued to Ada

| Checkpoint | Count | Order ids on Ada |
| --- | ---: | --- |
| Tick 0, before the post | 1 | `character-01:order:character-13` |
| Tick 0, after HTTP 202, before the advance | 1 | `character-01:order:character-13` |
| State tick 1 | 1 | `character-01:order:character-13` |
| After the repeat issue | 1 | `character-01:order:character-13` |
| State tick 5 | 1 | `character-01:order:character-13` |
| State tick 6 | 1 | `character-01:order:character-13` |

No other character card held an order id containing `character-13`. The state JSON and the paged log do not contain `command-00001:standing-order`.

## Outcome

Mara found Ada already at Crown Harbor under one explore order with no target. She posted an explore of Cinder Key. The server accepted it as an amendment of `character-01:order:character-13`, not as a new order, and the world stayed on tick 0 until she advanced. On the next tick Ada was sailing to Cinder Key under that same id at revision 2. Posting the same instruction again was refused. Four ticks later Ada was at Cinder Key with the order still active. One more tick, and she asked Mara to confirm the survey. The report, the briefing item, and the order card all name `character-01:order:character-13`.

## Evidence review

- **World report:** Not opened. The session evidence is the dashboard JSON.
- **Metrics:** Not a separate endpoint in this session.
- **Map:** Not opened. Location and travel are the character card.
- **Decision/agency traces:** Not opened. Order changes are the command responses, the character card, and the paged events.
- **Conversation traces:** Not opened. No message was sent.
- **Recovery and determinism:** Not run. One dashboard process, seed 1847, `--reset`, from tick 0 to tick 6.

### Checkpoint comparison

Quoted strings are the JSON values. Two of them differ from the plan by a missing final period. Those rows are marked mismatch. Every other row matched.

| Step | Field | Expected | Actual |
| --- | --- | --- | --- |
| Start | Player | Mara Vane `character-01` | `player.characterId` `character-01`, `party.name` `Mara Vane`, `party.locationId` `crown-harbor`. The extra `--player-character` flag was not required |
| Start | `party.hold.money` | 108 | 108 |
| Tick 0 | Ada location, travel | `crown-harbor`, `travel` null | `crown-harbor`, `travel` null |
| Tick 0 | Order | one: `character-01:order:character-13`, `explore`, no `targetId`, priority 0.78, `pending`, revision 1 | That id. `directive` `explore`. The object has no `targetId` key. `priority` 0.78, `status` `pending`, `revision` 1 |
| Issue | HTTP | 202 | 202 |
| Issue | `command.id` | `command-00001` | `command-00001` |
| Issue | `command.type` | `amend-order` | `amend-order` |
| Issue | `command.orderId` | `character-01:order:character-13` | `character-01:order:character-13` |
| Issue | `command.majorChange` | true | true |
| Issue | priority, `targetId` | 0.78, `cinder-key` | 0.78, `cinder-key` |
| After issue | State | tick 0, one pending command | tick 0. `pendingCommands` length 1, id `command-00001`. Ada's order still revision 1 with no `targetId` |
| Advance 1 | HTTP, tick | 200, tick 1 | 200, `tick` 1, `ticksAdvanced` 1 |
| Advance 1 events, tick 0 | `standing-order-amended` | "Mara Vane materially revised the order; Ada Sorn must reassess it." `data.orderId` `character-01:order:character-13` | Sequence 10. That summary. `data.orderId` `character-01:order:character-13`. `payloadWithheld` false |
| Advance 1 events, tick 0 | `player-command-resolved` | "Mara Vane: order amended." | Sequence 11. Summary `Mara Vane: order amended` with no period. **Mismatch** of that one character. `data.orderId` `character-01:order:character-13`, `data.outcome` `order-amended`, `data.revision` 2 |
| Advance 1 events, tick 0 | `standing-order-accepted` | "Ada Sorn accepted the explore order." | Sequence 83. That summary. `data.orderId` `character-01:order:character-13` |
| Advance 1 events | `standing-order-issued` | absent | Absent from the 184 events in that response |
| `GET /api/state?limit=200` at tick 1 | `eventPage.total`, `hasMore` | 185, false | 185, false. `oldestSequence` 1, `newestSequence` 185, `count` 185 |
| Tick 1 Ada | location, travel | `locationId` null; `crown-harbor` to `cinder-key`; 4 total; 4 remaining | `locationId` null. `travel` `{"fromId":"crown-harbor","toId":"cinder-key","totalTicks":4,"remainingTicks":4}` |
| Tick 1 order | one order | revision 2, `targetId` `cinder-key`, `active`, priority 0.78 | That. `status` `active`, `adherence` `following` |
| Repeat issue | HTTP, code, error | 400, `no-change`, "The amendment does not change the order." | 400. Body `{"ok":false,"code":"no-change","error":"The amendment does not change the order"}`. **Mismatch:** the error has no period. State stayed tick 1, still one order |
| Advance 4 | State tick | 5 | HTTP 200, `tick` 5, `ticksAdvanced` 4 |
| Tick 5 Ada | location, travel, order | `cinder-key`, `travel` null, `active`, revision 2 | `cinder-key`, `travel` null, `status` `active`, `revision` 2, `targetId` `cinder-key` |
| Advance 4 events | `arrived` | event tick 4, "Ada Sorn: arrived", payload withheld | Sequence 528, tick 4, that summary, `data` null, `payloadWithheld` true, `settlementId` `cinder-key` |
| Advance 1 | State tick | 6 | HTTP 200, `tick` 6, `day` 1 |
| Tick 6 order | status, revision, target, report | `awaiting-confirmation`, revision 2, `cinder-key`, `lastReport.kind` `completion`, `lastReport.tick` 5, "Ada Sorn considers the survey of Cinder Key complete and requests confirmation." | All of those, including the period on the summary. `statusChangedTick` 5 |
| Tick 6 briefing | item | `confirm:character-01:order:character-13`, action `confirm-order`, `characterId` `character-13`, same `orderId` | That item. `title` "Completion needs confirmation". Same summary as the report |
| Newest page | completion event | event tick 5, sequence 637 | Sequence 637, tick 5, type `standing-order-completion-reported`, `data.orderId` `character-01:order:character-13` |
| Older page | amendment | `?limit=200&beforeSequence=105`, then follow `cursor` until `oldestSequence` is 1 | `beforeSequence=105` is HTTP 200, `oldestSequence` 1, `hasMore` false, `count` 104. The amendment is sequence 10 on that page. Cursor chain from the newest page: 505, 305, 105, then 1 |

### Whole log

Four pages, `eventPage.total` 704, sequences 1 through 704, no gaps and no duplicates. `hasMore` is false on the page whose `oldestSequence` is 1.

`standing-order-issued` string hits across those four pages: 0.

`command-00001:standing-order` string hits: 0.

Order ids present in event payloads: `character-01:order:character-02` through `character-01:order:character-13`. Ada's events that carry an `orderId` (sequences 10, 11, 83, and 637) all use `character-01:order:character-13`.

## Findings

### What worked

- The posted `issue-order` changed the order Ada already held. The 202 named `amend-order` and `character-01:order:character-13`. After one tick that order was revision 2 with target `cinder-key`, and she was sailing there.
- The same body a second time was HTTP 400 `no-change` and left the order count at 1.
- She arrived at Cinder Key on event tick 4 and, at state tick 6, asked for confirmation of that same id. The briefing item uses it too.
- The paged log has the amendment and the acceptance, and it has no `standing-order-issued`.

### Implementation defects

None observed against the promote conditions.

Two strings the plan quoted with a final period come back without one:

- `player-command-resolved` summary is `Mara Vane: order amended`
- `no-change` error is `The amendment does not change the order`

The completion summary keeps its period. Neither missing period is a second order id, an untargeted explore at tick 1, or a report that names `command-00001:standing-order`.

### Design risks and opportunities

- A player who types `issue-order` receives `amend-order`, and the refusal of a repeat talks about an amendment. The 202 shows the rewrite before the world moves, so the verb is visible. It is still a different word from the one she sent.
- Ada's arrival is a summary only. `data` is null and `payloadWithheld` is true. The route is on her character card (`fromId`, `toId`, `totalTicks`, `remainingTicks`), not on the arrival event. The plan said the arrival payload is withheld.
- The one-tick advance returned 184 events. The following `GET /api/state?limit=200` reported `total` 185. The extra event is sequence 1, `player-command-accepted`, summary `Command queued for Mara Vane`, written when the command was accepted and so not part of the advance diff. The amendment is in both.

### Follow-up experiments

- Confirm a completed or refused order, then issue again, and see whether a new id appears. This session stopped at `awaiting-confirmation` and did not confirm.
- Escrow and the shelf were out of this build and were not played.

## Recommendation

`PROMOTE`

The one order on Ada is revision 2 with target `cinder-key`. The 704-event log has no `standing-order-issued`. The repeat issue is HTTP 400 `no-change`. The tick-6 report names `character-01:order:character-13` (sequence 637), not `command-00001:standing-order`. The issue was accepted, and the seeded order changed.

The two missing periods are recorded above. They do not meet a revise or abandon condition.

This recommendation is for this session. It is not a merge, and no pull request was opened.
