/**
 * chartz-renderer — Pi extension companion to the `chartz` skill.
 *
 * Render side (tool `render_chart`): execute chartz's mechanical template-fill
 * flow deterministically instead of the model hand-copying a template into a
 * new file:
 *
 *   1. spec handling — accepts a JSON object or a JSON string (a common model
 *      failure mode; the string is parsed and the coercion is recorded);
 *      validates strictly: rejects non-serializable values (NaN / ±Infinity /
 *      undefined / BigInt — unreachable via JSON transport but defends
 *      programmatic calls), warns on string sentinels ("NaN"/"None"/"undefined")
 *      and enforces per-engine required top-level keys + title path per the
 *      engines/<name>.md Spec contracts
 *   2. escape `</script>` breakouts — JSON.stringify does not escape `<`,
 *      so the serialized spec is post-processed to `\u003c` (valid JSON
 *      *and* valid JS, compatible with §6 check 1)
 *   3. fill the template's single ``/*__SPEC__*\/`` slot exactly once
 *      (slot count is asserted on the TEMPLATE, pre-fill — v0.16.1: the old
 *      post-fill residue scan produced false aborts on legitimate data)
 *   4. verify the engine's render call (per-chartz §6 5b-2 regression guard)
 *      on the TEMPLATE pre-fill — v0.16.1: testing the filled output let a
 *      spec containing e.g. "Plotly.newPlot(" pass falsely
 *   5. verify name/workdir BEFORE any network I/O, then probe the template's
 *      pinned `<script src>` CDN URLs (parsed from the template, so version
 *      bumps never need an extension edit) — offline / non-2xx failures
 *      degrade to a warning in "auto" mode, never a refusal; "strict"
 *      refuses before writing; 403/405 falls back to a ranged GET before
 *      being classified unreachable
 *   6. output `<workdir>/charts/<name>.html` (overwrite silently)
 *
 * Registry side (tool `list_chartz_engines`): the engine table with template
 * existence, per-engine required keys, zero-CDN-vs-pinned-CDN classification
 * (derived from the template's script tags, not a hand-coded flag), example
 * counts (.html only), and any templates present on disk but unregistered.
 *
 * Templates and engine spec contracts are NEVER copied — they are read from
 * the chartz skill directory (default ~/.agents/skills/chartz, which is the
 * @skills/chartz symlink; override with CHARTZ_SKILL_DIR). The skill repo
 * stays the single source of truth; this extension is purely the executor.
 *
 * Runtime imports of the @earendil-works packages resolve because pi's jiti
 * loader aliases those packages globally (loader.js getAliases()) — this
 * extension is loaded through a symlink, and the smoke tests verify that
 * aliasing survives the deployment layout. Write path goes through node:fs
 * by design: the chart HTML is a user-facing deliverable, not an
 * agent-visible file edit, so it intentionally bypasses pi's edit-tracking.
 */

import { Type } from "@earendil-works/pi-ai";
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const SKILL_DIR = process.env.CHARTZ_SKILL_DIR || join(homedir(), ".agents/skills/chartz");
const TEMPLATES_DIR = join(SKILL_DIR, "templates");
const EXAMPLES_DIR = join(SKILL_DIR, "examples");
const SLOT_TOKEN = "/*__SPEC__*/";
const STRING_SENTINELS = ["NaN", "None", "undefined"];

/**
 * required: top-level keys (dot paths) that MUST exist in the spec — sourced
 * from each engine's Spec contract in engines/<name>.md. Empty spec = blank
 * page (the exact §6 5b-2 failure class), so this is the guard that matters.
 * titlePath: dot path whose presence satisfies §6 check 6 (title text);
 * titleOptional: true when the engine doc explicitly marks title optional.
 * renderChecks: §6 5b-2 guard, executed on the TEMPLATE (pre-fill).
 * native/deps are DERIVED from the template content at render time — never
 * hand-maintained here.
 */
interface EngineSpec {
	pattern: string;
	required: string[];
	titlePath: string | null;
	titleOptional?: boolean;
	renderChecks: Array<{ label: string; re: RegExp }>;
}

