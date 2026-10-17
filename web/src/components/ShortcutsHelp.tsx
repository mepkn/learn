import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { mod } from "@/lib/keys";

const groups: { title: string; rows: [string, string][] }[] = [
  {
    title: "Modes",
    rows: [
      ["E", "Edit this page"],
      [`${mod} S`, "Save"],
      ["Esc", "Save and go back to view mode"],
      [`${mod} K`, "Find a page"],
      [`${mod} F`, "Find (and replace, while editing) in this page"],
      [`${mod} /`, "This help"],
    ],
  },
  {
    title: "Type at the start of a line",
    rows: [
      ["# ", "Heading 1 (## 2, ### 3)"],
      ["- ", "Bullet list"],
      ["1. ", "Numbered list"],
      ["[ ] ", "Checklist"],
      ["> ", "Quote"],
      ["```js ", "Code block (any language)"],
      ["---", "Divider"],
    ],
  },
  {
    title: "Inline",
    rows: [
      ["**text**", "Bold"],
      ["*text*", "Italic"],
      ["`code`", "Inline code"],
      ["~~text~~", "Strikethrough"],
      [`${mod} B / I / U`, "Bold / italic / underline"],
      [`${mod} E`, "Inline code"],
      ["Paste a URL", "Link (on selected text too)"],
      ["$$x^2$$", "Equation ($$$x$$$ on its own line)"],
      ["-> <- (c) (tm) 1/2 +/-", "→ ← © ™ ½ ±"],
    ],
  },
  {
    title: "More",
    rows: [
      ["Right-click", "Format menu, colours, links, tables"],
      ["Tab / ⇧Tab", "Indent / outdent list item"],
      [`${mod} Z / ${mod} ⇧Z`, "Undo / redo"],
    ],
  },
];

export function ShortcutsHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {groups.map((g) => (
            <section key={g.title} className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{g.title}</h3>
              <dl className="space-y-1.5">
                {g.rows.map(([key, what]) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <dt className="text-sm">{what}</dt>
                    <dd>
                      <Kbd className="font-mono">{key}</Kbd>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
