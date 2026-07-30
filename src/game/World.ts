import type { GameMode, GateColor, Obstacle, ObstacleType, NPC } from "./types";

let nextId = 1;
const id = () => nextId++;

function sizeFor(type: ObstacleType): { hw: number; hh: number; solid: boolean } {
  switch (type) {
    case "tree":
      return { hw: 10, hh: 10, solid: true };
    case "smallTree":
      return { hw: 9, hh: 8, solid: true };
    case "deadTree":
      return { hw: 7, hh: 8, solid: true };
    case "rock":
      return { hw: 9, hh: 5, solid: true };
    case "stump":
      // #46 olive shrub/stump — a bit wider than a rock
      return { hw: 9, hh: 7, solid: true };
    case "jump":
      return { hw: 14, hh: 5, solid: false };
    case "slowSnow":
      // Wide soft powder (EXE #27 is 64×32) — not solid, slows while overlapping
      return { hw: 36, hh: 16, solid: false };
    case "slalomFlagL":
    case "slalomFlagR":
      return { hw: 6, hh: 5, solid: false };
    case "finish":
      return { hw: 48, hh: 10, solid: false };
    case "liftPole":
      return { hw: 8, hh: 28, solid: false };
    case "liftEmpty":
    case "liftPerson":
    case "liftPair":
      return { hw: 12, hh: 14, solid: false };
  }
}

/** Fixed x of the scenic ski lift corridor (world space). */
export const LIFT_X = -520;

function make(
  type: ObstacleType,
  x: number,
  y: number,
  extra: Partial<Obstacle> = {},
): Obstacle {
  const s = sizeFor(type);
  return {
    id: id(),
    type,
    x,
    y,
    ...s,
    passed: false,
    onFire: false,
    fireFrame: 0,
    fireT: 0,
    ...extra,
  };
}

export class Rng {
  private s: number;
  constructor(seed = 1) {
    this.s = seed >>> 0 || 1;
  }
  next() {
    let x = this.s;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.s = x >>> 0;
    return (this.s & 0xfffffff) / 0xfffffff;
  }
  range(a: number, b: number) {
    return a + this.next() * (b - a);
  }
  int(a: number, b: number) {
    return Math.floor(this.range(a, b + 1));
  }
}

/** Half-width of the playable mountain in world px (~125 m at 16 px/m). */
const WORLD_HALF = 2000;

export class World {
  obstacles: Obstacle[] = [];
  npcs: NPC[] = [];
  /** Furthest +y (downhill) chunk generated */
  private generatedTo = 0;
  /** Furthest -y (uphill) chunk generated (negative or 0) */
  private generatedUpTo = 0;
  private rng: Rng;
  private mode: GameMode;
  readonly gatesTotal: number;
  /** Course centerline samples (y → x) for tree placement near the race line */
  private courseLine: { y: number; x: number; half: number }[] = [];
  finishY = 0;

  constructor(mode: GameMode, seed = Date.now()) {
    this.mode = mode;
    this.rng = new Rng(seed);
    // Slalom ~15 gates; tree slalom a bit longer + denser woods
    this.gatesTotal = mode === "freestyle" ? 0 : mode === "slalom" ? 15 : 18;
    this.seedStartArea();
    if (mode !== "freestyle") this.placeSlalomCourse();
  }

  private seedStartArea() {
    for (let y = 120; y < 500; y += 90) {
      this.obstacles.push(make("tree", -280 + this.rng.range(-30, 30), y));
      this.obstacles.push(make("tree", 280 + this.rng.range(-30, 30), y));
    }
    // A little scenery uphill of the start so reverse scoot isn't empty snow
    for (let y = -80; y > -400; y -= 100) {
      this.obstacles.push(make("tree", -200 + this.rng.range(-40, 40), y));
      this.obstacles.push(make("tree", 200 + this.rng.range(-40, 40), y));
    }
    // Ski lift starts near the lodge area
    for (let y = 80; y < 500; y += 140) {
      this.obstacles.push(make("liftPole", LIFT_X, y));
    }
    this.obstacles.push(make("liftEmpty", LIFT_X + 2, 160));
    this.obstacles.push(make("liftPerson", LIFT_X + 2, 300));
    this.obstacles.push(make("liftPair", LIFT_X + 2, 420));
    this.generatedTo = 500;
    this.generatedUpTo = -400;
  }

