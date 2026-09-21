Engine: OncoPrint
Template: templates/oncoprint.html
Routing row: 5
Loaded from SKILL.md §1 routing when this engine is selected.

# OncoPrint — mutation matrices

**Scope:** OncoPrint / co-mutation matrices (Cerami 2012) — gene × sample matrix where each cell **stacks multiple alteration-class bands** (missense, truncating, splice, CNA, fusion). Cell stacking is the whole point: flattening each cell to a single class destroys the multi-alteration biology (a MYC amp + TP53 missense co-event becomes invisible). Plain single-class matrices → Plotly heatmap (engines/plotly.md); this engine is for stacked categorical cells.

**Zero dependencies** like GenomeTracks/ClusterHeat — no CDN, works offline, §6.4 skipped.

**Print export** (v0.8.0): the template ships **Download SVG** (true vector; mm-sized when the spec carries `export.width_mm` — journal submission format) and **Download PNG** (deterministic raster: `px = mm / 25.4 · dpi`, default 2× screen / 300 dpi). Optional spec field, all keys optional: `export: { width_mm: 89, dpi: 300, font_family: "Arial" }` — `font_family` overrides the system-ui stack for journals that mandate it. See SKILL.md §6b.

**Spec** (fills `/*__SPEC__*/`):

```js
{
  "title": "TCGA-BRCA mutation landscape (30 samples; sorted by burden)",
  "genes": ["TP53", "PIK3CA", "..."], "samples": ["S01", "..."],
  "cells": {"TP53": {"S01": ["Missense", "Amp"], "...": []}},
  "alter_colors": {"Missense": "#56B4E9", "Truncating": "#000000", "Splice": "#CC79A7",
                   "Amp": "#D55E00", "HomDel": "#0072B2", "Fusion": "#009E73"},
  "stack_order": ["Truncating", "Splice", "Missense", "Fusion", "HomDel", "Amp"],
  "show_pct": true, "pct": {"TP53": "62%", "...": "..."},
  "tmb": {"label": "TMB (log10)", "values": {"S01": 1.1, "...": "..."}, "max": 2.5},
  "top_annot": [{"label": "Subtype", "height": 14, "values": {"S01": "Luminal"},
                 "colors": {"Luminal": "#0072B2", "Basal": "#D55E00", "HER2": "#009E73"}}]
}
```

**Key rules**

- **Never flatten a cell to one class** — the reference's core insight: each cell stacks bands (ComplexHeatmap `alter_fun` equivalent). `stack_order` fixes the layering; co-occurring events stay visible.
- **The agent sorts and emits genes/samples already ordered** (memoSort / burden sort upstream); the renderer draws in spec order. **Never drop samples with no alterations** — percentages must use the true cohort denominator (`remove_empty_columns = FALSE`).
- **Percentages computed by the agent** with the cohort denominator and emitted as `pct`.
- **Hypermutators**: TMB bars use **log10(tmb + 1)** values (transform upstream) — 1–2 POLE/MSI-H samples otherwise dominate the bar.
- **Top 10–25 genes**; 50–1000 samples (above → summary panels).
- **Alteration-class colours**: see references/palettes.md.
