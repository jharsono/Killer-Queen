/**
 * The classic Killer Queen arena — Decision C: level geometry as data.
 *
 * Ported verbatim from the legacy index.html level markup (positions) and
 * style.css (entity sizes), so the v2 physics — which were themselves ported
 * verbatim — play out on the exact same arena and match the old build's feel.
 * This single definition feeds BOTH the server simulation (GameSession.loadLevel)
 * AND the client field layout; cheerio/css are never reintroduced.
 *
 * (Two legacy markup ids collided — the row-10 grounds reused "ground-1-x". They
 * are renamed ground-10-x here so every id is unique, which the engine and the
 * DOM renderer both require. Ground ids carry no behavior.)
 */
import type { EntityKind, LevelData, LevelEntity } from "../types.js";

type Sized = Exclude<EntityKind, "ground" | "wall">;
const SIZE: Record<Sized, [number, number]> = {
  queen: [31, 37],
  worker: [20, 25],
  berry: [5, 5],
  goal: [13, 11],
  egg: [29, 45],
  snail: [55, 36],
  cage: [73, 47],
  "shrine-speed": [73, 53],
  "shrine-warrior": [73, 53],
};

const place = (kind: Sized, id: string, left: number, top: number): LevelEntity => ({
  kind,
  id,
  left,
  top,
  width: SIZE[kind][0],
  height: SIZE[kind][1],
});

const block = (kind: "ground" | "wall", id: string, left: number, top: number, width: number, height: number): LevelEntity => ({
  kind,
  id,
  left,
  top,
  width,
  height,
});

// pile of 6 berries at the standard cluster offsets, given a top-left anchor
const berryPile = (team: "blue" | "gold", base: number, x: number, y: number): LevelEntity[] =>
  [
    [0, 0],
    [-3, 5],
    [3, 5],
    [-6, 10],
    [0, 10],
    [6, 10],
  ].map(([dx, dy], i) => place("berry", `berry-${team}-${base + i}`, x + dx, y + dy));

const goalRow = (team: "blue" | "gold", coords: [number, number][]): LevelEntity[] =>
  coords.map(([left, top], i) => place("goal", `goal-${team}-${i}`, left, top));

