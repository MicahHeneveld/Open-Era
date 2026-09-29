# Playtest plan: sea sightings

This is the plan for a blind operator. It is not a completed session. Do not run it as part of writing the change. Do not open `src/`, `tests/`, the branch diff, or `docs/design/` during the session. Use only the dashboard HTTP JSON.

One session. One process. Seed 1847. Mara Vane sails Crown Harbor to Glassport and stops at Glassport. One command, then no others. The sighting is not an event. It is on the character read.

## Setup

- Node `v24.21.0` (`nvm use 24.21.0` if `node -v` is not that). `npm ci` first if `node_modules` is missing.
- Branch `feature/sea-sightings`. The sighting code is `493136e`. Record `git rev-parse HEAD` before the first request. A docs-only commit on top of `493136e` is the same build.
- One process. `npm run dashboard -- --reset --seed 1847` on `http://127.0.0.1:4317`. Do not start a second seed.
- `GET /api/health` should be HTTP 200 `{"ok":true,"tick":0,"events":0}`.
- The player is already Mara Vane, `character-01`, `playerId` `prototype-player`. Do not pass another character.
- Read state with `GET /api/state?limit=200`. Omit `beforeSequence` on the first read of a checkpoint. The `events` array is newest-first. Find a checkpoint by its `sequence`. If that sequence is below `eventPage.oldestSequence`, the fallback is `GET /api/state?limit=200&beforeSequence=<the page cursor>`. At state tick 2 the cursor is 75. That fallback was checked: HTTP 200, `oldestSequence` 1, `newestSequence` 74, `hasMore` false, and sequence 11 is on that page.
- `briefing.items` carries the outcome sentence, in `summary`. Quote that sentence. A withheld feed row is not where a sea troop count lives. Sequence 87 is Ada Sorn's `travel-started`, summary `Ada Sorn: travel started`, payload withheld. Her 35 troops are on the sea row, not on that event.
- Advance with `POST /api/advance`. Body `{"ticks":N}`. `N` is an integer from 1 to 144. This plan uses 2, then 1, then 1.
- `tick` on an event is the tick the world was on while that event was written. `tick` on the state is one ahead of the events just applied. Advance `day` is unrounded. State `day` is rounded to two places. `0.3333333333333333` on the first advance and `0.33` on the state read are the same tick.

The sighting checkpoint is state tick 2. The passing checkpoint is state tick 3. The dock checkpoint is state tick 4.

## Hypothesis and ambition

**Hypothesis.** Sailing Crown Harbor to Glassport, the tick-2 read names Ada Sorn on the same leg with her troop count, that count is not her live `troops`, and the sea list is gone once Mara has docked.

**Ambition.** At tick 0, `POST /api/commands` with `playerId` `prototype-player`, `type` `character-action`, `action` `travel`, `targetId` `glassport`. `POST /api/advance` with `ticks` 2. `GET /api/state`. Read Mara and Ada Sorn (`character-13`). Advance one tick and read the sea list again, including Sable Sorn (`character-24`). Advance one tick and read Mara at Glassport.

**What you can see.** On Mara's own character, `seaSightings`, or null when she is in port. On anyone else, `seaSighting` for that one ship, and `seaSightings` null. Sailors, troop count, and party power on the row. Not the hold, the purse, or a live `troops` while the subject is at sea. Not a row for a ship on the same route whose stretch of water does not meet hers.

## Characters

| Name | Id | What to watch |
| --- | --- | --- |
| Mara Vane | `character-01` | The player. Her `seaSightings` is the list. |
| Ada Sorn | `character-13` | Same leg, shorter voyage. The overtaking. |
| Zara Gale | `character-17` | Same leg, still on the departure snapshot at tick 2. Not a row. |
| Sable Sorn | `character-24` | Opposite leg. The passing at tick 3. |
| Toma Reef | `character-07` | Different origin, same destination, last sea tick. Arriving at tick 3. |
| Vale Gale | `character-28` | Opposite leg. A second passing at tick 3. |
| Kessa Dusk | `character-30` | Different origin, same destination. Arriving at tick 3. |
| Orin Frost | `character-29` | Same leg at tick 3, still unstepped. Not a row. |

