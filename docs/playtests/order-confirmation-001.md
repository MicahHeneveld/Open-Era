# Playtest plan: order confirmation

This is the plan for a blind operator. It is not a completed session. Run it later. Do not open `src/`, `tests/`, the branch diff, or `docs/design/order-confirmation.md` during the session. Use only the dashboard HTTP JSON.

## Setup

- Node `v24.21.0` (`nvm use 24.21.0` if `node -v` is not that). `npm ci` first.
- `npm run dashboard -- --reset --seed 1847` on `http://127.0.0.1:4317`.
- `GET /api/health` should be HTTP 200 `{"ok":true,"tick":0,"events":0}`. The player is already Mara Vane, `character-01`, `playerId` `prototype-player`. Do not pass another character.
- Read state with `GET /api/state?limit=200&beforeSequence=<cursor>`. Omit `beforeSequence` on the first read. The next older page uses `eventPage.cursor`.
- Advance with `POST /api/advance` and body `{"ticks":1}`. Do not send `ticks` above 144. This plan uses 1.
- Commands are `POST /api/commands`.

`tick` on an event is the tick the world was on while that event was written. `tick` on the state is the tick after that advance. They differ by one. The steps below use the state tick. Quoted event fields use the event's own `tick`.

## Hypothesis and ambition

**Hypothesis.** Pax Ash signs his own officer's report on the tick after it is filed. Mara's report stays open long enough for her to sign a different one, and closes itself after a day if she does not.

**Ambition.** Advance one tick at a time. At state tick 5, sign Ada Sorn's explore. Do not sign Toma Reef's trade report. Advance until state tick 7.

**What you can see.** Mara is not Pax's officer and not Zara's issuer. Zara Gale's order is not on Zara's card. The completion event is in the log with `data` null. The reason string is not in that JSON. Toma's order is Mara's, so his card and his completion payload are visible.

## Characters

| Name | Id | What to watch |
| --- | --- | --- |
| Mara Vane | `character-01` | The player. Starts at `crown-harbor`. |
| Toma Reef | `character-07` | Mara's trade order `character-01:order:character-07`. Do not sign it. |
| Ada Sorn | `character-13` | Mara's explore order `character-01:order:character-13`. Sign it at state tick 5. |
| Pax Ash | `character-14` | Actor on Zara's completion. |
| Zara Gale | `character-17` | Target on that completion. Her card's `standingOrders` stays `[]`. |

## Steps

### State tick 0

`GET /api/state?limit=200`.

- `tick` 0. `party.name` `Mara Vane`. `party.locationId` `crown-harbor`. `player.characterId` `character-01`.
- Toma Reef, `character-07`: one order `character-01:order:character-07`, `directive` `trade-supplies`, `status` `pending`, `issuerId` `character-01`, `lastReport` null. The order object has no `targetId` key.
- Ada Sorn, `character-13`: one order `character-01:order:character-13`, `directive` `explore`, `status` `pending`, `issuerId` `character-01`, `lastReport` null. No `targetId` key.
- Zara Gale, `character-17`: `standingOrders` is `[]`.
- `briefing.items` has no item with `action` `confirm-order`.

### Advance to state tick 1

`POST /api/advance` `{"ticks":1}`. HTTP 200. `tick` 1. `ticksAdvanced` 1.

On that response, or on the next state read, event `tick` 0:

- sequence 47, `standing-order-completion-reported`, `actorId` `character-07`, `targetId` `character-07`, `payloadWithheld` false, summary `Toma Reef reports the supply transaction at Cinder Key complete and requests confirmation.`
  - `data.orderId` `character-01:order:character-07`
  - `data.issuerId` `character-01`
  - `data.score` 0.862
  - `data.threshold` 0.764
  - `data.summary` `Toma Reef reports the supply transaction at Cinder Key complete and requests confirmation.`
- sequence 110, `standing-order-completion-reported`, `actorId` `character-17`, `targetId` `character-17`, `payloadWithheld` true, `data` null, summary `Zara Gale: standing order completion reported`

State tick 1:

