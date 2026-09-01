/**
 * Pemeriksa isi crew — dipakai server saat menyimpan DAN admin saat mengisi
 * form, sama seperti `validateJob.ts`.
 *
 * Pesannya BERBAHASA INDONESIA dan tanpa istilah teknis: yang membacanya
 * editor non-teknis, bukan developer.
 */
import {
  type CrewCategory,
  type CrewMember,
  type CrewSocial,
  type CrewState,
  CREW_CATEGORIES,
  CREW_STATES,
  SOCIAL_PLATFORMS,
} from "./crew";

/** Urutan pemberitahuan = urutan isian dibaca dari atas ke bawah di form.
 *  Dipakai admin untuk memilih masalah PERTAMA dan melompatkan fokus ke sana. */
export const CREW_FIELD_ORDER = [
  "name",
  "role",
  "category",
  "state",
  "photo",
  "social",
] as const;

export type CrewField = (typeof CREW_FIELD_ORDER)[number];

/** Isian yang bermasalah. Kunci yang ada = isian itu belum sah. */
export type CrewFieldErrors = Partial<Record<CrewField, string>>;

/** Yang dikirim form ke pemeriksa — sama dengan `CrewMember` tanpa `id` yang
 *  diurus database sendiri. */
export type CrewInput = Omit<CrewMember, "id">;

const MAX = {
  name: 80,
  role: 80,
  url: 300,
  social: SOCIAL_PLATFORMS.length,
} as const;

const blank = (value: string) => value.trim().length === 0;

/**
 * `"#"` diterima apa adanya sebagai "belum ada tautannya".
 *
 * Bukan kelonggaran yang dibiarkan lewat: itu isi HAMPIR SEMUA baris hari ini
 * (lihat `crewFallback.ts`), dan menolaknya berarti seed dari konten yang
 * sudah tayang akan gagal seluruhnya. Yang benar-benar dijaga di bawah adalah
 * kesalahan yang berbeda: alamat tanpa `https://` di depannya.
 */
const KOSONG_SENGAJA = "#";

/**
 * Satu tautan sosial.
 *
 * Aturan skema (`https://…`) ada karena tautan crew dibuka dengan
 * `target="_blank"`. Alamat tanpa skema — "linkedin.com/in/budi" — tidak
 * dibaca peramban sebagai alamat luar melainkan sebagai halaman DI SITUS INI,
 * jadi pengunjung yang mengkliknya mendarat di halaman 404 cogniti.id. Tidak
 * ada error di mana pun; yang terjadi cuma tautan yang "kadang tidak jalan".
 */
function socialError(list: CrewSocial[]): string | null {
  if (list.length > MAX.social)
    return `Terlalu banyak tautan (maksimal ${MAX.social}, satu per platform).`;

  const seen = new Set<string>();
  for (const item of list) {
    if (!SOCIAL_PLATFORMS.includes(item.platform))
      return "Ada tautan yang platform-nya belum dipilih.";

    if (seen.has(item.platform))
      return `Platform "${item.platform}" ditulis dua kali — cukup satu tautan per platform.`;
    seen.add(item.platform);

    const url = item.url.trim();
    if (blank(url))
      return `Tautan ${item.platform} masih kosong. Isi alamatnya, atau hapus barisnya.`;
    if (url.length > MAX.url)
      return `Tautan ${item.platform} kepanjangan (maksimal ${MAX.url} karakter).`;
    if (url === KOSONG_SENGAJA) continue;
    if (!/^https?:\/\//i.test(url))
      return `Tautan ${item.platform} harus diawali https:// — tanpa itu tautannya mengarah ke dalam situs ini, bukan ke luar.`;
  }
  return null;
}

/**
 * Memeriksa satu anggota crew.
 *
 * Ketatnya IKUT STATUS, sama seperti lowongan: draf cuma perlu nama, sehingga
 * editor bisa menyimpan pekerjaan setengah jalan tanpa dimarahi. Pemeriksaan
 * penuh baru berlaku begitu statusnya Live — yaitu tepat saat barisnya akan
 * dibaca pengunjung.
 */
export function validateCrew(input: CrewInput): CrewFieldErrors {
  const errors: CrewFieldErrors = {};

  if (blank(input.name)) errors.name = "Nama belum diisi.";
  else if (input.name.length > MAX.name)
    errors.name = `Nama kepanjangan (maksimal ${MAX.name} karakter).`;

  if (!CREW_STATES.includes(input.state as CrewState))
    errors.state = "Status belum dipilih.";

  if (!CREW_CATEGORIES.includes(input.category as CrewCategory))
    errors.category = "Departemen belum dipilih.";

  /* Sampai sini saja untuk draf. Yang di bawah soal layak-tidaknya dibaca
     pengunjung, dan draf memang tidak pernah sampai ke sana. */
  if (input.state === "draft") return errors;

  if (blank(input.role)) errors.role = "Jabatan belum diisi.";
  else if (input.role.length > MAX.role)
    errors.role = `Jabatan kepanjangan (maksimal ${MAX.role} karakter).`;

  /**
   * Foto SENGAJA tidak wajib, beda dengan lowongan.
   *
   * Kotak tanpa foto di dinding crew punya tampilan sendiri yang sudah
   * dirancang — ikon orang abu-abu di `CrewAvatar` — dan empat dari tiga belas
   * baris yang tayang hari ini memang begitu. Mewajibkannya berarti seed dari
   * konten yang sudah tayang langsung gagal, dan editor dipaksa mengunggah
   * foto asal-asalan supaya bisa menyimpan.
   */

  const sosial = socialError(input.social);
  if (sosial) errors.social = sosial;

  return errors;
}

/** Masalah PERTAMA menurut urutan baca form, atau null kalau sudah sah. */
export function firstCrewError(
  errors: CrewFieldErrors,
): { field: CrewField; message: string } | null {
  for (const field of CREW_FIELD_ORDER) {
    const message = errors[field];
    if (message) return { field, message };
  }
  return null;
}

/** Apakah baris ini layak ikut ke `content.json`? */
export function isCrewPublishable(input: CrewInput): boolean {
  if (input.state === "draft") return false;
  return firstCrewError(validateCrew(input)) === null;
}
