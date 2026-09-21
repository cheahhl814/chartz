Engine: Concordance
Template: templates/concordance.html
Routing row: 3
Loaded from SKILL.md §1 routing when this engine is selected.

# Concordance — gene vs site concordance-factor scatter (IQ-TREE gCF/sCF)

**Scope:** the IQ-TREE `--cf-branch` figure class — one point per species-tree branch, **gCF on x, sCF on y**, points coloured by an orthogonal support statistic (UFBoot/Sh-aLRT classes) via configurable thresholds, dashed **random-concordance reference lines** (33.3% for the standard setup), and per-point **callout labels** (rounded box + leader line) naming the clade and its stats. Also fits any "support-coloured XY scatter with annotated points" figure (e.g. dN/dS vs support, ASTRAL quartile plots) by renaming the axis labels. **Zero dependencies** — vanilla-JS SVG, works offline, §6.4 skipped.

**Spec** (fills `/*__SPEC__*/` as `const SPEC = {...}`):

```js
{
  title: "Mitogenome species tree: gene vs site concordance per branch",
  subtitle: "(7 taxa × 14,060 bp; 15 gene trees)",      // optional grey line under the title
  x_label: "Gene concordance factor, gCF (%)",
  y_label: "Site concordance factor, sCF (%)",
  x_max: 108, y_max: 105,                               // axis upper bounds (default 105)
  x_step: 20, y_step: 20,                               // tick step (default 20)
  random_line: 33.3,                                    // dashed reference on BOTH axes; false/null to hide
  level_title: "UFBoot support",                        // legend title; false hides the legend
  color_levels: [                                       // ordered support classes (legend order preserved)
    { max: 70,  color: "#d62728", label: "< 70%" },
    { max: 95,  color: "#ff7f0e", label: "70\u201395%" },
    { max: 100, color: "#2ca02c", label: "\u2265 95%" }
  ],
  points: [                                             // one per species-tree branch (skip the root)
    { x: 100.0, y: 88.6, level: "\u2265 95%",           // colour assignment, first match wins:
      label: "n10: all Chiloscyllium vs H. trispeculare", //   p.color explicit > p.level (label string
      sub: "UFBoot 100 \u00b7 gCF 100.0 \u00b7 sCF 88.6", //   or level index) > p.support vs thresholds
      dx: 14, dy: -34 },                                // optional callout offset in px (default 14, 0)
    { x: 46.7, y: 35.9, support: 68, label: "n11: C. griseum vs rest of ingroup" }
  ],
  export: { width_mm: 89, dpi: 300, font_family: "Arial" }
}
```

**Defaults:** thresholds `<70 / 70–95 / ≥95` with the red/orange/green traffic palette when `color_levels` is omitted; canvas fixed at 760×800 (square plot area); callouts default to the right of the point, vertically centered, auto-flipped left when they would cross the right axis, and clamped inside the plot area.

**Pitfalls:**

- **Colour assignment order matters**: `p.color` (explicit) beats `p.level`, which beats `p.support`. `support` uses the `max` thresholds of `color_levels` — values above the last `max` fall through to the last level's colour. Verify each point's colour in the render before delivering (the original bamboo-shark script shipped a wrong red because a missing support fell to the lowest class).
- **Callout collisions are the author's job**: with dense point clouds, set per-point `dx`/`dy` (px; dy is the box-center offset). Callouts are clamped to the plot area but not to each other — for >15 labelled points, label only the extreme/discordant points and let the rest ride on `title`-tooltip hover (`data-tip` is set on every marker automatically).
- **Coincident points are nudged deterministically** (12px grid, repeatable across renders) — don't add random jitter in the spec.
- **`random_line` is 33.3 for the standard gCF/sCF setup** (1/3 of genes/sites agree at random); use a different value only when the gene-tree count or alignment makes a different null explicit, and say so in the subtitle.
- **Axis ranges**: keep 0-based (concordance factors are percentages); only widen `x_max`/`y_max` when a callout would otherwise clamp.
- **Percent-sign labels in JSON**: use `\u0025` or plain `%` — both fine; avoid raw unicode arrows in `level` strings differing from the legend (`≥` is `\u2265`, `–` is `\u2013`) — a mismatch silently falls through to the last level's colour.
- **Data provenance**: parse `concordance.cf.stat` (IQ-TREE output) into the `points` array server-side; drop the root row (all-NA) before emitting. Keep the clade descriptions in `label`, the raw stats in `sub`.
- **Generalised use**: this engine is NOT a general scatter engine (that's Plotly §3) — use it when the support-level colour classes + random line + callouts are the point of the figure.