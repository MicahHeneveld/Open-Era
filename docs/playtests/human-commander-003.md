# Human commander playtest 003 — delegated-order check-in

## Purpose

Exercise the durable order lifecycle as a human commander rather than merely observing autonomous behavior. The run used seed `1847` and began from a fresh four-island world.

## Human decisions

1. At tick 0, Mara Vane ordered Sable Morrow to protect Glassport at 97% priority for 72 ticks.
2. After the first four-hour interval, the exception-first briefing showed Toma Reef's supply-order completion report and Pax Ash's failed attack at Crown Harbor.
3. Mara confirmed Toma's report, closing that order.
4. Mara let the world advance for another 11 ticks and reviewed Sable's full behavior rather than replacing the assignment during a detour.
5. At tick 12, Mara confirmed Sable's completion report.

## Observed order history

| Tick | State change | Player meaning |
| ---: | --- | --- |
| 0 | Sable accepted the protection order | Initial willingness became durable state rather than a repeated prediction. |
| 1 | Sable diverted to travel | The detour was reported while the assignment remained active. |
| 5 | Sable resumed protection duties | The simulation distinguished resumed adherence from a new order. |
| 8 | Sable judged Glassport secure | The order moved to `awaiting-confirmation`; it did not close itself. |
| 12 | Mara confirmed the report | The order became `completed` through issuer authority. |

Sable's final order record retained one deviation, the completion report, and the issuer's confirmation. The World Government moved from 2335.44 power at the beginning to 2329.26 at tick 13; the Free Tide Compact moved from 1139.74 to 1017.20 as the surrounding autonomous simulation continued.

## What worked

- Acceptance, continuing adherence, and closure are now separate facts.
- A character can pursue a side activity without silently discarding the order.
- Completion reports remain actionable across check-ins until the issuer responds.
- Confirmation travels through the same validated, persisted command boundary as other human actions.
- The first briefing was concise and useful: one decision requiring action and one important military loss.
- Older schema-3 saves recover with the new additive order fields.

## Remaining weaknesses

1. **Completion volume will not scale unchanged.** Six World Government reports were awaiting confirmation after two in-world days. Hundreds of characters could overwhelm one officeholder unless reports are grouped, delegated, or filtered by command hierarchy.
2. **Protection judgment is still shallow.** A character currently infers that a location is secure from time present and local condition. Future threat estimates, recent hostile movement, and relief by another party should influence that judgment.
3. **Briefing read state is not persistent.** Action-required reports persist because the order itself remains open, but informational exceptions do not yet have per-player read, acknowledge, or dismiss state.
4. **Order revision is absent.** The issuer can confirm a report or issue another order, but cannot yet reply “continue for three more days,” amend the objective, or explicitly cancel an assignment.

## Conclusion

The milestone fixes the misleading-compliance problem found in playtest 001. Delegation now produces a legible chain of responsibility: issue, accept or refuse, follow or deviate, resume, report, and confirm. The next order-focused work should address briefing scale and amendments, but this lifecycle is strong enough to serve as the production foundation.
