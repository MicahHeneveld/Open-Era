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

Played blind on branch `fix/readability-polish`. Head before the first request: `bdb0e529d6ca805ef4e21eb2a50ebfed109a7856`. Node `v24.21.0`. Operator: M34.1 blind playtest: readability-polish-001 (`bc-a1b2a515-4fe5-5883-9e6c-67f29a60fa24`). One dashboard process per session, `npm run dashboard -- --reset --seed N` on `http://127.0.0.1:4317`. Each process answered `GET /api/health` HTTP 200 `{"ok":true,"tick":0,"events":0}` before the first command or advance. Player `prototype-player`. No other commands were sent.

### Session 1 — seed 1847

`POST /api/commands` travel to `glassport`. HTTP 202.

`POST /api/advance` `{"ticks":2}`. HTTP 200. Advance `tick` 2. Advance `day` `0.33` (not `0.3333333333333333`).

`GET /api/state?limit=200`. State `tick` 2. State `day` `0.33`.

Ada Sorn (`character-13`):

| Field | Expected | Observed |
| --- | --- | --- |
| `seaSighting.kind` | `overtaking` | `overtaking` |
| `seaSighting.arriving` | false | false |
| `seaSighting.troops` | 35 | 35 |
| `seaSighting.summary` | `Ada Sorn is overtaking on this route, Crown Harbor to Glassport. 35 troops, 0 ticks old.` | `Ada Sorn is overtaking on this route, Crown Harbor to Glassport. 35 troops, 0 ticks old.` |
| summary contains `is overtaking,` | no | no |
| live `troops` | null | null |

`POST /api/advance` `{"ticks":1}`. HTTP 200. Advance `tick` 3. Advance `day` `0.5`. State `tick` 3. State `day` `0.5`.

| Who | Expected | Observed |
| --- | --- | --- |
| Ada Sorn (`character-13`) | `kind` `overtaking`. `arriving` true. Summary `Ada Sorn is overtaking on this route, Crown Harbor to Glassport. Docks at Glassport on this tick. 35 troops, 0 ticks old.` | `kind` `overtaking`. `arriving` true. Summary `Ada Sorn is overtaking on this route, Crown Harbor to Glassport. Docks at Glassport on this tick. 35 troops, 0 ticks old.` Live `troops` null. |
| Sable Sorn (`character-24`) | `kind` `passing`. Summary `Sable Sorn is passing on the opposite course, Glassport to Crown Harbor. 36 troops, 0 ticks old.` | `kind` `passing`. `arriving` false. Summary `Sable Sorn is passing on the opposite course, Glassport to Crown Harbor. 36 troops, 0 ticks old.` `seaSighting.troops` 36. Live `troops` null. |
| Toma Reef (`character-07`) | `kind` `arriving`. `arriving` true. Summary `Toma Reef is arriving at the same port, Cinder Key to Glassport. Docks at Glassport on this tick. 42 troops, 0 ticks old.` | `kind` `arriving`. `arriving` true. Summary `Toma Reef is arriving at the same port, Cinder Key to Glassport. Docks at Glassport on this tick. 42 troops, 0 ticks old.` `seaSighting.troops` 42. Live `troops` null. |

None of those summaries contained `is overtaking,`, `is passing,`, `is arriving,`, or `is sharing`. Stopped. No further command.

### Session 2 — seed 1847

New process.

1. Travel to `cinder-key`. HTTP 202. `POST /api/advance` `{"ticks":5}`. HTTP 200. Advance `tick` 5. Advance `day` `0.83`. State `tick` 5. State `day` `0.83`. Mara Vane (`character-01`) `locationId` `cinder-key`.
2. Survey `cinder-key`. HTTP 202. `POST /api/advance` `{"ticks":1}`. HTTP 200. Advance `tick` 6. Advance `day` `1`. State `tick` 6. State `day` `1`. Mara `locationId` `cinder-key`.
3. Travel to `glassport`. HTTP 202. `POST /api/advance` `{"ticks":1}`. HTTP 200. Advance `tick` 7. Advance `day` `1.17`. State `tick` 7. State `day` `1.17`.

Sable Morrow (`character-04`):

| Field | Expected | Observed |
| --- | --- | --- |
| `partySighting.troops` | 21 | 21 |
| `partySighting.label` | `Sighted troops` | `Sighted troops` |
| `partySighting.ageTicks` | 2 | 2 |
| `partySighting.locationId` | `cinder-key` | `cinder-key` |
| `seaSighting.kind` | `sharing` | `sharing` |
| `seaSighting.arriving` | true | true |
| `seaSighting.troops` | 19 | 19 |
| `seaSighting.summary` | `Sable Morrow is in the same stretch of water, Cinder Key to Glassport. Docks at Glassport on this tick. 19 troops, 0 ticks old.` | `Sable Morrow is in the same stretch of water, Cinder Key to Glassport. Docks at Glassport on this tick. 19 troops, 0 ticks old.` |
| summary contains `sharing` | no | no |
| sea row `label` | absent | absent |
| live `troops` | null | null |

