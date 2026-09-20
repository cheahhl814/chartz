Loaded from SKILL.md §10.1 when choosing chart colours.

# Colour palettes (publication standard)

## Qualitative (≤8 groups, CVD-safe)

- Okabe-Ito (8) — the §10.1 default: #000000 #E69F00 #56B4E9 #009E73 #F0E442 #0072B2 #D55E00 #CC79A7 (Wong 2011)
- Paul Tol Bright (7): Blue #4477AA, Red #EE6677, Green #228833, Yellow #CCBB44, Cyan #66CCEE, Purple #AA3377, Grey #BBBBBB
- Paul Tol Vibrant (7): #0077BB #33BBEE #009988 #EE7733 #CC3311 #332288 #BBBBBB
- Paul Tol Muted (9): #332288 #88CCEE #44AA99 #117733 #999933 #DDCC77 #CC6677 #882255 #AA4499
- Paul Tol High-contrast (3): #DDAA33 #BB5566 #004488

## Journal-style (match target journal's house style)

- NPG / Nature Reviews Cancer (10): #E64B35 #4DBBD5 #00A087 #3C5488 #F39B7F #8491B4 #91D1C2 #DC0000 #7E6148 #B09C85
- NEJM (8): #BC3C29 #0072B2 #E18727 #20854E #7876B1 #6F99AD #FFDC91 #EE4C97
- Lancet Oncology (9): #00468B #ED0000 #42B540 #0099B4 #925E9F #FDAF91 #AD002A #ADB6B6 #1F1917

(source: ggsci R package palettes.R)

## Sequential (continuous values)

- Plotly colorscale strings: Viridis (default), Magma, Cividis (CVD-optimized)
- ColorBrewer: Blues, YlGnBu, Greys — luminance-monotonic

## Diverging (meaningful midpoint)

- ColorBrewer RdBu (reverse for LFC: negative=blue, positive=red), PiYG
- Crameri: vik, roma (perceptually uniform)

## Circos / genomics conventions

- Chromosome assignment: Brewer-based chromosome palettes; species cytoband colors should match UCSC
- Heatmap ranges: white→#D55E00 for intensity (0→max), symmetric blue↔white↔red for signed values
- Track/link grays: #888888 at low alpha for low-confidence links

## Selection rules

- Never rainbow/jet.
- Okabe-Ito or Tol Bright for ≤8 unordered categories.
- Viridis/Cividis for one-way continuous.
- RdBu/vik for midpoint data.
- Journal palettes only when matching the target journal.
- Grayscale-monotonic test for sequential maps.

**Cite:** Paul Tol SRON notes; ggsci (Xiao 2018); Crameri 2020; Wong 2011; Ten simple rules to colorize biological data (PMC7561171); Choosing color palettes for scientific figures (PMC7040535).
