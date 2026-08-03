# Documentations — Cogniti Office 3D Tour

Dokumentasi progres pembuatan 3D office tour ala [basement.studio](https://basement.studio) untuk **cogniti.id**.
Terakhir diupdate: **3 Agustus 2026**.

**Status ringkas:** **5 ruangan sudah ~95% jadi** dan seluruhnya sudah jalan di browser (lihat MVP 1 di bawah):
- **Lounge/Billiard** (§2) & **Function Room** (eks Smoking, §3) — furniture & dekorasi lengkap
- **Office Area** (§3b) — 11 desk pod `ODesk_*`, elektronik meja (7 iMac + Magic KB/Mouse), lunch table, bar stool, kursi kerja, rak, tanaman, socket, whiteboard, dinding kaca `GWL_*`/`GWO_*`, pantry cabinet L, printer/shredder/wardrobe/microwave, track lighting + LED strip lantai
- **Meeting Room** (§3c) — meja V-frame, TV 98" frameless + cabinet, replika Rally Camera & Mic Pod ×4, Apple TV/remote/KB/trackpad, 9 kursi, snake plant, 6 downlight
- **West Room / Pantry wing** — counter, sink, bar table, rak

**0 material prosedural** tersisa (semua sudah di-bake ke image texture).

**Per 29 Jul** — kemajuan besar di atas MVP1:
- **GLB sudah terintegrasi ke web** (§4h) — bukan lagi cuma viewer HTML. Hero fullscreen + navigasi antar-ruangan + hash routing + scrollspy navbar. Blocker path model sudah dibetulkan.
- **5 karakter sudah TAMPIL & BERANIMASI di web** (§6b) — Leonard (sofa lounge), Person2 & Person3 (mengetik di office), Person4 (meeting room), Person5 (function room). Sudah di-export ke `office.glb` dan `CharacterLights.tsx` sudah diisi.
- **Minigame billiard dibangun** (§6d) — fisika **cannon-es** (bukan Rapier lagi, lihat §6d) + kamera top-down + bar tenaga. ⏸️ **Ditunda**, belum di-review di browser.
- **Konten web V1 di-port ke V2** oleh rekan tim (§4i) — 5 section baru + animasi teks pakai `motion`.
- **Manajer paket disatukan ke `bun`** (§7) — `pnpm-lock.yaml` dihapus, build terverifikasi lolos.
- **Build pindah Next.js → Vite + React SPA** (§4j) — dikerjakan rekan tim di hari yang sama.

**Per 30 Jul** — dikerjakan di branch `feature/waypoint-nav-lighting`, kini **sudah di-merge ke `main`** (lewat rangkaian merge 31 Jul):
- **Navigasi diganti waypoint 3D** (§4k) — `RoomNav.tsx` dihapus; scroll, swipe, dan panah keyboard **dicabut semua**. Berpindah ruangan sekarang hanya lewat bidang waypoint di dalam ruangan + dropdown Navbar.
- **Lighting scene dirombak** (§4l) — lightmap **DINYALAKAN** (`LIGHTMAP_INTENSITY` 0 → 1), N8AO + contact shadow masuk, bloom turun 1,6 → 0,4, ambient 0,12 → 0,03. Scene tidak lagi "terang rata".
- **Sapuan "kantor terbentuk"** (§4m) — dither Bayer 4×4 menyeberangi ruangan 2,6 s saat GLB selesai dimuat, tepi silver brand `#d2d3d4`. Terverifikasi 60 FPS di browser.
- **Titik awal tur pindah ke Lounge** (§4k) — `START_ROOM` di store, satu konstanta untuk kamera + `currentRoom` + hash URL.
- **Konten layar monitor jalan** (§6c) — Spotify pixel-art 96×54 di `OMon_AOC_2` lewat `emissiveMap`; blocker Blender **dilewati**, bukan dibereskan.
- **Light cone volumetrik DIHAPUS** (§4l) — sempat dibangun lalu dibuang; dua temuan mahalnya dicatat supaya tidak diulang.

**Per 31 Jul** — sudah masuk `main`:
- **Loading screen isometrik SELESAI** (§4n) — port animasi basement.studio, di-render di **Web Worker** supaya tidak beku saat kompilasi 233 shader (stall 2,3 s). Menjawab TODO "loader saat mengunduh". Koreografi: intro → idle putar-jeda → outro; gerbang `sceneReady` (dari `dt > 0.25` di `Office.tsx`), bukan `useProgress` drei yang bohong.
- **🐛 Bug merge lintas-wilayah dibetulkan** (§4o) — `frameloop="demand"` (dari `main`) vs tiga `useFrame` baru (dari `feature/screen-content`) **lolos auto-merge tanpa konflik** lalu membekukan seluruh scene: tampilan stuck + berat tapi navigasi tetap jalan. `frameloop="demand"` dicabut. Penjaganya: **`INVARIANTS.md`** + dua test invariant (frameloop & loader gate).
- **perf(billiard): traverse tiap frame dihentikan** (§6d) — `BilliardLights` menyapu seluruh scene graph 60×/detik sepanjang tur padahal minigame tak dibuka (dan 0 node cocok). Digerbangi `active`.
- **Label waypoint mengekor kursor** (§4k) — nama ruangan tidak lagi dipaku di tengah bidang, tapi menyusul kursor dengan sedikit tertinggal ("ditarik tali"). Pindah dari `<Html>` drei ke overlay DOM tunggal di luar Canvas (`ui/WaypointLabel.tsx`); gerak kursor lewat ref, bukan state React.

**Per 3 Agu:**
- **Waypoint Lounge & Function TUNTAS** (§4k) — TODO verifikasi 30 Jul ditutup; semua waypoint sudah terukur & terlihat.
- **KTX2 dicoba ulang lalu DITOLAK** (§7) — jalan secara teknis (VRAM 240 → 64 MB) tapi kualitas visualnya kalah dari yang asli. Skripnya disimpan sebagai jawaban yang sudah dibayar, bukan pekerjaan tertunda. **Jangan diusulkan lagi tanpa membandingkan mata dulu.**
- **Perangkat sentuh: scene 3D jadi PEMANDANGAN** (§4p) — waypoint & minigame billiard mati di `(pointer: coarse)`. Penjaganya `INVARIANTS.md` §6 + test invariant ketiga.

- **Hero dipendekkan jadi 70dvh di HP** (§4p) — konten mengintip di bawah canvas ala basement.studio, **dan** framing 3D melebar: `fov` three.js itu vertikal, jadi viewport jangkung menyempitkan pandangan kiri-kanan (iPhone 15: hFOV 29,8° → 41,7°). "see our work" disembunyikan di HP.
- **Branch `join` di-merge, blocker §6 TERBUKA** (§4q) — room links navbar + routing berbasis path (`/lounge`, `/office`, …) dari Nico masuk; pengunjung HP tidak lagi terkunci di Lounge. Konflik `Hero.tsx` (pinned scroll vs 70dvh) **digabung, bukan dipilih salah satu**: track mobile disetel 126dvh supaya rasio lepas pin 0,444 sama persis dengan desktop. Satu bug layar-putih reduced-motion ikut ketangkap saat merge.
- **🔥 Empat perbaikan performa & navigasi** (§4r) — semuanya berangkat dari keluhan nyata, bukan tebakan: MSAA dimatikan (**30 → 60 FPS** di kerapatan Retina), engine matter-js yang berdetak selamanya dihentikan (biang "laptop panas"), pola mount-semua-ruangan dicabut, chunk billiard ditunda + di-prefetch. Alat ukurnya ikut disimpan (`scripts/measure-frames.mjs` + `shoot.mjs`).
- **Aliasing itu PILIHAN ESTETIK** (§4r) — setelah melihat perbandingan berdampingan, Keano **lebih suka** tepi yang sedikit bergigi; sejalan dengan arah PS1/basement.studio. Jangan tawarkan SMAA/FXAA/MSAA sebagai "perbaikan".
- **Konten per-ruangan lengkap** (§4q) — tiap ruangan punya narasinya sendiri: Lounge (perusahaan), Office (layanan), Meeting (studi kasus), Function (orang & karir). `Services.tsx` dihapus, diserap jadi accordion 9-item di Office.

**⬅️ Berikutnya:** (a) **bug billiard**: bola yang masuk lubang harus dibekukan jadi `fixed` (§6d); (b) review billiard di browser (§6d), masih belum pernah dilihat mata — sekarang lebih mudah karena chunk-nya sudah dipisah; (c) uji anti-beku loader di browser sungguhan (DevTools Performance saat kompilasi shader) — inti keputusan Worker, baru bisa dibuktikan mata (§4n); (d) beresi blocker layar (§6c) — pisah material MacBook, unwrap ulang UV iMac; (e) post-processing PS1 (§4b), pass terakhir untuk look basement.studio.

## 🎉 MVP 1 SELESAI (27 Jul) — **50-60 FPS di browser**

Seluruh scene (5 ruangan) jalan mulus di browser: **8,0 MB, 401 draw call, 0 lampu realtime** (semua cahaya + bayangan di-bake ke lightmap).

> Model yang dipakai sekarang adalah **`public/3d/models/office.glb`** (8,09 MB per 30 Jul, sudah termasuk 5 karakter) di dalam app web — bukan lagi viewer HTML `export-test/`. Jalankan `bun dev` → `http://localhost:3000`. Viewer lama masih dijelaskan di §4e sebagai rujukan kalibrasi.

| Metrik | Awal | Final |
|---|---|---|
| Ukuran GLB | 35 MB | **8,0 MB** |
| Draw call | 2.522 | **401** |
| Lampu realtime | 39 | **0** (baked) |
| FPS | 1-2 | **50-60** ✅ |

Tahapan yang menghasilkannya — masing-masing ada sub-bab detailnya:
1. **Pre-export audit** (§4d): 0 material prosedural, 0 CURVE, 0 AREA light, 0 image unpacked, 0 objek tanpa UV
2. **Optimasi poly** (§4c): 1.008M → 760.871 tris
3. **Resize texture** (§4c): 134,4 → 52,9 MP (−61%); temuan besar: Magic Keyboard sendirian 62% beban texture
4. **Merge objek** (§4f): 2.522 → 401 draw call — *ini yang paling menentukan FPS*
5. **Bake lightmap** (§4g): 39 lampu realtime → 0

**Pelajaran utama:** bottleneck-nya **draw call & lampu realtime**, BUKAN poly count. 995k tris tetap 50-60 fps setelah draw call ditekan dan lampu dibake. Urutan diagnosa yang benar ada di §4e.

**Berikutnya:** ~~Karakter PS1 (§6b)~~ ✅ **5 karakter tampil di web 29 Jul.** ~~Ukur ulang FPS~~ ✅ **60 FPS terukur 30 Jul** dengan karakter + N8AO + contact shadow + sapuan reveal aktif (§4l, §4m) — tambahan-tambahan itu tidak memakan anggaran performa MVP1. Sisa: review visual billiard di browser (§6d).

**Pekerjaan aktif:** melengkapi & menata furniture/aksesori office. Semua furniture office sudah **dirapikan ke sub-collection** di bawah `Office_Plan`. **Utang teknis import mentah BERES** — `OP_Electronics` diciutkan 1424 → **131 objek** (semua junk `Object_*/Node_*/pCube*/pPlane*/RootNode*` dibuang; part di-rename bersih: `OMagic_KB_/Mouse_`, `OMon_AOC_`). **11 kursi kantor Sketchfab di-rename `OChair_Office_*` & dipindah ke `OP_Seating`.** Furniture office terkini (22 Jul): **pantry cabinet L-shape `OP_Pantry` (56 part: base unit + tower + wall unit + worktop)** di pojok barat laut, **printer `OP_Printer` + shredder `OP_Shredder`** (di pojok, `OP_Electronics`), **wardrobe/kabinet rendah `OP_Ward_*`** (11 part, di `OP_Shelves`), **microwave `OP_Microwave` + bar table `OP_BarTable_*`** (pojok barat daya, di atas pantry base). **Pencahayaan office SUDAH ADA (22 Jul)** — track lighting `OP_TrackL/TrackLV_*` (8 SPOT) + lunch pendant `OP_LunchLight_*` (3 POINT), collection `OP_Lighting`. Collection sudah dirapikan (0 loose). Scene total ~**1391 objek, 254 material**.

> ✅ **Utang teknis import mentah SELESAI (21 Jul):** ratusan node sampah FBX/Sketchfab dibuang, scene 2551 → 1189 objek. Sisa loose di Scene Collection tinggal **18 objek**: `ODisp_Brio_Root`, `OBar_*` (5), `OP_Shelf2_*` (9), 3 `ODesk_Root_Single_Dup*` — semua geometry manual bersih, tinggal dipindah ke sub-collection `Office_Plan` yang sesuai (opsional, tidak menghambat export).

---

## 1. Gambaran Proyek

**Tujuan:** website tour kantor 3D interaktif — pengunjung bisa menjelajahi kantor Cogniti secara virtual di browser.

**Pipeline:**
```
Scan ruangan (Polycam) → Import GLB ke Blender (referensi)
→ Remodel manual geometry bersih (box modeling)
→ Export GLB → Three.js di browser
```

**Kenapa remodel, bukan pakai scan langsung?** Scan Polycam berat (~90k faces per ruangan), berantakan (floating geometry, permukaan bergelombang), dan materialnya baked. Remodel manual menghasilkan geometry ringan (~12k faces satu ruangan penuh isi), rapi, dan material bisa dikontrol.

**Struktur file Blender:**
- Collection `Reference` — scan Polycam (wireframe, hide_select, tidak ikut export)
- Collection `Remodel` — geometry bersih hasil remodel

---

## 2. Ruangan 1: Lounge / Billiard Room ✅ (~95%)

Ruangan 5m × 16.6m, plafon 3.6m. Scan dibersihkan, diluruskan (rotasi 1.02°), lantai di Z=0.

### Struktur
| Objek | Detail |
|---|---|
| Floor | x −1.95..2.45, y −8.25..8.10 + nook (lorong kecil x 1.65..2.45, y 6.75..8.10) penghubung ke smoking area |
| Walls | H 3.6m, tebal 0.1; double-door di dinding kiri (ke office area); dark charcoal |
| Ceiling | Flat dark matte charcoal — trik "dark ceiling" ala basement.studio, sengaja TIDAK model pipa/ducting exposed |
| Lantai | Tile hitam glossy 57cm — texture baked `T_FloorTile` 1024px, roughness 0.18 |

### Furniture & Objek
| Objek | Prefix | Catatan |
|---|---|---|
| Meja billiard (flip → air hockey) | `PT_*` | 1.51×2.50m, felt oranye. Bentuk FINAL. Fitur flip = interaksi web nanti |
| Lampu gantung billiard ×3 | `BilLight_*` | Cage pendant hexagonal bentuk pir (final), bohlam edison emissive, wireframe modifier |
| Sofa 3-seat + 2-seat | `SofaA_*`, `SofaB_*` | Putih, layout L di ujung utara |
| Coffee table | `CT_*` | Kayu, laci + trestle legs |
| Karpet lounge | `Rug_Lounge` | 3.1×2.55m, dua warna (tengah taupe + border gelap 6cm), bevel |
| Front desk | `FD_*` | Rebuild dari 4 foto produk ruparupa; top L-shape SATU mesh tanpa seam; panel greige + wood cap + reveal silver |
| Dresser + cermin | `Dresser_*`, `StandMirror_*` | Cermin arch nyender dinding (tanpa kaki), di atas kabinet |
| Half pillar | `Pillar_Lounge` | 0.40×1.10×3.6m di garis dinding kiri — setengah nembus office area; sejajar kaki billiard |
| Panel meteran listrik | `EP_*` | Dari foto IMG_6138/6139: 3 lampu indikator, 3 meter Hz/A/V (kecil, pepet kanan), kunci nancep, 2 rotary switch identik, 2 konduit |
| Vas palem besar | `Vase_*` | Dari IMG_6141: vas cream spin-profile + 10 pelepah palem prosedural |
| Plant stand pojok | `PS_*` | Dari IMG_6142: frame emas "stroke-only" + top putih, pepet pojok tembok |
| Pot anggrek | `Orchid_*` | Pot hitam + 7 daun + 6 batang, di atas plant stand |

### Pencahayaan
- 3 pendant billiard (`Pendant_1-3`) + 2 pendant front desk — Point, warm
- `Ambient_Fill` & `Lounge_Fill` — **Point** (dulu Area — diganti karena glTF tidak support Area light)

### PR Lounge
- ~~Dinding kaca ke office area~~ ✅ selesai 17 Jul (`GWO_*` — kaca + pintu ayun ganda, lihat §3b)
- ~~Dinding kaca ke smoking area~~ ✅ selesai (GW_*, dari IMG_6160)
- Interaksi flip billiard ↔ air hockey (nanti, fase web)

---

## 3. Ruangan 2: Smoking Area ✅ (~95%)

Interior x −2.05..2.45, y 6.85..11.55, H 3.6m. Di utara lounge, tersambung via nook + pintu kaca. Remodel di collection `Smoking` (prefix `SMK_*`), kerangka di `Remodel` (prefix `SM_*`).

### Kerangka
| Objek | Detail |
|---|---|
| Lantai & plafon | **Digabung dengan lounge** — lihat catatan di bawah |
| SM_Wall_N | Dinding utara, dark charcoal (TV wall). Keputusan: SOLID, tanpa kaca grid seperti scan (ruang di baliknya tidak dimodel) |
| SM_Wall_W / E | Cream hangat (0.72/0.66/0.55). W & E identik: y 6.85..11.65. Slab timur `Walls` lounge dipotong di y=6.85 biar tidak overlap |
| GW_* | Dinding kaca + pintu ke lounge (dibuat sesi sebelumnya dari IMG_6160) |

### Lantai & plafon GABUNGAN (13 Jul)
- `Floor` = **satu rectangle** x −2.05..2.45, y −8.25..11.55 menutup lounge + smoking sekaligus — material `M_Floor` (baked `T_FloorTile`), UV cube project 4m. Tile nyambung mulus lewat pintu kaca, tidak ada seam/bolong
- `Ceiling` = satu plane footprint sama, z=3.6, normal ke bawah, `M_Ceiling` charcoal
- `SM_Floor`, `SM_FloorPatch`, `SM_Ceiling` + materialnya **dihapus** (tidak perlu bake tile smoking terpisah lagi)

### Furniture & Objek
| Objek | Prefix | Catatan |
|---|---|---|
| Sofa cokelat 2-seat | `SMK_SofaBr_*` | 2.6m, sandaran nempel kaca (selatan), menghadap TV. 2 dudukan lebar + 2 bantal sandaran (14 Jul: bantal biru → cokelat sama dengan dudukan; fix z-fighting sisi arm — bidang Base/Back coplanar digeser 5mm) |
| Loveseat cream | `SMK_Love_*` | Dinding barat, menghadap timur. **Di-rebuild 14 Jul** = copy kursi frame besi di-stretch jadi 1.3m (kursi asli & loveseat memang model sama, beda panjang) |
| Kursi frame besi ×2 | `SMK_Chair0/1_*` | **Dari foto IMG_6163–6165** — lihat bagian Kursi di bawah. ✅ SELESAI (kerangka + bantalan) |
| Karpet strip abu | `SMK_Rug` | x −1.45..0.95, y 7.95..9.75. Material `M_SM_Rug_Grey` **✅ SUDAH DI-BAKE** (Wave+ColorRamp → image texture; sudah bukan prosedural) |
| TV + kabinet | `SMK_TV_*`, `SMK_Cab_*` | Dinding utara: TV 1.45m + kabinet putih kaki kayu |
| APAR + platform | `SMK_Ext_*`, `SMK_Platform` | Pojok barat laut. **Rebuild 14 Jul**: tank spin-profile merah + label putih + valve chrome + handle/lever hitam + pin + hose curve + nozzle, parent `SMK_Ext_Root` |
| Wall art | `SMK_WallArt_*` | **Rebuild 14 Jul dari foto IMG_6167**: 15 part parent `SMK_WallArt_Root` — 7 piringan dish (filigree dark besar tengah, 2 lace putih, 2 bronze, 2 teal) + 3 inner plate + 5 mangkok emas dome. Material: Dark/Teal/Gold/Bronze/White/Plate_Grey |
| Pedestal + tanaman | `SMK_Ped_*`, `SMK_Plant_*` | Frame emas + top putih + pot & daun, dekat dinding barat utara |
| Standing ashtray | `SMK_Bin` | **Rebuild 14 Jul**: silinder R0.11 H0.6 dengan jendela buang + ceruk ashtray di top, di samping loveseat |

### Kursi frame besi (dari foto IMG_6163/6164/6165) — ✅ SELESAI (14 Jul)
Kursi aslinya = kerangka besi + bantalan lepas. Semua bagian sudah jadi:
- **`ArmBackLoop`** = SATU curve nyambung (bevel 12mm, fillet arc r=5cm): kaki depan kiri ↑ → arm lurus miring ~4° → cross belakang atas → arm kanan ↘ → kaki depan kanan. Tanpa bola sudut, tanpa bottom rail (kursi asli memang tidak ada)
- **BackLeg** miring (raked), ujung atas nyelup tepat di sumbu arm; **BackRail** horizontal z=0.276 + **BackStrut** miring naik ke garis puncak — kemiringan senada kaki belakang
- **SeatRail** kiri-kanan miring 4° (z 0.318→0.276) — penyangga dudukan; semua tube 24 seg + smooth shading
- **Deck slat** (`M_SMK_Chair_Slat`, abu): border + 6 bilah, mepet rail (sempat melayang 23mm, diturunkan pakai bbox)
- **Bantalan** (`M_SMK_Chair_Cushion`, fabric cream 0.87/0.83/0.74, sheen 0.4, bevel 2.8cm): `CushSeat` 54×57cm miring 3.32° ngikutin slope deck, `CushBack` 57×34cm miring 16.2° nyender di strut
- Posisi: x 0.78, y 8.60 & 9.28, hadap barat, 0.60×0.60m; Chair1 = copy Chair0

**Loveseat cream** (`SMK_Love_*`) di-rebuild 14 Jul: yang lama (blocky) dihapus, diganti copy Chair0 di-stretch vertex-level jadi 1.3m (pojok/fillet tidak melar) + mirror menghadap timur, strut jadi 4. User konfirmasi kursi & loveseat aslinya memang model sama beda panjang.

### Pencahayaan smoking
`SM_Light_0/1` — 2 Point light warm di plafon (z 3.3, y 9.2 & 10.8, energy 50/40 W).

**Ceiling lamp ×4 (24 Jul)** — `FR_CeilLamp_0..3` + `FR_CeilLight_0..3` (di `FR_Lights`): linked duplicate `OP_MR_CeilLamp_1` (scale 0.35), posisi dari annotate user: (−0.93, 10.52) / (1.63, 10.45) / (1.58, 7.89) / (−0.94, 7.96), top snap ceiling 3.6. + 4 POINT 150W warm. ⚠️ Gotcha: origin lamp ≠ center geometry → light 2/3 sempat melenceng ~24cm dari lampunya; fix = snap light ke **pusat geometry bbox** tiap lampu, bukan ke koordinat patokan.

### Teknik deteksi pintu di scan
Histogram strip dinding gagal (scan nutup rapat). Yang berhasil: **peta okupansi lantai** (numpy histogram2d grid 20cm) — bukaan pintu kelihatan sebagai ceruk di footprint lantai. Untuk layout furniture: histogram okupansi di band ketinggian z 0.25–0.85 (level dudukan).

---

## 3b. Ruangan 3: Office Area ✅ (~95%) (DIMULAI 17 Jul — interior, pencahayaan & bake lightmap SELESAI 27 Jul)

Capture ke-3, ruangan besar penghubung. Scan diimport (`OfficeScan`, collection `Scan_Office`). Extent blockout: **X −19.75..−2.05, Y −8.35..5.75, Z 0..3.6** — membentang ke barat dari dinding kiri lounge.

### Struktur collection (`Office_Plan` — dirapikan lagi 23 Jul: 45 loose sink/faucet/SRack → `OP_Pantry`, lampu baru → `OP_Lighting`, mirror → `OP_Decor`. **Rapi total 24 Jul: 0 loose di root scene & `Office_Plan`** — 25 `MR_*` + AirVent ×4 → `OP_MeetingRoom` (71 obj), `OP_WB2_*` → `OP_Whiteboard`, Dyson → `OP_Electronics`, `OP_MR_Ceiling`+`OP_WoodSlat_Wall` → `OP_Structure`, `OP_Vase_Body/Palm` keluar dari `LR_Furniture` → `OP_Decor`)
Semua furniture/aksesori office sudah dipindah dari Scene Collection ke sub-collection tematik:

| Sub-collection | Jml objek | Isi |
|---|---|---|
| `OP_Structure` | 19 | Kerangka: dinding N/S/W, `OP_Floor_West`, pintu utara `OP_DoorN_*` (daun+kusen+2 handle), `OP_WestRm_*` sekat barat, `OP_Pillar_N/Mid`, `OP_Stair_Step1/2/3` |
| `OP_Desks` | 309 | 11 meja detail `ODesk_*` (lihat bawah) + sisa `OP_Desk_B/D` |
| `OP_Electronics` | **128** | 11 iMac `OP_iMac_*` + 11 `OMagic_KB_/Mouse_` (Apple KB/mouse, di-rename bersih) + 5 monitor `OMon_AOC_*` + MacBook `OMacbook_*`. **✅ semua junk import dibuang** (dulu 1424) |
| `OP_Seating` | 70 | 5 bar stool `BS555_*` + kursi kerja `OP_Chair_*` (seat+back+4 leg) + **11 kursi kantor `OChair_Office_*`** (eks-Sketchfab) + gaming chair `OChair_Gaming_*` (3 part) |
| `OP_LunchTable` | 61 | Lunch table `OP_LunchTable_*` + 4 stool kayu `OP_StoolW0..3` |
| `OP_Decor` | 31 | Tanaman lantai `OP_Plant_*` (basket + 8 daun + slat pot) + `OP_GrassRug` + **`OP_WallMirror`** + **frame pilar `OP_Pillar_Frame` + `OP_Pillar_Art`** (23 Jul) |
| `OP_Sockets` | 44 | Socket dinding `OP_Socket_*` (plate + recess + 2 pin + plug head) |
| `OP_Whiteboard` | 22 | Whiteboard beroda `OP_WB_*` (papan 1.97×0.96m + frame + 2 post + kaki + 4 caster + knob + rail) |
| `OP_Shelves` | 41 | Rak berdiri `OP_Shelf_*` + rak dinding `OP_WShelf_*` + **wardrobe/kabinet `OP_Ward_*`** (11 part) + `OP_Shelf2_*` (9) + **3 storage bag `OP_Shelf_Bag1..3`** (23 Jul) |
| `OP_Pantry` | 101 | **Pantry cabinet L-shape** (base unit + tower + wall unit + worktop + handle) + **area wastafel** `OP_Sink_*`/`OP_Faucet_*`/`OP_SRack_*` (45 obj, dipindah dari root 23 Jul) — lihat bawah |
| `OP_Lighting` | 122 | Pencahayaan office: track lighting `OP_TrackL_*`/`OP_TrackLV_*` + **duplikat `OP_TrackL2_*`** + lunch pendant `OP_LunchLight_*` + **ceiling lamp `OP_CeilLamp_A/B` + main light `OP_CeilLight_A/B`** + **hanging lamp set `OP_HangLamp_*`/`OP_HangLight_*`** (23 Jul) — lihat §pencahayaan |

Pilar timur `OP_Pillar_E` batas ke lounge ada di collection `Structure`.

> ✅ **Collection dirapikan lagi (22 Jul):** 131 loose di Scene Collection → **0**. Semua ODesk dup/microwave/shelf2/bar/lunch-light dipindah ke sub-collection tematik. Dibuat `OP_Lighting`. Junk import Brio dispenser (16 node GLTF `Object_*/Mesh*/Group*`) di-**flatten jadi 1 mesh bersih `ODisp_Brio`** (1640 verts, di `OP_Electronics`), 12 empty dibuang. Total scene 1406 → **1391 objek, 254 material**.

**Loose di Scene Collection (belum dipindah, 18 objek — semua geometry manual bersih):**
- **`OBar_Root`/`OBar_Top`+`OBar_Leg0..3`** — bar counter kayu (mat `OBar_Wood`/`OBar_Steel`), top z≈1.36–1.40m, di dinding barat X −16.3..−15.7, Y −5.86..−4.72 (samping dispenser)
- **`ODisp_Brio_Root`** — water dispenser Brio, di dinding barat X≈−15.9 Y≈−6.16, rotasi Z 90° (hadap +X)
- **`OP_Shelf2_*`** (9 part) — rak dinding kedua (top z≈1.5m) di X −4.6..−3.5, Y≈5.2–5.6 (dinding utara)
- **`ODesk_Root_Single_Dup`/`Dup2`/`Dup3`** — 3 meja tambahan (Dup/Dup2 sisi utara Y≈3.3; Dup3 di Y≈−6.1, X −3.75..−2.25)

11 kursi kantor Sketchfab yang dulu loose kini sudah **di-rename `OChair_Office_*` & masuk `OP_Seating`**.

### Desk detail per foto IMG_6179 ✅ (`ODesk_*`, 27 part/unit) — kini 11 meja (2 pod + 1 single)
Meja kantor detail-tinggi sesuai foto (kayu oak top + pedestal laci + kaki loop besi). Unit dasar footprint 1.2×0.6m, tinggi 0.75m. Material: `ODesk_Oak/OakV`, `ODesk_BlackSteel`, `ODesk_BlackPanel`, `ODesk_Chrome`, `ODesk_Brass`, `ODesk_GreyFabric`.

**Susunan (21 Jul):** 11 root — 2 pod cluster benching + 1 meja single.
- **Pod A** (`ODesk_Root_L1/L2/R1/R2/B`) — center x≈−11.28 y≈−5.09
- **Pod C** (`ODesk_Root_C_L1/L2/R1/R2/B`) — center x≈−6.15 y≈−5.05 (offset +5.125 di X)
- **Single** (`ODesk_Root_Single`) — 1 meja lepas

Pola tiap pod: 4 meja vertikal 2×2 (kiri `L1/L2` hadap −X, kanan `R1/R2` hadap +X, back-to-back) + 1 meja horizontal `B` di sisi −Y. Blockout `OP_DeskIsland_A/C` lama sudah dihapus.
| Bagian | Objek | Catatan |
|---|---|---|
| Top oak | `ODesk_Top` | 1.2×0.6m, tebal 3cm, z 0.72..0.75 + 2 grommet kabel (`ODesk_Grommet_Cap/Ring_0/1`) |
| Pedestal laci | `ODesk_Ped_*` | Sisi kiri: body + door + drawer + top slab + 2 edge + 4 foot + lock/key/keyring — kabinet laci berkunci |
| Kaki loop besi | `ODesk_Leg` | Sisi kanan, loop frame plat pipih hitam (480 verts, mat BlackSteel, bevel 6mm) |
| Detail | `ODesk_Panel`, `ODesk_Rail`, `ODesk_Strap_0/1`+Pad, `ODesk_HandleLiner`, `ODesk_Logo` | Panel modesty, rail, strap organizer kabel, liner handle, logo |
| Privacy screen | (fabric grey gantung) | Panel `GreyFabric` tergantung 2 strap di tepi belakang top |

### Elektronik meja ✅ (`OP_Electronics`, 128 objek — sudah bersih)
- **11 iMac** (`OP_iMac_Base/Stand/Display/Screen/Logo/PortC_*/PortPower`) — di atas desk pod, layar menghadap sesuai orientasi meja
- **Magic Keyboard & Magic Mouse** ×11 (`OMagic_KB_*` / `OMagic_Mouse_*`) — asset Apple FBX/OBJ yang sudah di-flatten & di-rename bersih
- **Monitor AOC** ×5 (`OMon_AOC_*`) + **MacBook** (`OMacbook_*`) di area meja

✅ **Cleanup selesai 21 Jul:** semua node sampah import (`Object_*` 959, `Node_*` 132, `pCube*` 70, `pPlane*` 60, `RootNode*`, `Geom*`, `group*`, `temp_export*`) sudah dibuang/di-join. `OP_Electronics` ciut 1424 → 123, total scene 2551 → 1189. GLB tidak lagi bawa ratusan node sampah.

### Furniture lain office ✅
- **Lunch table** (`OP_LunchTable_*`) + 4 **stool kayu** (`OP_StoolW0..3`) di sisi terbuka +X; top z≈1.03m bar height
- **Bar stool** `BS555_*` (gas-lift: base+collar+piston+stem+seat+footrest curve+hoop clamp+lever+tip) — 5 kursi berjajar X=−13.95, hadap −X ke lunch table
- **Kursi kerja** — `OP_Chair_*` manual (seat + back + 4 leg, 1 unit) + **11 kursi kantor `OChair_Office_*`** (eks-Sketchfab, sudah di-rename & masuk `OP_Seating`) satu per meja di kedua pod + gaming chair `OChair_Gaming_*`
- **Bar counter** `OBar_*` (top kayu `OBar_Wood` z≈1.4m + 4 kaki besi `OBar_Steel`) di dinding barat, samping water dispenser
- **Water dispenser Brio** `ODisp_Brio_Root` — nempel dinding barat (X≈−15.9, Y≈−6.16), hadap +X ke arah lunch table
- **Tanaman lantai** `OP_Plant_*` (basket + 8 daun + slat) + `OP_GrassRug` (1.36×1.14m) di x≈−7.5
- **Rak** `OP_Shelf_*` (berdiri: top/bottom/side/H1-3/V1-2) + `OP_WShelf_A/B/C` + **`OP_Shelf2_*`** (rak dinding utara, top z≈1.5m)
- **Socket dinding** `OP_Socket_*` — 10 buah (plate + recess + 2 pin + plug head)

### Dinding kaca ✅
- **`GWO_*`** (di `Structure`, 8 part) — bukaan kaca + **pintu ayun ganda** lounge↔office di x≈−2.0, y −3.09..−0.71, H 2.45m: `GWO_DoorA/B_Glass`+`_Smoke` + `GWO_Handle_A/B`+`_In`
- **`GWL_*`** (di `Structure`, 13 part — BARU) — partisi kaca **frosted** 3 seksi `N1`/`N2`/`S`, tiap seksi `_Glass`+`_Frost`+2 `_Jamb`, plus `GWL_Header`

### Pantry cabinet L-shape ✅ (`OP_Pantry`, 56 part — 22 Jul)
Dapur/pantry kabinet berbentuk L di pojok barat laut office, bbox **X −17.81..−15.56, Y −3.54..−2.95, Z 0.30..2.72** (nempel dinding barat + utara). Terdiri dari 4 modul:
| Modul | Objek | Catatan |
|---|---|---|
| Base unit | `OP_Pantry_Base_*` | Carcass + 2 pintu (`DoorA/B` + inset) + plinth + `Worktop` — kabinet bawah dengan meja kerja |
| Tower unit | `OP_Pantry_Tower_*` | Kolom tinggi: back/bottom/top + 2 side (E/W) + 2 pintu (DoorLow/DoorUp + inset) + 2 shelf |
| Wall unit | `OP_Pantry_Wall_*` | Kabinet gantung: carcass + bottom + 2 shelf |
| Pintu kaca dinding | `OP_Pantry_WallDoor0..3_*` | 4 pintu (frame L/R/T/B + panel) — glass front (mat `OP_Pantry_Glass`) |
| Handle | `OP_Pantry_CupPull_0..2`, `Knob_A/B`, `TKnob_Low/Up`, `WKnob_0..3` | Cup pull laci + knob pintu + tower knob + wall knob |

### Printer, shredder, wardrobe, microwave ✅ (22 Jul)
- **Printer** `OP_Printer` (di `OP_Electronics`) — X≈−9.49, Y≈−6.77, di atas permukaan z≈0.75m. 6 material: `Glass/Plastic/Lid/Socket/PlasticTop/Metal`
- **Shredder** `OP_Shredder` (di `OP_Electronics`) — X≈−9.50, Y≈−7.79, di lantai. 8 material: `Body/Paper/Glass/Panel/Misc/Trim/Chrome/Bin`
- **Wardrobe/kabinet rendah** `OP_Ward_*` (11 part, di `OP_Shelves`) — bbox X −9.78..−9.29, Y −7.64..−6.56, Z 0..0.75. Carcass (back/bottom/top + 2 side N/S) + 2 pintu (F/B) + plinth + shelf + 2 rail (top/bot)
- **Microwave** `OP_Microwave` (di `OP_Electronics`) — X −16.44..−15.96, Y −8.17..−7.74, z 1.19..1.49m. Mat `Oven`
- **Bar table** `OP_BarTable_*` (7 part, di `OP_LunchTable`) — X −16.52..−15.89, Y −8.18..−7.73, z 0.30..1.19m: top + 4 kaki (A–D) + 2 brace (E/W)
- **Water dispenser Brio** `ODisp_Brio` — di-flatten 22 Jul dari 16 node import GLTF jadi 1 mesh bersih (1640 verts). Bbox X −16.29..−15.89, Y −6.20..−5.88, z 0.30..1.37m. Mat `BLACK_PLASTIC/GREY_PLASTIC/M_2022_09_17_1_1`

### Pencahayaan Office ✅ (22 Jul — pertama kali ada lampu di area office)
Collection `OP_Lighting` (80 objek). Semua **SPOT/POINT** (glTF-safe, bukan Area).
| Fixture | Objek | Detail |
|---|---|---|
| Track lighting utama | `OP_TrackL_*` (36 part) | Rail + 4 spot (rose/frame/lens/cable/mount) di atas desk pod A, bbox X −12.12..−6.13, z 2.34..3.60. **4 SPOT** `OP_TrackL_Light_N0/S1` (E=40W) |
| Track lighting cabang | `OP_TrackLV_*` (26 part) | Rail vertikal di desk pod area timur, X −6.70..−5.60. **4 SPOT** `OP_TrackLV_Light_E0/E1/W0/W1` (E=40W) |
| Lunch pendant ×3 | `OP_LunchLight_*` (18 part) | Cage pendant di atas lunch table (X≈−14.4, Y −7.21..−5.56, z 2.23..3.60): ceil-rose+socket+cable+bulb+cage + **3 POINT** `OP_LunchLight_Point_0/1/2` (E=40W) |
| Track duplikat (23 Jul) | `OP_TrackL2_*` (18 part) | Copy unit dasar TrackL, dipasang di X≈−3.01 Y≈−5.24 (atas meja single Dup3). Mesh linked-duplicate, **light data independen** (2 SPOT) |
| **Ceiling lamp ×2 — MAIN LIGHT** (23 Jul) | `OP_CeilLamp_A/B` + `OP_CeilLight_A/B` | Fixture flat bulat Ø60cm (dari `ceiling_light.glb`, flush ceiling z 3.51–3.6) di (−10.58,−1.04) & (−4.42,−1.06) + **2 POINT 400W kuning hangat (1.0, 0.72, 0.4) ≈2700K** — satu²nya lampu yang cast shadow |
| Hanging lamp set (23 Jul) | `OP_HangLamp_Circle/Square/Line` + `OP_HangLight_*` | Set 3 lampu gantung (dari `ceiling_lamps.glb`, flatten+join, scale 0.7) di ceiling dekat titik (−4.1, 4.3), fixture z≈2.96–3.0, layout horizontal sejajar `Walls_Left`. Faces bawah dikasih mat emissive `OP_HangLamp_Glow` (strength 5) + 2 POINT 200W + 1 AREA 80W (⚠️ Area di-drop saat export glTF) |

Material: `OP_TrackLight_Walnut` (bodi track), `OP_TrackL_BulbEmit` (emissive bohlam), `OP_HangLamp_Glow` (emissive warm diffuser).

> ⚠️ **Perf (23 Jul):** 31 lampu total sempat bikin *"Shadow buffer full (2243/2048)"* + viewport berat. Solusi: **shadow OFF di 29 lampu** (cuma `OP_CeilLight_A/B` yang cast shadow) + `shadow_pool_size` 512 → **1024MB**. Buat bake render final, hidupin lagi shadow per-lampu seperlunya.

### Dekorasi office ✅ (23 Jul)
- **Storage bag ×3** `OP_Shelf_Bag1..3` (di `OP_Shelves`) — box open-top ala DRÖNA 30×30×27cm, taper bawah + bevel, di cell rak cubby (kiri-baris3 / tengah-baris2 / kanan-baris1, sesuai annotate). Masih tanpa material kain
- **Rak cubby di-join + oak (24 Jul)** — `OP_Shelf_*` 9 part → **`OP_Shelf_Cubby_A`** (dekat pintu utara) dan `OP_Shelf2_*` 9 part → **`OP_Shelf_Cubby_B`** (dekat function room), masing² 1 mesh 102 polys. Mat `OP_Shelf_Wood` diganti **`ODesk_Oak`** (prosedural wave, Object coords — nggak butuh UV, tapi wajib bake sebelum export, ikut daftar bake desk). Bag1..3 sengaja tetap terpisah
- **Pintu utara oak (24 Jul)** — `OP_DoorN_Leaf` mat `M_OP_DoorWood` → `ODesk_Oak`. ⚠️ Object coords: skala motif ikut dimensi objek, di pintu seratnya lebih besar/blobby dari desk — kalau ganggu, bikin varian oak dengan mapping scale khusus pintu
- **Wall mirror** `OP_WallMirror` (di `OP_Decor`) — dari Sketchfab (5 part di-join), scale 0.6 → 60×75cm, di `OP_Wall_Perimeter_NW` y=1.598 (gap 2mm), center (−7.475, z 2.05). ⚠️ Frame masih tekstur Minecraft `spruce_log.png` pixelated — ganti kayu polos kalau mengganggu
- **Picture frame pilar** `OP_Pillar_Frame` + `OP_Pillar_Art` (di `OP_Decor`) — frame "Emapale Enmarcate" (Sketchfab, chayaruart, CC-BY) portrait 46.6×66cm di muka `OP_Pillar_Mid` (y=−5.908, center x≈−9.6, z 1.35..1.93; hook ngambang dihapus). Art = plane UV fill-crop dengan image **`Downloads/Mona Lisa Parodies….jpeg`** (640×959) — ⚠️ **image belum di-pack ke .blend**
- **Geser dinding GWM** — 9 objek `GWM_*` (jamb/header/wall-above/door/glass/frost/handle) digeser total **15cm ke −X**

### PR Office (berikutnya)
- ~~Rapikan asset import mentah~~ ✅ SELESAI 21 Jul (2551 → 1189 objek)
- ~~Pindahkan objek loose ke sub-collection `Office_Plan`~~ ✅ SELESAI 22 Jul (131 → 0 loose; Brio dispenser di-flatten jadi 1 mesh)
- ~~Pencahayaan office (Point/Spot warm)~~ ✅ SELESAI 22 Jul (track lighting 8 SPOT + lunch pendant 3 POINT, collection `OP_Lighting`)
- Detail dinding + bukaan (jendela) verifikasi vs foto `Photo-reference-office/` (termasuk IMG_6176_2, IMG_6220–6227, IMG_6240–6242, IMG_6247–6252)
- Aksesori meja tambahan; verifikasi penempatan 11 kursi vs orientasi meja
- Isi pantry (barang di rak/worktop)
- ~~LED strip lantai~~ ✅ 24 Jul → **`OP_LEDStrip_Floor`** (di `OP_Lighting`, 96 polys): 1 mesh, strip 4cm×8mm ngambang 2mm di atas lantai. 33 stroke annotate user di-**straighten** (snap ke sumbu, collinear digabung) jadi 16 segmen: spine H di Y −1.85 + cabang V + stub meeting room; jalur barat Y −4.04 naik bertahap ikut Z tangga (0→0.1→0.2→0.3). Mat `M_LEDStrip` emission warm (1.0, 0.75, 0.45) **strength 8** (dipertahankan buat bake). **Keputusan: look final (warna warm vs cool-cyan + bloom) di-tweak di Three.js, bukan Blender** — pendar ke lantai otomatis dari bake lightmap, glow dari UnrealBloomPass
- Bake material furniture office bila ada yang prosedural (cek sebelum export)
- **Pack image `OP_Pillar_Art` (Mona Lisa) ke .blend** sebelum export
- Material kain untuk storage bag `OP_Shelf_Bag1..3`; ganti frame mirror dari tekstur Minecraft
- Kasih emission/isi ke frame `OP_TrackL2` bila perlu; cek annotate lama (bisa dihapus dari layer Note)

---

## 3c. Ruangan 4: Meeting Room 🚧 (DIMULAI 23 Jul)

Ruangan di balik bukaan barat laut blok utama office. Scan `MeetingScan` diimport ke collection `Reference` (bbox X −21.7..−13.7, Y −2.8..1.7). Objek prefix `MR_*`, sementara di collection `Office_Plan`; lantai `OP_MR_Floor` z=0; dinding TV = sisi barat x≈−21.55.

### Furniture & Objek (semua user-approved)
| Objek | Prefix | Catatan |
|---|---|---|
| Meja konferensi | `MR_Table_Top` + `MR_Table_Leg*` | Top 3.5×1.3m (z 0.69..0.75) kayu hitam gelap `MR_TableWood`. **Kaki = frame "stroke-only" bolong tengah** (ala plant stand PS_*): 4 panel V kanan-kiri (`LegV_L0/L1/R0/R1`, apex ngarah ke dalam, dari annotate) + 1 panel tengah (`LegC`), boolean frame border 7cm tebal 5cm, `MR_TableLeg` hitam pekat |
| Cekungan cable tray ×2 | (bagian `MR_Table_Top`) | 2 recess 62×21cm **dalam 5cm** di permukaan meja (dasar z 0.70, sisa daging 1cm), interior mat `MR_TableTray` hitam matte. Posisi dari annotate, dirapikan simetris terhadap center X=−17.96 |
| TV 98" frameless | `MR_TV_Body/Screen/Mount` | Layar **2.170×1.227m (diagonal 98" 16:9)**, bezel 3mm, panel depth 3cm, center z=1.5 y=−0.4 nempel dinding barat |
| Cabinet TV | `MR_TVCab_*` (18 part) | Dari foto **IMG_6254**: 1.93m × H0.52 × D0.45. Kiri→kanan: pintu sliding 5 slat horizontal + backing hitam (`DoorBack`, biar celah kebaca) \| rak terbuka + divider \| 2 laci + handle notch hitam. Plinth recessed. Mat `MR_CabWood` sonoma oak / `MR_CabInner` / `MR_CabDark` |
| Rally Camera (replika) | `MR_RallyCam_*` (12 part) | **Remodel manual dari 6 screenshot Sketchfab skfb.ly/ptFor** (model tidak bisa didownload — remodel manual, legal-safe & low-poly): base puck Ø11.4×5.2cm + 2 seam + top disc gloss, arm kapsul, head silinder Ø8.6×10.5cm, lensa barrel + glass + 3 ring concentric silver. Di atas cabinet, hadap meja. Mat `MR_Cam_*`. Belum: logo logi, tombol belakang (fase texture, mungkin skip) |
| Apple TV 4th gen | `MR_AppleTV` | Import `apple-tv-4th-generation.zip` → flatten 17 mesh jadi 1, scale ke 98mm real. **Fix**: slot material 0 kosong (putih) → `MR_AppleTV_Silver` aluminum; **remote bawaan model dihapus** (bmesh, sudah ada remote terpisah). Posisi: di atas cabinet TV (dari annotate) |
| Siri Remote | `MR_AppleRemote` | Import `apple_tv_remote.glb` → flatten 12 mesh, scale panjang 12.4cm, flat di meja. **Fix origin & rotasi baked**: origin di-set center of volume, sumbu panjang dideteksi PCA lalu diluruskan |
| Magic Keyboard | `MR_MagicKB` | Linked duplicate dari `OMagic_KB_0` office |
| Magic Trackpad | `MR_TrackPad` | Import `apple-magic-track-pad.zip`, ukuran sudah benar 16×11.5cm |
| AC standing | `MR_AC_*` | Body + grill + vent (sudah ada dari sesi scan) |
| Tanaman pojok | `MR_Plant_*` | Basket + 8 daun + slat pot + 3 kaki (sudah ada) |
| Air vent dinding ×4 | `AirVent_01..04` | Import `air_vent.glb` (Sketchfab) → flatten empty chain, mesh share 1 data `AirVent` + mat `M_AirVent` (linked duplicates). 35×35cm, berjejer rapat di dinding `OP_Wall_Perimeter_NW` muka y=1.6 (hadap −Y ke ruangan, verifikasi raycast), X −17.24/−16.87/−16.52/−16.16, center z=2.33. Posisi dari annotate. ⚠️ prefix belum `MR_` |
| Kursi meeting ×9 (24 Jul) | `MR_Chair_01..09` | Import `office_chair.glb` (Sketchfab) → flatten 20 mesh jadi 1 (`MR_Chair`, 4.5k verts, transform applied, min-Z=0, rotation_mode XYZ) + 8 linked duplicates. Layout **lurus sejajar meja tanpa jitter** (revisi user): 4 utara y=0.55 rot 0°, 4 selatan y=−1.35 rot 180° (X −19.30/−18.43/−17.57/−16.70, spacing 0.87m), 1 kursi kepala timur (−15.90, −0.40) rot −90° hadap TV |
| Rally Mic Pod ×4 (24 Jul) | `MR_MicPod_*` (5 part/unit) | **Replika prosedural** (spin profile, specs asli Ø10.2×2.1cm): body graphite edge membulat + top disc domed matte + tombol mute + LED ring emissive hijau + kabel bezier curve tipis di permukaan meja. Parent per unit `MR_MicPod_Root(.001–003)`, duplikat = linked mesh, rotasi beda-beda biar kabel natural. Posisi meja: X −18.55 (asli) / −18.79 / −17.97 / −17.13 (dari annotate), semua Y≈−0.44, z=0.75. ⚠️ kabel = CURVE, convert sebelum export. NB: pod asli & dup pertama mepet (24cm) — kandidat digeser/hapus 1 |
| Snake plant (24 Jul) | `MR_Plant_Snake` | Import `snake-plant-2-low-poly` (GLB single mesh, tanpa empty chain — tidak perlu flatten). Scale ke H 0.9m (applied), pojok barat laut (−21.30, 1.25) dari annotate, rot 34°. Mat `M_Foglie`/`M_Vasi` texture embedded |
| Pintu kaca DIBUKA (24 Jul) | `GWM_Door_Glass/Smoke` + 2 handle | Daun pintu dirotasi **−90° ke arah −X** (ngayun masuk meeting room) via pivot matrix di garis engsel y=1.62 (sisi jauh dari handle). 4 part diputar bareng lewat `matrix_world`. Posisi vs tembok dibenerin user (24 Jul) |
| **Ceiling dropped (24 Jul)** | `OP_MR_Ceiling` | Plane 1 face, footprint `OP_MR_Floor` (X −21.70..−14.45, Y −2.60..1.77), **z=2.94 rata puncak `OP_WoodSlat_Wall`** (lebih rendah dari ceiling utama 3.6 → kesan dropped ceiling). Normal ke bawah, mat `M_Ceiling`. Di `OP_Structure` |
| Ceiling lamp ×6 + light (24 Jul) | `OP_MR_CeilLamp_0..5` + `OP_MR_CeilLight_0..5` | Linked duplicate `OP_CeilLamp_A` **scale 0.35** (downlight kecil), grid 3×2 dari annotate user: X −20/−18/−16, Y 0.9 & −1.7, top snap ke ceiling 2.94. + 6 POINT 150W warm (1.0, 0.72, 0.4) shadow-soft 0.12 di z 2.78. Di `OP_Lighting` |
| Motif frost (24 Jul) | `GWM_Frost_A` + `GWM_Door_Smoke` | Materialnya udah `M_GlassFrost` (mosaic `T_GlassMosaic`) tapi **nggak punya UV → tampak polos**. Fix: UV dibuat manual = koordinat world (sumbu memanjang × Z), skema sama `GWL_*` → motif nyambung se-gedung |

