import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Find (and, while editing, replace) bar for the page body. */
export function FindBar({ editor, editable, onClose }: { editor: Editor; editable: boolean; onClose: () => void }) {
  const [find, setFind] = useState(editor.storage.findAndReplace.searchTerm);
  const [replace, setReplace] = useState("");
  const [, rerender] = useState(0);

  // Results update after the extension's debounce; redraw the counter then.
  useEffect(() => {
    const update = () => rerender((n) => n + 1);
    editor.on("transaction", update);
    return () => void editor.off("transaction", update);
  }, [editor]);

  useEffect(() => () => void editor.commands.clearSearch(), [editor]);

  const { results, currentIndex } = editor.storage.findAndReplace;
  const count = results.length ? `${(currentIndex ?? 0) + 1}/${results.length}` : find ? "0/0" : "";

  function close() {
    onClose();
    editor.commands.focus();
  }

  return (
    <div
      className="sticky top-2 z-10 mb-4 flex flex-wrap items-center gap-1.5 rounded-lg border bg-popover p-1.5 shadow-md"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation(); // don't leave edit mode
          close();
        }
      }}
    >
      <div className="relative min-w-40 flex-1">
        <Input
          autoFocus
          data-find-input
          placeholder="Find"
          value={find}
          className="h-7 pr-12"
          onChange={(e) => {
            setFind(e.target.value);
            editor.commands.setSearchTerm(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (e.shiftKey) editor.commands.goToPreviousResult();
            else editor.commands.goToNextResult();
          }}
        />
        <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">{count}</span>
      </div>
      <Button size="icon-sm" variant="ghost" aria-label="Previous match" onClick={() => editor.commands.goToPreviousResult()}>
        <ChevronUp />
      </Button>
      <Button size="icon-sm" variant="ghost" aria-label="Next match" onClick={() => editor.commands.goToNextResult()}>
        <ChevronDown />
      </Button>
      {editable && (
        <>
          <Input
            placeholder="Replace"
            value={replace}
            className="h-7 min-w-32 flex-1"
            onChange={(e) => {
              setReplace(e.target.value);
              editor.commands.setReplaceTerm(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              editor.commands.replace();
            }}
          />
          <Button size="sm" variant="ghost" disabled={!results.length} onClick={() => editor.commands.replace()}>
            Replace
          </Button>
          <Button size="sm" variant="ghost" disabled={!results.length} onClick={() => editor.commands.replaceAll()}>
            All
          </Button>
        </>
      )}
      <Button size="icon-sm" variant="ghost" aria-label="Close find" onClick={close}>
        <X />
      </Button>
    </div>
  );
}
