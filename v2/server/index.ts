/**
 * Game server entry (Phase 2 fills in the Socket.IO v4 transport + rooms).
 *
 * Phase 0: stands up an HTTP + Socket.IO v4 server on an env-configurable port
 * (the legacy build hardcoded 3000; the two must run side by side as oracle vs.
 * new build). Connection wiring to GameSession rooms lands in Phase 2.
 */
import { createServer } from "node:http";
import { Server } from "socket.io";
import { GameSession } from "./GameSession.js";

const PORT = Number(process.env.KQ_SERVER_PORT ?? 3100);

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: true },
});

/** Active rooms keyed by join code (Decision D: multiple games per server). */
const sessions = new Map<string, GameSession>();

io.on("connection", (socket) => {
  // TODO(phase 2): join-by-code lobby, character select, ready-up, key updates,
  // disconnect handling — all scoped to the user's GameSession / Socket.IO room.
  console.log(`socket connected: ${socket.id}`);
});

httpServer.listen(PORT, () => {
  console.log(`Killer Queen v2 server listening on :${PORT} (${sessions.size} rooms)`);
});
