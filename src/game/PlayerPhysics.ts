import type { CharacterType, Direction, Player, Vec2 } from "./types";
import {
  CRASH_MS,
  DIR_ORDER,
  JUMP_MS,
  MOUSE_DIR_THRESHOLDS,
  SNOWBOARD_EDGE_MUL,
  SNOWBOARD_SPEED_MUL,
  TURN_STEP_MS,
  VELOCITY_PX_S,
} from "./originalConstants";

export interface SteerInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  /** Mouse X relative to skier in screen pixels, or null if mouse inactive */
  mouseDx: number | null;
  /** True when left/right was just pressed this frame */
  leftPressed: boolean;
  rightPressed: boolean;
}

let turnCooldown = 0;

function dirIndex(d: Direction): number {
  const i = (DIR_ORDER as readonly string[]).indexOf(d);
  return i < 0 ? 3 : i;
}

function clampDir(i: number): Direction {
  return DIR_ORDER[Math.max(0, Math.min(DIR_ORDER.length - 1, i))] as Direction;
}

/**
 * Map horizontal mouse offset (px from skier) to direction index.
 * Thresholds 1 / 3 / 6 / 12 from SKI.EXE code+0x49AB style ladder.
 */
function dirFromMouseDx(dx: number): number {
  const a = Math.abs(dx);
  let step = 0; // 0 = south, 1 = sEast/sWest, 2 = es/ws, 3 = east/west
  if (a >= MOUSE_DIR_THRESHOLDS[0]) step = 3;
  else if (a >= MOUSE_DIR_THRESHOLDS[1]) step = 2;
  else if (a >= MOUSE_DIR_THRESHOLDS[2]) step = 1;
  else if (a >= MOUSE_DIR_THRESHOLDS[3]) step = 1;
  else step = 0;

  if (dx < 0) return 3 - step; // west side
  if (dx > 0) return 3 + step; // east side
  return 3;
}

function velocityFor(dir: Direction, character: CharacterType): Vec2 {
  if (dir === "stop" || dir === "up") {
    return character === "snowboarder" ? { x: 0, y: 40 } : { x: 0, y: 0 };
  }
  const idx = dirIndex(dir);
  const base = VELOCITY_PX_S[idx] ?? VELOCITY_PX_S[3]!;
  const board = character === "snowboarder";
  const m = board ? SNOWBOARD_SPEED_MUL : 1;
  const side = board ? SNOWBOARD_EDGE_MUL : 1;
  return { x: base.x * side, y: base.y * m };
}

export function createPlayer(character: CharacterType): Player {
  turnCooldown = 0;
  return {
    character,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    dir: "down",
    airborne: 0,
    crashTimer: 0,
    invuln: 0,
  };
}

export function updatePlayer(player: Player, input: SteerInput, dt: number) {
  if (player.crashTimer > 0) {
    player.crashTimer -= dt;
    player.vx *= Math.pow(0.05, dt);
    player.vy *= Math.pow(0.05, dt);
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    if (player.crashTimer <= 0) {
      player.dir = "down";
      player.invuln = 0.4;
    }
    return;
  }

  if (player.invuln > 0) player.invuln -= dt;

  if (player.airborne > 0) {
    player.airborne -= dt;
    if (input.left) player.vx -= 80 * dt;
    if (input.right) player.vx += 80 * dt;
    // slight gravity back to slope speed
    player.vy = Math.max(player.vy, 120);
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    if (player.airborne <= 0) {
      player.dir = clampDir(dirIndex(player.dir === "stop" ? "down" : player.dir));
    }
    return;
  }

  let idx = dirIndex(player.dir === "stop" || player.dir === "up" ? "down" : player.dir);
  const board = player.character === "snowboarder";

  // --- Keyboard has priority over mouse (fixes left/right being eaten by mouse) ---
  const keySteer = input.left || input.right || input.leftPressed || input.rightPressed;

  if (keySteer) {
    // Immediate step on press
    if (input.leftPressed) {
      idx = Math.max(0, idx - 1);
      turnCooldown = TURN_STEP_MS / 1000;
    } else if (input.rightPressed) {
      idx = Math.min(6, idx + 1);
      turnCooldown = TURN_STEP_MS / 1000;
    } else {
      // Hold to keep turning at original-ish cadence
      turnCooldown -= dt;
      if (turnCooldown <= 0) {
        if (input.left) idx = Math.max(0, idx - 1);
        if (input.right) idx = Math.min(6, idx + 1);
        turnCooldown = TURN_STEP_MS / 1000;
      }
    }
  } else if (input.mouseDx !== null) {
    idx = dirFromMouseDx(input.mouseDx);
  }

  // Up = edge toward hard left/right (brake); Down = tuck toward south
  if (input.up && !input.down) {
    if (idx === 3) {
      // Stop / sideslip — snowboarders keep a slow slide
      player.dir = board ? "down" : "stop";
      if (!board) {
        const target = velocityFor("stop", player.character);
        player.vx += (target.x - player.vx) * Math.min(1, 10 * dt);
        player.vy += (target.y - player.vy) * Math.min(1, 10 * dt);
        player.x += player.vx * dt;
        player.y += player.vy * dt;
        return;
      }
      // board: fall through with down at reduced speed below
    } else if (idx < 3) {
      idx = Math.max(0, idx - 1);
    } else {
      idx = Math.min(6, idx + 1);
    }
  } else if (input.down) {
    if (idx < 3) idx++;
    else if (idx > 3) idx--;
  }

  if (player.dir === "stop" && (input.down || input.left || input.right || input.mouseDx !== null)) {
    idx = 3;
  }

  player.dir = clampDir(idx);

  // Snowboarder: never fully stop
  if (board && player.dir === "stop") {
    player.dir = "down";
  }

  const target = velocityFor(player.dir, player.character);
  // Up while already "down" for boarder = scrub speed
  const scrub = board && input.up && !input.down && idx === 3;
  const aim = scrub ? { x: target.x * 0.3, y: target.y * 0.35 } : target;

  const lerp = board ? 12 : 10;
  player.vx += (aim.x - player.vx) * Math.min(1, lerp * dt);
  player.vy += (aim.y - player.vy) * Math.min(1, lerp * dt);

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  const bound = 2000;
  if (player.x < -bound) {
    player.x = -bound;
    player.vx = Math.abs(player.vx) * 0.2;
  }
  if (player.x > bound) {
    player.x = bound;
    player.vx = -Math.abs(player.vx) * 0.2;
  }
}

export function crashPlayer(player: Player, duration = CRASH_MS / 1000) {
  player.crashTimer = duration;
  player.dir = "stop";
  player.vx *= 0.15;
  player.vy *= 0.15;
  player.airborne = 0;
}

export function launchPlayer(player: Player, boost = 1) {
  player.airborne = (JUMP_MS / 1000) * (0.85 + 0.2 * boost);
  player.vy = Math.max(player.vy, 160) * (1 + 0.12 * boost);
  player.dir = "down";
}
