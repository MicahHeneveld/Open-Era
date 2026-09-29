# Playtest plan: outscore dock capture

This is the plan for a blind operator. It is not a completed session. Do not run it while writing the change. Do not open `src/`, `tests/`, the branch diff, or `docs/design/` during the session. Use only the dashboard HTTP JSON.

One session. One process. Seed 4096. Send no commands and no messages. The capture is a quiet-run outscore loss: Pax Ash wins at Glassport, and Rook Tern, who is standing on that dock, is taken. Mara stays at Crown Harbor and is not the prisoner. This is the earliest such capture on the three measured seeds. Event tick 475 is also the first tick this seed's history leaves the previous build.

## Setup

- Node `v24.21.0` (`nvm use 24.21.0` if `node -v` is not that). `npm ci` first if `node_modules` is missing.
- Branch `feature/outscore-dock-capture`. Record `git rev-parse HEAD` before the first request.
- One process. `npm run dashboard -- --reset --seed 4096` on `http://127.0.0.1:4317`. Do not start a second seed.
- `GET /api/health` should be HTTP 200 `{"ok":true,"tick":0,"events":0}`.
- The player is already Mara Vane, `character-01`, `playerId` `prototype-player`. Do not pass another character. This plan sends no `POST /api/commands`. A command changes the history, and the sequences below will not match.
- Read state with `GET /api/state?limit=200`. Omit `beforeSequence` on the first read of a checkpoint. The page is newest-last in `eventPage` and the `events` array is newest-first. Find a checkpoint by its `sequence`. If that sequence is below `eventPage.oldestSequence`, the fallback is `GET /api/state?limit=200&beforeSequence=59638`. That fallback was checked: it returns HTTP 200, `oldestSequence` 59438, `newestSequence` 59637, and it holds both sequences below.
- `briefing.items` carries the outcome sentence. Quote that sentence. On a withheld feed row the sentence is not the event summary.
- Advance with `POST /api/advance`. Body `{"ticks":N}`. `N` is an integer from 1 to 144. This plan uses 144, then 144, then 144, then 44.
- `tick` on an event is the tick the world was on while that event was written. `tick` on the state is one ahead of the events just applied. Advance `day` is unrounded. State `day` is rounded to two places. `79.33333333333333` on the last advance and `79.33` on the state read are the same tick.

The capture checkpoint is state tick 476. Do not stop on an earlier `character-captured` row. Those four are the older holds, and their feed payloads are withheld too.

## Hypothesis and ambition

**Hypothesis.** At state tick 476, sequence 59637 is `character-captured` for Rook Tern (`character-11`) at Glassport, event tick 475. The feed withholds the payload. The briefing item `event:59637` says he was captured after outscore loss. His own card, because he is Mara's faction mate, shows `captivity.cause` `outscore-loss` and captor `free-tide`. Sequence 59635 is Pax Ash's `battle-resolved` at Glassport, also withheld, and the briefing says he won. Glassport is still World Government, garrison 6, with a surrender block aimed at Pax. Both `actingCommanderId` values stay null. Rook is the reporting officer, not the commander, so this capture does not write a cover.

**Ambition.** Send no commands. Stay at Crown Harbor. Read the log, the briefing, Rook's card, and the Glassport panel.

**What you can see.** Mara's party, her faction's treasury and power, a faction mate's captivity, and the outcome sentences on `briefing.items`. Not the battle scores. Not the capture roll. Not a rival's treasury or power. Pax's battle payload and Rook's capture payload are both withheld.

## Characters

| Name | Id | What to watch |
| --- | --- | --- |
| Mara Vane | `character-01` | The player. Stays at `crown-harbor`. Not captured. |
| Rook Tern | `character-11` | Reporting officer. World Government. The prisoner. |
| Pax Ash | `character-14` | Free Tide's commander. Wins the fight. Not captured. |

## State tick 0

`GET /api/health`. HTTP 200.

```json
{"ok":true,"tick":0,"events":0}
```

`GET /api/state?limit=200`. HTTP 200.

- `tick` 0. `day` 0. `commanderId` `character-01`.
- `player.displayName` `Prototype Commander`. `player.characterId` `character-01`. `player.reportingOfficerId` `character-11`.
- `party.name` `Mara Vane`. `party.locationId` `crown-harbor`.
- `captivity.active` null.
- `briefing.attentionCount` 0. `briefing.omittedInfoCount` 0. `briefing.items` is `[]`.
- `eventPage` count 0, limit 200, total 0, `hasMore` false, `oldestSequence` null, `newestSequence` null, `cursor` null.
- Factions, in this order:

| id | name | commanderId | actingCommanderId | treasury | power |
| --- | --- | --- | --- | --- | --- |
| `free-tide` | Free Tide Compact | `character-14` | null | null | null |
| `world-government` | World Government | `character-01` | null | 18000 | 2392.28 |

`player.reportingOfficerId` `character-11` is the seed check. A different seed names someone else.

## Advance to state tick 476

Four advances. No state read until the fourth returns. Each is HTTP 200, `ok` true, `combatUpdated` false, `attentionUpdated` false, `pausedForBattle` false.

1. `POST /api/advance` `{"ticks":144}`. `tick` 144. `ticksAdvanced` 144. `day` 24. `eventSequence` 16423.
2. `POST /api/advance` `{"ticks":144}`. `tick` 288. `ticksAdvanced` 144. `day` 48. `eventSequence` 34068.
3. `POST /api/advance` `{"ticks":144}`. `tick` 432. `ticksAdvanced` 144. `day` 72. `eventSequence` 53474.
4. `POST /api/advance` `{"ticks":44}`. `tick` 476. `ticksAdvanced` 44. `day` 79.33333333333333. `eventSequence` 59717.

The first response's events include three withheld captures. The second includes one more. They are not the checkpoint:

| Sequence | Event tick | Actor | Summary | payloadWithheld |
| ---: | ---: | --- | --- | --- |
| 1422 | 12 | `character-04` | `Sable Morrow: character captured` | true |
| 2098 | 18 | `character-20` | `Dax Pike: character captured` | true |
| 4477 | 39 | `character-19` | `Esme Dusk: character captured` | true |
| 18517 | 161 | `character-15` | `Mina Vale: character captured` | true |

Each of those has `data` null. Do not read a cause off them. The feed does not carry one.

## State tick 476

`GET /api/state?limit=200`. HTTP 200. No `beforeSequence`.

- `tick` 476. `day` 79.33. `commanderId` `character-01`.
- `player.displayName` `Prototype Commander`. `player.characterId` `character-01`. `player.reportingOfficerId` `character-11`.
- `party.name` `Mara Vane`. `party.locationId` `crown-harbor`.
- `captivity.active` null. Mara is not held.
- `eventPage` count 200, limit 200, total 59717, `hasMore` true, `oldestSequence` 59518, `newestSequence` 59717, `cursor` 59518. The page is sequences 59518 through 59717. Sequences 59635 and 59637 are on it.
- Factions, in this order. Both rows include `commanderId` and `actingCommanderId`.

| id | name | commanderId | actingCommanderId | treasury | power |
| --- | --- | --- | --- | --- | --- |
| `free-tide` | Free Tide Compact | `character-14` | null | null | null |
| `world-government` | World Government | `character-01` | null | 29876.5 | 3306.81 |

`briefing.attentionCount` 3. `briefing.omittedInfoCount` 0. `briefing.items` has 6 entries. The outcome text is on the items, not on the withheld feed rows. Quote these two:

- `event:59637`, `severity` `warning`, `title` `character captured`, `day` 79.17, `characterId` `character-11`, `settlementId` `glassport`, summary `Rook Tern was captured at Glassport after outscore loss`.
- `event:59635`, `severity` `info`, `title` `battle resolved`, `day` 79.17, `characterId` `character-14`, `settlementId` `glassport`, summary `Pax Ash won at Glassport`.

The other four items on that read, so a different count is a mismatch:

- `provision:critical`, `severity` `action`, `title` `The party is starving`, summary `The hold is empty and 0.592 provisions per tick cannot be found. That costs health 0.474 and morale 1.421 per tick. Morale gains nothing while the shortage lasts, so it will not recover on its own. Verdant Cay is 4 ticks by report away — out of reach, which is short by 4 ticks.`
- `intel:verdant-cay:0`, `severity` `warning`, `title` `Intelligence is stale`, summary `Verdant Cay's report predates your arrival and has never been refreshed.`
- `event:58283`, `severity` `info`, `title` `settlement claimed`, `day` 77.67, summary `Niko Wren accepted Cinder Key's surrender and established a claim`.
- `event:58146`, `severity` `info`, `title` `battle resolved`, `day` 77.5, summary `Niko Wren won at Cinder Key`.

### Feed

- Sequence 59637: event `tick` 475, `day` 79.17, `type` `character-captured`, `actorId` `character-11`, `targetId` `free-tide`, `settlementId` `glassport`, `payloadWithheld` true, `data` null, summary `Rook Tern: character captured`.
- Sequence 59635: event `tick` 475, `day` 79.17, `type` `battle-resolved`, `actorId` `character-14`, `targetId` `world-government`, `settlementId` `glassport`, `payloadWithheld` true, `data` null, summary `Pax Ash: battle resolved`.

