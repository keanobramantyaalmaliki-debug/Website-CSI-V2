# DocumentationsCMS — CMS cogniti.id

Dokumentasi CMS buatan sendiri untuk **cogniti.id**: Postgres + API + panel admin
berbahasa Indonesia. Dokumentasi situsnya (3D, section, performa) ada di berkas
terpisah, `Documentations.md` — dua berkas ini sengaja tidak dicampur.

Terakhir diupdate: **1 September 2026**.

**Status ringkas:** **tiga entitas selesai dan terverifikasi di lokal** —
lowongan, nilai ("What We Stand For"), dan crew ("The Crew"). Delapan entitas
konten lain belum dikerjakan. Deploy ke VPS belum dikerjakan.

- Cabang: `feat/cms-lowongan` (`main` 31 Agu sudah di-merge masuk lewat `99937f5`)
- Kode CMS-nya sendiri: **54 berkas, ~9.500 baris** di `shared/` + `server/` +
  `admin/src/` — panel adminnya saja ~3.670 baris
- Test: `bun run test` → **70 berkas, 580 test hijau** (161 di antaranya milik CMS)
- Lima probe end-to-end lewat Brave: `probe-admin`, `probe-nilai-admin`,
  `probe-crew-admin`, `probe-tema-admin`, `probe-job-page`

Yang berubah sejak slice pertama, selain dua entitas baru: **masuk kini dengan
kata sandi saja** (§7), panel punya **beranda dari peta konten situs** dan
**menu sisi** (§11), dan ada **tema gelap** (§11a).

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
│   └── data/{jobs,careerRoles,crew,values}Fallback.ts   isi bundle
├── shared/             tipe & validasi dipakai bertiga
│   ├── content.ts               ContentPayload + CONTENT_VERSION
│   ├── contentMap.ts            peta konten situs → beranda & menu sisi panel
│   ├── job.ts   · validateJob.ts
│   ├── value.ts · validateValue.ts
│   └── crew.ts  · validateCrew.ts
├── server/             API + Postgres, proses Node terpisah
│   ├── app.ts / index.ts        rakit app · buka port
│   ├── db/schema.ts             11 tabel Drizzle
│   ├── db/migrations/           SQL hasil drizzle-kit (0000 → 0002)
│   ├── db/seed.ts               isi DB dari literal repo, sekali jalan per tabel
│   ├── jobsRepo.ts              transaksi 4 tabel
│   ├── valuesRepo.ts            satu baris + reorder
│   ├── crewRepo.ts              transaksi 2 tabel
│   ├── routes/{auth,jobs,values,crew,images,publish}.ts
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

Sebelas tabel, tiga entitas konten. Yang paling penting di slice pertama:
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

images              id, path (unique), source (static|upload),
                    original_name, width, height, bytes
