# Playtest plan: command seat

This is the plan for a blind operator. It is not a completed session. Do not run it as part of writing the change. Do not open `src/`, `tests/`, the branch diff, or `docs/design/` during the session. Use only the dashboard HTTP JSON.

One session. One process. Seed 2718. Send the three commands below, and no others, and no messages. A quiet run never puts a seat holder in captivity, so a null `actingCommanderId` on that run does not show the cover. This session captures Mara and reads the World Government row.

Quiet-run note, not a step. Do not reset to chase it. With no commands, on seed 2718, state tick 72 has 8513 events. The first page is sequences 8314 through 8513. Sequence 8402, event tick 71, is `character-captured` for Mina Vale (`character-15`) at `crown-harbor`. The feed summary is `Mina Vale: character captured`, `payloadWithheld` true, and `data` null, so the feed does not carry a cause field. The briefing item `event:8402` does: "Mina Vale was captured at Crown Harbor after failed retreat". That is the failed-retreat capture. Both `actingCommanderId` values stay null. She is not the issuer.

## Setup

- Node `v24.21.0` (`nvm use 24.21.0` if `node -v` is not that). `npm ci` first if `node_modules` is missing.
- Branch `feature/commander-seat`. Record `git rev-parse HEAD` before the first request.
- One process. `npm run dashboard -- --reset --seed 2718` on `http://127.0.0.1:4317`. Do not start a second seed.
- `GET /api/health` should be HTTP 200 `{"ok":true,"tick":0,"events":0}`.
- The player is already Mara Vane, `character-01`, `playerId` `prototype-player`. Do not pass another character. Commands are `POST /api/commands` with that `playerId`. Send only the three bodies in this plan.
- Read state with `GET /api/state?limit=200`. Omit `beforeSequence` on the first read of a checkpoint. The page is newest-last in `eventPage` and the `events` array is newest-first. Find a checkpoint by its `sequence`. If that sequence is below `eventPage.oldestSequence`, the fallback is `GET /api/state?limit=200&beforeSequence=<that sequence + 1>`. The vacancy capture's fallback is `beforeSequence=3933`.
- `briefing.items` carries the outcome sentence. Quote that sentence. On a withheld feed row the sentence is not the event summary. On Mara's own capture the feed summary and the briefing sentence are the same text.
- Advance with `POST /api/advance`. Body `{"ticks":N}`. `N` is an integer from 1 to 144. This plan uses 27, then 5, then 1, then 1.
- `tick` on an event is the tick the world was on while that event was written. `tick` on the state is the tick after that advance. Advance `day` is unrounded. State `day` is rounded to two places.

The seat checkpoint is the faction row at state tick 34. Do not advance again after the battle pauses until the retreat command has been accepted.

## Hypothesis and ambition

**Hypothesis.** A failed retreat that captures Mara leaves World Government's `commanderId` as `character-01` and sets `actingCommanderId` to `character-06`. Free Tide's commander stays `character-14` and its `actingCommanderId` stays null. Iris Stone's order still has `issuerId` `character-01`.

**Ambition.** Sail from Crown Harbor to Cinder Key, raid, retreat after the first phase, and read the World Government row once Mara is captive.

**What you can see.** Mara's seat, her cover, her captivity, and her own command payloads. Not another faction's treasury or power. Not a rival capture's payload: the quiet-run note above is withheld.

## Characters

| Name | Id | What to watch |
| --- | --- | --- |
| Mara Vane | `character-01` | The player. World Government's commander. The vacancy is hers. |
| Iris Stone | `character-06` | Reporting officer. Covers the seat. Does not become the issuer. |
| Pax Ash | `character-14` | Free Tide's commander. Not captured. Acting stays null. |

## State tick 0

`GET /api/health`. HTTP 200.

```json
{"ok":true,"tick":0,"events":0}
```

`GET /api/state?limit=200`. HTTP 200.

