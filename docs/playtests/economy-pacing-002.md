# Playtest: trade versus a day of work, confirmed

## Session

- **Candidate commit:** `405ad6b` (live own-faction drift, 18-tick price belief, null stocks and prices when a report is absent, plus the earlier cargo list, sales-only tax, and whole-unit caps)
- **Date:** 2026-09-29 UTC
- **Operator:** Cursor general-purpose agent acting as an adaptive player, in a fresh context with no repository access. It was forbidden from reading any repository file, opening any database, or inspecting source, and it was told not to touch any port but the one named below.
- **Interface:** HTTP JSON API and the dashboard page, on `127.0.0.1:4417`, seed `1847`, `--reset`
- **Starting tick:** `0` (confirmed by `GET /api/health` before the first command)
- **Ending tick:** `22` (the last resolved event is stamped tick 21; the state tick advances at the end of that tick)
- **Player character:** Mara Vane (`character-01`), World Government, at Crown Harbor

## Hypothesis and ambition

**Milestone hypothesis:** A profit-seeking commander has a reason to trade rather than sit in port and work, and the books that were wrong in the first pacing session are now readable: the hold lists cargo by good, tax is labelled as a tax on sales, and the posted buy and sell maxima are whole units. A live own-faction price shows its drift. A foreign price ages. A settlement with no report does not pretend its stocks and prices are zero.

**Player ambition:** Make more money by trading than the same number of ticks of work would pay. Work once to learn the wage, then buy where a good is cheap, sell it where it is dear, and bring a return cargo home if the quotes say so.

**Success signal:** A finished round trip whose money per tick beats working those ticks, with the six book checks quoted from the public API.

## Adaptive decision log

The tick in this table is the tick the player was looking at. A queued command resolves on the following advance. The event log stamps the same facts one tick earlier. The evidence review reconciles them.

| Tick | Player-visible observation | Reasoning | Action | Outcome |
| ---: | --- | --- | --- | --- |
| 0 | Provisions maxBuy 26. Free hold 26. No wage on the board yet | One order above the posted maximum, then learn the wage | `buy-resource` provisions 27, then `work` | Refused `hold-full`: "The hold has room for 26 more units; 27 was requested". Work gross 20.15, tax 2.82, money 125.33 |
| 1 | Medicine 18.50, maxSell 4, holding 4. `taxAppliesTo` is `"sell"` | The dearest good already aboard | `sell-resource` medicine 4 | Gross 74, tax 10.36, money 188.97 |
| 2 | Arms 3.35, maxBuy 14. Glassport arms 14, drift 0 | Cheap here, dear at a live owned port | `buy-resource` arms 14 | Gross 46.90, tax 0, money 142.07. Cargo arms 17 |
| 3 | Glassport arms still 14. Passage 12 over 4 ticks. Tax 14% | The spread still pays after tax and passage | `travel` glassport | Four ticks at 3. Arrived looking at tick 7 with money 130.07 and 17 arms |
| 7 | Glassport arms 14, maxSell 14. Holding 17. Home arms 3.08 | The posted whole maximum is still dear | `sell-resource` arms 14 | Gross 196, tax 27.44, money 298.63 |
| 8 | Arms still 14, maxSell 3 | The rest of the cargo | `sell-resource` arms 3 | Gross 42, tax 5.88, money 334.75 |
| 9–12 | Medicine 4.07. Home medicine 18.50. maxBuy 11, then 11, then 11, then 6 as the hold filled | Return cargo, in the largest whole lots the board posted | `buy-resource` medicine 11, 11, 11, 6 | Tax 0 each time. Money 176.02. Medicine aboard 39 |
| 13 | Home medicine still 18.50. Passage 12 | Carry it back | `travel` crown-harbor | Four ticks at 3. Arrived looking at tick 17 with money 164.02 |
| 17–20 | Medicine still 18.50. maxSell 11, 11, 11, then 6 | Unload at the posted whole maximum | `sell-resource` medicine 11, 11, 11, 6 | Tax 28.49 three times and 15.54 once. Money 784.51 |
| 21 | Ship materials 11.25, maxSell 5, holding 5. Last Glassport quote 6.66 | Home is the dear quote | `sell-resource` shipMaterials 5 | Gross 56.25, tax 7.88, money **832.88** |

## Outcome

Mara finished a Crown Harbor ↔ Glassport round trip and stopped at Crown Harbor with an empty trade hold. She did not sail to Verdant Cay. From 108 she reached 832.88 in 22 ticks, about 32.95 a tick. One work tick paid 17.33 net. Twenty-two of those would have paid 381.26 and ended near 489.26. The voyage finished about 343.62 ahead.

## Evidence review

