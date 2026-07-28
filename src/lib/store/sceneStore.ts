import { create } from "zustand";

export const VIEW_KEYS = ["Office", "Lounge", "Meeting", "Function", "Pantry"] as const;
export type RoomKey = (typeof VIEW_KEYS)[number];

interface SceneStore {
  currentRoom: RoomKey;
  setCurrentRoom: (room: RoomKey) => void;
  // goTo is registered by CameraController once the R3F canvas is ready
  goTo: ((room: RoomKey) => void) | null;
  registerGoTo: (fn: (room: RoomKey) => void) => void;
}

export const useSceneStore = create<SceneStore>((set) => ({
  currentRoom: "Office",
  setCurrentRoom: (room) => set({ currentRoom: room }),
  goTo: null,
  registerGoTo: (fn) => set({ goTo: fn }),
}));
