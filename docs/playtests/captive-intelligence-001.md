# Playtest plan: captive intelligence

This is the plan for a blind operator. It is not a completed session. Do not run it as part of writing the change. Do not open `src/`, `tests/`, the branch diff, or `docs/design/` during the session. Use only the dashboard HTTP JSON.

One session. One process. Seed 2718. Mara Vane gives no order. She starts at Crown Harbor and is still there at tick 72 and at tick 156. The captor row is not an event. It is on Mina Vale's character read.

## Setup

- Node `v24.21.0` (`nvm use 24.21.0` if `node -v` is not that). `npm ci` first if `node_modules` is missing.
- Branch `feature/captive-intelligence`. The reading code is `34d8de9`. Record `git rev-parse HEAD` before the first request. A docs-only commit on top of `34d8de9` is the same build.
- One process. `npm run dashboard -- --reset --seed 2718` on `http://127.0.0.1:4317`. Do not start a second seed.
- `GET /api/health` should be HTTP 200 `{"ok":true,"tick":0,"events":0}`.
- The player is already Mara Vane, `character-01`, `playerId` `prototype-player`. Do not pass another character. Do not `POST /api/commands`.
- Read state with `GET /api/state?limit=200`. Omit `beforeSequence` on the first read of a checkpoint. The `events` array is newest-first. Find a checkpoint by its `sequence`. If that sequence is below `eventPage.oldestSequence`, the fallback is `GET /api/state?limit=200&beforeSequence=<eventPage.cursor>`. Both checkpoints in this plan are on the first page. The fallback was not needed.
- `briefing.items` carries the outcome sentence, in `summary`. Quote that sentence. A withheld feed row is not where the captured troop count lives. Sequence 8402 is Mina Vale's `character-captured`, summary `Mina Vale: character captured`, payload withheld. Her 12 troops are on `captiveIntel`, not on that event.
- Advance with `POST /api/advance`. Body `{"ticks":N}`. `N` is an integer from 1 to 144. This plan uses 72, then 84.
- `tick` on an event is the tick the world was on while that event was written. `tick` on the state is one ahead of the events just applied. Advance `day` is unrounded. State `day` is rounded to two places. `12` on the first advance and `12` on the state read are the same tick. The second advance returns day `26`.

The hold checkpoint is state tick 72. The release checkpoint is state tick 156.

## Hypothesis and ambition

**Hypothesis.** With no order from Mara, World Government's reading of Mina Vale at tick 72 is the strength Mina had when she was taken, her live power stays 0, and that reading is gone once she is released.

**Ambition.** `POST /api/advance` with `ticks` 72. `GET /api/state`. Read Mina Vale (`character-15`). Advance 84 more ticks, to tick 156, and read her again.

**What you can see.** On a prisoner Mara's faction holds, `captiveIntel`: leadership, the troop count from the capture, the party power that count gives, and `ports`. Live `troops.count` stays 0 and live `partyPower` stays 0 while she is held beside them. Not her orders, her purse, or a live garrison. Not a row for a prisoner someone else holds. After release, `captiveIntel` is null. `releaseSighting` on Mina, read through Mara, is null. Mara's own character has no `releaseSighting`.

## Characters

| Name | Id | What to watch |
| --- | --- | --- |
| Mara Vane | `character-01` | The player. Her faction holds Mina. Her own `releaseSighting` stays null. |
| Mina Vale | `character-15` | The prisoner. The captor row is on her character. |

## State tick 0

`GET /api/health`. HTTP 200.

```json
{"ok":true,"tick":0,"events":0}
```

`GET /api/state?limit=200`. HTTP 200.

Mara's `locationId` is `crown-harbor`. Her `travel` is null. Mina's `captiveIntel` is null. Mara's `releaseSighting` is null. Mina's `releaseSighting` is null.

`player.displayName` staying `Prototype Commander` is already an open readability item. It is not a failure of this session.

## Advance to tick 72

