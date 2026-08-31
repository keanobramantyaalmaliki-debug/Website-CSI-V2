/**
 * Potongan tampilan yang dipakai berulang.
 *
 * Semuanya HTML biasa: `<dialog>`, `<fieldset>`, `<details>`. Tidak ada
 * pustaka komponen. Selain lebih ringan, elemen bawaan sudah membawa perilaku
 * keyboard dan pembaca layar yang benar — hal yang paling sering hilang saat
 * tombol ditiru pakai `<div>`.
 */

import { useEffect, useRef, type ReactNode } from "react";

/** Satu isian beserta label, petunjuk, dan galatnya. Galat SELALU muncul tepat
 *  di bawah isian yang bermasalah, bukan dikumpulkan di atas form. */
export function Isian({
  label,
  petunjuk,
  galat,
  children,
}: {
  label: string;
  petunjuk?: string;
  galat?: string;
  children: ReactNode;
}) {
  return (
    <div className={`isian${galat ? " bergalat" : ""}`}>
      <label>{label}</label>
      {petunjuk ? <p className="petunjuk">{petunjuk}</p> : null}
      {children}
      {galat ? <p className="galat">{galat}</p> : null}
    </div>
  );
}

/**
 * Daftar teks yang bisa ditambah, dihapus, dan diurutkan.
 *
 * Urutannya diubah lewat tombol "Naikkan"/"Turunkan", bukan seret-dan-lepas:
 * seret butuh koordinasi mouse yang halus, tidak bekerja dengan keyboard, dan
 * tidak menyisakan jejak apa pun kalau lepasnya meleset.
 */
export function DaftarTeks({
  label,
  petunjuk,
  galat,
  nilai,
  ubah,
  contoh,
  panjang,
}: {
  label: string;
  petunjuk?: string;
  galat?: string;
  nilai: string[];
  ubah: (baru: string[]) => void;
  contoh: string;
  /** `true` untuk poin kalimat — pakai textarea, bukan input satu baris. */
  panjang?: boolean;
}) {
  const ganti = (i: number, teks: string) =>
    ubah(nilai.map((lama, j) => (j === i ? teks : lama)));

  const tukar = (i: number, arah: -1 | 1) => {
    const j = i + arah;
    if (j < 0 || j >= nilai.length) return;
    const baru = [...nilai];
    [baru[i], baru[j]] = [baru[j], baru[i]];
    ubah(baru);
  };

  return (
    <div className={`isian${galat ? " bergalat" : ""}`}>
      <label>{label}</label>
      {petunjuk ? <p className="petunjuk">{petunjuk}</p> : null}

      {nilai.length === 0 ? (
        <p className="petunjuk">Belum ada isian.</p>
      ) : null}

      {nilai.map((teks, i) => (
        <div className="baris" key={i}>
          <span className="nomor">{i + 1}.</span>
          {panjang ? (
            <textarea
              value={teks}
              placeholder={contoh}
              onChange={(e) => ganti(i, e.target.value)}
              style={{ minHeight: 64 }}
            />
          ) : (
            <input
              type="text"
              value={teks}
              placeholder={contoh}
              onChange={(e) => ganti(i, e.target.value)}
            />
          )}
          <button
            type="button"
            className="kecil"
            onClick={() => tukar(i, -1)}
            disabled={i === 0}
            aria-label={`Naikkan baris ${i + 1}`}
          >
            Naikkan
          </button>
          <button
            type="button"
            className="kecil"
            onClick={() => tukar(i, 1)}
            disabled={i === nilai.length - 1}
            aria-label={`Turunkan baris ${i + 1}`}
          >
            Turunkan
          </button>
          <button
            type="button"
            className="kecil"
            onClick={() => ubah(nilai.filter((_, j) => j !== i))}
            aria-label={`Hapus baris ${i + 1}`}
          >
            Hapus
          </button>
        </div>
      ))}

      <button type="button" className="kecil" onClick={() => ubah([...nilai, ""])}>
        + Tambah
      </button>

      {galat ? <p className="galat">{galat}</p> : null}
    </div>
  );
}

/**
 * Dialog konfirmasi.
 *
 * Judul yang dihapus DISEBUT di dalamnya. "Yakin hapus item ini?" bisa dijawab
 * "ya" oleh orang yang sebenarnya sedang melihat baris lain — dan hapusnya
 * tidak bisa dibatalkan dari panel ini.
 */
export function Konfirmasi({
  judul,
  isi,
  tombolYa,
  sedangJalan,
  onYa,
  onBatal,
}: {
  judul: string;
  isi: ReactNode;
  tombolYa: string;
  sedangJalan?: boolean;
  onYa: () => void;
  onBatal: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog ref={ref} onCancel={onBatal} onClose={onBatal}>
      <h2 style={{ marginTop: 0 }}>{judul}</h2>
      <div>{isi}</div>
      <div className="tombol-baris">
        <button type="button" className="utama" onClick={onYa} disabled={sedangJalan}>
          {sedangJalan ? "Sedang diproses…" : tombolYa}
        </button>
        <button type="button" onClick={onBatal} disabled={sedangJalan}>
          Batal
        </button>
      </div>
    </dialog>
  );
}

/** Kalimat status di atas isi halaman. */
export function Kabar({ anak, tegas }: { anak: ReactNode; tegas?: boolean }) {
  return <p className={`kabar${tegas ? " tegas" : ""}`}>{anak}</p>;
}

/** Tanggal yang bisa dibaca orang, bukan ISO 8601. */
export function tanggal(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
