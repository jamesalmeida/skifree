import {
  settings,
  applySettings,
  saveSettings,
  resetSettings,
  type TunableSettings,
} from "../game/originalConstants";
import {
  listSpriteCatalog,
  getOriginalSprite,
  SPRITE_ANIMATIONS,
} from "../render/originalSprites";

type Field = {
  key: keyof TunableSettings;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  kind?: "number" | "bool";
  group: "general" | "motion" | "timing" | "world" | "input";
};

const FIELDS: Field[] = [
  {
    key: "edgeFriction",
    label: "Edge friction",
    hint: "Full left/right coast — lower = longer slide",
    min: 0.5,
    max: 12,
    step: 0.1,
    group: "motion",
  },
  {
    key: "southSpeedMs",
    label: "South speed (m/s)",
    hint: "Tuck (↓) ground speed — classic ~18",
    min: 10,
    max: 30,
    step: 0.5,
    group: "motion",
  },
  {
    key: "jumpSpeedMs",
    label: "Jump speed (m/s)",
    hint: "Peak speed off a ramp — classic ~26–27",
    min: 18,
    max: 40,
    step: 0.5,
    group: "motion",
  },
  {
    key: "carveSpeedScale",
    label: "Carve scale",
    hint: "Two-notch left/right speed scale (base ~6 m/s)",
    min: 0.3,
    max: 1.8,
    step: 0.05,
    group: "motion",
  },
  {
    key: "snowboardSpeedMul",
    label: "Board speed",
    hint: "Snowboarder speed vs skier",
    min: 0.8,
    max: 1.8,
    step: 0.05,
    group: "motion",
  },
  {
    key: "snowboardEdgeMul",
    label: "Board edge",
    hint: "Snowboarder sideways grip",
    min: 0.5,
    max: 1.2,
    step: 0.05,
    group: "motion",
  },
  {
    key: "turnStepMs",
    label: "Turn step (ms)",
    hint: "Delay between direction steps while holding ←/→",
    min: 30,
    max: 200,
    step: 5,
    group: "timing",
  },
  {
    key: "crashMs",
    label: "Crash time (ms)",
    hint: "How long you sit after hitting something",
    min: 400,
    max: 3000,
    step: 50,
    group: "timing",
  },
  {
    key: "jumpMs",
    label: "Jump air @ full speed (ms)",
    hint: "Hangtime when launching at full south speed; slower = shorter air",
    min: 300,
    max: 2000,
    step: 50,
    group: "timing",
  },
  {
    key: "yetiDistanceM",
    label: "Yeti distance (m)",
    hint: "When the monster shows up",
    min: 500,
    max: 5000,
    step: 100,
    group: "world",
  },
  {
    key: "pixelsPerMetre",
    label: "Pixels / metre",
    hint: "Distance & speed HUD scale",
    min: 8,
    max: 32,
    step: 1,
    group: "world",
  },
  {
    key: "classicScale",
    label: "Pixel scale",
    hint: "Classic 2D sprite draw scale",
    min: 1,
    max: 4,
    step: 1,
    group: "world",
  },
  {
    key: "mouseDeadZone",
    label: "Mouse dead-zone",
    hint: "Center px that still count as south",
    min: 0,
    max: 80,
    step: 1,
    group: "input",
  },
  {
    key: "mouseHardZone",
    label: "Mouse hard edge",
    hint: "Px from center for full west/east",
    min: 40,
    max: 300,
    step: 4,
    group: "input",
  },
  {
    key: "enhancedAnimations",
    label: "Enhanced animations",
    hint: "Particle snow spray when tucking south (off = classic sprite-only)",
    min: 0,
    max: 1,
    step: 1,
    kind: "bool",
    group: "general",
  },
  {
    key: "showDirDebug",
    label: "Show Dir debug",
    hint: "HUD line with dir / vx / vy",
    min: 0,
    max: 1,
    step: 1,
    kind: "bool",
    group: "general",
  },
];

