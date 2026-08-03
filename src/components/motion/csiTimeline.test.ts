import { describe, it, expect } from "vitest";
import { buildTimeline, sampleTimeline } from "./CsiParticleField";

const scatter = new Float32Array([0, 0, 0]);
const letterA = new Float32Array([1, 1, 1]);
const letterB = new Float32Array([2, 2, 2]);

describe("buildTimeline", () => {
  it("builds converge/hold/disperse segments per letter target", () => {
    const timeline = buildTimeline(scatter, [letterA, letterB]);
    expect(timeline).toHaveLength(6);
    expect(timeline[0]).toMatchObject({ from: scatter, to: letterA, hold: false });
    expect(timeline[1]).toMatchObject({ from: letterA, to: letterA, hold: true });
    expect(timeline[2]).toMatchObject({ from: letterA, to: scatter, hold: false });
    expect(timeline[3]).toMatchObject({ from: scatter, to: letterB, hold: false });
  });
});

describe("sampleTimeline", () => {
  it("returns eased 0 at the very start of a converge segment", () => {
    const timeline = buildTimeline(scatter, [letterA]);
    const result = sampleTimeline(timeline, 0);
    expect(result.from).toBe(scatter);
    expect(result.to).toBe(letterA);
    expect(result.eased).toBe(0);
  });

  it("returns eased 1 once fully converged, holding at the target", () => {
    const timeline = buildTimeline(scatter, [letterA]);
    const convergeDuration = timeline[0].duration;
    const result = sampleTimeline(timeline, convergeDuration + 1);
    expect(result.to).toBe(letterA);
    expect(result.eased).toBe(1);
  });

  it("wraps elapsed time modulo total duration so the sequence loops", () => {
    const timeline = buildTimeline(scatter, [letterA]);
    const total = timeline.reduce((sum, s) => sum + s.duration, 0);
    const atStart = sampleTimeline(timeline, 0);
    const afterOneLoop = sampleTimeline(timeline, total);
    expect(afterOneLoop.to).toEqual(atStart.to);
    expect(afterOneLoop.eased).toEqual(atStart.eased);
  });

  it("advances to the next letter's converge segment after the first disperses", () => {
    const timeline = buildTimeline(scatter, [letterA, letterB]);
    const throughLetterA = timeline[0].duration + timeline[1].duration + timeline[2].duration;
    const result = sampleTimeline(timeline, throughLetterA + 1);
    expect(result.to).toBe(letterB);
  });
});
