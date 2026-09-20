---
name: chartz
description: 'Render charts and graphs as self-contained HTML files from four pinned CDN engines, chosen by chart type. Use when the user asks for a chart, plot, dashboard, heatmap, network/graph diagram, or any data visualization as a file they can open in a browser — "make a bar chart", "plot this data", "heatmap of these values", "draw a network graph", "dashboard of these metrics". Engine router: Chart.js (simple statistical), Plotly.js (scientific/statistical), ECharts (rich/dashboards), Cytoscape.js (nodes + edges). Emits one single-file HTML per chart with pinned CDN versions; no build step, no server. Does NOT do text-to-flowchart/sequence diagrams (use Mermaid/lumen-generate_visual for that) and does NOT analyze data — it renders data you already have.'
version: 0.7.0
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

> **v0.7.0.** Renders one self-contained HTML file per chart from four CDN-pinned engines (Chart.js, Plotly.js, ECharts, Cytoscape.js) plus six template-native SVG engines (GenomeTracks, ClusterHeat, OncoPrint, SeqLogo, UpSet, Circos — §5b–§5g), each pinned to an exact version. This SKILL.md is a **router + spec contract**: pick the engine from §1, emit the engine's JSON spec per that engine's file, fill a template slot, write the HTML, deliver the path. No build step.

## 0. Workflow (always all five steps)

1. **Classify the request** against the routing table (§1). If two engines could work, prefer the higher row.
2. **Emit the spec** — open `engines/<name>.md` per the routing table and emit that engine's exact JSON object.
3. **Fill the template** — copy `templates/<engine>.html`, replace **only the `/*__SPEC__*/` placeholder** with the JSON literal (templates carry pinned CDN `<script>` tags; do not edit the script tags, and do **not** re-emit `const SPEC =` — the template already declares it).
4. **Run the self-check** (§6) — every line, every delivery.
5. **Deliver** — write to `<workdir>/charts/<name>.html` (create the dir if needed) and report the absolute path plus one sentence on what the chart shows.

**Never** inline the library code into the HTML; the pinned CDN tags are the delivery mechanism. **Never** ship an HTML file with the `/*__SPEC__*/` slot still unfilled.

## 1. Engine routing table (first match wins)

| #   | If the request is…                                                                                                                                                                        | Engine                           | Template                          | Spec contract | Engine file |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------------- | ------------- | ----------- |
| 1   | Nodes + edges (pathways, gene networks, dependency graphs, org charts as graphs)                                                                                                          | **Cytoscape.js**                 | `templates/cytoscape.html`        | §5            | `engines/cytoscape.md` |
| 2   | Genome-browser track figures (coverage, peaks, gene models stacked on locus coordinates)                                                                                                  | **GenomeTracks**                 | `templates/genetracks.html`       | §5b           | `engines/genetracks.md` |
| 3   | Clustered heatmaps (matrix + attached dendrograms + annotation strips)                                                                                                                    | **ClusterHeat**                  | `templates/clusteredheatmap.html` | §5c           | `engines/clusterheat.md` |
| 4   | OncoPrint / mutation matrices (stacked alteration cells, TMB + clinical strips)                                                                                                           | **OncoPrint**                    | `templates/oncoprint.html`        | §5d           | `engines/oncoprint.md` |
| 5   | Sequence logos (per-position letter stacks, bits axis)                                                                                                                                    | **SeqLogo**                      | `templates/seqlogo.html`          | §5e           | `engines/seqlogo.md` |
| 6   | Circos circular genome plots (ideogram + concentric tracks + SV links)                                                                                                                    | **Circos**                       | `templates/circos.html`           | §5g           | `engines/circos.md` |
| 7   | UpSet set-intersection plots (dot matrix + intersection bars, 4+ sets)                                                                                                                    | **UpSet**                        | `templates/upset.html`            | §5f           | `engines/upset.md` |
| 8   | Box plots, violin plots, histograms, **heatmaps** (better colorbar/labels), 3D surfaces, error bars, log axes, subplots, **Manhattan/Miami/QQ/locuszoom-regional/forest/funnel/lollipop** | **Plotly.js**                    | `templates/plotly.html`           | §3            | `engines/plotly.md` |
| 9   | Treemap, sankey, sunburst, dendrogram (topology-only `tree`), large series (>10k points), dataZoom scrubbing, mixed multi-chart dashboards                                                | **ECharts**                      | `templates/echarts.html`          | §4            | `engines/echarts.md` |
| 10  | Simple bar / line / pie / doughnut / radar / scatter / bubble (few series, shared category axis)                                                                                          | **Chart.js**                     | `templates/chartjs.html`          | §2            | `engines/chartjs.md` |
| 11  | Anything else                                                                                                                                                                             | **ECharts** (broadest catch-all) | `templates/echarts.html`          | §4            | `engines/echarts.md` |

**Read engines/<name>.md for the full spec contract before emitting.**

Ask-user stop point (SP1, Evidence + Recommend + Options): only when the request matches no row and the data shape is ambiguous (e.g. "visualize this dataset" with no stated goal). Otherwise auto-pick and state the choice.

Worked, render-verified specs live in `examples/` named `<engine>-<charttype>.html` (e.g. `plotly-heatmap.html`, `echarts-treemap.html`, `cytoscape-dependency-tree.html`); copy a spec shape from there when in doubt.

