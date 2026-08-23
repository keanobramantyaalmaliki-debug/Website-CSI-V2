"use client";

import { forwardRef, useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Vec3 } from "cannon-es";
import { DirectionalLight, Group, Mesh, Vector3 } from "three";
import { useSceneStore } from "@/lib/store/sceneStore";
import { useBallMeshes, CUE } from "./Balls";
import Cue from "./Cue";
import {
  BALL_R,
  BOUNDS,
  FELT,
  HEAD_SPOT,
  BALL_Y,
  KITCHEN_Z0,
  clampFreeBall,
  startPositions,
} from "./table";
import {
  BALL_MASS,
  aimDistance,
  createWorld,
  dampAirborne,
  overPocket,
  placeBall,
  removeBall,
  restoreBall,
  type BilliardWorld,
} from "./physics";

/**
 * Lapisan khusus benda dinamis.
 *
 * ⚠️ TEMUAN 6 Agu: skema "lampu ber-layer" ini TIDAK PERNAH JALAN. three
 * menguji layer lampu terhadap layer KAMERA (r185 ~17387), bukan terhadap
 * objek yang disinari — kamera cuma di layer 0, jadi lampu layer 1 tidak
 * pernah dikumpulkan renderer. BilliardLights di bawah tidak menyinari
 * apa-apa; bola tampak seperti sekarang berkat ambient + envmap saja.
 * CharacterLights (kasus kembar) sudah dihapus dari Scene.tsx atas dasar
 * temuan ini. Kalau bola mau disinari beneran: lampu HARUS di layer 0,
 * dan itu menyapu seluruh scene — pagari dengan point light ber-distance.
 */
const DYN_LAYER = 1;

/**
 * Impuls tembakan (N·s) untuk bola 0,17 kg → 0,3 m/s sampai 8,2 m/s.
 *
 * IMPULSE_MAX 1,4 mengikuti referensi elijah-atkins/Billiards: power bar 0–1
 * dikali 1,4, dipakai langsung sebagai besaran impuls, dan massa bolanya
 * kebetulan sama persis 0,17 kg.
 *
 * ⚠️ IMPULSE_MIN dulu 0,25 dan itu terlalu besar — 18% dari MAX, artinya bar
 * di posisi 0% pun sudah melontarkan bola 1,5 m/s. Separuh bawah bar jadi
 * tidak berguna dan tarikan 15% terasa seperti tembakan kuat. Sekarang 0,05
 * (0,3 m/s) — cukup untuk sentuhan halus menempel bola.
 *
 * Kalau ada bola yang lolos dari meja, turunkan MAX — 1,05 (6,2 m/s) adalah
 * setara repo setelah diskalakan ke meja kita yang lebih kecil (~7 kaki vs
 * 9 kaki), dan 0,77 (4,5 m/s) aman tanpa mengandalkan substep.
 */
const IMPULSE_MIN = 0.05;
const IMPULSE_MAX = 1.4;

/**
 * Di bawah ini bola dianggap berhenti (m/s).
 *
 * 0,01 m/s = 10 mm/detik — praktis tak terlihat bergerak. Sebelumnya 0,035
 * (35 mm/detik) dan itu masih jelas terlihat merayap, jadi stik sudah muncul
 * sementara bola putih belum benar-benar diam.
 *
 * ⚠️ Harus LEBIH BESAR dari `sleepSpeedLimit` di physics.ts. Kalau lebih
 * kecil, bola bisa ditidurkan cannon-es (berhenti disimulasikan, kecepatan
 * membeku di atas ambang ini) sementara kita masih menganggapnya bergerak —
 * dan giliran menggantung selamanya.
 */
const REST_SPEED = 0.01;

