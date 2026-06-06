/**
 * The selectable character roster for a match: one queen + four workers per
 * team (the 5-on-5 / 10-player Killer Queen lineup). toonIds follow the legacy
 * "<team>-<role>" convention (e.g. "teamBlue-queen", "teamGold-worker0") that
 * the level entity ids also use, so a claimed character maps to a level toon.
 */
import { CONST } from "./const.js";

export const TEAMS = [CONST.TEAM_BLUE, CONST.TEAM_GOLD] as const;

const ROLES = ["queen", "worker0", "worker1", "worker2", "worker3"] as const;

/** All claimable toonIds, blue then gold. */
export const ROSTER: string[] = TEAMS.flatMap((team) => ROLES.map((role) => `${team}-${role}`));
