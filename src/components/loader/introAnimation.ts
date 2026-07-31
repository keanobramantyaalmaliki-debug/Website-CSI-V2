/**
 * Animasi loading isometrik — logika murni, TANPA DOM.
 *
 * Berkas ini dipakai DUA KALI: di dalam Web Worker (jalur utama, lewat
 * OffscreenCanvas) dan langsung di main thread (jalur cadangan). Karena itu ia
 * tidak boleh menyentuh `window`, `document`, atau apa pun yang cuma ada di
 * main thread — satu-satunya sentuhan ke dunia luar adalah context 2D yang
 * dioper masuk.
 *
 * ── Kenapa TIDAK mengimpor three ────────────────────────────────────────────
 * Referensinya (basement.studio) meminjam Vector3/Quaternion/Matrix4/Euler dari
 * three untuk matematikanya. Di sini itu justru merugikan: worker dibundel jadi
 * chunk TERPISAH, jadi mengimpor three berarti loader harus menunggu ratusan KB
 * selesai diunduh sebelum bisa menggambar frame pertama — persis kebalikan dari
 * tugasnya. Yang dibutuhkan cuma compose + multiply matriks 4×4, jadi ditulis
 * sendiri di bawah (~40 baris).
 *
 * Rumus rotasinya disalin dari three r0.185
 * (`Matrix4.makeRotationFromEuler`, cabang order 'XYZ') supaya hasilnya
 * identik piksel demi piksel dengan referensi, bukan kira-kira.
 *
 * ── Proyeksinya lebih sederhana dari yang terlihat di referensi ─────────────
 * Referensi membangun matriks ortografik lalu di `project()` mengalikan
 * `inverseProjectionMatrix` DAN `projectionMatrix` berurutan. Keduanya saling
 * meniadakan — dan karena matriks ortografik punya baris bawah (0,0,0,1),
 * pembagi perspektif `w` selalu 1, jadi tidak ada sisa efek apa pun. Blok
 * ortografik itu DEAD CODE seluruhnya; yang benar-benar bekerja cuma
 * `camMatrix`. Di sini ia dibuang.
 *
 * Hasil akhir camMatrix (dihitung tangan dari phi=45°, theta=135°):
 *   layar.x = −0,7071·X          + 0,7071·Z + lebar/2
 *   layar.y =  0,5000·X + 0,7071·Y + 0,5000·Z + tinggi/2
 * Itu proyeksi isometrik baku — Y murni vertikal, X dan Z turun simetris.
 */

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/* ────────────────────────────── Matriks 4×4 ─────────────────────────────── */
/* Tata letak kolom-mayor, sama dengan three: elemen 12,13,14 = translasi. */

type Mat4 = Float64Array;

