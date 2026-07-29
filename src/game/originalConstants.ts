/**
 * Constants recovered / reconstructed from SKI.EXE reverse engineering.
 * See tools/RE_NOTES.md for evidence.
 */

/** Original logical pixels per displayed metre (distance & speed HUD). */
export const PIXELS_PER_METRE = 16;

/** Yeti appears after this many metres of downhill travel. */
export const YETI_DISTANCE_M = 2000;

/**
 * Mouse delta thresholds (CSS px from skier / screen center) → direction steps.
 * Original EXE used 1 / 3 / 6 / 12 in 640-wide game pixels; scaled ~8× for
 * modern full-screen canvas so the center dead-zone actually yields south.
 * Order: [hard edge, sharp diagonal, mild diagonal, dead-zone].
 */
export const MOUSE_DIR_THRESHOLDS = [96, 48, 28, 16] as const;

/**
 * Direction order matching original sprite set (west → east).
 * Indices used by velocity table and sprite map.
 */
export const DIR_ORDER = [
  "hardLeft", // west
  "left", // wsWest
  "downLeft", // sWest
  "down", // south
  "downRight", // sEast
  "right", // esEast
  "hardRight", // east
] as const;

/**
 * Velocity in original pixels / second for each DIR_ORDER entry.
 *
 * Classic SkiFree: full west/east digs the edges in and **stops** (no
 * continuous sideways slide). Diagonals still move; pure south is fastest.
 * ~5–6 px/frame at 30 Hz for full tuck.
 */
export const VELOCITY_PX_S: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0, y: 0 }, // west — coasts to a stop (see EDGE_FRICTION)
  { x: -70, y: 55 }, // wsWest — slow carve
  { x: -55, y: 130 }, // sWest
  { x: 0, y: 175 }, // south
  { x: 55, y: 130 }, // sEast
  { x: 70, y: 55 }, // esEast — slow carve
  { x: 0, y: 0 }, // east — coasts to a stop (see EDGE_FRICTION)
];

/**
 * How fast leftover speed bleeds off on full west/east / brake.
 * Higher = snappier stop. ~6–8 ≈ a short coast then settle (original feel).
 */
export const EDGE_FRICTION = 6.5;

/** Snowboarder multipliers vs skier (not in original as playable; tuned for fun). */
export const SNOWBOARD_SPEED_MUL = 1.15;
export const SNOWBOARD_EDGE_MUL = 0.9;

/** Crash / ouch recovery (ms) — matches ~1.5s sit-down feel. */
export const CRASH_MS = 1400;
export const OUCH_MS = 500;

/** Jump air time (ms). */
export const JUMP_MS = 700;

/** Keyboard: ms between automatic direction steps while key held. */
export const TURN_STEP_MS = 85;

/** Draw scale for classic 2D (integer; keeps pixels crisp). */
export const CLASSIC_SCALE = 2;
