/**
 * The Killer Queen entity model.
 *
 * Ported from the legacy game.js class hierarchy (Collideable → Element →
 * Virtual → Updateable → Toon/Worker/Queen, plus Ground, Berry, Snail, Shrine,
 * Goal, Egg). Two deliberate modernizations vs. the legacy engine:
 *
 *   1. NO global `Game.instance`. Every entity holds an `EngineContext` (the
 *      owning GameSession), so many independent games can run at once.
 *   2. NO wall-clock timers. The legacy build used setTimeout/Date.now() for
 *      invulnerability, attack duration, gate cooldown, and snail swallow —
 *      flaky and untestable. Here those are expiry checks against a per-session
 *      game clock that advances one tick (CONST loop interval) at a time. At a
 *      steady ~60fps this is behaviorally identical but fully deterministic.
 *
 * Physics/tuning numbers come from CONST verbatim (gravity 0.2 / cap 4, jump
 * impulse -5, speeds 2/3/4, snail 0.1, the 0.1px collision nudge) — do not
 * "clean up" per the modernization plan's principle 3.
 *
 * The entity graph is densely interdependent (instanceof checks across
 * Worker/Queen/Snail/Berry/Goal/Shrine), so the classes live together in one
 * module rather than fighting import cycles.
 */
import { CONST } from "../shared/const.js";
import type { Direction, Team, VirtualEntityUpdate, WinType } from "../shared/types.js";

/** The collections that make up a level — owned by the GameSession. */
export interface Level {
  width: number;
  height: number;
  toons: Record<string, Toon>;
  snail: Snail | null;
  snailCages: SnailCage[];
  shrines: Shrine[];
  goals: Goal[];
  berries: Berry[];
  ground: Ground[];
  eggs: Egg[];
}

/** What an entity needs from its owning session (breaks the GameSession cycle). */
export interface EngineContext {
  /** Game-time in ms; advances one loop interval per tick. */
  readonly clock: number;
  readonly level: Level;
  win(type: WinType, team: Team, focus: Entity): void;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Base of every placed game object: geometry + collision helpers. */
export abstract class Entity {
  left = 0;
  top = 0;
  width = 0;
  height = 0;

  constructor(
    protected readonly ctx: EngineContext,
    readonly id: string,
  ) {}

  get boundingBox(): Box {
    return { x: this.left, y: this.top, width: this.width, height: this.height };
  }

  get center(): { left: number; top: number } {
    return { left: this.left + this.width / 2, top: this.top + this.height / 2 };
  }

  hitTest(x: number, y: number): boolean {
    return x >= this.left && x <= this.left + this.width && y >= this.top && y <= this.top + this.height;
  }

  /**
   * Bounding-box overlap. Ported from legacy hitTestBounds: true when the
   * boxes overlap (separating-axis negation).
   */
  hitTestBounds(box: Box): boolean {
    const b = this.boundingBox;
    const separated =
      b.x > box.x + box.width || b.x + b.width < box.x || b.y > box.y + box.height || b.y + b.height < box.y;
    return !separated;
  }

  /** Team derived from the id (e.g. "teamBlue-worker0" → teamBlue). */
  get team(): Team | null {
    const m = this.id.toLowerCase().match(/blue|gold/);
    if (!m) return null;
    return m[0] === "blue" ? CONST.TEAM_BLUE : CONST.TEAM_GOLD;
  }

  static distanceFrom(a: Entity, b: Entity): number {
    const x = a.left - b.left;
    const y = a.top - b.top;
    return Math.sqrt(x * x + y * y);
  }

  /** Pairwise collision resolution; overridden by entities that react. */
  collission(_o: Entity): void {}

  /** Per-tick update; overridden by active entities. */
  loop(): void {}

  /** GAME_START reset (legacy mReset). */
  reset(): void {}

  /** Strip to the synced wire props (legacy Updateable.stripped). */
  stripped(): VirtualEntityUpdate {
    return { id: this.id, left: this.left, top: this.top };
  }
}

/** Static collision surface (ground / wall). */
export class Ground extends Entity {}

/** Queen spawn point; consumed (hatched) when a queen spawns from it. */
export class Egg extends Entity {
  hatched = false;

