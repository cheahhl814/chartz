Engine: Circos
Template: templates/circos.html
Routing row: 7
Loaded from SKILL.md §1 routing when this engine is selected.

# Circos (engine 10, template-native SVG) — circular genome plots

**Scope:** whole-genome overview figures where circular adjacency itself carries meaning — 4+ chromosome ideogram views, structural-variant / translocation link diagrams, Hi-C-style chromosome-contact summaries. Complement to the linear GenomeTracks engine (engines/genetracks.md, §5b): use GenomeTracks for a single locus, Circos for whole-genome/multi-chromosome adjacency. **Zero dependencies**: the renderer is template-native vanilla-JS SVG (no CDN, works offline — the only engine where §6.4's reachability probe is skipped).

**Print export** (v0.8.0): the template ships **Download SVG** (true vector; mm-sized when the spec carries `export.width_mm` — journal submission format) and **Download PNG** (deterministic raster: `px = mm / 25.4 · dpi`, default 2× screen / 300 dpi). Optional spec field, all keys optional: `export: { width_mm: 89, dpi: 300, font_family: "Arial" }` — `font_family` overrides the system-ui stack for journals that mandate it. See SKILL.md §6b.

**Spec** (fills `/*__SPEC__*/` as `const SPEC = {...}`):

```js
{
  "title": "8-genome demo (GRCh38; log2 CN ratio, RPKM-normalized)",
  "chromosomes": [{"name": "chr1", "size": 248956422}, {"name": "chr2", "size": 242193529}],
  "tracks": [
    {"type": "histogram", "label": "Gene density", "radius": [0.70, 0.86], "color": "#0072B2",
     "max": 40, "items": [["chr1", 1000000, 12], ["chr1", 5000000, 28]]},
    {"type": "heatmap", "label": "CNV log2 ratio", "radius": [0.50, 0.66], "color": "#D55E00",
     "max": 2, "items": [["chr2", 3000000, 0.8]]}
  ],
  "links": [
    {"from": ["chr1", 12000000, 12005000], "to": ["chr5", 40000000, 40005000], "color": "#888888", "width": 0.8}
  ],
  "start_degree": 90,
  "gap_degree": 3
}
```

Track types: `histogram` (radial bars from the track's inner radius), `heatmap` (annular sector fills, opacity scaled by value/`max`), `scatter` (dots at polar position, radial offset scaled by value/`max`). `radius` is a `[r0, r1]` fraction of the ideogram's inner radius (0–1), outermost track first. `links` draw low-opacity cubic-bezier arcs between sector positions — use for SVs, translocations, or Hi-C contacts; set `color` per SV class when classes are being distinguished. `start_degree` (default 90 = 12 o'clock) and `gap_degree` (default 3°, plus an automatic larger gap before the first chromosome per circlize convention) control the ideogram layout.

**Key rules**

- **Use circular ONLY when adjacency/interaction conveys meaning Cartesian cannot** — whole-genome SV/translocation views, Hi-C-style chromosome contacts, chromosome-level overview infographics. Cleveland-McGill 1984 (*J Am Stat Assoc* 79:531) and Heer-Bostock 2010 (*CHI*) establish that Cartesian position is the most accurate visual channel; circular position requires mental "unwrapping" and degrades precise value comparison.
- **Plain value comparison across categories belongs in Cartesian** — bar/dot chart (engines/chartjs.md or engines/plotly.md) or a clustered heatmap (engines/clusterheat.md), not Circos. If the request is "compare expression across N conditions," route there instead.
- **Links = structural variants / translocations / contacts, color by class** — when multiple SV or interaction classes are present, assign each its own `color` so the reader can distinguish them at a glance.
- **State genome build + normalization in the title** — e.g. "GRCh38; log2 CN ratio, RPKM-normalized." Same silent-error risk as GenomeTracks (engines/genetracks.md): normalization is an upstream data decision chartz cannot detect from numbers alone.
- **Legibility ceiling: ≤12 chromosomes and ≤50k points per track.** Beyond that, aggregate upstream (bin/downsample) before emitting — a circos plot with too many links or points collapses into a solid blob at the center.
- **`circos.clear()` is a circlize (R) state-management trap and does not apply here** — that trap exists because circlize's `circos.par()` settings are global R session state that leaks into the next plot if not cleared. This renderer is stateless: each spec produces one independent SVG with no persisted state between deliveries, so there is nothing to clear.
- **Sector/link/heatmap colours: use references/palettes.md** (Brewer-based chromosome assignment; white→#D55E00 intensity heatmaps; low-alpha greys for low-confidence links).
