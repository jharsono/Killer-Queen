/**
 * Feature 01 — lobby and match flow. PENDING until Phase 2.
 *
 * The lobby/transport (character select, ready-up, countdown, rooms, win/reset,
 * disconnect) is Socket.IO-facing and lands in Phase 2 of the modernization
 * plan. These steps are intentionally `pending` so the suite reports feature 01
 * as not-yet-done (yellow) rather than undefined (noisy red). The engine
 * features (02–07) are green.
 */
import { Given, When, Then } from "@cucumber/cucumber";

Given("the server is running a single global game instance", () => "pending");
Given("each connected browser is one user with an empty key state", () => "pending");
Given("no match is in progress", () => "pending");
Given("a match is already in progress", () => "pending");
Given("a match has ended", () => "pending");
Given("the character {string} is not taken", (_c: unknown) => "pending");
Given("another user already holds {string}", (_c: unknown) => "pending");
Given("every connected user has selected a character", () => "pending");
Given("every connected user is ready", () => "pending");
Given("exactly one user is connected", () => "pending");
Given("two or more users are connected", () => "pending");

When("a user connects to the server", () => "pending");
When("the user selects {string}", (_c: unknown) => "pending");
When("the last user readies up", () => "pending");
When("a user readies up", () => "pending");
When("the countdown begins", () => "pending");
When("the server resolves a win condition", () => "pending");
When("{string} is dispatched", (_e: unknown) => "pending");
When("that user disconnects", () => "pending");
When("one user disconnects", () => "pending");

Then("the server emits a {string} to that user", (_e: unknown) => "pending");
Then("the menu shows which characters are already taken", () => "pending");
Then("the user's toonId becomes {string}", (_t: unknown) => "pending");
Then("the user's ready flag is reset to false", () => "pending");
Then("the server emits a {string} to all users without a character", (_e: unknown) => "pending");
Then("the server emits an {string} with text {string}", (_e: unknown, _t: unknown) => "pending");
Then("the user's toonId remains unchanged", () => "pending");
Then("the server dispatches {string}", (_e: unknown) => "pending");
Then("after the countdown the server dispatches {string}", (_e: unknown) => "pending");
Then("the emitted countdown time is {int}", (_n: unknown) => "pending");
Then("{string} is dispatched immediately", (_e: unknown) => "pending");
Then("the server emits {string} only to that user", (_e: unknown) => "pending");
Then("the countdown is not restarted for the other players", () => "pending");
Then("the server emits {string} with the win type, team, and focus element", (_e: unknown) => "pending");
Then("the server dispatches {string} after {int} ms", (_e: unknown, _n: unknown) => "pending");
Then("the server emits {string} to all users", (_e: unknown) => "pending");
Then("the game loop is stopped", () => "pending");
Then("every user's toonId is cleared", () => "pending");
Then("the server emits {string} to the remaining users", (_e: unknown) => "pending");
Then("that user's character is released", () => "pending");