- Toma's order `status` `awaiting-confirmation`. `lastReport.kind` `completion`. `lastReport.tick` 0. `lastReport.summary` `Toma Reef reports the supply transaction at Cinder Key complete and requests confirmation.`
- Briefing item `id` `confirm:character-01:order:character-07`, `action` `confirm-order`, `characterId` `character-07`, `orderId` `character-01:order:character-07`, `title` `Completion needs confirmation`, `summary` `Toma Reef reports the supply transaction at Cinder Key complete and requests confirmation.`
- No briefing item names `character-17` or `character-14:order:character-17`.
- Ada's order `status` `active`. `lastReport.kind` `accepted`. `lastReport.summary` `Ada Sorn accepted the explore order.`
- Zara's `standingOrders` is still `[]`. She is not completed in any field Mara can read. The completion is the next advance.

### Advance to state tick 2

`POST /api/advance` `{"ticks":1}`. HTTP 200. `tick` 2. `ticksAdvanced` 1.

Event `tick` 1, `day` 0.17:

- sequence 191, `standing-order-completed`, `actorId` `character-14`, `targetId` `character-17`, `payloadWithheld` true, `data` null, summary `Pax Ash: standing order completed`
- sequence 192, `relationship-changed`, `actorId` `character-17`, `targetId` `character-14`, `payloadWithheld` true, `data` null, summary `Zara Gale: relationship changed`

State tick 2: Toma is still `awaiting-confirmation` with the same confirm item. Zara's card is still `[]`. There is still no confirm item for Zara.

Other `relationship-changed` lines on this tick can also have `data` null. Match sequence 192. Do not treat a null payload as a failed run.

### Advance to state tick 5

Three more `POST /api/advance` `{"ticks":1}`. Stop at state `tick` 5. Do not post a command before that.

State tick 5:

- Ada's order `status` `awaiting-confirmation`. `lastReport.tick` 4. `lastReport.kind` `completion`. `lastReport.summary` `Ada Sorn considers the survey of Glassport complete and requests confirmation.`
- The report event is `tick` 4, sequence 531, `payloadWithheld` false, summary `Ada Sorn considers the survey of Glassport complete and requests confirmation.` `data.orderId` `character-01:order:character-13`. `data.score` 0.808. `data.threshold` 0.762.
- Briefing item `id` `confirm:character-01:order:character-13`, `action` `confirm-order`, `orderId` `character-01:order:character-13`, `summary` `Ada Sorn considers the survey of Glassport complete and requests confirmation.`
- Toma is still `awaiting-confirmation`. His confirm item is still there.

### Sign Ada. Do not sign Toma.

`POST /api/commands`

```json
{"playerId":"prototype-player","type":"confirm-order","characterId":"character-13","orderId":"character-01:order:character-13"}
```

HTTP 202. State stays `tick` 5. `pendingCommands` has one entry, `command-00001`.

Response `command`:

- `id` `command-00001`
- `playerId` `prototype-player`
- `issuedTick` 5
- `type` `confirm-order`
- `characterId` `character-13`
- `orderId` `character-01:order:character-13`

`GET /api/state?limit=200` after the post. The accept event is stored before the next advance, so it is on this read and not in the next advance body.

- sequence 586, `tick` 5, `day` 0.83, `player-command-accepted`, `actorId` `character-01`, `targetId` `character-13`, `payloadWithheld` false, summary `Command queued for Mara Vane`
- `data.command` is the object above
- `data.nextCommandSequence` 2

Ada's order is still `awaiting-confirmation` until the advance.

### Advance to state tick 6

`POST /api/advance` `{"ticks":1}`. HTTP 200. `tick` 6. `ticksAdvanced` 1.

Event `tick` 5, `day` 0.83:

- sequence 593, `standing-order-completed`, `actorId` `character-01`, `targetId` `character-13`, `payloadWithheld` false, summary `Mara Vane confirmed Ada Sorn's completion report.`
  - `data.commandId` `command-00001`
  - `data.orderId` `character-01:order:character-13`
  - `data.summary` `Mara Vane confirmed Ada Sorn's completion report.`
  - `data` has no `reason` key
- sequence 594, `player-command-resolved`, `actorId` `character-01`, `targetId` `character-13`, `payloadWithheld` false, summary `Mara Vane: order completion confirmed`
  - `data.commandId` `command-00001`
  - `data.outcome` `order-completion-confirmed`
  - `data.orderId` `character-01:order:character-13`

State tick 6:

