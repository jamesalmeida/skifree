/**
 * Sprite catalog for the classic remake.
 *
 * Skier dirs: labeled crops (unambiguous).
 * Snowboarder dirs: EXE #28–30 (magenta rider + yellow board).
 *   NOTE: extract labels lie often — verify against _contact_sheet.png:
 *     #31–32 “dog”      → pink beginners
 *     #33–34 “rock”     → gray dogs (walk)
 *     #35–36 “stump”    → dogs sitting / woof
 *     #37–44 “skier_*”  → freestyle snowboarder poses
 *     #45               → rock / snow bump
 *     #46               → olive stump/shrub
 *     #69–73            → yeti run cycle (one facing)
 *     #74–81            → yeti eat → swallow → full
 */
import type {
  CharacterType,
  Direction,
  Obstacle,
  ObstacleType,
} from "../game/types";

const RAW: Record<string, { file: string; flip?: boolean }> = {
  // --- skier (labeled original art) ---
  skier_hardLeft: { file: "labeled_west.png" },
  skier_left: { file: "labeled_wsWest.png" },
  skier_downLeft: { file: "labeled_sWest.png" },
  skier_down: { file: "labeled_south.png" },
  // skier_down2 built at load by shifting snow-dot pixels on skier_down
  skier_downRight: { file: "labeled_sEast.png" },
  skier_right: { file: "labeled_esEast.png" },
  skier_hardRight: { file: "labeled_east.png" },
  skier_stop: { file: "labeled_west.png" },
  skier_jump: { file: "labeled_jumping.png" },
  skier_flip1: { file: "labeled_somersault1.png" },
  skier_flip2: { file: "labeled_somersault2.png" },
  skier_ouch: { file: "labeled_ouch.png" }, // buried under snow, ski up
  skier_crash: { file: "labeled_hit.png" }, // sit up in snow

  // --- snowboarder: freestyle rider (blonde / green / purple / yellow board) ---
  // board_sEast = faces SE/right · board_sWest = faces SW/left
  board_hardLeft: { file: "board_sEast.png", flip: true }, // SE mirrored → hard left
  board_left: { file: "board_sWest.png" },
  board_downLeft: { file: "038_skier_red_b.png", flip: true }, // source leans right; flip for left
  // board_down / flips: built at load from #37 (straight south + backflip spins)
  board_down: { file: "037_skier_red_a.png" },
  board_downRight: { file: "board_sEast.png" },
  board_right: { file: "board_sEast.png" },
  board_hardRight: { file: "board_sWest.png", flip: true }, // SW mirrored → hard right
  board_stop: { file: "board_sWest.png" },
  board_jump: { file: "037_skier_red_a.png" },
  board_flip1: { file: "037_skier_red_a.png" }, // overwritten with rotated backflip mid
  board_flip2: { file: "037_skier_red_a.png" }, // overwritten with rotated backflip late
  board_ouch: { file: "042_skier_crash_air2.png" },
  board_crash: { file: "042_skier_crash_air2.png" },

  // --- beginner / snowplow (EXE #28–30 + pink sheet crops) ---
  // These were previously misused as board-dirs.
  beginner: { file: "030_snowboarder_s.png" },
  beginner2: { file: "board_south.png" },
  beginner_downLeft: { file: "029_snowboarder_sw.png" },
  beginner_downRight: { file: "028_snowboarder_se.png" },
  beginner_left: { file: "board_sWest_pink.png" },
  beginner_right: { file: "board_sWest_pink.png", flip: true },
  beginner_sit: { file: "board_sit.png" },
  // Classic front snowplow stills (EXE #31/#32)
  beginner_plow: { file: "beginner_a.png" },
  beginner_plow2: { file: "beginner_b.png" },

  // --- world (EXE extract; verify labels on contact sheet) ---
  tree: { file: "051_tree_tall.png" },
  smallTree: { file: "049_tree_med.png" },
  deadTree: { file: "050_tree_dead.png" },
  rock: { file: "045_snow_bump.png" },
  // #46 is the classic olive cut-stump / shrub (not a mushroom; no mushrooms in OG)
  stump: { file: "046_snow_pile.png" },
  jump: { file: "052_rainbow_ramp.png" },
  // Soft powder that slows you (EXE #27 labeled “cloud” — gray ridge arcs)
  slowSnow: { file: "027_cloud.png" },
  // Slalom: only two gate markers (no flips)
  //   Gate-Red-Left  = 023 red with ←
  //   Gate-Blue-Right = 024 blue with →  (file labeled “green” but DIB is blue)
  gate_red: { file: "023_flag_red.png" },
  gate_blue: { file: "024_flag_green.png" },
  finish: { file: "059_sign_finish_l.png" },
  finishR: { file: "060_sign_finish_r.png" },
  // Ski lift (EXE #64–67 — extract names lie; verified against art)
  liftPole: { file: "064_lift_pole.png" },
  liftEmpty: { file: "067_chair_pair.png" }, // empty double seat
  liftPerson: { file: "066_chair_person.png" }, // one rider
  liftPair: { file: "065_chair_empty.png" }, // two riders (mislabeled “empty”)
  // Yeti run: one facing only (flip in renderer by vx). EXE #69–72.
  yeti: { file: "069_yeti_run1.png" },
  yeti2: { file: "070_yeti_run2.png" },
  yeti3: { file: "071_yeti_run3.png" },
  yeti4: { file: "072_yeti_run4.png" },
  yetiEat: { file: "yeti_eating1.png" },
  yetiEat2: { file: "yeti_eating2.png" },
  yetiEat3: { file: "yeti_eating3.png" },
  yetiEat4: { file: "yeti_eating4.png" },
  yetiEat5: { file: "yeti_eating5.png" },
  yetiFull: { file: "080_yeti_full.png" },
  // Toothpick bob after swallow (full = stick up, wave = stick down)
  yetiWave: { file: "081_yeti_wave.png" },
  npc_skier: { file: "labeled_south.png" },
  npc_board: { file: "037_skier_red_a.png" },
  logo: { file: "053_logo.png" },
  dog: { file: "033_rock_a.png" },
  dog2: { file: "034_rock_b.png" },
  dogSit: { file: "035_stump_a.png" },
  dogSit2: { file: "036_stump_b.png" },
  fire0: { file: "083_fire_a.png" },
  fire1: { file: "084_fire_b.png" },
  fire2: { file: "085_fire_c.png" },
};

