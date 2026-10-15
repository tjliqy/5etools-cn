"use strict";

class MakeCards extends BaseComponent {
	static async pInit () {
		await Promise.all([
			PrereleaseUtil.pInit(),
			BrewUtil2.pInit(),
		]);
		await ExcludeUtil.pInitialise();

		MakeCards._ = new MakeCards();
		await MakeCards.utils.pLoadReducedData();
		await MakeCards._.pInit();

		window.dispatchEvent(new Event("toolsLoaded"));
	}

	constructor () {
		super();

		this._list = null;

		this._modalFilterItems = new ModalFilterItems({namespace: "makecards.items"});
		this._modalFilterBestiary = new ModalFilterBestiary({namespace: "makecards.bestiary"});
		this._modalFilterSpells = new ModalFilterSpells({namespace: "makecards.spells"});
		this._modalFilterRaces = new ModalFilterRaces({namespace: "makecards.race"});
		this._modalFilterBackgrounds = new ModalFilterBackgrounds({namespace: "makecards.background"});
		this._modalFilterFeats = new ModalFilterFeats({namespace: "makecards.feat"});
		this._modalFilterOptionalFeatures = new ModalFilterOptionalFeatures({namespace: "makecards.optionalfeatures"});

		this._doSaveStateDebounced = MiscUtil.debounce(() => this._pDoSaveState(), VeCt.DUR_DEBOUNCE_SAVE);
	}

	async pInit () {
		await SearchUiUtil.pDoGlobalInit();
		// Do this asynchronously, to avoid blocking the load
		SearchWidget.pDoGlobalInit();
		await this._pDoLoadState();
		this.render();
	}

	render () {
		this._addHookAll("state", () => this._doSaveStateDebounced());

		this._render_configSection();
		this._render_cardList();
	}

	_render_configSection () {
		const wrpConfig = veEs(`#wrp_config`).vee.empty();

		const btnResetDefaults = veT`<button class="ve-btn ve-btn-default ve-btn-xs">重置</button>`
			.vee.onn("click", () => {
				Object.entries(MakeCards._AVAILABLE_TYPES)
					.forEach(([entityType, typeMeta]) => {
						const kColor = `color_${entityType}`;
						const kIcon = `icon_${entityType}`;

						this._state[kColor] = typeMeta.colorDefault;
						this._state[kIcon] = typeMeta.iconDefault;
					});
			});

		veT(wrpConfig)`<h5 class="ve-split-v-center"><div>新卡牌默认设置</div>${btnResetDefaults}</h5>
		<div class="ve-flex-v-center ve-bold">
			<div class="ve-col-4 ve-text-center ve-pr-2">类型</div>
			<div class="ve-col-4 ve-text-center ve-p-2">颜色</div>
			<div class="ve-col-4 ve-text-center ve-pl-2">图标</div>
		</div>`;

		const getColorIconConfigRow = (entityType) => {
			const entityMeta = MakeCards._AVAILABLE_TYPES[entityType];

			const kColor = `color_${entityType}`;
			const kIcon = `icon_${entityType}`;
			const iptColor = ComponentUiUtil.getIptColor(this, kColor).vee.addClass("cards-cfg__ipt-color");
			const dispIcon = veT`<div class="cards__disp-btn-icon"></div>`;
			const btnChooseIcon = veT`<button class="ve-btn ve-btn-xs ve-btn-default cards__btn-choose-icon">${dispIcon}</button>`
				.vee.onn("click", async () => {
					const icon = await MakeCards._pGetUserIcon(this._state[kIcon]);
					if (icon) this._state[kIcon] = icon;
				});
			const hkIcon = () => dispIcon.vee.css({backgroundImage: `url('${MakeCards._getIconPath(this._state[kIcon])}')`});
			this._addHookBase(kIcon, hkIcon);
			hkIcon();

			return veT`<div class="ve-flex-v-center stripe-even ve-m-1">
				<div class="ve-col-4 ve-flex-vh-center ve-pr-2">${entityMeta.searchTitle}</div>
				<div class="ve-col-4 ve-flex-vh-center ve-p-2">${iptColor}</div>
				<div class="ve-col-4 ve-flex-vh-center ve-pl-2">${btnChooseIcon}</div>
			</div>`;
		};

		Object.keys(MakeCards._AVAILABLE_TYPES).forEach(it => getColorIconConfigRow(it).vee.appendTo(wrpConfig));
	}

