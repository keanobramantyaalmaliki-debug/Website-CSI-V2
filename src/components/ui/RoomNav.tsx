"use client";

import { useSceneStore, VIEW_KEYS, type RoomKey } from "@/lib/store/sceneStore";
import { VIEWS } from "@/components/canvas/CameraController";

const ROOM_LABELS: Record<RoomKey, string> = {
  Office:   "Office",
  Lounge:   "Lounge",
  Meeting:  "Meeting",
  Function: "Function",
  Pantry:   "Pantry",
};

export default function RoomNav() {
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const goTo        = useSceneStore((s) => s.goTo);
  const heroInView  = useSceneStore((s) => s.heroInView);

  return (
    <>
      {/* Nav bars — right side */}
      <nav className={[
        "fixed right-6 top-1/2 z-20 flex -translate-y-1/2 flex-col items-end gap-4 transition-opacity duration-300",
        heroInView ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
      ].join(" ")}>
        {VIEW_KEYS.map((key) => {
          const disabled = !!VIEWS[key].disabled;
          const active   = key === currentRoom;

          return (
            <button
              key={key}
              disabled={disabled}
              onClick={() => !disabled && goTo?.(key)}
              className={[
                "group flex items-center gap-3",
                disabled ? "cursor-default opacity-20" : "cursor-pointer",
              ].join(" ")}
              aria-label={key}
            >
              {/* label — visible on hover or active */}
              <span className={[
                "text-[9px] uppercase tracking-[1.5px] transition-all duration-200",
                active
                  ? "text-white/70 opacity-100"
                  : "text-white/30 opacity-0 group-hover:opacity-100",
                disabled ? "!opacity-0" : "",
              ].join(" ")}>
                {ROOM_LABELS[key]}
              </span>

              {/* bar indicator */}
              <span className={[
                "w-[2px] rounded-full transition-all duration-300",
                active
                  ? "h-5 bg-white"
                  : disabled
                    ? "h-2 bg-white/20"
                    : "h-2 bg-white/30 group-hover:h-3.5 group-hover:bg-white/60",
              ].join(" ")} />
            </button>
          );
        })}
      </nav>

      {/* Scroll hint — only on first room, only when Hero is visible */}
      {currentRoom === "Office" && heroInView && (
        <div className="pointer-events-none fixed bottom-7 left-1/2 z-20 -translate-x-1/2 select-none text-center">
          <p className="text-[9px] uppercase tracking-[2.5px] text-white/30">
            Scroll to Explore
          </p>
          <span className="mt-1 block animate-bounce text-sm text-white/30">↓</span>
        </div>
      )}
    </>
  );
}