  static eggsForTeam(ctx: EngineContext, team: Team | null): Egg[] {
    return ctx.level.eggs.filter((egg) => !egg.hatched && egg.team === team);
  }

  hatch(): void {
    this.hatched = true;
    this.top = CONST.ELEMENT_OFFSCREEN_OFFSET.top;
    this.left = CONST.ELEMENT_OFFSCREEN_OFFSET.left;
  }

  reset(): void {
    this.hatched = false;
  }
}

/** A berry: picked up and carried by a worker, deposited into a goal. */
export class Berry extends Entity {
  /** The worker carrying this berry, or null. */
  toon: Worker | null = null;
  /** The goal this berry has been deposited into, or null. */
  goal: Goal | null = null;
  active = true;

  collission(o: Entity): void {
    if (o instanceof Worker) {
      this.toon = o;
    }
    if (o instanceof Goal) {
      this.active = false;
      this.toon?.loseBerry();
      this.toon = null;
      this.goal = o;
      this.top = o.top + o.height / 4;
      this.left = o.left + o.width / 3;
    }
  }

  /** Hidden off-screen when consumed by a gate. */
  usedForShrine(): void {
    this.toon = null;
    this.top = CONST.ELEMENT_OFFSCREEN_OFFSET.top;
    this.left = CONST.ELEMENT_OFFSCREEN_OFFSET.left;
  }

  private goalCheck(): void {
    for (const goal of this.ctx.level.goals) {
      if (!goal.berry && this.toon && this.toon.team === goal.team && goal.hitTestBounds(this.boundingBox)) {
        goal.collission(this);
        this.collission(goal);
      }
    }
  }

  loop(): void {
    if (this.toon) {
      const dirAdjust = this.toon.direction === CONST.DIRECTION_RIGHT ? 1 : -1;
      this.top = this.toon.top + CONST.BERRY_TOON_OFFSET.top;
      this.left = this.toon.left + this.toon.width / 2 - this.width / 2 - CONST.BERRY_TOON_OFFSET.left * dirAdjust;
      this.goalCheck();
    }
  }

  reset(): void {
    this.toon = null;
    this.goal = null;
    this.active = true;
  }
}

/** The snail basket — riding the snail into it wins by snail. */
export class SnailCage extends Entity {}

/** The snail: ridden and steered by a worker toward their team's basket. */
export class Snail extends Entity {
  /** The worker currently riding, or null. */
  toon: Worker | null = null;
  speed = CONST.SNAIL_SPEED;
  active = true;
  direction: Direction = CONST.DIRECTION_RIGHT;
  /** Game-time at which the current swallow finishes. */
  private swallowUntil = -1;

  get swallowing(): boolean {
    return this.ctx.clock < this.swallowUntil;
  }

  collission(o: Entity): void {
    if (this.active === false) return;

    if (o instanceof Worker) {
      if (!this.toon) {
        this.toon = o;
      } else if (o.team !== this.toon.team) {
        // swallow the enemy worker (once per swallow window)
        if (!this.swallowing) {
          this.swallowUntil = this.ctx.clock + CONST.SNAIL_SWALLOW_DURATION;
          o.swallowed();
        }
      }
    }

    if (o instanceof SnailCage) {
      // QUIRK (features/05_snail): credits the rider's team without checking the
      // basket's own team. Latent — a rider can only steer toward their basket.
      if (this.toon) this.ctx.win(CONST.WIN_SNAIL, this.toon.team as Team, this.toon);
    }
  }

  loop(): void {
    if (!this.toon) return;

    // eat any overlapping enemy toon
    for (const key of Object.keys(this.ctx.level.toons)) {
      const toon = this.ctx.level.toons[key];
      if (toon !== this.toon && this.hitTestBounds(toon.boundingBox)) {
        this.collission(toon);
      }
    }

    // reached a basket?
    for (const cage of this.ctx.level.snailCages) {
      if (this.hitTestBounds(cage.boundingBox)) this.collission(cage);
    }
  }

  reset(): void {
    this.toon = null;
    this.swallowUntil = -1;
  }

