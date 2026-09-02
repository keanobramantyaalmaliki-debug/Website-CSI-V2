/**
 * Publish — dari database ke berkas yang benar-benar dibaca pengunjung.
 *
 * Seluruh berkas ini memakai impor dinamis, dan itu disengaja: `CONTENT_PATH`
 * dihitung dari `process.cwd()` SAAT modulnya dimuat. Impor statis akan
 * dievaluasi sebelum baris `chdir` di bawah sempat jalan, dan test ini akan
 * menimpa `dist/content.json` sungguhan — berkas yang sedang disajikan ke
 * pengunjung.
 */

import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

const cwdAsal = process.cwd();
/* `realpath`: di macOS `tmpdir()` itu /var/... yang sebenarnya symlink ke
   /private/var/..., dan `path.resolve` di publish.ts mengembalikan bentuk
   panjangnya. Tanpa ini pemeriksaan di bawah menuduh bocor padahal aman. */
const kotakPasir = await realpath(
  await mkdtemp(path.join(tmpdir(), "cogniti-publish-")),
);
process.chdir(kotakPasir);

const { publish, pendingCount, CONTENT_PATH } = await import("./publish");
const { sql } = await import("./db/client");
const {
  asEditor,
  caseStudyBody,
  jobBody,
  loginAsEditor,
  projectBody,
  resetDb,
  industryBody,
  testimonialBody,
  valueBody,
  visionBody,
  footerBody,
} = await import("./test/helpers");

/* Pastikan chdir-nya benar-benar kena sebelum ada satu pun berkas ditulis. */
if (!CONTENT_PATH.startsWith(kotakPasir)) {
  throw new Error(`CONTENT_PATH bocor ke luar kotak pasir: ${CONTENT_PATH}`);
}

/** `res.json()` mengembalikan `unknown`; bentuknya diberikan di titik pakai. */
const json = <T,>(res: Response): Promise<T> => res.json() as Promise<T>;

type Api = ReturnType<typeof asEditor>;
let api: Api;
let aktor: { id: string; name: string };

beforeEach(async () => {
  await resetDb();
  const login = await loginAsEditor();
  api = asEditor(login);
  aktor = { id: login.userId, name: "Editor Test" };
});

afterAll(async () => {
  process.chdir(cwdAsal);
  await rm(kotakPasir, { recursive: true, force: true });
  await sql.end();
});

const buat = async (over: Record<string, unknown> = {}) => {
  const res = await api("/api/jobs", {
    method: "POST",
    body: JSON.stringify(jobBody(over)),
  });
  return (await json<{ job: { id: string; slug: string } }>(res)).job;
};

const buatNilai = async (over: Record<string, unknown> = {}) => {
  const res = await api("/api/values", {
    method: "POST",
    body: JSON.stringify(valueBody(over)),
  });
  return (await json<{ value: { id: string; title: string } }>(res)).value;
};

const buatProyek = async (over: Record<string, unknown> = {}) => {
  const res = await api("/api/projects", {
    method: "POST",
    body: JSON.stringify(projectBody(over)),
  });
  return (await json<{ project: { id: string; title: string } }>(res)).project;
};

const buatCerita = async (over: Record<string, unknown> = {}) => {
  const res = await api("/api/case-studies", {
    method: "POST",
    body: JSON.stringify(caseStudyBody(over)),
  });
  return (await json<{ study: { id: string; title: string } }>(res)).study;
};

const buatTestimoni = async (over: Record<string, unknown> = {}) => {
  const res = await api("/api/testimonials", {
    method: "POST",
    body: JSON.stringify(testimonialBody(over)),
  });
  return (await json<{ testimonial: { id: string; name: string } }>(res))
    .testimonial;
};

const buatIndustri = async (over: Record<string, unknown> = {}) => {
  const res = await api("/api/industries", {
    method: "POST",
    body: JSON.stringify(industryBody(over)),
  });
  return (await json<{ industry: { id: string; name: string } }>(res)).industry;
};

/* `PUT`, bukan `POST`: barisnya tidak dibuat lewat panel — ia satu, selalu,
   dan `saveVision` yang memutuskan apakah menyisipkan atau menimpa. */
