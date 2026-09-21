Engine: ECharts
Template: templates/echarts.html
Routing row: 10
Loaded from SKILL.md §1 routing when this engine is selected.

# ECharts — rich / dashboards / catch-all

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

- **Chart body overlaps the title** (S11): `sankey`, `tree`, `sunburst`, and `treemap` **ignore `grid`** — they position via their own `top`/`left`/`right`/`bottom`, and `sankey` defaults to `top: 0`. With an in-canvas `title`, set `series.top` (e.g. `"12%"`) so the body clears the title; `grid.top` does nothing for these types. Worked: `examples/echarts.html`, `examples/echarts-alluvial.html`.
- Sankey: every `link.source/target` must exist in `data` by exact `name` (string-equal, case-sensitive) — the #1 silent-blank-canvas cause.
- Sankey cycles: ECharts renders nothing on a cyclic graph; verify DAG-ness before emitting.
- Ribbon color: default link color is gray — set `lineStyle: {"color": "source", "opacity": 0.35}` to color ribbons by origin node (the alluvial convention; references/conventions.md §10.8). `"target"` colors by destination.
- Flow conservation: keep in-flow = out-flow at internal nodes — imbalanced flows render as stretched ribbons that read as data errors (references/conventions.md §10.8). Multi-column alluvial-style sankey: one node per (timepoint, category), names prefixed with the timepoint; worked demo `examples/echarts-alluvial.html`.
- `dataZoom` on >1000 points: add `dataZoom: [{type: "inside"}, {type: "slider"}]` plus `sampling: "lttb"` on line series.
- Mixed grid: second `series` needs `xAxisIndex`/`yAxisIndex` matching the second entry of `xaxis`/`yaxis` arrays (`grid: [{}, {}]`).
- Dark mode: pass `backgroundColor: "transparent"` — the template ships a light page; don't emit white-on-white.
- Dendrogram (`type: "tree"`, `edgeShape: "polyline"`, `orient: "TB"`): ECharts renders **topology only — branch depth is uniform, NOT distance-proportional to merge height**. State this in the delivery sentence. Compute the clustering outside and emit the tree as nested `children`. Worked demo: `examples/echarts-dendrogram.html`.
