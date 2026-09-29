# Playtest plan: readability polish 2

This is the plan for a blind operator. It is not a completed session. Do not run it as part of writing the change. Do not open `src/`, `tests/`, the branch diff, or `docs/design/` during the session. Read this plan and `progress.md` only. Use only the dashboard HTTP JSON.

Three sessions, each its own process. No session sends a command. The sentences are derived when the state is read. No rule in the world changes.

## Setup

- Node `v24.21.0` (`nvm use 24.21.0` if `node -v` is not that). `npm ci` first if `node_modules` is missing.
- Branch `fix/readability-polish-2`. Record `git rev-parse HEAD` before the first request.
- One process per session. `npm run dashboard -- --reset --seed N` on `http://127.0.0.1:4317`. Stop that process before the next seed. Do not start a second dashboard.
- `GET /api/health` should be HTTP 200 `{"ok":true,"tick":0,"events":0}`.
- The player is already Mara Vane, `character-01`, faction `world-government`, `playerId` `prototype-player`. Do not pass another character. These sessions do not call `POST /api/commands`.
- Read state with `GET /api/state?limit=200`. Omit `beforeSequence` on the first read of a checkpoint. `events` is newest-first. A row is on the page when `eventPage.oldestSequence` ≤ sequence ≤ `eventPage.newestSequence`. If it is older, repeat with `beforeSequence` set to `eventPage.cursor` until it is on the page.
- `briefing.items` carries `title` and `summary`. A shown title is a sentence. It is not an event type and it does not contain `×`.
- Advance with `POST /api/advance`. Body `{"ticks":N}`. `N` is an integer from 1 to 144. HTTP 200. If `ticksAdvanced` is less than `N`, record `tick`, `combatUpdated`, and `attentionUpdated`, then continue from that tick. Do not skip a checkpoint. On these three paths the only planned early stop is session 2's last request.
- Characters are `characters[]`, matched by `id`. The World Government treasury is `factions[]` where `id` is `world-government`, field `treasury`.

## Hypothesis and ambition

**Hypothesis.** A withheld feed row is a sentence, not `Name: raw type`. The routine digest agrees with `completed` and with the number of rows. Held troop experience and discipline are rounded to three digits and the note says whose troops they are. Shown briefing titles are sentences. The loyalty note uses plain words and only the rounded figure. A release the feed already states is also on the released card as a debt, and on the leader's card as income. The ransom sentence says it covers only the ransom, and work at Crown Harbor names the tax that made up the rest of the treasury move.

**Ambition.** Session 1 reads the opening refusals and the digest. Session 2 reads Mina Vale's held card, the titles that fit on the check-in, and Mara's own captivity title. Session 3 reads the loyalty note, both release notes, and the tick-901 treasury.

## Session 1 — withheld sentences and the digest, seed 1847

A new process. `npm run dashboard -- --reset --seed 1847`. No commands.

### State tick 1

`POST /api/advance` `{"ticks":1}`. Advance `tick` 1. `ticksAdvanced` 1.

`GET /api/state?limit=200`. State `tick` 1. The page holds sequences 113 and 137. Do not page.

Sequence 113, actor `character-18`:

- `summary` is `Finn Frost refused an order.`
- `payloadWithheld` is true. `data` is null.
- The summary does not contain `explore` and does not contain `: standing order refused`.

Sequence 137, actor `character-22`:

- `summary` is `Bram Tern refused an order.`
- `payloadWithheld` is true. `data` is null.
- The summary does not contain `trade supplies`.

No `events[].summary` on this page is `Name: ` followed by the event type with hyphens turned into spaces. In particular, none is `Dax Pike: travel progressed` or `World: settlement upkeep`.

The check-in has one digest:

- `title` `Jun Marrow sent a routine digest.`
- `summary` `8 routine order updates: 8 accepted. No command decision is required.`
- The summary does not contain `confirmed` and does not contain `1 routine order updates`.

### State tick 12

`POST /api/advance` `{"ticks":11}`. Advance `tick` 12. `ticksAdvanced` 11.

`GET /api/state?limit=200`. State `tick` 12.

