Loaded from SKILL.md §10. These conventions apply to ALL engines.

# Design conventions (D1–D13)

SKILL.md §1 and engines/<name>.md make a spec *valid*; this section makes it *correct*. These are pre-spec decisions an agent commits to before emitting JSON, adapted from the published literature cited inline (Wong 2011, Nuñez 2018, Crameri 2020, Wasserstein-Lazar 2016, Zhu 2019, Stephens 2017); tool-specific R/Python implementations are out of scope.

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
- Dendrograms/clustering: attached dendrograms route to **ClusterHeat (engines/clusterheat.md, height-proportional)**; standalone topology-only tree → ECharts `tree` (engines/echarts.md) — say which in the delivery message.
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
- **Adjacency-matrix alternative**: for connectivity-only questions (no positions needed), an adjacency-matrix heatmap (engines/plotly.md / engines/clusterheat.md) avoids the layout artifact entirely.

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