/**
 * Membatalkan SATU perubahan yang belum terpublish.
 *
 * Layar Review sudah menunjukkan apa yang akan tayang begitu Publish ditekan.
 * Berkas ini yang menjawab tombol di sebelahnya: kembalikan satu benda ke
 * keadaan yang SEKARANG tayang di situs, tanpa menyentuh perubahan lain yang
 * sedang menunggu di baris sebelahnya.
 *
 * Tiga hal yang menentukan bentuk berkas ini:
 *
 * 1. **Apa yang tertahan tidak dihitung ulang di sini.** Daftarnya diambil dari
 *    `riwayatTertahan()` lalu dikelompokkan `kelompokkanTertahan()` — persis
 *    dua fungsi yang mengisi layar Review. Aturan kedua tentang "mana yang
 *    menunggu" berarti tombol bisa membatalkan benda yang tidak ada di layar,
 *    atau menolak benda yang ada.
 *
 * 2. **Tidak ada baris `audit_log` yang dihapus atau disunting.** Pembatalan
 *    MENAMBAH satu baris ber-aksi `revert`, dan baris draf yang dibatalkan
 *    disaring dari tampilan lewat `TIDAK_DIBATALKAN` di `audit.ts`. Catatan
 *    perubahan gunanya justru karena ia tidak bisa dirapikan dari panel yang
 *    mencatatnya.
 *
 * 3. **Dua penghitung harus ikut berhenti menghitung.** Daftar Review membaca
 *    `audit_log` (beres oleh saringan di atas), tapi angka di bilah Publish
 *    membaca CAP WAKTU baris (`updatedAt > publishedAt` di `publish.ts`).
 *    Karena itu sesudah isinya dikembalikan, `updated_at` disetel ulang ke
 *    `published_at`. Tanpa itu, layar yang sama menampilkan dua angka yang
 *    saling membantah: daftar kosong, bilah bilang masih ada yang menunggu.
 */

import { eq, sql } from "drizzle-orm";
import { MAX_LIVE_INDUSTRIES } from "@shared/industry";
import { MAX_LIVE_PROCESS_STEPS } from "@shared/processStep";
import {
  barisUrutan,
  kelompokkanTertahan,
  namaEntitas,
  type PeristiwaTertahan,
} from "@shared/riwayat";

import {
  MAKS_TERTAHAN,
  record,
  riwayatTertahan,
  sebagaiPeristiwa,
  type Actor,
} from "./audit";
import { db } from "./db/client";
import {
  caseStudies,
  crewMembers,
  deployments,
  footer,
  industries,
  jobs,
  peopleValues,
  processSteps,
  sectionTexts,
  services,
  testimonials,
  vision,
  workProjects,
} from "./db/schema";

import { parseCaseStudyInput } from "./routes/caseStudies";
import { parseCrewInput } from "./routes/crew";
import { parseDeploymentInput } from "./routes/deployments";
import { parseFooterInput } from "./routes/footer";
import { parseIndustryInput } from "./routes/industries";
import { parseJobInput } from "./routes/jobs";
import { parseProcessStepInput } from "./routes/processSteps";
import { parseSectionTextInput } from "./routes/sectionText";
import { parseServiceInput } from "./routes/services";
import { parseTestimonialInput } from "./routes/testimonials";
import { parseValueInput } from "./routes/values";
import { parseVisionInput } from "./routes/vision";
import { parseWorkProjectInput } from "./routes/workProjects";

import { caseStudyTitleTaken, softDeleteCaseStudy, updateCaseStudy } from "./caseStudiesRepo";
import { crewNameTaken, softDeleteCrew, updateCrew } from "./crewRepo";
import { deploymentPairTaken, softDeleteDeployment, updateDeployment } from "./deploymentsRepo";
import { saveFooter } from "./footerRepo";
import {
  countLiveIndustries,
  industryNameTaken,
  softDeleteIndustry,
  updateIndustry,
} from "./industriesRepo";
import { slugTaken, softDeleteJob, updateJob } from "./jobsRepo";
import {
  countLiveProcessSteps,
  processStepTitleTaken,
  softDeleteProcessStep,
  updateProcessStep,
} from "./processStepsRepo";
import { updateSectionTextById } from "./sectionTextRepo";
import { serviceTitleTaken, softDeleteService, updateService } from "./servicesRepo";
import { softDeleteTestimonial, testimonialNameTaken, updateTestimonial } from "./testimonialsRepo";
import { softDeleteValue, updateValue, valueTitleTaken } from "./valuesRepo";
import { saveVision } from "./visionRepo";
import { softDeleteWorkProject, updateWorkProject, workProjectTitleTaken } from "./workProjectsRepo";

