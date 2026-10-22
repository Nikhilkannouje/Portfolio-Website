# CMF Variant Generator — prototype v0

Try colour, material and finish (CMF) options on a product render without repainting every variant by hand.

**Status:** working prototype. **v0 uses no AI model:** regions are selected by colour flood fill and finishes are shading-based approximations.

## Problem

CMF exploration means repeating the same masking and recolouring work for every option, whether that's a new body-panel colour, a different seat material, or matte versus gloss trim.

## How v0 works

1. Upload a render, or use the built-in sample illustration, which is drawn in code so the repo ships no third-party imagery.
2. Click a region to select it. Selection is a flood fill within an RGB tolerance; shift-click adds to the selection.
3. Pick a colour and a finish: matte, satin, gloss or metallic. The recolour keeps the original shading by scaling the new colour with each pixel's luminance relative to the region's mean, then adds a highlight term for glossier finishes.
4. Compare variants side by side and download any of them as a PNG.

Pixels outside the selection are never modified; `tests/cmf-core.test.mjs` checks this for every finish. Everything runs in the browser, and images are never uploaded.

| File | Purpose |
|---|---|
| `cmf-core.js` | Pure functions: `floodFillMask`, `unionMask`, `applyFinish`, `hexToRgb` |
| `cmf.js` | UI: canvas, selection overlay, variant grid, PNG export |
| `index.html` | Demo page |

## Limitations

- Selection struggles with textured surfaces and with neighbouring regions of similar colour.
- Finishes are visual approximations, not physically based materials, and outputs aren't colour-accurate.
- Use only renders you own or have permission to use.

## Planned

- [Segment Anything (SAM)](https://github.com/facebookresearch/segment-anything) masks from a click or box, replacing flood fill.
- Diffusion inpainting inside the mask for real material textures such as leather, fabric and brushed metal.
- Side-by-side A/B view and saved palettes.

## Run

From the repository root:

```bash
npm run serve   # then open http://localhost:5173/demos/cmf/
npm test
```
