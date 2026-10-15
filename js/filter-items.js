"use strict";

class PageFilterEquipment extends PageFilterBase {
	static _MISC_FILTER_ITEMS = [
		"物品组别",
		"套组/一批物品",
		"传奇",
		"有图片",
		"有简介",
		"重印",
		"潜在劣势",
		"需要力量",
		"发光：明亮",
		"发光：微弱",
	];

	static _RE_FOUNDRY_ATTR = /(?:[-+*/]\s*)?@[a-z0-9.]+/gi;
	static _RE_DAMAGE_DICE_JUNK = /[^-+*/0-9d]/gi;
	static _RE_DAMAGE_DICE_D = /d/gi;

	static _getSortableDamageTerm (t) {
		try {
			/* eslint-disable no-eval */
			return eval(
				`${t}`
					.replace(this._RE_FOUNDRY_ATTR, "")
					.replace(this._RE_DAMAGE_DICE_JUNK, "")
					.replace(this._RE_DAMAGE_DICE_D, "*"),
			);
			/* eslint-enable no-eval */
		} catch (ignored) {
			return Number.MAX_SAFE_INTEGER;
		}
	}

	static _sortDamageDice (a, b) {
		return this._getSortableDamageTerm(a.item) - this._getSortableDamageTerm(b.item);
	}

	static _getMasteryDisplay (mastery) {
		const {name, source} = DataUtil.proxy.unpackUid("itemMastery", mastery, "itemMastery");
		if (SourceUtil.isSiteSource(source)) return name.toTitleCase();
		return `${name.toTitleCase()} (${Parser.sourceJsonToAbv(source)})`;
	}

	constructor ({filterOpts = null} = {}) {
		super();

		this._typeFilter = new Filter({
			header: "Type",
			cnHeader: "类别",
			deselFn: (it) => PageFilterItems._DEFAULT_HIDDEN_TYPES.has(it),
			displayFn: StrUtil.toTitleCase.bind(StrUtil),
		});
		this._propertyFilter = new Filter({header: "Property", cnHeader: "物品属性", displayFn: StrUtil.toTitleCase.bind(StrUtil)});
		this._categoryFilter = new Filter({
			header: "Category",
			cnHeader: "分类",
			items: ["基础", "通用变体", "特殊变体", "其他"],
			deselFn: (it) => it === "特殊变体",
			itemSortFn: null,
			...(filterOpts?.["Category"] || {}),
		});
		this._costFilter = FilterCommon.getCostFilter();
		this._weightFilter = new RangeFilter({header: "Weight", cnHeader: "重量", min: 0, max: 100, isAllowGreater: true, suffix: " lb."});
		this._focusFilter = new Filter({header: "Spellcasting Focus", cnHeader: "法器", items: [...Parser.ITEM_SPELLCASTING_FOCUS_CLASSES], displayFn: it => Parser.CLASSES_TO_CN[it] ?? it});
		this._damageTypeFilter = new Filter({header: "Weapon Damage Type", cnHeader: "武器伤害类型", displayFn: it => Parser.dmgTypeToFull(it).uppercaseFirst(), itemSortFn: (a, b) => SortUtil.ascSortLower(Parser.dmgTypeToFull(a.item), Parser.dmgTypeToFull(b.item))});
		this._damageDiceFilter = new Filter({header: "Weapon Damage Dice", cnHeader: "武器伤害骰", items: ["1", "1d4", "1d6", "1d8", "1d10", "1d12", "2d6"], itemSortFn: (a, b) => PageFilterEquipment._sortDamageDice(a, b)});
		this._acFilter = new RangeFilter({header: "Armor Class", cnHeader: "护甲类型", displayFn: it => it === 0 ? "无" : it});
		this._rangeFilterNormal = new RangeFilter({header: "Normal", cnHeader: "正常", displayFn: it => it === 0 ? "无" : `${it} 尺`});
		this._rangeFilterLong = new RangeFilter({header: "Long", cnHeader: "长", displayFn: it => it === 0 ? "无" : `${it} 尺`});
		this._rangeFilter = new MultiFilter({header: "Range", cnHeader: "范围", filters: [this._rangeFilterNormal, this._rangeFilterLong]});
		this._miscFilter = new Filter({
			header: "Miscellaneous",
			cnHeader: "杂项",
			items: [...PageFilterEquipment._MISC_FILTER_ITEMS, ...Object.values(Parser.ITEM_MISC_TAG_TO_FULL)],
			isMiscFilter: true,
			deselFn: PageFilterBase.defaultMiscellaneousDeselFn.bind(PageFilterBase),
		});
		this._poisonTypeFilter = new Filter({header: "Poison Type", cnHeader: "毒药类型", items: ["服用", "伤口", "吸入", "接触"], displayFn: StrUtil.toTitleCase.bind(StrUtil)});
		this._masteryFilter = new Filter({header: "Mastery", cnHeader: "精通", displayFn: this.constructor._getMasteryDisplay.bind(this)});
	}

