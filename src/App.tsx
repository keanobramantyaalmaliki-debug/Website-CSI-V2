import { Routes, Route, Navigate } from "react-router-dom";
import SiteLayout from "@/routes/SiteLayout";
import RoomContent from "@/routes/RoomContent";

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/"         element={<RoomContent room="Lounge" />} />
        <Route path="/services" element={<RoomContent room="Function" />} />
        <Route path="/work"     element={<RoomContent room="Meeting" />} />
        <Route path="/people"   element={<RoomContent room="Office" />} />
        {/* Slug lama (nama ruangan) — tautan yang terlanjur beredar sebelum
            slug konten (19 Agu). Elemen-nya RoomContent SUNGGUHAN, BUKAN
            <Navigate> ke slug baru: pada deep-link, RoomRouteSync sengaja
            menahan URL apa adanya sampai chunk <Scene> tiba (lihat
            roomDeepLink.test.tsx) — <Navigate> di sini akan balapan dengan
            penahan itu. Yang menormalkan URL-nya RoomRouteSync Arah 2, dengan
            `replace`, setelah store-nya sudah konsisten. */}
        <Route path="/office"   element={<RoomContent room="Office" />} />
        <Route path="/meeting"  element={<RoomContent room="Meeting" />} />
        <Route path="/function" element={<RoomContent room="Function" />} />
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
