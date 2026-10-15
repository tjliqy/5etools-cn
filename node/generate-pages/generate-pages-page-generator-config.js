import {PAGE_GENERATORS_LISTPAGE} from "./generate-pages-page-generator-config-list.js";
import {PAGE_GENERATORS_REDIRECT} from "./generate-pages-page-generator-config-redirect.js";
import {PAGE_GENERATORS_ADVENTURE_BOOK} from "./generate-pages-page-generator-config-advbook.js";
import {PageGeneratorGeneric} from "./generate-pages-page-generator.js";
import {PAGE_GENERATORS_TABLEPAGE} from "./generate-pages-page-generator-config-tablepage.js";
import {PAGE_GENERATORS_MANAGER} from "./generate-pages-page-generator-config-manager.js";
import {PAGE_GENERATORS_SEO_INDEX} from "./generate-pages-page-generator-config-seo.js";
import { I18n } from "i18n";

class _PageGeneratorMaps extends PageGeneratorGeneric {
	_filename = "page/template-page-maps.hbs";
	_page = UrlUtil.PG_MAPS;

	_pageTitle = "地图";
	_pageDescription = "DND 5e 地图浏览工具，包含冒险模组和书籍中的所有地图，支持缩放和标注。";
	_pageKeywords = "DND,5e,地图,冒险模组,地图标注,龙与地下城";
	_navbarDescription = "浏览模组和书籍中的地图。";

	_stylesheets = [
		"maps",
	];

	_scriptsModules = [
		"render-map.js",
		"maps-util.js",
		"maps.js",
	];
}

class _PageGeneratorDmscreen extends PageGeneratorGeneric {
	_filename = "page/template-page-dmscreen.hbs";
	_page = UrlUtil.PG_DM_SCREEN;

	_pageTitle = "DM 帷幕";
	_pageDescription = "DND 5e DM 帷幕工具，帮助地下城主快速查阅规则、怪物数据和随机表格。";
	_pageKeywords = "DND,5e,DM帷幕,地下城主,规则查阅,龙与地下城";
	_navbarDescription = "构筑你个人的 DM 帷幕。";

	_isFontAwesome = true;
	_stylesheets = [
		"dmscreen",
	];

	_scriptsLibAdditional = [
		"peerjs.js",
		"lzma.js",
	];

	_scriptsUtilsAdditional = [
		"utils-list.js",
		"utils-p2p.js",
	];

	_scriptsModules = [
		"render-map.js",
		"dmscreen.js",
	];
}

class _PageGeneratorBlocklist extends PageGeneratorGeneric {
	_filename = "page/template-page-blocklist.hbs";
	_page = "blocklist.html";
	_isNoIndex = true;
	_isExcludedFromSitemap = true;

	_pageTitle = "内容黑名单";
	_pageDescription = "DND 5e 内容黑名单管理工具，用于屏蔽不需要的数据源和内容。";
	_pageKeywords = "DND,5e,黑名单,内容管理,数据源,龙与地下城";
	_navbarDescription = "拉黑内容及导出配置。";

	_scripts = [
		"blocklist-ui.js",
		"blocklist.js",
	];
}

class _PageGeneratorAiGuide extends PageGeneratorGeneric {
	_filename = "page/template-page-ai-guide.hbs";
	_page = "ai-guide.html";
	_isNoIndex = true;
	_isExcludedFromSitemap = true;

	_pageTitle = "AI 导览";
	_pageDescription = "5etools 中文站 AI 导览页，帮助大语言模型与问答系统快速理解本站的主要栏目、内容范围与高价值入口。";
	_pageKeywords = "5etools,AI导览,llms,LLM,DND,5e,龙与地下城";
	_navbarDescription = "为 AI 抓取器、摘要系统和知识检索准备的站点入口说明。";
}

class _PageGeneratorChangelog extends PageGeneratorGeneric {
	_filename = "page/template-page-changelog.hbs";
	_page = "changelog.html";

