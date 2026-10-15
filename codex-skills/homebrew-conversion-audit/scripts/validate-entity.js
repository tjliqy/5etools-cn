const _HIGH_RISK_WARNING_PATTERNS = [
	/无法自动转换/u,
	/requires manual conversion/i,
	/内容因无法识别分类而丢弃/u,
	/请检查CR/u,
	/转换AC/u,
	/属性值格式错误/u,
];

const _MONSTER_SECTION_EXPECTATIONS = [
	{patterns: [/\bActions\b/i, /\bTraits\b/i, /动作/u, /特质/u], field: "actionOrTrait"},
	{patterns: [/\bLegendary Actions\b/i, /传奇动作/u], field: "legendary"},
];

const _SPELL_SECTION_EXPECTATIONS = [
	{patterns: [/\bAt Higher Levels\b/i, /升环施法/u, /升环施法效应/u], field: "entriesHigherLevel"},
	{patterns: [/\bComponents?\b/i, /法术成分/u, /成分/u], field: "components"},
];

export function validateEntity (
	{
		entityKind,
		json,
		warnings = [],
		rawText = "",
		context = {},
	},
) {
	const issues = [];

	if (!json || typeof json !== "object" || Array.isArray(json)) {
		issues.push(_issue({code: "INVALID_JSON", severity: "error", message: "条目结果缺失或不是对象"}));
		return _buildValidation({issues, context, entityKind});
	}

	if (!json.name) issues.push(_issue({code: "MISSING_NAME", severity: "error", field: "name", message: "条目缺少名称"}));

	for (const warning of warnings) {
		if (_HIGH_RISK_WARNING_PATTERNS.some(re => re.test(warning))) {
			issues.push(_issue({code: "HIGH_RISK_WARNING", severity: "error", message: warning}));
			continue;
		}

		issues.push(_issue({code: "WARNING", severity: "info", message: warning}));
	}

	if (entityKind === "monster") _validateMonster({json, rawText, issues});
	if (entityKind === "spell") _validateSpell({json, rawText, issues});
	if (entityKind === "item") _validateItem({json, rawText, issues});

	return _buildValidation({issues, context, entityKind});
}

function _validateMonster ({json, rawText, issues}) {
	["type", "ac", "hp", "speed", "cr"].forEach(field => {
		if (json[field] == null) issues.push(_issue({code: `MISSING_${field.toUpperCase()}`, severity: "error", field, message: `生物缺少 ${field}`}));
	});

	const abilityFields = ["str", "dex", "con", "int", "wis", "cha"];
	const presentAbilityCount = abilityFields.filter(field => json[field] != null).length;
	if (presentAbilityCount < 6) {
		const hasSpecialAbilities = abilityFields.some(field => json[field] && typeof json[field] === "object" && json[field].special);
		if (!hasSpecialAbilities) {
			issues.push(_issue({
				code: "INCOMPLETE_ABILITIES",
				severity: "error",
				message: `生物仅填写了 ${presentAbilityCount} 项属性值`,
			}));
		}
	}

	if (_hasExpectedSection({rawText, expectation: _MONSTER_SECTION_EXPECTATIONS[0]})) {
		if (!json.trait?.length && !json.action?.length) {
			issues.push(_issue({
				code: "MISSING_TRAIT_OR_ACTION_SECTION",
				severity: "error",
				message: "原文包含特质或动作章节，但解析结果中缺少这些章节",
			}));
		}
	}

	if (_hasExpectedSection({rawText, expectation: _MONSTER_SECTION_EXPECTATIONS[1]}) && !json.legendary?.length) {
		issues.push(_issue({
			code: "MISSING_LEGENDARY_SECTION",
			severity: "error",
			field: "legendary",
			message: "原文包含传奇动作，但解析结果中缺少传奇动作",
		}));
	}

	["trait", "action", "reaction", "bonus", "legendary", "mythic"]
		.forEach(section => {
			(json[section] || []).forEach((entry, ix) => {
				if (!entry?.entries?.length || entry.entries.every(it => typeof it === "string" && !it.trim())) {
					issues.push(_issue({
						code: "EMPTY_SECTION_ENTRY",
						severity: "error",
						field: `${section}[${ix}]`,
						message: `${section}[${ix}] 没有可用条目`,
					}));
				}
			});
		});

	if (!json.languages && /\bLanguages?\b/i.test(rawText)) {
		issues.push(_issue({
			code: "MISSING_LANGUAGES",
			severity: "warn",
			field: "languages",
			message: "原文包含语言信息，但结果中缺少语言",
		}));
	}

	if (json.senses && json.passive == null && /passive/i.test(rawText)) {
		issues.push(_issue({
			code: "MISSING_PASSIVE",
			severity: "warn",
			field: "passive",
			message: "原文可能包含被动察觉，但结果中缺少 passive",
		}));
	}
}

