import {PageGeneratorListBase} from "./generate-pages-page-generator.js";
import {HtmlGeneratorListButtons} from "./generate-pages-html-generator.js";

class _PageGeneratorListActions extends PageGeneratorListBase {
	_page = UrlUtil.PG_ACTIONS;
	_pageTitle = "动作";
	_pageDescription = "DND 5e 动作列表，包含攻击、施法、冲刺、躲避等所有标准动作和特殊动作的详细说明。";
	_pageKeywords = "DND,5e,动作,攻击,施法,冲刺,躲避,龙与地下城";
	_scriptIdentList = "actions";
	_isHasRenderer = false;

	_isModule = true;

	_btnsList = [
		HtmlGeneratorListButtons.getBtnPreviewToggle(),
		HtmlGeneratorListButtons.getBtn({width: "5-7", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "4", sortIdent: "time", text: "时间"}),
		HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "8", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "4", sortIdent: "time", text: "时间"}),
	];
}

class _PageGeneratorListBackgrounds extends PageGeneratorListBase {
	_page = UrlUtil.PG_BACKGROUNDS;
	_pageTitle = "背景故事";
	_pageDescription = "DND 5e 背景故事列表，包含侍僧、罪犯、民间英雄、贵族等所有官方背景及其属性加成和技能熟练。";
	_pageKeywords = "DND,5e,背景故事,侍僧,罪犯,民间英雄,贵族,龙与地下城";
	_scriptIdentList = "backgrounds";
	_isHasRenderer = false;

	_isModule = true;

	_btnsList = [
		HtmlGeneratorListButtons.getBtn({width: "2-5", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "3-5", sortIdent: "ability", text: "属性值"}),
		HtmlGeneratorListButtons.getBtn({width: "4", sortIdent: "skills", text: "技能熟练"}),
		HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "3", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "5", sortIdent: "ability", text: "属性值"}),
		HtmlGeneratorListButtons.getBtn({width: "4", sortIdent: "skills", text: "技能"}),
	];
}

class _PageGeneratorListBestiary extends PageGeneratorListBase {
	_page = UrlUtil.PG_BESTIARY;
	_pageTitle = "怪物图鉴";
	_pageDescription = "DND 5e 怪物图鉴，包含数千种怪物的详细数据、属性、技能和特殊能力，支持CR筛选和多数据源。";
	_pageKeywords = "DND,5e,怪物图鉴,怪物,CR,挑战等级,龙与地下城";

	_stylesheets = [
		"bestiary",
		"encounterbuilder-bundle",
	];

	_scriptIdentList = "bestiary";
	_isHasRenderer = false;

	_scriptsUtilsAdditional = [
		"utils-tableview.js",
	];

	_isModule = true;
	_isMultisource = true;
	_isWrpToken = true;

	_btnsList = [
		HtmlGeneratorListButtons.getBtn({width: "4-2", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "4-1", sortIdent: "type", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "1-7", sortIdent: "cr", text: "CR"}),
		HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "5", sortIdent: "name", text: "名称"}),

		HtmlGeneratorListButtons.getBtn({width: "3-8", classListAdditional: ["best-ecgen__hidden"], sortIdent: "type", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "3-8", classListAdditional: ["best-ecgen__visible"], isDisabled: true, text: "&nbsp;"}),

		HtmlGeneratorListButtons.getBtn({width: "1-2", sortIdent: "cr", text: "CR"}),
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "count", text: "数量"}),
	];

	_registerPartials () {
		super._registerPartials();

		this._registerPartial({
			ident: "listContentwrapperBestiary",
			filename: "list/template-list-contentwrapper--bestiary.hbs",
		});

		this._registerPartial({
			ident: "listSublistContainerBestiary",
			filename: "list/template-list-sublist-container--bestiary.hbs",
		});
	}

	_getData () {
		return {
			...super._getData(),
			identPartialListContentwrapper: "listContentwrapperBestiary",
		};
	}

	_isTableView = true;
}

class _PageGeneratorListCharCreationOptions extends PageGeneratorListBase {
	_page = UrlUtil.PG_CHAR_CREATION_OPTIONS;
	_pageTitle = "其他角色创建选项";
	_pageDescription = "DND 5e 其他角色创建选项，包含宿命、恩赐、起源等额外角色创建规则和选项。";
	_pageKeywords = "DND,5e,角色创建,宿命,恩赐,起源,龙与地下城";
	_scriptIdentList = "charcreationoptions";