/**
 * "Kembali seperti waktu terakhir dipublish", dibaca dari KOLOM sebelahnya.
 *
 * Bukan `dbNow()` dan apalagi bukan `new Date()`: yang ingin dikatakan baris
 * ini adalah "aku tidak berubah sejak Publish terakhir", dan satu-satunya
 * nilai yang benar-benar berarti itu adalah `published_at` milik baris itu
 * sendiri. Menuliskan jam mana pun ke sini — jam DB sekalipun — akan lebih
 * besar dari `published_at` dan membuat badge "belum terpublish" tetap menyala
 * untuk perubahan yang barusan dibatalkan.
 *
 * `coalesce` cuma penjaga. Cabang yang memanggilnya hanya berjalan untuk benda
 * yang SUDAH pernah tayang, jadi `published_at`-nya pasti terisi; kalau suatu
 * hari tidak, membiarkan `updated_at` apa adanya lebih baik daripada menulis
 * NULL ke kolom yang tidak boleh kosong.
 */
const CAP_TERAKHIR_TAYANG = sql`coalesce(published_at, updated_at)`;

/* ── Peta entitas ─────────────────────────────────────────────────────── */

/**
 * Cara memulihkan satu jenis konten.
 *
 * Sengaja tidak generik terhadap tabelnya: `db.update(tabel)` yang tabelnya
 * datang dari sebuah `Record` akan kehilangan tipe kolomnya dan berakhir di
 * `any`. Yang dilakukan di sini sama dengan yang sudah dilakukan `publish.ts`
 * saat menandai dua belas tabel — statement per entitas, ditulis apa adanya,
 * dan tipenya utuh.
 */
type Pemulih = {
  /** Punya id sendiri (uuid) atau tunggal seperti visi dan kaki halaman.
   *  Yang tunggal tidak bisa dihapus, jadi juga tidak punya cabang `create`. */
  berid: boolean;
  /**
   * Aturan tingkat DAFTAR yang bisa dilanggar oleh pemulihan: nama kembar, dan
   * batas jumlah yang tayang. Isi yang dipulihkan dulu sah — ia pernah tayang —
   * tapi daftarnya sudah berubah sejak itu. Judul yang dilepas bisa keburu
   * dipakai baris lain, dan sektor yang dihidupkan kembali bisa menjadikan
   * jumlah tayang tiga belas lewat satu.
   *
   * Mengembalikan kalimat untuk editor, atau `null` kalau aman.
   */
  halangan(raw: unknown, id: string): Promise<string | null>;
  /** Tulis isinya. `null` = bendanya memang tidak ada. */
  tulis(raw: unknown, id: string): Promise<unknown>;
  /** Hapus lunak — cabang "dibuat tapi belum pernah tayang". */
  hapus(id: string): Promise<unknown>;
  /** Lepas tanda hapus SEBELUM `tulis`, karena `getXById` menyaring baris
   *  terhapus dan `updateX` membaca lewatnya: tanpa ini, memulihkan benda yang
   *  dihapus selalu berakhir "tidak ditemukan". */
  bangunkan(id: string): Promise<void>;
  /** `updated_at = published_at`. Lihat `CAP_TERAKHIR_TAYANG`. */
  capUlang(id: string): Promise<void>;
};

/** Entitas berdaftar: punya uuid, bisa dihapus, bisa bertabrakan nama. */
function berdaftar<I>(cfg: {
  urai(raw: unknown): I;
  halangan?: (input: I, id: string) => Promise<string | null>;
  tulis(id: string, input: I): Promise<unknown>;
  hapus(id: string): Promise<unknown>;
  bangunkan(id: string): Promise<void>;
  capUlang(id: string): Promise<void>;
}): Pemulih {
  return {
    berid: true,
    halangan: (raw, id) =>
      cfg.halangan ? cfg.halangan(cfg.urai(raw), id) : Promise.resolve(null),
    tulis: (raw, id) => cfg.tulis(id, cfg.urai(raw)),
    hapus: cfg.hapus,
    bangunkan: cfg.bangunkan,
    capUlang: cfg.capUlang,
  };
}

