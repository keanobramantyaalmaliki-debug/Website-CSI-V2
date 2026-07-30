"use client";

import { useRef, useState } from "react";
import { useMatterGallery } from "./matter/useMatterGallery";
import { SCENES, sceneById } from "./matter/registry";

/**
 * MatterGallery — galeri 10 scene fisika Matter.js dengan dropdown pemilih.
 * Route dev-only (matterjs-lab.html). Kanvas penuh viewport; header memuat
 * <select> scene + petunjuk interaksi. Semua logika engine ada di useMatterGallery.
 */
export default function MatterGallery() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sceneId, setSceneId] = useState(SCENES[0].id);
  useMatterGallery(canvasRef, sceneId);
  const active = sceneById(sceneId);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0a0c", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />

      <header style={headerStyle}>
        <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#f97316" }}>
          Matter.js Gallery
        </div>

        <select
          value={sceneId}
          onChange={(e) => setSceneId(e.target.value)}
          style={selectStyle}
          aria-label="Pilih scene fisika"
        >
          {SCENES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>

        <div style={{ fontSize: 12, color: "#9ca3af", maxWidth: 280 }}>{active.hint}</div>
      </header>
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  position: "absolute",
  top: 20,
  left: 24,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  fontFamily: "ui-monospace, monospace",
};

const selectStyle: React.CSSProperties = {
  appearance: "none",
  padding: "8px 12px",
  minWidth: 200,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(18,18,22,0.9)",
  color: "#e5e7eb",
  fontFamily: "inherit",
  fontSize: 13,
  cursor: "pointer",
};