	_btnsList = [
		HtmlGeneratorListButtons.getBtn({width: "5", sortIdent: "type", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "5", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "5", sortIdent: "type", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "7", sortIdent: "name", text: "名称"}),
	];
}

class _PageGeneratorListConditionsDiseases extends PageGeneratorListBase {
	_page = UrlUtil.PG_CONDITIONS_DISEASES;
	_pageTitle = "状态 & 疾病";
	_pageDescription = "DND 5e 状态与疾病列表，包含目盲、魅惑、恐惧、中毒等所有状态效果和疾病的详细规则说明。";
	_pageKeywords = "DND,5e,状态,疾病,目盲,魅惑,恐惧,中毒,龙与地下城";
	_scriptIdentList = "conditionsdiseases";
	_isHasRenderer = false;

	_isModule = true;

	_btnsList = [
		HtmlGeneratorListButtons.getBtnPreviewToggle(),
		HtmlGeneratorListButtons.getBtn({width: "3", sortIdent: "type", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "6-7", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "type", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "10", sortIdent: "name", text: "名称"}),
	];
}

class _PageGeneratorListCultsBoons extends PageGeneratorListBase {
	_page = UrlUtil.PG_CULTS_BOONS;
	_pageTitle = "异教 & 超自然赠礼";
	_pageDescription = "DND 5e 异教与超自然赠礼列表，包含各种邪教组织和它们赐予追随者的超自然能力。";
	_pageKeywords = "DND,5e,异教,超自然赠礼,邪教,龙与地下城";
	_scriptIdentList = "cultsboons";

	_btnsList = [
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "type", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "subType", text: "子类"}),
		HtmlGeneratorListButtons.getBtn({width: "6", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "type", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "subType", text: "子类"}),
		HtmlGeneratorListButtons.getBtn({width: "8", sortIdent: "name", text: "名称"}),
	];
}

class _PageGeneratorListDecks extends PageGeneratorListBase {
	_page = UrlUtil.PG_DECKS;
	_pageTitle = "牌组";
	_pageDescription = "DND 5e 牌组列表，包含塔罗牌、占卜牌等各类魔法牌组的详细效果和使用规则。";
	_pageKeywords = "DND,5e,牌组,塔罗牌,占卜牌,龙与地下城";

	_isFontAwesome = true;

	_stylesheets = [
		"decks",
		"deck-spreads",
	];
	_isStyleBook = true;

	_scriptIdentList = "decks";
	_isModule = true;

	_styleListContainerAdditional = "ve-flex-4";
	_styleContentWrapperAdditional = "ve-flex-7";

	_btnsList = [
		HtmlGeneratorListButtons.getBtn({width: "10", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "12", sortIdent: "name", text: "名称"}),
	];
}

class _PageGeneratorListDeities extends PageGeneratorListBase {
	_page = UrlUtil.PG_DEITIES;
	_pageTitle = "神祇";
	_pageDescription = "DND 5e 神祇列表，包含各个神系的神祇信息，包括领域、阵营和神职等详细资料。";
	_pageKeywords = "DND,5e,神祇,神系,领域,阵营,龙与地下城";
	_scriptIdentList = "deities";

	_styleListContainerAdditional = "ve-flex-6";
	_styleContentWrapperAdditional = "ve-flex-4";

	_btnsList = [
		HtmlGeneratorListButtons.getBtn({width: "3", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "pantheon", text: "神系"}),
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "alignment", text: "阵营"}),
		HtmlGeneratorListButtons.getBtn({width: "3", sortIdent: "domains", text: "领域"}),
		HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "4", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "pantheon", text: "神系"}),
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "alignment", text: "阵营"}),
		HtmlGeneratorListButtons.getBtn({width: "4", sortIdent: "domains", text: "领域"}),
	];
}

class _PageGeneratorListFeats extends PageGeneratorListBase {
	_page = UrlUtil.PG_FEATS;
	_pageTitle = "专长";
	_pageDescription = "DND 5e 专长列表，包含所有官方专长的详细效果、先决条件和属性加成说明。";
	_pageKeywords = "DND,5e,专长,先决条件,属性加成,龙与地下城";
	_scriptIdentList = "feats";
	_isHasRenderer = false;

	_styleListContainerAdditional = "ve-flex-6";
	_styleContentWrapperAdditional = "ve-flex-5";

	_isModule = true;

