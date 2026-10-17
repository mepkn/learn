import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from "node:path"
import { defineConfig } from 'vite'

// The backend lives in ../backend/convex. Its imports of `convex` and `react`
// must resolve to this app's copies, not ../backend/node_modules. Env files
// (.env.local, written by `npx convex dev`) are in ../backend.
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  envDir: path.resolve(import.meta.dirname, "../backend"),
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(import.meta.dirname, "./src") },
      { find: "@convex", replacement: path.resolve(import.meta.dirname, "../backend/convex") },
      // KaTeX loads only when a page shows an equation (see src/lib/katex-lazy.ts).
      { find: /^katex$/, replacement: path.resolve(import.meta.dirname, "./src/lib/katex-lazy.ts") },
    ],
    dedupe: ["convex", "react", "react-dom"],
  },
})