	static _mutateForFilters_getFilterAc (item) {
		if (!item.ac && !item.bonusAc) return null;
		if (item.ac && !item.bonusAc) return item.ac;
		if (isNaN(item.bonusAc)) return item.ac;
		return (item.ac || 0) + Number(item.bonusAc);
	}

	static _RE_RANGE = /^(?<rangeShort>\d+)(?:\/(?<rangeLong>\d+))?$/;

	static _mutateForFilters_getFilterRanges (item) {
		if (!item.range) return null;
		const mRange = this._RE_RANGE.exec(item.range);
		if (!mRange) return null;
		const {rangeShort: rangeShortRaw, rangeLong: rangeLongRaw} = mRange.groups;
		if (!rangeLongRaw) return {normal: Number(rangeShortRaw)};
		return {normal: Number(rangeShortRaw), long: Number(rangeLongRaw)};
	}

	static _mutateForFilters_mutFilterValue (item) {
		if (item.value || item.valueMult) {
			item._l_value = Parser.itemValueToFullMultiCurrency(item, {isShortForm: true}).replace(/ +/g, "\u00A0");
			return;
		}

		item._l_value = "\u2014";
	}

	static _mutateForFilters_getFilterAttachedSpells (item) {
		const flat = Renderer.item.getFlatAttachedSpells(item);
		if (!flat) return flat;
		return flat
			.map(it => it.toLowerCase().split("#")[0].split("|")[0]);
	}