  /**
   * Place the full slalom / tree-slalom course:
   * single alternating markers — red ← then blue → — weaving downhill.
   * Pass on the arrow side (left of red, right of blue). Finish after last gate.
   */
  private placeSlalomCourse() {
    let y = 380;
    let cx = 0;
    this.courseLine = [];

    for (let i = 0; i < this.gatesTotal; i++) {
      // Weave: red sits left of centerline, blue sits right (arrow side is open)
      const color: GateColor = i % 2 === 0 ? "red" : "blue";
      const offset = color === "red" ? -this.rng.range(28, 70) : this.rng.range(28, 70);
      cx += this.rng.range(-40, 40);
      cx = Math.max(-150, Math.min(150, cx));
      const gateX = cx + offset;
      const gateY = y;
      // red = slalomFlagL / blue = slalomFlagR (sprite resolve uses gateColor)
      const type: ObstacleType = color === "red" ? "slalomFlagL" : "slalomFlagR";
      this.obstacles.push(
        make(type, gateX, gateY, {
          gateColor: color,
          gateIndex: i,
        }),
      );
      // Clear zone on the correct side of the pole for the skier path
      this.courseLine.push({ y: gateY, x: cx, half: 48 });

      if (this.mode === "tree") {
        this.placeTreesAroundGate(gateX, gateY, color);
      }

      y += this.rng.range(260, 340);
    }

    this.finishY = y + 180;
    this.obstacles.push(make("finish", 0, this.finishY));
    this.generatedTo = Math.max(this.generatedTo, this.finishY + 400);
  }

  private placeTreesAroundGate(gateX: number, gateY: number, color: GateColor) {
    const n = this.rng.int(4, 9);
    // Keep the open (arrow) side clearer: red open left, blue open right
    for (let i = 0; i < n; i++) {
      let x: number;
      if (color === "red") {
        // denser to the right of the pole
        x = gateX + this.rng.range(20, 100);
      } else {
        x = gateX - this.rng.range(20, 100);
      }
      x += this.rng.range(-15, 15);
      const y = gateY + this.rng.range(-70, 90);
      // Don't plant on the open-side corridor
      if (color === "red" && x < gateX - 8) continue;
      if (color === "blue" && x > gateX + 8) continue;
      const t: ObstacleType =
        this.rng.next() < 0.7 ? "tree" : this.rng.next() < 0.5 ? "smallTree" : "deadTree";
      this.obstacles.push(make(t, x, y));
    }
  }

  ensureGenerated(playerY: number) {
    // Downhill
    const needDown = playerY + 1600;
    while (this.generatedTo < needDown) {
      this.generateChunk(this.generatedTo, this.generatedTo + 220);
      this.generatedTo += 220;
    }
    // Uphill of start (negative y) — needed for OG reverse-scoot yeti
    const needUp = playerY - 1600;
    while (this.generatedUpTo > needUp) {
      const y1 = this.generatedUpTo;
      const y0 = y1 - 220;
      this.generateChunk(y0, y1);
      this.generatedUpTo = y0;
    }
    const minY = playerY - 900;
    const maxY = playerY + 1800;
    this.obstacles = this.obstacles.filter(
      (o) =>
        (o.y > minY && o.y < maxY) ||
        ((o.type === "slalomFlagL" || o.type === "slalomFlagR" || o.type === "finish") &&
          !o.passed),
    );
    this.npcs = this.npcs.filter((n) => n.y > minY - 200 && n.y < maxY);
  }

