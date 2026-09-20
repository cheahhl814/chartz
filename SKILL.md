---
name: chartz
description: 'Render charts and graphs as self-contained HTML files from four pinned CDN engines, chosen by chart type. Use when the user asks for a chart, plot, dashboard, heatmap, network/graph diagram, or any data visualization as a file they can open in a browser — "make a bar chart", "plot this data", "heatmap of these values", "draw a network graph", "dashboard of these metrics". Engine router: Chart.js (simple statistical), Plotly.js (scientific/statistical), ECharts (rich/dashboards), Cytoscape.js (nodes + edges). Emits one single-file HTML per chart with pinned CDN versions; no build step, no server. Does NOT do text-to-flowchart/sequence diagrams (use Mermaid/lumen-generate_visual for that) and does NOT analyze data — it renders data you already have.'
version: 0.2.0
updated: "2026-09-20"
triggers:
  - "make a chart"
  - "plot this data"
  - "bar chart / line chart / pie chart"
  - "heatmap"
  - "box plot / violin plot / histogram"
  - "network graph / node-link diagram"
  - "dashboard from these numbers"
  - "render a chart to html"
  - "visualize this csv/json"
requires:
  - "python3 (stdlib only) — for data formatting and the update check"
  - "a browser (user-side) — output is a self-contained HTML file"
---

# chartz — chart & graph rendering skill

> **v0.1.0.** Renders one self-contained HTML file per chart from four engines, each pinned to a CDN version. This SKILL.md is a **router + spec contract**: pick the engine from §1, emit the engine's JSON spec per that engine's §, fill a template slot, write the HTML, deliver the path. No sub-skills, no build step.

## 0. Workflow (always all five steps)

1. **Classify the request** against the routing table (§1). If two engines could work, prefer the higher row.
2. **Emit the spec** — the engine's exact JSON object, per the engine's section (§2–§5).
3. **Fill the template** — copy `templates/<engine>.html`, replace **only the `/*__SPEC__*/` placeholder** with the JSON literal (templates carry pinned CDN `<script>` tags; do not edit the script tags, and do **not** re-emit `const SPEC =` — the template already declares it).
4. **Run the self-check** (§6) — every line, every delivery.
5. **Deliver** — write to `<workdir>/charts/<name>.html` (create the dir if needed) and report the absolute path plus one sentence on what the chart shows.

**Never** inline the library code into the HTML; the pinned CDN tags are the delivery mechanism. **Never** ship an HTML file with the `/*__SPEC__*/` slot still unfilled.

## 1. Engine routing table (first match wins)

| #   | If the request is…                                                                                                                                                                        | Engine                           | Template                          | Spec contract |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------------- | ------------- |
| 1   | Nodes + edges (pathways, gene networks, dependency graphs, org charts as graphs)                                                                                                          | **Cytoscape.js**                 | `templates/cytoscape.html`        | §5            |
| 2   | Genome-browser track figures (coverage, peaks, gene models stacked on locus coordinates)                                                                                                  | **GenomeTracks**                 | `templates/genetracks.html`       | §5b           |
| 3   | Clustered heatmaps (matrix + attached dendrograms + annotation strips)                                                                                                                    | **ClusterHeat**                  | `templates/clusteredheatmap.html` | §5c           |
| 4   | OncoPrint / mutation matrices (stacked alteration cells, TMB + clinical strips)                                                                                                           | **OncoPrint**                    | `templates/oncoprint.html`        | §5d           |
| 5   | Sequence logos (per-position letter stacks, bits axis)                                                                                                                                    | **SeqLogo**                      | `templates/seqlogo.html`          | §5e           |
| 6   | UpSet set-intersection plots (dot matrix + intersection bars, 4+ sets)                                                                                                                    | **UpSet**                        | `templates/upset.html`            | §5f           |
| 7   | Box plots, violin plots, histograms, **heatmaps** (better colorbar/labels), 3D surfaces, error bars, log axes, subplots, **Manhattan/Miami/QQ/locuszoom-regional/forest/funnel/lollipop** | **Plotly.js**                    | `templates/plotly.html`           | §3            |
| 8   | Treemap, sankey, sunburst, dendrogram (topology-only `tree`), large series (>10k points), dataZoom scrubbing, mixed multi-chart dashboards                                                | **ECharts**                      | `templates/echarts.html`          | §4            |
| 9   | Simple bar / line / pie / doughnut / radar / scatter / bubble (few series, shared category axis)                                                                                          | **Chart.js**                     | `templates/chartjs.html`          | §2            |
| 10  | Anything else                                                                                                                                                                             | **ECharts** (broadest catch-all) | `templates/echarts.html`          | §4            |

Ask-user stop point (SP1, Evidence + Recommend + Options): only when the request matches no row and the data shape is ambiguous (e.g. "visualize this dataset" with no stated goal). Otherwise auto-pick and state the choice.

Worked, render-verified specs live in `examples/` named `<engine>-<charttype>.html` (e.g. `plotly-heatmap.html`, `echarts-treemap.html`, `cytoscape-dependency-tree.html`); copy a spec shape from there when in doubt.

## 2. Chart.js (v4.5.1) — simple statistical charts

**Scope:** bar, line, pie, doughnut, radar, scatter, bubble with few series and a shared category axis. **Not** for log axes (bug-prone config), histograms, box/violin, heatmaps — route those to Plotly.

**Spec** (fills `/*__SPEC__*/` as `const SPEC = {...}`):

```js
{
  type: "bar",                      // bar | line | pie | doughnut | radar | scatter | bubble
  data: {
    labels: ["Q1", "Q2", "Q3", "Q4"],
    datasets: [{
      label: "Revenue (k$)",
      data: [12, 19, 8, 14]        // scatter: [{x, y}]; bubble: [{x, y, r}]
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,    // REQUIRED with the template's 60vh canvas-box
    plugins: { title: { display: true, text: "Revenue by quarter" },
               legend: { position: "bottom" } },
    scales: { y: { beginAtZero: true } }   // omit scales entirely for pie/doughnut
  }
}
```

**Pitfalls**

- `maintainAspectRatio: false` is required whenever the template's CSS-sized canvas box is used — Chart.js 4 defaults to `true` and then ignores the container height (squashed charts; see S10).
- Pie/doughnut: omit `scales` completely; `beginAtZero` on them is a no-op that confuses reviewers.
- Line with time data: use `{x, y}` point form with `type: "scatter"` + `showLine: true` — Chart.js time scale needs an extra adapter, which the template does not load.
- Colors: `backgroundColor` defaults are Chart.js palette; pass your own array when categories are semantically colored (pass/⚠/fail → green/amber/red).
- > 10 datasets → this is the wrong engine; go ECharts.
- Double title: the template renders `options.plugins.title.text` in the card's `<h1>` heading; Chart.js will draw it *again* inside the canvas if `display: true`. Set `plugins.title.display: false` (the h1 still populates from `text`). Worked pattern in `examples/chartjs-scree.html`.

## 3. Plotly.js (v4.1.1) — scientific / statistical

**Scope:** box, violin, histogram, 2D histogram, heatmap, contour, error bars, log axes, subplots, 3D surface/scatter, **GWAS Manhattan/Miami/QQ plots, meta-analysis forest/funnel plots, protein lollipop maps, distribution combos (raincloud, box+jitter strip, split violin)**. This is the bioinformatics-workspace default for distributional data (MA plots, volcano plots, differential abundance).

