# Playtest plan: ransom split

This is the plan for a blind operator. It is not a completed session. Do not run it as part of writing the change. Do not open `src/`, `tests/`, the branch diff, or `docs/design/` during the session. Use only the dashboard HTTP JSON, this plan, and `progress.md`.

One session. One process. Seed 1847. Send no commands. The session reads one ransom line that is already in the log by state tick 276, Dax Pike's card at that tick, and Dax Pike's own release later.

No seeded run through tick 1200 on 1847, 2718, or 4096 releases a prisoner whose captor has no faction. There is no no-faction beat on the dashboard.

## Setup

- Node `v24.21.0` (`nvm use 24.21.0` if `node -v` is not that). `npm ci` first if `node_modules` is missing.
- Branch `feature/ransom-split`. Record `git rev-parse HEAD` before the first request.
- One process. `npm run dashboard -- --reset --seed 1847` on `http://127.0.0.1:4317`. Do not start a second dashboard.
- `GET /api/health` should be HTTP 200 `{"ok":true,"tick":0,"events":0}`.
- The player is Mara Vane, `character-01`, `playerId` `prototype-player`. Do not pass another character.
- Read state with `GET /api/state?limit=200`. Omit `beforeSequence` on the first read of a checkpoint. The `events` array is newest-first. If the sequence you need is below `eventPage.oldestSequence`, the fallback is `GET /api/state?limit=200&beforeSequence=<cursor>`.
- Advance with `POST /api/advance`. Body `{"ticks":N}`. `N` is an integer from 1 to 144.
- Advance `day` and state `day` are both rounded to two places.
- The briefing is built from recent events. A release older than that window is on the feed page, not on `briefing.items`.

## Hypothesis and ambition

**Hypothesis.** A release line names each recipient and the amount, on the feed and in the briefing, for the prisoner and for the captor's side. The debt wording and "Loyalty fell" stay. At state tick 276 Dax Pike is not the payer. His own release, later, pays the World Government treasury and Mara Vane, and Mara's purse moves by the leader share.

**Ambition.** Read Sable Morrow's line while it is still on the advance response. Read Dax Pike's card at state tick 276. Read Dax Pike's release at state tick 902, including the purse and the treasury the player can see.

## Checkpoint 1 — Sable Morrow's line, state tick 119

`POST /api/advance` `{"ticks":119}`. HTTP 200. Advance `tick` 119. Advance `day` `19.83`.

In that response's `events`, sequence 13680. `type` `captivity-released`. `actorId` `character-04`. `targetId` `free-tide`. `tick` 118. `payloadWithheld` true. `data` null.

Summary, exact:

`Sable Morrow was released from Cinder Key: 13.4 paid and 103.21 recorded as debt. Loyalty fell. Sable Morrow paid 13.4 ransom: 6.7 to the Free Tide Compact treasury and 6.7 to Pax Ash`

Recipients: the Free Tide Compact treasury 6.7, Pax Ash 6.7. Those two amounts sum to 13.4. The odd cent is not in this payment.

`GET /api/state?limit=200`. State `tick` 119. State `day` `19.83`. Briefing `event:13680`. Title `A captain was released`. Summary that same sentence.

Mara's faction is World Government. Free Tide's `treasury` on `factions` is null. Pax Ash's purse is not on Mara's party. The amounts are on the line. They are not a balance she can see.

## Checkpoint 2 — Dax Pike at state tick 276

From tick 119, `POST /api/advance` `{"ticks":144}`. Then `POST /api/advance` `{"ticks":13}`. HTTP 200. The second advance `tick` is 276. Advance `day` `46`.

`GET /api/state?limit=200`. State `tick` 276. State `day` 46.

Dax Pike, `character-20`:

- `locationId` is `glassport`.
- `money` is null.
- `captivity` is null.
- He is not the actor or the named recipient of a `captivity-released` row on this page.

Mara, the party:

- `party.locationId` is `crown-harbor`.
- `party.hold.money` is 108.

Factions:

- `world-government` `treasury` is 27132.81.
- `free-tide` `treasury` is null.

