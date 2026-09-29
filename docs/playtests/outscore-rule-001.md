# Playtest plan: outscore rule

This is the plan for a blind operator. It is not a completed session. Do not run it while writing the change. Do not open `src/`, `tests/`, the branch diff, or `docs/design/battle-morale.md` during the session. Use only the dashboard HTTP JSON.

The note's session was seed 4096, ticks 0–310, Esme Dusk at Glassport, event tick 298, scores 192.971 / 48.5. That fight is not this build. On this build the first same-score flip is Pax Ash at Glassport, event tick 475, and Mara is not standing there. This session stays on seed 1847, at Crown Harbor, and reads the first outscore battle she can see from the dock, then the two claims that follow it.

## Setup

- Node `v24.21.0` (`nvm use 24.21.0` if `node -v` is not that). `npm ci` first if `node_modules` is missing.
- **Start:** `npm run dashboard -- --reset --seed 1847` on `http://127.0.0.1:4317`.
- The player is Mara Vane, `character-01`, `playerId` `prototype-player`. Do not pass another character. This plan sends no commands.
- `GET /api/health` is HTTP 200 `{"ok":true,"tick":0,"events":0}`.
- Read state with `GET /api/state?limit=200`. The server's default limit is 100 and the maximum is 200. Pass `limit=200` on every read in this plan.
- Omit `beforeSequence` on the first read of a checkpoint. The page is newest-last in `eventPage` and the `events` array is newest-first. Find a checkpoint by its `sequence`, not by its position on the page.
- A checkpoint sequence below is on that checkpoint's first page. If a later advance has moved the page, the fallback at the end says which `beforeSequence` reaches it. That fallback was checked against the same event list: sequences are contiguous, and `eventPage.newestSequence` equals `eventPage.total`.
- Advance with `POST /api/advance`. `ticks` must be an integer from 1 to 144. The body is `{"ticks":N}`.
- `tick` on an event is the tick the world was on while that event was written. `tick` on the state is one ahead of the events just applied. Advance `day` is unrounded. State `day` is rounded to two places. `99.16666666666667` on an advance and `99.17` on the next state read are the same tick.

## Hypothesis and ambition

**Hypothesis.** Pax Ash's Crown Harbor battle at event tick 594 is the first outscore fight Mara can watch from the dock. The port is still World Government afterward, with 12 soldiers and a surrender block aimed at Pax. He claims it on event tick 595. Iris Stone's side takes it back on event tick 597, and the panel then shows 7 soldiers under World Government.

**Ambition.** Send no commands. Stay at Crown Harbor. Read the panel and the log.

**Success signal.** The five sequences below are the events named, on the pages named, and the Crown Harbor panel moves `world-government` → `free-tide` → `world-government` on the ticks named. The battle and claim payloads stay withheld.

## Characters

| Name | Id | What to watch |
| --- | --- | --- |
| Mara Vane | `character-01` | The player. Stays at `crown-harbor`. |
| Pax Ash | `character-14` | The battle at event tick 594 and the claim at event tick 595. |
| Niko Wren | `character-03` | Owner of Crown Harbor before Pax's claim. Also fights there at event tick 596. |
| Iris Stone | `character-06` | Fights at event tick 596 and claims at event tick 597. Owner after that claim. |

## Advance to state tick 594

Four advances, then one short one. No state read until the fifth returns.

1. `POST /api/advance` `{"ticks":144}`. HTTP 200. `tick` 144. `ticksAdvanced` 144. `day` 24.
2. `POST /api/advance` `{"ticks":144}`. HTTP 200. `tick` 288. `ticksAdvanced` 144. `day` 48.
3. `POST /api/advance` `{"ticks":144}`. HTTP 200. `tick` 432. `ticksAdvanced` 144. `day` 72.
4. `POST /api/advance` `{"ticks":144}`. HTTP 200. `tick` 576. `ticksAdvanced` 144. `day` 96.
5. `POST /api/advance` `{"ticks":18}`. HTTP 200. `tick` 594. `ticksAdvanced` 18. `day` 99.

`GET /api/state?limit=200`.

