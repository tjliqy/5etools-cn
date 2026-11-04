import {ConversionStateMarkdownBase, ConversionStateTextBase} from "./converterutils-models.js";
import {ConverterUtilsMarkdown} from "./converterutils-markdown.js";
import {TagJsons} from "./converterutils-entries.js";
import {RaceImmResVulnTag, RaceLanguageTag, RaceTraitTag} from "./converterutils-race.js";
import {EntryCoalesceEntryLists, EntryCoalesceRawLines} from "./converterutils-entrycoalesce.js";
import {ConverterUtils} from "./converterutils-utils.js";
import {ConverterFeatureBase} from "./converter-feature.js";
import {SITE_STYLE__CLASSIC, SITE_STYLE__ONE} from "../consts.js";
import {PropOrder} from "../utils-proporder.js";
import {SkillTag} from "./converterutils-tags.js";

class _ConversionStateTextRace extends ConversionStateTextBase {

}

class _ConversionStateMarkdownRace extends ConversionStateMarkdownBase {
	constructor (...rest) {
		super(...rest);
		this.stack = [];
	}
}

export class ConverterRace extends ConverterFeatureBase {
	static _doParse_getInitialState (inText, options) {
		const out = super._doParse_getInitialState(inText, options);

		out.toConvert = out.toConvert
			.filter(line => {
				if (/[yY]ou have the following traits[.:]$/.test(line)) return false;
				if (/As [^.]+, you have (?:these|the following) special traits[.:]$/.test(line)) return false;
				if (/你获得[以如]下特[质性][.:。：]$/.test(line)) return false;
				if (/作为[^.]+[,，] ?你(?:获得|拥有|有)[以如]下[^.]*特[质性][.:。：]$/.test(line)) return false;
				return true;
			});

		return out;
	}

	/* -------------------------------------------- */

	/**
	 * Parses races from raw text pastes
	 * @param inText Input text.
	 * @param options Options object.
	 * @param options.cbWarning Warning callback.
	 * @param options.cbOutput Output callback.
	 * @param options.isAppend Default output append mode.
	 * @param options.source Entity source.
	 * @param options.page Entity page.
	 * @param [options.isAddPageNumber] Whether to include the page in the output. Defaults to true if a page is provided.
	 * @param options.titleCaseFields Array of fields to be title-cased in this entity (if enabled).
	 * @param options.isTitleCase Whether title-case fields should be title-cased in this entity.
	 * @param options.styleHint
	 */
	static doParseText (inText, options) {
		options = this._getValidOptions(options);

		const {toConvert, entity} = this._doParse_getInitialState(inText, options);
		if (!toConvert) return;

		const state = new _ConversionStateTextRace({toConvert, options, entity});

		state.doPreLoop();
		for (; state.ixToConvert < toConvert.length; ++state.ixToConvert) {
			state.initCurLine();
			if (state.isSkippableCurLine()) continue;

			switch (state.stage) {
				case "name": this._doParseText_stepName(state); state.stage = "entries"; break;
				case "entries": this._doParseText_stepEntries(state); break;
				default: throw new Error(`Unknown stage "${state.stage}"`);
			}
		}
		state.doPostLoop();

		if (!entity.entries?.length) delete entity.entries;

		const raceOut = this._getFinalEntity(entity, options);

		options.cbOutput(raceOut, options.isAppend);

		return raceOut;
	}

	static _doParseText_stepName (state) {
		const name = state.curLine.replace(/( Traits|特[质性])$/i, "");
		[state.entity.name, state.entity.ENG_name] = ConverterUtils.splitNameToChineseAndEnglish(this._getAsTitle("name", state.curLine, state.options.titleCaseFields, state.options.isTitleCase));
		state.entity.name = state.entity.name.replace(/( Traits|特[质性])$/i, "");
		state.entity.ENG_name = state.entity.ENG_name.replace(/( Traits|特[质性])$/i, "");
		// region Skip repeated name line
		const nextLineMeta = state.getNextLineMeta();

		if (
			new RegExp(`^${name.escapeRegexp()} (?:Traits|特[质性])$`).test(nextLineMeta.nxtLine.trim())
		) {
			state.ixToConvert = nextLineMeta.ixToConvertNext;
		}
		// endregion
	}