/**
 * Jeda setelah semua bola diam sebelum giliran dinyatakan selesai (detik).
 *
 * Meniru `turnTimer` di referensi cannon-es. Gunanya meredam kasus bola yang
 * sesaat tampak berhenti — mis. saat menempel di bantalan atau bertumpu pada
 * bola lain — lalu bergerak lagi karena kontak sisa diselesaikan solver. Tanpa
 * jeda, stik sempat muncul lalu bola bergerak lagi, dan itu terlihat seperti
 * bug meski fisikanya benar.
 *
 * Repo memakai 2 detik; di sini 0,4 detik karena minigame ini bagian dari tur
 * kantor dan menunggu 2 detik tiap tembakan terasa lambat.
 */
const SETTLE_DELAY = 0.4;

/**
 * Radius genggam free ball (meter, di bidang XZ). Tekanan yang jatuh lebih
 * dekat dari ini ke bola putih dianggap "pegang bola", sisanya tetap jadi
 * geser-membidik.
 *
 * ⚠️ Harus LEBIH KECIL dari zona mati aim di BilliardHUD (48 px layar ≈
 * 0,07 m pada kamera billiard standar). Kalau lebih besar, ada cincin tempat
 * KEDUANYA aktif: bola ikut pointer sambil stik berputar.
 */
const CUE_GRAB_R = BALL_R * 2.2;

