export function isDark(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function toggleTheme(): boolean {
  const dark = !isDark();
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem("theme", dark ? "dark" : "light");
  } catch {
    // Private mode: the choice just isn't remembered.
  }
  return dark;
}

/** Reads a per-browser JSON value, falling back when storage is unavailable. */
export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeLocal(key: string, value: unknown) {
  try {
    if (value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore: storage is a convenience only.
  }
}
