# chartz

[![Version](https://img.shields.io/badge/version-0.1.0-blue)](#-installation)
[![Type](https://img.shields.io/badge/type-agent%20skill-blueviolet)](#-installation)
[![README standard](https://img.shields.io/badge/README%20per-bioinfo--skill--creator-orange)](https://github.com/cheahhl814/bioinfo-skill-creator)

Render charts and graphs as self-contained HTML files from four CDN-pinned engines, chosen by chart type. One request → one portable HTML file: simple statistical charts via Chart.js, scientific/statistical plots via Plotly.js, rich interactive dashboards via ECharts, and nodes+edges network graphs via Cytoscape.js. No build step, no server, no inline library code.

**Repository**: https://github.com/cheahhl814/chartz

> [!NOTE]
> Current version: **v0.1.0** (updated 2026-09-19).

## Contents

- [Installation](#-installation)
- [Usage](#-usage)
- [Engine routing overview](#-engine-routing-overview)
- [Engines](#-engines)
- [Update check](#-update-check)
- [Repository layout](#-repository-layout)
- [Hard guarantees](#-hard-guarantees)
- [Provenance](#provenance)

## 🚀 Installation

This is an **agent skill**, not a user-facing library. The recommended install path is to let your AI agent import it.

**Option A — give your agent this prompt (recommended):**

```text
Install the chartz skill from
https://github.com/cheahhl814/chartz —
clone it into your agent's skills directory (the path your agent watches
for skills). Then read the skill's SKILL.md to understand the engine
routing table and the per-engine spec contracts. Confirm when ready.
```

**Option B — manual install:**

```bash
git clone https://github.com/cheahhl814/chartz.git
cd chartz
```

> [!TIP]
> chartz has **no runtime dependencies to install** — no pixi, no conda, no npm. Templates load the four chart libraries from pinned CDN `<script>` tags at render time; the only local tools the skill needs are `python3` (stdlib) and a browser to open the output.

## 💡 Usage

The skill is designed to be driven by an AI agent: the agent reads the master `SKILL.md`, classifies the request against the engine routing table (§1), emits the engine's JSON spec, fills the matching template's `/*__SPEC__*/` slot, runs the 6-point self-check (§6), and delivers the absolute path of the generated HTML file.

### Natural-language prompts that trigger the skill

```text
make a bar chart of these monthly totals
plot this data as a box plot per condition
draw a network graph of these protein interactions
build me a sankey of this budget flow
heatmap of these values with labels
```

### Manual execution

To render an example without an agent:

```bash
git clone https://github.com/cheahhl814/chartz.git
cd chartz/examples
# open any demo in a browser — each is a self-contained HTML file
```

> [!IMPORTANT]
> Text-to-diagram requests (flowcharts, sequence diagrams) are **out of scope** — use Mermaid for those. chartz covers data charts and graph/network rendering only.

## 🗺 Engine routing overview

The routing table in `SKILL.md` §1 maps request shape → engine (first match wins). Each engine has a spec contract with worked example and pitfalls in `SKILL.md` §2–§5.

| # | Request shape | Engine | Template |
|:--|:--------------|:-------|:---------|
| 1 | Nodes + edges (pathways, networks, dependency graphs) | Cytoscape.js | `templates/cytoscape.html` |
| 2 | Box/violin/histogram/**heatmap**/3D/error bars/log axes/subplots | Plotly.js | `templates/plotly.html` |
| 3 | Treemap/sankey/sunburst/large series/dataZoom/mixed dashboards | ECharts | `templates/echarts.html` |
| 4 | Simple bar/line/pie/doughnut/radar/scatter/bubble | Chart.js | `templates/chartjs.html` |
| 5 | Anything else | ECharts (catch-all) | `templates/echarts.html` |

> [!TIP]
> Read `SKILL.md` §6 before every delivery: spec strict-JSON check, CDN pin coherence, slot-fill verification, reachability probe, NaN/undefined hygiene, and output-path reporting. When a request matches no row and the data shape is ambiguous, the agent surfaces an *Evidence + Recommend + Options* stop point instead of guessing.

## 🧰 Engines

All libraries are loaded from pinned CDN URLs at render time — no local installs, no version conflicts.

| Engine | Pinned version | Role | License |
|:-------|:---------------|:-----|:--------|
| [Chart.js](https://www.chartjs.org/) | 4.5.1 | Simple statistical charts | MIT |
| [Plotly.js](https://plotly.com/javascript/) | 4.1.1 | Scientific/statistical charts | MIT |
| [ECharts](https://echarts.apache.org/) | 6.1.0 | Rich interactive charts, dashboards, catch-all | Apache-2.0 |
| [Cytoscape.js](https://js.cytoscape.org/) | 3.34.3 | Network/graph rendering | MIT |

Engine version pins are single-sourced in `SKILL.md` §7 and mirrored into every template. Never float (`@latest`).

## 🔄 Update check

chartz ships a self-update check that compares the deployed git SHA against this upstream repo via `git fetch` — no GitHub API call, no extra dependencies.

```bash
python3 bin/skill-update-check.py
```

| Verdict | Exit | Meaning |
|:--------|:-----|:--------|
| `UP-TO-DATE` | 0 | Local HEAD matches origin/HEAD |
| `LOCAL-AHEAD` | 0 | Unpushed local commits; no action needed |
| `BEHIND-BY-N` | 1 | Upstream is N commits ahead → re-pull from this repo |
| `OFFLINE` | 2 | `git fetch` failed; informational only |
| `NO-ORIGIN` | 2 | No `origin` remote configured; informational only |

## 📁 Repository layout

```text
chartz/
├── SKILL.md                 # Master router — start here (routing table, spec contracts, signature library)
├── README.md                # This file
├── templates/               # One self-contained HTML template per engine (pinned CDN tags)
│   ├── chartjs.html
│   ├── plotly.html
│   ├── echarts.html
│   └── cytoscape.html
├── examples/                # One worked demo per engine
│   └── screenshots/         # Headless-Chrome render proof for all four engines
└── bin/
    └── skill-update-check.py  # Self-update check
```

## 🔒 Hard guarantees

- **Reproducible renders** — every engine is pinned to an exact CDN version; `@latest` is never emitted.
- **Self-checked delivery** — every chart passes the 6-point §6 self-check (strict-JSON spec, slot fill, CDN reachability, NaN/undefined hygiene) before the path is reported.
- **Signature-library debugging** — silent failures (blank canvas, missing edges, squashed charts) are catalogued as S1–S10 with cause → fix, not rediscovered ad hoc.
- **Explicit stop points** — ambiguous requests surface *Evidence + Recommend + Options*, not auto-picked choices.
- **No machine-specific paths** — output goes to the working directory; the skill ships no local dependencies and no user-specific configuration.
- **Render-verified examples** — all four example demos were executed in headless Chrome and verified non-blank (see `examples/screenshots/`).

## Provenance

Authored by hand following the AiX-BIO skill convention; README rendered to the [bioinfo-skill-creator](https://github.com/cheahhl814/bioinfo-skill-creator) template standard (workflow-skill adaptation). Pattern adopted from:

- **bioinfo-skill-creator** — https://github.com/cheahhl814/bioinfo-skill-creator (README standard, update-check script, signature-library/battle-test conventions)
- **herdr-skill+** — https://github.com/cheahhl814/herdr-skill-plus (single-router workflow-skill precedent)

License: MIT (skill content). Chart libraries remain under their own licenses, listed in the Engines table above.