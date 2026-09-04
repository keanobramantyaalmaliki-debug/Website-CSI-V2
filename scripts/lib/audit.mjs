/**
 * Menyapu jejak yang ditinggalkan probe di `audit_log`.
 *
 * Probe panel SENGAJA membuat, menyunting, menghapus, dan menekan Publish —
 * itulah yang diperiksanya. Efek sampingnya: setiap kali dijalankan, layar
 * Riwayat bertambah belasan baris "Probe ..." yang bukan pekerjaan siapa pun,
 * dan riwayat dev berubah jadi tempat sampah. Baris entitasnya sendiri sudah
 * dihapus probe lewat panel, tapi CATATAN penghapusan itu justru yang menumpuk.
 *
 * Jadi tiap probe menandai jam mulainya, lalu membuang baris audit yang lahir
 * sesudah tanda itu — yang TERLIHAT saja.
 *
 * Baris `login` dan `publish` sengaja ditinggal. Dua alasan, dan yang kedua
 * yang penting: keduanya memang tidak pernah tampil di layar Riwayat maupun
 * Review, jadi tidak ikut mengotori apa pun; dan baris `publish` adalah
 * GERBANG kedua layar itu (`at <= max(publish.at)` dan kebalikannya). Kalau
 * probe kebetulan menayangkan perubahan yang sudah menunggu sebelum ia jalan,
 * lalu baris publish-nya ikut tersapu, perubahan itu akan kembali terhitung
 * "belum terpublish" selamanya padahal `content.json` sudah memuatnya.
 *
 * Konsekuensinya, JANGAN menyunting konten lewat panel sementara probe jalan:
 * suntingan itu lahir sesudah tanda dan ikut tersapu. (Probe juga menekan
 * Publish sungguhan, jadi menyunting berbarengan memang sudah tidak aman.)
 *
 * DATABASE_URL dibaca dari berkas `.env`, BUKAN dari `process.env`: terminal
 * peluncur di mesin ini kadang masih meng-export DATABASE_URL era Postgres.app
 * yang menunjuk database lain, dan menyapu tabel di database yang salah adalah
 * kesalahan yang tidak bisa dibatalkan.
 */
import { readFileSync } from "node:fs";
import postgres from "postgres";

function alamatDb() {
  const env = readFileSync(new URL("../../.env", import.meta.url), "utf8");
  const baris = env
    .split("\n")
    .find((b) => b.trimStart().startsWith("DATABASE_URL="));
  if (!baris) throw new Error("DATABASE_URL tidak ada di .env");
  return baris.slice(baris.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
}

/**
 * Buka sambungan sekali, kembalikan penanda jam DATABASE-nya.
 *
 * Jam database, bukan `new Date()` di sini: jam VM Docker dan jam host pernah
 * berselisih beberapa detik, dan tanda yang kesiangan akan menyisakan baris
 * paling awal probe, sedangkan tanda yang kepagian ikut memakan baris milik
 * orang.
 */
export async function tandaiAudit() {
  const sql = postgres(alamatDb(), { max: 1 });
  try {
    const [{ now }] = await sql`select now() as now`;
    return { sql, sejak: now };
  } catch (e) {
    await sql.end({ timeout: 1 });
    throw e;
  }
}

/** Buang jejaknya. Tidak pernah menggagalkan probe: kalau sapuannya gagal,
 *  yang tertinggal cuma baris riwayat, bukan hasil pemeriksaan yang salah. */
export async function sapuAudit(tanda) {
  if (!tanda) return;
  const { sql, sejak } = tanda;
  try {
    const dibuang = await sql`
      delete from audit_log
      where at >= ${sejak} and action not in ('login', 'publish')
    `;
    if (dibuang.count > 0) {
      console.log(`✓ ${dibuang.count} baris riwayat bekas probe disapu`);
    }
  } catch (e) {
    console.error(`⚠ jejak probe TERTINGGAL di riwayat: ${e.message}`);
  } finally {
    await sql.end({ timeout: 2 });
  }
}