  private generateChunk(y0: number, y1: number) {
    // Freestyle: normal density. Slalom: sparse off-course clutter.
    // Tree slalom: denser woods, but still leave the gate openings (handled at place).
    const density =
      this.mode === "tree" ? 1.25 : this.mode === "slalom" ? 0.35 : 0.65;
    const count = Math.floor(this.rng.range(6, 14) * density);

    for (let i = 0; i < count; i++) {
      const x = this.rng.range(-WORLD_HALF + 40, WORLD_HALF - 40);
      const y = this.rng.range(y0, y1);

      // Don't block the slalom corridor
      if (this.mode !== "freestyle" && this.nearGateOpening(x, y)) continue;

      let type: ObstacleType;
      const r = this.rng.next();
      if (this.mode === "tree") {
        type =
          r < 0.55
            ? "tree"
            : r < 0.75
              ? "smallTree"
              : r < 0.88
                ? "deadTree"
                : r < 0.94
                  ? "rock"
                  : "stump";
      } else if (this.mode === "slalom") {
        // Clean race course — mostly side scenery
        type =
          r < 0.4
            ? "tree"
            : r < 0.55
              ? "smallTree"
              : r < 0.7
                ? "rock"
                : r < 0.85
                  ? "slowSnow"
                  : "jump";
      } else if (r < 0.34) type = "tree";
      else if (r < 0.46) type = "smallTree";
      else if (r < 0.55) type = "deadTree";
      else if (r < 0.66) type = "rock";
      else if (r < 0.78) type = "stump";
      else if (r < 0.88) type = "slowSnow";
      else type = "jump";

      // Keep start-lane clear of solid clutter; powder can sit near the run
      if (type !== "slowSnow" && y < 800 && Math.abs(x) < 55) continue;
      this.obstacles.push(make(type, x, y));
    }

    // Extra soft powder (freestyle / slalom edges)
    if (this.mode !== "tree" && this.rng.next() < 0.45) {
      const sx = this.rng.range(-220, 220);
      const sy = this.rng.range(y0, y1);
      if (!this.nearGateOpening(sx, sy)) {
        this.obstacles.push(make("slowSnow", sx, sy));
      }
    }

    // Ski lift corridor continues down the mountain
    const poleY = Math.floor(y0 / 140) * 140 + 70;
    if (poleY >= y0 && poleY < y1) {
      this.obstacles.push(make("liftPole", LIFT_X, poleY));
      const chairRoll = this.rng.next();
      const chairType: ObstacleType =
        chairRoll < 0.35 ? "liftEmpty" : chairRoll < 0.7 ? "liftPerson" : "liftPair";
      this.obstacles.push(make(chairType, LIFT_X + 2, poleY + this.rng.range(20, 90)));
    }

    // Sparse NPCs — chunks are ~220m; keep the slope readable
    if (this.rng.next() < 0.07) {
      const kind = this.rng.next() < 0.35 ? "snowboarder" : "skier";
      const side = this.rng.next() < 0.5 ? -1 : 1;
      this.npcs.push({
        id: id(),
        kind,
        x: side * this.rng.range(120, 420),
        y: this.rng.range(y0, y1),
        vx: this.rng.range(-30, 30),
        vy: this.rng.range(80, 150),
        dir: "down",
        color: this.rng.int(0, 5),
      });
    }

    if (this.rng.next() < 0.05) {
      const side = this.rng.next() < 0.5 ? -1 : 1;
      this.npcs.push({
        id: id(),
        kind: "beginner",
        x: side * this.rng.range(40, 300),
        y: this.rng.range(y0, y1),
        vx: this.rng.range(-8, 8),
        vy: this.rng.range(28, 48),
        dir: "down",
        color: 0,
      });
    }

    if (this.rng.next() < 0.045) {
      const goingRight = this.rng.next() < 0.5;
      this.npcs.push({
        id: id(),
        kind: "dog",
        x: goingRight ? -WORLD_HALF + 40 : WORLD_HALF - 40,
        y: this.rng.range(y0, y1),
        vx: (goingRight ? 1 : -1) * this.rng.range(45, 85),
        vy: this.rng.range(8, 25),
        dir: goingRight ? "right" : "left",
        color: 0,
        dogState: "walk",
        dogTimer: 0,
        dogFrame: 0,
      });
    }
  }

