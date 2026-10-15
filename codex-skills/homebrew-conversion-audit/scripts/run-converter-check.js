import {runCreatureConverter} from "./run-converter-creature-node.js";
import {runSpellConverter} from "./run-converter-spell-node.js";
import {runItemConverter} from "./run-converter-item-node.js";
import {tryParseChineseItem, tryParseChineseMonster} from "./run-converter-cn-node.js";

const _HIGH_RISK_WARNING_PATTERNS = [
	/无法自动转换/u,
	/requires manual conversion/i,
	/内容因无法识别分类而丢弃/u,
	/转换AC/u,
	/属性值格式错误/u,
];

export async function runConverterCheck (
	{
		entityKind,
		rawText,
		mode = "txt",
		source = "",
		page = 0,
		styleHint = "classic",
		inputMeta = null,
		entityTitle = null,
		converterRunner,
	},
) {
	if (!entityKind) throw new Error(`缺少“entityKind”`);
	if (!rawText?.trim()) throw new Error(`缺少“rawText”`);
	const warnings = [];
	let initialJson = null;
	let error = null;

	try {
		if (converterRunner) {
			initialJson = await converterRunner({
				entityKind,
				rawText,
				mode,
				source,
				page,
				styleHint,
				inputMeta,
				entityTitle,
				onWarning: warning => warnings.push(warning),
			});
		} else {
			const out = await _runBuiltinConverter({entityKind, rawText, mode, source, page, styleHint, inputMeta});
			initialJson = out.initialJson;
			warnings.push(...out.warnings);
		}
	} catch (e) {
		error = {
			name: e?.name || "Error",
			message: e?.message || String(e),
			stack: e?.stack || null,
		};
		warnings.push(`转换器崩溃：${error.message}`);
	}

	const fallbackJson = _tryRunChineseFallback({
		entityKind,
		rawText,
		source,
		page,
		entityTitle,
		initialJson,
		warnings,
	});

	if (fallbackJson) {
		initialJson = fallbackJson;
		error = null;
		warnings.length = 0;
	}

	return {
		entityKind,
		entityTitle,
		mode,
		rawText,
		source,
		page,
		styleHint,
		inputMeta,
		initialJson,
		warnings,
		error,
	};
}

function _tryRunChineseFallback ({entityKind, rawText, source, page, entityTitle, initialJson, warnings}) {
	const hasHighRiskWarning = warnings.some(warning => _HIGH_RISK_WARNING_PATTERNS.some(re => re.test(warning)));
	const shouldPreferChineseFallback = _shouldPreferChineseFallback({entityKind, rawText});
	if (initialJson && !hasHighRiskWarning && !shouldPreferChineseFallback) return null;

	switch (entityKind) {
		case "monster": return tryParseChineseMonster({rawText, source, page, entityTitle});
		case "item": return tryParseChineseItem({rawText, source, page, entityTitle});
		default: return null;
	}
}

function _shouldPreferChineseFallback ({entityKind, rawText}) {
	switch (entityKind) {
		case "monster":
			return /(?:^|\n)\s*AC\s*\d+/iu.test(rawText)
				&& /(?:^|\n)\s*HP\s*\d+/iu.test(rawText)
				&& /(?:^|\n)\s*(?:力量|智力|挑战等级|特质|动作)\b/u.test(rawText);

		case "item":
			return /(?:奇物|武器|护甲|戒指|法杖|魔杖|卷轴|药水|弹药|冒险装备)/u.test(rawText)
				&& /(?:普通|非普通|珍稀|极珍稀|传说|神器)/u.test(rawText);

		default:
			return false;
	}
}

async function _runBuiltinConverter ({entityKind, rawText, mode, source, page, styleHint, inputMeta}) {
	switch (entityKind) {
		case "monster":
			return runCreatureConverter({rawText, mode, source, page, styleHint, inputMeta});

		case "spell":
			return runSpellConverter({rawText, mode, source, page, styleHint, inputMeta});

		case "item":
			return runItemConverter({rawText, mode, source, page, styleHint, inputMeta});

		default:
			throw new Error(`条目类型缺少“converterRunner”："${entityKind}"`);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	throw new Error(`此脚本是适配层。请从其他脚本导入并调用 runConverterCheck()。`);
}
