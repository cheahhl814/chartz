/**
 * chartz-renderer — Pi extension companion to the `chartz` skill.
 *
 * Render side (tool `render_chart`): execute chartz's mechanical template-fill
 * flow deterministically instead of the model hand-copying a template into a
 * new file:
 *
 *   1. strict validation of the spec object (recursive walk — rejects
 *      NaN / ±Infinity / undefined where JSON.stringify would silently
 *      mangle them into null or drop the key)
 *   2. fill the template's single ``/*__SPEC__*\/`` slot (fails hard on
 *      0 or >1 slot occurrences)
 *   3. verify the engine's render call survived the fill
 *      (per-chartz §6 5b-2 regression guard)
 *   4. verify no slot residue and write `<workdir>/charts/<name>.html`
 *   5. optional probe of the template's pinned `<script src>` CDN URLs
 *      (parsed from the template, so version bumps never need an extension
 *      edit) — offline failures degrade to a warning, never a refusal
 *
 * Registry side (tool `list_chartz_engines`): the 16-engine table with
 * template existence and example counts, so the model can self-check routing
 * without loading the full SKILL.md §7 pin table.
 *
 * Templates and engine spec contracts are NEVER copied — they are read from
 * the chartz skill directory (default ~/.agents/skills/chartz, which is the
 * @skills/chartz symlink; override with CHARTZ_SKILL_DIR). The skill repo
 * stays the single source of truth; this extension is purely the executor.
 *
 * No runtime imports beyond @earendil-works/pi-ai / pi-coding-agent and
 * node builtins — type-only import of ExtensionAPI keeps symlink loading
 * resolution-independent (pattern from the handoff companion extension).
 */

import { Type } from "@earendil-works/pi-ai";
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const SKILL_DIR = process.env.CHARTZ_SKILL_DIR || join(homedir(), ".agents/skills/chartz");
const TEMPLATES_DIR = join(SKILL_DIR, "templates");
const EXAMPLES_DIR = join(SKILL_DIR, "examples");
const SLOT_TOKEN = "/*__SPEC__*/";

interface EngineSpec {
	pattern: string; // template filename
	renderChecks: Array<{ label: string; re: RegExp }>; // §6 5b-2 render-call guard
	native: boolean; // template-native SVG (no CDN <script src> expected)
}

