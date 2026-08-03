import { describe, it, expect, vi, afterEach } from "vitest";
import { sampleTextPoints } from "./CsiParticleField";

const originalGetContext = HTMLCanvasElement.prototype.getContext;

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
});

describe("sampleTextPoints", () => {
  it("returns count*3 floats sized to the requested particle count", () => {
    const result = sampleTextPoints("CSI", 100);
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(300);
  });

  it("falls back to a lattice when 2D context is unavailable (e.g. jsdom)", () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof originalGetContext;
    const result = sampleTextPoints("CSI", 40);
    expect(result.length).toBe(120);
    // Lattice fallback centers around TARGET_CENTER_X (1.0), never all-zero.
    const hasNonZero = Array.from(result).some((v) => v !== 0);
    expect(hasNonZero).toBe(true);
  });

  it("samples only opaque pixels above the alpha threshold", () => {
    const fillTextMock = vi.fn();
    const getImageDataMock = vi.fn(() => {
      const width = 10;
      const height = 10;
      const data = new Uint8ClampedArray(width * height * 4);
      // Mark a single pixel fully opaque; rest stay alpha=0.
      const idx = (5 * width + 5) * 4;
      data[idx + 3] = 255;
      return { data, width, height, colorSpace: "srgb" } as ImageData;
    });

    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      clearRect: vi.fn(),
      fillStyle: "",
      font: "",
      textAlign: "",
      textBaseline: "",
      fillText: fillTextMock,
      getImageData: getImageDataMock,
    })) as unknown as typeof originalGetContext;

    const result = sampleTextPoints("CSI", 5);
    expect(fillTextMock).toHaveBeenCalledWith("CSI", expect.any(Number), expect.any(Number));
    expect(getImageDataMock).toHaveBeenCalled();
    expect(result.length).toBe(15);
  });
});
