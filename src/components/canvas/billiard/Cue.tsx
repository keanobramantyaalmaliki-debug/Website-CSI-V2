"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Mesh, MeshStandardMaterial, Object3D } from "three";

const CUE_URL = "/3d/models/billiard_cue.glb";

/**
 * Geometri mentahnya 59,371 satuan memanjang di +Z; stik asli ±1,45 m.
 *
 * Skala dihitung terhadap GEOMETRI, bukan terhadap ukuran setelah transform.
 * Rantai node aset ini sudah membawa skala 0,0254 + rotasi −90°/−90°, jadi
 * mesh-nya dilepas dulu dari induknya (geometri saja) supaya transform itu
 * tidak bertumpuk dengan milik kita.
 */
const CUE_SCALE = 1.45 / 59.371;

/**
 * Kemiringan stik (radian) — pangkalnya terangkat seperti pemain sungguhan.
 *
 * Bukan sekadar gaya-gayaan: stik panjangnya 1,45 m sedangkan setengah panjang
 * meja cuma 1,235 m dan setengah lebarnya 0,65 m, jadi pangkalnya SELALU
 * melewati rail. Digambar mendatar di ketinggian pusat bola (y 0,836) ia
 * berada 24 mm DI BAWAH bibir rail (y 0,860) sehingga menembus badan meja.
 *
 * Pada 8° pangkalnya naik ke y≈1,04 — 177 mm di atas rail, aman dari semua
 * sisi meja tanpa terlihat berlebihan.
 */
const CUE_TILT = (8 * Math.PI) / 180;

/**
 * Stik. Murni visual — tidak ikut fisika; tumbukan ke bola putih diberikan
 * sebagai impuls langsung, jauh lebih stabil daripada menabrakkan rigid body
 * tipis berkecepatan tinggi.
 *
 * Mesh aslinya memanjang di +Z dengan ujung tip di origin, jadi cukup digeser
 * mundur sejauh `pullback` lalu grup induknya diputar ke arah bidik.
 */
export default function Cue({
  visible,
  pullback,
}: {
  visible: boolean;
  pullback: number;
}) {
  const { scene } = useGLTF(CUE_URL);

  const mesh = useMemo(() => {
    let found: Mesh | null = null;
    scene.traverse((o: Object3D) => {
      if (!found && o instanceof Mesh) found = o;
    });
    if (!found) return null;

    // Bangun mesh baru dari geometri mentahnya saja — jangan clone() node
    // aslinya, karena node itu mewarisi skala & rotasi dari rantai induk yang
    // akan bertumpuk dengan transform kita sendiri.
    const src = found as Mesh;
    const mat = (src.material as MeshStandardMaterial).clone();
    mat.metalness = 0.05;
    mat.roughness = 0.55;
    mat.envMapIntensity = 0.5;

    const m = new Mesh(src.geometry, mat);
    m.position.set(0, 0, 0);
    m.rotation.set(0, 0, 0);
    m.scale.setScalar(1);
    return m;
  }, [scene]);

  if (!mesh || !visible) return null;

  // Tip stik berhenti sedikit sebelum bola supaya tidak menembusnya saat diam.
  const gap = 0.035 + pullback;

  // Dibungkus grup yang dimiringkan pada sumbu X. Rotasi NEGATIF: mesh
  // memanjang ke +Z (menjauh dari bola), dan rotasi X negatif mengangkat
  // ujung +Z ke atas — yaitu pangkalnya. Rotasi positif justru menenggelamkan
  // pangkal ke dalam meja.
  //
  // Titik putarnya di origin grup = posisi bola, jadi TIP tetap menempel di
  // bola berapa pun kemiringannya; hanya pangkal yang terangkat.
  return (
    <group rotation={[-CUE_TILT, 0, 0]}>
      <primitive object={mesh} position={[0, 0, gap]} scale={CUE_SCALE} />
    </group>
  );
}

useGLTF.preload(CUE_URL);