	_btnsList = [
		HtmlGeneratorListButtons.getBtnPreviewToggle(),
		HtmlGeneratorListButtons.getBtn({width: "3-2", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "1-3", sortIdent: "category", text: "分类"}),
		HtmlGeneratorListButtons.getBtn({width: "2-5", sortIdent: "ability", text: "属性值"}),
		HtmlGeneratorListButtons.getBtn({width: "3", sortIdent: "prerequisite", text: "先决条件"}),
		HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "4", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "category", text: "分类"}),
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "ability", text: "属性值"}),
		HtmlGeneratorListButtons.getBtn({width: "4", sortIdent: "prerequisite", text: "先决条件"}),
	];
}

class _PageGeneratorListItems extends PageGeneratorListBase {
	_page = UrlUtil.PG_ITEMS;
	_pageTitle = "物品";
	_pageDescription = "DND 5e 物品列表，包含武器、护甲、冒险装备、魔法物品等所有物品的详细属性和价格。";
	_pageKeywords = "DND,5e,物品,武器,护甲,魔法物品,装备,龙与地下城";

	_stylesheets = [
		"items",
	];

	_scriptIdentList = "items";
	_isHasRenderer = false;

	_isModule = true;

	_scriptsUtilsAdditional = [
		"utils-tableview.js",
	];

	_styleListContainerAdditional = "ve-flex-6 ve-itm__wrp-lists";
	_styleContentWrapperAdditional = "ve-flex-4 ve-itm__wrp-stats";

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "6", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "weight", text: "重量"}),
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "cost", text: "价值"}),
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "count", text: "数量"}),
	];

	_registerPartials () {
		super._registerPartials();

		this._registerPartial({
			ident: "listListcontainerItems",
			filename: "list/template-list-listcontainer--items.hbs",
		});

		this._registerPartial({
			ident: "listSublistContainerItems",
			filename: "list/template-list-sublist-container--items.hbs",
		});
	}

	_getData () {
		return {
			...super._getData(),
			identPartialListListcontainer: "listListcontainerItems",
			identPartialListSublistContainer: "listSublistContainerItems",
		};
	}

	_isTableView = true;
}

class _PageGeneratorListTrapsHazards extends PageGeneratorListBase {
	_page = UrlUtil.PG_TRAPS_HAZARDS;
	_pageTitle = "陷阱 & 危害";
	_pageDescription = "DND 5e 陷阱与危害列表，包含各种陷阱、环境危害和毒药的详细数据和触发条件。";
	_pageKeywords = "DND,5e,陷阱,危害,毒药,环境危害,龙与地下城";
	_scriptIdentList = "trapshazards";

	_btnsList = [
		HtmlGeneratorListButtons.getBtn({width: "3", sortIdent: "trapType", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "7", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "4", sortIdent: "trapType", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "8", sortIdent: "name", text: "名称"}),
	];
}

class _PageGeneratorListRewards extends PageGeneratorListBase {
	_page = UrlUtil.PG_REWARDS;
	_pageTitle = "其他奖励";
	_pageDescription = "DND 5e 其他奖励列表，包含 supernatural gifts、blessings 等各种超自然奖励和祝福。";
	_pageKeywords = "DND,5e,奖励,祝福,超自然赠礼,龙与地下城";
	_scriptIdentList = "rewards";
	_isHasRenderer = false;

	_isModule = true;

	_btnsList = [
		HtmlGeneratorListButtons.getBtnPreviewToggle(),
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "type", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "7-7", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "type", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "10", sortIdent: "name", text: "名称"}),
	];
}

class _PageGeneratorListLanguages extends PageGeneratorListBase {
	_page = UrlUtil.PG_LANGUAGES;
	_pageTitle = "语言";
	_pageDescription = "DND 5e 语言列表，包含通用语、龙语、精灵语等所有语言的分类和文字系统说明。";
	_pageKeywords = "DND,5e,语言,通用语,龙语,精灵语,龙与地下城";
	_scriptIdentList = "languages";

	_stylesheets = [
		"languages",
	];

	_btnsList = [
		HtmlGeneratorListButtons.getBtn({width: "6", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "type", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "script", text: "文字"}),
		HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "8", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "type", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "script", text: "文字"}),
	];
}

class _PageGeneratorListObjects extends PageGeneratorListBase {
	_page = UrlUtil.PG_OBJECTS;
	_pageTitle = "物件";
	_pageDescription = "DND 5e 物件列表，包含各种可破坏物件的属性、生命值和伤害阈值等数据。";
	_pageKeywords = "DND,5e,物件,可破坏物件,生命值,龙与地下城";
	_scriptIdentList = "objects";