  /** A rider's killed/dismounted toon detaches from the snail. */
  dropRider(toon: Worker): void {
    if (this.toon === toon) this.toon = null;
  }

  goLeft(): void {
    if (!this.swallowing && this.toon && this.toon.team === CONST.TEAM_BLUE) {
      this.direction = CONST.DIRECTION_LEFT;
      this.left -= this.speed;
    }
  }

  goRight(): void {
    if (!this.swallowing && this.toon && this.toon.team === CONST.TEAM_GOLD) {
      this.left += this.speed;
      this.direction = CONST.DIRECTION_RIGHT;
    }
  }
}

/** A gate. Powers up a worker who stands in it carrying a berry. */
export class Shrine extends Entity {
  affiliation: Team | null = null;
  /** Game-time at which the in-use cooldown clears. */
  private inUseUntil = -1;

  get inUse(): boolean {
    return this.ctx.clock < this.inUseUntil;
  }

  collission(o: Entity): void {
    if (o instanceof Worker) {
      if (o.berry && !this.inUse && o.warrior === false) {
        // legacy "standing in the middle" check (ported verbatim, quirks and all)
        if (o.left > this.left + this.width * 0.4) {
          this.inUseUntil = this.ctx.clock + CONST.SHRINE_POWER_UP_DELAY;
          o.powerUp(this);
        }
      }
    } else if (o instanceof Queen) {
      // queen converts the gate to her team (features/04 queen gate conversion)
      this.affiliation = o.team;
    }
  }

  reset(): void {
    this.inUseUntil = -1;
  }

  stripped(): VirtualEntityUpdate {
    const base = super.stripped();
    if (this.affiliation) base["affiliation"] = this.affiliation;
    return base;
  }
}
export class ShrineSpeed extends Shrine {}
export class ShrineWarrior extends Shrine {}

/** A berry-deposit slot. Filling every team goal wins economically. */
export class Goal extends Entity {
  berry: Berry | null = null;

  get active(): boolean {
    return !this.berry;
  }

  collission(o: Entity): void {
    if (o instanceof Berry) {
      this.berry = o;
    }
    if (Goal.checkWin(this.ctx, this.team)) {
      this.ctx.win(CONST.WIN_ECONOMIC, this.team as Team, o);
    }
  }

  reset(): void {
    this.berry = null;
  }

  /** Economic win: every goal belonging to `team` holds a berry. */
  static checkWin(ctx: EngineContext, team: Team | null): boolean {
    let win = true;
    for (const goal of ctx.level.goals) {
      if (goal.team !== team) continue;
      if (!goal.berry) win = false;
    }
    return win;
  }
}

/** Base playable character: movement, gravity, ground/wall collision, combat. */
export class Toon extends Entity {
  mass = CONST.TOON_MASS;
  active = true;
  grounded = false;
  /** Downward acceleration (legacy `accel`). */
  accel = 0;
  speed: number = CONST.WORKER_SPEED;
  /** Count of times this toon has actually been killed (test-observable). */
  attackedCount = 0;

  private _direction: Direction = CONST.DIRECTION_RIGHT;
  private lastHoriz: Direction = CONST.DIRECTION_RIGHT;
  private invulnUntil = -1;
  private attackUntil = -1;

  constructor(ctx: EngineContext, id: string) {
    super(ctx, id);
    this.reset();
  }

  /**
   * Direction getter/setter ported from legacy: "down" takes priority over
   * left/right within a tick; assigning null restores the last horizontal
   * facing (the loop does this each tick so the toon isn't stuck looking down).
   */
  get direction(): Direction {
    return this._direction;
  }
  setDirection(v: Direction | null): void {
    if (v === null) {
      this._direction = this.lastHoriz;
      return;
    }
    if (v !== CONST.DIRECTION_DOWN) this.lastHoriz = v;
    if (this._direction === CONST.DIRECTION_DOWN) return;
    this._direction = v;
  }

  get invulnerable(): boolean {
    return this.ctx.clock < this.invulnUntil;
  }

  get attacking(): boolean {
    return this.ctx.clock < this.attackUntil;
  }

