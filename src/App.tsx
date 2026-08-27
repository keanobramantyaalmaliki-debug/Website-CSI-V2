import { Routes, Route, Navigate } from "react-router-dom";
import SiteLayout from "@/routes/SiteLayout";
import RoomContent from "@/routes/RoomContent";
import JobDetail from "@/routes/JobDetail";

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
        {/* Halaman lowongan. Sengaja anak <SiteLayout> yang SAMA, bukan
            cabang route terpisah: keluar-masuk halaman job tidak boleh
            meng-unmount <Canvas> milik Hero — itu berarti office.glb (puluhan
            MB) diunduh & dikompilasi ulang tiap pelamar menekan Back.
            Hero-nya disembunyikan dari dalam SiteLayout, bukan dilepas.

            "/careers" telanjang dialihkan ke section-nya, karena satu-satunya
            daftar lowongan yang ada memang di sana. */}
        <Route path="/careers"       element={<Navigate to="/people#careers" replace />} />
        <Route path="/careers/:slug" element={<JobDetail />} />
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
