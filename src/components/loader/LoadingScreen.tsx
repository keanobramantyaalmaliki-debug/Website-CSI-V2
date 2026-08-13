"use client";

import { useEffect, useRef, useState } from "react";
import { useSceneStore } from "@/lib/store/sceneStore";
import { createIntroAnimation, type IntroAnimation } from "./introAnimation";
import type { FromWorker, ToWorker } from "./introMessages";

/**
 * Overlay loading — panggung animasi isometrik yang menutupi layar sampai
 * kantor 3D benar-benar siap tampil.
 *
 * ── Dua lapis, dan pembagiannya penting ─────────────────────────────────────
 *   1. <div> putih  — latar. Memudar jadi transparan lewat transisi CSS.
 *   2. <canvas>     — lingkaran hitam + batang, TRANSPARAN di luar lingkaran.
 *
 * Latar putih sengaja BUKAN fillRect di kanvas. Kalau ia ikut digambar di
 * kanvas, ia harus ikut dipudarkan oleh worker; sebagai elemen DOM, peredupannya
 * ditangani compositor dan tetap mulus walau main thread sibuk. Ini juga alasan
 * transisi CSS dipilih ketimbang memperkenalkan AnimatePresence, yang belum
 * dipakai di mana pun di repo ini (Navbar sudah pakai transition-opacity biasa).
 *
 * ── z-[60] ──────────────────────────────────────────────────────────────────
 * Skala z proyek ini: Navbar 50, BilliardHUD 30, petunjuk scroll Hero 10
 * (terdokumentasi di BilliardHUD.tsx:16-17). Loader harus menutupi SEMUANYA
 * termasuk navbar, jadi ia satu-satunya penghuni di atas 50.
 */

/**
 * Lama peredupan latar putih (ms).
 *
 * Sengaja LEBIH PENDEK dari OUTRO_MS (900) di introAnimation.ts, dan itu
 * disengaja: putihnya hilang duluan sehingga kantor sudah tersingkap saat
 * lingkaran hitam masih mengkerut di tengah. Kalau dibalik — putih bertahan
 * sampai lingkaran habis — akan ada momen layar putih polos, lalu terpotong
 * mendadak ke kantor yang gelap. Silau, dan mata harus menyesuaikan dua kali.
 */
const BG_FADE_MS = 600;

/**
 * ⚠️ `transferControlToOffscreen()` hanya boleh dipanggil SEKALI seumur hidup
 * sebuah elemen canvas — panggilan kedua melempar InvalidStateError.
 *
 * React memakai ULANG elemen DOM yang sama di antara dua pemanggilan efek
 * StrictMode, jadi penandanya ditempel pada ELEMEN-nya, bukan pada ref
 * komponen. Itu yang membuat penjagaan ini tetap benar sekalipun komponennya
 * di-mount ulang dari awal.
 */
type Tagged = HTMLCanvasElement & { __offscreenTaken?: boolean };

/**
 * Teks progres unduhan office.glb — satu baris kecil di bawah lingkaran.
 *
 * Lahir dari pengukuran deploy publik 13 Agu: origin ~50 KB/s berarti 13MB =
 * 4+ menit, dan selama itu animasi loader TANPA angka terbaca sebagai "stuck".
 * Angkanya byte sungguhan dari officeModel.ts (bukan useProgress drei yang
 * per-item — untuk satu file raksasa ia diam bermenit-menit).
 *
 * Elemen DOM, bukan gambar di kanvas: kanvasnya milik worker, dan mengirim
 * progres ke sana berarti menambah protokol pesan + font rendering di worker
 * demi satu baris teks. Compositor menangani DOM ini tanpa peduli main thread
 * sibuk — alasan yang sama dengan latar putih di atas.
 */
function ModelProgress() {
  const modelLoad = useSceneStore((s) => s.modelLoad);
  if (!modelLoad) return null;

  const { loaded, total } = modelLoad;
  let label: string;
  if (total > 0 && loaded < total) {
    label = `loading 3d office — ${Math.floor((loaded / total) * 100)}%`;
  } else if (total === 0) {
    // Content-Length tak diketahui (proxy yang membuang header) — tunjukkan
    // byte berjalan supaya tetap kelihatan hidup.
    label = `loading 3d office — ${(loaded / 1048576).toFixed(1)} mb`;
  } else {
    // Unduhan tuntas tapi sceneReady belum: three sedang parse + kompilasi
    // shader (~2,3 dtk, lihat sceneStore.ts). Jangan diam di "100%".
    label = "preparing…";
  }

  return (
    <div className="absolute inset-x-0 bottom-10 text-center text-[11px] tracking-[0.35em] text-zinc-500 uppercase tabular-nums">
      {label}
    </div>
  );
}