**Spec** (fills `/*__SPEC__*/` as `const SPEC = {...}`):

```js
{
  data: [
    {
      type: "box", x: ["WT", "KO", "KO", "WT"], y: [1.2, 3.4, 2.9, 0.8],
      name: "expression", boxpoints: "outliers"
    }
  ],
  layout: {
    title: { text: "Expression by condition" },
    xaxis: { title: { text: "Condition" } },
    yaxis: { title: { text: "log2 TPM" }, type: "log", exponentformat: "power" },
    font: { size: 13 }
  },
  config: { responsive: true, displaylogo: false }
}
```

**Pitfalls**

- Heatmap: `type: "heatmap"`, data as array-of-rows (row = y category); supply `x` and `y` label arrays or axes get numeric 0..n ticks.
- Log axis: `type: "log"` lives on the **axis**, not the trace. Log values must be pre-logged only for `bar` bases; keep raw values for scatter/box.
- `binning` for histograms lives in `xbins`/`ybins` or `nbinsx`; `histnorm` for density.
- 3D: needs `layout.scene`; `scene: { zaxis: { type: "log" } }` for log depth.
- `config` is optional but keep `displaylogo: false` — the Plotly logo adds nothing to a report.

**Bio-plot spec contracts** (worked demos in `examples/`):

