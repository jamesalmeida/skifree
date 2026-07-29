/**
 * Procedural classic-style pixel sprites inspired by SkiFree (not ripped assets).
 * Drawn at native pixel size then scaled up in the classic renderer.
 */

export type SpriteKey =
  | "skier_down"
  | "skier_downLeft"
  | "skier_downRight"
  | "skier_left"
  | "skier_right"
  | "skier_hardLeft"
  | "skier_hardRight"
  | "skier_stop"
  | "skier_crash"
  | "board_down"
  | "board_downLeft"
  | "board_downRight"
  | "board_left"
  | "board_right"
  | "board_hardLeft"
  | "board_hardRight"
  | "board_stop"
  | "board_crash"
  | "tree"
  | "smallTree"
  | "deadTree"
  | "rock"
  | "stump"
  | "jump"
  | "mushroom"
  | "flagL"
  | "flagR"
  | "finish"
  | "yeti"
  | "npc_skier"
  | "npc_board";

type P = string; // CSS color or "" for empty

const T = ""; // transparent
const K = "#1a1a1a"; // outline
const S = "#c41e3a"; // ski red jacket
const Pnk = "#f1c27d"; // skin
const Bl = "#1e3a8a"; // pants blue
const W = "#f8fafc"; // white
const G = "#166534"; // tree green
const Gd = "#14532d";
const Br = "#78350f"; // brown trunk
const Gy = "#64748b"; // rock
const Rd = "#dc2626"; // flag
const Yw = "#facc15";
const Bd = "#0f766e"; // snowboard teal
const Bd2 = "#134e4a";
const Yet = "#e2e8f0";
const YetF = "#94a3b8";

function canvasFromGrid(grid: P[][], scale = 1): HTMLCanvasElement {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const c = document.createElement("canvas");
  c.width = w * scale;
  c.height = h * scale;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const col = grid[y]![x]!;
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return c;
}

function flipH(grid: P[][]): P[][] {
  return grid.map((row) => [...row].reverse());
}

/** Skier facing down */
const skierDown: P[][] = [
  [T, T, T, K, K, T, T, T],
  [T, T, K, S, S, K, T, T],
  [T, T, K, Pnk, Pnk, K, T, T],
  [T, T, K, S, S, K, T, T],
  [T, T, K, Bl, Bl, K, T, T],
  [T, K, K, Bl, Bl, K, K, T],
  [K, Gy, T, K, K, T, Gy, K],
  [K, Gy, T, T, T, T, Gy, K],
];

const skierDownLeft: P[][] = [
  [T, T, K, K, T, T, T, T],
  [T, K, S, S, K, T, T, T],
  [T, K, Pnk, S, K, T, T, T],
  [T, T, K, Bl, K, T, T, T],
  [T, K, Bl, Bl, K, K, T, T],
  [K, Gy, K, T, T, Gy, K, T],
  [K, Gy, T, T, T, T, T, T],
  [T, T, T, T, T, T, T, T],
];

const skierLeft: P[][] = [
  [T, T, T, K, K, T, T, T],
  [T, T, K, S, S, K, T, T],
  [T, T, K, Pnk, S, K, T, T],
  [T, K, Bl, Bl, K, T, T, T],
  [K, Gy, K, Bl, K, T, T, T],
  [K, Gy, T, K, T, T, T, T],
  [T, T, T, T, T, T, T, T],
  [T, T, T, T, T, T, T, T],
];

const skierHardLeft: P[][] = [
  [T, T, T, K, K, T, T],
  [T, T, K, S, S, K, T],
  [T, T, K, Pnk, K, T, T],
  [T, K, Bl, Bl, K, T, T],
  [K, Gy, K, K, T, T, T],
  [K, Gy, T, T, T, T, T],
  [T, T, T, T, T, T, T],
];

const skierCrash: P[][] = [
  [T, T, T, T, T, T, T, T],
  [T, T, K, S, T, T, T, T],
  [T, K, Pnk, S, K, T, Gy, K],
  [T, K, Bl, Bl, K, T, Gy, K],
  [T, T, K, K, T, T, T, T],
  [T, T, T, T, T, T, T, T],
];

