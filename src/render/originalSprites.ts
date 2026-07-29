/**
 * Loads bitmaps extracted from SKI.EXE (tools/extract_sprites.py).
 * Served from /public/original-sprites/ (copied from assets/).
 */
import type { CharacterType, Direction, ObstacleType } from "../game/types";

/**
 * Skier bitmaps re-identified from visual audit of SKI.EXE resources:
 *   #3 = east (skis point right)   #4 = west (skis point left)
 *   #5 = wsWest   #6 = esEast
 *   #7 = sWest    #8 = sEast
 *   #9 = south (back view, skis vertical — the true “straight down” pose)
 *   #10 = south alt (near-south lean)   #11 = jump
 * Earlier labels had west/east swapped and used the wrong frame for south.
 */
const FILES: Record<string, string> = {
  skier_hardLeft: "004_skier_east.png", // file name is legacy; art faces west
  skier_left: "005_skier_wsWest.png",
  skier_downLeft: "007_skier_sWest.png",
  skier_down: "009_skier_south.png",
  skier_downRight: "008_skier_sEast.png",
  skier_right: "006_skier_esEast.png",
  skier_hardRight: "003_skier_west.png", // file name is legacy; art faces east
  skier_stop: "004_skier_east.png", // stopped = hard edge (west), classic feel
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

export function playerSpriteName(
  character: CharacterType,
  dir: Direction,
  opts: { crashed?: boolean; airborne?: boolean; ouch?: boolean } = {},
): string {
  const prefix = character === "snowboarder" ? "board_" : "skier_";
  if (opts.crashed) return prefix + "crash";
  if (opts.ouch) return prefix + "ouch";
  if (opts.airborne) return prefix + "jump";
  if (dir === "up" || dir === "stop") {
    return character === "snowboarder" ? "board_stop" : "skier_stop";
  }
  return prefix + dir;
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
