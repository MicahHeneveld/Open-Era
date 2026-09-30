# Captivity negotiation

Status: **Built in M35**.

Captivity negotiation is the first gameplay outcome driven by an ongoing message thread. A prisoner cannot press a local "negotiate" button. They must direct-message the named capturing authority until that autonomous character chooses to open structured release terms.

## Authority and state

Capture selects one autonomous authority from the captor's faction. Settlement ownership, physical presence, leadership, strategy, and officer or steward roles break ties in that order. The prisoner learns this identity immediately so the social route is always actionable.

The case stores four player-facing stances:

- `unreceptive`
- `listening`
- `considering`
- `open`

The underlying persuasion value, threshold, attempt count, and system maximum are private simulation state. They are never included in the player's captivity projection.

## Decision boundary

The simulation decides whether the captor opens terms. It evaluates:

- the captor's caution, loyalty, aggression, and commerce;
- the captor's relationship with the prisoner;
- how long the prisoner has been held;
- whether the message asks for negotiation, makes a request, shows respect, threatens, insults, repeats itself, or attempts prompt manipulation.

The dialogue provider receives the decision after it has been made and voices it. Its `proposedActions` remain discarded. An LLM may eventually replace the deterministic prose provider without gaining authority to free a prisoner, set a price, or mutate the world.

## Terms

An open offer names a money demand bounded by the same system maximum used for mandatory release. The prisoner may:

- accept;
- make one counterproposal;
- reject and return to persuasion;
- ignore it and attempt the guaranteed dangerous escape;
- wait for the fourteen-day mandatory release.

An accepted offer or counter uses the existing release event, ransom routing, debt, loyalty scar, command-seat restoration, travel, and troop-recovery paths. A rejected offer lowers the accumulated persuasion and closes the terms, but does not permanently close communication. New credible messages can produce a new offer.

## Safety and persistence

- Repeated messages and prompt-injection language reduce rather than bypass persuasion.
- Only a message to the assigned authority advances the case.
- One counter may be tried against each offer.
- The captor's qualitative stance and demand are visible; private numeric reasoning is not.
- Capture events from older snapshots are normalized by selecting an authority and creating a default case during replay.
- Dangerous escape and mandatory release remain hard anti-soft-lock guarantees.

## Deferred

This slice negotiates money and prisoner-release debt only. Resource transfers, services, political favors, temporary allegiance, rescue missions, and general-purpose agreements remain later systems.
