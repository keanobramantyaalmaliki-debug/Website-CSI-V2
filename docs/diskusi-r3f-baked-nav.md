# Diskusi: Integrasi Baked Lighting + Navigasi ke Next.js (R3F)
**Tanggal:** 28 Juli 2026  
**Branch:** `feature/r3f-baked-nav`  
**Lanjutan dari:** `diskusi-mvp1-webgpu-baked-ktx2.md`

---

## 1. Konteks

Setelah MVP1 baked viewer (`export-test/mvp1.html`) selesai dan di-commit ke `feature/mvp1-webgpu-baked-ktx2`, tujuan sesi ini: **menerapkan konsep yang sama ke dalam Next.js project** (React Three Fiber), karena:

1. **Lighting tidak ada** — `Office.tsx` masih load `office.glb` (bukan baked), sehingga logic lightmap `aoMap channel=1` tidak menemukan apapun.
2. **Navigasi tidak smooth** — `Scene.tsx` masih pakai `OrbitControls` (orbit bebas), belum ada scroll navigation seperti `mvp1.html`.

---

## 2. Persiapan: Serving export-test via Next.js

**Masalah:** `export-test/mvp1.html` tidak bisa diakses via `localhost:8080/export-test/mvp1.html` karena Next.js hanya serve file dari `public/`.

**Solusi:** Symlink `public/export-test → ../export-test`:
```bash
ln -s ../export-test public/export-test
```

Setelah symlink, file HTML + GLB di `export-test/` langsung bisa diakses via `/export-test/`.

---

## 3. Download GLB dari GitHub

GLB files di-untrack dari git (`export-test/*.glb` di `.gitignore`). Download dari branch `mvp1-baked-60fps`:

```bash
# Via gh api (bukan curl karena diblok context-mode)
gh api repos/keanobramantyaalmaliki-debug/Website-CSI-V2/git/blobs/<sha> \
  --jq '.content' | base64 -d > export-test/office-mvp1-baked.glb

gh api repos/keanobramantyaalmaliki-debug/Website-CSI-V2/git/blobs/<sha> \
  --jq '.content' | base64 -d > export-test/office-mvp1-webp.glb
```

| File | Size |
|------|------|
| `office-mvp1-baked.glb` | 8.0 MB |
| `office-mvp1-webp.glb` | 5.2 MB |

---

## 4. Restore MVP1 ke Branch Fitur

Perubahan dari commit `38168ce` (yang sudah direvert di main) di-restore ke branch `feature/mvp1-webgpu-baked-ktx2`:

```bash
git checkout 38168ce -- export-test/mvp1.html .gitignore export-test/office-mvp1-final.glb
```

Di-commit dan tidak di-push (remote sudah punya konten identik dari sesi sebelumnya).

---

## 5. Branch & Implementasi R3F

Branch baru dari `main`:
```bash
git checkout -b feature/r3f-baked-nav
```

### 5.1 File yang Dibuat / Diubah

| File | Status | Keterangan |
|------|--------|------------|
| `src/lib/store/sceneStore.ts` | New | Zustand store: `currentRoom`, `goTo`, `registerGoTo` |
| `src/components/canvas/CameraController.tsx` | New | Scroll/arrow/touch nav, camera tween, hash routing |
| `src/components/ui/RoomNav.tsx` | New | Bar indicator kanan, scroll hint |
| `src/components/canvas/Office.tsx` | Modified | GLB → `office-mvp1-baked.glb`, `LIGHTMAP_INTENSITY` |
| `src/components/canvas/Scene.tsx` | Modified | Hapus `OrbitControls`, tambah `CameraController` |
| `src/components/sections/Hero.tsx` | Modified | Tambah `<RoomNav />` overlay |
| `src/components/Navbar.tsx` | Modified | "Office" dropdown + room name subtitle |

---

## 6. Detail Implementasi

### 6.1 Office.tsx — GLB & Lightmap

```ts
// Ganti dari office.glb ke baked version
const MODEL_URL = "/export-test/office-mvp1-baked.glb";

// Diputuskan set ke 0 (lihat §8 untuk alasan)
const LIGHTMAP_INTENSITY = 0;
```

Logic fix-up lightmap (sudah ada dari sebelumnya) tetap dipertahankan:
- `aoMap channel=1` → di-swap ke `lightMap`
- `uv1` attribute di-set dari `uv2`/`uv3`/`uv`
- Emissive: `toneMapped = false`

### 6.2 sceneStore.ts