function _validateSpell ({json, rawText, issues}) {
	["level", "school", "time", "range", "duration", "entries"].forEach(field => {
		if (json[field] == null) issues.push(_issue({code: `MISSING_${field.toUpperCase()}`, severity: "error", field, message: `法术缺少 ${field}`}));
	});

	if (json.level != null && !Number.isInteger(json.level)) {
		issues.push(_issue({
			code: "INVALID_LEVEL",
			severity: "error",
			field: "level",
			message: "法术环阶应为整数",
		}));
	}

	if (json.entries && (!Array.isArray(json.entries) || !json.entries.length)) {
		issues.push(_issue({
			code: "EMPTY_ENTRIES",
			severity: "error",
			field: "entries",
			message: "法术条目必须包含可用内容",
		}));
	}

	if (_hasExpectedSection({rawText, expectation: _SPELL_SECTION_EXPECTATIONS[0]}) && !json.entriesHigherLevel?.length) {
		issues.push(_issue({
			code: "MISSING_HIGHER_LEVEL_SECTION",
			severity: "warn",
			field: "entriesHigherLevel",
			message: "原文包含升环施法内容，但结果中缺少该内容",
		}));
	}

	if (_hasExpectedSection({rawText, expectation: _SPELL_SECTION_EXPECTATIONS[1]}) && !json.components) {
		issues.push(_issue({
			code: "MISSING_COMPONENTS",
			severity: "warn",
			field: "components",
			message: "原文包含施法成分，但结果中缺少该字段",
		}));
	}
}

function _validateItem ({json, rawText, issues}) {
	if (!json.entries?.length) {
		issues.push(_issue({
			code: "MISSING_ENTRIES",
			severity: "error",
			field: "entries",
			message: "物品缺少条目内容",
		}));
	}

	const hasClassification = Boolean(
		json.type
		|| json.wondrous
		|| json.staff
		|| json.rarity
		|| json.__prop === "itemGroup",
	);

	if (!hasClassification) {
		issues.push(_issue({
			code: "MISSING_CLASSIFICATION",
			severity: "warn",
			message: "物品缺少明确的类别、稀有度或奇物分类",
		}));
	}

	if (/\b(?:requires attunement)\b/i.test(rawText) && json.reqAttune == null) {
		issues.push(_issue({
			code: "MISSING_ATTUNEMENT",
			severity: "warn",
			field: "reqAttune",
			message: "原文说明需要同调，但结果中缺少 reqAttune",
		}));
	}
}

function _hasExpectedSection ({rawText, expectation}) {
	return expectation.patterns.some(re => re.test(rawText));
}

function _issue ({code, severity, field = null, message}) {
	return {code, severity, field, message};
}

function _buildValidation ({issues, context = {}, entityKind = null}) {
	const hasError = issues.some(it => it.severity === "error");
	const warnCount = issues.filter(it => it.severity === "warn").length;
	const infoCount = issues.filter(it => it.severity === "info").length;
	const errorCount = issues.filter(it => it.severity === "error").length;
	const needsLlm = hasError || warnCount > 0;

	return {
		entityKind,
		context,
		ok: !hasError,
		needsLlm,
		summary: {
			errorCount,
			warnCount,
			infoCount,
		},
		issues,
	};
}

if (import.meta.url === `file://${process.argv[1]}`) {
	throw new Error(`此脚本是库封装。请从其他脚本导入并调用 validateEntity()。`);
}