/** Visi dan kaki halaman: satu baris, tanpa id uuid, tanpa hapus. */
function tunggal<I>(cfg: {
  urai(raw: unknown): I;
  tulis(input: I): Promise<unknown>;
  capUlang(): Promise<void>;
}): Pemulih {
  const tidakBerlaku = () => Promise.resolve(null);
  return {
    berid: false,
    halangan: tidakBerlaku,
    tulis: (raw) => cfg.tulis(cfg.urai(raw)),
    hapus: tidakBerlaku,
    bangunkan: () => Promise.resolve(),
    capUlang: () => cfg.capUlang(),
  };
}

/**
 * Judul seksi: baris tetap yang punya uuid.
 *
 * Bentuk ketiga, dan bukan salah satu dari dua di atas. Bukan `berdaftar`
 * karena barisnya tidak bisa dibuat maupun dihapus — tidak ada cabang
 * `create`, tidak ada tanda hapus untuk dilepas, dan tidak ada nama kembar
 * atau batas jumlah yang bisa dilanggar. Bukan `tunggal` karena satu entitas
 * riwayat menaungi beberapa seksi sekaligus, jadi id barisnya justru yang
 * menentukan seksi mana yang dipulihkan.
 *
 * `hapus` tidak akan pernah terpanggil: cabang itu hanya dimasuki peristiwa
 * ber-aksi `create`, dan judul seksi tidak pernah mencatatnya (barisnya lahir
 * dari `db:seed` dengan `published_at` sudah terisi, tanpa baris audit). Ia
 * menjawab `null` supaya kalaupun suatu saat terpanggil, jawabannya "isinya
 * sudah tidak ada" alih-alih menghapus baris yang dirujuk komponen situs.
 */
function berkunciTetap<I>(cfg: {
  urai(raw: unknown): I;
  tulis(id: string, input: I): Promise<unknown>;
  capUlang(id: string): Promise<void>;
}): Pemulih {
  return {
    berid: true,
    halangan: () => Promise.resolve(null),
    tulis: (raw, id) => cfg.tulis(id, cfg.urai(raw)),
    hapus: () => Promise.resolve(null),
    bangunkan: () => Promise.resolve(),
    capUlang: cfg.capUlang,
  };
}

/**
 * Satu pemulih untuk empat entitas riwayat.
 *
 * `section_text_home` / `_services` / `_work` / `_people` dipisah semata-mata
 * supaya tiap baris riwayat bisa menaut ke layar panel yang benar
 * (`shared/riwayat.ts`). Tabelnya satu dan cara memulihkannya sama persis,
 * jadi keempatnya menunjuk objek yang sama.
 */
const judulSeksi = berkunciTetap({
  urai: parseSectionTextInput,
  tulis: updateSectionTextById,
  capUlang: async (id) => {
    await db
      .update(sectionTexts)
      .set({ updatedAt: CAP_TERAKHIR_TAYANG })
      .where(eq(sectionTexts.id, id));
  },
});

