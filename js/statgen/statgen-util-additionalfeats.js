export class StatGenUtilAdditionalFeats {
	static _KEYS_NON_STATIC = new Set(["any", "anyFromCategory"]);

	static isNoChoice (available) {
		if (!available?.length) return true;
		if (available.length > 1) return false;
		return !Object.keys(available[0]).some(k => this._KEYS_NON_STATIC.has(k));
	}

	static isStaticFeatProp (prop) {
		return !this._KEYS_NON_STATIC.has(prop);
	}

	static getUidsStatic (availableSet) {
		return Object.entries(availableSet || {})
			.filter(([k, v]) => !this._KEYS_NON_STATIC.has(k) && v)
			.sort(([kA], [kB]) => SortUtil.ascSortLower(kA, kB))
			.map(([k]) => k);
	}

	static getSelIxSetMeta ({comp, prop, available}) {
		return ComponentUiUtil.getSelEnum(
			comp,
			prop,
			{
				values: available.map((_, i) => i),
				fnDisplay: ix => {
					const featSet = available[ix];

					const out = [];

					if (featSet.any) {
						out.push(`任选 ${featSet.any} 个专长`);
					}

					if (featSet.anyFromCategory) {
						const cnt = featSet.anyFromCategory.count || 1;
						if (["zh_CN", "zh-Hant"].includes(I18nUtil.LANGUAGES_INDEX)) {
							out.push(`任选 ${cnt} 个${Parser.featCategoryToFull(featSet.anyFromCategory.category)}专长`);
						} else {
							out.push(`Choose any ${Parser.featCategoryToFull(featSet.anyFromCategory.category)}${cnt > 1 ? ` ${Parser.numberToText(cnt)}` : ""}`);
						}
					}

					this.getUidsStatic(featSet)
						.forEach(uid => {
							const {name} = DataUtil.proxy.unpackUid("feat", uid, "feat", {isLower: true});
							out.push(name.toTitleCase());
						});

					return out.filter(Boolean).join("; ");
				},
				asMeta: true,
			},
		);
	}
}
