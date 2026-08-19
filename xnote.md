# update model 3D (tiap export ulang office.glb)

1. export Blender → `3d/models/office.glb` (BUKAN public/ lagi)
2. cek localhost:3000
3. kirim ke server (tanpa git/deploy):
   scp "3d/models/office.glb" user@server:/path/ke/repo/3d/models/
4. minta rekan purge CF: Caching → Purge by URL →
   https://csi2.wibudev.com/3d/models/office.glb
5. hangatkan cache:
   curl -s -o /dev/null "https://csi2.wibudev.com/3d/models/office.glb"

update KODE situs = jalur lama (commit → push → bun run deploy), tanpa purge.

# test cache

curl -sI "https://csi2.wibudev.com/3d/models/office.glb" | grep -i cf-cache-status

# test kecepatan

curl -s -o /dev/null -w "waktu: %{time_total}s | kecepatan: %{speed_download} B/s\n" "https://csi2.wibudev.com/3d/models/office.glb"
