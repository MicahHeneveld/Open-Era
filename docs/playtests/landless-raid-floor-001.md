# Playtest plan: landless raid floor

This is the plan for a blind operator. It is not a completed session. Do not run it while writing the change. Do not open `src/`, `tests/`, the branch diff, or `docs/design/portless-recovery.md` during the session. Use only the dashboard HTTP JSON.

The raid-floor effect shows on seed 2718, inside the first 40 ticks. Seed 1847 does not show it until event tick 79, so 1847 is only the silent-order beat.

## Setup

- Node `v24.21.0` (`nvm use 24.21.0` if `node -v` is not that). `npm ci` first if `node_modules` is missing.
- The player is Mara Vane, `character-01`, `playerId` `prototype-player`. Do not pass another character. This plan sends no commands.
- Read state with `GET /api/state?limit=200`. Omit `beforeSequence` on the first read. The next older page is `GET /api/state?limit=200&beforeSequence=<eventPage.cursor>`.
- Advance with `POST /api/advance`. `ticks` must be an integer from 1 to 144.
- `tick` on an event is the tick the world was on while that event was written. `tick` on the state is one ahead of the events just applied.

Two sessions. Stop the dashboard between them.

## Session A — a silently closed order

**Start:** `npm run dashboard -- --reset --seed 1847` on `http://127.0.0.1:4317`.

`GET /api/health` is HTTP 200 `{"ok":true,"tick":0,"events":0}`.

**Hypothesis.** An order Mara never signs closes itself, and the card does not call that a confirmation.

**Ambition.** Send no commands. Advance to state tick 7. Read Toma Reef's order.

### Advance to state tick 6

`POST /api/advance` with body `{"ticks":6}`. HTTP 200. `tick` 6. `ticksAdvanced` 6.

`GET /api/state?limit=200`.

- `tick` 6. `party.name` `Mara Vane`. `party.locationId` `crown-harbor`. `player.characterId` `character-01`.
- Toma Reef, `character-07`, order `character-01:order:character-07`: `status` `awaiting-confirmation`. `lastReport.kind` `completion`. `lastReport.tick` 0. `lastReport.summary` `Toma Reef reports the supply transaction at Cinder Key complete and requests confirmation.`

### Advance to state tick 7

`POST /api/advance` with body `{"ticks":1}`. HTTP 200. `tick` 7. `ticksAdvanced` 1.

`GET /api/state?limit=200`.

The first page holds sequences 626 through 825 (`eventPage.oldestSequence` 626, `eventPage.newestSequence` 825, `eventPage.count` 200, `eventPage.total` 825). Sequence 713 is on this page.

- Toma's order `status` `completed`. `lastReport.kind` `closed-unanswered`. `lastReport.tick` 6. `lastReport.summary` `Mara Vane did not answer Toma Reef's completion report within a day, and the order closed.`
- Sequence 713, event `tick` 6, `day` 1, `standing-order-completed`, `actorId` `character-01`, `targetId` `character-07`, `payloadWithheld` false, summary `Mara Vane did not answer Toma Reef's completion report within a day, and the order closed.` `data.orderId` `character-01:order:character-07`. `data.reason` `issuer-silent`. `data.summary` that same sentence. No `commandId` key.
- Sequence 714, `relationship-changed`, `actorId` `character-07`, `targetId` `character-01`, `payloadWithheld` true, `data` null, summary `Toma Reef: relationship changed`.
- `briefing.items` has no item whose `orderId` is `character-01:order:character-07`.

**Withheld here.** Sequence 714's relationship payload. Do not treat `data` null on that line as a failed run.

`PROMOTE` this session if Toma's card at state tick 7 has `lastReport.kind` `closed-unanswered` and the summary above, and sequence 713 has `data.reason` `issuer-silent`. `REVISE` if the kind is `confirmed`, or if the order is `completed` already at state tick 6. `ABANDON` if sequence 713 is absent.

## Session B — the landless raid floor

**Start:** `npm run dashboard -- --reset --seed 2718` on `http://127.0.0.1:4317`.

`GET /api/health` is HTTP 200 `{"ok":true,"tick":0,"events":0}`.

**Hypothesis.** Free Tide loses Cinder Key and takes it back the next day with 6 soldiers left, not 0. One Free Tide captain fights. The other three on that beach do not.

**Ambition.** Send no commands. Stay at Crown Harbor. Read the log and the Cinder Key panel at state ticks 36, 37, and 40.

The note's older playtest text put Vale Drake's loss and Mina Vale's raid on one tick and called the claim garrison 14. On this build Vale's battle is event tick 34, his claim is event tick 35, Mina's raid is that same claim tick, and her claim is event tick 36. The panel can show the 6 soldiers only while the port is still World Government.

### Advance to state tick 36

`POST /api/advance` with body `{"ticks":36}`. HTTP 200. `tick` 36. `ticksAdvanced` 36. `day` 6.