`POST /api/advance`. HTTP 200.

```json
{"ticks":72}
```

The response has `tick` 72, `day` 12, `ticksAdvanced` 72, and `eventSequence` 8513.

`GET /api/state?limit=200`. HTTP 200. State `tick` is 72. State `day` is 12.

`eventPage` is `count` 200, `total` 8513, `hasMore` true, `oldestSequence` 8314, `newestSequence` 8513, `cursor` 8314.

Sequence 8402 is on that page. Type `character-captured`. Actor `character-15`. Target `world-government`. Settlement `crown-harbor`. Summary `Mina Vale: character captured`. `payloadWithheld` true. `data` is null.

`briefing.items` includes `event:8402`. Its `summary` is `Mina Vale was captured at Crown Harbor after failed retreat`. That sentence is the outcome text. The feed row is the shorter one, because the payload is withheld.

`briefing.attentionCount` is 4 and `briefing.items` has 10 lines. That mismatch is already an open readability item. It is not a failure of this session.

## State tick 72

Mara Vane (`character-01`):

- `locationId` `crown-harbor`
- `travel` null
- `captiveIntel` null
- `releaseSighting` null

Mina Vale (`character-15`):

- `locationId` `crown-harbor`
- `travel` null
- `troops.count` 0
- `partyPower` 0
- `money` 110.08
- `captivity.scatteredTroops.count` 12
- `captivity.capturedTick` 71
- `captivity.captorFactionId` `world-government`
- `captivity.settlementId` `crown-harbor`
- `captivity.cause` `failed-retreat`
- `releaseSighting` null

`captiveIntel`:

| Field | Value |
| --- | --- |
| `characterId` | `character-15` |
| `factionId` | `free-tide` |
| `archetype` | `steward` |
| `settlementId` | `crown-harbor` |
| `leadership` | 25 |
| `troops` | 12 |
| `partyPower` | 60.244 |
| `observedTick` | 71 |
| `ageTicks` | 1 |
| `source` | `direct` |
| `confidence` | 1 |
| `ports` | `[]` |

The 12 on the row is not the live `troops.count`. The live count is 0, and the live `partyPower` is 0.

Crown Harbor's settlement `garrison` on this read is 223. Cinder Key is 7. Glassport is 7. None of those three numbers is on `captiveIntel`. The string `110.08` is Mina's `money` and is not inside `captiveIntel`.

Mina is the only character whose `captiveIntel` is not null.

## Advance to tick 156

`POST /api/advance`. HTTP 200.

```json
{"ticks":84}
```

The response has `tick` 156, `day` 26, `ticksAdvanced` 84, and `eventSequence` 18597.

`GET /api/state?limit=200`. HTTP 200. State `tick` is 156. State `day` is 26.

`eventPage` is `count` 200, `total` 18597, `hasMore` true, `oldestSequence` 18398, `newestSequence` 18597, `cursor` 18398.

Sequence 18482 is on that page. Type `captivity-released`. Actor `character-15`. Target `world-government`. Settlement `crown-harbor`. Summary `Mina Vale: captivity released`. `payloadWithheld` true. `data` is null.

`briefing.items` includes `event:18482`. Its `summary` is `Mina Vale was released from Crown Harbor: 58.13 paid and 0 recorded as debt`. That sentence is the outcome text. The paid amount is not on the feed row.

Sequence 8402 is not on this page. It is below `oldestSequence` 18398. Do not page for it. The hold was already read.

## State tick 156

Mara is still at `crown-harbor` with `travel` null. Her `releaseSighting` is null.

Mina Vale:

- `captivity` null
- `captiveIntel` null
- `releaseSighting` null
- `troops` null
- `partyPower` null
- `money` null
- `locationId` null
- `travel.fromId` `crown-harbor`
- `travel.toId` `glassport`
- `travel.totalTicks` 3
- `travel.remainingTicks` 2

The release record is not on Mara's reading of Mina. That null is the boundary. Do not look for the garrison 208 on this response. It is not on the wire for this player.

