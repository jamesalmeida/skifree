const TAP_MAX_MOVE_PX = 14;
const TAP_MAX_MS = 320;

function isUiTarget(t: EventTarget | null): boolean {
  if (!(t instanceof Element)) return false;
  return Boolean(
    t.closest(
      "button, a, input, textarea, select, label, #menu, #settings-panel, #settings-backdrop, #pause-overlay, #gameover-overlay",
    ),
  );
}

/**
 * Keyboard + mouse + touch.
 * Touch: drag to steer (finger position vs screen center), quick tap to jump/flip.
 */
export class Input {
  private keys = new Set<string>();
  mouseX = 0;
  mouseY = 0;
  /** Mouse cursor over playfield, or finger currently down for steering */
  mouseInCanvas = false;
  /** True while a touch/pen pointer is down on the playfield (steering). */
  touchSteering = false;
  private justPressed = new Set<string>();
  private mouseJustClicked = false;
  private touchTap = false;

  private activePointerId: number | null = null;
  private pointerType: string | null = null;
  private downX = 0;
  private downY = 0;
  private downAt = 0;
  private moved = false;

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("keydown", this.preventArrowScroll);

    // Pointer events on window so 3D canvas / fullscreen still receive input
    window.addEventListener("pointerdown", this.onPointerDown, { passive: false });
    window.addEventListener("pointermove", this.onPointerMove, { passive: false });
    window.addEventListener("pointerup", this.onPointerUp, { passive: false });
    window.addEventListener("pointercancel", this.onPointerUp, { passive: false });

    // Desktop mouse hover tracking (steer without button held)
    canvas.addEventListener("mousemove", this.onMouseHoverMove);
    canvas.addEventListener("mouseenter", () => {
      if (this.activePointerId === null) this.mouseInCanvas = true;
    });
    canvas.addEventListener("mouseleave", () => {
      if (this.activePointerId === null && !this.touchSteering) {
        this.mouseInCanvas = false;
      }
    });
  }

  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("keydown", this.preventArrowScroll);
    window.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
  }

  private preventArrowScroll = (e: KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
      e.preventDefault();
    }
  };

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (!this.keys.has(k)) this.justPressed.add(k);
    this.keys.add(k);
    const code = e.code.toLowerCase();
    if (!this.keys.has(code)) this.justPressed.add(code);
    this.keys.add(code);
    if (code.startsWith("numpad")) {
      if (!this.keys.has(code)) this.justPressed.add(code);
      this.keys.add(code);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
    this.keys.delete(e.code.toLowerCase());
  };

  private playfieldPoint(clientX: number, clientY: number) {
    // Canvases are fullscreen; use viewport coords (matches clientWidth origin math)
    return { x: clientX, y: clientY };
  }

  private onMouseHoverMove = (e: MouseEvent) => {
    if (this.activePointerId !== null) return;
    const p = this.playfieldPoint(e.clientX, e.clientY);
    this.mouseX = p.x;
    this.mouseY = p.y;
    this.mouseInCanvas = true;
  };

  private onPointerDown = (e: PointerEvent) => {
    if (isUiTarget(e.target)) return;
    if (this.activePointerId !== null) return;

    // Only capture playfield presses (not when menu/pause is the intent — those are UI)
    const menu = document.getElementById("menu");
    const pause = document.getElementById("pause-overlay");
    const over = document.getElementById("gameover-overlay");
    if (menu && !menu.classList.contains("hidden")) return;
    if (pause && !pause.classList.contains("hidden")) return;
    if (over && !over.classList.contains("hidden")) return;

    this.activePointerId = e.pointerId;
    this.pointerType = e.pointerType;
    this.downX = e.clientX;
    this.downY = e.clientY;
    this.downAt = performance.now();
    this.moved = false;

    const p = this.playfieldPoint(e.clientX, e.clientY);
    this.mouseX = p.x;
    this.mouseY = p.y;
    this.mouseInCanvas = true;

    if (e.pointerType === "touch" || e.pointerType === "pen") {
      this.touchSteering = true;
      e.preventDefault();
    } else if (e.pointerType === "mouse" && e.button === 0) {
      // Desktop click-to-jump (same as before)
      this.mouseJustClicked = true;
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerId !== this.activePointerId) return;

    const dx = e.clientX - this.downX;
    const dy = e.clientY - this.downY;
    if (dx * dx + dy * dy > TAP_MAX_MOVE_PX * TAP_MAX_MOVE_PX) {
      this.moved = true;
    }

    const p = this.playfieldPoint(e.clientX, e.clientY);
    this.mouseX = p.x;
    this.mouseY = p.y;
    this.mouseInCanvas = true;

    if (e.pointerType === "touch" || e.pointerType === "pen") {
      e.preventDefault();
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== this.activePointerId) return;

    const elapsed = performance.now() - this.downAt;
    const isTouch = this.pointerType === "touch" || this.pointerType === "pen";

    if (isTouch && !this.moved && elapsed <= TAP_MAX_MS) {
      this.touchTap = true;
    }

    this.activePointerId = null;
    this.pointerType = null;
    this.touchSteering = false;

    // After touch lift, stop steering updates (hold last ski notch in physics)
    if (isTouch) {
      this.mouseInCanvas = false;
      e.preventDefault();
    }
  };

  isDown(key: string) {
    return this.keys.has(key.toLowerCase());
  }

  wasPressed(key: string) {
    return this.justPressed.has(key.toLowerCase());
  }

  /** Space, left-click, or a quick touch tap */
  jumpPressed() {
    return (
      this.wasPressed(" ") ||
      this.wasPressed("space") ||
      this.wasPressed("spacebar") ||
      this.mouseJustClicked ||
      this.touchTap
    );
  }

  endFrame() {
    this.justPressed.clear();
    this.mouseJustClicked = false;
    this.touchTap = false;
  }
}

/** Prefer touch-first UI (pause button, default mouse/touch steer). */
export function prefersTouchUi(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) return true;
  return navigator.maxTouchPoints > 0 && window.matchMedia("(pointer: coarse)").matches;
}
