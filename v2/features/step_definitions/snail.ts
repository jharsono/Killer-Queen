/**
 * Feature 05 — the snail and the snail win.
 */
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { CONST } from "../../shared/const.js";
import type { Snail, Worker } from "../../server/entities.js";
import type { KQWorld } from "../support/world.js";

const asWorker = (w: KQWorld): Worker => w.subject as Worker;

function mount(worker: Worker, snail: Snail): void {
  snail.toon = worker;
  worker.snail = true;
}

function teamColor(team: string): "blue" | "gold" {
  return team.toLowerCase().includes("gold") ? "gold" : "blue";
}

// ---- background -------------------------------------------------------------

Given("the snail sits between the two team baskets", function (this: KQWorld) {
  this.makeSnail({ left: 400, top: 300, width: 40, height: 40 });
  this.makeCage("blue", { left: 100, top: 300, width: 40, height: 40 });
  this.makeCage("gold", { left: 700, top: 300, width: 40, height: 40 });
});

// ---- mounting & steering ----------------------------------------------------

Given("a worker without the warrior upgrade", function (this: KQWorld) {
  this.subject = this.worker("blue", { left: 100, top: 100 });
});

When("the worker overlaps the snail", function (this: KQWorld) {
  this.subject!.left = this.snail!.left;
  this.subject!.top = this.snail!.top;
  this.tick();
});

Then("the worker becomes the snail's rider", function (this: KQWorld) {
  assert.equal(this.snail!.toon, this.subject);
  assert.equal(asWorker(this).snail, true);
});

Then("the worker is positioned on the snail each tick", function (this: KQWorld) {
  this.tick();
  assert.equal(this.subject!.top, this.snail!.top);
});

Given("a warrior overlapping the unoccupied snail", function (this: KQWorld) {
  const w = this.worker("blue", { left: this.snail!.left, top: this.snail!.top });
  w.gainWarrior();
  this.subject = w;
});

Then("the snail has no rider", function (this: KQWorld) {
  assert.equal(this.snail!.toon, null);
});

Given("a {string} worker riding the snail", function (this: KQWorld, team: string) {
  const w = this.worker(teamColor(team), { left: this.snail!.left, top: this.snail!.top });
  mount(w, this.snail!);
  this.subject = w;
});

When("the worker pushes {string}", function (this: KQWorld, direction: string) {
  this.prevLeft = this.snail!.left;
  if (direction === CONST.KEY_LEFT) this.subject!.goLeft();
  else this.subject!.goRight();
});

Then("the snail moves {string}", function (this: KQWorld, result: string) {
  const snail = this.snail!;
  if (result.includes("not at all")) assert.equal(snail.left, this.prevLeft);
  else if (result.includes("left")) assert.ok(snail.left < this.prevLeft, "snail did not move left");
  else if (result.includes("right")) assert.ok(snail.left > this.prevLeft, "snail did not move right");
  else throw new Error(`unknown result: ${result}`);
});

Given("a worker pushing the snail in their allowed direction", function (this: KQWorld) {
  const w = this.worker("blue", { left: this.snail!.left, top: this.snail!.top });
  mount(w, this.snail!);
  this.subject = w;
  this.control(w);
  this.press(CONST.KEY_LEFT); // blue's allowed direction
});

When("one tick passes", function (this: KQWorld) {
  this.prevLeft = this.snail!.left;
  this.tick();
});

Then("the snail moves by {float} pixels", function (this: KQWorld, px: number) {
  assert.ok(Math.abs(Math.abs(this.snail!.left - this.prevLeft) - px) < 1e-9);
});

// ---- dismount ---------------------------------------------------------------

Given("a worker riding the snail", function (this: KQWorld) {
  const w = this.worker("blue", { left: this.snail!.left, top: this.snail!.top });
  mount(w, this.snail!);
  this.subject = w;
});

When("the worker jumps", function (this: KQWorld) {
  this.subject!.jump();
});

Then("the worker is no longer the snail's rider", function (this: KQWorld) {
  assert.equal(this.snail!.toon, null);
  assert.equal(asWorker(this).snail, false);
});

Then("the worker is placed beside the snail", function (this: KQWorld) {
  assert.notEqual(this.subject!.left, this.snail!.left);
});

// ---- swallowing -------------------------------------------------------------

Given("a worker of one team riding the snail", function (this: KQWorld) {
  const w = this.worker("blue", { left: this.snail!.left, top: this.snail!.top });
  mount(w, this.snail!);
  this.subject = w;
});

When("an enemy worker touches the snail while it is not already swallowing", function (this: KQWorld) {
  this.enemy = this.worker("gold", { left: this.snail!.left, top: this.snail!.top });
  this.tick();
});

Then("the snail begins swallowing", function (this: KQWorld) {
  assert.equal(this.snail!.swallowing, true);
});

Then("the enemy worker is removed from play for {int} ms", function (this: KQWorld, _ms: number) {
  assert.equal((this.enemy as Worker).active, false);
});

Given("the snail is currently swallowing an enemy", function (this: KQWorld) {
  const rider = this.worker("blue", { left: this.snail!.left, top: this.snail!.top });
  mount(rider, this.snail!);
  this.subject = rider;
  // a first enemy touches → snail starts swallowing
  this.worker("gold", { left: this.snail!.left, top: this.snail!.top });
  this.tick();
  assert.equal(this.snail!.swallowing, true);
});

When("another enemy worker touches the snail", function (this: KQWorld) {
  this.enemy = this.worker("gold", { left: this.snail!.left, top: this.snail!.top });
  this.tick();
});

Then("no new swallow begins until the {int} ms swallow finishes", function (this: KQWorld, _ms: number) {
  assert.equal((this.enemy as Worker).active, true, "a second swallow began while already swallowing");
});

When("that rider is killed", function (this: KQWorld) {
  this.clearSpawnInvulnerability();
  this.subject!.attacked();
});

// ---- snail victory ----------------------------------------------------------

Given("a worker riding the snail toward a basket", function (this: KQWorld) {
  const w = this.worker("blue", { left: this.snail!.left, top: this.snail!.top });
  mount(w, this.snail!);
  this.subject = w;
});

When("the snail reaches the basket", function (this: KQWorld) {
  const blueCage = this.session.level.snailCages.find((c) => c.team === CONST.TEAM_BLUE)!;
  this.snail!.left = blueCage.left;
  this.tick();
});

When("the snail contacts any basket", function (this: KQWorld) {
  const anyCage = this.session.level.snailCages[0];
  this.snail!.left = anyCage.left;
  this.tick();
});
