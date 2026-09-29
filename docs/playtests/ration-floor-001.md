# Playtest: ration floor

## Session

- **Candidate commit:** `b4b7be9c32340c7f37cb70f61bbb35b07aae44d9`
- **Date:** 2026-09-29 UTC
- **Operator:** A fresh-context playtest operator. This operator did not write the change. The run used only the dashboard HTTP JSON API and the playtest plan. `src/`, `tests/`, this branch's diff and log, and `docs/design/port-provisions.md` were not opened. No player command was sent. The world report, the map, and the trace files were not opened.
- **Interface:** Dashboard over HTTP, JSON API only (`GET /api/health`, `GET /api/state`, `POST /api/advance`)
- **Seed:** `1847`
- **Starting tick:** `0`
- **Ending tick:** `1200` (day 200)
- **Player character:** Mara Vane (`character-01`, `factionId` `world-government`), `playerId` `prototype-player`. She started at Crown Harbor and no command moved her.

Node was `v24.21.0` (`node -v` after selecting `.node-version`; `npm ci` first). The process was `npm run dashboard -- --reset --seed 1847 --player-character character-01` on `http://127.0.0.1:4317`. `GET /api/health` on the fresh process returned `{"ok":true,"tick":0,"events":0}`.

`POST /api/commands` was not used. Advances were `{"ticks": N}` with N at most 144, in the plan's order: 144, then 6 (state tick 150); 144, 144, then 82 (520); 144, then 36 (700); 144, then 136 (980); 120 (1100); 27 (1127); 73 (1200). Every advance returned HTTP 200, `pausedForBattle` false, and the tick the plan named.

History was paged with `GET /api/state?limit=200` and `beforeSequence` set to `eventPage.cursor`. At tick 1200, `eventPage.total` was 162302. Every `settlement-claimed` in that log had `data: null` and `payloadWithheld: true`. The garrison quoted below is the live `settlements[id=crown-harbor]` card on that read, not a field on the claim event.

## Hypothesis and ambition

**Milestone hypothesis:** Crown Harbor changes hands and does not freeze at stability 0, and it changes hands again because the garrison climbed. An idle Mara still starves in place. That is a separate fact. This rule does not buy her food.

**Player ambition:** Stand on Crown Harbor. Issue no order. Read the port and her own hold at the planned ticks, and page the log for claims.

**Success signal:** `PROMOTE` if both Crown Harbor claim event ticks are in the log and state ticks 1100 and 1200 are not stability 0. `REVISE` if two Crown Harbor claims land within 11 ticks, or if a shelf of 0 is presented as a `settlement-shortage`. `ABANDON` if state tick 1200 still has one Crown Harbor claim and stability 0.

## Adaptive decision log

