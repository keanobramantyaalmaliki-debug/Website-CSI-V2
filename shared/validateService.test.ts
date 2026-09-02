import { describe, expect, it } from "vitest";
import {
  firstServiceError,
  isServicePublishable,
  validateService,
  type ServiceInput,
} from "@shared/validateService";

const lengkap = (over: Partial<ServiceInput> = {}): ServiceInput => ({
  title: "Artificial Intelligence Solutions",
  desc: "AI that automates workflows and surfaces opportunities in your data.",
  subs: ["Jenna.ai", "Knowledge Assistants", "Process Automation"],
  state: "live",
  ...over,
});

describe("validateService — draft longgar", () => {
  it("draft cuma butuh nama layanan", () => {
    expect(
      validateService({ ...lengkap(), state: "draft", desc: "", subs: [] }),
    ).toEqual({});
  });

  it("draft tanpa nama tetap ditolak", () => {
    expect(
      validateService({ ...lengkap(), state: "draft", title: "  " }).title,
    ).toBeTruthy();
  });

  it("draft tidak pernah ikut publish, selengkap apa pun isinya", () => {
    expect(isServicePublishable(lengkap({ state: "draft" }))).toBe(false);
  });
});

describe("validateService — live diperiksa penuh", () => {
  it("layanan lengkap lolos", () => {
    expect(validateService(lengkap())).toEqual({});
    expect(isServicePublishable(lengkap())).toBe(true);
  });

  /* Sabuk 3D-nya `aria-hidden`, jadi daftar sr-only inilah satu-satunya
     halaman Services yang sampai ke pembaca layar dan mesin pencari. */
  it("penjelasan jadi wajib begitu live", () => {
    expect(validateService(lengkap({ desc: "" })).desc).toBeTruthy();
    expect(isServicePublishable(lengkap({ desc: "" }))).toBe(false);
  });

  it("penjelasan sepanjang paragraf ditolak", () => {
    expect(
      validateService(lengkap({ desc: "a".repeat(161) })).desc,
    ).toBeTruthy();
  });

  /* Kebalikannya, dan sama-sama disengaja: hanya satu dari sembilan layanan
     yang tayang hari ini punya rincian. */
  it("rincian boleh tidak ada sama sekali", () => {
    expect(validateService(lengkap({ subs: [] }))).toEqual({});
    expect(isServicePublishable(lengkap({ subs: [] }))).toBe(true);
  });

  it("nama layanan kepanjangan ditolak — judulnya dirender oversized", () => {
    expect(
      validateService(lengkap({ title: "a".repeat(61) })).title,
    ).toBeTruthy();
  });
});

describe("rincian", () => {
  it("rincian kembar ditolak, tanpa membedakan huruf besar-kecil", () => {
    expect(
      validateService(lengkap({ subs: ["Jenna.ai", "jenna.ai"] })).subs,
    ).toBeTruthy();
  });

  it("rincian kosong ditolak — barisnya harus diisi atau dihapus", () => {
    expect(
      validateService(lengkap({ subs: ["Jenna.ai", "  "] })).subs,
    ).toBeTruthy();
  });

  it("terlalu banyak rincian ditolak", () => {
    const sebelas = Array.from({ length: 11 }, (_, i) => `rincian ${i}`);
    expect(validateService(lengkap({ subs: sebelas })).subs).toBeTruthy();
  });
});

describe("firstServiceError", () => {
  it("menyebut masalah paling atas dulu, bukan yang pertama ditemukan mesin", () => {
    const errors = validateService(lengkap({ title: "", desc: "" }));
    expect(firstServiceError(errors)?.field).toBe("title");
  });

  it("null saat semuanya sudah benar", () => {
    expect(firstServiceError(validateService(lengkap()))).toBeNull();
  });
});
