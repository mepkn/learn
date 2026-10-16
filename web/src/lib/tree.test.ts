import { describe, expect, it } from "vitest";
import { ancestors, flatten, projectDrop, type TreeRow } from "./tree";

// root
//   A (section)
//     a1 (page)
//     a2 (page)
//   B (section)
//     b1 (page)
//   p (page)
const rows: TreeRow[] = [
  { _id: "A", kind: "section", title: "A", parentId: "root", order: 0 },
  { _id: "a2", kind: "page", title: "a2", parentId: "A", order: 1 },
  { _id: "a1", kind: "page", title: "a1", parentId: "A", order: 0 },
  { _id: "B", kind: "section", title: "B", parentId: "root", order: 1 },
  { _id: "b1", kind: "page", title: "b1", parentId: "B", order: 0 },
  { _id: "p", kind: "page", title: "p", parentId: "root", order: 2 },
];
const ids = (items: ReturnType<typeof flatten>) => items.map((i) => `${i.node._id}:${i.depth}`);

describe("flatten", () => {
  it("lists rows depth-first in order", () => {
    expect(ids(flatten(rows, "root"))).toEqual(["A:0", "a1:1", "a2:1", "B:0", "b1:1", "p:0"]);
  });
  it("hides the insides of collapsed sections", () => {
    expect(ids(flatten(rows, "root", new Set(["A"])))).toEqual(["A:0", "B:0", "b1:1", "p:0"]);
  });
});

describe("ancestors", () => {
  it("returns the sections above a node", () => {
    expect(ancestors(rows, "b1")).toEqual(["B"]);
  });
});

describe("projectDrop", () => {
  const items = flatten(rows, "root");
  it("reorders within the same section", () => {
    expect(projectDrop(items, "a2", "a1", 0, "root", 16)).toEqual({ parentId: "A", index: 0, depth: 1 });
  });
  it("moves a page into the next section", () => {
    expect(projectDrop(items, "a2", "b1", 0, "root", 16)).toEqual({ parentId: "B", index: 1, depth: 1 });
  });
  it("lifts a page out to the top level when dragged left", () => {
    expect(projectDrop(items, "b1", "b1", -16, "root", 16)).toEqual({ parentId: "root", index: 2, depth: 0 });
  });
  it("never nests under a page", () => {
    expect(projectDrop(items, "a1", "p", 64, "root", 16)?.depth).toBe(0);
  });
  it("nests into the section above when dragged right", () => {
    expect(projectDrop(items, "p", "p", 16, "root", 16)).toEqual({ parentId: "B", index: 1, depth: 1 });
  });
  it("moves a section with its pages", () => {
    expect(projectDrop(items, "B", "A", 0, "root", 16)).toEqual({ parentId: "root", index: 0, depth: 0 });
  });
});
