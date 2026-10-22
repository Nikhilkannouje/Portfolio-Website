import { parseCSV, validate, aggregateByTask, summary, OPPORTUNITIES } from "./analysis.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (v) => `${Math.round(v * 100)}%`;

const SAMPLE_BANNER = "<strong>Sample data — not research findings.</strong> The numbers below are synthetic, created to test the dashboard. No interviews or surveys have been conducted yet. Conclusions will only be published after real responses replace this file.";

function setBanner(isSample, n) {
  const text = $("banner").querySelector("span");
  if (isSample) {
    text.innerHTML = SAMPLE_BANNER;
    $("data-tag").textContent = "Sample data · not research findings";
    $("data-tag").hidden = false;
  } else {
    text.innerHTML = `<strong>Showing your uploaded file</strong> (${n} participants). Results describe this group only.`;
    $("data-tag").hidden = true;
  }
}

function render(rows, isSample) {
  const s = summary(rows);
  const tasks = aggregateByTask(rows);
  setBanner(isSample, s.participants);

  $("kpis").innerHTML = [
    [s.participants, "Participants"],
    [s.tasks, "Distinct tasks"],
    [s.avgHoursPerParticipant.toFixed(1) + " h", "Logged hours per participant per week"],
    [pct(s.repetitiveShare), "Of logged time is repetitive"],
  ].map(([v, l]) => `<div class="kpi"><div class="v">${esc(v)}</div><div class="l">${esc(l)}</div></div>`).join("");

  // Bars are built with the DOM and CSSOM (no inline style attributes) so a strict CSP allows them.
  const maxImpact = Math.max(...tasks.map((t) => t.impact), 1);
  $("bars").replaceChildren(...tasks.map((t) => {
    const row = document.createElement("div");
    row.className = "bar-row";
    const name = document.createElement("span");
    name.textContent = t.task;
    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = `${(t.impact / maxImpact) * 100}%`;
    track.append(fill);
    const num = document.createElement("span");
    num.className = "num";
    num.textContent = t.impact.toFixed(0);
    row.append(name, track, num);
    return row;
  }));

  $("table").innerHTML = tasks.map((t) => `
    <tr>
      <td>${esc(t.task)}</td>
      <td class="num">${t.participants}</td>
      <td class="num">${t.avgMinutes.toFixed(0)}</td>
      <td class="num">${t.avgFriction.toFixed(1)}</td>
      <td class="num">${pct(t.repetitiveShare)}</td>
      <td>${esc(OPPORTUNITIES[t.category] || "—")}</td>
    </tr>`).join("");

  drawScatter(tasks);
}

function drawScatter(tasks) {
  const W = 640, H = 340, L = 48, R = 20, T = 16, B = 40;
  const maxX = Math.max(60, ...tasks.map((t) => t.avgMinutes)) * 1.1;
  const x = (v) => L + (v / maxX) * (W - L - R);
  const y = (v) => H - B - ((v - 1) / 4) * (H - T - B);
  let svg = "";
  for (let f = 1; f <= 5; f++) {
    svg += `<line class="grid" x1="${L}" y1="${y(f)}" x2="${W - R}" y2="${y(f)}"/>`;
    svg += `<text x="${L - 10}" y="${y(f) + 4}" text-anchor="end">${f}</text>`;
  }
  svg += `<line class="axis" x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}"/><line class="axis" x1="${L}" y1="${T}" x2="${L}" y2="${H - B}"/>`;
  const step = maxX > 300 ? 100 : 50;
  for (let m = 0; m <= maxX; m += step) svg += `<text x="${x(m)}" y="${H - B + 16}" text-anchor="middle">${m}</text>`;
  svg += `<text x="${(W + L) / 2}" y="${H - 6}" text-anchor="middle">AVG MINUTES / WEEK</text>`;
  svg += `<text x="12" y="${(H - B + T) / 2}" text-anchor="middle" transform="rotate(-90 12 ${(H - B + T) / 2})">FRICTION 1–5</text>`;
  for (const t of tasks) {
    const r = 5 + t.reach * 12;
    svg += `<circle class="dot" cx="${x(t.avgMinutes)}" cy="${y(t.avgFriction)}" r="${r}"><title>${esc(t.task)}: ${t.avgMinutes.toFixed(0)} min/wk, friction ${t.avgFriction.toFixed(1)}, ${t.participants} people</title></circle>`;
  }
  $("scatter").innerHTML = svg;
}

function load(text, isSample) {
  const { rows, errors } = validate(parseCSV(text));
  $("errors").textContent = errors.slice(0, 5).join(" ") + (errors.length > 5 ? ` (+${errors.length - 5} more)` : "");
  if (!rows.length) return;
  // A file is only treated as real data if none of its participants are sample IDs.
  const sample = isSample || rows.some((r) => /^sample/i.test(r.participant_id));
  render(rows, sample);
}

async function loadSample() {
  const res = await fetch("sample-data.csv");
  load(await res.text(), true);
  $("file").value = "";
}

$("file").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (f) load(await f.text(), false);
});
$("reset").addEventListener("click", loadSample);
loadSample().catch(() => { $("errors").textContent = "Could not load sample data. Serve the site over HTTP (npm run serve)."; });
