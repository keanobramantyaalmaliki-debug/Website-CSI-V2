/**
 * Endpoint langkah "Cara kerja" (Home → "How We Work").
 *
 * Bentuknya menyalin `routes/industries.ts` — terjemahkan body, panggil repo,
 * terjemahkan hasil — termasuk `POST /urutkan` dan PENJAGA BATAS, karena
 * kedua-duanya berlaku di sini dengan alasan yang mirip tapi tidak sama:
 *
 * - **urutan** di sini lebih dari tata letak. Ia isi: alur kerja yang dibaca
 *   dari atas ke bawah, sekaligus penentu nomor "01"–"06".
 * - **batas 6** di sini bukan geometri (talinya melayani berapa pun kartu)
 *   melainkan panjang halaman dan jumlah ilustrasi yang ada. Alasan
 *   lengkapnya di `shared/processStep.ts`.
 *
 * Yang tidak bisa ditegakkan di tempat lain tetap berakhir di sini:
 * `validateProcessStep()` cuma melihat satu langkah, dan `check` di skema juga
 * — galat trigger sampai ke editor sebagai pesan Postgres mentah.
 */

import { Hono } from "hono";
import {
  PROCESS_STEP_STATES,
  MAX_LIVE_PROCESS_STEPS,
  type ProcessGlyphKey,
  type ProcessStepState,
} from "@shared/processStep";
import {
  PESAN_BATAS_PROSES,
  validateProcessStep,
  type ProcessStepFieldErrors,
  type ProcessStepInput,
} from "@shared/validateProcessStep";

import { record, type Actor } from "../audit";
import {
  countLiveProcessSteps,
  createProcessStep,
  getProcessStepById,
  listProcessSteps,
  processStepTitleTaken,
  reorderProcessSteps,
  softDeleteProcessStep,
  updateProcessStep,
} from "../processStepsRepo";

type Env = { Variables: { actor: Actor } };

const asText = (v: unknown): string => (typeof v === "string" ? v : "");

/** JSON mentah → `ProcessStepInput`. Semua isian dipaksa ke bentuknya, tidak
 *  dipercaya: satu `null` di tempat string sudah cukup membuat `.trim()`
 *  melempar dan endpoint membalas 500 tanpa keterangan berguna. */
export function parseProcessStepInput(raw: unknown): ProcessStepInput {
  const body = (raw ?? {}) as Record<string, unknown>;

  const state = PROCESS_STEP_STATES.includes(body.state as ProcessStepState)
    ? (body.state as ProcessStepState)
    : "draft";

  /* Ilustrasi sengaja TIDAK dijatuhkan ke default seperti status. Nama yang
     tidak dikenal dibiarkan lewat apa adanya supaya `validateProcessStep()`
     yang menolaknya dengan kalimat yang bisa dibaca; menjatuhkannya ke
     "discovery" diam-diam berarti panel melapor "tersimpan" untuk isian yang
     tidak tersimpan — dan gambar yang salah tidak pernah kelihatan salah.
     Status boleh jatuh ke "draft" karena itu keadaan paling aman: yang tidak
     tayang. */
  return {
    title: asText(body.title),
    kicker: asText(body.kicker),
    desc: asText(body.desc),
    glyph: body.glyph as ProcessGlyphKey,
    state,
  };
}

/**
 * Penjaga batas 6 langkah tayang.
 *
 * Mengembalikan pesan galat kalau menyimpan `input` akan membuat jumlah
 * langkah `live` melewati `MAX_LIVE_PROCESS_STEPS`, atau `null` kalau aman.
 *
 * Sengaja TIDAK menjaga arah sebaliknya: berapa pun sisanya aman, sampai nol.
 * Talinya digambar ulang dari posisi kartu hasil ukur, dan di nol langkah
 * `Process.tsx` tidak merender seksinya sama sekali — celah 80px mobile ke
 * seksi berikutnya tetap utuh karena yang menjatahnya `Deployments` di atasnya.
 *
 * `exceptId` dioper saat menyunting supaya baris itu tidak menghitung dirinya
 * sendiri — tanpanya, menyunting langkah keenam yang sudah tayang akan ditolak
 * dengan alasan "sudah 6" padahal jumlahnya tidak berubah.
 */
