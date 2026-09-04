import { describe, expect, it } from "vitest";
import {
  firstDeploymentError,
  isDeploymentPublishable,
  validateDeployment,
  type DeploymentInput,
} from "@shared/validateDeployment";

const lengkap = (over: Partial<DeploymentInput> = {}): DeploymentInput => ({
  sector: "Public Services",
  region: "Indonesia",
  desc: "Citizens reach government services online, and every agency works from the same information at the same time.",
  image: "https://images.unsplash.com/photo-1",
  state: "live",
  ...over,
});

describe("validateDeployment — draft longgar", () => {
  it("draft cuma butuh sektor", () => {
    expect(
      validateDeployment({
        ...lengkap(),
        state: "draft",
        region: "",
        desc: "",
        image: "",
      }),
    ).toEqual({});
  });

  it("draft tanpa sektor tetap ditolak", () => {
    expect(
      validateDeployment({ ...lengkap(), state: "draft", sector: "  " }).sector,
    ).toBeTruthy();
  });

  it("draft tidak pernah ikut publish, selengkap apa pun isinya", () => {
    expect(isDeploymentPublishable(lengkap({ state: "draft" }))).toBe(false);
  });
});

describe("validateDeployment — live diperiksa penuh", () => {
  it("kartu lengkap lolos", () => {
    expect(validateDeployment(lengkap())).toEqual({});
    expect(isDeploymentPublishable(lengkap())).toBe(true);
  });

  /* Baris metanya berbunyi "03 · " lalu berhenti — titik tengah menggantung
     tanpa apa pun sesudahnya. */
  it("wilayah jadi wajib begitu live", () => {
    expect(validateDeployment(lengkap({ region: "" })).region).toBeTruthy();
    expect(isDeploymentPublishable(lengkap({ region: "  " }))).toBe(false);
  });

  it("keterangan jadi wajib begitu live", () => {
    expect(validateDeployment(lengkap({ desc: "" })).desc).toBeTruthy();
    expect(isDeploymentPublishable(lengkap({ desc: "" }))).toBe(false);
  });

  /* Kartunya `aspect-[4/3] overflow-hidden justify-end`: teks kepanjangan
     mendorong kepala kartu keluar kotak, bukan memanjangkan kartunya. */
  it("keterangan sepanjang esai ditolak", () => {
    expect(validateDeployment(lengkap({ desc: "a".repeat(241) })).desc)
      .toBeTruthy();
  });

  it("sektor kepanjangan ditolak", () => {
    expect(validateDeployment(lengkap({ sector: "a".repeat(41) })).sector)
      .toBeTruthy();
  });

  it("wilayah kepanjangan ditolak — sebaris dengan nomornya", () => {
    expect(validateDeployment(lengkap({ region: "a".repeat(31) })).region)
      .toBeTruthy();
  });

  it("foto jadi wajib begitu live", () => {
    expect(validateDeployment(lengkap({ image: "  " })).image).toBeTruthy();
    expect(isDeploymentPublishable(lengkap({ image: "" }))).toBe(false);
  });

  /* Kelima kartu yang tayang hari ini harus tetap lolos aturannya sendiri —
     kalau tidak, batas panjangnya ketat bukan karena tata letak melainkan
     karena salah hitung. */
  it("kelima kartu bawaan lolos apa adanya", () => {
    const bawaan: DeploymentInput[] = [
      lengkap(),
      lengkap({
        sector: "Infrastructure",
        desc: "Physical assets and field crews report in as they work, so issues show up while there's still time to act.",
      }),
      lengkap({
        sector: "Logistics",
        region: "International",
        desc: "Every shipment stays visible from origin to delivery. Routine handoffs run on their own, and crews in the field decide with data that is actually current.",
      }),
      lengkap({
        sector: "Hospitality",
        region: "Southeast Asia",
        desc: "Property operations and guest service share one system, with revenue reporting built into the same view.",
      }),
      lengkap({
        sector: "Communities",
        desc: "A single platform ties residents to their local administrators and services, working the same way online and in person.",
      }),
    ];
    for (const kartu of bawaan) expect(validateDeployment(kartu)).toEqual({});
  });
});

describe("status", () => {
  it("status di luar dua pilihan ditolak", () => {
    const rusak = {
      ...lengkap(),
      state: "closed",
    } as unknown as DeploymentInput;
    expect(validateDeployment(rusak).state).toBeTruthy();
  });
});

describe("firstDeploymentError", () => {
  it("menyebut masalah paling atas dulu, bukan yang pertama ditemukan mesin", () => {
    const errors = validateDeployment(lengkap({ sector: "", desc: "" }));
    expect(firstDeploymentError(errors)?.field).toBe("sector");
  });

  it("null saat semuanya sudah benar", () => {
    expect(firstDeploymentError(validateDeployment(lengkap()))).toBeNull();
  });
});

describe("sektor kembar bukan urusan pemeriksa per-baris", () => {
  /* Dicatat di sini supaya kalau suatu hari ada yang memindahkan penjaganya,
     tesnya ikut mengarahkan ke tempat yang benar
     (`server/routes/deployments.ts`). Sekaligus mengunci keputusannya: sektor
     sama + wilayah beda itu SAH, dan pemeriksa ini memang tidak boleh
     mengeluh. */
  it("dua kartu bersektor sama sama-sama lolos di sini", () => {
    expect(validateDeployment(lengkap({ sector: "Logistics" }))).toEqual({});
    expect(
      validateDeployment(
        lengkap({ sector: "Logistics", region: "International" }),
      ),
    ).toEqual({});
  });
});
