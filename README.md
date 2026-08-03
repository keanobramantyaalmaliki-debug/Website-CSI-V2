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
| `bun run test` | Vitest — 101 test, termasuk 3 invariant lintas-wilayah |

## Stack

**Vite 6 + React 19 + TypeScript + Tailwind 4.** Client-only SPA — tidak ada SSR. (Dulu Next.js 16, dimigrasikan 29 Jul 2026; lihat §4j di Documentations.)

3D: **three 0.185** + `@react-three/fiber` 9 + `drei` 10 + `@react-three/postprocessing` 3.
Lain-lain: `zustand` 5 (state), `react-router-dom` 7 (routing per-ruangan), `cannon-es` 0.20 (minigame billiard), `motion` 12 (animasi teks), `matter-js` 0.20 (`PhysicsHeading`).

## Struktur

Situsnya **empat halaman, satu per ruangan** (§4q). Hero 3D-nya sama di semuanya; yang berganti cuma konten di bawahnya.

```
/          Lounge     perusahaannya
/office    Office     apa yang dikerjakan (accordion 9 layanan)
/meeting   Meeting    studi kasus
/function  Function   orang & karir
```

```
src/
  App.tsx                    tabel route saja
  routes/
    SiteLayout.tsx           shell persisten: Loader + Navbar + Hero + <Outlet>
    RoomContent.tsx          konten ruangan AKTIF saja — baca komentarnya
    RoomRouteSync.tsx        sinkronisasi 3 arah: path ↔ currentRoom ↔ hash
  lib/roomContent.tsx        section apa saja per ruangan + roomHasContact()
  components/
    canvas/                  semua yang di dalam <Canvas> — lihat §4h
      Scene.tsx              Canvas + EffectComposer (N8AO → Bloom), MSAA MATI (§4r)
      Office.tsx             pemuat office.glb + fix-up material wajib
      CameraController.tsx   VIEWS 5 ruangan + tween 1400 ms
      Waypoints.tsx          navigasi waypoint 3D (§4k)
      revealSweep.ts         sapuan "kantor terbentuk" (§4m)
      screens.ts             konten layar monitor (§6c)
      billiard/              minigame billiard (§6d) — di-lazy + prefetch (§4r)
    ChunkBoundary.tsx        penangkap chunk lazy yang gagal dimuat
    loader/                  loading screen isometrik, di-render di Web Worker (§4n)
    sections/                konten halaman
    motion/                  komponen animasi teks
    ui/WaypointLabel.tsx     label ruangan yang mengekor kursor (§4k)
  lib/store/sceneStore.ts    zustand: ruangan aktif, START_ROOM, pathFor, state billiard
  lib/hooks/useCoarsePointer.ts  perangkat sentuh → scene 3D jadi pemandangan (§6)
public/3d/models/office.glb  model kantor 8,09 MB — ter-track git, jangan dihapus
INVARIANTS.md                6 invariant lintas-wilayah + kebiasaan merge (§4o)
scripts/measure-frames.mjs   ukur frame time lewat CDP — WAJIB dpr 2, lihat headernya
scripts/shoot.mjs            screenshot lewat CDP, pasangan measure-frames
scripts/ktx2-convert.sh      konversi KTX2 — JALAN tapi hasilnya ditolak, lihat headernya
```

> **Di perangkat sentuh, kantor 3D tidak interaktif** — waypoint & minigame
> billiard mati, jadi navigasi ruangan bergantung penuh pada **room links di
> navbar**. Keduanya terikat: kalau room links dihapus, HP jadi jalan buntu.
> Jangan "memperbaiki"-nya dengan menghidupkan waypoint lagi di sentuh —
> jalan keluarnya adalah navbar. Duduk perkaranya di INVARIANTS.md §6.

> **Tepi yang sedikit bergigi itu DISENGAJA.** MSAA dimatikan 3 Agu (30 → 60 FPS di
> kerapatan Retina) dan hasil visualnya dilihat berdampingan sebelum diputuskan —
> Keano lebih suka begitu, dan itu sejalan dengan look PS1/basement.studio. Jangan
> menawarkan SMAA/FXAA/MSAA sebagai perbaikan. Duduk perkaranya di §4r.

## Sebelum menyentuh kode 3D

Angka-angka di `src/components/canvas/` hampir semuanya **hasil pengukuran**, bukan selera — koordinat kamera dari Blender, ambang bloom, setelan AO, batas bidang bayangan. Komentar di tiap file menjelaskan cara mengukurnya ulang. Kalau ada yang terlihat seperti angka acak, kemungkinan besar itu jawaban dari bug yang sulit dilacak; cek komentarnya sebelum menggantinya.
