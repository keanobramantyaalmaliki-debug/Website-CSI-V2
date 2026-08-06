"use client";

import { motion, useTransform, useReducedMotion, type MotionValue } from "motion/react";

const LABELS = [
  "Citizen",
  "Operations",
  "Knowledge",
  "Infrastructure",
  "Intelligence",
  "Decision",
  "Action",
];

const N = LABELS.length;
const CX = 20;       // spine x in viewBox units
const LABEL_X = 33;  // label text start x
const VB_W = 200;    // viewBox width
const SPACING = 52;  // px between nodes
const PAD = 20;      // top/bottom padding

const VB_H = PAD * 2 + (N - 1) * SPACING;

function ny(i: number) {
  return PAD + i * SPACING;
}

// Timing: node i lights up at [i/(N-1)*0.8, i/(N-1)*0.8+0.08]
// Line i→i+1 draws at  [i/(N-1)*0.8+0.02, (i+1)/(N-1)*0.8+0.02]
// (line starts slightly after its source node begins lighting)

function LineSegment({
  i,
  progress,
}: {
  i: number;
  progress: MotionValue<number>;
}) {
  const reduced = useReducedMotion();
  const y1 = ny(i) + 5;
  const y2 = ny(i + 1) - 5;
  const len = Math.max(y2 - y1, 0);
  const pStart = (i / (N - 1)) * 0.8 + 0.02;
  const pEnd = ((i + 1) / (N - 1)) * 0.8 + 0.02;
  const offset = useTransform(progress, [pStart, Math.min(pEnd, 1)], [len, 0]);

  if (reduced) {
    return (
      <line x1={CX} y1={y1} x2={CX} y2={y2} stroke="#52525b" strokeWidth={1} />
    );
  }
  return (
    <motion.line
      x1={CX}
      y1={y1}
      x2={CX}
      y2={y2}
      stroke="#52525b"
      strokeWidth={1}
      strokeDasharray={len}
      style={{ strokeDashoffset: offset }}
    />
  );
}

function NodeDot({
  i,
  label,
  progress,
}: {
  i: number;
  label: string;
  progress: MotionValue<number>;
}) {
  const reduced = useReducedMotion();
  const y = ny(i);
  const pStart = (i / (N - 1)) * 0.8;
  const pEnd = Math.min(pStart + 0.08, 1);

  const dotFill = useTransform(progress, [pStart, pEnd], ["#3f3f46", "#e4e4e7"]);
  const ringStroke = useTransform(progress, [pStart, pEnd], ["#27272a", "#52525b"]);
  const textFill = useTransform(progress, [pStart, pEnd], ["#3f3f46", "#a1a1aa"]);

  if (reduced) {
    return (
      <g>
        <circle cx={CX} cy={y} r={4} fill="none" stroke="#52525b" strokeWidth={1} />
        <circle cx={CX} cy={y} r={2} fill="#e4e4e7" />
        <text
          x={LABEL_X}
          y={y}
          dominantBaseline="middle"
          fill="#a1a1aa"
          fontSize={11}
          fontWeight={500}
        >
          {label}
        </text>
      </g>
    );
  }

  return (
    <g>
      <motion.circle
        cx={CX}
        cy={y}
        r={4}
        fill="none"
        strokeWidth={1}
        style={{ stroke: ringStroke }}
      />
      <motion.circle cx={CX} cy={y} r={2} style={{ fill: dotFill }} />
      <motion.text
        x={LABEL_X}
        y={y}
        dominantBaseline="middle"
        fontSize={11}
        fontWeight={500}
        style={{ fill: textFill }}
      >
        {label}
      </motion.text>
    </g>
  );
}

/** Scroll-driven SVG flow diagram. Pass the section's scrollYProgress as `progress`. */
export default function FlowDiagram({ progress }: { progress: MotionValue<number> }) {
  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="w-full"
      style={{ fontFamily: "inherit" }}
      aria-hidden="true"
      focusable={false}
      data-testid="flow-diagram"
    >
      {LABELS.slice(0, -1).map((_, i) => (
        <LineSegment key={i} i={i} progress={progress} />
      ))}
      {LABELS.map((label, i) => (
        <NodeDot key={label} i={i} label={label} progress={progress} />
      ))}
    </svg>
  );
}
