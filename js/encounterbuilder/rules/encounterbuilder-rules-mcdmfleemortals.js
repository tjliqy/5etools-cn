import {EncounterBuilderRulesBase, TierHtmlProviderBase} from "./encounterbuilder-rules-base.js";
import {BUDGET_MODE_CR} from "../consts/encounterbuilder-consts.js";
import {EncounterPartyMetaMcdmFleeMortals} from "../partymeta/encounter-partymeta-mcdmfleemortals.js";
import {TIER_EXTREME, TIER_STANDARD, TIER_TO_ENCOUNTER_POINTS, TIERS, TIERS_EXTENDED} from "../consts/encounterbuilder-consts-mcdmfleemortals.js";
import {EncounterbuilderUiThermometer} from "../encounterbuilder-ui-thermometer.js";
import {TIER_EASY, TIER_HARD} from "../consts/encounterbuilder-consts-classic.js";

class _TierHtmlProviderMcdmFleeMortals extends TierHtmlProviderBase {
	_budgetMode = BUDGET_MODE_CR;
	_tierTitles = {
		trivial: "微不足道的遭遇几乎不费角色力气，例如一队 20 级英雄对付几只爬行之爪或地精。角色一定能活下来，也几乎不会消耗资源。偶尔加入这类遭遇可以增添趣味，但过多就会让人觉得浪费时间。",
		easy: "除非角色已经消耗了大量资源和生命值，简单遭遇通常不会危及生命。这类遭遇适合难以让角色休息的冒险，也适合让英雄展现强大实力。",
		standard: "标准遭遇是许多冒险队伍最常遇到的战斗。它会消耗不少资源和生命值。角色在此类遭遇中较少死亡，但糟糕的战术选择或不利的骰运仍可能造成伤亡。",
		hard: "困难遭遇通常是与首领及其爪牙的决战，或其他危及角色生命的战斗。角色有机会获胜，但需要充分利用资源、智慧和运气。",
		extreme: "在极端遭遇中，若角色战斗到底，很可能无法生还。这类遭遇在多数战役里很少出现；但 17 级及以上的角色通常有机会幸存，或在战后复活。",
	};
}

// TODO(Future) add handling for "solo" creatures, as per the rules on p18
//   These are functionally a different type of encounter, with different difficulty
//     rules; this will require making a `mcdmFleeMortalsSolo` implementation.
//   Once we have the additional implementation, need to filter usable creatures to
//     "not solo" here, and "solo" in `mcdmFleeMortalsSolo`, which should produce the
//     majority of edge-cases.
export class EncounterBuilderRulesMcdmFleeMortals extends EncounterBuilderRulesBase {
	rulesId = "mcdmFleeMortals";
	displayName = "MCDM《逃吧，凡人！》";
	_tierHtmlProvider = new _TierHtmlProviderMcdmFleeMortals();

	_budgetMode = BUDGET_MODE_CR;

	render ({stgSettingsRules, stgRandomAndAdjust, stgGroupSummary, stgDifficulty}) {
		const {wrpSettingsRules} = this._render_settingsRules({stgSettingsRules});
		const {wrpRandomAndAdjust} = this._render_randomAndAdjust({stgRandomAndAdjust});
		const {wrpGroupSummary} = this._render_groupSummary({stgGroupSummary});
		const {wrpDifficulty} = this._render_difficulty({stgDifficulty});

		return {
			eles: [
				wrpSettingsRules,
				wrpRandomAndAdjust,
				wrpGroupSummary,
				wrpDifficulty,
			],
		};
	}

