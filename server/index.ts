/**
 * Titik masuk proses API.
 *
 * Dijalankan lewat `bun run server:dev` di lokal dan lewat pm2 di produksi.
 * Adapter `@hono/node-server` dipakai dengan sengaja meski lokal memakai Bun:
 * VPS-nya hanya punya Node, dan API yang cuma bisa hidup di Bun akan ketahuan
 * saat deploy, bukan sekarang.
 */

import { serve } from "@hono/node-server";

import { app } from "./app";
import { env } from "./env";

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`API cogniti jalan di http://localhost:${info.port}`);
});
