"use client";

/**
 * Ruangan placeholder (proporsi living room) — dipakai sampai
 * hasil scan Polycam → Blender → .glb siap (Phase A4).
 * Nanti komponen ini tinggal diganti <Room url="/models/living-room.glb" />.
 *
 * Mood mengikuti DNA cogniti: dinding gelap + "kolam cahaya" oranye hangat.
 */

const WALL = "#141414";
const FLOOR = "#1c1c1c";
const ACCENT = "#f97316"; // orange-500

// Ukuran ruangan (meter, real-world scale — sama seperti target scan)
const W = 6; // lebar (x)
const H = 3; // tinggi (y)
const D = 8; // dalam (z)

export default function PlaceholderRoom() {
  return (
    <group>
      {/* ---------- Cahaya ---------- */}
      <ambientLight intensity={0.15} />
      {/* Kolam cahaya hangat di tengah ruangan */}
      <pointLight
        position={[0, H - 0.4, 0]}
        intensity={18}
        color={ACCENT}
        distance={9}
        decay={2}
        castShadow
      />
      {/* Fill dingin tipis dari arah "jendela" */}
      <pointLight position={[-W / 2 + 0.5, 1.8, -2]} intensity={3} color="#7dd3fc" distance={6} />

      {/* ---------- Struktur ruangan ---------- */}
      {/* Lantai */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color={FLOOR} roughness={0.9} />
      </mesh>
      {/* Plafon */}
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color={WALL} roughness={1} />
      </mesh>
      {/* Dinding belakang */}
      <mesh position={[0, H / 2, -D / 2]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color={WALL} roughness={1} />
      </mesh>
      {/* Dinding kiri & kanan */}
      <mesh position={[-W / 2, H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color={WALL} roughness={1} />
      </mesh>
      <mesh position={[W / 2, H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color={WALL} roughness={1} />
      </mesh>

      {/* ---------- Furnitur placeholder ---------- */}
      {/* Sofa */}
      <group position={[-1.8, 0, -2]}>
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[2, 0.5, 0.9]} />
          <meshStandardMaterial color="#27272a" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.7, -0.35]} castShadow>
          <boxGeometry args={[2, 0.7, 0.2]} />
          <meshStandardMaterial color="#27272a" roughness={0.8} />
        </mesh>
      </group>

      {/* Flip table (billiard ↔ pingpong) — bintang living room */}
      <group position={[1, 0, 0.5]}>
        <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 0.15, 1.3]} />
          <meshStandardMaterial color="#14532d" roughness={0.6} />
        </mesh>
        {[-1, 1].map((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[sx * 1.05, 0.375, sz * 0.5]} castShadow>
              <boxGeometry args={[0.1, 0.75, 0.1]} />
              <meshStandardMaterial color="#0a0a0a" roughness={0.5} />
            </mesh>
          ))
        )}
      </group>

      {/* Strip neon oranye di dinding belakang (emissive — nanti dapat bloom di B3) */}
      <mesh position={[0, 2.2, -D / 2 + 0.02]}>
        <boxGeometry args={[3, 0.08, 0.04]} />
        <meshStandardMaterial
          color={ACCENT}
          emissive={ACCENT}
          emissiveIntensity={2.5}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