`payloadWithheld` true means the capture roll, the chance, and the battle scores are not on these rows. The cause is the briefing sentence and Rook's card.

### Rook's card

`characters` id `character-11`, `name` `Rook Tern`, `factionId` `world-government`, `locationId` `glassport`, `travel` null, `troops.count` 0. `captivity`:

- `captorFactionId` `free-tide`
- `settlementId` `glassport`
- `capturedTick` 475
- `mandatoryReleaseTick` 559
- `cause` `outscore-loss`
- `displayedRisk` `severe`
- `scatteredTroops.count` 161
- `scatteredTroops.experience` 0.14667003497015685
- `scatteredTroops.discipline` 0.7425855717249215
- `releaseDestinationId` `cinder-key`

His standing order `character-01:order:character-11` still has `issuerId` `character-01`. It was already `status` `completed` before this fight. This capture does not make him the issuer, and it does not set `actingCommanderId`.

### Glassport

`settlements` id `glassport`:

- `factionId` `world-government`
- `ownerId` `character-11`
- `garrison` 6
- `stability` 52.05
- `battleInProgress` false
- `surrenderOffered` false
- `surrender.offeredToId` `character-14`
- `surrender.offeredTick` 475
- `surrender.previousFactionId` `world-government`
- `intelligence.exact` true, `intelligence.present` false, `intelligence.source` `owned`, `intelligence.confidence` 1, `intelligence.observedTick` 476, `intelligence.ageTicks` 0

The surrender block names Pax while `surrenderOffered` is false. That pair is the reading. Do not treat it as a failed run. The port is still World Government. Mara is at Crown Harbor, so the offer is not hers to accept. The battle row does not carry a garrison figure. The 6 is the panel at state tick 476.

## Reaching the sequences if the page has moved

Do this only if the first page at state tick 476 no longer contains sequence 59637. Stay on tick 476.

`GET /api/state?limit=200&beforeSequence=59638`. HTTP 200. `eventPage.count` 200, `eventPage.limit` 200, `eventPage.total` 59717, `eventPage.hasMore` true, `eventPage.oldestSequence` 59438, `eventPage.newestSequence` 59637, `eventPage.cursor` 59438. That page holds sequence 59637 and sequence 59635. Both rows match the feed section above, including `payloadWithheld` true and `data` null.

The first page already holds them (`oldestSequence` 59518 through `newestSequence` 59717). The fallback was checked so it is here if a later read moves the window. Do not advance again to go looking.

## Recommendation

`PROMOTE` if all of these hold: the fourth advance is HTTP 200 with `tick` 476, `ticksAdvanced` 44, and `eventSequence` 59717. State tick 476 has `party.locationId` `crown-harbor`, `captivity.active` null, both `actingCommanderId` values null, and World Government `commanderId` `character-01`. Sequence 59637 is on the first page (oldest 59518) or on the `beforeSequence=59638` page, `character-captured`, actor `character-11`, `payloadWithheld` true, `data` null, summary `Rook Tern: character captured`. Briefing `event:59637` is `Rook Tern was captured at Glassport after outscore loss`. Briefing `event:59635` is `Pax Ash won at Glassport`. Rook's card has `captivity.cause` `outscore-loss`, `captorFactionId` `free-tide`, `capturedTick` 475, `mandatoryReleaseTick` 559, `displayedRisk` `severe`, and `troops.count` 0. Glassport is `factionId` `world-government`, `ownerId` `character-11`, `garrison` 6, `stability` 52.05, surrender offered to `character-14` at tick 475, and `surrenderOffered` false.

`REVISE` if Rook's `captivity.cause` is not `outscore-loss`, if the captor is not `free-tide`, if either `actingCommanderId` is set, if Glassport's `factionId` is not `world-government` or its garrison is not 6, if the surrender block is missing, or if either briefing sentence differs.

`ABANDON` if any advance pauses (`pausedForBattle` true or `ticksAdvanced` less than the body asked for), if state tick 476 has no sequence 59637 on the first page and none on `beforeSequence=59638`, or if `captivity` is missing on Rook's card.

`surrenderOffered` false beside that surrender block is not a revise. `player.displayName` `Prototype Commander` beside `party.name` `Mara Vane` is not a revise. Both are already on the open list.

The tick-72 hash is not this session. Do not try to read it from the dashboard.
