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

## Controls

| Input | Action |
|--------|--------|
| Mouse / ← → / A D | Steer |
| ↑ ↓ / W S | Brake / tuck |
| Numpad | Classic SkiFree-style directions |
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