	static _doParseText_stepEntries (state) {
		const ptrI = {_: state.ixToConvert};
		state.entity.entries = EntryCoalesceRawLines.mutGetCoalesced(
			ptrI,
			state.toConvert,
		);
		state.ixToConvert = ptrI._;
	}

	/* -------------------------------------------- */

	/**
	 * Parses races from raw markdown pastes
	 * @param inText Input text.
	 * @param options Options object.
	 * @param options.cbWarning Warning callback.
	 * @param options.cbOutput Output callback.
	 * @param options.isAppend Default output append mode.
	 * @param options.source Entity source.
	 * @param options.page Entity page.
	 * @param [options.isAddPageNumber] Whether to include the page in the output. Defaults to true if a page is provided.
	 * @param options.titleCaseFields Array of fields to be title-cased in this entity (if enabled).
	 * @param options.isTitleCase Whether title-case fields should be title-cased in this entity.
	 */
	static doParseMarkdown (inText, options) {
		options = this._getValidOptions(options);

		const {toConvert, entity} = this._doParse_getInitialState(inText, options);
		if (!toConvert) return;

		const state = new _ConversionStateMarkdownRace({toConvert, options, entity});

		for (; state.ixToConvert < toConvert.length; ++state.ixToConvert) {
			state.initCurLine();
			if (state.isSkippableCurLine()) continue;

			switch (state.stage) {
				case "name": this._doParseMarkdown_stepName(state); state.stage = "entries"; break;
				case "entries": this._doParseMarkdown_stepEntries(state); break;
				default: throw new Error(`Unknown stage "${state.stage}"`);
			}
		}

		if (!entity.entries?.length) delete entity.entries;

		const raceOut = this._getFinalEntity(entity, options);

		options.cbOutput(raceOut, options.isAppend);

		return raceOut;
	}

	static _doParseMarkdown_stepName (state) {
		state.curLine = ConverterUtilsMarkdown.getNoHashes(state.curLine);
		state.entity.name = this._getAsTitle("name", state.curLine, state.options.titleCaseFields, state.options.isTitleCase);
	}

	static _doParseMarkdown_stepEntries (state) {
		state.entity.entries = state.entity.entries || [];

		if (ConverterUtilsMarkdown.isInlineHeader(state.curLine)) {
			while (state.stack.length) state.stack.pop();

			const nxt = {type: "entries", name: "", entries: []};
			if (state.stack.length) delete nxt.type;
			state.stack.push(nxt);

			state.entity.entries.push(nxt);

			const [name, text] = ConverterUtilsMarkdown.getCleanTraitText(state.curLine);
			nxt.name = name;
			nxt.entries.push(ConverterUtilsMarkdown.getNoLeadingSymbols(text));

			return;
		}

		if (ConverterUtilsMarkdown.isListItem(state.curLine)) {
			if (state.stack.last()?.type !== "list") {
				const lst = {type: "list", items: []};

				if (state.stack.length) {
					state.stack.last().entries.push(lst);
					state.stack.push(lst);
				} else {
					state.entity.entries.push(lst);
					state.stack.push(lst);
				}
			}

			state.curLine = ConverterUtilsMarkdown.getNoLeadingListSymbol(state.curLine);

			if (ConverterUtilsMarkdown.isInlineHeader(state.curLine)) {
				state.stack.last().style = "list-hang-notitle";

				const nxt = {type: "item", name: "", entry: ""};

				state.stack.last().items.push(nxt);

				const [name, text] = ConverterUtilsMarkdown.getCleanTraitText(state.curLine);
				nxt.name = name;
				nxt.entry = ConverterUtilsMarkdown.getNoLeadingSymbols(text);
			} else {
				state.stack.last().items.push(ConverterUtilsMarkdown.getNoLeadingSymbols(state.curLine));
			}

			return;
		}

		while (state.stack.length && state.stack.last().type === "list") state.stack.pop();

		if (state.stack.length) {
			state.stack.last().entries.push(ConverterUtilsMarkdown.getNoLeadingSymbols(state.curLine));
			return;
		}

		state.entity.entries.push(ConverterUtilsMarkdown.getNoLeadingSymbols(state.curLine));
	}

