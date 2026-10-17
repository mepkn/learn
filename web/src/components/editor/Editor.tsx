import { useEffect, useImperativeHandle, useState, type Ref } from "react";
import { EditorContent, mergeAttributes, useEditor, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { TableKit } from "@tiptap/extension-table";
import { BlockMath } from "@tiptap/extension-mathematics";
import { BackgroundColor, Color } from "@tiptap/extension-text-style";
import { FindAndReplace } from "@tiptap/extension-find-and-replace";
import Typography from "@tiptap/extension-typography";
import { Markdown } from "@tiptap/markdown";
import { common, createLowlight } from "lowlight";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  SquareCode,
  Sigma,
  Strikethrough,
  Table,
  Trash2,
} from "lucide-react";
import { Menu, type MenuItem, type MenuState } from "@/components/Menu";
import { LinkDialog } from "@/components/editor/LinkDialog";
import { FindBar } from "@/components/editor/FindBar";
import { MathDialog, type MathEdit } from "@/components/editor/MathDialog";
import { MarkdownTextStyle } from "@/components/editor/textStyle";
import { StrictInlineMath } from "@/components/editor/math";
import { mod } from "@/lib/keys";

const lowlight = createLowlight(common);

// Puts the language on <pre> too, so CSS can label the block ("jsx", "ts"...).
const CodeBlock = CodeBlockLowlight.extend({
  renderHTML({ node, HTMLAttributes }) {
    const language = node.attrs.language as string | null;
    return [
      "pre",
      { "data-language": language ?? "" },
      ["code", mergeAttributes(HTMLAttributes, { class: language ? `language-${language}` : null }), 0],
    ];
  },
});

export interface EditorHandle {
  getMarkdown: () => string;
  focus: () => void;
}

/**
 * The page body. One editor for both modes: view mode is the same document
 * with editing switched off, so the page looks identical either way.
 */
export function Editor({
  ref,
  markdown,
  editable,
  onChange,
}: {
  ref: Ref<EditorHandle>;
  markdown: string;
  editable: boolean;
  onChange: () => void;
}) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [math, setMath] = useState<MathEdit | null>(null);
  const [finding, setFinding] = useState(false);
  // Captured once by the editor, so it asks the DOM whether editing is on.
  const editMath = (block: boolean) => (node: { attrs: Record<string, unknown> }, pos: number) => {
    if (document.querySelector(".ProseMirror[contenteditable=true]"))
      setMath({ latex: String(node.attrs.latex ?? ""), block, pos });
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      CodeBlock.configure({ lowlight, defaultLanguage: null }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { resizable: false } }),
      StrictInlineMath.configure({ onClick: editMath(false), katexOptions: { throwOnError: false } }),
      BlockMath.configure({ onClick: editMath(true), katexOptions: { throwOnError: false } }),
      MarkdownTextStyle,
      Color,
      BackgroundColor,
      FindAndReplace,
      // Only rules that can't mangle code typed before its closing backtick
      // ("use client", --save, ...props, a != b, 0x10, x^2 all stay as typed).
      Typography.configure({
        emDash: false,
        ellipsis: false,
        openDoubleQuote: false,
        closeDoubleQuote: false,
        openSingleQuote: false,
        closeSingleQuote: false,
        notEqual: false,
        laquo: false,
        raquo: false,
        multiplication: false,
        superscriptTwo: false,
        superscriptThree: false,
      }),
      Placeholder.configure({ placeholder: `Start writing… markdown works as you type. ${mod}+/ for shortcuts.` }),
      Markdown,
    ],
    content: markdown,
    contentType: "markdown",
    editable,
    editorProps: { attributes: { class: "prose pb-16 [&[contenteditable=true]]:min-h-[50vh] [&[contenteditable=true]]:pb-[30vh]" } },
    onUpdate: ({ transaction }) => {
      if (transaction.docChanged) onChange();
    },
  });

  useEffect(() => {
    editor?.setEditable(editable, false);
    if (editable) editor?.commands.focus("end");
  }, [editor, editable]);

  // Ctrl/⌘ F opens the find bar instead of the browser's find.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f" && !document.querySelector("[role=dialog]")) {
        e.preventDefault();
        setFinding(true);
        const input = document.querySelector<HTMLInputElement>("[data-find-input]");
        input?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      getMarkdown: () => editor?.getMarkdown() ?? markdown,
      focus: () => editor?.commands.focus(),
    }),
    [editor, markdown],
  );

  if (!editor) return null;

  return (
    <div
      onContextMenu={(e) => {
        if (!editable) return;
        e.preventDefault();
        setMenu({
          x: e.clientX,
          y: e.clientY,
          items: formatItems(editor, () => setLinkOpen(true), () => setMath({ latex: "", block: false, pos: null })),
        });
      }}
      onClick={(e) => {
        // In view mode, links open in a new tab.
        const a = (e.target as HTMLElement).closest("a");
        if (!editable && a?.href) window.open(a.href, "_blank", "noopener");
      }}
    >
      {finding && <FindBar editor={editor} editable={editable} onClose={() => setFinding(false)} />}
      <EditorContent editor={editor} />
      <MathDialog
        edit={math}
        onClose={() => {
          setMath(null);
          editor.commands.focus();
        }}
        onSubmit={(latex) => {
          if (!math) return;
          const c = editor.chain().focus();
          if (math.pos === null) {
            if (latex) c.insertInlineMath({ latex }).run();
          } else if (math.block) {
            (latex ? c.updateBlockMath({ latex, pos: math.pos }) : c.deleteBlockMath({ pos: math.pos })).run();
          } else {
            (latex ? c.updateInlineMath({ latex, pos: math.pos }) : c.deleteInlineMath({ pos: math.pos })).run();
          }
        }}
      />
      <Menu state={menu} onClose={() => setMenu(null)} />
      <LinkDialog
        open={linkOpen}
        initial={editor.getAttributes("link").href ?? ""}
        onClose={() => {
          setLinkOpen(false);
          editor.commands.focus();
        }}
        onSubmit={(href) => {
          const chain = editor.chain().focus().extendMarkRange("link");
          if (href) chain.setLink({ href }).run();
          else chain.unsetLink().run();
        }}
      />
    </div>
  );
}

