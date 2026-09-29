# Playtest plan: player buy-provisions

This is the plan for a blind operator. It is not a completed session. Run it later. Do not open `src/`, `tests/`, the branch diff, or `docs/design/` during the session. Use only the dashboard HTTP JSON.

Four beats. Reset before each one. Do not carry a purse or a shelf from the beat before.

## Setup

- Node `v24.21.0` (`nvm use 24.21.0` if `node -v` is not that). `npm ci` first.
- Branch `feature/buy-provisions-player-fixes`. Record `git rev-parse HEAD` before the first request. Do not use `main`.
- `npm run dashboard -- --reset --seed 1847` on `http://127.0.0.1:4317`.
- `GET /api/health` should be HTTP 200 `{"ok":true,"tick":0,"events":0}`. The player is already Mara Vane, `character-01`, `playerId` `prototype-player`. Do not pass another character.
- Read state with `GET /api/state?limit=200`. Omit `beforeSequence` on the first read of a checkpoint. The page is newest-last in `eventPage` and the `events` array is newest-first. Find a checkpoint by its `sequence`.
- Advance with `POST /api/advance`. `ticks` must be at most 144. This plan uses 1, 30, and 135.
- Commands are `POST /api/commands`.

`tick` on an event is the tick the world was on while that event was written. `tick` on the state is the tick after that advance. They differ by one. The steps below use the state tick. Quoted event fields use the event's own `tick`.

A refusal writes no event. The checkpoint is the HTTP body and the unchanged purse, hold, and shelf.

## Hypothesis and ambition

**Hypothesis.** A provisions top-up tells Mara the price before she pays and the price after she pays. A top-up past 28.8 provisions is refused and names 28.8. A purse that cannot cover the bill is refused with that bill. An empty shelf is refused with the stock.

**Ambition.** Buy food at Crown Harbor, then on fresh worlds refuse the too-large top-up, the short purse, and the empty shelf.

**What you can see.** Mara's purse, hold, and the Crown Harbor board. Her own command and trade payloads. Not another captain's purse, and not a withheld decision payload.

## Characters

| Name | Id | What to watch |
| --- | --- | --- |
| Mara Vane | `character-01` | The player. Starts at `crown-harbor` with 108 money and 36 provisions. |

## Beat A — a normal buy

Reset. `npm run dashboard -- --reset --seed 1847`.

### State tick 0

`GET /api/state?limit=200`. HTTP 200.

- `tick` 0. `party.name` `Mara Vane`. `party.locationId` `crown-harbor`. `party.hold.money` 108. `party.provisions` 36. `party.resupplyTarget` 48. `party.demand` 0.576.
- Crown Harbor `stocks.provisions` 220. `market.resources.provisions.price` 1.47. `market.resources.provisions.stock` 220.
- `briefing.items` is `[]`.
- `eventPage.total` 0.

### Accept

`POST /api/commands`

```json
{"playerId":"prototype-player","type":"character-action","action":"buy-provisions"}
```

HTTP 202. Body, punctuation exact:

```json
{"ok":true,"command":{"id":"command-00001","playerId":"prototype-player","issuedTick":0,"type":"character-action","action":"buy-provisions","resource":"provisions","quantity":12,"unitPrice":1.47,"gross":17.64}}
```

State stays `tick` 0. Purse stays 108. Provisions stay 36. Shelf stays 220.

`GET /api/state?limit=200`. `eventPage` count 1, total 1, oldest 1, newest 1, `hasMore` false. Sequence 1 is on this page.

- sequence 1, `tick` 0, `player-command-accepted`, `actorId` `character-01`, `payloadWithheld` false, summary `Command queued for Mara Vane: 12 provisions at 1.47 each, 17.64 total`
  - `data.command.quantity` 12
  - `data.command.unitPrice` 1.47
  - `data.command.gross` 17.64
  - `data.command.id` `command-00001`

### Resolve

`POST /api/advance` `{"ticks":1}`. HTTP 200. `tick` 1. `ticksAdvanced` 1.

On that response, event `tick` 0, and again on `GET /api/state?limit=200` at state tick 1. `eventPage.total` 186, oldest 1, newest 186, `hasMore` false. Sequences 1, 10, 11, and 12 are on this first page. No `beforeSequence` fallback.

