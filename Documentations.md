# Documentations — Cogniti Office 3D Tour

Dokumentasi progres pembuatan 3D office tour ala [basement.studio](https://basement.studio) untuk **cogniti.id**.
Terakhir diupdate: **29 Juli 2026**.

**Status ringkas:** **5 ruangan sudah ~95% jadi** dan seluruhnya sudah jalan di browser (lihat MVP 1 di bawah):
- **Lounge/Billiard** (§2) & **Function Room** (eks Smoking, §3) — furniture & dekorasi lengkap
- **Office Area** (§3b) — 11 desk pod `ODesk_*`, elektronik meja (7 iMac + Magic KB/Mouse), lunch table, bar stool, kursi kerja, rak, tanaman, socket, whiteboard, dinding kaca `GWL_*`/`GWO_*`, pantry cabinet L, printer/shredder/wardrobe/microwave, track lighting + LED strip lantai
- **Meeting Room** (§3c) — meja V-frame, TV 98" frameless + cabinet, replika Rally Camera & Mic Pod ×4, Apple TV/remote/KB/trackpad, 9 kursi, snake plant, 6 downlight
- **West Room / Pantry wing** — counter, sink, bar table, rak

**0 material prosedural** tersisa (semua sudah di-bake ke image texture).

**Per 29 Jul** — kemajuan besar di atas MVP1:
- **GLB sudah terintegrasi ke Next.js** (§4h) — bukan lagi cuma viewer HTML. Hero fullscreen + navigasi antar-ruangan + hash routing + scrollspy navbar. Blocker path model sudah dibetulkan.
- **5 karakter sudah TAMPIL & BERANIMASI di web** (§6b) — Leonard (sofa lounge), Person2 & Person3 (mengetik di office), Person4 (meeting room), Person5 (function room). Sudah di-export ke `office.glb` dan `CharacterLights.tsx` sudah diisi.
- **Minigame billiard dibangun** (§6d) — fisika **cannon-es** (bukan Rapier lagi, lihat §6d) + kamera top-down + bar tenaga. ⏸️ **Ditunda**, belum di-review di browser.
- **Konten web V1 di-port ke V2** oleh rekan tim (§4i) — 5 section baru + animasi teks pakai `motion`.
- **Manajer paket disatukan ke `bun`** (§7) — `pnpm-lock.yaml` dihapus, build terverifikasi lolos.

**⬅️ Berikutnya: review billiard di browser** (§6d) — office 3D sudah dianggap selesai; karakter function room yang jadi syarat terakhir sudah masuk.

## 🎉 MVP 1 SELESAI (27 Jul) — **50-60 FPS di browser**

Seluruh scene (5 ruangan) jalan mulus di browser: **`export-test/office-mvp1-baked.glb` 8,0 MB, 401 draw call, 0 lampu realtime** (semua cahaya + bayangan di-bake ke lightmap). Serve `export-test/` → buka `http://localhost:8137`.

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

**Berikutnya:** ~~Karakter PS1 (§6b)~~ ✅ **5 karakter tampil di web 29 Jul** — sekarang: review visual billiard di browser + ukur ulang FPS (§6d, §4h).

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

## 4h. Integrasi ke Next.js ✅ (27–28 Jul)

GLB kantor sudah tidak lagi cuma jalan di viewer HTML — dia sekarang **hero fullscreen di project Next.js ini**. Struktur halaman: `[3D office tour = hero] → Deployments → Services → Vision → Contact`.

### Peta file

| File | Isi |
|---|---|
| `src/components/sections/Hero.tsx` | Section 3D setinggi `h-dvh`. `Scene` di-load `dynamic({ssr:false})`. IntersectionObserver (threshold 0.15) → `heroInView` |
| `src/components/canvas/Scene.tsx` | `<Canvas>`: ACESFilmic exposure 1.0, `dpr [1,1.5]`, fov 60 / near 0.05 / far 120, background `#0a0a0c`, ambient 0.12, EffectComposer + Bloom |
| `src/components/canvas/Office.tsx` | Pemuat GLB + 3 fix-up wajib (di bawah) + klik meja billiard + fade lampu |
| `src/components/canvas/SceneEnvironment.tsx` | `RoomEnvironment` + PMREM blur 0.04, `environmentIntensity` 0.18 |
| `src/components/canvas/CameraController.tsx` | Navigasi antar-ruangan (tween, hash routing, wheel/keyboard/touch) + `billiardView()` + `goToView` |
| `src/components/canvas/CharacterLights.tsx` | ✅ **terisi** — key hangat + fill dingin di layer 1, khusus karakter (§6b) |
| `src/components/canvas/billiard/` | Minigame billiard — 6 file (§6d) |
| `src/components/ui/RoomNav.tsx` | Bar indikator vertikal kanan + hint "Scroll to Explore" |
| `src/components/ui/BilliardHUD.tsx` | Bar tenaga kiri + tombol reset/exit + gestur bidik (§6d) |
| `src/lib/store/sceneStore.ts` | Zustand: `currentRoom`, `heroInView`, `activeSection`, `goTo`, `goToView` + state billiard |
| `src/lib/hooks/useScrollSpy.ts` | IntersectionObserver untuk highlight link navbar |

Stack: **Next 16.2 + React 19 + three 0.185 + @react-three/fiber 9 + drei 10 + @react-three/postprocessing 3 + zustand 5 + cannon-es 0.20 + motion 12** (cannon-es untuk billiard §6d; `motion` untuk animasi teks section §4i). **`@react-three/rapier` sudah dicopot** — alasannya di §6d.

### 3 fix-up wajib di `Office.tsx`

Ketiganya hasil debugging panjang; kalau meleset, visualnya rusak dengan cara yang tidak kelihatan jelas.

1. **`aoMap` → `lightMap`, hanya kalau `channel === 1`.** glTF tak punya slot lightmap, jadi lightmap diselundupkan lewat `occlusionTexture` (§4g) dan three membacanya sebagai `aoMap` — yang **MENGGELAPKAN**, bukan menerangi. Pembeda andal = `texture.channel`, BUKAN nama (glTF Blender tidak menyimpan `texture.name`). AO asli bawaan aset ada di channel 0/3 dan harus dibiarkan. Sekalian salin atribut UV ke `uv1` kalau belum ada — tanpa itu lightmap tidak tergambar sama sekali.
2. **JANGAN clamp `emissiveIntensity`.** GLB membawa `KHR_materials_emissive_strength` (bohlam 12, LED strip 8). Viewer lama punya `Math.max(intensity, 2.0)` yang justru **menurunkan** nilai itu jadi 2.0 → lampu terlihat mati. Pakai nilai aslinya, plus `toneMapped=false` supaya pendarnya tidak diredam ACES.
3. **`needsUpdate` setelah environment terpasang.** GLB selesai dimuat SETELAH `SceneEnvironment` mount, jadi shader-nya dikompilasi tanpa envMap → permukaan glossy (lantai ubin, chrome) kehilangan refleksi, terukur **0,60× lebih gelap** dari viewer acuan. `SceneEnvironment` juga wajib pakai `useLayoutEffect`, bukan `useEffect`.

**Angka verifikasi** (log dev `[office]`): `lightmap=40 aoAsliDijaga=22 tanpaUV1=0 emissive=28` — plus `skinned` (jumlah SkinnedMesh karakter) sejak 29 Jul. Kalau menyimpang jauh, fix-up gagal — cek ini dulu sebelum menyalahkan setelan lighting.

### Bloom bukan hiasan

`intensity 1.6`, **bukan 0.4 seperti viewer HTML**. Viewer pakai `UnrealBloomPass`, di sini `BloomEffect` dari postprocessing — algoritmanya beda jadi angkanya tidak setara. Dikalibrasi terhadap screenshot viewer sampai rasio kecerahan 0.98:

| intensity | 0.4 | 0.8 | 1.2 | **1.6** |
|---|---|---|---|---|
| rasio kecerahan vs viewer | 0.75 | 0.85 | 0.92 | **0.98** |

LED strip lantai & bohlam **mengandalkan bloom untuk terlihat menyala**. Tanpa bloom, kecerahan terukur turun ke 0.53×. `luminanceThreshold 0.95` — kalau diturunkan, lantai & permukaan terang ikut glow seperti lava.

### ⚠️ `LIGHTMAP_INTENSITY = 0` — dan kenapa scene tetap terang

Nilainya **0**, bukan 1. Ini konsekuensi dari temuan lightmap ter-clip 8-bit (§4g): bake Cycles menghasilkan HDR float (max 189) tapi di-export sebagai WebP 8-bit yang cuma menyimpan 0–1, jadi semua nilai >1 terpotong. Yang tersisa hanya gradasi/AO halus — plus artefak seam UV yang justru terlihat kalau dinyalakan.

**Artinya cahaya scene sekarang datang dari bloom + emissive + ambient 0.12 + environment 0.18, bukan dari lightmap.** Scene tetap terlihat bagus, jadi ini bukan blocker — tapi jangan salah paham menganggap lightmap sedang bekerja. Kalau mau lightmap benar-benar jadi sumber cahaya: export sebagai EXR terpisah + custom shader (cara basement.studio), atau normalisasi bake ke 0–1 lalu naikkan `lightMapIntensity` di viewer (mis. bake dibagi 4, intensity 4).

### Navigasi antar-ruangan (`CameraController.tsx`)

OrbitControls **diganti** dengan navigasi tur: kamera pindah antar 5 titik pandang tetap.

- `VIEWS` = 5 preset (Office, Lounge, Meeting, Function, Pantry). **Pantry `disabled: true`** — dilewati saat scroll & dot-nya abu-abu.
- Konversi sumbu Blender→three lewat helper `bl(x,y,z) → (x, z, −y)`.
- Tween **1400 ms cubic in-out**, dengan guard `animating` supaya input beruntun tidak melompati ruangan.
- Input: **wheel di canvas saja** (`preventDefault`, jadi scroll halaman tidak terganggu), panah keyboard, swipe touch ≥30 px.
- **Hash routing**: `#lounge`, `#meeting`, dst via `history.pushState` + `popstate`. Office = tanpa hash.
- `goTo` didaftarkan ke `sceneStore` supaya `RoomNav` & `Navbar` (di luar Canvas) bisa memanggilnya.

### UI yang mengikuti scroll

- **`heroInView`** (IntersectionObserver di Hero, threshold 0.15) — begitu 3D keluar viewport, label ruangan di navbar & `RoomNav` di-fade habis. Tanpa ini, dot ruangan mengambang di atas konten teks.
- **Navbar background kondisional**: gradient transparan saat di hero, `bg-black/90` + backdrop-blur + border bawah saat sudah lewat. Memakai `heroInView` yang sudah ada — tidak menambah listener baru.
- **Scrollspy** (`useScrollSpy`) — `rootMargin −45%/−45%` mempersempit garis deteksi ke pita tipis di tengah layar, jadi section tinggi jadi active tepat saat isinya di tengah, bukan saat tepi atasnya baru menyentuh viewport. Di hero, tidak ada link yang active.

### ✅ BLOCKER `MODEL_URL` — SUDAH DIBETULKAN (28 Jul)

`Office.tsx` sempat memuat `/export-test/office-mvp1-baked.glb` lewat symlink `public/export-test → ../export-test`. **Symlink itu tidak pernah ada di git maupun di disk**, dan GLB-nya juga tidak ada (`export-test/*.glb` di-gitignore, isinya tinggal 4 file HTML) — jadi scene mentok di loader. Diverifikasi dengan `pnpm dev`:

```
/3d/models/office.glb                → 200
/export-test/office-mvp1-baked.glb   → 404
```

**Sudah dikembalikan ke `/3d/models/office.glb`** (nilai aslinya di commit `ad31934`; `bc0e86c` yang menggantinya ke path symlink dev-only). File itu ter-track git (9,04 MB saat itu; **8,09 MB sejak export ber-karakter 29 Jul**) dan strukturnya memang benar: 213 mesh, 227 material, 89 image, **0 lampu**, 44 material ber-`occlusionTexture` (39 di antaranya `texCoord=1` = lightmap). Draco + WebP aktif. Komentar peringatan sudah ditulis di atas konstanta itu supaya tidak terulang.

### Yang belum

- Post-processing PS1 (§4b) — `@react-three/postprocessing` sudah terpasang, tinggal tambah pass
- Interaksi klik pintu — `Bvh firstHitOnly` sudah dipasang di `Office.tsx` untuk mempercepat raycast. Klik **meja billiard** sudah jalan (§6d)
- ~~Karakter (§6b)~~ ✅ **SELESAI 29 Jul** — 5 karakter tampil & beranimasi, `CharacterLights` terisi
- Video di layar laptop/iMac (§6c) — masih ada blocker di Blender
- **Review visual billiard di browser** (§6d) — sekarang jadi pekerjaan berikutnya

### ⚠️ Ukur ulang FPS setelah karakter masuk

Angka 50-60 FPS di MVP1 diukur **sebelum** ada 5 SkinnedMesh + 2 directional light layer-1 + `frustumCulled = false`. Secara teori dampaknya kecil (skinning di GPU, lampu layer dilewati objek statis, §6b), **tapi belum diukur ulang.** Lakukan bersamaan dengan review billiard.

## 4i. Konten & Animasi Teks ✅ (29 Jul — dikerjakan rekan tim)

Dikerjakan paralel di branch `feature/port-konten-v1` + `feature/text-transitions`, sudah di-merge ke `main`. **Tidak ada satu pun file yang beririsan dengan pekerjaan 3D/billiard** — jadi tidak pernah ada konflik git.

**Struktur halaman final** (`src/app/page.tsx`) — 5 section bertambah jadi 9 di bawah hero:

```
Hero (3D) → Manifesto → Deployments → Services → LivingArchitecture
          → Process → Industries → Careers → Vision → Contact
```

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

Commit `38168ce` sempat mengganti viewer ke `WebGPURenderer` (three r171, fallback WebGL2) + aset KTX2/ETC1S (`office-mvp1-final.glb`, 699 KB VRAM vs 5,59 MB). **Di-revert penuh** di `8a1e0b1` keesokan harinya. Yang bertahan dari eksperimen itu bukan kodenya, tapi **idenya** — navigasi scroll/touch/keyboard + tween 1400 ms + hash routing lahir di sana, lalu ditulis ulang sebagai komponen R3F di `bc0e86c`. Kalau nanti VRAM jadi masalah, KTX2 layak dicoba lagi (di jalur R3F, bukan viewer HTML).

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
10. **Integrasi ke web** (§4h) — 🚧 sebagian besar SELESAI 27–29 Jul: GLB jadi hero fullscreen, navigasi 5 ruangan (wheel/keyboard/touch + hash routing), navbar dropdown + scrollspy, `heroInView` gating, `MODEL_URL` dibetulkan, **karakter + CharacterLights**. **Sisa:** post-processing PS1, interaksi klik pintu
11. ~~Minigame billiard~~ ✅ **DIBANGUN 28 Jul, engine diganti cannon-es 29 Jul** (§6d) — fisika terverifikasi lewat simulasi headless. ⏸️ Belum di-review di browser
11b. **Konten V1 → V2 + animasi teks** ✅ **SELESAI 29 Jul** (§4i, rekan tim) — 9 section + 4 komponen `motion`
12. **⬅️ BERIKUTNYA — review billiard di browser** (§6d): posisi stik, apakah bola terlihat resin (bukan besi), framing kamera, timing fade lampu. **Sekalian ukur ulang FPS** setelah 5 karakter masuk (§4h). Setelah itu:
    - **a. Beresi blocker layar** (§6c) — pisah material MacBook, unwrap ulang UV iMac & SMK_TV
    - **b. Post-processing PS1** (§4b) — pass terakhir untuk look basement.studio
    - ~~**c. Sepakati satu lockfile**~~ ✅ **SELESAI 29 Jul — bun** (§7)
13. Dekorasi tambahan (tanaman via Sketchfab kalau integrasi di-enable)

### Polish opsional (tidak mendesak, MVP1 sudah jalan)
- Hapus backup mesh `*_ORIG` (5 objek) saat semua final
- Rename `AirVent_01..04` → `MR_AirVent_*`
- 4 spot track light lain yang masih tanpa lensa (kalau ketemu saat review)
- Post-processing PS1 (§4b) — lapisan opsional di viewer

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

## 6c. Video/Gambar di Layar 🚧 (diputuskan 28 Jul)

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

## 6d. Minigame Billiard ✅ DIBANGUN (28 Jul) — ⏸️ ditunda, belum di-review di browser

Sandbox: aim + power + tembak, bola masuk lubang hilang, auto re-rack, tombol reset. **Tanpa skor/giliran/aturan 8-ball.** Fisika **cannon-es 0.20** — dipakai LANGSUNG tanpa wrapper R3F (lihat di bawah kenapa pindah dari Rapier).

**Status:** logika & fisika sudah diverifikasi (simulasi headless + typecheck/lint/build bersih). **Yang belum: penilaian visual** — posisi stik, apakah bola terlihat resin (bukan besi), framing kamera, timing fade lampu. Karakter function room (syarat terakhir office 3D) sudah masuk, jadi **review browser ini sekarang jadi pekerjaan berikutnya**.

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

`cueScreen` diperbarui **hanya saat membidik dan hanya kalau bergeser >1 px**, karena setiap pembaruan memicu render React. `RoomNav` disembunyikan saat main (tombolnya menempati sisi layar yang sama dengan HUD).

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
- **Next.js + bun** (project web ini) — **GLB sudah terintegrasi (§4h)**. Stack: Next 16.2, React 19, three 0.185, @react-three/fiber 9 + drei 10 + postprocessing 3, zustand 5, Tailwind 4, **cannon-es 0.20** (billiard, §6d), **motion 12** (animasi teks, §4i). Jalankan: `bun dev` → `http://localhost:3000`

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
