import fs from "node:fs/promises";
import path from "node:path";

import {extractInput} from "./extract-input.js";
import {buildAdventureFromBlocks} from "./build-adventure-from-blocks.js";
import {buildCollection} from "./build-collection.js";
import {splitEntities} from "./split-entities.js";
import {runEntityAudit} from "./run-entity-audit.js";

function _getArgValue (flag) {
	const ix = process.argv.indexOf(flag);
	if (!~ix) return null;
	return process.argv[ix + 1] ?? null;
}

function _getCsvArg (flag) {
	const raw = _getArgValue(flag);
	if (!raw) return [];
	return raw.split(",").map(it => it.trim()).filter(Boolean);
}

function _assertUserMetadata ({published, storyline, version}) {
	const missing = [
		!published ? "--published <YYYY-MM-DD>" : null,
		!storyline ? "--storyline <text>" : null,
		!version ? "--version <x.y.z>" : null,
	].filter(Boolean);

	if (!missing.length) return;

	throw new Error(`缺少用户提供的冒险元数据：${missing.join(", ")}。请先询问用户所需的值，再构建最终 JSON。`);
}

async function _mkdirpForFile (filePath) {
	if (!filePath) return;
	await fs.mkdir(path.dirname(filePath), {recursive: true});
}

function _finalizeEntityJson ({json, source}) {
	if (!json || typeof json !== "object" || Array.isArray(json)) return json;
	if (json.name && !json.source && source) return {...json, source};
	return json;
}

function _getEntityStatblockEntry ({entity, kind}) {
	const meta = {
		monster: {tag: "creature", style: "inset"},
		spell: {tag: "spell", style: "narrow"},
		item: {tag: "item", style: "inset"},
	}[kind] || {tag: kind};

	return {
		type: "statblock",
		name: entity.name,
		source: entity.source || "",
		...(entity.page != null ? {page: entity.page} : {}),
		...(meta.tag ? {tag: meta.tag} : {}),
		...(meta.style ? {style: meta.style} : {}),
	};
}

function _getRawFirstLine (rawText) {
	return `${rawText || ""}`
		.replace(/\r\n?/g, "\n")
		.split("\n")
		.map(it => it.trim())
		.find(Boolean) || "";
}

function _findEntityStartLine ({lines, entity}) {
	const rawFirstLine = _getRawFirstLine(entity.raw_text);
	if (!rawFirstLine) return -1;

	const exactIx = lines.findIndex(line => line === rawFirstLine);
	if (~exactIx) return exactIx;

	const compactRaw = rawFirstLine.replace(/\s+/g, " ").trim();
	return lines.findIndex(line => line.replace(/\s+/g, " ").trim() === compactRaw);
}

function _buildReplacementBlocksForEntityBlock ({block, entities}) {
	const sorted = [...entities]
		.map(entity => ({
			...entity,
			_startLine: block?.type === "paragraph"
				? _findEntityStartLine({
					lines: (block.text || "").replace(/\r\n?/g, "\n").split("\n").map(it => it.trim()).filter(Boolean),
					entity,
				})
				: -1,
		}))
		.sort((a, b) => {
			if (~a._startLine && ~b._startLine) return a._startLine - b._startLine;
			return (a.title || "").localeCompare(b.title || "");
		});

	const out = [];

	if (block?.type === "paragraph") {
		const lines = (block.text || "").replace(/\r\n?/g, "\n").split("\n").map(it => it.trim()).filter(Boolean);
		const firstEntityLine = sorted.map(it => it._startLine).filter(ix => ix >= 0).sort((a, b) => a - b)[0];
		if (firstEntityLine > 0) {
			out.push({
				type: "paragraph",
				text: lines.slice(0, firstEntityLine).join("\n"),
			});
		}
	}

	for (const entity of sorted) {
		out.push({
			type: "entry",
			entry: _getEntityStatblockEntry({
				entity: entity.finalJson,
				kind: entity.kind,
			}),
		});
	}

	return out;
}

function _buildAdventureBlocksWithEntityRefs ({blocks, convertedEntities}) {
	const byStartBlock = new Map();
	for (const entity of convertedEntities) {
		const startBlockIndex = entity.startBlockIndex;
		if (startBlockIndex == null) continue;
		if (!byStartBlock.has(startBlockIndex)) byStartBlock.set(startBlockIndex, []);
		byStartBlock.get(startBlockIndex).push(entity);
	}

	const skippedBlockIndexes = new Set();
	for (const entity of convertedEntities) {
		if (entity.startBlockIndex == null || entity.endBlockIndex == null) continue;
		for (let i = entity.startBlockIndex + 1; i <= entity.endBlockIndex; i++) skippedBlockIndexes.add(i);
	}

	const out = [];
	for (let i = 0; i < blocks.length; i++) {
		if (skippedBlockIndexes.has(i)) continue;

		const replacementEntities = byStartBlock.get(i);
		if (!replacementEntities?.length) {
			out.push(blocks[i]);
			continue;
		}

		out.push(..._buildReplacementBlocksForEntityBlock({
			block: blocks[i],
			entities: replacementEntities,
		}));
	}

	return out;
}

