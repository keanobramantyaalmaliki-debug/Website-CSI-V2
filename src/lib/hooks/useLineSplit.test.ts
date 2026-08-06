/**
 * Pengelompokan kata → baris.
 *
 * Diuji sebagai fungsi murni, bukan lewat render: jsdom tidak punya layout,
 * jadi `offsetTop` selalu 0 di sana dan setiap teks akan terbaca sebagai satu
 * baris. Yang bisa dijaga di jsdom cuma bahwa hasilnya tetap utuh — bagian
 * "mana yang sebaris" hanya bisa diuji di sini, dengan posisi yang disuplai.
 */
import { describe, expect, it } from "vitest";
import { groupIntoLines } from "./useLineSplit";

const at = (top: number, text: string) => ({ top, text });

describe("groupIntoLines", () => {
  it("menyatukan kata yang sejajar, memisah saat posisinya turun", () => {
    expect(
      groupIntoLines([
        at(0, "Where"),
        at(0, "Software"),
        at(48, "Becomes"),
        at(48, "Intelligence."),
      ]),
    ).toEqual(["Where Software", "Becomes Intelligence."]);
  });

  it("mengembalikan satu baris saat semuanya sejajar", () => {
    expect(groupIntoLines([at(0, "How"), at(0, "We"), at(0, "Work")])).toEqual([
      "How We Work",
    ]);
  });

  it("tidak kehilangan satu kata pun", () => {
    const words = "A Living Architecture For Decisions.".split(" ");
    const lines = groupIntoLines(
      words.map((text, index) => at(Math.floor(index / 2) * 40, text)),
    );

    expect(
      lines.join(" "),
      "Ada kata yang hilang atau tergabung saat dipecah per baris. Heading " +
        "adalah kalimat — kehilangan satu kata mengubah artinya, dan cacatnya " +
        "cuma muncul di lebar layar tertentu.\n",
    ).toBe(words.join(" "));
  });

  it("memisah tiap kata saat semuanya turun sendiri-sendiri", () => {
    expect(groupIntoLines([at(0, "Selected"), at(30, "Work")])).toEqual([
      "Selected",
      "Work",
    ]);
  });

  it("mengembalikan larik kosong untuk masukan kosong", () => {
    expect(groupIntoLines([])).toEqual([]);
  });

  it("memperlakukan posisi yang berulang sebagai baris baru", () => {
    // Bisa terjadi pada teks bersusun (mis. dua LineMask bersaudara di satu
    // heading): posisinya boleh berulang, tapi urutannya yang menentukan.
    expect(
      groupIntoLines([at(0, "satu"), at(40, "dua"), at(0, "tiga")]),
    ).toEqual(["satu", "dua", "tiga"]);
  });
});
