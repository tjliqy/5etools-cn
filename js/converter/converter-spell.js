import {ConverterBase} from "./converter-base.js";
import {ConverterUtils} from "./converterutils-utils.js";
import {TagCondition} from "./converterutils-tags.js";
import {AbilityCheckTagger, DamageImmuneTagger, DamageInflictTagger, DamageResTagger, DamageVulnTagger, MiscTagsTagger, SavingThrowTagger, ScalingLevelDiceTagger, SpellAttackTagger} from "./converterutils-spell.js";
import {ConverterConst} from "./converterutils-const.js";
import {TagJsons} from "./converterutils-entries.js";
import {SITE_STYLE__CLASSIC, SITE_STYLE__ONE} from "../consts.js";
import {EntryCoalesceEntryLists, EntryCoalesceRawLines} from "./converterutils-entrycoalesce.js";
import {PropOrder} from "../utils-proporder.js";

export class ConverterSpell extends ConverterBase {
	static _RE_START_RANGE = "(?:Range|范围|距离|施法范围|施法距离)";
	static _RE_START_COMPONENTS = "(?:Components?|组件|组件消耗|成分|施法成分|法术成分)";
	static _RE_START_DURATION = "(?:Duration|持续时间)";
	static _RE_START_CLASS = "(?:Class(?:es)?|职业|施法职业)";

	static _REQUIRED_PROPS = [
		"level",
		"school",
		"time",
		"range",
		"duration",
		"entries",
	];

	/**
	 * Parses spells from raw text pastes
	 * @param inText Input text.
	 * @param options Options object.
	 * @param options.cbWarning Warning callback.
	 * @param options.cbOutput Output callback.
	 * @param options.isAppend Default output append mode.
	 * @param options.source Entity source.
	 * @param options.page Entity page.
	 * @param [options.isAddPageNumber] Whether to include the page in the output. Defaults to true if a page is provided.
	 * @param options.titleCaseFields Array of fields to be title-cased in this entity (if enabled).
	 * @param options.isTitleCase Whether title-case fields should be title-cased in this entity.
	 * @param options.styleHint
	 */
	static doParseText (inText, options) {
		options = this._getValidOptions(options);

		if (!inText || !inText.trim()) return options.cbWarning("没有输入！");
		const toConvert = this._getCleanInput(inText, options)
			.split("\n")
			.filter(it => it && it.trim());
		const spell = {};
		spell.source = options.source;
		// for the user to fill out
		spell.page = options.page;

		let prevLine = null;
		let curLine = null;
		let i;
		for (i = 0; i < toConvert.length; i++) {
			prevLine = curLine;
			curLine = toConvert[i].trim();

			if (curLine === "") continue;

			// name of spell
			if (i === 0) {
				[spell.name, spell.ENG_name] = ConverterUtils.splitNameToChineseAndEnglish(this._getAsTitle("name", curLine, options.titleCaseFields, options.isTitleCase));
				continue;
			}

			// spell level, and school plus ritual
			if (i === 1) {
				this._setCleanLevelSchoolRitual(spell, curLine, options);
				continue;
			}

			// casting time
			if (i === 2) {
				this._setCleanCastingTime(spell, curLine, options);
				continue;
			}

			// range
			if (!spell.range
				&& ConverterUtils.isStatblockLineHeaderStart({reStartStr: this._RE_START_RANGE, line: curLine})) {
				this._setCleanRange(spell, curLine, options);
				continue;
			}

			// components
			if (!spell.components
				&& ConverterUtils.isStatblockLineHeaderStart({reStartStr: this._RE_START_COMPONENTS, line: curLine})
			) {
				this._setCleanComponents(spell, curLine, options);
				continue;
			}

			// duration
			if (!spell.duration
				&& ConverterUtils.isStatblockLineHeaderStart({reStartStr: this._RE_START_DURATION, line: curLine})) {
				// avoid absorbing main body text
				this._setCleanDuration(spell, curLine, options);
				continue;
			}

			// class spell lists (alt)
			if (!spell.classes
				&& ConverterUtils.isStatblockLineHeaderStart({reStartStr: this._RE_START_CLASS, line: curLine})) {
				// avoid absorbing main body text
				this._setCleanClasses(spell, curLine, options);
				continue;
			}

			const ptrI = {_: i};
			spell.entries = EntryCoalesceRawLines.mutGetCoalesced(
				ptrI,
				toConvert,
				{
					fnStop: (curLine) => /^(?:At Higher Levels|Class(?:es)?|Cantrip Upgrade|Using a Higher-Level Spell Slot|升环施法效应|升环施法)/gi.test(curLine),
				},
			);
			i = ptrI._;

			spell.entriesHigherLevel = EntryCoalesceRawLines.mutGetCoalesced(
				ptrI,
				toConvert,
				{
					fnStop: (curLine) => /^Classes|环阶/gi.test(curLine),
				},
			);
			i = ptrI._;

			// class spell lists
			if (i < toConvert.length) {
				curLine = toConvert[i].trim();
				if (ConverterUtils.isStatblockLineHeaderStart({reStartStr: this._RE_START_CLASS, line: curLine})) {
					this._setCleanClasses(spell, curLine, options);
				}
			}
		}

		if (!spell.entriesHigherLevel || !spell.entriesHigherLevel.length) delete spell.entriesHigherLevel;

		this._doSpellPostProcess(spell, options);
		const statsOut = PropOrder.getOrdered(spell, "spell");

		const missingProps = this._REQUIRED_PROPS.filter(prop => statsOut[prop] == null);
		if (missingProps.length) options.cbWarning(`${statsOut.name ? `(${statsOut.name}) ` : ""}缺少词条: ${missingProps.join(", ")}`);

		options.cbOutput(statsOut, options.isAppend);

		return statsOut;
	}