	static mutateForFilters (item) {
		this._mutateForFilters_commonSources(item, {isIncludeBaseSource: true});

		item._fProperties = item.property ? item.property.map(p => Renderer.item.getProperty(p?.uid || p)?.name).filter(Boolean) : null;

		this._mutateForFilters_commonMisc(item);
		if (item._isItemGroup) item._fMisc.push("物品组别");
		if (item.packContents) item._fMisc.push("套组/一批物品");
		if (item.miscTags) item._fMisc.push(...item.miscTags.map(Parser.itemMiscTagToFull));
		if (item.stealth) item._fMisc.push("潜在劣势");
		if (item.strength != null) item._fMisc.push("需要力量");
		if (item.light?.some(l => l.bright)) item._fMisc.push("发光：明亮");
		if (item.light?.some(l => l.dim)) item._fMisc.push("发光：微弱");

		const itemTypeAbv = item.type ? DataUtil.itemType.unpackUid(item.type).abbreviation : null;
		if (item.focus || item.name === "Thieves' Tools" || itemTypeAbv === Parser.ITM_TYP_ABV__INSTRUMENT || itemTypeAbv === Parser.ITM_TYP_ABV__SPELLCASTING_FOCUS || itemTypeAbv === Parser.ITM_TYP_ABV__ARTISAN_TOOL) {
			item._fFocus = item.focus ? item.focus === true ? [...Parser.ITEM_SPELLCASTING_FOCUS_CLASSES] : [...item.focus] : [];
			if ((item.name === "Thieves' Tools" || itemTypeAbv === Parser.ITM_TYP_ABV__ARTISAN_TOOL) && !item._fFocus.includes("Artificer")) item._fFocus.push("Artificer");
			if (itemTypeAbv === Parser.ITM_TYP_ABV__INSTRUMENT && !item._fFocus.includes("Bard")) item._fFocus.push("Bard");
			if (itemTypeAbv === Parser.ITM_TYP_ABV__SPELLCASTING_FOCUS) {
				switch (item.scfType) {
					case "arcane": {
						if (!item._fFocus.includes("Sorcerer")) item._fFocus.push("Sorcerer");
						if (!item._fFocus.includes("Warlock")) item._fFocus.push("Warlock");
						if (!item._fFocus.includes("Wizard")) item._fFocus.push("Wizard");
						break;
					}
					case "druid": {
						if (!item._fFocus.includes("Druid")) item._fFocus.push("Druid");
						break;
					}
					case "holy":
						if (!item._fFocus.includes("Cleric")) item._fFocus.push("Cleric");
						if (!item._fFocus.includes("Paladin")) item._fFocus.push("Paladin");
						break;
				}
			}
		}

		FilterCommon.mutateForFilters_cost(item, {prop: "value"});

		item._fDamageDice = item.dmg1 && item.dmg2
			? [item.dmg1, item.dmg2]
			: (item.dmg1 || item.dmg2 || null);

		item._fMastery = item.mastery
			? item.mastery.map(info => {
				const uid = info.uid || info;
				const {name, source} = DataUtil.proxy.unpackUid("itemMastery", uid, "itemMastery", {isLower: true});
				return [name, source].join("|");
			})
			: null;

		item._fAc = this._mutateForFilters_getFilterAc(item);
		const ranges = this._mutateForFilters_getFilterRanges(item);
		if (ranges) {
			item._fRangeNormal = ranges.normal;
			item._fRangeLong = ranges.long;
		} else {
			item._fRangeNormal = null;
			item._fRangeLong = null;
		}

		item._fAttachedSpells = this._mutateForFilters_getFilterAttachedSpells(item);

		item._l_weight = Parser.itemWeightToFull(item, true) || "\u2014";
		this._mutateForFilters_mutFilterValue(item);
	}

	addToFilters (item, isExcluded) {
		if (isExcluded) return;

		this._sourceFilter.addItem(item._fSources);
		this._typeFilter.addItem(item._textTypes);
		this._propertyFilter.addItem(item._fProperties);
		this._damageTypeFilter.addItem(item.dmgType);
		this._damageDiceFilter.addItem(item._fDamageDice);
		this._acFilter.addItem(item._fAc);
		this._rangeFilterNormal.addItem(item._fRangeNormal);
		this._rangeFilterLong.addItem(item._fRangeLong);
		this._poisonTypeFilter.addItem(item.poisonTypes);
		this._miscFilter.addItem(item._fMisc);
		this._masteryFilter.addItem(item._fMastery);
	}

	async _pPopulateBoxOptions (opts) {
		opts.filters = [
			this._sourceFilter,
			this._typeFilter,
			this._propertyFilter,
			this._categoryFilter,
			this._costFilter,
			this._weightFilter,
			this._focusFilter,
			this._damageTypeFilter,
			this._damageDiceFilter,
			this._acFilter,
			this._rangeFilter,
			this._miscFilter,
			this._poisonTypeFilter,
			this._masteryFilter,
		];
	}

	toDisplay (values, it) {
		return this._filterBox.toDisplay(
			values,
			it._fSources,
			it._textTypes,
			it._fProperties,
			it._category,
			it._fCost,
			it.weight,
			it._fFocus,
			it.dmgType,
			it._fDamageDice,
			it._fAc,
			[
				it._fRangeNormal,
				it._fRangeLong,
			],
			it._fMisc,
			it.poisonTypes,
			it._fMastery,
		);
	}
}

