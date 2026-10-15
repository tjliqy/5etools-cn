import fs from "node:fs/promises";
import path from "node:path";

import {extractInput} from "./extract-input.js";
import {splitEntities} from "./split-entities.js";
import {buildAdventureFromBlocks} from "./build-adventure-from-blocks.js";
import {buildCollection} from "./build-collection.js";
import {runEntityAudit} from "./run-entity-audit.js";
import {normalizeLlmResult} from "./normalize-llm-result.js";
import {validateEntity} from "./validate-entity.js";

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

function _assertUserAdventureMetadata ({entities, published, storyline, version}) {
	const hasAdventure = (entities || []).some(entity => entity.kind === "adventureDocument" || entity.kind === "adventure");
	if (!hasAdventure) return;

	const missing = [
		!published ? "--published <YYYY-MM-DD>" : null,
		!storyline ? "--storyline <text>" : null,
		!version ? "--version <x.y.z>" : null,
	].filter(Boolean);

	if (!missing.length) return;

	throw new Error(`缺少用户提供的冒险元数据：${missing.join(", ")}。请先询问用户所需的值，再构建最终 JSON。`);
}

async function _readJsonFile (filePath) {
	return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function _readJsonFileIfExists (filePath) {
	try {
		return await _readJsonFile(filePath);
	} catch (e) {
		if (e?.code === "ENOENT") return null;
		throw e;
	}
}

async function _mkdirpForFile (filePath) {
	if (!filePath) return;
	await fs.mkdir(path.dirname(filePath), {recursive: true});
}

function _toSourceInfo ({source, name, translator}) {
	return {
		source,
		json: source,
		abbreviation: _getArgValue("--abbreviation") || source,
		full: _getArgValue("--full") || name || source,
		authors: _getCsvArg("--authors"),
		convertedBy: _getCsvArg("--converted-by"),
		url: _getArgValue("--url"),
		version: _getArgValue("--version"),
		translator,
		color: _getArgValue("--color"),
		partnered: _getArgValue("--partnered") === "true",
		dateReleased: _getArgValue("--date-released"),
	};
}

function _sanitizeFilePart (text) {
	return `${text || "entity"}`
		.replace(/[^\p{L}\p{N}._-]+/gu, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 80) || "entity";
}

const _REFERENCE_CONFIG = {
	monster: {
		inlineTag: "creature",
		statblock: {tag: "creature", style: "inset"},
		fnIsLikelyEmbeddedSection: ({section, entity}) => {
			if (!section || section.type !== "section" || section.name !== entity.name) return false;
			if (!section.entries?.length) return false;

			const joined = JSON.stringify(section.entries);
			return /护甲等级|生命值|挑战等级|动作|传奇动作/u.test(joined);
		},
	},
	spell: {
		inlineTag: "spell",
		statblock: {tag: "spell", style: "narrow"},
		fnIsLikelyEmbeddedSection: ({section, entity}) => {
			if (!section || section.type !== "section" || section.name !== entity.name) return false;
			if (!section.entries?.length) return false;

			const joined = JSON.stringify(section.entries);
			return /\bRange\b|\bComponents?\b|\bDuration\b|\bClasses?\b|施法范围|法术成分|持续时间|职业/u.test(joined);
		},
	},
	item: {
		inlineTag: "item",
		statblock: {tag: "item", style: "inset"},
		fnIsLikelyEmbeddedSection: ({section, entity}) => {
			if (!section || section.type !== "section" || section.name !== entity.name) return false;
			if (!section.entries?.length) return false;

			const joined = JSON.stringify(section.entries);
			return /\bcommon\b|\buncommon\b|\brare\b|\blegendary\b|\bartifact\b|\brequires attunement\b|奇物|法杖|药水|卷轴|需要?同调|稀有度/u.test(joined);
		},
	},
	feat: {
		inlineTag: "feat",
		statblock: {tag: "feat", style: "narrow"},
		fnIsLikelyEmbeddedSection: ({section, entity}) => _isLikelyNamedReferenceSection({
			section,
			entity,
			reKeywords: /\bprerequisite\b|\bbenefit\b|先决条件|前提|获益|你获得/u,
		}),
	},
	background: {
		inlineTag: "background",
		statblock: {tag: "background", style: "inset"},
		fnIsLikelyEmbeddedSection: ({section, entity}) => _isLikelyNamedReferenceSection({
			section,
			entity,
			reKeywords: /\bskill proficiencies\b|\bequipment\b|\bfeature\b|技能熟练项|装备|特性/u,
		}),
	},
	language: {
		inlineTag: "language",
		statblock: {tag: "language"},
		fnIsLikelyEmbeddedSection: ({section, entity}) => _isLikelyNamedReferenceSection({
			section,
			entity,
			reKeywords: /\bscript\b|\bspeakers?\b|\bdialect\b|文字|书写|使用者|方言/u,
		}),
	},
	reward: {
		inlineTag: "reward",
		statblock: {tag: "reward"},
		fnIsLikelyEmbeddedSection: ({section, entity}) => _isLikelyNamedReferenceSection({
			section,
			entity,
			reKeywords: /\bblessing\b|\bcharm\b|\bboon\b|\bcurse\b|赐福|恩赐|诅咒/u,
		}),
	},
	race: {
		inlineTag: "race",
		statblock: {tag: "race", style: "inset"},
		fnIsLikelyEmbeddedSection: ({section, entity}) => _isLikelyNamedReferenceSection({
			section,
			entity,
			reKeywords: /\bsize\b|\bspeed\b|\bcreature type\b|体型|速度|生物类别/u,
		}),
	},
	deity: {
		inlineTag: "deity",
		statblock: {tag: "deity"},
		fnIsLikelyEmbeddedSection: ({section, entity}) => _isLikelyNamedReferenceSection({
			section,
			entity,
			reKeywords: /\bpantheon\b|\balignment\b|\bprovince\b|神系|阵营|神职/u,
		}),
	},
	subclass: {
		inlineTag: "subclass",
		statblock: {prop: "subclass", collapsed: true},
		fnIsLikelyEmbeddedSection: ({section, entity}) => _isLikelyNamedReferenceSection({
			section,
			entity,
			reKeywords: /\bexpanded spell list\b|\bsubclass\b|\blevel\b|扩展法术列表|子职业|等级/u,
		}),
	},
};

const _REQUIRED_CONVERTED_KINDS = new Set(["monster", "spell", "item"]);

function _finalizeEntityJson ({entityKind, json, source}) {
	if (!json || typeof json !== "object" || Array.isArray(json)) return json;

	if (json.name && !json.source && source) {
		return {
			...json,
			source,
		};
	}

	return json;
}

function _getReferenceConfig (kind) {
	return _REFERENCE_CONFIG[kind]
		|| {
			inlineTag: kind,
			statblock: {tag: kind},
		};
}

function _getEntityInlineTag ({entity, kind, config}) {
	const tag = config?.inlineTag || _getReferenceConfig(kind).inlineTag;
	return `{@${tag} ${entity.name}|${entity.source || ""}}`;
}

function _getEntityStatblockEntry ({entity, kind, config}) {
	const meta = config || _getReferenceConfig(kind);
	const statblockMeta = meta.statblock || {};
	return {
		ENG_name: entity.ENG_name || "",
		name: entity.name,
		type: "statblock",
		source: entity.source || "",
		...(entity.page != null ? {page: entity.page} : {}),
		...(statblockMeta.tag ? {tag: statblockMeta.tag} : {}),
		...(statblockMeta.prop ? {prop: statblockMeta.prop} : {}),
		...(statblockMeta.style ? {style: statblockMeta.style} : {}),
		...(statblockMeta.collapsed != null ? {collapsed: statblockMeta.collapsed} : {}),
		...(entity.shortName ? {shortName: entity.shortName} : {}),
		...(entity.displayName ? {displayName: entity.displayName} : {}),
		...(entity.className ? {className: entity.className} : {}),
		...(entity.classSource ? {classSource: entity.classSource} : {}),
		...(entity.pantheon ? {pantheon: entity.pantheon} : {}),
	};
}

function _escapeRegex (text) {
	return `${text || ""}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function _isLikelyNamedReferenceSection ({section, entity, reKeywords = null}) {
	if (!section || section.type !== "section" || section.name !== entity.name) return false;
	if (!section.entries?.length) return false;

	const nestedSectionCount = section.entries.filter(it => it?.type === "section").length;
	if (nestedSectionCount > 0) return false;

	const joined = JSON.stringify(section.entries);
	if (reKeywords?.test(joined)) return true;

	return joined.length <= 4000;
}

function _linkifyPlainEntityMentions ({text, entities, kind, config}) {
	let out = `${text || ""}`;
	const meta = config || _getReferenceConfig(kind);
	const inlineTagName = meta.inlineTag;

	for (const entity of entities) {
		if (!entity?.name) continue;

		const inlineTag = _getEntityInlineTag({entity, kind, config: meta});
		const re = new RegExp(_escapeRegex(entity.name), "gu");
		out = out.replace(re, (match, offset, full) => {
			const pre = full.slice(Math.max(0, offset - 12), offset);
			const post = full.slice(offset + match.length, offset + match.length + 2);
			if (pre.includes(`{@${inlineTagName}`)) return match;
			if (post.startsWith("|")) return match;
			return inlineTag;
		});
	}

	return out;
}

function _linkifyAllEntityMentions ({text, referenceGroups}) {
	let out = `${text || ""}`;

	for (const group of referenceGroups) {
		out = _linkifyPlainEntityMentions({
			text: out,
			entities: group.entities,
			kind: group.kind,
			config: group.config,
		});
	}

	return out;
}

function _tryFoldSectionToStatblock ({section, referenceGroups}) {
	for (const group of referenceGroups) {
		if (!group.config?.fnIsLikelyEmbeddedSection) continue;

		for (const entity of group.entities) {
			if (!group.config.fnIsLikelyEmbeddedSection({section, entity})) continue;

			return {
				...section,
				entries: [_getEntityStatblockEntry({entity, kind: group.kind, config: group.config})],
			};
		}
	}

	return null;
}

function _postProcessAdventureDataSection ({section, referenceGroups}) {
	if (!section || typeof section !== "object") return section;

	const folded = _tryFoldSectionToStatblock({section, referenceGroups});
	if (folded) return folded;

	return {
		...section,
		entries: (section.entries || []).map(entry => {
			if (typeof entry === "string") return _linkifyAllEntityMentions({text: entry, referenceGroups});
			if (Array.isArray(entry)) return entry;
			if (entry?.type === "section") return _postProcessAdventureDataSection({section: entry, referenceGroups});
			if (entry?.type === "list") {
				return {
					...entry,
					items: (entry.items || []).map(it => typeof it === "string" ? _linkifyAllEntityMentions({text: it, referenceGroups}) : it),
				};
			}
			return {
				...entry,
				...(typeof entry?.entry === "string"
					? {entry: _linkifyAllEntityMentions({text: entry.entry, referenceGroups})}
					: {}),
				...(Array.isArray(entry?.entries)
					? {
						entries: entry.entries.map(it => typeof it === "string"
							? _linkifyAllEntityMentions({text: it, referenceGroups})
							: it),
					}
					: {}),
				...(Array.isArray(entry?.items)
					? {
						items: entry.items.map(it => typeof it === "string"
							? _linkifyAllEntityMentions({text: it, referenceGroups})
							: it),
					}
					: {}),
			};
		}),
	};
}

function _getReferenceGroups ({collection}) {
	const excluded = new Set(["_meta", "adventure", "adventureData"]);
	const kinds = new Set([
		...Object.keys(_REFERENCE_CONFIG),
		...Object.keys(collection || {}).filter(key => !excluded.has(key)),
	]);

	return [...kinds]
		.map(kind => ({
			kind,
			config: _getReferenceConfig(kind),
			entities: (collection[kind] || []).filter(it => it && typeof it === "object" && !Array.isArray(it) && it.name),
		}))
		.filter(group => group.entities.length);
}

function _postProcessCollectionLinks ({collection}) {
	const referenceGroups = _getReferenceGroups({collection});
	if (!referenceGroups.length || !collection.adventureData?.length) return collection;

	return {
		...collection,
		adventureData: collection.adventureData.map(adventureData => ({
			...adventureData,
			data: (adventureData.data || []).map(section => _postProcessAdventureDataSection({section, referenceGroups})),
		})),
	};
}

async function _writeEntityArtifacts ({audit, entity, repairDir, reportDir}) {
	const written = {};

	if (repairDir && audit.repairPrompt?.prompt) {
		const repairPath = path.join(repairDir, `${_sanitizeFilePart(entity.title)}.${entity.kind}.repair.txt`);
		await fs.mkdir(repairDir, {recursive: true});
		await fs.writeFile(repairPath, `${audit.repairPrompt.prompt}\n`, "utf8");
		written.repairPromptPath = repairPath;
	}

	if (reportDir) {
		const reportPath = path.join(reportDir, `${_sanitizeFilePart(entity.title)}.${entity.kind}.report.md`);
		await fs.mkdir(reportDir, {recursive: true});
		await fs.writeFile(reportPath, audit.reportMarkdown, "utf8");
		written.reportPath = reportPath;
	}

	return written;
}

function _getEntityResultPath ({entity, llmResultDir, repairDir}) {
	const baseDir = llmResultDir || repairDir;
	if (!baseDir) return null;
	return path.join(baseDir, `${_sanitizeFilePart(entity.title)}.${entity.kind}.result.json`);
}

async function _tryLoadValidatedLlmResult (
	{
		entity,
		rawText,
		llmResultDir,
		repairDir,
	} = {},
) {
	const llmResultPath = _getEntityResultPath({entity, llmResultDir, repairDir});
	if (!llmResultPath) return null;

	const raw = await _readJsonFileIfExists(llmResultPath);
	if (!raw) return null;

	const normalized = normalizeLlmResult({rawResult: raw});
	const validation = validateEntity({
		entityKind: entity.kind,
		json: normalized.patch,
		rawText,
		warnings: [],
		context: {
			entityTitle: entity.title,
			isPostRepair: true,
		},
	});

	return {
		llmResultPath,
		normalized,
		validation,
	};
}

async function _main () {
	const inputPath = _getArgValue("--input");
	if (!inputPath) throw new Error(`缺少 --input <路径>`);

	const entityPlanPath = _getArgValue("--entity-plan");
	if (!entityPlanPath) throw new Error(`缺少 --entity-plan <路径>`);

	const outputPath = _getArgValue("--output");
	if (!outputPath) throw new Error(`缺少 --output <路径>`);

	const formatHint = _getArgValue("--format");
	const defaultKind = _getArgValue("--kind") || "adventureDocument";
	const source = _getArgValue("--source");
	if (!source) throw new Error(`缺少 --source <JSON/来源 ID>`);

	const pageRaw = _getArgValue("--page");
	const page = pageRaw ? Number(pageRaw) : 0;
	const mode = _getArgValue("--mode") || "txt";
	const styleHint = _getArgValue("--style") || "classic";
	const name = _getArgValue("--name");
	const engName = _getArgValue("--eng-name") || "";
	const id = _getArgValue("--id");
	const group = _getArgValue("--group") || "other";
	const translator = _getArgValue("--translator");
	const published = _getArgValue("--published");
	const storyline = _getArgValue("--storyline");
	const edition = _getArgValue("--edition") || "one";
	const version = _getArgValue("--version");
	const reportJsonPath = _getArgValue("--audit-summary");
	const repairDir = _getArgValue("--repair-dir");
	const reportDir = _getArgValue("--report-dir");
	const llmResultDir = _getArgValue("--llm-result-dir");

	const input = await extractInput({inputPath, formatHint});
	const entityPlan = await _readJsonFile(entityPlanPath);
	const entities = splitEntities({
		document: input,
		defaultKind,
		entityPlan,
	});
	_assertUserAdventureMetadata({entities, published, storyline, version});

	const collectionEntities = [];
	const auditSummary = [];

	for (const entity of entities) {
		if (entity.kind === "adventureDocument" || entity.kind === "adventure") {
			const {adventure, adventureData} = buildAdventureFromBlocks({
				blocks: entity.blocks,
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

			collectionEntities.push({
				kind: "adventureBundle",
				adventure,
				adventureData,
			});

			auditSummary.push({
				kind: entity.kind,
				role: entity.role,
				title: entity.title,
				status: "assembled",
				startBlockIndex: entity.startBlockIndex ?? null,
				endBlockIndex: entity.endBlockIndex ?? null,
			});
			continue;
		}

		if (["monster", "spell", "item"].includes(entity.kind)) {
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

			const written = await _writeEntityArtifacts({audit, entity, repairDir, reportDir});
			let accepted = !!audit.finalValidation.ok && !!audit.finalJson;
			let finalJson = audit.finalJson;
			let finalReport = audit.report;
			let status = accepted ? "converted" : "needs_repair";
			let llmResultMeta = null;

			if (!accepted) {
				llmResultMeta = await _tryLoadValidatedLlmResult({
					entity,
					rawText: entity.raw_text,
					llmResultDir,
					repairDir,
				});

				if (llmResultMeta?.validation.ok) {
					accepted = true;
					finalJson = _finalizeEntityJson({
						entityKind: entity.kind,
						json: llmResultMeta.normalized.patch,
						source,
					});
					status = "converted_via_llm";
					finalReport = {
						...audit.report,
						llm: {
							used: true,
							confidence: llmResultMeta.normalized.confidence ?? null,
							patchedFields: Object.keys(llmResultMeta.normalized.patch),
							manualReview: llmResultMeta.normalized.manualReview ?? [],
						},
						output: {
							hasFinalJson: true,
							name: llmResultMeta.normalized.patch.name ?? null,
						},
					};
				}
			}

			if (accepted) {
				finalJson = _finalizeEntityJson({
					entityKind: entity.kind,
					json: finalJson,
					source,
				});
			}

			if (accepted) {
				collectionEntities.push({
					kind: entity.kind,
					json: finalJson,
				});
			}

			auditSummary.push({
				kind: entity.kind,
				role: entity.role,
				title: entity.title,
				status,
				startBlockIndex: entity.startBlockIndex ?? null,
				endBlockIndex: entity.endBlockIndex ?? null,
				ok: accepted,
				needsLlm: !accepted && audit.validation.needsLlm,
				report: finalReport,
				...(llmResultMeta?.llmResultPath ? {llmResultPath: llmResultMeta.llmResultPath} : {}),
				...written,
			});

			if (!accepted && _REQUIRED_CONVERTED_KINDS.has(entity.kind)) {
				throw new Error(`必需的嵌入条目 ${entity.kind}“${entity.title}”未转换。请修复后使用 --llm-result-dir 或 --repair-dir 重新运行，再构建最终合集。`);
			}
			continue;
		}

		auditSummary.push({
			kind: entity.kind,
			role: entity.role,
			title: entity.title,
			status: "skipped",
			reason: "尚未实现此条目类型的处理器",
			startBlockIndex: entity.startBlockIndex ?? null,
			endBlockIndex: entity.endBlockIndex ?? null,
		});
	}

	const collection = buildCollection({
		sourceInfo: _toSourceInfo({source, name, translator}),
		edition,
		entities: collectionEntities,
	});
	const finalCollection = _postProcessCollectionLinks({collection});

	await _mkdirpForFile(outputPath);
	await fs.writeFile(outputPath, `${JSON.stringify(finalCollection, null, "\t")}\n`, "utf8");

	if (reportJsonPath) {
		await _mkdirpForFile(reportJsonPath);
		await fs.writeFile(reportJsonPath, `${JSON.stringify(auditSummary, null, "\t")}\n`, "utf8");
	}

	process.stdout.write(`${JSON.stringify({
		outputPath,
		topLevelKeys: Object.keys(finalCollection),
		counts: Object.fromEntries(Object.entries(finalCollection).filter(([k, v]) => Array.isArray(v)).map(([k, v]) => [k, v.length])),
		entityCount: entities.length,
		auditSummary,
	}, null, "\t")}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await _main();
}
