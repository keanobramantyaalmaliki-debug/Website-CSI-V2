# update model 3D (tiap export ulang office.glb)

1. export Blender → `3d/models/office.glb` (BUKAN public/ lagi)
2. cek localhost:3000
3. kirim ke server (tanpa git/deploy):
   scp "3d/models/office.glb" user@server:/path/ke/repo/3d/models/
4. minta rekan purge CF: Caching → Purge by URL →
   https://csi2.wibudev.com/3d/models/office.glb
5. hangatkan cache:
   curl -s -o /dev/null "https://csi2.wibudev.com/3d/models/office.glb"

update KODE situs = commit → push → bun run deploy, LALU TETAP purge + hangatkan
(langkah 4–5) — 31 Agu cache /3d/* keracunan HTML gara-gara jendela kosong saat
deploy, padahal GLB tidak berubah (Documentations §4bs).

# test cache

curl -sI "https://csi2.wibudev.com/3d/models/office.glb" | grep -i cf-cache-status

# kalau jawabannya text/html (bukan model/gltf-binary), bedakan dua kasus:
#   HTML + HIT  = cache keracunan → cukup purge (§4bs)
#   tambah ?nocache=x → origin jawab gltf-binary = file ada; jawab HTML = file
#   hilang di server → scp dulu (§4bo). JANGAN purge saat origin sakit.

# test kecepatan

curl -s -o /dev/null -w "waktu: %{time_total}s | kecepatan: %{speed_download} B/s\n" "https://csi2.wibudev.com/3d/models/office.glb"
