/**
 * Satu-satunya jalan keluar untuk form inquiry.
 *
 * Backend-nya belum diputuskan — rencananya **Web3Forms**, seperti situs cogniti
 * yang sudah tayang. Sampai itu diputuskan, semua submit lewat fungsi ini supaya
 * nanti yang berubah CUMA isi fungsi ini, bukan komponen form yang tersebar.
 *
 * Sengaja tidak melempar exception: pemanggilnya perlu menampilkan pesan gagal,
 * bukan meledak. Hasilnya selalu `InquiryResult`.
 */

export interface InquiryPayload {
  name: string;
  company: string;
  email: string;
  /** Nilai dari `INTERESTS`; boleh kosong. */
  interests: readonly string[];
  message: string;
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

/**
 * Validasi minimum yang sama dipakai tombol submit (untuk mematikan tombolnya)
 * dan `submitInquiry` (sebagai penjaga terakhir). Satu sumber, supaya tombol
 * tidak pernah aktif untuk data yang nanti ditolak.
 *
 * Emailnya tidak diuji regex rumit — cek "ada @ dan titik sesudahnya" saja, lalu
 * biarkan `type="email"` bawaan browser dan backend yang menghakimi. Regex email
 * yang ketat selalu salah menolak alamat sah.
 */
export function validateInquiry(payload: InquiryPayload): string | null {
  if (!payload.name.trim()) return "Nama belum diisi.";
  if (!payload.email.trim()) return "Email belum diisi.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim()))
    return "Format email belum benar.";
  if (!payload.message.trim()) return "Pesannya masih kosong.";
  return null;
}

export async function submitInquiry(
  payload: InquiryPayload,
): Promise<InquiryResult> {
  const invalid = validateInquiry(payload);
  if (invalid) return { ok: false, error: invalid };

  /* STUB. Diganti nanti dengan POST ke Web3Forms:
       const res = await fetch("https://api.web3forms.com/submit", {
         method: "POST",
         headers: { "Content-Type": "application/json", Accept: "application/json" },
         body: JSON.stringify({ access_key: KEY, ...payload }),
       });
     Jedanya sengaja ada supaya keadaan "sending" di UI benar-benar terlihat dan
     bisa diuji sekarang, bukan baru ketahuan rusak setelah backend dipasang. */
  await new Promise((resolve) => setTimeout(resolve, 900));

  if (import.meta.env.DEV) {
    console.info("[submitInquiry] stub — belum terkirim ke mana pun:", payload);
  }

  return { ok: true };
}
