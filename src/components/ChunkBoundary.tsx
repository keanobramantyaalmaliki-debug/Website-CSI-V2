"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Penangkap kegagalan pemuatan chunk `lazy()`.
 *
 * ── Kenapa perlu ───────────────────────────────────────────────────────────
 * `<Suspense>` menangani keadaan SEDANG MEMUAT, bukan GAGAL. Kalau import
 * dinamis-nya ditolak, `lazy()` melempar error saat render — dan error render
 * yang tidak tertangkap membuat React meng-unmount SELURUH pohon. Bukan cuma
 * fitur itu yang hilang: halamannya jadi blank.
 *
 * Kapan itu benar-benar terjadi di proyek ini:
 *
 *   1. **Deploy saat ada tab terbuka.** `bun run deploy` membangun ulang ke
 *      `dist/` dengan nama chunk ber-hash baru dan menghapus yang lama.
 *      Pengunjung yang tab-nya sudah terbuka masih memegang `index.html` lama
 *      yang menunjuk chunk yang sudah tidak ada → 404 saat ia akhirnya
 *      mengklik meja billiard. Ini skenario paling nyata, dan ia MENINGKAT
 *      justru karena kita menunda pemuatan: makin lama jeda antara buka
 *      halaman dan butuh chunk-nya, makin besar peluang keburu ada deploy.
 *   2. Jaringan seluler yang putus di tengah unduhan.
 *
 * ── Kenapa fallback default-nya `null` ─────────────────────────────────────
 * Salah satu pemakainya (`BilliardLazy`) hidup DI DALAM `<Canvas>` R3F, dan di
 * sana react-three-fiber merekonsiliasi ke objek three — bukan ke DOM. Me-render
 * `<div>` di situ akan melempar error baru dari dalam penangkap error, yang
 * justru memperburuk keadaan. Jadi default-nya tidak menggambar apa pun; kalau
 * mau pesan visual, kirim `fallback` khusus HANYA untuk pemakai di luar Canvas.
 */
interface Props {
  children: ReactNode;
  /** Ditampilkan kalau chunk gagal dimuat. WAJIB null/undefined di dalam Canvas. */
  fallback?: ReactNode;
  /** Nama untuk log — memudahkan tahu bagian mana yang gagal. */
  name: string;
}

interface State {
  failed: boolean;
}

export default class ChunkBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Sengaja console.error, bukan dilempar ulang: yang ingin dicapai justru
    // MENAHAN error supaya tidak menjatuhkan halaman. Tanpa log, kegagalannya
    // jadi senyap total dan mustahil didiagnosa dari laporan pengunjung.
    console.error(
      `[chunk] gagal memuat "${this.props.name}" — bagian ini dilewati, ` +
        `sisa halaman tetap jalan. Penyebab paling umum: deploy baru ` +
        `menghapus chunk lama sementara tab ini masih memegang index.html lama.`,
      error,
      info.componentStack,
    );
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
