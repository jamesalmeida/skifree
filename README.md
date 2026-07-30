# SkiFree Remake

A browser remake of the classic Windows 3.x **SkiFree** game (Chris Pirih / Microsoft, 1991), built for fun — not for sale.

## Features

- **Classic 2D** pixel look (procedural sprites inspired by the original)
- **3D mode** powered by three.js (press `G` mid-run to toggle)
- **Play as skier** or **snowboarder** (the background shredders, now controllable)
- Modes: Slalom, Free Style, Tree Slalom
- Abominable Snow Monster after ~2000m
- Mouse + keyboard / numpad controls

## Run

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Deploy (play it online, e.g. from an iPad)

This is a 100% static site, so it deploys to Vercel with zero config (Vercel auto-detects Vite; build `npm run build`, output `dist/`). A `vercel.json` is included to make that explicit.

One-tap deploy straight from a browser (no terminal needed):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjamesalmeida%2Fskifree)

Sign in with GitHub, accept the defaults, and Vercel gives you a public `https://…vercel.app` URL you can play on any device.

## Controls

| Input | Action |
|--------|--------|
| Mouse / ← → / A D | Steer |
| ↑ ↓ / W S | Brake / tuck |
| Numpad | Classic SkiFree-style directions |
| F | Turbo (2× sim speed, OG cheat) — toggle on/off |
| F2 / R | Restart |
| F3 / P / Esc | Pause |
| G | Toggle classic ↔ 3D graphics |
| C | Switch skier ↔ snowboarder (when safe) |

## Original binary & reverse engineering

The original `SKI.EXE` is under `SKIFREE game files/SKIFREE/`.

Classic mode uses **bitmaps extracted from the NE resource table** (86× 4-bit DIBs, white-keyed):

```bash
npm run extract-sprites
# → assets/original-sprites/
```

Physics / HUD constants and notes: [`tools/RE_NOTES.md`](tools/RE_NOTES.md).

## License / credit

Fan remake for personal/sharing fun. SkiFree © Chris Pirih / Microsoft. Do not sell this.