- **World report:** not used during play. Afterward, the event log in `.open-era/playtests/economy-pacing-002.sqlite` matches every fill: medicine 4 at 18.50, arms 14 at 3.35, arms 14 and 3 at 14, medicine 11+11+11+6 at 4.07, medicine 11+11+11+6 at 18.50, ship materials 5 at 11.25, and eight passage charges of 3. The refused provisions order is absent, which is what a rejection that never queued should look like. Final `characterMoney` is 832.88.
- **Metrics:** not consulted during play.
- **Map:** the player read settlement positions only as travel targets and passage quotes.
- **Decision/agency traces:** not consulted during play. The advance diff withheld other characters, so the player could not see who moved a price inside the tick response. `GET /api/state` still showed the board.
- **Conversation traces:** none. The player did not open a thread.
- **Recovery and determinism:** not exercised. This was one live session.

The six checks, in the player's words and quotes:

1. **Cargo.** Usable. Tick 0 hold: `{"capacity":74,"load":48,"free":26,"money":108,"provisionsReserve":34.4,"cargo":{"provisions":36,"arms":3,"medicine":4,"shipMaterials":5}}`. Sales moved one good at a time.
2. **Sales tax.** Usable. Market JSON `"taxRate":0.14,"taxAppliesTo":"sell"`. The page prints `14% tax on sales, not on purchases`. Every buy had tax 0. Every sell charged tax.
3. **Whole units.** Usable. Posted maxima were whole numbers, including 0 when only a fraction of provisions sat above the reserve. The over-max order was the `hold-full` refusal above. Orders at the posted maxima filled.
4. **Drift.** Visible and not usable. Tick 0 Glassport, from Crown Harbor: `"priceDrift":{"provisions":-0.01,"arms":0,"medicine":0,"shipMaterials":0.12}`. The page rendered `quiet -0.01/tick`, `quiet 0.00/tick`, and `quiet +0.12/tick`. Crown Harbor medicine moved by its drift on the next tick (17.27 + 1.23 = 18.50). Crown Harbor arms were −0.13 at 3.25 and the next quote was 3.29. The player could not tell when the figure was the next price.
5. **Aging foreign quote.** Verdant Cay was never visited. Prices stayed 1.18, 11.89, 4.61, 7.72. `priceQuote` stayed `{asOfTick:0, expiresTick:null, live:false}` and `priceDrift` stayed null. Confidence and age: tick 0, 0.21 and 11 ticks; tick 18, 0.16 and 29 ticks; tick 22, 0.15 and 33 ticks. Cinder Key, also unvisited, moved from 0.28 / 16 ticks to 0.21 / 37 ticks, with frozen prices. See the finding below: that confidence number is not the 18-tick price fade.
6. **Null stocks and prices.** None appeared. Every settlement had numbers for all four goods. Zeros were real zeros (Crown Harbor medicine stock 0 beside price 18.50). Population, fortification, and stability were null on foreign ports. The player did not see a missing market report.

## Findings

### What worked

- The round trip beat the wage by a wide margin, after the published 14% sales tax and a passage of 12 each way.
- The hold lists cargo by good. Tax is labelled as a tax on sales and the purse agrees. Max buy and max sell are whole units, and an order past the hold is refused with the room that remains.
- A live owned port shows `priceDrift`, and a rumor keeps a frozen price, a null drift, and an age that increases.

### Implementation defects

- The drift label said `quiet ±N/tick`. The player read it as the next quote. It is the island's own production and use, and another merchant can move the price the other way. Crown Harbor arms did.
- The header "Lasts" pill reads `party.provisionRunwayTicks`. The state payload has `runwayTicks` (62 at the start of this world) and `runwayDays`. The pill would say unknown while the API has a runway. The player did not execute the page; they read the script.
- The single `intelligence.confidence` next to a foreign price is `believedGarrison`, which fades on the 72-tick horizon. The 18-tick price fade lives in `believedPrice` and is not on the panel. The drop from 0.21 to 0.16 is the garrison weight, not the price weight. Not patched here: a second confidence would be the rumor/quote split this milestone left for the trade panel.

### Design risks and opportunities

- On arrival at Glassport a knowledge event said arms stock about 6.658 while the market showed 26.058 at price 14. The trade used the market. Two figures for one good on one tick is a confusing pair. Not changed.
- No settlement in this seed is without a report, because every character is seeded with every settlement. The null stock and price branch is real in the projection and unreachable in this opening. That is why check 6 found numbers everywhere.

### Follow-up experiments

- A second short session after the label fixes, to see whether "own use …/tick, if no one trades" is enough to stop a player treating drift as the next quote.
- A world with one unseeded settlement, to see the null stocks and prices in play rather than only in a test.

## Recommendation

`REVISE`

The ambition succeeded. Cargo by good, the sales-only tax, and the whole-unit caps all matched the purse. The drift column did not: it is labelled as a per-tick change and it is not the next price. The header runway looks up a field the payload does not have.

After this session, and not re-played: the drift line now reads "own use ±N/tick, if no one trades", and the header reads `runwayTicks` and `runwayDays`. Both are projection only. The golden hashes were not moved. A second voyage would be what turns this revise into a promote.