	_pageTitle = "更新日志";
	_pageDescription = "DND 5e 资料站更新日志，记录所有数据更新和功能改进。";
	_pageKeywords = "DND,5e,更新日志,版本更新,龙与地下城";
	_navbarDescription = "看看改了什么。";

	_stylesheets = [
		"changelog",
	];

	_scriptsUtilsAdditional = [
		"utils-changelog.js",
	];

	_scripts = [
		"changelog.js",
	];
}

class _PageGeneratorConverter extends PageGeneratorGeneric {
	_filename = "page/template-page-converter.hbs";
	_page = "converter.html";

	_pageTitle = "文本转换器";
	_pageDescription = "DND 5e 文本转换工具，支持将各种格式的文本转换为 JSON 格式。";
	_pageKeywords = "DND,5e,文本转换器,JSON,格式转换,龙与地下城";
	_navbarDescription = "在左侧输入文本，点击”转换”，复制右侧的Json。";

	_stylesheets = [
		"converter",
	];

	_scriptsLibAdditional = [
		"ace.js",
	];

	_scriptsRenderAdditional = [
		"render-markdown.js",
		"render-bbcode.js",
	];

	_scriptsModules = [
		"converter.js",
	];
}

class _PageGeneratorCrcalculator extends PageGeneratorGeneric {
	_filename = "page/template-page-crcalculator.hbs";
	_page = "crcalculator.html";

	_pageTitle = "CR 计算器 (5e/2014)";
	_pageDescription = "DND 5e CR 计算器，帮助 DM 快速计算自定义怪物的挑战等级和经验值。";
	_pageKeywords = "DND,5e,CR计算器,挑战等级,自定义怪物,龙与地下城";
	_navbarDescription = "轻松地构筑自定义生物。";

	_stylesheets = [
		"crcalculator",
	];

	_scriptsModules = [
		"crcalculator.js",
	];
}

class _PageGeneratorIndex extends PageGeneratorGeneric {
	_filename = "page/template-page-index.hbs";
	_page = "index.html";
	_pageDescription = "《龙与地下城 DND》中文资料站";

	_navbarTitleHtml = `5e<span>tools</span>`;
	_navbarDescription = "为中文《龙与地下城》（DND 5E/5R）玩家和地下城主而生的工具资料站。";
	_navbarPageTitleStyleAdditional = "page__title--home";

	_isFontAwesome = true;
	_stylesheets = [
		"index",
	];

	_scriptsModules = [
		"index.js",
	];
}

class _PageGeneratorInittrackerplayerview extends PageGeneratorGeneric {
	_filename = "page/template-page-inittrackerplayerview.hbs";
	_page = "inittrackerplayerview.html";

	_isNoIndex = true;
	_isExcludedFromSitemap = true;

	_pageTitle = "先攻追踪器玩家视图";
	_pageDescription = "DND 5e 先攻追踪器玩家视图，用于战斗中追踪先攻顺序和回合。";
	_pageKeywords = "DND,5e,先攻追踪器,战斗,回合,龙与地下城";
	_navbarDescription = "按<kbd>f</kbd>切换全屏，祝你好运！";

	_stylesheets = [
		"inittrackerplayerview",
	];

	_scriptsLibAdditional = [
		"peerjs.js",
		"lzma.js",
	];

	_scriptsUtilsAdditional = [
		"utils-p2p.js",
	];

	_scriptsModules = [
		"inittrackerplayerview.js",
	];
}

class _PageGeneratorLangdemo extends PageGeneratorGeneric {
	_filename = "page/template-page-langdemo.hbs";
	_page = "langdemo.html";
	_isNoIndex = true;
	_isExcludedFromSitemap = true;

	_pageTitle = "RoLang 演示";
	_navbarDescription = "编辑输入内容和上下文，然后点击运行。";

	_stylesheets = [
		"langdemo",
	];

