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

## Status — Phase 0 complete

- ✅ TypeScript + Vite skeleton (`shared` / `server` / `client`), builds and typechecks.
- ✅ `GameSession` is instantiable and room-aware; per-session event bus (no global bubble).
- ✅ `CONST` tuning values ported **verbatim** (`shared/const.ts`) — do not "clean up".
- ✅ cucumber-js wired to `../docs/features`; **68 scenarios all report pending (red)**.

The spec is the contract: the rewrite is done when those scenarios go green.

### Phases (see the plan)

- **Phase 1** — core engine: entity model, physics, ~60fps loop on `GameSession`;
  green the `@core` movement/physics/economy/snail/combat/queen scenarios.
- **Phase 2** — Socket.IO v4 transport, join-by-code rooms, typed wire protocol;
  green `01_lobby_and_match_flow`.
- **Phase 3** — client: direct-DOM field renderer + React menu chrome; JSON levels.
- **Phase 4** — fold in the deliberate fidelity/quirk decisions, each with its scenario.

## Regenerating the pending steps

The step definitions in `features/step_definitions/steps.ts` were bootstrapped
from cucumber's undefined-step snippets. To regenerate after editing the feature
files (before any are implemented for real):

```
npm test 2>/tmp/kq_cuke.txt 1>&2 ; node scripts/gen-pending-steps.mjs /tmp/kq_cuke.txt
```
