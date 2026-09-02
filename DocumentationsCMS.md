# DocumentationsCMS — CMS cogniti.id

Dokumentasi CMS buatan sendiri untuk **cogniti.id**: Postgres + API + panel admin
berbahasa Indonesia. Dokumentasi situsnya (3D, section, performa) ada di berkas
terpisah, `Documentations.md` — dua berkas ini sengaja tidak dicampur.

Terakhir diupdate: **2 September 2026**.

**Status ringkas:** **sebelas entitas selesai dan terverifikasi di lokal** —
lowongan, nilai ("What We Stand For"), dan crew ("The Crew") di halaman People;
**Selected work** dan **case study** di halaman Work; **layanan** dan
**testimoni** di halaman Services; **deployment**, **cara kerja** ("How We
Work"), **industri** ("Built Across Sectors"), dan **visi** di halaman depan.
Tinggal SATU entitas konten yang belum dikerjakan (tautan sosial).
Deploy ke VPS belum dikerjakan.

- Cabang: `feat/cms-lowongan` (`main` 31 Agu sudah di-merge masuk lewat `99937f5`)
- Kode CMS-nya sendiri: **116 berkas, ~25.000 baris** di `shared/` + `server/` +
  `admin/src/` (di luar SQL & snapshot migrasi) — panel adminnya saja ~7.400 baris
- Test: `bun run test` → **94 berkas, 996 test hijau** (577 di antaranya milik CMS)
- Tiga belas probe end-to-end lewat Brave: `probe-admin`, `probe-nilai-admin`,
  `probe-crew-admin`, `probe-proyek-admin`, `probe-case-study-admin`,
  `probe-layanan-admin`, `probe-testimoni-admin`, `probe-industri-admin`,
  `probe-visi-admin`, `probe-deployment-admin`, `probe-proses-admin`,
  `probe-tema-admin`, `probe-job-page`

Yang berubah sejak slice pertama, selain delapan entitas baru: **masuk kini
dengan kata sandi saja** (§7), panel punya **beranda dari peta konten situs**
dan **menu sisi** (§11), dan ada **tema gelap** (§11a).

Slice Work membawa dua hal yang belum pernah ada di tiga slice People: daftar
yang **boleh menyusut sampai kosong** di halaman yang sudah terlanjur
menganggapnya tetap (§14), dan satu kolom teks yang **bentuknya dibawa spasi
putih**, bukan struktur data (§5c). Dua slice Services menambah satu lagi:
**layanan adalah entitas pertama yang wujud tayangnya bukan DOM** — judulnya
teks troika di sabuk 3D, dan satu-satunya bentuk yang terbaca mesin adalah
daftar `sr-only` (§4b, §13). Dua slice Home menambah dua bentuk yang belum
pernah ada: **industri adalah satu-satunya entitas berbatas jumlah** (maksimal
13 sektor tayang — batas geometri tumpukan 3D-nya, §4b), dan **visi adalah
satu-satunya entitas satu baris** — tanpa daftar, tanpa draf, tanpa hapus,
dijaga `CHECK` di database (§4b, §11). Dua slice Home terakhir — **deployment**
dan **cara kerja**, dikerjakan dua sesi terpisah pada hari yang sama — menambah
tiga bentuk lagi: deployment satu-satunya entitas yang identitasnya **pasangan
dua kolom** (sektor + wilayah — unique index dua kolom pertama di CMS ini,
§4b); cara kerja **entitas berbatas kedua** (maksimal 6 langkah tayang —
alasannya panjang halaman, bukan geometri seperti batas 13 industri, §4b); dan
ilustrasinya satu-satunya "gambar" CMS yang **bukan berkas** — enum `glyph`
yang menunjuk komponen SVG, milik langkahnya sendiri dan bukan posisi barisnya
(§4b).

---

## §1 Kenapa CMS ini ada

Dua alasan, dua-duanya nyata dan tidak saling menggantikan:

1. **Setelah situs tayang, Keano pindah ke proyek lain.** Yang mengedit konten
   adalah teman dari R&D — non-teknis. Sekarang seluruh konten hardcoded di
   `src/data/*.ts` dan di dalam komponen section, jadi mengganti satu kalimat
   lowongan berarti butuh developer, editor kode, dan satu siklus deploy.
2. **Keano mau latihan database beneran** — bukan memasang CMS jadi. Itu sebabnya
   yang dibangun Postgres + skema tulisan sendiri, bukan Sanity/Strapi/Payload.

Keputusan yang sudah disepakati dan tidak berubah:

| Keputusan | Alasannya |
|---|---|
| **Draft → Publish**, bukan simpan-langsung-tayang | Editor non-teknis butuh tempat aman untuk setengah jadi |
| **Satu peran** untuk semua akun | Pembedaan admin/editor menambah layar & aturan yang belum ada yang membutuhkannya |
| **Upload gambar dengan resize otomatis** | Kalau tidak, foto 8 MB dari kamera akan mendarat apa adanya di halaman |
| **Hitam-putih, tanpa animasi sama sekali** | Permintaan Keano, verbatim: *"CMS yang jelas dan rapi dan yang paling penting non teknis friendly"* |
| **Lowongan dulu, ditembus sampai tayang** | Satu entitas yang benar-benar selesai lebih berguna daripada sepuluh yang setengah |

Dua keputusan yang datang belakangan, sesudah slice pertama dipakai:

| Keputusan | Alasannya |
|---|---|
| **Masuk dengan kata sandi saja, tanpa email** | Satu isian lebih sedikit untuk diingat; identitas tidak hilang karena sandi tetap milik satu akun (§7) |
| **Tema gelap, tetap hitam-putih** | Panel ini dipakai berjam-jam; yang ditambah cuma pilihan terang/gelap, bukan warna (§11a) |

---

## §2 Prinsip arsitektur — database TIDAK di jalur baca pengunjung

Ini satu-satunya aturan yang tidak boleh dilanggar di seluruh dokumen ini.

```
teman R&D → /admin → API → Postgres          (jalur EDIT)
                       ↓ tombol "Publish"
                   tulis dist/content.json
pengunjung → situs → baca content.json        (jalur BACA — tanpa DB, tanpa API)
```

Konsekuensi yang dijaga, dan sudah dibuktikan (§13):

- **API mati / Postgres mati → situs tetap tayang** memakai isi terakhir yang dipublish.
- **`content.json` hilang → situs tetap tayang** memakai data yang ikut ter-bundle
  (`src/data/*Fallback.ts`). Tidak pernah ada keadaan halaman kosong.
- **Publish tidak memicu rebuild.** Tidak ada `vite build` yang jalan saat editor
  menekan tombol; yang terjadi cuma satu berkas JSON ditulis ulang.

**Aturan impor satu arah:**

```
src/    → shared/    ✅
server/ → shared/    ✅
src/    → server/    ❌ TIDAK PERNAH
```

Yang terakhir itu bukan kerapian: `src/` ikut ter-bundle ke browser, jadi satu
impor iseng dari `server/` cukup untuk menyeret `DATABASE_URL` ke JavaScript yang
diunduh setiap pengunjung — **tanpa satu pun error yang memberitahu.** Peringatan
yang sama ditulis ulang di kepala tiap berkas `shared/`, karena `shared/` adalah
tempat paling mungkin orang tergoda melanggarnya.

---

## §3 Susunan berkas

```
Website CSI V2/
├── src/                situs publik — nyaris tidak disentuh
│   ├── lib/content/store.ts     ambil content.json + fallback per-bagian
│   ├── data/jobs.ts             baca store  (isi lama → jobsFallback.ts)
│   ├── data/careerRoles.ts      baca store  (isi lama → careerRolesFallback.ts)
│   ├── data/people.ts           baca store  (isi lama → crewFallback.ts + valuesFallback.ts)
│   ├── data/work.ts             baca store  (isi lama → workProjectsFallback.ts)
│   ├── data/caseStudies.ts      baca store  (isi lama → caseStudiesFallback.ts)
│   ├── data/services.ts         baca store  (isi lama → servicesFallback.ts)
│   ├── data/testimonials.ts     baca store  (isi lama → testimonialsFallback.ts)
│   ├── data/industries.ts       baca store  (isi lama → industriesFallback.ts)
│   ├── data/deployments.ts      baca store  (isi lama → deploymentsFallback.ts)
│   ├── data/processSteps.ts     baca store  (isi lama → processStepsFallback.ts)
│   ├── data/vision.ts           baca store, cadangan PER ISIAN (§10a)
│   └── data/{jobs,careerRoles,crew,values,workProjects,caseStudies,
│             services,testimonials,industries,deployments,processSteps,
│             vision}Fallback.ts
├── shared/             tipe & validasi dipakai bertiga
│   ├── content.ts               ContentPayload + CONTENT_VERSION
│   ├── contentMap.ts            peta konten situs → beranda & menu sisi panel
│   ├── job.ts         · validateJob.ts
│   ├── value.ts       · validateValue.ts
│   ├── crew.ts        · validateCrew.ts
│   ├── workProject.ts · validateWorkProject.ts
│   ├── caseStudy.ts   · validateCaseStudy.ts   (+ normalizeDesc — §5c)
│   ├── service.ts     · validateService.ts
│   ├── testimonial.ts · validateTestimonial.ts
│   ├── industry.ts    · validateIndustry.ts   (+ MAX_LIVE_INDUSTRIES — §4b)
│   ├── deployment.ts  · validateDeployment.ts
│   ├── processStep.ts · validateProcessStep.ts (+ MAX_LIVE_PROCESS_STEPS — §4b)
│   └── vision.ts      · validateVision.ts
├── server/             API + Postgres, proses Node terpisah
│   ├── app.ts / index.ts        rakit app · buka port
│   ├── db/schema.ts             22 tabel Drizzle
│   ├── db/migrations/           SQL hasil drizzle-kit (0000 → 0011)
│   ├── db/seed.ts               isi DB dari literal repo, sekali jalan per tabel
│   ├── jobsRepo.ts              transaksi 4 tabel
│   ├── valuesRepo.ts            satu baris + reorder
│   ├── crewRepo.ts              transaksi 2 tabel
│   ├── workProjectsRepo.ts      transaksi 2 tabel + reorder
│   ├── caseStudiesRepo.ts       transaksi 2 tabel + reorder
│   ├── servicesRepo.ts          transaksi 2 tabel + reorder
│   ├── testimonialsRepo.ts      satu baris + reorder
│   ├── industriesRepo.ts        satu baris + reorder
│   ├── deploymentsRepo.ts       satu baris + reorder
│   ├── processStepsRepo.ts      satu baris + reorder + hitung batas 6
│   ├── visionRepo.ts            SATU BARIS HARFIAH — upsert, tanpa daftar (§4b)
│   ├── routes/{auth,jobs,values,crew,workProjects,caseStudies,
│   │           services,testimonials,industries,deployments,processSteps,
│   │           vision,images,publish}.ts
│   ├── auth.ts · audit.ts · images.ts · publish.ts · env.ts
│   ├── createUser.ts            bikin akun editor dari terminal
│   └── tsconfig.json            WAJIB — lihat §3a
├── admin/              panel editor, app Vite KEDUA → dist-admin/
│   ├── index.html               + skrip anti-kedip tema (§11a)
│   ├── vite.config.ts           root + cacheDir + base + proxy
│   └── src/
│       ├── App.tsx · Beranda.tsx · Sidebar.tsx · Masuk.tsx
│       ├── DaftarLowongan · FormLowongan
│       ├── DaftarNilai    · FormNilai
│       ├── DaftarCrew     · FormCrew
│       ├── DaftarProyek   · FormProyek       (Selected work)
│       ├── DaftarCaseStudy · FormCaseStudy
│       ├── DaftarLayanan  · FormLayanan
│       ├── DaftarTestimoni · FormTestimoni
│       ├── DaftarIndustri · FormIndustri
│       ├── DaftarDeployment · FormDeployment
│       ├── DaftarProses   · FormProses       (Cara kerja)
│       ├── FormVisi                          (tanpa Daftar — §11)
│       ├── PemilihFoto · BarPublish · Tema.tsx
│       └── ui.tsx · api.ts · styles.css
└── uploads/            gambar unggahan (di luar git)
```

### §3a Kenapa `server/` punya `tsconfig.json` sendiri

`tsconfig.json` root berlaku ke seluruh repo (`include: ["**/*.ts"]`) dengan
`lib: ["dom", ...]`. Tanpa tsconfig terpisah, kode backend diperiksa seolah punya
`document` dan `window` — autocomplete yang menyesatkan, dan `bun run build` ikut
memeriksanya dengan aturan yang salah. Root sudah meng-`exclude` `server`,
`admin`, `dist-admin`, dan `uploads`.

### §3b Kenapa `admin/` app Vite terpisah, bukan route di dalam `src/`

Bundle entry situs sudah 1,8 MB, dan panel form akan berkelahi dengan Lenis
smooth-scroll, scroll-lock, dan store ruangan 3D kalau ditaruh sebagai route.
Panel ini tidak butuh satu pun dari itu.

---

## §4 Skema database

Dua puluh dua tabel, sebelas entitas konten. Yang paling penting di slice pertama:
**menyatukan dua sumber yang dulu terpisah** — daftar lowongan di `Careers.tsx`
dan isi halaman di `src/data/jobs.ts` — menjadi satu baris `jobs`. Penyatuan itu
prasyarat, bukan kerapian: dua tempat untuk satu lowongan mustahil dijelaskan ke
orang non-teknis.

```
jobs
  id, slug, title, department, state, overview, photo_id → images,
  ask_github, sort_order, created_at, updated_at, published_at, deleted_at

job_skills          (job_id, position) PK · label
job_copy            (job_id, lang)     PK · intro
job_copy_bullets    (job_id, lang, kind, position) PK · text
                     kind = responsibility | qualification

people_values
  id, title, tagline, description, photo_id → images,
  state, sort_order, created_at, updated_at, published_at, deleted_at

crew_members
  id, name, role, category, photo_id → images,
  state, created_at, updated_at, published_at, deleted_at

crew_socials        (member_id, position) PK · platform, url

work_projects
  id, title, client, year, outcome, photo_id → images,
  state, sort_order, created_at, updated_at, published_at, deleted_at

work_project_tags   (project_id, position) PK · label

case_studies
  id, title, client, year, industry, outcome, quote, desc,
  photo_id → images, state, sort_order,
  created_at, updated_at, published_at, deleted_at

case_study_scopes   (study_id, position) PK · label

services
  id, title, desc, state, sort_order,
  created_at, updated_at, published_at, deleted_at

service_subs        (service_id, position) PK · label

testimonials
  id, quote, name, role, state, sort_order,
  created_at, updated_at, published_at, deleted_at

industries
  id, name, desc, tier (core|also), photo_id → images,
  state, sort_order, created_at, updated_at, published_at, deleted_at

deployments
  id, sector, region, desc, photo_id → images,
  state, sort_order, created_at, updated_at, published_at, deleted_at

process_steps
  id, title, kicker, desc, glyph (enum process_glyph — 6 ilustrasi SVG),
  state, sort_order, created_at, updated_at, published_at, deleted_at

vision
  id (SELALU 1 — CHECK vision_satu_baris), statement, photo_id → images,
  created_at, updated_at, published_at        ← tanpa state, tanpa deleted_at

images              id, path (unique), source (static|upload),
                    original_name, width, height, bytes
users               id, email (unique), password_hash, name, deleted_at
sessions            id, user_id, expires_at
audit_log           id, user_id, entity, entity_id, action, at, snapshot (jsonb)
```

Enum Postgres sungguhan, bukan `text` + konvensi: `job_state`, `lang`,
`bullet_kind`, `image_source`, `value_state`, `crew_state`, `crew_category`,
`social_platform`, `work_project_state`, `case_study_state`, `service_state`,
`testimonial_state`, `industry_state`, `industry_tier`, `deployment_state`,
`process_step_state`, `process_glyph`.

### §4a Pola yang dipakai ulang antar entitas

Sepuluh dari sebelas entitas berbagi lima keputusan yang sama, dan itu yang
membuat entitas berikutnya tinggal menyalin (**visi satu-satunya pengecualian**
— lihat §4b):

1. **`state` menentukan apa yang tayang.** `draft` tidak pernah ikut masuk
   `content.json` sama sekali. Inilah yang membuat tombol Publish aman ditekan
   kapan saja: mempublish satu baris tidak ikut menayangkan baris lain yang
   masih separuh jadi, karena yang separuh jadi tidak pernah terangkut.
2. **Hapus = isi `deleted_at`, tidak pernah `DELETE`.** Editor non-teknis akan
   menghapus sesuatu yang penting, cepat atau lambat.
3. **Unique index PARSIAL untuk baris hidup saja** — `jobs_slug_alive`,
   `people_values_title_alive`, `crew_members_name_alive`,
   `work_projects_title_alive`, `case_studies_title_alive`,
   `services_title_alive`, `testimonials_name_alive`,
   `industries_name_alive`, `process_steps_title_alive`, dan — satu-satunya
   yang DUA kolom — `deployments_sector_region_alive` (sektor + wilayah, §4b),
   semuanya
   `where deleted_at is null`. Slug/judul/nama milik baris yang sudah dihapus
   tidak boleh terkunci selamanya, dan orang yang kembali bergabung adalah
   kejadian yang wajar.
4. **Empat cap waktu yang sama** — `created_at`, `updated_at`, `published_at`,
   `deleted_at`. Badge "belum tayang" (§9) dihitung dari tiga yang terakhir,
   dengan rumus yang ditulis SEKALI untuk semua entitas.
5. **`audit_log.snapshot` menyimpan isi LENGKAP saat hapus.** Kalau hapusnya
   keliru, catatan ini yang membuat isinya bisa disusun kembali tanpa membongkar
   backup `pg_dump`.

Keunikan di nomor 3 bukan cuma soal kerapian data. `PeopleValues.tsx` memakai
judul dan `TheCrew.tsx` memakai nama sebagai **`key` React**; dua baris berjudul
sama membuat React memakai ulang node yang salah, dan yang terlihat bukan error
melainkan satu panel yang isinya tercampur atau satu kartu yang fotonya milik
orang lain.

Di halaman Work taruhannya lebih besar lagi: judul proyek dipakai sebagai `key`
di **lima tempat sekaligus** di `CaseGrid.tsx` + `CaseGridMobileStack.tsx`
(kartu kipas, panel isi yang beranimasi, deretan titik, dan dua di tumpukan versi
ponsel), dan judul case study jadi `key` tiap blok di `CaseStudySpotlight.tsx`.
Dua judul kembar di sana bukan panel tercampur melainkan kartu yang gambarnya
milik proyek lain, muncul cuma saat kipasnya kebetulan berputar ke situ.

Label anaknya ikut dijaga di validasi, bukan di database: `work_project_tags` dan
`case_study_scopes` sama-sama dirender `key={label}`, jadi dua label kembar di
SATU baris ditolak validator sebelum tersimpan (§5b).

Dua entitas Services meneruskan pola yang sama: judul layanan jadi `key` React
di item sabuk `ServicesTicker` DAN di `<li>` daftar `sr-only` — persis sejak
nomor "01"–"09" tidak lagi disimpan (§4b) — dan nama testimoni jadi `key` tiap
entri di sizer tak terlihat `TestimonialSpotlight` (replika semua entri yang
mengunci tinggi blok). Dua testimoni atas nama sama bukan error melainkan tinggi
blok yang salah ukur.

Dua entitas Home yang baru meneruskannya lagi: judul langkah jadi `key` kartu
di `Process.tsx`, dan kartu deployment memakai **pasangan** `` `${sector} ·
${region}` `` sebagai `key` — persis pasangan yang dijaga indeks uniknya,
karena dua kartu bersektor sama (beda wilayah) memang sah tayang berdampingan
(§4b). Indeks larik sengaja tidak dipakai sebagai key di keduanya: reorder
dari panel akan membuat React menukar state animasi antar kartu.

### §4b Yang BERBEDA di tiap entitas

**Sembilan entitas punya `sort_order`; crew dan visi TIDAK — dan itu keputusan,
bukan kelupaan** (visi karena satu baris tidak bisa diurutkan terhadap apa
pun; crew karena alasan di bawah).

Panel nilai bertumpuk sticky di `PeopleValues.tsx`: yang terakhir adalah yang
menutup seluruh tumpukan dan paling lama dilihat, jadi urutannya adalah konten
yang tayang dan editor harus bisa memindahkannya.

`TheCrew.tsx` sebaliknya mengurutkan sendiri — kelompokkan per departemen
(urutan `CREW_CATEGORIES`), lalu A–Z di dalam tiap kelompok — dan **"A-Z" itu
tercetak sebagai judul kolom di halamannya.** Kolom urutan di database berarti
editor bisa menekan "Naikkan" di panel lalu melihat situs mengabaikannya
sepenuhnya: perubahan yang tersimpan, tidak error, dan tidak pernah terlihat.
Kalau suatu hari urutan manual memang diinginkan, yang harus berubah lebih dulu
adalah `TheCrew.tsx`, bukan skemanya.

Di `work_projects` urutannya bahkan lebih keras lagi daripada di nilai: kartu
pertama adalah yang **terbuka saat halaman Work dibuka**, dan urutan yang sama
dipakai putaran otomatis lima detik sekali serta deretan titik di bawahnya.
`case_studies` lebih tenang — semua bloknya terlihat sekaligus — tapi tetap
urutan baca.

`services` dan `testimonials` dua-duanya ikut ber-`sort_order`, dengan alasan
yang berbeda bentuk. Sabuk layanan melingkar tanpa awal yang terlihat, tapi
daftar `sr-only`-nya dibaca lurus dari atas ke bawah — urutan inilah yang
didengar pemakai pembaca layar dan dibaca mesin pencari. Di testimoni
taruhannya sama dengan kartu proyek: baris ber-`sort_order` terkecil adalah
**satu-satunya kutipan yang terlihat saat halaman dibuka**, karena sisanya baru
muncul kalau pengunjung menekan panah.

**Layanan tidak menyimpan nomor "01"–"09"** yang ada di kode lama, dan itu
keputusan: nomor itu tidak pernah dicetak ke layar (cuma jadi `key` React), dan
menyimpannya di sebelah `sort_order` berarti dua sumber kebenaran yang pasti
melenceng begitu editor memindahkan satu baris. Kalau suatu hari nomornya mau
ditampilkan, turunkan dari posisi. Konsekuensinya judul naik jadi identitas —
`services_title_alive` yang menjaganya. Layanan juga tidak punya slug dan tidak
punya halaman sendiri; `closed` ala lowongan tidak ada karena layanan yang tidak
lagi ditawarkan bukan "ditutup" melainkan dicabut dari daftar.

**`testimonials` TIDAK punya kolom foto, dan itu bukan kelupaan.** Situs
menggambar ikon orang abu-abu (`UserRound`) yang sama untuk SEMUA testimoni —
tidak ada satu pun `<img>` di komponennya. Kolom foto di sini akan tersimpan
rapi lalu tidak pernah dirender: persis jebakan kolom-urutan-crew dalam wujud
lain. Kalau wajah klien memang mau ditampilkan, itu perubahan desain
(schema + form + komponen), bukan sekadar menyalakan sesuatu.

**`testimonials.quote` JANGAN disatukan dengan `case_studies.quote`.** Keduanya
sama-sama kalimat dalam tanda kutip, dan di situ kemiripannya berhenti: yang di
case study adalah kutipan MASALAH kliennya — kalimat pembuka cerita, tanpa nama
siapa pun — sedangkan yang di sini pujian bernama dan berjabatan yang butuh izin
orang sungguhan sebelum tayang. Menyatukannya berarti satu tabel yang separuh
barisnya selalu tanpa nama. Perputaran izin itu juga yang membuat `draft`
testimoni berguna: izin memakai kutipan bisa dicabut, dan menariknya dari situs
tidak boleh berarti mengetik ulang kalimatnya kalau izinnya kembali.

**`industries` adalah tabel berbatas jumlah yang PERTAMA: maksimal 13 baris
boleh `live` bersamaan** (`MAX_LIVE_INDUSTRIES` di `shared/industry.ts`;
`process_steps` menyusul dengan batas 6 — alasannya beda, lihat di bawah).
Batasnya geometri, bukan selera: framing kamera dan animasi plank-ke-kartu-fokus
tumpukan spiral 3D di `IndustriesStack.tsx` dikalibrasi untuk busur sepanjang
13 plank, dan plank ke-14 memanjat keluar bingkai. Batas itu **SENGAJA tidak
dipaksakan lewat `CHECK`** seperti baris tunggal `vision`: "paling banyak 13
baris hidup" butuh menghitung baris lain — di Postgres itu berarti trigger,
dan trigger yang menolak simpan sampai ke editor sebagai galat database mentah.
Penjaganya `routes/industries.ts`, yang menjawab 422 dengan kalimat yang bisa
ditindaklanjuti ("Jadikan salah satu sektor lain Draft atau hapus dulu…"),
dilaporkan di isian Status. Ke bawah bebas berapa pun, sampai kosong —
`Industries.tsx` merender `null` untuk daftar kosong (§10c).

`sort_order` industri menanggung DUA hal tayang sekaligus: anak tangga spiral
mana yang ditempati sebuah sektor, dan nomor "01"–"13" yang tercetak di HUD,
navigasi sentuh, dan kepala kartu fokus — nomor itu TIDAK disimpan, diturunkan
dari posisi baris seperti di layanan. `tier` (`core` | `also`) **BUKAN urutan
dengan nama lain**: ia cuma memilih label yang dicetak ("Core Focus" vs
"Sector"), dan tiga sektor `core` hari ini kebetulan saja tiga teratas —
keduanya bergerak sendiri-sendiri. Tidak ada kolom teks alternatif foto, dan
itu bukan kelupaan: fotonya tekstur WebGL di dalam pembungkus `aria-hidden`,
tidak ada satu pun `<img>` yang bisa memakainya.

**`vision` adalah SATU-SATUNYA tabel satu baris, dan "satu"-nya dipaksakan di
database** — `CHECK vision_satu_baris` (`id = 1`), bukan sekadar disepakati di
kode. Kalau baris kedua pernah lolos, `getVision()` akan memilih salah satunya
secara acak antar query: halaman depan berganti-ganti kalimat tiap publish,
tanpa satu pun galat. Tiga kolom yang ada di semua tabel konten lain sengaja
TIDAK ada di sini:

- **`state`** — draft pada entitas tunggal berarti seksinya hilang dari halaman
  depan, dan seksi Visi TIDAK BOLEH menghilang: `pt-20 pb-20` miliknya
  satu-satunya yang menjatah celah 80px antara plank Industries (tanpa `pb`)
  dan Contact (`pt-0`) di mobile. Yang bisa diubah editor cuma isinya, bukan
  keberadaannya.
- **`sort_order`** — tidak ada yang bisa diurutkan terhadap apa pun.
- **`deleted_at`** — visi tidak bisa dihapus, cuma diganti kalimatnya; kolom
  yang selamanya `null` cuma memberi kesan ada jalur hapus yang tidak ada.

`published_at` TETAP ada: badge "belum tayang" bekerja dari perbandingan cap
waktu dan tidak peduli entitasnya tunggal atau daftar — justru badge itu
satu-satunya yang memberi tahu editor bahwa kalimat yang barusan diketik belum
sampai ke pengunjung, karena visi tidak punya draf yang menahannya (§9a).
`saveVision()` memakai **upsert**, bukan baca-dulu-lalu-insert-atau-update: dua
penyimpanan yang berlomba akan sama-sama insert dan yang kedua menabrak primary
key.

**`deployments` satu-satunya entitas yang identitasnya PASANGAN dua kolom.**
Sektor sendirian bukan pengenal: "Logistics · Indonesia" dan "Logistics ·
International" adalah dua kartu yang sah tayang berdampingan. Indeks uniknya
karena itu `deployments_sector_region_alive` atas (sector, region) — dan
membawa syarat tambahan **`region <> ''`**, sebab draf boleh disimpan dengan
wilayah kosong dan dua draf separuh jadi tidak boleh saling mengunci. Penjaga
route memang sengaja melewatkan pasangan yang separuh kosong, dan dua penjaga
yang tidak sepakat lebih buruk daripada satu penjaga yang longgar: tanpa
syarat itu yang menjawab adalah galat database mentah, bukan kalimat (§14).
Pemeriksaan kembarnya sendiri di route, case-insensitive, dan galatnya SENGAJA
mendarat di isian Wilayah, bukan Sektor — supaya editor tidak menyimpulkan
nama sektornya terlarang lalu mengarang nama palsu.

`deployments` TIDAK berbatas jumlah, meski bertetangga dengan dua entitas
berbatas: grid-nya (`sm:grid-cols-2 lg:grid-cols-3`) tinggal menambah baris ke
bawah, jadi kartu keempat belas tidak merusak apa pun. `sort_order`-nya
menanggung dua hal tayang, seperti di industri: posisi kartu di grid DAN nomor
"01"–"NN" di baris meta — nomor itu tidak disimpan, diturunkan dari posisi
baris tayang. Fotonya kolom `photo_id` per baris, dan itu perbaikan bug
diam-diam: sebelum CMS gambar dicari lewat peta `SECTOR_IMAGE` berkunci NAMA
sektor, jadi mengganti "Hospitality" menjadi "Hotels & Resorts" menjatuhkan
kartunya ke foto default tanpa error (§14). `closed` ala lowongan tidak ada:
sistem yang tidak lagi dipamerkan dicabut dari grid, bukan "ditutup".

**`process_steps` entitas berbatas KEDUA: maksimal 6 langkah tayang**
(`MAX_LIVE_PROCESS_STEPS` di `shared/processStep.ts`) — dan alasannya sengaja
dibedakan dari batas 13 industri di semua komentarnya. Yang di industri
geometri (plank ke-14 memanjat keluar bingkai kamera); yang di sini **panjang
halaman**: enam slot `min-h-[55svh]` + landasan `45svh` sudah menjadikan "How
We Work" bagian terpanjang di halaman depan (±3,5 layar), dan jumlah
ilustrasinya memang enam — talinya sendiri menyesuaikan, tujuh kartu akan
tergambar rapi. Penegakannya meniru industri: di route (422 berkalimat), tapi
kalimatnya kini konstanta `PESAN_BATAS_PROSES` di `shared/` supaya panel bisa
mengucapkan kalimat yang sama; tombol Tambah mati saat penuh; ke bawah bebas
sampai kosong.

**`glyph` adalah satu-satunya "gambar" CMS yang BUKAN berkas** — enum
`process_glyph` berisi enam nama (`discovery`, `strategy`, `design`,
`development`, `testing`, `deployment`) yang menunjuk komponen SVG di
`ProcessGlyphs.tsx`; tanpa `photo_id`, tanpa tabel `images`. Enum dan bukan
`text`, supaya nama ketujuh yang belum punya komponennya mustahil tersimpan.
Nilainya deskriptif-fungsional ("discovery"), bukan visual ("radar"):
mengganti coretannya tidak boleh memaksa migrasi kolom. Yang paling penting:
**ilustrasi milik LANGKAHNYA, bukan posisi barisnya.** Sebelum CMS kartu
mengambil `PROCESS_GLYPHS[i]` — pasangan berbasis posisi yang, begitu editor
bisa memindahkan baris, membuat dua langkah bertukar gambar tanpa galat
(kembaran bug `SECTOR_IMAGE` di atas, dengan posisi sebagai kunci alih-alih
nama — §14). Ilustrasi SENGAJA boleh kembar antar langkah: melarangnya membuat
menukar gambar dua langkah mustahil tanpa memarkir salah satunya di gambar
ketiga dulu. (Kunci `deployment` di enum ini kebetulan senama dengan entitas
Deployment — dua ruang nama yang tidak berhubungan.)

**Proyek dan case study tabel TERPISAH, meski tetangga di halaman yang sama.**
Keduanya memang punya judul, klien, tahun, dan satu baris hasil, jadi godaan
menyatukannya nyata. Yang menghentikannya: yang satu **baris dalam daftar**, yang
satu lagi **bacaan** — kutipan pembuka, beberapa paragraf uraian, dan lingkup
pekerjaan. Satu tabel gabungan berarti setengah kolomnya selalu kosong di separuh
barisnya, dan satu form yang memaksa editor menebak isian mana yang berlaku untuk
benda yang sedang dia tulis.

**Tahun disimpan `text`, bukan `integer`.** Ia tidak pernah dihitung, diurutkan,
atau dibandingkan — cuma dicetak apa adanya di sebelah nama klien. Kolom angka
hanya akan melarang bentuk yang sah dibaca orang, misalnya `2023–2024` untuk
pekerjaan yang melewati pergantian tahun. Yang menjaga isinya validasi, bukan
tipe kolomnya (§5b).

**`case_studies.desc` satu kolom berisi BEBERAPA paragraf, bukan tabel anak** —
padahal `work_project_tags` dan `case_study_scopes` di sebelahnya justru tabel
anak. Bedanya: paragraf tidak pernah diurutkan ulang, ditambah satu per satu,
atau dibaca terpisah dari tetangganya. Ia satu tulisan yang kebetulan punya jeda.
Konsekuensinya dibayar di tempat lain — lihat §5c.

**Union tertutup vs teks bebas.** `department` di lowongan teks bebas;
`category` di crew enum tertutup. Bedanya bukan selera: `TheCrew.tsx` memakai
daftar yang sama sebagai urutan tampil departemen, jadi departemen keempat yang
diketik editor akan tersimpan rapi di database lalu **tidak dirender sama
sekali** — tanpa error, tanpa baris kosong, tanpa petunjuk. Ditutup di enum,
penambahannya jadi migrasi yang memaksa situsnya ikut berubah.

Alasan yang sama berlaku untuk `social_platform`: nama platformnya **dicetak apa
adanya** sebagai teks tautan di situs, jadi nilai bebas akan langsung terbaca
pengunjung.

**`crew_state` enum sendiri, bukan menumpang `value_state`** meski isinya
kebetulan sama hari ini (`draft` | `live`). Enum yang dipakai bersama membuat
penambahan keadaan untuk salah satu entitas — misal "alumni" untuk crew —
diam-diam ikut jadi pilihan sah di form yang lain. `work_project_state`,
`case_study_state`, `service_state`, `testimonial_state`, `industry_state`,
`deployment_state`, dan `process_step_state`
mengulang keputusan yang sama, jadi sembilan enum berisi `draft | live` yang
identik hari ini; proyek
mungkin butuh "arsip" suatu saat, dan saat itu tiba ia tidak boleh muncul
sendiri di form crew.

**Kenapa `people_values`, bukan `values`.** `VALUES` kata kunci SQL, dan tabel
bernama begitu memaksa setiap query menulis tanda kutip yang cepat atau lambat
akan terlupa. Awalan `people_` sekaligus menjawab "nilai yang mana".

**Kenapa `crew_socials` tabel anak, bukan tiga kolom.** Platform keempat lewat
tabel anak cuma menambah satu nilai enum; lewat kolom ia menambah kolom yang
kosong untuk hampir semua baris.

Belajarnya kena di: relasi 1-N, PK gabungan, kolom terurut, enum, soft delete,
unique index parsial, jsonb, dan transaksi.

### §4c Seed sekali jalan, digerbangi PER TABEL

`bun run db:seed` membaca `FALLBACK_ROLES`, `FALLBACK_JOBS`, `FALLBACK_VALUES`,
`FALLBACK_CREW`, `FALLBACK_WORK_PROJECTS`, `FALLBACK_CASE_STUDIES`,
`FALLBACK_SERVICES`, `FALLBACK_TESTIMONIALS`, `FALLBACK_INDUSTRIES`,
`FALLBACK_DEPLOYMENTS`, `FALLBACK_PROCESS_STEPS`, dan
`FALLBACK_VISION` dari repo lalu memasukkannya ke Postgres. Konten yang sudah
ditulis tidak perlu diketik ulang, dan tidak ada kesempatan salah ketik saat
memindahkannya.

**Aman diulang:** kalau tabelnya sudah ada isinya, bagian itu berhenti tanpa
menyentuh apa pun — menimpa isi database dengan literal repo justru akan
MENGHAPUS suntingan editor.

> ⚠️ Gerbangnya **satu per tabel**, bukan satu untuk seluruh skrip. Database yang
> sudah pernah di-seed lowongan akan membuat nilai dan crew dilewati diam-diam
> kalau semuanya bergantung pada satu pemeriksaan: skripnya berhenti di baris
> pertama sambil melapor "sudah terisi", dan dua tabel lain tetap kosong tanpa
> ada yang salah kelihatannya. Aturan yang sama dipatuhi `seedWorkProjects()`,
> `seedCaseStudies()`, `seedServices()`, `seedTestimonials()`,
> `seedIndustries()`, `seedDeployments()`, `seedProcessSteps()`, dan
> `seedVision()` — dan di
> situlah gerbang per-tabel benar-benar terpakai, karena database lokal SUDAH
> terisi entitas-entitas sebelumnya setiap kali yang baru ditambahkan.

Semua baris nilai, crew, proyek, case study, layanan, testimoni, industri,
deployment, dan langkah cara kerja
masuk sebagai **`live`, bukan `draft`** — tiga belas orang, tiga nilai, delapan
kartu proyek, dua cerita, sembilan layanan, tiga kutipan, tiga belas sektor,
lima kartu deployment, dan enam langkah
itu memang sudah tayang hari ini. Menaruhnya sebagai draf akan MENGOSONGKAN
halaman People, Work, Services, dan tiga seksi Home pada publish pertama,
kerusakan yang tidak kelihatan sampai ada yang menekan tombolnya. Ketiga belas
sektor persis memenuhi `MAX_LIVE_INDUSTRIES` — seed mengisi tumpukan sampai
penuh, jadi sektor ke-14 lewat panel langsung ditolak sampai ada yang
di-draft-kan atau dihapus, dan itu memang yang diinginkan; keenam langkah cara
kerja mengulanginya untuk `MAX_LIVE_PROCESS_STEPS`. Baris visi diseed
dengan `id: 1` eksplisit (walau kolomnya sudah `default(1)`) supaya batasan
satu-barisnya terbaca di seed juga, bukan cuma di skema. Foto ketiga belas
sektor dan kelima kartu deployment semuanya **hotlink Unsplash** — tetap
`source: "static"`, dengan alasan
yang sama seperti gambar Work (§8). Langkah cara kerja satu-satunya seed
bergambar yang tidak menyentuh tabel `images` sama sekali: ilustrasinya enum
(§4b), dan `glyph`-nya ditulis dari literal, bukan dihitung dari index.

---

## §5 Validasi — ditulis sekali, dipakai dua kali

`shared/validateJob.ts`, `validateValue.ts`, `validateCrew.ts`,
`validateWorkProject.ts`, `validateCaseStudy.ts`, `validateService.ts`,
`validateTestimonial.ts`, `validateIndustry.ts`, `validateDeployment.ts`,
`validateProcessStep.ts`, dan `validateVision.ts`
dipanggil
**admin** saat mengisi form dan **server** saat menyimpan. Server tetap memeriksa
meski admin sudah memeriksa: yang menjaga data bukan antarmuka, melainkan
endpoint.

**Lowongan:**

| Isian | Maks | Isian | Maks |
|---|---|---|---|
| Judul | 120 | Keahlian (per item / jumlah) | 60 / 20 |
| Departemen | 60 | Paragraf pembuka | 1.200 |
| Ringkasan | 600 | Poin bullet (per item / jumlah) | 300 / 20 |
| Alamat halaman (slug) | 80, pola `^[a-z0-9]+(-[a-z0-9]+)*$` | | |

**Nilai:** judul 48 · baris pendek 80 · uraian 500.

Angkanya berasal dari **tata letaknya, bukan dari kolom database** (`text` tidak
punya batas). Judul dirender `text-6xl` di layar lebar dan berbagi satu baris
panel dengan foto serta uraian; judul sepanjang kalimat akan mendorong panelnya
lebih tinggi dari viewport, dan begitu itu terjadi tumpukan sticky-nya terasa
macet. Angkanya diambil ~2,5× dari isi yang ada sekarang — ada ruang bernapas
tanpa memberi ruang untuk esai.

**Crew:** nama 80 · jabatan 80 · tautan 300, maksimal satu tautan per platform.

**Selected work:** nama proyek 60 · klien 60 · tahun 20 · baris hasil 60 · label
30 per item, maksimal 6.

**Case study:** judul 60 · klien 60 · tahun 20 · sektor 40 · baris hasil 60 ·
kutipan pembuka 240 · cerita 3.000 dan maksimal 8 paragraf · lingkup 30 per item,
maksimal 6.

**Layanan:** nama layanan 60 · penjelasan 160 · rincian 40 per item, maksimal 10.

**Testimoni:** kutipan 280 · nama 60 · jabatan 100.

**Industri:** nama sektor 40 · kalimat penjelas 160.

**Deployment:** sektor 40 · wilayah 30 · keterangan 240.

**Cara kerja:** judul langkah 40 · kicker 18 · penjelasan 180.

**Visi:** kalimat 400.

Angka-angka Work diambil dari tata letaknya juga, dan dua kelompok yang berbeda
di dalam satu entitas: yang **di atas gambar** (meta, judul, hasil) ketat karena
tiap baris tambahan naik menutupi gambarnya, sedangkan yang **di dalam cerita**
(kutipan, uraian) longgar karena panelnya memang tumbuh mengikuti isi. Di
kelompok kedua yang dijaga bukan tata letak yang rusak melainkan pembaca yang
menyerah: satu case study adalah satu halaman bacaan, bukan laporan.

Angka layanan dan testimoni mengikuti logika yang sama. Nama layanan 60 ≈ 2×
judul terpanjang yang tayang hari ini — judulnya lewat sebagai teks troika di
sabuk yang lebarnya terbatas. Kutipan 280 punya alasan yang khas: **kutipan
terpanjang menentukan tinggi blok untuk SEMUA testimoni**, karena tinggi bloknya
dikunci sizer yang merender seluruh entri (§4a) — satu esai membuat kutipan
pendek pun berdiri di blok setinggi esai itu.

Nama sektor 40 adalah angka tata letak yang paling sempit di seluruh CMS:
nama itu tampil di kolom navigasi sentuh `‹ nama ›` yang **lebarnya sengaja
TETAP** (`w-[15.5rem]` di `IndustriesStack.tsx` — kolom yang melar membuat
kedua panah ikut bergeser tiap ganti sektor), muat ±26 karakter sebelum
`truncate` memotongnya dengan elipsis. Kalimat visi 400 ≈ 2,3× kalimat yang
tayang sekarang: kalimatnya dirender sangat besar (`text-3xl`/`text-5xl`), dan
yang panjang mendorong fotonya (`sm:h-[90vh]`) keluar viewport.

Angka dua entitas Home yang baru diturunkan dari kartunya juga. Kartu
deployment `aspect-[4/3]` ber-`overflow-hidden` menempelkan isinya ke DASAR
kartu, jadi teks kepanjangan tidak meluber ke bawah melainkan mendorong judul
sektornya keluar lewat ATAS — batasnya dihitung di kasus tersempit (grid dua
kolom ±640px, isi kartu ±265px bersih); keterangan 240 ≈ 1,5× kalimat
terpanjang yang tayang hari ini. Batas langkah cara kerja (40/18/180)
mengikuti kartu selebar `min(20rem, 68vw)` — ±2× isi terpanjang hari ini.

### §5a Ketatnya IKUT STATUS

Kesepuluh entitas berdaftar memakai aturan yang sama: **draf cuma perlu isian
pengenalnya** — judul untuk nilai, nama + departemen untuk crew, judul saja
untuk proyek, case study, layanan, dan langkah cara kerja, nama saja untuk
testimoni dan sektor industri, sektor saja untuk kartu deployment — supaya
editor bisa menyimpan pekerjaan setengah jalan tanpa
dimarahi. Pemeriksaan penuh baru berlaku begitu statusnya Tayang/Live, yaitu
tepat saat isinya akan dibaca pengunjung. (Langkah cara kerja sedikit lebih
ketat: `glyph` dan `state` divalidasi bahkan untuk draf, karena enum tidak
punya keadaan "belum diisi".)

**Visi tidak ikut aturan ini karena tidak punya status**: satu-satunya isi yang
ada adalah isi yang tayang, jadi pemeriksaannya selalu penuh — kalimat dan foto
dua-duanya wajib, setiap kali disimpan.

### §5b Aturan yang bukan sekadar panjang

- **Foto wajib untuk lowongan yang Tayang/Ditutup dan untuk nilai yang Live.**
  Panel nilai memang punya keadaan tanpa foto — bingkai bertuliskan "Photo" —
  tapi itu tempat penampung untuk masa isinya belum ada, bukan tampilan yang
  boleh dilihat pengunjung.
- **Gambar wajib untuk proyek dan case study yang Live, dan ini lebih keras
  daripada foto nilai.** Kartu di `CaseGrid.tsx` seluruhnya `<img>` yang memenuhi
  kotaknya — tanpa gambar yang tayang bukan kartu polos melainkan ikon "gambar
  rusak" bawaan peramban, di kartu terdepan halaman Work. Di case study,
  gambarnya sekaligus **tombol pembuka cerita**: tanpa gambar tidak ada yang bisa
  diklik untuk membacanya.
- **Foto TIDAK wajib untuk crew.** Kotak tanpa foto punya tampilan yang memang
  dirancang (ikon orang di `CrewAvatar`), dan empat dari tiga belas baris yang
  tayang hari ini memang begitu. Mewajibkannya berarti seed dari konten yang
  sudah tayang langsung gagal, dan editor dipaksa mengunggah foto asal-asalan
  supaya bisa menyimpan.
- **Detail EN dan ID lowongan harus dua-duanya ada, atau dua-duanya kosong.**
  Halaman lowongan punya toggle EN/ID, jadi satu bahasa yang kosong berarti
  pengunjung yang menekan toggle mendarat di halaman kosong.
- **Tautan sosial harus diawali `https://`**, kecuali `"#"`. Alamat tanpa skema
  — "linkedin.com/in/budi" — tidak dibaca peramban sebagai alamat luar melainkan
  sebagai halaman DI SITUS INI, jadi pengunjung yang mengkliknya mendarat di 404
  cogniti.id. Tidak ada error di mana pun; yang terjadi cuma tautan yang "kadang
  tidak jalan". `"#"` diterima apa adanya karena itu isi hampir semua baris hari
  ini — menolaknya berarti seed dari konten yang sudah tayang gagal seluruhnya.

- **Tahun harus memuat empat angka.** Kolomnya `text` supaya `2023–2024` boleh
  (§4b), tapi tanpa penjaga apa pun "tahun lalu" atau isian setengah akan lolos
  ke situs dan dicetak apa adanya di sebelah nama klien. Yang diperiksa cuma
  `\d{4}` ada di dalamnya — cukup untuk menahan isian yang bukan tahun, tanpa
  melarang bentuk yang benar.
- **Baris hasil WAJIB untuk case study, tapi TIDAK untuk kartu proyek.** Ini satu
  aturan yang sengaja berbeda di antara dua entitas yang mirip, dan sebabnya ada
  di komponennya: `CaseGrid.tsx` sudah menggerbangi barisnya berikut garis
  pemisah di atasnya, jadi kartu tanpa hasil adalah tampilan yang memang
  dirancang — tidak semua pekerjaan punya satu angka yang pantas dipamerkan.
  `CaseStudySpotlight.tsx` sebaliknya mencetaknya tebal di antara judul dan
  ajakan "Read the full story"; kosong di sana berarti ruang menganga di tempat
  yang paling dilihat.
- **Label kembar dalam satu baris ditolak, tanpa memperhatikan besar-kecil
  huruf.** Berlaku untuk label proyek dan lingkup case study: keduanya dirender
  `key={label}`, dan "Web Platform" + "web platform" adalah dua key berbeda bagi
  React tapi satu hal yang sama bagi pembaca. Baris kosong dibuang diam-diam
  (form-nya memang menyediakan baris kosong untuk diketik), yang kembar
  ditolak dengan kalimat.
- **Penjelasan WAJIB untuk layanan yang Live** — padahal ia tidak pernah
  terlihat mata. Justru itu alasannya: sabuk 3D `aria-hidden` dan teksnya troika
  (tidak ada di DOM), jadi daftar `sr-only` ber-penjelasan inilah SATU-SATUNYA
  halaman Services yang sampai ke pembaca layar dan mesin pencari. Layanan tanpa
  penjelasan tayang sebagai "Nama Layanan:" lalu berhenti — dan tidak ada yang
  melihatnya rusak. Rincian kembar ikut ditolak, tapi bukan karena key React
  (rincian cuma di-`join(", ")`): kalimat yang menyebut hal yang sama dua kali
  terdengar seperti salah ketik di telinga pemakai pembaca layar.
- **Foto DAN kalimat penjelas WAJIB untuk sektor industri yang Live.** Foto
  karena plank tanpa tekstur adalah lempeng kosong di tumpukan terdepan halaman
  depan; kalimat penjelas dengan alasan yang sama seperti layanan — tumpukan
  3D-nya `aria-hidden`, jadi daftar `sr-only` ber-kalimat itulah satu-satunya
  bentuk strip industri yang sampai ke pembaca layar dan mesin pencari.
- **Jabatan WAJIB untuk testimoni yang Live.** Tanpa jabatan, yang tayang adalah
  nama orang asing di bawah sebuah pujian — yang membuat testimoni berarti
  justru "siapa yang bilang". Kutipannya sendiri diketik TANPA tanda kutip:
  situs yang menambahkan " dan " sendiri, jadi editor yang ikut mengetikkannya
  menghasilkan kutip ganda.
- **Foto, wilayah, dan keterangan WAJIB untuk kartu deployment yang Live.**
  Foto dengan alasan kartu proyek — kartunya `<img>` yang memenuhi kotaknya,
  dan satu kartu polos di sebelah empat kartu berfoto terbaca sebagai gambar
  yang gagal dimuat. Wilayah karena baris metanya dicetak `"03 · Indonesia"`:
  tanpa wilayah yang tayang adalah `"03 · "` menggantung.
- **Pasangan sektor+wilayah kembar ditolak — bukan sektornya.** "Logistics"
  boleh dipakai dua kartu asal wilayahnya beda. Pemeriksaannya di route, bukan
  di validator (butuh melihat seluruh daftar, dan form tidak memilikinya),
  case-insensitive; galatnya mendarat di isian Wilayah (§4b).
- **Kicker dan penjelasan WAJIB untuk langkah cara kerja yang Live; judul
  WAJIB bahkan untuk draf** — judul satu-satunya pembeda baris di panel, dan
  draf tanpa judul tidak bisa dikenali untuk disunting lagi. Ilustrasi
  (`glyph`) yang tidak dikenal SENGAJA tidak dijatuhkan ke default oleh parser
  route: dibiarkan lolos supaya validator menolaknya dengan kalimat — gambar
  salah yang dipilih diam-diam tidak pernah kelihatan salah (§6).

`JOB_FIELD_ORDER` / `VALUE_FIELD_ORDER` / `CREW_FIELD_ORDER` /
`WORK_PROJECT_FIELD_ORDER` / `CASE_STUDY_FIELD_ORDER` / `SERVICE_FIELD_ORDER` /
`TESTIMONIAL_FIELD_ORDER` / `INDUSTRY_FIELD_ORDER` / `DEPLOYMENT_FIELD_ORDER` /
`PROCESS_STEP_FIELD_ORDER` / `VISION_FIELD_ORDER`
menetapkan urutan
isian, dipakai admin untuk memilih masalah PERTAMA dan melompatkan fokus ke sana
— bukan menumpahkan sepuluh galat sekaligus.

### §5c Uraian case study: satu-satunya bentuk yang dibawa SPASI PUTIH

`case_studies.desc` menyimpan beberapa paragraf dalam satu kolom, dipisah baris
kosong, dan situs memecahnya lagi dengan `desc.split("\n\n")`. Artinya bentuk
tampilannya tidak dijaga struktur data mana pun — ia dijaga **karakter yang tidak
terlihat**, dan itu satu-satunya tempat seperti itu di seluruh CMS ini.

Yang menjaganya `normalizeDesc()` di `shared/validateCaseStudy.ts`, dipakai
**form dan server sekaligus** — bukan hanya salah satu. Kalau cuma form yang
merapikan, teks yang divalidasi bukan teks yang tersimpan, dan uraian sepanjang
2.998 karakter bisa lolos pemeriksaan lalu mendarat di database sebagai 3.010.
Tiga hal dirapikan, semuanya karena tidak terlihat saat diketik:

| Ketikan | Jadi | Kenapa |
|---|---|---|
| `\r\n` (Windows) | `\n` | `split("\n\n")` tidak mengenali `\r\n\r\n` |
| Enter tiga kali atau lebih | satu baris kosong | yang menekan Enter empat kali memaksudkan satu jeda, bukan dua paragraf kosong |
| spasi di ujung baris | dibuang | `"\n \n"` bukan pemisah paragraf, dan spasinya tak terlihat di textarea |

**Satu Enter BUKAN paragraf baru** — itu perilaku yang benar (`\n` tunggal
memang bukan pemisah), tapi editor tidak punya cara melihat bedanya di kotak
teks. Karena itu form menampilkan penghitung hidup di bawahnya: *"2 paragraf akan
tayang."* Angkanya yang memberi tahu, bukan tampilan kotaknya.

---

## §6 API

Hono di atas `@hono/node-server`. Adapter Node dipakai dengan sengaja meski lokal
memakai Bun: **VPS-nya hanya punya Node**, dan API yang cuma bisa hidup di Bun akan
ketahuan saat deploy, bukan sekarang.

```
GET    /api/health

POST   /api/auth/login       password → cookie sesi     (TANPA email — §7)
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/jobs             daftar untuk admin (TERMASUK draft)
GET    /api/jobs/:id
POST   /api/jobs             201
PUT    /api/jobs/:id         seluruh lowongan, bukan sebagian
DELETE /api/jobs/:id         soft delete

GET    /api/values           daftar untuk admin (TERMASUK draft)
POST   /api/values           201
POST   /api/values/urutkan   seluruh daftar id dalam urutan barunya
GET    /api/values/:id
PUT    /api/values/:id
DELETE /api/values/:id

GET    /api/crew             daftar untuk admin (TERMASUK draft)
POST   /api/crew             201
GET    /api/crew/:id
PUT    /api/crew/:id
DELETE /api/crew/:id

GET    /api/projects            Selected work — daftar admin (TERMASUK draft)
POST   /api/projects            201
POST   /api/projects/urutkan    seluruh daftar id dalam urutan barunya
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id

GET    /api/case-studies          daftar untuk admin (TERMASUK draft)
POST   /api/case-studies          201
POST   /api/case-studies/urutkan  seluruh daftar id dalam urutan barunya
GET    /api/case-studies/:id
PUT    /api/case-studies/:id
DELETE /api/case-studies/:id

GET    /api/services              layanan — daftar admin (TERMASUK draft)
POST   /api/services              201
POST   /api/services/urutkan      seluruh daftar id dalam urutan barunya
GET    /api/services/:id
PUT    /api/services/:id
DELETE /api/services/:id

GET    /api/testimonials          daftar untuk admin (TERMASUK draft)
POST   /api/testimonials          201
POST   /api/testimonials/urutkan  seluruh daftar id dalam urutan barunya
GET    /api/testimonials/:id
PUT    /api/testimonials/:id
DELETE /api/testimonials/:id

GET    /api/industries            daftar untuk admin (TERMASUK draft)
POST   /api/industries            201 — Live ke-14 ditolak 422 (§4b)
POST   /api/industries/urutkan    seluruh daftar id dalam urutan barunya
GET    /api/industries/:id
PUT    /api/industries/:id        aturan batas 13 yang sama
DELETE /api/industries/:id

GET    /api/deployments           daftar untuk admin (TERMASUK draft)
POST   /api/deployments           201
POST   /api/deployments/urutkan   seluruh daftar id dalam urutan barunya
GET    /api/deployments/:id
PUT    /api/deployments/:id
DELETE /api/deployments/:id

GET    /api/process-steps         daftar untuk admin (TERMASUK draft)
POST   /api/process-steps         201 — Live ke-7 ditolak 422 (§4b)
POST   /api/process-steps/urutkan seluruh daftar id dalam urutan barunya
GET    /api/process-steps/:id
PUT    /api/process-steps/:id     aturan batas 6 yang sama
DELETE /api/process-steps/:id

GET    /api/vision                { vision } — null kalau barisnya belum ada
PUT    /api/vision                upsert baris 1; TIDAK ada POST/DELETE/urutkan

GET    /api/images
POST   /api/images           multipart → resize + WebP

GET    /api/publish/status   { pending: n }   ← satu angka untuk SEMUA entitas
POST   /api/publish          tulis content.json

GET    /uploads/*            statis, TANPA login
```

**Tidak ada `/api/crew/urutkan`**, dan itu disengaja — lihat §4b.

**PUT, bukan PATCH** — body-nya seluruh baris, dan apa pun yang tidak ikut
dikirim akan hilang. Semantiknya cocok dengan form admin yang memang selalu
mengirim seluruh isian; PATCH akan menjanjikan "kirim yang berubah saja" — janji
yang tidak ditepati kode ini, dan cara menemukannya adalah lewat halaman yang
tiba-tiba kosong.

**`requireLogin` dipasang di SATU tempat**, sebagai `app.use()` untuk seluruh
prefix `/api/jobs`, `/api/values`, `/api/crew`, `/api/projects`,
`/api/case-studies`, `/api/services`, `/api/testimonials`, `/api/industries`,
`/api/deployments`, `/api/process-steps`,
`/api/vision`, `/api/images`,
`/api/publish` — bukan ditempel per handler. Visi belum punya route anak
(cuma `GET /` dan `PUT /`), tapi pasangan `/*`-nya tetap dipasang seperti yang
lain: itulah yang membuat endpoint berikutnya lahir sudah terjaga. Penjaga yang ditempel satu per satu akan terlewat
pada endpoint berikutnya yang ditambahkan, dan lubang seperti itu tidak
memunculkan error: endpoint-nya justru bekerja dengan baik, untuk siapa saja.

> ⚠️ Tiap prefix butuh **dua baris** — `"/api/crew/*"` DAN `"/api/crew"`. Yang
> berbintang tidak mencakup path telanjangnya.

**`/uploads/*` sengaja TANPA login** — berkasnya dirujuk `<img src>` di situs
publik, dan pengunjung tentu tidak punya sesi. Yang dijaga adalah siapa yang boleh
MENGUNGGAH, bukan siapa yang boleh melihat.

**Satu `app.onError` untuk seluruh API.** Isi galat aslinya masuk log proses,
TIDAK ke respons: pesan Postgres bisa memuat nama tabel dan potongan query.

`app.ts` merakit, `index.ts` membuka port. Pemisahan itu yang membuat test bisa
memanggil `app.request("/api/jobs")` langsung tanpa menyalakan server sungguhan
dan tanpa berebut port dengan proses dev yang sedang jalan.

**Body mentah tidak pernah dipercaya.** Tiap route punya `parse…Input()` yang
memaksa setiap isian ke bentuknya: satu `null` di tempat string sudah cukup
membuat `.trim()` melempar dan endpoint membalas 500 tanpa keterangan berguna.
Dua perlakuan yang berbeda di dalamnya, dan bedanya disengaja:

- **Platform sosial yang tidak dikenal DIBUANG** diam-diam. Editor tidak pernah
  bisa mengetiknya sendiri — form-nya `<select>` berisi tiga pilihan — jadi nilai
  asing artinya body-nya bukan dari form, dan pesan berbahasa Indonesia untuk
  kasus itu cuma akan membingungkan orang yang benar.
- **Departemen crew yang tidak dikenal DILOLOSKAN** apa adanya ke validator,
  supaya ditolak dengan kalimat yang bisa dibaca. Departemen tidak punya nilai
  bawaan yang aman: "Management" untuk orang yang seharusnya Developer adalah
  kesalahan yang tersimpan diam-diam.
- **Ilustrasi langkah cara kerja mengikuti departemen, bukan status.** `state`
  yang tidak dikenal jatuh aman ke `draft`; `glyph` yang tidak dikenal
  DILOLOSKAN ke validator, karena gambar tidak punya nilai jatuh yang aman —
  ilustrasi default yang terpasang diam-diam tidak pernah kelihatan salah.

### §6a Simpan — tiga bentuk, sesuai lebar entitasnya

| Entitas | Tabel tersentuh | Transaksi? |
|---|---|---|
| Lowongan | `jobs` + 3 tabel anak | ya |
| Nilai | `people_values` saja | tidak perlu |
| Crew | `crew_members` + `crew_socials` | ya |
| Selected work | `work_projects` + `work_project_tags` | ya |
| Case study | `case_studies` + `case_study_scopes` | ya |
| Layanan | `services` + `service_subs` | ya |
| Testimoni | `testimonials` saja | tidak perlu |
| Industri | `industries` saja | tidak perlu |
| Deployment | `deployments` saja | tidak perlu |
| Cara kerja | `process_steps` saja | tidak perlu |
| Visi | `vision` saja — upsert baris 1 | tidak perlu |

Anak-anaknya **dihapus lalu ditulis ulang, bukan di-diff** — jumlah barisnya
belasan, dan diff yang salah jauh lebih mahal daripada tulis ulang yang benar.
Gagal di tengah tidak boleh meninggalkan orang yang tautan sosialnya sudah
terhapus tapi yang baru belum masuk.

Dua detail yang gampang terlewat, berlaku untuk semua entitas:

- **`updatedAt` diisi manual saat UPDATE.** Postgres tidak menyentuh
  `default now()` saat UPDATE, hanya saat INSERT. Lupa baris itu = badge "belum
  tayang" tidak pernah menyala dan editor mengira perubahannya sudah tayang.
- **Baris baru mendarat di tempat yang masuk akal.** Lowongan baru mendapat
  `sortOrder = min - 1` sehingga muncul di ATAS daftar — editor baru saja
  mengetiknya. Nilai baru justru mendarat di BAWAH, karena di sana urutannya
  adalah tumpukan panel yang terlihat pengunjung: menyisipkan nilai baru ke
  puncak berarti mengubah panel pembuka halaman tanpa diminta. Proyek, case
  study, layanan, testimoni, sektor industri, kartu deployment, dan langkah
  cara kerja mengikuti nilai — untuk proyek
  alasannya paling kuat (kartu pertama adalah yang terbuka saat halaman Work
  dibuka), untuk
  testimoni sama kerasnya (baris teratas adalah satu-satunya kutipan yang
  terlihat saat halaman dibuka), dan untuk industri, deployment, serta cara
  kerja baris baru yang menyelinap
  ke puncak berarti merombak nomor "01"–"NN" SEMUA baris lain. Kalau memang
  harus di depan, tombol "Naikkan" ada di sebelahnya.
- **`desc` case study dirapikan `normalizeDesc()` sebelum disimpan, di SETIAP
  jalur tulis** — saat dibuat maupun saat disimpan ulang. Melewatkannya di salah
  satunya berarti teks yang lolos validasi bukan teks yang mendarat di database
  (§5c).

### §6b Kenapa urutan punya endpoint sendiri

`POST /api/values/urutkan` — dan sesudahnya `/api/projects/urutkan`,
`/api/case-studies/urutkan`, `/api/services/urutkan`,
`/api/testimonials/urutkan`, `/api/industries/urutkan`,
`/api/deployments/urutkan`, serta `/api/process-steps/urutkan`, delapan
entitas dengan endpoint yang bentuknya persis
sama — menerima **seluruh daftar id dalam urutan barunya**, bukan satu id + posisi
baru. Daftar yang tidak menyebut semua baris hidup ditolak
bulat-bulat (422): yang tidak disebut akan tertinggal di `sortOrder` lamanya dan
bertabrakan dengan yang baru — urutan hasilnya tidak sama dengan yang mana pun
dari kedua versi, dan itu justru bentuk kerusakan yang paling sulit dibaca.

Reorder **menaikkan `updatedAt`** semua baris yang ikut. Memindahkan panel adalah
perubahan yang tayang, jadi badge "belum tayang" harus menyala.

Endpoint terpisah dan bukan isian di form, karena isian berarti meminta editor
mengarang angka `sortOrder` padahal yang dia lihat adalah tumpukan panel.

Crew **sengaja tidak punya endpoint ini** meski tabelnya mirip: halaman People
mengurutkan crew A-Z sendiri, jadi tombol Naikkan di sana akan menggerakkan baris
di panel tanpa menggerakkan apa pun di situs (§4b).

> ⚠️ `POST /urutkan` didaftarkan **sebelum** `/:id`. Hono mencocokkan route sesuai
> urutan pendaftaran; kalau suatu saat ada `POST /:id` yang didaftarkan lebih
> dulu, "urutkan" akan tertangkap sebagai sebuah id.

---

## §7 Auth & sesi

### §7a Masuk dengan kata sandi saja

Layar masuk cuma punya satu isian. **Ini bukan "satu sandi bersama":** tiap orang
tetap punya akun sendiri dengan sandinya sendiri, dan sandi itulah yang mengenali
dia. Yang hilang cuma satu isian yang harus diketik, bukan identitasnya —
`audit_log` tetap bisa menjawab siapa yang mengubah apa, dan mencabut akses satu
orang tetap cukup dengan menghapus akunnya, tanpa mengganggu yang lain.

Konsekuensinya sandi jadi **PENGENAL, bukan lagi sekadar bukti**, dan dari situ
dua hal mengikuti:

1. **Dua akun tidak boleh bersandi sama.** `bun run user:create` yang menjaganya:
   sandi baru dicoba ke semua akun hidup lain, dan yang kembar ditolak sebelum
   tersimpan. Tanpa penjaga itu salah satunya tidak akan pernah kebagian — yang
   satu masuk sebagai yang lain, tanpa galat, dan `audit_log` menuliskan nama
   yang keliru.
2. **SEMUA akun dicoba saat login, tanpa berhenti di yang cocok.** Berhenti lebih
   awal membuat lamanya balasan bergantung pada akun keberapa yang cocok — dan
   `scrypt` sengaja mahal, jadi selisihnya bukan mikrodetik melainkan ratusan
   milidetik: cukup untuk dibaca dari jauh. Dengan tim sebesar ini ongkosnya
   beberapa ratus milidetik sekali login, sekali sehari.

Kalau tidak ada akun sama sekali, satu hash tetap dihitung, supaya balasan
"database kosong" tidak lebih cepat daripada "sandi salah".

### §7b Sisanya

- **scrypt**, bukan pbkdf2 — dirancang mahal di MEMORI, dan sudah ada di Node
  tanpa dependensi tambahan. Format hash: `scrypt$<salt hex>$<key hex>`.
- **Sesi disimpan di tabel `sessions`**, bukan JWT. Sesi di DB bisa dicabut
  seketika; JWT berlaku sampai kedaluwarsa, apa pun yang terjadi.
- **30 hari.** Cukup lama supaya editor yang membuka admin sebulan sekali tidak
  selalu disambut layar login.
- Cookie `httpOnly`, `sameSite: "Lax"`, dan **`secure` hanya di produksi** — kalau
  `secure` selalu menyala, login jalan di lokal dan gagal di server tanpa gejala
  yang menunjuk ke cookie.
- **Tidak ada halaman daftar-akun.** Akun dibuat dari terminal: `bun run user:create`.
  Email masih disimpan dan masih unik — ia yang membedakan "ganti sandi orang
  yang sama" dari "bikin akun kedua" — cuma tidak lagi diketik saat masuk.
- `attachActor` jalan untuk SEMUA route, termasuk yang tidak butuh login, supaya
  audit log tetap tahu pelakunya.

---

## §8 Gambar

`POST /api/images` → `sharp` → **lebar maksimum 1.200 px** (`withoutEnlargement`,
jadi gambar kecil tidak dipaksa membesar) → **WebP kualitas 82** → simpan ke
`uploads/` → catat dimensi & ukuran ke tabel `images`. Batas unggah 15 MB;
tipe yang diterima JPEG, PNG, WebP, AVIF, HEIC/HEIF (foto dari iPhone masuk apa
adanya, tidak perlu dikonversi dulu).

`PemilihFoto` dipakai **delapan dari sebelas form** — lowongan, nilai, crew,
Selected work, case study, industri ("Foto plank"), deployment ("Foto kartu"),
dan visi. Tiga form tidak memakainya sama sekali: layanan
memang tidak bergambar, testimoni sengaja tanpa kolom foto (§4b), dan langkah
cara kerja memilih ilustrasinya lewat radio enam pilihan bernama gambar
("Radar", "Artboard", …) — gambarnya komponen SVG, bukan berkas (§4b).
Komponennya menampilkan dua sumber sekaligus: foto lama di
`public/careers/` dan `public/people/` (baris `images` ber-`source: "static"`,
dimasukkan saat seed) dan foto unggahan baru (`source: "upload"`). Editor tidak
perlu tahu bedanya.

Yang berubah saat slice Work masuk: **kata-katanya**. Label "Foto" dan petunjuk
"Foto orangnya" tidak masuk akal untuk kartu proyek, jadi `PemilihFoto` mendapat
dua prop opsional `label` dan `petunjuk` yang **defaultnya persis kalimat
lowongan** — form lama tidak perlu disentuh sama sekali, dua form baru mengirim
kata-katanya sendiri ("Gambar proyek", "Gambar sampul").

Gambar proyek, case study, ketiga belas sektor industri, dan kelima kartu
deployment yang lama semuanya
**hotlink Unsplash**, bukan berkas
di disk. Seed tetap mendaftarkannya ke tabel `images` dengan `source: "static"`,
dan itu jawaban yang benar meski tidak ada berkasnya: satu-satunya tugas kolom
`source` adalah "CMS boleh memilih ini, tapi TIDAK BOLEH menghapusnya dari disk"
— dan URL yang memang tidak ada di disk jelas masuk kategori itu.

Satu berkas statis bisa dipakai lebih dari satu entitas, jadi seed memasangnya
dengan `onConflictDoNothing` lalu **mencari baris lamanya kalau tidak ada yang
dikembalikan** — tanpa itu, foto yang sudah terdaftar lewat lowongan akan membuat
nilai atau crew tersimpan tanpa `photoId`.

> ⚠️ Foto lama di `public/careers/` dan `public/people/` melewati grading ffmpeg
> manual (lihat `Documentations.md` §4an). **Foto unggahan baru akan terlihat
> berbeda** — ini diterima untuk sekarang, bukan bug.

> ⚠️ `public/careers/resource-development.jpg` dirujuk data tapi tidak ada di disk
> (pre-existing, bukan dari CMS). Efeknya: satu thumbnail rusak di pemilih foto.

---

## §9 Publish

`POST /api/publish`:

1. Query semua baris non-draft non-deleted dari **kesebelas entitas sekaligus**
   (`Promise.all`) → rakit `ContentPayload`
   (`{ version: 1, generatedAt, jobs, values, crew, projects, caseStudies,
   services, testimonials, industries, deployments, processSteps, vision }`).
   Tiga field bentuknya
   menyimpang: `industries` dan `processSteps` daftar biasa tapi panjangnya
   PALING BANYAK 13 dan 6
   (§4b), dan `vision` **satu objek, bukan larik** — satu-satunya field yang
   boleh `null`, artinya "barisnya belum ada di database, situs pakai isi
   bundle".
2. **Tulis atomik** ke `dist/content.json`: tulis ke `content.json.tmp-<pid>` di
   direktori yang sama, lalu `rename`. `rename` dalam satu filesystem bersifat
   atomik di tingkat OS, jadi pengunjung tidak pernah membaca berkas setengah
   tertulis.
3. Tandai `published_at` di kesebelas tabel — **sesudah** berkasnya
   benar-benar tertulis. (Untuk `vision` update-nya tanpa `where`: tabelnya
   memang cuma boleh punya satu baris, dan kalau barisnya belum ada, tidak
   menyentuh apa pun adalah jawaban yang benar.) Menandai lebih dulu lalu gagal menulis akan memadamkan badge "belum
   tayang" untuk perubahan yang sebenarnya tidak pernah tayang.
4. Purge cache Cloudflare (kalau `CF_ZONE_ID` + `CF_PURGE_TOKEN` diisi).
   **Gagal purge TIDAK menggagalkan publish** — berkasnya sudah tertulis; yang
   muncul cuma peringatan "perubahan mungkin baru terlihat beberapa menit lagi".
5. Catat ke `audit_log`, dengan jumlah per entitas di snapshot-nya.

**Kolom admin dibuang dari payload.** `updatedAt`, `publishedAt`, dan
`unpublished` dilepas di `collect()` untuk kesebelas entitas (visi juga
membuang `id`-nya — nomor baris yang selalu 1 tidak berguna bagi pengunjung) —
bukan dibiarkan ikut
"karena tidak ada yang membacanya": `content.json` diunduh SETIAP pengunjung, dan
bocornya jadwal sunting internal ke publik bukan sesuatu yang perlu terjadi demi
tiga baris yang tidak dipakai.

**Kenapa `dist/`, bukan `public/`:** `public/` disalin ke `dist/` saat build, jadi
menulis ke sana berarti perubahan baru tayang setelah `bun run build` berikutnya.
Menulis ke `dist/` membuat perubahan tayang seketika.

### §9a Badge "N perubahan belum tayang"

`GET /api/publish/status` mengembalikan **satu angka untuk semua entitas**: yang
ditanyakan editor adalah "apa masih ada yang perlu saya publish", bukan "berapa
di tabel mana".

Aturannya cukup tiga cap waktu, jadi ia ditulis **sekali** sebagai fungsi
`menunggu(r)` dan dipakai kesebelas entitas. Visi tidak punya `deletedAt`,
dan yang dilonggarkan BUKAN tipe `Stamps`-nya: query visi memetakan
`deletedAt: null` secara eksplisit, supaya entitas berikutnya yang PUNYA
`deletedAt` tidak bisa lupa mengirimkannya dan diam-diam berhenti menghitung
penghapusan. Kalau tiap entitas menyalin aturan ini,
perbaikan seperti yang di bawah akan diperbaiki di satu tempat dan tetap salah di
tempat lain.

- **Baris yang DIHAPUS ikut dihitung** selama penghapusannya sendiri belum tayang
  (`deletedAt > publishedAt`). Isinya masih terlihat pengunjung sampai publish
  berikutnya. Tanpa ini editor menghapus sesuatu, melihat badge tetap nol, dan
  menyimpulkan tidak perlu menekan Publish — sementara yang dihapus masih tayang.
  Yang dibandingkan `deletedAt` dan bukan sekadar "pernah tayang": begitu publish
  berikutnya jalan, baris itu sudah lenyap dari `content.json` dan tidak menunggu
  apa-apa lagi.
- **Draf tidak dihitung**, kecuali ia pernah tayang lalu diturunkan jadi draf.

Kalimat konfirmasi di `BarPublish` dirakit dari angka-angka itu, **melewati yang
nol**: "3 lowongan, 8 proyek" kalau memang cuma itu yang tayang, bukan "3
lowongan, 0 nilai, 0 orang, 8 proyek, 0 case study". Daftarnya satu array
`[jumlah, nama]` yang di-`filter` lalu di-`join`. **Visi disebut namanya saja,
tanpa angka** — ia bukan cacah baris melainkan ada/tidak ada, dan "1 visi" akan
terbaca seolah visi kedua mungkin ada; `PublishResult.vision` karena itu
bertipe `boolean`, bukan `number`.

> ⚠️ **Kalimat konfirmasi BELUM menyebut langkah cara kerja.** Selisih serupa
> pernah tersisa dari slice industri dan SUDAH dibayar slice deployment:
> `BarPublish` kini menyebut "N sektor" dan "N kartu deployment", dan tipe
> `tayangkan()` di `admin/src/api.ts` sudah lengkap sampai
> `processSteps: number`. Tapi angka `processSteps` itu belum di-destructure
> dan belum ditambahkan ke daftar `bagian`-nya. Bukan kerusakan — angkanya
> cuma tidak ikut disebut — tapi polanya berulang dua slice berturut-turut:
> entitas baru harus ingat menambah SATU baris `[jumlah, nama]` di
> `BarPublish.tsx`, dan tidak ada test yang menagihnya.

---

## §10 Integrasi ke situs — sengaja sekecil mungkin

Ini bagian paling berisiko, jadi dirancang supaya komponen section nyaris tidak
disentuh (wilayah kerja Nico, lihat `INVARIANTS.md`).

`src/lib/content/store.ts`:

- `loadContent()` dipanggil di `src/main.tsx`, dan `createRoot().render()` baru
  jalan di dalam `.then()`-nya.
- **Batas tunggu 1,5 detik** lewat `AbortController`. Berkasnya statis dan sejalur
  dengan HTML-nya, jadi normalnya selesai dalam puluhan milidetik; 1,5 detik adalah
  batas "ada yang tidak beres" — menunggu lebih lama tidak menolong siapa pun,
  karena isi cadangannya sudah ada di bundle sejak awal.
- **`cache: "no-cache"`** — berkas ini berubah tiap kali editor menekan Publish,
  dan salinan cache peramban akan membuat perubahan itu "tidak muncul" secara acak
  per pengunjung.
- **`version` diperiksa, bukan dipercaya.** Pengunjung bisa memegang HTML+JS lama
  yang ter-cache sementara `content.json`-nya sudah versi baru.
- Gagal, timeout, 404, atau bentuk tak dikenal → `console.warn`
  `[content] memakai konten bawaan bundle — <alasan>` lalu situs jalan dengan isi
  bundle. **`console.warn`, bukan `console.error`:** ini keadaan yang SUDAH ditangani.

### §10a Tiap bagian jatuh ke cadangan SENDIRI-SENDIRI

`contentJobs()`, `contentValues()`, `contentCrew()`, `contentWorkProjects()`,
`contentCaseStudies()`, `contentServices()`, `contentTestimonials()`,
`contentIndustries()`, `contentDeployments()`, `contentProcessSteps()`, dan
`contentVision()`
masing-masing memeriksa bagiannya sendiri, dan bagian yang
tidak ada TIDAK memvonis seluruh berkas.

Sebabnya arah kompatibilitas yang satunya: situs versi baru bisa memuat
`content.json` yang ditulis sebelum nilai dan crew masuk CMS, dan berkas seperti
itu sehat-sehat saja — cuma belum punya bagian ini. Menolak seluruh berkasnya
akan membuat lowongan ikut jatuh ke isi bundle demi satu field yang belum ada.
`version` tetap dinaikkan hanya kalau bentuk field LAMA berubah, bukan saat field
baru ditambahkan.

**Daftar KOSONG dari CMS dihormati apa adanya.** Yang jatuh ke cadangan cuma
`null` — artinya "berkasnya tidak terbaca". Kalau kosong ikut jatuh ke cadangan,
editor yang menghapus semua nilai akan melihat tiga nilai lama hidup kembali
sesudah Publish dan tidak punya cara menghapusnya.

**`contentVision()` satu-satunya pembaca TANPA keadaan "kosong yang
dihormati"** — seksi Visi tidak boleh menghilang (§4b), jadi tidak ada "daftar
kosong" untuk dihormati. Bentuknya juga bukan larik, jadi penjaganya
`typeof … === "object"` + pemeriksaan kedua field-nya string, bukan
`Array.isArray`. Isian kosong lalu ditangani `src/data/vision.ts` **per
isian**: kalimat kosong memakai kalimat cadangan, foto kosong memakai foto
cadangan — bukan semua-atau-tidak-sama-sekali.

### §10b Pembacanya FUNGSI, bukan konstanta

```
src/data/jobs.ts         jobPostings() · getJob(slug) · isJobPath(path)
src/data/careerRoles.ts  careerRoles()
src/data/people.ts       peopleValues() · crew()
src/data/work.ts         workProjects()
src/data/caseStudies.ts  caseStudies()
src/data/services.ts     services()
src/data/testimonials.ts testimonials()
src/data/industries.ts   industries()
src/data/deployments.ts  deployments()
src/data/processSteps.ts processSteps()
src/data/vision.ts       vision()
```

Semuanya memanggil `content*()`; kalau `null`, mereka mengembalikan
`FALLBACK_*` dari `src/data/*Fallback.ts`.

> 🔥 **`export const VALUES = ...` akan membekukan isi cadangan selamanya.**
> `content.json` baru mendarat sesudah `loadContent()` di `main.tsx`, sedangkan
> konstanta module-level dihitung saat modulnya diimpor — sebelum itu. Yang
> terlihat: CMS tersimpan benar, Publish berhasil, `content.json` benar, dan
> halamannya tetap menampilkan isi lama. **Tanpa satu pun error.** Lihat §14.

Terjemahan bentuk dilakukan di `people.ts`, sekali, alih-alih membuat tiap
komponen memeriksa dua bentuk "kosong": `photo` selalu string di CMS (`""` kalau
kosong) tapi opsional di situs, dan `social` selalu array di CMS tapi opsional di
situs. `work.ts` melakukan hal yang sama untuk satu field: `outcome: p.outcome ||
undefined`, karena baris hasil boleh kosong di kartu proyek. `caseStudies.ts`
justru TIDAK menerjemahkan apa pun — di sana semua field wajib, jadi bentuk CMS
dan bentuk situs kebetulan sudah sama, dan menambahkan lapisan terjemahan kosong
cuma menambah tempat yang bisa salah. `services.ts` dan `testimonials.ts` cuma
membuang kolom yang tidak dibaca komponen (`state`, `sortOrder`) — urutan sudah
dibawa urutan array-nya sendiri. `deployments.ts` dan `processSteps.ts`
mengikuti keduanya: yang diteruskan hanya isian yang dirender (`sector, region,
desc, image` / `title, kicker, desc, glyph`), dan ada test yang mengunci daftar
key itu apa adanya.

### §10c Yang disentuh di `src/components/`

Enam belas berkas (tiga belas di `sections/`, dua di `canvas/`, satu di
`motion/`), semuanya perubahan
kecil dengan satu alasan besar:

- **`Careers.tsx`** — literal `ROLES` ditukar `import { careerRoles }`.
- **`PeopleValues.tsx`** — `VALUES` ditukar `peopleValues()`, plus
  `if (values.length === 0) return null`. Tanpa satu pun nilai, yang tersisa cuma
  label "What We Stand For" menggantung di atas ruang kosong — dan labelnya
  sticky, jadi ia ikut mengambang sepanjang seksi. Keadaan itu bisa terjadi
  sungguhan: editor boleh menghapus semua nilai.
- **`TheCrew.tsx`** — `TEAM_MEMBERS` ditukar `crew()`, dan **pengelompokan yang
  dulu dihitung di tingkat modul dipindah ke dalam komponen** lewat `useMemo`.
  Dep array-nya sengaja kosong: `crew()` membaca store yang sudah terisi sebelum
  React merender apa pun, jadi hasilnya tetap sepanjang umur aplikasi — yang
  berubah cuma *kapan* dihitungnya, dari saat impor jadi saat render pertama.
  Itulah seluruh perbaikannya.
- **`CaseGrid.tsx`** — `PROJECTS` ditukar `useMemo(() => workProjects(), [])`,
  plus tiga penjaga daftar-menyusut yang dulu mustahil dibutuhkan (§14):
  `if (total === 0) return null`, pembagian progres dijaga
  `total > 1 ? offset / (total - 1) : 0`, dan indeks kartu aktif dijepit
  `Math.min(active, total - 1)`.
- **`CaseGridMobileStack.tsx`** — sumber datanya sama; yang berubah cuma dari mana
  arraynya datang.
- **`CaseStudySpotlight.tsx`** — `CASE_STUDIES` ditukar
  `useMemo(() => caseStudies(), [])` plus `if (items.length === 0) return null`.
  Baris hasil dan judul "Scope" tetap digerbangi meski validasi mewajibkan
  isinya: `content.json` bisa saja ditulis versi server lain, dan gerbang satu
  baris lebih murah daripada judul menggantung di atas ruang kosong.
- **`Office.tsx`** — literal `SERVICES` (yang dulu tinggal di berkas ini)
  ditukar `useMemo(() => services(), [])`, dan sabuk berikut daftar `sr-only`-nya
  digerbangi `daftar.length > 0`. Gerbangnya bukan kosmetik: `beltX()` di sabuk
  membagi dengan `slot * count`, jadi nol layanan tanpa gerbang = panel putih
  45svh berisi NaN, bukan panel kosong.
- **`ServicesTicker.tsx`** (di `canvas/`) — `TickerItem` kehilangan field `num`:
  nomor itu cuma pernah jadi `key` React dan tidak sekali pun dicetak, jadi
  `key`-nya kini judul (yang dijaga unik `services_title_alive`, §4a).
- **`TestimonialSpotlight.tsx`** — `TESTIMONIALS` ditukar
  `useMemo(() => testimonials(), [])`, plus dua penjaga daftar-menyusut:
  `if (entries.length === 0) return null`, dan **kolom panah dilepas bareng
  tombolnya saat cuma ada satu kutipan** — panah yang memutar satu entri ke
  dirinya sendiri cuma membingungkan, dan `% count` pada daftar kosong adalah
  NaN yang sama dengan yang dibayar slice Work (§14).
- **`Industries.tsx`** — literal ditukar `useMemo(() => industries(), [])`,
  dan seluruh section merender `null` saat daftarnya kosong. Gerbangnya bukan
  kosmetik: tumpukan 3D menghitung posisi dari `industries.length`, dan nol
  plank membuat navigasi sentuhnya membaca `industries[navIndex]` yang tidak
  ada.
- **`IndustriesStack.tsx`** (di `canvas/`) — data sektor kini datang lewat
  prop, dan **pusat busur spiral dihitung dari `k` yang DIPUSATKAN** terhadap
  jumlah sektor, bukan dari konstanta 13: di 13 sektor pusat tumpukan tetap di
  titik yang dibidik kamera, dan di 5 sektor pusatnya ikut — daftar boleh
  menyusut tanpa menyetel ulang kamera. Kolom nama di navigasi sentuh
  `‹ nama ›` berlebar TETAP (`w-[15.5rem]`) supaya kedua panah tidak bergeser
  tiap ganti sektor — batas 40 karakter nama sektor (§5) lahir dari kolom ini.
- **`Vision.tsx`** — `HEADTEXT` dan path foto hardcoded ditukar
  `useMemo(() => vision(), [])` **di dalam komponen** — jebakan ruang-modul
  yang sama dengan empat slice sebelumnya (§14). Tidak ada gerbang
  daftar-kosong karena memang bukan daftar: seksinya selalu dirender (§4b).
- **`Deployments.tsx`** — literal `DEPLOYMENTS` (lima objek dengan `num`
  diketik tangan) ditukar `useMemo(() => deployments(), [])`, plus gerbang
  `if (kartu.length === 0) return null` — seluruh section hilang berikut
  CTA-nya, dan itu aman: celah 80px mobile dijatah `pb-20` CsiHero di atasnya,
  beda nasib dengan Visi yang wajib selalu render. `key` kartu pasangan
  `sektor · wilayah` (§4a), nomor "01"–"NN" dihitung dari posisi saat render.
- **`DeploymentCard.tsx`** — peta `SECTOR_IMAGE` + `DEFAULT_IMAGE` dihapus;
  gambar kini isian `image` yang dibawa tiap kartu (§4b). Foto kosong =
  `<img>`-nya tidak dirender sama sekali, bukan `src=""` — string kosong di
  `src` dibaca sebagian peramban sebagai "minta ulang halaman ini".
- **`Process.tsx`** — komponen DIPECAH DUA: `Process` (gerbang — `useMemo` +
  `if (steps.length === 0) return null`, tanpa satu pun hook lain) dan
  `ProcessSection` (isi, semua hook motion). Pemecahannya bukan gaya:
  `useScroll({ target })` yang telanjur jalan lalu komponennya `return null`
  membuat motion melempar *"Target ref is defined but not hydrated"* satu
  frame kemudian (§14). Ilustrasi tiap kartu kini
  `PROCESS_GLYPHS_BY_KEY[step.glyph]` — dicari lewat NAMA yang dibawa
  langkahnya, bukan `PROCESS_GLYPHS[i]` (§4b); `key` kartu judulnya.
- **`ProcessGlyphs.tsx`** (di `motion/`) — dapat ekspor baru
  `PROCESS_GLYPHS_BY_KEY`, sengaja bertipe `Record<ProcessGlyphKey, …>`: nilai
  enum ketujuh di `shared/` membuat TypeScript menolak berkas ini sampai
  gambarnya benar-benar dibuat. Larik lama `PROCESS_GLYPHS` masih ada untuk
  test-nya, dengan peringatan besar bahwa ia bukan lagi cara memilih gambar.

**Di dev, `content.json` disajikan plugin `serveContentJson()` di `vite.config.ts`**
— `dist/` tidak disajikan sama sekali oleh dev server, jadi tanpa plugin ini
`bun run dev` selalu jatuh ke konten bundle dan hasil edit di panel tidak pernah
kelihatan sampai di-build. Kalau berkasnya belum pernah ada, plugin **membiarkan
404**: menyembunyikan keadaan itu di dev berarti jalur fallback tidak pernah
teruji sebelum produksi.

---

## §11 Panel admin

Bahasa Indonesia, hitam-putih, tanpa animasi, tanpa framework UI.

| Layar | Isi |
|---|---|
| `Masuk` | satu isian kata sandi, fokus otomatis. Tidak ada tautan daftar — akun dibuat lewat `bun run user:create` |
| `Beranda` | peta konten situs: empat halaman navbar + isinya, masing-masing dengan kalimat status hidup ("3 nilai, 1 belum tayang") |
| `Sidebar` | menu sisi yang bisa dilipat, urutannya mengikuti urutan di situs |
| `DaftarLowongan` | Judul · Departemen · Status · Terakhir diubah |
| `FormLowongan` | judul, departemen, status, ringkasan, keahlian, foto, tab EN/ID, saklar GitHub, slug di bagian lanjutan |
| `DaftarNilai` | # · Judul · Baris pendek · Status · Terakhir diubah, plus **Naikkan/Turunkan** |
| `FormNilai` | judul, baris pendek, uraian, foto, status |
| `DaftarCrew` | Nama · Jabatan · Departemen · Foto · Status · Terakhir diubah |
| `FormCrew` | nama, jabatan, departemen, foto, tautan sosial (maks satu per platform), status |
| `DaftarProyek` | # · Nama proyek · Klien · Tahun · Status · Terakhir diubah, plus **Naikkan/Turunkan** |
| `FormProyek` | nama proyek, klien, tahun, baris hasil (opsional), gambar, label (maks 6), status |
| `DaftarCaseStudy` | # · Judul · Klien · Tahun · Status · Terakhir diubah, plus **Naikkan/Turunkan** |
| `FormCaseStudy` | judul, klien, tahun, sektor, baris hasil, kutipan pembuka, cerita (dengan penghitung paragraf hidup), gambar sampul, lingkup kerja (maks 6), status |
| `DaftarLayanan` | # · Nama layanan · Penjelasan · Rincian · Status · Terakhir diubah, plus **Naikkan/Turunkan** |
| `FormLayanan` | nama layanan, penjelasan, rincian (maks 10), status — tanpa foto |
| `DaftarTestimoni` | # · Nama · Kutipan · Status · Terakhir diubah, plus **Naikkan/Turunkan** |
| `FormTestimoni` | kutipan, nama, jabatan, status — tanpa foto (§4b) |
| `DaftarIndustri` | # · Nama sektor · Bobot · Status · Terakhir diubah, plus **Naikkan/Turunkan**; tombol **Tambah mati saat 13 sektor Live** (§4b) |
| `FormIndustri` | nama sektor, kalimat penjelas, foto plank, bobot (Core Focus/Sector), status |
| `DaftarDeployment` | # · Sektor · Wilayah · Status · Terakhir diubah, plus **Naikkan/Turunkan** — tanpa batas jumlah |
| `FormDeployment` | sektor, wilayah, keterangan, foto kartu, status — pasangan kembar ditolak di isian Wilayah (§4b) |
| `DaftarProses` | # · Judul langkah · Ilustrasi · Status · Terakhir diubah, plus **Naikkan/Turunkan**; tombol **Tambah mati saat 6 langkah Live** (§4b) |
| `FormProses` | judul, kicker, penjelasan, pemilih ilustrasi (radio 6 gambar bernama — "Radar", "Artboard", …), status — tanpa unggah foto |
| `FormVisi` | kalimat visi + foto — TANPA daftar di depannya, tanpa Tambah/Hapus/Naikkan/Draft (§4b); `#/visi` langsung membuka form |
| `PemilihFoto` | grid foto lama + unggah baru — dipakai delapan form yang bergambar (§8), label & petunjuknya bisa diganti per form |
| `BarPublish` | menetap di bawah: "N perubahan belum tayang" + tombol Publish |
| `Tema` | tombol terang/gelap di kepala panel (§11a) |

Yang bikin ramah non-teknis: **tidak ada Markdown, tidak ada field JSON, tidak ada
slug yang diketik manual** (dibuat otomatis dari judul, bisa disunting di bagian
lanjutan), dan setiap galat validasi muncul di sebelah isiannya dalam bahasa
Indonesia. Hapus selalu lewat dialog `Konfirmasi` yang **menyebut nama barisnya**,
dan pesan sesudahnya menjelaskan apa yang belum terjadi:
*"…Barisnya baru hilang dari situs setelah kamu menekan Publish."*

### §11a Beranda dari peta konten, bukan daftar tabel

`shared/contentMap.ts` memetakan **empat halaman navbar** (Home → Services →
Work → People) plus satu grup "Seluruh situs", dan konten apa saja yang tinggal di
masing-masingnya. Inilah yang jadi beranda panel.

Alasannya satu: teman R&D yang memakai panel ini tidak tahu — dan tidak perlu
tahu — bahwa lowongan disimpan di tabel `jobs`. Yang dia tahu adalah "lowongan itu
ada di halaman People", karena itulah yang dia lihat waktu membuka situsnya.
Panel yang mendarat di daftar entitas database memaksa dia menghafal pemetaan yang
sebenarnya sudah terpampang di navbar.

Tiap entri punya `status`: **`siap`** (bisa diubah lewat panel) atau **`belum`**
(masih hardcoded). Yang `belum` tetap DITAMPILKAN, tidak disembunyikan — editor
perlu bisa membedakan "tidak ada di panel karena belum dibuat" dari "tidak ada di
panel karena saya tidak menemukannya"; yang kedua berakhir jadi pertanyaan ke
developer, yang pertama tidak.

Hari ini **11 dari 12 entri berstatus `siap`** — satu-satunya `belum` yang
tersisa Tautan sosial di grup "Seluruh situs". Keempat entri halaman Home
(Deployment, Cara kerja, Industri, Visi) sudah `siap`, urut mengikuti urutan
section di situsnya; Nilai, Crew, dan Lowongan di
halaman People; Selected work dan Case study di halaman Work; Layanan dan
Testimoni di halaman Services.

> ⚠️ Peta ini pernah SALAH, dan salahnya cuma ketahuan karena dibaca manusia:
> "Testimoni" terdaftar di halaman **Work**, padahal di situs ia ada di halaman
> **Services**. Tidak ada test yang bisa menangkap itu sendiri — nama dan path
> halamannya sama-sama sah, yang salah cuma penempatannya. Sekarang entri
> testimoni membawa komentar yang menyebutkan letaknya, dan `contentMap.test.ts`
> mengunci **daftar key tiap halaman apa adanya** (`keys("services")` harus persis
> `["layanan", "testimoni"]`) supaya perpindahan berikutnya membuat test merah
> alih-alih lolos diam-diam.

> ⚠️ Peta ini dijaga `src/lib/contentMap.test.ts`: `path` dan `label` tiap halaman
> WAJIB sama dengan `ROOM_SLUGS`/`ROOM_LABELS` di sceneStore. Kalau sebuah halaman
> situs berganti slug dan berkas ini tidak ikut, panel akan menunjukkan alamat
> yang tidak ada — dan tidak ada yang meneriakkannya.

`bacaRute()` memeriksa `status === "siap"` untuk **semua bentuk rute**, bukan cuma
daftar. Sejak ada entitas kedua, `#/apa-saja/baru` yang lolos akan membuka form
lowongan dengan alamat yang menjanjikan hal lain.

Sejak visi masuk, `bacaRute()` juga mengenal **entitas tanpa daftar**
(`tanpaDaftar()` — hari ini cuma `visi`): bentuk `#/visi/baru` dan
`#/visi/ubah/<id>` tidak punya arti untuk entitas satu baris, dan tanpa
pengecualian ini keduanya SAH menurut penjaga `siap()` lalu jatuh ke ujung
rantai pemilihan komponen — form LOWONGAN, di alamat yang menjanjikan visi.
Keduanya kini dinormalkan ke layar `#/visi`. Kalimat status visi di beranda
juga tidak lewat `ringkas()`: jumlahnya selalu satu dan tidak ada draf, jadi
yang dilaporkan cuma "Belum terisi — situs memakai kalimat bawaan." atau
"Terisi(, belum tayang)".

**Kolom "#" di `DaftarIndustri`, `DaftarDeployment`, dan `DaftarProses`
menghitung baris TAYANG saja** — draf tampil
bertanda "—", karena ia memang belum punya nomor. Nomor itu bukan hiasan panel: ia harus
sama dengan "01"–"13" (atau "01"–"06", atau nomor kartu deployment) yang
tercetak di situs, dan situs cuma menghitung baris
`live`. Kolom # yang menghitung semua baris akan menunjukkan nomor yang
berbeda dengan yang dilihat pengunjung persis saat ada draf di tengah daftar
(§14).

Pemilihan komponen per entitas ditulis apa adanya (`rute.entitas === "crew" ? …`),
bukan lewat peta `{lowongan: [Daftar, Form], …}`. Peta seperti itu memang lebih
pendek, tapi prop tiap entitas berbeda tipe (`JobRecord[]` vs `ValueRecord[]`) —
dan yang hilang begitu semuanya dijejalkan ke satu peta adalah pemeriksaan
TypeScript yang menangkap ketidakcocokan itu.

### §11b Tema terang/gelap

Dua tema, **keduanya tetap hitam-putih**. Yang ditambah pilihan terang/gelap,
bukan warna.

- **Token diberi nama menurut PERANnya** (`--teks`, `--dasar`), bukan warnanya.
  Dulu namanya `--hitam` dan `--putih`; nama itu berhenti jujur begitu ada tema
  yang isinya justru kebalikannya.
- **Semua warna lewat token.** Tidak ada satu pun `#fff`, `#000`, atau `rgba()`
  yang ditulis langsung di aturan mana pun — itulah satu-satunya alasan tema
  gelap cukup ditulis sekali sebagai daftar token pengganti. Warna langsung di
  sebuah aturan berarti aturan itu diam-diam hanya benar di salah satu tema.
- **Teksnya tidak ikut dibalik penuh.** `#fff` di atas `#000` menyilaukan dan
  meninggalkan jejak saat mata berpindah baris, jadi ia ditarik ke `#ededed`.
  Semua token tetap abu-abu murni (R=G=B) — tidak ada satu pun yang punya rona.
- **`accent-color` dan `:focus-visible` diambil alih**, karena peramban
  menggambarnya sendiri dan bawaannya biru: satu-satunya warna berona yang
  tersisa, muncul persis di sekeliling apa pun yang sedang dipakai.
- **Pergantian temanya seketika**, bukan melunak 200ms. Tidak ada satu pun
  `transition`, `animation`, atau `transform` di `styles.css`. Kalau nanti
  tergoda menambahkannya: jangan.

**Pilihan disimpan di `localStorage`, bukan database.** Ini preferensi mata, bukan
konten: ia milik perangkat yang sedang dipakai, dan tidak ada gunanya ikut
berpindah ke laptop lain bersama sesi login. Semua aksesnya dibungkus `try/catch`
— mode privat di beberapa peramban melempar, dan panel yang gagal dimuat gara-gara
preferensi warna adalah harga yang terlalu mahal untuk sebuah tombol.

**PILIHAN vs TEMA.** `pilihan` boleh `null`, artinya "ikut sistem" — dan itulah
keadaan awal semua orang sebelum tombolnya pernah disentuh. Kalau keduanya
disatukan jadi satu nilai, panel yang dibuka pertama kali di macOS bertema gelap
akan tetap menyala putih, karena "belum pernah memilih" tidak bisa dibedakan dari
"sudah memilih terang". Selama belum ada pilihan eksplisit, panel ikut sistem
SETERUSNYA — macOS berganti sendiri saat matahari terbenam, dan panel yang
tertinggal putih sampai di-reload terlihat seperti temanya rusak.

**Skrip anti-kedip di `admin/index.html`** memasang `data-tema` sebelum stylesheet
mana pun sempat melukis. Kalau menunggu React, panel berkedip putih sepersekian
detik setiap kali dimuat ulang di tema gelap — dan kedipannya persis di layar
masuk, tempat orang paling sering menekan reload. Sengaja inline dan sengaja tanpa
`defer`: skrip modul dieksekusi setelah HTML selesai diurai, yaitu tepat setelah
kedipan yang mau dihindari ini terjadi.

> ⚠️ Nama kunci `"cogniti-tema"` ditulis di DUA tempat: `KUNCI_TEMA` di `Tema.tsx`
> dan skrip inline di `index.html`. Kalau salah satunya berubah, tidak ada yang
> galat — cuma kedipannya kembali.

### §11c Detail lain yang gampang terlewat

Rute pakai **hash** (`#/`, `#/nilai`, `#/crew/baru`, `#/lowongan/ubah/<id>`) supaya
panel tidak butuh aturan rewrite di server mana pun.

`App.tsx` memegang satu-satunya salinan daftar & jumlah pending, dan `user`-nya
bertipe `Pengguna | undefined` — `undefined` berarti "masih bertanya ke server",
`null` berarti tamu. Tanpa pembedaan itu layar login berkedip muncul sepersekian
detik di setiap reload.

**Semua entitas diambil sekaligus** saat memuat, bukan hanya yang sedang dibuka:
berandanya menampilkan kalimat status tiap entitas, jadi mengambil per-halaman
berarti beranda memulai hidupnya dengan angka kosong yang lalu berubah sendiri.
Daftarnya pendek — ini beberapa request kecil, bukan tabel raksasa. Sesi
kedaluwarsa cukup dilihat dari SATU permintaan mana pun: kalau cookie-nya tidak
berlaku lagi, semuanya dibalas 401 bersamaan.

`main.tsx` **sengaja tanpa `StrictMode`**: efek yang dipanggil dua kali akan
menggandakan setiap panggilan API di dev, dan panel ini banyak sekali memanggil API.

---

## §12 Menjalankan di lokal

```
localhost:5432   Postgres (Postgres.app 17, db cogniti_dev + cogniti_test)
localhost:3001   bun run server:dev      API
localhost:3000   bun run dev             situs
localhost:5174   bun run admin:dev       panel admin
```

```bash
cp .env.example .env          # lalu isi DATABASE_URL & SESSION_SECRET
bun run db:up                 # nyalakan Postgres.app cluster
bun run db:migrate            # jalankan migrasi
bun run db:seed               # isi dari literal repo (sekali, per tabel)
bun run user:create           # bikin akun editor
```

`.env` yang dibutuhkan: `DATABASE_URL`, `TEST_DATABASE_URL`, `SESSION_SECRET`,
`PORT`, dan opsional `CF_ZONE_ID` + `CF_PURGE_TOKEN`. **`.env` tidak pernah masuk
git**; `.env.example` masuk.

> ⚠️ `TEST_DATABASE_URL` **isinya dihapus setiap kali test jalan.** Jangan pernah
> diarahkan ke database dev.

`vite.config.ts` situs mem-proxy `/api` dan `/uploads` ke :3001, dan
`admin/vite.config.ts` mem-proxy `/api` + `/uploads` ke :3001 serta `/careers` +
`/people` ke :3000. Frontend karena itu **selalu memakai path relatif** — tidak ada
satu pun `http://localhost:3001` yang ditulis di kode. Begitu ada satu yang
terselip, panel jalan di laptop dan mati di server, dan bedanya baru ketahuan
setelah deploy.

---

## §13 Test & verifikasi

**577 test CMS** di dalam `bun run test` (yang totalnya 94 berkas / 996 test) —
selebihnya di tabel ini; 3 menumpang `TestimonialSpotlight.test.tsx`, beberapa
menumpang `Industries.test.tsx`, dan 5 + 5 menumpang `Deployments.test.tsx` &
`Process.test.tsx` (disebut sesudah tabel):

| Berkas | Test | Menguji |
|---|---|---|
| `shared/validateJob.test.ts` | 12 | aturan isi & pesan galat lowongan |
| `shared/validateValue.test.ts` | 11 | aturan isi nilai, ketat-ikut-status |
| `shared/validateCrew.test.ts` | 15 | aturan crew, tautan `https://`, `"#"` lolos |
| `shared/validateWorkProject.test.ts` | 15 | aturan kartu proyek, baris hasil OPSIONAL, label kembar |
| `shared/validateCaseStudy.test.ts` | 21 | aturan cerita, baris hasil WAJIB, `normalizeDesc` & batas 8 paragraf |
| `shared/validateService.test.ts` | 13 | aturan layanan, penjelasan WAJIB saat Live, rincian kembar/kosong |
| `shared/validateTestimonial.test.ts` | 11 | aturan testimoni, jabatan WAJIB saat Live, draf cuma perlu nama |
| `shared/validateIndustry.test.ts` | 14 | aturan sektor: foto & kalimat WAJIB saat Live, batas 40/160, draf cuma perlu nama |
| `shared/validateVision.test.ts` | 9 | aturan visi: kalimat & foto selalu wajib (tidak ada draf), batas 400 |
| `shared/validateDeployment.test.ts` | 15 | aturan kartu: foto/wilayah/keterangan WAJIB saat Live, batas 40/30/240, kelima kartu bawaan lolos apa adanya |
| `shared/validateProcessStep.test.ts` | 18 | aturan langkah: judul wajib bahkan draf, kicker/penjelasan wajib saat Live, glyph tak dikenal ditolak, batas 40/18/180 |
| `server/routes/jobs.test.ts` | 17 | CRUD, 401 tanpa login, slug bentrok, soft delete |
| `server/routes/values.test.ts` | 20 | CRUD + reorder, daftar tak lengkap ditolak |
| `server/routes/crew.test.ts` | 26 | CRUD, tautan sosial, nama bentrok, departemen asing |
| `server/routes/workProjects.test.ts` | 26 | CRUD + reorder, label ditulis-ulang bukan dibanding, nama bentrok |
| `server/routes/caseStudies.test.ts` | 29 | CRUD + reorder, lingkup, uraian dirapikan di kedua jalur tulis |
| `server/routes/services.test.ts` | 23 | CRUD + reorder, rincian ditulis-ulang bukan di-diff (3 sub → 1 sub = sisa 1 baris), judul bentrok |
| `server/routes/testimonials.test.ts` | 20 | CRUD + reorder, nama bentrok, daftar reorder tak lengkap ditolak |
| `server/routes/industries.test.ts` | 26 | CRUD + reorder, **batas 13 Live ditolak 422** (lewat POST maupun PUT), nama bentrok |
| `server/routes/vision.test.ts` | 9 | GET null sebelum ada, PUT upsert (simpan kedua menimpa, bukan menambah), validasi |
| `server/routes/deployments.test.ts` | 25 | CRUD + reorder, pasangan sektor+wilayah kembar ditolak case-insensitive (galat di `region`), kartu baru mendarat di bawah |
| `server/routes/processSteps.test.ts` | 28 | CRUD + reorder, **batas 6 Live ditolak 422** (POST maupun PUT, `exceptId` untuk baris sendiri), ilustrasi ikut pindah bersama langkahnya, judul kembar |
| `server/routes/auth.test.ts` | 6 | masuk pakai sandi saja, sandi salah, sesi |
| `server/publish.test.ts` | 42 | draft tidak ikut, tulis atomik, hitungan pending, visi null → objek → tertimpa — BELUM menyebut deployment/proses (lihat ⚠️ di bawah) |
| `src/lib/content/store.test.ts` | 9 | content.json valid dipakai; gagal/timeout/versi salah → fallback |
| `src/data/people.test.ts` | 17 | CMS menang atas bundle; daftar kosong dihormati; payload lama |
| `src/data/work.test.ts` | 9 | CMS menang atas bundle; `outcome` kosong jadi `undefined` |
| `src/data/caseStudies.test.ts` | 10 | CMS menang atas bundle; daftar kosong dihormati |
| `src/data/services.test.ts` | 9 | CMS menang atas bundle; daftar kosong dihormati |
| `src/data/testimonials.test.ts` | 9 | CMS menang atas bundle; daftar kosong dihormati |
| `src/data/industries.test.ts` | 10 | CMS menang atas bundle; daftar kosong dihormati; payload lama tanpa field industri |
| `src/data/vision.test.ts` | 6 | CMS menang atas bundle; **isian kosong jatuh ke cadangan PER ISIAN** |
| `src/data/deployments.test.ts` | 9 | CMS menang atas bundle; daftar kosong dihormati; hanya isian yang dirender diteruskan (key dikunci apa adanya) |
| `src/data/processSteps.test.ts` | 13 | glyph milik LANGKAH bukan posisi; `PROCESS_GLYPHS_BY_KEY` lengkap; daftar kosong dihormati; payload lama tanpa field ini → bundle |
| `src/lib/contentMap.test.ts` | 11 | peta konten sinkron dengan slug & label situs, letak entri per halaman |

Tiga test CMS lain menumpang `TestimonialSpotlight.test.tsx` (komponennya):
membaca entri dari CMS alih-alih bundle, daftar kosong = tidak dirender sama
sekali, dan **panah hilang saat tersisa satu kutipan**. `Industries.test.tsx`
ikut ketambahan test CMS dengan pola yang sama: section membaca sektor dari
CMS, dan daftar kosong = seluruh section tidak dirender.
`Deployments.test.tsx` dan `Process.test.tsx` masing-masing ketambahan 5 test
CMS dengan pola itu juga (baca dari CMS, kosong = tidak dirender, menomori
dari posisi) plus yang khas entitasnya: dua kartu bersektor sama beda wilayah
tampil dua-duanya dan foto kosong = tanpa `<img>` (deployment); dua langkah
ber-ilustrasi sama menghasilkan SVG yang identik (proses — bukti glyph milik
langkah, bukan posisi).

> ⚠️ `server/publish.test.ts` BELUM ketambahan describe untuk deployment dan
> langkah cara kerja — dua-duanya sudah terangkut `collect()`/`pendingCount()`
> dan terbukti lewat probe (draf tidak ikut, urutan ikut, publish menghitung),
> tapi cakupan unit jalur publish-nya masih menumpang test entitas lama. Utang
> kecil untuk slice berikutnya.

Test server jalan di **project vitest terpisah** (`environment: "node"`), karena
`src/test/setup.ts` menyentuh `window` dan akan melempar di sana. Semua berkas
test server menumpang satu database test dan saling mengosongkan tabelnya, jadi
`fileParallelism: false` — jalan bersamaan berarti saling menghapus baris di
tengah test tetangga.

> ⚠️ `resetDb()` harus menyebut **semua** tabel baru di `truncate`-nya. Tabel yang
> terlupa membuat test tetangga saling mewarisi baris, dan gejalanya "kadang
> gagal" tergantung urutan.

**Tiga belas probe end-to-end lewat Brave** (CDP, nol dependensi), semuanya hijau:

`scripts/probe-admin.mjs` — 13 pemeriksaan: menu sisi (grup membuka/menutup,
melipat, menandai posisi), CRUD lowongan, draf tidak ikut Publish, Open tanpa foto
ditolak, hapus + Publish → hilang dari `content.json`, nol galat konsol.

`scripts/probe-nilai-admin.mjs` — 14 pemeriksaan:
```
✓ beranda menyebut jumlah nilai tanpa halamannya dibuka
✓ nilai draf tersimpan dan mendarat di baris paling bawah
✓ draf TIDAK ikut ke content.json setelah Publish
✓ status Live tanpa foto ditolak, alasannya tampil di form
✓ nilai tayang masuk content.json lengkap dengan foto
✓ Naikkan menukar baris dengan tetangganya di layar
✓ memindahkan baris menyalakan badge "belum tayang"
```

`scripts/probe-crew-admin.mjs` — 12 pemeriksaan:
```
✓ draf tanpa jabatan tersimpan — draf boleh setengah jalan
✓ Live tanpa jabatan ditolak, alasannya tampil di form
✓ tautan tanpa https:// ditolak di form
✓ Live tanpa foto DITERIMA — kotak kosong memang dirancang begitu
✓ halaman People membaca crew dari content.json, bukan dari bundel
✓ dihapus + Publish → hilang dari content.json
```

`scripts/probe-proyek-admin.mjs` — 15 pemeriksaan:
```
✓ beranda menyebut jumlah proyek tanpa halamannya dibuka
✓ proyek draf tersimpan (baris label kosong dibuang) dan mendarat paling bawah
✓ label tersimpan urut & tanpa baris kembar saat form dibuka lagi
✓ status Live tanpa gambar ditolak, alasannya tampil di form
✓ urutan kartu ikut berubah di content.json (posisi 8 → 7)
✓ halaman Work merender kartu dari CMS (judul …px, gambar …px)
✓ dihapus + Publish → hilang dari content.json
```

`scripts/probe-case-study-admin.mjs` — 17 pemeriksaan:
```
✓ penghitung paragraf membedakan satu Enter dari baris kosong
✓ case study draf tersimpan (baris lingkup kosong dibuang) dan mendarat paling bawah
✓ lingkup & paragraf kembali utuh saat form dibuka lagi
✓ status Live tanpa baris hasil ditolak — beda aturan dengan kartu proyek
✓ cerita tayang masuk content.json lengkap, jeda paragrafnya selamat
✓ halaman Work membuka cerita dari CMS (N paragraf, judul …px, gambar …px)
✓ dihapus + Publish → hilang dari content.json
```

`scripts/probe-layanan-admin.mjs` — 17 pemeriksaan:
```
✓ beranda menyebut jumlah layanan tanpa halamannya dibuka
✓ layanan draf tersimpan tanpa penjelasan, mendarat di baris paling bawah
✓ draf TIDAK ikut ke content.json setelah Publish
✓ status Live tanpa penjelasan ditolak, alasannya tampil di form
✓ layanan tayang masuk content.json, rincian utuh dan urut seperti diketik
✓ urutan sabuk ikut berubah di content.json (Naikkan)
✓ daftar sr-only halaman Services membacanya dari CMS
✓ urutan daftar sr-only sama persis dengan urutan di content.json
✓ dihapus + Publish → hilang dari content.json
```

> Probe layanan memeriksa **`ul.sr-only li`, BUKAN `body.innerText`** — dan itu
> bukan detail teknis. Sabuk 3D `aria-hidden` dan teksnya troika (tidak ada di
> DOM sama sekali), jadi `innerText` akan lulus untuk alasan yang salah.
> Rinciannya juga sengaja diketik TIDAK urut abjad, supaya urutan sesuka
> Postgres (tanpa `ORDER BY`) langsung ketahuan alih-alih kebetulan lolos.

`scripts/probe-industri-admin.mjs` — 19 langkah, membuka halaman depan "/"
yang sungguhan:
```
✓ satu tempat dipinjam dari sektor Live — tombol Tambah hidup lagi
✓ sektor draf tersimpan di baris terakhir, dan sengaja belum bernomor
✓ draf TIDAK ikut ke content.json setelah Publish
✓ status Live tanpa foto ditolak, alasannya tampil di form
✓ nomor di panel sama dengan nomor yang tercetak di situs
✓ sektor ke-14 ditolak server, alasannya terbaca di form (isian Status)
✓ urutan plank ikut berubah di content.json
✓ halaman depan merender N sektor dari CMS, lengkap kalimatnya
✓ dihapus + Publish → daftar tayang kembali persis seperti semula
```

> Probe industri **meminjam tempat** sebelum menambah apa pun: seed sudah
> mengisi ke-13 tempat, jadi ia men-draft-kan satu sektor Live dulu (dan
> mengembalikannya di akhir). Pembanding urutannya juga sengaja BUKAN "tekan
> Naikkan sekali lalu bandingkan dua nama teratas content.json" — tetangga
> baris yang dinaikkan bisa saja draf yang tidak ikut ke berkas (§14).

`scripts/probe-deployment-admin.mjs` — 18 pemeriksaan, membuka halaman depan
"/" yang sungguhan:
```
✓ tidak ada batas: tombol Tambah tetap hidup di N kartu tayang
✓ kartu draf tersimpan di baris terakhir, dan sengaja belum bernomor
✓ pasangan sektor+wilayah kembar ditolak, alasannya mendarat di isian Wilayah
✓ sektor yang sama dengan wilayah berbeda diterima sebagai kartu kedua
✓ status Live tanpa foto ditolak, alasannya tampil di form
✓ nomor di panel sama dengan nomor yang tercetak di situs
✓ urutan kartu ikut berubah di content.json
✓ halaman depan merender N kartu dari CMS — bernomor, lengkap kalimat & fotonya
✓ dihapus + Publish → daftar tayang kembali persis seperti semula
```

`scripts/probe-proses-admin.mjs` — 12 langkah / 20 pemeriksaan, membuka
halaman depan "/" yang sungguhan:
```
✓ daftar penuh (6/6) dan tombol Tambah ikut mati
✓ satu tempat dipinjam dari langkah Live — tombol Tambah hidup lagi
✓ langkah draf tersimpan dengan ilustrasi pilihannya, dan sengaja belum bernomor
✓ langkah ke-7 ditolak server, alasannya terbaca di form
✓ ilustrasi ikut pindah bersama langkahnya — pasangan judul→gambar utuh
✓ nomor di panel sama dengan nomor yang tercetak di situs
✓ halaman depan merender N kartu dari CMS, urut dan lengkap isinya
✓ dihapus + Publish → daftar tayang kembali persis seperti semula (ilustrasi utuh)
```

> Probe proses meminjam tempat seperti probe industri (seed sudah penuh 6/6)
> dan wajib mengembalikan pinjamannya juga saat gagal di tengah. Dua
> kewaspadaan yang khas miliknya: pembanding "ilustrasi ikut pindah" harus
> memilih langkah yang gambarnya BERBEDA dari yang dilewati — dua gambar
> kembar membuat pemeriksaannya tidak menguji apa-apa — dan Naikkan ditekan
> BERULANG sampai melewati tetangga yang TAYANG, karena sekali tekan bisa
> cuma melewati draf dan urutan tayangnya tidak berubah (§14). Probe
> deployment mewarisi trik kedua, plus mengenali baris lewat PASANGAN
> sektor·wilayah — dua baris bersektor sama memang sah. Berbeda dari industri
> (tumpukan WebGL), kartu kedua entitas ini DOM biasa, jadi yang diperiksa di
> halaman depan kartunya sendiri, bukan daftar `sr-only` pengganti.

`scripts/probe-visi-admin.mjs` — 14 pemeriksaan, membuka halaman depan "/"
yang sungguhan:
```
✓ menu sisi membuka form visi langsung, tanpa daftar, dan menandai posisinya
✓ tidak ada Tambah/Hapus/Naikkan maupun pilihan Draft-Live
✓ kalimat kosong ditolak di form, baris yang tayang tidak tersentuh
✓ menyimpan visi menyalakan badge 'belum tayang'
✓ simpan kedua menimpa baris yang sama — tetap satu visi
✓ #/visi/baru dan #/visi/ubah/1 tetap mendarat di form visi
✓ halaman depan merender visi dari CMS (kalimat & foto terukur)
✓ kalimat semula dikembalikan — halaman depan kembali seperti sebelum probe
```

> Probe visi **wajib membersihkan jejaknya sendiri, juga saat GAGAL di
> tengah**: ia menyunting baris yang sama yang dipakai halaman depan sungguhan
> dan tidak bisa sekadar menghapusnya — probe yang mati di langkah 10 tanpa
> pemulihan meninggalkan "kalimat uji coba" terpampang di halaman depan sampai
> ada yang menyadarinya.

`scripts/probe-testimoni-admin.mjs` — 14 pemeriksaan:
```
✓ testimoni draf tersimpan (tanpa jabatan) dan mendarat di baris paling bawah
✓ status Live tanpa jabatan ditolak, alasannya tampil di form
✓ testimoni tayang masuk content.json lengkap dengan jabatannya
✓ dinaikkan SAMPAI PUNCAK (di puncak tombol Naikkan mati), urutan ikut ke content.json
✓ halaman Services merender kutipan itu — puncak = yang terlihat saat dibuka
✓ dihapus + Publish → hilang dari content.json
```

Delapan probe entitas terakhir sengaja **membuka halaman situs yang sungguhan**
(Work, Services, atau halaman depan), bukan berhenti di panel. Bagian yang paling gampang salah
bukan penyimpanannya, melainkan apakah komponen situs benar-benar MEMBACA baris
baru itu — dan §14 mencatat satu cara kegagalan yang lolos semua test unit tapi
ketahuan persis di langkah ini.

`scripts/probe-tema-admin.mjs` — 15 pemeriksaan: kedua tema diukur di daftar,
form, dialog, dan layar masuk; **semua warna abu-abu murni** (R=G=B) diperiksa ke
seluruh elemen; cincin fokus 2px tidak meluber; ikut sistem tanpa menyimpan
pilihan; dan muat ulang tetap gelap **sejak HTML selesai diurai** (bukti tidak ada
kedipan).

`scripts/probe-job-page.mjs` — sisi pengunjung: halaman lowongan hidup, toggle ID
bertahan setelah refresh, tidak ada loader 3D, `office.glb` tidak ikut diunduh,
nol draw call saat diam.

**Uji jaring pengaman, dua-duanya sudah dijalankan:**
- `dist/content.json` dihapus → seluruh suite `probe-job-page.mjs` tetap lolos,
  hanya muncul `[content] memakai konten bawaan bundle` di konsol.
- proses API dimatikan → situs sama sekali tidak terpengaruh.

---

## §14 Gotcha yang sudah dibayar

**🔥 Data CMS yang dibaca di RUANG MODUL beku selamanya.** Kena dua slice
berturut-turut (dan slice-slice berikutnya tinggal mewarisi kewaspadaannya),
dan gejalanya identik dua-duanya: CMS tersimpan benar, Publish
berhasil, `content.json` isinya benar, dan halamannya tetap menampilkan data lama
— **tanpa satu pun galat.** Sebabnya `content.json` baru mendarat sesudah
`loadContent()` di `main.tsx`, sedangkan apa pun yang dihitung di tingkat modul
(`export const VALUES = ...`, `const GROUPED = CATEGORIES.map(...)`) dievaluasi
saat modulnya diimpor — sebelum itu. Fix: ekspor **fungsi**, dan pindahkan
perhitungan turunannya ke dalam komponen lewat `useMemo`. **Periksa ini PERTAMA
di entitas berikutnya.**

**🔥 Daftar yang dulu panjangnya TETAP sekarang boleh menyusut sampai kosong.**
Ini kelas gotcha baru yang lahir bersama slice Work, dan tidak satu pun test unit
bisa menangkapnya karena kodenya benar sebelum CMS masuk. `CaseGrid.tsx` menghitung
progres gulir dengan `offset / (total - 1)`: sempurna selama `PROJECTS` adalah
array delapan literal, **NaN** begitu editor menyisakan satu proyek — dan NaN
mengalir ke `width` dan `opacity`, jadi yang terlihat bukan pesan galat melainkan
kartu yang hilang. Saudaranya: indeks kartu aktif yang tertinggal menunjuk baris
yang barusan dihapus (`projects[7]` → `undefined` → layar putih). Sebelum
menukar sebuah literal jadi panggilan CMS, cari **tiap** tempat panjang arraynya
dipakai sebagai angka, bukan cuma tempat isinya dibaca. Fix di §10c.

**Nomor yang tercetak di situs ≠ nomor baris di panel.** Kolom "#"
`DaftarIndustri` sempat memakai `index + 1` apa adanya, dan itu berbohong:
situs cuma menghitung baris `live`, jadi satu draf yang nyempil di tengah
membuat setiap nomor di bawahnya melenceng satu dari yang dilihat pengunjung.
Fix: nomor dihitung dari baris tayang saja, draf bertanda "—" (§11). Gotcha
yang sama menjebak PROBE-nya: "tekan Naikkan sekali lalu bandingkan dua nama
teratas content.json" gagal diam-diam kalau tetangga baris yang dinaikkan
adalah draf — pembandingnya harus daftar tayang, bukan daftar panel.

**🔥 Hook ber-target ref yang telanjur jalan sebelum `return null` melempar di
LUAR render.** Lahir bersama slice cara kerja: `Process.tsx` memanggil
`useScroll({ target: wrapRef })` lalu — begitu daftarnya kosong —
`return null`, dan motion melempar *"Target ref is defined but not hydrated"*
SATU FRAME kemudian, di luar render, tidak tertangkap test unit mana pun
sampai halamannya benar-benar dibuka. Fix yang benar bukan menekan galatnya:
komponen dipecah jadi gerbang luar (`Process`) yang tanpa hook dan isi
(`ProcessSection`) yang memegang semua hook — nol langkah = nol hook (§10c).
Pola ini berlaku untuk TIAP seksi ber-hook motion yang sejak masuk CMS boleh
menyusut ke nol.

**Gambar yang dicari lewat kunci yang bukan milik barisnya akan bertukar
diam-diam.** Dua wujudnya dibayar di dua slice Home yang sama: peta
`SECTOR_IMAGE` deployment berkunci NAMA sektor (ganti "Hospitality" jadi
"Hotels & Resorts" = jatuh ke foto default), dan `PROCESS_GLYPHS[i]` berkunci
POSISI baris (pindahkan baris = dua langkah bertukar gambar). Dua-duanya tanpa
galat, dan dua-duanya baru jadi bug begitu editor BISA mengganti nama dan
memindahkan baris — kodenya benar selama datanya literal. Fix: gambar jadi
kolom milik barisnya (`photo_id` / `glyph`, §4b), dan probe proses
membandingkan peta judul→ilustrasi sebelum/sesudah pindah (§13).

**Indeks unik parsial atas PASANGAN kolom butuh mengecualikan yang separuh
kosong.** `deployments_sector_region_alive` versi pertama (migrasi 0009) cuma
ber-`where deleted_at is null`; dua draf bersektor sama yang wilayahnya masih
kosong — keadaan yang SAH untuk draf — saling menabrak dan dijawab 500, karena
penjaga route memang sengaja melewatkan pasangan separuh kosong. Migrasi 0011
menulis ulang indeksnya dengan `and region <> ''`, menyamakan pendapat kedua
penjaga (§4b).

**Rute yang sah menurut penjaga umum bisa tetap salah untuk entitas yang
bentuknya lain.** `#/visi/baru` lolos pemeriksaan `siap()` (visi memang siap)
lalu jatuh ke ujung rantai pemilihan komponen — form LOWONGAN, di alamat yang
menjanjikan visi. Lubangnya bukan di penjaganya, tapi di asumsi bahwa semua
entitas punya bentuk `baru`/`ubah`. Fix: `tanpaDaftar()` di `bacaRute()`
menormalkan kedua bentuk itu ke `#/visi` (§11).

**🔥 Dua app Vite berbagi satu `node_modules`.** Menjalankan `admin:dev` membuat
situs di :3000 **putih total** dengan `504 (Outdated Optimize Dep)` untuk
`react-router-dom.js`. Sebabnya keduanya memakai `node_modules/.vite/deps` yang
sama, dan re-optimize milik admin membatalkan hash milik situs. Gejalanya terlihat
persis seperti kode situs yang rusak. Fix: `cacheDir: "../node_modules/.vite-admin"`
di `admin/vite.config.ts`.

**🔥 `bun run build` satu-satunya yang menangkap top-level await.** `await loadContent()`
di module scope `src/main.tsx` lolos `tsc --noEmit`, `vitest`, dan `admin:build`,
tapi menggagalkan build produksi: *"Top-level await is not available in the
configured target environment (`chrome87`, `edge88`, `es2020`, `firefox78`,
`safari14`)"*. Cuma `vite build` yang melewati esbuild-transpile. Fix: render
dipindah ke `.then()`, **bukan** menaikkan `build.target` — itu melebarkan syarat
peramban seluruh bundle demi satu baris.

**Seed yang digerbangi satu pemeriksaan melewati tabel baru diam-diam.** Database
yang sudah pernah di-seed lowongan membuat `seedValues()`/`seedCrew()` tidak
pernah jalan kalau gerbangnya menumpang hitungan tabel `jobs`. Tidak ada yang
terlihat salah: skripnya melapor "sudah terisi" dan berhenti. Fix: satu gerbang
per tabel (§4c).

**Bentuk yang dibawa spasi putih harus dirapikan di KEDUA sisi.** Uraian case
study memisah paragraf dengan baris kosong, jadi teks yang dirapikan form (`\r\n`
jadi `\n`, tiga Enter jadi satu baris kosong) panjangnya BEDA dengan yang diketik.
Kalau server tidak merapikan dengan fungsi yang sama sebelum memvalidasi, teks
2.998 karakter lolos di form dan mendarat 3.010 di database — batas yang dijaga
ketat di satu tempat dan bocor di tempat lain. Fix: `normalizeDesc()` di `shared/`,
dipanggil form DAN repo, di jalur buat maupun jalur simpan-ulang (§5c).

**Foto yang dipakai dua entitas membuat `onConflictDoNothing` mengembalikan
kosong.** Baris `images` yang sudah terdaftar lewat lowongan tidak dikembalikan
lagi, jadi nilai/crew tersimpan tanpa `photoId` — foto hilang tanpa galat. Fix:
cari baris lamanya kalau `returning()` kosong (§8).

**Admin tanpa `root` menyajikan HTML SITUS.** `admin/vite.config.ts` tanpa
`root: DIR` membuat Vite memakai cwd, jadi :5174 menjawab
`<title>cogniti.id 3D Office Tour</title>` dengan status 200 — bukan error, cuma
halaman yang salah. Fix: `root: dirname(fileURLToPath(import.meta.url))`.

**Radio, checkbox, dan cincin fokus bawaan tampil BIRU** di panel yang seharusnya
hitam-putih. Fix: `accent-color: var(--teks)`, `color-scheme`, dan
`:focus-visible` sendiri — bukan `:focus`, supaya cincinnya tidak ikut muncul saat
diklik mouse.

**Badan bukan-JSON pada 5xx berarti bukan API yang menjawab.** Saat proses API
mati, proxy Vite membalas 500 dengan badan HTML, dan panel menampilkan "Ada yang
salah" — editor lalu mencari kesalahannya di isian. `admin/src/api.ts` sekarang
punya cabang khusus: *"Server sedang tidak bisa dihubungi. Coba lagi sebentar lagi."*

**`.env` jangan pernah ter-commit.** Sebelum staging, diperiksa bahwa `.env`,
`uploads/`, dan `dist-admin/` semuanya terabaikan, dan bahwa satu-satunya string
mirip sandi yang masuk git adalah fixture test `"sandi-yang-panjang"` di
`server/test/helpers.ts`.

---

## §15 Yang belum dikerjakan

**Langkah 10 — deploy.** Belum disentuh sama sekali:
- Postgres di VPS + jalankan migrasi
- proses API masuk pm2 (bersama `Website-CSI-V2` yang sudah ada)
- reverse proxy `/api` → :3001 dan `/admin` → `dist-admin/`
- cron `pg_dump`
- `CF_ZONE_ID` + `CF_PURGE_TOKEN` diisi supaya purge otomatis jalan

**Satu entitas konten tersisa** — tautan sosial (grup "Seluruh situs") —
menyusul dengan pola §16. Keempat halaman navbar **sudah selesai seluruhnya**:
Home genap bersama deployment dan cara kerja.

**Selisih kecil yang diketahui:** kalimat konfirmasi Publish belum menyebut
jumlah langkah cara kerja (§9a — selisih serupa milik industri sudah dibayar
slice deployment), dan `server/publish.test.ts` belum ketambahan describe
deployment/cara kerja (§13).

**Di luar cakupan, permanen:** teks yang terikat tata letak — wordmark
`COGNITI.ID` dengan lebar `7.342` di `Contact.tsx`, `HEADING_LINES` di
`CsiHero.tsx`, label navbar & slug ruangan 3D. Ini tidak akan pernah masuk CMS
sebagai textarea bebas. Scene 3D juga tidak. Pembedaan peran admin/editor ditunda
sampai ada yang benar-benar membutuhkannya.

---

## §16 Resep menambah entitas berikutnya

Urutan yang sudah terbukti **sebelas kali**, dipakai ulang apa adanya:

1. Tipe + validasi di `shared/` (dipakai server & admin sekaligus)
2. Tabel di `server/db/schema.ts` → `bun run db:generate` → `db:migrate`
3. Skrip seed dari literal repo yang sudah ada — **jangan ketik ulang konten**,
   dan **beri gerbang isi SENDIRI** untuk tabel barunya (§4c)
4. Repo (`*Repo.ts`) + route CRUD + audit log; daftarkan `requireLogin` untuk
   **dua** pola path (`/api/x` dan `/api/x/*`)
5. Ikutkan ke `collect()` + `pendingCount()` di `server/publish.ts` dan ke tipe
   `ContentPayload` di `shared/content.ts`; buang kolom admin dari payload
6. Tambah pembaca di `src/lib/content/store.ts` yang memeriksa **bagiannya
   sendiri** dan mengembalikan `null` kalau tidak ada
7. Pindahkan literal `src/data/<entitas>.ts` → `<entitas>Fallback.ts`, lalu ubah
   berkas aslinya jadi **fungsi** yang membaca store-nya sendiri.
   **🔥 Lalu periksa setiap pemanggilnya, dua hal sekaligus:** (a) apa pun yang
   dihitung di tingkat modul dari data itu harus pindah ke dalam komponen, dan
   (b) tiap tempat yang memakai **panjang** arraynya sebagai angka — pembagian
   `total - 1`, indeks yang disimpan di state — harus tahan daftar yang menyusut
   sampai satu atau nol (§14)
8. Ubah `status` entri di `shared/contentMap.ts` dari `belum` jadi `siap`
9. Layar di `admin/src/`, pakai `ui.tsx` yang sudah ada (`Isian`, `DaftarTeks`,
   `Konfirmasi`, `Kabar`, `tanggal`) — **dan warnanya lewat token**, tidak pernah
   `#fff`/`#000` langsung (§11b)
10. Test: validasi + route + fallback store; tambahkan tabel barunya ke
    `resetDb()`; lalu probe end-to-end yang **membuka halaman situs sungguhan**,
    bukan cuma memeriksa `content.json`
11. **`bun run build`** — bukan cuma `tsc` dan `vitest` (§14)

**Butuh urutan manual?** Ikuti pola nilai: endpoint `POST /urutkan` sendiri yang
menerima seluruh daftar id, reorder menaikkan `updatedAt`, dan baris baru mendarat
di bawah (§6b). **Tapi tanyakan dulu apakah situsnya memang membaca urutan itu** —
kalau tidak, tombolnya cuma akan berbohong ke editor (§4b). Daftarkan
`POST /urutkan` **sebelum** `POST /:id`: Hono mencocokkan rute sesuai urutan
pendaftaran, dan yang belakangan tidak akan pernah terpanggil.

**Punya kolom teks panjang?** Kalau bentuk tampilnya dibawa spasi putih (paragraf
dipisah baris kosong), rapikan lewat satu fungsi di `shared/` yang dipanggil form
DAN server — bukan salah satunya (§5c, §14).

**Wujud tayangnya bukan DOM?** (canvas, teks troika, WebGL) — probe-nya tidak
boleh berhenti di `body.innerText`. Cari bentuk yang terbaca mesin (di layanan
dan industri: daftar `sr-only`) dan periksa ITU; kalau bentuk itu tidak ada, ia
justru yang harus dibuat dulu, karena pembaca layar dan mesin pencari cuma
kebagian yang itu (§5b, §13).

**Entitasnya satu baris, selamanya?** Ikuti pola visi, yang menyimpang dari
resep di hampir setiap langkah: `CHECK id = 1` di skema (bukan kesepakatan di
kode), upsert di repo (bukan insert/update terpisah), `GET` + `PUT` saja
(tanpa POST/DELETE/urutkan), tanpa `state`/`sort_order`/`deleted_at` (§4b),
layar panel LANGSUNG form lewat `tanpaDaftar()` di `bacaRute()` (§11), dan
pembaca situs dengan cadangan **per isian** (§10a). Probe-nya juga wajib
memulihkan isi semula bahkan saat gagal di tengah — entitas tunggal tidak bisa
dibersihkan dengan menghapus baris uji (§13).

**Butuh batas jumlah baris tayang?** Sudah ada dua preseden dengan alasan yang
berbeda — 13 industri (geometri) dan 6 langkah cara kerja (panjang halaman):
tegakkan di ROUTE
dengan 422 berkalimat, bukan trigger database (§4b); taruh kalimatnya sebagai
konstanta di `shared/` supaya panel mengucapkan kalimat yang sama; matikan
tombol Tambah di
panel saat penuh; dan kalau ada nomor yang tercetak di situs, hitung dari
baris tayang saja (§14).

**Gambarnya pilihan tetap dari kode, bukan unggahan?** Ikuti pola glyph cara
kerja: enum di database (nama yang belum punya komponennya mustahil
tersimpan), nilai deskriptif-fungsional, peta komponen bertipe
`Record<Key, …>` supaya nilai baru menolak compile sampai gambarnya ada, dan
radio bernama-gambar di form — bukan `PemilihFoto` (§4b). Kuncinya harus milik
BARIS, bukan posisi atau nama yang bisa diganti editor (§14).

**Seksinya memakai hook motion ber-target ref?** Pecah gerbang daftar-kosong
ke komponen LUAR yang tanpa hook, seperti `Process`/`ProcessSection` —
`return null` sesudah hook-nya jalan melempar di luar render (§14).
