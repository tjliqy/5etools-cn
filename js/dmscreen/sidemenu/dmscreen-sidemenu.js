import {RenderableCollectionSaveSlotStatesManager, RenderableCollectionSaveSlotStatesSidebar} from "./dmscreen-sidemenu-saveslots.js";
import {DmScreenSidemenuHistory} from "./dmscreen-sidemenu-history.js";

export class DmScreenSideMenu extends BaseComponent {
	constructor ({board}) {
		super();

		this._state.isLocked = !!board.isLocked;
		this._state.isFullscreen = !!board.isFullscreen;

		this._board = board;

		this._wrpSideMenuControls = null;

		this._compHistory = new DmScreenSidemenuHistory({board});
	}

	/* -------------------------------------------- */

	init () {
		this._wrpSideMenuControls = veEs(`#dm-screen-sidemenu-controls`);

		this._wrpSideMenuControls.vee.onn("mouseover", () => {
			this._board.setHoveringPanel(null);
			this._board.setVisiblyHoveringPanel(false);
			this._board.resetHoveringButton();
		});

		this._addHookBase("isFullscreen", () => {
			this._wrpSideMenuControls.vee.toggleClass("ve-mt-3p", !this._state.isFullscreen);
			this._wrpSideMenuControls.vee.toggleClass("ve-bt-1p", !this._state.isFullscreen);

			this._compHistory.setIsFullscreen(this._state.isFullscreen);
		})();

		this._addHookBase("saveSlotStates", () => {
			this._board.setSaveSlotInfo({
				idSaveSlotActive: this._state.saveSlotStates
					.filter(saveSlotState => saveSlotState.entity.isActive)
					.map(saveSlotState => saveSlotState.id)[0],

				saveSlotStates: Object.fromEntries(
					this._state.saveSlotStates
						.map((saveSlotState, ix) => {
							const out = MiscUtil.copyFast(saveSlotState.entity);
							out._sort = ix;
							this._mutCompressSaveSlotStateEntity(out);
							return [saveSlotState.id, out];
						}),
				),
			});
		});

		this._compHistory.init();
	}

	/* -------------------------------------------- */

	_mutExpandSaveSlotStateEntity (obj, {isActive, _sort = null}) {
		obj.isActive = isActive;
		if (_sort != null) obj._sort = _sort;
		return obj;
	}

	_mutCompressSaveSlotStateEntity (obj) {
		delete obj.isActive;
		return obj;
	}

	/* ----- */

	setSaveSlotInfo ({idSaveSlotActive, saveSlotStates}) {
		this._proxyAssignSimple("state", {
			saveSlotStates: Object.entries(saveSlotStates)
				.sort(([idA, saveSlotStateA], [idB, saveSlotStateB]) => SortUtil.ascSort(saveSlotStateA._sort ?? (Math.trunc(Number.MAX_SAFE_INTEGER / 2) + Number(idA)), saveSlotStateB._sort ?? (Math.trunc(Number.MAX_SAFE_INTEGER / 2) + Number(idB))))
				.map(([id, saveSlotState], ix) => ({
					id,
					entity: this._mutExpandSaveSlotStateEntity(
						MiscUtil.copyFast(saveSlotState),
						{
							isActive: idSaveSlotActive === id,
							_sort: ix,
						},
					),
				})),
		});
	}

	setIsLocked (isLocked) { this._state.isLocked = !!isLocked; }
	setIsFullscreen (isFullscreen) { this._state.isFullscreen = !!isFullscreen; }

	/* -------------------------------------------- */

	render () {
		this._render_saveSlots();
		this._render_footer();

		this._compHistory.render();
	}

	/* -------------------------------------------- */

	_render_getWrpSaveSlots () {
		const wrp = veT`<div class="ve-flex-col ve-mb-2 ve-min-h-0 ve-overflow-y-auto"></div>`;

		const renderableCollection = new RenderableCollectionSaveSlotStatesSidebar({
			board: this._board,
			comp: this,
			wrpRows: wrp,
		});

		this._addHookBase("saveSlotStates", () => {
			renderableCollection.render();
		})();

		return wrp;
	}

	/* ----- */

	_render_getBtnNewSaveSlot () {
		return veT`<button class="ve-btn ve-btn-default ve-bc-0 ve-bb-0 ve-br-0 ve-bl-0" title="新建存档面板"><span class="glyphicon glyphicon-plus"></span></button>`
			.vee.onn("click", async () => {
				await this._board.pHandleClick_doNewSaveSlot({isActive: true});
			});
	}

