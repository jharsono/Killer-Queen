# Killer Queen — v2 (modernization)

The TypeScript + Vite rewrite of the Killer Queen web cover. Self-contained and
isolated from the legacy build per [docs/MODERNIZATION_PLAN.md](../docs/MODERNIZATION_PLAN.md):
own `package.json`, own `node_modules`, own copied `assets/`, env-configurable
ports — so the old build can keep running as the behavior oracle until cutover.

## Layout

```
v2/
  shared/        CONST (ported verbatim) + typed wire protocol — used by both ends
  server/        GameSession (instantiable, room-aware — no singleton) + Socket.IO entry
  client/        Vite client (direct-DOM field renderer + React chrome — Phase 3)
  features/      cucumber-js step definitions driving GameSession headlessly
  scripts/       one-shot tooling (pending-step generator)
```

The Gherkin contract itself lives at [../docs/features/](../docs/features/) and is
**shared on purpose** — not duplicated here. cucumber points at it via `cucumber.json`.

## Commands

```
npm install        # install v2 deps (own tree, separate from root)
npm test           # run the docs/features spec via cucumber-js (currently all pending)
npm run typecheck  # tsc --noEmit
npm run build      # tsc --noEmit && vite build
npm run dev:server # game server (tsx watch) — KQ_SERVER_PORT (default 3100)
npm run dev:client # Vite dev client — KQ_CLIENT_PORT (default 5200), proxies /socket.io
```

Ports are env-configurable (`KQ_SERVER_PORT`, `KQ_CLIENT_PORT`) so v2 runs
alongside the legacy build (hardcoded :3000) for side-by-side feel comparison.

## Status — Phases 0–3 complete (browser-playable)

- ✅ TypeScript + Vite skeleton (`shared` / `server` / `client`), builds and typechecks.
- ✅ `GameSession` is instantiable and room-aware; per-session event bus (no global bubble).
- ✅ `CONST` tuning values ported **verbatim** (`shared/const.ts`) — do not "clean up".
- ✅ Full entity engine in `server/entities.ts`, driven by a deterministic per-tick clock.
- ✅ Lobby + join-by-code rooms: lobby logic on `GameSession`, `RoomManager`, Socket.IO **v4** server.
- ✅ **Client**: classic level as data (`shared/levels/classic.ts`), direct-DOM field
  renderer (`client/renderer.ts`), React menu chrome (`client/App.tsx`), keyboard input.
- ✅ **All 72 scenarios green** (58 engine, 10 lobby, 4 rooms); transport verified by
  `scripts/smoke-socket.mjs`, renderer by `scripts/verify-renderer.mjs`.

The spec is the contract: the rewrite is done when those scenarios go green.

## How to play

Run the server and the Vite client in two terminals, then open the page:

```
npm run dev:server   # game server  — KQ_SERVER_PORT (default 3100)
npm run dev:client   # Vite client  — KQ_CLIENT_PORT (default 5200)
```

Open `http://localhost:5200` → **Create new room** (or enter a code to join),
pick a character, hit **Ready**. A match starts once every connected player in
the room is ready (a single readied player starts a solo match). Open a second
tab and join the same code for a second player; use a different code for an
independent game.

### Controls

Keyboard only (the arrow keys). One player per browser tab; each tab controls
the character it picked in the lobby.

| Key | Action |
|-----|--------|
| **← / →** (ArrowLeft / ArrowRight) | Move left / right at the toon's current speed (worker 2, speed-upgraded or warrior 3, super-warrior 4). |
| **↑** (ArrowUp) | Jump. A **worker** jumps only from the ground (or hops off the snail); a **warrior** or **queen** flies — each press is one upward impulse. Holding the key does **not** repeat-fire (it's consumed each tick), so flight is press-press-press. |
| **↓** (ArrowDown) | Descend while airborne (a grounded toon can't duck). For the **queen** this is the dive pose. |

There are no dedicated attack or berry/snail buttons: warriors auto-attack an
enemy they face and overlap, and workers pick up berries / mount the snail /
use a gate on contact. Touch and tilt controls from the legacy build are not
ported.

### Other commands

```
npm test                          # full cucumber suite — 72 green
npm run build                     # tsc --noEmit && vite build
node scripts/verify-renderer.mjs  # headless jsdom check of the field renderer
node scripts/smoke-socket.mjs     # e2e socket smoke (needs dev:server running on 3199)
```

### Phases (see the plan)

- **Phase 1** ✅ — core engine.
- **Phase 2** ✅ — Socket.IO v4 transport, join-by-code rooms.
- **Phase 3** ✅ — client: field renderer + React chrome + JSON level (browser-playable).
- **Phase 4** — fold in the deliberate fidelity/quirk decisions, each with its scenario, then cutover.

## Regenerating the pending steps

The step definitions in `features/step_definitions/steps.ts` were bootstrapped
from cucumber's undefined-step snippets. To regenerate after editing the feature
files (before any are implemented for real):

```
npm test 2>/tmp/kq_cuke.txt 1>&2 ; node scripts/gen-pending-steps.mjs /tmp/kq_cuke.txt
```
