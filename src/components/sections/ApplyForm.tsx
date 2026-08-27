"use client";

import { useCallback, useMemo, useState } from "react";
import {
  APPLY_UI,
  EXPERIENCE_OPTIONS,
  type JobLang,
  type JobPosting,
} from "@/data/jobs";
import {
  APPLICATION_FIELD_ORDER,
  applicationFieldErrors,
  REQUIRED_FIELDS,
  submitApplication,
  type ApplicationField,
  type ApplicationPayload,
} from "@/lib/careers/submitApplication";

/**
 * Form lamaran di halaman `/careers/<slug>`.
 *
 * Menggantikan section Contact yang dulu menempel di sini. Alasannya bukan
 * gaya: satu halaman dengan dua form membuat pelamar harus menebak yang mana
 * yang "benar-benar" mengirim lamaran — dan kolom pesan bebas tidak pernah
 * menghasilkan lamaran yang bisa dibandingkan satu sama lain. Yang di bawah ini
 * menanyakan hal yang memang ditanyakan saat menyaring.
 *
 * Seluruh teksnya ikut toggle EN/ID halaman (`APPLY_UI`), termasuk peringatan
 * isian — yang itu datang dari `submitApplication`, bukan dari sini.
 */

const INPUT_BASE =
  "w-full rounded-lg border bg-white/[0.05] px-4 py-3 text-sm text-zinc-100 " +
  "outline-none transition-colors placeholder:text-zinc-600 " +
  "disabled:cursor-not-allowed disabled:opacity-50 sm:text-base";

/* Warna garis dipisah dari kelas dasar DENGAN SENGAJA — pelajaran yang sama
   dengan ContactForm: menempel "border-red-400" di belakang string yang sudah
   memuat "border-white/10" membuat pemenangnya ditentukan urutan di stylesheet,
   bukan urutan di atribut. Jadi dipilih salah satu, tidak pernah dua-duanya. */
const INPUT_OK = "border-white/10 focus:border-white/40";
const INPUT_BAD = "border-red-400/80 focus:border-red-400";
const inputClass = (bad: boolean) =>
  `${INPUT_BASE} ${bad ? INPUT_BAD : INPUT_OK}`;

/**
 * Tautan opsional yang diminta form ini, berurutan sesuai tampilnya.
 *
 * GitHub DICABUT 27 Agu: form yang sama dipakai lowongan non-engineering
 * (Accountant, Customer Success), dan di sana isian itu tidak pernah terisi —
 * yang tersisa cuma pertanyaan yang jelas bukan untuk pelamarnya. Kalau suatu
 * saat dikembalikan, ia harus PER LOWONGAN, bukan tetap untuk semua.
 *
 * `satisfies`, bukan anotasi: kunci placeholder-nya ikut diperiksa terhadap
 * ApplicationField, jadi salah ketik nama isian gagal saat compile.
 */
const LINK_FIELDS = [
  { field: "portfolio", placeholder: "https://yourwork.com" },
  { field: "linkedin", placeholder: "https://linkedin.com/in/janedoe" },
] as const satisfies readonly { field: ApplicationField; placeholder: string }[];

type Status = "idle" | "sending" | "sent" | "error";

/** Isian teks — semuanya kecuali `skills` (centang) dan honeypot. */
type TextValues = Record<ApplicationField, string>;

const EMPTY: TextValues = {
  firstName: "",
  lastName: "",
  email: "",
  location: "",
  motivation: "",
  experience: "",
  portfolio: "",
  linkedin: "",
};

/**
 * ⚠️ Didefinisikan di TINGKAT MODUL, bukan di dalam `ApplyForm`.
 *
 * Komponen yang dibuat ulang tiap render adalah tipe elemen yang BERBEDA bagi
 * React, jadi setiap ketikan akan melepas-pasang <input>-nya — kursor hilang
 * setelah satu huruf. Bug yang tampak seperti "keyboard-nya nutup sendiri".
 */