	static _getCleanInput (ipt, options = null) {
		let txt = super._getCleanInput(ipt, options);

		const titles = [
			"Casting Time",
			"(施法)?时间",
			"Range",
			"(施法)?范围",
			"(施法)?距离",
			"Components?",
			"(法术)?成分",
			"Duration",
			"持续时间",
		];

		for (let i = 0; i < titles.length - 1; ++i) {
			const start = titles[i];
			const end = titles[i + 1];
			const re = new RegExp(`(?<line>\\n${start}.*?)(?<suffix>\\n${end})`, "is");

			txt = txt.replace(re, (...m) => {
				return `\n${m.last().line.replace(/\n/g, " ").trim().replace(/ +/g, " ")}${m.last().suffix}`;
			});
		}

		return txt;
	}

	// SHARED UTILITY FUNCTIONS ////////////////////////////////////////////////////////////////////////////////////////
	static _tryConvertSchool (s, {cbMan = null} = {}) {
		const school = (s.school || "").toLowerCase().trim();
		if (!school) return cbMan ? cbMan(`法术学派"${s.school}"无法自动转换。`) : null;

		const out = ConverterSpell._RES_SCHOOL.find(it => it.regex.test(school));
		if (out) {
			s.school = out.output;
			return;
		}
		if (cbMan) cbMan(`法术学派"${s.school}"无法自动转换。`);
	}

	static _doSpellPostProcess (stats, options) {
		this._doPostProcess_removePage(stats, options);

		const doCleanup = () => {
			// remove any empty arrays
			Object.keys(stats).forEach(k => {
				if (stats[k] instanceof Array && stats[k].length === 0) {
					delete stats[k];
				}
			});
		};

		TagCondition.tryTagConditions(stats, {isTagInflicted: true, styleHint: options.styleHint});

		[
			"entries",
			"entriesHigherLevel",
		]
			.forEach(prop => {
				EntryCoalesceEntryLists.mutCoalesce(stats, prop, {styleHint: options.styleHint});
				TagJsons.mutTagObjectStrictCapsWords(stats, {keySet: new Set([prop]), styleHint: options.styleHint});
				TagJsons.mutTagObject(stats, {keySet: new Set([prop]), isOptimistic: false, styleHint: options.styleHint});
			});

		this._addTags(stats, options);
		doCleanup();
	}

	static _addTags (stats, options) {
		DamageInflictTagger.tryRun(stats, options);
		DamageResTagger.tryRun(stats, options);
		DamageVulnTagger.tryRun(stats, options);
		DamageImmuneTagger.tryRun(stats, options);
		SavingThrowTagger.tryRun(stats, options);
		AbilityCheckTagger.tryRun(stats, options);
		SpellAttackTagger.tryRun(stats, options);
		// TODO areaTags
		MiscTagsTagger.tryRun(stats, options);
		ScalingLevelDiceTagger.tryRun(stats, options);
	}

