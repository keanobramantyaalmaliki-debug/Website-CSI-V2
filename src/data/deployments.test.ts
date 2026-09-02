import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { deployments } from "./deployments";
import { __resetContent, __setContent } from "@/lib/content/store";
import { FALLBACK_DEPLOYMENTS } from "./deploymentsFallback";
import {
  firstDeploymentError,
  validateDeployment,
} from "@shared/validateDeployment";

const dariCms = (over: Record<string, unknown> = {}) => ({
  id: "a",
  sector: "Sektor Baru",
  region: "Indonesia",
  desc: "Satu kalimat isi kartu.",
  image: "/deployments/baru.webp",
  state: "live" as const,
  sortOrder: 0,
  ...over,
});

const kosong = {
  version: 1 as const,
  generatedAt: new Date().toISOString(),
  vision: null,
  footer: null,
  jobs: [],
  values: [],
  crew: [],
  projects: [],
  caseStudies: [],
  services: [],
  testimonials: [],
  industries: [],
  deployments: [],
  processSteps: [],
};

describe("FALLBACK_DEPLOYMENTS", () => {
  it("tidak kosong", () => {
    expect(FALLBACK_DEPLOYMENTS.length).toBeGreaterThan(0);
  });

  /* Cadangan bundle ikut TAYANG apa adanya kalau content.json tidak terbaca,
     jadi ia terikat aturan yang sama dengan baris dari panel — termasuk batas
     panjang teks yang diturunkan dari kotak kartunya. */
  it("tiap kartu lolos aturan yang sama dengan baris dari panel", () => {
    for (const d of FALLBACK_DEPLOYMENTS) {
      const galat = validateDeployment({ ...d, state: "live" });
      expect(firstDeploymentError(galat)).toBeNull();
    }
  });

  /* `key={`${sector} · ${region}`}` dipakai di Deployments.tsx, dan pasangan
     itulah yang unik di basis data (`deployments_sector_region_alive`).
     Sektor kembar boleh — "Logistics · Indonesia" dan "Logistics ·
     International" memang dua kartu — pasangannya yang tidak boleh. */
  it("tidak ada pasangan sektor·wilayah kembar", () => {
    const pasangan = FALLBACK_DEPLOYMENTS.map((d) => `${d.sector} · ${d.region}`);
    expect(new Set(pasangan).size).toBe(pasangan.length);
  });
});

describe("deployments()", () => {
  beforeEach(() => __resetContent());
  afterEach(() => __resetContent());

  it("memakai isi bundle saat content.json tidak pernah termuat", () => {
    expect(deployments()).toEqual(FALLBACK_DEPLOYMENTS);
  });

  it("memilih isi CMS begitu kontennya termuat", () => {
    __setContent({ ...kosong, deployments: [dariCms()] });

    const hasil = deployments();
    expect(hasil).toHaveLength(1);
    expect(hasil[0].sector).toBe("Sektor Baru");
    expect(hasil[0].image).toBe("/deployments/baru.webp");
  });

  /* Urutan menentukan dua hal sekaligus di sini: posisi kartu di grid DAN
     nomor "01"–"05" yang tercetak, karena nomornya diturunkan dari posisi.
     Yang mengurutkan server (`sortOrder`); pembaca ini tidak boleh
     mengurutkan ulang apa pun. */
  it("membiarkan urutan dari CMS apa adanya", () => {
    __setContent({
      ...kosong,
      deployments: [
        dariCms({ id: "a", sector: "Kedua", sortOrder: 1 }),
        dariCms({ id: "b", sector: "Pertama", sortOrder: 0 }),
      ],
    });
    expect(deployments().map((d) => d.sector)).toEqual(["Kedua", "Pertama"]);
  });

  /* Daftar kosong dari CMS = permintaan yang sah ("semuanya draft dulu"),
     bukan tanda content.json rusak. Yang menanganinya `Deployments.tsx`:
     seluruh section tidak dirender. Kalau pembaca ini malah jatuh ke cadangan,
     editor akan melihat kartu yang sudah dia draftkan tetap tayang. */
  it("menghormati daftar kosong dari CMS, tidak diam-diam kembali ke bundle", () => {
    __setContent({ ...kosong, deployments: [] });
    expect(deployments()).toEqual([]);
  });

  /* `content.json` yang ditulis SEBELUM deployment masuk CMS adalah berkas
     sehat yang cuma belum punya bagian ini — bukan berkas rusak. */
  it("memakai isi bundle saat content.json belum punya bagian deployment", () => {
    const lama = { ...kosong } as Record<string, unknown>;
    delete lama.deployments;
    __setContent(lama as never);
    expect(deployments()).toEqual(FALLBACK_DEPLOYMENTS);
  });

  /* Kolom yang cuma urusan panel tidak boleh bocor ke komponen: yang dipakai
     merender persis empat, dan `state`/`sortOrder`/`id` bukan salah satunya.
     `num` juga tidak ada di sini — ia diturunkan dari posisi saat merender. */
  it("cuma meneruskan isian yang dirender", () => {
    __setContent({ ...kosong, deployments: [dariCms()] });
    expect(Object.keys(deployments()[0]).sort()).toEqual([
      "desc",
      "image",
      "region",
      "sector",
    ]);
  });
});
