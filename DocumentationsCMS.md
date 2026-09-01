# DocumentationsCMS — CMS cogniti.id

Dokumentasi CMS buatan sendiri untuk **cogniti.id**: Postgres + API + panel admin
berbahasa Indonesia. Dokumentasi situsnya (3D, section, performa) ada di berkas
terpisah, `Documentations.md` — dua berkas ini sengaja tidak dicampur.

Terakhir diupdate: **1 September 2026**.

**Status ringkas:** **slice 1 (lowongan kerja) selesai dan terverifikasi di lokal.**
Sembilan entitas konten lain belum dikerjakan. Deploy ke VPS belum dikerjakan.

- Cabang: `feat/cms-lowongan` (sudah di-push, `main` 31 Agu sudah di-merge masuk lewat `99937f5`)
- 58 berkas, ~6.800 baris; kode CMS-nya sendiri ~4.150 baris di `shared/` + `server/` + `admin/src/`
- Test: `bun run test` → **64 berkas, 475 test hijau** (48 di antaranya milik CMS)
- Dua probe end-to-end lewat Brave: `scripts/probe-admin.mjs` & `scripts/probe-job-page.mjs`

---

## §1 Kenapa CMS ini ada

Dua alasan, dua-duanya nyata dan tidak saling menggantikan:

1. **Setelah situs tayang, Keano pindah ke proyek lain.** Yang mengedit konten
   adalah teman dari R&D — non-teknis. Sekarang seluruh konten hardcoded di
   `src/data/*.ts` dan di dalam komponen section, jadi mengganti satu kalimat
   lowongan berarti butuh developer, editor kode, dan satu siklus deploy.
2. **Keano mau latihan database beneran** — bukan memasang CMS jadi. Itu sebabnya
   yang dibangun Postgres + skema tulisan sendiri, bukan Sanity/Strapi/Payload.

Keputusan yang sudah disepakati sejak awal dan tidak berubah:

| Keputusan | Alasannya |
|---|---|
| **Draft → Publish**, bukan simpan-langsung-tayang | Editor non-teknis butuh tempat aman untuk setengah jadi |
| **Satu peran** untuk semua akun | Pembedaan admin/editor menambah layar & aturan yang belum ada yang membutuhkannya |
| **Upload gambar dengan resize otomatis** | Kalau tidak, foto 8 MB dari kamera akan mendarat apa adanya di halaman |
| **Hitam-putih, tanpa animasi sama sekali** | Permintaan Keano, verbatim: *"CMS yang jelas dan rapi dan yang paling penting non teknis friendly"* |
| **Lowongan dulu, ditembus sampai tayang** | Satu entitas yang benar-benar selesai lebih berguna daripada sepuluh yang setengah |

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
yang sama ditulis ulang di kepala `shared/job.ts`, karena `shared/` adalah tempat
paling mungkin orang tergoda melanggarnya.

---

## §3 Susunan berkas