const NATIVE_RENDER: EngineSpec["renderChecks"] = [{ label: "native render()", re: /function render\(/ }];

const ENGINES: Record<string, EngineSpec> = {
	heattree:     { pattern: "heattree.html",         required: ["title", "nodes", "edges"],              titlePath: "title", renderChecks: NATIVE_RENDER },
	phylotree:    { pattern: "phylotree.html",        required: ["title", "newick"],                      titlePath: "title", renderChecks: NATIVE_RENDER },
	concordance:  { pattern: "concordance.html",      required: ["title", "points"],                      titlePath: "title", renderChecks: NATIVE_RENDER },
	cytoscape:    { pattern: "cytoscape.html",        required: ["elements"],                             titlePath: "title", titleOptional: true, renderChecks: [{ label: "cytoscape(", re: /\bcytoscape\(/ }] },
	genetracks:   { pattern: "genetracks.html",       required: ["title", "region", "tracks"],            titlePath: "title", renderChecks: NATIVE_RENDER },
	clusterheat:  { pattern: "clusteredheatmap.html", required: ["title", "matrix"],                      titlePath: "title", renderChecks: NATIVE_RENDER },
	oncoprint:    { pattern: "oncoprint.html",        required: ["title", "genes", "samples", "cells"],   titlePath: "title", renderChecks: NATIVE_RENDER },
	seqlogo:      { pattern: "seqlogo.html",          required: ["title", "positions"],                   titlePath: "title", renderChecks: NATIVE_RENDER },
	circos:       { pattern: "circos.html",           required: ["title", "chromosomes", "tracks"],       titlePath: "title", renderChecks: NATIVE_RENDER },
	upset:        { pattern: "upset.html",            required: ["title", "sets", "set_sizes", "intersections"], titlePath: "title", renderChecks: NATIVE_RENDER },
	plotly:       { pattern: "plotly.html",           required: ["data", "layout"],                       titlePath: "layout.title", renderChecks: [{ label: "Plotly.newPlot(", re: /Plotly\.newPlot\(/ }] },
	echarts:      { pattern: "echarts.html",          required: ["series"],                               titlePath: "title", renderChecks: [{ label: "echarts.init(", re: /echarts\.init\(/ }, { label: "setOption(", re: /\.setOption\(/ }] },
	chartjs:      { pattern: "chartjs.html",          required: ["type", "data"],                         titlePath: "options.plugins.title.text", renderChecks: [{ label: "new Chart(", re: /\bnew Chart\(/ }] },
	msaview:      { pattern: "msaview.html",          required: ["title", "sequences"],                   titlePath: "title", renderChecks: NATIVE_RENDER },
	genearrows:   { pattern: "genearrows.html",       required: ["title", "contigs"],                     titlePath: "title", renderChecks: NATIVE_RENDER },
	geomap:       { pattern: "geomap.html",           required: ["layers", "projection"],                 titlePath: "title", renderChecks: NATIVE_RENDER },
};

const ENGINE_IDS = Object.keys(ENGINES);

const enginesUnion = Type.Union(
	ENGINE_IDS.map((id) => Type.Literal(id)),
	{ description: "chartz engine id (see list_chartz_engines for the routing table)" },
);

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Recursively collect non-serializable values (JSON paths). */
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

/** Warn on exact string sentinels the §6 check 5 greps for. */
function findStringSentinels(value: unknown, path: string, out: string[]): void {
	if (typeof value === "string") {
		if ((STRING_SENTINELS as string[]).includes(value.trim())) out.push(`${path} = "${value}"`);
		return;
	}
	if (Array.isArray(value)) {
		value.forEach((v, i) => findStringSentinels(v, `${path}[${i}]`, out));
		return;
	}
	if (value !== null && typeof value === "object") {
		for (const [k, v] of Object.entries(value)) {
			findStringSentinels(v, path ? `${path}.${k}` : k, out);
		}
	}
}

/** Resolve a dot path ("layout.title") in the spec; true if the value exists. */
function hasPath(spec: Record<string, unknown>, dotPath: string): boolean {
	let cur: unknown = spec;
	for (const key of dotPath.split(".")) {
		if (cur === null || typeof cur !== "object" || !(key in (cur as Record<string, unknown>))) return false;
		cur = (cur as Record<string, unknown>)[key];
	}
	return cur !== undefined && cur !== null && cur !== "";
}

/** Extract pinned `<script src="https://...">` URLs from template HTML. */
function extractCdnUrls(html: string): string[] {
	const urls: string[] = [];
	const re = /<script[^>]+src="(https:\/\/[^"]+)"/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html)) !== null) urls.push(m[1]);
	return urls;
}

/**
 * Probe one pinned URL. Returns structured { ok, text } — never string-sniffed.
 * HEAD 403/405 (some CDNs reject HEAD) falls back to a ranged GET before
 * being classified unreachable. Never throws.
 */
async function probeCdn(url: string, signal?: AbortSignal): Promise<{ ok: boolean; text: string }> {
	try {
		const ac = new AbortController();
		const timer = setTimeout(() => ac.abort(), 4000);
		const onAbort = () => ac.abort();
		signal?.addEventListener("abort", onAbort, { once: true });
		try {
			let res = await fetch(url, { method: "HEAD", signal: ac.signal, redirect: "follow" });
			if (res.status === 403 || res.status === 405) {
				res = await fetch(url, { headers: { Range: "bytes=0-0" }, signal: ac.signal, redirect: "follow" });
			}
			const ok = res.status >= 200 && res.status < 300;
			return { ok, text: `${ok ? "" : "UNREACHABLE: "}${res.status}${res.status === 200 ? " OK" : ""}` };
		} finally {
			clearTimeout(timer);
			signal?.removeEventListener("abort", onAbort);
		}
	} catch (e) {
		const aborted = signal?.aborted;
		return { ok: false, text: aborted ? "ABORTED" : `OFFLINE (${e instanceof Error ? e.message : "probe failed"})` };
	}
}

/** List templates present on disk but not registered in ENGINES. */
function unregisteredTemplates(): string[] {
	if (!existsSync(TEMPLATES_DIR)) return [];
	const known = new Set(Object.values(ENGINES).map((e) => e.pattern));
	return readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith(".html") && !known.has(f));
}

function countExamples(engineName: string): number {
	if (!existsSync(EXAMPLES_DIR)) return 0;
	return readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith(".html") && f.startsWith(`${engineName}-`)).length;
}

export default function chartzRenderer(pi: ExtensionAPI) {
	const listEngines = defineTool({
		name: "list_chartz_engines",
		label: "List chartz engines",
		description:
			"List the 16 chartz rendering engines with template filenames, required spec keys, title rules, zero-CDN-vs-pinned-CDN classification (derived from template script tags), and render-verified .html example counts. Read-only registry helper for the chartz skill.",
		parameters: Type.Object({}),
		async execute() {
			const rows = ENGINE_IDS.map((id) => {
				const spec = ENGINES[id];
				const template = join(TEMPLATES_DIR, spec.pattern);
				let cdnUrls: string[] = [];
				if (existsSync(template)) cdnUrls = extractCdnUrls(readFileSync(template, "utf8"));
				return {
					engine: id,
					template: spec.pattern,
					missing: !existsSync(template),
					style: "template-native" as const, // all 16 are template-native SVG/HTML fills; deps differ
					deps: cdnUrls.length ? "pinned CDN" : "zero-CDN",
					required: spec.required,
					title: spec.titleOptional ? `${spec.titlePath} (optional per engines/${id}.md)` : spec.titlePath,
					examples: countExamples(id),
				};
			});
			const missing = rows.filter((r) => r.missing).map((r) => r.engine);
			const unregistered = unregisteredTemplates();
			const text = rows
				.map((r) =>
					`${r.engine.padEnd(12)} ${r.template.padEnd(24)} ${r.deps.padEnd(11)} required=[${r.required.join(",")}]  examples=${r.examples}${r.missing ? "   ⚠ TEMPLATE MISSING" : ""}`,
				)
				.join("\n")
				+ (unregistered.length ? `\n⚠ templates on disk but unregistered: ${unregistered.join(", ")}\n(chartz lint should reconcile SKILL §1/§7 with companion ENGINES — single registry drift guard)` : "");
			return {
				content: [{ type: "text", text: text || "(no engines registered)" }],
				details: { engines: rows, missingTemplates: missing, unregisteredTemplates: unregistered, skillDir: SKILL_DIR },
			};
		},
	});

	const renderChart = defineTool({
		name: "render_chart",
		label: "Render chart",
		description:
			"Execute the chartz skill's template-fill step deterministically. Choose the engine yourself (chartz SKILL.md §1 routing table), read engines/<name>.md to shape the spec object (or strict-JSON string), pass the spec here; the tool enforces the per-engine required keys and title, escapes </script> breakouts, fills the template's /*__SPEC__*/ slot exactly once, verifies the render call on the template, probes the template's pinned CDN tags (warnings degrade gracefully offline), and writes <workdir>/charts/<name>.html. Emits one self-contained HTML file per chart.",
		parameters: Type.Object({
			engine: enginesUnion,
			spec: Type.Unknown({ description: "Chart spec per engines/<engine>.md — JSON object (or strict-JSON string, parsed and recorded). Must satisfy the engine's required keys; no NaN/Infinity/undefined/BigInt." }),
			name: Type.String({ description: "Output filename without directory; '.html' appended when missing. Letters, digits, dot, dash, underscore." }),
			workdir: Type.Optional(Type.String({ description: "Working directory for the charts/ output folder (default: current session cwd); '~' expands" })),
			probeCdn: Type.Optional(
				Type.Union([Type.Literal("auto"), Type.Literal("off"), Type.Literal("strict")], {
					description: "auto (default): probe CDN URLs, degrade to warnings on failure; strict: refuse to write when a CDN URL fails; off: skip probing",
				}),
			),
		}),
		async execute(_toolCallId, params, signal, _onUpdate, ctx) {
			const warnings: string[] = [];
			const checks: string[] = [];

			// -- output name / workdir BEFORE any network I/O -------------------------
			const rawName = params.name.trim();
			if (!rawName || rawName === ".html" || !/^[A-Za-z0-9][A-Za-z0-9._-]*(\.html)?$/i.test(rawName)) {
				throw new Error(`Invalid output name '${rawName}' — use letters/digits/dot/dash/underscore, no path separators.`);
			}
			const fileName = /\.html$/i.test(rawName) ? rawName : `${rawName}.html`;
			const expandedWorkdir = params.workdir?.startsWith("~")
				? join(homedir(), params.workdir.slice(1).replace(/^[/\\]/, ""))
				: params.workdir;
			const workdir = expandedWorkdir ? resolve(ctx.cwd, expandedWorkdir) : ctx.cwd;

			// -- engine + template ---------------------------------------------------
			const engineId = params.engine;
			const engineDef = ENGINES[engineId];
			if (!engineDef) {
				throw new Error(`Unknown engine '${engineId}'. Valid engines: ${ENGINE_IDS.join(", ")}. Use list_chartz_engines.`);
			}
			const templatePath = join(TEMPLATES_DIR, engineDef.pattern);
			if (!existsSync(templatePath)) {
				throw new Error(`Template missing: ${templatePath} (CHARTZ_SKILL_DIR=${SKILL_DIR}).`);
			}
			const template = readFileSync(templatePath, "utf8");
			const cdnUrls = extractCdnUrls(template);

			// -- spec handling (accept object or strict-JSON string) ------------------
			let spec: unknown = params.spec;
			if (typeof spec === "string") {
				try {
					spec = JSON.parse(spec);
				} catch (e) {
					throw new Error(`spec was a string that failed strict-JSON parsing: ${e instanceof Error ? e.message : String(e)}. Send a JSON object per engines/${engineId}.md.`);
				}
				checks.push("spec: JSON string received and strict-parsed into an object (coercion recorded)");
			}
			if (spec === null || typeof spec !== "object" || Array.isArray(spec)) {
				throw new Error(`spec must be a JSON object (the template declares 'const SPEC = /*__SPEC__*/;'), got ${spec === null ? "null" : Array.isArray(spec) ? "array" : typeof spec}. Read engines/${engineId}.md first.`);
			}
			const specObj = spec as Record<string, unknown>;

			// -- per-engine shape validation (the real blank-page guard) --------------
			const missingKeys = engineDef.required.filter((k) => !hasPath(specObj, k));
			if (missingKeys.length > 0) {
				throw new Error(`spec is missing required key(s) for engine '${engineId}': ${missingKeys.join(", ")} — see engines/${engineId}.md. An empty/incomplete spec renders a blank page (chartz §6 5b-2).`);
			}
			checks.push(`shape: required keys present [${engineDef.required.join(", ")}]`);

			// -- title check (§6 check 6) ---------------------------------------------
			if (engineDef.titlePath) {
				if (hasPath(specObj, engineDef.titlePath)) {
					checks.push(`title: ${engineDef.titlePath} present (§6 check 6)`);
				} else if (engineDef.titleOptional) {
					warnings.push(`title '${engineDef.titlePath}' absent — optional for engine '${engineId}' per engines/${engineId}.md.`);
				} else {
					throw new Error(`spec title '${engineDef.titlePath}' missing — required by chartz §6 check 6 (see engines/${engineId}.md).`);
				}
			}

			// -- strict serialization --------------------------------------------------
			const bad: string[] = [];
			findUnserializable(specObj, "", bad);
			if (bad.length > 0) {
				throw new Error(`spec contains non-JSON values (JSON.stringify would silently drop/mangle them):\n${bad.join("\n")}`);
			}
			checks.push("serializable: no NaN/±Infinity/undefined/BigInt (§6 check 1)");

			const sentinels: string[] = [];
			findStringSentinels(specObj, "", sentinels);
			if (sentinels.length > 0) warnings.push(`string sentinels found (§6 check 5): ${sentinels.join(", ")} — if these are literal labels, ignore; otherwise they are leaked placeholders.`);

			// -- escape </script> breakouts (JSON.stringify does not escape '<') ------
			let specJson: string;
			try {
				specJson = JSON.stringify(specObj, null, 2).replace(/</g, "\\u003c");
			} catch (e) {
				throw new Error(`spec failed JSON serialization: ${e instanceof Error ? e.message : String(e)}`);
			}
			checks.push("escape: '<' serialized as \\u003c (</script> and <!-- breakouts neutralized; still valid JSON and JS)");

			// -- slot contract, asserted on the TEMPLATE pre-fill ---------------------
			const slotCount = template.split(SLOT_TOKEN).length - 1;
			if (slotCount !== 1) {
				throw new Error(`Template ${templatePath} carries ${slotCount} /*__SPEC__*/ slots (expected exactly 1) — template drifted from the chartz contract; fix the template, not the output.`);
			}
			checks.push(`slot: template carries exactly 1 /*__SPEC__*/ (pre-fill assertion; String.replace is single-pass so no post-fill rescan is needed)`);

			// -- render-call guard on the TEMPLATE (§6 5b-2, pre-fill) ----------------
			for (const rc of engineDef.renderChecks) {
				if (!rc.re.test(template)) {
					throw new Error(`Render-call guard failed: '${rc.label}' not found in TEMPLATE ${templatePath} (chartz §6 5b-2 — template drift; a render call without its engine produces a blank page).`);
				}
			}
			checks.push(`render call: ${engineDef.renderChecks.map((r) => r.label).join(" + ")} present (template pre-fill)`);

			// -- CDN probe (after all cheap validation) --------------------------------
			const mode = params.probeCdn ?? "auto";
			if (mode !== "off" && cdnUrls.length > 0) {
				if (signal?.aborted) warnings.push("tool call aborted — CDN probe skipped, file not written.");
				const results = await Promise.all(cdnUrls.map((u) => probeCdn(u, signal ?? undefined)));
				const failed = cdnUrls.filter((_, i) => !results[i].ok);
				for (let i = 0; i < cdnUrls.length; i++) {
					checks.push(`cdn: ${cdnUrls[i]} → ${results[i].text}`);
				}
				if (failed.length > 0 && !signal?.aborted) {
					if (mode === "strict") {
						throw new Error(`CDN probe failed (strict mode) for:\n${failed.join("\n")}\nRecover: retry with probeCdn="auto" to write anyway, or offer the lumen-generate_visual static-render fallback (chartz §6).`);
					}
					warnings.push(`CDN unreachable — file written; chart will render blank until the pinned script loads. URLs: ${failed.join(", ")}. Offer the lumen-generate_visual static-render fallback (chartz SKILL.md §6).`);
				}
			} else if (cdnUrls.length === 0) {
				checks.push("cdn: none — template-native engine, probe skipped");
			}

			// -- output ---------------------------------------------------------------
			const chartsDir = join(workdir, "charts");
			mkdirSync(chartsDir, { recursive: true });
			const outPath = join(chartsDir, fileName);
			const html = template.replace(SLOT_TOKEN, () => specJson);
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