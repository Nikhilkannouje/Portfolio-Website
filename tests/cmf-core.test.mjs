import { test } from "node:test";
import assert from "node:assert/strict";
import { floodFillMask, unionMask, countMask, applyFinish, hexToRgb, FINISHES } from "../site/demos/cmf/cmf-core.js";

// 6×4 image: left half red, right half blue, plus an isolated red pixel inside the blue area.
function makeImage() {
  const w = 6, h = 4, d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const red = x < 3 || (x === 5 && y === 3);
    d.set(red ? [200, 30, 30, 255] : [30, 30, 200, 255], i);
  }
  return { d, w, h };
}

test("flood fill selects only the contiguous similar region", () => {
  const { d, w, h } = makeImage();
  const m = floodFillMask(d, w, h, 0, 0, 40);
  assert.equal(countMask(m), 12);
  assert.equal(m[3 * w + 5], 0, "isolated red pixel is not connected");
  assert.equal(m[0 * w + 4], 0, "blue pixel not selected");
});

test("flood fill outside the image returns an empty mask", () => {
  const { d, w, h } = makeImage();
  assert.equal(countMask(floodFillMask(d, w, h, -1, 2)), 0);
  assert.equal(countMask(floodFillMask(d, w, h, 99, 2)), 0);
});

test("union combines selections", () => {
  const { d, w, h } = makeImage();
  const a = floodFillMask(d, w, h, 0, 0);
  const b = floodFillMask(d, w, h, 5, 0);
  assert.equal(countMask(unionMask(a, b)), 23);
});

test("applyFinish never modifies unselected pixels", () => {
  const { d, w, h } = makeImage();
  const m = floodFillMask(d, w, h, 0, 0);
  for (const key of Object.keys(FINISHES)) {
    const out = applyFinish(d, m, [0, 200, 0], key);
    for (let p = 0; p < m.length; p++) {
      const same = [0, 1, 2, 3].every((c) => out[p * 4 + c] === d[p * 4 + c]);
      if (!m[p]) assert.ok(same, `${key}: pixel ${p} changed outside mask`);
      else assert.ok(!same, `${key}: pixel ${p} inside mask unchanged`);
    }
  }
});

test("applyFinish keeps relative shading inside the region", () => {
  const d = new Uint8ClampedArray([100, 100, 100, 255, 200, 200, 200, 255]);
  const out = applyFinish(d, new Uint8Array([1, 1]), [50, 120, 200], "matte");
  assert.ok(out[4 + 1] > out[1], "brighter source pixel stays brighter");
});

test("empty mask returns an identical copy", () => {
  const { d } = makeImage();
  const out = applyFinish(d, new Uint8Array(24), [0, 0, 0]);
  assert.deepEqual([...out], [...d]);
  assert.notEqual(out, d);
});

test("hexToRgb handles long and short forms", () => {
  assert.deepEqual(hexToRgb("#0f7a5c"), [15, 122, 92]);
  assert.deepEqual(hexToRgb("#fff"), [255, 255, 255]);
});
