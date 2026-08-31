/**
 * Masuk, keluar, dan "aku ini siapa".
 */

import { eq, isNull, and } from "drizzle-orm";
import { Hono } from "hono";

import type { Env } from "../app";
import { record } from "../audit";
import { endSession, startSession, verifyPassword } from "../auth";
import { db } from "../db/client";
import { users } from "../db/schema";

const authRoute = new Hono<Env>();

authRoute.post("/login", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)));

  /**
   * Satu pesan untuk email tak dikenal MAUPUN sandi salah.
   *
   * "Email tidak terdaftar" memberi tahu penebak bahwa alamat lain yang dia
   * coba memang ada — itu setengah jawaban gratis. Editor yang benar-benar
   * salah ketik tetap tertolong: pesannya menyebut keduanya.
   */
  const gagal = () =>
    c.json({ error: "Email atau kata sandi tidak cocok." }, 401);

  if (!user) {
    /* Tetap hitung satu hash meski akunnya tidak ada, supaya lamanya balasan
       tidak membocorkan apakah email itu terdaftar. */
    await verifyPassword(password, "scrypt$00$00");
    return gagal();
  }
  if (!(await verifyPassword(password, user.passwordHash))) return gagal();

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
