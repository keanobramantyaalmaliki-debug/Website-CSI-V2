import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Careers from "./Careers";
import CareersRoles, { type CareerRole } from "./CareersRoles";

// jsdom lacks IntersectionObserver; motion's whileInView needs it.
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

const scrollToSectionSpy = vi.fn();
vi.mock("@/lib/smoothScroll", () => ({
  scrollToSection: (id: string) => scrollToSectionSpy(id),
}));

/**
 * Baris ber-<Link> dirender di dalam Careers, jadi seluruh berkas ini butuh
 * konteks router. Dibungkus di satu helper supaya tiap test tidak perlu
 * mengingatnya sendiri.
 */
function renderCareers() {
  return render(
    <MemoryRouter>
      <Careers />
    </MemoryRouter>,
  );
}

/**
 * Lowongan open yang materinya SUDAH punya halaman sendiri: barisnya tautan ke
 * `/careers/<slug>`, tanpa accordion. Pindah ke sini begitu entri-nya masuk
 * data/jobs.ts dan slug-nya diisi di Careers.tsx.
 *
 * Sejak 27 Agu SELURUH lowongan open ada di sini — tidak ada lagi accordion
 * yang benar-benar tayang. Mekanismenya tetap hidup di CareersRoles (baris
 * tanpa slug), jadi test-nya pindah ke describe kedua di bawah yang merender
 * CareersRoles langsung dengan role buatan. JANGAN dihapus: begitu ada
 * lowongan baru yang materinya belum lengkap, jalur itu yang dipakai lagi.
 */
const LINKED_ROLES = [
  { title: "Full Stack Engineer", slug: "full-stack-engineer" },
  { title: "Accountant", slug: "accountant" },
  { title: "Customer Success", slug: "customer-success" },
];

/** Sudah ditutup: baris abu-abu statis, bukan tombol. */
const CLOSED_TITLES = [
  "Innovation & Growth Manager",
  "Technical Lead",
  "Product Builder",
];

/** Header accordion sebuah role — button yang accessible name-nya memuat judul. */
function roleHeader(title: string) {
  return screen.getByRole("button", {
    name: (name) => name.includes(title),
  });
}

/** Baris role yang berupa tautan ke halaman lowongannya. */
function roleLink(title: string) {
  return screen.getByRole("link", { name: (name) => name.includes(title) });
}

/** matchMedia palsu; `(pointer: coarse)` menjawab sesuai skenario. */
function stubPointer(coarse: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("pointer: coarse") ? coarse : false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  scrollToSectionSpy.mockClear();
});

describe("Careers — roles list (port V1)", () => {
  /*
   * Role yang punya halaman sendiri TIDAK BOLEH tetap jadi accordion: kalau
   * slug-nya diisi tapi baris ini masih <button aria-expanded>, tautannya tak
   * pernah bisa dibagikan dan halaman yang sudah ditulis jadi tak terjangkau
   * dari situs.
   */
  it("role yang punya halaman sendiri jadi tautan, bukan accordion", () => {
    renderCareers();

    for (const { title, slug } of LINKED_ROLES) {
      const link = roleLink(title);
      expect(link).toHaveAttribute("href", `/careers/${slug}`);
      expect(link).not.toHaveAttribute("aria-expanded");

      // Dan accordion-nya benar-benar tidak ada — bukan sekadar tertutup.
      expect(
        screen.queryByRole("button", { name: (name) => name.includes(title) }),
      ).toBeNull();
    }
  });

  it("closed roles are inert text, not buttons — unclickable and untabbable", () => {
    renderCareers();

    for (const title of CLOSED_TITLES) {
      // Judulnya tampil...
      expect(screen.getByText(title)).toBeInTheDocument();
      // ...tapi tidak ada kontrol apa pun yang membawanya, jadi tidak ada
      // yang bisa diklik, di-hover, atau dijangkau Tab.
      expect(
        screen.queryByRole("button", { name: (name) => name.includes(title) }),
      ).toBeNull();
      expect(
        screen.queryByRole("link", { name: (name) => name.includes(title) }),
      ).toBeNull();
    }

    expect(screen.getAllByTestId("career-role-closed")).toHaveLength(
      CLOSED_TITLES.length,
    );
    expect(screen.getAllByText("(closed)")).toHaveLength(CLOSED_TITLES.length);
  });

  it("closed roles never render their overview or skills", () => {
    renderCareers();
    // Overview Technical Lead (kini closed) tidak ada di DOM sama sekali.
    expect(screen.queryByText(/lead engineering execution/i)).toBeNull();
    expect(screen.queryByText("Team leadership")).toBeNull();
  });

  it("shows the Role / Type table header", () => {
    renderCareers();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    // Location sengaja dibuang dari tabel.
    expect(screen.queryByText("Location")).toBeNull();
  });

});

