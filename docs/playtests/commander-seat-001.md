# Playtest plan: command seat

This is the plan for a blind operator. It is not a completed session. Do not run it as part of writing the change. Do not open `src/`, `tests/`, the branch diff, or `docs/design/` during the session. Use only the dashboard HTTP JSON.

Two beats. Reset before each one. Send no commands and no messages. A command or a message makes the numbers below wrong.

The political-layer note expected Pax Ash captured at event tick 310 on seed 4096, with Corin Hale (`character-16`) covering until event tick 394. That capture does not happen on this tree. Through state tick 2400, with no commands, neither Mara Vane (`character-01`) nor Pax Ash (`character-14`) is captured on seeds 1847, 2718, or 4096. There is no regency to read. The seat you can see is the name, with no cover.

## Setup

- Node `v24.21.0` (`nvm use 24.21.0` if `node -v` is not that). `npm ci` first if `node_modules` is missing.
- Branch `feature/commander-seat`. Record `git rev-parse HEAD` before the first request.
- `npm run dashboard -- --reset --seed 4096` on `http://127.0.0.1:4317`. Beat B uses `--seed 2718` and a fresh process. Do not reuse the seed 4096 database.
- `GET /api/health` should be HTTP 200 `{"ok":true,"tick":0,"events":0}`.
- The player is already Mara Vane, `character-01`, `playerId` `prototype-player`. Do not pass another character. Do not `POST /api/commands`.
- Read state with `GET /api/state?limit=200`. Omit `beforeSequence` on the first read of a checkpoint. The page is newest-last in `eventPage` and the `events` array is newest-first. Find a checkpoint by its `sequence`.
- `briefing.items` carries the outcome sentence. The event feed does not, when `payloadWithheld` is true. Quote the briefing sentence. Do not expect that sentence on the event.
- Advance with `POST /api/advance`. Body `{"ticks":N}`. `N` is an integer from 1 to 144. This plan uses 144, 144, and 112.
- `tick` on an event is the tick the world was on while that event was written. `tick` on the state is the tick after that advance. Advance `day` is unrounded. State `day` is rounded to two places.

The seat checkpoint is the faction row, not an event. There is no `character-captured` for Mara or Pax in these 400 ticks, so do not page the log looking for one.

## Hypothesis and ambition

**Hypothesis.** At state tick 0 and again at state tick 400, World Government's `commanderId` is `character-01` and Free Tide's is `character-14`. Both `actingCommanderId` values are null. Free Tide's `treasury` and `power` stay null. No cover appears, because neither holder is captured.

**Ambition.** Stay at Crown Harbor. Send nothing. Read the faction list at the start and after 400 ticks, on seed 4096 and again on seed 2718.

**What you can see.** Who holds each seat, and that a rival's purse and power are null. Not another captain's captivity once they have left your dock. At state tick 0 Pax is at `crown-harbor` with Mara, so his `captivity: null` is the real value. At state tick 400 he is at `glassport`, and a rival's captivity is withheld, so `captivity: null` there means unknown. Use the faction row.

## Characters

| Name | Id | What to watch |
| --- | --- | --- |
| Mara Vane | `character-01` | The player. Stays at `crown-harbor`. World Government's commander. |
| Pax Ash | `character-14` | Free Tide's commander. Not captured in this window. |

## Beat A — seed 4096

Reset. `npm run dashboard -- --reset --seed 4096`.

### State tick 0

`GET /api/health`. HTTP 200.

```json
{"ok":true,"tick":0,"events":0}
```

`GET /api/state?limit=200`. HTTP 200.

- `tick` 0. `day` 0. `commanderId` `character-01`.
- `party.name` `Mara Vane`. `party.locationId` `crown-harbor`.
- `briefing.attentionCount` 0. `briefing.items` is `[]`.
- `eventPage` count 0, limit 200, total 0, `hasMore` false, `oldestSequence` null, `newestSequence` null, `cursor` null.
- Factions, in this order:

| id | name | commanderId | actingCommanderId | treasury | power |
| --- | --- | --- | --- | --- | --- |
| `free-tide` | Free Tide Compact | `character-14` | null | null | null |
| `world-government` | World Government | `character-01` | null | 18000 | 2392.28 |

Pax Ash, `characters` id `character-14`: `locationId` `crown-harbor`, `captivity` null.

No checkpoint event. Nothing to page.

### Advance to state tick 400

Three requests. Do not match the advance `events` array line by line. It is the whole interval. Read the seat from the GET after the third.

1. `POST /api/advance` `{"ticks":144}`. HTTP 200. `ok` true. `tick` 144. `ticksAdvanced` 144. `day` 24. `combatUpdated` false. `attentionUpdated` false. `pausedForBattle` false.
2. `POST /api/advance` `{"ticks":144}`. HTTP 200. `tick` 288. `ticksAdvanced` 144. `day` 48. The three flags stay false.
3. `POST /api/advance` `{"ticks":112}`. HTTP 200. `tick` 400. `ticksAdvanced` 112. `day` 66.66666666666667. The three flags stay false.

### State tick 400

`GET /api/state?limit=200`. HTTP 200.

- `tick` 400. `day` 66.67. `commanderId` `character-01`.
- `party.name` `Mara Vane`. `party.locationId` `crown-harbor`.
- `eventPage` count 200, limit 200, total 49045, `hasMore` true, `oldestSequence` 48846, `newestSequence` 49045, `cursor` 48846.
- The same two faction rows. Free Tide `commanderId` is still `character-14`, `actingCommanderId` null, `treasury` null, `power` null. World Government `commanderId` is still `character-01`, `actingCommanderId` null, `treasury` 28076.69, `power` 2776.78.

