/**
 * Dunia fisika billiard (cannon-es).
 *
 * Kenapa cannon-es dan bukan Rapier: yang menentukan rasa permainan adalah
 * koefisien tiap PASANGAN benda (bola↔bola, bola↔kain, bola↔bantalan).
 * cannon-es menyatakannya langsung lewat `ContactMaterial`, sedangkan Rapier
 * hanya menyimpan satu nilai per collider lalu menggabungkannya dengan sebuah
 * aturan (Average/Min/Max). Perbedaan itu sempat menyesatkan berkali-kali:
 * kain tertulis restitusi 0,05 tapi yang berlaku 0,485 karena dirata-rata
 * dengan nilai bola. Di sini angka yang tertulis = angka yang berlaku.
 *
 * Nilai koefisien mengikuti referensi elijah-atkins/Billiards yang sudah
 * terbukti enak dimainkan.
 *
 * Semua konstanta geometri diambil dari `table.ts` (koordinat three, y = atas)
 * supaya visual dan fisika tidak pernah berbeda sumber.
 */
import * as CANNON from "cannon-es";
import {
  BALL_R,
  BALL_Y,
  CUSHIONS,
  FELT,
  POCKETS,
  POCKET_R,
  POCKET_SENSOR_R,
  TABLE_CENTER,
} from "./table";

/** Massa bola billiard resmi (kg). */
export const BALL_MASS = 0.17;

/** Material per jenis permukaan — dipasangkan di `contactPairs()`. */
export const MAT = {
  ball: new CANNON.Material("ball"),
  felt: new CANNON.Material("felt"),
  cushion: new CANNON.Material("cushion"),
};

/**
 * Koefisien per pasangan. Berlaku APA ADANYA — tidak ada aturan penggabungan.
 *
 * Gesekan kain 0,7 itu kunci: kain yang terlalu licin membuat bola meluncur
 * seperti di atas es, energi break tidak terserap, dan rak berhamburan.
 * Bantalan nyaris elastis sempurna (0,99) supaya pantulan rail terasa tegas.
 */
function contactPairs(): CANNON.ContactMaterial[] {
  return [
    // Bola↔bola: billiard asli mendekati elastis sempurna (fenolik resin
    // ±0,93). Gesekan kecil supaya bola saling menggigit sedikit saat pecah.
    new CANNON.ContactMaterial(MAT.ball, MAT.ball, {
      friction: 0.05,
      restitution: 0.93,
    }),
    // Bola↔kain: cengkeraman tinggi, nyaris tidak memantul. Inilah yang
    // mengubah luncuran jadi gulingan dan meredam energi tembakan.
    new CANNON.ContactMaterial(MAT.ball, MAT.felt, {
      friction: 0.7,
      restitution: 0.1,
    }),
    // Bola↔bantalan: licin dan sangat memantul.
    new CANNON.ContactMaterial(MAT.ball, MAT.cushion, {
      friction: 0.5,
      restitution: 0.99,
    }),
  ];
}

/**
 * Batas X pita kain yang dipersempit di depan lubang. Kain mundur sejauh
 * POCKET_R dari kedua tepi, sehingga tersisa celah selebar POCKET_R di sana.
 */
const FELT_NARROW_X0 = FELT.x0 + POCKET_R;
const FELT_NARROW_X1 = FELT.x1 - POCKET_R;

/** Rentang Z tiap lubang, diurutkan dan dipotong sebatas kain. */
const POCKET_BANDS: readonly (readonly [number, number])[] = [
  ...new Set(POCKETS.map(([, z]) => z)),
]
  .sort((a, b) => a - b)
  .map(
    (z) =>
      [Math.max(z - POCKET_R, FELT.z0), Math.min(z + POCKET_R, FELT.z1)] as const,
  );