- sequence 10, `player-action-executed`, summary `Mara Vane: player action executed`. `data.commandId` `command-00001`. `data.action` `buy-provisions`. `settlementId` `crown-harbor`.
- sequence 11, `market-trade`, `settlementId` `crown-harbor`, summary `Mara Vane bought 12 provisions at Crown Harbor for 17.64 (1.47 each)`
  - `data.direction` `bought`
  - `data.resource` `provisions`
  - `data.quantity` 12
  - `data.unitPrice` 1.47
  - `data.gross` 17.64
  - `data.tax` 0
  - `data.characterMoney` 90.36
  - `data.characterCargo.provisions` 48
  - `data.characterCargo.arms` 3, `medicine` 4, `shipMaterials` 5
  - `data.settlementStocks.provisions` 208.352
- sequence 12, `player-command-resolved`, summary `Mara Vane bought 12 provisions for 17.64 (1.47 each)`
  - `data.commandId` `command-00001`
  - `data.outcome` `action-executed`
  - `data.action` `buy-provisions`
  - `data.quantity` 12
  - `data.unitPrice` 1.47
  - `data.gross` 17.64

State tick 1:

- `party.hold.money` 90.36. `party.provisions` 47.424. `party.resupplyTarget` 48. Troops still 80.
- Crown Harbor `stocks.provisions` 214.008. `market.resources.provisions.price` 1.51.
- The trade payload's shelf is 208.352, the shelf the moment she paid. The state-tick-1 shelf is 214.008 because the rest of that tick traded after her. Do not treat 214.008 as a failed charge. Her purse moved by 17.64, from 108 to 90.36, and the trade's hold is 48 before the same tick's upkeep leaves 47.424.
- `briefing.items`, in order:
  - `confirm:character-01:order:character-07`, title `Completion needs confirmation`, summary `Toma Reef reports the supply transaction at Cinder Key complete and requests confirmation.`, action `confirm-order`
  - `event:66`, title `standing order refused`, summary `Kessa Calder refused the protect order after weighing loyalty, risk, and ambition.`
  - `event:60`, title `standing order refused`, summary `Orin Rill refused the protect order after weighing loyalty, risk, and ambition.`
  - `event:54`, title `standing order refused`, summary `Vale Drake refused the explore order after weighing loyalty, risk, and ambition.`
  - `event:36`, title `standing order deviated`, summary `Jun Marrow diverted to travel while retaining protect orders for Crown Harbor.`
  - `event:28`, title `standing order refused`, summary `Sable Morrow refused the protect order after weighing loyalty, risk, and ambition.`
  - `routine:character-05:84`, title `Jun Marrow's routine digest`, summary `8 routine order updates: 8 accepted. No command decision is required.`
- No briefing item tells her to buy provisions. Do not confirm Toma's order.

## Beat B — over the cap

Reset. Do not send Beat A's command.

`POST /api/advance` `{"ticks":30}`. HTTP 200. `tick` 30.

`GET /api/state?limit=200`.

- `party.hold.money` 108. `party.provisions` 18.72. `party.resupplyTarget` 48. `party.demand` 0.576. `party.locationId` `crown-harbor`.
- Crown Harbor `stocks.provisions` 210.416. `market.resources.provisions.price` 1.54.
- `eventPage.total` 3458, oldest 3259, newest 3458, `hasMore` true. This beat's checkpoint is not an event.
- `briefing.items` has no `provision:low` and no `provision:critical`. The first item is `confirm:character-01:order:character-11`, summary `Rook Tern reports that Crown Harbor is secure and asks the issuer to close the protection order.` Leave it unsigned. The rest of that list is stale-intelligence and order warnings. None of them is a provisions purchase.

`POST /api/commands`

```json
{"playerId":"prototype-player","type":"character-action","action":"buy-provisions"}
```

HTTP 400. Body, punctuation exact:

```json
{"ok":false,"code":"market-depth","error":"Crown Harbor will clear 28.8 provisions in one order; this top-up would buy 29.28"}
```

`GET /api/state?limit=200` again. Tick still 30. Money still 108. Provisions still 18.72. Shelf still 210.416. `eventPage.newestSequence` still 3458. No new event.

## Beat C — purse shortfall

Reset.

`POST /api/commands`

```json
{"playerId":"prototype-player","type":"character-action","action":"recruit"}
```

HTTP 202. Body, punctuation exact:

