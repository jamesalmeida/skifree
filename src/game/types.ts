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
  | "slalomFlagL"
  | "slalomFlagR"
  | "finish"
  /** Soft powder mounds that slow you (EXE #27 “cloud”) */
  | "slowSnow"
  /** Ski lift scenery */
  | "liftPole"
  | "liftEmpty"
  | "liftPerson"
  | "liftPair";

/** Crash animation: buried under snow → sit up */
export type CrashPhase = "none" | "ouch" | "sit";

/** Air trick pose: 0 = upright/jumping, 1–2 = backflip frames */
export type FlipPose = 0 | 1 | 2;

export interface Vec2 {
  x: number;
  y: number;
}

/** Slalom gate color (alternating red / blue). */
export type GateColor = "red" | "blue";

export interface Obstacle {
  id: number;
  type: ObstacleType;
  x: number;
  y: number;
  hw: number;
  hh: number;
  /** Gate/finish resolved (passed correctly or missed) */
  passed?: boolean;
  solid: boolean;
  scale?: number;
  /** Dead tree ignited by jumping over it */
  onFire?: boolean;
  fireFrame?: number;
  fireT?: number;
  /** Slalom: red (←) or blue (→) single marker */
  gateColor?: GateColor;
  /** Slalom: which gate number (0-based) */
  gateIndex?: number;
  /** True if this gate was missed / wrong side */
  gateMissed?: boolean;
}

export interface NPC {
  id: number;
  /** skier/snowboarder = fast background; beginner = slow snowplow; dog = cross-slope */
  kind: "skier" | "snowboarder" | "beginner" | "dog";
  x: number;
  y: number;
  vx: number;
  vy: number;
  dir: Direction;
  color: number;
  /** dog: walking across | paused woof | peeing */
  dogState?: "walk" | "woof" | "pee";
  dogTimer?: number;
  dogFrame?: number;
}

/** Brief shuffle animation after edge / reverse scoot */
export type ScootKind = "none" | "left" | "right" | "up";

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
  /** Backflip animation frame while airborne */
  flipPose: FlipPose;
  /** Total flip-button presses while in this air time (3 = full flip) */
  flipPresses: number;
  crashPhase: CrashPhase;
  /** Completed backflips this air (for style / double-flip) */
  flipsThisAir: number;
  /** >0 while playing scoot shuffle animation */
  scootTimer: number;
  scootKind: ScootKind;
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
    /** After swallow — loops joy hop forever */
    celebrating: boolean;
  } | null;
  cameraX: number;
  cameraY: number;
  /** Attract-mode / yeti eat — don't draw the player avatar */
  hidePlayer: boolean;
  timeMs: number;
  distance: number;
  style: number;
  speed: number;
  mode: GameMode;
  graphics: GraphicsMode;
  gatesPassed: number;
  gatesMissed: number;
  gatesTotal: number;
  /** Cumulative +5s penalties from missed gates (ms) */
  penaltyMs: number;
  message: string | null;
  mouseX: number | null;
  mouseY: number | null;
  /** OG F turbo: 1 normal, 2 fast */
  timeScale: number;
}
