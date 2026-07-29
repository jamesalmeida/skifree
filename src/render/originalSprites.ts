/**
 * Player skier frames from the classic labeled sprite sheet
 * (same original SkiFree art; crops from spriters-resource / skifree.js).
 *
 * EXE resource bitmaps were hard to map (wrong IDs kept getting assigned to
 * south). Labeled crops are unambiguous:
 *   west / wsWest / sWest / south / sEast / esEast / east / jumping / ouch / hit
 *
 * World objects still use bitmaps extracted from SKI.EXE.
 */
import type { CharacterType, Direction, ObstacleType } from "../game/types";

const RAW: Record<string, { file: string; flip?: boolean }> = {
  // --- skier (labeled original art) ---
  skier_hardLeft: { file: "labeled_west.png" },
  skier_left: { file: "labeled_wsWest.png" },
  skier_downLeft: { file: "labeled_sWest.png" },
  skier_down: { file: "labeled_south.png" },
  skier_downRight: { file: "labeled_sEast.png" },
  skier_right: { file: "labeled_esEast.png" },
  skier_hardRight: { file: "labeled_east.png" },
  skier_stop: { file: "labeled_west.png" },
  skier_jump: { file: "labeled_jumping.png" },
  skier_flip1: { file: "labeled_somersault1.png" },
  skier_flip2: { file: "labeled_somersault2.png" },
  skier_ouch: { file: "labeled_ouch.png" }, // buried under snow, ski up
  skier_crash: { file: "labeled_hit.png" }, // sit up in snow

  // --- snowboarder (classic magenta rider + yellow board) ---
  board_hardLeft: { file: "board_sEast.png", flip: true },
  board_left: { file: "board_sWest.png" },
  board_downLeft: { file: "board_sWest.png" },
  board_down: { file: "board_south.png" },
  board_downRight: { file: "board_sEast.png" },
  board_right: { file: "board_sEast.png" },
  board_hardRight: { file: "board_sWest.png", flip: true },
  board_stop: { file: "board_south.png" },
  board_jump: { file: "board_air.png" },
  board_flip1: { file: "board_carve.png" },
  board_flip2: { file: "board_air.png" },
  board_ouch: { file: "board_sit.png" },
  board_crash: { file: "board_sit.png" },

  // --- world (EXE extract) ---
  tree: { file: "051_tree_tall.png" },
  smallTree: { file: "049_tree_med.png" },
  deadTree: { file: "050_tree_dead.png" },
  rock: { file: "rock_bump.png" }, // was mislabeled dog; use snow bump
  stump: { file: "035_stump_a.png" },
  jump: { file: "052_rainbow_ramp.png" },
  mushroom: { file: "036_stump_b.png" },
  slalomFlagL: { file: "023_flag_red.png" },
  slalomFlagR: { file: "026_marker_red.png" },
  finish: { file: "059_sign_finish_l.png" },
  // Classic abominable snow monster (sheet crops — gray body, arms up)
  yeti: { file: "yeti_sEast1.png" },
  yeti2: { file: "yeti_sEast2.png" },
  yeti3: { file: "yeti_sWest1.png" },
  yeti4: { file: "yeti_sWest2.png" },
  yetiEat: { file: "yeti_eating1.png" },
  yetiEat2: { file: "yeti_eating3.png" },
  npc_skier: { file: "039_skier_blue_a.png" },
  npc_board: { file: "board_sEast.png" },
  // Pink snowplow beginners (EXE #31/#32 were mislabeled “dog”)
  beginner: { file: "beginner_a.png" },
  beginner2: { file: "beginner_b.png" },
  logo: { file: "053_logo.png" },
  cursor: { file: "086_cursor.png" },
  // Real gray dogs (EXE #33/#34 were mislabeled “rock”)
  dog: { file: "dog_a.png" },
  dog2: { file: "dog_b.png" },
  fire0: { file: "083_fire_a.png" },
  fire1: { file: "084_fire_b.png" },
  fire2: { file: "085_fire_c.png" },
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
  opts: {
    crashPhase?: "none" | "ouch" | "sit";
    airborne?: boolean;
    flipPose?: 0 | 1 | 2;
    scootKind?: "none" | "left" | "right" | "up";
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
  if (eating) return frame % 2 === 0 ? "yetiEat" : "yetiEat2";
  const run = ["yeti", "yeti2", "yeti3", "yeti4"] as const;
  return run[frame % 4]!;
}
