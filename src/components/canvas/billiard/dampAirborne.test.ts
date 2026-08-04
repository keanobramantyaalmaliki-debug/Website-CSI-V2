/**
 * Penjaga `dampAirborne` — peredam bola melayang.
 *
 * Kenapa ini pantas dijaga test, bukan sekadar diperbaiki lalu dilupakan:
 * gejalanya cuma terlihat dari SATU sudut kamera (tegak lurus dari atas) pada
 * SEBAGIAN KECIL tembakan (4 dari 108). Siapa pun yang menghapus peredam ini
 * sambil main sebentar akan menyimpulkan "tidak ada yang rusak".
 *
 * Yang diuji di sini adalah PERILAKU peredamnya terhadap keadaan bola, bukan
 * hasil simulasi penuh — simulasi 108 tembakan terlalu lambat untuk test unit,
 * dan angka-angkanya sudah dicatat di physics.ts.
 */
import { describe, it, expect } from "vitest";
import { createWorld, dampAirborne } from "./physics";
import { BALL_Y, FELT, POCKETS, POCKET_R, startPositions } from "./table";

const world = () => createWorld(startPositions());

describe("dampAirborne", () => {
  it("menekan bola yang melayang kembali ke permukaan kain", () => {
    const w = world();
    const b = w.balls[0];
    b.position.y = BALL_Y + 0.048; // setinggi kejadian terparah yang terukur
    b.velocity.set(2, 1.5, 0);

    dampAirborne(w);

    expect(b.position.y).toBeCloseTo(BALL_Y, 6);
    // Kecepatan MENDATAR tidak boleh ikut dihapus — kalau ikut, tembakan jadi
    // mati mendadak tiap kali bola menyenggol sambungan pelat.
    expect(b.velocity.x).toBe(2);
    expect(b.velocity.y).toBe(0);
  });

  it("tidak menyentuh bola yang bertumpu normal di kain", () => {
    const w = world();
    const b = w.balls[0];
    b.position.y = BALL_Y;
    b.velocity.set(3, 0, 1);

    dampAirborne(w);

    expect(b.position.y).toBe(BALL_Y);
    expect(b.velocity.x).toBe(3);
    expect(b.velocity.z).toBe(1);
  });

  it("membiarkan bola yang sedang TURUN menyelesaikan jatuhnya", () => {
    const w = world();
    const b = w.balls[0];
    b.position.y = BALL_Y + 0.02;
    b.velocity.set(0, -1.2, 0); // sedang turun

    dampAirborne(w);

    // Posisinya tetap dikembalikan, tapi kecepatan turun dipertahankan.
    expect(b.velocity.y).toBe(-1.2);
  });

  // ── Dua penjaga di bawah ini yang mencegah giliran menggantung selamanya ──
  //
  // Bola yang masuk lubang HARUS bisa turun. Kalau peredam menahannya di
  // permukaan kain, `overPocket` (yang mensyaratkan bola sudah di bawah kain)
  // tidak pernah terpicu dan fase `rolling` tidak pernah selesai.

  it("TIDAK menahan bola yang berada di mulut lubang", () => {
    const w = world();
    const b = w.balls[0];
    const [px, pz] = POCKETS[0];
    b.position.set(px, BALL_Y + 0.01, pz);
    b.velocity.set(0, -0.5, 0);

    dampAirborne(w);

    expect(b.position.y).toBe(BALL_Y + 0.01); // dibiarkan apa adanya
  });

  // Celah kain berbentuk PERSEGI, bukan lingkaran di sekitar titik pusat
  // lubang. Pengecualian peredam sempat memakai lingkaran ber-radius POCKET_R,
  // dan sudut-sudut celah jatuh di luarnya — di sana bola ditahan melayang
  // tepat di atas lubang alih-alih jatuh masuk.
  it("TIDAK menahan bola di SUDUT celah, yang jatuh di luar lingkaran lubang", () => {
    const w = world();
    const b = w.balls[0];
    // Titik tanpa kain yang PALING JAUH dari pusat lubang mana pun — hasil
    // sapuan seluruh permukaan, bukan tebakan. Jaraknya 113 mm, yaitu 38 mm
    // di LUAR lingkaran ber-radius POCKET_R. Sudut celah band tengah kanan.
    const x = FELT.x1 - POCKET_R + 0.0005;
    const z = -1.555;
    const jarakTerdekat = Math.min(
      ...POCKETS.map(([px, pz]) => Math.hypot(x - px, z - pz)),
    );
    expect(jarakTerdekat).toBeGreaterThan(POCKET_R); // di luar lingkaran

    b.position.set(x, BALL_Y + 0.01, z);
    dampAirborne(w);

    expect(b.position.y).toBe(BALL_Y + 0.01); // tetap dibiarkan jatuh
  });

  it("TIDAK menarik kembali bola yang sudah turun ke dalam lubang", () => {
    const w = world();
    const b = w.balls[0];
    // Di tengah kain (bukan di lubang) tapi sudah jauh di bawah permukaan —
    // meniru bola yang sedang meluncur turun setelah lewat mulut lubang.
    b.position.set(0.375, FELT.y - 0.2, -1.6);

    dampAirborne(w);

    expect(b.position.y).toBeCloseTo(FELT.y - 0.2, 6);
  });

  it("melewati bola yang sudah dikeluarkan dari simulasi", () => {
    const w = world();
    const b = w.balls[3];
    w.world.removeBody(b);
    b.position.y = BALL_Y + 0.5;

    expect(() => dampAirborne(w)).not.toThrow();
    expect(b.position.y).toBe(BALL_Y + 0.5); // tak disentuh
  });
});
