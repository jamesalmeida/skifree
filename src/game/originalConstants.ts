/**
 * All tunable game feel lives here (plus the settings panel / localStorage).
 * See tools/RE_NOTES.md for RE notes on originals.
 *
 * Speed HUD: m/s = hypot(vx, vy) / PIXELS_PER_METRE
 * Defaults match classic SkiFree readouts:
 *   south ~18, one notch ~13, two notches ~6, full edge ~0, jump ~26–27
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

export type TunableSettings = {
  /** px per displayed metre (HUD) */
  pixelsPerMetre: number;
  /** metres before yeti */
  yetiDistanceM: number;
  /** full-edge coast friction (higher = snappier stop) */
  edgeFriction: number;
  /**
   * South (tuck) ground speed in m/s (HUD).
   * Other dirs are ratios of this (13/18, 6/18, 0).
   */
  southSpeedMs: number;
  /** Jump peak speed in m/s when tucking off a ramp */
  jumpSpeedMs: number;
  /** wsWest / esEast speed scale vs default ratio */
  carveSpeedScale: number;
  snowboardSpeedMul: number;
  snowboardEdgeMul: number;
  crashMs: number;
  jumpMs: number;
  turnStepMs: number;
  classicScale: number;
  mouseDeadZone: number;
  mouseHardZone: number;
  showDirDebug: boolean;
  /**
   * Extra particle snow spray etc. Classic two-frame south snow-dots always run.
   * Off by default — pure OG look.
   */
  enhancedAnimations: boolean;
};

/** Factory defaults — classic SkiFree-ish speed readouts */
export const DEFAULT_SETTINGS: TunableSettings = {
  pixelsPerMetre: 16,
  yetiDistanceM: 2000,
  edgeFriction: 3.8,
  southSpeedMs: 18,
  jumpSpeedMs: 26.5,
  carveSpeedScale: 1,
  snowboardSpeedMul: 1.15,
  snowboardEdgeMul: 0.9,
  crashMs: 1400,
  jumpMs: 700,
  turnStepMs: 85,
  classicScale: 2,
  mouseDeadZone: 16,
  mouseHardZone: 96,
  showDirDebug: true,
  enhancedAnimations: false,
};

/** Bump when defaults change incompatibly so old localStorage doesn’t stick. */
const STORAGE_KEY = "skifree-settings-v2";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function loadStored(): Partial<TunableSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<TunableSettings>;
  } catch {
    return {};
  }
}

/** Active settings (mutated by the panel). */
export const settings: TunableSettings = {
  ...DEFAULT_SETTINGS,
  ...loadStored(),
};

// ── Live exports used by game code ──────────────────────────────────────

export let PIXELS_PER_METRE = settings.pixelsPerMetre;
export let YETI_DISTANCE_M = settings.yetiDistanceM;
/** Yeti if you reverse past the start uphill (~69 m above the lodge) */
export const YETI_UPHILL_M = 69;
/**
 * Yeti if you ski far left/right of the mountain (~100 m).
 * Keep this near WORLD_HALF / ppm so you still see trees before blank snow.
 */
export const YETI_SIDE_M = 100;
export let EDGE_FRICTION = settings.edgeFriction;
export let SNOWBOARD_SPEED_MUL = settings.snowboardSpeedMul;
export let SNOWBOARD_EDGE_MUL = settings.snowboardEdgeMul;
export let CRASH_MS = settings.crashMs;
export let OUCH_MS = 500;
export let JUMP_MS = settings.jumpMs;
export let TURN_STEP_MS = settings.turnStepMs;
export let CLASSIC_SCALE = settings.classicScale;
export let SHOW_DIR_DEBUG = settings.showDirDebug;
export let ENHANCED_ANIMATIONS = settings.enhancedAnimations;
/** Ground tuck speed (px/s) */
export let SOUTH_SPEED_PX = settings.southSpeedMs * settings.pixelsPerMetre;
/** Jump tuck speed (px/s) */
export let JUMP_SPEED_PX = settings.jumpSpeedMs * settings.pixelsPerMetre;

/** [hard, sharp, mild, dead] mouse thresholds in CSS px */
export let MOUSE_DIR_THRESHOLDS: [number, number, number, number] = [
  settings.mouseHardZone,
  settings.mouseHardZone * 0.5,
  settings.mouseHardZone * 0.3,
  settings.mouseDeadZone,
];

