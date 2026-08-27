/**
 * Jalan keluar untuk form lamaran di `/careers/<slug>`.
 *
 * Backendnya Web3Forms yang SAMA dengan form inquiry — key dan endpoint-nya
 * diimpor dari sana, bukan disalin (lihat catatan di `contact/submitInquiry.ts`).
 * Yang membedakan cuma isi kirimannya: lamaran punya belasan isian sendiri, dan
 * memaksanya masuk lewat `InquiryPayload` berarti seluruh lamaran mendarat
 * sebagai satu gumpalan teks di kolom `message`.
 *
 * **Dua bahasa.** Halaman lowongan punya toggle EN/ID, jadi peringatan isian
 * ikut berbahasa: `lang` dititipkan ke pemeriksanya, bukan ditambal di sisi
 * form. Kalau pesannya dirakit di form, form itu harus tahu SEBAB tiap galat —
 * dan aturannya jadi tinggal di dua tempat.
 *
 * Seperti tetangganya, ia tidak pernah melempar: pemanggilnya perlu menampilkan
 * pesan gagal, bukan meledak.
 */
import {
  ENDPOINT,
  WEB3FORMS_KEY,
} from "@/lib/contact/submitInquiry";

/** Sengaja tidak mengimpor `JobLang` dari `@/data/jobs`: modul ini tidak perlu
 *  tahu apa pun tentang isi lowongan, cuma tentang dua bahasa. */
export type ApplyLang = "en" | "id";

/**
 * Jarak minimum antar lamaran SUKSES per browser.
 *
 * Sengaja jauh lebih pendek daripada cooldown inquiry (5 menit): melamar dua
 * posisi berturut-turut itu perilaku yang sah dan justru diharapkan, sedangkan
 * yang mau dicegah di sini cuma tombol yang ditekan dua kali dan skrip yang
 * membanjiri. Satu menit menutup keduanya tanpa memulangkan pelamar sungguhan.
 */
const COOLDOWN_MS = 60_000;

/** Key sendiri, bukan milik inquiry — mengirim lamaran tidak boleh membungkam
 *  form Contact di halaman lain, dan sebaliknya. */
const COOLDOWN_STORAGE_KEY = "cogniti_last_applied";

/** Sama seperti inquiry: fetch yang menggantung membuat tombolnya berhenti
 *  selamanya di "Sending…". */
const TIMEOUT_MS = 15_000;

/** Alamat yang disebut tiap kali jalur webnya gagal. Satu tempat supaya tidak
 *  ada varian yang ketinggalan saat alamatnya berubah. */
const FALLBACK_EMAIL = "careers@cogniti.id";

export interface ApplicationPayload {
  /** Judul lowongan yang dilamar — ikut ke subject email. */
  jobTitle: string;
  firstName: string;
  lastName: string;
  email: string;
  /** "Where are you based?" — kota/negara, teks bebas. */
  location: string;
  /** "Why do you want to join?" */
  motivation: string;
  /** `value` dari `EXPERIENCE_OPTIONS`; "" berarti belum dipilih. */
  experience: string;
  /** Centang dari `JobPosting.skills`; boleh kosong. */
  skills: readonly string[];
  /** Dua tautan berikut OPSIONAL — dicek bentuknya hanya kalau diisi.
   *  (GitHub pernah jadi tautan ketiga; dicabut 27 Agu bersama isiannya —
   *  form yang sama dipakai lowongan non-engineering, dan di sana isian itu
   *  tidak pernah terisi.) */
  portfolio: string;
  linkedin: string;
  /** Honeypot. Lihat `submitApplication`. */
  botcheck?: string;
}

export type ApplicationResult = { ok: true } | { ok: false; error: string };

/**
 * Urutan pemberitahuan = urutan isian dibaca dari atas ke bawah. Dipakai
 * `validateApplication` untuk memilih masalah PERTAMA, dan form untuk memilih
 * peringatan mana yang tampil di baris kaki.
 */
export const APPLICATION_FIELD_ORDER = [
  "firstName",
  "lastName",
  "email",
  "location",
  "motivation",
  "experience",
  "portfolio",
  "linkedin",
] as const;

export type ApplicationField = (typeof APPLICATION_FIELD_ORDER)[number];

/** Isian yang bermasalah. Kunci yang ada = isian itu belum sah. */
export type ApplicationFieldErrors = Partial<Record<ApplicationField, string>>;

/**
 * Isian yang WAJIB. Yang di luar daftar ini (skills + tautan) boleh kosong
 * — makanya kepala form menulis "unless stated otherwise" dan labelnya diberi
 * tanda opsional.
 */
export const REQUIRED_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "location",
  "motivation",
  "experience",
] as const;

