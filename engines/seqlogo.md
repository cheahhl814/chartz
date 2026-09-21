Engine: SeqLogo
Template: templates/seqlogo.html
Routing row: 7
Loaded from SKILL.md §1 routing when this engine is selected.

# SeqLogo — sequence logos

**Scope:** sequence logos — per-position letter stacks whose total height encodes **information content** (Schneider-Stephens 1990) and individual letter heights reflect frequencies. DNA/RNA/protein motifs: TF binding sites, splice sites, kinase substrates, CRISPR composition. Letters are SVG text glyphs (Logomaker's approach) — no CDN dependency, works offline, §6.4 skipped.

**Print export** (v0.8.0): the template ships **Download SVG** (true vector; mm-sized when the spec carries `export.width_mm` — journal submission format) and **Download PNG** (deterministic raster: `px = mm / 25.4 · dpi`, default 2× screen / 300 dpi). Optional spec field, all keys optional: `export: { width_mm: 89, dpi: 300, font_family: "Arial" }` — `font_family` overrides the system-ui stack for journals that mandate it. See SKILL.md §6b.

**Spec** (fills `/*__SPEC__*/`):

```js
{
  "title": "TF binding motif (42 sites; bits, uniform background)",
  "positions": [
    [{"letter": "A", "height": 1.36}, {"letter": "G", "height": 0.31}, {"letter": "C", "height": 0.18}],
    ["...": "..."]
  ],
  "ymax": 2,
  "ylabel": "Bits",
  "colors": {"A": "#009E73", "C": "#0072B2", "G": "#E69F00", "T": "#D55E00"},
  "xlabels": ["-3", "-2", "-1", "+1", "+2", "..."]
}
```

**Key rules**

- **The agent computes information content upstream** and emits per-letter heights. Bits encoding: position IC `R = log2(K) − H(p)` (K=4 DNA, 20 protein; max 2 bits DNA / 4.32 protein); letter height = `p(letter) × R`. **Default to bits** — probability encoding (every position height 1.0) cannot show a conservation gradient and reviewers expect bits.
- **Background correction**: bits assume uniform background; for genome-derived motifs pass genome composition upstream (human ≈ A/T 0.29, C/G 0.21) — otherwise GC-preferring motifs overestimate conservation.
- **Small-sample bias**: IC from N < 20 instances looks spuriously "conserved" — apply the Schneider 1986 correction upstream and **annotate N in the title**; require N ≥ 20 for a credible motif.
- **Alphabets**: DNA (A/C/G/T), RNA (A/C/G/U), protein (20 aa; kinase-substrate color scheme: phospho-acceptors S/T/Y vermillion, basic K/R/H blue, acidic D/E pink, hydrophobic green). **Never compare logos with different alphabets on one bits axis** (2 vs 4.32 max) — normalize to fractional information or present separately.
- **Aligned input only**: sequences must be same length; emit stacks bottom-up in the order to display.