	// SHARED UTILITY FUNCTIONS ////////////////////////////////////////////////////////////////////////////////////////
	static _getFinalEntity (race, options) {
		if (options.styleHint === SITE_STYLE__ONE) race.edition = SITE_STYLE__ONE;
		this._doRacePostProcess(race, options);
		return PropOrder.getOrdered(race, race.__prop || "race");
	}

	static _doRacePostProcess (race, options) {
		this._doPostProcess_removePage(race, options);

		if (!race.entries) return;

		// region Tag
		EntryCoalesceEntryLists.mutCoalesce(race, "entries", {styleHint: options.styleHint});
		TagJsons.mutTagObject(race, {keySet: new Set(["entries"]), isOptimistic: false, styleHint: options.styleHint});
		// endregion

		const isAbilitySet = this._doPostProcess_setAbility(race, options);
		if (!isAbilitySet) {
			if (options.styleHint === SITE_STYLE__CLASSIC) {
				// If there is no ASI info, we assume ~~the worst~~ it's a post-VRGR "lineage" race
				race.lineage = "VRGR";
			}
		}

		// region Race-specific cleanup and generation
		this._doRacePostProcess_size(race, options);
		this._doRacePostProcess_speed(race, options);
		this._doRacePostProcess_speedFlight(race, options);
		this._doRacePostProcess_creatureType(race, options);
		this._doRacePostProcess_darkvision(race, options);

		if (race.entries) race.entries = race.entries.filter(ent => ent.type !== "list" || ent.items?.length);

		SkillTag.tryRunPropsStrictCapsWords(race, ["entries"], {styleHint: options.styleHint});

		RaceLanguageTag.tryRun(race, options);
		RaceImmResVulnTag.tryRun(race, options);
		RaceTraitTag.tryRun(race, options);
		// endregion
	}

	static _getNamedEntry ({race, reName}) {
		const entEntry = race.entries.find(it => reName.test(it.name || ""));
		if (entEntry) return {entry: entEntry, isInRoot: true};

		if (race.entries[0]?.type !== "list") return null;
		const [lst] = race.entries;

		const entList = lst.items.find(it => reName.test(it.name || ""));
		if (!entList) return null;

		return {entry: entList, isInRoot: false, entryParentList: lst};
	}

	static _doRacePostProcess_size (race, options) {
		const {entry, isInRoot, entryParentList} = this._getNamedEntry({race, reName: /^(?:Size|体型)[:：]?$/i}) || {};
		if (entry?.entries?.length !== 1) return options.cbWarning(`无法转换体型\u2014未找到 "体型" 属性！`);

		const text = entry.entries[0];

		const mOnlySize = /^(?<size>Medium|Small|Tiny|中型|小型|微型)\.?$/.exec(text);
		if (mOnlySize) {
			race.size = [
				mOnlySize.groups.size.toUpperCase()[0],
			];

			// Filter out "redundant" size info, as it will be displayed in subtitle
			if (isInRoot) race.entries = race.entries.filter(it => it !== entry);
			else entryParentList.items = entryParentList.items.filter(it => it !== entry);

			return;
		}

		const mSimple = /\b(?:You are|Your size is) (?<size>Medium|Small|Tiny)\.?$/.exec(text)
			|| /, (?:you are|your size is) (?<size>Medium|Small|Tiny)\.?$/.exec(text)
			|| /你(的体型)?[是为](?<size>Medium|Small|Tiny|中型|小型|微型)\.?$/.exec(text);
		if (mSimple) {
			race.size = [
				mSimple.groups.size.toUpperCase()[0],
			];

			// Filter out "redundant" size info, as it will be displayed in subtitle
			if (isInRoot) race.entries = race.entries.filter(it => it !== entry);
			else entryParentList.items = entryParentList.items.filter(it => it !== entry);

			return;
		}

		// "Medium (about 4–5 feet tall)"
		const mSimpleShort = /^(?<size>Medium|Small|Tiny|中型|小型|微型) *[(（][^)）]+[)）]$/.exec(text);
		if (mSimpleShort) {
			race.size = [
				mSimpleShort.groups.size.toUpperCase()[0],
			];

			// Filter out "redundant" size info, as it will be displayed in subtitle
			if (isInRoot) race.entries = race.entries.filter(it => it !== entry);
			else entryParentList.items = entryParentList.items.filter(it => it !== entry);

			return;
		}

