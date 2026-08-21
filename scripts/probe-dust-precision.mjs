/**
 * Bukti empiris bug presisi float32 pada debu (Dust.tsx) — dan bukti fix-nya.
 *
 *   node scripts/probe-dust-precision.mjs [t0-detik] [jumlah-frame] [jeda-ms]
 *
 * Cara kerja: buka halaman dengan `?dustT0=<t0>` (pra-penuaan uTime, DEV
 * saja), ambil rentetan screenshot, lalu ukur PERUBAHAN antar-frame di 30%
 * atas layar — pita udara berisi debu, di atas karakter/LED strip/layar yang
 * ikut beranimasi sendiri. Metriknya YMAX dari `blend=difference` ffmpeg:
 * satu saja bintik yang berpindah menghasilkan piksel terang di citra diff.
 *
 * Pembacaan:
 *   - Debu sehat  → SEMUA pasangan frame punya YMAX tinggi (bintik bergeser
 *     tiap frame; pada jeda 150 ms geserannya ~5 px).
 *   - Bug presisi → YMAX ≈ 0 di hampir semua pasangan: pada t0 = 2^23 detik,
 *     ulp float32 = 1,0 detik, jadi uniform waktunya hanya berubah nilai
 *     ~sekali per detik — debu beku lalu melompat.
 *
 * Kenapa t0 ekstrem (2^23 ≈ 97 hari) dipakai sebagai alat ukur padahal
 * keluhannya "berjam-jam": degradasinya kontinu (ulp naik 2× tiap kelipatan
 * dua), cuma "patah tapi masih bergerak tiap 150 ms" tidak bisa dibedakan
 * dari sehat oleh diff screenshot berjeda 150 ms. Titik ekstrem membuktikan
 * MEKANISMENYA; ambang "mulai terlihat" dihitung di komentar TIME_WRAP.
 */
import { spawn, execFileSync } from "node:child_process";
import { get as httpGet } from "node:http";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME =
  process.env.CSI_BROWSER ??
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const PORT = 9226;
const T0 = Number(process.argv[2] ?? 0);
const FRAMES = Number(process.argv[3] ?? 14);
const GAP_MS = Number(process.argv[4] ?? 150);
const URL = `http://localhost:3000/?dustT0=${T0}`;

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=metal",
    "--enable-gpu",
    "--no-first-run",
    "--user-data-dir=/tmp/csi-dust-probe-profile",
    "--window-size=1440,900",
    "--force-device-scale-factor=2",
    URL,
  ],
  { stdio: "ignore" },
);

const json = (path) =>
  new Promise((res, rej) => {
    httpGet({ host: "127.0.0.1", port: PORT, path }, (r) => {
      let d = "";
      r.on("data", (c) => (d += c));
      r.on("end", () => res(JSON.parse(d)));
    }).on("error", rej);
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  let target;
  for (let i = 0; i < 60; i++) {
    try {
      const list = await json("/json/list");
      target = list.find((t) => t.type === "page");
      if (target) break;
    } catch {
      /* belum siap */
    }
    await sleep(500);
  }
  if (!target) throw new Error("halaman tidak muncul");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m.result);
      pending.delete(m.id);
    }
  });
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  const send = (method, params = {}) =>
    new Promise((res) => {
      const i = ++id;
      pending.set(i, res);
      ws.send(JSON.stringify({ id: i, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");
  // GLB + kompilasi shader + sapuan reveal + loader memudar (angka shoot.mjs).
  await sleep(12000);

  const dir = mkdtempSync(join(tmpdir(), "dust-probe-"));
  const shots = [];
  const times = [];
  for (let i = 0; i < FRAMES; i++) {
    // uTime saat ini (jendela intip DEV di Dust.tsx) — dipakai untuk tahu di
    // pasangan mana lipatan TIME_WRAP terjadi, supaya sambungannya bisa
    // dinilai: pasangan penyilang wrap harus punya YAVG sekelas tetangganya.
    const t = await send("Runtime.evaluate", {
      expression: "window.__dustTime ?? -1",
      returnByValue: true,
    });
    times.push(t?.result?.value ?? -1);
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    const p = join(dir, `f${String(i).padStart(2, "0")}.png`);
    writeFileSync(p, Buffer.from(data, "base64"));
    shots.push(p);
    await sleep(GAP_MS);
  }
  ws.close();
  chrome.kill();

  // Diff tiap pasangan berurutan, crop 30% atas (udara, bebas karakter/LED).
  let moved = 0;
  const rows = [];
  for (let i = 1; i < shots.length; i++) {
    const out = execFileSync(
      "ffmpeg",
      [
        "-i", shots[i - 1], "-i", shots[i],
        "-filter_complex",
        "[0][1]blend=all_mode=difference,crop=iw:ih*0.3:0:0,signalstats,metadata=print:file=-",
        "-f", "null", "-",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    const ymax = Number(/YMAX=(\d+(?:\.\d+)?)/.exec(out)?.[1] ?? NaN);
    const yavg = Number(/YAVG=(\d+(?:\.\d+)?)/.exec(out)?.[1] ?? NaN);
    // Ambang 24/255: bintik yang berpindah menyumbang ~40+; derau nol karena
    // PNG lossless & scene diam — praktis hanya debu yang ada di pita ini.
    if (ymax >= 24) moved++;
    const wrapped = times[i] >= 0 && times[i] < times[i - 1];
    rows.push(
      `  pasangan ${i}: YMAX=${ymax}  YAVG=${yavg.toFixed(4)}  uTime ${times[
        i - 1
      ]?.toFixed(2)}→${times[i]?.toFixed(2)}${wrapped ? "  ← WRAP" : ""}`,
    );
  }
  console.log(`t0=${T0}s  (${FRAMES} frame, jeda ${GAP_MS} ms)  dir=${dir}`);
  console.log(rows.join("\n"));
  console.log(
    `bergerak: ${moved}/${shots.length - 1} pasangan  →  ${
      moved >= shots.length - 3 ? "MULUS" : moved <= 2 ? "BEKU/PATAH" : "SEBAGIAN"
    }`,
  );
}

main()
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => chrome.kill());
