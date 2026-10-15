import {LootGenGeneratorBase} from "./lootgen-generator-base.js";
import {
	LOOT_TABLES_TYPE__DMG_MAGIC_ITEMS,
	LOOT_TABLES_TYPE__XDMG_THEMES,
	LOOT_TABLES_TYPE__XGE_FAUX,
} from "./lootgen-const.js";
import {LootGenMagicItem} from "./lootgen-magicitem.js";
import {LootGenOutputMagicItems} from "./lootgen-output.js";

export class LootGenGeneratorLootTables extends LootGenGeneratorBase {
	identifier = "lootTables";

	_lt_tableMetas = null;

	setTableMetas (val) { return this._lt_tableMetas = val; }

	render ({tabMeta}) {
		let cacheTableMetas = [...this._lt_tableMetas];

		const getSelTableValues = () => this._lt_tableMetas.map((_, i) => i);

		const {sel: selTable, setValues: setSelTableValues} = ComponentUiUtil.getSelEnum(
			this,
			"lt_ixTable",
			{
				asMeta: true,
				isAllowNull: true,
				displayNullAs: "\u2014",
				values: getSelTableValues(),
				fnDisplay: ix => this._lt_getSelTableDisplay({ix}),
			},
		);

		const hkPulseItem = () => {
			const curVal = cacheTableMetas[this._state.lt_ixTable];
			cacheTableMetas = [...this._lt_tableMetas];

			const values = getSelTableValues();
			setSelTableValues(values);

			if (
				!values.includes(this._state.lt_ixTable)
				|| !curVal
				|| !curVal.tier || !curVal.rarity
			) return this._state.lt_ixTable = 0;

			// Try to restore the previous selection (as it may have moved due to the array resizing)
			const ix = this._lt_tableMetas.findIndex(it => it && it.tier === curVal.tier && it.rarity === curVal.rarity);
			if (~ix) this._state.lt_ixTable = ix;
			else this._state.lt_ixTable = 0;
		};
		this._stateManager.addHookBase("pulseItemsFiltered", hkPulseItem);

		const btnRoll = veT`<button class="ve-btn ve-btn-default ve-btn-xs ve-mr-2">${I18nUtil.get("page.lootgen.roll_loot")}</button>`
			.vee.onn("click", () => this._lt_pDoHandleClickRollLoot());

		const btnClear = veT`<button class="ve-btn ve-btn-danger ve-btn-xs">${I18nUtil.get("page.lootgen.clear_output")}</button>`
			.vee.onn("click", () => this._outputManager.doClearOutput());

		const hrHelp = veT`<hr class="ve-hr-3">`;
		const dispHelp = veT`<div class="ve-small ve-italic"></div>`;
		const hrTable = veT`<hr class="ve-hr-3">`;
		const dispTable = veT`<div class="ve-flex-col ve-w-100"></div>`;

		const hkTable = () => {
			const tableMeta = this._lt_tableMetas[this._state.lt_ixTable];

			dispHelp.vee.toggle(tableMeta != null);
			dispTable.vee.toggle(tableMeta != null);
			hrHelp.vee.toggle(tableMeta != null);
			hrTable.vee.toggle(tableMeta != null);

			if (tableMeta == null) return;

			dispHelp.vee.html(this._lt_getRenderedHelp({tableMeta}));
			dispTable.vee.html(this._rendererWrapped.er(tableMeta.tableEntry));
		};
		this._addHookBase("lt_ixTable", hkTable);
		hkTable();

		veT`<div class="ve-flex-col ve-py-2 ve-px-3">
			<label class="ve-split-v-center ve-mb-3">
				<div class="ve-mr-2 ve-w-66 ve-no-shrink">表格</div>
				${selTable}
			</label>

			<div class="ve-flex-v-center ve-mb-2">
				${btnRoll}
				${btnClear}
			</div>

			${hrHelp}
			${dispHelp}
			${hrTable}
			${dispTable}
		</div>`.vee.appendTo(tabMeta.wrpTab);
	}

	_lt_getSelTableDisplay ({ix}) {
		const tblMeta = this._lt_tableMetas[ix];
		if (!tblMeta) return "\u2014";

		if (tblMeta.tier && tblMeta.rarity) return `层级：${tblMeta.tier}；稀有度：${Parser.rarityToCN(tblMeta.rarity)}`;
		if (tblMeta.theme && tblMeta.rarity) return `主题：${tblMeta.theme}；稀有度：${Parser.rarityToCN(tblMeta.rarity)}`;

		return tblMeta.tableEntry.caption;
	}

