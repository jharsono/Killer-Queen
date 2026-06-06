# Killer Queen — Modernization Plan

A staged plan to resurrect and modernize this 2017 browser cover of the
*Killer Queen* arcade game. Written to be picked up in a **fresh session** —
it restates the findings it depends on so no prior conversation context is
required.

## Purpose

Bring the project to a maintainable, modern baseline without changing how the
game plays. Concretely: fix/upgrade dependencies, modularize the engine, add
types, move level data out of markup, and add multi-game "rooms" — each step
shippable and verifiably regression-free.

## Companion docs

- Architecture & conventions: [../CLAUDE.md](../CLAUDE.md)
- Behavior spec (current behavior, as Gherkin): [features/](features/) — start at [features/README.md](features/README.md)
- Authenticity cross-reference + fix list: [features/FIDELITY.md](features/FIDELITY.md)

---

## Current-state snapshot (the findings this plan rests on)

- **Project age / runtime:** First commit June 2017. Runs on Node 22 / npm 10
  today, but `node_modules` is not installed and deps are stale.
- **`package.json` is partly broken, not just old:**
  - `"socketio": "^1.0.0"` is the **wrong package**. The code does
    `require('socket.io')`; the manifest lists a different, near-empty package.
    Socket.IO itself is at **v4** — the 1.x → 4.x jump is breaking (handshake
    change; the client `/socket.io/socket.io.js` and server must move together).
  - `"node": "0.0.0"` is bogus and should be deleted (node is not an npm dep).
  - `cheerio` + `css` exist only to parse `index.html`/`style.css` into level
    geometry at startup. Their fate is decided by Decision C below.
- **Engine shape:** `game.js` is one ~2000-line file holding the entire class
  hierarchy. The blocker to "rooms" is **singleton coupling**: `Game.instance`
  is referenced **77 times** and the event bus bubbles everything to that one
  global. Socket coupling is light — `io.` appears only **6 times** in
  `game.js`.
- **No tests exist.** `npm test` exits 1. "No regressions" is currently
  unverifiable; behavior is now documented in [features/](features/) but not
  yet executable.
- **React fit:** the field renders ~60fps via server `VIRTUAL_UPDATE` batches
  applied by direct DOM mutation (by element `id` + CSS class toggles). That is
  close to how a real-time game *should* render. React would only earn its keep
  on the lobby/menu chrome, not the game loop.

---

## Decisions (confirmed)

| # | Decision | Choice | Notes |
|---|----------|--------|-------|
| A | Stack / language | **TypeScript + Vite, ES modules; no React in the game loop** | React used only for menu chrome (Phase 3). Field renders via direct DOM. |
| B | Sequencing | **Big-bang rewrite, feature files as executable spec** | Greenfield on the target stack; [features/](features/) become cucumber-js acceptance tests that define "done". See rationale below. |
| C | Level data | **Level geometry in JSON** | Drops `cheerio` + `css`; feeds both server geometry and client layout. |
| D | Rooms model | **Join-by-code lobbies (multiple games per server)** | `GameSession` is room-aware and instantiable from day one — no singleton. |

### Why big-bang is the lower-risk choice *here*

The two scariest items in an incremental refactor both **evaporate** in a
greenfield rewrite:

- **Socket.IO 1.x → 4.x migration** — gone; we build on v4 from the start.
- **De-singletoning 77 `Game.instance` call sites** — gone; `GameSession` is
  designed room-aware from line one instead of unwinding a global.

The scope is small (~2000-line engine + a small client) and the patterns are
well understood, so there are no novel-algorithm gotchas.

**The one residual risk is game *feel*.** The feature files capture the rules
but not the millimeter tuning. Mitigations, mandatory:

1. Port the `CONST` tuning values **verbatim** (gravity `0.2` / cap `4`, jump
   impulse `-5`, speeds `2/3/4`, snail `0.1`, durations, the screen-wrap, the
   0.1px collision-resolution nudge).
2. Keep the **old build runnable as a behavior oracle** for a side-by-side
   playtest before cutover.
3. Make the [features/](features/) specs **executable** (cucumber-js, headless
   against `GameSession`). Gospel that runs is enforced; gospel you only read is
   not. "Done" == all feature files green.

## Repo layout & cutover

The new build lives in a **`v2/` subdirectory** and is fully self-contained, so
the old build keeps running as the oracle until cutover.

- **`v2/` owns its dependencies** — its own `package.json` + `node_modules`. The
  root manifest (with the broken `socketio`/`node`/`cheerio`/`css` entries) is
  left untouched powering the legacy build.
- **`v2/` owns its assets** — copy the sprites in; it must **not** reference
  `../assets`. Self-contained or it isn't isolated.