async function _convertEmbeddedEntities ({entities, source, page, mode, styleHint, input}) {
	const converted = [];
	const auditSummary = [];

	for (const entity of entities) {
		const audit = await runEntityAudit({
			entityKind: entity.kind,
			rawText: entity.raw_text,
			mode,
			source,
			page,
			styleHint,
			input,
			entityTitle: entity.title,
		});

		const accepted = !!audit.finalValidation.ok && !!audit.finalJson;
		if (!accepted) {
			auditSummary.push({
				kind: entity.kind,
				title: entity.title,
				status: "needs_repair",
				ok: false,
				startBlockIndex: entity.startBlockIndex ?? null,
				endBlockIndex: entity.endBlockIndex ?? null,
				report: audit.report,
			});
			throw new Error(`必需的嵌入条目 ${entity.kind}“${entity.title}”未转换，因此未构建冒险合集。`);
		}

		const finalJson = _finalizeEntityJson({
			json: audit.finalJson,
			source,
		});

		converted.push({
			...entity,
			finalJson,
		});

		auditSummary.push({
			kind: entity.kind,
			title: entity.title,
			status: "converted",
			ok: true,
			startBlockIndex: entity.startBlockIndex ?? null,
			endBlockIndex: entity.endBlockIndex ?? null,
			name: finalJson.name ?? null,
		});
	}

	return {
		converted,
		auditSummary,
	};
}

async function _main () {
	const inputPath = _getArgValue("--input");
	if (!inputPath) throw new Error(`缺少 --input <路径>`);

	const outputPath = _getArgValue("--output");
	if (!outputPath) throw new Error(`缺少 --output <路径>`);

	const formatHint = _getArgValue("--format");
	const source = _getArgValue("--source");
	if (!source) throw new Error(`缺少 --source <JSON/来源 ID>`);

	const name = _getArgValue("--name");
	const engName = _getArgValue("--eng-name") || "";
	const id = _getArgValue("--id");
	const group = _getArgValue("--group") || "other";
	const translator = _getArgValue("--translator");
	const published = _getArgValue("--published");
	const storyline = _getArgValue("--storyline");
	const edition = _getArgValue("--edition") || "one";
	const version = _getArgValue("--version");
	const mode = _getArgValue("--mode") || "txt";
	const styleHint = _getArgValue("--style") || "classic";
	const pageRaw = _getArgValue("--page");
	const page = pageRaw ? Number(pageRaw) : 0;
	const reportJsonPath = _getArgValue("--audit-summary");

	_assertUserMetadata({published, storyline, version});

	const sourceInfo = {
		source,
		json: source,
		abbreviation: _getArgValue("--abbreviation") || source,
		full: _getArgValue("--full") || name || source,
		authors: _getCsvArg("--authors"),
		convertedBy: _getCsvArg("--converted-by"),
		url: _getArgValue("--url"),
		version,
		translator,
		color: _getArgValue("--color"),
		partnered: _getArgValue("--partnered") === "true",
		dateReleased: _getArgValue("--date-released"),
	};

	const input = await extractInput({inputPath, formatHint});
	const embeddedEntities = splitEntities({
		document: input,
		defaultKind: "adventureDocument",
		includePrimaryDocument: false,
	}).filter(entity => ["monster", "spell", "item"].includes(entity.kind));

	const {converted, auditSummary} = await _convertEmbeddedEntities({
		entities: embeddedEntities,
		source,
		page,
		mode,
		styleHint,
		input,
	});

	const adventureBlocks = converted.length
		? _buildAdventureBlocksWithEntityRefs({
			blocks: input.blocks,
			convertedEntities: converted,
		})
		: input.blocks;

	const {adventure, adventureData} = buildAdventureFromBlocks({
		blocks: adventureBlocks,
		source,
		id,
		name,
		group,
		translator,
		published,
		storyline,
		edition,
		engName,
	});

	const collection = buildCollection({
		sourceInfo,
		edition,
		entities: [
			{
				kind: "adventureBundle",
				adventure,
				adventureData,
			},
			...converted.map(entity => ({
				kind: entity.kind,
				json: entity.finalJson,
			})),
		],
	});

	await _mkdirpForFile(outputPath);
	await fs.writeFile(outputPath, `${JSON.stringify(collection, null, "\t")}\n`, "utf8");

	if (reportJsonPath) {
		await _mkdirpForFile(reportJsonPath);
		await fs.writeFile(reportJsonPath, `${JSON.stringify(auditSummary, null, "\t")}\n`, "utf8");
	}

	process.stdout.write(`${JSON.stringify({
		outputPath,
		source,
		adventureName: adventure.name,
		sectionCount: adventure.contents.length,
		topLevelKeys: Object.keys(collection),
		counts: Object.fromEntries(Object.entries(collection).filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, value.length])),
		embeddedEntityCount: converted.length,
		auditSummary,
	}, null, "\t")}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await _main();
}