/** Keys built as canvases (no source PNG). */
const SYNTHETIC = new Set(["cursor"]);

const cache = new Map<string, HTMLCanvasElement | HTMLImageElement>();
/** Source file (or synthetic tag) for catalog display */
const catalogSource = new Map<string, { file: string; flipped: boolean }>();
let loadPromise: Promise<void> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

function flipHorizontal(img: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img instanceof HTMLImageElement ? img.naturalWidth || img.width : img.width;
  c.height = img instanceof HTMLImageElement ? img.naturalHeight || img.height : img.height;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(c.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0);
  return c;
}

/**
 * Sheet crops often leave a lime chroma bar (#89f10f) on the bottom/top.
 * Make that (and near-matches) fully transparent.
 */
function stripChromaBars(img: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
  const w = img instanceof HTMLImageElement ? img.naturalWidth || img.width : img.width;
  const h = img instanceof HTMLImageElement ? img.naturalHeight || img.height : img.height;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]!;
    const g = d[i + 1]!;
    const b = d[i + 2]!;
    // Sheet crop bar only (#89f10f) — do NOT strip freestyle clothing greens
    const isChroma =
      Math.abs(r - 0x89) < 20 && Math.abs(g - 0xf1) < 20 && Math.abs(b - 0x0f) < 24;
    if (isChroma) {
      d[i + 3] = 0;
    }
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

function prepareSprite(
  img: HTMLImageElement,
  flip?: boolean,
): HTMLCanvasElement | HTMLImageElement {
  const cleaned = stripChromaBars(img);
  return flip ? flipHorizontal(cleaned) : cleaned;
}

/**
 * Classic Windows white arrow cursor (black outline).
 * Clean stem / tail like Win3.x–XP default pointer.
 */
function makeCursorCanvas(): HTMLCanvasElement {
  const W = "#ffffff";
  const K = "#000000";
  // Hotspot = top-left tip. Stem splits cleanly into a short angled tail.
  const rows = [
    "K.........",
    "KK........",
    "KWK.......",
    "KWWK......",
    "KWWWK.....",
    "KWWWWK....",
    "KWWWWWK...",
    "KWWWWWWK..",
    "KWWWWWWWK.",
    "KWWWWWWWWK",
    "KWWWWKKKKK",
    "KWWWKK....",
    "KWWKWK....",
    "KWK.KWK...",
    "KK...KWK..",
    "K.....KWK.",
    ".......KWK",
    "........KK",
  ];
  const g: (string | null)[][] = rows.map((row) =>
    [...row].map((ch) => (ch === "K" ? K : ch === "W" ? W : null)),
  );
  return canvasFromGrid(g);
}

