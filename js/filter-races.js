"use strict";

class PageFilterRaces extends PageFilterBase {
	// region static
	static getLanguageProficiencyTags (lProfs) {
		if (!lProfs) return [];

		const outSet = new Set();
		lProfs.forEach(lProfGroup => {
			Object.keys(lProfGroup)
				.forEach(k => {
					if (!["choose", "any", "anyStandard", "anyExotic", "anyRare"].includes(k)) outSet.add(Parser.LANGUAGES_TO_CN[k]);
					else outSet.add("自选");
				});
		});

		return [...outSet];
	}

	static getSpeedRating (speed) { return speed > 30 ? "步行 (快)" : speed < 30 ? "步行 (慢)" : "步行"; }

	static filterAscSortSize (a, b) {
		a = a.item;
		b = b.item;

		return SortUtil.ascSort(Parser.SIZE_ABVS.indexOf(a), Parser.SIZE_ABVS.indexOf(b));
	}

	static getSizeDisplayInfo (size) {
		size ||= [Parser.SZ_VARIES];

		return {
			sizeText: size.map(sz => Parser.sizeAbvToFull(sz)).joinConjunct("、", "或"),
			sizeShortText: size.map(sz => Parser.sizeAbvToShort(sz)).join("/"),
		};
	}
	// endregion

	static _TRAIT_DISPLAY_VALUES = {
		"Monstrous Race": "怪物种族",
		"NPC Race": "NPC种族",
		"Uncommon Race": "罕见种族",

		"Armor Proficiency": "护甲受训",
	};

	constructor () {
		super();

		this._sizeFilter = new Filter({header: "体型Size", cnHeader: "体型", displayFn: Parser.sizeAbvToFull, itemSortFn: PageFilterRaces.filterAscSortSize});
		this._asiFilter = new AbilityScoreFilter({header: "Ability Scores (Including Subrace)", cnHeader: "属性加值 (包括亚种)"});
		this._baseRaceFilter = new Filter({header: "基础种族Base Race", cnHeader: "基础种族"});
		this._speedFilter = new Filter({header: "速度Speed", cnHeader: "速度", items: ["攀爬", "飞行", "游泳", "步行 (快)", "步行", "步行 (慢)"]});
		this._traitFilter = new Filter({
			header: "Traits",
			cnHeader: "特质",
			items: [
				"两栖",
				"护甲熟练项",
				"盲视",
				"黑暗视觉",
				"增强黑暗视觉",
				"龙纹",
				"专长",
				"修整强化",
				"怪物种族",
				"天生护甲",
				"天生武器",
				"NPC种族",
				"强力构筑",
				"技能熟练项",
				"施法",
				"日照敏感",
				"工具熟练项",
				"罕见种族",
				"武器熟练项",
			],
			displayFn: val => this.constructor._TRAIT_DISPLAY_VALUES[val] || val,
			deselFn: (it) => {
				return it === "NPC Race" || it === "NPC种族";
			},
		});
		this._vulnerableFilter = FilterCommon.getDamageVulnerableFilter();
		this._resistFilter = FilterCommon.getDamageResistFilter();
		this._immuneFilter = FilterCommon.getDamageImmuneFilter();
		this._defenseFilter = new MultiFilter({header: "Damage", cnHeader: "伤害类型", filters: [this._vulnerableFilter, this._resistFilter, this._immuneFilter]});
		this._conditionImmuneFilter = FilterCommon.getConditionImmuneFilter();
		this._languageFilter = new Filter({
			header: "Languages",
			cnHeader: "语言",
			items: [
				"深渊语",
				"天界语",
				"自选",
				"通用语",
				"龙语",
				"矮人语",
				"精灵语",
				"巨人语",
				"侏儒语",
				"地精语",
				"半身人语",
				"炼狱语",
				"兽人语",
				"其他",
				"原初语",
				"木族语",
				"地底通用语",
			],
			displayFn: it => it.split("|")[0].toTitleCase(),
			umbrellaItems: ["自选"],
		});
		this._creatureTypeFilter = new Filter({
			header: "Creature Type",
			cnHeader: "生物类型",
			items: Parser.MON_TYPES,
			displayFn: StrUtil.toTitleCase.bind(StrUtil),
			itemSortFn: SortUtil.ascSortLower,
		});
		this._ageFilter = new RangeFilter({
			header: "Adult Age",
			cnHeader: "成年年龄",
			isRequireFullRangeMatch: true,
			isSparse: true,
			displayFn: it => `${it} 岁`,
			displayFnTooltip: it => `${it} 岁`,
		});
		this._miscFilter = new Filter({
			header: "Miscellaneous",
			cnHeader: "杂项",
			items: ["基础种族", "关键种族", "Lineage", "修改副本", "重印", "传奇", "有图片", "有简介"],
			displayFn: it => it === "Lineage" ? "血脉" : it,
			isMiscFilter: true,
			deselFn: PageFilterBase.defaultMiscellaneousDeselFn.bind(PageFilterBase),
		});
	}

