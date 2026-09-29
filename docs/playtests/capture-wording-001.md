# Playtest plan: capture wording

This is the plan for a blind operator. It is not a completed session. Do not run it as part of writing the change. Do not open `src/`, `tests/`, the branch diff, or `docs/design/` during the session. Use only the dashboard HTTP JSON.

Three short sessions, each its own process. The sentences are derived when the state is read. No command in session 3. Sessions 1 and 2 each send the commands named below and then stop.

## Setup

- Node `v24.21.0` (`nvm use 24.21.0` if `node -v` is not that). `npm ci` first if `node_modules` is missing.
- Branch `feature/capture-wording`. Record `git rev-parse HEAD` before the first request.
- One process per session. `npm run dashboard -- --reset --seed N` on `http://127.0.0.1:4317`. Stop that process before the next seed. Do not start a second dashboard.
- `GET /api/health` should be HTTP 200 `{"ok":true,"tick":0,"events":0}`.
- The player is already Mara Vane, `character-01`, `playerId` `prototype-player`. Do not pass another character.
- Read state with `GET /api/state?limit=200`. Omit `beforeSequence` on the first read of a checkpoint. The `events` array is newest-first. Find a checkpoint by its `sequence`. If that sequence is below `eventPage.oldestSequence`, the fallback is `GET /api/state?limit=200&beforeSequence=<the page cursor>`.
- `briefing.items` carries the outcome sentence, in `summary`. Quote that sentence. `briefing.attentionCount` is the decision count. `briefing.shownCount` is the number of lines drawn. `briefing.attentionLabel` is the check-in title.
- Advance with `POST /api/advance`. Body `{"ticks":N}`. `N` is an integer from 1 to 144.
- `tick` on an event is the tick the world was on while that event was written. `tick` on the state is one ahead of the events just applied. Advance `day` is unrounded. State `day` is rounded to two places.

## Hypothesis and ambition

**Hypothesis.** The player's name reads Mara Vane. A capture names the faction that took the prisoner and does not say "outscore". A ship on the same leg but outside her stretch is named, with no troop count. When a port record and a sea row share a card, the sea count is called by the row's kind and the port record stays "Sighted troops". The same capture and release sentences are the ones beside a captor row and a release.

**Ambition.** Session 1 sails Crown Harbor to Glassport and reads the sea sentences. Session 2 surveys Cinder Key and meets Sable on the way to Glassport. Session 3 lets seed 4096 run to the Glassport dock capture and reads Rook's sentence.

## Session 1 — Glassport voyage, seed 1847

One command, then no others.

`POST /api/commands`

```json
{"playerId":"prototype-player","type":"character-action","action":"travel","targetId":"glassport"}
```

HTTP 202. `command.id` `command-00001`.

### Tick 0, before the command

`player.displayName` is `Mara Vane`. `player.characterId` is `character-01`. `party.name` is `Mara Vane`.

### State tick 2

`POST /api/advance` `{"ticks":2}`. HTTP 200. `tick` 2. `day` `0.3333333333333333`.

`GET /api/state?limit=200`. `tick` 2. `day` 0.33. `player.displayName` `Mara Vane`.

- Mara's money is 102. Her `seaSightings` has one key, `character-13`.
- Ada Sorn's `seaSighting.summary`: `Ada Sorn is overtaking, Crown Harbor to Glassport. 35 troops, 0 ticks old.` `kind` `overtaking`. `arriving` false. Her live `troops` is null.
- Mara's `outOfStretch` includes `Zara Gale is on Crown Harbor to Glassport, 4 of 4 ticks left, and is not in the same stretch of water.` That entry has no `troops` field. Zara's `seaSighting` is null.
- Briefing has one item titled `Sea sighting` with Ada's sentence. `attentionCount` 6. `shownCount` 8. `omittedInfoCount` 0. `attentionLabel` `Check-in · 6 need attention, and 2 background lines are listed with them.`
- Sequence 198, on this page: `character-upkeep`, `payloadWithheld` false, summary `Mara Vane paid 3 passage. 102 left.` `data.passageCost` 3. `data.characterMoney` 102.

### State tick 3

`POST /api/advance` `{"ticks":1}`. State `tick` 3. `day` 0.5.

