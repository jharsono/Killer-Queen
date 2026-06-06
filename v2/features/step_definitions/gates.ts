/**
 * Feature 04 — gates (shrines) and worker upgrades.
 */
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { CONST } from "../../shared/const.js";
import { Shrine, type Worker } from "../../server/entities.js";
import type { KQWorld } from "../support/world.js";

const asWorker = (w: KQWorld): Worker => w.subject as Worker;

/** Position a toon in the gate's activation zone (legacy: left past 40% width). */
function standInGate(toon: { left: number; top: number }, gate: Shrine): void {
  toon.left = gate.left + gate.width * 0.4 + 2;
  toon.top = gate.top;
}

// ---- background -------------------------------------------------------------

Given("the level contains a speed gate and a warrior gate per team", function (this: KQWorld) {
  this.blueSpeedGate = this.speedGate("blue", { left: 300, top: 300 });
  this.blueWarriorGate = this.warriorGate("blue", { left: 400, top: 300 });
  this.speedGate("gold", { left: 500, top: 300 });
  this.warriorGate("gold", { left: 600, top: 300 });
  this.shrine = this.blueSpeedGate; // default referent for "the gate"
});

// ---- using a gate -----------------------------------------------------------

Given("the gate is not currently in use", function (this: KQWorld) {
  assert.equal(this.shrine!.inUse, false);
});

When("the worker stands in the middle of the gate", function (this: KQWorld) {
  standInGate(this.subject!, this.shrine!);
  this.tick();
});

When("the worker stands in a gate", function (this: KQWorld) {
  standInGate(this.subject!, this.shrine!);
  this.tick();
});

// used as a When (scenarios 4 & 6: trigger) and a Then (scenario 1: re-affirm)
Then("the gate powers up the worker", function (this: KQWorld) {
  this.tick();
  assert.equal(this.shrine!.inUse, true);
});

Then("the carried berry is consumed", function (this: KQWorld) {
  assert.equal(asWorker(this).berry, null);
});

Then("no power-up is granted", function (this: KQWorld) {
  assert.equal(this.shrine!.inUse, false);
  assert.equal(asWorker(this).warrior, false);
  assert.equal(asWorker(this).speedUpgrade, false);
});

// ---- cooldown ---------------------------------------------------------------

Given("a gate that was just used", function (this: KQWorld) {
  this.shrine = this.blueWarriorGate!;
  const first = this.worker("blue", { left: 100, top: 100 });
  const berry = this.makeBerry({ left: 100, top: 100 });
  first.berry = berry;
  berry.toon = first;
  standInGate(first, this.shrine);
  this.tick(); // first worker powers up the gate
});

When("another worker with a berry enters within {int} ms", function (this: KQWorld, _ms: number) {
  const w = this.worker("blue", { left: 100, top: 100 });
  const berry = this.makeBerry({ left: 100, top: 100 });
  w.berry = berry;
  berry.toon = w;
  this.subject = w;
  standInGate(w, this.shrine!);
  this.tick();
});

Then("the gate does not power up the second worker", function (this: KQWorld) {
  assert.equal(asWorker(this).warrior, false);
});

// ---- warrior gate -----------------------------------------------------------

Given("a worker carrying a berry at a warrior gate", function (this: KQWorld) {
  const w = this.worker("blue", { left: 100, top: 100 });
  const berry = this.makeBerry({ left: 100, top: 100 });
  w.berry = berry;
  berry.toon = w;
  this.subject = w;
  this.shrine = this.blueWarriorGate!;
  standInGate(w, this.shrine);
});

Then("the worker becomes a warrior", function (this: KQWorld) {
  assert.equal(asWorker(this).warrior, true);
});

Then("the warrior's speed becomes {int}", function (this: KQWorld, speed: number) {
  assert.equal(asWorker(this).speed, speed);
});

Then("the warrior can attack and fly but can no longer carry berries", function (this: KQWorld) {
  const w = asWorker(this);
  assert.equal(w.warrior, true); // warriors can attack + fly (Worker.jump/attack gated on warrior)
  assert.equal(w.berry, null); // berryCheck is gated on !warrior
});

Given("a worker that already has the speed upgrade", function (this: KQWorld) {
  const w = this.worker("blue", { left: 100, top: 100 });
  w.gainSpeed();
  this.subject = w;
});

When("the worker is converted at a warrior gate", function (this: KQWorld) {
  const w = asWorker(this);
  const berry = this.makeBerry({ left: w.left, top: w.top });
  w.berry = berry;
  berry.toon = w;
  this.shrine = this.blueWarriorGate!;
  standInGate(w, this.shrine);
  this.tick();
});

// ---- speed gate -------------------------------------------------------------

Given("a worker carrying a berry at a speed gate", function (this: KQWorld) {
  const w = this.worker("blue", { left: 100, top: 100 });
  const berry = this.makeBerry({ left: 100, top: 100 });
  w.berry = berry;
  berry.toon = w;
  this.subject = w;
  this.shrine = this.blueSpeedGate!;
  standInGate(w, this.shrine);
});

Then("the worker gains the speed upgrade", function (this: KQWorld) {
  assert.equal(asWorker(this).speedUpgrade, true);
});

Then("the worker's movement speed becomes {int}", function (this: KQWorld, speed: number) {
  assert.equal(asWorker(this).speed, speed);
});

// ---- fidelity gap: speed upgrade does NOT speed up the snail -----------------

Given("a speed-upgraded worker riding the snail", function (this: KQWorld) {
  const w = this.worker("blue", { left: 400, top: 300 });
  w.gainSpeed();
  const snail = this.makeSnail({ left: 400, top: 300 });
  snail.toon = w;
  w.snail = true;
  this.subject = w;
});

When("the worker pushes the snail", function (this: KQWorld) {
  this.prevLeft = this.snail!.left;
  this.subject!.goLeft(); // blue pushes the snail left (toward its basket)
});

Then("the snail still moves at its base speed of {float} per tick", function (this: KQWorld, base: number) {
  assert.ok(Math.abs(Math.abs(this.snail!.left - this.prevLeft) - base) < 1e-9);
  assert.equal(this.snail!.speed, CONST.SNAIL_SPEED);
});

When("the worker enters a speed gate again", function (this: KQWorld) {
  const w = asWorker(this);
  const berry = this.makeBerry({ left: w.left, top: w.top });
  w.berry = berry;
  berry.toon = w;
  this.shrine = this.blueSpeedGate!;
  standInGate(w, this.shrine);
  this.tick();
});

Then("the speed gate check is skipped for that worker", function (this: KQWorld) {
  assert.equal(this.shrine!.inUse, false);
});

// ---- queen gate conversion --------------------------------------------------

Given("a gate affiliated with the gold team", function (this: KQWorld) {
  this.shrine = this.blueSpeedGate!;
  this.shrine.affiliation = CONST.TEAM_GOLD;
});

When("the blue queen touches the gate", function (this: KQWorld) {
  this.subject = this.queen("blue", { left: this.shrine!.left, top: this.shrine!.top });
  this.tick();
});

Then("the gate's affiliation changes to the blue team", function (this: KQWorld) {
  assert.equal(this.shrine!.affiliation, CONST.TEAM_BLUE);
});
