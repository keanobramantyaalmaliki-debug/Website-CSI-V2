/**
 * Konfigurasi drizzle-kit — hanya dipakai oleh perintah `bun run db:*`,
 * tidak pernah ikut ke bundle situs maupun proses server.
 */
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  /** Migrasi ditulis sebagai berkas SQL biasa dan di-commit. Dibaca manusia
   *  dengan sengaja: itu satu-satunya cara meninjau perubahan skema sebelum
   *  jalan di produksi. */
  verbose: true,
  strict: true,
});
