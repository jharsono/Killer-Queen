/**
 * Direct-DOM field renderer (Decision A: no React in the game loop).
 *
 * Builds the field's DOM once from the level data, then applies each
 * VIRTUAL_UPDATE batch by element id + CSS class toggles — the proven approach
 * ported from the legacy site.js. Positions/classes are the only thing that
 * changes at 60fps; React never touches the field.
 */
import { CONST } from "../shared/const.js";
import type { EntityKind, LevelData, VirtualUpdate } from "../shared/types.js";

function teamClass(id: string): string {
  const m = id.toLowerCase().match(/blue|gold/);
  return m ? m[0] : "";
}

/** CSS classes for a freshly created entity element of `kind`. */
function classesFor(kind: EntityKind, id: string): string {
  const team = teamClass(id);
  switch (kind) {
    case "queen":
      return `queen toon ${team}`;
    case "worker":
      return `worker toon ${team}`;
    case "shrine-speed":
      return `shrine shrine-speed ${team}`;
    case "shrine-warrior":
      return `shrine shrine-warrior ${team}`;
    case "cage":
      return `cage ${team}`;
    case "berry":
      return "berry";
    case "goal":
      return "goal";
    case "egg":
      return "egg";
    case "snail":
      return "snail";
    case "ground":
    case "wall":
      return "ground";
  }
}

/** (Re)build the field DOM from a level definition. */
export function buildField(container: HTMLElement, level: LevelData): void {
  container.innerHTML = "";
  container.style.width = `${level.width}px`;
  container.style.height = `${level.height}px`;
  for (const e of level.entities) {
    const el = document.createElement("div");
    el.id = e.id;
    el.className = classesFor(e.kind, e.id);
    el.style.left = `${e.left}px`;
    el.style.top = `${e.top}px`;
    if (e.kind === "ground" || e.kind === "wall") {
      el.style.width = `${e.width}px`;
      el.style.height = `${e.height}px`;
    }
    container.appendChild(el);
  }
}

/** Apply one VIRTUAL_UPDATE batch to the field. */
export function applyUpdate(updates: VirtualUpdate): void {
  for (const o of updates) {
    const el = document.getElementById(o.id);
    if (!el) continue;

    if (typeof o.left === "number") el.style.left = `${o.left}px`;
    if (typeof o.top === "number") el.style.top = `${o.top}px`;

    el.classList.remove("direction-left", "direction-right", "direction-down");
    if (typeof o.direction === "string") el.classList.add(o.direction);

    el.classList.toggle("warrior", o["upgrade-warrior"] === true);
    el.classList.toggle("speed-upgrade", o["upgrade-speed"] === true);
    el.classList.toggle("invulnerable", o.Invulnerable === true);
    el.classList.toggle("attacking", Boolean(o.attacking));

    if (o.affiliation !== undefined) {
      el.classList.toggle("blue", o.affiliation === CONST.TEAM_BLUE);
      el.classList.toggle("gold", o.affiliation === CONST.TEAM_GOLD);
    }
  }
}