globalThis.PageFilterEquipment = PageFilterEquipment;

class PageFilterItems extends PageFilterEquipment {
	static _DEFAULT_HIDDEN_TYPES = new Set([
		"treasure",
		"treasure (art object)",
		"treasure (coinage)",
		"treasure (gemstone)",
		"futuristic",
		"modern",
		"renaissance",
		"trade bar",
	]);
	static _FILTER_BASE_ITEMS_ATTUNEMENT = ["需要同调", "需由...同调", "可选同调", VeCt.STR_NO_ATTUNEMENT];

	// region static
	static sortItems (a, b, o) {
		if (o.sortBy === "count") return SortUtil.ascSort(a.data.count, b.data.count) || SortUtil.compareListNames(a, b);
		if (o.sortBy === "rarity") return SortUtil.ascSortItemRarity(a.values.rarity, b.values.rarity) || SortUtil.compareListNames(a, b);
		return SortUtil.listSort(a, b, o);
	}

	static _getBaseItemDisplay (baseItem) {
		if (!baseItem) return null;
		let [name, source] = baseItem.split("__");
		name = name.toTitleCase();
		source = source || Parser.SRC_DMG;
		if (source.toLowerCase() === Parser.SRC_PHB.toLowerCase()) return name;
		return `${name} (${Parser.sourceJsonToAbv(source)})`;
	}

	static _sortAttunementFilter (a, b) {
		const ixA = PageFilterItems._FILTER_BASE_ITEMS_ATTUNEMENT.indexOf(a.item);
		const ixB = PageFilterItems._FILTER_BASE_ITEMS_ATTUNEMENT.indexOf(b.item);

		if (~ixA && ~ixB) return ixA - ixB;
		if (~ixA) return -1;
		if (~ixB) return 1;
		return SortUtil.ascSortLower(a, b);
	}

	static _getAttunementFilterItems (item) {
		const out = item._attunementCategory ? [item._attunementCategory] : [];

		if (!item.reqAttuneTags && !item.reqAttuneAltTags) return out;

		[...item.reqAttuneTags || [], ...item.reqAttuneAltTags || []].forEach(tagSet => {
			Object.entries(tagSet)
				.forEach(([prop, val]) => {
					switch (prop) {
						case "background": out.push(`背景: ${val.split("|")[0].toTitleCase()}`); break;
						case "languageProficiency": out.push(`语言熟练项: ${val.toTitleCase()}`); break;
						case "skillProficiency": out.push(`技能熟练项: ${val.toTitleCase()}`); break;
						case "race": out.push(`种族: ${val.split("|")[0].toTitleCase()}`); break;
						case "creatureType": out.push(`生物类型: ${val.toTitleCase()}`); break;
						case "size": out.push(`体型: ${Parser.sizeAbvToFull(val)}`.toTitleCase()); break;
						case "class": out.push(`职业: ${val.split("|")[0].toTitleCase()}`); break;
						case "alignment": out.push(`阵营: ${Parser.alignmentListToFull(val).toTitleCase()}`); break;

						case "str":
						case "dex":
						case "con":
						case "int":
						case "wis":
						case "cha": out.push(`${Parser.attAbvToFull(prop)}: ${val} 或更高`); break;

						case "spellcasting": out.push("施法"); break;
						case "psionics": out.push("灵能"); break;
					}
				});
		});

		return out;
	}