| Tick | Player-visible observation | Reasoning | Action | Outcome |
| ---: | --- | --- | --- | --- |
| 0 | `party.locationId` `crown-harbor`. `party.hold.money` 108, `party.hold.cargo.provisions` 36. Character health 100, morale 93. Crown Harbor `factionId` `world-government`, `ownerId` null, garrison 260, stability 91, `stocks.provisions` 220. `intelligence.present` true | She is already on the port the plan names. Nothing to order | `POST /api/advance` `{"ticks":144}` then `{"ticks":6}` | State tick 150. No command queued |
| 150 | Still `crown-harbor`, travel null. `party.hold` `{"money":108,"cargo":{"provisions":0,"arms":3,"medicine":4,"shipMaterials":5}}`. `party.provisions` 0, `party.shortage` 0.576, `runwayTicks` 0. Character `health` 59.7, `morale` 0. Crown Harbor still `world-government`, `ownerId` null, garrison 231, stability 91.38, `stocks.provisions` 30.233. Her `character-upkeep` at event tick 62 (sequence 7118) is the first with `cargo.provisions` 0 (`{"demand":0.576,"consumed":0.288,"shortage":0.288,"cargo":{"provisions":0,"arms":3,"medicine":4,"shipMaterials":5},"morale":94.789,"health":99.77}`). Tick 61 still had provisions 0.288. Morale first hits 0 on event tick 131 (sequence 15239): `morale` 0, `health` 67.961, provisions 0. Tick 130 was morale 0.813. The tick-149 upkeep has `health` 59.663. The tick-150 upkeep has `health` 59.202. Claims so far, all `data` null and `payloadWithheld` true: Glassport tick 51 Finn Frost; Cinder Key tick 70 Jun Marrow; Glassport tick 77 Iris Stone. No Crown Harbor claim. No `settlement-shortage` | The hold is empty and morale is 0, on the event ticks the plan named. The card health is 59.7. The port has not changed hands. Starvation is hers, and the money is still 108 | Advance 144, 144, then 82 | State tick 520 |
| 520 | Still `crown-harbor`. Money 108, hold provisions 0, morale 0, health 1, `party.shortage` 0.576. Crown Harbor `{"factionId":"world-government","ownerId":null,"garrison":187,"stability":93.3,"stocks":{"provisions":0.389}}` (arms 724.248, medicine 0, ship materials 0). `intelligence` exact, present, source `owned`. New claims: Glassport tick 231 Pax Ash (`character-14`, `targetId` `world-government`); Cinder Key tick 282 Pax Ash (`targetId` `world-government`); Glassport tick 400 Niko Wren (`character-03`, `targetId` `free-tide`). No Crown Harbor claim. No `settlement-shortage` | The port is still unowned World Government. Garrison 187 and stability 93.3 are not a freeze at 0. Her purse did not buy food | Advance 144, then 36 | State tick 700 |
| 700 | Still `crown-harbor`. Money 108, hold provisions 0, morale 0, health 1. Crown Harbor `{"factionId":"world-government","ownerId":null,"garrison":71,"stability":73.34,"stocks":{"provisions":0.119}}`. New claims: Cinder Key tick 561 Bram Quill (`character-02`, `targetId` `free-tide`); Glassport tick 609 Zara Gale (`character-17`, `targetId` `world-government`). No Crown Harbor claim. No `settlement-shortage` | Still no Crown Harbor claim. The garrison has fallen to 71 and stability to 73.34, and the port is still World Government with `ownerId` null | Advance 144, then 136 | State tick 980 |
| 980 | Still `crown-harbor`. Money 108, hold provisions 0, morale 0, health 1. Crown Harbor `{"factionId":"free-tide","ownerId":"character-22","garrison":11,"stability":55,"stocks":{"provisions":0.771}}`. `characters` names `character-22` Bram Tern. `intelligence` `{"exact":false,"present":true,"source":"direct-observation","confidence":1,"observedTick":980,"ageTicks":0}`. `surrender` null. Claim event tick 979, sequence 130834: `{"type":"settlement-claimed","settlementId":"crown-harbor","actorId":"character-22","targetId":"world-government","summary":"Bram Tern: settlement claimed","data":null,"payloadWithheld":true}`. Other new claims: Glassport tick 764 Vale Drake (`character-08`, `targetId` `free-tide`); Glassport tick 934 Finn Frost (`character-18`, `targetId` `world-government`). No `settlement-shortage` | The claim tick is 979, one less than the state tick. The live card is Free Tide, Bram Tern, garrison 11, stability 55. The claim event itself has no garrison. Her hold is still empty | Advance `{"ticks":120}` | State tick 1100 |
| 1100 | Still `crown-harbor`. Money 108, hold provisions 0, morale 0, health 1. Crown Harbor `{"factionId":"free-tide","ownerId":"character-22","garrison":12,"stability":46.6,"stocks":{"provisions":0}}`. Bram Tern. `intelligence` still direct-observation, exact false, present true, confidence 1. No new `settlement-claimed` in this span. No `settlement-shortage` | Same owner. Garrison moved 11 to 12. Stability 46.6, not 0. The stock reads 0 | Advance `{"ticks":27}` | State tick 1127 |
| 1127 | Still `crown-harbor`. Money 108, hold provisions 0, morale 0, health 1. Crown Harbor `{"factionId":"world-government","ownerId":"character-12","garrison":7,"stability":55,"stocks":{"provisions":0}}`. `characters` names `character-12` Lio Crow. `intelligence` exact, present, source `owned`. Claim event tick 1126, sequence 151782: `{"type":"settlement-claimed","settlementId":"crown-harbor","actorId":"character-12","targetId":"free-tide","summary":"Lio Crow: settlement claimed","data":null,"payloadWithheld":true}`. Other new claim: Glassport tick 1106 Vale Drake (`character-08`, `targetId` `free-tide`). No `settlement-shortage` | Second Crown Harbor claim, 147 ticks after the first. The live card is World Government, Lio Crow, garrison 7, stability 55 | Advance `{"ticks":73}` | State tick 1200 |
| 1200 | Still `crown-harbor`. Money 108, hold provisions 0, morale 0, health 1, troops 80, sailors 17, `party.shortage` 0.576. Crown Harbor `{"factionId":"world-government","ownerId":"character-12","garrison":14,"stability":57.19,"stocks":{"provisions":0}}`. Lio Crow. No new claim. No `settlement-shortage` anywhere in the 162302 events | Two Crown Harbor claims are in the log. Stability is 57.19, not 0. Garrison climbed from 7 to 14 after the second claim. Her hold is still empty | Stop | Session closed at tick 1200 |

