/**
 * Baca konfigurasi dari environment, sekali, di satu tempat.
 *
 * Semua yang wajib diperiksa saat proses BARU HIDUP, bukan saat dipakai.
 * Bedanya besar: salah ketik `DATABASE_URL` yang diperiksa di sini membuat
 * server menolak start dengan pesan jelas; yang tidak diperiksa akan lolos,
 * lalu meledak nanti pada request pertama editor — jam berapa pun itu terjadi.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Environment "${name}" belum diisi. Salin .env.example jadi .env lalu lengkapi.`,
    );
  }
  return value;
}

export const isProduction = process.env.NODE_ENV === "production";

/** Test memakai database sendiri yang isinya dikosongkan tiap kali jalan.
 *  Kalau tertukar dengan dev, konten yang sedang dikerjakan ikut terhapus. */
export const isTest = process.env.NODE_ENV === "test";

export const env = {
  databaseUrl: isTest
    ? required("TEST_DATABASE_URL")
    : required("DATABASE_URL"),
  sessionSecret: required("SESSION_SECRET"),
  port: Number(process.env.PORT ?? 3001),
  cloudflare: {
    zoneId: process.env.CF_ZONE_ID ?? "",
    purgeToken: process.env.CF_PURGE_TOKEN ?? "",
  },
} as const;
