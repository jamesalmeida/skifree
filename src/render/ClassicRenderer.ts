import type { GameSnapshot } from "../game/types";
import { CLASSIC_SCALE, SOUTH_SPEED_PX } from "../game/originalConstants";
import {
  getOriginalSprite,
  playerSpriteName,
  obstacleSpriteName,
  yetiSpriteName,
} from "./originalSprites";

const SNOW = "#ffffff";

type SprayParticle = {
  /** offset from player feet in world px */
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
};

export class ClassicRenderer {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private spray: SprayParticle[] = [];
  private lastPlayerY = 0;
  private sprayTime = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;
  }

  resize(cssW: number, cssH: number, dpr: number) {
    this.canvas.width = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = cssW;
    this.h = cssH;
  }

  private drawSprite(
    key: string,
    sx: number,
    sy: number,
    opts?: { scale?: number; flipX?: boolean },
  ) {
    const spr = getOriginalSprite(key);
    if (!spr) return;
    const scale = opts?.scale ?? CLASSIC_SCALE;
    const dw = spr.width * scale;
    const dh = spr.height * scale;
    const { ctx } = this;
    ctx.imageSmoothingEnabled = false;
    if (opts?.flipX) {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(-1, 1);
      ctx.drawImage(spr, -dw / 2, -dh + 4, dw, dh);
      ctx.restore();
    } else {
      ctx.drawImage(spr, sx - dw / 2, sy - dh + 4, dw, dh);
    }
  }

  /** Snow kicking up behind player when tucking downhill at speed */
  private updateSnowSpray(snap: GameSnapshot, dt: number) {
    const p = snap.player;
    const speed = Math.hypot(p.vx, p.vy);
    const goingDown =
      p.crashPhase === "none" &&
      p.airborne <= 0 &&
      p.dir === "down" &&
      speed > SOUTH_SPEED_PX * 0.45;

    // Spawn rate scales with speed
    if (goingDown) {
      const rate = 28 * (speed / Math.max(1, SOUTH_SPEED_PX)); // particles / sec
      const n = Math.min(6, Math.floor(rate * dt + Math.random()));
      for (let i = 0; i < n; i++) {
        const side = Math.random() < 0.5 ? -1 : 1;
        this.spray.push({
          ox: side * (3 + Math.random() * 10),
          oy: 2 + Math.random() * 4,
          vx: side * (20 + Math.random() * 50),
          // “up the slope” = negative y while player moves +y
          vy: -(40 + Math.random() * 90),
          life: 0.18 + Math.random() * 0.28,
          maxLife: 0.35 + Math.random() * 0.2,
          size: 1 + Math.floor(Math.random() * 2.5),
        });
        this.spray[this.spray.length - 1]!.life =
          this.spray[this.spray.length - 1]!.maxLife;
      }
    }

    // Cap particle count
    if (this.spray.length > 80) {
      this.spray.splice(0, this.spray.length - 80);
    }

    for (const s of this.spray) {
      s.ox += s.vx * dt;
      s.oy += s.vy * dt;
      s.vx *= Math.exp(-2.2 * dt);
      s.vy *= Math.exp(-1.4 * dt);
      s.life -= dt;
    }
    this.spray = this.spray.filter((s) => s.life > 0);
  }

  private drawSnowSpray(
    sx: number,
    sy: number,
  ) {
    const { ctx } = this;
    for (const s of this.spray) {
      const t = s.life / s.maxLife;
      const alpha = Math.max(0, Math.min(0.85, t * 0.9));
      // slightly gray so it reads on white snow
      ctx.fillStyle = `rgba(160, 175, 195, ${alpha})`;
      const px = sx + s.ox * CLASSIC_SCALE;
      const py = sy + s.oy * CLASSIC_SCALE;
      const sz = Math.max(1, s.size * CLASSIC_SCALE * (0.6 + 0.4 * t));
      ctx.fillRect(Math.floor(px), Math.floor(py), sz, sz);
    }
  }

  render(snap: GameSnapshot) {
    const { ctx, w, h } = this;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = SNOW;
    ctx.fillRect(0, 0, w, h);

    // approx dt from player motion (renderer has no clock); use steady ~16ms feel
    const dy = Math.abs(snap.player.y - this.lastPlayerY);
    this.lastPlayerY = snap.player.y;
    const dt = Math.min(0.05, Math.max(1 / 120, dy > 0.01 ? 1 / 60 : 1 / 60));
    this.sprayTime += dt;
    this.updateSnowSpray(snap, dt);

    const camX = snap.player.x;
    const camY = snap.cameraY;
    const originX = w / 2;
    const originY = h * 0.4;

    const toScreen = (x: number, y: number) => ({
      sx: originX + (x - camX) * CLASSIC_SCALE,
      sy: originY + (y - camY) * CLASSIC_SCALE,
    });

    type Item = { y: number; draw: () => void };
    const list: Item[] = [];

    for (const o of snap.obstacles) {
      const { sx, sy } = toScreen(o.x, o.y);
      if (sy < -80 || sy > h + 80 || sx < -80 || sx > w + 80) continue;
      const key = obstacleSpriteName(o.type);
      list.push({
        y: o.y,
        draw: () => {
          this.drawSprite(key, sx, sy);
          if (o.onFire) {
            const fi = o.fireFrame ?? 0;
            this.drawSprite(`fire${fi % 3}`, sx, sy - 8);
          }
        },
      });
    }

    for (const n of snap.npcs) {
      const { sx, sy } = toScreen(n.x, n.y);
      if (sy < -80 || sy > h + 80) continue;

      if (n.kind === "dog") {
        const dogKey = (n.dogFrame ?? 0) < 1 ? "dog" : "dog2";
        const flip = n.vx < 0;
        list.push({
          y: n.y,
          draw: () => {
            this.drawSprite(dogKey, sx, sy, { flipX: flip });
            if (n.dogState === "pee") {
              ctx.fillStyle = "rgba(250, 220, 80, 0.55)";
              ctx.beginPath();
              ctx.ellipse(sx + (flip ? -10 : 10), sy + 2, 8, 3, 0, 0, Math.PI * 2);
              ctx.fill();
            }
            if (n.dogState === "woof") {
              ctx.fillStyle = "#fff";
              ctx.strokeStyle = "#333";
              ctx.lineWidth = 1;
              const bx = sx + 10;
              const by = sy - 22;
              ctx.fillRect(bx, by, 36, 14);
              ctx.strokeRect(bx, by, 36, 14);
              ctx.fillStyle = "#111";
              ctx.font = "bold 10px sans-serif";
              ctx.fillText("Woof!", bx + 4, by + 11);
            }
          },
        });
        continue;
      }

      if (n.kind === "beginner") {
        const begKey = Math.floor((n.y / 20) % 2) === 0 ? "beginner" : "beginner2";
        list.push({
          y: n.y,
          draw: () => this.drawSprite(begKey, sx, sy),
        });
        continue;
      }

      const key =
        n.kind === "snowboarder"
          ? n.dir === "downLeft" || n.dir === "left" || n.dir === "hardLeft"
            ? "board_downLeft"
            : n.dir === "downRight" || n.dir === "right" || n.dir === "hardRight"
              ? "board_downRight"
              : "board_down"
          : "npc_skier";
      list.push({
        y: n.y,
        draw: () => this.drawSprite(key, sx, sy),
      });
    }

    if (snap.yeti?.active) {
      const { sx, sy } = toScreen(snap.yeti.x, snap.yeti.y);
      const key = yetiSpriteName(snap.yeti.frame, snap.yeti.eating);
      list.push({
        y: snap.yeti.y,
        draw: () => this.drawSprite(key, sx, sy),
      });
    }

    {
      const p = snap.player;
      const { sx, sy } = toScreen(p.x, p.y);
      const key = playerSpriteName(p.character, p.dir, {
        crashPhase: p.crashPhase,
        airborne: p.airborne > 0,
        flipPose: p.flipPose,
        scootKind: p.scootTimer > 0 ? p.scootKind : "none",
      });
      let bounce = 0;
      if (p.airborne > 0) {
        bounce = -16 * Math.sin(Math.min(1, p.airborne / 0.75) * Math.PI);
      } else if (p.scootTimer > 0) {
        bounce = -5 * Math.sin((p.scootTimer / 0.18) * Math.PI);
      }
      list.push({
        y: p.y + 0.5,
        draw: () => {
          // Snow spray behind feet (drawn first so it sits “under” the skier)
          this.drawSnowSpray(sx, sy);
          ctx.fillStyle = "rgba(0,0,0,0.08)";
          ctx.beginPath();
          ctx.ellipse(sx, sy + 2, 12, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          this.drawSprite(key, sx, sy + bounce);
        },
      });
    }

    list.sort((a, b) => a.y - b.y);
    for (const item of list) item.draw();

    if (snap.mouseX !== null && snap.mouseY !== null) {
      const cur = getOriginalSprite("cursor");
      if (cur) {
        ctx.drawImage(
          cur,
          snap.mouseX,
          snap.mouseY,
          cur.width * CLASSIC_SCALE,
          cur.height * CLASSIC_SCALE,
        );
      }
    }
  }

  dispose() {
    /* noop */
  }
}
