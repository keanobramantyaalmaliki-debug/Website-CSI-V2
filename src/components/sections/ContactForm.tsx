"use client";

import { useCallback, useMemo, useState } from "react";
import {
  FIELD_ORDER,
  INTERESTS,
  inquiryFieldErrors,
  submitInquiry,
  validateInquiry,
  type InquiryPayload,
} from "@/lib/contact/submitInquiry";

/**
 * Form inquiry — tulisan kode, bukan gambar tekstur.
 *
 * Bentuknya mengikuti form situs cogniti yang sudah tayang: judul besar, isian
 * yang menyatu jadi KALIMAT ("My name is ___, and I represent ___"), garis, enam
 * chip minat, lalu kotak pesan dengan pil SEND di pojok dalamnya.
 *
 * **Container query, bukan breakpoint viewport.** Komponen ini dipakai di dua
 * tempat dengan lebar yang tidak ada hubungannya dengan lebar layar: di dalam
 * layar MacBook 3D dia SELALU 1200px (nanti diperkecil oleh transform CSS milik
 * drei), sedangkan di lembar sentuh dia selebar ponsel. Kalau memakai `sm:`/`md:`
 * biasa, versi 1200px di dalam laptop akan memakai tata letak PONSEL saat dibuka
 * di ponsel — lebar elemennya tidak pernah dilihat. Makanya `@container` +
 * varian `@3xl:`: yang dibaca lebar DIRINYA SENDIRI.
 *
 * Warnanya dipatok gelap (`bg-[#0a0b0d]`), tidak ikut token `--surface-*`, karena
 * ini bertindak sebagai piksel layar yang menyala di dalam bezel hitam.
 */

const FIELD_BASE =
  "field-sizing-content min-w-[7ch] border-b bg-transparent px-1 pb-0.5 " +
  "text-inherit outline-none transition-colors placeholder:text-zinc-600 " +
  "disabled:opacity-50";

/* Warna garis bawah dipisah dari kelas dasar DENGAN SENGAJA. Kalau
   "border-red-400" cuma ditempel di belakang string yang sudah memuat
   "border-white/25", yang menang bukan yang ditulis belakangan di atribut
   melainkan yang muncul belakangan di stylesheet — jadi penandanya bisa
   diam-diam tidak kelihatan. Dipilih salah satu, tidak pernah dua-duanya. */
const FIELD_OK = "border-white/25 focus:border-white/70";
const FIELD_BAD = "border-red-400/80 focus:border-red-400";
const fieldClass = (bad: boolean) =>
  `${FIELD_BASE} ${bad ? FIELD_BAD : FIELD_OK}`;

type TouchKey = (typeof FIELD_ORDER)[number];

type Status = "idle" | "sending" | "sent" | "error";

