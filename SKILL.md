---
name: chartz
description: 'Render charts and graphs as self-contained HTML files from four pinned CDN engines, chosen by chart type. Use when the user asks for a chart, plot, dashboard, heatmap, network/graph diagram, or any data visualization as a file they can open in a browser — "make a bar chart", "plot this data", "heatmap of these values", "draw a network graph", "dashboard of these metrics". Engine router: Chart.js (simple statistical), Plotly.js (scientific/statistical), ECharts (rich/dashboards), Cytoscape.js (nodes + edges). Emits one single-file HTML per chart with pinned CDN versions; no build step, no server. Does NOT do text-to-flowchart/sequence diagrams (use Mermaid/lumen-generate_visual for that) and does NOT analyze data — it renders data you already have.'
version: 0.1.0
updated: "2026-09-19"
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

| # | If the request is… | Engine | Template | Spec contract |
|---|---|---|---|---|
| 1 | Nodes + edges (pathways, gene networks, dependency graphs, org charts as graphs) | **Cytoscape.js** | `templates/cytoscape.html` | §5 |
| 2 | Box plots, violin plots, histograms, **heatmaps** (better colorbar/labels), 3D surfaces, error bars, log axes, subplots | **Plotly.js** | `templates/plotly.html` | §3 |
| 3 | Treemap, sankey, sunburst, large series (>10k points), dataZoom scrubbing, mixed multi-chart dashboards | **ECharts** | `templates/echarts.html` | §4 |
| 4 | Simple bar / line / pie / doughnut / radar / scatter / bubble (few series, shared category axis) | **Chart.js** | `templates/chartjs.html` | §2 |
| 5 | Anything else | **ECharts** (broadest catch-all) | `templates/echarts.html` | §4 |

Ask-user stop point (SP1, Evidence + Recommend + Options): only when the request matches no row and the data shape is ambiguous (e.g. "visualize this dataset" with no stated goal). Otherwise auto-pick and state the choice.

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
- >10 datasets → this is the wrong engine; go ECharts.

## 3. Plotly.js (v4.1.1) — scientific / statistical

**Scope:** box, violin, histogram, 2D histogram, heatmap, contour, error bars, log axes, subplots, 3D surface/scatter. This is the bioinformatics-workspace default for distributional data (MA plots, volcano plots, differential abundance).

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

## 4. ECharts (v6.1.0) — rich / dashboards / catch-all

**Scope:** treemap, sankey, sunburst, funnel, gauge, candlestick, calendar, large series with `dataZoom`, mixed-type grids (bar + line dual axis), anything rows 1–5 don't route.

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
- `dataZoom` on >1000 points: add `dataZoom: [{type: "inside"}, {type: "slider"}]` plus `sampling: "lttb"` on line series.
- Mixed grid: second `series` needs `xAxisIndex`/`yAxisIndex` matching the second entry of `xaxis`/`yaxis` arrays (`grid: [{}, {}]`).
- Dark mode: pass `backgroundColor: "transparent"` — the template ships a light page; don't emit white-on-white.

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
- Layout names are exact: `cose` (built-in) vs `cose-bilkent` (needs an extra plugin the template does NOT load — never emit `cose-bilkent`, `fcose`, or `elk`).
- Element `id`s are **global across nodes and edges**; any collision (node id = edge id included) silently drops the colliding element (see S9).
- Label readability: set node `font-size` and `text-valign: "center"`; for >100 nodes drop labels entirely (`"content": ""`) and rely on tooltips (`bindTooltips` not loaded — keep labels off instead).
- Style values are strings quoted like `"width": 2` (number ok) but `"content": "TP53"` must be a string — mismatched types are the #2 silent-blank cause.

## 6. Self-check (run before every delivery)

