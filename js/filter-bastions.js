"use strict";

class PageFilterBastions extends PageFilterBase {
	constructor () {
		super();

		this._typeFilter = new Filter({
			header: "Type",
			cnHeader: "类型",
			items: ["basic", "special"],
			displayFn: it => it === "basic" ? "基础" : "特殊",
			deselFn: (it) => it === "basic",
		});
		this._levelFilter = new RangeFilter({
			header: "Level",
			cnHeader: "等级",
			isLabelled: true,
			labels: ["\u2014", ...Array.from({length: 20}, (_, i) => i + 1)],
			labelDisplayFn: n => n === "\u2014" ? "无" : n,
		});
		this._prereqFilter = new Filter({
			header: "Prerequisite",
			cnHeader: "先决条件",
			items: [...FilterCommon.PREREQ_FILTER_ITEMS],
			displayFn: function (tag) {
				switch (tag) {
					case "Ability": 	return "属性值";
					case "Expertise": return "专精";
					case "Race": 		return "种族";
					case "Membership": return "成员";
					case "Proficiency": return "熟练";
					case "Spellcasting":return "施法";
					case "Background": return "背景";
					case "Campaign": return "战役";
					case "Feat": return "专长";
					case "Psionics": return "灵能";
					case "Special": return "特殊";
					case "Feature": return "特性";
					case "Species": return "种族";
					case "Spellcasting Focus": return "法器";
					default: return tag;
				}
			},
		});
		this._miscFilter = new Filter({
			header: "Miscellaneous",
			cnHeader: "杂项",
			items: ["有图片", "有简介"],
			isMiscFilter: true,
			deselFn: PageFilterBase.defaultMiscellaneousDeselFn.bind(PageFilterBase),
		});
	}

	static mutateForFilters (ent) {
		this._mutateForFilters_commonSources(ent);
		this._mutateForFilters_commonMisc(ent);

		ent._slPrereq = Renderer.utils.prerequisite.getHtml(ent.prerequisite, {isListMode: true}) || VeCt.STR_NONE;
		ent._fPrereq = FilterCommon.getFilterValuesPrerequisite(ent.prerequisite);
	}

	addToFilters (ent, isExcluded) {
		if (isExcluded) return;

		this._sourceFilter.addItem(ent._fSources);
		this._typeFilter.addItem(ent.type);
		this._levelFilter.addItem(ent.level);
		this._prereqFilter.addItem(ent._fPrereq);
		this._miscFilter.addItem(ent._fMisc);
	}

	async _pPopulateBoxOptions (opts) {
		opts.filters = [
			this._sourceFilter,
			this._typeFilter,
			this._levelFilter,
			this._prereqFilter,
			this._miscFilter,
		];
	}

	toDisplay (values, ent) {
		return this._filterBox.toDisplay(
			values,
			ent._fSources,
			ent.facilityType,
			ent.level,
			ent._fPrereq,
			ent._fMisc,
		);
	}
}

globalThis.PageFilterBastions = PageFilterBastions;
