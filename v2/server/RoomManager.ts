/**
 * RoomManager — join-by-code lobbies (Decision D).
 *
 * Owns the set of live GameSessions, one per room code. This is what makes
 * "multiple games per server" work: each room is a fully independent
 * GameSession with its own users, level, clock, and event bus. There is no
 * shared/global state between rooms.
 */
import type { LevelData } from "../shared/types.js";
import { GameSession } from "./GameSession.js";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no easily-confused chars
const CODE_LENGTH = 4;

export class RoomManager {
  private readonly rooms = new Map<string, GameSession>();

  /** Level loaded into each new room (omit in tests that want empty rooms). */
  constructor(private readonly level?: LevelData) {}

  get size(): number {
    return this.rooms.size;
  }

  has(code: string): boolean {
    return this.rooms.has(code);
  }

  get(code: string): GameSession | undefined {
    return this.rooms.get(code);
  }

  /** Get the room for `code`, creating it if it does not exist yet. */
  getOrCreate(code: string): GameSession {
    let room = this.rooms.get(code);
    if (!room) {
      room = new GameSession(code);
      if (this.level) room.loadLevel(this.level);
      this.rooms.set(code, room);
    }
    return room;
  }

  /** Create a brand-new room under a fresh, unused join code. */
  createWithCode(): GameSession {
    let code = this.randomCode();
    while (this.rooms.has(code)) code = this.randomCode();
    return this.getOrCreate(code);
  }

  delete(code: string): void {
    this.rooms.delete(code);
  }

  private randomCode(): string {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return code;
  }
}
