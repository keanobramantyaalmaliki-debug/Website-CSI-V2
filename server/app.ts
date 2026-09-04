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
import footerRoute from "./routes/footer";
import workProjectsRoute from "./routes/workProjects";
import servicesRoute from "./routes/services";
import industriesRoute from "./routes/industries";
import deploymentsRoute from "./routes/deployments";
import processStepsRoute from "./routes/processSteps";
import caseStudiesRoute from "./routes/caseStudies";
import historyRoute from "./routes/history";
import revertRoute from "./routes/revert";

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
app.use("/api/deployments/*", requireLogin);
app.use("/api/deployments", requireLogin);
app.use("/api/process-steps/*", requireLogin);
app.use("/api/process-steps", requireLogin);
/* Visi tidak punya route anak hari ini (cuma `GET /` dan `PUT /`), tapi
   pasangan `/*`-nya tetap dipasang seperti yang lain: itulah yang membuat
   endpoint berikutnya lahir sudah terjaga, bukan terbuka sampai ada yang
   ingat menambahkannya. */
app.use("/api/vision/*", requireLogin);
app.use("/api/vision", requireLogin);
/* Sama untuk kaki halaman: `GET /` dan `PUT /` saja hari ini, pasangan
   `/*`-nya dipasang untuk endpoint berikutnya. */
app.use("/api/footer/*", requireLogin);
app.use("/api/footer", requireLogin);
/* Riwayat cuma bisa dibaca, tapi tetap digerbangi: isinya justru catatan
   siapa mengubah apa, dan itu bukan sesuatu yang boleh dibaca tamu. */
app.use("/api/riwayat/*", requireLogin);
app.use("/api/riwayat", requireLogin);
app.use("/api/images/*", requireLogin);
app.use("/api/images", requireLogin);
app.use("/api/publish/*", requireLogin);
app.use("/api/publish", requireLogin);
/* Digerbangi sama seperti route konten yang lain, bukan seperti riwayat:
   pembatalan MENULIS ke tabel konten. */
app.use("/api/batal/*", requireLogin);
app.use("/api/batal", requireLogin);

app.route("/api/jobs", jobsRoute);
app.route("/api/values", valuesRoute);
app.route("/api/crew", crewRoute);
app.route("/api/projects", workProjectsRoute);
app.route("/api/case-studies", caseStudiesRoute);
app.route("/api/services", servicesRoute);
app.route("/api/testimonials", testimonialsRoute);
app.route("/api/industries", industriesRoute);
app.route("/api/deployments", deploymentsRoute);
app.route("/api/process-steps", processStepsRoute);
app.route("/api/vision", visionRoute);
app.route("/api/footer", footerRoute);
app.route("/api/riwayat", historyRoute);
app.route("/api/images", imagesRoute);
app.route("/api/publish", publishRoute);
app.route("/api/batal", revertRoute);

/**
 * Gambar unggahan.
 *
 * TANPA `requireLogin`: berkas ini dirujuk `<img src>` di situs publik, dan
 * pengunjung tentu tidak punya sesi. Yang dijaga adalah siapa yang boleh
 * MENGUNGGAH, bukan siapa yang boleh melihat.
 */
app.use("/uploads/*", serveStatic({ root: "./" }));

app.notFound((c) => c.json({ error: "Alamat tidak dikenal." }, 404));
