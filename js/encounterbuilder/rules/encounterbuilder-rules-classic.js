import {EncounterBuilderRulesBase, TierHtmlProviderBase} from "./encounterbuilder-rules-base.js";
import {EncounterPartyMetaClassic} from "../partymeta/encounter-partymeta-classic.js";
import {TIER_ABSURD, TIER_DEADLY, TIER_EASY, TIER_HARD, TIER_MEDIUM, TIERS, TIERS_EXTENDED} from "../consts/encounterbuilder-consts-classic.js";
import {BUDGET_MODE_XP} from "../consts/encounterbuilder-consts.js";
import {EncounterbuilderUiThermometer} from "../encounterbuilder-ui-thermometer.js";

class _TierHtmlProviderClassic extends TierHtmlProviderBase {
	_budgetMode = BUDGET_MODE_XP;
	_tierTitles = {
		easy: "一次简单的遭遇不会消耗角色们的资源或给他们带来严重的危险。他们可能会失去一点生命值，但是胜利还是相当有保障的。",
		medium: "一次中等的遭遇通常会让玩家们经历一两次惊心时刻，但是不会对角色们造成任何伤亡。只是其中若干人员可能会需要使用治疗资源。",
		hard: "对冒险者们而言，一次困难的遭遇可能会发展得很糟糕。较弱的角色可能会在战斗中被清除，甚至有较小的可能导致一个或多个角色因此死亡。",
		deadly: "对某些玩家而言，致命的遭遇可以造成足以致命的后果。此时需要优秀的策略和快速的思考才能确保生还，而队伍失败时也必须承当相应的风险。",
		absurd: "“荒谬”的遭遇按规则来说属于致命的遭遇，但在此处单独划分一类，旨在提供一种额外的工具，用于精准判断某场 “致命” 遭遇的实际致命程度。其XP的计算方式为：致命 +（致命 - 困难）",
	};
}

class _EncounterBuilderUiHelp {
	static getHelpEntry ({partyMeta, encounterSpendInfo}) {
		return {
			type: "entries",
			entries: [
				`{@b 根据约 ${`${encounterSpendInfo.crCutoff.toFixed(2)}`.replace(/[,.]?0+$/, "")}*&dagger; 的最低挑战等级门槛，以及 ${encounterSpendInfo.playerCount} 名玩家的队伍人数，应用 ${encounterSpendInfo.playerAdjustedSpendMult}× 倍数进行调整。}`,
				// `{@note * If the maximum challenge rating is two or less, there is no minimum threshold. Similarly, if less than a third of the party are level 5 or higher, there is no minimum threshold. Otherwise, for each creature in the encounter, the average CR of the encounter is calculated while excluding that creature. The highest of these averages is then halved to produce a minimum CR threshold. CRs less than this minimum are ignored for the purposes of calculating the final CR multiplier.}`,
				`{@note * 如果最高挑战等级不超过 2，则不设最低门槛。若队伍中达到 5 级的角色不足三分之一，也不设最低门槛。否则，按挑战等级从低到高依次排除遭遇中的生物，并计算其余生物的平均挑战等级。如果被排除生物的挑战等级比该平均值低超过一个标准差，则重复此过程。过程结束后，以平均值减去一个标准差作为最终的挑战等级门槛。}`,
				`<hr>`,
				{
					type: "quote",
					entries: [
						`&dagger; […] 不计入挑战等级明显低于组内其他怪物平均挑战等级的怪物 […]`,
					],
					"by": `{@book ${Parser.sourceJsonToFull(Parser.SRC_DMG)}，第 82 页|DMG|3|4 Modify Total XP for Multiple Monsters}`,
				},
				`<hr>`,
				{
					"type": "table",
					"caption": "遭遇倍数",
					"colLabels": [
						"怪物数量",
						"倍数",
					],
					"colStyles": [
						"col-6 text-center",
						"col-6 text-center",
					],
					"rows": [
						[
							"1",
							"×1",
						],
						[
							"2",
							"×1.5",
						],
						[
							"3-6",
							"×2",
						],
						[
							"7-10",
							"×2.5",
						],
						[
							"11-14",
							"×3",
						],
						[
							"15 或更多",
							"×4",
						],
					],
				},
				...(partyMeta && partyMeta.cntPlayers < 3
					? [
						{
							type: "quote",
							entries: [
								"如果队伍少于三名角色，则使用遭遇倍数表中高一级的倍数。",
							],
							"by": `{@book ${Parser.sourceJsonToFull(Parser.SRC_DMG)}，第 83 页|DMG|3|Party Size}`,
						},
					]
					: partyMeta && partyMeta.cntPlayers >= 6
						? [
							{
								type: "quote",
								entries: [
									"如果队伍有六名或更多角色，则使用表中低一级的倍数。只有一只怪物时，使用 0.5 倍。",
								],
								"by": `{@book ${Parser.sourceJsonToFull(Parser.SRC_DMG)}，第 83 页|DMG|3|Party Size}`,
							},
						]
						: []
				),
			],
		};
	}
}

