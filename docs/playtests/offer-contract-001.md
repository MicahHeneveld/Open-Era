# Playtest: offer-contract

Run. The sections from **Hypothesis and ambition** through the tick-2 page note are the plan, kept as written, including the readings a prior dashboard run expected. The session record after **Outcome** is what this operator actually got back. Where a cell says the actual value, it was copied from the HTTP response, not from the plan.

## Session

- **Candidate commit:** `6bdfc2b82f79d669af4a65f784ec154d4000ad24` (`6bdfc2b` on `feature/offer-contract` when the session started)
- **Date:** 2026-09-29 UTC
- **Operator:** A fresh-context playtest operator. This operator did not write the change. The run used only the dashboard HTTP JSON API and this plan. `src/`, `tests/`, this branch's diff and log, and `docs/design/contracts.md` were not opened. The world report, the map, and the trace files were not opened.
- **Interface:** Dashboard over HTTP, JSON only (`GET /api/health`, `GET /api/state`, `POST /api/commands`, `POST /api/advance`)
- **Seed:** `1847`
- **Starting tick:** `0`
- **Ending tick:** `2` for the plan. Part 2 is a second `--reset` and ends at tick `2` as well.
- **Player character:** Mara Vane (`character-01`, `playerId` `prototype-player`)

Node was `v24.21.0` (`node -v` after selecting `.node-version`; the image default on `PATH` was v22.14.0). `npm ci` ran first. The process was `npm run dashboard -- --reset --seed 1847` on `http://127.0.0.1:4317`. `GET /api/health` returned HTTP 200 `{"ok":true,"tick":0,"events":0}`.

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

HTTP 400. `code` `contract-already-queued`. `error` `An offer to this carrier is already queued`. The session recorded below was played before that sentence, and its checkpoint quotes the previous one.

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

## Adaptive decision log

The plan fixed every action. Nothing below was chosen in play.

| Tick | Player-visible observation | Reasoning | Action | Outcome |
| ---: | --- | --- | --- | --- |
| 0 | Purse 108. No contracts. Crown Harbor provisions 220. Zara and Orin are both alongside, Zara with 32 provisions | The plan's two offers | `offer-contract` Orin price 8, then Zara price 18, both quantity 10, deadline 12 | Both HTTP 202. A third copy of Zara's body is HTTP 400 `contract-already-queued`. Purse still 108. Contracts still `[]` |
| 0 | Two commands queued | The world has not moved | `POST /api/advance` `{"ticks":1}` | HTTP 200, state tick 1. Purse 82. Two `offered` contracts, escrow 8 and 18. Shelf 226.008. Zara has not been paid |
| 1 | Zara's contract is already price 18, deadline tick 12 | The plan repeats those terms with `expiresInTicks` 11 | Same Zara body, `expiresInTicks` 11 | HTTP 400 `no-change`. Both contracts stay revision 1 |
| 1 | Both offers still open | One more tick is when the plan says they settle | `POST /api/advance` `{"ticks":1}` | HTTP 200, state tick 2. Orin `refused`, escrow 0, purse 90. Zara `fulfilled`, escrow 0, shelf 236.008 |

## Outcome

Mara offered Orin Rill 8 to land 10 provisions at Crown Harbor, and Zara Gale 18 for the same landing. Both offers queued before the clock moved, and the purse stayed 108 until the next tick. On that tick the 8 and the 18 left the purse and sat on the two contracts. Zara's own trading moved her purse to 100.15 and her provisions to 25.94; the contract had not paid her. Saying Zara's terms again changed nothing.

One tick later Orin refused. The 8 came back, his purse stayed 27, and no relationship event names a supply contract with him. Zara accepted without a second charge, then landed 10 provisions on the same tick. The shelf went from 226.008 to 236.008. Her pay is on that landing event: 100.15 became 118.15, and the escrow went to 0. She was already in Crown Harbor, so the grain did not travel. By the time the state was read she had sailed for Glassport, and her card no longer showed a purse or a hold.

## Evidence review

