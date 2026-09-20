Engine: UpSet
Template: templates/upset.html
Routing row: 6
Loaded from SKILL.md §1 routing when this engine is selected.

# UpSet — set-intersection plots

**Scope:** UpSet plots (Lex 2014) — set-intersection display for **4+ sets**, where Venn diagrams become illegible. Intersection bars above a dot matrix (sets participating in each intersection), per-set total-size bars on the left. For ≤3 sets a Venn/proportional layout is still fine; ≥4 → UpSet.

**Zero dependencies** like GenomeTracks/ClusterHeat/OncoPrint/SeqLogo — no CDN, works offline, §6.4 skipped.

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
