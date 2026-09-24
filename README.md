# Open Era

Open Era is a persistent maritime political sandbox in which human players and autonomous characters pursue their own ambitions in the same continuously simulated world.

This branch contains the first **headless world prototype**. It is intentionally focused on simulation behavior rather than presentation: we can accelerate days of world activity, inspect why characters made decisions, stop and restart the process, and compare outcomes before committing to the mobile UI or networking stack.

## What the prototype exercises

- 30 persistent named autonomous characters with personality-weighted decisions
- Four islands, including a dominant World Government and a smaller rival faction
- Four abstract resources: provisions, arms, medicine, and ship materials
- Local production, consumption, shortages, supply-and-demand prices, and territorial taxes
- Party provisions, sailors, troop recruitment, morale, and attrition
- Physical travel between islands and merchant arbitrage
- Character-plus-troop combat against settlement garrisons
- Persistent personality-rooted goals and structured multi-tick plans
- Imperfect island knowledge that becomes stale and refreshes through direct observation
- Trust, affinity, respect, fear, grievance, and obligation between characters
- Standing orders that characters independently accept or reject based on loyalty, values, relationships, ambition, and risk
- Goals and relationships that change after victories, defeats, and shared local experiences
- Deterministic seeded outcomes with detailed decision traces
- SQLite event persistence, daily snapshots, state hashes, and crash recovery
- Markdown, CSV, JSONL, JSON, and SVG evaluation outputs

The simulation core uses only Node.js APIs. There are no third-party runtime dependencies yet.

## Requirements

- Node.js 24 or newer

## Run it

```bash
npm run simulate -- --ticks 72 --reset
```

The default run advances twelve in-world days and writes:

- `simulation-output/latest/report.md` — readable world chronicle and final balance
- `simulation-output/latest/map.svg` — map of islands, parties, and active routes
- `simulation-output/latest/decision-traces.jsonl` — scored alternatives behind every decision
- `simulation-output/latest/agency-traces.jsonl` — plan reviews, beliefs, evolving goals, and relationships
- `simulation-output/latest/metrics.csv` — faction power, treasury, and resource trends
- `simulation-output/latest/final-state.json` — complete inspectable world state
- `.open-era/world.sqlite` — durable event log and snapshots

Run the command again without `--reset` to recover the stored world and continue it:

```bash
npm run simulate -- --ticks 24
```

Useful options:

```text
--ticks, -t       ticks to advance (six ticks equal one day)
--seed, -s        deterministic seed for a new world
--database, -d    SQLite world path
--output, -o      report directory
--reset           replace the selected local simulation database
```

## Verify it

```bash
npm test
```

The tests prove seeded determinism, divergent seeded histories, snapshot-plus-event recovery, ordered event sequences, and coverage of the connected economy, movement, decision, and battle systems.

## Architecture

```text
src/sim/scenario.ts      deterministic pressure-test world
src/sim/agency.ts        goals, plans, beliefs, relationships, orders
src/sim/engine.ts        decisions, economy, travel, and combat
src/sim/state.ts         event reducer, derived values, state hashing
src/sim/persistence.ts   SQLite event log, atomic ticks, snapshots
src/sim/reports.ts       human- and machine-readable evaluation output
src/cli/                 disposable headless runner
tests/                   determinism and recovery checks
```

The simulation files are intended to survive into the production server. The CLI and report generator are diagnostic adapters; a future Expo client can observe this state through an API without moving game rules into the UI.

## Current boundary

This is a behavioral probe, not a complete game. Dialogue, deeper personality branching, faction offices, settlement ownership, debt, captivity, lost technology, inner strength, inheritance, and human-issued orders are still deferred. The current standing orders are scenario fixtures used to validate autonomous obedience and refusal before adding player-controlled command flows.
