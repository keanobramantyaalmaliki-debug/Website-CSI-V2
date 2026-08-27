/**
 * Kontrak `submitApplication`.
 *
 * Yang dijaga di sini hal-hal yang KALAU rusak akan diam-diam membuang lamaran
 * sungguhan atau membuatnya tak terbaca di inbox: honeypot tidak boleh memberi
 * tahu bot bahwa ia ketahuan, cooldown tidak boleh dihabiskan oleh kiriman yang
 * GAGAL, `skills` (array) wajib jadi teks sebelum berangkat, dan isi emailnya
 * wajib tetap Inggris meski pelamar memilih Bahasa Indonesia.
 *
 * Catatan: Web3Forms paket gratis MENOLAK panggilan dari server/curl ("use
 * client side"), jadi jalur sungguhannya memang tak bisa diuji otomatis di
 * sini — hanya bentuk kirimannya. Verifikasi akhir tetap manual lewat browser.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applicationFieldErrors,
  applyCooldownLeft,
  humanizeApplyWait,
  submitApplication,
  validateApplication,
  type ApplicationPayload,
} from "./submitApplication";

const VALID: ApplicationPayload = {
  jobTitle: "Full Stack Engineer",
  firstName: "Keano",
  lastName: "Bramantya",
  email: "keano@cogniti.id",
  location: "Jakarta, Indonesia",
  motivation: "Ingin membangun yang dipakai orang.",
  experience: "3–5 years",
  skills: ["React / Next.js", "Node.js"],
  portfolio: "keano.dev",
  linkedin: "",
};

function mockFetchOk() {
  const spy = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, message: "Email sent" }),
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

/** Badan kiriman yang benar-benar dikirim, sudah di-parse dari JSON. */
function sentBody(spy: ReturnType<typeof vi.fn>) {
  return JSON.parse(spy.mock.calls[0][1].body);
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isian wajib & opsional", () => {
  it("nama, email, domisili, alasan, dan pengalaman wajib diisi", () => {
    const errors = applicationFieldErrors({
      ...VALID,
      firstName: "",
      lastName: "  ",
      email: "",
      location: "",
      motivation: "",
      experience: "",
    });
    expect(Object.keys(errors).sort()).toEqual(
      ["email", "experience", "firstName", "lastName", "location", "motivation"].sort(),
    );
  });

  it("skills & kedua tautan boleh kosong — kalau tidak, pelamar tanpa portofolio tertahan", () => {
    expect(
      validateApplication({
        ...VALID,
        skills: [],
        portfolio: "",
        linkedin: "",
      }),
    ).toBeNull();
  });

  it("tautan yang diisi tapi jelas bukan tautan ditolak", () => {
    expect(applicationFieldErrors({ ...VALID, portfolio: "portofolio saya" }).portfolio)
      .toBeTruthy();
    expect(applicationFieldErrors({ ...VALID, linkedin: "linkedin" }).linkedin).toBeTruthy();
  });

  it("tautan tanpa https:// tetap diterima — pelamar jarang mengetik skemanya", () => {
    expect(applicationFieldErrors({ ...VALID, linkedin: "linkedin.com/in/keano" }).linkedin)
      .toBeUndefined();
  });

  it("email tanpa titik ditolak, email biasa lolos", () => {
    expect(applicationFieldErrors({ ...VALID, email: "keano@cogniti" }).email).toBeTruthy();
    expect(applicationFieldErrors({ ...VALID, email: "a.b+c@mail.co.id" }).email)
      .toBeUndefined();
  });
});

describe("dua bahasa", () => {
  it("peringatan isian ikut bahasa halaman", () => {
    expect(applicationFieldErrors({ ...VALID, firstName: "" }, "id").firstName).toMatch(
      /Nama depan/i,
    );
    expect(applicationFieldErrors({ ...VALID, firstName: "" }, "en").firstName).toMatch(
      /first name/i,
    );
  });

  it("default-nya Inggris — sisa situs berbahasa Inggris", () => {
    expect(validateApplication({ ...VALID, motivation: "" })).toMatch(/why you want to join/i);
  });

  it("humanizeApplyWait: tunggal tidak berakhiran -s, ID tanpa bentuk jamak", () => {
    expect(humanizeApplyWait(1_000)).toBe("1 second");
    expect(humanizeApplyWait(40_000)).toBe("40 seconds");
    expect(humanizeApplyWait(60_000, "id")).toBe("1 menit");
  });
});

