"use client";

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useReducedMotion } from "motion/react";
import { pathFor, useSceneStore, type RoomKey } from "@/lib/store/sceneStore";
import { jumpToTop, setScrollLocked } from "@/lib/smoothScroll";
import { frameCount } from "@/components/canvas/frameTick";
import {
  bandGrid,
  shuffledDelays,
  CLIP_BLEED_PX,
  CLIP_ID,
  HERO_SECTION_ID,
  JITTER_MS,
} from "@/lib/gridReveal";

/**
 * Sapuan kotak-kotak untuk pindah ruangan DARI DALAM KONTEN.
 *
 * ── Masalah yang diselesaikannya ────────────────────────────────────────────
 * Klik ruangan di navbar selagi berada jauh di bawah konten dulu memicu dua
 * gerakan yang tidak diminta sekaligus: halaman dijepret balik ke atas (jadi 3D
 * ruangan LAMA sempat terlihat sekejap), lalu kamera terbang 1400 ms ke ruangan
 * baru.
 *
 * Camera fly itu afordans SPASIAL — benar saat mengklik waypoint di dalam
 * ruangan, karena perjalanannya terlihat dan menceritakan letak ruangan satu
 * terhadap yang lain. Dari dalam konten, titik berangkatnya tidak pernah
 * terlihat, jadi yang tersisa dari perjalanan itu cuma 1,4 detik menunggu.
 *
 * ── Kenapa MENYINGKAP, bukan menutup lalu membuka ──────────────────────────
 * Bentuk pertamanya tirai dua arah: kotak-kotak polos menutup layar, ruangan
 * ditukar di baliknya, lalu kotak-kotak lain membukanya. Itu bekerja, tapi
 * yang diceritakannya "ada sesuatu yang disembunyikan darimu" — dan bidang
 * polos di antara keduanya membuat perpindahan terasa punya JEDA, bukan punya
 * arah.
 *
 * Yang sekarang cuma SATU arah. Konten yang sedang dibaca tetap di tempatnya,
 * dan 3D ruangan tujuan tumbuh menembusnya kotak demi kotak sampai penuh.
 * Tidak ada satu frame pun yang polos: sebelum sebuah kotak terisi 3D, yang
 * terlihat di situ adalah halaman yang tadi dibaca. Perpindahan ruangannya
 * sendiri terjadi di bawah kotak pertama, sebelum ada apa pun yang bergerak.
 *
 * ⚠️ Komponen ini tidak menggambar 3D-nya, dan itu inti kemurahannya: 3D-nya
 * memang SUDAH ADA di belakang konten (Hero bersaudara dengan <main> di
 * SiteLayout, bukan di dalamnya). Yang dikerjakan di sini cuma bentuk clip
 * yang membuka; Hero yang memakukan canvas-nya dan menunjuk clip itu.
 *
 * ⚠️ Hanya jalur konten yang lewat sini. Dari hero (`heroInView`) dan dari
 * waypoint 3D, camera fly SENGAJA dipertahankan — gerbangnya ada di
 * `Navbar.goRoom`, bukan di sini.
 */

/**
 * Sapuan, ms — jarak antara kotak pertama & terakhir MULAI membesar.
 *
 * Kotak terakhir baru selesai di `SWEEP_MS + JITTER_MS + TILE_MS`. Dulu ada dua
 * angka (380 menutup, 450 membuka) karena dua fase itu menjawab hal yang
 * berbeda. Satu arah = satu jawaban: cukup cepat untuk terbaca sebagai respons
 * atas klik, cukup lambat untuk kisinya sempat terbaca sebagai kisi.
 *
 * 420 ternyata masih di sisi "respons" dari tawar-menawar itu — sapuannya
 * lewat sebelum kisinya sempat dinikmati (20 Agu). 600 masih kurang; 800
 * angka yang dipilih Keano setelah melihat keduanya.
 */
const SWEEP_MS = 800;

/**
 * Durasi SATU kotak membesar, ms.
 *
 * Sengaja pendek: pop keras. Kotak yang tumbuh 300 ms saling tumpang tindih
 * sampai belasan kotak setengah-jadi sekaligus, dan yang terbaca bukan kisi
 * melainkan sobekan yang merambat. 80 ms membuat tiap kotak jadi satu kejadian
 * diskret — itu yang bikin kisinya terasa sebagai KOTAK.
 */
