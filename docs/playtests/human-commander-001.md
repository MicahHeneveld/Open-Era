# Human commander playtest 001

Date: 2026-09-24  
Build: `prototype/player-command-dashboard-v2`  
Seed: `1847`  
Commander: Mara Vane, World Government  
Duration: 29 ticks / 4.83 world-days

## Test rule

The tester acted as a player through the public HTTP command API. Decisions used Mara's stored intelligence and exact information about World Government assets. Exact foreign values present in the debug payload were ignored. No state was edited and no outcome was pre-scripted.

## Command log

1. Ordered Iris Stone to protect Glassport, Bram Quill to trade supplies through Glassport, and Rook Tern to pressure Free Tide.
2. Sailed from Crown Harbor to Cinder Key using an old, low-confidence report that estimated 96 defenders against Mara's party power of 248.5.
3. Raided after arrival. Mara won, losing 8 troops while the garrison lost 61.
4. Pressed the advantage with an immediate second raid. Mara won again, losing 6 troops while the garrison lost 35.
5. Withdrew to Glassport instead of repeatedly exploiting the raid action.
6. Rested once, recovering 4 health, then recruited 8 troops for 96 money.
7. Left Mara idle for two world-days to imitate an asynchronous player check-in.
8. Bought provisions at Glassport, returned to Cinder Key, waited for fresh direct intelligence, and raided its estimated 8 remaining defenders.

All 12 submitted commands were accepted and resolved.

## Outcome

- Mara finished 3-0 with 68 troops, 86 health, and party power 217.9.
- Cinder Key fell from 115 to 3 garrison and from normal stability to 25.87.
- Free Tide power fell from 1053.7 to 913.8, while World Government power finished at 2265.8.
- Cinder Key remained a Free Tide settlement; the build has no occupation, surrender, or transfer action.
- The world persisted 3,347 events in 11 snapshots. Restart recovery replayed 614 post-snapshot events to the same state hash: `479bcdef7c4fad3c2cefdfcdf281070b33ab873ad88d308914d0daefbfb50db9`.

## What worked

- The HTTP boundary was sufficient to play without direct state access.
- Travel, resupply, rest, recruitment, and combat formed a readable command loop.
- Autonomous activity continued while the human commander was idle.
- Stale intelligence created a real decision under uncertainty.
- Player commands and simulation outcomes survived restart exactly.

## Priority findings

1. **Foreign intelligence leaks through the dashboard state.** The API returns exact stocks, garrison, fortification, and party counts for every settlement even when the commander's stored knowledge is an old rumor. The client must receive a player-safe projection rather than debug truth.
2. **Standing-order status is misleading.** Characters can be marked compliant while acting against the plain meaning of the order. A character ordered to protect Glassport reached it, then left for Cinder Key and later Crown Harbor. “Pressure Free Tide” also caused its recipient to leave Cinder Key before returning later.
3. **Raids have no operational cadence.** Back-to-back raids can be issued one tick apart with no preparation or recovery constraint.
4. **Military victory has no political conclusion.** Reducing a hostile capital to 3 garrison and 25.87 stability cannot lead to occupation, surrender, negotiation, or transfer.
5. **Direct intelligence refresh is delayed and unclear.** Arrival does not immediately refresh knowledge; one additional tick is required, and the UI does not explain this.
6. **Reports are not actionable enough.** The player needs concise summaries of battles, subordinate deviations, threatened holdings, order progress, and intelligence age at check-in.
7. **The human character's emergent goal is invisible as an active plan.** Victories generate goal-evolution events, but Mara remains “Uncommitted” because human characters do not activate a long-term goal.

## Design implications

- Add a player-specific state projection before exposing the dashboard beyond debug use.
- Split order evaluation into acceptance and continuing adherence, and report deviations explicitly.
- Treat chats and reports as the channel for clarification, progress updates, and new intelligence.
- Add occupation/surrender only after combat and territory rules are designed; do not hide the gap behind more raid rewards.
- Keep commands event-sourced. The playtest confirmed that this boundary is useful for both humans and future dialogue-proposed actions.

