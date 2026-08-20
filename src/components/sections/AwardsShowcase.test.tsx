import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// jsdom lacks IntersectionObserver; motion's whileInView/useInView need it.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

let mockReduced = false;
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => mockReduced };
});

let mockCoarse = false;
vi.mock("@/lib/hooks/useCoarsePointer", () => ({
  useCoarsePointer: () => mockCoarse,
}));

const { default: AwardsShowcase } = await import("./AwardsShowcase");

beforeEach(() => {
  mockReduced = false;
  mockCoarse = false;
});

function getRow(name: RegExp) {
  const desc = screen.getByText(name);
  // Baris = elemen grid yang memasang onMouseEnter — leluhur terdekat desc
  // yang punya kartu founder di dalamnya.
  return desc.closest(".group") as HTMLElement;
}

describe("AwardsShowcase", () => {
  it("does not render an eyebrow label (removed 20 Aug)", () => {
    render(<AwardsShowcase />);
    expect(screen.queryByText(/recognition/i)).not.toBeInTheDocument();
  });

  it("renders both founder achievements with the founder card on each row", () => {
    render(<AwardsShowcase />);
    expect(
      screen.getByText(/awarded for the best digital innovation/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/keynote speaker/i)).toBeInTheDocument();
    // Satu kartu founder per baris.
    expect(screen.getAllByText("Fami Maliki")).toHaveLength(2);
    expect(screen.getAllByText(/founder & ceo/i)).toHaveLength(2);
  });

  it("does not render the old fabricated company awards", () => {
    render(<AwardsShowcase />);
    expect(
      screen.queryByText(/best digital government solution/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/top ai implementation/i)).not.toBeInTheDocument();
  });

  it("hovering a row shows its cursor-follow photo and dims the other row", () => {
    const { container } = render(<AwardsShowcase />);
    const row = getRow(/keynote speaker/i);
    fireEvent.mouseEnter(row);

    const preview = [...container.querySelectorAll("img")].find((img) =>
      img.src.includes("fami-speaking"),
    );
    expect(preview).toBeTruthy();

    const otherRow = getRow(/awarded for the best digital innovation/i);
    expect(otherRow.style.opacity).toBe("0.2");
    expect(row.style.opacity).toBe("1");
  });

  it("leaving the row plays the photo's exit and restores the other row", async () => {
    const { container } = render(<AwardsShowcase />);
    const row = getRow(/keynote speaker/i);
    fireEvent.mouseEnter(row);
    fireEvent.mouseLeave(row);

    const otherRow = getRow(/awarded for the best digital innovation/i);
    expect(otherRow.style.opacity).toBe("1");
    // Keluarnya kebalikan pop masuk (scale mengecil) — AnimatePresence menahan
    // foto tetap ter-mount selama exit-nya, jadi unmount-nya asinkron.
    await waitFor(() =>
      expect(
        [...container.querySelectorAll("img")].find((img) =>
          img.src.includes("fami-speaking"),
        ),
      ).toBeUndefined(),
    );
  });

  it("skips hover interactivity entirely under reduced motion", () => {
    mockReduced = true;
    const { container } = render(<AwardsShowcase />);
    const row = getRow(/keynote speaker/i);
    fireEvent.mouseEnter(row);
    expect(
      [...container.querySelectorAll("img")].find((img) =>
        img.src.includes("fami-speaking"),
      ),
    ).toBeUndefined();
    expect(
      getRow(/awarded for the best digital innovation/i).style.opacity,
    ).toBe("1");
  });

  it("skips hover interactivity on coarse pointers (touch)", () => {
    mockCoarse = true;
    const { container } = render(<AwardsShowcase />);
    const row = getRow(/keynote speaker/i);
    fireEvent.mouseEnter(row);
    expect(
      [...container.querySelectorAll("img")].find((img) =>
        img.src.includes("fami-speaking"),
      ),
    ).toBeUndefined();
  });

  // Scramble teks pada hover dicabut atas permintaan Keano 20 Agu — teks diam,
  // hover hanya meredupkan baris lain + memunculkan foto.
  it("leaves the description text untouched on hover", () => {
    render(<AwardsShowcase />);
    const original =
      "Keynote speaker at leading technology and business innovation conferences.";
    const desc = screen.getByText(original);
    fireEvent.mouseEnter(desc.closest(".group") as HTMLElement);
    expect(desc.textContent).toBe(original);
  });
});