/** Seluruh teks yang mungkin dibaca pelamar dari modul ini. */
const MESSAGES: Record<
  ApplyLang,
  {
    firstName: string;
    lastName: string;
    emailEmpty: string;
    emailBad: string;
    location: string;
    motivation: string;
    experience: string;
    badUrl: string;
    cooldown: (wait: string) => string;
    failed: string;
    timeout: string;
    offline: string;
  }
> = {
  en: {
    firstName: "Please add your first name.",
    lastName: "Please add your last name.",
    emailEmpty: "Please leave an email so we can reply.",
    emailBad:
      "That email doesn’t look complete. Please check the format (e.g. name@company.com).",
    location: "Please tell us where you’re based.",
    motivation: "Please tell us why you want to join.",
    experience: "Please pick your years of experience.",
    badUrl: "That doesn’t look like a link. Try something like example.com/you.",
    cooldown: (wait) =>
      `Your application just went through. Please wait about ${wait} before sending another.`,
    failed: `Something went wrong. Please try again, or email your CV to ${FALLBACK_EMAIL} directly.`,
    timeout: `That took too long to go through. Please try again, or email your CV to ${FALLBACK_EMAIL} directly.`,
    offline: `We couldn’t reach the server. Please try again, or email your CV to ${FALLBACK_EMAIL} directly.`,
  },
  id: {
    firstName: "Nama depannya diisi dulu, ya.",
    lastName: "Nama belakangnya diisi dulu, ya.",
    emailEmpty: "Tinggalkan email supaya kami bisa membalas.",
    emailBad:
      "Emailnya sepertinya belum lengkap. Coba cek formatnya (mis. nama@perusahaan.com).",
    location: "Beri tahu kamu berbasis di mana.",
    motivation: "Ceritakan kenapa kamu ingin bergabung.",
    experience: "Pilih lama pengalamanmu.",
    badUrl: "Sepertinya itu bukan tautan. Coba seperti example.com/kamu.",
    cooldown: (wait) =>
      `Lamaranmu baru saja terkirim. Tunggu sekitar ${wait} sebelum mengirim lagi.`,
    failed: `Ada yang tidak beres. Coba lagi, atau kirim CV langsung ke ${FALLBACK_EMAIL}.`,
    timeout: `Kirimannya terlalu lama. Coba lagi, atau kirim CV langsung ke ${FALLBACK_EMAIL}.`,
    offline: `Kami tidak bisa menghubungi server. Coba lagi, atau kirim CV langsung ke ${FALLBACK_EMAIL}.`,
  },
};

/**
 * "40 seconds" / "40 detik" — untuk ditempel ke pesan cooldown.
 *
 * Punya sendiri, tidak memakai `humanizeWait` milik inquiry, karena yang itu
 * hanya berbahasa Inggris. Bentuk tunggalnya diurus di sini: "1 minutes"
 * langsung terbaca sebagai bug, dan pesan yang cacat membuat sisanya ikut tidak
 * dipercaya. (Bahasa Indonesia tidak punya bentuk jamak — cabangnya cuma perlu
 * untuk `en`.)
 */
