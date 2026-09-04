import { describe, expect, it } from "vitest";
import {
  SECTION_TEXT_KEYS,
  SECTION_TEXT_META,
  sectionHeadingLines,
  sectionSubheadingParagraphs,
  sectionTextEntity,
  sectionTextKeys,
  sectionTextRoute,
  isSectionTextKey,
} from "@shared/sectionText";
import {
  firstSectionTextError,
  normalizeSectionText,
  SECTION_TEXT_FIELD_ORDER,
  validateSectionText,
  type SectionTextInput,
} from "@shared/validateSectionText";

const isi = (over: Partial<SectionTextInput> = {}): SectionTextInput => ({
  heading: "Think beyond software.\nBuild intelligence.",
  subheading: "Kalimat kecil di bawah judul.",
  ...over,
});

describe("validateSectionText — selalu diperiksa penuh", () => {
  it("judul dua baris berikut subteks lolos untuk seksi yang punya keduanya", () => {
    expect(validateSectionText("csi-hero", isi())).toEqual({});
  });

  /* Sama seperti visi: entitas ini tidak punya `state`, jadi tidak ada tempat
     menyimpan pekerjaan setengah jadi dan tidak ada jalan longgar. Test ini
     yang berbunyi kalau suatu hari `state` diselipkan kembali. */
  it("judul kosong ditolak, apa pun tambahan yang ikut dikirim", () => {
    const errors = validateSectionText("the-crew", {
      ...isi({ heading: "   ", subheading: "" }),
      state: "draft",
    } as SectionTextInput);

    expect(errors.heading).toBeTruthy();
  });

  it("judul yang cuma berisi baris kosong dihitung kosong, bukan satu baris", () => {
    expect(validateSectionText("the-crew", isi({ heading: "\n\n", subheading: "" })).heading)
      .toBeTruthy();
  });
});

describe("batas baris dan panjang datang dari tata letak, bukan angka bulat", () => {
  it("seksi satu baris menolak baris kedua, dan menyebut alasannya", () => {
    const galat = validateSectionText("process", isi({ heading: "How\nWe Work", subheading: "" }));

    expect(galat.heading).toContain("satu baris");
    /* Alasannya ikut tercetak: yang membacanya editor non-teknis, dan "tidak
       boleh dua baris" tanpa sebab akan terbaca sebagai aturan sewenang-wenang. */
    expect(galat.heading).toContain(SECTION_TEXT_META.process.catatan);
  });

  it("seksi dua baris menolak baris ketiga", () => {
    expect(
      validateSectionText("csi-hero", isi({ heading: "Satu\nDua\nTiga" })).heading,
    ).toBeTruthy();
  });

  it("judul kepanjangan ditolak dengan angka yang bisa dihitung sendiri", () => {
    const panjang = "a".repeat(SECTION_TEXT_META["the-crew"].maksJudul + 1);
    const galat = validateSectionText("the-crew", isi({ heading: panjang, subheading: "" }));

    expect(galat.heading).toContain(String(SECTION_TEXT_META["the-crew"].maksJudul));
  });

  it("panjang dihitung SESUDAH dirapikan, jadi spasi di ujung tidak bisa menembus batas", () => {
    const pas = "a".repeat(SECTION_TEXT_META["the-crew"].maksJudul);
    expect(
      validateSectionText("the-crew", isi({ heading: `  ${pas}  `, subheading: "" })),
    ).toEqual({});
  });
});

describe("subteks — penolakan bersuara, bukan pembuangan diam-diam", () => {
  /* Isian subteks memang tidak dirender di form seksi tanpa sub, jadi jalur ini
     cuma tersentuh lewat permintaan yang dikarang atau panel versi lama. Tetap
     ditolak: menyimpan teks yang tak pernah tampil adalah cara paling halus
     membuat editor mengira situsnya rusak. */
  it("seksi tanpa subteks menolak subteks yang terisi", () => {
    const galat = validateSectionText("deployments", isi({ heading: "Judul", subheading: "Apa saja" }));

    expect(galat.subheading).toBeTruthy();
    expect(galat.heading).toBeUndefined();
  });

  it("seksi tanpa subteks lolos kalau subteksnya memang kosong", () => {
    expect(validateSectionText("deployments", isi({ heading: "Judul", subheading: "" }))).toEqual({});
  });

  it("subteks boleh dikosongkan di seksi yang punya subteks", () => {
    expect(validateSectionText("careers", isi({ heading: "Build What Comes Next.", subheading: "" })))
      .toEqual({});
  });

  it("seksi satu paragraf menolak baris kosong di tengah subteksnya", () => {
    const galat = validateSectionText("careers", isi({ heading: "Judul", subheading: "Satu\n\nDua" }));

    expect(galat.subheading).toContain("baris kosong");
  });

  it("people-intro boleh dua paragraf, tapi tidak tiga", () => {
    expect(
      validateSectionText("people-intro", isi({ heading: "Judul", subheading: "Satu\n\nDua" })),
    ).toEqual({});
    expect(
      validateSectionText("people-intro", isi({ heading: "Judul", subheading: "Satu\n\nDua\n\nTiga" }))
        .subheading,
    ).toBeTruthy();
  });

  it("subteks kepanjangan ditolak", () => {
    const panjang = "a".repeat(SECTION_TEXT_META.careers.maksSub + 1);
    expect(validateSectionText("careers", isi({ heading: "Judul", subheading: panjang })).subheading)
      .toBeTruthy();
  });
});

