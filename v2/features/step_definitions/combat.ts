/**
 * Feature 06 — combat, death, and respawn.
 */
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { CONST } from "../../shared/const.js";
import type { Queen, Worker } from "../../server/entities.js";
import type { KQWorld } from "../support/world.js";

// ---- attacking --------------------------------------------------------------

Given("a warrior facing an enemy worker within contact range", function (this: KQWorld) {
  const warrior = this.worker("blue", { left: 100, top: 100 });
  warrior.gainWarrior();
  this.enemy = this.worker("gold", { left: 110, top: 100 }); // to the right → faced
  this.subject = warrior;
});

Then("the warrior performs an attack", function (this: KQWorld) {
  assert.equal((this.subject as Worker).attacking, true);
});

Then("the attack stays active for {int} ms", function (this: KQWorld, ms: number) {
  assert.equal((this.subject as Worker).attacking, true);
  this.session.advanceClock(ms + 10);
  assert.equal((this.subject as Worker).attacking, false);
});

Given("a worker without the warrior upgrade facing an enemy", function (this: KQWorld) {
  this.subject = this.worker("blue", { left: 100, top: 100 });
  this.enemy = this.worker("gold", { left: 110, top: 100 });
});

Then("no attack is performed", function (this: KQWorld) {
  assert.equal((this.subject as Worker).attacking, false);
});

Given("a warrior with an active attack facing an enemy worker", function (this: KQWorld) {
  const warrior = this.worker("blue", { left: 100, top: 100 });
  this.enemy = this.worker("gold", { left: 110, top: 100 });
  this.clearSpawnInvulnerability(); // so the enemy is killable
  warrior.gainWarrior();
  warrior.attack();
  this.subject = warrior;
});

When("the two overlap", function (this: KQWorld) {
  this.enemy!.left = this.subject!.left + 10;
  this.enemy!.top = this.subject!.top;
  this.tick();
});

Then("the enemy worker is killed", function (this: KQWorld) {
  assert.ok((this.enemy as Worker).attackedCount >= 1);
});

// ---- death effects ----------------------------------------------------------

Given("a worker carrying a berry and riding the snail", function (this: KQWorld) {
  const snail = this.makeSnail({ left: 400, top: 300 });
  const w = this.worker("blue", { left: 400, top: 300 });
  const berry = this.makeBerry({ left: 400, top: 300 });
  w.berry = berry;
  berry.toon = w;
  snail.toon = w;
  w.snail = true;
  this.subject = w;
});

When("the worker is killed", function (this: KQWorld) {
  this.clearSpawnInvulnerability();
  this.subject!.attacked();
});

Given("a warrior is killed", function (this: KQWorld) {
  const w = this.worker("blue", { left: 100, top: 100 });
  w.gainWarrior();
  this.clearSpawnInvulnerability();
  w.attacked(); // killing a warrior resets it to a worker
  this.subject = w;
});

When("the warrior respawns", function (this: KQWorld) {
  // respawn already happened on the kill (attacked → reset); nothing to do
});

Then("it returns as a worker with no warrior upgrade", function (this: KQWorld) {
  assert.equal((this.subject as Worker).warrior, false);
});

Then("its speed returns to {int}", function (this: KQWorld, speed: number) {
  assert.equal((this.subject as Worker).speed, speed);
});

// ---- invulnerability --------------------------------------------------------

Given("a toon has just spawned or respawned", function (this: KQWorld) {
  this.subject = this.worker("blue", { left: 100, top: 100 }); // fresh → invulnerable
});

When("it is attacked within {int} ms of spawning", function (this: KQWorld, _ms: number) {
  this.subject!.attacked();
});

Then("the attack has no effect", function (this: KQWorld) {
  assert.equal(this.subject!.attackedCount, 0);
});

Given("a toon that is currently invulnerable", function (this: KQWorld) {
  this.subject = this.worker("blue", { left: 100, top: 100 });
});

When("an enemy attack overlaps it", function (this: KQWorld) {
  this.subject!.attacked();
});

Then("the toon is not killed", function (this: KQWorld) {
  assert.equal(this.subject!.attackedCount, 0);
});

// ---- queen vs queen ---------------------------------------------------------

Given("two enemy queens both attacking and facing each other", function (this: KQWorld) {
  const higher = this.queen("blue", { left: 100, top: 100 });
  const lower = this.queen("gold", { left: 110, top: 120 }); // overlaps, but lower
  this.egg("blue", { left: 50, top: 50 });
  this.egg("gold", { left: 700, top: 50 });
  this.clearSpawnInvulnerability();
  higher.setDirection(CONST.DIRECTION_RIGHT); // faces the gold queen on its right
  lower.setDirection(CONST.DIRECTION_LEFT); // faces the blue queen on its left
  higher.attack();
  lower.attack();
  this.subject = lower; // "the lower-positioned queen"
  this.enemy = higher; // "the higher-positioned queen"
});

When("they overlap", function (this: KQWorld) {
  this.tick();
});

Then("the lower-positioned queen is killed", function (this: KQWorld) {
  assert.ok((this.subject as Queen).attackedCount >= 1);
});

Then("the higher-positioned queen survives", function (this: KQWorld) {
  assert.equal((this.enemy as Queen).attackedCount, 0);
});

Given("an attacking queen facing an enemy queen", function (this: KQWorld) {
  const attacker = this.queen("gold", { left: 100, top: 100 });
  const victim = this.queen("blue", { left: 110, top: 100 });
  this.egg("blue", { left: 50, top: 50 });
  this.egg("gold", { left: 700, top: 50 });
  this.clearSpawnInvulnerability();
  attacker.setDirection(CONST.DIRECTION_RIGHT); // faces the victim on its right
  attacker.attack();
  this.subject = attacker;
  this.enemy = victim;
});

Given("the enemy queen is not facing back", function (this: KQWorld) {
  (this.enemy as Queen).setDirection(CONST.DIRECTION_RIGHT); // faces away from the attacker on its left
});

Then("the enemy queen is killed", function (this: KQWorld) {
  assert.ok((this.enemy as Queen).attackedCount >= 1);
});
