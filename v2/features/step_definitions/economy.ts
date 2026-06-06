/**
 * Feature 03 — berries and the economic win.
 */
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import type { Berry, Worker } from "../../server/entities.js";
import type { KQWorld } from "../support/world.js";

const asWorker = (w: KQWorld): Worker => w.subject as Worker;

// ---- carrying ---------------------------------------------------------------

Given("an unclaimed berry on the ground", function (this: KQWorld) {
  this.makeBerry({ left: 200, top: 200 });
});

When("the worker overlaps the berry", function (this: KQWorld) {
  this.subject!.left = this.berry!.left;
  this.subject!.top = this.berry!.top;
  this.tick();
});

Then("the worker is carrying that berry", function (this: KQWorld) {
  assert.equal(asWorker(this).berry, this.berry);
});

Then("the berry follows the worker's position each tick", function (this: KQWorld) {
  const before = this.berry!.left;
  this.subject!.left += 50;
  this.tick();
  assert.notEqual(this.berry!.left, before, "berry did not track the worker");
  assert.equal(this.berry!.toon, this.subject);
});

Given("a worker already carrying a berry", function (this: KQWorld) {
  const w = this.worker("blue", { left: 100, top: 100 });
  const b = this.makeBerry({ left: 100, top: 100 });
  w.berry = b;
  b.toon = w;
  this.subject = w;
});

When("the worker overlaps a second unclaimed berry", function (this: KQWorld) {
  // create the second berry without clobbering `this.berry` (the original)
  this.berry2 = this.session.spawn("berry", "berry-second", {
    left: this.subject!.left,
    top: this.subject!.top,
    width: 16,
    height: 16,
  }) as Berry;
  this.tick();
});

Then("the worker keeps the original berry", function (this: KQWorld) {
  assert.equal(asWorker(this).berry, this.berry);
});

Then("the second berry remains unclaimed", function (this: KQWorld) {
  assert.equal(this.berry2!.toon, null);
});

Given("a warrior overlapping an unclaimed berry", function (this: KQWorld) {
  const w = this.worker("blue", { left: 100, top: 100 });
  w.gainWarrior();
  this.makeBerry({ left: 100, top: 100 });
  this.subject = w;
});

Then("the warrior is not carrying the berry", function (this: KQWorld) {
  assert.equal(asWorker(this).berry, null);
  assert.equal(this.berry!.toon, null);
});

// ---- duplicate pickup -------------------------------------------------------

Given("two workers contact the same unclaimed berry on the same tick", function (this: KQWorld) {
  this.subject = this.worker("blue", { left: 100, top: 100 });
  this.enemy = this.worker("blue", { left: 100, top: 100 });
  this.makeBerry({ left: 100, top: 100 });
});

When("the berry pickup is resolved", function (this: KQWorld) {
  this.tick();
});

Then("exactly one worker carries the berry", function (this: KQWorld) {
  const a = (this.subject as Worker).berry ? 1 : 0;
  const b = (this.enemy as Worker).berry ? 1 : 0;
  assert.equal(a + b, 1);
});

Then("the duplicate pickup is rejected", function (this: KQWorld) {
  // the berry has exactly one owner, and it is whichever worker claimed it
  assert.ok(this.berry!.toon === this.subject || this.berry!.toon === this.enemy);
});

// ---- depositing -------------------------------------------------------------

Given("an empty goal belonging to the worker's team", function (this: KQWorld) {
  this.makeGoal("blue", { left: 300, top: 300 });
});

When("the carried berry overlaps that goal", function (this: KQWorld) {
  this.subject!.left = this.goal!.left;
  this.subject!.top = this.goal!.top;
  this.tick();
});

Then("the berry fills the goal", function (this: KQWorld) {
  assert.equal(this.goal!.berry, this.berry);
});

Then("the worker is no longer carrying a berry", function (this: KQWorld) {
  assert.equal(asWorker(this).berry, null);
});

Given("the only nearby goal belongs to the enemy team", function (this: KQWorld) {
  this.makeGoal("gold", { left: 300, top: 300 });
});

When("the worker overlaps that goal", function (this: KQWorld) {
  this.subject!.left = this.goal!.left;
  this.subject!.top = this.goal!.top;
  this.tick();
});

Then("the berry is not deposited", function (this: KQWorld) {
  assert.equal(this.goal!.berry, null);
});

Given("a goal that already holds a berry", function (this: KQWorld) {
  this.goal = this.makeGoal("blue", { left: 300, top: 300 });
  const filled = this.makeBerry({ left: 300, top: 300 });
  filled.goal = this.goal;
  filled.active = false;
  this.goal.berry = filled;
  this.filledBerry = filled;
  // a worker carrying a different berry, ready to try the same goal
  const w = this.worker("blue", { left: 100, top: 100 });
  const carried = this.makeBerry({ left: 100, top: 100 });
  w.berry = carried;
  carried.toon = w;
  this.subject = w;
  this.berry = carried;
});

When("another carried berry overlaps that goal", function (this: KQWorld) {
  this.subject!.left = this.goal!.left;
  this.subject!.top = this.goal!.top;
  this.tick();
});

Then("the goal still holds only its original berry", function (this: KQWorld) {
  assert.equal(this.goal!.berry, this.filledBerry);
});

// ---- economic victory -------------------------------------------------------

Given("every goal for the blue team holds a berry except one", function (this: KQWorld) {
  const filledA = this.makeGoal("blue", { left: 100, top: 300 });
  const filledB = this.makeGoal("blue", { left: 200, top: 300 });
  for (const g of [filledA, filledB]) {
    const b = this.makeBerry({ left: g.left, top: g.top });
    b.goal = g;
    b.active = false;
    g.berry = b;
  }
  this.emptyGoal = this.makeGoal("blue", { left: 300, top: 300 });
  // a blue worker carrying a berry, poised at the empty goal
  const w = this.worker("blue", { left: this.emptyGoal.left, top: this.emptyGoal.top });
  const carried = this.makeBerry({ left: this.emptyGoal.left, top: this.emptyGoal.top });
  w.berry = carried;
  carried.toon = w;
  this.subject = w;
  this.berry = carried;
});

When("a blue worker deposits a berry in the last empty blue goal", function (this: KQWorld) {
  this.subject!.left = this.emptyGoal!.left;
  this.subject!.top = this.emptyGoal!.top;
  this.tick();
});
