# Human commander playtest 002

Date: 2026-09-24  
Build: `prototype/persistent-conversations-v3` with settlement conquest changes  
Seed: `1847`  
Commander: Mara Vane, World Government  
Duration: 10 ticks / 1.67 world-days

## Test rule

The tester acted through the same validated character-command boundary used by the dashboard. Autonomous characters continued making decisions between commands. No battle result or claim event was inserted directly; the accelerated run ended only after the settlement offered surrender to Mara and her claim command resolved.

## Command log

1. Sailed from Crown Harbor to Cinder Key.
2. Raided Cinder Key four times after arrival.
3. Continued attacking after the third victory left 9 defenders but stability remained above the surrender threshold.
4. Accepted surrender after the fourth victory reduced the garrison to 3 and stability to 25.27.
5. Established Mara's personal claim over Cinder Key, aligning the settlement with the World Government.

All six submitted commands were accepted and resolved.

## Outcome

- Cinder Key's owner changed from unassigned Free Tide control to Mara Vane personally.
- Territorial control changed from the Free Tide Compact to the World Government.
- Post-surrender stability reset to 55, representing a relatively orderly transfer without a separate rebellion subsystem.
- The remaining garrison stayed at 3; the claim did not create free military strength.
- World Government power increased from 2248.72 to 2329.08.
- Free Tide power decreased from 907.33 to 827.05.
- The conquest widened the power gap by 160.64 points.

## Battle trace

| Tick | Outcome | Defenders remaining | Settlement stability |
| ---: | --- | ---: | ---: |
| 5 | Mara victory | 63 | 61.18 |
| 6 | Mara victory | 24 | 49.21 |
| 7 | Mara victory | 9 | 37.24 |
| 8 | Mara victory | 3 | 25.27 |
| 9 | Surrender accepted and claim established | 3 | 55.00 |

## What worked

- Conquest required both military and political collapse: low garrison alone was insufficient.
- Settlement transfer was a deliberate player decision rather than an automatic side effect of battle.
- Surrender was reserved for the character whose victory crossed both thresholds, so an autonomous ally could not steal the claim later in the same tick.
- Ownership, faction power, dashboard state, event traces, and persistence all use the same event-sourced transition.
- Autonomous victors use the same surrender and claim rules.

## Deferred intentionally

- No rebellion or occupation-resistance simulation was added; the design calls for conquered settlements to be relatively easy to hold internally.
- External characters may still attack and attempt their own conquest normally.
- The prototype does not yet model governors, settlement law, taxation changes by an owner, negotiated surrender terms, or faction disputes over a personal claim.