## State tick 0

`GET /api/health`. HTTP 200.

```json
{"ok":true,"tick":0,"events":0}
```

`GET /api/state?limit=200`. HTTP 200.

- `tick` 0. `day` 0. `commanderId` `character-01`.
- `player.displayName` `Prototype Commander`. `player.characterId` `character-01`.
- Mara's `locationId` is `crown-harbor`. Her `travel` is null. Her `seaSightings` is null.
- `eventPage` count 0, limit 200, total 0, `hasMore` false, `oldestSequence` null, `newestSequence` null.

`player.displayName` staying `Prototype Commander` is already an open readability item. It is not a failure of this session.

## The only command

`POST /api/commands`

```json
{"playerId":"prototype-player","type":"character-action","action":"travel","targetId":"glassport"}
```

HTTP 202. `command.id` `command-00001`. `action` `travel`. `targetId` `glassport`. `issuedTick` 0.

## State tick 2

`POST /api/advance` with `{"ticks":2}`. HTTP 200.

- `tick` 2. `day` `0.3333333333333333`. `ticksAdvanced` 2.
- `combatUpdated` false. `attentionUpdated` false. `pausedForBattle` false.
- `eventSequence` 274.

`GET /api/state?limit=200`. HTTP 200.

- `tick` 2. `day` 0.33.
- `eventPage`: count 200, limit 200, total 274, `hasMore` true, `oldestSequence` 75, `newestSequence` 274, `cursor` 75.
- Sequence 199 is on this page. `tick` 1, `travel-progressed`, actor `character-01`, summary `Mara Vane: travel progressed`. The payload is not withheld.
- Sequence 87 is on this page. `tick` 0, `travel-started`, actor `character-13`, summary `Ada Sorn: travel started`. The payload is withheld. It does not carry troops 35.
- Sequence 11 is not on this page. Fallback: `GET /api/state?limit=200&beforeSequence=75`. HTTP 200. `oldestSequence` 1, `newestSequence` 74, `hasMore` false. Sequence 11 is `travel-started`, `tick` 0, summary `Mara Vane departed for Glassport`. Sequence 1 on that same page is `player-command-accepted`, summary `Command queued for Mara Vane`. Sequence 14 is `travel-progressed` for Mara, `tick` 0.

Mara: `locationId` null. `travel` is `crown-harbor` → `glassport`, `remainingTicks` 2, `totalTicks` 4. `seaSightings` has one key, `character-13`.

Ada's row on that list, and the same object on Ada's `seaSighting`:

| Field | Reading |
| --- | --- |
| `kind` | `overtaking` |
| `arriving` | false |
| `fromId` | `crown-harbor` |
| `toId` | `glassport` |
| `sailors` | 18 |
| `troops` | 35 |
| `partyPower` | 81.529 |
| `confidence` | 1 |
| `source` | `direct` |
| `observedTick` | 2 |
| `ageTicks` | 0 |
| `factionId` | `world-government` |

Ada's card: `travel` is the same leg, remaining 2 of 3. `locationId` null. `troops` null. `partyPower` null. `cargo` null. `money` null. `sailors` null. `seaSightings` null. The list is only on Mara.

Zara Gale (`character-17`) is on `crown-harbor` → `glassport`, remaining 4 of 4. She is not in `seaSightings`. Her `seaSighting` is null. Her `troops` and `partyPower` are null. Same route, no meeting.

No other character has a non-null `seaSightings`.

`briefing.attentionCount` is 6 and `briefing.items` has 7 lines. That mismatch is already an open readability item. It is not a failure of this session. The first item is `confirm:character-01:order:character-07`, summary `Toma Reef reports the supply transaction at Cinder Key complete and requests confirmation.` The next is `event:67`, summary `Kessa Calder refused the protect order after weighing loyalty, risk, and ambition.` That sentence is the outcome text. The feed row for sequence 67, on the `beforeSequence=75` page, is the same sentence, because that payload is not withheld.

