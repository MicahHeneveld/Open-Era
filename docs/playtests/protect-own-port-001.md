# Playtest: a faction that loses its port stays listed

## Session

- **Candidate commit:** `66a44e829c6e06b2ba629181cca54a2aa21e2f12`
- **Date:** 2026-09-29 UTC
- **Operator:** A fresh-context playtest operator. This operator did not write the change, and did not read `src/`, `tests/`, the branch diff, or the design note beyond the playtest plan quoted in the assignment. Every reading below is from the dashboard HTTP JSON (`GET /api/health`, `GET /api/state`, `POST /api/advance`). No player command was sent. The world report, the map, and the trace files were not opened.
- **Interface:** Dashboard over HTTP, JSON API only
- **Seed:** `1847` (ticks 0–100), then confirmation seed `2718` (ticks 0–50)
- **Starting tick:** `0` on both seeds
- **Ending tick:** `100` on seed 1847, `50` on seed 2718
- **Player character:** Mara Vane (`character-01`, `factionId` `world-government`), `playerId` `prototype-player`. She started at Crown Harbor and no command moved her.

Node was `v24.21.0` (`npm ci` first). The 1847 process was `npm run dashboard -- --reset --seed 1847 --player-character character-01 --database .open-era/protect-own-port-1847.sqlite --port 4317`. The 2718 process used seed `2718`, database `.open-era/protect-own-port-2718.sqlite`, and port `4318`. `GET /api/health` on each fresh process returned `{"ok":true,"tick":0,"events":0}`.

The plan's tick numbers, the garrison 13, and the name on the 2718 return were written against an older history. The ticks below are the event `tick` fields and the world `tick` on each read.

## Hypothesis and ambition

**Milestone hypothesis:** Free Tide loses Cinder Key and is still a faction, and Glassport comes back to them, without Mara fighting. Offshore, Free Tide's treasury and power stay null.

**Player ambition:** Stay at Crown Harbor. Issue no survey and no raid. At tick 75, read the faction list and Cinder Key. At tick 95, read Glassport. Stop at tick 100 and read again. On seed 2718, advance 50 ticks and read.

**Success signal:** `free-tide` is still listed, treasury null, power null, tax 0.08. Cinder Key is her faction's exact port. The log has one claim of Cinder Key and, by the later read, one `settlement-claimed` for `glassport`. Tick-0 Free Tide ids still read `free-tide`. `PROMOTE` if both claims are singular and the rival treasury stays null. `REVISE` if the row disappears, a distant purse becomes a number, or a port is claimed twice. `ABANDON` if tick 100 still has Free Tide with no port and no Glassport claim.

## Adaptive decision log

### Seed 1847

