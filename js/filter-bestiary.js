"use strict";

class PageFilterBestiary extends PageFilterBase {
	static _TRAIT_TAG_TO_CN = {
		"Aggressive": "好斗", "Ambusher": "伏击", "Amorphous": "无定形", "Amphibious": "水陆两栖", "Antimagic Susceptibility": "反魔法易感", "Beast of Burden": "负重野兽", "Brute": "残暴", "Camouflage": "伪装", "Charge": "冲锋", "Damage Absorption": "伤害吸收", "Death Burst": "自爆", "Devil's Sight": "魔鬼视界", "Ethereal Sight": "以太视界", "False Appearance": "伪装形态", "Fey Ancestry": "精类血统", "Flyby": "飞掠", "Hold Breath": "屏息", "Illumination": "照明", "Immutable Form": "不变形态", "Incorporeal Movement": "虚体移动", "Keen Senses": "敏锐感官", "Legendary Resistances": "传奇抗性", "Light Sensitivity": "光照敏感", "Magic Resistance": "魔法抗性", "Magic Weapons": "魔法武器", "Mimicry": "拟声", "Pack Tactics": "集群战术", "Pounce": "猛扑", "Rampage": "横行", "Reckless": "鲁莽", "Regeneration": "再生", "Rejuvenation": "复生", "Shapechanger": "变形生物", "Siege Monster": "攻城怪物", "Sneak Attack": "偷袭", "Spider Climb": "蛛行", "Spell Immunity": "法术免疫", "Sunlight Sensitivity": "日照敏感", "Sure-Footed": "立足稳固", "Tree Stride": "林间穿行", "Tunneler": "掘道者", "Turn Immunity": "免疫驱散", "Turn Resistance": "抵抗驱散", "Undead Fortitude": "不死坚韧", "Unusual Nature": "异常本质", "Water Breathing": "水下呼吸", "Web Sense": "蛛网感知", "Web Walker": "蛛网行者",
	};
	static _TRAIT_TAG_CN_TO_EN = Object.fromEntries(Object.entries(this._TRAIT_TAG_TO_CN).map(([en, cn]) => [cn, en]));
	static _getTraitTagKey (tag) { return this._TRAIT_TAG_CN_TO_EN[tag] || tag; }
	static _getConditionKey (uid) {
		const [condition, ...rest] = uid.split("|");
		return [Parser.conditionToEn(condition), ...rest].join("|");
	}
	static _NEUT_ALIGNS = ["NX", "NY"];
	static MISC_FILTER_SPELLCASTER = "施法者, ";
	static _RE_SPELL_TAG = /{@spell ([^}]+)}/g;
	static _RE_ITEM_TAG = /{@item ([^}]+)}/g;
	static _WALKER = null;
	static _DRAGON_AGES = ["雏龙", "青年", "成年", "远古", "太古", "化身"];

	// region static
	static sortMonsters (a, b, o) {
		if (o.sortBy === "count") return SortUtil.ascSort(a.data.count, b.data.count) || SortUtil.compareListNames(a, b);
		if (o.sortBy === "cr") return SortUtil.ascSortCr(a.values.cr, b.values.cr) || SortUtil.compareListNames(a, b);
		return SortUtil.listSort(a, b, o);
	}

	static ascSortMiscFilter (a, b) {
		a = a.item;
		b = b.item;
		if (a.includes(PageFilterBestiary.MISC_FILTER_SPELLCASTER) && b.includes(PageFilterBestiary.MISC_FILTER_SPELLCASTER)) {
			a = Parser.attFullToAbv(a.replace(PageFilterBestiary.MISC_FILTER_SPELLCASTER, ""));
			b = Parser.attFullToAbv(b.replace(PageFilterBestiary.MISC_FILTER_SPELLCASTER, ""));
			return SortUtil.ascSortAtts(a, b);
		} else {
			a = Parser.monMiscTagToFull(a);
			b = Parser.monMiscTagToFull(b);
			return SortUtil.ascSortLower(a, b);
		}
	}

	static _ascSortDragonAgeFilter (a, b) {
		a = a.item;
		b = b.item;
		const ixA = PageFilterBestiary._DRAGON_AGES.indexOf(a);
		const ixB = PageFilterBestiary._DRAGON_AGES.indexOf(b);
		if (~ixA && ~ixB) return SortUtil.ascSort(ixA, ixB);
		if (~ixA) return Number.MIN_SAFE_INTEGER;
		if (~ixB) return Number.MAX_SAFE_INTEGER;
		return SortUtil.ascSortLower(a, b);
	}

	static _getDamageTagDisplayText (tag) { return Parser.dmgTypeToFull(tag).toTitleCase(); }
	static _getConditionDisplayText (uid) { return Parser._parse_bToA(Parser.CONTITION_TO_EN, uid.split("|")[0]); }
	static _getAbilitySaveDisplayText (abl) { return `${Parser.ATB_FULL_TO_CN[abl] || abl}豁免`; }
	static _getAbilitySaveKey (abl) { return Parser._parse_bToA(Parser.ATB_FULL_TO_CN, abl); }
	// endregion

	/* -------------------------------------------- */

	// (Exposed for Plutonium use)
	_getMiscFilterDeselFn () {
		return (it) => ["冒险NPC", "重印"].includes(it);
	}

	_getMiscFilter () {
		return new Filter({
			header: "Miscellaneous",
			cnHeader: "杂项",
			items: ["常见", ...Object.keys(Parser.MON_MISC_TAG_TO_FULL), "附赠动作", "巢穴动作", "传奇", "神话", "冒险NPC", "施法者", ...Object.values(Parser.ATB_ABV_TO_FULL).map(it => `${PageFilterBestiary.MISC_FILTER_SPELLCASTER}${it}`), "区域效应", "反应", "重印", "集群", "有变体", "修改过的副本", "由替换Token", "有简介", "有图片", "有Token", "有充能", "传奇", "物品提供AC", "天生护甲提供AC", "无甲防御提供AC", "由法术召唤", "由职业召唤", "低威胁", "有装备", "有物品"],
			displayFn: (it) => Parser.monMiscTagToFull(it).uppercaseFirst(),
			deselFn: this._getMiscFilterDeselFn(),
			itemSortFn: PageFilterBestiary.ascSortMiscFilter,
			isMiscFilter: true,
		});
	}

	/* -------------------------------------------- */

	constructor (opts) {
		super(opts);

		const styleHint = VetoolsConfig.get("styleSwitcher", "style");

		this._crFilter = new RangeFilter({
			header: "Challenge Rating",
			cnHeader: "挑战等级",
			isLabelled: true,
			labelSortFn: SortUtil.ascSortCr,
			labels: [...Parser.CRS, "Unknown", "\u2014"],
			labelDisplayFn: it => it === "\u2014" ? "None" : it,
		});
		this._sizeFilter = new Filter({
			header: "Size",
			cnHeader: "体型",
			items: [
				Parser.SZ_TINY,
				Parser.SZ_SMALL,
				Parser.SZ_MEDIUM,
				Parser.SZ_LARGE,
				Parser.SZ_HUGE,
				Parser.SZ_GARGANTUAN,
				Parser.SZ_VARIES,
			],
			displayFn: Parser.sizeAbvToFull,
			itemSortFn: null,
		});
		this._speedFilter = new RangeFilter({header: "Speed", cnHeader: "速度", min: 30, max: 30, suffix: " ft"});
		this._speedTypeFilter = new Filter({header: "Speed Type", cnHeader: "速度类型", items: [...Parser.SPEED_MODES, "hover"], displayFn: it => Parser.SPEED_TO_CN[it] || StrUtil.uppercaseFirst(it)});
		this._speedFilterWalk = new RangeFilter({header: "Walk", cnHeader: "步行", min: 30, max: 30, suffix: " ft"});
		this._speedFilterBurrow = new RangeFilter({header: "Burrow", cnHeader: "掘穴", min: 30, max: 30, suffix: " ft"});
		this._speedFilterClimb = new RangeFilter({header: "Climb", cnHeader: "攀爬", min: 30, max: 30, suffix: " ft"});
		this._speedFilterFly = new RangeFilter({header: "Fly", cnHeader: "飞行", min: 30, max: 30, suffix: " ft"});
		this._speedFilterSwim = new RangeFilter({header: "Swim", cnHeader: "游泳", min: 30, max: 30, suffix: " ft"});
		this._speedsFilter = new MultiFilter({
			header: "Speeds",
			cnHeader: "速度",
			filters: [this._speedFilterWalk, this._speedFilterBurrow, this._speedFilterClimb, this._speedFilterFly, this._speedFilterSwim],
			isAddDropdownToggle: true,
		});
		this._strengthFilter = new RangeFilter({header: "Strength", cnHeader: "力量", min: 1, max: 30});
		this._dexterityFilter = new RangeFilter({header: "Dexterity", cnHeader: "敏捷", min: 1, max: 30});
		this._constitutionFilter = new RangeFilter({header: "Constitution", cnHeader: "体质", min: 1, max: 30});
		this._intelligenceFilter = new RangeFilter({header: "Intelligence", cnHeader: "智力", min: 1, max: 30});
		this._wisdomFilter = new RangeFilter({header: "Wisdom", cnHeader: "感知", min: 1, max: 30});
		this._charismaFilter = new RangeFilter({header: "Charisma", cnHeader: "魅力", min: 1, max: 30});
		this._abilityScoreFilter = new MultiFilter({
			header: "Ability Scores",
			cnHeader: "属性值",
			filters: [this._strengthFilter, this._dexterityFilter, this._constitutionFilter, this._intelligenceFilter, this._wisdomFilter, this._charismaFilter],
			isAddDropdownToggle: true,
		});
		this._acFilter = new RangeFilter({header: "Armor Class", cnHeader: "护甲等级"});
		this._averageHpFilter = new RangeFilter({header: "Average Hit Points", cnHeader: "平均生命值"});
		this._typeFilter = new Filter({
			header: "Type",
			cnHeader: "生物类型",
			items: [...Parser.MON_EN_TYPES],
			displayFn: Parser.monTypeToPlural,
			itemSortFn: SortUtil.ascSortLower,
		});
		this._tagFilter = new Filter({header: "Tag", cnHeader: "副类型", displayFn: it => StrUtil.toTitleCase(it)});
		this._sidekickTypeFilter = new Filter({
			header: "Sidekick Type",
			cnHeader: "协力者类型",
			items: ["expert", "spellcaster", "warrior"],
			displayFn: it => Parser.MON_SIDEKICK_TO_CN[it] || StrUtil.toTitleCase(it),
			itemSortFn: SortUtil.ascSortLower,
		});
		this._sidekickTagFilter = new Filter({header: "Sidekick Tag", cnHeader: "协力者副类型", displayFn: it => Parser.MON_SIDEKICK_TO_CN[it] || StrUtil.toTitleCase(it)});
		this._alignmentFilter = new Filter({
			header: "Alignment",
			cnHeader: "阵营",
			items: ["L", "NX", "C", "G", "NY", "E", "N", "U", "A", "无阵营"],
			displayFn: alignment => Parser.alignmentAbvToFull(alignment).toTitleCase(),
			itemSortFn: null,
		});
		this._languageFilter = new Filter({
			header: "Languages",
			cnHeader: "语言",
			displayFn: (k) => Parser.monLanguageTagToFull(k).toTitleCase(),
			umbrellaItems: ["X", "XX"],
			umbrellaExcludes: ["CS"],
		});
		this._damageTypeFilterBase = new Filter({
			header: "Damage Inflicted by Traits/Actions",
			cnHeader: "通过特性/动作造成伤害",
			displayFn: this.constructor._getDamageTagDisplayText,
			displayFnMini: tag => `${this.constructor._getDamageTagDisplayText(tag)}造伤（特性/动作）`,
			items: Object.keys(Parser.DMGTYPE_JSON_TO_FULL),
		});
		this._damageTypeFilterLegendary = new Filter({
			header: "Damage Inflicted by Lair Actions/Regional Effects",
			cnHeader: "通过巢穴动作/区域效应造成伤害",
			displayFn: this.constructor._getDamageTagDisplayText,
			displayFnMini: tag => `${this.constructor._getDamageTagDisplayText(tag)}造伤（巢穴/区域）`,
			items: Object.keys(Parser.DMGTYPE_JSON_TO_FULL),
		});
		this._damageTypeFilterSpells = new Filter({
			header: "Damage Inflicted by Spells",
			cnHeader: "通过法术造成伤害",
			displayFn: this.constructor._getDamageTagDisplayText,
			displayFnMini: tag => `${this.constructor._getDamageTagDisplayText(tag)}造伤（法术）`,
			items: Object.keys(Parser.DMGTYPE_JSON_TO_FULL),
		});
		this._damageTypeFilter = new MultiFilter({header: "Damage Inflicted", cnHeader: "造成伤害", filters: [this._damageTypeFilterBase, this._damageTypeFilterLegendary, this._damageTypeFilterSpells]});
		this._conditionsInflictedFilterBase = new Filter({
			header: "Conditions Inflicted by Traits/Actions",
			cnHeader: "通过特性/动作造成状态",
			displayFn: this.constructor._getConditionDisplayText,
			displayFnMini: uid => `${this.constructor._getConditionDisplayText(uid)}状态（特性/动作）`,
			items: Parser.CONDITIONS.map(it => Parser.conditionToEn(it)),
		});
		this._conditionsInflictedFilterLegendary = new Filter({
			header: "Conditions Inflicted by Lair Actions/Regional Effects",
			cnHeader: "通过巢穴动作/区域效应造成状态",
			displayFn: this.constructor._getConditionDisplayText,
			displayFnMini: uid => `${this.constructor._getConditionDisplayText(uid)}状态（巢穴/区域）`,
			items: Parser.CONDITIONS.map(it => Parser.conditionToEn(it)),
		});
		this._conditionsInflictedFilterSpells = new Filter({
			header: "Conditions Inflicted by Spells",
			cnHeader: "通过法术造成状态",
			displayFn: this.constructor._getConditionDisplayText,
			displayFnMini: uid => `${this.constructor._getConditionDisplayText(uid)}状态（法术）`,
			items: Parser.CONDITIONS.map(it => Parser.conditionToEn(it)),
		});
		this._conditionsInflictedFilter = new MultiFilter({header: "Conditions Inflicted", cnHeader: "造成状态", filters: [this._conditionsInflictedFilterBase, this._conditionsInflictedFilterLegendary, this._conditionsInflictedFilterSpells]});
		this._savingThrowForcedFilterBase = new Filter({
			header: "Saving Throws Required by Traits/Actions",
			cnHeader: "特性/动作需要的豁免检定",
			displayFn: this.constructor._getAbilitySaveDisplayText,
			displayFnMini: abl => `需要${this.constructor._getAbilitySaveDisplayText(abl)} (特性/动作)`,
			items: Object.keys(Parser.ATB_FULL_TO_CN),
			itemSortFn: null,
		});
		this._savingThrowForcedFilterLegendary = new Filter({
			header: "Saving Throws Required by Lair Actions/Regional Effects",
			cnHeader: "通过巢穴动作/区域效应需要的豁免检定",
			displayFn: this.constructor._getAbilitySaveDisplayText,
			displayFnMini: abl => `需要${this.constructor._getAbilitySaveDisplayText(abl)} (巢穴动作/区域效应)`,
			items: Object.keys(Parser.ATB_FULL_TO_CN),
			itemSortFn: null,
		});
		this._savingThrowForcedFilterSpells = new Filter({
			header: "Saving Throws Required by Spells",
			cnHeader: "法术需要的豁免检定",
			displayFn: this.constructor._getAbilitySaveDisplayText,
			displayFnMini: abl => `需要${this.constructor._getAbilitySaveDisplayText(abl)} (法术)`,
			items: Object.keys(Parser.ATB_FULL_TO_CN),
			itemSortFn: null,
		});
		this._savingThrowForcedFilter = new MultiFilter({header: "Saving Throw Required", cnHeader: "需要豁免检定", filters: [this._savingThrowForcedFilterBase, this._savingThrowForcedFilterLegendary, this._savingThrowForcedFilterSpells]});
		this._senseFilter = new Filter({
			header: "Senses",
			cnHeader: "感官能力",
			displayFn: (it) => Parser.monSenseTagToFull(it).toTitleCase(),
			items: ["B", "D", "SD", "T", "U"],
			itemSortFn: SortUtil.ascSortLower,
		});
		this._passivePerceptionFilter = new RangeFilter({header: "Passive Perception", cnHeader: "被动察觉", min: 10, max: 10});
		this._skillFilter = new Filter({
			header: "Skills",
			cnHeader: "技能",
			displayFn: (it) => it.toTitleCase(),
			items: Object.keys(Parser.SKILL_TO_ATB_ABV),
		});
		this._saveFilter = new Filter({
			header: "Saves",
			cnHeader: "豁免",
			displayFn: Parser.attAbvToFull,
			items: [...Parser.ABIL_ABVS],
			itemSortFn: null,
		});
		this._environmentFilter = new Filter({
			header: "Environment",
			cnHeader: "环境",
			headerDisplayName: styleHint === "classic" ? "Environment" : "Habitat",
			items: [...Parser.ENVIRONMENTS],
			displayFn: Parser.getEnvironmentDisplayName,
		});
		this._vulnerableFilter = FilterCommon.getDamageVulnerableFilter();
		this._resistFilter = FilterCommon.getDamageResistFilter();
		this._immuneFilter = FilterCommon.getDamageImmuneFilter();
		this._defenseFilter = new MultiFilter({header: "Damage", cnHeader: "伤害", filters: [this._vulnerableFilter, this._resistFilter, this._immuneFilter]});
		this._conditionImmuneFilter = FilterCommon.getConditionImmuneFilter();
		this._traitFilter = new Filter({
			header: "Traits",
			cnHeader: "特质",
			displayFn: it => this.constructor._TRAIT_TAG_TO_CN[it] || it,
			items: Object.keys(this.constructor._TRAIT_TAG_TO_CN),
		});
		this._actionReactionFilter = new Filter({
			header: "Actions & Reactions",
			cnHeader: "动作 & 反应",
			displayFn: it => ({
				"Multiattack": "多重攻击",
				"Breath Weapon": "吐息武器",
				"Tentacles": "触须",
				"Shapechanger": "变形生物",
				"Parry": "招架",
				"Swallow": "吞噬",
				"Teleport": "传送",
				"Frightful Presence": "恐怖威仪",
			})[it] || it,
			items: [
				// "Frightful Presence", "Multiattack", "Parry", "Swallow", "Teleport", "Tentacles",
			],
		});
		this._miscFilter = this._getMiscFilter();
		this._spellcastingTypeFilter = new Filter({
			header: "Spellcasting Type",
			cnHeader: "施法类型",
			items: ["F", "I", "P", "S", "O", "CA", "CB", "CC", "CD", "CP", "CR", "CS", "CL", "CW"],
			displayFn: Parser.monSpellcastingTagToFull,
		});
		this._spellSlotLevelFilter = new RangeFilter({
			header: "Spell Slot Level",
			cnHeader: "法术环阶",
			min: 1,
			max: 9,
			displayFn: it => Parser.getOrdinalForm(it),
		});
		this._spellKnownFilter = new SearchableFilter({header: "Spells Known", cnHeader: "已知法术", displayFn: (it) => it.toTitleCase(), itemSortFn: SortUtil.ascSortLower});
		this._equipmentFilter = new SearchableFilter({header: "Equipment", cnHeader: "装备", displayFn: (it) => it.toTitleCase(), itemSortFn: SortUtil.ascSortLower});
		this._dragonAgeFilter = new Filter({
			header: "Dragon Age",
			cnHeader: "龙的年龄",
			items: [...PageFilterBestiary._DRAGON_AGES],
			itemSortFn: PageFilterBestiary._ascSortDragonAgeFilter,
			displayFn: StrUtil.toTitleCase.bind(StrUtil),
		});
		this._dragonCastingColorFilter = new Filter({
			header: "Dragon Casting Color",
			cnHeader: "龙的颜色",
			items: [...Renderer.monster.dragonCasterVariant.getAvailableColors()],
			displayFn: StrUtil.toTitleCase.bind(StrUtil),
		});
		this._treasureFilter = new Filter({
			header: "Treasure",
			cnHeader: "宝藏",
			items: [...Parser.TREASURE_TYPES],
			displayFn: StrUtil.toTitleCase.bind(StrUtil),
		});
		this._groupFilter = new Filter({
			header: "Group",
			cnHeader: "群组",
			items: [],
			displayFn: Parser.monGroupTagToFull,

			// displayFn: StrUtil.toTitleCase.bind(StrUtil),
		});
	}

	static mutateForFilters (mon) {
		Renderer.monster.initParsed(mon);

		this._mutateForFilters_commonSources(mon);

		this._mutateForFilters_ac(mon);
		this._mutateForFilters_speed(mon);
		this._mutateForFilters_environment(mon);

		mon._fHp = mon.hp?.average ?? null;
		if (mon.alignment) {
			const tempAlign = typeof mon.alignment[0] === "object"
				? Array.prototype.concat.apply([], mon.alignment.map(a => a.alignment))
				: [...mon.alignment];
			if (tempAlign.includes("N") && !tempAlign.includes("G") && !tempAlign.includes("E")) tempAlign.push("NY");
			else if (tempAlign.includes("N") && !tempAlign.includes("L") && !tempAlign.includes("C")) tempAlign.push("NX");
			else if (tempAlign.length === 1 && tempAlign.includes("N")) Array.prototype.push.apply(tempAlign, PageFilterBestiary._NEUT_ALIGNS);
			mon._fAlign = tempAlign;
		} else {
			mon._fAlign = ["无阵营"];
		}
		FilterCommon.mutateForFilters_damageVulnResImmuneNonPlayer(mon);
		FilterCommon.mutateForFilters_conditionImmuneNonPlayer(mon);
		mon._fTraitTags = mon.traitTags?.map(tag => this._getTraitTagKey(tag));
		mon._fConditionInflict = mon.conditionInflict?.map(uid => this._getConditionKey(uid));
		mon._fConditionInflictLegendary = mon.conditionInflictLegendary?.map(uid => this._getConditionKey(uid));
		mon._fConditionInflictSpell = mon.conditionInflictSpell?.map(uid => this._getConditionKey(uid));
		mon._fSavingThrowForced = mon.savingThrowForced?.map(abl => this._getAbilitySaveKey(abl));
		mon._fSavingThrowForcedLegendary = mon.savingThrowForcedLegendary?.map(abl => this._getAbilitySaveKey(abl));
		mon._fSavingThrowForcedSpell = mon.savingThrowForcedSpell?.map(abl => this._getAbilitySaveKey(abl));
		mon._fSave = mon.save ? Object.keys(mon.save) : [];
		mon._fSkill = mon.skill ? Object.keys(mon.skill) : [];
		mon._fPassive = typeof mon.passive === "number" ? mon.passive : null;

		Parser.ABIL_ABVS
			.forEach(ab => {
				if (mon[ab] == null) return;
				const propF = `_f${ab.uppercaseFirst()}`;
				mon[propF] = typeof mon[ab] !== "number" ? null : mon[ab];
			});

		this._mutateForFilters_commonMisc(mon);
		mon._fMisc.push(...mon.miscTags || []);
		for (const it of (mon.trait || [])) {
			if (it.name && it.name.startsWith("无甲防御")) mon._fMisc.push("无甲防御提供AC");
		}
		for (const it of (mon.ac || [])) {
			if (!it.from) continue;
			if (it.from.includes("natural armor")) mon._fMisc.push("天生护甲提供AC");
			if (it.from.some(x => x.startsWith("{@item "))) mon._fMisc.push("物品提供AC");
			if (!mon._fMisc.includes("无甲防御提供AC") && it.from.includes("无甲防御")) mon._fMisc.push("无甲防御提供AC");
		}
		if (Renderer.monster.hasLegendaryActions(mon)) mon._fMisc.push("传奇");
		if (Renderer.monster.hasMythicActions(mon)) mon._fMisc.push("神话");
		if (Renderer.monster.hasReactions(mon)) mon._fMisc.push("反应");
		if (Renderer.monster.hasBonusActions(mon)) mon._fMisc.push("附赠动作");
		if (mon.familiar) mon._fMisc.push("常见");
		if (mon.type.swarmSize) mon._fMisc.push("集群");
		if (mon.spellcasting) {
			mon._fMisc.push("施法者");
			for (const sc of mon.spellcasting) {
				if (sc.ability) mon._fMisc.push(`${PageFilterBestiary.MISC_FILTER_SPELLCASTER}${Parser.attAbvToFull(sc.ability)}`);
			}
		}
		if (mon.isNpc) mon._fMisc.push("冒险NPC");
		if (mon.isNamedCreature) mon._fMisc.push("有名字的生物");
		const legGroup = DataUtil.monster.getLegendaryGroup(mon);
		if (legGroup) {
			if (legGroup.lairActions) mon._fMisc.push("巢穴动作");
			if (legGroup.regionalEffects) mon._fMisc.push("区域效应");
		}
		if (mon.variant) mon._fMisc.push("有变体");
		if (mon.altArt) mon._fMisc.push("由替换Token");
		if (Renderer.monster.hasToken(mon)) mon._fMisc.push("有Token");
		if (this._hasFluff(mon)) mon._fMisc.push("有简介");
		if (this._hasFluffImages(mon)) mon._fMisc.push("有图片");
		if (this._hasRecharge(mon)) mon._fMisc.push("有充能");
		if (mon.summonedBySpell) mon._fMisc.push("由法术召唤");
		if (mon.summonedByClass) mon._fMisc.push("由职业召唤");
		if (mon._copy_templates?.some(({name, source}) => name === "低威胁" && source === Parser.SRC_TYP)) mon._fMisc.push("低威胁");
		if (mon.gear?.length) mon._fMisc.push("有装备");

		const spellcasterMeta = this._getSpellcasterMeta(mon);
		if (spellcasterMeta) {
			if (spellcasterMeta.spellLevels.size) mon._fSpellSlotLevels = [...spellcasterMeta.spellLevels];
			if (spellcasterMeta.spellSet.size) mon._fSpellsKnown = [...spellcasterMeta.spellSet];
		}

		if (mon.languageTags?.length) mon._fLanguageTags = mon.languageTags;
		else mon._fLanguageTags = ["None"];

		mon._fEquipment = this._getEquipmentList(mon);
		if (mon._fEquipment?.length) mon._fMisc.push("有物品");
	}

	static _mutateForFilters_ac (mon) {
		const filterAc = (mon.ac || [])
			.map(acItem => {
				if (acItem.special) return null;
				const acNumber = acItem.ac || acItem;
				if (typeof acNumber !== "number") return null;
				return acNumber;
			})
			.filter(val => val != null);
		mon._fAc = filterAc.length ? filterAc : null;
	}

	static _F_SPEED_PROP_MAPPING = Object.fromEntries(Parser.SPEED_MODES.map(prop => [prop, `_fSpeed${prop.uppercaseFirst()}`]));

	static _mutateForFilters_speed (mon) {
		mon._fSpeedWalk = null;
		mon._fSpeedBurrow = null;
		mon._fSpeedClimb = null;
		mon._fSpeedFly = null;
		mon._fSpeedSwim = null;

		if (mon.speed == null) {
			mon._fSpeedType = [];
			mon._fSpeed = null;
			return;
		}

		if (typeof mon.speed === "number" && mon.speed > 0) {
			mon._fSpeedType = ["walk"];
			mon._fSpeed = mon.speed;
			mon._fSpeedWalk = mon.speed;
			return;
		}

		let maxSpeed = 0;
		mon._fSpeedType = Parser.SPEED_MODES
			.filter(prop => {
				const v = mon.speed[prop];
				if (!v) return false;
				const num = v.number || v;
				if (typeof num !== "number") return false;
				maxSpeed = Math.max(maxSpeed, num);
				mon[this._F_SPEED_PROP_MAPPING[prop]] = num;
				return true;
			});

		mon._fSpeed = maxSpeed;

		if (mon.speed.canHover) mon._fSpeedType.push("hover");
	}

	static _mutateForFilters_environment (mon) {
		if (!mon.environment) return mon._fEnvironment = ["none"];
		mon._fEnvironment = mon.environment
			.flatMap(env => Parser.getExpandedEnvironments(env));
	}

	/* -------------------------------------------- */

	static _getInitWalker () {
		return PageFilterBestiary._WALKER ||= MiscUtil.getWalker({isNoModification: true});
	}

	/* -------------------------------------------- */

	static _getSpellcasterMeta (mon) {
		if (!mon.spellcasting?.length) return null;

		const walker = this._getInitWalker();

		const spellSet = new Set();
		const spellLevels = new Set();
		for (const spc of mon.spellcasting) {
			if (spc.spells) {
				const slotLevels = Object.keys(spc.spells).map(Number).filter(Boolean);
				for (const slotLevel of slotLevels) spellLevels.add(slotLevel);
			}

			walker.walk(
				spc,
				{
					string: this._getSpellcasterMeta_stringHandler.bind(this, spellSet),
				},
			);
		}

		return {spellLevels, spellSet};
	}

	static _getSpellcasterMeta_stringHandler (spellSet, str) {
		str.replace(PageFilterBestiary._RE_SPELL_TAG, (...m) => {
			spellSet.add(DataUtil.proxy.unpackUid("spell", m[1], "spell", {isLower: true}).name);
			return "";
		});
	}

	/* -------------------------------------------- */

	static _RECHARGE_ENTRY_PROPS = [
		"trait",
		"action",
		"bonus",
		"reaction",
		"legendary",
		"mythic",
	];

	static _hasRecharge (mon) {
		if (mon.spellcasting?.some(ent => ent.recharge)) return true;
		for (const prop of PageFilterBestiary._RECHARGE_ENTRY_PROPS) {
			if (!mon[prop]) continue;
			for (const ent of mon[prop]) {
				if (!ent?.name) continue;
				if (ent.name.includes("{@recharge")) return true;
			}
		}
		return false;
	}

	/* -------------------------------------------- */

	// TODO(ESM) switch to using `UtilsEntityCreature.getEquipmentUids`
	static _getEquipmentList (mon) {
		if (mon.gear) {
			return mon.gear
				.map(ref => (ref.item || ref).toLowerCase());
		}

		const itemSet = new Set(mon.attachedItems || []);

		const walker = this._getInitWalker();

		for (const acItem of (mon.ac || [])) {
			if (!acItem?.from?.length) continue;
			for (const from of acItem.from) this._getEquipmentList_stringHandler(itemSet, from);
		}

		for (const trait of (mon.trait || [])) {
			if (!trait.name?.toLowerCase().startsWith("special equipment")) continue;
			walker.walk(
				trait.entries,
				{
					string: this._getEquipmentList_stringHandler.bind(this, itemSet),
				},
			);
			break;
		}

		return [...itemSet];
	}

	static _getEquipmentList_stringHandler (itemSet, str) {
		str
			.replace(PageFilterBestiary._RE_ITEM_TAG, (...m) => {
				itemSet.add(DataUtil.proxy.unpackUid("item", m[1], "item", {isLower: true}).name);
				return "";
			});
	}

	/* -------------------------------------------- */

	addToFilters (mon, isExcluded) {
		if (isExcluded) return;

		this._sourceFilter.addItem(mon._fSources);
		this._crFilter.addItem(mon._fCr);
		this._typeFilter.addItem(mon._pTypes.types);
		this._strengthFilter.addItem(mon._fStr);
		this._dexterityFilter.addItem(mon._fDex);
		this._constitutionFilter.addItem(mon._fCon);
		this._intelligenceFilter.addItem(mon._fInt);
		this._wisdomFilter.addItem(mon._fWis);
		this._charismaFilter.addItem(mon._fCha);
		this._speedFilter.addItem(mon._fSpeed);
		this._speedFilterWalk.addItem(mon._fSpeedWalk);
		this._speedFilterBurrow.addItem(mon._fSpeedBurrow);
		this._speedFilterClimb.addItem(mon._fSpeedClimb);
		this._speedFilterFly.addItem(mon._fSpeedFly);
		this._speedFilterSwim.addItem(mon._fSpeedSwim);
		this._acFilter.addItem(mon._fAc);
		if (mon.hp?.average) this._averageHpFilter.addItem(mon.hp.average);
		this._tagFilter.addItem(mon._pTypes.tags);
		this._sidekickTypeFilter.addItem(mon._pTypes.typeSidekick);
		this._sidekickTagFilter.addItem(mon._pTypes.tagsSidekick);
		this._traitFilter.addItem(mon._fTraitTags);
		this._actionReactionFilter.addItem(mon.actionTags);
		this._environmentFilter.addItem(mon._fEnvironment);
		this._vulnerableFilter.addItem(mon._fVuln);
		this._resistFilter.addItem(mon._fRes);
		this._immuneFilter.addItem(mon._fImm);
		this._senseFilter.addItem(mon.senseTags);
		this._passivePerceptionFilter.addItem(mon._fPassive);
		this._spellSlotLevelFilter.addItem(mon._fSpellSlotLevels);
		this._spellKnownFilter.addItem(mon._fSpellsKnown);
		this._equipmentFilter.addItem(mon._fEquipment);
		this._miscFilter.addItem(mon._fMisc);
		this._damageTypeFilterBase.addItem(mon.damageTags);
		this._damageTypeFilterLegendary.addItem(mon.damageTagsLegendary);
		this._damageTypeFilterSpells.addItem(mon.damageTagsSpell);
		this._conditionsInflictedFilterBase.addItem(mon._fConditionInflict);
		this._conditionsInflictedFilterLegendary.addItem(mon._fConditionInflictLegendary);
		this._conditionsInflictedFilterSpells.addItem(mon._fConditionInflictSpell);
		this._savingThrowForcedFilterBase.addItem(mon._fSavingThrowForced);
		this._savingThrowForcedFilterLegendary.addItem(mon._fSavingThrowForcedLegendary);
		this._savingThrowForcedFilterSpells.addItem(mon._fSavingThrowForcedSpell);
		this._dragonAgeFilter.addItem(mon.dragonAge);
		this._dragonCastingColorFilter.addItem(mon.dragonCastingColor);
		this._treasureFilter.addItem(mon.treasure);
		this._groupFilter.addItem(mon.group);
	}

	async _pPopulateBoxOptions (opts) {
		Object.entries(Parser.MON_LANGUAGE_TAG_TO_FULL)
			.sort(([, vA], [, vB]) => SortUtil.ascSortLower(vA, vB))
			.forEach(([k]) => this._languageFilter.addItem(k));
		this._languageFilter.addItem("None");

		opts.filters = [
			this._sourceFilter,
			this._crFilter,
			this._typeFilter,
			this._tagFilter,
			this._sidekickTypeFilter,
			this._sidekickTagFilter,
			this._groupFilter,
			this._environmentFilter,
			this._defenseFilter,
			this._conditionImmuneFilter,
			this._traitFilter,
			this._actionReactionFilter,
			this._miscFilter,
			this._spellcastingTypeFilter,
			this._spellSlotLevelFilter,
			this._sizeFilter,
			this._speedFilter,
			this._speedTypeFilter,
			this._speedsFilter,
			this._alignmentFilter,
			this._saveFilter,
			this._skillFilter,
			this._senseFilter,
			this._passivePerceptionFilter,
			this._languageFilter,
			this._damageTypeFilter,
			this._conditionsInflictedFilter,
			this._savingThrowForcedFilter,
			this._dragonAgeFilter,
			this._dragonCastingColorFilter,
			this._acFilter,
			this._averageHpFilter,
			this._abilityScoreFilter,
			this._spellKnownFilter,
			this._treasureFilter,
			this._equipmentFilter,
		];
	}

	toDisplay (values, m) {
		return this._filterBox.toDisplay(
			values,
			m._fSources,
			m._fCr,
			m._pTypes.types,
			m._pTypes.tags,
			m._pTypes.typeSidekick,
			m._pTypes.tagsSidekick,
			m.group,
			m._fEnvironment,
			[
				m._fVuln,
				m._fRes,
				m._fImm,
			],
			m._fCondImm,
			m._fTraitTags,
			m.actionTags,
			m._fMisc,
			m.spellcastingTags,
			m._fSpellSlotLevels,
			m.size,
			m._fSpeed,
			m._fSpeedType,
			[
				m._fSpeedWalk,
				m._fSpeedBurrow,
				m._fSpeedClimb,
				m._fSpeedFly,
				m._fSpeedSwim,
			],
			m._fAlign,
			m._fSave,
			m._fSkill,
			m.senseTags,
			m._fPassive,
			m._fLanguageTags,
			[
				m.damageTags,
				m.damageTagsLegendary,
				m.damageTagsSpell,
			],
			[
				m._fConditionInflict,
				m._fConditionInflictLegendary,
				m._fConditionInflictSpell,
			],
			[
				m._fSavingThrowForced,
				m._fSavingThrowForcedLegendary,
				m._fSavingThrowForcedSpell,
			],
			m.dragonAge,
			m.dragonCastingColor,
			m._fAc,
			m._fHp,
			[
				m._fStr,
				m._fDex,
				m._fCon,
				m._fInt,
				m._fWis,
				m._fCha,
			],
			m._fSpellsKnown,
			m.treasure,
			m._fEquipment,
		);
	}
}

