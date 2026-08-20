/**
 * PENJAGA KONTRAK — sapuan pindah ruangan dari konten
 *
 * Yang dijaga di sini semuanya urusan URUTAN, bukan tampilan (tampilannya CSS
 * murni, dan itu bukan yang bisa rusak diam-diam):
 *
 *   1. Kotak-kotak `<clipPath>` sudah ADA di commit yang sama dengan saat
 *      `pendingRoom` terisi. Hero memasang `clip-path: url(#…)` di commit itu
 *      juga; kalau clip-nya menyusul belakangan, ada satu frame di mana
 *      rujukannya menggantung dan sebagian peramban menggambar canvas UTUH —
 *      satu frame ruangan lama menyala di tengah konten.
 *   2. `goTo({ instant: true })` dipanggil di AWAL, `navigate` di AKHIR. Ini
 *      kebalikan dari versi tirai dua-arah, dan urutannya yang membuat
 *      sapuannya menyingkap halaman YANG TADI DIBACA alih-alih puncak halaman
 *      baru. Dibuktikan dengan memasang RoomRouteSync sungguhan: kalau Arah 2
 *      lolos, ia menavigasi sendiri di detik pertama sapuan.
 *   3. `goTo` dipanggil SEKALI dan selalu instan — tween 1400 ms yang seluruh
 *      fitur ini hilangkan tidak boleh menyelinap balik lewat RoomRouteSync.
 *   4. Sapuan tidak mulai sebelum ruangan baru tergambar (penghitung frame),
 *      dan jaring pengaman tetap menjalankannya kalau penghitung itu tidak
 *      pernah maju — di jsdom tidak ada Canvas, jadi keadaan itu memang
 *      keadaan test ini.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import GridReveal from "./GridReveal";
import RoomRouteSync from "@/routes/RoomRouteSync";
import {
  pathFor,
  useSceneStore,
  type RoomKey,
  type GoToOptions,
} from "@/lib/store/sceneStore";
import { markFrame, resetFrameCount } from "@/components/canvas/frameTick";
import { jumpToTop } from "@/lib/smoothScroll";

vi.mock("@/lib/smoothScroll", () => ({
  scrollToTop: vi.fn(),
  scrollToSection: vi.fn(),
  jumpToTop: vi.fn(),
  setScrollLocked: vi.fn(),
}));

type Call = { room: RoomKey; instant: boolean };

/** Semua panggilan goTo selama satu test, berikut ragamnya. */
let calls: Call[] = [];

/** Meneruskan pathname router ke DOM supaya bisa diperiksa dari test. */
function PathProbe() {
  return <span data-testid="path">{useLocation().pathname}</span>;
}

/** Endapan (SETTLE_MS di GridReveal.tsx) + selisih, buat blok act kedua. */
const SETTLE_TAIL_MS = 300;

/**
 * Batas atas satu transisi penuh, ms — dan angkanya sengaja longgar.
 *
 * jsdom TIDAK menjalankan transisi CSS, jadi `transitionend` tidak pernah
 * datang dan pendaratan di sini SELALU lewat jaring pengaman (LAND_NET_MS di
 * GridReveal.tsx). Itu bukan kelemahan test-nya: jalur jaring pengaman justru
 * yang paling gampang membusuk tanpa ketahuan, karena di browser ia hampir
 * tidak pernah dipakai. Yang dijaga test ini urutan & hasil akhirnya; bahwa
 * kotak terakhir yang mendaratkan dibuktikan lewat filmstrip
 * (scripts/probe-grid-reveal.mjs), bukan di sini.
 *
 * Rantai terburuknya: FRAME_WAIT 300 + SWEEP 800 + TILE 80 + LAND_NET 400 =
 * 1580 ms. Batas lama 1600 dipatok saat sapuan masih 420 dan jadi pas-pasan
 * begitu Keano menaikkan SWEEP_MS ke 800 (20 Agu) — dilonggarkan lagi supaya
 * angka ini tidak ikut disetel ulang tiap durasi sapuan dicicipi ulang.
 */
const WHOLE_MS = 2400;

const path = () => screen.getByTestId("path").textContent;
const rects = () =>
  screen.getByTestId("grid-reveal").querySelectorAll("rect").length;

function mount(from: RoomKey, at: string) {
  useSceneStore.setState({
    currentRoom: from,
    pendingRoom: null,
    goTo: (room: RoomKey, opts?: GoToOptions) => {
      calls.push({ room, instant: !!opts?.instant });
      // Tiruan setia CameraController: hanya jalur instan yang langsung
      // menyetel currentRoom tanpa menunggu tween.
      if (opts?.instant) useSceneStore.setState({ currentRoom: room });
    },
  });
  return render(
    <MemoryRouter initialEntries={[at]}>
      <RoomRouteSync />
      <GridReveal />
      <PathProbe />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  calls = [];
  resetFrameCount();
  vi.mocked(jumpToTop).mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  useSceneStore.setState({
    goTo: null,
    pendingRoom: null,
    currentRoom: "Lounge",
  });
});