- `tick` 594. `day` 99. `party.name` `Mara Vane`. `party.locationId` `crown-harbor`. `player.characterId` `character-01`.
- First page: `eventPage.count` 200, `eventPage.total` 77451, `eventPage.oldestSequence` 77252, `eventPage.newestSequence` 77451, `eventPage.cursor` 77252, `eventPage.hasMore` true.
- Crown Harbor, `crown-harbor`: `factionId` `world-government`, `ownerId` `character-03`, `garrison` 14, `stability` 57.85, `surrender` null, `surrenderOffered` false, `battleInProgress` false. `intelligence.exact` true, `intelligence.present` true, `intelligence.source` `owned`, `intelligence.confidence` 1, `intelligence.observedTick` 594, `intelligence.ageTicks` 0. `garrisonIntelligence.source` `owned`, `garrisonIntelligence.observedTick` 594, `garrisonIntelligence.ageTicks` 0.
- This page has no `battle-resolved` and no `settlement-claimed` for `crown-harbor`. Pax's fight has not been written yet.

## Advance to state tick 595

`POST /api/advance` `{"ticks":1}`. HTTP 200. `tick` 595. `ticksAdvanced` 1. Advance `day` is `99.16666666666667`.

`GET /api/state?limit=200`.

- `tick` 595. `day` 99.17. `party.locationId` `crown-harbor`.
- First page: `eventPage.count` 200, `eventPage.total` 77606, `eventPage.oldestSequence` 77407, `eventPage.newestSequence` 77606, `eventPage.cursor` 77407, `eventPage.hasMore` true.
- Sequence 77530 is on this page. It is the only `battle-resolved` with `settlementId` `crown-harbor` and event `tick` 594.
- Sequence 77530, event `tick` 594, `day` 99, `battle-resolved`, `actorId` `character-14`, `targetId` `world-government`, `settlementId` `crown-harbor`, `payloadWithheld` true, `data` null, summary `Pax Ash: battle resolved`.
- Crown Harbor: `factionId` `world-government`, `ownerId` `character-03`, `garrison` 12, `stability` 53.88, `battleInProgress` false, `surrenderOffered` false. `surrender.offeredToId` `character-14`, `surrender.offeredTick` 594, `surrender.previousFactionId` `world-government`. `intelligence.exact` true, `intelligence.present` true, `intelligence.source` `owned`, `intelligence.confidence` 1, `intelligence.observedTick` 595, `intelligence.ageTicks` 0.
- No `character-captured` for `character-14` at event tick 594.

The surrender block names Pax while `surrenderOffered` is false. That pair is the reading. Do not treat it as a failed run. The port is still World Government, so the offer is not Mara's to accept.

**Withheld on this page.** Sequence 77530's payload. The outcome, the scores, the garrison, and the morale are not in the JSON. The panel is how the 12 soldiers and the offer are known.

## Advance to state tick 596

`POST /api/advance` `{"ticks":1}`. HTTP 200. `tick` 596. `ticksAdvanced` 1. Advance `day` is `99.33333333333333`.

`GET /api/state?limit=200`.

- `tick` 596. `day` 99.33. `party.locationId` `crown-harbor`.
- First page: `eventPage.count` 200, `eventPage.total` 77754, `eventPage.oldestSequence` 77555, `eventPage.newestSequence` 77754, `eventPage.cursor` 77555, `eventPage.hasMore` true.
- Sequence 77530 is not on this page. Sequence 77678 is.
- Sequence 77678, event `tick` 595, `day` 99.17, `settlement-claimed`, `actorId` `character-14`, `targetId` `world-government`, `settlementId` `crown-harbor`, `payloadWithheld` true, `data` null, summary `Pax Ash: settlement claimed`.
- Crown Harbor is no longer an owned reading. `factionId` `free-tide`, `ownerId` `character-14`, `garrison` 12, `stability` 55, `surrender` null, `surrenderOffered` false, `battleInProgress` false. `intelligence.exact` false, `intelligence.present` true, `intelligence.source` `direct-observation`, `intelligence.confidence` 1, `intelligence.observedTick` 596, `intelligence.ageTicks` 0. `garrisonIntelligence.source` `direct-observation`, `garrisonIntelligence.observedTick` 596, `garrisonIntelligence.ageTicks` 0.

