import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type MenuItem =
  | { label: string; icon?: ReactNode; hint?: string; danger?: boolean; onSelect: () => void }
  | "separator";

export interface MenuState {
  x: number;
  y: number;
  items: MenuItem[];
}

/** A small floating menu, opened by right-click or a ⋯ button. */
export function Menu({ state, onClose }: { state: MenuState | null; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  // Keep the menu on screen.
  useLayoutEffect(() => {
    if (!state || !ref.current) return setPos(null);
    const { width, height } = ref.current.getBoundingClientRect();
    setPos({
      x: Math.min(state.x, window.innerWidth - width - 8),
      y: Math.min(state.y, window.innerHeight - height - 8),
    });
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      if (e.type === "pointerdown" && ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    window.addEventListener("pointerdown", close, true);
    window.addEventListener("keydown", close, true);
    window.addEventListener("blur", onClose);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("pointerdown", close, true);
      window.removeEventListener("keydown", close, true);
      window.removeEventListener("blur", onClose);
      window.removeEventListener("resize", onClose);
    };
  }, [state, onClose]);

  if (!state) return null;
  return createPortal(
    <div
      ref={ref}
      role="menu"
      className="fixed z-50 min-w-48 rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 duration-100"
      style={{ left: pos?.x ?? state.x, top: pos?.y ?? state.y, visibility: pos ? "visible" : "hidden" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {state.items.map((item, i) =>
        item === "separator" ? (
          <div key={i} className="my-1 h-px bg-border" />
        ) : (
          <button
            key={i}
            role="menuitem"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent [&_svg]:size-4 [&_svg]:text-muted-foreground",
              item.danger && "text-destructive [&_svg]:text-destructive",
            )}
            onMouseDown={(e) => e.preventDefault()} // keep the editor's selection
            onClick={() => {
              onClose();
              item.onSelect();
            }}
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {item.hint && <span className="text-xs text-muted-foreground">{item.hint}</span>}
          </button>
        ),
      )}
    </div>,
    document.body,
  );
}
