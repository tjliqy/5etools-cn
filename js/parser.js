"use strict";

// PARSING =============================================================================================================
globalThis.Parser = {};

Parser._parse_aToB = function (abMap, a, fallback) {
	if (a === undefined || a === null) throw new TypeError("undefined or null object passed to parser");
	if (typeof a === "string") a = a.trim();
	if (abMap[a] !== undefined) return abMap[a];
	return fallback !== undefined ? fallback : a;
};

Parser._parse_bToA = function (abMap, b, fallback) {
	if (b === undefined || b === null) throw new TypeError("undefined or null object passed to parser");
	if (typeof b === "string") b = b.trim();
	for (const v in abMap) {
		if (!abMap.hasOwnProperty(v)) continue;
		if (abMap[v] === b) return v;
	}
	return fallback !== undefined ? fallback : b;
};

Parser.attrChooseToFull = function (attList) {
	if (attList.length === 1) return `${Parser.attAbvToFull(attList[0])} 调整值`;
	else {
		const attsTemp = [];
		for (let i = 0; i < attList.length; ++i) {
			attsTemp.push(Parser.attAbvToFull(attList[i]));
		}
		return `${attsTemp.join(" 或 ")} 调整值（由你决定）`;
	}
};

Parser.numberToText = function (number, {isOrdinalForm = false} = {}) {
	if (number == null) throw new TypeError(`undefined or null object passed to parser`);
	if (Math.abs(number) >= 100) return isOrdinalForm ? `第${number}` : `${number}`;

	return `${number < 0 ? "负" : ""}${Parser.numberToText._getPositiveNumberAsText({number: Math.abs(number), isOrdinalForm})}`;
};

Parser.numberToText._getPositiveNumberAsText = ({number, isOrdinalForm}) => {
	const [preDotRaw, postDotRaw] = `${number}`.split(".");

	if (!postDotRaw) return Parser.numberToText._getPositiveIntegerAsText({number, isOrdinalForm});

	if (isOrdinalForm) return `${preDotRaw}.${Parser.getOrdinalForm(postDotRaw)}`;

	const {str: strPostDot, isPretty: isPrettyPostDot} = Parser.numberToText._getPostDot({postDotRaw});

	if (!isPrettyPostDot) return `${number}`;

	return preDotRaw === "0"
		? strPostDot
		: `${Parser.numberToText._getPositiveIntegerAsText({number: Math.trunc(number), isOrdinalForm})}又${strPostDot}`;
};

Parser.numberToText._getPostDot = ({postDotRaw}) => {
	// See also: `Parser.numberToVulgar`
	switch (postDotRaw) {
		case "125": return {str: `八分之一`, isPretty: true};
		case "2": return {str: `五分之一`, isPretty: true};
		case "25": return {str: `四分之一`, isPretty: true};
		case "375": return {str: `八分之三`, isPretty: true};
		case "4": return {str: `五分之二`, isPretty: true};
		case "5": return {str: `二分之一`, isPretty: true};
		case "6": return {str: `五分之三`, isPretty: true};
		case "625": return {str: `八分之五`, isPretty: true};
		case "75": return {str: `四分之三`, isPretty: true};
		case "8": return {str: `五分之四`, isPretty: true};
		case "875": return {str: `八分之七`, isPretty: true};

		default: {
			// Handle recursive
			const asNum = Number(`0.${postDotRaw}`);

			if (asNum.toFixed(2) === (1 / 3).toFixed(2)) return {str: `三分之一`, isPretty: true};
			if (asNum.toFixed(2) === (2 / 3).toFixed(2)) return {str: `三分之二`, isPretty: true};

			if (asNum.toFixed(2) === (1 / 6).toFixed(2)) return {str: `六分之一`, isPretty: true};
			if (asNum.toFixed(2) === (5 / 6).toFixed(2)) return {str: `六分之五`, isPretty: true};

			return {str: `${postDotRaw}`, isPretty: false};
		}
	}
};

Parser.numberToText._getPositiveIntegerAsText = ({number, isOrdinalForm}) => {
	switch (number) {
		case 0: return Parser.numberToText._getOptionallyOrdinal({number, str: "零", isOrdinalForm});
		case 1: return Parser.numberToText._getOptionallyOrdinal({number, str: "一", isOrdinalForm});
		case 2: return Parser.numberToText._getOptionallyOrdinal({number, str: "二", isOrdinalForm});
		case 3: return Parser.numberToText._getOptionallyOrdinal({number, str: "三", isOrdinalForm});
		case 4: return Parser.numberToText._getOptionallyOrdinal({number, str: "四", isOrdinalForm});
		case 5: return Parser.numberToText._getOptionallyOrdinal({number, str: "五", isOrdinalForm});
		case 6: return Parser.numberToText._getOptionallyOrdinal({number, str: "六", isOrdinalForm});
		case 7: return Parser.numberToText._getOptionallyOrdinal({number, str: "七", isOrdinalForm});
		case 8: return Parser.numberToText._getOptionallyOrdinal({number, str: "八", isOrdinalForm});
		case 9: return Parser.numberToText._getOptionallyOrdinal({number, str: "九", isOrdinalForm});
		case 10: return Parser.numberToText._getOptionallyOrdinal({number, str: "十", isOrdinalForm});
		case 11: return Parser.numberToText._getOptionallyOrdinal({number, str: "十一", isOrdinalForm});
		case 12: return Parser.numberToText._getOptionallyOrdinal({number, str: "十二", isOrdinalForm});
		case 13: return Parser.numberToText._getOptionallyOrdinal({number, str: "十三", isOrdinalForm});
		case 14: return Parser.numberToText._getOptionallyOrdinal({number, str: "十四", isOrdinalForm});
		case 15: return Parser.numberToText._getOptionallyOrdinal({number, str: "十五", isOrdinalForm});
		case 16: return Parser.numberToText._getOptionallyOrdinal({number, str: "十六", isOrdinalForm});
		case 17: return Parser.numberToText._getOptionallyOrdinal({number, str: "十七", isOrdinalForm});
		case 18: return Parser.numberToText._getOptionallyOrdinal({number, str: "十八", isOrdinalForm});
		case 19: return Parser.numberToText._getOptionallyOrdinal({number, str: "十九", isOrdinalForm});
		case 20: return Parser.numberToText._getOptionallyOrdinal({number, str: "二十", isOrdinalForm});
		case 30: return Parser.numberToText._getOptionallyOrdinal({number, str: "三十", isOrdinalForm});
		case 40: return Parser.numberToText._getOptionallyOrdinal({number, str: "四十", isOrdinalForm});
		case 50: return Parser.numberToText._getOptionallyOrdinal({number, str: "五十", isOrdinalForm});
		case 60: return Parser.numberToText._getOptionallyOrdinal({number, str: "六十", isOrdinalForm});
		case 70: return Parser.numberToText._getOptionallyOrdinal({number, str: "七十", isOrdinalForm});
		case 80: return Parser.numberToText._getOptionallyOrdinal({number, str: "八十", isOrdinalForm});
		case 90: return Parser.numberToText._getOptionallyOrdinal({number, str: "九十", isOrdinalForm});
		default: {
			const str = String(number);
			const text = `${Parser.numberToText._getPositiveIntegerAsText({number: Number(`${str[0]}0`)})}${Parser.numberToText._getPositiveIntegerAsText({number: Number(str[1])})}`;
			return isOrdinalForm ? `第${text}` : text;
		}
	}
};

Parser.numberToText._getOptionallyOrdinal = ({number, str, isOrdinalForm}) => isOrdinalForm ? `第${str}` : str;

Parser.textToNumber = function (str) {
	str = str.trim().toLowerCase();
	if (!isNaN(str)) return Number(str);
	switch (str) {
		case "zero": return 0;
		case "one": case "a": case "an": case "first": return 1;
		case "two": case "double": case "second": return 2;
		case "three": case "triple": case "third": return 3;
		case "four": case "quadruple": case "fourth": return 4;
		case "five": case "fifth": return 5;
		case "six": case "sixth": return 6;
		case "seven": case "seventh": return 7;
		case "eight": case "eighth": return 8;
		case "nine": case "ninth": return 9;
		case "ten": case "tenth": return 10;
		case "eleven": return 11;
		case "twelve": return 12;
		case "thirteen": return 13;
		case "fourteen": return 14;
		case "fifteen": return 15;
		case "sixteen": return 16;
		case "seventeen": return 17;
		case "eighteen": return 18;
		case "nineteen": return 19;
		case "twenty": return 20;
		case "thirty": return 30;
		case "forty": return 40;
		case "fifty": return 50;
		case "sixty": return 60;
		case "seventy": return 70;
		case "eighty": return 80;
		case "ninety": return 90;
		case "零": return 0;
		case "一": return 1;
		case "首": return 1;
		case "二": return 2;
		case "两": return 2;
		case "三": return 3;
		case "四": return 4;
		case "五": return 5;
		case "六": return 6;
		case "七": return 7;
		case "八": return 8;
		case "九": return 9;
		case "十": return 10;
		case "十一": return 11;
		case "十二": return 12;
		case "十三": return 13;
		case "十四": return 14;
		case "十五": return 15;
		case "十六": return 16;
		case "十七": return 17;
		case "十八": return 18;
		case "十九": return 19;
		case "二十": return 20;
		case "三十": return 30;
		case "四十": return 40;
		case "五十": return 50;
		case "六十": return 60;
		case "七十": return 70;
		case "八十": return 80;
		case "九十": return 90;
	}
	return NaN;
};

Parser.numberToVulgar = function (number, { isFallbackOnFractional = true } = {}) {
	const isNeg = number < 0;
	const spl = `${number}`.replace(/^-/, "").split(".");
	if (spl.length === 1) return number;

	let preDot = spl[0] === "0" ? "" : spl[0];
	if (isNeg) preDot = `-${preDot}`;

	// See also: `Parser.numberToText._getPositiveNumberAsText`
	switch (spl[1]) {
		case "125": return `${preDot}⅛`;
		case "2": return `${preDot}⅕`;
		case "25": return `${preDot}¼`;
		case "375": return `${preDot}⅜`;
		case "4": return `${preDot}⅖`;
		case "5": return `${preDot}½`;
		case "6": return `${preDot}⅗`;
		case "625": return `${preDot}⅝`;
		case "75": return `${preDot}¾`;
		case "8": return `${preDot}⅘`;
		case "875": return `${preDot}⅞`;

		default: {
			// Handle recursive
			const asNum = Number(`0.${spl[1]}`);

			if (asNum.toFixed(2) === (1 / 3).toFixed(2)) return `${preDot}⅓`;
			if (asNum.toFixed(2) === (2 / 3).toFixed(2)) return `${preDot}⅔`;

			if (asNum.toFixed(2) === (1 / 6).toFixed(2)) return `${preDot}⅙`;
			if (asNum.toFixed(2) === (5 / 6).toFixed(2)) return `${preDot}⅚`;
		}
	}

	return isFallbackOnFractional ? Parser.numberToFractional(number) : null;
};

Parser.vulgarToNumber = function (str) {
	const [, leading = "0", vulgar = ""] = /^(\d+)?([⅛¼⅜½⅝¾⅞⅓⅔⅙⅚])?$/.exec(str) || [];
	let out = Number(leading);
	switch (vulgar) {
		case "⅛": out += 0.125; break;
		case "¼": out += 0.25; break;
		case "⅜": out += 0.375; break;
		case "½": out += 0.5; break;
		case "⅝": out += 0.625; break;
		case "¾": out += 0.75; break;
		case "⅞": out += 0.875; break;
		case "⅓": out += 1 / 3; break;
		case "⅔": out += 2 / 3; break;
		case "⅙": out += 1 / 6; break;
		case "⅚": out += 5 / 6; break;
		case "": break;
		default: throw new Error(`Unhandled vulgar part "${vulgar}"`);
	}
	return out;
};

Parser.numberToSuperscript = function (number) {
	return `${number}`.split("").map(c => isNaN(c) ? c : Parser._NUMBERS_SUPERSCRIPT[Number(c)]).join("");
};
Parser._NUMBERS_SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸⁹";

Parser.numberToSubscript = function (number) {
	return `${number}`.split("").map(c => isNaN(c) ? c : Parser._NUMBERS_SUBSCRIPT[Number(c)]).join("");
};
Parser._NUMBERS_SUBSCRIPT = "₀₁₂₃₄₅₆₇₈₉";

Parser._greatestCommonDivisor = function (a, b) {
	if (b < Number.EPSILON) return a;
	return Parser._greatestCommonDivisor(b, Math.floor(a % b));
};
Parser.numberToFractional = function (number) {
	const isMinus = number < 0;
	number = Math.abs(Number(number.toFixed(6)));

	if (!number) return `${number}`;

	const len = number.toString().length - 2;
	let denominator = 10 ** len;
	let numerator = number * denominator;
	const divisor = Parser._greatestCommonDivisor(numerator, denominator);
	numerator = Math.floor(numerator / divisor);
	denominator = Math.floor(denominator / divisor);

	return `${isMinus ? "-" : ""}${denominator === 1 ? String(numerator) : `${Math.floor(numerator)}/${Math.floor(denominator)}`}`;
};

Parser.isNumberNearEqual = function (a, b) {
	return Math.abs(a - b) < Number.EPSILON;
};

Parser.ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

Parser.attAbvToFull = function (abv) {
	return Parser._parse_aToB(Parser.ATB_ABV_TO_FULL, abv);
};

Parser.attFullToAbv = function (full) {
	return Parser._parse_bToA(Parser.ATB_ABV_TO_FULL, full);
};

Parser.attFullToCn = function (full) {
	return Parser._parse_aToB(Parser.ATB_FULL_TO_CN, full);
};

Parser.sizeAbvToFull = function (abv) {
	return Parser._parse_aToB(Parser.SIZE_ABV_TO_FULL, abv);
};

Parser.sizeAbvToShort = function (abv) {
	return Parser._parse_aToB(Parser.SIZE_ABV_TO_SHORT, abv);
};

Parser.getAbilityModNumber = function (abilityScore) {
	return Math.floor((abilityScore - 10) / 2);
};

Parser.getAbilityModifier = function (abilityScore) {
	let modifier = Parser.getAbilityModNumber(abilityScore);
	if (modifier >= 0) modifier = `+${modifier}`;
	return `${modifier}`;
};

Parser.getSpeedString = (ent, {isMetric = false, isSkipZeroWalk = false, isLongForm = false, styleHint = null} = {}) => {
	if (ent.speed == null) return "\u2014";

	styleHint ||= VetoolsConfig.get("styleSwitcher", "style");

	const unit = isMetric
		? Parser.metric.getMetricUnit({originalUnit: "ft.", isShortForm: !isLongForm})
		: isLongForm ? "尺" : "尺";
	if (typeof ent.speed === "object") {
		const stack = [];
		let joiner = ", ";

		Parser.SPEED_MODES
			.filter(mode => !ent.speed.hidden?.includes(mode))
			.forEach(mode => Parser._getSpeedString_addSpeedMode({ent, prop: mode, stack, isMetric, isSkipZeroWalk, unit, styleHint}));

		if (ent.speed.choose && !ent.speed.hidden?.includes("choose")) {
			joiner = "; ";
			stack.push(`${ent.speed.choose.from.sort().map(prop => Parser._getSpeedString_getSpeedName({prop, styleHint})).joinConjunct(", ", " 或 ")} ${ent.speed.choose.amount} ${unit}${ent.speed.choose.note ? ` ${ent.speed.choose.note}` : ""}`);
		}

		return stack.join(joiner) + (ent.speed.note ? ` ${ent.speed.note}` : "");
	}

	return (isMetric ? Parser.metric.getMetricNumber({originalValue: ent.speed, originalUnit: Parser.UNT_FEET}) : ent.speed)
		+ (ent.speed === "Varies" ? "" : ` ${unit} `);
};
Parser._getSpeedString_addSpeedMode = ({ent, prop, stack, isMetric, isSkipZeroWalk, unit, styleHint}) => {
	if (ent.speed[prop] || (!isSkipZeroWalk && prop === "walk")) Parser._getSpeedString_addSpeed({prop, speed: ent.speed[prop] || 0, isMetric, unit, stack, styleHint});
	if (ent.speed.alternate && ent.speed.alternate[prop]) ent.speed.alternate[prop].forEach(speed => Parser._getSpeedString_addSpeed({prop, speed, isMetric, unit, stack, styleHint}));
};

Parser.SPEED_TO_CN = {
	"climb": "攀爬",
	"fly": "飞行",
	"hover": "悬浮",
	"swim": "游泳",
	"walk": "步行",
	"burrow": "掘穴",
	"water": "水面",
};

Parser.speedToCn = function (prop) {
	return Parser._parse_aToB(Parser.SPEED_TO_CN, prop);
};

Parser.cnToSpeed = function (prop) {
	return Parser._parse_bToA(Parser.SPEED_TO_CN, prop);
};

Parser._getSpeedString_addSpeed = ({prop, speed, isMetric, unit, stack, styleHint}) => {
	const ptName = Parser._getSpeedString_getSpeedName({prop, styleHint});
	const ptValue = Parser._getSpeedString_getVal({prop, speed, isMetric});
	const ptUnit = speed === true ? "" : ` ${unit}`;
	const ptCondition = Parser._getSpeedString_getCondition({speed});
	stack.push([ptName, ptValue, ptUnit, ptCondition].join(""));
};
Parser._getSpeedString_getVal = ({prop, speed, isMetric}) => {
	if (speed === true && prop !== "walk") return "与你的步行速度相同";

	const num = speed === true
		? 0
		: speed.number != null ? speed.number : speed;

	return isMetric ? Parser.metric.getMetricNumber({originalValue: num, originalUnit: Parser.UNT_FEET}) : num;
};
Parser._getSpeedString_getCondition = ({speed}) => speed.condition ? ` ${Renderer.get().render(speed.condition)}` : "";
Parser._getSpeedString_getSpeedName = ({prop, styleHint}) => prop === "walk" ? "" : `${Parser.SPEED_TO_CN[prop] || prop[styleHint === "classic" ? "toString" : "toTitleCase"]()} `;

Parser.SPEED_MODES = ["walk", "burrow", "climb", "fly", "swim"];
Parser.SPEED_MODES_CN = Parser.SPEED_MODES.map(prop => Parser.speedToCn(prop));

Parser.SPEED_TO_PROGRESSIVE = {
	"walk": "walking",
	"burrow": "burrowing",
	"climb": "climbing",
	"fly": "flying",
	"swim": "swimming",
};

Parser.speedToProgressive = function (prop) {
	return Parser._parse_aToB(Parser.SPEED_TO_PROGRESSIVE, prop);
};

Parser.raceCreatureTypesToFull = function (creatureTypes) {
	const hasSubOptions = creatureTypes.some(it => it.choose);
	return creatureTypes
		.map(it => {
			if (!it.choose) return Parser.monTypeToFullObj(it).asText;
			return [...it.choose]
				.sort(SortUtil.ascSortLower)
				.map(sub => Parser.monTypeToFullObj(sub).asText)
				.joinConjunct("、", "或");
		})
		.joinConjunct(hasSubOptions ? "; " : ", ", " 和 ");
};

Parser.crToXp = function (cr, {isDouble = false} = {}) {
	if (cr != null && cr.xp) return (isDouble ? cr.xp * 2 : cr.xp).toLocaleStringVe();

	const toConvert = cr ? (cr.cr || cr) : null;
	if (toConvert === "Unknown" || toConvert == null || !Parser.XP_CHART_ALT[toConvert]) return "未知";
	// CR 0 creatures can be 0 or 10 XP, but 10 XP is used in almost every case.
	//   Exceptions, such as MM's Frog and Sea Horse, have their XP set to 0 on the creature
	if (toConvert === "0") return "10";
	const xp = Parser.XP_CHART_ALT[toConvert];
	return (isDouble ? 2 * xp : xp).toLocaleStringVe();
};

Parser.crToXpNumber = function (cr) {
	if (cr != null && cr.xp) return cr.xp;
	const toConvert = cr ? (cr.cr || cr) : cr;
	if (toConvert === "Unknown" || toConvert == null) return null;
	return Parser.XP_CHART_ALT[toConvert] ?? null;
};

Parser.LEVEL_XP_REQUIRED = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

