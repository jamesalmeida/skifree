import type { GameSnapshot } from "../game/types";
import { CLASSIC_SCALE } from "../game/originalConstants";
import {
  getOriginalSprite,
  playerSpriteName,
  obstacleSpriteName,
  yetiSpriteName,
} from "./originalSprites";

const SNOW = "#ffffff";

export class ClassicRenderer {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;

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

  render(snap: GameSnapshot) {
    const { ctx, w, h } = this;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = SNOW;
    ctx.fillRect(0, 0, w, h);

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
        const flip = n.vx > 0;
        list.push({
          y: n.y,
          draw: () => {
            this.drawSprite(dogKey, sx, sy, { flipX: flip });
            // pee puddle
            if (n.dogState === "pee") {
              ctx.fillStyle = "rgba(250, 220, 80, 0.55)";
              ctx.beginPath();
              ctx.ellipse(sx + (flip ? 10 : -10), sy + 2, 8, 3, 0, 0, Math.PI * 2);
              ctx.fill();
            }
            // woof bubble
            if (n.dogState === "woof") {
              ctx.fillStyle = "#fff";
              ctx.strokeStyle = "#333";
              ctx.lineWidth = 1;
              const bx = sx + 12;
              const by = sy - 28;
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
        // Tiny hop during scoot shuffle
        bounce = -5 * Math.sin((p.scootTimer / 0.18) * Math.PI);
      }
      list.push({
        y: p.y + 0.5,
        draw: () => {
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
