# Political layer

**Status: Open.** Proposal for the owner to accept, change, or reject. Current code is `main` at `709608e0ec8dc63c805be6d02d89578beb528af3` (PR #34 merged). The regency below was applied in a local harness after each `runTick` and was not left in the tree. This note is not decided until it moves into [world simulation](world-simulation.md). M25, one open order per issuer and recipient, is already on this tree. M26 (the paid haul), M27 (a day closes an unsigned report), M28 (a landless raid at garrison 8), and M29 (an outscoring attacker wins a major that ends on the morale test) are accepted and not built. This slice does not issue, amend, confirm, or retarget an order, and it does not change a battle or the raid gate.

Runs are `createPrototypeWorld` plus `runTick`, no player commands, seeds 1847 / 2718 / 4096, 1200 ticks, Node v24.21.0, ICU 78.3. A figure at tick 0 is the world before any `runTick`. A figure at tick 400 or 1200 is the world after that many calls (`world.tick === 400` or `1200`). Tick numbers on events are the `tick` field. `npm test` on this tree passes, 176 tests. The 72-tick hashes match `tests/fixtures/golden-hashes.json`:

| Seed | State hash | Events |
| ---: | --- | ---: |
| 1847 | `d7eb02eb0e6b835ee923147b855d0a91969a416115d0c3bd5c2650ff0e2b6a3f` | 8275 |
| 2718 | `d0b4b449ce9bc3fc27f0cfa15a5cc8ef04d5a2e6a9cdded2c2b11b6c4ca6583d` | 8489 |
| 4096 | `d5d9da8bb1e9c9bd86c93ccbaa570f04ea9052ea1b5d4b48f3452e2db6f0c0c7` | 8003 |

Unmodified event counts at 1200 ticks are 162302, 166064, and 162558. Those match the counts in [battle morale](battle-morale.md).

## The problem

[Game vision](game-vision.md) says the satisfying week is a change in who holds power: winning office, founding a faction, breaking an alliance, enabling a rebellion. [World simulation](world-simulation.md) describes offices, a deputy who covers an absent officeholder, a leader who sets the tax, and secession. [Roadmap](../roadmap.md) records offices, secession, and faction creation as untracked absences. The playable world has factions, orders, captivity, and a treasury, and it has no person the player can point to as the one in command.

M28 and M29 stay first. Both are accepted and unbuilt. M28 regenerates seed 2718 to `edbface2…` with 8486 events. M29 is hash-neutral through tick 72 once that regeneration has landed. M27 re-baselines all three seeds. This slice is measured against today's fixture, before any of those land.

## What the simulation already models

### Factions and membership

`Faction` (`src/sim/types.ts`) is `id`, `name`, `color`, `treasury`, and `taxRate`. It has no members list and no office. Membership is `character.factionId`, set once in `makeCharacter` (`src/sim/scenario.ts`): the first 13 characters are World Government, the next 9 are Free Tide, and `character-23` through `character-30` are null. `resolveSettlementClaim` writes the claimer's `factionId` onto the settlement. It does not write a faction onto the claimer. Across 1200 ticks on all three seeds the member id lists are unchanged: 13, 9, and 8.

### Leaders

There is no leader field. `orderFor` (`src/sim/scenario.ts`) hardcodes the issuer: World Government orders come from `character-01`, Free Tide orders from `character-14`, and the issuer receives no order. Those two indexes are the veterans (`index === 0 || index === 13`). `partyPower` (`src/sim/state.ts`) multiplies troop power by `leaderEffect` (`1 + leadership / 220`). That is a skill coefficient on a party, not a seat.

`character-01` is Mara Vane, archetype `officer`, and the human controller. `runTick` (`src/sim/engine.ts`) gives a human upkeep and travel, then skips plan review and decisions. With no player commands she never fights. `character-14` is Pax Ash, archetype `raider`, placed at Crown Harbor, and he does fight. The seat is that hardcoded issuer. On seed 2718 his loyalty is 0.533, below several other Free Tide members. His score is still the highest in the faction because his leadership is 81.

### Officers, ranks, and roles

The word officer is an archetype, a briefing job, or a person carrying an order. It is not a rank.

Archetypes cycle `officer`, `merchant`, `explorer`, `raider`, `steward`. `personalityFor` draws an officer's loyalty from 0.75 to 0.98 and everyone else's from 0.3 to 0.85. Six characters are archetype officers: three in World Government including Mara, two in Free Tide, and `character-26` unaffiliated. An officer can rank below a steward, because the score used at setup is leadership plus loyalty times 50. On seed 1847 Mara Calder (`character-21`, officer, loyalty 0.971, leadership 30) scores 78.548, and Dax Pike (`character-20`, steward) scores 107.296.

`reportingOfficerId` lives on the player, not the faction. `createPrototypeWorld` sets it once: the autonomous faction mate with the highest `leadership + loyalty * 50`, ties broken by id. `assignReportingOfficer` (`src/sim/briefing.ts`) is the only writer after that, and it is a player command. The eligible list in the briefing sorts by leadership alone. The reporting officer may bundle routine notices. The view model does not let that officer close an order. On these runs the officer is Jun Marrow (`character-05`), Iris Stone (`character-06`), and Rook Tern (`character-11`). The id is the same at tick 1200. None of the three is captured. `reporting-officer-assigned` is emitted 0 times.

No `office`, `appointment`, `patronage`, `governor`, or `law` token exists under `src/`. The only `secede` hit is a conversation tag in `classifyMessage` (`src/sim/conversations.ts`).

### Loyalty and relationships

`personality.loyalty` is read by `assessStandingOrder`, by the `serve-faction` goal score, and by the `work` candidate. Nothing writes it after `personalityFor`. On every seed the value at tick 0, tick 400, and tick 1200 is the same number for all 30 characters.

`Relationship` (`src/sim/types.ts`) is trust, affinity, respect, fear, grievance, obligation, and `lastChangedTick`. Setup writes one tie from each subordinate to the issuer, biased by `loyalty * 0.18`, and one tie to a co-located neighbor when that pair has none. Two writers run after that. `evolveLocalRelationship` (`src/sim/engine.ts`) picks one companion on the same island once per day, per character, and raises trust by 0.012 for a shared faction or 0.004 otherwise. A new tie starts at trust 0.28. `recordBattleConsequences` shifts the tie to the issuer of one standing order after a victory or a defeat: trust moves by +0.012 or −0.025. Neither writer reads or writes loyalty.

### Orders and the chain of command

Twenty standing orders exist at tick 0, all `pending`, all minted by `orderFor`. Twelve name Mara. Eight name Pax. Merchants get `trade-supplies`, explorers get `explore`, a Free Tide raider gets `pressure` on `world-government`, and the rest get `protect` on Crown Harbor or Cinder Key. Unaffiliated characters get none. `standing-order-issued` fires only from the player command `issue-order` (`src/sim/commands.ts`), which refuses a recipient outside the issuer's faction. These runs emit that event 0 times. No autonomous character mints an order.

`assessStandingOrder` (`src/sim/agency.ts`) scores obedience from the order's priority, loyalty, trust, respect, alignment, obligation, grievance, and caution times a directive risk. The threshold is `0.54 + ambition * 0.08`. A pending order the character will not obey is refused once, inside `recordOrderAssessment`, on the first plan review. An order already `active` counts as complied with. `activeStandingOrder` considers `pending` and `active` only. `awaiting-confirmation` no longer drives the plan.

Confirmation is a player command. The issuer signs their own report. These runs have no player, so a completion report stays open. That pile is the gap M27 closes. This note does not close it, and a person covering the seat does not become the signer.

### Treasury, tax, and stability

`taxRate` is 0.14 for World Government and 0.08 for Free Tide, set in `createPrototypeWorld` and present unchanged at tick 1200. No command writes it. `tradeTax` (`src/sim/engine.ts`) adds `gross * taxRate` to the treasury of the faction that holds the settlement, on `worked` and on a sale. A buy pays no tax. A neutral port pays none. While a faction holds no port, work done on someone else's island pays the holder. `factionPower` adds `treasury * 0.012`.

`produceSettlements` adds 0.03 stability when the provision shortage is 0, and subtracts `shortage * 0.35` otherwise, clamped to 0–100. A battle subtracts 12 stability on an attacker victory and 3 on a defeat, in `resolveImmediateBattle`. `resolveSettlementClaim` raises stability to `CLAIM_STABILITY_FLOOR` (55) when it is lower. Stability is not an office, and it does not move loyalty.

### Death and captivity

Health is clamped to 1 in upkeep, in battle, and on escape. There is no age, no death event, and no removal from `characters`. The only character at health 1 after 1200 ticks is Mara, on every seed. That is the idle commander already recorded in the progress log: she never orders food. She is still the issuer, still in the faction, and still not captive.

`attemptCapture` (`src/sim/engine.ts`) writes `captivity` and emits `character-captured`. The release tick is `capturedTick + 14 * ticksPerDay`. `ticksPerDay` is 6, so the hold is 84 ticks. `processCaptivityDeadlines` emits `captivity-released` with `daysHeld`. Escape is the player command `escape-captivity`. These runs emit `captivity-escaped` 0 times. Capture does not clear `factionId`, standing orders, or `reportingOfficerId`. While captive, `runTick` skips the character after the deadline check. `partyPower` of a captive is 0.

### What is missing in play

The faction row from `projectFactions` (`src/dashboard/visibility.ts`) shows name, color, tax, and, for the commander's own faction, treasury and power. It does not show a person. A rival's treasury and power are null. Membership and location are already public on the character row. The player can see that Pax is in Free Tide. The player cannot see that Pax is the one whose orders the others carry, or that Pax is in prison and the seat is empty. A capture does not name a successor. A death cannot, because a death does not happen. Loyalty cannot show a grievance building, because loyalty does not move. A refused order is a one-time opening judgment, and the refusal has no further political result. Settlement `ownerId` is the personal conqueror from a claim. It is not this seat: at tick 1200 the command issuer is still Mara or Pax, whoever owns the ports.

## Measured on today's rules

### Captivity

No character dies. Completed holds last 84 ticks, `daysHeld` 14, on every completed capture. Cause is `major-defeat` or `failed-retreat`.

| Seed | Captures | Pax Ash (the Free Tide issuer) | Archetype officer | Reporting officer | Still captive at tick 1200 |
| ---: | ---: | --- | --- | ---: | --- |
| 1847 | 11 | 551–635, 837–921, 1116 onward | Iris Stone 1056–1140 | 0 | Pax, due at tick 1200 |
| 2718 | 4 | none | Corin Hale 118–202 | 0 | Mina Vale, from 1178 |
| 4096 | 11 | 310–394, 422–506, 1121 onward | Corin Hale 403–487 | 0 | Pax, from 1121; Finn Frost, from 1147 |

The first capture of anyone is tick 12 (Sable Morrow, seed 4096). The first capture of an issuer is tick 310. The first capture of an archetype officer is tick 118. Both are after tick 72. Mara is captured 0 times. World Government's issuer never leaves the seat in a run with no player commands. There is no office, so there is no vacancy interval to report. `reportingOfficerId` does not change for 1200 ticks.

### Loyalty

Below 0.5 means below half the trait and below the officer seed floor of 0.75. The counts are the same at tick 0, 400, and 1200.

| Seed | World Government | Free Tide | Unaffiliated | Of 30 |
| ---: | --- | --- | --- | ---: |
| 1847 | 2 of 13, mean 0.683, range 0.348–0.967 | 2 of 9, mean 0.671, range 0.322–0.971 | 3 of 8, mean 0.622 | 7 |
| 2718 | 4 of 13, mean 0.609, range 0.307–0.875 | 2 of 9, mean 0.703, range 0.383–0.978 | 2 of 8, mean 0.673 | 8 |
| 4096 | 2 of 13, mean 0.657, range 0.431–0.979 | 4 of 9, mean 0.576, range 0.311–0.825 | 1 of 8, mean 0.608 | 7 |

Mara's loyalty is 0.808, 0.875, and 0.792. Pax's is 0.708, 0.533, and 0.745. A defeat updates goals and the issuer tie. It does not update loyalty. The opening refusals below are the only obedience judgments in the run, and they use the tick-0 loyalty.

### Relationships

Ties held by members of a faction. The count is every relationship on those characters, not a pair counted twice.

| Seed | Tick | World Government | Free Tide | Unaffiliated |
| ---: | ---: | --- | --- | --- |
| 1847 | 0 | n=25, trust 0.551 (0.362–0.750) | n=17, trust 0.584 (0.433–0.721) | n=8, trust 0.522 |
| 1847 | 400 | n=226, trust 0.324 (0.284–0.794) | n=165, trust 0.325 (0.284–0.707) | n=152, trust 0.301 |
| 1847 | 1200 | n=320, trust 0.338 (0.284–0.975) | n=236, trust 0.334 (0.284–0.779) | n=204, trust 0.312 |
| 2718 | 0 | n=25, trust 0.571 (0.350–0.736) | n=17, trust 0.593 (0.385–0.807) | n=8, trust 0.570 |
| 2718 | 400 | n=223, trust 0.328 (0.284–0.776) | n=168, trust 0.325 (0.284–0.798) | n=146, trust 0.305 |
| 2718 | 1200 | n=314, trust 0.341 (0.284–1.000) | n=226, trust 0.341 (0.284–0.950) | n=201, trust 0.315 |
| 4096 | 0 | n=25, trust 0.584 (0.355–0.763) | n=17, trust 0.537 (0.396–0.714) | n=8, trust 0.494 |
| 4096 | 400 | n=223, trust 0.330 (0.284–0.772) | n=163, trust 0.321 (0.284–0.786) | n=159, trust 0.301 |
| 4096 | 1200 | n=307, trust 0.345 (0.284–1.000) | n=224, trust 0.333 (0.284–0.834) | n=208, trust 0.313 |

The mean falls because `evolveLocalRelationship` adds ties that start at 0.28. The floor at tick 400 and tick 1200 is 0.284 on every faction. The original ties to the issuer move the other way. Mean trust toward the issuer, World Government then Free Tide: seed 1847 is 0.625 / 0.609 at tick 0, 0.653 / 0.637 at tick 400, and 0.703 / 0.669 at tick 1200. Seed 2718 is 0.625 / 0.664, 0.647 / 0.674, and 0.702 / 0.739. Seed 4096 is 0.636 / 0.586, 0.655 / 0.606, and 0.723 / 0.637. Grievance toward the issuer stays under a mean of 0.12.

`relationship-changed` fires 4065, 4221, and 4146 times. Almost all of those are shared time at a named port. The battle triggers are 14 victories and 16 defeats under standing orders on 1847, 18 and 11 on 2718, and 11 and 15 on 4096.

A successor ranked by mean trust would be ranking a pile of new ties at 0.28. Loyalty is the input that stays still. The proposal uses loyalty.

### Orders

All 20 orders are judged on tick 0. Accepted: 14, 14, and 16. Refused: 6, 6, and 4. None remain `pending`. `standing-order-issued`, `standing-order-amended`, `standing-order-cancelled`, `standing-order-expired`, and `standing-order-completed` fire 0 times.

The refusals, with obedience and threshold:

| Seed | Character | Directive | Obedience | Threshold |
| ---: | --- | --- | ---: | ---: |
| 1847 | Sable Morrow | protect | 0.595 | 0.616 |
| 1847 | Vale Drake | explore | 0.583 | 0.591 |
| 1847 | Orin Rill | protect | 0.571 | 0.602 |
| 1847 | Kessa Calder | protect | 0.573 | 0.596 |
| 1847 | Finn Frost | explore | 0.530 | 0.600 |
| 1847 | Bram Tern | trade-supplies | 0.564 | 0.596 |
| 2718 | Niko Wren | explore | 0.542 | 0.599 |
| 2718 | Sable Morrow | protect | 0.571 | 0.611 |
| 2718 | Orin Rill | protect | 0.522 | 0.608 |
| 2718 | Kessa Calder | protect | 0.519 | 0.593 |
| 2718 | Mina Vale | protect | 0.471 | 0.591 |
| 2718 | Bram Tern | trade-supplies | 0.525 | 0.563 |
| 4096 | Jun Marrow | protect | 0.553 | 0.599 |
| 4096 | Orin Rill | protect | 0.534 | 0.606 |
| 4096 | Mina Vale | protect | 0.473 | 0.565 |
| 4096 | Finn Frost | explore | 0.540 | 0.564 |

Deviation events: 214, 16, and 230. Resumption events: 214, 16, and 229. At tick 1200 one order on seed 4096 is still `deviating`, and its plan still carries that order. Every other deviation has resumed. Decisions whose plan carries an order: 960, 75, and 948, out of 27019, 27673, and 27116 decisions. Seed 2718 has no `active` order left by tick 400, which is why its deviation count is 16. Completion reports: 13, 14, and 15. At tick 1200 the statuses are awaiting confirmation 13 / 14 / 15, refused 6 / 6 / 4, and still active 1 / 0 / 1. Zero reports are confirmed.

### Treasury

Tax stays 0.14 and 0.08. Opening treasuries are 18000 and 2800.

| Seed | Tick 200 | Tick 400 | Tick 600 | Tick 800 | Tick 1000 | Tick 1200 |
| ---: | --- | --- | --- | --- | --- | --- |
| 1847 | 25611.72 / 3363.89 | 30778.04 / 5814.97 | 35785.16 / 7313.90 | 41036.85 / 8039.97 | 47458.08 / 8493.55 | 51112.19 / 9712.21 |
| 2718 | 21937.29 / 5967 | 29728.95 / 6999.27 | 34160.57 / 8930.11 | 41153.97 / 9057.85 | 44347.93 / 11356.90 | 49590.73 / 12073.02 |
| 4096 | 25996.63 / 3304.48 | 34111.77 / 3885.84 | 39779.81 / 5075.16 | 44000.90 / 6813.55 | 49594.88 / 8000.26 | 56300.30 / 8000.26 |

The pair is World Government then Free Tide. On seed 4096 Free Tide is 8000.26 at tick 1000 and at tick 1200. At tick 1200 that faction holds no port. The treasury does not move when nobody is paying its tax.

Opening stability is Crown Harbor 91, Glassport 86, Cinder Key 73, Verdant Cay 78. At tick 1200 Verdant Cay is still unowned, garrison 103, stability 100, on every seed. Crown Harbor on seed 4096 is still World Government, owner null, garrison 225, stability 99.75. The other faction ports sit between stability 54.38 and 59.60, under a personal `ownerId` from a claim. That owner is not the command issuer.

## Proposal: name the command seat, and cover it during captivity

The smallest visible politics is the seat the orders already imply.

The holder is the single `issuerId` on that faction's standing orders. Today that is Mara for World Government and Pax for Free Tide. The field is not stored at creation. The projection reads the orders. While the holder's `captivity` is null, the seat shows that person.

When `character-captured` fires for the holder, write `actingCommanderId` on the faction. The acting member is the faction mate with the highest `skills.leadership + personality.loyalty * 50`, excluding the holder and excluding anyone whose `captivity` is set. A tie breaks toward the lower id, the same comparison `createPrototypeWorld` uses for the reporting officer. No new draw. The sort does not read trust, grievance, troops, or location.

The acting member keeps that id until the holder's `captivity-released` deletes the key, or until the acting member is themselves captured, in which case the same sort runs again. Deleting the key, rather than storing null, leaves the faction object shaped as it is today once the holder is free. The acting member does not receive the orders, does not confirm a report, does not set the tax, and is not read by `reviewPlan` or `buildCandidates`. M27 still signs, or times out, on the original issuer. The reporting officer stays the briefing job.

Death is not a trigger. There is no death to succeed. The idle commander's health of 1 leaves her in the seat.

A live recompute each tick would change the name when a higher-scoring prisoner is released, without a new capture of the holder. On seed 4096, Pax's captivity from tick 422 to 506 starts while Corin Hale is already captive (403–487). The locked choice is Bram Tern (`character-22`, score 87.974) for all 84 ticks. A live recompute would switch to Corin (score 97.227) for the last 19 ticks, 487 through 506. The lock is the rule. Those 19 ticks are the only disagreement in the three runs. No acting member was captured during a regency, so the "next person steps up" branch did not fire. It is still the rule.

Regencies over 1200 ticks, all of them Free Tide, all of them Pax in prison:

| Seed | Interval | Acting | Length |
| ---: | --- | --- | ---: |
| 1847 | 551–635 | Dax Pike (`character-20`, steward, score 107.296) | 84 |
| 1847 | 837–921 | Dax Pike | 84 |
| 1847 | 1116 onward | Dax Pike | open at tick 1200 |
| 2718 | none | Pax's loyalty is 0.533 and he is never captured | |
| 4096 | 310–394 | Corin Hale (`character-16`, officer, score 97.227) | 84 |
| 4096 | 422–506 | Bram Tern (`character-22`, merchant, score 87.974) | 84 |
| 4096 | 1121 onward | Corin Hale | open at tick 1200 |

World Government has none. If Mara were captured, the same sort would name the current reporting officer: Jun Marrow, Iris Stone, or Rook Tern. That is the same key applied to the same faction. It is not a merging of the two jobs. She is not captured in these runs, so that row was not written.

### State, events, and RNG

`actingCommanderId` is omitted until a holder is captured, then removed when that holder is released. The write sits on the existing `character-captured` and `captivity-released` reducers. No new event type. The chronicle already says who was captured and, on release, how many days they were held. The panel is what gains the name. No `rng.next()` and no `rng.pick`. The rank is a sort of fields that do not change.

### What the player sees and can do

`projectFactions` gains `commanderId` and `actingCommanderId` on every faction row, own and rival. Both are public in the way `factionId` and `taxRate` are public. Treasury and power stay null on a rival. At tick 0 the player sees Mara in command of World Government and Pax in command of Free Tide, with no acting name. While Pax is captive the Free Tide row names the acting member. When he is released the row names Pax again.

The player cannot appoint a commander, cannot refuse the cover, and cannot hand the seat to someone else. `assignReportingOfficer` is unchanged. Giving the acting member the issuer's orders, or letting them sign reports, is out of this slice.

### Fixture impact

The harness set `actingCommanderId` after each tick under the rule above and left decisions and the RNG alone. Tick-72 state hashes and event counts match the fixture on all three seeds. End-of-tick hashes also match an unmodified run at ticks 200, 309, 310, and 400 on every seed, because no regency is open at those ticks. The capture at event tick 310 is inside the tick that advances the world to 311, so the snapshot at `world.tick === 310` is still the previous tick.

At tick 1200 the hash matches the unmodified run on seed 2718, where the field was never set. It differs on 1847 and 4096 because Pax is still captive and the field is `character-20` and `character-16`. The capture event stamped 310 is applied on the tick that leaves `world.tick === 311`, so the hash taken at `world.tick === 310` still matches, with the field unset. The golden fixture does not pin tick 1200. `npm run golden:update` stays unrun. This slice does not ask M28 to regenerate 2718, and it does not add a second regeneration after M27. The first regency is tick 310.

## Tests

`npm run golden:update` stays unrun. The fixture already matches.

- `tests/simulation.test.ts`, beside the landless-faction case. After a forced `character-captured` on Pax, Free Tide's `actingCommanderId` is the top free member by `leadership + loyalty * 50`. Mara's capture names the same character `reportingOfficerId` already holds on that seed. The holder's standing orders, `taxRate`, and `rngState` are unchanged. `captivity-released` on the holder deletes the key. A second capture, with the top member already captive, names the next member. That is the Bram Tern case.
- `tests/redaction.test.ts`, beside the landless rival-faction case. A rival row carries `commanderId` and `actingCommanderId` and still has treasury null and power null. The commander's own row shows Mara and a null acting id at tick 0.
- `tests/agency.test.ts`. An active order is not retargeted, refused, or confirmed because the issuer is captive. `reviewPlan` does not read `actingCommanderId`.
- `tests/golden.test.ts`. "pinned seeds reproduce their committed state hash and event count" stays on `d7eb02eb…`, `d0b4b449…`, `d5d9da8b…` (8275, 8489, 8003).

## Playtest

Follow `docs/playtests/TEMPLATE.md`. Dashboard HTTP JSON only, as in [battle morale](battle-morale.md#playtest). Seed 4096, Mara Vane (`character-01`), ticks 0–400. No survey, no raid, no other command. She starts at Crown Harbor. The captivity under test is Pax Ash's, not hers.

**Hypothesis.** Free Tide's command is Pax at tick 0, Corin Hale while Pax is captive from tick 310 to 394, and Pax again at tick 400. World Government's command stays Mara. The tick-72 hash stays `d5d9da8b…`.

**Ambition.** Stay at Crown Harbor. Read the faction list at the start, once during the captivity, and again after the release.

**Success.** At tick 0, World Government `commanderId` is `character-01` and Free Tide's is `character-14`, both `actingCommanderId` null, Free Tide treasury null. At tick 320, Free Tide's acting id is `character-16` (Corin Hale) and Pax's character row is captive. At tick 400, Free Tide's acting id is null and the commander is Pax. The log has `character-captured` for Pax at tick 310 and `captivity-released` at tick 394 with `daysHeld` 14. No new event type appears. Mara is still the commander, and she was not captured.

`PROMOTE` if those three reads match and the tick-72 hash is unchanged. `REVISE` if the acting name flips to Corin before tick 394, or if a rival treasury becomes a number. `ABANDON` if the tick-72 hash moves.

Seed 2718, same ambition, read at tick 0 and tick 400, is the confirmation that a run with no issuer capture never shows an acting name. Pax stays `character-14`.

## Later slices

**Secession.** The design says a settlement owner who declares separation leaves immediately, the old faction is notified, and population, garrison, and local characters each decide whether to follow. `ownerId` is already written by a claim, and on these runs it is often set by tick 1200, so the person who could declare already exists. The follow-or-stay decision does not. Loyalty cannot be the trigger: it is the same number at tick 1200 as at tick 0. The trigger is the declaration. It depends on that owner, on a record of the break, and on a rule for who comes along. This slice does not add the declaration.

**Faction creation.** The design says that after a separation holds, the owner may found a faction, stay independent, or seek membership, and that creating a faction is one of the ways power changes. A new faction needs a record, a treasury, and a membership move. The landless-faction note left the treasury split out, and these runs never move the eight unaffiliated characters into either faction. Founding depends on secession, or on a separate founding act for someone who holds no port. This slice does not add the record.

## Questions for Micah

1. **While the person in command is in prison, does someone else cover the seat?** Default: yes. The commander takes it back when they are released. Prison lasts 14 days on these runs, every time. Nobody dies, so the seat is not given away for good. Today the seat is not shown, and prison changes nothing about who issues orders.
2. **Who covers it?** Default: the faction member with the highest leadership plus loyalty, skipping anyone who is also in prison. The lower id wins a tie. That is the ranking the setup already uses to pick a reporting officer. Trust is not used, because most ties are new and sit near 0.28, while loyalty does not move. On these runs the cover is Dax Pike, nobody, and Corin Hale or Bram Tern.
3. **Can you name someone else, or keep the cover after the prisoner is free?** Default: no. This slice only covers the absence. Choosing a commander, and a permanent change of seat, wait until a later slice. The reporting officer stays a separate job.
4. **Who is allowed to see who holds the seat?** Default: everyone, including a rival. You can already see who belongs to a faction. You still cannot see a rival's treasury.
5. **If the person covering the seat is captured too, does the next person step up?** Default: yes, by the same ranking. It did not happen in these 1200 ticks. On seed 4096 the alternative, recomputing every tick, would have replaced Bram Tern with Corin Hale for the last 19 ticks of one absence, because Corin walked out of prison first. The default keeps Bram for the whole 14 days.