```
Website CSI V2/
├── src/                situs publik — nyaris tidak disentuh
│   ├── lib/content/store.ts     ← BARU: ambil content.json + fallback
│   ├── data/jobs.ts             ← baca store (isi lama pindah ke jobsFallback.ts)
│   ├── data/careerRoles.ts      ← baca store (isi lama pindah ke careerRolesFallback.ts)
│   ├── data/jobsFallback.ts         ← BARU: isi bundle
│   └── data/careerRolesFallback.ts  ← BARU: isi bundle
├── shared/             tipe & validasi dipakai bertiga
│   ├── job.ts                   Job, JobState, ContentPayload, slugify()
│   └── validateJob.ts           aturan isi + pesan galat bahasa Indonesia
├── server/             API + Postgres, proses Node terpisah
│   ├── app.ts / index.ts        rakit app · buka port
│   ├── db/schema.ts             8 tabel Drizzle
│   ├── db/migrations/           SQL hasil drizzle-kit
│   ├── db/seed.ts               isi DB dari literal repo, sekali jalan
│   ├── jobsRepo.ts              baca/tulis lowongan (transaksi 4 tabel)
│   ├── routes/{auth,jobs,images,publish}.ts
│   ├── auth.ts · audit.ts · images.ts · publish.ts · env.ts
│   ├── createUser.ts            bikin akun editor dari terminal
│   └── tsconfig.json            WAJIB — lihat §3a
├── admin/              panel editor, app Vite KEDUA → dist-admin/
│   ├── vite.config.ts           root + cacheDir + base + proxy
│   └── src/{App,Masuk,DaftarLowongan,FormLowongan,PemilihFoto,BarPublish,ui,api}.tsx
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

Delapan tabel. Yang paling penting: **menyatukan dua sumber yang dulu terpisah** —
daftar lowongan di `Careers.tsx` dan isi halaman di `src/data/jobs.ts` — menjadi
satu baris `jobs`. Penyatuan ini prasyarat, bukan kerapian: dua tempat untuk satu
lowongan mustahil dijelaskan ke orang non-teknis.

```
jobs
  id, slug, title, department, state, overview, photo_id → images,
  ask_github, sort_order, created_at, updated_at, published_at, deleted_at

job_skills          (job_id, position) PK · label
job_copy            (job_id, lang)     PK · intro
job_copy_bullets    (job_id, lang, kind, position) PK · text
                     kind = responsibility | qualification

images              id, path (unique), source (static|upload),
                    original_name, width, height, bytes
users               id, email (unique), password_hash, name
sessions            id, user_id, expires_at
audit_log           id, user_id, entity, entity_id, action, at, snapshot (jsonb)
```

Enum Postgres sungguhan, bukan `text` + konvensi: `job_state`, `lang`,
`bullet_kind`, `image_source`.

**Tiga keputusan skema yang perlu diingat:**

1. **`state` = `draft` | `open` | `closed`.** `draft` tidak ikut masuk
   `content.json` sama sekali; `open`/`closed` mengikuti perilaku situs yang sudah
   ada (baris abu-abu mati untuk closed). Inilah yang membuat tombol Publish aman
   ditekan kapan saja: mempublish lowongan A tidak ikut menayangkan lowongan B
   yang masih separuh jadi, karena B tidak pernah ikut terangkut.

2. **Hapus = isi `deleted_at`, tidak pernah `DELETE`.** Editor non-teknis akan
   menghapus sesuatu yang penting, cepat atau lambat. Konsekuensinya: `slug` tidak
   bisa `unique` biasa — dipakai **unique index parsial** `jobs_slug_alive`
   (`where deleted_at is null`), supaya slug lowongan yang sudah dihapus bisa
   dipakai ulang.

3. **`audit_log.snapshot` menyimpan isi LENGKAP saat hapus.** Kalau hapusnya
   keliru, catatan ini yang membuat isinya bisa disusun kembali tanpa membongkar
   backup `pg_dump`.

Belajarnya kena di: relasi 1-N, PK gabungan, kolom terurut, soft delete, unique
index parsial, jsonb, dan transaksi — satu simpan menyentuh 4 tabel sekaligus.

### §4a Seed sekali jalan

`bun run db:seed` membaca `FALLBACK_ROLES` + `FALLBACK_JOBS` dari repo dan
memasukkannya ke Postgres. Konten yang sudah ditulis tidak perlu diketik ulang,
dan tidak ada kesempatan salah ketik saat memindahkannya. **Aman diulang:** kalau
tabel `jobs` sudah ada isinya, skrip berhenti tanpa menyentuh apa pun — menimpa
isi database dengan literal repo justru akan MENGHAPUS suntingan editor.

---

## §5 Validasi — ditulis sekali, dipakai dua kali

`shared/validateJob.ts` dipanggil **admin** saat mengisi form dan **server** saat
menyimpan. Server tetap memeriksa meski admin sudah memeriksa: yang menjaga data
bukan antarmuka, melainkan endpoint.

Batasnya:

| Isian | Maks | Isian | Maks |
|---|---|---|---|
| Judul | 120 | Keahlian (per item / jumlah) | 60 / 20 |
| Departemen | 60 | Paragraf pembuka | 1.200 |
| Ringkasan | 600 | Poin bullet (per item / jumlah) | 300 / 20 |
| Alamat halaman (slug) | 80, pola `^[a-z0-9]+(-[a-z0-9]+)*$` | | |

Dua aturan yang bukan sekadar panjang:

- **Foto wajib untuk status Tayang/Ditutup, boleh kosong untuk Draf.** Draf memang
  tempat setengah jadi; yang tayang tidak boleh punya kartu tanpa gambar.
- **Detail EN dan ID harus dua-duanya ada, atau dua-duanya kosong.** Halaman
  lowongan punya toggle EN/ID, jadi satu bahasa yang kosong berarti pengunjung
  yang menekan toggle mendarat di halaman kosong.

`JOB_FIELD_ORDER` menetapkan urutan isian, dipakai admin untuk memilih masalah
PERTAMA dan melompatkan fokus ke sana — bukan menumpahkan sepuluh galat sekaligus.

---

## §6 API

Hono di atas `@hono/node-server`. Adapter Node dipakai dengan sengaja meski lokal
memakai Bun: **VPS-nya hanya punya Node**, dan API yang cuma bisa hidup di Bun akan
ketahuan saat deploy, bukan sekarang.

```
GET    /api/health

