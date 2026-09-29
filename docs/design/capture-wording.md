# Capture wording

**Status: Open.** Wording only. No rule was left in the tree. The wording runs in this note were remeasured on `d8ad16c` (PR #63, M32 sea sightings), the `origin/main` merged into this branch. M29.1, the dock capture on an outscore win, and M30, the acting commander while captive, are built. M32 derives the sea row when the state is read and does not write the world. [Outscore dock capture 001](../playtests/outscore-dock-capture-001.md) and [command seat 001](../playtests/commander-seat-001.md) flagged the sentences in sections 1–3. [Loyalty scar 001](../playtests/loyalty-scar-001.md) flagged sections 4–9. [Sea sightings 001](../playtests/sea-sightings-001.md) flagged section 10.

Runs are `createPrototypeWorld` plus `runTick`, seeds 1847 / 2718 / 4096, Node v24.21.0, ICU 78.3. Tick numbers on events are the `tick` field. A figure at tick 72 or tick 1200 is the world after that many `runTick` calls. `npm test` on this tree passes, 242 tests. M32 did not move the fixture. `src/sim` is unchanged from `ee9eb6e`, and the committed 72-tick fixture reproduced, including the recovery replay of 572 events:

| Seed | State hash | Events |
| ---: | --- | ---: |
| 1847 | `cb04ba5d392d8b1c868cc97e54cb21b21ec171edd546bb70d0d7aba86cc69c11` | 8301 |
| 2718 | `bd7d8cc44d5fa21022ecb8f8086e13dfbb9475eb025b5ae53f87e2991f90035c` | 8513 |
| 4096 | `20975bf480e5aa11eeafe1ce39c36cf5ba0fa8e2d5de2bb5887a35d7b3aecc9f` | 8031 |

The same three seeds at 1200 ticks, unmodified, are the comparison below. Remeasured on `d8ad16c`. The rows did not move. The event counts and the event-body hashes are the same as on `8db4706`. The scar stores `loyaltyAdjustment` on the character and does not write the event log, so the log at 72 and at 1200 matches that earlier tree. The state hashes moved. `stateHash` is the canonical world. It does not include the event log and it does not include a dashboard sentence. The event-body hash is sha256 of the canonical JSON of the events, each as sequence, tick, type, `actorId`, `targetId`, `settlementId`, and data, with a missing id stored as null. The golden fixture does not store that hash. It stores the state hash and the event count.

| Seed | State hash | Events | Event-body hash |
| ---: | --- | ---: | --- |
| 1847 | `95bd71dc877f4e12c77ba2f07a2f10f8e076fc32deaf997dd4cf5e4fa7d011b5` | 164313 | `fa487dcbe7af52ed4128c0b27560c3b307e4ac405df975feaa6a4acd8fd5ed8a` |
| 2718 | `55d48cbbdeb6e562ca4002d6e22a713a9977175e06e0383b36a3af015e53c57d` | 165434 | `6673109c20b943ecd77e3ab76ea7bf73a23cdd9b32e4e1c0094571ec3d8fffe5` |
| 4096 | `f5355c1a254bd3df4924fd784da645b770cf01bafe6d73d8d9c99a82446715df` | 164691 | `e7bbe6cc25a8be6f1e5e288ab5912c6b72f45f8b85e8d6a24ad20d7b3d3ad35b` |

The same event-body hash at 72 ticks, not stored in the fixture:

| Seed | Event-body hash at 72 |
| ---: | --- |
| 1847 | `de2c5ee6b08fc9518fd2f76557c4626c816ad264c5dda8e3e753e8437f60ce00` |
| 2718 | `495f638b16b30c14b8e04a5081e6323ec89b15d886070ac4b3d3ee6f6e93cff6` |
| 4096 | `6537378b713f4539f69d165fba67af808d1e78c2c439a8e2145e2c8f936dd186` |

The sentences are built when the state is read.

- `eventSummary` in `src/dashboard/view-model.ts` is the briefing sentence, and the feed sentence when the payload is visible.
- `projectEvent` in `src/dashboard/visibility.ts` keeps that sentence only when the payload is visible. Otherwise the feed row is the actor's name, a colon, and the event type.
- `eventStory` in `src/sim/reports.ts` is the chronicle line in `report.md`.
- `checkInBriefing` writes the captivity card. `dashboardState` returns the stored player, so `displayName` is the string on that record. `projectFactions` publishes `commanderId` and `actingCommanderId` and no sentence.
- `attemptCapture` stores the prisoner as `actorId` and the captor faction as `targetId`. `applyEvent` puts the captivity on that actor. The roles are how the world is updated.

Sections 1–9 were patched in together on this tree, measured, and removed. With that patch applied, `npm test` still passed, 242 tests. The 72-tick rows and the 1200-tick rows above matched, including both event-body tables. Calling `dashboardState` left each state hash in place. The sentences quoted under those sections were read again on this tree. They match the earlier read: the event log did not move. Line numbers below are this tree. Seed 4096 at state tick 476 is `132d7ca24e69aee0369bde71555a4d1a4bc975ddd49409fccba4ff0258fee9c9`, with 59717 events. Glassport is still `world-government`.

## 1. Name the captor

The prisoner is the event actor. The captor faction is the target. A withheld feed row is read as "actor did this to target."

Current template, `src/dashboard/view-model.ts` line 99:

```text
`${actor} was captured at ${settlement} after ${String(event.data.cause).replaceAll("-", " ")}`
```

Withheld feed, `src/dashboard/visibility.ts` line 615:

```text
`${actor}: ${event.type.replaceAll("-", " ")}`
```

Chronicle, `src/sim/reports.ts` line 214:

```text
`**${actor}** was captured at **${settlement}** after ${String(event.data.cause).replaceAll("-", " ")}; their surviving troops scattered.`
```

The emit is `src/sim/engine.ts` lines 640–641: `actorId: character.id`, `targetId: captivity.captorFactionId`.

Seed 4096, state tick 476, the same checkpoint as the dock playtest. Sequence 59637, event tick 475, `actorId` `character-11`, `targetId` `free-tide`, `settlementId` `glassport`, `payloadWithheld` true. Feed: `Rook Tern: character captured`. Briefing `event:59637`: `Rook Tern was captured at Glassport after outscore loss`. Chronicle, from `writeReports` on that run:

```text
- Day 79.2: **Rook Tern** was captured at **Glassport** after outscore loss; their surviving troops scattered.
```

The same function on other causes. Seed 2718, the seat play, sequence 3932, payload visible, so the feed and the briefing are the same: `Mara Vane was captured at Cinder Key after failed retreat`. Seed 4096, sequence 2098, Dax Pike, cause `major-defeat`, target `world-government`: the withheld feed is `Dax Pike: character captured`, and the briefing sentence is `Dax Pike was captured at Glassport after major defeat`.

Sequence 3933 is a different row. `player-command-resolved` at `src/dashboard/view-model.ts` line 63 turns the outcome into `Mara Vane: character captured`. The actor there is the player who issued the retreat. This note leaves that row.

Proposed sentences, from the patched read of those same runs:

- `Free Tide Compact took Rook Tern on the dock at Glassport after Pax Ash won there on a higher score`
- `Free Tide Compact took Mara Vane at Cinder Key after failed retreat`
- `World Government took Dax Pike at Glassport after major defeat`

The feed uses that sentence even when `payloadWithheld` stays true. On the playtest page, sequences 59518 through 59717, sequence 59637 came back withheld and the summary was the Rook sentence above. `data` stays null. A read that is handed only the capture event, with no `battle-resolved` beside it, cannot see Pax's name. That read produced `Free Tide Compact took Rook Tern on the dock at Glassport after the attacker won there on a higher score`. The dashboard page and the briefing window of the newest 5,000 events both contain sequence 59635, so the player-facing read names Pax.

Chronicle line from the same patched `writeReports`:

```text
- Day 79.2: **Free Tide Compact** took **Rook Tern** on the dock at **Glassport** after **Pax Ash** won there on a higher score; their surviving troops scattered.
```

`eventSummary`, `projectEvent`, and `eventStory` change. The captor name is `world.factions[event.targetId].name`, falling back to `data.captivity.captorFactionId` when a test event has no target. The winner is the actor of the `battle-resolved` event whose `data.battleId` equals the capture's `battleId`. Nothing stored and no event field changes.

This is hash-neutral. The patched read matched every state hash, event count, and event-body hash in the two tables.

The ids on the row are a separate question. `projectEvent` still copies `actorId` and `targetId`. A client that ignores the summary and reads the ids still sees the prisoner acting on the captor faction. Swapping those roles is not projection-only. `applyEvent` puts the captivity on `world.characters[event.actorId]`. The harness pointed `actorId` at the captor faction and `targetId` at the prisoner, and taught the reducer to update the prisoner. The world that came out matched the tables above, at 72 ticks and at 1200. The event log did not. That swap was measured on `8db4706`. This tree has the same event log, so the event-body hashes below still describe it, and the state hash stays on the table at the top. The first capture on seed 1847, tick 34, was stored as `actorId` `free-tide`, `targetId` `character-04`.

| Seed | Ticks | State hash | Events | Event-body hash |
| ---: | ---: | --- | ---: | --- |
| 1847 | 72 | unchanged | 8301 | `42a350bd15ba593a5af59f2cab7bd18368e094b2c8b00d846b82a636b4518b13` |
| 2718 | 72 | unchanged | 8513 | `b91cdfaafee7f08159f248bb58d6b34ce32e0b64be0ab7f649336d46127c7c17` |
| 4096 | 72 | unchanged | 8031 | `938b7c3e36ef60924a1939b0122145129581bf6f148b7ed7b743de28138d354d` |
| 1847 | 1200 | unchanged | 164313 | `be98a6d2a77f605c632b63ad9379b14c4d5dcfdfd6f196d8ae7b5e78c7819b48` |
| 2718 | 1200 | unchanged | 165434 | `a43dd70e92dc40a941b841bd013bca8a542e5d59e02da9ec8ba51f62cf1d7b6f` |
| 4096 | 1200 | unchanged | 164691 | `dc6d13f364e0a541065ceb39e90182ca7fc33881fc789720f6f4fe30e14eea70` |

`npm test` on that swap: 215 passed, 8 failed. The golden test passed. The failures are tests that construct a capture with the prisoner as `actorId`, which then throws `Capture event is missing an entity`, and tests that assert the emitted `actorId` is the prisoner. One of those expected `character-22` and got `world-government`. The swap was removed. The proposal keeps the ids and changes the sentence.

## 2. "after outscore loss"

The cause stored on the hold is `outscore-loss` (`src/sim/engine.ts` line 1199, and the union at `src/sim/types.ts` line 96). The briefing replaces the hyphen with a space, so the prisoner is the subject of "outscore loss."

On the same seed-4096 read, briefing `event:59635` is `Pax Ash won at Glassport`. The template is `src/dashboard/view-model.ts` line 89: the actor won or lost at the settlement. The feed row for that battle stays withheld: `Pax Ash: battle resolved`. The chronicle line before the patch:

```text
- Day 79.2: **Pax Ash** defeated the garrison at **Glassport**. 7 attackers and 2 defenders were lost.
```

The payload on sequence 59635 is `attackerScore` 511.279, `defenderScore` 26.305, `attackerTroops` 219, `attackerHealth` 96.08, `attackerMorale` 3, `defenderGarrison` 6, outcome `attacker-victory`. Morale 3 is what ended it. The standing win needs morale above 12 when the garrison is not 0. This one is the outscore win. The dock playtest, on this same checkpoint, records Glassport still `world-government`. This run reproduced sequence 59637 and 59717 events. The sentence says Pax won the battle and that Rook was taken on the dock. It does not say the port changed hands.

Proposed, from the patched read:

- Briefing, battle: `Pax Ash won at Glassport on a higher score`
- Briefing and feed, capture: `Free Tide Compact took Rook Tern on the dock at Glassport after Pax Ash won there on a higher score`
- Card, a projected `causeLabel` beside the stored `cause`: `taken on the dock after the other side won on a higher score`
- Chronicle, battle: `- Day 79.2: **Pax Ash** defeated the garrison at **Glassport** on a higher score. 7 attackers and 2 defenders were lost.`
- Chronicle, capture: the line in section 1.

`cause` on the card stayed `outscore-loss`. `payloadWithheld` on both feed rows stayed true. The battle feed stayed `Pax Ash: battle resolved`, because that fallback was left in place. The sentence the playtest reads beside the capture is the briefing line.

The "on a higher score" clause is added only when the battle payload rules the standing win out: troops at least 8, health above 15, morale at or below 12, garrison not 0, and a higher attacker score. A finished major with morale above 12 can be a standing win or an outscore win, and the battle event does not carry the phase tally, so that case keeps `won at`. The Glassport fight is the morale-3 case, so the clause is on it.

Quiet seed 1847, state tick 960, Pax's own outscore hold produced `World Government took Pax Ash on the dock at Crown Harbor after Sable Morrow won there on a higher score`. Before the patch the briefing was `Pax Ash was captured at Crown Harbor after outscore loss` and the feed was `Pax Ash: character captured`.

`eventSummary` and `eventStory` gain the score clause. `projectCharacter` and the `captivity.active` block in `dashboardState` copy the hold and add `causeLabel`. The copy is a new object. The character's `captivity.cause` stays `outscore-loss`.

This is hash-neutral on the same grounds as section 1. Renaming the stored cause is not. The harness wrote `dock-capture` instead of `outscore-loss` and restored it. At 72 ticks the state hash, the event count, and the event-body hash all matched. At 1200 ticks the state hash and the event count still matched: every such hold has ended, so `captivity` is null and the code is only on the events. The event-body hashes moved:

| Seed | Event-body hash at 1200 |
| ---: | --- |
| 1847 | `56900ebf64bcba747ec2a10da5a25be3703aa112c70f6534e17ffb1f9fec68b3` |
| 2718 | `f7494718a715008307ed4de11a3f608a7af5b1df9722009df09be4f6296b8fad` |
| 4096 | `ccc3a8c3c51c079f1b62882a73e4fab66ed68de35954f01d974e5a8a6d04aa45` |

While the prisoner is still held, the state hash moves. On this tree, seed 4096 at state tick 476 is `132d7ca24e69aee0369bde71555a4d1a4bc975ddd49409fccba4ff0258fee9c9` with cause `outscore-loss`, and 59717 events. The rename was not re-run here. On `8db4706` the same checkpoint moved from `48cfec701791dc951f19d5516c8d3fe46450ac846f73fe13fd3e838f31db2bf9` to `d0dee816e4ef464f892fcfe9bd68f419acea8203b9eba5ae1695c7c6babc7458` when the cause stored as `dock-capture`. The event log is the same log, so the event-body hashes in the table above still describe that rename. The 72-tick logs from this run contain no `outscore-loss`: the causes are `failed-retreat` on 1847 and 2718, and `failed-retreat` and `major-defeat` on 4096. The first `outscore-loss` this run printed is Rook's, event tick 475. `npm test` on the rename, on `8db4706`: 218 passed, 5 failed, all assertions that the cause is `outscore-loss`. The golden test passed. The proposal leaves the stored code and changes the sentence.

## 3. The seat, the escape line, and the display name

No sentence names the cover. `projectFactions` (`src/dashboard/visibility.ts` lines 506–507) returns `commanderId` and `actingCommanderId`. The seat play on seed 2718, state tick 34, has World Government `actingCommanderId` `character-06`. That character is Iris Stone. The briefing items from that run contain no seat line and no use of "cover."

The captivity card, `src/dashboard/view-model.ts` line 306:

```text
`Held at ${settlement}. Escape is guaranteed but dangerous; bounded release terms become mandatory in ${round(daysRemaining, 1)} days.`
```

The seat play rendered `Held at Cinder Key. Escape is guaranteed but dangerous; bounded release terms become mandatory in 13.8 days.` On that same object, `displayedRisk` is `low`, `canEscape` is true, and the capture row's `captureChance` is 0.04. "Dangerous" sits on the same card as "low." The escape always succeeds and then wounds the character. The low figure is the risk of having been caught.

`displayName` is stored in `src/sim/scenario.ts` line 427 as `Prototype Commander`. `dashboardState` line 901 returns the player record unchanged. At tick 0 and at tick 34 the projected name is `Prototype Commander` and `party.name` is `Mara Vane`.

Proposed, from the patched read of the seat play and of seed 1847 at tick 960:

- Faction field `seatSummary`, while the cover is set: `Iris Stone covers Mara Vane's seat in World Government while Mara Vane is held. The orders stay Mara Vane's.`
- The same field on Free Tide at tick 960: `Dax Pike covers Pax Ash's seat in Free Tide Compact while Pax Ash is held. The orders stay Pax Ash's.`
- When the cover is unset, `seatSummary` is null.
- Escape card: `Held at Cinder Key. Escape always works, and it wounds you. The capture risk was low. Mandatory release is in 13.8 days.`
- The word in that sentence is `displayedRisk`. A severe hold would say severe. This run's risk is low.
- Release, once the holder is free. The seat play continued to the deadline. Event tick 117, state tick 118, `actingCommanderId` null. Briefing and feed: `Mara Vane was released from Cinder Key: 103 paid and 33.58 recorded as debt. Mara Vane holds the seat of World Government again`
- Chronicle of that release: `- Day 19.5: **Mara Vane** was released from **Cinder Key** under mandatory terms: 103 paid and 33.58 recorded as debt. **Mara Vane** holds the seat of **World Government** again.`
- `player.displayName` on the view: `Mara Vane`. The stored field stayed `Prototype Commander`.

`projectFactions` gains `seatSummary`, built from `actingCommanderId`, `commandHolderId`, and the two names. `checkInBriefing` reads `displayedRisk` into the escape sentence. `eventSummary` and `eventStory` append the seat sentence on `captivity-released` and `captivity-escaped` when the freed character is still `commandHolderId`. `dashboardState` returns a copy of the player whose `displayName` is `commander.name`. The world is not written. Calling `dashboardState` on the tick-476 world left its state hash at `132d7ca24e69aee0369bde71555a4d1a4bc975ddd49409fccba4ff0258fee9c9`.

The release line does not name Iris. By the time it is read, `actingCommanderId` has been deleted. The appointment line is what names her, and it is on the faction row for as long as she covers.

Writing the cover onto the capture event would let a later release name her. The harness set `event.data.coverId` inside the capture reducer, not on the captivity object, and restored it. That write was measured on `8db4706`. This tree has the same event log, so the event-body hashes below still describe it, and the state hash stays on the table at the top. `npm test` on that write passed, 223 tests, the suite on `8db4706`. The event-body hash moved at tick 72 anyway, because every capture gained the field and the covers inside 72 ticks are null:

| Seed | Event-body hash at 72 |
| ---: | --- |
| 1847 | `90996f6c62c65d3c67031f3d7fce1788d52e4d0e59d27e2b333efba19b1fdc4e` |
| 2718 | `d66fd8cd81f51716d10a92c4bdb8b3809d55015e994a26ebacc4ddc1a5294ef1` |
| 4096 | `f9b3cec04c712105efbfa0567754a7ec20fd8497cb8a16cc58d0dcdd2592357a` |

At 1200 the field was set on three captures on seed 1847 (Mara Vane at tick 594, cover `character-05` Jun Marrow; Pax Ash at 957 and at 1058, cover `character-20` Dax Pike) and on one on seed 2718 (Mara Vane at tick 1034, cover `character-13` Ada Sorn). Seed 4096 set none. The proposal does not write the field. The ending line names the holder who returns.

## 4. Say that loyalty fell, and which figure the seat reads

No release line says loyalty fell. `eventSummary` for `captivity-released`, `src/dashboard/view-model.ts` lines 102–104:

```text
`${actor} was released from ${settlement}: ${terms.moneyPaid} paid and ${terms.debtValue} recorded as debt`
```

The card publishes two loyalty figures and does not say which one the seat sort reads. `projectCharacter` in `src/dashboard/visibility.ts` line 468 puts `personality` on the commander's own row, and lines 474–476 put `loyalty` on every own-faction row. `loyalty` is `round(personality.loyalty + (loyaltyAdjustment ?? 0), 3)`. `coverLoyalty` in `src/sim/state.ts` lines 205–207 is the unrounded sum, and `commandScore` at lines 209–211 is leadership plus that sum times 50. `applyUnpaidReleaseScar` (lines 225–235) writes `loyaltyAdjustment` when `terms.debtValue > 0`. It does not write `personality.loyalty`, and the captivity test asserts the release payload has no `loyaltyAdjustment`.

Seed 1847, the loyalty-scar session. Sequence 13680, event tick 118, state tick 119. Sable Morrow, `payloadWithheld` true. Feed: `Sable Morrow: captivity released`. Briefing `event:13680`: `Sable Morrow was released from Cinder Key: 13.4 paid and 103.21 recorded as debt`. Her card `loyalty` is 0.537. It was 0.577 at tick 0. Sequence 74786, Jun Marrow, briefing `Jun Marrow was released from Glassport: 133.37 paid and 317.15 recorded as debt`, card `loyalty` 0.69 from 0.73. Sequence 74787, Lio Crow, debt 0, briefing `Lio Crow was released from Glassport: 126.63 paid and 0 recorded as debt`, card `loyalty` still 0.666. Sequence 88540, state tick 679, Mara's own release is not withheld. Feed and briefing: `Mara Vane was released from Crown Harbor: 108 paid and 72.25 recorded as debt`. Her card shows `loyalty` 0.768 beside `personality.loyalty` `0.807927391717676`. The stored adjustment on that character is `-0.04`.

Proposed, from the patched read. The line gains `Loyalty fell` only when `debtValue > 0`. Lio's debt is 0, so his line does not change.

- Sable, briefing and feed: `Sable Morrow was released from Cinder Key: 13.4 paid and 103.21 recorded as debt. Loyalty fell`
- Jun, briefing and feed: `Jun Marrow was released from Glassport: 133.37 paid and 317.15 recorded as debt. Loyalty fell`
- Lio, briefing and feed: `Lio Crow was released from Glassport: 126.63 paid and 0 recorded as debt`
- Mara, briefing and feed: `Mara Vane was released from Crown Harbor: 108 paid and 72.25 recorded as debt. Loyalty fell. Mara Vane holds the seat of World Government again`
- Mara's card, a projected `loyaltyNote` on her own row: `The seat reads 0.767927391717676, personality loyalty 0.807927391717676 plus the stored adjustment -0.04. The loyalty figure on this card rounds that to 0.768. personality.loyalty is the seed and is not the figure the seat reads.`
- The same field before any scar, state tick 119, still on her row: `The seat reads 0.807927391717676, personality loyalty with no stored adjustment. The loyalty figure on this card rounds that to 0.808.`

The seat reads the unrounded sum. The `loyalty` figure is that sum rounded to 3 decimals. A mate's card does not grow a note: `personality` stays null, and `loyalty` is already the rounded effective value. `payloadWithheld` on Sable and Jun stayed true, and `data` stayed null. Mara's own payload stayed visible.

`eventSummary` and `eventStory` append the clause. `projectCharacter` adds `loyaltyNote` on the commander's own card. Nothing stored and no event field changes.

This is hash-neutral. With the patch applied, the state hash, the event count, and the event-body hash matched both tables, at 72 and at 1200, on all three seeds. `npm test` still passed, 242 tests.

Putting the size on the historical line is not projection-only. The event does not carry the before and after, and the current adjustment is the scar so far, not the drop from one old release. The harness wrote `loyaltyBefore` and `loyaltyAfter` onto the release event inside `applyUnpaidReleaseScar` and restored them. A paid release did not gain the fields. Sequence 13680 stored 0.577 and 0.537. Sequence 74786 stored 0.73 and 0.69. Sequence 88540 stored 0.808 and 0.768. Sequence 74787, debt 0, stored neither. State hashes and event counts matched at 72 and at 1200. The 72-tick event-body hashes matched: no unpaid release has happened yet. The 1200-tick event-body hashes moved:

| Seed | Event-body hash at 1200 |
| ---: | --- |
| 1847 | `9a18881caa38f3f804ccde9f15886f8820e9c34db78fd210c2c86560e942a338` |
| 2718 | `093c485c851c4363d1d7e447148f179e6bfb51e3066b23babd2c5473196b0155` |
| 4096 | `ac84ec88c371a24d554a8f084ce20f571c9b382544dada4da7e2fe170883922c` |

`npm test` on that write still passed, 231 tests, on the loyalty-scar tree. That write was not repeated on `d8ad16c`. The event log is the same log, so the event-body hashes above still describe it. The golden fixture stores the state hash and the event count, which did not move. The proposal does not write the fields. The line says loyalty fell, and the card says which figure the seat reads.

## 5. Put the payment and the debt on the release feed

A withheld feed row is the actor's name, a colon, and the event type. `projectEvent` in `src/dashboard/visibility.ts` line 615:

```text
`${actor}: ${event.type.replaceAll("-", " ")}`
```

The briefing already uses the release template in section 4, which names the payment and the debt. The feed uses it only when the payload is visible.

Seed 1847. Sequence 13680, feed `Sable Morrow: captivity released`, `data` null, `payloadWithheld` true. The briefing item is `Sable Morrow was released from Cinder Key: 13.4 paid and 103.21 recorded as debt`. Sequence 74786, feed `Jun Marrow: captivity released`. Sequence 74787, feed `Lio Crow: captivity released`. Sequence 88540 is Mara's own release, so the feed already matches the briefing and the payload is present: `moneyPaid` 108, `debtValue` 72.25.

Proposed, from the patched read. The feed uses the briefing sentence even when `payloadWithheld` stays true. `data` stays null.

- `Sable Morrow was released from Cinder Key: 13.4 paid and 103.21 recorded as debt. Loyalty fell`
- `Jun Marrow was released from Glassport: 133.37 paid and 317.15 recorded as debt. Loyalty fell`
- `Lio Crow was released from Glassport: 126.63 paid and 0 recorded as debt`

`projectEvent` keeps the rich summary for `captivity-released`. The same patch as section 4. Hash-neutral on that measurement. 242 tests.

## 6. The battle feed says who won

The battle template, `src/dashboard/view-model.ts` lines 88–89, is the actor won or lost at the settlement. The feed fallback is the same line as section 5, so a withheld battle is `Name: battle resolved`.

Seed 1847, state tick 595, sequence 76573. Feed: `Pax Ash: battle resolved`, `payloadWithheld` true, `data` null. Briefing `event:76573`: `Pax Ash won at Crown Harbor`. The payload, read from the event, is `outcome` `attacker-victory`, `attackerTroops` 214, `attackerHealth` 96.401, `attackerMorale` 3, `defenderGarrison` 12, `attackerScore` 436.104, `defenderScore` 47.267. Morale 3 is the case section 2 already marks `on a higher score`. The same shape on the Glassport fight, sequence 59635, is still `Pax Ash: battle resolved` on the feed.

Proposed, from the patched read. The feed uses the briefing sentence. `payloadWithheld` stays true. `data` stays null.

- Crown Harbor, sequence 76573: `Pax Ash won at Crown Harbor on a higher score`
- Glassport, sequence 59635: `Pax Ash won at Glassport on a higher score`

`projectEvent` keeps the rich summary for `battle-resolved`. The score clause is the one in section 2, so a battle the payload does not rule out of a standing win still says `won at`. Hash-neutral on the same measurement as sections 4 and 5. 242 tests.

## 7. At morale 0 the starvation line still quotes a morale cost

The shortage sentence, `src/dashboard/view-model.ts` lines 367–378, always quotes both rates:

```text
`health ${runway.shortageHealthPerTick} and morale ${runway.shortageMoralePerTick} per tick`
```

`shortageMoralePerTick` is `round(shortage * 2.4, 3)` (`src/sim/engine.ts` inside `provisionRunway`). Upkeep then does `clamp(morale - shortage * 2.4 - travel + fed, 0, 100)` at line 533. At 0 the subtraction does not move the stored morale.

Seed 1847, state tick 595. Mara's morale is 0 and her health is 1. The briefing line is `The hold is empty and 0.256 provisions per tick cannot be found. That costs health 0.205 and morale 0.614 per tick. Morale gains nothing while the shortage lasts, so it will not recover on its own. No market you could still reach sells provisions.` The same morale cost is on the state tick 679 line, and that one ends `Verdant Cay is 3 ticks by report away — out of reach, which is short by 3 ticks.` 0.614 is `round(0.256 * 2.4, 3)`. The upkeep on sequence 88541 stores `shortage` 0.256 and `morale` 0. At state tick 119 her morale is 17.397, and that line still quotes a morale cost, `morale 1.382 per tick`, because the figure is not 0 yet.

Proposed, from the patched read, only when `commander.morale` is already at or below 0. The health cost stays. The recovery sentence stays.

- State tick 595: `The hold is empty and 0.256 provisions per tick cannot be found. That costs health 0.205 per tick. Morale is already 0, so the shortage does not lower it. Morale gains nothing while the shortage lasts, so it will not recover on its own. No market you could still reach sells provisions.`
- State tick 679: `The hold is empty and 0.256 provisions per tick cannot be found. That costs health 0.205 per tick. Morale is already 0, so the shortage does not lower it. Morale gains nothing while the shortage lasts, so it will not recover on its own. Verdant Cay is 3 ticks by report away — out of reach, which is short by 3 ticks.`

`checkInBriefing` changes. The runway numbers are not rewritten. Hash-neutral on the same measurement. 242 tests.

## 8. attentionCount is not the number of lines

`checkInBriefing` returns `attentionCount: attention.length` at `src/dashboard/view-model.ts` line 586. The comment above it says the count is the action and warning items, because every one of them is returned. `items` is that list plus the info rows that fit. The info budget is `max(0, 10 - attention.length)` at line 567. `omittedInfoCount` is the info rows that did not fit. `tests/own-party.test.ts` lines 266–271 assert `attentionCount` equals the action and warning items, not `items.length`. The panel title in `src/dashboard/index.html` lines 943–945 is `Check-in · N need attention`, and the next block draws every item.

Seed 1847, state tick 119. `attentionCount` 4, `omittedInfoCount` 0, and the list has 6 lines: 1 action (`The party is starving`), 3 warnings (two stale reports and Sable's release), 2 info (Pax claimed Cinder Key, Iris claimed Glassport). State tick 595: `attentionCount` 7, `omittedInfoCount` 1, and the list has 10 lines. The 7 are 2 actions (the captivity card and starvation) and 5 warnings (two stale reports, Mara's capture, Lio's release, Jun's release). The 3 info lines are Pax's battle, Lio's returning troops, and Jun's grouped troop return. One further info row is held back. State tick 679: `attentionCount` 4 and the list has 4 lines. State tick 0: both are 0.

`attentionCount` is the right count of lines that need a decision. The list length is the right count of lines drawn. The 4 and the 7 are the decisions. The extra lines are background info, which the title does not mention.

Proposed, from the patched read. `attentionCount` stays the decision count. The briefing gains `shownCount`, the length of `items`, and `attentionLabel`, which the title uses.

- State tick 119: `Check-in · 4 need attention, and 2 background lines are listed with them.` `shownCount` 6.
- State tick 595: `Check-in · 7 need attention, and 3 background lines are listed with them.` `shownCount` 10. The omitted line stays `1 older background report(s) not shown.`
- State tick 679: `Check-in · 4 need attention`. `shownCount` 4.

`checkInBriefing` and the title in `index.html` change. Setting `attentionCount` to `items.length` would still leave the state hash, the event count, and the event-body hash where they are, and it would fail the own-party assertion that the count is the action and warning rows. That variant was not patched. The proposal keeps the count and names the extra lines. Hash-neutral. 242 tests.

## 9. Pax's leadership leaves the card

`projectCharacter` sets `skills` from `capabilityExact` (`src/dashboard/visibility.ts` line 467). That flag is false only on the `distant` tier (`characterIntelligence`, lines 113–120). A rival is distant unless `isDirectlyObserved` (lines 52–66) puts him on the co-located tier: same location, neither party travelling, or standing in a settlement the commander's faction holds.

Seed 1847, state tick 595. Mara is held at Crown Harbor. Pax Ash is at `crown-harbor`, `captivity` null, `skills.leadership` 75 on the card and 75 on the character. The tier is `co-located`, so the card shows the skill. State tick 679. Mara's `locationId` is null and her travel is `verdant-cay` with `remainingTicks` 3. Pax is still at `crown-harbor`, `captivity` still null, and the character's `skills.leadership` is still 75. The card's `skills` is null. The tier is `distant`, source `reputation`, `capabilityExact` false. The number did not leave the character. The view hid it because he is no longer where Mara can see him, and he is not in her faction. It is not captivity.

Proposed, from the patched read, on every card whose skills are withheld. At state tick 595 the field is null, because the 75 is on the card. At state tick 679 Pax's card carries:

`Pax Ash's leadership is withheld on this card. The reading is distant (reputation), so skills stay off the card.`

The sentence does not include 75. `projectCharacter` adds `skillsNote`. The stored skill is not written. Hash-neutral on the same measurement. 242 tests.

## 10. Sea sightings

[Sea sightings 001](../playtests/sea-sightings-001.md) on seed 1847, one travel command to Glassport, head `8d0df52`. The same voyage was run again on this tree through `submitCommand` and `runTick`. State tick 2, 3, and 4 matched that session: Ada's 35, the five rows at tick 3, Zara and Orin absent, Mara's purse 102 then 99 then 96, and Ada's docked hold. The sighting is not an event. `seaRow` in `src/dashboard/visibility.ts` lines 304–322 builds the row, and `seaSightingsFor` at line 330 returns it only while the observer is at sea. The inspector prints it with the port record's label.

The projection below was patched in, measured, and removed. It does not write the world. On that patch, `npm test` still passed, 242 tests. The state hash, the event count, and the event-body hash matched both tables, at 72 and at 1200, on all three seeds. Calling `dashboardState` left each state hash in place.

### (g) The meeting is not in the feed or the briefing

Nothing in `checkInBriefing` reads `seaSightings`. The briefing types at `src/dashboard/view-model.ts` lines 453–467 do not include a sea row. A withheld travel line stays the fallback at `src/dashboard/visibility.ts` line 615.

Seed 1847, the Glassport voyage. Sequence 87, event tick 0, `travel-started`, actor `character-13`. Feed: `Ada Sorn: travel started`. `payloadWithheld` true. `data` null. It does not carry troops 35. The tick-2 briefing has 7 lines and none of them names a ship. Ada's 35 is the `troops` field on her `seaSighting`, and the same object is the one key on Mara's `seaSightings`.

Proposed, from the patched read. The row gains `summary`. `checkInBriefing` adds one info item per row, title `Sea sighting`, using that sentence. `data` on sequence 87 stays null, and the feed summary stays `Ada Sorn: travel started`. No event is written.

- Tick 2, Ada, `overtaking`, `arriving` false: `Ada Sorn is overtaking, Crown Harbor to Glassport. 35 troops, 0 ticks old.`
- Tick 3, the same sentence shape on the five rows. Ada: `Ada Sorn is overtaking, Crown Harbor to Glassport. Docks at Glassport on this tick. 35 troops, 0 ticks old.`
- Sable: `Sable Sorn is passing, Glassport to Crown Harbor. 36 troops, 0 ticks old.`
- Toma: `Toma Reef is arriving, Cinder Key to Glassport. Docks at Glassport on this tick. 42 troops, 0 ticks old.`
- Vale: `Vale Gale is passing, Glassport to Crown Harbor. 46 troops, 0 ticks old.`
- Kessa: `Kessa Dusk is arriving, Verdant Cay to Glassport. Docks at Glassport on this tick. 48 troops, 0 ticks old.`

At tick 2 the briefing gained that one Ada line. `attentionCount` stayed 6. The list went from 7 lines to 8. `omittedInfoCount` stayed 0. At tick 3 `attentionCount` stayed 6 and the info budget is `max(0, 10 - attention.length)`, so 4. Four sea lines were on the list: Toma, Ada, Sable, and Vale. Kessa's sentence was on her row and was not on the list. The routine digest that tick 2 had shown, `8 routine order updates: 8 accepted. No command decision is required.`, was not on the list either. `omittedInfoCount` was 2.

`seaRow` and `checkInBriefing` change. The troop count stays on the character read. The feed does not gain a row, because a meeting is not an event.

This is hash-neutral on the measurement above. 242 tests.

Writing a meeting event is not projection-only. `emit` calls `applyEvent`, and `applyEvent` stores `nextEventSequence` on the world, which `stateHash` includes. A new type also has to be accepted there: the default throws `Unknown event type`. That writer was not run. The proposal does not add the event. The sentence is the briefing line and the field on the row.

### (h) `overtaking` with `arriving: true` has no sentence

The row stores both fields and no sentence. `seaRow` copies `kind` and `arriving` and stops. At tick 2 Ada's `arriving` is false. At tick 3 it is true and `kind` is still `overtaking`. The same shape is on the other last-tick rows: Toma and Kessa are `arriving` with `arriving` true, and Vale's `passing` stays `arriving` false.

Proposed, from the same patched read as (g). The dock clause is added only when `arriving` is true. The tick-3 Ada sentence is the one above. Toma's and Kessa's use their own kind:

- `Toma Reef is arriving, Cinder Key to Glassport. Docks at Glassport on this tick. 42 troops, 0 ticks old.`
- `Kessa Dusk is arriving, Verdant Cay to Glassport. Docks at Glassport on this tick. 48 troops, 0 ticks old.`

`seaRow` changes, the same `summary` as (g). Nothing stored. Hash-neutral on that measurement. 242 tests.

### (i) The same leg, outside her stretch, is missing

`meetingKind` returns null when the spans do not overlap, and `seaSightingsFor` skips that ship. The character's `travel` is already on every tier. The list does not say why the ship is absent, and it does not give a troop count. At sea that count is null.

Seed 1847. Tick 2, Zara Gale (`character-17`) is `crown-harbor` → `glassport`, remaining 4 of 4. She is not in `seaSightings`. Her `seaSighting` is null. Her `troops` is null. Tick 3, she is remaining 3 of 4, still absent. Orin Frost (`character-29`) is on that leg, remaining 3 of 3, and is not a row. His `troops` is null.

Proposed, from the patched read. The commander's own character gains `outOfStretch`, null in port and null on anyone else. Each entry names the ship, the leg, and the ticks left. It has no `troops` field.

- Tick 2: `Zara Gale is on Crown Harbor to Glassport, 4 of 4 ticks left, and is not in the same stretch of water.`
- Tick 3, Zara: `Zara Gale is on Crown Harbor to Glassport, 3 of 4 ticks left, and is not in the same stretch of water.`
- Tick 3, Orin: `Orin Frost is on Crown Harbor to Glassport, 3 of 3 ticks left, and is not in the same stretch of water.`

`outOfStretchFor` changes, and `projectCharacter` copies it onto the commander's row only. The sea list does not gain a troop count for them. Hash-neutral on that measurement. 242 tests.

### (j) At the dock the hold and the purse appear with no learned line

`projectCharacter` copies `cargo` and `money` when `conditionExact` is true (`src/dashboard/visibility.ts` lines 445–446). That is the co-located tier: same place, neither party travelling. The sea row never carries the hold. There is no sentence when the copy starts.

Seed 1847, state tick 4. Mara's `locationId` is `glassport` and her `travel` is null. Ada's `seaSighting` is null. Her `troops.count` is 35. Her `money` is 141. Her `cargo` is provisions 36.384, arms 2, medicine 1, ship materials 6. Those are the figures the playtest read. The card shows them and does not say they were learned.

Proposed, from the patched read. A co-located card that is not the commander's own gains `conditionNote`. The sentence does not repeat the cargo numbers. The card already has them. The same sentence was on every other character standing in Glassport on that read: Toma Reef, Esme Dusk, Bram Tern, Toma Hale, and Kessa Dusk. Ada's line:

`Learned at Glassport. The hold and the purse are on this card because both ships are in port.`

`projectCharacter` changes. The stored cargo and money are not written. A ship still at sea does not get the note: Zara's `conditionNote` stayed null at ticks 2 and 3, with her `cargo` and `money` null. Hash-neutral on that measurement. 242 tests.

### (k) The purse falls, and `travel-progressed` does not show it

`progressTravel` (`src/sim/engine.ts` lines 2924–2938) emits `travel-progressed` with `remainingTicks`, `cargo`, `health`, `morale`, and `troopCount`. It does not include money. `upkeepCharacter` (lines 538–553) does, when the character is travelling: `passageCost` and `characterMoney`. `PASSAGE_COST_PER_TICK` is 3 (line 85). `eventSummary` has no `character-upkeep` case, so the feed uses the default at `src/dashboard/view-model.ts` lines 152–153.

Seed 1847, Mara's own events, `payloadWithheld` false. State money is 102 at tick 2, 99 at tick 3, and 96 at tick 4.

| State tick | Upkeep sequence | Event tick | Summary today | Payload |
| ---: | ---: | ---: | --- | --- |
| 2 | 198 | 1 | `Mara Vane: character upkeep` | `passageCost` 3, `characterMoney` 102 |
| 3 | 283 | 2 | `Mara Vane: character upkeep` | `passageCost` 3, `characterMoney` 99 |
| 4 | 375 | 3 | `Mara Vane: character upkeep` | `passageCost` 3, `characterMoney` 96 |

The travel lines beside those ticks stay `Mara Vane: travel progressed`. Sequence 199 carries `remainingTicks` 2 and `troopCount` 80, and no money. Sequence 284 carries `remainingTicks` 1. Sequence 376 carries `remainingTicks` 0. None of the three payloads has `passageCost` or `characterMoney`.

Proposed, from the patched read. The sentence is on the upkeep row, which already stores the two numbers. `travel-progressed` is left as it is. Another character's upkeep stays withheld, so the feed fallback does not gain her purse.

- Sequence 198: `Mara Vane paid 3 passage. 102 left.`
- Sequence 283: `Mara Vane paid 3 passage. 99 left.`
- Sequence 375: `Mara Vane paid 3 passage. 96 left.`

`eventSummary` changes. The event fields do not. Hash-neutral on that measurement. 242 tests.

Putting `characterMoney` onto `travel-progressed` is not projection-only. That payload is the event body, so the event-body hash would move, and `applyEvent` would be a second writer if the reducer started to read it. That writer was not run. The proposal reads the upkeep payload that is already there.

### (l) The inspector says "Sighted troops" twice

`src/dashboard/index.html` lines 810–815. When `troops` is null, a port record draws `Sighted troops` and the age. A sea row draws the same label and its own age. Both blocks can be on one card.

The Glassport voyage does not store a port record, so that session shows the sea label once. A second run on seed 1847 does store one. Travel to Cinder Key, survey, then travel to Glassport. State tick 7. Sable Morrow (`character-04`). Her live `troops` is null. Her `partySighting` is troops 21, `observedTick` 5, `ageTicks` 2, `locationId` `cinder-key`. Her `seaSighting` is `sharing`, `arriving` true, `cinder-key` → `glassport`, troops 19, `ageTicks` 0. The inspector draws:

- `Sighted troops` 21, `2 ticks old`
- `Sighted troops` 19, `0 ticks old`

The two counts are not the same number. The port figure is the survey. The sea figure is this tick.

Proposed, from the patched read. The port span stays `Sighted troops`. The sea span is the row's `kind`, which is already on the object. Sable's card draws:

- `Sighted troops` 21, `2 ticks old`
- `sharing` 19, `0 ticks old`

The sea block in `index.html` changes. The port block does not. Nothing stored. Hash-neutral on that measurement. 242 tests.

## Questions for Micah

1. **What should `player.displayName` show?** Default: the character's name, `Mara Vane`, derived when the state is read. The stored string stays `Prototype Commander`, and the hash does not move.
2. **Should the player see the word "outscore"?** Default: no. The sentence says the other side won on a higher score. The stored cause stays `outscore-loss`, and the card can show the plain `causeLabel` beside it.
3. **Should a ship on the same leg, outside her stretch, be named?** Default: yes. The sentence in (i) names her and the ticks left. It does not add a troop count. Her course is already on the character.
4. **What should the sea count be called when a port record is on the same card?** Default: the row's `kind` (`sharing`, `overtaking`, `passing`, or `arriving`). The port record keeps `Sighted troops`.
