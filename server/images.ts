/**
 * Terima gambar dari editor, simpan sebagai WebP berukuran wajar.
 *
 * Yang diunggah editor adalah apa pun yang ada di komputernya: foto 12MP
 * langsung dari kamera, PNG hasil screenshot, kadang HEIC dari ponsel. Kalau
 * disajikan apa adanya, satu foto profil bisa lebih berat daripada seluruh
 * sisa halaman — dan tidak ada yang akan menyadarinya sampai pengunjung
 * mengeluh. Karena itu tidak ada berkas yang disajikan dalam bentuk aslinya.
 *
 * ⚠️ Foto lama di `public/careers/` dan `public/people/` melewati grading
 * ffmpeg manual. Foto unggahan baru AKAN terlihat berbeda nadanya. Itu
 * diterima; menyamakannya butuh pipeline grading yang bukan urusan CMS.
 */

import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/** Cukup untuk layar retina pada ukuran tampil terbesar hari ini (foto header
 *  lowongan ±600px). Menyimpan lebih besar hanya menambah berat unduhan tanpa
 *  ada tempat yang menampilkannya. */
const MAX_WIDTH = 1200;
const MAX_BYTES = 15 * 1024 * 1024;

const ACCEPTED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
]);

export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

export type ProcessedImage = {
  path: string;
  width: number;
  height: number;
  bytes: number;
};

export class ImageError extends Error {}

/** Nama berkas: slug dari nama asli + potongan acak.
 *
 *  Bagian acaknya wajib. Dua editor yang sama-sama mengunggah "foto.jpg" akan
 *  saling menimpa, dan yang kalah baru sadar berminggu-minggu kemudian saat
 *  melihat wajah orang lain di lowongannya. */
function filenameFor(originalName: string): string {
  const base =
    path
      .basename(originalName, path.extname(originalName))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "gambar";
  return `${base}-${randomBytes(4).toString("hex")}.webp`;
}

export async function processUpload(file: File): Promise<ProcessedImage> {
  if (!ACCEPTED.has(file.type)) {
    throw new ImageError(
      "Format gambar tidak didukung. Pakai JPG, PNG, atau WebP.",
    );
  }
  if (file.size > MAX_BYTES) {
    throw new ImageError("Ukuran gambar melebihi 15 MB.");
  }

  const input = Buffer.from(await file.arrayBuffer());

  /* Bentuknya ditulis lepas dari tipe sharp: `OutputInfo` hidup di dalam
     namespace yang tidak ikut terekspor lewat impor default. */
  let output: Buffer;
  let info: { width: number; height: number };
  try {
    const result = await sharp(input)
      /* `rotate()` tanpa argumen = terapkan orientasi EXIF lalu buang datanya.
         Tanpa ini, foto dari ponsel tampil miring 90° di browser meski terlihat
         benar di Finder. */
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    output = result.data;
    info = result.info;
  } catch {
    /* Berkas rusak atau bukan gambar sungguhan meski `type`-nya mengaku
       gambar — jangan biarkan lolos jadi 500 tanpa keterangan. */
    throw new ImageError("Gambar tidak bisa dibaca. Coba berkas lain.");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = filenameFor(file.name || "gambar");
  await writeFile(path.join(UPLOAD_DIR, filename), output);

  return {
    path: `/uploads/${filename}`,
    width: info.width,
    height: info.height,
    bytes: output.byteLength,
  };
}
