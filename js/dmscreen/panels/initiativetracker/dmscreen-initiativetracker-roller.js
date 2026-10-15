export class InitiativeTrackerRoller {
	static _getRollName (name) {
		return `先攻追踪器${name ? ` \u2014 ${name}` : ""}`;
	}

	async pGetRollInitiative ({mon, name, initiativeModifier}) {
		name ??= mon?.name;
		initiativeModifier ??= mon ? Renderer.monster.getInitiativeBonusNumber({mon}) : 0;

		return Renderer.dice.pRoll2(`1d20${UiUtil.intToBonus(initiativeModifier)}`, {
			isUser: false,
			name: this.constructor._getRollName(name ?? mon?.name),
			label: "先攻",
		}, {isResultUsed: true});
	}

	async pGetOrRollHp (mon, {isRollHp}) {
		if (!isRollHp && mon.hp.average && !isNaN(mon.hp.average)) return Number(mon.hp.average);

		if (isRollHp && mon.hp.formula) {
			return Renderer.dice.pRoll2(mon.hp.formula, {
				isUser: false,
				name: this.constructor._getRollName(mon?.name),
				label: "生命值",
			}, {isResultUsed: true});
		}

		return null;
	}
}
