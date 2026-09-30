# Playtest: reject terms, persuade again, and counter

## Session

- **Candidate commit:** `0023a80`
- **Date:** `2026-09-30` UTC
- **Operator:** Codex acting as the human commander
- **Interface:** public dashboard HTTP API only
- **Seed:** `9`
- **Player:** Mara Vane (`character-01`)
- **Starting tick:** `0`
- **Ending tick:** `29`

## Hypothesis and ambition

**Hypothesis.** A naturally captured player can identify the captor, persuade them through delayed messages, reject the first offer, reopen negotiations through a new message, counter the renewed terms, and reach the existing debt-and-recovery release path without exposing the persuasion formula.

**Ambition.** Make a dangerous political raid, avoid the guaranteed-but-wounding escape, reject terms that feel too high, then negotiate a better release.

## Adaptive decision log

| Tick | Visible situation | Human decision | Outcome |
| ---: | --- | --- | --- |
| 0–5 | Cinder Key is hostile and the forecast warns of danger. | Sail from Crown Harbor and raid anyway to create political pressure. | The opening phase goes badly. |
| 6–7 | Retreat is available. | Withdraw rather than continue the battle. | The low capture roll lands. Mara is captured with 93 troops scattered. |
| 7 | Mara Calder is named as the capturing authority; stance `unreceptive`. | Ask respectfully for release and offer ransom or debt. | Reply at tick 11; stance `listening`. |
| 11 | The captor is listening but wants a better reason. | Acknowledge her duty and request fair terms. | Reply at tick 17; stance `considering`. |
| 17 | The captor is considering. | Frame release as useful to both factions. | Reply at tick 22; terms open at 201.53. |
| 22–23 | The demand is clear and bounded. | Reject it instead of accepting or escaping. | Offer closes and stance returns to `considering`. |
| 23–28 | Messaging remains available. | Reconsider and offer to accept a serious lawful obligation. | A new offer opens at 196.19. |
| 28 | One counter is available. Mara has only 75 money. | Counter at 147.14, 75% of the renewed demand. | The captor accepts. Mara pays 75 and records 72.14 debt. |
| 29 | Mara is free and sailing to Glassport. | End the session. | All 93 troops enter gradual recovery. |

## Evidence

- Stance path: `listening → considering → open → considering → open`.
- First and second offer ids differed; the second demand fell from 201.53 to 196.19.
- The counter resolved as `negotiated-counter`, not mandatory release.
- The release split the 75 paid ransom into 37.5 for the Free Tide treasury and 37.5 for Pax Ash, using the existing routing rule.
- The unpaid 72.14 became a `prisoner-release` debt and triggered the existing loyalty consequence.
- The release restored Mara's command seat, began a physical two-tick voyage, and scheduled all 93 scattered troops for return.
- Four human messages received four delayed autonomous replies. No dialogue output executed a gameplay action.
- The dashboard exposed the stance, authority, and demand. It did not expose persuasion, attempts, threshold, or system maximum.

## Findings

The rejection loop is meaningfully different from merely pressing the same offer again: rejection closes the terms and applies a persuasion setback, while a new message and another delayed reply are required to reopen them. The renewed offer also reflects the later tick and higher accumulated persuasion.

The strongest remaining product question is whether a counter decision should also wait for a message-like delay. It currently resolves on the next simulation tick through the command queue. That is consistent with other structured commands and did not make the conversation feel broken in this session.

## Verdict

`PROMOTE`

The branch proves the intended narrow loop and preserves the escape and mandatory-release guarantees.
