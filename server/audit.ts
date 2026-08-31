/**
 * Catatan siapa mengubah apa.
 *
 * Semua akun punya kuasa yang sama (keputusan yang disepakati: satu peran),
 * jadi catatan inilah pengganti pembatasan hak akses. Kalau sebuah lowongan
 * hilang, pertanyaannya "siapa dan kapan", dan itu harus bisa dijawab tanpa
 * menebak.
 *
 * Mencatat TIDAK BOLEH menggagalkan aksinya. Simpan yang berhasil lalu gagal
 * mencatat = editor melihat error dan menyimpan ulang, padahal perubahannya
 * sudah masuk. Karena itu galat di sini ditelan dan hanya dilaporkan ke log
 * proses.
 */

import { desc, eq } from "drizzle-orm";

import { db } from "./db/client";
import { auditLog } from "./db/schema";

export type Actor = { id: string; name: string } | null;

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "publish"
  | "login";

export async function record(opts: {
  actor: Actor;
  entity: string;
  entityId?: string | null;
  action: AuditAction;
  snapshot?: unknown;
}): Promise<void> {
  try {
    await db.insert(auditLog).values({
      userId: opts.actor?.id ?? null,
      userName: opts.actor?.name ?? null,
      entity: opts.entity,
      entityId: opts.entityId ?? null,
      action: opts.action,
      snapshot: (opts.snapshot ?? null) as never,
    });
  } catch (error) {
    console.error("[audit] gagal mencatat:", error);
  }
}

export function recentAudit(limit = 50) {
  return db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.at))
    .limit(Math.min(limit, 200));
}

export function auditFor(entity: string, entityId: string) {
  return db
    .select()
    .from(auditLog)
    .where(eq(auditLog.entityId, entityId))
    .orderBy(desc(auditLog.at))
    .limit(50);
}
