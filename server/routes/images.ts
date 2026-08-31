/**
 * Unggah gambar dan daftar gambar yang sudah ada.
 *
 * Panel admin memakai keduanya di satu tempat: pemilih foto menampilkan yang
 * sudah pernah dipakai (termasuk foto lama di `public/`) supaya editor tidak
 * mengunggah ulang berkas yang sebenarnya sudah ada di situs.
 */

import { desc } from "drizzle-orm";
import { Hono } from "hono";

import type { Env } from "../app";
import { record } from "../audit";
import { db } from "../db/client";
import { images } from "../db/schema";
import { ImageError, processUpload } from "../images";

const imagesRoute = new Hono<Env>();

imagesRoute.get("/", async (c) => {
  const rows = await db.select().from(images).orderBy(desc(images.createdAt));
  return c.json({ images: rows });
});

imagesRoute.post("/", async (c) => {
  const form = await c.req.parseBody();
  const file = form.file;

  if (!(file instanceof File)) {
    return c.json({ error: "Tidak ada berkas yang dikirim." }, 400);
  }

  let processed;
  try {
    processed = await processUpload(file);
  } catch (error) {
    /* Galat yang MEMANG untuk dibaca editor dibedakan dari galat tak terduga:
       yang pertama jadi 400 dengan kalimatnya sendiri, sisanya dilempar ulang
       supaya tertangkap `app.onError` dan tercatat di log proses. */
    if (error instanceof ImageError) return c.json({ error: error.message }, 400);
    throw error;
  }

  const [row] = await db
    .insert(images)
    .values({
      path: processed.path,
      source: "upload",
      originalName: file.name || null,
      width: processed.width,
      height: processed.height,
      bytes: processed.bytes,
    })
    .returning();

  await record({
    actor: c.get("actor"),
    entity: "image",
    entityId: row.id,
    action: "create",
    snapshot: row,
  });

  return c.json({ image: row }, 201);
});

export default imagesRoute;