- Ada's summary: `Ada Sorn is overtaking, Crown Harbor to Glassport. Docks at Glassport on this tick. 35 troops, 0 ticks old.` `arriving` true. `kind` still `overtaking`.
- The briefing's `Sea sighting` lines, in order: Toma Reef arriving, Ada overtaking and docking, Sable Sorn passing, Vale Gale passing. Kessa Dusk's sentence is on her `seaSighting` and is not on the briefing list.
- Sable's sentence: `Sable Sorn is passing, Glassport to Crown Harbor. 36 troops, 0 ticks old.`
- `outOfStretch`: `Zara Gale is on Crown Harbor to Glassport, 3 of 4 ticks left, and is not in the same stretch of water.` and `Orin Frost is on Crown Harbor to Glassport, 3 of 3 ticks left, and is not in the same stretch of water.`
- `attentionCount` 6. `shownCount` 10. `omittedInfoCount` 2. `attentionLabel` `Check-in · 6 need attention, and 4 background lines are listed with them.`
- Sequence 283: `Mara Vane paid 3 passage. 99 left.`

### State tick 4

`POST /api/advance` `{"ticks":1}`. State `tick` 4. `day` 0.67.

- Mara's `locationId` is `glassport`. Her `travel` is null. Her `seaSightings` is null. Her `outOfStretch` is null.
- Ada's `seaSighting` is null. Her `troops.count` is 35. Her `money` is 141. Her `cargo` is provisions 36.384, arms 2, medicine 1, ship materials 6. Her `conditionNote`: `Learned at Glassport. The hold and the purse are on this card because both ships are in port.`
- Sequence 375: `Mara Vane paid 3 passage. 96 left.` Mara's money is 96.

Stop. No further command.

## Session 2 — the two troop labels, seed 1847

A new process. `npm run dashboard -- --reset --seed 1847`.

1. `POST /api/commands` travel to `cinder-key`. `POST /api/advance` `{"ticks":5}`. State tick 5. Mara's `locationId` is `cinder-key`.
2. `POST /api/commands` `action` `survey`, `targetId` `cinder-key`. `POST /api/advance` `{"ticks":1}`. State tick 6.
3. `POST /api/commands` travel to `glassport`. `POST /api/advance` `{"ticks":1}`. State tick 7.

Sable Morrow (`character-04`) at state tick 7:

- `partySighting.troops` 21, `ageTicks` 2, `locationId` `cinder-key`.
- `seaSighting.kind` `sharing`, `arriving` true, `troops` 19, `ageTicks` 0, `cinder-key` to `glassport`.
- Her live `troops` is null.

The inspector draws `Sighted troops` for the 21 and `sharing` for the 19. Those two strings are the labels on the card. The port record does not change its label.

Stop.

## Session 3 — the dock sentence, seed 4096

A new process. `npm run dashboard -- --reset --seed 4096`. Send no commands.

`POST /api/advance` `{"ticks":144}` three times, then `{"ticks":44}`. State tick 476. `day` on the state read is 79.33.

`GET /api/state?limit=200`.

- Sequence 59637, event tick 475, `character-captured`, `actorId` `character-11`, `targetId` `free-tide`, `settlementId` `glassport`. `payloadWithheld` true. `data` null. Summary: `Free Tide Compact took Rook Tern on the dock at Glassport after Pax Ash won there on a higher score`. The word `outscore` is not in that sentence.
- Briefing item `event:59637` uses that same sentence.
- Sequence 59635, `battle-resolved`. `payloadWithheld` true. `data` null. Summary: `Pax Ash won at Glassport on a higher score`.
- Rook Tern's card: `captivity.cause` `outscore-loss`. `captivity.causeLabel` `taken on the dock after the other side won on a higher score`.
- Glassport's `factionId` is still `world-government`.

`player.displayName` is `Mara Vane`.

Stop.

## Captor row and release record

These are the M33 cases. No commands. A new process per seed. This API is Mara's projection. A prison record lives on the released captain and is null on Mara's reading of that captain.

### Seed 2718, Mina Vale held

`npm run dashboard -- --reset --seed 2718`.

`POST /api/advance` `{"ticks":72}`. State tick 72.

Mina Vale (`character-15`):

