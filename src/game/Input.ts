export class Input {
  private keys = new Set<string>();
  mouseX = 0;
  mouseY = 0;
  mouseInCanvas = false;
  private justPressed = new Set<string>();

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    canvas.addEventListener("mousemove", this.onMouseMove);
    canvas.addEventListener("mouseenter", () => {
      this.mouseInCanvas = true;
    });
    canvas.addEventListener("mouseleave", () => {
      this.mouseInCanvas = false;
    });
    // Prevent browser chrome for game keys
    window.addEventListener("keydown", (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
    });
  }

  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (!this.keys.has(k)) this.justPressed.add(k);
    this.keys.add(k);
    // Track by code for F-keys / numpad (stable even when key is "arrowleft" vs "4")
    const code = e.code.toLowerCase();
    if (!this.keys.has(code)) this.justPressed.add(code);
    this.keys.add(code);
    // Numpad digits also as "numpadN" aliases when browser reports Digit
    if (code.startsWith("numpad")) {
      if (!this.keys.has(code)) this.justPressed.add(code);
      this.keys.add(code);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
    this.keys.delete(e.code.toLowerCase());
  };

  private onMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
  };

  isDown(key: string) {
    return this.keys.has(key.toLowerCase());
  }

  wasPressed(key: string) {
    return this.justPressed.has(key.toLowerCase());
  }

  endFrame() {
    this.justPressed.clear();
  }
}
