/**
 * Endpoint kaki halaman (dasar SEMUA halaman situs).
 *
 * Dua route saja, bentuk yang sama dengan `routes/vision.ts` dan karena alasan
 * yang sama — satu baris tidak butuh lebih: `GET /` untuk membaca, `PUT /`
 * untuk menyimpan. Yang tidak ada di sini sengaja tidak ada —
 *
 * - **Tidak ada `POST /`.** Barisnya tidak pernah "dibuat" oleh editor; ia
 *   sudah ada sejak seed, dan `saveFooter()` yang mengurus kalau belum.
 * - **Tidak ada `DELETE`.** Kaki halaman ikut setiap halaman situs.
 * - **Tidak ada `POST /urutkan`.** Urutan tautan sosial ditentukan URUTAN
 *   KIRIM dari form — form selalu mengirim daftarnya utuh, jadi endpoint
 *   tersendiri cuma jalan kedua untuk hal yang sama.
 * - **Tidak ada `/:id`.** Alamat barisnya adalah endpoint-nya sendiri.
 */

import { Hono } from "hono";
import type { FooterSocial } from "@shared/footer";
import { validateFooter, type FooterInput } from "@shared/validateFooter";

import { record, type Actor } from "../audit";
import { getFooter, saveFooter } from "../footerRepo";

type Env = { Variables: { actor: Actor } };

const asText = (v: unknown): string => (typeof v === "string" ? v : "");

/** Daftar tautan dari JSON mentah. Yang bukan array jadi daftar kosong, dan
 *  baris yang bukan objek dibuang — bukan dipaksa jadi baris kosong, karena
 *  baris kosong akan ditolak validator dengan pesan yang membingungkan
 *  ("tautan ke-3 belum ada tulisannya" untuk baris yang tidak pernah diketik
 *  editor). */
function parseSocials(raw: unknown): FooterSocial[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({ label: asText(item.label), href: asText(item.href) }));
}

/** JSON mentah → `FooterInput`. Semua isian dipaksa ke bentuknya, tidak
 *  dipercaya: satu `null` di tempat string sudah cukup membuat `.trim()`
 *  melempar dan endpoint membalas 500 tanpa keterangan berguna. */
export function parseFooterInput(raw: unknown): FooterInput {
  const body = (raw ?? {}) as Record<string, unknown>;
  return {
    email: asText(body.email),
    address: asText(body.address),
    copyright: asText(body.copyright),
    socials: parseSocials(body.socials),
  };
}

const footerRoute = new Hono<Env>();

/**
 * Isi kaki halaman untuk panel admin.
 *
 * Membalas `footer: null` — bukan 404 — kalau barisnya belum ada, alasan sama
 * dengan `GET /api/vision`: database yang belum di-seed bukan permintaan yang
 * salah alamat, dan 404 akan membuat panel menampilkan "tidak ditemukan" untuk
 * satu-satunya halaman yang justru ingin dibuka editor supaya bisa mengisinya.
 *
 * Situs publik tidak pernah memanggil endpoint ini; ia membaca `content.json`.
 */
footerRoute.get("/", async (c) => {
  return c.json({ footer: await getFooter() });
});

/** PUT, bukan PATCH: body-nya SELURUH isi kaki halaman berikut daftar
 *  tautannya, dan apa pun yang tidak ikut dikirim akan hilang. Cocok dengan
 *  form admin, yang memang selalu mengirim seluruh isian. */
footerRoute.put("/", async (c) => {
  const input = parseFooterInput(await c.req.json().catch(() => ({})));

  const errors = validateFooter(input);
  if (Object.keys(errors).length) return c.json({ errors }, 422);

  const footer = await saveFooter(input);
  await record({
    actor: c.get("actor"),
    entity: "footer",
    /* Tanpa `entityId`, sama seperti visi: kolomnya `uuid` di `audit_log`,
       sedangkan kaki halaman ber-id angka 1. Bukan kehilangan apa-apa —
       `entity: "footer"` sudah menunjuk satu-satunya baris yang ada. */
    action: "update",
    snapshot: footer,
  });
  return c.json({ footer });
});

export default footerRoute;
