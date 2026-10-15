import {PageGeneratorAdventureBookBase, PageGeneratorAdventuresBooksBase} from "./generate-pages-page-generator.js";
import {HtmlGeneratorListButtons} from "./generate-pages-html-generator.js";

class _PageGeneratorAdventure extends PageGeneratorAdventureBookBase {
	_page = UrlUtil.PG_ADVENTURE;

	_pageTitle = "冒险模组";
	_pageDescription = "DND 5e 冒险模组详情页，包含完整的冒险故事线、地图和遭遇内容。";
	_pageKeywords = "DND,5e,冒险模组,冒险故事,地图,遭遇,龙与地下城";
	_navbarTitle = "冒险详情";
	_navbarDescription = "加载中...";
	_scriptIdentAdvBook = "adventure";
	_advBookPlaceholder = `冒险内容加载中……`;
}

class _PageGeneratorBook extends PageGeneratorAdventureBookBase {
	_page = UrlUtil.PG_BOOK;

	_pageTitle = "出版书籍";
	_pageDescription = "DND 5e 出版书籍详情页，包含玩家手册、地下城主指南等官方书籍内容。";
	_pageKeywords = "DND,5e,出版书籍,玩家手册,地下城主指南,龙与地下城";
	_navbarTitle = "书籍详情";
	_navbarDescription = "加载中...";
	_scriptIdentAdvBook = "book";
}

class _PageGeneratorQuickref extends PageGeneratorAdventureBookBase {
	_page = UrlUtil.PG_QUICKREF;

	_pageTitle = "快速参照 (5e/2014)";
	_navbarTitle = "快速参照 (5e/2014)";
	_navbarDescriptionHtml = "浏览内容。按 <kbd>f</kbd> 查找，按 <kbd>g</kbd> 跳转到页面。";
	_scriptIdentAdvBook = "quickreference";
	_advBookPlaceholder = ``;
}

class _PageGeneratorAdventures extends PageGeneratorAdventuresBooksBase {
	_page = UrlUtil.PG_ADVENTURES;

	_pageTitle = "冒险模组";
	_pageDescription = "DND 5e 冒险模组列表，包含所有官方和第三方冒险模组的名称、等级和内容简介。";
	_pageKeywords = "DND,5e,冒险模组,冒险列表,官方冒险,龙与地下城";
	_navbarTitle = "冒险模组";
	_navbarDescription = "浏览冒险模组的名称与内容。";
	_scriptIdentAdvsBooks = "adventures";
	_searchName = "adventure";

	_btnsList = [
		HtmlGeneratorListButtons.getBtn({width: "1-3", sortIdent: "group", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "5-5", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "2-5", sortIdent: "storyline", text: "故事情节"}),
		HtmlGeneratorListButtons.getBtn({width: "1", sortIdent: "level", text: "等级"}),
		HtmlGeneratorListButtons.getBtn({width: "1", sortIdent: "translator", text: "翻译"}),
		HtmlGeneratorListButtons.getBtn({width: "1-7", sortIdent: "published", text: "出版时间"}),
	];
}

class _PageGeneratorBooks extends PageGeneratorAdventuresBooksBase {
	_page = UrlUtil.PG_BOOKS;

	_pageTitle = "书籍";
	_pageDescription = "DND 5e 书籍列表，包含玩家手册、地下城主指南、怪物手册等所有官方出版书籍。";
	_pageKeywords = "DND,5e,书籍,玩家手册,地下城主指南,怪物手册,龙与地下城";
	_navbarTitle = "书籍";
	_navbarDescription = "浏览书籍的名称和内容。";
	_scriptIdentAdvsBooks = "books";
	_searchName = "book";

	_btnsList = [
		HtmlGeneratorListButtons.getBtn({width: "1-3", sortIdent: "group", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "7-3", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "1-3", sortIdent: "translator", text: "翻译"}),
		HtmlGeneratorListButtons.getBtn({sortIdent: "published", text: "出版时间"}),
	];
}

export const PAGE_GENERATORS_ADVENTURE_BOOK = [
	new _PageGeneratorAdventure(),
	new _PageGeneratorBook(),
	new _PageGeneratorQuickref(),

	new _PageGeneratorAdventures(),
	new _PageGeneratorBooks(),
];