## Findings

Leave the played findings blank until the session. These are the boundaries the session is there to see:

- The captured 12 is on `captiveIntel` and is not written into live `troops`.
- `ports` is empty. Cinder Key and Glassport, both garrison 7, are not on the row. Crown Harbor's live garrison 223 is not on the row either.
- Mina's money 110.08 is on her character, because Mara is standing next to her, and it is not inside `captiveIntel`.
- The feed row for the capture does not carry the troop count. The briefing sentence does not either. The count is the character read.
- After release, `captiveIntel` is null, and `releaseSighting` stays null on both characters in this player's state.

Do not mark this file `PROMOTE` until a blind operator has run it.

`PROMOTE` if tick 72 shows 60.244 on the captor row, the live power stays 0, the port list is empty, and tick 156 has no captor row. The same bar includes the boundaries above: sequence 8402 withheld on the first page, sequence 18482 withheld on the second page, the briefing sentences quoted above, and Mina's travel `crown-harbor` → `glassport` with 2 of 3 left.

`REVISE` if the row's `observedTick` moves during the hold with no new capture, or if Cinder Key's live garrison appears on the port list.

`ABANDON` if tick 72 does not show Mina captive at Crown Harbor under World Government. That capture is sequence 8402. A miss means this seed no longer makes it.

## Session

Blind operator. One process. No `POST /api/commands`. No `beforeSequence` page. The fallback was not needed: sequence 8402 was on the tick-72 page, and sequence 18482 was on the tick-156 page.

`git rev-parse HEAD` before the first request: `7286e3189eaf6050822590c2e5be569dd539af83`. Branch `feature/captive-intelligence`. The plan names reading code `34d8de9`. This session did not inspect history. Node `v24.21.0` (`nvm` 24.21.0). The image `node` on `PATH` was `v22.14.0` at `/exec-daemon/node`, so the session put the nvm bin first. `npm ci` because `node_modules` was missing. Then `npm run dashboard -- --reset --seed 2718` on `http://127.0.0.1:4317`.

### Tick 0

`GET /api/health` HTTP 200.

```json
{"ok":true,"tick":0,"events":0}
```

`GET /api/state?limit=200` HTTP 200. State `tick` 0, `day` 0. `eventPage` count 0, total 0, hasMore false, oldestSequence null, newestSequence null, cursor null. `events` length 0.

`player.id` `prototype-player`, `player.characterId` `character-01`, `player.displayName` `Prototype Commander`.

Mara Vane (`character-01`): `locationId` `crown-harbor`, `travel` null, `captiveIntel` null, `releaseSighting` null.

Mina Vale (`character-15`): `captiveIntel` null, `releaseSighting` null. Also on this read, and not named by the plan: `locationId` `cinder-key`, `travel` null, `troops` null, `partyPower` null, `money` null, `captivity` null.

No character had a non-null `captiveIntel`. No character had a non-null `releaseSighting`.

### Advance to tick 72

`POST /api/advance` HTTP 200. Body `{"ticks":72}`.

Response scalars: `ok` true, `tick` 72, `day` 12, `ticksAdvanced` 72, `eventSequence` 8513. Flags on that body: `combatUpdated` false, `attentionUpdated` false, `pausedForBattle` false.

`GET /api/state?limit=200` HTTP 200. State `tick` 72, `day` 12.

`eventPage`: `count` 200, `total` 8513, `hasMore` true, `oldestSequence` 8314, `newestSequence` 8513, `cursor` 8314. The `events` array is newest-first, 8513 down to 8314.

Sequence 8402 is on that page:

| Field | Observed |
| --- | --- |
| `sequence` | 8402 |
| `tick` | 71 |
| `day` | 11.83 |
| `type` | `character-captured` |
| `actorId` | `character-15` |
| `targetId` | `world-government` |
| `settlementId` | `crown-harbor` |
| `summary` | `Mina Vale: character captured` |
| `payloadWithheld` | true |
| `data` | null |