const GROUP_LABELS: Record<Field["group"], string> = {
  general: "Options",
  motion: "Motion & speed",
  timing: "Timing",
  world: "World & display",
  input: "Mouse",
};

type TabId = "general" | "feel" | "sprites";

export function initSettingsPanel(onChange?: () => void) {
  const gears = document.querySelectorAll<HTMLButtonElement>(".settings-gear");
  const panel = document.getElementById("settings-panel")!;
  const closeBtn = document.getElementById("settings-close")!;
  const resetBtn = document.getElementById("settings-reset")!;
  const backdrop = document.getElementById("settings-backdrop")!;
  const generalRoot = document.getElementById("settings-general")!;
  const feelRoot = document.getElementById("settings-feel")!;
  const spritesRoot = document.getElementById("settings-sprites")!;
  const tabGeneral = document.getElementById("tab-general")!;
  const tabFeel = document.getElementById("tab-feel")!;
  const tabSprites = document.getElementById("tab-sprites")!;
  const titleEl = document.getElementById("settings-title")!;

  let activeTab: TabId = "general";
  let animRaf = 0;
  let animRunning = false;

  /** Per-animation card state (survives re-render within session via Map by id) */
  type AnimUiState = { paused: boolean; frame: number };
  const animState = new Map<string, AnimUiState>();

  function getAnimState(id: string): AnimUiState {
    let s = animState.get(id);
    if (!s) {
      s = { paused: false, frame: 0 };
      animState.set(id, s);
    }
    return s;
  }

  function appendFieldGroups(
    root: HTMLElement,
    groupIds: Field["group"][],
    clear = true,
  ) {
    if (clear) {
      // Keep intro paragraph if present
      const intro = root.querySelector(".settings-intro");
      root.innerHTML = "";
      if (intro) root.appendChild(intro);
    }
    for (const g of groupIds) {
      if (!FIELDS.some((f) => f.group === g)) continue;
      const section = document.createElement("section");
      section.className = "settings-section";
      section.innerHTML = `<h3 class="settings-section-title">${GROUP_LABELS[g]}</h3>`;
      const body = document.createElement("div");
      body.className = "settings-section-body";
      for (const f of FIELDS.filter((x) => x.group === g)) {
        body.appendChild(buildFieldRow(f, onChange));
      }
      section.appendChild(body);
      root.appendChild(section);
    }
  }

  // ── Build Settings (general) + Game feel tabs ──
  appendFieldGroups(generalRoot, ["general"]);
  appendFieldGroups(feelRoot, ["motion", "timing", "world", "input"]);

  // ── Build Sprites tab (filled on open so preload is done) ──
  function buildSpriteBrowser() {
    spritesRoot.innerHTML = "";

    // Animations
    const animSection = document.createElement("section");
    animSection.className = "settings-section";
    animSection.innerHTML = `<h3 class="settings-section-title">Animations</h3>
      <p class="settings-hint settings-section-hint">Pause, step frames with ◀ ▶, then Copy to report a frame.</p>`;
    const animGrid = document.createElement("div");
    animGrid.className = "sprite-grid sprite-grid-anim";
    for (const anim of SPRITE_ANIMATIONS) {
      const st = getAnimState(anim.id);
      if (st.frame >= anim.keys.length) st.frame = 0;
      const card = document.createElement("div");
      card.className = "sprite-card sprite-card-anim" + (st.paused ? " is-paused" : "");
      card.dataset.animId = anim.id;
      card.innerHTML = `
        <canvas class="sprite-canvas" width="96" height="96"></canvas>
        <div class="sprite-meta">
          <div class="sprite-key">${anim.label}</div>
          <div class="sprite-file anim-frame-label"></div>
          <div class="sprite-dim">${anim.fps} fps · ${anim.keys.length} frames</div>
          <div class="sprite-controls">
            <button type="button" class="sprite-btn sprite-prev" title="Previous frame">◀</button>
            <button type="button" class="sprite-btn sprite-pause" title="Pause / play">${st.paused ? "▶" : "⏸"}</button>
            <button type="button" class="sprite-btn sprite-next" title="Next frame">▶</button>
            <button type="button" class="sprite-btn sprite-copy" title="Copy name">Copy</button>
          </div>
        </div>`;
      animGrid.appendChild(card);

      const canvas = card.querySelector("canvas") as HTMLCanvasElement;
      const frameLabel = card.querySelector(".anim-frame-label") as HTMLElement;
      const btnPause = card.querySelector(".sprite-pause") as HTMLButtonElement;
      const btnPrev = card.querySelector(".sprite-prev") as HTMLButtonElement;
      const btnNext = card.querySelector(".sprite-next") as HTMLButtonElement;
      const btnCopy = card.querySelector(".sprite-copy") as HTMLButtonElement;

      const refresh = () => {
        const fi = ((st.frame % anim.keys.length) + anim.keys.length) % anim.keys.length;
        st.frame = fi;
        const key = anim.keys[fi] ?? anim.keys[0]!;
        card.dataset.currentKey = key;
        card.dataset.currentFrame = String(fi + 1);
        drawSpriteOnCanvas(canvas, key);
        frameLabel.textContent = st.paused
          ? `[${fi + 1}/${anim.keys.length}] ${key}`
          : anim.keys.join(" → ");
        btnPause.textContent = st.paused ? "▶" : "⏸";
        card.classList.toggle("is-paused", st.paused);
        btnPrev.disabled = !st.paused;
        btnNext.disabled = !st.paused;
      };
      refresh();

      btnPause.addEventListener("click", (e) => {
        e.stopPropagation();
        st.paused = !st.paused;
        refresh();
      });
      btnPrev.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!st.paused) return;
        st.frame = (st.frame - 1 + anim.keys.length) % anim.keys.length;
        refresh();
      });
      btnNext.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!st.paused) return;
        st.frame = (st.frame + 1) % anim.keys.length;
        refresh();
      });
      btnCopy.addEventListener("click", async (e) => {
        e.stopPropagation();
        // Always copy what is actually on the canvas (dataset kept in sync)
        const key = card.dataset.currentKey ?? anim.keys[st.frame] ?? anim.keys[0]!;
        const frameNum = card.dataset.currentFrame ?? String(st.frame + 1);
        const text = st.paused
          ? `${anim.id}:${key} (frame ${frameNum}/${anim.keys.length})`
          : anim.id;
        await copyText(text, btnCopy);
      });
    }
    animSection.appendChild(animGrid);
    spritesRoot.appendChild(animSection);

    // All keys
    const cat = listSpriteCatalog();
    const allSection = document.createElement("section");
    allSection.className = "settings-section";
    allSection.innerHTML = `<h3 class="settings-section-title">All sprites (${cat.length})</h3>
      <p class="settings-hint settings-section-hint">Logical key → source file. Flipped = horizontal mirror.</p>`;
    const grid = document.createElement("div");
    grid.className = "sprite-grid";
    for (const e of cat) {
      const card = document.createElement("div");
      card.className = "sprite-card" + (e.loaded ? "" : " sprite-missing");
      card.innerHTML = `
        <canvas class="sprite-canvas" width="72" height="72" data-key="${e.key}"></canvas>
        <div class="sprite-meta">
          <div class="sprite-key">${e.key}${e.flipped ? " ⟷" : ""}</div>
          <div class="sprite-file">${e.file}</div>
          <div class="sprite-dim">${e.loaded ? `${e.width}×${e.height}` : "missing"}</div>
          <div class="sprite-controls">
            <button type="button" class="sprite-btn sprite-copy" title="Copy name">Copy</button>
          </div>
        </div>`;
      grid.appendChild(card);
      const canvas = card.querySelector("canvas") as HTMLCanvasElement;
      drawSpriteOnCanvas(canvas, e.key);
      const btnCopy = card.querySelector(".sprite-copy") as HTMLButtonElement;
      btnCopy.addEventListener("click", async (ev) => {
        ev.stopPropagation();
        await copyText(e.key, btnCopy);
      });
    }
    allSection.appendChild(grid);
    spritesRoot.appendChild(allSection);
  }

  function drawSpriteOnCanvas(canvas: HTMLCanvasElement, key: string) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const s = 8;
    for (let y = 0; y < canvas.height; y += s) {
      for (let x = 0; x < canvas.width; x += s) {
        ctx.fillStyle = (x / s + y / s) % 2 === 0 ? "#e2e8f0" : "#cbd5e0";
        ctx.fillRect(x, y, s, s);
      }
    }
    const img = getOriginalSprite(key);
    if (!img) {
      ctx.fillStyle = "#a0aec0";
      ctx.font = "10px sans-serif";
      ctx.fillText("?", canvas.width / 2 - 4, canvas.height / 2 + 4);
      return;
    }
    const scale = Math.min(
      (canvas.width - 8) / img.width,
      (canvas.height - 8) / img.height,
      4,
    );
    const dw = Math.max(1, Math.floor(img.width * scale));
    const dh = Math.max(1, Math.floor(img.height * scale));
    const dx = Math.floor((canvas.width - dw) / 2);
    const dy = Math.floor((canvas.height - dh) / 2);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function tickAnims(t: number) {
    if (!animRunning) return;
    const cards = spritesRoot.querySelectorAll<HTMLElement>(".sprite-card-anim");
    for (const card of cards) {
      const id = card.dataset.animId;
      if (!id) continue;
      const anim = SPRITE_ANIMATIONS.find((a) => a.id === id);
      if (!anim || anim.keys.length === 0) continue;
      const st = getAnimState(id);
      if (st.paused) continue; // leave frozen frame
      const canvas = card.querySelector("canvas") as HTMLCanvasElement;
      const frameLabel = card.querySelector(".anim-frame-label") as HTMLElement | null;
      st.frame = Math.floor((t / 1000) * anim.fps) % anim.keys.length;
      const key = anim.keys[st.frame]!;
      card.dataset.currentKey = key;
      card.dataset.currentFrame = String(st.frame + 1);
      drawSpriteOnCanvas(canvas, key);
      if (frameLabel) frameLabel.textContent = anim.keys.join(" → ");
    }
    animRaf = requestAnimationFrame(tickAnims);
  }

  function startAnims() {
    if (animRunning) return;
    animRunning = true;
    animRaf = requestAnimationFrame(tickAnims);
  }
  function stopAnims() {
    animRunning = false;
    cancelAnimationFrame(animRaf);
  }

  async function copyText(text: string, btn: HTMLButtonElement) {
    try {
      await navigator.clipboard.writeText(text);
      const prev = btn.textContent;
      btn.textContent = "Copied!";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.textContent = prev;
        btn.classList.remove("copied");
      }, 900);
    } catch {
      btn.textContent = "Failed";
      setTimeout(() => {
        btn.textContent = "Copy";
      }, 900);
    }
  }

  function setTab(tab: TabId) {
    activeTab = tab;
    tabGeneral.classList.toggle("active", tab === "general");
    tabFeel.classList.toggle("active", tab === "feel");
    tabSprites.classList.toggle("active", tab === "sprites");
    generalRoot.classList.toggle("hidden", tab !== "general");
    feelRoot.classList.toggle("hidden", tab !== "feel");
    spritesRoot.classList.toggle("hidden", tab !== "sprites");
    // Modal title always "Settings" — do not mirror the active tab name
    titleEl.textContent = "Settings";
    resetBtn.style.display = tab === "feel" ? "" : "none";
    if (tab === "sprites") {
      buildSpriteBrowser();
      startAnims();
    } else {
      stopAnims();
    }
  }

  tabGeneral.addEventListener("click", () => setTab("general"));
  tabFeel.addEventListener("click", () => setTab("feel"));
  tabSprites.addEventListener("click", () => setTab("sprites"));

  function open() {
    panel.classList.remove("hidden");
    backdrop.classList.remove("hidden");
    syncInputs();
    setTab(activeTab);
  }
  function close() {
    panel.classList.add("hidden");
    backdrop.classList.add("hidden");
    stopAnims();
    saveSettings();
  }

  function syncInputs() {
    for (const f of FIELDS) {
      const input = document.getElementById(`set-${f.key}`) as HTMLInputElement | null;
      if (!input) continue;
      if (f.kind === "bool") {
        input.checked = Boolean(settings[f.key]);
      } else {
        input.value = String(settings[f.key]);
        const span = document.getElementById(`set-val-${f.key}`);
        if (span) span.textContent = formatVal(Number(settings[f.key]), f.step);
      }
    }
  }

  gears.forEach((gear) => {
    gear.addEventListener("click", (e) => {
      e.stopPropagation();
      open();
    });
  });
  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);
  resetBtn.addEventListener("click", () => {
    resetSettings();
    syncInputs();
    onChange?.();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.classList.contains("hidden")) {
      e.stopPropagation();
      close();
    }
  });
}