const simpanVisi = async (over: Record<string, unknown> = {}) => {
  const res = await api("/api/vision", {
    method: "PUT",
    body: JSON.stringify(visionBody(over)),
  });
  return (await json<{ vision: { statement: string } }>(res)).vision;
};

/* `PUT` juga, alasan sama seperti visi. */
const simpanFooter = async (over: Record<string, unknown> = {}) => {
  const res = await api("/api/footer", {
    method: "PUT",
    body: JSON.stringify(footerBody(over)),
  });
  return (await json<{ footer: { email: string } }>(res)).footer;
};

const bacaContent = async () =>
  JSON.parse(await readFile(CONTENT_PATH, "utf8"));

describe("isi content.json", () => {
  it("hanya yang tayang — draft tidak pernah ikut", async () => {
    await buat({ title: "Data Engineer", state: "open" });
    await buat({ title: "Product Builder", state: "closed" });
    await buat({ title: "Masih Digodok", state: "draft" });

    const hasil = await publish(aktor);
    expect(hasil.jobs).toBe(2);

    const isi = await bacaContent();
    expect(isi.version).toBe(1);
    expect(isi.jobs.map((j: { title: string }) => j.title).sort()).toEqual([
      "Data Engineer",
      "Product Builder",
    ]);
  });

  it("tidak membocorkan kolom yang cuma urusan admin", async () => {
    await buat();
    await publish(aktor);

    const [job] = (await bacaContent()).jobs;
    expect(job).not.toHaveProperty("updatedAt");
    expect(job).not.toHaveProperty("publishedAt");
    expect(job).not.toHaveProperty("unpublished");
    /* Yang dipakai situs tetap utuh. */
    expect(Object.keys(job).sort()).toEqual([
      "askGithub",
      "department",
      "detail",
      "id",
      "overview",
      "photo",
      "skills",
      "slug",
      "sortOrder",
      "state",
      "title",
    ]);
  });

  it("lowongan yang dihapus lenyap di publish berikutnya", async () => {
    const job = await buat();
    await publish(aktor);
    expect((await bacaContent()).jobs).toHaveLength(1);

    await api(`/api/jobs/${job.id}`, { method: "DELETE" });
    await publish(aktor);
    expect((await bacaContent()).jobs).toHaveLength(0);
  });

  it("tidak meninggalkan berkas sementara", async () => {
    await buat();
    await publish(aktor);

    const { readdir } = await import("node:fs/promises");
    const berkas = await readdir(path.dirname(CONTENT_PATH));
    expect(berkas.filter((f) => f.includes(".tmp-"))).toEqual([]);
  });
});

describe("nilai ikut ke content.json", () => {
  it("hanya yang tayang, dan urutannya urutan panel", async () => {
    /* Dibuat berurutan; `createValue` menaruh yang baru di bawah, jadi urutan
       pembuatan = urutan panel di halaman People. */
    await buatNilai({ title: "Craft First" });
    await buatNilai({ title: "Partnership" });
    await buatNilai({ title: "Masih Digodok", state: "draft" });

    const hasil = await publish(aktor);
    expect(hasil.values).toBe(2);

    const isi = await bacaContent();
    /* `.sort()` sengaja TIDAK dipakai di sini, tidak seperti pemeriksaan
       lowongan di atas: urutannya justru yang sedang diuji. */
    expect(isi.values.map((v: { title: string }) => v.title)).toEqual([
      "Craft First",
      "Partnership",
    ]);
  });

  it("tidak membocorkan kolom yang cuma urusan admin", async () => {
    await buatNilai();
    await publish(aktor);

    const [value] = (await bacaContent()).values;
    expect(value).not.toHaveProperty("updatedAt");
    expect(value).not.toHaveProperty("publishedAt");
    expect(value).not.toHaveProperty("unpublished");
    expect(Object.keys(value).sort()).toEqual([
      "description",
      "id",
      "photo",
      "sortOrder",
      "state",
      "tagline",
      "title",
    ]);
  });

  it("nilai yang dihapus lenyap di publish berikutnya", async () => {
    const value = await buatNilai();
    await publish(aktor);
    expect((await bacaContent()).values).toHaveLength(1);

    await api(`/api/values/${value.id}`, { method: "DELETE" });
    await publish(aktor);
    expect((await bacaContent()).values).toHaveLength(0);
  });

  it("menyusun ulang urutan mengubah urutan yang tayang", async () => {
    const a = await buatNilai({ title: "Craft First" });
    const b = await buatNilai({ title: "Partnership" });
    await publish(aktor);

    await api("/api/values/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [b.id, a.id] }),
    });
    await publish(aktor);

    expect(
      (await bacaContent()).values.map((v: { title: string }) => v.title),
    ).toEqual(["Partnership", "Craft First"]);
  });
});

