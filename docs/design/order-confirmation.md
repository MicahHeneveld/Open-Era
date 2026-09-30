# Order confirmation

**Status: Open.** Proposal for the owner to accept, change, or reject. This tree is `6d7badb`, the contracts merge, which includes M22. The headless runs below are that unmodified tree. The confirmation rule was patched in locally to measure it, then reverted. This note is not decided until it moves into [world simulation](world-simulation.md) or [autonomous characters](autonomous-characters.md). It follows the finding in [contracts](contracts.md) that a completion report is never confirmed.

Runs are `createPrototypeWorld` plus `runTick`, no player commands, seeds 1847 / 2718 / 4096, Node v24.21.0, ICU 78.3. Tick numbers on events are the `tick` field. `npm test` on this tree passes, 164 tests. The 72-tick hashes match `tests/fixtures/golden-hashes.json` (`d7eb02eb…`, `d0b4b449…`, `d5d9da8b…`; 8275, 8489, 8003 events). Long runs are 1200 ticks. Age is `1200 - reportedTick`. Every reported order was still waiting at tick 1200, so the age is time already spent in `awaiting-confirmation`. Median is the average of the two central ages when the count is even.

## Where a completion report can go

`judgeOrderCompletion` (`src/sim/agency.ts`) files a report only while the order is `active` and `following`, and only when its score clears the threshold. The score draws `rng.between(-0.04, 0.04)`. `runTick` emits `standing-order-completion-reported`. `applyEvent` (`src/sim/state.ts`) sets `awaiting-confirmation`, writes the completion report, and clears a plan that pointed at that order. `activeStandingOrder` then skips it. It already ignores anything that is not `pending` or `active`.

From `awaiting-confirmation` the code has two exits, both player commands, both checked in `validateOrderConfirmation` / `validateOrderCancellation` (`src/sim/commands.ts`) and applied in `processPlayerCommands` (`src/sim/engine.ts`).

**The issuer signs it.** `confirm-order` requires the player's character to be `order.issuerId`, and the status to be `awaiting-confirmation`. `processPlayerCommands` emits `standing-order-completed` and `player-command-resolved` with outcome `order-completion-confirmed`. `applyEvent` sets `completed`, adherence `following`, and `lastReport.kind` to `confirmed`. No money moves. No relationship is written. The row stays on the character.

**The issuer cancels it.** `cancel-order` allows `pending`, `active`, or `awaiting-confirmation`. It emits `standing-order-cancelled`. Status becomes `cancelled`. A plan that still pointed at the order is cleared. No relationship is written.

Nothing else moves the status.

`amend-order` rejects this status with `order-not-amendable`. `expireStandingOrders` expires `pending` and `active` only, and only when `expiresTick` is set. Every seeded order has `expiresTick: null`, so the expiry path does not reach these reports even if the status check were wider. No autonomous character emits `confirm-order`. `submitCommand` rejects every command except `escape-captivity` while `character.captivity` is set (`character-captive`), and rejects every command except `retreat-battle` while that character is the attacker in `activeBattles` (`battle-in-progress`). A command already queued still runs: `processPlayerCommands` is before `progressActiveBattles`, and the confirm branch does not read captivity.

`orderFor` (`src/sim/scenario.ts`) writes the only headless orders. World Government's issuer is `character-01`, Mara Vane. Free Tide's is `character-14`, Pax Ash. `createPrototypeWorld` sets Mara's controller to `{ kind: "human", playerId: "prototype-player" }` and leaves everyone else `autonomous`. She is the only player. Pax has no session, so Free Tide has no `confirm-order` path. Mara can sign only her own orders: a different issuer fails `not-issuer`. These runs queue no commands, so she does not sign hers either. The briefing still lists each of her waiting reports as `confirm:${order.id}` with `action: "confirm-order"` (`src/dashboard/view-model.ts`). Accelerated time does not stop for that item. `POST /api/advance` stops for her own battle phase and for her own captivity transition (`src/dashboard/server.ts`).

Death is not in this tree. The [roadmap](../roadmap.md) still lists death by old age as unbuilt, and no event removes a character. The lowest health after 1200 ticks is 1, the existing floor. Defection is not in this tree. `character.factionId` is written in `makeCharacter` and never again. All 30 characters kept their starting faction on every seed. [Landless faction](landless-faction.md) tried defection locally and did not leave it in the code.

