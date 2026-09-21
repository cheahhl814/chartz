Engine: PhyloTree
Template: templates/phylotree.html
Routing row: 2
Loaded from SKILL.md §1 routing when this engine is selected.

# PhyloTree — publication-ready phylogenetic trees (iTOL-class)

**Scope:** phylogenies from a **Newick string** — rectangular and circular **phylograms** (branch length ∝ substitutions, with scale bar) and cladograms (equidistant), bootstrap-support circles at internal nodes, clade color ranges, tip-aligned italic labels. This is the iTOL-class figure class: the template embeds its own Newick parser, so the spec carries the tree as a plain string. **Zero dependencies** — no CDN, works offline, §6.4 skipped.

**Division of labor:** for tree *inference*, alignment, pruning, or iTOL *batch annotation datasets* (colorstrips/heatmaps keyed to uploaded trees), use the `phylogenetics-agent` skill (`visualize/phylo-itol`, `visualize/phylo-render`). PhyloTree renders **standalone publication figures from a Newick string the agent already holds** — no upload, no R, fully offline.

**Spec** (fills `/*__SPEC__*/` as `const SPEC = {...}`):

```js
{
  title: "16S rRNA phylogeny",
  newick: "((A:0.062,B:0.058)100:0.041,(C:0.131,D:0.142)94:0.083);",  // required; internal labels = bootstrap or clade names
  layout: {
    mode: "rect",                 // rect | circular
    style: "phylogram",           // phylogram (length-proportional) | cladogram (equidistant)
    width: 1100, height: 640      // nominal canvas; viewBox auto-fits content
  },
  bootstrap: {
    display: true,                // show support values at internal nodes
    mode: "balloon",              // "balloon" (blue circles, radius by support) | "text" (printed value at the node)
    min_size: 2, max_size: 7,     // balloon radius range (balloon mode)
    font_size: 10,                // text size (text mode)
    threshold: 50                 // hide supports below this (0 = show all)
  },
  scale_bar: { label: "substitutions/site" },   // false to omit; auto nice length ≈ 1/5 of tree depth;
                                                // horizontal, bottom-left in BOTH layouts
  ranges: [                       // iTOL-style clade colour strips, layered
    { tips: ["Escherichia_coli", "Salmonella_enterica"], color: "#aec7e8", label: "Enterobacteriaceae", layer: 0 },
    { tips: ["Escherichia_coli", "Bacillus_subtilis"], color: "#dddddd", label: "Bacteria", layer: 1 }
  ],                              // layer: strip column index (rect) / concentric ring index (circular);
                                  // default 0. Use successive layers for higher taxonomic levels.
  tip_labels: { show: true, font_size: 14, italic: true, align: false },
                                // circular: labels are ROTATED to the tip direction (readable on both halves)
  legend: true,                   // legend for ranges (default on when ranges exist)
  export: { width_mm: 183, dpi: 300 }   // see SKILL.md §6b
}
```

**Newick dialect handled:** nested parens, tip labels, branch lengths (`:x`), internal numeric labels (parsed as **bootstrap support**), internal text labels (parsed as **clade names**, drawn only via `ranges`). Quoted labels are NOT supported — replace spaces with underscores (`Escherichia_coli`); labels are displayed verbatim. Unrooted trees: write your favourite split as the root's children. Rooted-vs-unrooted drawing conventions (scale bar "treat as unrooted" notches) are out of scope for v1.

**Pitfalls**

- **Newick must be balanced and semicolon-terminated** — the parser throws with the position on any structural error (fail-loud, never a blank page). Generate the string programmatically from your source data rather than hand-typing; hand-typed trees with one extra `)` are the #1 build failure.
- **Bootstrap circles appear only for internal nodes with a numeric label** — if your Newick carries support as e.g. `)100:0.041` it works; if support lives in a separate table, re-emit the Newick with labels inlined. Strings like `"high"` become clade names, not supports.
- **`ranges[].tips` are tip-name exact matches** (underscores included). A range with an unknown tip throws. Ranges render as a vertical band lane (rect) or an outer arc (circular) spanning the member leaves' extent — the members must form a monophyletic clade or the band will visually mislead; check monophyly upstream and say so in the delivery message if uncertain.
- **Cladogram vs phylogram**: with `style: "cladogram"` branch lengths are stripped before parsing (equidistant depths) — never present a cladogram where the substitution distances are the message.
- **Range strips**: rect draws one UNLABELED strip column per `layer` on the RIGHT of the tip labels (the figure legend identifies colours); circular draws concentric arcs beyond the outermost tip label (never over the tree). Ranges spanning > 180° (e.g. a root-level layer) get the SVG large-arc flag automatically.
- **Bootstrap text vs balloon**: `mode: "text"` prints the support value beside the internal node; `mode: "balloon"` draws a support-scaled circle. Both honour `threshold`. TBE trees on a 0-1 scale are rescaled ×100 automatically.
- **Circular legend/scale-bar placement**: both are drawn into the content-bbox corners (top-left legend, bottom-left scale bar) AFTER the strips, so they always sit outside the ring — never overlapping the colour strips or the tree.
- **Circular tip-label rotation**: labels rotate with the tip direction; left-half labels flip 180° to stay readable. Horizontal circular labels are not available in this version.
- **No midpoint/outgroup rerooting in v1** — root the tree upstream (gotree/IQ-TREE/nj) and emit the rooted Newick; the template draws the root where the Newick roots it.
- **Label cap**: none by default (tip labels auto-fit via the viewBox), but >200 tips make labels unreadable at journal widths — collapse clades upstream (gotree collapse) and represent them with a range.
- **Dataset annotation strips** (iTOL heatmaps/bars aligned to tips) are NOT in v1 — for those, use `phylogenetics-agent → visualize/phylo-itol`, or compose the value table as a separate ClusterHeat figure with matching tip order. Clade colour ranges (solid strips/arcs) ARE supported, multi-layer.

**Print export**: Download SVG (true vector, mm-sized via `export.width_mm` — journal submission format) and Download PNG (deterministic: `px = mm / 25.4 · dpi`). Same module as all template-native engines; see SKILL.md §6b.

**Worked examples**: `examples/phylotree-rect.html` (rectangular phylogram, 14 taxa, bootstrap circles, 3 clade ranges, italic labels, scale bar) and `examples/phylotree-circular.html` (same tree, circular phylogram with outer range arcs).