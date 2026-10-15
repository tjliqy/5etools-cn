import {LootGenGeneratorBase} from "./lootgen-generator-base.js";
import {LootGenOutputGemsArtObjects} from "./lootgen-output.js";
import {LootGenUtils} from "./lootgen-utils.js";

export class LootGenGeneratorGemsArtObjects extends LootGenGeneratorBase {
	identifier = "gemsArtObjects";

	render ({tabMeta}) {
		const cbIsUseGems = ComponentUiUtil.getCbBool(this, "gao_isUseGems");
		const cbIsUseArtObjects = ComponentUiUtil.getCbBool(this, "gao_isUseArtObjects");

		const iptTargetGoldAmount = ComponentUiUtil.getIptInt(this, "gao_targetGoldAmount", 0, {min: 0})
			.vee.onn("keydown", evt => {
				if (evt.key !== "Enter") return;
				iptTargetGoldAmount.change();
				btnRoll.click();
			});

		const btnRoll = veT`<button class="ve-btn ve-btn-default ve-btn-xs ve-mr-2">${I18nUtil.get("page.lootgen.roll_loot")}</button>`
			.vee.onn("click", () => this._goa_pDoHandleClickRollLoot());

		const btnClear = veT`<button class="ve-btn ve-btn-danger ve-btn-xs">${I18nUtil.get("page.lootgen.clear_output")}</button>`
			.vee.onn("click", () => this._outputManager.doClearOutput());

		veT`<div class="ve-flex-col ve-py-2 ve-px-3">
			<h4 class="ve-mt-1 ve-mb-3">${I18nUtil.get("page.lootgen.gems_art_objects_generator")}</h4>

			<label class="ve-split-v-center ve-mb-3">
				<div class="ve-mr-2 ve-w-66 ve-no-shrink">${I18nUtil.get("page.lootgen.include_gems")}</div>
				${cbIsUseGems}
			</label>

			<label class="ve-split-v-center ve-mb-3">
				<div class="ve-mr-2 ve-w-66 ve-no-shrink">${I18nUtil.get("page.lootgen.include_art_objects")}</div>
				${cbIsUseArtObjects}
			</label>

			<label class="ve-split-v-center ve-mb-3">
				<div class="ve-mr-2 ve-w-66 ve-no-shrink">${I18nUtil.get("page.lootgen.target_gold_amount")}</div>
				${iptTargetGoldAmount}
			</label>

			<div class="ve-flex-v-center ve-mb-2">
				${btnRoll}
				${btnClear}
			</div>

			<hr class="ve-hr-3">

			<div class="ve-small ve-italic">${this._rendererWrapped.er(`此自定义生成器随机生成宝石/艺术品，直到达到目标金额。`)}</div>
		</div>`.vee.appendTo(tabMeta.wrpTab);
	}

	async _goa_pDoHandleClickRollLoot () {
		if (this._state.gao_targetGoldAmount <= 0) return JqueryUtil.doToast({content: "请输入目标金币数量！", type: "warning"});

		if (!this._state.gao_isUseGems && !this._state.gao_isUseArtObjects) return JqueryUtil.doToast({content: `请至少选择“包含宝石”或“包含艺术品”中的一项`, type: "warning"});

		const typeMap = {};
		[{prop: "gems", stateProp: "gao_isUseGems"}, {prop: "artObjects", stateProp: "gao_isUseArtObjects"}]
			.forEach(({prop, stateProp}) => {
				if (!this._state[stateProp]) return;
				this._dataManager.getDataGemsArtObjectsFilteredByProp(prop)
					.forEach(({type, table}) => {
						(typeMap[type] ||= []).push({prop, table});
					});
			});

		const types = Object.keys(typeMap).map(it => Number(it)).sort(SortUtil.ascSort).reverse();
		if (this._state.gao_targetGoldAmount < types.last()) return JqueryUtil.doToast({content: `目标金额 ${this._state.gao_targetGoldAmount} 金币无法生成宝石或艺术品！请提高目标金额。`, type: "warning"});

		// Map of <prop> -> <type> -> {<count>, <breakdown>}
		const generated = {};

		let budget = this._state.gao_targetGoldAmount;
		while (budget >= types.last()) {
			const validTypes = types.filter(it => it <= budget);
			const type = RollerUtil.rollOnArray(validTypes);
			const typeMetas = typeMap[type];
			const {prop, table} = RollerUtil.rollOnArray(typeMetas);
			const rolled = RollerUtil.rollOnArray(table);

			const genMeta = MiscUtil.getOrSet(generated, prop, type, {});
			genMeta.count = (genMeta.count || 0) + 1;
			genMeta.breakdown = genMeta.breakdown || {};
			genMeta.breakdown[rolled] = (genMeta.breakdown[rolled] || 0) + 1;

			budget -= type;
		}

		const [gems, artObjects] = ["gems", "artObjects"]
			.map(prop => {
				return generated[prop]
					? Object.entries(generated[prop])
						.sort(([typeA], [typeB]) => SortUtil.ascSort(Number(typeB), Number(typeA)))
						.map(([type, {count, breakdown}]) => {
							type = Number(type);

							return new LootGenOutputGemsArtObjects({
								type,
								count,
								breakdown,
							});
						})
					: null;
			});

		const lootOutput = new this._ClsLootGenOutput({
			type: `Gems/Art Objects`,
			name: `${I18nUtil.get("page.lootgen.gems_art_objects")}: ${I18nUtil.get("page.lootgen.roughly")} ${this._state.gao_targetGoldAmount.toLocaleStringVe()} ${LootGenUtils.getCoinageLabel("gp")}`,
			gems,
			artObjects,
			rendererWrapped: this._rendererWrapped,
		});
		this._outputManager.doAddOutput({lootOutput});
	}

	_getDefaultState () {
		return {
			gao_isUseGems: true,
			gao_isUseArtObjects: true,
			gao_targetGoldAmount: 100,
		};
	}
}