function buildFieldRow(f: Field, onChange?: () => void): HTMLElement {
  const row = document.createElement("div");
  row.className = "settings-row";
  if (f.kind === "bool") {
    row.innerHTML = `
      <div class="settings-row-head">
        <label for="set-${f.key}">${f.label}</label>
        <input type="checkbox" id="set-${f.key}" ${settings[f.key] ? "checked" : ""} />
      </div>
      <p class="settings-hint">${f.hint}</p>`;
    const input = row.querySelector("input") as HTMLInputElement;
    input.addEventListener("change", () => {
      if (f.key === "showDirDebug") settings.showDirDebug = input.checked;
      else if (f.key === "enhancedAnimations") settings.enhancedAnimations = input.checked;
      saveSettings();
      onChange?.();
    });
  } else {
    const val = Number(settings[f.key]);
    row.innerHTML = `
      <div class="settings-row-head">
        <label for="set-${f.key}">${f.label}</label>
        <span class="settings-val" id="set-val-${f.key}">${formatVal(val, f.step)}</span>
      </div>
      <input type="range" id="set-${f.key}" min="${f.min}" max="${f.max}" step="${f.step}" value="${val}" />
      <p class="settings-hint">${f.hint}</p>`;
    const input = row.querySelector("input") as HTMLInputElement;
    const span = row.querySelector(`#set-val-${f.key}`) as HTMLElement;
    input.addEventListener("input", () => {
      const v = Number(input.value);
      span.textContent = formatVal(v, f.step);
      setNumeric(f.key, v);
      applySettings();
      onChange?.();
    });
    input.addEventListener("change", () => {
      saveSettings();
    });
  }
  return row;
}

