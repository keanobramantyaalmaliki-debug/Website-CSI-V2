import { describe, it, expect, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TheCrew from "./TheCrew";
import { FALLBACK_CREW } from "@/data/crewFallback";

// jsdom lacks IntersectionObserver; motion's whileInView/useInView need it.
// Fires the callback immediately so in-view reveals resolve on mount.
class IntersectionObserverStub {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => true };
});

describe("TheCrew", () => {
  it("renders 13 people on mount", async () => {
    render(<TheCrew />);
    await waitFor(() => expect(screen.getByText("13")).toBeInTheDocument(), {
      timeout: 5000,
    });
  });

  // Jumlah kepala = angka saja. Kata "people" dicabut karena di sebelah judul
  // "The Crew" angkanya sudah terbaca sebagai jumlah orang.
  it("shows the headcount as a bare number, with no 'people' label", async () => {
    render(<TheCrew />);
    await waitFor(() => expect(screen.getByText("13")).toBeInTheDocument(), {
      timeout: 5000,
    });
    expect(screen.queryByText("people")).not.toBeInTheDocument();
    expect(screen.queryByText(/people/i)).not.toBeInTheDocument();
  });

  // Filter dicabut (semua orang tampil langsung). Kalau tab kategori kembali,
  // test ini gagal — jangan diam-diam dihidupkan lagi tanpa membahasnya.
  it("has no category filter tabs — everyone is visible at once", () => {
    render(<TheCrew />);

    for (const label of ["All", "Management", "Developer", "R & D"]) {
      expect(
        screen.queryByRole("button", { name: label }),
      ).not.toBeInTheDocument();
    }

    // Setiap orang dari setiap kategori ada di DOM tanpa klik apa pun.
    for (const member of FALLBACK_CREW) {
      expect(screen.getAllByText(member.name).length).toBeGreaterThanOrEqual(1);
    }
  });

  // "A-Z" dan nama departemen harus SEUKURAN & SAMA BOBOT. Dibandingkan lewat
  // className penuh, bukan lewat satu-dua kelas: begitu salah satunya diberi
  // ukuran/warna sendiri, test ini merah.
  it("styles the 'A-Z' and department labels identically", () => {
    render(<TheCrew />);
    const box = screen.getByTestId("crew-index");
    const az = within(box).getByText("A-Z");
    const dept = within(box).getByText("Management");

    expect(az.className).toBe(dept.className);
    expect(az.className).toMatch(/font-extrabold/);
  });

  // Pita oranye penanda baris aktif DICABUT — penanda satu-satunya sekarang
  // sorot (baris terangkat di atas tirai gelap).
  it("has no orange accent bar in the name list", () => {
    render(<TheCrew />);
    const box = screen.getByTestId("crew-index");
    expect(box.querySelectorAll("[class*='bg-accent']").length).toBe(0);
  });

  it("lays the photo wall out five per row", () => {
    render(<TheCrew />);
    expect(screen.getByTestId("crew-wall").className).toMatch(/grid-cols-5/);
  });

  it("sorts names A-Z within each department and labels the column", () => {
    render(<TheCrew />);
    const box = screen.getByTestId("crew-index");

    expect(within(box).getByText("A-Z")).toBeInTheDocument();

    for (const cat of ["Management", "Developer", "R & D"] as const) {
      const namesInCat = FALLBACK_CREW.filter((m) => m.category === cat).map(
        (m) => m.name,
      );
      // Urutan render dibaca dari posisi tiap <h3> di dalam indeks nama.
      const headings = Array.from(box.querySelectorAll("h3")).map(
        (h) => h.textContent ?? "",
      );
      const rendered = headings.filter((n) => namesInCat.includes(n));
      const expected = [...namesInCat].sort((a, b) => a.localeCompare(b));
      expect(rendered).toEqual(expected);
    }
  });

  it("keeps departments in hierarchy order, not alphabetical", () => {
    render(<TheCrew />);
    const box = screen.getByTestId("crew-index");
    const text = box.textContent ?? "";
    const iManagement = text.indexOf("Management");
    const iDeveloper = text.indexOf("Developer");
    const iRnd = text.indexOf("R & D");
    expect(iManagement).toBeLessThan(iDeveloper);
    expect(iDeveloper).toBeLessThan(iRnd);
  });

  it("every person appears in the desktop list; the mobile deck starts at the first", () => {
    render(<TheCrew />);
    const mobileCarousel = screen.getByTestId("crew-mobile-carousel");

    // Mobile is a swipe deck — only the active card (+ a couple of peek
    // cards behind it) is in the DOM at once, not the full list, dan sejak
    // 28 Agu tidak ada lagi indikator titik untuk melompat ke orang mana
    // pun. Desktop tetap merender semua nama; di mobile yang bisa dijamin
    // di sini cuma kartu orang pertama saat mount — sisanya dicapai dengan
    // menggeser/autoplay yang memutar penuh (dijamin oleh test loop di
    // TheCrewMobileCarousel.test.tsx).
    for (const member of FALLBACK_CREW) {
      expect(screen.getAllByText(member.name).length).toBeGreaterThanOrEqual(1);
    }
    expect(
      within(mobileCarousel).getByText(FALLBACK_CREW[0].name),
    ).toBeInTheDocument();
  });

  it("hovering/focusing a desktop row updates active state without throwing", async () => {
    const user = userEvent.setup();
    render(<TheCrew />);

    const firstMember = FALLBACK_CREW[0];
    const heading = screen.getAllByText(firstMember.name)[0];
    const row = heading.closest("[tabindex]") as HTMLElement;
    expect(row).toBeTruthy();

    await user.hover(row);
    await user.unhover(row);

    row.focus();
    expect(row).toHaveFocus();
    row.blur();
  });

  it("no duplicate/missing department headers for the three categories", () => {
    render(<TheCrew />);
    for (const cat of ["Management", "Developer", "R & D"]) {
      expect(screen.getAllByText(cat).length).toBeGreaterThan(0);
    }
  });

  // Kotak scroll dalam DIBUANG: daftar ikut scroll halaman seperti basement,
  // supaya tidak ada scrollbar/indikator progres di tengah tata letak dan tidak
  // ada nama yang tersembunyi di bawah batas kotak. Test ini yang menjaganya —
  // begitu `overflow-y-auto`/`max-h-` kembali ke indeks, scrollbar-nya juga
  // kembali.
  it("index list is not an inner scroll container", () => {
    render(<TheCrew />);
    const box = screen.getByTestId("crew-index");
    expect(box.className).not.toMatch(/overflow-y-auto/);
    expect(box.className).not.toMatch(/max-h-/);
    expect(box.className).not.toMatch(/absolute/);
  });

  it("hovering a row rings its avatar and leaves the others unringed", async () => {
    const user = userEvent.setup();
    render(<TheCrew />);

    const target = FALLBACK_CREW[1];
    const other = FALLBACK_CREW[0];
    const row = screen
      .getAllByText(target.name)[0]
      .closest("[tabindex]") as HTMLElement;

    const targetTile = screen.getByRole("button", { name: target.name });
    const otherTile = screen.getByRole("button", { name: other.name });

    await user.hover(row);
    await waitFor(() => {
      expect(row.querySelector("h3")?.className).toMatch(/text-zinc-50/);
      expect(targetTile.querySelector("div")?.className).toMatch(/ring-accent/);
    });
    expect(otherTile.querySelector("div")?.className).not.toMatch(/ring-accent/);
  });

  // Sorot: hover salah satu nama ATAU salah satu foto menaikkan tirai gelap
  // seukuran viewport, lalu HANYA pasangan nama+foto itu yang diangkat di
  // atasnya. Tirainya wajib `pointer-events-none` — kalau tidak, ia menutupi
  // baris yang sedang di-hover dan sorotnya berkedip mati-hidup.
  it.each([
    ["a name row", (name: string) => screen.getAllByText(name)[0].closest("[tabindex]") as HTMLElement],
    ["a photo tile", (name: string) => screen.getByRole("button", { name })],
  ])("hovering %s darkens the page and lifts only that pair", async (_label, pick) => {
    const user = userEvent.setup();
    render(<TheCrew />);

    const target = FALLBACK_CREW[2];
    const other = FALLBACK_CREW[0];
    const curtain = screen.getByTestId("crew-spotlight");
    expect(curtain.dataset.active).toBe("false");
    expect(curtain.className).toMatch(/pointer-events-none/);
    expect(curtain.className).toMatch(/fixed inset-0/);

    await user.hover(pick(target.name));

    await waitFor(() => expect(curtain.dataset.active).toBe("true"));
    // Yang diangkat: article baris itu, dan tombol foto pasangannya.
    const row = screen
      .getAllByText(target.name)[0]
      .closest("article") as HTMLElement;
    const tile = screen.getByRole("button", { name: target.name });
    expect(row.className).toMatch(/z-\[45\]/);
    expect(tile.className).toMatch(/z-\[45\]/);

    // Yang lain tetap di bawah tirai.
    const otherRow = screen
      .getAllByText(other.name)[0]
      .closest("article") as HTMLElement;
    expect(otherRow.className ?? "").not.toMatch(/z-\[45\]/);
    expect(
      screen.getByRole("button", { name: other.name }).className ?? "",
    ).not.toMatch(/z-\[45\]/);
  });

  it("unhovering lowers the curtain and clears the highlight entirely", async () => {
    const user = userEvent.setup();
    render(<TheCrew />);

    const row = screen
      .getAllByText(FALLBACK_CREW[1].name)[0]
      .closest("[tabindex]") as HTMLElement;
    const curtain = screen.getByTestId("crew-spotlight");

    await user.hover(row);
    await waitFor(() =>
      expect(row.querySelector("h3")?.className).toMatch(/text-zinc-50/),
    );

    await user.unhover(row);
    await waitFor(() => {
      const active = screen
        .getByTestId("crew-index")
        .querySelectorAll("h3.text-zinc-50");
      expect(active.length).toBe(0);
      expect(curtain.dataset.active).toBe("false");
    });
  });

  it("shows the headcount masthead next to the section title", async () => {
    render(<TheCrew />);
    expect(
      screen.getByRole("heading", { name: "The Crew" }),
    ).toBeInTheDocument();
    await waitFor(
      () => expect(screen.getByText(String(FALLBACK_CREW.length))).toBeInTheDocument(),
      { timeout: 5000 },
    );
  });
});