const TILE_MS = 80;

/**
 * Kelonggaran jaring pengaman pendaratan, ms.
 *
 * ⚠️ Pendaratan TIDAK lagi dijadwalkan `SWEEP_MS + JITTER_MS + TILE_MS` — itu
 * angka yang benar di atas kertas dan salah di layar, dan salahnya terpotret
 * 19 Agu: pada 740 ms route sudah bertukar sementara belasan kotak masih
 * kosong, jadi lubang-lubang itu memperlihatkan halaman BARU yang sudah
 * melompat ke puncak. Persis kedipan yang mau dihilangkan, cuma kebalikannya.
 *
 * Sebabnya dua jam yang berbeda. Timer dihitung dari saat `setOpen(true)`
 * dipanggil di JS; `transition-delay` dihitung dari saat browser MELUKIS
 * perubahan gaya itu. Di antara keduanya ada commit React, perhitungan gaya
 * untuk ratusan rect, dan — di transisi ini — kerja menggambar ruangan baru.
 * Jaraknya terukur puluhan milidetik dan tidak dijamin apa pun.
 *
 * Jadi yang mendaratkan sekarang `transitionend` kotak terakhir: satu-satunya
 * sinyal yang berasal dari jam yang benar. Timer tetap ada untuk keadaan yang
 * tidak pernah mengirim event itu — tab disembunyikan di tengah transisi,
 * transisi dimatikan paksa oleh ekstensi/DevTools — dengan kelonggaran yang
 * sengaja longgar, karena ia bukan lagi jalur normal.
 */
const LAND_NET_MS = 400;

/**
 * Jeda setelah mendarat sebelum semuanya dilepas, ms.
 *
 * Yang ditunggu: bidang pita HP (lihat `rowsStrip` di gridReveal.ts) memudar
 * memperlihatkan puncak konten baru. Di desktop tidak ada bidang apa pun, jadi
 * jeda ini murni ongkos — dibiarkan tetap satu jalur karena 180 ms tak terasa,
 * dan karena ia kebetulan mengerjakan sesuatu yang berguna di SEMUA lebar
 * layar: menahan `pendingRoom` sedikit lebih lama supaya frameloop tetap
 * "always" sampai IntersectionObserver Hero sempat menyalakan `heroInView`
 * sendiri (INVARIANTS §7). Tanpa jeda itu ada 1-2 frame di mana tak satu pun
 * dari keduanya menyala dan render loop berhenti tepat setelah mendarat.
 */
const SETTLE_MS = 180;

/**
 * Batas waktu menunggu frame ruangan baru, ms.
 *
 * Ini JARING PENGAMAN, bukan jadwal — jalur normalnya selesai dalam 2 frame.
 * Yang ditanggungnya keadaan di mana penghitung frame tidak akan pernah maju:
 * chunk <Scene> gagal dimuat (ChunkBoundary), tab disembunyikan di tengah
 * transisi (rAF berhenti), atau WebGL context hilang.
 *
 * Tanpa ini semua keadaan itu berakhir sama: sapuan tidak pernah mulai, dan
 * navbar tampak mati total karena `pendingRoom` tidak pernah dibersihkan.
 * Lebih baik menyingkap sesuatu yang belum siap daripada tidak menyingkap sama
 * sekali. Alasan yang sama dengan jaring pengaman 3 detik di revealSweep.
 */
const FRAME_WAIT_MS = 300;

/**
 * Berapa frame yang harus TERGAMBAR sebelum sapuan mulai.
 *
 * Dua, bukan satu. Frame pertama setelah R3F resume bisa jadi frame yang sudah
 * antre sejak sebelum kamera dijepret — menyapu di situ berarti memperlihatkan
 * ruangan LAMA. Frame kedua dijamin digambar dengan posisi kamera yang baru,
 * dan dengan canvas yang sudah selesai menyesuaikan diri kalau lebar viewport
 * sempat berubah saat gulir dikunci.
 */
const FRAMES_NEEDED = 2;