`briefing.attentionCount` 4. `briefing.items` length 10. Item `event:8402` summary: `Mina Vale was captured at Crown Harbor after failed retreat`. That item's `day` is 11.83, `characterId` `character-15`, `settlementId` `crown-harbor`. The string `12` and the string `60.244` are not in any briefing summary on this page, and they are not in the feed summary.

The other nine briefing summaries on this page:

1. `The hold is empty and 0.492 provisions per tick cannot be found. That costs health 0.394 and morale 1.181 per tick. Morale gains nothing while the shortage lasts, so it will not recover on its own. Crown Harbor is alongside and sells provisions.`
2. `Verdant Cay's report predates your arrival and has never been refreshed.`
3. `Cinder Key's report predates your arrival and has never been refreshed.`
4. `1 routine order updates: 1 confirmed. No command decision is required.`
5. `Esme Dusk accepted Glassport's surrender and established a claim`
6. `Mina Vale accepted Cinder Key's surrender and established a claim`
7. `Vale Drake accepted Cinder Key's surrender and established a claim`
8. `Vale Drake won at Cinder Key`
9. `Sable Morrow won at Cinder Key`

Mara Vane (`character-01`): `locationId` `crown-harbor`, `travel` null, `captiveIntel` null, `releaseSighting` null.

Mina Vale (`character-15`):

| Field | Observed |
| --- | --- |
| `locationId` | `crown-harbor` |
| `travel` | null |
| `troops.count` | 0 |
| `troops.experience` | 0.19867861845996232 |
| `troops.discipline` | 0.3837455657846294 |
| `partyPower` | 0 |
| `money` | 110.08 |
| `captivity.scatteredTroops.count` | 12 |
| `captivity.capturedTick` | 71 |
| `captivity.captorFactionId` | `world-government` |
| `captivity.settlementId` | `crown-harbor` |
| `captivity.cause` | `failed-retreat` |
| `releaseSighting` | null |

Also on `captivity`, not listed as expected values: `mandatoryReleaseTick` 155, `displayedRisk` `high`, `releaseDestinationId` `glassport`, and `scatteredTroops` experience and discipline equal to the live troop experience and discipline above.

`captiveIntel` (Mina is the only character whose row is not null):

| Field | Observed |
| --- | --- |
| `characterId` | `character-15` |
| `factionId` | `free-tide` |
| `archetype` | `steward` |
| `settlementId` | `crown-harbor` |
| `leadership` | 25 |
| `troops` | 12 |
| `partyPower` | 60.244 |
| `observedTick` | 71 |
| `ageTicks` | 1 |
| `source` | `direct` |
| `confidence` | 1 |
| `ports` | `[]` |

The string `110.08` is not inside `captiveIntel`. The string `223` is not inside `captiveIntel`.

Settlement `garrison` on this same read:

| Settlement | `garrison` | `garrisonIntelligence` |
| --- | --- | --- |
| Crown Harbor | 223 | `source` `owned`, `observedTick` 72, `ageTicks` 0 |
| Cinder Key | 131 | `source` `rumor`, `observedTick` 0, `ageTicks` 91 |
| Glassport | 138 | `source` `faction-report`, `observedTick` 0, `ageTicks` 95 |

No second sample was taken during the hold. The plan's only hold read is this one. `observedTick` is 71, the same as `captivity.capturedTick`. `ageTicks` is 1.

### Advance to tick 156

`POST /api/advance` HTTP 200. Body `{"ticks":84}`.

Response scalars: `ok` true, `tick` 156, `day` 26, `ticksAdvanced` 84, `eventSequence` 18597. Flags: `combatUpdated` false, `attentionUpdated` false, `pausedForBattle` false.

`GET /api/state?limit=200` HTTP 200. State `tick` 156, `day` 26.

