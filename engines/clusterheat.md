Engine: ClusterHeat
Template: templates/clusteredheatmap.html
Routing row: 5
Loaded from SKILL.md §1 routing when this engine is selected.

# ClusterHeat — clustered heatmaps

**Scope:** ComplexHeatmap/pheatmap-style composite figures — a color matrix **with attached row/column dendrograms and metadata annotation strips**. Plain heatmaps (no dendrograms) route to Plotly (engines/plotly.md, better colorbar); this engine exists because heatmap + two dendrograms + annotation strips is a *composite layout* no single-trace spec of the CDN engines can express.

**Zero dependencies** like GenomeTracks — no CDN, works offline, §6.4 skipped.

**Print export** (v0.8.0): the template ships **Download SVG** (true vector; mm-sized when the spec carries `export.width_mm` — journal submission format) and **Download PNG** (deterministic raster: `px = mm / 25.4 · dpi`, default 2× screen / 300 dpi). Optional spec field, all keys optional: `export: { width_mm: 89, dpi: 300, font_family: "Arial" }` — `font_family` overrides the system-ui stack for journals that mandate it. See SKILL.md §6b.

**Spec** (fills `/*__SPEC__*/`):

```js
{
  "title": "Row z-scored expression (distance: correlation; linkage: ward.D2)",
  "matrix": {"rows": ["GENE01", "..."], "cols": ["S1", "..."], "z": [[-1.2, 0.3, "..."]],
             "scale": [[0, "#0072B2"], [0.5, "#FFFFFF"], [1, "#D55E00"]],
             "zmin": -2, "zmax": 2, "legendLabel": "row z-score"},
  "row_dend": {"merge": [[0, 2, 1.2], [4, 5, 1.8], "..."], "height": 70},
  "col_dend": {"merge": [[0, 3, 0.8], "..."], "height": 60},
  "col_annot": [{"label": "Condition", "height": 14,
                 "values": ["Control", "Treated", "..."],
                 "colors": {"Control": "#0072B2", "Treated": "#D55E00"}}]
}
```

**Key rules**

- **The agent clusters upstream and emits the matrix ALREADY ordered** (scipy `linkage(..., 'ward')` — true Ward, the D2 equivalent — plus `leaves_list` for ordering; R `hclust(ward.D2)`). `merge` rows are `[idxA, idxB, height]`: leaves are matrix-order indices 0..n-1, internal node for merge k is n+k. Branch depth in the render is **proportional to merge height** (unlike the ECharts `tree` fallback).
- If you only have a topology (no heights), fall back to ECharts `tree` (engines/echarts.md §4) and disclose that depth is not proportional.
- `scale` stops are **normalized 0..1** mapped to `[zmin, zmax]`; use symmetric diverging stops for z-scores (references/conventions.md §10.3) and robust clipped bounds.
- `col_annot`/`row_annot` values are looked up in `colors` by exact key; a missing key renders gray — check spelling.
- Matrix size: ≤ ~50 rows × ~30 cols for cell-level legibility; larger → aggregate or rasterize upstream.
