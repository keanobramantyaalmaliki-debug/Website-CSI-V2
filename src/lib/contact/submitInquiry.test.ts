/**
 * Kontrak `submitInquiry` setelah Web3Forms dipasang.
 *
 * Yang dijaga di sini bukan "apakah fetch dipanggil", tapi hal-hal yang KALAU
 * rusak akan diam-diam membuang kiriman sungguhan: honeypot tidak boleh
 * memberi tahu bot bahwa ia ketahuan, cooldown tidak boleh dihabiskan oleh
 * kiriman yang GAGAL, dan `interests` (array) wajib jadi teks sebelum berangkat
 * — kalau tidak, isinya tampil sebagai objek di email.
 *
 * Catatan: Web3Forms paket gratis MENOLAK panggilan dari server/curl ("use
 * client side"), jadi jalur sungguhannya memang tak bisa diuji otomatis di
 * sini — hanya bentuk kiriman yang diperiksa. Verifikasi akhir tetap manual
 * lewat browser.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cooldownLeft,
  inquiryFieldErrors,
  humanizeWait,
  submitInquiry,
  validateInquiry,
  type InquiryPayload,
} from "./submitInquiry";

const VALID: InquiryPayload = {
  name: "Keano",
  company: "Cogniti",
  email: "keano@cogniti.id",
  interests: ["Partnership", "Enterprise"],
  message: "Halo.",
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
  vi.useRealTimers();
});

describe("penjaga sebelum jaringan", () => {
  it("payload tak sah ditolak TANPA menyentuh jaringan", async () => {
    const spy = mockFetchOk();
    const result = await submitInquiry({ ...VALID, email: "bukan-email" });
    expect(result).toEqual({ ok: false, error: validateInquiry({ ...VALID, email: "bukan-email" }) });
    expect(spy).not.toHaveBeenCalled();
  });

  it("honeypot terisi = DIAM-DIAM dibuang, dilaporkan sukses ke bot", async () => {
    const spy = mockFetchOk();
    const result = await submitInquiry({ ...VALID, botcheck: "http://spam" });
    /* Sengaja `ok: true`: bot yang tahu ia gagal akan mencoba cara lain. */
    expect(result).toEqual({ ok: true });
    expect(spy).not.toHaveBeenCalled();
  });

  it("honeypot kosong lewat seperti biasa", async () => {
    const spy = mockFetchOk();
    expect(await submitInquiry({ ...VALID, botcheck: "" })).toEqual({ ok: true });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("cooldown", () => {
  it("menolak kiriman kedua yang terlalu rapat, tanpa menyentuh jaringan", async () => {
    const spy = mockFetchOk();
    await submitInquiry(VALID);
    expect(spy).toHaveBeenCalledTimes(1);

    const second = await submitInquiry(VALID);
    expect(second.ok).toBe(false);
    expect(spy).toHaveBeenCalledTimes(1); // tidak bertambah
  });

  it("cap waktu HANYA ditulis saat sukses — gagal tak menghabiskan jatah", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false }) }),
    );
    const failed = await submitInquiry(VALID);
    expect(failed.ok).toBe(false);
    expect(cooldownLeft()).toBe(0);
    expect(localStorage.getItem("cogniti_last_sent")).toBeNull();
  });

  it("habis masa tunggunya, boleh kirim lagi", async () => {
    localStorage.setItem("cogniti_last_sent", String(Date.now() - 300_001));
    const spy = mockFetchOk();
    expect(await submitInquiry(VALID)).toEqual({ ok: true });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("localStorage yang melempar (Safari privat) tidak memblokir kiriman", async () => {
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("SecurityError");
      });
    const spy = mockFetchOk();
    expect(await submitInquiry(VALID)).toEqual({ ok: true });
    expect(spy).toHaveBeenCalledTimes(1);
    getItem.mockRestore();
  });

  it("humanizeWait: detik di bawah semenit, menit di atasnya", () => {
    expect(humanizeWait(40_000)).toBe("40 seconds");
    expect(humanizeWait(300_000)).toBe("5 minutes");
  });

  it("humanizeWait: bentuk tunggal tidak berakhiran -s", () => {
    expect(humanizeWait(1_000)).toBe("1 second");
    expect(humanizeWait(60_000)).toBe("1 minute");
  });
});