/**
 * Adakah kain yang menopang di titik ini?
 *
 * Bentuk celah kain itu PERSEGI (pita yang dipersempit di X sepanjang sebuah
 * band Z), bukan lingkaran di sekitar titik pusat lubang. Membedakannya
 * penting: `dampAirborne` sempat memakai lingkaran ber-radius POCKET_R sebagai
 * pengecualian, dan 511 titik yang sebenarnya tanpa kain jatuh di LUAR
 * lingkaran itu — di sana peredam akan menahan bola melayang tepat di atas
 * lubang alih-alih membiarkannya jatuh.
 *
 * Diturunkan dari konstanta yang sama dengan pembangun kain di `createWorld`,
 * jadi keduanya tidak bisa berbeda diam-diam.
 */
function overFeltGap(x: number, z: number): boolean {
  if (x < FELT.x0 || x > FELT.x1 || z < FELT.z0 || z > FELT.z1) return true;
  for (const [bz0, bz1] of POCKET_BANDS) {
    if (z >= bz0 && z <= bz1 && (x < FELT_NARROW_X0 || x > FELT_NARROW_X1)) {
      return true;
    }
  }
  return false;
}

export interface BilliardWorld {
  world: CANNON.World;
  /** 16 bola; index 0 = bola putih. */
  balls: CANNON.Body[];
  /** Cari index bola dari sebuah body (mis. saat callback tumbukan). */
  indexOf: (b: CANNON.Body) => number | undefined;
  /** Majukan simulasi. `dt` detik nyata. */
  step: (dt: number) => void;
}