- **World report:** Not opened. The session evidence is the dashboard JSON.
- **Metrics:** Not a separate endpoint in this session. Crown Harbor `stocks.provisions` was read from `settlements[]`.
- **Map:** Not opened. Location and travel are the character cards.
- **Decision/agency traces:** Not opened. The score, the gate, and the money are on the contract events.
- **Conversation traces:** Not opened. No message was sent.
- **Recovery and determinism:** Not run. One dashboard process, seed 1847, `--reset`, from tick 0 to tick 2, then a second `--reset` for Part 2.

### Checkpoint comparison

Quoted strings are the JSON values. Every named reading matched. No row is a mismatch.

| Step | Field | Expected | Actual |
| --- | --- | --- | --- |
| Start | Health | HTTP 200 `{"ok":true,"tick":0,"events":0}` | HTTP 200 `{"ok":true,"tick":0,"events":0}` |
| Tick 0 | `tick`, purse, contracts, shelf, `eventPage.total` | 0, 108, `[]`, 220, 0 | 0, `party.hold.money` 108, `contracts` `[]`, Crown Harbor `stocks.provisions` 220, `eventPage.total` 0 |
| Tick 0 | Mara | `crown-harbor`, `travel` null, `money` 108 | `locationId` `crown-harbor`, `travel` null, `money` 108 |
| Tick 0 | Zara | `crown-harbor`, `travel` null, `money` 93, `cargo.provisions` 32, `standingOrders` `[]` | Those values |
| Tick 0 | Orin | `crown-harbor`, `travel` null, `money` 123 | Those values |
| Orin offer | HTTP, id, type, character, price, deadline | 202, `command-00001`, `offer-contract`, `character-09`, 8, `expiresTick` 12, no `contractId` | HTTP 202. Body `{"ok":true,"command":{"id":"command-00001","playerId":"prototype-player","issuedTick":0,"type":"offer-contract","characterId":"character-09","quantity":10,"destinationId":"crown-harbor","price":8,"expiresTick":12}}`. No `contractId` key |
| Zara offer | HTTP, id, price, deadline, character | 202, `command-00002`, 18, `expiresTick` 12, `character-17` | HTTP 202. `command.id` `command-00002`, `command.price` 18, `command.expiresTick` 12, `command.characterId` `character-17` |
| Zara again, before advance | HTTP, code, error | 400, `contract-already-queued`, `Another command already queued will act on that contract` | HTTP 400 `{"ok":false,"code":"contract-already-queued","error":"Another command already queued will act on that contract"}` |
| After the posts | State | tick 0, purse 108, `contracts` `[]`, two pending commands `command-00001` and `command-00002`, two `player-command-accepted` summaries `Command queued for Mara Vane`, sequences 1 and 2 | Those values. `pendingCommands` length 2. Escrow has not moved |
| Advance to tick 1 | HTTP | 200, `tick` 1, `ticksAdvanced` 1 | HTTP 200, `tick` 1, `ticksAdvanced` 1 |
| Tick 0 events | sequences 14, 13, 12, 11 | `player-command-resolved` / `contract-offered` for Zara, then the same pair for Orin. Zara: `buyerMoney` 82, `carrierMoney` 93, `escrow` 18, `price` 18, `quantity` 10, id `command-00002:contract`, summary `Mara Vane offered 18 to land 10 provisions at Crown Harbor.`, outcome `contract-offered`. Orin: `buyerMoney` 100, `carrierMoney` 123, `escrow` 8, summary `Mara Vane offered 8 to land 10 provisions at Crown Harbor.`, id `command-00001:contract`. `payloadWithheld` false. Event `tick` 0 | Those sequences, summaries, ids, and numbers. Both resolved summaries are `Mara Vane: contract offered` |
| State tick 1 | Purse, pending, shelf, page | 82, Mara `money` 82, pending length 0, shelf 226.008, `eventPage.total` 188, `hasMore` false | `party.hold.money` 82, Mara `money` 82, `pendingCommands` length 0, Crown Harbor `stocks.provisions` 226.008, `eventPage.total` 188, `hasMore` false, `oldestSequence` 1, `newestSequence` 188 |
| State tick 1 | Zara | `crown-harbor`, `travel` null, `money` 100.15, `cargo.provisions` 25.94, `standingOrders` `[]`. Escrow still 18 | Those values. Her contract `escrow` is 18 |
| State tick 1 | Orin | `crown-harbor`, `travel` null, `money` 27. Escrow still 8 | Those values. His contract `escrow` is 8 |
| State tick 1 | Contracts | both `source` `own-character`, `quantity` 10, `status` `offered`, `revision` 1, `ageTicks` 1. Orin `command-00001:contract` price 8 escrow 8 deadline 12. Zara `command-00002:contract` price 18 escrow 18 deadline 12 | Those values |
| Zara restated | HTTP, code, error, revisions | 400, `no-change`, `The offer does not change the contract`. Pending stays empty. Both revision 1 | HTTP 400 `{"ok":false,"code":"no-change","error":"The offer does not change the contract"}`. `pendingCommands` length 0. Both `revision` 1 |
| Advance to tick 2 | HTTP, market | 200, `tick` 2, `ticksAdvanced` 1. No `market-trade` on that response | HTTP 200, `tick` 2, `ticksAdvanced` 1. That response's `events` contain no `type` `market-trade` |
| Tick 1 events | 195 refusal | `Orin Rill refused the provisions contract.` id `command-00001:contract`, `gate` `score`, `score` 0.053, `threshold` 0.602, `costBasis` 14.3, `buyerMoney` 90, `carrierMoney` 27, `escrow` 0, `factors.margin` -0.25. No supply-contract relationship for Orin | Sequence 195, event `tick` 1, `payloadWithheld` false. That summary and those numbers. No `relationship-changed` event in either advance response, or on either state page, carries a supply-contract trigger for `character-09` |
| Tick 1 events | 196 acceptance | `Zara Gale accepted the provisions contract.` id `command-00002:contract`, `buyerMoney` 90, `carrierMoney` 100.15, `escrow` 18, `score` 0.697, `threshold` 0.561, `costBasis` 14.3, `factors.margin` 0.25 | Sequence 196. That summary and those numbers. Escrow stays 18 |
| Tick 1 events | 197 fulfilment | `Zara Gale landed 10 provisions at Crown Harbor.` `buyerMoney` 90, `carrierMoney` 118.15, `escrow` 0, `quantity` 10, `settlementStocks.provisions` 236.008, `carrierCargo.provisions` 15.94 | Sequence 197. That summary and those numbers |
| Tick 1 events | 198, 199 relationships | Mara: `supply contract fulfilled`, trust 0.292, respect 0.308, fear 0.075, grievance 0, obligation 0, affinity 0.25, `lastChangedTick` 1, character `character-17`. Zara: summary `Zara Gale: relationship changed`, `payloadWithheld` true, `data` null | Sequence 198 `trigger` `supply contract fulfilled` and that relationship object. Sequence 199 `payloadWithheld` true, `data` null, summary `Zara Gale: relationship changed` |
| State tick 2 | Purse, shelf | 90, and Mara `money` 90. Shelf 236.008 | `party.hold.money` 90, Mara `money` 90, Crown Harbor `stocks.provisions` 236.008 |
| State tick 2 | Zara card | `locationId` null, `travel` `{fromId:"crown-harbor",toId:"glassport",totalTicks:4,remainingTicks:4}`, `money` null, `cargo` null | Those values |
| State tick 2 | Orin card | `locationId` null, `money` null | `locationId` null, `money` null, `cargo` null. His `travel` is `{fromId:"crown-harbor",toId:"cinder-key",totalTicks:4,remainingTicks:4}` |
| State tick 2 | Contracts | Orin `refused` price 8 escrow 0 revision 1. Zara `fulfilled` price 18 escrow 0 revision 1 | Those values |
| State tick 2 | Page | `eventPage.total` 277, `hasMore` true, `oldestSequence` 78, `newestSequence` 277, `cursor` 78. Older page `beforeSequence` 78 has `oldestSequence` 1, `hasMore` false, and sequences 11 and 13 | Those page fields. `GET /api/state?limit=200&beforeSequence=78` is HTTP 200, `oldestSequence` 1, `newestSequence` 77, `hasMore` false, and holds sequence 11 (`contract-offered`, the 8) and sequence 13 (`contract-offered`, the 18) |

