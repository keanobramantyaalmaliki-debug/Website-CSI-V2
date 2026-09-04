import { describe, expect, it } from "vitest";
import {
  MAX_LIVE_PROCESS_STEPS,
  PROCESS_GLYPH_KEYS,
} from "@shared/processStep";
import {
  firstProcessStepError,
  isProcessStepPublishable,
  PESAN_BATAS_PROSES,
  validateProcessStep,
  type ProcessStepInput,
} from "@shared/validateProcessStep";

const lengkap = (over: Partial<ProcessStepInput> = {}): ProcessStepInput => ({
  title: "Discovery",
  kicker: "UNDERSTAND",
  desc: "We map your current workflows, pain points, and goals before writing a line of code.",
  glyph: "discovery",
  state: "live",
  ...over,
});

describe("validateProcessStep — draft longgar", () => {
  it("draft cuma butuh judul langkah", () => {
    expect(
      validateProcessStep({
        ...lengkap(),
        state: "draft",
        kicker: "",
        desc: "",
      }),
    ).toEqual({});
  });

  it("draft tanpa judul tetap ditolak — barisnya jadi tak terbedakan di panel", () => {
    expect(
      validateProcessStep({ ...lengkap(), state: "draft", title: "  " }).title,
    ).toBeTruthy();
  });

  it("draft tidak pernah ikut publish, selengkap apa pun isinya", () => {
    expect(isProcessStepPublishable(lengkap({ state: "draft" }))).toBe(false);
  });
});

describe("validateProcessStep — live diperiksa penuh", () => {
  it("langkah lengkap lolos", () => {
    expect(validateProcessStep(lengkap())).toEqual({});
    expect(isProcessStepPublishable(lengkap())).toBe(true);
  });

  it("kicker jadi wajib begitu live", () => {
    expect(validateProcessStep(lengkap({ kicker: "" })).kicker).toBeTruthy();
    expect(isProcessStepPublishable(lengkap({ kicker: "" }))).toBe(false);
  });

  /* Kicker dicetak KAPITAL dengan tracking-widest: satu huruf memakan tempat
     jauh lebih banyak daripada kelihatannya, dan dua baris merusak kepala
     kartu. */
  it("kicker kepanjangan ditolak", () => {
    expect(
      validateProcessStep(lengkap({ kicker: "A".repeat(19) })).kicker,
    ).toBeTruthy();
  });

  it("penjelasan jadi wajib begitu live", () => {
    expect(validateProcessStep(lengkap({ desc: "" })).desc).toBeTruthy();
    expect(isProcessStepPublishable(lengkap({ desc: "" }))).toBe(false);
  });

  it("penjelasan sepanjang paragraf ditolak — kartu punya slot setinggi tetap", () => {
    expect(
      validateProcessStep(lengkap({ desc: "a".repeat(181) })).desc,
    ).toBeTruthy();
  });

  it("judul kepanjangan ditolak", () => {
    expect(
      validateProcessStep(lengkap({ title: "a".repeat(41) })).title,
    ).toBeTruthy();
  });

  it("langkah terpanjang yang tayang hari ini masih lolos", () => {
    expect(
      validateProcessStep(
        lengkap({
          title: "Deployment & Support",
          kicker: "UNDERSTAND",
          desc: "Engineers build in short, reviewable cycles. Nothing lands without a second pair of eyes.",
        }),
      ),
    ).toEqual({});
  });
});

describe("ilustrasi & status", () => {
  it("keenam ilustrasi yang ada semuanya diterima", () => {
    for (const glyph of PROCESS_GLYPH_KEYS) {
      expect(validateProcessStep(lengkap({ glyph }))).toEqual({});
    }
  });

  /* Ilustrasi di luar enam yang ada tidak akan ketemu komponennya di
     `PROCESS_GLYPHS_BY_KEY` dan kartunya tampil tanpa kepala — jadi ditahan
     bahkan untuk draf: nilai di luar daftar bukan pekerjaan setengah jadi,
     melainkan data rusak. */
  it("ilustrasi di luar daftar ditolak, bahkan untuk draft", () => {
    const rusak = {
      ...lengkap({ state: "draft" }),
      glyph: "radar",
    } as unknown as ProcessStepInput;
    expect(validateProcessStep(rusak).glyph).toBeTruthy();
  });

  it("status di luar dua pilihan ditolak", () => {
    const rusak = {
      ...lengkap(),
      state: "archived",
    } as unknown as ProcessStepInput;
    expect(validateProcessStep(rusak).state).toBeTruthy();
  });
});

describe("firstProcessStepError", () => {
  it("menyebut masalah paling atas dulu, bukan yang pertama ditemukan mesin", () => {
    const errors = validateProcessStep(lengkap({ title: "", desc: "" }));
    expect(firstProcessStepError(errors)?.field).toBe("title");
  });

  it("null saat semuanya sudah benar", () => {
    expect(firstProcessStepError(validateProcessStep(lengkap()))).toBeNull();
  });
});

describe("MAX_LIVE_PROCESS_STEPS", () => {
  /* Bukan tugas validateProcessStep — dicatat di sini supaya kalau suatu hari
     ada yang memindahkan penjaganya, tesnya ikut mengarahkan ke tempat yang
     benar (`server/routes/processSteps.ts`). */
  it("bukan urusan pemeriksa per-baris", () => {
    expect(MAX_LIVE_PROCESS_STEPS).toBe(6);
    expect(validateProcessStep(lengkap())).toEqual({});
  });

  it("sebanyak ilustrasi yang tersedia", () => {
    expect(PROCESS_GLYPH_KEYS).toHaveLength(MAX_LIVE_PROCESS_STEPS);
  });

  it("pesan batasnya menyebut angka yang sama", () => {
    expect(PESAN_BATAS_PROSES).toContain(String(MAX_LIVE_PROCESS_STEPS));
  });
});
