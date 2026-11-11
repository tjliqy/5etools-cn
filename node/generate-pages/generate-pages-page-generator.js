import Handlebars from "handlebars";
import fs from "fs";
import {HtmlGeneratorListButtons} from "./generate-pages-html-generator.js";

/** @abstract */
export class PageGeneratorBase {
	_filename;
	_page;

	_pageTitle;
	_pageDescription;
	_pageKeywords;
	_navbarTitle;
	_navbarTitleHtml;
	_navbarDescription;
	_navbarDescriptionHtml;
	_navbarPageTitleStyleAdditional;
	_isFontAwesome = false;
	_stylesheets;
	_isNoIndex = false;
	_isExcludedFromSitemap = false;

	static _SITE_URL = "https://5e.kiwee.top/";
	static _SITE_NAME = "5etools";
	static _SITE_ALT_NAME = "龙与地下城中文资料站 - 5etools";
	static _BAIDU_TONGJI_ID = process.env.BAIDU_TONGJI_ID || null;
	static _ICP_BEIAN = process.env.ICP_BEIAN || null;

	init () {
		this._registerPartials();
		return this;
	}

	_registerPartial ({ident, filename}) {
		Handlebars.registerPartial(ident, this.constructor._getLoadedSource({filename}));
	}

	_registerPartials () {
		this._registerPartial({ident: "head", filename: "head/template-head.hbs"});

		this._registerPartial({ident: "adLhs", filename: "ad/template-ad-lhs.hbs"});
		this._registerPartial({ident: "adLhsScrollingPage", filename: "ad/template-ad-lhs--scrolling-page.hbs"});
		this._registerPartial({ident: "adRhs", filename: "ad/template-ad-rhs.hbs"});
		this._registerPartial({ident: "adRhsScrollingPage", filename: "ad/template-ad-rhs--scrolling-page.hbs"});
		this._registerPartial({ident: "adLeaderboard", filename: "ad/template-ad-leaderboard.hbs"});
		this._registerPartial({ident: "adMobile1", filename: "ad/template-ad-mobile-1.hbs"});
		this._registerPartial({ident: "adFooter", filename: "ad/template-ad-footer.hbs"});

		this._registerPartial({ident: "navbar", filename: "navbar/template-navbar.hbs"});

		this._registerPartial({ident: "scripts", filename: "scripts/template-scripts.hbs"});

		this._registerPartial({ident: "footer", filename: "misc/template-footer.hbs"});

		this._registerPartial({ident: "blank", filename: "misc/template-blank.hbs"});
		this._registerPartial({ident: "btngroupManager", filename: "misc/template-btngroup-manager.hbs"});
		this._registerPartial({ident: "overlayNoise", filename: "misc/template-overlay-noise.hbs"});
	}

	getPage () { return this._page; }
	isNoIndex () { return this._isNoIndex; }
	isExcludedFromSitemap () { return this._isExcludedFromSitemap; }

	/**
	 * @abstract
	 * @return {object}
	 */
	_getData () {
		const canonicalPath = this._page === "index.html" ? "" : this._page;
		const canonicalUrl = `${this.constructor._SITE_URL}${canonicalPath}`;

		return {
			page: this._page,
			pageTitle: this._pageTitle,
			pageDescription: this._pageDescription,
			pageKeywords: this._pageKeywords,
			canonicalUrl,
			navbarTitle: this._navbarTitle ?? this._pageTitle,
			navbarTitleHtml: this._navbarTitleHtml,
			navbarDescription: this._navbarDescription,
			navbarDescriptionHtml: this._navbarDescriptionHtml,
			navbarPageTitleStyleAdditional: this._navbarPageTitleStyleAdditional,
			isFontAwesome: this._isFontAwesome,
			stylesheets: this._stylesheets,
			isNoIndex: this._isNoIndex,
			jsonLd: this._getJsonLd({canonicalUrl}),
			baiduTongjiId: this.constructor._BAIDU_TONGJI_ID,
			icpBeian: this.constructor._ICP_BEIAN,
		};
	}

	_getSchemaType () { return "WebPage"; }

	_getPageTitleFull () {
		return this._pageTitle
			? `${this._pageTitle} - ${this.constructor._SITE_NAME}`
			: this.constructor._SITE_ALT_NAME;
	}

	_getBreadcrumbItems ({canonicalUrl}) {
		const out = [{
			"@type": "ListItem",
			position: 1,
			name: "首页",
			item: this.constructor._SITE_URL,
		}];

		if (canonicalUrl !== this.constructor._SITE_URL) {
			out.push({
				"@type": "ListItem",
				position: 2,
				name: this._pageTitle || this.constructor._SITE_NAME,
				item: canonicalUrl,
			});
		}

		return out;
	}

	_getJsonLdEntity ({canonicalUrl}) {
		return {
			"@type": this._getSchemaType(),
			name: this._getPageTitleFull(),
			description: this._pageDescription,
			url: canonicalUrl,
			inLanguage: "zh-CN",
			isPartOf: {
				"@type": "WebSite",
				name: this.constructor._SITE_NAME,
				url: this.constructor._SITE_URL,
			},
		};
	}