/** Posisi awal bola (index 0 putih, 1..15 rak) — dari table.ts. */
export function createWorld(
  startPositions: readonly (readonly [number, number, number])[],
): BilliardWorld {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });

  // SAPBroadphase jauh lebih murah daripada Naive (bawaan) begitu benda
  // bertambah, dan 16 bola + 6 bantalan + 6 lubang sudah cukup untuk terasa.
  world.broadphase = new CANNON.SAPBroadphase(world);

  // tolerance 0 memaksa solver memakai SEMUA iterasi. Tanpa ini solver berhenti
  // lebih awal saat galat masih "cukup kecil", dan pada break — belasan kontak
  // menumpuk dalam satu langkah — sisa gaya menumpuk lalu terlepas sekaligus.
  world.solver = Object.assign(new CANNON.GSSolver(), {
    iterations: 10,
    tolerance: 0,
  });

  world.allowSleep = true;
  for (const cm of contactPairs()) world.addContactMaterial(cm);

  // ── Kain ────────────────────────────────────────────────────────────────
  //
  // BUKAN satu pelat padat: kain dipecah jadi pita-pita sepanjang Z, dan pita
  // yang melintasi lubang dipersempit di X sehingga ada CELAH di mulut lubang.
  //
  // Kenapa penting: dengan pelat padat, bola yang berada di atas lubang tetap
  // tertopang dan tidak pernah jatuh. Itu memaksa deteksi lubang mengandalkan
  // ambang ketinggian + zona sensor yang dilebarkan — dua penambal yang
  // masing-masing punya kasus gagal sendiri. Dengan celah sungguhan, bola
  // kehilangan tumpuan dan jatuh sendiri, persis seperti meja betulan.
  //
  // Semua lubang berada di tepi X (x0/x1), tidak ada yang di tengah kain, jadi
  // pemotongan cukup di satu sumbu.
  const felt = new CANNON.Body({ mass: 0, material: MAT.felt });
  const FELT_HT = 0.01; // setengah tebal pelat

  const addStrip = (x0: number, x1: number, z0: number, z1: number) => {
    if (x1 - x0 < 1e-6 || z1 - z0 < 1e-6) return;
    felt.addShape(
      new CANNON.Box(new CANNON.Vec3((x1 - x0) / 2, FELT_HT, (z1 - z0) / 2)),
      new CANNON.Vec3((x0 + x1) / 2, FELT.y - FELT_HT, (z0 + z1) / 2),
    );
  };

  // Pita sempit di depan lubang & rentang Z tiap lubang — dihitung sekali di
  // atas berkas supaya `overFeltGap` memakai angka yang sama persis.
  const nx0 = FELT_NARROW_X0;
  const nx1 = FELT_NARROW_X1;

  let zCursor: number = FELT.z0;
  for (const [bz0, bz1] of POCKET_BANDS) {
    addStrip(FELT.x0, FELT.x1, zCursor, bz0); // penuh, sebelum lubang
    addStrip(nx0, nx1, bz0, bz1); // sempit, sejajar lubang
    zCursor = bz1;
  }
  addStrip(FELT.x0, FELT.x1, zCursor, FELT.z1); // penuh, setelah lubang terakhir

  world.addBody(felt);

  // ── Bantalan ────────────────────────────────────────────────────────────
  const cushion = new CANNON.Body({ mass: 0, material: MAT.cushion });
  for (const c of CUSHIONS) {
    cushion.addShape(
      new CANNON.Box(new CANNON.Vec3(c.half[0], c.half[1], c.half[2])),
      new CANNON.Vec3(c.pos[0], c.pos[1], c.pos[2]),
    );
  }
  world.addBody(cushion);

  // ── Bola ────────────────────────────────────────────────────────────────
  const shape = new CANNON.Sphere(BALL_R);
  const balls = startPositions.map((p, i) => {
    const b = new CANNON.Body({
      mass: BALL_MASS,
      shape,
      material: MAT.ball,
      position: new CANNON.Vec3(p[0], p[1], p[2]),
    });
    // Redaman meniru hambatan udara + rolling resistance. Nilai kain di atas
    // menangani gesekan kontak; ini yang memastikan bola benar-benar berhenti
    // alih-alih merayap pelan tanpa akhir.
    b.linearDamping = 0.5;
    b.angularDamping = 0.5;

    // Tidur setelah diam sesaat: bola yang tidur dilewati solver, jadi tidak
    // ada lagi getaran sisa di tumpukan rak dan CPU-nya ikut hemat.
    //
    // ⚠️ sleepSpeedLimit harus LEBIH KECIL dari REST_SPEED di BilliardGame.
    // Kalau lebih besar, bola bisa ditidurkan sementara kecepatannya masih di
    // atas ambang "dianggap berhenti" — kecepatan itu lalu membeku selamanya
    // (body tidur tidak disimulasikan) dan giliran menggantung.
    // Sekarang: sleep 0,005 < REST_SPEED 0,01.
    b.allowSleep = true;
    b.sleepSpeedLimit = 0.005;
    b.sleepTimeLimit = 0.2;

    world.addBody(b);
    return b;
  });

  // cannon-es tidak punya `userData`, jadi pemetaan body → index bola disimpan
  // di sini. `Body.id` unik dan stabil selama body tidak dibuat ulang.
  const indexById = new Map<number, number>();
  balls.forEach((b, i) => indexById.set(b.id, i));

  return {
    world,
    balls,
    indexOf: (b: CANNON.Body) => indexById.get(b.id),
    // Langkah 1/180 s, maksimum 6 substep per frame.
    //
    // ⚠️ Angka ini KRITIS dan tidak boleh dinaikkan tanpa mengecek ulang:
    // cannon-es TIDAK punya continuous collision detection seperti Rapier,
    // jadi satu-satunya yang mencegah bola menembus bantalan adalah langkah
    // yang cukup kecil. Pada kecepatan maksimum 8,2 m/s (IMPULSE_MAX 1,4):
    //
    //   1/60  s → 137 mm per langkah  vs bantalan setebal 80 mm → TEMBUS
    //   1/120 s →  69 mm              → aman tipis
    //   1/180 s →  46 mm              → margin 43%, dipakai di sini
    //
    // maxSubSteps 6 supaya frame yang tersendat (atau tab yang baru aktif
    // lagi) tetap dikejar bertahap, bukan satu lompatan besar.
    step: (dt: number) => world.step(1 / 180, dt, 6),
  };
}