export default function ContactForm({
  className = "",
  prefillMessage = "",
}: {
  className?: string;
  /* Isi awal kolom pesan. Dipakai halaman lowongan supaya tombol Apply
     mendaratkan pelamar di form yang sudah menyebut posisinya — sisanya
     tinggal diketik. Sengaja cuma NILAI AWAL, bukan nilai terkendali: begitu
     pengunjung mengetik, isian ini miliknya. */
  prefillMessage?: string;
}) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(prefillMessage);
  const [interests, setInterests] = useState<readonly string[]>([]);
  /* Honeypot. Dibiarkan kosong oleh manusia — lihat isiannya di dasar form. */
  const [botcheck, setBotcheck] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  /* Isian yang SUDAH pernah ditinggalkan pengunjung. Peringatan baru muncul
     setelah itu — memerahkan isian yang belum sempat disentuh sama saja
     memarahi orang sebelum ia mulai mengetik. */
  const [touched, setTouched] = useState<Partial<Record<TouchKey, boolean>>>({});
  const [error, setError] = useState<string | null>(null);

  /* Di-memo bukan demi kecepatan — objek sekecil ini gratis dibuat ulang.
     Alasannya `onSubmit` di bawah menyebutnya sebagai dependency: kalau
     `payload` objek baru tiap render, useCallback-nya tidak pernah stabil dan
     jadi pura-pura belaka. */
  const payload: InquiryPayload = useMemo(
    () => ({ name, company, email, interests, message, botcheck }),
    [name, company, email, interests, message, botcheck],
  );
  const invalid = validateInquiry(payload);
  const fieldErrors = inquiryFieldErrors(payload);

  /* Peringatan yang sedang layak tampil: masalah pertama (urut dari isian
     teratas) di antara isian yang sudah disentuh. */
  const visibleError =
    FIELD_ORDER.map((field) =>
      touched[field] ? fieldErrors[field] : undefined,
    ).find(Boolean) ?? null;

  const markTouched = useCallback((field: TouchKey) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }, []);

  const toggleInterest = useCallback((value: string) => {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }, []);

  const onSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      /* Penjaga kedua. Tombolnya memang sudah dimatikan saat `invalid`, tapi form
         masih bisa dikirim lewat Enter di dalam input. */
      if (validateInquiry(payload)) {
        setError(validateInquiry(payload));
        setStatus("error");
        return;
      }
      setStatus("sending");
      setError(null);
      const result = await submitInquiry(payload);
      if (result.ok) {
        setStatus("sent");
        return;
      }
      setError(result.error);
      setStatus("error");
    },
    [payload],
  );

  const busy = status === "sending";

  return (
    <div className={`@container ${className}`}>
      <form
        onSubmit={onSubmit}
        className="flex h-full flex-col bg-[#0a0b0d] px-6 py-7 text-zinc-200 @3xl:px-14 @3xl:py-12"
      >
        <h2 className="text-2xl leading-[1.05] font-semibold tracking-tight text-white @3xl:text-[3.4rem]">
          {/* "a" kecil — koreksi title-case dari origin/main (055d268), menyusul
              ke sini karena judulnya pindah dari kepala section Contact. */}
          Let&apos;s Start a Conversation.
        </h2>

        {/* Isian yang menyatu jadi kalimat. `field-sizing-content` membuat kotaknya
            mengikuti panjang isian di Chromium; di mesin yang belum mendukung,
            `min-w-[7ch]` menahannya tetap terbaca — bukan runtuh jadi nol. */}
        <div className="mt-6 text-base leading-[2.1] text-zinc-300 @3xl:mt-10 @3xl:text-[1.55rem] @3xl:leading-[2]">
          <p>
            My name is{" "}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => markTouched("name")}
              disabled={busy}
              aria-label="Your name"
              aria-invalid={Boolean(touched.name && fieldErrors.name)}
              placeholder="your name"
              autoComplete="name"
              className={fieldClass(Boolean(touched.name && fieldErrors.name))}
            />
            , and I represent{" "}
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              disabled={busy}
              aria-label="Company or organisation"
              placeholder="company"
              autoComplete="organization"
              className={fieldClass(false)}
            />
            .
          </p>
          <p>
            Reach me at{" "}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => markTouched("email")}
              disabled={busy}
              aria-label="Your email address"
              aria-invalid={Boolean(touched.email && fieldErrors.email)}
              placeholder="you@company.com"
              autoComplete="email"
              className={fieldClass(Boolean(touched.email && fieldErrors.email))}
            />
            .
          </p>
        </div>

        <hr className="mt-7 border-white/10 @3xl:mt-10" />

        <fieldset className="mt-6 @3xl:mt-9" disabled={busy}>
          <legend className="text-[0.6rem] tracking-[0.25em] text-zinc-500 uppercase @3xl:text-xs">
            I&apos;m interested in discussing
          </legend>
          <div className="mt-3 flex flex-wrap gap-2 @3xl:mt-5 @3xl:gap-3">
            {INTERESTS.map((option) => {
              const active = interests.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleInterest(option)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1.5 text-[0.6rem] tracking-[0.18em] uppercase transition-colors @3xl:px-5 @3xl:py-2.5 @3xl:text-[0.7rem] ${
                    active
                      ? "border-white bg-white text-black"
                      : "border-white/15 text-zinc-400 hover:border-white/40 hover:text-zinc-200"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-6 flex min-h-0 flex-1 flex-col @3xl:mt-9">
          <label
            htmlFor="inquiry-message"
            className="text-[0.6rem] tracking-[0.25em] text-zinc-500 uppercase @3xl:text-xs"
          >
            Message
          </label>
          {/* Pil SEND duduk DI DALAM kotak pesan (pojok kanan bawah), seperti
              rujukannya — jadi kotaknya `relative` dan textarea-nya diberi
              padding kanan-bawah supaya teks tidak menyelinap ke bawah tombol. */}
          <div
            className={`relative mt-3 min-h-[7rem] flex-1 rounded-xl border bg-white/[0.02] transition-colors @3xl:mt-4 ${
              touched.message && fieldErrors.message
                ? "border-red-400/80 focus-within:border-red-400"
                : "border-white/12 focus-within:border-white/30"
            }`}
          >
            <textarea
              id="inquiry-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onBlur={() => markTouched("message")}
              disabled={busy}
              aria-invalid={Boolean(touched.message && fieldErrors.message)}
              placeholder="What's on your mind?"
              className="h-full w-full resize-none bg-transparent px-4 pt-3 pb-16 text-sm outline-none placeholder:text-zinc-600 disabled:opacity-50 @3xl:px-6 @3xl:pt-5 @3xl:pb-16 @3xl:text-lg"
            />
            <button
              type="submit"
              disabled={busy || status === "sent" || Boolean(invalid)}
              className="absolute right-3 bottom-3 rounded-full bg-white px-5 py-2 text-[0.65rem] font-medium tracking-[0.18em] text-black uppercase transition-opacity hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 @3xl:right-5 @3xl:bottom-5 @3xl:px-7 @3xl:py-3 @3xl:text-xs"
            >
              {busy ? "Sending…" : status === "sent" ? "Sent ✓" : "Send →"}
            </button>
          </div>
        </div>

        {/* Honeypot — perangkap bot, bukan isian.
            Disembunyikan dengan MENGGESER KE LUAR LAYAR, bukan `display:none`
            atau `hidden`: sebagian bot memang melewati field yang jelas-jelas
            disembunyikan, sedangkan yang tergeser tetap terbaca sebagai isian
            biasa oleh mereka. Tiga penjaga supaya tak ada manusia yang tersangkut:
            `aria-hidden` menyembunyikannya dari pembaca layar, `tabIndex={-1}`
            melompatinya saat Tab, dan `autoComplete="off"` menahan browser
            mengisinya otomatis — autofill di sini akan membuang kiriman TAMU
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

        {/* Satu baris kaki yang berubah peran: catatan waktu balas, atau pesan
            galat/berhasil. Tingginya dipatok supaya tata letaknya tidak melompat
            saat statusnya berganti. */}
        <p
          aria-live="polite"
          className={`mt-4 min-h-[1.25rem] text-[0.65rem] @3xl:mt-6 @3xl:text-sm ${
            status === "error" || visibleError ? "text-red-400" : "text-zinc-500"
          }`}
        >
          {status === "error" && error
            ? error
            : status === "sent"
              ? "Thanks, your message is in. We'll be in touch."
              : (visibleError ??
                "We typically respond within one business day.")}
        </p>
      </form>
    </div>
  );
}