const ENGINES: Record<string, EngineSpec> = {
	heattree:     { pattern: "heattree.html",         renderChecks: [{ label: "native render()", re: /function render\(/ }], native: true },
	phylotree:    { pattern: "phylotree.html",        renderChecks: [{ label: "native render()", re: /function render\(/ }], native: true },
	concordance:  { pattern: "concordance.html",      renderChecks: [{ label: "native render()", re: /function render\(/ }], native: true },
	cytoscape:    { pattern: "cytoscape.html",        renderChecks: [{ label: "cytoscape(",    re: /\bcytoscape\(/ }],        native: false },
	genetracks:   { pattern: "genetracks.html",       renderChecks: [{ label: "native render()", re: /function render\(/ }], native: true },
	clusterheat:  { pattern: "clusteredheatmap.html", renderChecks: [{ label: "native render()", re: /function render\(/ }], native: true },
	oncoprint:    { pattern: "oncoprint.html",        renderChecks: [{ label: "native render()", re: /function render\(/ }], native: true },
	seqlogo:      { pattern: "seqlogo.html",          renderChecks: [{ label: "native render()", re: /function render\(/ }], native: true },
	circos:       { pattern: "circos.html",           renderChecks: [{ label: "native render()", re: /function render\(/ }], native: true },
	upset:        { pattern: "upset.html",            renderChecks: [{ label: "native render()", re: /function render\(/ }], native: true },
	plotly:       { pattern: "plotly.html",           renderChecks: [{ label: "Plotly.newPlot(", re: /Plotly\.newPlot\(/ }], native: false },
	echarts:      { pattern: "echarts.html",          renderChecks: [{ label: "echarts.init(",   re: /echarts\.init\(/ }, { label: "setOption(", re: /\.setOption\(/ }], native: false },
	chartjs:      { pattern: "chartjs.html",          renderChecks: [{ label: "new Chart(",      re: /\bnew Chart\(/ }],       native: false },
	msaview:      { pattern: "msaview.html",          renderChecks: [{ label: "native render()", re: /function render\(/ }], native: true },
	genearrows:   { pattern: "genearrows.html",       renderChecks: [{ label: "native render()", re: /function render\(/ }], native: true },
	geomap:       { pattern: "geomap.html",           renderChecks: [{ label: "native render()", re: /function render\(/ }], native: false },
};

const ENGINE_IDS = Object.keys(ENGINES);

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Recursively collect non-finite numbers and undefined values (JSON paths). */
function findUnserializable(value: unknown, path: string, out: string[]): void {
	if (value === undefined) {
		out.push(`${path} = undefined`);
		return;
	}
	if (typeof value === "number" && !Number.isFinite(value)) {
		out.push(`${path} = ${value}`);
		return;
	}
	if (typeof value === "bigint") {
		out.push(`${path} = BigInt (not JSON-serializable)`);
		return;
	}
	if (Array.isArray(value)) {
		value.forEach((v, i) => findUnserializable(v, `${path}[${i}]`, out));
		return;
	}
	if (value !== null && typeof value === "object") {
		for (const [k, v] of Object.entries(value)) {
			findUnserializable(v, path ? `${path}.${k}` : k, out);
		}
	}
}

/** Extract pinned `<script src="https://...">` URLs from template HTML. */
function extractCdnUrls(html: string): string[] {
	const urls: string[] = [];
	const re = /<script[^>]+src="(https:\/\/[^"]+)"/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html)) !== null) urls.push(m[1]);
	return urls;
}

/** HEAD-probe one URL; resolves to status text, never throws. */
async function probeCdn(url: string, timeoutMs = 4000): Promise<string> {
	try {
		const ac = new AbortController();
		const timer = setTimeout(() => ac.abort(), timeoutMs);
		const res = await fetch(url, { method: "HEAD", signal: ac.signal, redirect: "follow" });
		clearTimeout(timer);
		return `${res.status}${res.ok ? " OK" : " UNREACHABLE"}`;
	} catch (e) {
		return `OFFLINE (${e instanceof Error ? e.message : "probe failed"})`;
	}
}

export default function chartzRenderer(pi: ExtensionAPI) {
	const enginesUnion = Type.Union(
		ENGINE_IDS.map((id) => Type.Literal(id)),
		{ description: "chartz engine id (see list_chartz_engines for the routing table)" },
	);

	const listEngines = defineTool({
		name: "list_chartz_engines",
		label: "List chartz engines",
		description:
			"List the 16 chartz rendering engines with their template filenames, render-verified example counts, and CDN dependence. Read-only registry helper for the chartz skill.",
		parameters: Type.Object({}),
		async execute() {
			function countExamples(engineName: string): number {
				if (!existsSync(EXAMPLES_DIR)) return 0;
				return readdirSync(EXAMPLES_DIR).filter((f) => f.startsWith(`${engineName}-`)).length;
			}
			const rows = ENGINE_IDS.map((id) => {
				const spec = ENGINES[id];
				const template = join(TEMPLATES_DIR, spec.pattern);
				return {
					engine: id,
					template: spec.pattern,
					templateMissing: !existsSync(template),
					native: spec.native,
					examples: countExamples(id),
				};
			});
			const missing = rows.filter((r) => r.templateMissing).map((r) => r.engine);
			const text = rows
				.map((r) =>
					`${r.engine.padEnd(12)} template=${r.template.padEnd(24)} ${r.native ? "template-native" : "CDN"}   examples=${r.examples}${r.templateMissing ? "   ⚠ TEMPLATE MISSING" : ""}`,
				)
				.join("\n");
			return {
				content: [{ type: "text", text: text || "(no engines registered)" }],
				details: { engines: rows, missingTemplates: missing, skillDir: SKILL_DIR },
			};
		},
	});

	const renderChart = defineTool({
		name: "render_chart",
		label: "Render chart",
		description:
			"Execute the chartz skill's template-fill step deterministically. Choose the engine yourself (chartz SKILL.md §1 routing table), read engines/<name>.md to shape the spec object, pass the spec here; the tool validates it strictly, fills the template's /*__SPEC__*/ slot exactly once, verifies the render call, probes the template's pinned CDN tags (warnings degrade gracefully offline), and writes <workdir>/charts/<name>.html. Emits one self-contained HTML file per chart.",
		parameters: Type.Object({
			engine: enginesUnion,
			spec: Type.Unknown({ description: "Chart spec object per engines/<engine>.md — strict serializable JSON only (no NaN/Infinity/undefined)" }),
			name: Type.String({ description: "Output filename without directory; '.html' appended when missing. Letters, digits, dot, dash, underscore." }),
			workdir: Type.Optional(Type.String({ description: "Working directory for the charts/ output folder (default: current session cwd)" })),
			probeCdn: Type.Optional(
				Type.Union([Type.Literal("auto"), Type.Literal("off"), Type.Literal("strict")], {
					description: "auto (default): probe CDN URLs, degrade to warnings offline; strict: refuse to write when a CDN URL fails; off: skip probing",
				}),
			),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const warnings: string[] = [];
			const checks: string[] = [];

			// -- engine + template -------------------------------------------------
			const engineId = params.engine;
			const engineDef = ENGINES[engineId];
			if (!engineDef) {
				throw new Error(`Unknown engine '${engineId}'. Valid engines: ${ENGINE_IDS.join(", ")}. Use list_chartz_engines.`);
			}
			const templatePath = join(TEMPLATES_DIR, engineDef.pattern);
			if (!existsSync(templatePath)) {
				throw new Error(`Template missing: ${templatePath} (CHARTZ_SKILL_DIR=${SKILL_DIR})`);
			}
			const template = readFileSync(templatePath, "utf8");

			// -- spec validation ---------------------------------------------------
			const spec = params.spec;
			if (spec === null || typeof spec !== "object" || Array.isArray(spec)) {
				throw new Error(`spec must be a JSON object (the template declares 'const SPEC = /*__SPEC__*/;'), got ${spec === null ? "null" : Array.isArray(spec) ? "array" : typeof spec}. Read engines/${engineId}.md first.`);
			}
			const bad: string[] = [];
			findUnserializable(spec, "", bad);
			if (bad.length > 0) {
				throw new Error(`spec contains non-JSON values (JSON.stringify would silently drop/mangle them):\n${bad.join("\n")}`);
			}
			checks.push("spec: object, strictly serializable (no NaN/±Infinity/undefined/BigInt)");

			let specJson: string;
			try {
				specJson = JSON.stringify(spec, null, 2);
			} catch (e) {
				throw new Error(`spec failed JSON serialization: ${e instanceof Error ? e.message : String(e)}`);
			}

			// -- slot fill -----------------------------------------------------------
			const slotCount = template.split(SLOT_TOKEN).length - 1;
			if (slotCount !== 1) {
				throw new Error(`Template ${templatePath} carries ${slotCount} /*__SPEC__*/ slots (expected exactly 1) — template drifted from the chartz contract; fix the template, not the output.`);
			}
			const html = template.replace(SLOT_TOKEN, () => specJson);
			if (html.includes(SLOT_TOKEN) || html.includes("__SPEC__")) {
				throw new Error("Slot fill left residue — aborting.");
			}
			checks.push("slot: /*__SPEC__*/ filled exactly once, no residue");

			// -- render-call guard (§6 5b-2) -----------------------------------------
			for (const rc of engineDef.renderChecks) {
				if (!rc.re.test(html)) {
					throw new Error(`Render-call guard failed: '${rc.label}' not found in output (chartz §6 5b-2 — a spec without its render call silently produces a blank page).`);
				}
			}
			checks.push(`render call: ${engineDef.renderChecks.map((r) => r.label).join(" + ")} present`);

			// -- CDN probe -----------------------------------------------------------
			const mode = params.probeCdn ?? "auto";
			const cdnUrls = extractCdnUrls(html);
			if (mode !== "off" && cdnUrls.length > 0) {
				const results = await Promise.all(cdnUrls.map((u) => probeCdn(u)));
				const failed = cdnUrls.filter((_, i) => !results[i].includes(" OK"));
				for (let i = 0; i < cdnUrls.length; i++) {
					checks.push(`cdn: ${cdnUrls[i]} → ${results[i]}`);
				}
				if (failed.length > 0) {
					if (mode === "strict") {
						throw new Error(`CDN probe failed (strict mode) for:\n${failed.join("\n")}\nRecover: retry with probeCdn="auto" to write anyway, or offer the lumen-generate_visual static-render fallback (chartz §6).`);
					}
					warnings.push(`CDN unreachable — file written; chart will render blank until the pinned script loads. URLs: ${failed.join(", ")}. Offer the lumen-generate_visual static-render fallback (chartz SKILL.md §6).`);
				}
			}

			// -- output ---------------------------------------------------------------
			const rawName = params.name.trim();
			if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(rawName.replace(/\.html$/, ""))) {
				throw new Error(`Invalid output name '${rawName}' — use letters/digits/dot/dash/underscore, no path separators.`);
			}
			const fileName = rawName.endsWith(".html") ? rawName : `${rawName}.html`;
			const workdir = params.workdir ? (isAbsolute(params.workdir) ? resolve(params.workdir) : resolve(ctx.cwd, params.workdir)) : ctx.cwd;
			const chartsDir = join(workdir, "charts");
			mkdirSync(chartsDir, { recursive: true });
			const outPath = join(chartsDir, fileName);
			writeFileSync(outPath, html, "utf8");
			checks.push(`output: ${outPath} (overwritten if pre-existing)`);

			const bytes = html.length;
			const summary = [
				`chartz/render_chart: ${engineId} → ${outPath} (${bytes} bytes)`,
				`checks: ${checks.length} passed`,
				warnings.length ? `warnings: ${warnings.join(" | ")}` : "no warnings",
			].join("\n");

			return {
				content: [{ type: "text", text: summary }],
				details: { engine: engineId, output: outPath, bytes, checks, warnings, cdnUrls, probeMode: mode },
			};
		},
	});

	pi.registerTool(listEngines);
	pi.registerTool(renderChart);
}