## Outcome

Mara stood on Crown Harbor from tick 0 through tick 1200 and never issued a command. Her money stayed 108. Her hold provisions hit 0 on the character-upkeep at event tick 62 and stayed 0. Her morale hit 0 on the upkeep at event tick 131 and stayed 0. At the tick-150 read the character card said health 59.7. By the tick-520 read the card said health 1, and it was still 1 at tick 1200. The port did not put food in the hold.

Crown Harbor stayed unowned World Government at the tick-520 and tick-700 reads (garrison 187, stability 93.3, provisions 0.389; then garrison 71, stability 73.34, provisions 0.119). The log's first Crown Harbor claim is event tick 979, Bram Tern (`character-22`), summary "Bram Tern: settlement claimed", `targetId` `world-government`, payload withheld. The tick-980 card was `free-tide`, owner Bram Tern, garrison 11, stability 55, provisions 0.771. At tick 1100 the same owner still held it, garrison 12, stability 46.6, provisions 0. The second Crown Harbor claim is event tick 1126, Lio Crow (`character-12`), `targetId` `free-tide`, payload withheld. The tick-1127 card was `world-government`, owner Lio Crow, garrison 7, stability 55, provisions 0. At tick 1200 Lio Crow still held it, garrison 14, stability 57.19, provisions 0.

Those two claim ticks are 147 apart. State ticks 1100 and 1200 are not stability 0. The event type `settlement-shortage` does not appear in the paged log.

## Evidence review

- **World report:** Not opened. The session evidence is the dashboard JSON.
- **Metrics:** Not a separate endpoint in this session. `metrics-recorded` events were in the feed and were not the readings the plan asked for.
- **Map:** Not opened. `party.locationId` and `characters[id=character-01].locationId` were `crown-harbor` at every checkpoint, and `travel` was null.
- **Decision/agency traces:** Not opened. No player command was sent. The claim rows below are the paged `settlement-claimed` events.
- **Conversation traces:** Not opened. No message was sent.
- **Recovery and determinism:** Not run. One dashboard process, seed 1847, `--reset`, from tick 0 to tick 1200.

### Checkpoint comparison

The plan's parenthetical 59.663 is the `character-upkeep` at event tick 149. The character field at state tick 150 is the rounded 59.7. Where the plan names a port figure, the card matched it. The plan names no `stocks.provisions` at ticks 980 or 1127; those cells are the values the API returned.

