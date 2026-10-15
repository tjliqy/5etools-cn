import {LootGenGeneratorBase} from "./lootgen-generator-base.js";
import {LootGenOutputDragonMundaneItems} from "./lootgen-output.js";

export class LootGenGeneratorDragonHoard extends LootGenGeneratorBase {
	static _DRAGON_AGES = [
		I18nUtil.get("page.lootgen.wyrmling"),
		I18nUtil.get("page.lootgen.young"),
		I18nUtil.get("page.lootgen.adult"),
		I18nUtil.get("page.lootgen.ancient"),
	];

	identifier = "dragonHoard";

	render ({tabMeta}) {
		const selDragonAge = ComponentUiUtil.getSelEnum(
			this,
			"dh_dragonAge",
			{
				values: this.constructor._DRAGON_AGES,
			},
		);

		const cbIsPreferRandomMagicItems = ComponentUiUtil.getCbBool(this, "dh_isPreferRandomMagicItems");

		const btnRoll = veT`<button class="ve-btn ve-btn-default ve-btn-xs ve-mr-2">${I18nUtil.get("page.lootgen.roll_loot")}</button>`
			.vee.onn("click", () => this._dh_pDoHandleClickRollLoot());

		const btnClear = veT`<button class="ve-btn ve-btn-danger ve-btn-xs">${I18nUtil.get("page.lootgen.clear_output")}</button>`
			.vee.onn("click", () => this._outputManager.doClearOutput());

		veT`<div class="ve-flex-col ve-py-2 ve-px-3">
			<label class="ve-split-v-center ve-mb-2">
				<div class="ve-mr-2 ve-w-66 ve-no-shrink">${I18nUtil.get("page.lootgen.dragon_age")}</div>
				${selDragonAge}
			</label>

			<label class="ve-split-v-center ve-mb-3">
				<div class="ve-mr-2 ve-w-66 ve-no-shrink" title="启用后，生成魔法物品时会优先选择稀有度和层级相符的随机物品，而非在 ${Parser.sourceJsonToAbv(Parser.SRC_DMG).qq()} 的“魔法物品表 A–I”上掷骰。">${I18nUtil.get("page.lootgen.prefer_random_magic_items")}</div>
				${cbIsPreferRandomMagicItems}
			</label>

			<div class="ve-flex-v-center ve-mb-2">
				${btnRoll}
				${btnClear}
			</div>

			<hr class="ve-hr-3">

			<div class="ve-small ve-italic">${this._rendererWrapped.er(`基于{@book 费资本的巨龙宝库|FTD|4|创建宝藏}第72页的表格和规则。`)}
		</div>`.vee.appendTo(tabMeta.wrpTab);
	}

	async _dh_pDoHandleClickRollLoot () {
		const tableMeta = this._dataManager.getData().dragon.find(it => it.name === this._state.dh_dragonAge);

		const coins = this._stateManager.getConvertedCoins(
			Object.entries(tableMeta.coins || {})
				.mergeMap(([type, formula]) => ({[type]: Renderer.dice.parseRandomise2(formula)})),
		);

		const dragonMundaneItems = this._dh_doHandleClickRollLoot_mundaneItems({dragonMundaneItems: tableMeta.dragonMundaneItems});

		const gems = this._doHandleClickRollLoot_hoard_gemsArtObjectsMulti({row: tableMeta, prop: "gems"});
		const artObjects = this._doHandleClickRollLoot_hoard_gemsArtObjectsMulti({row: tableMeta, prop: "artObjects"});

		const magicItemsByTable = await this._doHandleClickRollLoot_hoard_pMagicItemsMulti({
			row: tableMeta,
			fnGetIsPreferAltChoose: () => !!this._state.dh_isPreferRandomMagicItems,
		});

		const lootOutput = new this._ClsLootGenOutput({
			type: `龙族宝库：${this._state.dh_dragonAge}`,
			name: `${this._state.dh_dragonAge} ${I18nUtil.get("page.lootgen.dragon_hoard")}`,
			coins,
			gems,
			artObjects,
			dragonMundaneItems,
			magicItemsByTable,
			rendererWrapped: this._rendererWrapped,
		});
		this._outputManager.doAddOutput({lootOutput});
	}

	_dh_doHandleClickRollLoot_mundaneItems ({dragonMundaneItems}) {
		if (!dragonMundaneItems) return null;

		const count = Renderer.dice.parseRandomise2(dragonMundaneItems.amount);

		const breakdown = [];
		[...new Array(count)]
			.forEach(() => {
				const roll = RollerUtil.randomise(100);
				const result = this._dataManager.getData().dragonMundaneItems.find(it => roll >= it.min && roll <= it.max);
				breakdown.push(result.item);
			});

		return new LootGenOutputDragonMundaneItems({
			count: count,
			breakdown,
		});
	}

	_getDefaultState () {
		return {
			dh_dragonAge: "Wyrmling",
			dh_isPreferRandomMagicItems: false,
		};
	}
}