	_lt_getRenderedHelp ({tableMeta}) {
		switch (tableMeta.metaType) {
			case LOOT_TABLES_TYPE__DMG_MAGIC_ITEMS: return this._rendererWrapped.er(`基于{@book ${Parser.sourceJsonToFull(Parser.SRC_DMG)}|DMG|7|宝藏表}第133-149页的表格和规则。`);
			case LOOT_TABLES_TYPE__XGE_FAUX: return this._rendererWrapped.er(`基于{@book ${Parser.sourceJsonToFull(Parser.SRC_XGE)} (零散的选择物品)|XGE|2|零散的选择物品}第135-136页的表格和规则自动生成。`);
			case LOOT_TABLES_TYPE__XDMG_THEMES: return this._rendererWrapped.er(`基于{@book ${Parser.sourceJsonToFull(Parser.SRC_XDMG)}|XDMG|6|随机魔法物品}第326-331页的表格和规则。`);
			default: throw new Error(`Unhandled table meta-type "${tableMeta.metaType}"`);
		}
	}

	async _lt_pDoHandleClickRollLoot ({isTest = false} = {}) {
		const tableMeta = this._lt_tableMetas[this._state.lt_ixTable];
		if (!tableMeta) return JqueryUtil.doToast({type: "warning", content: `请先选择表格！`});

		const lootOutput = new this._ClsLootGenOutput({
			type: `战利品表掷骰：${this._lt_pDoHandleClickRollLoot_getTypePart({tableMeta})}`,
			name: this._lt_pDoHandleClickRollLoot_getNamePart({tableMeta}),
			magicItemsByTable: await this._lt_pDoHandleClickRollLoot_pGetMagicItemMetas({tableMeta, isTest}),
			rendererWrapped: this._rendererWrapped,
		});
		this._outputManager.doAddOutput({lootOutput});
	}

	_lt_pDoHandleClickRollLoot_getTypePart ({tableMeta}) {
		switch (tableMeta.metaType) {
			case LOOT_TABLES_TYPE__DMG_MAGIC_ITEMS: return tableMeta.tableEntry.caption;
			case LOOT_TABLES_TYPE__XGE_FAUX: return `${tableMeta.tier} ${tableMeta.rarity}`;
			case LOOT_TABLES_TYPE__XDMG_THEMES: return `${tableMeta.theme} ${tableMeta.rarity}`;
			default: throw new Error(`Unhandled table meta-type "${tableMeta.metaType}"`);
		}
	}

	_lt_pDoHandleClickRollLoot_getNamePart ({tableMeta}) {
		switch (tableMeta.metaType) {
			case LOOT_TABLES_TYPE__DMG_MAGIC_ITEMS: return `在{@b {@table ${tableMeta.tableEntry.caption}|${Parser.SRC_DMG}}}上掷骰`;
			case LOOT_TABLES_TYPE__XGE_FAUX: return `在{@b ${tableMeta.tier}${Parser.rarityToCN(tableMeta.rarity)}物品}表上掷骰`;
			case LOOT_TABLES_TYPE__XDMG_THEMES: return `在{@b ${Parser.rarityToCN(tableMeta.rarity)}${tableMeta.theme}}表上掷骰`;
			default: throw new Error(`Unhandled table meta-type "${tableMeta.metaType}"`);
		}
	}

	async _lt_pDoHandleClickRollLoot_pGetMagicItemMetas ({tableMeta, isTest = false}) {
		const breakdown = [];
		if (isTest) {
			await tableMeta.table.table
				.map(it => it.min)
				.pSerialAwaitMap(async rowRoll => {
					const lootItem = await LootGenMagicItem.pGetMagicItemRoll({
						dataManager: this._dataManager,
						lootGenMagicItems: breakdown,
						spells: this._dataManager.getDataSpellsFiltered(),
						magicItemTable: tableMeta.table,
						rendererWrapped: this._rendererWrapped,
						rowRoll,
					});
					breakdown.push(lootItem);
				});
		} else {
			const lootItem = await LootGenMagicItem.pGetMagicItemRoll({
				dataManager: this._dataManager,
				lootGenMagicItems: breakdown,
				spells: this._dataManager.getDataSpellsFiltered(),
				magicItemTable: tableMeta.table,
				rendererWrapped: this._rendererWrapped,
			});
			breakdown.push(lootItem);
		}

		return [
			new LootGenOutputMagicItems({
				type: tableMeta.type,
				tag: tableMeta.tag,
				count: breakdown.length,
				breakdown,
			}),
		];
	}

	_getDefaultState () {
		return {
			lt_ixTable: null,
		};
	}
}