describe("proyek ikut ke content.json", () => {
  it("hanya yang tayang, dan urutannya urutan kartu", async () => {
    await buatProyek({ title: "Citizen Service Portal" });
    await buatProyek({ title: "API Gateway" });
    await buatProyek({ title: "Masih Digodok", state: "draft" });

    const hasil = await publish(aktor);
    expect(hasil.projects).toBe(2);

    const isi = await bacaContent();
    /* `.sort()` sengaja TIDAK dipakai: urutannya justru yang sedang diuji —
       yang pertama adalah kartu yang terbuka saat halaman Work dibuka. */
    expect(isi.projects.map((p: { title: string }) => p.title)).toEqual([
      "Citizen Service Portal",
      "API Gateway",
    ]);
  });

  it("label ikut utuh — ia tinggal di tabel lain, jadi paling gampang tertinggal", async () => {
    await buatProyek({ tags: ["React", "Node.js"] });
    await publish(aktor);

    const [project] = (await bacaContent()).projects;
    expect(project.tags).toEqual(["React", "Node.js"]);
  });

  it("tidak membocorkan kolom yang cuma urusan admin", async () => {
    await buatProyek();
    await publish(aktor);

    const [project] = (await bacaContent()).projects;
    expect(project).not.toHaveProperty("updatedAt");
    expect(project).not.toHaveProperty("publishedAt");
    expect(project).not.toHaveProperty("unpublished");
    expect(Object.keys(project).sort()).toEqual([
      "client",
      "id",
      "image",
      "outcome",
      "sortOrder",
      "state",
      "tags",
      "title",
      "year",
    ]);
  });

  it("proyek yang dihapus lenyap di publish berikutnya", async () => {
    const project = await buatProyek();
    await publish(aktor);
    expect((await bacaContent()).projects).toHaveLength(1);

    await api(`/api/projects/${project.id}`, { method: "DELETE" });
    await publish(aktor);
    expect((await bacaContent()).projects).toHaveLength(0);
  });

  it("menyusun ulang urutan mengubah urutan yang tayang", async () => {
    const a = await buatProyek({ title: "Citizen Service Portal" });
    const b = await buatProyek({ title: "API Gateway" });
    await publish(aktor);

    await api("/api/projects/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [b.id, a.id] }),
    });
    await publish(aktor);

    expect(
      (await bacaContent()).projects.map((p: { title: string }) => p.title),
    ).toEqual(["API Gateway", "Citizen Service Portal"]);
  });
});

