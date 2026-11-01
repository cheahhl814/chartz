# chartz-renderer — companion extension to the `chartz` skill

Pi extension that executes chartz's mechanical template-fill flow as a typed
tool, instead of the model hand-copying a template into a new file each time.
Current version: **0.16.1** (tracks the skill version family).

## Why

chartz's engine machinery (16 templates × single `/*__SPEC__*/` slot + the
§6 self-check + CDN probing) is deterministic repetition. Executing it in
code removes the fragile manual fill from model attention and makes the
self-check impossible to skip.

## Tools

| Tool | Purpose |
|---|---|
| `render_chart` | Executes the skill's template-fill contract deterministically: **enforces the engine's required spec keys and title** (from the `ENGINES` registry, sourced from each `engines/<name>.md` Spec block — an empty/incomplete spec would render a blank page, the §6 5b-2 failure class); warns on string sentinels (`"NaN"/"None"/"undefined"`, §6 check 5); escapes `</script>`/`<!--` breakouts (`JSON.stringify` does not escape `<` — serialized as `\u003c`, valid JSON *and* JS); accepts a JSON object **or** a strict-JSON string (parsed, coercion recorded); fills the template's single `/*__SPEC__*/` slot exactly once (slot-count asserted **on the template, pre-fill**); verifies the engine render call **on the template pre-fill** (§6 5b-2); validates name/workdir **before** any network I/O; probes the template's pinned `<script src>` CDN URLs (parsed from the template, so version bumps need no extension edit; HEAD 403/405 falls back to a ranged GET; offline degrades to a warning in `auto`, `strict` refuses pre-write, `off` skips); overwrites `<workdir>/charts/<name>.html` (overwrite silently — user decision 2026-11-01). Tool-cancel signal aborts probes. |
| `list_chartz_engines` | Read-only registry: 16 engines × template × required keys × title rule × zero-CDN vs pinned-CDN classification (derived from template script tags — no hand-coded flag) × `.html` example counts; flags templates present on disk but unregistered (drift guard for SKILL §1/§7 vs this file). |

## Design invariants

- **Templates and engine spec contracts are never copied.** They are read from
  the chartz skill directory (default `~/.agents/skills/chartz`, i.e. the
  `@skills/chartz` symlink; override with `CHARTZ_SKILL_DIR`). The skill repo
  stays the single source of truth.
- CDN URLs are extracted from the rendered template by regex, so the
  SKILL.md §7 bump procedure (`sed` the template) needs no extension change.
- Offline CDN failures are a **warning** in the result (`probeCdn: "auto"`,
  default), never a silent blank page and never a refusal; `strict` refuses,
  `off` skips probing. HEAD 403/405 falls back to a ranged GET before being
  classified unreachable (some CDNs reject HEAD).
- Output overwrites silently (`<workdir>/charts/<name>.html`) per user
  decision 2026-11-01; output-file names are sanitized (no path separators).
  `workdir` is model-controlled by design (the chart is a deliverable the
  caller directs); writes go through `node:fs` deliberately — the HTML file
  is a user-facing deliverable, not an agent-visible file edit, so pi's
  edit-tracking does not apply.

## Deploy

```bash
ln -sfn ~/.agents/skills/chartz/companion/pi-extension.ts \
        ~/.pi/agent/extensions/chartz-renderer.ts
```

(The extension lives inside `@skills/chartz/companion/` — one git repo owns
skill + extension — and is read through the deployed skill path, which itself
resolves to `@skills/chartz`.)

## Smoke test

```bash
pi -e ~/.pi/agent/extensions/chartz-renderer.ts --skill ~/.agents/skills/chartz \
   --no-builtin-tools -p "Call list_chartz_engines and report engine count + missing templates."
```

Render test (template-native engines, no CDN): see `SKILL.md` §0 step 3 —
e.g. `render_chart(engine=seqlogo, ...)` and `render_chart(engine=phylotree, ...)`;
verify `<workdir>/charts/*.html` have zero `__SPEC__` residue and that each
SPEC block parses as strict JSON.