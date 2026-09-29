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

## Findings

## Verdict
