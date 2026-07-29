export type GraphicsMode = "classic" | "3d";
export type CharacterType = "skier" | "snowboarder";
export type GameMode = "slalom" | "freestyle" | "tree";
/** How the player steers during a run */
export type ControlScheme = "keyboard" | "mouse";
export type GameState = "menu" | "playing" | "paused" | "crashed" | "eaten" | "finished";

/** Discrete ski directions (original 7-way + stop/up). */
export type Direction =
  | "stop"
  | "left"
  | "hardLeft"
  | "downLeft"
  | "down"
  | "downRight"
  | "right"
  | "hardRight"
  | "up";

export type ObstacleType =
  | "tree"
  | "smallTree"
  | "deadTree"
  | "rock"
  | "stump"
  | "jump"
  | "mushroom"
  | "slalomFlagL"
  | "slalomFlagR"
  | "finish";

export interface Vec2 {
  x: number;
  y: number;
}

export interface Obstacle {
  id: number;
  type: ObstacleType;
  x: number;
  y: number;
  hw: number;
  hh: number;
  passed?: boolean;
  solid: boolean;
  scale?: number;
}

export interface NPC {
  id: number;
  kind: "skier" | "snowboarder";
  x: number;
  y: number;
  vx: number;
  vy: number;
  dir: Direction;
  color: number;
}

export interface Player {
  character: CharacterType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dir: Direction;
  airborne: number;
  crashTimer: number;
  invuln: number;
}

export interface GameConfig {
  mode: GameMode;
  character: CharacterType;
  graphics: GraphicsMode;
  controls: ControlScheme;
}

export interface GameSnapshot {
  state: GameState;
  player: Player;
  obstacles: Obstacle[];
  npcs: NPC[];
  yeti: {
    active: boolean;
    x: number;
    y: number;
    vx: number;
    vy: number;
    frame: number;
    eating: boolean;
  } | null;
  cameraY: number;
  timeMs: number;
  distance: number;
  style: number;
  speed: number;
  mode: GameMode;
  graphics: GraphicsMode;
  gatesPassed: number;
  gatesTotal: number;
  message: string | null;
  /** For classic mouse cursor drawing */
  mouseX: number | null;
  mouseY: number | null;
}
