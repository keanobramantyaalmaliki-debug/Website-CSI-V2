/**
 * Jaring pengaman konten.
 *
 * Yang diuji di sini bukan "apakah fetch jalan", tapi apakah situs tetap
 * menampilkan sesuatu ketika CMS-nya TIDAK jalan. Itu satu-satunya alasan
 * lapisan fallback ini ada, dan satu-satunya cara memastikannya masih bekerja
 * tanpa harus mematikan server sungguhan setiap kali.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Job } from "@shared/job";
import type { ContentPayload } from "@shared/content";

import { __resetContent, contentJobs, loadContent } from "./store";
import { careerRoles, FALLBACK_ROLES } from "@/data/careerRoles";
import { getJob, jobPostings } from "@/data/jobs";

const job = (over: Partial<Job> = {}): Job => ({
  id: "1",
  slug: "data-engineer",
  title: "Data Engineer",
  department: "Engineering",
  state: "open",
  overview: "Bangun jalur data.",
  photo: "/uploads/foo.webp",
  skills: ["SQL"],
  askGithub: true,
  sortOrder: 0,
  detail: {
    en: { intro: "Join us.", responsibilities: ["Build"], qualifications: ["SQL"] },
    id: { intro: "Bergabunglah.", responsibilities: ["Bangun"], qualifications: ["SQL"] },
  },
  ...over,
});

const payload = (jobs: Job[]): ContentPayload => ({
  version: 1,
  generatedAt: "2026-08-31T00:00:00.000Z",
  vision: null,
  footer: null,
  jobs,
  values: [],
  crew: [],
  projects: [],
  caseStudies: [],
  services: [],
  testimonials: [],
  industries: [],
  deployments: [],
  processSteps: [],
});

function mockFetch(impl: () => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

beforeEach(() => {
  __resetContent();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  __resetContent();
});

describe("content.json berhasil diambil", () => {
  it("isinya yang dipakai, bukan data bundle", async () => {
    mockFetch(async () => Response.json(payload([job()])));
    await loadContent();

    expect(contentJobs()).toHaveLength(1);
    expect(careerRoles().map((r) => r.title)).toEqual(["Data Engineer"]);
    expect(getJob("data-engineer")?.id.intro).toBe("Bergabunglah.");
  });

  it("lowongan tanpa isi halaman tetap accordion — tanpa slug", async () => {
    mockFetch(async () =>
      Response.json(payload([job({ detail: null, slug: "tanpa-halaman" })])),
    );
    await loadContent();

    expect(careerRoles()[0].slug).toBeUndefined();
    expect(jobPostings()).toHaveLength(0);
    expect(getJob("tanpa-halaman")).toBeNull();
  });

  it("state closed jadi baris mati", async () => {
    mockFetch(async () => Response.json(payload([job({ state: "closed" })])));
    await loadContent();
    expect(careerRoles()[0].status).toBe("closed");
  });
});

describe("CMS tidak bisa dihubungi", () => {
  const bundleTitles = FALLBACK_ROLES.map((r) => r.title);

  it("jaringan mati → konten bundle", async () => {
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    await loadContent();

    expect(contentJobs()).toBeNull();
    expect(careerRoles().map((r) => r.title)).toEqual(bundleTitles);
    expect(getJob("full-stack-engineer")).not.toBeNull();
  });

  it("404 → konten bundle", async () => {
    mockFetch(async () => new Response("", { status: 404 }));
    await loadContent();
    expect(careerRoles().map((r) => r.title)).toEqual(bundleTitles);
  });

  it("JSON rusak → konten bundle, bukan halaman error", async () => {
    mockFetch(async () => new Response("{ setengah", { status: 200 }));
    await loadContent();
    expect(careerRoles().map((r) => r.title)).toEqual(bundleTitles);
  });

  it("versi tidak dikenal → konten bundle", async () => {
    mockFetch(async () =>
      Response.json({ ...payload([job()]), version: 99 }),
    );
    await loadContent();
    expect(contentJobs()).toBeNull();
  });

  it("kelewat lama → tidak menggantung, jatuh ke bundle", async () => {
    vi.useFakeTimers();
    mockFetch(
      (): Promise<Response> =>
        new Promise((_resolve, reject) => {
          /* Tiru AbortController: fetch sungguhan menolak dengan AbortError
             saat sinyalnya dibatalkan. */
          setTimeout(
            () => reject(new DOMException("Aborted", "AbortError")),
            1500,
          );
        }),
    );

    const pending = loadContent();
    await vi.advanceTimersByTimeAsync(1600);
    await pending;
    vi.useRealTimers();

    expect(contentJobs()).toBeNull();
    expect(careerRoles().map((r) => r.title)).toEqual(bundleTitles);
  });

  it("loadContent tidak pernah melempar", async () => {
    mockFetch(async () => {
      throw new Error("apa saja");
    });
    await expect(loadContent()).resolves.toBeUndefined();
  });
});