## 6. Self-check (run before every delivery)

```text
[ ] 1. Spec is STRICT JSON (quote every key) and parses: python3 -c "import json; json.load(open('/tmp/spec.json'))" — the slot fill must be pure JSON, not JS-literal notation (unquoted keys fail this check; strict JSON is valid JS everywhere, the reverse is not)
[ ] 2. Template CDN tag version matches the engine version in this SKILL.md (§ header pins)
[ ] 3. /*__SPEC__*/ slot replaced exactly once (grep -c "__SPEC__" file == 0 after fill)
[ ] 4. <script src> URLs reachable: curl -sI -o /dev/null -w "%{http_code}" <url> == 200 (skip when offline — note it in the delivery message; skip entirely for GenomeTracks, ClusterHeat, OncoPrint, SeqLogo, UpSet and Circos — no CDN)
[ ] 5. No NaN/undefined/None leaked into the spec (grep -c "NaN\|undefined" spec == 0)
[ ] 6. Title text present in the spec; file written to <workdir>/charts/<name>.html; absolute path reported
```

If the user has no network, say so and offer the same spec via lumen-generate_visual (static render) instead — do not silently produce a blank page.

## § Signature library

| #   | Symptom                                                 | Likely cause                                                                           | Fix                                                                        |
| --- | ------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| S1  | Blank canvas, no console error                          | ECharts sankey link references a `data.name` that doesn't exist (engines/echarts.md)                   | Diff link names against data names; string-equal check                     |
| S2  | Blank canvas, `ReferenceError` in console               | Spec slot filled but engine script tag edited/broken                                   | Restore the template's pinned `<script>` tag; never edit script tags       |
| S3  | Chart renders but labels missing/overlapping            | Cytoscape style: `"content"` selector typo or too many nodes                           | Check engines/cytoscape.md label rules; drop labels >100 nodes                               |
| S4  | Log-scale axis renders linear                           | Plotly `type: "log"` put on the trace instead of the axis                              | Move `type: "log"` into `layout.<x                                         |
| S5  | `Uncaught Error: Timeout` / CDN fails to load           | Offline or blocked CDN                                                                 | Check `curl` (§6.4); offer lumen fallback; never inline the lib "as a fix" |
| S6  | Pie chart shows axes                                    | `scales` block left in a pie/doughnut spec (engines/chartjs.md)                                        | Delete the scales block                                                    |
| S7  | Edges missing                                           | Duplicate edge `id`s in Cytoscape elements (engines/cytoscape.md)                                        | De-duplicate ids; regenerate with counter suffix                           |
| S8  | Page renders but chart is 0px tall                      | Template container edited, or spec emitted before `DOMContentLoaded`                   | Use template verbatim; the container and init order are pre-wired          |
| S9  | Cytoscape: a node or edge silently absent               | Duplicate `id` across the whole `elements` set (ids are global across nodes AND edges) | De-duplicate ids across all elements; regenerate with counter suffix       |
| S10 | Chart.js chart squashed / wrong height despite 60vh box | `maintainAspectRatio` left at default `true` (container height ignored)                | Set `options.maintainAspectRatio: false` (engines/chartjs.md)                              |

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
| Circos       | 1 (template-native) | none — vanilla-JS SVG in `templates/circos.html`                      | n/a        |

Bump procedure: verify the new version on the npm registry, update the table here, then `sed` the same version string into every template, run §6, then bump this skill's version and add a README changelog line. Never float (`@latest`/`@^`) — reproducibility beats freshness.

## 8. Relationship to other renderers

- **Mermaid / flow / sequence / ER diagrams** → out of scope; use `lumen-generate_visual` (mermaid routes) in the Pi harness.
- **ggplot2/matplotlib fundamentals** → the R/Python tooling (cairo_pdf, tidy evaluation, ggrepel) stays out of scope, but the design layer — publication theme baseline and faceting conventions — **is imported as references/conventions.md §10.10**; faceting is rendered via Plotly subplots (engines/plotly.md), which is why no sixth template exists for it.
- **Fgraph structured diagrams** (layered/sequence topologies) → `lumen-generate_visual type:"diagram"`.
- chartz adds ten engines (four CDN-pinned + six template-native SVG) — use it whenever the output must be a **portable data chart** the user opens in their own browser, with data the agent already holds.

## 9. Update check

```bash
python3 bin/skill-update-check.py
```

Verdicts: `UP-TO-DATE` / `LOCAL-AHEAD` (ok) · `BEHIND-BY-N` (re-sync from upstream repo) · `OFFLINE` / `NO-ORIGIN` (informational). Stdlib-only, `git fetch`-based, no GitHub API.

## 10. Design conventions (summary)

Palette by data type (Okabe-Ito categorical, Viridis/Magma sequential, symmetric diverging for signed values); state statistical test + adjustment whenever significance is rendered; state layout/method/hyperparameters + seed for networks and embeddings; match distribution encoding (box/raincloud/violin) to N per group; report I²/τ²/Q for meta-analysis forests. Full D1–D13 design self-check and all 15 subsections (§10.1–§10.15) live in `references/conventions.md` — read it before any chart where color, thresholds, statistics, or layout carry meaning.

- Colour palettes: qualitative (Okabe-Ito / Tol), sequential (Viridis), diverging (RdBu/vik), journal-style (NPG/NEJM/Lancet) — see references/palettes.md