	_btnsList = [
		HtmlGeneratorListButtons.getBtn({width: "8", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "size", text: "尺寸"}),
		HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "9", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "3", sortIdent: "size", text: "尺寸"}),
	];

	_isWrpToken = true;
}

class _PageGeneratorListOptionalFeatures extends PageGeneratorListBase {
	_page = UrlUtil.PG_OPT_FEATURES;
	_pageTitle = "职业能力选项";
	_pageDescription = "DND 5e 职业能力选项列表，包含各职业的可选特性和额外能力选项。";
	_pageKeywords = "DND,5e,职业能力,可选特性,额外能力,龙与地下城";
	_scriptIdentList = "optionalfeatures";
	_isHasRenderer = false;

	_isModule = true;

	_styleListContainerAdditional = "ve-flex-6";
	_styleContentWrapperAdditional = "ve-flex-4";

	_btnsList = [
		HtmlGeneratorListButtons.getBtnPreviewToggle(),
		HtmlGeneratorListButtons.getBtn({width: "3", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "1-5", sortIdent: "type", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "4-7", sortIdent: "prerequisite", text: "先决条件"}),
		HtmlGeneratorListButtons.getBtn({width: "1", sortIdent: "level", text: "等级"}),
		HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "4", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "type", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "4-5", sortIdent: "prerequisite", text: "先决条件"}),
		HtmlGeneratorListButtons.getBtn({width: "1-5", sortIdent: "level", text: "等级"}),
	];
}

class _PageGeneratorListPsionics extends PageGeneratorListBase {
	_page = UrlUtil.PG_PSIONICS;
	_pageTitle = "灵能";
	_pageDescription = "DND 5e 灵能列表，包含灵能天赋、灵能 discipline 和灵能点数等灵能系统规则。";
	_pageKeywords = "DND,5e,灵能,灵能天赋,灵能点数,龙与地下城";
	_scriptIdentList = "psionics";

	_scriptsUtilsAdditional = [
		"utils-tableview.js",
	];

	_btnsList = [
		HtmlGeneratorListButtons.getBtn({width: "6", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "type", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "order", text: "Order"}),
		HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "6", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "3", sortIdent: "type", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "3", sortIdent: "order", text: "Order"}),
	];

	_isTableView = true;
}

class _PageGeneratorListRaces extends PageGeneratorListBase {
	_page = UrlUtil.PG_RACES;
	_pageTitle = "种族";
	_pageDescription = "DND 5e 种族列表，包含人类、精灵、矮人、龙裔等所有种族的属性加成、特性和子种族。";
	_pageKeywords = "DND,5e,种族,人类,精灵,矮人,龙裔,龙与地下城";
	_scriptIdentList = "races";
	_isHasRenderer = false;

	_isModule = true;

	_btnsList = [
		HtmlGeneratorListButtons.getBtnPreviewToggle({width: "0-4"}),
		HtmlGeneratorListButtons.getBtn({width: "4-4", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "3-6", sortIdent: "ability", text: "属性值"}),
		HtmlGeneratorListButtons.getBtn({width: "1-6", sortIdent: "size", text: "体型"}),
		HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "5", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "5", sortIdent: "ability", text: "属性值"}),
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "size", text: "体型"}),
	];
}

class _PageGeneratorListRecipes extends PageGeneratorListBase {
	_page = UrlUtil.PG_RECIPES;
	_pageTitle = "食谱";
	_pageDescription = "DND 5e 食谱列表，包含各种烹饪食谱和饮品配方的详细材料和效果说明。";
	_pageKeywords = "DND,5e,食谱,烹饪,饮品,配方,龙与地下城";
	_scriptIdentList = "recipes";
	_isHasRenderer = false;

	_isModule = true;

	_stylesheets = [
		"recipes",
	];

	_isStyleBook = true;

	_styleListContainerAdditional = "ve-flex-4";
	_styleContentWrapperAdditional = "ve-flex-7";
	_stylePageContentAdditional = "recipes__tbl-recipes";