- `captiveIntel.troops` 12. `partyPower` 60.244. `leadership` 25. `ports` is `[]`. `observedTick` 71. `ageTicks` 1.
- `captivity.cause` `failed-retreat`. `captivity.causeLabel` is null. Live `troops.count` is 0.
- `skillsNote` is null. Leadership is on the captor row, so the card does not say it is withheld.

Sequence 8402, event tick 71, `character-captured`. `actorId` `character-15`. `targetId` `world-government`. `settlementId` `crown-harbor`. `payloadWithheld` true. `data` null. Summary:

`World Government took Mina Vale at Crown Harbor after failed retreat`

The briefing item `event:8402` uses that sentence. It does not say she was captured, and it does not say `outscore`.

### Seed 2718, Mina Vale released

Continue that process. `POST /api/advance` `{"ticks":84}`. State tick 156. The release was written at event tick 155.

- `captiveIntel` is null.
- `releaseSighting` is null on Mara's reading of Mina.
- Her travel is `crown-harbor` to `glassport`, 2 of 3 ticks left.

Sequence 18482, event tick 155, `captivity-released`. `payloadWithheld` true. `data` null. Summary:

`Mina Vale was released from Crown Harbor: 58.13 paid and 0 recorded as debt`

The sentence does not say `Loyalty fell`. The debt is 0. The briefing item `event:18482` uses that sentence.

Stop.

### Seed 1847, Sable Morrow released

A new process. `npm run dashboard -- --reset --seed 1847`. No commands.

`POST /api/advance` `{"ticks":119}`. State tick 119. The release was written at event tick 118.

Sequence 13680, event tick 118, `captivity-released`. `actorId` `character-04`. `settlementId` `cinder-key`. `payloadWithheld` true. `data` null. Summary:

`Sable Morrow was released from Cinder Key: 13.4 paid and 103.21 recorded as debt. Loyalty fell`

The briefing item `event:13680` uses that sentence. Mara's reading of Sable leaves `releaseSighting` null.

Stop.

## Quiet readings already measured

These are not another session unless the sessions above all matched and you still have the process. On seed 1847 with no commands, state tick 595 reads `Check-in · 7 need attention, and 3 background lines are listed with them.` The starvation line says `That costs health 0.205 per tick. Morale is already 0, so the shortage does not lower it.` World Government's `seatSummary` is `Jun Marrow covers Mara Vane's seat in World Government while Mara Vane is held. The orders stay Mara Vane's.` Pax Ash's `skills.leadership` is 75 and `skillsNote` is null at that tick, because he is still where Mara can see him. At state tick 679 his `skillsNote` is `Pax Ash's leadership is withheld on this card. The reading is distant (reputation), so skills stay off the card.` Mara's `loyaltyNote` names the seat reading `0.767927391717676` and the stored adjustment `-0.04`. Sequence 88540 says `Mara Vane was released from Crown Harbor: 108 paid and 72.25 recorded as debt. Loyalty fell. Mara Vane holds the seat of World Government again`.

## Session

Blind operator: M34 blind playtest: capture-wording-001 (`bc-5b6bef50-5468-5691-af99-ac8ea947430d`). Node `v24.21.0`. Branch `feature/capture-wording`. `git rev-parse HEAD` before the first request: `47f2b9a6ef40d8f73d5793f756d1c5c0abd3e3ae`. One dashboard process per seed, `npm run dashboard -- --reset --seed N`. Player `prototype-player`. No other commands than the ones named below.

### Session 1 — seed 1847, travel to Glassport

Health: HTTP 200 `{"ok":true,"tick":0,"events":0}`.

Tick 0, before the command.

| Field | Expected | Observed |
| --- | --- | --- |
| `player.displayName` | `Mara Vane` | `Mara Vane` |
| `player.characterId` | `character-01` | `character-01` |
| `party.name` | `Mara Vane` | `Mara Vane` |

`POST /api/commands` travel `glassport`: HTTP 202. `command.id` `command-00001`.

`POST /api/advance` `{"ticks":2}`: HTTP 200. `tick` 2. `day` `0.3333333333333333`.

State read: `tick` 2. `day` 0.33. `player.displayName` `Mara Vane`.

