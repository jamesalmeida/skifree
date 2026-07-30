import "./style.css";
import { Game } from "./game/Game";
import { prefersTouchUi } from "./game/Input";
import type { CharacterType, ControlScheme, GameMode, GraphicsMode } from "./game/types";
import { SHOW_DIR_DEBUG } from "./game/originalConstants";
import { ClassicRenderer } from "./render/ClassicRenderer";
import { Renderer3D } from "./render/Renderer3D";
import { preloadOriginalSprites } from "./render/originalSprites";
import { initSettingsPanel } from "./ui/SettingsPanel";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const canvas3d = document.createElement("canvas");
canvas3d.id = "game3d";
canvas3d.style.cssText =
  "position:fixed;inset:0;width:100%;height:100%;display:none;cursor:none;";
document.getElementById("app")!.insertBefore(canvas3d, canvas);

const menu = document.getElementById("menu")!;
const hud = document.getElementById("hud")!;
const pauseOverlay = document.getElementById("pause-overlay")!;
const gameoverOverlay = document.getElementById("gameover-overlay")!;
const toastEl = document.getElementById("hud-toast")!;

const statTime = document.getElementById("stat-time")!;
const statDist = document.getElementById("stat-dist")!;
const statSpeed = document.getElementById("stat-speed")!;
const statStyle = document.getElementById("stat-style")!;
const statDir = document.getElementById("stat-dir")!;
const charHint = document.getElementById("char-hint")!;

const gameoverTitle = document.getElementById("gameover-title")!;
const gameoverMsg = document.getElementById("gameover-msg")!;
const gameoverStats = document.getElementById("gameover-stats")!;

const CONTROLS_KEY = "skifree-controls";
const touchUi = prefersTouchUi();

let mode: GameMode = "freestyle";
let character: CharacterType = "skier";
let graphics: GraphicsMode = "classic";
let controls: ControlScheme = touchUi
  ? "mouse"
  : localStorage.getItem(CONTROLS_KEY) === "mouse"
    ? "mouse"
    : "keyboard";

const game = new Game(canvas, { mode, character, graphics, controls });
const classic = new ClassicRenderer(canvas);
const modern = new Renderer3D(canvas3d);
const hudPauseBtn = document.getElementById("hud-pause")!;

function bindOptionRow<T extends string>(
  rowId: string,
  attr: string,
  onPick: (v: T) => void,
) {
  const row = document.getElementById(rowId)!;
  row.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest(
      "button[data-" + attr + "]",
    ) as HTMLElement | null;
    if (!btn) return;
    row.querySelectorAll(".opt").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    onPick(btn.getAttribute("data-" + attr) as T);
  });
}

bindOptionRow<GameMode>("mode-row", "mode", (v) => {
  mode = v;
  game.setMode(v);
});
bindOptionRow<CharacterType>("char-row", "char", (v) => {
  character = v;
  charHint.textContent =
    v === "snowboarder"
      ? "Ride the board: snappier edges, more air, style bonus."
      : "Classic two-ski control (original sprites from SKI.EXE).";
  game.setCharacter(v);
});
bindOptionRow<GraphicsMode>("gfx-row", "gfx", (v) => {
  applyGraphics(v);
});

const controlsHints = [
  document.getElementById("controls-hint")!,
  document.getElementById("pause-controls-hint")!,
];
const controlsHelps = [
  document.getElementById("controls-help")!,
  document.getElementById("pause-controls-help")!,
];

function applyControlsUi(scheme: ControlScheme) {
  controls = scheme;
  if (!touchUi) localStorage.setItem(CONTROLS_KEY, scheme);
  game.config.controls = scheme;
  document
    .querySelectorAll("#controls-row .opt, #pause-controls-row .opt")
    .forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-controls") === scheme);
    });
  let hint: string;
  let help: string;
  if (touchUi) {
    hint = "Drag to steer · tap to jump / flip. Pause button top-left.";
    help = `
      <p>Touch · drag to steer · tap to jump / flip</p>
      <p>Use ⏸ to pause or return to the main menu</p>`;
  } else if (scheme === "mouse") {
    hint = "Pointer steers; click or Space to jump; ↑ in air for backflips.";
    help = `
      <p>Mouse · steer · click / <kbd>Space</kbd> jump · <kbd>↑</kbd> air flip</p>
      <p><kbd>F</kbd> turbo · <kbd>F2</kbd> restart · <kbd>F3</kbd> / <kbd>P</kbd> pause · <kbd>G</kbd> gfx · <kbd>C</kbd> char</p>`;
  } else {
    hint = "Arrow keys / WASD / numpad · Space to jump.";
    help = `
      <p><kbd>←</kbd><kbd>→</kbd> / <kbd>A</kbd><kbd>D</kbd> steer · <kbd>↑</kbd> brake / flip · <kbd>↓</kbd> / <kbd>S</kbd> tuck · <kbd>Space</kbd> jump</p>
      <p><kbd>F</kbd> turbo · <kbd>F2</kbd> restart · <kbd>F3</kbd> / <kbd>P</kbd> pause · <kbd>G</kbd> gfx · <kbd>C</kbd> char</p>`;
  }
  for (const el of controlsHints) el.textContent = hint;
  for (const el of controlsHelps) el.innerHTML = help;
}

bindOptionRow<ControlScheme>("controls-row", "controls", (v) => {
  applyControlsUi(v);
});
bindOptionRow<ControlScheme>("pause-controls-row", "controls", (v) => {
  applyControlsUi(v);
});
applyControlsUi(controls);