	_getJsonLd ({canonicalUrl}) {
		const pageEntity = this._getJsonLdEntity({canonicalUrl});

		const graph = [
			pageEntity,
			{
				"@type": "BreadcrumbList",
				itemListElement: this._getBreadcrumbItems({canonicalUrl}),
			},
		];

		if (this._page === "index.html") {
			graph.unshift(
				{
					"@type": "Organization",
					name: this.constructor._SITE_NAME,
					url: this.constructor._SITE_URL,
				},
				{
					"@type": "WebSite",
					name: this.constructor._SITE_NAME,
					alternateName: "龙与地下城中文资料站",
					url: this.constructor._SITE_URL,
					inLanguage: "zh-CN",
					potentialAction: {
						"@type": "SearchAction",
						target: `${this.constructor._SITE_URL}search.html?{searchTerms}`,
						"query-input": "required name=searchTerms",
					},
				},
			);
		}

		return `<script type="application/ld+json">${JSON.stringify({
			"@context": "https://schema.org",
			"@graph": graph,
		}).replace(/<\/script/gi, "<\\/script")}</script>`;
	}

	generatePage () {
		const template = Handlebars.compile(this.constructor._getLoadedSource({filename: this._filename}));
		const rendered = template(this._getData())
			.split("\n")
			.map(l => l.trimEnd())
			.join("\n");

		if (this._page.includes("/")) {
			const parentDir = this._page.split("/").slice(0, -1).join("/");
			fs.mkdirSync(parentDir, {recursive: true});
		}

		fs.writeFileSync(this._page, rendered, "utf-8");
	}

	static _getLoadedSource ({filename}) {
		return fs.readFileSync(`./node/generate-pages/template/${filename}`, "utf-8");
	}
}

export class PageGeneratorRedirectBase extends PageGeneratorBase {
	_filename = "page/template-page-redirect.hbs";
	_isNoIndex = true;
	_isExcludedFromSitemap = true;

	_redirectHref;
	_redirectMessage;

	_getData () {
		const redirectCanonicalUrl = `https://5e.kiwee.top/${this._redirectHref}`;

		return {
			...super._getData(),

			canonicalUrl: redirectCanonicalUrl,
			redirectHref: this._redirectHref,
			redirectMessage: this._redirectMessage,
		};
	}
}

/** @abstract */
export class PageGeneratorGeneric extends PageGeneratorBase {
	_scriptsLibAdditional;
	_scriptsLibAdditionalRemote;
	_scriptsUtilsAdditional;
	_scriptsRenderAdditional;
	_scripts;
	_scriptsModules;

	_getData () {
		return {
			...super._getData(),

			scriptsLibAdditional: this._scriptsLibAdditional,
			scriptsLibAdditionalRemote: this._scriptsLibAdditionalRemote,
			scriptsUtilsAdditional: this._scriptsUtilsAdditional,
			scriptsRenderAdditional: this._scriptsRenderAdditional,
			scripts: this._scripts,
			scriptsModules: this._scriptsModules,
		};
	}
}

export class PageGeneratorListBase extends PageGeneratorGeneric {
	_filename = "list/template-list.hbs";

	_navbarDescription = "用左侧的名称搜索，点击选项名称以在右侧显示。";

	_isStyleBook = false;
	_scriptIdentList;
	_scriptsPrePageAdditional;
	_isHasRenderer = true; // TODO(Future) only used in the Classes page -- refactor class rendering to own file
	_isHasFilter = true;
	_isModule = false;
	_isMultisource = false;
	_btnsList;
	_btnsSublist;
	_isWrpToken;
	_styleListContainerAdditional;
	_styleContentWrapperAdditional;
	_stylePageContentAdditional;
	_isTableView = false;
	_isHideManager = false;

	_getSchemaType () { return "CollectionPage"; }

	_registerPartials () {
		super._registerPartials();

		this._registerPartial({ident: "listListcontainer", filename: "list/template-list-listcontainer.hbs"});
		this._registerPartial({ident: "listFilterSearchGroup", filename: "list/template-list-filter-search-group.hbs"});
		this._registerPartial({ident: "listFiltertools", filename: "list/template-list-filtertools.hbs"});
		this._registerPartial({ident: "listList", filename: "list/template-list-list.hbs"});

		this._registerPartial({ident: "listContentwrapper", filename: "list/template-list-contentwrapper.hbs"});
		this._registerPartial({ident: "listSublistContainer", filename: "list/template-list-sublist-container.hbs"});
		this._registerPartial({ident: "listSublist", filename: "list/template-list-sublist.hbs"});
		this._registerPartial({ident: "listSublistsort", filename: "list/template-list-sublistsort.hbs"});
		this._registerPartial({ident: "listStatsTabs", filename: "list/template-list-stats-tabs.hbs"});
		this._registerPartial({ident: "listWrpPagecontent", filename: "list/template-list-wrp-pagecontent.hbs"});
		this._registerPartial({ident: "listRhsWrpFooterControls", filename: "list/template-list-rhs-wrp-footer-controls.hbs"});
	}