	// SHARED PARSING FUNCTIONS ////////////////////////////////////////////////////////////////////////////////////////
	static _setCleanLevelSchoolRitual (stats, line, options) {
		const rawLine = line;
		line = ConverterUtils.cleanDashes(line).trim();

		const mCantrip = /(?:cantrip|戏法)/i.exec(line);
		const mSpellLeve = /^(?<level>\d+)(?:st|nd|rd|th)?[- ]level/i.exec(line)
			|| /^Level (?<level>\d+)\b/i.exec(line)
			|| /^(?<level>[一二三四五六七八九十]+|\d+)\s?环/i.exec(line);

		if (mCantrip) {
			let trailing = line.slice(mCantrip.index + "cantrip".length, line.length).trim();
			line = line.slice(0, mCantrip.index).trim();

			trailing = this._setCleanLevelSchoolRitual_trailingClassGroup({stats, options, trailing});

			// TODO implement as required (see at e.g. Deep Magic series)
			if (trailing) {
				options.cbWarning(`${stats.name ? `(${stats.name}) ` : ""}环阶/学派/仪式后缀部分"${trailing}"无法自动转换`);
			}

			stats.level = 0;
			stats.school = line;

			this._tryConvertSchool(stats, {cbMan: options.cbWarning});
			return;
		}

		if (mSpellLeve) {
			line = line.slice(mSpellLeve.index + mSpellLeve[0].length);

			let isRitual = false;
			line = line.replace(/\((.*?)(?:[,;]\s*)?ritual(?:[,;]\s*)?(.*?)\)/i, (...m) => {
				isRitual = true;
				// preserve any extra info inside the brackets
				return m[1] || m[2] ? `(${m[1]}${m[2]})` : "";
			}).trim();

			if (isRitual) {
				MiscUtil.set(stats, "meta", "ritual", true);
			}

			stats.level = Parser.textToNumber(mSpellLeve.groups.level);

			// 英文（一般用空格分割）
			let [tkSchool, ...tksSchoolRest] = line.trim().split(" ");
			stats.school = tkSchool;

			if (/^(?:school|spell)$/i.test(tksSchoolRest[0] || 0)) tksSchoolRest.shift();
			let trailing = tksSchoolRest.join(" ");

			// 处理中文（可能因为没有空格而和后续的职业等内容连在一起）
			const cnScoolPattern = new RegExp(`(?:${Object.values(Parser.SP_SCHOOL_ABV_TO_FULL).join("|")})`);
			const mCnScool = cnScoolPattern.exec(tkSchool);
			if (mCnScool) {
				stats.school = mCnScool[0];
				trailing = tkSchool.slice(mCnScool[0].length) + trailing;
			}
			trailing = this._setCleanLevelSchoolRitual_trailingClassGroup({stats, options, trailing});

			// TODO further handling of non-school text (see e.g. Deep Magic series)
			if (trailing) {
				options.cbWarning(`${stats.name ? `(${stats.name}) ` : ""}环阶、学派或仪式信息中的尾部内容“${trailing}”需要手动转换`);
			}

			this._tryConvertSchool(stats, {cbMan: options.cbWarning});
			return;
		}

		options.cbWarning(`${stats.name ? `(${stats.name}) ` : ""}环阶、学派或仪式信息“${rawLine}”需要手动转换`);
	}

	static _setCleanLevelSchoolRitual_trailingClassGroup ({stats, options, trailing}) {
		if (!trailing) return trailing;

		const classNames = [];

		const out = trailing
			.split(/([（()）])/g)
			.map(tk => {
				return tk
					.split(StrUtil.COMMAS_NOT_IN_PARENTHESES_REGEX)
					.map(tk => {
						return tk
							.replace(new RegExp(ConverterConst.STR_RE_CLASS, "i"), (...m) => {
								classNames.push(m.last().name);
								return "";
							})
							.replace(new RegExp(ConverterConst.STR_RE_CLASS_CN, "i"), (...m) => {
								classNames.push(m.last().name);
								return "";
							})
							.replace(/\s+/g, " ")
						;
					})
					.filter(it => it.trim())
					.join(",");
			})
			.join("")
			.replace(/(?:法术|学派)?\s*[（(]\s*[）)]/g, "")
			.trim();

		if (!classNames.length) return out;

		switch (options.styleHint) {
			case SITE_STYLE__CLASSIC: {
				(stats.groups ||= [])
					.push(
						...classNames.map(name => ({
							name,
							source: stats.source,
						})),
					);
				break;
			}

			case SITE_STYLE__ONE: {
				const tgt = MiscUtil.getOrSet(stats, "classes", "fromClassList", []);
				tgt.push(
					...classNames.map(name => ({
						name,
						source: (name === "Artificer" || name === "奇械师") ? Parser.SRC_EFA : Parser.SRC_XPHB,
					})),
				);
				break;
			}

			default: throw new Error(`Unhandled style "${options.styleHint}"!`);
		}

		return out;
	}