	_render_cardList () {
		const wrpContainer = veEs(`#wrp_main`).vee.empty();

		// region Search bar/add button
		const menuSearch = ContextUtil.getMenu(this._render_getContextMenuOptions());

		const iptSearch = veT`<input type="search" class="ve-form-control ve-mr-2" placeholder="搜索卡牌...">`;
		const btnAdd = veT`<button class="ve-btn ve-btn-primary ve-mr-2"><span class="glyphicon glyphicon-plus"></span> 添加</button>`
			.vee.onn("click", evt => ContextUtil.pOpenMenu(evt, menuSearch));
		const btnReset = veT`<button class="ve-btn ve-btn-danger ve-mr-2"><span class="glyphicon glyphicon-trash"></span> 重置</button>`
			.vee.onn("click", async () => {
				if (!await InputUiUtil.pGetUserBoolean({title: "重置", htmlDescription: "你确定吗？", textYes: "是的", textNo: "取消"})) return;
				this._list.removeAllItems();
				this._list.update();
				this._doSaveStateDebounced();
			});
		const btnExport = veT`<button class="ve-btn ve-btn-default"><span class="glyphicon glyphicon-download"></span> 导出 JSON</button>`
			.vee.onn("click", () => {
				const toDownload = this._list.items.map(it => {
					const entityMeta = MakeCards._AVAILABLE_TYPES[it.values.entityType];
					return {
						count: it.values.count,
						color: it.values.color,
						title: it.name,
						icon: it.values.icon,
						icon_back: it.values.icon,
						contents: entityMeta.fnGetContents(it.values.entity),
						tags: entityMeta.fnGetTags(it.values.entity),
					};
				});
				DataUtil.userDownload("rpg-cards", toDownload, {isSkipAdditionalMetadata: true});
			});
		veT`<div class="ve-w-100 ve-no-shrink ve-flex-v-center ve-mb-3">${iptSearch}${btnAdd}${btnReset}${btnExport}</div>`.vee.appendTo(wrpContainer);
		// endregion

		// region Mass operations bar
		const getSelCards = () => {
			const out = this._list.visibleItems.filter(it => it.data.cbSel.vee.prop("checked"));
			if (!out.length) {
				JqueryUtil.doToast({content: "请先选择卡牌！", type: "warning"});
				return null;
			}
			return out;
		};

		const menuMass = ContextUtil.getMenu([
			new ContextUtil.Action(
				"设置颜色",
				async () => {
					const sel = getSelCards();
					if (!sel) return;
					const rgb = await InputUiUtil.pGetUserColor({default: MiscUtil.randomColor()});
					if (rgb) sel.forEach(it => it.data.setColor(rgb));
				},
			),
			new ContextUtil.Action(
				"设置图标",
				async () => {
					const sel = getSelCards();
					if (!sel) return;
					const icon = await MakeCards._pGetUserIcon();
					if (icon) sel.forEach(it => it.data.setIcon(icon));
				},
			),
			new ContextUtil.Action(
				"移除",
				async () => {
					const sel = getSelCards();
					if (!sel) return;
					sel.forEach(it => this._list.removeItemById(it.getId()));
					this._list.update();
					this._doSaveStateDebounced();
				},
			),
		]);

		const btnMass = veT`<button class="ve-btn ve-btn-xs ve-btn-default" title="对所选卡牌执行操作">批量操作...</button>`
			.vee.onn("click", evt => ContextUtil.pOpenMenu(evt, menuMass));
		veT`<div class="ve-w-100 ve-no-shrink ve-flex-v-center ve-mb-2">${btnMass}</div>`.vee.appendTo(wrpContainer);
		// endregion

		// region Main content
		// Headers
		const cbSelAll = veT`<input type="checkbox" title="全选">`
			.vee.onn("click", () => {
				const isSel = cbSelAll.vee.prop("checked");
				this._list.visibleItems.forEach(it => it.data.cbSel.vee.prop("checked", isSel));
			});
		veT`<div class="ve-w-100 ve-no-shrink ve-flex-v-center ve-bold">
			<div class="ve-col-1 ve-mr-2 ve-flex-vh-center">${cbSelAll}</div>
			<div class="ve-col-3 ve-mr-2 ve-flex-vh-center">名称</div>
			<div class="ve-col-1-5 ve-mr-2 ve-flex-vh-center">来源</div>
			<div class="ve-col-1-5 ve-mr-2 ve-flex-vh-center">类型</div>
			<div class="ve-col-1-1 ve-mr-2 ve-flex-vh-center">颜色</div>
			<div class="ve-col-1-1 ve-mr-2 ve-flex-vh-center">图表</div>
			<div class="ve-col-1 ve-mr-2 ve-flex-vh-center">数量</div>
			<div class="ve-col-1-1 ve-flex-v-center ve-flex-h-right"></div>
		</div>`.vee.appendTo(wrpContainer);

		const wrpList = veT`<div class="ve-w-100 ve-h-100"></div>`;
		veT`<div class="ve-flex-col ve-h-100 ve-w-100 ve-overflow-y-auto ve-mt-2 ve-overflow-x-hidden">${wrpList}</div>`.vee.appendTo(wrpContainer);
		this._list = new List({iptSearch, wrpList});
		this._list.init();
		// endregion
	}

	_render_getContextMenuOptions () {
		return [
			...this._render_getContextMenuOptionsSearch(),
			null,
			...this._render_getContextMenuOptionsFilter(),
			null,
			...this._render_getContextMenuOptionsSublist(),
		];
	}

	_render_getContextMenuOptionsSearch () {
		return Object.entries(MakeCards._AVAILABLE_TYPES).map(([entityType, it]) => new ContextUtil.Action(
			`搜索${it.searchTitle}`,
			async () => {
				const fromSearch = await it.pFnSearch();
				if (!fromSearch) return;

				const existing = this._list.items.find(it => it.data.page === fromSearch.page && it.values.source === fromSearch.source && it.data.hash === fromSearch.hash);
				if (existing) {
					existing.values.count++;
					existing.data.iptCount.vee.val(existing.values.count);
					return this._doSaveStateDebounced();
				}

				const listItem = await this._pGetListItem({page: fromSearch.page, source: fromSearch.source, hash: fromSearch.hash, entityType}, true);
				this._list.addItem(listItem);
				this._list.update();
				this._doSaveStateDebounced();
			},
		));
	}

