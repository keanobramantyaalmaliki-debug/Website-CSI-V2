/**
 * Panel admin — aplikasi Vite KEDUA, terpisah dari situs.
 *
 * Terpisah dengan sengaja: bundle entry situs sudah 1,8MB dan hidup di dalam
 * Lenis smooth-scroll, scroll-lock, serta store ruangan 3D. Form yang panjang
 * akan berkelahi dengan ketiganya, dan tidak ada satu pun dari itu yang
 * dibutuhkan untuk mengetik lowongan.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const DIR = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  /* Root-nya folder ini, BUKAN akar repo. Tanpa baris ini Vite mengambil
     `index.html` milik situs — panel tetap membuka halaman 200 yang terlihat
     benar, tapi yang dimuat adalah scene 3D lengkap dengan judul situs. */
  root: DIR,
  /* Cache dependensi SENDIRI. Keduanya berbagi satu `node_modules`, jadi
     tanpa baris ini panel dan situs memakai `node_modules/.vite/deps` yang
     sama — dan begitu salah satunya meng-optimize ulang, yang satu lagi
     menjawab 504 "Outdated Optimize Dep" untuk setiap dependensi. Terukur:
     menjalankan `admin:dev` membuat situs di :3000 jadi halaman putih. */
  cacheDir: resolve(DIR, "../node_modules/.vite-admin"),
  /* Di produksi panel ini disajikan di /admin/, jadi asetnya harus dirujuk
     dari sana — bukan dari root, yang sudah dipakai situs. */
  base: "/admin/",
  build: { outDir: "../dist-admin", emptyOutDir: true },
  server: {
    port: 5174,
    proxy: {
      /* Sama seperti di situs: frontend selalu memakai path relatif, dan yang
         berbeda antara lokal dan produksi cuma siapa yang meneruskannya. */
      "/api": { target: "http://localhost:3001", changeOrigin: false },
      "/uploads": { target: "http://localhost:3001", changeOrigin: false },
      /* Foto lama tinggal di `public/` situs. Tanpa dua baris ini pemilih foto
         di panel ini menampilkan gambar rusak untuk berkas yang sebenarnya
         ada — hanya karena disajikan oleh proses tetangga. Di produksi
         keduanya satu origin dan proxy ini tidak terpakai. */
      "/careers": { target: "http://localhost:3000", changeOrigin: false },
      "/people": { target: "http://localhost:3000", changeOrigin: false },
    },
  },
});