  /** True iff this toon is facing the given enemy (used for kills). */
  facing(enemy: Entity): boolean {
    if (this.direction === CONST.DIRECTION_DOWN && enemy.top > this.top) return true;
    if (this.direction === CONST.DIRECTION_LEFT && enemy.left < this.left) return true;
    if (this.direction === CONST.DIRECTION_RIGHT && enemy.left > this.left) return true;
    return false;
  }

  reset(): void {
    this.active = true;
    this.invulnUntil = this.ctx.clock + CONST.TOON_RESET_DELAY;
    this.accel = 0;
    this.speed = CONST.WORKER_SPEED;
    this._direction = CONST.DIRECTION_RIGHT;
    this.lastHoriz = CONST.DIRECTION_RIGHT;
  }

  attacked(_attacker?: Toon): void {
    if (this.invulnerable || !this.active) return;
    this.attackedCount++;
    this.reset();
  }

  attack(): void {
    this.attackUntil = this.ctx.clock + CONST.ATTACK_DURATION;
  }

  loop(): void {
    this.setDirection(null);
    this.gravityCheck();
    this.groundCheck();
    this.visibilityCheck();
    this.roundNumbers();
  }

  private gravityCheck(): void {
    this.accel += CONST.GRAVITY_RATE;
    if (this.accel > CONST.GRAVITY_MAX) this.accel = CONST.GRAVITY_MAX;
    this.top += this.accel;
  }

  /** Screen-wrap: walking off one horizontal edge reappears on the other. */
  private visibilityCheck(): void {
    if (this.left + this.width / 2 < 0) this.left = this.ctx.level.width - this.width / 2;
    if (this.left + this.width / 2 > this.ctx.level.width) this.left = 0;
  }

  private roundNumbers(): void {
    this.left = Math.round(this.left);
    this.top = Math.round(this.top);
  }

  protected toonCheck(): void {
    for (const key of Object.keys(this.ctx.level.toons)) {
      const toon = this.ctx.level.toons[key];
      if (this === toon || this.team === toon.team) continue;
      if (this.hitTestBounds(toon.boundingBox)) {
        this.collission(toon);
        toon.collission(this);
      }
    }
  }

  static groundedCheck(toon: Toon, ground: Ground): boolean {
    return ground.hitTestBounds({ x: toon.left, y: toon.top + toon.height, width: toon.width, height: 1 });
  }

  /** Resolve overlaps with ground/walls by nudging out 0.1px at a time. */
  private groundCheck(): void {
    this.grounded = false;
    const bp = 8; // inward pad on the inferior side
    const bt = 4; // boundary thickness

    for (const gr of this.ctx.level.ground) {
      if (this.grounded === false) this.grounded = Toon.groundedCheck(this, gr);

      // bottom (floor)
      while (gr.hitTestBounds({ x: this.left + bp / 2, y: this.top + this.height - bt, width: this.width - bp, height: bt })) {
        this.top -= 0.1;
        this.accel = 0;
      }
      // top (ceiling)
      while (gr.hitTestBounds({ x: this.left + bp / 2, y: this.top, width: this.width - bp, height: bt })) {
        this.top += 0.1;
        this.accel = 0;
      }
      // right (wall)
      while (gr.hitTestBounds({ x: this.left + this.width - bt, y: this.top + bp / 2, width: bt, height: this.height - bp })) {
        this.left -= 0.1;
      }
      // left (wall)
      while (gr.hitTestBounds({ x: this.left, y: this.top + bp / 2, width: bt, height: this.height - bp })) {
        this.left += 0.1;
      }
    }
  }

  jump(): void {
    if (this.active === false) return;
    this.grounded = false;
    this.accel = -5;
  }

  goRight(): void {
    if (this.active === false) return;
    this.left += this.speed;
    this.setDirection(CONST.DIRECTION_RIGHT);
  }

  goLeft(): void {
    if (this.active === false) return;
    this.left -= this.speed;
    this.setDirection(CONST.DIRECTION_LEFT);
  }

  goDown(): void {
    if (this.active === false) return;
    if (this.grounded === true) return;
    this.top += this.speed;
    this.setDirection(CONST.DIRECTION_DOWN);
  }