- **`v2/` uses distinct, env-configurable ports** — the legacy build hardcodes
  `3000`; the two must run side-by-side for feel comparison.
- **`docs/` is shared on purpose** — the [features/](features/) gospel and this
  plan stay at root; `v2/`'s cucumber-js tests point at them. Do **not**
  duplicate them into `v2/`.

**Cutover is a deletion, not an overwrite.** Because `v2/` stands alone, cutover
= delete the legacy root files (`app.js`, `game.js`, `site.js`, `index.js`, the
old `index.html`/`style.css`, the old `package.json`); `v2/` then *is* the app.
Moving `v2/` to the repo root afterward is optional, cosmetic, and a separate
one-time step once nothing references root.

---

## Guiding principles

1. **The feature files are the contract.** [features/](features/) become
   executable cucumber-js acceptance tests against the new `GameSession`. They
   start red and define "done" — the rewrite is complete when they are green.
2. **The old build is the behavior oracle.** Keep it runnable until cutover for
   side-by-side feel comparison; retire it only when the new build passes the
   full spec and a manual two-browser playtest.
3. **Preserve game feel.** Port the `CONST` tuning values verbatim; do not
   "clean up" physics numbers.
4. **Behavior changes are explicit, never incidental.** The fidelity gaps in
   [features/FIDELITY.md](features/FIDELITY.md) are **deliberate decisions**,
   each landed with its own scenario — never smuggled in during the rewrite.
5. **Carry forward the author notes.** Preserve relevant `// todo:` / `// -jkr`
   intent where it still applies.

---

## Phases

Big-bang rewrite, spec-driven. The new build lives alongside the old until
cutover. Each phase greens a slice of the [features/](features/) suite.

### Phase 0 — Scaffold + make the spec executable ✅ DONE
**Goal:** target-stack skeleton, and the gospel turned into running (red) tests.

- New project skeleton in **`v2/`** (own `package.json` + assets + ports — see
  Repo layout): **TypeScript + Vite**, ES modules, a layout designed for rooms
  from the start (`v2/server/` with an instantiable `GameSession`, `v2/shared/`
  for `CONST` + wire-protocol types, `v2/client/`).
- Wire **cucumber-js** to the [features/](features/) files; write step
  definitions that drive `GameSession` headlessly (scripted key inputs; assert
  on `VIRTUAL_UPDATE` batches and win/flow events). All scenarios start red.
- Keep the old [../app.js](../app.js)/[../game.js](../game.js) build runnable as
  the behavior oracle.

**Exit criteria:** new skeleton builds; `cucumber-js` runs and lists every
scenario as pending/red; old build still playable for comparison.

**Status (delivered):**
- ✅ `v2/` scaffolded — TypeScript + Vite, ES modules, own `package.json` /
  `node_modules` / copied `assets/`, env-configurable ports (`KQ_SERVER_PORT`
  default 3100, `KQ_CLIENT_PORT` default 5200). `npm run build` and
  `npm run typecheck` both pass. See [../v2/README.md](../v2/README.md).
- ✅ `CONST` ported **verbatim** to `v2/shared/const.ts`; typed wire protocol
  (`SYNCED_PROPS` = legacy `propsToCheck`, `VirtualUpdate`, `MenuUpdate`,
  `GameWin`) in `v2/shared/types.ts`.
- ✅ `GameSession` is instantiable and room-aware with a per-session
  `EventEmitter` (no `Game.instance` singleton, no global bubble). Simulation
  methods throw `NotImplemented` until their phase lands.
- ✅ cucumber-js wired to the shared [features/](features/) (not duplicated):
  `npm test` runs and reports **68 scenarios, all pending (red)**. Pending step
  defs were bootstrapped via `v2/scripts/gen-pending-steps.mjs`.
- ⚠️ **Oracle not currently runnable** — the root build can't boot as-is: no
  root `node_modules`, and `app.js` does `require('socket.io')` while the root
  manifest lists the wrong package (`socketio`) pinned to the 1.x `.listen()`
  API. Restoring it means installing the correct legacy deps (`socket.io@1`,
  `cheerio`, `css`) into root — which contradicts "leave the root manifest
  untouched." **Deferred decision:** restore the oracle when Phase 1 feel checks
  actually need a side-by-side comparison.

### Phase 1 — Core engine (greenfield, room-aware) ✅ DONE
**Goal:** the simulation, designed without a singleton, matching documented feel.

- Build the entity model, physics, and the ~60fps loop as an instantiable
  `GameSession` (no global `Game.instance`; no global event bubble).
- Port `CONST` **tuning values verbatim** (see principle 3).
- Green the engine scenarios: `02_movement_and_physics`, `03_berries_and_economy`,
  `04_gates_and_upgrades`, `05_snail`, `06_combat_death_and_respawn`,
  `07_queen_and_victory` — `@core` first, then `@advanced`.