- `tick` 0. `day` 0. `commanderId` `character-01`.
- `player.reportingOfficerId` `character-06`.
- `party.name` `Mara Vane`. `party.locationId` `crown-harbor`.
- `captivity.active` null.
- `briefing.attentionCount` 0. `briefing.items` is `[]`.
- `eventPage` count 0, limit 200, total 0, `hasMore` false, `oldestSequence` null, `newestSequence` null, `cursor` null.
- Factions, in this order:

| id | name | commanderId | actingCommanderId | treasury | power |
| --- | --- | --- | --- | --- | --- |
| `free-tide` | Free Tide Compact | `character-14` | null | null | null |
| `world-government` | World Government | `character-01` | null | 18000 | 2475.55 |

Iris Stone, `characters` id `character-06`, holds standing order `character-01:order:character-06` with `issuerId` `character-01`.

## Advance to state tick 27

`POST /api/advance` `{"ticks":27}`. HTTP 200. `ok` true. `tick` 27. `ticksAdvanced` 27. `day` 4.5. `combatUpdated` false. `attentionUpdated` false. `pausedForBattle` false. `eventSequence` 3183.

`GET /api/state?limit=200`. HTTP 200.

- `tick` 27. `day` 4.5. `party.locationId` `crown-harbor`. `captivity.active` null.
- `eventPage` count 200, limit 200, total 3183, `hasMore` true, `oldestSequence` 2984, `newestSequence` 3183, `cursor` 2984. The page is sequences 2984 through 3183.
- Free Tide unchanged: `commanderId` `character-14`, `actingCommanderId` null, `treasury` null, `power` null.
- World Government `commanderId` `character-01`, `actingCommanderId` null, `treasury` 18535.28, `power` 2408.14.

No checkpoint event on this page.

## Travel

`POST /api/commands`

```json
{"playerId":"prototype-player","type":"character-action","action":"travel","targetId":"cinder-key"}
```

HTTP 202. Body, punctuation exact:

```json
{"ok":true,"command":{"id":"command-00001","playerId":"prototype-player","issuedTick":27,"type":"character-action","action":"travel","targetId":"cinder-key"}}
```

`POST /api/advance` `{"ticks":5}`. HTTP 200. `ok` true. `tick` 32. `ticksAdvanced` 5. `day` 5.333333333333333. `combatUpdated` false. `attentionUpdated` false. `pausedForBattle` false. `eventSequence` 3789.

`GET /api/state?limit=200`. HTTP 200.

- `tick` 32. `day` 5.33. `party.locationId` `cinder-key`.
- `eventPage` count 200, limit 200, total 3789, `hasMore` true, `oldestSequence` 3590, `newestSequence` 3789, `cursor` 3590.
- World Government `treasury` 18591.52, `power` 2414.99. `commanderId` still `character-01`. `actingCommanderId` still null.
- Sequence 3683 is on this page. Event `tick` 31, `day` 5.17, `type` `arrived`, `actorId` `character-01`, `settlementId` `cinder-key`, `payloadWithheld` false, summary `Mara Vane arrived at Cinder Key`.

## Raid

`POST /api/commands`

```json
{"playerId":"prototype-player","type":"character-action","action":"raid"}
```

HTTP 202. The command's `targetId` is `cinder-key`. Body, punctuation exact:

```json
{"ok":true,"command":{"id":"command-00002","playerId":"prototype-player","issuedTick":32,"type":"character-action","action":"raid","targetId":"cinder-key"}}
```

`POST /api/advance` `{"ticks":1}`. HTTP 200. `ok` true. `tick` 33. `ticksAdvanced` 1. `day` 5.5. `combatUpdated` true. `attentionUpdated` false. `pausedForBattle` true. `eventSequence` 3922.

Stop. Do not advance again until the retreat below has been accepted. Another advance would fight the next phase.

`GET /api/state?limit=200`. HTTP 200.