### Conservation

Mara started at 108. The contract money is the purse plus the escrow plus what a carrier was actually paid.

- After both offers, on the tick-0 events: purse 100 with Orin's escrow 8, then purse 82 with Zara's escrow 18. 82 + 8 + 18 = 108. The offer events leave Orin at 123 and Zara at 93. Neither was paid the price.
- At state tick 1 the purse is 82 and the escrows are still 8 and 18. Zara's card reads 100.15 and Orin's reads 27. Those are their own moves. The escrows have not been paid out. 82 + 8 + 18 is still 108.
- Refusal, sequence 195, before Zara is paid: `buyerMoney` 90, Orin `carrierMoney` 27, his `escrow` 0. The 8 is back in the purse. 90 + Zara's escrow 18 = 108. Orin did not gain the 8.
- Acceptance, sequence 196: `buyerMoney` 90, Zara `carrierMoney` 100.15, `escrow` 18. The 18 was not taken a second time.
- Fulfilment, sequence 197: `buyerMoney` 90, Zara `carrierMoney` 118.15, `escrow` 0. 100.15 + 18 = 118.15, so she was paid once from the escrow. End of the contract ledger: purse 90 + escrow 0 + 18 paid to Zara = 108. The refunded 8 is inside the 90.

The shelf's extra 6.008, from 220 to 226.008, is already on the board before the landing. The landing itself is 226.008 to 236.008, and Zara's hold on that event is 15.94, which is the 25.94 she was showing minus 10. No money appears or disappears.

