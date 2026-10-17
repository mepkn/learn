import { describe, expect, test } from "vitest";
import { MarkdownManager } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { BlockMath } from "@tiptap/extension-mathematics";
import { StrictInlineMath } from "./math";

const md = new MarkdownManager({ extensions: [StarterKit, StrictInlineMath, BlockMath] });
const roundTrip = (text: string) => md.serialize(md.parse(text));

describe("math markdown", () => {
  test("parses inline and block equations", () => {
    const doc = md.parse("Energy $E = mc^2$ and $x$.\n\n$$\n\\int_0^1 x\\,dx\n$$");
    expect(JSON.stringify(doc)).toContain('"latex":"E = mc^2"');
    expect(JSON.stringify(doc)).toContain('"latex":"x"');
    expect(JSON.stringify(doc)).toContain('"type":"blockMath"');
  });

  test("leaves prices as text", () => {
    expect(JSON.stringify(md.parse("Costs $5 and $10 total."))).not.toContain("inlineMath");
    expect(JSON.stringify(md.parse("Pay $ 5 now $"))).not.toContain("inlineMath");
  });

  test("survives a save and reload", () => {
    const text = "Energy $E = mc^2$ here.\n\n$$\n\\int_0^1 x\\,dx\n$$\n\nAfter.";
    const once = roundTrip(text);
    expect(roundTrip(once)).toBe(once);
    expect(JSON.stringify(md.parse(once))).toBe(JSON.stringify(md.parse(text)));
  });
});
