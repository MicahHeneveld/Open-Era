# Playtest: offer-contract

Unrun. A blind operator plays this. Do not treat the readings below as a verdict. They are what the dashboard returned on this branch, seed 1847, Node v24.21.0, when the plan was checked. The operator confirms them.

## Session

- **Candidate commit:** HEAD of `feature/offer-contract` when the session starts
- **Date:** unrun
- **Operator:** a blind operator who did not write the change
- **Interface:** Dashboard over HTTP, JSON only (`GET /api/health`, `GET /api/state`, `POST /api/commands`, `POST /api/advance`)
- **Seed:** `1847`
- **Starting tick:** `0`
- **Ending tick:** `2`
- **Player character:** Mara Vane (`character-01`, `playerId` `prototype-player`)

## Hypothesis and ambition

**Milestone hypothesis.** Paying for a delivery takes the price into escrow when the offer is applied. One haul is kept and the carrier is paid from that escrow, once. One haul is refused and the escrow comes back, once, without paying the carrier.

**Player ambition.** Ask Orin Rill to land 10 provisions at Crown Harbor for 8, and ask Zara Gale to land 10 there for 18. See the money leave, see Orin refuse, and see Zara's grain arrive with the 18.

**Success signal.** `PROMOTE` if the two contract ids, Mara's money (108, then 82, then 90), the escrows, Zara's payment, Orin's refund, and Crown Harbor's shelf match the readings below. `REVISE` if Zara is paid before the grain moves, if Orin's 8 is not returned, if the shelf does not gain 10, or if a `market-trade` is the delivery. `ABANDON` if `offer-contract` is rejected as `unknown-type`, or if the offer never leaves the purse and never changes the shelf.

## Start

`npm run dashboard -- --reset --seed 1847`

The server listens on `http://127.0.0.1:4317`. `GET /api/health` is HTTP 200, `{"ok":true,"tick":0,"events":0}`.

Advance with `POST /api/advance` and `{"ticks":1}`. Do not send more than 144 ticks in one call. Read contract events from that response's `events` array (newest first). State is `GET /api/state?limit=200`. When `eventPage.hasMore` is true, the older page is `GET /api/state?limit=200&beforeSequence=<eventPage.cursor>`.

## Tick 0, before any command

`GET /api/state?limit=200`. HTTP 200.

- `tick` 0
- `party.hold.money` 108
- `contracts` `[]`
- Crown Harbor (`settlements[]`, `id` `crown-harbor`) `stocks.provisions` 220
- `eventPage.total` 0
- Mara Vane, `characters[]` `id` `character-01`: `locationId` `crown-harbor`, `travel` null, `money` 108
- Zara Gale, `id` `character-17`: `locationId` `crown-harbor`, `travel` null, `money` 93, `cargo.provisions` 32, `standingOrders` `[]`
- Orin Rill, `id` `character-09`: `locationId` `crown-harbor`, `travel` null, `money` 123

## Tick 0, the two offers

`POST /api/commands` with this body first:

```json
{"playerId":"prototype-player","type":"offer-contract","characterId":"character-09","quantity":10,"destinationId":"crown-harbor","price":8,"expiresInTicks":12}
```

HTTP 202. `command.id` is `command-00001`. `command.type` is `offer-contract`. `command.characterId` is `character-09`. `command.price` is 8. `command.expiresTick` is 12. There is no `contractId` on this command.

Then:

```json
{"playerId":"prototype-player","type":"offer-contract","characterId":"character-17","quantity":10,"destinationId":"crown-harbor","price":18,"expiresInTicks":12}
```

HTTP 202. `command.id` is `command-00002`. `command.price` is 18. `command.expiresTick` is 12. `command.characterId` is `character-17`.

The same Zara body a second time, still before any advance:

HTTP 400. `code` `contract-already-queued`. `error` `Another command already queued will act on that contract`.

`GET /api/state?limit=200` is still `tick` 0. `party.hold.money` is still 108. `contracts` is still `[]`. `pendingCommands` length 2, ids `command-00001` and `command-00002`. The log has two `player-command-accepted` events, both summary `Command queued for Mara Vane`, sequences 1 and 2. Escrow has not moved.

## Advance 1, to state tick 1

`POST /api/advance` with `{"ticks":1}`. HTTP 200. `tick` 1. `ticksAdvanced` 1.

On the response `events`, event `tick` 0, `payloadWithheld` false. The array is newest first:

- sequence 14, `player-command-resolved`, summary `Mara Vane: contract offered`, `data.outcome` `contract-offered`, `data.contractId` `command-00002:contract`
- sequence 13, `contract-offered`, summary `Mara Vane offered 18 to land 10 provisions at Crown Harbor.`, `data.buyerMoney` 82, `data.carrierMoney` 93, `data.escrow` 18, `data.price` 18, `data.quantity` 10, `data.contract.id` `command-00002:contract`
- sequence 12, `player-command-resolved`, summary `Mara Vane: contract offered`, `data.contractId` `command-00001:contract`
- sequence 11, `contract-offered`, summary `Mara Vane offered 8 to land 10 provisions at Crown Harbor.`, `data.buyerMoney` 100, `data.carrierMoney` 123, `data.escrow` 8, `data.price` 8, `data.quantity` 10, `data.contract.id` `command-00001:contract`

