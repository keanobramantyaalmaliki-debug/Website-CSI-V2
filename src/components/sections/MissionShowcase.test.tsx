import { describe, it, expect, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MissionShowcase, { type Mission } from "./MissionShowcase";

const MISSIONS: Mission[] = [
  {
    n: "01",
    tag: "Delivery",
    verb: "Deliver",
    detail: "Innovative and high-quality software solutions.",
    image: "https://images.unsplash.com/photo-1",
    imageAlt: "Code on a monitor",
  },
  {
    n: "02",
    tag: "Acceleration",
    verb: "Accelerate",
    detail: "Digital transformation through intelligent technologies.",
    image: "https://images.unsplash.com/photo-2",
    imageAlt: "Light trails at night",
  },
  {
    n: "03",
    tag: "Integration",
    verb: "Integrate",
    detail: "Artificial Intelligence into practical business applications.",
    image: "https://images.unsplash.com/photo-3",
    imageAlt: "Circuit board",
  },
];

function mockMatchMedia({
  minWidthMatches = false,
  reducedMotionMatches = false,
}: {
  minWidthMatches?: boolean;
  reducedMotionMatches?: boolean;
}) {
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes("prefers-reduced-motion")
        ? reducedMotionMatches
        : minWidthMatches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe("MissionShowcase — mobile accordion", () => {
  it("renders all missions (tag, verb) with the first item open by default", () => {
    mockMatchMedia({ minWidthMatches: false });
    render(<MissionShowcase missions={MISSIONS} />);

    for (const m of MISSIONS) {
      expect(screen.getByText(m.verb)).toBeInTheDocument();
    }
    expect(
      screen.getByRole("button", { name: /deliver/i }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(MISSIONS[0].detail)).toBeInTheDocument();
  });

  it("only-one-open: opening a new item closes the previously open one", async () => {
    mockMatchMedia({ minWidthMatches: false });
    const user = userEvent.setup();
    render(<MissionShowcase missions={MISSIONS} />);

    await user.click(screen.getByRole("button", { name: /accelerate/i }));

    expect(
      screen.getByRole("button", { name: /accelerate/i }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("button", { name: /deliver/i }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText(MISSIONS[1].detail)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText(MISSIONS[0].detail)).not.toBeInTheDocument(),
    );
  });

  it("is operable by keyboard (Enter and Space)", async () => {
    mockMatchMedia({ minWidthMatches: false });
    const user = userEvent.setup();
    render(<MissionShowcase missions={MISSIONS} />);

    const integrateButton = screen.getByRole("button", { name: /integrate/i });
    integrateButton.focus();
    await user.keyboard("{Enter}");
    expect(integrateButton).toHaveAttribute("aria-expanded", "true");

    const deliverButton = screen.getByRole("button", { name: /deliver/i });
    deliverButton.focus();
    await user.keyboard(" ");
    expect(deliverButton).toHaveAttribute("aria-expanded", "true");
    expect(integrateButton).toHaveAttribute("aria-expanded", "false");
  });

  it("respects prefers-reduced-motion: content still renders, nothing crashes", () => {
    mockMatchMedia({ minWidthMatches: false, reducedMotionMatches: true });
    render(<MissionShowcase missions={MISSIONS} />);

    expect(screen.getByText(MISSIONS[0].detail)).toBeInTheDocument();
    for (const m of MISSIONS) {
      expect(screen.getByText(m.verb)).toBeInTheDocument();
    }
  });
});

describe("MissionShowcase — desktop card row", () => {
  it("renders the first mission expanded (aria-current) by default", () => {
    mockMatchMedia({ minWidthMatches: true });
    render(<MissionShowcase missions={MISSIONS} />);

    const deliverCard = screen.getByRole("button", { name: /deliver/i });
    expect(deliverCard).toHaveAttribute("aria-current", "true");
    expect(screen.getByText(MISSIONS[0].detail)).toBeInTheDocument();
  });

  it("clicking a card makes it active and hides the previous detail", async () => {
    mockMatchMedia({ minWidthMatches: true });
    const user = userEvent.setup();
    render(<MissionShowcase missions={MISSIONS} />);

    await user.click(screen.getByRole("button", { name: /integrate/i }));

    expect(
      screen.getByRole("button", { name: /integrate/i }),
    ).toHaveAttribute("aria-current", "true");
    expect(screen.getByText(MISSIONS[2].detail)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText(MISSIONS[0].detail)).not.toBeInTheDocument(),
    );
  });

  it("nav arrows move the active card left/right, wrapping around", async () => {
    mockMatchMedia({ minWidthMatches: true });
    const user = userEvent.setup();
    render(<MissionShowcase missions={MISSIONS} />);

    await user.click(screen.getByRole("button", { name: /next mission/i }));
    expect(
      screen.getByRole("button", { name: /accelerate/i }),
    ).toHaveAttribute("aria-current", "true");

    await user.click(screen.getByRole("button", { name: /previous mission/i }));
    expect(
      screen.getByRole("button", { name: /deliver/i }),
    ).toHaveAttribute("aria-current", "true");

    await user.click(screen.getByRole("button", { name: /previous mission/i }));
    expect(
      screen.getByRole("button", { name: /integrate/i }),
    ).toHaveAttribute("aria-current", "true");
  });
});