`eventPage`: `count` 200, `total` 18597, `hasMore` true, `oldestSequence` 18398, `newestSequence` 18597, `cursor` 18398. Newest-first, 18597 down to 18398. Sequence 8402 is not on this page. It was not paged.

Sequence 18482 is on this page:

| Field | Observed |
| --- | --- |
| `sequence` | 18482 |
| `tick` | 155 |
| `day` | 25.83 |
| `type` | `captivity-released` |
| `actorId` | `character-15` |
| `targetId` | `world-government` |
| `settlementId` | `crown-harbor` |
| `summary` | `Mina Vale: captivity released` |
| `payloadWithheld` | true |
| `data` | null |

`briefing.attentionCount` 4. `briefing.items` length 4. Item `event:18482` summary: `Mina Vale was released from Crown Harbor: 58.13 paid and 0 recorded as debt`. That item's `day` is 25.83. The feed summary does not contain `58.13`.

The other three briefing summaries:

1. `The hold is empty and 0.492 provisions per tick cannot be found. That costs health 0.394 and morale 1.181 per tick. Morale gains nothing while the shortage lasts, so it will not recover on its own. Crown Harbor is alongside and sells provisions.`
2. `Verdant Cay's report predates your arrival and has never been refreshed.`
3. `Cinder Key's report predates your arrival and has never been refreshed.`

Mara Vane: `locationId` `crown-harbor`, `travel` null, `captiveIntel` null, `releaseSighting` null. `player.displayName` is still `Prototype Commander`.

Mina Vale:

| Field | Observed |
| --- | --- |
| `captivity` | null |
| `captiveIntel` | null |
| `releaseSighting` | null |
| `troops` | null |
| `partyPower` | null |
| `money` | null |
| `locationId` | null |
| `travel.fromId` | `crown-harbor` |
| `travel.toId` | `glassport` |
| `travel.totalTicks` | 3 |
| `travel.remainingTicks` | 2 |

No character had a non-null `captiveIntel`. No character had a non-null `releaseSighting`. No character had a non-null `captivity`.

## Findings

### Matches

Tick 0 health is the expected body. Mara is at Crown Harbor with `travel` null. Both `captiveIntel` and both `releaseSighting` values are null.

The first advance returns `tick` 72, `day` 12, `ticksAdvanced` 72, `eventSequence` 8513. State tick and day match. The event page matches `count` 200, `total` 8513, `hasMore` true, `oldestSequence` 8314, `newestSequence` 8513, `cursor` 8314.

Sequence 8402 is `character-captured`, actor `character-15`, target `world-government`, settlement `crown-harbor`, summary `Mina Vale: character captured`, `payloadWithheld` true, `data` null. The briefing sentence is `Mina Vale was captured at Crown Harbor after failed retreat`. `attentionCount` is 4 and `briefing.items` has 10 lines.

At state tick 72 Mara is still at Crown Harbor, not traveling, with null `captiveIntel` and null `releaseSighting`. Mina is at Crown Harbor, not traveling, live `troops.count` 0, live `partyPower` 0, `money` 110.08, scattered troops 12, captured at tick 71 by `world-government` at Crown Harbor for `failed-retreat`, `releaseSighting` null. The captor row is troops 12, party power 60.244, leadership 25, `observedTick` 71, `ageTicks` 1, source `direct`, confidence 1, ports `[]`. She is the only character with a captor row. `110.08` is not inside the row. Crown Harbor garrison 223 is not inside the row.

The second advance returns `tick` 156, `day` 26, `ticksAdvanced` 84, `eventSequence` 18597. State tick and day match. The event page matches `count` 200, `total` 18597, `hasMore` true, `oldestSequence` 18398, `newestSequence` 18597, `cursor` 18398.

Sequence 18482 is `captivity-released`, actor `character-15`, target `world-government`, settlement `crown-harbor`, summary `Mina Vale: captivity released`, `payloadWithheld` true, `data` null. The briefing sentence is `Mina Vale was released from Crown Harbor: 58.13 paid and 0 recorded as debt`.