describe("normalizeSectionText — satu bentuk kanonik untuk memeriksa dan menyimpan", () => {
  it("baris ala Windows jadi \\n biasa", () => {
    expect(normalizeSectionText({ heading: "Satu\r\nDua", subheading: "" }).heading).toBe(
      "Satu\nDua",
    );
  });

  it("spasi di ujung tiap baris dibuang, karena LineMask menyisakan celahnya", () => {
    expect(normalizeSectionText({ heading: "  Satu  \n  Dua  ", subheading: "" }).heading).toBe(
      "Satu\nDua",
    );
  });

  it("baris kosong beruntun tidak melahirkan baris kosong di situs", () => {
    expect(normalizeSectionText({ heading: "Satu\n\n\nDua", subheading: "" }).heading).toBe(
      "Satu\nDua",
    );
  });

  it("paragraf subteks dirapikan jadi tepat satu baris kosong pemisah", () => {
    expect(
      normalizeSectionText({ heading: "x", subheading: "Satu\n \n\n Dua " }).subheading,
    ).toBe("Satu\n\nDua");
  });
});

describe("firstSectionTextError — masalah pertama menurut urutan baca form", () => {
  it("judul disebut lebih dulu daripada subteks", () => {
    const galat = validateSectionText("careers", { heading: "", subheading: "a".repeat(999) });

    expect(firstSectionTextError(galat)?.field).toBe("heading");
  });

  it("tanpa masalah, null", () => {
    expect(firstSectionTextError({})).toBeNull();
  });

  it("urutan isiannya sama dengan urutan di form", () => {
    expect(SECTION_TEXT_FIELD_ORDER).toEqual(["heading", "subheading"]);
  });
});

describe("kontrak kunci seksi", () => {
  /* Bentuk `Record<SectionTextKey, …>` sudah memaksa ini saat kompilasi. Test
     ini menjaga sisi lain: metadata untuk kunci yang sudah tidak ada. */
  it("tiap kunci punya metadata dan tidak ada metadata yatim", () => {
    expect(Object.keys(SECTION_TEXT_META).sort()).toEqual([...SECTION_TEXT_KEYS].sort());
  });

  it("seksi tanpa subteks tidak menyimpan batas subteks yang menyesatkan", () => {
    for (const key of SECTION_TEXT_KEYS) {
      const meta = SECTION_TEXT_META[key];
      if (meta.adaSub) {
        expect(meta.maksSub, key).toBeGreaterThan(0);
        expect(meta.maksParagraf, key).toBeGreaterThan(0);
      } else {
        expect(meta.maksSub, key).toBe(0);
        expect(meta.maksParagraf, key).toBe(0);
      }
    }
  });

  it("keempat halaman terisi, dan gabungannya persis sebelas kunci", () => {
    const gabungan = (["home", "services", "work", "people"] as const).flatMap((h) =>
      sectionTextKeys(h),
    );

    expect(gabungan).toEqual([...SECTION_TEXT_KEYS]);
  });

  it("nama entitas riwayat ikut halamannya, supaya tautannya mendarat benar", () => {
    expect(sectionTextEntity("csi-hero")).toBe("section_text_home");
    expect(sectionTextEntity("the-crew")).toBe("section_text_people");
    expect(sectionTextRoute("people")).toBe("judul-people");
  });

  it("penjaga runtime menolak kunci asing", () => {
    expect(isSectionTextKey("csi-hero")).toBe(true);
    expect(isSectionTextKey("csi-heroo")).toBe(false);
    expect(isSectionTextKey(null)).toBe(false);
  });
});

describe("pemecah baris dan paragraf", () => {
  it("judul satu baris tetap satu baris", () => {
    expect(sectionHeadingLines("The Crew")).toEqual(["The Crew"]);
  });

  it("judul kosong menghasilkan larik kosong, bukan satu baris kosong", () => {
    expect(sectionHeadingLines("   ")).toEqual([]);
  });

  it("subteks kosong menghasilkan larik kosong, supaya paragrafnya hilang dari situs", () => {
    expect(sectionSubheadingParagraphs("")).toEqual([]);
  });
});
