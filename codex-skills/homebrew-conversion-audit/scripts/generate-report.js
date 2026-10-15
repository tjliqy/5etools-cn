function _getPatchedFields ({initialJson = null, finalJson = null} = {}) {
	if (!initialJson || !finalJson) return [];

	const keys = new Set([
		...Object.keys(initialJson),
		...Object.keys(finalJson),
	]);

	return [...keys]
		.filter(key => JSON.stringify(initialJson[key]) !== JSON.stringify(finalJson[key]))
		.sort();
}

export function generateReport (
	{
		input = {},
		entity = {},
		converter = {},
		validation = {},
		llm = null,
		finalJson = null,
	} = {},
) {
	const initialJson = converter.initialJson ?? entity.initialJson ?? null;
	const patchedFields = llm?.patchedFields?.length
		? [...llm.patchedFields]
		: _getPatchedFields({initialJson, finalJson});

	return {
		input: {
			source_file: input.source_file ?? null,
			format: input.format ?? null,
			extract_quality: input.meta?.extract_quality ?? null,
			block_count: input.meta?.block_count ?? null,
		},
		entity: {
			kind: entity.kind ?? converter.entityKind ?? validation.entityKind ?? null,
			title: entity.title ?? converter.entityTitle ?? null,
			mode: converter.mode ?? null,
			source: converter.source ?? null,
			page: converter.page ?? null,
			styleHint: converter.styleHint ?? null,
		},
		converter: {
			warningCount: converter.warnings?.length ?? 0,
			warnings: converter.warnings ?? [],
			hasInitialJson: !!initialJson,
			error: converter.error ?? null,
		},
		validation: {
			ok: !!validation.ok,
			needsLlm: !!validation.needsLlm,
			summary: validation.summary ?? {errorCount: 0, warnCount: 0, infoCount: 0},
			issues: validation.issues ?? [],
		},
		llm: {
			used: !!llm,
			confidence: llm?.confidence ?? null,
			patchedFields,
			manualReview: llm?.manualReview ?? llm?.manual_review ?? [],
		},
		output: {
			hasFinalJson: !!finalJson,
			name: finalJson?.name ?? initialJson?.name ?? null,
		},
	};
}

export function renderReportMarkdown (report) {
	const lines = [
		"# 转换报告",
		"",
		`输入：${report.input.source_file || "（行内输入）"}`,
		`格式：${report.input.format || "（未知）"}`,
		`条目类型：${report.entity.kind || "（未知）"}`,
		`条目标题：${report.entity.title || "（无标题）"}`,
		`转换模式：${report.entity.mode || "（未知）"}`,
		`验证通过：${report.validation.ok ? "是" : "否"}`,
		`使用 LLM 兜底：${report.llm.used ? "是" : "否"}`,
		"",
		"## 摘要",
		`- 错误：${report.validation.summary.errorCount}`,
		`- 警告：${report.validation.summary.warnCount}`,
		`- 信息：${report.validation.summary.infoCount}`,
		`- 转换器警告：${report.converter.warningCount}`,
	];

	if (report.converter.error?.message) {
		lines.push(`- 转换器崩溃：${report.converter.error.message}`);
	}

	if (report.validation.issues?.length) {
		lines.push("", "## 问题");
		report.validation.issues.forEach(issue => {
			const fieldPart = issue.field ? ` (${issue.field})` : "";
			const severity = {error: "错误", warn: "警告", info: "信息"}[issue.severity] || issue.severity;
			lines.push(`- [${severity}] ${issue.code}${fieldPart}: ${issue.message}`);
		});
	}

	if (report.llm.used) {
		lines.push("", "## LLM");
		lines.push(`- 置信度：${report.llm.confidence ?? "（未知）"}`);
		lines.push(`- 修补字段：${report.llm.patchedFields?.length ? report.llm.patchedFields.join(", ") : "（无记录）"}`);
	}

	if (report.llm.manualReview?.length) {
		lines.push("", "## 人工复核");
		report.llm.manualReview.forEach(note => lines.push(`- ${note}`));
	}

	return `${lines.join("\n")}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	throw new Error(`此脚本是库封装。请从其他脚本导入并调用 generateReport()。`);
}