/** Rotate sprite around center (degrees, clockwise). Nearest-neighbor. */
function rotateSprite(
  src: HTMLCanvasElement | HTMLImageElement,
  degrees: number,
): HTMLCanvasElement {
  const w = src instanceof HTMLImageElement ? src.naturalWidth || src.width : src.width;
  const h = src instanceof HTMLImageElement ? src.naturalHeight || src.height : src.height;
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const nw = Math.max(1, Math.ceil(w * cos + h * sin));
  const nh = Math.max(1, Math.ceil(w * sin + h * cos));
  const c = document.createElement("canvas");
  c.width = nw;
  c.height = nh;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(nw / 2, nh / 2);
  ctx.rotate(rad);
  ctx.drawImage(src, -w / 2, -h / 2);
  return c;
}

/**
 * Freestyle boarder facing more straight down: counter-rotate the SE lean
 * so the board sits under the rider.
 */
function makeBoardDownStraight(
  src: HTMLCanvasElement | HTMLImageElement,
): HTMLCanvasElement {
  // ~-22° undoes the SE carve lean toward a south tuck
  return rotateSprite(src, -22);
}

function canvasFromGrid(grid: (string | null)[][]): HTMLCanvasElement {
  const h = grid.length;
  const w = Math.max(...grid.map((r) => r.length));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < (grid[y]?.length ?? 0); x++) {
      const col = grid[y]![x];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

export async function preloadOriginalSprites(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const base = `${import.meta.env.BASE_URL}original-sprites/`;
    const fileCache = new Map<string, HTMLImageElement>();
    const files = [...new Set(Object.values(RAW).map((r) => r.file))];
    await Promise.all(
      files.map(async (file) => {
        try {
          fileCache.set(file, await loadImage(base + file));
        } catch (e) {
          console.warn(e);
        }
      }),
    );

    for (const [key, spec] of Object.entries(RAW)) {
      const img = fileCache.get(spec.file);
      if (!img) continue;
      cache.set(key, prepareSprite(img, spec.flip));
      catalogSource.set(key, { file: spec.file, flipped: !!spec.flip });
    }

    // Classic south snow-spray: alternate frame with dots shifted (OG feel)
    const south = cache.get("skier_down");
    if (south) {
      cache.set("skier_down2", makeSnowDotAltFrame(south));
      catalogSource.set("skier_down2", {
        file: "labeled_south.png (snow-dot alt)",
        flipped: false,
      });
    }

    // Freestyle boarder: straight south + backflip spin frames from #37
    const freestyleRaw = fileCache.get("037_skier_red_a.png");
    if (freestyleRaw) {
      const freestyle = stripChromaBars(freestyleRaw);
      const straight = makeBoardDownStraight(freestyle);
      cache.set("board_down", straight);
      catalogSource.set("board_down", {
        file: "037_skier_red_a.png (straight south)",
        flipped: false,
      });
      cache.set("board_down2", makeSnowDotAltFrame(straight));
      catalogSource.set("board_down2", {
        file: "037 (south snow-dot alt)",
        flipped: false,
      });
      // Backflip: upright → rotate back over head → come around
      cache.set("board_jump", freestyle);
      catalogSource.set("board_jump", { file: "037_skier_red_a.png", flipped: false });
      cache.set("board_flip1", rotateSprite(freestyle, 130));
      catalogSource.set("board_flip1", {
        file: "037 (backflip +130°)",
        flipped: false,
      });
      cache.set("board_flip2", rotateSprite(freestyle, 220));
      catalogSource.set("board_flip2", {
        file: "037 (backflip +220°)",
        flipped: false,
      });
    }

    // White arrow cursor (not EXE #86)
    cache.set("cursor", makeCursorCanvas());
    catalogSource.set("cursor", { file: "(white arrow cursor)", flipped: false });
  })();
  return loadPromise;
}

/**
 * Clone a sprite and nudge light-gray / mid-gray snow spray pixels so two
 * south frames can alternate (classic SkiFree tuck animation).
 */
