"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Points,
} from "three";

/**
 * Debu halus melayang di udara kantor — menambah kedalaman & atmosfer tanpa
 * menyentuh aturan render.
 *
 * Kenapa aman:
 * - Ini Points (partikel), BUKAN lampu. Tidak menambah draw call yang berarti
 *   (satu draw call untuk seluruh partikel) dan tidak menyalakan objek statis.
 * - Warnanya sengaja DIM (di bawah luminanceThreshold Bloom 0.95) supaya jadi
 *   debu, bukan glow. Kalau dibikin terang, Bloom akan menangkapnya jadi bintik
 *   berpendar.
 * - depthWrite=false → tidak merusak urutan transparansi objek lain.
 */

// Volume kira-kira menutupi seluruh kantor (three-space, dari VIEWS di
// CameraController). Kantor membentang ~x[-21..2], z[-9..9], tinggi ~0..3.
const CENTER: [number, number, number] = [-9, 1.4, 0];
const SIZE: [number, number, number] = [26, 3.2, 20];
const COUNT = 380;
const DRIFT = 0.06; // amplitudo goyang (meter)

function makeSprite(): CanvasTexture {
  const s = 32;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new CanvasTexture(c);
}

export default function DustMotes() {
  const ref = useRef<Points>(null);

  const { geometry, sprite, seeds, base } = useMemo(() => {
    const base = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT * 3); // fase acak per sumbu

    // Sebar deterministik (tanpa Math.random — bikin hasil stabil antar
    // reload): hash sinus per index menghasilkan pseudo-random 0..1.
    const hash = (n: number) => {
      const v = Math.sin(n) * 43758.5453;
      return v - Math.floor(v); // fract → 0..1
    };
    for (let i = 0; i < COUNT; i++) {
      base[i * 3] = CENTER[0] + (hash(i * 12.9898) - 0.5) * SIZE[0];
      base[i * 3 + 1] = CENTER[1] + (hash(i * 78.233) - 0.5) * SIZE[1];
      base[i * 3 + 2] = CENTER[2] + (hash(i * 37.719) - 0.5) * SIZE[2];
      seeds[i * 3] = hash(i * 3.1) * Math.PI * 2;
      seeds[i * 3 + 1] = hash(i * 5.7) * Math.PI * 2;
      seeds[i * 3 + 2] = hash(i * 9.2) * Math.PI * 2;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(base.slice(), 3));
    return { geometry, sprite: makeSprite(), seeds, base };
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    const pos = ref.current.geometry.attributes.position as BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      arr[ix] = base[ix] + Math.sin(t * 0.12 + seeds[ix]) * DRIFT;
      arr[ix + 1] = base[ix + 1] + Math.sin(t * 0.08 + seeds[ix + 1]) * DRIFT;
      arr[ix + 2] = base[ix + 2] + Math.cos(t * 0.1 + seeds[ix + 2]) * DRIFT;
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={sprite}
        size={0.05}
        sizeAttenuation
        transparent
        // DIM: di bawah threshold Bloom (0.95) supaya tidak ikut berpendar.
        opacity={0.28}
        color="#9a9aa2"
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
