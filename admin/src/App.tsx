/**
 * Rangka panel: gerbang sesi, rute, dan satu sumber kebenaran untuk daftar
 * lowongan + angka "belum tayang".
 *
 * Rutenya lewat hash (`#/`, `#/baru`, `#/lowongan/<id>`) dan bukan History API
 * dengan sengaja: `#` tidak pernah sampai ke server, jadi panel ini tetap bisa
 * dimuat ulang di URL mana pun tanpa aturan rewrite di reverse proxy. Situs
 * publiknya sendiri sudah pernah kena bug itu (lihat `public/serve.json`).
 */

import { useCallback, useEffect, useState } from "react";

import { ambilLowongan, keluar, siapaAku, statusPublish, type JobRecord, type Pengguna } from "./api";
import { BarPublish } from "./BarPublish";
import { DaftarLowongan } from "./DaftarLowongan";
import { FormLowongan } from "./FormLowongan";
import { Masuk } from "./Masuk";
import { Kabar } from "./ui";

type Rute = { nama: "daftar" } | { nama: "form"; id: string | null };

function bacaRute(): Rute {
  const h = window.location.hash.replace(/^#/, "");
  if (h === "/baru") return { nama: "form", id: null };
  const cocok = /^\/lowongan\/(.+)$/.exec(h);
  if (cocok) return { nama: "form", id: cocok[1] };
  return { nama: "daftar" };
}

export function App() {
  /* `undefined` = belum tahu (masih menanyakan sesi ke server), `null` = tamu.
     Dibedakan supaya layar masuk tidak berkedip muncul sepersekian detik untuk
     orang yang sebenarnya sudah login. */
  const [user, setUser] = useState<Pengguna | undefined>(undefined);
  const [rute, setRute] = useState<Rute>(bacaRute);
  const [daftar, setDaftar] = useState<JobRecord[]>([]);
  const [pending, setPending] = useState(0);
  const [pesan, setPesan] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    const dengar = () => setRute(bacaRute());
    window.addEventListener("hashchange", dengar);
    return () => window.removeEventListener("hashchange", dengar);
  }, []);

  useEffect(() => {
    void siapaAku().then((h) => setUser(h.ok ? h.data.user : null));
  }, []);

  /** Ambil ulang daftar + angka publish dari server. Sengaja tidak pernah
   *  menebak keduanya di sisi klien: angka "belum tayang" dihitung dari
   *  perbandingan waktu di database, dan tebakan lokal akan meleset begitu ada
   *  orang kedua yang ikut mengedit. */
  const muat = useCallback(async () => {
    const [hJobs, hPending] = await Promise.all([ambilLowongan(), statusPublish()]);

    if (!hJobs.ok) {
      if (hJobs.perluMasuk) {
        setUser(null);
        return;
      }
      setGalat(hJobs.pesan);
      return;
    }
    setGalat(null);
    setDaftar(hJobs.data.jobs);
    if (hPending.ok) setPending(hPending.data.pending);
  }, []);

  useEffect(() => {
    if (user) void muat();
  }, [user, muat]);

  function pergi(ke: string) {
    window.location.hash = ke;
  }

  function selesai(kabar: string) {
    setPesan(kabar);
    pergi("/");
    void muat();
  }

  if (user === undefined) return <div className="bungkus">Memuat…</div>;
  if (user === null) return <Masuk onMasuk={(u) => setUser(u)} />;

  return (
    <div className="bungkus">
      <div className="kepala">
        <h1>Kelola Konten Cogniti</h1>
        <span className="siapa">
          {user.name}{" "}
          <button
            type="button"
            className="polos"
            onClick={() => void keluar().then(() => setUser(null))}
          >
            Keluar
          </button>
        </span>
      </div>

      {galat ? <Kabar tegas anak={galat} /> : null}
      {pesan ? <Kabar anak={pesan} /> : null}

      {rute.nama === "daftar" ? (
        <DaftarLowongan
          daftar={daftar}
          onBaru={() => {
            setPesan(null);
            pergi("/baru");
          }}
          onUbah={(id) => {
            setPesan(null);
            pergi(`/lowongan/${id}`);
          }}
          onBerubah={selesai}
        />
      ) : (
        <FormLowongan
          /* `key` memaksa form dibangun ulang saat pindah lowongan. Tanpa ini,
             membuka lowongan B langsung dari lowongan A akan memakai kembali
             state isian A sampai fetch-nya selesai. */
          key={rute.id ?? "baru"}
          id={rute.id}
          onSelesai={selesai}
          onBatal={() => pergi("/")}
        />
      )}

      <BarPublish
        pending={pending}
        onSelesai={(kabar) => {
          setPesan(kabar);
          void muat();
        }}
      />
    </div>
  );
}
