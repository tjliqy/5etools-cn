import {LootGenOutput} from "./lootgen-output.js";
import {
	LOOT_TABLES_TYPE__DMG_MAGIC_ITEMS,
	LOOT_TABLES_TYPE__XGE_FAUX,
	LOOT_TABLES_TYPE__XDMG_THEMES,
} from "./lootgen-const.js";
import {PILL_STATE__IGNORE} from "../filter/filter-constants.js";
import {LootgenStateManager} from "./lootgen-state.js";
import {LootGenGeneratorFindTreasure, LootGenGeneratorFindTreasure24} from "./lootgen-generator-findtreasure.js";
import {LootGenGeneratorLootTables} from "./lootgen-generator-loottables.js";
import {LootGenGeneratorPartyLoot} from "./lootgen-generator-partyloot.js";
import {LootGenGeneratorDragonHoard} from "./lootgen-generator-dragonhoard.js";
import {LootGenGeneratorGemsArtObjects} from "./lootgen-generator-gemsartobjects.js";
import {LootGenUiDataManager} from "./lootgen-datamanager.js";
import {ModalFilterGemsArtObjects} from "./lootgen-filter-gemsartobjects.js";
import {LootGenUiOutputManager} from "./lootgen-outputmanager.js";

export class LootGenUi extends BaseComponent {
	constructor (
		{
			spells,
			items,
			ClsLootGenOutput,
			rendererWrapped,
		},
	) {
		if (!rendererWrapped) throw new Error(`Missing required "rendererWrapped" option!`);

		super();

		TabUiUtil.decorate(this, {isInitMeta: true});

		this._ClsLootGenOutput = ClsLootGenOutput || LootGenOutput;
		this._rendererWrapped = rendererWrapped;
		this._stateManager = LootgenStateManager.getInstance();
		this._outputManager = new LootGenUiOutputManager();
		this._dataManager = new LootGenUiDataManager({spells, items});

		this._modalFilterSpells = new ModalFilterSpells({namespace: "LootGenUi.spells", allData: spells});
		this._modalFilterItems = new ModalFilterItems({
			namespace: "LootGenUi.items",
			allData: items,
		});
		this._modalFilterGemsArtObjects = null;

		this._generatorFindTreasure24 = new LootGenGeneratorFindTreasure24({
			ClsLootGenOutput: this._ClsLootGenOutput,
			stateManager: this._stateManager,
			outputManager: this._outputManager,
			dataManager: this._dataManager,
			rendererWrapped: this._rendererWrapped,
		});

		this._generatorFindTreasure = new LootGenGeneratorFindTreasure({
			ClsLootGenOutput: this._ClsLootGenOutput,
			stateManager: this._stateManager,
			outputManager: this._outputManager,
			dataManager: this._dataManager,
			rendererWrapped: this._rendererWrapped,
		});

		this._generatorLootTables = new LootGenGeneratorLootTables({
			ClsLootGenOutput: this._ClsLootGenOutput,
			stateManager: this._stateManager,
			outputManager: this._outputManager,
			dataManager: this._dataManager,
			rendererWrapped: this._rendererWrapped,
		});

		this._generatorPartyLoot = new LootGenGeneratorPartyLoot({
			ClsLootGenOutput: this._ClsLootGenOutput,
			stateManager: this._stateManager,
			outputManager: this._outputManager,
			dataManager: this._dataManager,
			rendererWrapped: this._rendererWrapped,
		});

		this._generatorDragonHoard = new LootGenGeneratorDragonHoard({
			ClsLootGenOutput: this._ClsLootGenOutput,
			stateManager: this._stateManager,
			outputManager: this._outputManager,
			dataManager: this._dataManager,
			rendererWrapped: this._rendererWrapped,
		});

		this._generatorGemsArtObjects = new LootGenGeneratorGemsArtObjects({
			ClsLootGenOutput: this._ClsLootGenOutput,
			stateManager: this._stateManager,
			outputManager: this._outputManager,
			dataManager: this._dataManager,
			rendererWrapped: this._rendererWrapped,
		});

		this._generators = [
			this._generatorFindTreasure24,
			this._generatorFindTreasure,
			this._generatorLootTables,
			this._generatorPartyLoot,
			this._generatorDragonHoard,
			this._generatorGemsArtObjects,
		];
	}

