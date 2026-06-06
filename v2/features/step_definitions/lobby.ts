/**
 * Feature 01 — lobby and match flow (Phase 2).
 *
 * Drives the GameSession lobby headlessly: connect users, select characters,
 * ready up, and assert on the recipient-targeted events the session emits
 * (which the Socket.IO layer routes to sockets) plus the fake scheduler's
 * pending reset timers.
 *
 * Note (Decision D): the legacy "single global game instance" is now one
 * room/GameSession. The lobby flow is identical per-room; cross-room isolation
 * is covered by 08_rooms_and_join_codes.feature.
 */
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { CONST } from "../../shared/const.js";
import { ROSTER } from "../../shared/roster.js";
import type { KQWorld } from "../support/world.js";

type Payload = { recipients?: "all" | string[]; [k: string]: unknown };

function recipientsInclude(p: Payload, id: string): boolean {
  return p.recipients === "all" || (Array.isArray(p.recipients) && p.recipients.includes(id));
}

// ---- background -------------------------------------------------------------

Given("the server is running a single global game instance", function (this: KQWorld) {
  this.newLobbySession();
});

Given("each connected browser is one user with an empty key state", function (this: KQWorld) {
  // users are connected by the individual scenarios
});

Given("no match is in progress", function (this: KQWorld) {
  assert.equal(this.session.gameInProgress, false);
});

// ---- character selection ----------------------------------------------------

When("a user connects to the server", function (this: KQWorld) {
  this.user = this.connect();
});

Then("the server emits a {string} to that user", function (this: KQWorld, event: string) {
  const evs = this.recorded(event);
  assert.ok(
    evs.some((p) => recipientsInclude(p, this.user!.id)),
    `no ${event} emitted to the connecting user`,
  );
});

Then("the menu shows which characters are already taken", function (this: KQWorld) {
  const menu = this.recorded(CONST.MENU_UPDATE).at(-1) as { state?: { characters?: unknown[] } } | undefined;
  const characters = menu?.state?.characters as { toonId: string; taken: boolean }[] | undefined;
  assert.ok(characters && characters.length === ROSTER.length);
  assert.ok(characters.every((c) => typeof c.taken === "boolean"));
});

Given("the character {string} is not taken", function (this: KQWorld, toonId: string) {
  this.user = this.connect();
  assert.ok(!this.session.users.some((u) => u.toonId === toonId));
});

When("the user selects {string}", function (this: KQWorld, toonId: string) {
  this.session.selectCharacter(this.user!.id, toonId);
});

Then("the user's toonId becomes {string}", function (this: KQWorld, toonId: string) {
  assert.equal(this.user!.toonId, toonId);
});

Then("the user's ready flag is reset to false", function (this: KQWorld) {
  assert.equal(this.user!.ready, false);
});

Then("the server emits a {string} to all users without a character", function (this: KQWorld, event: string) {
  const evs = this.recorded(event);
  assert.ok(evs.length > 0, `no ${event} emitted`);
  assert.ok(Array.isArray(evs.at(-1)!.recipients), `${event} was not lobby-targeted`);
});

Given("another user already holds {string}", function (this: KQWorld, toonId: string) {
  this.otherUser = this.connect();
  this.session.selectCharacter(this.otherUser.id, toonId);
  this.user = this.connect();
  this.prevToon = this.user.toonId;
  this.clearRecorded();
});

Then("the server emits an {string} with text {string}", function (this: KQWorld, event: string, text: string) {
  const evs = this.recorded(event);
  assert.ok(
    evs.some((p) => p.text === text && recipientsInclude(p, this.user!.id)),
    `no ${event} with text "${text}" emitted to the user`,
  );
});

Then("the user's toonId remains unchanged", function (this: KQWorld) {
  assert.equal(this.user!.toonId, this.prevToon);
});

// ---- ready-up & countdown ---------------------------------------------------

Given("every connected user has selected a character", function (this: KQWorld) {
  const u1 = this.connect();
  const u2 = this.connect();
  this.session.selectCharacter(u1.id, ROSTER[0]);
  this.session.selectCharacter(u2.id, ROSTER[1]);
  this.session.setReady(u1.id, true); // first user ready; last one readies in the When
  this.lastUser = u2;
  this.clearRecorded();
});

When("the last user readies up", function (this: KQWorld) {
  this.session.setReady(this.lastUser!.id, true);
});

Then("the server dispatches {string}", function (this: KQWorld, event: string) {
  assert.ok(this.recorded(event).length > 0, `${event} was not dispatched`);
});

Then("after the countdown the server dispatches {string}", function (this: KQWorld, event: string) {
  assert.ok(this.recorded(event).length > 0, `${event} was not dispatched after the countdown`);
});