	_render_getBtnOpenSaveSlot () {
		let isModalActive = false;

		const selectClickHandler = new RenderableCollectionSelectClickHandler({
			comp: this,
			prop: "saveSlotStates",
			namespace: "manager",
		});

		const menuMass = ContextUtil.getMenu([
			new ContextUtil.Action(
				"删除",
				async () => {
					const saveSlotIdActive = this._state.saveSlotStates
						.filter(rowState => rowState.entity.isActive)[0]?.id;
					if (saveSlotIdActive == null) throw new Error(`No active save slot ID! This is a bug!`);

					const selectedSaveSlotIds = selectClickHandler.getSelectedIds()
						.filter(id => id !== saveSlotIdActive);
					if (!selectedSaveSlotIds.length) return JqueryUtil.doToast({content: `请先选中非激活的存档面板！`, type: "warning"});

					if (!await InputUiUtil.pGetUserBoolean({title: "删除存档面板", htmlDescription: `此操作将删除 ${selectedSaveSlotIds.length} 个存档面板。你确定要这么做吗？`, textYes: "确定", textNo: "取消"})) return;

					const toDelete = new Set(selectedSaveSlotIds);

					this._state.saveSlotStates = this._state.saveSlotStates
						.filter(rowState => !toDelete.has(rowState.id));
				},
			),
		]);

		const wrpRenderableCollection = veT`<div class="ve-flex-col ve-w-100 ve-h-100 ve-min-h-0 ve-relative"></div>`;

		const menuRowOptions = ContextUtil.getMenu([
			new ContextUtil.Action(
				"拷贝",
				async () => {
					await this._board.pHandleClick_doDuplicateSaveSlot(menuRowOptions.userData.entityId);
				},
			),
		]);

		const renderableCollection = new RenderableCollectionSaveSlotStatesManager({
			board: this._board,
			menu: menuRowOptions,
			comp: this,
			selectClickHandler,
			wrpRows: wrpRenderableCollection,
		});

		this._addHookBase("saveSlotStates", () => {
			if (!isModalActive) return;
			renderableCollection.render();
		})();

		return veT`<button class="ve-btn ve-btn-default ve-bc-0 ve-br-0 ve-bl-0 ve-mb-4" title="查看/管理存档面板"><span class="glyphicon glyphicon-folder-open"></span></button>`
			.vee.onn("click", async () => {
				isModalActive = true;
				renderableCollection.render();

				const {eleModalInner, doClose} = UiUtil.getShowModal({
					title: "查看/管理存档面板",
					isHeight100: true,
					isUncappedHeight: true,
					isHeaderBorder: true,
					cbClose: () => {
						wrpRenderableCollection.vee.detach();
						isModalActive = false;
					},
				});

				renderableCollection.setFnCloseModal(doClose);
				eleModalInner.vee.addClass("ve-py-2");

				const btnMass = veT`<button class="ve-btn ve-btn-default ve-btn-xs ve-mr-2">批处理...</button>`
					.vee.onn("click", async evt => {
						await ContextUtil.pOpenMenu(evt, menuMass);
					});

				const btnAddSlot = veT`<button class="ve-btn ve-btn-default ve-btn-xs ve-mr-2"><span class="glyphicon glyphicon-plus"></span> 新建存档面板</button>`
					.vee.onn("click", async () => {
						await this._board.pHandleClick_doNewSaveSlot();
					});

				const cbMulti = veT`<input type="checkbox">`;
				selectClickHandler.bindSelectAllCheckbox(cbMulti);

				veT(eleModalInner)`
					<div class="ve-w-100 ve-flex-col ve-mb-1">
						<div class="ve-flex-v-center">
							${btnMass}
						</div>
						<div class="ve-flex-v-center ve-ml-auto">
							${btnAddSlot}
						</div>
					</div>

					<div class="ve-flex-v-center ve-my-1 ve-px-2p ve-btn-group">
						<label class="ve-btn ve-btn-default ve-btn-xs ve-col-0-5 ve-flex-vh-center ve-h-100">
							${cbMulti}
						</label>
						<button class="ve-btn ve-btn-default ve-btn-xs ve-col-1" disabled>&nbsp;</button>
						<button class="ve-btn ve-btn-default ve-btn-xs ve-col-1" title="标识符。展示在侧边栏的缩写。" disabled>标识</button>
						<button class="ve-btn ve-btn-default ve-btn-xs ve-col-7" title="更长的名字，展示在工具栏和列表中。" disabled>名称</button>
						<button class="ve-btn ve-btn-default ve-btn-xs ve-grow" disabled>&nbsp;</button>
					</div>

					${wrpRenderableCollection}
				`;
			});
	}

	_render_saveSlots () {
		veT`<div class="ve-flex-col ve-min-h-0">
			${this._render_getWrpSaveSlots()}

			${this._render_getBtnNewSaveSlot()}
			${this._render_getBtnOpenSaveSlot()}
		</div>`
			.vee.appendTo(this._wrpSideMenuControls);
	}