The digest is:

- `title` `Jun Marrow sent a routine digest.`
- `summary` `16 routine order updates: 8 accepted, 3 resumed, 5 completed. No command decision is required.`
- The summary does not contain `confirmed`.

An unplayed run does not show a one-row digest. The first digest already holds eight accepted orders. The one-row sentence, if a later session ever has a digest of one, is `1 routine order update: 1 completed. No command decision is required.` Do not fail this session because that row is absent.

Stop. No further request.

## Session 2 — held figures and titles, seed 2718

A new process. `npm run dashboard -- --reset --seed 2718`. No commands.

### State tick 72, Mina Vale

`POST /api/advance` `{"ticks":72}`. Advance `tick` 72. `ticksAdvanced` 72.

`GET /api/state?limit=200`. State `tick` 72.

Mina Vale (`character-15`):

- `troops.count` is 0.
- `troops.experience` is `0.199`.
- `troops.discipline` is `0.384`.
- Neither figure is `0.19867861845996232` or `0.3837455657846294`.
- `troopsNote` is `0 with Mina Vale; 12 held by World Government. The experience and discipline are the troops now held by World Government.`

### State tick 168, titles that fit

`POST /api/advance` `{"ticks":96}`. Advance `tick` 168. `ticksAdvanced` 96.

`GET /api/state?limit=200`. State `tick` 168.

- `briefing.attentionCount` is 12. `briefing.omittedInfoCount` is 8.
- One title is `An order was not followed, 2 times.`
- No title is `Character held captive`.
- No title is `Scattered troops returned ×2`.
- No title contains `×`.
- `Scattered troops came back, 2 times.` is not on this check-in. The info budget is full, so that title is one of the omitted background lines. Its absence is expected. A shown title that still says `Scattered troops returned` is not.

Page to these two feed rows. Both are withheld and `data` is null.

| Sequence | Tick | Summary |
| ---: | ---: | --- |
| 19221 | 161 | `Scattered troops returned to Mina Vale.` |
| 19987 | 167 | `Scattered troops returned to Mina Vale.` |

### State tick 1035, Mara held

From tick 168, six advances of `{"ticks":144}` land on 312, 456, 600, 744, 888, and 1032. Each `ticksAdvanced` is 144.

`POST /api/advance` `{"ticks":3}`. This one stops on her capture. Advance `tick` 1035. `ticksAdvanced` 3. `attentionUpdated` true. `combatUpdated` false.

`GET /api/state?limit=200`. State `tick` 1035. Mara's `captivity.settlementId` is `crown-harbor`.

The check-in item `captivity:1034`:

- `title` is `A captain is held captive.`
- `summary` begins `Held at Crown Harbor.`

Stop.

## Session 3 — loyalty, debt, and the tax, seed 1847

A new process. `npm run dashboard -- --reset --seed 1847`. No commands.

### State tick 119, Sable and Pax

`POST /api/advance` `{"ticks":119}`. Advance `tick` 119. `ticksAdvanced` 119.

`GET /api/state?limit=200`. State `tick` 119.

Sable Morrow (`character-04`):

- `debts` is null.
- `releaseDebtNote` is `Owes 103.21 from the release at Cinder Key.`

Pax Ash (`character-14`):

- `money` is `51.58`.
- `locationId` is `glassport`.
- `ransomIncomeNote` is `Received 6.7 from Sable Morrow's ransom at Cinder Key.`
- The note does not contain `51.58`.

### State tick 595, she is not held

From tick 119, three advances of `{"ticks":144}` land on 263, 407, and 551. Then `POST /api/advance` `{"ticks":44}`. Advance `tick` 595. `ticksAdvanced` 44.

`GET /api/state?limit=200`. State `tick` 595.

Mara Vane (`character-01`):

- `locationId` is `crown-harbor`.
- `captivity` is null.

No briefing title is `Character held captive`. No summary says she is held at Verdant Cay.

### State tick 679, the loyalty note

`POST /api/advance` `{"ticks":84}`. Advance `tick` 679. `ticksAdvanced` 84.

