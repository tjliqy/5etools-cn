import fs from "node:fs/promises";

import {extractInput} from "./extract-input.js";
import {prepareEntityBundle} from "./prepare-entity-bundle.js";
import {splitEntities} from "./split-entities.js";
import {runEntityAudit} from "./run-entity-audit.js";

function _getArgValue (flag) {
	const ix = process.argv.indexOf(flag);
	if (!~ix) return null;
	return process.argv[ix + 1] ?? null;
}

async function _readJsonFile (path) {
	if (!path) return null;
	return JSON.parse(await fs.readFile(path, "utf8"));
}

function _hasFlag (flag) {
	return process.argv.includes(flag);
}

function _pickEntity ({entities, entityIndexRaw, entityRole, entityKind}) {
	if (!entities.length) return null;

	if (entityIndexRaw != null) {
		const entity = entities[Number(entityIndexRaw)];
		if (!entity) throw new Error(`索引处没有条目：${entityIndexRaw}`);
		return entity;
	}

	if (entityRole || entityKind) {
		const entity = entities.find(it =>
			(entityRole ? it.role === entityRole : true)
			&& (entityKind ? it.kind === entityKind : true),
		);

		if (entity) return entity;
	}

	return entities[0];
}

async function _main () {
	const inputPath = _getArgValue("--input");
	if (!inputPath) throw new Error(`缺少 --input <路径>`);

	const formatHint = _getArgValue("--format");
	const defaultKind = _getArgValue("--kind") || "monster";
	const source = _getArgValue("--source") || "";
	const pageRaw = _getArgValue("--page");
	const page = pageRaw ? Number(pageRaw) : 0;
	const mode = _getArgValue("--mode") || "txt";
	const styleHint = _getArgValue("--style") || "classic";
	const outputPath = _getArgValue("--output");
	const reportPath = _getArgValue("--report");
	const repairPromptPath = _getArgValue("--repair-prompt");
	const entityBundlePath = _getArgValue("--entity-bundle");
	const entityPlanPath = _getArgValue("--entity-plan");
	const entityIndexRaw = _getArgValue("--entity-index");
	const entityRole = _getArgValue("--entity-role");
	const entityKindFilter = _getArgValue("--entity-kind");
	const isBundleOnly = _hasFlag("--bundle-only");

	const input = await extractInput({inputPath, formatHint});
	const entityBundle = prepareEntityBundle({
		document: input,
		defaultDocumentKind: defaultKind,
	});

	if (entityBundlePath) {
		await fs.writeFile(entityBundlePath, `${JSON.stringify(entityBundle, null, "\t")}\n`, "utf8");
	}

	if (isBundleOnly) {
		process.stdout.write(`${JSON.stringify({
			entityBundleReady: !!entityBundlePath,
			bundleOnly: true,
			blockCount: entityBundle.blockCount,
			headingCount: entityBundle.headingIndex.length,
			defaultDocumentKind: entityBundle.defaultDocumentKind,
		}, null, "\t")}\n`);
		return;
	}

	const entityPlan = await _readJsonFile(entityPlanPath);
	const entities = splitEntities({
		document: input,
		defaultKind,
		entityPlan,
	});
	if (!entities.length) throw new Error(`未从输入中提取到条目`);

	const entity = _pickEntity({
		entities,
		entityIndexRaw,
		entityRole,
		entityKind: entityKindFilter,
	});
	if (!entity) throw new Error(`未找到匹配的条目`);

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

	if (outputPath) {
		await fs.writeFile(outputPath, `${JSON.stringify(audit.finalJson, null, "\t")}\n`, "utf8");
	}

	if (reportPath) {
		await fs.writeFile(reportPath, audit.reportMarkdown, "utf8");
	}

	if (repairPromptPath && audit.repairPrompt?.prompt) {
		await fs.writeFile(repairPromptPath, `${audit.repairPrompt.prompt}\n`, "utf8");
	}

	process.stdout.write(`${JSON.stringify({
		ok: audit.finalValidation.ok,
		needsLlm: audit.validation.needsLlm,
		repairPromptReady: !!audit.repairPrompt?.prompt,
		entityBundleReady: !!entityBundlePath,
		entityCount: entities.length,
		selectedEntity: {
			kind: entity.kind,
			role: entity.role,
			title: entity.title,
			startBlockIndex: entity.startBlockIndex ?? null,
			endBlockIndex: entity.endBlockIndex ?? null,
		},
		availableEntities: entities.map((it, ix) => ({
			index: ix,
			kind: it.kind,
			role: it.role,
			title: it.title,
			startBlockIndex: it.startBlockIndex ?? null,
			endBlockIndex: it.endBlockIndex ?? null,
		})),
		report: audit.report,
	}, null, "\t")}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await _main();
}
