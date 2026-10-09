"use strict";

class FilterCommon {
	static getCostFilter () {
		return new RangeFilter({
			header: "Cost",
			cnHeader: "花费",
			isLabelled: true,
			isAllowGreater: true,
			labelSortFn: null,
			labels: [
				0,
				...[...new Array(9)].map((_, i) => i + 1),
				...[...new Array(9)].map((_, i) => 10 * (i + 1)),
				...[...new Array(99)].map((_, i) => 100 * (i + 1)),
				...[...new Array(9)].map((_, i) => 10_000 * (i + 1)),
				...[...new Array(9)].map((_, i) => 100_000 * (i + 1)),
				...[...new Array(10)].map((_, i) => 1_000_000 * (i + 1)),
			],
			labelDisplayFn: it => !it ? "None" : Parser.getDisplayCurrency(CurrencyUtil.doSimplifyCoins({cp: it})),
		});
	}

	/* -------------------------------------------- */

	static getDamageVulnerableFilter () {
		return this._getDamageResistVulnImmuneFilter({
			header: "Vulnerability",
			cnHeader: "伤害易伤",
			headerShort: "易伤",
		});
	}

	static getDamageResistFilter () {
		return this._getDamageResistVulnImmuneFilter({
			header: "Resistance",
			cnHeader: "伤害抗性",
			headerShort: "抗性",
		});
	}

	static getDamageImmuneFilter () {
		return this._getDamageResistVulnImmuneFilter({
			header: "Immunity",
			cnHeader: "伤害免疫",
			headerShort: "免疫",
		});
	}

	static _getDamageResistVulnImmuneFilter (
		{
			header,
			cnHeader,
			headerShort,
		},
	) {
		return new Filter({
			header,
			cnHeader,
			items: Parser.DMG_TYPES.map(it => Parser.dmgTypeToEn(it)),
			displayFnMini: str => `${headerShort} ${this._getDamageDisplayText(str)}`,
			displayFnTitle: str => `${cnHeader}: ${this._getDamageDisplayText(str)}`,
			displayFn: str => this._getDamageDisplayText(str),
		});
	}

	static _getDamageDisplayText (str) {
		return Parser.dmgTypeToCn(str.replace(/ \(有条件的\)$/, "")) + (str.endsWith(" (有条件的)") ? " (有条件的)" : "");
	}

	/* -------------------------------------------- */

	static _CONDS = [
		"目盲",
		"魅惑",
		"耳聋",
		"力竭",
		"恐慌",
		"受擒",
		"失能",
		"隐形",
		"麻痹",
		"石化",
		"中毒",
		"倒地",
		"束缚",
		"震慑",
		"昏迷",
		// not really a condition, but whatever
		"疾病",
	];

	static getConditionImmuneFilter () {
		return new Filter({
			header: "Condition Immunity",
			cnHeader: "状态免疫",
		items: this._CONDS.map(it => Parser.conditionToEn(it)),
		displayFnMini: str => `免疫 ${this._getConditionDisplayText(str)}`,
		displayFnTitle: str => `状态免疫: ${this._getConditionDisplayText(str)}`,
		displayFn: str => this._getConditionDisplayText(str),
		});
	}

	static _getConditionDisplayText (str) {
		const isConditional = str.endsWith(" (有条件的)");
		const base = isConditional ? str.slice(0, -" (有条件的)".length) : str;
		return Parser._parse_bToA(Parser.CONTITION_TO_EN, base) + (isConditional ? " (有条件的)" : "");
	}

	/* -------------------------------------------- */

	static mutateForFilters_cost (ent, {prop = "cost"} = {}) {
		ent._fCost = Math.round(ent[prop] || 0);
	}

	/* -------------------------------------------- */

	static mutateForFilters_damageVulnResImmuneNonPlayer (ent) {
		ent._fVuln = this._getAllImmResNonPlayer(ent.vulnerable, "vulnerable");
		ent._fRes = this._getAllImmResNonPlayer(ent.resist, "resist");
		ent._fImm = this._getAllImmResNonPlayer(ent.immune, "immune");
	}

	static mutateForFilters_conditionImmuneNonPlayer (ent) {
		ent._fCondImm = this._getAllImmResNonPlayer(ent.conditionImmune, "conditionImmune");
	}

	static _getAllImmResNonPlayer (val, key) {
		if (!val) return null;
		const out = [];
		for (const valSub of val) this._getAllImmResNonPlayer_recurse(valSub, key, out);
		return out;
	}

	static _getAllImmResNonPlayer_recurse (val, key, out, isConditional) {
		if (val[key]) {
			val[key].forEach(nxt => this._getAllImmResNonPlayer_recurse(nxt, key, out, !!val.cond));
			return;
		}

		if (val.special) return out.push("Other");

		if (typeof val !== "string") return;
		const normalized = key === "conditionImmune" ? Parser.conditionToEn(val) : Parser.dmgTypeToEn(val);
		out.push(isConditional ? `${normalized} (有条件的)` : normalized);
	}