	static _setCleanRange (stats, line, options) {
		const getUnit = (str) => /\b(miles?|mi\.|里|英里)\b/.test(str.toLowerCase()) ? "miles" : "feet";

		const range = ConverterUtils.cleanDashes(ConverterUtils.getStatblockLineHeaderText({reStartStr: this._RE_START_RANGE, line}));

		if (["self", "自身", "自己"].includes(range.toLowerCase())) return stats.range = {type: "point", distance: {type: "self"}};
		if (["special", "特殊"].includes(range.toLowerCase())) return stats.range = {type: "special"};
		if (["unlimited", "无限"].includes(range.toLowerCase())) return stats.range = {type: "point", distance: {type: "unlimited"}};
		if (["unlimited on the same plane", "在同一位面上无限"].includes(range.toLowerCase())) return stats.range = {type: "point", distance: {type: "plane"}};
		if (["sight", "视野"].includes(range.toLowerCase())) return stats.range = {type: "point", distance: {type: "sight"}};
		if (["touch", "触及"].includes(range.toLowerCase())) return stats.range = {type: "point", distance: {type: "touch"}};

		const cleanRange = range.replace(/(\d),(\d)/g, "$1$2");

		const mFeetMiles = /^(?<amount>\d+)\s*(?<unit>feet|foot|ft\.?|miles?|mi\.?|尺|英尺|里|英里)$/i.exec(cleanRange);
		if (mFeetMiles) return stats.range = {type: "point", distance: {type: getUnit(mFeetMiles.groups.unit), amount: Number(mFeetMiles.groups.amount)}};

		const mSelfEmanation = /^(self |自身\s*)[(（](\d+)[- ]?(foot|ft\.?|miles?|mi\.?|尺|英尺|里|英里)( emanation|\s*光环)[)）]$/i.exec(cleanRange);
		if (mSelfEmanation) return stats.range = {type: "emanation", distance: {type: getUnit(mSelfEmanation[2]), amount: Number(mSelfEmanation[1])}};

		const mSelfRadius = /^(self |自身\s*)[(（](\d+)[- ]?(foot|ft\.?|miles?|mi\.?|尺|英尺|里|英里)\s*(radius|半径)[)）]$/i.exec(cleanRange);
		if (mSelfRadius) return stats.range = {type: "radius", distance: {type: getUnit(mSelfRadius[2]), amount: Number(mSelfRadius[1])}};

		const mSelfSphere = /^(self |自身\s*)[(（](\d+)[- ]?(foot|ft\.?|miles?|mi\.?|尺|英尺|里|英里)(?:[- ]radius|\s*半径)?\s*(sphere|的?球状|球形|球型)[)）]$/i.exec(cleanRange);
		if (mSelfSphere) return stats.range = {type: "sphere", distance: {type: getUnit(mSelfSphere[2]), amount: Number(mSelfSphere[1])}};

		const mSelfCone = /^(self |自身\s*)[(（](\d+)[- ]?(foot|ft\.?|miles?|mi\.?|尺|英尺|里|英里)\s*(cone|锥状|锥形|锥型)[)）]$/i.exec(cleanRange);
		if (mSelfCone) return stats.range = {type: "cone", distance: {type: getUnit(mSelfCone[2]), amount: Number(mSelfCone[1])}};

		const mSelfLine = /^(self |自身\s*)[(（](\d+)[- ]?(foot|ft\.?|miles?|mi\.?|尺|英尺|里|英里)\s*(line|线状|线形|线型)[)）]$/i.exec(cleanRange);
		if (mSelfLine) return stats.range = {type: "line", distance: {type: getUnit(mSelfLine[2]), amount: Number(mSelfLine[1])}};

		const mSelfCube = /^(self |自身\s*)[(（](\d+)[- ]?(foot|ft\.?|miles?|mi\.?|尺|英尺|里|英里)\s*(cube|立方体|立方型|立方|正方体)[)）]$/i.exec(cleanRange);
		if (mSelfCube) return stats.range = {type: "cube", distance: {type: getUnit(mSelfCube[2]), amount: Number(mSelfCube[1])}};

		const mSelfHemisphere = /^(self |自身\s*)[(（](\d+)[- ]?(foot|ft\.?|miles?|mi\.?|尺|英尺|里|英里)(?:[- ]radius|\s*半径)?\s*(hemisphere|半球形|半球型|半球)[)）]$/i.exec(cleanRange);
		if (mSelfHemisphere) return stats.range = {type: "hemisphere", distance: {type: getUnit(mSelfHemisphere[2]), amount: Number(mSelfHemisphere[1])}};

		// region Homebrew
		const mPointCube = /^(?<point>\d+)\s*(?<unit>feet|foot|ft\.?|miles?|mi\.?|尺|英尺|里|英里)\s*[(（](\d+)[- ]?(foot|ft\.?|miles?|mi\.?|尺|英尺|里|英里)\s*(cube|立方体|立方型|立方|正方体)[)）]$/i.exec(cleanRange);
		if (mPointCube) return stats.range = {type: "point", distance: {type: getUnit(mPointCube.groups.unit), amount: Number(mPointCube.groups.point)}};
		// endregion

		options.cbWarning(`${stats.name ? `(${stats.name}) ` : ""}施法距离部分"${range}"无法自动转换`);
	}