export default function LoadingScreen() {
  const sceneReady = useSceneStore((s) => s.sceneReady);
  const setLoaderDone = useSceneStore((s) => s.setLoaderDone);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** Kanal ke worker; null saat berjalan di jalur cadangan main-thread. */
  const workerRef = useRef<Worker | null>(null);
  /** Animasi jalur cadangan; null saat memakai worker. */
  const localRef = useRef<IntroAnimation | null>(null);
  const rafRef = useRef<number | null>(null);

  /** true = overlay sudah tidak dirender sama sekali. */
  const [gone, setGone] = useState(false);

  /** Latar putih memudar tepat saat kantor siap — turunan langsung, bukan
   *  state tersendiri. */
  const fading = sceneReady;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;

    /** Outro tuntas → lepas overlay dan buka gerbang sapuan. */
    const finish = () => {
      if (disposed) return;
      workerRef.current?.terminate();
      workerRef.current = null;
      localRef.current = null;
      setGone(true);
      setLoaderDone(true);
    };

    const onResize = () => {
      if (disposed) return;
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextW = window.innerWidth;
      const nextH = window.innerHeight;

      const msg: ToWorker = {
        type: "resize",
        width: nextW,
        height: nextH,
        dpr: nextDpr,
      };
      workerRef.current?.postMessage(msg);

      const el = canvasRef.current;
      if (localRef.current && el && !(el as Tagged).__offscreenTaken) {
        el.width = Math.round(nextW * nextDpr);
        el.height = Math.round(nextH * nextDpr);
        localRef.current.resize(nextW, nextH, nextDpr);
      }
    };

    window.addEventListener("resize", onResize);

    /**
     * ── Penjagaan StrictMode, dan kenapa bentuknya begini ───────────────────
     * StrictMode (main.tsx) menjalankan efek dua kali di dev: pasang → bongkar
     * → pasang lagi, dengan INSTANCE KOMPONEN YANG SAMA. Karena instance-nya
     * sama, isi useRef ikut bertahan — dan itu yang dipakai di sini sebagai
     * penanda "sudah pernah dijalankan".
     *
     * Tanpa ini bug-nya fatal di dev: pemanggilan pertama memindahkan kendali
     * kanvas ke worker (transferControlToOffscreen hanya boleh SEKALI seumur
     * hidup elemen), lalu cleanup mematikan worker-nya. Di pemanggilan kedua,
     * jalur worker ditolak karena kanvasnya sudah terpakai DAN jalur cadangan
     * juga tidak bisa menggambar ke kanvas yang sama — hasilnya layar putih
     * kosong tanpa animasi sama sekali.
     *
     * Karena itu worker sengaja TIDAK dimatikan saat cleanup; ia dimatikan di
     * finish(), saat animasinya memang sudah selesai.
     */
    if (workerRef.current) {
      // Worker masih hidup dari pemanggilan sebelumnya — cukup arahkan ulang
      // pesannya ke closure finish() yang baru.
      workerRef.current.onmessage = (e: MessageEvent<FromWorker>) => {
        if (e.data.type === "done") finish();
      };
      return () => {
        disposed = true;
        window.removeEventListener("resize", onResize);
      };
    }

    if (localRef.current) {
      // Jalur cadangan: animasinya masih ada, cuma loop rAF-nya ikut terhenti
      // di cleanup. Jalankan lagi.
      const anim = localRef.current;
      const resume = () => {
        if (disposed) return;
        anim.frame(performance.now());
        if (anim.isFinished()) {
          finish();
          return;
        }
        rafRef.current = requestAnimationFrame(resume);
      };
      rafRef.current = requestAnimationFrame(resume);
      return () => {
        disposed = true;
        window.removeEventListener("resize", onResize);
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      };
    }

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // dpr dibatasi 2: di layar 3x, kanvas seukuran layar penuh berarti ~9×
    // piksel untuk gambar yang isinya cuma satu lingkaran dan 36 garis. Tidak
    // ada bedanya di mata, tapi ongkos fill-rate-nya nyata.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    const tagged = canvas as Tagged;

    const canOffscreen =
      typeof canvas.transferControlToOffscreen === "function" &&
      typeof Worker !== "undefined" &&
      !tagged.__offscreenTaken;

    if (canOffscreen) {
      try {
        const offscreen = canvas.transferControlToOffscreen();
        tagged.__offscreenTaken = true;

        const worker = new Worker(
          new URL("./intro.worker.ts", import.meta.url),
          { type: "module" },
        );
        workerRef.current = worker;

        worker.onmessage = (e: MessageEvent<FromWorker>) => {
          if (e.data.type === "done") finish();
        };

        const init: ToWorker = {
          type: "init",
          canvas: offscreen,
          width,
          height,
          dpr,
          reduced,
        };
        // offscreen WAJIB ikut daftar transfer (argumen kedua): ia objek yang
        // dipindahkan, bukan disalin. Tanpa itu postMessage melempar.
        worker.postMessage(init, [offscreen]);

        // Kalau kantor ternyata SUDAH siap sebelum worker sempat dibuat (aset
        // ter-cache penuh, muat kedua), efek pemicu keluar di bawah sudah
        // terlanjur jalan dan pesan outro-nya terkirim ke worker yang belum ada
        // — hilang tanpa jejak. Susul di sini, kalau tidak outro-nya cuma
        // ditutup paksa oleh jaring pengaman 1500 ms: kantor muncul mendadak,
        // bukan dengan lingkaran yang mengkerut.
        if (useSceneStore.getState().sceneReady) {
          const outro: ToWorker = { type: "outro" };
          worker.postMessage(outro);
        }
      } catch {
        // Kalau apa pun di atas gagal, jangan biarkan pengunjung terjebak di
        // layar putih kosong — turun ke jalur main-thread.
        startLocal();
      }
    } else {
      startLocal();
    }

    /**
     * Jalur cadangan: gambar langsung di main thread.
     *
     * Dipakai di browser tanpa OffscreenCanvas (Safari <16.4), dan saat elemen
     * kanvasnya sudah "terpakai" oleh pemanggilan efek sebelumnya di StrictMode.
     *
     * ⚠️ Di jalur ini animasinya TETAP MEMBEKU ~2,3 detik saat three
     * mengompilasi shader — itu memang yang tidak bisa dihindari tanpa worker.
     * Membeku masih lebih baik daripada tidak ada animasi sama sekali, tapi
     * jangan dianggap setara.
     */
    function startLocal() {
      if (disposed) return;
      const el = canvasRef.current;

      // Kanvas yang kendalinya sudah dipindah ke worker tidak bisa dipakai lagi
      // di sini — getContext() akan melempar.
      //
      // Kalau sampai di sini, artinya jalur worker gagal SETELAH transfer
      // terlanjur terjadi, jadi tidak ada satu pun jalur yang bisa menggambar.
      // Lepas overlay sekarang juga: layar putih tanpa animasi masih jauh lebih
      // baik daripada layar putih yang menutupi kantor SELAMANYA.
      if (!el || (el as Tagged).__offscreenTaken) {
        finish();
        return;
      }

      el.width = Math.round(width * dpr);
      el.height = Math.round(height * dpr);
      const ctx = el.getContext("2d", { alpha: true });
      if (!ctx) {
        finish();
        return;
      }

      const anim = createIntroAnimation({ ctx, width, height, dpr, reduced });
      localRef.current = anim;

      // Sama seperti di jalur worker: susul outro yang terlanjur terkirim
      // sebelum animasinya ada.
      if (useSceneStore.getState().sceneReady) {
        anim.startOutro(performance.now());
      }

      const tick = () => {
        if (disposed) return;
        anim.frame(performance.now());
        if (anim.isFinished()) {
          finish();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }

    // ⚠️ worker & localRef sengaja TIDAK dibersihkan di sini — lihat catatan
    // penjagaan StrictMode di atas. Keduanya dilepas di finish(), saat
    // animasinya memang sudah selesai.
    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [setLoaderDone]);

  // ── Pemicu keluar ────────────────────────────────────────────────────────
  // sceneReady datang dari useFrame di Office.tsx, yaitu SETELAH stall
  // kompilasi shader selesai — bukan dari useProgress yang 2,3 detik terlalu
  // dini. Lihat catatan di sceneStore.ts.
  //
  // Efek ini TIDAK menyetel state: peredupan diturunkan langsung dari
  // `sceneReady` saat render (lihat `fading` di bawah). Menyimpannya sebagai
  // state terpisah cuma menambah satu putaran render berantai untuk nilai yang
  // sudah kita punya — dan lint react-hooks/set-state-in-effect memang melarang
  // pola itu. Yang tersisa di sini murni efek samping ke sistem luar: mengabari
  // worker.
  useEffect(() => {
    if (!sceneReady) return;
    const msg: ToWorker = { type: "outro" };
    workerRef.current?.postMessage(msg);
    localRef.current?.startOutro(performance.now());
  }, [sceneReady]);

  /**
   * Jaring pengaman: kalau worker mati diam-diam atau pesan "done" tidak pernah
   * sampai, overlay akan menutupi kantor SELAMANYA — kegagalan terburuk yang
   * mungkin terjadi di komponen ini. Jadi begitu outro dipicu, dipasang batas
   * waktu yang melepasnya paksa.
   *
   * 1500 ms = OUTRO_MS (900) + BG_FADE_MS (600), jadi di jalur normal ia tidak
   * pernah menang; "done" dari worker selalu lebih dulu.
   */
  useEffect(() => {
    if (!sceneReady) return;
    const t = setTimeout(() => {
      setGone(true);
      setLoaderDone(true);
    }, 1500);
    return () => clearTimeout(t);
  }, [sceneReady, setLoaderDone]);

  if (gone) return null;

  return (
    <div
      className="fixed inset-0 z-[60]"
      // Overlay memblokir klik selama tampil — tanpa ini pengunjung bisa
      // mengklik waypoint 3D di balik layar putih.
      aria-hidden
    >
      <div
        className="absolute inset-0 bg-white transition-opacity ease-out"
        style={{
          opacity: fading ? 0 : 1,
          transitionDuration: `${BG_FADE_MS}ms`,
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* Ikut memudar bersama latar putih — teks abu di atas kantor gelap akan
          tampak nyangkut kalau ditinggal. */}
      <div
        className="absolute inset-0 transition-opacity ease-out"
        style={{
          opacity: fading ? 0 : 1,
          transitionDuration: `${BG_FADE_MS}ms`,
        }}
      >
        <ModelProgress />
      </div>
    </div>
  );
}