- `tick` 33. `day` 5.5. `party.locationId` `cinder-key`.
- `combat.commandedBattle.id` is `battle-003800`.
- `eventPage` count 200, limit 200, total 3922, `hasMore` true, `oldestSequence` 3723, `newestSequence` 3922, `cursor` 3723. Sequences 3800 and 3801 are on this page.
- Sequence 3800, event `tick` 32, `type` `battle-started`, `payloadWithheld` false, summary `Mara Vane committed to a major battle at Cinder Key`. `data.battle.id` `battle-003800`.
- Sequence 3801, event `tick` 32, `type` `battle-phase-resolved`, `payloadWithheld` false, summary `Mara Vane completed phase 1 at Cinder Key`. `data.phase` 1. `data.outcome` `attacker-advantage`. `data.captureRisk` `low`.

## Retreat

`POST /api/commands`

```json
{"playerId":"prototype-player","type":"retreat-battle","battleId":"battle-003800"}
```

HTTP 202. Body, punctuation exact:

```json
{"ok":true,"command":{"id":"command-00003","playerId":"prototype-player","issuedTick":33,"type":"retreat-battle","battleId":"battle-003800"}}
```

The tick stays 33 until the next advance.

`POST /api/advance` `{"ticks":1}`. HTTP 200. `ok` true. `tick` 34. `ticksAdvanced` 1. `day` 5.666666666666667. `combatUpdated` false. `attentionUpdated` true. `pausedForBattle` false. `eventSequence` 4049.

## State tick 34

`GET /api/state?limit=200`. HTTP 200. This is the vacancy.

- `tick` 34. `day` 5.67. `commanderId` `character-01`. `party.locationId` `cinder-key`.
- Factions, in this order:

| id | name | commanderId | actingCommanderId | treasury | power |
| --- | --- | --- | --- | --- | --- |
| `free-tide` | Free Tide Compact | `character-14` | null | null | null |
| `world-government` | World Government | `character-01` | `character-06` | 18667.37 | 2173.45 |

- `captivity.active`: `cause` `failed-retreat`, `settlementId` `cinder-key`, `captorFactionId` `free-tide`, `capturedTick` 33, `mandatoryReleaseTick` 117, `canEscape` true.
- Briefing item `event:3932`, `severity` `warning`, summary `Mara Vane was captured at Cinder Key after failed retreat`. That sentence is the outcome text on `briefing.items`. Other items are on the list. This one is the checkpoint.
- `eventPage` count 200, limit 200, total 4049, `hasMore` true, `oldestSequence` 3850, `newestSequence` 4049, `cursor` 3850. The page is sequences 3850 through 4049. Sequences 3932 and 3933 are on it. No `beforeSequence` on this read.
- Sequence 3932, event `tick` 33, `day` 5.5, `type` `character-captured`, `actorId` `character-01`, `targetId` `free-tide`, `settlementId` `cinder-key`, `payloadWithheld` false, summary `Mara Vane was captured at Cinder Key after failed retreat`. `data.cause` `failed-retreat`. `data.captureChance` 0.04. `data.captureRoll` 0.0258.
- Sequence 3933, event `tick` 33, `type` `player-command-resolved`, `payloadWithheld` false, summary `Mara Vane: character captured`. `data.commandId` `command-00003`. `data.outcome` `character-captured`.
- Iris Stone's standing order `character-01:order:character-06` still has `issuerId` `character-01`. On this read its `status` is `completed`. The check is the issuer, not a new order id.

Fallback, if a later read has moved sequence 3932 off the first page: `GET /api/state?limit=200&beforeSequence=3933`. HTTP 200. `eventPage.total` 4049, `oldestSequence` 3733, `newestSequence` 3932, count 200, `hasMore` true. Sequence 3932 is the newest event on that page. Sequence 3933 is not on it.

## Recommendation

`PROMOTE` if the state-tick-34 checks match: both faction rows, `captivity.active` with those fields, briefing `event:3932` with that sentence, sequence 3932 `character-captured` with `payloadWithheld` false and those capture numbers, sequence 3933 `player-command-resolved` with summary `Mara Vane: character captured`, and Iris's order still issued by `character-01`.

`REVISE` if Mara is captive but `actingCommanderId` is null or not `character-06`, if World Government's `commanderId` became `character-06`, if sequence 3932 is a `battle-retreated`, or if the briefing text differs.

