/**
 * Endpoint pembatalan satu perubahan yang belum terpublish.
 *
 * Berkas sendiri, bukan tambahan di `routes/history.ts`: kepala berkas itu
 * berjanji hanya membaca, dan janjinya masih benar — pembatalan tidak pernah
 * menyunting atau menghapus baris `audit_log`, ia menambah satu. Menaruh POST
 * ini di sana akan membuat janji itu terbaca seperti sudah dilanggar.
 *
 * Aturannya sendiri tidak tinggal di sini. Yang di sini cuma terjemahan
 * permintaan HTTP; `pemulih.ts` yang memutuskan apa yang boleh dan bagaimana.
 */

import { Hono } from "hono";

import type { Actor } from "../audit";
import { batalkan } from "../pemulih";

type Env = { Variables: { actor: Actor } };

const revertRoute = new Hono<Env>();

/**
 * POST, bukan DELETE, walau ia mengembalikan sesuatu ke keadaan lama: yang
 * dihapus tidak ada. Isi yang dipulihkan ditulis sebagai baris baru di
 * `audit_log`, dan permintaan yang sama dikirim dua kali harus ditolak yang
 * kedua (bendanya sudah tidak tertahan), bukan diam-diam berhasil.
 */
revertRoute.post("/", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  const entitas = typeof body.entitas === "string" ? body.entitas.trim() : "";
  /* `entitasId` boleh null, dan itu bukan kelalaian: visi dan kaki halaman
     memang dicatat tanpa id karena id-nya angka 1, bukan uuid. Yang ditolak
     adalah bentuk lain — angka, objek, string kosong. */
  const entitasId =
    typeof body.entitasId === "string" && body.entitasId.trim()
      ? body.entitasId.trim()
      : body.entitasId === null || body.entitasId === undefined
        ? null
        : undefined;

  if (!entitas || entitasId === undefined) {
    return c.json(
      { error: "Permintaan pembatalan tidak berbentuk benar." },
      400,
    );
  }

  const hasil = await batalkan({
    entitas,
    entitasId,
    actor: c.get("actor"),
  });

  if (!hasil.ok) return c.json({ error: hasil.pesan }, hasil.status);

  return c.json({ aksi: hasil.aksi, judul: hasil.judul });
});

export default revertRoute;
