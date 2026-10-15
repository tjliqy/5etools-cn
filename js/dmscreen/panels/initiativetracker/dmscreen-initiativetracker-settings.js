import {InitiativeTrackerUi} from "./dmscreen-initiativetracker-ui.js";
import {
	GROUP_DISPLAY_NAMES,
	InitiativeTrackerStatColumnFactory,
	IS_PLAYER_VISIBLE_ALL,
	IS_PLAYER_VISIBLE_NONE,
	IS_PLAYER_VISIBLE_PLAYER_UNITS_ONLY,
} from "./dmscreen-initiativetracker-statcolumns.js";

class _RenderableCollectionStatsCols extends RenderableCollectionGenericRows {
	constructor (
		{
			comp,

			doClose,
			$wrpRows,
		},
	) {
		super(comp, "statsCols", $wrpRows);
		this._doClose = doClose;
	}

	_populateRow ({comp, wrpRow, entity}) {
		wrpRow.vee.addClass("ve-py-1p");

		const meta = InitiativeTrackerStatColumnFactory.fromPopulateWith({populateWith: comp._state.populateWith});

		const iptAbv = ComponentUiUtil.getIptStr(comp, "abbreviation");

		const cbIsEditable = ComponentUiUtil.getCbBool(comp, "isEditable");

		const btnVisible = InitiativeTrackerUi.getBtnPlayerVisible({
			isVisible: comp._state.isPlayerVisible,
			fnOnClick: () => comp._state.isPlayerVisible = btnVisible.vee.hasClass("ve-btn-primary--half")
				? IS_PLAYER_VISIBLE_PLAYER_UNITS_ONLY
				: btnVisible.vee.hasClass("ve-btn-primary")
					? IS_PLAYER_VISIBLE_ALL
					: IS_PLAYER_VISIBLE_NONE,
			isTriState: true,
		});

		const btnDelete = this._utils.getBtnDelete({entity});

		const padDrag = this._utils.getPadDrag({wrpRow});

		veT(wrpRow)`
			<div class="ve-col-5 ve-pr-1">${meta.constructor.NAME}</div>
			<div class="ve-col-3 ve-pr-1">${iptAbv}</div>
			<div class="ve-col-1-5 ve-text-center">${cbIsEditable}</div>
			<div class="ve-col-1-5 ve-text-center">${btnVisible}</div>

			<div class="ve-col-0-5 ve-flex-vh-center">${btnDelete}</div>
			<div class="ve-col-0-5 ve-flex-vh-center">${padDrag}</div>
		`;
	}
}

export class InitiativeTrackerSettings extends BaseComponent {
	static _PROPS_TRACKED = [
		"isRollInit",
		"isRollHp",
		"isRollGroups",
		"isRerollInitiativeEachRound",
		"isInvertWoundDirection",
		"playerInitShowExactPlayerHp",
		"playerInitShowExactMonsterHp",
		"playerInitHideNewMonster",
		"playerInitShowOrdinals",
		"isStatsAddColumns",
		"statsCols",
	];

	constructor ({state}) {
		super();

		this._proxyAssignSimple(
			"state",
			{
				...InitiativeTrackerSettings._PROPS_TRACKED
					.mergeMap(prop => ({[prop]: state[prop]})),
				statsCols: this._getStatColsCollectionFormat(state.statsCols),
			},
		);
	}

	/* -------------------------------------------- */

	// Convert from classic "flat" format to renderable collection format
	_getStatColsCollectionFormat (statsCols) {
		return (statsCols || [])
			.map(data => {
				return InitiativeTrackerStatColumnFactory.fromStateData({data})
					.getAsCollectionRowStateData();
			});
	}

	// Convert from renderable collection format to classic "flat" format
	_getStatColsDataFormat (statsCols) {
		return (statsCols || [])
			.map(data => {
				return InitiativeTrackerStatColumnFactory.fromCollectionRowStateData({data})
					.getAsStateData();
			});
	}

	/* -------------------------------------------- */

	getStateUpdate () {
		const out = MiscUtil.copyFast(this._state);
		out.statsCols = this._getStatColsDataFormat(out.statsCols);
		return out;
	}

	/* -------------------------------------------- */

	pGetShowModalResults () {
		const {eleModalInner, eleModalFooter, pGetResolved, doClose} = UiUtil.getShowModal({
			title: "设置",
			isUncappedHeight: true,
			hasFooter: true,
		});

		UiUtil.addModalSep(eleModalInner);
		this._pGetShowModalResults_renderSection_isRolls({eleModalInner});
		UiUtil.addModalSep(eleModalInner);
		this._pGetShowModalResults_renderSection_wounds({eleModalInner});
		UiUtil.addModalSep(eleModalInner);
		this._pGetShowModalResults_renderSection_playerView({eleModalInner});
		UiUtil.addModalSep(eleModalInner);
		this._pGetShowModalResults_renderSection_additionalCols({eleModalInner});

		this._pGetShowModalResults_renderFooter({eleModalFooter, doClose});

		return pGetResolved();
	}

	/* -------------------------------------------- */