	_render_getContextMenuOptionsFilter () {
		return Object.entries(MakeCards._AVAILABLE_TYPES).map(([entityType, type]) => new ContextUtil.Action(
			`筛选${type.searchTitle}`,
			async () => {
				const modalFilter = (() => {
					switch (entityType) {
						case "creature": return this._modalFilterBestiary;
						case "item": return this._modalFilterItems;
						case "spell": return this._modalFilterSpells;
						case "race": return this._modalFilterRaces;
						case "background": return this._modalFilterBackgrounds;
						case "feat": return this._modalFilterFeats;
						case "optionalfeature": return this._modalFilterOptionalFeatures;
						default: throw new Error(`Unhandled branch!`);
					}
				})();
				const selected = await modalFilter.pGetUserSelection();
				if (selected == null || !selected.length) return;

				// do this in serial to avoid bombarding the hover cache
				const len = selected.length;
				for (let i = 0; i < len; ++i) {
					const filterListItem = selected[i];
					const listItem = await this._pGetListItem({page: type.page, source: filterListItem.values.sourceJson, hash: filterListItem.data.hash, entityType}, true);
					this._list.addItem(listItem);
				}
				this._list.update();
				this._doSaveStateDebounced();
			},
		));
	}

	_render_getContextMenuOptionsSublist () {
		return Object.entries(MakeCards._AVAILABLE_TYPES).map(([entityType, type]) => new ContextUtil.Action(
			`从${type.pageTitle}收藏列表加载`,
			async () => {
				const storageKey = StorageUtil.getPageKey("sublist", type.page);
				const pinnedList = await StorageUtil.pGet(storageKey);

				if (!(pinnedList && pinnedList.items && pinnedList.items.length)) {
					return JqueryUtil.doToast({content: "没有可添加的内容！请先在对应页面添加或固定数据。", type: "warning"});
				}

				const listItems = await Promise.all(pinnedList.items.map(it => {
					const [_, source] = it.h.split(HASH_PART_SEP)[0].split(HASH_LIST_SEP);
					return this._pGetListItem({page: type.page, source, hash: it.h, entityType}, true);
				}));

				listItems.forEach(it => this._list.addItem(it));
				this._list.update();
				this._doSaveStateDebounced();
			},
		));
	}

	_getStateForType (entityType) {
		const kColor = `color_${entityType}`;
		const kIcon = `icon_${entityType}`;
		const color = this._state[kColor];
		const icon = this._state[kIcon];
		return {color, icon};
	}

	async _pGetListItem (cardMeta, isNewCard) {
		const uid = CryptUtil.uid();

		if (isNewCard) {
			const {color, icon} = this._getStateForType(cardMeta.entityType);
			cardMeta.color = cardMeta.color || color;
			cardMeta.icon = cardMeta.icon || icon;
		}
		cardMeta.count = cardMeta.count || 1;

		const loaded = await DataLoader.pCacheAndGet(cardMeta.page, cardMeta.source, cardMeta.hash);

		const cbSel = veT`<input type="checkbox">`;

		const iptRgb = veT`<input type="color" class="ve-form-control ve-input-xs form-control--minimal">`
			.vee.val(cardMeta.color)
			.vee.onn("change", () => setColor(iptRgb.vee.val()));
		const setColor = (rgb) => {
			iptRgb.vee.val(rgb);
			listItem.values.color = rgb;
			this._doSaveStateDebounced();
		};

		const dispIcon = veT`<div class="cards__disp-btn-icon"></div>`
			.vee.css({backgroundImage: `url('${MakeCards._getIconPath(cardMeta.icon)}')`});
		const btnIcon = veT`<button class="ve-btn ve-btn-default ve-btn-xs cards__btn-choose-icon">${dispIcon}</button>`
			.vee.onn("click", async () => {
				const icon = await MakeCards._pGetUserIcon(listItem.values.icon);
				if (icon) setIcon(icon);
			});
		const setIcon = (icon) => {
			listItem.values.icon = icon;
			dispIcon.vee.css({backgroundImage: `url('${MakeCards._getIconPath(icon)}')`});
			this._doSaveStateDebounced();
		};

		const iptCount = veT`<input class="ve-form-control form-control--minimal ve-input-xs ve-text-center">`
			.vee.onn("change", () => {
				const asNum = UiUtil.strToInt(iptCount.vee.val(), 1, {min: 1, fallbackOnNaN: 1});
				listItem.values.count = asNum;
				iptCount.vee.val(asNum);
				this._doSaveStateDebounced();
			})
			.vee.val(cardMeta.count);

		const btnCopy = veT`<button class="ve-btn ve-btn-default ve-btn-xs ve-mr-2" title="复制 JSON（按 Shift 查看 JSON）"><span class="glyphicon glyphicon-copy"></span></button>`
			.vee.onn("click", async evt => {
				const entityMeta = MakeCards._AVAILABLE_TYPES[listItem.values.entityType];
				const toCopy = {
					count: listItem.values.count,
					color: listItem.values.color,
					title: listItem.name,
					icon: listItem.values.icon,
					icon_back: listItem.values.icon,
					contents: entityMeta.fnGetContents(listItem.values.entity),
					tags: entityMeta.fnGetTags(listItem.values.entity),
				};

				if (evt.shiftKey) {
					Renderer.hover.getShowWindow(
						Renderer.hover.getHoverContent_statsCode(toCopy),
						Renderer.hover.getWindowPositionFromEvent(evt),
						{
							title: `卡牌数据 \u2014 ${listItem.name}`,
							isPermanent: true,
							isBookContent: true,
						},
					);
				} else {
					await MiscUtil.pCopyTextToClipboard(JSON.stringify(toCopy, null, 2));
					JqueryUtil.showCopiedEffect(btnCopy, {text: "已复制 JSON！"});
				}
			});
		const btnDelete = veT`<button class="ve-btn ve-btn-danger ve-btn-xs" title="移除"><span class="glyphicon glyphicon-trash"></span></button>`
			.vee.onn("click", () => {
				this._list.removeItemById(uid);
				this._list.update();
				this._doSaveStateDebounced();
			});

		const ele = veT`<label class="ve-flex-v-center ve-my-1 ve-w-100 ve-lst__row ve-lst__row-border ve-lst__row-inner">
			<div class="ve-col-1 ve-mr-2 ve-flex-vh-center">${cbSel}</div>
			<div class="ve-col-3 ve-mr-2 ve-flex-v-center">${Renderer.get().render(`{@${Parser.getPropTag(cardMeta.entityType)} ${DataUtil.proxy.getUid(loaded.__prop, loaded, {isMaintainCase: true})}}`)}</div>
			<div class="ve-col-1-5 ve-mr-2 ve-flex-vh-center ${Parser.sourceJsonToSourceClassname(loaded.source)}" title="${Parser.sourceJsonToFull(loaded.source).qq()}">${Parser.sourceJsonToAbv(loaded.source).qq()}</div>
			<div class="ve-col-1-5 ve-mr-2 ve-flex-vh-center">${Parser.getPropDisplayName(cardMeta.entityType)}</div>
			<div class="ve-col-1-1 ve-mr-2 ve-flex-vh-center">${iptRgb}</div>
			<div class="ve-col-1-1 ve-mr-2 ve-flex-vh-center">${btnIcon}</div>
			<div class="ve-col-1 ve-mr-2 ve-flex-vh-center">${iptCount}</div>
			<div class="ve-col-1-1 ve-flex-v-center ve-flex-h-right">${btnCopy}${btnDelete}</div>
		</label>`;

		const listItem = new ListItem({
			id: uid,
			ele,
			name: loaded.name,
			values: {
				source: cardMeta.source,
				color: cardMeta.color,
				icon: cardMeta.icon,
				count: cardMeta.count,
				entityType: cardMeta.entityType,
				ENG_name: cardMeta.ENG_name,
				ENG_hash: UrlUtil.autoEncodeEngHash(cardMeta),
				entity: loaded,
			},
			data: {
				hash: cardMeta.hash,
				page: cardMeta.page,
				cbSel,
				iptCount,
				setColor,
				setIcon,
			},
		});
		return listItem;
	}

