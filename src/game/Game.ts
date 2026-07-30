import type {
  CharacterType,
  GameConfig,
  GameSnapshot,
  GameState,
  GraphicsMode,
} from "./types";
import { Input } from "./Input";
import { World } from "./World";
import {
  createPlayer,
  updatePlayer,
  crashPlayer,
  launchPlayer,
  type SteerInput,
} from "./PlayerPhysics";
import {
  PIXELS_PER_METRE,
  YETI_DISTANCE_M,
  YETI_SIDE_M,
  YETI_UPHILL_M,
} from "./originalConstants";

export class Game {
  state: GameState = "menu";
  config: GameConfig;
  player = createPlayer("skier");
  world: World;
  yeti: {
    active: boolean;
    x: number;
    y: number;
    vx: number;
    vy: number;
    frame: number;
    eating: boolean;
    celebrating: boolean;
    frameT: number;
  } | null = null;
  timeMs = 0;
  style = 0;
  gatesPassed = 0;
  gatesMissed = 0;
  penaltyMs = 0;
  message: string | null = null;
  /** OG: F turbo (~2×), 1 = normal. Scales whole sim dt. */
  timeScale = 1;
  private messageTimer = 0;
  private canvas: HTMLCanvasElement;
  input: Input;
  private lastTs = 0;
  private onChange: (() => void) | null = null;

  static readonly TURBO_SCALE = 2;
  /** OG miss-gate penalty */
  static readonly GATE_PENALTY_MS = 5000;

  constructor(canvas: HTMLCanvasElement, config: GameConfig) {
    this.canvas = canvas;
    this.config = { ...config };
    this.world = new World(config.mode);
    this.player = createPlayer(config.character);
    this.input = new Input(canvas);
  }

  setOnChange(cb: () => void) {
    this.onChange = cb;
  }

  start(config?: Partial<GameConfig>) {
    if (config) this.config = { ...this.config, ...config };
    this.world = new World(this.config.mode);
    this.player = createPlayer(this.config.character);
    this.yeti = null;
    this.timeMs = 0;
    this.style = 0;
    this.gatesPassed = 0;
    this.gatesMissed = 0;
    this.penaltyMs = 0;
    this.message = null;
    this.messageTimer = 0;
    this.timeScale = 1;
    this.state = "playing";
    this.lastTs = performance.now();
    this.notify();
  }

  goMenu() {
    this.state = "menu";
    this.notify();
  }

  togglePause() {
    if (this.state === "playing") {
      this.state = "paused";
      this.notify();
    } else if (this.state === "paused") {
      this.state = "playing";
      this.lastTs = performance.now();
      this.notify();
    }
  }

  setGraphics(g: GraphicsMode) {
    this.config.graphics = g;
    this.notify();
  }

  setCharacter(c: CharacterType) {
    if (this.state === "playing" && this.player.crashTimer <= 0 && this.player.airborne <= 0) {
      this.config.character = c;
      this.player.character = c;
      this.toast(c === "snowboarder" ? "Snowboard mode!" : "Ski mode!");
      this.notify();
    } else if (this.state === "menu" || this.state === "paused") {
      this.config.character = c;
      this.player.character = c;
      this.notify();
    }
  }

