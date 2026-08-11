/**
 * PENJAGA REGRESI — engine fisika tidak boleh berdetak saat menganggur
 *
 * ── Bug yang dijaga (3 Agu, dilaporkan sebagai "laptop panas") ──────────────
 * `Runner.run(runner, engine)` dulu dipanggil langsung di dalam useLayoutEffect,
 * jadi engine matter-js mulai berdetak **saat mount dan tidak pernah berhenti**
 * sampai komponennya di-unmount.
 *
 * Yang membuatnya sulit terlihat: ada flag `physicsActive`, tapi ia cuma
 * menggerbangi PENULISAN transform di dalam `afterUpdate`. Simulasinya sendiri
 * tetap jalan ~60×/detik — mengintegrasikan posisi 3 dinding + N badan kata —
 * walau kursor tidak pernah menyentuh judulnya sama sekali.
 *
 * Ongkosnya berlipat: `<PhysicsHeading>` dipakai 2× di Deployments.tsx, jadi
 * DUA engine berdetak bersamaan sepanjang Lounge terbuka. Dan ini beban CPU,
 * bukan GPU — itulah kenapa gejalanya "kipas menyala / laptop panas" alih-alih
 * sekadar FPS turun.
 *
 * ── Yang benar ─────────────────────────────────────────────────────────────
 * Engine baru berjalan saat benar-benar ada yang dianimasikan (hover), lalu
 * BERHENTI lagi setelah kata-katanya kembali ke tempatnya. Diam = nol ongkos.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";

// jsdom tidak punya IntersectionObserver; <LineMask> di dalam PhysicsHeading
// memakainya lewat useInView milik motion. Tidak ada kaitannya dengan yang
// dijaga di sini — distub supaya kegagalan test cuma datang dari bug fisikanya.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  root = null;
  rootMargin = "";
  thresholds = [];
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

/** Berapa kali Runner sedang berjalan — dinaikkan run(), diturunkan stop(). */
let running = 0;
let runCalls = 0;

vi.mock("matter-js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("matter-js")>();
  const M = (actual as unknown as { default?: unknown }).default ?? actual;
  const real = M as typeof import("matter-js");
  return {
    default: {
      ...real,
      Runner: {
        ...real.Runner,
        create: (...a: unknown[]) =>
          (real.Runner.create as (...x: unknown[]) => unknown)(...a),
        run: (...a: unknown[]) => {
          running++;
          runCalls++;
          return (real.Runner.run as (...x: unknown[]) => unknown)(...a);
        },
        stop: (...a: unknown[]) => {
          running--;
          return (real.Runner.stop as (...x: unknown[]) => unknown)(...a);
        },
      },
    },
  };
});

let mockReduced = false;
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => mockReduced };
});

const { default: PhysicsHeading } = await import("./PhysicsHeading");

beforeEach(() => {
  mockReduced = false;
  running = 0;
  runCalls = 0;
});

describe("PhysicsHeading tidak membakar CPU saat menganggur", () => {
  it("engine TIDAK berjalan setelah mount, selama belum di-hover", () => {
    render(<PhysicsHeading text="Deployments in the wild" />);

    expect(
      running,
      "Engine matter-js berjalan begitu komponen mount, padahal belum ada " +
        "yang dianimasikan.\n\n" +
        "`physicsActive` cuma menggerbangi penulisan transform di " +
        "`afterUpdate` — simulasinya sendiri tetap berdetak ~60×/detik " +
        "selamanya. PhysicsHeading dipakai 2× di Deployments.tsx, jadi ada " +
        "DUA engine berjalan sepanjang Lounge terbuka.\n\n" +
        "Ini beban CPU (bukan GPU): gejalanya laptop panas & kipas menyala.\n\n" +
        "Perbaikan: jalankan Runner saat hover, hentikan setelah diam.\n",
    ).toBe(0);
  });

  it("engine berjalan saat di-hover (animasinya tetap hidup)", async () => {
    const { container } = render(<PhysicsHeading text="Deployments in the wild" />);
    const el = container.firstChild as HTMLElement;

    fireEvent.mouseEnter(el);

    await waitFor(() =>
      expect(
        running,
        "Engine tidak berjalan saat di-hover — animasi jatuhnya mati. " +
          "Gerbang idle-nya terlalu ketat.\n",
      ).toBe(1),
    );
  });

  it("engine berhenti lagi setelah kursor pergi", async () => {
    const { container } = render(<PhysicsHeading text="Deployments in the wild" />);
    const el = container.firstChild as HTMLElement;

    fireEvent.mouseEnter(el);
    await waitFor(() => expect(running).toBe(1));

    fireEvent.mouseLeave(el);

    await waitFor(
      () =>
        expect(
          running,
          "Engine tetap berjalan setelah kursor pergi. Sekali di-hover, " +
            "ongkosnya menetap selamanya — persis bug yang dijaga.\n",
        ).toBe(0),
      { timeout: 3000 },
    );
  });

  it("unmount tidak meninggalkan runner hidup", () => {
    const { container, unmount } = render(
      <PhysicsHeading text="Deployments in the wild" />,
    );
    fireEvent.mouseEnter(container.firstChild as HTMLElement);
    unmount();

    expect(running, "Runner bocor setelah unmount").toBe(0);
  });

  it("reduced-motion: engine tidak pernah dibuat sama sekali", () => {
    mockReduced = true;
    render(<PhysicsHeading text="Deployments in the wild" />);

    expect(runCalls, "reduced-motion seharusnya melewati fisika sepenuhnya").toBe(0);
  });
});
