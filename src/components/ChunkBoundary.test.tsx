/**
 * PENJAGA — chunk yang gagal dimuat tidak boleh menjatuhkan halaman
 *
 * ── Yang dijaga (3 Agu 2026) ───────────────────────────────────────────────
 * Repo ini punya empat `lazy()` (Scene, BilliardHUD, WaypointLabel,
 * BilliardGame) dan sebelumnya NOL error boundary. `<Suspense>` hanya menangani
 * keadaan SEDANG MEMUAT — kalau import dinamisnya ditolak, `lazy()` melempar
 * saat render, dan error render yang tidak tertangkap membuat React meng-unmount
 * SELURUH pohon. Halamannya blank, bukan cuma fiturnya hilang.
 *
 * Skenario paling nyata bukan jaringan putus, tapi **deploy saat ada tab
 * terbuka**: `bun run deploy` menulis chunk ber-hash baru dan menghapus yang
 * lama, sementara tab pengunjung masih memegang index.html lama. Risikonya
 * MENINGKAT justru karena kita menunda pemuatan (prefetch/lazy billiard) —
 * makin lama jeda antara buka halaman dan butuh chunk-nya, makin besar
 * peluangnya keburu ada deploy.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChunkBoundary from "./ChunkBoundary";

/** Komponen yang meniru chunk gagal dimuat: melempar saat render. */
function Exploding(): React.ReactNode {
  throw new Error("Failed to fetch dynamically imported module");
}

beforeEach(() => {
  // React menulis error boundary ke console.error; itu diharapkan di sini.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ChunkBoundary", () => {
  it("anak yang sehat diteruskan apa adanya", () => {
    render(
      <ChunkBoundary name="uji">
        <div data-testid="isi">halo</div>
      </ChunkBoundary>,
    );
    expect(screen.getByTestId("isi")).toBeInTheDocument();
  });

  it("chunk gagal → tidak melempar keluar, sisa halaman selamat", () => {
    // Kalau boundary-nya tidak menangkap, render() ini yang akan melempar dan
    // test-nya gagal di baris ini — persis perilaku "halaman blank".
    expect(() =>
      render(
        <div>
          <ChunkBoundary name="uji">
            <Exploding />
          </ChunkBoundary>
          <div data-testid="tetangga">bagian lain halaman</div>
        </div>,
      ),
    ).not.toThrow();

    expect(
      screen.getByTestId("tetangga"),
      "Bagian lain halaman ikut hilang saat satu chunk gagal — boundary-nya " +
        "tidak menahan error.\n",
    ).toBeInTheDocument();
  });

  it("tanpa fallback: tidak menggambar apa pun (aman di dalam Canvas)", () => {
    const { container } = render(
      <ChunkBoundary name="di-dalam-canvas">
        <Exploding />
      </ChunkBoundary>,
    );

    expect(
      container.innerHTML,
      "Boundary menggambar sesuatu padahal tidak diberi fallback. Di dalam " +
        "<Canvas> R3F itu melempar error BARU dari dalam penangkap error, " +
        "karena di sana rekonsiliasinya ke objek three, bukan ke DOM.\n",
    ).toBe("");
  });

  it("dengan fallback: fallback-nya yang tampil", () => {
    render(
      <ChunkBoundary name="uji" fallback={<div data-testid="fb">gagal</div>}>
        <Exploding />
      </ChunkBoundary>,
    );
    expect(screen.getByTestId("fb")).toBeInTheDocument();
  });

  it("fallbackWithRetry: retry me-render ulang children setelah penyebabnya direset", () => {
    // Meniru unduhan office.glb yang putus lalu pulih: lemparan pertama
    // permanen sampai "sumbernya" direset — persis kontrak resetOfficeModel +
    // retry di Hero (urutan reset dulu, baru retry).
    let shouldExplode = true;
    function Flaky(): React.ReactNode {
      if (shouldExplode) throw new Error("terputus di 7/13 MB");
      return <div data-testid="pulih">kantor tampil</div>;
    }

    render(
      <ChunkBoundary
        name="uji"
        fallbackWithRetry={(retry) => (
          <button data-testid="retry" onClick={retry}>
            coba lagi
          </button>
        )}
      >
        <Flaky />
      </ChunkBoundary>,
    );
    expect(screen.getByTestId("retry")).toBeInTheDocument();

    // Reset "sumber datanya" dulu — kalau retry diklik TANPA ini, boundary
    // menangkap error yang sama lagi dan fallback-nya balik (juga diuji di
    // bawah, sebagai jaminan retry yang gagal tidak menjatuhkan halaman).
    shouldExplode = false;
    fireEvent.click(screen.getByTestId("retry"));
    expect(screen.getByTestId("pulih")).toBeInTheDocument();
  });

  it("fallbackWithRetry: retry yang masih gagal kembali ke fallback, bukan melempar", () => {
    function AlwaysExploding(): React.ReactNode {
      throw new Error("Failed to fetch dynamically imported module");
    }
    render(
      <ChunkBoundary
        name="uji"
        fallbackWithRetry={(retry) => (
          <button data-testid="retry" onClick={retry}>
            coba lagi
          </button>
        )}
      >
        <AlwaysExploding />
      </ChunkBoundary>,
    );

    expect(() => fireEvent.click(screen.getByTestId("retry"))).not.toThrow();
    expect(
      screen.getByTestId("retry"),
      "Setelah retry yang gagal, fallback-nya harus tampil lagi — kalau tidak, " +
        "pengunjung kehilangan tombolnya dan kembali ke titik buntu.\n",
    ).toBeInTheDocument();
  });

  it("mencatat nama chunk-nya ke console — kegagalan tidak boleh senyap", () => {
    render(
      <ChunkBoundary name="BilliardGame">
        <Exploding />
      </ChunkBoundary>,
    );

    const logged = (console.error as unknown as { mock: { calls: unknown[][] } })
      .mock.calls.flat()
      .filter((a): a is string => typeof a === "string")
      .join(" ");

    expect(
      logged.includes("BilliardGame"),
      "Nama chunk tidak muncul di log. Boundary yang menelan error tanpa " +
        "jejak membuat kegagalannya mustahil didiagnosa dari laporan " +
        "pengunjung — mereka cuma bilang 'ada yang hilang'.\n",
    ).toBe(true);
  });
});
