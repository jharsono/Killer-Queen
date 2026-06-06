/**
 * React menu chrome (Decision A: React for menus only, never the game loop).
 *
 * Owns the lobby/join/countdown/game-over UI and the phase transitions, driven
 * by the server's socket events. The field itself is a plain <div id="field">
 * that the imperative renderer populates — React does not manage its children.
 */
import { useEffect, useRef, useState } from "react";
import { CONST } from "../shared/const.js";
import type { GameWin, MenuCharacter } from "../shared/types.js";
import { socket } from "./socket.js";
import { installInput } from "./input.js";
import { applyUpdate, buildField } from "./renderer.js";

type Phase = "join" | "lobby" | "playing" | "gameover";

/** Display delay before the game-over screen (legacy GAME_DISPLAY_WIN_DELAY). */
const WIN_DISPLAY_DELAY = 1500;

export function App() {
  const [phase, setPhase] = useState<Phase>("join");
  const [codeInput, setCodeInput] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [characters, setCharacters] = useState<MenuCharacter[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [win, setWin] = useState<GameWin | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket.on("joined", (d: { code: string; level: Parameters<typeof buildField>[1] }) => {
      setRoomCode(d.code);
      if (fieldRef.current) buildField(fieldRef.current, d.level);
      setPhase("lobby");
    });
    socket.on(CONST.MENU_UPDATE, (d: { state: { characters: MenuCharacter[] } }) => {
      setCharacters(d.state.characters);
    });
    socket.on(CONST.GAME_COUNTDOWN, (d: { time: number }) => setCountdown(d.time));
    socket.on(CONST.GAME_START, () => {
      setCountdown(null);
      setWin(null);
      setPhase("playing");
    });
    socket.on(CONST.VIRTUAL_UPDATE, applyUpdate);
    socket.on(CONST.GAME_WIN, (d: GameWin) => setWin(d));
    socket.on(CONST.GAME_RESET, () => {
      setSelected(null);
      setIsReady(false);
      setWin(null);
      setPhase("lobby");
    });
    socket.on(CONST.ALERT, (d: { text: string }) => window.alert(d.text));
    installInput();
    return () => {
      socket.off("joined");
      for (const ev of [
        CONST.MENU_UPDATE,
        CONST.GAME_COUNTDOWN,
        CONST.GAME_START,
        CONST.VIRTUAL_UPDATE,
        CONST.GAME_WIN,
        CONST.GAME_RESET,
        CONST.ALERT,
      ]) {
        socket.off(ev);
      }
    };
  }, []);

  // after a win, reveal the game-over screen following a short delay
  useEffect(() => {
    if (!win) return;
    const t = setTimeout(() => setPhase("gameover"), WIN_DISPLAY_DELAY);
    return () => clearTimeout(t);
  }, [win]);

  const join = (create: boolean) => {
    socket.emit("join_room", create ? {} : { code: codeInput.trim().toUpperCase() });
  };

  const pick = (c: MenuCharacter) => {
    if (c.taken) return;
    setSelected(c.toonId);
    setIsReady(false);
    socket.emit(CONST.USER_CHARACTER_SELECT, { toonId: c.toonId });
  };

  const ready = () => {
    setIsReady(true);
    socket.emit(CONST.USER_READY, { ready: true });
  };

  const team = (t: string) => characters.filter((c) => c.toonId.startsWith(t));
  const label = (toonId: string) => (toonId.includes("queen") ? "Q" : "W");

  return (
    <div id="game">
      <div id="field" ref={fieldRef} className="level-test" />

      {phase === "join" && (
        <div className="overlay join">
          <h1>Killer Queen</h1>
          <input
            placeholder="ROOM CODE"
            value={codeInput}
            maxLength={4}
            onChange={(e) => setCodeInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && codeInput.trim() && join(false)}
          />
          <div className="join-buttons">
            <button disabled={!codeInput.trim()} onClick={() => join(false)}>
              Join
            </button>
            <button onClick={() => join(true)}>Create new room</button>
          </div>
        </div>
      )}

      {phase === "lobby" && (
        <div className="overlay menu">
          <div className="room-code">Room {roomCode}</div>
          <div className="teams">
            {([CONST.TEAM_BLUE, CONST.TEAM_GOLD] as const).map((t) => (
              <div key={t} className={`team ${t === CONST.TEAM_BLUE ? "blue" : "gold"}`}>
                <ul>
                  {team(t).map((c) => (
                    <li
                      key={c.toonId}
                      className={`${c.taken ? "taken" : ""} ${selected === c.toonId ? "selected" : ""}`}
                      onClick={() => pick(c)}
                    >
                      {label(c.toonId)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <button id="player-ready" disabled={!selected || isReady} className={isReady ? "selected" : ""} onClick={ready}>
            Ready
          </button>
        </div>
      )}

      {countdown !== null && phase !== "playing" && <div id="countdown">{countdown}</div>}

      {phase === "gameover" && win && (
        <div id="game-over">
          <p id="win-text">
            {win.team === CONST.TEAM_BLUE ? "BLUE" : "GOLD"} WINS — {win.type.replace("win_", "")}
          </p>
        </div>
      )}
    </div>
  );
}
