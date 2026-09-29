# M33 release record

**Status: Open.** Design note for the owner. No rule is in the tree. M33, [captive intelligence](captive-intelligence.md), is accepted and not built. Questions 61–68 in [owner questions](owner-questions.md) are the defaults. This note is only the recovery of the one stored object, `releaseSighting`. The captor row stays a projection.

Checked on `origin/main` at `149d94209d3267cd069b0fe9ce6c7e3927ebe491`, which contains `1cdf09c`. Node v24.21.0, ICU 78.3. `npm test` passed, 242 tests. The 72-tick fixture passed: `cb04ba5d392d8b1c868cc97e54cb21b21ec171edd546bb70d0d7aba86cc69c11` / `bd7d8cc44d5fa21022ecb8f8086e13dfbb9475eb025b5ae53f87e2991f90035c` / `20975bf480e5aa11eeafe1ce39c36cf5ba0fa8e2d5de2bb5887a35d7b3aecc9f`, with 8301 / 8513 / 8031 events. Recovery on seed 1847, split at 47, replayed 572. No `captivity-released` falls inside those 72 ticks. The first releases are event tick 118 (Sable Morrow, 1847), 155 (Mina Vale, 2718), and 96 (Sable Morrow, 4096). Mina is already captive at tick 72, captured at event tick 71, sequence 8402.

## The failure

`stateHash` is sha256 of `canonicalJson(WorldState)`. The event log is counted, not hashed. Payloads live in `data_json`. `WorldStore.recover` loads the latest snapshot and applies later events through `applyEvent` only. A snapshot is written when `world.tick` is a multiple of `ticksPerDay` (6), or after 5,000 events.

The spec writes `releaseSighting` inside `processCaptivityDeadlines`, after upkeep and before the release event, because the prison is gone once `captivity` is cleared and the character walk has run. The `captivity-released` reducer already copies money, debt, travel, and troop recovery off the event. It has no prison record, and the event has no garrison and no anchored parties. A write that only mutates the live character is on that world and on any snapshot taken after the tick. Replay from an earlier snapshot drops it.

Sable's release on seed 1847 ends at `world.tick` 119, which is not a snapshot day. The latest snapshot is tick 114, and recover replays 593 events, including her release. A local harness wrote the record on the character beside `emit` and not in the reducer, then the tree was restored. Live state at tick 119 hashed to `c5389e0e899f2c3f87c43cb9ceb92bd75f62717ecfdafa208916528d8ec42792` and held her record. Recovered state hashed to `084674c20ded2abc10881afe7369dd83f3539a58ff52c63712a884b5a5606e26`, the unmodified world, and the record was gone. The event count stayed 13787.

Mina's release ends at `world.tick` 156, a snapshot day, so recover from that snapshot replays 0 events and keeps the live write. The drop shows up from the earlier snapshot. Discarding later snapshots and recovering from tick 72 replays 10084 events through tick 156, which is the same `applyEvent` loop. Live state hashed to `3fa162ddb4b33c37afccce12abcfa3af0bca383ecd1510496138f28a906230d5`. Replay hashed to `991709d4b9ab3d14b96a52327fc650f275721629b24e2ea33a4f78141c1c08cc`, the unmodified tick-156 hash in the captive-intelligence note, with her record absent. The golden split stops at tick 72 and then keeps calling `runTick`, so the fixture stays green.

The harness record matched the note's Mina row: Crown Harbor, World Government, captor World Government, garrison 208, `observedTick` 155, and the four published parties. Each party also carried `characterId` and `name`, so the post-release hashes above are for that object. They are a different figure from the note's older `034ab027…`. The tick-72 fixture never contains the object.

## What moves a golden hash

A field, or a new event type emitted only at release, moves a golden state hash only when it changes `WorldState` inside 72 ticks, and moves the golden count only when it adds or removes an event in that window. Measured on the three seeds, the unmodified log, the beside-`emit` write, a payload field, and an in-reducer derivation all left the fixture hashes and the counts unchanged, and all four left the tick-72 event-array hash unchanged. That event-array hash is local. The fixture does not store it.

Once a release has happened, storing the record moves the state hash. At tick 119 and tick 156 the payload field and the in-reducer derivation matched the beside-`emit` state hashes, and matched the unmodified event counts (13787 and 18597). `WorldState.version` stays 5. The field stays omitted until the first release, as `partySightings` and `loyaltyAdjustment` do.

## (a) A field on `captivity-released`

Compute the record at the moment the spec names, put it on `data.releaseSighting`, and assign it in the reducer before `captivity` is cleared. A later release replaces it when `observedTick` is greater or equal. Escape writes nothing. Money, debt, travel, and troop recovery already survive replay because this event carries them.

This adds no event type. The spec's line is "No new event." A field keeps that line if "event" means a type, and breaks it if the payload must stay as it is. The log does gain bytes. At tick 119 the local event-array hash moved from `ea984489c094065022cc695bcca622bf41d6c5ac0f9c8c55e0f9c2f674cab8dd` to `6b3c17e2afa0b9f8a640ae21e391e6dd14dfdf6d32503675d070772835476519`. The golden hashes did not. Recovery matched for Sable's natural replay and for Mina's replay from tick 72.

`eventPayloadVisible` already hides another character's `captivity-released`, so the field stays inside a withheld payload. The actor can read their own. The character projection still has to leave the stored object null for everyone else, as it does for `knowledge`. Complexity is that assignment and the projection. Replay copies the stored object, so a later reorder of the tick leaves an old record alone.

## (b) Derive it, with no new data

On read, after the hold, the record is gone. At tick 156 Crown Harbor's garrison is still 208, and the anchored set is already Mara Vane, Vale Drake, Bram Tern, and Sable Sorn. Orin Frost has left, and Mina is at sea (`crown-harbor` → `glassport`, 2 of 3 left). The upkeep event carries garrison and no party list, and a port in battle emits no upkeep event. Rebuilding by walking the log on every read was not timed.

During replay, the `captivity-released` case still sees the pre-release world: upkeep has been applied, the walk has not, `captivity` is set, and a fellow prisoner's `partyPower` is 0. The reducer can build the object there and store it, with nothing added to the event. That keeps "no new event" as both type and field. The event-array hash through tick 156 stayed on the baseline. The fixture did not move. Both recovery checks matched, and the stored state hash matched option (a).

The scar is the nearby precedent: the reducer stores `loyaltyAdjustment`, and the event does not name it, because `terms.debtValue` is already on the event. This derivation reads the port and the other characters. It stays right only while `applyEvent` still sees them before it clears the prisoner. A later phase change would move the record while the log looked the same. Complexity is that ordering, plus the same projection rule as (a).

## (c) Snapshot only, or a later recompute

The beside-`emit` write is the failure above. It holds when the latest snapshot is after the release and replay does not cross it, which is Mina at tick 156, and it fails for Sable at tick 119. Recomputing from the port after the walk uses a later garrison and a later party list. Mina's list had already changed on the tick her release finished. The spec's nine holds all changed that set during the hold. A new event type is a new event, which the spec refuses. It was not patched. The measured absence of releases inside 72 ticks means that type would leave the fixture count where it is, and storing its payload would move the state hash at the first release. That is not a separate run.

## Recommendation

Use (a). This event is already what makes the release replayable, and the prison record is one more fact from the same moment. If the payload must stay byte-for-byte as it is, use the in-reducer derivation in (b): it also recovered, and it left the fixture and the event-array hash in place. Leave the record off a live-only write.

**Question.** Does "no new event" allow a `releaseSighting` field on the existing `captivity-released` event, or must that payload stay as it is?
