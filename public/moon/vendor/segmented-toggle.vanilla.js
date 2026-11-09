// src/core.ts
function createSegmentedToggle(opts) {
  const options = opts.options.slice();
  if (options.length === 0) throw new Error("segmented-toggle: options must not be empty");
  const listeners = /* @__PURE__ */ new Set();
  const find = (v) => options.findIndex((o) => o.value === v);
  let index = Math.max(0, find(opts.value));
  let busy = false;
  let snapshot = { value: options[index].value, index, options, busy };
  const emit = () => listeners.forEach((l) => l());
  const setBusy = (b) => {
    if (b === busy) return;
    busy = b;
    snapshot = { ...snapshot, busy };
    emit();
  };
  const set = (i) => {
    if (busy || i === index) return;
    index = i;
    snapshot = { value: options[i].value, index: i, options, busy };
    emit();
    const result = opts.onChange?.(snapshot.value);
    if (result && typeof result.then === "function") {
      setBusy(true);
      result.then(
        () => setBusy(false),
        () => setBusy(false)
      );
    }
  };
  const n = options.length;
  return {
    getSnapshot: () => snapshot,
    subscribe(cb) {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    select(value) {
      const i = find(value);
      if (i >= 0) set(i);
    },
    setBusy,
    next: () => set((index + 1) % n),
    prev: () => set((index - 1 + n) % n),
    destroy: () => listeners.clear()
  };
}

// src/theme.ts
var themes = {
  /** Green Lights planning-mode toggle (the default look in styles.css). */
  greenlights: {
    bg: "color-mix(in srgb, #f2b705 88%, #101416)",
    border: "#101416",
    shadow: "2px 2px 0 #101416",
    lensBg: "#0d8a5a",
    lensShadow: "0 1px 2px color-mix(in srgb, #101416 45%, transparent)",
    onColor: "#f4f5ef",
    offColor: "rgba(16,20,22,.74)",
    hoverColor: "#101416"
  },
  /** Black and white, for monochrome pages. */
  mono: {
    bg: "#ffffff",
    border: "#000000",
    shadow: "2px 2px 0 #000000",
    lensBg: "#000000",
    lensShadow: "none",
    onColor: "#ffffff",
    offColor: "rgba(0,0,0,.6)",
    hoverColor: "#000000"
  }
};
var VARS = {
  bg: "--seg-bg",
  border: "--seg-border",
  shadow: "--seg-shadow",
  lensBg: "--seg-lens-bg",
  lensShadow: "--seg-lens-shadow",
  onColor: "--seg-on-color",
  offColor: "--seg-off-color",
  hoverColor: "--seg-hover-color"
};
function themeVars(theme) {
  if (!theme) return {};
  const tokens = typeof theme === "string" ? themes[theme] : { ...themes.greenlights, ...theme };
  const out = {};
  for (const k of Object.keys(VARS)) {
    const v = tokens[k];
    if (v !== void 0) out[VARS[k]] = v;
  }
  return out;
}

// src/vanilla/index.ts
function mountSegmentedToggle(container, { options, value, ariaLabel, onChange, theme }) {
  const toggle = createSegmentedToggle({ options, value, onChange });
  const doc = container.ownerDocument;
  container.classList.add("mui-seg");
  container.setAttribute("role", "radiogroup");
  container.setAttribute("aria-label", ariaLabel);
  container.style.setProperty("--seg-count", String(options.length));
  const vars = themeVars(theme);
  for (const [k, v] of Object.entries(vars)) container.style.setProperty(k, v);
  const lens = doc.createElement("span");
  lens.className = "mui-seg-lens";
  lens.setAttribute("aria-hidden", "true");
  container.appendChild(lens);
  const on = doc.createElement("span");
  on.className = "mui-seg-on";
  on.setAttribute("aria-hidden", "true");
  const onLabels = options.map((o) => {
    const s = doc.createElement("span");
    s.textContent = o.label;
    on.appendChild(s);
    return s;
  });
  const buttons = options.map((o) => {
    const b = doc.createElement("button");
    b.type = "button";
    b.className = "mui-seg-btn";
    b.setAttribute("role", "radio");
    b.dataset.value = o.value;
    b.textContent = o.label;
    b.addEventListener("click", () => toggle.select(o.value));
    container.appendChild(b);
    return b;
  });
  container.appendChild(on);
  const render = () => {
    const { index, busy } = toggle.getSnapshot();
    container.style.setProperty("--seg-index", String(index));
    container.classList.toggle("is-busy", busy);
    if (busy) container.setAttribute("aria-busy", "true");
    else container.removeAttribute("aria-busy");
    buttons.forEach((b, i) => {
      b.classList.toggle("is-on", i === index);
      b.setAttribute("aria-checked", String(i === index));
      b.tabIndex = i === index ? 0 : -1;
      b.disabled = busy;
      onLabels[i].classList.toggle("is-on", i === index);
    });
  };
  const onKey = (e) => {
    const { index, busy } = toggle.getSnapshot();
    if (busy) return;
    const last = options.length - 1;
    let target = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") target = index === last ? 0 : index + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") target = index === 0 ? last : index - 1;
    else if (e.key === "Home") target = 0;
    else if (e.key === "End") target = last;
    if (target < 0) return;
    e.preventDefault();
    toggle.select(options[target].value);
    buttons[target].focus();
  };
  container.addEventListener("keydown", onKey);
  const unsub = toggle.subscribe(render);
  render();
  return {
    setValue: (v) => toggle.select(v),
    setBusy: (b) => toggle.setBusy(b),
    destroy() {
      unsub();
      toggle.destroy();
      container.removeEventListener("keydown", onKey);
      lens.remove();
      on.remove();
      buttons.forEach((b) => b.remove());
      container.classList.remove("mui-seg");
      container.removeAttribute("role");
      container.removeAttribute("aria-label");
      container.style.removeProperty("--seg-count");
      container.style.removeProperty("--seg-index");
      for (const k of Object.keys(vars)) container.style.removeProperty(k);
    }
  };
}
export {
  mountSegmentedToggle
};