Parser.CRS = ["0", "1/8", "1/4", "1/2", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30"];

Parser.isValidCr = function (cr) {
	return Parser.CRS.includes(cr);
};

Parser.crToNumber = function (cr, opts = {}) {
	const { isDefaultNull = false } = opts;

	if (cr === "Unknown" || cr === "\u2014" || cr == null) return isDefaultNull ? null : VeCt.CR_UNKNOWN;
	if (cr.cr) return Parser.crToNumber(cr.cr, opts);

	const parts = cr.trim().split("/").filter(Boolean);
	if (!parts.length || parts.length >= 3) return isDefaultNull ? null : VeCt.CR_CUSTOM;
	if (isNaN(parts[0])) return isDefaultNull ? null : VeCt.CR_CUSTOM;

	if (parts.length === 2) {
		if (isNaN(Number(parts[1]))) return isDefaultNull ? null : VeCt.CR_CUSTOM;
		return Number(parts[0]) / Number(parts[1]);
	}

	return Number(parts[0]);
};

Parser.numberToCr = function (number, safe) {
	// avoid dying if already-converted number is passed in
	if (safe && typeof number === "string" && Parser.CRS.includes(number)) return number;

	if (number == null) return "Unknown";

	return Parser.numberToFractional(number);
};

Parser.crToPb = function (cr) {
	const crNumber = Parser.crToNumber(cr);
	if (crNumber === VeCt.CR_UNKNOWN) return 0;
	if (crNumber === VeCt.CR_CUSTOM || crNumber < 0) return null;
	if (crNumber < 5) return 2;
	return Math.ceil(crNumber / 4) + 1;
};

Parser.levelToPb = function (level) {
	if (!level) return 2;
	return Math.ceil(level / 4) + 1;
};

Parser.SKILL_TO_ATB_ABV = {
	"运动": "str",
	"特技": "dex",
	"巧手": "dex",
	"隐匿": "dex",
	"奥秘": "int",
	"历史": "int",
	"调查": "int",
	"自然": "int",
	"宗教": "int",
	"驯兽": "wis",
	"洞悉": "wis",
	"医药": "wis",
	"察觉": "wis",
	"生存": "wis",
	"欺瞒": "cha",
	"威吓": "cha",
	"表演": "cha",
	"游说": "cha",
};

Parser.skillToAbilityAbv = function (skill) {
	return Parser._parse_aToB(Parser.SKILL_TO_ATB_ABV, skill);
};

Parser.EN_SKILL_TO_ATB_ABV = {
	"athletics": "str",
	"acrobatics": "dex",
	"sleight of hand": "dex",
	"stealth": "dex",
	"arcana": "int",
	"history": "int",
	"investigation": "int",
	"nature": "int",
	"religion": "int",
	"animal handling": "wis",
	"insight": "wis",
	"medicine": "wis",
	"perception": "wis",
	"survival": "wis",
	"deception": "cha",
	"intimidation": "cha",
	"performance": "cha",
	"persuasion": "cha",
}

Parser.enSkillToAbilityAbv = function (skill) {
	return Parser._parse_aToB(Parser.EN_SKILL_TO_ATB_ABV, skill);
};

Parser.SKILL_TO_CN = {
	"athletics": "运动",
	"acrobatics": "特技",
	"sleight of hand": "巧手",
	"stealth": "隐匿",
	"arcana": "奥秘",
	"history": "历史",
	"investigation": "调查",
	"nature": "自然",
	"religion": "宗教",
	"animal handling": "驯兽",
	"insight": "洞悉",
	"medicine": "医药",
	"perception": "察觉",
	"survival": "生存",
	"deception": "欺瞒",
	"intimidation": "威吓",
	"performance": "表演",
	"persuasion": "游说",
};

Parser.enSkillToCn = function (skill) {
	return Parser._parse_aToB(Parser.SKILL_TO_CN, skill);
};

Parser.cnSkillToEn = function (skill) {
	return Parser._parse_bToA(Parser.SKILL_TO_CN, skill);
};

Parser.SKILL_TO_SHORT = {
	"athletics": "运动",
	"acrobatics": "特技",
	"sleight of hand": "巧手",
	"stealth": "隐匿",
	"arcana": "奥秘",
	"history": "历史",
	"investigation": "调查",
	"nature": "自然",
	"religion": "宗教",
	"animal handling": "驯兽",
	"insight": "洞悉",
	"medicine": "医药",
	"perception": "察觉",
	"survival": "生存",
	"deception": "欺瞒",
	"intimidation": "威吓",
	"performance": "表演",
	"persuasion": "游说",
};

Parser.skillToShort = function (skill) {
	return Parser._parse_aToB(Parser.SKILL_TO_SHORT, skill);
};

Parser.LANGUAGES_STANDARD = [
	"Common",
	"Dwarvish",
	"Elvish",
	"Giant",
	"Gnomish",
	"Goblin",
	"Halfling",
	"Orc",
];
Parser.LANGUAGES_STANDARD_CN = [
	"通用语",
	"矮人语",
	"精灵语",
	"巨人语",
	"侏儒语",
	"地精语",
	"半人语",
	"兽人语",
];

Parser.LANGUAGES_EXOTIC = [
	"Abyssal",
	"Aquan",
	"Auran",
	"Celestial",
	"Draconic",
	"Deep Speech",
	"Ignan",
	"Infernal",
	"Primordial",
	"Sylvan",
	"Terran",
	"Undercommon",
];

Parser.LANGUAGES_EXOTIC_CN = [
	"深渊语",
	"水族语",
	"空气语",
	"天界语",
	"龙语",
	"深潜语",
	"火族语",
	"炼狱语",
	"原初语",
	"木族语",
	"土族语",
	"地底通用语",
];

Parser.LANGUAGES_SECRET = [
	"Druidic",
	"Thieves' cant",
];

Parser.LANGUAGES_SECRET_CN = [
	"德鲁伊语",
	"盗贼黑话",
];

Parser.LANGUAGES_ALL = [
	...Parser.LANGUAGES_STANDARD,
	...Parser.LANGUAGES_EXOTIC,
	...Parser.LANGUAGES_SECRET,
	...Parser.LANGUAGES_STANDARD_CN,
	...Parser.LANGUAGES_EXOTIC_CN,
	...Parser.LANGUAGES_SECRET_CN,
].sort();

Parser.acToFull = function (ac, {renderer = null, isHideFrom = false} = {}) {
	if (typeof ac === "string") return ac; // handle classic format

	renderer ||= Renderer.get();

	let stack = "";
	let inBraces = false;
	for (let i = 0; i < ac.length; ++i) {
		const cur = ac[i];
		const nxt = ac[i + 1];

		if (cur.special != null) {
			if (inBraces) inBraces = false;

			stack += cur.special;
		} else if (cur.ac) {
			const isNxtBraces = nxt && nxt.braces;

			if (!inBraces && cur.braces) {
				stack += "(";
				inBraces = true;
			}

			if (cur.condition) stack += `${renderer.render(cur.condition)}`;

			stack += cur.ac;

			if (!isHideFrom && cur.from) {
				// always brace nested braces
				if (cur.braces) {
					stack += " (";
				} else {
					stack += inBraces ? "; " : " (";
				}

				inBraces = true;

				stack += cur.from.map(it => renderer.render(it)).join(", ");

				if (cur.braces) {
					stack += ")";
				} else if (!isNxtBraces) {
					stack += ")";
					inBraces = false;
				}
			}

			if (inBraces && !isNxtBraces) {
				stack += ")";
				inBraces = false;
			}
		} else {
			stack += cur;
		}

		if (nxt) {
			if (nxt.braces) {
				stack += inBraces ? "; " : " (";
				inBraces = true;
			} else stack += ", ";
		}
	}
	if (inBraces) stack += ")";

	return stack.trim();
};

Parser.armorFullToAbv = function (armor) {
	return Parser._parse_bToA(Parser.ARMOR_ABV_TO_FULL, armor);
};

Parser.weaponFullToAbv = function (weapon) {
	return Parser._parse_bToA(Parser.WEAPON_ABV_TO_FULL, weapon);
};

Parser._getSourceStringFromSource = function (source) {
	if (source && source.source) return source.source;
	return source;
};
Parser._buildSourceCache = function (dict) {
	const out = {};
	Object.entries(dict).forEach(([k, v]) => out[k.toLowerCase()] = v);
	return out;
};
Parser._sourceJsonCache = null;
Parser.hasSourceJson = function (source) {
	Parser._sourceJsonCache = Parser._sourceJsonCache || Parser._buildSourceCache(Object.keys(Parser.SOURCE_JSON_TO_FULL).mergeMap(k => ({[k]: k})));
	return !!Parser._sourceJsonCache[source.toLowerCase()];
};
Parser._sourceFullCache = null;
Parser.hasSourceFull = function (source) {
	Parser._sourceFullCache = Parser._sourceFullCache || Parser._buildSourceCache(Parser.SOURCE_JSON_TO_FULL);
	return !!Parser._sourceFullCache[source.toLowerCase()];
};
Parser._sourceAbvCache = null;
Parser.hasSourceAbv = function (source) {
	Parser._sourceAbvCache = Parser._sourceAbvCache || Parser._buildSourceCache(Parser.SOURCE_JSON_TO_ABV);
	return !!Parser._sourceAbvCache[source.toLowerCase()];
};
Parser._sourceDateCache = null;
Parser.hasSourceDate = function (source) {
	Parser._sourceDateCache = Parser._sourceDateCache || Parser._buildSourceCache(Parser.SOURCE_JSON_TO_DATE);
	return !!Parser._sourceDateCache[source.toLowerCase()];
};
Parser.sourceJsonToJson = function (source) {
	source = Parser._getSourceStringFromSource(source);
	if (Parser.hasSourceJson(source)) return Parser._sourceJsonCache[source.toLowerCase()];
	if (typeof PrereleaseUtil !== "undefined" && PrereleaseUtil.hasSourceJson(source)) return PrereleaseUtil.sourceJsonToSource(source).json;
	if (typeof BrewUtil2 !== "undefined" && BrewUtil2.hasSourceJson(source)) return BrewUtil2.sourceJsonToSource(source).json;
	return source;
};
Parser.sourceJsonToFull = function (source) {
	source = Parser._getSourceStringFromSource(source);
	if (Parser.hasSourceFull(source)) return Parser._sourceFullCache[source.toLowerCase()].replace(/'/g, "\u2019");
	if (typeof PrereleaseUtil !== "undefined" && PrereleaseUtil.hasSourceJson(source)) return PrereleaseUtil.sourceJsonToFull(source).replace(/'/g, "\u2019");
	if (typeof BrewUtil2 !== "undefined" && BrewUtil2.hasSourceJson(source)) return BrewUtil2.sourceJsonToFull(source).replace(/'/g, "\u2019");
	return Parser._parse_aToB(Parser.SOURCE_JSON_TO_FULL, source).replace(/'/g, "\u2019");
};
Parser.sourceJsonToFullCompactPrefix = function (source) {
	return Parser.sourceJsonToFull(source)
		.replace(Parser.UA_PREFIX, Parser.UA_PREFIX_SHORT)
		.replace(/^Unearthed Arcana (\d+): /, "UA$1: ")
		.replace(Parser.AL_PREFIX, Parser.AL_PREFIX_SHORT)
		.replace(Parser.PS_PREFIX, Parser.PS_PREFIX_SHORT);
};
Parser.sourceJsonToAbv = function (source) {
	source = Parser._getSourceStringFromSource(source);
	if (Parser.hasSourceAbv(source)) return Parser._sourceAbvCache[source.toLowerCase()];
	if (typeof PrereleaseUtil !== "undefined" && PrereleaseUtil.hasSourceJson(source)) return PrereleaseUtil.sourceJsonToAbv(source);
	if (typeof BrewUtil2 !== "undefined" && BrewUtil2.hasSourceJson(source)) return BrewUtil2.sourceJsonToAbv(source);
	return Parser._parse_aToB(Parser.SOURCE_JSON_TO_ABV, source);
};
Parser.sourceJsonToDate = function (source) {
	source = Parser._getSourceStringFromSource(source);
	if (Parser.hasSourceDate(source)) return Parser._sourceDateCache[source.toLowerCase()];
	if (typeof PrereleaseUtil !== "undefined" && PrereleaseUtil.hasSourceJson(source)) return PrereleaseUtil.sourceJsonToDate(source);
	if (typeof BrewUtil2 !== "undefined" && BrewUtil2.hasSourceJson(source)) return BrewUtil2.sourceJsonToDate(source);
	return Parser._parse_aToB(Parser.SOURCE_JSON_TO_DATE, source, null);
};

Parser.sourceJsonToSourceClassname = function (source, {sourceJson = null} = {}) {
	sourceJson ||= Parser.sourceJsonToJson(source);
	return `ve-source__${sourceJson.replace(/[^A-Za-z0-9-_]/g, "_")}`;
};

Parser.sourceJsonToMarkerHtml = function (source, {isList = false, isStatsName = false, isAddBrackets = false, additionalStyles = ""} = {}) {
	source = Parser._getSourceStringFromSource(source);
	// TODO(Future) consider enabling this
	// if (SourceUtil.isPartneredSourceWotc(source)) return `<span class="ve-help-subtle ve-source-marker ${isList ? `ve-source-marker--list` : ""} ${isStatsName ? `ve-source-marker--stats-name` : ""} ve-source-marker--partnered ${additionalStyles}" title="D&amp;D Partnered Source">${isList ? "" : "["}✦${isList ? "" : "]"}</span>`;
	if (SourceUtil.isLegacySourceWotc(source)) return `<span class="ve-help-subtle ve-source-marker ${isList ? `ve-source-marker--list` : ""} ${isStatsName ? `ve-source-marker--stats-name` : ""} ve-source-marker--legacy ${additionalStyles}" title="过期资源">${isAddBrackets ? "[" : ""}ʟ${isAddBrackets ? "]" : ""}</span>`;
	return "";
};

Parser.stringToSlug = function (str) {
	// return str.trim().toLowerCase().toAscii().replace(/[^\w ]+/g, "").replace(/ +/g, "-");
	return str.trim().toLowerCase().toAscii().toUrlified().replace(/[^\w ]+/g, "").replace(/ +/g, "-");
};

Parser.stringToCasedSlug = function (str) {
	return str.toAscii().replace(/[^\w ]+/g, "").replace(/ +/g, "-");
};

Parser.ITEM_SPELLCASTING_FOCUS_CLASSES = ["Artificer", "Bard", "Cleric", "Druid", "Paladin", "Ranger", "Sorcerer", "Warlock", "Wizard"];
Parser.CLASSES_TO_CN = {
	"Artificer": "奇械师",
	"Bard": "吟游诗人",
	"Cleric": "牧师",
	"Druid": "德鲁伊",
	"Paladin": "圣武士",
	"Ranger": "游侠",
	"Sorcerer": "术士",
	"Warlock": "魔契师",
	"Wizard": "法师",
	"Rogue": "游荡者",
	"Fighter": "战士",
	"Barbarian": "狂战士",
	"Monk": "武僧",
};
Parser.itemValueToFull = function (item, opts = { isShortForm: false, isSmallUnits: false }) {
	return Parser._moneyToFull(item, "value", "valueMult", opts);
};

/**
 * @param item
 * @param {object} [opts]
 * @param {?boolean} [opts.isShortForm]
 * @param {?boolean} [opts.isSmallUnits]
 * @param {?number} [opts.multiplier]
 * @param {?string} [opts.styleHint]
 */
Parser.itemValueToFullMultiCurrency = function (
	item,
	opts = {
		isShortForm: false,
		isSmallUnits: false,
		multiplier: null,
		styleHint: null,
	},
) {
	return Parser._moneyToFullMultiCurrency(item, "value", "valueMult", opts);
};

Parser.itemVehicleCostsToFull = function (item, isShortForm) {
	return {
		travelCostFull: Parser._moneyToFull(item, "travelCost", "travelCostMult", {isShortForm}),
		shippingCostFull: Parser._moneyToFull(item, "shippingCost", "shippingCostMult", {isShortForm}),
	};
};

Parser.spellComponentCostToFull = function (item, isShortForm) {
	return Parser._moneyToFull(item, "cost", "costMult", {isShortForm});
};

Parser.vehicleCostToFull = function (item, isShortForm) {
	return Parser._moneyToFull(item, "cost", "costMult", {isShortForm});
};

Parser._moneyToFull = function (it, prop, propMult, opts = {isShortForm: false, isSmallUnits: false}) {
	if (it[prop] == null && it[propMult] == null) return "";
	if (it[prop] != null) {
		const {coin, mult} = Parser.getCurrencyAndMultiplier(it[prop], it.currencyConversion);
		return `${(it[prop] * mult).toLocaleStringVe()}${opts.isSmallUnits ? `<span class="small ve-ml-1">${coin}</span>` : ` ${coin}`}`;
	} else if (it[propMult] != null) return opts.isShortForm ? `×${it[propMult]}` : `基础加值 ×${it[propMult]}`;
	return "";
};

Parser._moneyToFullMultiCurrency = function (it, prop, propMult, {isShortForm, multiplier, styleHint} = {}) {
	styleHint ||= VetoolsConfig.get("styleSwitcher", "style");

	if (it[prop]) {
		const conversionTable = Parser.getCurrencyConversionTable(it.currencyConversion);

		const simplified = it.currencyConversion
			? CurrencyUtil.doSimplifyCoins(
				{
					// Assume the e.g. item's value is in the lowest available denomination
					[conversionTable[0]?.coin || "cp"]: it[prop] * (multiplier ?? conversionTable[0]?.mult ?? 1),
				},
				{
					currencyConversionId: it.currencyConversion,
				},
			)
			: CurrencyUtil.doSimplifyCoins({
				cp: it[prop] * (multiplier ?? 1),
			});

		return [...conversionTable]
			.reverse()
			.filter(meta => simplified[meta.coin])
			.map(meta => `${simplified[meta.coin].toLocaleStringVe()} ${styleHint === "classic" ? meta.coin : meta.coin.toUpperCase()}`)
			.join(", ");
	}

	if (it[prop] === 0) {
		return `0 ${styleHint === "classic" ? "gp" : "GP"}`;
	}

	if (it[propMult]) return isShortForm ? `×${it[propMult]}` : `基础加值 ×${it[propMult]}`;

	return "";
};

Parser.DEFAULT_CURRENCY_CONVERSION_TABLE = [
	{
		coin: "cp",
		mult: 1,
	},
	{
		coin: "sp",
		mult: 0.1,
	},
	{
		coin: "gp",
		mult: 0.01,
		isFallback: true,
	},
];
Parser.FULL_CURRENCY_CONVERSION_TABLE = [
	{
		coin: "cp",
		mult: 1,
	},
	{
		coin: "sp",
		mult: 0.1,
	},
	{
		coin: "ep",
		mult: 0.02,
	},
	{
		coin: "gp",
		mult: 0.01,
		isFallback: true,
	},
	{
		coin: "pp",
		mult: 0.001,
	},
];
Parser.getCurrencyConversionTable = function (currencyConversionId) {
	const fromPrerelease = currencyConversionId ? PrereleaseUtil.getMetaLookup("currencyConversions")?.[currencyConversionId] : null;
	const fromBrew = currencyConversionId ? BrewUtil2.getMetaLookup("currencyConversions")?.[currencyConversionId] : null;
	const conversionTable = fromPrerelease?.length
		? fromPrerelease
		: fromBrew?.length
			? fromBrew
			: Parser.DEFAULT_CURRENCY_CONVERSION_TABLE;
	if (conversionTable !== Parser.DEFAULT_CURRENCY_CONVERSION_TABLE) conversionTable.sort((a, b) => SortUtil.ascSort(b.mult, a.mult));
	return conversionTable;
};
Parser.getCurrencyAndMultiplier = function (value, currencyConversionId) {
	const conversionTable = Parser.getCurrencyConversionTable(currencyConversionId);

	if (!value) return conversionTable.find(it => it.isFallback) || conversionTable[0];
	if (conversionTable.length === 1) return conversionTable[0];
	if (!Number.isInteger(value) && value < conversionTable[0].mult) return conversionTable[0];

	for (let i = conversionTable.length - 1; i >= 0; --i) {
		if (Number.isInteger(value * conversionTable[i].mult)) return conversionTable[i];
	}

	return conversionTable.last();
};

Parser.COIN_ABVS = ["cp", "sp", "ep", "gp", "pp"];
Parser.COIN_ABV_TO_FULL = {
	"cp": "铜币",
	"sp": "银币",
	"ep": "银金币",
	"gp": "金币",
	"pp": "铂金币",
};
Parser.COIN_CONVERSIONS = [1, 10, 50, 100, 1000];

Parser.coinAbvToFull = function (coin) {
	return Parser._parse_aToB(Parser.COIN_ABV_TO_FULL, coin);
};

Parser.coinFullToAbv = function (coin) {
	return Parser._parse_bToA(Parser.COIN_ABV_TO_FULL, coin);
};
/**
 * @param currency Object of the form `{pp: <n>, gp: <m>, ... }`.
 * @param isDisplayEmpty If "empty" values (i.e., those which are 0) should be displayed.
 * @param styleHint
 */
Parser.getDisplayCurrency = function (currency, {isDisplayEmpty = false, styleHint = null} = {}) {
	styleHint ||= VetoolsConfig.get("styleSwitcher", "style");
	return [...Parser.COIN_ABVS]
		.reverse()
		.filter(abv => isDisplayEmpty ? currency[abv] != null : currency[abv])
		.map(abv => `${currency[abv].toLocaleStringVe()} ${styleHint === "classic" ? abv : abv.toUpperCase()}`)
		.join(", ");
};

Parser.itemWeightToFull = function (item, isShortForm) {
	if (item.weight) {
		// Handle pure integers
		if (Math.round(item.weight) === item.weight) return `${item.weight} 磅${(item.weightNote ? ` ${item.weightNote}` : "")}`;

		const integerPart = Math.floor(item.weight);

		// Attempt to render the amount as (a number +) a vulgar
		const vulgarGlyph = Parser.numberToVulgar(item.weight - integerPart, {isFallbackOnFractional: false});
		if (vulgarGlyph) return `${integerPart || ""}${vulgarGlyph} 磅${(item.weightNote ? ` ${item.weightNote}` : "")}`;

		// Fall back on decimal pounds or ounces
		return `${(item.weight < 1 ? item.weight * 16 : item.weight).toLocaleStringVe()} ${item.weight < 1 ? "盎司" : "磅"}${(item.weightNote ? ` ${item.weightNote}` : "")}`;
	}
	if (item.weightMult) return isShortForm ? `×${item.weightMult}` : `基础重量 ×${item.weightMult}`;
	return "";
};

Parser.ITEM_RECHARGE_TO_FULL = {
	round: "每轮",
	restShort: "短休后",
	restLong: "长休后",
	dawn: "黎明",
	dusk: "黄昏",
	midnight: "午夜",
	week: "每周",
	month: "每月",
	year: "每年",
	decade: "每十年",
	century: "每世纪",
	special: "特殊",
};
Parser.itemRechargeToFull = function (recharge) {
	return Parser._parse_aToB(Parser.ITEM_RECHARGE_TO_FULL, recharge);
};

Parser.ITEM_MISC_TAG_TO_FULL = {
	"CF/W": "创造食物/水",
	"CNS": "消耗品",
	"TT": "小装饰品",
};
Parser.itemMiscTagToFull = function (type) {
	return Parser._parse_aToB(Parser.ITEM_MISC_TAG_TO_FULL, type);
};

Parser.ITM_PROP_ABV__TWO_HANDED = "2H";
Parser.ITM_PROP_ABV__AMMUNITION = "A";
Parser.ITM_PROP_ABV__AMMUNITION_FUTURISTIC = "AF";
Parser.ITM_PROP_ABV__BURST_FIRE = "BF";
Parser.ITM_PROP_ABV__EXTENDED_REACH = "ER";
Parser.ITM_PROP_ABV__FINESSE = "F";
Parser.ITM_PROP_ABV__HEAVY = "H";
Parser.ITM_PROP_ABV__LIGHT = "L";
Parser.ITM_PROP_ABV__LOADING = "LD";
Parser.ITM_PROP_ABV__OTHER = "OTH";
Parser.ITM_PROP_ABV__REACH = "R";
Parser.ITM_PROP_ABV__RELOAD = "RLD";
Parser.ITM_PROP_ABV__SPECIAL = "S";
Parser.ITM_PROP_ABV__THROWN = "T";
Parser.ITM_PROP_ABV__VERSATILE = "V";
Parser.ITM_PROP_ABV__VESTIGE_OF_DIVERGENCE = "Vst";

Parser.ITM_PROP__TWO_HANDED = "2H";
Parser.ITM_PROP__AMMUNITION = "A";
Parser.ITM_PROP__AMMUNITION_FUTURISTIC = "AF|DMG";
Parser.ITM_PROP__BURST_FIRE = "BF|DMG";
Parser.ITM_PROP__FINESSE = "F";
Parser.ITM_PROP__HEAVY = "H";
Parser.ITM_PROP__LIGHT = "L";
Parser.ITM_PROP__LOADING = "LD";
Parser.ITM_PROP__OTHER = "OTH";
Parser.ITM_PROP__REACH = "R";
Parser.ITM_PROP__RELOAD = "RLD|DMG";
Parser.ITM_PROP__SPECIAL = "S";
Parser.ITM_PROP__THROWN = "T";
Parser.ITM_PROP__VERSATILE = "V";

Parser.ITM_PROP__ODND_TWO_HANDED = "2H|XPHB";
Parser.ITM_PROP__ODND_AMMUNITION = "A|XPHB";
Parser.ITM_PROP__ODND_FINESSE = "F|XPHB";
Parser.ITM_PROP__ODND_HEAVY = "H|XPHB";
Parser.ITM_PROP__ODND_LIGHT = "L|XPHB";
Parser.ITM_PROP__ODND_LOADING = "LD|XPHB";
Parser.ITM_PROP__ODND_REACH = "R|XPHB";
Parser.ITM_PROP__ODND_THROWN = "T|XPHB";
Parser.ITM_PROP__ODND_VERSATILE = "V|XPHB";

Parser.ITM_TYP_ABV__TREASURE = "$";
Parser.ITM_TYP_ABV__TREASURE_ART_OBJECT = "$A";
Parser.ITM_TYP_ABV__TREASURE_COINAGE = "$C";
Parser.ITM_TYP_ABV__TREASURE_GEMSTONE = "$G";
Parser.ITM_TYP_ABV__AMMUNITION = "A";
Parser.ITM_TYP_ABV__AMMUNITION_FUTURISTIC = "AF";
Parser.ITM_TYP_ABV__VEHICLE_AIR = "AIR";
Parser.ITM_TYP_ABV__ARTISAN_TOOL = "AT";
Parser.ITM_TYP_ABV__EXPLOSIVE = "EXP";
Parser.ITM_TYP_ABV__FOOD_AND_DRINK = "FD";
Parser.ITM_TYP_ABV__ADVENTURING_GEAR = "G";
Parser.ITM_TYP_ABV__GAMING_SET = "GS";
Parser.ITM_TYP_ABV__GENERIC_VARIANT = "GV";
Parser.ITM_TYP_ABV__HEAVY_ARMOR = "HA";
Parser.ITM_TYP_ABV__ILLEGAL_DRUG = "IDG";
Parser.ITM_TYP_ABV__INSTRUMENT = "INS";
Parser.ITM_TYP_ABV__LIGHT_ARMOR = "LA";
Parser.ITM_TYP_ABV__MELEE_WEAPON = "M";
Parser.ITM_TYP_ABV__MEDIUM_ARMOR = "MA";
Parser.ITM_TYP_ABV__MOUNT = "MNT";
Parser.ITM_TYP_ABV__OTHER = "OTH";
Parser.ITM_TYP_ABV__POTION = "P";
Parser.ITM_TYP_ABV__RANGED_WEAPON = "R";
Parser.ITM_TYP_ABV__ROD = "RD";
Parser.ITM_TYP_ABV__RING = "RG";
Parser.ITM_TYP_ABV__SHIELD = "S";
Parser.ITM_TYP_ABV__SCROLL = "SC";
Parser.ITM_TYP_ABV__SPELLCASTING_FOCUS = "SCF";
Parser.ITM_TYP_ABV__VEHICLE_WATER = "SHP";
Parser.ITM_TYP_ABV__VEHICLE_SPACE = "SPC";
Parser.ITM_TYP_ABV__TOOL = "T";
Parser.ITM_TYP_ABV__TACK_AND_HARNESS = "TAH";
Parser.ITM_TYP_ABV__TRADE_BAR = "TB";
Parser.ITM_TYP_ABV__TRADE_GOOD = "TG";
Parser.ITM_TYP_ABV__VEHICLE_LAND = "VEH";
Parser.ITM_TYP_ABV__WAND = "WD";

Parser.ITM_TYP__TREASURE = "$|DMG";
Parser.ITM_TYP__TREASURE_ART_OBJECT = "$A|DMG";
Parser.ITM_TYP__TREASURE_COINAGE = "$C";
Parser.ITM_TYP__TREASURE_GEMSTONE = "$G|DMG";
Parser.ITM_TYP__AMMUNITION = "A";
Parser.ITM_TYP__AMMUNITION_FUTURISTIC = "AF|DMG";
Parser.ITM_TYP__VEHICLE_AIR = "AIR|DMG";
Parser.ITM_TYP__ARTISAN_TOOL = "AT";
Parser.ITM_TYP__EXPLOSIVE = "EXP|DMG";
Parser.ITM_TYP__FOOD_AND_DRINK = "FD";
Parser.ITM_TYP__ADVENTURING_GEAR = "G";
Parser.ITM_TYP__GAMING_SET = "GS";
Parser.ITM_TYP__GENERIC_VARIANT = "GV|DMG";
Parser.ITM_TYP__HEAVY_ARMOR = "HA";
Parser.ITM_TYP__INSTRUMENT = "INS";
Parser.ITM_TYP__LIGHT_ARMOR = "LA";
Parser.ITM_TYP__MELEE_WEAPON = "M";
Parser.ITM_TYP__MEDIUM_ARMOR = "MA";
Parser.ITM_TYP__MOUNT = "MNT";
Parser.ITM_TYP__OTHER = "OTH";
Parser.ITM_TYP__POTION = "P";
Parser.ITM_TYP__RANGED_WEAPON = "R";
Parser.ITM_TYP__ROD = "RD|DMG";
Parser.ITM_TYP__RING = "RG|DMG";
Parser.ITM_TYP__SHIELD = "S";
Parser.ITM_TYP__SCROLL = "SC|DMG";
Parser.ITM_TYP__SPELLCASTING_FOCUS = "SCF";
Parser.ITM_TYP__VEHICLE_WATER = "SHP";
Parser.ITM_TYP__VEHICLE_SPACE = "SPC|AAG";
Parser.ITM_TYP__TOOL = "T";
Parser.ITM_TYP__TACK_AND_HARNESS = "TAH";
Parser.ITM_TYP__TRADE_GOOD = "TG";
Parser.ITM_TYP__VEHICLE_LAND = "VEH";
Parser.ITM_TYP__WAND = "WD|DMG";

Parser.ITM_TYP__ODND_TREASURE_ART_OBJECT = "$A|XDMG";
Parser.ITM_TYP__ODND_TREASURE_COINAGE = "$C|XPHB";
Parser.ITM_TYP__ODND_TREASURE_GEMSTONE = "$G|XDMG";
Parser.ITM_TYP__ODND_AMMUNITION = "A|XPHB";
Parser.ITM_TYP__ODND_AMMUNITION_FUTURISTIC = "AF|XDMG";
Parser.ITM_TYP__ODND_VEHICLE_AIR = "AIR|XPHB";
Parser.ITM_TYP__ODND_ARTISAN_TOOL = "AT|XPHB";
Parser.ITM_TYP__ODND_EXPLOSIVE = "EXP|XDMG";
Parser.ITM_TYP__ODND_FOOD_AND_DRINK = "FD|XPHB";
Parser.ITM_TYP__ODND_ADVENTURING_GEAR = "G|XPHB";
Parser.ITM_TYP__ODND_GAMING_SET = "GS|XPHB";
Parser.ITM_TYP__ODND_GENERIC_VARIANT = "GV|XDMG";
Parser.ITM_TYP__ODND_HEAVY_ARMOR = "HA|XPHB";
Parser.ITM_TYP__ODND_INSTRUMENT = "INS|XPHB";
Parser.ITM_TYP__ODND_LIGHT_ARMOR = "LA|XPHB";
Parser.ITM_TYP__ODND_MELEE_WEAPON = "M|XPHB";
Parser.ITM_TYP__ODND_MEDIUM_ARMOR = "MA|XPHB";
Parser.ITM_TYP__ODND_MOUNT = "MNT|XPHB";
Parser.ITM_TYP__ODND_POTION = "P|XPHB";
Parser.ITM_TYP__ODND_RANGED_WEAPON = "R|XPHB";
Parser.ITM_TYP__ODND_ROD = "RD|XDMG";
Parser.ITM_TYP__ODND_RING = "RG|XDMG";
Parser.ITM_TYP__ODND_SHIELD = "S|XPHB";
Parser.ITM_TYP__ODND_SCROLL = "SC|XPHB";
Parser.ITM_TYP__ODND_SPELLCASTING_FOCUS = "SCF|XPHB";
Parser.ITM_TYP__ODND_VEHICLE_WATER = "SHP|XPHB";
Parser.ITM_TYP__ODND_TOOL = "T|XPHB";
Parser.ITM_TYP__ODND_TACK_AND_HARNESS = "TAH|XPHB";
Parser.ITM_TYP__ODND_TRADE_BAR = "TB|XDMG";
Parser.ITM_TYP__ODND_TRADE_GOOD = "TG|XDMG";
Parser.ITM_TYP__ODND_VEHICLE_LAND = "VEH|XPHB";
Parser.ITM_TYP__ODND_WAND = "WD|XDMG";

Parser.ITM_RARITY_TO_SHORT = {
	"common": "常见",
	"uncommon": "不常见",
	"rare": "珍稀",
	"very rare": "非常珍稀",
	"legendary": "传说",
	"artifact": "神器",
	"varies": "多种",
};
Parser.itemRarityToShort = function (rarity) {
	if (!rarity) return rarity;
	if (Parser.ITM_RARITY_TO_SHORT[rarity]) return Parser.ITM_RARITY_TO_SHORT[rarity];
	if (rarity.length <= 4) return rarity.toTitleCase();
	return `${rarity.toTitleCase().slice(0, 3)}.`;
};

Parser._decimalSeparator = (0.1).toLocaleString().substring(1, 2);
Parser._numberCleanRegexp = Parser._decimalSeparator === "." ? new RegExp(/[\s,]*/g, "g") : new RegExp(/[\s.]*/g, "g");
Parser._costSplitRegexp = Parser._decimalSeparator === "." ? new RegExp(/(\d+(\.\d+)?)([csegp]p|金币|银币|铜币|铂金币|银金币|白金币)/) : new RegExp(/(\d+(,\d+)?)([csegp]p|金币|银币|铜币|铂金币|银金币|白金币)/);

/** input e.g. "25 gp", "1,000pp" */
Parser.coinValueToNumber = function (value) {
	if (!value) return 0;
	// handle oddities
	if (value === "Varies") return 0;

	value = value
		.replace(/\s*/, "")
		.replace(Parser._numberCleanRegexp, "")
		.toLowerCase();
	const m = Parser._costSplitRegexp.exec(value);
	if (!m) throw new Error(`Badly formatted value "${value}"`);
	const coinAbv = Parser.coinFullToAbv(m[3]);
	const ixCoin = Parser.COIN_ABVS.indexOf(coinAbv);
	if (!~ixCoin) throw new Error(`Unknown coin type "${m[3]}"`);
	return Number(m[1]) * Parser.COIN_CONVERSIONS[ixCoin];
};

Parser.weightValueToNumber = function (value) {
	if (!value) return 0;

	if (Number(value)) return Number(value);
	else throw new Error(`Badly formatted value ${value}`);
};

Parser.dmgTypeToFull = function (dmgType, {styleHint = null} = {}) {
	if (!dmgType) return dmgType;

	styleHint ||= VetoolsConfig.get("styleSwitcher", "style");

	const out = Parser._parse_aToB(Parser.DMGTYPE_JSON_TO_FULL, dmgType);
	if (styleHint !== "classic") return out.toTitleCase();
	return out;
};

Parser.skillProficienciesToFull = function (skillProficiencies, {styleHint = null} = {}) {
	styleHint ||= VetoolsConfig.get("styleSwitcher", "style");

	const ptSourceDefault = styleHint === "classic" ? Parser.SRC_PHB : Parser.SRC_XPHB;

	const getRenderedSkill = uid => {
		const unpacked = DataUtil.proxy.unpackUid("skill", uid, "skill");
		const ptSource = uid.includes("|")
			? unpacked.source
			: unpacked.source.toLowerCase() === Parser.SRC_PHB.toLowerCase()
				? ptSourceDefault
				: unpacked.source;
		return Renderer.get().render(`{@skill ${Parser.enSkillToCn(unpacked.name).toTitleCase()}|${ptSource}}`);
	};

	return skillProficiencies
		.map(skProf => {
			if (skProf.any) {
				skProf = MiscUtil.copyFast(skProf);
				skProf.choose = {"from": Object.keys(Parser.SKILL_TO_ATB_ABV), "count": skProf.any};
				delete skProf.any;
			}

			const keys = Object.keys(skProf).sort(SortUtil.ascSortLower);

			const ixChoose = keys.indexOf("choose");
			if (~ixChoose) keys.splice(ixChoose, 1);

			const baseStack = [];
			keys.filter(k => skProf[k]).forEach(k => baseStack.push(getRenderedSkill(k)));

			let ptChoose = "";
			if (~ixChoose) {
				const chObj = skProf.choose;
				const count = chObj.count ?? 1;
				if (chObj.from.length === 18) {
					ptChoose = styleHint === "classic"
						? `选择任意${count === 1 ? "技能" : `${chObj.count}个`}`
						: Renderer.get().render(`{@i 选择任意${chObj.count}个技能} (参考 {@book 第一章|XPHB|1|技能列表})`);
				} else {
					ptChoose = styleHint === "classic"
						? `从${chObj.from.map(it => getRenderedSkill(it)).joinConjunct(", ", " 和 ")}中选择 ${count} 个`
						: Renderer.get().render(`{@i 选择${count}个:} ${chObj.from.map(it => getRenderedSkill(it)).joinConjunct(", ", " 或 ")}`);
				}
			}

			const base = baseStack.joinConjunct("、", "和");

			if (baseStack.length && ptChoose.length) return `${base}；以及${ptChoose}`;
			else if (baseStack.length) return base;
			else if (ptChoose.length) return ptChoose;
		})
		.join(` <i>或</i> `);
};

// sp-prefix functions are for parsing spell data, and shared with the roll20 script
Parser.spSchoolAndSubschoolsAbvsToFull = function (school, subschools) {
	if (!subschools || !subschools.length) return Parser.spSchoolAbvToFull(school);
	else return `${Parser.spSchoolAbvToFull(school)} (${subschools.map(sub => Parser.spSchoolAbvToFull(sub)).join(", ")})`;
};

Parser.spSchoolAbvToFull = function (schoolOrSubschool) {
	const out = Parser._parse_aToB(Parser.SP_SCHOOL_ABV_TO_FULL, schoolOrSubschool);
	if (Parser.SP_SCHOOL_ABV_TO_FULL[schoolOrSubschool]) return out;
	if (PrereleaseUtil.getMetaLookup("spellSchools")?.[schoolOrSubschool]) return PrereleaseUtil.getMetaLookup("spellSchools")?.[schoolOrSubschool].full;
	if (BrewUtil2.getMetaLookup("spellSchools")?.[schoolOrSubschool]) return BrewUtil2.getMetaLookup("spellSchools")?.[schoolOrSubschool].full;
	return out;
};

Parser.spSchoolAndSubschoolsAbvsShort = function (school, subschools) {
	if (!subschools || !subschools.length) return Parser.spSchoolAbvToShort(school);
	else return `${Parser.spSchoolAbvToShort(school)} (${subschools.map(sub => Parser.spSchoolAbvToShort(sub)).join(", ")})`;
};

Parser.spSchoolAbvToShort = function (school) {
	const out = Parser._parse_aToB(Parser.SP_SCHOOL_ABV_TO_SHORT, school);
	if (Parser.SP_SCHOOL_ABV_TO_SHORT[school]) return out;
	if (PrereleaseUtil.getMetaLookup("spellSchools")?.[school]) return PrereleaseUtil.getMetaLookup("spellSchools")?.[school].short;
	if (BrewUtil2.getMetaLookup("spellSchools")?.[school]) return BrewUtil2.getMetaLookup("spellSchools")?.[school].short;
	if (out.length <= 4) return out;
	return `${out.slice(0, 3)}.`;
};

Parser.spSchoolAbvToStyle = function (school) { // For prerelease/homebrew
	return Parser._colorableMetaAbvToStyle({key: school, prop: "spellSchools"});
};

Parser.spSchoolAbvToStylePart = function (school) { // For prerelease/homebrew
	return Parser._colorableMetaAbvToStylePart({key: school, prop: "spellSchools"});
};

Parser._colorableMetaAbvToStyle = function ({key, prop}) {
	const stylePart = Parser._colorableMetaAbvToStylePart({key, prop});
	if (!stylePart) return stylePart;
	return `style="${stylePart}"`;
};

Parser._colorableMetaAbvToStylePart = function ({key, prop}) {
	return Parser._colorableMetaAbvToStylePart_prereleaseBrew({key, prop, brewUtil: PrereleaseUtil})
		|| Parser._colorableMetaAbvToStylePart_prereleaseBrew({key, prop, brewUtil: BrewUtil2})
		|| "";
};

Parser._colorableMetaAbvToStylePart_prereleaseBrew = function ({key, prop, brewUtil}) {
	const rawColor = brewUtil.getMetaLookup(prop)?.[key]?.color;
	if (!rawColor || !rawColor.trim()) return "";
	const validColor = BrewUtilShared.getValidColor(rawColor);
	if (validColor.length) return MiscUtil.getColorStylePart(validColor);
};

Parser.getOrdinalForm = function (i) {
	i = Number(i);
	if (isNaN(i)) return "";
	// const j = i % 10; const k = i % 100;
	// if (j === 1 && k !== 11) return `${i}st`;
	// if (j === 2 && k !== 12) return `${i}nd`;
	// if (j === 3 && k !== 13) return `${i}rd`;
	// return `${i}th`;
	return `${i}`;
};

Parser.spLevelToFull = function (level) {
	if (level === 0) return "戏法";
	else return `${Parser.getOrdinalForm(level)}环`;
};

Parser.getArticle = function (str) {
	str = `${str}`;
	str = str.replace(/\d+/g, (...m) => Parser.numberToText(m[0]));
	// return /^[aeiou]/i.test(str) ? "an" : "a";
	return "一个";
};

Parser.spLevelToFullLevelText = function (level) {
	return level === 0 ? "戏法" : `${Parser.spLevelToFull(level)}法术`;
};

Parser.spLevelToSpellPoints = function (lvl) {
	lvl = Number(lvl);
	if (isNaN(lvl) || lvl === 0) return 0;
	return Math.ceil(1.34 * lvl);
};

Parser.spMetaToArr = function (meta) {
	if (!meta) return [];
	return Object.entries(meta)
		.filter(([_, v]) => v)
		.sort(SortUtil.ascSort)
		.map(([k]) => k === "ritual" ? "仪式" : (k === "technomagic" ? "技术" : k));
};

Parser.spMetaToFull = function (meta) {
	if (!meta) return "";
	const metaTags = Parser.spMetaToArr(meta);
	if (metaTags.length) return ` (${metaTags.join(", ")})`;
	return "";
};

Parser.spLevelSchoolMetaToFull = function (level, school, meta, subschools) {
	const levelPart = level === 0 ? Parser.spLevelToFull(level).toLowerCase() : `${Parser.spLevelToFull(level)}`;
	const levelSchoolStr = level === 0 ? `${Parser.spSchoolAbvToFull(school)} ${levelPart}` : `${levelPart} ${Parser.spSchoolAbvToFull(school).toLowerCase()}`;

	const metaArr = Parser.spMetaToArr(meta);
	if (metaArr.length || (subschools && subschools.length)) {
		const metaAndSubschoolPart = [
			(subschools || []).map(sub => Parser.spSchoolAbvToFull(sub)).join(", "),
			metaArr.join(", "),
		].filter(Boolean).join("; ").toLowerCase();
		return `${levelSchoolStr} (${metaAndSubschoolPart})`;
	}
	return levelSchoolStr;
};

Parser.spTimeListToFull = function (times, isStripTags) {
	return times.map(t => `${Parser.getTimeToFull(t)}${t.condition ? `，${isStripTags ? Renderer.stripTags(t.condition) : Renderer.get().render(t.condition)}` : ""}`).join("或");
};

Parser.spTimeFullToUnit = function (timeFull) {
	return Parser._parse_bToA(Parser.SP_TIME_TO_FULL, timeFull);
};

Parser.getTimeToFull = function (time) {
	return `${time.number ? `${time.number} ` : ""}${Parser.spTimeUnitToFull(time.unit)}`;
};

Parser.getMinutesToFull = function (mins, {isShort = false} = {}) {
	const days = Math.floor(mins / (24 * 60));
	mins = mins % (24 * 60);

	const hours = Math.floor(mins / 60);
	mins = mins % 60;

	return [
		days ? `${days} ${isShort ? `d` : `天`}` : null,
		hours ? `${hours} ${isShort ? `h` : `小时`}` : null,
		mins ? `${mins} ${isShort ? `m` : `分钟`}` : null,
	].filter(Boolean)
		.join(" ");
};

Parser.RNG_SPECIAL = "special";
Parser.RNG_POINT = "point";
Parser.RNG_LINE = "line";
Parser.RNG_CUBE = "cube";
Parser.RNG_CONE = "cone";
Parser.RNG_EMANATION = "emanation";
Parser.RNG_RADIUS = "radius";
Parser.RNG_SPHERE = "sphere";
Parser.RNG_HEMISPHERE = "hemisphere";
Parser.RNG_CYLINDER = "cylinder"; // homebrew only
Parser.RNG_SELF = "self";
Parser.RNG_SIGHT = "sight";
Parser.RNG_UNLIMITED = "unlimited";
Parser.RNG_UNLIMITED_SAME_PLANE = "plane";
Parser.RNG_TOUCH = "touch";
Parser.SP_RANGE_TYPE_TO_FULL = {
	[Parser.RNG_SPECIAL]: "特殊",
	[Parser.RNG_POINT]: "点状",
	[Parser.RNG_LINE]: "线状",
	[Parser.RNG_CUBE]: "立方",
	[Parser.RNG_CONE]: "锥状",
	[Parser.RNG_RADIUS]: "半径",
	[Parser.RNG_EMANATION]: "光环",
	[Parser.RNG_SPHERE]: "球状",
	[Parser.RNG_HEMISPHERE]: "半球",
	[Parser.RNG_CYLINDER]: "柱状",
	[Parser.RNG_SELF]: "自身",
	[Parser.RNG_SIGHT]: "视野",
	[Parser.RNG_UNLIMITED]: "无限",
	[Parser.RNG_UNLIMITED_SAME_PLANE]: "在同一位面上无限",
	[Parser.RNG_TOUCH]: "触及",
};

Parser.spRangeTypeToFull = function (range) {
	return Parser._parse_aToB(Parser.SP_RANGE_TYPE_TO_FULL, range);
};

Parser.UNT_LBS = "lbs";
Parser.UNT_TONS_IMPERIAL = "tns";
Parser.UNT_TONS_METRIC = "Mg";

Parser.UNT_INCHES = "inches";
Parser.UNT_FEET = "feet";
Parser.UNT_YARDS = "yards";
Parser.UNT_MILES = "miles";

Parser.UNT_CUBIC_FEET = "cubic feet";

Parser.getNormalizedUnit = function (unit) {
	if (unit == null) return unit;

	unit = unit.toLowerCase().trim();

	switch (unit) {
		case "英寸": case "寸": case "inch": case "in.": case "in": case Parser.UNT_INCHES: return Parser.UNT_INCHES;
		case "英尺": case "尺": case "foot": case "ft.": case "ft": case Parser.UNT_FEET: return Parser.UNT_FEET;
		case "码": case "yard": case "yd.": case "yd": case Parser.UNT_YARDS: return Parser.UNT_YARDS;
		case "英里": case "里": case "mile": case "mi.": case "mi": case Parser.UNT_MILES: return Parser.UNT_MILES;

		case "英磅": case "磅": case "pound": case "pounds": case "lbs.": case "lb.": case "lb": case Parser.UNT_LBS: return Parser.UNT_LBS;
		default: return unit;
	}
};

Parser.SP_DIST_TYPE_TO_FULL = {
	[Parser.UNT_INCHES]: "寸",
	[Parser.UNT_FEET]: "尺",
	[Parser.UNT_YARDS]: "码",
	[Parser.UNT_MILES]: "里",
	[Parser.RNG_SELF]: Parser.SP_RANGE_TYPE_TO_FULL[Parser.RNG_SELF],
	[Parser.RNG_TOUCH]: Parser.SP_RANGE_TYPE_TO_FULL[Parser.RNG_TOUCH],
	[Parser.RNG_SIGHT]: Parser.SP_RANGE_TYPE_TO_FULL[Parser.RNG_SIGHT],
	[Parser.RNG_UNLIMITED]: Parser.SP_RANGE_TYPE_TO_FULL[Parser.RNG_UNLIMITED],
	[Parser.RNG_UNLIMITED_SAME_PLANE]: Parser.SP_RANGE_TYPE_TO_FULL[Parser.RNG_UNLIMITED_SAME_PLANE],
};

Parser.spDistanceTypeToFull = function (range) {
	return Parser._parse_aToB(Parser.SP_DIST_TYPE_TO_FULL, range);
};

Parser.SP_RANGE_TO_ICON = {
	[Parser.RNG_SPECIAL]: "fa-star",
	[Parser.RNG_POINT]: "",
	[Parser.RNG_LINE]: "fa-grip-lines-vertical",
	[Parser.RNG_CUBE]: "fa-cube",
	[Parser.RNG_CONE]: "fa-traffic-cone",
	[Parser.RNG_EMANATION]: "fa-hockey-puck",
	[Parser.RNG_RADIUS]: "fa-hockey-puck",
	[Parser.RNG_SPHERE]: "fa-globe",
	[Parser.RNG_HEMISPHERE]: "fa-globe",
	[Parser.RNG_CYLINDER]: "fa-database",
	[Parser.RNG_SELF]: "fa-street-view",
	[Parser.RNG_SIGHT]: "fa-eye",
	[Parser.RNG_UNLIMITED_SAME_PLANE]: "fa-earth-americas",
	[Parser.RNG_UNLIMITED]: "fa-infinity",
	[Parser.RNG_TOUCH]: "fa-hand",
};

Parser.spRangeTypeToIcon = function (range) {
	return Parser._parse_aToB(Parser.SP_RANGE_TO_ICON, range);
};

Parser.spRangeToShortHtml = function (range) {
	switch (range.type) {
		case Parser.RNG_SPECIAL: return `<span class="fas fa-fw ${Parser.spRangeTypeToIcon(range.type)} ve-help-subtle" title="特殊"></span>`;
		case Parser.RNG_POINT: return Parser.spRangeToShortHtml._renderPoint(range);
		case Parser.RNG_LINE:
		case Parser.RNG_CUBE:
		case Parser.RNG_CONE:
		case Parser.RNG_EMANATION:
		case Parser.RNG_RADIUS:
		case Parser.RNG_SPHERE:
		case Parser.RNG_HEMISPHERE:
		case Parser.RNG_CYLINDER:
			return Parser.spRangeToShortHtml._renderArea(range);
	}
};
Parser.spRangeToShortHtml._renderPoint = function (range) {
	const dist = range.distance;
	switch (dist.type) {
		case Parser.RNG_SELF:
		case Parser.RNG_SIGHT:
		case Parser.RNG_UNLIMITED:
		case Parser.RNG_UNLIMITED_SAME_PLANE:
		case Parser.RNG_SPECIAL:
		case Parser.RNG_TOUCH: return `<span class="fas fa-fw ${Parser.spRangeTypeToIcon(dist.type)} ve-help-subtle" title="${Parser.spRangeTypeToFull(dist.type)}"></span>`;
		case Parser.UNT_INCHES:
		case Parser.UNT_FEET:
		case Parser.UNT_YARDS:
		case Parser.UNT_MILES:
		default:
			return `${dist.amount} <span class="ve-small">${Parser.getSingletonUnit(dist.type, true)}</span>`;
	}
};
Parser.spRangeToShortHtml._renderArea = function (range) {
	const size = range.distance;
	return `<span class="fas fa-fw ${Parser.spRangeTypeToIcon(Parser.RNG_SELF)} ve-help-subtle" title="自身"></span> ${size.amount}<span class="ve-small">-${Parser.getSingletonUnit(size.type, true)}</span> ${Parser.spRangeToShortHtml._getAreaStyleString(range)}`;
};
Parser.spRangeToShortHtml._getAreaStyleString = function (range) {
	return `<span class="fas fa-fw ${Parser.spRangeTypeToIcon(range.type)} ve-help-subtle" title="${Parser.spRangeTypeToFull(range.type)}"></span>`;
};

Parser.spRangeToFull = function (range, {styleHint, isDisplaySelfArea = false} = {}) {
	styleHint ||= VetoolsConfig.get("styleSwitcher", "style");

	switch (range.type) {
		case Parser.RNG_SPECIAL: return Parser.spRangeTypeToFull(range.type);
		case Parser.RNG_POINT: return Parser.spRangeToFull._renderPoint(range);
		case Parser.RNG_LINE:
		case Parser.RNG_CUBE:
		case Parser.RNG_CONE:
		case Parser.RNG_EMANATION:
		case Parser.RNG_RADIUS:
		case Parser.RNG_SPHERE:
		case Parser.RNG_HEMISPHERE:
		case Parser.RNG_CYLINDER:
			return Parser.spRangeToFull._renderArea({range, styleHint, isDisplaySelfArea});
	}
};
Parser.spRangeToFull._renderPoint = function (range) {
	const dist = range.distance;
	switch (dist.type) {
		case Parser.RNG_SELF:
		case Parser.RNG_SIGHT:
		case Parser.RNG_UNLIMITED:
		case Parser.RNG_UNLIMITED_SAME_PLANE:
		case Parser.RNG_SPECIAL:
		case Parser.RNG_TOUCH: return Parser.spRangeTypeToFull(dist.type);
		case Parser.UNT_INCHES:
		case Parser.UNT_FEET:
		case Parser.UNT_YARDS:
		case Parser.UNT_MILES:
		default:
			return `${dist.amount} ${dist.amount === 1 ? Parser.getSingletonUnit(dist.type) : Parser.spDistanceTypeToFull(dist.type)}`;
	}
};
Parser.spRangeToFull._renderArea = function ({range, styleHint, isDisplaySelfArea = false}) {
	if (styleHint !== "classic" && !isDisplaySelfArea) return "自身";
	const size = range.distance;
	return `自身 (${size.amount}-${Parser.getSingletonUnit(size.type)}${Parser.spRangeToFull._getAreaStyleString(range)}${range.type === Parser.RNG_CYLINDER ? `${size.amountSecondary != null && size.typeSecondary != null ? `, ${size.amountSecondary}-${Parser.getSingletonUnit(size.typeSecondary)}-高` : ""} 圆柱体` : ""})`;
};
Parser.spRangeToFull._getAreaStyleString = function (range) {
	switch (range.type) {
		case Parser.RNG_SPHERE: return " 半径";
		case Parser.RNG_HEMISPHERE: return `-半径 ${Parser.spRangeTypeToFull(range.type)}`;
		case Parser.RNG_CYLINDER: return "-半径";
		default: return ` ${Parser.spRangeTypeToFull(range.type)}`;
	}
};

Parser.getSingletonUnit = function (unit, isShort) {
	if (!unit) return unit;
	switch (unit) {
		case Parser.UNT_INCHES:
			return "寸";
		case Parser.UNT_FEET:
			return "尺";
		case Parser.UNT_YARDS:
			return "码";
		case Parser.UNT_MILES:
			return "里";
		default: {
			const fromPrerelease = Parser._getSingletonUnit_prereleaseBrew({unit, isShort, brewUtil: PrereleaseUtil});
			if (fromPrerelease) return fromPrerelease;

			const fromBrew = Parser._getSingletonUnit_prereleaseBrew({unit, isShort, brewUtil: BrewUtil2});
			if (fromBrew) return fromBrew;

			if (unit.charAt(unit.length - 1) === "s") return unit.slice(0, -1);
			return unit;
		}
	}
};

Parser._getSingletonUnit_prereleaseBrew = function ({unit, isShort, brewUtil}) {
	const fromBrew = brewUtil.getMetaLookup("spellDistanceUnits")?.[unit]?.["singular"];
	if (fromBrew) return fromBrew;
};

Parser.getInchesToFull = function (inches) {
	const feet = Math.floor(inches / 12);
	inches = inches % 12;

	return [
		feet ? `${feet} 尺` : null,
		inches ? `${Parser.numberToVulgar(inches)} 寸` : null,
	].filter(Boolean)
		.join(" ");
};

Parser.spComponentsToFull = function (comp, level, {isPlainText = false} = {}) {
	if (!comp) return "无";
	const out = [];
	if (comp.v) out.push("声音");
	if (comp.s) out.push("姿势");
	if (comp.m != null) {
		const fnRender = isPlainText ? Renderer.stripTags.bind(Renderer) : Renderer.get().render.bind(Renderer.get());
		out.push(`材料${comp.m !== true ? ` (${fnRender(comp.m.text != null ? comp.m.text : comp.m)})` : ""}`);
	}
	if (comp.r) out.push(`版税（${level} 金币）`);
	return out.join(", ") || "无";
};

Parser.SP_END_TYPE_TO_FULL = {
	"dispel": "被解除",
	"trigger": "触发",
	"discharge": "耗尽",
};
Parser.spEndTypeToFull = function (type) {
	return Parser._parse_aToB(Parser.SP_END_TYPE_TO_FULL, type);
};

Parser.spDurationToFull = function (durations, {isPlainText = false, styleHint} = {}) {
	styleHint ||= VetoolsConfig.get("styleSwitcher", "style");

	const entriesMeta = Renderer.generic.getRenderableDurationEntriesMeta(durations, {styleHint});

	if (isPlainText) return Renderer.stripTags(entriesMeta.entryDuration);
	return Renderer.get().render(entriesMeta.entryDuration);
};

Parser.DURATION_TYPES = [
	{type: "instant", full: "立即"},
	{type: "timed", hasAmount: true, full: "一段时间"},
	{type: "permanent", hasEnds: true, full: "永久"},
	{type: "special", full: "特殊"},
];

Parser.DURATION_AMOUNT_TYPES = [
	"轮",
	"回合",
	"分钟",
	"小时",
	"天",
	"周",
	"月",
	"年",
];

Parser.spClassesToFull = function (sp, {isTextOnly = false, subclassLookup = {}} = {}) {
	const fromSubclassList = Renderer.spell.getCombinedClasses(sp, "fromSubclass");
	const fromSubclasses = Parser.spSubclassesToFull(fromSubclassList, {isTextOnly, subclassLookup});
	const fromClassList = Renderer.spell.getCombinedClasses(sp, "fromClassList");
	return `${Parser.spMainClassesToFull(fromClassList, {isTextOnly})}${fromSubclasses ? `, ${fromSubclasses}` : ""}`;
};

Parser.spMainClassesToFull = function (fromClassList, {isTextOnly = false, isIncludeSource = false} = {}) {
	return fromClassList
		.map(clsStub => ({hash: UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_CLASSES](clsStub), clsStub}))
		.filter(it => !ExcludeUtil.isInitialised || !ExcludeUtil.isExcluded(it.hash, "class", it.clsStub.source))
		.sort((a, b) => SortUtil.ascSort(a.clsStub.name, b.clsStub.name))
		.map(it => {
			if (isTextOnly) {
				if (isIncludeSource) return `${it.clsStub.name} (${Parser.sourceJsonToAbv(it.clsStub.source)})`;
				return it.clsStub.name;
			}

			const definedInSource = it.clsStub.definedInSource || it.clsStub.source;
			const ptLink = Renderer.get().render(`{@class ${it.clsStub.name}|${it.clsStub.source}}`);
			const ptSource = isIncludeSource ? ` (${Parser.sourceJsonToAbv(it.clsStub.source)})` : "";
			const ptTitle = definedInSource === it.clsStub.source ? `职业来源及法术列表见于：${Parser.sourceJsonToFull(definedInSource)}。` : `职业来源：${Parser.sourceJsonToFull(it.clsStub.source)}。法术列表见于：${Parser.sourceJsonToFull(definedInSource)}。`;
			return `<span title="${ptTitle.qq()}">${ptLink}${ptSource}</span>`;
		})
		.join(", ") || "";
};

Parser.spSubclassesToFull = function (fromSubclassList, {isTextOnly = false, isIncludeSource = false, subclassLookup = {}} = {}) {
	return fromSubclassList
		.filter(mt => {
			if (!ExcludeUtil.isInitialised) return true;
			const excludeClass = ExcludeUtil.isExcluded(UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_CLASSES](mt.class), "class", mt.class.source);
			if (excludeClass) return false;

			return !ExcludeUtil.isExcluded(
				UrlUtil.URL_TO_HASH_BUILDER["subclass"]({
					shortName: mt.subclass.name,
					source: mt.subclass.source,
					className: mt.class.name,
					classSource: mt.class.source,
				}),
				"subclass",
				mt.subclass.source,
				{isNoCount: true},
			);
		})
		.sort((a, b) => {
			const byName = SortUtil.ascSort(a.class.name, b.class.name);
			return byName || SortUtil.ascSort(a.subclass.name, b.subclass.name);
		})
		.map(c => Parser._spSubclassItem({fromSubclass: c, isTextOnly, isIncludeSource}))
		.join(", ") || "";
};

Parser._spSubclassItem = function ({fromSubclass, isTextOnly = false, isIncludeSource = false}) {
	const c = fromSubclass.class;
	const sc = fromSubclass.subclass;
	const text = `${sc.shortName}${sc.subSubclass ? ` (${sc.subSubclass})` : ""}`;
	if (isTextOnly) {
		if (isIncludeSource) return `${text} (${Parser.sourceJsonToAbv(sc.source)})`;
		return text;
	}

	const ptClass = `<span title="来源：${Parser.sourceJsonToFull(c.source)}${c.definedInSource ? ` 职业法术列表定义于：${Parser.sourceJsonToFull(c.definedInSource)}` : ""}">${Renderer.get().render(`{@class ${c.name}|${c.source}}`)}</span>`;
	const ptSource = isIncludeSource ? ` (${Parser.sourceJsonToAbv(sc.source)})` : "";

	return `<span class="ve-italic" title="来源：${Parser.sourceJsonToFull(fromSubclass.subclass.source)}">${Renderer.get().render(`{@class ${c.name}|${c.source}|${text}|${sc.shortName}|${sc.source}}`)}</span>${isIncludeSource ? ptSource : ""} ${ptClass}`;
};

Parser.SPELL_ATTACK_TYPE_TO_FULL = {};
Parser.SPELL_ATTACK_TYPE_TO_FULL["M"] = "近战";
Parser.SPELL_ATTACK_TYPE_TO_FULL["R"] = "远程";
Parser.SPELL_ATTACK_TYPE_TO_FULL["O"] = "其他/不明";

Parser.spAttackTypeToFull = function (type) {
	return Parser._parse_aToB(Parser.SPELL_ATTACK_TYPE_TO_FULL, type);
};

Parser.SPELL_AREA_TYPE_TO_FULL = {
	"ST": "单目标",
	"MT": "多目标",
	"C": "立方",
	"N": "锥状",
	"Y": "柱状",
	"S": "球状",
	"R": "圆形",
	"Q": "方形",
	"L": "线状",
	"H": "半球",
	"W": "墙壁",
	"E": "光环",
};
Parser.spAreaTypeToFull = function (type) {
	return Parser._parse_aToB(Parser.SPELL_AREA_TYPE_TO_FULL, type);
};

Parser.SP_MISC_TAG_TO_FULL = {
	"HL": "治疗",
	"THP": "提供临时生命值",
	"SGT": "需要视野",
	"PRM": "永久效应",
	"SCL": "动态变化的效应",
	"SCT": "可扩展目标",
	"SMN": "召唤生物",
	"MAC": "改变AC",
	"TP": "传送",
	"FMV": "强制移动",
	"RO": "骰点效应",
	"LGTS": "制造阳光",
	"LGT": "制造光亮",
	"UA": "使用动作",
	"UBA": "使用附赠动作",
	"PS": "位面传送",
	"OBS": "遮蔽视野",
	"DFT": "困难地形",
	"AAD": "额外攻击伤害",
	"OBJ": "影响物品",
	"ADV": "提供优势",
	"PIR": "重复施法使效用永久",
	"BO": "点燃物品",
};
Parser.spMiscTagToFull = function (type) {
	return Parser._parse_aToB(Parser.SP_MISC_TAG_TO_FULL, type);
};

Parser.SP_CASTER_PROGRESSION_TO_FULL = {
	full: "完整施法者",
	"1/2": "半施法者",
	"1/3": "三分之一施法者",
	"pact": "魔契施法",
};
Parser.spCasterProgressionToFull = function (type) {
	return Parser._parse_aToB(Parser.SP_CASTER_PROGRESSION_TO_FULL, type);
};

// mon-prefix functions are for parsing monster data, and shared with the roll20 script
Parser.monTypeToFullObj = function (type) {
	const out = {
		types: [],
		tags: [],
		asText: "",
		asTextShort: "",

		typeSidekick: null,
		tagsSidekick: [],
		asTextSidekick: null,
	};
	if (type == null) return out;

	// handles e.g. "fey"
	if (typeof type === "string") {
		out.types = [type];
		out.asText = Parser.monTypeToPlural(type) || type.toTitleCase();
		out.asTextShort = out.asText;
		return out;
	}

	if (type.type?.choose) {
		out.types = type.type.choose;
	} else {
		out.types = [type.type];
	}

	if (type.swarmSize) {
		out.tags.push("集群");
		out.asText = `${Parser.sizeAbvToFull(type.swarmSize)}${out.types.map(typ => Parser.monTypeToPlural(typ).toTitleCase()).joinConjunct(", ", " 或 ")}集群`;
		out.asTextShort = out.asText;
		out.swarmSize = type.swarmSize;
	} else {
		out.asText = out.types.map(typ => Parser.monTypeToPlural(typ)).joinConjunct(", ", " 或 ");
		out.asTextShort = out.asText;
	}

	const tagMetas = Parser.monTypeToFullObj._getTagMetas(type.tags);
	if (tagMetas.length) {
		out.tags.push(...tagMetas.flatMap(({filterTags}) => filterTags));
		const ptTags = ` (${tagMetas.map(({displayTag}) => displayTag).join(", ")})`;
		out.asText += ptTags;
		out.asTextShort += ptTags;
	}

	if (type.note) out.asText += ` ${type.note}`;

	// region Sidekick
	if (type.sidekickType) {
		out.typeSidekick = type.sidekickType;
		if (!type.sidekickHidden) out.asTextSidekick = `${Parser.MON_SIDEKICK_TO_CN[type.sidekickType] || type.sidekickType}`;

		const tagMetas = Parser.monTypeToFullObj._getTagMetas(type.sidekickTags);
		if (tagMetas.length) {
			out.tagsSidekick.push(...tagMetas.flatMap(({filterTags}) => filterTags));
			if (!type.sidekickHidden) out.asTextSidekick += ` (${tagMetas.map(({displayTag}) => displayTag).join(", ")})`;
		}
	}
	// endregion

	return out;
};

Parser.monTypeToFullObj._getTagMetas = (tags) => {
	return tags
		? tags.map(tag => {
			if (typeof tag === "string") { // handles e.g. "Fiend (Devil)"
				return {
					filterTags: [tag.toLowerCase()],
					displayTag: tag.toTitleCase(),
				};
			}

			// handles e.g. drow -> "Humanoid (Elf)"
			if (tag.prefixHidden) {
				return {
					filterTags: [
						tag.tag.toLowerCase(),
						`${tag.prefix}${tag.tag}`.toLowerCase(),
					],
					displayTag: tag.tag.toTitleCase(),
				};
			}

			// handles e.g. "Humanoid (Chondathan Human)"
			return {
				filterTags: [
					tag.tag.toLowerCase(),
					`${tag.prefix}${tag.tag}`.toLowerCase(),
				],
				displayTag: `${tag.prefix}${tag.tag}`.toTitleCase(),
			};
		})
		: [];
};

Parser.monTypeToPlural = function (type) {
	return Parser._parse_aToB(Parser.MON_TYPE_TO_PLURAL, type);
};

Parser.monTypeFromPlural = function (type) {
	return Parser._parse_bToA(Parser.MON_TYPE_TO_PLURAL, type);
};

/* -------------------------------------------- */

Parser._getFullImmRes_isSimpleTerm = val => {
	if (typeof val === "string" || val.special) return true;
	const prop = Parser._getFullImmRes_getNextProp(val);
	return prop == null;
};

Parser._getFullImmRes_getNextProp = obj => ["immune", "resist", "vulnerable", "conditionImmune"].find(prop => prop in obj) || null;

Parser._getFullImmRes_getRenderedString = (str, {isPlainText = false, isEntry = false, isTitleCase = false, fnGetModString, mode} = {}) => {
	const conditionCn = mode === "condition" ? Parser._parse_bToA(Parser.CONTITION_TO_EN, str) : null;
	if (mode === "damageType") str = Parser.dmgTypeToCn(str);
	if (conditionCn && conditionCn !== str) str = fnGetModString && !isPlainText && str !== "disease" ? `{@condition ${str}||${conditionCn}}` : conditionCn;
	if (isTitleCase) str = str.toTitleCase();
	if (isPlainText) return Renderer.stripTags(`${str}`);
	if (fnGetModString && !conditionCn) str = fnGetModString(str);
	if (isEntry) return str;
	return Renderer.get().render(`${str}`);
};

Parser._getFullImmRes_getRenderedObject = (obj, {isPlainText = false, isEntry = false, isTitleCase = false, mode} = {}) => {
	const stack = [];

	if (obj.preNote) stack.push(Parser._getFullImmRes_getRenderedString(obj.preNote, {isPlainText}));

	const prop = Parser._getFullImmRes_getNextProp(obj);
	if (prop) stack.push(Parser._getFullImmRes_getRenderedArray(obj[prop], {isPlainText, isEntry, isTitleCase, isGroup: true, mode}));

	if (obj.note) stack.push(Parser._getFullImmRes_getRenderedString(obj.note, {isPlainText}));

	return stack.join(" ");
};

Parser._getFullImmRes_getRenderedArray = (values, {isPlainText = false, isEntry = false, isTitleCase = false, isGroup = false, mode} = {}) => {
	if (isPlainText && isEntry) throw new Error(`Options "isPlainText" and "isEntry" are mutually exclusive!`);

	if (mode === "damageType" && values.length === Parser.DMG_TYPES.length && CollectionUtil.deepEquals(Parser.DMG_TYPES, values.map(it => Parser.dmgTypeToCn(it)))) {
		return "所有伤害";
	}

	return values
		.map((val, i, arr) => {
			const isSimpleCur = Parser._getFullImmRes_isSimpleTerm(val);

			const rendCur = isSimpleCur
				? val.special
					? Parser._getFullImmRes_getRenderedString(val.special, {isPlainText, isTitleCase: false})
					: Parser._getFullImmRes_getRenderedString(val, {isPlainText, isEntry, isTitleCase, mode, fnGetModString: mode === "condition" ? str => `{@condition ${str}}` : null})
				: Parser._getFullImmRes_getRenderedObject(val, {isPlainText, isEntry, isTitleCase, mode});

			if (i === arr.length - 1) return rendCur;

			const isSimpleNxt = Parser._getFullImmRes_isSimpleTerm(arr[i + 1]);

			if (!isSimpleCur || !isSimpleNxt) return `${rendCur}; `;
			if (!isGroup || i !== arr.length - 2 || arr.length < 2) return `${rendCur}, `;
			if (arr.length === 2) return `${rendCur} 和 `;
			return `${rendCur}, 和 `;
		})
		.join("");
};

Parser.getFullImmRes = function (values, {isPlainText = false, isTitleCase = false} = {}) {
	if (!values?.length) return "";
	return Parser._getFullImmRes_getRenderedArray(values, {isPlainText, isTitleCase, mode: "damageType"});
};

Parser.getFullCondImm = function (values, {isPlainText = false, isEntry = false, isTitleCase = false} = {}) {
	if (isPlainText && isEntry) throw new Error(`Options "isPlainText" and "isEntry" are mutually exclusive!`);

	if (!values?.length) return "";
	return Parser._getFullImmRes_getRenderedArray(values, {isPlainText, isTitleCase, isEntry, mode: "condition"});
};

/* -------------------------------------------- */

Parser.MON_SENSE_TAG_TO_FULL = {
	"B": "盲视",
	"D": "黑暗视觉",
	"SD": "高级黑暗视觉",
	"T": "震颤感知",
	"U": "真实视觉",
};
Parser.monSenseTagToFull = function (tag) {
	return Parser._parse_aToB(Parser.MON_SENSE_TAG_TO_FULL, tag);
};

Parser.MON_SPELLCASTING_TAG_TO_FULL = {
	"P": "灵能",
	"I": "天生",
	"F": "限定型态",
	"S": "共享",
	"O": "其他",
	"CA": "职业，奇械师",
	"CB": "职业，吟游诗人",
	"CC": "职业，牧师",
	"CD": "职业，德鲁伊",
	"CP": "职业，圣武士",
	"CR": "职业，游侠",
	"CS": "职业，术士",
	"CL": "职业，契术师",
	"CW": "职业，法师",
};
Parser.monSpellcastingTagToFull = function (tag) {
	return Parser._parse_aToB(Parser.MON_SPELLCASTING_TAG_TO_FULL, tag);
};

Parser.MON_MISC_TAG_TO_FULL = {
	"AOE": "有范围效应",
	"CUR": "施加诅咒",
	"DIS": "施加疾病",
	"HPR": "有HP减益",
	"MW": "有近战武器攻击",
	"RW": "有远程武器攻击",
	"MA": "有近战攻击",
	"RA": "有远程攻击",
	"MLW": "有近战武器",
	"RNG": "有远程武器",
	"RCH": "有触及攻击",
	"THW": "有投掷武器",
};
Parser.monMiscTagToFull = function (tag) {
	return Parser._parse_aToB(Parser.MON_MISC_TAG_TO_FULL, tag);
};

Parser.WEAPON_CATEGORY_TO_FULL = {
	"martial": "军用",
	"simple": "简易",
};

Parser.weaponCategoryToFull = function (category) {
	return Parser._parse_aToB(Parser.WEAPON_CATEGORY_TO_FULL, category);
};

Parser.MON_GROUP_TAG_TO_FULL = {
	"Angels": "天使",
	"Animated Objects": "活化物件",
	"Beholders": "眼魔",
	"Chromatic Dragon": "色彩龙",
	"Chromatic Dragons": "色彩龙",
	"Demons": "恶魔",
	"Devils": "魔鬼",
	"Dinosaurs": "恐龙",
	"Gem Dragon": "宝石龙",
	"Genies": "巨灵",
	"Goblinoids": "类地精",
	"Hags": "鬼婆",
	"Homunculi": "人工生命体",
	"Lycanthropes": "兽化人",
	"Metallic Dragon": "金属龙",
	"Metallic Dragons": "金属龙",
	"Modrons": "魔冢",
	"Nymph": "宁芙",
	"Quori": "梦灵",
	"Sphinxes": "斯芬克斯",
	"Titans": "泰坦",
	"Yugoloths": "尤格罗斯魔",
};
Parser.monGroupTagToFull = function (tag) {
	return Parser._parse_aToB(Parser.MON_GROUP_TAG_TO_FULL, tag);
};

Parser.MON_LANGUAGE_TAG_TO_FULL = {
	"AB": "Abyssal",
	"AQ": "Aquan",
	"AU": "Auran",
	"C": "Common",
	"CE": "Celestial",
	"CS": "不能说已知语言",
	"CSL": "通用手语",
	"D": "Dwarvish",
	"DR": "Draconic",
	"DS": "Deep Speech",
	"DU": "Druidic",
	"E": "Elvish",
	"G": "Gnomish",
	"GI": "Giant",
	"GO": "Goblin",
	"GTH": "Gith",
	"H": "Halfling",
	"I": "Infernal",
	"IG": "Ignan",
	"LF": "生前所知的语言",
	"O": "Orc",
	"OTH": "Other",
	"P": "Primordial",
	"S": "Sylvan",
	"T": "Terran",
	"TC": "Thieves' cant",
	"TP": "心灵感应",
	"U": "Undercommon",
	"X": "任意(自选)",
	"XX": "全部",
};
Parser.monLanguageTagToFull = function (tag) {
	return Parser._parse_aToB(Parser.LANGUAGES_TO_CN, Parser._parse_aToB(Parser.MON_LANGUAGE_TAG_TO_FULL, tag).toLowerCase());
};

Parser.ENVIRONMENTS = ["丘陵", "城镇", "山地", "幽暗地域", "极地", "森林", "水下", "沼泽", "海岸", "草地", "荒漠"];

Parser.ENVIRONMENT__PLANAR_FEYWILD = "planar, feywild";
Parser.ENVIRONMENT__PLANAR_SHADOWFELL = "planar, shadowfell";

Parser.ENVIRONMENT__PLANAR_WATER = "planar, water";
Parser.ENVIRONMENT__PLANAR_EARTH = "planar, earth";
Parser.ENVIRONMENT__PLANAR_FIRE = "planar, fire";
Parser.ENVIRONMENT__PLANAR_AIR = "planar, air";

Parser.ENVIRONMENT__PLANAR_OOZE = "planar, ooze";
Parser.ENVIRONMENT__PLANAR_MAGMA = "planar, magma";
Parser.ENVIRONMENT__PLANAR_ASH = "planar, ash";
Parser.ENVIRONMENT__PLANAR_ICE = "planar, ice";

Parser.ENVIRONMENT__PLANAR_ELEMENTAL_CHAOS = "planar, elemental chaos";

Parser.ENVIRONMENT__PLANAR_ETHEREAL = "planar, ethereal";
Parser.ENVIRONMENT__PLANAR_ASTRAL = "planar, astral";

Parser.ENVIRONMENT__PLANAR_ARBOREA = "planar, arborea";
Parser.ENVIRONMENT__PLANAR_ARCADIA = "planar, arcadia";
Parser.ENVIRONMENT__PLANAR_BEASTLANDS = "planar, beastlands";
Parser.ENVIRONMENT__PLANAR_BYTOPIA = "planar, bytopia";
Parser.ENVIRONMENT__PLANAR_ELYSIUM = "planar, elysium";
Parser.ENVIRONMENT__PLANAR_MOUNT_CELESTIA = "planar, mount celestia";
Parser.ENVIRONMENT__PLANAR_YSGARD = "planar, ysgard";

Parser.ENVIRONMENT__PLANAR_ABYSS = "planar, abyss";
Parser.ENVIRONMENT__PLANAR_ACHERON = "planar, acheron";
Parser.ENVIRONMENT__PLANAR_CARCERI = "planar, carceri";
Parser.ENVIRONMENT__PLANAR_GEHENNA = "planar, gehenna";
Parser.ENVIRONMENT__PLANAR_HADES = "planar, hades";
Parser.ENVIRONMENT__PLANAR_NINE_HELLS = "planar, nine hells";
Parser.ENVIRONMENT__PLANAR_PANDEMONIUM = "planar, pandemonium";

Parser.ENVIRONMENT__PLANAR_LIMBO = "planar, limbo";
Parser.ENVIRONMENT__PLANAR_MECHANUS = "planar, mechanus";
Parser.ENVIRONMENT__PLANAR_OUTLANDS = "planar, outlands";

Parser.ENVIRONMENT__GROUP_PLANAR = "planar";
Parser.ENVIRONMENT__GROUP_PLANAR_TRANSITIVE = "planar, transitive";
Parser.ENVIRONMENT__GROUP_PLANAR_ELEMENTAL = "planar, elemental";
Parser.ENVIRONMENT__GROUP_PLANAR_INNER = "planar, inner";
Parser.ENVIRONMENT__GROUP_PLANAR_UPPER = "planar, upper";
Parser.ENVIRONMENT__GROUP_PLANAR_LOWER = "planar, lower";

Parser.ENVIRONMENT_GROUPS = {
	[Parser.ENVIRONMENT__GROUP_PLANAR_TRANSITIVE]: [
		Parser.ENVIRONMENT__PLANAR_ETHEREAL,
		Parser.ENVIRONMENT__PLANAR_ASTRAL,
	],
	[Parser.ENVIRONMENT__GROUP_PLANAR_ELEMENTAL]: [
		Parser.ENVIRONMENT__PLANAR_WATER,
		Parser.ENVIRONMENT__PLANAR_EARTH,
		Parser.ENVIRONMENT__PLANAR_FIRE,
		Parser.ENVIRONMENT__PLANAR_AIR,
	],
	[Parser.ENVIRONMENT__GROUP_PLANAR_INNER]: [
		Parser.ENVIRONMENT__PLANAR_WATER,
		Parser.ENVIRONMENT__PLANAR_EARTH,
		Parser.ENVIRONMENT__PLANAR_FIRE,
		Parser.ENVIRONMENT__PLANAR_AIR,

		Parser.ENVIRONMENT__PLANAR_OOZE,
		Parser.ENVIRONMENT__PLANAR_MAGMA,
		Parser.ENVIRONMENT__PLANAR_ASH,
		Parser.ENVIRONMENT__PLANAR_ICE,

		Parser.ENVIRONMENT__PLANAR_ELEMENTAL_CHAOS,
	],
	[Parser.ENVIRONMENT__GROUP_PLANAR_UPPER]: [
		Parser.ENVIRONMENT__PLANAR_ARBOREA,
		Parser.ENVIRONMENT__PLANAR_ARCADIA,
		Parser.ENVIRONMENT__PLANAR_BEASTLANDS,
		Parser.ENVIRONMENT__PLANAR_BYTOPIA,
		Parser.ENVIRONMENT__PLANAR_ELYSIUM,
		Parser.ENVIRONMENT__PLANAR_MOUNT_CELESTIA,
		Parser.ENVIRONMENT__PLANAR_YSGARD,
	],
	[Parser.ENVIRONMENT__GROUP_PLANAR_LOWER]: [
		Parser.ENVIRONMENT__PLANAR_ABYSS,
		Parser.ENVIRONMENT__PLANAR_ACHERON,
		Parser.ENVIRONMENT__PLANAR_CARCERI,
		Parser.ENVIRONMENT__PLANAR_GEHENNA,
		Parser.ENVIRONMENT__PLANAR_HADES,
		Parser.ENVIRONMENT__PLANAR_NINE_HELLS,
		Parser.ENVIRONMENT__PLANAR_PANDEMONIUM,
	],
};
Parser.ENVIRONMENT_GROUPS[Parser.ENVIRONMENT__GROUP_PLANAR] = [
	...Parser.ENVIRONMENT_GROUPS[Parser.ENVIRONMENT__GROUP_PLANAR_TRANSITIVE],
	...Parser.ENVIRONMENT_GROUPS[Parser.ENVIRONMENT__GROUP_PLANAR_INNER],
	...Parser.ENVIRONMENT_GROUPS[Parser.ENVIRONMENT__GROUP_PLANAR_UPPER],
	...Parser.ENVIRONMENT_GROUPS[Parser.ENVIRONMENT__GROUP_PLANAR_LOWER],
	Parser.ENVIRONMENT__PLANAR_LIMBO,
	Parser.ENVIRONMENT__PLANAR_MECHANUS,
	Parser.ENVIRONMENT__PLANAR_OUTLANDS,
];

Parser.getExpandedEnvironments = function (env) {
	if (!Parser.ENVIRONMENT_GROUPS[env]) return env;
	return [...Parser.ENVIRONMENT_GROUPS[env]];
};

Parser.ENVIRONMENT_DISPLAY_NAMES = {
	[Parser.ENVIRONMENT__PLANAR_FEYWILD]: "位面（妖精荒野）",
	[Parser.ENVIRONMENT__PLANAR_SHADOWFELL]: "位面（堕影冥界）",

	[Parser.ENVIRONMENT__PLANAR_WATER]: "位面（水元素位面）",
	[Parser.ENVIRONMENT__PLANAR_EARTH]: "位面（土元素位面）",
	[Parser.ENVIRONMENT__PLANAR_FIRE]: "位面（火元素位面）",
	[Parser.ENVIRONMENT__PLANAR_AIR]: "位面（气元素位面）",

	[Parser.ENVIRONMENT__PLANAR_OOZE]: "位面（泥浆副元素位面）",
	[Parser.ENVIRONMENT__PLANAR_MAGMA]: "位面（岩浆副元素位面）",
	[Parser.ENVIRONMENT__PLANAR_ASH]: "位面（灰烬副元素位面）",
	[Parser.ENVIRONMENT__PLANAR_ICE]: "位面（寒冰副元素位面）",

	[Parser.ENVIRONMENT__PLANAR_ELEMENTAL_CHAOS]: "位面（元素混沌）",

	[Parser.ENVIRONMENT__PLANAR_ETHEREAL]: "位面（以太位面）",
	[Parser.ENVIRONMENT__PLANAR_ASTRAL]: "位面（星界）",

	[Parser.ENVIRONMENT__PLANAR_ARBOREA]: "位面（奔放之野）",
	[Parser.ENVIRONMENT__PLANAR_ARCADIA]: "位面（世外桃源）",
	[Parser.ENVIRONMENT__PLANAR_BEASTLANDS]: "位面（万兽荒野）",
	[Parser.ENVIRONMENT__PLANAR_BYTOPIA]: "位面（双生乐园）",
	[Parser.ENVIRONMENT__PLANAR_ELYSIUM]: "位面（极乐境）",
	[Parser.ENVIRONMENT__PLANAR_MOUNT_CELESTIA]: "位面（七重天堂）",
	[Parser.ENVIRONMENT__PLANAR_YSGARD]: "位面（约瑟园）",

	[Parser.ENVIRONMENT__PLANAR_ABYSS]: "位面（无底深渊）",
	[Parser.ENVIRONMENT__PLANAR_ACHERON]: "位面（修罗场）",
	[Parser.ENVIRONMENT__PLANAR_CARCERI]: "位面（卡瑟利）",
	[Parser.ENVIRONMENT__PLANAR_GEHENNA]: "位面（焦炎地狱）",
	[Parser.ENVIRONMENT__PLANAR_HADES]: "位面（灰色荒野）",
	[Parser.ENVIRONMENT__PLANAR_NINE_HELLS]: "位面（九层地狱）",
	[Parser.ENVIRONMENT__PLANAR_PANDEMONIUM]: "位面（喧癫空隧）",

	[Parser.ENVIRONMENT__PLANAR_LIMBO]: "位面（混沌海）",
	[Parser.ENVIRONMENT__PLANAR_MECHANUS]: "位面（机械境）",

	[Parser.ENVIRONMENT__PLANAR_OUTLANDS]: "位面（外域）",

	[Parser.ENVIRONMENT__GROUP_PLANAR_TRANSITIVE]: "位面（过渡位面）",
	[Parser.ENVIRONMENT__GROUP_PLANAR_ELEMENTAL]: "位面（元素位面）",
	[Parser.ENVIRONMENT__GROUP_PLANAR_INNER]: "位面（内层位面）",
	[Parser.ENVIRONMENT__GROUP_PLANAR_UPPER]: "位面（上层位面）",
	[Parser.ENVIRONMENT__GROUP_PLANAR_LOWER]: "位面（下层位面）",
};

Parser.getEnvironmentDisplayName = function (env) {
	return Parser.ENVIRONMENT_DISPLAY_NAMES[env] || env.toTitleCase();
};

Parser.TREASURE_TYPES = ["奥秘", "军备", "器具", "遗物"];

Parser.getTreasureTypeEntry = function (typ) {
	if (Parser.TREASURE_TYPES.includes(typ)) return `{@table 随机魔法物品 - ${typ.toTitleCase()}|${Parser.SRC_XDMG}|${typ.toTitleCase()}}`;
	return typ.toTitleCase();
};

// psi-prefix functions are for parsing psionic data, and shared with the roll20 script
Parser.PSI_ABV_TYPE_TALENT = "T";
Parser.PSI_ABV_TYPE_DISCIPLINE = "D";
Parser.PSI_ORDER_NONE = "None";
Parser.psiTypeToFull = type => Parser.psiTypeToMeta(type).full;

Parser.psiTypeToMeta = type => {
	let out = {};
	if (type === Parser.PSI_ABV_TYPE_TALENT) out = {hasOrder: false, full: "灵能天赋"};
	else if (type === Parser.PSI_ABV_TYPE_DISCIPLINE) out = {hasOrder: true, full: "灵能修行"};
	else if (PrereleaseUtil.getMetaLookup("psionicTypes")?.[type]) out = MiscUtil.copyFast(PrereleaseUtil.getMetaLookup("psionicTypes")[type]);
	else if (BrewUtil2.getMetaLookup("psionicTypes")?.[type]) out = MiscUtil.copyFast(BrewUtil2.getMetaLookup("psionicTypes")[type]);
	out.full = out.full || "未知";
	out.short = out.short || out.full;
	return out;
};

Parser.psiTypeAbvToStyle = function (type) { // For prerelease/homebrew
	return Parser._colorableMetaAbvToStyle({key: type, prop: "psionicTypes"});
};

Parser.psiTypeAbvToStylePart = function (type) { // For prerelease/homebrew
	return Parser._colorableMetaAbvToStylePart({key: type, prop: "psionicTypes"});
};

Parser.psiOrderToFull = (order) => {
	return order === undefined ? Parser.PSI_ORDER_NONE : order;
};

Parser.prereqPactToFull = function (pact) {
	if (pact === "Chain") return "锁链魔契";
	if (pact === "Tome") return "书卷魔契";
	if (pact === "Blade") return "锋刃魔契";
	if (pact === "Talisman") return "符之魔契";
	return pact;
};

Parser.prereqPatronToShort = function (patron) {
	if (patron === "Any") return "任意";
	const mThe = /^The (.*?)$/.exec(patron);
	if (mThe) return mThe[1];
	return patron;
};

Parser.FEAT_CATEGORY_TO_FULL = {
	"D": "龙纹",
	"DG": "黑暗赠礼",
	"G": "通用",
	"O": "起源",
	"FS": "战斗风格",
	"FS:P": "可选战斗风格 (圣武士)",
	"FS:R": "可选战斗风格 (游侠)",
	"EB": "传奇恩惠",
};

Parser.featCategoryToFull = (category) => {
	if (Parser.FEAT_CATEGORY_TO_FULL[category]) return Parser.FEAT_CATEGORY_TO_FULL[category];
	if (PrereleaseUtil.getMetaLookup("featCategories")?.[category]) return PrereleaseUtil.getMetaLookup("featCategories")[category];
	if (BrewUtil2.getMetaLookup("featCategories")?.[category]) return BrewUtil2.getMetaLookup("featCategories")[category];
	return category;
};

Parser.featCategoryFromFull = (full) => {
	return Parser._parse_bToA(Parser.FEAT_CATEGORY_TO_FULL, full.trim().toTitleCase()) || full;
};

// NOTE: These need to be reflected in omnidexer.js to be indexed
Parser.OPT_FEATURE_TYPE_TO_FULL = {
	AI: "奇械师注法",
	ED: "法门",
	EI: "魔能祈唤",
	MM: "超魔法",
	"MV": "战技",
	"MV:B": "战技，战斗大师",
	"MV:C2-UA": "战技，骑兵 V2 (UA)",
	"AS:V1-UA": "奥术射击, V1 (UA)",
	"AS:V2-UA": "奥术射击, V2 (UA)",
	"AS": "奥术射击",
	OTH: "其他",
	"FS:F": "战斗风格，战士",
	"FS:B": "战斗风格，吟游诗人",
	"FS:P": "战斗风格，圣武士",
	"FS:R": "战斗风格，游侠",
	"PB": "魔契恩泽",
	"OR": "真名术共鸣",
	"RN": "符文骑士符文",
	"AF": "炼金配方",
	"TT": "旅者技艺",
	"RP": "声望特权",
};

Parser.optFeatureTypeToFull = function (type) {
	if (Parser.OPT_FEATURE_TYPE_TO_FULL[type]) return Parser.OPT_FEATURE_TYPE_TO_FULL[type];
	if (PrereleaseUtil.getMetaLookup("optionalFeatureTypes")?.[type]) return PrereleaseUtil.getMetaLookup("optionalFeatureTypes")[type];
	if (BrewUtil2.getMetaLookup("optionalFeatureTypes")?.[type]) return BrewUtil2.getMetaLookup("optionalFeatureTypes")[type];
	return type;
};

Parser.CHAR_OPTIONAL_FEATURE_TYPE_TO_FULL = {
	"SG": "超自然赠礼",
	"OF": "可选特性",
	"DG": "黑暗赠礼",
	"RF:B": "替换特性，背景",
	"CS": "角色秘密", // Specific to IDRotF (rules on page 14)
	"PTH": "道途",
};

Parser.charCreationOptionTypeToFull = function (type) {
	if (Parser.CHAR_OPTIONAL_FEATURE_TYPE_TO_FULL[type]) return Parser.CHAR_OPTIONAL_FEATURE_TYPE_TO_FULL[type];
	if (PrereleaseUtil.getMetaLookup("charOption")?.[type]) return PrereleaseUtil.getMetaLookup("charOption")[type];
	if (BrewUtil2.getMetaLookup("charOption")?.[type]) return BrewUtil2.getMetaLookup("charOption")[type];
	return type;
};

Parser._ALIGNMENT_ABV_TO_FULL = {
	"L": "守序",
	"N": "中立",
	"NX": "中立(守序/混乱轴)",
	"NY": "中立(善良/邪恶轴)",
	"C": "混乱",
	"G": "善良",
	"E": "邪恶",
	// "special" values
	"U": "无阵营",
	"A": "任意阵营",
};

Parser.alignmentAbvToFull = function (alignment) {
	if (!alignment) return null; // used in sidekicks

	if (typeof alignment === "object") {
		// use in MTF Sacred Statue
		if (alignment.special != null) return alignment.special;

		// e.g. `{alignment: ["N", "G"], chance: 50}` or `{alignment: ["N", "G"]}`
		return `${Parser.alignmentListToFull(alignment.alignment)}${alignment.chance ? ` (${alignment.chance}%)` : ""}${alignment.note ? ` (${alignment.note})` : ""}`;
	}

	alignment = alignment.toUpperCase();
	return Parser._ALIGNMENT_ABV_TO_FULL[alignment] ?? alignment;
};

Parser.alignmentListToFull = function (alignList) {
	if (!alignList) return "";

	if (alignList.some(it => typeof it !== "string")) {
		if (alignList.some(it => typeof it === "string")) throw new Error(`Mixed alignment types: ${JSON.stringify(alignList)}`);

		// filter out any nonexistent alignments, as we don't care about "alignment does not exist" if there are other alignments
		return alignList
			.filter(it => it.alignment === undefined || it.alignment != null)
			.map(it => it.special != null || it.chance != null || it.note != null ? Parser.alignmentAbvToFull(it) : Parser.alignmentListToFull(it.alignment)).join("或");
	}

	// assume all single-length arrays can be simply parsed
	if (alignList.length === 1) return Parser.alignmentAbvToFull(alignList[0]);
	// a pair of abv's, e.g. "L" "G"
	if (alignList.length === 2) {
		return alignList.map(a => Parser.alignmentAbvToFull(a)).join(" ");
	}
	if (alignList.length === 3) {
		if (alignList.includes("NX") && alignList.includes("NY") && alignList.includes("N")) return "任意中立阵营";
	}
	// longer arrays should have a custom mapping
	if (alignList.length === 5) {
		if (!alignList.includes("G")) return "任意非善良阵营";
		if (!alignList.includes("E")) return "任意非邪恶阵营";
		if (!alignList.includes("L")) return "任意非守序阵营";
		if (!alignList.includes("C")) return "任意非混乱阵营";
	}
	if (alignList.length === 4) {
		if (!alignList.includes("L") && !alignList.includes("NX")) return "任意混乱阵营";
		if (!alignList.includes("G") && !alignList.includes("NY")) return "任意邪恶阵营";
		if (!alignList.includes("C") && !alignList.includes("NX")) return "任意守序阵营";
		if (!alignList.includes("E") && !alignList.includes("NY")) return "任意善良阵营";
	}
	throw new Error(`Unmapped alignment: ${JSON.stringify(alignList)}`);
};

Parser.weightToFull = function (lbs, isSmallUnit) {
	const tons = Math.floor(lbs / 2000);
	lbs = lbs - (2000 * tons);
	return [
		tons ? `${tons}${isSmallUnit ? `<span class="ve-small ve-ml-1">` : " "}吨${isSmallUnit ? `</span>` : ""}` : null,
		lbs ? `${lbs}${isSmallUnit ? `<span class="ve-small ve-ml-1">` : " "}磅${isSmallUnit ? `</span>` : ""}` : null,
	].filter(Boolean).join(", ");
};

Parser.RARITIES = ["common", "uncommon", "rare", "very rare", "legendary", "artifact"];
Parser.ITEM_RARITIES = ["none", ...Parser.RARITIES, "varies", "unknown", "unknown (magic)", "other"];
Parser.RARITIES_TO_CN = {
	"none": "无",
	"common": "常见",
	"uncommon": "不常见",
	"rare": "珍稀",
	"very rare": "非常珍稀",
	"legendary": "传说",
	"artifact": "神器",
	"varies": "多种",
	"unknown": "不明",
	"unknown (magic)": "不明(魔法)",
	"other": "其他",
};

Parser.rarityToCN = function (rarity) {
	return Parser._parse_aToB(Parser.RARITIES_TO_CN, (rarity || "").toLowerCase()) || rarity;
};
Parser.CAT_ID_CREATURE = 1;
Parser.CAT_ID_SPELL = 2;
Parser.CAT_ID_BACKGROUND = 3;
Parser.CAT_ID_ITEM = 4;
Parser.CAT_ID_CLASS = 5;
Parser.CAT_ID_CONDITION = 6;
Parser.CAT_ID_FEAT = 7;
Parser.CAT_ID_ELDRITCH_INVOCATION = 8;
Parser.CAT_ID_PSIONIC = 9;
Parser.CAT_ID_RACE = 10;
Parser.CAT_ID_OTHER_REWARD = 11;
Parser.CAT_ID_VARIANT_OPTIONAL_RULE = 12;
Parser.CAT_ID_ADVENTURE = 13;
Parser.CAT_ID_DEITY = 14;
Parser.CAT_ID_OBJECT = 15;
Parser.CAT_ID_TRAP = 16;
Parser.CAT_ID_HAZARD = 17;
Parser.CAT_ID_QUICKREF = 18;
Parser.CAT_ID_CULT = 19;
Parser.CAT_ID_BOON = 20;
Parser.CAT_ID_DISEASE = 21;
Parser.CAT_ID_METAMAGIC = 22;
Parser.CAT_ID_MANEUVER_BATTLE_MASTER = 23;
Parser.CAT_ID_TABLE = 24;
Parser.CAT_ID_TABLE_GROUP = 25;
Parser.CAT_ID_MANEUVER_CAVALIER = 26;
Parser.CAT_ID_ARCANE_SHOT = 27;
Parser.CAT_ID_OPTIONAL_FEATURE_OTHER = 28;
Parser.CAT_ID_FIGHTING_STYLE = 29;
Parser.CAT_ID_CLASS_FEATURE = 30;
Parser.CAT_ID_VEHICLE = 31;
Parser.CAT_ID_PACT_BOON = 32;
Parser.CAT_ID_ELEMENTAL_DISCIPLINE = 33;
Parser.CAT_ID_ARTIFICER_INFUSION = 34;
Parser.CAT_ID_VEHICLE_UPGRADE_SHIP = 35;
Parser.CAT_ID_VEHICLE_UPGRADE_INFERNAL_WAR_MACHINE = 36;
Parser.CAT_ID_ONOMANCY_RESONANT = 37;
Parser.CAT_ID_RUNE_KNIGHT_RUNE = 37;
Parser.CAT_ID_ALCHEMICAL_FORMULA = 38;
Parser.CAT_ID_MANEUVER = 39;
Parser.CAT_ID_SUBCLASS = 40;
Parser.CAT_ID_SUBCLASS_FEATURE = 41;
Parser.CAT_ID_ACTION = 42;
Parser.CAT_ID_LANGUAGE = 43;
Parser.CAT_ID_BOOK = 44;
Parser.CAT_ID_PAGE = 45;
Parser.CAT_ID_LEGENDARY_GROUP = 46;
Parser.CAT_ID_CHAR_CREATION_OPTIONS = 47;
Parser.CAT_ID_RECIPE = 48;
Parser.CAT_ID_STATUS = 49;
Parser.CAT_ID_SKILLS = 50;
Parser.CAT_ID_SENSES = 51;
Parser.CAT_ID_DECK = 52;
Parser.CAT_ID_CARD = 53;
Parser.CAT_ID_ITEM_MASTERY = 54;
Parser.CAT_ID_FACILITY = 55;
Parser.CAT_ID_VEHICLE_UPGRADE_OTHER = 56;
Parser.CAT_ID_CROCHET_PATTERN = 57;

Parser.CAT_ID_GROUPS = {
	"optionalfeature": [
		Parser.CAT_ID_ELDRITCH_INVOCATION,
		Parser.CAT_ID_METAMAGIC,
		Parser.CAT_ID_MANEUVER_BATTLE_MASTER,
		Parser.CAT_ID_MANEUVER_CAVALIER,
		Parser.CAT_ID_ARCANE_SHOT,
		Parser.CAT_ID_OPTIONAL_FEATURE_OTHER,
		Parser.CAT_ID_FIGHTING_STYLE,
		Parser.CAT_ID_PACT_BOON,
		Parser.CAT_ID_ELEMENTAL_DISCIPLINE,
		Parser.CAT_ID_ARTIFICER_INFUSION,
		Parser.CAT_ID_ONOMANCY_RESONANT,
		Parser.CAT_ID_RUNE_KNIGHT_RUNE,
		Parser.CAT_ID_ALCHEMICAL_FORMULA,
		Parser.CAT_ID_MANEUVER,
	],
	"vehicleUpgrade": [
		Parser.CAT_ID_VEHICLE_UPGRADE_SHIP,
		Parser.CAT_ID_VEHICLE_UPGRADE_INFERNAL_WAR_MACHINE,
		Parser.CAT_ID_VEHICLE_UPGRADE_OTHER,
	],
};

Parser.CAT_ID_TO_FULL = {};
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_CREATURE] = "怪物";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_SPELL] = "法术";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_BACKGROUND] = "背景";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_ITEM] = "物品";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_CLASS] = "职业";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_CONDITION] = "状态";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_FEAT] = "专长";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_ELDRITCH_INVOCATION] = "魔能祈唤";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_PSIONIC] = "灵能";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_RACE] = "种族";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_OTHER_REWARD] = "其他奖励";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_VARIANT_OPTIONAL_RULE] = "变体/可选规则";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_ADVENTURE] = "冒险";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_DEITY] = "神祇";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_OBJECT] = "物件";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_TRAP] = "陷阱";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_HAZARD] = "危险";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_QUICKREF] = "快速参考 (5e/2014)";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_CULT] = "异教";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_BOON] = "恩惠";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_DISEASE] = "疾病";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_METAMAGIC] = "超魔法";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_MANEUVER_BATTLE_MASTER] = "战技；战斗大师";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_TABLE] = "表格";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_TABLE_GROUP] = "表格";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_MANEUVER_CAVALIER] = "战技；骑兵";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_ARCANE_SHOT] = "秘法射击";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_OPTIONAL_FEATURE_OTHER] = "可选特性";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_FIGHTING_STYLE] = "战斗风格";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_CLASS_FEATURE] = "职业特性";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_VEHICLE] = "载具";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_PACT_BOON] = "契约恩赐";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_ELEMENTAL_DISCIPLINE] = "四象法门";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_ARTIFICER_INFUSION] = "注法";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_VEHICLE_UPGRADE_SHIP] = "船只升级";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_VEHICLE_UPGRADE_INFERNAL_WAR_MACHINE] = "炼狱战争机器升级";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_VEHICLE_UPGRADE_OTHER] = "载具升级";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_ONOMANCY_RESONANT] = "真名言灵";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_RUNE_KNIGHT_RUNE] = "符文骑士符文";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_ALCHEMICAL_FORMULA] = "炼金师公式";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_MANEUVER] = "战技";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_SUBCLASS] = "子职";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_SUBCLASS_FEATURE] = "子职特性";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_ACTION] = "动作";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_LANGUAGE] = "语言";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_BOOK] = "书籍";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_PAGE] = "页面";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_LEGENDARY_GROUP] = "传奇组";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_CHAR_CREATION_OPTIONS] = "角色创建选项";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_RECIPE] = "食谱";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_CROCHET_PATTERN] = "手工艺品";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_STATUS] = "状态";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_DECK] = "牌组";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_CARD] = "卡牌";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_FACILITY] = "据点";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_SKILLS] = "技能";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_SENSES] = "视野";
Parser.CAT_ID_TO_FULL[Parser.CAT_ID_ITEM_MASTERY] = "物品专精";