function Field({
  id,
  label,
  hint,
  error,
  children,
  className = "",
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="flex items-baseline gap-2 text-base font-medium text-zinc-100 sm:text-lg"
      >
        {label}
        {hint && (
          <span className="text-xs font-light text-zinc-500">({hint})</span>
        )}
      </label>
      <div className="mt-2.5">{children}</div>
      {/* Peringatan duduk DI BAWAH isiannya, bukan cuma di kaki form: di form
          sepanjang ini, satu baris di dasar halaman tidak memberi tahu isian
          mana yang bermasalah — pelamar harus menelusuri sendiri dari atas. */}
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function ApplyForm({
  job,
  lang,
}: {
  job: JobPosting;
  lang: JobLang;
}) {
  const ui = APPLY_UI[lang];

  const [values, setValues] = useState<TextValues>(EMPTY);
  const [skills, setSkills] = useState<readonly string[]>([]);
  /* Honeypot. Dibiarkan kosong oleh manusia — lihat isiannya di dasar form. */
  const [botcheck, setBotcheck] = useState("");
  /* Isian yang SUDAH pernah ditinggalkan pelamar. Memerahkan isian yang belum
     sempat disentuh sama saja memarahi orang sebelum ia mulai mengetik. */
  const [touched, setTouched] = useState<Partial<Record<ApplicationField, boolean>>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const payload: ApplicationPayload = useMemo(
    () => ({ jobTitle: job.title, ...values, skills, botcheck }),
    [job.title, values, skills, botcheck],
  );

  const fieldErrors = applicationFieldErrors(payload, lang);

  const set = useCallback((field: ApplicationField, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const markTouched = useCallback((field: ApplicationField) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }, []);

  /** Peringatan yang layak tampil untuk satu isian: hanya setelah disentuh,
   *  atau setelah tombol kirim ditekan (yang menandai semuanya tersentuh). */
  const errorFor = (field: ApplicationField) =>
    touched[field] ? fieldErrors[field] : undefined;

  const toggleSkill = useCallback((value: string) => {
    setSkills((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
    );
  }, []);

  const onSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      const errors = applicationFieldErrors(payload, lang);
      const firstBad = APPLICATION_FIELD_ORDER.find((field) => errors[field]);

      /*
       * Tombolnya sengaja TIDAK dimatikan selagi form belum sah — itu jalan
       * buntu yang sudah pernah terjadi di form inquiry: tombol kelabu tanpa
       * alasan, dan pesannya baru muncul setelah percobaan kirim yang tak
       * pernah bisa terjadi. Di sini tombolnya hidup, dan menekannya
       * MENAMPILKAN masalahnya: semua isian ditandai tersentuh sekaligus, lalu
       * fokus melompat ke yang pertama bermasalah supaya pelamar tidak perlu
       * mencari sendiri di form sepanjang ini.
       */
      if (firstBad) {
        setTouched(
          Object.fromEntries(APPLICATION_FIELD_ORDER.map((f) => [f, true])),
        );
        setError(errors[firstBad] ?? null);
        setStatus("error");
        document.getElementById(`apply-${firstBad}`)?.focus();
        return;
      }

      setStatus("sending");
      setError(null);
      const result = await submitApplication(payload, lang);
      if (result.ok) {
        setStatus("sent");
        return;
      }
      setError(result.error);
      setStatus("error");
    },
    [payload, lang],
  );

  const busy = status === "sending";
  const done = status === "sent";
  /* Isian dikunci setelah terkirim: form yang masih bisa diketik sesudah
     "Terkirim ✓" mengundang pelamar mengetik ulang lalu bertanya-tanya kenapa
     tidak ada yang berubah. */
  const locked = busy || done;

  /* Cuma "belum diisi", bukan "belum sah": tombolnya redup selama masih ada
     isian wajib yang kosong, tapi email yang salah ketik dibiarkan terang.
     Meredupkannya karena galat isi akan terbaca sebagai tombol rusak — galat
     isi sudah punya tempatnya sendiri, tulisan merah di bawah isiannya. */
  const incomplete = !done && REQUIRED_FIELDS.some((f) => !values[f].trim());

  return (
    <section id="apply" className="section-shell px-3 pb-24 sm:pb-32">
      {/* Dijepit `max-w-4xl` — bukan selebar `section-shell` seperti teks di
          atasnya. Isian sepanjang 1400px membuat mata harus menyeberang layar
          dari label ke tempat mengetik, dan kolom kanan-kirinya jadi berjauhan
          tanpa alasan. 896px ≈ lebar form rujukannya.

          `mx-auto` menaruh kolomnya di tengah halaman. Isinya sendiri tetap rata
          kiri: label yang ikut ke tengah bikin mata kehilangan garis awal tiap
          turun satu isian. */}
      <div className="mx-auto max-w-4xl border-t border-white/10 pt-14 sm:pt-20">
        <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] leading-[0.95] font-semibold tracking-tight text-zinc-100">
          {ui.heading}
        </h2>
        <p className="mt-4 text-xs font-light text-zinc-500">{ui.requiredNote}</p>

        {/* `noValidate` = validasi bawaan peramban DIMATIKAN, dan itu disengaja.
            Dua alasannya nyata, bukan preferensi:

            · `type="url"` menolak "keano.dev" — padahal pemeriksa kita sengaja
              menerimanya (pelamar jarang mengetik skemanya). Tanpa ini,
              kirimannya diblokir peramban SEBELUM kode di sini jalan, tanpa
              satu pun peringatan kita tampil. Persis itu yang terjadi saat
              test ditulis.
            · Gelembung bawaan peramban muncul satu per satu, di bahasa OS,
              dan lenyap sendiri. Peringatan kita menetap di bawah isiannya,
              ikut toggle EN/ID, dan muncul serentak. */}
        <form onSubmit={onSubmit} noValidate className="mt-10 sm:mt-14">
          <fieldset disabled={locked} className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
            {/* `fieldset` yang mematikan seluruh isian sekaligus — bukan prop
                `disabled` yang ditempel satu per satu ke belasan elemen, yang
                akan terlewat persis di isian yang baru ditambahkan nanti. */}
            <Field id="apply-firstName" label={ui.firstName} error={errorFor("firstName")}>
              <input
                id="apply-firstName"
                value={values.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                onBlur={() => markTouched("firstName")}
                placeholder={ui.firstNamePlaceholder}
                autoComplete="given-name"
                aria-invalid={Boolean(errorFor("firstName"))}
                className={inputClass(Boolean(errorFor("firstName")))}
              />
            </Field>

            <Field id="apply-lastName" label={ui.lastName} error={errorFor("lastName")}>
              <input
                id="apply-lastName"
                value={values.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                onBlur={() => markTouched("lastName")}
                placeholder={ui.lastNamePlaceholder}
                autoComplete="family-name"
                aria-invalid={Boolean(errorFor("lastName"))}
                className={inputClass(Boolean(errorFor("lastName")))}
              />
            </Field>

            <Field id="apply-email" label={ui.email} error={errorFor("email")}>
              <input
                id="apply-email"
                type="email"
                value={values.email}
                onChange={(e) => set("email", e.target.value)}
                onBlur={() => markTouched("email")}
                placeholder="jane@email.com"
                autoComplete="email"
                aria-invalid={Boolean(errorFor("email"))}
                className={inputClass(Boolean(errorFor("email")))}
              />
            </Field>

            <Field id="apply-location" label={ui.location} error={errorFor("location")}>
              <input
                id="apply-location"
                value={values.location}
                onChange={(e) => set("location", e.target.value)}
                onBlur={() => markTouched("location")}
                placeholder={ui.locationPlaceholder}
                autoComplete="address-level2"
                aria-invalid={Boolean(errorFor("location"))}
                className={inputClass(Boolean(errorFor("location")))}
              />
            </Field>

            <Field
              id="apply-motivation"
              label={ui.motivation}
              error={errorFor("motivation")}
              className="sm:col-span-2"
            >
              <textarea
                id="apply-motivation"
                rows={3}
                value={values.motivation}
                onChange={(e) => set("motivation", e.target.value)}
                onBlur={() => markTouched("motivation")}
                placeholder={ui.motivationPlaceholder}
                aria-invalid={Boolean(errorFor("motivation"))}
                className={`${inputClass(Boolean(errorFor("motivation")))} resize-y`}
              />
            </Field>

            <Field
              id="apply-experience"
              label={ui.experience}
              error={errorFor("experience")}
            >
              <select
                id="apply-experience"
                value={values.experience}
                onChange={(e) => set("experience", e.target.value)}
                onBlur={() => markTouched("experience")}
                aria-invalid={Boolean(errorFor("experience"))}
                className={`${inputClass(Boolean(errorFor("experience")))} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 12 12%22 fill=%22none%22 stroke=%22%23a1a1aa%22 stroke-width=%221.5%22><path d=%22M2.5 4.5 6 8l3.5-3.5%22/></svg>')] bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10`}
              >
                {/* Opsi kosong yang TIDAK bisa dipilih ulang: tanpa `value=""`
                    yang eksplisit, browser memilih opsi pertama sendiri dan
                    "belum memilih" jadi mustahil dibedakan dari "0–1 tahun". */}
                <option value="" disabled className="bg-[#0d0d0f]">
                  {ui.experiencePlaceholder}
                </option>
                {EXPERIENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#0d0d0f]">
                    {option[lang]}
                  </option>
                ))}
              </select>
            </Field>

            {/* Skills — `fieldset` + `legend`, bukan <label>: satu label tidak
                boleh menaungi sepuluh kotak centang, dan pembaca layar akan
                membacakan grup ini sebagai satu pertanyaan. */}
            <fieldset className="sm:col-span-2">
              <legend className="flex items-baseline gap-2 text-base font-medium text-zinc-100 sm:text-lg">
                {ui.skills}
                <span className="text-xs font-light text-zinc-500">({ui.optional})</span>
              </legend>
              <div className="mt-4 grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
                {job.skills.map((skill) => (
                  <label
                    key={skill}
                    className="flex cursor-pointer items-center gap-3 text-sm font-light text-zinc-300 select-none"
                  >
                    <input
                      type="checkbox"
                      checked={skills.includes(skill)}
                      onChange={() => toggleSkill(skill)}
                      className="size-[18px] shrink-0 cursor-pointer accent-orange-500"
                    />
                    {skill}
                  </label>
                ))}
              </div>
            </fieldset>

            {/*
              Tautan opsional. Satu map, bukan blok <Field> yang saling
              menyalin: bentuk ketiganya persis sama, dan versi salin-tempelnya
              sempat membuat tiga komentar identik tentang `type="text"` hidup
              berdampingan — lalu satu di antaranya (GitHub) harus dicabut satu
              per satu dari lima tempat.
            */}
            {LINK_FIELDS.map(({ field, placeholder }) => (
              <Field
                key={field}
                id={`apply-${field}`}
                label={ui[field]}
                hint={ui.optional}
                error={errorFor(field)}
              >
                <input
                  id={`apply-${field}`}
                  /* `type="text"`, bukan `type="url"`: yang menghakimi
                     bentuknya pemeriksa kita (yang menerima domain telanjang),
                     bukan peramban. `inputMode` tetap "url" supaya papan ketik
                     ponsel tetap yang bertitik-dan-garis-miring. */
                  type="text"
                  inputMode="url"
                  value={values[field]}
                  onChange={(e) => set(field, e.target.value)}
                  onBlur={() => markTouched(field)}
                  placeholder={placeholder}
                  aria-invalid={Boolean(errorFor(field))}
                  className={inputClass(Boolean(errorFor(field)))}
                />
              </Field>
            ))}
          </fieldset>

          {/* Honeypot — perangkap bot, bukan isian.
              Disembunyikan dengan MENGGESER KE LUAR LAYAR, bukan `hidden`:
              sebagian bot melewati field yang jelas-jelas disembunyikan,
              sedangkan yang tergeser tetap terbaca sebagai isian biasa oleh
              mereka. Tiga penjaga supaya tak ada manusia yang tersangkut:
              `aria-hidden` menyembunyikannya dari pembaca layar, `tabIndex={-1}`
              melompatinya saat Tab, dan `autoComplete="off"` menahan browser
              mengisinya otomatis — autofill di sini akan membuang lamaran
              SUNGGUHAN secara diam-diam. */}
          <input
            type="text"
            name="botcheck"
            value={botcheck}
            onChange={(e) => setBotcheck(e.target.value)}
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="off"
            className="pointer-events-none absolute left-[-9999px] h-0 w-0 opacity-0"
          />

          <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-4">
            {/* Pil PUTIH, sama dengan tombol Send di form Contact — dua tombol
                kirim di situs yang sama tidak boleh berbeda warna.

                Redup selagi isian wajibnya belum lengkap, juga meniru Send.
                Bedanya: tombol ini tetap BISA DIKLIK saat redup. Send duduk
                tepat di bawah tiga isian yang semuanya terlihat sekaligus, jadi
                tombol mati di sana jelas kenapa; form ini punya enam isian wajib
                yang terbentang lebih panjang dari satu layar, dan tombol mati
                tidak memberi tahu YANG MANA yang kurang. Diklik saat redup, ia
                menandai semua isian lalu melompat ke isian buruk pertama. */}
            <button
              type="submit"
              disabled={locked}
              aria-disabled={incomplete || undefined}
              className={`rounded-full px-7 py-3 text-sm font-medium text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-40 ${
                incomplete ? "bg-white opacity-40" : "bg-white hover:bg-zinc-200"
              }`}
            >
              {busy ? ui.sending : done ? ui.sentLabel : `${ui.submit} →`}
            </button>

            {/* Satu baris yang berubah peran: catatan, galat, atau berhasil.
                Tingginya dipatok supaya tata letaknya tidak melompat saat
                statusnya berganti. */}
            <p
              aria-live="polite"
              className={`min-h-[1.25rem] max-w-md text-xs leading-relaxed font-light sm:text-sm ${
                status === "error" ? "text-red-400" : "text-zinc-500"
              }`}
            >
              {status === "error" && error
                ? error
                : done
                  ? ui.sentNote
                  : ui.idleNote}
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