/** Bentuk & jadwal satu sapuan — dihitung sekali, saat sapuannya dimulai. */
type Session = {
  room: RoomKey;
  cols: number;
  rowsBand: number;
  rowsStrip: number;
  /** Lebar sel, px. Pecahan — sengaja, supaya kisinya menutupi lebar PERSIS. */
  cellW: number;
  /** Tinggi sel di dalam pita hero, px. */
  cellH: number;
  /** Tinggi pita hero, px — batas bawah canvas yang dipaku. */
  bandH: number;
  /** Delay tiap sel: pita 3D dulu (row-major), lalu pita sisa. */
  delays: number[];
};

/**
 * ⚠️ Dipanggil SAAT RENDER, bukan di dalam effect — dan itu bukan kelalaian.
 *
 * Hero memasang `clip-path: url(#grid-reveal-clip)` pada commit yang SAMA
 * dengan saat `pendingRoom` terisi. Kalau `<clipPath>`-nya baru lahir satu
 * commit kemudian (effect), ada satu frame di mana rujukan itu menunjuk ke
 * elemen yang belum ada — dan peramban tidak sepakat soal artinya: sebagian
 * menyembunyikan elemennya (kebetulan benar), sebagian mengabaikan clip-nya
 * dan menggambar canvas UTUH. Yang kedua berarti satu frame penuh ruangan lama
 * menyala di tengah konten, persis kedipan yang seluruh berkas ini ada untuk
 * mencegahnya.
 *
 * Dihitung sekali per sapuan lewat pola "sesuaikan state saat render": begitu
 * `session.room` sudah sama dengan `pendingRoom`, ia tidak dipanggil lagi.
 */
function openSession(room: RoomKey): Session {
  /**
   * Tinggi pita 3D = tinggi seksi hero yang sebenarnya, DIUKUR, bukan ditebak.
   * `h-[70dvh] md:h-dvh` bergantung breakpoint DAN pada tinggi viewport
   * dinamis yang berubah saat bilah URL HP muncul/hilang — dua hal yang tidak
   * bisa diturunkan dari `window.innerWidth` sendirian.
   */
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let bandH =
    document.getElementById(HERO_SECTION_ID)?.getBoundingClientRect().height ||
    vh;

  // `100dvh` dan `window.innerHeight` tidak selalu bulat ke angka yang sama,
  // jadi di desktop pengukuran bisa meleset satu-dua piksel dari tinggi layar.
  // Tanpa ambang ini sisa 1px itu jadi SATU BARIS PENUH bidang pita setinggi
  // satu piksel — tak terlihat, tapi ia ikut memakan jatah kotak dan membuat
  // cabang "HP" menyala di desktop.
  if (vh - bandH < 8) bandH = vh;

  // Tinggi pita sisa tidak dihitung di sini: `bandGrid` menurunkannya sendiri
  // dari (vh − bandH). Satu tempat saja yang tahu rumusnya.
  const g = bandGrid(vw, vh, bandH);

  /**
   * SATU kocokan untuk pita 3D dan pita sisa sekaligus, bukan dua.
   *
   * Kalau masing-masing dikocok sendiri, keduanya punya laju penuh sendiri dan
   * yang terbaca dua kejadian yang kebetulan bersamaan. Satu kocokan lintas
   * keduanya membuat sapuannya satu kejadian yang melintasi layar — termasuk
   * melintasi batas bawah hero, yang justru batas yang paling ingin
   * disamarkan.
   */
  const count = g.cols * (g.rowsBand + g.rowsStrip);

  return {
    room,
    cols: g.cols,
    rowsBand: g.rowsBand,
    rowsStrip: g.rowsStrip,
    cellW: vw / g.cols,
    cellH: bandH / g.rowsBand,
    bandH,
    delays: shuffledDelays(count, SWEEP_MS, Math.random),
  };
}

