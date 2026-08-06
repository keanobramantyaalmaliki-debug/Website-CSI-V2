import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { isMotionValue } from "motion/react";
import PinnedSection from "./PinnedSection";

// jsdom tidak punya keduanya; motion memakainya untuk mengukur scroll.
class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", ObserverStub);
vi.stubGlobal("ResizeObserver", ObserverStub);

/** Elemen track (section) dan anak sticky-nya dari satu render. */
function parts(container: HTMLElement) {
  const track = container.querySelector("section");
  if (!track) throw new Error("PinnedSection tidak merender <section>");
  const sticky = track.firstElementChild;
  if (!sticky) throw new Error("Track tidak punya anak sticky");
  return { track, sticky };
}

describe("PinnedSection", () => {
  it("menurunkan tinggi track dari tinggi anak sticky-nya", () => {
    const { container } = render(
      <PinnedSection sticky="70dvh">{() => null}</PinnedSection>,
    );
    const { track, sticky } = parts(container);

    // Tingginya lewat custom property, bukan angka jadi: `70dvh` baru punya
    // nilai di browser, dan menghitungnya di JS berarti mengukur viewport
    // sendiri lalu salah tiap kali bilah alamat ponsel muncul-hilang.
    expect(track.style.getPropertyValue("--pin-track")).toBe("calc(70dvh * 2)");
    expect(track.style.getPropertyValue("--pin-sticky")).toBe("70dvh");
    expect(track.className).toContain("h-[var(--pin-track)]");
    expect(sticky.className).toContain("sticky");
    expect(sticky.className).toContain("h-[var(--pin-sticky)]");
  });

  it('pinFrom="md" membiarkan ponsel mengalir biasa', () => {
    const { container } = render(
      <PinnedSection pinFrom="md">{() => null}</PinnedSection>,
    );
    const { track, sticky } = parts(container);

    // Yang menahan HANYA boleh hidup mulai `md:`. Tanpa awalan itu, teks yang
    // lebih tinggi dari layar ponsel jadi tidak bisa dijangkau sama sekali:
    // menggulir untuk melihatnya justru yang sedang ditahan.
    expect(track.className).toContain("md:h-[var(--pin-track)]");
    expect(track.className).not.toMatch(/(^|\s)h-\[var\(--pin-track\)\]/);
    expect(sticky.className).toContain("md:sticky");
    expect(sticky.className).not.toMatch(/(^|\s)sticky(\s|$)/);
  });

  it("memberi isinya progress yang ternormalkan ke rentang tahanannya", () => {
    let received: unknown;
    render(
      <PinnedSection>
        {(progress) => {
          received = progress;
          return null;
        }}
      </PinnedSection>,
    );

    expect(isMotionValue(received)).toBe(true);
    // Belum digulir sama sekali → belum menahan apa pun.
    expect((received as { get(): number }).get()).toBe(0);
  });

  it("menolak overflow di track, yang mematikan sticky tanpa error", () => {
    // Overflow apa pun pada LELUHUR elemen sticky menjadikannya scrollport
    // baru; sticky lalu mengacu ke situ, yang tidak pernah bergulir. Pin-nya
    // mati total, halamannya tetap tampak wajar, dan tidak ada apa pun yang
    // menunjuk ke sebabnya — karena itu ini dibuat berisik.
    const silence = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() =>
        render(
          <PinnedSection id="x" className="overflow-hidden">
            {() => null}
          </PinnedSection>,
        ),
      ).toThrow(/overflow/);
    } finally {
      silence.mockRestore();
    }
  });

  it("meloloskan overflow pada anak sticky-nya, tempat ia memang aman", () => {
    expect(() =>
      render(
        <PinnedSection stickyClassName="overflow-hidden">
          {() => null}
        </PinnedSection>,
      ),
    ).not.toThrow();
  });
});
