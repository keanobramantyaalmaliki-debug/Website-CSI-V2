import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Careers from "./Careers";

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

const scrollToSectionSpy = vi.fn();
vi.mock("@/lib/smoothScroll", () => ({
  scrollToSection: (id: string) => scrollToSectionSpy(id),
}));

/** Lowongan yang masih dibuka — satu-satunya yang punya accordion. */
const OPEN_TITLES = ["Full Stack Engineer", "Accountant", "Customer Success"];

/** Sudah ditutup: baris abu-abu statis, bukan tombol. */
const CLOSED_TITLES = [
  "Innovation & Growth Manager",
  "Technical Lead",
  "Product Builder",
];

/** Header accordion sebuah role — button yang accessible name-nya memuat judul. */
function roleHeader(title: string) {
  return screen.getByRole("button", {
    name: (name) => name.includes(title),
  });
}

/** matchMedia palsu; `(pointer: coarse)` menjawab sesuai skenario. */
function stubPointer(coarse: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("pointer: coarse") ? coarse : false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  scrollToSectionSpy.mockClear();
});

describe("Careers — roles list (port V1)", () => {
  it("renders every OPEN role as an accordion row, all collapsed", () => {
    render(<Careers />);
    for (const title of OPEN_TITLES) {
      expect(roleHeader(title)).toHaveAttribute("aria-expanded", "false");
    }
  });

  it("closed roles are inert text, not buttons — unclickable and untabbable", () => {
    render(<Careers />);

    for (const title of CLOSED_TITLES) {
      // Judulnya tampil...
      expect(screen.getByText(title)).toBeInTheDocument();
      // ...tapi tidak ada kontrol apa pun yang membawanya, jadi tidak ada
      // yang bisa diklik, di-hover, atau dijangkau Tab.
      expect(
        screen.queryByRole("button", { name: (name) => name.includes(title) }),
      ).toBeNull();
    }

    expect(screen.getAllByTestId("career-role-closed")).toHaveLength(
      CLOSED_TITLES.length,
    );
    expect(screen.getAllByText("(closed)")).toHaveLength(CLOSED_TITLES.length);
  });

  it("closed roles never render their overview or skills", () => {
    render(<Careers />);
    // Overview Technical Lead (kini closed) tidak ada di DOM sama sekali.
    expect(screen.queryByText(/lead engineering execution/i)).toBeNull();
    expect(screen.queryByText("Team leadership")).toBeNull();
  });

  it("shows the Role / Type table header", () => {
    render(<Careers />);
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    // Location sengaja dibuang dari tabel.
    expect(screen.queryByText("Location")).toBeNull();
  });

  it("expands a clicked role and shows its overview + skill tags", async () => {
    const user = userEvent.setup();
    render(<Careers />);

    await user.click(roleHeader("Accountant"));

    expect(roleHeader("Accountant")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/own the books end to end/i)).toBeInTheDocument();
    expect(screen.getByText("Tax compliance")).toBeInTheDocument();
  });

  it("only one role is open at a time", async () => {
    const user = userEvent.setup();
    render(<Careers />);

    await user.click(roleHeader("Accountant"));
    await user.click(roleHeader("Customer Success"));

    expect(roleHeader("Customer Success")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(roleHeader("Accountant")).toHaveAttribute("aria-expanded", "false");
  });

  it("clicking an open role collapses it again", async () => {
    const user = userEvent.setup();
    render(<Careers />);

    await user.click(roleHeader("Full Stack Engineer"));
    await user.click(roleHeader("Full Stack Engineer"));

    expect(roleHeader("Full Stack Engineer")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("the role CTA scrolls to #contact through smoothScroll", async () => {
    const user = userEvent.setup();
    render(<Careers />);

    await user.click(roleHeader(OPEN_TITLES[0]));
    // Body role lain aria-hidden, jadi query role hanya melihat CTA yang terbuka.
    await user.click(
      screen.getByRole("button", { name: /start a conversation/i }),
    );

    expect(scrollToSectionSpy).toHaveBeenCalledWith("contact");
  });

  it("touch: no cursor-follow preview; photo renders inside the expanded body", async () => {
    stubPointer(true);
    const user = userEvent.setup();
    render(<Careers />);

    await user.click(roleHeader("Customer Success"));

    // Satu foto per body role (fallback .role-photo-mobile V1) — bukan
    // preview pengikut kursor, yang memang tidak dirender di pointer kasar.
    expect(screen.getAllByTestId("career-role-photo-mobile")).toHaveLength(
      OPEN_TITLES.length,
    );
  });
});
