/**
 * Koneksi Postgres — satu instance untuk seluruh proses.
 *
 * `postgres.js` mengelola pool sendiri; membuat client baru per request akan
 * menghabiskan slot koneksi Postgres (bawaannya cuma 100) dan gagalnya baru
 * kelihatan saat beberapa orang membuka admin bersamaan.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "../env";
import * as schema from "./schema";

export const sql = postgres(env.databaseUrl, {
  max: 10,
  /** Nama ini muncul di `pg_stat_activity`, jadi kalau ada query yang
   *  menggantung, kelihatan siapa pemiliknya. */
  connection: { application_name: "cogniti-cms" },
});

export const db = drizzle(sql, { schema });

export type Db = typeof db;
export { schema };
