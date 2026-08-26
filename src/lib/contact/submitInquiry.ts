/**
 * Satu-satunya jalan keluar untuk form inquiry.
 *
 * Backendnya **Web3Forms** — sama seperti situs cogniti yang sudah tayang, dan
 * dengan access key yang sama pula, jadi kedua situs jatuh ke inbox yang sama.
 * Yang membedakan asalnya cuma `from_name` di badan kiriman.
 *
 * Sengaja tidak melempar exception: pemanggilnya perlu menampilkan pesan gagal,
 * bukan meledak. Hasilnya selalu `InquiryResult`.
 */

/**
 * Access key Web3Forms. **Ini memang publik by design** — tidak ada rahasia yang
 * bocor: key-nya cuma alamat tujuan, dan Web3Forms sendiri menyuruh memasangnya
 * di sisi klien (panggilan server-side justru DITOLAK, lihat catatan di bawah).
 * Menaruhnya di env var tidak menambah keamanan apa pun karena tetap ikut
 * ter-bundle; jadi ia ditulis apa adanya di sini supaya gampang dicari.
 *
 * Tujuan emailnya diganti lewat dashboard Web3Forms, TANPA menyentuh kode.
 * Saat ini: keanobramantyaalmaliki@gmail.com (belum hello@cogniti.id).
 */
const WEB3FORMS_KEY = "acd27baf-5774-4a1c-8d10-77ea2e860a60";

const ENDPOINT = "https://api.web3forms.com/submit";

/**
 * Jarak minimum antar kiriman SUKSES per browser (5 menit). Sengaja bukan blokir
 * IP (paket gratis tak mendukung, dan IP bersama = salah blokir orang lain) dan
 * bukan blokir permanen (itu membuang lead berulang yang sah).
 * Untuk 1× sehari: 86_400_000.
 */
const COOLDOWN_MS = 300_000;

/** Nama key localStorage-nya diwarisi dari situs V1 supaya perilakunya sama. */
const COOLDOWN_STORAGE_KEY = "cogniti_last_sent";

/**
 * Batas tunggu jaringan. Tanpa ini, satu fetch yang menggantung membuat tombolnya
 * berhenti selamanya di "Sending…" — pengunjung tidak tahu harus apa.
 */
const TIMEOUT_MS = 15_000;

export interface InquiryPayload {
  name: string;
  company: string;
  email: string;
  /** Nilai dari `INTERESTS`; boleh kosong. */
  interests: readonly string[];
  message: string;
  /**
   * Honeypot. Manusia tidak pernah melihat isiannya, jadi kalau TERISI berarti
   * bot yang mengisi seluruh field secara membabi buta. Lihat `submitInquiry`.
   */
  botcheck?: string;
}

export type InquiryResult =
  | { ok: true }
  | { ok: false; error: string };

/** Pilihan chip "I'm interested in discussing" — urutannya ikut situs tayang. */
export const INTERESTS = [
  "Partnership",
  "Government",
  "Enterprise",
  "Investor",
  "Career",
  "General",
] as const;

export type Interest = (typeof INTERESTS)[number];

/** Isian mana yang bermasalah — kunci yang ada berarti field itu belum sah. */
export interface InquiryFieldErrors {
  name?: string;
  email?: string;
  message?: string;
}

/**
 * Masalah PER ISIAN, bukan cuma "ada yang salah".
 *
 * Dipisah begini supaya form bisa menandai isian yang bersangkutan dan
 * menjelaskan sebabnya SEBELUM tombol kirim ditekan. Sebelumnya cuma ada
 * `validateInquiry` yang mengembalikan satu kalimat, dan itu melahirkan jalan
 * buntu: tombolnya dimatikan selagi tidak sah, sedangkan pesannya baru
 * ditampilkan setelah percobaan kirim — percobaan yang tak pernah bisa terjadi
 * karena tombolnya mati. Pengunjung cuma melihat tombol kelabu tanpa alasan.
 *
 * Emailnya tidak diuji regex rumit — cek "ada @ dan titik sesudahnya" saja, lalu
 * biarkan `type="email"` bawaan browser dan backend yang menghakimi. Regex email
 * yang ketat selalu salah menolak alamat sah.
 */
export function inquiryFieldErrors(payload: InquiryPayload): InquiryFieldErrors {
  const errors: InquiryFieldErrors = {};

  if (!payload.name.trim()) errors.name = "Please tell us your name.";

  const email = payload.email.trim();
  if (!email) errors.email = "Please leave an email so we can reply.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email =
      "That email doesn’t look complete. Please check the format (e.g. name@company.com).";

  if (!payload.message.trim()) errors.message = "Please add a message.";

  return errors;
}

/** Urutan pemberitahuan: ikut urutan isiannya dibaca dari atas ke bawah. */
export const FIELD_ORDER = ["name", "email", "message"] as const;