**Layout devices di meja** (dari annotate, cluster dekat ujung TV): keyboard \| trackpad \| remote sejajar di X≈−16.9, Y −0.72..−0.17, semua flat z=0.75. Apple TV di atas cabinet (−21.28, −1.21).

### PR Meeting Room
- ~~Kursi meeting~~ ✅ 24 Jul (9 kursi `MR_Chair_*`)
- ~~Ceiling + lampu~~ ✅ 24 Jul (`OP_MR_Ceiling` z2.94 + 6 downlight)
- ~~Grup `MR_*` ke sub-collection sendiri~~ ✅ 24 Jul (semua `MR_*` + AirVent ×4 → `OP_MeetingRoom`, 71 obj)
- ~~Plafon tembus dinding timur~~ ✅ 27 Jul (lihat §3d)
- Dinding/kerangka ruangan (masih pakai scan sebagai acuan — cek apakah perlu dinding remodel sendiri)
- Deco tambahan + verifikasi vs scan/foto
- Rename `AirVent_01..04` → `MR_AirVent_*` biar konsisten prefix
- Convert kabel mic pod (CURVE) sebelum export; pertimbangkan geser/hapus 1 pod yang mepet

---

## 3d. Bug Model Lama yang Ketahuan saat Review MVP1 (27 Jul)

Bug-bug ini **sudah ada di file Blender sejak sesi 22-24 Jul**, bukan akibat proses export. Baru ketahuan saat scene dilihat dari sudut-sudut baru di viewer web.

| Bug | Detail | Fix |
|---|---|---|
| **Plafon MR tembus dinding** | `OP_MR_Ceiling` melebar sampai X=−14.45, dinding kaca `GWM_WallAbove` ada di X=−14.65 → menonjol **20 cm**. Tiga sisi lain (barat −21.70, utara 1.77, selatan −2.60) sudah pas. | Vertex sisi timur digeser ke −14.65 |
| **Lensa track light yatim** | `OP_TrackL_Lens_N0.001` mengambang tanpa Spot/Mount (jarak ke housing 0,41 m; normalnya 0,03 m) — sisa duplikasi lama | Dihapus |
| **5 spot tanpa lensa** | `OP_TrackL_Spot_N0.001/.002/.003`, `S1.002/.003` punya selongsong tapi lampunya tidak ada | Dibuatkan lensa (copy linked mesh dari pasangan yang benar) |
| **2 lensa meleset 39 mm** | `S1.002`/`S1.003` — **kesalahan saat membuat lensa pengganti**: offset disalin dari spot `N0`, padahal `S1` menghadap arah berlawanan (rot Z 180°). Offset benar untuk S1 = `(0, −0.0186, −0.0695)` | Offset dihitung ulang dari pasangan `S1` yang benar |