`ABANDON` if the raid or the retreat returns HTTP 400, if `captivity.active` is null at state tick 34, or if a faction row lacks the `commanderId` or `actingCommanderId` key.

## Session

Blind operator. Did not open `src/`, `tests/`, `docs/design/`, or the branch diff or log. One process. No second seed. Three command bodies only, in the plan's order. Advances were 27, then 5, then 1, then 1. Nothing was advanced between the raid pause and the retreat.

- Branch `feature/commander-seat`. `git rev-parse HEAD` before the first request: `1c2bd0f70ee64711b651102cc0fb94771a604879`.
- Node `v24.21.0` after `nvm use 24.21.0`. `npm ci`. `npm run dashboard -- --reset --seed 2718` on `http://127.0.0.1:4317`.
- Player already Mara Vane, `character-01`, `playerId` `prototype-player`.

### State tick 0

`GET /api/health` HTTP 200. Body `{"ok":true,"tick":0,"events":0}`. Match.

`GET /api/state?limit=200` HTTP 200.

| Check | Expected | Actual |
| --- | --- | --- |
| `tick` / `day` | 0 / 0 | 0 / 0 |
| top-level `commanderId` | `character-01` | `character-01` |
| `player.reportingOfficerId` | `character-06` | `character-06` |
| `party.name` / `party.locationId` | Mara Vane / `crown-harbor` | Mara Vane / `crown-harbor` |
| `captivity.active` | null | null |
| `briefing.attentionCount` / `briefing.items` | 0 / `[]` | 0 / `[]` |
| `eventPage` | count 0, limit 200, total 0, `hasMore` false, oldest/newest/cursor null | same |
| Free Tide | `character-14`, acting null, treasury null, power null | same, and first |
| World Government | `character-01`, acting null, treasury 18000, power 2475.55 | same, and second |
| Iris order `character-01:order:character-06` | `issuerId` `character-01` | `issuerId` `character-01` (`status` `pending`) |

No sequences. `events` length 0.

### Advance to state tick 27

`POST /api/advance` `{"ticks":27}` HTTP 200. `ok` true, `tick` 27, `ticksAdvanced` 27, `day` 4.5, `combatUpdated` false, `attentionUpdated` false, `pausedForBattle` false, `eventSequence` 3183. Match.

`GET /api/state?limit=200` HTTP 200. `tick` 27, `day` 4.5, `party.locationId` `crown-harbor`, `captivity.active` null. `eventPage` count 200, limit 200, total 3183, `hasMore` true, `oldestSequence` 2984, `newestSequence` 3183, `cursor` 2984. The `events` array is newest-first and contiguous, sequences 2984 through 3183. Free Tide unchanged (`character-14`, acting null, treasury null, power null). World Government `commanderId` `character-01`, `actingCommanderId` null, `treasury` 18535.28, `power` 2408.14. Match. No named checkpoint event on this page.

### Travel

`POST /api/commands` with the travel body. HTTP 202. Body exact:

`{"ok":true,"command":{"id":"command-00001","playerId":"prototype-player","issuedTick":27,"type":"character-action","action":"travel","targetId":"cinder-key"}}`

`POST /api/advance` `{"ticks":5}` HTTP 200. `ok` true, `tick` 32, `ticksAdvanced` 5, `day` 5.333333333333333, `combatUpdated` false, `attentionUpdated` false, `pausedForBattle` false, `eventSequence` 3789. Match.

`GET /api/state?limit=200` HTTP 200. `tick` 32, `day` 5.33, `party.locationId` `cinder-key`. `eventPage` count 200, limit 200, total 3789, `hasMore` true, `oldestSequence` 3590, `newestSequence` 3789, `cursor` 3590. Page is sequences 3590 through 3789. World Government `treasury` 18591.52, `power` 2414.99, `commanderId` `character-01`, `actingCommanderId` null. Sequence 3683 is on the page: event `tick` 31, `day` 5.17, `type` `arrived`, `actorId` `character-01`, `settlementId` `cinder-key`, `payloadWithheld` false, summary `Mara Vane arrived at Cinder Key`. Match.

