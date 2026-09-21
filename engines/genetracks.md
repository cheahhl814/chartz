Engine: GenomeTracks
Template: templates/genetracks.html
Routing row: 4
Loaded from SKILL.md §1 routing when this engine is selected.

# GenomeTracks — genome-browser track figures

**Scope:** stacked locus figures aligned to genome coordinates — BigWig-style coverage, BED/narrowPeak rectangles, UCSC-style gene models (intron line + exon blocks + strand arrows). Fills the one reference chart class the four CDN engines cannot express. **Zero dependencies**: the renderer is template-native vanilla-JS SVG (no CDN, works offline — the only engine where §6.4's reachability probe is skipped).

**Print export** (v0.8.0): the template ships **Download SVG** (true vector; mm-sized when the spec carries `export.width_mm` — journal submission format) and **Download PNG** (deterministic raster: `px = mm / 25.4 · dpi`, default 2× screen / 300 dpi). Optional spec field, all keys optional: `export: { width_mm: 89, dpi: 300, font_family: "Arial" }` — `font_family` overrides the system-ui stack for journals that mandate it. See SKILL.md §6b.

**Spec** (fills `/*__SPEC__*/` as `const SPEC = {...}`):

```js
{
  "title": "chr1:1,000,000-1,040,000 (hg38; ChIP-Rx, spike-in scaled)",
  "region": {"chrom": "chr1", "start": 1000000, "end": 1040000},
  "tracks": [
    {"type": "coverage", "label": "H3K27ac Control", "height": 90, "color": "#0072B2",
     "max": 50, "bins": [[1000000, 2.1], [1000100, 4.8], [1020000, 18.4]]},
    {"type": "peaks", "label": "Peaks", "height": 26, "color": "#888888",
     "items": [{"start": 1019000, "end": 1023000}]},
    {"type": "genes", "label": "Genes (UCSC)", "height": 70, "color": "#3C5488",
     "items": [{"name": "GENE1", "strand": "+",
                "exons": [[1004000, 1004600], [1008000, 1008900], [1015000, 1015700]]}]}
  ]
}
```

Track types: `coverage` (`bins`: sorted `[pos, value]` pairs; optional `max` — **REQUIRED and shared across comparable sample tracks**, see below), `peaks` (`items`: `{start, end, label?}`), `genes` (`items`: `{name, strand, exons: [[s,e]...]}`). Tracks render **top-to-bottom in spec order** (pyGenomeTracks convention — genes conventionally last).

**Conventions (references/conventions.md §10.9 applies; genome-tracks practice)**

- **Comparable sample tracks must share `max`** — per-track auto-scaling conflates rendering scale with signal magnitude. Set the same `max` on every track a reader will compare.
- **Normalization is an upstream data decision — state it in the title** (build, normalization, spike-in). The classic silent error: ChIP-Rx spike-in is *undone* by deepTools `--normalizeUsing CPM/RPGC` combined with `--scaleFactor` — spike-in requires `--normalizeUsing None` + explicit `--scaleFactor` (Orlando 2014). chartz receives numbers and cannot detect this; the agent must.
- **Gene style**: UCSC-merged for dense human/mouse loci (merge transcripts before emitting); one row per gene here — emit canonical isoform only.
- Region width: keep locus ≤ ~500 kb for legibility; >10k coverage bins → downsample before emitting.

**Scope boundary:** Hi-C matrices and sashimi plots are **out of scope** for this renderer — use pyGenomeTracks/Gviz/IGV for those and for rendering from BigWig/BAM files directly. Whole-genome/multi-chromosome adjacency views (Hi-C-style chromosome contacts, SV/translocation links, BedPE arcs at genome scale) route to **Circos** instead (engines/circos.md, §5g) — GenomeTracks is single-locus only. chartz consumes coordinate data the agent already holds as arrays.