/**
 * Accordion — jalur baris TANPA slug.
 *
 * Dirender dari <CareersRoles> langsung, bukan lewat <Careers>: seluruh
 * lowongan open situs sekarang punya halaman sendiri, jadi tidak ada satu pun
 * accordion yang bisa diklik di section aslinya. Mekanismenya masih ada di
 * kode (dan dipakai lagi begitu ada lowongan yang materinya belum lengkap),
 * jadi role buatan di bawah ini yang menjaganya — menghapus test-nya berarti
 * cabang `!hasPage` di CareersRoles jalan tanpa penjaga sampai ada yang sadar.
 */
const ACCORDION_ROLES: CareerRole[] = [
  {
    title: "Role Tanpa Halaman",
    type: "Engineering",
    status: "open",
    overview: "Overview role pertama yang mengembang di tempat.",
    skills: ["Skill Pertama"],
    photo: "/careers/fullstack-engineer.jpg",
  },
  {
    title: "Role Kedua",
    type: "Product",
    status: "open",
    overview: "Overview role kedua.",
    skills: ["Skill Kedua"],
    photo: "/careers/product-builder.jpg",
  },
];

describe("CareersRoles — accordion (baris tanpa slug)", () => {
  function renderAccordion() {
    return render(
      <MemoryRouter>
        <CareersRoles roles={ACCORDION_ROLES} />
      </MemoryRouter>,
    );
  }

  it("renders every accordion role collapsed", () => {
    renderAccordion();
    for (const { title } of ACCORDION_ROLES) {
      expect(roleHeader(title)).toHaveAttribute("aria-expanded", "false");
    }
  });

  it("expands a clicked role and shows its overview + skill tags", async () => {
    const user = userEvent.setup();
    renderAccordion();

    await user.click(roleHeader("Role Tanpa Halaman"));

    expect(roleHeader("Role Tanpa Halaman")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(
      screen.getByText(/overview role pertama/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Skill Pertama")).toBeInTheDocument();
  });

  /* Butuh DUA accordion untuk dibuktikan — itu sebabnya test ini sempat
     pensiun saat lowongan open terakhir pindah ke halaman sendiri. Dengan
     role buatan, state `active` tunggal bisa dijaga lagi. */
  it("only one role is open at a time", async () => {
    const user = userEvent.setup();
    renderAccordion();

    await user.click(roleHeader("Role Tanpa Halaman"));
    await user.click(roleHeader("Role Kedua"));

    expect(roleHeader("Role Tanpa Halaman")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(roleHeader("Role Kedua")).toHaveAttribute("aria-expanded", "true");
  });

  it("clicking an open role collapses it again", async () => {
    const user = userEvent.setup();
    renderAccordion();

    await user.click(roleHeader("Role Tanpa Halaman"));
    await user.click(roleHeader("Role Tanpa Halaman"));

    expect(roleHeader("Role Tanpa Halaman")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("the role CTA scrolls to #contact through smoothScroll", async () => {
    const user = userEvent.setup();
    renderAccordion();

    await user.click(roleHeader("Role Tanpa Halaman"));
    // Body role lain aria-hidden, jadi query role hanya melihat CTA yang terbuka.
    await user.click(
      screen.getByRole("button", { name: /start a conversation/i }),
    );

    expect(scrollToSectionSpy).toHaveBeenCalledWith("contact");
  });

  it("touch: no cursor-follow preview; photo renders inside the expanded body", async () => {
    stubPointer(true);
    const user = userEvent.setup();
    renderAccordion();

    await user.click(roleHeader("Role Tanpa Halaman"));

    // Satu foto per body role (fallback .role-photo-mobile V1) — bukan
    // preview pengikut kursor, yang memang tidak dirender di pointer kasar.
    expect(screen.getAllByTestId("career-role-photo-mobile")).toHaveLength(
      ACCORDION_ROLES.length,
    );
  });
});
