# Playtest: trade versus a day of work

## Session

- **Candidate commit:** `5654ebd` (economy pacing: depth, passage, return-leg consumption, remote tax, price expiry). Three projection clarifications landed after this session and were not played: the hold itemizes its cargo, the quote says tax applies to sales, and a depth refusal names the largest whole order.
- **Date:** 2026-09-29 UTC
- **Operator:** Cursor general-purpose agent acting as an adaptive player, given no repository knowledge. It was forbidden from reading any repository file, opening any database, or inspecting source, and it was told not to touch any port but the one named below.
- **Interface:** HTTP JSON API only, on `127.0.0.1:4417`, seed `1847`, `--reset`
- **Starting tick:** `0` (confirmed by `GET /api/health` before the first command)
- **Ending tick:** `17` (day 2.8; the last resolved event is stamped tick 16, and the state tick advances at the end of that tick)
- **Player character:** Mara Vane (`character-01`), World Government, at Crown Harbor

## Hypothesis and ambition

**Milestone hypothesis:** A profit-seeking commander has a reason to trade rather than sit in port and work. A reasonably played route should be competitive with working the same ticks, sailing should cost money as well as time, one order should not be able to empty a market at the pre-trade price, a return leg should be able to pay, a destination's tax should be visible before arrival, and a live price should say when it expires.

**Player ambition:** Make more money by trading than the same number of ticks of work would have paid. Work once or twice to learn the wage from the change in one's own money, then buy where a good is cheap, sell it where it is dear, and bring a return cargo home if one is worth carrying.

**Success signal:** A finished voyage whose money per tick elapsed is at least competitive with working those ticks, with the arithmetic recorded from the public API.

## Adaptive decision log

The tick in this table is the tick the player was looking at when they decided. A queued command resolves on the following advance, so the money in the outcome is the balance after that advance. The event log stamps the same facts one tick earlier; the evidence review reconciles them.

| Tick | Player-visible observation | Reasoning | Action | Outcome |
| ---: | --- | --- | --- | --- |
| 0 | Money 108 at Crown Harbor. Live medicine 17.27, arms 3.25. Glassport live arms 14, medicine 4.07, tax 0.14, passage 12 over 4 ticks. No wage seen yet | Work once and read the change in money | `work` | Gross 20.15, tax 2.82, money 125.33 |
| 1 | Net wage 17.33. Crown medicine now 18.50, arms 3.29. Glassport arms still 14, medicine 4.07. Both quotes live and expiring next tick | Work one more tick to see if the wage repeats | `work` | Gross 20.15, tax 2.82, money 142.66 |
| 2 | Holding 4 medicine. Crown price 18.50, maxSell 4, tax 0.14. Glassport medicine 4.07 | The medicine already aboard is worth more here than the live quote at Glassport | `sell-resource` medicine 4 | Sold at 18.50. Gross 74, tax 10.36, money 206.30 |
| 3 | Arms 3.22, maxBuy 14.4, free hold 31.728, money 206.30. Glassport arms still 14 | A 20-unit order fits the hold and the purse but not the posted 14.4, so ask and see what the market does | `buy-resource` arms 20 | Refused `market-depth`: Crown Harbor will clear 14.4. Money unchanged |
| 3 | Same book. 14 is the largest whole amount under 14.4. 14 × 3.22 = 45.08 | The refusal named the cap, and the Glassport spread is still there | `buy-resource` arms 14 | Bought at 3.22. Money 161.22. Cargo arms 17 |
| 4 | 17 arms. Glassport arms 14, tax 0.14, 4 ticks, passage 12, runway 58 | The spread survives the quoted passage, and the food lasts | `travel` glassport | Four ticks at sea, 3 money each. Arrived with money 149.22 and 17 arms |
| 8 | Glassport arms 14, maxSell 14.4, tax 0.14. Holding 17. Crown arms 3.08 | The market will clear 14.4 and the hold has 17, so sell 14 | `sell-resource` arms 14 | Sold at 14. Gross 196, tax 27.44, money 317.78. 3 arms left |
| 9 | Arms still 14, maxSell now 3. Crown arms 3.08 | The last 3 are still quoted at 14 against 3.08 at home, and the cap is exactly 3 | `sell-resource` arms 3 | Sold at 14. Gross 42, tax 5.88, money 353.90 |
| 10 | Medicine 4.07, maxBuy 11.2. Crown medicine 18.50 and stock 0. Passage home 12 | Eleven medicine at 4.07 against a live home quote of 18.50 fit the cap, the hold, and the cash | `buy-resource` medicine 11 | Bought at 4.07. Gross 44.77, money 309.13 |
| 11 | Crown medicine still 18.50, passage 12, runway 51. Ship materials at home had already moved from 4.29 through 8.38 to 9.37, each quote expiring next tick | Medicine is the cargo that can be priced. Do not buy more ship materials into a quote that will not survive the sail | `travel` crown-harbor | Four ticks at sea, 3 money each. Arrived with money 297.13. Medicine still 18.50 |
| 15 | Crown medicine 18.50, maxSell 11, tax 0.14. Holding 11 bought at 4.07 | The cap equals the cargo | `sell-resource` medicine 11 | Sold at 18.50. Gross 203.50, tax 28.49, money 472.14 |
| 16 | Still holding 5 ship materials. Crown 11.25, maxSell 5. Last Glassport price seen was 5.41 | The five already aboard are worth more here than where they were seen | `sell-resource` shipMaterials 5 | Sold at 11.25. Gross 56.25, tax 7.88, money **520.51**. Stopped |