| Tick | Player-visible observation | Reasoning | Action | Outcome |
| ---: | --- | --- | --- | --- |
| 0 | Mara at `crown-harbor`, money 108, troops 80, health 100, morale 93, provisions 36, `runwayTicks` 62. Factions: `free-tide` treasury `null`, power `null`, `taxRate` 0.08, `intelligence` `{"exact":false,"source":"reputation"}`; `world-government` treasury 18000, power 2335.44, `taxRate` 0.14. Cinder Key `factionId` `free-tide`, garrison 96, `ownerId` null, stability null, `taxRate` 0.08, rumor `{"exact":false,"present":false,"source":"rumor","confidence":0.28,"observedTick":0,"ageTicks":16}`. Glassport `factionId` `world-government`, garrison 155, stability 86, `taxRate` 0.14, exact `{"exact":true,"source":"owned","confidence":1,"observedTick":0,"ageTicks":0}`. Event page `total` 0. | The rival row is already on the list, and its purse is already null, before anyone loses a port. Glassport is an exact port of her own faction. Cinder Key is a rumor. | None. `POST /api/advance` `{"ticks":75}` | World tick 75. She is still at Crown Harbor. |
| 75 | Still `crown-harbor`, travel null, money 108, troops 80. `free-tide` still `{"id":"free-tide","name":"Free Tide Compact","treasury":null,"power":null,"taxRate":0.08,"intelligence":{"exact":false,"source":"reputation"}}`. World Government treasury 19805.57, power 2168.42. Cinder Key `{"factionId":"world-government","garrison":8,"ownerId":"character-05","stability":55.12,"taxRate":0.14,"intelligence":{"exact":true,"present":false,"source":"owned","confidence":1,"observedTick":75,"ageTicks":0}}`. Glassport `{"factionId":"world-government","garrison":143,"ownerId":null,"stability":null,"taxRate":0.14,"intelligence":{"exact":false,"present":false,"source":"faction-report","confidence":0.22,"observedTick":0,"ageTicks":89}}`. Log `total` 8594, events through tick 74. Two `settlement-claimed` rows, both `data` null and `payloadWithheld` true: tick 51 sequence 5933, Finn Frost (`character-18`, faction `free-tide`) `targetId` `world-government` `settlementId` `glassport`; tick 70 sequence 8053, Jun Marrow (`character-05`, faction `world-government`) `targetId` `free-tide` `settlementId` `cinder-key`. | Cinder Key is now an exact port of her faction, garrison 8, owner Jun Marrow. The claim event itself does not carry a garrison. Glassport's card still names World Government, and the report is no longer exact. The log already has a Glassport claim 24 ticks earlier. | None. Advance `{"ticks":20}` | World tick 95. |
| 95 | Still `crown-harbor`, money 108, troops 80. `free-tide` unchanged: treasury null, power null, tax 0.08, id `free-tide`. World Government treasury 20691.12, power 2350.98. Cinder Key exact World Government, garrison 9, `ownerId` `character-05`, stability 55.72, `observedTick` 95. Glassport `{"factionId":"world-government","garrison":7,"ownerId":"character-06","stability":55.51,"taxRate":0.14,"intelligence":{"exact":true,"present":false,"source":"owned","confidence":1,"observedTick":95,"ageTicks":0}}`. One new claim: tick 77 sequence 8867, Iris Stone (`character-06`, faction `world-government`) `targetId` `free-tide` `settlementId` `glassport`, summary "Iris Stone: settlement claimed", `data` null, `payloadWithheld` true. | Glassport has a second claim. The card is an exact World Government port again, garrison 7, owner Iris Stone. Free Tide's purse is still null. | None. Advance `{"ticks":5}` | World tick 100. |
| 100 | Still `crown-harbor`, travel null, money 108, troops 80, sailors 17, provisions 0, `runwayTicks` 0, `shortage` 0.576, health 82.7, morale 43.7. `pendingCommands` []. `free-tide` `{"id":"free-tide","treasury":null,"taxRate":0.08,"power":null,"intelligence":{"exact":false,"source":"reputation"}}`. World Government treasury 20859.22, power 2365.26. Cinder Key exact, garrison 9, owner `character-05`, stability 55.87. Glassport exact, garrison 8, owner `character-06`, stability 55.66. Log `total` 11496. No `settlement-claimed` after sequence 8867. | Three claims in the whole run. Cinder Key once. Glassport twice. The rival row is still there and its purse is still null. The panel gives Free Tide no port. | Stop. | Session closed at tick 100. |

### Seed 2718

| Tick | Player-visible observation | Reasoning | Action | Outcome |
| ---: | --- | --- | --- | --- |
| 0 | Mara at `crown-harbor`, money 118, troops 75, faction `world-government`. `free-tide` treasury null, power null, `taxRate` 0.08, id `free-tide`. World Government treasury 18000, power 2475.55, `taxRate` 0.14. Cinder Key `factionId` `free-tide`, garrison 131, rumor confidence 0.19, `observedTick` 0, `ageTicks` 19. Glassport exact World Government, garrison 155, stability 86. | Same shape as 1847: the rival row exists, the purse is null, Cinder Key is theirs on a rumor, Glassport is hers exactly. | None. Advance `{"ticks":50}` | World tick 50. |
| 50 | Still `crown-harbor`, travel null, money 118, troops 75, provisions 0, health 97.1, morale 67. `free-tide` `{"id":"free-tide","name":"Free Tide Compact","treasury":null,"taxRate":0.08,"power":null,"intelligence":{"exact":false,"source":"reputation"}}`. World Government treasury 19223, power 2322.93. Cinder Key `{"factionId":"world-government","garrison":14,"ownerId":"character-08","stability":55.42,"taxRate":0.14,"intelligence":{"exact":true,"source":"owned","confidence":1,"observedTick":50,"ageTicks":0}}`. Glassport `{"factionId":"world-government","garrison":138,"ownerId":null,"stability":null,"taxRate":0.14,"intelligence":{"exact":false,"source":"faction-report","confidence":0.28,"observedTick":0,"ageTicks":73}}`. Log `total` 5901, events through tick 49. Two claims, both payloads withheld: tick 35 sequence 4156, Vale Drake (`character-08`, `world-government`) `targetId` `free-tide` `settlementId` `cinder-key`; tick 48 sequence 5746, Esme Dusk (`character-19`, `free-tide`) `targetId` `world-government` `settlementId` `glassport`. Dax Pike (`character-20`, `free-tide`) has `battle-resolved` at tick 42 on `glassport` and no `settlement-claimed`. At this read he is standing on Glassport, as are Esme Dusk and Mina Vale. | Each port has one claim inside this window. The row and the null purse held. The Glassport card has not taken the tick-48 claimant's faction. The loss is tick 35, and the return line is Esme Dusk at tick 48. | Stop, as the plan asked. | Confirmation closed at tick 50. |

