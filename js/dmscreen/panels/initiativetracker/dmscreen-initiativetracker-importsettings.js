export class InitiativeTrackerSettingsImport extends BaseComponent {
	static _PROPS_TRACKED = [
		"isRollInit",
		"isRollHp",
		"importIsRollGroups",
		"importIsAddPlayers",
		"importIsAppend",
	];

	constructor ({state}) {
		super();

		this._proxyAssignSimple(
			"state",
			InitiativeTrackerSettingsImport._PROPS_TRACKED
				.mergeMap(prop => ({[prop]: state[prop]})),
		);
	}

	/* -------------------------------------------- */

	getStateUpdate () {
		return MiscUtil.copyFast(this._state);
	}

	/* -------------------------------------------- */

	pGetShowModalResults () {
		const {eleModalInner, eleModalFooter, pGetResolved, doClose} = UiUtil.getShowModal({
			title: "导入设置",
			isUncappedHeight: true,
			hasFooter: true,
		});

		UiUtil.addModalSep(eleModalInner);
		this._pGetShowModalResults_renderSection_isRolls({eleModalInner});
		UiUtil.addModalSep(eleModalInner);
		this._pGetShowModalResults_renderSection_import({eleModalInner});

		this._pGetShowModalResults_renderFooter({eleModalFooter, doClose});

		return pGetResolved();
	}

	/* -------------------------------------------- */

	_pGetShowModalResults_renderSection_isRolls ({eleModalInner}) {
		UiUtil.getAddModalRowCb2({wrp: eleModalInner, comp: this, prop: "isRollInit", text: "掷骰生物先攻"});
		UiUtil.getAddModalRowCb2({wrp: eleModalInner, comp: this, prop: "isRollHp", text: "掷骰生物生命值"});
	}

	_pGetShowModalResults_renderSection_import ({eleModalInner}) {
		UiUtil.getAddModalRowCb2({wrp: eleModalInner, comp: this, prop: "importIsRollGroups", text: "一起为一组生物掷骰"});
		UiUtil.getAddModalRowCb2({wrp: eleModalInner, comp: this, prop: "importIsAddPlayers", text: "添加玩家"});
		UiUtil.getAddModalRowCb2({wrp: eleModalInner, comp: this, prop: "importIsAppend", text: "添加到现有追踪器状态"});
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
