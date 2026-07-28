"use client";

import { forwardRef, useMemo } from "react";
import { Effect } from "postprocessing";
import { Uniform, Vector2 } from "three";

/**
 * Efek pasca-proses gaya PS1 / retro — memberi IDENTITAS visual (bukan sekadar
 * "3D biasa"), sejalan dengan estetika basement.studio (roadmap §3).
 *
 * Ini custom Effect dari `postprocessing`, jadi menyatu di EffectComposer yang
 * sama dengan Bloom & Vignette (satu render pass tambahan, bukan composer baru).
 *
 * Urutannya HARUS setelah Bloom: pixelation & scanline diterapkan ke gambar
 * final yang sudah berpendar, sehingga glow LED/bohlam ikut ter-pixelate dan
 * terlihat menyatu — bukan glow halus di atas gambar kasar.
 *
 * Komponen:
 * - Pixelation : snap UV ke grid → resolusi rendah ala konsol lama.
 * - Color quantize : kurangi tingkat warna → banding khas 16-bit.
 * - Scanline : garis gelap horizontal periodik (CRT).
 * - Grain : noise halus bergerak supaya frame diam tidak "mati".
 *
 * Semua parameter bisa di-tune. Nilai default = retro terlihat jelas tapi
 * objek masih terbaca.
 */

const fragment = /* glsl */ `
  uniform vec2 uResolution;   // ukuran render target (px)
  uniform float uPixelSize;   // besar 1 "pixel PS1" (px layar)
  uniform float uColorLevels; // jumlah tingkat warna per channel
  uniform float uScanline;    // kekuatan scanline 0..1
  uniform float uGrain;       // kekuatan grain 0..1
  uniform float uTime;

  // hash noise sederhana
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void mainUv(inout vec2 uv) {
    // Pixelation: snap uv ke grid selebar uPixelSize piksel layar.
    vec2 gridPx = uResolution / uPixelSize;
    uv = floor(uv * gridPx) / gridPx;
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 color = inputColor.rgb;

    // Quantize warna → banding retro.
    color = floor(color * uColorLevels) / uColorLevels;

    // Scanline: modulasi gelap tiap 2 baris piksel PS1.
    float line = sin(uv.y * uResolution.y / uPixelSize * 3.14159);
    color *= 1.0 - uScanline * (0.5 - 0.5 * line);

    // Grain: noise bergerak, halus.
    float g = hash(uv * uResolution + uTime * 60.0) - 0.5;
    color += g * uGrain;

    outputColor = vec4(color, inputColor.a);
  }
`;

interface PS1EffectOptions {
  pixelSize?: number;
  colorLevels?: number;
  scanline?: number;
  grain?: number;
}

class PS1EffectImpl extends Effect {
  constructor({
    pixelSize = 3.0,
    colorLevels = 32.0,
    scanline = 0.18,
    grain = 0.06,
  }: PS1EffectOptions = {}) {
    super("PS1Effect", fragment, {
      uniforms: new Map<string, Uniform<number | Vector2>>([
        ["uResolution", new Uniform(new Vector2(1, 1))],
        ["uPixelSize", new Uniform(pixelSize)],
        ["uColorLevels", new Uniform(colorLevels)],
        ["uScanline", new Uniform(scanline)],
        ["uGrain", new Uniform(grain)],
        ["uTime", new Uniform(0)],
      ]),
    });
  }

  // Dipanggil composer saat viewport berubah ukuran.
  setSize(width: number, height: number) {
    const res = this.uniforms.get("uResolution")!.value as Vector2;
    res.set(width, height);
  }

  // Dipanggil composer tiap frame — majukan waktu untuk grain.
  update(_renderer: unknown, _inputBuffer: unknown, deltaTime: number) {
    const t = this.uniforms.get("uTime")! as Uniform<number>;
    t.value += deltaTime;
  }
}

export const PS1Effect = forwardRef<PS1EffectImpl, PS1EffectOptions>(
  function PS1Effect({ pixelSize, colorLevels, scanline, grain }, ref) {
    // Deps primitif (bukan objek props) supaya effect tidak dibangun ulang
    // tiap render — recreate = kompilasi shader ulang tiap frame.
    const effect = useMemo(
      () => new PS1EffectImpl({ pixelSize, colorLevels, scanline, grain }),
      [pixelSize, colorLevels, scanline, grain],
    );
    return <primitive ref={ref} object={effect} dispose={null} />;
  },
);