POST   /api/auth/login       email + password → cookie sesi
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/jobs             daftar untuk admin (TERMASUK draft)
GET    /api/jobs/:id
POST   /api/jobs             201
PUT    /api/jobs/:id         seluruh lowongan, bukan sebagian
DELETE /api/jobs/:id         soft delete

GET    /api/images
POST   /api/images           multipart → resize + WebP

GET    /api/publish/status   { pending: n }
POST   /api/publish          tulis content.json

GET    /uploads/*            statis, TANPA login
```

**PUT, bukan PATCH** — body-nya seluruh lowongan, dan apa pun yang tidak ikut
dikirim akan hilang. Semantiknya cocok dengan form admin yang memang selalu
mengirim seluruh isian; PATCH akan menjanjikan "kirim yang berubah saja" — janji
yang tidak ditepati kode ini, dan cara menemukannya adalah lewat halaman lowongan
yang tiba-tiba kosong.

**`requireLogin` dipasang di SATU tempat**, sebagai `app.use()` untuk seluruh
prefix `/api/jobs`, `/api/images`, `/api/publish` — bukan ditempel per handler.
Penjaga yang ditempel satu per satu akan terlewat pada endpoint berikutnya yang
ditambahkan, dan lubang seperti itu tidak memunculkan error: endpoint-nya justru
bekerja dengan baik, untuk siapa saja.

**`/uploads/*` sengaja TANPA login** — berkasnya dirujuk `<img src>` di situs
publik, dan pengunjung tentu tidak punya sesi. Yang dijaga adalah siapa yang boleh
MENGUNGGAH, bukan siapa yang boleh melihat.

**Satu `app.onError` untuk seluruh API.** Isi galat aslinya masuk log proses,
TIDAK ke respons: pesan Postgres bisa memuat nama tabel dan potongan query.

`app.ts` merakit, `index.ts` membuka port. Pemisahan itu yang membuat test bisa
memanggil `app.request("/api/jobs")` langsung tanpa menyalakan server sungguhan
dan tanpa berebut port dengan proses dev yang sedang jalan.

### §6a Simpan = satu transaksi 4 tabel

`createJob`/`updateJob` menulis `jobs`, `job_skills`, `job_copy`, dan
`job_copy_bullets` di dalam satu `db.transaction`. Anak-anaknya dihapus lalu
ditulis ulang, bukan di-diff — jumlah barisnya belasan, dan diff yang salah jauh
lebih mahal daripada tulis ulang yang benar.

Dua detail yang gampang terlewat:

- **`updatedAt` diisi manual saat UPDATE.** Postgres tidak menyentuh `default now()`
  saat UPDATE, hanya saat INSERT. Lupa baris itu = badge "belum tayang" tidak
  pernah menyala dan editor mengira perubahannya sudah tayang.
- **Lowongan baru mendapat `sortOrder = min - 1`**, jadi muncul di ATAS daftar.
  Editor baru saja mengetiknya; kalau mendarat di baris ketujuh dia akan mengira
  simpannya gagal.

---

## §7 Auth & sesi

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
- `attachActor` jalan untuk SEMUA route, termasuk yang tidak butuh login, supaya
  audit log tetap tahu pelakunya.

---

## §8 Gambar

`POST /api/images` → `sharp` → **lebar maksimum 1.200 px** (`withoutEnlargement`,
jadi gambar kecil tidak dipaksa membesar) → **WebP kualitas 82** → simpan ke
`uploads/` → catat dimensi & ukuran ke tabel `images`. Batas unggah 15 MB;
tipe yang diterima JPEG, PNG, WebP, AVIF, HEIC/HEIF (foto dari iPhone masuk apa
adanya, tidak perlu dikonversi dulu).

`PemilihFoto` di panel menampilkan dua sumber sekaligus: foto lama di
`public/careers/` (baris `images` ber-`source: "static"`, dimasukkan saat seed) dan
foto unggahan baru (`source: "upload"`). Editor tidak perlu tahu bedanya.

> ⚠️ Foto lama di `public/careers/` dan `public/people/` melewati grading ffmpeg
> manual (lihat `Documentations.md` §4an). **Foto unggahan baru akan terlihat
> berbeda** — ini diterima untuk sekarang, bukan bug.

> ⚠️ `public/careers/resource-development.jpg` dirujuk data tapi tidak ada di disk
> (pre-existing, bukan dari CMS). Efeknya: satu thumbnail rusak di pemilih foto.

---

## §9 Publish

`POST /api/publish`:

1. Query semua lowongan non-draft non-deleted → rakit `ContentPayload`
   (`{ version: 1, generatedAt, jobs }`).
2. **Tulis atomik** ke `dist/content.json`: tulis ke `content.json.tmp-<pid>` di
   direktori yang sama, lalu `rename`. `rename` dalam satu filesystem bersifat
   atomik di tingkat OS, jadi pengunjung tidak pernah membaca berkas setengah
   tertulis.
3. Tandai `published_at` — **sesudah** berkasnya benar-benar tertulis. Menandai
   lebih dulu lalu gagal menulis akan memadamkan badge "belum tayang" untuk
   perubahan yang sebenarnya tidak pernah tayang.
4. Purge cache Cloudflare (kalau `CF_ZONE_ID` + `CF_PURGE_TOKEN` diisi).
   **Gagal purge TIDAK menggagalkan publish** — berkasnya sudah tertulis; yang
   muncul cuma peringatan "perubahan mungkin baru terlihat beberapa menit lagi".
5. Catat ke `audit_log`.

**Kenapa `dist/`, bukan `public/`:** `public/` disalin ke `dist/` saat build, jadi
menulis ke sana berarti perubahan baru tayang setelah `bun run build` berikutnya.
Menulis ke `dist/` membuat perubahan tayang seketika.

**Badge "N perubahan belum tayang"** (`GET /api/publish/status`) dihitung dari
`updated_at > published_at`, dengan dua pengecualian yang ditulis eksplisit:

- **Lowongan yang DIHAPUS ikut dihitung** selama ia pernah tayang — barisnya masih
  terlihat pengunjung sampai publish berikutnya. Tanpa ini editor menghapus
  lowongan, melihat badge tetap nol, menyimpulkan tidak perlu menekan Publish, dan
  lowongan yang sudah ditutup terus menerima lamaran.
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

Pembacanya sinkron dan tetap bertanda tangan sama seperti sebelum CMS:

```
src/data/jobs.ts         jobPostings() · getJob(slug) · isJobPath(path)
src/data/careerRoles.ts  careerRoles()
```

Keduanya memanggil `contentJobs()`; kalau `null`, mereka mengembalikan
`FALLBACK_JOBS` / `FALLBACK_ROLES` dari `src/data/*Fallback.ts`. Seluruh pemanggil
lama jalan apa adanya, dan test section yang sudah ada tidak perlu diubah.

> Satu-satunya sentuhan ke `src/components/sections/`: `Careers.tsx` menukar
> literal `ROLES` dengan `import { careerRoles }`.

**Di dev, `content.json` disajikan plugin `serveContentJson()` di `vite.config.ts`**
— `dist/` tidak disajikan sama sekali oleh dev server, jadi tanpa plugin ini
`bun run dev` selalu jatuh ke konten bundle dan hasil edit di panel tidak pernah
kelihatan sampai di-build. Kalau berkasnya belum pernah ada, plugin **membiarkan
404**: menyembunyikan keadaan itu di dev berarti jalur fallback tidak pernah
teruji sebelum produksi.

---

## §11 Panel admin

Bahasa Indonesia, hitam-putih, tanpa animasi, tanpa framework UI. ~1.740 baris
termasuk CSS.

| Layar | Isi |
|---|---|
| `Masuk` | email + sandi. Tidak ada tautan daftar — akun dibuat lewat `bun run user:create` |
| `DaftarLowongan` | tabel Judul · Departemen · Status · Terakhir diubah, plus tombol "Tambah lowongan" |
| `FormLowongan` | satu halaman: judul, departemen, status, ringkasan, keahlian, foto, tab EN/ID, saklar GitHub, dan "Alamat halaman" di bagian lanjutan |
| `PemilihFoto` | grid foto lama + unggah baru |
| `BarPublish` | menetap di bawah: "N perubahan belum tayang" + tombol Publish |

Yang bikin ramah non-teknis: **tidak ada Markdown, tidak ada field JSON, tidak ada
slug yang diketik manual** (dibuat otomatis dari judul, bisa disunting di bagian
lanjutan), dan setiap galat validasi muncul di sebelah isiannya dalam bahasa
Indonesia. Hapus selalu lewat dialog `Konfirmasi` yang **menyebut judul
lowongannya**, dan pesan sesudahnya menjelaskan apa yang belum terjadi:
*"…Barisnya baru hilang dari situs setelah kamu menekan Publish."*

Rute pakai **hash** (`#/`, `#/baru`, `#/lowongan/<id>`) supaya panel tidak butuh
aturan rewrite di server mana pun.

`App.tsx` memegang satu-satunya salinan daftar & jumlah pending, dan `user`-nya
bertipe `Pengguna | undefined` — `undefined` berarti "masih bertanya ke server",
`null` berarti tamu. Tanpa pembedaan itu layar login berkedip muncul sepersekian
detik di setiap reload.

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
bun run db:seed               # isi dari literal repo (sekali)
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

**48 test CMS** di dalam `bun run test` (yang totalnya 64 berkas / 475 test):

| Berkas | Test | Menguji |
|---|---|---|
| `shared/validateJob.test.ts` | 12 | aturan isi & pesan galat |
| `server/routes/jobs.test.ts` | 17 | CRUD, 401 tanpa login, slug bentrok, soft delete |
| `server/publish.test.ts` | 10 | draft tidak ikut, tulis atomik, hitungan pending |
| `src/lib/content/store.test.ts` | 9 | content.json valid dipakai; gagal/timeout/versi salah → fallback |

Test server jalan di **project vitest terpisah** (`environment: "node"`), karena
`src/test/setup.ts` menyentuh `window` dan akan melempar di sana. Semua berkas
test server menumpang satu database test dan saling mengosongkan tabelnya, jadi
`fileParallelism: false` — jalan bersamaan berarti saling menghapus baris di
tengah test tetangga.

**Dua probe end-to-end lewat Brave** (CDP, nol dependensi):

`scripts/probe-admin.mjs` — 7 pemeriksaan, semuanya lolos:
```
✓ masuk sebagai editor, daftar lowongan muncul
✓ lowongan draf tersimpan dan tampil di daftar
✓ draf TIDAK ikut ke content.json setelah Publish
✓ status Tayang tanpa foto ditolak, alasannya tampil di form
✓ lowongan tayang masuk content.json (slug: probe-engineer)
✓ dihapus + Publish → hilang dari content.json
✓ tidak ada galat di konsol sepanjang jalan-jalan
```

`scripts/probe-job-page.mjs` — sisi pengunjung: halaman lowongan hidup, toggle ID
bertahan setelah refresh, tidak ada loader 3D, `office.glb` tidak ikut diunduh,
nol draw call saat diam.

**Uji jaring pengaman, dua-duanya sudah dijalankan:**
- `dist/content.json` dihapus → seluruh suite `probe-job-page.mjs` tetap lolos,
  hanya muncul `[content] memakai konten bawaan bundle` di konsol.
- proses API dimatikan → situs sama sekali tidak terpengaruh.

---

## §14 Gotcha yang sudah dibayar

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
peramban seluruh bundle demi satu baris. Aman karena tidak ada pembaca konten di
module scope; top-level await pun sebenarnya tidak pernah menolong di sana, karena
impor statis `main.tsx` dievaluasi sebelum `await`-nya jalan.

**Admin tanpa `root` menyajikan HTML SITUS.** `admin/vite.config.ts` tanpa
`root: DIR` membuat Vite memakai cwd, jadi :5174 menjawab
`<title>cogniti.id 3D Office Tour</title>` dengan status 200 — bukan error, cuma
halaman yang salah. Fix: `root: dirname(fileURLToPath(import.meta.url))`.

**Radio & checkbox bawaan tampil BIRU** di panel yang seharusnya hitam-putih.
Fix: `accent-color: var(--hitam)` di `:root`.

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

**Sembilan entitas konten lain** menyusul dengan pola yang sama setelah slice ini
terbukti jalan: people, values, industries, case study, testimonial, deployments,
services, process steps, socials.

**Di luar cakupan, permanen:** teks yang terikat tata letak — wordmark
`COGNITI.ID` dengan lebar `7.342` di `Contact.tsx`, `HEADING_LINES` di
`CsiHero.tsx`, label navbar & slug ruangan 3D. Ini tidak akan pernah masuk CMS
sebagai textarea bebas. Scene 3D juga tidak. Pembedaan peran admin/editor ditunda
sampai ada yang benar-benar membutuhkannya.

---

## §16 Resep menambah entitas berikutnya

Urutan yang terbukti untuk slice 1, dipakai ulang apa adanya:

1. Tipe + validasi di `shared/` (dipakai server & admin sekaligus)
2. Tabel di `server/db/schema.ts` → `bun run db:generate` → `db:migrate`
3. Skrip seed dari literal repo yang sudah ada — **jangan ketik ulang konten**
4. Repo (`*Repo.ts`) + route CRUD + audit log
5. Ikutkan ke `collect()` di `server/publish.ts` dan ke tipe `ContentPayload`
6. Pindahkan literal `src/data/<entitas>.ts` → `<entitas>Fallback.ts`, lalu ubah
   berkas aslinya jadi fungsi yang membaca `contentJobs()`-nya sendiri
7. Layar di `admin/src/`, pakai `ui.tsx` yang sudah ada (`Isian`, `DaftarTeks`,
   `Konfirmasi`, `Kabar`, `tanggal`)
8. Test: validasi + route + fallback store; lalu probe end-to-end
9. **`bun run build`** — bukan cuma `tsc` dan `vitest` (§14)
