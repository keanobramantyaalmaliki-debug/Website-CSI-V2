"use client";

import { useRef, useState } from "react";
import { useControls, button } from "leva";
import { useMatterLab } from "@/lib/hooks/useMatterLab";
import type { MatterLabControls } from "@/lib/lab/types";
import { DEMOS, DEFAULT_DEMO_ID } from "@/lib/lab/demos";

/** Jumlah body per klik tombol "Spawn burst". */
const BURST_COUNT = 24;

/**
 * Halaman uji coba fisika Matter.js (route /matterjs-lab).
 * Dropdown memilih skenario (Stack, Ball Pool, Newton's Cradle, dst); panel leva
 * mengatur gravitasi/kelentingan/gesekan + tombol reset & hambur body. Semua
 * logika engine ada di useMatterLab; komponen ini hanya merangkai kontrol.
 */
export default function MatterLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<MatterLabControls | null>(null);
  const [demoId, setDemoId] = useState(DEFAULT_DEMO_ID);

  // State agar perubahan slider memicu re-render → params baru mengalir ke hook.
  const [params, setParams] = useState({ gravity: 1, restitution: 0.6, friction: 0.1 });

  useControls(() => ({
    gravity: { value: 1, min: 0, max: 2, step: 0.05, onChange: (v: number) => setParams((p) => ({ ...p, gravity: v })) },
    restitution: { value: 0.6, min: 0, max: 1, step: 0.05, onChange: (v: number) => setParams((p) => ({ ...p, restitution: v })) },
    friction: { value: 0.1, min: 0, max: 1, step: 0.05, onChange: (v: number) => setParams((p) => ({ ...p, friction: v })) },
    "Spawn burst": button(() => controlsRef.current?.spawnBurst(BURST_COUNT)),
    Reset: button(() => controlsRef.current?.reset()),
  }));

  useMatterLab(canvasRef, params, demoId, controlsRef);

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--background)", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />

      <header
        style={{
          position: "absolute",
          top: 20,
          left: 24,
          fontFamily: "var(--font-mono, monospace)",
          color: "var(--text-secondary, #c3c7cf)",
        }}
      >
        <div style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent, #f97316)" }}>
          Matter.js Lab
        </div>
        <div style={{ fontSize: 13, margin: "6px 0 12px" }}>drag to throw · click empty space to spawn</div>

        <label style={{ display: "block", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted, #9aa0ab)", marginBottom: 4 }}>
          Demo
        </label>
        <select
          value={demoId}
          onChange={(e) => setDemoId(e.target.value)}
          style={{
            appearance: "none",
            background: "var(--surface-2, #1f232a)",
            color: "var(--text-primary, #f4f5f7)",
            border: "1px solid var(--line-2, rgba(255,255,255,0.12))",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 13,
            fontFamily: "inherit",
            minWidth: 200,
            cursor: "pointer",
          }}
        >
          {DEMOS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </header>
    </div>
  );
}