const PEMULIH: Record<string, Pemulih> = {
  job: berdaftar({
    urai: parseJobInput,
    halangan: async (input, id) =>
      input.slug.trim() && (await slugTaken(input.slug, id))
        ? `Alamat halaman "${input.slug}" sudah dipakai lowongan lain sekarang. Ganti alamat lowongan itu dulu, baru pembatalan ini bisa dilanjutkan.`
        : null,
    tulis: updateJob,
    hapus: softDeleteJob,
    bangunkan: async (id) => {
      await db.update(jobs).set({ deletedAt: null }).where(eq(jobs.id, id));
    },
    capUlang: async (id) => {
      await db
        .update(jobs)
        .set({ updatedAt: CAP_TERAKHIR_TAYANG })
        .where(eq(jobs.id, id));
    },
  }),

  value: berdaftar({
    urai: parseValueInput,
    halangan: async (input, id) =>
      input.title.trim() && (await valueTitleTaken(input.title, id))
        ? `Judul "${input.title.trim()}" sudah dipakai nilai lain sekarang. Ganti judul nilai itu dulu, baru pembatalan ini bisa dilanjutkan.`
        : null,
    tulis: updateValue,
    hapus: softDeleteValue,
    bangunkan: async (id) => {
      await db
        .update(peopleValues)
        .set({ deletedAt: null })
        .where(eq(peopleValues.id, id));
    },
    capUlang: async (id) => {
      await db
        .update(peopleValues)
        .set({ updatedAt: CAP_TERAKHIR_TAYANG })
        .where(eq(peopleValues.id, id));
    },
  }),

  crew: berdaftar({
    urai: parseCrewInput,
    halangan: async (input, id) =>
      input.name.trim() && (await crewNameTaken(input.name, id))
        ? `Nama "${input.name.trim()}" sudah dipakai anggota lain sekarang. Ganti nama anggota itu dulu, baru pembatalan ini bisa dilanjutkan.`
        : null,
    tulis: updateCrew,
    hapus: softDeleteCrew,
    bangunkan: async (id) => {
      await db
        .update(crewMembers)
        .set({ deletedAt: null })
        .where(eq(crewMembers.id, id));
    },
    capUlang: async (id) => {
      await db
        .update(crewMembers)
        .set({ updatedAt: CAP_TERAKHIR_TAYANG })
        .where(eq(crewMembers.id, id));
    },
  }),

  work_project: berdaftar({
    urai: parseWorkProjectInput,
    halangan: async (input, id) =>
      input.title.trim() && (await workProjectTitleTaken(input.title, id))
        ? `Nama proyek "${input.title.trim()}" sudah dipakai proyek lain sekarang. Ganti nama proyek itu dulu, baru pembatalan ini bisa dilanjutkan.`
        : null,
    tulis: updateWorkProject,
    hapus: softDeleteWorkProject,
    bangunkan: async (id) => {
      await db
        .update(workProjects)
        .set({ deletedAt: null })
        .where(eq(workProjects.id, id));
    },
    capUlang: async (id) => {
      await db
        .update(workProjects)
        .set({ updatedAt: CAP_TERAKHIR_TAYANG })
        .where(eq(workProjects.id, id));
    },
  }),

  case_study: berdaftar({
    urai: parseCaseStudyInput,
    halangan: async (input, id) =>
      input.title.trim() && (await caseStudyTitleTaken(input.title, id))
        ? `Judul "${input.title.trim()}" sudah dipakai case study lain sekarang. Ganti judul case study itu dulu, baru pembatalan ini bisa dilanjutkan.`
        : null,
    tulis: updateCaseStudy,
    hapus: softDeleteCaseStudy,
    bangunkan: async (id) => {
      await db
        .update(caseStudies)
        .set({ deletedAt: null })
        .where(eq(caseStudies.id, id));
    },
    capUlang: async (id) => {
      await db
        .update(caseStudies)
        .set({ updatedAt: CAP_TERAKHIR_TAYANG })
        .where(eq(caseStudies.id, id));
    },
  }),

  service: berdaftar({
    urai: parseServiceInput,
    halangan: async (input, id) =>
      input.title.trim() && (await serviceTitleTaken(input.title, id))
        ? `Nama layanan "${input.title.trim()}" sudah dipakai layanan lain sekarang. Ganti nama layanan itu dulu, baru pembatalan ini bisa dilanjutkan.`
        : null,
    tulis: updateService,
    hapus: softDeleteService,
    bangunkan: async (id) => {
      await db
        .update(services)
        .set({ deletedAt: null })
        .where(eq(services.id, id));
    },
    capUlang: async (id) => {
      await db
        .update(services)
        .set({ updatedAt: CAP_TERAKHIR_TAYANG })
        .where(eq(services.id, id));
    },
  }),

  testimonial: berdaftar({
    urai: parseTestimonialInput,
    halangan: async (input, id) =>
      input.name.trim() && (await testimonialNameTaken(input.name, id))
        ? `Nama "${input.name.trim()}" sudah dipakai testimoni lain sekarang. Ganti nama testimoni itu dulu, baru pembatalan ini bisa dilanjutkan.`
        : null,
    tulis: updateTestimonial,
    hapus: softDeleteTestimonial,
    bangunkan: async (id) => {
      await db
        .update(testimonials)
        .set({ deletedAt: null })
        .where(eq(testimonials.id, id));
    },
    capUlang: async (id) => {
      await db
        .update(testimonials)
        .set({ updatedAt: CAP_TERAKHIR_TAYANG })
        .where(eq(testimonials.id, id));
    },
  }),

  industry: berdaftar({
    urai: parseIndustryInput,
    halangan: async (input, id) => {
      if (input.name.trim() && (await industryNameTaken(input.name, id))) {
        return `Nama "${input.name.trim()}" sudah dipakai sektor lain sekarang. Ganti nama sektor itu dulu, baru pembatalan ini bisa dilanjutkan.`;
      }
      /* Batas 13 bisa dilanggar tanpa ada yang menambah apa pun: sektor ini
         dulu tayang, lalu dijadikan draf atau dihapus, lalu sektor lain
         menempati tempatnya. Memulihkannya begitu saja menaruh sektor ke-14 di
         tumpukan 3D yang cuma muat tiga belas. */
      if (
        input.state === "live" &&
        (await countLiveIndustries(id)) >= MAX_LIVE_INDUSTRIES
      ) {
        return `Sektor ini dulu tampil, tapi sekarang sudah ada ${MAX_LIVE_INDUSTRIES} sektor lain yang tampil dan itu batasnya. Jadikan salah satunya "Draft" dulu, baru pembatalan ini bisa dilanjutkan.`;
      }
      return null;
    },
    tulis: updateIndustry,
    hapus: softDeleteIndustry,
    bangunkan: async (id) => {
      await db
        .update(industries)
        .set({ deletedAt: null })
        .where(eq(industries.id, id));
    },
    capUlang: async (id) => {
      await db
        .update(industries)
        .set({ updatedAt: CAP_TERAKHIR_TAYANG })
        .where(eq(industries.id, id));
    },
  }),

  deployment: berdaftar({
    urai: parseDeploymentInput,
    halangan: async (input, id) =>
      input.sector.trim() &&
      input.region.trim() &&
      (await deploymentPairTaken(input.sector, input.region, id))
        ? `Sudah ada kartu "${input.sector.trim()}" untuk wilayah "${input.region.trim()}" sekarang. Ubah kartu itu dulu, baru pembatalan ini bisa dilanjutkan.`
        : null,
    tulis: updateDeployment,
    hapus: softDeleteDeployment,
    bangunkan: async (id) => {
      await db
        .update(deployments)
        .set({ deletedAt: null })
        .where(eq(deployments.id, id));
    },
    capUlang: async (id) => {
      await db
        .update(deployments)
        .set({ updatedAt: CAP_TERAKHIR_TAYANG })
        .where(eq(deployments.id, id));
    },
  }),

  "process-step": berdaftar({
    urai: parseProcessStepInput,
    halangan: async (input, id) => {
      if (input.title.trim() && (await processStepTitleTaken(input.title, id))) {
        return `Judul "${input.title.trim()}" sudah dipakai langkah lain sekarang. Ganti judul langkah itu dulu, baru pembatalan ini bisa dilanjutkan.`;
      }
      /* Alasannya sama dengan batas sektor di atas. */
      if (
        input.state === "live" &&
        (await countLiveProcessSteps(id)) >= MAX_LIVE_PROCESS_STEPS
      ) {
        return `Langkah ini dulu tampil, tapi sekarang sudah ada ${MAX_LIVE_PROCESS_STEPS} langkah lain yang tampil dan itu batasnya. Jadikan salah satunya "Draft" dulu, baru pembatalan ini bisa dilanjutkan.`;
      }
      return null;
    },
    tulis: updateProcessStep,
    hapus: softDeleteProcessStep,
    bangunkan: async (id) => {
      await db
        .update(processSteps)
        .set({ deletedAt: null })
        .where(eq(processSteps.id, id));
    },
    capUlang: async (id) => {
      await db
        .update(processSteps)
        .set({ updatedAt: CAP_TERAKHIR_TAYANG })
        .where(eq(processSteps.id, id));
    },
  }),

  vision: tunggal({
    urai: parseVisionInput,
    tulis: saveVision,
    /* Tanpa `where`, sama seperti `publish.ts`: tabelnya memang cuma boleh
       punya satu baris, dijaga CHECK `vision_satu_baris`. */
    capUlang: async () => {
      await db.update(vision).set({ updatedAt: CAP_TERAKHIR_TAYANG });
    },
  }),

  footer: tunggal({
    urai: parseFooterInput,
    tulis: saveFooter,
    /* Tanpa `where` juga, alasan sama: dijaga CHECK `footer_satu_baris`. */
    capUlang: async () => {
      await db.update(footer).set({ updatedAt: CAP_TERAKHIR_TAYANG });
    },
  }),

  section_text_home: judulSeksi,
  section_text_services: judulSeksi,
  section_text_work: judulSeksi,
  section_text_people: judulSeksi,
};

