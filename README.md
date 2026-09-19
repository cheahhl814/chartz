# chartz

Chart & graph rendering skill for AI coding agents. One request → one self-contained HTML file, rendered by one of four CDN-pinned engines chosen by chart type.

## Engines

| Engine | Pinned | Use for |
|---|---|---|
| [Chart.js](https://www.chartjs.org/) | 4.5.1 | Simple bar/line/pie/doughnut/radar/scatter/bubble |
| [Plotly.js](https://plotly.com/javascript/) | 4.1.1 | Box, violin, histogram, heatmap, 3D, log axes — scientific/statistical |
| [ECharts](https://echarts.apache.org/) | 6.1.0 | Treemap, sankey, sunburst, large series, mixed dashboards, catch-all |
| [Cytoscape.js](https://js.cytoscape.org/) | 3.34.3 | Nodes + edges: pathways, networks, dependency graphs |

Text-to-diagram (flowcharts, sequence diagrams) is out of scope — use Mermaid.

## Usage (agent)

Read `SKILL.md` §1 routing table → emit the engine's JSON spec → fill the `/*__SPEC__*/` slot in the matching `templates/<engine>.html` → run the §6 self-check → deliver the file path.

## Repo layout

```
chartz/
├── SKILL.md            # router: workflow, routing table, engine spec contracts, signature library
├── README.md
├── templates/
│   ├── chartjs.html    # Chart.js 4.5.1
│   ├── plotly.html     # Plotly.js 4.1.1
│   ├── echarts.html    # ECharts 6.1.0
│   └── cytoscape.html  # Cytoscape.js 3.34.3
├── bin/
│   └── skill-update-check.py   # git-SHA drift check (no GitHub API)
└── examples/           # one worked demo per engine (+ screenshots/)
```

## Battle test

All four engines verified rendering in headless Chrome (2026-09-19): CDN load ✓, canvas non-blank ✓, see `examples/screenshots/`.

## Changelog

- **v0.1.0** (2026-09-19) — initial release: engine router, 4 CDN-pinned templates (Chart.js 4.5.1, Plotly.js 4.1.1, ECharts 6.1.0, Cytoscape.js 3.34.3), per-engine spec contracts with pitfalls, signature library (S1–S8), pre-delivery self-check, `bin/skill-update-check.py`.

## License

MIT (this skill's own content). The four chart libraries are MIT / Apache-2.0 — see SKILL.md §7.