describe("penjaga sebelum jaringan", () => {
  it("payload tak sah ditolak TANPA menyentuh jaringan", async () => {
    const spy = mockFetchOk();
    const result = await submitApplication({ ...VALID, email: "bukan-email" });
    expect(result.ok).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it("honeypot terisi = DIAM-DIAM dibuang, dilaporkan sukses ke bot", async () => {
    const spy = mockFetchOk();
    /* Sengaja `ok: true`: bot yang tahu ia gagal akan mencoba cara lain. */
    expect(await submitApplication({ ...VALID, botcheck: "http://spam" })).toEqual({ ok: true });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("cooldown", () => {
  it("kiriman kedua yang terlalu rapat ditolak tanpa menyentuh jaringan", async () => {
    const spy = mockFetchOk();
    await submitApplication(VALID);
    const second = await submitApplication(VALID);
    expect(second.ok).toBe(false);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("cap waktu HANYA ditulis saat sukses — gagal tak menghabiskan jatah", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false }) }),
    );
    expect((await submitApplication(VALID)).ok).toBe(false);
    expect(applyCooldownLeft()).toBe(0);
    expect(localStorage.getItem("cogniti_last_applied")).toBeNull();
  });

  /* Cooldown lamaran & inquiry HARUS terpisah: mengirim lamaran tidak boleh
     membungkam form Contact di halaman lain, dan sebaliknya. */
  it("tidak berbagi key dengan cooldown inquiry", async () => {
    localStorage.setItem("cogniti_last_sent", String(Date.now()));
    const spy = mockFetchOk();
    expect(await submitApplication(VALID)).toEqual({ ok: true });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("localStorage yang melempar (Safari privat) tidak memblokir lamaran", async () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const spy = mockFetchOk();
    expect(await submitApplication(VALID)).toEqual({ ok: true });
    expect(spy).toHaveBeenCalledTimes(1);
    getItem.mockRestore();
  });
});

describe("bentuk kiriman ke Web3Forms", () => {
  it("berangkat ke endpoint & access key yang sama dengan form inquiry", async () => {
    const spy = mockFetchOk();
    await submitApplication(VALID);
    expect(spy.mock.calls[0][0]).toBe("https://api.web3forms.com/submit");
    expect(sentBody(spy).access_key).toBe("acd27baf-5774-4a1c-8d10-77ea2e860a60");
  });

  it("subject menyebut posisi dan nama lengkap", async () => {
    const spy = mockFetchOk();
    await submitApplication(VALID);
    expect(sentBody(spy).subject).toBe(
      "Application: Full Stack Engineer — Keano Bramantya",
    );
  });

  it("skills jadi TEKS — array tampil sebagai objek di email", async () => {
    const spy = mockFetchOk();
    await submitApplication(VALID);
    expect(sentBody(spy).skills).toBe("React / Next.js, Node.js");
  });

  it("tanpa skill tercentang, barisnya '-' bukan kosong", async () => {
    const spy = mockFetchOk();
    await submitApplication({ ...VALID, skills: [] });
    expect(sentBody(spy).skills).toBe("-");
  });

  it("tautan diberi https:// supaya bisa diklik dari inbox", async () => {
    const spy = mockFetchOk();
    await submitApplication(VALID);
    expect(sentBody(spy).portfolio).toBe("https://keano.dev");
    /* Tautan kosong tetap mengirim barisnya sebagai "-": baris yang hilang
       sama sekali membuat kolom email bergeser antar-lamaran. */
    expect(sentBody(spy).linkedin).toBe("-");
  });

  it("tautan yang sudah lengkap tidak diberi awalan dua kali", async () => {
    const spy = mockFetchOk();
    await submitApplication({ ...VALID, portfolio: "https://keano.dev" });
    expect(sentBody(spy).portfolio).toBe("https://keano.dev");
  });

  /* Yang membaca inbox satu tim. Label yang berganti-ganti bahasa membuat
     lamaran tidak bisa dibandingkan satu sama lain. */
  it("isi email tetap Inggris meski pelamar memilih Bahasa Indonesia", async () => {
    const spy = mockFetchOk();
    await submitApplication(VALID, "id");
    const body = sentBody(spy);
    expect(body.subject).toMatch(/^Application: /);
    expect(body.years_of_experience).toBe("3–5 years");
    expect(body.from_name).toBe("cogniti website (V2)");
  });

  it("alasan bergabung jadi badan email, bukan baris data", async () => {
    const spy = mockFetchOk();
    await submitApplication(VALID);
    expect(sentBody(spy).message).toBe("Ingin membangun yang dipakai orang.");
  });

  it("honeypot dikirim kosong (filter bawaan Web3Forms)", async () => {
    const spy = mockFetchOk();
    await submitApplication(VALID);
    expect(sentBody(spy).botcheck).toBe("");
  });
});

describe("kegagalan", () => {
  it("HTTP 200 tapi success:false tetap dihitung GAGAL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, message: "Invalid access key" }),
      }),
    );
    expect((await submitApplication(VALID)).ok).toBe(false);
  });

  it("jaringan putus dijawab pesan yang menyebut alamat cadangan", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const result = await submitApplication(VALID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/careers@cogniti\.id/);
  });

  it("jawaban yang bukan JSON tidak meledak", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError("Unexpected token <");
        },
      }),
    );
    expect((await submitApplication(VALID)).ok).toBe(false);
  });
});