- Ada's order `status` `completed`. `lastReport.kind` `confirmed`. `lastReport.tick` 5. `lastReport.summary` `Mara Vane confirmed Ada Sorn's completion report.`
- No briefing item with `orderId` `character-01:order:character-13`.
- Toma is still `awaiting-confirmation`. His confirm item is still there.
- No event in the log has `type` `standing-order-issued`.
- No event with `data.orderId` `character-01:order:character-13` has `data.reason` `issuer-silent`.

### Advance to state tick 7

`POST /api/advance` `{"ticks":1}`. HTTP 200. `tick` 7. `ticksAdvanced` 1.

Event `tick` 6, `day` 1:

- sequence 716, `standing-order-completed`, `actorId` `character-01`, `targetId` `character-07`, `payloadWithheld` false, summary `Mara Vane did not answer Toma Reef's completion report within a day, and the order closed.`
  - `data.orderId` `character-01:order:character-07`
  - `data.reason` `issuer-silent`
  - `data.summary` `Mara Vane did not answer Toma Reef's completion report within a day, and the order closed.`
  - `data` has no `commandId` key
- sequence 717, `relationship-changed`, `actorId` `character-07`, `targetId` `character-01`, `payloadWithheld` true, `data` null, summary `Toma Reef: relationship changed`

State tick 7:

- Toma's order `status` `completed`. `lastReport.kind` `confirmed`. `lastReport.tick` 6. `lastReport.summary` `Mara Vane did not answer Toma Reef's completion report within a day, and the order closed.`
- No briefing item with `orderId` `character-01:order:character-07`.
- Ada stays `completed` on the same id.
- Paging the whole log still finds no `standing-order-issued`.

## Recommendation

`PROMOTE` if all three of these hold:

- The advance to state tick 2 has sequence 191, `Pax Ash: standing order completed`, `actorId` `character-14`, `targetId` `character-17`, `data` null.
- At state tick 6, Ada's order `character-01:order:character-13` is `completed` from `command-00001`, the summary is `Mara Vane confirmed Ada Sorn's completion report.`, and that id has no `issuer-silent`.
- At state tick 7, Toma's order `character-01:order:character-07` is `completed` with `data.reason` `issuer-silent` and summary `Mara Vane did not answer Toma Reef's completion report within a day, and the order closed.` He was still `awaiting-confirmation` at state tick 6.

`REVISE` if Toma's order is `completed` before state tick 7, or if Ada's signature does not complete `character-01:order:character-13` (it stays `awaiting-confirmation`, or that id closes with `issuer-silent`).

`ABANDON` if the paged log at state tick 7 still has no `standing-order-completed` with `actorId` `character-14` and `targetId` `character-17`.

## Session / Findings

Blind session on `feature/confirm-unanswered-orders` at `9fc9477`, Node v24.21.0, `npm ci`, then `npm run dashboard -- --reset --seed 1847` at `http://127.0.0.1:4317`. Player `prototype-player`. Every advance body was `{"ticks":1}`. The plan text above was not changed.

**Verdict: PROMOTE.** All three promotion readings held. Toma's order was still `awaiting-confirmation` at state tick 6, and Ada's signature completed `character-01:order:character-13` without `issuer-silent`. The paged log contains Pax Ash's completion of Zara Gale.

No checkpoint mismatched the strings the plan named. The notes under player-facing confusion are things a player can see that the plan did not treat as failures.

### Checkpoint readings

