import { floodFillMask, unionMask, countMask, applyFinish, hexToRgb, FINISHES } from "./cmf-core.js";

const MAX_W = 900;
const PRESETS = [
  { hex: "#1f1f22", finish: "matte", name: "Graphite matte" },
  { hex: "#e8e6e1", finish: "gloss", name: "Pearl gloss" },
  { hex: "#0f7a5c", finish: "satin", name: "Forest satin" },
  { hex: "#c6402b", finish: "gloss", name: "Signal red gloss" },
  { hex: "#8c8f94", finish: "metallic", name: "Titanium metallic" },
  { hex: "#2d4a8a", finish: "metallic", name: "Cobalt metallic" },
];

const $ = (id) => document.getElementById(id);
const canvas = $("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const status = $("status");
let original = null; // ImageData of the unmodified image
let mask = null;

for (const [key, f] of Object.entries(FINISHES)) {
  $("finish").add(new Option(f.label, key, key === "satin", key === "satin"));
}

// A simple flat-shaded scooter illustration drawn in code, so the demo ships
// without any third-party imagery.
function drawSample() {
  canvas.width = 900; canvas.height = 520;
  ctx.fillStyle = "#f4f4f2"; ctx.fillRect(0, 0, 900, 520);
  ctx.fillStyle = "#e2e2de"; ctx.fillRect(0, 440, 900, 80);

  const wheel = (cx) => {
    ctx.fillStyle = "#26272b"; ctx.beginPath(); ctx.arc(cx, 400, 70, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#9a9da3"; ctx.beginPath(); ctx.arc(cx, 400, 34, 0, Math.PI * 2); ctx.fill();
  };
  wheel(220); wheel(690);

  // Floorboard / trim strip
  ctx.fillStyle = "#3a3c41";
  ctx.beginPath(); ctx.moveTo(300, 330); ctx.lineTo(580, 330); ctx.lineTo(560, 372); ctx.lineTo(310, 372); ctx.closePath(); ctx.fill();

  // Rear body panel with gentle vertical shading
  const g = ctx.createLinearGradient(0, 200, 0, 380);
  g.addColorStop(0, "#5687d2"); g.addColorStop(1, "#4277c2");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(110, 330); ctx.quadraticCurveTo(120, 230, 260, 215);
  ctx.lineTo(470, 215); ctx.quadraticCurveTo(520, 220, 540, 260);
  ctx.lineTo(560, 330); ctx.quadraticCurveTo(450, 300, 330, 330);
  ctx.quadraticCurveTo(240, 360, 110, 330); ctx.closePath(); ctx.fill();

  // Seat
  ctx.fillStyle = "#4a3426";
  ctx.beginPath(); ctx.moveTo(220, 215); ctx.quadraticCurveTo(230, 180, 300, 178);
  ctx.lineTo(470, 182); ctx.quadraticCurveTo(500, 186, 500, 215); ctx.closePath(); ctx.fill();

  // Front apron
  const f = ctx.createLinearGradient(0, 140, 0, 360);
  f.addColorStop(0, "#5687d2"); f.addColorStop(1, "#4277c2");
  ctx.fillStyle = f;
  ctx.beginPath(); ctx.moveTo(600, 360); ctx.lineTo(640, 150); ctx.quadraticCurveTo(690, 140, 720, 170);
  ctx.lineTo(700, 330); ctx.quadraticCurveTo(660, 370, 600, 360); ctx.closePath(); ctx.fill();

  // Handlebar + headlamp
  ctx.strokeStyle = "#26272b"; ctx.lineWidth = 12; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(640, 150); ctx.lineTo(610, 100); ctx.moveTo(585, 100); ctx.lineTo(650, 100); ctx.stroke();
  ctx.fillStyle = "#f2d675"; ctx.beginPath(); ctx.ellipse(712, 200, 12, 22, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#8a8d93"; ctx.font = "14px system-ui, sans-serif";
  ctx.fillText("Sample illustration (drawn in code) — upload your own render to test", 20, 30);
  setOriginal();
  status.textContent = "Sample loaded. Click the blue body panel, the seat or the trim to select it.";
}

function setOriginal() {
  original = ctx.getImageData(0, 0, canvas.width, canvas.height);
  mask = null;
  $("variants").replaceChildren();
  $("variants-empty").hidden = false;
}

function loadFile(file) {
  if (!file || !file.type.startsWith("image/")) { status.textContent = "Please choose a PNG, JPEG or WebP image."; return; }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, MAX_W / img.naturalWidth);
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    setOriginal();
    status.textContent = `Loaded ${file.name} (${canvas.width}×${canvas.height}). Click a region to select it.`;
  };
  img.onerror = () => { status.textContent = "Could not read that image."; URL.revokeObjectURL(url); };
  img.src = url;
}

// Redraw the original with the current selection tinted.
function render() {
  if (!original) return;
  if (!mask) { ctx.putImageData(original, 0, 0); return; }
  const view = new ImageData(new Uint8ClampedArray(original.data), original.width, original.height);
  const d = view.data;
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue;
    const i = p * 4;
    d[i] = d[i] * 0.5 + 255 * 0.5; d[i + 1] = d[i + 1] * 0.5 + 91 * 0.5; d[i + 2] = d[i + 2] * 0.5 + 31 * 0.5;
  }
  ctx.putImageData(view, 0, 0);
}

