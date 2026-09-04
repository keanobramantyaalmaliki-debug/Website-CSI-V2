/**
 * Buat akun editor dari terminal:
 *
 *   bun run user:create budi@cogniti.id "Budi" sandiRahasia
 *
 * Sengaja TIDAK ada halaman pendaftaran di panel admin. Yang boleh mengedit
 * situs hanya beberapa orang yang sudah dikenal; form daftar terbuka justru
 * menambah pintu yang harus dijaga tanpa menyelesaikan masalah apa pun.
 */

import { eq, isNull, ne, and } from "drizzle-orm";

import { hashPassword, verifyPassword } from "./auth";
import { db, sql } from "./db/client";
import { users } from "./db/schema";

const [email, name, password] = process.argv.slice(2);

if (!email || !name || !password) {
  console.error(
    'Pemakaian: bun run user:create <email> "<nama>" <kata sandi>',
  );
  process.exit(1);
}

if (password.length < 10) {
  console.error("Kata sandi minimal 10 karakter.");
  process.exit(1);
}

const normalized = email.trim().toLowerCase();

const [existing] = await db
  .select({ id: users.id })
  .from(users)
  .where(eq(users.email, normalized));

/**
 * Sandi kembar ditolak.
 *
 * Panel ini masuk dengan kata sandi saja, jadi sandi bukan cuma bukti — ia
 * PENGENAL. Dua akun bersandi sama berarti salah satunya tidak akan pernah
 * kebagian: yang satu masuk sebagai yang lain, tanpa galat, dan `audit_log`
 * menuliskan nama yang keliru. Lebih baik ketahuan di sini.
 */
const lain = await db
  .select({ name: users.name, passwordHash: users.passwordHash })
  .from(users)
  .where(
    existing
      ? and(isNull(users.deletedAt), ne(users.id, existing.id))
      : isNull(users.deletedAt),
  );

for (const orang of lain) {
  if (await verifyPassword(password, orang.passwordHash)) {
    console.error(
      `Kata sandi itu sudah dipakai akun lain (${orang.name}). Panel ini masuk dengan sandi saja, jadi tiap orang harus punya sandi yang berbeda.`,
    );
    await sql.end();
    process.exit(1);
  }
}

const passwordHash = await hashPassword(password);

if (existing) {
  /* Email sama = GANTI SANDI, bukan akun kedua. Dua akun beremail sama akan
     membuat login-nya bergantung urutan baris. */
  await db.update(users).set({ passwordHash, name, deletedAt: null }).where(eq(users.id, existing.id));
  console.log(`Kata sandi ${normalized} diperbarui.`);
} else {
  await db.insert(users).values({ email: normalized, name, passwordHash });
  console.log(`Akun ${normalized} dibuat.`);
}

await sql.end();
