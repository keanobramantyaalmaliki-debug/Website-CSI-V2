"use client";

import { useEffect, useRef, useState } from "react";
import {
  MIN_COUNT,
  MAX_COUNT,
  MIN_GRAVITY,
  MAX_GRAVITY,
  type EngineKind,
  type FieldParams,
} from "./shared/fieldConfig";

/**
 * ControlPanel — overlay HUD untuk lab: ganti engine, atur gravitasi & jumlah
 * objek, lihat FPS, reset. Murni DOM (di luar Canvas) supaya tak ikut re-render
 * per frame WebGL.
 */
export interface ControlPanelProps {
  params: FieldParams;
  engine: EngineKind;
  paused: boolean;
  onChange: (patch: Partial<FieldParams>) => void;
  onEngine: (e: EngineKind) => void;
  onReset: () => void;
}

/** FPS rata-rata bergerak, diukur dari rAF sendiri (independen dari scene). */
function useFps(): number {
  const [fps, setFps] = useState(0);
  const frames = useRef(0);
  const last = useRef(performance.now());
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      frames.current++;
      const now = performance.now();
      const elapsed = now - last.current;
      if (elapsed >= 500) {
        setFps(Math.round((frames.current * 1000) / elapsed));
        frames.current = 0;
        last.current = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return fps;
}

const panel: React.CSSProperties = {
  position: "fixed",
  top: 16,
  left: 16,
  width: 240,
  padding: 16,
  borderRadius: 12,
  background: "rgba(18,18,22,0.82)",
  backdropFilter: "blur(8px)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#e5e7eb",
  fontFamily: "ui-monospace, monospace",
  fontSize: 12,
  lineHeight: 1.5,
  zIndex: 10,
};

const row: React.CSSProperties = { marginBottom: 12 };
const labelRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 4,
};

export default function ControlPanel({
  params,
  engine,
  paused,
  onChange,
  onEngine,
  onReset,
}: ControlPanelProps) {
  const fps = useFps();

  return (
    <div style={panel} aria-label="Physics lab controls">
      <div style={{ ...labelRow, fontSize: 13, fontWeight: 600 }}>
        <span>Physics Lab</span>
        <span style={{ color: paused ? "#f97316" : "#4ade80" }}>
          {paused ? "paused" : `${fps} fps`}
        </span>
      </div>

      <div style={row}>
        <div style={labelRow}>
          <span>Engine</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={() => onEngine("cannon")}
            style={engineBtn(engine === "cannon")}
          >
            cannon-es
          </button>
          <button
            type="button"
            disabled
            title="Pasang @react-three/rapier untuk mengaktifkan"
            style={{ ...engineBtn(false), opacity: 0.4, cursor: "not-allowed" }}
          >
            rapier
          </button>
        </div>
      </div>

      <div style={row}>
        <div style={labelRow}>
          <span>Objek</span>
          <span>{params.count}</span>
        </div>
        <input
          type="range"
          min={MIN_COUNT}
          max={MAX_COUNT}
          step={1}
          value={params.count}
          onChange={(e) => onChange({ count: Number(e.target.value) })}
          style={{ width: "100%" }}
        />
      </div>

      <div style={row}>
        <div style={labelRow}>
          <span>Gravitasi</span>
          <span>{params.gravityY.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={MIN_GRAVITY}
          max={MAX_GRAVITY}
          step={0.5}
          value={params.gravityY}
          onChange={(e) => onChange({ gravityY: Number(e.target.value) })}
          style={{ width: "100%" }}
        />
      </div>

      <button type="button" onClick={onReset} style={resetBtn}>
        Reset / seed baru
      </button>

      <p style={{ marginTop: 10, marginBottom: 0, color: "#9ca3af" }}>
        Gerakkan kursor untuk mendorong objek.
      </p>
    </div>
  );
}

function engineBtn(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: "6px 4px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.12)",
    background: active ? "#f97316" : "rgba(255,255,255,0.05)",
    color: active ? "#0a0a0c" : "#e5e7eb",
    fontFamily: "inherit",
    fontSize: 12,
    cursor: "pointer",
  };
}

const resetBtn: React.CSSProperties = {
  width: "100%",
  padding: "8px 4px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "#e5e7eb",
  fontFamily: "inherit",
  fontSize: 12,
  cursor: "pointer",
};