	getSaveableState () {
		return {
			...super.getSaveableState(),
			meta: this.__meta,
			compShared: this._stateManager.getSaveableState(),
			...Object.fromEntries(
				this._generators
					.map(generator => [generator.getSaveableStateProp(), generator.getSaveableState()]),
			),
		};
	}

	setStateFrom (toLoad, isOverwrite = false) {
		super.setStateFrom(toLoad, isOverwrite);
		toLoad.meta && this._proxyAssignSimple("meta", toLoad.meta, isOverwrite);

		toLoad.compShared && this._stateManager.setStateFrom(toLoad.compShared, isOverwrite);
		this._generators
			.forEach(generator => {
				const prop = generator.getSaveableStateProp();
				if (!toLoad[prop]) return;
				generator.setStateFrom(toLoad[prop], isOverwrite);
			});
	}

	addHookOnSave (hk) {
		this._addHookAll("meta", hk);
		this._stateManager._addHookAllBase(hk);

		this._generators
			.forEach(generator => generator.addHookOnSave(hk));
	}

	async pInit () {
		await this._dataManager.pInit();

		this._modalFilterGemsArtObjects = new ModalFilterGemsArtObjects({
			namespace: "LootGenUi.gemsArtObjects",
			allData: this._dataManager.getDataGemsArtObjects(),
		});

		await this._modalFilterSpells.pPopulateHiddenWrapper();
		await this._modalFilterItems.pPopulateHiddenWrapper();
		await this._modalFilterGemsArtObjects.pPopulateHiddenWrapper();

		await this._pInit_pBindFilterHooks();
	}