	static _getCleanTimeUnit (unit, isDuration, options) {
		unit = unit.toLowerCase().trim().replace("个", "");
		switch (unit) {
			case "days":
			case "weeks":
			case "months":
			case "years":
			case "hours":
			case "minutes":
			case "actions":
			case "rounds": return unit.slice(0, -1);

			case "day":
			case "week":
			case "month":
			case "year":
			case "hour":
			case "minute":
			case "action":
			case "round":
			case "reaction": return unit;

			case "bonus action": return "bonus";

			case "日":
			case "天":
				return "day";
			case "周":
			case "星期":
				return "week";
			case "月":
				return "month";
			case "年":
				return "year";
			case "时":
			case "小时":
				return "hour";
			case "分":
			case "分钟":
				return "minute";
			case "动作":
				return "action";
			case "轮":
				return "round";
			case "反应":
				return "reaction";
			case "附赠动作":
				return "bonus";

			default:
				options.cbWarning(`单位部分"${unit}"无法自动转换`);
				return unit;
		}
	}

	static _setCleanCastingTime (stats, line, options) {
		const allParts = ConverterUtils.getStatblockLineHeaderText({reStartStr: "(?:Casting Time|施法时间)", line});
		const parts = /\b(?:reaction|which you (?:take|use))\b/i.test(allParts)
			? [allParts]
			: allParts.split(/; | or /gi);

		stats.time = parts
			.map(it => it.trim())
			.filter(Boolean)
			.map(str => {
				if (str.toLowerCase() === "ritual" || str.toLowerCase() === "仪式") {
					MiscUtil.set(stats, "meta", "ritual", true);
					return null;
				}

				const mNumber = /^(?<count>[一二三四五六七八九十]+|\d+)?(?<rest>.*?)$/.exec(str);

				if (!mNumber) {
					options.cbWarning(`${stats.name ? `(${stats.name}) ` : ""}施法时间片段“${str}”需要手动转换`);
					return str;
				}

				const amount = mNumber.groups.count ? Parser.textToNumber(mNumber.groups.count.trim()) : null;
				const [unit, ...conditionParts] = mNumber.groups.rest.split(", ");

				const mNote = /^(?<unit>.*) \((?<note>.*)\)$/.exec(unit);

				const out = {
					number: amount ?? 1,
					unit: this._getCleanTimeUnit(mNote ? mNote.groups.unit : unit, false, options),
					condition: conditionParts.join(", "),
					note: mNote ? mNote.groups.note : null,
				};
				if (!out.condition) delete out.condition;
				if (!out.note) delete out.note;
				return out;
			})
			.filter(Boolean);
	}

