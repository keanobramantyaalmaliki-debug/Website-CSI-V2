/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import {
  copyFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

// office.glb tinggal di /3d/models (root, di luar git & public/ — lihat .gitignore).
// Plugin ini menyajikannya di URL /3d/models/* untuk dev & vite preview; di produksi
// path yang sama diambil alih reverse proxy (MinIO). GLB kecil lain tetap lewat
// public/ — middleware ini hanya menangkap file yang benar-benar ada di foldernya.
const LOCAL_MODELS_DIR = fileURLToPath(new URL("3d/models", import.meta.url));
const MODELS_URL_PREFIX = "/3d/models/";

function serveLocalModels(): Plugin {
  const middleware = (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    const url = (req.url ?? "").split("?")[0];
    if (!url.startsWith(MODELS_URL_PREFIX)) return next();
    const file = path.join(
      LOCAL_MODELS_DIR,
      decodeURIComponent(url.slice(MODELS_URL_PREFIX.length)),
    );
    if (!file.startsWith(LOCAL_MODELS_DIR + path.sep) || !existsSync(file)) {
      return next();
    }
    const { size } = statSync(file);
    res.setHeader("Content-Type", "model/gltf-binary");
    // officeModel.ts sambung-ulang unduhan via Range — origin wajib melayaninya.
    res.setHeader("Accept-Ranges", "bytes");
    const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? "");
    if (range) {
      const start = Number(range[1]);
      const end = range[2] ? Number(range[2]) : size - 1;
      res.statusCode = 206;
      res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
      res.setHeader("Content-Length", end - start + 1);
      createReadStream(file, { start, end }).pipe(res);
    } else {
      res.setHeader("Content-Length", size);
      createReadStream(file).pipe(res);
    }
  };
  return {
    name: "serve-local-models",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

// content.json ditulis oleh CMS ke dist/ (lihat server/publish.ts) supaya
// perubahan tayang tanpa rebuild. Di dev, dist/ tidak disajikan sama sekali —
// tanpa middleware ini `bun run dev` selalu jatuh ke konten bawaan bundle dan
// hasil edit di panel admin tidak pernah kelihatan sampai di-build.
const CONTENT_FILE = fileURLToPath(new URL("dist/content.json", import.meta.url));

function serveContentJson(): Plugin {
  const middleware = (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    if ((req.url ?? "").split("?")[0] !== "/content.json") return next();
    // Belum pernah dipublish → biarkan 404. Situs memang dirancang jatuh ke
    // konten bundle di kasus ini, dan menyembunyikannya di dev berarti jalur
    // fallback tidak pernah teruji sebelum produksi.
    if (!existsSync(CONTENT_FILE)) return next();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-cache");
    createReadStream(CONTENT_FILE).pipe(res);
  };
  return {
    name: "serve-content-json",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

/**
 * Pasangan BUILD dari serveLocalModels: menyalin /3d/models/* ke dist/3d/models/.
 *
 * ── Kenapa ada ──────────────────────────────────────────────────────────────
 * Insiden 31 Agu di csi2.wibudev.com. `office.glb` sengaja tinggal di folder
 * root (di luar git & di luar public/), jadi `vite build` tidak pernah tahu ia
 * ada — dist yang dihasilkan tidak memuatnya. Produksi menjalankan
 * `serve dist/`, BUKAN `vite preview`, sehingga middleware di atas tidak ikut
 * hidup di sana. Hasilnya /3d/models/office.glb jatuh ke rewrite SPA di
 * public/serve.json dan dijawab **200 + index.html**, bukan 404 — jadi
 * officeModel.ts (yang cuma memeriksa `res.ok`) menelan HTML itu, menyerahkan
 * blob-nya ke GLTFLoader, dan tur 3D-nya mati dengan "Unexpected token '<'".
 *
 * Gejala ikutannya jauh dari sini dan tidak menunjuk balik sama sekali: Canvas
 * dilepas ChunkBoundary → CameraController unmount → klik navbar mental balik
 * ke Home (lihat catatan `registerGoTo` di CameraController.tsx).
 *
 * ── Kenapa penyalinan, bukan memindahkan file ke public/ ─────────────────────
 * Alasan file itu dikeluarkan 19 Agu masih berlaku: 13MB di dalam git membuat
 * tiap penggantian model memaksa commit + rebuild penuh. Yang salah bukan
 * lokasinya, melainkan tidak adanya yang menjembatani ke dist. Ini
 * jembatannya — file tetap di luar git, dan cukup ditaruh di server SEKALI;
 * setiap `bun run deploy` sesudahnya membawanya sendiri.
 *
 * ── Kenapa build DIGAGALKAN kalau file tidak ada ─────────────────────────────
 * Karena kegagalan diam-diamnya jauh lebih mahal. Tanpa penjaga ini, deploy
 * tetap "berhasil", pm2 restart bersih, dan yang rusak baru ketahuan dari
 * konsol pengunjung. Lebih baik `bun run deploy` berhenti dengan alasan yang
 * menyebut jalur filenya. Pelarian darurat: ALLOW_MISSING_OFFICE_GLB=1
 * (mis. build di mesin yang memang tidak memegang aset besar).
 */
function copyLocalModels(): Plugin {
  let outDir = "dist";
  return {
    name: "copy-local-models",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    // `closeBundle` — sesudah Vite selesai menulis dist. `writeBundle` juga
    // jalan setelah emptyOutDir, tapi closeBundle satu-satunya yang dijamin
    // tidak ikut dipanggil per-output kalau nanti ada build multi-target.
    closeBundle() {
      const files = existsSync(LOCAL_MODELS_DIR)
        ? readdirSync(LOCAL_MODELS_DIR).filter((f) => f.endsWith(".glb"))
        : [];

      if (!files.includes("office.glb")) {
        const pesan =
          `office.glb tidak ada di ${LOCAL_MODELS_DIR}.\n` +
          `Model 13MB itu di luar git (lihat .gitignore), jadi ia harus ditaruh ` +
          `di mesin ini SEKALI dengan scp/rsync:\n` +
          `  scp 3d/models/office.glb <server>:<repo>/3d/models/office.glb\n` +
          `Tanpa itu dist tidak memuat model dan tur 3D mati di produksi ` +
          `(SPA rewrite menjawabnya dengan index.html, bukan 404).\n` +
          `Sengaja dilewati? ALLOW_MISSING_OFFICE_GLB=1 bun run build`;
        if (!process.env.ALLOW_MISSING_OFFICE_GLB) this.error(pesan);
        this.warn(pesan);
      }

      const dest = path.join(outDir, "3d", "models");
      mkdirSync(dest, { recursive: true });
      for (const f of files) {
        const src = path.join(LOCAL_MODELS_DIR, f);
        copyFileSync(src, path.join(dest, f));
        console.log(
          `[copy-local-models] ${f} \u2192 dist/3d/models/ ` +
            `(${(statSync(src).size / 1048576).toFixed(1)} MB)`,
        );
      }
    },
  };
}

/**
 * Penjaga hasil Publish melewati build.
 *
 * `publish.ts` menulis content.json langsung ke dist/ (CONTENT_FILE di atas),
 * sedangkan `vite build` mengosongkan dist/ — jadi tiap build diam-diam
 * membuang hasil Publish terakhir, dan situs jatuh balik ke konten bundle
 * sampai Publish ditekan sekali lagi. Rutinitas "habis build/deploy wajib
 * Publish" itu gampang terlupa dan gagalnya tanpa galat: situs tetap tampil,
 * cuma isinya konten lama.
 *
 * Plugin ini memotret isi content.json SEBELUM Vite menghapus dist
 * (buildStart) dan menempelkannya kembali sesudah dist selesai ditulis
 * (closeBundle). Yang dipulihkan persis hasil Publish terakhir — kalau file
 * memang belum pernah ada (clone baru, CI), tidak ada yang dipotret dan
 * perilaku lama (fallback bundle) tetap berlaku.
 */
function preserveContentJson(): Plugin {
  let outDir = "dist";
  let potret: Buffer | null = null;
  return {
    name: "preserve-content-json",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    buildStart() {
      const file = path.join(outDir, "content.json");
      potret = existsSync(file) ? readFileSync(file) : null;
    },
    closeBundle() {
      if (!potret) return;
      writeFileSync(path.join(outDir, "content.json"), potret);
      console.log(
        `[preserve-content-json] content.json dipulihkan ke dist/ ` +
          `(${(potret.length / 1024).toFixed(1)} kB)`,
      );
    },
  };
}

/* Port panel admin saat dev. Env override cuma untuk skrip test yang perlu
   menyalakan instance kedua tanpa menyentuh :5174 yang sedang dipakai —
   pemakaian sehari-hari dan produksi tidak mengenalnya sama sekali. */
const ADMIN_DEV_PORT = Number(process.env.ADMIN_DEV_PORT ?? 5174);

/**
 * Menyalakan panel admin dari dalam dev server situs.
 *
 * Janji fitur "satu port" adalah :3000/admin — tapi proxy /admin di bawah
 * hanya hidup kalau ada yang menjawab di :5174, dan sebelum plugin ini itu
 * berarti MENGINGAT untuk menjalankan `bun run admin:dev` di terminal kedua.
 * Lupa satu itu dan :3000/admin menjawab 503 — persis kegagalan pertama yang
 * ditemui waktu fitur ini dicoba. Sekarang `bun dev` membawa panelnya sendiri:
 * satu perintah, dua app Vite, satu port.
 *
 * `bun run admin:dev` manual tetap dihormati: kalau :5174 sudah ditempati,
 * plugin mundur dan proxy memakai yang sudah ada. strictPort di sini wajib —
 * tanpa itu instance kedua diam-diam pindah ke :5175 dan proxy tetap menembak
 * :5174 milik orang lain.
 *
 * Vitest ikut memuat config ini (project "situs"), jadi ada penjaga VITEST
 * supaya setiap worker test tidak ikut menyeret server panel.
 */
function bootAdminPanel(): Plugin {
  return {
    name: "boot-admin-panel",
    apply: "serve",
    async configureServer(server) {
      if (process.env.VITEST) return;
      const { createServer } = await import("vite");
      const log = server.config.logger;
      /* Edit vite.config.ts → Vite me-restart server situs: admin lama baru
         ditutup lewat event "close" di bawah, dan penutupannya asinkron. Coba
         beberapa kali sebelum menyimpulkan port-nya memang milik proses lain. */
      for (let percobaan = 1; percobaan <= 5; percobaan++) {
        const admin = await createServer({
          configFile: fileURLToPath(new URL("admin/vite.config.ts", import.meta.url)),
          server: {
            port: ADMIN_DEV_PORT,
            strictPort: true,
            hmr: { protocol: "ws", host: "localhost", port: ADMIN_DEV_PORT },
          },
        });
        try {
          await admin.listen();
          server.httpServer?.once("close", () => void admin.close());
          log.info(
            `[boot-admin-panel] panel admin ikut menyala di :${ADMIN_DEV_PORT} — buka lewat /admin`,
          );
          return;
        } catch (err) {
          await admin.close();
          if (!/EADDRINUSE|already in use/i.test(String(err))) {
            /* Bukan soal port (config panel rusak, dsb.) → bilang keras-keras
               tapi biarkan situsnya tetap jalan; /admin jatuh ke pesan 503. */
            log.error(`[boot-admin-panel] panel admin gagal menyala: ${String(err)}`);
            return;
          }
          if (percobaan < 5) await new Promise((r) => setTimeout(r, 300));
        }
      }
      log.info(
        `[boot-admin-panel] :${ADMIN_DEV_PORT} sudah ditempati (admin:dev manual?) — memakai yang sudah ada`,
      );
    },
  };
}

/**
 * Daftar dependensi yang WAJIB di-prebundle di ronde pertama.
 *
 * ── Kenapa ditulis manual ────────────────────────────────────────────────────
 * Insiden 31 Agu di `bun dev`: konsol penuh "R3F: Hooks can only be used within
 * the Canvas component!" dari dalam drei, Scene dijatuhkan ChunkBoundary, lalu
 * "Context Lost" beruntun. Terlihat seperti bug R3F, padahal terukur:
 *
 *   - `node_modules/@react-three/fiber` cuma SATU salinan;
 *   - browser mengeksekusi `chunk-VHHOMNVH.js?v=8f483dc3` (berisi Canvas)
 *     berdampingan dengan `chunk-7JX4AA75.js?v=8f483dc3` (berisi useThree),
 *     jadi drei membaca context milik salinan fiber yang LAIN;
 *   - chunk-VHHOMNVH sudah dijawab 404 oleh server — file itu tidak ada lagi
 *     di disk. Tab-nya menjalankan sisa ronde optimize yang sudah mati.
 *
 * Sebabnya: optimizer dev Vite bekerja INKREMENTAL. Paket ditemukan sambil
 * jalan mengikuti urutan permintaan browser, dan repo ini menyembunyikan hampir
 * semua yang berat di balik `lazy()` (Scene, BilliardGame, WaypointLabel,
 * BilliardHUD) — jadi urutan penemuannya berbeda tiap sesi. Pengelompokan chunk
 * ikut berbeda, nama chunk ikut berganti. Yang TIDAK ikut berganti: token
 * `?v=` (browserHash), karena ia dihitung dari lockfile + config, bukan dari isi
 * chunk. Tab yang tetap terbuka melewati restart dev server karena itu tidak
 * pernah tahu ia harus membuang modul lamanya, dan mencampur dua ronde.
 *
 * Dengan daftar ini, semua paket sudah dikenal SEBELUM permintaan pertama:
 * prebundle selesai satu tarikan napas, komposisi chunk-nya sama tiap restart,
 * dan campuran dua ronde itu tidak punya cara terbentuk.
 *
 * ── Cara merawatnya ──────────────────────────────────────────────────────────
 * Ini bukan daftar izin — Vite tetap menemukan paket lain sendiri; efeknya cuma
 * hilang jaminan determinisme untuk paket yang tak terdaftar. Kalau nanti ada
 * paket baru yang cuma diimpor dari dalam modul `lazy()`, tambahkan ke sini.
 * Isinya diambil dari `optimized` di node_modules/.vite/deps/_metadata.json.
 *
 * Kalau gejala campur-ronde ini muncul lagi: reload keras sekali menyelesaikan
 * tab yang telanjur macet — menyentuh berkas ini pun cukup, karena configHash
 * berubah → browserHash berubah → Vite memaksa reload penuh dengan `?v=` baru.
 */
const PREBUNDLE = [
  "@react-three/drei",
  "@react-three/fiber",
  "@react-three/postprocessing",
  "cannon-es",
  "clsx",
  "lenis",
  "lucide-react",
  "motion/react",
  "postprocessing",
  "react-router-dom",
  "tailwind-merge",
  "three",
  // Subpath dalam: paling rawan ditemukan telat karena cuma diimpor dari
  // SceneEnvironment.tsx, yang sendirinya di balik lazy() Scene.
  "three/examples/jsm/environments/RoomEnvironment.js",
  "zustand",
];

export default defineConfig({
  optimizeDeps: { include: PREBUNDLE },
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    serveLocalModels(),
    serveContentJson(),
    copyLocalModels(),
    preserveContentJson(),
    bootAdminPanel(),
  ],
  server: {
    port: 3000,
    /* Frontend SELALU memakai path relatif (`/api/...`, `/uploads/...`).
       Proxy inilah yang membuat kode-nya identik antara lokal dan produksi —
       di produksi reverse proxy yang mengerjakan hal yang sama. Alternatifnya
       (URL absolut + variabel env) berarti ada jalur yang tidak pernah dijalani
       sampai deploy. */
    proxy: {
      "/api": { target: "http://localhost:3001", changeOrigin: false },
      "/uploads": { target: "http://localhost:3001", changeOrigin: false },
      /* Panel admin: satu alamat, sama seperti di produksi.
         Di produksi panel ikut terbit di dalam dist/ (lihat outDir di
         admin/vite.config.ts), jadi `/admin` dilayani proses yang sama dengan
         situs. Di dev ia proses Vite tersendiri di :5174 — proxy inilah yang
         menyamakan keduanya, supaya alamat yang dipakai sehari-hari
         (`:3000/admin`) sama persis dengan yang nanti dibuka di server dan
         tidak ada jalur yang baru dijalani pertama kali saat deploy. */
      "/admin": {
        target: `http://localhost:${ADMIN_DEV_PORT}`,
        changeOrigin: false,
        /* `/admin` telanjang, tanpa garis miring penutup. Vite dev menolaknya
           dengan 404 "did you mean /admin/?" karena `base` panel memang
           `/admin/`. Di produksi `serve.json` sudah memetakan `/admin` ke
           `dist/admin/index.html`, jadi tanpa baris ini alamat yang dipakai
           sehari-hari (`:3000/admin`) berperilaku beda dari alamat yang
           dipakai di server. Dibetulkan di sini, bukan dengan redirect,
           supaya alamat di bilah peramban tetap apa adanya. */
        rewrite: (path) => (path === "/admin" ? "/admin/" : path),
        /* HMR panel menembak langsung ke :5174 (lihat admin/vite.config.ts),
           jadi ini bukan untuk HMR — melainkan supaya websocket apa pun yang
           lewat sini tidak dijawab sebagai HTML. */
        ws: true,
        configure(proxy) {
          /* Panel tidak menjawab → jawab dengan kalimatnya, bukan dengan galat
             proxy mentah yang menyebut ECONNREFUSED tanpa menyebut apa yang
             harus dinyalakan. Normalnya bootAdminPanel sudah menyalakannya,
             jadi mendarat di sini berarti boot-nya gagal (lihat log). */
          proxy.on("error", (_err, _req, res) => {
            if (!("writeHead" in res)) return;
            res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
            res.end(
              `Panel admin tidak menjawab di :${ADMIN_DEV_PORT}.\n` +
                "Biasanya ia ikut menyala bersama `bun dev` — cek log dev server,\n" +
                "atau nyalakan manual: bun run admin:dev\n",
            );
          });
        },
      },
    },
  },
  /**
   * Dua kelompok test yang tidak bisa hidup di satu lingkungan.
   *
   * Test situs butuh jsdom beserta setup Testing Library; test server butuh
   * Node asli — `src/test/setup.ts` menyentuh `window` dan akan melempar di
   * sana. Dipisah jadi dua project supaya masing-masing dapat lingkungannya
   * sendiri, bukan dengan menaruh penjaga `typeof window` di berkas setup yang
   * lama-lama jadi tidak jelas untuk siapa.
   */
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "situs",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          css: false,
          include: ["src/**/*.test.{ts,tsx}", "shared/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "server",
          environment: "node",
          globals: true,
          include: ["server/**/*.test.ts"],
          /**
           * `.env` tidak terbaca sendiri di sini — Vite hanya memuat variabel
           * ber-prefix `VITE_` ke `import.meta.env`, sementara `server/env.ts`
           * membaca `process.env`. Tanpa baris ini test server gagal start
           * dengan keluhan `TEST_DATABASE_URL` kosong, padahal isinya ada.
           * Prefix "" = muat semuanya.
           */
          env: loadEnv("", process.cwd(), ""),
          /* Semua berkas menumpang satu database test yang sama dan saling
             mengosongkan tabelnya. Jalan bersamaan = saling menghapus baris di
             tengah test tetangga. */
          fileParallelism: false,
        },
      },
    ],
  },
});
