/**
 * All tunable game feel lives here (plus the settings panel / localStorage).
 * See tools/RE_NOTES.md for RE notes on originals.
 *
 * Code should import names from this module and read them at use-time
 * (ESM live bindings) so the settings panel can update them live.
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
  /** px per displayed metre */
  pixelsPerMetre: number;
  /** metres before yeti */
  yetiDistanceM: number;
  /** full-edge coast friction (higher = snappier stop) */
  edgeFriction: number;
  /** south (tuck) speed px/s — other dirs scale from defaults */
  southSpeed: number;
  /** wsWest / esEast horizontal speed scale vs defaults */
  carveSpeedScale: number;
  snowboardSpeedMul: number;
  snowboardEdgeMul: number;
  crashMs: number;
  jumpMs: number;
  turnStepMs: number;
  classicScale: number;
  /** mouse dead-zone radius (CSS px) for pure south */
  mouseDeadZone: number;
  /** mouse distance for full hard left/right */
  mouseHardZone: number;
  /** show Dir/vx/vy on HUD */
  showDirDebug: boolean;
};

/** Factory defaults — reset target */
export const DEFAULT_SETTINGS: TunableSettings = {
  pixelsPerMetre: 16,
  yetiDistanceM: 2000,
  edgeFriction: 3.8,
  southSpeed: 175,
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
};

const STORAGE_KEY = "skifree-settings-v1";

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
export let EDGE_FRICTION = settings.edgeFriction;
export let SNOWBOARD_SPEED_MUL = settings.snowboardSpeedMul;
export let SNOWBOARD_EDGE_MUL = settings.snowboardEdgeMul;
export let CRASH_MS = settings.crashMs;
export let OUCH_MS = 500;
export let JUMP_MS = settings.jumpMs;
export let TURN_STEP_MS = settings.turnStepMs;
export let CLASSIC_SCALE = settings.classicScale;
export let SHOW_DIR_DEBUG = settings.showDirDebug;

/** [hard, sharp, mild, dead] mouse thresholds in CSS px */
export let MOUSE_DIR_THRESHOLDS: [number, number, number, number] = [
  settings.mouseHardZone,
  settings.mouseHardZone * 0.5,
  settings.mouseHardZone * 0.3,
  settings.mouseDeadZone,
];

/**
 * Base direction vectors at default southSpeed=175; rebuilt when settings change.
 * Indices match DIR_ORDER.
 */
const BASE_VEL = [
  { x: 0, y: 0 },
  { x: -70, y: 55 },
  { x: -55, y: 130 },
  { x: 0, y: 175 },
  { x: 55, y: 130 },
  { x: 70, y: 55 },
  { x: 0, y: 0 },
] as const;

export let VELOCITY_PX_S: { x: number; y: number }[] = BASE_VEL.map((v) => ({ ...v }));

function rebuildVelocity() {
  const s = settings.southSpeed / 175;
  const c = settings.carveSpeedScale;
  VELOCITY_PX_S = [
    { x: 0, y: 0 },
    { x: -70 * s * c, y: 55 * s * c },
    { x: -55 * s, y: 130 * s },
    { x: 0, y: settings.southSpeed },
    { x: 55 * s, y: 130 * s },
    { x: 70 * s * c, y: 55 * s * c },
    { x: 0, y: 0 },
  ];
}

/** Push `settings` into live export bindings. */
export function applySettings(partial?: Partial<TunableSettings>) {
  if (partial) Object.assign(settings, partial);

  settings.pixelsPerMetre = clamp(settings.pixelsPerMetre, 4, 64);
  settings.yetiDistanceM = clamp(settings.yetiDistanceM, 200, 10000);
  settings.edgeFriction = clamp(settings.edgeFriction, 0.5, 20);
  settings.southSpeed = clamp(settings.southSpeed, 40, 400);
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
