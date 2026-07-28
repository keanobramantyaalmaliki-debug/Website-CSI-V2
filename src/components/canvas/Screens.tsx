"use client";

import { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { CanvasTexture, LinearFilter, Mesh, MeshBasicMaterial, SRGBColorSpace } from "three";

// GLB yang sama dengan Office — useGLTF nge-cache, jadi TIDAK memuat ulang file.
const MODEL_URL = "/export-test/office-mvp1-baked.glb";

/**
 * Menyalakan mesh layar di scene dengan konten BERANIMASI.
 *
 * ⚠️ Nama mesh diambil LANGSUNG dari GLB (diverifikasi lewat parse glTF), BUKAN
 * dari daftar di CLAUDE.md yang ternyata sudah bergeser. Nama benar:
 *   - MG_MeetingWest_MR_TVScreen   TV 98" meeting
 *   - MG_Function_M_SM_TV_Screen   TV function hall
 *   - MG_Office_iMac_Screen        iMac office
 *   - MG_Office_OMon_Screen        monitor office
 *   - (Pantry punya kembaran iMac/OMon — ikut dinyalakan bila cocok pola)
 *
 * Konten digambar ke <canvas> 2D lalu dijadikan CanvasTexture. Kenapa canvas,
 * bukan RenderTexture drei: untuk placeholder ini jauh lebih ringan (satu
 * texture upload per frame, tanpa scene/kamera terpisah) dan tetap di dalam
 * pipeline WebGL → ikut kena Bloom + PS1. Nanti kalau butuh konten React/3D
 * beneran, tinggal ganti material.map dengan RenderTexture/VideoTexture.
 *
 * MeshBasicMaterial + toneMapped=false: layar bercahaya sendiri (tidak
 * bergantung lightmap yang di-set 0), dan warnanya tidak diredam ACES —
 * konsisten dengan pola material emissive di Office.tsx (FIX 2).
 */

type ScreenKind = "tv" | "ui";

interface ScreenSpec {
  kind: ScreenKind;
  mirrorX?: boolean;
  mirrorY?: boolean;
  rotate?: 0 | 90 | 180 | 270; // rotasi UV mesh (derajat)
}

// ⚠️ Tiap mesh TV punya orientasi UV yang BERBEDA — jadi koreksi harus
// per-mesh. Diverifikasi live (leva) dari layar nyata:
//   - Meeting  (MR_TVScreen)  : UV ter-rotate → rotate 90° + mirrorX
//   - Function (SM_TV_Screen) : UV kebalik atas-bawah → mirrorY
// iMac/monitor UV-nya benar → tanpa koreksi.
const SCREEN_MATCHERS: { test: (n: string) => boolean; spec: ScreenSpec }[] = [
  { test: (n) => /MR_TVScreen/i.test(n), spec: { kind: "tv", rotate: 90, mirrorX: true } },
  { test: (n) => /SM_TV_Screen/i.test(n), spec: { kind: "tv", mirrorY: true } },
  { test: (n) => /iMac_Screen|OMon_Screen/i.test(n), spec: { kind: "ui" } },
];

function specFor(name: string): ScreenSpec | null {
  for (const m of SCREEN_MATCHERS) if (m.test(name)) return m.spec;
  return null;
}

interface ScreenSlot {
  ctx: CanvasingContext;
  texture: CanvasTexture;
  kind: ScreenKind;
  // Dimensi LOGIS tempat konten digambar (selalu landscape). Untuk rotate
  // 90/270 canvas fisiknya swapped (lh × lw) supaya hasil rotasi tidak
  // ke-zoom / overflow.
  lw: number;
  lh: number;
  mirrorX: boolean;
  mirrorY: boolean;
  rotate: number;
}
type CanvasingContext = CanvasRenderingContext2D;

/** Buat canvas + context + texture berukuran fisik (px) tertentu. */
function makeCanvasTexture(pw: number, ph: number): { ctx: CanvasingContext; texture: CanvasTexture } {
  const c = document.createElement("canvas");
  c.width = pw;
  c.height = ph;
  const ctx = c.getContext("2d")!;
  const texture = new CanvasTexture(c);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.flipY = true;
  return { ctx, texture };
}

/** TV showreel — gelombang gradient cerah bergerak (catch bloom). */
function drawTV(ctx: CanvasingContext, t: number, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  const a = 0.5 + 0.5 * Math.sin(t * 0.6);
  g.addColorStop(0, `hsl(${210 + a * 30}, 80%, 55%)`);
  g.addColorStop(0.5, `hsl(${260 + a * 40}, 75%, 45%)`);
  g.addColorStop(1, `hsl(${190 + a * 20}, 85%, 40%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // garis-garis gelombang halus
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    const off = t * (40 + i * 18) + i * 90;
    for (let x = 0; x <= w; x += 12) {
      const y = h / 2 + Math.sin((x + off) * 0.012 + i) * (h * 0.18);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(255,255,255,${0.12 + i * 0.05})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";

  // wordmark — auto-shrink supaya selalu muat penuh (maks 60% lebar layar).
  const label = "cogniti.id";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let fontPx = Math.round(h * 0.11);
  ctx.font = `600 ${fontPx}px sans-serif`;
  const maxW = w * 0.6;
  while (ctx.measureText(label).width > maxW && fontPx > 8) {
    fontPx -= 1;
    ctx.font = `600 ${fontPx}px sans-serif`;
  }
  ctx.fillText(label, w / 2, h / 2);
}

/** iMac/monitor — dashboard UI gelap dengan chart bar beranimasi. */
function drawUI(ctx: CanvasingContext, t: number, w: number, h: number) {
  ctx.fillStyle = "#0d1420";
  ctx.fillRect(0, 0, w, h);

  // top bar
  ctx.fillStyle = "#f97316"; // orange brand
  ctx.fillRect(0, 0, w, h * 0.06);
  ctx.fillStyle = "#e5e7eb";
  ctx.font = `bold ${Math.round(h * 0.04)}px monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("● cogniti / ops", w * 0.03, h * 0.03);

  // animated bar chart
  const bars = 8;
  const bw = (w * 0.9) / bars;
  for (let i = 0; i < bars; i++) {
    const v = 0.3 + 0.6 * Math.abs(Math.sin(t * 0.8 + i * 0.7));
    const bh = v * h * 0.5;
    ctx.fillStyle = i % 2 ? "#38bdf8" : "#f97316";
    ctx.fillRect(w * 0.05 + i * bw + 4, h * 0.85 - bh, bw - 8, bh);
  }

  // moving line graph
  ctx.strokeStyle = "#4ade80";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 10) {
    const y = h * 0.35 + Math.sin((x + t * 60) * 0.02) * h * 0.08;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

export default function Screens() {
  const { scene } = useGLTF(MODEL_URL);
  const slots = useRef<ScreenSlot[]>([]);

  // Cari mesh layar, buat canvas+texture, pasang material — dilakukan di effect
  // (bukan saat render) supaya tidak melanggar aturan React soal mutasi nilai
  // hook / akses ref saat render. Cleanup membuang texture saat unmount.
  useEffect(() => {
    const found: ScreenSlot[] = [];
    scene.traverse((obj: THREE.Object3D) => {
      if (!(obj instanceof Mesh)) return;
      const spec = specFor(obj.name);
      if (!spec) return;

      const { kind } = spec;
      const rotate = spec.rotate ?? 0;
      // Dimensi logis (landscape) tempat konten digambar.
      const lw = kind === "tv" ? 512 : 384;
      const lh = kind === "tv" ? 288 : 256;
      // Canvas fisik: swapped saat rotate 90/270 supaya konten pas tanpa zoom.
      const swap = rotate === 90 || rotate === 270;
      const { ctx, texture } = makeCanvasTexture(swap ? lh : lw, swap ? lw : lh);
      const mat = new MeshBasicMaterial({ map: texture, toneMapped: false });
      obj.material = mat;
      found.push({
        ctx,
        texture,
        kind,
        lw,
        lh,
        mirrorX: spec.mirrorX ?? false,
        mirrorY: spec.mirrorY ?? false,
        rotate,
      });
    });
    slots.current = found;

    if (process.env.NODE_ENV === "development") {
      console.log(`[screens] layar beranimasi: ${found.length} (tv+ui)`);
    }

    return () => {
      for (const s of found) s.texture.dispose();
      slots.current = [];
    };
  }, [scene]);

  // Gambar ulang tiap frame. Canvas 2D murah; ~4-6 layar kecil = sepele.
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (const s of slots.current) {
      const { ctx, lw, lh } = s;

      ctx.save();
      // Pusatkan di tengah canvas FISIK, terapkan rotate → mirror, lalu gambar
      // konten LOGIS (lw×lh) dari titik tengahnya. Karena canvas fisik sudah
      // di-swap untuk 90/270, hasil rotasi pas tanpa zoom.
      ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
      if (s.rotate) ctx.rotate((s.rotate * Math.PI) / 180);
      if (s.mirrorX || s.mirrorY) ctx.scale(s.mirrorX ? -1 : 1, s.mirrorY ? -1 : 1);
      ctx.translate(-lw / 2, -lh / 2);

      if (s.kind === "tv") drawTV(ctx, t, lw, lh);
      else drawUI(ctx, t, lw, lh);
      ctx.restore();
      s.texture.needsUpdate = true;
    }
  });

  return null;
}