The newest page does not contain sequence 13680. Briefing `items` does not contain `event:13680`. The line is still in the log. `GET /api/state?limit=200&beforeSequence=13880`. Sequence 13680 is on that page. `payloadWithheld` true. `data` null. The summary is the sentence from checkpoint 1.

That is the only ransom paid by state tick 276. Dax Pike has not been released and has not been paid a share.

## Checkpoint 3 — Dax Pike's release, state tick 902

Continue from tick 276. Each advance is HTTP 200.

1. `{"ticks":144}` → tick 420
2. `{"ticks":144}` → tick 564
3. `{"ticks":144}` → tick 708
4. `{"ticks":144}` → tick 852
5. `{"ticks":49}` → tick 901
6. Read state at 901, then `{"ticks":1}` → tick 902

At state tick 901, before the last advance:

- Dax Pike is still held. `captivity` is not null. `locationId` is `glassport`. `money` is null on Mara's reading.
- `party.hold.money` is 473.02.
- `world-government` `treasury` is 39969.99.

`POST /api/advance` `{"ticks":1}`. HTTP 200. Advance `tick` 902.

`GET /api/state?limit=200`. State `tick` 902. Sequence 118405 is on this page. `type` `captivity-released`. `actorId` `character-20`. `tick` 901. `payloadWithheld` true. `data` null.

Summary, exact:

`Dax Pike was released from Glassport: 62.69 paid and 380.67 recorded as debt. Loyalty fell. Dax Pike paid 62.69 ransom: 31.35 to the World Government treasury and 31.34 to Mara Vane`

Recipients: the World Government treasury 31.35, Mara Vane 31.34. Those two amounts sum to 62.69. The odd cent went to the treasury.

Briefing `event:118405`. Title `A captain was released`. Summary that same sentence.

Balances Mara can see:

- `party.hold.money` is 504.36. That is 473.02 plus 31.34, the leader share, and nothing else moved her purse on this tick.
- `world-government` `treasury` is 40003.64. The ransom credit inside that tick is 31.35, from 39969.99 to 40001.34. The rest of the tick adds 2.30 in tax, so the treasury she reads is 40003.64.
- Dax Pike's `money` is still null. His debt is not on Mara's card.

Stop. No command.

## PROMOTE / REVISE / ABANDON

`PROMOTE` if sequence 13680's summary is the Sable Morrow sentence above, sequence 118405's summary is the Dax Pike sentence above, both titles are `A captain was released`, Dax Pike at state tick 276 has `captivity` null and `money` null at Glassport, Mara's purse at state tick 902 is 504.36, and the World Government treasury at state tick 902 is 40003.64.

`REVISE` if a release line drops the debt wording or "Loyalty fell", names only one recipient when a faction was paid, or the two shares do not sum to the paid amount. Also if Mara's purse does not rise by 31.34 on the tick Dax is released.

`ABANDON` if the event type is not `captivity-released`, if `actorId` on sequence 118405 is not `character-20`, or if a payment of 0 still moves a purse or a treasury.

## Session

Blind session. One process. Seed 1847. No commands. Node v24.21.0. Head before the first request: `97ba340c75dc263b71b2a24f57b2f32b21abc1ea`. `npm ci` because `node_modules` was missing. `npm run dashboard -- --reset --seed 1847` on `http://127.0.0.1:4317`.

`GET /api/health` HTTP 200 `{"ok":true,"tick":0,"events":0}`.

Player `id` `prototype-player`, `displayName` `Mara Vane`, `characterId` `character-01`.

### Checkpoint 1 — Sable Morrow's line, state tick 119

`POST /api/advance` `{"ticks":119}` HTTP 200. Advance `tick` 119 (expected 119). Advance `day` 19.83 (expected 19.83).

Sequence 13680 in that response's `events`:

| Field | Expected | Observed |
| --- | --- | --- |
| `type` | `captivity-released` | `captivity-released` |
| `actorId` | `character-04` | `character-04` |
| `targetId` | `free-tide` | `free-tide` |
| `tick` | 118 | 118 |
| `payloadWithheld` | true | true |
| `data` | null | null |
| `summary` | the Sable Morrow sentence | the same sentence |

