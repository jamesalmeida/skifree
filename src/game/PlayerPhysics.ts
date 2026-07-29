import type { CharacterType, Direction, FlipPose, Player, ScootKind, Vec2 } from "./types";
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
  /** Space / click — jump on ground, backflip tick in air */
  jumpPressed: boolean;
  /** ↑ just pressed — backflip tick in air; reverse scoot when stopped */
  upPressed: boolean;
}

let turnCooldown = 0;

const SCOOT_VX = 100;
const SCOOT_VY_UP = -55; // reverse uphill (negative y)
const SCOOT_DURATION = 0.16;
const SCOOT_ANIM = 0.18;

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

function startScoot(player: Player, kind: ScootKind, vx: number, vy: number) {
  player.scootKind = kind;
  player.scootTimer = SCOOT_ANIM;
  player.vx = vx;
  player.vy = vy;
}

function advanceFlip(player: Player) {
  player.flipPresses += 1;
  player.flipPose = (player.flipPresses % 3) as FlipPose;
  if (player.flipPresses > 0 && player.flipPresses % 3 === 0) {
    player.flipsThisAir += 1;
  }
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
    scootTimer: 0,
    scootKind: "none",
  };
}

export function updatePlayer(player: Player, input: SteerInput, dt: number) {
  if (player.scootTimer > 0) {
    player.scootTimer -= dt;
    if (player.scootTimer <= 0) {
      player.scootTimer = 0;
      player.scootKind = "none";
    }
  }

  // ── Crash: ouch → sit ──
  if (player.crashTimer > 0) {
    player.crashTimer -= dt;
    player.vx *= Math.pow(0.05, dt);
    player.vy *= Math.pow(0.05, dt);
    player.x += player.vx * dt;
    player.y += player.vy * dt;

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

  // ── Airborne ──
  if (player.airborne > 0) {
    player.airborne -= dt;

    // OG: always fly straight down once airborne (no air steering for angle)
    player.vx = 0;
    player.vy = Math.max(player.vy, JUMP_SPEED_PX * 0.85);

    // Space/click OR ↑ advances backflip
    if (input.upPressed || input.jumpPressed) {
      advanceFlip(player);
    }

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    if (player.airborne <= 0) {
      const upright = player.flipPose === 0;
      player.airborne = 0;
      if (!upright) {
        crashPlayer(player);
        return;
      }
      player.flipPose = 0;
      player.flipPresses = 0;
      // OG: always land going straight down
      player.dir = "down";
      player.vx = 0;
      const ground = velocityFor("down", player.character);
      player.vy = ground.y;
    }
    return;
  }

  // Ground jump — always launches straight down
  if (input.jumpPressed) {
    launchPlayer(player, player.character === "snowboarder" ? 1.1 : 1);
    return;
  }

  let idx = dirIndex(player.dir === "stop" || player.dir === "up" ? "down" : player.dir);
  const board = player.character === "snowboarder";
  const nearlyStopped = Math.hypot(player.vx, player.vy) < 14;

  // ── Scoots when fully stopped ──
  if (nearlyStopped && player.scootTimer <= 0) {
    // Side scoot at full edge
    if (player.dir === "hardLeft" && input.leftPressed) {
      startScoot(player, "left", -SCOOT_VX, 0);
    } else if (player.dir === "hardRight" && input.rightPressed) {
      startScoot(player, "right", SCOOT_VX, 0);
    }
    // Reverse scoot: stopped (any facing that isn't moving) + ↑
    // Classic: fully edged or braked stop, press up → shuffle back uphill
    else if (
      input.upPressed &&
      (player.dir === "stop" ||
        player.dir === "hardLeft" ||
        player.dir === "hardRight" ||
        (player.dir === "down" && nearlyStopped))
    ) {
      // Prefer keeping hard edge facing if already there; else stop pose
      if (player.dir !== "hardLeft" && player.dir !== "hardRight") {
        player.dir = "stop";
      }
      startScoot(player, "up", 0, SCOOT_VY_UP);
    }
  }

  const keyTurn = input.left || input.right || input.leftPressed || input.rightPressed;
  const keyVertical = input.up || input.down;
  const keyAny = keyTurn || keyVertical;

  if (keyTurn) {
    if (input.leftPressed) {
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

  // Ground ↑: edge toward stop / reverse already handled as scoot when stopped.
  // While moving, ↑ still brakes toward hard edges.
  if (input.up && !input.down && !nearlyStopped) {
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

  if (player.dir === "stop" && player.scootTimer <= 0) {
    if (input.down && !input.left && !input.right) idx = 3;
    else if (keyTurn) {
      /* idx stepped */
    } else if (!keyAny && input.mouseDx !== null) idx = dirFromMouseDx(input.mouseDx);
  }

  // Don't overwrite facing mid-scoot animation
  if (player.scootTimer <= 0) {
    player.dir = clampDir(idx);
    if (board && player.dir === "stop") player.dir = "down";
  }

  const target = velocityFor(player.dir, player.character);
  const scrub = board && input.up && !input.down && dirIndex(player.dir) === 3 && !nearlyStopped;
  const aim = scrub ? { x: target.x * 0.3, y: target.y * 0.35 } : target;
  const edgeStop =
    player.dir === "hardLeft" ||
    player.dir === "hardRight" ||
    player.dir === "stop" ||
    scrub;

  const scooting = player.scootTimer > 0 || player.scootKind !== "none";

  if (scooting && player.scootTimer > 0) {
    // Decay scoot impulse
    player.vx *= Math.exp(-dt / SCOOT_DURATION);
    if (player.scootKind === "up") {
      player.vy *= Math.exp(-dt / SCOOT_DURATION);
    } else {
      player.vy = 0;
    }
    if (Math.abs(player.vx) < 6) player.vx = 0;
    if (Math.abs(player.vy) < 6) player.vy = 0;
  } else if (edgeStop) {
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

  // Soft floor on y so reverse scoot doesn't go above start forever
  // (world grows downward only; y can be slightly negative near start)
  if (player.y < -80) {
    player.y = -80;
    player.vy = Math.max(0, player.vy);
  }

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
  player.scootTimer = 0;
  player.scootKind = "none";
}

/** Always launches straight down the fall line (OG behavior). */
export function launchPlayer(player: Player, boost = 1) {
  if (player.crashTimer > 0) return;
  player.airborne = (JUMP_MS / 1000) * (0.9 + 0.25 * boost);
  player.flipPose = 0;
  player.flipPresses = 0;
  player.flipsThisAir = 0;
  player.scootTimer = 0;
  player.scootKind = "none";

  player.vx = 0;
  player.vy = JUMP_SPEED_PX * boost;
  player.dir = "down";
}