	/* -------------------------------------------- */

	static mutateForFilters_damageVulnResImmunePlayer (ent) {
		ent._fVuln = this._getAllImmResPlayer(ent.vulnerable, "vulnerable");
		ent._fRes = this._getAllImmResPlayer(ent.resist, "resist");
		ent._fImm = this._getAllImmResPlayer(ent.immune, "immune");
	}

	static mutateForFilters_conditionImmunePlayer (ent) {
		ent._fCondImm = this._getAllImmResPlayer(ent.conditionImmune, "conditionImmune");
	}

	static _getAllImmResPlayer (val, key) {
		if (!val) return null;
		const out = [];
		for (const valSub of val) {
			if (typeof valSub === "string") {
				out.push(key === "conditionImmune" ? Parser.conditionToEn(valSub) : Parser.dmgTypeToEn(valSub));
				break;
			}
			valSub.choose?.from?.forEach(it => out.push(key === "conditionImmune" ? Parser.conditionToEn(it) : Parser.dmgTypeToEn(it)));
		}
		return out;
	}

	/* -------------------------------------------- */

	static PREREQ_FILTER_ITEMS = ["Ability", "Species", "Psionics", "Proficiency", "Special", "Spellcasting"];

	static _PREREQ_KEY_TO_FULL = {
		"other": "Special",
		"otherSummary": "Special",
		"spellcasting2020": "Spellcasting",
		"spellcastingFeature": "Spellcasting",
		"spellcastingPrepared": "Spellcasting",
		"spellcastingFocus": "Spellcasting Focus",
		"level": "Class", // We assume that any filter with meaningful level requirements will have these in a separate filter
		"itemType": "Item Type",
		"itemProperty": "Item Property",
	};

	/**
	 * @param {Array<object>} prerequisite
	 * @param {Set} ignoredKeys
	 */
	static getFilterValuesPrerequisite (prerequisite, {ignoredKeys = null} = {}) {
		return Array.from(
			new Set((prerequisite || [])
				.flatMap(it => Object.keys(it))),
		)
			.filter(k => ignoredKeys == null || !ignoredKeys.has(k))
			.map(it => (this._PREREQ_KEY_TO_FULL[it] || it).uppercaseFirst());
	}

	/* -------------------------------------------- */

	static _getNameSourceFilterDisplay (str) {
		const [name, sourceJson] = str.split("|");
		return `${name.toTitleCase()}${sourceJson ? ` (${Parser.sourceJsonToAbv(sourceJson)})` : ""}`;
	}

	/* -------------------------------------------- */

	static getSkillProficienciesFilter () {
		return new Filter({
			header: "Skill Proficiencies",
			cnHeader: "技能熟练项",
			displayFn: str => {
				const [name, sourceJson] = str.split("|");
				const displayName = name === "any" || name === "anySkill" ? "任意技能" : Parser.enSkillToCn(name);
				return `${displayName}${sourceJson ? ` (${Parser.sourceJsonToAbv(sourceJson)})` : ""}`;
			},
		});
	}

	/* -------------------------------------------- */

	static _LANG_TO_DISPLAY = {
		"anyStandard": "任意标准语言",
		"anyExotic": "任意特种语言",
		"anyRare": "任意稀有语言",
		"anyLanguage": "任意",
	};

	static getLanguageProficienciesFilter () {
		return new Filter({
			header: "语言熟练项",
			displayFn: it => {
				if (this._LANG_TO_DISPLAY[it]) return this._LANG_TO_DISPLAY[it];
				if (Parser.LANGUAGES_TO_CN[it]) return Parser.LANGUAGES_TO_CN[it];
				return this._getNameSourceFilterDisplay(it);
			},
		});
	}

	/* -------------------------------------------- */

	static _TOOL_TO_DISPLAY = {
		"anyTool": "任意工具",
		"anyArtisansTool": "任意工匠工具",
		"anyMusicalInstrument": "任意乐器",
		"anyGamingSet": "任意赌博工具",
	};

	static getToolProficienciesFilter () {
		return new Filter({
			header: "Tool Proficiencies",
			cnHeader: "工具熟练项",
			displayFn: it => {
				if (this._TOOL_TO_DISPLAY[it]) return this._TOOL_TO_DISPLAY[it];
				if (Parser.TOOLS_TO_CN[it]) return Parser.TOOLS_TO_CN[it];
				return this._getNameSourceFilterDisplay(it);
			},
		});
	}
}

globalThis.FilterCommon = FilterCommon;
