# Playtest: autonomous short purse

## Session

- **Candidate commit:** `fd21558`
- **Date:** 2026-09-29 UTC
- **Operator:** The implementing agent, Open Era Engineer, a Cursor cloud agent. This was not a fresh-context operator. The agent had already written the score gate and knew Jun Ash would be short after recruiting. During the session every reading was taken from the dashboard HTTP JSON (`GET /api/state`, `POST /api/advance`). No command was sent. The database and the decision payloads were opened only after the session stopped, for this evidence review.
- **Interface:** Dashboard over HTTP, JSON API only. Server `127.0.0.1:4317`, database `.open-era/playtests/autonomous-short-purse.sqlite`, started with `--seed 1847 --reset`.
- **Seed:** `1847`
- **Starting tick:** `0`
- **Ending tick:** `10`
- **Player character:** Mara Vane (`character-01`, World Government), starting at Crown Harbor with 80 troops and 108 money. She did not sail and she did not issue a command.

## Hypothesis and ambition

**Milestone hypothesis:** An autonomous character whose purse cannot cover a passage stays in port and works or trades, and sails again once the purse can cover it.

**Player ambition:** Stay at Crown Harbor and watch Jun Ash (`character-25`), who is standing in the same port. Read his purse against the quoted passages. See whether he leaves while the purse is short.

**Success signal:** At tick 6 his money is under every quoted passage and `travel` is null. The tick that follows is work, not travel. After the wage covers the quotes, a later tick starts a voyage.

## Adaptive decision log

| Tick | Player-visible observation | Reasoning | Action | Outcome |
| ---: | --- | --- | --- | --- |
| 0 | At Crown Harbor with Jun Ash. He is co-located, so the purse is exact: **117**. Navigation 20, troops 17, `travel` null. The panel's passage rate is **3** per tick. From here Verdant Cay is 4 ticks / **12**, Cinder Key is 5 ticks / **15**, Glassport is 4 ticks / **12** | 117 covers every quote. Nothing here is a reason for Mara to sail. Watch him spend | Advance, no command | Stayed. His feed lines are `Jun Ash: decision made` and `Jun Ash: recruited`, payloads withheld |
| 6 | Still at Crown Harbor. Jun Ash money **4.77**, `travel` null, still co-located. Mara's quotes are unchanged: 12, 15, and 12. Her own money is still 108 | 4.77 is under 12 and under 15. The shortest quote on the panel is 12, and the rate is 3, so a 2-tick passage would still be 6. He cannot buy a voyage | Advance | The tick's lines are `Jun Ash: decision made` and `Jun Ash: worked`. `travel` stays null |
| 7 | Jun Ash money **19.36**, still at Crown Harbor, `travel` null. Quotes still 12, 15, and 12 | 19.36 covers 12 and 15. If the gate only blocks a short purse, travel is allowed again. It does not have to win this tick | Advance | Again `decision made` and `worked`. He does not sail |
| 8 | Jun Ash money **33.95**, still at Crown Harbor, `travel` null | The purse still covers every quote. One more tick | Advance | `Jun Ash: travel started`. Payload withheld |
| 9 | Jun Ash `locationId` null, money null, tier `distant`. `travel.toId` is `cinder-key`, `remainingTicks` 5. Mara is still at Crown Harbor on 108 | He left. The purse is no longer readable because he is at sea | Advance | `Jun Ash: travel progressed`. Session stopped at tick 10, still at sea, remaining 4 |

## Outcome

Mara did not sail. Jun Ash stood beside her at Crown Harbor. At tick 6 he held 4.77 against passages of 12 and 15, and the next tick was work, not a voyage. The wage left 19.36, which covers those quotes, and he worked one more tick. On tick 8 he sailed for Cinder Key. From tick 9 the panel shows the voyage and withholds the purse.

## Evidence review

- **World report:** The recovered world reached tick 10 with state hash `1159cb074b7e027bf5b3177bd7c57a1d22d95ce8adf2ebbe95292bfd8586ba77`. 1,142 persisted events across 2 snapshots. Recovering the world replayed 440 events after the latest snapshot and reproduced that hash. Tick 10 is not a snapshot boundary.
- **What the feed hid:** Every Jun Ash line in the advance diff had `payloadWithheld: true`. The player sees `worked` and `travel started`, not the scores. The post-session log is the rest of this review.
- **The quotes, from `quotedPassage` on the recovered rules, at the start of tick 6:** money 4.77 at Crown Harbor. Verdant Cay 4 ticks, cost 12, not affordable. Cinder Key 5 ticks, cost 15, not affordable. Glassport 4 ticks, cost 12, not affordable. Those are the same 12 and 15 the panel quoted for Mara, who was standing in the same port. After the tick-6 wage the purse is 19.36 and all three are affordable.
- **Decisions, from the event log:** Tick 6 chooses `work` at 67.97. The only travel candidate in the stored top six is Verdant Cay at **−1000**. Tick 7 chooses `work` at 62.26, with travel offered again: Glassport 55.03, Cinder Key 54.84, Verdant Cay 47.3. Tick 8 chooses `travel` to Cinder Key at 59.86, reason "seek a stronger provisions market at Cinder Key", 5 ticks. The wage on ticks 6 and 7 is gross 16.96, tax 2.37.
- **Earlier in the same hour:** Tick 5 recruits 3 troops for 36 and leaves 4.77, which is why tick 6 is short. Tick 3 is the same shape one cycle earlier: 11.59 after a recruit, under 12 and 15, and the decision is work, with Verdant Cay at −1000 in the stored candidates. This session's reading is tick 6.
- **Map:** She is still at Crown Harbor. He is at sea for Cinder Key.
- **Decision/agency traces:** The −1000 score is not on the player API. It is on the `decision-made` payload in the database.
- **Conversation traces:** No player messages were sent.
- **Recovery and determinism:** The dashboard database recovered to the hash above. The milestone gate's split recovery is a separate 72-tick check.

## Findings

### What worked

- **4.77 did not sail.** Every passage from Crown Harbor cost 12 or 15. The tick worked. `travel` stayed null.
- **Travel came back once the purse covered the quote.** At 19.36 the three passages are affordable and the log scores them above zero. He sails on the next tick, to Cinder Key, the voyage the short purse could not buy.
- **He does not sail on the first tick he can pay.** Tick 7 scores work at 62.26 and the best voyage at 55.03. Work wins. That is the planner, not a second refusal.
- **The player can see the purse and the voyage, and cannot see the score.** While he stands at Crown Harbor the money is exact. Once he sails, money is null and `travel` names Cinder Key. The chronicle line does not include the −1000.

### Implementation defects

None observed. The short purse stayed in port. The funded purse sailed.

### Design risks and opportunities

- A voyage that has already started is not recalled. This session did not open one and then empty the purse. Sea ticks still charge `min(money, 3)`.
- Standing still did not touch Mara's 108. Ten ticks is inside the opening hold. The idle-starvation finding is unchanged and was not the point of this session.
- The feed cannot show why he worked. A player who wants the −1000 has to already know the rule.

### Follow-up experiments

- Watch a character whose only affordable passage is one port and whose plan names another, and see which one is refused.
- Stay through a voyage that starts solvent and arrives at zero, and confirm the ship is not turned around.

## Recommendation

`PROMOTE`

At tick 6 Jun Ash held 4.77 against passages of 12 and 15 and worked. At 19.36 those passages were affordable. On tick 8 he sailed to Cinder Key.