canvas.addEventListener("click", (e) => {
  if (!original) return;
  const r = canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * canvas.width;
  const y = ((e.clientY - r.top) / r.height) * canvas.height;
  const m = floodFillMask(original.data, original.width, original.height, x, y, Number($("tol").value));
  mask = e.shiftKey && mask ? unionMask(mask, m) : m;
  const pct = ((countMask(mask) / mask.length) * 100).toFixed(1);
  status.textContent = `Selected ${pct}% of the image. Shift-click to add more, or raise the tolerance if the selection is patchy.`;
  render();
});

function addVariant(hex, finish, name) {
  if (!mask) { status.textContent = "Select a region first by clicking on the image."; return; }
  const out = applyFinish(original.data, mask, hexToRgb(hex), finish);
  const c = document.createElement("canvas");
  c.width = original.width; c.height = original.height;
  c.getContext("2d").putImageData(new ImageData(out, original.width, original.height), 0, 0);

  const card = document.createElement("div");
  card.className = "variant";
  const label = name || `${hex.toUpperCase()} · ${FINISHES[finish].label}`;
  const meta = document.createElement("div");
  meta.className = "meta";
  // Build with DOM + CSSOM (not inline style attributes) so a strict CSP allows it.
  const name_ = document.createElement("span");
  const sw = document.createElement("span");
  sw.className = "swatch";
  sw.style.background = hex;
  name_.append(sw, label);
  meta.append(name_);
  const dl = document.createElement("button");
  dl.type = "button";
  dl.textContent = "PNG ↓";
  dl.setAttribute("aria-label", `Download ${label} as PNG`);
  dl.addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `cmf-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
    a.click();
  });
  meta.append(dl);
  card.append(c, meta);
  $("variants").prepend(card);
  $("variants-empty").hidden = true;
}

$("tol").addEventListener("input", (e) => { $("tolVal").textContent = e.target.value; });
$("file").addEventListener("change", (e) => loadFile(e.target.files[0]));
$("sample").addEventListener("click", drawSample);
$("clear").addEventListener("click", () => { mask = null; render(); status.textContent = "Selection cleared."; });
$("apply").addEventListener("click", () => addVariant($("color").value, $("finish").value));
$("batch").addEventListener("click", () => {
  if (!mask) { status.textContent = "Select a region first by clicking on the image."; return; }
  [...PRESETS].reverse().forEach((p) => addVariant(p.hex, p.finish, p.name));
  status.textContent = "Generated 6 preset variants for the selected region.";
});

drawSample();