export function humanizeApplyWait(ms: number, lang: ApplyLang = "en"): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) {
    return lang === "id"
      ? `${seconds} detik`
      : `${seconds} second${seconds === 1 ? "" : "s"}`;
  }
  const minutes = Math.ceil(seconds / 60);
  return lang === "id"
    ? `${minutes} menit`
    : `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

/**
 * Tautan yang "cukup mirip URL".
 *
 * Sengaja longgar: yang mau ditangkap cuma salah ketik kasar ("linkedin",
 * "portofolio saya") supaya pelamar tidak mengirim tautan yang tak bisa dibuka.
 * Pemeriksaan ketat selalu berakhir menolak alamat yang sebenarnya sah — dan
 * di isian OPSIONAL, menolak tanpa alasan jelas lebih mahal daripada
 * meloloskan satu tautan cacat.
 */
function looksLikeUrl(value: string): boolean {
  const trimmed = value.trim();
  if (/\s/.test(trimmed)) return false;
  return /^(https?:\/\/)?[^./\s]+(\.[^./\s]+)+(\/\S*)?$/i.test(trimmed);
}

export function applicationFieldErrors(
  payload: ApplicationPayload,
  lang: ApplyLang = "en",
): ApplicationFieldErrors {
  const t = MESSAGES[lang];
  const errors: ApplicationFieldErrors = {};

  if (!payload.firstName.trim()) errors.firstName = t.firstName;
  if (!payload.lastName.trim()) errors.lastName = t.lastName;

  const email = payload.email.trim();
  if (!email) errors.email = t.emailEmpty;
  /* Aturan email-nya sama persis dengan form inquiry: cukup "ada @ dan titik
     sesudahnya", sisanya diserahkan ke `type="email"` dan ke backend. Regex
     email yang ketat selalu salah menolak alamat sah. */
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = t.emailBad;

  if (!payload.location.trim()) errors.location = t.location;
  if (!payload.motivation.trim()) errors.motivation = t.motivation;
  if (!payload.experience) errors.experience = t.experience;

  for (const field of ["portfolio", "linkedin"] as const) {
    if (payload[field].trim() && !looksLikeUrl(payload[field]))
      errors[field] = t.badUrl;
  }

  return errors;
}

/** Satu kalimat untuk masalah pertama — penjaga terakhir sebelum jaringan. */
export function validateApplication(
  payload: ApplicationPayload,
  lang: ApplyLang = "en",
): string | null {
  const errors = applicationFieldErrors(payload, lang);
  for (const field of APPLICATION_FIELD_ORDER) {
    const message = errors[field];
    if (message) return message;
  }
  return null;
}

/**
 * Sisa cooldown dalam milidetik, 0 kalau sudah boleh kirim.
 * localStorage dibungkus try/catch — ia MELEMPAR (bukan mengembalikan null) di
 * Safari privat dan saat cookie pihak ketiga dimatikan. Anti-spam yang rusak
 * tidak boleh berubah jadi tembok bagi pelamar sungguhan.
 */
export function applyCooldownLeft(now: number = Date.now()): number {
  try {
    const last = Number(localStorage.getItem(COOLDOWN_STORAGE_KEY)) || 0;
    return Math.max(0, COOLDOWN_MS - (now - last));
  } catch {
    return 0;
  }
}

/** Tautan apa adanya untuk email: "-" kalau kosong, diberi https:// kalau
 *  pelamar cuma menulis domainnya — supaya bisa diklik dari inbox. */
function link(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "-";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export async function submitApplication(
  payload: ApplicationPayload,
  lang: ApplyLang = "en",
): Promise<ApplicationResult> {
  const t = MESSAGES[lang];

  const invalid = validateApplication(payload, lang);
  if (invalid) return { ok: false, error: invalid };

  /* Honeypot kena: dibuang DIAM-DIAM dan dilaporkan sukses. Bot yang tahu ia
     gagal akan mencoba cara lain; bot yang mengira berhasil pergi. Tidak ada
     manusia yang sampai ke sini — isiannya tersembunyi dari layar maupun dari
     pembaca layar. */
  if (payload.botcheck) return { ok: true };

  const wait = applyCooldownLeft();
  if (wait > 0) return { ok: false, error: t.cooldown(humanizeApplyWait(wait, lang)) };

  const name = `${payload.firstName.trim()} ${payload.lastName.trim()}`;
  const skills = payload.skills.length ? payload.skills.join(", ") : "-";

  /* Badan kiriman dirakit eksplisit (bukan sebar `...payload`): yang ditulis di
     sini persis itu juga yang muncul sebagai baris di email. `skills` wajib jadi
     teks dulu — array tampil sebagai objek di email.

     Isinya SELALU berbahasa Inggris meski pelamar memilih ID: yang membaca
     inbox satu tim, dan label yang berganti-ganti bahasa membuat lamaran sulit
     dibandingkan. Yang berbahasa cuma yang dibaca PELAMAR. */
  const body = {
    access_key: WEB3FORMS_KEY,
    subject: `Application: ${payload.jobTitle} — ${name}`,
    from_name: "cogniti website (V2)",
    name,
    email: payload.email.trim(),
    position: payload.jobTitle,
    based_in: payload.location.trim(),
    years_of_experience: payload.experience,
    skills,
    portfolio: link(payload.portfolio),
    linkedin: link(payload.linkedin),
    /* Web3Forms menampilkan `message` sebagai badan utama email. Isinya jawaban
       "why do you want to join" — satu-satunya isian yang dibaca sebagai
       kalimat, bukan dipindai sebagai baris data. */
    message: payload.motivation.trim(),
    botcheck: "",
  };

  /* AbortController, bukan Promise.race: race meninggalkan fetch-nya tetap
     berjalan di latar — koneksinya tidak pernah ditutup. */
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

    /* Web3Forms bisa membalas 200 dengan `success: false` (key salah, kena
       filter spam), jadi badan jawabannya ikut diperiksa. */
    const data = (await res.json().catch(() => null)) as
      | { success?: boolean; message?: string }
      | null;

    if (!res.ok || !data?.success) return { ok: false, error: t.failed };

    /* Cap waktu ditulis HANYA setelah sukses — lamaran yang gagal tidak boleh
       ikut menghabiskan jatah cooldown pelamar. */
    try {
      localStorage.setItem(COOLDOWN_STORAGE_KEY, String(Date.now()));
    } catch {
      /* Gagal menyimpan bukan alasan menggagalkan kiriman yang sudah sampai. */
    }

    return { ok: true };
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === "AbortError";
    return { ok: false, error: aborted ? t.timeout : t.offline };
  } finally {
    clearTimeout(timer);
  }
}
