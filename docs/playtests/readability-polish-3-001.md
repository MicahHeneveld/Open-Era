# Playtest plan: readability polish 3

This is the plan for a blind operator. It is not a completed session. Do not run it as part of writing the change. Do not open `src/`, `tests/`, the branch diff, or `docs/design/` during the session. Read this plan and `progress.md` only. Use only the dashboard HTTP JSON.

Two sessions, each its own process. No session sends a command. The sentences are derived when the state is read. No rule in the world changes.

The check-in is the last 180 world ticks (30 days; a day is 6 ticks), capped at 40,000 events. At seed 2718 tick 168 the log has 20,101 events and that window still reaches tick 0. Read sentences from `GET /api/state`. Do not grade the `events` array on `POST /api/advance`. That array only holds the ticks that request just ran.

## Setup

- Node `v24.21.0` (`nvm use 24.21.0` if `node -v` is not that). `npm ci` first if `node_modules` is missing.
- Branch `fix/readability-polish-3`. Record `git rev-parse HEAD` before the first request.
- One process per session. `npm run dashboard -- --reset --seed N` on `http://127.0.0.1:4317`. Stop that process before the next seed. Do not start a second dashboard. Do not pass `--player-character`.
- `GET /api/health` should be HTTP 200 `{"ok":true,"tick":0,"events":0}`.
- The player is already Mara Vane, `character-01`, faction `world-government`, `playerId` `prototype-player`. These sessions do not call `POST /api/commands`.
- Read state with `GET /api/state?limit=200`. Omit `beforeSequence` on the first read of a checkpoint. `events` is newest-first. A row is on the page when `eventPage.oldestSequence` ≤ sequence ≤ `eventPage.newestSequence`. If it is older, repeat with `beforeSequence` set to `eventPage.cursor` until it is on the page.
- `briefing.items` carries `title` and `summary`.
- Advance with `POST /api/advance`. Body `{"ticks":N}`. `N` is an integer from 1 to 144. HTTP 200. If `ticksAdvanced` is less than `N`, record `tick`, `combatUpdated`, and `attentionUpdated`, then continue from that tick. Do not skip a checkpoint. On these two paths no early stop is expected.
- Characters are `characters[]`, matched by `id`. `name` is the stored name. `displayName` is what the board shows when the two differ.

## Hypothesis and ambition

**Hypothesis.** The check-in no longer depends on the newest 5,000 events. A capture the reader is allowed to see names the troops and the power already on the captor row. A witnessed battle says why it was won or lost, in plain words, and does not say one captain took the port when the garrison is still standing. A surrender taken on the next tick says so. A withheld refusal says it was a standing order and names the captain's public place, not the directive. Toma Reef and Toma Hale are distinguished on the card and on withheld feed rows. The stored names stay.

**Ambition.** Session 1 reads the opening refusals, the two Tomas, the Cinder Key fights, and Pax Ash's loss. Session 2 reads Mina Vale's capture, then the tick-168 check-in.

## Session 1 — refusals, names, and battles, seed 1847

A new process. `npm run dashboard -- --reset --seed 1847`. No commands.

### State tick 1

`POST /api/advance` `{"ticks":1}`. Advance `tick` 1. `ticksAdvanced` 1. `combatUpdated` false. `attentionUpdated` false.

`GET /api/state?limit=200`. State `tick` 1. `eventPage.total` 182. `hasMore` false. `oldestSequence` 1. `newestSequence` 182. Do not page.

Sequence 113, actor `character-18`, event `tick` 0:

- `summary` is `Finn Frost refused a standing order. Finn Frost is sailing from Verdant Cay to Crown Harbor.`
- `payloadWithheld` is true. `data` is null.
- The summary does not contain `explore`.

Sequence 137, actor `character-22`, event `tick` 0:

- `summary` is `Bram Tern refused a standing order. Bram Tern is sailing from Verdant Cay to Glassport.`
- `payloadWithheld` is true. `data` is null.
- The summary does not contain `trade`.

Other refusal titles on this check-in may name a directive. Those are orders Mara issued. Do not fail the session because `Vale Drake refused the explore order after weighing loyalty, risk, and ambition.` is present.

Toma Reef (`character-07`):

- `name` is `Toma Reef`.
- `displayName` is `Toma Reef (World Government)`.
- `factionId` is `world-government`.

Toma Hale (`character-27`):

- `name` is `Toma Hale`.
- `displayName` is `Toma Hale (unaffiliated)`.
- `factionId` is null.

Mara Vane (`character-01`): `displayName` is `Mara Vane`.

Sequence 164, actor `character-27`:

- `summary` is `Toma Hale (unaffiliated) departed for Glassport.`
- `payloadWithheld` is true. `data` is null.

Sequence 43, actor `character-07`:

- `summary` is `Toma Reef accepted the trade supplies order.`
- `payloadWithheld` is false. `data` is not null.
- The summary does not contain `(World Government)`. That row is an order Mara can read. The stored sentence stays.

### State tick 71, Cinder Key

`POST /api/advance` `{"ticks":70}`. Advance `tick` 71. `ticksAdvanced` 70.

