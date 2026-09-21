Engine: Plotly.js
Template: templates/plotly.html
Routing row: 9
Loaded from SKILL.md §1 routing when this engine is selected.

# Plotly.js — scientific / statistical

**Scope:** box, violin, histogram, 2D histogram, heatmap, contour, error bars, log axes, subplots, 3D surface/scatter, **GWAS Manhattan/Miami/QQ plots, meta-analysis forest/funnel plots, protein lollipop maps, distribution combos (raincloud, box+jitter strip, split violin)**. This is the bioinformatics-workspace default for distributional data (MA plots, volcano plots, differential abundance).

**Print export** (v0.8.0): when the spec carries `export`, the template wires Plotly's modebar camera to `toImageButtonOptions` — `format: "svg"` by default (**true vector**, the journal submission format), `scale` for the PNG raster, filename derived from the layout title. Optional spec field: `export: { format: "svg", scale: 4 }` (all keys optional; `{}` alone switches the camera to vector SVG). See SKILL.md §6b.

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

- **Manhattan** (`plotly-manhattan.html`): one trace per chromosome with alternating Okabe-Ito blue/gray; cumulative x-offset per chromosome with `tickvals`/`ticktext` at chromosome centers; dashed horizontal genome-wide line at −log10(5e-8) with a text annotation (references/conventions.md §10.2 threshold rule). >100k SNPs → route to ECharts with `dataZoom`.
- **Miami** (`plotly-miami.html`): two mirrored Manhattan groups; y-axis `range` symmetric, negative ticks labeled as positive; two dashed threshold lines.
- **QQ** (`plotly-qq.html`): observed vs expected −log10(p), dashed identity line, genomic-inflation λ in the title; points sorted independently.
- **LocusZoom-style regional** (`plotly-locuszoom.html`): ~1 Mb window around the lead SNP; one trace per **LD r² bucket** (1.0 / 0.8–1.0 / 0.6–0.8 / 0.4–0.6 / 0.2–0.4 / <0.2, ordered palette); lead SNP as labeled diamond; gene track via paper-ref `rect` shapes **inside** the plot bottom (labels above the rects — outside collides with tick labels); recombination rate on a secondary `yaxis2` (dotted). **LD reference must match the GWAS population** — a European reference on a non-European GWAS produces wrong colorings.
- **Axis truncation** (Manhattan/regional): cap the y-axis at a stated value, redraw capped points as `triangle-up` markers, annotate "(capped at N)" on the axis, and keep the true p in the caption/tooltip data — a cap with no indication hides the peak's true magnitude.
- **Lead-SNP labeling**: label the lead rsID in a contrasting color at the top of the peak; label at most the top 3–5 secondary SNPs to avoid collisions.
- **Threshold is conditional** (Pe'er 2008; Pulit 2017; Xu 2014): 5e-8 is calibrated for European-ancestry common-variant GWAS (~1M independent tests). WGS ~5e-9, trans-ancestry ~5e-9, TWAS 2.5e-6, PWAS 1e-5, non-European ancestry empirically derived. The significance line is a contract with the reader — match it to the testing regime and say which in the title.
- **Forest** (`plotly-forest.html`): x = effect on **natural scale** (log axis does the transform — never pass pre-logged values onto `type: "log"`), y = study names; `error_x` with `symmetric: false` (`array` = CI_hi − est, `arrayminus` = est − CI_lo, **natural-scale differences**); **marker size ∝ inverse-variance weight**; pooled estimate as diamond; dashed null line at 1; ticks at 0.25/0.5/1/2/4; I²/τ²/Q in the title; 95% **prediction interval** band (references/conventions.md §10.9).
- **Funnel** (`plotly-funnel.html`): contour-enhanced (Peters 2008) — three shaded pseudo-CI triangle paths at z=1.645/1.96/2.576 with **`layer: "below"`** (shapes default above and hide the points); x = log(OR) on a **linear** axis (metafor convention); state k and the Egger k≥10 condition in the title (references/conventions.md §10.9).
- **Subgroup forest** (`plotly-forest-subgroup.html`): nested per-subgroup studies + pooled diamonds, separator line, treatment × subgroup **interaction p** annotated — visual differences establish nothing without it (references/conventions.md §10.9).
- **Faceted scatter** (`plotly-facets.html` / `plotly-facets-free.html`): 2×2 grid via `layout.grid` `{rows, columns, pattern: "independent"}` + one trace per panel with per-panel `xaxis`/`yaxis`; panel titles via `layout.annotations`; theme_classic-equivalent styling (`showgrid: false`, `showline: true`, `ticks: "outside"`); **fixed scales when comparing** across panels, `free` only when inherent and disclosed in the title (references/conventions.md §10.10).
- **Composed multipanel** (`plotly-multipanel.html`): FOUR different trace types (scatter, box, histogram, bar) in one 2×2 `layout.grid`; **collected axes** (y titles only left column, x ticks only bottom row), one shared bottom legend, Nature-style **a–d tags** anchored inside each panel (references/conventions.md §10.11).
- **Lollipop protein map** (`plotly-lollipop.html`): `mode: "lines+markers"` stems from y=0 at mutation positions; domain rectangles via `layout.shapes` (`type: "rect"`, `yref: "paper"`) with labels via `annotations`; marker color by variant class (references/conventions.md §10.1). Deep-import conventions (references/conventions.md §10.10): **print the absolute count at each lollipop** — size-only encoding saturates past ~10 and the reader can't tell 30 from 300; **state the isoform** in the title (residue numbering differs across isoforms — off-by-residue otherwise); **filter to recurrent (count ≥ 2)** for the main figure, all mutations in supplement; **domain colors map to functional class** (kinase=blue, binding=green, regulatory=purple), never rainbow; hotspots are a formal test (MutSig, Lawrence 2014) — the plot displays the verdict, it doesn't make it.
- **Two-cohort lollipop** (`plotly-lollipop-two-cohort.html`): shared domain backbone, cohort A stems upward (positive counts), cohort B downward (negative) — the maftools `lollipopPlot2` pattern; same class coloring and count labels.
- ⚠️ Funnel routing: the funnel plot above is the **meta-analysis publication-bias** funnel — ECharts `type: "funnel"` is a **staged funnel** (sales pipeline), a different chart; never route a publication-bias request to it.
- **Raincloud** (`plotly-raincloud.html`): three traces per group on a numeric x-axis — violin `side: "positive"` nudged +0.22, thin box at center with `boxpoints: false`, jittered points nudged −0.26; `bandwidth` explicit; `tickvals`/`ticktext` carry N per group (references/conventions.md §10.7).
- **Box + jitter strip** (`plotly-boxstrip.html`): box (`boxpoints: false`) + scatter of every raw point, jitter ±0.13 — the N<30 encoding (references/conventions.md §10.7).
- **Split violin** (`plotly-splitviolin.html`): two traces per group, `side: "positive"`/`side: "negative"` with different fills — paired 2-condition comparison (references/conventions.md §10.7).
