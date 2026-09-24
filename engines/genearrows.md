Engine: GeneArrows
Template: templates/genearrows.html
Routing row: 15
Loaded from SKILL.md §1 routing when this engine is selected.

# GeneArrows — gene-arrow maps and synteny ribbons

**Scope:** the gggenes / gggenomes / DNAFeaturesViewer / pyGenomeViz figure. It draws one horizontal row per contig or region, genes as blocky pentagon arrows pointing in the strand direction, fill colour by functional `group`, and optional translucent synteny ribbons between matching intervals on different rows. Typical uses are prophage, BGC and operon comparisons and plasmid backbones. **Zero dependencies**: template-native vanilla-JS SVG (no CDN, works offline, so §6.4's reachability probe is skipped). The input is a gene-feature table the agent has already parsed from GFF3/GenBank. chartz does not parse annotation files.

**Print export** (v0.8.0): the template ships **Download SVG** (true vector, mm-sized when the spec carries `export.width_mm`) and **Download PNG** (deterministic raster: `px = mm / 25.4 · dpi`, default 2× screen / 300 dpi). Optional spec field, all keys optional: `export: { width_mm: 183, dpi: 300, font_family: "Arial" }`. See SKILL.md §6b.

**Spec** (fills `/*__SPEC__*/` as `const SPEC = {...}`):

```js
{
  "title": "Prophage region comparison (coordinates re-based to region start)",
  "contigs": [                                   // spec order = top-to-bottom row order
    {"name": "contig_1", "length": 40000, "genes": [
      {"name": "capsid", "start": 1000, "end": 2500, "strand": "+", "group": "structural"},
      {"name": "terminase", "start": 3000, "end": 4200, "strand": "-", "group": "structural"},
      {"name": "orfX", "start": 3500, "end": 3900, "strand": "+", "lane": 1}   // optional explicit lane
    ]},
    {"name": "contig_2", "length": 38000, "genes": [
      {"name": "capsid", "start": 500, "end": 1900, "strand": "+", "group": "structural"}
    ]}
  ],
  "links": [                                     // optional explicit synteny ribbons
    {"from_contig": "contig_1", "from": [1000, 2500], "to_contig": "contig_2", "to": [500, 1900],
     "id": "capsid", "group": "structural"}      // id / group optional (colour source)
  ],
  "link_by": "group",                            // optional: auto-derive links when "links" is absent/empty
  "arrow_palette": "okabeito",                   // "okabeito" (default) or {"structural": "#E69F00", ...}
  "show_axis": true,                             // default true
  "unit": "kb",                                  // "kb" (default) | "Mb" | null (raw bp)
  "export": {"width_mm": 183, "dpi": 300, "font_family": "Arial"}
}
```

- **Scale**: every row shares one bp→px scale, and the longest contig fills the plot width. A 20 kb region next to a 40 kb one is half as wide, so arrow lengths stay comparable across rows.
- **Axis rule**: if every `contig.length` is equal, one shared axis is drawn at the top (pyGenomeViz style). If any length differs, each row gets its own mini-axis underneath, spanning that contig's length. Ticks use a 1/2/5×10ⁿ step, about 6 across the longest contig. `unit` sets the tick scaling and the axis suffix.
- **Colour**: groups are assigned Okabe-Ito colours in order of first appearance, scanning rows top to bottom. Genes with no `group` are neutral grey `#BBBBBB`. An object `arrow_palette` pins a colour to a named group. A legend row is drawn at the bottom whenever groups exist.
- **Arrows**: each gene is a pentagon. The arrowhead length is `min(0.45·width, 0.75·arrow height)`, so tiny ORFs become chevrons without turning into thin triangles. `strand: "-"` points left. Anything other than `"-"` is drawn as `+`.
- **Labels**: the gene name is printed in italics above the arrow **only when the arrow is ≥ 14 px wide**. Narrower genes are left unlabeled, and their name, coordinates and group are still available as an SVG `<title>` hover tooltip. Adjacent labels can still collide when two genes just over 14 px sit side by side. In that case, shorten the names (`hyp` rather than `hypothetical_protein`).
- **Links**: a non-empty `links` array always wins. Otherwise, `link_by: "group"` pairs same-group genes on **adjacent** rows, matching the k-th with the k-th in start order. Each ribbon is a cubic-Bézier band running from below the upper row (under its mini-axis) to above the lower row's arrows. It is filled at 30% opacity and drawn **before** the rows, so the arrows paint over it. The ribbon colour comes from `link.group`. Failing that, it comes from the `from_contig` gene whose name equals `link.id`, or else the first `from_contig` gene overlapping `from`. Otherwise it is grey. A link that names an unknown contig is skipped with a `console.error`.

**Conventions (gene-map practice)**

- **Overlapping genes stack into lanes. They are not drawn on top of each other.** Genes on a row are assigned lanes greedily in start order. A gene that overlaps one already placed drops to the next lane, which is 33 px lower with a faint guide line, and the row grows taller. A gene's explicit `"lane": n` overrides the greedy choice. Use it to keep a nested ORF (for example an internal frameshift product) in a predictable lane across rows. Frequent lane bumps usually mean overlapping CDS calls from two annotators were merged, so deduplicate before emitting.
- **Re-base coordinates to the region, and say so in the title.** The x-axis starts at 0 on every row. A prophage at 1,203,400–1,241,000 on a 4 Mb chromosome must be emitted as `start - 1203400`, with `length` set to the region span. If you emit raw chromosome coordinates, 38 kb of genes are squeezed into 1% of the width. For a reverse-complemented region (to put homologous genes in the same orientation), flip the coordinates (`length - end`, `length - start`) and the strands **before** emitting, and state the flip in the title.
- **`link_by: "group"` is coarse.** It links every same-group pair on adjacent rows in order, so rows whose `structural` groups hold 6 and 4 genes produce 4 ribbons, and any of them can be wrong. For a figure that makes a claim about homology, emit explicit `links` from BLASTp/MMseqs2/pyGenomeViz hits. Treat `link_by` as a quick-look mode. Links between non-adjacent rows are drawn, but they cross the rows in between, so reorder `contigs` to make the linked rows neighbours.
- **Groups are categorical and ≤ 8 are distinguishable.** The Okabe-Ito cycle wraps after 8 groups. Collapse minor categories into `other`, or leave them ungrouped (grey), rather than emitting 15 COG letters.

**Scope boundary:** there is no GFF/GenBank parsing, no BLAST, and no exon/intron structure. For eukaryotic gene models aligned to a locus alongside coverage, use **GenomeTracks** (engines/genetracks.md). Whole-genome circular or chromosome-scale synteny routes to **Circos** (engines/circos.md). Protein-domain lollipops use the Plotly lollipop recipe. Keep it to ≤ ~10 rows and ≤ ~60 genes per row. Beyond that, labels vanish under the 14 px rule, and pyGenomeViz or clinker suit the job better.
