Engine: Msaview
Template: templates/msaview.html
Routing row: 14
Loaded from SKILL.md §1 routing when this engine is selected.

# Msaview — multiple sequence alignment figures

**Scope:** the ggmsa / pymsaviz figure — pre-aligned sequences on a per-residue cell grid with chemistry colouring, a conservation bar on top, a majority consensus row underneath, and a sparse coordinate ruler. **Zero dependencies**: template-native vanilla-JS SVG (no CDN, works offline — §6.4's reachability probe is skipped). The engine **does not align**: the agent runs MAFFT/MUSCLE (or already holds an aligned FASTA), parses it into rows, and emits them.

**Print export** (v0.8.0): the template ships **Download SVG** (true vector; mm-sized when the spec carries `export.width_mm`) and **Download PNG** (deterministic raster: `px = mm / 25.4 · dpi`, default 2× screen / 300 dpi). Optional spec field, all keys optional: `export: { width_mm: 183, dpi: 300, font_family: "Arial" }` — MSAs are wide, so full-page width (183 mm) is the usual choice. See SKILL.md §6b.

**Spec** (fills `/*__SPEC__*/` as `const SPEC = {...}`):

```js
{
  "title": "RecA protein MSA (12 taxa; alignment cols 1–120)",
  "sequences": [                          // spec order = row order; all seq strings SAME length
    {"name": "E_coli", "seq": "MAIDENKQKALAAALGQ-IEKQ..."},
    {"name": "B_subtilis", "seq": "MSDRQAALDMALKQ--IEKQ..."}
  ],
  "start": 1,                             // ruler label of the FIRST emitted column (default 1)
  "colorscheme": "auto",                  // "auto" | "nucleotide" | "clustal" | "none"
  "show_conservation": true,              // default true
  "show_consensus": true,                 // default true
  "cell": 11,                             // optional: cell width in px (default 11; row height = 1.3×)
  "export": {"width_mm": 183, "dpi": 300, "font_family": "Arial"}
}
```

- **`colorscheme`**: `nucleotide` = A `#009E73` / C `#0072B2` / G `#E69F00` / T,U `#D55E00` (Okabe-Ito, white glyphs); `clustal` = Clustal-X chemistry groups as cell backgrounds (hydrophobic AILMFWVC blue, KR red, DE magenta, NQST green, G orange, P yellow, HY cyan; others light grey); `none` = uniform grey cells; `auto` = `nucleotide` when >90% of all characters are in `ACGTU-.`, else `clustal`. Gaps (`-` or `.`) never get a background.
- **Conservation bar**: per column, fraction of rows carrying the most common non-gap residue (gaps count against). 100%-identical columns are dark grey, the rest mid grey.
- **Consensus row**: most common character per column; a gap wins only when it strictly outnumbers every residue (ties go to the residue), and prints as `-`.
- **Ruler**: labels the first column (`start`) and every column whose coordinate is a multiple of 10 — never every column. A multiple of 10 within 4 columns of the first label is skipped so the two don't collide.
- **Name gutter**: fixed 130 px, right-aligned against column 1. Names longer than ~18 characters are cut with `…`, and the full name is kept as an SVG `<title>` (hover tooltip).

**Conventions (MSA figure practice)**

- **Rows must be equal length — pre-trim/pad before emitting.** Ragged input is refused: the renderer calls `console.error` with each offending row's length and draws the error text in the figure. You get a visible message, never a blank or silently misaligned page. This usually happens when the agent strips gaps from one row while "cleaning" names or whitespace. Keep every `-`.
- **Cap at ~200 columns visible.** At 200 columns the SVG is ~2,350 px wide and scales down to the card, which puts the glyphs at the edge of legibility, and at 183 mm print it is ~1 mm per residue. For longer alignments, **slice to the region of interest** (domain, motif ± flank) or drop gap-majority columns before emitting, then set `start` to the first kept column's coordinate and **state the slice in the title** (`"cols 241–400"`). If columns were dropped, the ruler is no longer contiguous, so say so in the title as well.
- **`start` is an alignment coordinate, not a residue number.** With gaps in the reference, alignment column ≠ residue position. If the reader needs residue numbering, slice the alignment at a gap-free reference row, or say which frame the ruler uses in the title (for example `"E. coli RecA numbering"`).
- **Clustal colouring here is group-based, not Clustal-X's conditional threshold scheme.** It colours every residue by chemistry class, regardless of how conserved its column is. Use `show_conservation` for the conservation signal. For DNA with IUPAC ambiguity codes (N, R, Y…), set `"colorscheme": "nucleotide"` explicitly, because heavy ambiguity can tip `auto` into `clustal`.

**Scope boundary:** the engine does no alignment, no tree-ordered rows (order rows by the tree's tip order before emitting; the tree itself belongs to **PhyloTree**, engines/phylotree.md), no secondary-structure tracks, and no per-column logo stacks. For information-content logos of a motif or column block, use **SeqLogo** (engines/seqlogo.md). Genome-scale or >1,000-sequence alignments are out of scope: use Jalview, AliView or pymsaviz on the FASTA directly.
