/**
 * Loads bitmaps extracted from SKI.EXE (tools/extract_sprites.py).
 * Served from /public/original-sprites/ (copied from assets/).
 */
import type { CharacterType, Direction, ObstacleType } from "../game/types";

/**
 * Visual re-audit of skier frames (resource id → on-screen facing):
 *
 *  #3  profile facing LEFT  → west / hardLeft
 *  #4  profile facing RIGHT → east / hardRight
 *  #5  intermediate left     → wsWest
 *  #6  intermediate right    → esEast
 *  #7  downhill-left         → sWest
 *  #8  frontal, skis vertical → SOUTH (true straight-down)
 *  #9  facing RIGHT diagonal → sEast  (was wrongly used as south!)
 *  #10 downhill-left alt     → sWest alt
 *  #11 jump
 *
 * Filenames still have the first pass labels; trust ids + art, not names.
 */
const FILES: Record<string, string> = {
  skier_hardLeft: "003_skier_west.png", // faces left
  skier_left: "005_skier_wsWest.png",
  skier_downLeft: "007_skier_sWest.png",
  skier_down: "008_skier_sEast.png", // frontal south (filename is wrong)
  skier_downRight: "009_skier_south.png", // faces right (filename is wrong)
  skier_right: "006_skier_esEast.png",
  skier_hardRight: "004_skier_east.png", // faces right
  skier_stop: "003_skier_west.png",
  skier_jump: "011_skier_jump.png",
  skier_ouch: "012_skier_ouch.png",
  skier_crash: "013_skier_sit_l.png",

  board_hardLeft: "029_snowboarder_sw.png",
  board_left: "029_snowboarder_sw.png",
  board_downLeft: "029_snowboarder_sw.png",
  board_down: "030_snowboarder_s.png",
  board_downRight: "028_snowboarder_se.png",
  board_right: "028_snowboarder_se.png",
  board_hardRight: "028_snowboarder_se.png",
  board_stop: "030_snowboarder_s.png",
  board_jump: "030_snowboarder_s.png",
  board_ouch: "012_skier_ouch.png",
  board_crash: "013_skier_sit_l.png",

  tree: "051_tree_tall.png",
  smallTree: "049_tree_med.png",
  deadTree: "050_tree_dead.png",
  rock: "033_rock_a.png",
  stump: "035_stump_a.png",
  jump: "052_rainbow_ramp.png",
  mushroom: "036_stump_b.png",
  slalomFlagL: "023_flag_red.png",
  slalomFlagR: "026_marker_red.png",
  finish: "059_sign_finish_l.png",
  yeti: "069_yeti_run1.png",
  yeti2: "070_yeti_run2.png",
  yetiEat: "076_yeti_eat3.png",
  npc_skier: "039_skier_blue_a.png",
  npc_board: "028_snowboarder_se.png",
  logo: "053_logo.png",
  cursor: "086_cursor.png",
  dog: "031_dog_a.png",
};

const cache = new Map<string, HTMLImageElement>();
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

export async function preloadOriginalSprites(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const base = `${import.meta.env.BASE_URL}original-sprites/`;
    await Promise.all(
      Object.entries(FILES).map(async ([key, file]) => {
        try {
          cache.set(key, await loadImage(base + file));
        } catch (e) {
          console.warn(e);
        }
      }),
    );
  })();
  return loadPromise;
}

export function getOriginalSprite(key: string): HTMLImageElement | null {
  return cache.get(key) ?? null;
}

/**
 * Pick facing from actual velocity so the sprite always matches movement.
 * atan2(vx, vy): 0 = straight down the slope, −π/2 = left, +π/2 = right.
 */
export function directionFromVelocity(vx: number, vy: number, fallback: Direction): Direction {
  const speed = Math.hypot(vx, vy);
  if (speed < 12) {
    if (fallback === "stop" || fallback === "up") return fallback;
    // nearly stopped but still “in” a hard-edge pose
    if (fallback === "hardLeft" || fallback === "hardRight") return fallback;
    return "stop";
  }

  // Angle from straight-down axis
  const deg = (Math.atan2(vx, vy) * 180) / Math.PI;
  // deg: 0 down, negative left, positive right, ±180 uphill
  if (deg < -75) return "hardLeft";
  if (deg < -45) return "left";
  if (deg < -15) return "downLeft";
  if (deg <= 15) return "down";
  if (deg <= 45) return "downRight";
  if (deg <= 75) return "right";
  return "hardRight";
}

export function playerSpriteName(
  character: CharacterType,
  dir: Direction,
  opts: {
    crashed?: boolean;
    airborne?: boolean;
    ouch?: boolean;
    vx?: number;
    vy?: number;
  } = {},
): string {
  const prefix = character === "snowboarder" ? "board_" : "skier_";
  if (opts.crashed) return prefix + "crash";
  if (opts.ouch) return prefix + "ouch";
  if (opts.airborne) return prefix + "jump";

  // Prefer velocity so art always matches how they're actually sliding
  let face = dir;
  if (opts.vx !== undefined && opts.vy !== undefined && !opts.crashed && !opts.airborne) {
    face = directionFromVelocity(opts.vx, opts.vy, dir);
  }

  if (face === "up" || face === "stop") {
    return character === "snowboarder" ? "board_stop" : "skier_stop";
  }
  return prefix + face;
}

export function obstacleSpriteName(type: ObstacleType): string {
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
    case "mushroom":
      return "mushroom";
    case "slalomFlagL":
      return "slalomFlagL";
    case "slalomFlagR":
      return "slalomFlagR";
    case "finish":
      return "finish";
    default:
      return "rock";
  }
}

export function yetiSpriteName(frame: number, eating: boolean): string {
  if (eating) return "yetiEat";
  return frame % 2 === 0 ? "yeti" : "yeti2";
}