describe("case study ikut ke content.json", () => {
  it("hanya yang tayang, dan urutannya urutan blok cerita", async () => {
    await buatCerita({ title: "Citizen Service Portal" });
    await buatCerita({ title: "Field Operations Suite" });
    await buatCerita({ title: "Masih Digodok", state: "draft" });

    const hasil = await publish(aktor);
    expect(hasil.caseStudies).toBe(2);

    const isi = await bacaContent();
    /* `.sort()` sengaja TIDAK dipakai: urutannya justru yang sedang diuji —
       yang pertama adalah cerita yang pertama dibaca pengunjung. */
    expect(isi.caseStudies.map((s: { title: string }) => s.title)).toEqual([
      "Citizen Service Portal",
      "Field Operations Suite",
    ]);
  });

  it("lingkup ikut utuh — ia tinggal di tabel lain, jadi paling gampang tertinggal", async () => {
    await buatCerita({ scope: ["Web Platform", "Staff Training"] });
    await publish(aktor);

    const [study] = (await bacaContent()).caseStudies;
    expect(study.scope).toEqual(["Web Platform", "Staff Training"]);
  });

  /* Paragraf dibawa oleh spasi putih, bukan oleh struktur data — kalau JSON-nya
     ditulis dengan cara yang menelan `\n\n`, seluruh cerita tayang sebagai satu
     blok panjang tanpa satu pun error. */
  it("jeda paragraf selamat sampai ke berkasnya", async () => {
    await buatCerita({ desc: "Masalahnya begini.\n\nLalu dikerjakan begitu." });
    await publish(aktor);

    const [study] = (await bacaContent()).caseStudies;
    expect(study.desc.split("\n\n")).toHaveLength(2);
  });

  it("tidak membocorkan kolom yang cuma urusan admin", async () => {
    await buatCerita();
    await publish(aktor);

    const [study] = (await bacaContent()).caseStudies;
    expect(study).not.toHaveProperty("updatedAt");
    expect(study).not.toHaveProperty("publishedAt");
    expect(study).not.toHaveProperty("unpublished");
    expect(Object.keys(study).sort()).toEqual([
      "client",
      "desc",
      "id",
      "image",
      "industry",
      "outcome",
      "quote",
      "scope",
      "sortOrder",
      "state",
      "title",
      "year",
    ]);
  });

  it("cerita yang dihapus lenyap di publish berikutnya", async () => {
    const study = await buatCerita();
    await publish(aktor);
    expect((await bacaContent()).caseStudies).toHaveLength(1);

    await api(`/api/case-studies/${study.id}`, { method: "DELETE" });
    await publish(aktor);
    expect((await bacaContent()).caseStudies).toHaveLength(0);
  });

  it("menyusun ulang urutan mengubah urutan yang tayang", async () => {
    const a = await buatCerita({ title: "Citizen Service Portal" });
    const b = await buatCerita({ title: "Field Operations Suite" });
    await publish(aktor);

    await api("/api/case-studies/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [b.id, a.id] }),
    });
    await publish(aktor);

    expect(
      (await bacaContent()).caseStudies.map((s: { title: string }) => s.title),
    ).toEqual(["Field Operations Suite", "Citizen Service Portal"]);
  });
});

describe("testimoni ikut ke content.json", () => {
  it("hanya yang tayang, dan urutannya urutan panah", async () => {
    await buatTestimoni({ name: "Ratna Wijaya" });
    await buatTestimoni({ name: "Budi Hartono" });
    await buatTestimoni({ name: "Masih Digodok", state: "draft" });

    const hasil = await publish(aktor);
    expect(hasil.testimonials).toBe(2);

    const isi = await bacaContent();
    /* Urutannya yang diuji, jadi tanpa `.sort()`: yang pertama adalah kutipan
       yang terlihat saat halaman Services dibuka, sisanya baru muncul kalau
       pengunjung menekan panah. */
    expect(isi.testimonials.map((t: { name: string }) => t.name)).toEqual([
      "Ratna Wijaya",
      "Budi Hartono",
    ]);
  });

  it("tidak membocorkan kolom yang cuma urusan admin", async () => {
    await buatTestimoni();
    await publish(aktor);

    const [testimonial] = (await bacaContent()).testimonials;
    expect(testimonial).not.toHaveProperty("updatedAt");
    expect(testimonial).not.toHaveProperty("publishedAt");
    expect(testimonial).not.toHaveProperty("unpublished");
    expect(Object.keys(testimonial).sort()).toEqual([
      "id",
      "name",
      "quote",
      "role",
      "sortOrder",
      "state",
    ]);
  });

  it("testimoni yang dihapus lenyap di publish berikutnya", async () => {
    const testimonial = await buatTestimoni();
    await publish(aktor);
    expect((await bacaContent()).testimonials).toHaveLength(1);

    await api(`/api/testimonials/${testimonial.id}`, { method: "DELETE" });
    await publish(aktor);
    expect((await bacaContent()).testimonials).toHaveLength(0);
  });

  it("menyusun ulang urutan mengganti kutipan yang terlihat duluan", async () => {
    const a = await buatTestimoni({ name: "Ratna Wijaya" });
    const b = await buatTestimoni({ name: "Budi Hartono" });
    await publish(aktor);

    await api("/api/testimonials/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [b.id, a.id] }),
    });
    await publish(aktor);

    expect(
      (await bacaContent()).testimonials.map((t: { name: string }) => t.name),
    ).toEqual(["Budi Hartono", "Ratna Wijaya"]);
  });
});

