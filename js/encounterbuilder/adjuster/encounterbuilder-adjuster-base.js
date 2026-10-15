/** @abstract */
export class EncounterBuilderAdjusterBase {
	/**
	 * @param {EncounterPartyMetaBase} partyMeta
	 * @param {EncounterBuilderCacheBase} cache
	 * @param {number} budgetMin An XP or CR budget.
	 * @param {number} budgetMax An XP or CR budget.
	 * @param {"xp" | "cr"} budgetMode
	 */
	constructor (
		{
			partyMeta,
			cache,
			budgetMin,
			budgetMax,
			budgetMode,
		},
	) {
		this._partyMeta = partyMeta;
		this._cache = cache;
		this._budgetMin = budgetMin;
		this._budgetMax = budgetMax;
		this._budgetMode = budgetMode;
	}

	/**
	 * @param {Array<EncounterBuilderCreatureGroupBase>} creatureGroups
	 * @return {Promise<?EncounterBuilderOptionalCandidateEncounter>}
	 */
	async pGetAdjustedEncounter ({creatureGroups}) {
		if (!creatureGroups.length) {
			JqueryUtil.doToast({content: "当前遭遇中没有生物，请先添加生物。", type: "warning"});
			return null;
		}

		if (creatureGroups.every(creatureGroup => creatureGroup.getIsLocked())) {
			JqueryUtil.doToast({content: "当前遭遇中只有已锁定的生物，请先解锁或添加其他生物。", type: "warning"});
			return null;
		}

		const creatureGroupsLocked = creatureGroups.filter(creatureGroup => creatureGroup.getIsLocked());
		creatureGroups = creatureGroups.map(creatureGroup => creatureGroup.getCopy());

		const creatureGroupsAdjustable = creatureGroups
			.filter(creatureGroup => !creatureGroup.getIsLocked() && creatureGroup.getCrNumber() != null);

		if (!creatureGroupsAdjustable.length) {
			JqueryUtil.doToast({content: "当前遭遇中只有已锁定或没有经验值的生物，请先解锁或添加其他生物。", type: "warning"});
			return null;
		}

		creatureGroupsAdjustable
			.forEach(creatureGroup => creatureGroup.setCount(1));

		if (this._partyMeta.getEncounterSpendInfo(creatureGroups).adjustedSpend > this._budgetMax) {
			JqueryUtil.doToast({content: "无法调整当前遭遇，请尝试移除一些生物！", type: "danger"});
			return null;
		}

		const closestSolution = await this._pGetAdjustedEncounter_getSolution({creatureGroups, creatureGroupsLocked, creatureGroupsAdjustable});

		if (!closestSolution.candidateEncounter) {
			JqueryUtil.doToast({content: closestSolution.message, type: "warning"});
			return null;
		}

		return closestSolution.candidateEncounter.getCreatureGroups();
	}

	/**
	 * @abstract
	 * @param {Array<EncounterBuilderCreatureGroupBase>} creatureGroups
	 * @param {Array<EncounterBuilderCreatureGroupBase>} creatureGroupsLocked
	 * @param {Array<EncounterBuilderCreatureGroupBase>} creatureGroupsAdjustable
	 * @return {Promise<EncounterBuilderOptionalCandidateEncounter>}
	 */
	async _pGetAdjustedEncounter_getSolution ({creatureGroups, creatureGroupsLocked, creatureGroupsAdjustable}) { throw new Error("Unimplemented!"); }
}
