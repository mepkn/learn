export type Kind = "section" | "page";

export interface TreeRow {
  _id: string;
  kind: Kind;
  title: string;
  parentId?: string;
  order: number;
}

/** A visible sidebar row: the node plus its depth below the topic (0 = direct child). */
export interface FlatItem<T extends TreeRow = TreeRow> {
  node: T;
  depth: number;
  hasChildren: boolean;
}

export function childrenOf<T extends TreeRow>(rows: T[], parentId: string): T[] {
  return rows.filter((r) => r.parentId === parentId).sort((a, b) => a.order - b.order);
}

/** Depth-first rows below `rootId`, skipping the insides of collapsed sections. */
export function flatten<T extends TreeRow>(
  rows: T[],
  rootId: string,
  collapsed: ReadonlySet<string> = new Set(),
): FlatItem<T>[] {
  const out: FlatItem<T>[] = [];
  const walk = (parentId: string, depth: number) => {
    for (const node of childrenOf(rows, parentId)) {
      const kids = childrenOf(rows, node._id);
      out.push({ node, depth, hasChildren: kids.length > 0 });
      if (node.kind === "section" && !collapsed.has(node._id)) walk(node._id, depth + 1);
    }
  };
  walk(rootId, 0);
  return out;
}

/** Ids of every section above `id`, nearest first. */
export function ancestors(rows: TreeRow[], id: string): string[] {
  const byId = new Map(rows.map((r) => [r._id, r]));
  const out: string[] = [];
  for (let p = byId.get(id)?.parentId; p && byId.has(p); p = byId.get(p)?.parentId) out.push(p);
  return out;
}

export interface Drop {
  parentId: string;
  /** Position among the new parent's children, with the dragged node left out. */
  index: number;
  depth: number;
}

/**
 * Where a dragged row lands when dropped over `overId` with a horizontal offset
 * of `offsetX` px: dragging right nests it in the section above, left lifts it
 * out. Only sections can be parents. Mirrors the dnd-kit sortable tree example.
 */
export function projectDrop(
  items: FlatItem[],
  activeId: string,
  overId: string,
  offsetX: number,
  rootId: string,
  indent: number,
): Drop | null {
  const activeIndex = items.findIndex((i) => i.node._id === activeId);
  const overIndex = items.findIndex((i) => i.node._id === overId);
  if (activeIndex < 0 || overIndex < 0) return null;
  const active = items[activeIndex];

  // The list as it would look after the move, without the dragged row's own subtree.
  const subtree = new Set([activeId]);
  for (let i = activeIndex + 1; i < items.length && items[i].depth > active.depth; i++) {
    subtree.add(items[i].node._id);
  }
  const moved = items.filter((i) => !subtree.has(i.node._id) || i.node._id === activeId);
  const from = moved.findIndex((i) => i.node._id === activeId);
  let to = moved.findIndex((i) => i.node._id === overId);
  if (to < 0) to = from; // hovering over its own descendant
  const [dragged] = moved.splice(from, 1);
  moved.splice(to, 0, dragged);

  const prev = moved[to - 1];
  const next = moved[to + 1];
  const wanted = active.depth + Math.round(offsetX / indent);
  const maxDepth = prev ? (prev.node.kind === "section" ? prev.depth + 1 : prev.depth) : 0;
  const minDepth = next ? next.depth : 0;
  const depth = Math.max(minDepth, Math.min(maxDepth, wanted));

  // The parent is the nearest row above at depth - 1.
  let parentId = rootId;
  if (depth > 0) {
    for (let i = to - 1; i >= 0; i--) {
      if (moved[i].depth === depth - 1) {
        parentId = moved[i].node._id;
        break;
      }
    }
  }
  let index = 0;
  for (let i = 0; i < to; i++) {
    if (moved[i].depth === depth && parentOf(moved, i, rootId) === parentId) index++;
  }
  return { parentId, index, depth };
}

function parentOf(items: FlatItem[], i: number, rootId: string): string {
  const depth = items[i].depth;
  if (depth === 0) return rootId;
  for (let j = i - 1; j >= 0; j--) if (items[j].depth === depth - 1) return items[j].node._id;
  return rootId;
}