	static _getComponentCurrencyMult ({mCost}) {
		const {currency, currencyLong} = mCost.groups;

		if (currency) return Parser.COIN_CONVERSIONS[Parser.COIN_ABVS.indexOf(currency.toLowerCase())];

		switch (currencyLong.toLowerCase()) {
			case "金币":
			case "gold": {
				return Parser.COIN_CONVERSIONS[Parser.COIN_ABVS.indexOf("gp")];
			}
			default: throw new Error("Unimplemented!");
		}
	}

	static _setCleanComponents (stats, line, options) {
		const components = ConverterUtils.getStatblockLineHeaderText({reStartStr: this._RE_START_COMPONENTS, line});
		const parts = components.split(StrUtil.COMMAS_NOT_IN_PARENTHESES_REGEX);

		stats.components = {};

		parts
			.map(it => it.trim())
			.filter(Boolean)
			.forEach(pt => {
				const lowerPt = pt.toLowerCase();
				switch (lowerPt) {
					case "v": stats.components.v = true; break;
					case "s": stats.components.s = true; break;
					default: {
						if (/^m\s*[(（](.*)[)）]$/i.test(lowerPt)) {
							const materialText = pt.replace(/^m\s*[(（](.*)[)）]$/i, "$1").trim();
							const mCost = /(?<count>\d*,?\d+)\+?\s?(?:(?<currency>cp|sp|ep|gp|pp)|(?:(?<currencyLong>(?:gold|金币))(?: pieces)?))/gi.exec(materialText);
							const isConsumed = /(?:consume|消耗|花费|耗材)/i.test(pt.toLowerCase());

							if (mCost) {
								const valueMult = this._getComponentCurrencyMult({mCost});
								const valueNum = Number(mCost.groups.count.replace(/,/g, ""));

								stats.components.m = {
									text: materialText,
									cost: valueNum * valueMult,
								};
								if (isConsumed) stats.components.m.consume = true;
							} else if (isConsumed) {
								stats.components.m = {
									text: materialText,
									consume: true,
								};
							} else {
								stats.components.m = materialText;
							}
						} else if (lowerPt.startsWith("r ")) stats.components.r = true;
						else options.cbWarning(`${stats.name ? `(${stats.name}) ` : ""}法术成分部分"${pt}"无法自动转换`);
					}
				}
			});
	}

	static _setCleanDuration (stats, line, options) {
		const {durStr, condition} = this._setCleanDuration_getInput({line, options});

		if (["instantaneous", "立即"].includes(durStr.toLowerCase())) return stats.duration = this._setCleanDurationn_getOutput({duration: [{type: "instant"}], condition});
		if (["special", "特殊"].includes(durStr.toLowerCase())) return stats.duration = this._setCleanDurationn_getOutput({duration: [{type: "special"}], condition});
		if (["permanent", "永久"].includes(durStr.toLowerCase())) return stats.duration = this._setCleanDurationn_getOutput({duration: [{type: "permanent"}], condition});

		if (["concentration", "专注"].includes(durStr.toLowerCase())) return stats.duration = this._setCleanDurationn_getOutput({duration: [{type: "special", concentration: true}], condition});

		const mConcOrUpTo = /^(?<conc>(?:concentration|专注)[,，]\s*)?(?:up to|至多)\s*(?<amount>\d+|an?)\s*(?<unit>hour|minute|turn|round|week|month|day|year|时|小时|分|分钟|轮|回合|周|星期|月|天|日|年)(?:s)?$/i.exec(durStr);
		if (mConcOrUpTo) {
			const amount = mConcOrUpTo.groups.amount.toLowerCase().startsWith("a") ? 1 : Number(mConcOrUpTo.groups.amount);
			const out = {type: "timed", duration: {type: this._getCleanTimeUnit(mConcOrUpTo.groups.unit, true, options), amount}};
			if (mConcOrUpTo.groups.conc) out.concentration = true;
			else out.duration.upTo = true;
			return stats.duration = this._setCleanDurationn_getOutput({duration: [out], condition});
		}

		const mTimed = /^(\d+)\s?(hour|minute|turn|round|week|month|day|year|时|小时|分|分钟|轮|回合|周|星期|月|天|日|年)(?:s)?$/i.exec(durStr);

		if (mTimed) return stats.duration = this._setCleanDurationn_getOutput({duration: [{type: "timed", duration: {type: this._getCleanTimeUnit(mTimed[2], true, options), amount: Number(mTimed[1])}}], condition});

		const mDispelledTriggered = /^(?:until dispelled|直到被解除)(?: or triggered|或被?触发)?$/i.exec(durStr);
		if (mDispelledTriggered) {
			const out = {type: "permanent", ends: ["dispel"]};
			if (mDispelledTriggered[1]) out.ends.push("trigger");
			return stats.duration = this._setCleanDurationn_getOutput({duration: [out], condition});
		}

		const mPermDischarged = /^permanent until discharged$/i.exec(durStr);
		if (mPermDischarged) {
			const out = {type: "permanent", ends: ["discharge"]};
			return stats.duration = this._setCleanDurationn_getOutput({duration: [out], condition});
		}

		// TODO handle splitting "or"'d durations up as required

		options.cbWarning(`${stats.name ? `(${stats.name}) ` : ""}持续时间部分"${durStr}"无法自动转换`);
	}

