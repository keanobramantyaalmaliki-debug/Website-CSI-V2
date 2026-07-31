# Cogniti Office 3D Tour

Website tour kantor 3D interaktif untuk **cogniti.id** — pengunjung menjelajahi kantor Cogniti secara virtual di browser, ala [basement.studio](https://basement.studio).

**[`Documentations.md`](./Documentations.md) adalah dokumentasi utamanya** — pipeline Blender→GLB, kalibrasi lighting, dan puluhan gotcha yang mahal didapat. Baca itu dulu sebelum mengubah apa pun di `src/components/canvas/`.

## Getting Started

Project ini memakai **bun** (bukan npm/yarn/pnpm). Satu-satunya lockfile yang sah adalah `bun.lock` — lihat §7 di Documentations.

```bash
bun install
bun dev
```

Buka [http://localhost:3000](http://localhost:3000).

> ⚠️ `bun` ada di `~/.bun/bin` tapi tidak selalu ada di PATH shell non-interaktif. Kalau ketemu `command not found: bun` di skrip, jalankan `export PATH="$HOME/.bun/bin:$PATH"` dulu.

| Perintah | Fungsi |
|---|---|
| `bun dev` | Dev server di port 3000 |
| `bun run build` | `tsc --noEmit` + `vite build` |
| `bun start` / `bun run preview` | Serve hasil build di port 3000 |
| `bun run lint` | ESLint |

## Stack

**Vite 6 + React 19 + TypeScript + Tailwind 4.** Client-only SPA — tidak ada SSR. (Dulu Next.js 16, dimigrasikan 29 Jul 2026; lihat §4j di Documentations.)

3D: **three 0.185** + `@react-three/fiber` 9 + `drei` 10 + `@react-three/postprocessing` 3.
Lain-lain: `zustand` 5 (state), `cannon-es` 0.20 (minigame billiard), `motion` 12 (animasi teks).

## Struktur

```
src/
  App.tsx                    struktur halaman: Hero (3D) + 9 section
  components/
    canvas/                  semua yang di dalam <Canvas> — lihat §4h
      Scene.tsx              Canvas + EffectComposer (N8AO → Bloom)
      Office.tsx             pemuat office.glb + fix-up material wajib
      CameraController.tsx   VIEWS 5 ruangan + tween + hash routing
      Waypoints.tsx          navigasi waypoint 3D (§4k)
      revealSweep.ts         sapuan "kantor terbentuk" (§4m)
      screens.ts             konten layar monitor (§6c)
      billiard/              minigame billiard (§6d)
    sections/                konten halaman
    motion/                  komponen animasi teks
  lib/store/sceneStore.ts    zustand: ruangan aktif, START_ROOM, state billiard
public/3d/models/office.glb  model kantor 8,09 MB — ter-track git, jangan dihapus
```

## Sebelum menyentuh kode 3D

Angka-angka di `src/components/canvas/` hampir semuanya **hasil pengukuran**, bukan selera — koordinat kamera dari Blender, ambang bloom, setelan AO, batas bidang bayangan. Komentar di tiap file menjelaskan cara mengukurnya ulang. Kalau ada yang terlihat seperti angka acak, kemungkinan besar itu jawaban dari bug yang sulit dilacak; cek komentarnya sebelum menggantinya.