function makeSnowDotAltFrame(
  src: HTMLCanvasElement | HTMLImageElement,
): HTMLCanvasElement {
  const w = src instanceof HTMLImageElement ? src.naturalWidth || src.width : src.width;
  const h = src instanceof HTMLImageElement ? src.naturalHeight || src.height : src.height;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  // Collect snow-dot pixels (classic gray spray: ~0xC0C0C0 and ~0x808080)
  type Dot = { x: number; y: number; r: number; g: number; b: number; a: number };
  const dots: Dot[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const a = data[i + 3]!;
      if (a < 200) continue;
      const isLightGray =
        Math.abs(r - 192) < 24 && Math.abs(g - 192) < 24 && Math.abs(b - 192) < 24;
      const isMidGray =
        Math.abs(r - 128) < 20 && Math.abs(g - 128) < 20 && Math.abs(b - 128) < 20;
      // Skip pure black outlines and saturated colors
      if (!isLightGray && !isMidGray) continue;
      // Only spray-like singles / small clusters near edges of figure — keep mid body
      // by requiring the pixel not to be fully surrounded by same gray (ski tips under
      // feet are mid-gray singles; head spray is light gray around poles).
      dots.push({ x, y, r, g, b, a });
    }
  }
  // Erase original dots then redraw shifted (±1–2 px, opposite on left/right half)
  for (const d of dots) {
    const i = (d.y * w + d.x) * 4;
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 0;
  }
  for (const d of dots) {
    const side = d.x < w / 2 ? -1 : 1;
    const nx = Math.max(0, Math.min(w - 1, d.x + side));
    const ny = Math.max(0, Math.min(h - 1, d.y + (d.y > h * 0.6 ? -1 : 1)));
    const i = (ny * w + nx) * 4;
    // Don't paint over solid opaque body (non-white, non-transparent)
    const br = data[i]!;
    const bg = data[i + 1]!;
    const bb = data[i + 2]!;
    const ba = data[i + 3]!;
    const empty = ba < 32 || (br > 240 && bg > 240 && bb > 240);
    if (!empty) continue;
    data[i] = d.r;
    data[i + 1] = d.g;
    data[i + 2] = d.b;
    data[i + 3] = d.a;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function getOriginalSprite(key: string): HTMLCanvasElement | HTMLImageElement | null {
  return cache.get(key) ?? null;
}

export type SpriteCatalogEntry = {
  key: string;
  file: string;
  flipped: boolean;
  loaded: boolean;
  width: number;
  height: number;
};

/** Every registered sprite key for the debug browser. */
export function listSpriteCatalog(): SpriteCatalogEntry[] {
  const keys = new Set([...Object.keys(RAW), ...SYNTHETIC, ...catalogSource.keys()]);
  return [...keys].map((key) => {
    const img = cache.get(key);
    const src = catalogSource.get(key);
    const raw = RAW[key];
    return {
      key,
      file: src?.file ?? raw?.file ?? "?",
      flipped: src?.flipped ?? !!raw?.flip,
      loaded: !!img,
      width: img ? img.width : 0,
      height: img ? img.height : 0,
    };
  });
}

/** Named multi-frame animations for the debug browser. */
export const SPRITE_ANIMATIONS: { id: string; label: string; keys: string[]; fps: number }[] = [
  {
    id: "skier-dirs",
    label: "Skier directions",
    keys: [
      "skier_hardLeft",
      "skier_left",
      "skier_downLeft",
      "skier_down",
      "skier_downRight",
      "skier_right",
      "skier_hardRight",
    ],
    fps: 4,
  },
  {
    id: "skier-south-snow",
    label: "Skier south snow dots",
    keys: ["skier_down", "skier_down2"],
    fps: 8,
  },
  {
    id: "skier-flip",
    label: "Skier backflip",
    keys: ["skier_jump", "skier_flip1", "skier_flip2"],
    fps: 6,
  },
  {
    id: "skier-crash",
    label: "Skier crash",
    keys: ["skier_ouch", "skier_crash"],
    fps: 2,
  },
  {
    id: "board-dirs",
    label: "Snowboarder directions",
    keys: [
      "board_hardLeft",
      "board_left",
      "board_downLeft",
      "board_down",
      "board_downRight",
      "board_right",
      "board_hardRight",
    ],
    fps: 4,
  },
  {
    id: "board-air",
    label: "Snowboarder air / crash",
    keys: ["board_jump", "board_flip1", "board_flip2", "board_ouch"],
    fps: 5,
  },
  {
    id: "beginner-dirs",
    label: "Beginner skier dirs",
    keys: [
      "beginner_left",
      "beginner_downLeft",
      "beginner",
      "beginner_downRight",
      "beginner_right",
      "beginner2",
    ],
    fps: 3,
  },
  {
    id: "yeti-run",
    label: "Yeti run (flip in-game by direction)",
    keys: ["yeti", "yeti2", "yeti3", "yeti4"],
    fps: 6,
  },
  {
    id: "yeti-eat",
    label: "Yeti eat / swallow",
    keys: [
      "yetiEat",
      "yetiEat2",
      "yetiEat3",
      "yetiEat4",
      "yetiEat5",
      "yetiFull",
      "yetiWave",
      "yetiFull",
      "yetiWave",
    ],
    fps: 5,
  },
  {
    id: "dog",
    label: "Dog walk",
    keys: ["dog", "dog2"],
    fps: 5,
  },
  {
    id: "dog-sit",
    label: "Dog sit / woof",
    keys: ["dogSit", "dogSit2"],
    fps: 3,
  },
  {
    id: "beginner",
    label: "Beginner skier",
    keys: ["beginner", "beginner2"],
    fps: 3,
  },
  {
    id: "fire",
    label: "Fire (dead tree)",
    keys: ["fire0", "fire1", "fire2"],
    fps: 8,
  },
];

export function playerSpriteName(
  character: CharacterType,
  dir: Direction,
  opts: {
    crashPhase?: "none" | "ouch" | "sit";
    airborne?: boolean;
    flipPose?: 0 | 1 | 2;
    scootKind?: "none" | "left" | "right" | "up";
    /** 0 | 1 — south snow-dot alternate frame */
    southFrame?: 0 | 1;
  } = {},
): string {
  const prefix = character === "snowboarder" ? "board_" : "skier_";
  if (opts.crashPhase === "ouch") return prefix + "ouch";
  if (opts.crashPhase === "sit") return prefix + "crash";
  if (opts.airborne) {
    if (opts.flipPose === 1) return prefix + "flip1";
    if (opts.flipPose === 2) return prefix + "flip2";
    return prefix + "jump";
  }
  // Tiny scoot shuffle: show intermediate “step” frame while nudging
  if (opts.scootKind === "left") return prefix + "left";
  if (opts.scootKind === "right") return prefix + "right";
  if (opts.scootKind === "up") return prefix + "stop";
  if (dir === "up" || dir === "stop") {
    return character === "snowboarder" ? "board_stop" : "skier_stop";
  }
  // Straight south: alternate snow-dot frames (classic tuck flicker)
  if (dir === "down" && opts.southFrame === 1) {
    const alt = prefix + "down2";
    if (cache.has(alt)) return alt;
  }
  return prefix + dir;
}

export function obstacleSpriteName(
  type: ObstacleType,
  o?: Pick<Obstacle, "gateColor" | "type">,
): string {
  // Red ← and blue → only (type or gateColor)
  if (type === "slalomFlagL" || type === "slalomFlagR") {
    if (o?.gateColor === "blue" || type === "slalomFlagR") return "gate_blue";
    return "gate_red";
  }
  switch (type) {
    case "tree":
      return "tree";
    case "smallTree":
      return "smallTree";
    case "deadTree":
      return "deadTree";
    case "rock":
      return "rock";
    case "stump":
      return "stump";
    case "jump":
      return "jump";
    case "slowSnow":
      return "slowSnow";
    case "finish":
      return "finish";
    case "liftPole":
      return "liftPole";
    case "liftEmpty":
      return "liftEmpty";
    case "liftPerson":
      return "liftPerson";
    case "liftPair":
      return "liftPair";
    default:
      return "rock";
  }
}

/** Sprite key for beginner NPC by direction. */
export function beginnerSpriteName(dir: Direction, phase: 0 | 1 = 0): string {
  if (dir === "downLeft" || dir === "left" || dir === "hardLeft") {
    return phase === 0 ? "beginner_downLeft" : "beginner_left";
  }
  if (dir === "downRight" || dir === "right" || dir === "hardRight") {
    return phase === 0 ? "beginner_downRight" : "beginner_right";
  }
  return phase === 0 ? "beginner" : "beginner2";
}

const YETI_EAT_KEYS = [
  "yetiEat",
  "yetiEat2",
  "yetiEat3",
  "yetiEat4",
  "yetiEat5",
  "yetiFull",
  "yetiWave",
  "yetiFull",
  "yetiWave",
] as const;

/** Joy hop after swallow — full belly ↔ toothpick wave */
const YETI_CELEBRATE_KEYS = ["yetiFull", "yetiWave"] as const;

export function yetiSpriteName(
  frame: number,
  eating: boolean,
  celebrating = false,
): string {
  if (celebrating) {
    return YETI_CELEBRATE_KEYS[frame % YETI_CELEBRATE_KEYS.length]!;
  }
  if (eating) {
    // Play through swallow once (caller advances to celebrate after last)
    return YETI_EAT_KEYS[Math.min(frame, YETI_EAT_KEYS.length - 1)]!;
  }
  const run = ["yeti", "yeti2", "yeti3", "yeti4"] as const;
  return run[frame % 4]!;
}
