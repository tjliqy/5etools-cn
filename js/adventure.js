import {BookUtil} from "./bookutils.js";

const CONTENTS_URL = "data/adventures.json";

window.addEventListener("load", async () => {
	BookUtil.dispBook = veEs(`#pagecontent`);
	await Promise.all([
		PrereleaseUtil.pInit(),
		BrewUtil2.pInit(),
	]);
	ExcludeUtil.pInitialise().then(null); // don't await, as this is only used for search
	DataUtil.loadJSON(CONTENTS_URL).then(onJsonLoad);
});

async function onJsonLoad (data) {
	BookUtil.allPageUrl = "adventures.html";
	BookUtil.propHomebrewData = "adventureData";
	BookUtil.typeTitle = "Adventure";
	await BookUtil.pInit();

	BookUtil.contentType = "adventure";

	BookUtil.bookIndex = data?.adventure || [];

	veEs(`#page__subtitle`).vee.txt(`请从左侧列表选择一篇冒险`);
	veEs(`.book-loading-message`).vee.txt(`请选择一篇冒险以开始`);

	BookUtil.bookIndexPrerelease = (await PrereleaseUtil.pGetBrewProcessed())?.adventure || [];
	BookUtil.bookIndexBrew = (await BrewUtil2.pGetBrewProcessed())?.adventure || [];

	window.onhashchange = BookUtil.booksHashChange.bind(BookUtil);
	await BookUtil.booksHashChange();
	window.dispatchEvent(new Event("toolsLoaded"));
}