/**
 * Tekan kembali bola yang terlanjur melayang di atas kain.
 *
 * ── Kenapa bola bisa melayang sama sekali ──────────────────────────────────
 * Bukan karena tembakan terlalu keras — itu dugaan yang wajar tapi salah.
 * Sebabnya SAMBUNGAN antar-pelat kain. Kain di `createWorld` sengaja dipecah
 * jadi pita-pita agar ada celah sungguhan di mulut lubang, dan tiap pita adalah
 * `Box` terpisah. Bola yang menggelinding cepat melintasi batas dua pita bisa
 * menyenggol RUSUK pelat berikutnya alih-alih mendarat mulus di permukaannya,
 * dan rusuk itu melontarkannya ke atas.
 *
 * Terukur lewat simulasi headless 108 tembakan: 4 kejadian melayang, SEMUANYA
 * (100%) terjadi dalam 3–7 mm dari sebuah sambungan, tidak ada satu pun di
 * tengah pelat. Yang terparah naik 47,8 mm — hampir dua kali diameter bola.
 *
 * ── Kenapa ini harus diperbaiki, padahal fisikanya "cuma meleset sedikit" ──
 * Kamera minigame melihat LURUS DARI ATAS. Dari sudut itu ketinggian tidak
 * terbaca sebagai ketinggian — bola yang melayang hanya terlihat sebagai bola
 * yang menembus benda lain. Di kamera serong hal yang sama akan terbaca wajar.
 *
 * ── Kenapa menekan posisi, bukan menambal geometrinya ─────────────────────
 * Menyatukan pelat kain akan menghapus celah lubang, dan celah itu justru yang
 * membuat bola jatuh sendiri tanpa perlu penambal deteksi (lihat `createWorld`).
 * Menaikkan resolusi langkah tidak menolong: ini soal rusuk yang memang ada,
 * bukan soal langkah yang kelewat besar.
 *
 * Peredam ini hanya bertindak saat bola SUDAH naik melewati toleransi. Bola
 * yang bertumpu normal tidak pernah disentuh, jadi gesekan kontak dan rasa
 * permainan tetap utuh — terukur: durasi giliran 99,6% dan jarak tempuh bola
 * putih 99,4% dari sebelumnya, sementara melayang turun 47,8 mm → 1,9 mm.
 *
 * ⚠️ DUA PENGECUALIAN DI BAWAH WAJIB ADA. Tanpa keduanya, peredam menahan bola
 * yang sedang masuk lubang tetap melayang di permukaan kain — ia tidak pernah
 * jatuh, dan yang terlihat pemain adalah bola menggantung di mulut lubang.
 */
const AIRBORNE_TOL = 0.002;

export function dampAirborne(w: BilliardWorld) {
  for (const b of w.balls) {
    if (!w.world.bodies.includes(b)) continue; // sudah dikeluarkan
    if (b.position.y < FELT.y - 0.02) continue; // (1) sudah masuk lubang
    // (2) sedang di atas celah — di sinilah bola MEMANG harus kehilangan
    // tumpuan. Diuji lewat `overFeltGap` yang mengikuti bentuk kain yang
    // sebenarnya; lihat catatan di sana soal kenapa lingkaran tidak cukup.
    if (overFeltGap(b.position.x, b.position.z)) continue;

    if (b.position.y > BALL_Y + AIRBORNE_TOL) {
      b.position.y = BALL_Y;
      b.interpolatedPosition.y = BALL_Y;
      // Hanya kecepatan NAIK yang dinolkan. Bola yang sedang turun dibiarkan
      // menyelesaikan jatuhnya secara wajar.
      if (b.velocity.y > 0) b.velocity.y = 0;
    }
  }
}

/**
 * Kembalikan bola ke posisi tertentu dalam keadaan diam dan aktif lagi.
 *
 * Tidak memasang body ke world — pemanggil yang mengurus itu lewat
 * `restoreBall`, karena hanya dia yang tahu bola mana yang sedang dikeluarkan.
 */
export function placeBall(
  b: CANNON.Body,
  p: readonly [number, number, number],
) {
  b.velocity.setZero();
  b.angularVelocity.setZero();
  b.force.setZero();
  b.torque.setZero();
  b.position.set(p[0], p[1], p[2]);
  b.previousPosition.set(p[0], p[1], p[2]);
  b.interpolatedPosition.set(p[0], p[1], p[2]);
  b.quaternion.set(0, 0, 0, 1);
  b.type = CANNON.Body.DYNAMIC;
  b.wakeUp();
}