Parser.pageCategoryToFull = function (catId) {
	return Parser._parse_aToB(Parser.CAT_ID_TO_FULL, catId);
};

Parser.CAT_ID_TO_PROP = {};
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_CREATURE] = "monster";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_SPELL] = "spell";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_BACKGROUND] = "background";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_ITEM] = "item";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_CLASS] = "class";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_CONDITION] = "condition";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_FEAT] = "feat";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_PSIONIC] = "psionic";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_RACE] = "race";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_OTHER_REWARD] = "reward";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_VARIANT_OPTIONAL_RULE] = "variantrule";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_ADVENTURE] = "adventure";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_DEITY] = "deity";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_OBJECT] = "object";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_TRAP] = "trap";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_HAZARD] = "hazard";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_CULT] = "cult";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_BOON] = "boon";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_DISEASE] = "condition";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_TABLE] = "table";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_TABLE_GROUP] = "tableGroup";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_VEHICLE] = "vehicle";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_ELDRITCH_INVOCATION] = "optionalfeature";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_MANEUVER_CAVALIER] = "optionalfeature";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_ARCANE_SHOT] = "optionalfeature";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_OPTIONAL_FEATURE_OTHER] = "optionalfeature";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_FIGHTING_STYLE] = "optionalfeature";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_METAMAGIC] = "optionalfeature";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_MANEUVER_BATTLE_MASTER] = "optionalfeature";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_PACT_BOON] = "optionalfeature";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_ELEMENTAL_DISCIPLINE] = "optionalfeature";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_ARTIFICER_INFUSION] = "optionalfeature";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_VEHICLE_UPGRADE_SHIP] = "vehicleUpgrade";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_VEHICLE_UPGRADE_INFERNAL_WAR_MACHINE] = "vehicleUpgrade";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_VEHICLE_UPGRADE_OTHER] = "vehicleUpgrade";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_ONOMANCY_RESONANT] = "optionalfeature";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_RUNE_KNIGHT_RUNE] = "optionalfeature";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_ALCHEMICAL_FORMULA] = "optionalfeature";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_MANEUVER] = "optionalfeature";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_QUICKREF] = null;
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_CLASS_FEATURE] = "classFeature";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_SUBCLASS] = "subclass";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_SUBCLASS_FEATURE] = "subclassFeature";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_ACTION] = "action";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_LANGUAGE] = "language";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_BOOK] = "book";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_PAGE] = null;
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_LEGENDARY_GROUP] = "legendaryGroup";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_CHAR_CREATION_OPTIONS] = "charoption";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_RECIPE] = "recipe";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_CROCHET_PATTERN] = "crochetPattern";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_STATUS] = "status";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_DECK] = "deck";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_CARD] = "card";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_FACILITY] = "facility";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_SKILLS] = "skill";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_SENSES] = "sense";
Parser.CAT_ID_TO_PROP[Parser.CAT_ID_ITEM_MASTERY] = "itemMastery";

