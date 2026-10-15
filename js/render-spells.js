import {SITE_STYLE__CLASSIC, SITE_STYLE__ONE} from "./consts.js";
import {VetoolsConfig} from "./utils-config/utils-config-config.js";
import {RenderPageImplBase} from "./render-page-base.js";

export class RenderSpellsSettings {
	static SETTINGS = {
		isDisplayGroups: new SettingsUtil.Setting({
			type: "boolean",
			name: "法术来源：显示群组",
			help: `是否在法术详情中显示“群组”。`,
			defaultVal: true,
		}),

		isDisplayClasses: new SettingsUtil.Setting({
			type: "boolean",
			name: "法术来源：显示职业",
			help: `是否在法术详情中显示“职业”。`,
			defaultVal: true,
		}),
		isDisplayClassesLegacy: new SettingsUtil.Setting({
			type: "boolean",
			name: "法术来源：显示职业（旧版）",
			help: `是否在法术详情中显示“职业（旧版）”。`,
			defaultVal: false,
		}),

		isDisplaySubclasses: new SettingsUtil.Setting({
			type: "boolean",
			name: "法术来源：显示子职业",
			help: `是否在法术详情中显示“子职业”。`,
			defaultVal: true,
		}),
		isDisplaySubclassesLegacy: new SettingsUtil.Setting({
			type: "boolean",
			name: "法术来源：显示子职业（旧版）",
			help: `是否在法术详情中显示“子职业（旧版）”。`,
			defaultVal: false,
		}),

		isDisplayVariantClasses: new SettingsUtil.Setting({
			type: "boolean",
			name: "法术来源：显示可选／变体职业",
			help: `是否在法术详情中显示“可选／变体职业”。`,
			defaultVal: true,
		}),
		isDisplayVariantClassesLegacy: new SettingsUtil.Setting({
			type: "boolean",
			name: "法术来源：显示可选／变体职业（旧版）",
			help: `是否在法术详情中显示“可选／变体职业（旧版）”。`,
			defaultVal: false,
		}),

		isDisplayRaces: new SettingsUtil.Setting({
			type: "boolean",
			name: "法术来源：显示种族",
			help: `是否在法术详情中显示“种族”。`,
			defaultVal: true,
		}),

		isDisplayBackgrounds: new SettingsUtil.Setting({
			type: "boolean",
			name: "法术来源：显示背景",
			help: `是否在法术详情中显示“背景”。`,
			defaultVal: true,
		}),

		isDisplayFeats: new SettingsUtil.Setting({
			type: "boolean",
			name: "法术来源：显示专长",
			help: `是否在法术详情中显示“专长”。`,
			defaultVal: true,
		}),

		isDisplayOptionalfeatures: new SettingsUtil.Setting({
			type: "boolean",
			name: "法术来源：其他选项／特性",
			help: `是否在法术详情中显示“其他选项／特性”。`,
			defaultVal: true,
		}),
	};
}

/** @abstract */
class _RenderSpellsImplBase extends RenderPageImplBase {
	_style;
	_page = UrlUtil.PG_SPELLS;
	_dataProp = "spell";

	getRendered (ent, opts) {
		opts = {...opts || {}};
		opts.subclassLookup ||= {};
		opts.settings ||= SettingsUtil.getDefaultSettings(RenderSpellsSettings.SETTINGS);
		return super.getRendered(ent, opts);
	}

	/* -------------------------------------------- */

	_getCommonHtmlParts (
		{
			ent,
			opts,
			renderer,
		},
	) {
		return {
			...super._getCommonHtmlParts({ent, renderer, opts}),

			htmlPtLevelSchoolRitual: this._getCommonHtmlParts_levelSchoolRitual({ent}),

			htmlPtCastingTime: this._getCommonHtmlParts_castingTime({ent}),
			htmlPtRange: this._getCommonHtmlParts_range({ent}),
			htmlPtComponents: this._getCommonHtmlParts_components({ent}),
			htmlPtDuration: this._getCommonHtmlParts_duration({ent}),

			htmlPtEntries: this._getCommonHtmlParts_entries({ent, renderer}),
			htmlPtFrom: this._getCommonHtmlParts_from({ent, opts, renderer}),
		};
	}

	/* ----- */

	_getCommonHtmlParts_levelSchoolRitual ({ent}) {
		return `<tr><td colspan="6">${Renderer.spell.getHtmlPtLevelSchoolRitual(ent, {styleHint: this._style})}</td></tr>`;
	}

	/* ----- */

	_getCommonHtmlParts_castingTime ({ent}) {
		return `<tr><td colspan="6" ${this._style === "classic" ? "" : `class="ve-pt-2"`}>${Renderer.spell.getHtmlPtCastingTime(ent, {styleHint: this._style})}</td></tr>`;
	}