	_btnsList = [
		HtmlGeneratorListButtons.getBtn({width: "6", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "4", sortIdent: "type", text: "分类"}),
		HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "9", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "3", sortIdent: "type", text: "分类"}),
	];

	_registerPartials () {
		super._registerPartials();

		this._registerPartial({
			ident: "listContentwrapperRecipes",
			filename: "list/template-list-contentwrapper--recipes.hbs",
		});
	}

	_getData () {
		return {
			...super._getData(),
			identPartialListContentwrapper: "listContentwrapperRecipes",
		};
	}
}

class _PageGeneratorListHomeCrafts extends PageGeneratorListBase {
	_page = UrlUtil.PG_HOMECRAFTS;
	_pageTitle = "手工艺品";
	_pageDescription = "DND 5e 手工艺品列表，包含各种手工制作的物品、工具和艺术品的详细信息。";
	_pageKeywords = "DND,5e,手工艺品,手工制作,艺术品,龙与地下城";
	_scriptIdentList = "homecrafts";
	_isHasRenderer = false;

	_isModule = true;

	_stylesheets = [
		"homecrafts",
	];

	_isStyleBook = true;

	_styleListContainerAdditional = "ve-flex-4";
	_styleContentWrapperAdditional = "ve-flex-7";
	_stylePageContentAdditional = "homecrafts__tbl-homecrafts";

	_btnsList = [
		HtmlGeneratorListButtons.getBtn({width: "1-5", sortIdent: "type", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "5", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "3-5", sortIdent: "category", text: "分类"}),
		HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "type", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "7", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "3", sortIdent: "category", text: "分类"}),
	];
}

class _PageGeneratorListSpells extends PageGeneratorListBase {
	_page = UrlUtil.PG_SPELLS;
	_pageTitle = "法术";
	_pageDescription = "DND 5e 法术列表，包含所有环位法术的详细效果、施法时间、成分和范围说明。";
	_pageKeywords = "DND,5e,法术,环位,施法,魔法,龙与地下城";
	_scriptIdentList = "spells";
	_isHasRenderer = false;

	_stylesheets = [
		"spells",
	];

	_styleListContainerAdditional = "ve-flex-7";
	_styleContentWrapperAdditional = "ve-flex-5";

	_isModule = true;
	_isMultisource = true;

	_scriptsUtilsAdditional = [
		"utils-tableview.js",
	];

	_btnsList = [
		HtmlGeneratorListButtons.getBtn({width: "2-9", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "1-5", sortIdent: "level", text: "环阶"}),
		HtmlGeneratorListButtons.getBtn({width: "1-7", sortIdent: "time", text: "时间"}),
		HtmlGeneratorListButtons.getBtn({width: "1-2", sortIdent: "school", text: "学派"}),
		HtmlGeneratorListButtons.getBtn({width: "0-6", sortIdent: "concentration", title: "专注", text: "专"}),
		HtmlGeneratorListButtons.getBtn({width: "2-4", sortIdent: "range", text: "范围"}),
		HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "3-2", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "1-5", sortIdent: "level", text: "环阶"}),
		HtmlGeneratorListButtons.getBtn({width: "1-8", sortIdent: "time", text: "时间"}),
		HtmlGeneratorListButtons.getBtn({width: "1-6", sortIdent: "school", text: "学派"}),
		HtmlGeneratorListButtons.getBtn({width: "0-7", sortIdent: "concentration", title: "专注", text: "专"}),
		HtmlGeneratorListButtons.getBtn({width: "3-2", sortIdent: "range", text: "范围"}),
	];

	_isTableView = true;

	_registerPartials () {
		super._registerPartials();

		this._registerPartial({
			ident: "listContentwrapperSpells",
			filename: "list/template-list-contentwrapper--spells.hbs",
		});
	}

	_getData () {
		return {
			...super._getData(),
			identPartialListContentwrapper: "listContentwrapperSpells",
		};
	}
}

class _PageGeneratorListTables extends PageGeneratorListBase {
	_page = UrlUtil.PG_TABLES;
	_pageTitle = "表格";
	_pageDescription = "DND 5e 表格列表，包含随机遭遇表、战利品表、名称生成表等各种实用表格。";
	_pageKeywords = "DND,5e,表格,随机遭遇,战利品,名称生成,龙与地下城";
	_scriptIdentList = "tables";

	_styleListContainerAdditional = "ve-flex-4";
	_styleContentWrapperAdditional = "ve-flex-6";

	_btnsList = [
		HtmlGeneratorListButtons.getBtnPreviewToggle({width: "0-5"}),
		HtmlGeneratorListButtons.getBtn({width: "9-5", sortIdent: "sortName", text: "名称"}),
		HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "12", sortIdent: "sortName", text: "名称"}),
	];
}

