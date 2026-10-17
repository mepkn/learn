import { describe, expect, test } from "vitest";
import { MarkdownManager } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import { pastedMarkdown } from "./markdownPaste";

const md = new MarkdownManager({ extensions: [StarterKit, TableKit] });

describe("pasting markdown", () => {
  test("reads plain text as markdown", () => {
    expect(pastedMarkdown({ text: "# Title", html: "" }, false)).toBe("# Title");
  });

  test("leaves HTML pastes to the editor", () => {
    expect(pastedMarkdown({ text: "Title", html: "<h1>Title</h1>" }, false)).toBeNull();
  });

  test("pastes into code blocks as typed", () => {
    expect(pastedMarkdown({ text: "| a | b |", html: "" }, true)).toBeNull();
  });

  test("ignores empty text", () => {
    expect(pastedMarkdown({ text: "  \n", html: "" }, false)).toBeNull();
  });

  test("a pasted table becomes a table", () => {
    const text = "| Database | Notes |\n|---|---|\n| **MySQL** | no `schema` level |";
    const json = JSON.stringify(md.parse(pastedMarkdown({ text, html: "" }, false)!));
    expect(json).toContain('"type":"table"');
    expect(json).toContain('"type":"tableHeader"');
    expect(json).toContain('"type":"bold"');
    expect(json).toContain('"type":"code"');
  });
});