## Findings

### What worked

- The price left the purse when the offer was applied, sat on `escrow`, and was not taken again when Zara accepted.
- Orin's refusal returned the 8 once and did not pay him. It wrote no supply-contract relationship.
- Zara was paid 18 once, on the landing, and Crown Harbor gained 10 provisions on that same event. The tick-2 advance has no `market-trade`.
- A second queued offer for Zara was refused before any advance, and restating the live terms was `no-change`.
- The two ids are `command-00001:contract` and `command-00002:contract`.

### Implementation defects

None observed against the plan. Every named reading matched.

### Design risks and opportunities

- Zara was already at Crown Harbor with 32 provisions aboard, so the kept haul never left the dock. A player who wanted to watch a voyage did not get one. That is why Part 2 exists. It does not miss the success signal.
- The contract card jumps from `offered` at state tick 1 to `fulfilled` at state tick 2. Status `accepted` is on the event only. A player who reads state once per tick never sees it.
- Once Zara and Orin sail, `money` and `cargo` on their cards are null. The 118.15 she was paid, and the 27 he still held, exist on the events and then drop out of the roster.
- The duplicate-queue error said `Another command already queued will act on that contract` while `contracts` was still `[]`. The command was queued, and a contract id did not exist yet. That pending-offer case now says `An offer to this carrier is already queued`. The code is still `contract-already-queued`. A mutation queued against a contract that already exists keeps the older sentence.
- `expiresInTicks` 11 against a deadline already stored as tick 12 is `The offer does not change the contract`. The relative field changed. The absolute deadline did not.
- Orin's order card, on tick 0, already says he refused a protect order: `Orin Rill refused the protect order after weighing loyalty, risk, and ambition.` The provisions refusal is a different sentence, one tick later. The two are easy to mix up, and only the provisions refusal moves the escrow.

### Follow-up experiments

Part 2, below, is the one the plan's own shape suggests: a carrier who is not already alongside with the grain.

## Part 2 — a haul that is not already at the dock

This section does not change the verdict. After the plan, the dashboard was started again with `npm run dashboard -- --reset --seed 1847`. `GET /api/health` was HTTP 200 `{"ok":true,"tick":0,"events":0}`.

At tick 0, `GET /api/state?limit=200`. Mara's purse was 108. Crown Harbor `stocks.provisions` was 220. Every character card at Crown Harbor that showed a hold had at least 18 provisions (Orin Frost, `character-29`, had 18). Nobody alongside was short of a 10-provision delivery. Cards at Verdant Cay and Cinder Key had `money` null and `cargo` null, so their holds could not be read. Glassport could. Corin Hale (`character-16`, faction `free-tide`) was at `glassport`, `travel` null, `money` 117, `cargo.provisions` 19, `standingOrders` `[]`, `relationship` null. He is not at Crown Harbor, and 19 is enough grain to land 10, so he has to sail it.

Offer, still on tick 0:

```json
{"playerId":"prototype-player","type":"offer-contract","characterId":"character-16","quantity":10,"destinationId":"crown-harbor","price":30,"expiresInTicks":24}
```

