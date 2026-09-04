/**
 * Masuk, keluar, dan "aku ini siapa".
 */

import { isNull } from "drizzle-orm";
import { Hono } from "hono";

import type { Env } from "../app";
import { record } from "../audit";
import { endSession, startSession, verifyPassword } from "../auth";
import { db } from "../db/client";
import { users } from "../db/schema";

const authRoute = new Hono<Env>();

/**
 * Masuk dengan KATA SANDI SAJA — tanpa email.
 *
 * Yang penting: ini bukan "satu sandi bersama". Tiap orang tetap punya akun
 * sendiri dengan sandinya sendiri, dan sandi itulah yang mengenali dia. Yang
 * hilang cuma satu isian yang harus diketik, bukan identitasnya — `audit_log`
 * tetap bisa menjawab siapa yang mengubah apa, dan mencabut akses satu orang
 * tetap cukup dengan menghapus akunnya, tanpa mengganggu yang lain.
 *
 * Konsekuensinya sandi jadi PENGENAL, bukan lagi sekadar bukti: dua akun tidak
 * boleh bersandi sama. `user:create` yang menjaga itu — di sinilah tabrakan
 * seperti itu akan muncul sebagai "masuk sebagai orang lain", diam-diam.
 */
authRoute.post("/login", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const password = String(body.password ?? "");

  const kandidat = await db.select().from(users).where(isNull(users.deletedAt));

  /**
   * SEMUA akun dicoba, tanpa berhenti di yang cocok.
   *
   * Berhenti lebih awal membuat lamanya balasan bergantung pada akun keberapa
   * yang cocok — dan `scrypt` sengaja mahal, jadi selisihnya bukan mikrodetik
   * melainkan ratusan milidetik: cukup untuk dibaca dari jauh. Dengan tim
   * sebesar ini ongkosnya beberapa ratus milidetik sekali login, sekali sehari.
   */
  let user: (typeof kandidat)[number] | null = null;
  for (const calon of kandidat) {
    if (await verifyPassword(password, calon.passwordHash)) user ??= calon;
  }

  if (!user) {
    /* Tetap hitung satu hash meski tidak ada akun sama sekali, supaya balasan
       "database kosong" tidak lebih cepat daripada "sandi salah". */
    if (kandidat.length === 0) await verifyPassword(password, "scrypt$00$00");
    return c.json({ error: "Kata sandi tidak cocok." }, 401);
  }

  await startSession(c, user.id);
  await record({
    actor: { id: user.id, name: user.name },
    entity: "session",
    action: "login",
  });

  return c.json({ user: { id: user.id, name: user.name, email: user.email } });
});

authRoute.post("/logout", async (c) => {
  await endSession(c);
  return c.json({ ok: true });
});

/** Dipanggil panel admin saat dimuat, untuk memutuskan menampilkan layar login
 *  atau isinya. Sengaja membalas 200 dengan `user: null` alih-alih 401 —
 *  belum login bukan galat di sini. */
authRoute.get("/me", (c) => c.json({ user: c.get("actor") }));

export default authRoute;