class _PageGeneratorListVariantRules extends PageGeneratorListBase {
	_page = UrlUtil.PG_VARIANTRULES;
	_pageTitle = "术语汇编";
	_navbarTitle = "术语汇编";
	_pageDescription = "DND 5e 术语汇编，包含游戏规则术语、状态效果和特殊规则的详细解释。";
	_pageKeywords = "DND,5e,术语,规则,状态效果,龙与地下城";
	_scriptIdentList = "variantrules";

	_btnsList = [
		HtmlGeneratorListButtons.getBtn({width: "7", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "3", sortIdent: "ruleType", text: "类型"}),
		HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "9", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "3", sortIdent: "ruleType", text: "类型"}),
	];
}

class _PageGeneratorListVehicles extends PageGeneratorListBase {
	_page = UrlUtil.PG_VEHICLES;
	_pageTitle = "载具";
	_pageDescription = "DND 5e 载具列表，包含船只、车辆、飞行器等各种载具的属性和战斗规则。";
	_pageKeywords = "DND,5e,载具,船只,车辆,飞行器,龙与地下城";
	_scriptIdentList = "vehicles";

	_btnsList = [
		HtmlGeneratorListButtons.getBtn({width: "6", sortIdent: "type", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "4", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "8", sortIdent: "type", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "4", sortIdent: "name", text: "名称"}),
	];

	_isWrpToken = true;
}

class _PageGeneratorListBastions extends PageGeneratorListBase {
	_page = UrlUtil.PG_BASTIONS;
	_pageTitle = "据点";
	_pageDescription = "DND 5e 据点列表，包含各种据点设施、升级选项和管理规则的详细说明。";
	_pageKeywords = "DND,5e,据点,设施,升级,管理,龙与地下城";
	_scriptIdentList = "bastions";
	_isHasRenderer = false;

	_isModule = true;

	_scriptsUtilsAdditional = [
		"utils-tableview.js",
	];

	_btnsList = [
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "facilityType", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "3", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "1", sortIdent: "level", text: "等级"}),
		HtmlGeneratorListButtons.getBtn({width: "4", sortIdent: "prerequisite", text: "先决条件"}),
		HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "facilityType", text: "类型"}),
		HtmlGeneratorListButtons.getBtn({width: "3", sortIdent: "name", text: "名称"}),
		HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "level", text: "等级"}),
		HtmlGeneratorListButtons.getBtn({width: "5", sortIdent: "prerequisite", text: "先决条件"}),
	];

	_isTableView = true;
}

class _PageGeneratorListClasses extends PageGeneratorListBase {
	_filename = "list/template-list--classes.hbs";

	_page = UrlUtil.PG_CLASSES;
	_pageTitle = "职业";
	_pageDescription = "DND 5e 职业列表，包含战士、法师、牧师、游侠等所有职业的详细特性和子职业选项。";
	_pageKeywords = "DND,5e,职业,战士,法师,牧师,游侠,子职业,龙与地下城";
	_scriptIdentList = "classes";
	_isHasRenderer = false;

	_stylesheets = [
		"classes",
	];

	_isModule = true;
}

export const PAGE_GENERATORS_LISTPAGE = [
	new _PageGeneratorListActions(),
	new _PageGeneratorListBackgrounds(),
	new _PageGeneratorListBestiary(),
	new _PageGeneratorListCharCreationOptions(),
	new _PageGeneratorListConditionsDiseases(),
	new _PageGeneratorListCultsBoons(),
	new _PageGeneratorListDecks(),
	new _PageGeneratorListDeities(),
	new _PageGeneratorListFeats(),
	new _PageGeneratorListItems(),
	new _PageGeneratorListTrapsHazards(),
	new _PageGeneratorListRewards(),
	new _PageGeneratorListLanguages(),
	new _PageGeneratorListObjects(),
	new _PageGeneratorListOptionalFeatures(),
	new _PageGeneratorListPsionics(),
	new _PageGeneratorListRaces(),
	new _PageGeneratorListRecipes(),
	new _PageGeneratorListHomeCrafts(),
	new _PageGeneratorListSpells(),
	new _PageGeneratorListTables(),
	new _PageGeneratorListVariantRules(),
	new _PageGeneratorListVehicles(),
	new _PageGeneratorListBastions(),

	new _PageGeneratorListClasses(),
];
