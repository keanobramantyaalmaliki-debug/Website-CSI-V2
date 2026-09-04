/**
 * Endpoint layanan (Services → daftar layanan).
 *
 * Bentuknya menyalin `routes/workProjects.ts` — terjemahkan body, panggil
 * repo, terjemahkan hasil, plus `POST /urutkan` karena urutan layanan adalah
 * konten yang tayang (ia yang dibaca lurus dari atas ke bawah di daftar
 * sr-only).
 *
 * Bedanya cuma isian yang lebih sedikit: tidak ada gambar, klien, atau tahun.
 * `subs` datang sebagai array, jadi ia dipaksa ke bentuknya sendiri
 * (`asTextList`) alih-alih lewat `asText`.
 */

import { Hono } from "hono";
import { SERVICE_STATES, type ServiceState } from "@shared/service";
import { validateService, type ServiceInput } from "@shared/validateService";

import { record, type Actor } from "../audit";
import {
  createService,
  getServiceById,
  listServices,
  reorderServices,
  serviceTitleTaken,
  softDeleteService,
  updateService,
} from "../servicesRepo";

type Env = { Variables: { actor: Actor } };

const asText = (v: unknown): string => (typeof v === "string" ? v : "");

/** Array rincian mentah → array string. Yang bukan string dibuang, bukan
 *  diubah jadi `"undefined"`: rincian yang tidak terkirim dengan benar lebih
 *  baik hilang daripada terbaca sebagai teks omong kosong oleh pembaca
 *  layar. */
const asTextList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** JSON mentah → `ServiceInput`. Semua isian dipaksa ke bentuknya, tidak
 *  dipercaya — lihat alasan yang sama di `routes/values.ts`. */
export function parseServiceInput(raw: unknown): ServiceInput {
  const body = (raw ?? {}) as Record<string, unknown>;

  const state = SERVICE_STATES.includes(body.state as ServiceState)
    ? (body.state as ServiceState)
    : "draft";

  return {
    title: asText(body.title),
    desc: asText(body.desc),
    subs: asTextList(body.subs),
    state,
  };
}

const servicesRoute = new Hono<Env>();

/** Daftar untuk panel admin — termasuk draft. Situs publik tidak pernah
 *  memanggil endpoint ini; ia membaca `content.json`. */
servicesRoute.get("/", async (c) => {
  return c.json({ services: await listServices({ includeDrafts: true }) });
});

servicesRoute.post("/", async (c) => {
  const input = parseServiceInput(await c.req.json().catch(() => ({})));

  const errors = validateService(input);
  if (input.title.trim() && (await serviceTitleTaken(input.title))) {
    errors.title = `Nama layanan "${input.title.trim()}" sudah dipakai layanan lain.`;
  }
  if (Object.keys(errors).length) return c.json({ errors }, 422);

  const service = await createService(input);
  await record({
    actor: c.get("actor"),
    entity: "service",
    entityId: service.id,
    action: "create",
    snapshot: service,
  });
  return c.json({ service }, 201);
});

/** Ditaruh SEBELUM `/:id` dengan sengaja — Hono mencocokkan route sesuai
 *  urutan pendaftaran, jadi `POST /:id` yang didaftarkan lebih dulu akan
 *  menangkap "urutkan" sebagai sebuah id. Lihat catatan lengkapnya di
 *  `routes/values.ts`. */
servicesRoute.post("/urutkan", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((x): x is string => typeof x === "string")
    : [];

  const services = await reorderServices(ids);
  if (!services) {
    return c.json(
      {
        error:
          "Urutan yang dikirim tidak cocok dengan daftar layanan yang ada. Muat ulang halaman lalu coba lagi.",
      },
      422,
    );
  }

  await record({
    actor: c.get("actor"),
    entity: "service",
    action: "update",
    snapshot: { urutan: services.map((s) => s.title) },
  });
  return c.json({ services });
});

servicesRoute.get("/:id", async (c) => {
  const service = await getServiceById(c.req.param("id"));
  if (!service) return c.json({ error: "Layanan tidak ditemukan." }, 404);
  return c.json({ service });
});

/** PUT, bukan PATCH: body-nya SELURUH layanan, dan apa pun yang tidak ikut
 *  dikirim akan hilang. Cocok dengan form admin, yang memang selalu mengirim
 *  seluruh isian. */
servicesRoute.put("/:id", async (c) => {
  const id = c.req.param("id");
  const input = parseServiceInput(await c.req.json().catch(() => ({})));

  const errors = validateService(input);
  if (input.title.trim() && (await serviceTitleTaken(input.title, id))) {
    errors.title = `Nama layanan "${input.title.trim()}" sudah dipakai layanan lain.`;
  }
  if (Object.keys(errors).length) return c.json({ errors }, 422);

  const service = await updateService(id, input);
  if (!service) return c.json({ error: "Layanan tidak ditemukan." }, 404);

  await record({
    actor: c.get("actor"),
    entity: "service",
    entityId: id,
    action: "update",
    snapshot: service,
  });
  return c.json({ service });
});

servicesRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const service = await softDeleteService(id);
  if (!service) return c.json({ error: "Layanan tidak ditemukan." }, 404);

  await record({
    actor: c.get("actor"),
    entity: "service",
    entityId: id,
    action: "delete",
    /* Isi lengkap disimpan justru DI SINI: kalau hapusnya keliru, catatan ini
       yang membuat isinya bisa disusun kembali tanpa membongkar backup. */
    snapshot: service,
  });
  return c.json({ ok: true, deleted: service.title });
});

export default servicesRoute;
