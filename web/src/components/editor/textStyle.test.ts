import { describe, expect, test } from "vitest";
import { MarkdownManager } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { BackgroundColor, Color } from "@tiptap/extension-text-style";
import { MarkdownTextStyle } from "./textStyle";

const md = new MarkdownManager({ extensions: [StarterKit, MarkdownTextStyle, Color, BackgroundColor] });

describe("coloured text in markdown", () => {
  test("saves colours as a span", () => {
    const doc = {
      type: "doc",
      content: [{ type: "paragraph", content: [
        { type: "text", text: "a " },
        { type: "text", text: "red", marks: [{ type: "textStyle", attrs: { color: "#dc2626", backgroundColor: "#fef08a" } }] },
      ] }],
    };
    expect(md.serialize(doc)).toBe('a <span style="color: #dc2626; background-color: #fef08a">red</span>');
  });

  test("reads colours back, with marks inside", () => {
    const json = JSON.stringify(md.parse('a <span style="color: #dc2626">**red**</span> b'));
    expect(json).toContain('"color":"#dc2626"');
    expect(json).toContain('"type":"bold"');
  });

  test("survives a save and reload", () => {
    const text = 'x <span style="background-color: #fef08a">mark</span> y';
    expect(md.serialize(md.parse(text))).toBe(text);
  });

  test("ignores unsafe style values", () => {
    expect(JSON.stringify(md.parse('<span style="color: url(x);x">t</span>'))).not.toContain("url");
  });
});