/* ── Membatalkan ──────────────────────────────────────────────────────── */

export type HasilBatal =
  | {
      ok: true;
      /** Aksi yang DIBATALKAN, bukan yang dilakukan. Panel memakainya untuk
       *  menyusun kalimat konfirmasinya. */
      aksi: PeristiwaTertahan["aksi"];
      judul: string;
    }
  | { ok: false; status: 400 | 404 | 409; pesan: string };

/** Nilai `sortOrder` sebuah isi, atau `null` kalau isinya memang tidak punya
 *  (visi, kaki halaman, atau snapshot dari skema yang lebih tua). */
function urutanDari(isi: unknown): number | null {
  if (isi === null || typeof isi !== "object" || Array.isArray(isi)) return null;
  const v = (isi as Record<string, unknown>).sortOrder;
  return typeof v === "number" ? v : null;
}

/**
 * Batalkan perubahan satu benda, kembalikan ke keadaan yang sekarang tayang.
 *
 * Cabangnya ditentukan aksi BERSIH dari `kelompokkanTertahan`, bukan aksi yang
 * terakhir tercatat — sesuatu yang dibuat lalu disunting dua kali tetap "baru
 * dibuat" bagi pengunjung, dan membatalkannya berarti membuangnya, bukan
 * mengembalikannya ke draf kedua:
 *
 *   create → hapus lunak (belum pernah tayang, tidak ada yang bisa dikembalikan)
 *   update → tulis ulang isi sewaktu Publish terakhir
 *   delete → tulis ulang isi sewaktu Publish terakhir, sekalian menghidupkannya
 */