	static _setCleanDuration_getInput ({line, options}) {
		const durRaw = ConverterUtils.getStatblockLineHeaderText({reStartStr: this._RE_START_DURATION, line});

		let condition;
		const durStr = durRaw
			.replace(/\s+\((?<condition>see [^)]+)\)\s*$/, (...m) => {
				condition = m.last().condition;
				return "";
			})
			.trim();

		return {durStr, condition};
	}

	static _setCleanDurationn_getOutput ({duration, condition}) {
		if (condition) duration.forEach(dur => dur.condition = condition);
		return duration;
	}

	static _setCleanClasses (stats, line, options) {
		const classLine = ConverterUtils.getStatblockLineHeaderText({reStartStr: this._RE_START_CLASS, line});
		const classes = classLine.split(StrUtil.COMMAS_NOT_IN_PARENTHESES_REGEX);

		const tgt = MiscUtil.getOrSet(stats, "classes", "fromClassList", []);

		classes
			.map(it => it.trim())
			.filter(Boolean)
			.forEach(pt => {
				let isLegacy = false;
				let lowerPt = pt.toLowerCase()
					.replace(/ \(legacy\)$/, () => {
						isLegacy = true;
						return "";
					})
					.trim();

				const srcPhb = isLegacy
					? Parser.SRC_PHB
					: options.styleHint !== SITE_STYLE__CLASSIC
						? Parser.SRC_XPHB
						: Parser.SRC_PHB;
				const srcArtificer = isLegacy
					? Parser.SRC_TCE
					: options.styleHint !== SITE_STYLE__CLASSIC
						? Parser.SRC_EFA
						: Parser.SRC_TCE;

				switch (lowerPt) {
					case "artificer":
					case "artificers": tgt.push({"name": "Artificer", "source": srcArtificer}); break;
					case "bard":
					case "bards": tgt.push({"name": "Bard", "source": srcPhb}); break;
					case "cleric":
					case "clerics": tgt.push({"name": "Cleric", "source": srcPhb}); break;
					case "druid":
					case "druids": tgt.push({"name": "Druid", "source": srcPhb}); break;
					case "paladin":
					case "paladins": tgt.push({"name": "Paladin", "source": srcPhb}); break;
					case "ranger":
					case "rangers": tgt.push({"name": "Ranger", "source": srcPhb}); break;
					case "sorcerer":
					case "sorcerers": tgt.push({"name": "Sorcerer", "source": srcPhb}); break;
					case "warlock":
					case "warlocks": tgt.push({"name": "Warlock", "source": srcPhb}); break;
					case "wizard":
					case "wizards": tgt.push({"name": "Wizard", "source": srcPhb}); break;
					default: options.cbWarning(`${stats.name ? `(${stats.name}) ` : ""}职业“${lowerPt}”需要手动转换`); break;
				}
			});

		if (!stats.classes.fromClassList.length) delete stats.classes;
	}
}
ConverterSpell._RES_SCHOOL = Object.entries({
	"transmutation": "T",
	"necromancy": "N",
	"conjuration": "C",
	"abjuration": "A",
	"enchantment": "E",
	"evocation": "V",
	"illusion": "I",
	"divination": "D",
	"变化": "T",
	"死灵": "N",
	"咒法": "C",
	"防护": "A",
	"惑控": "E",
	"塑能": "V",
	"幻术": "I",
	"预言": "D",
}).map(([k, v]) => ({
	output: v,
	regex: RegExp(`^${k}(?: school|学派|法术)?$`, "i"),
}));