	static mutateForFilters (r) {
		this._mutateForFilters_commonSources(r);

		r._fSize = r.size ? [...r.size] : [];
		if (r._fSize.length > 1) r._fSize.push("V");
		r._fSpeed = r.speed ? r.speed.walk ? [r.speed.climb ? "攀爬" : null, r.speed.fly ? "飞行" : null, r.speed.swim ? "游泳" : null, PageFilterRaces.getSpeedRating(r.speed.walk)].filter(it => it) : [PageFilterRaces.getSpeedRating(r.speed)] : [];
		r._fTraits = [
			r.darkvision === 120 ? "增强黑暗视觉" : r.darkvision ? "黑暗视觉" : null,
			r.blindsight ? "盲视" : null,
			r.skillProficiencies ? "技能熟练项" : null,
			r.toolProficiencies ? "工具熟练项" : null,
			r.feats ? "专长" : null,
			r.additionalSpells ? "施法" : null,
			r.armorProficiencies ? "护甲熟练项" : null,
			r.weaponProficiencies ? "武器熟练项" : null,
			r.languageProficiencies ? "语言熟练项" : null,
		].filter(it => it);
		r._fTraits.push(...(r.traitTags || []));
		r._fLangs = PageFilterRaces.getLanguageProficiencyTags(r.languageProficiencies);
		r._fCreatureTypes = r.creatureTypes ? r.creatureTypes.map(it => it.choose || it).flat() : ["类人生物"];
		this._mutateForFilters_commonMisc(r);
		if (r._isBaseRace) r._fMisc.push("基础种族");
		if (r._isBaseRace || !r._isSubRace) r._fMisc.push("关键种族");
		if (r.lineage) r._fMisc.push("血缘");

		const ability = r.ability
			? Renderer.getAbilityData(r.ability, {isOnlyShort: true, isCurrentLineage: r.lineage === "VRGR"})
			: new Renderer._AbilityData({asTextShort: "无"});
		r._slAbility = ability.asText || ability.asTextShort || VeCt.STR_NONE;
		r._srtAbility = ability.asSortableString;

		if (r.age?.mature != null && r.age?.max != null) r._fAge = [r.age.mature, r.age.max];
		else if (r.age?.mature != null) r._fAge = r.age.mature;
		else if (r.age?.max != null) r._fAge = r.age.max;

		FilterCommon.mutateForFilters_damageVulnResImmunePlayer(r);
		FilterCommon.mutateForFilters_conditionImmunePlayer(r);
	}

	addToFilters (r, isExcluded) {
		if (isExcluded) return;

		this._sourceFilter.addItem(r._fSources);
		this._sizeFilter.addItem(r._fSize);
		this._asiFilter.addItem(r.ability);
		this._baseRaceFilter.addItem(r._baseName);
		this._creatureTypeFilter.addItem(r._fCreatureTypes);
		this._traitFilter.addItem(r._fTraits);
		this._vulnerableFilter.addItem(r._fVuln);
		this._resistFilter.addItem(r._fRes);
		this._immuneFilter.addItem(r._fImm);
		this._conditionImmuneFilter.addItem(r._fCondImm);
		this._ageFilter.addItem(r._fAge);
		this._languageFilter.addItem(r._fLangs);
		this._miscFilter.addItem(r._fMisc);
	}

	async _pPopulateBoxOptions (opts) {
		opts.filters = [
			this._sourceFilter,
			this._asiFilter,
			this._sizeFilter,
			this._speedFilter,
			this._traitFilter,
			this._defenseFilter,
			this._conditionImmuneFilter,
			this._languageFilter,
			this._baseRaceFilter,
			this._creatureTypeFilter,
			this._miscFilter,
			this._ageFilter,
		];
	}

	toDisplay (values, r) {
		return this._filterBox.toDisplay(
			values,
			r._fSources,
			r.ability,
			r._fSize,
			r._fSpeed,
			r._fTraits,
			[
				r._fVuln,
				r._fRes,
				r._fImm,
			],
			r._fCondImm,
			r._fLangs,
			r._baseName,
			r._fCreatureTypes,
			r._fMisc,
			r._fAge,
		);
	}