## Outcome

Mara stood at Crown Harbor for the whole of both runs. Her money and troop count never moved (108 and 80 on 1847; 118 and 75 on 2718). She gave no order. Other characters' battles and claims are in the log she can page.

On seed 1847, Free Tide's row never left the faction list. Its id stayed `free-tide`. Treasury stayed `null`, power stayed `null`, and `taxRate` stayed 0.08 at ticks 0, 75, 95, and 100. Cinder Key became an exact World Government port: the only `settlement-claimed` for it is tick 70, Jun Marrow, `targetId` `free-tide`. At the tick-75 read the garrison on that port was 8, owner `character-05`, stability 55.12. Glassport was claimed twice. Finn Frost claimed it at tick 51 (`targetId` `world-government`). Iris Stone claimed it at tick 77 (`targetId` `free-tide`). At tick 75, between those two claims, the settlement card still said `factionId` `world-government`, garrison 143, exact false, source `faction-report`, `observedTick` 0, `ageTicks` 89, stability null. At tick 95 and tick 100 the card was exact World Government again (garrison 7, then 8; owner `character-06`). From the panel at the planned reads, Free Tide holds no port at tick 100. The log is where Glassport's pass through Free Tide is visible.

On seed 2718 the same row and the same null purse were still there at tick 50. Cinder Key was claimed once, at tick 35, by Vale Drake, and the tick-50 card was exact World Government, garrison 14, owner `character-08`. Glassport was claimed once, at tick 48, by Esme Dusk. The tick-50 card still said World Government, garrison 138, exact false, source `faction-report`, `observedTick` 0, `ageTicks` 73. Dax Pike's battle on Glassport resolved at tick 42 and did not write a claim.

Every `settlement-claimed` in either log had `data: null` and `payloadWithheld: true`. The garrison at the moment of the claim was not on the event. The plan's garrison 13 was not a value this session could read.

## Evidence review

- **World report:** Not opened. The session stopped on the HTTP API.
- **Metrics:** The only faction figures are the ones on `GET /api/state`, quoted above. Her own faction's treasury and power are numbers. Free Tide's treasury and power are `null` at every checkpoint.
- **Map:** Not opened.
- **Decision/agency traces:** Not opened. The paged event log is the history she can read. Claim summaries are the one-line form "Jun Marrow: settlement claimed", "Finn Frost: settlement claimed", "Iris Stone: settlement claimed", "Vale Drake: settlement claimed", and "Esme Dusk: settlement claimed".
- **Conversation traces:** Not opened. No message was sent.
- **Recovery and determinism:** Not run. Two separate dashboard processes, two database files, no restart of either world after the advances above.

### Where the plan's numbers differ

The plan expected, on 1847, a tick-70 Cinder Key claim with garrison 13, and by tick 95 a single Glassport claim. The tick-70 Cinder Key claim is there. Its event has no garrison. The visible garrison at the tick-75 read is 8. Glassport's claims are tick 51 and tick 77, so the port is claimed twice, and the second claim is World Government taking it after Free Tide.

The plan expected, on 2718, a loss at 32 and Dax Pike's return at 41. The loss claim is tick 35, Vale Drake, Cinder Key. Dax Pike's Glassport battle resolves at tick 42. The Glassport claim is tick 48, Esme Dusk.