`surrender` null here is the foreign-port projection. Mara is standing on the island, so the garrison and the holder are live. They are not the tick-0 rumor.

## Advance to state tick 597

`POST /api/advance` `{"ticks":1}`. HTTP 200. `tick` 597. `ticksAdvanced` 1. Advance `day` is `99.5`. The state read also says `day` 99.5.

`GET /api/state?limit=200`.

- `tick` 597. `day` 99.5. `party.locationId` `crown-harbor`.
- First page: `eventPage.count` 200, `eventPage.total` 77914, `eventPage.oldestSequence` 77715, `eventPage.newestSequence` 77914, `eventPage.cursor` 77715, `eventPage.hasMore` true.
- Sequences 77530 and 77678 are not on this page. Sequences 77776 and 77799 are. Those are the only two `battle-resolved` events with `settlementId` `crown-harbor` and event `tick` 596.
- Sequence 77776, event `tick` 596, `day` 99.33, `battle-resolved`, `actorId` `character-03`, `targetId` `free-tide`, `settlementId` `crown-harbor`, `payloadWithheld` true, `data` null, summary `Niko Wren: battle resolved`.
- Sequence 77799, event `tick` 596, `day` 99.33, `battle-resolved`, `actorId` `character-06`, `targetId` `free-tide`, `settlementId` `crown-harbor`, `payloadWithheld` true, `data` null, summary `Iris Stone: battle resolved`.
- Crown Harbor stays Free Tide for this read. `factionId` `free-tide`, `ownerId` `character-14`, `garrison` 7, `stability` 47.03, `surrender` null, `surrenderOffered` false, `battleInProgress` false. `intelligence.exact` false, `intelligence.present` true, `intelligence.source` `direct-observation`, `intelligence.confidence` 1, `intelligence.observedTick` 597, `intelligence.ageTicks` 0.

## Advance to state tick 598

`POST /api/advance` `{"ticks":1}`. HTTP 200. `tick` 598. `ticksAdvanced` 1. Advance `day` is `99.66666666666667`.

`GET /api/state?limit=200`.

- `tick` 598. `day` 99.67. `party.locationId` `crown-harbor`.
- First page: `eventPage.count` 200, `eventPage.total` 78051, `eventPage.oldestSequence` 77852, `eventPage.newestSequence` 78051, `eventPage.cursor` 77852, `eventPage.hasMore` true.
- Sequences 77530, 77678, 77776, and 77799 are not on this page. Sequence 77938 is.
- Sequence 77938, event `tick` 597, `day` 99.5, `settlement-claimed`, `actorId` `character-06`, `targetId` `free-tide`, `settlementId` `crown-harbor`, `payloadWithheld` true, `data` null, summary `Iris Stone: settlement claimed`.
- Crown Harbor is an owned reading again. `factionId` `world-government`, `ownerId` `character-06`, `garrison` 7, `stability` 55, `surrender` null, `surrenderOffered` false, `battleInProgress` false. `intelligence.exact` true, `intelligence.present` true, `intelligence.source` `owned`, `intelligence.confidence` 1, `intelligence.observedTick` 598, `intelligence.ageTicks` 0. `garrisonIntelligence.source` `owned`, `garrisonIntelligence.observedTick` 598, `garrisonIntelligence.ageTicks` 0.

## Reaching a sequence after the page has moved

Do this only if the first page no longer contains the sequence the step named. Stay on state tick 598. `GET /api/state?limit=200` is oldest 77852, newest 78051, and holds sequence 77938.

- `GET /api/state?limit=200&beforeSequence=77852`. Oldest 77652, newest 77851. This page holds sequence 77678, sequence 77776, and sequence 77799. It does not hold 77530 or 77938.
- `GET /api/state?limit=200&beforeSequence=77652`. Oldest 77452, newest 77651. This page holds sequence 77530. It does not hold 77678.

Each of those three reads was checked against the event list. A sequence in the range `oldestSequence` through `newestSequence` is on that page.

## Withheld from the player