`GET /api/state?limit=200`.

- `tick` 36. `day` 6. `party.name` `Mara Vane`. `party.locationId` `crown-harbor`.
- First page: `eventPage.count` 200, `eventPage.total` 4268, `eventPage.oldestSequence` 4069, `eventPage.newestSequence` 4268, `eventPage.cursor` 4069, `eventPage.hasMore` true.
- Cinder Key, `cinder-key`: `factionId` `world-government`, `ownerId` `character-08`, `garrison` 6, `stability` 43. `intelligence.exact` true, `intelligence.present` false, `intelligence.source` `owned`, `intelligence.confidence` 1, `intelligence.observedTick` 36, `intelligence.ageTicks` 0. `garrisonIntelligence.source` `owned`, `garrisonIntelligence.observedTick` 36, `garrisonIntelligence.ageTicks` 0.
- Sequence 4182, event `tick` 35, `day` 5.83, `settlement-claimed`, `actorId` `character-08`, `targetId` `free-tide`, `settlementId` `cinder-key`, `payloadWithheld` true, `data` null, summary `Vale Drake: settlement claimed`.
- Sequence 4205, event `tick` 35, `day` 5.83, `battle-resolved`, `actorId` `character-15`, `targetId` `world-government`, `settlementId` `cinder-key`, `payloadWithheld` true, `data` null, summary `Mina Vale: battle resolved`.
- That is the only `battle-resolved` event with `settlementId` `cinder-key` and event `tick` 35.
- Sequence 4221, `decision-made`, `actorId` `character-19`, summary `Esme Dusk: decision made`, `payloadWithheld` true, `data` null. No `battle-resolved` for `character-19` at event tick 35.
- Sequence 4227, `decision-made`, `actorId` `character-20`, summary `Dax Pike: decision made`, `payloadWithheld` true, `data` null. No `battle-resolved` for `character-20` at event tick 35.
- Sequence 4232, `decision-made`, `actorId` `character-21`, summary `Mara Calder: decision made`, `payloadWithheld` true, `data` null. No `battle-resolved` for `character-21` at event tick 35.

Vale's battle is one page older. `GET /api/state?limit=200&beforeSequence=4069`.

- That page includes sequence 4060, event `tick` 34, `day` 5.67, `battle-resolved`, `actorId` `character-08`, `targetId` `free-tide`, `settlementId` `cinder-key`, `payloadWithheld` true, `data` null, summary `Vale Drake: battle resolved`.

### Advance to state tick 37

`POST /api/advance` with body `{"ticks":1}`. HTTP 200. `tick` 37. `ticksAdvanced` 1.

`GET /api/state?limit=200`.

- Sequence 4331 is on the first page. Event `tick` 36, `day` 6, `settlement-claimed`, `actorId` `character-15`, `targetId` `world-government`, `settlementId` `cinder-key`, `payloadWithheld` true, `data` null, summary `Mina Vale: settlement claimed`.
- Cinder Key is no longer an owned reading. `factionId` `free-tide`, `garrison` 131, `stability` null, `ownerId` null. `intelligence.exact` false, `intelligence.present` false, `intelligence.source` `rumor`, `intelligence.confidence` 0.11, `intelligence.observedTick` 0, `intelligence.ageTicks` 56.

The 131 and `free-tide` on that panel are the old rumor, not the port Mina just claimed. Do not read them as the live garrison or as proof of who holds it.

### Advance to state tick 40

`POST /api/advance` with body `{"ticks":3}`. HTTP 200. `tick` 40. `ticksAdvanced` 3.

`GET /api/state?limit=200`.

- Sequence 4331 is still the `settlement-claimed` line for Mina Vale at Cinder Key. No later `settlement-claimed` on `cinder-key` has replaced it.
- The Cinder Key panel stays the rumor: `intelligence.exact` false, `intelligence.source` `rumor`, `garrison` 131, `intelligence.observedTick` 0.

**Withheld in this session.** Every `decision-made`, `battle-resolved`, and `settlement-claimed` payload above. The action on Esme's, Dax's, and Mara Calder's decisions is not in the JSON. The garrison on Vale's claim, on Mina's battle, and on Mina's claim is not in the JSON. After state tick 36, the live garrison and the live holder of Cinder Key are not on the panel. Crown Harbor's own figures are not the checkpoint.

`PROMOTE` this session if state tick 36 shows Cinder Key exact, `factionId` `world-government`, `ownerId` `character-08`, `garrison` 6, and event tick 35 has exactly one `battle-resolved` on `cinder-key`, actor `character-15`, and event tick 36 has sequence 4331, Mina Vale's claim. `REVISE` if that garrison is 0, or if event tick 35 has more than one `battle-resolved` on `cinder-key`. `ABANDON` if state tick 40 has no sequence 4331.

## Recommendation

`PROMOTE` only if both sessions promote. `REVISE` if either session revises. `ABANDON` if either session abandons.