Stopped. No further command.

### Session 3 — seed 2718

New process. No commands. `POST /api/advance` `{"ticks":72}`. HTTP 200. Advance `tick` 72. Advance `day` `12`. State `tick` 72. State `day` `12`.

Sequence 8402 was on the `limit=200` page (`eventPage.oldestSequence` 8314, `newestSequence` 8513).

| Field | Expected | Observed |
| --- | --- | --- |
| type | `character-captured` | `character-captured` |
| `actorId` | `character-15` (the prisoner) | `character-15` |
| `targetId` | `world-government` (the captor faction) | `world-government` |
| `payloadWithheld` | true | true |
| `data` | null | null |
| summary | `World Government took Mina Vale at Crown Harbor after failed retreat` | `World Government took Mina Vale at Crown Harbor after failed retreat` |
| briefing `event:8402` title | `A captain was taken` | `A captain was taken` |
| briefing summary | that same sentence | `World Government took Mina Vale at Crown Harbor after failed retreat` |
| title is `character captured` or `Prisoner taken` | no | no |

The title does not contain `character-15` or `world-government`.

Mina Vale (`character-15`):

| Field | Expected | Observed |
| --- | --- | --- |
| `troops.count` | 0 | 0 |
| `troopsNote` | `0 with Mina Vale; 12 held by World Government.` | `0 with Mina Vale; 12 held by World Government.` |
| `captiveIntel.troops` | 12 | 12 |
| `captiveIntel.ports` | `[]` | `[]` |
| `captiveIntel.portsNote` | `Mina Vale named no ports. The list may be incomplete.` | `Mina Vale named no ports. The list may be incomplete.` |
| `skillsNote` | null | null |

Stopped.

### Session 4 — seed 1847

New process. No commands.

`POST /api/advance` `{"ticks":72}`. HTTP 200. Advance `tick` 72. Advance `day` `12`. State `tick` 72. State `day` `12`.

| Check | Expected | Observed |
| --- | --- | --- |
| briefing `event:5655` title | `A battle was decided`, not `battle resolved` | `A battle was decided`. Summary `Rook Tern lost at Cinder Key`. |
| briefing `event:3940` title | `A captain was taken` | `A captain was taken`. Summary `Free Tide Compact took Sable Morrow at Cinder Key after failed retreat`. |
| a briefing title is `standing order refused` | no | no. The ten check-in titles were `The party is starving`, `Intelligence is stale` (twice), `A battle was decided`, `A captain was taken`, `Jun Marrow's routine digest`, `A port was claimed`, and `A battle was decided` three more times. |
| one refused order still on the check-in | title `An order was refused` | The string `An order was refused` is not in the tick-72 state JSON. `omittedInfoCount` is 1. See Findings. |

`POST /api/advance` `{"ticks":47}`. HTTP 200. Advance `tick` 119. Advance `day` `19.83`. State `tick` 119. State `day` `19.83`.

Sequence 13680 was on the `limit=200` page (`oldestSequence` 13588).

| Field | Expected | Observed |
| --- | --- | --- |
| type | `captivity-released` | `captivity-released` |
| `actorId` | `character-04` | `character-04` |
| briefing `event:13680` title | `A captain was released`, not `captivity released` | `A captain was released` |
| summary | (not specified) | `Sable Morrow was released from Cinder Key: 13.4 paid and 103.21 recorded as debt. Loyalty fell` |

`POST /api/advance` `{"ticks":144}` three times, then `{"ticks":44}`. Each HTTP 200. Advance days `43.83`, `67.83`, `91.83`, `99.17`. State `tick` 595. State `day` `99.17`.

`provision:critical`:

| Field | Expected | Observed |
| --- | --- | --- |
| `settlementId` | `verdant-cay` | `verdant-cay` |
| summary | `The hold is empty and 0.256 provisions per tick cannot be found. That costs health 0.205 per tick. Morale is already 0, so the shortage does not lower it. Morale gains nothing while the shortage lasts, so it will not recover on its own. Crown Harbor has no provisions to sell. Verdant Cay sells provisions, and you cannot reach it while you are held.` | that same sentence |
| contains `No market you could still reach sells provisions.` | no | no |
| `party.resupply.settlementId` | `verdant-cay` | `verdant-cay` |
| `provisions` | 269 | 269 |
| `price` | 1.18 | 1.18 |
| `reachable` | false | false |
| `travelTicks` | null | null |

