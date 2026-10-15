import {TableListPage} from "./tablepage.js";

class EncountersPage extends TableListPage {
	constructor () {
		super({
			dataSource: "data/encounters.json",

			dataProps: ["encounter"],

			bookViewOptions: {
				nameSingular: "表格",
				namePlural: "表格",
				pageTitle: "遭遇书视图",
			},
		});
	}

	static _FN_SORT (a, b, o) {
		if (o.sortBy === "name") return SortUtil.ascSortEncounter(a, b);
		if (o.sortBy === "source") return SortUtil.ascSortLower(a.source, b.source) || SortUtil.ascSortEncounter(a, b);
		return 0;
	}

	_getHeaderId (ent) {
		return UrlUtil.encodeForHash([ent.name, ent.source]);
	}

	_getDisplayName (ent) {
		return Renderer.encounters.getDisplayName(ent);
	}

	_getRenderedTable (ent) {
		return RenderEncounters.getRenderedEncounterTable(ent);
	}
}

const encountersPage = new EncountersPage();
window.addEventListener("load", () => encountersPage.pOnLoad());
