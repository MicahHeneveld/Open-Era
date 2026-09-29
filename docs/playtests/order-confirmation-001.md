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