describe("industri ikut ke content.json", () => {
  it("hanya yang tayang, dan urutannya urutan plank", async () => {
    await buatIndustri({ name: "Healthcare" });
    await buatIndustri({ name: "Logistics" });
    await buatIndustri({ name: "Masih Digodok", state: "draft" });

    const hasil = await publish(aktor);
    expect(hasil.industries).toBe(2);

    const isi = await bacaContent();
    /* Urutannya yang diuji, jadi tanpa `.sort()`: ia menentukan anak tangga
       spiral yang ditempati tiap plank SEKALIGUS nomor "01", "02", … yang
       tercetak di HUD-nya. */
    expect(isi.industries.map((i: { name: string }) => i.name)).toEqual([
      "Healthcare",
      "Logistics",
    ]);
  });

  it("tidak membocorkan kolom yang cuma urusan admin", async () => {
    await buatIndustri();
    await publish(aktor);

    const [industry] = (await bacaContent()).industries;
    expect(industry).not.toHaveProperty("updatedAt");
    expect(industry).not.toHaveProperty("publishedAt");
    expect(industry).not.toHaveProperty("unpublished");
    expect(Object.keys(industry).sort()).toEqual([
      "desc",
      "id",
      "image",
      "name",
      "sortOrder",
      "state",
      "tier",
    ]);
  });

  it("sektor yang dihapus lenyap di publish berikutnya", async () => {
    const industry = await buatIndustri();
    await publish(aktor);
    expect((await bacaContent()).industries).toHaveLength(1);

    await api(`/api/industries/${industry.id}`, { method: "DELETE" });
    await publish(aktor);
    expect((await bacaContent()).industries).toHaveLength(0);
  });

  it("menyusun ulang urutan ikut mengganti nomor yang tercetak", async () => {
    const a = await buatIndustri({ name: "Healthcare" });
    const b = await buatIndustri({ name: "Logistics" });
    await publish(aktor);

    await api("/api/industries/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [b.id, a.id] }),
    });
    await publish(aktor);

    expect(
      (await bacaContent()).industries.map((i: { name: string }) => i.name),
    ).toEqual(["Logistics", "Healthcare"]);
  });
});

describe("visi ikut ke content.json", () => {
  /* Satu-satunya isian `content.json` yang bukan daftar, dan satu-satunya
     yang boleh `null`. `null` di sini berarti "barisnya belum ada di
     database" — bukan "editor mengosongkannya", yang memang tidak mungkin. */
  it("null selama barisnya belum pernah disimpan", async () => {
    const hasil = await publish(aktor);
    expect(hasil.vision).toBe(false);
    expect((await bacaContent()).vision).toBeNull();
  });

  it("terangkut utuh sesudah disimpan sekali", async () => {
    await simpanVisi({ statement: "Visi yang tayang." });

    const hasil = await publish(aktor);
    expect(hasil.vision).toBe(true);
    expect((await bacaContent()).vision).toEqual({
      statement: "Visi yang tayang.",
      photo: visionBody().photo,
    });
  });

  it("tidak membocorkan kolom yang cuma urusan admin", async () => {
    await simpanVisi();
    await publish(aktor);

    /* Tanpa `id` juga: nomor barisnya selalu 1, dan mengirimnya ke pengunjung
       cuma mengundang kode yang mencarinya dengan `find` di berkas yang cuma
       punya satu. */
    expect(Object.keys((await bacaContent()).vision).sort()).toEqual([
      "photo",
      "statement",
    ]);
  });

  it("menimpa yang tayang, bukan menambah di sebelahnya", async () => {
    await simpanVisi({ statement: "Kalimat pertama." });
    await publish(aktor);
    await simpanVisi({ statement: "Kalimat kedua." });
    await publish(aktor);

    const visi = (await bacaContent()).vision;
    expect(Array.isArray(visi)).toBe(false);
    expect(visi.statement).toBe("Kalimat kedua.");
  });
});

