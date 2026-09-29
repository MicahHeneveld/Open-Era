# Ransom split

Settled. Question 24 in [owner questions](owner-questions.md). The coins a prisoner actually pays on release now arrive somewhere.

## The rule

`processCaptivityDeadlines` still takes `min(purse, demand)` at two decimal places. That paid amount is the only money that moves. The unpaid remainder stays the debt, with the same creditor and the same loyalty scar.

When the captor faction exists:

- Half goes to that faction's treasury.
- Half goes to the captor's party leader.

When the captor has no faction, the party leader receives the whole payment. Nothing is taken from the debt.

The party leader of a faction is the command holder, the one person who issues that faction's standing orders. The prisoner is never that leader. If the seat is unnamed, or the holder is the prisoner, the leader is the faction member with the highest leadership plus `personality.loyalty * 50`. A lower id wins a tie. The scar is not read.

With no faction, the leader is the prison's owner when that owner has no faction and is not the prisoner. Otherwise the same ranking is applied to unaffiliated characters. These three seeds have no such release through tick 1200. A fixture covers it.

If a faction exists and no leader can be named, the treasury receives the whole payment. If nobody can be named at all, the coins stay in the purse. Neither case happens on these runs.

## Rounding

Money is stored at two decimal places. The split is done in whole cents. There is no RNG.

The odd cent goes to the treasury. The leader's share is `floor(cents / 2)`. The treasury's share is the rest. The two shares sum to the amount paid.

58.13 is 5813 cents: 29.07 to the treasury and 29.06 to the leader. 0.01 pays the treasury 0.01 and the leader 0. A payment of 0 pays 0 and 0. With no faction, 40.01 pays 40.01 to the leader.

## Event and reducer

The event type stays `captivity-released`. The payload gains a `ransom` object: `treasuryShare`, `leaderShare`, `treasuryFactionId`, `factionTreasury`, `leaderId`, `leaderMoney`. `terms` is unchanged. The capture event is unchanged, so a hold that has not been paid does not move the hash.

`applyEvent` sets the treasury and the leader purse from those absolutes when the share is greater than 0. Replay and recovery credit the same accounts the live tick credited. A snapshot taken before the release, then replayed, matches the live world.

## The line

The feed, the briefing, and the chronicle keep the debt wording and "Loyalty fell". They add one sentence both sides can read, including when the payload stays withheld:

`Mina Vale paid 58.13 ransom: 29.07 to the World Government treasury and 29.06 to Mara Vane.`

No faction: `Sable Morrow paid 40.01 ransom: 40.01 to Niko Crow.`

## Hash impact

Tick 72 does not move. No ransom is paid before tick 72 on 1847, 2718, or 4096. The first release on each seed is the first tick the state diverges, one tick after the event, because the credit is applied during that tick:

| Seed | Event tick | State tick | Release | Paid | Treasury | Leader |
| ---: | ---: | ---: | --- | ---: | ---: | --- |
| 1847 | 118 | 119 | Sable Morrow, sequence 13680 | 13.4 | 6.7 Free Tide Compact | 6.7 Pax Ash |
| 2718 | 155 | 156 | Mina Vale, sequence 18482 | 58.13 | 29.07 World Government | 29.06 Mara Vane |
| 4096 | 96 | 97 | Sable Morrow, sequence 10683 | 106.84 | 53.42 Free Tide Compact | 53.42 Pax Ash |

The state hash at the event's own tick, before that tick runs, still matches `443be9e`.

Tick 1200 moves because the leader's purse is read by recruit, travel, and trade. Pax Ash receives the first credit on 1847 and on 4096, so later decisions change. On 2718 the first credit goes to Mara Vane, who does not choose autonomous actions, and the list of captures stays the same until Pax is paid at tick 955.