`POST /api/advance` `{"ticks":84}`. HTTP 200. Advance `tick` 679. Advance `day` `113.17`. State `tick` 679. State `day` `113.17`.

Mara Vane (`character-01`):

| Field | Expected | Observed |
| --- | --- | --- |
| `loyalty` | 0.768 | 0.768 |
| `loyaltyNote` | `The seat reads 0.768. personality.loyalty is the seed and is not the figure the seat reads.` | that same sentence |
| a number in the note with more than 3 decimal places | no | no. The only number is `0.768`. |
| note contains `0.767927391717676` or `0.807927391717676` | no | no |
| `personality.loyalty` | `0.807927391717676` | `0.807927391717676` |

Stopped. Every advance `day` read in these four sessions was a two-place value or a whole number (`0.33`, `0.5`, `0.83`, `1`, `1.17`, `12`, `19.83`, `43.83`, `67.83`, `91.83`, `99.17`, `113.17`).

## Findings

- Seed 1847, state tick 72. The check-in does not include a refused order. No briefing title is `An order was refused`, and that string is absent from the state JSON. `briefing.omittedInfoCount` is 1. Paging the event feed, four `standing-order-refused` rows are sentences (`Sable Morrow refused the protect order after weighing loyalty, risk, and ambition.` and the same shape for Vale Drake, Orin Rill, and Kessa Calder; sequences 24, 50, 56, 62). Two withheld rows are still the event type: sequence 113 `Finn Frost: standing order refused`, sequence 137 `Bram Tern: standing order refused`. No briefing title on the check-in is `standing order refused`.
- Seed 2718, state tick 72. Iris Stone's routine digest reads `1 routine order updates: 1 confirmed. No command decision is required.` The verb does not agree with 1.
- Seed 2718, state tick 72. Mina Vale's live `troops.count` is 0 and `troopsNote` names World Government, but `troops.experience` is `0.19867861845996232` and `troops.discipline` is `0.3837455657846294`.
- Seed 1847, state tick 595. The captivity check-in title is `Character held captive`. The summary is `Held at Crown Harbor. Escape always works, and it wounds you. The capture risk was severe. Mandatory release is in 13.8 days.` The other titles on that page are sentences (`The party is starving`, `A captain was taken`, `A captain was released`, `A battle was decided`).
- Seed 1847, state tick 595. A grouped check-in title is `Scattered troops returned ×2`. Its summary is `2 such reports, the most recent being: 31 scattered troops returned to Jun Marrow. The first was on day 98.` That line does not contain a doubled period.
- The tick-679 `loyaltyNote` matches the plan and still puts the field name `personality.loyalty` in the sentence the player reads. The note's only number is `0.768`.

## Verdict

`PROMOTE` if all four sea summaries are the sentences above and each `kind` is unchanged, `partySighting.label` is `Sighted troops`, the tick-2 advance `day` is `0.33`, Mina's title is `A captain was taken` while `actorId` stays `character-15`, her `portsNote` and `troopsNote` are the sentences above, the tick-595 line names Crown Harbor as empty and Verdant Cay as stocked while she is held, and the tick-679 note is only the rounded `0.768` with no number past 3 decimal places.

`REVISE` if a sentence still uses a kind as a verb (`is sharing`, `is overtaking,`, `is passing,`, `is arriving,`), the port record has no `Sighted troops` label, a briefing title is an event type, the starvation line says no market sells provisions or does not say she is held, an empty `ports` list has no incomplete note, live troops 0 has no captor note, the loyalty note prints more than 3 decimal places, or an advance `day` is an unrounded float.

`ABANDON` if `actorId` and `targetId` on sequence 8402 are swapped, or if Glassport, a capture, or a stored cause moved. Those are not wording.

**Applied:** `PROMOTE`. Head tested `bdb0e529d6ca805ef4e21eb2a50ebfed109a7856`. Node v24.21.0. Agent M34.1 blind playtest: readability-polish-001 (`bc-a1b2a515-4fe5-5883-9e6c-67f29a60fa24`). The four sea summaries matched and each `kind` stayed. `partySighting.label` was `Sighted troops`. The tick-2 advance `day` was `0.33`. Sequence 8402's title was `A captain was taken`, `actorId` stayed `character-15`, and `targetId` stayed `world-government`. Mina's `portsNote` and `troopsNote` matched. The tick-595 line named Crown Harbor as empty and Verdant Cay as stocked while she is held. The tick-679 note was only `0.768`. No listed REVISE or ABANDON condition was observed. The missing `An order was refused` check-in line is recorded under Findings.
