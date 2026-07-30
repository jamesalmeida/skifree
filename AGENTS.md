# AGENTS.md

## Cursor Cloud specific instructions

SkiFree Remake is a **single, 100% client-side** browser game (Vite + TypeScript + three.js). There is **no backend, database, or external service** — the only thing to run is the Vite dev server.

### Services / commands
- Run (dev): `npm run dev` — Vite dev server on `http://localhost:5173` (see `package.json`). In a headless VM, start it without auto-opening a browser: `npm run dev -- --host --no-open` (the `open: true` in `vite.config.ts` otherwise tries to launch a browser).
- Type-check / build: `npm run build` (runs `tsc && vite build`). There is **no separate lint or test suite**; `tsc` (strict mode) is the closest thing to lint/CI validation.
- Preview built output: `npm run preview`.

### Notes
- `npm run extract-sprites` (Python) is **optional** and requires the original `SKI.EXE`, which is gitignored and not present. Do NOT run it — pre-extracted sprites already ship in `public/original-sprites/`.
- In-game controls (for manual testing): click **Start run**, steer with `←/→`, `↓` to speed up, press `G` to toggle 2D/3D.
