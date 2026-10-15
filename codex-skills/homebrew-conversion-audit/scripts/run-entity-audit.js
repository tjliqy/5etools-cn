import {runConverterCheck} from "./run-converter-check.js";
import {validateEntity} from "./validate-entity.js";
import {generateReport, renderReportMarkdown} from "./generate-report.js";
import {buildRepairPrompt} from "./build-repair-prompt.js";
import {normalizeLlmResult} from "./normalize-llm-result.js";
import {mergeLlmPatch} from "./merge-llm-patch.js";

export async function runEntityAudit (
	{
		entityKind,
		rawText,
		mode = "txt",
		source = "",
		page = 0,
		styleHint = "classic",
		input = null,
		entityTitle = null,
		converterRunner = null,
		llmResult = null,
		llmRawResult = null,
		finalJson = null,
	} = {},
) {
	const converter = await runConverterCheck({
		entityKind,
		rawText,
		mode,
		source,
		page,
		styleHint,
		inputMeta: input?.meta ?? null,
		entityTitle,
		converterRunner,
	});

	const validation = validateEntity({
		entityKind,
		json: converter.initialJson,
		warnings: converter.warnings,
		rawText,
		context: {
			source,
			page,
			styleHint,
			entityTitle,
		},
	});

	const repairPrompt = validation.needsLlm
		? buildRepairPrompt({
			entityKind,
			rawText,
			initialJson: converter.initialJson,
			warnings: converter.warnings,
			validation,
		})
		: null;

	const normalizedLlm = llmRawResult != null
		? normalizeLlmResult({rawResult: llmRawResult})
		: llmResult;

	const mergeMeta = normalizedLlm?.patch
		? mergeLlmPatch({
			initialJson: converter.initialJson,
			patch: normalizedLlm.patch,
		})
		: null;

	const effectiveFinalJson = finalJson ?? mergeMeta?.mergedJson ?? converter.initialJson;

	const finalValidation = mergeMeta
		? validateEntity({
			entityKind,
			json: effectiveFinalJson,
			warnings: converter.warnings,
			rawText,
			context: {
				source,
				page,
				styleHint,
				entityTitle,
				isPostRepair: true,
			},
		})
		: validation;

	const report = generateReport({
		input: input ?? {},
		entity: {
			kind: entityKind,
			title: entityTitle,
			initialJson: converter.initialJson,
		},
		converter,
		validation: finalValidation,
		llm: normalizedLlm
			? {
				...normalizedLlm,
				patchedFields: mergeMeta?.patchedFields ?? Object.keys(normalizedLlm.patch),
			}
			: null,
		finalJson: effectiveFinalJson,
	});

	return {
		converter,
		validation,
		repairPrompt,
		llm: normalizedLlm,
		merge: mergeMeta,
		finalValidation,
		finalJson: effectiveFinalJson,
		report,
		reportMarkdown: renderReportMarkdown(report),
	};
}

if (import.meta.url === `file://${process.argv[1]}`) {
	throw new Error(`此脚本是库封装。请从其他脚本导入并调用 runEntityAudit()。`);
}