Every `battle-resolved` and `settlement-claimed` line above has `payloadWithheld` true and `data` null. The visible fields are `sequence`, `tick`, `day`, `type`, `actorId`, `targetId`, `settlementId`, and the neutral summary, with that exact punctuation.

Not in the JSON, on any of these reads: the outcome string, either score, the garrison the battle wrote, and the morale. There is no `character-captured` for Pax from event tick 594. A `decision-made` line, if one is on the page, is also withheld. Do not read a missing battle row as the only way to know a captain fought: the battle rows above are present, and their payloads are empty.

The owned panel at state tick 595 is the one place the surrender block is visible. At state ticks 596 and 597 the same port is Free Tide, Mara is standing on it, and `surrender` is null because that branch of the panel does not copy the block.

## Recommendation

`PROMOTE` if all of these hold: state tick 595 shows Crown Harbor exact, `factionId` `world-government`, `ownerId` `character-03`, `garrison` 12, `stability` 53.88, surrender offered to `character-14` at tick 594, `surrenderOffered` false, and sequence 77530 is Pax Ash's `battle-resolved` at Crown Harbor on event tick 594. State tick 596 shows `factionId` `free-tide`, `ownerId` `character-14`, `garrison` 12, and sequence 77678. State tick 597 shows `garrison` 7 and sequences 77776 and 77799. State tick 598 shows `factionId` `world-government`, `ownerId` `character-06`, `garrison` 7, `stability` 55, and sequence 77938. Mara's `locationId` is `crown-harbor` on every one of those reads.

`REVISE` if state tick 595 still has garrison 14, or the surrender block is missing, or `stability` is above 60 while that block is present, or state tick 596 is not `free-tide` with owner `character-14`, or state tick 598 is not `world-government` with owner `character-06` and garrison 7.

`ABANDON` if sequence 77530 is absent from the state-tick-595 page whose oldest sequence is 77407, or if a later sequence is absent from the page the step names and absent from the fallback page that claims to hold it.

The tick-72 hash is not this session. Do not try to read it from the dashboard.

## Session / Findings

Blind session on `feature/outscore-rule` at `92f44e19519369425fd7c1fce38ac643164d37c1`. Node v24.21.0. `npm ci`, then `npm run dashboard -- --reset --seed 1847` on `http://127.0.0.1:4317`. No commands were sent. Every call below was HTTP 200. `beforeSequence` was not used: each sequence named by a checkpoint was on that checkpoint's first `limit=200` page.

### Setup

`GET /api/health` returned `{"ok":true,"tick":0,"events":0}`.

| Advance | Expected | Actual |
| --- | --- | --- |
| `{"ticks":144}` | `tick` 144, `ticksAdvanced` 144, `day` 24 | `{"ok":true,"tick":144,"ticksAdvanced":144,"day":24}` |
| `{"ticks":144}` | `tick` 288, `ticksAdvanced` 144, `day` 48 | `{"ok":true,"tick":288,"ticksAdvanced":144,"day":48}` |
| `{"ticks":144}` | `tick` 432, `ticksAdvanced` 144, `day` 72 | `{"ok":true,"tick":432,"ticksAdvanced":144,"day":72}` |
| `{"ticks":144}` | `tick` 576, `ticksAdvanced` 144, `day` 96 | `{"ok":true,"tick":576,"ticksAdvanced":144,"day":96}` |
| `{"ticks":18}` | `tick` 594, `ticksAdvanced` 18, `day` 99 | `{"ok":true,"tick":594,"ticksAdvanced":18,"day":99}` |
| `{"ticks":1}` | `tick` 595, `ticksAdvanced` 1, `day` `99.16666666666667` | `{"ok":true,"tick":595,"ticksAdvanced":1,"day":99.16666666666667}` |
| `{"ticks":1}` | `tick` 596, `ticksAdvanced` 1, `day` `99.33333333333333` | `{"ok":true,"tick":596,"ticksAdvanced":1,"day":99.33333333333333}` |
| `{"ticks":1}` | `tick` 597, `ticksAdvanced` 1, `day` `99.5` | `{"ok":true,"tick":597,"ticksAdvanced":1,"day":99.5}` |
| `{"ticks":1}` | `tick` 598, `ticksAdvanced` 1, `day` `99.66666666666667` | `{"ok":true,"tick":598,"ticksAdvanced":1,"day":99.66666666666667}` |