async function jagaBatasTayang(
  input: ProcessStepInput,
  exceptId?: string,
): Promise<string | null> {
  if (input.state !== "live") return null;

  const lain = await countLiveProcessSteps(exceptId);
  if (lain < MAX_LIVE_PROCESS_STEPS) return null;

  return PESAN_BATAS_PROSES;
}

/** Memeriksa satu langkah sekaligus dua aturan tingkat daftar (judul kembar,
 *  batas 6). Dipakai `POST /` dan `PUT /:id` supaya keduanya tidak bisa
 *  melenceng satu sama lain. */
async function periksa(
  input: ProcessStepInput,
  exceptId?: string,
): Promise<ProcessStepFieldErrors> {
  const errors = validateProcessStep(input);

  if (
    input.title.trim() &&
    (await processStepTitleTaken(input.title, exceptId))
  ) {
    errors.title = `Judul "${input.title.trim()}" sudah dipakai langkah lain.`;
  }

  /* Batasnya dilaporkan pada isian STATUS, bukan sebagai galat umum: yang
     harus diubah editor memang pilihan status itu, dan form menyorot isian
     yang disebut. */
  const batas = await jagaBatasTayang(input, exceptId);
  if (batas) errors.state = batas;

  return errors;
}

const processStepsRoute = new Hono<Env>();

/** Daftar untuk panel admin — termasuk draft. Situs publik tidak pernah
 *  memanggil endpoint ini; ia membaca `content.json`. */
processStepsRoute.get("/", async (c) => {
  return c.json({ steps: await listProcessSteps({ includeDrafts: true }) });
});

processStepsRoute.post("/", async (c) => {
  const input = parseProcessStepInput(await c.req.json().catch(() => ({})));

  const errors = await periksa(input);
  if (Object.keys(errors).length) return c.json({ errors }, 422);

  const step = await createProcessStep(input);
  await record({
    actor: c.get("actor"),
    entity: "process-step",
    entityId: step.id,
    action: "create",
    snapshot: step,
  });
  return c.json({ step }, 201);
});

/**
 * Ditaruh SEBELUM `/:id` dengan sengaja.
 *
 * Hono mencocokkan route sesuai urutan pendaftaran; kalau `POST /:id` pernah
 * ditambahkan di atas ini, "urutkan" akan tertangkap sebagai sebuah id.
 */
processStepsRoute.post("/urutkan", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((x): x is string => typeof x === "string")
    : [];

  const steps = await reorderProcessSteps(ids);
  if (!steps) {
    return c.json(
      {
        error:
          "Urutan yang dikirim tidak cocok dengan daftar langkah yang ada. Muat ulang halaman lalu coba lagi.",
      },
      422,
    );
  }

  await record({
    actor: c.get("actor"),
    entity: "process-step",
    action: "update",
    snapshot: { urutan: steps.map((s) => s.title) },
  });
  return c.json({ steps });
});

processStepsRoute.get("/:id", async (c) => {
  const step = await getProcessStepById(c.req.param("id"));
  if (!step) return c.json({ error: "Langkah tidak ditemukan." }, 404);
  return c.json({ step });
});

/** PUT, bukan PATCH: body-nya SELURUH langkah, dan apa pun yang tidak ikut
 *  dikirim akan hilang. Cocok dengan form admin, yang memang selalu mengirim
 *  seluruh isian. */
processStepsRoute.put("/:id", async (c) => {
  const id = c.req.param("id");
  const input = parseProcessStepInput(await c.req.json().catch(() => ({})));

  const errors = await periksa(input, id);
  if (Object.keys(errors).length) return c.json({ errors }, 422);

  const step = await updateProcessStep(id, input);
  if (!step) return c.json({ error: "Langkah tidak ditemukan." }, 404);

  await record({
    actor: c.get("actor"),
    entity: "process-step",
    entityId: id,
    action: "update",
    snapshot: step,
  });
  return c.json({ step });
});

processStepsRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const step = await softDeleteProcessStep(id);
  if (!step) return c.json({ error: "Langkah tidak ditemukan." }, 404);

  await record({
    actor: c.get("actor"),
    entity: "process-step",
    entityId: id,
    action: "delete",
    /* Isi lengkap disimpan justru DI SINI: kalau hapusnya keliru, catatan ini
       yang membuat isinya bisa disusun kembali tanpa membongkar backup. */
    snapshot: step,
  });
  return c.json({ ok: true, deleted: step.title });
});

export default processStepsRoute;
