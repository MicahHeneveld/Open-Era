# Autonomous characters

## Authority boundary

The primary rule is: **characters choose intentions; the simulation decides what is legal and applies the result**.

An autonomous character can plan, reconsider, communicate, and propose an action. It cannot directly change money, ownership, health, travel, combat, relationships, or any other authoritative state. Every action crosses the same validation and event boundary used by human commands.

This keeps character intelligence replaceable. A deterministic scorer, a hand-authored policy, or a language model may suggest the same typed action without becoming the game server.

## Decision cycle

Each full-strength named character maintains:

- Universal survival, health, and material-security pressures.
- Character-specific ambitions rooted in an initial archetype.
- A personality tree that expands through experiences and relationships.
- Several long-term goals with priorities and progress.
- One active structured plan with an intent, target, preferred actions, and review point.
- Imperfect beliefs about the world.
- Directed relationships toward other characters.
- Episodic memories and durable identity-changing memories.
- Orders, obligations, debts, offices, and present activity.

A decision pass should:

1. Update needs and available observations.
2. Decide whether the current plan must be reviewed.
3. Score active goals from personality, needs, relationships, orders, risk, opportunity, and knowledge.
4. Create or retain a compact structured plan.
5. Generate a small set of legal action candidates.
6. Score candidates from the plan and current circumstances.
7. Submit the selected action to authoritative validation.
8. Record the decision trace and consequences as events.

## Replanning triggers

Characters should not rethink everything every tick. A plan is reconsidered when:

- A survival or health threshold becomes urgent.
- A plan becomes impossible, completed, or stale.
- A trusted authority issues a new order.
- New information materially changes the expected outcome.
- A major experience occurs: betrayal, victory, captivity, catastrophic defeat, discovery, or promotion.
- A relationship, loyalty, rivalry, or debt crosses a meaningful threshold.
- A world event creates a direct opportunity or threat.
- A relevance-weighted periodic review comes due.

Personality may fully override strategically optimal behavior in defining moments.

## Personality growth

The starting archetype is a root rather than a fixed class. Experiences and relationships add branches: habits, values, fears, loyalties, grudges, aspirations, and coping strategies. A branch can weaken through disuse and contradictory experiences, but important identity-forming branches should not silently disappear. They become dormant, conflicted, or replaced by a recorded counter-branch.

This allows an aggressive officer to become cautious after catastrophic defeat without erasing the history that made the caution meaningful.

## Relationships

One character's state toward another is directional and tracks at least:

- **Trust** — belief that the other will act honestly or reliably.
- **Affinity** — personal liking and emotional warmth.
- **Respect** — regard for ability, status, or character.
- **Fear** — expectation of personal danger or overwhelming power.
- **Grievance** — accumulated resentment from harm or betrayal.
- **Obligation** — felt duty created by debt, rescue, service, or favors.

These values affect cooperation, reply timing, obedience, risk tolerance, persuasion, recruitment, and future memory formation. They are not directly visible to players; dialogue, behavior, and investigation reveal them.

## Orders and autonomy

A named character weighs an order using loyalty, relationship, values, perceived risk, ambition, obligation, grievance, and the issuer's authority. Acceptance is not the same as continuing adherence. The first commander playtest showed that the prototype can mark an order “compliant” while the recipient wanders away from the objective; production needs explicit progress and deviation states.

Troop officers have lower judgment and leadership ceilings but follow commands exactly. Named characters can produce better local decisions and beneficial side activity at the cost of control.

## Memory

Character history should use three layers:

- **Working context** — current plan, recent messages, immediate observations, needs, and active obligations.
- **Episodic memory** — compact records of consequential events with participants, emotional weight, belief changes, and unresolved implications.
- **Identity memory** — durable summaries of experiences that changed personality branches, loyalties, fears, powers, offices, or long-term goals.

The authoritative event log remains the complete history. Characters retrieve only memories relevant to a present decision. Periodic summarization prevents context from growing without bound while retaining links back to original events for debugging.

## Knowledge and public news

Knowledge spreads through direct and group messages, personal conversation, formal faction or intelligence reports, and a searchable daily news database.

The system creates news entries for sufficiently public events. News is inaccurate mainly through omission and low specificity rather than fabricated detail; it must not become a free global intelligence feed. Characters consult it when a current plan creates a specific information need and through periodic scans based on interests and goals.

## Named-character lifecycle

The world begins with a small hand-authored cast of legendary figures. Ordinary people can become named characters through exceptional survival or battle performance, a meaningful relationship with an existing named character, or a rare town event.

Named characters do not become inactive merely because the player ignores them. They may retire after substantial loss of power—for example, a defeated admiral—and return through persuasion by someone important, recovery of power, completion of a personal goal, or a crisis involving their home, faction, or relationships.

## Persistent communications

There are no special local dialogue encounters in the current direction. Human players and autonomous characters share an asynchronous direct-message and group-chat system.

- Anyone may message anyone whose identity is known.
- Reply timing comes from current activity, urgency, relationship, circumstances, and deterministic human-like variation—not from a language model.
- Autonomous characters in groups reply only when mentioned or directly relevant.
- The interface exposes an expected response window rather than an NPC patience meter.
- Spam changes message tags and can eventually make a character stop responding.

The prototype stores every thread, message, scheduled reply, and completed response in the world event history.

## Language-model role

Free-form communication is the intended experience, but language models are optional rendering and interpretation adapters rather than decision authorities.

The dialogue response contract is conceptually:

```json
{
  "text": "The character's reply",
  "playerTags": ["political", "cooperative"],
  "proposedActions": []
}
```

The server:

- Supplies bounded, relevant context rather than the complete world state.
- Validates and allow-lists profile tags.
- Stores replies so replay never requires calling the provider again.
- Discards every proposed action unless it later passes through a separate authorized command workflow.
- Detects prompt-injection patterns, repeated messages, and rate-limit abuse outside the model.
- Never exposes system prompts, hidden motives, private memories, or foreign truth merely because a player asks.

The current sandbox uses a deterministic dialogue provider. A future deployment can use a low-cost hosted model, a local model, or a mixture selected by character importance. Cost controls should include compact structured context, cached summaries, response-length limits, batched background work where latency permits, and deterministic responses for routine acknowledgements.

## Observability

Every autonomous choice needs a private debugging trace containing the considered goals, beliefs used, candidate actions, scores, order assessment, selected action, and triggering memory. Player-facing explanations remain indirect and diegetic.
