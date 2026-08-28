"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  useReducedMotion,
  type PanInfo,
} from "motion/react";
import { FadeUpItem } from "@/components/motion/FadeUp";
import CrewAvatar from "@/components/sections/CrewAvatar";
import type { TeamMember } from "@/data/people";

const AUTO_ADVANCE_MS = 30000;
const SWIPE_DISTANCE_THRESHOLD = 100;
const SWIPE_VELOCITY_THRESHOLD = 500;
const FLY_OUT_DISTANCE = 400;
const STACK_DEPTH = 3;
/** Lemparan dan naiknya dek berbagi durasi ini — lihat `deckPose`. */
const THROW_SECONDS = 0.25;

/**
 * Pose satu kartu di dek menurut kedalamannya (0 = kartu aktif).
 *
 * Dipakai DUA KALI dan itu memang intinya: kartu peek menganimasikan posenya
 * dari `depth` ke `depth - 1` selama lemparan, jadi saat indeks akhirnya
 * pindah, kartu pendaratan sudah duduk PERSIS di pose kartu aktif. Elemennya
 * memang berganti di titik itu (div peek → ActiveCard), tapi posenya sama,
 * jadi tidak ada frame yang meloncat. Sebelum ini dek diam selama lemparan
 * lalu melompat dalam satu frame — terukur 28 Agu: lebar 351.4→366, top
 * 191.9→174.3, opacity 0.75→1, nol frame di antaranya ("flick").
 */
function deckPose(depth: number) {
  const d = Math.max(0, depth);
  return { y: d * 8, scale: 1 - d * 0.04, opacity: 1 - d * 0.25 };
}

export function resolveSwipeDirection(
  offsetX: number,
  velocityX: number,
): "left" | "right" | null {
  const pastThreshold =
    Math.abs(offsetX) > SWIPE_DISTANCE_THRESHOLD ||
    Math.abs(velocityX) > SWIPE_VELOCITY_THRESHOLD;
  if (!pastThreshold) return null;
  return offsetX < 0 ? "left" : "right";
}

/**
 * Swipe RIGHT advances to the card peeking under the deck; swipe LEFT goes
 * back to the previous person. Keano's spec (27 Agu): the card revealed
 * behind during the drag must be the card you land on, so the advance
 * direction is the one that throws the active card off the deck.
 */
export function resolveSwipeStep(direction: "left" | "right"): number {
  return direction === "right" ? 1 : -1;
}

/**
 * Kartu yang mengintip di bawah dek — ARAHNYA IKUT GESERAN, bukan selalu
 * `active + 1`. Peek adalah PREVIEW: yang terlihat saat menggeser wajib sama
 * dengan yang didarati saat dilepas. Dek yang membeku di `+1` itulah bug
 * laporan Keano (28 Agu): dari Fahmi, geser kiri memperlihatkan Imam Maliki
 * (`+1`) tapi mendarat di Roni (`-1`, membungkus ke ujung daftar).
 *
 * `dragDir` 0 = diam / lempar otomatis: dek memakai arah maju (+1), sama
 * seperti sebelum ada geseran.
 */
export function resolvePeekIndexes(
  active: number,
  length: number,
  count: number,
  dragDir: -1 | 0 | 1,
): number[] {
  const step = dragDir === -1 ? -1 : 1;
  return Array.from({ length: count }, (_, i) => {
    const raw = active + step * (i + 1);
    return ((raw % length) + length) % length;
  });
}

