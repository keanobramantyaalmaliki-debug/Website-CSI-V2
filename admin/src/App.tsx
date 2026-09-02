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

import {
  ambilCrew,
  ambilDeployment,
  ambilFooter,
  ambilIndustri,
  ambilLowongan,
  ambilNilai,
  ambilProses,
  ambilProyek,
  ambilCaseStudy,
  ambilLayanan,
  ambilTestimoni,
  ambilVisi,
  keluar,
  siapaAku,
  statusPublish,
  type CrewRecord,
  type DeploymentRecord,
  type FooterRecord,
  type IndustryRecord,
  type JobRecord,
  type Pengguna,
  type ProcessStepRecord,
  type ValueRecord,
  type WorkProjectRecord,
  type CaseStudyRecord,
  type TestimonialRecord,
  type ServiceRecord,
  type VisionRecord,
} from "./api";
import { BarPublish } from "./BarPublish";
import { Beranda } from "./Beranda";
import { DaftarCrew } from "./DaftarCrew";
import { DaftarDeployment } from "./DaftarDeployment";
import { DaftarIndustri } from "./DaftarIndustri";
import { DaftarLowongan } from "./DaftarLowongan";
import { DaftarNilai } from "./DaftarNilai";
import { DaftarProses } from "./DaftarProses";
import { DaftarProyek } from "./DaftarProyek";
import { DaftarCaseStudy } from "./DaftarCaseStudy";
import { DaftarLayanan } from "./DaftarLayanan";
import { DaftarTestimoni } from "./DaftarTestimoni";
import { FormCrew } from "./FormCrew";
import { FormDeployment } from "./FormDeployment";
import { FormFooter } from "./FormFooter";
import { FormIndustri } from "./FormIndustri";
import { FormLowongan } from "./FormLowongan";
import { FormNilai } from "./FormNilai";
import { FormProses } from "./FormProses";
import { FormProyek } from "./FormProyek";
import { FormCaseStudy } from "./FormCaseStudy";
import { FormLayanan } from "./FormLayanan";
import { FormTestimoni } from "./FormTestimoni";
import { FormVisi } from "./FormVisi";
import { Masuk } from "./Masuk";
import { Sidebar } from "./Sidebar";
import { TombolTema } from "./Tema";
import { Kabar } from "./ui";
import { findEntry } from "@shared/contentMap";

type Rute =
  | { nama: "beranda" }
  | { nama: "daftar"; entitas: string }
  | { nama: "form"; entitas: string; id: string | null };

