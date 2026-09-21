# chartz

[![Version](https://img.shields.io/badge/version-0.14.0-blue)](#-installation)
[![Type](https://img.shields.io/badge/type-agent%20skill-blueviolet)](#-installation)
[![README standard](https://img.shields.io/badge/README%20per-bioinfo--skill--creator-orange)](https://github.com/cheahhl814/bioinfo-skill-creator)

Render charts and graphs as self-contained HTML files from four CDN-pinned engines plus ten template-native engines, chosen by chart type. One request → one portable HTML file: simple statistical charts via Chart.js, scientific/statistical plots via Plotly.js (Manhattan, volcano, PCA, forest, lollipop, violin/box, ANI heatmap, relative-abundance bars), rich interactive dashboards via ECharts (alluvial, treemap, sunburst, dual-axis), nodes+edges network graphs via Cytoscape.js, genome-browser track figures via the zero-dependency GenomeTracks SVG renderer, clustered-heatmap composites via ClusterHeat, OncoPrint mutation matrices via OncoPrint, sequence logos via SeqLogo, set-intersection plots via UpSet, circular genome plots via Circos, metacoder-style taxonomy heat trees via HeatTree, Newick phylogenies (phylograms with bootstrap circles, scale bars, and clade ranges) via PhyloTree, IQ-TREE gCF-vs-sCF concordance scatters via Concordance — all template-native SVG — plus geographic site maps via GeoMap (raster tile basemaps from OSM/Esri/Carto, embedded offline). No build step, no server, no inline third-party library code.

**Repository**: https://github.com/cheahhl814/chartz

> [!NOTE]
> Current version: **v0.14.0** (updated 2026-09-21). v0.14.0 **retracts the PlotlyGeo engine and the GeoMap vector/choropleth examples** (outputs below the bar; kept: GeoMap with `bin/tile_basemap.py` raster tile basemaps and the user-approved `geomap-sampling-sites.html`; heavy GIS stays with geopandas/sf, place-name resolution with the geocoding skill). v0.13.2 adds raster tile basemaps to GeoMap (`bin/tile_basemap.py`: OSM/Esri/Carto tiles — the same 9 free providers as the geocoding skill's `map` subcommand — fetched/stitched at build time into an embedded data-URI underlay; delivered HTML renders offline).  v0.12.3 documents v0.12.3 documents **stacked / 100% composition bars** (relative abundance of taxa) with a worked Plotly example (`plotly-relative-abundance.html`: barmode stack, Other-lumping, qualitative palette, sample ordering). v0.12.2 fixes v0.12.2 fixes a v0.8.0 regression where the 22 pre-existing Plotly examples lost their `Plotly.newPlot` render call during the print-export batch edit (silent blank pages); §6 gains check 5b (render-call presence guard). v0.12.1 adds v0.12.1 adds the ANI/pairwise-identity-matrix worked example (`plotly-ani-heatmap.html`, Plotly engine) with the per-cell-label overlay pattern in engines/plotly.md. v0.12.0 adds v0.12.0 adds the **Concordance** engine (engine 14, routing row 3): IQ-TREE gCF-vs-sCF concordance-factor scatter with UFBoot-class colouring, random-33% reference lines and per-point callout labels, as a zero-dependency template-native SVG. v0.11.1 refines v0.11.1 refines PhyloTree further: circular tip labels **rotated to the tip direction**; circular legend + scale bar moved to the content corners (outside the ring — no overlap with strips); rect strips are unlabeled (figure legend covers them). v0.11.0 refines v0.11.0 refines PhyloTree: bootstrap values as **text or balloon** (`bootstrap.mode`), clade strips on the **right of the tip labels** (rect) and **concentric multi-layer arcs** (circular, never over the tree), horizontal **bottom-left scale bar** in both layouts, larger tip labels (14 pt default). v0.10.0 adds v0.10.0 adds the **PhyloTree engine** (§5i, engine 2) — iTOL-class publication-ready phylogenetic trees from a Newick string: rectangular/circular phylograms & cladograms, bootstrap circles, scale bar, clade color ranges, italic tip labels, true-vector export. v0.9.0 adds v0.9.0 adds the **HeatTree engine** (§5h, engine 1) — metacoder-style radial taxonomy heat trees with value-mapped node size/color and edge width/color, grey-for-NA, gradient legend, zero dependencies. v0.8.1 fixes v0.8.1 fixes the ECharts sankey/title overlap (S11 — sankey ignores `grid`; set `series.top`). v0.8.0 adds v0.2.0 GenomeTracks (§5b); v0.3.0 ClusterHeat (§5c); v0.4.0 OncoPrint (§5d); v0.5.0 SeqLogo (§5e); v0.6.0 UpSet (§5f); v0.7.0 adds Circos (§5g); v0.8.0 adds **print/vector export** — Download SVG (journal-submission vector, mm-sized) on all template-native engines, deterministic `export: {width_mm, dpi}` PNG raster, and Plotly vector export via `toImageButtonOptions` (SKILL.md §6b).

## Contents

- [Installation](#-installation)
- [Demo gallery](#-demo-gallery)
- [Usage](#-usage)
- [Engine routing overview](#-engine-routing-overview)
- [Engines](#-engines)
- [Design conventions](#-design-conventions)
- [Update check](#-update-check)
- [Repository layout](#-repository-layout)
- [Hard guarantees](#-hard-guarantees)
- [Provenance](#provenance)

## 📸 Demo gallery

Every one of the [59 example figures](examples/) is a self-contained HTML file — click through to any demo, or browse [`examples/screenshots/`](examples/screenshots). A sample:

| | |
|:--- |:--- |
| ![Chart.js bar chart](https://raw.githubusercontent.com/cheahhl814/chartz/master/examples/screenshots/chartjs.png)<br>**Chart.js** · sequencing yield by month | ![Chart.js scatter](https://raw.githubusercontent.com/cheahhl814/chartz/master/examples/screenshots/chartjs-scatter.png)<br>**Chart.js** · PCA of transcriptomes (PC1 vs PC2) |
| ![ClusterHeat](https://raw.githubusercontent.com/cheahhl814/chartz/master/examples/screenshots/clusterheat-simple.png)<br>**ClusterHeat** · clustered heatmap, 16 features × 6 samples | ![ECharts alluvial](https://raw.githubusercontent.com/cheahhl814/chartz/master/examples/screenshots/echarts-alluvial.png)<br>**ECharts** · cell-state transitions across timepoints (alluvial) |
| ![ECharts dual-axis](https://raw.githubusercontent.com/cheahhl814/chartz/master/examples/screenshots/echarts-dual-axis.png)<br>**ECharts** · sequencing dashboard, volume vs quality | ![ECharts treemap](https://raw.githubusercontent.com/cheahhl814/chartz/master/examples/screenshots/echarts-treemap.png)<br>**ECharts** · metagenome relative abundance by taxonomy |
| ![PhyloTree](https://raw.githubusercontent.com/cheahhl814/chartz/master/examples/screenshots/phylotree-rect.png)<br>**PhyloTree** · 16S rRNA phylogram, bootstrap circles + scale bar | ![Plotly box+strip](https://raw.githubusercontent.com/cheahhl814/chartz/master/examples/screenshots/plotly-boxstrip.png)<br>**Plotly.js** · box + raw points, dose response (exact p shown) |
| ![Plotly Manhattan](https://raw.githubusercontent.com/cheahhl814/chartz/master/examples/screenshots/plotly-manhattan.png)<br>**Plotly.js** · GWAS Manhattan plot | ![Plotly violin](https://raw.githubusercontent.com/cheahhl814/chartz/master/examples/screenshots/plotly-violin-signif.png)<br>**Plotly.js** · violin by genotype with significance brackets |

## 🚀 Installation

This is an **agent skill**, not a user-facing library. The recommended install path is to let your AI agent import it.

**Option A — give your agent this prompt (recommended):**

```text
Install the chartz skill from
https://github.com/cheahhl814/chartz —
clone it into your agent's skills directory (the path your agent watches
for skills). Then read the skill's SKILL.md to understand the engine
routing table and the per-engine spec contracts. Confirm when ready.
```

**Option B — manual install:**

```bash
git clone https://github.com/cheahhl814/chartz.git
cd chartz
```

> [!TIP]
> chartz has **no runtime dependencies to install** — no pixi, no conda, no npm. Templates load the four chart libraries from pinned CDN `<script>` tags at render time; the only local tools the skill needs are `python3` (stdlib) and a browser to open the output.

## 💡 Usage

The skill is designed to be driven by an AI agent: the agent reads the master `SKILL.md`, classifies the request against the engine routing table (§1), emits the engine's JSON spec, fills the matching template's `/*__SPEC__*/` slot, runs the 6-point self-check (§6), and delivers the absolute path of the generated HTML file.

### Print / journal export

Every template-native chart ships **Download SVG** (true vector — when the spec carries `export: {width_mm: 89}`, the SVG is sized in mm at the journal column width) and **Download PNG** (deterministic raster: `px = mm / 25.4 · dpi`, default 300 dpi). Plotly charts export **vector SVG** from the modebar camera whenever the spec carries an `export` field. Canvas-bound engines (Chart.js, ECharts, Cytoscape) have no vector path — route journal-bound figures to Plotly or a template-native engine. Full rules: SKILL.md §6b.

### Natural-language prompts that trigger the skill

```text
make a bar chart of these monthly totals
plot this data as a box plot per condition
draw a network graph of these protein interactions
build me a sankey of this budget flow
heatmap of these values with labels
phylogenetic tree from this Newick string
Manhattan plot of these GWAS results
volcano plot of this DE table
oncoprint of this mutation matrix
sequence logo of this motif
map of my sampling sites on satellite imagery
```

### Manual execution

To render an example without an agent:

```bash
git clone https://github.com/cheahhl814/chartz.git
cd chartz/examples
# open any demo in a browser — each is a self-contained HTML file
# e.g. plotly-heatmap.html, echarts-treemap.html, cytoscape-dependency-tree.html
```

> [!IMPORTANT]
> Text-to-diagram requests (flowcharts, sequence diagrams) are **out of scope** — use Mermaid for those. chartz covers data charts and graph/network rendering only.

## 🗺 Engine routing overview

The routing table in `SKILL.md` §1 maps request shape → engine (first match wins). Each engine has a spec contract with worked example and pitfalls in `SKILL.md` §2–§5.

| #   | Request shape                                                    | Engine              | Template                   |
|:--- |:---------------------------------------------------------------- |:------------------- |:-------------------------- |
| 1   | Taxonomy heat trees (metacoder-style, value-mapped nodes/edges)  | HeatTree            | `templates/heattree.html`  |
| 2   | Phylogenetic trees (Newick, phylograms, bootstrap, clade ranges) | PhyloTree           | `templates/phylotree.html` |
| 3   | Nodes + edges (pathways, networks, dependency graphs)            | Cytoscape.js        | `templates/cytoscape.html` |
| 4   | Genome-browser tracks (coverage, peaks, gene models on a locus)  | GenomeTracks        | `templates/genetracks.html` |
| 5   | Clustered heatmap (matrix + dendrograms + annotation strips)     | ClusterHeat         | `templates/clusteredheatmap.html` |
| 6   | OncoPrint (stacked mutation cells, TMB + clinical strips)        | OncoPrint           | `templates/oncoprint.html`  |
| 7   | Sequence logo (per-position letter stacks, bits axis)            | SeqLogo             | `templates/seqlogo.html`    |
| 8   | Circular genome plots (ideogram + concentric tracks + SV links)  | Circos              | `templates/circos.html`    |
| 9   | UpSet set intersections (dot matrix + bars, 4+ sets)             | UpSet               | `templates/upset.html`      |
| 10  | Box/violin/histogram/**heatmap**/3D/error bars/log axes/subplots, **Manhattan/Miami/QQ/forest/funnel/lollipop** | Plotly.js | `templates/plotly.html`    |
| 11  | Treemap/sankey/alluvial/sunburst/dendrogram/large series/dataZoom/mixed dashboards | ECharts | `templates/echarts.html`   |
| 12  | Simple bar/line/pie/doughnut/radar/scatter/bubble                | Chart.js            | `templates/chartjs.html`   |
| 13  | Anything else                                                    | ECharts (catch-all) | `templates/echarts.html`   |
| 14  | Site maps on raster tile basemaps (satellite/street, offline after build) | GeoMap              | `templates/geomap.html`    |

## 🧰 Engines

All libraries are loaded from pinned CDN URLs at render time — no local installs, no version conflicts. GenomeTracks (SKILL.md §5b), ClusterHeat (§5c), OncoPrint (§5d), SeqLogo (§5e), Circos (§5g), and UpSet (§5f) are the exceptions: template-native vanilla-JS SVG renderers with no CDN dependency, which also makes them the only offline-capable engines.

| Engine                                      | Pinned version | Role                                           | License    |
|:------------------------------------------- |:-------------- |:---------------------------------------------- |:---------- |
| [Chart.js](https://www.chartjs.org/)        | 4.5.1          | Simple statistical charts                      | MIT        |
| [Plotly.js](https://plotly.com/javascript/) | 4.1.1          | Scientific/statistical charts                  | MIT        |
| [ECharts](https://echarts.apache.org/)      | 6.1.0          | Rich interactive charts, dashboards, catch-all | Apache-2.0 |
| [Cytoscape.js](https://js.cytoscape.org/)   | 3.34.3         | Network/graph rendering                        | MIT        |
| [d3-geo](https://github.com/d3/d3-geo)      | 3.1.1          | GeoMap projections (+ raster tile helper `bin/tile_basemap.py`) | ISC  |
| [GenomeTracks](#-engines)                   | template v1    | Genome-browser track figures (SVG, no CDN)     | n/a        |
| [ClusterHeat](#-engines)                    | template v1    | Clustered heatmaps + dendrograms (SVG, no CDN) | n/a        |
| [OncoPrint](#-engines)                      | template v1    | Stacked-cell mutation matrices (SVG, no CDN)   | n/a        |
| [SeqLogo](#-engines)                        | template v1    | Sequence logos (SVG, no CDN)                   | n/a        |
| [UpSet](#-engines)                          | template v1    | Set-intersection plots (SVG, no CDN)           | n/a        |
| [Circos](#-engines)                         | template v1    | Circular genome plots (SVG, no CDN)           | n/a        |
| [HeatTree](#-engines)                       | template v1    | Metacoder-style taxonomy heat trees (SVG, no CDN) | n/a    |
| [PhyloTree](#-engines)                      | template v1    | Phylogenetic trees, Newick (SVG, no CDN)      | n/a        |

Engine version pins are single-sourced in `SKILL.md` §7 and mirrored into every template. Never float (`@latest`).

## 🎨 Design conventions

`SKILL.md` §10 encodes the **design decisions that come before the spec**: palette type by data type (Okabe-Ito categorical, viridis-family sequential, symmetric diverging), volcano/MA conventions (shrunken LFC, class coloring, dashed thresholds, selective labeling), heatmap scaling (row z-score, robust quantile bounds), statistical-annotation rules (asterisk levels, test disclosure), Cytoscape layout selection, dimensionality-reduction disclosure rules (variance % on PCA axes, hyperparameters + seed in titles, Chari-Pachter interpretation limits), and distribution-plot encoding by N (raincloud/box+jitter/violin, KDE-bandwidth honesty, no bar-of-mean — Weissgerber 2015), and flow-plot rules (Sankey-vs-alluvial story choice, ribbon color by origin/destination, flow conservation, CONSORT structure), and meta-analysis rigor for forest/funnel plots (I²/τ²/Q reporting, weight-coded markers, prediction intervals, contour-enhanced funnels, Egger k≥10, no pooled diamond at k<3), and publication-theme + faceting conventions (theme_classic baseline, facet fixed-vs-free scales, mapping-vs-constant, explicit discrete ordering). A `D1–D10` design self-check extends the §6 delivery check.

Conventions are adapted from the published literature they cite (Wong 2011 *Nat Methods*, Nuñez 2018 *PLOS ONE*, Crameri 2020 *Nat Commun*, Wasserstein-Lazar 2016); chartz consumes engine-agnostic JSON specs, so tool-specific implementations (ggplot2, matplotlib, ComplexHeatmap) are out of scope.

## 🔄 Update check

chartz ships a self-update check that compares the deployed git SHA against this upstream repo via `git fetch` — no GitHub API call, no extra dependencies.

```bash
python3 bin/skill-update-check.py
```

| Verdict       | Exit | Meaning                                              |
|:------------- |:---- |:---------------------------------------------------- |
| `UP-TO-DATE`  | 0    | Local HEAD matches origin/HEAD                       |
| `LOCAL-AHEAD` | 0    | Unpushed local commits; no action needed             |
| `BEHIND-BY-N` | 1    | Upstream is N commits ahead → re-pull from this repo |
| `OFFLINE`     | 2    | `git fetch` failed; informational only               |
| `NO-ORIGIN`   | 2    | No `origin` remote configured; informational only    |

## 📁 Repository layout

```text
chartz/
├── SKILL.md                 # Master router — start here (routing table, spec contracts, signature library)
├── README.md                # This file
├── params.json              # Machine-readable build flags (with_docs_corpus/with_pixi/with_nextflow_runner = false)
├── templates/               # One self-contained HTML template per engine (CDN-pinned or template-native SVG)
│   ├── chartjs.html · plotly.html · echarts.html · cytoscape.html   # CDN-pinned engines
│   └── phylotree.html · genetracks.html · clusteredheatmap.html · oncoprint.html · seqlogo.html · upset.html · circos.html · heattree.html   # template-native SVG
├── engines/                 # Per-engine spec contracts (JSON shape, pitfalls) — read before emitting a spec
├── references/              # Design conventions (conventions.md) and colour palettes (palettes.md)
├── examples/                # 56 worked demos: 4 v0.1.0 base demos + 52 engine/chart-type demos
│   ├── chartjs.html · plotly.html · echarts.html · cytoscape.html   # one per engine
│   ├── plotly-heatmap/volcano/violin/3d-surface/heatmap-zscore/violin-signif.html
│   ├── plotly-manhattan/miami/qq/locuszoom/forest/forest-subgroup/funnel/lollipop/lollipop-two-cohort/pca-biplot.html
│   ├── plotly-raincloud/boxstrip/splitviolin/facets/facets-free/multipanel.html
│   ├── echarts-treemap/sunburst/dual-axis/dendrogram/alluvial.html
│   ├── chartjs-radar/scatter/doughnut/scree/umap.html
│   ├── cytoscape-pathway-network/dependency-tree/consort/ppi-degree/ppi-preset.html
│   ├── genetracks-locus/peaks-genes.html · clusterheat-annotated/simple.html
│   ├── oncoprint-cohort/simple.html · seqlogo-tfbs/kinase.html · upset-genomics/degree.html
│   ├── circos-genome/chord.html · heattree-taxonomy.html · phylotree-rect/circular.html
│   └── screenshots/         # Headless-Chrome render proof for every demo
└── bin/
    └── skill-update-check.py  # Self-update check
```

Example naming convention: `<engine>-<charttype>.html`; the four base-named demos (`chartjs.html`, etc.) are the canonical one-per-engine demos from v0.1.0.

## 🔒 Hard guarantees

- **Reproducible renders** — every engine is pinned to an exact CDN version; `@latest` is never emitted.
- **Self-checked delivery** — every chart passes the 6-point §6 self-check (strict-JSON spec, slot fill, CDN reachability, NaN/undefined hygiene) before the path is reported.
- **Signature-library debugging** — silent failures (blank canvas, missing edges, squashed charts) are catalogued as S1–S10 with cause → fix, not rediscovered ad hoc.
- **Explicit stop points** — ambiguous requests surface *Evidence + Recommend + Options*, not auto-picked choices.
- **No machine-specific paths** — output goes to the working directory; the skill ships no local dependencies and no user-specific configuration.
- **Print/vector export** — template-native engines export true-vector SVG (mm-sized at journal column widths) and a deterministic PNG raster via the spec-level `export: {width_mm, dpi, font_family}` field; Plotly exports vector SVG via `toImageButtonOptions` (SKILL.md §6b).
- **Render-verified examples** — all fifty-six example demos were executed in headless Chrome, verified non-blank with zero console errors (see `examples/screenshots/`, 2× element-cropped chart renders).
- **Offline-capable template-native engines** — HeatTree (1), PhyloTree (2), GenomeTracks (4), ClusterHeat (5), OncoPrint (6), SeqLogo (7), Circos (8), and UpSet (9) are template-native SVG with no CDN dependency; they render even with no network (the only engines whose §6.4 reachability probe is skipped).
- **Battle-test equivalent, stated honestly** — chartz is a hand-authored workflow-skill and carries no preflight/skill-built/battle-test evidence chain; the de-facto battle-test is the 53 headless-Chrome-verified demos plus the §6 self-check run on every delivery (see `params.json: battle_test_note`).

## Provenance

Authored by hand following the AiX-BIO skill convention; README rendered to the [bioinfo-skill-creator](https://github.com/cheahhl814/bioinfo-skill-creator) template standard (workflow-skill adaptation). Pattern adopted from:

- **bioinfo-skill-creator** — https://github.com/cheahhl814/bioinfo-skill-creator (README standard, update-check script, signature-library/battle-test conventions)
- **herdr-skill+** — https://github.com/cheahhl814/herdr-skill-plus (single-router workflow-skill precedent)

License: MIT (skill content). Chart libraries remain under their own licenses, listed in the Engines table above.