## Findings

### What worked

- **The rival row survived the loss of Cinder Key.** On both seeds, after Cinder Key read as an exact World Government port, `free-tide` was still in `factions`, with the same id it had at tick 0.
- **The offshore purse stayed null.** `treasury` and `power` on `free-tide` were `null` at every read. `taxRate` stayed 0.08. Her own faction's treasury moved (1847: 18000, then 19805.57, 20691.12, 20859.22). The distant one did not become a number.
- **She did not have to fight for the Cinder Key reading.** No command was accepted. At tick 75 on 1847 and tick 50 on 2718, Cinder Key was `source` `owned`, `exact` true, `ageTicks` 0.
- **Inside the 2718 window, each port was claimed once.**

### Implementation defects

- **Glassport is claimed twice on seed 1847.** Tick 51, Finn Frost, `targetId` `world-government`. Tick 77, Iris Stone, `targetId` `free-tide`. The promote rule asked for both claims to be singular. This is the revise case the plan named: a port claimed twice.
- **After Free Tide's Glassport claim, the settlement card kept World Government.** At 1847 tick 75, twenty-four ticks after sequence 5933, Glassport's `factionId` was still `world-government`, `exact` false, `observedTick` 0, `ageTicks` 89, garrison 143. At tick 0 that same port had been exact, garrison 155, `ageTicks` 0. The garrison moved, the observed tick did not, and the age (89) is ahead of the world tick (75). The same shape is on 2718 at tick 50: garrison 138 against a tick-0 garrison of 155, `observedTick` 0, `ageTicks` 73, `exact` false, `factionId` still `world-government`, two ticks after Esme Dusk's claim. A player who reads the card and a player who reads the log are looking at two holders.
- **The claim event hides the garrison.** `payloadWithheld` is true and `data` is null on every `settlement-claimed` in both logs. The plan's garrison 13 cannot be checked from the event. The later exact garrison is a different tick (8 at the tick-75 read on 1847; 14 at the tick-50 read on 2718).

### Design risks and opportunities

- **By the tick-95 read, Glassport had already come back to World Government.** The hypothesis said Glassport comes back to Free Tide. The log shows that pass at tick 51, and the tick-77 claim ends it before the checkpoint that was supposed to look. At tick 100 the panel lists Free Tide with no port. That is the end state the abandon rule described, together with Glassport claims the abandon rule said would be absent. The double claim is what the verdict follows.
- **A commander who issues nothing spends her provisions in her own port.** On 1847, `runwayTicks` was 62 at tick 0. At tick 100 provisions were 0, `shortage` 0.576, health 82.7, morale 43.7, money still 108. On 2718 at tick 50 provisions were 0, health 97.1, morale 67, money still 118. The plan required no commands, so the hunger is part of this protocol. It is what a player feels if she only watches.

### Follow-up experiments

- Read Glassport on the tick of Finn Frost's claim and on each tick until Iris Stone's claim, and record the first tick the card's `factionId` changes.
- Stop seed 2718 on tick 48 and on the next tick, and see whether Esme Dusk's claim ever appears as `factionId` `free-tide` before someone claims the port again.
- Ask the claim event to carry the garrison the plan tried to read.

## Recommendation

`REVISE`

Free Tide stays a listed faction with treasury `null`, power `null`, and tax 0.08, and the id stays `free-tide`, on both seeds, with Mara idle at Crown Harbor. Cinder Key becomes her faction's exact port after a single claim (tick 70 on 1847, garrison 8 at the tick-75 read; tick 35 on 2718, garrison 14 at the tick-50 read). Glassport does come back to a Free Tide character in the log (Finn Frost at tick 51; Esme Dusk at tick 48). On 1847 that port is then claimed a second time, at tick 77, by Iris Stone, and the tick-95 and tick-100 cards show an exact World Government port. A port claimed twice is the plan's revise rule. It is not abandon: the row remains, and Glassport does have claims. It is not promote: the two Glassport claims are not one.

The plan's ticks and the garrison 13 do not match this world. That difference is recorded above. It is not the reason for the verdict. The second Glassport claim is.

This recommendation is for the playtest. It is not a merge, and this branch was not opened as a pull request.
