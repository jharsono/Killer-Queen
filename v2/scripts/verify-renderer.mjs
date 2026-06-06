/**
 * Headless verification of the direct-DOM field renderer against the classic
 * level, using jsdom. Confirms buildField creates the right elements and
 * applyUpdate moves/styles them by id + CSS class — the Phase 3 rendering path
 * the cucumber engine suite does not cover.
 */
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><body><div id='field'></div></body>");
globalThis.document = dom.window.document;
globalThis.window = dom.window;

const { buildField, applyUpdate } = await import("../client/renderer.ts");
const { CLASSIC_LEVEL } = await import("../shared/levels/classic.ts");

let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? "✔" : "✖"} ${msg}`);
  if (!cond) failures++;
};

const field = document.getElementById("field");
buildField(field, CLASSIC_LEVEL);

check(field.children.length === CLASSIC_LEVEL.entities.length, "field has one element per level entity");

const queen = document.getElementById("teamBlue-queen");
check(!!queen && queen.classList.contains("queen") && queen.classList.contains("blue"), "blue queen element built with queen+blue classes");

const ground = document.getElementById("ground-0-0");
check(ground?.style.width === "800px" && ground?.style.height === "10px", "ground sized from level data");

// apply a movement + state update
applyUpdate([
  { id: "teamBlue-queen", left: 123, top: 45, direction: "direction-left", Invulnerable: true, attacking: false },
  { id: "teamBlue-worker0", left: 10, top: 20, "upgrade-warrior": true },
  { id: "shrine-speed-blue", affiliation: "teamGold" },
]);

check(queen.style.left === "123px" && queen.style.top === "45px", "queen moved to update position");
check(queen.classList.contains("direction-left"), "queen direction class applied");
check(queen.classList.contains("invulnerable"), "queen invulnerable class applied");
check(!queen.classList.contains("attacking"), "queen not marked attacking");

const worker = document.getElementById("teamBlue-worker0");
check(worker.classList.contains("warrior"), "worker upgrade-warrior → warrior class");

const shrine = document.getElementById("shrine-speed-blue");
check(shrine.classList.contains("gold") && !shrine.classList.contains("blue"), "shrine affiliation → gold class");

console.log(failures ? `\nRENDERER VERIFY FAILED (${failures})` : "\nRENDERER VERIFY PASSED");
process.exit(failures ? 1 : 0);