	// endregion
	constructor (opts) {
		super(opts);

		this._tierFilter = new Filter({header: "Tier", cnHeader: "层级", items: ["none", "主要", "次要"], itemSortFn: null, displayFn: it => it === "none" ? "无" : StrUtil.toTitleCase(it)});
		this._attachedSpellsFilter = new SearchableFilter({header: "Attached Spells", cnHeader: "附加法术", displayFn: (it) => it.split("|")[0].toTitleCase(), itemSortFn: SortUtil.ascSortLower});
		this._lootTableFilter = new Filter({
			header: "Found On",
			cnHeader: "位于魔法物品表",
			// items: ["Magic Item Table A", "Magic Item Table B", "Magic Item Table C", "Magic Item Table D", "Magic Item Table E", "Magic Item Table F", "Magic Item Table G", "Magic Item Table H", "Magic Item Table I"],
			items: ["魔法物品表A", "魔法物品表B", "魔法物品表C", "魔法物品表D", "魔法物品表E", "魔法物品表F", "魔法物品表G", "魔法物品表H", "魔法物品表I"],
			displayFn: it => {
				const [name, sourceJson] = it.split("|");
				return `${name}${sourceJson ? ` (${Parser.sourceJsonToAbv(sourceJson)})` : ""}`;
			},
		});
		this._rarityFilter = new Filter({
			header: "Rarity",
			cnHeader: "稀有度",
			items: [...Parser.ITEM_RARITIES],
			itemSortFn: null,
			// displayFn: StrUtil.toTitleCase.bind(StrUtil),
			displayFn: it => Parser.RARITIES_TO_CN[it] || StrUtil.toTitleCase(it),
		});
		this._attunementFilter = new Filter({header: "Attunement", cnHeader: "同调", items: [...PageFilterItems._FILTER_BASE_ITEMS_ATTUNEMENT], itemSortFn: PageFilterItems._sortAttunementFilter});
		this._bonusFilter = new Filter({
			header: "Bonus",
			cnHeader: "加值",
			items: [
				"护甲类", "熟练项加值", "法术命中", "法术豁免DC", "豁免检定",
				...([...new Array(4)]).map((_, i) => `武器命中和伤害骰${i ? ` (+${i})` : ""}`),
				...([...new Array(4)]).map((_, i) => `武器命中骰${i ? ` (+${i})` : ""}`),
				...([...new Array(4)]).map((_, i) => `武器伤害骰${i ? ` (+${i})` : ""}`),
			],
			itemSortFn: null,
		});
		this._rechargeTypeFilter = new Filter({header: "Recharge Type", cnHeader: "充能类型", displayFn: Parser.itemRechargeToFull});
		this._miscFilter = new Filter({
			header: "Miscellaneous",
			cnHeader: "杂项",
			items: ["属性值修正", "充能", "诅咒", "提供语言", "提供熟练项", "魔法", "寻常", "有认知的", "速度修正", ...PageFilterEquipment._MISC_FILTER_ITEMS],
			isMiscFilter: true,
			deselFn: PageFilterBase.defaultMiscellaneousDeselFn.bind(PageFilterBase),
		});
		this._baseSourceFilter = new SourceFilter({header: "Base Source", cnHeader: "基础来源", selFn: null});
		this._baseItemFilter = new SearchableFilter({header: "Base Item", cnHeader: "基础物品", displayFn: this.constructor._getBaseItemDisplay.bind(this.constructor), itemSortFn: SortUtil.ascSortLower});
		this._classFeaturesFilter = new Filter({
			header: "Class Features",
			cnHeader: "职业特性",
			displayFn: (uid) => {
				const {name, source} = DataUtil.class.unpackUidClassFeature(uid);
				return `${name.toTitleCase()} (${Parser.sourceJsonToAbv(source)})`;
			},
			itemSortFn: SortUtil.ascSortLower,
		});
		this._optionalfeaturesFilter = new Filter({
			header: "Other Options and Features",
			cnHeader: "其他选项和特性",
			displayFn: (uid) => {
				const {name, source} = DataUtil.generic.unpackUid(uid, "optfeature");
				return `${name.toTitleCase()} (${Parser.sourceJsonToAbv(source)})`;
			},
			itemSortFn: SortUtil.ascSortLower,
		});
		this._vulnerableFilter = FilterCommon.getDamageVulnerableFilter();
		this._resistFilter = FilterCommon.getDamageResistFilter();
		this._immuneFilter = FilterCommon.getDamageImmuneFilter();
		this._defenseFilter = new MultiFilter({header: "Damage", cnHeader: "伤害", filters: [this._vulnerableFilter, this._resistFilter, this._immuneFilter]});
		this._conditionImmuneFilter = FilterCommon.getConditionImmuneFilter();
	}

