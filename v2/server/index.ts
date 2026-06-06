/**
 * Game server entry — Socket.IO v4 transport with join-by-code rooms (Phase 2).
 *
 * Each Socket.IO room maps to one independent GameSession (RoomManager). The
 * session emits recipient-targeted lobby events and per-tick VIRTUAL_UPDATE
 * batches; this layer is the thin bridge that routes them to the right sockets
 * and relays client input back into the session. No game logic lives here.
 *
 * (The field client + JSON levels are Phase 3; until a level is loaded a started
 * match simply broadcasts empty update batches.)
 */
import { createServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { CONST } from "../shared/const.js";
import { CLASSIC_LEVEL } from "../shared/levels/classic.js";
import type { Recipients } from "./GameSession.js";
import { GameSession } from "./GameSession.js";
import { RoomManager } from "./RoomManager.js";

const PORT = Number(process.env.KQ_SERVER_PORT ?? 3100);
const LOOP_MS = 1000 / 60;

const httpServer = createServer();
const io = new Server(httpServer, { cors: { origin: true } });

const rooms = new RoomManager(CLASSIC_LEVEL);
const wired = new Set<string>();
const loops = new Map<string, ReturnType<typeof setInterval>>();

interface Targeted {
  recipients?: Recipients;
  [k: string]: unknown;
}

/** Wire a room's session events to its sockets + drive its loop. Idempotent. */
function wireRoom(session: GameSession): void {
  if (wired.has(session.id)) return;
  wired.add(session.id);
  const code = session.id;

  const route = (event: string, payload: Targeted) => {
    if (payload.recipients === "all" || payload.recipients === undefined) {
      io.to(code).emit(event, payload);
    } else {
      for (const id of payload.recipients) io.to(id).emit(event, payload);
    }
  };

  for (const ev of [CONST.MENU_UPDATE, CONST.ALERT, CONST.GAME_COUNTDOWN]) {
    session.events.on(ev, (p: Targeted) => route(ev, p));
  }

  session.events.on(CONST.GAME_START, (p: Targeted) => {
    route(CONST.GAME_START, p);
    if (p.recipients === "all" && !loops.has(code)) startLoop(code, session);
  });

  session.events.on(CONST.GAME_WIN, (p: Targeted) => io.to(code).emit(CONST.GAME_WIN, p));

  session.events.on(CONST.GAME_RESET, (p: Targeted) => {
    io.to(code).emit(CONST.GAME_RESET, p);
    stopLoop(code);
  });
}

function startLoop(code: string, session: GameSession): void {
  const handle = setInterval(() => {
    session.tick();
    io.to(code).emit(CONST.VIRTUAL_UPDATE, session.collectUpdates());
  }, LOOP_MS);
  loops.set(code, handle);
}

function stopLoop(code: string): void {
  const handle = loops.get(code);
  if (handle) clearInterval(handle);
  loops.delete(code);
}

io.on("connection", (socket: Socket) => {
  let session: GameSession | null = null;
  const userId = socket.id; // each socket auto-joins a room named its own id

  socket.on("join_room", (data: { code?: string }) => {
    session = data?.code ? rooms.getOrCreate(data.code) : rooms.createWithCode();
    wireRoom(session);
    socket.join(session.id);
    session.addUser({ id: userId, keys: [], toonId: null, ready: false });
    // send the room code + the level so the client can lay out the field
    socket.emit("joined", { code: session.id, level: CLASSIC_LEVEL });
  });

  socket.on(CONST.USER_CHARACTER_SELECT, (data: { toonId: string }) => {
    session?.selectCharacter(userId, data.toonId);
  });

  socket.on(CONST.USER_READY, (data: { ready: boolean }) => {
    session?.setReady(userId, !!data.ready);
  });

  socket.on(CONST.KEY_UPDATE, (keys: string[]) => {
    session?.updateKeys(userId, Array.isArray(keys) ? keys : []);
  });

  socket.on("disconnect", () => {
    session?.removeUser(userId);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Killer Queen v2 server listening on :${PORT}`);
});