**Cara verifikasi pasangan lensa-spot yang ANDAL:** ukur **lateral offset terhadap sumbu selongsong**, bukan jarak titik-tengah (jarak titik-tengah menyesatkan — bisa terlihat "pas" padahal melenceng ke samping). Sumbu spot dicari lewat SVD dari vertex-nya:
```python
u, s, vt = np.linalg.svd(verts_spot - center); ax = vt[0]/norm(vt[0])
d = center_lens - center_spot
lateral = norm(d - (d@ax)*ax)      # harus < 5 mm
```
Hasil akhir: **14/14 lensa lateral offset = 0.0000**.

**Pelajaran proses:** saat review, kumpulkan temuan jadi daftar dulu baru perbaiki sekaligus — lebih baik daripada tambal satu-per-satu, karena pola yang sama sering muncul di beberapa objek.

---

## 4. Export Pipeline Blender → Three.js ✅ TERBUKTI

Tes end-to-end 13 Jul: `export-test/lounge.glb` — **1.28 MB, 192 mesh, ~30k tris, load ~130ms**. Enteng banget buat web.
**Update 27 Jul:** seluruh scene (4 ruangan) sudah di-export ke MVP1 — lihat §4e (varian GLB + viewer) dan §4d (audit pre-export).

### Checklist di Blender SEBELUM export
1. **Bake material prosedural** ke image texture packed — glTF tidak bawa node Brick/Noise/ColorRamp (gejala: lantai jadi putih polos)
2. **Recalc normals outside** untuk mesh hasil spin/bmesh (gejala: vas jadi hitam)
3. **Lampu harus Point/Spot/Sun** — Area light di-drop diam-diam
4. **Un-hide Walls/Ceiling** (sering ke-hide pas kerja; `use_visible=True` skip yang hidden)
5. Modifier **tidak perlu** apply manual — `export_apply=True` yang handle (file kerja tetap non-destructive)

### Perintah export
```python
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_visible=True,
    export_apply=True, export_lights=True, export_cameras=False, export_yup=True)
```

### Settingan viewer Three.js (`export-test/index.html`, three@0.166)
| Setting | Nilai | Alasan |
|---|---|---|
| toneMapping | ACESFilmic, exposure **0.55** | 1.0 = kebakar putih |
| Environment | RoomEnvironment via PMREM, intensity **0.25** | Tanpa ini glossy/metal = hitam mati |
| Ambient | 0xfff2e6 × 0.15 | Pengganti bounce light |
| Light clamp | intensity ≤ **6**, decay 2 | glTF point light over-bright |
| Shadow | mapSize 2048, bias **−0.0004**, normalBias 0.02, radius 4 | bias −0.002 bikin bayangan "copot" |
| Housing lampu | castShadow = **false** (mesh radius 0.45m dari lampu) | Cage bikin motif jaring di dinding |
| Bloom | UnrealBloomPass 0.35 / 0.5 / threshold **1.0** | threshold 0.85 bikin lantai & felt ikut glow |
| Emission mesh | emissiveIntensity ≥ 2.5 | Biar keangkat bloom |

**Konversi sumbu** (glTF Y-up): `three(x, y, z) = blender(x, z, −y)`

**Menjalankan viewer:**
```bash
cd export-test && python3 -m http.server 8137
# buka http://localhost:8137
```

### Catatan kaca (EEVEE vs Three.js)
- Kaca pakai **alpha blend** (alpha 0.08), BUKAN transmission — keputusan pipeline (transmission berat/artefak di three.js)
- Kalau kaca kelihatan **noise/bintik pasir di viewport Blender**: itu `surface_render_method='DITHERED'` (default EEVEE Blender 5.x) — set ke `'BLENDED'`. Murni urusan display Blender, tidak ngaruh ke export

### Belum dites
- Performa 3 ruangan + shadow banyak lampu — kalau drop: shadow hanya lampu utama / bake ke texture ✅ **teruji di MVP1** (shadow di-cap 4 lampu, sisanya castShadow=false — lihat §4e)
- ~~Draco compression~~ ✅ dicoba di MVP1, tapi **WebP menang** (6.6 MB vs Draco 21 MB) — lihat §4e

---

## 4e. MVP1 Export — Seluruh Scene ✅ SELESAI (27 Jul) — **50-60 FPS**

Export penuh 5 ruangan. Perjalanan ukuran & performa dari raw sampai final:

| Tahap | Ukuran | Draw call | FPS | Metode |
|---|---|---|---|---|
| Raw | 35 MB | 2.522 | — | tanpa kompresi |
| + Draco | 21 MB | 2.522 | 1-2 | kompresi geometry |
| + WebP | 6.6 MB | 2.522 | 1-2 | texture PNG → WebP |
| + Merge | 5.2 MB | **403** | 14-16 | join per (zona × material) |
| **+ Baked lightmap** | **8.0 MB** | **401** | **50-60** ✅ | 39 lampu realtime → 0 |

**File final: `export-test/office-mvp1-baked.glb`** (di-serve sebagai `index.html`).

### Pelajaran urutan diagnosa (PENTING — jangan langsung tuduh poly)
1. **Ukur draw call dulu** (`renderer.info.render.calls`). Patokan web: <300. Scene ini awalnya **2.522** — itu biang keroknya, bukan 760k tris (segitu ringan untuk desktop).
2. Kalau draw call sudah sehat tapi masih berat → **hitung lampu realtime**. Three.js forward rendering: cost fragment shader ~linear terhadap jumlah lampu. Terbukti: 0 lampu lancar, 15 lampu → 14-16 fps.
3. Baru terakhir curigai poly/texture.

### Ukuran GLB — urutan dampak
PNG→WebP paling besar (texture 17 → 2.6 MB), Draco untuk geometry (35 → 21 MB), lalu merge. ⚠️ File `.blend` (78 MB) **TIDAK sama** dengan ukuran GLB (8 MB) — .blend menyimpan scan referensi + backup `_ORIG` yang tidak ikut export.

### Viewer `export-test/index.html` (three@0.166)
- **5 tombol view** teleport kamera: Office / Lounge / Meeting / Pantry / Function (helper `bl(x,y,z)` = konversi Blender→three Y-up)
- **`DRACOLoader` WAJIB di-set** — tanpa ini GLB ber-Draco gagal load total
- **Shadow map OFF total** (`renderer.shadowMap.enabled = false`) — bayangan sudah di lightmap
- Slider live: Lightmap (0-3×), Exposure, Ambient, Pendar lampu (0-4×)
- HUD diagnostik: fps · draw call · tris · jumlah lightmap · jumlah AO asli yang dijaga
- ⚠️ **JANGAN clamp `emissiveIntensity`.** Viewer lama punya `Math.max(m.emissiveIntensity, 2.0)` — GLB sekarang sudah bawa `KHR_materials_emissive_strength` (bohlam 12, LED strip 8), jadi clamp itu justru MENURUNKAN nilainya jadi 2.0 → lampu terlihat redup/mati. Set juga `m.toneMapped = false` supaya pendar tidak diredam ACES saat exposure rendah.

**Serve:** `cd export-test && python3 -m http.server 8137` → buka `http://localhost:8137`

Varian lain di folder: `office-mvp1.glb` (raw), `-draco.glb`, `-merged.glb` (realtime light), `lounge-v1.html` + `lounge.glb` (viewer lama 13 Jul).

---

## 4f. Merge Objek untuk Draw Call ✅ (27 Jul) — 2.522 → **401**

Draw call = jumlah perintah CPU→GPU per frame. 1.462 objek terpisah = CPU tercekik, GPU menganggur. Solusi: gabung objek di Blender, **non-destruktif** lewat collection `Export_Merged` (objek di-copy; collection kerja tidak disentuh, di-exclude saat modeling).

### Aturan merge (jangan asal join semua)
1. **JANGAN join mesh multi-user** — instancing menghemat 427k tris di VRAM. Kalau semua di-join VRAM naik **+128%**. Join hanya objek unik + instanced KECIL (<200 tris, instancing tak sepadan untuk mesh mini). Hasil: 1.366 join + 95 instanced dipertahankan.
2. **Group per (ZONA × material), bukan global** — kalau seluruh gedung jadi 1 objek, frustum culling mati dan GPU render ruangan yang tak terlihat. Zona ditentukan dari koordinat bbox dunia (Office/Lounge/Function/MeetingWest/WestRoom/PantryWing), bukan collection (banyak collection isinya campur).
3. **Nama grup harus UNIK** — dua grup dengan material-set beda tapi material pertama sama akan bentrok & saling menimpa (kasus `MG_WestRoom_BLACK_PLASTIC`, 1 objek sempat hilang).

### 4 BUG MERGE yang wajib diantisipasi (semua kena di sesi ini)
1. **Parent hilang** → 69 objek merged masih menempel ke parent (`FD_Root`, `EP_Root`, `BS555_BarStool`) yang tidak ikut export → knob emas berserakan di lantai, panel meja terlepas. **Fix:** lepas parent + bekukan transform dunia ke geometri (`j.parent=None; j.matrix_world=mw; j.data.transform(j.matrix_world); j.matrix_world=Identity`). Untuk instanced yang tak boleh diubah: ikutkan 9 empty parent-nya ke collection export.
2. **Modifier hilang** — `bpy.ops.object.join()` MEMBUANG modifier objek yang digabung. 229 objek terdampak (8 Wireframe, 216 Bevel, 5 Subsurf) → lampu cage jadi gumpalan padat, semua tepi berbevel jadi tajam. **Fix:** ambil mesh hasil evaluasi sebelum join — `ev = o.evaluated_get(depsgraph); c.data = bpy.data.meshes.new_from_object(ev)`.
3. **UVMap asli tertimpa** — saat menyiapkan UV lightmap jangan `while me.uv_layers: remove(...)`. UVMap lantai punya rentang `u[-3.19,1.06]` (texture ter-tile berkali-kali); kalau ditimpa jadi 0-1, ubin diregangkan 1× sepanjang ruangan. **Fix:** pertahankan UVMap, TAMBAHKAN UVLightmap sebagai layer kedua; objek tanpa UV dibuatkan UVMap kosong di index 0 saat merge.
4. **Kontaminasi MG_** — objek hasil merge ikut terbaca sebagai objek sumber (karena `Export_Merged` sempat di-include untuk pengecekan) → hasil merge ter-merge lagi, lensa track light jadi 11 bukan 10. **Fix:** guard eksplisit sebelum bangun rencana:
   ```python
   assert not any(o.name.startswith('MG_') for o in src), "KONTAMINASI MG_!"
   ```

### Atlas material — Magic Keyboard
12 keyboard × 79 material = **948 draw call (71% dari total)**. Sama akarnya dengan temuan texture: 1 keycap = 1 material. **Fix:** susun 79 texture jadi atlas 1152² (grid 9×9 × tile 128), remap UV per-face berdasarkan `material_index` (`uv_baru = (gx + u)/grid`), lalu 1 material. Huruf keycap tetap presisi. Cari kasus serupa lewat rasio **material per objek**.

---

## 4g. Bake Lightmap ✅ (27 Jul) — 39 lampu realtime → **0**

Mengikuti pendekatan basement.studio (§4b): semua cahaya + bayangan dipanggang jadi texture, runtime nyaris tanpa lampu. Hasilnya BUKAN cuma lebih cepat — kualitas juga lebih baik (global illumination, bayangan lembut alami, occlusion sudut).

### Bake PER OBJEK, bukan atlas bersama
Dua percobaan gagal sebelum ketemu cara yang benar:
- **Per zona → GAGAL.** Node `BAKE_TARGET` disimpan di MATERIAL, jadi 1 material tak bisa punya 2 lightmap. Di scene ini **44 material dipakai lintas zona** (`M_SM_Wall_Cream` di 5 zona) → bake antar-zona saling menimpa; zona yang di-setup belakangan menang. Gejala: lightmap zona awal terisi 7-15%, zona lain 66-80%.
- **Atlas global 291 objek → GAGAL.** UV coverage cuma **0,55%** — `pack_islands` di Edit Mode multi-objek membiarkan UV antar-objek saling menumpuk.
- **Per objek → BERHASIL.** Coverage **64,7%**, seluruh masalah packing lenyap.

### Resep yang terbukti
- Bake hanya objek **luas ≥ 8 m²** → 37-41 objek, sudah mencakup **90% luas permukaan**. Objek kecil cukup ambient+envmap.
- Resolusi proporsional: `res = 2**round(log2(sqrt(luas) * 40))`, clamp 256–1024 → ~50 px/m untuk lantai besar. (Patokan arsitektur cukup 8-16 px/m.)
- Cycles GPU: `prefs.compute_device_type='METAL'` + `cycles.device='GPU'` — **default-nya CPU, cek dulu, ini beda 6×**.
- **Matikan caustics + pangkas bounces**: `caustics_reflective/refractive=False`, `max_bounces=4, diffuse=3, glossy=1`. Ini memangkas **89 detik → 10,7 detik** per bake (8×). Total 37 objek = **~1 menit**.
- Tiap `bpy.ops.object.bake` membangun ulang BVH SELURUH scene — objek 38 tris pun bayar ongkos penuh. Karena itu setelan di atas krusial.
- ⚠️ Bake >120 detik akan lepas dari MCP jadi background task — hasilnya TETAP jadi di Blender, cek `bpy.data.images` alih-alih menganggapnya gagal.

### ⚠️ SHADOW LAMPU HARUS ON saat bake
Sisa perf-fix EEVEE 23 Jul: 29 dari 39 lampu `use_shadow=False`. Di Blender 4.x+, `use_shadow` berlaku untuk EEVEE **DAN Cycles** — bake pertama menghasilkan cahaya yang menembus meja & dinding. Setelah semua shadow ON: lantai office **31% lebih gelap** (mean 0.474 → 0.326), kontras p90/p10 **22-120×** di seluruh permukaan. Sekalian naikkan `eevee.shadow_pool_size` ke `'1024'` (maksimum; STRING enum) supaya viewport tidak error "shadow buffer full".

### ⚠️ NOISE BINTIK — `bpy.ops.object.bake` TIDAK memakai denoiser (fix 27 Jul)

Gejala: saat lightmap dinyalakan, dinding/meja/plafon penuh bintik halus. `scene.cycles.use_denoising=True` itu untuk **render**, bukan bake — jadi noise 32-samples masuk mentah ke texture (terukur 0.042–0.072; patokan bersih <0.01).

Menaikkan samples saja **tidak cukup**: 32 → 256 (8× lipat, 8× lebih lama) cuma memangkas noise 36%.

**Solusi: blur gaussian numerik setelah bake.** Lightmap = data cahaya low-frequency, jadi blur ringan tidak menghilangkan informasi — detail tajam ada di base color texture, bukan di lightmap.

| | noise | kecerahan |
|---|---|---|
| Sebelum | 0.0556 | — |
| **Sesudah** (σ 1.6 @512 / 2.4 @1024) | **0.0046** (−92%) | −0.3% |

Prosesnya cuma 1,1 detik untuk 37 lightmap. Resep final: **bake 128 samples + resolusi minimum 512** (jangan 256) **+ gaussian blur**.

⚠️ Setelah bake ulang, **relink node `LM_TEX`** — image datablock di-recreate sehingga node lama menunjuk datablock yang sudah dihapus.

### Menyelundupkan lightmap ke glTF (tak ada slot resmi)
Pakai node group **`glTF Material Output`** socket **Occlusion** → keluar sebagai `occlusionTexture` → dibaca three.js sebagai `aoMap` → diubah jadi `lightMap` di viewer (kalau tidak, teksturnya MENGGELAPKAN alih-alih menerangi). Material yang dipakai lintas objek WAJIB di-copy dulu (`m.copy()`) karena lightmap-nya per objek — 38-43 material perlu dipisah.

**DUA BUG yang nyaris lolos (selalu verifikasi struktur GLB, jangan asumsi):**
1. **texCoord harus 1.** glTF `texCoord` = INDEX uv layer. 19 objek (dinding/plafon polos) tidak punya `UVMap` sama sekali, jadi UVLightmap menempati index 0 → lightmap menempel di UV base color. Fix: pastikan urutan `UVMap`(0) + `UVLightmap`(1).
2. **JANGAN ubah SEMUA `aoMap` jadi `lightMap`.** 5 material punya AO asli bawaan aset (`lamp_01`, `Oven`, `ASSET_MAT_MR`, dll) — kalau ikut dikonversi, objeknya salah nyala. Pembeda ANDAL = **`texture.channel === 1`**, BUKAN nama: glTF hasil export Blender **tidak menyimpan `texture.name`** (0 dari 107), namanya cuma ada di `image.name`.

### Export settings final (baked)
```python
bpy.ops.export_scene.gltf(
    filepath=out, export_format='GLB', use_visible=True, export_apply=True,
    export_lights=False,          # semua lampu OFF — cahaya sudah di lightmap
    export_cameras=False, export_yup=True,
    export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
    export_draco_position_quantization=14, export_draco_normal_quantization=10,
    export_draco_texcoord_quantization=12,
    export_image_format='WEBP', export_image_quality=85)
```
⚠️ Export WebP **GAGAL DIAM-DIAM** untuk image `depth < 24` (grayscale/paletted) — menghasilkan `{"extensions":{}}` kosong yang bikin Three.js crash `reading 'uri'`. Fix: rebuild image jadi RGBA 32-bit sebelum export.

---

## 4d. Pre-Export Blocker Audit ✅ (27 Jul)

Sebelum export MVP1, dijalankan audit sistematis untuk mendeteksi 5 blocker yang bikin GLB rusak di Three.js. **Semua clear**: 0 material prosedural, 0 CURVE, 0 AREA light, 0 image unpacked, 0 objek tanpa UV.

### Cara audit (jalankan sebelum tiap export)
Scan lewat bpy:
- `bpy.data.materials` → node bertipe `TEX_NOISE/TEX_WAVE/VALTORGB/MIX/BUMP/MATH` (kandidat prosedural)
- semua LIGHT → `o.data.type == 'AREA'` (di-drop diam-diam oleh glTF)
- `o.type == 'CURVE'` (tidak ikut export tanpa convert)
- `o.visible_get() == False` (kena skip `use_visible=True`)
- `im.packed_file is None` (image belum di-pack)

### Gotcha penting (dari eksekusi 27 Jul)
1. **Banyak FALSE POSITIVE prosedural.** Material hasil import glTF/Sketchfab selalu punya pola `MATH + SEPARATE_COLOR` (`Metallic = SeparateColor.Blue * 0.0`, `Roughness = SeparateColor.Green`) — itu **round-trip glTF normal, BUKAN prosedural**. Cukup unlink MATH & set Metallic=0 eksplisit, TIDAK perlu bake. Dari 12 material yang ke-flag, cuma **6 yang beneran prosedural**. Selalu telusuri node tree per-input Principled dulu.
2. **Alpha cutout import**: pola `1 - (tex.Alpha < 0.05)` → ganti Alpha langsung dari image + `blend_method='CLIP'` (= glTF alphaMode MASK).
3. **GOTCHA pack image Non-Color** — urutan WAJIB: (1) `images.new()` → (2) set `colorspace_settings.name='Non-Color'` → (3) `pixels.foreach_set()` → (4) `update()` → (5) `pack()`. Kalau colorspace di-set SETELAH pack, `has_data` jadi False & pack batal diam-diam (tanpa error). Kena di `T_FabricNormal`, harus rebuild dari nol.
4. **Convert CURVE: turunkan resolusi dulu.** 17 curve dengan `resolution_u` 12-16 + `bevel_resolution` 6-12 = ~226k verts kalau convert apa adanya. Set `resolution_u=6, bevel_resolution=3` (16 sisi keliling, cukup halus untuk tube 20mm) → jadi **9.3k verts**, visual identik. Backup `curve.copy()` + `use_fake_user=True` dulu. `export_apply=True` TIDAK meng-convert curve.
5. **UV mesh multi-user**: kalau 2 objek share mesh, UV world-space bikin salah satu meleset. Pakai koordinat LOKAL × `obj.scale` — instancing tetap terjaga, tidak perlu `make_single_user`.

Texture baru hasil audit: `T_ODesk_Oak/OakV`, `T_SinkMarble`, `T_GrassRug`, `T_FabricNormal`, `T_ChairFrame_Black` (semua 1024 packed).

---

## 4c. Optimasi Poly untuk Web 🚧 (DIMULAI 24 Jul, LANJUT 27 Jul)

Kekhawatiran: scene berat saat di-export ke website. **Audit 24 Jul** (tanpa scan Reference/Scan_Office yang memang tidak ikut export): 873 unique mesh, 1143 objek mesh, **~431k unique verts** (file GLB) / **~1.11 juta instanced verts** (beban render GPU per frame — linked duplicates digambar berulang).

### Prinsip kerja (dari pengalaman sesi ini)
1. **SATU objek dulu, verifikasi visual (screenshot + user cek), baru terapkan ke duplikatnya** — jangan langsung semua
2. **Limited Dissolve (1°, delimit UV/MATERIAL/SEAM/SHARP)** = metode utama — hanya menggabung face nyaris sebidang, tidak bisa mengubah siluet. **JANGAN Decimate Collapse** untuk objek dengan detail kecil (keycap keyboard macbook sempat meleleh jadi lempengan — user komplain, di-restore)
3. **RED FLAG: material glossy + custom split normals** — dissolve merusak interpolasi normal → shading smear (kasus logo Apple TV). Cek dulu; kalau mayoritas face glossy-baked, **skip objek itu**
4. Backup mesh asli sebagai `*_ORIG` (fake_user) sebelum ubah; hapus setelah user approve final
5. Decimate/dissolve tidak bisa langsung di multi-user mesh → copy mesh → proses → relink ke semua user

### Hasil geometry — total scene 1.008M → **760.871 tris (−24.5%)**
| Objek | Sebelum | Sesudah | Metode | Status |
|---|---|---|---|---|
| `OP_Shredder` | 126.672 | **10.634** (−92%) | Decimate 0.06 + smooth 35° (aman: bentuk kotak, texture bawa detail) | ✅ 24 Jul |
| `OMacbook` ×5 | 82k verts | 32.7k **tris** (−26% dari 44k tris) | Limited dissolve + Decimate 0.75 (0.5 DITOLAK: keycap robek) | ✅ 27 Jul |
| `MR_TrackPad` | 28.407 | **13.225** (−53%) | Limited dissolve 1° | ✅ 24 Jul |
| `OMagic_Mouse` ×11 | 21k | **6.6k** (−68.5%) | Dissolve 1° + Decimate 0.35. Custom normals + glossy ternyata AMAN (uji grazing angle) | ✅ 27 Jul |
| `OMagic_Mouse_Dup2` | 21k | **relink** (gratis) | Mesh `Node_0_Mat_0.001` = PERMUTASI IDENTIK mesh utama → relink | ✅ 27 Jul |
| `OP_WoodSlat_Wall` | 33.5k | **8.2k** (−75%) | Decimate 0.25 — panel DATAR, slat-nya texture bukan geometri | ✅ 27 Jul |
| `MR_AppleTV` | 24.740 | 24.740 (0%) | **SKIP** — 15.5k/18.5k face = `Glass dark` glossy baked normals; dissolve bikin logo smear | ⛔ tidak bisa aman |

**Pelajaran 27 Jul:** (a) "glossy + custom normals" BUKAN larangan mutlak — Magic Mouse aman, AppleTV gagal karena hal lain; tetap uji di mesh copy dulu. (b) Cek permutasi mesh identik: sort koordinat `np.lexsort` lalu bandingkan — `np.allclose` mentah bilang "beda" padahal identik (beda urutan vertex). (c) Blender tolak `modifier_apply` di mesh multi-user → putus sharing dulu, apply, relink. (d) Setelah apply modifier non-pertama, modifier tetap NEMPEL → wajib `o.modifiers.remove()`, kalau tidak decimate jalan 2× saat export.

Backup `*_ORIG` (fake_user): `MR_TrackPad`, `OMacbook`, `OMagic_Mouse`, `OP_Shredder`, `OP_WoodSlat_Wall` — hapus saat final.

### Sisa poly (10 terberat, total 760.871 tris)
`OMacbook` 32.7k×5, `MR_TrackPad` 20.4k, `OChair_Gaming` 20.3k×3, `MR_AppleTV` 18.5k (SKIP), `OP_Shredder` 15.1k, `OP_LetterTray` 11.4k.

> **CATATAN:** setelah merge (§4f) tris ter-render jadi **995k** — naik karena modifier Wireframe/Bevel kini terpanggang sejak awal (dulu ditambahkan belakangan saat export). Bukan regresi. Dan poly TERBUKTI bukan bottleneck: dengan 995k tris + 0 lampu realtime, FPS tetap **50-60**. Optimasi poly lanjutan **tidak mendesak**.

### Texture ✅ SELESAI (27 Jul) — 134.4 MP → **52.9 MP (−61%)**, .blend 102.8 → **78.5 MB**
135 image ikut export, **0 file >1024**, 0 unpacked, 0 colorspace salah.
- **Resep resize massal:** `i.scale(nw, nh)` → **`i.pack()` LANGSUNG** setelahnya. ⚠️ **JEBAKAN:** menyetel `i.colorspace_settings.name` (bahkan ke nilai yang SAMA) **memicu reload dari file packed → ukuran BALIK ke asli**. Selalu cek jumlah image `>1024` SESUDAH loop, jangan percaya counter.
- **SKIP texture milik scan** (`OfficeScan*`/`MeetingScan`/`SmokingScan` — 9 file 4096²): objek referensi hidden, tidak ikut export. Deteksi: petakan image→material→object, skip kalau pemakainya ⊆ himpunan objek scan. Kalau tidak dipisah, angka audit menyesatkan.
- **TEMUAN BESAR — Magic Keyboard**: `MR_MagicKB`/`OMagic_KB_*` (12 unit) punya **79 material, tiap keycap 1 texture 1024²** = 82.8 MP untuk objek 2.354 tris — sendirian **62% beban texture seluruh scene**. Isinya nyaris polos. Di-resize ke **128²** → 1.29 MP (−98%), huruf keycap tetap TAJAM (extreme closeup). Aset Sketchfab multi-material begini: cari lewat rasio **MP per 1k tris** (keyboard 35 vs normal ~3).
- Verifikasi visual 1024px: keycap Macbook masih terbaca, pola mesh Shredder masih rapi. **1024 aman untuk semua aset office.**

### CURVE convert ✅ (27 Jul)
17 CURVE (stool pipes, BS555 footrest, SMK chair loop, mic pod cable) → convert ke mesh, resolusi diturunkan dulu (226k → 9.3k verts). 0 CURVE tersisa saat export.

---

## 4b. Riset: cara basement.studio bikin look retro/PS1 (14 Jul)

