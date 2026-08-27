/**
 * Form lamaran — yang benar-benar dialami pelamar, bukan bentuk markup-nya.
 *
 * `submitApplication` di-mock: jalur jaringannya sudah punya test sendiri
 * (lib/careers/submitApplication.test.ts), dan yang perlu dibuktikan di sini
 * adalah APA yang dikirim form ini dan apa yang dilihat pelamar sesudahnya.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ApplyForm from "./ApplyForm";
import { getJob } from "@/data/jobs";

const submitSpy = vi.fn();
vi.mock("@/lib/careers/submitApplication", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/careers/submitApplication")
  >();
  return { ...actual, submitApplication: (...args: unknown[]) => submitSpy(...args) };
});

const JOB = getJob("full-stack-engineer")!;

function renderForm(lang: "en" | "id" = "en") {
  return render(<ApplyForm job={JOB} lang={lang} />);
}

/** Isi seluruh isian WAJIB. Yang opsional sengaja dibiarkan kosong. */
async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/first name/i), "Keano");
  await user.type(screen.getByLabelText(/last name/i), "Bramantya");
  await user.type(screen.getByLabelText(/^email/i), "keano@cogniti.id");
  await user.type(screen.getByLabelText(/where are you based/i), "Jakarta");
  await user.type(screen.getByLabelText(/why do you want to join/i), "Mau bikin barang bagus.");
  await user.selectOptions(screen.getByLabelText(/years of experience/i), "3–5 years");
}

beforeEach(() => {
  localStorage.clear();
  submitSpy.mockReset();
  submitSpy.mockResolvedValue({ ok: true });
});

describe("ApplyForm", () => {
  it("menawarkan skill milik lowongan ini, bukan daftar global", () => {
    renderForm();
    expect(screen.getByLabelText("React / Next.js")).toBeInTheDocument();
    expect(screen.getByLabelText("Cloud (AWS / GCP)")).toBeInTheDocument();
    expect(screen.queryByLabelText(/bookkeeping/i)).toBeNull();
  });

  /*
   * GitHub dicabut 27 Agu. Form yang sama dipakai lowongan non-engineering
   * (Accountant, Customer Success) — di sana isian itu tidak pernah terisi dan
   * cuma terbaca sebagai pertanyaan yang bukan untuk pelamarnya. Dijaga di
   * sini supaya tidak diam-diam kembali lewat satu <Field> yang disalin.
   */
  it("tidak menanyakan GitHub — dua tautan opsional saja", () => {
    renderForm();
    expect(screen.queryByLabelText(/github/i)).toBeNull();
    expect(screen.getByLabelText(/portfolio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/linkedin/i)).toBeInTheDocument();
  });

  it("mengirim isian pelamar apa adanya, lengkap dengan posisi yang dilamar", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequired(user);
    await user.click(screen.getByLabelText("Node.js"));
    await user.type(screen.getByLabelText(/portfolio/i), "keano.dev");

    await user.click(screen.getByRole("button", { name: /^apply/i }));

    expect(submitSpy).toHaveBeenCalledTimes(1);
    expect(submitSpy.mock.calls[0][0]).toMatchObject({
      jobTitle: "Full Stack Engineer",
      firstName: "Keano",
      lastName: "Bramantya",
      email: "keano@cogniti.id",
      location: "Jakarta",
      experience: "3–5 years",
      skills: ["Node.js"],
      portfolio: "keano.dev",
      linkedin: "",
    });
    /* Bahasanya ikut berangkat — pesan galat jaringan harus sebahasa dengan
       halaman yang sedang dibaca. */
    expect(submitSpy.mock.calls[0][1]).toBe("en");
  });

  it("skill & tautan boleh kosong — pelamar tanpa portofolio tidak tertahan", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequired(user);

    await user.click(screen.getByRole("button", { name: /^apply/i }));

    expect(submitSpy).toHaveBeenCalledTimes(1);
    expect(submitSpy.mock.calls[0][0].skills).toEqual([]);
  });

  /*
   * Tombolnya sengaja tidak dimatikan selagi form belum sah — tombol kelabu
   * tanpa alasan itu jalan buntu yang sudah pernah terjadi di form inquiry.
   * Sebagai gantinya, menekannya WAJIB memperlihatkan masalahnya.
   */
  it("kirim dengan isian kosong: peringatan muncul, jaringan tidak disentuh", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: /^apply/i }));

    expect(submitSpy).not.toHaveBeenCalled();
    expect(screen.getAllByText(/please add your first name/i).length).toBeGreaterThan(0);
    // Fokus melompat ke isian pertama yang bermasalah, bukan dibiarkan mencari.
    expect(document.activeElement).toBe(screen.getByLabelText(/first name/i));
  });

  it("isian yang belum disentuh tidak dimerahkan lebih dulu", () => {
    renderForm();
    expect(screen.queryByText(/please add your first name/i)).toBeNull();
    expect(screen.getByLabelText(/first name/i)).not.toHaveAttribute("aria-invalid", "true");
  });

  it("peringatan email muncul setelah isiannya ditinggalkan", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/^email/i), "keano");
    await user.tab();

    expect(screen.getByText(/doesn’t look complete/i)).toBeInTheDocument();
  });

  it("berhasil terkirim: form dikunci dan pelamar diberi tahu", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequired(user);

    await user.click(screen.getByRole("button", { name: /^apply/i }));

    expect(await screen.findByText(/your application is in/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeDisabled();
  });

  it("gagal terkirim: pesannya ditampilkan, form tetap bisa diisi ulang", async () => {
    submitSpy.mockResolvedValue({ ok: false, error: "We couldn’t reach the server." });
    const user = userEvent.setup();
    renderForm();
    await fillRequired(user);

    await user.click(screen.getByRole("button", { name: /^apply/i }));

    expect(await screen.findByText(/couldn’t reach the server/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).not.toBeDisabled();
  });

  it("mode ID: label, tombol, dan peringatan berbahasa Indonesia", async () => {
    const user = userEvent.setup();
    renderForm("id");

    expect(screen.getByRole("heading", { name: /lamar sekarang/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nama depan/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /kirim lamaran/i }));

    expect(screen.getAllByText(/nama depannya diisi dulu/i).length).toBeGreaterThan(0);
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it("pilihan pengalaman tidak pernah terisi diam-diam oleh opsi pertama", () => {
    renderForm();
    expect(screen.getByLabelText(/years of experience/i)).toHaveValue("");
  });
});
