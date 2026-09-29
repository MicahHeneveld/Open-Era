# Playtest plan: loyalty scar

This is the plan for a blind operator. It is not a completed session. Do not run it as part of writing the change. Do not open `src/`, `tests/`, the branch diff, or `docs/design/` during the session. Use only the dashboard HTTP JSON.

One session. One process. Seed 1847. Send no commands and no messages. A quiet run releases Sable Morrow still owing the ransom, later names Jun Marrow to cover Mara, and then releases Mara still owing hers. Those three reads are the session.

## Setup

- Node `v24.21.0` (`nvm use 24.21.0` if `node -v` is not that). `npm ci` first if `node_modules` is missing.
- Branch `feature/loyalty-scar`. Record `git rev-parse HEAD` before the first request.
- One process. `npm run dashboard -- --reset --seed 1847` on `http://127.0.0.1:4317`. Do not start a second seed.
- `GET /api/health` should be HTTP 200 `{"ok":true,"tick":0,"events":0}`.
- The player is already Mara Vane, `character-01`, `playerId` `prototype-player`. Do not pass another character. This plan sends no `POST /api/commands`. A command changes the history, and the sequences below will not match.
- Read state with `GET /api/state?limit=200`. Omit `beforeSequence` on the first read of a checkpoint. The page is newest-last in `eventPage` and the `events` array is newest-first. Find a checkpoint by its `sequence`. If that sequence is below `eventPage.oldestSequence`, the fallback is `GET /api/state?limit=200&beforeSequence=<that sequence + 1>`. Jun's release uses `beforeSequence=74787`. That fallback was checked: HTTP 200, `oldestSequence` 74587, `newestSequence` 74786, and sequence 74786 is the first row of `events`.
- `briefing.items` carries the outcome sentence. Quote that sentence. On a withheld feed row the sentence is not the event summary. On Mara's own capture and her own release, the feed summary and the briefing sentence are the same text.
- Advance with `POST /api/advance`. Body `{"ticks":N}`. `N` is an integer from 1 to 144. This plan uses 119, then 144, then 144, then 144, then 144, then 144. The fifth advance stops early because Mara is captured. The sixth stops early because she is released.
- `tick` on an event is the tick the world was on while that event was written. `tick` on the state is one ahead of the events just applied. Advance `day` is unrounded. State `day` is rounded to two places. `19.833333333333332` on the first advance and `19.83` on the state read are the same tick.
- `characters[].loyalty` is the loyalty reading for Mara's own faction, rounded to three decimals. It is null on a rival. Mara's own `personality.loyalty` is a different field and stays the seed she started with, unrounded. Do not treat those two numbers as the same display.

The scar checkpoint is state tick 119. The cover checkpoint is state tick 595. The own-release checkpoint is state tick 679. Do not stop on an earlier capture. Sable is taken at event tick 34, and that row is not on the tick-119 page.

## Hypothesis and ambition

**Hypothesis.** At state tick 119, sequence 13680 is `captivity-released` for Sable Morrow. The feed withholds the payload. The briefing item `event:13680` says she was released from Cinder Key with 13.4 paid and 103.21 recorded as debt. Her `loyalty` is 0.537. It was 0.577 at tick 0. Jun Marrow's `loyalty` is still 0.73. Both `actingCommanderId` values are null.

At state tick 595, Jun's `loyalty` is 0.69 and World Government's `actingCommanderId` is `character-05`. Bram Quill's `loyalty` is 0.844. Using the leadership on each card, Jun still leads. Mara is captive. Her `loyalty` is still 0.808 and her `personality.loyalty` is still `0.807927391717676`. Pax Ash's `loyalty` is null.

At state tick 679, sequence 88540 releases Mara with 108 paid and 72.25 recorded as debt. Her `loyalty` is 0.768. Her `personality.loyalty` is still `0.807927391717676`. World Government's `actingCommanderId` is null again. Jun's `loyalty` is still 0.69. Lio Crow's `loyalty` is still 0.666 after a release whose debt is 0.

**Ambition.** Send no commands. Stay at Crown Harbor until the capture takes Mara. Read Sable, Jun, Lio, Bram, Pax, and the World Government row at the three checkpoints.

**What you can see.** `loyalty` on a World Government character. Mara's own `personality`, which keeps the seed. A faction mate's captivity when the card has it, and her own capture payload. The outcome sentences on `briefing.items`. Not a rival's `loyalty`, treasury, or power. Not Sable's or Jun's release payload: those feed rows are withheld.

