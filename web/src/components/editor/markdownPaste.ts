import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

// pastedMarkdown returns the clipboard text to insert as markdown, or null to
// let the editor paste normally. Copies from web pages and other editors
// carry HTML, which the editor already keeps formatted; plain text (from a
// terminal, a code editor, pbcopy) is read as markdown, except inside a code
// block, where it should stay exactly as typed.
export function pastedMarkdown(clipboard: { text: string; html: string }, inCode: boolean): string | null {
  if (inCode || clipboard.html !== "" || clipboard.text.trim() === "") return null;
  return clipboard.text;
}

export const MarkdownPaste = Extension.create({
  name: "markdownPaste",
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey("markdownPaste"),
        props: {
          handlePaste: (view, event) => {
            const data = event.clipboardData;
            if (!data) return false;
            const markdown = pastedMarkdown(
              { text: data.getData("text/plain"), html: data.getData("text/html") },
              view.state.selection.$from.parent.type.spec.code === true,
            );
            if (markdown == null) return false;
            return editor.commands.insertContent(markdown, { contentType: "markdown" });
          },
        },
      }),
    ];
  },
});