Summary, observed:

`Sable Morrow was released from Cinder Key: 13.4 paid and 103.21 recorded as debt. Loyalty fell. Sable Morrow paid 13.4 ransom: 6.7 to the Free Tide Compact treasury and 6.7 to Pax Ash`

Recipients on the line: the Free Tide Compact treasury 6.7, Pax Ash 6.7. Sum 13.4. The shares are equal. The odd cent is not in this payment.

`GET /api/state?limit=200` HTTP 200. State `tick` 119 (expected 119). State `day` 19.83 (expected 19.83). `eventPage.oldestSequence` 13588, so sequence 13680 is on this page.

Briefing `id` `event:13680` (expected `event:13680`). Title `A captain was released` (expected `A captain was released`). Summary that same sentence.

Mara `factionId` `world-government`. The faction `name` is `World Government` (expected World Government). `party.locationId` `crown-harbor`. `party.hold.money` 108.

`free-tide` `treasury` null (expected null). `world-government` `treasury` 21553.01. Pax Ash (`character-14`) is not that party purse. His card `money` is 51.58 at `glassport`. The 6.7 figures are on the line. Free Tide's treasury is not a balance she can see.

### Checkpoint 2 — Dax Pike at state tick 276

From tick 119, `POST /api/advance` `{"ticks":144}` HTTP 200. Advance `tick` 263, `day` 43.83.

`POST /api/advance` `{"ticks":13}` HTTP 200. Advance `tick` 276 (expected 276). Advance `day` 46 (expected 46).

`GET /api/state?limit=200` HTTP 200. State `tick` 276 (expected 276). State `day` 46 (expected 46). Page sequences 33167–33366.

Dax Pike, `character-20`:

| Field | Expected | Observed |
| --- | --- | --- |
| `locationId` | `glassport` | `glassport` |
| `money` | null | null |
| `captivity` | null | null |

No `captivity-released` row is on this page. He is not an actor or a named recipient of one here.

Mara, the party:

| Field | Expected | Observed |
| --- | --- | --- |
| `party.locationId` | `crown-harbor` | `crown-harbor` |
| `party.hold.money` | 108 | 108 |

Factions:

| Field | Expected | Observed |
| --- | --- | --- |
| `world-government` `treasury` | 27132.81 | 27132.81 |
| `free-tide` `treasury` | null | null |

Sequence 13680 is not on this page (expected absent). Briefing `items` are `provision:critical`, `intel:verdant-cay:0`, and `intel:cinder-key:0`. No `event:13680` (expected absent).

`GET /api/state?limit=200&beforeSequence=13880` HTTP 200. Page sequences 13680–13879. Sequence 13680 is on that page. `payloadWithheld` true. `data` null. The summary is the sentence from checkpoint 1.

The three advance responses from tick 0 through 276 contain one `captivity-released` row, sequence 13680. Dax Pike is not that actor and is not named. That is the only ransom paid by state tick 276. He has not been released and has not been paid a share.

### Checkpoint 3 — Dax Pike's release, state tick 902

Each advance HTTP 200.

| Request | Expected tick | Observed tick | Observed day |
| --- | ---: | ---: | --- |
| `{"ticks":144}` | 420 | 420 | 70 |
| `{"ticks":144}` | 564 | 564 | 94 |
| `{"ticks":144}` | 708 | 708 | 118 |
| `{"ticks":144}` | 852 | 852 | 142 |
| `{"ticks":49}` | 901 | 901 | 150.17 |

`GET /api/state?limit=200` at state tick 901, `day` 150.17, before the last advance:

| Field | Expected | Observed |
| --- | --- | --- |
| Dax `captivity` | not null | null |
| Dax `locationId` | `glassport` | `glassport` |
| Dax `money` | null | null |
| `party.hold.money` | 473.02 | 473.02 |
| `world-government` `treasury` | 39969.99 | 39969.99 |

