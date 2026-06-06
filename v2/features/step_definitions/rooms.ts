/**
 * Feature 08 — rooms and join codes (Decision D).
 * Drives RoomManager + GameSession headlessly to prove room isolation.
 */
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { CONST } from "../../shared/const.js";
import { RoomManager } from "../../server/RoomManager.js";
import type { GameSession, SessionUser } from "../../server/GameSession.js";
import type { KQWorld } from "../support/world.js";

let userCounterSeed = 0;
function joinRoom(session: GameSession): SessionUser {
  const user: SessionUser = { id: `u${userCounterSeed++}`, keys: [], toonId: null, ready: false };
  session.addUser(user);
  return user;
}

Given("a server hosting multiple games as join-by-code rooms", function (this: KQWorld) {
  this.roomManager = new RoomManager();
});

Given("a player joins room {string}", function (this: KQWorld, code: string) {
  this.roomA = this.roomManager!.getOrCreate(code);
  joinRoom(this.roomA);
});

When("another player joins room {string}", function (this: KQWorld, code: string) {
  const room = this.roomManager!.getOrCreate(code);
  joinRoom(room);
  this.roomB = room;
});

Then("both players are in the same room", function (this: KQWorld) {
  assert.equal(this.roomA, this.roomB);
  assert.equal(this.roomA!.users.length, 2);
});

Then("the server is running exactly one room", function (this: KQWorld) {
  assert.equal(this.roomManager!.size, 1);
});

Then("the server is running exactly two rooms", function (this: KQWorld) {
  assert.equal(this.roomManager!.size, 2);
});

Then("each room has one player", function (this: KQWorld) {
  assert.equal(this.roomA!.users.length, 1);
  assert.equal(this.roomB!.users.length, 1);
});

Given("two independent rooms each with a match in progress", function (this: KQWorld) {
  this.roomA = this.roomManager!.getOrCreate("ROOMA");
  this.roomB = this.roomManager!.getOrCreate("ROOMB");
  joinRoom(this.roomA);
  joinRoom(this.roomB);
  this.roomA.start();
  this.roomB.start();
});

When("a win is resolved in the first room", function (this: KQWorld) {
  const focus = this.roomA!.spawn("goal", "teamBlue-goal", { left: 10, top: 20, width: 30, height: 30 });
  this.roomA!.win(CONST.WIN_ECONOMIC, CONST.TEAM_BLUE, focus);
});

Then("the first room has ended", function (this: KQWorld) {
  assert.equal(this.roomA!.gameInProgress, false);
  assert.ok(this.roomA!.lastWin);
});

Then("the second room's match is still in progress", function (this: KQWorld) {
  assert.equal(this.roomB!.gameInProgress, true);
  assert.equal(this.roomB!.lastWin, null);
});

Given("two independent rooms", function (this: KQWorld) {
  this.roomA = this.roomManager!.getOrCreate("ROOMA");
  this.roomB = this.roomManager!.getOrCreate("ROOMB");
});

When("a player in each room selects {string}", function (this: KQWorld, toonId: string) {
  const a = joinRoom(this.roomA!);
  const b = joinRoom(this.roomB!);
  this.selectResults = [this.roomA!.selectCharacter(a.id, toonId), this.roomB!.selectCharacter(b.id, toonId)];
});

Then("both selections succeed", function (this: KQWorld) {
  assert.deepEqual(this.selectResults, [true, true]);
});
