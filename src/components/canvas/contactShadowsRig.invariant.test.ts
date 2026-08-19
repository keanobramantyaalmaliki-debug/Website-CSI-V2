/**
 * PENJAGA INVARIANT — bake bayangan kontak: sekali per masuk ruangan, dan
 * pass depth-nya tidak memotret objek yang bukan perabot.
 *
 * ── Latar (bug 19 Agu 2026: "bayangan billiard berubah-ubah bentuk") ────────
 * Sumber drei (ContactShadows.js:72) menyimpan penghitung bake sebagai
 * `let count = 0` di BADAN RENDER — bukan ref — jadi TIAP re-render komponen
 * me-reset hitungan dan bake `frames` frame diulang di momen acak. Re-render
 * Scene menurun ke sana lewat banyak jalur (flip heroInView tiap scroll,
 * langkah AdaptiveDpr, toggle billiard), sehingga bayangan terpanggang ulang
 * DI LUAR tirai transisi dan bentuknya berubah-ubah antar kunjungan.
 *
 * Dua pemeriksaan teks di bawah menjaga dua bagian perbaikannya. Sama seperti
 * frameloop.invariant.test.ts: ini pemeriksaan keberadaan, bukan kebenaran
 * logika — yang dijaga adalah kegagalan "hilang total saat merge/refactor",
 * jenis yang sudah berulang kali lolos di repo ini.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CANVAS_DIR = dirname(fileURLToPath(import.meta.url));

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

const read = (f: string) =>
  stripComments(readFileSync(join(CANVAS_DIR, f), "utf8"));

describe("bake bayangan kontak (ContactShadowsRig)", () => {
  it("elemen <ContactShadows> dibangun di dalam useMemo", () => {
    const rig = read("ContactShadowsRig.tsx");
    const memoized = /useMemo\(\(\) => \{[\s\S]*?<ContactShadows/.test(rig);
    expect(
      memoized,
      `ContactShadowsRig.tsx tidak lagi membangun <ContactShadows> di dalam ` +
        `useMemo. Ini memikul beban, bukan gaya: drei menyimpan penghitung ` +
        `bake-nya sebagai \`let count\` di badan render, jadi TIAP re-render ` +
        `komponen itu mengulang bake 4 frame di momen acak — dan re-render ` +
        `Scene (flip heroInView, langkah AdaptiveDpr, toggle billiard) ` +
        `menurun sampai sana. Gejalanya: bayangan berubah-ubah bentuk tiap ` +
        `navigasi (bug 19 Agu). Identitas elemen yang stabil membuat React ` +
        `bail-out dan penghitungnya selamat.\n`,
    ).toBe(true);
  });

  it("kontrak NO_BAKE_LAYER tersambung di ketiga sisinya", () => {
    const missing = [
      // Definisi + alasan hidup di ContactShadowsRig.
      { file: "ContactShadowsRig.tsx", needle: "NO_BAKE_LAYER = " },
      // Dust keluar dari pass bake: posisi basisnya salah tempat dan
      // gl_PointSize-nya undefined per driver di MeshDepthMaterial.
      { file: "Dust.tsx", needle: "layers.set(NO_BAKE_LAYER)" },
      // Kamera utama wajib tetap MELIHAT layer itu — tanpa ini debunya
      // hilang dari mata, bukan cuma dari bake.
      { file: "Scene.tsx", needle: "camera.layers.enable(NO_BAKE_LAYER)" },
    ].filter(({ file, needle }) => !read(file).includes(needle));
    expect(
      missing.map((m) => `${m.file}: ${m.needle}`),
      `Kontrak NO_BAKE_LAYER putus. Tiga bagiannya saling bergantung: layer ` +
        `didefinisikan di ContactShadowsRig, Dust memindahkan dirinya ke ` +
        `sana (supaya pass depth bake tidak memotret titik-titik di posisi ` +
        `basis dengan ukuran undefined), dan kamera utama meng-enable-nya ` +
        `(supaya debu tetap terlihat mata). Hilang satu = debu lenyap ` +
        `diam-diam ATAU selubung gelap misterius kembali ke bidang bayangan.\n`,
    ).toEqual([]);
  });
});
