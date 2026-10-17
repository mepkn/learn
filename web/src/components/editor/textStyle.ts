import { TextStyle } from "@tiptap/extension-text-style";

// Markdown has no colours, so coloured text is saved as an inline HTML span
// (`<span style="color: …; background-color: …">text</span>`) and read back here.
const SPAN = /^<span style="([^"]*)">([\s\S]*?)<\/span>/;
const SAFE_VALUE = /^(#[0-9a-f]{3,8}|(rgba?|hsla?|oklch|var)\([-\w\s,.%/]*\)|[a-z]+)$/i;

function readStyle(style: string) {
  const attrs: { color?: string; backgroundColor?: string } = {};
  for (const part of style.split(";")) {
    const [prop, ...rest] = part.split(":");
    const value = rest.join(":").trim();
    if (!SAFE_VALUE.test(value)) continue;
    if (prop.trim() === "color") attrs.color = value;
    if (prop.trim() === "background-color") attrs.backgroundColor = value;
  }
  return attrs;
}

export const MarkdownTextStyle = TextStyle.extend({
  markdownTokenizer: {
    name: "textStyle",
    level: "inline",
    start: (src: string) => src.indexOf("<span style="),
    tokenize: (src, _tokens, lexer) => {
      const match = src.match(SPAN);
      if (!match) return;
      return { type: "textStyle", raw: match[0], attrs: readStyle(match[1]), tokens: lexer.inlineTokens(match[2]) };
    },
  },
  parseMarkdown: (token, helpers) =>
    helpers.applyMark("textStyle", helpers.parseInline(token.tokens ?? []), token.attrs as Record<string, string>),
  renderMarkdown: (node, h) => {
    const { color, backgroundColor } = (node.attrs ?? {}) as { color?: string | null; backgroundColor?: string | null };
    const style = [color && `color: ${color}`, backgroundColor && `background-color: ${backgroundColor}`]
      .filter(Boolean)
      .join("; ");
    const text = h.renderChildren(node);
    return style ? `<span style="${style}">${text}</span>` : text;
  },
});