	static mutateForFilters (item) {
		super.mutateForFilters(item);

		item._fTier = item.tier || "none";

		if (item.curse) item._fMisc.push("诅咒");
		const isMundane = Renderer.item.isMundane(item);
		item._fMisc.push(isMundane ? "寻常" : "魔法");
		item._fIsMundane = isMundane;
		if (item.ability) item._fMisc.push("属性值修正");
		if (item.modifySpeed) item._fMisc.push("速度修正");
		if (item.charges) item._fMisc.push("充能");
		if (item.sentient) item._fMisc.push("智能");
		if (item.grantsProficiency) item._fMisc.push("提供熟练项");
		if (item.grantsLanguage) item._fMisc.push("提供语言");
		if (item.critThreshold) item._fMisc.push("额外范围");

		const fBaseItemSelf = item._isBaseItem ? `${item.name}__${item.source}`.toLowerCase() : null;
		item._fBaseItem = this._mutateForFilters_getFilterBaseItems(item);
		item._fBaseItemAll = fBaseItemSelf ? [fBaseItemSelf, ...(item._fBaseItem || [])] : item._fBaseItem;

		item._fBonus = null;
		if (item.bonusAc) (item._fBonus ||= []).push("护甲类");
		this._mutateForFilters_bonusWeapon({prop: "bonusWeapon", item, text: "武器命中和伤害骰"});
		this._mutateForFilters_bonusWeapon({prop: "bonusWeaponAttack", item, text: "武器命中骰"});
		this._mutateForFilters_bonusWeapon({prop: "bonusWeaponDamage", item, text: "武器伤害骰"});
		if (item.bonusWeaponCritDamage) (item._fBonus ||= []).push("武器重击伤害");
		if (item.bonusSpellAttack) (item._fBonus ||= []).push("法术命中");
		if (item.bonusSpellSaveDc) (item._fBonus ||= []).push("法术豁免DC");
		if (item.bonusSavingThrow) (item._fBonus ||= []).push("豁免检定");
		if (item.bonusProficiencyBonus) (item._fBonus ||= []).push("熟练加值");

		item._fAttunement = this._getAttunementFilterItems(item);

		this._mutateForFilters_classFeatures(item);

		FilterCommon.mutateForFilters_damageVulnResImmuneNonPlayer(item);
		FilterCommon.mutateForFilters_conditionImmuneNonPlayer(item);
	}

	static _mutateForFilters_getFilterBaseItems (item) {
		if (!item.baseItem && !item._baseName) return null;

		const out = [];
		if (item.baseItem) out.push((item.baseItem.includes("|") ? item.baseItem.replace("|", "__") : `${item.baseItem}__${Parser.SRC_DMG}`).toLowerCase());
		if (item._baseName) out.push(`${item._baseName}__${item._baseSource || item.source}`.toLowerCase());
		return out;
	}

	static _mutateForFilters_bonusWeapon ({prop, item, text}) {
		if (!item[prop]) return;
		(item._fBonus ||= []).push(text);
		switch (item[prop]) {
			case "+1":
			case "+2":
			case "+3": item._fBonus.push(`${text} (${item[prop]})`); break;
		}
	}

	static _CLASS_FEATURE_EFA_ARTIFICER_REPLICATE_MAGIC_ITEM = "仿制魔法物品|奇械师|efa|2|efa";

