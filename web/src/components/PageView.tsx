import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, Pencil } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { Editor, type EditorHandle } from "@/components/editor/Editor";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { isTyping, mod } from "@/lib/keys";
import { readLocal, writeLocal } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Status = "idle" | "dirty" | "saving" | "saved" | "error";

/**
 * One page: view mode by default; editors press E to edit. Nothing is sent to
 * the server until Save, Ctrl+S or leaving edit mode. Meanwhile a draft is kept
 * in this browser so a closed tab or failed save loses nothing.
 */
export function PageView({ node, trail, canEdit }: { node: Doc<"nodes">; trail: string[]; canEdit: boolean }) {
  const content = useQuery(api.nodes.content, { nodeId: node._id });
  if (content === undefined) {
    return (
      <div className="grid flex-1 place-items-center">
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    );
  }
  // Keyed by page so switching pages starts fresh (and saves the previous one on unmount).
  return <LoadedPage key={node._id} node={node} trail={trail} canEdit={canEdit} server={content} />;
}

function LoadedPage({
  node,
  trail,
  canEdit,
  server,
}: {
  node: Doc<"nodes">;
  trail: string[];
  canEdit: boolean;
  server: { markdown: string; updatedAt: number | null };
}) {
  const draftKey = `draft:${node._id}`;
  const [initialDraft] = useState(() => {
    const d = canEdit ? readLocal<string | null>(draftKey, null) : null;
    return d !== null && d !== server.markdown ? d : null;
  });
  const [editing, setEditing] = useState(initialDraft !== null);
  const [status, setStatus] = useState<Status>(initialDraft !== null ? "dirty" : "idle");
  const [restored, setRestored] = useState(initialDraft !== null);
  const [scrolled, setScrolled] = useState(false);
  // Re-render the read-only view when the page changes elsewhere, never mid-edit.
  const [shown, setShown] = useState({ markdown: initialDraft ?? server.markdown, at: server.updatedAt, v: 0 });
  const baseline = useRef(server.markdown);
  const editor = useRef<EditorHandle>(null);
  const draftTimer = useRef<number | undefined>(undefined);
  const saveMutation = useMutation(api.nodes.save);

  if (!editing && (status === "idle" || status === "saved") && server.updatedAt !== shown.at) {
    setShown({ markdown: server.markdown, at: server.updatedAt, v: shown.v + 1 });
  }

  const save = useCallback(async () => {
    const markdown = editor.current?.getMarkdown();
    if (markdown === undefined) return;
    window.clearTimeout(draftTimer.current);
    if (markdown === baseline.current) {
      writeLocal(draftKey, undefined);
      setStatus((s) => (s === "dirty" ? "idle" : s));
      return;
    }
    setStatus("saving");
    try {
      await saveMutation({ nodeId: node._id, markdown });
      baseline.current = markdown;
      writeLocal(draftKey, undefined);
      setStatus("saved");
      setRestored(false);
    } catch {
      setStatus("error"); // the draft stays in this browser
    }
  }, [draftKey, node._id, saveMutation]);

  const exitEditing = useCallback(() => {
    void save();
    setEditing(false);
  }, [save]);

  // Leaving the page (another page, another topic) counts as leaving edit mode.
  const latest = useRef({ save, status });
  useEffect(() => {
    latest.current = { save, status };
  });
  useEffect(() => () => void (latest.current.status === "dirty" && latest.current.save()), []);

  useEffect(() => {
    if (status !== "dirty" && status !== "error") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  useEffect(() => {
    if (!canEdit) return;
    const onKey = (e: KeyboardEvent) => {
      const overlay = document.querySelector("[role=dialog],[role=menu]");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (editing) void save();
      } else if (e.key === "Escape" && editing && !overlay) {
        e.preventDefault();
        exitEditing();
      } else if (e.key.toLowerCase() === "e" && !editing && !isTyping(e) && !overlay && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setEditing(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canEdit, editing, save, exitEditing]);

  function onChange() {
    setStatus("dirty");
    window.clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => {
      const md = editor.current?.getMarkdown();
      if (md !== undefined) writeLocal(draftKey, md);
    }, 400);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header
        className={cn(
          "flex h-12 shrink-0 items-center gap-3 border-b border-transparent pl-12 pr-6 transition-colors md:pl-6",
          scrolled && "border-border",
        )}
      >
        <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{trail.join("  /  ")}</p>
        {canEdit && (
          <>
            <StatusText status={status} />
            {editing ? (
              <>
                {(status === "dirty" || status === "error") && (
                  <Button size="sm" variant="ghost" onClick={() => void save()} title={`Save (${mod}S)`}>
                    Save
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={exitEditing} title="Done (Esc)">
                  <Check /> Done
                </Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)} title="Edit (E)">
                <Pencil /> Edit
              </Button>
            )}
          </>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto" onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}>
        <article className="mx-auto w-full max-w-3xl px-6 pt-6 sm:px-10">
          {restored && (
            <p className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
              Restored unsaved changes from this browser. Save to keep them, or{" "}
              <button
                className="underline underline-offset-2"
                onClick={() => {
                  writeLocal(draftKey, undefined);
                  baseline.current = server.markdown;
                  setShown((s) => ({ markdown: server.markdown, at: server.updatedAt, v: s.v + 1 }));
                  setRestored(false);
                  setStatus("idle");
                  setEditing(false);
                }}
              >
                discard them
              </button>
              .
            </p>
          )}
          <h1 className="mb-6 text-[2.2rem] font-bold leading-tight tracking-tight">{node.title}</h1>
          <Editor
            key={shown.v}
            ref={editor}
            markdown={shown.markdown}
            editable={editing}
            onChange={onChange}
          />
        </article>
      </div>
    </div>
  );
}

function StatusText({ status }: { status: Status }) {
  const text = { idle: "", dirty: "Unsaved", saving: "Saving…", saved: "Saved", error: "Save failed, kept locally" }[status];
  if (!text) return null;
  return (
    <span className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", status === "error" && "text-destructive")}>
      {status === "dirty" && <span className="size-1.5 rounded-full bg-amber-500" />}
      {text}
    </span>
  );
}