`captiveIntel` is present on his card: `settlementId` `glassport`, `observedTick` 817, `ageTicks` 84, `leadership` 68, `troops` 433, `partyPower` 397.082, `source` `direct`, `confidence` 1. `free-tide` `treasury` is null.

`POST /api/advance` `{"ticks":1}` HTTP 200. Advance `tick` 902 (expected 902). Advance `day` 150.33.

`GET /api/state?limit=200` HTTP 200. State `tick` 902 (expected 902). State `day` 150.33. Page sequences 118348–118547. Sequence 118405 is on this page.

| Field | Expected | Observed |
| --- | --- | --- |
| `type` | `captivity-released` | `captivity-released` |
| `actorId` | `character-20` | `character-20` |
| `tick` | 901 | 901 |
| `payloadWithheld` | true | true |
| `data` | null | null |
| `targetId` | (not specified) | `world-government` |
| `summary` | the Dax Pike sentence | the same sentence |

Summary, observed:

`Dax Pike was released from Glassport: 62.69 paid and 380.67 recorded as debt. Loyalty fell. Dax Pike paid 62.69 ransom: 31.35 to the World Government treasury and 31.34 to Mara Vane`

Recipients: the World Government treasury 31.35, Mara Vane 31.34. Sum 62.69. The odd cent is on the treasury share.

Briefing `id` `event:118405` (expected `event:118405`). Title `A captain was released` (expected `A captain was released`). Summary that same sentence.

Balances Mara can see:

| Field | Expected | Observed |
| --- | --- | --- |
| `party.hold.money` | 504.36 | 504.36 |
| Purse change from 473.02 | +31.34, and nothing else | +31.34 |
| `world-government` `treasury` | 40003.64 | 40003.64 |
| Dax `money` | null | null |
| Dax debt on Mara's card | not shown | Dax `debts` null; Mara `debts` `[]` |

The treasury change from 39969.99 to 40003.64 is 33.65, which is 31.35 plus 2.30. The response does not show the intermediate 40001.34, and no summary states 2.30. The four `settlement-upkeep` rows on that tick say `World: settlement upkeep`, with `data` null.

After the release, Dax `captivity` is null, `captiveIntel` is null, and `locationId` is null. `travel` is `glassport` to `cinder-key`, `totalTicks` 2, `remainingTicks` 1.

Stopped. No command.

## Findings

At state tick 901 the checkpoint said Dax Pike was still held and `captivity` was not null. The card's `captivity` was null. The hold was on `captiveIntel`: Glassport, observed tick 817, age 84, leadership 68, troops 433, party power 397.082. After the release both fields are null. The card shows the voyage to Cinder Key and no debt. The debt 380.67 is only in the sentence. The same tick's feed says `Dax Pike: travel progressed` with `data` null, so the route is on the card and not in that feed line.

Mara's purse rose by 31.34, matching the leader share. The World Government treasury rose by 33.65, from 39969.99 to 40003.64, while the ransom line names 31.35. Nothing she can read calls the other 2.30 tax. The upkeep rows are `World: settlement upkeep` with `data` null.

At state tick 119 Pax Ash's card showed `money` 51.58. Free Tide `treasury` was null, and his purse is not `party.hold.money` (108). The 6.7 shares are only on the sentence, with no before figure for that 51.58. At state tick 276 his `money` is null while `locationId` is still `glassport`.

## Verdict

PROMOTE

Sequence 13680's summary is the Sable Morrow sentence. Sequence 118405's summary is the Dax Pike sentence. Both titles are `A captain was released`. Dax Pike at state tick 276 has `captivity` null and `money` null at Glassport. Mara's purse at state tick 902 is 504.36. The World Government treasury at state tick 902 is 40003.64.

The tick-901 `captivity` null is in Findings. It is not a revise or abandon condition. Both lines keep the debt wording and "Loyalty fell". Each names two recipients. 6.7 + 6.7 = 13.4. 31.35 + 31.34 = 62.69. Mara's purse rose by 31.34 on the tick Dax was released. Both types are `captivity-released`. `actorId` on sequence 118405 is `character-20`. This session had no payment of 0.
