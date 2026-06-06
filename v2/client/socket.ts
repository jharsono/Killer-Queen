/**
 * Client socket — connects to the game server through the Vite dev proxy
 * (/socket.io → KQ_SERVER_PORT). Same-origin, so io() needs no URL.
 */
import { io, type Socket } from "socket.io-client";

export const socket: Socket = io({ transports: ["websocket"] });
