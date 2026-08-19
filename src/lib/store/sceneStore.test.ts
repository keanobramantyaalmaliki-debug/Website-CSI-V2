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

  // Office ↔ Function tukar konten 19 Agu: crew (People) pindah ke scene
  // Office, bedah layanan (Services) ke Function — lihat roomContent.tsx.
  it("Office maps to '/people' (slug konten, bukan nama ruangan)", () => {
    expect(pathFor("Office")).toBe("/people");
  });

  it("Meeting maps to '/work'", () => {
    expect(pathFor("Meeting")).toBe("/work");
  });

  it("Function maps to '/services'", () => {
    expect(pathFor("Function")).toBe("/services");
  });
});

describe("roomFromPath", () => {
  it("'/' resolves to Lounge (START_ROOM)", () => {
    expect(roomFromPath("/")).toBe("Lounge");
  });

  it("'/services' resolves to Function", () => {
    expect(roomFromPath("/services")).toBe("Function");
  });

  it("'/work' resolves to Meeting", () => {
    expect(roomFromPath("/work")).toBe("Meeting");
  });

  it("'/people' resolves to Office", () => {
    expect(roomFromPath("/people")).toBe("Office");
  });

  // Slug lama = nama ruangan. Tautan yang dibagikan sebelum slug konten
  // (19 Agu) harus tetap mendarat di ruangan yang benar; normalisasi URL-nya
  // urusan RoomRouteSync Arah 2, bukan fungsi ini.
  it("slug lama (nama ruangan) tetap dikenali", () => {
    expect(roomFromPath("/office")).toBe("Office");
    expect(roomFromPath("/meeting")).toBe("Meeting");
    expect(roomFromPath("/function")).toBe("Function");
    expect(roomFromPath("/lounge")).toBe("Lounge");
  });

  it("is case-insensitive", () => {
    expect(roomFromPath("/SERVICES")).toBe("Function");
    expect(roomFromPath("/Work")).toBe("Meeting");
    expect(roomFromPath("/OFFICE")).toBe("Office");
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
