import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerLenis, scrollToTop, scrollToSection } from "./smoothScroll";

describe("smoothScroll", () => {
  beforeEach(() => {
    registerLenis(null);
    window.scrollTo = vi.fn();
  });

  describe("tanpa instance terdaftar (native fallback)", () => {
    it("scrollToTop() memakai window.scrollTo(0, 0)", () => {
      scrollToTop();
      expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    });

    it("scrollToSection() memakai scrollIntoView elemen target", () => {
      const el = document.createElement("div");
      el.id = "contact";
      el.scrollIntoView = vi.fn();
      document.body.appendChild(el);

      scrollToSection("contact");
      expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });

      document.body.removeChild(el);
    });

    it("scrollToSection() aman kalau elemen tidak ada", () => {
      expect(() => scrollToSection("tidak-ada")).not.toThrow();
    });
  });

  describe("dengan instance Lenis terdaftar", () => {
    it("scrollToTop() diteruskan ke lenis.scrollTo(0, { immediate: true })", () => {
      const scrollTo = vi.fn();
      registerLenis({ scrollTo } as never);

      scrollToTop();
      expect(scrollTo).toHaveBeenCalledWith(0, { immediate: true });
      expect(window.scrollTo).not.toHaveBeenCalled();
    });

    it("scrollToSection() diteruskan ke lenis.scrollTo('#id')", () => {
      const scrollTo = vi.fn();
      registerLenis({ scrollTo } as never);

      scrollToSection("contact");
      expect(scrollTo).toHaveBeenCalledWith("#contact");
    });
  });
});
