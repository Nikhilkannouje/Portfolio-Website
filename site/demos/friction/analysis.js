// Pure data helpers for the Designer Workflow Friction dashboard.

export const REQUIRED_COLUMNS = [
  "participant_id", "role", "task", "category",
  "minutes_per_week", "times_per_week", "friction_1to5", "repetitive",
];

/** Minimal RFC 4180-style CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

/** Check columns and value ranges. Returns { rows, errors }. Invalid rows are dropped. */
export function validate(records) {
  const errors = [];
  if (!records.length) return { rows: [], errors: ["The file has no data rows."] };
  const missing = REQUIRED_COLUMNS.filter((c) => !(c in records[0]));
  if (missing.length) return { rows: [], errors: [`Missing columns: ${missing.join(", ")}`] };
  const rows = [];
  records.forEach((r, i) => {
    const minutes = Number(r.minutes_per_week);
    const times = Number(r.times_per_week);
    const friction = Number(r.friction_1to5);
    const line = i + 2;
    if (!r.participant_id || !r.task) errors.push(`Row ${line}: participant_id and task are required.`);
    else if (!Number.isFinite(minutes) || minutes < 0) errors.push(`Row ${line}: minutes_per_week must be a number ≥ 0.`);
    else if (!Number.isFinite(times) || times < 0) errors.push(`Row ${line}: times_per_week must be a number ≥ 0.`);
    else if (!(friction >= 1 && friction <= 5)) errors.push(`Row ${line}: friction_1to5 must be between 1 and 5.`);
    else rows.push({
      ...r, minutes_per_week: minutes, times_per_week: times, friction_1to5: friction,
      repetitive: /^(y|yes|true|1)$/i.test(r.repetitive),
    });
  });
  return { rows, errors };
}

/**
 * Aggregate per task. Impact = average minutes/week × (average friction / 5) × reach,
 * where reach = share of all participants who reported the task.
 */
export function aggregateByTask(rows) {
  const participants = new Set(rows.map((r) => r.participant_id));
  const total = participants.size || 1;
  const byTask = new Map();
  for (const r of rows) {
    const key = r.task.toLowerCase();
    if (!byTask.has(key)) byTask.set(key, { task: r.task, category: r.category, people: new Set(), minutes: [], friction: [], times: [], repetitive: 0, n: 0 });
    const t = byTask.get(key);
    t.people.add(r.participant_id);
    t.minutes.push(r.minutes_per_week);
    t.friction.push(r.friction_1to5);
    t.times.push(r.times_per_week);
    t.repetitive += r.repetitive ? 1 : 0;
    t.n++;
  }
  const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  return [...byTask.values()].map((t) => {
    const reach = t.people.size / total;
    const avgMinutes = avg(t.minutes);
    const avgFriction = avg(t.friction);
    return {
      task: t.task,
      category: t.category,
      participants: t.people.size,
      reach,
      avgMinutes,
      totalMinutes: t.minutes.reduce((s, v) => s + v, 0),
      avgFriction,
      avgTimes: avg(t.times),
      repetitiveShare: t.repetitive / t.n,
      impact: avgMinutes * (avgFriction / 5) * reach,
    };
  }).sort((a, b) => b.impact - a.impact);
}

export function summary(rows) {
  const participants = new Set(rows.map((r) => r.participant_id)).size;
  const totalMinutes = rows.reduce((s, r) => s + r.minutes_per_week, 0);
  const repetitiveMinutes = rows.filter((r) => r.repetitive).reduce((s, r) => s + r.minutes_per_week, 0);
  return {
    participants,
    tasks: new Set(rows.map((r) => r.task.toLowerCase())).size,
    avgHoursPerParticipant: participants ? totalMinutes / participants / 60 : 0,
    repetitiveShare: totalMinutes ? repetitiveMinutes / totalMinutes : 0,
  };
}

// Candidate tools per category. These are hypotheses to test, not findings.
export const OPPORTUNITIES = {
  "asset-prep": "Batch export / rename scripts; AI background removal and upscaling",
  "cmf": "CMF Variant Generator (segmentation + recolour / inpainting)",
  "documentation": "LLM-drafted spec sheets and design rationale from annotated files",
  "research": "LLM clustering and summarising of interview notes and references",
  "iteration": "Generative variant exploration from a base sketch or render",
  "file-management": "Automated versioning, naming conventions and asset search",
  "feedback": "Structured feedback capture with AI summaries of review comments",
  "presentation": "Template-driven deck and board generation from project files",
};
