/**
 * Perkakas bersama untuk test server.
 *
 * Semuanya berjalan melawan `cogniti_test` — database terpisah yang isinya
 * memang boleh dihapus. `server/env.ts` yang memilihnya, lewat `NODE_ENV=test`
 * yang diset Vitest sendiri; kalau pemilihan itu rusak, `resetDb()` di bawah
 * akan mengosongkan database yang sedang dipakai mengedit konten. Karena itu
 * ada pemeriksaan nama di bawah, bukan sekadar komentar.
 */

import { app } from "../app";
import { hashPassword } from "../auth";
import { db, sql } from "../db/client";
import { env } from "../env";
import { users } from "../db/schema";

if (!env.databaseUrl.includes("cogniti_test")) {
  throw new Error(
    `Test menolak jalan: DATABASE yang terpilih "${env.databaseUrl}" bukan cogniti_test.`,
  );
}

/** Kosongkan semua tabel. CASCADE mengurus urutan foreign key supaya daftar
 *  di bawah tidak perlu diurutkan ulang tiap kali skema bertambah. */
export async function resetDb(): Promise<void> {
  await sql.unsafe(`
    truncate table
      audit_log, sessions, job_copy_bullets, job_copy, job_skills, jobs,
      people_values, crew_socials, crew_members, images, users
    restart identity cascade
  `);
}

export type Login = {
  cookie: string;
  userId: string;
};

/** Buat satu akun lalu masuk, kembalikan cookie sesinya. */
export async function loginAsEditor(): Promise<Login> {
  const [user] = await db
    .insert(users)
    .values({
      email: "editor@cogniti.id",
      name: "Editor Test",
      passwordHash: await hashPassword("sandi-yang-panjang"),
    })
    .returning();

  const res = await app.request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "sandi-yang-panjang" }),
  });
  if (res.status !== 200) {
    throw new Error(`Login test gagal (${res.status}): ${await res.text()}`);
  }

  const raw = res.headers.get("set-cookie") ?? "";
  const cookie = raw.split(";")[0];
  return { cookie, userId: user.id };
}

/** Panggil API sebagai editor yang sudah masuk. */
export function asEditor(login: Login) {
  return (path: string, init: RequestInit = {}) =>
    app.request(path, {
      ...init,
      headers: {
        "content-type": "application/json",
        cookie: login.cookie,
        ...(init.headers ?? {}),
      },
    });
}

/** Bentuk minimal yang lolos validasi "tayang". */
export function jobBody(over: Record<string, unknown> = {}) {
  return {
    title: "Data Engineer",
    department: "Engineering",
    state: "open",
    overview: "Membangun jalur data untuk klien.",
    photo: "/careers/engineer.jpg",
    skills: ["SQL", "Python"],
    askGithub: true,
    detail: null,
    ...over,
  };
}

/** Bentuk nilai minimal yang lolos validasi `live`. */
export function valueBody(over: Record<string, unknown> = {}) {
  return {
    title: "Craft First",
    tagline: "Precision over speed",
    description: "Detailnya adalah pekerjaannya.",
    photo: "/people/craft-first.webp",
    state: "live",
    ...over,
  };
}

/** Bentuk anggota crew minimal yang lolos validasi `live`. */
export function crewBody(over: Record<string, unknown> = {}) {
  return {
    name: "Bagas Nusantara Nabillah",
    role: "Senior Developer",
    category: "Developer",
    photo: "/people/bagas.webp",
    social: [{ platform: "linkedin", url: "https://linkedin.com/in/bagas" }],
    state: "live",
    ...over,
  };
}
