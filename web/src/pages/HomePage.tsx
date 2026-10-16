import { useState, type FormEvent, type MouseEvent as ReactMouseEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, useNavigate } from "react-router";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Menu, type MenuState } from "@/components/Menu";
import { Logo, SearchButton, UtilityButtons, useShell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

/** The topics: React, Svelte, Express... */
export function HomePage() {
  const topics = useQuery(api.nodes.topics);
  const { canEdit } = useShell();
  const navigate = useNavigate();
  const createTopic = useMutation(api.nodes.createTopic);
  const rename = useMutation(api.nodes.rename);
  const remove = useMutation(api.nodes.remove);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [deleting, setDeleting] = useState<Doc<"nodes"> | null>(null);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const title = String(new FormData(e.currentTarget).get("title") ?? "").trim();
    if (!title) return setAdding(false);
    const slug = await createTopic({ title });
    setAdding(false);
    navigate(`/${slug}`);
  }

  function openMenu(e: ReactMouseEvent, topic: Doc<"nodes">) {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();
    setMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: "Rename", icon: <Pencil />, onSelect: () => setRenaming(topic._id) },
        { label: "Delete", icon: <Trash2 />, danger: true, onSelect: () => setDeleting(topic) },
      ],
    });
  }

  const sorted = topics ? [...topics].sort((a, b) => a.order - b.order) : undefined;

  return (
    <div className="min-h-full">
      <header className="mx-auto flex h-14 max-w-4xl items-center gap-4 px-6">
        <Logo />
        <div className="flex-1" />
        <SearchButton className="hidden w-56 sm:flex" />
        <UtilityButtons />
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-20 pt-12">
        <h1 className="text-3xl font-bold tracking-tight">What I'm learning</h1>
        <p className="mt-2 text-muted-foreground">Notes for quick revision, one topic at a time.</p>

        {sorted === undefined ? (
          <Spinner className="mt-12 size-5 text-muted-foreground" />
        ) : (
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((t) =>
              renaming === t._id ? (
                <TopicForm
                  key={t._id}
                  initial={t.title}
                  onSubmit={(title) => {
                    setRenaming(null);
                    if (title && title !== t.title) void rename({ id: t._id, title });
                  }}
                />
              ) : (
                <Link
                  key={t._id}
                  to={`/${t.slug}`}
                  onContextMenu={(e) => openMenu(e, t)}
                  className="group relative rounded-xl border bg-card p-5 transition-colors hover:border-ring/60"
                >
                  <h2 className="text-lg font-semibold">{t.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t.pageCount} {t.pageCount === 1 ? "page" : "pages"}
                  </p>
                  {canEdit && (
                    <button
                      aria-label="More"
                      className="absolute right-3 top-3 grid size-7 place-items-center rounded-md text-muted-foreground opacity-0 hover:bg-accent group-hover:opacity-100"
                      onClick={(e) => openMenu(e, t)}
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  )}
                </Link>
              ),
            )}
            {canEdit &&
              (adding ? (
                <form onSubmit={add} className="rounded-xl border border-dashed p-4">
                  <Input
                    name="title"
                    autoFocus
                    placeholder="Topic name, e.g. Svelte"
                    onBlur={(e) => !e.target.value.trim() && setAdding(false)}
                    onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
                  />
                  <Button type="submit" size="sm" className="mt-3">
                    Create
                  </Button>
                </form>
              ) : (
                <button
                  onClick={() => setAdding(true)}
                  className="flex min-h-24 items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground transition-colors hover:border-ring/60 hover:text-foreground"
                >
                  <Plus className="size-4" /> New topic
                </button>
              ))}
            {!canEdit && sorted.length === 0 && <p className="text-muted-foreground">Nothing here yet.</p>}
          </div>
        )}
      </main>

      <Menu state={menu} onClose={() => setMenu(null)} />
      <ConfirmDelete
        target={deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          void remove({ id: deleting!._id });
          setDeleting(null);
        }}
      />
    </div>
  );
}

function TopicForm({ initial, onSubmit }: { initial: string; onSubmit: (title: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value.trim());
      }}
      className="rounded-xl border border-ring/60 p-4"
    >
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => onSubmit(value.trim())}
        onKeyDown={(e) => e.key === "Escape" && onSubmit(initial)}
      />
    </form>
  );
}
