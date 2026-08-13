import { describe, it, expect, vi } from "vitest";
import { render, act } from "@testing-library/react";
import IndustriesMobile from "./IndustriesMobile";
import { INDUSTRIES } from "@/data/industries";

// jsdom lacks IntersectionObserver; motion's whileInView/useInView need it.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

// jsdom doesn't implement Element.scrollTo at all (only a "not implemented"
// stub on Window) — the auto-advance carousel calls it directly.
Element.prototype.scrollTo = vi.fn();

// This file exists solely to test prefers-reduced-motion in isolation.
// framer-motion's useReducedMotion() lazily caches its result in a
// module-level singleton the first time it's called, so it must be the
// first render in a fresh module registry — sharing this file with
// Industries.test.tsx's other renders would poison the cached value.
function mockReducedMotion(matches: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes("prefers-reduced-motion") ? matches : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

describe("IndustriesMobile", () => {
  it("respects prefers-reduced-motion: auto-advance never starts", () => {
    mockReducedMotion(true);
    const scrollToSpy = Element.prototype.scrollTo as ReturnType<typeof vi.fn>;
    scrollToSpy.mockClear();
    vi.useFakeTimers();
    render(<IndustriesMobile industries={INDUSTRIES} />);

    act(() => {
      vi.advanceTimersByTime(4500 * 3);
    });

    expect(scrollToSpy).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