/**
 * Keluarkan bola dari simulasi (dipakai saat masuk lubang).
 *
 * Bola yang masuk lubang tidak punya dasar untuk mendarat, jadi kalau
 * dibiarkan ia terjun bebas selamanya dan pengecekan "semua bola sudah diam"
 * tidak pernah terpenuhi — giliran menggantung.
 *
 * Body-nya DIHAPUS dari world, bukan sekadar dibekukan jadi STATIC. Pendekatan
 * beku menyisakan benda mati di dalam simulasi: masih bisa ditumbuk bola lain,
 * masih ikut broadphase, dan harus dilewati manual di setiap loop — sumber
 * beberapa bug yang sempat muncul. Menghapusnya membuat semua itu hilang
 * dengan sendirinya. Body-nya sendiri tetap hidup di array `balls`, tinggal
 * dipasang lagi lewat `restoreBall` saat rack atau respot.
 */
export function removeBall(world: CANNON.World, b: CANNON.Body) {
  b.velocity.setZero();
  b.angularVelocity.setZero();
  b.force.setZero();
  b.torque.setZero();
  world.removeBody(b);
}

/** Pasang kembali bola ke simulasi kalau sebelumnya dikeluarkan. */
export function restoreBall(world: CANNON.World, b: CANNON.Body) {
  if (!world.bodies.includes(b)) world.addBody(b);
}

/**
 * Apakah bola melewati mulut lubang sejak frame sebelumnya?
 *
 * Diuji dengan jarak mendatar, bukan collider sensor: cannon-es tidak punya
 * sensor bawaan, dan uji jarak lebih dapat diprediksi — tidak bergantung pada
 * apakah dua collider kebetulan bertemu di langkah yang sama.
 *
 * ⚠️ Yang diuji adalah SEGMEN dari posisi sebelumnya ke posisi sekarang,
 * bukan titik. Zona sensor lebarnya 122 mm sedangkan pada kecepatan maksimum
 * (8,2 m/s) bola menempuh 137 mm per frame — uji titik akan melewatkannya
 * begitu saja, dan itulah sebab bola cepat kadang menembus lubang.
 *
 * `previousPosition` diperbarui cannon-es tiap langkah, jadi tidak perlu
 * menyimpan riwayat sendiri.
 *
 * POCKET_SENSOR_R sengaja lebih kecil dari lubang aslinya supaya bola baru
 * dihitung masuk kalau pusatnya benar-benar sudah lewat bibir lubang, bukan
 * saat baru menyenggol pinggirnya.
 */
export function overPocket(b: CANNON.Body): boolean {
  // ⚠️ DULU di sini ada syarat "bola harus sudah turun 1 mm di bawah kain"
  // (`if (b.position.y > FELT.y - 0.001) return false`). Itu SALAH untuk bola
  // cepat, dan begini duduk perkaranya:
  //
  // Celah kain di mulut lubang lebarnya 75 mm. Pada tenaga penuh (8,2 m/s)
  // bola menyeberanginya dalam 9,1 ms, dan dalam waktu sesingkat itu gravitasi
  // baru menjatuhkannya 0,4 mm — belum sampai ambang 1 mm. Bola pun melintas
  // di ATAS lubang tanpa pernah dihitung masuk, lalu keluar meja begitu saja
  // karena bantalan memang sengaja diputus di setiap lubang.
  //
  // Terukur: dari 18 tembakan yang dibidik LURUS ke lubang, hanya 6 yang
  // masuk — 12 sisanya kabur keluar meja. Setelah syarat itu dibuang: 18/18.
  //
  // Membuangnya aman, dan ini bukan kesimpulan dari tes saja melainkan dari
  // geometri: seluruh zona sensor (r = 60,7 mm) terbukti berada di atas celah
  // tanpa kain — diperiksa 6 lubang × 720 arah × 41 jarak, nol titik yang
  // masih berkain. Artinya bola yang masuk zona ini PASTI sudah kehilangan
  // tumpuan; syarat ketinggian tadi cuma mengulang hal yang sama dengan cara
  // yang gagal pada kecepatan tinggi.
  //
  // ⚠️ Kalau POCKET_SENSOR_R nanti diperbesar melewati POCKET_R, jaminan itu
  // batal — zona sensor akan menjorok ke daerah yang masih berkain dan bola
  // yang sekadar lewat di dekat lubang ikut terhitung masuk.
  const ax = b.previousPosition.x;
  const az = b.previousPosition.z;
  const bx = b.position.x;
  const bz = b.position.z;

  const sx = bx - ax;
  const sz = bz - az;
  const segSq = sx * sx + sz * sz;
  const rSq = POCKET_SENSOR_R * POCKET_SENSOR_R;

  for (const [px, pz] of POCKETS) {
    // Titik terdekat pada segmen terhadap pusat lubang.
    let t = 0;
    if (segSq > 1e-12) {
      t = ((px - ax) * sx + (pz - az) * sz) / segSq;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
    }
    const dx = ax + sx * t - px;
    const dz = az + sz * t - pz;
    if (dx * dx + dz * dz < rSq) return true;
  }
  return false;
}

