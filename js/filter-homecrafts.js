"use strict";

class PageFilterHomeCrafts extends PageFilterBase {
	static _SKILL_LEVELS = ["B", "I", "A"];

	static _ascSortSkillLevelFilter (a, b) {
		const aSort = this._SKILL_LEVELS.indexOf(a.item);
		const bSort = this._SKILL_LEVELS.indexOf(b.item);
		return SortUtil.ascSort(~aSort ? aSort : Number.MAX_SAFE_INTEGER, ~bSort ? bSort : Number.MAX_SAFE_INTEGER);
	}

	/* ----- */

	static _PROP_TO_ABV = {
		"crochetPattern": "CP",
	};

	static getTypeAbbreviation (prop) {
		if (!this._PROP_TO_ABV[prop]) throw new Error(`Unhandled home crafts property "${prop}"!`);
		return this._PROP_TO_ABV[prop];
	}

	/* ----- */

	constructor () {
		super();

		this._typeFilter = new Filter({
			header: "Type",
			cnHeader: "类型",
			items: ["crochetPattern"],
			displayFn: it => Parser.getPropDisplayName(it),
		});
		this._categoryFilter = new Filter({
			header: "Category",
			cnHeader: "分类",
			items: ["钩针玩偶", "可穿戴", "家居物品"],
			displayFn: it => it.toTitleCase(),
		});
		this._skillLevelFilter = new Filter({
			header: "Skill Level",
			cnHeader: "技能水平",
			items: [...PageFilterHomeCrafts._SKILL_LEVELS],
			displayFn: it => Parser.crochetPatternSkilLevelToFull(it),
			itemSortFn: PageFilterHomeCrafts._ascSortSkillLevelFilter.bind(PageFilterHomeCrafts),
		});
		this._sizeFilterWidth = new RangeFilter({header: "Width", cnHeader: "宽度", min: 1, max: 10, suffix: " 英寸"});
		this._sizeFilterHeight = new RangeFilter({header: "Height", cnHeader: "高度", min: 1, max: 10, suffix: " 英寸"});
		this._sizesFilter = new MultiFilter({
			header: "Sizes",
			cnHeader: "尺寸",
			filters: [this._sizeFilterWidth, this._sizeFilterHeight],
			isAddDropdownToggle: true,
		});
		this._hookFilter = new Filter({
			header: "Hook",
			cnHeader: "钩针型号",
			displayFn: sizeMm => {
				const asMm = `${sizeMm.toFixed(2)} mm`;

				const usSize = Parser.crochetHookMmToUs(sizeMm);
				if (!usSize) return asMm;

				return `${usSize} (${asMm})`;
			},
		});
		this._designerFilter = new Filter({
			header: "Designer",
			cnHeader: "设计师",
		});
		this._miscFilter = new Filter({
			header: "Miscellaneous",
			cnHeader: "其他信息",
			items: ["有图片", "有信息"],
			isMiscFilter: true,
			deselFn: PageFilterBase.defaultMiscellaneousDeselFn.bind(PageFilterBase),
		});
	}

	static mutateForFilters (ent) {
		this._mutateForFilters_commonSources(ent);
		this._mutateForFilters_commonMisc(ent);

		ent._fWidth = (ent.size || []).filter(sz => sz.width?.mm != null).map(sz => Parser.metric.getApproxDisplayInches(sz.width.mm));
		if (!ent._fWidth.length) ent._fWidth = null;
		ent._fHeight = (ent.size || []).filter(sz => sz.height?.mm != null).map(sz => Parser.metric.getApproxDisplayInches(sz.height.mm));
		if (!ent._fHeight.length) ent._fHeight = null;

		ent._fHooks = (ent.hooks || []).flatMap(it => typeof it === "number" ? it : it.hooks).filter(Boolean);
	}

	addToFilters (ent, isExcluded) {
		if (isExcluded) return;

		this._sourceFilter.addItem(ent._fSources);
		this._typeFilter.addItem(ent.__prop);
		this._categoryFilter.addItem(ent.patternType);
		this._skillLevelFilter.addItem(ent.level);
		this._sizeFilterWidth.addItem(ent._fWidth);
		this._sizeFilterHeight.addItem(ent._fHeight);
		this._hookFilter.addItem(ent._fHooks);
		this._designerFilter.addItem(ent.designers);
		this._miscFilter.addItem(ent._fMisc);
	}

	async _pPopulateBoxOptions (opts) {
		opts.filters = [
			this._sourceFilter,
			this._typeFilter,
			this._categoryFilter,
			this._skillLevelFilter,
			this._sizesFilter,
			this._hookFilter,
			this._designerFilter,
			this._miscFilter,
		];
	}

	toDisplay (values, ent) {
		return this._filterBox.toDisplay(
			values,
			ent._fSources,
			ent.__prop,
			ent.patternType,
			ent.level,
			[
				ent._fWidth,
				ent._fHeight,
			],
			ent._fHooks,
			ent.designers,
			ent._fMisc,
		);
	}
}

globalThis.PageFilterHomeCrafts = PageFilterHomeCrafts;
