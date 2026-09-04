/**
 * Login, sesi, dan penjaga route.
 *
 * Tidak memakai JWT dan tidak memakai pustaka hash pihak ketiga. Dua alasan:
 * sesi yang tersimpan di tabel BISA dicabut (JWT yang sudah terlanjur keluar
 * berlaku sampai kedaluwarsa, apa pun yang terjadi), dan `scrypt` sudah ada di
 * Node — satu dependensi lebih sedikit yang harus tetap terpasang di VPS
 * bertahun-tahun ke depan.
 *
 * `scrypt` dipilih ketimbang `pbkdf2` karena dirancang mahal di MEMORI, bukan
 * cuma di CPU, sehingga jauh lebih tahan terhadap penebakan massal memakai GPU.
 */

import {
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import type { Context, MiddlewareHandler } from "hono";
import { getCookie, setCookie } from "hono/cookie";

import type { Actor } from "./audit";
import { db } from "./db/client";
import { sessions, users } from "./db/schema";
import { isProduction } from "./env";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const COOKIE = "cogniti_session";
/** 30 hari. Cukup lama supaya editor yang membuka admin sebulan sekali tidak
 *  selalu disambut layar login, cukup pendek supaya laptop yang hilang tidak
 *  jadi akses selamanya. */
const SESSION_DAYS = 30;

/* ───────────────────────── kata sandi ─────────────────────── */

export async function hashPassword(password: string): Promise<string> {
  /* Salt acak per pengguna: tanpa itu, dua orang dengan sandi sama punya hash
     sama, dan satu tabel pelangi membongkar keduanya sekaligus. */
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;

  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);

  /* `timingSafeEqual`, bukan `===`: perbandingan string biasa berhenti di byte
     pertama yang berbeda, dan selisih waktunya — meski kecil — bisa diukur
     untuk menebak hash satu byte demi satu byte. */
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/* ────────────────────────── sesi ──────────────────────────── */

function expiry(): Date {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export async function startSession(c: Context, userId: string): Promise<void> {
  const id = randomBytes(32).toString("base64url");
  const expiresAt = expiry();

  await db.insert(sessions).values({ id, userId, expiresAt });

  setCookie(c, COOKIE, id, {
    httpOnly: true,
    /* `Lax`, bukan `None`: admin dan API berada di asal yang sama (Vite
       mem-proxy `/api` di lokal, reverse proxy di produksi), jadi cookie-nya
       tidak pernah perlu ikut request lintas situs. */
    sameSite: "Lax",
    path: "/",
    /**
     * ⚠️ `Secure` HANYA di produksi.
     *
     * Dinyalakan tanpa syarat, browser menolak menyimpan cookie di
     * `http://localhost` dan login gagal secara lokal tanpa pesan apa pun —
     * halamannya cuma kembali ke layar login. Dimatikan tanpa syarat, cookie
     * sesi ikut terkirim polos di produksi.
     */
    secure: isProduction,
    expires: expiresAt,
  });
}

export async function endSession(c: Context): Promise<void> {
  const id = getCookie(c, COOKIE);
  if (id) await db.delete(sessions).where(eq(sessions.id, id));
  setCookie(c, COOKIE, "", { path: "/", maxAge: 0 });
}

async function actorFromCookie(c: Context): Promise<Actor> {
  const id = getCookie(c, COOKIE);
  if (!id) return null;

  const [row] = await db
    .select({ userId: users.id, name: users.name })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.id, id),
        /* Kedaluwarsa diperiksa di SQL, bukan di JavaScript: sesi lama yang
           belum sempat dibersihkan tidak boleh lolos hanya karena barisnya
           masih ada. */
        gt(sessions.expiresAt, new Date()),
        isNull(users.deletedAt),
      ),
    );

  return row ? { id: row.userId, name: row.name } : null;
}

/** Isi `actor` untuk SETIAP request. Tidak menolak siapa pun — penolakannya
 *  tugas `requireLogin`. Dipisah supaya endpoint publik tetap bisa mencatat
 *  siapa pelakunya kalau kebetulan dia sedang login. */
export const attachActor: MiddlewareHandler = async (c, next) => {
  c.set("actor", await actorFromCookie(c));
  await next();
};

export const requireLogin: MiddlewareHandler = async (c, next) => {
  if (!c.get("actor")) {
    return c.json({ error: "Silakan masuk dulu." }, 401);
  }
  await next();
};

/** Buang baris sesi yang sudah lewat waktu. Dipanggil saat proses start —
 *  tabelnya tidak akan tumbuh selamanya tanpa ada yang mengurus. */
export async function pruneSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
