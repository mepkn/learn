import { InlineMath } from "@tiptap/extension-mathematics";

// Pandoc's rule for $…$: no space just inside the dollars and no digit after
// the closing one, so prices like "$5 and $10" stay plain text.
export const StrictInlineMath = InlineMath.extend({
  markdownTokenizer: {
    name: "inlineMath",
    level: "inline",
    start: (src: string) => src.indexOf("$"),
    tokenize: (src: string) => {
      const match = src.match(/^\$(?!\s)([^$\n]*?[^$\s\\])\$(?![\d$])/);
      if (!match) return;
      return { type: "inlineMath", raw: match[0], latex: match[1] };
    },
  },
});