	static _mutateForFilters_classFeatures (item) {
		item._fClassFeatures = item.classFeatures ? [...item.classFeatures] : null;

		if (item._fClassFeatures?.includes(this._CLASS_FEATURE_EFA_ARTIFICER_REPLICATE_MAGIC_ITEM)) return;
		if (item.curse) return;
		switch (item.rarity) {
			case "common": {
				if (
					item.type
					&& [
						Parser.ITM_TYP_ABV__POTION,
						Parser.ITM_TYP_ABV__SCROLL,
					]
						.includes(DataUtil.itemType.unpackUid(item.type).abbreviation)
				) return;
				(item._fClassFeatures ||= []).push(this._CLASS_FEATURE_EFA_ARTIFICER_REPLICATE_MAGIC_ITEM);
				break;
			}
			case "uncommon":
			case "rare": {
				if (!item.wondrous) return;
				(item._fClassFeatures ||= []).push(this._CLASS_FEATURE_EFA_ARTIFICER_REPLICATE_MAGIC_ITEM);
				break;
			}
		}
	}

	addToFilters (item, isExcluded) {
		if (isExcluded) return;

		super.addToFilters(item, isExcluded);

		this._tierFilter.addItem(item._fTier);
		this._attachedSpellsFilter.addItem(item._fAttachedSpells);
		this._lootTableFilter.addItem(item.lootTables);
		this._baseItemFilter.addItem(item._fBaseItem);
		this._baseSourceFilter.addItem(item._baseSource);
		this._attunementFilter.addItem(item._fAttunement);
		this._rechargeTypeFilter.addItem(item.recharge);
		this._classFeaturesFilter.addItem(item._fClassFeatures);
		this._optionalfeaturesFilter.addItem(item.optionalfeatures);
		this._vulnerableFilter.addItem(item._fVuln);
		this._resistFilter.addItem(item._fRes);
		this._immuneFilter.addItem(item._fImm);
		this._conditionImmuneFilter.addItem(item._fCondImm);
	}

	async _pPopulateBoxOptions (opts) {
		await super._pPopulateBoxOptions(opts);

		opts.filters = [
			this._sourceFilter,
			this._typeFilter,
			this._tierFilter,
			this._rarityFilter,
			this._propertyFilter,
			this._attunementFilter,
			this._categoryFilter,
			this._costFilter,
			this._weightFilter,
			this._focusFilter,
			this._damageTypeFilter,
			this._damageDiceFilter,
			this._acFilter,
			this._rangeFilter,
			this._bonusFilter,
			this._defenseFilter,
			this._conditionImmuneFilter,
			this._miscFilter,
			this._rechargeTypeFilter,
			this._poisonTypeFilter,
			this._masteryFilter,
			this._lootTableFilter,
			this._baseItemFilter,
			this._baseSourceFilter,
			this._classFeaturesFilter,
			this._optionalfeaturesFilter,
			this._attachedSpellsFilter,
		];
	}

	toDisplay (values, it) {
		return this._filterBox.toDisplay(
			values,
			it._fSources,
			it._textTypes,
			it._fTier,
			it.rarity,
			it._fProperties,
			it._fAttunement,
			it._category,
			it._fCost,
			it.weight,
			it._fFocus,
			it.dmgType,
			it._fDamageDice,
			it._fAc,
			[
				it._fRangeNormal,
				it._fRangeLong,
			],
			it._fBonus,
			[
				it._fVuln,
				it._fRes,
				it._fImm,
			],
			it._fCondImm,
			it._fMisc,
			it.recharge,
			it.poisonTypes,
			it._fMastery,
			it.lootTables,
			it._fBaseItemAll,
			it._baseSource,
			it._fClassFeatures,
			it.optionalfeatures,
			it._fAttachedSpells,
		);
	}
}

globalThis.PageFilterItems = PageFilterItems;