## The rule that closes it

Three ways to close a report were weighed.

An autonomous issuer could confirm or reject on a fresh judgment. The report is filed only after `judgeOrderCompletion` has already passed, and that function has already drawn its noise. A second opinion is either that same score, or a new draw, or a formula that does not exist. The new draw is out. There is no issuer score stored on the order.

A silent issuer could auto-confirm after N ticks. That covers Mara, who is idle, and anyone who cannot submit: captive, missing, or a faction with no player. N has to be a duration the world already has. `ticksPerDay` is 6.

The report could expire. `expired` would free the slot, and the summary `expireStandingOrders` already uses says the order expired before completion was reported. That sentence is false once the report exists. Expiry also writes no relationship.

The recommendation is the first two, as one function. Expiry stays unused. Call it `confirmUnansweredOrders`, from `runTick`, immediately after `expireStandingOrders`. That is after `processPlayerCommands`, so a confirm or a cancel queued for this tick still wins. No new RNG call.

On an order in `awaiting-confirmation`, let `waited` be `world.tick - order.statusChangedTick`. Skip it when `waited < 1`. The issuer judges on their own when they exist, their controller is `autonomous`, and `captivity` is null. Then `waited >= 1` is enough: the next tick. Otherwise wait until `waited >= world.ticksPerDay`. That second case is the idle human, the captive issuer, a missing issuer, and anyone else who cannot submit. A free autonomous issuer whose faction has no player takes the first case. Pax is that issuer. The rule does not read `factionId`. Confirming already does not: it reads the issuer's id. A defection, if one is added later, does not by itself cancel the signature. A missing issuer takes the day-long close, which is also the path for a death that has not been built.

Both cases emit `standing-order-completed`. `actorId` is `order.issuerId`, `targetId` is the holder. There is no `commandId` and no `player-command-resolved`. `reason` is `issuer-judgment` or `issuer-silent`. The judgment summary is `${issuer} confirmed ${holder}'s completion report.` The silent summary is `${issuer} did not answer ${holder}'s completion report within a day, and the order closed.` `applyEvent` already applies that event: status `completed`, the same fields a player signature sets.

The relationship write reuses the victory branch of `recordBattleConsequences` (`src/sim/engine.ts`), from the holder toward the issuer: trust `+0.012`, respect `+0.028`, fear `−0.005`, grievance `−0.006`, obligation `−0.01`, affinity unchanged, each passed through `round` and `clamp` to 0..1. The event is `relationship-changed` with trigger `order confirmed`. A missing tie starts from the defaults in `evolveLocalRelationship`: trust 0.28, affinity 0.25, respect 0.28, fear 0.08, grievance 0, obligation 0. These seeded orders already have the tie. A `pressure` order does not get the write. That directive completes on a victory or a claim, and the victory has already applied those deltas. No money, no cargo, and no goal progress.

The order row is not deleted. `completed` is terminal. Under M25 the open slot is `pending`, `active`, or `awaiting-confirmation` for one issuer and one recipient, so this status frees the pair. The headless world still has no writer that then mints the next order.

A rejection is the existing cancel, not a new roll. Status `cancelled`, the cancelled report, the plan cleared if it pointed here, no relationship write. `cancelled` is terminal for M25, so the slot frees. The automatic path does not also complete an order the cancel already closed.

Visibility stays the standing-order rule in `eventPayloadVisible` (`src/dashboard/visibility.ts`). The issuer is `actorId` on `standing-order-completed`, so the issuer sees that payload. The holder sees their own `relationship-changed`, because they are its actor. A rival sees neither. `visibleStandingOrders` still shows an order only to its holder and its issuer.

## Measured on 6d7badb

Twenty orders at tick 0. No `standing-order-issued`, `standing-order-completed`, `standing-order-expired`, `standing-order-amended`, or `standing-order-cancelled` through tick 1200. Every refusal is tick 0. The orders that do not report are all refusals, plus one that stays `active`.

| Seed | Accepted | Refused at 0 | Reported | Still `active` at 1200 |
| ---: | ---: | ---: | ---: | ---: |
| 1847 | 14 | 6 | 14 | 0 |
| 2718 | 14 | 6 | 14 | 0 |
| 4096 | 16 | 4 | 15 | 1 |

