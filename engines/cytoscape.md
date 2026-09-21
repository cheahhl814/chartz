Engine: Cytoscape.js
Template: templates/cytoscape.html
Routing row: 3
Loaded from SKILL.md §1 routing when this engine is selected.

# Cytoscape.js — nodes + edges

**Scope:** network graphs — pathways, PPIs, gene-regulatory networks, dependency trees. Nodes/edges as elements with `data` attributes; layout algorithms position them.

**Spec** (fills `/*__SPEC__*/` as `const SPEC = {...}`):

```js
{
  elements: [
    { data: { id: "TP53", label: "TP53" } },
    { data: { id: "MDM2", label: "MDM2" } },
    { data: { id: "e1", source: "TP53", target: "MDM2", weight: 0.9 } }
  ],
  style: [
    { selector: "node", style: { "content": "data(label)", "font-size": 12,
                                 "background-color": "#4A78A8" } },
    { selector: "edge", style: { "width": 2, "line-color": "#bbb",
                                 "curve-style": "bezier" } }
  ],
  layout: { name: "cose", animate: false }   // breadthfirst | circle | grid | concentric | cose
}
```

**Spec extras** — `title: "..."` (optional, shown as the card heading; also satisfies self-check #6).

**Pitfalls**

- `curve-style: "bezier"` on edges — without it parallel edges overdraw invisibly.
- Truthy selectors need `?`: `node[side]` matches *existence* of the data field (every node with the key set, even `false`); use `node[?side]` for a truthy match (§S-library class: silent full-selector match).
- Layout names are exact: `cose` (built-in) vs `cose-bilkent` (needs an extra plugin the template does NOT load — never emit `cose-bilkent`, `fcose`, or `elk`).
- Element `id`s are **global across nodes and edges**; any collision (node id = edge id included) silently drops the colliding element (see S9).
- Label readability: set node `font-size` and `text-valign: "center"`; for >100 nodes drop labels entirely (`"content": ""`) and rely on tooltips (`bindTooltips` not loaded — keep labels off instead).
- Style values are strings quoted like `"width": 2` (number ok) but `"content": "TP53"` must be a string — mismatched types are the #2 silent-blank cause.
- **Data-mapped styling**: per-node size and per-edge width come from `data` attributes + style selectors: `{selector: "node", style: {"width": "data(size)", "height": "data(size)"}}`, `{selector: "edge", style: {"width": "data(w)"}}` — compute degree/weight upstream, emit as element data. Never leave all sizes uniform when degree is meaningful.
- **`preset` layout** (positions supplied): emit per-element `position: {x, y}` and `layout: {name: "preset"}` when positions were computed upstream with a seeded algorithm — reproducible renders and comparable multi-network figures.