	_scriptsRenderAdditional = [
		"render-markdown.js",
		"render-card.js",
	];

	_scriptsLibAdditional = [
		"ace.js",
	];

	_scriptsModules = [
		"langdemo.js",
		"rolang.js",
	];
}

class _PageGeneratorLifegen extends PageGeneratorGeneric {
	_filename = "page/template-page-lifegen.hbs";
	_page = "lifegen.html";

	_pageTitle = "这是你的人生";
	_pageDescription = "DND 5e 人生生成器，随机生成角色的背景故事和人生经历。";
	_pageKeywords = "DND,5e,人生生成器,背景故事,角色经历,龙与地下城";
	_navbarDescription = "填写生成参数，然后点击生成。";

	_stylesheets = [
		"lifegen",
	];

	_scriptsModules = [
		"lifegen.js",
	];
}

class _PageGeneratorLootgen extends PageGeneratorGeneric {
	_filename = "page/template-page-lootgen.hbs";
	_page = "lootgen.html";

	_pageTitle = "战利品生成器";
	_pageDescription = "DND 5e 战利品生成器，根据 CR 和遭遇类型随机生成战利品和金币。";
	_pageKeywords = "DND,5e,战利品生成器,随机战利品,金币,龙与地下城";
	_navbarDescription = "配置生成器, 然后掷骰生成战利品！";

	_stylesheets = [
		"lootgen-bundle",
	];

	_scriptsUtilsAdditional = [
		"filter-common.js",
		"filter-items.js",
		"filter-spells.js",
	];

	_scriptsModules = [
		"lootgen.js",
	];
}

class _PageGeneratorMakebrew extends PageGeneratorGeneric {
	_filename = "page/template-page-makebrew.hbs";
	_page = "makebrew.html";
	_isNoIndex = true;
	_isExcludedFromSitemap = true;

	_pageTitle = I18nUtil.get("page.makebrew.title");
	_navbarDescription = I18nUtil.get("page.makebrew.subtitle");

	_stylesheets = [
		"makebrew",
	];

	_scriptsRenderAdditional = [
		"render-markdown.js",
	];

	_scriptsUtilsAdditional = [
		"filter-spells.js",
	];

	_scriptsModules = [
		"makebrew.js",
	];
}

class _PageGeneratorMakecards extends PageGeneratorGeneric {
	_filename = "page/template-page-makecards.hbs";
	_page = "makecards.html";
	_isNoIndex = true;
	_isExcludedFromSitemap = true;

	_pageTitle = "RPG 卡片 JSON 构建器";
	_navbarDescription = "创建并导出卡片 JSON 数据。";

	_stylesheets = [
		"makecards",
	];

	_scriptsLibAdditionalRemote = [
		"https://rpg-cards.vercel.app/js/icons.js",
	];

	_scriptsRenderAdditional = [
		"render-card.js",
	];

	_scriptsUtilsAdditional = [
		"filter-common.js",
		"filter-bestiary.js",
		"filter-items.js",
		"filter-spells.js",
		"filter-races.js",
		"filter-backgrounds.js",
		"filter-feats.js",
		"filter-optionalfeatures.js",
	];

	_scripts = [
		"makecards.js",
	];
}

class _PageGeneratorPlutonium extends PageGeneratorGeneric {
	_filename = "page/template-page-plutonium.hbs";
	_page = "plutonium.html";

	_pageTitle = "Plutonium 功能";
	_navbarDescription = "了解 5etools 与 Foundry VTT 的集成功能。";

	_stylesheets = [
		"plutonium",
	];

	_scriptsModules = [
		"plutonium.js",
	];
}

class _PageGeneratorPrivacyPolicy extends PageGeneratorGeneric {
	_filename = "page/template-page-privacy-policy.hbs";
	_page = "privacy-policy.html";

	_pageTitle = "隐私政策";
	_navbarDescription = `点击“接受”即可。`;

