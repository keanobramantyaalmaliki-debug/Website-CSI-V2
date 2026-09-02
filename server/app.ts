/**
 * Aplikasi API — dirakit di sini, TIDAK dijalankan di sini.
 *
 * `index.ts` yang membuka port. Pemisahan ini yang membuat test bisa memanggil
 * `app.request("/api/jobs")` langsung tanpa menyalakan server sungguhan dan
 * tanpa berebut port dengan proses dev yang sedang jalan.
 */

import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

import type { Actor } from "./audit";
import { attachActor, requireLogin } from "./auth";
import authRoute from "./routes/auth";
import imagesRoute from "./routes/images";
import crewRoute from "./routes/crew";
import jobsRoute from "./routes/jobs";
import publishRoute from "./routes/publish";
import testimonialsRoute from "./routes/testimonials";
import valuesRoute from "./routes/values";
import visionRoute from "./routes/vision";
import workProjectsRoute from "./routes/workProjects";
import servicesRoute from "./routes/services";
import industriesRoute from "./routes/industries";
import caseStudiesRoute from "./routes/caseStudies";

export type Env = { Variables: { actor: Actor } };

export const app = new Hono<Env>();

/* Siapa yang sedang mengirim request — diisi untuk SEMUA route, termasuk yang
   tidak butuh login, supaya audit log tetap tahu pelakunya. */
app.use("*", attachActor);

/**
 * Satu penangkap galat untuk seluruh API.
 *
 * Isi galat aslinya masuk log proses, TIDAK ke respons: pesan Postgres bisa
 * memuat nama tabel dan potongan query, dan itu bukan sesuatu yang perlu
 * dikirim ke browser. Yang dilihat editor cuma kalimat yang bisa dia tindak
 * lanjuti.
 */
app.onError((error, c) => {
  console.error("[api]", c.req.method, c.req.path, error);
  return c.json(
    { error: "Ada yang salah di server. Coba lagi sebentar lagi." },
    500,
  );
});

app.get("/api/health", (c) => c.json({ ok: true }));

app.route("/api/auth", authRoute);

/**
 * Semua yang menyentuh konten wajib login.
 *
 * Digerbangi di SATU tempat, bukan per route: penjaga yang ditempel satu per
 * satu akan terlewat pada endpoint berikutnya yang ditambahkan, dan lubang
 * seperti itu tidak memunculkan error — endpoint-nya justru bekerja dengan
 * baik, untuk siapa saja.
 */
app.use("/api/jobs/*", requireLogin);
app.use("/api/jobs", requireLogin);
app.use("/api/values/*", requireLogin);
app.use("/api/values", requireLogin);
app.use("/api/crew/*", requireLogin);
app.use("/api/crew", requireLogin);
app.use("/api/projects/*", requireLogin);
app.use("/api/projects", requireLogin);
app.use("/api/case-studies/*", requireLogin);
app.use("/api/case-studies", requireLogin);
app.use("/api/services/*", requireLogin);
app.use("/api/services", requireLogin);
app.use("/api/testimonials/*", requireLogin);
app.use("/api/testimonials", requireLogin);
app.use("/api/industries/*", requireLogin);
app.use("/api/industries", requireLogin);
/* Visi tidak punya route anak hari ini (cuma `GET /` dan `PUT /`), tapi
   pasangan `/*`-nya tetap dipasang seperti yang lain: itulah yang membuat
   endpoint berikutnya lahir sudah terjaga, bukan terbuka sampai ada yang
   ingat menambahkannya. */
app.use("/api/vision/*", requireLogin);
app.use("/api/vision", requireLogin);
app.use("/api/images/*", requireLogin);
app.use("/api/images", requireLogin);
app.use("/api/publish/*", requireLogin);
app.use("/api/publish", requireLogin);

app.route("/api/jobs", jobsRoute);
app.route("/api/values", valuesRoute);
app.route("/api/crew", crewRoute);
app.route("/api/projects", workProjectsRoute);
app.route("/api/case-studies", caseStudiesRoute);
app.route("/api/services", servicesRoute);
app.route("/api/testimonials", testimonialsRoute);
app.route("/api/industries", industriesRoute);
app.route("/api/vision", visionRoute);
app.route("/api/images", imagesRoute);
app.route("/api/publish", publishRoute);

/**
 * Gambar unggahan.
 *
 * TANPA `requireLogin`: berkas ini dirujuk `<img src>` di situs publik, dan
 * pengunjung tentu tidak punya sesi. Yang dijaga adalah siapa yang boleh
 * MENGUNGGAH, bukan siapa yang boleh melihat.
 */
app.use("/uploads/*", serveStatic({ root: "./" }));

app.notFound((c) => c.json({ error: "Alamat tidak dikenal." }, 404));