| State tick | Field | Expected | Actual |
| ---: | --- | --- | --- |
| 150 | location | `crown-harbor` | `crown-harbor` |
| 150 | `party.hold.money` | 108 | 108 |
| 150 | `party.hold.cargo.provisions` | 0 | 0 |
| 150 | morale | 0 | 0 |
| 150 | health on the character | 59.7 (raw 59.663) | character `health` 59.7. Raw 59.663 is the tick-149 upkeep, not the character field. The tick-150 upkeep says `health` 59.202 |
| 150 | hold empty | since event tick 62 | first `cargo.provisions` 0 is event tick 62, sequence 7118. Tick 61 was 0.288 |
| 150 | morale 0 | since event tick 131 | first `morale` 0 is event tick 131, sequence 15239. Tick 130 was 0.813 |
| 520 | faction, owner | `world-government`, `ownerId` null | `world-government`, `ownerId` null |
| 520 | garrison, stability, provisions | 187, 93.3, 0.389 | 187, 93.3, 0.389 |
| 520 | Crown Harbor claim | none yet | none |
| 700 | faction, owner | `world-government`, `ownerId` null | `world-government`, `ownerId` null |
| 700 | garrison, stability, provisions | 71, 73.34, 0.119 | 71, 73.34, 0.119 |
| 700 | Crown Harbor claim | none yet | none |
| 980 | claim event tick | 979 | 979, sequence 130834 |
| 980 | faction, owner | `free-tide`, `character-22` Bram Tern | `free-tide`, `character-22`, name Bram Tern |
| 980 | garrison, stability | 11, 55 | 11, 55 |
| 980 | `stocks.provisions` | not named | 0.771 |
| 1100 | faction, owner | `free-tide`, Bram Tern | `free-tide`, `character-22` Bram Tern |
| 1100 | garrison, stability, provisions | 12, 46.6, 0 | 12, 46.6, 0 |
| 1127 | claim event tick | 1126 | 1126, sequence 151782 |
| 1127 | faction, owner | `world-government`, `character-12` Lio Crow | `world-government`, `character-12`, name Lio Crow |
| 1127 | garrison, stability | 7, 55 | 7, 55 |
| 1127 | `stocks.provisions` | not named | 0 |
| 1200 | faction, owner | `world-government`, Lio Crow | `world-government`, `character-12` Lio Crow |
| 1200 | garrison, stability, provisions | 14, 57.19, 0 | 14, 57.19, 0 |

Money stayed 108 and hold provisions stayed 0 at every checkpoint from 150 through 1200. Character health on the later cards was 1. The plan stated health only at tick 150.

### Every `settlement-claimed` since the previous checkpoint

Payloads were withheld on all of these. `targetId` is the field on the event. The actor name is `characters[].name` for `actorId`.

| After tick | Event tick | Sequence | Settlement | Actor |
| ---: | ---: | ---: | --- | --- |
| 150 | 51 | 5933 | `glassport` | Finn Frost (`character-18`), `targetId` `world-government` |
| 150 | 70 | 8053 | `cinder-key` | Jun Marrow (`character-05`), `targetId` `free-tide` |
| 150 | 77 | 8867 | `glassport` | Iris Stone (`character-06`), `targetId` `free-tide` |
| 520 | 231 | 27423 | `glassport` | Pax Ash (`character-14`), `targetId` `world-government` |
| 520 | 282 | 33747 | `cinder-key` | Pax Ash (`character-14`), `targetId` `world-government` |
| 520 | 400 | 49283 | `glassport` | Niko Wren (`character-03`), `targetId` `free-tide` |
| 700 | 561 | 72024 | `cinder-key` | Bram Quill (`character-02`), `targetId` `free-tide` |
| 700 | 609 | 78576 | `glassport` | Zara Gale (`character-17`), `targetId` `world-government` |
| 980 | 764 | 100292 | `glassport` | Vale Drake (`character-08`), `targetId` `free-tide` |
| 980 | 934 | 124196 | `glassport` | Finn Frost (`character-18`), `targetId` `world-government` |
| 980 | 979 | 130834 | `crown-harbor` | Bram Tern (`character-22`), `targetId` `world-government` |
| 1100 | — | — | — | no `settlement-claimed` in this span |
| 1127 | 1106 | 148956 | `glassport` | Vale Drake (`character-08`), `targetId` `free-tide` |
| 1127 | 1126 | 151782 | `crown-harbor` | Lio Crow (`character-12`), `targetId` `free-tide` |
| 1200 | — | — | — | no `settlement-claimed` in this span |