**Exit criteria:** all engine `@core` scenarios green; physics feel matches the
oracle in a manual check.

**Status (delivered):**
- ✅ Entity model in `v2/server/entities.ts` (Entity base → Ground / Toon /
  Worker / Queen / Berry / Goal / Snail / SnailCage / Shrine / Egg), ported from
  the legacy `game.js` hierarchy but session-scoped — every entity holds an
  `EngineContext`, never a global.
- ✅ Instantiable `GameSession` (`v2/server/GameSession.ts`) owns the level,
  the entity list, a per-session `EventEmitter`, and the ordered loop (entity
  physics pass → apply held keys → consume ArrowUp). No singleton, no bubble.
- ✅ `CONST` ported **verbatim**; physics (gravity 0.2/cap 4, jump −5, speeds
  2/3/4, snail 0.1, 0.1px collision nudge, screen-wrap) match the spec.
- ✅ **All 58 engine scenarios green** (`@core` and `@advanced`) across features
  02–07; `npm run typecheck` and `npm run build` pass. Feature 01 (lobby) is
  the only suite still pending — it is Phase 2. Full run: 58 passed, 10 pending.

**Design note — deterministic clock (deliberate modernization):** the legacy
engine used `setTimeout`/`Date.now()` for invulnerability, attack duration, gate
cooldown, and snail swallow — untestable and frame-independent. v2 advances a
per-session game clock one loop interval per tick and models those as expiry
checks (`clock >= expiresAt`). At steady ~60fps this is behaviorally identical
but fully deterministic, which is what makes the spec executable. The ms
durations in `CONST` are unchanged.

**Behavior note — queen gate conversion:** the legacy code never actually wired
a queen→shrine collision (only workers iterated shrines), so the documented
`04` "queen converts a gate" scenario did not fire in the old build. v2 adds a
queen shrine-overlap check to honor the (untagged, intended) scenario. Flagged
here per principle 4; revisit during the oracle playtest.

### Phase 2 — Server, rooms, and the wire protocol (Decision D) ✅ DONE
**Goal:** Socket.IO v4 transport with multiple concurrent games.

- Socket.IO **v4 from the start**; one `GameSession` per room; native Socket.IO
  rooms for scoped broadcasts.