  stripped(): VirtualEntityUpdate {
    return {
      id: this.id,
      left: this.left,
      top: this.top,
      direction: this.direction,
      Invulnerable: this.invulnerable,
      attacking: this.attacking,
    };
  }
}

/** A worker: carries berries, rides the snail, uses gates, can be upgraded. */
export class Worker extends Toon {
  warrior = false;
  speedUpgrade = false;
  berry: Berry | null = null;
  /** True while riding the snail. */
  snail = false;
  /** Game-time at which an inactivity window (powerup / swallow) ends. */
  private inactiveUntil = -1;
  private resetOnReactivate = false;

  /** Make the worker inactive for `ms`, optionally resetting on reactivation. */
  inactiveFor(ms: number, reset = false): void {
    this.active = false;
    this.inactiveUntil = this.ctx.clock + ms;
    this.resetOnReactivate = reset;
  }

  /** Swallowed by the snail: removed from play, drops its berry. */
  swallowed(): void {
    this.inactiveFor(CONST.SNAIL_SWALLOW_DURATION, true);
    this.loseBerry();
    const snail = this.ctx.level.snail;
    if (snail) {
      this.top = snail.top + this.height * 1.2;
      if (snail.direction === CONST.DIRECTION_LEFT) this.left = snail.left - this.width / 2;
      if (snail.direction === CONST.DIRECTION_RIGHT) this.left = snail.left + snail.width;
    }
  }

  /** Gate powerup: consume the berry, become a warrior or gain speed. */
  powerUp(shrine: Shrine): void {
    this.inactiveFor(CONST.SHRINE_POWER_UP_DELAY, false);
    if (this.berry) this.berry.usedForShrine();
    this.loseBerry();
    this.left = shrine.left + shrine.width / 2 - this.width / 2;
    this.top = shrine.top + 25;
    if (!this.warrior && shrine instanceof ShrineWarrior) this.gainWarrior();
    else if (!this.speedUpgrade && shrine instanceof ShrineSpeed) this.gainSpeed();
  }

  jump(): void {
    if (this.grounded || this.warrior || this.snail) {
      super.jump();
      if (this.snail) {
        const snail = this.ctx.level.snail;
        if (snail) {
          if (snail.direction === CONST.DIRECTION_LEFT) this.left = snail.left - snail.width * 0.4;
          if (snail.direction === CONST.DIRECTION_RIGHT) this.left = snail.left + snail.width * 1.2;
          snail.dropRider(this);
        }
        this.snail = false;
      }
    }
  }

  loop(): void {
    // reactivate after a powerup / swallow window
    if (!this.active) {
      if (this.ctx.clock >= this.inactiveUntil) {
        this.active = true;
        if (this.resetOnReactivate) this.reset();
      }
      return;
    }
    super.loop();
    this.berryCheck();
    this.snailCheck();
    this.toonCheck();
    this.shrineCheck();
  }

  attacked(attacker?: Toon): void {
    const wasInvulnerableOrInactive = this.invulnerable || !this.active;
    if (this.snail) {
      this.ctx.level.snail?.dropRider(this);
      this.snail = false;
    }
    if (this.berry) this.berry = null;
    if (!wasInvulnerableOrInactive) super.attacked(attacker);
  }

  collission(o: Entity): void {
    if (o instanceof Berry) {
      if (this.berry) return;
      if (o.toon) return;
      this.berry = o;
    }
    if (o instanceof Snail) {
      if (o.toon?.id === this.id) this.snail = true;
    }
    if (o instanceof Worker) {
      if (this.warrior && o.team !== this.team && this.facing(o)) this.attack();
      if (o.warrior && o.attacking && o.facing(this)) this.attacked(o);
    }
    if (o instanceof Queen) {
      if (o.attacking && o.facing(this)) this.attacked(o);
    }
  }

  private shrineCheck(): void {
    if (!this.berry) return;
    for (const shrine of this.ctx.level.shrines) {
      if (shrine instanceof ShrineSpeed && this.speedUpgrade) continue;
      if (shrine.hitTestBounds(this.boundingBox)) {
        shrine.collission(this);
        this.collission(shrine);
      }
    }
  }

