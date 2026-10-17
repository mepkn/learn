/**
 * Stands in for `re2js` (aliased in vite.config.ts). The find extension uses it
 * only for regex searches, which the find bar never turns on, so this keeps
 * ~250 KB out of the bundle. A regex search would just find nothing.
 */
export const RE2JS = {
  CASE_INSENSITIVE: 1,
  compile(): never {
    throw new Error("Regex search is not enabled");
  },
};