describe("kaki halaman ikut ke content.json", () => {
  /* Sama seperti visi: bukan daftar, dan boleh `null` — artinya "barisnya
     belum ada di database", bukan "editor mengosongkannya". */
  it("null selama barisnya belum pernah disimpan", async () => {
    const hasil = await publish(aktor);
    expect(hasil.footer).toBe(false);
    expect((await bacaContent()).footer).toBeNull();
  });

  it("terangkut utuh beserta tautannya, dalam urutan yang disimpan", async () => {
    await simpanFooter({
      email: "halo@cogniti.id",
      socials: [
        { label: "Facebook", href: "https://facebook.com/cogniti" },
        { label: "Instagram", href: "https://instagram.com/cogniti.id" },
      ],
    });

    const hasil = await publish(aktor);
    expect(hasil.footer).toBe(true);

    const kaki = (await bacaContent()).footer;
    expect(kaki.email).toBe("halo@cogniti.id");
    expect(kaki.socials).toEqual([
      { label: "Facebook", href: "https://facebook.com/cogniti" },
      { label: "Instagram", href: "https://instagram.com/cogniti.id" },
    ]);
  });

  it("tidak membocorkan kolom yang cuma urusan admin", async () => {
    await simpanFooter();
    await publish(aktor);

    const kaki = (await bacaContent()).footer;
    expect(Object.keys(kaki).sort()).toEqual([
      "address",
      "copyright",
      "email",
      "socials",
    ]);
    /* Tautannya juga: `footer_id` dan `position` cuma cara database menjaga
       urutan — yang tayang urutan lariknya sendiri. */
    expect(Object.keys(kaki.socials[0]).sort()).toEqual(["href", "label"]);
  });

  /* Daftar tautan yang dikosongkan harus SAMPAI ke pengunjung sebagai larik
     kosong, bukan hilang dari berkasnya — `src/data/footer.ts` membedakan
     "kosong" dari "tidak ada", dan pembedaan itu cuma berguna kalau publish
     benar-benar menuliskan yang kosong. */
  it("daftar tautan yang dikosongkan tayang sebagai larik kosong", async () => {
    await simpanFooter({ socials: [] });
    await publish(aktor);

    const kaki = (await bacaContent()).footer;
    expect(kaki.socials).toEqual([]);
  });

  it("menimpa yang tayang, bukan menambah di sebelahnya", async () => {
    await simpanFooter({ email: "satu@cogniti.id" });
    await publish(aktor);
    await simpanFooter({ email: "dua@cogniti.id" });
    await publish(aktor);

    const kaki = (await bacaContent()).footer;
    expect(Array.isArray(kaki)).toBe(false);
    expect(kaki.email).toBe("dua@cogniti.id");
  });
});

