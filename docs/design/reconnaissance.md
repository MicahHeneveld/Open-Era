# Reconnaissance and earned estimates

**Status: Open, except the recommended first slice.** This is an investigation brief, not a decision record. The section on current behavior describes `main` at `8c97d34` as read from source. Everything under a **Proposal** heading is a proposal for the owner to accept, change or reject, except the [recommended first slice](#recommended-first-slice-survey), which is built. The rest is not decided until it moves into [world simulation](world-simulation.md) or [autonomous characters](autonomous-characters.md).

## The problem

The [game vision](game-vision.md) says foreign resources, defense, plans and motives are "estimates learned through observation, reports, behavior, dialogue, and investigation." Today the only machinery for this is settlement-scoped:

- [progress.md](../../progress.md) names it the headline risk: no channel exists for learning a rival's strength other than a settlement forecast. Nothing covers characters, parties or factions.
- Population feeds the defender estimate but can't be read before ownership ([informed-commitment-001](../playtests/informed-commitment-001.md)).
- The [roadmap](../roadmap.md) lists player-directed exploration or investigation as untracked. The player verbs have no exploration action, and there is no way to investigate a place the commander hasn't reached.
- Two sessions reported separately that rival strength can't be assessed through any intended channel ([hidden-state-visibility-001](../playtests/hidden-state-visibility-001.md), [hidden-state-visibility-002](../playtests/hidden-state-visibility-002.md)).
- Whether a merchant can learn a remote price at all is undecided ([world simulation](world-simulation.md#player-trade), [trade-voyage-001](../playtests/trade-voyage-001.md)).

## What exists today

### The knowledge map

Each character has `knowledge: Record<string, SettlementKnowledge>` ([`src/sim/types.ts`](../../src/sim/types.ts)). One entry holds `observedTick`, `confidence`, `factionId`, `garrisonEstimate`, `stocksEstimate`, `priceEstimate` and `source: "direct" | "faction-report" | "rumor"`. The entry has no population or fortification field.

Truth enters the map in exactly one place at runtime. `directObservation` in [`src/sim/agency.ts`](../../src/sim/agency.ts) copies the settlement the character is standing in, with `source: "direct"` and `confidence: 1`. [`src/sim/engine.ts`](../../src/sim/engine.ts) emits it as `knowledge-updated` from three sites: arrival (`progressTravel`), daily refresh while standing (`runTick`, gated by `needsObservation`), and after combat (`emitCombatObservation`). The reducer in [`src/sim/state.ts`](../../src/sim/state.ts) replaces the whole entry. Knowledge never passes between characters. An officer's observations stay in the officer's own map.

The only other writer is world creation. `knowledgeFor` in [`src/sim/scenario.ts`](../../src/sim/scenario.ts) seeds every character with an entry for every settlement:

- A faction report for settlements of the character's own faction, at confidence 0.76.
- A rumor for everything else, at confidence 0.22–0.42.
- Both backdated with `observedTick` of −3 to −30.

The seeded values are tick-0 truth multiplied by a random factor: 0.88–1.12 for reports, 0.62–1.42 for rumors. That is the one place the codebase manufactures hearsay by perturbing truth. It is defensible as a stand-in for observations made before the world began, but a runtime channel must not copy it.

### Provenance and age

A stored record is read through `freshness` in `agency.ts`: `confidence × exp(−age / 72)`, clamped to 0.08–1. `believedGarrison` and `believedPrice` blend the report toward fixed priors: 100 garrison, or `fallbackPrices`. They never blend toward truth. The settlement projection in [`src/dashboard/view-model.ts`](../../src/dashboard/view-model.ts) publishes this as `intelligence { exact, present, source, confidence, observedTick, ageTicks }`, taking confidence from `believedGarrison` so the panel and the forecast agree.

`projectKnowledge` in [`src/dashboard/visibility.ts`](../../src/dashboard/visibility.ts) floors a negative `observedTick` at 0 for the commander's own map. The own-party session called this "an explicit provenance ladder" and "genuinely good design" ([own-party-001](../playtests/own-party-001.md)).

### `combatForecast`

In [`src/sim/combat.ts`](../../src/sim/combat.ts), `combatForecast` centers the defender on `believedGarrison`. This is the "forecast centre anchored to the stale report" that informed-commitment-001 described: it is honest but uninformative.

Fortification and population contribute only while the commander is standing there. `groundTruthWeight` is deliberately binary, because "nothing stored describes the ground of a settlement the commander has not stood on". Remotely, ignorance widens the ranges instead: `intelligencePenalty` combines `(1 − confidence) × 0.34` with an age penalty of `ageTicks / 180` capped at 0.28, or 0.3 when there is no record. Remotely, the headline reads the floor of the win range; locally it reads the midpoint. The forecast's `intelligence { source, confidence, ageTicks }` repeats the provenance.

### Redaction tiers

`characterVisibilityTier` in `visibility.ts` assigns:

| Tier | When | Condition (troops, money, health, `partyPower`) | Capability (skills, attributes) | Motive, plan, knowledge |
| --- | --- | --- | --- | --- |
| self | the commander | exact | exact | exact |
| co-located | same settlement with neither party travelling, **or** the character stands in any settlement the commander's faction holds | exact, present-tense | exact | null |
| faction | same faction, elsewhere | null | exact | null |
| distant | everyone else | null | null | null |

Every tier sees `locationId`, `travel` (destination and remaining ticks), victories and defeats. Foreign factions project `treasury`, `taxRate` and `power` as null (`projectFactions`). Settlements have their own branches in `dashboardState`:

- Faction-held settlements are exact.
- A settlement the commander stands in shows present-tense truth, including garrison, fortification, population and the `market` block.
- A remote settlement shows the stored estimates, with `population` and `fortification` null.

`eventPayloadVisible` keeps character-attributed payloads private whatever ground they happened on. That rule came from hidden-state-visibility-001, where capturing a port exposed every visitor's decisions.

### Hazards found while reading

Each of these is based on reading the code, not on running it:

1. **Results of an explore order never reach the issuer.** A player's first instinct in hidden-state-visibility-001 was to order an explorer to survey Cinder Key. `judgeOrderCompletion` produces only a summary line, and the officer's entry stays in the officer's map.
2. **Zeros for unknown values.** With no record, the settlement JSON fills `stocks` and `prices` with zeros (`view-model.ts`). The dashboard now renders this as unknown, but the API still sends zero. The branch can't be reached today, because every character is seeded with every settlement. It becomes reachable as soon as any settlement lacks a seeded record.
3. **Forecast availability reveals true ownership.** `forecastAvailable` tests `hostile` against the true `settlement.factionId`, while the panel's `factionId` comes from the report. A remote island that changed hands would announce it by gaining or losing a forecast.
4. **Holding ground reveals visitors' condition.** The co-located tier includes rivals standing in any port the commander's faction holds, at any distance. It exposes condition and capability, though not motive. That is a narrow form of "ground ownership implies insight".
5. **Movement is a global feed.** Every character's `travel` destination is public at every tier. hidden-state-visibility-002 found this produced good inferences. It is still global information that no one earned.

## Principles for any channel (proposal)

1. **A report copies an observation.** Its content is what some character saw, on the tick they saw it, never current truth with noise added. Ignorance shows as width and age, the way `combatForecast` already handles it.
2. **Every record carries `source` and `observedTick`.** Passing a report on keeps the original `observedTick`. A relay never makes a report younger.
3. **Unknown is null.** No channel may introduce zeros, and hazard 2 should be fixed before new record types land.
4. **Ground does not imply insight.** Holding or standing on a place tells you about the place. Learning about a person there takes a deliberate act.
5. **No passive global feed.** Every report requires someone to be physically present and costs time, money or risk. The same rule applies to the future news database ([autonomous characters](autonomous-characters.md#knowledge-and-public-news)).
6. **Through the command boundary.** Player channels are verbs or order directives validated in [`src/sim/commands.ts`](../../src/sim/commands.ts). They count against `COMMAND_LIMITS.directActionsQueued` (1) and resolve deterministically in `runTick`.

## How each subject is earned (proposal)

| Subject | Knowable fields | Earned by | Stored as |
| --- | --- | --- | --- |
| Settlement | owner, garrison, stocks, prices (already); population, fortification (new) | commander present; survey; delivered officer report; later, informant hearsay | `SettlementKnowledge`, plus a dated ground record |
| Party | location, troop count, `partyPower` band | seeing it in port; later, a survey that lists the parties present | new sighting record with `source` and `observedTick` |
| Character | capability; motive only through dialogue and behavior | co-location or faction record (as today); later, captives and conversation | no new record in the first slice; motive stays private |
| Faction | tax rate (a public fact); power only as a partial sum of the commander's own records | publication; aggregation | derived at projection time and labelled partial, never `factionPower` |

## Candidate channels

| | A. Survey (own verb and delegated `explore`) | B. Informants at the current port | C. Interrogating captives | D. Observed behavior, persisted |
| --- | --- | --- | --- | --- |
| Settlement | full direct record plus ground, at the survey tick | the freshest record held by anyone in port, marked `rumor` with its original age | the captive's own records, as old as they are | none |
| Party | parties present at the surveyed port (second slice) | reports of parties seen by others (high risk) | the captive's own party is already exact through the co-located tier | last-seen troop count and location |
| Character | none | none | beliefs, possibly orders (needs a decision) | none beyond what is public |
| Faction | inputs to a partial aggregate | inputs only | the captive faction's settlement records | none |
| Cost and risk | the action slot and forgone `work`; officers take voyage time, may refuse (`assessStandingOrder`) or deviate, and sail into hostile ports | money; hearsay can be badly wrong | needs a capture, which is rare; relationship grievance | none, which is the problem |
| Determinism and golden hashes | no RNG draw; hash-neutral if limited to player commands and targeted orders (see below) | deterministic if selection is by sort; hash-neutral as a player-only verb | deterministic; hash-neutral as a player-only verb | recording passively moves hashes, because `character-01` is human in the golden run and still observes |
| Redaction risk | low: it records a place, not a person | high: it sells other characters' private beliefs, the leak class closed in `82c9bfc`; needs anonymizing | medium: explicit and costly, but exposes a named character's beliefs | low per record; it does not fix hazards 4–5 |
| Rough size | small | medium | medium, with low opportunity | small to medium, with state growth |

### Comparable games

- **Mount & Blade II: Bannerlord.** Scouting perks apply through the party's Scout role. They raise sight range and track spotting distance, extend track life, and give "more tracking information" ([Gamer Guides](https://www.gamerguides.com/mount-and-blade-ii-bannerlord/guide/perks/cunning/scouting), [Fandom](https://mountandblade.fandom.com/wiki/Skills_(Bannerlord))). Takeaway: tracks are aged evidence, and a delegated role's skill decides how much they say.
- **EVE Online.** The directional scanner reaches about 14 AU. It returns ship names and types, never the pilot's name, distance or coordinates. Local lists everyone in the system in known space but not in wormholes. Fleets paste scans into shared intel channels ([EVE University: d-scan](https://wiki.eveuniversity.org/Directional_Scanner_Guide), [EVE University: scouting](https://wiki.eveuniversity.org/Scouting)). Takeaway: each tool reveals one partial slice, and shared intelligence is a player-made report.
- **Crusader Kings III.** The Spymaster's Find Secrets task gives +5% per point of councilor skill to discover a secret at court "(if any)". A possible negative event is the task being discovered ([CK3 Wiki: Council](https://ck3.paradoxwikis.com/Council)). Takeaway: you can only find what exists, a character's skill sets the rate, and there is exposure risk.
- **Sid Meier's Pirates!** The tavern's Mysterious Traveler reports, for free, on cities he has visited recently: prices, population, prosperity and military status. The barmaid points out nearby ships with their route and current position ([Pirates! Wiki: Tavern](https://sidmeierspirates.fandom.com/wiki/Tavern)). Takeaway: provenance and age are part of the story, and one report answers both the trade question and the military question.
- **Dwarf Fortress.** Rumors start with witnesses and spread from person to person. "No false rumors will ever spread" except about secret identities. There are six levels of knowing where an artifact is, from holding it, through "hearing … so-and-so was holding it at a location recently", to no idea. Knowledge fades over weeks and years ([DF Wiki: Rumor](https://www.dwarffortresswiki.org/index.php/Rumor)). Takeaway: this is close to Open Era's direct / report / rumor ladder, and it errs by leaving things out rather than inventing them.
- **Europa Universalis IV.** Diplomats build spy networks over time. An unmaintained network decays by 1 per month, and discovery becomes possible from size 25. The covert action Infiltrate Administration (cost 40, diplomatic tech 30) lifts the fog of war from the target nation ([EU4 Wiki: Espionage](https://eu4.paradoxwikis.com/Espionage)). Takeaway: intelligence as an investment that grows and decays is useful. Lifting fog wholesale is what Open Era should avoid, because it hands over truth.

## Recommended first slice: survey

**Built in M18** (`5343663` on `feature/survey`). The five changes, the projection table, and the validation list below are in the code. The playtest is [informed-commitment-002](../playtests/informed-commitment-002.md). Out of scope, the other candidate channels, and the open questions stay proposals.

**Hypothesis.** A commander can learn a never-visited settlement's garrison, population and fortification before sailing, by paying for a survey. The result shows as a dated report with a named source, and the truth can't be recovered any other way.

### Changes

1. **Built. Store a dated ground record.** Optional `ground?: { population, fortification, observedTick, source }` on `SettlementKnowledge`. Ground has its own age because the rest of the entry keeps refreshing. `directObservation` carries `ground` forward from the previous entry. Otherwise the next arrival or daily refresh would erase it, since the reducer replaces whole entries. The field is left out rather than set to null, and `WorldState.version` stays 5.
2. **Built. Add a `survey` verb.** `survey` is on `PlayerAction` and `ACTION_CAPABILITIES`, targeting the current settlement, which must not be held by the commander's faction. It resolves in `resolveDecision` and emits `knowledge-updated` with reason `survey`: a direct record plus `ground` with `source: "direct"`. Passive presence stays present-tense for ground. A durable survey costs a tick of action.
3. **Built. Deliver an officer's survey.** When `judgeOrderCompletion` accepts an `explore` order that has a `targetId`, the tick also emits `knowledge-updated` for the issuer (`actorId` = issuer, so `eventPayloadVisible` shows it only to them). It carries the officer's present observation of the target, including ground, with `source: "faction-report"` and `observedTick` set to the report tick. Reason `explore-report`. An explore order with no `targetId` delivers nothing. The officer's own map stays hidden, because the faction tier projects `knowledge: null`.
4. **Built. Use ground records in the remote forecast.** `combatForecast` reads `ground` in place of the zeroed `knownFortification` and `knownPopulation`, and adds a revealed factor naming the survey's age (`surveyed ground is N ticks old`). The input is the stored record, never the true settlement. Standing there still uses the settlement itself.
5. **Built. Projection-only fixes.** Remote hostility for `forecastAvailable` comes from `knowledge.factionId`. Own-faction ports and the island the commander is standing on still use the faction that is actually there. A settlement with no report projects stocks, prices, population, fortification, and `groundIntelligence` as null rather than zero. M17 had already nulled stocks and prices.

### Projection

| Commander's relation to the settlement | `population`, `fortification` | Provenance |
| --- | --- | --- |
| Held by the commander's faction | exact | `source: "owned"` |
| Standing there | present truth | `direct-observation`, `present: true` |
| Away, with a ground record | the recorded values | new `groundIntelligence { source, observedTick, ageTicks }` |
| Away, no record | null | none |

Character tiers are unchanged in this slice.

### Validation

Unit tests:

- A survey writes ground with the survey tick.
- A later arrival or daily refresh keeps it.
- A targeted explore completion delivers a `faction-report`, and an untargeted one delivers nothing.
- A remote forecast doesn't move when the true fortification or population is changed after the survey. This is the anti-leak test.
- No projected field is zero where it should be unknown.

Playtest: [informed-commitment-002](../playtests/informed-commitment-002.md) reran the informed-commitment ambition against a never-visited port, deciding from an officer's survey, then repeated that session's adversarial inversion protocol.

The follow-up question has an answer in that session, and it is not a change to this brief. Commitment got more accurate and less tense. A lot of the tension in the first session was the width of a band that did not know the walls.

### Survey polish

Built after that session, on `fix/survey-polish`. These are readings of the same channel. They do not add a subject or a writer.

- A remote garrison publishes `garrisonIntelligence { source, observedTick, ageTicks }` next to the number, and the panel says how old it is. The age is the age `combatForecast` already uses, so a rumor backdated before tick 0 is old on day one. The tick shown to the player is floored at 0. The simulation keeps the negative tick: that backdate is why the rumor is stale, and rewriting the seed would make opening rumors fresh and move the golden hashes.
- Standing on the island, the panel keeps the true fortification. The local forecast names that same figure and says the defender band is skill-scaled. It no longer prints the scaled product as if it were a second wall. The string stored on an active battle is unchanged.
- An explore that finishes on the tick it was issued, because the officer is already on the target, says so in the order response and in the chronicle. It still does not cost a tick.
- A player voyage is refused as `insufficient-passage` when the purse is short of the quoted passage. M22 applies that same quote to an autonomous voyage that has not started: the candidate scores −1000 and another action is chosen. A voyage already underway still pays what the purse has each sea tick.

### Golden hashes

The expectation is that the golden hashes stay **byte-identical**, so a moved hash would mean something is wrong:

- The golden run issues no player commands.
- Seeded explore orders from `orderFor` have no `targetId`.
- `ground` is absent everywhere else, and `canonicalJson` drops undefined keys.
- No new RNG draw is added.

### Out of scope

Party sightings, the second slice, are **built in M21** (`6bfdeea` on `feature/party-sightings`): the same survey and targeted-explore path, recording who was anchored at the port. The note is [party sightings](party-sightings.md). Informants, captives, and faction aggregates were not built.

## The trade question

Remote prices already exist as `priceEstimate` in the knowledge map, and a survey record already carries `stocksEstimate` and `priceEstimate`. So the recommended channel answers "are remote prices knowable?" without new machinery: yes, as a dated report, at the cost of a survey or an officer's voyage. That keeps the rule that a remote figure is an estimate, not a price. It matches the Pirates! Traveler precedent.

These items need a joint decision with the economy-pacing work:

- **Own-faction remote prices.** `view-model.ts` shows faction-held markets as live truth. That is why an `exact` price is "only good for one tick" (6.63 quoted, 6.06 paid). Either keep the live feed and publish drift, or treat faction territory as a faction report with an age.
- **Remote `taxRate`.** It is a public fact, and publishing it is projection-only. It changes the net margins pacing is tuned against.
- **Decay rate.** `freshness` uses one 72-tick constant for garrison and prices alike. If pacing changes how fast prices drift, prices may need their own rate. The autonomous planner reads `believedPrice`, so changing it moves the hashes.
- **Travel cost and depth limit.** Both are open economy items, and both change what a report is worth. They should land before tuning survey cost.
- **Rumor and fact share one JSON shape.** Splitting estimates from quotes is projection-only but breaks the dashboard contract. It should be designed once, with the trade panel.
- **Hash sequencing.** Pacing will move the golden hashes and this slice should not. Merge order decides who regenerates the fixture.

## Recorded with M17

The pacing milestone took the joint items above. The rest of this brief stays a proposal.

- Own-faction remote prices stay a live feed. Each live board also publishes `priceDrift`, the change one quiet tick of production and local use would make. They were not turned into an aged faction report.
- Remote `taxRate` is published, and the Crown Harbor ↔ Glassport route that beats `work` is scored after that 14% tax.
- Prices decay on an 18-tick horizon. Garrison beliefs stay on 72. `believedPrice` uses the price horizon, so the golden hashes moved again inside M17.
- Passage cost and the shared market-depth limit are in M17, ahead of any survey-cost tuning.
- Price JSON is still one figure plus `priceQuote`. Rumor and quote are not split.
- A settlement with no report projects `stocks` and `prices` as null.

## Open questions for the owner

1. Should ground be recorded on every direct observation instead of requiring `survey`? It is simpler, but it moves the golden hashes.
2. Does a relayed report keep the observer's confidence, or lose some per hop?
3. Should rivals standing in faction-held ports keep exact condition and capability (hazard 4)?
4. Should an offshore member of the holding faction keep reading that port's live garrison? `dashboardState` in `src/dashboard/view-model.ts` sets `exact` when `settlement.factionId === commander.factionId` and copies the live settlement, including garrison. `projectGarrisonIntelligence` then returns `source: "owned"`, `observedTick` equal to `world.tick`, and `ageTicks` 0, even when the commander is in another port. The owned branch says those records stay the live board from another of the faction's ports. [garrison-regrowth-001](../playtests/garrison-regrowth-001.md) read Cinder Key from Crown Harbor at tick 100 (garrison 14) and tick 139 (garrison 7) while World Government held it. Left as is for now.
5. Should movement stay a public global feed, or become observed behavior (hazard 5)?
6. May a captive reveal only beliefs, or also their chain of command's orders? What does interrogation cost in relationships?
7. May an informant sell another character's beliefs if anonymized, and at what price?
8. Should seeded hearsay keep being generated from perturbed tick-0 truth?
9. Should a foreign faction's strength appear as a labelled partial sum, or stay null until more channels exist?
