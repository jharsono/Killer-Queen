import { defineConfig } from "vite";

// The legacy build hardcodes port 3000. v2 keeps both ports env-configurable so
// the old build (the behavior oracle) and the new build can run side by side
// for feel comparison. See docs/MODERNIZATION_PLAN.md "Repo layout & cutover".
const CLIENT_PORT = Number(process.env.KQ_CLIENT_PORT ?? 5200);
const SERVER_PORT = Number(process.env.KQ_SERVER_PORT ?? 3100);

export default defineConfig({
  root: "client",
  publicDir: "../assets",
  server: {
    port: CLIENT_PORT,
    proxy: {
      // Socket.IO transport is served by the game server.
      "/socket.io": {
        target: `http://localhost:${SERVER_PORT}`,
        ws: true,
      },
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
