/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import {
  copyFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
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

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    serveLocalModels(),
    copyLocalModels(),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