users               id, email (unique), password_hash, name, deleted_at
sessions            id, user_id, expires_at
audit_log           id, user_id, entity, entity_id, action, at, snapshot (jsonb)
```

Enum Postgres sungguhan, bukan `text` + konvensi: `job_state`, `lang`,
`bullet_kind`, `image_source`, `value_state`, `crew_state`, `crew_category`,
`social_platform`.

### §4a Pola yang dipakai ulang ketiga entitas

Ketiganya berbagi lima keputusan yang sama, dan itu yang membuat entitas keempat
nanti tinggal menyalin:

1. **`state` menentukan apa yang tayang.** `draft` tidak pernah ikut masuk
   `content.json` sama sekali. Inilah yang membuat tombol Publish aman ditekan
   kapan saja: mempublish satu baris tidak ikut menayangkan baris lain yang
   masih separuh jadi, karena yang separuh jadi tidak pernah terangkut.
2. **Hapus = isi `deleted_at`, tidak pernah `DELETE`.** Editor non-teknis akan
   menghapus sesuatu yang penting, cepat atau lambat.
3. **Unique index PARSIAL untuk baris hidup saja** — `jobs_slug_alive`,
   `people_values_title_alive`, `crew_members_name_alive`, semuanya
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

### §4b Yang BERBEDA di tiap entitas

**Nilai punya `sort_order`, crew TIDAK — dan itu keputusan, bukan kelupaan.**

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
diam-diam ikut jadi pilihan sah di form yang lain.

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
dan `FALLBACK_CREW` dari repo lalu memasukkannya ke Postgres. Konten yang sudah
ditulis tidak perlu diketik ulang, dan tidak ada kesempatan salah ketik saat
memindahkannya.

**Aman diulang:** kalau tabelnya sudah ada isinya, bagian itu berhenti tanpa
menyentuh apa pun — menimpa isi database dengan literal repo justru akan
MENGHAPUS suntingan editor.

> ⚠️ Gerbangnya **satu per tabel**, bukan satu untuk seluruh skrip. Database yang
> sudah pernah di-seed lowongan akan membuat nilai dan crew dilewati diam-diam
> kalau semuanya bergantung pada satu pemeriksaan: skripnya berhenti di baris
> pertama sambil melapor "sudah terisi", dan dua tabel lain tetap kosong tanpa
> ada yang salah kelihatannya.

Semua baris nilai dan crew masuk sebagai **`live`, bukan `draft`** — tiga belas
orang dan tiga nilai itu memang sudah tayang hari ini. Menaruhnya sebagai draf
akan MENGOSONGKAN halaman People pada publish pertama, kerusakan yang tidak
kelihatan sampai ada yang menekan tombolnya.

---

## §5 Validasi — ditulis sekali, dipakai dua kali

`shared/validateJob.ts`, `validateValue.ts`, dan `validateCrew.ts` dipanggil
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

### §5a Ketatnya IKUT STATUS

Ketiganya memakai aturan yang sama: **draf cuma perlu isian pengenalnya** —
judul untuk nilai, nama + departemen untuk crew, dan seterusnya — supaya editor
bisa menyimpan pekerjaan setengah jalan tanpa dimarahi. Pemeriksaan penuh baru
berlaku begitu statusnya Tayang/Live, yaitu tepat saat isinya akan dibaca
pengunjung.

### §5b Aturan yang bukan sekadar panjang

- **Foto wajib untuk lowongan yang Tayang/Ditutup dan untuk nilai yang Live.**
  Panel nilai memang punya keadaan tanpa foto — bingkai bertuliskan "Photo" —
  tapi itu tempat penampung untuk masa isinya belum ada, bukan tampilan yang
  boleh dilihat pengunjung.
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

`JOB_FIELD_ORDER` / `VALUE_FIELD_ORDER` / `CREW_FIELD_ORDER` menetapkan urutan
isian, dipakai admin untuk memilih masalah PERTAMA dan melompatkan fokus ke sana
— bukan menumpahkan sepuluh galat sekaligus.

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
prefix `/api/jobs`, `/api/values`, `/api/crew`, `/api/images`, `/api/publish` —
bukan ditempel per handler. Penjaga yang ditempel satu per satu akan terlewat
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

### §6a Simpan — tiga bentuk, sesuai lebar entitasnya

| Entitas | Tabel tersentuh | Transaksi? |
|---|---|---|
| Lowongan | `jobs` + 3 tabel anak | ya |
| Nilai | `people_values` saja | tidak perlu |
| Crew | `crew_members` + `crew_socials` | ya |

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
  puncak berarti mengubah panel pembuka halaman tanpa diminta.

### §6b Kenapa urutan punya endpoint sendiri

`POST /api/values/urutkan` menerima **seluruh daftar id dalam urutan barunya**,
bukan satu id + posisi baru. Daftar yang tidak menyebut semua baris hidup ditolak
bulat-bulat (422): yang tidak disebut akan tertinggal di `sortOrder` lamanya dan
bertabrakan dengan yang baru — urutan hasilnya tidak sama dengan yang mana pun
dari kedua versi, dan itu justru bentuk kerusakan yang paling sulit dibaca.

Reorder **menaikkan `updatedAt`** semua baris yang ikut. Memindahkan panel adalah
perubahan yang tayang, jadi badge "belum tayang" harus menyala.

Endpoint terpisah dan bukan isian di form, karena isian berarti meminta editor
mengarang angka `sortOrder` padahal yang dia lihat adalah tumpukan panel.

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

`PemilihFoto` dipakai **ketiga form apa adanya** — lowongan, nilai, dan crew.
Komponennya menampilkan dua sumber sekaligus: foto lama di `public/careers/` dan
`public/people/` (baris `images` ber-`source: "static"`, dimasukkan saat seed) dan
foto unggahan baru (`source: "upload"`). Editor tidak perlu tahu bedanya.

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

1. Query semua baris non-draft non-deleted dari **ketiga entitas sekaligus**
   (`Promise.all`) → rakit `ContentPayload`
   (`{ version: 1, generatedAt, jobs, values, crew }`).
2. **Tulis atomik** ke `dist/content.json`: tulis ke `content.json.tmp-<pid>` di
   direktori yang sama, lalu `rename`. `rename` dalam satu filesystem bersifat
   atomik di tingkat OS, jadi pengunjung tidak pernah membaca berkas setengah
   tertulis.
3. Tandai `published_at` di ketiga tabel — **sesudah** berkasnya benar-benar
   tertulis. Menandai lebih dulu lalu gagal menulis akan memadamkan badge "belum
   tayang" untuk perubahan yang sebenarnya tidak pernah tayang.
4. Purge cache Cloudflare (kalau `CF_ZONE_ID` + `CF_PURGE_TOKEN` diisi).
   **Gagal purge TIDAK menggagalkan publish** — berkasnya sudah tertulis; yang
   muncul cuma peringatan "perubahan mungkin baru terlihat beberapa menit lagi".
5. Catat ke `audit_log`, dengan jumlah per entitas di snapshot-nya.

**Kolom admin dibuang dari payload.** `updatedAt`, `publishedAt`, dan
`unpublished` dilepas di `collect()` untuk ketiga entitas — bukan dibiarkan ikut
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
`menunggu(r)` dan dipakai ketiga entitas. Kalau tiap entitas menyalin aturan ini,
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

`contentJobs()`, `contentValues()`, dan `contentCrew()` masing-masing memeriksa
bagiannya sendiri, dan bagian yang tidak ada TIDAK memvonis seluruh berkas.

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

### §10b Pembacanya FUNGSI, bukan konstanta

```
src/data/jobs.ts         jobPostings() · getJob(slug) · isJobPath(path)
src/data/careerRoles.ts  careerRoles()
src/data/people.ts       peopleValues() · crew()
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
situs.