### Raid

`POST /api/commands` with the raid body. HTTP 202. Body exact, including `targetId` `cinder-key`:

`{"ok":true,"command":{"id":"command-00002","playerId":"prototype-player","issuedTick":32,"type":"character-action","action":"raid","targetId":"cinder-key"}}`

`POST /api/advance` `{"ticks":1}` HTTP 200. `ok` true, `tick` 33, `ticksAdvanced` 1, `day` 5.5, `combatUpdated` true, `attentionUpdated` false, `pausedForBattle` true, `eventSequence` 3922. Match. Stopped.

`GET /api/state?limit=200` HTTP 200. `tick` 33, `day` 5.5, `party.locationId` `cinder-key`. `combat.commandedBattle.id` `battle-003800`. `eventPage` count 200, limit 200, total 3922, `hasMore` true, `oldestSequence` 3723, `newestSequence` 3922, `cursor` 3723. Sequences 3800 and 3801 are on the page (3723 through 3922).

- Sequence 3800: event `tick` 32, `type` `battle-started`, `payloadWithheld` false, summary `Mara Vane committed to a major battle at Cinder Key`. `data.battle.id` `battle-003800`.
- Sequence 3801: event `tick` 32, `type` `battle-phase-resolved`, `payloadWithheld` false, summary `Mara Vane completed phase 1 at Cinder Key`. `data.phase` 1, `data.outcome` `attacker-advantage`, `data.captureRisk` `low`.

Match.

### Retreat

`POST /api/commands` with the retreat body. HTTP 202. Body exact:

`{"ok":true,"command":{"id":"command-00003","playerId":"prototype-player","issuedTick":33,"type":"retreat-battle","battleId":"battle-003800"}}`

A read, not an advance: `GET /api/health` then returned HTTP 200 `{"ok":true,"tick":33,"events":3923}`. Tick stayed 33. The extra event is sequence 3923 on the next page, `player-command-accepted`, summary `Command queued for Mara Vane`, `data.command.id` `command-00003`.

`POST /api/advance` `{"ticks":1}` HTTP 200. `ok` true, `tick` 34, `ticksAdvanced` 1, `day` 5.666666666666667, `combatUpdated` false, `attentionUpdated` true, `pausedForBattle` false, `eventSequence` 4049. Match.

### State tick 34

`GET /api/state?limit=200` HTTP 200. No `beforeSequence`. `tick` 34, `day` 5.67, top-level `commanderId` `character-01`, `party.locationId` `cinder-key`.

Factions, in this order:

| id | name | commanderId | actingCommanderId | treasury | power |
| --- | --- | --- | --- | --- | --- |
| `free-tide` | Free Tide Compact | `character-14` | null | null | null |
| `world-government` | World Government | `character-01` | `character-06` | 18667.37 | 2173.45 |

Both rows include the `commanderId` and `actingCommanderId` keys. Match.

`captivity.active`: `cause` `failed-retreat`, `settlementId` `cinder-key`, `captorFactionId` `free-tide`, `capturedTick` 33, `mandatoryReleaseTick` 117, `canEscape` true. The same object also carries `displayedRisk` `low`, `scatteredTroops`, `releaseDestinationId` `glassport`, `settlementName` `Cinder Key`, `captorName` `Free Tide Compact`, `heldDays` 0.17, `daysUntilMandatoryRelease` 13.83. The named fields match.

Briefing item `event:3932`, `severity` `warning`, summary `Mara Vane was captured at Cinder Key after failed retreat`. That sentence is the outcome text. Other items are on the list (`attentionCount` 11). This one is the checkpoint. Match.

`eventPage` count 200, limit 200, total 4049, `hasMore` true, `oldestSequence` 3850, `newestSequence` 4049, `cursor` 3850. The page is sequences 3850 through 4049. Sequences 3932 and 3933 are on it. The `beforeSequence=3933` fallback was not needed.