## State tick 3

`POST /api/advance` with `{"ticks":1}`. HTTP 200. `tick` 3. `day` 0.5. `ticksAdvanced` 1.

`GET /api/state?limit=200`. HTTP 200. `tick` 3. `day` 0.5. `eventPage` count 200, total 366, `hasMore` true, `oldestSequence` 167, `newestSequence` 366. Sequence 284 is on this page: `tick` 2, `travel-progressed`, summary `Mara Vane: travel progressed`.

Mara: still `crown-harbor` → `glassport`, remaining 1 of 4. `locationId` null. `seaSightings` has five keys.

| Id | Name | Kind | `arriving` | Leg | Remaining | Sailors | Troops | Party power | Faction |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `character-07` | Toma Reef | `arriving` | true | `cinder-key` → `glassport` | 1 | 17 | 42 | 94.151 | `world-government` |
| `character-13` | Ada Sorn | `overtaking` | true | `crown-harbor` → `glassport` | 1 of 3 | 18 | 35 | 81.529 | `world-government` |
| `character-24` | Sable Sorn | `passing` | false | `glassport` → `crown-harbor` | 2 of 4 | 14 | 36 | 100.168 | null |
| `character-28` | Vale Gale | `passing` | false | `glassport` → `crown-harbor` | 1 of 3 | 14 | 46 | 95.505 | null |
| `character-30` | Kessa Dusk | `arriving` | true | `verdant-cay` → `glassport` | 1 | 13 | 48 | 99.012 | null |

Correction after the blind session: Vale Gale was on a 3-tick voyage, so her card reads 1 of 3; the sea row was unaffected.

Every one of those rows has `observedTick` 3, `ageTicks` 0, `confidence` 1, `source` `direct`. Sable's card has `troops` null, `partyPower` null, `cargo` null, `money` null, and `seaSightings` null.

Zara Gale is still on `crown-harbor` → `glassport`, remaining 3 of 4, and is not in the list. Orin Frost (`character-29`) is on that same leg, remaining 3 of 3, and is not in the list. Ada's `observedTick` moved from 2 to 3 because this is a new snapshot, not because a stored row aged. Both of her rows, while the meeting holds, have `ageTicks` 0.

## State tick 4

`POST /api/advance` with `{"ticks":1}`. HTTP 200. `tick` 4. `ticksAdvanced` 1.

`GET /api/state?limit=200`. HTTP 200. `tick` 4. `day` 0.67. `eventPage` count 200, total 481, `hasMore` true, `oldestSequence` 282, `newestSequence` 481. Sequence 377 is on this page: `tick` 3, `arrived`, summary `Mara Vane arrived at Glassport`, payload not withheld. Sequence 376, same page, is `Mara Vane: travel progressed`.

Mara: `locationId` `glassport`. `travel` null. `seaSightings` null.

Ada: `locationId` `glassport`. `travel` null. `seaSighting` null. `seaSightings` null. `troops.count` 35. `partyPower` 81.529. Both have docked, so the live count is back and the sea row is gone.

Zara Gale is still at sea (`crown-harbor` → `glassport`, remaining 2 of 4). She does not appear on a sea list, because Mara is in port and the list is null.

Stop. No further command.

## Outcome

Not played. The readings above are what the dashboard returned when this plan was checked over HTTP. A blind operator still has to run the session and compare.

## Evidence review

Fill this in after the session, from the HTTP JSON only. Do not open the database during the session.

- **World report:** leave unread until the session has stopped.
- **The sighting:** there is no sighting event. The row is on Mara's `seaSightings` and on the subject's `seaSighting`.
- **Checkpoint events:** 199 and 87 at tick 2 on the limit=200 page; 11 and 1 on `beforeSequence=75`; 284 at tick 3; 377 and 376 at tick 4.
- **Outcome text:** `briefing.items[].summary`. Sequence 67's sentence is quoted above.

