import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Matter.js butuh canvas 2d/RAF yang tak ada di jsdom → mock permukaan API
// yang dipakai hook + registry demo. Spy stop membuktikan teardown jalan.
// vi.hoisted: spy dibuat sebelum vi.mock yang di-hoist agar bisa direferensikan.
const { runnerStop, renderStop } = vi.hoisted(() => ({
  runnerStop: vi.fn(),
  renderStop: vi.fn(),
}));

vi.mock("matter-js", () => {
  const shape = () => ({ position: { x: 0, y: 0 } });
  const composite = () => ({ position: { x: 0, y: 0 } });
  const M = {
    Engine: {
      create: () => ({ gravity: { y: 0 }, world: { composites: [] } }),
      clear: vi.fn(),
    },
    Render: {
      create: () => ({ canvas: {}, options: {}, bounds: { max: { x: 0, y: 0 } }, mouse: null }),
      run: vi.fn(),
      stop: renderStop,
      setPixelRatio: vi.fn(),
    },
    Runner: { create: () => ({}), run: vi.fn(), stop: runnerStop },
    Bodies: { rectangle: shape, circle: shape, polygon: shape },
    Body: { nextGroup: () => 1, translate: vi.fn() },
    Composite: {
      create: () => ({ label: "c" }),
      add: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      allBodies: () => [shape()],
    },
    Composites: { stack: composite, pyramid: composite, chain: composite },
    Constraint: { create: () => ({}) },
    Mouse: { create: () => ({ position: { x: 0, y: 0 } }) },
    MouseConstraint: { create: () => ({ body: null }) },
    Common: { random: (min = 0, max = 1) => (min + max) / 2 },
    Events: { on: vi.fn(), off: vi.fn() },
  };
  return { default: M };
});

// leva merender panel & pakai API browser → mock jadi no-op murni.
vi.mock("leva", () => ({
  useControls: vi.fn(),
  button: vi.fn(),
}));

// ResizeObserver tak ada di jsdom.
beforeEach(() => {
  runnerStop.mockClear();
  renderStop.mockClear();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

import MatterLab from "./MatterLab";
import { DEMOS } from "@/lib/lab/demos";

describe("MatterLab", () => {
  it("mounts a canvas element", () => {
    const { container } = render(<MatterLab />);
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("renders a demo dropdown listing every registered demo", () => {
    render(<MatterLab />);
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    for (const demo of DEMOS) {
      expect(screen.getByRole("option", { name: demo.name })).toBeInTheDocument();
    }
  });

  it("switches the selected demo without crashing", async () => {
    const user = userEvent.setup();
    render(<MatterLab />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    await user.selectOptions(select, "newtons-cradle");
    expect(select.value).toBe("newtons-cradle");
  });

  it("tears down the physics loop on unmount (no leak)", () => {
    const { unmount } = render(<MatterLab />);
    unmount();
    expect(runnerStop).toHaveBeenCalledTimes(1);
    expect(renderStop).toHaveBeenCalledTimes(1);
  });
});
