import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { FileText } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Ctrl+K: jump to any page in any topic by title. */
export function Finder({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] translate-y-0 gap-0 p-0 sm:max-w-lg" showCloseButton={false}>
        <DialogTitle className="sr-only">Find a page</DialogTitle>
        {open && <FinderBody close={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function FinderBody({ close }: { close: () => void }) {
  const pages = useQuery(api.nodes.allPages);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return (pages ?? [])
      .filter((p) => {
        const hay = [p.title, ...p.trail].join(" ").toLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .slice(0, 50);
  }, [pages, q]);

  function go(i: number) {
    const p = results[i];
    if (!p) return;
    close();
    navigate(`/${p.topicSlug}/${p._id}`);
  }

  return (
    <div>
      <input
        autoFocus
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
          else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
          else if (e.key === "Enter") go(active);
          else return;
          e.preventDefault();
        }}
        placeholder="Find a page…"
        className="w-full border-b bg-transparent px-4 py-3 text-base outline-none placeholder:text-muted-foreground"
      />
      <ul className="max-h-80 overflow-y-auto p-1.5">
        {pages === undefined && <li className="px-3 py-6 text-center text-muted-foreground">Loading…</li>}
        {pages !== undefined && results.length === 0 && (
          <li className="px-3 py-6 text-center text-muted-foreground">No pages found.</li>
        )}
        {results.map((p, i) => (
          <li key={p._id}>
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left",
                i === active && "bg-accent",
              )}
              onMouseMove={() => setActive(i)}
              onClick={() => go(i)}
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{p.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{p.trail.join(" › ")}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