## Findings

Leave the played findings blank until the session. These are the boundaries the session is there to see:

- Ada's 35 is on the sea row at tick 2, and her live `troops`, `partyPower`, `cargo`, and `money` are null.
- Zara is on the same leg at tick 2 and is not a row.
- At tick 3 Sable's passing is the row in the table, and Ada's kind stays `overtaking` with `arriving` true.
- At tick 4 Mara's list is null. Ada's live troops are 35 because both are in Glassport.
- Ada's own `seaSightings` stays null at every read. The list is Mara's.

## Recommendation

Do not mark this file `PROMOTE` until a blind operator has run it.

`PROMOTE` if tick 2 shows Ada's 35 on the sea row, her live troops stay null, and tick 4 has no sea list. The same bar includes the boundaries above: Zara absent at tick 2, Sable's passing at tick 3 with sailors 14, troops 36, and party power 100.168, and Ada's live `troops.count` 35 at tick 4 with `seaSighting` null.

`REVISE` if the sea row's `observedTick` stays put while the spans still overlap and the world tick moves, or if Ada's cargo or a live troop count appears on her character while she is at sea. Also `REVISE` if tick 3's five rows are not the table above.

`ABANDON` if tick 2 does not show Ada on `crown-harbor` → `glassport` with 2 of 3 left. That course is already on `travel` in the current JSON, so a miss means this seed no longer makes the crossing.

## Session

Blind session, one process, seed 1847. Node `v24.21.0` after `nvm use 24.21.0` (`npm ci` because `node_modules` was missing). `git rev-parse HEAD` before the first request: `8d0df52e86e94aac483cd2c41e6d353b883c7f43`. Dashboard: `npm run dashboard -- --reset --seed 1847` on `http://127.0.0.1:4317`. Player `prototype-player`, Mara Vane, `character-01`. One command, then only advances and state reads. Stopped after state tick 4.

### State tick 0

`GET /api/health` — HTTP 200.

```json
{"ok":true,"tick":0,"events":0}
```

`GET /api/state?limit=200` — HTTP 200.

- `tick` 0. `day` 0. `commanderId` `character-01`.
- `player.displayName` `Prototype Commander`. `player.characterId` `character-01`.
- Mara: `locationId` `crown-harbor`. `travel` null. `seaSightings` null.
- `eventPage`: count 0, limit 200, total 0, `hasMore` false, `oldestSequence` null, `newestSequence` null, `cursor` null.
- `briefing.attentionCount` 0. `briefing.items` empty.

### The only command

`POST /api/commands` — HTTP 202.

```json
{"playerId":"prototype-player","type":"character-action","action":"travel","targetId":"glassport"}
```

Response: `command.id` `command-00001`, `action` `travel`, `targetId` `glassport`, `issuedTick` 0.

### State tick 2

`POST /api/advance` `{"ticks":2}` — HTTP 200.

- `tick` 2. `day` `0.3333333333333333`. `ticksAdvanced` 2.
- `combatUpdated` false. `attentionUpdated` false. `pausedForBattle` false.
- `eventSequence` 274.

`GET /api/state?limit=200` — HTTP 200.

