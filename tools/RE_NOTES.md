# SkiFree (`SKI.EXE`) reverse-engineering notes

Source binary: `SKIFREE game files/SKIFREE/SKI.EXE`  
Format: 16-bit Windows 3.x **NE** executable (MZ + NE @ `0x400`)  
Built from `ski2.c` (assert strings everywhere). Author: Chris Pirih / Microsoft, 1991.

## Layout

| Region | File offset | Size | Role |
|--------|-------------|------|------|
| Code segment | `0x0A20` | `0x5A36` | Game logic |
| Data segment | `0x6720` | `0x0BC8` | Strings, tables, assert tags |
| Resources | from resource table @ NE+`0x50` | — | 86 BITMAPs, icons, strings |

Resource align shift: **4** (offsets/lengths are in 16-byte paragraphs).

## Graphics

- **86** `RT_BITMAP` resources, all **4-bit** Windows DIBs (`BITMAPINFOHEADER`, `biBitCount=4`).
- Pure **white `(255,255,255)`** is the transparent key (snow); not palette index 0 (black).
- Extraction: `python3 tools/extract_sprites.py` → `assets/original-sprites/`.

### Key sprite IDs (from visual catalog)

| IDs | Content |
|-----|---------|
| 3–11 | Player skier directions + jump |

**Skier direction art (corrected visual mapping):**

| Resource | Facing | Notes |
|----------|--------|-------|
| #3 | **east** (hard right) | Skis point right — original extract filename said “west” |
| #4 | **west** (hard left) | Skis point left |
| #5 | wsWest | |
| #6 | esEast | |
| #7 | sWest | |
| #8 | sEast | |
| #9 | **south** | Back view, parallel skis — true straight-down pose |
| #10 | south alt | Near-south lean |
| #11 | jump | |
| 12–18 | Crash / ouch / tumble |
| 23–26 | Slalom flags / markers |
| 28–30 | **Snowboarders** (NPC + playable art) |
| 31–32 | Dogs |
| 33–36 | Rocks / stumps |
| 49–51 | Trees (med / dead / tall) |
| 52, 82 | Jump ramps (rainbow + small) |
| 53–63 | Logo, UI signs, course signs |
| 64–67 | Ski lift |
| 68–81 | Yeti run + eat animation |
| 83–85 | Fire / bush |
| 86 | Cursor |

## Strings (string table)

HUD labels match the original:

- `Time:`, `Dist:`, `Speed:`, `Style:`
- Formats: `%2u:%2.2u:%2.2u.%2.2u`, `%5.2dm`, `%5.2dm/s`, `%7ld`
- Pause: `Ski Paused ... Press F3 to continue`
- Hints: ` <-- that's you!`, ` <-- try again!`

## Gameplay constants (binary + known design)

| Constant | Value | Evidence |
|----------|-------|----------|
| Yeti spawn distance | **2000 m** | Classic design (Chris Pirih / community); not a bare `2000` imm in this build — likely computed from pixel distance |
| Screen width reference | **640** | Immediate `0x0280` appears 6× in code |
| Common small immediates | 8, 10, 12, 16, 32, 50, 60, 100, 1000 | Timer/UI/math; no single obvious `SetTimer` push of 30/50 isolated cleanly |
| Direction indices | 0–7 range | Multiple `cmp ax, N` chains; mouse→dir mapper near code+`0x49AB` uses thresholds **1, 3, 6, 12** mapping to dirs **3–6** |

### Mouse → direction thresholds (code+`0x49AB`)

Recovered control-flow maps a scalar (mouse delta–related) into discrete directions with breakpoints at **1, 3, 6, 12**. Our remake uses the same ladder for mouse steering when keyboard is idle.

### Velocity model (reconstructed for feel)

16-bit code does not expose a clean 7-entry `(dx,dy)` table in the data segment (logic is register/arithmetic heavy). Remake uses **pixels/sec** tuned so that:

- Full tuck (south) is fastest downhill  
- Hard edge (west/east) barely advances  
- Intermediate angles match original sprite set  
- ~30 Hz logical feel (original is `WM_TIMER`–driven)

Distance: **16 pixels ≈ 1 meter** (so ~2000 m yeti ≈ 32 000 px of travel).  
Speed HUD: `px/s ÷ 16` → m/s, matching original unit labels.

## Object / anim tables

Data around `0x4E0–0x5F0` holds mixed records (bitmap ids 12–21, counters 20–24, `-1` sentinels) interleaved with `ski2.c` assert tags — likely crash/tumble frame lists and object descriptors, not a simple velocity LUT.

Bitmap load-order word list @ data+`0x00CA` includes skier frames then snowboarders (28–30), dogs, rocks, yeti frames (65+).

## Remake mapping

| Original concept | Our code |
|------------------|----------|
| Discrete skier dirs + sprites 3–11 | `Direction` + `originalSprites.ts` |
| Snowboarder bitmaps 28–30 | Playable `snowboarder` character |
| Trees 49–51, rocks 33–34, ramp 52 | World obstacles |
| Yeti 68–81 | Yeti entity + eat frames |
| F2 restart / F3 pause | Same hotkeys |
| Classic 2D | Canvas + extracted PNGs |
| Optional 3D | three.js path (stylized) |

## Legal

Fan / personal use only. Do not redistribute Microsoft’s binary as your product; extracted sprites are used here solely for a non-commercial remake of a classic.
