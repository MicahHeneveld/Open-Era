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

## Verdict

`PROMOTE` if all three sessions match the sentences above, including `Mara Vane` on `player.displayName`, Ada's tick-2 sentence, Zara named with no troop count, Sable Morrow's sea count called `sharing` beside a port record that stays `Sighted troops`, and Rook's sentence with no `outscore` while `cause` stays `outscore-loss`. Also promote when Mina Vale's tick-72 sentence is `World Government took Mina Vale at Crown Harbor after failed retreat` beside `captiveIntel` troops 12, her event-tick-155 release does not say `Loyalty fell`, and Sable Morrow's state-tick-119 release ends with `Loyalty fell`.

`REVISE` if a sentence names the prisoner as the one who captured, says `outscore`, gives Zara or Orin a troop count, labels the sea count `Sighted troops`, or `player.displayName` is still `Prototype Commander`. Also revise if Mina's capture still says she was captured, if her paid release says `Loyalty fell`, or if Sable Morrow's unpaid release omits `Loyalty fell`.

`ABANDON` if the dock capture, the sea row, or the stored cause moved. Those are not wording. Glassport changing hands at sequence 59637, or `cause` anything other than `outscore-loss`, is abandon.
