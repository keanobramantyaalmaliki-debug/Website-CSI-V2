---
name: premium-dark-sections
description: Build premium, minimalist, dark-mode content sections for landing/marketing/portfolio pages, with a consistent scroll-driven motion system (heading reveals, staggered lists, scroll word-highlights, marquees, hover underlines). Use this whenever the user is designing or building page CONTENT — hero, manifesto, services, feature grids, deployments, process, industries, careers, vision, contact, or any "section" of a marketing/portfolio site — and wants a high-end editorial dark aesthetic with tasteful Framer Motion / `motion` animations. Also use when the user wants to reproduce or extend an existing content design system across a new project, keep section styling/animation consistent, or asks for "the same look/feel" as a previous site. Trigger even if they don't say "premium" or "dark" explicitly — if they're building content sections with scroll animations, reach for this. Content layer only; does NOT cover 3D/WebGL/Three.js scenes (out of scope by design).
---

# Premium Dark Sections

A content-layer design system for high-contrast, minimalist, dark-mode marketing/portfolio pages with a disciplined scroll-driven motion catalog. Extracted from a real production build (`cogniti.id`) and generalized so the same look + feel can be reproduced on any project by swapping tokens while keeping the motion identical.

**Scope:** the *content* layer — sections, typography, layout rhythm, and scroll transitions. This skill deliberately does **not** touch 3D / WebGL / Three.js / R3F scenes; those are a separate concern owned elsewhere. If a page has a 3D hero, this skill styles everything *below/around* it.

**Stack:** written for React 19 + Next.js App Router + `motion` (Framer Motion v11+) + Tailwind. Fully portable to Vite/CRA (drop the `"use client"` directives) and to Tailwind v3 (the zinc classes are identical; only the theme setup differs). The one non-negotiable dependency is `motion`.

The whole approach rests on one idea: **every section is the same skeleton, and every animation comes from a fixed catalog of seven transitions.** Consistency is the product. Never invent a one-off animation or a bespoke section layout — compose from the catalog below.

---

## Design tokens (the single source of truth)

Reproduce these exactly for the signature look. To reskin for a different brand, change **only** the color role mappings and the font — leave motion, spacing, and type-scale intact.

**Color — pure-black canvas, zinc text ramp (Tailwind zinc scale):**

| Role | Value | Class |
| --- | --- | --- |
| Canvas / page background | `#000000` (pure black) | `bg-black` |
| Surface / card / pill | zinc-950 `#09090b` | `bg-zinc-950` |
| Border / divider | zinc-900 `#18181b` | `border-zinc-900` |
| Meta / number / dim | zinc-600 `#52525b` | `text-zinc-600` |
| Body copy | zinc-500 `#71717a` | `text-zinc-500` |
| Label / eyebrow / muted | zinc-400 `#a1a1aa` | `text-zinc-400` |
| Heading / primary text | zinc-100 `#f4f4f5` | `text-zinc-100` |
| Hover peak (accent) | white `#ffffff` | `hover:text-white` |

There is intentionally **no chromatic accent color**. Emphasis comes from contrast (zinc-600 → zinc-100 → white) and motion, not hue. If a brand needs an accent, introduce exactly one and use it sparingly (a single hover state or underline), never as fills.

**Typography:** Geist Sans (body/UI) + Geist Mono (numerals/labels where a technical feel helps). Substitute per brand, but keep a clean grotesque/neo-grotesque sans.

| Element | Recipe |
| --- | --- |
| Eyebrow | `text-xs uppercase tracking-widest text-zinc-400` |
| H2 (section heading) | `text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-100` |
| H3 (item title) | `font-medium text-zinc-100` |
| Body | `text-sm leading-relaxed text-zinc-500` |
| Numerals / index | `tabular-nums text-zinc-600` |

**Layout rhythm:**

| Token | Value |
| --- | --- |
| Section padding | `px-6 py-24 sm:px-10 sm:py-32` |
| Eyebrow → heading gap | `mt-3` |
| Heading → content gap | `mt-8` (prose) or `mt-12` (lists/grids) |
| Row dividers | `divide-y divide-zinc-900 border-y border-zinc-900` |

**Motion physics (defined once, in `references/motion-primitives.tsx`):**

- `EASE = [0.16, 1, 0.3, 1]` — the one easing curve used everywhere. This is what reads as "premium."
- `VIEWPORT = { once: true, margin: "0px 0px -60px 0px" }` — reveals fire once, just before full entry.
- Every primitive honors `useReducedMotion()` and degrades to a static, legible state.

---

## The section skeleton

Every section is built from this template. Fill the three slots; never deviate from the order.