- Sequence 3932: event `tick` 33, `day` 5.5, `type` `character-captured`, `actorId` `character-01`, `targetId` `free-tide`, `settlementId` `cinder-key`, `payloadWithheld` false, summary `Mara Vane was captured at Cinder Key after failed retreat`. `data.cause` `failed-retreat`. `data.captureChance` 0.04. `data.captureRoll` 0.0258. Not a `battle-retreated`.
- Sequence 3933: event `tick` 33, `type` `player-command-resolved`, `payloadWithheld` false, summary `Mara Vane: character captured`. `data.commandId` `command-00003`. `data.outcome` `character-captured`.

The feed summary on 3932 and the briefing sentence are the same text.

Iris Stone, `characters` id `character-06`, standing order `character-01:order:character-06`, `issuerId` `character-01`, `status` `completed`. No new order id. Match.

## Findings

**Verdict: PROMOTE.**

The state-tick-34 checks match the promotion rule: both faction rows, `captivity.active` with those fields, briefing `event:3932` with that sentence, sequence 3932 `character-captured` with `payloadWithheld` false and those capture numbers, sequence 3933 `player-command-resolved` with summary `Mara Vane: character captured`, and Iris's order still issued by `character-01`. World Government's `commanderId` stayed `character-01`. `actingCommanderId` is `character-06`, not null. Sequence 3932 is not a `battle-retreated`. The raid and the retreat were HTTP 202, not 400. Every earlier checkpoint in this session matched as well, including the HTTP codes, the three command bodies, and the sequence pages above. No `beforeSequence` fallback was required.

**Mismatches:** none.

**Player-facing readability.** The numbers are legible. What the seat is doing is not said in a sentence.

- The player can tell who is named on the cover by joining ids. World Government's `actingCommanderId` is `character-06`, and `characters` id `character-06` is `name` `Iris Stone`. The faction row itself has no name, and the whole state JSON has no string `seat` and no use of "cover" for this duty (`cover` appears only inside "money covers the quoted passage" and `troopRecovery`). `capabilities` does not define `actingCommanderId`. No briefing item and no event says that Iris is covering, that the cover lasts while Mara is captive, or that the cover does not become the issuer.
- At tick 0, `player.reportingOfficerId` and `briefing.reportingOfficer` are already Iris Stone (`character-06`), while `actingCommanderId` is null. At tick 34 both the reporting officer and `actingCommanderId` are `character-06`. The only new signal is that one id on the faction row. A player can read her as the same reporting officer she already was.
- What the cover means is inferable only by comparing fields: `commanderId` stays `character-01`, and Iris's order `issuerId` stays `character-01`. There is no sentence that the captive holder remains the issuer. The order's `status` is `completed`, and `lastReport` does explain why: "Mara Vane did not answer Iris Stone's completion report within a day, and the order closed." `statusChangedTick` is 12, before the capture, so that close is readable as silence rather than as the seat moving.
- Iris's own card at tick 34 has `locationId` null. On the same page her rows are withheld: sequence 3952 `travel-started`, summary `Iris Stone: travel started`, `payloadWithheld` true, `data` null, and the same shape for `decision-made`, `knowledge-updated`, `character-upkeep`, and `goal-progressed`. The player cannot see where the person on `actingCommanderId` is.
- The briefing still warns `Iris Stone lost at Cinder Key` (`event:2147`, day 3, title `battle resolved`) with no reason, on the same read that names her as acting commander. `Mina Vale lost at Glassport` is the same shape. A grouped line doubles the period: `2 such reports, the most recent being: Rook Tern diverted to travel while retaining protect orders for Crown Harbor.. The first was on day 1.`
- The captivity card says `Held at Cinder Key. Escape is guaranteed but dangerous; bounded release terms become mandatory in 13.8 days.` `canEscape` is true, and the capture row's `displayedRisk` is `low` with `captureChance` 0.04. "Guaranteed" reads as if the escape succeeds, while the numbers are about how she was caught.
- `player.displayName` is `Prototype Commander` while `party.name` is `Mara Vane`. The feed and the briefing use Mara Vane.
