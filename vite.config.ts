/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { createReadStream, existsSync, statSync } from "node:fs";
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

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    serveLocalModels(),
    serveContentJson(),
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