Crown Harbor claims, the whole run: event tick 979, Bram Tern, and event tick 1126, Lio Crow. Difference 147 ticks. No `settlement-shortage` event for `crown-harbor`, and that type is absent from the paged type list (162302 events).

## Findings

### What worked

- Crown Harbor changed hands twice, on the event ticks the plan named. Bram Tern at event tick 979, then Lio Crow at event tick 1126. The live cards on the following state ticks named those owners, factions, garrisons, and stabilities.
- It did not freeze at stability 0. Tick 1100 was stability 46.6 with garrison 12, still Bram Tern. Tick 1200 was stability 57.19 with garrison 14, still Lio Crow. Garrison on the card went 11 to 12 between the claims, and 7 to 14 after the second claim.
- The two Crown Harbor claims are 147 ticks apart. Nothing in the log presents a zero shelf as a `settlement-shortage`.
- Idle starvation is a separate fact on her own character. Hold provisions 0 from event tick 62, morale 0 from event tick 131, money still 108 at tick 1200. The port rule did not fill `party.hold.cargo.provisions`.

### Implementation defects

None observed against the promote rule. The claim event does not carry the garrison (`data` null, `payloadWithheld` true). The plan said to read the garrison from the live port, and that card was readable because she was standing on it, including while the faction was `free-tide`.

### Design risks and opportunities

- At state tick 150 the character card says `health` 59.7, the tick-149 upkeep says `health` 59.663, and the tick-150 upkeep on the same read says `health` 59.202. A player who treats the newest upkeep line as the card will not get the card's number.
- From the upkeep at event tick 277 (`health` 1; tick 276 was 1.116) through event tick 1199, every exposed Mara upkeep has `health` 1. The card is 1 at ticks 520, 700, 980, 1100, 1127, and 1200, with morale 0, shortage 0.576, and money 108. She does not drop below 1, and she does not spend the purse.
- While Free Tide holds the port she is standing in, the card says `exact: false` and `source: "direct-observation"` with `confidence` 1 and `present: true`, and still shows garrison, stability, `ownerId`, and stocks. At tick 980 that stock is 0.771. At tick 1100 the stock is 0 while garrison has moved from 11 to 12 and stability is 46.6. At tick 1200 the stock is 0, garrison is 14, and stability is 57.19. The empty stock is `stocks.provisions`, not a shortage event.
- Glassport and Cinder Key change hands many times in the same log (eight Glassport claims, three Cinder Key claims). Crown Harbor is the quiet one: two claims in 1200 ticks.

### Follow-up experiments

- Read Crown Harbor at the claim ticks themselves, 979 and 1126, if a one-tick stop can show the garrison the withheld claim event does not.
- Same idle stand on another seed, and see whether two claims still land more than 11 ticks apart with stability above 0 at the late reads.

## Recommendation

`PROMOTE`

Both Crown Harbor claim event ticks are in the log: 979, Bram Tern, and 1126, Lio Crow. They are 147 ticks apart. State tick 1100 stability is 46.6 and state tick 1200 stability is 57.19. No `settlement-shortage` event is in the log. Tick 1200 has two Crown Harbor claims, and the stability is not 0. Mara's empty hold and her morale of 0 are unchanged, and her money is still 108.
