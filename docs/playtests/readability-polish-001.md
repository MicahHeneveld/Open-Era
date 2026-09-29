# Playtest plan: readability polish

This is the plan for a blind operator. It is not a completed session. Do not run it as part of writing the change. Do not open `src/`, `tests/`, the branch diff, or `docs/design/` during the session. Use only the dashboard HTTP JSON.

Two short sessions, each its own process. The sentences are derived when the state is read. No rule in the world changes. Session 1 sends the commands named below and then stops. Session 2 sends no commands.

## Setup

- Node `v24.21.0` (`nvm use 24.21.0` if `node -v` is not that). `npm ci` first if `node_modules` is missing.
- Branch `fix/readability-polish`. Record `git rev-parse HEAD` before the first request.
- One process per session. `npm run dashboard -- --reset --seed N` on `http://127.0.0.1:4317`. Stop that process before the next seed. Do not start a second dashboard.
- `GET /api/health` should be HTTP 200 `{"ok":true,"tick":0,"events":0}`.
- The player is already Mara Vane, `character-01`, `playerId` `prototype-player`. Do not pass another character.
- Read state with `GET /api/state?limit=200`. Omit `beforeSequence` on the first read of a checkpoint. The `events` array is newest-first. Find a checkpoint by its `sequence`. If that sequence is below `eventPage.oldestSequence`, the fallback is `GET /api/state?limit=200&beforeSequence=<the page cursor>`.
- `briefing.items` carries the outcome sentence in `summary` and the short title in `title`.
- Advance with `POST /api/advance`. Body `{"ticks":N}`. `N` is an integer from 1 to 144.
- Advance `day` and state `day` are both rounded to two places.

## Hypothesis and ambition

**Hypothesis.** A ship in the same stretch is not called `sharing` in the sentence. A port record in the state JSON is labelled `Sighted troops`. A capture, a battle, and a release do not use the event type as the briefing title. An empty berth is named, and a stocked market is not called unsold. The loyalty note does not print a raw float. Advance `day` matches the state `day`. Capture `actorId` and `targetId` stay as they were.

**Ambition.** Session 1 meets Sable Morrow with both a port record and a sea row. Session 2 reads Mina's capture title, Mara's starvation line while she is held, and her loyalty note after release.

## Session 1 — two troop labels, seed 1847

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

## Session 2 — held, then the loyalty note, seed 1847

A new process. No commands. `npm run dashboard -- --reset --seed 1847`.

### State tick 2, the advance day

`POST /api/advance` `{"ticks":2}`. HTTP 200. Advance `tick` 2. Advance `day` `0.33`. State `tick` 2. State `day` `0.33`. The advance `day` is not `0.3333333333333333`.

### State tick 72, seed 2718, the capture title

New process. No commands. `npm run dashboard -- --reset --seed 2718`.

`POST /api/advance` `{"ticks":72}`. State `tick` 72. State `day` 12.

Sequence 8402, on the `limit=200` page. `character-captured`. `actorId` `character-15`. `targetId` `world-government`. `payloadWithheld` true. `data` null. Summary `World Government took Mina Vale at Crown Harbor after failed retreat`.

Briefing `event:8402`. Title `Prisoner taken`. Summary that same sentence. The title is not `character captured`.

`actorId` is still the prisoner. `targetId` is still the captor faction.

### State tick 595, the empty berth

New process. No commands. `npm run dashboard -- --reset --seed 1847`.

Advance with `{"ticks":144}` four times, then `{"ticks":19}`. State `tick` 595. `day` 99.17.

The `provision:critical` summary is:

`The hold is empty and 0.256 provisions per tick cannot be found. That costs health 0.205 per tick. Morale is already 0, so the shortage does not lower it. Morale gains nothing while the shortage lasts, so it will not recover on its own. Crown Harbor has no provisions to sell. Verdant Cay sells provisions, and you cannot reach it from here.`

It does not contain `No market you could still reach sells provisions.`

### State tick 679, the loyalty note

Same process. `POST /api/advance` `{"ticks":84}`. State `tick` 679. `day` 113.17.

Mara's `loyalty` is 0.768. `loyaltyNote` is:

`The seat reads the unrounded sum of personality loyalty and the stored adjustment -0.04. This card shows 0.768. personality.loyalty is the seed and is not the figure the seat reads.`

The note does not contain `0.767927391717676` or `0.807927391717676`. `personality.loyalty` is still `0.807927391717676`.

Stop.

## Session

Operator fills this in. Do not treat the checkpoints above as a played session.

## Findings

Operator fills this in.

## Verdict

`PROMOTE` if session 1's sea summary is the stretch sentence, `kind` stays `sharing`, and `partySighting.label` is `Sighted troops`. Also promote when the tick-2 advance `day` is `0.33`, Mina's briefing title is `Prisoner taken` while `actorId` stays `character-15`, the tick-595 line names Crown Harbor as empty and Verdant Cay as stocked, and the tick-679 note shows `0.768` without the raw seed.

`REVISE` if a sentence still says `is sharing`, the port record has no `Sighted troops` label, a briefing title is `character captured` or `battle resolved` or `captivity released`, the starvation line says no market sells provisions, the loyalty note prints the raw seed, or an advance `day` is an unrounded float.

`ABANDON` if `actorId` and `targetId` on sequence 8402 are swapped, or if Glassport, a capture, or a stored cause moved. Those are not wording.

**Applied:** not yet. This plan has not been run.
