/**
 * Original SKI.EXE bitmaps with a facing map built from visual audit + playtest.
 *
 * Clear profiles from the extract:
 *   #4  = hard west (profile facing left)
 *   #6  = esEast (intermediate right) — confirmed correct in playtest
 *   #8  = sWest (downhill-left)
 *   #9  = sEast (downhill-right)
 *   #5  = narrow frame, best “down the slope” / south candidate (16×32)
 *   #11 = jump
 *
 * Missing mirrors are created by flipping #4 / #6 so left/right are true mirrors.
 */
import type { CharacterType, Direction, ObstacleType } from "../game/types";

/** Source PNG under public/original-sprites/ */
const RAW: Record<string, { file: string; flip?: boolean }> = {
  // --- skier ---
  // hard left: definitive west profile (skis horizontal, face left)
  skier_hardLeft: { file: "004_skier_east.png" }, // filename is legacy
  // intermediate left (wsWest)
  skier_left: { file: "010_skier_south_alt.png" },
  // downhill-left (sWest)
  skier_downLeft: { file: "008_skier_sEast.png" }, // filename is legacy; art faces left
  // south — only narrow frame; closest to “down the mountain”
  skier_down: { file: "005_skier_wsWest.png" },
  // downhill-right (sEast)
  skier_downRight: { file: "009_skier_south.png" }, // filename is legacy; art faces right
  // intermediate right (esEast) — confirmed correct in playtest
  skier_right: { file: "006_skier_esEast.png" },
  // hard right = mirror of hard-left west profile
  skier_hardRight: { file: "004_skier_east.png", flip: true },
  skier_stop: { file: "004_skier_east.png" },
  skier_jump: { file: "011_skier_jump.png" },
  skier_ouch: { file: "012_skier_ouch.png" },
  skier_crash: { file: "013_skier_sit_l.png" },

  // --- snowboarder (limited frames; flip for left side) ---
  board_hardLeft: { file: "029_snowboarder_sw.png" },
  board_left: { file: "029_snowboarder_sw.png" },
  board_downLeft: { file: "029_snowboarder_sw.png" },
  board_down: { file: "030_snowboarder_s.png" },
  board_downRight: { file: "028_snowboarder_se.png" },
  board_right: { file: "028_snowboarder_se.png" },
  board_hardRight: { file: "028_snowboarder_se.png" },
  board_stop: { file: "030_snowboarder_s.png" },
  board_jump: { file: "030_snowboarder_s.png" },
  board_ouch: { file: "012_skier_ouch.png" },
  board_crash: { file: "013_skier_sit_l.png" },

  // --- world ---
  tree: { file: "051_tree_tall.png" },
  smallTree: { file: "049_tree_med.png" },
  deadTree: { file: "050_tree_dead.png" },
  rock: { file: "033_rock_a.png" },
  stump: { file: "035_stump_a.png" },
  jump: { file: "052_rainbow_ramp.png" },
  mushroom: { file: "036_stump_b.png" },
  slalomFlagL: { file: "023_flag_red.png" },
  slalomFlagR: { file: "026_marker_red.png" },
  finish: { file: "059_sign_finish_l.png" },
  yeti: { file: "069_yeti_run1.png" },
  yeti2: { file: "070_yeti_run2.png" },
  yetiEat: { file: "076_yeti_eat3.png" },
  npc_skier: { file: "039_skier_blue_a.png" },
  npc_board: { file: "028_snowboarder_se.png" },
  logo: { file: "053_logo.png" },
  cursor: { file: "086_cursor.png" },
  dog: { file: "031_dog_a.png" },
};

const cache = new Map<string, HTMLCanvasElement | HTMLImageElement>();
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

function flipHorizontal(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(c.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0);
  return c;
}

export async function preloadOriginalSprites(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const base = `${import.meta.env.BASE_URL}original-sprites/`;
    // Load unique files once
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
      cache.set(key, spec.flip ? flipHorizontal(img) : img);
    }
  })();
  return loadPromise;
}

export function getOriginalSprite(key: string): HTMLCanvasElement | HTMLImageElement | null {
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
