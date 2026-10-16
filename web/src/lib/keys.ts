/** True when a key press is aimed at a text field or the editor, not a page shortcut. */
export function isTyping(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

export const mod = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";