globalThis.PageFilterBestiary = PageFilterBestiary;

class ModalFilterBestiary extends ModalFilterBase {
	/**
	 * @param opts
	 * @param opts.namespace
	 * @param [opts.isRadio]
	 * @param [opts.allData]
	 */
	constructor (opts) {
		opts = opts || {};
		super({
			...opts,
			modalTitle: `Creature${opts.isRadio ? "" : "s"}`,
			pageFilter: new PageFilterBestiary(),
			fnSort: PageFilterBestiary.sortMonsters,
			previewButtonHandler: new ListUiPreviewButtonHandlerStatsFluff({page: UrlUtil.PG_BESTIARY}),
		});
	}

	_getColumnHeaders () {
		const btnMeta = [
			{sort: "name", text: "名称", width: "4"},
			{sort: "type", text: "类型", width: "4"},
			{sort: "cr", text: "CR", width: "2"},
			{sort: "source", text: "Source", width: "1"},
		];
		return ModalFilterBase._getFilterColumnHeaders(btnMeta);
	}

	async _pLoadAllData () {
		return [
			...(await DataLoader.pCacheAndGetAllSite(UrlUtil.PG_BESTIARY)),
			...((await PrereleaseUtil.pGetBrewProcessed()).monster || []),
			...((await BrewUtil2.pGetBrewProcessed()).monster || []),
		];
	}