```text
[ ] 1. Spec is STRICT JSON (quote every key) and parses: python3 -c "import json; json.load(open('/tmp/spec.json'))" — the slot fill must be pure JSON, not JS-literal notation (unquoted keys fail this check; strict JSON is valid JS everywhere, the reverse is not)
[ ] 2. Template CDN tag version matches the engine version in this SKILL.md (§ header pins)
[ ] 3. /*__SPEC__*/ slot replaced exactly once (grep -c "__SPEC__" file == 0 after fill)
[ ] 4. <script src> URLs reachable: curl -sI -o /dev/null -w "%{http_code}" <url> == 200 (skip when offline — note it in the delivery message)
[ ] 5. No NaN/undefined/None leaked into the spec (grep -c "NaN\|undefined" spec == 0)
[ ] 6. Title text present in the spec; file written to <workdir>/charts/<name>.html; absolute path reported
```

If the user has no network, say so and offer the same spec via lumen-generate_visual (static render) instead — do not silently produce a blank page.

## § Signature library

| # | Symptom | Likely cause | Fix |
|---|---|---|---|
| S1 | Blank canvas, no console error | ECharts sankey link references a `data.name` that doesn't exist (§4) | Diff link names against data names; string-equal check |
| S2 | Blank canvas, `ReferenceError` in console | Spec slot filled but engine script tag edited/broken | Restore the template's pinned `<script>` tag; never edit script tags |
| S3 | Chart renders but labels missing/overlapping | Cytoscape style: `"content"` selector typo or too many nodes | Check §5 label rules; drop labels >100 nodes |
| S4 | Log-scale axis renders linear | Plotly `type: "log"` put on the trace instead of the axis | Move `type: "log"` into `layout.<x|y>axis` |
| S5 | `Uncaught Error: Timeout` / CDN fails to load | Offline or blocked CDN | Check `curl` (§6.4); offer lumen fallback; never inline the lib "as a fix" |
| S6 | Pie chart shows axes | `scales` block left in a pie/doughnut spec (§2) | Delete the scales block |
| S7 | Edges missing | Duplicate edge `id`s in Cytoscape elements (§5) | De-duplicate ids; regenerate with counter suffix |
| S8 | Page renders but chart is 0px tall | Template container edited, or spec emitted before `DOMContentLoaded` | Use template verbatim; the container and init order are pre-wired |
| S9 | Cytoscape: a node or edge silently absent | Duplicate `id` across the whole `elements` set (ids are global across nodes AND edges) | De-duplicate ids across all elements; regenerate with counter suffix |
| S10 | Chart.js chart squashed / wrong height despite 60vh box | `maintainAspectRatio` left at default `true` (container height ignored) | Set `options.maintainAspectRatio: false` (§2) |

## 7. Engine version pins (single source of truth — update SKILL.md first, then templates)

| Engine | Pinned version | CDN URL (in template) | License |
|---|---|---|---|
| Chart.js | 4.5.1 | `https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js` | MIT |
| Plotly.js | 4.1.1 | `https://cdn.plot.ly/plotly-4.1.1.min.js` | MIT |
| ECharts | 6.1.0 | `https://cdn.jsdelivr.net/npm/echarts@6.1.0/dist/echarts.min.js` | Apache-2.0 |
| Cytoscape.js | 3.34.3 | `https://cdn.jsdelivr.net/npm/cytoscape@3.34.3/dist/cytoscape.min.js` | MIT |

Bump procedure: verify the new version on the npm registry, update the table here, then `sed` the same version string into every template, run §6, then bump this skill's version and add a README changelog line. Never float (`@latest`/`@^`) — reproducibility beats freshness.

## 8. Relationship to other renderers

- **Mermaid / flow / sequence / ER diagrams** → out of scope; use `lumen-generate_visual` (mermaid routes) in the Pi harness.
- **Fgraph structured diagrams** (layered/sequence topologies) → `lumen-generate_visual type:"diagram"`.
- chartz adds the four engines above — use it whenever the output must be a **portable data chart** the user opens in their own browser, with data the agent already holds.

## 9. Update check

```bash
python3 bin/skill-update-check.py
```

Verdicts: `UP-TO-DATE` / `LOCAL-AHEAD` (ok) · `BEHIND-BY-N` (re-sync from upstream repo) · `OFFLINE` / `NO-ORIGIN` (informational). Stdlib-only, `git fetch`-based, no GitHub API.