Parser.pageCategoryToProp = function (catId) {
	return Parser._parse_aToB(Parser.CAT_ID_TO_PROP, catId);
};

Parser.ABIL_ABVS = ["str", "dex", "con", "int", "wis", "cha"];

Parser.spClassesToCurrentAndLegacy = function (fromClassList) {
	const current = [];
	const legacy = [];
	fromClassList.forEach(cls => {
		if ((cls.name === "Artificer" && cls.source === "UAArtificer") 
			|| (cls.name === "Artificer (Revisited)" && cls.source === "UAArtificerRevisited")
			|| (cls.name === "奇械师" && cls.source === "UAArtificer")
			|| (cls.name === "奇械师（重置版）" && cls.source === "UAArtificerRevisited") ) legacy.push(cls);
		else current.push(cls);
	});
	return [current, legacy];
};

/**
 * Build a pair of strings; one with all current subclasses, one with all legacy subclasses
 *
 * @param sp a spell
 * @param subclassLookup Data loaded from `generated/gendata-subclass-lookup.json`. Of the form: `{PHB: {Barbarian: {PHB: {Berserker: "Path of the Berserker"}}}}`
 * @param isIncludeSource
 * @returns {*[]} A two-element array. First item is a string of all the current subclasses, second item a string of
 * all the legacy/superseded subclasses
 */