const entities: LevelEntity[] = [
  // ---- toons ----
  place("queen", "teamBlue-queen", 90, 60),
  place("worker", "teamBlue-worker0", 303, 66),
  place("worker", "teamBlue-worker1", 343, 66),
  place("worker", "teamBlue-worker2", 236, 166),
  place("worker", "teamBlue-worker3", 21, 166),
  place("queen", "teamGold-queen", 692, 60),
  place("worker", "teamGold-worker0", 439, 66),
  place("worker", "teamGold-worker1", 479, 66),
  place("worker", "teamGold-worker2", 547, 166),
  place("worker", "teamGold-worker3", 763, 166),

  // ---- eggs ----
  place("egg", "egg0-blue", 51, 55),
  place("egg", "egg1-blue", 86, 55),
  place("egg", "egg2-blue", 121, 55),
  place("egg", "egg0-gold", 653, 55),
  place("egg", "egg1-gold", 688, 55),
  place("egg", "egg2-gold", 723, 55),

  // ---- snail + baskets ----
  place("snail", "snail", 372, 555),
  place("cage", "cage-blue", -7, 545),
  place("cage", "cage-gold", 737, 545),

  // ---- shrines (gates) ----
  place("shrine-speed", "shrine-speed-blue", 158, 0),
  place("shrine-warrior", "shrine-warrior-blue", 110, 540),
  place("shrine-speed", "shrine-speed-gold", 569, 0),
  place("shrine-warrior", "shrine-warrior-gold", 605, 540),

  // ---- goals ----
  ...goalRow("blue", [
    [299, 31],
    [299, 45],
    [313, 24],
    [313, 38],
    [313, 52],
    [327, 31],
    [327, 45],
    [341, 24],
    [341, 38],
    [341, 52],
    [355, 31],
    [355, 45],
  ]),
  ...goalRow("gold", [
    [435, 31],
    [435, 45],
    [449, 24],
    [449, 38],
    [449, 52],
    [463, 31],
    [463, 45],
    [477, 24],
    [477, 38],
    [477, 52],
    [491, 31],
    [491, 45],
  ]),

  // ---- berries (4 piles per team) ----
  ...berryPile("blue", 0, 153, 346),
  ...berryPile("blue", 10, 163, 467),
  ...berryPile("blue", 20, 93, 577),
  ...berryPile("blue", 30, 374, 517),
  ...berryPile("gold", 0, 645, 346),
  ...berryPile("gold", 10, 635, 467),
  ...berryPile("gold", 20, 705, 577),
  ...berryPile("gold", 30, 424, 517),

  // ---- walls ----
  block("wall", "wall-0", 0, 0, 10, 222),
  block("wall", "wall-0-1", 391, 0, 20, 152),
  block("wall", "wall-0-2", 790, 0, 10, 222),

  // ---- ground (row 0..11) ----
  block("ground", "ground-0-0", 0, 0, 800, 10),
  block("ground", "ground-1-0", 170, 50, 51, 10),
  block("ground", "ground-1-1", 581, 50, 51, 10),
  block("ground", "ground-2-0", 50, 101, 100, 10),
  block("ground", "ground-2-1", 242, 101, 320, 10),
  block("ground", "ground-2-2", 652, 101, 100, 10),
  block("ground", "ground-3-0", 10, 151, 10, 10),
  block("ground", "ground-3-1", 170, 151, 51, 10),
  block("ground", "ground-3-2", 581, 151, 51, 10),
  block("ground", "ground-3-3", 780, 151, 10, 10),
  block("ground", "ground-4-0", 10, 212, 40, 10),
  block("ground", "ground-4-1", 220, 201, 51, 10),
  block("ground", "ground-4-2", 531, 201, 51, 10),
  block("ground", "ground-4-3", 752, 212, 40, 10),
  block("ground", "ground-5-0", 110, 252, 60, 10),
  block("ground", "ground-5-1", 271, 262, 60, 10),
  block("ground", "ground-5-2", 471, 262, 60, 10),
  block("ground", "ground-5-3", 632, 252, 60, 10),
  block("ground", "ground-6-0", 0, 301, 70, 10),
  block("ground", "ground-6-1", 200, 312, 51, 10),
  block("ground", "ground-6-2", 401, 292, 30, 10),
  block("ground", "ground-6-3", 551, 312, 51, 10),
  block("ground", "ground-6-4", 732, 301, 70, 10),
  block("ground", "ground-7-0", 130, 362, 51, 10),
  block("ground", "ground-7-1", 371, 352, 30, 10),
  block("ground", "ground-7-2", 621, 362, 51, 10),
  block("ground", "ground-8-0", 70, 423, 51, 10),
  block("ground", "ground-8-1", 230, 423, 21, 10),
  block("ground", "ground-8-2", 401, 412, 30, 10),
  block("ground", "ground-8-3", 551, 423, 21, 10),
  block("ground", "ground-8-4", 681, 423, 51, 10),
  block("ground", "ground-9-0", 0, 473, 20, 10),
  block("ground", "ground-9-1", 130, 483, 61, 10),
  block("ground", "ground-9-2", 371, 473, 30, 10),
  block("ground", "ground-9-3", 611, 483, 61, 10),
  block("ground", "ground-9-4", 780, 473, 20, 10),
  block("ground", "ground-10-0", 0, 532, 50, 10),
  block("ground", "ground-10-1", 220, 532, 330, 10),
  block("ground", "ground-10-2", 752, 532, 50, 10),
  block("ground", "ground-11-0", 0, 590, 800, 10),
];

export const CLASSIC_LEVEL: LevelData = { width: 800, height: 600, entities };