// Mid tones and translucent highlights, readable in light and dark mode.
const TEXT_COLORS = [
  { name: "Default", value: null },
  { name: "Red", value: "#dc2626" },
  { name: "Orange", value: "#ea580c" },
  { name: "Green", value: "#16a34a" },
  { name: "Blue", value: "#2563eb" },
  { name: "Purple", value: "#9333ea" },
];
const HIGHLIGHTS = [
  { name: "None", value: null },
  { name: "Yellow", value: "rgba(250, 204, 21, 0.35)" },
  { name: "Green", value: "rgba(34, 197, 94, 0.3)" },
  { name: "Blue", value: "rgba(59, 130, 246, 0.3)" },
  { name: "Pink", value: "rgba(236, 72, 153, 0.3)" },
  { name: "Gray", value: "rgba(120, 120, 120, 0.25)" },
];

function formatItems(editor: TiptapEditor, openLink: () => void, openMath: () => void): MenuItem[] {
  const c = () => editor.chain().focus();
  const items: MenuItem[] = [];
  if (!editor.state.selection.empty) {
    items.push(
      { swatches: { label: "Colour", colors: TEXT_COLORS, onPick: (v) => (v ? c().setColor(v) : c().unsetColor()).run() } },
      {
        swatches: {
          label: "Highlight",
          colors: HIGHLIGHTS,
          onPick: (v) => (v ? c().setBackgroundColor(v) : c().unsetBackgroundColor()).run(),
        },
      },
      "separator",
    );
    items.push(
      { label: "Bold", icon: <Bold />, hint: `${mod}B`, onSelect: () => c().toggleBold().run() },
      { label: "Italic", icon: <Italic />, hint: `${mod}I`, onSelect: () => c().toggleItalic().run() },
      { label: "Strikethrough", icon: <Strikethrough />, hint: `${mod}⇧S`, onSelect: () => c().toggleStrike().run() },
      { label: "Inline code", icon: <Code />, hint: `${mod}E`, onSelect: () => c().toggleCode().run() },
      { label: "Link…", icon: <Link2 />, onSelect: openLink },
      "separator",
    );
  }
  items.push(
    { label: "Heading 1", icon: <Heading1 />, hint: "#", onSelect: () => c().toggleHeading({ level: 1 }).run() },
    { label: "Heading 2", icon: <Heading2 />, hint: "##", onSelect: () => c().toggleHeading({ level: 2 }).run() },
    { label: "Heading 3", icon: <Heading3 />, hint: "###", onSelect: () => c().toggleHeading({ level: 3 }).run() },
    { label: "Bullet list", icon: <List />, hint: "-", onSelect: () => c().toggleBulletList().run() },
    { label: "Numbered list", icon: <ListOrdered />, hint: "1.", onSelect: () => c().toggleOrderedList().run() },
    { label: "Checklist", icon: <ListChecks />, hint: "[ ]", onSelect: () => c().toggleTaskList().run() },
    { label: "Quote", icon: <Quote />, hint: ">", onSelect: () => c().toggleBlockquote().run() },
    { label: "Code block", icon: <SquareCode />, hint: "```", onSelect: () => c().toggleCodeBlock().run() },
    { label: "Equation…", icon: <Sigma />, hint: "$$", onSelect: openMath },
    { label: "Divider", icon: <Minus />, hint: "---", onSelect: () => c().setHorizontalRule().run() },
  );
  if (editor.isActive("table")) {
    items.push(
      "separator",
      { label: "Add row below", icon: <Table />, onSelect: () => c().addRowAfter().run() },
      { label: "Add column right", icon: <Table />, onSelect: () => c().addColumnAfter().run() },
      { label: "Delete row", icon: <Trash2 />, onSelect: () => c().deleteRow().run() },
      { label: "Delete column", icon: <Trash2 />, onSelect: () => c().deleteColumn().run() },
      { label: "Delete table", icon: <Trash2 />, danger: true, onSelect: () => c().deleteTable().run() },
    );
  } else {
    items.push({
      label: "Table",
      icon: <Table />,
      onSelect: () => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    });
  }
  return items;
}