	async _pInit_pBindFilterHooks () {
		const tablesMagicItemsDmg = await ["A", "B", "C", "D", "E", "F", "G", "H", "I"]
			.pMap(async type => {
				return {
					type,
					tableEntry: await DataLoader.pCacheAndGet(UrlUtil.PG_TABLES, Parser.SRC_DMG, UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_TABLES]({name: `${I18nUtil.get("page.lootgen.magic_item_table_")}${type}`, source: Parser.SRC_DMG})),
				};
			});
		// const tablesMagicItemsXdmg = await ["Arcana", "Armaments", "Implements", "Relics"]
		// const tablesMagicItemsXdmg = await [I18nUtil.get("奥术", "军备", "法器", "遗物"]
		const tablesMagicItemsXdmg = await [I18nUtil.get("page.lootgen.arcana"), I18nUtil.get("page.lootgen.armaments"), I18nUtil.get("page.lootgen.implements"), I18nUtil.get("page.lootgen.relics")]
			.flatMap(theme => {
				// return ["Common", "Uncommon", "Rare", "Very Rare", "Legendary"]
				// return ["普通", "非普通", "稀有", "非常稀有", "传说"]
				return [I18nUtil.get("page.lootgen.common"),
					I18nUtil.get("page.lootgen.uncommon"),
					I18nUtil.get("page.lootgen.rare"),
					I18nUtil.get("page.lootgen.very_rare"),
					I18nUtil.get("page.lootgen.legendary")]
					.map(rarity => ({
						name: `${theme} - ${rarity}`,
						type: `${theme.toLowerCase()}.${rarity.toLowerCase()}`,
						theme,
						rarity,
					}));
			})
			.pMap(async info => ({
				type: info.type,
				theme: info.theme,
				rarity: info.rarity,
				tableEntry: await DataLoader.pCacheAndGet(UrlUtil.PG_TABLES, Parser.SRC_XDMG, UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_TABLES]({name: info.name, source: Parser.SRC_XDMG})),
			}));

		const hkFilterChangeSpells = () => this._handleFilterChangeSpells();
		this._modalFilterSpells.pageFilter.filterBox.on(FILTER_BOX_EVNT_VALCHANGE, hkFilterChangeSpells);
		hkFilterChangeSpells();

		const hkFilterChangeItems = () => this._handleFilterChangeItems({
			tablesMagicItemsDmg,
			tablesMagicItemsXdmg,
		});
		this._modalFilterItems.pageFilter.filterBox.on(FILTER_BOX_EVNT_VALCHANGE, hkFilterChangeItems);
		hkFilterChangeItems();

		const hkFilterChangeGemsArtObjects = () => this._handleFilterChangeGemsArtObjects();
		this._modalFilterGemsArtObjects.pageFilter.filterBox.on(FILTER_BOX_EVNT_VALCHANGE, hkFilterChangeGemsArtObjects);
		hkFilterChangeGemsArtObjects();
	}

	_handleFilterChangeSpells () {
		const f = this._modalFilterSpells.pageFilter.filterBox.getValues();
		this._dataManager.setDataSpellsFiltered(this._dataManager.getDataSpells().filter(it => this._modalFilterSpells.pageFilter.toDisplay(f, it)));

		this._stateManager.pulseSpellsFiltered = !this._stateManager.pulseSpellsFiltered;
	}

	_handleFilterChangeItems (
		{
			tablesMagicItemsDmg,
			tablesMagicItemsXdmg,
		},
	) {
		const f = this._modalFilterItems.pageFilter.filterBox.getValues();
		this._dataManager.setDataItemsFiltered(this._dataManager.getDataItems().filter(it => this._modalFilterItems.pageFilter.toDisplay(f, it)));

		const filterExpression = this._modalFilterItems.pageFilter.filterBox.getFilterTagExpression({isAddSearchTerm: false});
		this._dataManager.setDataItemsFilteredLegacy(
			this._modalFilterItems.getEntitiesMatchingFilterExpression({
				filterExpression,
				valuesOverride: {
					"Miscellaneous": {
						"重印": PILL_STATE__IGNORE,
					},
				},
			}),
		);

		const xgeTables = this._getXgeFauxTables();

		this._generatorLootTables.setTableMetas(
			[
				...tablesMagicItemsXdmg.map(({type, theme, rarity, tableEntry}) => {
					tableEntry = MiscUtil.copy(tableEntry);
					tableEntry.type = "table";
					delete tableEntry.chapter;
					return {
						type,
						metaType: LOOT_TABLES_TYPE__XDMG_THEMES,
						theme,
						rarity,
						tableEntry,
						table: this._dataManager.getData().magicItems.find(it => it.type === type),
						tag: `{@table ${theme} - ${rarity}|XDMG|${theme} - ${rarity}}`,
					};
				}),
				...tablesMagicItemsDmg.map(({type, tableEntry}) => {
					tableEntry = MiscUtil.copy(tableEntry);
					tableEntry.type = "table";
					delete tableEntry.chapter;
					return {
						type,
						metaType: LOOT_TABLES_TYPE__DMG_MAGIC_ITEMS,
						tableEntry,
						table: this._dataManager.getData().magicItems.find(it => it.type === type),
						tag: `{@table Magic Item Table ${type}||Table ${type}}`,
					};
				}),
				...xgeTables,
			],
		);

		const xgeTableLookup = {};
		xgeTables.forEach(({tier, rarity, table}) => MiscUtil.set(xgeTableLookup, tier, rarity, table));
		this._generatorPartyLoot.setXgeTableLookup(xgeTableLookup);

		this._stateManager.pulseItemsFiltered = !this._stateManager.pulseItemsFiltered;
	}

	_handleFilterChangeGemsArtObjects () {
		const f = this._modalFilterGemsArtObjects.pageFilter.filterBox.getValues();
		this._dataManager.setDataGemsArtObjectsFiltered(this._dataManager.getDataGemsArtObjects().filter(it => this._modalFilterGemsArtObjects.pageFilter.toDisplay(f, it)));

		this._stateManager.pulseGemsArtObjectsFiltered = !this._stateManager.pulseGemsArtObjectsFiltered;
	}

	/** Create fake tables for the XGE rules */
	_getXgeFauxTables () {
		const byTier = {};

		// Use "legacy" item set, as "tier" info no longer used
		this._dataManager.getDataItemsFilteredLegacy()
			.forEach(item => {
				const tier = item.tier || "other";
				const rarity = item.rarity || (Renderer.item.isMundane(item) ? "unknown" : "unknown (magic)");
				const tgt = MiscUtil.getOrSet(byTier, tier, rarity, []);
				tgt.push(item);
			});

		return Object.entries(byTier)
			.map(([tier, byRarity]) => {
				return Object.entries(byRarity)
					.sort(([rarityA], [rarityB]) => SortUtil.ascSortItemRarity(rarityA, rarityB))
					.map(([rarity, items]) => {
						const isMundane = Renderer.item.isMundane({rarity});

						const caption = tier === "other"
							? `其他${isMundane ? "普通" : "魔法"}物品（${Parser.rarityToCN(rarity)}）`
							: `${{minor: "次要", major: "主要"}[tier] || tier}${isMundane ? "普通" : "魔法"}物品（${Parser.rarityToCN(rarity)}）`;

						return {
							metaType: LOOT_TABLES_TYPE__XGE_FAUX,
							type: `${tier}.${rarity}`,
							tier,
							rarity,

							tableEntry: {
								type: "table",
								caption,
								colLabels: [
									`d${items.length}`,
									"物品",
								],
								colStyles: [
									"col-2 text-center",
									"col-10",
								],
								rows: items.map((itm, i) => ([i + 1, `{@item ${DataUtil.proxy.getUidPacked("item", itm, "item", {isMaintainCase: true})}}`])),
							},

							table: {
								name: caption,
								source: Parser.SRC_XGE,
								page: 135,
								diceType: items.length,
								table: items.map((itm, i) => ({min: i + 1, max: i + 1, item: `{@item ${DataUtil.proxy.getUidPacked("item", itm, "item", {isMaintainCase: true})}}`})),
							},
						};
					});
			})
			.flat();
	}

	render ({stg, stgLhs, stgRhs}) {
		if (stg && (stgLhs || stgRhs)) throw new Error(`Only one of "parent stage" and "LHS/RHS stages" may be specified!`);

		const {stgLhs: stgLhs_, stgRhs: stgRhs_} = this._render_getStages({stg, stgLhs, stgRhs});

		const tabMetasLookup = this._renderTabsDict(
			{
				[this._generatorFindTreasure24.identifier]: new TabUiUtil.TabMeta({
					name: `${I18nUtil.get("page.lootgen.adventure_rewards_by_cr")} ('24)`,
					title: `${I18nUtil.get("page.lootgen.random_treasure_by_cr")} (${Parser.sourceJsonToFull(Parser.SRC_XDMG)})`,
					hasBorder: true,
					hasBackground: true,
				}),
				[this._generatorFindTreasure.identifier]: new TabUiUtil.TabMeta({
					name: `${I18nUtil.get("page.lootgen.random_treasure_by_cr")} ('14)`,
					title: `${I18nUtil.get("page.lootgen.random_treasure_by_cr")} (${Parser.sourceJsonToFull(Parser.SRC_DMG)})`,
					hasBorder: true,
					hasBackground: true,
				}),
				[this._generatorLootTables.identifier]: new TabUiUtil.TabMeta({
					name: I18nUtil.get("page.lootgen.loot_tables"),
					hasBorder: true,
					hasBackground: true,
				}),
				[this._generatorPartyLoot.identifier]: new TabUiUtil.TabMeta({
					name: I18nUtil.get("page.lootgen.party_loot"),
					hasBorder: true,
					hasBackground: true,
				}),
				[this._generatorDragonHoard.identifier]: new TabUiUtil.TabMeta({
					name: I18nUtil.get("page.lootgen.dragon_hoard"),
					hasBorder: true,
					hasBackground: true,
				}),
				[this._generatorGemsArtObjects.identifier]: new TabUiUtil.TabMeta({
					name: I18nUtil.get("page.lootgen.gems_art_objects"),
					hasBorder: true,
					hasBackground: true,
				}),
				options: new TabUiUtil.TabMeta({
					type: "buttons",
					isSplitStart: true,
					buttons: [
						{
							html: `<span class="glyphicon glyphicon-option-vertical"></span>`,
							title: "选项",
							type: "default",
							pFnClick: null, // This is assigned later
						},
					],
				}),
			},
			{
				eleParent: stgLhs_,
				isStacked: true,
			},
		);

		this._generators
			.forEach(generator => generator.render({tabMeta: tabMetasLookup[generator.identifier]}));
		this._render_tabOptions({tabMeta: tabMetasLookup.options});

		this._render_output({wrp: stgRhs_});
	}

	/**
	 * If we have been provided an existing pair of left-/right-hand stages, use them.
	 * Otherwise, render a two-column UI, and return each column as a stage.
	 * This allows us to cater for both the pre-baked layout of the Lootgen page, and other, more general,
	 *   components.
	 */
	_render_getStages ({stg, stgLhs, stgRhs}) {
		if (!stg) return {stgLhs, stgRhs};

		stgLhs = veT`<div class="ve-flex ve-w-50 ve-h-100"></div>`;
		stgRhs = veT`<div class="ve-flex-col ve-w-50 ve-h-100"></div>`;

		veT`<div class="ve-flex ve-w-100 ve-h-100">
			${stgLhs}
			<div class="ve-vr-2 ve-h-100"></div>
			${stgRhs}
		</div>`.vee.appendTo(stg.vee.empty());

		return {stgLhs, stgRhs};
	}

	_render_tabOptions ({tabMeta}) {
		const menuOthers = ContextUtil.getMenu([
			new ContextUtil.Action(
				"设置随机物品筛选条件",
				() => {
					this._modalFilterItems.handleHiddenOpenButtonClick();
				},
				{
					title: `设置某些结果随机掷出物品时使用的筛选条件。此设置不会从标准战利品表中移除物品。`,
					fnActionAlt: async (evt) => {
						this._modalFilterItems.handleHiddenResetButtonClick(evt);
						JqueryUtil.doToast(`已重置${evt.shiftKey ? "全部条件" : ""}！`);
					},
					textAlt: `<span class="glyphicon glyphicon-refresh"></span>`,
					titleAlt: FILTER_BOX_TITLE_BTN_RESET,
				},
			),
			new ContextUtil.Action(
				"设置随机法术筛选条件",
				() => {
					this._modalFilterSpells.handleHiddenOpenButtonClick();
				},
				{
					title: `设置某些结果随机掷出法术时使用的筛选条件。`,
					fnActionAlt: async (evt) => {
						this._modalFilterSpells.handleHiddenResetButtonClick(evt);
						JqueryUtil.doToast(`已重置${evt.shiftKey ? "全部条件" : ""}！`);
					},
					textAlt: `<span class="glyphicon glyphicon-refresh"></span>`,
					titleAlt: FILTER_BOX_TITLE_BTN_RESET,
				},
			),
			new ContextUtil.Action(
				"设置随机宝石与艺术品筛选条件",
				() => {
					this._modalFilterGemsArtObjects.handleHiddenOpenButtonClick();
				},
				{
					title: `设置某些结果随机掷出宝石与艺术品时使用的筛选条件。`,
					fnActionAlt: async (evt) => {
						this._modalFilterGemsArtObjects.handleHiddenResetButtonClick(evt);
						JqueryUtil.doToast(`已重置${evt.shiftKey ? "全部条件" : ""}！`);
					},
					textAlt: `<span class="glyphicon glyphicon-refresh"></span>`,
					titleAlt: FILTER_BOX_TITLE_BTN_RESET,
				},
			),
			null,
			new ContextUtil.Action(
				"设置",
				async () => {
					await this._opts_pDoOpenSettings();
				},
			),
		]);

		// Update the tab button on-click
		tabMeta.buttons[0].pFnClick = ({evt}) => ContextUtil.pOpenMenu(evt, menuOthers);

		const hkIsActive = () => {
			const tab = this._getActiveTab();
			tabMeta.btns[0].vee.toggleClass("ve-active", !!tab.isHeadHidden);
		};
		this._addHookActiveTab(hkIsActive);
		hkIsActive();
	}

	async _opts_pDoOpenSettings () {
		const {eleModalInner} = await UiUtil.pGetShowModal({title: "设置"});

		const rowsCurrency = Parser.COIN_ABVS
			.map(it => {
				const {propIsAllowed} = this._stateManager.getPropsCoins(it);

				const cb = ComponentUiUtil.getCbBool(this._stateManager, propIsAllowed);

				return veT`<label class="ve-split-v-center stripe-odd--faint">
					<div class="ve-no-wrap ve-mr-2">${Parser.coinAbvToFull(it).toTitleCase()}</div>
					${cb}
				</label>`;
			});

		veT(eleModalInner)`
			<div class="ve-mb-1" title="未启用的货币将换算为其他货币的等值数量。">允许的货币：</div>
			<div class="ve-pl-4 ve-flex-col">
				${rowsCurrency}
			</div>
		`;
	}

	_render_output ({wrp}) {
		const wrpOutputRows = this._outputManager.setWrpOutputRows(veT`<div class="ve-w-100 ve-h-100 ve-flex-col ve-overflow-y-auto ve-smooth-scroll"></div>`);

		veT`<div class="ve-flex-col ve-w-100 ve-h-100">
			<h4 class="ve-my-0"><i>输出</i></h4>
			${wrpOutputRows}
		</div>`
			.vee.appendTo(wrp);
	}
}