`GET /api/state?limit=200`:

- `tick` 1
- `party.hold.money` 82, and Mara's `money` 82
- `pendingCommands` length 0
- Crown Harbor `stocks.provisions` 226.008
- `eventPage.total` 188, `hasMore` false
- Zara: `locationId` `crown-harbor`, `travel` null, `money` 100.15, `cargo.provisions` 25.94, `standingOrders` `[]`. The 100.15 is her own trade. The contract has not paid her. Escrow is still 18.
- Orin: `locationId` `crown-harbor`, `travel` null, `money` 27. He spent on his own after the offer. The contract did not pay him. Escrow is still 8.
- `contracts`, two rows, both `source` `own-character`, both `quantity` 10, both `status` `offered`, both `revision` 1, both `ageTicks` 1:
  - `command-00001:contract`, `carrierId` `character-09`, `price` 8, `escrow` 8, `deadlineTick` 12
  - `command-00002:contract`, `carrierId` `character-17`, `price` 18, `escrow` 18, `deadlineTick` 12

## The same Zara terms again

`POST /api/commands`:

```json
{"playerId":"prototype-player","type":"offer-contract","characterId":"character-17","quantity":10,"destinationId":"crown-harbor","price":18,"expiresInTicks":11}
```

`expiresInTicks` is 11, not 12. The deadline already stored is tick 12, and the world is on tick 1.

HTTP 400. `code` `no-change`. `error` `The offer does not change the contract`. `pendingCommands` stays empty. Both contracts stay revision 1.

## Advance 1, to state tick 2

`POST /api/advance` with `{"ticks":1}`. HTTP 200. `tick` 2. `ticksAdvanced` 1.

That response has no event whose `type` is `market-trade`. The `events` array is newest first. The rows below are by sequence. Event `tick` is 1. `payloadWithheld` is false unless noted:

- sequence 195, `contract-refused`, summary `Orin Rill refused the provisions contract.`, `data.contract.id` `command-00001:contract`, `data.gate` `score`, `data.score` 0.053, `data.threshold` 0.602, `data.costBasis` 14.3, `data.buyerMoney` 90, `data.carrierMoney` 27, `data.escrow` 0, `data.factors.margin` -0.25. No `relationship-changed` event carries a supply-contract trigger for Orin.
- sequence 196, `contract-accepted`, summary `Zara Gale accepted the provisions contract.`, `data.contract.id` `command-00002:contract`, `data.buyerMoney` 90, `data.carrierMoney` 100.15, `data.escrow` 18, `data.score` 0.697, `data.threshold` 0.561, `data.costBasis` 14.3, `data.factors.margin` 0.25. Acceptance does not take the 18 again. Mara's purse is already 90 because Orin's 8 came back earlier in this same tick.
- sequence 197, `contract-fulfilled`, summary `Zara Gale landed 10 provisions at Crown Harbor.`, `data.buyerMoney` 90, `data.carrierMoney` 118.15, `data.escrow` 0, `data.quantity` 10, `data.settlementStocks.provisions` 236.008, `data.carrierCargo.provisions` 15.94
- sequence 198, `relationship-changed`, summary `Mara Vane: relationship changed`, `data.trigger` `supply contract fulfilled`, `data.characterId` `character-17`, `data.relationship.trust` 0.292, `data.relationship.respect` 0.308, `data.relationship.fear` 0.075, `data.relationship.grievance` 0, `data.relationship.obligation` 0, `data.relationship.affinity` 0.25, `data.relationship.lastChangedTick` 1
- sequence 199, `relationship-changed`, summary `Zara Gale: relationship changed`, `payloadWithheld` true, `data` null

`GET /api/state?limit=200`:

- `tick` 2
- `party.hold.money` 90, and Mara's `money` 90. The 18 did not come back.
- Crown Harbor `stocks.provisions` 236.008. That is 10 more than 226.008.
- Zara: `locationId` null, `travel` `{fromId:"crown-harbor",toId:"glassport",totalTicks:4,remainingTicks:4}`, `money` null, `cargo` null. She has sailed, so the payment is the fulfilment event's `carrierMoney` 118.15, not this row.
- Orin: `locationId` null, `money` null. His refund is the refusal event: `buyerMoney` 90, `carrierMoney` 27, `escrow` 0.
- `contracts`:
  - `command-00001:contract` status `refused`, `price` 8, `escrow` 0, `revision` 1
  - `command-00002:contract` status `fulfilled`, `price` 18, `escrow` 0, `revision` 1
- `eventPage.total` 277, `hasMore` true, `oldestSequence` 78, `newestSequence` 277, `cursor` 78

The tick-0 offers are not on that page. `GET /api/state?limit=200&beforeSequence=78` has `oldestSequence` 1, `hasMore` false, and holds sequences 11 and 13.

## Outcome

Unrun.

## Recommendation

Unrun. The operator writes `PROMOTE`, `REVISE`, or `ABANDON` after the session.