  gainSpeed(): void {
    if (this.warrior) return;
    if (this.speedUpgrade) return;
    this.speedUpgrade = true;
    this.speed = CONST.WARRIOR_SPEED;
  }

  gainWarrior(): void {
    if (this.warrior) return;
    this.warrior = true;
    this.speed = CONST.WARRIOR_SPEED;
    if (this.speedUpgrade) this.speed = CONST.WARRIOR_SUPER_SPEED;
  }

  attack(): void {
    if (this.warrior) super.attack();
  }

  loseBerry(): void {
    this.berry = null;
  }

  reset(): void {
    super.reset();
    this.speed = CONST.WORKER_SPEED;
    this.warrior = false;
    this.speedUpgrade = false;
    this.berry = null;
    this.snail = false;
  }

  private berryCheck(): void {
    if (this.berry || this.warrior) return;
    for (const berry of this.ctx.level.berries) {
      if (berry.active !== true) continue;
      if (berry.toon !== null) continue;
      if (berry.goal !== null) continue;
      if (this.hitTestBounds(berry.boundingBox)) {
        // first claimant wins; a second worker this tick sees berry.toon set
        if (!this.berry && !berry.toon) {
          this.berry = berry;
          berry.toon = this;
        }
      }
    }
  }

  private snailCheck(): void {
    if (this.warrior) return;
    const snail = this.ctx.level.snail;
    if (!snail) return;
    if (!this.snail) {
      if (!snail.toon && snail.hitTestBounds(this.boundingBox)) {
        snail.collission(this);
        this.collission(snail);
      }
    } else {
      this.top = snail.top;
      if (snail.direction === CONST.DIRECTION_LEFT) this.left = snail.left + 5;
      else if (snail.direction === CONST.DIRECTION_RIGHT) this.left = snail.left + 30;
    }
  }

  goLeft(): void {
    if (this.snail) this.ctx.level.snail?.goLeft();
    else super.goLeft();
  }
  goRight(): void {
    if (this.snail) this.ctx.level.snail?.goRight();
    else super.goRight();
  }

  stripped(): VirtualEntityUpdate {
    const base = super.stripped();
    base["upgrade-warrior"] = this.warrior;
    base["upgrade-speed"] = this.speedUpgrade;
    return base;
  }
}

/** The queen: always flies, kills via facing, respawns from eggs. */
export class Queen extends Toon {
  lives = 3;

  constructor(ctx: EngineContext, id: string) {
    super(ctx, id);
    this.speed = CONST.WARRIOR_SPEED;
  }

  attacked(attacker?: Toon): void {
    if (this.invulnerable) return;
    if (Egg.eggsForTeam(this.ctx, this.team).length) {
      this.attackedCount++;
      this.reset();
    } else if (attacker) {
      this.ctx.win(CONST.WIN_MILITARY, attacker.team as Team, attacker);
    }
  }

  reset(): void {
    super.reset();
    this.speed = CONST.WARRIOR_SPEED;
    // respawn at (and hatch) the next egg
    const egg = Egg.eggsForTeam(this.ctx, this.team)[0];
    if (egg) {
      this.top = egg.top;
      this.left = egg.left;
      egg.hatch();
    }
  }

  loop(): void {
    super.loop();
    this.toonCheck();
    this.shrineCheck();
  }

  private shrineCheck(): void {
    for (const shrine of this.ctx.level.shrines) {
      if (shrine.hitTestBounds(this.boundingBox)) shrine.collission(this);
    }
  }

  jump(): void {
    // queen always flies (no grounded requirement)
    super.jump();
  }

  collission(o: Entity): void {
    if (o instanceof Shrine) {
      o.collission(this);
      return;
    }
    if (o instanceof Queen) {
      if (o.attacking) {
        if (o.facing(this)) {
          if (this.facing(o)) {
            if (o.top < this.top) this.attacked(o); // killed by rank: higher wins
            // else: equal/lower clash — bump (no kill)
          } else {
            this.attacked(o); // stabbed from behind
          }
        }
      }
      return;
    }
    if (o instanceof Toon) {
      if (o.active && o.team !== this.team && this.facing(o)) this.attack();
    }
  }
}