	static getListAliases (race) {
		return (race.alias || [])
			.map(it => {
				const invertedName = PageFilterRaces.getInvertedName(it);
				return [`"${it}"`, invertedName ? `"${invertedName}"` : false].filter(Boolean);
			})
			.flat()
			.join(",");
	}

	static getInvertedName (name) {
		// convert e.g. "Elf (High)" to "High Elf" for use as a searchable field
		const bracketMatch = /^(.*?) \((.*?)\)$/.exec(name);
		return bracketMatch ? `${bracketMatch[2]} ${bracketMatch[1]}` : null;
	}
}

globalThis.PageFilterRaces = PageFilterRaces;

class ModalFilterRaces extends ModalFilterBase {
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
			modalTitle: `物种`,
			pageFilter: new PageFilterRaces(),
			previewButtonHandler: new ListUiPreviewButtonHandlerStatsFluff({page: UrlUtil.PG_RACES}),
		});
	}

	_getColumnHeaders () {
		const btnMeta = [
			{sort: "name", text: "名称", width: "4"},
			{sort: "ability", text: "能力", width: "4"},
			{sort: "size", text: "体型", width: "2"},
			{sort: "source", text: "来源", width: "1"},
		];
		return ModalFilterBase._getFilterColumnHeaders(btnMeta);
	}

	async _pLoadAllData () {
		return [
			...(await DataLoader.pCacheAndGetAllSite(UrlUtil.PG_RACES)),
			...((await DataUtil.race.loadPrerelease({isAddBaseRaces: false})).race || []),
			...((await DataUtil.race.loadBrew({isAddBaseRaces: false})).race || []),
		];
	}

	_getListItem (pageFilter, race, rI) {
		const eleRow = document.createElement("div");
		eleRow.className = "ve-px-0 ve-w-100 ve-flex-col ve-no-shrink";

		const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_RACES](race);
		const ability = race.ability ? Renderer.getAbilityData(race.ability) : {asTextShort: "无"};
		const size = (race.size || [Parser.SZ_VARIES]).map(sz => Parser.sizeAbvToFull(sz)).join("/");
		const source = Parser.sourceJsonToAbv(race.source);

		eleRow.innerHTML = `<div class="ve-w-100 ve-flex-vh-center ve-lst__row-border veapp__list-row ve-no-select ve-lst__wrp-cells">
			<div class="ve-col-0-5 ve-pl-0 ve-flex-vh-center">${this._isRadio ? `<input type="radio" name="radio" class="ve-no-events">` : `<input type="checkbox" class="ve-no-events">`}</div>

			<div class="ve-col-0-5 ve-px-1 ve-flex-vh-center">
				<div class="ve-ui-list__btn-inline ve-px-2 ve-no-select" title="切换预览（按 Shift 切换信息预览）">[+]</div>
			</div>

			<div class="ve-col-4 ve-px-1 ${race._versionBase_isVersion ? "ve-italic" : ""} ${this._getNameStyle()}">${race._versionBase_isVersion ? `<span class="ve-px-3"></span>` : ""}${race.name}</div>
			<div class="ve-col-4 ve-px-1">${ability.asTextShort}</div>
			<div class="ve-col-2 ve-px-1 ve-text-center">${size}</div>
			<div class="ve-col-1 ve-pl-1 ve-pr-0 ve-flex-h-center ${Parser.sourceJsonToSourceClassname(race.source)}" title="${Parser.sourceJsonToFull(race.source)}">${source}${Parser.sourceJsonToMarkerHtml(race.source, {isList: true})}</div>
		</div>`;

		const btnShowHidePreview = eleRow.firstElementChild.children[1].firstElementChild;

		const listItem = new ListItem({
			id: rI,
			ele: eleRow,
			name: race.name,
			values: {
				source,
				sourceJson: race.source,
				...ListItem.getCommonValues(race),
				ability: ability.asTextShort,
				size,
				cleanName: PageFilterRaces.getInvertedName(race.name) || "",
				alias: PageFilterRaces.getListAliases(race),
				ENG_name: race.ENG_name,
				ENG_hash: UrlUtil.autoEncodeEngHash(race),
			},
			data: {
				hash,
				page: race.page,
				ability: race._srtAbility,
				cbSel: eleRow.firstElementChild.firstElementChild.firstElementChild,
				btnShowHidePreview,
			},
		});

		this._previewButtonHandler.bindPreviewButton({entity: race, listItem, btnShowHidePreview});

		return listItem;
	}
}

globalThis.ModalFilterRaces = ModalFilterRaces;
