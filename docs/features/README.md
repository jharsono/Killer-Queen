# Killer Queen — Behavior Features

## Overview

These Gherkin feature files document the **current behavior** of the
server-authoritative Killer Queen engine in [game.js](../../game.js) and the
socket wiring in [app.js](../../app.js). They are written per
[BDD_STYLEGUIDE.md](../BDD_STYLEGUIDE.md) and serve two purposes:

1. **Characterization** — a behavioral spec of what the code does *today*, so
   the planned modernization (modularization, TypeScript, rooms) can refactor
   against a verifiable contract with no regressions.
2. **Fidelity reference** — each scenario is cross-checked against the
   authentic Killer Queen arcade game. Deviations are flagged inline and
   collected in [FIDELITY.md](FIDELITY.md).

As of Phase 0 of the modernization plan, these are **executable**: cucumber-js
in [../../v2/](../../v2/) is wired to this directory and runs them as 68 pending
scenarios (`cd v2 && npm test`). Step definitions live in
`v2/features/step_definitions/`; they drive an instantiable `GameSession`
headlessly. Phase 1+ replaces the pending bodies with real assertions, greening
the suite slice by slice — "done" is when every scenario is green.

## Feature Files

- **01_lobby_and_match_flow.feature** — connect, character select, ready-up,
  countdown, quick-join, win/reset, disconnect handling.
- **02_movement_and_physics.feature** — horizontal movement, gravity, jumping,
  flight (warrior/queen), ground/wall collision, screen wrap.
- **03_berries_and_economy.feature** — berry pickup/carry/deposit, one-berry
  limit, economic victory.
- **04_gates_and_upgrades.feature** — speed gate, warrior gate, gate cooldown,
  berry consumption, queen gate conversion.
- **05_snail.feature** — mounting/steering, per-team push direction, swallowing,
  dismount, snail victory.
- **06_combat_death_and_respawn.feature** — warrior/queen attacks, death
  effects, invulnerability, warrior→worker respawn, queen-vs-queen.
- **07_queen_and_victory.feature** — egg-based queen respawn, three-kill
  military victory, game-over presentation.

## Tag Reference

| Category   | Tags                                                                          | Usage |
|------------|-------------------------------------------------------------------------------|-------|
| Priority   | `@core`, `@advanced`                                                          | Must-match core rules vs. edge/secondary behavior |
| Domain     | `@lobby`, `@movement`, `@economy`, `@gates`, `@snail`, `@combat`, `@queen`, `@victory` | Which subsystem the scenario covers |
| Aspect     | `@physics`, `@lifecycle`, `@upgrade`, `@collision`, `@validation`, `@error`   | What the scenario focuses on |
| Fidelity   | `@fidelity-gap`, `@quirk`                                                     | `@fidelity-gap`: diverges from authentic KQ. `@quirk`: implementation oddity / likely bug |

Tag order: **Priority → Domain → Aspect → Fidelity**.

## Usage Examples

```bash
# Core rules only
cucumber --tags "@core"

# Everything about the snail
cucumber --tags "@snail"

# Scenarios that diverge from the real game
cucumber --tags "@fidelity-gap or @quirk"

# Core combat, excluding queen-vs-queen edge cases
cucumber --tags "@core and @combat and not @advanced"
```

## Related Files

- Engine: [game.js](../../game.js)
- Socket wiring / lobby: [app.js](../../app.js)
- Client rendering: [site.js](../../site.js)
- Level + geometry source: [index.html](../../index.html), [style.css](../../style.css)
- Fidelity cross-reference: [FIDELITY.md](FIDELITY.md)
