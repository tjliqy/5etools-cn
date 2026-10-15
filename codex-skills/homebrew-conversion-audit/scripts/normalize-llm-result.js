export function normalizeLlmResult (
	{
		rawResult,
	} = {},
) {
	if (rawResult == null) return null;

	const parsed = typeof rawResult === "string"
		? JSON.parse(rawResult)
		: rawResult;

	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error(`LLM 结果必须是对象，或包含对象的 JSON 字符串`);
	}

	const patch = parsed.patch ?? parsed.result ?? parsed.output ?? null;
	if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
		throw new Error(`LLM 结果必须包含对象“patch”`);
	}

	return {
		patch,
		confidence: parsed.confidence ?? null,
		manualReview: parsed.manualReview ?? parsed.manual_review ?? [],
		raw: parsed,
	};
}

if (import.meta.url === `file://${process.argv[1]}`) {
	throw new Error(`此脚本是库封装。请从其他脚本导入并调用 normalizeLlmResult()。`);
}