  tick(now: number) {
    if (this.input.wasPressed("f2") || this.input.wasPressed("r")) {
      if (this.state !== "menu") this.start();
    }
    if (this.input.wasPressed("f3") || this.input.wasPressed("p") || this.input.wasPressed("escape")) {
      if (this.state === "playing" || this.state === "paused") this.togglePause();
    }
    if (this.input.wasPressed("g")) {
      this.setGraphics(this.config.graphics === "classic" ? "3d" : "classic");
    }
    if (this.input.wasPressed("c")) {
      this.setCharacter(this.config.character === "skier" ? "snowboarder" : "skier");
    }
    // OG: F toggles turbo (~2× whole sim) on/off. Bare "f" only (not F2/F3).
    if (
      (this.state === "playing" || this.state === "paused") &&
      this.input.wasPressed("f")
    ) {
      this.toggleTurbo();
    }

    // Eaten: keep sim alive so yeti can finish swallow + celebrate hop loop
    if (this.state === "eaten") {
      const rawDt = Math.min(0.05, (now - this.lastTs) / 1000);
      this.lastTs = now;
      const dt = Math.min(0.12, rawDt * this.timeScale);
      this.updateYeti(dt);
      if (this.messageTimer > 0) {
        this.messageTimer -= dt;
        if (this.messageTimer <= 0) this.message = null;
      }
      this.input.endFrame();
      return;
    }

    if (this.state !== "playing") {
      this.input.endFrame();
      return;
    }

    const rawDt = Math.min(0.05, (now - this.lastTs) / 1000);
    this.lastTs = now;
    // Scale whole sim (player, yeti, world) — OG F turbo
    const dt = Math.min(0.12, rawDt * this.timeScale);
    this.timeMs += dt * 1000;

    const wasAir = this.player.airborne > 0;
    const flipsBefore = this.player.flipsThisAir;
    const steer = this.readSteer();
    const prevDir = this.player.dir;
    // Must apply before move — physics rewrites vx/vy every frame
    const speedMul = this.slowSnowSpeedMul();
    updatePlayer(this.player, steer, dt, { speedMul });

    if (prevDir !== this.player.dir && this.player.vy > 40) {
      this.style += this.player.character === "snowboarder" ? 2 : 1;
    }
    if (this.player.airborne > 0) {
      this.style += Math.floor(dt * 6);
    }
    // Style for completed flips
    if (this.player.flipsThisAir > flipsBefore) {
      this.style += 15 * (this.player.flipsThisAir - flipsBefore);
      if (this.player.flipsThisAir >= 2) this.toast("Double flip!");
      else this.toast("Backflip!");
    }
    // Landing style
    if (wasAir && this.player.airborne <= 0 && this.player.crashTimer <= 0 && flipsBefore > 0) {
      this.style += 10 * flipsBefore;
    }

    this.world.ensureGenerated(this.player.y);
    this.world.updateNpcs(dt, this.player.y);
    this.world.updateFires(dt);
    this.handleCollisions();
    this.updateYeti(dt);

    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) this.message = null;
    }

    this.input.endFrame();
  }

  private readSteer(): SteerInput {
    const scheme = this.config.controls;
    const jumpPressed = this.input.jumpPressed();
    const upPressed =
      this.input.wasPressed("arrowup") ||
      this.input.wasPressed("w") ||
      this.input.wasPressed("numpad8") ||
      this.input.wasPressed("8");

    if (scheme === "mouse") {
      let mouseDx: number | null = null;
      if (this.input.mouseInCanvas) {
        const originX = this.canvas.clientWidth / 2;
        mouseDx = this.input.mouseX - originX;
      }
      return {
        left: false,
        right: false,
        up: this.input.isDown("arrowup") || this.input.isDown("w"),
        down: false,
        mouseDx,
        leftPressed: false,
        rightPressed: false,
        jumpPressed,
        upPressed,
      };
    }

    const left =
      this.input.isDown("arrowleft") ||
      this.input.isDown("a") ||
      this.input.isDown("numpad4") ||
      this.input.isDown("numpad1") ||
      this.input.isDown("numpad7") ||
      this.input.isDown("4") ||
      this.input.isDown("1") ||
      this.input.isDown("7");
    const right =
      this.input.isDown("arrowright") ||
      this.input.isDown("d") ||
      this.input.isDown("numpad6") ||
      this.input.isDown("numpad3") ||
      this.input.isDown("numpad9") ||
      this.input.isDown("6") ||
      this.input.isDown("3") ||
      this.input.isDown("9");
    const up =
      this.input.isDown("arrowup") ||
      this.input.isDown("w") ||
      this.input.isDown("numpad8") ||
      this.input.isDown("8");
    const down =
      this.input.isDown("arrowdown") ||
      this.input.isDown("s") ||
      this.input.isDown("numpad2") ||
      this.input.isDown("numpad5") ||
      this.input.isDown("2") ||
      this.input.isDown("5");

    const leftPressed =
      this.input.wasPressed("arrowleft") ||
      this.input.wasPressed("a") ||
      this.input.wasPressed("numpad4") ||
      this.input.wasPressed("4");
    const rightPressed =
      this.input.wasPressed("arrowright") ||
      this.input.wasPressed("d") ||
      this.input.wasPressed("numpad6") ||
      this.input.wasPressed("6");

    return {
      left,
      right,
      up,
      down,
      mouseDx: null,
      leftPressed,
      rightPressed,
      jumpPressed,
      upPressed,
    };
  }

  /** Soft powder speed scale (1 = normal). Stacks slightly if overlapping many. */
  private slowSnowSpeedMul(): number {
    const p = this.player;
    if (p.airborne > 0.05 || p.crashTimer > 0) return 1;
    let inPowder = false;
    for (const o of this.world.obstacles) {
      if (o.type !== "slowSnow") continue;
      const dx = Math.abs(p.x - o.x);
      const dy = Math.abs(p.y - o.y);
      // Match visual footprint of the powder sprite
      if (dx <= o.hw + 6 && dy <= o.hh + 8) {
        inPowder = true;
        break;
      }
    }
    // ~40% of normal tuck speed — very noticeable drag
    return inPowder ? 0.4 : 1;
  }

  private handleCollisions() {
    const p = this.player;
    if (p.crashTimer > 0 || p.invuln > 0) return;

    const airborne = p.airborne > 0.08;

    // Dogs first
    for (const n of this.world.npcs) {
      if (n.kind !== "dog") continue;
      const dx = Math.abs(p.x - n.x);
      const dy = Math.abs(p.y - n.y);
      if (dx > 18 || dy > 16) continue;

      if (airborne) {
        // Jump over dog → pee
        if (n.dogState !== "pee") {
          n.dogState = "pee";
          n.dogTimer = 1.4;
          this.style += 8;
          this.toast("…");
        }
      } else if (n.dogState === "walk") {
        // Ski through dog → woof (pause, no full crash)
        n.dogState = "woof";
        n.dogTimer = 0.7;
        this.toast("Woof!");
        // slight slowdown
        p.vx *= 0.5;
        p.vy *= 0.7;
      }
    }

    for (const o of this.world.obstacles) {
      const dx = Math.abs(p.x - o.x);
      const dy = Math.abs(p.y - o.y);
      if (dx > o.hw + 8 || dy > o.hh + 10) continue;

      // Soft powder — handled as continuous speedMul in updatePlayer
      if (o.type === "slowSnow") continue;

      // Lift scenery — non-solid, no interaction
      if (
        o.type === "liftPole" ||
        o.type === "liftEmpty" ||
        o.type === "liftPerson" ||
        o.type === "liftPair"
      ) {
        continue;
      }

      // Jump ramp
      if (o.type === "jump" && !airborne && p.vy > 40) {
        launchPlayer(p, p.character === "snowboarder" ? 1.25 : 1);
        this.style += 5;
        this.toast("Jump!");
        continue;
      }

      // Jump over leafless tree → fire
      if (o.type === "deadTree" && airborne) {
        if (!o.onFire) {
          this.world.igniteDeadTree(o);
          this.style += 12;
          this.toast("🔥");
        }
        continue; // clear the jump — no crash
      }

      // Jumping over solid trees: still crash if you hit trunk while airborne low
      // (only dead trees ignite; live trees hurt)
      if (airborne && o.solid && o.type !== "deadTree") {
        // High enough air clears most; low air still hits
        if (p.airborne < 0.2) {
          crashPlayer(p);
          this.style = Math.max(0, this.style - 5);
          this.toast("Ouch!");
          return;
        }
        continue;
      }

      if (o.type === "finish" && !o.passed) {
        o.passed = true;
        this.state = "finished";
        this.toast("Finish!");
        this.notify();
        return;
      }

      if (o.solid && !airborne) {
        crashPlayer(p);
        this.style = Math.max(0, this.style - 5);
        this.toast("Ouch!");
        return;
      }
    }

    // Slalom / tree-slalom: single markers alternate red← / blue→.
    // Pass on the arrow side (left of red, right of blue). Miss → +5s.
    if (this.config.mode === "freestyle") return;
    this.resolveGates(p.x, p.y);
  }

  private resolveGates(px: number, py: number) {
    const gates = this.world.obstacles.filter(
      (o) =>
        (o.type === "slalomFlagL" || o.type === "slalomFlagR") && !o.passed,
    );
    for (const g of gates) {
      // Resolve once the skier has crossed the gate line
      if (py < g.y + 4) continue;

      const isBlue = g.gateColor === "blue" || g.type === "slalomFlagR";
      // Red ← : pass left of pole · Blue → : pass right of pole
      const correctSide = isBlue ? px > g.x : px < g.x;
      const color = isBlue ? "Blue" : "Red";
      g.passed = true;

      if (correctSide) {
        this.gatesPassed++;
        this.style += 10;
        this.toast(`${color} gate!`);
      } else {
        g.gateMissed = true;
        this.gatesMissed++;
        this.penaltyMs += Game.GATE_PENALTY_MS;
        this.timeMs += Game.GATE_PENALTY_MS;
        this.style = Math.max(0, this.style - 5);
        this.toast("+5s miss");
      }
    }
  }

  /**
   * OG spawn triggers (any one):
   *  - ~2000 m downhill
   *  - ~69 m uphill of the start
   *  - very far left/right of the mountain
   */
  private shouldSpawnYeti(): boolean {
    const ppm = PIXELS_PER_METRE;
    const downM = this.player.y / ppm;
    const upM = -this.player.y / ppm; // positive when above start
    const sideM = Math.abs(this.player.x) / ppm;
    return (
      downM >= YETI_DISTANCE_M ||
      upM >= YETI_UPHILL_M ||
      sideM >= YETI_SIDE_M
    );
  }

  private spawnYeti() {
    // Approach from the “outside” direction when possible
    const sideM = Math.abs(this.player.x) / PIXELS_PER_METRE;
    let ox = this.player.x + (Math.random() < 0.5 ? -160 : 160);
    let oy = this.player.y - 120;
    if (this.player.y < 0) {
      // uphill: come from further uphill
      oy = this.player.y - 140;
    } else if (sideM >= YETI_SIDE_M * 0.85) {
      ox = this.player.x + (this.player.x >= 0 ? 180 : -180);
      oy = this.player.y - 40;
    }
    this.yeti = {
      active: true,
      x: ox,
      y: oy,
      vx: 0,
      vy: 0,
      frame: 0,
      eating: false,
      celebrating: false,
      frameT: 0,
    };
    this.toast("The monster approaches...");
    this.notify();
  }

  private updateYeti(dt: number) {
    // After catch: play swallow, then loop joy forever
    if (this.state === "eaten" && this.yeti) {
      const y = this.yeti;
      y.vx = 0;
      y.vy = 0;
      y.frameT += dt;
      const step = y.celebrating ? 0.18 : 0.14;
      if (y.frameT > step) {
        y.frameT = 0;
        y.frame++;
      }
      // Eat sequence length (indices 0..8 in YETI_EAT_KEYS)
      const eatLen = 9;
      if (y.eating && !y.celebrating && y.frame >= eatLen - 1) {
        y.celebrating = true;
        y.frame = 0;
      }
      return;
    }

    if (!this.shouldSpawnYeti()) return;

    if (!this.yeti) this.spawnYeti();
    if (!this.yeti || this.yeti.eating) return;

    const y = this.yeti;
    y.frameT += dt;
    if (y.frameT > 0.12) {
      y.frameT = 0;
      y.frame++;
    }

    const dx = this.player.x - y.x;
    const dy = this.player.y - y.y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = 210;
    y.vx = (dx / dist) * speed;
    y.vy = (dy / dist) * speed * 0.95;
    y.x += y.vx * dt;
    y.y += y.vy * dt;

    if (dist < 28 && this.player.crashTimer <= 0) {
      y.eating = true;
      y.celebrating = false;
      y.frame = 0;
      y.frameT = 0;
      y.vx = 0;
      y.vy = 0;
      // Snap yeti onto the skier for the eat pose
      y.x = this.player.x;
      y.y = this.player.y;
      this.state = "eaten";
      this.toast("Yummy!");
      this.notify();
    }
  }

  private toast(msg: string) {
    this.message = msg;
    this.messageTimer = 1.0;
  }

  private toggleTurbo() {
    if (this.timeScale > 1.01) {
      this.timeScale = 1;
      this.toast("Normal speed");
    } else {
      this.timeScale = Game.TURBO_SCALE;
      this.toast("Fast! (F)");
    }
    this.notify();
  }

  private notify() {
    this.onChange?.();
  }

  snapshot(): GameSnapshot {
    const speedPx = Math.hypot(this.player.vx, this.player.vy);
    return {
      state: this.state,
      player: { ...this.player },
      obstacles: this.world.obstacles,
      npcs: this.world.npcs,
      yeti: this.yeti
        ? {
            active: this.yeti.active,
            x: this.yeti.x,
            y: this.yeti.y,
            vx: this.yeti.vx,
            vy: this.yeti.vy,
            frame: this.yeti.frame,
            eating: this.yeti.eating,
            celebrating: this.yeti.celebrating,
          }
        : null,
      cameraY: this.player.y,
      timeMs: this.timeMs,
      // Positive downhill from start; negative when reverse-scooting uphill
      distance: this.player.y / PIXELS_PER_METRE,
      style: this.style,
      speed: speedPx / PIXELS_PER_METRE,
      mode: this.config.mode,
      graphics: this.config.graphics,
      gatesPassed: this.gatesPassed,
      gatesMissed: this.gatesMissed,
      gatesTotal: this.world.gatesTotal,
      penaltyMs: this.penaltyMs,
      message: this.message,
      mouseX: this.input.mouseInCanvas ? this.input.mouseX : null,
      mouseY: this.input.mouseInCanvas ? this.input.mouseY : null,
      timeScale: this.timeScale,
    };
  }
}
