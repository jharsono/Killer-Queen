/**
 * Shared steps used across multiple engine feature files (Backgrounds + win
 * assertions). Each step pattern is defined exactly once across all step files.
 */
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { CONST } from "../../shared/const.js";
import type { Worker } from "../../server/entities.js";
import type { KQWorld } from "../support/world.js";

Given("a match is in progress", function (this: KQWorld) {
  // A fresh GameSession is constructed per scenario by the World; subsequent
  // Given steps populate the specific entities each scenario needs.
});

Given("the level is {int} wide by {int} tall", function (this: KQWorld, w: number, h: number) {
  this.session.level.width = w;
  this.session.level.height = h;
});

// ---- shared entity setup (used by berries + gates features) -----------------

Given("a worker carrying no berry", function (this: KQWorld) {
  this.subject = this.worker("blue", { left: 100, top: 100 });
});

Given("a worker carrying a berry", function (this: KQWorld) {
  const w = this.worker("blue", { left: 100, top: 100 });
  const b = this.makeBerry({ left: 100, top: 100 });
  w.berry = b;
  b.toon = w;
  this.subject = w;
});

// generic "evaluate collisions / let a tick pass" used by several features
When("collision is evaluated", function (this: KQWorld) {
  this.tick();
});

Given("berries are scattered around the level", function (this: KQWorld) {
  // background flavour; scenarios create the specific berries they assert on
});

Then("the server resolves a {string} win for the blue team", function (this: KQWorld, type: string) {
  assert.ok(this.session.lastWin, "expected a win to be resolved");
  assert.equal(this.session.lastWin.type, type);
  assert.equal(this.session.lastWin.team, CONST.TEAM_BLUE);
});

Then("the server resolves a {string} win for the gold team", function (this: KQWorld, type: string) {
  assert.ok(this.session.lastWin, "expected a win to be resolved");
  assert.equal(this.session.lastWin.type, type);
  assert.equal(this.session.lastWin.team, CONST.TEAM_GOLD);
});

Then("the server resolves a {string} win for the rider's team", function (this: KQWorld, type: string) {
  assert.ok(this.session.lastWin, "expected a win to be resolved");
  assert.equal(this.session.lastWin.type, type);
  assert.equal(this.session.lastWin.team, this.subject?.team);
});

Then("a {string} win is credited to the rider's team", function (this: KQWorld, type: string) {
  assert.ok(this.session.lastWin, "expected a win to be resolved");
  assert.equal(this.session.lastWin.type, type);
  assert.equal(this.session.lastWin.team, this.subject?.team);
});
