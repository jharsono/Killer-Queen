/**
 * Typed wire protocol shared by server and client.
 *
 * The legacy build had no types and duplicated the CONST string table across
 * game.js / site.js / app.js. Here both ends import from shared/ so the
 * protocol can never drift. Fleshed out further in Phase 2 (server/rooms).
 */
import { CONST } from "./const.js";

/** The two teams. */
export type Team = typeof CONST.TEAM_BLUE | typeof CONST.TEAM_GOLD;

/** Toon kind. */
export type ToonKind = typeof CONST.TOON_QUEEN | typeof CONST.TOON_WORKER;

/** Facing/direction CSS class applied to a rendered toon. */
export type Direction =
  | typeof CONST.DIRECTION_LEFT
  | typeof CONST.DIRECTION_RIGHT
  | typeof CONST.DIRECTION_DOWN;

/** The win conditions Game.win can resolve. */
export type WinType =
  | typeof CONST.WIN_ECONOMIC
  | typeof CONST.WIN_MILITARY
  | typeof CONST.WIN_SNAIL;

/**
 * The ONLY entity properties that are diffed and synced to clients.
 *
 * Ported verbatim from legacy `Updateable.propsToCheck`. The client matches
 * incoming updates by element `id` and toggles CSS classes / positions from
 * exactly these props. Adding a synced property means adding it here AND
 * teaching the client to render it.
 */
export const SYNCED_PROPS = [
  "left",
  "top",
  "direction",
  "Invulnerable",
  "attacking",
  "upgrade-warrior",
  "upgrade-speed",
  "affiliation", // for shrines
] as const;

export type SyncedProp = (typeof SYNCED_PROPS)[number];

/**
 * One entity's diff in a VIRTUAL_UPDATE batch: any subset of the synced props,
 * plus the element `id` which is always present for bridging to the DOM.
 */
export type VirtualEntityUpdate = Partial<Record<SyncedProp, string | number | boolean>> & {
  id: string;
};

/** A VIRTUAL_UPDATE payload is a batch of changed entities for one loop tick. */
export type VirtualUpdate = VirtualEntityUpdate[];

/** Held-keys payload sent by a client each time its input state changes. */
export type KeyUpdate = string[];

/** Per-character lobby state in a MENU_UPDATE. */
export interface MenuCharacter {
  toonId: string;
  taken: boolean;
}

/** MENU_UPDATE payload: which characters are available/taken in this room. */
export interface MenuUpdate {
  characters: MenuCharacter[];
}

/** GAME_WIN payload: win type, winning team, and a focus position for the camera. */
export interface GameWin {
  type: WinType;
  team: Team;
  focus: { left: number; top: number };
}

/**
 * The kinds of entity a level can contain. Legacy derived these from element
 * id/class substrings while parsing index.html; v2 makes the kind explicit
 * (Decision C: level geometry in JSON, fed to both server and client).
 */
export type EntityKind =
  | "ground"
  | "wall"
  | "queen"
  | "worker"
  | "berry"
  | "goal"
  | "snail"
  | "cage"
  | "shrine-speed"
  | "shrine-warrior"
  | "egg";

/** One placed entity in a level: kind + id + geometry. */
export interface LevelEntity {
  kind: EntityKind;
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A complete level definition (geometry source for server + client). */
export interface LevelData {
  width: number;
  height: number;
  entities: LevelEntity[];
}
