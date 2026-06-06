/**
 * GameSession — one independent game/room.
 *
 * Replaces the legacy `Game` singleton: instantiable and room-aware, with its
 * own level, entities, deterministic game clock, lobby state, and a per-session
 * EventEmitter (no global `Game.instance`, no global event bubble). Many
 * sessions run side by side — see RoomManager.
 *
 * Phase 1: the simulation (entity model, physics, the loop).
 * Phase 2: the lobby (character select, ready-up, countdown, win/reset,
 *          disconnect) — implemented here and emitted as recipient-targeted
 *          events that the Socket.IO layer (server/index.ts) routes to sockets.
 *
 * Time-delayed lobby behavior (the 8s post-win reset, the 10s empty-room reset)
 * goes through an injectable Scheduler so it is deterministic in tests; the
 * default uses real timers.
 */
import { EventEmitter } from "node:events";
import { CONST } from "../shared/const.js";
import { ROSTER } from "../shared/roster.js";
import type { GameWin, LevelData, MenuUpdate, Team, VirtualUpdate, WinType, EntityKind } from "../shared/types.js";
import {
  Berry,
  Egg,
  Entity,
  Goal,
  Ground,
  type EngineContext,
  type Level,
  Queen,
  Shrine,
  ShrineSpeed,
  ShrineWarrior,
  Snail,
  SnailCage,
  Toon,
  Worker,
} from "./entities.js";

/** A connected participant in this session. */
export interface SessionUser {
  id: string;
  keys: string[];
  toonId: string | null;
  ready: boolean;
}

interface Geometry {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Recipients of a lobby event: every connected user, or a specific subset. */
export type Recipients = "all" | string[];

/** Injectable timer source (real timers by default; fake in tests). */
export interface Scheduler {
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

const realScheduler: Scheduler = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

/** Loop interval — the legacy ~60fps tick; one game-clock step. */
const LOOP_MS = 1000 / 60;

export class GameSession implements EngineContext {
  readonly id: string;
  readonly events = new EventEmitter();
  readonly users: SessionUser[] = [];

  /** Game-time in ms. Advances one LOOP_MS per tick (deterministic). */
  clock = 0;

  readonly level: Level = {
    width: 800,
    height: 600,
    toons: {},
    snail: null,
    snailCages: [],
    shrines: [],
    goals: [],
    berries: [],
    ground: [],
    eggs: [],
  };

  /** Every entity, in creation order — the loop iterates this. */
  private readonly entities: Entity[] = [];

  private running = false;
  /** The most recently resolved win (test-observable; also emitted). */
  lastWin: GameWin | null = null;

  private readonly scheduler: Scheduler;
  private noUsersResetHandle: unknown = null;

  constructor(id: string, scheduler: Scheduler = realScheduler) {
    this.id = id;
    this.scheduler = scheduler;
  }

  get gameInProgress(): boolean {
    return this.running;
  }

  // ---- Level construction ---------------------------------------------------

  /** Build the level from data (Decision C: JSON geometry). */
  loadLevel(data: LevelData): void {
    this.level.width = data.width;
    this.level.height = data.height;
    for (const e of data.entities) {
      this.spawn(e.kind, e.id, { left: e.left, top: e.top, width: e.width, height: e.height });
    }
  }

  /** Create one entity of `kind`, register it in the level, and return it. */
  spawn(kind: EntityKind, id: string, geo: Geometry): Entity {
    let entity: Entity;
    switch (kind) {
      case "queen": {
        const q = new Queen(this, id);
        this.level.toons[id] = q;
        entity = q;
        break;
      }
      case "worker": {
        const w = new Worker(this, id);
        this.level.toons[id] = w;
        entity = w;
        break;
      }
      case "shrine-speed": {
        const s = new ShrineSpeed(this, id);
        this.level.shrines.push(s);
        entity = s;
        break;
      }
      case "shrine-warrior": {
        const s = new ShrineWarrior(this, id);
        this.level.shrines.push(s);
        entity = s;
        break;
      }
      case "berry": {
        const b = new Berry(this, id);
        this.level.berries.push(b);
        entity = b;
        break;
      }
      case "goal": {
        const g = new Goal(this, id);
        this.level.goals.push(g);
        entity = g;
        break;
      }
      case "snail": {
        const s = new Snail(this, id);
        this.level.snail = s;
        entity = s;
        break;
      }
      case "cage": {
        const c = new SnailCage(this, id);
        this.level.snailCages.push(c);
        entity = c;
        break;
      }
      case "egg": {
        const egg = new Egg(this, id);
        this.level.eggs.push(egg);
        entity = egg;
        break;
      }
      case "ground":
      case "wall": {
        const gr = new Ground(this, id);
        this.level.ground.push(gr);
        entity = gr;
        break;
      }
    }
    entity.left = geo.left;
    entity.top = geo.top;
    entity.width = geo.width;
    entity.height = geo.height;
    this.entities.push(entity);
    return entity;
  }

  // ---- Lobby ----------------------------------------------------------------

  addUser(user: SessionUser): void {
    this.users.push(user);
    if (this.noUsersResetHandle) {
      this.scheduler.clear(this.noUsersResetHandle);
      this.noUsersResetHandle = null;
    }
    this.emitMenu();
  }

