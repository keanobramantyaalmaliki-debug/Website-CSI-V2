/**
 * Layar masuk.
 *
 * Tidak ada tautan "daftar akun" — dan itu disengaja. Akun dibuat developer
 * lewat `bun run user:create`, jadi tidak ada cara siapa pun dari internet
 * memberi dirinya sendiri hak mengedit konten situs.
 */

import { useState } from "react";

import { masuk, type Pengguna } from "./api";
import { Isian, Kabar } from "./ui";

export function Masuk({ onMasuk }: { onMasuk: (user: Pengguna) => void }) {
  const [email, setEmail] = useState("");
  const [sandi, setSandi] = useState("");
  const [pesan, setPesan] = useState<string | null>(null);
  const [sedang, setSedang] = useState(false);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setSedang(true);
    setPesan(null);
    const hasil = await masuk(email, sandi);
    setSedang(false);

    if (!hasil.ok) {
      setPesan(hasil.pesan);
      return;
    }
    onMasuk(hasil.data.user);
  }

  return (
    <div className="masuk">
      <h1 style={{ fontSize: 22 }}>Kelola Konten Cogniti</h1>
      <form onSubmit={kirim}>
        {pesan ? <Kabar tegas anak={pesan} /> : null}

        <Isian label="Email">
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Isian>

        <Isian label="Kata sandi">
          <input
            type="password"
            autoComplete="current-password"
            value={sandi}
            onChange={(e) => setSandi(e.target.value)}
            required
          />
        </Isian>

        <button type="submit" className="utama" disabled={sedang}>
          {sedang ? "Sedang masuk…" : "Masuk"}
        </button>
      </form>

      <p className="petunjuk" style={{ marginTop: 24 }}>
        Lupa kata sandi? Hubungi developer — akun diatur langsung di server.
      </p>
    </div>
  );
}
