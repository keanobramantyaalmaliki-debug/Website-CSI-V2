import type { RoomKey } from "@/lib/store/sceneStore";
import { ROOM_CONTENT } from "@/lib/roomContent";

export default function RoomContent({ room }: { room: RoomKey }) {
  return <>{ROOM_CONTENT[room]}</>;
}
