import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCSV, validate, aggregateByTask, summary, OPPORTUNITIES } from "../site/demos/friction/analysis.js";

const header = "participant_id,role,task,category,minutes_per_week,times_per_week,friction_1to5,repetitive,notes";

test("parseCSV handles quotes, escaped quotes and CRLF", () => {
  const rows = parseCSV(`a,b\r\n"x, y","say ""hi"""\r\n\r\n1,2`);
  assert.deepEqual(rows, [{ a: "x, y", b: 'say "hi"' }, { a: "1", b: "2" }]);
});

test("validate reports missing columns", () => {
  const { rows, errors } = validate(parseCSV("participant_id,task\nP1,Export"));
  assert.equal(rows.length, 0);
  assert.match(errors[0], /Missing columns/);
});

test("validate drops rows with out-of-range values", () => {
  const csv = `${header}\nP1,s,Export,asset-prep,60,3,4,yes,\nP2,s,Export,asset-prep,60,3,9,yes,\nP3,s,Export,asset-prep,-5,3,3,no,`;
  const { rows, errors } = validate(parseCSV(csv));
  assert.equal(rows.length, 1);
  assert.equal(errors.length, 2);
  assert.equal(rows[0].repetitive, true);
});

test("aggregateByTask computes reach and impact", () => {
  const csv = `${header}
P1,s,Export,asset-prep,60,3,5,yes,
P2,s,Export,asset-prep,40,3,3,no,
P2,s,Notes,documentation,100,1,5,no,`;
  const { rows } = validate(parseCSV(csv));
  const [first, second] = aggregateByTask(rows);
  // Export: avg 50 min × (4/5) × reach 1 = 40; Notes: 100 × 1 × 0.5 = 50
  assert.equal(first.task, "Notes");
  assert.equal(first.impact, 50);
  assert.equal(second.task, "Export");
  assert.equal(second.impact, 40);
  assert.equal(second.repetitiveShare, 0.5);
  const s = summary(rows);
  assert.equal(s.participants, 2);
  assert.equal(s.tasks, 2);
  assert.equal(s.repetitiveShare, 60 / 200);
});

test("bundled sample data and template are valid", () => {
  for (const f of ["sample-data.csv", "template.csv"]) {
    const text = readFileSync(resolve(import.meta.dirname, "../site/demos/friction", f), "utf8");
    const { rows, errors } = validate(parseCSV(text));
    assert.deepEqual(errors, [], f);
    assert.ok(rows.length > 0, f);
    for (const r of rows) assert.ok(r.category in OPPORTUNITIES, `${f}: unknown category ${r.category}`);
  }
});