function formatVal(v: number, step: number) {
  if (step >= 1) return String(Math.round(v));
  const decimals = String(step).split(".")[1]?.length ?? 1;
  return v.toFixed(decimals);
}

function setNumeric(key: keyof TunableSettings, v: number) {
  switch (key) {
    case "pixelsPerMetre":
      settings.pixelsPerMetre = v;
      break;
    case "yetiDistanceM":
      settings.yetiDistanceM = v;
      break;
    case "edgeFriction":
      settings.edgeFriction = v;
      break;
    case "southSpeedMs":
      settings.southSpeedMs = v;
      break;
    case "jumpSpeedMs":
      settings.jumpSpeedMs = v;
      break;
    case "carveSpeedScale":
      settings.carveSpeedScale = v;
      break;
    case "snowboardSpeedMul":
      settings.snowboardSpeedMul = v;
      break;
    case "snowboardEdgeMul":
      settings.snowboardEdgeMul = v;
      break;
    case "crashMs":
      settings.crashMs = v;
      break;
    case "jumpMs":
      settings.jumpMs = v;
      break;
    case "turnStepMs":
      settings.turnStepMs = v;
      break;
    case "classicScale":
      settings.classicScale = v;
      break;
    case "mouseDeadZone":
      settings.mouseDeadZone = v;
      break;
    case "mouseHardZone":
      settings.mouseHardZone = v;
      break;
    default:
      break;
  }
}
