# Playtest plan: captive intelligence

This is the plan for a blind operator. It is not a completed session. Do not run it as part of writing the change. Do not open `src/`, `tests/`, the branch diff, or `docs/design/` during the session. Use only the dashboard HTTP JSON.

One session. One process. Seed 2718. Mara Vane gives no order. She starts at Crown Harbor and is still there at tick 72 and at tick 156. The captor row is not an event. It is on Mina Vale's character read.

## Setup

- Node `v24.21.0` (`nvm use 24.21.0` if `node -v` is not that). `npm ci` first if `node_modules` is missing.
- Branch `feature/captive-intelligence`. The reading code is `34d8de9`. Record `git rev-parse HEAD` before the first request. A docs-only commit on top of `34d8de9` is the same build.
- One process. `npm run dashboard -- --reset --seed 2718` on `http://127.0.0.1:4317`. Do not start a second seed.
- `GET /api/health` should be HTTP 200 `{"ok":true,"tick":0,"events":0}`.
- The player is already Mara Vane, `character-01`, `playerId` `prototype-player`. Do not pass another character. Do not `POST /api/commands`.
- Read state with `GET /api/state?limit=200`. Omit `beforeSequence` on the first read of a checkpoint. The `events` array is newest-first. Find a checkpoint by its `sequence`. If that sequence is below `eventPage.oldestSequence`, the fallback is `GET /api/state?limit=200&beforeSequence=<eventPage.cursor>`. Both checkpoints in this plan are on the first page. The fallback was not needed.
- `briefing.items` carries the outcome sentence, in `summary`. Quote that sentence. A withheld feed row is not where the captured troop count lives. Sequence 8402 is Mina Vale's `character-captured`, summary `Mina Vale: character captured`, payload withheld. Her 12 troops are on `captiveIntel`, not on that event.
- Advance with `POST /api/advance`. Body `{"ticks":N}`. `N` is an integer from 1 to 144. This plan uses 72, then 84.
- `tick` on an event is the tick the world was on while that event was written. `tick` on the state is one ahead of the events just applied. Advance `day` is unrounded. State `day` is rounded to two places. `12` on the first advance and `12` on the state read are the same tick. The second advance returns day `26`.

The hold checkpoint is state tick 72. The release checkpoint is state tick 156.

## Hypothesis and ambition

**Hypothesis.** With no order from Mara, World Government's reading of Mina Vale at tick 72 is the strength Mina had when she was taken, her live power stays 0, and that reading is gone once she is released.

**Ambition.** `POST /api/advance` with `ticks` 72. `GET /api/state`. Read Mina Vale (`character-15`). Advance 84 more ticks, to tick 156, and read her again.

**What you can see.** On a prisoner Mara's faction holds, `captiveIntel`: leadership, the troop count from the capture, the party power that count gives, and `ports`. Live `troops.count` stays 0 and live `partyPower` stays 0 while she is held beside them. Not her orders, her purse, or a live garrison. Not a row for a prisoner someone else holds. After release, `captiveIntel` is null. `releaseSighting` on Mina, read through Mara, is null. Mara's own character has no `releaseSighting`.

## Characters

| Name | Id | What to watch |
| --- | --- | --- |
| Mara Vane | `character-01` | The player. Her faction holds Mina. Her own `releaseSighting` stays null. |
| Mina Vale | `character-15` | The prisoner. The captor row is on her character. |

## State tick 0

`GET /api/health`. HTTP 200.

```json
{"ok":true,"tick":0,"events":0}
```

`GET /api/state?limit=200`. HTTP 200.

Mara's `locationId` is `crown-harbor`. Her `travel` is null. Mina's `captiveIntel` is null. Mara's `releaseSighting` is null. Mina's `releaseSighting` is null.

`player.displayName` staying `Prototype Commander` is already an open readability item. It is not a failure of this session.

## Advance to tick 72

`POST /api/advance`. HTTP 200.

```json
{"ticks":72}
```

The response has `tick` 72, `day` 12, `ticksAdvanced` 72, and `eventSequence` 8513.

`GET /api/state?limit=200`. HTTP 200. State `tick` is 72. State `day` is 12.

`eventPage` is `count` 200, `total` 8513, `hasMore` true, `oldestSequence` 8314, `newestSequence` 8513, `cursor` 8314.

Sequence 8402 is on that page. Type `character-captured`. Actor `character-15`. Target `world-government`. Settlement `crown-harbor`. Summary `Mina Vale: character captured`. `payloadWithheld` true. `data` is null.

