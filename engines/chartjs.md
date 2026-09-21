Engine: Chart.js
Template: templates/chartjs.html
Routing row: 12
Loaded from SKILL.md §1 routing when this engine is selected.

# Chart.js — simple statistical charts

**Scope:** bar, line, pie, doughnut, radar, scatter, bubble with few series and a shared category axis. **Not** for log axes (bug-prone config), histograms, box/violin, heatmaps — route those to Plotly.

**Spec** (fills `/*__SPEC__*/` as `const SPEC = {...}`):

```js
{
  type: "bar",                      // bar | line | pie | doughnut | radar | scatter | bubble
                                    // stacked bars: set scales.x.stacked AND scales.y.stacked = true (both!);
                                    // relative abundance / composition figures → prefer Plotly (barmode "stack")
                                    // for percent normalization + large taxa counts
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
