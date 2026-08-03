import { describe, it, expect } from "vitest";
import { TEAM_MEMBERS, VALUES } from "./people";
import type { TeamMember } from "./people";

const VALID_CATEGORIES: TeamMember["category"][] = [
  "Management",
  "Design",
  "Engineering",
];
const VALID_PLATFORMS = ["linkedin", "github", "x"];

describe("TEAM_MEMBERS", () => {
  it("is non-empty", () => {
    expect(TEAM_MEMBERS.length).toBeGreaterThan(0);
  });

  it("every entry has non-empty name, role, and category", () => {
    for (const m of TEAM_MEMBERS) {
      expect(m.name.trim()).not.toBe("");
      expect(m.role.trim()).not.toBe("");
      expect(VALID_CATEGORIES).toContain(m.category);
    }
  });

  it("social platforms are valid when present", () => {
    for (const m of TEAM_MEMBERS) {
      if (!m.social) continue;
      for (const s of m.social) {
        expect(VALID_PLATFORMS).toContain(s.platform);
        expect(s.url.trim()).not.toBe("");
      }
    }
  });

  it("has at least one member per category", () => {
    for (const cat of VALID_CATEGORIES) {
      const count = TEAM_MEMBERS.filter((m) => m.category === cat).length;
      expect(count).toBeGreaterThan(0);
    }
  });

  it("no duplicate names", () => {
    const names = TEAM_MEMBERS.map((m) => m.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});

describe("VALUES", () => {
  it("has exactly 3 entries", () => {
    expect(VALUES).toHaveLength(3);
  });

  it("every entry has non-empty title, tagline, and description", () => {
    for (const v of VALUES) {
      expect(v.title.trim()).not.toBe("");
      expect(v.tagline.trim()).not.toBe("");
      expect(v.description.trim()).not.toBe("");
    }
  });

  it("no duplicate titles", () => {
    const titles = VALUES.map((v) => v.title);
    const unique = new Set(titles);
    expect(unique.size).toBe(titles.length);
  });
});
