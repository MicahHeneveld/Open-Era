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

**Hypothesis.** A provisions top-up tells Mara the price before she pays and the price after she pays. A top-up past 28.8 provisions buys 28.8 and says so. A purse that cannot cover that bill is refused with that bill. An empty shelf is refused with the stock.

**Ambition.** Buy food at Crown Harbor, including a top-up the depth shortens to 28.8, then on fresh worlds refuse the short purse and the empty shelf.

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
- `eventPage.total` 3458, oldest 3259, newest 3458, `hasMore` true.
- `briefing.items` has no `provision:low` and no `provision:critical`. The first item is `confirm:character-01:order:character-11`, summary `Rook Tern reports that Crown Harbor is secure and asks the issuer to close the protection order.` Leave it unsigned. The rest of that list is stale-intelligence and order warnings. None of them is a provisions purchase.

The gap from 18.72 up to 48 is 29.28, past 28.8. The click buys 28.8.

### Accept

`POST /api/commands`

```json
{"playerId":"prototype-player","type":"character-action","action":"buy-provisions"}
```

HTTP 202. Body, punctuation exact:

```json
{"ok":true,"command":{"id":"command-00001","playerId":"prototype-player","issuedTick":30,"type":"character-action","action":"buy-provisions","resource":"provisions","quantity":28.8,"unitPrice":1.54,"gross":44.35,"capped":true}}
```

State stays `tick` 30. Purse stays 108. Provisions stay 18.72. Shelf stays 210.416.

`GET /api/state?limit=200`. `eventPage.total` 3459, oldest 3260, newest 3459, `hasMore` true. Sequence 3459 is on this page.

- sequence 3459, `tick` 30, `player-command-accepted`, `actorId` `character-01`, `settlementId` `crown-harbor`, `payloadWithheld` false, summary `Command queued for Mara Vane: 28.8 provisions at 1.54 each, 44.35 total (Crown Harbor clears no more than 28.8 in one order)`
  - `data.command.quantity` 28.8
  - `data.command.unitPrice` 1.54
  - `data.command.gross` 44.35
  - `data.command.capped` true
  - `data.command.id` `command-00001`

### Resolve

`POST /api/advance` `{"ticks":1}`. HTTP 200. `tick` 31. `ticksAdvanced` 1.

`GET /api/state?limit=200`. `eventPage.total` 3573, oldest 3374, newest 3573, `hasMore` true. Sequences 3459, 3468, 3469, and 3470 are on this first page. No `beforeSequence` fallback.

- sequence 3468, `tick` 30, `player-action-executed`, summary `Mara Vane: player action executed`. `data.commandId` `command-00001`. `data.action` `buy-provisions`. `settlementId` `crown-harbor`.
- sequence 3469, `tick` 30, `market-trade`, `settlementId` `crown-harbor`, summary `Mara Vane bought 28.8 provisions at Crown Harbor for 44.35 (1.54 each)`
  - `data.direction` `bought`
  - `data.resource` `provisions`
  - `data.quantity` 28.8
  - `data.unitPrice` 1.54
  - `data.gross` 44.35
  - `data.tax` 0
  - `data.characterMoney` 63.65
  - `data.characterCargo.provisions` 47.52
  - `data.characterCargo.arms` 3, `medicine` 4, `shipMaterials` 5
  - `data.settlementStocks.provisions` 181.965
- sequence 3470, `tick` 30, `player-command-resolved`, summary `Mara Vane bought 28.8 provisions for 44.35 (1.54 each)`
  - `data.commandId` `command-00001`
  - `data.outcome` `action-executed`
  - `data.action` `buy-provisions`
  - `data.quantity` 28.8
  - `data.unitPrice` 1.54
  - `data.gross` 44.35

State tick 31:

- `party.hold.money` 63.65. `party.provisions` 46.944. `party.resupplyTarget` 48.
- Crown Harbor `stocks.provisions` 181.965. `market.resources.provisions.price` 1.78.
- The purse moved by 44.35, from 108 to 63.65. The trade's hold is 47.52, which is 18.72 plus 28.8, and the same tick's upkeep leaves 46.944. The trade payload's shelf is 181.965. That is the state-tick-30 shelf of 210.416 after this tick's production and then minus 28.8. The state-tick-31 shelf is the same 181.965. Do not treat 181.965 as a charge of more than 28.8.

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
- Beat B accept is HTTP 202 with quantity 28.8, unit price 1.54, gross 44.35, and `capped` true. Sequence 3459 names the 28.8 ceiling. Sequences 3469 and 3470 show 28.8 at 1.54 for 44.35. The purse goes from 108 to 63.65, the trade hold is 47.52, and state tick 31 reads 46.944 provisions.
- Beat C is HTTP 400 `insufficient-money` with the error string above, and money stays 12.
- Beat D, if run, is HTTP 400 `no-provisions` with the error string above, and the shelf stays 0.

`REVISE` if an over-cap top-up buys more than 28.8, or the cap isn't mentioned, if a refusal quotes `costs 2 money`, if an accept body or a resolution omits the price or the total, or if the purse or the shelf moves on a 400.

`ABANDON` if `buy-provisions` is `unknown-action`, or if Beat A's first page does not contain sequence 1 after the accept and sequences 11 and 12 after the advance.

## Session

Blind operator. Dashboard HTTP JSON only. Did not open `src/`, `tests/`, `docs/design/`, the branch diff, or the git log.

- Branch `feature/buy-provisions-player-fixes`. `git rev-parse HEAD` before the first request: `499b0aa4e6f95031f50b8dd9df71b4ce86188825`.
- Node `v24.21.0`. `npm ci` on that Node. Seed `1847`. Each beat started from `npm run dashboard -- --reset --seed 1847`.
- After every reset, `GET /api/health` was HTTP 200 `{"ok":true,"tick":0,"events":0}`.
- No `beforeSequence` request. Beat D's sequence 13680 was left off-page, as the plan says.

## Findings

**Verdict: PROMOTE.**

Beats A, B, C, and D each matched the recommendation checks. The over-cap fill is 28.8 and the accept names that ceiling. Neither refusal says `costs 2 money`. Accept bodies and resolutions quote the price and the total. A 400 does not move the purse, the hold, or the shelf.

### Beat A — a normal buy

| Checkpoint | Expected | Actual |
| --- | --- | --- |
| Health after reset | 200 `{"ok":true,"tick":0,"events":0}` | 200 `{"ok":true,"tick":0,"events":0}` |
| State tick 0 | tick 0, Mara Vane, `crown-harbor`, money 108, provisions 36, resupplyTarget 48, demand 0.576, shelf 220, price 1.47, stock 220, briefing `[]`, `eventPage.total` 0 | same |
| Accept | 202, body below | 202, body identical |
| After accept, before advance | tick 0, money 108, provisions 36, shelf 220 | same |
| Accept event page | count 1, total 1, oldest 1, newest 1, `hasMore` false, sequence 1 on the page | same |
| Sequence 1 | tick 0, `player-command-accepted`, actor `character-01`, `payloadWithheld` false, summary `Command queued for Mara Vane: 12 provisions at 1.47 each, 17.64 total`, quantity 12, unitPrice 1.47, gross 17.64, id `command-00001` | same |
| Advance | 200, tick 1, `ticksAdvanced` 1 | same. Sequences 10, 11, and 12 on that response are event tick 0 |
| State tick 1 page | total 186, oldest 1, newest 186, `hasMore` false. Sequences 1, 10, 11, 12 on the first page | same |
| Sequence 10 | `player-action-executed`, summary `Mara Vane: player action executed`, commandId `command-00001`, action `buy-provisions`, settlement `crown-harbor` | same |
| Sequence 11 | `market-trade`, summary `Mara Vane bought 12 provisions at Crown Harbor for 17.64 (1.47 each)`, bought, provisions, quantity 12, unitPrice 1.47, gross 17.64, tax 0, characterMoney 90.36, cargo provisions 48, arms 3, medicine 4, shipMaterials 5, shelf 208.352 | same |
| Sequence 12 | `player-command-resolved`, summary `Mara Vane bought 12 provisions for 17.64 (1.47 each)`, commandId `command-00001`, outcome `action-executed`, action `buy-provisions`, quantity 12, unitPrice 1.47, gross 17.64 | same |
| State tick 1 | money 90.36, provisions 47.424, resupplyTarget 48, troops 80, shelf 214.008, price 1.51 | same |
| Briefing | the seven items in the plan, in that order. No buy-provisions item | same, including Toma Reef's confirm line. It was not signed |