Repo mereka open source: [basementstudio/website-2k25](https://github.com/basementstudio/website-2k25). Temuan dari bongkar kodenya:

**Look "PS1 jadul" itu BUKAN dari cara export — GLB-nya biasa aja. Semuanya post-processing di Three.js:**

| Teknik | Detail (dari `renderer.tsx` + `material-postprocessing/fragment.glsl`) |
|---|---|
| NearestFilter | Scene dirender ke `WebGLRenderTarget` dengan `minFilter/magFilter = NearestFilter` — edge kasar pixelated |
| Pixelated UV | `floor(vUv * res/2) * 2 / res` di shader post — efektif setengah resolusi (1/8 buat efek reveal) |
| Bloom checkerboard | Bloom cuma dihitung di pola papan catur (`mod(x+y,2)`), vogel disk 24 sample — hemat + nambah grain retro |
| Scanline + noise | `OPACITY_SCANLINE 0.24`, noise 0.01, vignette — semua di satu shader post |
| Tone mapping manual | ACES + gamma/contrast/brightness dihitung sendiri di shader, bukan bawaan three |

**Asset pipeline mereka (relevan buat performa kita):**
- GLB dipecah per bagian: `office.glb`, `officeItems.glb`, `outdoor.glb`, dst.
- **SEMUA lighting di-bake di Blender** → puluhan `bake-XX-lightmap.exr` + `bake-XX-ao.jpg`. Scene web nyaris tanpa realtime light
- Material custom shader: baca lightmap (EXR, UV2) + AO map (JPG) dikali base color — bukan MeshStandardMaterial

**Status adopsi:**
1. Post-processing retro = lapisan opsional, tinggal tambah render target + fullscreen shader di viewer — pipeline export TIDAK berubah. **Belum dikerjakan.**
2. ~~Bake lightmap patut ditiru~~ ✅ **SUDAH DIKERJAKAN 27 Jul** (§4g) — terbukti jadi jawaban PR performa: 39 lampu realtime → 0, FPS 14-16 → **50-60**. Bedanya dari mereka: kita selundupkan lightmap lewat slot `occlusionTexture` glTF + `MeshStandardMaterial.lightMap` bawaan three, bukan custom shader + EXR terpisah. Lebih sederhana, hasilnya cukup.
3. Pecah GLB per ruangan buat lazy-load — **belum perlu**: 8,0 MB masih ringan & FPS sudah 50-60. Simpan sebagai opsi kalau nanti scene bertambah besar.

---

## 4h. Integrasi ke web ✅ (27–28 Jul)

> Judul bab ini dulu "Integrasi ke Next.js". **Next.js sudah dicabut 29 Jul** — sekarang Vite + React SPA (§4j). Isi bab ini tetap berlaku; yang berubah cuma cara build & memuat komponen.

GLB kantor sudah tidak lagi cuma jalan di viewer HTML — dia sekarang **hero fullscreen di project web ini**. Struktur halaman: `[3D office tour = hero] → Deployments → Services → Vision → Contact`.

### Peta file (per 30 Jul)

| File | Isi |
|---|---|
| `src/components/sections/Hero.tsx` | Section 3D setinggi `h-dvh`. `Scene` di-load `React.lazy` + `Suspense` (dulu `dynamic({ssr:false})`, §4j). IntersectionObserver (threshold 0.15) → `heroInView` |
| `src/components/canvas/Scene.tsx` | `<Canvas>`: ACESFilmic exposure 1.0, `dpr [1,1.5]`, fov 60 / near 0.05 / far 120, background `#0a0a0c`, **ambient 0.03**, EffectComposer + **N8AO** + Bloom (§4l) |
| `src/components/canvas/Office.tsx` | Pemuat GLB + 3 fix-up wajib (di bawah) + klik meja billiard + fade lampu + **penggerak sapuan reveal** (§4m) + **pemasangan konten layar** (§6c) |
| `src/components/canvas/SceneEnvironment.tsx` | `RoomEnvironment` + PMREM blur 0.04, `environmentIntensity` 0.18 |
| `src/components/canvas/CameraController.tsx` | `VIEWS` 5 preset + tween 1400 ms + hash routing + `billiardView()` + `goToView`. **Tanpa handler wheel/keyboard/touch sejak 30 Jul** (§4k) |
| `src/components/canvas/CharacterLights.tsx` | ✅ **terisi** — key hangat + fill dingin di layer 1, khusus karakter (§6b) |
| `src/components/canvas/Waypoints.tsx` | 🆕 **Waypoint navigasi 3D** — bidang di ruangan, hover → arsir + bingkai + label (§4k) |
| `src/components/canvas/ContactShadowsRig.tsx` | 🆕 **Bayangan kontak per ruangan** — "gelap di bawah meja" (§4l) |
| `src/components/canvas/revealSweep.ts` | 🆕 **Sapuan "kantor terbentuk"** — patch shader dither ke 233 material (§4m) |
| `src/components/canvas/screens.ts` | 🆕 **Konten layar monitor** — pixel-art via `emissiveMap` (§6c) |
| `src/components/canvas/billiard/` | Minigame billiard — 6 file (§6d) |
| `src/components/ui/BilliardHUD.tsx` | Bar tenaga kiri + tombol reset/exit + gestur bidik (§6d) |
| `src/lib/store/sceneStore.ts` | Zustand: `currentRoom`, `heroInView`, `activeSection`, `goTo`, `goToView` + state billiard + **`START_ROOM`/`hashFor()`** (§4k) |
| `src/lib/hooks/useScrollSpy.ts` | IntersectionObserver untuk highlight link navbar |

**Dihapus:** `src/components/ui/RoomNav.tsx` (30 Jul, diganti waypoint §4k) · `LightCone.tsx` + `LightCones.tsx` (30 Jul, §4l).

Stack per 30 Jul: **Vite 6 + React 19 + three 0.185 + @react-three/fiber 9 + drei 10 + @react-three/postprocessing 3 + zustand 5 + cannon-es 0.20 + motion 12 + Tailwind 4** (cannon-es untuk billiard §6d; `motion` untuk animasi teks section §4i). **`@react-three/rapier` sudah dicopot** — alasannya di §6d. **`next` juga sudah dicopot** — §4j.

### 3 fix-up wajib di `Office.tsx`

Ketiganya hasil debugging panjang; kalau meleset, visualnya rusak dengan cara yang tidak kelihatan jelas.

1. **`aoMap` → `lightMap`, hanya kalau `channel === 1`.** glTF tak punya slot lightmap, jadi lightmap diselundupkan lewat `occlusionTexture` (§4g) dan three membacanya sebagai `aoMap` — yang **MENGGELAPKAN**, bukan menerangi. Pembeda andal = `texture.channel`, BUKAN nama (glTF Blender tidak menyimpan `texture.name`). AO asli bawaan aset ada di channel 0/3 dan harus dibiarkan. Sekalian salin atribut UV ke `uv1` kalau belum ada — tanpa itu lightmap tidak tergambar sama sekali.
2. **JANGAN clamp `emissiveIntensity`.** GLB membawa `KHR_materials_emissive_strength` (bohlam 12, LED strip 8). Viewer lama punya `Math.max(intensity, 2.0)` yang justru **menurunkan** nilai itu jadi 2.0 → lampu terlihat mati. Pakai nilai aslinya, plus `toneMapped=false` supaya pendarnya tidak diredam ACES.
3. **`needsUpdate` setelah environment terpasang.** GLB selesai dimuat SETELAH `SceneEnvironment` mount, jadi shader-nya dikompilasi tanpa envMap → permukaan glossy (lantai ubin, chrome) kehilangan refleksi, terukur **0,60× lebih gelap** dari viewer acuan. `SceneEnvironment` juga wajib pakai `useLayoutEffect`, bukan `useEffect`.

**Angka verifikasi** (log dev `[office]`): `lightmap=40 aoAsliDijaga=22 tanpaUV1=0 emissive=28` — plus `skinned` (jumlah SkinnedMesh karakter) sejak 29 Jul. Kalau menyimpang jauh, fix-up gagal — cek ini dulu sebelum menyalahkan setelan lighting.

### Bloom bukan hiasan — ⚠️ angkanya sudah TIDAK 1.6 lagi

> **Per 30 Jul `intensity` = 0.4**, diturunkan bertahap 1,6 → 0,8 → 0,4. Alasan & konteksnya di §4l. Sub-bab ini disimpan sebagai **sejarah kalibrasi**, bukan target — tabel di bawah diambil saat scene belum punya AO maupun bayangan dan lightmap masih mati.

`intensity 1.6`, **bukan 0.4 seperti viewer HTML**. Viewer pakai `UnrealBloomPass`, di sini `BloomEffect` dari postprocessing — algoritmanya beda jadi angkanya tidak setara. Dikalibrasi terhadap screenshot viewer sampai rasio kecerahan 0.98:

| intensity | 0.4 | 0.8 | 1.2 | **1.6** |
|---|---|---|---|---|
| rasio kecerahan vs viewer | 0.75 | 0.85 | 0.92 | **0.98** |

LED strip lantai & bohlam **mengandalkan bloom untuk terlihat menyala**. Tanpa bloom, kecerahan terukur turun ke 0.53×. `luminanceThreshold 0.95` — kalau diturunkan, lantai & permukaan terang ikut glow seperti lava. (Ambang 0.95 **masih berlaku** per 30 Jul; yang berubah cuma intensity.)

### ~~⚠️ `LIGHTMAP_INTENSITY = 0`~~ → **sudah 1 sejak 30 Jul**

> **Lightmap SUDAH DINYALAKAN** (`LIGHTMAP_INTENSITY = 1`, commit `864322d`). Jangan pakai sub-bab ini sebagai keadaan sekarang — lihat §4l untuk apa yang berubah dan lubang apa yang masih ada.

Catatan historis, kondisi 28–29 Jul: nilainya **0**, konsekuensi dari temuan lightmap ter-clip 8-bit (§4g) — bake Cycles menghasilkan HDR float (max 189) tapi di-export sebagai WebP 8-bit yang cuma menyimpan 0–1, jadi semua nilai >1 terpotong. Yang tersisa hanya gradasi/AO halus. Saat itu cahaya scene datang dari bloom + emissive + ambient 0.12 + environment 0.18, **bukan** dari lightmap — dan itu penyebab keluhan "semuanya terang rata": ambient mengenai semua permukaan sama rata tanpa peduli arah hadap, jadi pojok & plafon ikut terang. Diselesaikan di §4l.

### Navigasi antar-ruangan (`CameraController.tsx`)

OrbitControls **diganti** dengan navigasi tur: kamera pindah antar 5 titik pandang tetap.

- `VIEWS` = 5 preset (Office, Lounge, Meeting, Function, Pantry). **Pantry `disabled: true`** — dilewati navigasi dan waypoint ke arahnya tidak dirender (`ACTIVE_KEYS`).
- Konversi sumbu Blender→three lewat helper `bl(x,y,z) → (x, z, −y)`.
- Tween **1400 ms cubic in-out**, dengan guard `animating` supaya input beruntun tidak melompati ruangan. `up` & FOV ikut di-tween (perlu untuk masuk/keluar pandangan billiard).
- ~~Input: wheel di canvas, panah keyboard, swipe touch ≥30 px~~ — **SEMUA DIHAPUS 30 Jul.** Lihat §4k: berpindah ruangan hanya lewat waypoint 3D + room links Navbar.
- ~~**Hash routing**: `#lounge`, `#meeting`, dst via `history.pushState` + `popstate`~~ — **DIGANTI routing berbasis PATH 3 Agu** (`/`, `/office`, `/meeting`, `/function`) lewat React Router + `routes/RoomRouteSync.tsx`; lihat §4q. `hash` sekarang khusus untuk scroll ke section (`#contact`), bukan penanda ruangan. Ruangan awal tetap `START_ROOM` = **Lounge**, kini lewat `pathFor()`/`roomFromPath()` di store.
- `goTo` didaftarkan ke `sceneStore` supaya `Waypoints` & `Navbar` (yang satu di dalam Canvas, satu di luar) bisa memanggilnya.

### UI yang mengikuti scroll

- **`heroInView`** (IntersectionObserver di Hero, threshold 0.15) — begitu 3D keluar viewport, label ruangan di navbar & waypoint 3D disembunyikan. Tanpa ini, penanda navigasi mengambang di atas konten teks.
- **Navbar background kondisional**: gradient transparan saat di hero, `bg-black/90` + backdrop-blur + border bawah saat sudah lewat. Memakai `heroInView` yang sudah ada — tidak menambah listener baru.
- **Scrollspy** (`useScrollSpy`) — `rootMargin −45%/−45%` mempersempit garis deteksi ke pita tipis di tengah layar, jadi section tinggi jadi active tepat saat isinya di tengah, bukan saat tepi atasnya baru menyentuh viewport. Di hero, tidak ada link yang active.

### ✅ BLOCKER `MODEL_URL` — SUDAH DIBETULKAN (28 Jul)

`Office.tsx` sempat memuat `/export-test/office-mvp1-baked.glb` lewat symlink `public/export-test → ../export-test`. **Symlink itu tidak pernah ada di git maupun di disk**, dan GLB-nya juga tidak ada (`export-test/*.glb` di-gitignore, isinya tinggal 4 file HTML) — jadi scene mentok di loader. Diverifikasi dengan `pnpm dev`:

```
/3d/models/office.glb                → 200
/export-test/office-mvp1-baked.glb   → 404
```

**Sudah dikembalikan ke `/3d/models/office.glb`** (nilai aslinya di commit `ad31934`; `bc0e86c` yang menggantinya ke path symlink dev-only). File itu ter-track git (9,04 MB saat itu; **8,09 MB sejak export ber-karakter 29 Jul**) dan strukturnya memang benar: 213 mesh, 227 material, 89 image, **0 lampu**, 44 material ber-`occlusionTexture` (39 di antaranya `texCoord=1` = lightmap). Draco + WebP aktif. Komentar peringatan sudah ditulis di atas konstanta itu supaya tidak terulang.

### Yang belum (per 30 Jul)

- **Loader saat mengunduh** — `Scene.tsx` sudah punya `<Loader>` dengan `useProgress`, tapi ia baru muncul setelah Suspense aktif. Jendela yang sebenarnya perlu ditutup adalah **unduhan GLB 8,09 MB + stall kompilasi shader 2,3 s** saat layar masih hitam (§4m).
- Post-processing PS1 (§4b) — `@react-three/postprocessing` sudah terpasang, tinggal tambah pass
- Interaksi klik pintu — `Bvh firstHitOnly` sudah dipasang di `Office.tsx` untuk mempercepat raycast. Klik **meja billiard** sudah jalan (§6d); waypoint 3D (§4k) sudah mengambil peran "klik untuk pindah ruangan"
- ~~Karakter (§6b)~~ ✅ **SELESAI 29 Jul** — 5 karakter tampil & beranimasi, `CharacterLights` terisi
- ~~Gambar di layar monitor (§6c)~~ ✅ **SELESAI 30 Jul** untuk monitor AOC. Layar lain (iMac, MacBook, TV) masih kena blocker Blender.
- **Review visual billiard di browser** (§6d) — masih belum pernah dilakukan
- **Verifikasi waypoint Lounge & Function** (§4k) — koordinatnya warisan lama, belum dicek dengan resep pengukuran

### ⚠️ Ukur ulang FPS setelah karakter masuk — sebagian sudah

Angka 50-60 FPS di MVP1 diukur **sebelum** ada 5 SkinnedMesh + 2 directional light layer-1 + `frustumCulled = false`, dan sebelum N8AO + contact shadow masuk.

**Terukur 30 Jul** (§4l, §4m) — dengan karakter + N8AO high+halfRes + contact shadow + sapuan reveal aktif: **60 FPS setelah sapuan selesai, 0 error.** Saat mengukur varian AO, angka mentahnya sampai 119 FPS (`high + halfRes`) vs 66 (`high` tanpa halfRes). Jadi tambahan-tambahan itu **tidak** memakan anggaran performa MVP1.

Yang **masih** belum diukur: FPS saat minigame billiard jalan (fisika cannon-es + 16 bola). Lakukan bersamaan dengan review billiard.

## 4i. Konten & Animasi Teks ✅ (29 Jul — dikerjakan rekan tim)

Dikerjakan paralel di branch `feature/port-konten-v1` + `feature/text-transitions`, sudah di-merge ke `main`. **Tidak ada satu pun file yang beririsan dengan pekerjaan 3D/billiard** — jadi tidak pernah ada konflik git.

**Struktur halaman saat itu** (`src/App.tsx` — dulu `src/app/page.tsx` sebelum migrasi Vite, §4j) — 5 section bertambah jadi 9 di bawah hero:

```
Hero (3D) → Manifesto → Deployments → Services → LivingArchitecture
          → Process → Industries → Careers → Vision → Contact
```

> ⚠️ **Struktur satu-halaman-panjang ini sudah TIDAK berlaku sejak 3 Agu.** Situsnya kini empat halaman per-ruangan (§4q): `App.tsx` tinggal tabel route, dan daftar section pindah ke `src/lib/roomContent.tsx`. `Services.tsx` **dihapus** (diserap ke `Office.tsx`), `Careers` pindah ke Function. Yang di bawah ini tetap berlaku — komponen `motion`-nya masih dipakai semua.

**4 komponen animasi** (`src/components/motion/`), semuanya pakai library `motion` v12 (`motion/react`):

| Komponen | Fungsi |
|---|---|
| `FadeUp.tsx` | Stagger fade-up (`FadeUpList` + `FadeUpItem`), stagger 0,04 s, ease `[0.16, 1, 0.3, 1]` |
| `LineMask.tsx` | Teks muncul dari balik mask per baris |
| `Marquee.tsx` | Teks berjalan menyamping |
| `ScrollHighlight.tsx` | Warna kata digerakkan progres scroll (`useScroll` + `useTransform`) |

> **`useReducedMotion` dipakai di semua komponen** — kalau OS pengunjung minta kurangi animasi, elemen langsung tampil terang tanpa transisi. Ini bukan tambahan opsional; menghilangkannya membuat isi halaman tak terbaca bagi sebagian pengunjung.

✅ **Lockfile sudah disatukan ke bun (29 Jul)** — lihat §7.

### Percobaan WebGPU + KTX2 — di-revert (27→28 Jul)

Commit `38168ce` sempat mengganti viewer ke `WebGPURenderer` (three r171, fallback WebGL2) + aset KTX2/ETC1S (`office-mvp1-final.glb`, 699 KB VRAM vs 5,59 MB). **Di-revert penuh** di `8a1e0b1` keesokan harinya. Yang bertahan dari eksperimen itu bukan kodenya, tapi **idenya** — navigasi scroll/touch/keyboard + tween 1400 ms + hash routing lahir di sana, lalu ditulis ulang sebagai komponen R3F di `bc0e86c`. (Navigasi scroll/touch/keyboard itu sendiri **akhirnya dihapus** 30 Jul — §4k.)

### KTX2 dicoba ulang di jalur R3F — DITOLAK (3 Agu)

Percobaan kedua, kali ini murni KTX2 tanpa WebGPU, dengan uji berdampingan `?ktx2=1`. **Ditolak Keano: yang asli terlihat lebih bagus.** Artefak percobaannya dihapus; yang disimpan cuma `scripts/ktx2-convert.sh`.

Yang terukur — semuanya jalan, jadi ini **bukan** penolakan karena gagal teknis:

| | office.glb | office-ktx2.glb |
|---|---|---|
| VRAM | 240 MB | **64 MB** (−73%) |
| disk | 8,1 MB | 17,8 MB (**2,2× lebih besar**) |
| node/mesh/material | 656/240/233 | identik |
| lightmap | 39 | 39 |
| selisih piksel vs asli | — | rata-rata 0,49/255; 0,11% piksel beda >24 |

Pelajaran yang berlaku di luar KTX2:

- **Ukuran disk NAIK, bukan turun.** WebP+Draco sudah sangat efisien untuk transfer; KTX2 menukar itu demi format yang GPU baca langsung. Yang dibeli VRAM & waktu upload, yang dibayar bandwidth — arah yang berlawanan dari dugaan awal.
- **Lightmap WAJIB UASTC.** Dengan ETC1S ia turun ke 0,98 bit/piksel dan gradasi cahaya halus adalah titik terlemah kompresi blok (gejalanya banding). Memaksa UASTC (`-tu normal,attrib`) menaikkan VRAM 49 → 64 MB dan menyumbang ~3,6 MB ke ukuran file. Ini penyebab utama file jadi besar.
- **gltfpack menghapus nama mesh** (240/240 jadi kosong) meski `-kn` dipakai — `-kn` menjaga nama **node**, bukan mesh. Nama node & material selamat, jadi `M_LEDStrip` dan klik `PoolTable` tetap jalan. Tapi kode yang mencari nama *mesh* akan gagal senyap.
- **`TEXCOORD_1` turun 80 → 40 primitif** dan itu **aman**: ke-40 yang dibuang tidak dipakai material lightmap mana pun (diverifikasi satu per satu). gltfpack membuang UV mati. Sempat terlihat seperti bug fatal — pengecekan yang benar bukan "berapa yang hilang" tapi "apakah yang hilang itu dipakai".
- **Angka 240 MB itu nyata** dan terhitung dari header GLB: 62,9 MP × 4 byte. Bukan estimasi kasar.

Kalau suatu saat VRAM benar-benar jadi penghalang (mis. target perangkat mobile), resepnya sudah ada di `scripts/ktx2-convert.sh` — 4 langkah, karena gltfpack tidak bisa membaca Draco maupun WebP. Tapi jangan mengulang percobaan ini cuma karena "240 MB terdengar besar": sudah dicoba, hasilnya kalah di mata.

## 4j. Migrasi Next.js → Vite + React SPA ✅ (29 Jul — dikerjakan rekan tim)

Commit `5af294c`/`9264cd6`, branch `chore/migrate-nextjs-to-vite`, backup di `backup/main-before-vite-migration`. **Next.js dicabut seluruhnya.** Project ini SPA client-only — tidak ada satu pun halaman yang butuh SSR, dan hero 3D justru harus `ssr:false`.

| Dari (Next 16.2) | Ke (Vite 6) |
|---|---|
| `next dev` / `next build` | `vite --port 3000` / `tsc --noEmit && vite build` |
| `src/app/page.tsx` + `layout.tsx` | `index.html` + `src/main.tsx` + `src/App.tsx` |
| `src/app/globals.css` | `src/index.css` |
| `next/dynamic({ssr:false})` | `React.lazy` + `<Suspense>` |
| `next/image` | `<img fetchPriority="high">` |
| `next/font/google` | `@fontsource/geist-sans` + `@fontsource/geist-mono` |
| `@tailwindcss/postcss` | `@tailwindcss/vite` |
| `process.env.NODE_ENV` | `import.meta.env.DEV` |
| alias `@/*` dari `next` | `vite-tsconfig-paths` |

**Yang ikut beres di migrasi ini:** `public/export-test` symlink dihapus dan `public/3d/models/office.glb` di-commit langsung — jadi blocker `MODEL_URL` (§4h) tidak bisa terulang lewat symlink yang tidak ada di git. `.gitignore` diperbarui: `/.next/` → `/dist`, plus `!public/3d/models/office.glb`.

Terverifikasi: build sukses, dev server **276 ms** (dari beberapa detik di Next), app jalan.

> ⚠️ **Dokumentasi lama masih banyak menyebut "Next.js".** Itu sejarah, bukan keadaan sekarang. Yang sudah dikoreksi: §4h, §4i, §7. Kalau ketemu sisa lain, `next` sudah tidak ada di `package.json` — itu sumber kebenarannya.

---

## 4k. Navigasi Waypoint 3D ✅ (29–30 Jul) — scroll/swipe/keyboard DICABUT

Commit `a1a857a`. **`src/components/ui/RoomNav.tsx` dihapus**, `src/components/canvas/Waypoints.tsx` (568 baris) menggantikannya.

### Apa yang berubah, dan kenapa se-radikal itu

Dulu ada **empat** jalan berpindah ruangan: dot RoomNav, scroll wheel, swipe, panah keyboard. Sekarang **dua**: klik bidang waypoint di dalam ruangan, atau pemilih ruangan di Navbar.

> ⚠️ **Koreksi 3 Agu:** bagian ini (dan §4h) sempat menyebut "dropdown Navbar" — UI itu **tidak ada** saat §4k ditulis; `RoomNav` sudah dihapus di commit yang sama. Baru ada lagi 3 Agu dalam bentuk **room links** (bukan dropdown) dari merge `join`, §4q. Sejak itu ia juga bukan sekadar alternatif: di perangkat sentuh ia **satu-satunya** jalan pindah ruangan (§4p, INVARIANTS §6).

- **Scroll & swipe dihapus karena artinya ganda.** Di atas canvas ia memindah ruangan, di luar canvas ia menggulir halaman — dan pengunjung tidak bisa menebak mana yang akan terjadi.
- **Panah keyboard dihapus meski tidak ambigu**, supaya tidak ada jalur berpindah yang **tidak tergambar di layar**. Satu-satunya cara pindah harus yang kelihatan.

> ⚠️ **Konsekuensi yang wajib diingat kalau menambah ruangan:** tiap ruangan WAJIB punya minimal satu waypoint keluar yang **benar-benar terlihat** dari `VIEWS`-nya. Tidak ada lagi next/prev room sebagai jaring pengaman.

### Kenapa bidang 3D, bukan tombol HTML

Waypoint harus ikut perspektif — mengecil saat jauh, terasa menempel di ruangan. Tombol DOM selalu menempel di layar dan langsung terbaca sebagai antarmuka, bukan bagian dari dunia. Tampilannya: **arsir diagonal shader** (bukan tekstur, supaya tetap tajam berapa pun jarak kamera) + bingkai bracket di 4 sudut + label mono `[Nama Ruangan]`, semua muncul saat hover.

Detail implementasi yang penting:
- **`depthTest=false` + `renderOrder=10`** — waypoint sengaja digambar di atas segalanya termasuk perabot yang berdiri di depannya. Posisinya tetap benar di ruangan (jadi perspektifnya betul), tapi tidak ikut tertutup.
- **Hover dianimasikan lewat `ref` + `useFrame`, bukan `useState`.** Nilainya berubah tiap frame; lewat state, tiap frame memicu render ulang React di seluruh subtree.
- Disembunyikan saat `!heroInView` atau `billiardActive` — kalau tidak, geser-untuk-membidik di billiard bisa mengenai waypoint dan pemain terlempar ke ruangan lain.

### Label mengekor kursor (31 Jul, commit `c4fe546`)

Nama ruangan tidak lagi dipaku di tengah bidang waypoint, melainkan muncul di samping kursor dan **menyusulnya dengan sedikit tertinggal** — seperti ditarik tali, bukan dipaku.

- **Pindah dari `<Html>` drei ke overlay DOM tunggal di luar Canvas** (`src/components/ui/WaypointLabel.tsx`). Alasannya: label ini elemen screen-space, posisinya ditentukan **kursor**, bukan titik di dunia 3D — sedangkan `<Html>` justru memproyeksikan titik dunia ke layar tiap frame. Bonus: tiap `<Html>` memanggil `ReactDOM.createRoot()` sendiri, jadi satu overlay tunggal meniadakan satu root React **per** waypoint.
- **Gerak kursor sengaja TIDAK lewat state React** — posisinya di `ref` dan diinterpolasi tiap frame, supaya tidak memicu render ulang saat mouse bergerak.

### 🔑 Resep mengukur posisi waypoint — JANGAN menebak koordinat

Semua angka di `WAYPOINTS` **diukur**, dan tiap entri mencatat nama objek Blender-nya supaya bisa diukur ulang kalau modelnya berubah. Alurnya lewat Blender MCP:

1. **Ukur objeknya** — `matrix_world @ v.co` untuk bbox tiap objek terkait.
2. **Bikin kamera tiruan** yang sama persis dengan `VIEWS.<Room>`: `sensor_fit='VERTICAL'`, `sensor_height=24`, `lens = 12/tan(30°)` → FOV 60°. Konversi `bl(x,y,z)` di kode = `blender(x, y, z)` langsung; `three(x,y,z) = blender(x, z, −y)`.
3. **⚠️ `bpy.context.view_layer.update()` DULU** sebelum baca `matrix_world`. Tanpa itu `world_to_camera_view` mengembalikan hasil ngawur — pernah bikin bisection gagal.
4. **Cek keterhalangan** dengan `scene.ray_cast` dari kamera ke titik sasaran; jarak hit < jarak sasaran = ada yang menutupi.
5. **Bikin quad uji + render Workbench** untuk verifikasi mata. Workbench pakai `material.diffuse_color`, BUKAN node BSDF — set `diffuse_color` + `scene.display.shading.color_type='MATERIAL'`, kalau tidak rendernya polos abu-abu.
6. **Bersihkan** objek/kamera/material bantu setelah selesai.

### Temuan besar: 3 waypoint ternyata MUSTAHIL TERLIHAT sejak ditulis

Ini yang paling mahal didapat dari resep di atas — dan tidak akan pernah ketahuan tanpa mengukur proyeksi kamera. Waypoint yang ditempel di pintu sungguhan bisa jatuh **di belakang kamera**, karena `VIEWS` ruangan itu menghadap ke arah lain:

| Waypoint | Pintunya di | `VIEWS` menghadap | dot vs arah pandang | Penggantinya |
|---|---|---|---|---|
| Office→Lounge | +X (kaca `GWL_N1_Glass`) | −X | **−2,65** | **dibaringkan di lantai**, mengikuti petak garis LED |
| Meeting→Office | timur | barat (ke TV) | **−0,24** | dinding krem timur pilar `OP_Pillar_N2` |
| Function→Lounge | selatan (`GW_Door`) | utara (ke TV) | **−0,96** | dinding gelap kanan TV, batas ditandai user via annotate |

Ketiganya **mati sejak ditulis**, bukan rusak setelah kamera digeser. Waypoint pengganti diberi `label` eksplisit ("Go back to Lounge") karena nama ruangan saja terbaca seperti tujuan baru, padahal maksudnya jalan pulang.

Pola yang muncul: **waypoint jalan-pulang jarang bisa ditempel di pintunya**, karena `VIEWS` tiap ruangan sengaja menghadap ke daya tarik utamanya (TV, whiteboard), bukan ke jalan masuknya. Tempel di bidang yang memang terlihat, dan buat lebih besar dari bagian yang terlihat supaya tepinya keluar bingkai — kotak yang terpotong di tengah dinding terbaca sebagai cacat.

### Gotcha waypoint

- **Waypoint lantai butuh rotasi beda:** `planeGeometry` lahir menghadap +Z, jadi `floor: true` merebahkannya `[-π/2, 0, rotY]`. Label diangkat pada **+Z lokal** (setelah rebah = lurus ke atas) — rumus yang sama tetap benar untuk waypoint dinding.
- **React key wajib memuat `floor`:** satu pasang ruangan boleh punya dua waypoint (pintu + lantai); tanpa pembeda itu keduanya berbagi key dan hover-nya menyala bersamaan.
- **Awas objek di atas dinding:** `AirVent_01..03` (z 2,155..2,505). Bidang setinggi penuh akan menembus kisinya kalau tidak ditaruh di depannya.
- **Label `pointerEvents: none`** — kalau label ikut menangkap kursor, dia menutupi bidang di bawahnya dan hover berkedip-kedip.

### ⚠️ Function Room berpotensi jalan buntu di HP → **terjawab lain jalan**

Waypoint Function→Lounge terlihat 100% di 21:9, 59% di 16:9, 43% di 16:10, 16% di 4:3, dan **tidak terlihat sama sekali di rasio potret**. Sejak scroll & swipe dihapus, di layar potret pengguna sentuh **tidak punya jalan keluar dari Function Room**.

**Temuan ini yang memicu §4p** — tapi jawabannya bukan memindahkan waypoint-nya ke lantai seperti yang direncanakan di sini. Setelah ditelusuri, masalahnya lebih luas dari satu waypoint: **waypoint dibangun di atas hover, dan jari tidak punya hover**. Jadi di perangkat sentuh waypoint dimatikan **seluruhnya** dan navigasi diserahkan ke navbar (§4p, §4q, INVARIANTS §6). Waypoint ini sendiri dibiarkan apa adanya — di desktop ia baik-baik saja.

### `START_ROOM` — titik awal tur pindah ke Lounge

`START_ROOM = "Lounge"` di `sceneStore.ts`, dan itu **satu-satunya** tempat titik awal ditentukan. Ia dipakai untuk **tiga** hal yang wajib tetap sepakat:

1. posisi kamera saat mount (`CameraController` + `START_POS` di `Scene.tsx`)
2. `currentRoom` awal di store
3. ruangan yang URL-nya **tanpa hash** — lewat `hashFor()`

Nomor 3 yang paling mudah terlewat. Dulu Office yang tanpa hash; memulai di Lounge tapi membiarkan Office tanpa hash berarti **pindah ke Office membuat URL jadi bersih, lalu reload mengembalikan pengunjung ke Lounge** — bukan ke Office yang barusan dibuka.

Sekalian dibetulkan: `START_POS` di `Scene.tsx` dulu tuple hardcode `[-6.0, 1.6, 4.0]` yang bahkan **tidak cocok** dengan `VIEWS.Office` (`[-3.97, 1.13, 2.48]`) — jadi frame pertama selalu dari tempat yang salah sampai `CameraController` men-snap-nya. Sekarang diturunkan dari `VIEWS[START_ROOM].pos`.

---

## 4l. Lighting Dirombak ✅ (30 Jul) — lightmap dinyalakan, AO + bayangan kontak masuk

Commit `864322d`. Keluhan yang memicunya: **"semuanya terang rata"** — dan penyebabnya bukan kurang efek, melainkan `LIGHTMAP_INTENSITY = 0` yang membuat **ambient jadi satu-satunya sumber cahaya**. Ambient mengenai semua permukaan sama rata tanpa peduli arah hadap maupun ada tembok di sebelahnya, jadi pojok ruangan & plafon ikut terang.

| Setelan | Sebelum | Sesudah |
|---|---|---|
| `LIGHTMAP_INTENSITY` (`Office.tsx`) | **0** | **1** |
| `ambientLight` (`Scene.tsx`) | 0.12 | **0.03** |
| `<Bloom intensity>` | 1.6 | **0.4** |
| AO | tidak ada | **N8AO** `high` + `halfRes` |
| Bayangan | tidak ada | **ContactShadows** per ruangan |
| `M_LEDStrip` emissive | 8 (dari GLB) | **3** (ditimpa) |

Logikanya: bloom 1,6 dulu dipakai untuk **mengangkat kecerahan keseluruhan** — pekerjaan yang sekarang diambil alih lightmap + AO + bayangan. Bloom kembali ke porsinya: memberi pendar pada yang memang menyala.

### N8AO — mengisi lubang terbesar lightmap

Bake lightmap hanya mencakup objek ≥8 m² (§4g) = **39 dari 233 material**. 189 material sisanya tidak punya lightmap sama sekali, jadi pojoknya tidak pernah gelap. AO bekerja **per piksel layar**, jadi kena semua objek tanpa perlu bake — sekaligus menutup tiga cacat yang tidak bisa dibetulkan dari Three.js: plafon Office/Lounge/Function tidak ke-bake, dan 2 lightmap (dinding krem + parket meeting) isinya hitam total.

**⚠️ HARUS SEBELUM `<Bloom>` di `EffectComposer`.** Urutan = urutan eksekusi: AO menggelapkan dulu, bloom baru menyebarkan sisa yang terang. Dibalik, bloom menyebar dari piksel yang belum digelapkan dan pendarnya bocor ke pojok yang seharusnya gelap.

**⚠️ `quality="high"` + `halfRes`, dan keduanya hasil pengukuran — bukan selera.** `quality="low"` adalah penyebab **NOISE BELANG** di dinding & plafon yang sempat dikira berasal dari lightmap (dokumentasi n8ao menyebutnya sendiri: *"Low (Temporally stable, but low-frequency noise)"*). Bukti A/B: mematikan lightmap **tidak** mengubah rasio noise (0,00377 → 0,00393), sedangkan mematikan AO memangkas noise **53%** padahal ruangan jadi lebih terang.

Noise terukur di dinding kiri meeting room + FPS:

| Setelan | Noise | FPS | |
|---|---|---|---|
| `low` + halfRes | 0,377 | | noise belang — kondisi awal |
| **`high` + halfRes** | **0,322** | **119** | ✅ DIPAKAI — paling halus DAN tercepat |
| `high` tanpa halfRes | 0,621 | 66 | lebih buruk DAN separuh FPS |

> Baris terakhir berlawanan intuisi tapi terukur: **membuang `halfRes` menaikkan noise dua kali lipat.** Di setengah resolusi, upsample sadar kedalaman ikut meratakan bintik antar-piksel — jadi `halfRes` di sini berfungsi sebagai **penghalus**, bukan cuma penghemat ongkos.

### Bayangan kontak — "gelap di bawah meja"

`ContactShadowsRig.tsx`, satu bidang penangkap **per ruangan** (Office, Meeting, Lounge, Function; Pantry tidak ada karena `VIEWS.Pantry` masih `disabled`). Pelengkap AO, bukan tumpang-tindih: AO bekerja di ruang layar (pojok & celah rapat), ini menjatuhkan bayangan **arah** pada lantai dari benda di atasnya.

**Kenapa `ContactShadows` dan bukan lampu + shadow map:** komponen drei ini sama sekali tidak memakai lampu — ia memasang `scene.overrideMaterial = MeshDepthMaterial`, merender dari kamera ortografis yang memandang **lurus ke atas dari lantai**, lalu mem-blur hasilnya. Jadi `gl.shadowMap` tidak perlu dinyalakan — dan **jangan** dinyalakan, karena itu memaksa 291 mesh statis dievaluasi ulang.

Karena kameranya memandang ke atas, benda rendah jadi gelap dan makin tinggi makin pudar sampai terpotong `far`. Persis perilaku occlusion yang dicari. Rumus alpha, dari shader-nya sendiri:

```
alpha = 1 − (h − y0 − near) / (far − near)      // h = ketinggian dunia occluder
```

**Ini yang membuat pendekatannya mungkin di GLB yang sudah di-merge:** depth clipping bekerja **per-fragmen**, bukan per-objek. `MG_Office_ODesk_BlackSteel` membentang y 0,01..3,60 — meja dan geometri setinggi plafon di SATU mesh, mustahil dipisah lewat layer atau visibilitas. Tapi `near`/`far` memotongnya dengan benar (diuji: papan meja y 0,70–0,75 tertangkap, slab lantai ter-clip `near`, plafon ter-clip `far`).

**⚠️ 4 jebakan yang semuanya kena di sesi ini:**

1. **`y0` beda-beda per ruangan** karena tinggi lantainya beda: Office 0,00 · Meeting parquet 0,00 · Lounge rug 0,012 · Function rug 0,018. Kalau bayangan hilang di SATU ruangan saja, ini tersangka pertama.
2. **`blur` dipatok ke resolusi 256** (`uniforms.h.value = blur * 1/256`), jadi nilainya TIDAK sebanding antar resolusi. Mengubah `resolution` **wajib** setel ulang `blur` — jangan dibawa apa adanya.
3. **Bidang kurang lebar = bayangan terpotong jadi garis.** Versi pertama Meeting dibuat 7,4 × 4,6 (pas occluder + bantalan 0,25 m) dan tepi timurnya memotong occluder → bayangan deretan kursi kanan terpotong di garis vertikal, meninggalkan pita terang bertangga. Sempat dikira z-fighting `near`; ternyata murni bidangnya kurang lebar. Beri bantalan ~0,5 m karena blur menyebarkan bayangan keluar siluetnya.
4. **`key={currentRoom}` WAJIB.** `frames={4}` berarti bayangan dipanggang sekali lalu berhenti; tanpa remount, pindah ruangan membawa bayangan ruangan **lama**. Dan jangan `frames={1}`: material masih dimutasi setelah mount (`needsUpdate` + PMREM), jadi 1 frame bisa mengunci scene kosong.

### 🐛 Bug paling menyesatkan: bayangan yang MENERANGI lantai

N8AO memindahkan objek yang `transparent && !depthWrite && !userData.treatAsOpaque` ke pass transparansinya sendiri, dan **di pass itu AO tidak diterapkan pada piksel di baliknya**. Bidang penangkap bayangan memenuhi ketiga syarat itu — jadi lantai di bawahnya kehilangan penggelapan AO, dan bayangannya **berbalik menerangi lantai**.

Terukur di piksel yang sama, bawah meja:

| Kondisi | Tanpa bayangan | Dengan bayangan | |
|---|---|---|---|
| AO nyala, tanpa flag | 37 | **54** | ❌ salah arah |
| AO nyala, dengan flag | 37 | **33** | ✅ benar |
| AO mati | 113 | 103 | ✅ benar |

Baris terakhir yang membuatnya sulit dilacak: **tanpa AO semuanya tampak beres**, jadi gejalanya cuma muncul di kombinasi keduanya.

Solusinya `userData.treatAsOpaque = true` — dan **⚠️ flag HARUS di userData MESH.** Memasangnya lewat prop `userData` pada `<ContactShadows>` menempel ke grup luarnya dan tidak terbaca N8AO (sudah dicoba, angkanya tidak bergerak sama sekali). Karena itu ada `useEffect` yang men-traverse grup dan menandai mesh-nya. **JANGAN pakai `cannotReceiveAO`** — flag itu justru MENAMBAHKAN objek ke pass transparan, memperburuk masalahnya.

### ⚠️ Menaikkan `LIGHTMAP_INTENSITY` lebih dari 1 TIDAK akan menolong

Lightmap lantai office (image 21) di-pack sebagai **ORM**: satu texture dipakai serentak sebagai `occlusionTexture` DAN `metallicRoughnessTexture`. three.js membaca `lightMap` sebagai `.rgb` penuh, jadi menaikkan intensity **membanjiri lantai dengan biru** dari channel metallic (terukur mean RGB 51/36/254). Dua lightmap lain juga mati: `M_SM_Wall_Cream_MeetingWest` hitam pekat, `M_MR_Parquet_MeetingWest` kosong. Itulah kenapa AO + bayangan kontak diperlukan, bukan sekadar menaikkan angka.

### LED strip: `emissiveIntensity` 8 → 3

Satu-satunya material yang emissive-nya **ditimpa** — pengecualian bertarget, bukan pembatalan aturan "jangan clamp emissive" (§4h fix 2, yang dilarang adalah clamp **menyeluruh**). Blender mengekspornya 8 lewat `KHR_materials_emissive_strength`; dengan `toneMapped=false` angka itu melewati ambang bloom 0,95 dengan margin ~8×, jadi pendarnya jauh lebih tebal dari lampu lain. Turunkan angka ini untuk mengurangi bloom garis LED **tanpa** menyentuh `<Bloom intensity>` global. Di bawah ~1,0 strip berhenti berpendar sama sekali.

Cahaya LED yang **jatuh di lantai** sudah di-bake ke lightmap dan tidak ikut berubah — yang berubah cuma pendar strip-nya sendiri.

### ❌ Light cone volumetrik — DIBANGUN lalu DIHAPUS (30 Jul)

`LightCone.tsx` (567 baris) + `LightCones.tsx` (108 baris) dibuat di `864322d` lalu **dihapus di hari yang sama**. Versi terakhir ada di `git stash` ("light cone WIP 30 Jul"). Dua temuan yang mahal didapat, dicatat supaya tidak diulang kalau nanti dicoba lagi:

1. **Kerucut 360° tidak bisa MENJAMIN sinar seimbang kiri-kanan.** Potongan noise yang menghadap kamera ditentukan azimut kamera, jadi tiap view dapat potongan berbeda dan ada yang kebetulan berat sebelah. Mengubah seed/frekuensi/lantai-sinar cuma menggeser peluang, tidak menyelesaikan. Yang menyelesaikan: **setengah cangkang (180°) yang selalu menghadap kamera + `uv.x` dicerminkan** → kiri == kanan secara matematis.
2. **Radius kerucut tampak = KERUCUT DALAM Blender**, yaitu `spot_size × (1 − spot_blend)`, bukan `spot_size` penuh. Yang penuh itu batas terluar tempat cahaya sudah habis meredup; memakainya memberi bentuk **kipas mekar**, bukan berkas sorot.

---

## 4m. Sapuan "Kantor Terbentuk" ✅ (30 Jul)

`src/components/canvas/revealSweep.ts` + penggerak di `Office.tsx`. Menggantikan pop-in mendadak saat GLB selesai dimuat: sebuah bidang tegak menyeberangi ruangan sepanjang sumbu X — di belakangnya geometri tampil normal, di depannya belum ada apa-apa, dan di garis pertemuannya piksel muncul bertahap lewat pola dither dengan tepi silver brand.

**Terverifikasi di browser: 60 FPS setelah sapuan, 0 error.**

| Parameter | Nilai | Alasan |
|---|---|---|
| Arah | **Lounge → Meeting** (x +2,55 → −21,70) | Lounge itu pintu masuknya. Dibalik, kantor terbentuk dari ruangan terdalam yang belum pernah dilihat — terbaca seperti pemindaian denah, bukan seperti memasuki tempat |
| Durasi | **2,6 s** easeOutCubic | 24,25 m / 2,6 s ≈ 9 m/s. Punya bobot, bukan kilatan. Jangan >3 s: sapuan berjalan sebelum pengunjung bisa berinteraksi |
| Pita dither (`BAND`) | 3,5 m | ≈14% bentangan — cukup lebar untuk terbaca sebagai gradasi, cukup sempit untuk tetap terbaca sebagai garis bergerak |
| Pita silver (`EDGE`) | 1,4 m | Lebih sempit dari BAND supaya warnanya jatuh di ujung depan saja |
| Warna tepi | **`#d2d3d4`** | Silver huruf "cogniti" dari `public/brand/Logo-Final.png` |

**Merah `#ec2028` (segitiga logo) sengaja TIDAK dipakai** untuk efek seluruh ruangan: menyapu seluruh kantor dengan merah terbaca sebagai **peringatan sistem**, bukan brand. Simpan merah untuk aksen kecil yang memang menuntut perhatian.

### Kenapa dither + `discard`, bukan alpha fade seperti referensinya

basement.studio memudarkan alpha (`material.transparent = true`). Itu bekerja untuk **satu** objek; di sini ada **233 material**. Menyalakan `transparent` di semuanya berarti three memindahkan mereka ke pass transparan yang diurutkan per jarak — urutan gambarnya jadi salah di geometri yang saling tembus (kusen di dalam dinding, kaki kursi di dalam karpet), dan `depthWrite` mati sehingga objek di belakang bocor ke depan. Ditambah ongkos sortir 294 primitive tiap frame.

`discard` menghindari semuanya: material tetap **opaque**, depth buffer tetap benar, urutan gambar tidak berubah. Yang hilang cuma kehalusan gradasi — dan justru itu yang ditutup **pola dither Bayer 4×4**: mata membaca kerapatan titik sebagai gradasi, persis seperti halftone koran.

> ⚠️ **JANGAN ganti `discard` jadi alpha tanpa mengukur ulang keempat ruangan.**

### Detail shader yang tidak boleh digeser sembarangan

- **Satu fungsi `patch` yang dipakai bersama semua material.** `Material.customProgramCacheKey()` bawaan three mengembalikan `this.onBeforeCompile.toString()`, jadi selama semua material memakai **referensi fungsi yang sama**, WebGL hanya mengompilasi SATU program tambahan. Objek uniform juga dibagi → menyetel progress = menulis **satu** angka, bukan 233.
- **Titik sisip VERTEX = `project_vertex`** (`meshphysical.glsl.js:44`). Di titik itu `transformed` sudah melewati morph, skinning, dan displacement — itu yang membuat **5 karakter ber-skin ikut tersapu di posisi pose sebenarnya** alih-alih di bind pose. Menyisip sebelum `skinning_vertex` membuat karakter muncul di tempat yang salah.
- **Titik sisip FRAGMENT = `dithering_fragment`** (`:221`), chunk **terakhir**, setelah `tonemapping_fragment` (217) dan `colorspace_fragment` (218). Konsekuensinya penting: `gl_FragColor` sudah dalam sRGB akhir, jadi tepi tampil **persis `#d2d3d4`** tanpa diredam ACES. Dipindah ke sebelum tonemapping, silver-nya jadi abu kusam dan harus dikonversi manual.
- **Pola dither pakai `gl_FragCoord`, bukan UV.** Polanya terkunci ke layar dengan kerapatan tetap 1 titik/piksel, sama rapatnya pada dinding jauh maupun meja di depan hidung. Pola berbasis UV akan melar mengikuti perspektif dan terlihat seperti tekstur kotor.
- **Matriks Bayer ditulis sebagai rantai `if`, bukan array const** — array indexing dinamis di GLSL ES 1.0 (WebGL1) tidak dijamin didukung, dan project ini belum mengunci WebGL2. Rantai ini dikompilasi jadi lookup konstan, ongkosnya nol.
- **Deklarasi `uniform`/`varying` wajib ditambahkan sendiri** lewat prefiks string. Mengisi `shader.uniforms` hanya menyediakan **nilai**-nya ke three, tidak membuat variabelnya ada di shader — tanpa itu kompilasi gagal "undeclared identifier".
- **`dispose()` wajib dipanggil setelah animasi selesai** dan harus mengembalikan `onBeforeCompile` **yang asli**, bukan disetel ke no-op (no-op tetap mengubah cache key dan memaksa kompilasi program ketiga). Tanpa dispose, tiap fragmen di seluruh kantor terus menghitung dither + discard selamanya untuk hasil yang sudah pasti "tampil penuh".
- **`useLayoutEffect`, bukan `useEffect`** — patch harus terpasang sebelum frame pertama digambar. Dengan `useEffect` ada satu frame di mana kantor tampil penuh sebelum sapuan mengambil alih.
- Material di-dedup pakai `Set`: 233 material dipakai bersama oleh 294 primitive.

### ⚠️⚠️ STALL 2,3 DETIK — terukur, dan BUKAN dari sapuan

Ini temuan paling penting di sesi ini karena mudah sekali salah menuduh. Antara GLB selesai di-parse dan **frame PERTAMA tergambar** ada jeda besar: three sedang mengompilasi shader untuk 233 material dan mengunggah 91 texture, dan itu memblokir thread utama.

Terukur di mesin ini (30 Jul, dev build):

```
traverse GLB selesai      → +0,88 s
frame PERTAMA tergambar   → +3,20 s
────────────────────────────────────  stall 2,32 s
```

**A/B dengan patch sapuan dimatikan: 2319 ms tanpa vs 2366 ms dengan** — sapuan menambah ~50 ms, bukan penyebabnya. Stall ini **sudah ada sebelum sapuan dibuat**. Jangan salahkan sapuan kalau loading terasa lama.

**Tapi stall itu MERUSAK animasinya kalau tidak ditangani:** hitungan dimulai di frame 1, frame 2 baru datang 2,4 s kemudian, dan sapuan langsung **meloncat ke 87%** — praktis tak terlihat. Persis gejala yang muncul saat pertama dicoba.

Penanganannya: jam baru mulai setelah ada frame yang jaraknya wajar (`dt < 0,25 s`). Ambang 0,25 s jauh di atas frame normal (0,008–0,033 s) tapi jauh di bawah stall kompilasi — sekaligus menangani hitchan lain dengan sebab sama (pindah tab, GC besar) tanpa kasus khusus.

**Kandidat perbaikan stall:** `KHR_parallel_shader_compile` / `compileAsync`. **Belum dikerjakan.**

### ✅ Loader saat mengunduh — SELESAI (31 Jul, lihat §4n)

Permintaan awal user, sengaja dipisah dari sapuan. Jendela yang benar untuk itu justru **stall 2,3 s + unduhan GLB 8,09 MB**, saat layar masih hitam dan pengunjung tidak dapat umpan balik apa pun. Dijawab 31 Jul dengan **loading screen isometrik yang dirender di Web Worker** — detail di §4n.

### Verifikasi visual: Playwright 1.61.0

Versi itu yang cocok dengan chromium 1228 yang sudah ter-cache di `~/Library/Caches/ms-playwright`; **versi lain memicu unduhan browser baru**. Flag WebGL yang jalan di headless:

```
--use-gl=angle --use-angle=metal --enable-unsafe-swiftshader
```

---

## 4n. Loading Screen Isometrik ✅ (31 Jul) — dirender di Web Worker

Port animasi loader basement.studio (sumber `~/Downloads/CSI.tsx`). File di `src/components/loader/`: `introAnimation.ts` (logika murni), `intro.worker.ts`, `introMessages.ts`, `LoadingScreen.tsx`.

**Koreografi (SENGAJA beda dari referensi):** intro sekali → idle putar-jeda berulang → outro. Referensi membuang batangnya keluar layar tiap siklus; untuk loader berdurasi tak tentu itu bikin gelisah, jadi batang ditahan di tempat.

### ⚠️ Empat hal mahal yang tidak terlihat dari kode

1. **Worker itu SYARAT, bukan kemewahan.** Kompilasi 233 shader memblokir main thread 2,3 s (§4m). Kanvas 2D menggambar di thread yang sama → animasi main-thread **MEMBEKU** persis di detik terakhir sebelum kantor muncul. Yang kena stall itu fase IDLE-nya; outro aman karena sinyalnya datang dari `useFrame` yang baru jalan setelah stall usai.
2. **JANGAN impor `three` di modul animasi.** Worker = chunk terpisah; `three` membuatnya ratusan kB dan loader harus menunggu unduhan sebelum bisa muncul — kebalikan dari tugasnya. Matematika 4×4 ditulis tangan (~40 baris), rumus rotasi disalin dari `Matrix4.makeRotationFromEuler` cabang XYZ (cocok sampai galat 1,7e-15). Hasil: chunk worker **3,74 kB**.
3. **StrictMode + `transferControlToOffscreen()` = bug fatal di dev.** Fungsi itu cuma boleh dipanggil SEKALI seumur hidup elemen kanvas. Alur dev: mount → transfer → cleanup → mount lagi; di putaran kedua jalur worker DAN jalur cadangan sama-sama buntu → layar putih kosong. Solusi: worker **tidak** dimatikan di cleanup (ref bertahan melewati remount), dimatikan di `finish()` saja.
4. **`useProgress` drei BOHONG** — melapor 100% saat unduhan selesai, 2,3 s sebelum ada yang terlihat. Diganti `sceneReady`, disetel dari gerbang `dt > 0.25` di `Office.tsx` (§4m).

### Detail yang tidak boleh digeser

- Batang digambar `destination-out` (**melubangi** lingkaran), bukan putih seperti referensi. Wajib: saat outro latar putihnya memudar, batang putih akan tertinggal melayang di atas kantor 3D.
- Latar putih = `<div>` DOM + `transition-opacity`, bukan `fillRect`. Repo ini belum punya `AnimatePresence` di mana pun — jangan perkenalkan untuk fade sesederhana ini.
- `index.html` punya `<div>` putih statis di dalam `#root` — mencegah kedipan hitam sebelum React mount (body `#000`, loader putih).
- Tuas kalau idle terasa lama: `IDLE_PAUSE_MS` di `introAnimation.ts` (2000 → 1200).
- **BELUM DIUJI:** anti-beku di browser sungguhan (DevTools Performance saat kompilasi shader) — itu inti keputusan Worker, dan cuma bisa dibuktikan mata.

---

## 4o. 🐛 Bug Merge Lintas-Wilayah + INVARIANTS.md ✅ (31 Jul)

Repo ini dikerjakan berdua: **Keano** pegang `src/components/canvas/**` + `lib/store` (aset & scene 3D), **Nico** pegang `src/components/sections/**`, `motion/**`, Navbar (konten web). Batasnya bersih — tumpang tindih nyaris nol dalam 80 commit.

**Kelas bug yang berulang: dua cabang yang masing-masing benar, rusak hanya saat bertemu — dan git TIDAK melaporkan konflik** karena perubahannya jatuh di baris berbeda. Sudah terjadi dua kali:

1. **`frameloop="demand"` vs tiga `useFrame` baru.** `frameloop="demand"` (`df27f3d`, hanya di `main`) vs `useFrame` di Office/Waypoints/BilliardGame (dari `feature/screen-content`, bercabang 7 menit sebelum kontrak demand lahir). Auto-merge sukses secara tekstual (baris 41 vs 67 di `Scene.tsx`). Akibat: hanya `CameraController` yang punya `invalidate()` → cuma dia yang minta frame. **Gejala khas: tampilan stuck total + berat, TAPI navigasi tetap responsif.** Sapuan reveal berhenti di progress 0, `sweep.dispose()` tak pernah tercapai, 233 material menghitung dither + `discard` selamanya, dan `discard` mematikan early-Z → berat, terutama di GPU integrated. **Fix:** `frameloop="demand"` dicabut (`7e3723a`).
2. **`StaticHero` (reduced-motion) vs `LoadingScreen`.** `<Scene/>` tak di-mount → `sceneReady` selamanya false → overlay putih menutupi situs selamanya.

Keduanya **lolos** `tsc --noEmit`, `eslint`, dan `bun run build`. Yang menangkap cuma: membuka halamannya, atau test yang membaca sumber.

**Penjaganya sekarang ada** (`INVARIANTS.md` di root):
- `INVARIANTS.md` — 6 invariant lintas-wilayah + kebiasaan merge
- `src/components/canvas/frameloop.invariant.test.ts`
- `src/components/loader/loaderGate.invariant.test.tsx`
- `src/lib/hooks/coarsePointer.invariant.test.ts` (3 Agu, §4p)

Norma penulisan penjaga di repo ini: **buktikan test-nya MERAH di kondisi rusak dulu** sebelum dipakai memverifikasi perbaikan. Test yang tak pernah terlihat gagal tidak bisa dipercaya. Catatan: jsdom tidak punya `canvas.getContext('2d')`, jadi `LoadingScreen` selalu jatuh ke `finish()` seketika di test — jangan tulis test "overlay bertahan", itu memaksa orang melemahkan kode produksi.

---

## 4p. Perangkat sentuh: scene 3D jadi pemandangan ✅ (3 Agu)

Di `(pointer: coarse)`, kantor 3D **tidak menerima interaksi apa pun**: waypoint tidak di-render, meja billiard tidak bisa dibuka. Navigasi ruangan di HP diserahkan sepenuhnya ke navbar.

**Pemicunya** waypoint `Function→Lounge`: di rasio potret ia jatuh **di luar bingkai** sepenuhnya (terlihat 100% di 21:9, 59% di 16:9, 0% di 1:1 ke bawah), jadi Function Room menjadi jalan buntu di HP sejak scroll & swipe dicabut 30 Jul. Tapi setelah ditelusuri, masalahnya lebih luas dari satu waypoint.

**Akar masalahnya bukan layar sempit, melainkan tidak ada hover.** Waypoint adalah bidang **tak terlihat** sampai kursor menyentuhnya — arsir, bingkai, dan label itulah satu-satunya penanda bahwa ia bisa diklik. Jari tidak punya keadaan hover: sentuhan pertama langsung memindahkan ruangan, jadi yang dialami pengunjung HP adalah kamera melompat tanpa sebab yang terlihat. Karena itu patokannya `pointer: coarse`, **bukan `max-width`** — patokan lebar layar meloloskan tablet landscape yang masalahnya sama persis.

**Blocker yang ditemukan saat mengerjakan ini — dan sudah terjawab.** `Navbar.tsx` ternyata **belum punya pemilih ruangan sama sekali**: `RoomNav` dihapus di `a1a857a`, dan komentar di `Hero.tsx` + `CameraController.tsx` yang menyebut "dropdown ruangan di Navbar" merujuk ke UI yang tidak ada lagi (komentarnya sudah dibetulkan). Grep `goTo` di seluruh `src/` cuma menemukan `Waypoints.tsx`. Konsekuensinya pengunjung HP terkunci di Lounge — diterima sadar sambil menunggu koordinasi dengan Nico, karena navbar wilayahnya.

Ternyata Nico mengerjakannya paralel di branch `join`: room links di `Navbar.tsx` (`ACTIVE_KEYS.map` → `goRoom`) + **routing berbasis path** (`/lounge`, `/meeting`, …) lewat `routes/RoomRouteSync.tsx` yang menyinkronkan URL ↔ `currentRoom` dua arah. Begitu `join` di-merge, kuncinya terbuka. ⚠️ Keduanya kini **terikat**: kalau room links dihapus, §6 berubah jadi jalan buntu di HP, dan tidak ada test yang bisa melihat ikatan itu.

**Tiga berkas menjalankan satu keputusan ini**, dan urutannya tidak boleh dibalik:

| berkas | perannya | kalau lepas |
|---|---|---|
| `canvas/Waypoints.tsx` | berhenti me-render waypoint | sentuhan memindah ruangan tanpa penjelasan |
| `canvas/Office.tsx` | `onClick` meja tidak membuka minigame | **pemain terkunci** di pandangan atas meja — tombol keluar hidup di HUD yang tidak di-mount |
| `sections/Hero.tsx` | HUD & label tidak di-mount | chunk terunduh percuma di seluler (kosmetik + hemat bundle) |

Gerbang di `Hero.tsx` cuma kosmetik; yang benar-benar mematikan interaksi adalah dua yang pertama. **Menyembunyikan HUD tanpa mematikan pintu masuknya menghasilkan jalan buntu**, bukan tampilan yang kurang rapi.

Hook-nya `src/lib/hooks/useCoarsePointer.ts` — `useSyncExternalStore` di atas `matchMedia`, jadi ia ikut berubah kalau perangkat berganti mode. Penjaganya `coarsePointer.invariant.test.ts`, dan **sudah dibuktikan merah** dengan melepas gerbang di `Office.tsx` + mengganti query ke `max-width` sebelum dipakai. ⚠️ Seluruh aturan ini **tidak terlihat sama sekali di desktop** — buka device toolbar setelah menyentuh apa pun di `canvas/`.

---

## 4q. Routing Per-Ruangan & Konten Per-Ruangan ✅ (3 Agu — merge `join`)

Situs berubah dari **satu halaman panjang** jadi **empat halaman**, satu per ruangan. Hero 3D tetap sama di semuanya; yang berganti cuma konten di bawahnya.

### Bentuk barunya

```
App.tsx  →  <SiteLayout>            ← persisten, TIDAK ikut berganti
              LoadingScreen
              Navbar
              Hero  (menampung <Canvas>)
              HeroHandoff
              <main><Outlet/></main> ← HANYA ini yang di-swap
              RoomRouteSync
            </SiteLayout>

  /          → RoomContent room="Lounge"
  /office    → RoomContent room="Office"
  /meeting   → RoomContent room="Meeting"
  /function  → RoomContent room="Function"
  *          → redirect ke /
```

**Kenapa Hero ada di layout, bukan di tiap route:** `<Canvas>` hidup di dalam `Hero.tsx`. Kalau ia ikut berganti tiap pindah ruangan, konteks WebGL kantor 3D dibongkar-pasang setiap kali — kompilasi ulang 233 shader di tengah tween kamera 1400 ms. Dengan Hero di `SiteLayout`, ia tidak pernah unmount.

**Konten tiap ruangan** (`src/lib/roomContent.tsx`) — tiap ruangan punya narasinya sendiri, bukan potongan acak dari halaman lama:

| ruangan | isi | perannya |
|---|---|---|
| **Lounge** `/` | CsiHero → Manifesto → TrustedBy → Deployments → LivingArchitecture → Process → Industries → Vision → Contact | perusahaannya |
| **Office** `/office` | Office (accordion 9 layanan) | apa yang dikerjakan |
| **Meeting** `/meeting` | MeetingLead → CaseGrid → CaseStudySpotlight → Contact | studi kasus |
| **Function** `/function` | PeopleIntro → PeopleValues → TheCrew → Careers → Contact | orang & karir |

`Services.tsx` **dihapus** — isinya diserap jadi accordion 9-item di `Office.tsx`, supaya tidak ada dua sumber layanan yang tumpang tindih. `FeaturedProjects` juga dibuang karena menduplikasi `CaseGrid` di Meeting.

### `RoomRouteSync` — tiga arah, bukan satu

Berkas ini menyinkronkan URL ↔ `currentRoom`, dan ketiga arahnya menjawab hal berbeda. Ia duduk di DOM (bukan di dalam `<Canvas>`) karena butuh konteks React Router yang tidak tersedia di sana.

| arah | pemicu | kerjanya |
|---|---|---|
| 1 | `pathname` berubah | Back/forward & deep-link → `goTo(room)` |
| 2 | `currentRoom` berubah | Klik waypoint 3D → `navigate()` supaya address bar menyusul |
| 3 | `hash` berubah | `#contact` → `scrollIntoView` setelah satu `rAF` |

**Dua guard di Arah 1 yang keduanya wajib** — ini hasil resolusi konflik yang digabung, bukan dipilih salah satu:

- `!hash` (dari Nico) — jangan lompat ke atas kalau URL membawa anchor; Arah 3 yang mengurus scroll-nya. Tanpa ini pengunjung melihat halaman tersentak ke atas sebelum meluncur ke tujuan.
- `key === currentRoom` (dari branch ini) — jangan jalankan efek samping saat URL cuma **menyusul** kamera yang sudah bergerak.

Guard kedua itu bukan optimasi. Klik waypoint memicu rantai: `goTo()` → Arah 2 `navigate()` → `pathname` berubah → Arah 1 menyala lagi — semuanya **selagi tween kamera 1400 ms berjalan**. Panggilan `goTo()`-nya sendiri tertahan `if (animating.current) return` di `CameraController`, tapi `window.scrollTo` di sebelahnya **tidak ikut tertahan**: ia memaksa layout + repaint sementara `useFrame` menggerakkan kamera 60×/detik. Gejalanya perpindahan ruangan terasa **tersendat**, dan penyebabnya tidak menunjuk ke sini sama sekali (`060cf5f`).

> ⚠️ Jangan "menyederhanakan" dengan memindahkan `scrollTo` ke dalam guard `animating` di `CameraController` — guard itu juga tidak bisa membedakan "URL menyusul kamera" dari "pengguna menekan Back", dan ini urusan DOM yang memang wilayahnya di `RoomRouteSync`.

### 🐛 Query string terbuang saat pindah ruangan (`9384d69`)

Arah 2 dulu menavigasi ke `pathFor(currentRoom)` **telanjang**. `pathFor()` cuma tahu soal ruangan, jadi menavigasi ke hasilnya apa adanya **menulis ulang seluruh URL** — dan `location.search` terbuang pada perpindahan ruangan pertama.

Ketahuan lewat overlay dev ber-query yang menyala di Lounge lalu lenyap tepat saat ganti ruangan. Gejalanya menyesatkan: tampak seperti overlay-nya yang rusak. Dampak sebenarnya jauh lebih luas dari alat dev — **`?utm_source=` dari tautan kampanye ikut hilang diam-diam**, jadi kunjungan yang berpindah ruangan kehilangan atribusinya.

Perbaikannya `navigate(target + search + hash)`. Tapi perbandingannya **tetap `target !== pathname`** — murni path, tanpa search. Kalau search ikut dibandingkan, efeknya menyala tiap query berubah lalu menavigasi ke URL yang isinya persis sama: riwayat browser terisi entri kembar, dan Arah 1 ikut menyala di tengah tween kamera.

Penjaganya `roomRouteSearch.test.tsx`, dibuktikan **merah** dulu (dapat `/meeting`, search & hash dua-duanya hilang). Pakai render sungguhan + `MemoryRouter`, beda dari `RoomRouteSync.test.tsx` yang membaca teks sumber: yang dijaga di sini murni urusan routing, tidak butuh WebGL.

### "Talk to us" tidak lagi melempar ke Lounge (`7c8408f`)

Perilaku lama: dari ruangan mana pun selain Lounge, tombolnya `navigate("/#contact")`. Alasannya sempat benar — "`#contact` cuma ada di Lounge" — lalu jadi basi begitu Meeting & Function ikut memuat `<Contact />`, **tanpa ada yang berubah di Navbar**.

Sekarang ia menggulir **di tempat** kalau ruangannya punya Contact. Hanya dari Office — satu-satunya yang memang tidak punya — ia pindah ke Lounge. Memindahkan pengunjung hanya karena ia menekan tombol kontak itu mengagetkan; ia kehilangan tempatnya tanpa meminta.

Keputusannya diturunkan dari `ROOM_CONTENT` lewat `roomHasContact()`, **bukan daftar nama ruangan yang ditulis ulang di Navbar**: begitu Office diberi `<Contact />`, tombolnya ikut benar sendiri tanpa ada yang perlu ingat menyunting Navbar. Penelusurannya menyusuri pohon React element, jadi `<Contact />` boleh terbungkus elemen lain nanti.

> Norma test yang dipakai di sini: penelusuran pohonnya **ditulis ulang secara independen di test**, bukan mengimpor helper yang sama — mengimpornya cuma membuktikan fungsi itu setuju dengan dirinya sendiri.

### 🐛 Layar putih permanen di reduced-motion (tertangkap saat merge `455eae7`)

`Hero.tsx` di `join` mengembalikan cabang `if (reduced) return <StaticHero/>` — fitur comfort yang hilang di PR #4, dan itu bagus. Tapi pemantik `setSceneReady` ditaruh **sesudah** early return itu, jadi di jalur reduced ia tidak pernah dieksekusi.

Akibatnya persis yang `INVARIANTS.md` §3 dokumentasikan: `<Scene/>` tidak di-mount → `sceneReady` selamanya false → `LoadingScreen` menutupi situs **selamanya** bagi siapa pun yang menyalakan "Reduce motion" di OS-nya. Jaring pengaman 1500 ms tidak menolong; ia sendiri digerbangi `sceneReady`.

Seluruh **62 test di `join` HIJAU**. Yang menangkap cuma eslint, dengan pesan yang tidak menyebut loader sama sekali: *"React Hook called conditionally"*.

### Rasio lepas pin harus SAMA di semua ukuran

Konflik terbesar merge ini: Nico merombak `Hero.tsx` jadi *pinned scroll* (`h-[180dvh]` + `sticky h-dvh`), sementara branch ini memendekkan hero jadi `h-[70dvh]` di HP (§4p). Dua jawaban untuk masalah yang sama. **Digabung.**

Nico menemukan canvas *recede* harus selesai saat sticky **lepas pin**, bukan saat track habis — yaitu di `(track − sticky) / track`, bukan progress 1,0 — lalu menyetel rentangnya ke `[0.28, 0.44]`: 180/100 → 0,444.

Tapi tinggi sticky mobile berbeda (70dvh), dan dengan track 150dvh rasionya jadi 0,533. **Satu rentang tidak bisa benar untuk dua rasio** — di HP canvas habis memudar ~13dvh *sebelum* lepas pin, menyisakan area kosong yang masih terpaku di layar.

Track mobile diubah **150 → 126dvh**:

```
desktop  (180dvh track, 100dvh sticky) → (180−100)/180 = 0,444
mobile   (126dvh track,  70dvh sticky) → (126− 70)/126 = 0,444  ✓ sama
```

Rumus pasangannya dicatat di komentar `Hero.tsx`: **`track = sticky / (1 − 0,444)`**. Kalau tinggi sticky diubah lagi, tracknya wajib ikut — bukan disetel dengan mata.

---

## 4r. Empat Perbaikan Performa ✅ (3 Agu)

Semuanya berangkat dari **keluhan nyata** ("berat", "laptop panas"), bukan tebakan — dan tiga dari empat menemukan penyebab yang berbeda dari dugaan awal.

Empat perbaikannya: **4r-1** (MSAA), **4r-3** (matter-js), **4r-4** (mount semua ruangan), **4r-5** (chunk billiard). **4r-2** disisipkan di antaranya karena ia bukan perbaikan melainkan *keputusan* — dan justru keputusan itu yang paling mudah dibatalkan orang berikutnya tanpa sadar.

### 4r-1. 🔥 MSAA dimatikan — 30 → 60 FPS (`b55a0ab`)

`<EffectComposer>` ditulis **tanpa props**, jadi kena default library `multisampling: 8` (diverifikasi di `node_modules`). Setelan termahal di seluruh berkas itu, dan sebelumnya tidak disebut di komentar mana pun.

Terukur di M2, **dpr 2** (2,63 Mpx, mendekati layar Retina):

| multisampling | p50 | FPS |
|---|---|---|
| 8 (default library) | 33,3 ms | 30 |
| 4 | 33,3 ms | 30 ← **tidak menolong sama sekali** |
| **0** (dipakai sekarang) | **16,7 ms** | **60** ✅ |

**Bahwa 4 sama mahalnya dengan 8 berarti pilihannya BINER.** Jangan pernah "kompromi" ke 4: bayar penuh, tidak dapat apa-apa.

> ⚠️ **Di dpr 1 ketiganya sama-sama 16,7 ms** karena mentok vsync. Mengukur di jendela kecil akan menyimpulkan "tidak ada bedanya" — **salah total**. Ongkos N8AO + Bloom + MSAA itu **per piksel**; piksel naik 2,25× → frame time naik tepat 2×.

Ini juga yang menjelaskan keluhan **"berat di desktop, lancar di HP"** yang selama ini terdengar terbalik: HP merender jauh lebih sedikit piksel **dan** melewatkan waypoint + billiard (§6).

**`antialias: true` di `gl` ikut dimatikan**, dan ini terukur terpisah: mengubahnya `true → false` **tidak mengubah frame time sama sekali**. Flag itu berlaku pada *default framebuffer*, sedangkan `EffectComposer` merender ke buffer offscreen sendiri dan melewatinya — MSAA dialokasikan 2×, satu menganggur. Konsekuensinya: **menyalakannya lagi TIDAK akan mengembalikan tepi yang mulus.**

### 4r-2. Aliasing itu pilihan estetik, bukan utang teknis (`c292bef`)

Ongkos tampilannya **terlihat** dan diterima sadar setelah Keano melihat perbandingan berdampingan: **18,84% piksel berubah**, tepi plafon diagonal & pilar jadi bertangga, cincin lampu gantung pecah jadi putus-putus.

Komentar awalnya menyisakan SMAA sebagai "jalan kalau mau tepi mulus lagi" — seolah ini kompromi yang ditelan demi FPS dan menunggu diperbaiki. **Keano menyatakan sebaliknya: ia LEBIH SUKA tepi yang sedikit bergigi.** Sejalan juga dengan arah look PS1/basement.studio yang justru bersandar pada `NearestFilter` + piksel tegas — anti-aliasing yang terlalu halus melawan arah itu.

> 🚫 **Jangan menawarkan SMAA/FXAA/MSAA sebagai "perbaikan".** Laporan "tepinya kasar" nanti = konsekuensi yang sudah ditimbang, bukan bug. Dibiarkan seperti semula, orang berikutnya akan membaca komentar itu sebagai undangan membetulkan sesuatu yang memang disengaja.

### 4r-3. 🔥 Engine matter-js berdetak selamanya — biang "laptop panas" (`6912e8b`)

`Runner.run()` dipanggil langsung saat mount dan **tidak pernah berhenti** sampai unmount.

Yang membuatnya lolos dari mata: ada flag `physicsActive`, tapi ia cuma menggerbangi **penulisan transform** di `afterUpdate`. Simulasinya sendiri tetap mengintegrasikan posisi 3 dinding + N badan kata ~60×/detik walau kursor tak pernah menyentuh judulnya. Dan `<PhysicsHeading>` dipakai **2×** di `Deployments.tsx`, jadi **dua engine** berjalan bersamaan sepanjang Lounge terbuka.

Ini beban **CPU, bukan GPU** — itulah kenapa gejalanya kipas menyala & laptop panas, bukan sekadar FPS turun, dan kenapa di HP tidak terasa.

Sekarang engine baru berjalan saat hover dan berhenti lagi saat kursor pergi. Perjalanan pulangnya murni CSS transition (badan sudah diteleport ke rumah, `physicsActive` sudah false), jadi engine boleh berhenti **sekarang** tanpa menunggu transisi 0,6 s selesai.

> 💡 **Pelajaran yang bisa dipakai lagi:** flag yang menggerbangi **efek** animasi belum tentu menggerbangi **mesin**-nya. Pertanyaannya *"apa yang menghentikannya?"*, bukan *"apa yang menyembunyikannya?"*.

Sudah disisir juga dan hasilnya bersih: `CsiParticleField` digerbangi `active` (`useInView`), `NetworkField` punya `IntersectionObserver` sendiri, `WaypointLabel` rAF-nya wajar. `PhysicsHeading` satu-satunya yang bocor.

### 4r-4. Pola "mount semua ruangan" dicabut (`7c8408f`)

Dipasang di `ff4a488` untuk menghindari remount konteks WebGL tiap ganti ruangan. Alasannya **sah saat itu**: keempat ruangan masih placeholder satu paragraf, jadi menahan semuanya di DOM praktis gratis. Beberapa jam kemudian Office/Meeting/Function diisi konten penuh, dan asumsinya runtuh.

1. **Berat sepanjang waktu.** `display: none` menghentikan render & layout, tapi **TIDAK menghentikan hook**. `useScroll` tetap terpasang di window dan `useInView` tetap punya `IntersectionObserver` hidup. Dengan empat ruangan berisi, observer & listener scroll berlipat — semuanya ikut dievaluasi tiap frame scroll, termasuk milik ruangan yang tak terlihat.
2. **`id` GANDA.** `<Contact />` kini ada di Lounge, Meeting, **dan** Function, jadi `id="contact"` muncul 3× sekaligus. `getElementById` mengembalikan yang **pertama** — bisa milik ruangan tersembunyi, dan scroll ke elemen `display: none` tidak ke mana-mana. HTML memang melarang id ganda; pola itu melanggarnya **secara struktural**, bukan karena kelalaian.

**Ongkos remount WebGL dibayar SEKALI per perpindahan; ongkos observer berlipat dibayar SETIAP frame scroll, selamanya.** Yang kedua jauh lebih mahal.

> ⚠️ Kalau remount WebGL terasa mengganggu lagi, jalan keluarnya **bukan** mengembalikan pola ini — melainkan memindahkan Canvas-nya ke tempat yang tidak ikut berganti (seperti `SiteLayout`, yang sudah dilakukan untuk Hero), atau membuatnya menahan konteks GL antar-mount.

Koreksi angka yang ikut dibetulkan: komentar lama menyebut **tiga** konteks WebGL di-remount tiap ganti ruangan (`CsiParticleField`, `ManifestoField`, `DeploymentsField`). Diperiksa ulang — `DeploymentsField` **sudah tidak diimpor siapa pun**, dan dua sisanya cuma ada di section Lounge. Angka "tiga" itu ikut membesarkan ongkos yang dikira ada di sana.

### 4r-5. Chunk billiard ditunda + prefetch (`1d85a39`)

`<BilliardGame>` di-mount **tanpa syarat**, jadi setiap pengunjung membayar ~1 MB GLB (`billiard_balls` 887 KB + `cue` 94 KB) plus 16 mesh bola yang dirender tiap frame, tergeletak di lantai sebelah meja sepanjang tur. Di perangkat sentuh minigame **mati total** (§6), jadi di sana 1 MB itu murni sia-sia.

**Dua anggapan lama yang ternyata salah, dan keduanya ditulis di kode supaya tidak "dioptimalkan" orang berikutnya:**
- "World fisika hidup selama tur" — **salah**, `s.step()` sudah digerbangi `active` sejak awal.
- "`directionalLight` yang selalu ter-mount itu mahal" — **salah**, ia `layers.set(1)` sementara kamera tetap layer 0, dan three mengumpulkan lampu lewat `object.layers.test(camera.layers)`. Ia tak pernah masuk render state.

**Prefetch, bukan lazy polos.** Lazy polos memindahkan ongkos 1 MB ke detik paling buruk — tepat saat meja diklik, berbarengan tween kamera 1400 ms. Sekarang chunk-nya diunduh diam-diam saat pengunjung sampai di **Lounge** (tempat mejanya), dan baru di-mount saat `billiardActive`. Prefetch digerbangi `coarse` juga — penghematan terbesar dari seluruh perubahan ini.

Aturannya dipisah ke `prefetchRule.ts` sebagai **fungsi murni** `(ruangan, jenis pointer) → boolean` — sekalian membereskan `react-refresh/only-export-components`.

| | sebelum | sesudah |
|---|---|---|
| `Scene` chunk | 445,13 kB (gzip 166,44) | **352,32 kB** (gzip 138,50) |
| `BilliardGame` | — (ikut Scene) | chunk sendiri **93,34 kB** (gzip 28,22) |

### `ChunkBoundary` — repo punya 4 `lazy()` dan NOL error boundary

Ikut dibangun di commit yang sama, karena menunda pemuatan **menaikkan** risikonya.

`<Suspense>` menangani **sedang memuat**, bukan **gagal**. Import yang ditolak membuat `lazy()` melempar saat render, dan error render yang tak tertangkap meng-unmount **seluruh pohon** — halaman blank. Skenario nyatanya bukan jaringan putus, tapi **deploy saat ada tab terbuka**.

Dua aturan yang ditulis di kodenya:

- **Di dalam `<Canvas>` JANGAN beri fallback DOM.** R3F merekonsiliasi ke objek three; `<div>` di sana melempar error **baru** dari dalam penangkap error.
- **`Scene` WAJIB punya fallback yang memanggil `setSceneReady(true)`.** Sinyal itu datang dari `useFrame` di `Office.tsx` yang tak pernah jalan kalau chunk gagal, dan `LoadingScreen` menunggunya untuk memulai outro → **loader menggantung selamanya**. Jaring pengaman 1500 ms tidak menolong; ia baru dipasang setelah `sceneReady` true.

### 🔧 Alat ukur: `scripts/measure-frames.mjs` + `shoot.mjs`

Nol dependency, pakai Chrome yang sudah ada lewat **CDP**. Ini menjawab gagalnya `r3f-perf` — tidak perlu ada yang menyalin bacaan dari HUD.

```bash
node scripts/measure-frames.mjs http://localhost:3000/ 8 2   # url, detik, dpr
node scripts/shoot.mjs http://localhost:3000/ shot.png 2     # url, keluaran, dpr
```

Keduanya berpasangan: yang pertama mengukur **ongkos**, yang kedua merekam **hasilnya**. Keputusan yang menyentuh tampilan butuh dua-duanya — angka saja membuat orang menukar sesuatu yang tidak seharusnya ditukar (persis yang hampir terjadi di 4r-2).

> ⚠️ **WAJIB ukur di dpr 2.** Default `dpr 1` sudah mentok vsync, jadi semua setelan terlihat sama — kesimpulannya salah. Skripnya juga **mencetak renderer yang dipakai**: kalau tertulis SwiftShader/llvmpipe, itu rasterisasi CPU dan angkanya tidak mewakili laptop siapa pun.

---

## 5. Foto Referensi

| Folder | Isi |
|---|---|
| `Photo-reference-office/converted/` | Kumpulan foto referensi (dulu `Living-room-photo/`, di-rename 17 Jul). Lounge/smoking per objek (IMG_6109–6142): panel meteran 6138/6139, vas palem 6141, plant stand + anggrek 6142, dinding kaca 6160, kursi frame besi smoking 6163–6165, wall art 6167. Office: **IMG_6176_2** (convert 17 Jul); **IMG_6179–6184** (convert 18 Jul) — IMG_6179 = referensi meja kantor detail `ODesk_*` (oak top + pedestal laci + kaki loop besi); **IMG_6220–6227** (convert 20–21 Jul); **IMG_6240–6242** (convert 21 Jul); **IMG_6247–6250** (convert 22 Jul) = referensi pantry cabinet/kabinet dapur; **IMG_6252** (convert 22 Jul); **IMG_6254** = cabinet TV meeting room (23 Jul) |
| `Front-desk-Photo/` | 4 foto produk front desk (IMG_6155–6158) |
| `reference/` | Referensi lain + `SCAN-CHECKLIST.md`, `ROADMAP.md` |

## 6. Rencana Berikutnya (urutan)

1. ~~Bantalan kursi frame besi~~ ✅ selesai 14 Jul (+ loveseat di-rebuild konstruksi sama)
2. ~~Bake `M_SM_Rug_Grey`~~ ✅ selesai — sudah image texture, 0 material prosedural tersisa
3. ~~Scan + import Office Area + blockout kerangka~~ ✅ 17 Jul (dinding/pintu utara/pilar/tangga)
4. ~~Dinding kaca lounge ↔ office~~ ✅ 17 Jul (`GWO_*` kaca + pintu ganda)
5. ~~Furniture office awal~~ ✅ 17 Jul (desk island, meja, kabinet, whiteboard beroda) — lanjut kursi & aksesori
6. ~~Interior office: desk pod, elektronik (iMac/Magic KB/Mouse), lunch table+stool, bar stool, rak, tanaman, socket, partisi kaca `GWL_*`~~ ✅ 20–21 Jul + collection dirapikan
7. **Interior Office Area (finishing)** — 11 kursi kantor + bar counter + dispenser Brio + rak & meja tambahan ✅ ditempatkan; **cleanup asset import mentah ✅ SELESAI (2551→1189 objek)**; **pantry cabinet L + printer + shredder + wardrobe + microwave + bar table ✅ jadi (22 Jul)**; **pencahayaan office ✅ (track lighting + lunch pendant, 22 Jul)**; **collection dirapikan ✅ (0 loose, Brio di-flatten)**; **LED strip lantai ✅ + cubby join/oak + pintu oak (24 Jul)**. Sisa: isi pantry, verifikasi vs foto
7b. **Meeting Room** (§3c) — meja + TV 98" + cabinet + Rally Camera + Apple devices ✅ (23 Jul); kursi ×9 + mic pod ×4 + snake plant + pintu dibuka ✅ (24 Jul); **ceiling z2.94 + 6 downlight + frost UV + grouping `OP_MeetingRoom` ✅ (24 Jul)**. Sisa: kerangka dinding, deco kecil, rename AirVent
7c. **Optimasi poly + texture untuk web** (§4c) ✅ SELESAI 27 Jul — geometry −24.5% (760.871 tris), texture −61% (52.9 MP), curve convert, relink duplikat. Backup `*_ORIG` tinggal hapus saat final
7d. **Pre-export audit + MVP1 export** (§4d, §4e) ✅ SELESAI 27 Jul — 0 blocker
7e. **Merge objek** (§4f) ✅ SELESAI 27 Jul — draw call 2.522 → **401**
7f. **Bake lightmap** (§4g) ✅ SELESAI 27 Jul — 39 lampu realtime → **0**
8. ~~Export GLB seluruh scene~~ ✅ **MVP1 SELESAI 27 Jul — 8,0 MB, 50-60 FPS.** Pecah GLB per ruangan belum perlu
9. ~~**Karakter PS1** (§6b)~~ ✅ **SELESAI** — 28 Jul 4 karakter di Blender, **29 Jul jadi 5 karakter + di-export + tampil beranimasi di web**. Rencana vertex-color diubah jadi texture 256px `Closest`
10. **Integrasi ke web** (§4h) — 🚧 sebagian besar SELESAI 27–29 Jul: GLB jadi hero fullscreen, navigasi 5 ruangan + hash routing, navbar dropdown + scrollspy, `heroInView` gating, `MODEL_URL` dibetulkan, **karakter + CharacterLights**. **Sisa:** post-processing PS1, loader saat mengunduh
10b. **Migrasi Next.js → Vite** ✅ **SELESAI 29 Jul** (§4j, rekan tim) — SPA client-only, dev server 276 ms
11. ~~Minigame billiard~~ ✅ **DIBANGUN 28 Jul, engine diganti cannon-es 29 Jul** (§6d) — fisika terverifikasi lewat simulasi headless. ⏸️ Belum di-review di browser; bug bola di (0,0,0) dibetulkan 30 Jul
11b. **Konten V1 → V2 + animasi teks** ✅ **SELESAI 29 Jul** (§4i, rekan tim) — 9 section + 4 komponen `motion`
11c. **Navigasi waypoint 3D** ✅ **SELESAI 29–30 Jul** (§4k) — RoomNav + scroll/swipe/keyboard dicabut; 3 waypoint ternyata mustahil terlihat sejak ditulis
11d. **Lighting dirombak** ✅ **SELESAI 30 Jul** (§4l) — lightmap dinyalakan, N8AO + contact shadow, bloom 1,6→0,4, ambient 0,12→0,03. Light cone dibangun lalu dihapus
11e. **Sapuan "kantor terbentuk"** ✅ **SELESAI 30 Jul** (§4m) — dither Bayer 2,6 s, 60 FPS terverifikasi
11f. **Konten layar monitor** ✅ **SELESAI 30 Jul** (§6c) — Spotify pixel-art di monitor AOC
11g. **Loading screen isometrik (loader saat mengunduh)** ✅ **SELESAI 31 Jul** (§4n) — di-render di Web Worker, menjawab permintaan awal user
11h. **Semua pekerjaan 30 Jul di-merge ke `main`** ✅ **SELESAI 31 Jul** (§4o) — sekaligus perbaikan bug merge `frameloop="demand"` + `INVARIANTS.md`
11i. **Perangkat sentuh: scene jadi pemandangan** ✅ **SELESAI 3 Agu** (§4p) — waypoint & billiard mati di `pointer: coarse`, hero 70dvh di HP
11j. **Routing & konten per-ruangan** ✅ **SELESAI 3 Agu** (§4q, merge `join`) — 4 halaman (`/`, `/office`, `/meeting`, `/function`), Hero pindah ke `SiteLayout` supaya Canvas tidak remount, `Services` diserap ke Office. Blocker §6 (HP terkunci di Lounge) **terbuka** lewat room links navbar
11k. **Empat perbaikan performa** ✅ **SELESAI 3 Agu** (§4r) — MSAA dimatikan (**30 → 60 FPS**), engine matter-js dihentikan, mount-semua-ruangan dicabut, chunk billiard ditunda. Alat ukur CDP ikut disimpan
12. **⬅️ BERIKUTNYA, urut prioritas:**
    - **a. Bug billiard** (§6d): bola yang masuk lubang harus dibekukan jadi `fixed`
    - **b. Review billiard di browser** (§6d): posisi stik, apakah bola terlihat resin (bukan besi), framing kamera, timing fade lampu. Sekalian ukur FPS saat fisika jalan — sekarang lebih mudah karena chunk-nya sudah terpisah (§4r-5)
    - **c. Uji anti-beku loader di browser sungguhan** (§4n) — DevTools Performance saat kompilasi 233 shader; inti keputusan Web Worker, baru bisa dibuktikan mata
    - **d. Beresi blocker layar** (§6c) — pisah material MacBook, unwrap ulang UV iMac & SMK_TV
    - **e. Post-processing PS1** (§4b) — pass terakhir untuk look basement.studio
    - ~~**Verifikasi waypoint Lounge & Function**~~ ✅ **SELESAI 3 Agu** (§4k) — semua waypoint terukur & terlihat
    - ~~**Sepakati satu lockfile**~~ ✅ **SELESAI 29 Jul — bun** (§7)
13. Dekorasi tambahan (tanaman via Sketchfab kalau integrasi di-enable)

### Polish opsional (tidak mendesak, MVP1 sudah jalan)
- Hapus backup mesh `*_ORIG` (5 objek) saat semua final
- Rename `AirVent_01..04` → `MR_AirVent_*`
- 4 spot track light lain yang masih tanpa lensa (kalau ketemu saat review)
- Post-processing PS1 (§4b) — lapisan opsional di viewer
- **Perbaiki stall kompilasi shader 2,3 s** (§4m) — kandidat: `KHR_parallel_shader_compile` / `compileAsync`
- **Bangun ulang light cone volumetrik** (§4l) kalau look-nya masih diinginkan — pakai setengah cangkang 180° + kerucut dalam, jangan ulangi dua kesalahan yang sudah dicatat

## 6b. Karakter (fase C3) ✅ SELESAI — 5 KARAKTER TAMPIL & BERANIMASI DI WEB (29 Jul)

Karakter low-poly gaya **PS1** untuk mengisi tour.

### Status: 5 karakter, sudah masuk `office.glb` dan jalan di browser

| Karakter | Posisi | Action | Tris | Material |
|---|---|---|---|---|
| **CH_Leonard** | duduk sofa lounge (−1.42, 4.39), hadap +X | `SittingIdle` (1 frame, statis) | 2.346 | `M_Character_Tex` |
| **CH_Person2** | mengetik di `OChair_Office_8` (−5.19, −4.00), hadap −X | `Typing_Loop` (96 frame) | 2.346 (mesh **dibagi**, 0 tris tambahan) | `M_Character_Tex` |
| **CH_Person3** | (−10.23, −4.47), rot Z 264.8° | `Typing_Loop_P3` (96 frame) | 3.102 (827 = rambut mesh sendiri) | + `6_characters.001` |
| **CH_Person4** | `MR_Chair_09` meeting room (−15.95, −0.39), hadap −X ke TV | `Person4_Static92` (pose beku) | 3.102 | + `M_Person4_Sweater` (hitam), `M_Person4_Hair` |
| **CH_Person5** | function room (−1.68, 8.95) | `P5_SittingIdle_Baked` (loop) | 2.346 | `M_Character_Tex` |

Masing-masing di collection sendiri. Tinggi 170 cm, rig Mixamo 65 bone prefix `mixamorig9:`. Di GLB: **5 skin, 5 klip animasi**, node per karakter dipecah jadi `_Body/_Collar/_Pants/_Shoes/_Sweater` + `_Rig`.

### ✅ Export & integrasi web (29 Jul, commit `05c5a66`)

`office.glb` sebelumnya **tidak memuat satu pun objek `CH_*`** — kelima karakter cuma ada di Blender dan tidak pernah tampil di web. Sekarang sudah di-export ulang berikut animasinya.

**Ukuran justru TURUN meski isinya bertambah: 9,04 → 8,09 MB.** Percobaan pertama membengkak jadi **78 MB** karena setelan export tidak disamakan — begitu WebP + Draco dipakai seperti export sebelumnya, ukurannya kembali normal. Pelajarannya: setelan kompresi jangan pernah diasumsikan terbawa, selalu set eksplisit tiap export (§4g).

Tiga hal di sisi React (`Office.tsx`):

1. **Satu mixer cukup untuk kelima karakter.** `useAnimations(animations, scene)` — kelima klip menarget bone rig masing-masing tanpa tumpang tindih, jadi tidak perlu mixer terpisah.
2. **Dua klip berdurasi 0,03 detik itu POSE STATIS, bukan animasi.** `SittingIdle` & `Person4_Static92` = 1 frame dari Blender. Di-loop pun tak ada yang bergerak, jadi dimainkan sekali lalu `paused = true` supaya mixer tidak menghitungnya tiap frame selamanya. Tiga klip lain di-loop dengan **offset acak** (`action.time = Math.random() * duration`) supaya idle-nya tidak serempak seperti robot.
3. **`frustumCulled = false` wajib untuk SkinnedMesh.** Bounding box-nya dihitung dari **bind pose** dan tidak ikut diperbarui saat tulang bergerak — pose duduk membuat karakter **berkedip hilang** di sudut pandang tertentu. Ini bug yang gejalanya mudah disalahartikan sebagai masalah loading.

### `CharacterLights.tsx` ✅ sudah diisi

Sebelumnya `return null`. Sekarang: **key light hangat** (`#ffe9d0`, intensity 2.2, dari [3,6,4]) + **fill dingin** (`#cfe0ff`, 0.7, dari [−4,3,−3]), keduanya di **layer 1** (`CHAR_LAYER`).

Kenapa harus ber-layer: scene punya **0 lampu realtime** (semua baked, §4g) — itu yang bikin 50-60 FPS. Karakter tidak bisa ikut di-bake karena bergerak, tapi menyalakan lampu scene lagi berarti balik ke 14 FPS. Lampu di layer 1 **dilewati saat merender ~300 objek statis**, jadi biayanya nyaris nol. Sisi karakter di-opt-in dari `Office.tsx`.

**Duplikasi cara basement:** `n.data = o.data` — mesh data DIBAGI antar karakter (`users` 2–4), armature data di-copy (pose harus independen). Person2 menambah **0 tris**. Person3/4 punya rambut & sweater sendiri karena beda material.

### Texture, bukan vertex color — rencana awal DIUBAH

Rencana 27 Jul "vertex color, nol texture ala basement" **dicoba dan gagal 2×**:
- **Vertex color** → wajah bercak acak (kulit kepala hitam Mixamo + highlight tercampur), lalu pita hitam melintang di MATA (ambang garis rambut z=1.638 kena mata di z 1.64–1.66)
- **Cap rambut solid** → batas selalu bergerigi seperti gigi gergaji; face dahi ~2 cm terlalu besar untuk dipotong rapi

**Yang benar: pertahankan texture, resize saja.** 4K → **256×256** + `interpolation='Closest'` → piksel kotak-kotak justru **menguatkan** look PS1. Rambut, mata, alis, bibir tetap ada dengan batas mulus. Nol kerja tambahan.

**Metallic 0.5 bawaan Mixamo = biang glossy.** Import FBX Mixamo memberi Metallic 0.5 + normal map 4K → kulit & kain memantul seperti plastik basah, DAN membuat faset low-poly menonjol tajam. Fix: Metallic 0, Roughness 0.9, Specular 0.2, lepas link normal/roughness/specular map. Keluhan "polygon keliatan banget" dan "glossy" itu **satu penyakit**.

### Animasi: yang boros itu FRAME, bukan bone

Animasi Mixamo mentah **20× lebih besar dari mesh-nya sendiri** (1005 KB vs mesh ~50 KB). Buang bone diam saja cuma hemat 23%.

**Pangkas frame** — cari titik loop mulus dengan merekam quaternion 8 bone acuan tiap frame, lalu cari pasangan (start, start+90..180) dengan selisih pose terkecil. Hasil: frame **130–225** (96 frame, 3,2 dtk), selisih sambungan 0.185 (<0.5 mulus, >1.0 kentara meloncat).

**Buang 40 bone jari** (Thumb/Index/Middle/Ring/Pinky) → reset ke rest, tangan tetap bentuk wajar. Jari paling aktif di data tapi paling tak terlihat dari kamera tur. Hasil: 520 → **103 fcurve**, 65 → 25 bone teranimasi.

**Total: 1005 KB → 39 KB (−96%).**

**Performa runtime animasi hampir nol** — skinning 65 bone dihitung di GPU. Yang membebani FPS adalah draw call (§4f), bukan animasi. Yang perlu diurus hanya ukuran file.

### Gotcha yang mahal

- **`animation_data_clear()` MEMUTUS binding slot di Blender 5.** Action bisa di-assign dan terlihat benar di UI, tapi kurvanya **tidak pernah dievaluasi** (pose bone tetap identity). Gejala: tinggi bbox = T-pose berdiri padahal action duduk sudah terpasang. Jangan "perbaiki" dengan menyalin pose lalu `keyframe_insert` — itu MENIMPA kurva, hasilnya action bernama benar tapi isinya pose dari sumber salah (kasus nyata: Person4 bernama `Typing_Loop_P4` tapi pose-nya Leonard, ketahuan user). **Cara benar:** duplikat rig sumber UTUH (`rig.copy()` + `data.copy()`) yang otomatis membawa `animation_data` sehat, lalu pindahkan mesh anak ke rig baru.
- **Verifikasi wajib:** bandingkan quaternion bone di beberapa frame terhadap rig SUMBER (harus 0.0) DAN terhadap rig lain (harus >0). **Nama action tidak membuktikan apa-apa.**
- **Pose bone hilang** kalau tidak dikunci jadi Action — begitu depsgraph re-evaluate, rig balik ke rest dan karakter muncul T-POSE BERDIRI di render.
- **Ukur arah hadap dari garis bahu** (LeftShoulder→RightShoulder, rotasi −90°), BUKAN hips→foot (kaki bisa menyilang). Kasus nyata: badan menghadap 152° bukan 180°.
- **Arah pandang bone Head = sumbu Z lokal, BUKAN Y** (Y = sepanjang tulang ke atas kubah kepala, memberi elevasi +70° yang menyesatkan). Person4 menatap TV: leher −8° + kepala −14° → meleset 1,33°.
- **Uji ketiga sumbu sebelum menebak.** Tangan Person4 tembus meja: X−10° cuma 56→13 vertex, **Z+10° langsung 56→2**.
- **Jangan tumpuk rotasi quaternion untuk "reset"** — reset benar: set `rotation_quaternion=(1,0,0,0)` lalu `frame_set` bolak-balik.
- **Skala scene tidak konsisten** — jangan pakai pintu sebagai acuan (2,45 m = 1,2× nyata); **acuan yang benar = perabot** (sofa 0,78 m, kursi meeting 1,16 m ≈ 1,0×).
- **Body Mixamo TIDAK utuh** — sudah dipotong; `Ch31_Body` 18.340 tris isinya cuma 7 loose part (kepala+leher, 2 tangan, 2 lengan bawah, 2 mata kaki), nol vertex di z 0.2–1.3. Jangan bikin logika "hapus face tertutup baju".
- **Hair cards: hapus saja** — `Ch31_Hair` 10.860 tris / 1.100 loose part @ ~10 tris. Decimate meruntuhkannya jadi serpihan.
- **Variabel Python tidak bertahan antar panggilan `execute_blender_code`** — rekam + tulis harus dalam SATU blok.

### ⚠️ Sketchfab BUKAN untuk karakter yang perlu animasi Mixamo

Dicoba 28 Jul, gagal, dibatalkan. Model "Low poly ordinary man" (3.296 tris) bagus visualnya, tapi **nama bone-nya beda total** (`Pelvis_02`, `Torso_03` vs `mixamorig9:Hips`). 4 percobaan retarget semuanya gagal — badan terpelintir, rebah, sampai jungkir balik. **Metrik bbox BUTA ARAH**; kalau harus menilai orientasi pakai metrik anatomis (`head.z − pelvis.z` harus positif).

**Aturan:** karakter butuh animasi Mixamo → ambil dari **Mixamo**. Sketchfab hanya untuk props/furnitur statis. Kalau tetap mau model Sketchfab: upload FBX-nya ke Mixamo untuk auto-rig dulu.

### Keputusan awal (27 Jul) — konteks

- **⚠️ Ready Player Me MATI** (shutdown 31 Jan 2026, `*.readyplayer.me` = NXDOMAIN). Rencana "avatar dari foto staff" DIBATALKAN — di resolusi target wajah asli hilang jadi gumpalan; bonus tidak perlu consent staff.
- **Pengganti** kalau perlu: Avaturn (avaturn.me, tier gratis, GLB) atau Avatar SDK/MetaPerson.
- **Pilihan user:** sumber **Mixamo** (rig + animasi gratis, lalu decimate), gaya kasual realistis, animasi idle loop halus. Karakter pertama di **sofa lounge**.
- **Target teknis:** ≤2.500 tris & ≤150 KB per karakter.
- **Bukti dari repo basement** (`character-model-*.glb` dibedah): TOTAL 4.860 tris untuk SEMUA karakter, `images: []` (NOL texture, warna via `COLOR_0`), head cuma 484 tris, STRUKTUR MODULAR (1 body dipakai bersama, beda per orang cuma rambut & kacamata). Look PS1 = post-processing terpisah, bukan dari model.
- **Anchor dudukan (terverifikasi):** `SofaB_Seat_0` (sofa dinding kiri lounge, bantalan kiri). Permukaan duduk z=0.48, center (−1.41, 4.38), badan hadap +X.
- **Gotcha:** download Mixamo **FBX Binary (.fbx)**, BUKAN varian 2013/6100 (Blender 5 min. 7100). Mesin ini tidak punya converter FBX.

~~**NEXT:** export GLB + load ke Next.js, lalu isi `CharacterLights.tsx`~~ ✅ **SELESAI 29 Jul** — lihat sub-bab export & integrasi di atas.

## 6c. Video/Gambar di Layar 🚧 (diputuskan 28 Jul; monitor AOC ✅ jalan 30 Jul)

Pertanyaan berulang: "nambahin video di laptop & iMac itu di mana?" — **Jawaban: di THREE.JS, bukan Blender.** Blender cuma bisa bake tekstur DIAM. Untuk video berputar atau konten yang bisa diganti tanpa export ulang, pakai `THREE.VideoTexture` yang membaca frame dari elemen `<video>` HTML. Gambar statis pakai `TextureLoader` biasa.

**Syarat yang harus disiapkan di Blender SEBELUM export:** material layar terpisah dari casing, nama objek jelas untuk dicari di kode, UV layar kotak penuh 0–1.

| Layar | Material | Siap? |
|---|---|---|
| Monitor AOC `OMon_AOC_*` | `OMon_Screen` terpisah | ✅ SIAP |
| TV meeting `MR_TV_Screen` | `MR_TVScreen` terpisah | ✅ SIAP |
| TV smoking `SMK_TV_Screen` | `M_SM_TV_Screen` terpisah | ⚠️ **tidak punya UV** |
| iMac `OP_iMac_Screen.*` | `iMac_Screen` terpisah | ⚠️ UV cuma u[0.125, 0.875] — perlu unwrap ulang |
| MacBook `OMacbook_D*` | `ASSET_MAT_MR` dipakai SELURUH laptop | ⚠️ **perlu pisah material layar** |

**2 blocker:** material MacBook belum terpisah, UV iMac & SMK_TV belum benar.

Catatan: `OMacbook_D*` = **32.751 tris each** × 5 buah — kandidat decimate besar, jauh lebih berat dari karakter.

### ✅ Monitor AOC SUDAH TERISI (30 Jul) — blocker dilewati, bukan dibereskan

`src/components/canvas/screens.ts`. Layar pertama yang benar-benar berisi: **Spotify pixel-art di `OMon_AOC_2`**, `public/screens/spotify-home.png` (96×54, 7 KB). Blocker MacBook/iMac/SMK_TV **tidak disentuh** — monitor AOC memang satu-satunya yang sudah SIAP di tabel di atas, jadi dikerjakan yang bisa dulu.

`SCREENS` sengaja **daftar eksplisit**, bukan "semua yang materialnya `*_Screen`": hanya layar yang benar-benar terlihat dari salah satu `VIEWS` yang perlu diisi, sisanya buang memori texture percuma (dan +1 draw call masing-masing).

**`emissiveMap`, BUKAN `map`.** Material layar di GLB baseColor-nya ~0,01 (hitam) dan ambient scene cuma 0,03 — dipasang sebagai `map` saja, gambarnya praktis tak terlihat. Yang membuatnya "menyala" adalah `emissiveMap`, yang tidak bergantung cahaya sekitar sama sekali. `emissiveIntensity = 1.0`; jangan dinaikkan tanpa melihat hasilnya, karena ambang bloom 0,95 (§4l) berarti di atas itu layar **menyebar pendar** dan terbaca seperti lampu, bukan monitor.

### Pixelasi dilakukan OFFLINE, bukan di shader

Gambarnya memang **disimpan kecil** (96×54) lalu dibesarkan GPU dengan `NearestFilter`. Tidak ada shader, tidak ada canvas 2D per frame, tidak ada quantize UV — GPU sudah melakukan persis itu secara gratis saat mengambil sampel texture yang lebih kecil dari layarnya.

Konsekuensinya: **tingkat pixelasi ditentukan saat membuat aset, bukan di kode.** Untuk mengubahnya, buat ulang PNG-nya:

```bash
ffmpeg -i sumber.png -vf "crop=W:H:X:Y,scale=96:54:flags=neighbor" keluaran.png
```

`flags=neighbor` **WAJIB** — tanpa itu ffmpeg memakai bicubic yang merata-ratakan piksel tetangga, hasilnya blur kecil, bukan pixel-art. Crop **sebelum** scale supaya rasionya sudah benar dan gambarnya tidak melar.

### 🔑 Cara memilih resolusi aset untuk layar lain

Yang menentukan **bukan** seberapa enak gambarnya dilihat sendirian, melainkan **seberapa besar layar itu tampil di viewport**. Monitor AOC dari `VIEWS.Office` berjarak 2,49 m dan hanya mengisi ±278 × 181 piksel (1080p, dpr 1,5).

Artinya aset 192 px mendarat di **0,69 teksel per piksel layar** — nyaris 1:1, jadi GPU hampir tidak membesarkan apa pun dan blok pixelnya tidak pernah terbentuk. Itu sebabnya 192 terlihat "kurang pixel" meski di file-nya jelas pixel-art. Dibandingkan pada **ukuran tampil sesungguhnya**:

| Aset | Hasil |
|---|---|
| 192 | blok terlalu halus — terbaca sebagai gambar biasa yang agak kasar |
| **96** | ✅ **DIPAKAI** — blok jelas terbaca, tata letak Spotify masih dikenali |
| 64 | sudah jadi bidang warna, tidak lagi terbaca sebagai antarmuka |

**Untuk layar lain, ULANGI pengukurannya** — TV meeting yang jauh lebih besar di layar akan butuh angka lebih tinggi untuk kekasaran yang sama. Aturan praktisnya: bidik **±0,3 teksel per piksel tampil**, yaitu lebar-tampil ÷ 3.

### 4 jebakan yang semuanya kena

1. **Material WAJIB di-clone.** Keempat monitor (`OMon_AOC_0..3`) berbagi mesh **dan** material `OMon_Screen` yang sama persis — menempelkan texture langsung membuat **keempatnya** menampilkan gambar yang sama.
2. **`emissive` harus disetel putih.** `emissiveMap` dikalikan dengan warna `emissive`; dibiarkan hitam (bawaan), hasil perkaliannya nol dan gambarnya **tidak muncul sama sekali** — gejala yang mudah disalahartikan sebagai "texture-nya gagal dimuat".
3. **`texture.flipY = false` wajib, dan ini gampang terlewat.** glTF menaruh titik asal UV di kiri-atas, WebGL di kiri-bawah. `GLTFLoader` mendamaikannya dengan menyetel `flipY = false` pada setiap texture yang **IA** muat — tapi texture ini dimuat `TextureLoader` lewat `useTexture`, yang bawaannya `flipY = true`. Dibiarkan bawaan, gambarnya **terbalik atas-bawah** (verifikasi dari accessor: pos.y 0,407 → v=0; pos.y 0,108 → v=1).
4. **`flipX` per-node untuk monitor AOC.** Quad layarnya normal menghadap −Z dengan u=0 di sisi +X, jadi tanpa dibalik gambarnya tampil sebagai **bayangan cermin**. Ini sifat mesh-nya, bukan gambarnya — makanya jadi setelan per-node (`repeat.x = -1` + `offset.x = 1`, bukan menyiapkan dua versi file).

### ⚠️ Urutan dengan sapuan reveal — clone HARUS lebih dulu

`applyScreens()` dipanggil di dalam `useMemo` yang **sama** dengan fix-up material, bukan di `useEffect` terpisah. Alasannya: material hasil clone harus sudah ada saat `prepareRevealSweep()` mengumpulkan material untuk dipatch (§4m). Kalau dipasang belakangan, **layarnya tidak ikut tersapu** dan tampil utuh sejak frame pertama di tengah kantor yang belum terbentuk.

Sekalian: `toneMapped` sengaja **dibiarkan menyala** di sini — beda dari lampu & LED strip yang mematikannya. Lampu memang harus menembus ACES supaya berpendar; layar tidak. Dimatikan, warnanya melompat lebih terang dari seluruh scene dan monitornya terlihat seperti **ditempel**, bukan berada di dalam ruangan yang sama.

### 🔒 Screenshot sumber TIDAK di-commit

Sumbernya tangkapan layar akun Spotify pribadi — nama akun, playlist, riwayat dengar — dan repo ini publik. `.gitignore` memblokir `/Screenshot *.png`; yang di-commit **hanya hasil pixelasinya** di `public/screens/` (96×54, sudah tidak terbaca). Verifikasi log dev: `[office] layar terisi=1/1` — kalau kurang, nama node di `screens.ts` tidak cocok dengan yang ada di GLB, dan layarnya akan **diam hitam tanpa error apa pun**.

## 6d. Minigame Billiard ✅ DIBANGUN (28 Jul) — ⏸️ ditunda, belum di-review di browser

Sandbox: aim + power + tembak, bola masuk lubang hilang, auto re-rack, tombol reset. **Tanpa skor/giliran/aturan 8-ball.** Fisika **cannon-es 0.20** — dipakai LANGSUNG tanpa wrapper R3F (lihat di bawah kenapa pindah dari Rapier).

**Status:** logika & fisika sudah diverifikasi (simulasi headless + typecheck/lint/build bersih). **Yang belum: penilaian visual** — posisi stik, apakah bola terlihat resin (bukan besi), framing kamera, timing fade lampu. Karakter function room (syarat terakhir office 3D) sudah masuk, jadi **review browser ini masih jadi pekerjaan yang tertunda** (per 30 Jul belum dilakukan).

### 🐛 Bola & stik tergeletak di (0,0,0) sepanjang tur — dibetulkan 30 Jul

Commit `6ad97b2`. **Loop sinkronisasi mesh berhenti saat minigame tidak aktif**, jadi keenam belas bola tetap berada di titik asal objek — tergeletak di lantai sebelah meja — dan terlihat sebagai benda kecil misterius selama tur, meski minigame belum pernah dibuka.

Dua bagian perbaikannya:
1. **Rak disusun sekali di awal begitu mesh siap** (`active || meshes.some(Boolean)`), tidak menunggu pemain masuk mode main. Dan `reset()` menyinkronkan mesh ke posisi rak **saat itu juga**, tidak menyerahkannya ke loop yang sedang berhenti.
2. **Stik & garis bidik disembunyikan** kecuali minigame benar-benar dibuka — `aiming = active && phase === "aiming"`, bukan sekadar `phase === "aiming"`.

### 🐛 Traverse seluruh scene tiap frame — dibetulkan 31 Jul

Commit `f94ee51`. `BilliardLights` mendaftarkan bola ke layer 1 lewat `useFrame` + `scene.traverse()` **tanpa gerbang `active`** — artinya seluruh scene graph disapu **60×/detik sepanjang tur**, meski minigame biliar tak pernah dibuka. Penjaga `userData.dynLit` cuma melewati isi loop; traversalnya sendiri tetap berjalan penuh.

Sapuan itu juga sia-sia total: diperiksa dari header GLB, `office.glb` punya **656 node dan NOL** yang berawalan `Ball`/`Cone`. Jadi kunjungan node terbanyaknya murni ongkos tanpa hasil. **Fix:** traversal digerbangi `active`.

### ⚠️ PINDAH DARI RAPIER KE CANNON-ES (29 Jul) — alasannya rasa main, bukan performa

`@react-three/rapier` **sudah dicopot** dari `package.json`. Penyebabnya satu hal mendasar:

**Yang menentukan rasa permainan billiard adalah koefisien tiap PASANGAN benda** (bola↔bola, bola↔kain, bola↔bantalan) — masing-masing punya restitusi & friksi sendiri. cannon-es menyatakannya langsung lewat `ContactMaterial`. Rapier hanya menyimpan **satu nilai per collider** lalu menggabungkannya dengan aturan (Average/Min/Max).

Perbedaan itu berkali-kali menyesatkan: **kain tertulis restitusi 0,05 tapi yang berlaku 0,485** karena dirata-rata dengan nilai bola. Di cannon-es, angka yang tertulis = angka yang berlaku. Nilai koefisiennya mengikuti referensi `elijah-atkins/Billiards` yang sudah terbukti enak dimainkan.

Konsekuensi teknis dari pindah ini ada tiga, semuanya sudah ditangani — dan dua di antaranya membalik keputusan yang tertulis di sub-bab bawah:

### Tidak jadi modeling di Blender — aset Sketchfab siap pakai

| File | Isi | Skala |
|---|---|---|
| `billiard_balls.glb` (908 KB) | 16 mesh × 960 tris. `Ball1`..`Ball15` + **`Ball Clube` = bola putih** (terverifikasi dari tekstur putih polos 1 KB). Tiap bola punya material + tekstur nomor + normal map sendiri | ×0,0015055 → 57 mm |
| `billiard_cue.glb` (96 KB) | 1 mesh, 92 tris, memanjang +Z, tip di origin | ×0,02443 → 1,45 m |

Keduanya sudah disalin ke `public/3d/models/`. Material aslinya `metallic 0.4` — **diturunkan ke 0,02** saat load, kalau tidak bola terlihat seperti bola besi (scene punya `scene.environment` aktif).

### Peta file

```
src/components/canvas/billiard/
  table.ts            konstanta meja (SEMUA angka hasil ukur Blender)
  physics.ts          dunia cannon-es: ContactMaterial, step, pocket, rack
  Balls.tsx           16 bola (mesh; fisikanya dipegang physics.ts)
  Cue.tsx             stik
  lamps.ts            pemudaran lampu gantung
  BilliardGame.tsx    siklus permainan + salin fisika→mesh + lampu layer
src/components/ui/BilliardHUD.tsx   bar tenaga kiri + tombol (z-30)
```

**`TableColliders.tsx` sudah tidak ada** — konsekuensi #2 pindah engine. Tanpa wrapper R3F, collider tidak lagi dideklarasikan sebagai komponen JSX; semuanya dibangun imperatif di `physics.ts`. Harganya: posisi fisika harus **disalin manual ke mesh** tiap frame di `BilliardGame.tsx` (dulu `@react-three/rapier` yang mengurus).

Store menambah `billiardActive`/`billiardPhase`/`aimAngle`/`shotPower`/`tableRotated` + jembatan `registerBilliard`, `cueScreen` (posisi bola putih dalam piksel, untuk HUD), dan `goToView` (tween kamera bebas, dipakai juga untuk `up` & `fov`).

### Bidik dengan MEMUTAR, bukan menggeser (`BilliardHUD.tsx`)

Sudut bidik dihitung dari **sudut kursor terhadap bola putih di layar**, bukan geseran mendatar — supaya gerakan ke arah mana pun terbaca seperti memutar stik sungguhan. Yang dipakai **selisih sudut sejak jari menyentuh**, bukan sudut absolut, jadi stik tidak melompat ke posisi kursor saat pertama disentuh.

> ⚠️ **Nilai dibaca lewat ref, BUKAN closure.** Dengan `aimAngle` di dependency array, tiap perubahan sudut membongkar & memasang ulang semua listener — posisi jari sebelumnya ikut hilang, dan stik cuma bergeser sedikit lalu macet.

`cueScreen` diperbarui **hanya saat membidik dan hanya kalau bergeser >1 px**, karena setiap pembaruan memicu render React. ~~`RoomNav` disembunyikan saat main~~ — sejak 30 Jul yang disembunyikan adalah **waypoint 3D** (§4k) dan **bayangan kontak** (§4l), lewat `billiardActive` di store. Untuk waypoint alasannya bukan lagi tabrakan tata letak: geser-untuk-membidik bisa mengenai bidang waypoint dan pemain terlempar ke ruangan lain di tengah permainan.

### Bar tenaga — kurva kuadrat, bukan linear

`IMPULSE_MIN 0,05` → `IMPULSE_MAX 1,4` (referensi `elijah-atkins/Billiards`), dipetakan `min + (max−min) × p²`. **`IMPULSE_MIN` dulu 0,25 dan itu terlalu besar** — 18% dari MAX, artinya separuh bawah bar tenaga nyaris tak ada bedanya. Bola 0,17 kg → 8,2 m/s di tenaga penuh.

### Geometri meja — analitis, bukan dari mesh

Di `office.glb` meja sudah digabung jadi `MG_Lounge_M_PoolTable_Body`/`_Felt` demi menekan draw call, jadi bantalan & lubangnya bukan objek terpisah lagi. Semua collider dibangun dari angka ukur (Blender → three = `(x, z, −y)`):

- Felt (area main) **1,06 × 2,06 m**, permukaan z=0,807 → pusat bola y=**0,8355** (`BALL_R` 0,0285)
- Bibir rail (0,860) **2,45 cm di atas pusat bola** → bola memantul, tidak meloncat keluar
- 6 lubang r=0,075; sensor r=0,0607 (lebih kecil, supaya bola baru dihitung masuk kalau pusatnya sudah lewat bibir)
- Rack 5 baris, jarak antar bola 0,05814 (gap 2% — kalau bersentuhan persis, solver mendorongnya meledak)

### ⚠️ Tunneling — cannon-es TIDAK punya CCD, langkah kecil jadi satu-satunya penjaga

Ini konsekuensi #1 dari pindah engine. Rapier punya continuous collision detection; **cannon-es tidak**. Jadi yang mencegah bola menembus bantalan hanya ukuran langkah. Pada kecepatan maksimum 8,2 m/s (`IMPULSE_MAX` 1,4) vs bantalan setebal 80 mm:

| Langkah | Jarak tempuh/langkah | Hasil |
|---|---|---|
| 1/60 s | 137 mm | **TEMBUS** |
| 1/120 s | 69 mm | aman tipis |
| **1/180 s** | **46 mm** | **margin 43% — dipakai** |

`world.step(1/180, dt, 6)`. **Angka ini kritis, jangan dinaikkan tanpa hitung ulang.** `maxSubSteps 6` supaya frame yang tersendat (atau tab yang baru aktif lagi) dikejar bertahap, bukan satu lompatan besar.

Efek samping yang sama juga kena deteksi lubang: zona sensor lebarnya 122 mm sedangkan bola cepat menempuh 137 mm per frame. Uji **titik** akan melewatkannya begitu saja — itu sebabnya bola cepat kadang menembus lubang. Fix: uji **SEGMEN** dari `previousPosition` ke posisi sekarang (di-update cannon-es tiap langkah, tak perlu simpan riwayat sendiri).

Deteksi lubang juga pakai uji jarak mendatar, **bukan collider sensor** — cannon-es tidak punya sensor bawaan, dan uji jarak lebih dapat diprediksi karena tidak bergantung apakah dua collider kebetulan bertemu di langkah yang sama. Syarat tambahan: bola harus **sudah turun di bawah permukaan kain** (`y < FELT.y`), andal karena collider kain benar-benar berlubang di mulut lubang.

### ⚠️ Bola masuk lubang: DIHAPUS dari world (bukan dibekukan)

Bug yang paling mahal di fase ini. Bola yang masuk lubang **terjun bebas tanpa dasar** (tidak ada lantai di bawah lubang; y sampai −480 m), kecepatannya tidak pernah turun, jadi pengecekan "semua bola sudah diam" tidak pernah terpenuhi → **giliran menggantung selamanya**. Terbukti lewat simulasi headless: **21 dari 36 tembakan menggantung**.

**Solusinya berubah setelah pindah ke cannon-es.** Dulu bola dibekukan jadi `fixed`/STATIC. Pendekatan beku menyisakan **benda mati di dalam simulasi**: masih bisa ditumbuk bola lain, masih ikut broadphase, dan harus dilewati manual di setiap loop — sumber beberapa bug susulan. Sekarang body-nya **dihapus dari world** (`world.removeBody`), dan semua masalah itu hilang dengan sendirinya. Body-nya tetap hidup di array `balls`, tinggal dipasang lagi lewat `restoreBall` saat rack atau respot — kalau lupa, bola cuma diam mengambang dan tak bisa dipukul.

> **Pelajaran:** untuk fisika web, tulis simulasi headless Node yang meniru logika komponen. Jauh lebih cepat & meyakinkan daripada mencoba-coba di browser.

### Kamera: tegak lurus dari atas, dihitung dari bentuk layar

Pilihan user (revisi 28 Jul; awalnya sudut serong 26° karena terhalang lampu). Meja 1,30 × 2,47 m (rasio 1,90), jadi orientasinya menyesuaikan layar — meja tegak di layar 16:9 cuma mengisi **25% layar**:

| Layar | Orientasi | Kamera y | FOV | Layar terisi |
|---|---|---|---|---|
| desktop 16:9 | mendatar | 2,45 | 49° | 82% |
| tablet 4:3 | mendatar | 2,45 | 62° | 61% |
| HP 9:19.5 | tegak | 2,86 | 72° | 78% |

Diuji 9 bentuk layar (21:9 → 9:21): meja selalu muat penuh, kamera selalu ≥0,34 m di atas lampu, tidak menembus plafon.

### ⚠️ Kamera pernah masuk KE DALAM lampu → layar putih penuh

Gejalanya seluruh layar jadi bola putih raksasa. Penyebabnya **bukan** pemudaran lampu yang gagal, tapi **posisi kamera**: hitungan framing menghasilkan y=2,08 padahal lampu membentang sampai **y=2,11** — bohlam emissive (strength 12) cuma **13 cm dari lensa**, menutupi 60% layar, lalu bloom membakarnya jadi putih.

Fix: ketinggian dijepit **dua sisi** — `MIN_CAM_Y = 2,11 + 0,34` (di atas lampu) dan `CEILING_LIMIT = 3,45`. Karena jadi lebih jauh, **FOV dipersempit** (46–72°, ikut di-tween); efek sampingnya justru bagus — perspektif lebih rata, mirip biliar 2D. Urutan hitung: **ketinggian dulu (dibatasi benda fisik), FOV menyusul.**

> Kalau ada objek terang menutupi layar, **cek jarak kamera ke objek itu dulu** — jangan langsung menyalahkan material atau bloom.

### ⚠️ Pandangan lurus ke bawah wajib set `camera.up`

Arah pandang (0,−1,0) sejajar dengan up bawaan (0,1,0), dan `lookAt()` tidak bisa menentukan orientasi dari dua vektor sejajar → **meja berputar sendiri secara acak**. Tegak: `up=(0,0,−1)`; mendatar: `up=(1,0,0)`. `goToView` ikut men-tween up & fov; `goTo` biasa mengembalikan keduanya ke normal. Arah geser bidik juga **dibalik saat meja mendatar** — kalau tidak, geser kanan justru membidik ke kiri.

### Menyembunyikan lampu saat main (`lamps.ts`)

Dua hal yang bikin ini tidak sesederhana `visible = false`:

1. **Mesh kap lampu billiard DIGABUNG dengan lampu front desk** (`MG_Lounge_M_BilLight_Cage`, 3.300 tris) demi menekan draw call. Menyembunyikan objeknya ikut memadamkan lampu front desk. Solusi: pecah geometri jadi 2 group berdasarkan posisi. Terverifikasi: **1.980 segitiga billiard (z −2,45…−0,81) vs 1.320 lampu lain (z 4,23…5,57)**, total 3.300 tidak ada yang hilang; kedua kelompok terpisah 6,7 m jadi ambangnya aman.
2. **Material bohlam `M_BilLight_Bulb` DIPAKAI BERSAMA 8 lampu** di seluruh kantor (front desk, lunch table) — wajib di-clone dulu.

Pemilihan objek pakai **posisi dunia, bukan nama** (nama node bisa berubah saat export ulang). `transparent=true` diset permanen supaya tidak memicu kompilasi ulang shader saat transisi; objek emissive juga di-`visible=false` pada opacity ~0 karena bloom masih menangkap sisa pendarnya.

### KEPUTUSAN: lampu TIDAK dinaikkan di Blender

Sempat diusulkan menaikkan lampu mepet plafon supaya kode hide tak perlu. **Ditolak setelah dihitung**: kamera lihat lurus ke bawah, jadi lampu harus seluruhnya di atas kamera tertinggi (3,02 m di HP layar panjang) → kap lampu jadi y 3,07–3,46, **sisa kabel cuma 15 cm** (sekarang 149 cm) — berhenti jadi cage pendant, berubah jadi lampu plafon. Padahal desain 3 pendant itu ciri khas ruangan asli & sudah di-approve setelah 4× revisi; bayangannya juga sudah ter-bake. Catatan: setelah kamera dinaikkan ke atas lampu, hide sekarang **cuma untuk kerapian**, bukan penyelamat.

### ⚠️ 2 jebakan loading GLB (bikin bola putih & stik tak muncul)

1. **GLTFLoader mengganti SPASI jadi garis bawah.** Node `Ball Clube` jadi **`Ball_Clube`** setelah dimuat (`sanitizeNodeName` via `createUniqueName`). Mencocokkan nama mentah dari file → bola putih tak ketemu, dan stik ikut hilang karena posisinya mengacu ke bola putih. Fix: normalkan nama sebelum dicocokkan.
2. **Aset Sketchfab bisa punya transform WARISAN dari rantai node induk.** Stik membawa skala 0,0254 + rotasi −90°/−90°; `mesh.clone()` ikut mewarisinya → stik jadi 1 mm & salah arah. Fix: bangun `new Mesh(src.geometry, mat)` dari geometrinya saja, dan hitung skala terhadap **geometri mentah**. Bola tidak kena masalah ini (skala dunia 1,0) — **selalu cek per aset**.

> **Cara verifikasi yang benar:** cek nama node dengan **memuat GLB lewat GLTFLoader sungguhan**, bukan membaca JSON GLB mentah. Sempat "terverifikasi 16/16 cocok" dari file mentah padahal di three.js gagal. Di Node bisa dijalankan dengan tempelan `globalThis.self`, `URL.createObjectURL`, `Image`, `document.createElementNS`.

### Ganti GLB kantor (mis. versi ber-karakter) TIDAK perlu ngoding ulang

Kode billiard cuma bergantung 3 hal dari `office.glb`: (a) nama node mengandung **`PoolTable`**, (b) material **`M_BilLight_Cage`/`M_BilLight_Bulb`**, (c) posisi meja — **angka tetap di `table.ts`, tidak dibaca dari GLB**. Bola & stik file terpisah. Kalau nama file export tetap `office.glb` → **nol perubahan kode**.

✅ **Terbukti 29 Jul:** `office.glb` sudah diganti dengan versi berisi 5 karakter — **nol baris kode billiard yang berubah.** Karakter terdekat `CH_Leonard` 1,6 m dari meja (duduk di sofa), 4 lainnya 6,9–16 m.

---

## 7. Alat & Setup

- **Blender 5.1.2** + blender-mcp (reconnect: N-panel → Connect to Claude, lalu `/mcp`). File kerja: `~/Documents/Livingroom.blend` (~78 MB per 27 Jul). Scene per 28 Jul: **1.767 objek, 267 material** (naik dari 1.391/254 — selisihnya karakter + `Export_Merged` 338 objek)
  - Collection `Export_Merged` = hasil merge untuk export (§4f). **Di-exclude saat modeling**, di-include saat export. Objek asli di collection kerja tidak pernah disentuh.
  - Cycles: **GPU Metal** (`prefs.compute_device_type='METAL'` + `cycles.device='GPU'`) — cek tiap sesi, default-nya CPU
- **Polycam** untuk scanning (GLB)
- **Vite + bun** (project web ini) — **GLB sudah terintegrasi (§4h)**. Stack: **Vite 6** (dulu Next 16.2, dimigrasikan 29 Jul — §4j), React 19, three 0.185, @react-three/fiber 9 + drei 10 + postprocessing 3, zustand 5, Tailwind 4, **react-router-dom 7** (routing per-ruangan, §4q), **cannon-es 0.20** (billiard, §6d), **motion 12** (animasi teks, §4i), **matter-js 0.20** (`PhysicsHeading`, §4r-3). Jalankan: `bun dev` → `http://localhost:3000`
- **Vitest 4** — `bun run test`. **101 test di 19 berkas**, semuanya hijau per 3 Agu. Tiga di antaranya invariant lintas-wilayah (`INVARIANTS.md` §1, §3, §6). Norma repo: **buktikan test-nya MERAH di kondisi rusak dulu** sebelum dipakai memverifikasi perbaikan
- **Pengukuran performa: CDP langsung, tanpa dependency** (§4r) — `scripts/measure-frames.mjs` (frame time) + `scripts/shoot.mjs` (screenshot). Pakai Chrome yang sudah terpasang. ⚠️ **Wajib jalankan di dpr 2**; dpr 1 mentok vsync dan semua setelan terlihat sama
- **Playwright 1.61.0** untuk verifikasi visual headless — **versi itu spesifik**, lihat §4m. Flag WebGL: `--use-gl=angle --use-angle=metal --enable-unsafe-swiftshader`. (Tidak ada di `package.json`; dipasang terpisah saat dibutuhkan. Untuk mengukur **frame time** pakai skrip CDP di atas, bukan ini.)

### 📦 Manajer paket: BUN (diputuskan 29 Jul) — pnpm sudah tidak dipakai

Sempat ada **dua lockfile berbeda manajer** hidup berdampingan (`pnpm-lock.yaml` asli + `bun.lock` dari rekan tim). Itu bikin tiap orang install dengan alat berbeda dan lockfile-nya saling menimpa. **Diputuskan: bun.**

Yang dikerjakan supaya tidak terulang:
- `pnpm-lock.yaml` **dihapus** (dari git & disk). `bun.lock` satu-satunya yang sah.
- `package.json` diberi `"packageManager": "bun@1.3.14"` — jadi alat lain tahu (dan Corepack menolak) kalau ada yang salah pakai.
- `.gitignore` memblokir `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`.
- README diganti: cuma `bun install` + `bun dev`.

Diverifikasi: `bun install` bersih (468 install / 541 paket, no changes) dan `bun run build` **lolos penuh** — compile 2,7 s, TypeScript 2,0 s, 4 halaman statis ter-generate.

> ⚠️ **`bun` ada di `~/.bun/bin` tapi tidak selalu ada di PATH shell non-interaktif.** PATH-nya diset di `~/.zshrc`, yang tidak dimuat oleh shell non-login. Kalau ketemu `command not found: bun` di skrip/tool, pakai `export PATH="$HOME/.bun/bin:$PATH"` dulu — bukan berarti bun-nya belum terpasang.
- **Kompresi GLB:** WebP texture + Draco geometry, keduanya lewat exporter Blender bawaan (`export_image_format='WEBP'` + `export_draco_mesh_compression_enable=True`). WebP menang telak vs Draco kalau harus pilih satu — beban terbesar = texture
- Integrasi Sketchfab & Hyper3D di BlenderMCP: sebagian besar prosedural, tapi **ada asset Sketchfab + FBX/OBJ Apple (Magic KB/Mouse, monitor) di `OP_Electronics` + 3 kursi kantor Sketchfab loose** diimport untuk elektronik & seating office. Import ini bawa banyak node sampah (empty hierarki, mesh terpisah) — perlu dibersihkan sebelum export

### Sumber Asset 3D
**Sketchfab = sumber utama model** (paling lengkap: variasi, brand-spesifik, kualitas; sudah ke-set di MCP → search + preview + import langsung). Yang lain cuma pelengkap sesuai niche:

| Sumber | Kekuatan | Lisensi | Catatan |
|---|---|---|---|
| **Sketchfab** | Model apa saja, brand-spesifik | Campur (cek per model) | **Utama.** Via MCP: search/preview/import |
| **Poly Haven** | HDRI & texture PBR (model dikit) | CC0 | **Terintegrasi MCP** — import langsung tanpa download |
| **ambientCG** | Texture PBR (beton/kayu/karpet/metal) | CC0 | Buat detailing material |
| **Poly Pizza** | Model low-poly (eks-Google Poly) | CC0 | Ringan, GLB langsung — ideal web/Three.js |
| **Quaternius** | Pack low-poly (office/furniture) | CC0 | Style konsisten, enteng |
| **Kenney** | Props modular game-style | CC0 | Detailing kecil |
| **BlenderKit** (addon) | Ribuan model/material | Ada tier gratis | Drag-drop di Blender |
| **CGTrader / TurboSquid** | Model akurat/realistis | Berbayar | Utamakan format `.blend`/`.fbx`/`.gltf` |

**Rekomendasi buat proyek ini:** Sketchfab (model props/furniture/elektronik) + Poly Haven (HDRI lighting & texture lantai/dinding). Poly Pizza/Quaternius kalau butuh props low-poly biar GLB tetap ringan.