	_getCommonHtmlParts_range ({ent}) {
		return `<tr><td colspan="6">${Renderer.spell.getHtmlPtRange(ent, {styleHint: this._style, isDisplaySelfArea: SourceUtil.isClassicSource(ent.source)})}</td></tr>`;
	}

	_getCommonHtmlParts_components ({ent}) {
		return `<tr><td colspan="6">${Renderer.spell.getHtmlPtComponents(ent)}</td></tr>`;
	}

	_getCommonHtmlParts_duration ({ent}) {
		return `<tr><td colspan="6" ${this._style === "classic" ? "" : `class="ve-pb-2"`}>${Renderer.spell.getHtmlPtDuration(ent, {styleHint: this._style})}</td></tr>`;
	}

	/* ----- */

	_getCommonHtmlParts_entries ({ent, renderer}) {
		const stack = [];

		const entryList = {type: "entries", entries: ent.entries};
		renderer.recursiveRender(entryList, stack, {depth: 1});
		if (ent.entriesHigherLevel) {
			const higherLevelsEntryList = {type: "entries", entries: ent.entriesHigherLevel};
			renderer.recursiveRender(higherLevelsEntryList, stack, {depth: 2});
		}

		return stack.join("");
	}

	_getCommonHtmlParts_from ({ent, opts, renderer}) {
		const {subclassLookup, settings} = opts;

		const stackFroms = [];

		if (settings.isDisplayGroups) this._mutStackPtSpellSource({ent, stackFroms, renderer, title: "群组", propSpell: "groups"});

		const fromClassList = Renderer.spell.getCombinedClasses(ent, "fromClassList");
		if (fromClassList.length) {
			const [current, legacy] = Parser.spClassesToCurrentAndLegacy(fromClassList);
			if (settings.isDisplayClasses) {
				stackFroms.push(`<div><span class="ve-bold">职业: </span>${Parser.spMainClassesToFull(current)}</div>`);
			}
			if (settings.isDisplayClassesLegacy && legacy.length) {
				stackFroms.push(`<div class="ve-muted"><span class="ve-bold">职业 (传奇): </span>${Parser.spMainClassesToFull(legacy)}</div>`);
			}
		}

		const fromSubclass = Renderer.spell.getCombinedClasses(ent, "fromSubclass");
		if (fromSubclass.length) {
			const [current, legacy] = Parser.spSubclassesToCurrentAndLegacyFull(ent, subclassLookup);
			if (settings.isDisplaySubclasses) {
				stackFroms.push(`<div><span class="ve-bold">子职: </span>${current}</div>`);
			}
			if (settings.isDisplaySubclassesLegacy && legacy.length) {
				stackFroms.push(`<div class="ve-muted"><span class="ve-bold">子职 (传奇): </span>${legacy}</div>`);
			}
		}

		const fromClassListVariant = Renderer.spell.getCombinedClasses(ent, "fromClassListVariant");
		if (fromClassListVariant.length) {
			const [current, legacy] = Parser.spVariantClassesToCurrentAndLegacy(fromClassListVariant);
			if (settings.isDisplayVariantClasses && current.length) {
				stackFroms.push(`<div><span class="ve-bold" title="DM 可以将可选法术加入战役。变体法术通常可用，也可以由 DM 决定开放给某个职业。">可选/变体职业: </span>${Parser.spMainClassesToFull(current)}</div>`);
			}
			if (settings.isDisplayVariantClassesLegacy && legacy.length) {
				stackFroms.push(`<div class="ve-muted"><span class="ve-bold" title="DM 可以将可选法术加入战役。变体法术通常可用，也可以由 DM 决定开放给某个职业。">可选/变体职业 (传奇): </span>${Parser.spMainClassesToFull(legacy)}</div>`);
			}
		}

		if (settings.isDisplayRaces) this._mutStackPtSpellSource({ent, stackFroms, renderer, title: "种族", propSpell: "races", prop: "race", tag: "race"});
		if (settings.isDisplayBackgrounds) this._mutStackPtSpellSource({ent, stackFroms, renderer, title: "背景", propSpell: "backgrounds", prop: "background", tag: "background"});
		if (settings.isDisplayFeats) this._mutStackPtSpellSource({ent, stackFroms, renderer, title: "专长", propSpell: "feats", prop: "feat", tag: "feat"});
		if (settings.isDisplayOptionalfeatures) this._mutStackPtSpellSource({ent, stackFroms, renderer, title: "其他选项/专长", propSpell: "optionalfeatures", prop: "optionalfeature", tag: "optfeature"});

		if (
			ent.level >= 5
			&& fromClassList?.some(it => it.name === "Wizard" && it?.source === Parser.SRC_PHB)
		) {
			stackFroms.push(`<section class="ve-muted ve-mt-2">`);
			renderer.recursiveRender(`{@italic 注：{@class fighter||战士（奥法骑士）|eldritch knight}和{@class rogue||游荡者（诡术师）|arcane trickster}的法术列表均包含所有{@class Wizard||法师}法术。借助法术卷轴等物品，还可以施放五环或更高环阶的法术。}`, stackFroms, {depth: 2});
			stackFroms.push(`</section>`);
		}

		return stackFroms.join("");
	}

