/**
 * Tuning + event constants for Killer Queen.
 *
 * Ported VERBATIM from the legacy game.js `CONST` table. Per the modernization
 * plan (principle 3: "Preserve game feel"), these numbers must NOT be "cleaned
 * up" — gravity 0.2 / cap 4, jump impulse, speeds 2/3/4, snail 0.1, the
 * durations and offsets are all load-bearing for game feel. Any change here is
 * a deliberate behavior decision, landed with its own feature scenario.
 *
 * GAME_START_DELAY is intentionally 0 (the legacy "// 3" was a debug value);
 * the instant-countdown quirk is documented in features/01_lobby_and_match_flow.
 */
export const CONST = {
  ALERT: "alert",
  KEY_UPDATE: "key_update",
  VIRTUAL_UPDATE: "virtual_update",
  USER_CHARACTER_SELECT: "USER_CHARACTER_SELECT",
  USER_READY: "user_ready",
  USER_DISCONNECT: "user_disconnect",
  TEAM_BLUE: "teamBlue",
  TEAM_GOLD: "teamGold",
  TOON_QUEEN: "queen",
  TOON_WORKER: "worker",
  GAME_OVER: "game_over",
  GAME_COUNTDOWN: "game_countdown",
  GAME_START: "game_start",
  GAME_WIN: "game_win",
  WIN_ECONOMIC: "win_economic",
  WIN_MILITARY: "win_military",
  WIN_SNAIL: "win_snail",
  DIRECTION_RIGHT: "direction-right",
  DIRECTION_LEFT: "direction-left",
  DIRECTION_DOWN: "direction-down",
  MENU_UPDATE: "menu_update",
  KEY_UP: "ArrowUp",
  KEY_DOWN: "ArrowDown",
  KEY_LEFT: "ArrowLeft",
  KEY_RIGHT: "ArrowRight",
  GAME_RESET: "game_reset",

  // server specific
  ATTACKED: "attacked",
  ATTACK_DURATION: 200,
  WORKER_SPEED: 2,
  WARRIOR_SPEED: 3,
  WARRIOR_SUPER_SPEED: 4,
  SNAIL_SPEED: 0.1,
  SNAIL_SWALLOW_DURATION: 3000,
  SNAIL_ATTACK: "snail_attack",
  GAME_START_DELAY: 0, // 3, // in seconds (todo: change to ms?) -jkr
  GAME_RESET_DELAY: 8000,
  GAME_NO_USERS_RESET_DELAY: 10 * 1000, // after last user leaves, reset game after this time -jkr
  TOON_RESET_DELAY: 3000,
  JUMP: "jump",
  ELE_BUMP: "ele_bump", // when two elemens bump into each other -jkr
  TOON_MASS: 10, // mass of a toon (do queens/warriors weigh more?) -jkr
  BERRY_MASS: 3, // mass of a berry -jkr
  BERRY_PICKUP: "berry_pickup",
  SHRINE_POWER_UP: "shrine_power_up",
  SHRINE_POWER_UP_DELAY: 2000,
  BERRY_TOON_OFFSET: {
    top: 16,
    left: 7,
  },
  ELEMENT_OFFSCREEN_OFFSET: {
    // element off stage graveyard -jkr
    top: -100,
    left: -100,
  },
  LOOP: "loop",
  L1K_DEBUG_LOOP: "l1k_debug_loop", // for 1000 loops -jkr
  MOVE_TASK_COMPLETE: "move_task_complete",
  GRAVITY_MAX: 4,
  GRAVITY_RATE: 0.2,
} as const;
