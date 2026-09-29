# Playtest: a haul that sails

Plan only. The session is for a blind operator and is not recorded here. The readings below were taken from the dashboard HTTP API on seed 1847, with the bodies in this file, so the operator can compare. Do not retune a price, a deadline, or a personality to make a carrier accept.

## Hypothesis and ambition

**Milestone hypothesis.** A carrier who is docked somewhere other than the destination can accept a provisions contract, sail there, land the goods, and be paid from escrow once. The price leaves Mara's purse when the offer is applied. A carrier who puts to sea during the one-tick wait refuses under gate `travel`, with a reason the player can read, and that escrow comes back once.

**Player ambition.** Ask Toma Reef, at Cinder Key, to land 10 provisions at Glassport for 40. Watch him leave Cinder Key, arrive at Glassport, and get the 40 on the landing. Then, on a fresh world, ask Corin Hale for a Crown Harbor landing and read the refusal once he is already at sea.

**Success signal.** `PROMOTE` if both beats match the readings below. `REVISE` if Toma is paid before the grain moves, if he accepts while already at Glassport, if the landing event does not add 10 provisions, if the 40 is taken twice or does not reach him, if Corin's refusal is gate `score`, or if either escrow fails to settle once. `ABANDON` if `offer-contract` is `unknown-type`, or if the offer never leaves the purse and the shelf never gains the 10 on a `contract-fulfilled` event.

## Start

`npm run dashboard -- --reset --seed 1847`

The server listens on `http://127.0.0.1:4317`. `GET /api/health` is HTTP 200, `{"ok":true,"tick":0,"events":0}`.

`playerId` is `prototype-player` on every command. Advance with `POST /api/advance`. Never send more than 144 ticks in one call. This plan uses `{"ticks":1}` each time. Read contract events from that response's `events` array (newest first). State is `GET /api/state?limit=200`.

## Beat 1 — Toma sails to Glassport

### Tick 0, before any command

`GET /api/state?limit=200`. HTTP 200.

- `tick` 0
- `party.hold.money` 108
- `contracts` `[]`
- Glassport (`settlements[]`, `id` `glassport`) `stocks.provisions` 145
- `eventPage.total` 0
- Mara Vane, `characters[]` `id` `character-01`: `locationId` `crown-harbor`, `travel` null, `money` 108
- Toma Reef, `id` `character-07`: `locationId` `cinder-key`, `travel` null, `money` null, `cargo` null. He is World Government, and Cinder Key is not, so the card does not show his purse or hold. The offer event will.

### The offer

`POST /api/commands`:

```json
{"playerId":"prototype-player","type":"offer-contract","characterId":"character-07","quantity":10,"destinationId":"glassport","price":40,"expiresInTicks":24}
```

HTTP 202. `command.id` `command-00001`. `command.characterId` `character-07`. `command.price` 40. `command.expiresTick` 24. `command.quantity` 10. `command.destinationId` `glassport`. No `contractId` on the command.

The log gains sequence 1, `player-command-accepted`, summary `Command queued for Mara Vane`. The purse is still 108. `contracts` is still `[]`.

### Advance 1, to state tick 1

`POST /api/advance` with `{"ticks":1}`. HTTP 200. `tick` 1. `ticksAdvanced` 1.

On the response `events`, event `tick` 0, `payloadWithheld` false. Newest first:

- sequence 11, `player-command-resolved`, summary `Mara Vane: contract offered`, `data.outcome` `contract-offered`, `data.contractId` `command-00001:contract`
- sequence 10, `contract-offered`, summary `Mara Vane offered 40 to land 10 provisions at Glassport.`, `data.buyerMoney` 68, `data.carrierMoney` 236, `data.escrow` 40, `data.price` 40, `data.quantity` 10, `data.destinationId` `glassport`, `data.contract.id` `command-00001:contract`, status `offered`

`GET /api/state?limit=200`:

