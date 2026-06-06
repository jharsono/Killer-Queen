/**
 * Keyboard input → KEY_UPDATE. Ported from the legacy site.js: maintain the set
 * of held keys and emit the whole set on every change (the server replaces the
 * user's held-keys array). Arrow keys only; the server consumes ArrowUp per tick.
 */
import { CONST } from "../shared/const.js";
import { socket } from "./socket.js";

const ARROWS = new Set<string>([CONST.KEY_UP, CONST.KEY_DOWN, CONST.KEY_LEFT, CONST.KEY_RIGHT]);
const held: string[] = [];

function press(key: string): void {
  if (!ARROWS.has(key) || held.includes(key)) return;
  held.push(key);
  socket.emit(CONST.KEY_UPDATE, held);
}

function release(key: string): void {
  const i = held.indexOf(key);
  if (i < 0) return;
  held.splice(i, 1);
  socket.emit(CONST.KEY_UPDATE, held);
}

export function installInput(): void {
  window.addEventListener("keydown", (e) => {
    if (ARROWS.has(e.key)) e.preventDefault();
    press(e.key);
  });
  window.addEventListener("keyup", (e) => release(e.key));
}
