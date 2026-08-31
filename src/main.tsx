import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/geist-sans";
import "@fontsource/geist-mono";
/* Archivo Variable — DIPAKAI DI SATU TEMPAT SAJA: wordmark "COGNITI.ID" di
   kepala <Contact/>. Bukan font halaman; Geist tetap font halaman.

   Kenapa font kedua, bukan Geist ditebalkan-lalu-dilebarkan? Karena melebarkan
   glyph secara geometris menebalkan stem TEGAK tanpa menebalkan palang
   MENDATAR — huruf jadi terlihat gepeng, dan pada ukuran wordmark itu langsung
   ketahuan. Archivo punya sumbu `wdth` sungguhan (62–125%): potongan lebarnya
   digambar ulang oleh desainernya dengan bobot palang yang ikut disesuaikan.

   `wdth.css` membawa sumbu wdth + wght sekaligus (font-weight: 100 900,
   font-stretch: 62% 125%) dalam SATU berkas per subset. Peramban cuma mengunduh
   subset yang unicode-range-nya benar-benar terpakai — untuk situs ini hanya
   latin (~90 KB woff2). Subset vietnamese/latin-ext/greek/cyrillic ikut
   terdaftar sebagai @font-face tapi tidak pernah diunduh. */
import "@fontsource-variable/archivo/wdth.css";
import "./index.css";
import App from "./App";
import { initShellMax } from "./lib/shellMax";
import { loadContent } from "./lib/content/store";

/* Sebelum render: isi `--shell-max` (plafon dinamis section-shell, §4bh)
   supaya frame pertama di monitor >1920px sudah full-bleed, bukan melompat
   dari fallback 1920. */
initShellMax();

/* Konten CMS diambil SEBELUM render, bukan di dalam efek.
   Beberapa berkas membaca daftar lowongan di module scope (Navbar, SiteLayout),
   jadi isinya harus sudah ada saat komponen pertama dievaluasi. `loadContent`
   tidak pernah melempar dan punya batas waktu 1,5 detik — kalau gagal, situs
   lanjut dengan isi bawaan bundle. */
await loadContent();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
