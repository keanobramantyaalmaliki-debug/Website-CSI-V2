/**
 * Kontrak SmoothScrollProvider pada jalur normal (motion TIDAK dikurangi).
 *
 * Lenis di-mock, bukan dijalankan sungguhan: jsdom tidak punya layout, jadi
 * scroll aslinya tidak bisa diamati. Yang perlu dijaga di sini justru
 * PEMASANGANNYA — bahwa Lenis tidak menjalankan rAF-nya sendiri, bahwa loader
 * menahan lalu melepas scroll, dan bahwa navigasi hash tetap sampai ke section
 * yang benar setelah scrollIntoView diganti.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useSceneStore } from "@/lib/store/sceneStore";
import RoomRouteSync from "@/routes/RoomRouteSync";
import SmoothScrollProvider from "./SmoothScrollProvider";

const lenisMock = vi.hoisted(() => {
  const constructorOptions: Record<string, unknown>[] = [];
  const scrollToCalls: { target: unknown; options: Record<string, unknown> }[] = [];
  const lifecycle: string[] = [];
  let rafTicks = 0;

  class MockLenis {
    constructor(options: Record<string, unknown>) {
      constructorOptions.push(options);
    }
    raf() {
      rafTicks += 1;
    }
    stop() {
      lifecycle.push("stop");
    }
    start() {
      lifecycle.push("start");
    }
    destroy() {
      lifecycle.push("destroy");
    }
    scrollTo(target: unknown, options: Record<string, unknown>) {
      scrollToCalls.push({ target, options });
    }
  }

  return {
    MockLenis,
    constructorOptions,
    scrollToCalls,
    lifecycle,
    ticks: () => rafTicks,
    reset() {
      constructorOptions.length = 0;
      scrollToCalls.length = 0;
      lifecycle.length = 0;
      rafTicks = 0;
    },
  };
});

vi.mock("lenis", () => ({ default: lenisMock.MockLenis }));

beforeEach(() => {
  lenisMock.reset();
  useSceneStore.setState({ loaderDone: false, currentRoom: "Lounge", goTo: null });
});

describe("SmoothScrollProvider", () => {
  it("menjalankan Lenis tanpa rAF-nya sendiri, dan men-tick-nya dari satu ticker", async () => {
    render(<SmoothScrollProvider>{null}</SmoothScrollProvider>);

    expect(lenisMock.constructorOptions).toHaveLength(1);
    expect(
      lenisMock.constructorOptions[0].autoRaf,
      "Lenis dibuat dengan rAF loop-nya sendiri. Itu membuat posisi scroll dan " +
        "animasi motion diperbarui di dua loop berbeda: dalam satu frame " +
        "urutannya tak tentu, dan apa pun yang digerakkan scroll (canvas Hero, " +
        "parallax) bisa tertinggal satu frame — terbaca sebagai getar halus.\n\n" +
        "Pakai `autoRaf: false` dan drive dari useAnimationFrame.\n",
    ).toBe(false);

    // Ticker-nya benar-benar jalan, bukan cuma dipasang.
    await waitFor(() => expect(lenisMock.ticks()).toBeGreaterThan(0));
  });

  it("menahan scroll selama loader tampil, lalu melepasnya", () => {
    render(<SmoothScrollProvider>{null}</SmoothScrollProvider>);

    expect(
      lenisMock.lifecycle,
      "Scroll tidak ditahan saat overlay loader masih menutupi halaman — " +
        "halaman bisa digulir di baliknya.\n",
    ).toContain("stop");
    expect(lenisMock.lifecycle).not.toContain("start");

    act(() => {
      useSceneStore.getState().setLoaderDone(true);
    });

    expect(
      lenisMock.lifecycle.at(-1),
      "Scroll tidak dilepas setelah loader selesai — halaman terkunci.\n",
    ).toBe("start");
  });

  it("membuang instance Lenis saat unmount", () => {
    const view = render(<SmoothScrollProvider>{null}</SmoothScrollProvider>);
    view.unmount();
    expect(lenisMock.lifecycle).toContain("destroy");
  });
});

describe("tautan <a href=\"#section\">", () => {
  function clickOn(el: Element) {
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    act(() => {
      el.dispatchEvent(event);
    });
    return event;
  }

  it("menggulir halus, dan menahan lompatan bawaan browser", () => {
    const { getByText } = render(
      <SmoothScrollProvider>
        <a href="#manifesto">see our work</a>
        <div id="manifesto" />
      </SmoothScrollProvider>,
    );

    const event = clickOn(getByText("see our work"));

    expect(
      event.defaultPrevented,
      "Lompatan bawaan browser ke fragment tidak ditahan. Ia berjalan " +
        "seketika, jadi halaman berkedip ke tujuan lebih dulu lalu ditarik " +
        "balik oleh scroll halus yang menyusul.\n",
    ).toBe(true);
    expect(lenisMock.scrollToCalls).toHaveLength(1);
    expect(lenisMock.scrollToCalls[0].target).toBe(
      document.getElementById("manifesto"),
    );
  });

  it("tidak menyentuh tautan ke halaman lain", () => {
    const { getByText } = render(
      <SmoothScrollProvider>
        <a href="/office">office</a>
      </SmoothScrollProvider>,
    );

    const event = clickOn(getByText("office"));

    expect(
      event.defaultPrevented,
      "Tautan lintas-halaman ikut ditahan — navigasi React Router jadi mati.\n",
    ).toBe(false);
    expect(lenisMock.scrollToCalls).toHaveLength(0);
  });
});

describe("navigasi hash", () => {
  it("menggulir ke section yang ditunjuk hash", async () => {
    const contact = document.createElement("div");
    contact.id = "contact";
    document.body.appendChild(contact);

    render(
      <MemoryRouter initialEntries={["/#contact"]}>
        <SmoothScrollProvider>
          <RoomRouteSync />
        </SmoothScrollProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(lenisMock.scrollToCalls).toHaveLength(1));

    expect(
      lenisMock.scrollToCalls[0].target,
      'Navigasi ke "/#contact" tidak sampai ke elemen #contact. Sejak ' +
        "scrollIntoView diganti Lenis, jalur inilah satu-satunya yang membawa " +
        'tombol "Talk to us" dari ruangan tanpa Contact ke Lounge.\n',
    ).toBe(contact);

    expect(
      lenisMock.scrollToCalls[0].options.force,
      "Scroll programatik tidak dipaksa. Selama loader/drawer menahan scroll, " +
        "Lenis memasangi <html> `overflow: clip` dan panggilan ini akan " +
        "diam-diam tidak menghasilkan apa-apa.\n",
    ).toBe(true);

    contact.remove();
  });
});