| Checkpoint | Expected | Actual |
| --- | --- | --- |
| Health | HTTP 200 `{"ok":true,"tick":0,"events":0}` | HTTP 200 `{"ok":true,"tick":0,"events":0}` |
| State tick 0 | `tick` 0, `party.name` `Mara Vane`, `party.locationId` `crown-harbor`, `player.characterId` `character-01` | `tick` 0, `party.name` `Mara Vane`, `party.locationId` `crown-harbor`, `player.characterId` `character-01` |
| Toma at tick 0 | `character-01:order:character-07`, `trade-supplies`, `pending`, `issuerId` `character-01`, `lastReport` null, no `targetId` | Same id, `directive` `trade-supplies`, `status` `pending`, `issuerId` `character-01`, `lastReport` null. The order object has no `targetId` key |
| Ada at tick 0 | `character-01:order:character-13`, `explore`, `pending`, `issuerId` `character-01`, `lastReport` null, no `targetId` | Same id, `directive` `explore`, `status` `pending`, `issuerId` `character-01`, `lastReport` null. No `targetId` key |
| Zara at tick 0 | `standingOrders` `[]` | `standingOrders` `[]` |
| Briefing at tick 0 | no item with `action` `confirm-order` | `briefing.items` `[]`. `attentionCount` 0 |
| Advance to tick 1 | HTTP 200, `tick` 1, `ticksAdvanced` 1 | HTTP 200, `tick` 1, `ticksAdvanced` 1 |
| Event 47 | tick 0, `standing-order-completion-reported`, actor and target `character-07`, `payloadWithheld` false, summary `Toma Reef reports the supply transaction at Cinder Key complete and requests confirmation.` Data order, issuer, score 0.862, threshold 0.764, same summary | Sequence 47, `tick` 0, `day` 0, type `standing-order-completion-reported`, `actorId` `character-07`, `targetId` `character-07`, `payloadWithheld` false, summary `Toma Reef reports the supply transaction at Cinder Key complete and requests confirmation.` `data.orderId` `character-01:order:character-07`, `data.issuerId` `character-01`, `data.score` 0.862, `data.threshold` 0.764, `data.summary` `Toma Reef reports the supply transaction at Cinder Key complete and requests confirmation.` |
| Event 110 | tick 0, actor and target `character-17`, `payloadWithheld` true, `data` null, summary `Zara Gale: standing order completion reported` | Sequence 110, `tick` 0, `day` 0, `actorId` `character-17`, `targetId` `character-17`, `payloadWithheld` true, `data` null, summary `Zara Gale: standing order completion reported` |
| Toma at tick 1 | `awaiting-confirmation`, `lastReport.kind` `completion`, `lastReport.tick` 0, same summary | `status` `awaiting-confirmation`, `lastReport.kind` `completion`, `lastReport.tick` 0, `lastReport.summary` `Toma Reef reports the supply transaction at Cinder Key complete and requests confirmation.` |
| Confirm item for Toma | id `confirm:character-01:order:character-07`, `action` `confirm-order`, `characterId` `character-07`, that order id, title `Completion needs confirmation`, that summary | Those fields, verbatim, including the title `Completion needs confirmation` and the summary `Toma Reef reports the supply transaction at Cinder Key complete and requests confirmation.` |
| No Zara confirm | no briefing item names `character-17` or `character-14:order:character-17` | None of the seven items contained either string |
| Ada at tick 1 | `active`, `lastReport.kind` `accepted`, summary `Ada Sorn accepted the explore order.` | `status` `active`, `lastReport.kind` `accepted`, `lastReport.summary` `Ada Sorn accepted the explore order.` |
| Zara at tick 1 | `standingOrders` `[]` | `standingOrders` `[]` |
| Advance to tick 2 | HTTP 200, `tick` 2, `ticksAdvanced` 1 | HTTP 200, `tick` 2, `ticksAdvanced` 1 |
| Event 191 | tick 1, day 0.17, `standing-order-completed`, `actorId` `character-14`, `targetId` `character-17`, `payloadWithheld` true, `data` null, summary `Pax Ash: standing order completed` | Sequence 191, `tick` 1, `day` 0.17, type `standing-order-completed`, `actorId` `character-14`, `targetId` `character-17`, `payloadWithheld` true, `data` null, summary `Pax Ash: standing order completed` |
| Event 192 | tick 1, day 0.17, `relationship-changed`, `actorId` `character-17`, `targetId` `character-14`, `payloadWithheld` true, `data` null, summary `Zara Gale: relationship changed` | Sequence 192, `tick` 1, `day` 0.17, type `relationship-changed`, `actorId` `character-17`, `targetId` `character-14`, `payloadWithheld` true, `data` null, summary `Zara Gale: relationship changed` |
| State tick 2 | Toma still `awaiting-confirmation` with the same confirm item. Zara `[]`. No confirm item for Zara | Toma `status` `awaiting-confirmation`, same `lastReport` summary, confirm item `confirm:character-01:order:character-07` still present. Zara `standingOrders` `[]`. No confirm item named Zara or Pax |
| State tick 5 | Ada `awaiting-confirmation`, `lastReport.tick` 4, `kind` `completion`, summary `Ada Sorn considers the survey of Glassport complete and requests confirmation.` | `status` `awaiting-confirmation`, `lastReport.tick` 4, `lastReport.kind` `completion`, `lastReport.summary` `Ada Sorn considers the survey of Glassport complete and requests confirmation.` |
| Event 531 | tick 4, `payloadWithheld` false, that summary, `data.orderId` `character-01:order:character-13`, `data.score` 0.808, `data.threshold` 0.762 | Sequence 531, `tick` 4, `day` 0.67, type `standing-order-completion-reported`, `actorId` `character-13`, `targetId` `character-13`, `payloadWithheld` false, summary `Ada Sorn considers the survey of Glassport complete and requests confirmation.` `data.orderId` `character-01:order:character-13`, `data.issuerId` `character-01`, `data.score` 0.808, `data.threshold` 0.762, `data.summary` the same sentence |
| Ada confirm item | id `confirm:character-01:order:character-13`, `action` `confirm-order`, that order id, that summary | Those fields, verbatim. `characterId` `character-13`. Title `Completion needs confirmation` |
| Toma at tick 5 | still `awaiting-confirmation`, confirm item still there | `status` `awaiting-confirmation`. Item `confirm:character-01:order:character-07` still there, same summary |
| Sign Ada | HTTP 202. State stays tick 5. `pendingCommands` has `command-00001`. Command fields as written | HTTP 202. Body `ok` true. `command.id` `command-00001`, `playerId` `prototype-player`, `issuedTick` 5, `type` `confirm-order`, `characterId` `character-13`, `orderId` `character-01:order:character-13`. State `tick` 5. `pendingCommands` is that one object |
| Event 586 | tick 5, day 0.83, `player-command-accepted`, actor `character-01`, target `character-13`, `payloadWithheld` false, summary `Command queued for Mara Vane`, `data.command` the object above, `data.nextCommandSequence` 2 | Sequence 586, `tick` 5, `day` 0.83, type `player-command-accepted`, `actorId` `character-01`, `targetId` `character-13`, `payloadWithheld` false, summary `Command queued for Mara Vane`. `data.command` matches the object above. `data.nextCommandSequence` 2 |
| Ada before the next advance | still `awaiting-confirmation` | `status` `awaiting-confirmation`, `lastReport.kind` still `completion` |
| Advance to tick 6 | HTTP 200, `tick` 6, `ticksAdvanced` 1 | HTTP 200, `tick` 6, `ticksAdvanced` 1 |
| Event 593 | tick 5, day 0.83, `standing-order-completed`, actor `character-01`, target `character-13`, `payloadWithheld` false, summary `Mara Vane confirmed Ada Sorn's completion report.` Data has `commandId` `command-00001`, that order id, that summary, and no `reason` key | Sequence 593, `tick` 5, `day` 0.83, those ids, `payloadWithheld` false, summary `Mara Vane confirmed Ada Sorn's completion report.` `data` keys are `commandId`, `orderId`, `summary` only. `data.commandId` `command-00001`. `data.orderId` `character-01:order:character-13`. `data.summary` `Mara Vane confirmed Ada Sorn's completion report.` No `reason` key |
| Event 594 | `player-command-resolved`, same actor and target, `payloadWithheld` false, summary `Mara Vane: order completion confirmed`, `data.commandId` `command-00001`, `data.outcome` `order-completion-confirmed`, that order id | Sequence 594, `tick` 5, `day` 0.83, `actorId` `character-01`, `targetId` `character-13`, `payloadWithheld` false, summary `Mara Vane: order completion confirmed`. `data.commandId` `command-00001`, `data.outcome` `order-completion-confirmed`, `data.orderId` `character-01:order:character-13` |
| Ada at tick 6 | `completed`, `lastReport.kind` `confirmed`, `lastReport.tick` 5, summary `Mara Vane confirmed Ada Sorn's completion report.` | `status` `completed`, `lastReport.kind` `confirmed`, `lastReport.tick` 5, `lastReport.summary` `Mara Vane confirmed Ada Sorn's completion report.` Same id `character-01:order:character-13` |
| Briefing at tick 6 | no item with that Ada order id. Toma still `awaiting-confirmation` with his confirm item | No item with `orderId` `character-01:order:character-13`. Toma `status` `awaiting-confirmation`. Item `confirm:character-01:order:character-07` still present |
| Log at tick 6 | no `standing-order-issued`. No `data.reason` `issuer-silent` on Ada's order id | Paged 707 events, sequences 1 through 707, no gaps. `standing-order-issued` count 0. No event whose `data.orderId` is `character-01:order:character-13` has a `reason` key |
| Advance to tick 7 | HTTP 200, `tick` 7, `ticksAdvanced` 1 | HTTP 200, `tick` 7, `ticksAdvanced` 1 |
| Event 716 | tick 6, day 1, `standing-order-completed`, actor `character-01`, target `character-07`, `payloadWithheld` false, summary `Mara Vane did not answer Toma Reef's completion report within a day, and the order closed.` Data order id, `reason` `issuer-silent`, that summary, no `commandId` | Sequence 716, `tick` 6, `day` 1, those ids, `payloadWithheld` false, summary `Mara Vane did not answer Toma Reef's completion report within a day, and the order closed.` `data` keys are `orderId`, `reason`, `summary` only. `data.orderId` `character-01:order:character-07`. `data.reason` `issuer-silent`. `data.summary` the same sentence. No `commandId` key |
| Event 717 | `relationship-changed`, actor `character-07`, target `character-01`, `payloadWithheld` true, `data` null, summary `Toma Reef: relationship changed` | Sequence 717, `tick` 6, `day` 1, `actorId` `character-07`, `targetId` `character-01`, `payloadWithheld` true, `data` null, summary `Toma Reef: relationship changed` |
| Toma at tick 7 | `completed`, `lastReport.kind` `confirmed`, `lastReport.tick` 6, the silent summary | `status` `completed`, same id, `lastReport.kind` `confirmed`, `lastReport.tick` 6, `lastReport.summary` `Mara Vane did not answer Toma Reef's completion report within a day, and the order closed.` |
| Briefing at tick 7 | no item with Toma's order id. Ada stays `completed` on the same id | No item with `orderId` `character-01:order:character-07`. Ada `status` `completed`, id `character-01:order:character-13`, `lastReport` unchanged from tick 6 |
| Whole log at tick 7 | no `standing-order-issued`. Pax's completion is present, so this is not ABANDON | Paged 828 events, sequences 1 through 828, no gaps, five pages. `standing-order-issued` count 0. Sequence 191 is still `standing-order-completed`, `actorId` `character-14`, `targetId` `character-17`, `data` null |

