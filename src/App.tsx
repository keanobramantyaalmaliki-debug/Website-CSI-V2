import { Routes, Route, Navigate } from "react-router-dom";
import SiteLayout from "@/routes/SiteLayout";
import RoomContent from "@/routes/RoomContent";

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/"         element={<RoomContent room="Lounge" />} />
        <Route path="/office"   element={<RoomContent room="Office" />} />
        <Route path="/meeting"  element={<RoomContent room="Meeting" />} />
        <Route path="/function" element={<RoomContent room="Function" />} />
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