| Reading | Expected | Observed |
| --- | --- | --- |
| Mara's money | 102 | 102 |
| `seaSightings` keys | `character-13` only | `["character-13"]` |
| Ada `seaSighting.summary` | `Ada Sorn is overtaking, Crown Harbor to Glassport. 35 troops, 0 ticks old.` | that sentence |
| Ada `kind` / `arriving` | `overtaking` / false | `overtaking` / false |
| Ada live `troops` | null | null |
| `outOfStretch` | `Zara Gale is on Crown Harbor to Glassport, 4 of 4 ticks left, and is not in the same stretch of water.` No `troops` field. | that sentence. Keys are `characterId`, `fromId`, `toId`, `remainingTicks`, `totalTicks`, `summary`. No `troops`. |
| Zara `seaSighting` | null | null |
| Briefing | one `Sea sighting` item, Ada's sentence | `sea:character-13:2`, title `Sea sighting`, that sentence |
| `attentionCount` / `shownCount` / `omittedInfoCount` | 6 / 8 / 0 | 6 / 8 / 0 |
| `attentionLabel` | `Check-in · 6 need attention, and 2 background lines are listed with them.` | that string |
| Sequence 198 | `character-upkeep`, `payloadWithheld` false, `Mara Vane paid 3 passage. 102 left.`, `data.passageCost` 3, `data.characterMoney` 102 | those values. Event tick 1. On this page (`oldestSequence` 75). |

`POST /api/advance` `{"ticks":1}`: HTTP 200. Advance `tick` 3, `day` 0.5. State `tick` 3, `day` 0.5.

| Reading | Expected | Observed |
| --- | --- | --- |
| Ada summary | `Ada Sorn is overtaking, Crown Harbor to Glassport. Docks at Glassport on this tick. 35 troops, 0 ticks old.` | that sentence |
| Ada `arriving` / `kind` | true / `overtaking` | true / `overtaking` |
| Briefing `Sea sighting` lines, in order | Toma Reef arriving, Ada overtaking and docking, Sable Sorn passing, Vale Gale passing | `Toma Reef is arriving, Cinder Key to Glassport. Docks at Glassport on this tick. 42 troops, 0 ticks old.` then Ada's sentence above, then `Sable Sorn is passing, Glassport to Crown Harbor. 36 troops, 0 ticks old.` then `Vale Gale is passing, Glassport to Crown Harbor. 46 troops, 0 ticks old.` |
| Kessa Dusk | on `seaSighting`, not on the briefing list | `Kessa Dusk is arriving, Verdant Cay to Glassport. Docks at Glassport on this tick. 48 troops, 0 ticks old.` Not in `briefing.items`. |
| Sable's sentence | `Sable Sorn is passing, Glassport to Crown Harbor. 36 troops, 0 ticks old.` | that sentence |
| `outOfStretch` | Zara `3 of 4`, Orin `3 of 3` | `Zara Gale is on Crown Harbor to Glassport, 3 of 4 ticks left, and is not in the same stretch of water.` and `Orin Frost is on Crown Harbor to Glassport, 3 of 3 ticks left, and is not in the same stretch of water.` Neither entry has a `troops` field. |
| `attentionCount` / `shownCount` / `omittedInfoCount` | 6 / 10 / 2 | 6 / 10 / 2 |
| `attentionLabel` | `Check-in · 6 need attention, and 4 background lines are listed with them.` | that string |
| Sequence 283 | `Mara Vane paid 3 passage. 99 left.` | that sentence. `character-upkeep`, `payloadWithheld` false, `data.characterMoney` 99. On this page (`oldestSequence` 167). |

`POST /api/advance` `{"ticks":1}`: HTTP 200. Advance `tick` 4, `day` `0.6666666666666666`. State `tick` 4, `day` 0.67.

| Reading | Expected | Observed |
| --- | --- | --- |
| Mara `locationId` | `glassport` | `glassport` |
| Mara `travel` / `seaSightings` / `outOfStretch` | null / null / null | null / null / null |
| Ada `seaSighting` | null | null |
| Ada `troops.count` | 35 | 35 |
| Ada `money` | 141 | 141 |
| Ada `cargo` | provisions 36.384, arms 2, medicine 1, ship materials 6 | `provisions` 36.384, `arms` 2, `medicine` 1, `shipMaterials` 6 |
| Ada `conditionNote` | `Learned at Glassport. The hold and the purse are on this card because both ships are in port.` | that sentence |
| Sequence 375 | `Mara Vane paid 3 passage. 96 left.` | that sentence. `character-upkeep`, `payloadWithheld` false. |
| Mara's money | 96 | 96 |

