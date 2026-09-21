Engine: HeatTree
Template: templates/heattree.html
Routing row: 1
Loaded from SKILL.md §1 routing when this engine is selected.

# HeatTree — metacoder-style taxonomy heat trees

**Scope:** radial taxonomy trees (kingdom → phylum → … → genus) with **quantitative node/edge encoding** — the `metacoder::heat_tree()` reference class: node radius and node/edge color + edge width map a value (mean abundance, log2FC, prevalence), sequential palette with grey for NA/zero, gradient legend. This is the chart class that motivated the engine: no CDN engine can map **edge width and edge color per edge** on a tree (ECharts tree shares one `lineStyle`; Cytoscape can map edges but drops labels past ~100 nodes and has no value legend). **Zero dependencies** like GenomeTracks/ClusterHeat/OncoPrint/SeqLogo/UpSet/Circos — no CDN, works offline, §6.4 skipped.

**Spec** (fills `/*__SPEC__*/` as `const SPEC = {...}`):

```js
{
  title: "Overall community composition",
  nodes: [                                   // one entry per taxon; id must be globally unique
    { id: "Bacteria", value: 131000 },       // value: number | null (null = NA)
    { id: "Proteobacteria", value: 58200 }
    // ...
  ],
  edges: [                                   // parent -> child; value defaults to child node value
    { from: "Bacteria", to: "Proteobacteria" }
    // ...
  ],
  scale: "sqrt",                             // linear | sqrt | log10 — maps value -> size/color fraction
  palette: {
    stops: [[0, "#E8F6E3"], [0.35, "#A8DDB5"], [0.6, "#41B6C4"], [0.85, "#1D6996"], [1, "#124B63"]],
    na_color: "#c9c9c9",
    treat_zero_as_na: true,                  // zero abundance -> grey (metacoder convention)
    min: null, max: null                     // pin the value range for comparable multi-figure panels
  },
  size: { node_min: 2.5, node_max: 18, edge_min: 0.6, edge_max: 8 },
  labels: { show: true, max_nodes: 150, font_size: 8.5 },   // labels auto-hide past max_nodes
  legend: { title: "Mean abundance" },       // false to omit; gradient + NA swatch drawn automatically
  export: { width_mm: 183, dpi: 300 }        // optional, see SKILL.md §6b
}
```

**Layout** (computed in the template, no precomputation needed): leaves sweep the full circle in DFS order (angular span proportional to leaf count); internal nodes sit at the midpoint of their subtree's arc; ring radius = depth × equal spacing. Root renders at center with a bold label (auto white/black by fill luminance). The viewBox **auto-fits** the rendered content, so long labels never clip.

**Pitfalls**

- **Globally unique node ids are mandatory** — the same taxon id under two parents silently merges them into a DAG and tangles the layout. If your taxonomy has repeated names across branches (common with `*_unclassified`), disambiguate (`Firmicutes_unclassified`, `Proteobacteria_unclassified`).
- **One root only** — a spec with multiple parentless nodes throws (fail-loud, never a blank page). Forests (multiple trees): render one figure per root, or attach all components under a synthetic root.
- **Edge values default to the child node value** — you rarely set `edges[].value` explicitly. To color edges by a *different* trait than nodes, set `edges[].value` per edge.
- **Don't compare trees with different value ranges** without pinning `palette.min`/`max` — the color/size normalization is per-figure otherwise.
- **Label cap**: past `labels.max_nodes` (default 150) labels are dropped entirely rather than overlapped (S3 convention) — state this in the delivery sentence, or raise the cap only if the tree is sparse.
- **Value 0 vs NA**: with the default `treat_zero_as_na: true`, zero-abundance taxa are grey *and* minimum-size (metacoder behaviour). Set `treat_zero_as_na: false` to keep true zeros on the color ramp.
- **Scale choice**: abundance data spanning >2 orders of magnitude reads better with `sqrt` (default) or `log10`; `linear` flattens rare taxa to invisible.
- **Differential heat trees** (two-panel log2FC per condition): emit two figures with the same `palette.min/max` (symmetric around 0, diverging stops) — do NOT normalize each panel independently.

**Print export**: Download SVG (true vector, mm-sized via `export.width_mm` — journal submission format) and Download PNG (deterministic: `px = mm / 25.4 · dpi`). Same module as all template-native engines; see SKILL.md §6b.