function applyDirDebugVisibility() {
  const el = document.querySelector("#stats .dir-debug") as HTMLElement | null;
  if (el) el.style.display = SHOW_DIR_DEBUG ? "" : "none";
}

initSettingsPanel(() => {
  applyDirDebugVisibility();
});
applyDirDebugVisibility();

function formatTime(ms: number) {
  const totalCs = Math.floor(ms / 10);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}:${String(mm).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  classic.resize(window.innerWidth, window.innerHeight, dpr);
  modern.resize(window.innerWidth, window.innerHeight, dpr);
}

function applyGraphics(g: GraphicsMode) {
  graphics = g;
  game.setGraphics(g);
  const is3d = g === "3d";
  canvas.style.display = is3d ? "none" : "block";
  canvas3d.style.display = is3d ? "block" : "none";
  modern.setActive(is3d);
  document.querySelectorAll("#gfx-row .opt").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("data-gfx") === g);
  });
}

function syncUi() {
  const snap = game.snapshot();
  const playing = snap.state === "playing" || snap.state === "paused";
  const eatenOrFinished = snap.state === "eaten" || snap.state === "finished";

  menu.classList.toggle("hidden", snap.state !== "menu");
  // Keep HUD visible while yeti celebrates (eaten)
  hud.classList.toggle("hidden", !playing && snap.state !== "eaten");
  pauseOverlay.classList.toggle("hidden", snap.state !== "paused");
  hudPauseBtn.classList.toggle(
    "hidden",
    !touchUi || snap.state !== "playing",
  );

  const showOver = eatenOrFinished;
  gameoverOverlay.classList.toggle("hidden", !showOver);

  if (playing || showOver) {
    statTime.textContent = formatTime(snap.timeMs);
    statDist.textContent = String(Math.trunc(snap.distance));
    statSpeed.textContent = snap.speed.toFixed(0);
    statStyle.textContent = String(snap.style);
  }

  if (snap.message) {
    toastEl.textContent = snap.message;
    toastEl.classList.add("show");
  } else {
    toastEl.classList.remove("show");
  }

  if (snap.state === "eaten") {
    gameoverTitle.textContent = "Yummy!";
    gameoverMsg.textContent = "The Abominable Snow Monster got you.";
    gameoverStats.innerHTML = `Distance: ${Math.trunc(snap.distance)}m<br>Style: ${snap.style}<br>Time: ${formatTime(snap.timeMs)}`;
  } else if (snap.state === "finished") {
    gameoverTitle.textContent = "Finish!";
    gameoverMsg.textContent = "You cleared the course.";
    gameoverStats.innerHTML = `Time: ${formatTime(snap.timeMs)}<br>Style: ${snap.style}<br>Gates: ${snap.gatesPassed}/${snap.gatesTotal}${
      snap.gatesMissed ? `<br>Missed: ${snap.gatesMissed} (+${(snap.penaltyMs / 1000).toFixed(0)}s)` : ""
    }`;
  }

  if (snap.graphics !== graphics) {
    applyGraphics(snap.graphics);
  }
}

game.setOnChange(syncUi);

document.getElementById("start-btn")!.addEventListener("click", () => {
  applyGraphics(graphics);
  game.start({ mode, character, graphics, controls });
  syncUi();
});

document.getElementById("resume-btn")!.addEventListener("click", () => {
  game.togglePause();
  syncUi();
});

hudPauseBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (game.state === "playing") {
    game.togglePause();
    syncUi();
  }
});

document.getElementById("menu-btn")!.addEventListener("click", () => {
  game.goMenu();
  syncUi();
});

document.getElementById("retry-btn")!.addEventListener("click", () => {
  applyGraphics(graphics);
  game.start({ mode, character, graphics, controls });
  syncUi();
});

document.getElementById("gameover-menu-btn")!.addEventListener("click", () => {
  game.goMenu();
  syncUi();
});

window.addEventListener("resize", resize);

async function boot() {
  const startBtn = document.getElementById("start-btn") as HTMLButtonElement;
  startBtn.disabled = true;
  startBtn.textContent = "Loading sprites…";
  try {
    await preloadOriginalSprites();
  } catch (e) {
    console.error(e);
  }
  startBtn.disabled = false;
  startBtn.textContent = "Start run";
  resize();
  applyGraphics("classic");
  syncUi();

  function frame(now: number) {
    game.tick(now);
    const snap = game.snapshot();

    if (snap.state === "playing" || snap.state === "paused" || snap.state === "eaten") {
      statTime.textContent = formatTime(snap.timeMs);
      statDist.textContent = String(Math.trunc(snap.distance));
      statSpeed.textContent = snap.speed.toFixed(0);
      statStyle.textContent = String(snap.style);
      if (snap.state !== "eaten") {
        statDir.textContent = `${snap.player.dir}  vx=${snap.player.vx.toFixed(0)} vy=${snap.player.vy.toFixed(0)}`;
      }
      if (snap.message) {
        toastEl.textContent = snap.message;
        toastEl.classList.add("show");
      } else {
        toastEl.classList.remove("show");
      }
    }

    if (snap.state === "eaten" || snap.state === "finished") {
      if (gameoverOverlay.classList.contains("hidden")) syncUi();
    }

    // Always render — including menu attract-mode demo behind the panel
    if (snap.graphics === "3d") {
      modern.render(snap);
    } else {
      classic.render(snap);
    }

    if (snap.graphics !== graphics) applyGraphics(snap.graphics);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

boot();