	// region contents
	static _ct_subtitle (val) { return `subtitle | ${val}`; }
	static _ct_rule () { return `rule`; }
	static _ct_property (title, val) { return `property | ${title} | ${val}`; }
	static _ct_fill (size) { return `fill ${size}`; }
	static _ct_text (val) { return `text | ${val}`; }
	static _ct_section (val) { return `section | ${val}`; }
	static _ct_description (title, val) { return `description | ${title} | ${val}`; }
	static _ct_bullet (val) { return `bullet | ${val}`; }
	static _ct_boxes (count, size = 1.2) { return `boxes | ${count} | ${size}`; }
	static _ct_dndstats (...attrs) { return `dndstats | ${attrs.join(" | ")}`; }

	static _ct_htmlToText (html) {
		return veT`<div>${html}</div>`.vee.txt().trim();
	}
	static _ct_renderEntries (entries, depth = 0) {
		if (!entries || !entries.length) return [];

		return entries.map(ent => {
			const rendSub = ent.rendered || RendererCard.get().render(ent, depth);
			return rendSub.split("\n").filter(Boolean);
		}).flat();
	}

	static _getCardContents_creature (mon) {
		const renderer = RendererCard.get();

		const {
			entsTrait,
			entsAction,
			entsBonusAction,
			entsReaction,
			entsLegendaryAction,
			entsMythicAction,
		} = Renderer.monster.getSubEntries(mon, {renderer});

		return [
			this._ct_subtitle(Renderer.monster.getTypeAlignmentPart(mon, {renderer})),
			this._ct_rule(),
			this._ct_property("护甲等级", this._ct_htmlToText(Parser.acToFull(mon.ac))),
			this._ct_property("生命值", this._ct_htmlToText(Renderer.monster.getRenderedHp(mon.hp))),
			...(mon.resource || []).map(res => this._ct_property(res.name, this._ct_htmlToText(Renderer.monster.getRenderedResource(res)))),
			this._ct_property("速度", this._ct_htmlToText(Parser.getSpeedString(mon))),
			this._ct_rule(),
			this._ct_dndstats(...Parser.ABIL_ABVS.map(it => mon[it])),
			this._ct_rule(),
			mon.save ? this._ct_property("豁免检定", this._ct_htmlToText(Renderer.monster.getSavesPart(mon))) : null,
			mon.skill ? this._ct_property("技能", this._ct_htmlToText(Renderer.monster.getSkillsString(Renderer.get(), mon))) : null,
			mon.tool ? this._ct_property("技能", this._ct_htmlToText(Renderer.monster.getToolsString(Renderer.get(), mon))) : null,
			mon.vulnerable ? this._ct_property("伤害易伤", this._ct_htmlToText(Parser.getFullImmRes(mon.vulnerable))) : null,
			mon.resist ? this._ct_property("伤害抗性", this._ct_htmlToText(Parser.getFullImmRes(mon.resist))) : null,
			mon.immune ? this._ct_property("伤害免疫", this._ct_htmlToText(Parser.getFullImmRes(mon.immune))) : null,
			mon.conditionImmune ? this._ct_property("状态免疫", this._ct_htmlToText(Parser.getFullCondImm(mon.conditionImmune))) : null,
			this._ct_property("感官", this._ct_htmlToText(Renderer.monster.getSensesPart(mon, {isForcePassive: true}))),
			this._ct_property("语言", this._ct_htmlToText(Renderer.monster.getRenderedLanguages(mon.languages))),
			this._ct_property("挑战等级", this._ct_htmlToText(Renderer.monster.getChallengeRatingPart(mon))),
			this._ct_rule(),
			...(entsTrait?.length ? this._ct_renderEntries(entsTrait, 2) : []),
			entsAction?.length ? this._ct_section("动作") : null,
			...(entsAction?.length ? this._ct_renderEntries(entsAction, 2) : []),
			entsBonusAction?.length ? this._ct_section("附赠动作") : null,
			...(entsBonusAction?.length ? this._ct_renderEntries(entsBonusAction, 2) : []),
			entsReaction?.length ? this._ct_section("反应") : null,
			...(entsReaction?.length ? this._ct_renderEntries(entsReaction, 2) : []),
			entsLegendaryAction?.length ? this._ct_section("传奇动作") : null,
			entsLegendaryAction?.length ? this._ct_text(this._ct_htmlToText(Renderer.monster.getLegendaryActionIntro(mon, {renderer}))) : null,
			...(entsLegendaryAction?.length ? this._ct_renderEntries(entsLegendaryAction, 2) : []),
			entsMythicAction?.length ? this._ct_section("神话动作") : null,
			entsMythicAction ? this._ct_text(this._ct_htmlToText(Renderer.monster.getSectionIntro(mon, {renderer, prop: "mythic"}))) : null,
			...(entsMythicAction?.length ? this._ct_renderEntries(entsMythicAction, 2) : []),
		].filter(Boolean);
	}

