/**
 * Constants recovered / reconstructed from SKI.EXE reverse engineering.
 * See tools/RE_NOTES.md for evidence.
 */

/** Original logical pixels per displayed metre (distance & speed HUD). */
export const PIXELS_PER_METRE = 16;

/** Yeti appears after this many metres of downhill travel. */
export const YETI_DISTANCE_M = 2000;

/**
 * Mouse delta thresholds (screen pixels relative to skier) → direction steps.
 * Recovered from cmp chain near code+0x49AB (1, 3, 6, 12).
 */
export const MOUSE_DIR_THRESHOLDS = [12, 6, 3, 1] as const;

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
 * Reconstructed for classic feel (no clean LUT in data segment;
 * magnitudes chosen so south is fastest and edges nearly flat).
 * ~5–6 px/frame at 30 Hz for full tuck.
 */
export const VELOCITY_PX_S: ReadonlyArray<{ x: number; y: number }> = [
  { x: -110, y: 8 }, // west — shuffle
  { x: -95, y: 70 }, // wsWest
  { x: -55, y: 130 }, // sWest
  { x: 0, y: 175 }, // south
  { x: 55, y: 130 }, // sEast
  { x: 95, y: 70 }, // esEast
  { x: 110, y: 8 }, // east
];

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