describe("badge perubahan belum tayang", () => {
  it("nol sesudah publish", async () => {
    await buat();
    expect(await pendingCount()).toBe(1);
    await publish(aktor);
    expect(await pendingCount()).toBe(0);
  });

  it("naik lagi begitu ada yang diubah", async () => {
    const job = await buat();
    await publish(aktor);

    await api(`/api/jobs/${job.id}`, {
      method: "PUT",
      body: JSON.stringify(jobBody({ overview: "Ringkasan baru." })),
    });
    expect(await pendingCount()).toBe(1);
  });

  it("menghitung yang dihapus tapi masih tayang", async () => {
    const job = await buat();
    await publish(aktor);

    await api(`/api/jobs/${job.id}`, { method: "DELETE" });
    /* Barisnya masih terlihat pengunjung sampai Publish ditekan lagi — kalau
       badge-nya nol di sini, editor menyimpulkan tidak perlu menekan apa-apa
       dan lowongan yang sudah ditutup terus menerima lamaran. */
    expect(await pendingCount()).toBe(1);
  });

  it("berhenti menghitung yang dihapus sesudah penghapusannya tayang", async () => {
    const job = await buat();
    await publish(aktor);
    await api(`/api/jobs/${job.id}`, { method: "DELETE" });
    await publish(aktor);

    /* Baris terhapus dulu tidak pernah ikut ditandai `publishedAt`, jadi ia
       tetap dihitung selamanya: setiap lowongan yang pernah dihapus menambah
       satu ke badge, permanen, dan angkanya cuma bisa naik. Editor melihat
       "10 perubahan belum tayang" tanpa pernah menyentuh apa pun — dan begitu
       angka itu berbohong sekali, ia tidak berguna lagi untuk seterusnya. */
    expect(await pendingCount()).toBe(0);
  });

  it("menghitung visi yang diubah — ia tidak punya draft yang menjaganya", async () => {
    await simpanVisi();
    await publish(aktor);
    expect(await pendingCount()).toBe(0);

    /* Entitas lain punya Draft/Live: perubahan yang belum siap bisa ditahan
       di sana dan badge-nya tetap masuk akal. Visi tidak punya keadaan itu —
       badge inilah SATU-SATUNYA yang memberi tahu editor bahwa kalimat yang
       barusan diketik belum sampai ke pengunjung. */
    await simpanVisi({ statement: "Kalimat yang baru diketik." });
    expect(await pendingCount()).toBe(1);
  });

  it("menghitung kaki halaman yang diubah — ia juga tanpa draft", async () => {
    await simpanFooter();
    await publish(aktor);
    expect(await pendingCount()).toBe(0);

    await simpanFooter({ email: "baru@cogniti.id" });
    expect(await pendingCount()).toBe(1);
  });

  it("angkanya tetap nol sesudah publish beruntun tanpa suntingan", async () => {
    await buat();
    await publish(aktor);
    await publish(aktor);
    expect(await pendingCount()).toBe(0);
  });

  it("draft yang belum pernah tayang tidak dihitung dua kali", async () => {
    await buat({ state: "open" });
    await publish(aktor);
    expect(await pendingCount()).toBe(0);

    await buat({ title: "Masih Digodok", state: "draft" });
    /* Draft baru memang menghitung 1: dia belum pernah tayang. Yang penting
       angkanya tidak ikut naik untuk lowongan lain yang tidak disentuh. */
    expect(await pendingCount()).toBe(1);
  });

  it("angkanya menjumlahkan semua entitas, bukan lowongan saja", async () => {
    await buat();
    await buatNilai();
    await buatProyek();
    await buatCerita();
    await buatTestimoni();
    /* Kalau `pendingCount` lupa satu tabel, angkanya tetap masuk akal di layar
       (cuma lebih kecil) dan tidak ada yang gagal — sampai editor menyunting
       nilai, melihat badge 0, dan menyimpulkan tidak perlu menekan Publish. */
    expect(await pendingCount()).toBe(5);

    await publish(aktor);
    expect(await pendingCount()).toBe(0);
  });

  it("mengubah urutan nilai adalah perubahan yang menunggu Publish", async () => {
    const a = await buatNilai({ title: "Craft First" });
    const b = await buatNilai({ title: "Partnership" });
    await publish(aktor);
    expect(await pendingCount()).toBe(0);

    await api("/api/values/urutkan", {
      method: "POST",
      body: JSON.stringify({ ids: [b.id, a.id] }),
    });
    /* Dua-duanya `updatedAt`-nya maju: urutan itu isi bersama, bukan properti
       satu baris. */
    expect(await pendingCount()).toBe(2);
  });
});

describe("endpoint publish", () => {
  it("POST /api/publish menayangkan dan melaporkan jumlahnya", async () => {
    await buat();
    await buatNilai();
    await buatProyek();
    await buatCerita();
    await buatTestimoni();
    await buatIndustri();

    const res = await api("/api/publish", { method: "POST" });
    const body = await json<{
      jobs: number;
      values: number;
      projects: number;
      caseStudies: number;
      testimonials: number;
      industries: number;
      generatedAt: string;
    }>(res);

    expect(res.status).toBe(200);
    expect(body.jobs).toBe(1);
    /* Jumlah per entitas dilaporkan terpisah, bukan satu angka total:
       kalimat yang dilihat editor sesudah menekan Publish menyebut isinya
       ("1 lowongan, 1 nilai"), dan angka total tidak bisa dipecah lagi. */
    expect(body.values).toBe(1);
    expect(body.projects).toBe(1);
    expect(body.caseStudies).toBe(1);
    expect(body.testimonials).toBe(1);
    expect(body.industries).toBe(1);
    expect(body.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const isi = await bacaContent();
    expect(isi.jobs).toHaveLength(1);
    expect(isi.values).toHaveLength(1);
    expect(isi.projects).toHaveLength(1);
    expect(isi.caseStudies).toHaveLength(1);
    expect(isi.testimonials).toHaveLength(1);
    expect(isi.industries).toHaveLength(1);
  });

  it("GET /api/publish/status memberi angka badge", async () => {
    await buat();
    const body = await json<{ pending: number }>(
      await api("/api/publish/status"),
    );
    expect(body.pending).toBe(1);
  });
});