- `tick` 2. `day` 0.33.
- `eventPage`: count 200, limit 200, total 274, `hasMore` true, `oldestSequence` 75, `newestSequence` 274, `cursor` 75.
- Sequence 199, on this page: `tick` 1, `travel-progressed`, actor `character-01`, summary `Mara Vane: travel progressed`. `payloadWithheld` false. Data includes `remainingTicks` 2 and `troopCount` 80 (Mara's).
- Sequence 87, on this page: `tick` 0, `travel-started`, actor `character-13`, summary `Ada Sorn: travel started`. `payloadWithheld` true. `data` null. No troops 35.
- Sequence 11 is not on this page. Fallback `GET /api/state?limit=200&beforeSequence=75` — HTTP 200. `eventPage` count 74, `oldestSequence` 1, `newestSequence` 74, `hasMore` false, `cursor` 1.
  - Sequence 11: `travel-started`, `tick` 0, summary `Mara Vane departed for Glassport`. `payloadWithheld` false. Travel `crown-harbor` → `glassport`, `remainingTicks` 4, `totalTicks` 4.
  - Sequence 1: `player-command-accepted`, `tick` 0, summary `Command queued for Mara Vane`.
  - Sequence 14: `travel-progressed`, actor `character-01`, `tick` 0, summary `Mara Vane: travel progressed`. `payloadWithheld` false. `remainingTicks` 3.
  - Sequence 67: `standing-order-refused`, summary `Kessa Calder refused the protect order after weighing loyalty, risk, and ambition.` `payloadWithheld` false. Same sentence as the briefing item.

Mara: `locationId` null. `travel` `crown-harbor` → `glassport`, `remainingTicks` 2, `totalTicks` 4. `seaSightings` has one key, `character-13`.

Ada's row on that list, identical to Ada's `seaSighting`:

| Field | Observed |
| --- | --- |
| `kind` | `overtaking` |
| `arriving` | false |
| `fromId` | `crown-harbor` |
| `toId` | `glassport` |
| `sailors` | 18 |
| `troops` | 35 |
| `partyPower` | 81.529 |
| `confidence` | 1 |
| `source` | `direct` |
| `observedTick` | 2 |
| `ageTicks` | 0 |
| `factionId` | `world-government` |

Ada's card: same leg, remaining 2 of 3. `locationId` null. `troops` null. `partyPower` null. `cargo` null. `money` null. `sailors` null. `seaSightings` null.

Zara Gale (`character-17`): `crown-harbor` → `glassport`, remaining 4 of 4. Not in `seaSightings`. `seaSighting` null. `troops` null. `partyPower` null. `cargo` null. `money` null. `sailors` null.

No other character has a non-null `seaSightings`.

`briefing.attentionCount` 6. `briefing.items` 7:

1. `confirm:character-01:order:character-07` — `Toma Reef reports the supply transaction at Cinder Key complete and requests confirmation.`
2. `event:67` — `Kessa Calder refused the protect order after weighing loyalty, risk, and ambition.`
3. `event:61` — `Orin Rill refused the protect order after weighing loyalty, risk, and ambition.`
4. `event:55` — `Vale Drake refused the explore order after weighing loyalty, risk, and ambition.`
5. `event:37` — `Jun Marrow diverted to travel while retaining protect orders for Crown Harbor.`
6. `event:29` — `Sable Morrow refused the protect order after weighing loyalty, risk, and ambition.`
7. `routine:character-05:85` — `8 routine order updates: 8 accepted. No command decision is required.`

None of those sentences mentions a ship at sea.

### State tick 3

`POST /api/advance` `{"ticks":1}` — HTTP 200.

- `tick` 3. `day` 0.5. `ticksAdvanced` 1.
- `combatUpdated` false. `attentionUpdated` false. `pausedForBattle` false.
- `eventSequence` 366.

`GET /api/state?limit=200` — HTTP 200.

- `tick` 3. `day` 0.5.
- `eventPage`: count 200, limit 200, total 366, `hasMore` true, `oldestSequence` 167, `newestSequence` 366, `cursor` 167.
- Sequence 284, on this page: `tick` 2, `travel-progressed`, summary `Mara Vane: travel progressed`. `payloadWithheld` false.

Mara: `crown-harbor` → `glassport`, remaining 1 of 4. `locationId` null. `seaSightings` has five keys. Each subject's `seaSighting` equals the row. Each subject's `seaSightings` is null. Each row has `observedTick` 3, `ageTicks` 0, `confidence` 1, `source` `direct`.

| Id | Name | Kind | `arriving` | Leg | Travel remaining | Sailors | Troops | Party power | Faction |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `character-07` | Toma Reef | `arriving` | true | `cinder-key` → `glassport` | 1 of 2 | 17 | 42 | 94.151 | `world-government` |
| `character-13` | Ada Sorn | `overtaking` | true | `crown-harbor` → `glassport` | 1 of 3 | 18 | 35 | 81.529 | `world-government` |
| `character-24` | Sable Sorn | `passing` | false | `glassport` → `crown-harbor` | 2 of 4 | 14 | 36 | 100.168 | null |
| `character-28` | Vale Gale | `passing` | false | `glassport` → `crown-harbor` | 1 of 3 | 14 | 46 | 95.505 | null |
| `character-30` | Kessa Dusk | `arriving` | true | `verdant-cay` → `glassport` | 1 of 3 | 13 | 48 | 99.012 | null |

Sable's card: `troops` null, `partyPower` null, `cargo` null, `money` null, `sailors` null, `seaSightings` null. Same hiding on Toma, Ada, Vale, and Kessa.

Zara Gale: still `crown-harbor` → `glassport`, remaining 3 of 4. Not in the list. `seaSighting` null. `troops` null. `partyPower` null.

Orin Frost (`character-29`): `crown-harbor` → `glassport`, remaining 3 of 3. Not in the list. `seaSighting` null. `troops` null. `partyPower` null. `cargo` null. `money` null.

Only Mara has a non-null `seaSightings`.

`briefing.attentionCount` 6. The same 7 sentences as tick 2. No sea sentence.

### State tick 4

`POST /api/advance` `{"ticks":1}` — HTTP 200.

- `tick` 4. `day` `0.6666666666666666`. `ticksAdvanced` 1.
- `combatUpdated` false. `attentionUpdated` false. `pausedForBattle` false.
- `eventSequence` 481.

`GET /api/state?limit=200` — HTTP 200.

- `tick` 4. `day` 0.67.
- `eventPage`: count 200, limit 200, total 481, `hasMore` true, `oldestSequence` 282, `newestSequence` 481, `cursor` 282.
- Sequence 377, on this page: `tick` 3, `arrived`, summary `Mara Vane arrived at Glassport`. `payloadWithheld` false. Data `locationId` `glassport`, `fromId` `crown-harbor`.
- Sequence 376, same page: `tick` 3, `travel-progressed`, summary `Mara Vane: travel progressed`. `payloadWithheld` false. `remainingTicks` 0.

Mara: `locationId` `glassport`. `travel` null. `seaSightings` null. `seaSighting` null.

Ada: `locationId` `glassport`. `travel` null. `seaSighting` null. `seaSightings` null. `troops.count` 35. `partyPower` 81.529. `cargo` provisions 36.384, arms 2, medicine 1, ship materials 6. `money` 141. `sailors` 18.

Zara Gale: still at sea, `crown-harbor` → `glassport`, remaining 2 of 4. `seaSighting` null. `troops` null. Not on a list, because no character has a non-null `seaSightings` or `seaSighting`.

`briefing.attentionCount` 7. `briefing.items` 8. The tick-2 seven, plus a new first-adjacent line: `confirm:character-01:order:character-12` — `Lio Crow reports the supply transaction at Cinder Key complete and requests confirmation.` Still no sea sentence and no arrival sentence.

Stopped. No further command.

## Findings

### Matches

- Tick 0 health, empty feed, Mara in Crown Harbor with `seaSightings` null, and `Prototype Commander` on `player.displayName`.
- The only command: HTTP 202, `command-00001`, travel to `glassport`, `issuedTick` 0.
- Tick 2 advance: tick 2, day `0.3333333333333333`, `ticksAdvanced` 2, the three flags false, `eventSequence` 274. State day 0.33.
- Sequences 199 and 87 on the limit=200 page, with 87 withheld and carrying no troop count. Sequences 11, 1, and 14 on `beforeSequence=75`, with the summaries the plan names. Sequence 67's sentence matches `briefing.items`.
- A real sighting while Mara is at sea: one row, Ada Sorn, `overtaking`, `crown-harbor` → `glassport`, sailors 18, troops 35, party power 81.529, `observedTick` 2, `ageTicks` 0. The same object is on Ada's `seaSighting`. Ada's live `troops`, `partyPower`, `cargo`, `money`, and `sailors` are null. Her own `seaSightings` is null.
- Zara Gale is on that same leg at tick 2 (remaining 4 of 4) and is not a row. Her live troops and party power are null.
- Tick 3: Mara still on the leg, remaining 1 of 4. Five rows. Ada stays `overtaking` with `arriving` true, troops 35, and `observedTick` moved from 2 to 3 with `ageTicks` 0. Sable Sorn is `passing`, sailors 14, troops 36, party power 100.168, faction null, and her live troops, party power, cargo, and money are null. Toma, Vale's sighting fields, and Kessa match the table's kind, leg, sailors, troops, party power, and faction. Zara (remaining 3 of 4) and Orin (remaining 3 of 3) are on the same leg and are not rows.
- Tick 4: Mara at Glassport, `travel` null, `seaSightings` null. Ada docked beside her, `seaSighting` null, `troops.count` 35, `partyPower` 81.529. Zara is still at sea and appears on no list. Sequences 377 and 376 are the arrival and the last progress line.
- `attentionCount` 6 against 7 briefing lines at tick 2 is the open readability item the plan already set aside.

### Mismatches

- Vale Gale's travel card at tick 3 is remaining 1 of 3 (`totalTicks` 3, `remainingTicks` 1). The plan's table says 2 of 4. Her sea row otherwise matches: `passing`, `arriving` false, `glassport` → `crown-harbor`, sailors 14, troops 46, party power 95.505, faction null, `observedTick` 3, `ageTicks` 0. At tick 2 her card was already remaining 2 of 3, so the voyage was never 4 ticks long. The sea row has no remaining field. This cell does not move the verdict: the promote bar does not cite it, and the revise triggers (a stuck `observedTick`, a live troop or cargo leak at sea, or a different set of five sighting rows) did not occur.

### Player-facing notes

- The meeting is invisible in the feed and the briefing. Nothing says Mara met Ada, or that Ada has 35 troops. Ada's feed line is only `Ada Sorn: travel started`, and the payload is withheld, so it does not name Glassport either. Mara's own line does: `Mara Vane departed for Glassport`. The 35 lives only on the character read.
- `overtaking` beside `arriving: true` has no sentence. At tick 2 `arriving` was false; at tick 3 it became true and the kind did not change. A player is not told that Ada will dock on this tick, or what overtaking means next to passing.
- Zara and Orin share Mara's leg and are simply missing. That is the rule under test, and it held. Nothing tells the player they are on the route but not in the same stretch of water.
- Once both have docked, Ada's hold and purse appear in full (provisions 36.384, arms 2, medicine 1, ship materials 6, money 141) with no line saying they were learned. The sea row never showed them. The one checkable number is troops: the docked `troops.count` is the same 35 the sea row showed.
- `player.displayName` stays `Prototype Commander`. `attentionCount` stays one below the line count (6 vs 7 at ticks 2 and 3, 7 vs 8 at tick 4). Neither is a failure of this session. The new tick-4 line is another supply confirmation, not the arrival.
- Mara's money reads 102 at tick 2, 99 at tick 3, and 96 at tick 4. Each `travel-progressed` payload shows cargo, health, morale, and troop count, and does not show the money. The feed does not say why the purse fell.

## Verdict

PROMOTE.

Tick 2 names Ada on `crown-harbor` → `glassport` with 2 of 3 left, troops 35 on the sea row, and her live troops, cargo, and money null. Zara is on the same leg and is not listed. Tick 3's five sighting rows are the table, including Sable's passing at sailors 14, troops 36, and party power 100.168, and Ada's `observedTick` moved to 3 with `ageTicks` 0. Tick 4 has no sea list, and Ada's live `troops.count` is 35 with `seaSighting` null. The Vale remaining cell is recorded above and is not one of those bars.
