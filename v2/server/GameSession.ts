/**
 * GameSession — one independent game/room.
 *
 * This replaces the legacy `Game` singleton. The legacy engine referenced a
 * single global `Game.instance` 77 times and bubbled every event to it, which
 * is exactly what blocked multiple concurrent games. GameSession is
 * instantiable and room-aware from line one: each instance owns its own users,
 * entities, loop, and event bus (a plain Node EventEmitter — NO global bubble).
 *
 * Phase 0 establishes the SHAPE only. The simulation (physics, entities, the
 * ~60fps loop) is Phase 1; the Socket.IO transport + rooms wiring is Phase 2.
 * Methods that belong to later phases throw NotImplemented so the cucumber
 * spec stays honestly red until the behavior actually exists.
 */
import { EventEmitter } from "node:events";
import { CONST } from "../shared/const.js";
import type { GameWin, MenuUpdate, VirtualUpdate, WinType, Team } from "../shared/types.js";

/** A connected participant in this session. */
export interface SessionUser {
  /** Stable per-connection id. */
  id: string;
  /** Currently held input keys (e.g. "ArrowLeft"). */
  keys: string[];
  /** The character this user has claimed, if any (e.g. "teamBlue-queen"). */
  toonId: string | null;
  /** Whether the user has readied up. */
  ready: boolean;
}

function notImplemented(what: string): never {
  // Boneheaded if reached in production, but here it is the spec's red marker:
  // these paths are deliberately unbuilt until their phase lands.
  throw new Error(`GameSession.${what} is not implemented yet (later modernization phase)`);
}

export class GameSession {
  /** Join-by-code room identifier (Decision D). */
  readonly id: string;

  /** Per-session event bus. Replaces the legacy global event bubble. */
  readonly events = new EventEmitter();

  readonly users: SessionUser[] = [];

  private gameInProgress = false;
  private loopHandle: ReturnType<typeof setInterval> | null = null;

  constructor(id: string) {
    this.id = id;
  }

  // ---- Lobby (Phase 2 wires this to Socket.IO; shape lives here) ----------

  addUser(user: SessionUser): void {
    this.users.push(user);
  }

  removeUser(userId: string): void {
    const i = this.users.findIndex((u) => u.id === userId);
    if (i >= 0) this.users.splice(i, 1);
  }

  /**
   * Claim a character. Returns false (and emits ALERT) if already taken.
   * Logic ported in Phase 2.
   */
  selectCharacter(_userId: string, _toonId: string): boolean {
    return notImplemented("selectCharacter");
  }

  setReady(_userId: string, _ready: boolean): void {
    notImplemented("setReady");
  }

  updateKeys(userId: string, keys: string[]): void {
    const user = this.users.find((u) => u.id === userId);
    if (user) user.keys = keys;
  }

  /** Current lobby state for a MENU_UPDATE. */
  getMenuState(): MenuUpdate {
    return notImplemented("getMenuState");
  }

  // ---- Simulation (Phase 1) -----------------------------------------------

  /** Begin the match: spawn toons from eggs, start the loop. */
  start(): void {
    notImplemented("start");
  }

  /** One ~60fps tick: read held keys, drive toons, flush VIRTUAL_UPDATE diffs. */
  loop(): void {
    notImplemented("loop");
  }

  /** Collect the changed-entity diff batch for this tick. */
  collectUpdates(): VirtualUpdate {
    return notImplemented("collectUpdates");
  }

  /** Resolve a win and tear down the match. */
  win(_type: WinType, _team: Team, _focus: GameWin["focus"]): void {
    notImplemented("win");
  }

  stop(): void {
    if (this.loopHandle) {
      clearInterval(this.loopHandle);
      this.loopHandle = null;
    }
    this.gameInProgress = false;
  }

  // The loop runs at ~60fps once implemented (Phase 1).
  protected readonly loopIntervalMs = 1000 / 60;
  protected readonly tuning = CONST;
}