class ModalFilterItems extends ModalFilterBase {
	/**
	 * @param opts
	 * @param opts.namespace
	 * @param [opts.isRadio]
	 * @param [opts.allData]
	 * @param [opts.pageFilterOpts] Options to be passed to the underlying items page filter.
	 */
	constructor (opts) {
		opts = opts || {};
		super({
			...opts,
			modalTitle: `物品`,
			pageFilter: new PageFilterItems(opts?.pageFilterOpts),
			previewButtonHandler: new ListUiPreviewButtonHandlerStatsFluff({page: UrlUtil.PG_ITEMS}),
		});
	}

	_getColumnHeaders () {
		const btnMeta = [
			{sort: "name", text: "名称", width: "4"},
			{sort: "type", text: "类型", width: "6"},
			{sort: "source", text: "来源", width: "1"},
		];
		return ModalFilterBase._getFilterColumnHeaders(btnMeta);
	}

	async _pInit () {
		await Renderer.item.pPopulatePropertyAndTypeReference();
	}

	async _pLoadAllData () {
		return [
			...(await Renderer.item.pBuildList()),
			...(await Renderer.item.pGetItemsFromPrerelease()),
			...(await Renderer.item.pGetItemsFromBrew()),
		];
	}

	_getListItem (pageFilter, item, itI) {
		if (item.noDisplay) return null;

		Renderer.item.enhanceItem(item);
		pageFilter.mutateAndAddToFilters(item);

		const eleRow = document.createElement("div");
		eleRow.className = "ve-px-0 ve-w-100 ve-flex-col ve-no-shrink";

		const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_ITEMS](item);
		const source = Parser.sourceJsonToAbv(item.source);
		const type = item._textTypes.join(", ");

		eleRow.innerHTML = `<div class="ve-w-100 ve-flex-vh-center ve-lst__row-border veapp__list-row ve-no-select ve-lst__wrp-cells">
			<div class="ve-col-0-5 ve-pl-0 ve-flex-vh-center">${this._isRadio ? `<input type="radio" name="radio" class="ve-no-events">` : `<input type="checkbox" class="ve-no-events">`}</div>

			<div class="ve-col-0-5 ve-px-1 ve-flex-vh-center">
				<div class="ve-ui-list__btn-inline ve-px-2 ve-no-select" title="切换预览（按 Shift 切换信息预览）">[+]</div>
			</div>

			<div class="ve-col-5 ve-px-1 ${item._versionBase_isVersion ? "ve-italic" : ""} ${this._getNameStyle()}">${item._versionBase_isVersion ? `<span class="ve-px-3"></span>` : ""}${item.name}</div>
			<div class="ve-col-5 ve-px-1">${type.uppercaseFirst()}</div>
			<div class="ve-col-1 ve-flex-h-center ${Parser.sourceJsonToSourceClassname(item.source)} ve-pl-1 ve-pr-0" title="${Parser.sourceJsonToFull(item.source)}">${source}${Parser.sourceJsonToMarkerHtml(item.source, {isList: true})}</div>
		</div>`;

		const btnShowHidePreview = eleRow.firstElementChild.children[1].firstElementChild;

		const listItem = new ListItem({
			id: itI,
			ele: eleRow,
			name: item.name,
			values: {
				source,
				sourceJson: item.source,
				...ListItem.getCommonValues(item),
				type,
				ENG_name: item.ENG_name,
				ENG_hash: UrlUtil.autoEncodeEngHash(item),
			},
			data: {
				hash,
				page: item.page,
				cbSel: eleRow.firstElementChild.firstElementChild.firstElementChild,
				btnShowHidePreview,
			},
		});

		this._previewButtonHandler.bindPreviewButton({entity: item, listItem, btnShowHidePreview});

		return listItem;
	}
}

globalThis.ModalFilterItems = ModalFilterItems;

class ListSyntaxItems extends ListUiUtil.ListSyntax {
	static _INDEXABLE_PROPS_ENTRIES = [
		"_fullEntries",
		"entries",
	];
}

globalThis.ListSyntaxItems = ListSyntaxItems;
