/**
 * Rangka panel: gerbang sesi, rute, dan satu sumber kebenaran untuk daftar
 * lowongan + angka "belum tayang".
 *
 * Rutenya lewat hash (`#/`, `#/lowongan`, `#/lowongan/baru`,
 * `#/lowongan/ubah/<id>`) dan bukan History API dengan sengaja: `#` tidak
 * pernah sampai ke server, jadi panel ini tetap bisa dimuat ulang di URL mana
 * pun tanpa aturan rewrite di reverse proxy. Situs publiknya sendiri sudah
 * pernah kena bug itu (lihat `public/serve.json`).
 *
 * Rutenya BERTINGKAT: `#/` adalah layar depan, dan tiap entitas hidup di
 * bawah namanya sendiri — persis seperti susunan di menu sisi. Ini yang membuat entitas
 * berikutnya (crew, nilai, industri, …) bisa menempel tanpa menyentuh apa pun
 * di sini kecuali satu baris di `bacaRute` — bukan kebetulan, itu yang
 * dituju: `#/lowongan/ubah/<id>` alih-alih `#/lowongan/<id>` supaya "baru" dan
 * sebuah id tidak pernah bisa saling menyamar.
 */

import { useCallback, useEffect, useState } from "react";

import { ambilLowongan, keluar, siapaAku, statusPublish, type JobRecord, type Pengguna } from "./api";
import { BarPublish } from "./BarPublish";
import { Beranda } from "./Beranda";
import { DaftarLowongan } from "./DaftarLowongan";
import { FormLowongan } from "./FormLowongan";
import { Masuk } from "./Masuk";
import { Sidebar } from "./Sidebar";
import { Kabar } from "./ui";
import { findEntry } from "@shared/contentMap";

type Rute =
  | { nama: "beranda" }
  | { nama: "daftar"; entitas: string }
  | { nama: "form"; entitas: string; id: string | null };

function bacaRute(): Rute {
  const h = window.location.hash.replace(/^#/, "");

  const baru = /^\/([a-z-]+)\/baru$/.exec(h);
  if (baru) return { nama: "form", entitas: baru[1], id: null };

  const ubah = /^\/([a-z-]+)\/ubah\/(.+)$/.exec(h);
  if (ubah) return { nama: "form", entitas: ubah[1], id: ubah[2] };

  const daftar = /^\/([a-z-]+)$/.exec(h);
  /* Entitas yang tidak dikenal peta konten jatuh ke beranda alih-alih layar
     kosong — hash diketik tangan atau tertinggal dari versi panel sebelumnya
     tidak boleh berakhir di halaman buntu. */
  if (daftar && findEntry(daftar[1])?.entry.status === "siap") {
    return { nama: "daftar", entitas: daftar[1] };
  }

  return { nama: "beranda" };
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

  /** Kembali ke daftar entitas yang barusan disunting — bukan ke beranda.
   *  Menyimpan satu lowongan hampir selalu diikuti melihat lowongan lain. */
  function selesai(kabar: string) {
    setPesan(kabar);
    /* Cabang "beranda" tidak pernah terjadi — beranda tidak punya form yang
       bisa selesai. Ia ada semata supaya TypeScript bisa menyempitkan union
       `Rute`, yang cuma sebagian anggotanya punya `entitas`. */
    pergi(rute.nama === "beranda" ? "/" : `/${rute.entitas}`);
    void muat();
  }

  /* Kalimat status hidup untuk beranda. Dihitung di sini, bukan di Beranda,
     karena di sinilah data lowongan sudah ada — beranda tidak perlu ikut tahu
     bentuk `JobRecord`. */
  const draf = daftar.filter((j) => j.state === "draft").length;
  const belumTayang = daftar.filter((j) => j.unpublished).length;
  const keterangan: Record<string, string> = {
    lowongan:
      daftar.length === 0
        ? "Belum ada lowongan."
        : `${daftar.length} lowongan` +
          (draf > 0 ? `, ${draf} masih draf` : "") +
          (belumTayang > 0 ? `, ${belumTayang} belum tayang` : ""),
  };

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

      <div className="rangka">
        <Sidebar
          aktif={rute.nama === "beranda" ? null : rute.entitas}
          onBeranda={() => {
            setPesan(null);
            pergi("/");
          }}
          onBuka={(key) => {
            setPesan(null);
            pergi(`/${key}`);
          }}
        />

        <main className="isi">
          {galat ? <Kabar tegas anak={galat} /> : null}
          {pesan ? <Kabar anak={pesan} /> : null}

          {rute.nama === "beranda" ? (
            <Beranda
              keterangan={keterangan}
              onBuka={(key) => {
                setPesan(null);
                pergi(`/${key}`);
              }}
            />
          ) : rute.nama === "daftar" ? (
            <DaftarLowongan
              daftar={daftar}
              onBaru={() => {
                setPesan(null);
                pergi(`/${rute.entitas}/baru`);
              }}
              onUbah={(id) => {
                setPesan(null);
                pergi(`/${rute.entitas}/ubah/${id}`);
              }}
              onBerubah={selesai}
            />
          ) : (
            <FormLowongan
              /* `key` memaksa form dibangun ulang saat pindah lowongan. Tanpa
                 ini, membuka lowongan B langsung dari lowongan A akan memakai
                 kembali state isian A sampai fetch-nya selesai. */
              key={rute.id ?? "baru"}
              id={rute.id}
              onSelesai={selesai}
              onBatal={() => pergi(`/${rute.entitas}`)}
            />
          )}
        </main>
      </div>

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