Given("every connected user is ready", function (this: KQWorld) {
  const u = this.connect();
  this.session.selectCharacter(u.id, ROSTER[0]);
  this.clearRecorded();
  this.session.setReady(u.id, true); // all ready → countdown + start fire here
});

When("the countdown begins", function (this: KQWorld) {
  // the countdown fired when the last user readied (GAME_START_DELAY is 0)
});

Then("the emitted countdown time is {int}", function (this: KQWorld, time: number) {
  const cd = this.recorded(CONST.GAME_COUNTDOWN).at(-1) as { time?: number } | undefined;
  assert.equal(cd?.time, time);
});

Then("{string} is dispatched immediately", function (this: KQWorld, event: string) {
  assert.ok(this.recorded(event).length > 0, `${event} was not dispatched`);
});

Given("a match is already in progress", function (this: KQWorld) {
  const u = this.connect();
  this.session.selectCharacter(u.id, ROSTER[0]);
  this.session.setReady(u.id, true); // starts the match
  assert.equal(this.session.gameInProgress, true);
  this.clearRecorded();
});

When("a user readies up", function (this: KQWorld) {
  this.user = this.connect();
  this.session.setReady(this.user.id, true);
});

Then("the server emits {string} only to that user", function (this: KQWorld, event: string) {
  const evs = this.recorded(event);
  assert.ok(
    evs.some((p) => Array.isArray(p.recipients) && p.recipients.length === 1 && p.recipients[0] === this.user!.id),
    `${event} was not emitted only to that user`,
  );
});

Then("the countdown is not restarted for the other players", function (this: KQWorld) {
  assert.equal(this.recorded(CONST.GAME_COUNTDOWN).length, 0);
});

// ---- match end & reset ------------------------------------------------------

When("the server resolves a win condition", function (this: KQWorld) {
  const focus = this.makeGoal("blue", { left: 10, top: 20 });
  this.session.win(CONST.WIN_ECONOMIC, CONST.TEAM_BLUE, focus);
});

Then(
  "the server emits {string} with the win type, team, and focus element",
  function (this: KQWorld, event: string) {
    const win = this.recorded(event).at(-1) as { type?: string; team?: string; focus?: unknown } | undefined;
    assert.ok(win?.type && win?.team && win?.focus, `${event} payload incomplete`);
  },
);

Then("the server dispatches {string} after {int} ms", function (this: KQWorld, _event: string, ms: number) {
  assert.ok(this.fakeScheduler!.pending(ms).length > 0, `no reset scheduled at ${ms} ms`);
});

Given("a match has ended", function (this: KQWorld) {
  this.user = this.connect();
  this.session.selectCharacter(this.user.id, ROSTER[0]);
  this.session.start();
  this.clearRecorded();
});

When("{string} is dispatched", function (this: KQWorld, event: string) {
  if (event === CONST.GAME_RESET) this.session.reset();
});

Then("the server emits {string} to all users", function (this: KQWorld, event: string) {
  assert.ok(
    this.recorded(event).some((p) => p.recipients === "all"),
    `${event} was not broadcast to all users`,
  );
});

Then("the game loop is stopped", function (this: KQWorld) {
  assert.equal(this.session.gameInProgress, false);
});

Then("every user's toonId is cleared", function (this: KQWorld) {
  assert.ok(this.session.users.every((u) => u.toonId === null));
});

// ---- disconnect -------------------------------------------------------------

Given("exactly one user is connected", function (this: KQWorld) {
  this.user = this.connect();
  assert.equal(this.session.users.length, 1);
});

When("that user disconnects", function (this: KQWorld) {
  this.session.removeUser(this.user!.id);
});

Given("two or more users are connected", function (this: KQWorld) {
  this.user = this.connect(); // stays in the lobby (no character)
  this.otherUser = this.connect();
  this.releasedToon = ROSTER[0];
  this.session.selectCharacter(this.otherUser.id, this.releasedToon);
  this.clearRecorded();
});

When("one user disconnects", function (this: KQWorld) {
  this.session.removeUser(this.otherUser!.id);
});

Then("that user's character is released", function (this: KQWorld) {
  const ch = this.session.getMenuState().characters.find((c) => c.toonId === this.releasedToon);
  assert.equal(ch?.taken, false);
});

Then("the server emits {string} to the remaining users", function (this: KQWorld, event: string) {
  const evs = this.recorded(event);
  assert.ok(
    evs.some((p) => Array.isArray(p.recipients) && p.recipients.includes(this.user!.id)),
    `${event} was not emitted to the remaining users`,
  );
});