`briefing.attentionCount` 3. `briefing.items`, in order, outcome text exact:

1. id `provision:critical`, title `The party is starving`, summary `The hold is empty and 0.592 provisions per tick cannot be found. That costs health 0.474 and morale 1.421 per tick. Morale gains nothing while the shortage lasts, so it will not recover on its own. Glassport is 4 ticks by report away — out of reach, which is short by 4 ticks.`
2. id `intel:verdant-cay:0`, title `Intelligence is stale`, summary `Verdant Cay's report predates your arrival and has never been refreshed.`
3. id `intel:cinder-key:0`, title `Intelligence is stale`, summary `Cinder Key's report predates your arrival and has never been refreshed.`

No checkpoint event on this beat. The first page is sequences 48846 through 49045. Do not walk `beforeSequence` looking for a capture of `character-01` or `character-14`. There isn't one in the 49045 events.

## Beat B — seed 2718

Stop the dashboard. `npm run dashboard -- --reset --seed 2718` on `http://127.0.0.1:4317`.

### State tick 0

`GET /api/health`. HTTP 200 `{"ok":true,"tick":0,"events":0}`.

`GET /api/state?limit=200`. HTTP 200.

- `tick` 0. `day` 0. `commanderId` `character-01`. `party.name` `Mara Vane`. `party.locationId` `crown-harbor`.
- `briefing.attentionCount` 0. `briefing.items` is `[]`.
- `eventPage` count 0, total 0, `hasMore` false.
- Factions:

| id | name | commanderId | actingCommanderId | treasury | power |
| --- | --- | --- | --- | --- | --- |
| `free-tide` | Free Tide Compact | `character-14` | null | null | null |
| `world-government` | World Government | `character-01` | null | 18000 | 2475.55 |

No checkpoint event.

### Advance to state tick 400

The same three bodies as Beat A.

1. `POST /api/advance` `{"ticks":144}`. HTTP 200. `tick` 144. `ticksAdvanced` 144. `day` 24. `combatUpdated` false. `attentionUpdated` false. `pausedForBattle` false.
2. `POST /api/advance` `{"ticks":144}`. HTTP 200. `tick` 288. `ticksAdvanced` 144. `day` 48. The three flags stay false.
3. `POST /api/advance` `{"ticks":112}`. HTTP 200. `tick` 400. `ticksAdvanced` 112. `day` 66.66666666666667. The three flags stay false.

### State tick 400

`GET /api/state?limit=200`. HTTP 200.

- `tick` 400. `day` 66.67. `commanderId` `character-01`. `party.locationId` `crown-harbor`.
- `eventPage` count 200, limit 200, total 50942, `hasMore` true, `oldestSequence` 50743, `newestSequence` 50942, `cursor` 50743.
- Free Tide `commanderId` `character-14`, `actingCommanderId` null, `treasury` null, `power` null.
- World Government `commanderId` `character-01`, `actingCommanderId` null, `treasury` 27393.33, `power` 3108.92.

`briefing.attentionCount` 5. `briefing.items`, outcome text exact:

1. id `provision:critical`, title `The party is starving`, summary `The hold is empty and 0.492 provisions per tick cannot be found. That costs health 0.394 and morale 1.181 per tick. Morale gains nothing while the shortage lasts, so it will not recover on its own. Glassport is 4 ticks by report away — out of reach, which is short by 4 ticks.`
2. id `intel:verdant-cay:0`, title `Intelligence is stale`, summary `Verdant Cay's report predates your arrival and has never been refreshed.`
3. id `intel:glassport:0`, title `Intelligence is stale`, summary `Glassport's report predates your arrival and has never been refreshed.`
4. id `event:50084`, title `battle resolved`, summary `Esme Dusk lost at Crown Harbor`
5. id `event:48666`, title `battle resolved`, summary `Mina Vale lost at Crown Harbor`

Those two sentences live on `briefing.items`. They are not the feed summary.

The first page is sequences 50743 through 50942. Neither checkpoint is on it.

`GET /api/state?limit=200&beforeSequence=50085`. HTTP 200. `eventPage.total` 50942, `oldestSequence` 49885, `newestSequence` 50084, count 200, `hasMore` true. Sequence 50084 is the newest event on this page.

- sequence 50084, `tick` 393, `day` 65.5, `type` `battle-resolved`, `actorId` `character-19`, `targetId` `world-government`, `settlementId` `crown-harbor`, `payloadWithheld` true, `data` null, summary `Esme Dusk: battle resolved`

`GET /api/state?limit=200&beforeSequence=48667`. HTTP 200. `eventPage.total` 50942, `oldestSequence` 48467, `newestSequence` 48666, count 200, `hasMore` true. Sequence 48666 is the newest event on this page.

- sequence 48666, `tick` 383, `day` 63.83, `type` `battle-resolved`, `actorId` `character-15`, `targetId` `world-government`, `settlementId` `crown-harbor`, `payloadWithheld` true, `data` null, summary `Mina Vale: battle resolved`

## Recommendation

`PROMOTE` if both beats match: the four faction reads (tick 0 and tick 400, on each seed), Free Tide's `treasury` and `power` null, both `actingCommanderId` values null, and the two Beat B events on the `beforeSequence` pages above with those summaries. The briefing sentences match, including `Esme Dusk lost at Crown Harbor` and `Mina Vale lost at Crown Harbor`.

`REVISE` if an `actingCommanderId` is a character id, if either `commanderId` is not the id in the tables, if a Free Tide `treasury` or `power` is a number, or if a briefing sentence or those two event summaries differ.

`ABANDON` if a faction row has no `commanderId` or no `actingCommanderId`.