/**
 * Jarak tempuh garis bidik sampai rintangan pertama — bekerja seperti laser.
 *
 * Dihitung analitis di bidang XZ, bukan lewat raycast fisika: cannon-es
 * menyediakan `raycastClosest`, tapi ia menembak terhadap SEMUA body termasuk
 * kain (yang membentang persis di bawah bola), sehingga hasilnya jadi nol.
 * Uji dua bentuk saja jauh lebih murah dan lebih dapat diprediksi.
 *
 * @param from   pusat bola putih
 * @param dir    arah bidik (harus ternormalisasi, di bidang XZ)
 * @param others bola lain yang masih di meja
 * @param maxLen batas kalau tidak ada rintangan sama sekali
 */
export function aimDistance(
  from: { x: number; z: number },
  dir: { x: number; z: number },
  others: readonly { x: number; z: number }[],
  maxLen: number,
): number {
  let best = maxLen;

  // ── Bola lain ───────────────────────────────────────────────────────────
  // Garis berhenti saat menyentuh PERMUKAAN bola (jarak = R), bukan pusatnya,
  // supaya ujung garis terlihat menempel rapi di tepi bola.
  for (const o of others) {
    const ox = o.x - from.x;
    const oz = o.z - from.z;
    // Proyeksi pusat bola ke garis; nilai negatif = bola ada di belakang.
    const t = ox * dir.x + oz * dir.z;
    if (t <= 0) continue;
    // Jarak tegak lurus dari pusat bola ke garis.
    const perpSq = ox * ox + oz * oz - t * t;
    if (perpSq > BALL_R * BALL_R) continue; // meleset
    // Mundur sejauh setengah tali busur supaya berhenti di permukaan.
    const hit = t - Math.sqrt(BALL_R * BALL_R - perpSq);
    if (hit > 0 && hit < best) best = hit;
  }

  // ── Bantalan ────────────────────────────────────────────────────────────
  // Area main adalah persegi panjang; cari jarak KELUAR terdekat.
  //
  // Batasnya TEPI FELT PERSIS, bukan tepi dikurangi BALL_R. Yang dikurangi
  // radius adalah posisi pusat bola saat menyentuh bantalan — benar secara
  // fisika, tapi mata melihat garis putus 28,5 mm sebelum bantalan. Garis
  // bidik ini penunjuk arah, jadi ujungnya harus mendarat di titik pantul
  // yang terlihat.
  const lim = [
    [FELT.x0, FELT.x1, from.x, dir.x],
    [FELT.z0, FELT.z1, from.z, dir.z],
  ] as const;

  for (const [lo, hi, p, d] of lim) {
    if (Math.abs(d) < 1e-6) continue; // sejajar dinding ini
    const t = d > 0 ? (hi - p) / d : (lo - p) / d;
    if (t > 0 && t < best) best = t;
  }

  return Math.max(0, best);
}

/** Tinggi pusat bola saat menempel di kain — dipakai saat re-rack. */
export { BALL_Y };