	_pGetShowModalResults_renderSection_isRolls ({eleModalInner}) {
		UiUtil.getAddModalRowCb2({wrp: eleModalInner, comp: this, prop: "isRollInit", text: "掷先攻骰"});
		UiUtil.getAddModalRowCb2({wrp: eleModalInner, comp: this, prop: "isRollHp", text: "掷生命值骰"});
		UiUtil.getAddModalRowCb2({wrp: eleModalInner, comp: this, prop: "isRollGroups", text: "一组生物一起掷骰"});
		UiUtil.getAddModalRowCb2({wrp: eleModalInner, comp: this, prop: "isRerollInitiativeEachRound", text: "每轮重新掷先攻骰"});
	}

	_pGetShowModalResults_renderSection_wounds ({eleModalInner}) {
		UiUtil.getAddModalRowCb2({wrp: eleModalInner, comp: this, prop: "isInvertWoundDirection", text: "以伤害值追踪生命值", title: `例如，生物满血时通常显示为“100/100”；改为追踪伤害后，满血时显示为“0/100”。`});
	}

	_pGetShowModalResults_renderSection_playerView ({eleModalInner}) {
		UiUtil.getAddModalRowCb2({wrp: eleModalInner, comp: this, prop: "playerInitShowExactPlayerHp", text: "玩家视图：显示玩家生命值"});
		UiUtil.getAddModalRowCb2({wrp: eleModalInner, comp: this, prop: "playerInitShowExactMonsterHp", text: "玩家视图：显示怪物生命值"});
		UiUtil.getAddModalRowCb2({wrp: eleModalInner, comp: this, prop: "playerInitHideNewMonster", text: "玩家视图：自动隐藏新怪物"});
		UiUtil.getAddModalRowCb2({wrp: eleModalInner, comp: this, prop: "playerInitShowOrdinals", text: "玩家视图：显示序号", title: "例如，如果你添加了两个地精，一个将是地精（1），另一个将是地精（2），而不是具有相同名称的两个地精。"});
	}

	_pGetShowModalResults_renderSection_additionalCols ({eleModalInner}) {
		UiUtil.getAddModalRowCb2({wrp: eleModalInner, comp: this, prop: "isStatsAddColumns", text: "额外列"});
		this._pGetShowModalResults_renderSection_additionalCols_head({eleModalInner});
		this._pGetShowModalResults_renderSection_additionalCols_body({eleModalInner});
	}

	_pGetShowModalResults_renderSection_additionalCols_head ({eleModalInner}) {
		const getAction = Cls => new ContextUtil.Action(
			Cls.NAME,
			() => {
				this._state.statsCols = [...this._state.statsCols, new Cls().getAsCollectionRowStateData()];
			},
		);

		const menuAddStatsCol = ContextUtil.getMenu(
			InitiativeTrackerStatColumnFactory.getGroupedByUi()
				.map(group => {
					const [ClsHead] = group;

					if (group.length === 1) return getAction(ClsHead);

					return new ContextUtil.ActionSubMenu(
						GROUP_DISPLAY_NAMES[ClsHead.GROUP],
						group.map(Cls => getAction(Cls)),
					);
				}),
		);

		const btnAddRow = veT`<button class="ve-btn ve-btn-default ve-btn-xs ve-bb-0 ve-bbr-0 ve-bbl-0" title="添加"><span class="glyphicon glyphicon-plus"></span></button>`
			.vee.onn("click", evt => ContextUtil.pOpenMenu(evt, menuAddStatsCol));

		const wrpTblStatsHead = veT`<div class="ve-flex-vh-center ve-w-100 ve-mb-2 ve-bb-1p-trans">
			<div class="ve-col-5">内容</div>
			<div class="ve-col-3">缩写</div>
			<div class="ve-col-1-5 ve-text-center ve-help" title="只影响生物行。玩家行总是可编辑的">可编辑</div>
			<div class="ve-col-1-5">&nbsp;</div>
			<div class="ve-col-1 ve-flex-v-center ve-flex-h-right">${btnAddRow}</div>
		</div>`
			.vee.appendTo(eleModalInner);

		this._addHookBase("isStatsAddColumns", () => wrpTblStatsHead.vee.toggle(this._state.isStatsAddColumns))();
	}

	_pGetShowModalResults_renderSection_additionalCols_body ({eleModalInner}) {
		const wrpRows = veT`<div class="ve-pr-1 ve-h-120p ve-flex-col ve-overflow-y-auto ve-relative"></div>`.vee.appendTo(eleModalInner);
		this._addHookBase("isStatsAddColumns", () => wrpRows.vee.toggle(this._state.isStatsAddColumns))();

		const renderableCollectionStatsCols = new _RenderableCollectionStatsCols(
			{
				comp: this,
				$wrpRows,
			},
		);

		this._addHookBase("statsCols", () => {
			renderableCollectionStatsCols.render();
		})();
	}

	/* -------------------------------------------- */

	_pGetShowModalResults_renderFooter ({eleModalFooter, doClose}) {
		const btnSave = veT`<button class="ve-btn ve-btn-primary ve-btn-sm ve-w-100">保存</button>`
			.vee.onn("click", () => doClose(true));

		veT(eleModalFooter)`<div class="ve-w-100 ve-py-3 ve-no-shrink">
			${btnSave}
		</div>`;
	}
}