export default function BilliardGame() {
  const active = useSceneStore((s) => s.billiardActive);
  const phase = useSceneStore((s) => s.billiardPhase);
  const setPhase = useSceneStore((s) => s.setBilliardPhase);
  const aimAngle = useSceneStore((s) => s.aimAngle);
  const setPocketed = useSceneStore((s) => s.setPocketed);
  const registerBilliard = useSceneStore((s) => s.registerBilliard);
  const setCueScreen = useSceneStore((s) => s.setCueScreen);
  const ballInHand = useSceneStore((s) => s.ballInHand);
  const setBallInHand = useSceneStore((s) => s.setBallInHand);

  const meshes = useBallMeshes();
  const aimGroup = useRef<Group>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  /** Vektor kerja untuk proyeksi layar — dibuat sekali, bukan tiap frame. */
  const projected = useMemo(() => new Vector3(), []);
  const lastCueScreen = useRef<{ x: number; y: number } | null>(null);
  const aimLine = useRef<Mesh>(null);
  /** Buffer posisi bola untuk uji garis bidik — dipakai ulang tiap frame
   *  supaya tidak mengalokasikan 15 objek 60×/detik. */
  const obstacles = useMemo<{ x: number; z: number }[]>(() => [], []);

  // Dunia fisika dibuat SEKALI. Tidak boleh ikut siklus render React: membuat
  // ulang world berarti semua body hilang di tengah permainan.
  const sim = useRef<BilliardWorld | null>(null);
  if (!sim.current) sim.current = createWorld(startPositions());

  /** Bola yang sudah masuk lubang — meshnya disembunyikan, bodynya dibekukan. */
  const pocketed = useRef<boolean[]>(Array(16).fill(false));

  /** Bola yang baru masuk lubang di giliran ini, diproses setelah semua diam. */
  const pending = useRef<Set<number>>(new Set());

  /** Detik berjalan sejak semua bola terakhir terlihat diam. */
  const settle = useRef(0);

  const onPocket = useCallback(
    (i: number) => {
      if (pending.current.has(i) || pocketed.current[i]) return;
      pending.current.add(i);

      const s = sim.current;
      if (s?.balls[i]) removeBall(s.world, s.balls[i]);

      // Sembunyikan SEKARANG, jangan tunggu giliran selesai.
      //
      // Body-nya memang sudah keluar dari simulasi, tapi posisi terakhirnya
      // tetap tersimpan — yaitu di mulut lubang, setengah menembus badan meja
      // — dan loop sinkronisasi masih menyalinnya ke mesh tiap frame. Tanpa
      // ini bola terlihat menancap di meja sepanjang sisa giliran.
      //
      // Berlaku untuk bola putih juga; meshnya dimunculkan lagi saat respot.
      const m = meshes[i];
      if (m) m.visible = false;
    },
    [meshes],
  );

  // ── Menembak ────────────────────────────────────────────────────────────
  const shoot = useCallback(
    (power: number) => {
      const cue = sim.current?.balls[CUE];
      if (!cue) return;

      const p = Math.max(0, Math.min(1, power));
      // Kuadratik, bukan linear: separuh bawah bar jadi lebih rapat sehingga
      // tembakan pelan mudah diatur, sementara tenaga penuh tetap di ujung.
      // Pemetaan linear membuat tarikan 15% terasa seperti tembakan kuat.
      const mag = IMPULSE_MIN + (IMPULSE_MAX - IMPULSE_MIN) * p * p;

      // Arah diturunkan dari rotasi grup bidik, PERSIS seperti stik & garis
      // bidik digambar (keduanya memanjang ke −Z lokal grup itu).
      //
      // ⚠️ Dulu di sini ditulis { x: sin(a), z: −cos(a) } dan itu SALAH TANDA
      // di sumbu X: rotasi Y three.js memetakan (0,0,−1) → (−sin a, −cos a).
      // Akibatnya tembakan tercermin di sumbu X — pada 90° bola melesat 180°
      // berlawanan dari arah stik, dan hanya kebetulan benar di 0° dan 180°.
      const dir = { x: -Math.sin(aimAngle), z: -Math.cos(aimAngle) };

      cue.wakeUp();
      // Impuls diterapkan di pusat massa: tumbukan stik yang meleset dari pusat
      // akan memberi spin, dan itu justru membuat arah bola sulit ditebak.
      cue.applyImpulse(new Vec3(dir.x * mag, 0, dir.z * mag));
      settle.current = 0;
      // Tembakan pertama mengunci posisi bola — free ball selesai.
      setBallInHand(false);
      setPhase("rolling");
    },
    [aimAngle, setPhase, setBallInHand],
  );

  const reset = useCallback(() => {
    pending.current.clear();
    pocketed.current = Array(16).fill(false);
    setPocketed(0);

    const s = sim.current;
    const pos = startPositions();
    s?.balls.forEach((b, i) => {
      placeBall(b, pos[i]);
      // Bola yang tadi masuk lubang sudah dikeluarkan dari world — pasang lagi.
      restoreBall(s.world, b);
    });
    meshes.forEach((m, i) => {
      if (!m) return;
      m.visible = true;
      // Sinkronkan mesh ke posisi rak SEKARANG juga, jangan tunggu loop.
      // Loop sinkronisasi berhenti saat minigame tidak aktif, jadi tanpa ini
      // bola tetap tergeletak di titik asal (0,0,0) — di lantai sebelah meja
      // — dan terlihat sebagai benda kecil misterius sepanjang tur.
      const b = s?.balls[i];
      if (b) m.position.set(b.position.x, b.position.y, b.position.z);
    });
    setBallInHand(true);
    setPhase("aiming");
  }, [meshes, setPhase, setPocketed, setBallInHand]);

  useEffect(() => {
    registerBilliard({ shoot, reset });
    return () => registerBilliard(null);
  }, [shoot, reset, registerBilliard]);

  // Susun rak saat masuk mode main — DAN sekali di awal begitu mesh siap.
  //
  // Yang di awal itu bukan sekadar jaga-jaga: loop sinkronisasi mesh berhenti
  // saat minigame tidak aktif, jadi tanpa ini keenam belas bola tetap berada
  // di titik asal objek (0,0,0) — tergeletak di lantai sebelah meja — dan
  // terlihat sepanjang tur meski minigame belum pernah dibuka.
  useEffect(() => {
    if (active || meshes.some(Boolean)) reset();
    // `reset` sengaja tidak jadi dependency: identitasnya berubah tiap kali
    // `meshes` berubah, dan itu akan menata ulang rak di tengah permainan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, meshes]);

  // Tarikan stik murni turunan dari bar tenaga — dihitung saat render, bukan
  // disimpan sebagai state tersendiri.
  const shotPower = useSceneStore((s) => s.shotPower);
  const pullback = phase === "aiming" ? shotPower * 0.22 : 0;

  // ── Loop utama ──────────────────────────────────────────────────────────
  useFrame((_, dt) => {
    const s = sim.current;
    if (!s || !active) return;

    // Dijeda saat meja tidak dipakai — tanpa ini 16 body tetap disimulasikan
    // sepanjang kunjungan dan memakan CPU/baterai percuma.
    s.step(Math.min(dt, 0.1));

    // Rusuk sambungan antar-pelat kain sesekali melontarkan bola ke atas, dan
    // dari kamera tegak lurus itu terbaca sebagai bola menembus benda lain.
    // Harus SETELAH step dan SEBELUM salin ke mesh, kalau tidak frame ini
    // sempat menggambar posisi yang melayang. Duduk perkaranya di physics.ts.
    dampAirborne(s);

    // Salin posisi fisika → mesh. Inilah harga memakai cannon-es langsung:
    // tidak ada wrapper R3F yang melakukannya otomatis.
    for (let i = 0; i < meshes.length; i++) {
      const m = meshes[i];
      const b = s.balls[i];
      if (!m || !b) continue;
      m.position.set(b.position.x, b.position.y, b.position.z);
      m.quaternion.set(
        b.quaternion.x,
        b.quaternion.y,
        b.quaternion.z,
        b.quaternion.w,
      );
    }

    // Arahkan grup stik & garis bidik ke posisi bola putih terkini.
    const cue = s.balls[CUE];
    if (aimGroup.current && cue) {
      aimGroup.current.position.set(cue.position.x, cue.position.y, cue.position.z);
      aimGroup.current.rotation.y = aimAngle;
    }

    // Panjang garis bidik = jarak ke rintangan pertama (bola lain / bantalan).
    // Diperbarui lewat ref, bukan state: ini berjalan tiap frame.
    if (aimLine.current && cue && phase === "aiming") {
      // Arah SAMA dengan yang dipakai shoot() — turunan dari rotasi grup.
      const dir = { x: -Math.sin(aimAngle), z: -Math.cos(aimAngle) };

      obstacles.length = 0;
      for (let i = 1; i < s.balls.length; i++) {
        if (pocketed.current[i] || pending.current.has(i)) continue;
        const b = s.balls[i];
        if (b) obstacles.push({ x: b.position.x, z: b.position.z });
      }

      const len = aimDistance(
        { x: cue.position.x, z: cue.position.z },
        dir,
        obstacles,
        3,
      );
      // Geometri sepanjang 1 satuan ke −Z: skala = panjang, dan pusatnya
      // digeser setengah panjang supaya pangkal tetap menempel di bola.
      aimLine.current.scale.z = Math.max(len, 0.001);
      aimLine.current.position.z = -len / 2;
    }

    // Proyeksikan bola putih ke koordinat piksel supaya HUD (di DOM, di luar
    // Canvas) bisa menghitung sudut kursor terhadapnya saat membidik.
    //
    // Hanya saat membidik dan hanya kalau bergeser >1 px: setCueScreen memicu
    // render React, dan memanggilnya 60×/detik sepanjang bola menggelinding
    // akan membebani UI tanpa guna — HUD cuma memerlukannya saat aiming.
    if (cue && phase === "aiming") {
      projected.set(cue.position.x, cue.position.y, cue.position.z);
      projected.project(camera);
      const sx = (projected.x * 0.5 + 0.5) * size.width;
      const sy = (-projected.y * 0.5 + 0.5) * size.height;
      const prev = lastCueScreen.current;
      if (!prev || Math.abs(prev.x - sx) > 1 || Math.abs(prev.y - sy) > 1) {
        lastCueScreen.current = { x: sx, y: sy };
        setCueScreen({ x: sx, y: sy });
      }
    }

    if (phase !== "rolling") return;

    let moving = false;
    for (let i = 0; i < s.balls.length; i++) {
      const b = s.balls[i];
      if (!b || pocketed.current[i] || pending.current.has(i)) continue;

      // Masuk lubang: bola sudah turun di bawah kain DAN lintasannya melewati
      // mulut lubang. Detailnya di `overPocket` — collider kain memang
      // berlubang di sana, jadi bola benar-benar kehilangan tumpuan.
      if (overPocket(b)) {
        onPocket(i);
        continue;
      }

      // Jaring pengaman, dua arah kabur:
      //  • JATUH — lolos lewat tepi meja.
      //  • MENDATAR — pada tembakan keras bola bisa menembus bantalan lalu
      //    meluncur di lantai TANPA pernah turun; tanpa cek BOUNDS giliran
      //    menggantung selamanya.
      if (
        b.position.y < FELT.y - 0.35 ||
        b.position.x < BOUNDS.x0 || b.position.x > BOUNDS.x1 ||
        b.position.z < BOUNDS.z0 || b.position.z > BOUNDS.z1
      ) {
        onPocket(i);
        continue;
      }

      const v = b.velocity;
      const speed = Math.hypot(v.x, v.y, v.z);

      if (speed > REST_SPEED) {
        moving = true;
        break;
      }

      // Sudah di bawah ambang → hentikan betul, jangan biarkan merayap.
      //
      // Meniru gesekan statis: di meja sungguhan bola tidak melambat
      // asimptotik sampai nol, ia berhenti. Tanpa ini damping butuh ~1,8 detik
      // untuk meluruh dari 35 mm/s ke 10 mm/s, dan selama itu bola terlihat
      // merambat pelan — persis yang bikin transisi ke fase membidik terasa
      // menggantung.
      if (speed > 0) {
        b.velocity.setZero();
        b.angularVelocity.setZero();
      }
    }
    if (moving) {
      settle.current = 0;
      return;
    }

    // Semua diam — tapi tunggu sesaat dulu. Bola bisa tampak berhenti lalu
    // bergerak lagi saat solver menyelesaikan kontak sisa.
    settle.current += dt;
    if (settle.current < SETTLE_DELAY) return;
    settle.current = 0;

    // Semua diam → selesaikan giliran.
    if (pending.current.size) {
      let cueWentIn = false;
      pending.current.forEach((i) => {
        if (i === CUE) {
          cueWentIn = true;
        } else {
          pocketed.current[i] = true;
          const m = meshes[i];
          if (m) m.visible = false;
        }
      });
      pending.current.clear();

      const count = pocketed.current.filter(Boolean).length;
      setPocketed(count);

      // Bola putih masuk lubang → dikembalikan ke head spot sebagai FREE BALL:
      // pemain boleh menggesernya di zona kitchen sebelum menembak lagi.
      if (cueWentIn && cue) {
        placeBall(cue, [HEAD_SPOT[0], BALL_Y, HEAD_SPOT[2]]);
        restoreBall(s.world, cue);
        const cm = meshes[CUE];
        if (cm) cm.visible = true;
        setBallInHand(true);
      }

      // Semua 15 bola habis → tata ulang otomatis supaya pemain bisa langsung
      // break lagi tanpa harus menekan reset.
      if (count >= 15) {
        reset();
        return;
      }
    }
    setPhase("aiming");
  });

  // Stik & garis bidik hanya muncul saat minigame BENAR-BENAR dibuka.
  //
  // `phase` sudah bernilai "aiming" sejak rak ditata di awal, dan grup bidik
  // baru diposisikan di dalam useFrame yang berhenti saat minigame tidak
  // aktif — tanpa syarat `active`, stik tergeletak di titik asal (0,0,0) di
  // lantai sebelah meja sepanjang tur.
  const aiming = active && phase === "aiming";

  // ── Free ball: geser bola putih di zona kitchen ─────────────────────────
  //
  // Drag ditangkap bidang raycast tak terlihat di atas felt (bukan listener
  // window seperti aim di HUD): `e.point` langsung memberi posisi DUNIA di
  // bidang meja, tanpa perlu unproject manual dari piksel. Genggaman hanya
  // dimulai kalau tekanan jatuh dekat bola putih — sisanya dibiarkan lolos
  // supaya geser-membidik milik HUD tetap jalan di atas felt.
  const draggingCue = useRef(false);

  const beginCueDrag = useCallback((e: ThreeEvent<PointerEvent>) => {
    const cue = sim.current?.balls[CUE];
    if (!cue) return;
    const dx = e.point.x - cue.position.x;
    const dz = e.point.z - cue.position.z;
    if (dx * dx + dz * dz > CUE_GRAB_R * CUE_GRAB_R) return;
    draggingCue.current = true;
    // Capture: pointer yang keluar dari bidang (mis. tarikan cepat melewati
    // bantalan) tetap mengalirkan move/up ke sini, tidak nyangkut di tengah.
    (e.target as Element).setPointerCapture?.(e.pointerId);
    e.stopPropagation();
  }, []);

  const moveCueDrag = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!draggingCue.current) return;
    const s = sim.current;
    const cue = s?.balls[CUE];
    if (!s || !cue) return;

    const [x, z] = clampFreeBall(e.point.x, e.point.z);

    // Jangan taruh menimpa bola lain: posisi yang tumpang tindih DIABAIKAN
    // (bola berhenti di posisi sah terakhir), bukan didorong solver — solver
    // yang menyelesaikan dua bola saling tembus akan meledakkannya keluar.
    const minD2 = (BALL_R * 2 + 0.001) ** 2;
    for (let i = 1; i < s.balls.length; i++) {
      if (pocketed.current[i] || pending.current.has(i)) continue;
      const b = s.balls[i];
      if (!b) continue;
      const ddx = b.position.x - x;
      const ddz = b.position.z - z;
      if (ddx * ddx + ddz * ddz < minD2) return;
    }

    placeBall(cue, [x, BALL_Y, z]);
  }, []);

  const endCueDrag = useCallback(() => {
    draggingCue.current = false;
  }, []);

  const freeBall = aiming && ballInHand;

  return (
    <>
      <BilliardLights meshes={meshes} />
      {freeBall && (
        <group>
          {/* Bidang tangkap drag — tak terlihat (raycast three tidak peduli
              visible), sedikit lebih luas dari felt supaya tarikan yang
              melewati bantalan tetap terbaca lalu dijepit clampFreeBall. */}
          <mesh
            position={[
              (FELT.x0 + FELT.x1) / 2,
              FELT.y + 0.002,
              (FELT.z0 + FELT.z1) / 2,
            ]}
            rotation-x={-Math.PI / 2}
            visible={false}
            onPointerDown={beginCueDrag}
            onPointerMove={moveCueDrag}
            onPointerUp={endCueDrag}
            onPointerCancel={endCueDrag}
          >
            <planeGeometry
              args={[FELT.x1 - FELT.x0 + 0.6, FELT.z1 - FELT.z0 + 0.6]}
            />
          </mesh>

          {/* Garis batas zona kitchen (head string) — penanda "sampai mana
              bola boleh digeser". Sorotan bidang zona pernah ada dan DICABUT
              atas permintaan Keano: mewarnai 35% meja terlalu ramai, garis
              saja sudah cukup terbaca. */}
          <mesh
            position={[(FELT.x0 + FELT.x1) / 2, FELT.y + 0.0015, KITCHEN_Z0]}
            rotation-x={-Math.PI / 2}
            renderOrder={2}
          >
            <planeGeometry args={[FELT.x1 - FELT.x0, 0.006]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.4}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
      {meshes.map((m, i) =>
        m ? <primitive key={i} object={m} /> : null,
      )}

      {/* Grup ini mengikuti bola putih dan berputar ke arah bidik, jadi stik
          dan garis bidik cukup digambar di ruang lokalnya. */}
      <group ref={aimGroup}>
        <Cue visible={aiming} pullback={pullback} />
        {aiming && <AimLine ref={aimLine} />}
      </group>
    </>
  );
}

/**
 * Garis bidik — berhenti di rintangan pertama, seperti laser.
 *
 * Digambar di ruang lokal grup bidik (selalu lurus ke −Z), jadi panjangnya
 * cukup diatur lewat skala; geometrinya sendiri sepanjang 1 satuan dan tidak
 * pernah dibangun ulang.
 *
 * Panjangnya diperbarui lewat ref di dalam useFrame, BUKAN lewat state React —
 * mengubah state 60×/detik akan memicu render ulang seluruh pohon komponen.
 */
const AimLine = forwardRef<Mesh>(function AimLine(_, ref) {
  return (
    <mesh ref={ref} position={[0, 0, -0.5]} renderOrder={2}>
      {/* Panjang 1 di sumbu Z, titik acuan di tengah. Skala Z = jarak, dan
          posisinya digeser setengahnya supaya pangkal tetap di bola. */}
      <boxGeometry args={[0.004, 0.004, 1]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.35} toneMapped={false} />
    </mesh>
  );
});

/**
 * Cahaya khusus bola.
 *
 * Kantor ini 100% baked (291 objek statis, nol lampu realtime) — menambah
 * lampu biasa pernah menjatuhkan FPS dari 50-60 ke 14 karena three menghitung
 * ulang semua objek itu. `layers.set(1)` membuat lampu ini HANYA menyentuh
 * benda yang ikut mendaftar di lapisan 1, yaitu bola & stik.
 */
function BilliardLights({ meshes }: { meshes: (Mesh | null)[] }) {
  const lightRef = useRef<DirectionalLight>(null);

  useEffect(() => {
    lightRef.current?.layers.set(DYN_LAYER);
  }, []);

  // Daftarkan bola ke lapisan 1.
  //
  // ⚠️ JANGAN kembalikan ini ke `useFrame` + `scene.traverse()` pencari nama
  // "Ball"/"Cone" (bentuk aslinya sampai 31 Jul). Alasannya bukan selera:
  //
  //   1. Ia tidak digerbangi `active`, jadi ia menyapu SELURUH graph 60×/detik
  //      sepanjang tur, meski minigame tak pernah dibuka. Penjaga
  //      `userData.dynLit` cuma melewati isi loop — traversalnya tetap penuh.
  //   2. Sapuan itu sia-sia total: office.glb punya 656 node dan NOL di
  //      antaranya berawalan "Ball"/"Cone" (diperiksa dari header GLB).
  //
  // `meshes` dari useBallMeshes() sudah persis himpunan yang dicari, dan
  // identitasnya baru berubah saat GLB selesai dimuat — itulah yang dulu
  // membuat one-shot useEffect terasa tidak cukup. Menjadikannya dependensi
  // menyelesaikan hal yang sama tanpa ongkos per-frame.
  //
  // Stik TIDAK didaftarkan di sini, sama seperti sebelumnya: Cue.tsx membangun
  // `new Mesh(...)` yang namanya kosong, jadi filter lama pun tak pernah
  // menjangkaunya. Perilakunya sengaja dipertahankan apa adanya.
  useEffect(() => {
    for (const m of meshes) m?.layers.enable(DYN_LAYER);
  }, [meshes]);

  return (
    <directionalLight
      ref={lightRef}
      position={[0.375, 2.4, -1.2]}
      intensity={2.2}
      color="#fff4e0"
    />
  );
}