	/**
	 * @return {object}
	 */
	_getData () {
		const data = super._getData();
		return {
			...data,

			scripts: [
				"listpage.js",
				...(this._isMultisource ? ["multisource.js"] : []),
				...(
					this._isHasFilter
						? [
							"filter-common.js",
							`filter-${this._scriptIdentList}.js`,
						]
						: []
				),
				...(this._scriptsPrePageAdditional || []),
				...(this._isModule ? [] : [`${this._scriptIdentList}.js`]),
				...data.scripts || [],
			],

			scriptsModules: [
				...(this._isModule ? [`${this._scriptIdentList}.js`] : []),
				...data.scriptsModules || [],
			],

			scriptsUtilsAdditional: [
				"utils-list.js",
				...data.scriptsUtilsAdditional || [],
			],

			scriptsRenderAdditional: [
				"render-markdown.js",
				"render-bbcode.js",
				...(this._isHasRenderer ? [`render-${this._scriptIdentList}.js`] : []),
				...data.scriptsRenderAdditional || [],
			],

			btnsList: this._btnsList,
			btnsSublist: this._btnsSublist,
			isWrpToken: this._isWrpToken,
			isStyleBook: this._isStyleBook,
			styleListContainerAdditional: this._styleListContainerAdditional,
			styleContentWrapperAdditional: this._styleContentWrapperAdditional,
			stylePageContentAdditional: this._stylePageContentAdditional,
			identPartialListListcontainer: "listListcontainer",
			identPartialListContentwrapper: "listContentwrapper",
			identPartialListSublistContainer: "listSublistContainer",
			isTableView: this._isTableView,
			isHideManager: this._isHideManager,
			isHasFilter: this._isHasFilter,
		};
	}
}

export class PageGeneratorAdventureBookBase extends PageGeneratorGeneric {
	_filename = "advbook/template-advbook.hbs";

	_scriptIdentAdvBook;
	_advBookPlaceholder;

	_scriptsRenderAdditional = [
		"render-markdown.js",
	];

	_scriptsModules = [
		"render-map.js",
	];

	_getSchemaType () { return "Article"; }

	_getData () {
		const data = super._getData();
		return {
			...data,

			advBookPlaceholder: this._advBookPlaceholder,

			scriptsModules: [
				...data.scriptsModules || [],
				"bookutils.js",
				`${this._scriptIdentAdvBook}.js`,
			],
		};
	}
}

export class PageGeneratorAdventuresBooksBase extends PageGeneratorGeneric {
	_filename = "advbook/template-advsbooks.hbs";

	_scriptIdentAdvsBooks;
	_searchName;
	_btnsList;

	_getSchemaType () { return "CollectionPage"; }

	_getData () {
		const data = super._getData();
		return {
			...data,

			searchName: this._searchName,
			btnsList: this._btnsList,

			scriptsModules: [
				...data.scriptsModules || [],
				"bookutils.js",
				"bookslist.js",
				`${this._scriptIdentAdvsBooks}.js`,
			],
		};
	}
}

export class PageGeneratorTablepageBase extends PageGeneratorListBase {
	_stylesheets = [
		"list-page--grouped",
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "12", sortIdent: "name", text: "Name"}),
	];

	_isHasFilter = false;
	_isStyleBook = true;
	_isHideManager = true;
	_stylePageContentAdditional = "ve-stats--book-large";
	_styleListContainerAdditional = "ve-flex-3";
	_styleContentWrapperAdditional = "ve-flex-7";

	_registerPartials () {
		super._registerPartials();

		this._registerPartial({ident: "listListcontainerTablepage", filename: "list/template-list-listcontainer--tablepage.hbs"});
	}

	_getData () {
		const data = super._getData();
		return {
			...data,

			scripts: [
				"listpage.js",
			],

			identPartialListListcontainer: "listListcontainerTablepage",
		};
	}
}

export class PageGeneratorManagerBase extends PageGeneratorGeneric {
	_filename = "manager/template-manager.hbs";

	_scriptsRenderAdditional = [
		"render-markdown.js",
		"render-bbcode.js",
	];

	_scriptsUtilsAdditional = [
		"utils-list.js",
	];

	_getSchemaType () { return "CollectionPage"; }
}

export class PageGeneratorSeoIndexBase extends PageGeneratorGeneric {
	_filename = "seo/template-seo-index.hbs";

	_getSchemaType () { return "CollectionPage"; }

	_registerPartials () {
		super._registerPartials();

		this._registerPartial({ident: "seoHeadInner", filename: "seo/template-seo-index-head-inner.hbs"});
		this._registerPartial({ident: "seoBody", filename: "seo/template-seo-index-body.hbs"});
	}
}