Stopped. No further command.

### Session 2 — seed 1847, two troop labels

New process. Health: HTTP 200 `{"ok":true,"tick":0,"events":0}`.

1. Travel `cinder-key`: HTTP 202, `command-00001`. Advance `{"ticks":5}`: HTTP 200, advance `tick` 5, `day` `0.8333333333333334`. State `tick` 5, `day` 0.83. Mara `locationId` `cinder-key`. `travel` null.
2. Survey `cinder-key`: HTTP 202, `command-00002`. Advance `{"ticks":1}`: HTTP 200, `tick` 6. State `tick` 6. Mara `locationId` `cinder-key`.
3. Travel `glassport`: HTTP 202, `command-00003`. Advance `{"ticks":1}`: HTTP 200, advance `tick` 7, `day` `1.1666666666666667`. State `tick` 7, `day` 1.17.

Sable Morrow (`character-04`) at state tick 7.

| Reading | Expected | Observed |
| --- | --- | --- |
| `partySighting.troops` | 21 | 21 |
| `partySighting.ageTicks` | 2 | 2 |
| `partySighting.locationId` | `cinder-key` | `cinder-key` |
| `seaSighting.kind` | `sharing` | `sharing` |
| `seaSighting.arriving` | true | true |
| `seaSighting.troops` | 19 | 19 |
| `seaSighting.ageTicks` | 0 | 0 |
| route | `cinder-key` to `glassport` | `fromId` `cinder-key`, `toId` `glassport` |
| live `troops` | null | null |
| Inspector labels | `Sighted troops` for the 21, `sharing` for the 19. Port record label unchanged. | `seaSighting.kind` is `sharing`. Summary: `Sable Morrow is sharing, Cinder Key to Glassport. Docks at Glassport on this tick. 19 troops, 0 ticks old.` `partySighting` has no label field and no `kind`. The state document does not contain the string `Sighted troops`. The sea sentence does not call the 19 `Sighted troops`. |

Stopped.

### Session 3 — seed 4096, dock sentence

New process. Health: HTTP 200 `{"ok":true,"tick":0,"events":0}`. No commands.

Advance `{"ticks":144}` three times, then `{"ticks":44}`. Advance ticks 144, 288, 432, 476. Last advance `day` `79.33333333333333`. State `tick` 476. `day` 79.33. `player.displayName` `Mara Vane`.

Both sequences were on the first `limit=200` page (`oldestSequence` 59518, `newestSequence` 59717, `total` 59717).

| Reading | Expected | Observed |
| --- | --- | --- |
| Sequence 59637 | event tick 475, `character-captured`, `actorId` `character-11`, `targetId` `free-tide`, `settlementId` `glassport`, `payloadWithheld` true, `data` null | those fields. Event `day` 79.17. |
| Sequence 59637 summary | `Free Tide Compact took Rook Tern on the dock at Glassport after Pax Ash won there on a higher score` | that sentence. The word `outscore` is not in it. |
| Briefing `event:59637` | that same sentence | title `character captured`, summary that sentence |
| Sequence 59635 | `battle-resolved`, `payloadWithheld` true, `data` null, `Pax Ash won at Glassport on a higher score` | those fields. `actorId` `character-14`, `targetId` `world-government`, `settlementId` `glassport`. |
| Rook `captivity.cause` | `outscore-loss` | `outscore-loss` |
| Rook `captivity.causeLabel` | `taken on the dock after the other side won on a higher score` | that sentence |
| Glassport `factionId` | `world-government` | `world-government` |

The only `outscore` on this read is the stored cause `outscore-loss`. Stopped.

### Seed 2718 — Mina Vale held, then released

New process. `curl` to `/api/health` returned HTTP 200 before the advance. The body was not saved.

`POST /api/advance` `{"ticks":72}`: HTTP 200, `tick` 72, `day` 12. State `tick` 72, `day` 12. Sequence 8402 was on the page (`oldestSequence` 8314).

Mina Vale (`character-15`).