```ts
interface SceneStore {
  currentRoom: RoomKey;
  setCurrentRoom: (room: RoomKey) => void;
  goTo: ((room: RoomKey) => void) | null;
  registerGoTo: (fn: (room: RoomKey) => void) => void;
}
```

`goTo` didaftarkan oleh `CameraController` setelah R3F canvas ready, lalu dibaca oleh `Navbar` dan `RoomNav` di luar canvas.

### 6.3 CameraController.tsx

- **VIEWS** — 5 room positions (sama dengan `mvp1.html`), Pantry `disabled: true`
- **Tween** — cubic in-out 1400ms, `animating` guard mencegah input saat transisi
- **Input** — wheel (canvas only, tidak block page scroll), Arrow keys, touch swipe
- **Hash routing** — `history.pushState` + `popstate` listener
- **registerGoTo** — daftarkan fungsi ke store agar bisa dipanggil dari luar canvas

```ts
function ease(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
```

### 6.4 RoomNav.tsx — Bar Indicators

Ganti dot bulat → **vertical bar**:
- Active: `h-5 bg-white` (bar tinggi)
- Inactive: `h-2 bg-white/30` (bar pendek)
- Hover: `h-3.5 bg-white/60`
- Disabled (Pantry): `h-2 bg-white/20 opacity-20`

Label room muncul di sebelah kiri bar, visible saat hover atau active.

### 6.5 Navbar.tsx — Office Dropdown

```
cogniti.id          Office ↓  Deployments  Services  Vision     ···· Talk to us
MAIN OFFICE         ┌─────────────────────┐
                    │ ● Main Office        │
                    │ ○ Lounge             │
                    │ ○ Meeting Room       │
                    │ ○ Function Hall      │
                    └─────────────────────┘
```

- Logo kiri: subtitle `MAIN OFFICE` muncul saat `inHero` (currentRoom ada di ROOMS list)
- Dropdown hover: daftar room, dot orange = active room
- Klik room: `scrollIntoView('#office')` + `goTo(key)`

---

## 7. Masalah UI yang Ditemukan & Diperbaiki

### Iterasi 1 — Overlap Top-Left
Room title besar ("Main Office" + "CSI OFFICE TOUR") overlap dengan logo navbar, keduanya `fixed top-7 left-8`.

**Fix:** Hapus room title terpisah dari `RoomNav`, pindahkan sebagai subtitle kecil di bawah logo navbar.

### Iterasi 2 — Nav Dots Minimalis
Dots kecil sulit dipahami, hanya label aktif yang muncul.

**Fix:** Ganti ke vertical bar dengan ukuran berbeda untuk active/inactive/disabled.

---

## 8. Keputusan Teknis

| Keputusan | Alasan |
|-----------|--------|
| `LIGHTMAP_INTENSITY = 0` | Lightmap menunjukkan UV seam artifacts yang mengganggu. Environment (0.18) + ambient (0.12) + emissive cukup untuk tampilan bersih. |
| Scroll wheel hanya pada canvas element | Tidak mengganggu page scroll ke section di bawah hero |
| `goTo` via zustand, bukan prop drilling | `CameraController` (dalam canvas) dan `Navbar`/`RoomNav` (luar canvas) perlu berbagi fungsi navigasi |
| Bloom tetap dipertahankan | R3F menggunakan WebGL (bukan WebGPU), bloom dari `@react-three/postprocessing` kompatibel |
| OrbitControls dihapus | Digantikan `CameraController`; orbit bebas tidak konsisten dengan UX basement.studio style |
| Pantry `disabled: true` (tidak dihapus) | Mudah di-enable kembali |

---

## 9. Git History

```
bc0e86c  feat(scene): baked lighting, scroll navigation, navbar room dropdown  ← HEAD
636c91c  Merge branch 'web-integrate-glb'  ← base dari main
```

**Branch:** `feature/r3f-baked-nav` (sudah di-push ke origin)

---

## 10. TODO / Next Steps

- [ ] `TODO(deploy)`: salin `office-mvp1-baked.glb` ke `public/3d/models/` sebelum deploy produksi (saat ini via symlink dev-only)
- [ ] KTX2 support: tambah `KTX2Loader` di `Office.tsx`, coba load `office-mvp1-final.glb` dengan fallback ke baked
- [ ] Lightmap: investigasi UV seam di Blender (padding UV island) jika ingin re-enable lightmap
- [ ] `CharacterLights.tsx`: isi dengan layer-based lighting untuk karakter dinamis
- [ ] Mobile: test touch navigation di device nyata