Parser.spSubclassesToCurrentAndLegacyFull = function (sp, subclassLookup, {isIncludeSource = false} = {}) {
	return Parser._spSubclassesToCurrentAndLegacyFull({sp, subclassLookup, prop: "fromSubclass", isIncludeSource});
};

Parser.spVariantSubclassesToCurrentAndLegacyFull = function (sp, subclassLookup, {isIncludeSource = false} = {}) {
	return Parser._spSubclassesToCurrentAndLegacyFull({sp, subclassLookup, prop: "fromSubclassVariant", isIncludeSource});
};

Parser._spSubclassesToCurrentAndLegacyFull = ({sp, subclassLookup, prop, isIncludeSource = false}) => {
	const fromSubclass = Renderer.spell.getCombinedClasses(sp, prop);
	if (!fromSubclass.length) return ["", ""];

	const current = [];
	const legacy = [];
	const curNames = new Set();
	const toCheck = [];
	fromSubclass
		.filter(c => {
			const excludeClass = ExcludeUtil.isExcluded(
				UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_CLASSES]({name: c.class.name, source: c.class.source}),
				"class",
				c.class.source,
				{isNoCount: true},
			);
			if (excludeClass) return false;

			const excludeSubclass = ExcludeUtil.isExcluded(
				UrlUtil.URL_TO_HASH_BUILDER["subclass"]({
					shortName: c.subclass.shortName,
					source: c.subclass.source,
					className: c.class.name,
					classSource: c.class.source,
				}),
				"subclass",
				c.subclass.source,
				{isNoCount: true},
			);
			if (excludeSubclass) return false;

			return !Renderer.spell.isExcludedSubclassVariantSource({classDefinedInSource: c.class.definedInSource});
		})
		.sort((a, b) => {
			const byName = SortUtil.ascSort(a.subclass.name, b.subclass.name);
			return byName || SortUtil.ascSort(a.class.name, b.class.name);
		})
		.forEach(c => {
			const nm = c.subclass.name;
			const src = c.subclass.source;

			const toAdd = Parser._spSubclassItem({fromSubclass: c, isTextOnly: false, isIncludeSource});

			const fromLookup = MiscUtil.get(
				subclassLookup,
				c.class.source,
				c.class.name,
				c.subclass.source,
				c.subclass.name,
			);

			if (fromLookup && fromLookup.isReprinted) {
				legacy.push(toAdd);
			} else if (SourceUtil.isNonstandardSource(src)) {
				const cleanName = Parser._spSubclassesToCurrentAndLegacyFull.mapClassShortNameToMostRecent(
					nm.split("(")[0].trim().split(/v\d+/)[0].trim(),
				);
				toCheck.push({"name": cleanName, "ele": toAdd});
			} else {
				current.push(toAdd);
				curNames.add(nm);
			}
		});

	toCheck.forEach(n => {
		if (curNames.has(n.name)) {
			legacy.push(n.ele);
		} else {
			current.push(n.ele);
		}
	});

	return [current.join(", "), legacy.join(", ")];
};

/**
 * Get the most recent iteration of a subclass name.
 */
Parser._spSubclassesToCurrentAndLegacyFull.mapClassShortNameToMostRecent = (shortName) => {
	switch (shortName) {
		case "Favored Soul": return "Divine Soul";
		case "Undying Light": return "Celestial";
		case "Deep Stalker": return "Gloom Stalker";
	}
	return shortName;
};

Parser.spVariantClassesToCurrentAndLegacy = function (fromVariantClassList) {
	const current = [];
	const legacy = [];
	fromVariantClassList.forEach(cls => {
		if (SourceUtil.isPrereleaseSource(cls.definedInSource)) legacy.push(cls);
		else current.push(cls);
	});
	return [current, legacy];
};

Parser.attackTypeToFull = function (attackType) {
	return Parser._parse_aToB(Parser.ATK_TYPE_TO_FULL, attackType);
};

Parser.trapHazTypeToFull = function (type) {
	return Parser._parse_aToB(Parser.TRAP_HAZARD_TYPE_TO_FULL, type);
};

Parser.TRAP_HAZARD_TYPE_TO_FULL = {
	"MECH": "机械陷阱",
	"MAG": "魔法陷阱",
	"SMPL": "简易陷阱",
	"CMPX": "复杂陷阱",
	"HAZ": "危害",
	"WTH": "天气",
	"ENV": "环境危害",
	"WLD": "野外危害",
	"GEN": "通用",
	"EST": "奥法风暴",
	"TRP": "陷阱",
	"HAUNT": "灵异陷阱",
};

Parser._TIER_TO_LEVEL_RANGE = {
	"1": [1, 4],
	"2": [5, 10],
	"3": [11, 16],
	"4": [17, 20],
};
Parser.tierToFullLevel = function (tier, {styleHint} = {}) {
	const range = Parser._parse_aToB(Parser._TIER_TO_LEVEL_RANGE, tier);
	if (!range) return `阶段 ${tier}`;

	styleHint ||= VetoolsConfig.get("styleSwitcher", "style");

	if (styleHint === "classic") return `${range.map(n => Parser.getOrdinalForm(n)).join("\u2013")}级`;
	return `等级 ${range.join("\u2013")}`;
};

Parser.trapInitToFull = function (init) {
	return Parser._parse_aToB(Parser.TRAP_INIT_TO_FULL, init);
};

Parser.TRAP_INIT_TO_FULL = {};
Parser.TRAP_INIT_TO_FULL[1] = "先攻顺序10";
Parser.TRAP_INIT_TO_FULL[2] = "先攻顺序20";
Parser.TRAP_INIT_TO_FULL[3] = "先攻顺序20 和 先攻顺序10";

Parser.ATK_TYPE_TO_FULL = {};
Parser.ATK_TYPE_TO_FULL["MW"] = "近战武器攻击";
Parser.ATK_TYPE_TO_FULL["RW"] = "远程武器攻击";

Parser.bookOrdinalToAbv = (ordinal, {isPreNoSuff = false, isPlainText = false} = {}) => {
	if (ordinal === undefined) return "";
	switch (ordinal.type) {
		case "part": return `${isPreNoSuff ? " " : ""}${Parser._bookOrdinalToAbv_getPt({ordinal, isPlainText})} ${ordinal.identifier}${isPreNoSuff ? "" : " \u2014 "}`;
		case "chapter": return `${isPreNoSuff ? " " : ""}${Parser._bookOrdinalToAbv_getPt({ordinal, isPlainText})} ${ordinal.identifier}${isPreNoSuff ? "" : ": "}`;
		case "episode": return `${isPreNoSuff ? " " : ""}${Parser._bookOrdinalToAbv_getPt({ordinal, isPlainText})} ${ordinal.identifier}${isPreNoSuff ? "" : ": "}`;
		case "appendix": return `${isPreNoSuff ? " " : ""}${Parser._bookOrdinalToAbv_getPt({ordinal, isPlainText})}${ordinal.identifier != null ? ` ${ordinal.identifier}` : ""}${isPreNoSuff ? "" : ": "}`;
		case "level": return `${isPreNoSuff ? " " : ""}${Parser._bookOrdinalToAbv_getPt({ordinal, isPlainText})} ${ordinal.identifier}${isPreNoSuff ? "" : ": "}`;
		case "section": return `${isPreNoSuff ? " " : ""}${Parser._bookOrdinalToAbv_getPt({ordinal, isPlainText})} ${ordinal.identifier}${isPreNoSuff ? "" : ": "}`;
		default: throw new Error(`Unhandled ordinal type "${ordinal.type}"`);
	}
};

Parser._bookOrdinalToAbv_getPt = ({ordinal, isPlainText = false}) => {
	switch (ordinal.type) {
		case "part": return `部分`;
		case "chapter": return isPlainText ? `章` : `<span title="章节">章</span>`;
		case "episode": return isPlainText ? `集` : `<span title="分集">集</span>`;
		case "appendix": return isPlainText ? `附录` : `<span title="附录">附录</span>`;
		case "section": return isPlainText ? `节` : `<span title="小节">节</span>`;
		case "level": return `等级`;
		default: throw new Error(`Unhandled ordinal type "${ordinal.type}"`);
	}
};

Parser.IMAGE_TYPE_TO_FULL = {
	"map": "地图",
	"mapPlayer": "玩家地图",
};
Parser.imageTypeToFull = function (imageType) {
	return Parser._parse_aToB(Parser.IMAGE_TYPE_TO_FULL, imageType, "其他");
};