	_mutStackPtSpellSource ({ent, stackFroms, renderer, title, propSpell, prop, tag}) {
		const froms = Renderer.spell.getCombinedGeneric(ent, {propSpell, prop});
		if (!froms.length) return;

		const ptFroms = froms
			.map(it => {
				const pt = tag ? renderer.render(`{@${tag} ${it.name}|${it.source}}`) : `<span class="ve-help-subtle" title="来源：${(Parser.sourceJsonToFull(it.source)).qq()}">${it.name}</span>`;
				return `${SourceUtil.isNonstandardSource(it.source) ? `<span class="ve-muted">` : ``}${pt}${SourceUtil.isNonstandardSource(it.source) ? `</span>` : ``}`;
			})
			.join(", ");

		stackFroms.push(`<div><span class="ve-bold">${title}: </span>${ptFroms}</div>`);
	}
}

class _RenderSpellsImplClassic extends _RenderSpellsImplBase {
	_style = SITE_STYLE__CLASSIC;

	/* -------------------------------------------- */

	_getRendered ({ent, opts, renderer}) {
		const {
			htmlPtIsExcluded,
			htmlPtName,

			htmlPtLevelSchoolRitual,

			htmlPtCastingTime,
			htmlPtRange,
			htmlPtComponents,
			htmlPtDuration,

			htmlPtEntries,
			htmlPtFrom,

			htmlPtPage,
		} = this._getCommonHtmlParts({
			ent,
			opts,
			renderer,
		});

		return `
			${Renderer.utils.getBorderTr()}

			${htmlPtIsExcluded}
			${htmlPtName}

			${htmlPtLevelSchoolRitual}

			${htmlPtCastingTime}
			${htmlPtRange}
			${htmlPtComponents}
			${htmlPtDuration}

			${Renderer.utils.getDividerTr()}

			<tr><td colspan="6">
				${htmlPtEntries}
				${htmlPtFrom}
			</td></tr>

			${htmlPtPage}
			${Renderer.utils.getBorderTr()}
		`;
	}
}

class _RenderSpellsImplOne extends _RenderSpellsImplBase {
	_style = SITE_STYLE__ONE;

	/* -------------------------------------------- */

	_getRendered ({ent, opts, renderer}) {
		const {
			htmlPtIsExcluded,
			htmlPtName,

			htmlPtLevelSchoolRitual,

			htmlPtCastingTime,
			htmlPtRange,
			htmlPtComponents,
			htmlPtDuration,

			htmlPtEntries,
			htmlPtFrom,

			htmlPtPage,
		} = this._getCommonHtmlParts({
			ent,
			opts,
			renderer,
		});

		return `
			${Renderer.utils.getBorderTr()}

			${htmlPtIsExcluded}
			${htmlPtName}

			${htmlPtLevelSchoolRitual}

			${htmlPtCastingTime}
			${htmlPtRange}
			${htmlPtComponents}
			${htmlPtDuration}

			<tr><td colspan="6">
				${htmlPtEntries}
				${htmlPtFrom}
			</td></tr>

			${htmlPtPage}
			${Renderer.utils.getBorderTr()}
		`;
	}
}

export class RenderSpells {
	static _RENDER_CLASSIC = new _RenderSpellsImplClassic();
	static _RENDER_ONE = new _RenderSpellsImplOne();

	/**
	 * @param {object} ent
	 * @param [opts]
	 * @param [opts.subclassLookup]
	 * @param [opts.isSkipExcludesRender]
	 * @param [opts.settings]
	 */
	static getRenderedSpell (ent, opts) {
		const styleHint = VetoolsConfig.get("styleSwitcher", "style");
		switch (styleHint) {
			case SITE_STYLE__CLASSIC: return this._RENDER_CLASSIC.getRendered(ent, opts);
			case SITE_STYLE__ONE: return this._RENDER_ONE.getRendered(ent, opts);
			default: throw new Error(`Unhandled style "${styleHint}"!`);
		}
	}
}