describe("bentuk kiriman ke Web3Forms", () => {
  it("access key ikut, dan tujuannya endpoint Web3Forms", async () => {
    const spy = mockFetchOk();
    await submitInquiry(VALID);
    expect(spy.mock.calls[0][0]).toBe("https://api.web3forms.com/submit");
    expect(sentBody(spy).access_key).toBe("acd27baf-5774-4a1c-8d10-77ea2e860a60");
  });

  it("interests jadi TEKS, bukan array — kalau tidak, tampil sebagai objek di email", async () => {
    const spy = mockFetchOk();
    await submitInquiry(VALID);
    expect(sentBody(spy).inquiry_type).toBe("Partnership, Enterprise");
  });

  it("tanpa minat terpilih = General", async () => {
    const spy = mockFetchOk();
    await submitInquiry({ ...VALID, interests: [] });
    expect(sentBody(spy).inquiry_type).toBe("General");
  });

  it("subject memuat minat, nama, dan perusahaan", async () => {
    const spy = mockFetchOk();
    await submitInquiry(VALID);
    expect(sentBody(spy).subject).toBe(
      "Partnership, Enterprise Inquiry: Keano · Cogniti",
    );
  });

  it("perusahaan kosong tidak meninggalkan pemisah menggantung di subject", async () => {
    const spy = mockFetchOk();
    await submitInquiry({ ...VALID, company: "   " });
    expect(sentBody(spy).subject).toBe("Partnership, Enterprise Inquiry: Keano");
    expect(sentBody(spy).organization).toBe("-");
  });

  it("honeypot dikirim kosong (filter bawaan Web3Forms)", async () => {
    const spy = mockFetchOk();
    await submitInquiry(VALID);
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
    const result = await submitInquiry(VALID);
    expect(result.ok).toBe(false);
  });

  it("jaringan putus dijawab pesan, bukan exception", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const result = await submitInquiry(VALID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/hello@cogniti\.id/);
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
    expect((await submitInquiry(VALID)).ok).toBe(false);
  });

  it("abort (batas waktu) punya pesannya sendiri", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError")),
    );
    const result = await submitInquiry(VALID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/took too long/);
  });
});

describe("peringatan per isian", () => {
  it("email ngawur ditandai DI ISIAN EMAIL, bukan sebagai galat umum", () => {
    /* Ini kasus yang dilaporkan Keano 26 Agu: mengetik "test" membuat tombol
       kirim mati tanpa sebab yang kelihatan. */
    const errors = inquiryFieldErrors({ ...VALID, email: "test" });
    expect(errors.email).toBeTruthy();
    expect(errors.name).toBeUndefined();
    expect(errors.message).toBeUndefined();
  });

  it("pesannya menyebutkan contoh yang benar, bukan cuma bilang salah", () => {
    expect(inquiryFieldErrors({ ...VALID, email: "test" }).email).toMatch(
      /name@company\.com/,
    );
  });

  it("membedakan kosong dan salah format", () => {
    expect(inquiryFieldErrors({ ...VALID, email: "  " }).email).toMatch(/Please leave an email/);
    expect(inquiryFieldErrors({ ...VALID, email: "a@b" }).email).toMatch(/doesn’t look complete/);
  });

  it("isian sah tidak meninggalkan galat apa pun", () => {
    expect(inquiryFieldErrors(VALID)).toEqual({});
  });

  it("beberapa isian bermasalah dilaporkan SEKALIGUS", () => {
    const errors = inquiryFieldErrors({ ...VALID, name: "", email: "x", message: "" });
    expect(Object.keys(errors).sort()).toEqual(["email", "message", "name"]);
  });

  it("perusahaan kosong bukan galat — tidak pernah wajib", () => {
    expect(inquiryFieldErrors({ ...VALID, company: "" })).toEqual({});
  });

  it("validateInquiry = masalah PERTAMA menurut urutan isian, satu sumber aturan", () => {
    const broken = { ...VALID, name: "", email: "x", message: "" };
    expect(validateInquiry(broken)).toBe(inquiryFieldErrors(broken).name);
    const emailOnly = { ...VALID, email: "x" };
    expect(validateInquiry(emailOnly)).toBe(inquiryFieldErrors(emailOnly).email);
  });
});

describe("bahasa pesan yang dilihat pengunjung", () => {
  /* Form-nya berbahasa Inggris, jadi pesannya juga — dulu sempat campur dan
     pengunjung berbahasa Inggris mendapat peringatan berbahasa Indonesia.
     Kata-kata di bawah cukup khas untuk menandai kalimat Indonesia yang
     menyelinap balik, tanpa ikut menuduh komentar kode (yang memang Indonesia). */
  const INDONESIAN = /\b(belum|masih|coba lagi|silakan|tunggu|nama|pesan(nya)?|isian)\b/i;

  it("tak satu pun pesan validasi berbahasa Indonesia", () => {
    const errors = inquiryFieldErrors({ name: "", company: "", email: "x", interests: [], message: "" });
    for (const message of Object.values(errors)) expect(message).not.toMatch(INDONESIAN);
  });

  it("pesan cooldown berbahasa Inggris", async () => {
    localStorage.setItem("cogniti_last_sent", String(Date.now()));
    const result = await submitInquiry(VALID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toMatch(INDONESIAN);
      expect(result.error).toMatch(/before sending another/);
    }
  });

  it("pesan kegagalan jaringan berbahasa Inggris", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const result = await submitInquiry(VALID);
    if (!result.ok) expect(result.error).not.toMatch(INDONESIAN);
  });
});