	_render_settingsRules ({stgSettingsRules}) {
		const wrpSettingsRules = veT`<div class="ve-flex-col">
			<div class="ve-flex ve-mb-2">${this._rendererWrapped.er(`{@note 基于 {@link MCDM|https://www.mcdmproductions.com} 的 {@book 逃吧，凡人！|FleeMortals|0|Encounter Building} 第 16 页的遭遇构建规则。}`)}</div>
		</div>`
			.vee.appendTo(stgSettingsRules);

		return {
			wrpSettingsRules,
		};
	}

	_render_randomAndAdjust ({stgRandomAndAdjust}) {
		const wrpRandomAndAdjust = this._getRenderedWrpRandomAndAdjust({
			tiers: TIERS,
		});

		wrpRandomAndAdjust.vee.appendTo(stgRandomAndAdjust);

		return {wrpRandomAndAdjust};
	}

	/* -------------------------------------------- */

	_render_groupSummary ({stgGroupSummary}) {
		const {
			disps: dispsTierXp,
			onHookPulseDeriverPartyMeta: onHookPulseDeriverPartyMetaTierXp,
		} = this._getRenderedDispsTierMeta({
			tiers: TIERS_EXTENDED,
		});

		const thermometer = new EncounterbuilderUiThermometer({
			tierHtmlProvider: this._tierHtmlProvider,
			tiers: TIERS_EXTENDED,
			tiersActionable: TIERS,
			thresholdColors: {
				[TIER_EASY]: MiscUtil.COLOR_HEALTHY,
				[TIER_STANDARD]: MiscUtil.COLOR_HURT,
				[TIER_HARD]: MiscUtil.COLOR_BLOODIED,
				[TIER_EXTREME]: MiscUtil.COLOR_DEFEATED,
			},
			pFnDoGenerateRandomEncounter: this._pDoGenerateRandomEncounter.bind(this),
			pFnDoAdjustEncounter: this._pDoAdjustEncounter.bind(this),
		});

		const dispTtk = veT`<div></div>`;

		const dispPointsEncounter = veT`<div></div>`;

		const dispExpEncounter = veT`<div></div>`;
		const dispExpToLevel = veT`<div class="ve-muted"></div>`;

		const dispThermometer = thermometer.render()
			.vee.addClass("ve-mt-2");

		this._comp.addHookPulseDeriverPartyMeta(() => {
			const partyMeta = this.getEncounterPartyMeta();
			const encounterSpendInfo = partyMeta.getEncounterSpendInfo(this._comp.creatureGroups);
			const tier = partyMeta.getEncounterTier(encounterSpendInfo);

			onHookPulseDeriverPartyMetaTierXp({partyMeta});

			thermometer.setInfo({
				spendValue: encounterSpendInfo.adjustedSpend,
				spendCap: partyMeta.getBudget(TIER_EXTREME),
				thresholds: Object.fromEntries(
					TIERS_EXTENDED
						.map(tier => [tier, partyMeta.getBudget(tier)]),
				),
				tier: tier,
				cntPlayers: partyMeta.cntPlayers,
			});

			dispTtk
				.vee.html(this._getTtkHtml({partyMeta}));

			dispPointsEncounter.vee.html(`遭遇点数：${TIER_TO_ENCOUNTER_POINTS[tier] || "?"}`);

			dispExpEncounter.vee.html(`遭遇经验值：${this._getEncounterXp() ? this._getEncounterXp().toLocaleStringVe() : "?"} XP`);
			dispExpToLevel.vee.html(this._getRenderedExpToLevel({partyMeta}));
		})();

		const wrpGroupSummary = veT`<div class="ve-text-right ve-flex-col">
			${dispsTierXp}
			${dispThermometer}
			<hr class="ve-hr-2">
			${dispTtk}
			<hr class="ve-hr-2">
			${dispPointsEncounter}
			<div class="ve-muted"><span class="ve-help-subtle" title="每日遭遇点数预算。为角色安排有挑战性但仍可存活的冒险日时，全天遭遇点数合计宜为 6 至 8 点。">每日XP:</span> 6-8</div>
			<div class="ve-my-2">
			${dispExpEncounter}
			${dispExpToLevel}
		</div>`
			.vee.hide()
			.vee.appendTo(stgGroupSummary);

		return {
			wrpGroupSummary,
		};
	}

	/* -------------------------------------------- */

	_render_difficulty ({stgDifficulty}) {
		const hrHasCreatures = veT`<hr class="ve-hr-1">`;
		const wrpDifficultyCols = veT`<div class="ve-flex">
			${this._renderGroupAndDifficulty_getDifficultyLhs()}
			${this._renderGroupAndDifficulty_getDifficultyRhs()}
		</div>`;

		this._comp.addHookPulseDeriverPartyMeta(() => {
			const encounterSpendInfo = this.getEncounterPartyMeta().getEncounterSpendInfo(this._comp.creatureGroups);
			hrHasCreatures.vee.toggle(encounterSpendInfo.relevantCount);
			wrpDifficultyCols.vee.toggle(encounterSpendInfo.relevantCount);
		})();

		const wrpDifficulty = veT`<div class="ve-flex-col ve-w-100">
			${hrHasCreatures}
			${wrpDifficultyCols}
		</div>`
			.vee.hide()
			.vee.appendTo(stgDifficulty);

		return {
			wrpDifficulty,
		};
	}

	_renderGroupAndDifficulty_getDifficultyLhs () {
		const dispDifficulty = veT`<h4 class="ve-my-2"></h4>`;

		this._comp.addHookPulseDeriverPartyMeta(() => {
			const partyMeta = this.getEncounterPartyMeta();

			const encounterSpendInfo = partyMeta.getEncounterSpendInfo(this._comp.creatureGroups);

			const tier = partyMeta.getEncounterTier(encounterSpendInfo);

			dispDifficulty
				.vee.html(`难度: <span class="ve-help-subtle">${Parser.encounterDifficultyToCn(tier)}</span>`)
				.vee.tooltip(new _TierHtmlProviderMcdmFleeMortals().getTierTitle({tier}));
		})();

		return veT`<div class="ve-w-50">
			${dispDifficulty}
		</div>`;
	}

	_renderGroupAndDifficulty_getDifficultyRhs () {
		const dispCrTotal = veT`<h4></h4>`;
		const dispCrPerPlayer = veT`<i></i>`;

		this._comp.addHookPulseDeriverPartyMeta(() => {
			const partyMeta = this.getEncounterPartyMeta();

			const encounterSpendInfo = partyMeta.getEncounterSpendInfo(this._comp.creatureGroups);

			dispCrTotal.vee.txt(`合计CR: ${encounterSpendInfo.baseSpend == null ? "?" : Parser.numberToVulgar(encounterSpendInfo.baseSpend)}`);
			dispCrPerPlayer.vee.txt(
				partyMeta?.cntPlayers
					? `每位玩家(${Parser.numberToVulgar(encounterSpendInfo.baseSpend / partyMeta?.cntPlayers)})`
					: "",
			);
		})();

		return veT`<div class="ve-w-50 ve-text-right">
			${dispCrTotal}
			<div>${dispCrPerPlayer}</div>
		</div>`;
	}

	_getEncounterXp () {
		return this._comp.creatureGroups
			.reduce((accum, creatureGroup) => accum + (Parser.crToXpNumber(Parser.numberToCr(creatureGroup.getCrNumber())) || 0) * creatureGroup.getCount(), 0);
	}

	_getEncounterPartyMeta (playerMetas) {
		return new EncounterPartyMetaMcdmFleeMortals(playerMetas);
	}

	/* -------------------------------------------- */

	getDisplaySummary () {
		const encounterXpInfo = this
			.getEncounterPartyMeta()
			.getEncounterSpendInfo(this._comp.creatureGroups);

		return `<span title="遭遇总挑战等级">${Parser.numberToVulgar(encounterXpInfo.baseSpend)} CR</span> (${this._getEncounterXp().toLocaleStringVe()} XP)`;
	}

	/* -------------------------------------------- */

	_getDefaultState () {
		return {
			...super._getDefaultState(),
			tierRandom: TIER_STANDARD,
			tierAdjust: TIER_STANDARD,
		};
	}
}
