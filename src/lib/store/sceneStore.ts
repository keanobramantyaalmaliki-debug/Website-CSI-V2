import { create } from "zustand";

export const VIEW_KEYS = ["Office", "Lounge", "Meeting", "Function", "Pantry"] as const;
export type RoomKey = (typeof VIEW_KEYS)[number];

interface SceneStore {
  currentRoom: RoomKey;
  setCurrentRoom: (room: RoomKey) => void;
  heroInView: boolean;
  setHeroInView: (inView: boolean) => void;
  // scrollspy: id section konten yang sedang di viewport (null saat di hero)
  activeSection: string | null;
  setActiveSection: (id: string | null) => void;
  // goTo is registered by CameraController once the R3F canvas is ready
  goTo: ((room: RoomKey) => void) | null;
  registerGoTo: (fn: (room: RoomKey) => void) => void;
}

export const useSceneStore = create<SceneStore>((set) => ({
  currentRoom: "Office",
  setCurrentRoom: (room) => set({ currentRoom: room }),
  heroInView: true,
  setHeroInView: (inView) => set({ heroInView: inView }),
  activeSection: null,
  setActiveSection: (id) => set({ activeSection: id }),
  goTo: null,
  registerGoTo: (fn) => set({ goTo: fn }),
}));