### §10c Yang disentuh di `src/components/sections/`

Tiga berkas, semuanya perubahan kecil dengan satu alasan besar:

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
| `PemilihFoto` | grid foto lama + unggah baru — dipakai ketiga form |
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

Hari ini **3 dari 11 entri berstatus `siap`**: Nilai, Crew, Lowongan — ketiganya
di halaman People.

> ⚠️ Peta ini dijaga `src/lib/contentMap.test.ts`: `path` dan `label` tiap halaman
> WAJIB sama dengan `ROOM_SLUGS`/`ROOM_LABELS` di sceneStore. Kalau sebuah halaman
> situs berganti slug dan berkas ini tidak ikut, panel akan menunjukkan alamat
> yang tidak ada — dan tidak ada yang meneriakkannya.

`bacaRute()` memeriksa `status === "siap"` untuk **semua bentuk rute**, bukan cuma
daftar. Sejak ada entitas kedua, `#/apa-saja/baru` yang lolos akan membuka form
lowongan dengan alamat yang menjanjikan hal lain.

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

**161 test CMS** di dalam `bun run test` (yang totalnya 70 berkas / 580 test):

| Berkas | Test | Menguji |
|---|---|---|
| `shared/validateJob.test.ts` | 12 | aturan isi & pesan galat lowongan |
| `shared/validateValue.test.ts` | 11 | aturan isi nilai, ketat-ikut-status |
| `shared/validateCrew.test.ts` | 15 | aturan crew, tautan `https://`, `"#"` lolos |
| `server/routes/jobs.test.ts` | 17 | CRUD, 401 tanpa login, slug bentrok, soft delete |
| `server/routes/values.test.ts` | 20 | CRUD + reorder, daftar tak lengkap ditolak |
| `server/routes/crew.test.ts` | 26 | CRUD, tautan sosial, nama bentrok, departemen asing |
| `server/routes/auth.test.ts` | 6 | masuk pakai sandi saja, sandi salah, sesi |
| `server/publish.test.ts` | 18 | draft tidak ikut, tulis atomik, hitungan pending 3 entitas |
| `src/lib/content/store.test.ts` | 9 | content.json valid dipakai; gagal/timeout/versi salah → fallback |
| `src/data/people.test.ts` | 17 | CMS menang atas bundle; daftar kosong dihormati; payload lama |
| `src/lib/contentMap.test.ts` | 10 | peta konten sinkron dengan slug & label situs |