HTTP 202. `command.id` `command-00001`, `command.price` 30, `command.expiresTick` 24, `command.characterId` `character-16`. State between that POST and the first advance was not read.

`POST /api/advance` `{"ticks":1}` then `{"ticks":1}`. The contract was terminal at state tick 2, so the run stopped there, inside the 40-tick cap.

| State tick | Purse | Contract | Escrow | Crown Harbor provisions | Corin |
| ---: | ---: | --- | ---: | ---: | --- |
| 1 | 78 | `command-00001:contract` `offered`, price 30, revision 1, `deadlineTick` 24 | 30 | 226.008 | `locationId` null, `money` null, `cargo` null, `travel` `glassport` → `cinder-key`, `totalTicks` 2, `remainingTicks` 2 |
| 2 | 108 | same id, `refused`, price 30, revision 1, escrow 0 | 0 | 226.008 | same voyage, `remainingTicks` 1, `money` null, `cargo` null |

Tick 0 events, `payloadWithheld` false:

- sequence 10, `contract-offered`, summary `Mara Vane offered 30 to land 10 provisions at Crown Harbor.`, `buyerMoney` 78, `carrierMoney` 117, `escrow` 30, `quantity` 10, contract id `command-00001:contract`, status `offered`
- sequence 11, `player-command-resolved`, summary `Mara Vane: contract offered`, `data.outcome` `contract-offered`, `data.contractId` `command-00001:contract`

On that same tick, still before the refusal, Corin's card is already at sea for Cinder Key. His withheld events include sequence 103 `standing-order-accepted` (`Corin Hale: standing order accepted`), sequence 104 `decision-made`, and sequence 105 `travel-started`. The payloads are withheld, so the order he accepted is not readable. At the tick-0 survey his `standingOrders` was `[]`.

Tick 1 event, sequence 192, `contract-refused`, summary `Corin Hale refused the provisions contract.`, `payloadWithheld` false:

- `gate` `score`, `score` 0.15, `threshold` 0.599
- `costBasis` 0, `factors.margin` 0, `factors.commerce` 0.14, `factors.trust` 0.049, `factors.respect` 0.056, `factors.grievance` 0, `factors.obligation` 0, `factors.perceivedRisk` -0.095
- `travelTicks` 1, `ticksLeft` 23
- `buyerMoney` 108, `carrierMoney` 117, `escrow` 0, `quantity` 10
- contract status `refused`, `acceptedTick` null, `settled` true

He did not accept, he did not turn toward Crown Harbor, and nothing was delivered. The shelf stayed 226.008. There is no fulfilment, breach, or expiry.

Conservation: 108 at the start. After the offer, purse 78 + escrow 30 = 108, and his event purse is still 117. After the refusal, purse 108 + escrow 0 = 108, and `carrierMoney` is still 117. The 30 came back once. He was not paid. No money appeared or disappeared.

A player would find three things odd. The price was 30, and the score still records `costBasis` 0 and `margin` 0, so the 30 never shows up as a margin. He left for Cinder Key, two ticks the other way, on the tick the offer was applied, and the contract event does not say that. And as soon as he sailed, the 19 provisions and the 117 that had been on his card became null; the refusal event is the only later purse figure, and it did not move.

That score is not the travel gate. He was already at sea when the offer was judged, `travelDuration` reported 1, and 1 did not exceed the 23 ticks left, so the assessment scored a market price of 0. An underway carrier now refuses under `gate` `travel`, reason `The carrier is already at sea.`, before any score, and the escrow still comes back once.

## Recommendation

`PROMOTE`

The success signal was the two contract ids, Mara's money at 108, then 82, then 90, the escrows, Zara's payment, Orin's refund, and Crown Harbor's shelf. All of those matched the plan, on seed 1847, through the dashboard JSON. Zara was paid on the landing, from the escrow, once. Orin's 8 came back once and was not paid to him. The shelf gained 10 on the fulfilment event, and that event is not a `market-trade`. `offer-contract` was accepted and did leave the purse.

Part 2 does not enter this verdict. The carrier who was not already at Crown Harbor was scored while at sea (`gate` `score`, `score` 0.15, `threshold` 0.599, `costBasis` 0), and the escrow came back once. That judgment was the missing travel gate, not a price he declined.