On every state read: `party.name` `"Mara Vane"`, `party.locationId` `"crown-harbor"`, `player.characterId` `"character-01"`, `player.id` `"prototype-player"`.

### Checkpoint readings

**State tick 594.** Expected and actual matched.

- `tick` 594, `day` 99.
- `eventPage`: `count` 200, `total` 77451, `oldestSequence` 77252, `newestSequence` 77451, `cursor` 77252, `hasMore` true.
- Crown Harbor: `factionId` `"world-government"`, `ownerId` `"character-03"`, `garrison` 14, `stability` 57.85, `surrender` null, `surrenderOffered` false, `battleInProgress` false. `intelligence.exact` true, `intelligence.present` true, `intelligence.source` `"owned"`, `intelligence.confidence` 1, `intelligence.observedTick` 594, `intelligence.ageTicks` 0. `garrisonIntelligence.source` `"owned"`, `garrisonIntelligence.observedTick` 594, `garrisonIntelligence.ageTicks` 0.
- No `battle-resolved` and no `settlement-claimed` on this page, for `crown-harbor` or otherwise.

**State tick 595.** Expected and actual matched on the panel and on sequence 77530.

- `tick` 595, `day` 99.17.
- `eventPage`: `count` 200, `total` 77606, `oldestSequence` 77407, `newestSequence` 77606, `cursor` 77407, `hasMore` true.
- Sequence 77530 is on this page. It is the only `battle-resolved` on the page, and the only one with `settlementId` `"crown-harbor"` and event `tick` 594. Verbatim:

```json
{"sequence":77530,"tick":594,"day":99,"type":"battle-resolved","actorId":"character-14","targetId":"world-government","settlementId":"crown-harbor","summary":"Pax Ash: battle resolved","data":null,"payloadWithheld":true}
```

- Crown Harbor: `factionId` `"world-government"`, `ownerId` `"character-03"`, `garrison` 12, `stability` 53.88, `battleInProgress` false, `surrenderOffered` false. Surrender block, verbatim: `{"offeredToId":"character-14","offeredTick":594,"previousFactionId":"world-government"}`. `intelligence.exact` true, `intelligence.present` true, `intelligence.source` `"owned"`, `intelligence.confidence` 1, `intelligence.observedTick` 595, `intelligence.ageTicks` 0. `garrisonIntelligence.source` `"owned"`, `garrisonIntelligence.observedTick` 595, `garrisonIntelligence.ageTicks` 0. The plan did not name `garrisonIntelligence` on this read; that is what the API returned.
- No `character-captured` on this page. Nothing for `character-14` at event tick 594 of that type. Every `decision-made` on the page had `payloadWithheld` true and `data` null, including sequence 77526, summary `"Pax Ash: decision made"`.

**State tick 596.** Expected and actual matched.

- `tick` 596, `day` 99.33.
- `eventPage`: `count` 200, `total` 77754, `oldestSequence` 77555, `newestSequence` 77754, `cursor` 77555, `hasMore` true.
- Sequence 77530 is not on this page. Sequence 77678 is. It is the only `settlement-claimed` on the page. Verbatim:

```json
{"sequence":77678,"tick":595,"day":99.17,"type":"settlement-claimed","actorId":"character-14","targetId":"world-government","settlementId":"crown-harbor","summary":"Pax Ash: settlement claimed","data":null,"payloadWithheld":true}
```

- Crown Harbor: `factionId` `"free-tide"`, `ownerId` `"character-14"`, `garrison` 12, `stability` 55, `surrender` null, `surrenderOffered` false, `battleInProgress` false. `intelligence.exact` false, `intelligence.present` true, `intelligence.source` `"direct-observation"`, `intelligence.confidence` 1, `intelligence.observedTick` 596, `intelligence.ageTicks` 0. `garrisonIntelligence.source` `"direct-observation"`, `garrisonIntelligence.observedTick` 596, `garrisonIntelligence.ageTicks` 0.

**State tick 597.** Expected and actual matched.