The active order is Esme Dusk, `character-19`, pressure on `world-government`, status changed at tick 0 and never again. She has no attacker victory and no claim on that seed. Reports inside the 72-tick fixture: 13, 14, and 14. The two later reports are Esme's pressure at tick 959 on 1847, and Sable Morrow's protect at tick 108 on 4096. On 2718 Esme reports at tick 47, inside the fixture.

| Seed | Reported | Still waiting | min | median | max |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1847 | 14 | 14 | 241 | 1191 | 1200 |
| 2718 | 14 | 14 | 1153 | 1194.5 | 1200 |
| 4096 | 15 | 15 | 1092 | 1195 | 1200 |

Issuer at the report tick. Mara is the idle human on every one of her rows: she has the session, these runs send nothing, and she is never captive. Pax is the autonomous issuer. "Free" means his `captivity` was null on the report tick. Dead and defected are zero on every seed.

| Seed | Idle human | Autonomous, free at the report | Captive at the report |
| ---: | ---: | ---: | ---: |
| 1847 | 8 | 5 | 1 |
| 2718 | 8 | 6 | 0 |
| 4096 | 10 | 5 | 0 |

| Seed | Bucket | n | min | median | max | Still waiting |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1847 | idle human | 8 | 1174 | 1195.5 | 1200 | 8 |
| 1847 | autonomous, free at the report | 5 | 1167 | 1188 | 1200 | 5 |
| 1847 | captive at the report | 1 | 241 | 241 | 241 | 1 |
| 2718 | idle human | 8 | 1174 | 1196 | 1200 | 8 |
| 2718 | autonomous, free at the report | 6 | 1153 | 1189.5 | 1197 | 6 |
| 4096 | idle human | 10 | 1092 | 1196.5 | 1200 | 10 |
| 4096 | autonomous, free at the report | 5 | 1187 | 1190 | 1195 | 5 |

The captive report is Esme's pressure, seed 1847, tick 959. Pax was captured at tick 946. Mandatory release is `capturedTick + 14 * 6`, so tick 1030. He cannot submit while held, and he is autonomous, so he does not escape. That order then sat through the rest of the hold.

The five free Pax reports on 1847, and the five on 4096, were filed before those captures. They were still open when he was later taken, at ticks 551, 837, and 946 on 1847, and 310, 422, and 1121 on 4096. Each of those orders overlapped 252 ticks of his captivity on 1847 and 247 on 4096. On 2718 he is never captured. Those later captures matter only because nothing closed the report. They are the waits, and they are a different fact from his state on the report tick.

## What the prototype did

The function above was inserted after `expireStandingOrders` and then removed. Over 1200 ticks it completed every reported order and issued no new one. Refusals stayed 6, 6, and 4. Cancels and expiries stayed 0. Esme's pressure on 4096 stayed `active`. `standing-order-issued` stayed 0. The slot count M25 would treat as freed is the completed count: 14, 14, and 15. Nothing in this tree reads that freed slot and writes a successor. That writer is M25, and it is not in the code.

| Seed | `issuer-judgment` | `issuer-silent` | Completed | `order confirmed` relationships | Pressure completions with no second write |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1847 | 5 | 9 | 14 | 13 | 1 |
| 2718 | 6 | 8 | 14 | 13 | 1 |
| 4096 | 5 | 10 | 15 | 15 | 0 |

Pax's five free reports on 1847, and all six of his on 2718, and his five on 4096, closed on the next tick, before any later capture. The ninth silent close on 1847 is Esme at tick 965, six ticks after 959, while Pax was still held. Mara's eight, eight, and ten closed six ticks after their reports. The latest of those is Sable at tick 114. First and last completion ticks are 1 and 965, 4 and 48, 6 and 114.

At 1200 ticks the prototype matched the unmodified run on `rngState` (`3051708422`, `3536473515`, `382409966`), on money (`117165.75`, `131877.83`, `127048.86`), and on provisions stocks (`4563.082`, `4429.91`, `3269.858`). Event-type counts that did not change include `battle-resolved` (34, 32, 32), `character-captured` (10, 3, 11), `settlement-claimed` (12, 11, 9), `standing-order-deviated` (187, 16, 230), `standing-order-resumed` (187, 16, 229), and `market-trade` (5132, 5507, 5847). The type counts that changed are only `standing-order-completed` and `relationship-changed`.