## Outcome

Mara worked two ticks to learn the wage, sold the medicine she was already carrying, bought 14 arms at Crown Harbor and sold 17 at Glassport, bought 11 medicine there and sold them at home, then sold the five ship materials she had started with. Passage cost 24. She finished with 520.51 against a start of 108.

She could see Glassport's tax, its live prices, and the passage cost before she sailed. The arms price she was shown held at 14 for the four ticks at sea. The medicine price at home held at 18.50. She refused to treat a moving ship-materials quote as a price she could lock, which was the expiry doing the job it was added for. She did not sail to Verdant Cay or Cinder Key: their boards were rumors, older than the world in places, with no expiry tick, and the live spreads she could check were wider.

## Evidence review

- **World report:** The world was the dashboard session, not a headless gate run, so it is not one of the evaluation chronicles. It ended at state tick 17 with the commander's trades below. The headless 72-tick gate on this commit is separate and passed, including split recovery.
- **Ledger, reconstructed from the persisted events rather than from the player's log.** Event ticks are the tick the event was stamped with. Every total is the cent the event recorded:

  | Event tick | What | Qty | Unit | Gross | Tax | Money |
  | ---: | --- | ---: | ---: | ---: | ---: | ---: |
  | 0 | work | 1 | 20.15 gross | 20.15 | 2.82 | 125.33 |
  | 1 | work | 1 | 20.15 gross | 20.15 | 2.82 | 142.66 |
  | 2 | sold medicine | 4 | 18.50 | 74.00 | 10.36 | 206.30 |
  | 3 | bought arms | 14 | 3.22 | 45.08 | 0 | 161.22 |
  | 4–7 | passage | 4 ticks | 3 | 12.00 | 0 | 149.22 |
  | 8 | sold arms | 14 | 14 | 196.00 | 27.44 | 317.78 |
  | 9 | sold arms | 3 | 14 | 42.00 | 5.88 | 353.90 |
  | 10 | bought medicine | 11 | 4.07 | 44.77 | 0 | 309.13 |
  | 11–14 | passage | 4 ticks | 3 | 12.00 | 0 | 297.13 |
  | 15 | sold medicine | 11 | 18.50 | 203.50 | 28.49 | 472.14 |
  | 16 | sold ship materials | 5 | 11.25 | 56.25 | 7.88 | 520.51 |

  The refused 20-arm order is not in the log, which is what a rejection that never queued should look like. Net: 108 → **520.51**, i.e. **+412.51** over 17 state ticks, or **+24.27/tick**. Two ticks of work paid **17.33** net each (20.15 − 2.82). Seventeen such ticks would have ended at 402.61, which is **117.90 behind** the voyage. From the moment trading started (money 142.66 at event tick 1) the remaining 15 ticks made +377.85, or 25.19/tick, against 259.95 for working them.
- **Metrics:** Not a separate headless report. The comparison that matters for this session is the commander's own purse against her own measured wage.
- **Map:** Not inspected; the session used the JSON API.
- **Decision and agency traces:** Not read during play. Afterwards, the event log confirms the trades above and no other money events for the commander.
- **Conversation traces:** No player messages were sent.
- **Recovery and determinism:** Not re-run on this played world. The milestone gate's split recovery on the same commit matched the uninterrupted hash and replayed 584 events.

## Findings

### What worked

