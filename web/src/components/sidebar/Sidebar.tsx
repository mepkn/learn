import { useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { FilePlus, FolderPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Menu, type MenuItem, type MenuState } from "@/components/Menu";
import { TreeRowView, INDENT } from "@/components/sidebar/TreeRow";
import { Button } from "@/components/ui/button";
import { readLocal, writeLocal } from "@/lib/theme";
import { ancestors, flatten, projectDrop, type Drop } from "@/lib/tree";

type Node = Doc<"nodes">;

export function Sidebar({
  topic,
  nodes,
  canEdit,
  currentId,
}: {
  topic: Node;
  nodes: Node[];
  canEdit: boolean;
  currentId: string | undefined;
}) {
  const navigate = useNavigate();
  const slug = topic.slug ?? "";
  const collapsedKey = `collapsed:${topic._id}`;
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(readLocal<string[]>(collapsedKey, [])));
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [deleting, setDeleting] = useState<Node | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drop, setDrop] = useState<Drop | null>(null);

  const create = useMutation(api.nodes.create);
  const rename = useMutation(api.nodes.rename).withOptimisticUpdate((store, { id, title }) => {
    const tree = store.getQuery(api.nodes.topicTree, { slug });
    if (!tree) return;
    store.setQuery(api.nodes.topicTree, { slug }, {
      ...tree,
      nodes: tree.nodes.map((n) => (n._id === id ? { ...n, title } : n)),
    });
  });
  const remove = useMutation(api.nodes.remove);
  const move = useMutation(api.nodes.move).withOptimisticUpdate((store, { id, parentId, index }) => {
    const tree = store.getQuery(api.nodes.topicTree, { slug });
    if (!tree) return;
    const node = tree.nodes.find((n) => n._id === id);
    if (!node) return;
    const siblings = tree.nodes
      .filter((n) => n.parentId === parentId && n._id !== id)
      .sort((a, b) => a.order - b.order);
    siblings.splice(index, 0, { ...node, parentId });
    const order = new Map(siblings.map((n, i) => [n._id, i]));
    store.setQuery(api.nodes.topicTree, { slug }, {
      ...tree,
      nodes: tree.nodes.map((n) =>
        order.has(n._id) ? { ...n, parentId: n._id === id ? parentId : n.parentId, order: order.get(n._id)! } : n,
      ),
    });
  });

  // Keep the current page visible: on opening a page, open every section above it.
  const [revealed, setRevealed] = useState<string | undefined>(undefined);
  if (currentId !== revealed) {
    setRevealed(currentId);
    const up = currentId ? ancestors(nodes, currentId) : [];
    if (up.some((id) => collapsed.has(id))) setCollapsed(new Set([...collapsed].filter((id) => !up.includes(id))));
  }

  useEffect(() => writeLocal(collapsedKey, [...collapsed]), [collapsedKey, collapsed]);

  // While dragging a section, hide its insides so it moves as one row.
  const items = useMemo(
    () => flatten(nodes, topic._id, activeId ? new Set([...collapsed, activeId]) : collapsed),
    [nodes, topic._id, collapsed, activeId],
  );
  const activeItem = items.find((i) => i.node._id === activeId);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const toggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  async function add(parentId: Id<"nodes">, kind: "section" | "page") {
    const id = await create({ parentId, kind, title: kind === "page" ? "Untitled" : "New section" });
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.delete(parentId);
      return next;
    });
    setRenamingId(id);
    if (kind === "page") navigate(`/${slug}/${id}`);
  }

  function addItems(parentId: Id<"nodes">, isTopic: boolean): MenuItem[] {
    return [
      { label: "New page", icon: <FilePlus />, onSelect: () => void add(parentId, "page") },
      { label: isTopic ? "New section" : "New subsection", icon: <FolderPlus />, onSelect: () => void add(parentId, "section") },
    ];
  }

  function nodeItems(node: Node): MenuItem[] {
    return [
      ...(node.kind === "section" ? [...addItems(node._id, false), "separator" as const] : []),
      { label: "Rename", icon: <Pencil />, hint: "Double-click", onSelect: () => setRenamingId(node._id) },
      { label: "Delete", icon: <Trash2 />, danger: true, onSelect: () => setDeleting(node) },
    ];
  }

  function openMenu(e: ReactMouseEvent, menuItems: MenuItem[]) {
    e.preventDefault();
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // A right-click opens at the pointer, a button click below the button.
    setMenu(e.type === "contextmenu" ? { x: e.clientX, y: e.clientY, items: menuItems } : { x: r.left, y: r.bottom + 4, items: menuItems });
  }

  function onDragMove({ active, over, delta }: DragMoveEvent) {
    if (!over) return setDrop(null);
    setDrop(projectDrop(items, String(active.id), String(over.id), delta.x, topic._id, INDENT));
  }

  function onDragEnd({ active }: DragEndEvent) {
    const id = String(active.id) as Id<"nodes">;
    const target = drop;
    setActiveId(null);
    setDrop(null);
    if (!target) return;
    const node = nodes.find((n) => n._id === id);
    if (!node) return;
    const index = nodes.filter((n) => n.parentId === node.parentId && n.order < node.order).length;
    if (node.parentId === target.parentId && index === target.index) return;
    void move({ id, parentId: target.parentId as Id<"nodes">, index: target.index });
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onContextMenu={(e) => canEdit && openMenu(e, addItems(topic._id, true))}
    >
      <div className="flex items-center justify-between px-3 pb-1 pt-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contents</span>
        {canEdit && (
          <Button variant="ghost" size="icon-xs" aria-label="Add" onClick={(e) => openMenu(e, addItems(topic._id, true))}>
            <Plus />
          </Button>
        )}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-6">
        {items.length === 0 && (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            {canEdit ? "Nothing here yet. Use + or right-click to add a page." : "No pages yet."}
          </p>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => setActiveId(String(active.id))}
          onDragMove={onDragMove}
          onDragEnd={onDragEnd}
          onDragCancel={() => {
            setActiveId(null);
            setDrop(null);
          }}
        >
          <SortableContext items={items.map((i) => i.node._id)} strategy={verticalListSortingStrategy}>
            {items.map((item) => (
              <TreeRowView
                key={item.node._id}
                item={item}
                depth={item.node._id === activeId && drop ? drop.depth : item.depth}
                current={item.node._id === currentId}
                collapsed={collapsed.has(item.node._id)}
                canEdit={canEdit}
                renaming={renamingId === item.node._id}
                onToggle={() => toggle(item.node._id)}
                onOpen={() => navigate(`/${slug}/${item.node._id}`)}
                onStartRename={() => canEdit && setRenamingId(item.node._id)}
                onRename={(title) => {
                  setRenamingId(null);
                  if (title && title !== item.node.title) void rename({ id: item.node._id, title });
                }}
                onMenu={(e) => openMenu(e, nodeItems(item.node))}
                onAdd={(e) => openMenu(e, addItems(item.node._id, false))}
              />
            ))}
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeItem && (
              <div className="rounded-md border bg-popover px-2 py-1 text-sm shadow-md">{activeItem.node.title}</div>
            )}
          </DragOverlay>
        </DndContext>
      </nav>

      <Menu state={menu} onClose={() => setMenu(null)} />
      <ConfirmDelete
        target={deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const node = deleting!;
          setDeleting(null);
          const inside = currentId && (currentId === node._id || ancestors(nodes, currentId).includes(node._id));
          if (inside) navigate(`/${slug}`);
          void remove({ id: node._id });
        }}
      />
    </div>
  );
}
