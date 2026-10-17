import type { KatexOptions } from "katex";

/**
 * Stands in for `katex` (aliased in vite.config.ts) so the editor's math
 * extension doesn't put KaTeX in the main bundle. The first equation loads
 * KaTeX and its CSS; until then equations show as their LaTeX source.
 */
type Katex = typeof import("katex").default;

let katex: Katex | null = null;
let loading: Promise<void> | null = null;
const waiting = new Map<HTMLElement, [string, KatexOptions | undefined]>();

function load() {
  loading ??= Promise.all([import("katex/dist/katex.mjs"), import("katex/dist/katex.min.css")]).then(([m]) => {
    const real = (katex = m.default);
    for (const [el, [latex, options]] of waiting) {
      try {
        real.render(latex, el, options);
      } catch {
        // Bad LaTeX stays as its source text.
      }
    }
    waiting.clear();
  });
  return loading;
}

function render(latex: string, el: HTMLElement, options?: KatexOptions) {
  if (katex) return katex.render(latex, el, options);
  el.textContent = latex;
  waiting.set(el, [latex, options]);
  void load();
}

export default { render };
