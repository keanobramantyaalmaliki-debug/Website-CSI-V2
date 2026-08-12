import { describe, expect, it } from "vitest";
import { initPromoteState, promoteReflow } from "./promote-logic";

// Real Careers ids are the role titles.
const IDS = [
  "Innovation & Growth Manager",
  "Technical Lead",
  "Product Builder",
  "Full Stack Engineer",
];

describe("initPromoteState", () => {
  it("puts the featured id aside and keeps the rest in order", () => {
    expect(initPromoteState(IDS, "Innovation & Growth Manager")).toEqual({
      featured: "Innovation & Growth Manager",
      strip: ["Technical Lead", "Product Builder", "Full Stack Engineer"],
    });
  });
});

describe("promoteReflow", () => {
  it("promotes to hero and demotes the old hero to the END of the strip", () => {
    const start = initPromoteState(IDS, "Innovation & Growth Manager");
    expect(promoteReflow(start, "Technical Lead")).toEqual({
      featured: "Technical Lead",
      strip: [
        "Product Builder",
        "Full Stack Engineer",
        "Innovation & Growth Manager",
      ],
    });
  });

  it("slides siblings left when the demoted card appends to the end", () => {
    const state = {
      featured: "Technical Lead",
      strip: [
        "Product Builder",
        "Full Stack Engineer",
        "Innovation & Growth Manager",
      ],
    };
    expect(promoteReflow(state, "Full Stack Engineer")).toEqual({
      featured: "Full Stack Engineer",
      strip: [
        "Product Builder",
        "Innovation & Growth Manager",
        "Technical Lead",
      ],
    });
  });

  it("is a no-op when promoting the already-featured card", () => {
    const state = initPromoteState(IDS, "Innovation & Growth Manager");
    expect(promoteReflow(state, "Innovation & Growth Manager")).toBe(state);
  });

  it("is a no-op for an unknown id", () => {
    const state = initPromoteState(IDS, "Innovation & Growth Manager");
    expect(promoteReflow(state, "Nonexistent Role")).toBe(state);
  });

  it("keeps every id exactly once across a chain of promotes", () => {
    let state = initPromoteState(IDS, "Innovation & Growth Manager");
    for (const id of [
      "Technical Lead",
      "Full Stack Engineer",
      "Product Builder",
      "Innovation & Growth Manager",
    ]) {
      state = promoteReflow(state, id);
    }
    const all = [state.featured, ...state.strip].sort();
    expect(all).toEqual([...IDS].sort());
    expect(state.strip.length).toBe(3);
  });
});