	static _getCardContents_spell (sp) {
		const higherLevel = sp.entriesHigherLevel ? (() => {
			const ents = sp.entriesHigherLevel.length === 1 && sp.entriesHigherLevel[0].name && sp.entriesHigherLevel[0].name.toLowerCase() === "at higher levels"
				? sp.entriesHigherLevel[0].entries
				: sp.entriesHigherLevel;

			return [
				this._ct_section("以更高环阶施法"),
				...this._ct_renderEntries(ents, 2),
			];
		})() : null;

		return [
			this._ct_subtitle(Parser.spLevelSchoolMetaToFull(sp.level, sp.school, sp.meta, sp.subschools)),
			this._ct_rule(),
			this._ct_property("施法时间", Parser.spTimeListToFull(sp.time, sp.meta)),
			this._ct_property("距离", Parser.spRangeToFull(sp.range)),
			this._ct_property("成分", Parser.spComponentsToFull(sp.components, sp.level, {isPlainText: true})),
			this._ct_property("持续时间", Parser.spDurationToFull(sp.duration, {isPlainText: true})),
			this._ct_rule(),
			...this._ct_renderEntries(sp.entries, 2),
			...(higherLevel || []),
		].filter(Boolean);
	}

	static _getCardContents_item (item) {
		MakeCards.utils.enhanceItemAlt(item);

		const {typeRarityHtml, subTypeHtml, tierHtml} = Renderer.item.getTypeRarityAndAttunementHtmlParts(item);
		const [ptDamage, ptProperties] = Renderer.item.getRenderedDamageAndProperties(item);
		const ptMastery = Renderer.item.getRenderedMastery(item, {isSkipPrefix: true});
		const ptWeight = Parser.itemWeightToFull(item);
		const ptValue = Parser.itemValueToFullMultiCurrency(item);
		const ptDamageCt = this._ct_htmlToText(ptDamage);
		const ptPropertiesCt = this._ct_htmlToText(ptProperties);

		const itemEntries = [];
		if (item._fullEntries || (item.entries && item.entries.length)) {
			itemEntries.push(...(item._fullEntries || item.entries));
		}

		if (item._fullAdditionalEntries || item.additionalEntries) {
			itemEntries.push(...(item._fullAdditionalEntries || item.additionalEntries));
		}

		return [
			typeRarityHtml ? this._ct_htmlToText(this._ct_subtitle(typeRarityHtml)) : null,
			ptDamageCt ? this._ct_property(ptDamageCt.startsWith("AC") ? "护甲等级" : "伤害", ptDamageCt) : null,
			ptPropertiesCt ? this._ct_property("属性", ptPropertiesCt.uppercaseFirst()) : null,
			ptMastery ? this._ct_property("精通", ptMastery) : null,
			subTypeHtml ? this._ct_property("类型", subTypeHtml) : null,
			tierHtml ? this._ct_property("层级", tierHtml) : null,
			ptWeight ? this._ct_property("重量", ptWeight) : null,
			ptValue ? this._ct_property("价格", ptValue) : null,
			itemEntries.length ? this._ct_rule() : null,
			...this._ct_renderEntries(itemEntries, 2),
			item.charges ? this._ct_boxes(item.charges) : null,
		].filter(Boolean);
	}

	static _getCardContents_race (race) {
		return [
			this._ct_property("属性值", Renderer.getAbilityData(race.ability).asText),
			this._ct_property("体型", (race.size || [Parser.SZ_VARIES]).map(sz => Parser.sizeAbvToFull(sz)).join("/")),
			this._ct_property("速度", Parser.getSpeedString(race)),
			this._ct_rule(),
			...this._ct_renderEntries(race.entries, 2),
		].filter(Boolean);
	}

	static _getCardContents_background (bg) {
		return [
			...this._ct_renderEntries(bg.entries, 2),
		].filter(Boolean);
	}