- `tick` 597, `day` 99.5. The advance `day` was also `99.5`.
- `eventPage`: `count` 200, `total` 77914, `oldestSequence` 77715, `newestSequence` 77914, `cursor` 77715, `hasMore` true.
- Sequences 77530 and 77678 are not on this page. Sequences 77776 and 77799 are. They are the only two `battle-resolved` events on the page, both `settlementId` `"crown-harbor"` and event `tick` 596. Verbatim:

```json
{"sequence":77776,"tick":596,"day":99.33,"type":"battle-resolved","actorId":"character-03","targetId":"free-tide","settlementId":"crown-harbor","summary":"Niko Wren: battle resolved","data":null,"payloadWithheld":true}
```

```json
{"sequence":77799,"tick":596,"day":99.33,"type":"battle-resolved","actorId":"character-06","targetId":"free-tide","settlementId":"crown-harbor","summary":"Iris Stone: battle resolved","data":null,"payloadWithheld":true}
```

- Crown Harbor: `factionId` `"free-tide"`, `ownerId` `"character-14"`, `garrison` 7, `stability` 47.03, `surrender` null, `surrenderOffered` false, `battleInProgress` false. `intelligence.exact` false, `intelligence.present` true, `intelligence.source` `"direct-observation"`, `intelligence.confidence` 1, `intelligence.observedTick` 597, `intelligence.ageTicks` 0. `garrisonIntelligence.source` `"direct-observation"`, `garrisonIntelligence.observedTick` 597, `garrisonIntelligence.ageTicks` 0. The plan did not name `garrisonIntelligence` on this read; that is what the API returned.

**State tick 598.** Expected and actual matched.

- `tick` 598, `day` 99.67.
- `eventPage`: `count` 200, `total` 78051, `oldestSequence` 77852, `newestSequence` 78051, `cursor` 77852, `hasMore` true.
- Sequences 77530, 77678, 77776, and 77799 are not on this page. Sequence 77938 is. It is the only `settlement-claimed` on the page. Verbatim:

```json
{"sequence":77938,"tick":597,"day":99.5,"type":"settlement-claimed","actorId":"character-06","targetId":"free-tide","settlementId":"crown-harbor","summary":"Iris Stone: settlement claimed","data":null,"payloadWithheld":true}
```

- Crown Harbor: `factionId` `"world-government"`, `ownerId` `"character-06"`, `garrison` 7, `stability` 55, `surrender` null, `surrenderOffered` false, `battleInProgress` false. `intelligence.exact` true, `intelligence.present` true, `intelligence.source` `"owned"`, `intelligence.confidence` 1, `intelligence.observedTick` 598, `intelligence.ageTicks` 0. `garrisonIntelligence.source` `"owned"`, `garrisonIntelligence.observedTick` 598, `garrisonIntelligence.ageTicks` 0.

The five event payloads stayed withheld: `payloadWithheld` true and `data` null. Searches of these five state bodies found no `attackerScore`, no `defenderScore`, and no `"outcome"` key. `combat` on every one of these reads was `{"commandedBattle":null,"observedBattles":[],"active":null}`.

### Mismatches

The promotion readings matched. Two things the plan said about the same JSON did not.

The plan says the outcome string is not in the JSON on any of these reads. It is not on the event. It is on `briefing.items` in the same response:

| State tick | `briefing.items` sequence | `title` | `summary` |
| --- | --- | --- | --- |
| 595 | 77530 | `battle resolved` | `Pax Ash won at Crown Harbor` |
| 596 | 77678 | `settlement claimed` | `Pax Ash accepted Crown Harbor's surrender and established a claim` |
| 597 | 77776 | `battle resolved` | `Niko Wren won at Crown Harbor` |
| 597 | 77799 | `battle resolved` | `Iris Stone won at Crown Harbor` |
| 598 | 77938 | `settlement claimed` | `Iris Stone accepted Crown Harbor's surrender and established a claim` |

Those briefing lines stay on later pages. At state tick 598 the briefing still includes `Pax Ash won at Crown Harbor`, both day-99.33 win lines, and both surrender-claim lines.

