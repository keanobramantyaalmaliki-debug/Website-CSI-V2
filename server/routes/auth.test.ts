/**
 * Masuk dengan kata sandi saja.
 *
 * Yang diuji di sini bukan "sandi benar diterima" — itu bagian yang mudah.
 * Yang mudah rusak justru IDENTITASNYA: begitu email tidak lagi diketik,
 * sandilah yang menentukan panel ini mengira kamu siapa, dan kalau penentuan
 * itu meleset tidak ada galat sama sekali — orang cuma masuk sebagai orang
 * lain, dan `audit_log` menuliskan nama yang keliru.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { app } from "../app";
import { hashPassword } from "../auth";
import { db } from "../db/client";
import { users } from "../db/schema";
import { resetDb } from "../test/helpers";

const json = <T,>(res: Response): Promise<T> => res.json() as Promise<T>;
type MasukRes = { user: { id: string; name: string } };

async function buatAkun(email: string, name: string, password: string) {
  await db
    .insert(users)
    .values({ email, name, passwordHash: await hashPassword(password) });
}

const masuk = (body: Record<string, unknown>) =>
  app.request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(async () => {
  await resetDb();
});

describe("masuk dengan kata sandi saja", () => {
  it("menerima sandi yang benar tanpa email", async () => {
    await buatAkun("rnd@cogniti.id", "Tim R&D", "sandi-yang-panjang");

    const res = await masuk({ password: "sandi-yang-panjang" });
    expect(res.status).toBe(200);
    expect((await json<MasukRes>(res)).user.name).toBe("Tim R&D");
  });

  it("menolak sandi yang salah", async () => {
    await buatAkun("rnd@cogniti.id", "Tim R&D", "sandi-yang-panjang");

    const res = await masuk({ password: "sandi-yang-salah" });
    expect(res.status).toBe(401);
  });

  it("menolak saat belum ada akun sama sekali", async () => {
    const res = await masuk({ password: "sandi-yang-panjang" });
    expect(res.status).toBe(401);
  });

  it("mengenali ORANG yang benar dari sandinya, bukan yang pertama di tabel", async () => {
    await buatAkun("rnd@cogniti.id", "Tim R&D", "sandi-punya-rnd");
    await buatAkun("budi@cogniti.id", "Budi", "sandi-punya-budi");

    /* Budi dibuat belakangan: kalau login berhenti di baris pertama yang
       ditemuinya alih-alih mencocokkan sandi, yang masuk adalah Tim R&D. */
    const res = await masuk({ password: "sandi-punya-budi" });
    expect(res.status).toBe(200);
    expect((await json<MasukRes>(res)).user.name).toBe("Budi");
  });

  it("tidak menerima akun yang sudah dihapus", async () => {
    await buatAkun("mantan@cogniti.id", "Mantan", "sandi-yang-panjang");
    await db.update(users).set({ deletedAt: new Date() });

    const res = await masuk({ password: "sandi-yang-panjang" });
    expect(res.status).toBe(401);
  });

  it("email yang ikut terkirim tidak berpengaruh apa-apa", async () => {
    await buatAkun("rnd@cogniti.id", "Tim R&D", "sandi-yang-panjang");

    /* Panel tidak lagi mengirimnya, tapi klien lama atau curl yang masih
       menyertakan email tidak boleh diperlakukan istimewa — apalagi dipakai
       memilih akun. */
    const res = await masuk({
      email: "orang-lain@cogniti.id",
      password: "sandi-yang-panjang",
    });
    expect(res.status).toBe(200);
    expect((await json<MasukRes>(res)).user.name).toBe("Tim R&D");
  });
});