Accept body, exact:

```json
{"ok":true,"command":{"id":"command-00001","playerId":"prototype-player","issuedTick":0,"type":"character-action","action":"buy-provisions","resource":"provisions","quantity":12,"unitPrice":1.47,"gross":17.64}}
```

### Beat B — over the cap

Fresh reset. Beat A's command was not sent. Advance `{"ticks":30}` was HTTP 200, tick 30, `ticksAdvanced` 30.

| Checkpoint | Expected | Actual |
| --- | --- | --- |
| State tick 30 | money 108, provisions 18.72, resupplyTarget 48, demand 0.576, location `crown-harbor`, shelf 210.416, price 1.54 | same |
| Event page | total 3458, oldest 3259, newest 3458, `hasMore` true | same |
| Briefing | no `provision:low`, no `provision:critical`. First item `confirm:character-01:order:character-11`, summary `Rook Tern reports that Crown Harbor is secure and asks the issuer to close the protection order.` | same. Left unsigned. No provisions purchase in the list |
| Accept | 202, quantity 28.8, unitPrice 1.54, gross 44.35, `capped` true | 202, body identical |
| After accept | tick 30, money 108, provisions 18.72, shelf 210.416 | same |
| Accept event page | total 3459, oldest 3260, newest 3459, `hasMore` true. Sequence 3459 on the page | same |
| Sequence 3459 | tick 30, `player-command-accepted`, actor `character-01`, settlement `crown-harbor`, `payloadWithheld` false, summary `Command queued for Mara Vane: 28.8 provisions at 1.54 each, 44.35 total (Crown Harbor clears no more than 28.8 in one order)`, quantity 28.8, unitPrice 1.54, gross 44.35, capped true, id `command-00001` | same |
| Advance | 200, tick 31, `ticksAdvanced` 1 | same |
| State tick 31 page | total 3573, oldest 3374, newest 3573, `hasMore` true. Sequences 3459, 3468, 3469, 3470 on the first page | same |
| Sequence 3468 | tick 30, `player-action-executed`, summary `Mara Vane: player action executed`, commandId `command-00001`, action `buy-provisions`, settlement `crown-harbor` | same |
| Sequence 3469 | tick 30, `market-trade`, summary `Mara Vane bought 28.8 provisions at Crown Harbor for 44.35 (1.54 each)`, quantity 28.8, unitPrice 1.54, gross 44.35, tax 0, characterMoney 63.65, cargo provisions 47.52, arms 3, medicine 4, shipMaterials 5, shelf 181.965 | same |
| Sequence 3470 | tick 30, `player-command-resolved`, summary `Mara Vane bought 28.8 provisions for 44.35 (1.54 each)`, commandId `command-00001`, outcome `action-executed`, action `buy-provisions`, quantity 28.8, unitPrice 1.54, gross 44.35 | same |
| State tick 31 | money 63.65, provisions 46.944, resupplyTarget 48, shelf 181.965, price 1.78 | same |

Accept body, exact:

```json
{"ok":true,"command":{"id":"command-00001","playerId":"prototype-player","issuedTick":30,"type":"character-action","action":"buy-provisions","resource":"provisions","quantity":28.8,"unitPrice":1.54,"gross":44.35,"capped":true}}
```

The tick-30 briefing after the advance, in order, was: Rook Tern's confirm; stale intelligence for Verdant Cay and Cinder Key; `event:3407` `Esme Dusk lost at Glassport`; a ×2 deviation group for Rook Tern; `event:1508` `Mina Vale lost at Glassport`; a ×2 deviation group for Jun Marrow; `event:730` Iris Stone's deviation; then the four refusals for Kessa Calder, Orin Rill, Vale Drake, and Sable Morrow.

