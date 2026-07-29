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
import { PIXELS_PER_METRE, YETI_DISTANCE_M } from "./originalConstants";

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
    frameT: number;
  } | null = null;
  timeMs = 0;
  style = 0;
  gatesPassed = 0;
  message: string | null = null;
  private messageTimer = 0;
  private canvas: HTMLCanvasElement;
  input: Input;
  private lastTs = 0;
  private onChange: (() => void) | null = null;
  private mouseMoved = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

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
    this.message = null;
    this.messageTimer = 0;
    this.mouseMoved = false;
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
    // Track mouse motion (ignore static cursor after menu click)
    if (
      this.input.mouseInCanvas &&
      (this.input.mouseX !== this.lastMouseX || this.input.mouseY !== this.lastMouseY)
    ) {
      if (this.lastMouseX !== 0 || this.lastMouseY !== 0) {
        this.mouseMoved = true;
      }
      this.lastMouseX = this.input.mouseX;
      this.lastMouseY = this.input.mouseY;
    }

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

    if (this.state !== "playing") {
      this.input.endFrame();
      return;
    }

    const dt = Math.min(0.05, (now - this.lastTs) / 1000);
    this.lastTs = now;
    this.timeMs += dt * 1000;

    const steer = this.readSteer();
    const prevDir = this.player.dir;
    updatePlayer(this.player, steer, dt);

    if (prevDir !== this.player.dir && this.player.vy > 40) {
      this.style += this.player.character === "snowboarder" ? 2 : 1;
    }
    if (this.player.airborne > 0) {
      this.style += Math.floor(dt * 8);
    }

    this.world.ensureGenerated(this.player.y);
    this.world.updateNpcs(dt, this.player.y);
    this.handleCollisions();
    this.updateYeti(dt);

    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) this.message = null;
    }

    this.input.endFrame();
  }

  private readSteer(): SteerInput {
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

    // Mouse only after real movement; keyboard always wins when held
    let mouseDx: number | null = null;
    if (this.mouseMoved && this.input.mouseInCanvas && !left && !right) {
      const originX = this.canvas.clientWidth / 2;
      // Approximate skier screen x = center (camera follows player.x)
      mouseDx = this.input.mouseX - originX;
    }

    return { left, right, up, down, mouseDx, leftPressed, rightPressed };
  }

  private handleCollisions() {
    const p = this.player;
    if (p.crashTimer > 0 || p.invuln > 0 || p.airborne > 0.12) return;

    for (const o of this.world.obstacles) {
      const dx = Math.abs(p.x - o.x);
      const dy = Math.abs(p.y - o.y);
      // Feet/skis collision box (original hitboxes are small relative to sprite)
      if (dx > o.hw + 6 || dy > o.hh + 8) continue;

      if (o.type === "jump" && p.vy > 50) {
        launchPlayer(p, p.character === "snowboarder" ? 1.25 : 1);
        this.style += 5;
        this.toast("Jump!");
        continue;
      }

      if (o.type === "finish" && !o.passed) {
        o.passed = true;
        this.state = "finished";
        this.toast("Finish!");
        this.notify();
        return;
      }

      if (o.solid) {
        crashPlayer(p);
        this.style = Math.max(0, this.style - 5);
        this.toast("Ouch!");
        return;
      }
    }

    const flags = this.world.obstacles.filter(
      (o) => (o.type === "slalomFlagL" || o.type === "slalomFlagR") && !o.passed,
    );
    const lefts = flags.filter((f) => f.type === "slalomFlagL");
    for (const L of lefts) {
      const R = flags.find((f) => f.type === "slalomFlagR" && Math.abs(f.y - L.y) < 10);
      if (!R) continue;
      if (p.y > L.y - 8 && p.y < L.y + 16) {
        if (p.x > L.x && p.x < R.x) {
          L.passed = true;
          R.passed = true;
          this.gatesPassed++;
          this.style += 10;
          this.toast("Gate!");
        } else if (p.y > L.y + 6) {
          L.passed = true;
          R.passed = true;
          this.style = Math.max(0, this.style - 3);
        }
      }
    }
  }

  private updateYeti(dt: number) {
    const distM = this.player.y / PIXELS_PER_METRE;
    if (distM < YETI_DISTANCE_M) return;

    if (!this.yeti) {
      this.yeti = {
        active: true,
        x: this.player.x + (Math.random() < 0.5 ? -140 : 140),
        y: this.player.y - 100,
        vx: 0,
        vy: 0,
        frame: 0,
        eating: false,
        frameT: 0,
      };
      this.toast("The monster approaches...");
    }

    const y = this.yeti;
    y.frameT += dt;
    if (y.frameT > 0.12) {
      y.frameT = 0;
      y.frame++;
    }

    const dx = this.player.x - y.x;
    const dy = this.player.y - y.y;
    const dist = Math.hypot(dx, dy) || 1;
    // Slightly faster than max skier tuck
    const speed = 210;
    y.vx = (dx / dist) * speed;
    y.vy = (dy / dist) * speed * 0.95;
    y.x += y.vx * dt;
    y.y += y.vy * dt;

    if (dist < 28 && this.player.crashTimer <= 0) {
      y.eating = true;
      this.state = "eaten";
      this.toast("Yummy!");
      this.notify();
    }
  }

  private toast(msg: string) {
    this.message = msg;
    this.messageTimer = 1.0;
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
          }
        : null,
      cameraY: this.player.y,
      timeMs: this.timeMs,
      distance: Math.max(0, this.player.y / PIXELS_PER_METRE),
      style: this.style,
      speed: speedPx / PIXELS_PER_METRE,
      mode: this.config.mode,
      graphics: this.config.graphics,
      gatesPassed: this.gatesPassed,
      gatesTotal: this.world.gatesTotal,
      message: this.message,
      mouseX: this.input.mouseInCanvas ? this.input.mouseX : null,
      mouseY: this.input.mouseInCanvas ? this.input.mouseY : null,
    };
  }
}