The event log also shows a Crown Harbor garrison the battle line does not. Sequence 77455, event tick 594, `settlementId` `"crown-harbor"`, summary `"World: settlement upkeep"`, `payloadWithheld` false, `data.garrison` 15, `data.stability` 57.88, `data.garrisonLoss` 0. Sequence 77461, summary `"Mara Vane: knowledge updated"`, `payloadWithheld` false, `data.reason` `"direct local observation"`, `data.knowledge.garrisonEstimate` 15, `data.knowledge.factionId` `"world-government"`, `data.knowledge.observedTick` 594. The state-tick-594 panel, before those events existed, said garrison 14 and stability 57.85. The state-tick-595 panel said garrison 12 and stability 53.88. The battle event does not carry a garrison. The visible upkeep says the loss was not upkeep (`garrisonLoss` 0) and the number it carries is 15, not the 14 the dock showed one tick earlier.

### What a player can tell

A player at the dock can tell that the port changed hands, and the briefing tells them who won. They cannot tell why.

The log lines are only `"Pax Ash: battle resolved"`, `"Pax Ash: settlement claimed"`, `"Niko Wren: battle resolved"`, `"Iris Stone: battle resolved"`, and `"Iris Stone: settlement claimed"`. The phase lines beside them are the same kind of empty sentence: `"Pax Ash: battle phase resolved"`, `"Niko Wren: battle phase resolved"`, `"Iris Stone: battle phase resolved"`. No score, no morale, no outcome field, no garrison written by the fight. `battleInProgress` was false on every read, and `observedBattles` was empty, so the combat block never showed the fight.

The briefing does say who won, in those exact words: `"Pax Ash won at Crown Harbor"`, then later `"Niko Wren won at Crown Harbor"` and `"Iris Stone won at Crown Harbor"`. Both of those day-99.33 lines are on the state-tick-597 briefing while the panel still says `factionId` `"free-tide"`, `ownerId` `"character-14"`, `garrison` 7, `surrender` null, `surrenderOffered` false. Two wins, one port, and the holder has not changed. Nothing on the page says how the garrison went from 12 to 7, or which of the two wins did it.

The surrender flag and the surrender sentences disagree with each other. At state tick 595 the block names Pax and `surrenderOffered` is false, which the plan said to record and not to treat as a failed run. The next tick the briefing says `"Pax Ash accepted Crown Harbor's surrender and established a claim"` while that flag had been false and the port was still World Government. At state tick 597, with Free Tide holding the port, `surrender` is null. At state tick 598 the briefing says `"Iris Stone accepted Crown Harbor's surrender and established a claim"`. The player never saw a surrender block aimed at Iris. Sequence 77916, event tick 597, summary `"World: settlement upkeep"`, `payloadWithheld` false, still has `data.garrison` 7, `data.stability` 47.06, `data.garrisonLoss` 0. The panel after the claim is garrison 7 and stability 55. The claim line does not say why stability moved.

`decision-made` rows next to the fights, including `"Pax Ash: decision made"` and `"Iris Stone: decision made"`, are withheld. There is no `character-captured` row for Pax.

### Verdict

`PROMOTE`.

State tick 595 was exact World Government, owner `character-03`, garrison 12, stability 53.88, surrender offered to `character-14` at tick 594, `surrenderOffered` false, and sequence 77530 was Pax Ash's `battle-resolved` at Crown Harbor on event tick 594. State tick 596 was `free-tide`, owner `character-14`, garrison 12, with sequence 77678. State tick 597 was garrison 7 with sequences 77776 and 77799. State tick 598 was `world-government`, owner `character-06`, garrison 7, stability 55, with sequence 77938. `party.locationId` was `crown-harbor` on every one of those reads. The battle and claim payloads stayed withheld.

`REVISE` does not apply: garrison at state tick 595 was 12, the surrender block was present, stability on that read was 53.88, state tick 596 was Free Tide owned by `character-14`, and state tick 598 was World Government owned by `character-06` with garrison 7. `ABANDON` does not apply: sequence 77530 was on the state-tick-595 page whose oldest sequence is 77407, and each later sequence was on the page the step named. The `beforeSequence` fallbacks were not required.
