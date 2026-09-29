# Playtest plan: readability polish

This is the plan for a blind operator. It is not a completed session. Do not run it as part of writing the change. Do not open `src/`, `tests/`, the branch diff, or `docs/design/` during the session. Use only the dashboard HTTP JSON.

Four short sessions, each its own process. The sentences are derived when the state is read. No rule in the world changes. Sessions 1 and 2 send the commands named below and then stop. Sessions 3 and 4 send no commands.

## Setup

- Node `v24.21.0` (`nvm use 24.21.0` if `node -v` is not that). `npm ci` first if `node_modules` is missing.
- Branch `fix/readability-polish`. Record `git rev-parse HEAD` before the first request.
- One process per session. `npm run dashboard -- --reset --seed N` on `http://127.0.0.1:4317`. Stop that process before the next seed. Do not start a second dashboard.
- `GET /api/health` should be HTTP 200 `{"ok":true,"tick":0,"events":0}`.
- The player is already Mara Vane, `character-01`, `playerId` `prototype-player`. Do not pass another character.
- Read state with `GET /api/state?limit=200`. Omit `beforeSequence` on the first read of a checkpoint. The `events` array is newest-first. Find a checkpoint by its `sequence`. If that sequence is below `eventPage.oldestSequence`, the fallback is `GET /api/state?limit=200&beforeSequence=<the page cursor>`.
- `briefing.items` carries the outcome sentence in `summary` and the title in `title`. A title is a sentence. It is not the event type.
- Advance with `POST /api/advance`. Body `{"ticks":N}`. `N` is an integer from 1 to 144.
- Advance `day` and state `day` are both rounded to two places.

## Hypothesis and ambition

**Hypothesis.** Each sea kind is a plain sentence, and the stored `kind` does not change. A port record in the state JSON is labelled `Sighted troops`. Briefing titles are sentences and do not depend on `actorId`. An empty berth is named, and a stocked market she cannot reach while held is named as unreachable for that reason. `loyaltyNote` shows only the rounded figure. Advance `day` matches the state `day`. An empty captive port list says the list may be incomplete. Live troops 0 beside a captured count names the captor. Capture `actorId` and `targetId` stay as they were.

**Ambition.** Session 1 reads overtaking, passing, and arriving on the Glassport crossing. Session 2 reads sharing beside `Sighted troops`. Session 3 reads Mina Vale at tick 72. Session 4 reads the held starvation line and the rounded loyalty note.

## Session 1 — three sea sentences, seed 1847

A new process. One command, then no others.

`POST /api/commands`

```json
{"playerId":"prototype-player","type":"character-action","action":"travel","targetId":"glassport"}
```

HTTP 202.

### State tick 2, the advance day and overtaking

`POST /api/advance` `{"ticks":2}`. HTTP 200. Advance `tick` 2. Advance `day` `0.33`. The advance `day` is not `0.3333333333333333`.

`GET /api/state?limit=200`. State `tick` 2. State `day` `0.33`.

Ada Sorn (`character-13`):

- `seaSighting.kind` is `overtaking`. `seaSighting.arriving` is false. `seaSighting.troops` is 35.
- `seaSighting.summary` is `Ada Sorn is overtaking on this route, Crown Harbor to Glassport. 35 troops, 0 ticks old.`
- The summary does not contain `is overtaking,`. The kind field is still `overtaking`.
- Live `troops` is null.

### State tick 3, passing and arriving

`POST /api/advance` `{"ticks":1}`. State `tick` 3. State `day` `0.5`.

- Ada's `kind` is still `overtaking`. `arriving` is true. Summary: `Ada Sorn is overtaking on this route, Crown Harbor to Glassport. Docks at Glassport on this tick. 35 troops, 0 ticks old.`
- Sable Sorn (`character-24`). `kind` `passing`. Summary: `Sable Sorn is passing on the opposite course, Glassport to Crown Harbor. 36 troops, 0 ticks old.`
- Toma Reef (`character-07`). `kind` `arriving`. `arriving` true. Summary: `Toma Reef is arriving at the same port, Cinder Key to Glassport. Docks at Glassport on this tick. 42 troops, 0 ticks old.`

Stop. No further command.

## Session 2 — sharing and Sighted troops, seed 1847

A new process. `npm run dashboard -- --reset --seed 1847`.

1. `POST /api/commands` travel to `cinder-key`.

```json
{"playerId":"prototype-player","type":"character-action","action":"travel","targetId":"cinder-key"}
```

HTTP 202. `POST /api/advance` `{"ticks":5}`. State tick 5. Mara's `locationId` is `cinder-key`.

2. `POST /api/commands` `action` `survey`, `targetId` `cinder-key`. `POST /api/advance` `{"ticks":1}`. State tick 6.

3. `POST /api/commands` travel to `glassport`. `POST /api/advance` `{"ticks":1}`.

The third advance is HTTP 200. Advance `tick` 7. Advance `day` `1.17`. State `tick` 7. State `day` `1.17`.