export class EncounterBuilderRulesClassic extends EncounterBuilderRulesBase {
	rulesId = "classic";
	displayName = "经典 (5e/2014)";
	_tierHtmlProvider = new _TierHtmlProviderClassic();

	_budgetMode = BUDGET_MODE_XP;

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
			<div class="ve-flex ve-mb-2">${this._rendererWrapped.er(`{@note 基于{@book ${Parser.sourceJsonToFull(Parser.SRC_DMG)}|DMG|3|创建战斗遭遇}}第81页的“遭遇构筑”规则`)}</div>
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

	static _TITLE_BUDGET_DAILY = "粗略预估小队成员进行一次长休前能够完成的遭遇XP";

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
				[TIER_MEDIUM]: MiscUtil.COLOR_HURT,
				[TIER_HARD]: MiscUtil.COLOR_BLOODIED,
				[TIER_DEADLY]: MiscUtil.COLOR_DEFEATED,
				[TIER_ABSURD]: MiscUtil.COLOR_DEAD,
			},
			pFnDoGenerateRandomEncounter: this._pDoGenerateRandomEncounter.bind(this),
			pFnDoAdjustEncounter: this._pDoAdjustEncounter.bind(this),
		});

		const dispTtk = veT`<div></div>`;

		const dispBudgetDaily = veT`<div></div>`;
		const dispExpToLevel = veT`<div class="ve-muted"></div>`;

		const dispThermometer = thermometer.render()
			.vee.addClass("ve-mt-2");

		this._comp.addHookPulseDeriverPartyMeta(() => {
			const partyMeta = this.getEncounterPartyMeta();
			const encounterSpendInfo = partyMeta.getEncounterSpendInfo(this._comp.creatureGroups);
			const tier = partyMeta.getEncounterTier(encounterSpendInfo);

			onHookPulseDeriverPartyMetaTierXp({partyMeta});

			const spendCap = partyMeta.getBudgetRange(TIER_ABSURD).budgetMin + (partyMeta.getBudgetRange(TIER_ABSURD).budgetMin - partyMeta.getBudgetRange(TIER_DEADLY).budgetMin);
			thermometer.setInfo({
				spendValue: encounterSpendInfo.adjustedSpend,
				spendCap,
				thresholds: Object.fromEntries(
					TIERS_EXTENDED
						.map(tier => [tier, tier === TIER_ABSURD ? spendCap : partyMeta.getBudget(tier)]),
				),
				tier: tier,
				cntPlayers: partyMeta.cntPlayers,
			});

			dispTtk
				.vee.html(this._getTtkHtml({partyMeta}));

			dispBudgetDaily
				.vee.html(`<span class="ve-help-subtle" title="${this.constructor._TITLE_BUDGET_DAILY}">每日XP:</span> ${partyMeta?.getDailyBudget() ? partyMeta.getDailyBudget().toLocaleStringVe() : `?`} XP`);

			dispExpToLevel.vee.html(this._getRenderedExpToLevel({partyMeta}));
		})();

		const wrpGroupSummary = veT`<div class="ve-text-right">
			${dispsTierXp}
			${dispThermometer}
			<hr class="ve-hr-2">
			${dispTtk}
			<hr class="ve-hr-2">
			${dispBudgetDaily}
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
				.vee.tooltip(new _TierHtmlProviderClassic().getTierTitle({tier}));
		})();

		return veT`<div class="ve-w-50">
			${dispDifficulty}
		</div>`;
	}

	_renderGroupAndDifficulty_getDifficultyRhs () {
		const dispXpRawTotal = veT`<h4></h4>`;
		const dispXpRawPerPlayer = veT`<i></i>`;

		const hovXpAdjustedInfo = veT`<span class="glyphicon glyphicon-info-sign ve-mr-2"></span>`;

		const dispXpAdjustedTotal = veT`<h4 class="ve-flex-v-center"></h4>`;
		const dispXpAdjustedPerPlayer = veT`<i></i>`;

		let infoHoverId = null;
		this._comp.addHookPulseDeriverPartyMeta(() => {
			const partyMeta = this.getEncounterPartyMeta();

			const encounterSpendInfo = partyMeta.getEncounterSpendInfo(this._comp.creatureGroups);

			dispXpRawTotal.vee.txt(`合计XP: ${encounterSpendInfo.baseSpend?.toLocaleStringVe() || "?"}`);
			dispXpRawPerPlayer.vee.txt(
				partyMeta?.cntPlayers
					? `每位玩家 (${Math.floor(encounterSpendInfo.baseSpend / partyMeta?.cntPlayers)?.toLocaleStringVe()})`
					: "",
			);

			const infoEntry = _EncounterBuilderUiHelp.getHelpEntry({partyMeta, encounterSpendInfo});

			if (infoHoverId == null) {
				const hoverMeta = Renderer.hover.getMakePredefinedHover(infoEntry, {isBookContent: true});
				infoHoverId = hoverMeta.id;

				hovXpAdjustedInfo
					.vee.off("mouseover")
					.vee.off("mousemove")
					.vee.off("mouseleave")
					.vee.onn("mouseover", function (event) { hoverMeta.mouseOver(event, this); })
					.vee.onn("mousemove", function (event) { hoverMeta.mouseMove(event, this); })
					.vee.onn("mouseleave", function (event) { hoverMeta.mouseLeave(event, this); });
			} else {
				Renderer.hover.updatePredefinedHover(infoHoverId, infoEntry);
			}

			dispXpAdjustedTotal.vee.html(`调整后 XP <span class="ve-small ve-muted ve-ml-2" title="XP 倍数">(×${encounterSpendInfo.playerAdjustedSpendMult})</span>: <b class="ve-ml-2">${encounterSpendInfo.adjustedSpend.toLocaleStringVe()}</b>`);

			dispXpAdjustedPerPlayer.vee.txt(
				partyMeta?.cntPlayers
					? `(每位玩家${Math.floor(encounterSpendInfo.adjustedSpend / partyMeta.cntPlayers).toLocaleStringVe()})`
					: "",
			);
		})();

		return veT`<div class="ve-w-50 ve-text-right">
			${dispXpRawTotal}
			<div>${dispXpRawPerPlayer}</div>
			<div class="ve-flex-v-center ve-flex-h-right">${hovXpAdjustedInfo}${dispXpAdjustedTotal}</div>
			<div>${dispXpAdjustedPerPlayer}</div>
		</div>`;
	}

	_getEncounterPartyMeta (playerMetas) {
		return new EncounterPartyMetaClassic(playerMetas);
	}

	/* -------------------------------------------- */

	getDisplaySummary () {
		const encounterXpInfo = this
			.getEncounterPartyMeta()
			.getEncounterSpendInfo(this._comp.creatureGroups);

		return [
			`${encounterXpInfo.baseSpend.toLocaleStringVe()} XP`,
			encounterXpInfo.baseSpend !== encounterXpInfo.adjustedSpend
				? `(<span class="ve-help" title="调整后遭遇 XP">遭遇</span>: ${encounterXpInfo.adjustedSpend.toLocaleStringVe()} XP)`
				: "",
		]
			.filter(Boolean)
			.join(" ");
	}

	/* -------------------------------------------- */

	_getDefaultState () {
		return {
			...super._getDefaultState(),
			tierRandom: TIER_MEDIUM,
			tierAdjust: TIER_MEDIUM,
		};
	}
}
