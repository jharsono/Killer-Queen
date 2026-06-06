/**
 * End-to-end smoke test for the Socket.IO v4 transport + rooms.
 * Boots against a running server (KQ_SERVER_PORT). Verifies: join → menu_update,
 * character select, ready → game_start + virtual_update, and room isolation.
 */
import { io } from "socket.io-client";

const URL = `http://localhost:${process.env.KQ_SERVER_PORT ?? 3199}`;
const connect = () => io(URL, { transports: ["websocket"], forceNew: true });
const wait = (sock, ev, ms = 1500) =>
  new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error(`timeout waiting for ${ev}`)), ms);
    sock.once(ev, (d) => {
      clearTimeout(t);
      res(d);
    });
  });

let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? "✔" : "✖"} ${msg}`);
  if (!cond) failures++;
};

const a = connect();
const b = connect();
const other = connect();

try {
  // two players join the same room (attach waiters before emitting to avoid races)
  const joinedA = wait(a, "joined");
  const menuAP = wait(a, "menu_update");
  a.emit("join_room", { code: "TEST" });
  await joinedA;
  const menuA = await menuAP;
  check(Array.isArray(menuA.state.characters), "player A receives menu_update on join");

  const joinedB = wait(b, "joined");
  b.emit("join_room", { code: "TEST" });
  await joinedB;

  // a third player joins a DIFFERENT room — must not hear TEST's events
  const joinedOther = wait(other, "joined");
  other.emit("join_room", { code: "OTHER" });
  await joinedOther;
  let leaked = false;
  other.on("game_start", () => (leaked = true));
  other.on("virtual_update", () => (leaked = true));

  // both players in TEST pick characters and ready up
  a.emit("USER_CHARACTER_SELECT", { toonId: "teamBlue-queen" });
  b.emit("USER_CHARACTER_SELECT", { toonId: "teamGold-queen" });
  await new Promise((r) => setTimeout(r, 100));

  const startA = wait(a, "game_start", 2000);
  a.emit("user_ready", { ready: true });
  b.emit("user_ready", { ready: true });
  await startA;
  check(true, "match starts (game_start) once both players ready");

  const vu = await wait(a, "virtual_update", 2000);
  check(Array.isArray(vu) && vu.length > 0, "the running match broadcasts non-empty virtual_update batches");
  check(
    vu.some((o) => o.id === "teamBlue-queen"),
    "the classic level loaded server-side (toons present in updates)",
  );

  await new Promise((r) => setTimeout(r, 200));
  check(!leaked, "the OTHER room received no game_start / virtual_update (isolation)");
} catch (e) {
  console.log(`✖ ${e.message}`);
  failures++;
} finally {
  a.close();
  b.close();
  other.close();
}

console.log(failures ? `\nSMOKE FAILED (${failures})` : "\nSMOKE PASSED");
process.exit(failures ? 1 : 0);