M26 is a paid provisions delivery whose fulfilment is the goods landing. That judgment does not read `confirm-order`, `awaiting-confirmation`, or this function. A contract can be fulfilled while the standing order that describes a similar haul is still unsigned, and an unsigned order must not block the landing.

## Hash impact

The rule is not hash-neutral. The 72-tick fixture already contains 13, 14, and 14 of the reports, and every one of those is confirmed before tick 72. Esme's tick-959 report and Sable's tick-108 report are outside the window.

| Seed | New state hash | Events |
| ---: | --- | ---: |
| 1847 | `8e081fb09f0a73c29a8ca37581552f31ad8906fe5889fe4805dcf855e97f954a` | 8301 |
| 2718 | `64e843281dcb0733918fa72393a71f25ed36bdc40ae4d56e320c7461fca91538` | 8516 |
| 4096 | `b85a681050e4e21c96ea69dab9677565253641dae0bc26ca1b230996076e81d6` | 8031 |

Deltas are +26, +27, and +28 events: 13 + 13, 14 + 13, and 14 + 14. The 13 relationship writes on 2718 are the 14 completions minus Esme's pressure, which closed by judgment at tick 48 and did not write the second relationship. `rngState` after 72 ticks matched the unmodified run (`1404827802`, `3536473515`, `382409966`).

Inside those 72 ticks, stripping the new `standing-order-completed` events and the `order confirmed` relationships left the same 8275, 8489, and 8003 events in the same order. `battle-resolved` still matched on tick, actor, settlement, and outcome (0 mismatches). Claims matched: Glassport at 51 and Cinder Key at 70; Cinder Key at 35, Glassport at 48, Cinder Key at 63; Cinder Key at 51 and Glassport at 54. Deviations stayed 23, 16, and 11. `market-trade` stayed 373, 401, and 365. `goal-evolved` on seed 1847 was compared event by event, 10 against 10, and the payloads matched.

Two payloads still change, which is why the hash moves. `relationship-changed` rows that touch a pair after its confirmation carry trust `+0.012` and the other victory deltas with it. Inside 72 ticks that is 8, 9, and 11 rows, and every trust difference was `0.012`. Battle ids are `battle-${nextEventSequence}` at `startMajorBattle` in `src/sim/engine.ts`. Inserting the confirmation events advances that counter, so later battle, retreat, capture, and withdrawal payloads carry a new id. The first one on seed 1847 is Esme at Glassport on tick 3: `battle-000426` becomes `battle-000428`. The outcome stays `defender-advantage`, then `contested-retreat`. The shift of 2 is Zara Gale's judgment and her relationship write on tick 1. The people, the port, and the outcome do not change.

## Tests

- `tests/agency.test.ts`, beside "accepted orders report temporary deviations, resumptions, and completion judgments". A Free Tide report completes on the next tick with `reason: "issuer-judgment"`. The rng state is unchanged across that close. A pressure completion emits no `order confirmed` relationship. A protect completion emits one, with the victory deltas, and a second tick does not emit another.
- `tests/commands.test.ts`, beside "the issuer confirms a character's completion report before an order closes". That test still passes: Mara's report stays `awaiting-confirmation` on the next tick, and her `confirm-order` sets `completed` with `lastReport.kind === "confirmed"`. Add the silent case: with no command, her tick-0 report is `issuer-silent` at tick 6. A `cancel-order` queued before that tick yields `cancelled` and no `standing-order-completed`. A captive issuer is rejected `character-captive` on submit, and the report still closes at `waited >= 6`.
- `tests/golden.test.ts`. "pinned seeds reproduce their committed state hash and event count" moves to the three hashes and counts above. The pin is regenerated with `npm run golden:update` on Node v24.21.0, ICU 78.3, when the rule is accepted. It stays red until then.
- `tests/redaction.test.ts`, beside "only the commander's own orders are projected". A distant commander does not receive the `standing-order-completed` payload or the `order confirmed` relationship. Mara does not see Pax's order on Zara. The holder sees their own relationship event. No new tier.

The local prototype failed only the golden assertion, 163 of 164. The existing confirm test passed.

## Playtest

Follow `docs/playtests/TEMPLATE.md`. Dashboard HTTP JSON only, as in [informed-commitment-002](../playtests/informed-commitment-002.md). Seed 1847, Mara Vane (`character-01`), ticks 0–6.