export async function batalkan(opts: {
  entitas: string;
  entitasId: string | null;
  actor: Actor;
}): Promise<HasilBatal> {
  /* Diperiksa SEBELUM mencari kelompok tertahan, supaya jenis yang memang
     tidak dikenal dijawab apa adanya. Kalau urutannya dibalik, jawabannya
     jadi "sudah tidak menunggu Publish lagi" untuk sesuatu yang tidak pernah
     menunggu, dan yang membacanya akan mencari-cari perubahan yang tidak
     pernah ada.

     Yang TIDAK boleh naik ke sini adalah pemeriksaan bentuk `entitasId`:
     baris urutan entitas berdaftar juga dicatat tanpa id, jadi id kosong
     harus lebih dulu berkesempatan mendarat di jawaban "susun ulang saja"
     yang jauh lebih berguna. */
  const p = PEMULIH[opts.entitas];
  if (!p) {
    return {
      ok: false,
      status: 400,
      pesan: `Jenis konten "${opts.entitas}" tidak punya cara pemulihan.`,
    };
  }

  const tertahan = kelompokkanTertahan(
    (await riwayatTertahan(MAKS_TERTAHAN)).map(sebagaiPeristiwa),
  );

  const g = tertahan.find(
    (t) => t.entitas === opts.entitas && t.entitasId === opts.entitasId,
  );

  /* 404, bukan 400: permintaannya berbentuk benar, bendanya yang sudah tidak
     tertahan lagi. Paling sering karena Publish keburu ditekan di tab lain,
     atau tombol yang sama ditekan dua kali. */
  if (!g) {
    return {
      ok: false,
      status: 404,
      pesan:
        "Perubahan ini sudah tidak menunggu Publish lagi. Mungkin sudah terpublish, atau sudah dibatalkan di tab lain. Muat ulang halamannya untuk melihat keadaan terbaru.",
    };
  }

  /* Alasan lengkapnya di `barisUrutan` (`shared/riwayat.ts`): yang disimpan
     cuma daftar JUDUL, jadi urutan lamanya tidak bisa disusun kembali tanpa
     menebak. Panel menyembunyikan tombolnya memakai fungsi yang sama, jadi
     jawaban ini seharusnya tidak pernah terlihat editor. */
  if (barisUrutan(g)) {
    return {
      ok: false,
      status: 400,
      pesan:
        "Urutan tidak bisa dibatalkan lewat tombol ini. Susun ulang saja panelnya kembali ke urutan yang diinginkan.",
    };
  }


  const id = opts.entitasId;
  if (p.berid !== (id !== null)) {
    return {
      ok: false,
      status: 400,
      pesan: `Permintaan pembatalan ${namaEntitas(opts.entitas).toLowerCase()} tidak berbentuk benar.`,
    };
  }

  /* Cabang "belum pernah tayang". Hapus lunak, dan itu bukan jalan pintas:
     `menunggu()` di `publish.ts` sudah melewati baris terhapus yang belum
     pernah tayang, dan `kelompokkanTertahan` sudah membuang pasangan
     create+delete — jadi bendanya lenyap dari kedua penghitung tanpa aturan
     baru sama sekali, dan tanpa perlu setel ulang cap waktu. */
  if (g.aksi === "create") {
    if (!p.berid) {
      return {
        ok: false,
        status: 409,
        pesan: `${namaEntitas(opts.entitas)} belum pernah tayang, jadi tidak ada keadaan lama yang bisa dikembalikan. Kosongkan isiannya lewat formnya kalau memang tidak jadi dipakai.`,
      };
    }
    const dibuang = await p.hapus(id as string);
    if (dibuang === null) {
      return { ok: false, status: 404, pesan: "Isinya sudah tidak ada." };
    }
    await catat(opts, null);
    return { ok: true, aksi: "create", judul: g.judul };
  }

  /* Cabang "sudah pernah tayang". `sebelum` datang dari peristiwa TERLAMA yang
     tertahan, yaitu keadaan sewaktu Publish terakhir — persis yang dilihat
     pengunjung sekarang, dan persis yang ditampilkan kolom "Sebelum" di layar
     Review. */
  const halangan = await p.halangan(g.sebelum, id as string);
  if (halangan) return { ok: false, status: 409, pesan: halangan };

  await p.bangunkan(id as string);
  const pulih = await p.tulis(g.sebelum, id as string);
  if (pulih === null) {
    return { ok: false, status: 404, pesan: "Isinya sudah tidak ada." };
  }

  /* Cap waktu hanya disetel ulang kalau posisinya juga sudah kembali seperti
     semula. Menyusun ulang panel menaikkan `updated_at` baris-baris yang
     bergeser TANPA mencatat baris audit atas nama masing-masing (yang tercatat
     satu baris "urutan" tanpa id), jadi sebuah benda bisa punya dua perubahan
     tertahan sekaligus: isinya, dan tempatnya. Menyetel capnya di sini akan
     menghapus jejak yang kedua dari bilah Publish padahal urutannya memang
     masih akan ikut tayang. */
  const urutanLama = urutanDari(g.sebelum);
  const urutanKini = urutanDari(pulih);
  if (urutanLama === null || urutanKini === null || urutanLama === urutanKini) {
    await p.capUlang(id as string);
  }

  await catat(opts, pulih);
  return { ok: true, aksi: g.aksi, judul: g.judul };
}

/**
 * Catat pembatalannya.
 *
 * `snapshot` berisi ISI HASIL PEMULIHAN, bukan keterangan tentang
 * pembatalannya, dan itu wajib: `riwayat()` menurunkan "isi sebelum" sebuah
 * perubahan dengan `lag(snapshot)` atas SELURUH tabel tanpa penyaringan
 * (`audit.ts`). Blob metadata di sini akan jadi "isi sebelum" bagi suntingan
 * berikutnya, dan tabel perbandingannya berubah jadi omong kosong.
 */
function catat(
  opts: { entitas: string; entitasId: string | null; actor: Actor },
  isi: unknown,
): Promise<void> {
  return record({
    actor: opts.actor,
    entity: opts.entitas,
    entityId: opts.entitasId,
    action: "revert",
    snapshot: isi,
  });
}
