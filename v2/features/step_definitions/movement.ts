/**
 * Feature 02 — movement and physics.
 * Drives the GameSession loop with scripted keys and asserts on toon state.
 */
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { CONST } from "../../shared/const.js";
import type { Worker } from "../../server/entities.js";
import type { KQWorld } from "../support/world.js";

// ---- horizontal movement ----------------------------------------------------

Given("a {string} with no upgrades", function (this: KQWorld, unit: string) {
  this.subject = unit === "queen" ? this.queen("blue") : this.worker("blue");
});

When("the {string} key is held for one tick", function (this: KQWorld, key: string) {
  const toon = this.subject!;
  this.control(toon);
  this.press(key);
  this.prevLeft = toon.left;
  this.tick();
});

Then("the toon's left position changes by {int} pixels", function (this: KQWorld, delta: number) {
  assert.equal(this.subject!.left - this.prevLeft, delta);
});

Then("the toon faces {string}", function (this: KQWorld, facing: string) {
  assert.equal(this.subject!.direction, facing);
});

// ---- screen wrap ------------------------------------------------------------

Given("a toon at the right edge of the level", function (this: KQWorld) {
  this.subject = this.worker("blue", { left: this.session.level.width - 30, top: 100 });
});

When("the toon moves past the right boundary", function (this: KQWorld) {
  // push the centre past the right edge, then let the loop's wrap fire
  this.subject!.left = this.session.level.width;
  this.tick();
});

Then("the toon reappears at the left side of the level", function (this: KQWorld) {
  assert.equal(this.subject!.left, 0);
});

// ---- ducking ----------------------------------------------------------------

Given("a grounded worker", function (this: KQWorld) {
  this.ground({ left: 0, top: 300, width: 800, height: 40 });
  this.subject = this.worker("blue", { left: 100, top: 300 - 40 });
  this.tick(); // settle onto the ground
});

When("the ArrowDown key is held", function (this: KQWorld) {
  const toon = this.subject!;
  this.control(toon);
  this.press(CONST.KEY_DOWN);
  this.prevTop = toon.top;
  this.tick();
});

Then("the toon does not move downward", function (this: KQWorld) {
  assert.ok(this.subject!.top <= this.prevTop + 1e-9, `top moved down: ${this.prevTop} -> ${this.subject!.top}`);
});

Given("an airborne worker", function (this: KQWorld) {
  this.subject = this.worker("blue", { left: 100, top: 100 });
});

When("the ArrowDown key is held for one tick", function (this: KQWorld) {
  const toon = this.subject!;
  this.control(toon);
  this.press(CONST.KEY_DOWN);
  this.prevTop = toon.top;
  this.tick();
});

Then("the toon's top position increases by its speed", function (this: KQWorld) {
  assert.equal(this.subject!.top - this.prevTop, this.subject!.speed);
});

// ---- gravity & ground -------------------------------------------------------

Given("an airborne toon with zero downward acceleration", function (this: KQWorld) {
  this.subject = this.worker("blue", { left: 100, top: 50 });
  this.subject.accel = 0;
});

When("several ticks pass without input", function (this: KQWorld) {
  const before = this.subject!.accel;
  this.tick();
  this.firstAccelDelta = this.subject!.accel - before;
  this.tick(60);
  this.cappedAccel = this.subject!.accel;
});

Then("downward acceleration increases by {float} each tick", function (this: KQWorld, rate: number) {
  assert.ok(Math.abs(this.firstAccelDelta - rate) < 1e-9, `delta was ${this.firstAccelDelta}`);
});

Then("acceleration is capped at {int} per tick", function (this: KQWorld, cap: number) {
  assert.equal(this.cappedAccel, cap);
});

Given("a toon falling toward a ground surface", function (this: KQWorld) {
  this.ground({ left: 0, top: 400, width: 800, height: 40 });
  this.subject = this.worker("blue", { left: 100, top: 100 });
});

When("the toon's feet reach the ground", function (this: KQWorld) {
  for (let i = 0; i < 300 && !this.subject!.grounded; i++) this.tick();
});

Then("the toon is marked grounded", function (this: KQWorld) {
  assert.equal(this.subject!.grounded, true);
});

Then("the toon's downward acceleration is reset to zero", function (this: KQWorld) {
  assert.equal(this.subject!.accel, 0);
});

// ---- walls ------------------------------------------------------------------

Given("a toon adjacent to a wall", function (this: KQWorld) {
  this.wall({ left: 200, top: 80, width: 20, height: 100 });
  // just penetrate the wall's left face (right edge a couple px past it) so the
  // side-wall resolution is what fires, not the floor/ceiling nudge.
  this.subject = this.worker("blue", { left: 172, top: 100 });
});

When("the toon moves into the wall", function (this: KQWorld) {
  this.tick();
});

Then("the toon is pushed back out of the wall surface", function (this: KQWorld) {
  const wall = this.session.level.ground[0];
  // pushed back: the toon's right edge no longer penetrates the wall's left
  // face (flush contact after the loop's 0.1px nudge + integer rounding is OK).
  assert.ok(
    this.subject!.left + this.subject!.width <= wall.left + 1,
    `toon still penetrating wall: right=${this.subject!.left + this.subject!.width}, wall.left=${wall.left}`,
  );
});

// ---- jumping & flight -------------------------------------------------------

When("the ArrowUp key is held across multiple ticks", function (this: KQWorld) {
  const toon = this.subject!;
  this.control(toon);
  this.press(CONST.KEY_UP);
  this.tick();
});

Then("the toon receives an upward impulse on the first tick only", function (this: KQWorld) {
  assert.equal(this.subject!.accel, -5);
});

Then("the jump key is consumed each tick so it cannot repeat-fire", function (this: KQWorld) {
  assert.ok(!this.user!.keys.includes(CONST.KEY_UP), "ArrowUp was not consumed");
});

Given("an airborne worker that is not riding the snail", function (this: KQWorld) {
  this.subject = this.worker("blue", { left: 100, top: 100 });
});

When("the ArrowUp key is pressed", function (this: KQWorld) {
  const toon = this.subject!;
  this.control(toon);
  this.press(CONST.KEY_UP);
  this.tick();
});

Then("the worker does not jump", function (this: KQWorld) {
  // no upward impulse: acceleration stayed non-negative (gravity only)
  assert.ok(this.subject!.accel >= 0, `worker jumped: accel ${this.subject!.accel}`);
});

Given("an airborne warrior", function (this: KQWorld) {
  this.subject = this.worker("blue", { left: 100, top: 100 });
  (this.subject as Worker).gainWarrior();
});

Then("the warrior receives an upward impulse", function (this: KQWorld) {
  assert.equal(this.subject!.accel, -5);
});

Given("an airborne queen", function (this: KQWorld) {
  this.subject = this.queen("blue", { left: 100, top: 100 });
});

Then("the queen receives an upward impulse", function (this: KQWorld) {
  assert.equal(this.subject!.accel, -5);
});