	/* -------------------------------------------- */

	_render_getBtnSaveToFile () {
		return veT`<button class="ve-btn ve-btn-primary ve-bc-0 ve-bb-0 ve-br-0 ve-bl-0" title="导出到文件"><span class="glyphicon glyphicon-download"></span></button>`
			.vee.onn("click", () => {
				DataUtil.userDownload(`dm-screen`, this._board.getSaveableState(), {fileType: "dm-screen"});
			});
	}

	_render_getBtnLoadFromFile () {
		return veT`<button class="ve-btn ve-btn-primary ve-bc-0 ve-bb-0 ve-br-0 ve-bl-0" title="从文件导入 (按住SHIFT导入到当前帷幕)"><span class="glyphicon glyphicon-upload"></span></button>`
			.vee.onn("click", async evt => {
				const isCombine = !!evt.shiftKey;

				const {jsons, errors} = await InputUiUtil.pGetUserUploadJson({expectedFileTypes: ["dm-screen"]});

				DataUtil.doHandleFileLoadErrorsGeneric(errors);

				if (!jsons?.length) return;
				await this._board.pDoLoadStateFrom(jsons[0], {isOptionallyPromptCombine: true, isCombine});
			});
	}

	_render_getBtnSaveToUrl () {
		const btnSaveLink = veT`<button class="ve-btn ve-btn-primary ve-bc-0 ve-br-0 ve-bl-0 ve-mb-1" title="导出为URL"><span class="glyphicon glyphicon-magnet"></span></button>`
			.vee.onn("click", async () => {
				const encoded = `${window.location.href.split("#")[0]}#${encodeURIComponent(JSON.stringify(this._board.getSaveableState()))}`;
				await MiscUtil.pCopyTextToClipboard(encoded);
				JqueryUtil.showCopiedEffect(btnSaveLink);
			});
		return btnSaveLink;
	}

	/* ----- */

	_render_getBtnReset () {
		return veT`<button class="ve-btn ve-btn-danger ve-bc-0 ve-br-0 ve-bl-0 ve-mb-4" title="重置存档面板(按住SHIFT重置所有)"><span class="glyphicon glyphicon-refresh"></span></button>`
			.vee.onn("click", async evt => {
				const isAll = !!evt.shiftKey;

				const comp = BaseComponent.fromObject({isRetainWidthHeight: true});
				const cbKeepWidthHeight = ComponentUiUtil.getCbBool(comp, "isRetainWidthHeight");

				const eleDescription = veT`<div class="ve-w-320p">
					<label class="ve-split-v-center ve-mb-2"><span>保留当前宽/高</span> ${cbKeepWidthHeight}</label>
					<hr class="ve-hr-1">
					<div>你确定吗?</div>
				</div>`;

				if (!await InputUiUtil.pGetUserBoolean({title: isAll ? "重置全部" : "重置存档槽位", eleDescription, textYes: "确定", textNo: "取消"})) return;

				if (!isAll) {
					this._board.doReset({isRetainWidthHeight: comp._state.isRetainWidthHeight});
					return;
				}

				await this._board.pDoResetAll({isRetainWidthHeight: comp._state.isRetainWidthHeight});
			});
	}

	/* ----- */

	_render_getBtnToggleLock () {
		const btnLockPanels = veT`<button class="ve-btn ve-btn-default ve-bc-0 ve-bb-0 ve-br-0 ve-bl-0" title="锁定面板"><span class="glyphicon glyphicon-lock"></span></button>`
			.vee.onn("click", () => this._board.doToggleLocked());
		this._addHookBase("isLocked", () => btnLockPanels.vee.toggleClass("ve-active", this._state.isLocked))();

		return btnLockPanels;
	}

	_render_getBtnToggleFullscreen () {
		const btnFullscreen = veT`<button class="ve-btn ve-btn-default ve-bc-0 ve-br-0 ve-bl-0 ve-mb-4" title="切换全屏"><span class="glyphicon glyphicon-fullscreen"></span></button>`
			.vee.onn("click", () => this._board.doToggleFullscreen());
		this._addHookBase("isFullscreen", () => btnFullscreen.vee.toggleClass("ve-active", this._state.isFullscreen))();

		return btnFullscreen;
	}

	/* ----- */