```tsx
import { Eyebrow, LineMask } from "@/components/motion/primitives";

export default function SomeSection() {
  return (
    <section id="some-section" className="px-6 py-24 sm:px-10 sm:py-32">
      {/* 1. EYEBROW (T6) — the tie-that-binds label */}
      <Eyebrow>Section Label</Eyebrow>

      {/* 2. HEADING (T1) — clip-mask reveal; wrapping is measured, so pass the
          whole sentence as one string and let it find its own line breaks */}
      <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
        <LineMask>A short, declarative heading.</LineMask>
      </h2>

      {/* 3. CONTENT — pick ONE body pattern from the catalog (T2/T3/T5) */}
      <div className="mt-12">{/* ... */}</div>
    </section>
  );
}
```

**Data-driven rule:** define section content as a `const ARRAY` of plain objects at the top of the file, then `.map()` it into markup. Content and presentation stay separate, so editing copy never risks the layout. (See the pattern in every section of the source build.)

---

## The transition catalog (T1–T7)

Seven transitions cover every content need. Full, copy-ready source is in **`references/motion-primitives.tsx`** — read that file when you need the exact implementation. Decision guide:

| ID | Name | What it does | Reach for it when… |
| --- | --- | --- | --- |
| **T1** | `LineMask` | Heading slides up from behind a mask (y 110%→0, 0.8s), **one mask per wrapped line, stagger 0.12** | Every section heading. The default reveal for large type. |
| **T2** | `FadeUpList` / `FadeUpItem` | Children rise + fade in sequence (stagger 0.04) | Card grids, feature lists, numbered steps, row tables, mission bullets. |
| **T3** | `ScrollHighlight` | Words brighten dim→bright driven by scroll | Manifesto / statement / mission prose. Use as a **bookend**: one high on the page, one low. |
| **T4** | *(scroll-activated node reveal)* | Sequenced "unfolding" as a block scrolls | Diagrammatic / architecture / stepped narratives. Ship the simplified inline version (progress-driven opacity per node); defer full sticky-pin unless the section truly needs it. |
| **T5** | `Marquee` | Seamless infinite horizontal strip | Tag clouds, industries, logos, tech stack. Place full-bleed, outside padded containers. |
| **T6** | `Eyebrow` | Uppercase label slides in from left | Above **every** heading. Non-negotiable — it's the system's signature. |
| **T7** | `UnderlineWipe` | Underline grows from left on hover | CTA links, nav items, interactive list rows. |

**Composition heuristics:**
- One section = one eyebrow (T6) + one heading (T1) + **one** primary body pattern. Don't stack T2 and T3 in the same section; pick the one that fits the content shape.
- Prose that argues a point → **T3**. Enumerable items → **T2**. A flat set of labels → **T5**.
- Interactive rows (careers, contact links) → **T2** for entry + **T7** on hover.
- Resist adding an eighth transition. If something "needs" a new animation, first check whether re-shaping the content lets an existing one carry it.

---

## Applying this to a *different* project (reuse without copy-paste rot)

This is the point of the skill — same feel, new brand, no drift.

1. **Copy the primitives once.** Drop `references/motion-primitives.tsx` into `src/components/motion/primitives.tsx`. Install `motion`. Done — the motion layer never changes between projects.
2. **Set two brand knobs, nothing else:**
   - The **color role map** (the 8 rows in the token table). For a *lighter* brand, invert the ramp (white canvas, zinc-100→zinc-900 text) but keep the *contrast relationships* and hover-to-peak idea.
   - The **font** pair.
3. **Reproduce the skeleton + rhythm verbatim.** Padding, gaps, type scale, dividers, `tabular-nums` — these are what make different sites feel like the same hand made them. Do not re-tune per project.
4. **Build sections by composing the catalog**, data-driven, in the fixed order.
5. **Sanity pass:** every section has an eyebrow; every heading uses LineMask; reduced-motion still reads cleanly; no chromatic fills crept in.

Result: a new project inherits the exact editorial-dark feel in an afternoon, and any future section slots in without a design decision.

---

## Anti-patterns (what breaks the look)

- ❌ Chromatic accent fills, gradients-as-decoration, or glassmorphism. This system is monochrome-by-discipline.
- ❌ A bespoke animation for one section. Compose from T1–T7 or reshape the content.
- ❌ Per-component easing/duration tweaks. Change `EASE`/`VIEWPORT` centrally or not at all.
- ❌ Splitting a heading across two `LineMask`s just to stagger its lines. T1 measures where the text actually wraps and staggers them itself; a hand-split breaks at the wrong place on every width you didn't check. Two `LineMask`s are only for a break the design *insists* on — then space them with `delay={LINE_STAGGER}`, never a fresh number.
- ❌ Heading without an eyebrow, or an eyebrow that isn't uppercase-tracked-widest.
- ❌ Skipping `useReducedMotion` handling — every primitive must degrade gracefully.
- ❌ Inline content literals scattered in JSX. Keep the `const ARRAY` + `.map()` pattern.
- ❌ Pulling 3D/WebGL concerns in here. That layer lives elsewhere; this skill stops at the content.

---

## Reference files

- **`references/motion-primitives.tsx`** — the complete, ready-to-copy source for all seven transitions (T1–T7) plus the shared `EASE`/`VIEWPORT` constants. Read/copy this when implementing; it is the canonical motion layer.
