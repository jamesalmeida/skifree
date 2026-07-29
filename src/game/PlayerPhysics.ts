import type { CharacterType, Direction, Player, Vec2 } from "./types";
import {
  CRASH_MS,
  DIR_ORDER,
  EDGE_FRICTION,
  JUMP_MS,
  JUMP_SPEED_PX,
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
 * Map horizontal mouse offset (screen px from skier) → direction index.
 *
 * Original EXE used thresholds 1 / 3 / 6 / 12 in game pixels. On a modern
 * full-screen canvas those raw values are useless (1px ≠ south), so we scale
 * them relative to a ~640-wide playfield and keep a real center dead-zone for
 * the true south pose.
 */
function dirFromMouseDx(dx: number): number {
  const a = Math.abs(dx);
  const [hard, sharp, mild, dead] = MOUSE_DIR_THRESHOLDS;
  let step = 0; // 0 = south, 1 = sE/sW, 2 = es/ws, 3 = east/west
  if (a >= hard) step = 3;
  else if (a >= sharp) step = 2;
  else if (a >= mild) step = 1;
  else if (a >= dead) step = 1;
  else step = 0;

  if (dx < 0) return 3 - step;
  if (dx > 0) return 3 + step;
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

  // Any keyboard movement key beats the mouse (original is mouse-first, but
  // keyboard must be usable on a wide modern canvas).
  const keyTurn = input.left || input.right || input.leftPressed || input.rightPressed;
  const keyVertical = input.up || input.down;
  const keyAny = keyTurn || keyVertical;

  if (keyTurn) {
    if (input.leftPressed) {
      idx = Math.max(0, idx - 1);
      turnCooldown = TURN_STEP_MS / 1000;
    } else if (input.rightPressed) {
      idx = Math.min(6, idx + 1);
      turnCooldown = TURN_STEP_MS / 1000;
    } else {
      turnCooldown -= dt;
      if (turnCooldown <= 0) {
        if (input.left) idx = Math.max(0, idx - 1);
        if (input.right) idx = Math.min(6, idx + 1);
        turnCooldown = TURN_STEP_MS / 1000;
      }
    }
  } else if (!keyAny && input.mouseDx !== null) {
    idx = dirFromMouseDx(input.mouseDx);
  }

  // ↓ alone (or with no left/right) = tuck straight south immediately.
  // Previously mouse re-applied every frame and only allowed one step toward
  // south, so a cursor slightly off-center left you stuck facing hard right
  // while still sliding downhill.
  if (input.down && !input.left && !input.right) {
    idx = 3;
  } else if (input.down && (input.left || input.right)) {
    // down + side = pull one step toward south
    if (idx < 3) idx++;
    else if (idx > 3) idx--;
  }

  // ↑ = brake / edge out toward hard left/right (or stop when already south)
  if (input.up && !input.down) {
    if (idx === 3) {
      player.dir = board ? "down" : "stop";
      if (!board) {
        const target = velocityFor("stop", player.character);
        player.vx += (target.x - player.vx) * Math.min(1, 10 * dt);
        player.vy += (target.y - player.vy) * Math.min(1, 10 * dt);
        player.x += player.vx * dt;
        player.y += player.vy * dt;
        return;
      }
    } else if (idx < 3) {
      idx = Math.max(0, idx - 1);
    } else {
      idx = Math.min(6, idx + 1);
    }
  }

  // Leave stop when player commits to a direction
  if (player.dir === "stop") {
    if (input.down && !input.left && !input.right) idx = 3;
    else if (keyTurn) {
      /* idx already stepped above */
    } else if (!keyAny && input.mouseDx !== null) idx = dirFromMouseDx(input.mouseDx);
  }

  player.dir = clampDir(idx);

  if (board && player.dir === "stop") {
    player.dir = "down";
  }

  // Active ski dirs: snap to the discrete speed table (original feel).
  // Full edge (west/east) and brake: keep leftover momentum and bleed it
  // off with friction so you coast a bit then settle — not an instant halt.
  const target = velocityFor(player.dir, player.character);
  const scrub = board && input.up && !input.down && dirIndex(player.dir) === 3;
  const aim = scrub ? { x: target.x * 0.3, y: target.y * 0.35 } : target;
  const edgeStop =
    player.dir === "hardLeft" ||
    player.dir === "hardRight" ||
    player.dir === "stop" ||
    scrub;

  if (edgeStop) {
    // Exponential decay toward zero (and any tiny aim if scrubbing)
    const k = 1 - Math.exp(-EDGE_FRICTION * dt);
    player.vx += (aim.x - player.vx) * k;
    player.vy += (aim.y - player.vy) * k;
    if (Math.abs(player.vx) < 1.5) player.vx = 0;
    if (Math.abs(player.vy) < 1.5) player.vy = 0;
  } else {
    player.vx = aim.x;
    player.vy = aim.y;
  }

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
  // Classic: jumping straight boosts to ~26–27 m/s (tunable JUMP_SPEED_PX)
  const target = JUMP_SPEED_PX * boost;
  const mag = Math.hypot(player.vx, player.vy);
  if (mag < 8 || player.dir === "down" || Math.abs(player.vx) < player.vy * 0.25) {
    // Mostly tucking — pure downhill boost
    player.vx = 0;
    player.vy = target;
    player.dir = "down";
  } else {
    // Keep carve direction, scale up to jump speed
    const s = target / mag;
    player.vx *= s;
    player.vy *= s;
  }
}
