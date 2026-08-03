#!/usr/bin/env bash
#
# ⚠️ TIDAK DIPAKAI — hasilnya SUDAH DITOLAK. Baca ini sebelum menjalankannya.
#
# Konversi office.glb → office-ktx2.glb (tekstur GPU-compressed).
#
# ── Kenapa skrip ini tetap disimpan ─────────────────────────────────────────
# Skrip ini berhasil: ia benar-benar memangkas VRAM 240 MB → 64 MB, terukur.
# Yang tidak lolos adalah TAMPILANNYA — Keano membandingkan hasilnya dengan
# GLB asli (3 Agu) dan memutuskan yang asli jelas lebih bagus. Kompresi blok
# BasisU meninggalkan jejak yang tidak bisa ditawar dengan setelan, dan kantor
# ini menjual detail visual.
#
# Ia disimpan BUKAN sebagai pekerjaan tertunda, melainkan sebagai jawaban yang
# sudah dibayar: "240 MB VRAM itu besar, kenapa tidak KTX2 saja?" adalah usul
# yang wajar dan akan muncul lagi. Jawabannya: sudah dicoba, jalan, ditolak
# karena kualitas. Kalau mau menilai sendiri, jalankan skrip ini dan bandingkan
# berdampingan — jangan mengambil kesimpulan dari angka VRAM-nya saja.
#
# Yang di bawah ini tetap akurat kalau suatu saat keputusannya ditinjau ulang.
#
# ── Catatan teknis ──────────────────────────────────────────────────────────
# Kenapa 4 langkah, bukan satu perintah: gltfpack tidak bisa membaca Draco MAUPUN
# WebP, dan office.glb memakai keduanya. Jadi keduanya dibongkar dulu, tekstur
# dikonversi, lalu Draco dipasang lagi. Melompati salah satu langkah = gagal
# senyap: gltfpack menulis file yang tampak wajar tapi teksturnya masih WebP
# (terbukti di percobaan pertama — 0,44 detik dan mime tetap image/webp).
#
# Butuh: node + npx. Binary gltfpack diunduh otomatis (build native, karena
# build node-nya tidak bawa BasisU). Tidak perlu Homebrew atau sudo.
#
# Terukur 3 Agu: VRAM 240 MB → 64 MB; disk 8,1 MB → 17,8 MB.
# Perhatikan disk-nya NAIK 2×: KTX2 memang menukar ukuran unduh dengan VRAM.

set -euo pipefail
cd "$(dirname "$0")/.."

SRC="public/3d/models/office.glb"
OUT="public/3d/models/office-ktx2.glb"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

GLTFPACK="$TMP/gltfpack"
GLTFPACK_URL="https://github.com/zeux/meshoptimizer/releases/download/v1.2/gltfpack-macos.zip"

echo "▸ 0/4  ambil gltfpack (build native, BasisU aktif)"
curl -sL -o "$TMP/gltfpack.zip" "$GLTFPACK_URL"
unzip -o -q "$TMP/gltfpack.zip" -d "$TMP"
xattr -d com.apple.quarantine "$GLTFPACK" 2>/dev/null || true
chmod +x "$GLTFPACK"

echo "▸ 1/4  bongkar Draco"
npx --yes @gltf-transform/cli@4 copy "$SRC" "$TMP/a.glb"

# --formats "*" wajib: tanpa itu perintah png melewati WebP tanpa bilang apa-apa
# dan file keluar sama persis ukurannya.
echo "▸ 2/4  WebP → PNG (gltfpack tidak bisa baca WebP)"
npx --yes @gltf-transform/cli@4 png "$TMP/a.glb" "$TMP/b.glb" --formats "*"

# -tu normal,attrib → normal map DAN lightmap pakai UASTC, sisanya ETC1S.
#   Lightmap WAJIB UASTC: dengan ETC1S ia turun ke 0,98 bit/piksel, dan gradasi
#   cahaya halus adalah titik terlemah kompresi blok (gejalanya banding).
#   Ongkosnya VRAM 49 → 64 MB.
# -kn -km -ke → pertahankan nama node, material, dan extras. TANPA -kn gltfpack
#   meratakan hierarki dan menghapus SEMUA nama; waypoint, deteksi M_LEDStrip,
#   dan klik PoolTable langsung mati.
echo "▸ 3/4  encode KTX2"
"$GLTFPACK" -i "$TMP/b.glb" -o "$TMP/c.glb" -tc -tu normal,attrib -tq 8 -kn -km -ke -noq

echo "▸ 4/4  pasang Draco lagi"
npx --yes @gltf-transform/cli@4 draco "$TMP/c.glb" "$OUT"

echo
echo "✓ $OUT"
ls -lh "$SRC" "$OUT"