Parser.nameToTokenName = function (name, {isUrlEncode = false} = {}) {
	const out = name
		.toAscii()
		.replace(/"/g, "");
	if (!isUrlEncode) return out;
	return encodeURIComponent(out);
};

Parser.bytesToHumanReadable = function (bytes, {fixedDigits = 2} = {}) {
	if (bytes == null) return "";
	if (!bytes) return "0 B";
	const e = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / Math.pow(1024, e)).toFixed(fixedDigits)} ${`\u200bKMGTP`.charAt(e)}B`;
};

Parser.SKL_ABV_ABJ = "A";
Parser.SKL_ABV_EVO = "V";
Parser.SKL_ABV_ENC = "E";
Parser.SKL_ABV_ILL = "I";
Parser.SKL_ABV_DIV = "D";
Parser.SKL_ABV_NEC = "N";
Parser.SKL_ABV_TRA = "T";
Parser.SKL_ABV_CON = "C";
Parser.SKL_ABV_PSI = "P";
Parser.SKL_ABVS = [
	Parser.SKL_ABV_ABJ,
	Parser.SKL_ABV_CON,
	Parser.SKL_ABV_DIV,
	Parser.SKL_ABV_ENC,
	Parser.SKL_ABV_EVO,
	Parser.SKL_ABV_ILL,
	Parser.SKL_ABV_NEC,
	Parser.SKL_ABV_PSI,
	Parser.SKL_ABV_TRA,
];

Parser.SP_TM_ACTION = "action";
Parser.SP_TM_B_ACTION = "bonus";
Parser.SP_TM_REACTION = "reaction";
Parser.SP_TM_ROUND = "round";
Parser.SP_TM_MINS = "minute";
Parser.SP_TM_HRS = "hour";
Parser.SP_TM_SPECIAL = "special";
Parser.SP_TIME_SINGLETONS = [Parser.SP_TM_ACTION, Parser.SP_TM_B_ACTION, Parser.SP_TM_REACTION, Parser.SP_TM_ROUND];
Parser.SP_TIME_TO_FULL = {
	[Parser.SP_TM_ACTION]: "动作",
	[Parser.SP_TM_B_ACTION]: "附赠动作",
	[Parser.SP_TM_REACTION]: "反应",
	[Parser.SP_TM_ROUND]: "轮",
	[Parser.SP_TM_MINS]: "分钟",
	[Parser.SP_TM_HRS]: "小时",
	[Parser.SP_TM_SPECIAL]: "特殊",
};
Parser.spTimeUnitToFull = function (timeUnit) {
	return Parser._parse_aToB(Parser.SP_TIME_TO_FULL, timeUnit);
};
Parser.spTimeUnitToEn = function (timeUnit) {
	return Parser._parse_bToA(Parser.SP_TIME_TO_FULL, timeUnit);
}

Parser.SP_TIME_TO_SHORT = {
	[Parser.SP_TM_ROUND]: "轮",
	[Parser.SP_TM_MINS]: "分钟",
	[Parser.SP_TM_HRS]: "小时",
};
Parser.spTimeUnitToShort = function (timeUnit) {
	return Parser._parse_aToB(Parser.SP_TIME_TO_SHORT, timeUnit);
};

Parser.SP_TIME_TO_ABV = {
	[Parser.SP_TM_ACTION]: "A",
	[Parser.SP_TM_B_ACTION]: "BA",
	[Parser.SP_TM_REACTION]: "R",
	[Parser.SP_TM_ROUND]: "rnd",
	[Parser.SP_TM_MINS]: "min",
	[Parser.SP_TM_HRS]: "hr",
	[Parser.SP_TM_SPECIAL]: "SPC",
};
Parser.spTimeUnitToAbv = function (timeUnit) {
	return Parser._parse_aToB(Parser.SP_TIME_TO_ABV, timeUnit);
};

Parser.spTimeToShort = function (time, isHtml) {
	if (!time) return "";
	return (time.number === 1 && Parser.SP_TIME_SINGLETONS.includes(time.unit))
		? `${Parser.spTimeUnitToAbv(time.unit).uppercaseFirst()}${time.condition ? "*" : ""}`
		: `${time.number} ${isHtml ? `<span class="ve-small">` : ""}${Parser.spTimeUnitToAbv(time.unit)}${isHtml ? `</span>` : ""}${time.condition ? "*" : ""}`;
};

Parser.SKL_ABJ = "防护";
Parser.SKL_EVO = "塑能";
Parser.SKL_ENC = "惑控";
Parser.SKL_ILL = "幻术";
Parser.SKL_DIV = "预言";
Parser.SKL_NEC = "死灵";
Parser.SKL_TRA = "变化";
Parser.SKL_CON = "咒法";
Parser.SKL_PSI = "灵能";

Parser.SP_SCHOOL_ABV_TO_FULL = {};
Parser.SP_SCHOOL_ABV_TO_FULL[Parser.SKL_ABV_ABJ] = Parser.SKL_ABJ;
Parser.SP_SCHOOL_ABV_TO_FULL[Parser.SKL_ABV_EVO] = Parser.SKL_EVO;
Parser.SP_SCHOOL_ABV_TO_FULL[Parser.SKL_ABV_ENC] = Parser.SKL_ENC;
Parser.SP_SCHOOL_ABV_TO_FULL[Parser.SKL_ABV_ILL] = Parser.SKL_ILL;
Parser.SP_SCHOOL_ABV_TO_FULL[Parser.SKL_ABV_DIV] = Parser.SKL_DIV;
Parser.SP_SCHOOL_ABV_TO_FULL[Parser.SKL_ABV_NEC] = Parser.SKL_NEC;
Parser.SP_SCHOOL_ABV_TO_FULL[Parser.SKL_ABV_TRA] = Parser.SKL_TRA;
Parser.SP_SCHOOL_ABV_TO_FULL[Parser.SKL_ABV_CON] = Parser.SKL_CON;
Parser.SP_SCHOOL_ABV_TO_FULL[Parser.SKL_ABV_PSI] = Parser.SKL_PSI;

Parser.SP_SCHOOL_ABV_TO_SHORT = {};
Parser.SP_SCHOOL_ABV_TO_SHORT[Parser.SKL_ABV_ABJ] = "防护";
Parser.SP_SCHOOL_ABV_TO_SHORT[Parser.SKL_ABV_EVO] = "塑能";
Parser.SP_SCHOOL_ABV_TO_SHORT[Parser.SKL_ABV_ENC] = "惑控";
Parser.SP_SCHOOL_ABV_TO_SHORT[Parser.SKL_ABV_ILL] = "幻术";
Parser.SP_SCHOOL_ABV_TO_SHORT[Parser.SKL_ABV_DIV] = "预言";
Parser.SP_SCHOOL_ABV_TO_SHORT[Parser.SKL_ABV_NEC] = "死灵";
Parser.SP_SCHOOL_ABV_TO_SHORT[Parser.SKL_ABV_TRA] = "变化";
Parser.SP_SCHOOL_ABV_TO_SHORT[Parser.SKL_ABV_CON] = "咒法";
Parser.SP_SCHOOL_ABV_TO_SHORT[Parser.SKL_ABV_PSI] = "灵能";

Parser.SP_SCHOOL_ABV_TO_CSS_CLASS = {};
Parser.SP_SCHOOL_ABV_TO_CSS_CLASS[Parser.SKL_ABV_ABJ] = "ve-sp__school--a";
Parser.SP_SCHOOL_ABV_TO_CSS_CLASS[Parser.SKL_ABV_CON] = "ve-sp__school--c";
Parser.SP_SCHOOL_ABV_TO_CSS_CLASS[Parser.SKL_ABV_DIV] = "ve-sp__school--d";
Parser.SP_SCHOOL_ABV_TO_CSS_CLASS[Parser.SKL_ABV_ENC] = "ve-sp__school--e";
Parser.SP_SCHOOL_ABV_TO_CSS_CLASS[Parser.SKL_ABV_EVO] = "ve-sp__school--v";
Parser.SP_SCHOOL_ABV_TO_CSS_CLASS[Parser.SKL_ABV_ILL] = "ve-sp__school--i";
Parser.SP_SCHOOL_ABV_TO_CSS_CLASS[Parser.SKL_ABV_NEC] = "ve-sp__school--n";
Parser.SP_SCHOOL_ABV_TO_CSS_CLASS[Parser.SKL_ABV_PSI] = "ve-sp__school--p";
Parser.SP_SCHOOL_ABV_TO_CSS_CLASS[Parser.SKL_ABV_TRA] = "ve-sp__school--t";

Parser.spSchoolAbvToStyleClass = function (school) {
	return Parser.SP_SCHOOL_ABV_TO_CSS_CLASS[school] || "";
};

Parser.PSI_ABV_TYPE_TO_CSS_CLASS = {};
Parser.PSI_ABV_TYPE_TO_CSS_CLASS[Parser.PSI_ABV_TYPE_TALENT] = "ve-psi__type--t";
Parser.PSI_ABV_TYPE_TO_CSS_CLASS[Parser.PSI_ABV_TYPE_DISCIPLINE] = "ve-psi__type--d";

Parser.psiTypeAbvToStyleClass = function (type) {
	return Parser.PSI_ABV_TYPE_TO_CSS_CLASS[type] || "";
};

Parser.ATB_ABV_TO_FULL = {
	"str": "力量",
	"dex": "敏捷",
	"con": "体质",
	"int": "智力",
	"wis": "感知",
	"cha": "魅力",
};

Parser.ATB_FULL_TO_CN = {
	"strength": "力量",
	"dexterity":"敏捷",
	"constitution": "体质",
	"intelligence": "智力",
	"wisdom": "感知",
	"charisma": "魅力",
}

Parser.TP_ABERRATION = "aberration";
Parser.TP_BEAST = "beast";
Parser.TP_CELESTIAL = "celestial";
Parser.TP_CONSTRUCT = "construct";
Parser.TP_DRAGON = "dragon";
Parser.TP_ELEMENTAL = "elemental";
Parser.TP_FEY = "fey";
Parser.TP_FIEND = "fiend";
Parser.TP_GIANT = "giant";
Parser.TP_HUMANOID = "humanoid";
Parser.TP_MONSTROSITY = "monstrosity";
Parser.TP_OOZE = "ooze";
Parser.TP_PLANT = "plant";
Parser.TP_UNDEAD = "undead";
Parser.MON_TYPE_TO_PLURAL = {};
Parser.MON_TYPE_TO_PLURAL[Parser.TP_ABERRATION] = "异怪";
Parser.MON_TYPE_TO_PLURAL[Parser.TP_BEAST] = "野兽";
Parser.MON_TYPE_TO_PLURAL[Parser.TP_CELESTIAL] = "天族";
Parser.MON_TYPE_TO_PLURAL[Parser.TP_CONSTRUCT] = "构装";
Parser.MON_TYPE_TO_PLURAL[Parser.TP_DRAGON] = "龙"; // TODO (kiwee) 已修改为“龙类”但因为同义词问题暂时保留为龙，后续需要修改
Parser.MON_TYPE_TO_PLURAL[Parser.TP_ELEMENTAL] = "元素";
Parser.MON_TYPE_TO_PLURAL[Parser.TP_FEY] = "妖精";
Parser.MON_TYPE_TO_PLURAL[Parser.TP_FIEND] = "邪魔";
Parser.MON_TYPE_TO_PLURAL[Parser.TP_GIANT] = "巨人";
Parser.MON_TYPE_TO_PLURAL[Parser.TP_HUMANOID] = "类人";
Parser.MON_TYPE_TO_PLURAL[Parser.TP_MONSTROSITY] = "怪兽";
Parser.MON_TYPE_TO_PLURAL[Parser.TP_OOZE] = "泥怪";
Parser.MON_TYPE_TO_PLURAL[Parser.TP_PLANT] = "植物";
Parser.MON_TYPE_TO_PLURAL[Parser.TP_UNDEAD] = "亡灵";
Parser.MON_EN_TYPES = [Parser.TP_ABERRATION, Parser.TP_BEAST, Parser.TP_CELESTIAL, Parser.TP_CONSTRUCT, Parser.TP_DRAGON, Parser.TP_ELEMENTAL, Parser.TP_FEY, Parser.TP_FIEND, Parser.TP_GIANT, Parser.TP_HUMANOID, Parser.TP_MONSTROSITY, Parser.TP_OOZE, Parser.TP_PLANT, Parser.TP_UNDEAD];
Parser.MON_TYPES = Parser.MON_EN_TYPES.map(it => Parser.MON_TYPE_TO_PLURAL[it] || it);

Parser.SZ_FINE = "F";
Parser.SZ_DIMINUTIVE = "D";
Parser.SZ_TINY = "T";
Parser.SZ_SMALL = "S";
Parser.SZ_MEDIUM = "M";
Parser.SZ_LARGE = "L";
Parser.SZ_HUGE = "H";
Parser.SZ_GARGANTUAN = "G";
Parser.SZ_COLOSSAL = "C";
Parser.SZ_VARIES = "V";

Parser.SIZE_ABVS = [Parser.SZ_TINY, Parser.SZ_SMALL, Parser.SZ_MEDIUM, Parser.SZ_LARGE, Parser.SZ_HUGE, Parser.SZ_GARGANTUAN, Parser.SZ_VARIES];

Parser.SIZE_ABV_TO_FULL = {
	[Parser.SZ_FINE]: "极微型",
	[Parser.SZ_DIMINUTIVE]: "微小型",
	[Parser.SZ_TINY]: "微型",
	[Parser.SZ_SMALL]: "小型",
	[Parser.SZ_MEDIUM]: "中型",
	[Parser.SZ_LARGE]: "大型",
	[Parser.SZ_HUGE]: "巨型",
	[Parser.SZ_GARGANTUAN]: "超巨型",
	[Parser.SZ_COLOSSAL]: "伟岸",
	[Parser.SZ_VARIES]: "不定",
};

Parser.SIZE_ABV_TO_SHORT = {
	[Parser.SZ_FINE]: "极微",
	[Parser.SZ_DIMINUTIVE]: "微小",
	[Parser.SZ_TINY]: "微",
	[Parser.SZ_SMALL]: "小",
	[Parser.SZ_MEDIUM]: "中",
	[Parser.SZ_LARGE]: "大",
	[Parser.SZ_HUGE]: "巨",
	[Parser.SZ_GARGANTUAN]: "超巨",
	[Parser.SZ_COLOSSAL]: "伟岸",
	[Parser.SZ_VARIES]: "不定",
};

Parser.XP_CHART_ALT = {
	"0": 10,
	"1/8": 25,
	"1/4": 50,
	"1/2": 100,
	"1": 200,
	"2": 450,
	"3": 700,
	"4": 1100,
	"5": 1800,
	"6": 2300,
	"7": 2900,
	"8": 3900,
	"9": 5000,
	"10": 5900,
	"11": 7200,
	"12": 8400,
	"13": 10000,
	"14": 11500,
	"15": 13000,
	"16": 15000,
	"17": 18000,
	"18": 20000,
	"19": 22000,
	"20": 25000,
	"21": 33000,
	"22": 41000,
	"23": 50000,
	"24": 62000,
	"25": 75000,
	"26": 90000,
	"27": 105000,
	"28": 120000,
	"29": 135000,
	"30": 155000,
};

Parser.ARMOR_ABV_TO_FULL = {
	"l.": "light",
	"m.": "medium",
	"h.": "heavy",
	"s.": "shield",
};

Parser.ARMOR_FULL_TO_CN = {
	"light": "轻",
	"medium": "中",
	"heavy": "重",
};

Parser.WEAPON_ABV_TO_FULL = {
	"s.": "简易",
	"m.": "军用",
};

Parser.CONDITION_TO_COLOR = {
	"被致盲": "#525252",
	"被魅惑": "#f01789",
	"耳聋": "#ababab",
	"力竭": "#947a47",
	"恐慌": "#c9ca18",
	"受擒": "#8784a0",
	"失能": "#3165a0",
	"隐形": "#7ad2d6",
	"麻痹": "#c00900",
	"石化": "#a0a0a0",
	"中毒": "#4dc200",
	"倒地": "#5e60a0",
	"被束缚": "#d98000",
	"被震慑": "#a23bcb",
	"昏迷": "#3a40ad",

	"专注": "#009f7a",
};

Parser.RULE_TYPE_TO_FULL = {
	"C": I18nUtil.get("parser.core"),
	"O": I18nUtil.get("parser.optional"),
	"P": I18nUtil.get("parser.prerelease"),
	"V": I18nUtil.get("parser.variant"),
	"VO": I18nUtil.get("parser.variant_optional"),
	"VV": I18nUtil.get("parser.variant_variant"),
	"U": I18nUtil.get("parser.unknown"),
};

Parser.ruleTypeToFull = function (ruleType) {
	return Parser._parse_aToB(Parser.RULE_TYPE_TO_FULL, ruleType);
};

Parser.VEHICLE_TYPE_TO_FULL = {
	"SHIP": "船",
	"SPELLJAMMER": "魔法船",
	"ELEMENTAL_AIRSHIP": "元素飞艇",
	"INFWAR": "地狱战争机器",
	"CREATURE": "生物",
	"OBJECT": "物件",
};

Parser.vehicleTypeToFull = function (vehicleType) {
	return Parser._parse_aToB(Parser.VEHICLE_TYPE_TO_FULL, vehicleType);
};

Parser.VEHICLE_UPGRADE_TYPE_TO_FULL = {
	"SHP:H": "船只升级, 船壳",
	"SHP:M": "船只升级, 操纵",
	"SHP:W": "船只升级, 武器",
	"SHP:F": "船只升级, 船首像",
	"SHP:O": "船只升级, 杂项",
	"IWM:W": "地狱战争机器变体, 武器",
	"IWM:A": "地狱战争机器升级, 护甲",
	"IWM:G": "地狱战争机器升级, 装置",
};

Parser.vehicleUpgradeTypeToFull = function (type) {
	if (Parser.VEHICLE_UPGRADE_TYPE_TO_FULL[type]) return Parser.VEHICLE_UPGRADE_TYPE_TO_FULL[type];
	if (PrereleaseUtil.getMetaLookup("vehicleUpgradeTypes")?.[type]) return PrereleaseUtil.getMetaLookup("vehicleUpgradeTypes")[type];
	if (BrewUtil2.getMetaLookup("vehicleUpgradeTypes")?.[type]) return BrewUtil2.getMetaLookup("vehicleUpgradeTypes")[type];
	return type;
};

Parser.CROCHET_PATTERN_SKILL_LEVEL_TO_FULL = {
	"B": "初级",
	"I": "中级",
	"A": "高级",
};

Parser.crochetPatternSkilLevelToFull = function (lvl) {
	return Parser._parse_aToB(Parser.CROCHET_PATTERN_SKILL_LEVEL_TO_FULL, lvl);
};

Parser.CROCHET_HOOK_MM_TO_US = {
	"2.25": "B/1",
	"2.75": "C",
	"3.25": "D",
	"3.50": "E/4",
	"3.75": "F",
	"4": "G/6",
	"4.25": "G/6",
	"4.50": "7",
	"5": "H/8",
	"5.25": "I",
	"5.50": "I/9",
	"6": "J/10",
	"6.50": "K",
	"9": "M/13",
	"10": "N/15",
	"12": "P/16",
	"15": "Q",
	"16": "Q",
	"19": "S",
};

Parser.crochetHookMmToUs = function (sz) {
	return Parser._parse_aToB(Parser.CROCHET_HOOK_MM_TO_US, sz);
};

// SOURCES =============================================================================================================

Parser.SRC_5ETOOLS_TMP = "SRC_5ETOOLS_TMP"; // Temp source, used as a placeholder value

Parser.SRC_CoS = "CoS";
Parser.SRC_DMG = "DMG";
Parser.SRC_EEPC = "EEPC";
Parser.SRC_EET = "EET";
Parser.SRC_HotDQ = "HotDQ";
Parser.SRC_LMoP = "LMoP";
Parser.SRC_MM = "MM";
Parser.SRC_OotA = "OotA";
Parser.SRC_PHB = "PHB";
Parser.SRC_PotA = "PotA";
Parser.SRC_RoT = "RoT";
Parser.SRC_RoTOS = "RoTOS";
Parser.SRC_SCAG = "SCAG";
Parser.SRC_SKT = "SKT";
Parser.SRC_ToA = "ToA";
Parser.SRC_TLK = "TLK";
Parser.SRC_ToD = "ToD";
Parser.SRC_TTP = "TTP";
Parser.SRC_TYP = "TftYP";
Parser.SRC_TYP_AtG = "TftYP-AtG";
Parser.SRC_TYP_DiT = "TftYP-DiT";
Parser.SRC_TYP_TFoF = "TftYP-TFoF";
Parser.SRC_TYP_THSoT = "TftYP-THSoT";
Parser.SRC_TYP_TSC = "TftYP-TSC";
Parser.SRC_TYP_ToH = "TftYP-ToH";
Parser.SRC_TYP_WPM = "TftYP-WPM";
Parser.SRC_VGM = "VGM";
Parser.SRC_XGE = "XGE";
Parser.SRC_OGA = "OGA";
Parser.SRC_MTF = "MTF";
Parser.SRC_WDH = "WDH";
Parser.SRC_WDMM = "WDMM";
Parser.SRC_GGR = "GGR";
Parser.SRC_KKW = "KKW";
Parser.SRC_LLK = "LLK";
Parser.SRC_AZfyT = "AZfyT";
Parser.SRC_GoS = "GoS";
Parser.SRC_AI = "AI";
Parser.SRC_OoW = "OoW";
Parser.SRC_ESK = "ESK";
Parser.SRC_DIP = "DIP";
Parser.SRC_HftT = "HftT";
Parser.SRC_DC = "DC";
Parser.SRC_SLW = "SLW";
Parser.SRC_SDW = "SDW";
Parser.SRC_BGDIA = "BGDIA";
Parser.SRC_LR = "LR";
Parser.SRC_AL = "AL";
Parser.SRC_SAC = "SAC";
Parser.SRC_ERLW = "ERLW";
Parser.SRC_EFR = "EFR";
Parser.SRC_RMBRE = "RMBRE";
Parser.SRC_RMR = "RMR";
Parser.SRC_MFF = "MFF";
Parser.SRC_AWM = "AWM";
Parser.SRC_IMR = "IMR";
Parser.SRC_SADS = "SADS";
Parser.SRC_EGW = "EGW";
Parser.SRC_EGW_ToR = "ToR";
Parser.SRC_EGW_DD = "DD";
Parser.SRC_EGW_FS = "FS";
Parser.SRC_EGW_US = "US";
Parser.SRC_MOT = "MOT";
Parser.SRC_IDRotF = "IDRotF";
Parser.SRC_TCE = "TCE";
Parser.SRC_VRGR = "VRGR";
Parser.SRC_HoL = "HoL";
Parser.SRC_XMtS = "XMtS";
Parser.SRC_RtG = "RtG";
Parser.SRC_AitFR = "AitFR";
Parser.SRC_AitFR_ISF = "AitFR-ISF";
Parser.SRC_AitFR_THP = "AitFR-THP";
Parser.SRC_AitFR_AVT = "AitFR-AVT";
Parser.SRC_AitFR_DN = "AitFR-DN";
Parser.SRC_AitFR_FCD = "AitFR-FCD";
Parser.SRC_WBtW = "WBtW";
Parser.SRC_DoD = "DoD";
Parser.SRC_MaBJoV = "MaBJoV";
Parser.SRC_FTD = "FTD";
Parser.SRC_SCC = "SCC";
Parser.SRC_SCC_CK = "SCC-CK";
Parser.SRC_SCC_HfMT = "SCC-HfMT";
Parser.SRC_SCC_TMM = "SCC-TMM";
Parser.SRC_SCC_ARiR = "SCC-ARiR";
Parser.SRC_MPMM = "MPMM";
Parser.SRC_CRCotN = "CRCotN";
Parser.SRC_JttRC = "JttRC";
Parser.SRC_SAiS = "SAiS";
Parser.SRC_AAG = "AAG";
Parser.SRC_BAM = "BAM";
Parser.SRC_LoX = "LoX";
Parser.SRC_DoSI = "DoSI";
Parser.SRC_DSotDQ = "DSotDQ";
Parser.SRC_KftGV = "KftGV";
Parser.SRC_BGG = "BGG";
Parser.SRC_PaBTSO = "PaBTSO";
Parser.SRC_PAitM = "PAitM";
Parser.SRC_SatO = "SatO";
Parser.SRC_ToFW = "ToFW";
Parser.SRC_MPP = "MPP";
Parser.SRC_BMT = "BMT";
Parser.SRC_DMTCRG = "DMTCRG";
Parser.SRC_QftIS = "QftIS";
Parser.SRC_VEoR = "VEoR";
Parser.SRC_XPHB = "XPHB";
Parser.SRC_XDMG = "XDMG";
Parser.SRC_XMM = "XMM";
Parser.SRC_XSAC = "XSAC";
Parser.SRC_DrDe = "DrDe";
Parser.SRC_DrDe_DaS = "DrDe-DaS";
Parser.SRC_DrDe_BD = "DrDe-BD";
Parser.SRC_DrDe_TWoO = "DrDe-TWoO";
Parser.SRC_DrDe_FWtVC = "DrDe-FWtVC";
Parser.SRC_DrDe_TDoN = "DrDe-TDoN";
Parser.SRC_DrDe_TFV = "DrDe-TFV";
Parser.SRC_DrDe_BtS = "DrDe-BtS";
Parser.SRC_DrDe_SD = "DrDe-SD";
Parser.SRC_DrDe_ACfaS = "DrDe-ACfaS";
Parser.SRC_DrDe_DotS = "DrDe-DotSC";
Parser.SRC_HotB = "HotB";
Parser.SRC_WttHC = "WttHC";
Parser.SRC_FRAiF = "FRAiF";
Parser.SRC_FRHoF = "FRHoF";
Parser.SRC_ABH = "ABH";
Parser.SRC_NF = "NF";
Parser.SRC_LFL = "LFL";
Parser.SRC_EFA = "EFA";
Parser.SRC_FFotR = "FFotR";
Parser.SRC_RHW = "RHW";
Parser.SRC_AU = "AU";
Parser.SRC_AUD = "AUD";

Parser.SRC_TD = "TD";
Parser.SRC_SCREEN = "Screen";
Parser.SRC_SCREEN_WILDERNESS_KIT = "ScreenWildernessKit";
Parser.SRC_SCREEN_DUNGEON_KIT = "ScreenDungeonKit";
Parser.SRC_SCREEN_SPELLJAMMER = "ScreenSpelljammer";
Parser.SRC_XSCREEN = "XScreen";
Parser.SRC_XSCREEN_RHW = "XScreenRHW";
Parser.SRC_HF = "HF";
Parser.SRC_HFFotM = "HFFotM";
Parser.SRC_HFStCM = "HFStCM";
Parser.SRC_PaF = "PaF";
Parser.SRC_HFDoMM = "HFDoMM";
Parser.SRC_HFLotT = "HFLotT";
Parser.SRC_CM = "CM";
Parser.SRC_NRH = "NRH";
Parser.SRC_NRH_TCMC = "NRH-TCMC";
Parser.SRC_NRH_AVitW = "NRH-AVitW";
Parser.SRC_NRH_ASS = "NRH-ASS"; // lmao
Parser.SRC_NRH_CoI = "NRH-CoI";
Parser.SRC_NRH_TLT = "NRH-TLT";
Parser.SRC_NRH_AWoL = "NRH-AWoL";
Parser.SRC_NRH_AT = "NRH-AT";
Parser.SRC_MGELFT = "MGELFT";
Parser.SRC_VD = "VD";
Parser.SRC_SjA = "SjA";
Parser.SRC_HAT_TG = "HAT-TG";
Parser.SRC_HAT_LMI = "HAT-LMI";
Parser.SRC_GotSF = "GotSF";
Parser.SRC_LK = "LK";
Parser.SRC_CoA = "CoA";
Parser.SRC_PiP = "PiP";
Parser.SRC_DitLCoT = "DitLCoT";
Parser.SRC_VNotEE = "VNotEE";
Parser.SRC_LRDT = "LRDT";
Parser.SRC_UtHftLH = "UtHftLH";
Parser.SRC_ScoEE = "ScoEE";
Parser.SRC_HBTD = "HBTD";
Parser.SRC_BQGT = "BQGT";
Parser.SRC_CaBoMP = "CaBoMP";
Parser.SRC_BQDD = "BQDD";
Parser.SRC_RWG = "RWG";

Parser.SRC_PS_PREFIX = "PS";

Parser.SRC_PSA = `${Parser.SRC_PS_PREFIX}A`;
Parser.SRC_PSI = `${Parser.SRC_PS_PREFIX}I`;
Parser.SRC_PSK = `${Parser.SRC_PS_PREFIX}K`;
Parser.SRC_PSZ = `${Parser.SRC_PS_PREFIX}Z`;
Parser.SRC_PSX = `${Parser.SRC_PS_PREFIX}X`;
Parser.SRC_PSD = `${Parser.SRC_PS_PREFIX}D`;

Parser.SRC_UA_PREFIX = "UA";
Parser.SRC_UA_ONE_PREFIX = "XUA";
Parser.SRC_MCVX_PREFIX = "MCV";
Parser.SRC_MisMVX_PREFIX = "MisMV";
Parser.SRC_AA_PREFIX = "AA";

Parser.SRC_UATMC = `${Parser.SRC_UA_PREFIX}TheMysticClass`;
Parser.SRC_MCV1SC = `${Parser.SRC_MCVX_PREFIX}1SC`;
Parser.SRC_MCV2DC = `${Parser.SRC_MCVX_PREFIX}2DC`;
Parser.SRC_MCV3MC = `${Parser.SRC_MCVX_PREFIX}3MC`;
Parser.SRC_MCV4EC = `${Parser.SRC_MCVX_PREFIX}4EC`;
Parser.SRC_MisMV1 = `${Parser.SRC_MisMVX_PREFIX}1`;
Parser.SRC_AATM = `${Parser.SRC_AA_PREFIX}TM`;

Parser.AL_PREFIX = "冒险者联盟：";
Parser.AL_PREFIX_SHORT = "AL: ";
Parser.PS_PREFIX = "异界传送系列：";
Parser.PS_PREFIX_SHORT = "PS: ";
Parser.UA_PREFIX = "破解奥秘：";
Parser.UA_PREFIX_SHORT = "UA: ";
Parser.TftYP_NAME = "哈欠传送门故事集";
Parser.AitFR_NAME = "被遗忘国度的冒险";
Parser.NRH_NAME = "NERDS 恢复和谐";
Parser.MCVX_PREFIX = "怪物纲要系列";
Parser.MisMVX_PREFIX = "错位怪物";
Parser.AA_PREFIX = "冒险地图匣：";

Parser.SOURCE_JSON_TO_FULL = {};
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_CoS] = "施特拉德的诅咒";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_DMG] = "地下城主指南";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_EEPC] = "邪恶元素玩家扩展";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_EET] = "邪恶元素小饰品";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_HotDQ] = "龙后的宝山";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_LMoP] = "凡戴尔的失落矿坑";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_MM] = "怪物图鉴";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_OotA] = "逃离深渊";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_PHB] = "玩家手册";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_PotA] = "毁灭亲王";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_RoT] = "提亚马特的崛起";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_RoTOS] = "提亚马特的崛起 在线增刊";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_SCAG] = "剑湾冒险者指南";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_SKT] = "风暴君王之雷霆";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_ToA] = "湮灭之墓";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_TLK] = "迷失的天狗";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_ToD] = "龙族暴政";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_TTP] = "龟人扩充包";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_TYP] = Parser.TftYP_NAME;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_TYP_AtG] = `${Parser.TftYP_NAME}: 挑战巨人`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_TYP_DiT] = `${Parser.TftYP_NAME}: 死于赛尔`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_TYP_TFoF] = `${Parser.TftYP_NAME}: 愤怒熔炉`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_TYP_THSoT] = `${Parser.TftYP_NAME}: 隐秘圣坛`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_TYP_TSC] = `${Parser.TftYP_NAME}: 暗无天日`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_TYP_ToH] = `${Parser.TftYP_NAME}: 恐怖墓穴`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_TYP_WPM] = `${Parser.TftYP_NAME}: 白羽山`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_VGM] = "瓦罗的怪物指南";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_XGE] = "珊娜萨的万事指南";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_OGA] = "一蛙之上";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_MTF] = "魔邓肯的众敌卷册";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_WDH] = "深水城：龙金飞劫";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_WDMM] = "深水城：疯法师的地下城";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_GGR] = "拉尼卡的公会长指南";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_KKW] = "追捕克仑可";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_LLK] = "夸力许的失落实验室";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_AZfyT] = "给我你的思维瓶";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_GoS] = "盐沼幽魂";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_AI] = "艾奎兹玄有限责任公司";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_OoW] = "位面游荡仪";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_ESK] = "基础包";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_DIP] = "冰塔峰之龙";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_HftT] = "寻找特萨尔蛇蜥";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_DC] = "神圣的争夺";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_SLW] = "风暴领主之怒";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_SDW] = "沉睡巨龙醒转";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_BGDIA] = "博德之门：坠入阿弗纳斯";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_LR] = "洛卡鱼人崛起";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_AL] = "冒险者联盟";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_SAC] = "贤者谏言合集 (5e/2014)";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_ERLW] = "艾伯伦：从终末战争中崛起";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_EFR] = "艾伯伦：失落的圣物";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_RMBRE] = "瑞克与莫蒂：BRE";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_RMR] = "龙与地下城 vs. 瑞克与莫蒂：基础规则";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_MFF] = "魔邓肯邪魔开本";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_AWM] = "与穆克一起冒险";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_IMR] = "重建炼狱机器";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_SADS] = "蓝宝石周年纪念骰套组";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_EGW] = "荒洲探险家指南";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_EGW_ToR] = "复仇之潮";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_EGW_DD] = "危险计划";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_EGW_FS] = "封冻恶疾";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_EGW_US] = "恶客自来";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_MOT] = "塞洛斯之神话奥德赛";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_IDRotF] = "冰风谷：冰霜少女的雾凇";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_TCE] = "塔莎的万事坩埚";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_VRGR] = "范·里希腾的鸦阁魔域指南";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_HoL] = "恸哭之屋";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_RtG] = "回归荣耀";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_AitFR] = Parser.AitFR_NAME;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_AitFR_ISF] = `${Parser.AitFR_NAME}: 绯红烈焰`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_AitFR_THP] = `${Parser.AitFR_NAME}: 隐秘书页`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_AitFR_AVT] = `${Parser.AitFR_NAME}: 葱郁墓穴`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_AitFR_DN] = `${Parser.AitFR_NAME}: 至暗之夜`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_AitFR_FCD] = `${Parser.AitFR_NAME}: 青渊来客`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_WBtW] = "巫光之外的荒野";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_DoD] = "快乐领域";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_MaBJoV] = "明斯克与布布恶棍志";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_FTD] = "费资本的巨龙宝库";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_SCC] = "斯翠海文：混沌研习";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_SCC_CK] = "校园风波";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_SCC_HfMT] = "追寻法师塔";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_SCC_TMM] = "院长的化妆舞会";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_SCC_ARiR] = "废墟中的审判";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_MPMM] = "魔邓肯巨献：多元宇宙的怪物";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_CRCotN] = "溟渊的呼唤";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_JttRC] = "耀光城之旅";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_SAiS] = "魔法船：冒险于太空中";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_AAG] = "星界冒险者指南";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_BAM] = "布布的星界怪兽展";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_LoX] = "萨里希斯之光";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_DoSI] = "风骸岛之龙";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_DSotDQ] = "龙枪：龙后之影";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_KftGV] = "黄金宝库之钥";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_BGG] = "毕格比巨献：巨人之荣耀";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_PaBTSO] = "凡戴尔之下：破碎方尖碑";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_PAitM] = "异度风景：多元宇宙冒险";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_SatO] = "印记城与外域";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_ToFW] = "命运之轮的轮转";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_MPP] = "莫提的位面游记";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_BMT] = "万象无常书";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_DMTCRG] = "万象无常牌：参考卡";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_QftIS] = "来自无尽阶梯的委托集";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_VEoR] = "维克那：毁灭前夜";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_XPHB] = "玩家手册(2024)";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_XDMG] = "地下城城主指南(2024)";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_XMM] = "怪物图鉴(2025)";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_XSAC] = "贤者谏言合集(2025)";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_DrDe] = "巨龙迷城";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_DrDe_DaS] = "日落时分的死神";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_DrDe_BD] = "面包师的捉襟见肘";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_DrDe_TWoO] = "奥喀斯之命";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_DrDe_FWtVC] = "虚空唤谁而鸣";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_DrDe_TDoN] = "纳基凯尔之龙";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_DrDe_TFV] = "禁忌谷";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_DrDe_BtS] = "风暴将临";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_DrDe_SD] = "夺命颤寒";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_DrDe_ACfaS] = "一枚铜币换一首歌";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_DrDe_DotS] = "砂岩城之龙";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_HotB] = "边陲之地的英雄们";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_WttHC] = "怪奇物语：欢迎来到地狱火俱乐部";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_FRAiF] = "被遗忘的国度：费伦冒险";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_FRHoF] = "被遗忘的国度：费伦英雄";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_ABH] = "阿斯代伦的饥渴卷册";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_NF] = "耐瑟瑞尔的陨落";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_LFL] = "洛温：初光";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_EFA] = "艾伯伦: 奇械锻炉";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_FFotR] = "隐士的命定航旅";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_RHW] = "鸦阁魔域：魔障深藏";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_AU] = "启封奥秘";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_AUD] = "启封奥秘：死亡陷阱";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_TD] = "塔罗牌";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_SCREEN] = "地下城主帷幕";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_SCREEN_WILDERNESS_KIT] = "地下城主帷幕：荒野套组";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_SCREEN_DUNGEON_KIT] = "地下城主帷幕：地下城套组";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_SCREEN_SPELLJAMMER] = "地下城主帷幕：魔法船";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_XSCREEN] = "地下城主帷幕（2024）";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_XSCREEN_RHW] = "地下城主帷幕; 鸦阁魔域：魔障深藏";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_HF] = "英雄盛宴";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_HFFotM] = "英雄盛宴：多元宇宙风味";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_HFStCM] = "英雄盛宴：救救孩子的菜谱";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_PaF] = "骰子与酒杯";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_HFDoMM] = "英雄盛宴：佳肴百珍牌";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_HFLotT] = "英雄盛宴：餐桌传奇";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_CM] = "烛堡秘辛";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_NRH] = Parser.NRH_NAME;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_NRH_TCMC] = `${Parser.NRH_NAME}: 糖果山冒险`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_NRH_AVitW] = `${Parser.NRH_NAME}: 荒野呼唤`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_NRH_ASS] = `${Parser.NRH_NAME}: 棘手局面`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_NRH_CoI] = `${Parser.NRH_NAME}: 幻象马戏团`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_NRH_TLT] = `${Parser.NRH_NAME}: 失落墓穴`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_NRH_AWoL] = `${Parser.NRH_NAME}: 谎言之网`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_NRH_AT] = `${Parser.NRH_NAME}: 共同冒险`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_MGELFT] = "穆克的塔莎所授万事指南";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_VD] = "维克那档案";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_SjA] = "星航学院";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_HAT_TG] = "侠盗荣耀：侠盗画廊";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_HAT_LMI] = "侠盗荣耀：传说魔法物品";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_GotSF] = "坠星铸炉的巨人";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_LK] = "闪电哨站";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_CoA] = "阿斯蒙蒂斯的锁链";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_PiP] = "松溪险境";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_DitLCoT] = "索吉坎的失落洞群";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_VNotEE] = "维克那：妖眼魔窟";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_LRDT] = "红龙传说：乐高冒险";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_UtHftLH] = "小独与追寻失落之角";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_ScoEE] = "元素邪恶后裔";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_HBTD] = "拒止亡者";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_BQGT] = "边陲之地任务：地精之患";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_PSA] = `${Parser.PS_PREFIX}阿芒凯`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_PSI] = `${Parser.PS_PREFIX}依尼翠`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_PSK] = `${Parser.PS_PREFIX}卡拉德许`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_PSZ] = `${Parser.PS_PREFIX}赞迪卡`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_PSX] = `${Parser.PS_PREFIX}依夏兰`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_PSD] = `${Parser.PS_PREFIX}多明纳里亚`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_XMtS] = `X Marks the Spot`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_UATMC] = `${Parser.UA_PREFIX}秘术师`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_MCV1SC] = `${Parser.MCVX_PREFIX}卷一：魔法船生物`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_MCV2DC] = `${Parser.MCVX_PREFIX}卷二：龙枪生物`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_MCV3MC] = `${Parser.MCVX_PREFIX}卷三：Minecraft生物`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_MCV4EC] = `${Parser.MCVX_PREFIX}卷四：艾卓生物`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_MisMV1] = `${Parser.MisMVX_PREFIX}卷一`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_AATM] = `${Parser.AA_PREFIX}葬仪社`;
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_CaBoMP] = "钩针编织：百变图案集";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_BQDD] = "边陲之地任务：匕首危机！";
Parser.SOURCE_JSON_TO_FULL[Parser.SRC_RWG] = "红袍巫师的博弈";

Parser.SOURCE_JSON_TO_ABV = {};
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_PHB] = "PHB'14";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_DMG] = "DMG'14";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_MM] = "MM'14";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_CoS] = "CoS";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_EEPC] = "EEPC";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_EET] = "EET";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_HotDQ] = "HotDQ";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_LMoP] = "LMoP";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_OotA] = "OotA";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_PotA] = "PotA";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_RoT] = "RoT";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_RoTOS] = "RoTOS";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_SCAG] = "SCAG";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_SKT] = "SKT";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_ToA] = "ToA";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_TLK] = "TLK";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_ToD] = "ToD";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_TTP] = "TTP";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_TYP] = "TftYP";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_TYP_AtG] = "TftYP";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_TYP_DiT] = "TftYP";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_TYP_TFoF] = "TftYP";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_TYP_THSoT] = "TftYP";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_TYP_TSC] = "TftYP";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_TYP_ToH] = "TftYP";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_TYP_WPM] = "TftYP";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_VGM] = "VGM";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_XGE] = "XGE";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_OGA] = "OGA";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_MTF] = "MTF";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_WDH] = "WDH";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_WDMM] = "WDMM";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_GGR] = "GGR";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_KKW] = "KKW";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_LLK] = "LLK";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_AZfyT] = "AZfyT";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_GoS] = "GoS";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_AI] = "AI";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_OoW] = "OoW";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_ESK] = "ESK";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_DIP] = "DIP";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_HftT] = "HftT";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_DC] = "DC";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_SLW] = "SLW";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_SDW] = "SDW";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_BGDIA] = "BGDIA";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_LR] = "LR";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_AL] = "AL";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_SAC] = "SAC'14";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_ERLW] = "ERLW";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_EFR] = "EFR";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_RMBRE] = "RMBRE";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_RMR] = "RMR";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_MFF] = "MFF";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_AWM] = "AWM";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_IMR] = "IMR";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_SADS] = "SADS";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_EGW] = "EGW";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_EGW_ToR] = "ToR";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_EGW_DD] = "DD";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_EGW_FS] = "FS";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_EGW_US] = "US";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_MOT] = "MOT";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_IDRotF] = "IDRotF";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_TCE] = "TCE";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_VRGR] = "VRGR";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_HoL] = "HoL";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_RtG] = "RtG";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_AitFR] = "AitFR";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_AitFR_ISF] = "AitFR-ISF";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_AitFR_THP] = "AitFR-THP";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_AitFR_AVT] = "AitFR-AVT";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_AitFR_DN] = "AitFR-DN";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_AitFR_FCD] = "AitFR-FCD";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_WBtW] = "WBtW";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_DoD] = "DoD";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_MaBJoV] = "MaBJoV";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_FTD] = "FTD";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_SCC] = "SCC";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_SCC_CK] = "SCC-CK";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_SCC_HfMT] = "SCC-HfMT";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_SCC_TMM] = "SCC-TMM";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_SCC_ARiR] = "SCC-ARiR";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_MPMM] = "MPMM";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_CRCotN] = "CRCotN";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_JttRC] = "JttRC";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_SAiS] = "SAiS";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_AAG] = "AAG";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_BAM] = "BAM";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_LoX] = "LoX";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_DoSI] = "DoSI";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_DSotDQ] = "DSotDQ";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_KftGV] = "KftGV";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_BGG] = "BGG";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_PaBTSO] = "PaBTSO";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_PAitM] = "PAitM";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_SatO] = "SatO";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_ToFW] = "ToFW";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_MPP] = "MPP";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_BMT] = "BMT";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_DMTCRG] = "DMTCRG";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_QftIS] = "QftIS";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_VEoR] = "VEoR";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_XPHB] = "PHB'24";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_XDMG] = "DMG'24";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_XMM] = "MM'25";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_XSAC] = "SAC'25";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_DrDe] = "DrDe";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_DrDe_DaS] = "DrDe-DaS";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_DrDe_BD] = "DrDe-BD";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_DrDe_TWoO] = "DrDe-TWoO";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_DrDe_FWtVC] = "DrDe-FWtVC";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_DrDe_TDoN] = "DrDe-TDoN";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_DrDe_TFV] = "DrDe-TFV";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_DrDe_BtS] = "DrDe-BtS";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_DrDe_SD] = "DrDe-SD";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_DrDe_ACfaS] = "DrDe-ACfaS";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_DrDe_DotS] = "DrDe-DotSC";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_HotB] = "HotB";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_WttHC] = "WttHC";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_FRAiF] = "FRAiF";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_FRHoF] = "FRHoF";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_ABH] = "ABH";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_NF] = "NF";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_LFL] = "LFL";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_EFA] = "EFA";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_FFotR] = "FFotR";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_RHW] = "RHW";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_AU] = "AU";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_AUD] = "AUD";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_TD] = "TD";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_SCREEN] = "Scr'14";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_SCREEN_WILDERNESS_KIT] = "ScrWild";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_SCREEN_DUNGEON_KIT] = "ScrDun";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_SCREEN_SPELLJAMMER] = "ScrSJ";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_XSCREEN] = "Scr'24";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_XSCREEN_RHW] = "ScrRHW";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_HF] = "HF";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_HFFotM] = "HFFotM";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_HFStCM] = "HFStCM";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_PaF] = "PaF";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_HFDoMM] = "HFDoMM";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_HFLotT] = "HFLotT";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_CM] = "CM";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_NRH] = "NRH";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_NRH_TCMC] = "NRH-TCMC";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_NRH_AVitW] = "NRH-AVitW";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_NRH_ASS] = "NRH-ASS";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_NRH_CoI] = "NRH-CoI";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_NRH_TLT] = "NRH-TLT";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_NRH_AWoL] = "NRH-AWoL";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_NRH_AT] = "NRH-AT";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_MGELFT] = "MGELFT";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_VD] = "VD";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_SjA] = "SjA";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_HAT_TG] = "HAT-TG";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_HAT_LMI] = "HAT-LMI";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_GotSF] = "GotSF";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_LK] = "LK";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_CoA] = "CoA";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_PiP] = "PiP";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_DitLCoT] = "DitLCoT";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_VNotEE] = "VNotEE";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_LRDT] = "LRDT";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_UtHftLH] = "UHftLH";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_ScoEE] = "ScoEE";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_HBTD] = "HBTD";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_BQGT] = "BQGT";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_PSA] = "PSA";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_PSI] = "PSI";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_PSK] = "PSK";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_PSZ] = "PSZ";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_PSX] = "PSX";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_PSD] = "PSD";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_XMtS] = "XMtS";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_UATMC] = "UAMy";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_MCV1SC] = "MCV1SC";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_MCV2DC] = "MCV2DC";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_MCV3MC] = "MCV3MC";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_MCV4EC] = "MCV4EC";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_MisMV1] = "MisMV1";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_AATM] = "AATM";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_CaBoMP] = "CaBoMP";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_BQDD] = "BQDD";
Parser.SOURCE_JSON_TO_ABV[Parser.SRC_RWG] = "RWG";

Parser.SOURCE_JSON_TO_DATE = {};
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_PHB] = "2014-08-19";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DMG] = "2014-12-09";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_MM] = "2014-09-30";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_CoS] = "2016-03-15";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_EEPC] = "2015-03-10";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_EET] = "2015-03-10";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_HotDQ] = "2014-08-19";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_LMoP] = "2014-07-15";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_OotA] = "2015-09-15";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_PotA] = "2015-04-07";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_RoT] = "2014-11-04";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_RoTOS] = "2014-11-04";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_SCAG] = "2015-11-03";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_SKT] = "2016-09-06";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_ToA] = "2017-09-19";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_TLK] = "2017-11-28";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_ToD] = "2019-10-22";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_TTP] = "2017-09-19";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_TYP] = "2017-04-04";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_TYP_AtG] = "2017-04-04";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_TYP_DiT] = "2017-04-04";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_TYP_TFoF] = "2017-04-04";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_TYP_THSoT] = "2017-04-04";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_TYP_TSC] = "2017-04-04";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_TYP_ToH] = "2017-04-04";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_TYP_WPM] = "2017-04-04";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_VGM] = "2016-11-15";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_XGE] = "2017-11-21";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_OGA] = "2017-10-11";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_MTF] = "2018-05-29";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_WDH] = "2018-09-18";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_WDMM] = "2018-11-20";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_GGR] = "2018-11-20";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_KKW] = "2018-11-20";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_LLK] = "2018-11-10";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_AZfyT] = "2019-03-05";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_GoS] = "2019-05-21";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_AI] = "2019-06-18";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_OoW] = "2019-06-18";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_ESK] = "2019-06-24";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DIP] = "2019-06-24";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_HftT] = "2019-05-01";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DC] = "2019-06-24";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_SLW] = "2019-06-24";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_SDW] = "2019-06-24";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_BGDIA] = "2019-09-17";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_LR] = "2019-09-19";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_SAC] = "2019-01-31";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_ERLW] = "2019-11-19";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_EFR] = "2019-11-19";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_RMBRE] = "2019-11-19";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_RMR] = "2019-11-19";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_MFF] = "2019-11-12";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_AWM] = "2019-11-12";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_IMR] = "2019-11-12";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_SADS] = "2019-12-12";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_EGW] = "2020-03-17";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_EGW_ToR] = "2020-03-17";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_EGW_DD] = "2020-03-17";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_EGW_FS] = "2020-03-17";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_EGW_US] = "2020-03-17";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_MOT] = "2020-06-02";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_IDRotF] = "2020-09-15";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_TCE] = "2020-11-17";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_VRGR] = "2021-05-18";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_HoL] = "2021-05-18";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_RtG] = "2021-05-21";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_AitFR] = "2021-06-30";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_AitFR_ISF] = "2021-06-30";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_AitFR_THP] = "2021-07-07";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_AitFR_AVT] = "2021-07-14";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_AitFR_DN] = "2021-07-21";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_AitFR_FCD] = "2021-07-28";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_WBtW] = "2021-09-21";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DoD] = "2021-09-21";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_MaBJoV] = "2021-10-05";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_FTD] = "2021-11-26";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_SCC] = "2021-12-07";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_SCC_CK] = "2021-12-07";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_SCC_HfMT] = "2021-12-07";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_SCC_TMM] = "2021-12-07";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_SCC_ARiR] = "2021-12-07";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_MPMM] = "2022-01-25";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_CRCotN] = "2022-03-15";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_JttRC] = "2022-07-19";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_SAiS] = "2022-08-16";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_AAG] = "2022-08-16";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_BAM] = "2022-08-16";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_LoX] = "2022-08-16";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DoSI] = "2022-07-31";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DSotDQ] = "2022-11-22";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_KftGV] = "2023-02-21";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_BGG] = "2023-08-15";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_PaBTSO] = "2023-09-19";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_PAitM] = "2023-10-17";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_SatO] = "2023-10-17";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_ToFW] = "2023-10-17";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_MPP] = "2023-10-17";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_BMT] = "2023-11-14";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DMTCRG] = "2023-11-14";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_QftIS] = "2024-07-16";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_VEoR] = "2024-05-21";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_XPHB] = "2024-09-17";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_XDMG] = "2024-11-12";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_XMM] = "2025-02-18";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_XSAC] = "2025-04-30";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DrDe] = "2025-07-08";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DrDe_DaS] = Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DrDe];
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DrDe_BD] = Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DrDe];
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DrDe_TWoO] = Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DrDe];
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DrDe_FWtVC] = Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DrDe];
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DrDe_TDoN] = Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DrDe];
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DrDe_TFV] = Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DrDe];
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DrDe_BtS] = Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DrDe];
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DrDe_SD] = Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DrDe];
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DrDe_ACfaS] = Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DrDe];
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DrDe_DotS] = Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DrDe];
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_HotB] = "2025-09-16";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_WttHC] = "2025-10-07";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_FRAiF] = "2025-11-11";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_FRHoF] = "2025-11-11";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_ABH] = "2025-11-11";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_NF] = "2025-11-11";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_LFL] = "2025-11-18";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_EFA] = "2025-12-09";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_FFotR] = "2025-12-09";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_RHW] = "2026-06-16";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_AU] = "2026-09-15";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_AUD] = "2026-09-15";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_TD] = "2022-05-24";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_SCREEN] = "2015-01-20";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_SCREEN_WILDERNESS_KIT] = "2020-11-17";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_SCREEN_DUNGEON_KIT] = "2020-09-21";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_SCREEN_SPELLJAMMER] = "2022-08-16";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_XSCREEN] = "2024-11-12";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_XSCREEN_RHW] = "2026-06-16";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_HF] = "2020-10-27";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_HFFotM] = "2023-11-07";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_HFStCM] = "2023-11-21";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_PaF] = "2024-08-27";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_HFDoMM] = "2024-10-01";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_HFDoMM] = "2026-09-15";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_CM] = "2021-03-16";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_NRH] = "2021-09-01";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_NRH_TCMC] = "2021-09-01";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_NRH_AVitW] = "2021-09-01";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_NRH_ASS] = "2021-09-01";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_NRH_CoI] = "2021-09-01";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_NRH_TLT] = "2021-09-01";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_NRH_AWoL] = "2021-09-01";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_NRH_AT] = "2021-09-01";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_MGELFT] = "2020-12-01";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_VD] = "2022-06-09";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_SjA] = "2022-07-11"; // pt1; pt2 2022-07-18; pt3 2022-07-25; pt4 2022-08-01
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_HAT_TG] = "2023-03-06";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_HAT_LMI] = "2023-03-31";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_GotSF] = "2023-08-01";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_LK] = "2023-09-26";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_CoA] = "2023-10-30";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_PiP] = "2023-11-20";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_DitLCoT] = "2024-03-26";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_VNotEE] = "2024-04-16";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_LRDT] = "2024-04-01";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_UtHftLH] = "2024-09-24";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_ScoEE] = "2024-10-24";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_HBTD] = "2025-02-07";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_BQGT] = "2025-06-04";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_PSA] = "2017-07-06";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_PSI] = "2016-07-12";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_PSK] = "2017-02-16";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_PSZ] = "2016-04-27";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_PSX] = "2018-01-09";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_PSD] = "2018-07-31";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_XMtS] = "2017-12-11";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_UATMC] = "2017-03-13";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_MCV1SC] = "2022-04-21";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_MCV2DC] = "2022-12-05";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_MCV3MC] = "2023-03-28";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_MCV4EC] = "2023-09-21";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_MisMV1] = "2023-05-03";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_AATM] = "2023-10-17";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_CaBoMP] = "2026-03-31";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_BQDD] = "2026-05-28";
Parser.SOURCE_JSON_TO_DATE[Parser.SRC_RWG] = "2026-09-15";

// region Source categories
Parser.SOURCES_ADVENTURES = new Set([
	Parser.SRC_LMoP,
	Parser.SRC_HotDQ,
	Parser.SRC_RoT,
	Parser.SRC_RoTOS,
	Parser.SRC_PotA,
	Parser.SRC_OotA,
	Parser.SRC_CoS,
	Parser.SRC_SKT,
	Parser.SRC_TYP,
	Parser.SRC_TYP_AtG,
	Parser.SRC_TYP_DiT,
	Parser.SRC_TYP_TFoF,
	Parser.SRC_TYP_THSoT,
	Parser.SRC_TYP_TSC,
	Parser.SRC_TYP_ToH,
	Parser.SRC_TYP_WPM,
	Parser.SRC_ToA,
	Parser.SRC_TLK,
	Parser.SRC_TTP,
	Parser.SRC_WDH,
	Parser.SRC_LLK,
	Parser.SRC_WDMM,
	Parser.SRC_KKW,
	Parser.SRC_AZfyT,
	Parser.SRC_GoS,
	Parser.SRC_HftT,
	Parser.SRC_OoW,
	Parser.SRC_DIP,
	Parser.SRC_SLW,
	Parser.SRC_SDW,
	Parser.SRC_DC,
	Parser.SRC_BGDIA,
	Parser.SRC_LR,
	Parser.SRC_EFR,
	Parser.SRC_RMBRE,
	Parser.SRC_IMR,
	Parser.SRC_EGW_ToR,
	Parser.SRC_EGW_DD,
	Parser.SRC_EGW_FS,
	Parser.SRC_EGW_US,
	Parser.SRC_IDRotF,
	Parser.SRC_CM,
	Parser.SRC_HoL,
	Parser.SRC_XMtS,
	Parser.SRC_RtG,
	Parser.SRC_AitFR,
	Parser.SRC_AitFR_ISF,
	Parser.SRC_AitFR_THP,
	Parser.SRC_AitFR_AVT,
	Parser.SRC_AitFR_DN,
	Parser.SRC_AitFR_FCD,
	Parser.SRC_WBtW,
	Parser.SRC_NRH,
	Parser.SRC_NRH_TCMC,
	Parser.SRC_NRH_AVitW,
	Parser.SRC_NRH_ASS,
	Parser.SRC_NRH_CoI,
	Parser.SRC_NRH_TLT,
	Parser.SRC_NRH_AWoL,
	Parser.SRC_NRH_AT,
	Parser.SRC_SCC,
	Parser.SRC_SCC_CK,
	Parser.SRC_SCC_HfMT,
	Parser.SRC_SCC_TMM,
	Parser.SRC_SCC_ARiR,
	Parser.SRC_CRCotN,
	Parser.SRC_JttRC,
	Parser.SRC_SjA,
	Parser.SRC_LoX,
	Parser.SRC_DoSI,
	Parser.SRC_DSotDQ,
	Parser.SRC_KftGV,
	Parser.SRC_GotSF,
	Parser.SRC_PaBTSO,
	Parser.SRC_LK,
	Parser.SRC_CoA,
	Parser.SRC_PiP,
	Parser.SRC_DitLCoT,
	Parser.SRC_VNotEE,
	Parser.SRC_LRDT,
	Parser.SRC_UtHftLH,
	Parser.SRC_ScoEE,
	Parser.SRC_HFStCM,
	Parser.SRC_HBTD,
	Parser.SRC_BQGT,
	Parser.SRC_DrDe,
	Parser.SRC_DrDe_DaS,
	Parser.SRC_DrDe_BD,
	Parser.SRC_DrDe_TWoO,
	Parser.SRC_DrDe_FWtVC,
	Parser.SRC_DrDe_TDoN,
	Parser.SRC_DrDe_TFV,
	Parser.SRC_DrDe_BtS,
	Parser.SRC_DrDe_SD,
	Parser.SRC_DrDe_ACfaS,
	Parser.SRC_DrDe_DotS,
	Parser.SRC_HotB,
	Parser.SRC_WttHC,
	Parser.SRC_FFotR,
	Parser.SRC_AUD,
	Parser.SRC_AWM,
	Parser.SRC_RWG,
]);
Parser.SOURCES_CORE_SUPPLEMENTS = new Set(Object.keys(Parser.SOURCE_JSON_TO_FULL).filter(it => !Parser.SOURCES_ADVENTURES.has(it)));
Parser.SOURCES_NON_STANDARD_WOTC = new Set([
	Parser.SRC_OGA,
	Parser.SRC_LLK,
	Parser.SRC_AZfyT,
	Parser.SRC_LR,
	Parser.SRC_TLK,
	Parser.SRC_TTP,
	Parser.SRC_AWM,
	Parser.SRC_IMR,
	Parser.SRC_SADS,
	Parser.SRC_MFF,
	Parser.SRC_XMtS,
	Parser.SRC_RtG,
	Parser.SRC_AitFR,
	Parser.SRC_AitFR_ISF,
	Parser.SRC_AitFR_THP,
	Parser.SRC_AitFR_AVT,
	Parser.SRC_AitFR_DN,
	Parser.SRC_AitFR_FCD,
	Parser.SRC_DoD,
	Parser.SRC_MaBJoV,
	Parser.SRC_NRH,
	Parser.SRC_NRH_TCMC,
	Parser.SRC_NRH_AVitW,
	Parser.SRC_NRH_ASS,
	Parser.SRC_NRH_CoI,
	Parser.SRC_NRH_TLT,
	Parser.SRC_NRH_AWoL,
	Parser.SRC_NRH_AT,
	Parser.SRC_MGELFT,
	Parser.SRC_VD,
	Parser.SRC_SjA,
	Parser.SRC_HAT_TG,
	Parser.SRC_HAT_LMI,
	Parser.SRC_GotSF,
	Parser.SRC_MCV3MC,
	Parser.SRC_MCV4EC,
	Parser.SRC_MisMV1,
	Parser.SRC_LK,
	Parser.SRC_AATM,
	Parser.SRC_CoA,
	Parser.SRC_PiP,
	Parser.SRC_HFStCM,
	Parser.SRC_UtHftLH,
	Parser.SRC_ScoEE,
	Parser.SRC_HBTD,
	Parser.SRC_BQGT,
	Parser.SRC_RWG,
]);
Parser.SOURCES_PARTNERED_WOTC = new Set([
	/*
	Previously marked as "Partnered" on D&D Beyond, but as of
	  ~Dec 2025 marked as "Official" on https://www.dndbeyond.com/en/library?publisher=official
	// Parser.SRC_RMBRE,
	// Parser.SRC_RMR,
	// Parser.SRC_EGW,
	// Parser.SRC_EGW_ToR,
	// Parser.SRC_EGW_DD,
	// Parser.SRC_EGW_FS,
	// Parser.SRC_EGW_US,
	// Parser.SRC_CRCotN,
	// Parser.SRC_HftT,
	 */

	/*
	If we have Minecraft, we might as well have LEGO too.
	// Parser.SRC_LRDT,
	 */

	/*
	Previously marked as "Partnered", but is "officially licensed"; going by above
	  official-izing of dubious sources, and as it doesn't contain any gameplay elements,
	  this can be considered "official enough."
	// Parser.SRC_TD,
	 */
]);
Parser.SOURCES_LEGACY_WOTC = new Set([
	Parser.SRC_PHB,
	Parser.SRC_DMG,
	Parser.SRC_MM,
	Parser.SRC_SCREEN,
	Parser.SRC_EEPC,
	Parser.SRC_VGM,
	Parser.SRC_MTF,
]);

// An opinionated set of source that could be considered "core-core"
Parser.SOURCES_VANILLA = new Set([
	// Parser.SRC_DMG, // "Legacy" source, removed in favor of XDMG
	// Parser.SRC_MM, // "Legacy" source, removed in favor of XMM
	// Parser.SRC_PHB, // "Legacy" source, removed in favor of XPHB
	Parser.SRC_XDMG,
	Parser.SRC_XMM,
	Parser.SRC_XPHB,
	Parser.SRC_SCAG,
	// Parser.SRC_TTP, // "Legacy" source, removed in favor of MPMM
	// Parser.SRC_VGM, // "Legacy" source, removed in favor of MPMM
	Parser.SRC_XGE,
	// Parser.SRC_MTF, // "Legacy" source, removed in favor of MPMM
	// Parser.SRC_SAC, // "Legacy" source, removed in favor of XSAC
	Parser.SRC_XSAC,
	Parser.SRC_MFF,
	Parser.SRC_SADS,
	Parser.SRC_TCE,
	Parser.SRC_FTD,
	Parser.SRC_MPMM,
	// Parser.SRC_SCREEN, // "Legacy" source, removed in favor of XSCREEN
	Parser.SRC_XSCREEN,
	Parser.SRC_XSCREEN_RHW,
	Parser.SRC_SCREEN_WILDERNESS_KIT,
	Parser.SRC_SCREEN_DUNGEON_KIT,
	Parser.SRC_VD,
	Parser.SRC_GotSF,
	Parser.SRC_BGG,
	Parser.SRC_MaBJoV,
	Parser.SRC_CoA,
	Parser.SRC_BMT,
	Parser.SRC_DMTCRG,
	Parser.SRC_FRAiF,
	Parser.SRC_FRHoF,
	Parser.SRC_ABH,
	Parser.SRC_NF,
]);

// Any opinionated set of sources that are """hilarious, dude"""
Parser.SOURCES_COMEDY = new Set([
	Parser.SRC_AI,
	Parser.SRC_OoW,
	Parser.SRC_RMR,
	Parser.SRC_RMBRE,
	Parser.SRC_HftT,
	Parser.SRC_AWM,
	Parser.SRC_MGELFT,
	Parser.SRC_HAT_TG,
	Parser.SRC_HAT_LMI,
	Parser.SRC_MCV3MC,
	Parser.SRC_MisMV1,
	Parser.SRC_LK,
	Parser.SRC_PiP,
	Parser.SRC_LRDT,
	Parser.SRC_UtHftLH,
	Parser.SRC_ScoEE,
	Parser.SRC_HBTD,
	Parser.SRC_BQGT,
	Parser.SRC_WttHC,
]);

// Any opinionated set of sources that are "other settings"
Parser.SOURCES_NON_FR = new Set([
	Parser.SRC_GGR,
	Parser.SRC_KKW,
	Parser.SRC_ERLW,
	Parser.SRC_EFR,
	Parser.SRC_EGW,
	Parser.SRC_EGW_ToR,
	Parser.SRC_EGW_DD,
	Parser.SRC_EGW_FS,
	Parser.SRC_EGW_US,
	Parser.SRC_MOT,
	Parser.SRC_XMtS,
	Parser.SRC_AZfyT,
	Parser.SRC_SCC,
	Parser.SRC_SCC_CK,
	Parser.SRC_SCC_HfMT,
	Parser.SRC_SCC_TMM,
	Parser.SRC_SCC_ARiR,
	Parser.SRC_CRCotN,
	Parser.SRC_SjA,
	Parser.SRC_SAiS,
	Parser.SRC_AAG,
	Parser.SRC_BAM,
	Parser.SRC_LoX,
	Parser.SRC_DSotDQ,
	Parser.SRC_PAitM,
	Parser.SRC_SatO,
	Parser.SRC_ToFW,
	Parser.SRC_MPP,
	Parser.SRC_MCV4EC,
	Parser.SRC_LK,
	Parser.SRC_LRDT,
	Parser.SRC_UtHftLH,
	Parser.SRC_ScoEE,
	Parser.SRC_HBTD,
	Parser.SRC_BQGT,
	Parser.SRC_WttHC,
	Parser.SRC_LFL,
	Parser.SRC_EFA,
	Parser.SRC_FFotR,
]);

// endregion
Parser.SOURCES_AVAILABLE_DOCS_BOOK = {};
[
	Parser.SRC_PHB,
	Parser.SRC_MM,
	Parser.SRC_DMG,
	Parser.SRC_SCAG,
	Parser.SRC_VGM,
	Parser.SRC_OGA,
	Parser.SRC_XGE,
	Parser.SRC_MTF,
	Parser.SRC_GGR,
	Parser.SRC_AI,
	Parser.SRC_ERLW,
	Parser.SRC_RMR,
	Parser.SRC_AWM,
	Parser.SRC_MGELFT,
	Parser.SRC_EGW,
	Parser.SRC_MOT,
	Parser.SRC_TCE,
	Parser.SRC_VRGR,
	Parser.SRC_DoD,
	Parser.SRC_MaBJoV,
	Parser.SRC_FTD,
	Parser.SRC_SCC,
	Parser.SRC_MPMM,
	Parser.SRC_AAG,
	Parser.SRC_BAM,
	Parser.SRC_HAT_TG,
	Parser.SRC_SCREEN,
	Parser.SRC_SCREEN_WILDERNESS_KIT,
	Parser.SRC_SCREEN_DUNGEON_KIT,
	Parser.SRC_SCREEN_SPELLJAMMER,
	Parser.SRC_BGG,
	Parser.SRC_SatO,
	Parser.SRC_MPP,
	Parser.SRC_HF,
	Parser.SRC_HFFotM,
	Parser.SRC_PaF,
	Parser.SRC_HFLotT,
	Parser.SRC_BMT,
	Parser.SRC_DMTCRG,
	Parser.SRC_XPHB,
	Parser.SRC_XMM,
	Parser.SRC_XDMG,
	Parser.SRC_XSCREEN,
	Parser.SRC_TD,
	Parser.SRC_FRHoF,
	Parser.SRC_FRAiF,
	Parser.SRC_ABH,
	Parser.SRC_NF,
	Parser.SRC_LFL,
	Parser.SRC_EFA,
	Parser.SRC_CaBoMP,
	Parser.SRC_RHW,
	Parser.SRC_XSCREEN_RHW,
	Parser.SRC_AU,
].forEach(src => {
	Parser.SOURCES_AVAILABLE_DOCS_BOOK[src] = src;
	Parser.SOURCES_AVAILABLE_DOCS_BOOK[src.toLowerCase()] = src;
});
[
	{src: Parser.SRC_PSA, id: "PS-A"},
	{src: Parser.SRC_PSI, id: "PS-I"},
	{src: Parser.SRC_PSK, id: "PS-K"},
	{src: Parser.SRC_PSZ, id: "PS-Z"},
	{src: Parser.SRC_PSX, id: "PS-X"},
	{src: Parser.SRC_PSD, id: "PS-D"},
].forEach(({src, id}) => {
	Parser.SOURCES_AVAILABLE_DOCS_BOOK[src] = id;
	Parser.SOURCES_AVAILABLE_DOCS_BOOK[src.toLowerCase()] = id;
});
Parser.SOURCES_AVAILABLE_DOCS_ADVENTURE = {};
[
	Parser.SRC_LMoP,
	Parser.SRC_HotDQ,
	Parser.SRC_RoT,
	Parser.SRC_PotA,
	Parser.SRC_OotA,
	Parser.SRC_CoS,
	Parser.SRC_SKT,
	Parser.SRC_TYP_AtG,
	Parser.SRC_TYP_DiT,
	Parser.SRC_TYP_TFoF,
	Parser.SRC_TYP_THSoT,
	Parser.SRC_TYP_TSC,
	Parser.SRC_TYP_ToH,
	Parser.SRC_TYP_WPM,
	Parser.SRC_ToA,
	Parser.SRC_TLK,
	Parser.SRC_TTP,
	Parser.SRC_WDH,
	Parser.SRC_LLK,
	Parser.SRC_WDMM,
	Parser.SRC_KKW,
	Parser.SRC_AZfyT,
	Parser.SRC_GoS,
	Parser.SRC_HftT,
	Parser.SRC_OoW,
	Parser.SRC_DIP,
	Parser.SRC_SLW,
	Parser.SRC_SDW,
	Parser.SRC_DC,
	Parser.SRC_BGDIA,
	Parser.SRC_LR,
	Parser.SRC_EFR,
	Parser.SRC_RMBRE,
	Parser.SRC_IMR,
	Parser.SRC_EGW_ToR,
	Parser.SRC_EGW_DD,
	Parser.SRC_EGW_FS,
	Parser.SRC_EGW_US,
	Parser.SRC_IDRotF,
	Parser.SRC_CM,
	Parser.SRC_HoL,
	Parser.SRC_XMtS,
	Parser.SRC_RtG,
	Parser.SRC_AitFR_ISF,
	Parser.SRC_AitFR_THP,
	Parser.SRC_AitFR_AVT,
	Parser.SRC_AitFR_DN,
	Parser.SRC_AitFR_FCD,
	Parser.SRC_WBtW,
	Parser.SRC_NRH,
	Parser.SRC_NRH_TCMC,
	Parser.SRC_NRH_AVitW,
	Parser.SRC_NRH_ASS,
	Parser.SRC_NRH_CoI,
	Parser.SRC_NRH_TLT,
	Parser.SRC_NRH_AWoL,
	Parser.SRC_NRH_AT,
	Parser.SRC_SCC_CK,
	Parser.SRC_SCC_HfMT,
	Parser.SRC_SCC_TMM,
	Parser.SRC_SCC_ARiR,
	Parser.SRC_CRCotN,
	Parser.SRC_JttRC,
	Parser.SRC_LoX,
	Parser.SRC_DoSI,
	Parser.SRC_DSotDQ,
	Parser.SRC_KftGV,
	Parser.SRC_GotSF,
	Parser.SRC_PaBTSO,
	Parser.SRC_ToFW,
	Parser.SRC_LK,
	Parser.SRC_CoA,
	Parser.SRC_PiP,
	Parser.SRC_DitLCoT,
	Parser.SRC_HFStCM,
	Parser.SRC_QftIS,
	Parser.SRC_LRDT,
	Parser.SRC_VEoR,
	Parser.SRC_VNotEE,
	Parser.SRC_UtHftLH,
	Parser.SRC_ScoEE,
	Parser.SRC_HBTD,
	Parser.SRC_BQGT,
	Parser.SRC_DrDe_DaS,
	Parser.SRC_DrDe_BD,
	Parser.SRC_DrDe_TWoO,
	Parser.SRC_DrDe_FWtVC,
	Parser.SRC_DrDe_TDoN,
	Parser.SRC_DrDe_TFV,
	Parser.SRC_DrDe_BtS,
	Parser.SRC_DrDe_SD,
	Parser.SRC_DrDe_ACfaS,
	Parser.SRC_DrDe_DotS,
	Parser.SRC_HotB,
	Parser.SRC_WttHC,
	Parser.SRC_FFotR,
	Parser.SRC_BQDD,
	Parser.SRC_AUD,
	Parser.SRC_RWG,
].forEach(src => {
	Parser.SOURCES_AVAILABLE_DOCS_ADVENTURE[src] = src;
	Parser.SOURCES_AVAILABLE_DOCS_ADVENTURE[src.toLowerCase()] = src;
});

Parser.getTagSource = function (tag, source) {
	if (source && source.trim()) return source;

	tag = tag.trim();

	return Renderer.tag.getTagInfo(tag, {isRequired: true}).defaultSource;
};

Parser.PROP_TO_TAG = {
	"monster": "creature",
	"optionalfeature": "optfeature",
	"tableGroup": "table",
	"vehicleUpgrade": "vehupgrade",
	"baseitem": "item",
	"itemGroup": "item",
	"magicvariant": "item",
	"crochetPattern": "crochet",
};
Parser._RE_PROP_RAW_PREFIX = /^raw_/;
Parser.getPropTag = function (prop) {
	if (!prop) return prop;
	prop = prop.replace(Parser._RE_PROP_RAW_PREFIX, "");
	if (Parser.PROP_TO_TAG[prop]) return Parser.PROP_TO_TAG[prop];
	if (prop?.endsWith("Fluff")) return null;
	return prop;
};

// Note that ordering is important; we expect the "primary" prop to be first
Parser.TAG_TO_PROPS = {
	"creature": ["monster"],
	"optfeature": ["optionalfeature"],
	"table": ["table", "tableGroup"],
	"vehupgrade": ["vehicleUpgrade"],
	"item": ["item", "baseitem", "itemGroup", "magicvariant"],
};
Parser.getTagProps = function (tag) {
	if (Parser.TAG_TO_PROPS[tag]) return Parser.TAG_TO_PROPS[tag];
	return [tag];
};

Parser.PROP_TO_DISPLAY_NAME = {
	"variantrule": "术语汇编",
	"optionalfeature": "职业能力选项",
	"magicvariant": "魔法物品变体",
	"baseitem": "基础物品",
	"item": "物品",
	"adventure": "模组",
	"adventureData": "模组文本",
	"book": "书籍",
	"bookData": "书籍文本",
	"makebrewCreatureTrait": "自制内容生成器生物特质",
	"charoption": "其他角色创建选项",
	"encounterShape": "遭遇形状",
	"crochetPattern": "手工艺品",
	"renderdemo": "渲染器示例",
	
	"bonus": "附赠动作",
	"legendary": "传奇动作",
	"mythic": "神话动作",
	"lairActions": "巢穴动作",
	"regionalEffects": "区域效应",
	"condition": "状态",
	"disease": "疾病",

	"Magical Contagion": "魔法疫病",

	// added for Chinese localization
	"action": "动作",
	"background": "背景",
	"boon": "恩赐",
	"citation": "据点",
	"cult": "邪教",
	"deity": "神祇",
	"facility": "据点",
	"feat": "专长",
	"foundrySpell": "Foundry 法术",
	"hazard": "危害",
	"itemProperty": "物品特性",
	"itemType": "物品类型",
	"itemTypeAdditionalEntries": "物品类型附加条目",
	"language": "语言",
	"legendaryGroup": "传奇组",
	"monster": "怪物",
	"object": "物件",
	"psionic": "灵能",
	"race": "种族",
	"subrace": "子种族",
	"raceFeature":"种族特性",
	"sense": "感官",
	"skill": "技能",
	"recipe": "食谱",
	"reward": "奖励",
	"roll20Spell": "Roll20 法术",
	"spell": "法术",
	"spell foundry data": "Foundry 法术数据",
	"table": "表格",
	"trap": "陷阱",
	"vehicle": "载具",
	"card": "卡牌",
	"class": "职业",
	"classFeature": "职业特性",
	"deck": "牌组",
	"itemGroup": "物品分组",
	"itemMastery": "物品专精",
	"status": "状态",
	"subclass": "子职",
	"subclassFeature": "子职特性",
	"vehicleUpgrade": "载具升级",
};
Parser.getPropDisplayName = function (prop, {suffix = ""} = {}) {
	if (Parser.PROP_TO_DISPLAY_NAME[prop]) return `${Parser.PROP_TO_DISPLAY_NAME[prop]}${suffix}`;

	const mFluff = /Fluff$/.exec(prop);
	if (mFluff) return Parser.getPropDisplayName(prop.slice(0, -mFluff[0].length), {suffix: "描述"});

	const mFoundry = /^foundry(?<prop>[A-Z].*)$/.exec(prop);
	if (mFoundry) return Parser.getPropDisplayName(mFoundry.groups.prop.lowercaseFirst(), {suffix: " Foundry 数据"});

	return `${prop.split(/([A-Z][a-z]+)/g).filter(Boolean).join(" ").uppercaseFirst()}${suffix}`;
};

Parser.DMGTYPE_JSON_TO_FULL = {
	"A": "强酸",
	"B": "钝击",
	"C": "寒冷",
	"F": "火焰",
	"O": "力场",
	"L": "闪电",
	"N": "黯蚀",
	"P": "穿刺",
	"I": "毒素",
	"Y": "心灵",
	"R": "光耀",
	"S": "挥砍",
	"T": "雷鸣",
};

Parser.DMG_TYPES = ["强酸", "钝击", "寒冷", "火焰", "力场", "闪电", "暗蚀", "穿刺", "毒素", "心灵", "光耀", "挥砍", "雷鸣"];

Parser.DMG_TYPE_TO_EN = {
	"强酸": "acid",
	"钝击": "bludgeoning",
	"寒冷": "cold",
	"火焰": "fire",
	"力场": "force",
	"闪电": "lightning",
	"暗蚀": "necrotic",
	"穿刺": "piercing",
	"毒素": "poison",
	"心灵": "psychic",
	"光耀": "radiant",
	"挥砍": "slashing",
	"雷鸣": "thunder",
};
Parser.dmgTypeToEn = function (dmgType) {
	return Parser._parse_aToB(Parser.DMG_TYPE_TO_EN, dmgType);
};

Parser.dmgTypeToCn = function(dmgType) {
	return Parser._parse_bToA(Parser.DMG_TYPE_TO_EN, dmgType);
}

Parser.CONDITIONS = ["目盲", "魅惑", "耳聋", "力竭", "恐慌", "受擒", "失能", "隐形", "麻痹", "石化", "中毒", "倒地", "束缚", "震慑", "昏迷"];

Parser.CONTITION_TO_EN = {
	"目盲": "blinded",
	"魅惑": "charmed",
	"耳聋": "deafened",
	"力竭": "exhaustion",
	"恐慌": "frightened",
	"受擒": "grappled",
	"失能": "incapacitated",
	"隐形": "invisible",
	"麻痹": "paralyzed",
	"石化": "petrified",
	"中毒": "poisoned",
	"倒地": "prone",
	"束缚": "restrained",
	"震慑": "stunned",
	"昏迷": "unconscious",
	"疾病": "disease",
};

Parser.conditionToEn = function (condition) {
	return Parser._parse_aToB(Parser.CONTITION_TO_EN, condition);
};

Parser._SENSES_LEGACY = [
	{"name": "盲视", "source": Parser.SRC_PHB},
	{"name": "黑暗视觉", "source": Parser.SRC_PHB},
	{"name": "震颤感知", "source": Parser.SRC_MM},
	{"name": "真实视觉", "source": Parser.SRC_PHB},
];
Parser._SENSES_MODERN = [
	{"name": "盲视", "source": Parser.SRC_XPHB},
	{"name": "黑暗视觉", "source": Parser.SRC_XPHB},
	{"name": "震颤感知", "source": Parser.SRC_XPHB},
	{"name": "真实视觉", "source": Parser.SRC_XPHB},
];
Parser.getSenses = function ({styleHint = null} = {}) {
	styleHint ||= VetoolsConfig.get("styleSwitcher", "style");
	return styleHint === "classic" ? Parser._SENSES_LEGACY : Parser._SENSES_MODERN;
};

Parser.NUMBERS_ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
Parser.NUMBERS_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
Parser.NUMBERS_TEENS = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];

// region Metric conversion
Parser.metric = class {
	// See MPMB's breakdown: https://old.reddit.com/r/dndnext/comments/6gkuec
	static MILES_TO_KILOMETRES = 1.6;
	static FEET_TO_METRES = 0.3; // 5 ft = 1.5 m
	static YARDS_TO_METRES = 0.9; // (as above)
	static POUNDS_TO_KILOGRAMS = 0.5; // 2 lb = 1 kg
	// Other additions
	static INCHES_TO_CENTIMETERS = 2.5; // 1 in = 2.5 cm
	static CUBIC_FEET_TO_LITRES = 28; // 1 ft³ = 28 L

	/**
	 * @param {number} originalValue
	 * @param {string} originalUnit
	 * @param {?boolean} toFixed
	 */
	static getMetricNumber ({originalValue, originalUnit, toFixed = null}) {
		if (originalValue == null || isNaN(originalValue)) return originalValue;

		originalValue = Number(originalValue);
		if (!originalValue) return originalValue;

		let out = null;
		switch (Parser.getNormalizedUnit(originalUnit)) {
			case Parser.UNT_INCHES: out = originalValue * Parser.metric.INCHES_TO_CENTIMETERS; break;
			case Parser.UNT_FEET: out = originalValue * Parser.metric.FEET_TO_METRES; break;
			case Parser.UNT_YARDS: out = originalValue * Parser.metric.YARDS_TO_METRES; break;
			case Parser.UNT_MILES: out = originalValue * Parser.metric.MILES_TO_KILOMETRES; break;
			case Parser.UNT_LBS: out = originalValue * Parser.metric.POUNDS_TO_KILOGRAMS; break;
			case Parser.UNT_CUBIC_FEET: out = originalValue * Parser.metric.CUBIC_FEET_TO_LITRES; break;
			default: return originalValue;
		}
		if (toFixed != null) return NumberUtil.toFixedNumber(out, toFixed);
		return out;
	}

	/**
	 * @param {number} originalValue
	 * @param {boolean} isShortForm
	 * @param {isPlural} isShortForm
	 */
	static getMetricUnit ({originalUnit, isShortForm = false, isPlural = true}) {
		switch (Parser.getNormalizedUnit(originalUnit)) {
			case Parser.UNT_INCHES: return isShortForm ? "cm" : `centimeter`[isPlural ? "toPlural" : "toString"]();
			case Parser.UNT_FEET: return isShortForm ? "m" : `meter`[isPlural ? "toPlural" : "toString"]();
			case Parser.UNT_YARDS: return isShortForm ? "m" : `meter`[isPlural ? "toPlural" : "toString"]();
			case Parser.UNT_MILES: return isShortForm ? "km" : `kilometer`[isPlural ? "toPlural" : "toString"]();
			case Parser.UNT_LBS: return isShortForm ? "kg" : `kilogram`[isPlural ? "toPlural" : "toString"]();
			case Parser.UNT_CUBIC_FEET: return isShortForm ? "L" : `liter`[isPlural ? "toPlural" : "toString"]();
			default: return originalUnit;
		}
	}

	static _MM_PER_INCHES = 25.4;

	// Display to the nearest 0.5 in.
	static getApproxDisplayInches (distMm) {
		return Math.round((distMm / this._MM_PER_INCHES) * 2) / 2;
	}
};
// endregion
// region Map grids

Parser.MAP_GRID_TYPE_TO_FULL = {};
Parser.MAP_GRID_TYPE_TO_FULL["none"] = "无";
Parser.MAP_GRID_TYPE_TO_FULL["square"] = "方格";
Parser.MAP_GRID_TYPE_TO_FULL["hexRowsOdd"] = "六角格（奇数行偏移）";
Parser.MAP_GRID_TYPE_TO_FULL["hexRowsEven"] = "六角格（偶数行偏移）";
Parser.MAP_GRID_TYPE_TO_FULL["hexColsOdd"] = "六角格（奇数列偏移）";
Parser.MAP_GRID_TYPE_TO_FULL["hexColsEven"] = "六角格（偶数列偏移）";

Parser.mapGridTypeToFull = function (gridType) {
	return Parser._parse_aToB(Parser.MAP_GRID_TYPE_TO_FULL, gridType);
};

Parser.LANGUAGES_TO_CN = {
	"auran": "气族语",
	"aquan": "水族语",
	"abyssal": "深渊语",
	"celestial": "天界语",
	// "Choose":,
	"common": "通用语",
	"deep speech": "深潜语",
	"draconic": "龙语",
	"druidic": "德鲁伊语",
	"dwarvish": "矮人语",
	"elvish": "精灵语",
	"giant": "巨人语",
	"gith": "吉斯语",
	"gnomish": "侏儒语",
	"goblin": "地精语",
	"halfling": "半身人语",
	"ignan": "火族语",
	"infernal": "炼狱语",
	"orc": "兽人语",
	"other": "其他",
	"primordial": "原初语",
	"terran": "土族语",
	"thieves' cant": "盗贼黑话",
	"sylvan": "木族语",
	"undercommon": "地底通用语",

	// Types
	"standard": "标准",
	"exotic": "特种",
	"secret": "秘密",
	"rare": "稀有",
};

Parser.languageToCn = function (lang) {
	return Parser._parse_aToB(Parser.LANGUAGES_TO_CN, lang);
};

Parser.TOOLS_TO_CN = {
	"alchemist's supplies": "炼金工具",
	"artisan's tools": "工匠工具",
	"brewer's supplies": "酿酒工具",
	"calligrapher's supplies": "书法工具",
	"carpenter's tools": "木匠工具",
	"cartographer's tools": "制图工具",
	"cook's utensils": "厨师工具",
	"disguise kit": "易容工具",
	"forgery kit": "文书伪造工具",
	"gaming set": "赌具",
	"glassblower's tools": "玻璃匠工具",
	"herbalism kit": "草药工具",
	"jeweler's tools": "珠宝匠工具",
	"leatherworker's tools": "皮匠工具",
	"mason's tools": "石匠工具",
	"musical instrument": "乐器",
	"navigator's tools": "领航工具",
	"painter's supplies": "画家工具",
	"poisoner's kit": "制毒工具",
	"smith's tools": "铁匠工具",
	"thieves' tools": "盗贼工具",
	"tinker's tools": "修理工具",
	"vehicles (air)": "载具(空运)",
	"vehicles (land)": "载具(陆运)",
	"vehicles (space)": "载具(航空)",
	"vehicles (water)": "载具(水运)",
	"weaver's tools": "织布工具",
	"woodcarver's tools": "木雕工具",
};

Parser.MON_TAG_TO_CN = {
	"aarakocra": "阿兰寇拉鹰人",
	"adult chromatic": "成年色彩龙",
	"angel": "天使",
	"any": "任意",
	"any race": "任意种族",
	"archfey": "至高妖精",
	"bard": "吟游诗人",
	"beholder": "眼魔",
	"bullywug": "狂蛙人",
	"cattle": "牛",
	"changeling": "幻身灵",
	"chromatic": "色彩龙",
	"cleric": "牧师",
	"cloud giant": "云巨人",
	"demon": "恶魔",
	"derro": "德洛人",
	"devil": "魔鬼",
	"dinosaur": "恐龙",
	"dragonborn": "龙裔",
	"drow": "卓尔",
	"druid": "德鲁伊",
	"dwarf": "矮人",
	"fire giant": "火巨人",
	"elf": "精灵",
	"firenewt": "熔螈",
	"frost giant": "霜巨人",
	"gallus": "雉族",
	"gem": "宝石龙",
	"genasi": "元素裔",
	"gith": "吉斯人",
	"gnoll": "鬣狗人",
	"gnome": "侏儒",
	"goblinoid": "类地精",
	"grimlock": "幽邃盲族",
	"grippli": "格里普利人",
	"goliath": "歌利亚",
	"grung": "格龙蛙人",
	"hag": "鬼婆",
	"half-black dragon": "半黑龙",
	"half-dragon": "半龙",
	"half-elf": "半精灵",
	"half-orc": "半兽人",
	"halfling": "半身人",
	"harengon": "兔人",
	"healer": "治疗者",
	"hill giant": "山丘巨人",
	"human": "人类",
	"inevitable": "制裁者",
	"kalashtar": "离梦人",
	"kender": "坎德人",
	"kenku": "天狗",
	"kobold": "狗头人",
	"kraul": "刻洛",
	"kuo-toa": "寇涛鱼人",
	"lava child": "熔岩之子",
	"leonin": "狮族",
	"lizardfolk": "蜥蜴人",
	"locathah": "洛卡鱼人",
	"mage": "魔术师",
	"meazel": "鬾魊",
	"medusa": "美杜莎",
	"merfolk": "人鱼",
	"metallic": "金属龙",
	"mind flayer": "夺心魔",
	"minotaur": "牛头人",
	"mongrelfolk": "混种人",
	"monk": "武僧",
	"moonstone": "月石龙",
	"nagpa": "那加帕",
	"orc": "兽人",
	"paladin": "圣武士",
	"sahuagin": "沙华鱼人",
	"quaggoth": "泽地熊人",
	"saurial": "类蜴人",
	"shadar-kai": "影灵",
	"shapechanger": "变形生物",
	"shifter": "化兽者",
	"simic hybrid": "析米克混生体",
	"sorcerer": "术士",
	"stone giant": "石巨人",
	"storm giant": "风暴巨人",
	"swarm": "集群",
	"tabaxi": "斑猫人",
	"thri-kreen": "螳螂人",
	"tiefling": "提夫林",
	"titan": "泰坦",
	"tortle": "龟人",
	"triton": "屈东",
	"troglodyte": "穴蜥人",
	"vampire": "吸血鬼",
	"warforged": "战俑",
	"warlock": "魔契师",
	"wizard": "法师",
	"xvart": "法特怪",
	"young gem": "青年宝石龙",
	"yuan-ti": "蛇人",
	"yugoloth": "尤格罗斯魔",
	"attacker": "攻击手",
	"defender": "防御者",
	"genie": "巨灵",
	"lycanthrope": "兽化人",

};

Parser.MON_TAG_PREFIX_TO_CN = {
	"fire": "火",
	"water": "水",
	"earth": "土",
	"wood": "木",
	"dusk": "暮",
	"high": "高",
	"mountain": "山地",
	"deep": "地底",
	"rock": "岩石",
	"strongheart": "强心",
	"stout": "敦实",
	"lightfoot": "轻足",
	"illuskan": "伊路斯坎",
	"turami": "图拉米",
	"tethyrian": "泰瑟尔",
	"mulan": "穆兰",
	"damaran": "达马拉",
	"chondathan": "琼达斯",
	"shou": "受国",
};

Parser.MON_SIDEKICK_TO_CN = {
	"warrior": "武者",
	"expert": "专家",
	"spellcaster": "施法者",
	"attacker": "攻击手",
	"defender": "防御者",
	"healer": "治疗者",
	"mage": "魔术师",
};

Parser.translateKeyInMapToDisplay = function (map, key) {
	if (typeof key === "string" || key instanceof String) {
		let lowercase_key = key.toLowerCase();
		if (map[lowercase_key]) {
			return map[lowercase_key];
		}
	}
	return key;
};

Parser.classKeyToDisplay = {};
Parser.classKeyToDisplay["wizard"] = "法师";
Parser.classKeyToDisplay["sorcerer"] = "术士";
Parser.classKeyToDisplay["warlock"] = "魔契师";
Parser.classKeyToDisplay["ranger"] = "游侠";
Parser.classKeyToDisplay["paladin"] = "圣武士";
Parser.classKeyToDisplay["druid"] = "德鲁伊";
Parser.classKeyToDisplay["cleric"] = "牧师";
Parser.classKeyToDisplay["bard"] = "吟游诗人";
Parser.classKeyToDisplay["barbarian"] = "野蛮人";
Parser.classKeyToDisplay["fighter"] = "战士";
Parser.classKeyToDisplay["monk"] = "武僧";
Parser.classKeyToDisplay["rogue"] = "游荡者";
Parser.classKeyToDisplay["artificer"] = "奇械师";
Parser.classKeyToDisplay["ranger (revised)"] = "游侠 (修订)";
Parser.classKeyToDisplay["artificer revisited"] = "奇械师 (再制)";
Parser.classKeyToDisplay["expert sidekick"] = "专家协力者";
Parser.classKeyToDisplay["spellcaster sidekick"] = "施法协力者";
Parser.classKeyToDisplay["warrior sidekick"] = "武者协力者";
Parser.ClassToDisplay = function (c) {
	let c_match = c.match(/([^()]*)( ?\((.*)\))?/);
	if (c_match && c_match[2]) {
		let c_name = Parser.translateKeyInMapToDisplay(Parser.classKeyToDisplay, c_match[1].replace(/ *$/, ""));
		let source = c_match[3] === "Revised" ? "(修订)" : c_match[2];
		return `${c_name} ${source}`;
	}
	return Parser.translateKeyInMapToDisplay(Parser.classKeyToDisplay, c);
};

Parser.ClassToEngDisplay = function (c) {
	let c_match = c.match(/([^()]*)( ?\((.*)\))?/);
	if (c_match && c_match[2]) {
		let c_name = c_match[1].replace(/ *$/, "");
		let source = c_match[3] === "Revised" ? "(修订)" : c_match[2];
		return `${c_name} ${source}`;
	}
	return c;
};
// subclass
Parser.subclassKeyToDisplay = {};
Parser.subclassKeyToDisplay["alchemist"] = "炼金师";
Parser.subclassKeyToDisplay["armorer"] = "装甲师";
Parser.subclassKeyToDisplay["artillerist"] = "魔炮师";
Parser.subclassKeyToDisplay["battle smith"] = "战地匠师";

Parser.subclassKeyToDisplay["ancestral guardian"] = "先祖守卫";
Parser.subclassKeyToDisplay["battlerager"] = "战狂";
Parser.subclassKeyToDisplay["beast"] = "野兽";
Parser.subclassKeyToDisplay["berserker"] = "狂战士";
Parser.subclassKeyToDisplay["storm herald"] = "风暴先驱";
Parser.subclassKeyToDisplay["totem warrior"] = "图腾勇士";
Parser.subclassKeyToDisplay["wild magic"] = "狂野魔法";
Parser.subclassKeyToDisplay["zealot"] = "狂热者";

Parser.subclassKeyToDisplay["creation"] = "创造";
Parser.subclassKeyToDisplay["eloquence"] = "雄辩";
Parser.subclassKeyToDisplay["glamour"] = "迷惑";
Parser.subclassKeyToDisplay["lore"] = "轶闻";
Parser.subclassKeyToDisplay["swords"] = "剑舞";
Parser.subclassKeyToDisplay["valor"] = "勇气";
Parser.subclassKeyToDisplay["whispers"] = "低语";

Parser.subclassKeyToDisplay["arcana"] = "奥秘";
Parser.subclassKeyToDisplay["death"] = "死亡";
Parser.subclassKeyToDisplay["forge"] = "锻造";
Parser.subclassKeyToDisplay["grave"] = "坟墓";
Parser.subclassKeyToDisplay["knowledge"] = "知识";
Parser.subclassKeyToDisplay["life"] = "生命";
Parser.subclassKeyToDisplay["light"] = "光明";
Parser.subclassKeyToDisplay["nature"] = "自然";
Parser.subclassKeyToDisplay["order"] = "秩序";
Parser.subclassKeyToDisplay["peace"] = "和平";
Parser.subclassKeyToDisplay["tempest"] = "暴风";
Parser.subclassKeyToDisplay["trickery"] = "诡术";
Parser.subclassKeyToDisplay["twilight"] = "暮光";
Parser.subclassKeyToDisplay["war"] = "战争";

Parser.subclassKeyToDisplay["dreams"] = "梦境";
Parser.subclassKeyToDisplay["land"] = "大地";
Parser.subclassKeyToDisplay["moon"] = "月亮";
Parser.subclassKeyToDisplay["shepherd"] = "牧人";
Parser.subclassKeyToDisplay["spores"] = "孢子";
Parser.subclassKeyToDisplay["stars"] = "星辰";
Parser.subclassKeyToDisplay["wildfire"] = "野火";

Parser.subclassKeyToDisplay["arcane archer"] = "魔射手";
Parser.subclassKeyToDisplay["battle master"] = "战斗大师";
Parser.subclassKeyToDisplay["cavalier"] = "骑兵";
Parser.subclassKeyToDisplay["champion"] = "勇士";
Parser.subclassKeyToDisplay["eldritch knight"] = "魔能骑士";
Parser.subclassKeyToDisplay["psi warrior"] = "灵能武士";
Parser.subclassKeyToDisplay["purple dragon knight (banneret)"] = "紫龙骑士（旗将）";
Parser.subclassKeyToDisplay["rune knight"] = "符文骑士";
Parser.subclassKeyToDisplay["samurai"] = "武士";
Parser.subclassKeyToDisplay["echo knight"] = "回音骑士";

Parser.subclassKeyToDisplay["astral self"] = "星我宗";
Parser.subclassKeyToDisplay["drunken master"] = "醉拳宗";
Parser.subclassKeyToDisplay["four elements"] = "四象宗";
Parser.subclassKeyToDisplay["kensei"] = "剑圣宗";
Parser.subclassKeyToDisplay["long death"] = "永亡宗";
Parser.subclassKeyToDisplay["mercy"] = "命流宗";
Parser.subclassKeyToDisplay["open hand"] = "散打宗";
Parser.subclassKeyToDisplay["shadow_monk"] = "暗影宗";
Parser.subclassKeyToDisplay["sun soul"] = "日魂宗";

Parser.subclassKeyToDisplay["ancients"] = "远古";
Parser.subclassKeyToDisplay["conquest"] = "征服";
Parser.subclassKeyToDisplay["crown"] = "王冠";
Parser.subclassKeyToDisplay["devotion"] = "奉献";
Parser.subclassKeyToDisplay["glory"] = "荣耀";
Parser.subclassKeyToDisplay["oathbreaker"] = "破誓者";
Parser.subclassKeyToDisplay["redemption"] = "救赎";
Parser.subclassKeyToDisplay["vengeance"] = "复仇";
Parser.subclassKeyToDisplay["watchers"] = "守望";

Parser.subclassKeyToDisplay["beast master"] = "兽王";
Parser.subclassKeyToDisplay["fey wanderer"] = "妖精漫游者";
Parser.subclassKeyToDisplay["gloom stalker"] = "幽域追踪者";
Parser.subclassKeyToDisplay["horizon walker"] = "境界行者";
Parser.subclassKeyToDisplay["hunter"] = "猎人";
Parser.subclassKeyToDisplay["monster slayer"] = "怪物杀手";
Parser.subclassKeyToDisplay["swarmkeeper"] = "集群守卫";

Parser.subclassKeyToDisplay["arcane trickster"] = "诡术师";
Parser.subclassKeyToDisplay["assassin"] = "刺客";
Parser.subclassKeyToDisplay["inquisitive"] = "审讯者";
Parser.subclassKeyToDisplay["mastermind"] = "策士";
Parser.subclassKeyToDisplay["phantom"] = "鬼魅";
Parser.subclassKeyToDisplay["scout"] = "斥候";
Parser.subclassKeyToDisplay["soulknife"] = "魂刃";
Parser.subclassKeyToDisplay["swashbuckler"] = "风流剑客";
Parser.subclassKeyToDisplay["thief"] = "窃贼";

Parser.subclassKeyToDisplay["aberrant mind"] = "畸变心智";
Parser.subclassKeyToDisplay["clockwork soul"] = "时械之魂";
Parser.subclassKeyToDisplay["divine soul"] = "神圣之魂";
Parser.subclassKeyToDisplay["draconic"] = "龙族血脉";
Parser.subclassKeyToDisplay["shadow"] = "幽影魔法";
Parser.subclassKeyToDisplay["storm"] = "暴风术法";
Parser.subclassKeyToDisplay["wild"] = "狂野魔法";

Parser.subclassKeyToDisplay["archfey"] = "至高妖精";
Parser.subclassKeyToDisplay["celestial"] = "天界";
Parser.subclassKeyToDisplay["fathomless"] = "深海意志";
Parser.subclassKeyToDisplay["fiend"] = "邪魔";
Parser.subclassKeyToDisplay["genie"] = "巨灵";
Parser.subclassKeyToDisplay["great old one"] = "旧日支配者";
Parser.subclassKeyToDisplay["hexblade"] = "咒剑";
Parser.subclassKeyToDisplay["undying"] = "不朽者";

Parser.subclassKeyToDisplay["abjuration"] = "防护";
Parser.subclassKeyToDisplay["bladesinging"] = "剑咏";
Parser.subclassKeyToDisplay["conjuration"] = "咒法";
Parser.subclassKeyToDisplay["divination"] = "预言";
Parser.subclassKeyToDisplay["enchantment"] = "惑控";
Parser.subclassKeyToDisplay["evocation"] = "塑能";
Parser.subclassKeyToDisplay["illusion"] = "幻术";
Parser.subclassKeyToDisplay["necromancy"] = "死灵";
Parser.subclassKeyToDisplay["scribes"] = "书士会";
Parser.subclassKeyToDisplay["transmutation"] = "变化";
Parser.subclassKeyToDisplay["war"] = "战争";
Parser.subclassKeyToDisplay["graviturgy"] = "重力";
Parser.subclassKeyToDisplay["chronurgy"] = "时间";
Parser.SubclassToDisplay = function (sc) {
	let sc_match = sc.match(/([^()]*)( ?\((.*)\))?/);
	if (sc_match && sc_match[2]) {
		let sc_name = Parser.translateKeyInMapToDisplay(Parser.subclassKeyToDisplay, sc_match[1].replace(/ *$/, ""));
		return `${sc_name} ${sc_match[2]}`;
	}
	return Parser.translateKeyInMapToDisplay(Parser.subclassKeyToDisplay, sc);
};

Parser.cultsBoonsTypeToCN = {};
Parser.cultsBoonsTypeToCN["Demonic"] = "恶魔";
Parser.cultsBoonsTypeToCN["Elemental"] = "元素";
Parser.cultsBoonsTypeToCN["Elder Evil"] = "上古邪物";
Parser.cultsBoonsTypeToCN["Diabolical"] = "魔鬼";

Parser.CultsBoonsTypeToCN = function (type) {
	return Parser.cultsBoonsTypeToCN[type] || type;
};

Parser.REWARD_TYPE_TO_CN = {};
Parser.REWARD_TYPE_TO_CN["Blessing"] = "祝福";
Parser.REWARD_TYPE_TO_CN["Boon"] = "恩赐";
Parser.REWARD_TYPE_TO_CN["Charm"] = "护咒";
Parser.REWARD_TYPE_TO_CN["Curse"] = "诅咒";
Parser.REWARD_TYPE_TO_CN["Draconic Gift"] = "龙族赠礼";
Parser.REWARD_TYPE_TO_CN["Fragment of Suffering"] = "痛苦碎片";
Parser.REWARD_TYPE_TO_CN["Inhabitation"] = "附体";
Parser.REWARD_TYPE_TO_CN["Piety Trait"] = "虔信特质";
Parser.REWARD_TYPE_TO_CN["Other"] = "其他";

Parser.rewardTypeToCN = function (type) {
	return Parser._parse_aToB(Parser.REWARD_TYPE_TO_CN, type);
};

Parser.RECIPE_CATEGORY_TO_CN = {
	"Dwarven": "矮人",
	"Elixir/Ale": "灵药/麦酒",
	"Elven": "精灵",
	"Halfling": "半身人",
	"Human": "人类",
	"Uncommon Cuisine": "非凡美食",
	"Sigil": "印记城",
	"Lost in Realmspace": "迷失荒宇",
	"Solamnia": "索兰尼亚",
	"The Rock of Bral": "布拉岩",
	"Ravenloft": "鸦阁",
	"The Feywild": "妖精荒野",
	"The Yawning Portal": "哈欠传送门",
	"The Driftwood Tavern": "浮木酒馆",
	"The Hearth": "炉边",
	"The Hissing Stones": "嘶鸣之石",
	"The Gilded Horseshoe": "镀金马蹄铁",
	"The Pink Flumph Theater": "粉色呋噜怪剧院",
	"The Moonstone Mask": "月石面具",
	"The Low Lantern": "低灯笼",
	"The Halfway Inn": "半途旅店",
	"One-Eyed Jax": "独眼杰克斯",
	"Artificer": "奇械师",
	"Bard": "吟游诗人",
	"Cleric": "牧师",
	"Druid": "德鲁伊",
	"Paladin": "圣武士",
	"Ranger": "游侠",
	"Sorcerer": "术士",
	"Warlock": "魔契师",
	"Wizard": "法师",
	"Rogue": "游荡者",
	"Fighter": "战士",
	"Barbarian": "狂战士",
	"Monk": "武僧"
};

Parser.recipeCategoryToCn = function (type) {
	return Parser._parse_aToB(Parser.RECIPE_CATEGORY_TO_CN, type);
};

Parser.ENCONTER_DIFFICULTY_TO_CN = {
	"easy": "简单",
	"medium": "中等",
	"standard": "标准",
	"hard": "困难",
	"deadly": "致命",
	"absurd": "荒谬",
	"low": "低",
	"moderate": "中等",
	"high": "高",
	"extreme": "极端"
};
Parser.encounterDifficultyToCn = function (type) {
	return Parser._parse_aToB(Parser.ENCONTER_DIFFICULTY_TO_CN, type.toLowerCase());
};

Parser.getDisplayNameWithEN = function (ent) {
	const engName = ent.ENG_name?.match(/^[^([{]*/)?.[0]?.trim() || undefined;
	const curDisplayName = (ent.name && engName) ? `${ent.name} ${engName}`.trim() : ent.name;
	return ent._displayName || curDisplayName;
};

Parser.BASTION_SPACE_TO_CN = {
	"cramped": "狭窄",
	"roomy": "宽敞",
	"vast": "庞大",
}

Parser.bastionSpaceToCN = function (type) {
	return Parser._parse_aToB(Parser.BASTION_SPACE_TO_CN, type.toLowerCase());
}
// endregion
