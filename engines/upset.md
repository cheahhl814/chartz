Engine: UpSet
Template: templates/upset.html
Routing row: 9
Loaded from SKILL.md §1 routing when this engine is selected.

# UpSet — set-intersection plots

**Scope:** UpSet plots (Lex 2014) — set-intersection display for **4+ sets**, where Venn diagrams become illegible. Intersection bars above a dot matrix (sets participating in each intersection), per-set total-size bars on the left. For ≤3 sets a Venn/proportional layout is still fine; ≥4 → UpSet.

**Zero dependencies** like GenomeTracks/ClusterHeat/OncoPrint/SeqLogo — no CDN, works offline, §6.4 skipped.

**Print export** (v0.8.0): the template ships **Download SVG** (true vector; mm-sized when the spec carries `export.width_mm` — journal submission format) and **Download PNG** (deterministic raster: `px = mm / 25.4 · dpi`, default 2× screen / 300 dpi). Optional spec field, all keys optional: `export: { width_mm: 89, dpi: 300, font_family: "Arial" }` — `font_family` overrides the system-ui stack for journals that mandate it. See SKILL.md §6b.

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
