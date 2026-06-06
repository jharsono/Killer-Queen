/**
 * Cucumber World — shared per-scenario state.
 *
 * The feature files in docs/features are the executable contract for the
 * rewrite (modernization plan, principle 1). Step definitions drive an
 * instantiable GameSession headlessly: scripted key inputs, asserting on
 * VIRTUAL_UPDATE batches and win/flow events — no browser, no sockets.
 *
 * Every step is currently `pending` (Phase 0 makes the spec RUN and report
 * red; Phase 1 onward greens it slice by slice).
 */
import { setWorldConstructor, World, type IWorldOptions } from "@cucumber/cucumber";
import { GameSession } from "../../server/GameSession.js";

export class KQWorld extends World {
  /** The session under test. Steps construct it per scenario. */
  session?: GameSession;

  constructor(options: IWorldOptions) {
    super(options);
  }

  newSession(id = "test-room"): GameSession {
    this.session = new GameSession(id);
    return this.session;
  }
}

setWorldConstructor(KQWorld);
