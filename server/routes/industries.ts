/**
 * Endpoint sektor industri (Home → "Built Across Sectors").
 *
 * Bentuknya menyalin `routes/values.ts` — terjemahkan body, panggil repo,
 * terjemahkan hasil — plus `POST /urutkan`, karena urutan sektor benar-benar
 * tayang: ia menentukan anak tangga spiral sekaligus nomor "01"–"13".
 *
 * Satu hal yang tidak ada di endpoint mana pun sebelum ini: PENJAGA BATAS 13.
 * `validateIndustry()` tidak bisa menegakkannya (ia cuma melihat satu sektor),
 * dan skema juga tidak (butuh trigger, yang galatnya sampai ke editor sebagai
 * pesan Postgres mentah). Jadi tempatnya di sini — lihat `jagaBatasTayang()`.
 */

import { Hono } from "hono";
import {
  INDUSTRY_STATES,
  MAX_LIVE_INDUSTRIES,
  type IndustryState,
  type IndustryTier,
} from "@shared/industry";
import {
  validateIndustry,
  type IndustryFieldErrors,
  type IndustryInput,
} from "@shared/validateIndustry";

import { record, type Actor } from "../audit";
import {
  countLiveIndustries,
  createIndustry,
  getIndustryById,
  industryNameTaken,
  listIndustries,
  reorderIndustries,
  softDeleteIndustry,
  updateIndustry,
} from "../industriesRepo";

type Env = { Variables: { actor: Actor } };

const asText = (v: unknown): string => (typeof v === "string" ? v : "");

/** JSON mentah → `IndustryInput`. Semua isian dipaksa ke bentuknya, tidak
 *  dipercaya: satu `null` di tempat string sudah cukup membuat `.trim()`
 *  melempar dan endpoint membalas 500 tanpa keterangan berguna. */
function parseIndustryInput(raw: unknown): IndustryInput {
  const body = (raw ?? {}) as Record<string, unknown>;

  const state = INDUSTRY_STATES.includes(body.state as IndustryState)
    ? (body.state as IndustryState)
    : "draft";

  /* Bobot sengaja TIDAK dijatuhkan ke default seperti status. Bobot yang tidak
     dikenal dibiarkan lewat apa adanya supaya `validateIndustry()` yang
     menolaknya dengan kalimat yang bisa dibaca; menjatuhkannya ke "also"
     diam-diam berarti panel melapor "tersimpan" untuk isian yang tidak
     tersimpan. Status boleh jatuh ke "draft" karena itu keadaan paling aman —
     yang tidak tayang. */
  return {
    name: asText(body.name),
    desc: asText(body.desc),
    tier: body.tier as IndustryTier,
    image: asText(body.image),
    state,
  };
}

/**
 * Penjaga batas 13 sektor tayang.
 *
 * Mengembalikan pesan galat kalau menyimpan `input` akan membuat jumlah sektor
 * `live` melewati `MAX_LIVE_INDUSTRIES`, atau `null` kalau aman.
 *
 * Yang dijaga bukan selera tata letak melainkan geometri: kamera dan animasi
 * plank-ke-kartu-fokus di `IndustriesStack.tsx` dikalibrasi untuk busur
 * sepanjang 13 plank, dan plank ke-14 memanjat keluar bingkai. Alasan
 * lengkapnya di `shared/industry.ts`.
 *
 * Sengaja TIDAK menjaga arah sebaliknya: berapa pun sisanya aman, sampai nol,
 * karena rentang plank dipusatkan alih-alih dimulai dari nol.
 *
 * `exceptId` dioper saat menyunting supaya baris itu tidak menghitung dirinya
 * sendiri — tanpanya, menyunting sektor ke-13 yang sudah tayang akan ditolak
 * dengan alasan "sudah 13" padahal jumlahnya tidak berubah.
 */
async function jagaBatasTayang(
  input: IndustryInput,
  exceptId?: string,
): Promise<string | null> {
  if (input.state !== "live") return null;

  const lain = await countLiveIndustries(exceptId);
  if (lain < MAX_LIVE_INDUSTRIES) return null;

  return `Sudah ada ${MAX_LIVE_INDUSTRIES} sektor yang tampil, dan itu batasnya — tumpukan 3D di halaman depan cuma muat sebanyak itu. Jadikan salah satu sektor lain "Draft" atau hapus dulu, baru sektor ini bisa ditampilkan.`;
}

