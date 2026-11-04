export class ConverterUtils {
	static _RE_SPLIT_CONJUNCT = /(?:,? (?:and|or) |, |、|和|或|，)/gi;

	static splitConjunct (str) {
		return str
			.split(this._RE_SPLIT_CONJUNCT)
			.map(it => it.trim())
			.filter(Boolean)
		;
	}

	static isHasCharOutwithParens (str, char) {
		let cntParens = 0;
		for (const c of str) {
			if (c === "(") cntParens++;
			else if (c === ")") cntParens--;
			else if (c === char && !cntParens) return true;
		}
		return false;
	}

	/* -------------------------------------------- */

	static isJsonLine (curLine) { return curLine.startsWith(`__VE_JSON__`); }

	static getJsonFromLine (curLine) {
		curLine = curLine.replace(/^__VE_JSON__/, "");
		return JSON.parse(curLine);
	}

	/* -------------------------------------------- */

	static _ContinuationLineType = class {
		constructor ({isPossible, isContinuation}) {
			this.isPossible = isPossible;
			this.isContinuation = isContinuation;
		}
	};

	static CONT_LINE_NO = new this._ContinuationLineType({isPossible: false, isContinuation: false});
	static CONT_LINE_YES = new this._ContinuationLineType({isPossible: true, isContinuation: true});
	static CONT_LINE_MAYBE = new this._ContinuationLineType({isPossible: true, isContinuation: false});

	/**
	 * Check if a line is likely to be a badly-newline'd continuation of the previous line.
	 * @param entryArray
	 * @param curLine
	 * @param [opts]
	 * @param [opts.noLowercase] Disable lowercase-word checking.
	 * @param [opts.noNumber] Disable number checking.
	 * @param [opts.noParenthesis] Disable parenthesis ("(") checking.
	 * @param [opts.noSavingThrow] Disable saving throw checking.
	 * @param [opts.noAbilityName] Disable ability checking.
	 * @param [opts.noHit] Disable "Hit:" checking.
	 * @param [opts.noSpellcastingAbility] Disable spellcasting ability checking.
	 * @param [opts.noSpellcastingWarlockSlotLevel] Disable spellcasting warlock slot checking.
	 * @param [opts.noSpellcastingCharges] Disable spellcasting charges checking.
	 * @param [opts.noDc] Disable "DC" checking
	 */
	static getContinuationLineType (entryArray, curLine, opts) {
		opts = opts || {};

		// If there is no previous entry to add to, do not continue
		if (!entryArray) return this.CONT_LINE_NO;
		const lastEntry = entryArray.last();
		if (typeof lastEntry !== "string") return this.CONT_LINE_NO;

		// If the current string ends in a comma
		if (/,\s*$/.test(lastEntry)) return this.CONT_LINE_YES;
		// If the current string ends in a dash
		if (/[-\u2014]\s*$/.test(lastEntry)) return this.CONT_LINE_YES;
		// If the current string ends in a conjunction
		if (/ (?:and|or)\s*$/.test(lastEntry)) return this.CONT_LINE_YES;

		const cleanLine = curLine.trim();

		if (/^\d..-\d..[- ][Ll]evel\s+\(/.test(cleanLine) && !opts.noSpellcastingWarlockSlotLevel) return this.CONT_LINE_NO;
		if (/^\d Charges?\b/i.test(cleanLine) && !opts.noSpellcastingCharges) return this.CONT_LINE_NO;

		// Start of a list item
		if (/^[•●]/.test(cleanLine)) return this.CONT_LINE_NO;

		// A lowercase word
		if (/^[a-z]/.test(cleanLine) && !opts.noLowercase) return this.CONT_LINE_YES;
		// An ordinal (e.g. "3rd"), but not a spell level (e.g. "1st level")
		if (/^\d[a-z][a-z]/.test(cleanLine) && !/^\d[a-z][a-z][- ][Ll]evel/gi.test(cleanLine)) return this.CONT_LINE_YES;
		// A number (e.g. damage; "5 (1d6 + 2)"), optionally with slash-separated parts (e.g. "30/120 ft.")
		if (/^\d+(\/\d+)*\s+/.test(cleanLine) && !opts.noNumber) return this.CONT_LINE_YES;
		// Opening brackets (e.g. damage; "(1d6 + 2)")
		if (/^\(/.test(cleanLine) && !opts.noParenthesis) return this.CONT_LINE_YES;
		// An ability score name
		if (/^(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s/.test(cleanLine) && !opts.noAbilityName) return this.CONT_LINE_YES;
		// "Hit:" e.g. inside creature attacks
		if (/^(Intelligence|Wisdom|Charisma)\s+\(/.test(cleanLine) && !opts.noSpellcastingAbility) return this.CONT_LINE_YES;
		if (/^DC\s+/.test(cleanLine) && !opts.noDc) return this.CONT_LINE_YES;
		if (/^(?:Additionally, |Its )/.test(cleanLine)) return this.CONT_LINE_YES;

		return this.CONT_LINE_MAYBE;
	}

	/* -------------------------------------------- */

	static getTokens (str) { return str.split(/[ \n\u2013\u2014]/g).map(it => it.trim()).filter(Boolean); }

	/**
	 * (Inline titles)
	 * Checks if a line of text starts with a name, e.g.
	 * "Big Attack. Lorem ipsum..." vs "Lorem ipsum..."
	 * @param line
	 * @param {Set} exceptions A set of (lowercase) exceptions which should always be treated as "not a name" (e.g. "cantrips")
	 * @param {RegExp} splitterPunc Regexp to use when splitting by punctuation.
	 * @returns {boolean}
	 */
	static isNameLine (line, {exceptions = null, splitterPunc = null} = {}) {
		if (ConverterUtils.isListItemLine(line)) return false;

		const spl = this._getMergedSplitName({line, splitterPunc});
		if (spl.map(it => it.trim()).filter(Boolean).length === 1) return false;

		if (
			// Heuristic: single-column text is generally 50-60 characters; shorter lines with no other text are likely not name lines
			spl.join("").length <= 40
			&& spl.map(it => it.trim()).filter(Boolean).length === 2
			&& /^[.!?:。！？：]$/.test(spl[1])
		) return false;

		// ignore everything inside parentheses
		const namePart = ConverterUtils.getWithoutParens(spl[0]);
		if (!namePart) return false; // (If this is _everything_ cancel)

		const reStopwords = new RegExp(`^(${StrUtil.TITLE_LOWER_WORDS.join("|")})$`, "i");
		const tokens = namePart.split(/([ ,;:，；：]+)/g);
		const cleanTokens = tokens.filter(it => {
			const isStopword = reStopwords.test(it.trim());
			reStopwords.lastIndex = 0;
			return !isStopword;
		});

		const namePartNoStopwords = cleanTokens.join("").trim();

		// if it's an ability score, it's not a name
		if (Object.values(Parser.ATB_ABV_TO_FULL).includes(namePartNoStopwords)) return false;

		// if it's a dice, it's not a name
		if (/^\d*d\d+\b/.test(namePartNoStopwords)) return false;

		if (exceptions && exceptions.has(namePartNoStopwords.toLowerCase())) return false;

		// if it's in title case after removing all stopwords, it's a name
		if (namePartNoStopwords.toTitleCase() !== namePartNoStopwords) return false;

		if (/[\u4e00-\u9fa5]/.test(namePartNoStopwords)) {
			// 计算中文字符数量
			const chineseCount = namePartNoStopwords.match(/[\u4e00-\u9fa5]/g)?.length || 0;
			return chineseCount <= 10;
		}
		return true;
	}

	static isTitleLine (line) {
		line = line.trim();

		if (line.startsWith("特性：")) return true;

		const lineNoPrefix = line.replace(/^Feature: /, "").replace(/^特性[：:]/, "");
		if (lineNoPrefix.length && lineNoPrefix.toTitleCase() === lineNoPrefix && !(/[\u4e00-\u9fa5]/.test(lineNoPrefix))) return true;

		if (/[.!?:。！？：]/.test(line)) return false;

		if (line.toTitleCase() !== line) return false;

		const chineseCount = line.match(/[\u4e00-\u9fa5]/g)?.length || 0;
		return chineseCount <= 10;
	}

	static isListItemLine (line) { return /^[•●]/.test(line.trim()); }

	static splitNameLine (line, isKeepPunctuation = false) {
		const spl = this._getMergedSplitName({line});
		const rawName = spl[0];
		const entry = line.substring(rawName.length + spl[1].length, line.length).trim();
		const name = this.getCleanTraitActionName(rawName);
		const out = {name, entry};

		if (
			isKeepPunctuation
			// If the name ends with something besides ".", maintain it
			|| /^[?!:？！：]"?$/.test(spl[1])
		) out.name += spl[1].trim();

		return out;
	}

	static _CONTRACTIONS = new Set(["Mr.", "Mrs.", "Ms.", "Dr."]);

	static _getMergedSplitName ({line, splitterPunc}) {
		let spl = line.split(splitterPunc || /([.!?:。！？：]+)/g);

		// Handle e.g. "Feature: Name of the Feature"
		if (
			spl.length === 3
			&& (spl[0] === "Feature" || spl[0] === "特性")
			&& (spl[1] === ":" || spl[1] === "：")
			&& spl[2].toTitleCase() === spl[2]
		) return [spl.join("")];

		// Handle e.g. "特性：特性名 Feature: Name of the Feature"
		if (
			spl.length === 5
			&& (spl[0] === "特性")
			&& (spl[1] === ":" || spl[1] === "：")
			&& (spl[2].endsWith("Feature"))
			&& (spl[3] === ":" || spl[3] === "：")
			&& spl[4].toTitleCase() === spl[4]
		) return [spl.join("")];
		if (
			spl.length > 3
			&& (
				// Handle e.g. "1. Freezing Ray. ..."
				/^\d+(?:-\d+)?$/.test(spl[0])
				// Handle e.g. "1-10: "All Fine Here!" ..."
				|| /^\d+-\d+:?$/.test(spl[0])
				// Handle e.g. "Action 1: Close In. ...
				|| /^Action \d+$/.test(spl[0])
				|| /^动作\s*\d+[:：].+/.test(spl[0])
				// Handle e.g. "5th Level: Lay Low (3/Day). ..."
				|| /^\d+(?:st|nd|rd|th) Level$/.test(spl[0])
				|| /^(?:\d+|[一二三四五六七八九十])\s*环$/.test(spl[0])
			)
		) {
			spl = [
				spl.slice(0, 3).join(""),
				...spl.slice(3),
			];
		}

		// Handle e.g. "Mr. Blue" or "If Mr. Blue"
		for (let i = 0; i < spl.length - 2; ++i) {
			const toCheck = `${spl[i]}${spl[i + 1]}`;
			if (!toCheck.split(" ").some(it => this._CONTRACTIONS.has(it))) continue;
			spl[i] = `${spl[i]}${spl[i + 1]}${spl[i + 2]}`;
			spl.splice(i + 1, 2);
		}

		// Handle e.g. "Shield? Shield! ..."
		if (
			spl.length > 4
			&& spl[0].trim() === spl[2].trim()
			&& /^[.!?:]+$/g.test(spl[1])
			&& /^[.!?:]+$/g.test(spl[3])
		) {
			spl = [
				spl.slice(0, 3).join(""),
				...spl.slice(3),
			];
		}

		// Handle e.g. "3rd Level: Death from Above! (3/Day). ..."
		if (
			spl.length > 3
			&& (
				/^[.!?:]+$/.test(spl[1])
				&& /^\s*\([^)]+\)\s*$/.test(spl[2])
				&& /^[.!?:]+$/.test(spl[3])
			)
		) {
			spl = [
				spl.slice(0, 3).join(""),
				...spl.slice(3),
			];
		}

		if (spl.length >= 3 && spl[0].includes(`"`) && spl[2].startsWith(`"`)) {
			spl = [
				`${spl[0]}${spl[1]}${spl[2].slice(0, 1)}`,
				"",
				spl[2].slice(1),
				...spl.slice(3),
			];
		}

		return spl;
	}

	static getCleanTraitActionName (name) {
		return name
			// capitalize unit in e.g. "(3/Day)"
			.replace(/([(（]\d+\/)([a-z])([^)）]+[)）])/g, (...m) => `${m[1]}${m[2].toUpperCase()}${m[3]}`)
		;
	}

	/**
	 * Takes a string containing parenthesized parts, and removes them.
	 */
	static getWithoutParens (string) {
		let skipSpace = false;
		let char;
		let cleanString = "";

		const len = string.length;
		for (let i = 0; i < len; ++i) {
			char = string[i];

			switch (char) {
				case "）":
				case ")": {
					// scan back through the stack, remove last parens
					let foundOpen = -1;
					for (let j = cleanString.length - 1; j >= 0; --j) {
						if (cleanString[j] === "(" || cleanString[j] === "（") {
							foundOpen = j;
							break;
						}
					}

					if (~foundOpen) {
						cleanString = cleanString.substring(0, foundOpen);
						skipSpace = true;
					} else {
						cleanString += ")";
					}
					break;
				}
				case " ":
					if (skipSpace) skipSpace = false;
					else cleanString += " ";
					break;
				default:
					skipSpace = false;
					cleanString += char;
					break;
			}
		}

		return cleanString;
	}

	static cleanDashes (str) { return str.replace(/[-\u2011-\u2015]/g, "-"); }

	static isStatblockLineHeaderStart ({reStartStr, line}) {
		const m = this._getStatblockLineHeaderRegExp({reStartStr}).exec(line);
		return m?.index === 0;
	}

	static getStatblockLineHeaderText ({reStartStr, line}) {
		const m = this._getStatblockLineHeaderRegExp({reStartStr}).exec(line);
		if (!m) return line;
		return line.slice(m.index + m[0].length).trim();
	}

	static _getStatblockLineHeaderRegExp ({reStartStr}) {
		return new RegExp(`\\s*${reStartStr}\\s*?(?::|\\.|：|\\s|\\b)?\\s*`, "i");
	}

	/* -------------------------------------------- */

	static mutSetEntryTypePretty ({obj, type}) {
		const tmp = {...obj};
		delete tmp.type;
		Object.keys(obj).forEach(k => delete obj[k]);
		obj.type = type;
		Object.assign(obj, tmp);
		return obj;
	}

	static splitNameToChineseAndEnglish (originName) {
		let cnName = "";
		let enName = "";
		let cnBracket = "";
		let enBracket = "";

		// 去除首尾空格
		const trimmedName = originName
			.trim()
			.replace(/[（(][a-zA-Z0-9\s\/]+[)）]$/i, (...m) => { // eslint-disable-line no-useless-escape
				enBracket = m[0].trim();
				return "";
			})
			.trim()
			.replace(/[（(][\u4e00-\u9fa50-9\s\/-~]+[)）]$/i, (...m) => { // eslint-disable-line no-useless-escape
				cnBracket = m[0].trim();
				return "";
			})
			.trim();

		let trailingTag = "";
		const trimmedName2 = trimmedName
			.replace(/\{@[^}]+}$/, (...m) => {
				trailingTag = m[0];
				return "";
			})
			.trim();

		const pattern = /^([a-zA-Z0-9\s]+)\s*([\u4e00-\u9fa5]+)$|^([\u4e00-\u9fa5]+)\s*([a-zA-Z0-9\s]+)$|^([\u4e00-\u9fa5]+)$|^([a-zA-Z0-9\s]+)$/;
		const match = trimmedName2.match(pattern);

		if (match) {
			// 英文在前中文在后的情况
			if (match[1] && match[2]) {
				enName = match[1].trim();
				cnName = match[2].trim();
			} else if (match[3] && match[4]) {
			// 中文在前英文在后的情况
				cnName = match[3].trim();
				enName = match[4].trim();
			} else if (match[5]) {
			// 只有中文的情况
				cnName = match[5].trim();
			} else if (match[6]) {
			// 只有英文的情况
				enName = match[6].trim();
			}
		}

		// 如果没有匹配到，使用原始逻辑作为 fallback
		if (!cnName && !enName) {
			let names = trimmedName2.split(/[|｜]/);
			if (names.length !== 2) {
				names = trimmedName2.split(/\s+/);
			}
			names.forEach(n => {
				if (/[\u4e00-\u9fa5]/.test(n)) {
					cnName = cnName ? `${cnName} ${n.trim()}` : n.trim();
				} else {
					enName = enName ? `${enName} ${n.trim()}` : n.trim();
				}
			});
		}
		if (cnBracket) cnName = `${cnName}${cnBracket}${trailingTag}`;
		if (enBracket) enName = `${enName} ${enBracket}${trailingTag}`;
		if (/^[a-zA-Z]\w+\.$/.test(enName)) cnName = enName + cnName; enName = "";
		return [cnName, enName];
	}
}