  removeUser(userId: string): void {
    const i = this.users.findIndex((u) => u.id === userId);
    if (i < 0) return;

    // A disconnecting player abandons their toon mid-match. Release anything it
    // was holding so the match isn't stranded — notably the snail, which would
    // otherwise stay "ridden" forever and block everyone from remounting.
    const toonId = this.users[i].toonId;
    if (toonId) {
      const toon = this.level.toons[toonId];
      if (toon instanceof Worker) toon.abandon();
    }

    this.users[i].toonId = null; // release the character
    this.users.splice(i, 1);

    if (this.users.length) {
      this.emitMenu();
    } else {
      // reset the room a short time after the last user leaves
      this.noUsersResetHandle = this.scheduler.set(() => this.reset(), CONST.GAME_NO_USERS_RESET_DELAY);
    }
  }

  updateKeys(userId: string, keys: string[]): void {
    const user = this.users.find((u) => u.id === userId);
    if (user) user.keys = keys;
  }

  /** Claim a character. Emits ALERT (and returns false) if already taken. */
  selectCharacter(userId: string, toonId: string): boolean {
    const taken = this.users.some((u) => u.toonId === toonId);
    if (taken) {
      this.emit(CONST.ALERT, [userId], { text: "This character is already taken" });
      return false;
    }
    const user = this.users.find((u) => u.id === userId);
    if (!user) return false;
    user.toonId = toonId;
    user.ready = false;
    this.emitMenu();
    return true;
  }

  setReady(userId: string, ready: boolean): void {
    const user = this.users.find((u) => u.id === userId);
    if (!user) return;
    user.ready = ready;
    if (!ready) return;

    if (this.running) {
      // quick-join: only this user gets game_start; others are mid-match
      this.emit(CONST.GAME_START, [userId], {});
      return;
    }

    // start once every connected user has a character and is ready
    const allReady = this.users.length > 0 && this.users.every((u) => u.toonId && u.ready);
    if (allReady) this.startCountdown();
  }

  /** Current lobby state for a MENU_UPDATE. */
  getMenuState(): MenuUpdate {
    return {
      characters: ROSTER.map((toonId) => ({
        toonId,
        taken: this.users.some((u) => u.toonId === toonId),
      })),
    };
  }

  private emitMenu(): void {
    // legacy: menu updates go to users still in the lobby (no character yet)
    const recipients = this.users.filter((u) => !u.toonId).map((u) => u.id);
    this.emit(CONST.MENU_UPDATE, recipients, { state: this.getMenuState() });
  }

  // ---- Match lifecycle ------------------------------------------------------

  /** Lobby countdown. GAME_START_DELAY is 0, so it is effectively instant. */
  startCountdown(): void {
    this.emit(CONST.GAME_COUNTDOWN, "all", { time: CONST.GAME_START_DELAY });
    if (CONST.GAME_START_DELAY <= 0) this.start();
  }

  /** Begin the match: reset everything (queens hatch eggs) and run the loop. */
  start(): void {
    // eggs reset first so queens can hatch from a fresh set (legacy priority)
    for (const egg of this.level.eggs) egg.reset();
    for (const e of this.entities) {
      if (e instanceof Egg || e instanceof Queen) continue;
      e.reset();
    }
    for (const key of Object.keys(this.level.toons)) {
      const toon = this.level.toons[key];
      if (toon instanceof Queen) toon.reset();
    }
    this.running = true;
    this.lastWin = null;
    this.emit(CONST.GAME_START, "all", {});
  }

  stop(): void {
    this.running = false;
  }

  /** Resolve a win, record/emit it, and schedule the post-win reset. */
  win(type: WinType, team: Team, focus: Entity): void {
    const payload: GameWin = { type, team, focus: { left: focus.left, top: focus.top } };
    this.lastWin = payload;
    this.running = false;
    this.events.emit(CONST.GAME_WIN, payload);
    this.scheduler.set(() => this.reset(), CONST.GAME_RESET_DELAY);
  }

  /** Return all users to the lobby and stop the match. */
  reset(): void {
    this.running = false;
    for (const user of this.users) user.toonId = null;
    this.emit(CONST.GAME_RESET, "all", {});
  }

  private emit(event: string, recipients: Recipients, extra: Record<string, unknown>): void {
    this.events.emit(event, { recipients, ...extra });
  }

  // ---- The loop -------------------------------------------------------------

  /** Advance the simulation by `times` ticks. */
  tick(times = 1): void {
    for (let i = 0; i < times; i++) this.step();
  }

  /** Advance game-time without simulating (for time-based assertions). */
  advanceClock(ms: number): void {
    this.clock += ms;
  }

  private step(): void {
    this.clock += LOOP_MS;

    // 1) entity loops (physics + collision checks), in creation order
    for (const e of this.entities) e.loop();

    // 2) apply each user's held keys to their toon (legacy Game.loop order:
    //    movement is applied after the per-entity physics pass)
    for (const user of this.users) {
      if (!user.toonId) continue;
      const toon = this.level.toons[user.toonId];
      if (!toon) continue;
      for (const key of user.keys) {
        switch (key) {
          case CONST.KEY_UP:
            toon.jump();
            break;
          case CONST.KEY_DOWN:
            toon.goDown();
            break;
          case CONST.KEY_LEFT:
            toon.goLeft();
            break;
          case CONST.KEY_RIGHT:
            toon.goRight();
            break;
        }
      }
      // jump can't be held: consume ArrowUp each tick so it can't repeat-fire
      const up = user.keys.indexOf(CONST.KEY_UP);
      if (up >= 0) user.keys.splice(up, 1);
    }
  }

  /** Collect the changed-entity diff batch (full snapshot for now). */
  collectUpdates(): VirtualUpdate {
    return this.entities.map((e) => e.stripped());
  }
}
