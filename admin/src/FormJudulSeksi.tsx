/**
 * Form satu Judul seksi.
 *
 * Yang dituju alamatnya UUID barisnya, bukan kuncinya (`csi-hero`), dan itu
 * bukan pilihan tampilan: layar Riwayat dan Review menyusun alamat "Buka"
 * dari `entity_id`, yang memang uuid. Kuncinya diambil dari baris yang
 * ketemu, lalu itulah yang dikirim ke `PUT /api/section-text/:key`.
 *
 * Isian yang tampil ikut seksinya: seksi tanpa subteks TIDAK merender
 * textarea keduanya sama sekali. Merendernya lalu menolak isinya saat Simpan
 * adalah cara paling pasti membuat editor menulis satu paragraf untuk dibuang.
 * Penolakan di `validateSectionText` tetap ada sebagai jaring, untuk
 * permintaan yang dikarang.
 *
 * Aturan validasinya TIDAK ditulis ulang di sini: `shared/validateSectionText.ts`
 * yang sama persis dipakai server. Form cuma menjalankannya lebih dulu.
 */

import { useEffect, useState } from "react";
import {
  SECTION_TEXT_META,
  type SectionTextKey,
} from "@shared/sectionText";
import {
  normalizeSectionText,
  validateSectionText,
  type SectionTextFieldErrors,
  type SectionTextInput,
} from "@shared/validateSectionText";

import { ambilJudulSeksi, simpanJudulSeksi } from "./api";
import { Isian, Kabar } from "./ui";

const KOSONG: SectionTextInput = { heading: "", subheading: "" };

export function FormJudulSeksi({
  id,
  onSelesai,
  onBatal,
}: {
  id: string;
  onSelesai: (pesan: string) => void;
  onBatal: () => void;
}) {
  const [isi, setIsi] = useState<SectionTextInput>(KOSONG);
  /* Kunci seksinya baru diketahui SESUDAH barisnya ketemu. `null` selama itu,
     dan tombol Simpan ikut mati — tanpa kunci tidak ada alamat untuk dituju. */
  const [kunci, setKunci] = useState<SectionTextKey | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<SectionTextFieldErrors>({});
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    void ambilJudulSeksi().then((hasil) => {
      if (batal) return;
      setMemuat(false);
      if (!hasil.ok) {
        setPesan(hasil.pesan);
        return;
      }
      const baris = hasil.data.sectionTexts.find((row) => row.id === id);
      if (!baris) {
        /* Alamat yang menunjuk baris tak ada — hash diketik tangan, atau
           tautan lama dari sebelum database ini di-seed ulang. */
        setPesan("Judul seksi ini tidak ada. Kembali ke daftarnya lewat tombol di atas.");
        return;
      }
      setKunci(baris.key);
      setIsi({ heading: baris.heading, subheading: baris.subheading });
    });
    return () => {
      batal = true;
    };
  }, [id]);

  const ubah = <K extends keyof SectionTextInput>(
    k: K,
    nilai: SectionTextInput[K],
  ) => setIsi((lama) => ({ ...lama, [k]: nilai }));

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (!kunci) return;
    setPesan(null);

    /* Bentuk kanonik dipakai untuk memeriksa DAN untuk dikirim, supaya yang
       lolos pemeriksaan persis yang disimpan. */
    const bersih = normalizeSectionText(isi);
    const masalah = validateSectionText(kunci, bersih);
    if (Object.keys(masalah).length) {
      setGalat(masalah);
      setPesan("Ada isian yang belum benar, lihat keterangan di bawah isiannya.");
      return;
    }

    setMenyimpan(true);
    const hasil = await simpanJudulSeksi(kunci, bersih);
    setMenyimpan(false);

    if (!hasil.ok) {
      setGalat(hasil.errors ?? {});
      setPesan(hasil.pesan);
      return;
    }

    setGalat({});
    onSelesai(
      `Judul "${SECTION_TEXT_META[kunci].label}" tersimpan. Perubahan baru terlihat pengunjung setelah kamu menekan Publish.`,
    );
  }

  if (memuat) return <p>Memuat judul seksi…</p>;

  const meta = kunci ? SECTION_TEXT_META[kunci] : null;

  return (
    <form onSubmit={simpan}>
      {/* Jalan pulang di ATAS, sama seperti form lain. */}
      <button
        type="button"
        className="kembali"
        onClick={onBatal}
        disabled={menyimpan}
      >
        ‹ Semua judul seksi
      </button>

      <h2 style={{ marginTop: 0 }}>
        {meta ? `Ubah: ${meta.label}` : "Judul seksi"}
      </h2>

      {pesan ? <Kabar tegas anak={pesan} /> : null}

      {meta ? (
        <>
          <p className="petunjuk">{meta.catatan}</p>

          <Isian
            label="Judul"
            petunjuk={
              meta.maksBaris === 1
                ? `Satu baris saja, maksimal ${meta.maksJudul} huruf.`
                : `Boleh sampai ${meta.maksBaris} baris, tekan Enter untuk pindah baris. Maksimal ${meta.maksJudul} huruf.`
            }
            galat={galat.heading}
          >
            <textarea
              value={isi.heading}
              onChange={(e) => ubah("heading", e.target.value)}
              rows={meta.maksBaris === 1 ? 2 : 3}
            />
          </Isian>

          {/* Seksi tanpa subteks tidak punya isian ini sama sekali. */}
          {meta.adaSub ? (
            <Isian
              label="Subteks"
              petunjuk={
                meta.maksParagraf > 1
                  ? `Kalimat kecil di bawah judul, boleh sampai ${meta.maksParagraf} paragraf yang dipisah satu baris kosong. Maksimal ${meta.maksSub} huruf. Boleh dikosongkan.`
                  : `Kalimat kecil di bawah judul, maksimal ${meta.maksSub} huruf. Boleh dikosongkan, subteksnya akan hilang dari situs.`
              }
              galat={galat.subheading}
            >
              <textarea
                value={isi.subheading}
                onChange={(e) => ubah("subheading", e.target.value)}
                rows={meta.maksParagraf > 1 ? 6 : 4}
              />
            </Isian>
          ) : null}

          <div className="tombol-baris">
            <button type="submit" className="utama" disabled={menyimpan}>
              {menyimpan ? "Menyimpan…" : "Simpan"}
            </button>
            <button type="button" onClick={onBatal} disabled={menyimpan}>
              Batal
            </button>
          </div>
        </>
      ) : null}
    </form>
  );
}