		// "Choose whether you are Small or Medium sized."
		const mChooseTwo = /\b(?:You are|Your size is) (?<size1>Medium) or (?<size2>Small)\b/.exec(text)
			|| /\bChoose whether you are (?<size1>Small) or (?<size2>Medium) sized?\b/.exec(text)
			|| /你(的体型)?[是为](?<size1>中型)或(?<size2>小型)/.exec(text);
		if (mChooseTwo) {
			race.size = [
				mChooseTwo.groups.size1.toUpperCase()[0],
				mChooseTwo.groups.size2.toUpperCase()[0],
			];

			if (!isInRoot) {
				entryParentList.items = entryParentList.items.filter(it => it !== entry);
				entry.type = "item";
				race.sizeEntry = entry;
			}

			return;
		}

		// "Medium (about 4-7 feet tall) or Small (about 2-4 feet tall), chosen when you select this species"
		const mChooseTwoSpecies = /^(?<size1>Medium|中型) ?[(（][^)）]+[)）](?: or |或)(?<size2>Small|小型) ?[(（][^)）]+[)）]/i.exec(text);
		if (mChooseTwoSpecies) {
			race.size = [
				mChooseTwoSpecies.groups.size1.toUpperCase()[0],
				mChooseTwoSpecies.groups.size2.toUpperCase()[0],
			];

			if (!isInRoot) {
				entryParentList.items = entryParentList.items.filter(it => it !== entry);
				entry.type = "item";
				race.sizeEntry = entry;
			}

			return;
		}

		options.cbWarning(`体型文本 "${text}" 无法自动转换！`);
	}

	static _doRacePostProcess_speed (race, options) {
		const {entry, isInRoot, entryParentList} = this._getNamedEntry({race, reName: /^(?:Speed|移动速度|速度)[:：]?$/i}) || {};
		if (entry?.entries?.length !== 1) return options.cbWarning(`无法转换移动速度\u2014未找到 "移动速度" 属性！`);

		const text = entry.entries[0];

		const mSimple = /Your (?:base )?(?:walking )?speed is (?<speed>\d+) feet\.?$/.exec(text)
			|| /你?的?(?:基础)?(?:步行|移动)?速度[是为]?(?<speed>\d+)英?尺。?$/.exec(text);
		if (mSimple) {
			race.speed = Number(mSimple.groups.speed);

			// Filter out "redundant" size info, as it will be displayed in subtitle
			if (isInRoot) race.entries = race.entries.filter(it => it !== entry);
			else entryParentList.items = entryParentList.items.filter(it => it !== entry);

			return;
		}

		const mSimpleShort = /^(?<speed>\d+) feet\.?$/.exec(text)
		|| /^(?<speed>\d+) ?英?尺。?$/.exec(text);
		if (mSimpleShort) {
			race.speed = Number(mSimpleShort.groups.speed);

			// Filter out "redundant" size info, as it will be displayed in subtitle
			if (isInRoot) race.entries = race.entries.filter(it => it !== entry);
			else entryParentList.items = entryParentList.items.filter(it => it !== entry);

			return;
		}

		const mAltEqual = /Your (?:base )?walking speed is (?<speed>\d+) feet, and you have a (?<modeAlt>swim(?:ming)?|climb(?:ing)?) speed equal to your walking speed\./.exec(text)
			|| /你的(?:基础)?步行速度[是为] ?(?<speed>\d+) ?英?尺[,，] ?(?:同时|并且)你拥有(?:等同?于你的?步行速度|与你的?步行速度相同)的(?<modeAlt>游泳|攀爬)速度。?/.exec(text);
		if (mAltEqual) {
			const propAlt = this._doRacePostProcess_speed_getAltProp(mAltEqual.groups.modeAlt);
			race.speed = {
				walk: Number(mAltEqual.groups.speed),
				[propAlt]: true,
			};

			if (!isInRoot) {
				entryParentList.items = entryParentList.items.filter(it => it !== entry);
				entry.type = "item";
				race.speedEntry = entry;
			}

			return;
		}

		const mAltSingle = /Your (?:base )?walking speed is (?<speed>\d+) feet, and you have a (?<modeAlt>swim(?:ming)?|climb(?:ing)?) speed of (?<speedAlt>\d+) feet\./.exec(text)
		|| /你的(?:基础)?步行速度[是为] ?(?<speed>\d+) ?英?尺[,，] ?(?:同时|并且)?你拥有 ?(?<speedAlt>\d+) ?英?尺的(?<modeAlt>游泳|攀爬)速度。?/.exec(text);
		if (mAltSingle) {
			const propAlt = this._doRacePostProcess_speed_getAltProp(mAltSingle.groups.modeAlt);
			race.speed = {
				walk: Number(mAltSingle.groups.speed),
				[propAlt]: Number(mAltSingle.groups.speedAlt),
			};

			if (!isInRoot) {
				entryParentList.items = entryParentList.items.filter(it => it !== entry);
				entry.type = "item";
				race.speedEntry = entry;
			}

			return;
		}

		options.cbWarning(`速度文本 "${text}" 无法自动解析！`);
	}

	static _doRacePostProcess_speed_getAltProp (str) {
		switch (str.toLowerCase().trim()) {
			case "游泳":
			case "swimming":
			case "swim":
				return "swim";

			case "攀爬":
			case "climbing":
			case "climb":
				return "climb";

			default: throw new Error(`Unhandled!`);
		}
	}

	static _doRacePostProcess_speedFlight (race, options) {
		if (race.speed == null) return;

		let found = false;

		const walker = MiscUtil.getWalker({isNoModification: true, isBreakOnReturn: true});

		for (const entry of race.entries) {
			walker.walk(
				entry.entries,
				{
					string: (str) => {
						found = (/\byou have a flying speed equal to your walking speed\b/i.test(str)
							&& !/\b(?:temporarily|temporary)\b/i.test(str)
							&& !/\buntil [^.]+ ends\b/i.test(str))
							|| (/你拥有(?:等同?于你的?步行速度|与你的?步行速度相同)的飞行速度/i.test(str)
								&& !/临时/i.test(str)
								&& !/直到[^.]+结束/i.test(str));

						if (found) return true;
					},
				},
			);
			if (found) break;
		}

		if (!found) return;

		if (typeof race.speed === "number") {
			race.speed = {walk: race.speed, fly: true};
		} else {
			race.speed.fly = true;
		}
	}

	static _RE_CREATURE_TYPES = new RegExp(`^(?:You are(?: an?)? |你(?:是|属于)(?:一个)?)(?<type>${Parser.MON_TYPES.map(it => it.uppercaseFirst()).join("|")})(?:生物)?(?:\\.|。|$)`);
	static _RE_CREATURE_TYPES_SHORT = new RegExp(`^(?<type>${Parser.MON_TYPES.map(it => it.uppercaseFirst()).join("|")})\\.?$`);
	static _doRacePostProcess_creatureType (race, options) {
		const {entry, isInRoot, entryParentList} = this._getNamedEntry({race, reName: /^(?:Creature Type|生物类型)[:：]?$/i}) || {};
		if (!entry) return; // If unspecified, defaults to humanoid

		if (entry?.entries?.length !== 1) return options.cbWarning(`无法转换生物类型文本\u2014未找到 "生物类型" 文本！`);

		let text = entry.entries[0];

		const mSimpleShort = this._RE_CREATURE_TYPES_SHORT.exec(text);
		if (mSimpleShort) {
			const type = mSimpleShort.groups.type.toLowerCase();

			// Filter out "redundant" creature type info, as we assume "undefined" = "humanoid"
			if (isInRoot && (type === Parser.TP_HUMANOID || type === Parser.MON_TYPE_TO_PLURAL[Parser.TP_HUMANOID])) {
				race.entries = race.entries.filter(it => it !== entry);
				return;
			}

			race.creatureTypes = [type];

			if (isInRoot) race.entries = race.entries.filter(it => it !== entry);
			else entryParentList.items = entryParentList.items.filter(it => it !== entry);

			return;
		}

		let isSimple = true;
		const types = [];
		text = text
			.replace(/^(?:You are a Humanoid|你是(?:一个)?类人生物)(?:\.|。|$)/i, () => {
				types.push(Parser.TP_HUMANOID);
				return "";
			})
			.trim()
			.replace(this._RE_CREATURE_TYPES, (...m) => {
				types.push(m.last().type.toLowerCase());
				return "";
			})
			.trim()
			.replace(/You are also considered an? (?<tag>[-a-z]+) for any prerequisite or effect that requires you to be an? \k<tag>\./, (...m) => {
				race.creatureTypeTags = [m.last().tag.toLowerCase()];
				isSimple = false;
				return "";
			})
			.replace(/如果有任何[前提|先决条件]或效[果应]需要你作为(?:一个)?(?<tag>.+)[,，]你也被视[作为]\k<tag>[.。]/, (...m) => {
				race.creatureTypeTags = [m.last().tag.toLowerCase()];
				isSimple = false;
				return "";
			})
		;

		// Filter out "redundant" creature type info, as we assume "undefined" = "humanoid"
		if (isInRoot) {
			if (types.length === 1
				&& (types[0] === Parser.TP_HUMANOID || types[0] === Parser.MON_TYPE_TO_PLURAL[Parser.TP_HUMANOID])
				&& !race.creatureTypeTags?.length) {
				race.entries = race.entries.filter(it => it !== entry);
			}
		} else {
			race.creatureTypes = types;
			entryParentList.items = entryParentList.items.filter(it => it !== entry);
			if (!isSimple) {
				entry.type = "item";
				race.creatureTypesEntry = entry;
			}
		}

		if (text) {
			options.cbWarning(`生物类型 "${text}" 无法自动转换！`);
		}
	}

	static _doRacePostProcess_darkvision (race, options) {
		const {entry} = this._getNamedEntry({race, reName: /^(?:Darkvision|黑暗视觉)[:：]?$/i}) || {};
		if (!entry?.entries?.length) return;

		const walker = MiscUtil.getWalker({isNoModification: true, isBreakOnReturn: true});
		walker.walk(
			entry,
			{
				string: (str) => {
					const stStripped = Renderer.stripTags(str);

					const mDarkvision = /\bsee [^.]+ dim light [^.]+ (?<radius>\d+) feet [^.]+ bright light/i.exec(stStripped)
					|| /在?(?:昏暗|微光)(?:环境|照明|光照|条件)[下中里][,，]?你(?:可以|能)[在将]你(?:周围)? ?(?<radius>\d+) ?英?尺(?:范围)?内的区域(?:视为|当做)明亮光照/i.exec(stStripped);
					if (mDarkvision) {
						race.darkvision = Number(mDarkvision.groups.radius);
						return true;
					}

					const mDarkvisionShort = /You have Darkvision with a range of (?<radius>\d+) feet/i.exec(stStripped)
						|| /You have (?<radius>\d+) feet of Darkvision/i.exec(stStripped)
						|| /你的黑暗视觉(?:能力)?提升至 ?(?<radius>\d+) ?英?尺/i.exec(stStripped)
						|| /你(?:拥有|获得) ?(?<radius>\d+) ?英?尺的黑暗视觉(?:能力)?/i.exec(stStripped);
					if (mDarkvisionShort) {
						race.darkvision = Number(mDarkvisionShort.groups.radius);
						return true;
					}

					return false;
				},
			},
		);
	}
}
