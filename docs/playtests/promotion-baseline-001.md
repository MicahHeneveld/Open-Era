# Playtest: promotion baseline 001

## Session

- **Candidate commit:** `46b819b`
- **Date:** 2026-09-24 UTC
- **Operator:** Codex, acting as an adaptive human commander
- **Interface:** Public dashboard HTTP API only
- **Seed:** `1847`
- **Starting tick:** `0`
- **Ending tick:** `22` (day 3.67)
- **Player character:** Mara Vane

## Hypothesis and ambition

**Milestone hypothesis:** The assembled simulation stack supports a coherent political objective through the same validated, persistent interface used by a player, while autonomous characters remain independent and the world remains recoverable.

**Player ambition:** Take Cinder Key from the Free Tide Compact and leave the new holding under autonomous protection.

**Success signal:** Cinder Key changes faction and owner through combat plus explicit surrender acceptance; an autonomous officer accepts the revised defense assignment and reaches the settlement; the resulting world recovers from its database without changing state.

## Adaptive decision log

| Tick | Player-visible observation | Reasoning | Action | Outcome |
| ---: | --- | --- | --- | --- |
| 0 | Mara had 80 troops and 248.5 party power. Rumor estimated Cinder Key's garrison at 96. | Build a margin before committing and seek a local officer's view. | Recruited at Crown Harbor and messaged Rook Tern about Cinder Key. | Mara gained 8 troops. Rook scheduled a reply for tick 6. |
| 1 | Toma Reef reported his Cinder Key supply order complete. | Close a verified delegated task before opening another. | Confirmed Toma's completion report. | The standing order closed normally. |
| 2 | Rook was a known World Government officer with 72 strategy. | Create pressure at the target without assuming perfect obedience. | Ordered Rook to pressure the Free Tide Compact at 92% priority. | Rook accepted after a personality and relationship assessment. |
| 3 | Mara had 88 troops, 262 party power, and sufficient provisions. | The estimated advantage justified direct reconnaissance and possible attack. | Traveled from Crown Harbor to Cinder Key. | Five-tick journey began. |
| 6 | Rook had briefly deviated to trade, then resumed. His reply acknowledged the message but did not answer the tactical question. | Continue on the formal order and direct plan rather than relying on the conversation. | Continued travel. | Mara arrived at Cinder Key on tick 8; Rook also moved toward the target. |
| 8 | Foreign intelligence was still shown as an old rumor on arrival, but Mara remained substantially stronger than the estimate. | Accept uncertainty and probe with one attack. | Raided Cinder Key. | Victory; direct observation then showed the garrison at 46. Mara lost health and troops. |
| 9–11 | Each attack was reported as a victory, but the visible garrison estimate stayed at 46. No surrender appeared until the fourth victory. | Continue while the party remained strong, stopping if a defeat or dangerous loss appeared. | Raided three more times, reassessing after each tick. | Four total victories reduced Mara to 60 troops and 76 health; Cinder Key offered surrender at tick 12. |
| 12 | A specific briefing action offered surrender to Mara. | Conquest required an explicit political decision rather than following automatically from battle. | Accepted surrender and claimed Cinder Key. | Mara became owner; the settlement joined the World Government with 2 garrison and 55 stability. |
| 13 | The offensive objective was complete and the new holding was fragile. Rook's pressure order was still active. | Reuse the existing delegation relationship for stabilization. | Materially amended Rook's order to protect Cinder Key at 98% priority. | Rook reassessed and accepted revision 2. |
| 14–22 | Mara needed recovery. Rook first completed his existing trip to Verdant Cay, then turned back toward Cinder Key. | Recover locally while allowing autonomous execution time. | Rested twice and advanced the world. | Mara recovered to 84 health; Rook reached Cinder Key while following the protection order. |

## Outcome

The player changed the regional political balance within 3.67 days. Cinder Key moved from the Free Tide Compact to Mara's personal ownership inside the World Government. World Government territory increased from two settlements to three, while Free Tide fell from one settlement to zero. Mara finished 4–0 with 60 troops and an autonomous defender present at the new holding.

The result did not require hidden-state edits or a scripted command sequence. The strategy changed in response to recruitment cost, order acceptance and deviation, delayed conversation, successive battle results, surrender availability, and the settlement's exposed post-conquest condition.

## Evidence review

- **World report:** 12 player commands were accepted and resolved; the chronicle records four victories, explicit surrender acceptance, a material order amendment, and Rook's eventual arrival.
- **Metrics:** World Government finished at 2321.67 power, 18,315.86 treasury, and three settlements. Free Tide finished at 783.57 power, 2,835.84 treasury, and no settlements.
- **Map:** The final map shows Cinder Key under World Government control with Mara and allied parties concentrated there.
- **Decision/agency traces:** Rook accepted the initial pressure order narrowly (`0.614` obedience versus `0.589` threshold), deviated twice for trade, resumed, then accepted the defense revision more strongly (`0.769`).
- **Conversation traces:** The six-tick response delay worked, but the deterministic reply was generic and did not address the requested garrison assessment or support decision.
- **Recovery and determinism:** Reopening the dashboard database replayed 477 post-snapshot events and produced state hash `1861e419f6a1c6a9660cbac2e4bb27e13ef7bd25dfecb67310d0c082deb0e88b`.

## Findings

### What worked

- A player could form, pursue, complete, and stabilize a political objective entirely through validated public commands.
- Surrender and claiming were separate from battle resolution, preserving a meaningful player decision.
- Rook's autonomy was legible: acceptance, temporary self-interested deviations, resumption, reassessment, and eventual compliance all appeared in reports and traces.
- The order could be revised from offense to defense without losing its history.
- Persistence survived a realistic dashboard session with many events after the latest snapshot.

### Implementation defects

- Local foreign-garrison intelligence refreshed after the first battle but remained visibly stuck at 46 through three later victories and the surrender. A player at the settlement needs a fresh post-battle estimate or an explicit “last observed” treatment that is hard to mistake for current strength.

### Design risks and opportunities

- Four identical raid commands made conquest feel repetitive. Major assaults need phased feedback, a compact campaign action, or clearer progress without returning tactical control to the player.
- The free-form reply system currently mimics delay but not useful understanding; Rook did not answer a concrete, relevant question. This is the clearest future language-model-adapter test.
- The attention count grew from 0 to 21 during the campaign because unrelated completion reports and warnings accumulated. Exception-first briefing needs safe batch handling or stronger relevance grouping.
- Capturing one settlement rapidly removed Free Tide's entire territorial base. This is useful pressure-test behavior, but faction survival and stateless-faction behavior need explicit product rules.
- Mara's money rose from 12 after recruitment to 264.8 shortly after conquest without a prominent income explanation. Ownership income needs a visible ledger before economy balance can be judged.

### Follow-up experiments

- Refresh or timestamp post-battle intelligence, then repeat the same conquest objective to test whether the player can judge when to stop attacking.
- Add a state-grounded dialogue adapter behind the existing validation boundary and repeat the exact tactical question.
- Test an overloaded check-in after a longer campaign, including safe bulk acknowledgement and reporting-officer routing.
- Run a defensive playtest in which the captured settlement is counterattacked before its garrison recovers.

## Recommendation

`PROMOTE`

Promote this candidate as the stable behavioral foundation, not as a complete game. The public command boundary, agency lifecycle, conquest flow, persistence, and evaluation outputs are strong enough to support the next experiments. Track the stale combat intelligence as the first implementation fix and treat grounded conversation plus briefing load as the next design probes.
