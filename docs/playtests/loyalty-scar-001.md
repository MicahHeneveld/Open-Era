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

## Session

Blind session. One process. No `POST /api/commands`. Node `v24.21.0` after `nvm install 24.21.0 && nvm use 24.21.0` (the shell's first `node` is `/exec-daemon/node` v22.14.0, so the dashboard was started with `/home/ubuntu/.nvm/versions/node/v24.21.0/bin` first on `PATH`). `npm ci` before the server. `git rev-parse HEAD` before the first request: `a042c11637fb800e8c534d6b587bd2bf96b0a44b`. Branch `feature/loyalty-scar`.

`npm run dashboard -- --reset --seed 1847` logged `Open Era dashboard: http://127.0.0.1:4317`. No second seed.

### State tick 0

`GET /api/health` HTTP 200.

```json
{"ok":true,"tick":0,"events":0}
```

`GET /api/state?limit=200` HTTP 200.

- `tick` 0. `day` 0. `commanderId` `character-01`.
- `player.displayName` `Prototype Commander`. `player.characterId` `character-01`. `player.reportingOfficerId` `character-05`.
- `party.name` `Mara Vane`. `party.locationId` `crown-harbor`.
- `captivity.active` null.
- `briefing.attentionCount` 0. `briefing.omittedInfoCount` 0. `briefing.items` `[]`.
- `eventPage` count 0, limit 200, total 0, `hasMore` false, `oldestSequence` null, `newestSequence` null, `cursor` null.
- Factions, in this order: Free Tide Compact `character-14`, `actingCommanderId` null, treasury null, power null. World Government `character-01`, `actingCommanderId` null, treasury 18000, power 2335.44.

| Name | `loyalty` | `personality.loyalty` |
| --- | --- | --- |
| Mara Vane | 0.808 | `0.807927391717676` |
| Sable Morrow | 0.577 | null (`personality` null) |
| Jun Marrow | 0.73 | null |
| Lio Crow | 0.666 | null |
| Bram Quill | 0.844 | null |
| Pax Ash | null | null |

### State tick 119

`POST /api/advance` `{"ticks":119}` HTTP 200.

- `ok` true. `tick` 119. `ticksAdvanced` 119. `day` 19.833333333333332.
- `combatUpdated` false. `attentionUpdated` false. `pausedForBattle` false.
- `eventSequence` 13787.
- The advance list includes sequence 13680 (`captivity-released`, Sable, tick 118, day 19.67, summary `Sable Morrow: captivity released`, `payloadWithheld` true, `data` null) and sequence 3940 (`character-captured`, Sable, tick 34, day 5.67, summary `Sable Morrow: character captured`, same withheld shape). Not used as the page check.

`GET /api/state?limit=200` HTTP 200.

- `tick` 119. `day` 19.83.
- `party.locationId` `crown-harbor`. `captivity.active` null.
- `briefing.attentionCount` 4. `briefing.omittedInfoCount` 0. The list itself has 6 items.
- `eventPage` count 200, limit 200, total 13787, `hasMore` true, `oldestSequence` 13588, `newestSequence` 13787, `cursor` 13588.
- `events[0].sequence` 13787. `events[107]` is sequence 13680. No `beforeSequence` fallback.
- Both `actingCommanderId` values null. World Government treasury 21553.01, power 2380.66. Free Tide treasury null, power null.

Sequence 13680:

| Field | Observed |
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

`briefing.items` `event:13680`, severity `warning`, `actionRequired` false, title `captivity released`, `characterId` `character-04`, `settlementId` `cinder-key`, `acknowledgeable` true. Summary:

`Sable Morrow was released from Cinder Key: 13.4 paid and 103.21 recorded as debt`

Sable's card: `loyalty` 0.537, `personality` null, `captivity` null, `locationId` null, `factionId` `world-government`. Jun's `loyalty` 0.73. Mara's `loyalty` 0.808 and `personality.loyalty` `0.807927391717676`. Pax's `loyalty` null. Sequence 3940 is not on this page.

### State tick 595

Four advances, no state read until the fourth. Each HTTP 200, `ok` true.

1. `{"ticks":144}`. `tick` 263. `ticksAdvanced` 144. `day` 43.833333333333336. `eventSequence` 31803. `combatUpdated` false. `attentionUpdated` false. `pausedForBattle` false.
2. `{"ticks":144}`. `tick` 407. `ticksAdvanced` 144. `day` 67.83333333333333. `eventSequence` 50725. Same three flags false.
3. `{"ticks":144}`. `tick` 551. `ticksAdvanced` 144. `day` 91.83333333333333. `eventSequence` 70597. Same three flags false. Sequence 63647 is `character-captured` for Jun, tick 498, day 83, settlement `glassport`, summary `Jun Marrow: character captured`, `payloadWithheld` true, `data` null.
4. `{"ticks":144}`. Stopped early. `tick` 595. `ticksAdvanced` 44. `day` 99.16666666666667. `eventSequence` 76653. `combatUpdated` false. `attentionUpdated` true. `pausedForBattle` false.

`GET /api/state?limit=200` HTTP 200.

- `tick` 595. `day` 99.17.
- `captivity.active.cause` `outscore-loss`. `captivity.active.settlementName` `Crown Harbor`. `captivity.active.captorName` `Free Tide Compact`. `captivity.active.canEscape` true. Also `displayedRisk` `severe`, `heldDays` 0.17.
- `briefing.attentionCount` 7. `briefing.omittedInfoCount` 1. The list itself has 10 items.
- `eventPage` count 200, limit 200, total 76653, `hasMore` true, `oldestSequence` 76454, `newestSequence` 76653, `cursor` 76454.
- Factions: Free Tide `character-14`, `actingCommanderId` null, treasury null, power null. World Government `character-01`, `actingCommanderId` `character-05`, treasury 34008.89, power 3367.

Sequence 76575 is on this page (index 78). Sequence 76573 is on this page (index 80). Sequence 74786 is not.

Sequence 76575, day 99:

| Field | Observed |
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

`briefing.items` `event:76575`, title `character captured`, severity `warning`. Summary:

`Mara Vane was captured at Crown Harbor after outscore loss`

Sequence 76573: `type` `battle-resolved`, `actorId` `character-14`, `targetId` `world-government`, `settlementId` `crown-harbor`, summary `Pax Ash: battle resolved`, `payloadWithheld` true, `data` null. `briefing.items` `event:76573`, title `battle resolved`, severity `info`. Summary:

`Pax Ash won at Crown Harbor`

`GET /api/state?limit=200&beforeSequence=74787` HTTP 200. `eventPage.oldestSequence` 74587, `newestSequence` 74786, `cursor` 74587, `hasMore` true, total 76653. `events[0]` is the release:

| Field | Observed |
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

`briefing.items` on the tick-595 read, not the fallback page:

`Jun Marrow was released from Glassport: 133.37 paid and 317.15 recorded as debt`

`event:74787` beside it:

`Lio Crow was released from Glassport: 126.63 paid and 0 recorded as debt`

Sequence 74787 is below `oldestSequence` 76454 and newer than the Jun page, so one extra page followed the plan's fallback rule: `GET /api/state?limit=200&beforeSequence=74788` HTTP 200. `oldestSequence` 74588, `newestSequence` 74787, `cursor` 74588, `hasMore` true, total 76653. `events[0]` is sequence 74787, tick 582, `type` `captivity-released`, `actorId` `character-12`, summary `Lio Crow: captivity released`, `data` null, `payloadWithheld` true. The page's event types are the ordinary feed (`captivity-released`, upkeep, travel, decisions, and the rest). No loyalty or scar type.

Cards from the tick-595 state read:

| Name | `loyalty` | Other |
| --- | --- | --- |
| Jun Marrow | 0.69 | `personality` null. `captivity` null. `locationId` `cinder-key`. `skills.leadership` 61. |
| Bram Quill | 0.844 | `personality` null. `skills.leadership` 52. |
| Sable Morrow | 0.537 | Still the scar from tick 119. |
| Lio Crow | 0.666 | Unchanged from tick 0. |
| Mara Vane | 0.808 | `personality.loyalty` `0.807927391717676`. `captivity.cause` `outscore-loss`. |
| Pax Ash | null | `personality` null. `skills.leadership` 75 on this read. |

Visible score from the card numbers: Jun `61 + 0.69 * 50` = 95.5. Bram `52 + 0.844 * 50` = 94.2. `actingCommanderId` is `character-05` (Jun). Before sequence 74786 his card was 0.73, which is `61 + 0.73 * 50` = 97.5. The drop is on the card. He still leads.

### State tick 679

`POST /api/advance` `{"ticks":144}` HTTP 200. Stopped early.

- `ok` true. `tick` 679. `ticksAdvanced` 84. `day` 113.16666666666667.
- `combatUpdated` false. `attentionUpdated` true. `pausedForBattle` false.
- `eventSequence` 88683.

`GET /api/state?limit=200` HTTP 200.

- `tick` 679. `day` 113.17.
- `captivity.active` null.
- `party.locationId` null.
- `briefing.attentionCount` 4. `briefing.omittedInfoCount` 0. Four items, matching the count.
- `eventPage` count 200, limit 200, total 88683, `hasMore` true, `oldestSequence` 88484, `newestSequence` 88683, `cursor` 88484.
- World Government `commanderId` `character-01`, `actingCommanderId` null, treasury 35832.28, power 3778.83. Free Tide `actingCommanderId` null, treasury null, power null.

Sequence 88540 is on this page (index 143):

| Field | Observed |
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

`briefing.items` `event:88540`, title `captivity released`, severity `warning`. Summary, the same sentence as the feed:

`Mara Vane was released from Crown Harbor: 108 paid and 72.25 recorded as debt`

Neighbors on the page are `character-upkeep` and `travel-progressed` (88541, 88542), then other captains' ordinary rows. No loyalty or scar type.

Mara's card: `loyalty` 0.768. `personality.loyalty` `0.807927391717676`. `debts[0].remainingValue` 72.25 (`reason` `prisoner-release`). `captivity` null. `locationId` null. `travel.toId` `verdant-cay`, `travel.remainingTicks` 3. The release payload's own `data.travel.remainingTicks` is 4; sequence 88542 (`Mara Vane: travel progressed`) is already on the same page. Jun's `loyalty` 0.69. Sable's `loyalty` 0.537. Lio's `loyalty` 0.666. Bram's `loyalty` 0.844. Pax's `loyalty` null. Both `actingCommanderId` values null. Stopped. No further advance.

## Findings

Every checkpoint reading in the plan matched. No mismatches.

| Check | Expected | Observed |
| --- | --- | --- |
| Health at tick 0 | `{"ok":true,"tick":0,"events":0}` | same |
| Seed | reporting officer `character-05`; Mara `loyalty` 0.808 and `personality.loyalty` `0.807927391717676` | same |
| Advance to 119 | tick 119, `ticksAdvanced` 119, day `19.833333333333332`, `eventSequence` 13787, three flags false | same |
| State day 119 | 19.83 | 19.83 |
| Sequence 13680 | withheld `captivity-released`, Sable, Cinder Key | same, index 107, no fallback |
| Sable briefing | `13.4 paid and 103.21 recorded as debt` | same sentence |
| Sable scar | `loyalty` 0.577 then 0.537, and still 0.537 later | 0.537 at ticks 119, 595, and 679 |
| Jun at tick 119 | `loyalty` 0.73, both `actingCommanderId` null | same |
| Four advances | 263 / 407 / 551, then early stop at 595 (`ticksAdvanced` 44, `eventSequence` 76653, `attentionUpdated` true) | same, including Jun's capture at 63647 withheld |
| Mara captured | sequence 76575, summary equals the briefing, `data.cause` `outscore-loss`, captor `free-tide` | same |
| Battle line | feed `Pax Ash: battle resolved`; briefing `Pax Ash won at Crown Harbor` | same |
| Jun's release page | `beforeSequence=74787`, oldest 74587, newest 74786, `events[0]` is 74786, withheld | same |
| Jun briefing | `133.37 paid and 317.15 recorded as debt` | same |
| Jun scar and cover | `loyalty` 0.69, leadership 61, `actingCommanderId` `character-05` | same. Visible score 95.5 against Bram's 94.2 |
| Lio paid release | briefing debt 0, `loyalty` stays 0.666 | briefing matches; card 0.666 at 0, 595, and 679. Feed row 74787 is withheld `captivity-released` |
| Advance to 679 | early stop, tick 679, `ticksAdvanced` 84, day `113.16666666666667`, `eventSequence` 88683, `attentionUpdated` true | same |
| Sequence 88540 | Mara's own release, not withheld, 108 paid, debt 72.25, briefing repeats the feed | same, index 143 |
| Mara's scar | `loyalty` 0.768, `personality.loyalty` still `0.807927391717676`, debt 72.25, travel `verdant-cay` remaining 3 | same |
| Cover cleared | both `actingCommanderId` null; Jun stays 0.69 | same |
| Pax | `loyalty` null at every checkpoint | null at 0, 119, 595, and 679 |
| Release event types | no new type for these releases | 13680, 74786, 74787, and 88540 are all `captivity-released` |

An unpaid release lowers the released captain's own-faction `loyalty` by 0.04 (Sable 0.577 to 0.537, Jun 0.73 to 0.69, Mara 0.808 to 0.768). A debt of 0 does not (Lio stays 0.666). The cover is chosen while Jun's scar is on the card: Jun Marrow, `character-05`, `loyalty` 0.69, covers Mara at state tick 595, and the seat is empty again after sequence 88540.

Player-facing notes, from the text and the numbers on the cards. These are not checkpoint mismatches.

- The feed withholds Sable, Jun, and Lio. Those rows read `Sable Morrow: captivity released`, `Jun Marrow: captivity released`, and `Lio Crow: captivity released`, with `data` null. The paid amount and the debt are only on `briefing.items`. Mara's own capture and her own release use the same sentence in the feed and the briefing, and her release payload shows the debt.
- Nothing in a feed row or a briefing line says loyalty fell, or that the fall is 0.04. The scar is only the number on the card, and only if the player still remembers the earlier reading. After her release Mara's card shows `loyalty` 0.768 beside `personality.loyalty` `0.807927391717676`, with no line saying which figure the seat uses.
- Nothing names the cover. At tick 595 the player sees `actingCommanderId` `character-05` and has to join that id to Jun Marrow, then compare leadership plus loyalty times 50 (Jun 95.5, Bram 94.2) to see why the scarred officer still sits the seat.
- `Mara Vane was captured at Crown Harbor after outscore loss` does not name Free Tide and does not say she was on the dock. `outscore` is never explained. The row's actor is Mara and its target is `free-tide`, so it reads as if she acted on them. The captor name is on `captivity.active.captorName` (`Free Tide Compact`). The battle feed says `Pax Ash: battle resolved`; only the briefing says `Pax Ash won at Crown Harbor`.
- While she is held, the briefing says `Escape is guaranteed but dangerous` next to the capture's `displayedRisk` `severe` and `captureChance` 0.55.
- At ticks 595 and 679 her morale is already 0 and her health is 1, and the starvation line still quotes a morale cost per tick (0.614 at both of those reads). At tick 679 it also says Verdant Cay is `3 ticks by report away — out of reach, which is short by 3 ticks` while the card's `travel.remainingTicks` is 3. The release payload still says `remainingTicks` 4, because sequence 88542 has already moved the card.
- `briefing.attentionCount` is 4 at tick 119 while six lines are listed, and 7 at tick 595 while ten lines are listed. At ticks 0 and 679 the count matches the list.
- `player.displayName` stays `Prototype Commander` while the party, the feed, and the briefing say Mara Vane.
- Pax Ash's `skills.leadership` is 75 at tick 595 and null at tick 679, with `loyalty` still null. No sentence says the number left the card.

## Verdict

PROMOTE

Every checkpoint matched. Sable's `loyalty` moves from 0.577 to 0.537 on sequence 13680 and stays 0.537. Jun's moves from 0.73 to 0.69 on the unpaid release, and he is the cover at state tick 595. Lio's stays 0.666 beside a debt of 0. Mara's `personality.loyalty` stays `0.807927391717676` while her `loyalty` moves from 0.808 to 0.768 on sequence 88540. Pax's `loyalty` stays null. `actingCommanderId` is null again after that release. The release rows are `captivity-released`, not a new event type. The player-facing notes above are missing explanations around numbers the session already shows; they are not a failed reading.