- `tick` 1
- `party.hold.money` 68, and Mara's `money` 68. The 40 is in escrow, not spent twice.
- `contracts`: one row, `command-00001:contract`, `source` `own-character`, `carrierId` `character-07`, `status` `offered`, `price` 40, `quantity` 10, `escrow` 40, `destinationId` `glassport`, `deadlineTick` 24, `revision` 1, `ageTicks` 1
- Toma: `locationId` `cinder-key`, `travel` null, `money` null, `cargo` null. He has not sailed, and he is not at Glassport.
- Glassport `stocks.provisions` 146.011
- `eventPage.total` 185, `hasMore` false

The contract is still `offered`. Scoring waits one tick. That wait stays.

### Advance 1, to state tick 2

`POST /api/advance` with `{"ticks":1}`. HTTP 200. `tick` 2. `ticksAdvanced` 1.

Event `tick` 1, `payloadWithheld` false:

- sequence 192, `contract-accepted`, summary `Toma Reef accepted the provisions contract.`, `data.contract.id` `command-00001:contract`, `data.buyerMoney` 68, `data.carrierMoney` 254.43, `data.escrow` 40, `data.score` 0.703, `data.threshold` 0.576, `data.costBasis` 31.1, `data.travelTicks` 2, `data.ticksLeft` 23, `data.factors.commerce` 0.283, `data.factors.margin` 0.25, `data.factors.trust` 0.069, `data.factors.respect` 0.127, `data.factors.grievance` -0.007, `data.factors.obligation` 0.013, `data.factors.perceivedRisk` -0.032

Acceptance does not take the 40 again. `costBasis` is 31.1, not 0.

`GET /api/state?limit=200`:

- `tick` 2, purse 68, Mara `money` 68
- Contract `status` `accepted`, `escrow` 40, `ageTicks` 1, `observedTick` 1
- Toma: `locationId` null, `travel` `{fromId:"cinder-key",toId:"glassport",totalTicks:2,remainingTicks:2}`, `money` null, `cargo` null
- Glassport `stocks.provisions` 147.022
- `eventPage.total` 270, `hasMore` true, `cursor` 71

### Advance 1, to state tick 3

`POST /api/advance` with `{"ticks":1}`. HTTP 200. `tick` 3. `ticksAdvanced` 1. That response has no `contract-fulfilled` and no `contract-refused`.

State: purse 68. Contract still `accepted`, escrow 40. Toma still at sea, `remainingTicks` 1, same `fromId` and `toId`. Glassport `stocks.provisions` 148.034. `eventPage.total` 361, `cursor` 162.

### Advance 1, to state tick 4

`POST /api/advance` with `{"ticks":1}`. HTTP 200. `tick` 4. `ticksAdvanced` 1. Still no `contract-fulfilled`. He arrives during this tick, after the contract check, so the landing is the next tick.

State:

- purse 68, contract `accepted`, escrow 40
- Toma: `locationId` `glassport`, `travel` null, `money` 248.43, `cargo.provisions` 26.288. Glassport is a World Government port, so the card shows the purse and the hold. He has not been paid. 248.43 plus the escrow 40 is the 288.43 on the next event.
- Glassport `stocks.provisions` 154.966
- `eventPage.total` 473, `cursor` 274

### Advance 1, to state tick 5

`POST /api/advance` with `{"ticks":1}`. HTTP 200. `tick` 5. `ticksAdvanced` 1.

Event `tick` 4, `payloadWithheld` false unless noted. Newest first:

- sequence 482, `relationship-changed`, summary `Toma Reef: relationship changed`, `payloadWithheld` true, `data` null
- sequence 481, `relationship-changed`, summary `Mara Vane: relationship changed`, `data.trigger` `supply contract fulfilled`, `data.characterId` `character-07`, `data.relationship.trust` 0.292, `data.relationship.respect` 0.308, `data.relationship.fear` 0.075, `data.relationship.grievance` 0, `data.relationship.obligation` 0, `data.relationship.affinity` 0.25, `data.relationship.lastChangedTick` 4
- sequence 480, `contract-fulfilled`, summary `Toma Reef landed 10 provisions at Glassport.`, `data.buyerMoney` 68, `data.carrierMoney` 288.43, `data.escrow` 0, `data.quantity` 10, `data.settlementStocks.provisions` 164.966, `data.carrierCargo.provisions` 16.288, `data.contract.id` `command-00001:contract`, status `fulfilled`

