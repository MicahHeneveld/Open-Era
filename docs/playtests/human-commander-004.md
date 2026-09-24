# Human commander playtest 004 — scalable command oversight

## Purpose

Test whether one human commander can revise delegated work and process a busy check-in without granting command authority to an autonomous intermediary. The run used seed `1847` and a fresh four-island world.

## Human decisions

1. Mara Vane ordered Sable Morrow to protect Glassport at 97% priority.
2. At the first check-in, Mara reviewed one completion decision, five direct warnings, and Jun Marrow's digest of nine routine order acceptances.
3. Mara acknowledged the digest and a resolved battle notice, then attempted to acknowledge Toma Reef's unresolved completion report. The system correctly refused to hide the decision.
4. Mara replaced Jun with Kessa Calder as reporting officer. Previously handled routine notices did not reappear under the new officer.
5. Mara materially amended Sable's order from protecting Glassport to exploring Verdant Cay. Sable reassessed and accepted revision 2.
6. Mara changed only the priority and deadline. Revision 3 retained Sable's prior acceptance and did not trigger another judgment.
7. Mara cancelled the order. Sable's order became `cancelled` and stopped influencing her plan.

## Results

| Capability | Result |
| --- | --- |
| Routine routing | Nine acceptance notices became one officer digest. |
| Exception escalation | Refusals, deviations, a battle loss, stale intelligence, and completion decisions remained direct. |
| Acknowledgement | Resolved information disappeared immediately and stayed hidden. |
| Protected decisions | An unresolved completion report could not be acknowledged away. |
| Officer replacement | Changing officers preserved the previous routine-report watermark. |
| Major amendment | Directive and target changes created a new revision and acceptance decision. |
| Minor amendment | Priority and expiry changes preserved acceptance. |
| Cancellation | The order closed before the character's next autonomous action. |

The initial briefing contained seven rows rather than the fifteen rows that would have been needed to show the same information without a digest. This matters because direct warnings were no longer displaced by routine acceptances.

## Remaining weaknesses

1. **Officer behavior is instantaneous.** The prototype treats report collation as administrative routing. Activity, travel, disloyalty, and communication delay do not yet affect when a digest arrives.
2. **Eligibility is shallow.** Any known autonomous faction member may be appointed. Offices, rank, proximity, and explicit reporting relationships are not modeled yet.
3. **Acknowledgement is one item at a time.** Large organizations will eventually need safe bulk acknowledgement for resolved information, while preserving the prohibition on hiding unresolved decisions.
4. **Order language is still narrow.** Amendments change directive, target, priority, and deadline, but cannot yet express conditions such as “protect until relieved” or “avoid battle unless attacked.”

## Conclusion

The milestone materially improves the weekly check-in loop. Routine information can be compressed and dismissed, exceptions stay prominent, and the player can revise or terminate delegated work without replacing the whole order. Most importantly, the reporting officer reduces attention cost without acquiring the authority to confirm, amend, or cancel orders.