- **Manhattan** (`plotly-manhattan.html`): one trace per chromosome with alternating Okabe-Ito blue/gray; cumulative x-offset per chromosome with `tickvals`/`ticktext` at chromosome centers; dashed horizontal genome-wide line at −log10(5e-8) with a text annotation (§10.2 threshold rule). >100k SNPs → route to ECharts with `dataZoom`.
- **Miami** (`plotly-miami.html`): two mirrored Manhattan groups; y-axis `range` symmetric, negative ticks labeled as positive; two dashed threshold lines.
- **QQ** (`plotly-qq.html`): observed vs expected −log10(p), dashed identity line, genomic-inflation λ in the title; points sorted independently.
- **LocusZoom-style regional** (`plotly-locuszoom.html`): ~1 Mb window around the lead SNP; one trace per **LD r² bucket** (1.0 / 0.8–1.0 / 0.6–0.8 / 0.4–0.6 / 0.2–0.4 / <0.2, ordered palette); lead SNP as labeled diamond; gene track via paper-ref `rect` shapes **inside** the plot bottom (labels above the rects — outside collides with tick labels); recombination rate on a secondary `yaxis2` (dotted). **LD reference must match the GWAS population** — a European reference on a non-European GWAS produces wrong colorings.
- **Axis truncation** (Manhattan/regional): cap the y-axis at a stated value, redraw capped points as `triangle-up` markers, annotate "(capped at N)" on the axis, and keep the true p in the caption/tooltip data — a cap with no indication hides the peak's true magnitude.
- **Lead-SNP labeling**: label the lead rsID in a contrasting color at the top of the peak; label at most the top 3–5 secondary SNPs to avoid collisions.
- **Threshold is conditional** (Pe'er 2008; Pulit 2017; Xu 2014): 5e-8 is calibrated for European-ancestry common-variant GWAS (~1M independent tests). WGS ~5e-9, trans-ancestry ~5e-9, TWAS 2.5e-6, PWAS 1e-5, non-European ancestry empirically derived. The significance line is a contract with the reader — match it to the testing regime and say which in the title.
- **Forest** (`plotly-forest.html`): x = effect on **natural scale** (log axis does the transform — never pass pre-logged values onto `type: "log"`), y = study names; `error_x` with `symmetric: false` (`array` = CI_hi − est, `arrayminus` = est − CI_lo, **natural-scale differences**); **marker size ∝ inverse-variance weight**; pooled estimate as diamond; dashed null line at 1; ticks at 0.25/0.5/1/2/4; I²/τ²/Q in the title; 95% **prediction interval** band (§10.9).
- **Funnel** (`plotly-funnel.html`): contour-enhanced (Peters 2008) — three shaded pseudo-CI triangle paths at z=1.645/1.96/2.576 with **`layer: "below"`** (shapes default above and hide the points); x = log(OR) on a **linear** axis (metafor convention); state k and the Egger k≥10 condition in the title (§10.9).
- **Subgroup forest** (`plotly-forest-subgroup.html`): nested per-subgroup studies + pooled diamonds, separator line, treatment × subgroup **interaction p** annotated — visual differences establish nothing without it (§10.9).
- **Faceted scatter** (`plotly-facets.html` / `plotly-facets-free.html`): 2×2 grid via `layout.grid` `{rows, columns, pattern: "independent"}` + one trace per panel with per-panel `xaxis`/`yaxis`; panel titles via `layout.annotations`; theme_classic-equivalent styling (`showgrid: false`, `showline: true`, `ticks: "outside"`); **fixed scales when comparing** across panels, `free` only when inherent and disclosed in the title (§10.10).
- **Composed multipanel** (`plotly-multipanel.html`): FOUR different trace types (scatter, box, histogram, bar) in one 2×2 `layout.grid`; **collected axes** (y titles only left column, x ticks only bottom row), one shared bottom legend, Nature-style **a–d tags** anchored inside each panel (§10.11).
- **Lollipop protein map** (`plotly-lollipop.html`): `mode: "lines+markers"` stems from y=0 at mutation positions; domain rectangles via `layout.shapes` (`type: "rect"`, `yref: "paper"`) with labels via `annotations`; marker color by variant class (§10.1). Deep-import conventions (§10.10): **print the absolute count at each lollipop** — size-only encoding saturates past ~10 and the reader can't tell 30 from 300; **state the isoform** in the title (residue numbering differs across isoforms — off-by-residue otherwise); **filter to recurrent (count ≥ 2)** for the main figure, all mutations in supplement; **domain colors map to functional class** (kinase=blue, binding=green, regulatory=purple), never rainbow; hotspots are a formal test (MutSig, Lawrence 2014) — the plot displays the verdict, it doesn't make it.
- **Two-cohort lollipop** (`plotly-lollipop-two-cohort.html`): shared domain backbone, cohort A stems upward (positive counts), cohort B downward (negative) — the maftools `lollipopPlot2` pattern; same class coloring and count labels.
- ⚠️ Funnel routing: the funnel plot above is the **meta-analysis publication-bias** funnel — ECharts `type: "funnel"` is a **staged funnel** (sales pipeline), a different chart; never route a publication-bias request to it.
- **Raincloud** (`plotly-raincloud.html`): three traces per group on a numeric x-axis — violin `side: "positive"` nudged +0.22, thin box at center with `boxpoints: false`, jittered points nudged −0.26; `bandwidth` explicit; `tickvals`/`ticktext` carry N per group (§10.7).
- **Box + jitter strip** (`plotly-boxstrip.html`): box (`boxpoints: false`) + scatter of every raw point, jitter ±0.13 — the N<30 encoding (§10.7).
- **Split violin** (`plotly-splitviolin.html`): two traces per group, `side: "positive"`/`side: "negative"` with different fills — paired 2-condition comparison (§10.7).

## 4. ECharts (v6.1.0) — rich / dashboards / catch-all

**Scope:** treemap, sankey, sunburst, funnel (staged), gauge, candlestick, calendar, large series with `dataZoom`, mixed-type grids (bar + line dual axis), **dendrograms via `type: "tree"`**, anything rows 1–5 don't route.

**Spec** (fills `/*__SPEC__*/` as `const SPEC = {...}`):

```js
{
  title: { text: "Budget flow", left: "center" },
  tooltip: { trigger: "item" },
  series: [{
    type: "sankey",
    emphasis: { focus: "adjacency" },
    data: [{ name: "Grant" }, { name: "Sequencing" }, { name: "Staff" }],
    links: [{ source: "Grant", target: "Sequencing", value: 60 },
            { source: "Grant", target: "Staff", value: 40 }]
  }]
}
```

**Pitfalls**

- Sankey: every `link.source/target` must exist in `data` by exact `name` (string-equal, case-sensitive) — the #1 silent-blank-canvas cause.
- Sankey cycles: ECharts renders nothing on a cyclic graph; verify DAG-ness before emitting.
- Ribbon color: default link color is gray — set `lineStyle: {"color": "source", "opacity": 0.35}` to color ribbons by origin node (the alluvial convention; §10.8). `"target"` colors by destination.
- Flow conservation: keep in-flow = out-flow at internal nodes — imbalanced flows render as stretched ribbons that read as data errors (§10.8). Multi-column alluvial-style sankey: one node per (timepoint, category), names prefixed with the timepoint; worked demo `examples/echarts-alluvial.html`.
- `dataZoom` on >1000 points: add `dataZoom: [{type: "inside"}, {type: "slider"}]` plus `sampling: "lttb"` on line series.
- Mixed grid: second `series` needs `xAxisIndex`/`yAxisIndex` matching the second entry of `xaxis`/`yaxis` arrays (`grid: [{}, {}]`).
- Dark mode: pass `backgroundColor: "transparent"` — the template ships a light page; don't emit white-on-white.
- Dendrogram (`type: "tree"`, `edgeShape: "polyline"`, `orient: "TB"`): ECharts renders **topology only — branch depth is uniform, NOT distance-proportional to merge height**. State this in the delivery sentence. Compute the clustering outside and emit the tree as nested `children`. Worked demo: `examples/echarts-dendrogram.html`.

## 5. Cytoscape.js (v3.34.3) — nodes + edges

**Scope:** network graphs — pathways, PPIs, gene-regulatory networks, dependency trees. Nodes/edges as elements with `data` attributes; layout algorithms position them.

**Spec** (fills `/*__SPEC__*/` as `const SPEC = {...}`):

```js
{
  elements: [
    { data: { id: "TP53", label: "TP53" } },
    { data: { id: "MDM2", label: "MDM2" } },
    { data: { id: "e1", source: "TP53", target: "MDM2", weight: 0.9 } }
  ],
  style: [
    { selector: "node", style: { "content": "data(label)", "font-size": 12,
                                 "background-color": "#4A78A8" } },
    { selector: "edge", style: { "width": 2, "line-color": "#bbb",
                                 "curve-style": "bezier" } }
  ],
  layout: { name: "cose", animate: false }   // breadthfirst | circle | grid | concentric | cose
}
```

**Spec extras** — `title: "..."` (optional, shown as the card heading; also satisfies self-check #6).

**Pitfalls**

- `curve-style: "bezier"` on edges — without it parallel edges overdraw invisibly.
- Truthy selectors need `?`: `node[side]` matches *existence* of the data field (every node with the key set, even `false`); use `node[?side]` for a truthy match (§S-library class: silent full-selector match).
- Layout names are exact: `cose` (built-in) vs `cose-bilkent` (needs an extra plugin the template does NOT load — never emit `cose-bilkent`, `fcose`, or `elk`).
- Element `id`s are **global across nodes and edges**; any collision (node id = edge id included) silently drops the colliding element (see S9).
- Label readability: set node `font-size` and `text-valign: "center"`; for >100 nodes drop labels entirely (`"content": ""`) and rely on tooltips (`bindTooltips` not loaded — keep labels off instead).
- Style values are strings quoted like `"width": 2` (number ok) but `"content": "TP53"` must be a string — mismatched types are the #2 silent-blank cause.
- **Data-mapped styling**: per-node size and per-edge width come from `data` attributes + style selectors: `{selector: "node", style: {"width": "data(size)", "height": "data(size)"}}`, `{selector: "edge", style: {"width": "data(w)"}}` — compute degree/weight upstream, emit as element data. Never leave all sizes uniform when degree is meaningful.
- **`preset` layout** (positions supplied): emit per-element `position: {x, y}` and `layout: {name: "preset"}` when positions were computed upstream with a seeded algorithm — reproducible renders and comparable multi-network figures.

## 5b. GenomeTracks (engine 5, template-native SVG) — genome-browser track figures

**Scope:** stacked locus figures aligned to genome coordinates — BigWig-style coverage, BED/narrowPeak rectangles, UCSC-style gene models (intron line + exon blocks + strand arrows). Fills the one reference chart class the four CDN engines cannot express. **Zero dependencies**: the renderer is template-native vanilla-JS SVG (no CDN, works offline — the only engine where §6.4's reachability probe is skipped).

**Spec** (fills `/*__SPEC__*/` as `const SPEC = {...}`):

```js
{
  "title": "chr1:1,000,000-1,040,000 (hg38; ChIP-Rx, spike-in scaled)",
  "region": {"chrom": "chr1", "start": 1000000, "end": 1040000},
  "tracks": [
    {"type": "coverage", "label": "H3K27ac Control", "height": 90, "color": "#0072B2",
     "max": 50, "bins": [[1000000, 2.1], [1000100, 4.8], [1020000, 18.4]]},
    {"type": "peaks", "label": "Peaks", "height": 26, "color": "#888888",
     "items": [{"start": 1019000, "end": 1023000}]},
    {"type": "genes", "label": "Genes (UCSC)", "height": 70, "color": "#3C5488",
     "items": [{"name": "GENE1", "strand": "+",
                "exons": [[1004000, 1004600], [1008000, 1008900], [1015000, 1015700]]}]}
  ]
}
```

Track types: `coverage` (`bins`: sorted `[pos, value]` pairs; optional `max` — **REQUIRED and shared across comparable sample tracks**, see below), `peaks` (`items`: `{start, end, label?}`), `genes` (`items`: `{name, strand, exons: [[s,e]...]}`). Tracks render **top-to-bottom in spec order** (pyGenomeTracks convention — genes conventionally last).

**Conventions (§10.9 applies; genome-tracks practice)**

- **Comparable sample tracks must share `max`** — per-track auto-scaling conflates rendering scale with signal magnitude. Set the same `max` on every track a reader will compare.
- **Normalization is an upstream data decision — state it in the title** (build, normalization, spike-in). The classic silent error: ChIP-Rx spike-in is *undone* by deepTools `--normalizeUsing CPM/RPGC` combined with `--scaleFactor` — spike-in requires `--normalizeUsing None` + explicit `--scaleFactor` (Orlando 2014). chartz receives numbers and cannot detect this; the agent must.
- **Gene style**: UCSC-merged for dense human/mouse loci (merge transcripts before emitting); one row per gene here — emit canonical isoform only.
- Region width: keep locus ≤ ~500 kb for legibility; >10k coverage bins → downsample before emitting.

**Scope boundary:** Hi-C matrices, BedPE arcs, and sashimi plots are **out of scope** for this renderer — use pyGenomeTracks/Gviz/IGV for those and for rendering from BigWig/BAM files directly. chartz consumes coordinate data the agent already holds as arrays.

## 5c. ClusterHeat (engine 6, template-native SVG) — clustered heatmaps

**Scope:** ComplexHeatmap/pheatmap-style composite figures — a color matrix **with attached row/column dendrograms and metadata annotation strips**. Plain heatmaps (no dendrograms) route to Plotly (§3, better colorbar); this engine exists because heatmap + two dendrograms + annotation strips is a *composite layout* no single-trace spec of the CDN engines can express.

**Zero dependencies** like GenomeTracks — no CDN, works offline, §6.4 skipped.

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
- If you only have a topology (no heights), fall back to ECharts `tree` (§4) and disclose that depth is not proportional.
- `scale` stops are **normalized 0..1** mapped to `[zmin, zmax]`; use symmetric diverging stops for z-scores (§10.3) and robust clipped bounds.
- `col_annot`/`row_annot` values are looked up in `colors` by exact key; a missing key renders gray — check spelling.
- Matrix size: ≤ ~50 rows × ~30 cols for cell-level legibility; larger → aggregate or rasterize upstream.

## 5d. OncoPrint (engine 7, template-native SVG) — mutation matrices

**Scope:** OncoPrint / co-mutation matrices (Cerami 2012) — gene × sample matrix where each cell **stacks multiple alteration-class bands** (missense, truncating, splice, CNA, fusion). Cell stacking is the whole point: flattening each cell to a single class destroys the multi-alteration biology (a MYC amp + TP53 missense co-event becomes invisible). Plain single-class matrices → Plotly heatmap (§3); this engine is for stacked categorical cells.

**Zero dependencies** like GenomeTracks/ClusterHeat — no CDN, works offline, §6.4 skipped.

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

## 5e. SeqLogo (engine 8, template-native SVG) — sequence logos

**Scope:** sequence logos — per-position letter stacks whose total height encodes **information content** (Schneider-Stephens 1990) and individual letter heights reflect frequencies. DNA/RNA/protein motifs: TF binding sites, splice sites, kinase substrates, CRISPR composition. Letters are SVG text glyphs (Logomaker's approach) — no CDN dependency, works offline, §6.4 skipped.

**Spec** (fills `/*__SPEC__*/`):

```js
{
  "title": "TF binding motif (42 sites; bits, uniform background)",
  "positions": [
    [{"letter": "A", "height": 1.36}, {"letter": "G", "height": 0.31}, {"letter": "C", "height": 0.18}],
    ["...": "..."]
  ],
  "ymax": 2,
  "ylabel": "Bits",
  "colors": {"A": "#009E73", "C": "#0072B2", "G": "#E69F00", "T": "#D55E00"},
  "xlabels": ["-3", "-2", "-1", "+1", "+2", "..."]
}
```

**Key rules**

- **The agent computes information content upstream** and emits per-letter heights. Bits encoding: position IC `R = log2(K) − H(p)` (K=4 DNA, 20 protein; max 2 bits DNA / 4.32 protein); letter height = `p(letter) × R`. **Default to bits** — probability encoding (every position height 1.0) cannot show a conservation gradient and reviewers expect bits.
- **Background correction**: bits assume uniform background; for genome-derived motifs pass genome composition upstream (human ≈ A/T 0.29, C/G 0.21) — otherwise GC-preferring motifs overestimate conservation.
- **Small-sample bias**: IC from N < 20 instances looks spuriously "conserved" — apply the Schneider 1986 correction upstream and **annotate N in the title**; require N ≥ 20 for a credible motif.
- **Alphabets**: DNA (A/C/G/T), RNA (A/C/G/U), protein (20 aa; kinase-substrate color scheme: phospho-acceptors S/T/Y vermillion, basic K/R/H blue, acidic D/E pink, hydrophobic green). **Never compare logos with different alphabets on one bits axis** (2 vs 4.32 max) — normalize to fractional information or present separately.
- **Aligned input only**: sequences must be same length; emit stacks bottom-up in the order to display.

## 5f. UpSet (engine 9, template-native SVG) — set-intersection plots

**Scope:** UpSet plots (Lex 2014) — set-intersection display for **4+ sets**, where Venn diagrams become illegible. Intersection bars above a dot matrix (sets participating in each intersection), per-set total-size bars on the left. For ≤3 sets a Venn/proportional layout is still fine; ≥4 → UpSet.

**Zero dependencies** like GenomeTracks/ClusterHeat/OncoPrint/SeqLogo — no CDN, works offline, §6.4 skipped.

**Spec** (fills `/*__SPEC__*/`):

```js
{
  "title": "Driver-gene overlaps across 4 pathways (cardinality-sorted, top 12 intersections)",
  "sets": ["RTK", "PI3K", "WNT", "p53"],
  "set_sizes": {"RTK": 120, "PI3K": 95, "WNT": 88, "p53": 76},
  "intersections": [
    {"sets": [0, 1], "size": 45, "label": "46"},
    {"sets": [0], "size": 38, "label": "38"},
    {"sets": [0, 1, 3], "size": 22, "color": "#D55E00", "label": "22"},
    ["...": "..."]
  ],
  "degree_labels": true
}
```

**Key rules**

- **The agent computes intersections upstream**: deduplicate elements (`lapply(sets, unique)` equivalent) — duplicates silently inflate counts; choose the sort; **cap displayed intersections** (2^N − 1 explosion: 10 sets = 1023 columns; show top ~12–20).
- **Sort by the question**: **cardinality** (biggest overlaps first — the default) vs **degree** (grouped by number of sets — "exclusive vs shared" stories). Set `degree_labels: true` when degree-sorting.
- **1-set exclusives** usually top a cardinality sort and obscure the cross-set story — filter them out or switch to degree sort, and say which.
- **Highlighting**: per-intersection `color` for pre-specified queries (e.g. the biologically relevant overlap), like ComplexUpset `upset_query`.
- **Limits**: ≤ ~8 sets readable; >10 → decline and route upstream (ComplexUpset/upsetplot). Attribute panels (per-intersection boxplots) are a ComplexUpset strength — out of scope here.

## 6. Self-check (run before every delivery)

```text
[ ] 1. Spec is STRICT JSON (quote every key) and parses: python3 -c "import json; json.load(open('/tmp/spec.json'))" — the slot fill must be pure JSON, not JS-literal notation (unquoted keys fail this check; strict JSON is valid JS everywhere, the reverse is not)
[ ] 2. Template CDN tag version matches the engine version in this SKILL.md (§ header pins)
[ ] 3. /*__SPEC__*/ slot replaced exactly once (grep -c "__SPEC__" file == 0 after fill)
[ ] 4. <script src> URLs reachable: curl -sI -o /dev/null -w "%{http_code}" <url> == 200 (skip when offline — note it in the delivery message; skip entirely for GenomeTracks, ClusterHeat, OncoPrint, SeqLogo and UpSet — no CDN)
[ ] 5. No NaN/undefined/None leaked into the spec (grep -c "NaN\|undefined" spec == 0)
[ ] 6. Title text present in the spec; file written to <workdir>/charts/<name>.html; absolute path reported
```

If the user has no network, say so and offer the same spec via lumen-generate_visual (static render) instead — do not silently produce a blank page.

## § Signature library

| #   | Symptom                                                 | Likely cause                                                                           | Fix                                                                        |
| --- | ------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| S1  | Blank canvas, no console error                          | ECharts sankey link references a `data.name` that doesn't exist (§4)                   | Diff link names against data names; string-equal check                     |
| S2  | Blank canvas, `ReferenceError` in console               | Spec slot filled but engine script tag edited/broken                                   | Restore the template's pinned `<script>` tag; never edit script tags       |
| S3  | Chart renders but labels missing/overlapping            | Cytoscape style: `"content"` selector typo or too many nodes                           | Check §5 label rules; drop labels >100 nodes                               |
| S4  | Log-scale axis renders linear                           | Plotly `type: "log"` put on the trace instead of the axis                              | Move `type: "log"` into `layout.<x                                         |
| S5  | `Uncaught Error: Timeout` / CDN fails to load           | Offline or blocked CDN                                                                 | Check `curl` (§6.4); offer lumen fallback; never inline the lib "as a fix" |
| S6  | Pie chart shows axes                                    | `scales` block left in a pie/doughnut spec (§2)                                        | Delete the scales block                                                    |
| S7  | Edges missing                                           | Duplicate edge `id`s in Cytoscape elements (§5)                                        | De-duplicate ids; regenerate with counter suffix                           |
| S8  | Page renders but chart is 0px tall                      | Template container edited, or spec emitted before `DOMContentLoaded`                   | Use template verbatim; the container and init order are pre-wired          |
| S9  | Cytoscape: a node or edge silently absent               | Duplicate `id` across the whole `elements` set (ids are global across nodes AND edges) | De-duplicate ids across all elements; regenerate with counter suffix       |
| S10 | Chart.js chart squashed / wrong height despite 60vh box | `maintainAspectRatio` left at default `true` (container height ignored)                | Set `options.maintainAspectRatio: false` (§2)                              |

## 7. Engine version pins (single source of truth — update SKILL.md first, then templates)

| Engine       | Pinned version      | CDN URL (in template)                                                 | License    |
| ------------ | ------------------- | --------------------------------------------------------------------- | ---------- |
| Chart.js     | 4.5.1               | `https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js`   | MIT        |
| Plotly.js    | 4.1.1               | `https://cdn.plot.ly/plotly-4.1.1.min.js`                             | MIT        |
| ECharts      | 6.1.0               | `https://cdn.jsdelivr.net/npm/echarts@6.1.0/dist/echarts.min.js`      | Apache-2.0 |
| Cytoscape.js | 3.34.3              | `https://cdn.jsdelivr.net/npm/cytoscape@3.34.3/dist/cytoscape.min.js` | MIT        |
| GenomeTracks | 1 (template-native) | none — vanilla-JS SVG in `templates/genetracks.html`                  | n/a        |
| ClusterHeat  | 1 (template-native) | none — vanilla-JS SVG in `templates/clusteredheatmap.html`            | n/a        |
| OncoPrint    | 1 (template-native) | none — vanilla-JS SVG in `templates/oncoprint.html`                   | n/a        |
| SeqLogo      | 1 (template-native) | none — vanilla-JS SVG in `templates/seqlogo.html`                     | n/a        |
| UpSet        | 1 (template-native) | none — vanilla-JS SVG in `templates/upset.html`                       | n/a        |

Bump procedure: verify the new version on the npm registry, update the table here, then `sed` the same version string into every template, run §6, then bump this skill's version and add a README changelog line. Never float (`@latest`/`@^`) — reproducibility beats freshness.

## 8. Relationship to other renderers

- **Mermaid / flow / sequence / ER diagrams** → out of scope; use `lumen-generate_visual` (mermaid routes) in the Pi harness.
- **ggplot2/matplotlib fundamentals** → the R/Python tooling (cairo_pdf, tidy evaluation, ggrepel) stays out of scope, but the design layer — publication theme baseline and faceting conventions — **is imported as §10.10**; faceting is rendered via Plotly subplots (§3), which is why no sixth template exists for it.
- **Fgraph structured diagrams** (layered/sequence topologies) → `lumen-generate_visual type:"diagram"`.
- chartz adds the four engines above — use it whenever the output must be a **portable data chart** the user opens in their own browser, with data the agent already holds.

## 9. Update check

```bash
python3 bin/skill-update-check.py
```

Verdicts: `UP-TO-DATE` / `LOCAL-AHEAD` (ok) · `BEHIND-BY-N` (re-sync from upstream repo) · `OFFLINE` / `NO-ORIGIN` (informational). Stdlib-only, `git fetch`-based, no GitHub API.

## 10. Design conventions

SKILL.md §1–§5 make a spec *valid*; this section makes it *correct*. These are pre-spec decisions an agent commits to before emitting JSON, adapted from the published literature cited inline (Wong 2011, Nuñez 2018, Crameri 2020, Wasserstein-Lazar 2016, Zhu 2019, Stephens 2017); tool-specific R/Python implementations are out of scope.

### 10.1 Palettes — match palette type to data type (Wong 2011; Nuñez 2018; Crameri 2020)

| Data type                                  | Use                                                                                                                                                                           | Never                                            |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Categorical (≤8 groups)                    | **Okabe-Ito**: blue `#0072B2`, vermillion `#D55E00`, bluish green `#009E73`, orange `#E69F00`, sky blue `#56B4E9`, reddish purple `#CC79A7`, yellow `#F0E442`, gray `#999999` | red/green pairs; >20 hues                        |
| Sequential (expression, coverage, density) | `Viridis`, `Magma`, `Cividis` (Plotly colorscale strings; ECharts `visualMap.inRange`)                                                                                        | `Jet`, `Rainbow`, blue→red ramp                  |
| Diverging (LFC, z-score, signed values)    | blue↔white↔red, **reversed** so negative=blue, positive=red (bio convention), symmetric bounds around 0                                                                       | non-symmetric bounds; sequential for signed data |
| Cyclic (phase, angle)                      | out of scope for the pinned engines — route to Plotly 3D or decline                                                                                                           |                                                  |
| Categorical >20 groups                     | none — redesign the chart (facet, treemap, aggregate to "Other")                                                                                                              | more colors                                      |

Grayscale test: a sequential palette must be luminance-monotonic (readable order in grayscale).

### 10.2 Volcano / MA plots

- **Plot shrunken LFC when the input provides it** (DESeq2 `apeglm`/`ashr`); raw MLE LFC inflates at low counts and mislabels noise as top hits. Note the estimate in the axis title ("log2 fold change (shrunken)").
- **Color by class, not gradient**: Up `#D55E00`, Down `#0072B2`, NS `#999999` — three traces, not a continuous colormap.
- **Thresholds as dashed lines**: vertical at ±LFC cut, horizontal at −log10(FDR), gray `#666666`.
- **Label selectively**: only a gene list of interest or top-N by `−log10(p)·|LFC|` combined rank. Labeling every significant point produces an unreadable plot.
- MA plot: x = mean expression (log scale), y = LFC; same class coloring; add a horizontal line at LFC = 0.

### 10.3 Heatmaps

- Expression across conditions → **row z-score** before rendering; diverging colorscale symmetric around 0 with **robust bounds** (clip at 1st/99th percentile or ±2 SD) — one outlier must not compress the whole scale (Plotly: `zmin`/`zmax` set explicitly).
- Raw values (coverage, abundance) → sequential palette with quantile-clipped `zmin`/`zmax`.
- Dendrograms/clustering: attached dendrograms route to **ClusterHeat (§5c, height-proportional)**; standalone topology-only tree → ECharts `tree` (§4) — say which in the delivery message.
- **Clustering = 3 independent decisions** (scaling × distance × linkage), each changing the story — pick deliberately and report all three in the title (distance: correlation; linkage: ward.D2; scaling: row z-score).
- **The ward.D / ward.D2 trap** (Murtagh-Legendre 2014): only `ward.D2` (R) / scipy `ward` implements Ward's actual minimum-variance criterion; R's `ward.D` is a legacy method that does not. Always specify `ward.D2` explicitly.
- **Optimal leaf ordering** (Bar-Joseph 2001; `scipy` OLO / `seriation`) reduces crossing clutter — apply before emitting the ordered matrix.
- Single linkage chains (almost never wanted in genomics); complete is outlier-sensitive; average is balanced; Ward gives compact spherical clusters.
- GWAS Manhattan/Miami/QQ, meta-analysis forest/funnel, protein lollipop maps: Plotly contracts above.

### 10.4 Statistical annotation

- Asterisk convention (Wasserstein-Lazar 2016): `***` p<0.001, `**` p<0.01, `*` p<0.05, `ns` p≥0.05.
- **Test must match the data** — condensed decision table (full: statistical-annotation corpus):

| Comparison                        | Test                                             |
| --------------------------------- | ------------------------------------------------ |
| 2 unpaired, normal, N≥30          | Welch t-test                                     |
| 2 unpaired, non-normal or small N | Mann-Whitney U (Wilcoxon rank-sum)               |
| 2 paired                          | Paired t-test or Wilcoxon signed-rank            |
| 3+ groups, normal                 | One-way ANOVA + Tukey HSD post-hoc               |
| 3+ groups, non-normal             | Kruskal-Wallis + Dunn post-hoc                   |
| Nested (cells in patients)        | Linear mixed model / pseudobulk — NEVER pairwise |

  Disclose test + adjustment in the title, subtitle, or a legend line — e.g. "Wilcoxon rank-sum, Holm-adjusted". The agent holds the data; it runs or is told the test — chartz only renders the verdict.

- **Overall + pairwise pattern**: annotate the omnibus test (Kruskal-Wallis / ANOVA) near the top of the panel, pairwise brackets below — pairwise post-hoc only after the omnibus is significant. Pairwise-all-significant with a non-significant omnibus = multiple-testing inflation.
- **Adjustment defaults**: **holm** for figure annotations (uniformly more powerful than Bonferroni, controls FWER); Bonferroni acceptable for ≤3 pre-planned comparisons; **BH** when the figure sits in a genomics FDR regime. FWER arithmetic: 3 groups → 14% false-positive at nominal 5%, 4 → 26%, 6 → 54% — unadjusted brackets over-report.
- Brackets in Plotly: three `shape` lines per comparison (two risers + crossbar) plus an `annotation` for the label; keep y-positions stacked so brackets don't overlap.
- **Failure modes** (each with a chartz-visible consequence):
  - t-test on non-normal/small-N data → "significant" where the rank test is not;
  - pairwise brackets with raw p → all-pairs "significant", doesn't replicate;
  - paired data tested as independent → lost power, n.s. where paired is significant;
  - nested data (cells within patients) tested pairwise → pseudoreplication, p ≪ 1e-30 from ~10 real units — aggregate per-unit or model upstream;
  - asterisks without any exact p → reader can't recover the value; show numeric p or point to a table;
  - effect size omitted → p = 1e-10 on a trivial difference reads as biology; report the median difference / effect size with the bracket.
- Don't render ns brackets unless the non-result is the point of the figure OR the pair was pre-specified (annotate pre-specified pairs with n.s.; hide only unplanned ones).

### 10.5 Network layout (Cytoscape)

Layout is an **artifact, not biology** — always state the layout choice in the delivery sentence.

| Graph shape                 | Layout                            |
| --------------------------- | --------------------------------- |
| DAG / dependency / pipeline | `breadthfirst` (`directed: true`) |
| PPI / pathway / regulatory  | `cose`                            |
| Hub emphasis                | `concentric`                      |
| Tiny graphs (<12 nodes)     | `circle` or `grid` acceptable     |

- **Encode node attributes** (network-visualization practice): node **size ∝ degree/centrality** (a 5-edge protein must not look like a 500-edge hub — Cytoscape.js: per-node `data.size` + style `width: data(size), height: data(size)`); edge **width ∝ weight/confidence** (`width: data(w)`) — uniform widths hide strong-vs-weak interactions.
- **Color by community/module** (greedy modularity or Leiden computed upstream), Okabe-Ito per module (§10.1).
- **Label hubs only** (degree ≥ 5–10, or genes of interest) — labeling every node in >30-node networks is unreadable; the >100-node rule above is the hard fallback.
- **Reproducibility**: force-directed layouts are stochastic. Either (a) compute positions upstream with a seeded layout (NetworkX `spring_layout(seed=42)`) and emit Cytoscape `preset` layout with per-node `position`, or (b) accept `cose` randomness and say so. Comparing two networks: compute the layout on the **union network** and reuse positions — otherwise "this protein moved" is the layout, not biology.
- **Hairball regime**: >~2000 edges with force-directed layout loses all structure — filter to top-confidence edges or aggregate upstream; hive plots, hierarchical edge bundling, and Datashader are out of scope for the pinned templates. >50k nodes → decline and route upstream.
- **Adjacency-matrix alternative**: for connectivity-only questions (no positions needed), an adjacency-matrix heatmap (§3 / §5c) avoids the layout artifact entirely.

### 10.6 Dimensionality-reduction plots (PCA / t-SNE / UMAP / PHATE)

Distilled from dimensionality-reduction practice (Chari-Pachter 2023; Kobak-Berens 2019; Becht 2018; Moon 2019). The embeddings themselves are colored scatters — any scatter-capable engine renders them; the conventions below are about **honest disclosure**, not geometry.

- **Method choice is the first decision**: PCA for variance/batch diagnostics and anything needing loadings; UMAP (`n_neighbors` 15–50, `min_dist` 0.1–0.5) for cluster overview; t-SNE (perplexity 30–50; max(5, n/30) for small n) for cluster boundaries; PHATE/diffusion for trajectories. chartz renders whichever the agent computed — it does not choose the method.
- **PCA axes must carry variance explained**: `PC1 (34% variance)` in the axis title. A PCA plot without % labels is unreadable; if PC1+PC2 ≪ 50%, say so — apparent clusters may be noise.
- **Loadings are PCA-only**: top-N loading arrows drawn as biplot overlays are meaningful only in PCA space; never annotate loadings on UMAP/t-SNE coordinates.
- **Every embedding plot states hyperparameters + seed** in the title or subtitle: method, perplexity / n_neighbors / min_dist, random_state. Un-seeded stochastic embeddings are not reproducible.
- **Delivery sentence must carry the interpretation limit**: UMAP/t-SNE preserve local neighborhoods; **distances between clusters, cluster shapes, and point density are artifacts, not biology** (Chari-Pachter 2023). Never infer trajectory from a UMAP gap — validate with pseudotime/PHATE/RNA velocity.
- **Batch-effect diagnostic is PCA colored by batch**, not UMAP — UMAP's local-neighborhood preservation can visually hide batch effects.
- Cluster colors: Okabe-Ito (§10.1). Many clusters (>12): consider labeling on-data rather than a long legend.

### 10.7 Distribution plots (box / violin / beeswarm / raincloud)

Distilled from distribution-plot practice (Weissgerber 2015; Allen 2019; Hofmann 2017; McGill 1978). Core rule: **never bar-of-mean ± SEM for comparing distributions** — many distinct distributions produce identical bars (Weissgerber 2015, *PLOS Biol*). chartz renders the encoding; the agent picks it by N.

- **Encoding by N per group** (always annotate N — tick label like `WT (n=12)` or the title):

| N per group | Encoding                                                                              |
| ----------- | ------------------------------------------------------------------------------------- |
| < 30        | box + jittered raw points (`boxstrip`); every point visible                           |
| 30–200      | **raincloud** (half-violin + box + jitter) or box + jitter                            |
| > 200       | violin with **explicit bandwidth**, or density/histogram — individual points overplot |

- **KDE bandwidth honesty**: default bandwidth oversmooths bimodal data into a single peak — biologically false for on/off expression. Plotly: set `bandwidth` explicitly on violin traces when the data may be multimodal; say which selector in the delivery sentence.
- **Box + points: suppress box outliers** (`boxpoints: false`) — otherwise outliers render twice (box marker + jitter dot).
- **Notched box** (`notched: true`, ±1.58·IQR/√n, McGill 1978): only for N ≥ 15; below that notches distort — show raw points instead.
- **Small N kills KDE**: a smooth violin from 5 points is a bandwidth artifact, not biology — below ~30 points drop the violin, show box + raw points.
- **Split violin** for 2-condition comparison per group: two traces at the same x with `side: "positive"` / `side: "negative"` and different fills.
- Colors: Okabe-Ito (§10.1); significance brackets per §10.4.

### 10.8 Flow / transition plots (Sankey / alluvial / CONSORT)

Distilled from flow-diagram practice (Brunson 2020 ggalluvial; Schulz 2010 CONSORT; Riehmann 2005). The pivotal distinction:

- **Sankey = aggregate flow** (source → sink totals). **Alluvial = entity trajectories** across ordered timepoint columns. A Sankey says "120 cells became neuronal"; an alluvial says "of those, 80 came from the proliferating pool". Different stories — pick by question, and say which one the chart answers.
- **Alluvial on the pinned engines**: ECharts `type: "sankey"` with one node per (timepoint, category) — names must be unique, so prefix with the timepoint (`t1·Proliferating`). 2 timepoints → plain Sankey; 3–5 columns → alluvial-style; >5 axes → ribbons cross into spaghetti, decline or split.
- **Ribbon color encodes the story**: fill by **origin** class for "where did this end-state come from"; by **destination** for "where did this origin go". Never leave it accidental.
- **Category ordering**: order nodes within each column deliberately (biological order or by flow magnitude) — default ordering shuffles columns and maximizes crossings. ≤5–7 categories per column.
- **Flow conservation**: keep in-flow = out-flow at every internal node; imbalanced flows render as stretched/compressed ribbons and read as data errors.
- **CONSORT** (Schulz 2010, item 13a — required for RCT publication): vertical box-and-arrow trial flow. Render with Cytoscape (`breadthfirst`, `directed`, round-rectangle nodes; see `examples/cytoscape-consort.html`). Required boxes: assessed → excluded (side) → randomized → allocated per arm → follow-up/withdrawals → analysed. Counts must sum at every stage.

### 10.9 Forest & funnel plots (meta-analysis)

Distilled from meta-analysis practice (Higgins-Thompson 2002; Higgins 2009; Sterne 2011; Peters 2008; IntHout 2014). chartz renders; the agent runs the pooling. **Heterogeneity is the first question**: a pooled estimate without heterogeneity statistics is a list of effects, not a meta-analysis.

- **Forest bottom line must report**: pooled estimate + 95% CI + **I²** + τ² + Q-test p (title or subtitle). I² tiers: >25% low, >50% substantial, >75% considerable (Cochrane Handbook §10.10.2). I² > 75% → demand subgroup/meta-regression before presenting one pooled number.
- **Small-k regime**: HKSJ adjustment (`test='knha'`) for k < 5; **never report I² for k < 5** (Borenstein 2017); **no pooled diamond at all for k < 3** — individual study effects only.
- **Weights must be visible**: marker size ∝ inverse-variance weight (a 5-patient pilot must not look like a 5000-patient trial).
- **Log axis for ratios** (OR/HR/RR) with ticks at meaningful values (0.25, 0.5, 1, 2, 4) and a dashed null line at 1.
- **Prediction interval** (Higgins 2009): report where a *new* study would fall whenever I² > 30% — the most honest summary under heterogeneity.
- **Subgroup forests**: visual differences between subgroups establish nothing — the treatment × subgroup **interaction p** must be in the plot.
- **Funnel plots**: contour-enhanced (Peters 2008) — shade the pseudo-CI regions at p<0.10/0.05/0.01; asymmetry concentrated in the non-significant region is the specific publication-bias signal. **Egger's regression test requires k ≥ 10** (Sterne 2011); below that, visual asymmetry only. Trim-and-fill is a **sensitivity analysis** — never present the adjusted estimate as the answer.

### 10.10 Publication figure conventions (grammar of graphics) & faceting

Distilled from ggplot2 grammar-of-graphics practice (Wickham 2010; Wilkinson 2005), mapped onto chartz's engines. chartz's spec already mirrors the grammar: `data` + traces (aesthetics + geoms) + `layout` (scales + theme) — these conventions make the theme layer deliberate.

- **Publication baseline (theme_classic equivalent)**: no panel gridlines, solid light axis lines, ticks outside, title bold, base font 11–13 px, legend bottom or right, strip/panel titles plain bold. In Plotly: per-axis `showgrid: false`, `showline: true`, `ticks: "outside"`, `zeroline: false`; in Chart.js: `grid.display: false` per scale.
- **Faceting** (small multiples): one panel per category. Use Plotly subplots (one trace per panel with per-panel `xaxis`/`yaxis` + `layout.grid`). Panel titles via `layout.annotations`.
- **Facet scales**: `fixed` (shared axes) when panels are **compared** — the default and the safe choice; `free_y` only when panel units are inherently different, and say so in the title. Free scales make cross-panel height comparison invalid — reviewers will ask.
- **Mapping vs constant**: color per category = one trace per class (the mapping); a fixed color applies to everything in a trace. chartz has no `aes()` — the one-trace-per-class pattern IS the mapping.
- **Explicit discrete ordering**: categorical axes render in spec order — order ticks deliberately (control first, then dose ladder; §10.7's N-annotated ticks likewise).
- **Journal sizing note**: chartz output is interactive HTML; when the agent also needs print export, target Nature single/double column (89/183 mm) and state DPI — the HTML itself is resolution-independent.

### 10.11 Multipanel composition (multi-panel figures)

Distilled from multi-panel composition practice (Wickham 2016 patchwork; Nature/Cell figure guidelines). A **faceted** figure (§10.10) splits ONE plot type by category; a **composed multipanel figure** combines DIFFERENT chart types into one figure — the paper "Figure 1" shape (scatter + box + histogram + network). Compose via Plotly `layout.grid` with one trace-group per panel; keep every panel in the same engine.

- **Panel tags**: Nature — lowercase bold (**a, b, c**), placed **outside the panel, above its top-left corner** (domain refs `x: 0, y: 1.03–1.05`, `xanchor: "left"`, `yanchor: "bottom"`), ~11 px; Cell/Science — uppercase (A, B, C). Keep tag positions identical across panels (anchor to each panel's own domain, so differing y-label widths don't skew the row). Inside placement is the fallback only when there's no headroom above a panel (e.g. tight dashboards).
- **Tag axis-ref trap**: each annotation's `xref`/`yref` must be the target panel's own axes (`x domain`…`x4 domain`) — a naive `i % 2`-style loop mapping breaks when axes are numbered `x2`/`x3`/`x4`, silently stacking all tags into one panel (worked example uses a `panel_axes` list shared by traces and tags).
- **Collect axes and legends**: y-axis titles only on left-column panels, x-axis ticks only on bottom-row panels, ONE shared legend for the whole figure — redundant per-panel axes/legends are clutter and non-compliant with journal style.
- **Different trace types per panel are fine** (scatter, box, histogram, bar share one `grid`) — this is chartz's native composition path; cross-engine composition (e.g. Plotly + Cytoscape in one file) is not supported yet.
- **Journal sizing** (for print export; the HTML itself is resolution-independent): Nature 89/183 mm, Cell 85/174 mm, Science 55/120 mm, PNAS 87/178 mm, eLife 86/175 mm — always in mm.
- **Tag alignment failure mode**: tags anchored to the canvas drift when y-label widths differ — either pad label widths or anchor tags inside the panel (`xanchor: "left"` at domain-relative positions).

### 10.12 OncoPrint / mutation matrices

Distilled from OncoPrint practice (Cerami 2012; Gu 2016; Mayakonda 2018; Canisius 2016).

- **Stacking is the payload**: each cell encodes multiple alteration classes as stacked bands (`;`-separated cells in ComplexHeatmap terms). Flattening to one class per cell loses co-occurring events — the reference's #1 failure mode.
- **Sample order = memoSort / burden sort** (computed upstream); keep the "staircase" pattern intact — do not override with arbitrary order and do report the sort criterion in the caption.
- **Keep empty samples** (`remove_empty_columns = FALSE` equivalent): the cohort denominator is what makes gene percentages honest.
- **Hypermutators**: 1–2 POLE/MSI-H samples have TMB 10–100× typical — the TMB bar must use **log10(tmb + 1)** values (transform upstream).
- **Small-cohort regime (N = 20–50)**: Fisher-exact mutual-exclusivity p-values are uninterpretable (no power); report per-gene frequencies with **exact-binomial (Clopper-Pearson) CIs** instead, treat the cohort as replication, and pool with TCGA/ICGC for mutex claims. For pan-cancer analyses prefer **DISCOVER** (Canisius 2016) over Fisher when per-sample mutation rates vary 100×.
- **Display 10–25 genes**; alteration-class palette per §10.1 (missense sky-blue, truncating black, splice pink, CNA vermillion/blue, fusion green).

### 10.13 Sequence logos

Distilled from sequence-logo practice (Schneider-Stephens 1990; Schneider 1986; Crooks 2004; Wagih 2017; Tareen-Kinney 2020).

- **Bits vs probability are different visualizations**: bits (total height = position IC) show the conservation profile; probability (total height 1.0) cannot. **Default to bits** unless the question is raw composition (e.g. CRISPR spacer composition).
- **Background correction changes the story**: uniform-background bits overestimate conservation for bases preferred relative to the genome — pass the real genome composition upstream (human ≈ A/T 0.29, C/G 0.21; GC-rich genomes differ).
- **N discipline**: annotate the number of instances in the title; N < 20 is hypothesis generation (small-sample IC bias makes even random motifs look conserved). Apply the Schneider 1986 correction upstream.
- **Never overlay logos with different alphabets** on one bits axis (DNA max 2 vs protein max 4.32) — normalize to fractional information or present separately.
- Letters: one trace per letter is not needed — SeqLogo takes precomputed stacks; keep class colors consistent across panels of the same alphabet.

### 10.14 UpSet plots

Distilled from UpSet practice (Lex 2014; Conway 2017; Krassowski ComplexUpset).

- **UpSet replaces Venn at 4+ sets** — Venn is illegible past 4; ≤3 sets → Venn still fine. UpSetR is legacy (no release since 2019); the R reference is ComplexUpset — chartz consumes precomputed intersections from either.
- **Sort by the question**: cardinality (biggest overlaps first, default) vs degree (grouped by set count — "exclusive vs shared"). Report the sort in the caption.
- **Deduplicate elements before counting** — duplicated memberships silently inflate intersection sizes.
- **Cap intersections** (2^N − 1 explosion) and consider excluding 1-set exclusives when the cross-set story is the point — document the exclusion.
- **Highlight pre-specified queries** with per-intersection color rather than expecting the reader to find them.

### 10.15 Design self-check (extends §6 — run for any chart where color or thresholds carry meaning)

```text
[ ] D1 Palette type matches data type (§10.1); Categorical uses Okabe-Ito; no rainbow/jet/red-green
[ ] D2 Diverging data has symmetric bounds around 0; outliers clipped (§10.3)
[ ] D3 Thresholds drawn as dashed gray lines, not implied (§10.2)
[ ] D4 Statistical test + adjustment disclosed if significance is rendered (§10.4)
[ ] D5 Layout choice stated in delivery sentence for network graphs (§10.5)
[ ] D6 Embedding plots: method + hyperparameters + seed in title, variance % on PCA axes, interpretation-limit caveat in delivery sentence (§10.6)
[ ] D7 Distribution plots: encoding matches N per group, N annotated, KDE bandwidth explicit for violins, box outliers suppressed when points overlaid, never bar-of-mean (§10.7)
[ ] D8 Flow plots: Sankey-vs-alluvial choice matches the question, ribbon color origin/destination deliberate, node ordering explicit, flows conserved at internal nodes (§10.8)
[ ] D9 Meta-analysis plots: I²/τ²/Q reported with pooled estimate, weight-coded marker sizes, log axis for ratios, k<5 → no I² (k<3 → no pooled diamond), contour-enhanced funnel, Egger only at k≥10 (§10.9)
[ ] D10 Publication theme: gridlines off / axis lines on / bold title baseline applied; facet scales fixed when comparing across panels (free only when inherent, stated in title) (§10.10)
[ ] D11 Multipanel figures: panel tags a/b/c in journal style placed OUTSIDE above each panel's top-left, axes/ticks only on outer edge, ONE shared legend, no redundant per-panel titles (§10.11)
[ ] D12 OncoPrint: cells never flattened to one class (stacking preserved), samples keep true cohort denominator, TMB log10-transformed, no mutex p-values on small cohorts (§10.12)
[ ] D13 Sequence logos: bits encoding (not probability), background correction applied and stated, N annotated in title, no mixed-alphabet bits-axis comparisons (§10.13)
[ ] D14 UpSet: used at 4+ sets (not Venn), elements deduplicated before counting, sort (cardinality/degree) matches the question and is stated, intersections capped (§10.14)
```