- **The wage was learnable by working.** Two ticks paid the same 17.33 net. The player did not need a published formula.
- **The destination tax was on the settlement before arrival.** Glassport, Verdant Cay, and Cinder Key all showed a tax rate from Crown Harbor, and the Glassport arms sale paid exactly 14% of gross.
- **A live price said when it died.** Owned ports carried `asOfTick` and `expiresTick` one tick later. The player declined a ship-materials purchase because that quote had already moved three times and each reading expired next tick. The arms and medicine quotes she did trust held through both voyages.
- **Rumors were not dressed up as quotes.** Verdant Cay and Cinder Key stayed `live: false` with `expiresTick` null, and their confidence sat around 0.18–0.28. She did not sail to them.
- **Depth bound an order the hold and the purse would have allowed.** Asking for 20 arms was refused with `market-depth` while free hold was 31.7 and money was 206.30. Buying 14 filled at the quoted 3.22. Selling was capped the same way: 17 arms became a sale of 14 and then of 3, both at the pre-trade price of 14, not one sale of 17.
- **The passage was money, quoted first.** `passageCost` 12 and `passageCostPerTick` 3 were on the destination before sailing. Each sea tick then cost 3, and provisions fell at 0.576 per tick both in port and at sea.
- **The return leg paid.** Eleven medicine bought at 4.07 sold at 18.50. Net of tax and of the 44.77 purchase, that leg cleared 130.24 before its share of the passage.

### Implementation defects

- **The hold total does not say what the hold contains.** `party.hold` listed capacity, load, free, money, and the provisions reserve. It did not list arms, medicine, or ship materials. Those figures are on the commander's own character, and the header pill shows provisions only, so a player reading the hold — the block a trade is paid from — learned the starting cargo from an upkeep event. The character payload did have the cargo; it was easy to miss. Fixed after this session by itemizing `party.hold.cargo`. Not re-played.
- **The quote did not say which side pays the tax.** Buyers paid the posted price with no tax. Sellers and work lost 14%. The player worked it out from the results. The dashboard already said "tax on sales"; the API field was just `taxRate`. Fixed after this session with `market.taxAppliesTo: "sell"`. Not re-played.
- **A depth cap is a fraction, and an order has to be a whole number.** maxBuy 14.4, and the refusal repeated 14.4 without saying that 14 would clear. The player guessed correctly. Fixed after this session: the published max is the largest whole order, and the refusal says so. Not re-played.

### Design risks and opportunities

- **A destination you can already price does not show maxBuy or maxSell until you dock.** Glassport's price, tax, stock, and target were visible from Crown Harbor, and `market` was null, so the depth ceiling appeared only alongside. Publishing a remote ceiling would be a second quote. Left as a decision: the actionable quote stays where the commander is standing.
- **The passage is charged on the departure tick and the arrival tick, and the arrival tick cannot carry a trade.** A four-tick voyage is four charges of 3, which matched the quoted 12. The player could first sell on the tick after arrival. Surprising, and consistent with the quote.
- **Rumor prices never moved.** Verdant and Cinder prices stayed the tick-0 figures for the whole session while their age climbed. That is an estimate with no expiry, which is what was intended, and it correctly talked the player out of sailing there. It also means a rumor cannot go stale in magnitude, only in confidence.
- **Working remains close.** The voyage won, 24.27 per tick against 17.33, not by a multiple. A route that misses the spread, or a quote that moves the way ship materials did, can still lose to the dock. That is the "is this trip worth it" question existing, rather than a failure of the route that was actually there.

### Follow-up experiments

- Stand offshore from an owned port and see whether a player can size the order from stock, target, and the published 16% rule without a remote maxBuy.
- Repeat the ship-materials temptation on a quote that expires, and see whether players still chase it once the hold lists the cargo and the tax side is labeled.
- Run the same ambition on seed 2718 or 4096, where the opening stocks differ and the Crown–Glassport pair may not be the route.

## Recommendation

`REVISE`

The ambition succeeded. The round trip was readable from live prices, a published tax, and a quoted passage, the depth cap refused a 20-unit dump and the 14-unit order filled at the quoted price, the medicine homeward leg cleared 130.24, and the purse finished 117.90 ahead of working the same 17 ticks. That is the milestone's hypothesis, and it held.

The revise is the books around that result, not the result. The hold the player was reading did not list its cargo, the quote did not say the tax falls on the sale, and the depth cap was a fraction the order could not be. Those three are projection fixes on this branch after the session; they were not played again. A remote maxBuy was requested and not added: the price, the stock, and the tax are already visible for an owned port, and a fill-sized quote offshore is a further decision. Promotion of the economy behavior does not depend on that quote. A second session would be what turns this revise into a promote.