const boardDown: P[][] = [
  [T, T, T, K, K, T, T, T],
  [T, T, K, Bd, Bd, K, T, T],
  [T, T, K, Pnk, Pnk, K, T, T],
  [T, T, K, Bd, Bd, K, T, T],
  [T, T, K, Bl, Bl, K, T, T],
  [T, T, Bd2, Bd2, Bd2, Bd2, T, T],
  [T, K, Bd, Bd, Bd, Bd, K, T],
  [T, T, K, K, K, K, T, T],
];

const boardDownLeft: P[][] = [
  [T, T, K, K, T, T, T, T],
  [T, K, Bd, Bd, K, T, T, T],
  [T, K, Pnk, Bd, K, T, T, T],
  [T, T, K, Bl, K, T, T, T],
  [T, K, Bd2, Bd2, Bd, K, T, T],
  [K, Bd, Bd, Bd, K, T, T, T],
  [T, K, K, T, T, T, T, T],
  [T, T, T, T, T, T, T, T],
];

const boardLeft: P[][] = [
  [T, T, K, K, T, T, T],
  [T, K, Bd, Bd, K, T, T],
  [T, K, Pnk, Bd, K, T, T],
  [T, K, Bl, K, T, T, T],
  [K, Bd, Bd2, Bd, K, T, T],
  [K, Bd, Bd, K, T, T, T],
  [T, K, K, T, T, T, T],
];

const tree: P[][] = [
  [T, T, T, G, G, T, T, T],
  [T, T, G, G, G, G, T, T],
  [T, G, G, Gd, G, G, G, T],
  [G, G, Gd, G, G, Gd, G, G],
  [T, G, G, G, G, G, G, T],
  [T, T, G, Br, Br, G, T, T],
  [T, T, T, Br, Br, T, T, T],
  [T, T, T, Br, Br, T, T, T],
];

const smallTree: P[][] = [
  [T, T, G, G, T, T],
  [T, G, G, Gd, G, T],
  [G, G, Gd, G, G, G],
  [T, G, Br, Br, G, T],
  [T, T, Br, Br, T, T],
];

const deadTree: P[][] = [
  [T, T, K, T, K, T, T],
  [T, T, T, Br, T, T, T],
  [T, K, T, Br, T, K, T],
  [T, T, Br, Br, Br, T, T],
  [T, T, T, Br, T, T, T],
  [T, T, T, Br, T, T, T],
];

const rock: P[][] = [
  [T, T, Gy, Gy, Gy, T, T],
  [T, Gy, W, Gy, Gy, Gy, T],
  [Gy, Gy, Gy, Gy, K, Gy, Gy],
  [T, Gy, Gy, Gy, Gy, Gy, T],
];

const stump: P[][] = [
  [T, Br, Br, Br, T],
  [Br, Yw, Br, Yw, Br],
  [T, Br, Br, Br, T],
];

const jump: P[][] = [
  [T, T, T, T, T, T, T, T, T, T],
  [T, T, T, Gy, Gy, Gy, Gy, T, T, T],
  [T, Gy, Gy, Gy, Gy, Gy, Gy, Gy, Gy, T],
  [Gy, Gy, Gy, Gy, Gy, Gy, Gy, Gy, Gy, Gy],
];

const mushroom: P[][] = [
  [T, Rd, Rd, Rd, T],
  [Rd, W, Rd, W, Rd],
  [Rd, Rd, Rd, Rd, Rd],
  [T, T, W, T, T],
  [T, T, W, T, T],
];

const flagL: P[][] = [
  [K, T, T, T, T],
  [K, Rd, Rd, Rd, T],
  [K, Rd, Rd, T, T],
  [K, T, T, T, T],
  [K, T, T, T, T],
  [K, T, T, T, T],
];

