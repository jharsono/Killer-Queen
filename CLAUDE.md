# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A from-scratch web cover of the 10-player *Killer Queen* arcade game, written in plain ES5/ES6 JavaScript with Node + Socket.IO. No build step, no framework — the server runs the authoritative game simulation and browsers are thin rendering/input clients.

## Commands

```
npm install      # install deps (cheerio, css, socket.io)
node app.js      # start the server on http://localhost:3000
```

Open `http://localhost:3000` in a browser to join a game instance. Each browser tab/device is one player; select a character, ready up, and once all connected users are ready a countdown starts the match.

There is **no test suite** — `npm test` is a placeholder that exits 1. (`game.js` has a latent `testMode()` hook that sets `_loopIntervalDelay = 0` and fires an `L1K_DEBUG_LOOP` event every 1000 loops, but nothing wires it up.)

## Architecture

The whole game is **server-authoritative**: clients only send keypresses and render what they're told. Four files matter:

- **`app.js`** — entry point. Bare `http` server that reads files off disk (no static middleware), plus the Socket.IO connection handling. On connect it creates a `user` object (`{id, keys, socket, toonId, ready}`), pushes it onto `KQ.Game.instance.users`, and wires socket events (`USER_CHARACTER_SELECT`, `USER_READY`, `KEY_UPDATE`, `disconnect`) into the game's event system. Boots the `Game` singleton and calls `loadLevel("index.html", "style.css")`.

- **`game.js`** — the entire engine in one file (~2000 lines). Defines all game classes and `module.exports` them as the `KQ` namespace. This is where nearly all game logic lives.

- **`site.js`** — the browser client (loaded by `index.html`). Opens a socket, listens for server events (`VIRTUAL_UPDATE`, `MENU_UPDATE`, `GAME_START/COUNTDOWN/RESET/WIN`, `ALERT`) and mutates the DOM accordingly. Captures keyboard/touch/`deviceorientation` input and emits `KEY_UPDATE`. Defines the global `characterSelected()` / `playerReady()` handlers referenced inline in the HTML.

- **`index.html` + `style.css`** — these are **both the rendered view AND the level data source**. `Game.loadLevel()` uses `cheerio` to parse the children of `#level` and `css` to parse `style.css`, merging inline styles with class rules to compute each element's `left/top/width/height`. The element `id`/`class` (`queen`, `worker`, `shrine-speed`, `berry`, `goal`, `snail`, `cage`, `ground`/`wall`, `egg`) determines which game class is instantiated. **To change the level layout, edit the DOM in `index.html` and its CSS — the server reads geometry from there at startup.**

### Class hierarchy (all in `game.js`)

```
EventDispatcher          custom DOM-style event system; events bubble up to Game.instance
└─ Collideable           hitTest / bounding-box overlap / distance helpers
   └─ Element            base game object, resets on GAME_START
      └─ Virtual         has an id + CSS-derived geometry
         ├─ Ground       static collision surfaces (ground/wall)
         ├─ SnailCage
         ├─ Goal         berry deposit slots (economic win)
         └─ Updateable   change-tracked objects that sync to clients
            ├─ Egg, Berry, Snail
            ├─ Shrine → ShrineSpeed, ShrineWarrior
            └─ Toon → Worker, Queen
```

### Key runtime patterns

- **Singleton:** `Game._instance`. Always access via `Game.instance`, never `new Game()` (the constructor warns and returns the existing instance). `app.js` creates it once at boot.

- **Event system:** A hand-rolled `EventDispatcher` modeled on DOM events. `dispatchEvent(new Event(CONST.X))` with bubbling — non-`Game` dispatchers re-dispatch on `Game.instance`. Game flow is entirely event-driven via `CONST` string constants (`GAME_COUNTDOWN → GAME_START → LOOP → GAME_OVER → GAME_RESET`). The `CONST` table is **duplicated** in `game.js` and `site.js` (and partially in `app.js` via `KQ.CONST`) — if you add/rename an event, update all copies.

- **Game loop:** On `GAME_START`, `Game.loop()` runs at ~60fps (`setInterval`, `1000/60`ms). Each tick it reads every user's held `keys` and calls `toon.jump/goDown/goLeft/goRight`, then `Updateable.sendUpdates()`. Jump (`ArrowUp`) is consumed each tick so it can't be held.

- **Client sync (diffing):** `Updateable` keeps a stripped "last-sent" copy of each object (only `propsToCheck`: `left, top, direction, Invulnerable, attacking, upgrade-warrior, upgrade-speed, affiliation`). Each loop, changed objects are queued and flushed as a single `VIRTUAL_UPDATE` batch. The client matches by element `id` and toggles CSS classes / positions. **Only properties in `propsToCheck` ever reach the client** — adding a new synced property means adding it there.

- **Win conditions:** economic (fill goals with berries), military (kill the enemy queen 3×), and snail (ride the snail to the enemy goal). `Game.win(type, team, focus)` dispatches `GAME_OVER`; the client zooms on `focus`.

## Notes

- `index.js` is leftover create-react-app boilerplate (imports React and a non-existent `Game`/`index.css`). It is **not used** — the real entry is `app.js`.
- Tuning constants (speeds, gravity, masses, delays, durations) live in the `CONST` object at the top of `game.js`.
- The codebase contains many `// todo:` and `// -jkr` author notes; preserve them.

## Fix list (fidelity gaps & quirks)

Backlog from auditing current behavior against the authentic arcade game. These are **documented decisions, not auto-fixes** — each needs Josh's call on "restore authentic behavior" vs. "keep the cover's simplification" before acting. Full detail and evidence: [docs/features/FIDELITY.md](docs/features/FIDELITY.md).

Fidelity gaps (diverge from authentic Killer Queen):
- [ ] **Speed gate doesn't speed up the snail.** A speed-upgraded rider should push the snail faster; currently the snail is fixed at `SNAIL_SPEED` (0.1/tick) regardless of upgrade. (`Snail`, `Worker.gainSpeed`)
- [ ] **Economic win threshold is markup-driven.** The target is "every `goal` div for the team holds a berry" — an accident of `index.html`, not a tuned per-arena berry count. Needs an explicit target number for the modern version. (`Goal.checkWin`)
- [ ] **No distinct queen "dive" attack.** Queen kills use facing + vertical position only; the authentic dedicated dive move is absent. (`Queen.collission`)

Implementation quirks / likely bugs:
- [ ] **Countdown is instant.** `GAME_START_DELAY = 0`, so the lobby countdown shows `0` and the match starts the same tick (commented-out `// 3` suggests a debug value). Cheap fix; good first regression test.
- [ ] **Snail win doesn't verify basket ownership.** `Snail.collission` fires `win_snail` on contact with *any* `SnailCage`, crediting the rider's team without a team check. Latent today, but unguarded. Cheap fix.
- [ ] **`Queen.lives = 3` is dead state.** The military win is gated on remaining eggs; `lives` is never read after assignment. Remove or wire up.
- [ ] **AI is disabled.** `Toon.aiLoop` + `MoveTask`/`PathPoint` pathing exist but `Toon.loop` never calls `aiLoop` (commented out). Unmanned toons stand still.
- [ ] **Two `// wtf crash` markers** on berry assignment (`Worker.collission`, `Goal.collission`) flag a crash the original author hit. Reproduce before refactoring those paths.