	static _getCardContents_feat (feat) {
		const prerequisite = Renderer.feat.getJoinedCategoryPrerequisites(
			feat.category,
			Renderer.utils.prerequisite.getHtml(feat.prerequisite, {isListMode: true}),
		);
		const ptRepeatable = Renderer.utils.getRepeatableHtml(feat, {isListMode: true});
		Renderer.feat.initFullEntries(feat);
		return [
			(prerequisite && prerequisite !== "\u2014") ? this._ct_property("类型/先决条件", prerequisite) : null,
			(ptRepeatable && ptRepeatable !== "\u2014") ? this._ct_property("可重复", ptRepeatable) : null,
			(prerequisite || ptRepeatable) ? this._ct_rule() : null,
			...this._ct_renderEntries(feat._fullEntries || feat.entries, 2),
		].filter(Boolean);
	}

	static _getCardContents_optionalfeature (optfeat) {
		const prerequisite = Renderer.utils.prerequisite.getHtml(optfeat.prerequisite, {isListMode: true});
		Renderer.feat.initFullEntries(optfeat);
		return [
			prerequisite ? this._ct_property("先决条件", prerequisite) : null,
			prerequisite ? this._ct_rule() : null,
			...this._ct_renderEntries(optfeat._fullEntries || optfeat.entries, 2),
		].filter(Boolean);
	}
	// endregion

	static _getIconPath (iconName) {
		const classIconNames = [
			"class-barbarian",
			"class-bard",
			"class-cleric",
			"class-druid",
			"class-fighter",
			"class-monk",
			"class-paladin",
			"class-ranger",
			"class-rogue",
			"class-sorcerer",
			"class-warlock",
			"class-wizard",
			"class-barbarian",
			"class-bard",
			"class-cleric",
			"class-druid",
			"class-fighter",
			"class-monk",
			"class-paladin",
			"class-ranger",
			"class-rogue",
			"class-sorcerer",
			"class-warlock",
			"class-wizard",
		];

		if (classIconNames.includes(iconName)) {
			return `https://rpg-cards.vercel.app/icons/${iconName}.png`;
		}
		return `https://rpg-cards.vercel.app/icons/${iconName}.svg`;
	}

	static _pGetUserIcon (initialVal) {
		return new Promise(resolve => {
			const comp = BaseComponent.fromObject({
				selectedIcon: initialVal || null,
				searchTerm: "",
			});

			const btnMetas = icon_names
				.reduce((accum, iconName) => {
					const btn = veT`<button class="ve-btn ve-btn-default ve-m-2 ve-no-grow ve-self-flex-start">
						<img src="${MakeCards._getIconPath(iconName)}" title="${iconName}" loading="lazy" class="ve-w-50p ve-h-50p">
					</button>`
						.vee.onn("click", () => {
							comp._state.selectedIcon = iconName;
						});

					comp._addHookBase("selectedIcon", () => {
						btn.vee.toggleClass("ve-active", comp._state.selectedIcon === iconName);
					})();

					accum[iconName] = {btn};

					return accum;
				}, {});

			comp._addHookBase("searchTerm", () => {
				Object.entries(btnMetas)
					.forEach(([iconName, btnMeta]) => {
						btnMeta.btn.vee.toggle(iconName.includes(comp._state.searchTerm) || iconName === comp._state.selectedIcon);
					});
			});

			const iptSearch = veT`<input class="ve-form-control ve-mb-2">`;

			UiUtil.bindTypingEnd({
				ipt: iptSearch,
				fnKeyup: () => comp._state.searchTerm = iptSearch.vee.val().trim().toLowerCase(),
			});

			const btnOk = veT`<button class="ve-btn ve-btn-default">确认</button>`
				.vee.onn("click", () => doClose(true));

			const {eleModalInner, doClose} = UiUtil.getShowModal({
				title: "选择图标",
				cbClose: (isDataEntered) => {
					if (!isDataEntered) return resolve(null);
					if (!comp._state.selectedIcon) return resolve(null);
					else return resolve(comp._state.selectedIcon);
				},
				isHeight100: true,
				isMaxWidth640p: true,
			});

			veT(eleModalInner)`
				<div>${iptSearch}</div>
				<div class="ve-overflow-y-auto ve-flex ve-flex-wrap ve-w-100 ve-min-h-0 ve-h-100 ve-py-1 ve-bb-1p ve-mb-1 ve-smooth-scroll">
					${Object.values(btnMetas).map(({btn}) => btn)}
				</div>
				<div class="ve-flex-vh-center">${btnOk}</div>
			`;

			iptSearch.focus();
			iptSearch.select();
		});
	}

	// region persistence
	async _pDoSaveState () {
		const toSave = this.getSaveableState();
		await StorageUtil.pSetForPage(MakeCards._STORAGE_KEY, toSave);
	}

	async _pDoLoadState () {
		const toLoad = await StorageUtil.pGetForPage(MakeCards._STORAGE_KEY);
		if (toLoad != null) this.setStateFrom(toLoad);
	}

	getSaveableState () {
		return {
			state: this.getBaseSaveableState(),
			listItems: this._list.items.map(it => ({
				page: it.data.page,
				source: it.values.source,
				hash: it.data.hash,
				color: it.values.color,
				icon: it.values.icon,
				count: it.values.count,
				entityType: it.values.entityType,
			})),
		};
	}

	setStateFrom (toLoad) {
		this.setBaseSaveableStateFrom(toLoad.state);
		Promise.all(toLoad.listItems.map(async toLoad => this._pGetListItem(toLoad)))
			.then(initialListItems => {
				if (initialListItems.length) {
					initialListItems.sort((a, b) => SortUtil.ascSortLower(a.name, b.name)).forEach(it => this._list.addItem(it));
					this._list.update();
				}
			});
	}
	// endregion

