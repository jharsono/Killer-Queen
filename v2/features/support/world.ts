/**
 * Cucumber World — per-scenario harness that drives a GameSession headlessly.
 *
 * The feature files in docs/features are the executable contract (modernization
 * plan, principle 1). These helpers construct specific entity situations,
 * advance the deterministic clock/loop, and let steps assert on engine state.
 */
import { setWorldConstructor, World, type IWorldOptions } from "@cucumber/cucumber";
import { GameSession, type SessionUser } from "../../server/GameSession.js";
import type { Berry, Egg, Goal, Queen, Shrine, Snail, SnailCage, Toon, Worker } from "../../server/entities.js";
import { CONST } from "../../shared/const.js";
import type { GameWin } from "../../shared/types.js";

interface Geo {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}

const TOON_W = 30;
const TOON_H = 40;

let nextId = 0;

export class KQWorld extends World {
  session: GameSession;

  /** Primary subject ("the toon"/"the worker"/"the queen"). */
  subject?: Toon;
  /** A second toon ("an enemy"/"the enemy queen"). */
  enemy?: Toon;

  berry?: Berry;
  berry2?: Berry;
  filledBerry?: Berry;
  goal?: Goal;
  emptyGoal?: Goal;
  snail?: Snail;
  cage?: SnailCage;
  shrine?: Shrine;
  blueSpeedGate?: Shrine;
  blueWarriorGate?: Shrine;
  blueQueen?: Queen;
  goldQueen?: Queen;
  emittedWin?: GameWin;

  user?: SessionUser;

  // scratch values for delta/sequence assertions
  prevLeft = 0;
  prevTop = 0;
  firstAccelDelta = 0;
  cappedAccel = 0;

  constructor(options: IWorldOptions) {
    super(options);
    this.session = new GameSession("test-room");
  }

  reset(): void {
    this.session = new GameSession("test-room");
    this.subject = undefined;
    this.enemy = undefined;
    this.berry = undefined;
    this.goal = undefined;
    this.snail = undefined;
    this.cage = undefined;
    this.shrine = undefined;
    this.user = undefined;
  }

  private id(prefix: string): string {
    return `${prefix}-${nextId++}`;
  }

  worker(team: "blue" | "gold" = "blue", geo: Geo = {}): Worker {
    const id = this.id(`team${team[0].toUpperCase()}${team.slice(1)}-worker`);
    return this.session.spawn("worker", id, this.geo(geo)) as Worker;
  }

  queen(team: "blue" | "gold" = "blue", geo: Geo = {}): Queen {
    const id = this.id(`team${team[0].toUpperCase()}${team.slice(1)}-queen`);
    return this.session.spawn("queen", id, this.geo(geo)) as Queen;
  }

  ground(geo: Geo): void {
    this.session.spawn("ground", this.id("ground"), this.geo({ width: 400, height: 40, ...geo }));
  }

  wall(geo: Geo): void {
    this.session.spawn("wall", this.id("wall"), this.geo({ width: 20, height: 200, ...geo }));
  }

  makeBerry(geo: Geo = {}): Berry {
    this.berry = this.session.spawn("berry", this.id("berry"), this.geo({ width: 16, height: 16, ...geo })) as Berry;
    return this.berry;
  }

  makeGoal(team: "blue" | "gold", geo: Geo = {}): Goal {
    const id = this.id(`team${team[0].toUpperCase()}${team.slice(1)}-goal`);
    this.goal = this.session.spawn("goal", id, this.geo({ width: 30, height: 30, ...geo })) as Goal;
    return this.goal;
  }

  makeSnail(geo: Geo = {}): Snail {
    this.snail = this.session.spawn("snail", "snail", this.geo({ left: 400, top: 300, width: 40, height: 40, ...geo })) as Snail;
    return this.snail;
  }

  makeCage(team: "blue" | "gold", geo: Geo = {}): SnailCage {
    const id = this.id(`team${team[0].toUpperCase()}${team.slice(1)}-cage`);
    this.cage = this.session.spawn("cage", id, this.geo({ width: 40, height: 40, ...geo })) as SnailCage;
    return this.cage;
  }

  speedGate(team: "blue" | "gold", geo: Geo = {}): Shrine {
    const id = this.id(`team${team[0].toUpperCase()}${team.slice(1)}-shrine-speed`);
    this.shrine = this.session.spawn("shrine-speed", id, this.geo({ width: 40, height: 40, ...geo })) as Shrine;
    return this.shrine;
  }

  warriorGate(team: "blue" | "gold", geo: Geo = {}): Shrine {
    const id = this.id(`team${team[0].toUpperCase()}${team.slice(1)}-shrine-warrior`);
    this.shrine = this.session.spawn("shrine-warrior", id, this.geo({ width: 40, height: 40, ...geo })) as Shrine;
    return this.shrine;
  }

  egg(team: "blue" | "gold", geo: Geo = {}): Egg {
    const id = this.id(`team${team[0].toUpperCase()}${team.slice(1)}-egg`);
    return this.session.spawn("egg", id, this.geo({ width: 20, height: 24, ...geo })) as Egg;
  }

  private geo(geo: Geo): { left: number; top: number; width: number; height: number } {
    return {
      left: geo.left ?? 100,
      top: geo.top ?? 100,
      width: geo.width ?? TOON_W,
      height: geo.height ?? TOON_H,
    };
  }

  /** Attach a controlling user to `toon` so held keys drive it via the loop. */
  control(toon: Toon): void {
    this.user = { id: this.id("user"), keys: [], toonId: toon.id, ready: true };
    this.session.addUser(this.user);
  }

  press(...keys: string[]): void {
    if (!this.user) throw new Error("no controlling user; call control() first");
    this.user.keys = [...keys];
  }

  tick(n = 1): void {
    this.session.tick(n);
  }

  /** Advance game-time so a freshly spawned toon is no longer invulnerable. */
  clearSpawnInvulnerability(): void {
    this.session.advanceClock(CONST.TOON_RESET_DELAY + 1);
  }
}

setWorldConstructor(KQWorld);
