import type { CharacterType, Direction, FlipPose, Player, Vec2 } from "./types";
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
  mouseDx: number | null;
  leftPressed: boolean;
  rightPressed: boolean;
  /** Space / mouse click — jump (ground) or unused in air */
  jumpPressed: boolean;
  /** Arrow up just pressed — backflip tick while airborne */
  upPressed: boolean;
}

let turnCooldown = 0;

/** Sideways scoot impulse when already fully edged and press again (px/s burst). */
const SCOOT_VX = 95;
const SCOOT_DURATION = 0.14;

function dirIndex(d: Direction): number {
  const i = (DIR_ORDER as readonly string[]).indexOf(d);
  return i < 0 ? 3 : i;
}

function clampDir(i: number): Direction {
  return DIR_ORDER[Math.max(0, Math.min(DIR_ORDER.length - 1, i))] as Direction;
}

function dirFromMouseDx(dx: number): number {
  const a = Math.abs(dx);
  const [hard, sharp, mild, dead] = MOUSE_DIR_THRESHOLDS;
  let step = 0;
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
    flipPose: 0,
    flipPresses: 0,
    crashPhase: "none",
    flipsThisAir: 0,
  };
}

export function updatePlayer(player: Player, input: SteerInput, dt: number) {
  // ── Crash: ouch (buried) → sit ──
  if (player.crashTimer > 0) {
    player.crashTimer -= dt;
    player.vx *= Math.pow(0.05, dt);
    player.vy *= Math.pow(0.05, dt);
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    // First ~45% of crash = ouch (under snow), rest = sit
    const total = CRASH_MS / 1000;
    const elapsed = total - player.crashTimer;
    player.crashPhase = elapsed < total * 0.42 ? "ouch" : "sit";

    if (player.crashTimer <= 0) {
      player.crashPhase = "none";
      player.dir = "down";
      player.invuln = 0.45;
      player.flipPose = 0;
      player.flipPresses = 0;
    }
    return;
  }

  if (player.invuln > 0) player.invuln -= dt;

  // ── Airborne: steer a little, backflips on ↑, land check ──
  if (player.airborne > 0) {
    player.airborne -= dt;

    // Light air steering
    if (input.left) player.vx -= 90 * dt;
    if (input.right) player.vx += 90 * dt;

    // Each ↑ press advances backflip pose (3 presses = full flip)
    if (input.upPressed) {
      player.flipPresses += 1;
      player.flipPose = (player.flipPresses % 3) as FlipPose;
      if (player.flipPresses > 0 && player.flipPresses % 3 === 0) {
        player.flipsThisAir += 1;
      }
    }

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    if (player.airborne <= 0) {
      // Landing: must be upright (flipPose 0) or crash
      const upright = player.flipPose === 0;
      player.airborne = 0;
      if (!upright) {
        crashPlayer(player);
        return;
      }
      // Style for completed flips
      player.flipPose = 0;
      player.flipPresses = 0;
      // Restore ground dir from velocity
      if (Math.abs(player.vx) < 20) player.dir = "down";
      else if (player.vx < 0) player.dir = "downLeft";
      else player.dir = "downRight";
    }
    return;
  }

  // Ground jump (space / click) — free hop; ramps also call launchPlayer
  if (input.jumpPressed && player.airborne <= 0) {
    launchPlayer(player, player.character === "snowboarder" ? 1.1 : 1);
    return;
  }

  let idx = dirIndex(player.dir === "stop" || player.dir === "up" ? "down" : player.dir);
  const board = player.character === "snowboarder";
  const nearlyStopped = Math.hypot(player.vx, player.vy) < 12;

  // Edge scoot: fully west/east, stopped, press same side again → nudge
  if (nearlyStopped && player.dir === "hardLeft" && input.leftPressed) {
    player.vx = -SCOOT_VX;
    player.vy = 0;
    // brief scoot handled by velocity this frame + friction next frames
  } else if (nearlyStopped && player.dir === "hardRight" && input.rightPressed) {
    player.vx = SCOOT_VX;
    player.vy = 0;
  }

  const keyTurn = input.left || input.right || input.leftPressed || input.rightPressed;
  const keyVertical = input.up || input.down;
  const keyAny = keyTurn || keyVertical;

  if (keyTurn) {
    if (input.leftPressed) {
      // Don't step past hardLeft — scoot handled above
      if (idx > 0) {
        idx = Math.max(0, idx - 1);
        turnCooldown = TURN_STEP_MS / 1000;
      }
    } else if (input.rightPressed) {
      if (idx < 6) {
        idx = Math.min(6, idx + 1);
        turnCooldown = TURN_STEP_MS / 1000;
      }
    } else {
      turnCooldown -= dt;
      if (turnCooldown <= 0) {
        if (input.left && idx > 0) idx = Math.max(0, idx - 1);
        if (input.right && idx < 6) idx = Math.min(6, idx + 1);
        turnCooldown = TURN_STEP_MS / 1000;
      }
    }
  } else if (!keyAny && input.mouseDx !== null) {
    idx = dirFromMouseDx(input.mouseDx);
  }

  if (input.down && !input.left && !input.right) {
    idx = 3;
  } else if (input.down && (input.left || input.right)) {
    if (idx < 3) idx++;
    else if (idx > 3) idx--;
  }

  if (input.up && !input.down) {
    if (idx === 3) {
      player.dir = board ? "down" : "stop";
      if (!board) {
        const target = velocityFor("stop", player.character);
        const k = 1 - Math.exp(-EDGE_FRICTION * dt);
        player.vx += (target.x - player.vx) * k;
        player.vy += (target.y - player.vy) * k;
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

  if (player.dir === "stop") {
    if (input.down && !input.left && !input.right) idx = 3;
    else if (keyTurn) {
      /* idx already stepped */
    } else if (!keyAny && input.mouseDx !== null) idx = dirFromMouseDx(input.mouseDx);
  }

  player.dir = clampDir(idx);

  if (board && player.dir === "stop") {
    player.dir = "down";
  }

  const target = velocityFor(player.dir, player.character);
  const scrub = board && input.up && !input.down && dirIndex(player.dir) === 3;
  const aim = scrub ? { x: target.x * 0.3, y: target.y * 0.35 } : target;
  const edgeStop =
    player.dir === "hardLeft" ||
    player.dir === "hardRight" ||
    player.dir === "stop" ||
    scrub;

  // Scoot burst: don't immediately kill sideways nudge
  const scooting =
    (player.dir === "hardLeft" || player.dir === "hardRight") &&
    Math.abs(player.vx) > 20 &&
    Math.abs(player.vy) < 8;

  if (edgeStop && !scooting) {
    const k = 1 - Math.exp(-EDGE_FRICTION * dt);
    player.vx += (aim.x - player.vx) * k;
    player.vy += (aim.y - player.vy) * k;
    if (Math.abs(player.vx) < 1.5) player.vx = 0;
    if (Math.abs(player.vy) < 1.5) player.vy = 0;
  } else if (scooting) {
    // Friction on scoot so it dies after a short hop
    player.vx *= Math.exp(-dt / SCOOT_DURATION);
    player.vy = 0;
    if (Math.abs(player.vx) < 8) player.vx = 0;
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
  player.crashPhase = "ouch";
  player.dir = "stop";
  player.vx *= 0.15;
  player.vy *= 0.15;
  player.airborne = 0;
  player.flipPose = 0;
  player.flipPresses = 0;
  player.flipsThisAir = 0;
}

export function launchPlayer(player: Player, boost = 1) {
  if (player.crashTimer > 0) return;
  player.airborne = (JUMP_MS / 1000) * (0.85 + 0.25 * boost);
  player.flipPose = 0;
  player.flipPresses = 0;
  player.flipsThisAir = 0;

  const target = JUMP_SPEED_PX * boost;
  const mag = Math.hypot(player.vx, player.vy);
  if (mag < 8 || player.dir === "down" || Math.abs(player.vx) < player.vy * 0.25) {
    player.vx = 0;
    player.vy = target;
    player.dir = "down";
  } else {
    const s = target / mag;
    player.vx *= s;
    player.vy *= s;
  }
}