Sable Morrow (`character-04`).

- `partySighting.troops` is 21. `partySighting.label` is `Sighted troops`. `partySighting.ageTicks` is 2. `partySighting.locationId` is `cinder-key`.
- `seaSighting.kind` is `sharing`. `seaSighting.arriving` is true. `seaSighting.troops` is 19.
- `seaSighting.summary` is `Sable Morrow is in the same stretch of water, Cinder Key to Glassport. Docks at Glassport on this tick. 19 troops, 0 ticks old.`
- That summary does not contain the word `sharing`. The kind field does.
- The sea row has no `label` field. Live `troops` is null.

Stop. No further command.

## Session 3 — Mina Vale held, seed 2718

A new process. No commands. `npm run dashboard -- --reset --seed 2718`.

`POST /api/advance` `{"ticks":72}`. State `tick` 72. State `day` 12.

Sequence 8402, on the `limit=200` page. `character-captured`. `actorId` `character-15`. `targetId` `world-government`. `payloadWithheld` true. `data` null. Summary `World Government took Mina Vale at Crown Harbor after failed retreat`.

Briefing `event:8402`. Title `A captain was taken`. Summary that same sentence. The title is not `character captured` and not `Prisoner taken`.

`actorId` is still the prisoner. `targetId` is still the captor faction. The title does not swap those ids.

Mina Vale (`character-15`), on Mara's reading:

- `troops.count` is 0.
- `troopsNote` is `0 with Mina Vale; 12 held by World Government.`
- `captiveIntel.troops` is 12. `captiveIntel.ports` is `[]`.
- `captiveIntel.portsNote` is `Mina Vale named no ports. The list may be incomplete.`
- `skillsNote` is null.

Stop.

## Session 4 — titles, the empty berth, the loyalty note, seed 1847

A new process. No commands. `npm run dashboard -- --reset --seed 1847`.

### State tick 72, other sentence titles

`POST /api/advance` `{"ticks":72}`. State `tick` 72.

- Briefing `event:5655`. Title `A battle was decided`. The title is not `battle resolved`.
- Briefing `event:3940`. Title `A captain was taken`.
- A briefing title is not `standing order refused`. One refused order that is still on the check-in reads `An order was refused`.

### State tick 119, a release title

`POST /api/advance` `{"ticks":47}`. State `tick` 119.

Sequence 13680. `captivity-released`. `actorId` `character-04`. Briefing `event:13680`. Title `A captain was released`. The title is not `captivity released`. `actorId` is still `character-04`.

### State tick 595, the empty berth

Advance with `{"ticks":144}` three times, then `{"ticks":44}`. State `tick` 595. `day` 99.17.

The `provision:critical` item:

- `settlementId` is `verdant-cay`.
- Summary:

`The hold is empty and 0.256 provisions per tick cannot be found. That costs health 0.205 per tick. Morale is already 0, so the shortage does not lower it. Morale gains nothing while the shortage lasts, so it will not recover on its own. Crown Harbor has no provisions to sell. Verdant Cay sells provisions, and you cannot reach it while you are held.`

- It does not contain `No market you could still reach sells provisions.`
- `party.resupply.settlementId` is `verdant-cay`. `provisions` is 269. `price` is 1.18. `reachable` is false. `travelTicks` is null.

### State tick 679, the loyalty note

Same process. `POST /api/advance` `{"ticks":84}`. State `tick` 679. `day` 113.17.

Mara's `loyalty` is 0.768. `loyaltyNote` is:

`The seat reads 0.768. personality.loyalty is the seed and is not the figure the seat reads.`

The note contains no number with more than 3 decimal places. It does not contain `0.767927391717676` or `0.807927391717676`. `personality.loyalty` is still `0.807927391717676`.

Stop.

## Session

Operator fills this in. Do not treat the checkpoints above as a played session.

## Findings

Operator fills this in.

## Verdict

`PROMOTE` if all four sea summaries are the sentences above and each `kind` is unchanged, `partySighting.label` is `Sighted troops`, the tick-2 advance `day` is `0.33`, Mina's title is `A captain was taken` while `actorId` stays `character-15`, her `portsNote` and `troopsNote` are the sentences above, the tick-595 line names Crown Harbor as empty and Verdant Cay as stocked while she is held, and the tick-679 note is only the rounded `0.768` with no number past 3 decimal places.

`REVISE` if a sentence still uses a kind as a verb (`is sharing`, `is overtaking,`, `is passing,`, `is arriving,`), the port record has no `Sighted troops` label, a briefing title is an event type, the starvation line says no market sells provisions or does not say she is held, an empty `ports` list has no incomplete note, live troops 0 has no captor note, the loyalty note prints more than 3 decimal places, or an advance `day` is an unrounded float.

`ABANDON` if `actorId` and `targetId` on sequence 8402 are swapped, or if Glassport, a capture, or a stored cause moved. Those are not wording.

**Applied:** not yet. This plan has not been run.