function identity(): Mat4 {
  const m = new Float64Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

/**
 * Susun matriks dari posisi + rotasi Euler (order XYZ) + skala.
 *
 * Padanan `Matrix4.compose()` three, tapi menerima Euler langsung alih-alih
 * lewat Quaternion — rotasi di sini disetel sekali saat setup dan tidak pernah
 * berubah, jadi konversi ke quaternion cuma langkah perantara yang mubazir.
 */
function compose(
  out: Mat4,
  px: number, py: number, pz: number,
  rx: number, ry: number, rz: number,
  sx: number, sy: number, sz: number,
): Mat4 {
  const a = Math.cos(rx), b = Math.sin(rx);
  const c = Math.cos(ry), d = Math.sin(ry);
  const e = Math.cos(rz), f = Math.sin(rz);
  const ae = a * e, af = a * f, be = b * e, bf = b * f;

  out[0] = c * e * sx;
  out[1] = (af + be * d) * sx;
  out[2] = (bf - ae * d) * sx;
  out[3] = 0;

  out[4] = -c * f * sy;
  out[5] = (ae - bf * d) * sy;
  out[6] = (be + af * d) * sy;
  out[7] = 0;

  out[8] = d * sz;
  out[9] = -b * c * sz;
  out[10] = a * c * sz;
  out[11] = 0;

  out[12] = px;
  out[13] = py;
  out[14] = pz;
  out[15] = 1;
  return out;
}

/** out = a × b. Aman dipanggil dengan out === a atau out === b. */
function multiply(out: Mat4, a: Mat4, b: Mat4): Mat4 {
  const a11 = a[0], a21 = a[1], a31 = a[2], a41 = a[3];
  const a12 = a[4], a22 = a[5], a32 = a[6], a42 = a[7];
  const a13 = a[8], a23 = a[9], a33 = a[10], a43 = a[11];
  const a14 = a[12], a24 = a[13], a34 = a[14], a44 = a[15];

  const b11 = b[0], b21 = b[1], b31 = b[2], b41 = b[3];
  const b12 = b[4], b22 = b[5], b32 = b[6], b42 = b[7];
  const b13 = b[8], b23 = b[9], b33 = b[10], b43 = b[11];
  const b14 = b[12], b24 = b[13], b34 = b[14], b44 = b[15];

  out[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
  out[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
  out[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
  out[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;

  out[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
  out[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
  out[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
  out[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;

  out[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
  out[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
  out[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
  out[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;

  out[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;
  out[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;
  out[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;
  out[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;
  return out;
}

/* ────────────────────────────── Easing ──────────────────────────────────── */
/* Disalin apa adanya dari referensi — kurvanya bagian dari looknya. */

const outQuint = (x: number) => 1 - Math.pow(1 - x, 5);
const inOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const inOutExpo = (x: number) =>
  x === 0
    ? 0
    : x === 1
      ? 1
      : x < 0.5
        ? Math.pow(2, 20 * x - 10) / 2
        : (2 - Math.pow(2, -20 * x + 10)) / 2;

/* ────────────────────────── Geometri batang ─────────────────────────────── */

/** 8 sudut kubus satuan. Diskalakan jadi batang lewat `scale` per sumbu. */
const VERTICES: ReadonlyArray<readonly [number, number, number]> = [
  [-1, -1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1],
  [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1],
];

/** 12 rusuk kubus sebagai pasangan indeks VERTICES. */
const LINES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 3], [3, 2], [2, 0], [2, 6], [3, 7],
  [0, 4], [1, 5], [6, 7], [6, 4], [7, 5], [4, 5],
];

/* ────────────────────────────── Tempo ───────────────────────────────────── */

/** Lingkaran melebar + 3 batang meluncur masuk. */
const INTRO_MS = 1200;
/** Satu putaran penuh 360° di sumbu Y. */
const SPIN_MS = 1000;
/** Diam di antara dua putaran. Ini tuas paling murah kalau loadingnya terasa
 *  lama — turunkan ke ~1200 untuk terasa lebih sibuk. */
const IDLE_PAUSE_MS = 2000;
/** Lingkaran mengkerut sampai habis, menyerahkan layar ke scene 3D. */
const OUTRO_MS = 900;

export interface IntroAnimation {
  /** Gambar satu frame. `now` dalam milidetik (performance.now()). */
  frame: (now: number) => void;
  /** Ukuran logis berubah. Pemanggil yang mengurus canvas.width/height. */
  resize: (width: number, height: number, dpr: number) => void;
  /** Mulai babak penutup. Aman dipanggil berkali-kali — yang kedua diabaikan. */
  startOutro: (now: number) => void;
  /** true setelah outro tuntas dan layar sudah bersih. */
  isFinished: () => boolean;
}

export interface IntroOptions {
  ctx: Ctx;
  width: number;
  height: number;
  dpr: number;
  /**
   * Hormati `prefers-reduced-motion`. Saat true: tidak ada intro, tidak ada
   * putaran, tidak ada kerut — cuma gambar diam. Keluarnya diserahkan ke
   * peredupan CSS di LoadingScreen, yang jauh lebih tenang daripada lingkaran
   * menyusut selebar layar.
   */
  reduced: boolean;
}

export function createIntroAnimation({
  ctx,
  width,
  height,
  dpr,
  reduced,
}: IntroOptions): IntroAnimation {
  let w = width;
  let h = height;

  /** Matriks kamera isometrik — lihat catatan proyeksi di kepala berkas. */
  const camMatrix = identity();
  /** Rotasi global; ini yang membuat seluruh rakitan berputar sebagai satu. */
  const globalMatrix = identity();
  /** camMatrix × globalMatrix, dihitung sekali per frame lalu dipakai 3 batang. */
  const viewMatrix = identity();
  /** Matriks akhir sebuah batang. Dipakai ulang, tidak dialokasi per batang. */
  const barMatrix = identity();

  /** Rotasi tetap tiap batang: satu membentang di X, satu di Y, satu di Z. */
  const BAR_ROTATIONS: ReadonlyArray<readonly [number, number, number]> = [
    [0, 0, 0],
    [0, 0, Math.PI / 2],
    [0, Math.PI / 2, 0],
  ];

  /* Ukuran turunan, dihitung ulang tiap resize. */
  let radiusMax = 0;
  let barLong = 0;
  let barThin = 0;
  let slideFrom = 0;

  function recompute() {
    /**
     * Lingkaran harus MENUTUP layar sepenuhnya saat idle — ia panggungnya, dan
     * pojok yang bocor putih akan langsung terlihat.
     *
     * Referensi memakai `innerWidth / 1.5`, dan itu benar HANYA di layar lebar:
     * 1920×1080 → radius 1280, sedangkan yang dibutuhkan cuma 1101. Tapi di
     * ponsel tegak 390×844 → radius 260, padahal butuh 464 — pojoknya bocor.
     * Setengah diagonal + 5% berlaku di semua rasio.
     */
    radiusMax = (Math.hypot(w, h) / 2) * 1.05;

    // Referensi mematok baseScale 32 px. Di layar kecil batangnya jadi
    // memenuhi layar, jadi diberi batas atas relatif sisi terpendek.
    const base = Math.min(32, Math.min(w, h) / 14);
    barLong = 5.5 * base;
    barThin = 0.7 * base;

    /**
     * Jarak awal batang saat meluncur masuk.
     *
     * Harus cukup jauh supaya benar-benar di luar layar sebelum bergerak.
     * Pergeseran 1 satuan dunia di sumbu X hanya jadi ~0,87 px di layar
     * (√(0,7071² + 0,5²)), jadi angkanya perlu lebih besar dari sisi terpanjang
     * layar — bukan sama dengannya.
     */
    slideFrom = Math.max(w, h) * 0.8;

    /**
     * camMatrix = compose(pusat layar, Euler(45°, 135°, 0), skala 1).
     *
     * Ini dipakai sebagai matriks MODEL, bukan matriks view (tidak dibalik) —
     * sama seperti referensi. Untuk proyeksi artistik seperti ini hasilnya
     * memang yang diinginkan: memutar titik ke sudut isometrik lalu
     * menggesernya ke tengah layar.
     */
    compose(camMatrix, w / 2, h / 2, 0, Math.PI / 4, Math.PI * 0.75, 0, 1, 1, 1);
  }

  recompute();

  // Skala DPR dipasang SEKARANG, bukan menunggu resize pertama: tanpa ini frame
  // pertama digambar dalam piksel perangkat sementara koordinatnya logis, jadi
  // di layar retina animasinya muncul di kuadran kiri-atas dengan ukuran separuh.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  /* ── Keadaan waktu ─────────────────────────────────────────────────────── */

  /** Waktu frame pertama; dipasang malas supaya jam tidak mulai sebelum
   *  benar-benar ada yang tergambar. */
  let originMs: number | null = null;
  /** Waktu putaran mulai dihitung, yaitu tepat saat intro selesai. */
  let spinOriginMs: number | null = null;
  /** Waktu outro dipicu; null selama belum diminta. */
  let outroStartMs: number | null = null;
  let finished = false;

  /** Radius lingkaran saat ini, dalam piksel logis. */
  let radius = 0;
  /** Pergeseran batang sepanjang sumbunya sendiri; 0 = di tempat. */
  let slide = 0;
  /** Sudut putar rakitan, radian. */
  let spin = 0;

  /* ── Menggambar ────────────────────────────────────────────────────────── */

  /**
   * Proyeksikan titik dunia ke piksel layar.
   *
   * Baris bawah matriks selalu (0,0,0,1) di sini — tidak ada perspektif — jadi
   * pembagi `w` dijamin 1 dan sengaja tidak dihitung.
   */
  function projectX(m: Mat4, x: number, y: number, z: number) {
    return m[0] * x + m[4] * y + m[8] * z + m[12];
  }
  function projectY(m: Mat4, x: number, y: number, z: number) {
    return m[1] * x + m[5] * y + m[9] * z + m[13];
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    if (radius <= 0.5) return;

    /**
     * ── Batang adalah LUBANG, bukan garis putih ─────────────────────────────
     * Di referensi, batang diberi warna yang SAMA dengan latar halaman, jadi ia
     * hanya terlihat di bagian yang tertutup lingkaran hitam. Lingkarannya yang
     * jadi panggung.
     *
     * Trik itu tidak bisa disalin mentah di sini, karena saat outro latar
     * putihnya ikut memudar — batang putih akan tertinggal melayang di atas
     * kantor 3D. Karena itu kanvas ini TRANSPARAN, dan batang digambar dengan
     * `destination-out` sehingga ia MELUBANGI lingkaran.
     *
     * Dua keuntungan yang didapat cuma-cuma:
     *   1. Saat idle, lubang meneruskan `<div>` putih di belakangnya — tampilan
     *      persis sama dengan referensi.
     *   2. Saat outro, lubang meneruskan apa pun yang ada di belakang, jadi
     *      batangnya ikut hilang sendiri saat lingkaran mengkerut. Tidak perlu
     *      clipping manual.
     */
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill();

    compose(globalMatrix, 0, 0, 0, 0, spin, 0, 1, 1, 1);
    multiply(viewMatrix, camMatrix, globalMatrix);

    ctx.globalCompositeOperation = "destination-out";
    // Warna tidak penting saat destination-out — yang dipakai cuma alpha-nya.
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;

    for (let i = 0; i < BAR_ROTATIONS.length; i++) {
      const [rx, ry, rz] = BAR_ROTATIONS[i];
      // Batang ke-i meluncur masuk sepanjang sumbunya sendiri: X, Y, lalu Z.
      const px = i === 0 ? slide : 0;
      const py = i === 1 ? -slide : 0;
      const pz = i === 2 ? slide : 0;

      compose(barMatrix, px, py, pz, rx, ry, rz, barLong, barThin, barThin);
      multiply(barMatrix, viewMatrix, barMatrix);

      ctx.beginPath();
      for (const [a, b] of LINES) {
        const va = VERTICES[a];
        const vb = VERTICES[b];
        ctx.moveTo(
          projectX(barMatrix, va[0], va[1], va[2]),
          projectY(barMatrix, va[0], va[1], va[2]),
        );
        ctx.lineTo(
          projectX(barMatrix, vb[0], vb[1], vb[2]),
          projectY(barMatrix, vb[0], vb[1], vb[2]),
        );
      }
      ctx.stroke();
    }

    // Kembalikan ke default: kalau tidak, clearRect frame berikutnya masih
    // berjalan dalam mode destination-out.
    ctx.globalCompositeOperation = "source-over";
  }

  /* ── Loop ──────────────────────────────────────────────────────────────── */

  return {
    frame(now: number) {
      if (finished) return;

      if (originMs === null) originMs = now;

      if (reduced) {
        // Gambar diam: rakitan lengkap, tanpa gerak sama sekali.
        radius = radiusMax;
        slide = 0;
        spin = 0;
        draw();
        return;
      }

      const sinceStart = now - originMs;

      if (sinceStart < INTRO_MS) {
        const t = sinceStart / INTRO_MS;
        radius = radiusMax * outQuint(t);
        slide = slideFrom * (1 - inOutCubic(t));
        spin = 0;
      } else {
        radius = radiusMax;
        slide = 0;

        // Jam putaran mulai TEPAT saat intro selesai, bukan diturunkan dari
        // originMs: kalau frame pertama datang telat (chunk worker baru
        // selesai diunduh), menurunkannya akan membuat putaran pertama
        // meloncat di tengah alih-alih mulai dari nol.
        if (spinOriginMs === null) spinOriginMs = now;

        const cycle = (now - spinOriginMs) % (SPIN_MS + IDLE_PAUSE_MS);
        // Di luar jendela putaran, sudutnya 0 — dan karena putarannya tepat
        // 360°, akhir putaran dan awal jeda bertemu mulus tanpa lompatan.
        spin = cycle < SPIN_MS ? Math.PI * 2 * inOutExpo(cycle / SPIN_MS) : 0;
      }

      if (outroStartMs !== null) {
        const t = (now - outroStartMs) / OUTRO_MS;
        if (t >= 1) {
          radius = 0;
          finished = true;
          draw();
          return;
        }
        // inOutCubic, bukan outQuint seperti referensi: outQuint mengempis
        // cepat di awal sehingga kantor tersingkap mendadak. Yang ini pelan di
        // kedua ujung — terbaca seperti tirai yang ditutup, bukan dipotong.
        radius = radiusMax * (1 - inOutCubic(t));
      }

      draw();
    },

    resize(width: number, height: number, nextDpr: number) {
      w = width;
      h = height;
      dpr = nextDpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      recompute();
    },

    startOutro(now: number) {
      if (outroStartMs !== null || finished) return;
      if (reduced) {
        // Tidak ada babak penutup di mode ini — LoadingScreen yang meredupkan
        // seluruh overlay lewat CSS.
        finished = true;
        return;
      }
      outroStartMs = now;
    },

    isFinished: () => finished,
  };
}