**Hypothesis.** Pax signs his own officer's report on the next tick. Mara's report stays open long enough for her to sign a different one, and closes itself after a day if she does not.

**Ambition.** Advance one tick at a time. Read orders at tick 1, sign Ada Sorn's explore at tick 5, and do not sign Toma Reef's trade report. Advance to tick 6.

**Success.** At tick 1, Zara Gale's seeded order is `completed`, the log says `issuer-judgment`, and the actor is Pax. Mara has no confirm item for Zara. Toma Reef's order is still `awaiting-confirmation`, and Mara's briefing still offers `confirm-order`. At tick 5, Ada's order becomes `completed` from Mara's command, with no `issuer-silent` on that id. At tick 6, Toma's order is `completed` with `issuer-silent`. The log has no new `standing-order-issued`.

`PROMOTE` if those three orders finish that way. `REVISE` if Toma closes before tick 6, or if Ada's signature is ignored because the day already fired. `ABANDON` if Zara is still `awaiting-confirmation` at tick 6.

## Questions for Micah

1. **An officer says the job is done, and you do not answer. How long does it stay open?** Default: one day. You can still sign it or cancel it before then. After that, it closes as finished.
2. **A captain who is not you gives an order. Who signs the officer's report?** Default: that captain, on the next tick. They accept the report the officer already filed. They do not roll again, and they do not reject it on their own.
3. **You are in prison when the report arrives. Does the job wait until you are out?** Default: no. It closes after the same day. A prison term is fourteen days, and the job would sit the whole time.
4. **Does a finished job change what the officer thinks of you?** Default: yes, by the same small amounts the world already uses when they win a fight under orders. A pressure job that just won that fight is not paid twice. Cancelling the report does not change the relationship. No money changes hands.
5. **Once the job is signed, can you give that person a new one?** Default: yes. The signed job is finished, so your slot with them is free. Giving the new job is the order rule already accepted, and it is a separate change.
6. **You paid someone to land grain. Does that delivery wait for this signature?** Default: no. The grain arriving is the delivery. This signature is only for standing orders.
7. **Should time stop and wait for your signature, the way it stops in a battle?** Default: no. A day is the window. If you advance past it, the report is accepted.

## Captivity debts

Left for its own note. `processCaptivityDeadlines` (`src/sim/engine.ts`) is still the only writer of `DebtObligation`, and nothing reads `remainingValue`. After 1200 ticks this tree holds 8, 2, and 6 debts, and `remainingValue` equals `originalValue` on every row. The confirmation hook is the wrong place to collect them: it signs one character's order, and the debt is owed to a faction. The two loops do not share a judgment.

## Appendix

Report-tick ages, on Node v24.21.0. `captiveAtReport` is the issuer's `captivity` on the tick the status first becomes `awaiting-confirmation`. `captiveTicks` counts later ticks of the wait where the issuer is still held.

```bash
node --experimental-strip-types --eval '
import { runTick } from "./src/sim/engine.ts";
import { createPrototypeWorld } from "./src/sim/scenario.ts";
for (const seed of [1847, 2718, 4096]) {
  const world = createPrototypeWorld(seed);
  const rows = new Map();
  for (let i = 0; i < 1200; i++) {
    runTick(world);
    for (const character of Object.values(world.characters)) {
      for (const order of character.standingOrders) {
        if (order.status !== "awaiting-confirmation") continue;
        const issuer = world.characters[order.issuerId];
        const row = rows.get(order.id) ?? {
          id: order.id,
          reportedTick: order.statusChangedTick,
          kind: issuer?.controller.kind ?? "missing",
          captiveAtReport: Boolean(issuer?.captivity),
          captiveTicks: 0,
        };
        if (issuer?.captivity) row.captiveTicks += 1;
        rows.set(order.id, row);
      }
    }
  }
  const ages = [...rows.values()].map((row) => world.tick - row.reportedTick);
  console.log(seed, { n: ages.length, min: Math.min(...ages), max: Math.max(...ages), rows: [...rows.values()] });
}
'
```

The prototype re-ran the same 1200 ticks with `confirmUnansweredOrders` after `expireStandingOrders`, then compared event types, `rngState`, money, provisions, and, for the 72-tick window, event payloads with the new completion events removed.
