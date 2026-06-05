# Killer Queen — Fidelity Cross-Reference

How the current implementation ([game.js](../../game.js)) compares to the
authentic Killer Queen arcade game. This is the evidence behind the
`@fidelity-gap` and `@quirk` tags in the feature files.

**Sources for authentic behavior:**
- [Killer Queen Arcade — How to Play](https://killerqueenarcade.com/howtoplay)
- [Killer Queen (video game) — Wikipedia](https://en.wikipedia.org/wiki/Killer_Queen_(video_game))

## Faithful to the original ✅

| Mechanic | Authentic | Implementation |
|----------|-----------|----------------|
| Three win conditions | Economic, military, snail | All three present (`WIN_ECONOMIC`, `WIN_MILITARY`, `WIN_SNAIL`) |
| Military victory | Kill enemy queen 3× | Queen respawns by hatching eggs; 3 kills exhaust the eggs and trigger the win |
| Three eggs per team | "Only three eggs per team" | `index.html` defines `egg0/1/2` per team; queen hatches one at spawn |
| Worker carries one berry | One at a time | `berryCheck`/`collission` reject a second berry |
| Warriors can't carry berries or ride snail | Correct | `berryCheck` and `snailCheck` both guard on `!warrior` |
| Worker → warrior via warrior gate | Bring a berry to a winged gate | `ShrineWarrior` + `gainWarrior` |
| Speed upgrade persists into warrior | Bonus carries over | `gainWarrior` upgrades to `WARRIOR_SUPER_SPEED` (4) if already speed-upgraded |
| Warriors and queens can fly; workers can't | Correct | Worker `jump` requires grounded; warrior/queen jump in mid-air |
| Queen converts gates by touch | Correct | `Shrine.collission` sets `affiliation` to the queen's team |
| Workers respawn at hive; warriors respawn as workers | Correct | `mReset` clears `warrior`/upgrades and restores worker speed |
| Snail steered to a team basket | "Bring the snail to your team's basket" | Per-team push direction; reaching a basket fires `win_snail` |

## Fidelity gaps ⚠️ (`@fidelity-gap`)

1. **Speed gate does not speed up the snail.**
   Authentic: a speed-upgraded rider pushes the snail *faster*. Here the snail
   always moves at `SNAIL_SPEED` (0.1/tick) regardless of the rider's upgrade.
   See `04_gates_and_upgrades.feature`. Fix: scale snail speed by rider upgrade.

2. **Economic victory threshold differs in shape.**
   Authentic: deposit a fixed per-arena berry count into the hive (the same
   number for both teams). Here the rule is "every `goal` element for the team
   holds a berry" — driven by however many `goal-*` divs exist in `index.html`,
   not a tuned count. Functionally similar, but the win target is a side effect
   of the markup rather than an explicit number.

3. **No distinct queen "dive" attack.**
   Authentic: the queen has a dedicated downward dive kill. Here queen kills use
   facing + vertical-position rules, with no separate dive move.

## Implementation quirks 🐛 (`@quirk`)

1. **Countdown is instant.** `GAME_START_DELAY` is `0`, so the lobby countdown
   shows `0` and the match starts on the same tick. Likely a debug value left
   in (the constant has a commented-out `// 3`).

2. **Snail win doesn't verify basket ownership.** `Snail.collission` fires
   `win_snail` on contact with *any* `SnailCage`, crediting the rider's team
   without checking the basket's team. Latent only because a rider can physically
   steer toward their own basket — but it's an unguarded win.

3. **`Queen.lives = 3` is effectively dead state.** The military win is gated
   entirely on remaining eggs, not on this counter; `lives` is never read after
   assignment.

4. **AI is disabled.** `Toon.aiLoop` exists and `MoveTask`/`PathPoint` pathing
   is implemented, but `Toon.loop` never calls `aiLoop` (commented out: "until
   AI can be nailed down"). Unmanned toons stand still.

5. **`// wtf crash` / `// WTF CRASH` markers** on berry assignment in
   `Worker.collission` and `Goal.collission` flag spots the original author
   saw crash under some condition. Worth reproducing before refactoring.

## Notes for modernization

- The gaps above are **documentation, not a fix list** — none should be
  "corrected" silently during refactoring. Each is a deliberate decision for
  Josh: restore authentic behavior, or keep the cover's simplification.
- Quirks #1 and #2 are the cheapest fidelity wins and good first regression
  tests once a harness exists.