/** Memeriksa satu sektor sekaligus dua aturan tingkat daftar (nama kembar,
 *  batas 13). Dipakai `POST /` dan `PUT /:id` supaya keduanya tidak bisa
 *  melenceng satu sama lain. */
async function periksa(
  input: IndustryInput,
  exceptId?: string,
): Promise<IndustryFieldErrors> {
  const errors = validateIndustry(input);

  if (input.name.trim() && (await industryNameTaken(input.name, exceptId))) {
    errors.name = `Nama "${input.name.trim()}" sudah dipakai sektor lain.`;
  }

  /* Batasnya dilaporkan pada isian STATUS, bukan sebagai galat umum: yang
     harus diubah editor memang pilihan status itu, dan form menyorot isian
     yang disebut. */
  const batas = await jagaBatasTayang(input, exceptId);
  if (batas) errors.state = batas;

  return errors;
}

const industriesRoute = new Hono<Env>();

/** Daftar untuk panel admin — termasuk draft. Situs publik tidak pernah
 *  memanggil endpoint ini; ia membaca `content.json`. */
industriesRoute.get("/", async (c) => {
  return c.json({ industries: await listIndustries({ includeDrafts: true }) });
});

industriesRoute.post("/", async (c) => {
  const input = parseIndustryInput(await c.req.json().catch(() => ({})));

  const errors = await periksa(input);
  if (Object.keys(errors).length) return c.json({ errors }, 422);

  const industry = await createIndustry(input);
  await record({
    actor: c.get("actor"),
    entity: "industry",
    entityId: industry.id,
    action: "create",
    snapshot: industry,
  });
  return c.json({ industry }, 201);
});

/**
 * Ditaruh SEBELUM `/:id` dengan sengaja.
 *
 * Hono mencocokkan route sesuai urutan pendaftaran; kalau `POST /:id` pernah
 * ditambahkan di atas ini, "urutkan" akan tertangkap sebagai sebuah id.
 */
industriesRoute.post("/urutkan", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((x): x is string => typeof x === "string")
    : [];

  const industries = await reorderIndustries(ids);
  if (!industries) {
    return c.json(
      {
        error:
          "Urutan yang dikirim tidak cocok dengan daftar sektor yang ada. Muat ulang halaman lalu coba lagi.",
      },
      422,
    );
  }

  await record({
    actor: c.get("actor"),
    entity: "industry",
    action: "update",
    snapshot: { urutan: industries.map((i) => i.name) },
  });
  return c.json({ industries });
});

industriesRoute.get("/:id", async (c) => {
  const industry = await getIndustryById(c.req.param("id"));
  if (!industry) return c.json({ error: "Sektor tidak ditemukan." }, 404);
  return c.json({ industry });
});

/** PUT, bukan PATCH: body-nya SELURUH sektor, dan apa pun yang tidak ikut
 *  dikirim akan hilang. Cocok dengan form admin, yang memang selalu mengirim
 *  seluruh isian. */
industriesRoute.put("/:id", async (c) => {
  const id = c.req.param("id");
  const input = parseIndustryInput(await c.req.json().catch(() => ({})));

  const errors = await periksa(input, id);
  if (Object.keys(errors).length) return c.json({ errors }, 422);

  const industry = await updateIndustry(id, input);
  if (!industry) return c.json({ error: "Sektor tidak ditemukan." }, 404);

  await record({
    actor: c.get("actor"),
    entity: "industry",
    entityId: id,
    action: "update",
    snapshot: industry,
  });
  return c.json({ industry });
});

industriesRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const industry = await softDeleteIndustry(id);
  if (!industry) return c.json({ error: "Sektor tidak ditemukan." }, 404);

  await record({
    actor: c.get("actor"),
    entity: "industry",
    entityId: id,
    action: "delete",
    /* Isi lengkap disimpan justru DI SINI: kalau hapusnya keliru, catatan ini
       yang membuat isinya bisa disusun kembali tanpa membongkar backup. */
    snapshot: industry,
  });
  return c.json({ ok: true, deleted: industry.name });
});

export default industriesRoute;