`briefing.items` includes `event:8402`. Its `summary` is `Mina Vale was captured at Crown Harbor after failed retreat`. That sentence is the outcome text. The feed row is the shorter one, because the payload is withheld.

`briefing.attentionCount` is 4 and `briefing.items` has 10 lines. That mismatch is already an open readability item. It is not a failure of this session.

## State tick 72

Mara Vane (`character-01`):

- `locationId` `crown-harbor`
- `travel` null
- `captiveIntel` null
- `releaseSighting` null

Mina Vale (`character-15`):

- `locationId` `crown-harbor`
- `travel` null
- `troops.count` 0
- `partyPower` 0
- `money` 110.08
- `captivity.scatteredTroops.count` 12
- `captivity.capturedTick` 71
- `captivity.captorFactionId` `world-government`
- `captivity.settlementId` `crown-harbor`
- `captivity.cause` `failed-retreat`
- `releaseSighting` null

`captiveIntel`:

| Field | Value |
| --- | --- |
| `characterId` | `character-15` |
| `factionId` | `free-tide` |
| `archetype` | `steward` |
| `settlementId` | `crown-harbor` |
| `leadership` | 25 |
| `troops` | 12 |
| `partyPower` | 60.244 |
| `observedTick` | 71 |
| `ageTicks` | 1 |
| `source` | `direct` |
| `confidence` | 1 |
| `ports` | `[]` |

The 12 on the row is not the live `troops.count`. The live count is 0, and the live `partyPower` is 0.

Crown Harbor's settlement `garrison` on this read is 223. Cinder Key is 7. Glassport is 7. None of those three numbers is on `captiveIntel`. The string `110.08` is Mina's `money` and is not inside `captiveIntel`.

Mina is the only character whose `captiveIntel` is not null.

## Advance to tick 156

`POST /api/advance`. HTTP 200.

```json
{"ticks":84}
```

The response has `tick` 156, `day` 26, `ticksAdvanced` 84, and `eventSequence` 18597.

`GET /api/state?limit=200`. HTTP 200. State `tick` is 156. State `day` is 26.

`eventPage` is `count` 200, `total` 18597, `hasMore` true, `oldestSequence` 18398, `newestSequence` 18597, `cursor` 18398.

Sequence 18482 is on that page. Type `captivity-released`. Actor `character-15`. Target `world-government`. Settlement `crown-harbor`. Summary `Mina Vale: captivity released`. `payloadWithheld` true. `data` is null.

`briefing.items` includes `event:18482`. Its `summary` is `Mina Vale was released from Crown Harbor: 58.13 paid and 0 recorded as debt`. That sentence is the outcome text. The paid amount is not on the feed row.

Sequence 8402 is not on this page. It is below `oldestSequence` 18398. Do not page for it. The hold was already read.

## State tick 156

Mara is still at `crown-harbor` with `travel` null. Her `releaseSighting` is null.

Mina Vale:

- `captivity` null
- `captiveIntel` null
- `releaseSighting` null
- `troops` null
- `partyPower` null
- `money` null
- `locationId` null
- `travel.fromId` `crown-harbor`
- `travel.toId` `glassport`
- `travel.totalTicks` 3
- `travel.remainingTicks` 2

The release record is not on Mara's reading of Mina. That null is the boundary. Do not look for the garrison 208 on this response. It is not on the wire for this player.

## Findings

Leave the played findings blank until the session. These are the boundaries the session is there to see:

- The captured 12 is on `captiveIntel` and is not written into live `troops`.
- `ports` is empty. Cinder Key and Glassport, both garrison 7, are not on the row. Crown Harbor's live garrison 223 is not on the row either.
- Mina's money 110.08 is on her character, because Mara is standing next to her, and it is not inside `captiveIntel`.
- The feed row for the capture does not carry the troop count. The briefing sentence does not either. The count is the character read.
- After release, `captiveIntel` is null, and `releaseSighting` stays null on both characters in this player's state.

Do not mark this file `PROMOTE` until a blind operator has run it.

`PROMOTE` if tick 72 shows 60.244 on the captor row, the live power stays 0, the port list is empty, and tick 156 has no captor row. The same bar includes the boundaries above: sequence 8402 withheld on the first page, sequence 18482 withheld on the second page, the briefing sentences quoted above, and Mina's travel `crown-harbor` → `glassport` with 2 of 3 left.

`REVISE` if the row's `observedTick` moves during the hold with no new capture, or if Cinder Key's live garrison appears on the port list.

`ABANDON` if tick 72 does not show Mina captive at Crown Harbor under World Government. That capture is sequence 8402. A miss means this seed no longer makes it.