	_getListItem (pageFilter, mon, itI) {
		Renderer.monster.initParsed(mon);
		pageFilter.mutateAndAddToFilters(mon);

		const eleRow = document.createElement("div");
		eleRow.className = "ve-px-0 ve-w-100 ve-flex-col ve-no-shrink";

		const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_BESTIARY](mon);
		const source = Parser.sourceJsonToAbv(mon.source);
		const type = mon._pTypes.asText;
		const cr = mon._pCr;

		eleRow.innerHTML = `<div class="ve-w-100 ve-flex-vh-center ve-lst__row-border veapp__list-row ve-no-select ve-lst__wrp-cells">
			<div class="ve-col-0-5 ve-pl-0 ve-flex-vh-center">${this._isRadio ? `<input type="radio" name="radio" class="ve-no-events">` : `<input type="checkbox" class="ve-no-events">`}</div>

			<div class="ve-col-0-5 ve-px-1 ve-flex-vh-center">
				<div class="ve-ui-list__btn-inline ve-px-2 ve-no-select" title="Toggle Preview (SHIFT to Toggle Info Preview)">[+]</div>
			</div>

			<div class="ve-col-4 ve-px-1 ${mon._versionBase_isVersion ? "ve-italic" : ""} ${this._getNameStyle()}">${mon._versionBase_isVersion ? `<span class="ve-px-3"></span>` : ""}${mon.name}</div>
			<div class="ve-col-4 ve-px-1">${type}</div>
			<div class="ve-col-2 ve-px-1 ve-text-center">${cr}</div>
			<div class="ve-col-1 ve-flex-h-center ${Parser.sourceJsonToSourceClassname(mon.source)} ve-pl-1 ve-pr-0" title="${Parser.sourceJsonToFull(mon.source)}">${source}${Parser.sourceJsonToMarkerHtml(mon.source, {isList: true})}</div>
		</div>`;

