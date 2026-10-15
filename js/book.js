import {BookUtil} from "./bookutils.js";

const JSON_URL = "data/books.json";

window.addEventListener("load", async () => {
	BookUtil.dispBook = veEs(`#pagecontent`);
	await Promise.all([
		PrereleaseUtil.pInit(),
		BrewUtil2.pInit(),
	]);
	ExcludeUtil.pInitialise().then(null); // don't await, as this is only used for search
	DataUtil.loadJSON(JSON_URL).then(onJsonLoad);
});

async function onJsonLoad (data) {
	BookUtil.allPageUrl = "books.html";
	BookUtil.propHomebrewData = "bookData";
	BookUtil.typeTitle = "Book";
	await BookUtil.pInit();

	BookUtil.contentType = "book";

	BookUtil.bookIndex = data?.book || [];

	veEs(`#page__subtitle`).vee.txt(`请从左侧列表选择一本书`);
	veEs(`.book-loading-message`).vee.txt(`请选择一本书以开始`);

	BookUtil.bookIndexPrerelease = (await PrereleaseUtil.pGetBrewProcessed())?.book || [];
	BookUtil.bookIndexBrew = (await BrewUtil2.pGetBrewProcessed())?.book || [];

	window.onhashchange = BookUtil.booksHashChange.bind(BookUtil);
	await BookUtil.booksHashChange();
	window.dispatchEvent(new Event("toolsLoaded"));
}