	_scripts = [
		"privacy-policy.js",
	];
}

class _PageGeneratorRenderdemo extends PageGeneratorGeneric {
	_filename = "page/template-page-renderdemo.hbs";
	_page = "renderdemo.html";
	_isNoIndex = true;
	_isExcludedFromSitemap = true;

	_pageTitle = "渲染器演示";
	_navbarDescription = "编辑左侧的 JSON，在右侧查看渲染结果。";

	_stylesheets = [
		"renderdemo",
	];

	_scriptsRenderAdditional = [
		"render-markdown.js",
		"render-card.js",
	];

	_scriptsLibAdditional = [
		"ace.js",
	];

	_scriptsModules = [
		"renderdemo.js",
	];
}

class _PageGeneratorSearch extends PageGeneratorGeneric {
	_filename = "page/template-page-search.hbs";
	_page = "search.html";
	_isNoIndex = true;
	_isExcludedFromSitemap = true;

	_pageTitle = "搜索";
	_pageDescription = "DND 5e 站内搜索工具，快速查找法术、怪物、物品和规则。";
	_pageKeywords = "DND,5e,搜索,法术查找,怪物查找,龙与地下城";
	_navbarDescription = "在你浏览器之中的搜索引擎。";

	_stylesheets = [
		"search",
	];

	_scriptsModules = [
		"search.js",
	];
}

class _PageGeneratorTrpgcard extends PageGeneratorGeneric {
	_filename = "page/template-page-trpgcard.hbs";
	_page = "trpgcard.html";

	_pageTitle = "车卡工具";
	_pageDescription = "内嵌 TRPG Card 的 DND 车卡工具页面。";
	_navbarDescription = "内嵌的 TRPG 车卡工具。";
}

class _PageGeneratorStatgen extends PageGeneratorGeneric {
	_filename = "page/template-page-statgen.hbs";
	_page = "statgen.html";

	_pageTitle = "属性生成器";
	_pageDescription = "DND 5e 属性生成器，支持标准数组、掷骰和点数购买等多种属性生成方式。";
	_pageKeywords = "DND,5e,属性生成器,标准数组,掷骰,点数购买,龙与地下城";
	_navbarDescription = "在左侧选择生成方式, 参考右侧的生成方法。";

	_isFontAwesome = true;
	_stylesheets = [
		"statgen-bundle",
	];

	_scriptsUtilsAdditional = [
		"filter-common.js",
		"filter-races.js",
		"filter-backgrounds.js",
		"filter-feats.js",
	];

	_scriptsModules = [
		"statgen.js",
	];
}

export const PAGE_GENERATORS = 	[
	...PAGE_GENERATORS_LISTPAGE,
	...PAGE_GENERATORS_REDIRECT,
	...PAGE_GENERATORS_ADVENTURE_BOOK,
	...PAGE_GENERATORS_TABLEPAGE,
	...PAGE_GENERATORS_MANAGER,
	...PAGE_GENERATORS_SEO_INDEX,

	new _PageGeneratorMaps(),
	new _PageGeneratorDmscreen(),
	new _PageGeneratorBlocklist(),
	new _PageGeneratorAiGuide(),
	new _PageGeneratorChangelog(),
	new _PageGeneratorConverter(),
	new _PageGeneratorCrcalculator(),
	new _PageGeneratorIndex(),
	new _PageGeneratorInittrackerplayerview(),
	new _PageGeneratorLangdemo(),
	new _PageGeneratorLifegen(),
	new _PageGeneratorLootgen(),
	new _PageGeneratorMakebrew(),
	new _PageGeneratorMakecards(),
	new _PageGeneratorPlutonium(),
	new _PageGeneratorPrivacyPolicy(),
	new _PageGeneratorRenderdemo(),
	new _PageGeneratorSearch(),
	new _PageGeneratorTrpgcard(),
	new _PageGeneratorStatgen(),
];