const flagR: P[][] = [
  [T, T, T, T, K],
  [T, Rd, Rd, Rd, K],
  [T, T, Rd, Rd, K],
  [T, T, T, T, K],
  [T, T, T, T, K],
  [T, T, T, T, K],
];

const finish: P[][] = [
  [K, W, K, W, K, W, K, W, K, W, K, W, K, W, K, W],
  [W, K, W, K, W, K, W, K, W, K, W, K, W, K, W, K],
  [K, W, K, W, K, W, K, W, K, W, K, W, K, W, K, W],
];

const yeti: P[][] = [
  [T, T, YetF, Yet, Yet, YetF, T, T],
  [T, Yet, Yet, Yet, Yet, Yet, Yet, T],
  [Yet, Yet, K, Yet, Yet, K, Yet, Yet],
  [Yet, Yet, Yet, Rd, Rd, Yet, Yet, Yet],
  [T, Yet, Yet, Yet, Yet, Yet, Yet, T],
  [T, YetF, Yet, Yet, Yet, Yet, YetF, T],
  [T, T, Yet, T, T, Yet, T, T],
  [T, YetF, YetF, T, T, YetF, YetF, T],
];

const cache = new Map<string, HTMLCanvasElement>();

function get(key: string, grid: P[][]): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) {
    c = canvasFromGrid(grid, 1);
    cache.set(key, c);
  }
  return c;
}

export function getSprite(key: SpriteKey): HTMLCanvasElement {
  switch (key) {
    case "skier_down":
      return get(key, skierDown);
    case "skier_downLeft":
      return get(key, skierDownLeft);
    case "skier_downRight":
      return get(key, flipH(skierDownLeft));
    case "skier_left":
      return get(key, skierLeft);
    case "skier_right":
      return get(key, flipH(skierLeft));
    case "skier_hardLeft":
      return get(key, skierHardLeft);
    case "skier_hardRight":
      return get(key, flipH(skierHardLeft));
    case "skier_stop":
      return get(key, skierDown);
    case "skier_crash":
      return get(key, skierCrash);
    case "board_down":
      return get(key, boardDown);
    case "board_downLeft":
      return get(key, boardDownLeft);
    case "board_downRight":
      return get(key, flipH(boardDownLeft));
    case "board_left":
      return get(key, boardLeft);
    case "board_right":
      return get(key, flipH(boardLeft));
    case "board_hardLeft":
      return get(key, boardLeft);
    case "board_hardRight":
      return get(key, flipH(boardLeft));
    case "board_stop":
      return get(key, boardDown);
    case "board_crash":
      return get(key, skierCrash);
    case "tree":
      return get(key, tree);
    case "smallTree":
      return get(key, smallTree);
    case "deadTree":
      return get(key, deadTree);
    case "rock":
      return get(key, rock);
    case "stump":
      return get(key, stump);
    case "jump":
      return get(key, jump);
    case "mushroom":
      return get(key, mushroom);
    case "flagL":
      return get(key, flagL);
    case "flagR":
      return get(key, flagR);
    case "finish":
      return get(key, finish);
    case "yeti":
      return get(key, yeti);
    case "npc_skier":
      return get(key, skierDown);
    case "npc_board":
      return get(key, boardDown);
  }
}

export function playerSpriteKey(
  character: "skier" | "snowboarder",
  dir: string,
  crashed: boolean,
): SpriteKey {
  if (crashed) return character === "snowboarder" ? "board_crash" : "skier_crash";
  const prefix = character === "snowboarder" ? "board_" : "skier_";
  const map: Record<string, string> = {
    down: "down",
    downLeft: "downLeft",
    downRight: "downRight",
    left: "left",
    right: "right",
    hardLeft: "hardLeft",
    hardRight: "hardRight",
    stop: "stop",
    up: "stop",
  };
  return (prefix + (map[dir] ?? "down")) as SpriteKey;
}

export function obstacleSpriteKey(type: string): SpriteKey {
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
      return "flagL";
    case "slalomFlagR":
      return "flagR";
    case "finish":
      return "finish";
    default:
      return "rock";
  }
}