		const btnShowHidePreview = eleRow.firstElementChild.children[1].firstElementChild;

		const listItem = new ListItem({
			id: itI,
			ele: eleRow,
			name: mon.name,
			values: {
				source,
				sourceJson: mon.source,
				...ListItem.getCommonValues(mon),
				type,
				cr,
				ENG_name: mon.ENG_name,
				ENG_hash: UrlUtil.autoEncodeEngHash(mon),
			},
			data: {
				hash,
				page: mon.page,
				cbSel: eleRow.firstElementChild.firstElementChild.firstElementChild,
				btnShowHidePreview,
			},
		});

		this._previewButtonHandler.bindPreviewButton({entity: mon, listItem, btnShowHidePreview});

		return listItem;
	}
}

globalThis.ModalFilterBestiary = ModalFilterBestiary;

class ListSyntaxBestiary extends ListUiUtil.ListSyntax {
	static _INDEXABLE_PROPS_ENTRIES = [
		"trait",
		"spellcasting",
		"action",
		"bonus",
		"reaction",
		"legendary",
		"mythic",
		"variant",
	];
	static _INDEXABLE_PROPS_LEG_GROUP = [
		"lairActions",
		"regionalEffects",
		"mythicEncounter",
	];

	_getSearchCacheStats (entity) {
		const legGroup = DataUtil.monster.getLegendaryGroup(entity);
		if (!legGroup && this.constructor._INDEXABLE_PROPS_ENTRIES.every(it => !entity[it])) return "";
		const ptrOut = {_: ""};
		this.constructor._INDEXABLE_PROPS_ENTRIES.forEach(it => this._getSearchCache_handleEntryProp(entity, it, ptrOut));
		if (legGroup) this.constructor._INDEXABLE_PROPS_LEG_GROUP.forEach(it => this._getSearchCache_handleEntryProp(legGroup, it, ptrOut));
		return ptrOut._;
	}
}

globalThis.ListSyntaxBestiary = ListSyntaxBestiary;