The landing is that `contract-fulfilled` event. A `market-trade` on the same response is his own trading after the landing. The delivery event is not a `market-trade`.

`GET /api/state?limit=200`:

- `tick` 5
- `party.hold.money` 68, and Mara's `money` 68. The 40 did not come back.
- Contract `command-00001:contract` status `fulfilled`, `escrow` 0, `price` 40, `revision` 1
- Toma: `locationId` `glassport`, `travel` null, `money` 316.66, `cargo.provisions` 15.864. Those are after he trades on the same tick. The pay is `carrierMoney` 288.43 on sequence 480, which is the 248.43 from state tick 4 plus the escrow 40. The card is not that figure.
- Glassport `stocks.provisions` 180.926. The +10 is on the event: 164.966, which is the state-tick-4 shelf 154.966 plus 10. The port keeps moving after that, so the state shelf at tick 5 is not 164.966.
- `eventPage.total` 590, `hasMore` true, `cursor` 391

Stop this beat here. Do not advance further.

## Beat 2 — a carrier already at sea

Stop the server and start it again with `npm run dashboard -- --reset --seed 1847`. `GET /api/health` is HTTP 200, `{"ok":true,"tick":0,"events":0}`.

`GET /api/state?limit=200`. Purse 108. `contracts` `[]`. Crown Harbor `stocks.provisions` 220. Corin Hale, `id` `character-16`: `locationId` `glassport`, `travel` null, `money` 117, `cargo.provisions` 19.

`POST /api/commands`:

```json
{"playerId":"prototype-player","type":"offer-contract","characterId":"character-16","quantity":10,"destinationId":"crown-harbor","price":30,"expiresInTicks":24}
```

HTTP 202. `command.id` `command-00001`. `command.price` 30. `command.expiresTick` 24. `command.characterId` `character-16`. He is docked, so the command is not `carrier-traveling`. The refusal comes after he sails during the wait.

### Advance 1, to state tick 1

`POST /api/advance` with `{"ticks":1}`. HTTP 200. `tick` 1. `ticksAdvanced` 1.

Events, `payloadWithheld` false, event `tick` 0:

- sequence 11, `player-command-resolved`, summary `Mara Vane: contract offered`, `data.contractId` `command-00001:contract`
- sequence 10, `contract-offered`, summary `Mara Vane offered 30 to land 10 provisions at Crown Harbor.`, `data.buyerMoney` 78, `data.carrierMoney` 117, `data.escrow` 30, `data.quantity` 10

State: purse 78. Contract `command-00001:contract` `offered`, escrow 30, `deadlineTick` 24. Corin: `locationId` null, `money` null, `cargo` null, `travel` `{fromId:"glassport",toId:"cinder-key",totalTicks:2,remainingTicks:2}`. Crown Harbor `stocks.provisions` 226.008. He is at sea. The contract is still `offered`.

### Advance 1, to state tick 2

`POST /api/advance` with `{"ticks":1}`. HTTP 200. `tick` 2. `ticksAdvanced` 1.

Event `tick` 1, sequence 192, `contract-refused`, `payloadWithheld` false:

- summary `Corin Hale refused the provisions contract. The carrier is already at sea.`
- `data.gate` `travel`
- `data.reason` `The carrier is already at sea.`
- `data.score` 0, `data.threshold` 0.599, `data.costBasis` 0, `data.travelTicks` 2, `data.ticksLeft` 23
- `data.buyerMoney` 108, `data.carrierMoney` 117, `data.escrow` 0, `data.quantity` 10
- contract status `refused`, `settled` true

`gate` is `travel`, not `score`. `costBasis` 0 is the sea, where there is no market, and it is not a score. No `relationship-changed` event on that response carries a supply-contract trigger.

State: purse 108, and Mara's `money` 108. Contract escrow 0, status `refused`. Corin still on the same voyage, `remainingTicks` 1, `money` null. Crown Harbor `stocks.provisions` 226.008. Nothing was delivered. Stop. Do not advance again. The escrow has already come back once.
