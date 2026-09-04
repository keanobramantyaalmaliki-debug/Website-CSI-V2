/**
 * Endpoint testimoni (Services → kutipan klien di dasar halaman).
 *
 * Bentuknya menyalin `routes/values.ts` — terjemahkan body, panggil repo,
 * terjemahkan hasil — termasuk `POST /urutkan`, karena urutan kutipan adalah
 * konten yang tayang: yang pertama adalah kutipan yang terlihat saat halaman
 * dibuka, sisanya baru muncul kalau pengunjung menekan panah.
 *
 * Yang TIDAK ada di sini dan ada di nilai: foto. Tabelnya memang tidak punya
 * kolomnya — komponennya menggambar ikon orang yang sama untuk setiap kutipan.
 */

import { Hono } from "hono";
import { TESTIMONIAL_STATES, type TestimonialState } from "@shared/testimonial";
import {
  validateTestimonial,
  type TestimonialInput,
} from "@shared/validateTestimonial";

import { record, type Actor } from "../audit";
import {
  createTestimonial,
  getTestimonialById,
  listTestimonials,
  reorderTestimonials,
  softDeleteTestimonial,
  testimonialNameTaken,
  updateTestimonial,
} from "../testimonialsRepo";

type Env = { Variables: { actor: Actor } };

const asText = (v: unknown): string => (typeof v === "string" ? v : "");

/** JSON mentah → `TestimonialInput`. Semua isian dipaksa ke bentuknya, tidak
 *  dipercaya: satu `null` di tempat string sudah cukup membuat `.trim()`
 *  melempar dan endpoint membalas 500 tanpa keterangan berguna. */
export function parseTestimonialInput(raw: unknown): TestimonialInput {
  const body = (raw ?? {}) as Record<string, unknown>;

  const state = TESTIMONIAL_STATES.includes(body.state as TestimonialState)
    ? (body.state as TestimonialState)
    : "draft";

  return {
    quote: asText(body.quote),
    name: asText(body.name),
    role: asText(body.role),
    state,
  };
}

const testimonialsRoute = new Hono<Env>();

/** Daftar untuk panel admin — termasuk draft. Situs publik tidak pernah
 *  memanggil endpoint ini; ia membaca `content.json`. */
testimonialsRoute.get("/", async (c) => {
  return c.json({ testimonials: await listTestimonials({ includeDrafts: true }) });
});

testimonialsRoute.post("/", async (c) => {
  const input = parseTestimonialInput(await c.req.json().catch(() => ({})));

  const errors = validateTestimonial(input);
  if (input.name.trim() && (await testimonialNameTaken(input.name))) {
    errors.name = `Nama "${input.name.trim()}" sudah dipakai testimoni lain.`;
  }
  if (Object.keys(errors).length) return c.json({ errors }, 422);

  const testimonial = await createTestimonial(input);
  await record({
    actor: c.get("actor"),
    entity: "testimonial",
    entityId: testimonial.id,
    action: "create",
    snapshot: testimonial,
  });
  return c.json({ testimonial }, 201);
});

/**
 * Ditaruh SEBELUM `/:id` dengan sengaja.
 *
 * Hono mencocokkan route sesuai urutan pendaftaran; kalau `POST /:id` pernah
 * ada dan didaftarkan lebih dulu, "urutkan" akan tertangkap sebagai sebuah id.
 * Hari ini `POST /:id` tidak ada, jadi ini bukan perbaikan bug melainkan
 * pagar untuk route berikutnya yang ditambahkan orang lain.
 */
testimonialsRoute.post("/urutkan", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((x): x is string => typeof x === "string")
    : [];

  const testimonials = await reorderTestimonials(ids);
  if (!testimonials) {
    return c.json(
      {
        error:
          "Urutan yang dikirim tidak cocok dengan daftar testimoni yang ada. Muat ulang halaman lalu coba lagi.",
      },
      422,
    );
  }

  await record({
    actor: c.get("actor"),
    entity: "testimonial",
    action: "update",
    snapshot: { urutan: testimonials.map((t) => t.name) },
  });
  return c.json({ testimonials });
});

testimonialsRoute.get("/:id", async (c) => {
  const testimonial = await getTestimonialById(c.req.param("id"));
  if (!testimonial) return c.json({ error: "Testimoni tidak ditemukan." }, 404);
  return c.json({ testimonial });
});

/** PUT, bukan PATCH: body-nya SELURUH testimoni, dan apa pun yang tidak ikut
 *  dikirim akan hilang. Cocok dengan form admin, yang memang selalu mengirim
 *  seluruh isian. */
testimonialsRoute.put("/:id", async (c) => {
  const id = c.req.param("id");
  const input = parseTestimonialInput(await c.req.json().catch(() => ({})));

  const errors = validateTestimonial(input);
  if (input.name.trim() && (await testimonialNameTaken(input.name, id))) {
    errors.name = `Nama "${input.name.trim()}" sudah dipakai testimoni lain.`;
  }
  if (Object.keys(errors).length) return c.json({ errors }, 422);

  const testimonial = await updateTestimonial(id, input);
  if (!testimonial) return c.json({ error: "Testimoni tidak ditemukan." }, 404);

  await record({
    actor: c.get("actor"),
    entity: "testimonial",
    entityId: id,
    action: "update",
    snapshot: testimonial,
  });
  return c.json({ testimonial });
});

testimonialsRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const testimonial = await softDeleteTestimonial(id);
  if (!testimonial) return c.json({ error: "Testimoni tidak ditemukan." }, 404);

  await record({
    actor: c.get("actor"),
    entity: "testimonial",
    entityId: id,
    action: "delete",
    /* Isi lengkap disimpan justru DI SINI: kalau hapusnya keliru, catatan ini
       yang membuat isinya bisa disusun kembali tanpa membongkar backup. */
    snapshot: testimonial,
  });
  return c.json({ ok: true, deleted: testimonial.name });
});

export default testimonialsRoute;
