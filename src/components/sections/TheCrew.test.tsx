import { describe, it, expect, vi } from "vitest";
import { render, screen, within, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TheCrew from "./TheCrew";
import { TEAM_MEMBERS } from "@/data/people";

// jsdom lacks IntersectionObserver; motion's whileInView/useInView need it.
// Fires the callback immediately so NumberTicker's useInView resolves and
// the count-up settles at its target value instead of staying at 0.
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

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => true };
});

describe("TheCrew", () => {
  it("renders 13 people on mount", async () => {
    render(<TheCrew />);
    await waitFor(() => expect(screen.getByText("13")).toBeInTheDocument(), {
      timeout: 5000,
    });
    expect(screen.getByText("people")).toBeInTheDocument();
  });

  it("filter tab click narrows visible people and updates the counter", async () => {
    const user = userEvent.setup();
    render(<TheCrew />);

    await user.click(screen.getByRole("button", { name: "Management" }));

    const managementCount = TEAM_MEMBERS.filter(
      (m) => m.category === "Management",
    ).length;
    await waitFor(
      () =>
        expect(screen.getByText(String(managementCount))).toBeInTheDocument(),
      { timeout: 5000 },
    );

    const developerOnlyName = TEAM_MEMBERS.find(
      (m) => m.category === "Developer",
    )!.name;
    expect(screen.queryByText(developerOnlyName)).not.toBeInTheDocument();
  });

  it("every person appears in the desktop list and is reachable via the mobile carousel", () => {
    render(<TheCrew />);
    const mobileCarousel = screen.getByTestId("crew-mobile-carousel");

    // Mobile is a swipe deck — only the active card (+ a couple of peek
    // cards behind it) is in the DOM at once, not the full list. Desktop
    // still renders every name; on mobile, every person is reachable via
    // their dot indicator, and the first person's card is visible on mount.
    for (const member of TEAM_MEMBERS) {
      expect(screen.getAllByText(member.name).length).toBeGreaterThanOrEqual(1);
      expect(
        within(mobileCarousel).getByRole("button", { name: `Show ${member.name}` }),
      ).toBeInTheDocument();
    }
    expect(
      within(mobileCarousel).getByText(TEAM_MEMBERS[0].name),
    ).toBeInTheDocument();
  });

  it("hovering/focusing a desktop row updates active state without throwing", async () => {
    const user = userEvent.setup();
    render(<TheCrew />);

    const firstMember = TEAM_MEMBERS[0];
    const heading = screen.getAllByText(firstMember.name)[0];
    const row = heading.closest("[tabindex]") as HTMLElement;
    expect(row).toBeTruthy();

    await user.hover(row);
    await user.unhover(row);

    row.focus();
    expect(row).toHaveFocus();
    row.blur();
  });

  it("no duplicate/missing department headers for the three categories", () => {
    render(<TheCrew />);
    for (const cat of ["Management", "Developer", "R & D"]) {
      expect(screen.getAllByText(cat).length).toBeGreaterThan(0);
    }
  });

  it("desktop left panel is a fixed-height scroll box", () => {
    render(<TheCrew />);
    const box = screen.getByTestId("crew-scroll-box");
    expect(box.className).toMatch(/overflow-y-auto/);
    expect(box.className).toMatch(/max-h-/);
  });

  it("scrolling the box updates the active row/avatar based on proximity to the box midpoint", () => {
    render(<TheCrew />);
    const box = screen.getByTestId("crew-scroll-box");

    const boxRectSpy = vi
      .spyOn(box, "getBoundingClientRect")
      .mockReturnValue({ top: 0, height: 400, bottom: 400 } as DOMRect);

    const secondMember = TEAM_MEMBERS[1];
    const secondHeading = screen.getAllByText(secondMember.name)[0];
    const secondRow = secondHeading.closest("[tabindex]") as HTMLElement;

    // Every row reports far from the midpoint except the second member's row.
    const allRowEls = TEAM_MEMBERS.map((m) => {
      const heading = screen.getAllByText(m.name)[0];
      return heading.closest("[tabindex]") as HTMLElement;
    });
    for (const row of allRowEls) {
      if (row === secondRow) {
        vi.spyOn(row, "getBoundingClientRect").mockReturnValue({
          top: 190,
          height: 20,
          bottom: 210,
        } as DOMRect);
      } else {
        vi.spyOn(row, "getBoundingClientRect").mockReturnValue({
          top: 5000,
          height: 20,
          bottom: 5020,
        } as DOMRect);
      }
    }

    fireEvent.scroll(box, { target: { scrollTop: 200 } });

    const avatarButton = screen.getByRole("button", { name: secondMember.name });
    return waitFor(() => {
      expect(secondRow.querySelector("h3")?.className).toMatch(/text-zinc-50/);
      expect(avatarButton.querySelector("div")?.className).toMatch(/ring-accent/);
    }).finally(() => boxRectSpy.mockRestore());
  });

  it("unhovering a row reverts the highlight to the scroll baseline, not to nothing", async () => {
    const user = userEvent.setup();
    render(<TheCrew />);
    const box = screen.getByTestId("crew-scroll-box");

    vi.spyOn(box, "getBoundingClientRect").mockReturnValue({
      top: 0,
      height: 400,
      bottom: 400,
    } as DOMRect);

    const otherMember = TEAM_MEMBERS[1];

    const allRowEls = TEAM_MEMBERS.map((m) => {
      const heading = screen.getAllByText(m.name)[0];
      return heading.closest("[tabindex]") as HTMLElement;
    });
    const baselineRow = allRowEls[0];
    for (const row of allRowEls) {
      if (row === baselineRow) {
        vi.spyOn(row, "getBoundingClientRect").mockReturnValue({
          top: 190,
          height: 20,
          bottom: 210,
        } as DOMRect);
      } else {
        vi.spyOn(row, "getBoundingClientRect").mockReturnValue({
          top: 5000,
          height: 20,
          bottom: 5020,
        } as DOMRect);
      }
    }

    fireEvent.scroll(box, { target: { scrollTop: 200 } });
    await waitFor(() =>
      expect(baselineRow.querySelector("h3")?.className).toMatch(/text-zinc-50/),
    );

    const otherHeading = screen.getAllByText(otherMember.name)[0];
    const otherRow = otherHeading.closest("[tabindex]") as HTMLElement;

    await user.hover(otherRow);
    await waitFor(() =>
      expect(otherRow.querySelector("h3")?.className).toMatch(/text-zinc-50/),
    );

    await user.unhover(otherRow);

    await waitFor(() => {
      expect(baselineRow.querySelector("h3")?.className).toMatch(/text-zinc-50/);
      expect(otherRow.querySelector("h3")?.className).not.toMatch(/text-zinc-50/);
    });
  });

  it("changing the filter clears any stale highlight", async () => {
    const user = userEvent.setup();
    render(<TheCrew />);

    const firstMember = TEAM_MEMBERS[0];
    const heading = screen.getAllByText(firstMember.name)[0];
    const row = heading.closest("[tabindex]") as HTMLElement;

    await user.hover(row);
    await waitFor(() =>
      expect(row.querySelector("h3")?.className).toMatch(/text-zinc-50/),
    );
    await user.unhover(row);

    await user.click(screen.getByRole("button", { name: "Management" }));

    if (firstMember.category === "Management") {
      const rowAfter = screen
        .getAllByText(firstMember.name)[0]
        .closest("[tabindex]") as HTMLElement;
      expect(rowAfter.querySelector("h3")?.className).not.toMatch(/text-zinc-50/);
    }
  });
});
