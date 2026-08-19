/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
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

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths(), serveLocalModels()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