| Reading | Expected | Observed |
| --- | --- | --- |
| `captiveIntel.troops` | 12 | 12 |
| `partyPower` | 60.244 | 60.244 |
| `leadership` | 25 | 25 |
| `ports` | `[]` | `[]` |
| `observedTick` / `ageTicks` | 71 / 1 | 71 / 1 |
| `captivity.cause` | `failed-retreat` | `failed-retreat` |
| `captivity.causeLabel` | null | null |
| live `troops.count` | 0 | 0 |
| `skillsNote` | null | null |
| Sequence 8402 | event tick 71, `character-captured`, `actorId` `character-15`, `targetId` `world-government`, `settlementId` `crown-harbor`, `payloadWithheld` true, `data` null | those fields |
| Summary | `World Government took Mina Vale at Crown Harbor after failed retreat` | that sentence |
| Briefing `event:8402` | that sentence. Does not say she was captured. Does not say `outscore`. | summary is that sentence. It does not contain `captured` or `outscore`. The item title is `character captured`. |

Same process. `POST /api/advance` `{"ticks":84}`: HTTP 200, `tick` 156, `day` 26. State `tick` 156, `day` 26. Sequence 18482 on the page (`oldestSequence` 18398).

| Reading | Expected | Observed |
| --- | --- | --- |
| `captiveIntel` | null | null |
| `releaseSighting` on Mara's reading of Mina | null | null |
| travel | `crown-harbor` to `glassport`, 2 of 3 ticks left | `fromId` `crown-harbor`, `toId` `glassport`, `remainingTicks` 2, `totalTicks` 3 |
| Sequence 18482 | event tick 155, `captivity-released`, `payloadWithheld` true, `data` null | those fields. `actorId` `character-15`, `targetId` `world-government`, `settlementId` `crown-harbor`. |
| Summary | `Mina Vale was released from Crown Harbor: 58.13 paid and 0 recorded as debt` | that sentence. It does not say `Loyalty fell`. |
| Briefing `event:18482` | that sentence | title `captivity released`, summary that sentence |

Stopped.

### Seed 1847 — Sable Morrow released

New process. No commands. `curl` to `/api/health` returned HTTP 200 before the advance. The body was not saved.

`POST /api/advance` `{"ticks":119}`: HTTP 200, `tick` 119, `day` `19.833333333333332`. State `tick` 119, `day` 19.83. Sequence 13680 on the page (`oldestSequence` 13588).

| Reading | Expected | Observed |
| --- | --- | --- |
| Sequence 13680 | event tick 118, `captivity-released`, `actorId` `character-04`, `settlementId` `cinder-key`, `payloadWithheld` true, `data` null | those fields. `targetId` `free-tide`. |
| Summary | `Sable Morrow was released from Cinder Key: 13.4 paid and 103.21 recorded as debt. Loyalty fell` | that sentence |
| Briefing `event:13680` | that sentence | title `captivity released`, summary that sentence |
| Mara's reading of Sable `releaseSighting` | null | null |

The sessions above matched, and this process was still seed 1847 with no commands, so the quiet readings were taken on it.

State tick 595 (`day` 99.17), after further advances of 144, 144, 144, and 44.

| Reading | Expected | Observed |
| --- | --- | --- |
| `attentionLabel` | `Check-in · 7 need attention, and 3 background lines are listed with them.` | that string. `attentionCount` 7, `shownCount` 10, `omittedInfoCount` 1. |
| Starvation line | `That costs health 0.205 per tick. Morale is already 0, so the shortage does not lower it.` | inside `provision:critical`: `The hold is empty and 0.256 provisions per tick cannot be found. That costs health 0.205 per tick. Morale is already 0, so the shortage does not lower it. Morale gains nothing while the shortage lasts, so it will not recover on its own. No market you could still reach sells provisions.` |
| World Government `seatSummary` | `Jun Marrow covers Mara Vane's seat in World Government while Mara Vane is held. The orders stay Mara Vane's.` | that sentence. `actingCommanderId` `character-05`. |
| Pax Ash (`character-14`) | `skills.leadership` 75, `skillsNote` null | 75, and `skillsNote` null |

State tick 679 (`day` 113.17), after `{"ticks":84}`.