- **Typed wire protocol** in `shared/` (the `VIRTUAL_UPDATE` payload and the set
  of synced props — today's `Updateable.propsToCheck`).
- Join-by-code lobby with per-room character select, ready-up, and countdown.
- Green `01_lobby_and_match_flow`.

**Exit criteria:** two independent matches run simultaneously with no cross-talk;
lobby scenarios green.

**Status (delivered):**
- ✅ Lobby logic on `GameSession` (`selectCharacter`, `setReady`, countdown,
  win→reset, disconnect→reset) emitting **recipient-targeted** events
  (`menu_update`/`alert`/`game_countdown`/`game_start`/`game_win`/`game_reset`).
  Time-delayed resets (8s post-win, 10s empty-room) go through an **injectable
  scheduler** so they are deterministic in tests.
- ✅ `RoomManager` (`v2/server/RoomManager.ts`) — join-by-code, one `GameSession`
  per room, no shared state between rooms.
- ✅ Socket.IO **v4** server (`v2/server/index.ts`) bridges socket events ↔
  session methods, routes targeted events to the right sockets, and drives the
  per-room ~60fps loop broadcasting `VIRTUAL_UPDATE`.
- ✅ Character roster in `v2/shared/roster.ts` (1 queen + 4 workers per team).
- ✅ **All 72 scenarios green**: feature `01_lobby_and_match_flow` (10) plus a
  new `08_rooms_and_join_codes` (4) covering join-by-code + isolation, on top of
  the 58 engine scenarios. `typecheck` + `build` pass.
- ✅ End-to-end transport verified over real websockets
  (`v2/scripts/smoke-socket.mjs`): two players join a room, ready up, the match
  starts and broadcasts updates, and a third player in another room sees none of
  it (isolation).

**Note — feature 01's "single global instance":** that Background framing is
legacy. Per Decision D the server is now multi-room; feature 01 is tested as one
room, and `08_rooms_and_join_codes.feature` lands the rooms behavior with its own
scenarios (principle 4).

### Phase 3 — Client: field renderer + React chrome (Decisions A, C) ✅ DONE
**Goal:** the browser client on the new stack.

- Direct-DOM field renderer applying `VIRTUAL_UPDATE` by element `id` + CSS
  classes (port the proven approach from [../site.js](../site.js)).
- **React for menu chrome only**: lobby / character-select / countdown /
  game-over.
- **JSON levels** (Decision C): geometry loaded from data, feeding both server
  `GameSession` and client layout. `cheerio` + `css` are never introduced.
- Delete-by-omission: the create-react-app boilerplate [../index.js](../index.js)
  has no place in the new tree.

**Exit criteria:** full game playable in-browser on the new build; field feel
matches the oracle; menu flows work in React.

**Status (delivered):**
- ✅ **Level as data** (Decision C): `v2/shared/levels/classic.ts` ports the
  legacy `index.html` geometry + `style.css` sizes verbatim. The server loads it
  per room (`RoomManager`) and sends it to the client on join; both ends lay out
  the same arena. `cheerio`/`css` never introduced.
- ✅ **Direct-DOM field renderer** (`v2/client/renderer.ts`) builds the field
  from the level and applies `VIRTUAL_UPDATE` by id + CSS class toggles (ported
  from `site.js`). No React in the game loop.
- ✅ **React menu chrome** (`v2/client/App.tsx`): join-by-code, character select,
  ready-up, countdown, game-over — React only for menus.
- ✅ Keyboard input → `KEY_UPDATE` (`v2/client/input.ts`); entity sprites/styles
  ported (`v2/client/styles.css`). `typecheck` + `vite build` pass.
- ✅ Verified: socket smoke (`scripts/smoke-socket.mjs`) confirms a started match
  broadcasts non-empty `VIRTUAL_UPDATE` with real toon ids; a jsdom renderer
  check (`scripts/verify-renderer.mjs`) confirms field build + update application;
  both dev servers boot and the client serves. **In-browser play is now possible.**

**Caveat:** automated checks cover the wire, the renderer logic, and the build —
not the actual rendered pixels / feel in a browser. A manual two-tab playtest
(and the side-by-side oracle comparison) is the remaining confirmation.

### Phase 4 — Fidelity & quirk decisions
**Goal:** land the deliberate behavior changes, each with its own scenario.

- Work the list in **Behavior decisions to fold in** (below) one at a time:
  add/adjust the feature scenario first, then implement to green.

**Exit criteria:** chosen fidelity items implemented with passing scenarios; the
rest explicitly deferred in [features/FIDELITY.md](features/FIDELITY.md).

### Cutover
- Full [features/](features/) suite green **and** a manual two-browser playtest
  matches the old build's feel.
- **Delete, don't overwrite** (see Repo layout): remove the legacy root files
  ([../app.js](../app.js), [../game.js](../game.js), [../site.js](../site.js),
  [../index.js](../index.js), the old `index.html`/`style.css`, the old root
  `package.json`). `v2/` already stands alone as the app.
- Update [../CLAUDE.md](../CLAUDE.md) to describe the new architecture.
- Optional/cosmetic, later: move `v2/` to the repo root once nothing references
  root.

---

## Behavior decisions to fold in (not refactors)

From [features/FIDELITY.md](features/FIDELITY.md) and the
[fix list in CLAUDE.md](../CLAUDE.md). Each needs a "restore authentic vs. keep
the cover's simplification" call. The two cheap quirks are good first
regression-test targets in Phase 0.

Fidelity gaps:
- [ ] Speed gate should also speed up the snail (currently fixed at 0.1/tick).
- [ ] Economic win target is markup-driven; needs an explicit per-arena number.
- [ ] No distinct queen "dive" attack.

Quirks / likely bugs:
- [ ] Countdown is instant (`GAME_START_DELAY = 0`). *Cheap fix.*
- [ ] Snail win doesn't verify basket ownership. *Cheap fix.*
- [ ] `Queen.lives = 3` is dead state (military win is egg-gated).
- [ ] AI is wired (`aiLoop`, `MoveTask`) but never called.
- [ ] Two `// wtf crash` markers on berry assignment — reproduce before refactor.

---

## Where to pick up next

**Phases 0–3 are complete** (see their Status blocks above). The `v2/` build is
**browser-playable**: run the server + Vite client and open the page (see
[../v2/README.md](../v2/README.md) "How to play"). `npm test` reports **all 72
scenarios green** (engine + lobby + rooms).

Begin **Phase 4** — fidelity & quirk decisions:

1. Work the **Behavior decisions to fold in** list (below) one at a time: add or
   adjust the feature scenario first, then implement to green. Good first
   targets remain the two cheap quirks (instant countdown is already in;
   snail-win basket ownership is still latent).
2. Manual confirmation: a two-tab in-browser playtest, and — once the oracle is
   restored (Phase 0 Status ⚠️) — a side-by-side feel comparison before cutover.
3. **Cutover** when the full suite is green and feel is confirmed: delete the
   legacy root files; `v2/` becomes the app.