/**
 * Satu kalimat untuk masalah PERTAMA, dipakai `submitInquiry` sebagai penjaga
 * terakhir. Dihitung dari `inquiryFieldErrors` supaya aturannya cuma ada di satu
 * tempat — tombol dan penjaga tidak boleh punya pendapat yang berbeda.
 */
export function validateInquiry(payload: InquiryPayload): string | null {
  const errors = inquiryFieldErrors(payload);
  for (const field of FIELD_ORDER) {
    const message = errors[field];
    if (message) return message;
  }
  return null;
}

/**
 * Sisa cooldown dalam milidetik, 0 kalau sudah boleh kirim.
 *
 * localStorage dibungkus try/catch karena ia MELEMPAR (bukan mengembalikan null)
 * di Safari mode privat dan saat cookie pihak ketiga dimatikan. Kalau gagal
 * dibaca, jawabannya "boleh kirim" — anti-spam yang rusak tidak boleh berubah
 * jadi tembok yang menghalangi tamu sungguhan.
 */
export function cooldownLeft(now: number = Date.now()): number {
  try {
    const last = Number(localStorage.getItem(COOLDOWN_STORAGE_KEY)) || 0;
    return Math.max(0, COOLDOWN_MS - (now - last));
  } catch {
    return 0;
  }
}

/**
 * "40 seconds" / "5 minutes" — untuk ditempel ke pesan cooldown.
 * Bentuk tunggalnya diurus di sini: "1 minutes" langsung terbaca sebagai bug
 * oleh pembacanya, dan pesan yang cacat membuat sisanya ikut tidak dipercaya.
 */
export function humanizeWait(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export async function submitInquiry(
  payload: InquiryPayload,
): Promise<InquiryResult> {
  const invalid = validateInquiry(payload);
  if (invalid) return { ok: false, error: invalid };

  /* Honeypot kena. Dibuang DIAM-DIAM dan dilaporkan sebagai sukses: bot yang
     diberi tahu bahwa ia gagal akan mencoba lagi dengan cara lain, sedangkan
     bot yang mengira berhasil pergi. Tidak ada manusia yang sampai ke sini —
     isiannya tersembunyi dari layar maupun dari pembaca layar. */
  if (payload.botcheck) return { ok: true };

  const wait = cooldownLeft();
  if (wait > 0) {
    return {
      ok: false,
      error: `You’ve just sent a message. Please wait about ${humanizeWait(wait)} before sending another.`,
    };
  }

  const interests = payload.interests.length
    ? payload.interests.join(", ")
    : "General";

  /* Badan kiriman dirakit eksplisit, BUKAN sebar `...payload`: yang dikirim ke
     sini persis itu juga yang muncul sebagai baris di email, jadi bentuknya
     ditentukan di satu tempat. Array `interests` juga wajib jadi teks dulu —
     kalau tidak, ia tampil sebagai objek di email. */
  const body = {
    access_key: WEB3FORMS_KEY,
    subject: `${interests} Inquiry: ${payload.name.trim()}${
      payload.company.trim() ? ` · ${payload.company.trim()}` : ""
    }`,
    from_name: "cogniti website (V2)",
    name: payload.name.trim(),
    email: payload.email.trim(),
    organization: payload.company.trim() || "-",
    inquiry_type: interests,
    message: payload.message.trim(),
    botcheck: "",
  };

  /* AbortController, bukan Promise.race: race meninggalkan fetch-nya tetap
     berjalan di latar: koneksinya tidak pernah ditutup. */
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    /* Statusnya diperiksa LEWAT badan jawabannya juga: Web3Forms bisa membalas
       200 dengan `success: false` (mis. key salah, kena filter spam). */
    const data = (await res.json().catch(() => null)) as
      | { success?: boolean; message?: string }
      | null;

    if (!res.ok || !data?.success) {
      return {
        ok: false,
        error:
          "Something went wrong. Please try again, or email hello@cogniti.id directly.",
      };
    }

    /* Cap waktu ditulis HANYA setelah sukses — kiriman yang gagal tidak boleh
       ikut menghabiskan jatah cooldown pengunjung. */
    try {
      localStorage.setItem(COOLDOWN_STORAGE_KEY, String(Date.now()));
    } catch {
      /* Sama seperti di `cooldownLeft`: gagal menyimpan bukan alasan menggagalkan
         kiriman yang sudah benar-benar sampai. */
    }

    return { ok: true };
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === "AbortError";
    return {
      ok: false,
      error: aborted
        ? "That took too long to go through. Please try again, or email hello@cogniti.id directly."
        : "We couldn’t reach the server. Please try again, or email hello@cogniti.id directly.",
    };
  } finally {
    clearTimeout(timer);
  }
}