	_getDefaultState () {
		const cpy = MiscUtil.copy(MakeCards._DEFAULT_STATE);
		Object.entries(MakeCards._AVAILABLE_TYPES).forEach(([k, v]) => {
			const kColor = `color_${k}`;
			const kIcon = `icon_${k}`;
			cpy[kColor] = v.colorDefault || MakeCards._DEFAULT_STATE;
			cpy[kIcon] = v.iconDefault || MakeCards._ICON_DEFAULT;
		});
		return cpy;
	}
}
MakeCards._DEFAULT_STATE = {

};
MakeCards._COLOR_DEFAULT = "#333333";
MakeCards._ICON_DEFAULT = "perspective-dice-six-faces-random";
MakeCards._STORAGE_KEY = "cardState";
MakeCards._AVAILABLE_TYPES = {
	creature: {
		searchTitle: "生物",
		pageTitle: "怪物图鉴",
		isPageTitleSkipSuffix: true,
		page: UrlUtil.PG_BESTIARY,
		colorDefault: "#008000",
		iconDefault: "imp-laugh",
		pFnSearch: SearchWidget.pGetUserCreatureSearch,
		fnGetContents: MakeCards._getCardContents_creature.bind(MakeCards),
		fnGetTags: (mon) => {
			const types = Parser.monTypeToFullObj(mon.type);
			const cr = mon.cr == null ? "挑战等级未知" : `挑战等级 ${(mon.cr.cr || mon.cr)}`;
			return ["生物", Parser.sourceJsonToAbv(mon.source), ...types.types, cr, Renderer.utils.getRenderedSize(mon.size)];
		},
	},
	item: {
		searchTitle: "物品",
		pageTitle: "物品",
		page: UrlUtil.PG_ITEMS,
		colorDefault: "#696969",
		iconDefault: "crossed-swords",
		pFnSearch: SearchWidget.pGetUserItemSearch,
		fnGetContents: MakeCards._getCardContents_item.bind(MakeCards),
		fnGetTags: (item) => {
			const {textTypes} = Renderer.item.getRenderableTypeEntriesMeta(item);
			return ["物品", Parser.sourceJsonToAbv(item.source), ...textTypes];
		},
	},
	spell: {
		searchTitle: "法术",
		pageTitle: "法术",
		page: UrlUtil.PG_SPELLS,
		colorDefault: "#4a6898",
		iconDefault: "magic-swirl",
		pFnSearch: SearchWidget.pGetUserSpellSearch,
		fnGetContents: MakeCards._getCardContents_spell.bind(MakeCards),
		fnGetTags: (spell) => {
			const out = [
				"法术",
				Parser.sourceJsonToAbv(spell.source),
				Parser.spLevelToFullLevelText(spell.level),
				Parser.spSchoolAbvToFull(spell.school),
			];
			const fromClassList = Renderer.spell.getCombinedClasses(spell, "fromClassList");
			const fromOptionalClassList = Renderer.spell.getCombinedClasses(spell, "fromClassListVariant");
			if (fromClassList.length) {
				const [current] = Parser.spClassesToCurrentAndLegacy(fromClassList);
				current.forEach(it => out.push(it.name));
			}
			if (fromOptionalClassList.length) {
				const [currentOptional] = Parser.spVariantClassesToCurrentAndLegacy(fromOptionalClassList);
				currentOptional.forEach(it => out.push(it.name));
			}
			if (spell.duration.filter(d => d.concentration).length) out.push("专注");
			if (spell.meta?.ritual) out.push("仪式");
			return out;
		},
	},
	race: {
		searchTitle: "种族",
		pageTitle: "种族",
		page: UrlUtil.PG_RACES,
		colorDefault: "#a7894b",
		iconDefault: "family-tree",
		pFnSearch: SearchWidget.pGetUserRaceSearch,
		fnGetContents: MakeCards._getCardContents_race.bind(MakeCards),
		fnGetTags: (race) => {
			return ["种族", Parser.sourceJsonToAbv(race.source)];
		},
	},
	background: {
		searchTitle: "背景",
		pageTitle: "背景",
		page: UrlUtil.PG_BACKGROUNDS,
		colorDefault: "#a74b8d",
		iconDefault: "farmer",
		pFnSearch: SearchWidget.pGetUserBackgroundSearch,
		fnGetContents: MakeCards._getCardContents_background.bind(MakeCards),
		fnGetTags: (bg) => {
			return ["背景", Parser.sourceJsonToAbv(bg.source)];
		},
	},
	feat: {
		searchTitle: "专长",
		pageTitle: "专长",
		page: UrlUtil.PG_FEATS,
		colorDefault: "#aca300",
		iconDefault: "mighty-force",
		pFnSearch: SearchWidget.pGetUserFeatSearch,
		fnGetContents: MakeCards._getCardContents_feat.bind(MakeCards),
		fnGetTags: (feat) => {
			return ["专长", Parser.sourceJsonToAbv(feat.source)];
		},
	},
	optionalfeature: {
		searchTitle: "选项／特性",
		pageTitle: "选项／特性",
		page: UrlUtil.PG_OPT_FEATURES,
		colorDefault: "#8c6a00",
		iconDefault: "checkbox-tree",
		pFnSearch: SearchWidget.pGetUserOptionalFeatureSearch,
		fnGetContents: MakeCards._getCardContents_optionalfeature.bind(MakeCards),
		fnGetTags: (optfeat) => {
			return ["可选特性", Parser.sourceJsonToAbv(optfeat.source)];
		},
	},
	// TODO add more entities
};
MakeCards._ = null;
window.addEventListener("load", () => MakeCards.pInit());