	_render_getBtnSettings () {
		return veT`<button class="ve-btn ve-btn-default ve-bc-0 ve-bb-0 ve-br-0 ve-bl-0" title="设置"><span class="glyphicon glyphicon-cog"></span></button>`
			.vee.onn("click", () => {
				const {eleModalInner, eleModalFooter, doClose} = UiUtil.getShowModal({
					title: "设置",
					isUncappedWidth: true,
					isUncappedHeight: true,
					headerType: 3,
					isHeaderBorder: true,
					overlayColor: "transparent",
					hasFooter: true,
				});
				eleModalInner.vee.addClass("ve-py-2");

				const btnClose = veT`<button class="ve-btn ve-btn-default ve-btn-sm ve-ml-auto">关闭</button>`
					.vee.onn("click", () => doClose());

				veT`<div class="ve-py-1 ve-w-100 ve-flex-v-center">
					${btnClose}
				</div>`
					.vee.appendTo(eleModalFooter);

				const iptWidth = veT`<input class="ve-form-control form-control--minimal ve-input-xs ve-text-center ve-mr-1" type="number" value="${this._board.width}" title="宽度">`;
				const iptHeight = veT`<input class="ve-form-control form-control--minimal ve-input-xs ve-text-center ve-mr-1" type="number" value="${this._board.height}" title="高度">`;

				const btnSetDim = veT`<button class="ve-btn ve-btn-default ve-ml-auto ve-btn-xs">设置槽位</div>`
					.vee.onn("click", async () => {
						const w = Number(iptWidth.vee.val());
						const h = Number(iptHeight.vee.val());

						if (w > 10 || h > 10) {
							if (!await InputUiUtil.pGetUserBoolean({title: "面板过多", htmlDescription: "面板数量较多，确定要继续吗？", textYes: "是", textNo: "取消"})) return;
						}

						this._board.setDimensions(w, h);
					});

				veT`<div class="ve-py-1 ve-w-100 ve-split-v-center">
					<div class="ve-w-66 ve-no-shrink ve-flex-v-center">槽位</div>
					<div class="ve-flex-v-center">
						${iptWidth}
						<div title="宽度">宽</div>
						<div class="ve-mx-1 ve-muted">×</div>
						${iptHeight}
						<div title="高度">高</div>
					</div>
				</div>`
					.vee.appendTo(eleModalInner);

				veT`<div class="ve-py-1 ve-w-100 ve-split-v-center">
					<div class="ve-w-66 ve-no-shrink"></div>
					${btnSetDim}
				</div>`
					.vee.appendTo(eleModalInner);

				veT`<hr class="ve-hr-3">`.vee.appendTo(eleModalInner);

				const compSettings = this._board.getCompSettings();

				veT`<label class="ve-py-1 ve-w-100 ve-split-v-center">
					<span class="ve-w-66 ve-no-shrink ve-flex-v-center">关闭帷幕时是否需要确认</span>
					${ComponentUiUtil.getCbBool(compSettings, "isConfirmOnPanelTabClose")}
				</label>`
					.vee.appendTo(eleModalInner);

				veT`<label class="ve-py-1 ve-w-100 ve-split-v-center">
					<span class="ve-w-66 ve-no-shrink ve-flex-v-center">启用历史</span>
					${ComponentUiUtil.getCbBool(compSettings, "isHistoryEnabled")}
				</label>`
					.vee.appendTo(eleModalInner);

				const iptHistorySize = ComponentUiUtil.getIptInt(
					compSettings,
					"historySize",
					10,
					{
						min: 1,
						max: 99,
					},
				);
				compSettings._addHookBase("isHistoryEnabled", () => iptHistorySize.vee.prop("disabled", !compSettings.getIsHistoryEnabled()))();

				veT`<label class="ve-py-1 ve-w-100 ve-split-v-center">
					<span class="ve-w-66 ve-no-shrink ve-flex-v-center">历史大小</span>
					${iptHistorySize}
				</label>`
					.vee.appendTo(eleModalInner);

				veT`<hr class="ve-hr-3">`.vee.appendTo(eleModalInner);

				veT`<label class="ve-py-1 ve-w-100 ve-split-v-center">
					<span class="ve-w-66 ve-no-shrink ve-flex-v-center">切换存档位时保留嵌入内容</span>
					${ComponentUiUtil.getCbBool(compSettings, "isPreserveEmbedsOnSaveSlotChange")}
				</label>`
					.vee.appendTo(eleModalInner);
			});
	}

	/* ----- */

	_render_footer () {
		veT`<div class="ve-flex-col ve-mt-auto">
			${this._compHistory.getBtnToggle()}

			${this._render_getBtnSaveToFile()}
			${this._render_getBtnLoadFromFile()}
			${this._render_getBtnSaveToUrl()}
			${this._render_getBtnReset()}

			${this._render_getBtnToggleLock()}
			${this._render_getBtnToggleFullscreen()}

			${this._render_getBtnSettings()}
		</div>`
			.vee.appendTo(this._wrpSideMenuControls);
	}

	doUpdateHistory () {
		this._compHistory.doUpdateRender();
	}

	/* -------------------------------------------- */

	_getDefaultState () {
		return {
			saveSlotStates: [],

			isLocked: false,
			isFullscreen: false,
		};
	}
}