  /** True if (x,y) sits inside a gate opening (keep clear of solid clutter). */
  private nearGateOpening(x: number, y: number): boolean {
    for (const g of this.courseLine) {
      if (Math.abs(y - g.y) < 50 && Math.abs(x - g.x) < g.half + 14) return true;
    }
    return false;
  }

  updateNpcs(dt: number, playerY: number) {
    for (const n of this.npcs) {
      if (n.kind === "dog") {
        this.updateDog(n, dt, playerY);
        continue;
      }
      if (n.kind === "beginner") {
        // Slow snowplow: mostly straight down, tiny wander
        n.vx += (this.rng.next() - 0.5) * 12 * dt;
        n.vx = Math.max(-12, Math.min(12, n.vx));
        n.x += n.vx * dt;
        n.y += n.vy * dt;
        if (n.vx < -6) n.dir = "downLeft";
        else if (n.vx > 6) n.dir = "downRight";
        else n.dir = "down";
        if (n.y < playerY - 400) {
          n.y = playerY + this.rng.range(250, 700);
          n.x = this.rng.range(-WORLD_HALF + 100, WORLD_HALF - 100);
        }
        continue;
      }
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      n.vx += (this.rng.next() - 0.5) * 40 * dt;
      n.vx = Math.max(-50, Math.min(50, n.vx));
      if (Math.abs(n.x) > WORLD_HALF - 40) n.vx *= -1;
      if (n.vx < -18) n.dir = "downLeft";
      else if (n.vx > 18) n.dir = "downRight";
      else n.dir = "down";
      if (n.y < playerY - 400) n.y = playerY + this.rng.range(250, 700);
    }
  }

  private updateDog(n: NPC, dt: number, playerY: number) {
    n.dogTimer = (n.dogTimer ?? 0) - dt;
    n.dogFrame = ((n.dogFrame ?? 0) + dt * 6) % 2;

    if (n.dogState === "woof" || n.dogState === "pee") {
      // Freeze in place while barking / peeing
      if ((n.dogTimer ?? 0) <= 0) {
        n.dogState = "walk";
      }
      return;
    }

    // Walk across the slope
    n.x += n.vx * dt;
    n.y += n.vy * dt;
    if (n.x > WORLD_HALF - 30) {
      n.x = WORLD_HALF - 30;
      n.vx = -Math.abs(n.vx);
      n.dir = "left";
    } else if (n.x < -WORLD_HALF + 30) {
      n.x = -WORLD_HALF + 30;
      n.vx = Math.abs(n.vx);
      n.dir = "right";
    }
    if (n.y < playerY - 400) {
      n.y = playerY + this.rng.range(200, 600);
      n.x = this.rng.range(-WORLD_HALF + 80, WORLD_HALF - 80);
    }
  }

  /** Animate burning dead trees */
  updateFires(dt: number) {
    for (const o of this.obstacles) {
      if (!o.onFire) continue;
      o.fireT = (o.fireT ?? 0) + dt;
      o.fireFrame = Math.floor((o.fireT ?? 0) * 10) % 3;
      // Burn out after a while but stay as dead tree charcoal
      if ((o.fireT ?? 0) > 4) {
        o.onFire = false;
      }
    }
  }

  igniteDeadTree(o: Obstacle) {
    if (o.type !== "deadTree" || o.onFire) return;
    o.onFire = true;
    o.fireT = 0;
    o.fireFrame = 0;
    // While on fire, still solid (burning tree)
    o.solid = true;
  }
}