Test server jalan di **project vitest terpisah** (`environment: "node"`), karena
`src/test/setup.ts` menyentuh `window` dan akan melempar di sana. Semua berkas
test server menumpang satu database test dan saling mengosongkan tabelnya, jadi
`fileParallelism: false` — jalan bersamaan berarti saling menghapus baris di
tengah test tetangga.

> ⚠️ `resetDb()` harus menyebut **semua** tabel baru di `truncate`-nya. Tabel yang
> terlupa membuat test tetangga saling mewarisi baris, dan gejalanya "kadang
> gagal" tergantung urutan.

**Lima probe end-to-end lewat Brave** (CDP, nol dependensi), semuanya hijau:

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
berturut-turut, dan gejalanya identik dua-duanya: CMS tersimpan benar, Publish
berhasil, `content.json` isinya benar, dan halamannya tetap menampilkan data lama
— **tanpa satu pun galat.** Sebabnya `content.json` baru mendarat sesudah
`loadContent()` di `main.tsx`, sedangkan apa pun yang dihitung di tingkat modul
(`export const VALUES = ...`, `const GROUPED = CATEGORIES.map(...)`) dievaluasi
saat modulnya diimpor — sebelum itu. Fix: ekspor **fungsi**, dan pindahkan
perhitungan turunannya ke dalam komponen lewat `useMemo`. **Periksa ini PERTAMA
di entitas berikutnya.**

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

**Delapan entitas konten lain** menyusul dengan pola §16 — semuanya masih
berstatus `belum` di peta konten: deployment, cara kerja, industri, dan visi
(Home); layanan (Services); case study dan sorotan & testimoni (Work); tautan
sosial (seluruh situs).

**Di luar cakupan, permanen:** teks yang terikat tata letak — wordmark
`COGNITI.ID` dengan lebar `7.342` di `Contact.tsx`, `HEADING_LINES` di
`CsiHero.tsx`, label navbar & slug ruangan 3D. Ini tidak akan pernah masuk CMS
sebagai textarea bebas. Scene 3D juga tidak. Pembedaan peran admin/editor ditunda
sampai ada yang benar-benar membutuhkannya.

---

## §16 Resep menambah entitas berikutnya

Urutan yang sudah terbukti tiga kali, dipakai ulang apa adanya:

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
   **🔥 Lalu periksa setiap pemanggilnya:** apa pun yang dihitung di tingkat modul
   dari data itu harus pindah ke dalam komponen (§14)
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
kalau tidak, tombolnya cuma akan berbohong ke editor (§4b).