describe("GridReveal", () => {
  it("tidak menggambar apa pun selama tidak ada permintaan pindah", () => {
    mount("Office", "/people");
    expect(screen.queryByTestId("grid-reveal")).toBeNull();
  });

  it("kotak clip sudah ada di commit yang sama dengan permintaannya", () => {
    mount("Office", "/people");
    act(() => {
      useSceneStore.getState().requestRoomTransition("Lounge");
    });
    // Lebih dari satu kotak = kisinya benar-benar kisi, bukan bidang polos.
    expect(rects()).toBeGreaterThan(1);
  });

  it("menjepret kamera di AWAL, tapi menahan URL sampai sapuan selesai", () => {
    mount("Office", "/people");
    act(() => {
      useSceneStore.getState().requestRoomTransition("Lounge");
    });

    // Kamera sudah pindah sebelum ada satu kotak pun yang membesar…
    expect(calls).toEqual([{ room: "Lounge", instant: true }]);
    expect(useSceneStore.getState().currentRoom).toBe("Lounge");

    // …tapi halaman yang sedang disapu WAJIB masih halaman yang tadi dibaca.
    // Ini penjaga Arah 2 di RoomRouteSync: ia melihat currentRoom baru + URL
    // lama, bentuk yang identik dengan klik waypoint, dan tanpa gerbang
    // `pendingRoom` ia akan menavigasi sendiri di sini.
    expect(jumpToTop).not.toHaveBeenCalled();
    expect(path()).toBe("/people");

    // Lewati jaring pengaman frame + seluruh sapuan.
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(path()).toBe("/people");

    act(() => {
      vi.advanceTimersByTime(WHOLE_MS);
    });
    expect(path()).toBe(pathFor("Lounge"));
    expect(jumpToTop).toHaveBeenCalledTimes(1);

    // Sekali, instan, dan RoomRouteSync tidak menambahi tween apa pun.
    expect(calls).toEqual([{ room: "Lounge", instant: true }]);
  });

  it("menahan sapuan selama ruangan baru belum tergambar", () => {
    mount("Office", "/people");
    act(() => {
      useSceneStore.getState().requestRoomTransition("Lounge");
    });

    // Belum ada frame yang digambar dan jaring pengaman belum jatuh tempo:
    // clip-nya WAJIB masih tertutup rapat (semua kotak scale 0).
    act(() => {
      vi.advanceTimersByTime(100);
    });
    const closed = screen
      .getByTestId("grid-reveal")
      .querySelectorAll('rect[style*="scale(0)"]').length;
    expect(closed).toBe(rects());
    expect(useSceneStore.getState().pendingRoom).toBe("Lounge");
  });

  it("menyapu begitu dua frame tergambar, tanpa menunggu jaring pengaman", () => {
    mount("Office", "/people");
    act(() => {
      useSceneStore.getState().requestRoomTransition("Lounge");
    });

    act(() => {
      markFrame();
      markFrame();
      vi.advanceTimersByTime(50); // cukup buat rAF poll menyadarinya
    });
    expect(
      screen.getByTestId("grid-reveal").querySelectorAll('rect[style*="scale(1)"]')
        .length,
    ).toBe(rects());

    act(() => {
      vi.advanceTimersByTime(WHOLE_MS);
    });
    // ⚠️ Dua blok act() yang terpisah, dan itu bukan gaya penulisan. Timer
    // endapan baru DIPASANG oleh effect penyelesaian, yang menyala setelah
    // React meng-commit `navigate` — dan commit itu terjadi di batas act(),
    // bukan di tengah `advanceTimersByTime`. Satu blok panjang memajukan jam
    // melewati timer yang saat itu belum ada. Persis yang terjadi di browser:
    // route mendarat dulu, endapan menghitung sesudahnya.
    act(() => {
      vi.advanceTimersByTime(SETTLE_TAIL_MS);
    });
    expect(useSceneStore.getState().pendingRoom).toBeNull();
    expect(screen.queryByTestId("grid-reveal")).toBeNull();
    expect(path()).toBe(pathFor("Lounge"));
  });

  it("jaring pengaman tetap menyelesaikannya kalau penghitung frame tak pernah maju", () => {
    mount("Office", "/people");
    act(() => {
      useSceneStore.getState().requestRoomTransition("Lounge");
    });
    // Jaring pengaman 300 ms + sapuan + endapan, tanpa satu pun markFrame().
    act(() => {
      vi.advanceTimersByTime(WHOLE_MS);
    });
    act(() => {
      vi.advanceTimersByTime(SETTLE_TAIL_MS); // lihat catatan act ganda di atas
    });
    expect(useSceneStore.getState().pendingRoom).toBeNull();
    expect(screen.queryByTestId("grid-reveal")).toBeNull();
    expect(path()).toBe(pathFor("Lounge"));
  });

  it("permintaan kedua di tengah sapuan diabaikan, bukan memulai ulang", () => {
    mount("Office", "/people");
    act(() => {
      useSceneStore.getState().requestRoomTransition("Lounge");
    });
    act(() => {
      useSceneStore.getState().requestRoomTransition("Meeting");
    });
    expect(useSceneStore.getState().pendingRoom).toBe("Lounge");

    act(() => {
      vi.advanceTimersByTime(WHOLE_MS);
    });
    expect(calls).toEqual([{ room: "Lounge", instant: true }]);
    expect(path()).toBe(pathFor("Lounge"));
  });
});
