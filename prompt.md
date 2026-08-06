# Task: rebuild the "Crew" section with photography + hover interaction

## Reference

A working prototype of the target interaction is attached separately (`crew-redesign-prototype.html`). Open it in a browser first. Treat its CSS transitions and the `setActive()` / filter logic in its `<script>` as the interaction spec — the visual polish (exact colors, font) is a rough approximation, not the final design language.

## Where

"The Crew" subsection, inside the People/Function page of the cogniti (Cognitiva Solusi Indonesia) site — currently a flat text list grouped by Management / Design / Engineering, with no photography anywhere in the section.

## Goal

Replace the flat list with a photo-driven layout: hover-synced index + sticky portrait on desktop, a grouped photo grid on mobile. No other section of the page needs to change.

## Behavior spec

**Desktop (&gt;720px)**

- Two columns: name/role/links index (left) — sticky large portrait panel (right).
- Hover or keyboard focus on a row cross-fades the portrait to that person (~150ms fade out, swap content, ~280ms fade in — see the prototype's `setActive()`).
- Active row: a 2px accent bar on the left edge scales in; the name brightens from muted to full contrast.
- Rows animate in (fade + translateY) staggered on mount, roughly 35ms per row.

**Mobile (≤720px)**

- 2-column photo card grid, still grouped by department with visible department labels.
- No hover dependency — photo, name, role, and links are all visible on the card directly.

**Shared**

- Filter tabs: All / Management / Design / Engineering. Filtering hides non-matching people on both breakpoints and updates the "N people" counter.
- The counter animates (count-up) on mount and again on every filter change.
- Rows/cards are keyboard-focusable with a visible focus state.
- Respect `prefers-reduced-motion` (disable the transitions above when set).

## Data

Source this from wherever the Crew data currently lives in the codebase — don't hardcode a second copy. For reference, the current 8 entries:


| Name             | Role                          | Department  | Links            |
| ---------------- | ----------------------------- | ----------- | ---------------- |
| Fahmi Maliki     | Founder &amp; Chief Executive | Management  | LinkedIn         |
 Lena Almaliki     | Chief Executive | Management  | LinkedIn         |
| Jun              | Manager                       | Management  | LinkedIn         |
| Imam Maliki      | Head of Operations            | Management  | LinkedIn         |
| Lisa Puspitasari      | Asistant Manager           | Management  | LinkedIn         |
| Bagas Nusantara Nabillah  | Senior Developer             | Developer      | LinkedIn, X      |
| Amallia Dwi Yustianti  | Senior Developer             | Developer      | LinkedIn, X      |
| Nico Arya Putra Laksana      | Junior Developer       | Developer     | LinkedIn         |
| Keano Bramantya Almaliki   | Junior Developer                 | Developer      | LinkedIn         |
| Sayyid   | Junior Developer                 | Developer      | LinkedIn         |
| Bayu       | Research & Development           | R &amp; D| LinkedIn           |
| Roni   | Research & Development           | R &amp; D| LinkedIn           |
| Inno   | Research & Development           | R &amp; D| LinkedIn           |



## Photos

No real photography exists yet. Ship the placeholder treatment from the prototype (per-person muted gradient + initials) as the default, and structure the component so a real `photoUrl` can be added per person later without further layout changes — fall back to the placeholder whenever `photoUrl` is absent.

## Implementation notes

- Build as a component using the project's existing stack and conventions (check the current Tailwind config and any animation libraries already installed before adding new dependencies).
- The crossfade/hover logic can be hand-rolled (state = active index; delay the content swap until fade-out completes — see the prototype's vanilla JS for the exact timing) or based on Skiper UI's "Hover members" / "Team showcase scroll" components ([https://skiper-ui.com/components](https://skiper-ui.com/components)) — note that some Skiper UI components are paid, confirm licensing before adopting one.
- For the entrance/scroll-reveal animation, React Bits' "SplitText" or "BlurText" ([https://reactbits.dev](https://reactbits.dev)) are reasonable off-the-shelf options if the project has no existing scroll-reveal utility.
- Use the project's real design tokens (color, type scale, spacing) throughout — the prototype's palette (`#0b0a09` background / `#e2672e` accent) is only an approximation of the brand, not the source of truth.

## Explicitly out of scope

The empty/duplicate "Let's Start A Conversation" block observed between the hero and the People section is a separate, unrelated issue — flag it if still present, but don't investigate or fix it as part of this task.

## Done when

- [ ] Every person shows a photo (or placeholder) on both breakpoints
- [ ] Desktop hover/focus swaps the portrait with no layout shift
- [ ] Mobile requires zero interaction to see anyone's info
- [ ] Filter updates both the visible people and the counter
- [ ] No console errors; fully keyboard-navigable; reduced-motion respected

