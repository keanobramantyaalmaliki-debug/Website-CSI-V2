/**
 * Video di layar dalam kantor 3D — elemen `<video>` + `THREE.VideoTexture`.
 *
 * Pendamping `screens.ts`: yang itu memasang gambar DIAM ke material layar,
 * yang ini menyediakan sumber BERGERAK untuk material yang sama. Penyiapan
 * texture-nya sengaja dipakai bersama (`prepareScreenTexture`) supaya layar
 * video dan layar gambar tidak bisa menyimpang setelan pixel-art-nya.
 *
 * ── Kenapa cache di level MODUL, bukan useMemo ──────────────────────────────
 * React StrictMode (aktif di main.tsx) memanggil factory useMemo DUA KALI, dan
 * elemen `<video>` yang dibuang tidak ikut dibersihkan siapa pun — ia tidak
 * ada di DOM, jadi tidak ada unmount yang menghentikannya. Hasilnya satu video
 * yatim yang men-dekode selamanya di latar, dan tidak ada apa pun di layar
 * yang menunjukkannya. Cache modul membuat satu URL = satu elemen, apa pun
 * yang dilakukan React terhadap komponennya.
 *
 * ── Kenapa `<video>` tidak ditempel ke DOM ──────────────────────────────────
 * `VideoTexture` membaca frame lewat `texImage2D` langsung dari elemennya;
 * elemen itu tidak perlu ter-render, bahkan tidak perlu terpasang. Menempelkan
 * dan menyembunyikannya justru berisiko: `display:none` membuat sebagian
 * browser berhenti men-dekode sama sekali.
 */
import { VideoTexture, type Texture } from "three";
import { prepareScreenTexture } from "./screens";

interface Entry {
  el: HTMLVideoElement;
  tex: VideoTexture;
}

/** Satu entri per URL. Lihat catatan StrictMode di kepala berkas. */
const cache = new Map<string, Entry>();

/**
 * Apakah gerbang di Office.tsx SEDANG menghendaki video berjalan.
 *
 * Ada khusus untuk memenangkan satu balapan yang sudah menggigit sekali (5
 * Agu): priming di bawah menunggu event `loadeddata`, sedangkan gerbang
 * memanggil playScreenVideos() begitu pengunjung berada di ruangan Office.
 * Urutan keduanya ditentukan kecepatan jaringan, bukan oleh kode kita.
 *
 *   video cepat → loadeddata dulu → priming pause → gerbang play   ✅
 *   video lambat → gerbang play dulu → loadeddata → priming PAUSE  ❌ beku
 *
 * Gejalanya persis "video tidak jalan padahal ruangannya benar", dan ia
 * muncul-hilang mengikuti ukuran berkas — jenis bug yang menyesatkan orang
 * untuk menyalahkan videonya. Dengan bendera ini priming tahu bahwa ia datang
 * terlambat dan tidak boleh menghentikan apa yang sudah sengaja dimainkan.
 */
let wantPlaying = false;

/**
 * Ambil (atau buat) texture video untuk sebuah URL.
 *
 * Memanggilnya berkali-kali dengan URL yang sama mengembalikan texture yang
 * SAMA — aman dipanggil dari dalam render.
 */