export default function GridReveal() {
  const pendingRoom = useSceneStore((s) => s.pendingRoom);
  const clearRoomTransition = useSceneStore((s) => s.clearRoomTransition);
  const goTo = useSceneStore((s) => s.goTo);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const reduced = useReducedMotion();

  const [session, setSession] = useState<Session | null>(null);
  /** Kotak sedang membesar? Perubahan nilainyalah yang memicu transisi CSS. */
  const [open, setOpen] = useState(false);
  /** Sudah mendarat — bidang pita HP mulai memudar memperlihatkan konten baru. */
  const [landed, setLanded] = useState(false);

  /**
   * Jembatan dari `onTransitionEnd` di JSX ke `land()` yang hidup di dalam
   * effect (di sanalah `cancelled` & `room` berada). Ref, bukan state: yang
   * lewat sini bukan sesuatu yang perlu dirender.
   */
  const landRef = useRef<(() => void) | null>(null);
  /** Berapa kotak yang sudah SELESAI membesar di sesi ini. */
  const doneRef = useRef(0);

  // Sesi baru dibuka SAAT RENDER supaya <clipPath>-nya lahir di commit yang
  // sama dengan clip-path yang menunjuknya (lihat openSession). React
  // membuang hasil render ini dan mengulangnya dengan state yang sudah baru.
  if (pendingRoom && !reduced && session?.room !== pendingRoom) {
    setSession(openSession(pendingRoom));
    setOpen(false);
    setLanded(false);
  }

  useEffect(() => {
    if (!pendingRoom) return;
    const room = pendingRoom;

    let cancelled = false;
    let raf = 0;
    const timers: number[] = [];

    /**
     * Tukar ruangannya SEKARANG, sebelum ada satu kotak pun yang membesar.
     *
     * Gabungan geometri clip masih kosong, jadi canvas belum terlihat sama
     * sekali — teleport kamera, penyesuaian ukuran canvas, dan frame pertama
     * ruangan baru semuanya terjadi di balik layar yang masih sepenuhnya
     * menampilkan konten.
     *
     * ⚠️ `navigate` TIDAK ikut di sini, dan itu inti dari urutannya. Mengganti
     * route sekarang akan meng-unmount konten yang justru sedang disapu; yang
     * terlihat: halaman berkedip jadi puncak halaman baru, lalu kotak-kotak 3D
     * membuka di atasnya. Route baru menyusul di `land()`, di balik 3D yang
     * sudah penuh.
     */
    setScrollLocked(true);
    goTo?.(room, { instant: true });

    // Jalur reduced-motion tidak pernah sampai ke sini dalam praktiknya: Hero
    // tidak me-mount <Scene> di sana, jadi `goTo` null dan Navbar sudah jatuh
    // ke jalur lamanya. Dibiarkan sebagai penurunan yang jujur kalau suatu saat
    // ada pemanggil lain — pindah tanpa gerakan apa pun, bukan sapuan cepat.
    if (reduced) {
      jumpToTop();
      navigate(pathFor(room));
      timers.push(window.setTimeout(clearRoomTransition, SETTLE_MS));
      return () => {
        cancelled = true;
        timers.forEach(clearTimeout);
        setScrollLocked(false);
      };
    }

    /**
     * Mendarat: route diganti & halaman dilompatkan ke puncak, keduanya di
     * balik layar yang sudah sepenuhnya 3D.
     *
     * ⚠️ `jumpToTop`, BUKAN `scrollToTop`. Gulir sedang dikunci oleh transisi
     * ini sendiri, dan kunci itu menolak `scrollToTop()` tanpa bersuara —
     * lihat catatannya di smoothScroll.ts.
     *
     * `goTo` sudah dijalankan di awal effect, jadi `currentRoom` sudah bernilai
     * baru saat `navigate` membangunkan Arah 1 di RoomRouteSync — tidak ada
     * tween 1400 ms yang menyusul. (RoomRouteSync juga masih melihat
     * `pendingRoom` terisi di sini dan menahan diri; dua pagar untuk satu
     * lubang yang pernah kejadian.)
     *
     * Berhenti di `setLanded`: yang MEMBERESKAN transisi ada di effect
     * terpisah di bawah, karena syarat selesainya bukan waktu melainkan
     * "router sudah benar-benar merender tujuannya".
     */
    let didLand = false;
    const land = () => {
      // Idempoten: `transitionend` dan jaring pengaman bisa datang dua-duanya,
      // dan `navigate` yang jalan dua kali menumpuk dua entri riwayat untuk
      // satu klik — tombol Back lalu terasa "tidak mempan sekali".
      if (cancelled || didLand) return;
      didLand = true;
      jumpToTop();
      navigate(pathFor(room));
      setLanded(true);
    };
    doneRef.current = 0;
    landRef.current = land;

    /** Tunggu ruangan baru benar-benar TERGAMBAR — lihat frameTick.ts. */
    const waitForFrames = (done: () => void) => {
      const from = frameCount();
      const startedAt = performance.now();
      const poll = () => {
        if (cancelled) return;
        const drawn = frameCount() - from >= FRAMES_NEEDED;
        const timedOut = performance.now() - startedAt >= FRAME_WAIT_MS;
        if (drawn || timedOut) {
          done();
          return;
        }
        raf = requestAnimationFrame(poll);
      };
      raf = requestAnimationFrame(poll);
    };

    /**
     * Dua rAF bersarang, bukan satu.
     *
     * Kotak-kotaknya baru ada di DOM setelah commit React berikutnya. rAF
     * pertama menunggu commit itu; rAF kedua memberi browser satu frame untuk
     * menghitung gaya AWAL-nya (`scale(0)`). Tanpa frame kedua, scale 0 dan 1
     * mendarat di perhitungan gaya yang sama dan transisinya DILEWATI — 3D
     * muncul seketika tanpa kisi, dan bug ini tampak seperti "CSS-nya salah".
     */
    waitForFrames(() => {
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => {
          if (cancelled) return;
          setOpen(true);
          timers.push(
            window.setTimeout(
              land,
              SWEEP_MS + JITTER_MS + TILE_MS + LAND_NET_MS,
            ),
          );
        });
      });
    });

    return () => {
      cancelled = true;
      landRef.current = null;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      setScrollLocked(false);
    };
    // `goTo` & `navigate` sengaja TIDAK jadi dependensi. Keduanya identitas yang
    // bisa berubah di tengah transisi (goTo terdaftar ulang saat Scene remount),
    // dan effect ini menjalankan URUTAN BERWAKTU — mengulangnya dari awal di
    // tengah jalan berarti sapuannya patah balik ke nol. Nilai yang terbaca saat
    // dipanggil sudah benar karena closure-nya menutupi, bukan menyalin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRoom, reduced, clearRoomTransition]);

  /**
   * Beres-beres: melepas `pendingRoom` (yang lalu melepas pin canvas, clip,
   * gerbang frameloop, dan kunci gulir lewat cleanup effect di atas).
   *
   * ⚠️ Digerbangi `pathname`, BUKAN cuma timer setelah `navigate`. Alasannya
   * satu jenis dengan gerbang `pendingRoom` di RoomRouteSync, dan sama
   * halusnya: `navigate` masuk lewat state biasa milik router, sementara
   * `clearRoomTransition` masuk lewat zustand yang dipaksa SYNC LANE. React
   * boleh — dan memang — memproses yang kedua lebih dulu. Di commit antara itu
   * `pendingRoom` sudah kosong sementara pathname masih halaman lama, dan itu
   * persis bentuk yang dibaca Arah 1 RoomRouteSync sebagai "pengunjung menekan
   * Back": ia memanggil `goTo` biasa dan menyeret kamera BALIK ke ruangan asal
   * dengan tween 1400 ms — tepat yang seluruh fitur ini hilangkan.
   *
   * Menunggu `pathname` benar-benar sama dengan tujuannya menutup celah itu
   * pada sumbernya: begitu gerbangnya dibuka, tidak ada lagi yang tidak
   * sinkron untuk dibaca siapa pun. Tertangkap GridReveal.test.tsx.
   *
   * `SETTLE_MS` sesudahnya barulah soal tampilan — lihat catatannya di atas.
   */
  useEffect(() => {
    if (!landed || !pendingRoom) return;
    if (pathname !== pathFor(pendingRoom)) return;
    const t = window.setTimeout(clearRoomTransition, SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [landed, pendingRoom, pathname, clearRoomTransition]);

  if (!pendingRoom || reduced || !session) return null;

  const { cols, rowsBand, rowsStrip, cellW, cellH, bandH, delays } = session;
  const bandCount = cols * rowsBand;
  const bleed = CLIP_BLEED_PX;

  return (
    <>
      {/*
        Wadah `<clipPath>`. Isinya tidak pernah digambar sendiri — ia cuma
        ditunjuk `clip-path: url(#…)` dari pembungkus canvas di Hero. `fixed`
        berukuran nol supaya ia mustahil menambah tinggi dokumen (INVARIANTS §8).

        `clipPathUnits="userSpaceOnUse"` = koordinat kotak-kotak di bawah dibaca
        dalam sistem koordinat ELEMEN YANG MENUNJUKNYA, yaitu border box canvas
        yang sudah dipaku ke pojok kiri-atas viewport. Jadi koordinat viewport
        bisa dipakai apa adanya. Tanpa ini (default `objectBoundingBox`) semua
        angka harus dinormalkan ke 0..1 dan kotaknya ikut melar mengikuti rasio
        layar.
      */}
      <svg
        aria-hidden="true"
        data-testid="grid-reveal"
        width="0"
        height="0"
        style={{ position: "fixed", width: 0, height: 0, overflow: "hidden" }}
        /*
          Pendaratan digerakkan kotak TERAKHIR yang selesai, bukan timer —
          alasan lengkapnya di LAND_NET_MS. `transitionend` menggelembung dari
          tiap <rect> ke sini, jadi satu pendengar cukup untuk ratusan kotak.

          Disaring `propertyName`: kalau kelak ada properti lain yang ikut
          ditransisikan di kotak-kotak ini, hitungannya akan penuh sebelum
          waktunya dan sapuannya mendarat separuh jalan. Bug yang persis sama
          dengan yang barusan dibetulkan, cuma sebabnya berbeda.
        */
        onTransitionEnd={(e) => {
          if (e.propertyName !== "transform") return;
          if (++doneRef.current < bandCount) return;
          landRef.current?.();
        }}
      >
        <defs>
          <clipPath id={CLIP_ID} clipPathUnits="userSpaceOnUse">
            {Array.from({ length: bandCount }, (_, i) => {
              const col = i % cols;
              const row = Math.floor(i / cols);
              return (
                <rect
                  key={i}
                  x={col * cellW - bleed}
                  y={row * cellH - bleed}
                  width={cellW + bleed * 2}
                  height={cellH + bleed * 2}
                  style={{
                    /* fill-box + center = kotak tumbuh dari TENGAHNYA sendiri.
                       Tanpa transform-box, `transform-origin: center` diukur
                       terhadap viewport SVG (yang di sini 0×0), jadi semua
                       kotak menyusut ke pojok kiri-atas layar dan yang terlihat
                       satu kotak merambat, bukan kisi yang mengisi. */
                    transformBox: "fill-box",
                    transformOrigin: "center",
                    transform: open ? "scale(1)" : "scale(0)",
                    transition: `transform ${TILE_MS}ms linear`,
                    transitionDelay: `${delays[i]}ms`,
                  }}
                />
              );
            })}
          </clipPath>
        </defs>
      </svg>

      {/*
        Pita sisa di bawah hero — HP saja (lihat `rowsStrip` di gridReveal.ts).
        Bidang polos, bukan 3D: di bawah batas hero memang tidak ada 3D untuk
        disingkap. Ia ikut kocokan yang sama supaya batas hero tidak terbaca
        sebagai garis pemisah dua animasi, lalu memudar setelah mendarat —
        saat itu yang ada di belakangnya sudah puncak halaman baru.
      */}
      {rowsStrip > 0 && (
        <div
          aria-hidden="true"
          data-testid="grid-reveal-strip"
          className="fixed inset-x-0 bottom-0 z-20 grid"
          style={{
            top: bandH,
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rowsStrip}, 1fr)`,
            opacity: landed ? 0 : 1,
            transition: landed ? `opacity ${SETTLE_MS}ms ease-out` : "none",
          }}
        >
          {Array.from({ length: cols * rowsStrip }, (_, i) => (
            <div
              key={i}
              style={{
                background: "var(--background)",
                /* Kotaknya MENYATU. `1fr` membagi sisa piksel dalam pecahan,
                   jadi tepi antar-kotak sering jatuh di tengah piksel dan
                   menyisakan garis rambut yang tembus ke konten di baliknya.
                   `outline` menutupnya karena digambar DI LUAR kotak tanpa
                   memengaruhi layout — `border` akan menggeser seluruh kisi. */
                outline: "1px solid var(--background)",
                opacity: open ? 1 : 0,
                transition: `opacity ${TILE_MS}ms linear`,
                transitionDelay: `${delays[bandCount + i]}ms`,
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
