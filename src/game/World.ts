import type { GameMode, Obstacle, ObstacleType, NPC } from "./types";

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
      return { hw: 7, hh: 5, solid: true };
    case "jump":
      return { hw: 14, hh: 5, solid: false };
    case "mushroom":
      return { hw: 6, hh: 5, solid: true };
    case "slalomFlagL":
    case "slalomFlagR":
      return { hw: 5, hh: 4, solid: false };
    case "finish":
      return { hw: 40, hh: 8, solid: false };
  }
}

function make(type: ObstacleType, x: number, y: number): Obstacle {
  const s = sizeFor(type);
  return { id: id(), type, x, y, ...s, passed: false, onFire: false, fireFrame: 0, fireT: 0 };
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

const WORLD_HALF = 1200;

export class World {
  obstacles: Obstacle[] = [];
  npcs: NPC[] = [];
  private generatedTo = 0;
  private rng: Rng;
  private mode: GameMode;
  private gateCount = 0;
  readonly gatesTotal: number;

  constructor(mode: GameMode, seed = Date.now()) {
    this.mode = mode;
    this.rng = new Rng(seed);
    this.gatesTotal = mode === "freestyle" ? 0 : mode === "slalom" ? 20 : 25;
    this.seedStartArea();
  }

  private seedStartArea() {
    for (let y = 120; y < 500; y += 90) {
      this.obstacles.push(make("tree", -280 + this.rng.range(-30, 30), y));
      this.obstacles.push(make("tree", 280 + this.rng.range(-30, 30), y));
    }
    this.generatedTo = 500;
  }

  ensureGenerated(playerY: number) {
    const need = playerY + 1600;
    while (this.generatedTo < need) {
      this.generateChunk(this.generatedTo, this.generatedTo + 220);
      this.generatedTo += 220;
    }
    const minY = playerY - 900;
    this.obstacles = this.obstacles.filter((o) => o.y > minY);
    this.npcs = this.npcs.filter((n) => n.y > minY - 200 && n.y < playerY + 1800);
  }

  private generateChunk(y0: number, y1: number) {
    const density = this.mode === "tree" ? 1.1 : this.mode === "slalom" ? 0.5 : 0.65;
    const count = Math.floor(this.rng.range(8, 16) * density);

    for (let i = 0; i < count; i++) {
      const x = this.rng.range(-WORLD_HALF + 40, WORLD_HALF - 40);
      const y = this.rng.range(y0, y1);
      if (y < 800 && Math.abs(x) < 55) continue;

      let type: ObstacleType;
      const r = this.rng.next();
      if (this.mode === "tree") {
        type = r < 0.5 ? "tree" : r < 0.72 ? "smallTree" : r < 0.88 ? "deadTree" : "rock";
      } else if (r < 0.38) type = "tree";
      else if (r < 0.52) type = "smallTree";
      else if (r < 0.62) type = "deadTree";
      else if (r < 0.76) type = "rock";
      else if (r < 0.84) type = "stump";
      else if (r < 0.93) type = "jump";
      else type = "mushroom";

      this.obstacles.push(make(type, x, y));
    }

    if (this.mode !== "freestyle" && this.gateCount < this.gatesTotal) {
      if (Math.floor(y0 / 300) !== Math.floor(y1 / 300) || this.rng.next() < 0.4) {
        const gateY = (y0 + y1) / 2 + this.rng.range(-25, 25);
        const cx = this.rng.range(-180, 180);
        const half = this.mode === "tree" ? 40 : 52;
        this.obstacles.push(make("slalomFlagL", cx - half, gateY));
        this.obstacles.push(make("slalomFlagR", cx + half, gateY));
        this.gateCount++;
        if (this.gateCount === this.gatesTotal) {
          this.obstacles.push(make("finish", 0, gateY + 240));
        }
      }
    }

    // Fast background skiers / snowboarders
    if (this.rng.next() < 0.35) {
      const kind = this.rng.next() < 0.4 ? "snowboarder" : "skier";
      const side = this.rng.next() < 0.5 ? -1 : 1;
      this.npcs.push({
        id: id(),
        kind,
        x: side * this.rng.range(90, 320),
        y: this.rng.range(y0, y1),
        vx: this.rng.range(-30, 30),
        vy: this.rng.range(80, 150),
        dir: "down",
        color: this.rng.int(0, 5),
      });
    }

    // Beginner snowplow skiers — pink, skis wedged, slowly downhill
    if (this.rng.next() < 0.4) {
      const side = this.rng.next() < 0.5 ? -1 : 1;
      this.npcs.push({
        id: id(),
        kind: "beginner",
        x: side * this.rng.range(20, 280),
        y: this.rng.range(y0, y1),
        vx: this.rng.range(-8, 8),
        vy: this.rng.range(28, 48), // slow
        dir: "down",
        color: 0,
      });
    }

    // Dogs walking across left/right
    if (this.rng.next() < 0.4) {
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
        n.dir = "down";
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