export function getScreenVideo(url: string, flipX = false): Texture {
  const hit = cache.get(url);
  if (hit) return hit.tex;

  // createElement DI DALAM fungsi, bukan di badan modul: berkas ini ikut
  // ter-import oleh test yang berjalan di jsdom/node, dan badan modul yang
  // menyentuh `document` akan meledak saat impor — sebelum satu test pun
  // sempat memutuskan bahwa ia tidak butuh video.
  const el = document.createElement("video");
  el.src = url;
  el.loop = true;
  // muted WAJIB, dan bukan soal selera: browser menolak autoplay video
  // bersuara, jadi play() akan ditolak dan layarnya diam beku di frame
  // pertama. Video ini memang tidak punya trek audio sama sekali.
  el.muted = true;
  el.playsInline = true;
  el.preload = "auto";
  el.crossOrigin = "anonymous";

  const tex = new VideoTexture(el);
  // Setelan pixel-art yang sama persis dengan layar gambar — NearestFilter,
  // tanpa mipmap, sRGB, flipY=false, dan pembalikan horizontal.
  prepareScreenTexture(tex, flipX);

  // ── Pancing satu frame supaya layar tidak pernah hitam ───────────────────
  // Gerbang playback (Office.tsx) baru memutar video saat pengunjung berada di
  // ruangan Office, padahal START_ROOM adalah Lounge. Tanpa priming, tidak ada
  // satu pun frame yang ter-dekode sampai pengunjung sampai ke sana — dan
  // sampai itu terjadi three mengikat texture kosong 1×1 berisi nol
  // (WebGLState.js:439), yaitu HITAM. Gejalanya: layar MacBook hitam pekat
  // dari kejauhan, lalu tiba-tiba menyala saat kamera sampai.
  //
  // Main-lalu-pause sekali menyelesaikannya: satu frame masuk ke texture dan
  // tinggal di sana. `once` supaya tidak terulang tiap kali video di-seek.
  el.addEventListener(
    "loadeddata",
    () => {
      // Gerbang sudah menyuruh main duluan (video lambat dimuat) — jangan
      // sentuh. Lihat catatan balapan di `wantPlaying` di atas.
      if (wantPlaying) return;

      el.play().then(
        () => {
          // Cek ULANG: gerbang bisa saja menyala selama play() masih pending.
          // Tanpa pemeriksaan kedua ini, pause() di bawah tetap membekukan
          // video yang barusan sengaja dinyalakan.
          if (!wantPlaying) el.pause();
        },
        () => {
          // Autoplay ditolak sebelum ada interaksi — wajar, dan tidak fatal:
          // gerbang playback akan mencoba lagi nanti, saat itu biasanya sudah
          // ada klik/scroll yang membuka izinnya.
        },
      );
    },
    { once: true },
  );

  cache.set(url, { el, tex });

  // Pegangan DEV supaya gerbang pemutaran bisa DIUKUR, bukan cuma dipercaya.
  // Elemennya sengaja tidak ada di DOM (lihat kepala berkas), jadi
  // `document.querySelectorAll("video")` tidak menemukannya dan tidak ada cara
  // lain memeriksa dari luar apakah ia benar-benar berhenti saat pengunjung
  // scroll melewati hero — yaitu satu-satunya hal yang ingin dijamin di sini.
  //
  //   __screenVideos()  → [{ src, paused, t }]
  //
  // Dibungkus import.meta.env.DEV, jadi hilang dari bundle produksi.
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__screenVideos = () =>
      [...cache.entries()].map(([u, e]) => ({
        src: u.split("/").pop(),
        paused: e.el.paused,
        t: +e.el.currentTime.toFixed(2),
      }));
  }

  return tex;
}

/**
 * Mainkan semua video layar yang sudah dibuat.
 *
 * `play()` mengembalikan Promise yang DITOLAK kalau kebijakan autoplay browser
 * belum mengizinkan. Tanpa catch, penolakan itu muncul sebagai unhandled
 * rejection di konsol tiap kali pengunjung masuk ruangan — berisik, dan
 * menyamarkan error sungguhan.
 */
export function playScreenVideos(): void {
  // Disetel SEBELUM loop: kalau ada video yang masih memuat, priming-nya akan
  // membaca bendera ini dan tahu untuk tidak mem-pause balik.
  wantPlaying = true;
  for (const { el } of cache.values()) {
    if (!el.paused) continue;
    el.play().catch(() => {});
  }
}

/** Hentikan semua video layar. Idempoten. */
export function pauseScreenVideos(): void {
  wantPlaying = false;
  for (const { el } of cache.values()) {
    if (el.paused) continue;
    el.pause();
  }
}

/**
 * Buang semuanya. Hanya dipakai kalau seluruh scene dibongkar.
 *
 * Urutannya penting: `src = ""` + `load()` setelah pause — tanpa itu Chrome
 * menahan buffer video di memori sampai elemennya dikumpulkan GC, dan elemen
 * ini tidak ada di DOM sehingga tidak ada yang memicu pembersihan.
 */
export function disposeScreenVideos(): void {
  for (const { el, tex } of cache.values()) {
    tex.dispose();
    el.pause();
    el.removeAttribute("src");
    el.load();
  }
  cache.clear();
}