function bacaRute(): Rute {
  const h = window.location.hash.replace(/^#/, "");

  /* Entitas yang tidak dikenal peta konten jatuh ke beranda alih-alih layar
     kosong — hash diketik tangan atau tertinggal dari versi panel sebelumnya
     tidak boleh berakhir di halaman buntu. Diperiksa untuk SEMUA bentuk rute,
     termasuk form: sejak ada entitas kedua, `#/apa-saja/baru` yang lolos akan
     membuka form lowongan dengan alamat yang menjanjikan hal lain. */
  const siap = (key: string) => findEntry(key)?.entry.status === "siap";

  /**
   * Entitas yang layar utamanya LANGSUNG form, tanpa daftar di depannya —
   * visi dan footer, karena datanya masing-masing satu baris.
   *
   * Bentuk `.../baru` dan `.../ubah/<id>` tidak punya arti untuk mereka, dan
   * membiarkannya lolos bukan sekadar tidak berguna: rantai pemilihan
   * komponen di bawah berakhir di form lowongan, jadi `#/visi/baru` akan
   * membuka form LOWONGAN di alamat yang menjanjikan visi. Persis jenis
   * kerusakan yang dijaga pemeriksaan `siap()` di atas, cuma dari arah lain.
   */
  const tanpaDaftar = (key: string) => key === "visi" || key === "footer";

  const baru = /^\/([a-z-]+)\/baru$/.exec(h);
  if (baru && siap(baru[1]))
    return tanpaDaftar(baru[1])
      ? { nama: "daftar", entitas: baru[1] }
      : { nama: "form", entitas: baru[1], id: null };

  const ubah = /^\/([a-z-]+)\/ubah\/(.+)$/.exec(h);
  if (ubah && siap(ubah[1]))
    return tanpaDaftar(ubah[1])
      ? { nama: "daftar", entitas: ubah[1] }
      : { nama: "form", entitas: ubah[1], id: ubah[2] };

  const daftar = /^\/([a-z-]+)$/.exec(h);
  if (daftar && siap(daftar[1])) return { nama: "daftar", entitas: daftar[1] };

  return { nama: "beranda" };
}

export function App() {
  /* `undefined` = belum tahu (masih menanyakan sesi ke server), `null` = tamu.
     Dibedakan supaya layar masuk tidak berkedip muncul sepersekian detik untuk
     orang yang sebenarnya sudah login. */
  const [user, setUser] = useState<Pengguna | undefined>(undefined);
  const [rute, setRute] = useState<Rute>(bacaRute);
  const [daftar, setDaftar] = useState<JobRecord[]>([]);
  const [nilai, setNilai] = useState<ValueRecord[]>([]);
  const [crew, setCrew] = useState<CrewRecord[]>([]);
  const [proyek, setProyek] = useState<WorkProjectRecord[]>([]);
  const [cerita, setCerita] = useState<CaseStudyRecord[]>([]);
  const [layanan, setLayanan] = useState<ServiceRecord[]>([]);
  const [testimoni, setTestimoni] = useState<TestimonialRecord[]>([]);
  const [industri, setIndustri] = useState<IndustryRecord[]>([]);
  const [deployment, setDeployment] = useState<DeploymentRecord[]>([]);
  const [proses, setProses] = useState<ProcessStepRecord[]>([]);
  /* `null` di sini berarti dua hal sekaligus — belum diambil, atau barisnya
     memang belum ada di database. Keduanya ditampilkan sama di beranda
     ("belum terisi"), jadi tidak perlu dibedakan. */
  const [visi, setVisi] = useState<VisionRecord | null>(null);
  /* Sama seperti visi: `null` = belum diambil ATAU barisnya memang belum ada. */
  const [footer, setFooter] = useState<FooterRecord | null>(null);
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
    /* SEMUA entitas diambil sekaligus, bukan hanya yang sedang dibuka.
       Berandanya menampilkan kalimat status tiap entitas ("3 nilai, 1 belum
       tayang"), jadi mengambil per-halaman berarti beranda memulai hidupnya
       dengan angka kosong yang lalu berubah sendiri. Daftarnya pendek — ini
       beberapa request kecil, bukan tabel raksasa. */
    const [
      hJobs,
      hValues,
      hCrew,
      hProyek,
      hCerita,
      hLayanan,
      hTestimoni,
      hIndustri,
      hDeployment,
      hProses,
      hVisi,
      hFooter,
      hPending,
    ] = await Promise.all([
      ambilLowongan(),
      ambilNilai(),
      ambilCrew(),
      ambilProyek(),
      ambilCaseStudy(),
      ambilLayanan(),
      ambilTestimoni(),
      ambilIndustri(),
      ambilDeployment(),
      ambilProses(),
      ambilVisi(),
      ambilFooter(),
      statusPublish(),
    ]);

    /* Sesi kedaluwarsa cukup dilihat dari SATU permintaan mana pun: kalau
       cookie-nya tidak berlaku lagi, semuanya dibalas 401 bersamaan. */
    const gagal = [
      hJobs,
      hValues,
      hCrew,
      hProyek,
      hCerita,
      hLayanan,
      hTestimoni,
      hIndustri,
      hDeployment,
      hProses,
      hVisi,
      hFooter,
    ].find((h) => !h.ok);
    if (gagal && !gagal.ok) {
      if (gagal.perluMasuk) setUser(null);
      else setGalat(gagal.pesan);
      return;
    }

    setGalat(null);
    if (hJobs.ok) setDaftar(hJobs.data.jobs);
    if (hValues.ok) setNilai(hValues.data.values);
    if (hCrew.ok) setCrew(hCrew.data.crew);
    if (hProyek.ok) setProyek(hProyek.data.projects);
    if (hCerita.ok) setCerita(hCerita.data.studies);
    if (hLayanan.ok) setLayanan(hLayanan.data.services);
    if (hTestimoni.ok) setTestimoni(hTestimoni.data.testimonials);
    if (hIndustri.ok) setIndustri(hIndustri.data.industries);
    if (hDeployment.ok) setDeployment(hDeployment.data.deployments);
    if (hProses.ok) setProses(hProses.data.steps);
    if (hVisi.ok) setVisi(hVisi.data.vision);
    if (hFooter.ok) setFooter(hFooter.data.footer);
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
  const ringkas = (
    jumlah: number,
    draf: number,
    belumTayang: number,
    satuan: string,
    kosong: string,
  ) =>
    jumlah === 0
      ? kosong
      : `${jumlah} ${satuan}` +
        (draf > 0 ? `, ${draf} masih draf` : "") +
        (belumTayang > 0 ? `, ${belumTayang} belum tayang` : "");

  const keterangan: Record<string, string> = {
    lowongan: ringkas(
      daftar.length,
      daftar.filter((j) => j.state === "draft").length,
      daftar.filter((j) => j.unpublished).length,
      "lowongan",
      "Belum ada lowongan.",
    ),
    nilai: ringkas(
      nilai.length,
      nilai.filter((v) => v.state === "draft").length,
      nilai.filter((v) => v.unpublished).length,
      "nilai",
      "Belum ada nilai.",
    ),
    crew: ringkas(
      crew.length,
      crew.filter((m) => m.state === "draft").length,
      crew.filter((m) => m.unpublished).length,
      "orang",
      "Belum ada anggota.",
    ),
    "selected-work": ringkas(
      proyek.length,
      proyek.filter((p) => p.state === "draft").length,
      proyek.filter((p) => p.unpublished).length,
      "proyek",
      "Belum ada proyek.",
    ),
    "case-study": ringkas(
      cerita.length,
      cerita.filter((s) => s.state === "draft").length,
      cerita.filter((s) => s.unpublished).length,
      "case study",
      "Belum ada case study.",
    ),
    layanan: ringkas(
      layanan.length,
      layanan.filter((s) => s.state === "draft").length,
      layanan.filter((s) => s.unpublished).length,
      "layanan",
      "Belum ada layanan.",
    ),
    testimoni: ringkas(
      testimoni.length,
      testimoni.filter((t) => t.state === "draft").length,
      testimoni.filter((t) => t.unpublished).length,
      "testimoni",
      "Belum ada testimoni.",
    ),
    industri: ringkas(
      industri.length,
      industri.filter((i) => i.state === "draft").length,
      industri.filter((i) => i.unpublished).length,
      "sektor",
      "Belum ada sektor.",
    ),
    deployment: ringkas(
      deployment.length,
      deployment.filter((d) => d.state === "draft").length,
      deployment.filter((d) => d.unpublished).length,
      "kartu",
      "Belum ada kartu.",
    ),
    proses: ringkas(
      proses.length,
      proses.filter((s) => s.state === "draft").length,
      proses.filter((s) => s.unpublished).length,
      "langkah",
      "Belum ada langkah.",
    ),
    /* Tidak lewat `ringkas()`: yang itu menghitung baris dan menyebut draf,
       dan visi tidak punya keduanya — jumlahnya selalu satu, dan tidak ada
       keadaan draft. Yang berguna diketahui editor cuma dua: sudah terisi
       atau belum, dan apakah masih menunggu Publish. */
    visi:
      visi === null
        ? "Belum terisi — situs memakai kalimat bawaan."
        : "Terisi" + (visi.unpublished ? ", belum tayang" : ""),
    /* Alasan sama seperti visi — satu baris, tanpa draf. Bedanya jumlah
       tautan sosialnya disebut: itu satu-satunya bagian footer yang bisa
       bertambah dan berkurang, jadi angkanya memberi tahu sesuatu. */
    footer:
      footer === null
        ? "Belum terisi — situs memakai isi bawaan."
        : `Terisi, ${footer.socials.length} tautan sosial` +
          (footer.unpublished ? ", belum tayang" : ""),
  };

  if (user === undefined) return <div className="bungkus">Memuat…</div>;
  if (user === null) return <Masuk onMasuk={(u) => setUser(u)} />;

  return (
    <div className="bungkus">
      <div className="kepala">
        <h1>Kelola Konten Cogniti</h1>
        <span className="siapa">
          <TombolTema />
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
            /* Pemilihan komponen per entitas ditulis apa adanya, bukan lewat
               peta `{lowongan: [Daftar, Form], …}`. Peta seperti itu memang
               lebih pendek, tapi prop tiap entitas berbeda tipe (`JobRecord[]`
               vs `ValueRecord[]`) — dan yang hilang begitu semuanya dijejalkan
               ke satu peta adalah pemeriksaan TypeScript yang menangkap
               ketidakcocokan itu. */
            /* Visi tidak punya daftar: satu baris, jadi layar entitasnya
               LANGSUNG formnya. Ditangkap di cabang "daftar" karena itulah
               bentuk hash-nya (`#/visi`) — tidak ada `#/visi/baru` maupun
               `#/visi/ubah/<id>` yang bisa dituju. */
            rute.entitas === "visi" ? (
              <FormVisi onSelesai={selesai} />
            ) : rute.entitas === "footer" ? (
              /* Footer, alasan sama: `#/footer` langsung formnya. */
              <FormFooter onSelesai={selesai} />
            ) : rute.entitas === "deployment" ? (
              <DaftarDeployment
                daftar={deployment}
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
            ) : rute.entitas === "proses" ? (
              <DaftarProses
                daftar={proses}
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
            ) : rute.entitas === "industri" ? (
              <DaftarIndustri
                daftar={industri}
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
            ) : rute.entitas === "layanan" ? (
              <DaftarLayanan
                daftar={layanan}
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
            ) : rute.entitas === "testimoni" ? (
              <DaftarTestimoni
                daftar={testimoni}
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
            ) : rute.entitas === "case-study" ? (
              <DaftarCaseStudy
                daftar={cerita}
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
            ) : rute.entitas === "selected-work" ? (
              <DaftarProyek
                daftar={proyek}
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
            ) : rute.entitas === "crew" ? (
              <DaftarCrew
                daftar={crew}
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
            ) : rute.entitas === "nilai" ? (
              <DaftarNilai
                daftar={nilai}
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
            )
          ) : rute.entitas === "deployment" ? (
            <FormDeployment
              key={rute.id ?? "baru"}
              id={rute.id}
              onSelesai={selesai}
              onBatal={() => pergi(`/${rute.entitas}`)}
            />
          ) : rute.entitas === "proses" ? (
            <FormProses
              key={rute.id ?? "baru"}
              id={rute.id}
              onSelesai={selesai}
              onBatal={() => pergi(`/${rute.entitas}`)}
            />
          ) : rute.entitas === "industri" ? (
            <FormIndustri
              key={rute.id ?? "baru"}
              id={rute.id}
              onSelesai={selesai}
              onBatal={() => pergi(`/${rute.entitas}`)}
            />
          ) : rute.entitas === "layanan" ? (
            <FormLayanan
              key={rute.id ?? "baru"}
              id={rute.id}
              onSelesai={selesai}
              onBatal={() => pergi(`/${rute.entitas}`)}
            />
          ) : rute.entitas === "testimoni" ? (
            <FormTestimoni
              key={rute.id ?? "baru"}
              id={rute.id}
              onSelesai={selesai}
              onBatal={() => pergi(`/${rute.entitas}`)}
            />
          ) : rute.entitas === "case-study" ? (
            <FormCaseStudy
              key={rute.id ?? "baru"}
              id={rute.id}
              onSelesai={selesai}
              onBatal={() => pergi(`/${rute.entitas}`)}
            />
          ) : rute.entitas === "selected-work" ? (
            <FormProyek
              key={rute.id ?? "baru"}
              id={rute.id}
              onSelesai={selesai}
              onBatal={() => pergi(`/${rute.entitas}`)}
            />
          ) : rute.entitas === "crew" ? (
            <FormCrew
              key={rute.id ?? "baru"}
              id={rute.id}
              onSelesai={selesai}
              onBatal={() => pergi(`/${rute.entitas}`)}
            />
          ) : rute.entitas === "nilai" ? (
            <FormNilai
              key={rute.id ?? "baru"}
              id={rute.id}
              onSelesai={selesai}
              onBatal={() => pergi(`/${rute.entitas}`)}
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
