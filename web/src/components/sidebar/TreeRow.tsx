import { useState, type MouseEvent as ReactMouseEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, FileText, MoreHorizontal, Plus } from "lucide-react";
import type { Doc } from "@convex/_generated/dataModel";
import type { FlatItem } from "@/lib/tree";
import { cn } from "@/lib/utils";

export const INDENT = 14;

export function TreeRowView({
  item,
  depth,
  current,
  collapsed,
  canEdit,
  renaming,
  onToggle,
  onOpen,
  onStartRename,
  onRename,
  onMenu,
  onAdd,
}: {
  item: FlatItem<Doc<"nodes">>;
  depth: number;
  current: boolean;
  collapsed: boolean;
  canEdit: boolean;
  renaming: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onStartRename: () => void;
  onRename: (title: string) => void;
  onMenu: (e: ReactMouseEvent) => void;
  onAdd: (e: ReactMouseEvent) => void;
}) {
  const { node } = item;
  const section = node.kind === "section";
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node._id,
    disabled: !canEdit || renaming,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("group relative", isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
      onContextMenu={canEdit ? onMenu : undefined}
    >
      <div
        role="button"
        tabIndex={-1}
        className={cn(
          "flex h-8 cursor-pointer select-none items-center gap-1 rounded-md pr-1 text-sm transition-colors",
          current ? "bg-accent font-medium text-foreground" : "text-foreground/80 hover:bg-accent/60",
          section && "font-medium text-foreground",
        )}
        style={{ paddingLeft: 4 + depth * INDENT }}
        onClick={() => (section ? onToggle() : onOpen())}
        onDoubleClick={onStartRename}
      >
        <span className="grid size-5 shrink-0 place-items-center text-muted-foreground">
          {section ? (
            <ChevronRight className={cn("size-3.5 transition-transform", !collapsed && "rotate-90")} />
          ) : (
            <FileText className="size-3.5" />
          )}
        </span>
        {renaming ? (
          <RenameInput initial={node.title} onDone={onRename} />
        ) : (
          <span className="min-w-0 flex-1 truncate">{node.title}</span>
        )}
        {canEdit && !renaming && (
          <span className="flex shrink-0 items-center opacity-0 group-hover:opacity-100 has-[button[aria-expanded=true]]:opacity-100">
            {section && <RowButton label="Add inside" onClick={onAdd}><Plus /></RowButton>}
            <RowButton label="More" onClick={onMenu}><MoreHorizontal /></RowButton>
          </span>
        )}
      </div>
    </div>
  );
}

function RowButton({ label, onClick, children }: { label: string; onClick: (e: ReactMouseEvent) => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-background hover:text-foreground [&_svg]:size-3.5"
      onPointerDown={(e) => e.stopPropagation()} // don't start a drag
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
    >
      {children}
    </button>
  );
}

function RenameInput({ initial, onDone }: { initial: string; onDone: (title: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <input
      autoFocus
      value={value}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") onDone(value.trim());
        if (e.key === "Escape") onDone(initial);
      }}
      onBlur={() => onDone(value.trim())}
      className="min-w-0 flex-1 rounded border border-ring bg-background px-1.5 py-0.5 text-sm outline-none"
    />
  );
}