MakeCards.utils = class {
	static async pLoadReducedData () {
		const data = await DataUtil.loadJSON(`${Renderer.get().baseUrl}data/makecards.json`);
		data.reducedItemProperty.forEach(p => MakeCards.utils._addItemProperty(p));
		data.reducedItemType.forEach(t => {
			if (t.abbreviation === Parser.ITM_TYP_ABV__VEHICLE_WATER && t.source === Parser.SRC_PHB) {
				const cpy = MiscUtil.copy(t);
				cpy.abbreviation = Parser.ITM_TYP_ABV__VEHICLE_AIR;
				cpy.source = Parser.SRC_DMG;
				MakeCards.utils._addItemType(cpy);
			}
			MakeCards.utils._addItemType(t);
		});
	}

	// region items
	static _addItemProperty (ent) {
		const lookupSource = ent.source.toLowerCase();
		const lookupAbv = ent.abbreviation.toLowerCase();

		if (MiscUtil.get(MakeCards.utils._itemPropertyMap, lookupSource, lookupAbv)) return;

		if (ent.entries || ent.entriesTemplate) {
			const cpy = MiscUtil.copy(ent);
			MiscUtil.set(MakeCards.utils._itemPropertyMap, lookupSource, lookupAbv, ent.name ? cpy : {
				...cpy,
				name: ent.entries[0].name.toLowerCase(),
			});
			return;
		}

		MiscUtil.set(MakeCards.utils._itemPropertyMap, lookupSource, lookupAbv, {});
	}

	static _addItemType (ent) {
		const lookupSource = ent.source.toLowerCase();
		const lookupAbv = ent.abbreviation.toLowerCase();

		if (MiscUtil.get(MakeCards.utils._itemTypeMap, lookupSource, lookupAbv)) return;

		const cpy = MiscUtil.copy(ent);
		MiscUtil.set(MakeCards.utils._itemTypeMap, lookupSource, lookupAbv, ent.name ? cpy : {
			...cpy,
			name: ent.entries[0].name.toLowerCase(),
		});
	}

	static enhanceItemAlt (item) {
		delete item._fullEntries;

		if (item.type) {
			const {abbreviation, source} = DataUtil.itemType.unpackUid(item.type, {isLower: true});
			const fromCustom = MiscUtil.get(MakeCards.utils._itemTypeMap, source, abbreviation);
			if (fromCustom || Renderer.item.getType(item.type)) {
				Renderer.item._initFullEntries(item);
				(((fromCustom || Renderer.item.getType(item.type)) || {}).entries || []).forEach(e => item._fullEntries.push(e));
			}
		}

		if (item.property) {
			item.property.forEach(p => {
				const uid = p?.uid || p;
				const {abbreviation, source} = DataUtil.itemProperty.unpackUid(uid, {isLower: true});

				const fromCustom = MiscUtil.get(MakeCards.utils._itemPropertyMap, source, abbreviation);
				if (fromCustom) {
					if (fromCustom.entries) {
						Renderer.item._initFullEntries(item);
						fromCustom.entries.forEach(e => item._fullEntries.push(e));
					}
					return;
				}

				if (Renderer.item.getProperty(uid)?.entries) {
					Renderer.item._initFullEntries(item);
					Renderer.item.getProperty(uid).entries.forEach(e => item._fullEntries.push(e));
				}
			});
		}

		const itemTypeAbv = item.type ? DataUtil.itemType.unpackUid(item.type).abbreviation : null;
		if (itemTypeAbv === Parser.ITM_TYP_ABV__LIGHT_ARMOR || itemTypeAbv === Parser.ITM_TYP_ABV__MEDIUM_ARMOR || itemTypeAbv === Parser.ITM_TYP_ABV__HEAVY_ARMOR) {
			if (item.resist) {
				Renderer.item._initFullEntries(item);
				item._fullEntries.push(`对${Parser.dmgTypeToCn(item.resist)}伤害具有抗性。`);
			}
			if (item.stealth) {
				Renderer.item._initFullEntries(item);
				item._fullEntries.push("进行敏捷（隐匿）检定时具有劣势。");
			}
			if (itemTypeAbv === Parser.ITM_TYP_ABV__HEAVY_ARMOR && item.strength) {
				Renderer.item._initFullEntries(item);
				item._fullEntries.push(`若力量值低于 ${item.strength}，速度降低 10 尺。`);
			}
		} else if (item.resist) {
			if (itemTypeAbv === Parser.ITM_TYP_ABV__POTION) {
				Renderer.item._initFullEntries(item);
				item._fullEntries.push(`在 1 小时内对${Parser.dmgTypeToCn(item.resist)}伤害具有抗性。`);
			}
			if (itemTypeAbv === Parser.ITM_TYP_ABV__RING) {
				Renderer.item._initFullEntries(item);
				item._fullEntries.push(`对${Parser.dmgTypeToCn(item.resist)}伤害具有抗性。`);
			}
		}
		if (itemTypeAbv === Parser.ITM_TYP_ABV__SPELLCASTING_FOCUS) {
			if (item.scfType === "arcane") {
				Renderer.item._initFullEntries(item);
				item._fullEntries.push("术士、邪术师或法师可以将此物品用作施法法器。");
			}
			if (item.scfType === "druid") {
				Renderer.item._initFullEntries(item);
				item._fullEntries.push("德鲁伊可以将此物品用作施法法器。");
			}
			if (item.scfType === "holy") {
				Renderer.item._initFullEntries(item);
				item._fullEntries.push("牧师或圣武士可以将此物品用作施法法器。");
			}
		}
	}
	// endregion
};
MakeCards.utils._itemTypeMap = {};
MakeCards.utils._itemPropertyMap = {};
