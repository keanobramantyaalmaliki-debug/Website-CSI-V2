import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

let mockReduced = false;
const lenisInstances: Array<{
  destroy: ReturnType<typeof vi.fn>;
  raf: ReturnType<typeof vi.fn>;
}> = [];
const LenisCtor = vi.fn(function LenisMock(this: unknown, options: Record<string, unknown>) {
  Object.assign(this as object, { options, destroy: vi.fn(), raf: vi.fn() });
  lenisInstances.push(this as (typeof lenisInstances)[number]);
});

vi.mock("lenis", () => ({ default: LenisCtor }));

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => mockReduced };
});

const registerSpy = vi.fn();
vi.mock("@/lib/smoothScroll", () => ({ registerLenis: registerSpy }));

const { default: useSmoothScroll } = await import("./useSmoothScroll");

function Harness() {
  useSmoothScroll();
  return null;
}

beforeEach(() => {
  mockReduced = false;
  lenisInstances.length = 0;
  LenisCtor.mockClear();
  registerSpy.mockClear();
});


describe("useSmoothScroll", () => {
  it("reduced-motion: Lenis tidak pernah di-instantiate", () => {
    mockReduced = true;
    render(<Harness />);
    expect(LenisCtor).not.toHaveBeenCalled();
  });

  it("jalur normal: Lenis dibuat dengan opsi momentum yang benar", () => {
    render(<Harness />);
    expect(LenisCtor).toHaveBeenCalledTimes(1);
    expect(LenisCtor.mock.calls[0][0]).toMatchObject({
      lerp: 0.09,
      smoothWheel: true,
      syncTouch: false,
      autoRaf: false,
    });
  });

  it("unmount: destroy() dipanggil dan instance di-unregister", () => {
    const { unmount } = render(<Harness />);
    const instance = lenisInstances[0];
    unmount();
    expect(instance.destroy).toHaveBeenCalledTimes(1);
    expect(registerSpy).toHaveBeenLastCalledWith(null);
  });
});
