import type Matter from "matter-js";

/** Parameter fisika yang bisa diubah live dari panel kontrol. */
export interface MatterLabParams {
  gravity: number; // pengali gravitasi ke bawah (0 = melayang)
  restitution: number; // kelentingan body baru (0 = mati, 1 = memantul penuh)
  friction: number; // gesekan permukaan body baru
}

/** API yang diekspos hook ke komponen untuk aksi tombol. */
export interface MatterLabControls {
  reset: () => void; // muat ulang demo aktif dari awal
  spawnBurst: (count: number) => void; // hambur sejumlah body dari atas tengah
}

/** Konteks yang diberikan ke tiap demo untuk mengisi world. */
export interface DemoContext {
  world: Matter.World;
  width: number;
  height: number;
  params: MatterLabParams;
  /** Gaya render body dinamis selaras tema (sebagian aksen oranye). */
  style: () => Matter.IChamferableBodyDefinition["render"];
  /** Body acak (kotak/bola) memakai restitution & friction dari params. */
  makeBody: (x: number, y: number) => Matter.Body;
}

/** Satu skenario yang bisa dipilih dari dropdown. */
export interface Demo {
  id: string;
  name: string;
  build: (ctx: DemoContext) => void;
}
