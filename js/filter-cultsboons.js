"use strict";

class PageFilterCultsBoons extends PageFilterBase {
	constructor () {
		super();

		this._typeFilter = new Filter({
			header: "Type",
			cnHeader: "类型",
			items: ["恶魔恩惠", "异教"],
		});
		this._subtypeFilter = new Filter({
			header: "Subtype",
			cnHeader: "子类",
			items: [],
			displayFn: Parser.CultsBoonsTypeToCN.bind(Parser),
		});
		this._miscFilter = new Filter({
			header: "Miscellaneous",
			cnHeader: "杂项",
			items: ["传奇", "被重制"],
			isMiscFilter: true,
			deselFn: PageFilterBase.defaultMiscellaneousDeselFn.bind(PageFilterBase),
		});
	}

	static mutateForFilters (it) {
		this._mutateForFilters_commonSources(it);
		it._fType = it.__prop === "cult" ? "异教" : it.type ? `${Parser.CultsBoonsTypeToCN(it.type)}恩惠` : "恩惠";
		this._mutateForFilters_commonMisc(it);
	}

	addToFilters (it, isExcluded) {
		if (isExcluded) return;

		this._sourceFilter.addItem(it._fSources);
		this._typeFilter.addItem(it._fType);
		this._subtypeFilter.addItem(it.type);
		this._miscFilter.addItem(it._fMisc);
	}

	async _pPopulateBoxOptions (opts) {
		opts.filters = [
			this._sourceFilter,
			this._typeFilter,
			this._subtypeFilter,
			this._miscFilter,
		];
	}

	toDisplay (values, cb) {
		return this._filterBox.toDisplay(
			values,
			cb._fSources,
			cb._fType,
			cb.type,
			cb._fMisc,
		);
	}
}

globalThis.PageFilterCultsBoons = PageFilterCultsBoons;