The other `standing-order-completed` lines in that full log are only 191, 593, and 716.

### Player-facing confusion

These are not checkpoint mismatches. The plan either required the string or did not forbid the extra item.

- Toma's closed card says `lastReport.kind` `confirmed` on the same object whose summary is `Mara Vane did not answer Toma Reef's completion report within a day, and the order closed.` The plan required `confirmed`. A player still reads a confirmation kind on an order she never signed.
- Zara's card stays `standingOrders` `[]` after sequence 191. The only sentence is `Pax Ash: standing order completed`, with `payloadWithheld` true and `data` null. There is no order id, no reason, and nothing on her card to reconcile.
- Sequence 192 is `Zara Gale: relationship changed` and sequence 717 is `Toma Reef: relationship changed`. Both have `data` null and `payloadWithheld` true. At state tick 7, `relationship` is null on Toma Reef, Ada Sorn, Zara Gale, and Pax Ash. The only non-null `relationship` in that state read is Jun Marrow, `character-05`. The feed says Toma's relationship changed and the card does not show it.
- Sequence 586's summary is `Command queued for Mara Vane`. It does not name Ada Sorn, the explore order, or confirmation. The nested `data.command` does.
- The same title `Completion needs confirmation` also covered officers the plan did not name. At state tick 5: `Niko Wren considers the survey of Verdant Cay complete and requests confirmation.` (`confirm:character-01:order:character-03`) and `Lio Crow reports the supply transaction at Cinder Key complete and requests confirmation.` (`confirm:character-01:order:character-12`). At state tick 6 those two remained and `Bram Quill reports the supply transaction at Cinder Key complete and requests confirmation.` (`confirm:character-01:order:character-02`) was added. They were still present at state tick 7, after Toma's and Ada's items had left.
- On the advance to state tick 2, sequence 264 was also `relationship-changed` with `data` null and `payloadWithheld` true: `actorId` `character-29`, `targetId` `character-01`, summary `Orin Frost: relationship changed`. The plan said another null payload on that tick is not a failed run.
- At state tick 1, `briefing.attentionCount` was 6 and `briefing.items` had 7 entries. The extra one was `routine:character-05:80`, title `Jun Marrow's routine digest`, summary `8 routine order updates: 8 accepted. No command decision is required.` At state tick 7 the count matched the list: 10 and 10.
