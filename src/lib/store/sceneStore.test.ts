import { describe, it, expect } from "vitest";
import {
  pathFor,
  roomFromPath,
  START_ROOM,
  VIEW_KEYS,
  DISABLED_ROOMS,
  type RoomKey,
} from "./sceneStore";

const NAVIGABLE = VIEW_KEYS.filter((k) => !DISABLED_ROOMS.has(k)) as RoomKey[];

describe("pathFor", () => {
  it("START_ROOM maps to '/'", () => {
    expect(pathFor(START_ROOM)).toBe("/");
  });

  it("Office maps to '/office'", () => {
    expect(pathFor("Office")).toBe("/office");
  });

  it("Meeting maps to '/meeting'", () => {
    expect(pathFor("Meeting")).toBe("/meeting");
  });

  it("Function maps to '/function'", () => {
    expect(pathFor("Function")).toBe("/function");
  });
});

describe("roomFromPath", () => {
  it("'/' resolves to Lounge (START_ROOM)", () => {
    expect(roomFromPath("/")).toBe("Lounge");
  });

  it("'/office' resolves to Office", () => {
    expect(roomFromPath("/office")).toBe("Office");
  });

  it("'/meeting' resolves to Meeting", () => {
    expect(roomFromPath("/meeting")).toBe("Meeting");
  });

  it("'/function' resolves to Function", () => {
    expect(roomFromPath("/function")).toBe("Function");
  });

  it("is case-insensitive", () => {
    expect(roomFromPath("/OFFICE")).toBe("Office");
    expect(roomFromPath("/Meeting")).toBe("Meeting");
  });

  it("'/pantry' returns null (disabled room)", () => {
    expect(roomFromPath("/pantry")).toBeNull();
  });

  it("unknown path returns null", () => {
    expect(roomFromPath("/tidakada")).toBeNull();
    expect(roomFromPath("/unknown/deep")).toBeNull();
  });
});

describe("round-trip", () => {
  it("roomFromPath(pathFor(room)) === room for every navigable room", () => {
    for (const room of NAVIGABLE) {
      expect(roomFromPath(pathFor(room))).toBe(room);
    }
  });
});