| Reading | Expected | Observed |
| --- | --- | --- |
| Pax `skillsNote` | `Pax Ash's leadership is withheld on this card. The reading is distant (reputation), so skills stay off the card.` | that sentence. `skills` null, `leadership` null. |
| Mara `loyaltyNote` | names seat reading `0.767927391717676` and stored adjustment `-0.04` | `The seat reads 0.767927391717676, personality loyalty 0.807927391717676 plus the stored adjustment -0.04. The loyalty figure on this card rounds that to 0.768. personality.loyalty is the seed and is not the figure the seat reads.` Card `loyalty` 0.768. |
| Sequence 88540 | `Mara Vane was released from Crown Harbor: 108 paid and 72.25 recorded as debt. Loyalty fell. Mara Vane holds the seat of World Government again` | that sentence. Event tick 678. On the page (`oldestSequence` 88484). Briefing `event:88540` uses it. `payloadWithheld` false, and `data` is present. |

Stopped.

## Findings

- `Sable Morrow is sharing, Cinder Key to Glassport` uses the row kind as a verb and does not say the ships are in the same stretch. `passing` and `overtaking` read as motion. `sharing` does not.
- The state JSON at tick 7 has no `Sighted troops` string. The port record is `partySighting.troops` 21 with no label. The sea count is called `sharing` in `kind` and in the summary. A reader of this API cannot see the inspector label the plan names for the 21.
- Briefing titles stay the event type: `character captured`, `battle resolved`, `captivity released`. The capture summary names the faction that took the prisoner. The title still says `character captured`, and the event still puts the prisoner on `actorId`.
- At state tick 595 Mara is held at Crown Harbor with an empty hold. The starvation sentence says `No market you could still reach sells provisions.` The item `settlementId` is `verdant-cay`. `party.resupply` names Verdant Cay, provisions 269, price 1.18, `reachable` false. The sentence says no market sells provisions. The resupply block says Verdant Cay has provisions and cannot be reached. Crown Harbor, where she is held, is not named as empty.
- `loyaltyNote` prints `0.767927391717676` and `0.807927391717676` in one sentence, then says the card rounds that to 0.768.
- Advance `day` is an unrounded float (`0.3333333333333333`, `0.6666666666666666`, `79.33333333333333`). The state `day` is rounded to two places (`0.33`, `0.67`, `79.33`).

## Verdict

`PROMOTE` if all three sessions match the sentences above, including `Mara Vane` on `player.displayName`, Ada's tick-2 sentence, Zara named with no troop count, Sable Morrow's sea count called `sharing` beside a port record that stays `Sighted troops`, and Rook's sentence with no `outscore` while `cause` stays `outscore-loss`. Also promote when Mina Vale's tick-72 sentence is `World Government took Mina Vale at Crown Harbor after failed retreat` beside `captiveIntel` troops 12, her event-tick-155 release does not say `Loyalty fell`, and Sable Morrow's state-tick-119 release ends with `Loyalty fell`.

`REVISE` if a sentence names the prisoner as the one who captured, says `outscore`, gives Zara or Orin a troop count, labels the sea count `Sighted troops`, or `player.displayName` is still `Prototype Commander`. Also revise if Mina's capture still says she was captured, if her paid release says `Loyalty fell`, or if Sable Morrow's unpaid release omits `Loyalty fell`.

`ABANDON` if the dock capture, the sea row, or the stored cause moved. Those are not wording. Glassport changing hands at sequence 59637, or `cause` anything other than `outscore-loss`, is abandon.

**Applied: PROMOTE.**

The three sessions match the quoted sentences. `player.displayName` is `Mara Vane`. Ada's tick-2 sentence matches. Zara and Orin are named, and neither `outOfStretch` entry has a troop count. Sable Morrow's sea count is called `sharing` in `kind` and in the summary, and it is not labeled `Sighted troops`. The port record stays a separate `partySighting` (troops 21, `cinder-key`, age 2) and was not given the sea kind. Rook's sentence has no `outscore`. `captivity.cause` stays `outscore-loss`. Glassport's `factionId` stays `world-government`. Mina Vale's tick-72 sentence is `World Government took Mina Vale at Crown Harbor after failed retreat` beside `captiveIntel` troops 12. Her event-tick-155 release does not say `Loyalty fell`. Sable Morrow's state-tick-119 release ends with `Loyalty fell`.

None of the REVISE sentences appeared. The dock capture, the sea row, and the stored cause did not move.