/**
 * Direction velocities in px/s. Magnitudes target classic m/s at ppm=16:
 *   edge 0, carve 6, diagonal 13, south 18
 * Unit directions match prior carve angles.
 */
export let VELOCITY_PX_S: { x: number; y: number }[] = [];

function rebuildVelocity() {
  const ppm = settings.pixelsPerMetre;
  const south = settings.southSpeedMs * ppm; // 18 m/s → 288 px/s
  // Ratios from original feel: 13/18 and 6/18
  const diag = south * (13 / 18);
  const carve = south * (6 / 18) * settings.carveSpeedScale;

  // Unit vectors for diagonals / carves (from prior table angles)
  // sWest ~ (-0.390, 0.921), wsWest ~ (-0.787, 0.618)
  VELOCITY_PX_S = [
    { x: 0, y: 0 }, // west — coast to stop
    { x: -0.787 * carve, y: 0.618 * carve }, // wsWest ~6 m/s
    { x: -0.39 * diag, y: 0.921 * diag }, // sWest ~13 m/s
    { x: 0, y: south }, // south ~18 m/s
    { x: 0.39 * diag, y: 0.921 * diag }, // sEast ~13 m/s
    { x: 0.787 * carve, y: 0.618 * carve }, // esEast ~6 m/s
    { x: 0, y: 0 }, // east — coast to stop
  ];

  SOUTH_SPEED_PX = south;
  JUMP_SPEED_PX = settings.jumpSpeedMs * ppm;
}

/** Push `settings` into live export bindings. */
export function applySettings(partial?: Partial<TunableSettings>) {
  if (partial) Object.assign(settings, partial);

  // Migrate old southSpeed (px) key if someone had v1 leftovers in a partial
  const legacy = settings as TunableSettings & { southSpeed?: number };
  if (legacy.southSpeed != null && legacy.southSpeedMs == null) {
    settings.southSpeedMs = legacy.southSpeed / 16;
  }

  settings.pixelsPerMetre = clamp(settings.pixelsPerMetre, 4, 64);
  settings.yetiDistanceM = clamp(settings.yetiDistanceM, 200, 10000);
  settings.edgeFriction = clamp(settings.edgeFriction, 0.5, 20);
  settings.southSpeedMs = clamp(settings.southSpeedMs, 8, 40);
  settings.jumpSpeedMs = clamp(settings.jumpSpeedMs, 12, 50);
  settings.carveSpeedScale = clamp(settings.carveSpeedScale, 0.2, 2);
  settings.snowboardSpeedMul = clamp(settings.snowboardSpeedMul, 0.5, 2.5);
  settings.snowboardEdgeMul = clamp(settings.snowboardEdgeMul, 0.3, 1.5);
  settings.crashMs = clamp(settings.crashMs, 200, 4000);
  settings.jumpMs = clamp(settings.jumpMs, 200, 2500);
  settings.turnStepMs = clamp(settings.turnStepMs, 20, 300);
  settings.classicScale = clamp(Math.round(settings.classicScale), 1, 5);
  settings.mouseDeadZone = clamp(settings.mouseDeadZone, 0, 120);
  settings.mouseHardZone = clamp(settings.mouseHardZone, 40, 400);

  PIXELS_PER_METRE = settings.pixelsPerMetre;
  YETI_DISTANCE_M = settings.yetiDistanceM;
  EDGE_FRICTION = settings.edgeFriction;
  SNOWBOARD_SPEED_MUL = settings.snowboardSpeedMul;
  SNOWBOARD_EDGE_MUL = settings.snowboardEdgeMul;
  CRASH_MS = settings.crashMs;
  JUMP_MS = settings.jumpMs;
  TURN_STEP_MS = settings.turnStepMs;
  CLASSIC_SCALE = settings.classicScale;
  SHOW_DIR_DEBUG = settings.showDirDebug;
  ENHANCED_ANIMATIONS = !!settings.enhancedAnimations;
  MOUSE_DIR_THRESHOLDS = [
    settings.mouseHardZone,
    settings.mouseHardZone * 0.5,
    settings.mouseHardZone * 0.3,
    settings.mouseDeadZone,
  ];
  rebuildVelocity();
}

export function saveSettings() {
  applySettings();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resetSettings() {
  Object.assign(settings, DEFAULT_SETTINGS);
  applySettings();
  localStorage.removeItem(STORAGE_KEY);
}

// Apply stored values on load
applySettings();
