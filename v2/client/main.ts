/**
 * Client entry (Phase 3 fills this in).
 *
 * Phase 3 ports the proven direct-DOM field renderer from the legacy site.js
 * (apply VIRTUAL_UPDATE batches by element id + CSS class toggles) and adds
 * React for menu chrome only (lobby / character-select / countdown / game-over).
 * The socket connection routes through the Vite dev proxy to the game server.
 */
import { CONST } from "../shared/const.js";

console.log(`Killer Queen v2 client scaffold — protocol event: ${CONST.VIRTUAL_UPDATE}`);