`GET /api/state?limit=200`. State `tick` 71. `eventPage.total` 8180. The first page is `oldestSequence` 7981, `newestSequence` 8180, `cursor` 7981, `hasMore` true.

Sequence 8079 is on that page. Actor `character-05`, event `tick` 70, type `settlement-claimed`:

- `summary` is `Jun Marrow claimed Cinder Key. The surrender was offered and taken on the next tick, so it was not waiting.`
- `payloadWithheld` is true. `data` is null.
- The summary does not contain `accepted`, `outscore`, or `nerve`.

`GET /api/state?limit=200&beforeSequence=7981`. That page is `oldestSequence` 7781, `newestSequence` 7980.

Sequence 7951, actor `character-03`, event `tick` 69:

- `summary` is `Niko Wren won the fight at Cinder Key on a higher score. 2 captains won a fight here on this tick: Niko Wren, Jun Marrow. This fight left the garrison standing.`
- `payloadWithheld` is true. `data` is null.
- The summary does not contain `outscore` or `nerve`.

Sequence 7959, actor `character-05`, event `tick` 69:

- `summary` is `Jun Marrow won the fight at Cinder Key on a higher score. 2 captains won a fight here on this tick: Niko Wren, Jun Marrow. This fight left the garrison standing. The surrender was taken on the next tick.`
- `payloadWithheld` is true. `data` is null.
- The summary does not contain `outscore` or `nerve`.

### State tick 340, Pax Ash

From tick 71, `POST /api/advance` `{"ticks":144}` lands on 215. `ticksAdvanced` 144.

`POST /api/advance` `{"ticks":125}` lands on 340. `ticksAdvanced` 125.

`GET /api/state?limit=200`. State `tick` 340. `eventPage.total` 41680. The first page is `oldestSequence` 41481, `newestSequence` 41680. Do not page.

Sequence 41612, actor `character-14`, event `tick` 339:

- `summary` is `Pax Ash lost the fight at Crown Harbor because morale gave out, on a lower score.`
- `payloadWithheld` is true. `data` is null.
- The summary does not contain `nerve` or `outscore`.

Stop. No further request.

## Session 2 — captured troops and the check-in, seed 2718

A new process. `npm run dashboard -- --reset --seed 2718`. No commands.

### State tick 72, Mina Vale

`POST /api/advance` `{"ticks":72}`. Advance `tick` 72. `ticksAdvanced` 72. `combatUpdated` false. `attentionUpdated` false.

`GET /api/state?limit=200`. State `tick` 72. `eventPage.total` 8513. The first page is `oldestSequence` 8314, `newestSequence` 8513. Do not page.

Mina Vale (`character-15`):

- `troops.count` is 0.
- `captivity.settlementId` is `crown-harbor`.
- `captivity.cause` is `failed-retreat`.
- `captiveIntel.troops` is 12.
- `captiveIntel.partyPower` is `60.244`.

Sequence 8402, actor `character-15`, event `tick` 71, type `character-captured`:

- `summary` is `World Government took Mina Vale at Crown Harbor after failed retreat. 12 troops were taken, power 60.244.`
- `payloadWithheld` is true. `data` is null.

The check-in item `event:8402`:

- `title` is `A captain was taken`.
- `summary` is the same sentence as sequence 8402, including `12 troops were taken, power 60.244.`

`briefing.attentionCount` is 11. `briefing.omittedInfoCount` is 7.

### State tick 168, the month window

`POST /api/advance` `{"ticks":96}`. Advance `tick` 168. `ticksAdvanced` 96.

`GET /api/state?limit=200`. State `tick` 168. `eventPage.total` 20101.

- `briefing.attentionCount` is 12.
- `briefing.omittedInfoCount` is 8.
- `briefing.shownCount` is 12.
- `briefing.attentionLabel` is `Check-in · 12 need attention`.

The titles, in order:

1. `The party is starving`
2. `Intelligence is stale`
3. `Intelligence is stale`
4. `A captain was released`
5. `A captain was taken`
6. `A battle was decided`
7. `An order was not followed, 2 times.`
8. `An order was refused`
9. `An order was refused`
10. `An order was not followed.`
11. `An order was refused`
12. `An order was refused`

`A captain was taken` on this check-in has summary `World Government took Mina Vale at Crown Harbor after failed retreat`. It does not contain `12 troops` or `60.244`. She has been released, so the captor row no longer carries those figures. The tick-72 sentence is the one that names them.

`An order was not followed, 2 times.` is present. Stop.

## Criteria

`PROMOTE` when every listed tick, `ticksAdvanced`, page bound, sentence, title, attention count, omitted count, `displayName`, `payloadWithheld`, and `data` value matches.

`REVISE` when the dashboard answers, but a listed sentence, title, count, page bound, or name differs.

`ABANDON` when sequence 113 or 137 names `explore` or `trade`, or when a row this plan marks `payloadWithheld` true has non-null `data`, or when sequence 8402 names `12 troops` or `60.244` while `payloadWithheld` is false.

## Session

## Findings

## Verdict