function CrewCard({ member }: { member: TeamMember }) {
  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-surface-1 p-4">
      <CrewAvatar photoUrl={member.photoUrl} name={member.name} />
      <div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-600">
          {member.category}
        </p>
        <h3 className="mt-1 text-lg font-medium text-zinc-100">{member.name}</h3>
        <p className="mt-0.5 text-sm text-zinc-500">{member.role}</p>
      </div>
      {member.social && (
        <div className="flex gap-4">
          {member.social.map((s) => (
            <a
              key={s.platform}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] uppercase tracking-wider text-zinc-600 transition-colors duration-200 hover:text-zinc-300"
            >
              {s.platform}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export type ActiveCardHandle = {
  /** Plays the same fly-out-right advance animation as a manual swipe, for autoplay. */
  autoAdvance: () => void;
};

const ActiveCard = forwardRef<
  ActiveCardHandle,
  {
    member: TeamMember;
    onSwiped: (direction: "left" | "right") => void;
    onDragStart: () => void;
    onDragSettle: () => void;
    reduced: boolean;
    /** Reports which way the drag is heading so the deck can preview it. */
    onPreviewDirection: (dir: -1 | 0 | 1) => void;
    /** Fires when the throw starts, so the deck rises alongside it. */
    onThrowStart: () => void;
  }
>(function ActiveCard(
  {
    member,
    onSwiped,
    onDragStart,
    onDragSettle,
    reduced,
    onPreviewDirection,
    onThrowStart,
  },
  ref,
) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const flyOut = (direction: "left" | "right") => {
    if (reduced) {
      onSwiped(direction);
      return;
    }
    // Diumumkan di sini, bukan di `handleDragEnd`, supaya lemparan otomatis
    // (autoplay) ikut menaikkan dek dengan gerakan yang sama.
    onThrowStart();
    const target = direction === "left" ? -FLY_OUT_DISTANCE : FLY_OUT_DISTANCE;
    animate(x, target, { duration: THROW_SECONDS, ease: "easeOut" }).then(() => {
      onSwiped(direction);
    });
  };

  useImperativeHandle(ref, () => ({
    autoAdvance: () => flyOut("right"),
  }));

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const direction = resolveSwipeDirection(info.offset.x, info.velocity.x);

    if (!direction) {
      // Batal: kartu pegas balik, jadi dek harus segera kembali ke arah maju.
      onPreviewDirection(0);
      onDragSettle();
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
      return;
    }

    // Dua arah diperlakukan SAMA: kartu aktif dilempar keluar dek, menyingkap
    // peek di bawahnya — dan peek itu memang kartu yang didarati, karena dek
    // sudah ikut arah geseran sejak `onDrag` pertama. Arah `preview` SENGAJA
    // tidak di-reset di sini: reset-nya menunggu indeksnya benar-benar pindah
    // (`handleSwiped`), kalau tidak dek balik ke `+1` di tengah lemparan dan
    // kartu yang salah tersingkap selama 250ms terakhir.
    onDragSettle();
    flyOut(direction);
  };

  return (
    <FadeUpItem tag="article" className="relative">
      <motion.article
        tabIndex={0}
        drag={reduced ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        style={reduced ? undefined : { x, rotate, opacity }}
        onDragStart={onDragStart}
        onDrag={(_event, info) =>
          onPreviewDirection(
            info.offset.x < 0 ? -1 : info.offset.x > 0 ? 1 : 0,
          )
        }
        onDragEnd={handleDragEnd}
        className="cursor-grab touch-pan-y active:cursor-grabbing"
      >
        <CrewCard member={member} />
      </motion.article>
    </FadeUpItem>
  );
});

/**
 * Tinder-style draggable card stack, replacing the previous CSS scroll-snap
 * carousel. Geser KANAN maju satu orang, geser KIRI mundur satu orang; kedua
 * arah melempar kartu aktif keluar dek dan menyingkap peek di bawahnya.
 *
 * Aturan yang mengikat seluruh berkas ini: PEEK ADALAH PREVIEW — kartu yang
 * tersingkap selama geseran wajib kartu yang didarati. Dek karenanya ikut
 * arah geseran lewat `dragDir` (lihat `resolvePeekIndexes`), dan tidak ada
 * lagi sapuan-masuk-dari-kiri untuk gerakan mundur: sapuan itu memaksa kartu
 * pendaratan bersembunyi dulu di luar layar, jadi mustahil disatukan dengan
 * peek yang benar.
 */
export default function TheCrewMobileCarousel({ people }: { people: TeamMember[] }) {
  const [active, setActive] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // Arah geseran yang sedang berjalan; menentukan siapa yang mengintip di
  // bawah dek. Disalin ke ref supaya `onDrag` — yang menyala tiap frame
  // pointer — cuma memicu render saat TANDANYA berubah, bukan tiap pixel.
  const [dragDir, setDragDir] = useState<-1 | 0 | 1>(0);
  const dragDirRef = useRef<-1 | 0 | 1>(0);
  // Kartu aktif sedang terbang keluar: dek naik satu tingkat selama itu.
  const [throwing, setThrowing] = useState(false);
  const reduced = !!useReducedMotion();
  const activeCardRef = useRef<ActiveCardHandle>(null);

  const setPreviewDirection = (dir: -1 | 0 | 1) => {
    if (dragDirRef.current === dir) return;
    dragDirRef.current = dir;
    setDragDir(dir);
  };

  const goTo = (index: number) => {
    setPreviewDirection(0);
    setThrowing(false);
    setActive(((index % people.length) + people.length) % people.length);
  };

  const handleSwiped = (direction: "left" | "right") => {
    goTo(active + resolveSwipeStep(direction));
  };

  // Filter tabs change the `people` array — reset to the first matching
  // person instead of leaving `active` pointing past the new (shorter) list
  // or at an unrelated person.
  useEffect(() => {
    setActive(0);
    setPreviewDirection(0);
    setThrowing(false);
  }, [people]);

  // Idle user (no drag) still gets the swipe-right throw animation, not an
  // instant index jump — same motion as a manual advance, just automated.
  // Re-arms on every `active` change (timer tick or manual swipe) — avoids
  // stale closures, same pattern as CaseGrid's fan slider.
  useEffect(() => {
    if (reduced || people.length <= 1 || isDragging) return;
    const id = setInterval(() => {
      activeCardRef.current?.autoAdvance();
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [active, reduced, people.length, isDragging]);

  const activeMember = people[active];
  const stack = resolvePeekIndexes(
    active,
    people.length,
    Math.max(0, Math.min(STACK_DEPTH, people.length) - 1),
    dragDir,
  ).map((i) => people[i]);

  return (
    <div data-testid="crew-mobile-carousel" className="relative">
      {/* Peek cards behind the active one, back-to-front so the deck reads
          correctly. `initial` = pose kedalamannya sendiri supaya kartu yang
          baru mount tidak ikut beranimasi; `animate` naik satu tingkat
          selama lemparan, jadi kartu pendaratan sampai di pose kartu aktif
          tepat saat indeksnya pindah. */}
      {stack
        .slice()
        .reverse()
        .map((member, i) => {
          const depth = stack.length - i;
          return (
            <motion.div
              key={member.name}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              initial={deckPose(depth)}
              animate={deckPose(throwing ? depth - 1 : depth)}
              transition={
                reduced
                  ? { duration: 0 }
                  : { duration: THROW_SECONDS, ease: "easeOut" }
              }
            >
              <CrewCard member={member} />
            </motion.div>
          );
        })}

      {activeMember && (
        <ActiveCard
          key={activeMember.name}
          ref={activeCardRef}
          member={activeMember}
          onSwiped={handleSwiped}
          onDragStart={() => {
            setPreviewDirection(0);
            setIsDragging(true);
          }}
          onDragSettle={() => setIsDragging(false)}
          reduced={reduced}
          onPreviewDirection={setPreviewDirection}
          onThrowStart={() => setThrowing(true)}
        />
      )}
    </div>
  );
}
