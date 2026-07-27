# Documentations — Cogniti Office 3D Tour

Dokumentasi progres pembuatan 3D office tour ala [basement.studio](https://basement.studio) untuk **cogniti.id**.
Terakhir diupdate: **27 Juli 2026**.

**Status ringkas:** **5 ruangan sudah ~95% jadi** dan seluruhnya sudah jalan di browser (lihat MVP 1 di bawah):
- **Lounge/Billiard** (§2) & **Function Room** (eks Smoking, §3) — furniture & dekorasi lengkap
- **Office Area** (§3b) — 11 desk pod `ODesk_*`, elektronik meja (7 iMac + Magic KB/Mouse), lunch table, bar stool, kursi kerja, rak, tanaman, socket, whiteboard, dinding kaca `GWL_*`/`GWO_*`, pantry cabinet L, printer/shredder/wardrobe/microwave, track lighting + LED strip lantai
- **Meeting Room** (§3c) — meja V-frame, TV 98" frameless + cabinet, replika Rally Camera & Mic Pod ×4, Apple TV/remote/KB/trackpad, 9 kursi, snake plant, 6 downlight
- **West Room / Pantry wing** — counter, sink, bar table, rak

**0 material prosedural** tersisa (semua sudah di-bake ke image texture).

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

**Berikutnya:** Karakter PS1 (§6b) — low-poly ≤2.5k tris vertex-color via Mixamo.

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
9. **Karakter PS1** (§6b) — low-poly via Mixamo, sofa lounge dulu ⬅️ **BERIKUTNYA**
10. Integrasi ke web (project Next.js ini): scroll/tour navigation, interaksi (flip billiard), post-processing PS1, polish
11. Dekorasi tambahan (tanaman via Sketchfab kalau integrasi di-enable)

### Polish opsional (tidak mendesak, MVP1 sudah jalan)
- Hapus backup mesh `*_ORIG` (5 objek) saat semua final
- Rename `AirVent_01..04` → `MR_AirVent_*`
- 4 spot track light lain yang masih tanpa lensa (kalau ketemu saat review)
- Post-processing PS1 (§4b) — lapisan opsional di viewer

## 6b. Karakter (fase C3) 🚧 (diputuskan 27 Jul)

Karakter low-poly gaya **PS1** untuk mengisi tour. Keputusan & temuan:
- **⚠️ Ready Player Me MATI** (shutdown 31 Jan 2026, `*.readyplayer.me` = NXDOMAIN). Rencana "avatar dari foto staff" DIBATALKAN — di resolusi target wajah asli hilang jadi gumpalan; bonus tidak perlu consent staff.
- **Pengganti** kalau perlu: Avaturn (avaturn.me, tier gratis, GLB) atau Avatar SDK/MetaPerson.
- **Pilihan user:** sumber **Mixamo** (rig + animasi gratis, lalu decimate), gaya kasual realistis, warna **vertex color** (buang semua texture, ala basement), animasi idle loop halus. Karakter pertama di **sofa lounge**.
- **Target teknis:** ≤2.500 tris & ≤150 KB per karakter.
- **Bukti dari repo basement** (`character-model-*.glb` dibedah): TOTAL 4.860 tris untuk SEMUA karakter, `images: []` (NOL texture, warna via `COLOR_0`), head cuma 484 tris, STRUKTUR MODULAR (1 body dipakai bersama, beda per orang cuma rambut & kacamata). Look PS1 = post-processing terpisah, bukan dari model.
- **Anchor dudukan (terverifikasi):** `SofaB_Seat_0` (sofa dinding kiri lounge, bantalan kiri). Permukaan duduk z=0.48, center (−1.41, 4.38), badan hadap +X.
- **Gotcha:** download Mixamo **FBX Binary (.fbx)**, BUKAN varian 2013/6100 (Blender 5 min. 7100). Mesin ini tidak punya converter FBX.

## 7. Alat & Setup

- **Blender 5.1.2** + blender-mcp (reconnect: N-panel → Connect to Claude, lalu `/mcp`). File kerja: `~/Documents/Livingroom.blend` (~78 MB per 27 Jul)
  - Collection `Export_Merged` = hasil merge untuk export (§4f). **Di-exclude saat modeling**, di-include saat export. Objek asli di collection kerja tidak pernah disentuh.
  - Cycles: **GPU Metal** (`prefs.compute_device_type='METAL'` + `cycles.device='GPU'`) — cek tiap sesi, default-nya CPU
- **Polycam** untuk scanning (GLB)
- **Next.js + pnpm** (project web ini) — masih fase asset, MVP1 GLB sudah siap diintegrasikan berikutnya
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
