/**
 * Feature 07 — the queen, eggs, and military victory.
 */
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { CONST } from "../../shared/const.js";
import { Egg } from "../../server/entities.js";
import type { KQWorld } from "../support/world.js";

const blueUnhatched = (w: KQWorld): number => Egg.eggsForTeam(w.session, CONST.TEAM_BLUE).length;
const blueHatched = (w: KQWorld): number =>
  w.session.level.eggs.filter((e) => e.team === CONST.TEAM_BLUE && e.hatched).length;

// ---- background -------------------------------------------------------------

Given("each team starts with three eggs", function (this: KQWorld) {
  // queens first (so their constructor reset finds no eggs to hatch yet)
  this.blueQueen = this.queen("blue", { left: 50, top: 50 });
  this.goldQueen = this.queen("gold", { left: 700, top: 50 });
  for (let i = 0; i < 3; i++) {
    this.egg("blue", { left: 60 + i * 10, top: 50 });
    this.egg("gold", { left: 690 - i * 10, top: 50 });
  }
});

// ---- queen respawn via eggs -------------------------------------------------

Given("the blue team has three unhatched eggs", function (this: KQWorld) {
  assert.equal(blueUnhatched(this), 3);
});

When("the match starts", function (this: KQWorld) {
  this.session.start();
});

Then("the blue queen spawns at an egg", function (this: KQWorld) {
  assert.equal(this.blueQueen!.active, true);
  assert.equal(blueHatched(this), 1); // exactly one egg consumed at spawn
});

Then("that egg is hatched and removed from play", function (this: KQWorld) {
  const hatched = this.session.level.eggs.find((e) => e.team === CONST.TEAM_BLUE && e.hatched)!;
  assert.equal(hatched.top, CONST.ELEMENT_OFFSCREEN_OFFSET.top);
});

Then("two unhatched blue eggs remain", function (this: KQWorld) {
  assert.equal(blueUnhatched(this), 2);
});

Given("the blue queen is killed", function (this: KQWorld) {
  this.session.start(); // spawn the queen from an egg (1 hatched, 2 remain)
  this.clearSpawnInvulnerability();
  this.blueQueen!.attacked(this.goldQueen); // → respawn (immediate) while eggs remain
});

Given("the blue team still has at least one unhatched egg", function (this: KQWorld) {
  assert.ok(blueUnhatched(this) >= 1);
});

When("the queen respawns", function (this: KQWorld) {
  // respawn happens immediately on death (Queen.attacked → reset); nothing to do
});

Then("she reappears at the next egg", function (this: KQWorld) {
  assert.equal(this.blueQueen!.active, true);
  assert.equal(blueUnhatched(this), 1); // start hatched 1, respawn hatched another → 1 left
});

Then("that egg is hatched", function (this: KQWorld) {
  assert.equal(blueHatched(this), 2);
});

// ---- military victory -------------------------------------------------------

Given("the blue team has no unhatched eggs remaining", function (this: KQWorld) {
  for (const egg of this.session.level.eggs) if (egg.team === CONST.TEAM_BLUE) egg.hatched = true;
  assert.equal(blueUnhatched(this), 0);
});

When("the blue queen is killed by a gold attacker", function (this: KQWorld) {
  this.subject = this.blueQueen;
  this.clearSpawnInvulnerability();
  this.blueQueen!.attacked(this.goldQueen);
});

Given("a fresh match with three eggs per team", function (this: KQWorld) {
  this.session.start();
});

When("the enemy queen is killed {int} times", function (this: KQWorld, kills: number) {
  for (let i = 0; i < kills; i++) {
    this.session.advanceClock(CONST.TOON_RESET_DELAY + 1); // clear respawn invulnerability
    this.blueQueen!.attacked(this.goldQueen);
    if (this.session.lastWin) break; // military win resolved — queen is gone
  }
});

Then("a military win is {string}", function (this: KQWorld, outcome: string) {
  const resolved = this.session.lastWin !== null;
  assert.equal(resolved, outcome === "resolved");
});

// ---- game-over presentation -------------------------------------------------

Given("any win condition is resolved", function (this: KQWorld) {
  const focus = this.makeGoal("blue", { left: 123, top: 45 });
  this.session.events.on(CONST.GAME_WIN, (p: typeof this.emittedWin) => {
    this.emittedWin = p;
  });
  this.session.win(CONST.WIN_ECONOMIC, CONST.TEAM_BLUE, focus);
});

When("the server emits {string}", function (this: KQWorld, _event: string) {
  assert.ok(this.emittedWin, "no game_win was emitted");
});

Then("the payload includes the win type, the winning team, and a focus position", function (this: KQWorld) {
  assert.ok(this.emittedWin!.type);
  assert.ok(this.emittedWin!.team);
  assert.equal(typeof this.emittedWin!.focus.left, "number");
  assert.equal(typeof this.emittedWin!.focus.top, "number");
});

Then("the client zooms the game-over view onto that focus position", function (this: KQWorld) {
  // client behaviour is Phase 3; here we assert the focus position is conveyed
  assert.equal(this.emittedWin!.focus.left, 123);
  assert.equal(this.emittedWin!.focus.top, 45);
});
