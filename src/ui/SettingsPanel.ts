import {
  DEFAULT_SETTINGS,
  settings,
  applySettings,
  saveSettings,
  resetSettings,
  type TunableSettings,
} from "../game/originalConstants";

type Field = {
  key: keyof TunableSettings;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  kind?: "number" | "bool";
};

const FIELDS: Field[] = [
  {
    key: "edgeFriction",
    label: "Edge friction",
    hint: "Full left/right coast — lower = longer slide",
    min: 0.5,
    max: 12,
    step: 0.1,
  },
  {
    key: "southSpeed",
    label: "South speed",
    hint: "Tuck (↓) speed in px/s",
    min: 60,
    max: 320,
    step: 5,
  },
  {
    key: "carveSpeedScale",
    label: "Carve scale",
    hint: "wsWest / esEast speed multiplier",
    min: 0.3,
    max: 1.8,
    step: 0.05,
  },
  {
    key: "turnStepMs",
    label: "Turn step (ms)",
    hint: "Delay between direction steps while holding ←/→",
    min: 30,
    max: 200,
    step: 5,
  },
  {
    key: "crashMs",
    label: "Crash time (ms)",
    hint: "How long you sit after hitting something",
    min: 400,
    max: 3000,
    step: 50,
  },
  {
    key: "jumpMs",
    label: "Jump air (ms)",
    hint: "Air time off ramps",
    min: 300,
    max: 2000,
    step: 50,
  },
  {
    key: "yetiDistanceM",
    label: "Yeti distance (m)",
    hint: "When the monster shows up",
    min: 500,
    max: 5000,
    step: 100,
  },
  {
    key: "pixelsPerMetre",
    label: "Pixels / metre",
    hint: "Distance & speed HUD scale",
    min: 8,
    max: 32,
    step: 1,
  },
  {
    key: "classicScale",
    label: "Pixel scale",
    hint: "Classic 2D sprite draw scale",
    min: 1,
    max: 4,
    step: 1,
  },
  {
    key: "mouseDeadZone",
    label: "Mouse dead-zone",
    hint: "Center px that still count as south",
    min: 0,
    max: 80,
    step: 1,
  },
  {
    key: "mouseHardZone",
    label: "Mouse hard edge",
    hint: "Px from center for full west/east",
    min: 40,
    max: 300,
    step: 4,
  },
  {
    key: "snowboardSpeedMul",
    label: "Board speed",
    hint: "Snowboarder speed vs skier",
    min: 0.8,
    max: 1.8,
    step: 0.05,
  },
  {
    key: "snowboardEdgeMul",
    label: "Board edge",
    hint: "Snowboarder sideways grip",
    min: 0.5,
    max: 1.2,
    step: 0.05,
  },
  {
    key: "showDirDebug",
    label: "Show Dir debug",
    hint: "HUD line with dir / vx / vy",
    min: 0,
    max: 1,
    step: 1,
    kind: "bool",
  },
];

export function initSettingsPanel(onChange?: () => void) {
  const gear = document.getElementById("settings-gear")!;
  const panel = document.getElementById("settings-panel")!;
  const body = document.getElementById("settings-fields")!;
  const closeBtn = document.getElementById("settings-close")!;
  const resetBtn = document.getElementById("settings-reset")!;
  const backdrop = document.getElementById("settings-backdrop")!;

  body.innerHTML = "";
  for (const f of FIELDS) {
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
        settings.showDirDebug = input.checked;
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
    body.appendChild(row);
  }

  function open() {
    panel.classList.remove("hidden");
    backdrop.classList.remove("hidden");
    syncInputs();
  }
  function close() {
    panel.classList.add("hidden");
    backdrop.classList.add("hidden");
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

  gear.addEventListener("click", (e) => {
    e.stopPropagation();
    open();
  });
  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);
  resetBtn.addEventListener("click", () => {
    resetSettings();
    syncInputs();
    onChange?.();
  });

  // Esc closes settings when open
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.classList.contains("hidden")) {
      e.stopPropagation();
      close();
    }
  });
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
    case "southSpeed":
      settings.southSpeed = v;
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

export { DEFAULT_SETTINGS };
