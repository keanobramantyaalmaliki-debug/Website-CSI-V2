import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { render, screen, act } from "@testing-library/react";
import TheCrewMobileCarousel, {
  resolvePeekIndexes,
  resolveSwipeDirection,
  resolveSwipeStep,
} from "./TheCrewMobileCarousel";
import { TEAM_MEMBERS } from "@/data/people";

// jsdom lacks IntersectionObserver; motion's whileInView needs it.
class IntersectionObserverStub {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

let mockReduced = false;
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => mockReduced };
});

// Tidak ada lagi indikator titik (dihapus atas permintaan Keano, 28 Agu),
// jadi "siapa yang aktif" dibaca dari kartu yang bisa digeser itu sendiri —
// kartu peek di belakangnya juga memuat nama, jadi memeriksa teks seluruh
// carousel tidak membedakan apa pun.
function activeName(): string {
  const card = screen
    .getByTestId("crew-mobile-carousel")
    .querySelector("article.cursor-grab");
  return card?.textContent ?? "";
}

describe("TheCrewMobileCarousel", () => {
  beforeEach(() => {
    mockReduced = false;
  });

  it("shows the first person on mount", () => {
    render(<TheCrewMobileCarousel people={TEAM_MEMBERS} />);
    expect(activeName()).toContain(TEAM_MEMBERS[0].name);
    expect(activeName()).not.toContain(TEAM_MEMBERS[1].name);
  });

  it("renders no dot indicators", () => {
    render(<TheCrewMobileCarousel people={TEAM_MEMBERS} />);
    expect(
      screen.queryByRole("button", { name: `Show ${TEAM_MEMBERS[0].name}` }),
    ).toBeNull();
    expect(
      screen.getByTestId("crew-mobile-carousel").querySelectorAll("button"),
    ).toHaveLength(0);
  });

  // motion's animate() caches its requestAnimationFrame binding against the
  // first vi.useFakeTimers() session it runs under in a file, and does not
  // rebind on a later useFakeTimers()/useRealTimers() toggle — so any test
  // in this block that needs the fly-out throw animation to actually
  // progress must share one continuous fake-timer session, not toggle
  // per-test. Grouped here for that reason.
  describe("autoplay", () => {
    beforeAll(() => {
      vi.useFakeTimers();
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    it("auto-advances to the next person 30s after going idle, unless reduced motion is on", async () => {
      render(<TheCrewMobileCarousel people={TEAM_MEMBERS} />);
      // Timer fire (30s) + the fly-out throw animation (250ms) both need to
      // elapse before the index actually advances.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30300);
      });

      expect(activeName()).toContain(TEAM_MEMBERS[1].name);
    });

    it("does not auto-advance when reduced motion is enabled", async () => {
      mockReduced = true;
      render(<TheCrewMobileCarousel people={TEAM_MEMBERS} />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60000);
      });

      expect(activeName()).toContain(TEAM_MEMBERS[0].name);
    });

    it("plays the same right fly-out throw as a manual advance swipe when idle autoplay fires", async () => {
      render(<TheCrewMobileCarousel people={TEAM_MEMBERS} />);
      const carousel = screen.getByTestId("crew-mobile-carousel");
      // FadeUpItem wraps the draggable motion.article in an outer <article>,
      // so plain "article" matches the wrong (unstyled) node — the draggable
      // one is uniquely identified by its cursor-grab class.
      const activeCard = carousel.querySelector(
        "article.cursor-grab",
      ) as HTMLElement;

      // Right after the 30s tick, the throw animation (250ms) is mid-flight —
      // the card should already be translated right (advance = swipe right,
      // revealing the peek underneath), not yet swapped. Fake timers only
      // flush the RAF-driven animation loop reliably across several smaller
      // advances, not one large jump — so step up to the interval fire, then
      // nudge forward into the animation.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      expect(activeCard.style.transform).toMatch(/translateX\(\d/);
      expect(carousel).toHaveTextContent(TEAM_MEMBERS[0].name);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(250);
      });
      expect(activeName()).toContain(TEAM_MEMBERS[1].name);
    });

    it("autoplay wraps from the last person back to the first (loop, no dead-end)", async () => {
      // Dua orang saja: satu siklus autoplay sampai di orang terakhir, siklus
      // berikutnya harus membungkus balik ke orang pertama. (Dulu lompat ke
      // ujung daftar lewat klik titik; titiknya sudah tidak ada.)
      const pair = TEAM_MEMBERS.slice(0, 2);
      render(<TheCrewMobileCarousel people={pair} />);

      // See the comment above the fly-out-throw test: fake timers need the
      // total advance split into several smaller steps to reliably flush the
      // RAF-driven animation, not one large jump.
      const advanceOnce = async () => {
        for (const step of [30000, 50, 50, 50, 50, 50, 50]) {
          await act(async () => {
            await vi.advanceTimersByTimeAsync(step);
          });
        }
      };

      await advanceOnce();
      expect(activeName()).toContain(pair[1].name);

      await advanceOnce();
      expect(activeName()).toContain(pair[0].name);
    });
  });

  it("resets to the first person when the people list changes (e.g. filter switch)", () => {
    const managementOnly = TEAM_MEMBERS.filter((m) => m.category === "Management");
    const { rerender } = render(<TheCrewMobileCarousel people={TEAM_MEMBERS} />);

    expect(activeName()).toContain(TEAM_MEMBERS[0].name);

    rerender(<TheCrewMobileCarousel people={managementOnly} />);

    expect(activeName()).toContain(managementOnly[0].name);
  });

  // jsdom has no real layout/pointer capture, so a physical drag gesture
  // can't be simulated end-to-end. resolveSwipeDirection is the pure
  // decision function ActiveCard's onDragEnd calls with framer-motion's
  // PanInfo — testing it directly covers the swipe-vs-cancel threshold
  // logic without needing real pointer events.
  describe("resolveSwipeDirection", () => {
    it("returns 'left' when dragged past the distance threshold to the left", () => {
      expect(resolveSwipeDirection(-150, 0)).toBe("left");
    });

    it("returns 'right' when dragged past the distance threshold to the right", () => {
      expect(resolveSwipeDirection(150, 0)).toBe("right");
    });

    it("returns 'left' when flicked fast to the left even under the distance threshold", () => {
      expect(resolveSwipeDirection(-20, -600)).toBe("left");
    });

    it("returns null when under both the distance and velocity thresholds", () => {
      expect(resolveSwipeDirection(30, 100)).toBeNull();
    });
  });

  // Direction convention (Keano, 27 Agu): swipe right advances to the card
  // peeking under the deck, swipe left goes back to the previous person. The
  // old left=advance mapping made the drag reveal one person and the landing
  // show another.
  describe("resolveSwipeStep", () => {
    it("advances (+1) on a right swipe — toward the card peeking below", () => {
      expect(resolveSwipeStep("right")).toBe(1);
    });

    it("goes back (-1) on a left swipe — to the previous card", () => {
      expect(resolveSwipeStep("left")).toBe(-1);
    });
  });

  // Peek = preview: siapa yang tersingkap saat menggeser HARUS orang yang
  // didarati. Bug Keano 28 Agu: dek beku di `+1`, jadi dari orang pertama
  // geser kiri memperlihatkan tetangga kanan tapi mendarat di ujung daftar.
  describe("resolvePeekIndexes", () => {
    it("peeks forward while idle", () => {
      expect(resolvePeekIndexes(0, 13, 2, 0)).toEqual([1, 2]);
    });

    it("peeks forward while dragging right", () => {
      expect(resolvePeekIndexes(0, 13, 2, 1)).toEqual([1, 2]);
    });

    it("peeks BACKWARD while dragging left, wrapping past the start", () => {
      expect(resolvePeekIndexes(0, 13, 2, -1)).toEqual([12, 11]);
    });

    it("agrees with resolveSwipeStep: the front peek is the landing card", () => {
      const active = 4;
      for (const [dir, dragDir] of [
        ["right", 1],
        ["left", -1],
      ] as const) {
        const landing =
          (((active + resolveSwipeStep(dir)) % 13) + 13) % 13;
        expect(resolvePeekIndexes(active, 13, 2, dragDir)[0]).toBe(landing);
      }
    });
  });

});