### Beat C — purse shortfall

Fresh reset.

| Checkpoint | Expected | Actual |
| --- | --- | --- |
| Recruit accept | 202, body below | 202, body identical |
| Advance | 200, tick 1 | 200, tick 1, `ticksAdvanced` 1 |
| Event page | total 186, oldest 1, newest 186, `hasMore` false. Sequences 1, 10, 11, 12 on the first page | same |
| Sequence 1 | summary `Command queued for Mara Vane`, `data.command.action` `recruit` | same |
| Sequence 11 | `recruited`, quantity 8, cost 96, characterMoney 12, troopCount 88 | same |
| Sequence 12 | `player-command-resolved`, summary `Mara Vane: action executed`, action `recruit` | same |
| State tick 1 | money 12, provisions 35.392, resupplyTarget 50, demand 0.608, shelf 226.008, price 1.43 | same. Troops 88 |
| Toma Reef confirm | present, same summary as Beat A | same. Not signed |
| Buy | 400, body below | 400, body identical |
| After the 400 | money 12, provisions 35.392, shelf 226.008, `eventPage.newestSequence` 186 | same. `eventPage.total` still 186. Pending commands empty |

Recruit body, exact:

```json
{"ok":true,"command":{"id":"command-00001","playerId":"prototype-player","issuedTick":0,"type":"character-action","action":"recruit"}}
```

Buy body, exact:

```json
{"ok":false,"code":"insufficient-money","error":"14.608 provisions costs 20.89 at 1.43 each; the character holds 12"}
```

### Beat D — empty shelf

Fresh reset. No command before the advance. Advance `{"ticks":135}` was HTTP 200, tick 135, `ticksAdvanced` 135.

| Checkpoint | Expected | Actual |
| --- | --- | --- |
| State tick 135 | money 108, provisions 0, resupplyTarget 48, location `crown-harbor`, shelf 0, price 4.5 | same |
| Event page | total 15717, oldest 15518, newest 15717, `hasMore` true | same. Sequence 13680 is not on this page |
| First briefing item | `provision:critical`, title `The party is starving`, action `review-provisions`, the Glassport summary in the plan | same, character for character |
| Following items | two stale-intelligence warnings, then `event:13680` with the Sable Morrow release sentence, then a scattered-troops group | same |
| Buy | 400, body below | 400, body identical |
| After the 400 | money 108, provisions 0, shelf 0, `eventPage.newestSequence` 15717 | same |

Buy body, exact:

```json
{"ok":false,"code":"no-provisions","error":"Crown Harbor holds 0 provisions; a purchase needs at least 1"}
```

Tick 134 was not read. The plan says not to stop there.

### Player-facing notes

These did not miss a recommendation check.

- On Beat A the receipt and the next screen disagree. Sequence 11 records hold 48 and shelf 208.352. State tick 1 shows hold 47.424 and shelf 214.008. The purse does match the receipt: 108 to 90.36. Nothing on the next screen says the rest of that tick ate 0.576 and that other trades moved the shelf after she paid.
- On Beat B the receipt hold is 47.52 and state tick 31 is 46.944. That gap is again 0.576, her demand. The shelf matches on both reads (181.965). The board price moves from 1.54 to 1.78 with no line saying why.
- 28.8 × 1.54 is 44.352. Every quoted total, and the purse, uses 44.35. The screen does not say the total was rounded.
- At state tick 30 two grouped briefing lines put a second period after the quoted sentence: `Crown Harbor.. The first was on day 1.` The Jun Marrow group does the same (`Crown Harbor.. The first was on day 0.`).
- At state tick 135 she is at Crown Harbor with an empty shelf and a price of 4.5, and the starvation item points at Glassport, 4 ticks away and out of reach. It does not say this port has no provisions. The 400 does. Her morale is already 0 while that item still says the shortage costs morale 1.382 per tick.
- The recruit setup line is thinner than a buy. Sequence 1 is `Command queued for Mara Vane` with no cost, and sequence 12 is `Mara Vane: action executed`. Quantity 8 and cost 96 are in the `recruited` payload, not in those two summaries.