```json
{"ok":true,"command":{"id":"command-00001","playerId":"prototype-player","issuedTick":0,"type":"character-action","action":"recruit"}}
```

`POST /api/advance` `{"ticks":1}`. HTTP 200. `tick` 1.

`GET /api/state?limit=200`. `eventPage.total` 186, oldest 1, newest 186, `hasMore` false. Sequences 1, 10, 11, and 12 are on this first page.

- sequence 1, summary `Command queued for Mara Vane`. `data.command.action` `recruit`.
- sequence 11, `recruited`, `data.quantity` 8, `data.cost` 96, `data.characterMoney` 12, `data.troopCount` 88
- sequence 12, `player-command-resolved`, summary `Mara Vane: action executed`, `data.action` `recruit`

State tick 1:

- `party.hold.money` 12. `party.provisions` 35.392. `party.resupplyTarget` 50. `party.demand` 0.608.
- Crown Harbor `stocks.provisions` 226.008. `market.resources.provisions.price` 1.43.
- The confirm item for Toma Reef is present again, same summary as Beat A. Do not sign it.

`POST /api/commands`

```json
{"playerId":"prototype-player","type":"character-action","action":"buy-provisions"}
```

HTTP 400. Body, punctuation exact:

```json
{"ok":false,"code":"insufficient-money","error":"14.608 provisions costs 20.89 at 1.43 each; the character holds 12"}
```

Money stays 12. Provisions stay 35.392. Shelf stays 226.008. `eventPage.newestSequence` stays 186.

## Beat D — empty shelf, optional

Reset. Send no command before the advance.

`POST /api/advance` `{"ticks":135}`. HTTP 200. `tick` 135.

`GET /api/state?limit=200`.

- `party.hold.money` 108. `party.provisions` 0. `party.resupplyTarget` 48. `party.locationId` `crown-harbor`.
- Crown Harbor `stocks.provisions` 0. `market.resources.provisions.price` 4.5.
- `eventPage.total` 15717, oldest 15518, newest 15717, `hasMore` true. The empty shelf is this state, not an older event. Do not page backward for it.
- `briefing.items`, first item `provision:critical`, title `The party is starving`, action `review-provisions`, summary `The hold is empty and 0.576 provisions per tick cannot be found. That costs health 0.461 and morale 1.382 per tick. Morale gains nothing while the shortage lasts, so it will not recover on its own. Glassport is 4 ticks away — out of reach, which is short by 4 ticks.`
- That summary does not say Crown Harbor sells provisions. The next items are the two stale-intelligence warnings, then `event:13680` (`Sable Morrow was released from Cinder Key: 13.4 paid and 103.21 recorded as debt`) and a scattered-troops group. Sequence 13680 is not on this page. It is not a checkpoint. `beforeSequence=15518` is the next older page and does not contain 13680. Leave it.

`POST /api/commands`

```json
{"playerId":"prototype-player","type":"character-action","action":"buy-provisions"}
```

HTTP 400. Body, punctuation exact:

```json
{"ok":false,"code":"no-provisions","error":"Crown Harbor holds 0 provisions; a purchase needs at least 1"}
```

Money stays 108. Provisions stay 0. Shelf stays 0. `eventPage.newestSequence` stays 15717.

A shelf of 0.4 was not on this run. State tick 134 still has Crown Harbor `stocks.provisions` 12.366, which this command is allowed to buy. Do not stop at 134 if the beat you want is the empty shelf.

## Recommendation

`PROMOTE` if all of these hold:

- Beat A accept is HTTP 202 with quantity 12, unit price 1.47, and gross 17.64, and sequences 1, 11, and 12 name that same price and total.
- Beat A purse goes from 108 to 90.36, the trade hold is 48 provisions, and state tick 1 reads 47.424 provisions.
- Beat B is HTTP 400 `market-depth` with the error string above, and money, provisions, and the shelf do not move.
- Beat C is HTTP 400 `insufficient-money` with the error string above, and money stays 12.
- Beat D, if run, is HTTP 400 `no-provisions` with the error string above, and the shelf stays 0.

`REVISE` if a beat accepts a top-up larger than 28.8, if a refusal quotes `costs 2 money`, if the accept body or sequence 11 omits the price or the total, or if the purse or the shelf moves on a 400.

`ABANDON` if `buy-provisions` is `unknown-action`, or if Beat A's first page does not contain sequence 1 after the accept and sequences 11 and 12 after the advance.
