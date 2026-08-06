import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

/**
 * Penanda pada tiap kata di pass pengukuran. Dipasang di LineMask, dibaca di
 * sini — kalau salah satunya berubah, pengukuran diam-diam tidak menemukan apa
 * pun dan teks jatuh ke perilaku satu baris.
 */
export const LINE_WORD_SELECTOR = "[data-line-word]";

/**
 * Kelompokkan kata menjadi baris berdasarkan posisi vertikalnya setelah layout.
 *
 * Sengaja tidak menebak dari tanda baca atau lebar karakter: patahan baris
 * ditentukan browser (lebar kontainer, font yang benar-benar termuat,
 * hyphenation, `text-wrap: balance`), jadi satu-satunya sumber yang jujur
 * adalah hasil layout itu sendiri.
 */
export function groupIntoLines(
  words: readonly { top: number; text: string }[],
): string[] {
  const lines: string[] = [];
  let currentTop: number | null = null;

  for (const word of words) {
    if (currentTop === null || word.top !== currentTop) {
      lines.push(word.text);
      currentTop = word.top;
    } else {
      lines[lines.length - 1] += ` ${word.text}`;
    }
  }

  return lines;
}

/**
 * Ukur bagaimana `text` benar-benar terpatah menjadi baris di dalam `ref`.
 *
 * Mengembalikan `null` selama belum terukur — pemanggil dipersilakan merender
 * pass pengukuran (kata-kata bertanda {@link LINE_WORD_SELECTOR}) selama itu.
 * Pengukuran berjalan di `useLayoutEffect`, jadi pass tersebut tidak pernah
 * sempat dilukis.
 *
 * @param freeze hentikan pengukuran ulang. Dipakai setelah teksnya tersingkap:
 *   mengukur ulang berarti memasang ulang elemennya, dan animasi masuk akan
 *   terulang di tengah halaman yang sedang dibaca.
 */
export function useLineSplit(
  ref: RefObject<HTMLElement | null>,
  text: string | null,
  freeze: boolean,
): string[] | null {
  const [lines, setLines] = useState<string[] | null>(null);
  const measuredWidth = useRef(-1);

  useLayoutEffect(() => {
    if (text === null || lines !== null) return;

    const host = ref.current;
    if (!host) return;

    const nodes = host.querySelectorAll<HTMLElement>(LINE_WORD_SELECTOR);
    if (nodes.length === 0) return;

    measuredWidth.current = host.offsetWidth;
    setLines(
      groupIntoLines(
        Array.from(nodes, (node) => ({
          // offsetTop, bukan getBoundingClientRect(): nilainya bulat dan relatif
          // terhadap offsetParent, jadi dua kata di baris yang sama pasti sama
          // persis tanpa perlu toleransi sub-piksel.
          top: node.offsetTop,
          text: node.textContent ?? "",
        })),
      ),
    );
  }, [ref, text, lines]);

  // Patahan baris berubah kalau lebarnya berubah — atau kalau font aslinya baru
  // termuat setelah layout pertama memakai font cadangan.
  useEffect(() => {
    if (text === null || freeze) return;

    const host = ref.current;
    if (!host) return;

    const invalidate = () => {
      measuredWidth.current = -1;
      setLines(null);
    };

    let cancelled = false;

    // ResizeObserver tidak ada di jsdom, dan tiap berkas test men-stub-nya
    // sendiri. Tanpa penjaga ini, merender section mana pun di test akan gagal
    // hanya karena headingnya memakai LineMask.
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            // Tinggi ikut berubah saat baris bertambah — dan itu hasil, bukan
            // sebab. Hanya lebar yang boleh memicu ukur ulang, kalau tidak
            // pengukurannya memicu dirinya sendiri.
            if (host.offsetWidth === measuredWidth.current) return;
            invalidate();
          });
    observer?.observe(host);

    const fonts = document.fonts;
    // status "loaded" berarti layout pertama sudah memakai font yang benar.
    if (fonts && fonts.status !== "loaded") {
      void fonts.ready.then(() => {
        if (!cancelled) invalidate();
      });
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [ref, text, freeze]);

  return lines;
}
