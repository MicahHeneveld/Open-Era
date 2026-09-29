# Capture wording

**Status: Open.** Wording only. No rule was left in the tree. The runs were taken on `8db4706686c417645342d5dacc0838b101672e59` (PR #61). M29.1, the dock capture on an outscore win, and M30, the acting commander while captive, are built. [Outscore dock capture 001](../playtests/outscore-dock-capture-001.md) and [command seat 001](../playtests/commander-seat-001.md) are the playtests that flagged the sentences.

Runs are `createPrototypeWorld` plus `runTick`, seeds 1847 / 2718 / 4096, Node v24.21.0, ICU 78.3. Tick numbers on events are the `tick` field. A figure at tick 72 or tick 1200 is the world after that many `runTick` calls. `npm test` on this tree passes, 223 tests. The committed 72-tick fixture reproduced, including the recovery replay of 572 events:

| Seed | State hash | Events |
| ---: | --- | ---: |
| 1847 | `cb04ba5d392d8b1c868cc97e54cb21b21ec171edd546bb70d0d7aba86cc69c11` | 8301 |
| 2718 | `bd7d8cc44d5fa21022ecb8f8086e13dfbb9475eb025b5ae53f87e2991f90035c` | 8513 |
| 4096 | `20975bf480e5aa11eeafe1ce39c36cf5ba0fa8e2d5de2bb5887a35d7b3aecc9f` | 8031 |

The same three seeds at 1200 ticks, unmodified, are the comparison below. `stateHash` is the canonical world. It does not include the event log and it does not include a dashboard sentence. The event-body hash in the tables is sha256 of the canonical JSON of each event's sequence, tick, type, actor, target, settlement, and data. The golden fixture does not store that hash. It stores the state hash and the event count.

| Seed | State hash | Events | Event-body hash |
| ---: | --- | ---: | --- |
| 1847 | `d106abfca8fcfabf7e821cad1059fdb50acf84661694fa06bcc07e91ae17ba45` | 164313 | `fa487dcbe7af52ed4128c0b27560c3b307e4ac405df975feaa6a4acd8fd5ed8a` |
| 2718 | `2d56e9eaf2dbb889884ad7b4465fc8043a654e42f1cf0abf5ad301765eea6001` | 165434 | `6673109c20b943ecd77e3ab76ea7bf73a23cdd9b32e4e1c0094571ec3d8fffe5` |
| 4096 | `92c907be75f142774ad022bf642ed3f22f7301793e49d9c5be11f607d9d2dc5e` | 164691 | `e7bbe6cc25a8be6f1e5e288ab5912c6b72f45f8b85e8d6a24ad20d7b3d3ad35b` |

The sentences are built when the state is read.

- `eventSummary` in `src/dashboard/view-model.ts` is the briefing sentence, and the feed sentence when the payload is visible.
- `projectEvent` in `src/dashboard/visibility.ts` keeps that sentence only when the payload is visible. Otherwise the feed row is the actor's name, a colon, and the event type.
- `eventStory` in `src/sim/reports.ts` is the chronicle line in `report.md`.
- `checkInBriefing` writes the captivity card. `dashboardState` returns the stored player, so `displayName` is the string on that record. `projectFactions` publishes `commanderId` and `actingCommanderId` and no sentence.
- `attemptCapture` stores the prisoner as `actorId` and the captor faction as `targetId`. `applyEvent` puts the captivity on that actor. The roles are how the world is updated.

The proposal below was patched in, measured, and removed. With that patch applied, `npm test` still passed, 223 tests. The 72-tick rows and the 1200-tick rows above matched, including the event-body hashes.

## 1. Name the captor

The prisoner is the event actor. The captor faction is the target. A withheld feed row is read as "actor did this to target."

Current template, `src/dashboard/view-model.ts` line 99:

```text
`${actor} was captured at ${settlement} after ${String(event.data.cause).replaceAll("-", " ")}`
```

Withheld feed, `src/dashboard/visibility.ts` line 429:

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

The ids on the row are a separate question. `projectEvent` still copies `actorId` and `targetId`. A client that ignores the summary and reads the ids still sees the prisoner acting on the captor faction. Swapping those roles is not projection-only. `applyEvent` puts the captivity on `world.characters[event.actorId]`. The harness pointed `actorId` at the captor faction and `targetId` at the prisoner, and taught the reducer to update the prisoner. The world that came out matched the tables above, at 72 ticks and at 1200. The event log did not. The first capture on seed 1847, tick 34, was stored as `actorId` `free-tide`, `targetId` `character-04`.

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

The cause stored on the hold is `outscore-loss` (`src/sim/engine.ts` line 1198, and the union at `src/sim/types.ts` line 96). The briefing replaces the hyphen with a space, so the prisoner is the subject of "outscore loss."

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

While the prisoner is still held, the state hash moves. Seed 4096 at state tick 476 is `48cfec701791dc951f19d5516c8d3fe46450ac846f73fe13fd3e838f31db2bf9` with cause `outscore-loss`, and `d0dee816e4ef464f892fcfe9bd68f419acea8203b9eba5ae1695c7c6babc7458` with cause `dock-capture`. Both runs had 59717 events. The 72-tick logs from this run contain no `outscore-loss`: the causes are `failed-retreat` on 1847 and 2718, and `failed-retreat` and `major-defeat` on 4096. The first `outscore-loss` this run printed is Rook's, event tick 475. `npm test` on the rename: 218 passed, 5 failed, all assertions that the cause is `outscore-loss`. The golden test passed. The proposal leaves the stored code and changes the sentence.

## 3. The seat, the escape line, and the display name

No sentence names the cover. `projectFactions` (`src/dashboard/visibility.ts` lines 320–321) returns `commanderId` and `actingCommanderId`. The seat play on seed 2718, state tick 34, has World Government `actingCommanderId` `character-06`. That character is Iris Stone. The briefing items from that run contain no seat line and no use of "cover."

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

`projectFactions` gains `seatSummary`, built from `actingCommanderId`, `commandHolderId`, and the two names. `checkInBriefing` reads `displayedRisk` into the escape sentence. `eventSummary` and `eventStory` append the seat sentence on `captivity-released` and `captivity-escaped` when the freed character is still `commandHolderId`. `dashboardState` returns a copy of the player whose `displayName` is `commander.name`. The world is not written. Calling `dashboardState` on the tick-476 world left its state hash at `48cfec701791dc951f19d5516c8d3fe46450ac846f73fe13fd3e838f31db2bf9`.

The release line does not name Iris. By the time it is read, `actingCommanderId` has been deleted. The appointment line is what names her, and it is on the faction row for as long as she covers.

Writing the cover onto the capture event would let a later release name her. The harness set `event.data.coverId` inside the capture reducer, not on the captivity object, and restored it. State hashes and event counts matched at 72 and at 1200. `npm test` passed, 223 tests. The event-body hash moved at tick 72 anyway, because every capture gained the field and the covers inside 72 ticks are null:

| Seed | Event-body hash at 72 |
| ---: | --- |
| 1847 | `90996f6c62c65d3c67031f3d7fce1788d52e4d0e59d27e2b333efba19b1fdc4e` |
| 2718 | `d66fd8cd81f51716d10a92c4bdb8b3809d55015e994a26ebacc4ddc1a5294ef1` |
| 4096 | `f9b3cec04c712105efbfa0567754a7ec20fd8497cb8a16cc58d0dcdd2592357a` |

At 1200 the field was set on three captures on seed 1847 (Mara Vane at tick 594, cover `character-05` Jun Marrow; Pax Ash at 957 and at 1058, cover `character-20` Dax Pike) and on one on seed 2718 (Mara Vane at tick 1034, cover `character-13` Ada Sorn). Seed 4096 set none. The proposal does not write the field. The ending line names the holder who returns.

## Questions for Micah

1. **What should `player.displayName` show?** Default: the character's name, `Mara Vane`, derived when the state is read. The stored string stays `Prototype Commander`, and the hash does not move.
2. **Should the player see the word "outscore"?** Default: no. The sentence says the other side won on a higher score. The stored cause stays `outscore-loss`, and the card can show the plain `causeLabel` beside it.
