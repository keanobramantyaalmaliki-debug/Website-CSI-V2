/**
 * Endpoint kartu deployment (Home → "Built for real-world environments…").
 *
 * Bentuknya menyalin `routes/industries.ts` — terjemahkan body, panggil repo,
 * terjemahkan hasil — plus `POST /urutkan`, karena urutan kartu benar-benar
 * tayang: grid CSS merender persis urutan larik itu, dan urutan itu sekaligus
 * menentukan nomor "01"–"05".
 *
 * Yang SENGAJA tidak ikut disalin dari sana: penjaga batas jumlah tayang.
 * Batas 13 sektor lahir dari geometri tumpukan 3D; grid ini tinggal menambah
 * baris ke bawah, jadi kartu ke-empat belas tidak merusak apa pun.
 *
 * Yang ikut tapi berubah bentuk: cek kembar. Di sektor industri yang dijaga
 * NAMA-nya; di sini yang dijaga PASANGAN sektor+wilayah, karena sektor yang
 * sama di dua wilayah itu memang dua sistem yang berbeda. Alasan lengkapnya di
 * `db/schema.ts`.
 */

import { Hono } from "hono";
import { DEPLOYMENT_STATES, type DeploymentState } from "@shared/deployment";
import {
  validateDeployment,
  type DeploymentFieldErrors,
  type DeploymentInput,
} from "@shared/validateDeployment";

import { record, type Actor } from "../audit";
import {
  createDeployment,
  deploymentPairTaken,
  getDeploymentById,
  listDeployments,
  reorderDeployments,
  softDeleteDeployment,
  updateDeployment,
} from "../deploymentsRepo";

type Env = { Variables: { actor: Actor } };

const asText = (v: unknown): string => (typeof v === "string" ? v : "");

/** JSON mentah → `DeploymentInput`. Semua isian dipaksa ke bentuknya, tidak
 *  dipercaya: satu `null` di tempat string sudah cukup membuat `.trim()`
 *  melempar dan endpoint membalas 500 tanpa keterangan berguna. */
export function parseDeploymentInput(raw: unknown): DeploymentInput {
  const body = (raw ?? {}) as Record<string, unknown>;

  /* Status boleh jatuh ke "draft" karena itu keadaan paling aman — yang tidak
     tayang. Tidak ada isian lain di entitas ini yang punya daftar pilihan
     tertutup, jadi tidak ada yang perlu dibiarkan lewat untuk ditolak
     pemeriksa (bandingkan `tier` di routes/industries.ts). */
  const state = DEPLOYMENT_STATES.includes(body.state as DeploymentState)
    ? (body.state as DeploymentState)
    : "draft";

  return {
    sector: asText(body.sector),
    region: asText(body.region),
    desc: asText(body.desc),
    image: asText(body.image),
    state,
  };
}

/** Memeriksa satu kartu sekaligus satu aturan tingkat daftar (kartu kembar).
 *  Dipakai `POST /` dan `PUT /:id` supaya keduanya tidak bisa melenceng satu
 *  sama lain. */
async function periksa(
  input: DeploymentInput,
  exceptId?: string,
): Promise<DeploymentFieldErrors> {
  const errors = validateDeployment(input);

  /* Cuma diperiksa kalau keduanya terisi. Draf yang baru diketik sektornya
     punya wilayah kosong, dan dua draf setengah jadi bukan "kartu kembar" —
     mereka belum kartu apa pun. */
  if (
    input.sector.trim() &&
    input.region.trim() &&
    (await deploymentPairTaken(input.sector, input.region, exceptId))
  ) {
    /* Dilaporkan pada isian WILAYAH, bukan sektor: sektor yang sama itu sah,
       dan yang membuat kartunya kembar justru wilayahnya. Editor yang membaca
       galat ini di isian sektor akan mengira sektornya yang terlarang. */
    errors.region = `Sudah ada kartu "${input.sector.trim()}" untuk wilayah "${input.region.trim()}". Sektor yang sama boleh dipakai lagi, asal wilayahnya berbeda.`;
  }

  return errors;
}

const deploymentsRoute = new Hono<Env>();

/** Daftar untuk panel admin — termasuk draft. Situs publik tidak pernah
 *  memanggil endpoint ini; ia membaca `content.json`. */
deploymentsRoute.get("/", async (c) => {
  return c.json({ deployments: await listDeployments({ includeDrafts: true }) });
});

deploymentsRoute.post("/", async (c) => {
  const input = parseDeploymentInput(await c.req.json().catch(() => ({})));

  const errors = await periksa(input);
  if (Object.keys(errors).length) return c.json({ errors }, 422);

  const deployment = await createDeployment(input);
  await record({
    actor: c.get("actor"),
    entity: "deployment",
    entityId: deployment.id,
    action: "create",
    snapshot: deployment,
  });
  return c.json({ deployment }, 201);
});

/**
 * Ditaruh SEBELUM `/:id` dengan sengaja.
 *
 * Hono mencocokkan route sesuai urutan pendaftaran; kalau `POST /:id` pernah
 * ditambahkan di atas ini, "urutkan" akan tertangkap sebagai sebuah id.
 */
deploymentsRoute.post("/urutkan", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((x): x is string => typeof x === "string")
    : [];

  const deployments = await reorderDeployments(ids);
  if (!deployments) {
    return c.json(
      {
        error:
          "Urutan yang dikirim tidak cocok dengan daftar deployment yang ada. Muat ulang halaman lalu coba lagi.",
      },
      422,
    );
  }

  await record({
    actor: c.get("actor"),
    entity: "deployment",
    action: "update",
    snapshot: { urutan: deployments.map((d) => `${d.sector} · ${d.region}`) },
  });
  return c.json({ deployments });
});

deploymentsRoute.get("/:id", async (c) => {
  const deployment = await getDeploymentById(c.req.param("id"));
  if (!deployment) return c.json({ error: "Deployment tidak ditemukan." }, 404);
  return c.json({ deployment });
});

/** PUT, bukan PATCH: body-nya SELURUH kartu, dan apa pun yang tidak ikut
 *  dikirim akan hilang. Cocok dengan form admin, yang memang selalu mengirim
 *  seluruh isian. */
deploymentsRoute.put("/:id", async (c) => {
  const id = c.req.param("id");
  const input = parseDeploymentInput(await c.req.json().catch(() => ({})));

  const errors = await periksa(input, id);
  if (Object.keys(errors).length) return c.json({ errors }, 422);

  const deployment = await updateDeployment(id, input);
  if (!deployment) return c.json({ error: "Deployment tidak ditemukan." }, 404);

  await record({
    actor: c.get("actor"),
    entity: "deployment",
    entityId: id,
    action: "update",
    snapshot: deployment,
  });
  return c.json({ deployment });
});

deploymentsRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const deployment = await softDeleteDeployment(id);
  if (!deployment) return c.json({ error: "Deployment tidak ditemukan." }, 404);

  await record({
    actor: c.get("actor"),
    entity: "deployment",
    entityId: id,
    action: "delete",
    /* Isi lengkap disimpan justru DI SINI: kalau hapusnya keliru, catatan ini
       yang membuat isinya bisa disusun kembali tanpa membongkar backup. */
    snapshot: deployment,
  });
  /* Yang dilaporkan sektor DAN wilayah: "Logistics" saja tidak cukup untuk
     memberitahu kartu mana yang barusan hilang kalau ada dua. */
  return c.json({ ok: true, deleted: `${deployment.sector} · ${deployment.region}` });
});

export default deploymentsRoute;