At state tick 156 Mara is still at Crown Harbor with null travel and null `releaseSighting`. Mina's `captivity`, `captiveIntel`, and `releaseSighting` are null. Her live troops, power, money, and location are null. Travel is `crown-harbor` → `glassport`, 3 total, 2 remaining. No release record is visible on either character.

The captured 12 stays on `captiveIntel` and is not written into live `troops.count`. Live power stays 0 beside row power 60.244. The port list is empty, so Cinder Key and Glassport are not on the row, and Crown Harbor's 223 is not on the row. The feed row and the briefing sentence do not carry the troop count. After release the captor row is gone, and this player's reading of Mina has no release record.

`observedTick` at the one hold sample is 71, the capture tick. It was not seen to move. The plan does not take another sample during the hold.

### Mismatches

Settlement `garrison` at tick 72 is Crown Harbor 223, which matches, and Cinder Key 131 and Glassport 138, where the plan names 7 and 7. Cinder Key's 131 is labeled `garrisonIntelligence.source` `rumor`, `observedTick` 0, `ageTicks` 91. Glassport's 138 is `faction-report`, `observedTick` 0, `ageTicks` 95. Those two numbers are not on `captiveIntel.ports`, which is `[]`. This is not the revise trigger. The revise trigger is Cinder Key's live garrison appearing on the port list.

Nothing else in the named checkpoints disagreed with the plan. Extra captivity fields were present (`mandatoryReleaseTick` 155, `displayedRisk` `high`, `releaseDestinationId` `glassport`). The plan did not forbid them.

### Player-facing notes

While Mina is held, one card shows three troop figures: live `troops.count` 0, `captivity.scatteredTroops.count` 12, and `captiveIntel.troops` 12 with `partyPower` 60.244. Live `partyPower` is 0, but live experience and discipline are still filled (the same figures as the scattered troops). The feed and the briefing never say 12 or 60.244, so a player who reads only those sentences never learns the captured strength. The row is there, and nothing points at it.

The capture feed line is `Mina Vale: character captured`. She is the actor and World Government is only `targetId`. The line does not say who took her. The briefing adds the place and `after failed retreat`, and still does not name the captor.

The release feed line is `Mina Vale: captivity released`. The paid 58.13 and the 0 debt are only in the briefing. After that, her card has no location, no troops, no power, no money, no captivity, no captor row, and no release record. The only lasting trace on this player's screen, besides the briefing sentence, is the voyage Crown Harbor to Glassport with 2 of 3 ticks left.

`captiveIntel.ports` is an empty array on a row whose `source` is `direct` and whose `confidence` is 1. It reads as a finished reading with no ports, which is what this seed is supposed to show. It does not read as a withheld list.

`attentionCount` 4 against 10 briefing lines at tick 72 is the open readability item the plan already sets aside. At tick 156 the count and the list are both 4. `player.displayName` stays `Prototype Commander` at ticks 0, 72, and 156.

Cinder Key's garrison label is a tick-0 rumor whose `ageTicks` is 91 at world tick 72, and Glassport's is a tick-0 faction report whose `ageTicks` is 95. Both ages are older than the world. The briefing already says Cinder Key's report predates arrival. That labeling is confusing next to a field simply called `garrison`, and it is why the 7 the plan names is not the number on the wire. It is separate from the captor row.

## Verdict

PROMOTE

Tick 72 shows 60.244 on the captor row, live power 0, and an empty port list. Tick 156 has no captor row. Sequence 8402 is withheld on the first page. Sequence 18482 is withheld on the second page. Both briefing sentences match. Mina's travel is `crown-harbor` → `glassport` with 2 of 3 left. `observedTick` did not move off the capture tick at the hold sample, and Cinder Key's garrison is not on the port list, so neither revise trigger fired. Tick 72 does show Mina captive at Crown Harbor under World Government, so this is not abandon. The garrison numbers 131 and 138, where the plan names 7 and 7, are recorded above and do not fail that bar.