`GET /api/state?limit=200`. State `tick` 679.

Mara Vane (`character-01`):

- `loyalty` is `0.808`.
- `loyaltyNote` is `The seat reads 0.808. That rounded figure is the one the seat uses.`
- The note does not contain `personality`.
- The note does not contain `0.768`, `0.807927391717676`, or `0.767927391717676`.
- `personality.loyalty` on her card is still `0.807927391717676`.

### State tick 901, then 902

`POST /api/advance` `{"ticks":144}`. Advance `tick` 823. `ticksAdvanced` 144.

`POST /api/advance` `{"ticks":78}`. Advance `tick` 901. `ticksAdvanced` 78.

`GET /api/state?limit=200`. State `tick` 901. World Government `treasury` is `39969.99`.

`POST /api/advance` `{"ticks":1}`. Advance `tick` 902. `ticksAdvanced` 1.

`GET /api/state?limit=200`. State `tick` 902. World Government `treasury` is `40003.64`. The move from the tick-901 read is 33.65.

Dax Pike (`character-20`):

- `money` is null.
- `debts` is null.
- `releaseDebtNote` is `Owes 380.67 from the release at Glassport.`

Mara Vane (`character-01`):

- `money` is `504.36`.
- `ransomIncomeNote` is `Received 31.34 from Dax Pike's ransom at Glassport.`

Page until each sequence is on the page.

Sequence 118405, tick 901, `payloadWithheld` true, `data` null. `summary` is one line:

`Dax Pike was released from Glassport. 62.69 was paid and 380.67 was recorded as debt. Loyalty fell. Dax Pike paid 62.69 ransom: 31.35 to the World Government treasury and 31.34 to Mara Vane. The ransom line covers only the ransom.`

`details` is these five strings, in order:

1. `Dax Pike was released from Glassport.`
2. `62.69 was paid and 380.67 was recorded as debt.`
3. `Loyalty fell.`
4. `Dax Pike paid 62.69 ransom: 31.35 to the World Government treasury and 31.34 to Mara Vane.`
5. `The ransom line covers only the ransom.`

The ransom sentence names 31.35, not 33.65.

| Sequence | Summary | `payloadWithheld` | `data` |
| ---: | --- | --- | --- |
| 118498 | `Dax Pike continued toward Cinder Key.` | true | null |
| 118398 | `Cinder Key kept its stores.` | true | null |
| 118400 | `Crown Harbor kept its stores.` | false | not null |
| 118525 | `Iris Vale worked at Crown Harbor. Tax of 2.3 went to the treasury.` | true | null |
| 118502 | `Mara Calder worked at Glassport.` | true | null |

Sequence 118525 does not contain `16.46` or `139.32`. Sequence 118502 does not contain `1.17`. Crown Harbor is her port, so that tax is named. Glassport is not, so that tax is not.

31.35 plus 2.3 is the 33.65 the treasury moved. Stop.

## Session

## Findings

## Bars

`PROMOTE` if every string in the three sessions matches, withheld rows keep `data` null, Mina's experience is `0.199` and her discipline is `0.384`, tick 595 has Mara free at Crown Harbor, tick 679's note is only the rounded `0.808` in plain words, Dax and Sable carry the debt notes, Mara and Pax carry the ransom notes, sequence 118405 has the five detail lines, and the Crown Harbor row names `Tax of 2.3` while the ransom line still says `31.35`.

`REVISE` if a withheld summary is still `Name: ` plus a raw type, the digest says `confirmed` or `1 routine order updates`, a held troop figure still has more than three decimal places, a shown title is `Character held captive` or contains `×`, the loyalty note contains `personality`, a release card has no `releaseDebtNote`, a named leader has no `ransomIncomeNote`, sequence 118405 has no `details`, or the treasury moved by 33.65 while no row names the `2.3` tax.

`ABANDON` if a purse, a treasury, or a debt moved off this campaign: Pax `51.58`, Mara `504.36` at tick 902, World Government `40003.64`, Dax's debt `380.67`, Sable's debt `103.21`. Also abandon if a withheld refusal's `data` contains an order directive.

## Verdict
