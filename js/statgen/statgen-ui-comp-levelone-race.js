import {StatGenUiRenderLevelOneEntityBase} from "./statgen-ui-comp-levelone-entitybase.js";

export class StatGenUiRenderLevelOneRace extends StatGenUiRenderLevelOneEntityBase {
	_title = I18nUtil.get("common.species");
	_titleShort = "种族";
	_propIxEntity = "common_ixRace";
	_propIxAbilityScoreSet = "common_ixAbilityScoreSetRace";
	_propData = "_races";
	_propModalFilter = "_modalFilterRaces";
	_propIsPreview = "common_isPreviewRace";
	_propEntity = "race";
	_page = UrlUtil.PG_RACES;
	_propChoiceMetasFrom = "common_raceChoiceMetasFrom";
	_propChoiceWeighted = "common_raceChoiceMetasWeighted";

	render () {
		const out = super.render();

		const {stgTashasControls, dispTashas} = this._getPtsTashas();

		out.stgSel.vee.appends(stgTashasControls);

		out.dispTashas = dispTashas;

		return out;
	}

	_pb_getAbilityList () {
		return this._parent._pb_getRaceAbilityList();
	}

	_pb_getAbility () {
		return this._parent._pb_getRaceAbility();
	}

	_bindAdditionalHooks_hkIxEntity (hkIxEntity) {
		this._parent._addHookBase("common_isTashas", hkIxEntity);
		this._parent._addHookBase("common_isAllowTashasRules", hkIxEntity);
	}

	_bindAdditionalHooks_hkSetValuesSelAbilitySet (hkSetValuesSelAbilitySet) {
		this._parent._addHookBase("common_isTashas", hkSetValuesSelAbilitySet);
		this._parent._addHookBase("common_isAllowTashasRules", hkSetValuesSelAbilitySet);
	}

	_getHrPreviewMeta () {
		const out = super._getHrPreviewMeta();
		const {hkPreview} = out;
		this._parent._addHookBase("common_isShowTashasRules", hkPreview);
		this._parent._addHookBase("common_isAllowTashasRules", hkPreview);
		return out;
	}

	_getHkPreview ({hrPreview}) {
		return () => hrPreview.vee.toggle(this._parent._state[this._propIsPreview] && this._parent._state.common_isShowTashasRules && this._parent._state.common_isAllowTashasRules);
	}

	_getPtsTashas () {
		const btnToggleTashasPin = ComponentUiUtil.getBtnBool(
			this._parent,
			"common_isShowTashasRules",
			{
				html: `<button class="ve-btn ve-btn-xxs ve-btn-default ve-small ve-p-0 ve-statgen-shared__btn-toggle-tashas-rules ve-flex-vh-center" title="切换“自定义出身”部分"><span class="glyphicon glyphicon-eye-open"></span></button>`,
			},
		);

		const stgTashasControls = veT`<div class="ve-flex-col ve-w-100">
			<label class="ve-flex-v-center ve-mb-1">
				<div class="ve-mr-2">${I18nUtil.get("page.statgen.allow_origin_customization")}</div>
				${ComponentUiUtil.getCbBool(this._parent, "common_isTashas")}
			</label>

			<div class="ve-flex">
				<div class="ve-small ve-muted ve-italic ve-mr-1">${Renderer.get().render(`一项{@variantrule Customizing Your Origin|TCE|可选规则}`)}</div>
				${btnToggleTashasPin}
				<div class="ve-small ve-muted ve-italic ve-ml-1">${Renderer.get().render(`出自《塔莎的万事坩埚》第 8 页。`)}</div>
			</div>
		</div>`;
		this._parent._addHookBase("common_isAllowTashasRules", () => {
			stgTashasControls.vee.toggle(this._parent._state.common_isAllowTashasRules);
		})();

		const dispTashas = veT`<div class="ve-flex-col"><div class="ve-italic ve-muted">加载中...</div></div>`;
		DataLoader.pCacheAndGet(UrlUtil.PG_VARIANTRULES, Parser.SRC_TCE, UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_VARIANTRULES]({name: "Customizing Your Origin", source: Parser.SRC_TCE}))
			.then(rule => {
				veT(dispTashas.vee.empty())`${Renderer.hover.getHoverContent_stats(UrlUtil.PG_VARIANTRULES, rule)}<hr class="ve-hr-3">`;
			});
		const hkIsShowTashas = () => {
			dispTashas.vee.toggle(this._parent._state.common_isShowTashasRules && this._parent._state.common_isAllowTashasRules);
		};
		this._parent._addHookBase("common_isShowTashasRules", hkIsShowTashas);
		this._parent._addHookBase("common_isAllowTashasRules", hkIsShowTashas);
		hkIsShowTashas();

		return {
			stgTashasControls,
			dispTashas,
		};
	}
}