## Characters

| Name | Id | What to watch |
| --- | --- | --- |
| Mara Vane | `character-01` | The player. World Government's commander. Her `loyalty` moves only on her own unpaid release. |
| Sable Morrow | `character-04` | First unpaid release. `loyalty` 0.577, then 0.537. |
| Jun Marrow | `character-05` | Reporting officer. Unpaid release, then the cover. `loyalty` 0.73, then 0.69. Leadership 61. |
| Lio Crow | `character-12` | Paid release (debt 0). `loyalty` stays 0.666. |
| Bram Quill | `character-02` | Next officer under Jun. `loyalty` 0.844. Leadership 52. Not the cover. |
| Pax Ash | `character-14` | Free Tide's commander. `loyalty` stays null. |

## State tick 0

`GET /api/health`. HTTP 200.

```json
{"ok":true,"tick":0,"events":0}
```

`GET /api/state?limit=200`. HTTP 200.

- `tick` 0. `day` 0. `commanderId` `character-01`.
- `player.displayName` `Prototype Commander`. `player.characterId` `character-01`. `player.reportingOfficerId` `character-05`.
- `party.name` `Mara Vane`. `party.locationId` `crown-harbor`.
- `captivity.active` null.
- `briefing.attentionCount` 0. `briefing.omittedInfoCount` 0. `briefing.items` is `[]`.
- `eventPage` count 0, limit 200, total 0, `hasMore` false, `oldestSequence` null, `newestSequence` null, `cursor` null.
- Factions, in this order:

| id | name | commanderId | actingCommanderId | treasury | power |
| --- | --- | --- | --- | --- | --- |
| `free-tide` | Free Tide Compact | `character-14` | null | null | null |
| `world-government` | World Government | `character-01` | null | 18000 | 2335.44 |

Character readings at tick 0:

| Name | `loyalty` | `personality` |
| --- | --- | --- |
| Mara Vane | 0.808 | present. `personality.loyalty` is `0.807927391717676` |
| Sable Morrow | 0.577 | null |
| Jun Marrow | 0.73 | null |
| Lio Crow | 0.666 | null |
| Bram Quill | 0.844 | null |
| Pax Ash | null | null |

`player.reportingOfficerId` `character-05` is the seed check. A different seed names someone else. Mara's two loyalty figures are the seed shown two ways: `loyalty` is rounded to three decimals, and `personality.loyalty` is not. Nothing has been subtracted yet.

## Advance to state tick 119

`POST /api/advance` with this body. HTTP 200.

```json
{"ticks":119}
```

- `ok` true. `tick` 119. `ticksAdvanced` 119. `day` 19.833333333333332.
- `combatUpdated` false. `attentionUpdated` false. `pausedForBattle` false.
- `eventSequence` 13787.

The response events include sequence 13680 (`captivity-released`, Sable, summary `Sable Morrow: captivity released`, `payloadWithheld` true, `data` null) and sequence 3940 (`character-captured`, Sable, the same withheld shape). Do not use the advance list as the page check. Read state.

`GET /api/state?limit=200`. HTTP 200.

- `tick` 119. `day` 19.83.
- `party.locationId` `crown-harbor`. `captivity.active` null.
- `briefing.attentionCount` 4. `briefing.omittedInfoCount` 0.
- `eventPage` count 200, limit 200, total 13787, `hasMore` true, `oldestSequence` 13588, `newestSequence` 13787, `cursor` 13588.
- `events[0].sequence` is 13787. `events` at index 107 is sequence 13680. It is on this page. No `beforeSequence` fallback.
- Both `actingCommanderId` values are still null. World Government treasury 21553.01, power 2380.66. Free Tide treasury null, power null.

Sequence 13680, on this page:

| Field | Value |
| --- | --- |
| `sequence` | 13680 |
| `tick` | 118 |
| `day` | 19.67 |
| `type` | `captivity-released` |
| `actorId` | `character-04` |
| `targetId` | `free-tide` |
| `settlementId` | `cinder-key` |
| `summary` | `Sable Morrow: captivity released` |
| `data` | null |
| `payloadWithheld` | true |

`briefing.items` entry `event:13680`, severity `warning`, `actionRequired` false, title `captivity released`, `characterId` `character-04`, `settlementId` `cinder-key`, `acknowledgeable` true. Quote the summary:

`Sable Morrow was released from Cinder Key: 13.4 paid and 103.21 recorded as debt`

Sable's card: `loyalty` 0.537, `personality` null, `captivity` null, `locationId` null, `factionId` `world-government`. Jun's `loyalty` is still 0.73. Mara's `loyalty` is still 0.808 and `personality.loyalty` is still `0.807927391717676`. Pax's `loyalty` is still null.

Sequence 3940 is not on this page (`oldestSequence` is 13588). Do not page backward for it. The release is the checkpoint.

## Advance to state tick 595

Four advances. No state read until the fourth returns. Each is HTTP 200, `ok` true.

1. `POST /api/advance` `{"ticks":144}`. `tick` 263. `ticksAdvanced` 144. `day` 43.833333333333336. `eventSequence` 31803. `combatUpdated` false. `attentionUpdated` false. `pausedForBattle` false.
2. `POST /api/advance` `{"ticks":144}`. `tick` 407. `ticksAdvanced` 144. `day` 67.83333333333333. `eventSequence` 50725. Same three flags false.
3. `POST /api/advance` `{"ticks":144}`. `tick` 551. `ticksAdvanced` 144. `day` 91.83333333333333. `eventSequence` 70597. Same three flags false. The response includes sequence 63647, `character-captured` for Jun at Glassport, summary `Jun Marrow: character captured`, `payloadWithheld` true. That is not the checkpoint.
4. `POST /api/advance` `{"ticks":144}`. This one stops early. `tick` 595. `ticksAdvanced` 44. `day` 99.16666666666667. `eventSequence` 76653. `combatUpdated` false. `attentionUpdated` true. `pausedForBattle` false.

`GET /api/state?limit=200`. HTTP 200.

- `tick` 595. `day` 99.17.
- `captivity.active.cause` `outscore-loss`. `captivity.active.settlementName` `Crown Harbor`. `captivity.active.captorName` `Free Tide Compact`. `captivity.active.canEscape` true.
- `briefing.attentionCount` 7. `briefing.omittedInfoCount` 1.
- `eventPage` count 200, limit 200, total 76653, `hasMore` true, `oldestSequence` 76454, `newestSequence` 76653, `cursor` 76454.
- Factions:

| id | commanderId | actingCommanderId | treasury | power |
| --- | --- | --- | --- | --- |
| `free-tide` | `character-14` | null | null | null |
| `world-government` | `character-01` | `character-05` | 34008.89 | 3367 |

Sequence 76575 is on this page. Sequence 76573 is on this page. Sequence 74786 is not (`oldestSequence` is 76454).

Sequence 76575, Mara's capture, on this page:

| Field | Value |
| --- | --- |
| `sequence` | 76575 |
| `tick` | 594 |
| `type` | `character-captured` |
| `actorId` | `character-01` |
| `targetId` | `free-tide` |
| `settlementId` | `crown-harbor` |
| `summary` | `Mara Vane was captured at Crown Harbor after outscore loss` |
| `payloadWithheld` | false |
| `data.cause` | `outscore-loss` |
| `data.captivity.captorFactionId` | `free-tide` |

`briefing.items` entry `event:76575`. Quote the summary:

`Mara Vane was captured at Crown Harbor after outscore loss`

Sequence 76573, on this page: `type` `battle-resolved`, `actorId` `character-14`, `targetId` `world-government`, `settlementId` `crown-harbor`, summary `Pax Ash: battle resolved`, `payloadWithheld` true, `data` null. `briefing.items` entry `event:76573`, title `battle resolved`, severity `info`. Quote the summary:

`Pax Ash won at Crown Harbor`

The feed does not say who won. The briefing item does.

Jun's release is sequence 74786. `GET /api/state?limit=200&beforeSequence=74787`. HTTP 200. `eventPage.oldestSequence` 74587, `newestSequence` 74786, `cursor` 74587, `hasMore` true, total 76653. `events[0]` is that release:

| Field | Value |
| --- | --- |
| `sequence` | 74786 |
| `tick` | 582 |
| `day` | 97 |
| `type` | `captivity-released` |
| `actorId` | `character-05` |
| `targetId` | `free-tide` |
| `settlementId` | `glassport` |
| `summary` | `Jun Marrow: captivity released` |
| `data` | null |
| `payloadWithheld` | true |

`briefing.items` on the tick-595 read, not on the fallback page, includes `event:74786`. Quote the summary:

`Jun Marrow was released from Glassport: 133.37 paid and 317.15 recorded as debt`

The same briefing list includes `event:74787`. Quote it as the paid release beside Jun's:

`Lio Crow was released from Glassport: 126.63 paid and 0 recorded as debt`

Cards and the seat, from the tick-595 state read (the fallback page is the same world; use either read for cards):

| Name | `loyalty` | Other |
| --- | --- | --- |
| Jun Marrow | 0.69 | `personality` null. `captivity` null. `locationId` `cinder-key`. `skills.leadership` 61. |
| Bram Quill | 0.844 | `personality` null. `skills.leadership` 52. |
| Sable Morrow | 0.537 | Still the scar from tick 119. |
| Lio Crow | 0.666 | Unchanged from tick 0. The release above recorded debt 0. |
| Mara Vane | 0.808 | `personality.loyalty` still `0.807927391717676`. `captivity.cause` `outscore-loss`. |
| Pax Ash | null | `personality` null. |

Visible score, from the numbers on the card, is leadership plus `loyalty` times 50. Jun is `61 + 0.69 * 50` = 95.5. Bram is `52 + 0.844 * 50` = 94.2. Jun is `actingCommanderId`. The seat name is Jun, not Bram. Jun's `loyalty` was 0.73 before sequence 74786, which is `61 + 0.73 * 50` = 97.5. The drop is on his card. He still leads.

## Advance to state tick 679

`POST /api/advance` with `{"ticks":144}`. HTTP 200. This one stops early.

- `ok` true. `tick` 679. `ticksAdvanced` 84. `day` 113.16666666666667.
- `combatUpdated` false. `attentionUpdated` true. `pausedForBattle` false.
- `eventSequence` 88683.

`GET /api/state?limit=200`. HTTP 200.

- `tick` 679. `day` 113.17.
- `captivity.active` null.
- `party.locationId` null.
- `eventPage` count 200, limit 200, total 88683, `hasMore` true, `oldestSequence` 88484, `newestSequence` 88683, `cursor` 88484.
- World Government `commanderId` `character-01`, `actingCommanderId` null, treasury 35832.28, power 3778.83. Free Tide `actingCommanderId` null, treasury null, power null.

Sequence 88540 is on this page:

| Field | Value |
| --- | --- |
| `sequence` | 88540 |
| `tick` | 678 |
| `day` | 113 |
| `type` | `captivity-released` |
| `actorId` | `character-01` |
| `targetId` | `free-tide` |
| `settlementId` | `crown-harbor` |
| `summary` | `Mara Vane was released from Crown Harbor: 108 paid and 72.25 recorded as debt` |
| `payloadWithheld` | false |
| `data.terms.moneyPaid` | 108 |
| `data.terms.debtValue` | 72.25 |
| `data.debt.remainingValue` | 72.25 |
| `data.debt.reason` | `prisoner-release` |

`briefing.items` entry `event:88540`. Quote the summary. It is the same sentence as the feed:

`Mara Vane was released from Crown Harbor: 108 paid and 72.25 recorded as debt`

Mara's card: `loyalty` 0.768. `personality.loyalty` still `0.807927391717676`. `debts[0].remainingValue` 72.25. `captivity` null. `locationId` null. `travel.toId` `verdant-cay`, `travel.remainingTicks` 3. Jun's `loyalty` is still 0.69. The cover is gone: `actingCommanderId` is null on both factions. Stop. Do not send another advance.

## Recommendation

`PROMOTE` if every checkpoint above matches: Sable's `loyalty` moves from 0.577 to 0.537 on sequence 13680 and stays 0.537, Jun's moves from 0.73 to 0.69 on the unpaid release and he is the cover at state tick 595, Lio's stays 0.666 beside a debt of 0, Mara's `personality.loyalty` stays `0.807927391717676` while her `loyalty` moves from 0.808 to 0.768 on sequence 88540, Pax's `loyalty` stays null, and no event type other than the ones already in the feed appears for these releases.

`REVISE` if a debt of 0 moves `loyalty`, if a rival's `loyalty` is a number, if the cover at state tick 595 is not Jun, if Mara's `personality.loyalty` changes on her release, or if `actingCommanderId` is still `character-05` after sequence 88540.

`ABANDON` if Sable's `loyalty` is still 0.577 at state tick 119, or if Jun's `loyalty` is still 0.73 at state tick 595, or if the release briefing does not name the debt.
