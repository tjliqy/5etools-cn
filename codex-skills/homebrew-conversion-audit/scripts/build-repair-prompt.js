const _MONSTER_CONSTRAINTS = [
	"name, type, ac, hp, speed, and cr are core fields",
	"action- and trait-like sections must contain usable entries",
	"legendary content should not be dropped if present in the raw text",
	"preserve valid existing fields and return a patch instead of a full rewrite whenever possible",
];

const _SPELL_CONSTRAINTS = [
	"name, level, school, time, range, duration, and entries are core fields",
	"preserve higher-level text if present in the raw source",
	"components should be structured, not left as freeform text when clear",
	"preserve valid existing fields and return a patch instead of a full rewrite whenever possible",
];

const _ITEM_CONSTRAINTS = [
	"name and entries are core fields",
	"preserve item classification fields such as rarity, type, wondrous, staff, and reqAttune when supported by the source text",
	"do not invent mechanical bonuses or tags unsupported by the source text",
	"preserve valid existing fields and return a patch instead of a full rewrite whenever possible",
];

export function buildRepairPrompt (
	{
		entityKind,
		rawText,
		initialJson,
		warnings = [],
		validation = null,
	} = {},
) {
	_switchValidate({entityKind, rawText});

	switch (entityKind) {
		case "monster":
			return _buildMonsterRepairPrompt({rawText, initialJson, warnings, validation});

		case "spell":
			return _buildGenericRepairPrompt({
				entityKind: "spell",
				rawText,
				initialJson,
				warnings,
				validation,
				constraints: _SPELL_CONSTRAINTS,
				roleLabel: "spell",
				repairLabel: "5etools-style spell JSON object",
			});

		case "item":
			return _buildGenericRepairPrompt({
				entityKind: "item",
				rawText,
				initialJson,
				warnings,
				validation,
				constraints: _ITEM_CONSTRAINTS,
				roleLabel: "item",
				repairLabel: "5etools-style item JSON object",
			});

		default:
			throw new Error(`未实现此条目类型的修复提示构建器："${entityKind}"`);
	}
}

function _switchValidate ({entityKind, rawText}) {
	if (!entityKind) throw new Error(`缺少“entityKind”`);
	if (!rawText?.trim()) throw new Error(`缺少“rawText”`);
}

function _buildMonsterRepairPrompt ({rawText, initialJson, warnings, validation}) {
	return _buildGenericRepairPrompt({
		entityKind: "monster",
		rawText,
		initialJson,
		warnings,
		validation,
		constraints: _MONSTER_CONSTRAINTS,
		roleLabel: "monster",
		repairLabel: "5etools-style monster JSON object",
	});
}

function _buildGenericRepairPrompt ({entityKind, rawText, initialJson, warnings, validation, constraints, roleLabel, repairLabel}) {
	const issues = validation?.issues ?? [];
	const hasInitialJson = initialJson && typeof initialJson === "object" && !Array.isArray(initialJson);

	const prompt = [
		hasInitialJson
			? `You are repairing a partially converted ${repairLabel}.`
			: `You are reconstructing a failed ${roleLabel} conversion after the converter crashed.`,
		"",
		hasInitialJson
			? "Your job is to repair the existing result, not replace it unless repair is impossible."
			: "Your job is to produce a minimal valid patch-like object based on the raw text, since the converter did not produce usable JSON.",
		"",
		"Return JSON only with this shape:",
		"{",
		'  "patch": {...},',
		'  "manual_review": [...],',
		'  "confidence": 0.0',
		"}",
		"",
		"Rules:",
		"- Preserve valid existing fields.",
		"- Only patch fields supported by the source text.",
		"- Do not invent unsupported mechanics.",
		"- If uncertain, keep the field unchanged and mention the uncertainty in manual_review.",
		`- Keep the patch compatible with ${repairLabel}.`,
		"",
		"Raw text:",
		rawText,
		"",
		...(hasInitialJson
			? [
				"Initial JSON:",
				JSON.stringify(initialJson, null, 2),
				"",
			]
			: [
				"Initial JSON:",
				"(converter crashed before producing usable JSON)",
				"",
			]),
		"Warnings:",
		JSON.stringify(warnings, null, 2),
		"",
		"Checker issues:",
		JSON.stringify(issues, null, 2),
		"",
		"Expected constraints:",
		...constraints.map(it => `- ${it}`),
	].join("\n");

	return {
		entityKind,
		prompt,
		input: {
			rawText,
			initialJson: hasInitialJson ? initialJson : null,
			warnings,
			issues,
		},
	};
}

if (import.meta.url === `file://${process.argv[1]}`) {
	throw new Error(`此脚本是库封装。请从其他脚本导入并调用 buildRepairPrompt()。`);
}
