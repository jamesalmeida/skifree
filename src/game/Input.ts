export class Input {
  private keys = new Set<string>();
  mouseX = 0;
  mouseY = 0;
  mouseInCanvas = false;
  private justPressed = new Set<string>();
  private mouseJustClicked = false;

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    canvas.addEventListener("mousemove", this.onMouseMove);
    canvas.addEventListener("mousedown", this.onMouseDown);
    canvas.addEventListener("mouseenter", () => {
      this.mouseInCanvas = true;
    });
    canvas.addEventListener("mouseleave", () => {
      this.mouseInCanvas = false;
    });
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

  private onMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) this.mouseJustClicked = true;
  };

  isDown(key: string) {
    return this.keys.has(key.toLowerCase());
  }

  wasPressed(key: string) {
    return this.justPressed.has(key.toLowerCase());
  }

  /** Space or left-click this frame */
  jumpPressed() {
    return (
      this.wasPressed(" ") ||
      this.wasPressed("space") ||
      this.wasPressed("spacebar") ||
      this.mouseJustClicked
    );
  }

  endFrame() {
    this.justPressed.clear();
    this.mouseJustClicked = false;
  }
}
