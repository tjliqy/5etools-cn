function _cleanHyperlinks (text) {
	return `${text || ""}`
		.replace(/HYPERLINK\s+"[^"]*"\s+\\l\s+"[^"]*"\s+\\h\s*/g, "")
		.replace(/HYPERLINK\s+\\l\s+"[^"]*"\s*/g, "")
		.replace(/HYPERLINK\s+"[^"]*"\s*/g, "")
		.replace(/\\[a-z]\b/g, "")
		.replace(/[ \t]+/g, " ")
		.trim();
}

function _lines (text) {
	return _cleanHyperlinks(text)
		.replace(/\r\n?/g, "\n")
		.split("\n")
		.map(it => it.trim())
		.filter(Boolean);
}

function _splitName (line) {
	const cleaned = _cleanHyperlinks(line);
	const match = /^(?<name>[\p{Script=Han}·•（）()，、\s]+?)(?<eng>[A-Z][A-Za-z0-9'’() .,\-:]+)?$/u.exec(cleaned);
	if (!match) return {name: cleaned, ENG_name: ""};

	return {
		name: match.groups.name.trim(),
		ENG_name: (match.groups.eng || "").trim(),
	};
}

function _parseSizeTypeAlignment (line) {
	const match = /^(?<size>微型|小型|中型|大型|巨型|超巨型)\s+(?<type>[^,，]+)(?:[,，]\s*(?<alignment>.+))?$/u.exec(line);
	const sizeMap = {
		"微型": "T",
		"小型": "S",
		"中型": "M",
		"大型": "L",
		"巨型": "H",
		"超巨型": "G",
	};
	const typeMap = {
		"龙": "dragon",
		"类人生物": "humanoid",
		"构装生物": "construct",
		"野兽": "beast",
		"不死生物": "undead",
		"邪魔": "fiend",
		"天界生物": "celestial",
		"元素生物": "elemental",
		"精类": "fey",
		"巨人": "giant",
		"怪兽": "monstrosity",
		"泥形怪物": "ooze",
		"植物": "plant",
	};

	if (!match) return {};

	const rawType = match.groups.type.trim();
	const typeBase = rawType.replace(/\s*\([^)]*\)\s*/g, "").trim();
	const tagMatch = /\((?<tag>[^)]+)\)/u.exec(rawType);

	return {
		size: [sizeMap[match.groups.size] || match.groups.size],
		type: tagMatch
			? {type: typeMap[typeBase] || typeBase, tags: [tagMatch.groups.tag.trim()]}
			: (typeMap[typeBase] || typeBase),
		alignment: _parseAlignment(match.groups.alignment || ""),
	};
}

function _parseAlignment (text) {
	if (/任意阵营/u.test(text)) return ["A"];
	const out = [];
	if (/守序/u.test(text)) out.push("L");
	else if (/混乱/u.test(text)) out.push("C");
	else if (/中立/u.test(text)) out.push("N");

	if (/善良/u.test(text)) out.push("G");
	else if (/邪恶/u.test(text)) out.push("E");
	else if (/中立/u.test(text) && !out.includes("N")) out.push("N");

	return out.length ? out : ["U"];
}

function _parseAc (line) {
	const match = /^AC\s*(?<ac>\d+)(?:\s*\((?<from>[^)）]+)[)）])?/iu.exec(line);
	if (!match) return null;
	return [{
		ac: Number(match.groups.ac),
		...(match.groups.from ? {from: [match.groups.from.trim()]} : {}),
	}];
}

function _parseHp (line) {
	const match = /^HP\s*(?<average>\d+)(?:\s*\((?<formula>[^)）]+)[)）])?/iu.exec(line);
	if (!match) return null;
	return {
		average: Number(match.groups.average),
		...(match.groups.formula ? {formula: match.groups.formula.trim()} : {}),
	};
}

function _parseSpeed (line) {
	const out = {};
	for (const part of line.replace(/^速度\s*/u, "").split(/[,，]/u).map(it => it.trim()).filter(Boolean)) {
		const match = /^(?:(?<kind>掘穴|攀爬|飞行|游泳)\s*)?(?<speed>\d+)\s*尺/u.exec(part);
		if (!match) continue;
		const kindMap = {"掘穴": "burrow", "攀爬": "climb", "飞行": "fly", "游泳": "swim"};
		out[kindMap[match.groups.kind] || "walk"] = Number(match.groups.speed);
	}
	return Object.keys(out).length ? out : null;
}

function _parseAbilities (lineA, lineB) {
	const joined = `${lineA || ""} ${lineB || ""}`;
	const map = {力量: "str", 敏捷: "dex", 体质: "con", 智力: "int", 感知: "wis", 魅力: "cha"};
	const out = {};
	for (const [cn, key] of Object.entries(map)) {
		const match = new RegExp(`${cn}\\s*(\\d+)`, "u").exec(joined);
		if (match) out[key] = Number(match[1]);
	}
	return Object.keys(out).length === 6 ? out : null;
}

function _parseBonusMap (line, prefix) {
	const out = {};
	const body = line.replace(new RegExp(`^${prefix}[：:]\\s*`, "u"), "");
	const map = {
		力量: "str",
		敏捷: "dex",
		体质: "con",
		智力: "int",
		感知: "wis",
		魅力: "cha",
		察觉: "perception",
		隐匿: "stealth",
		求生: "survival",
	};
	for (const part of body.split(/[、,，]/u).map(it => it.trim()).filter(Boolean)) {
		const match = /(?<name>[\p{Script=Han}A-Za-z]+)\s*(?<bonus>[+-]\d+)/u.exec(part);
		if (!match) continue;
		out[map[match.groups.name] || match.groups.name] = match.groups.bonus;
	}
	return Object.keys(out).length ? out : null;
}

function _parseSenses (line) {
	const body = line.replace(/^感官\s*/u, "");
	const passiveMatch = /被动感知\s*(?<passive>\d+)/u.exec(body);
	const senses = body
		.split(/[,，]/u)
		.map(it => it.trim())
		.filter(it => it && !/^被动感知/u.test(it));
	return {
		...(senses.length ? {senses} : {}),
		...(passiveMatch ? {passive: Number(passiveMatch.groups.passive)} : {}),
	};
}

function _parseCr (line) {
	return /挑战等级\s*(?<cr>[\d/]+)/u.exec(line)?.groups?.cr || null;
}

const _DAMAGE_TYPE_MAP = {
	强酸: "acid",
	钝击: "bludgeoning",
	冷冻: "cold",
	寒冷: "cold",
	火焰: "fire",
	力场: "force",
	闪电: "lightning",
	暗蚀: "necrotic",
	死灵: "necrotic",
	穿刺: "piercing",
	毒素: "poison",
	毒性: "poison",
	心灵: "psychic",
	光耀: "radiant",
	挥砍: "slashing",
	雷鸣: "thunder",
};

function _parseDamageTypes (line, prefix) {
	return line.replace(new RegExp(`^${prefix}[：:]\\s*`, "u"), "")
		.split(/[、,，]/u)
		.map(it => it.trim())
		.filter(Boolean)
		.map(it => _DAMAGE_TYPE_MAP[it] || it);
}

function _parseEntryLine (line) {
	const match = /^(?<name>[^.。]+)[.。]\s*(?<entry>.+)$/u.exec(line);
	if (!match) return null;
	return {
		name: match.groups.name.trim(),
		entries: [match.groups.entry.trim()],
	};
}

function _parseSections (lines) {
	const trait = [];
	const action = [];
	let current = null;

	for (const line of lines) {
		if (line === "特质") {
			current = trait;
			continue;
		}
		if (line === "动作") {
			current = action;
			continue;
		}
		if (!current) continue;

		const parsed = _parseEntryLine(line);
		if (parsed) current.push(parsed);
		else if (current.length) current.at(-1).entries.push(line);
	}

	return {
		...(trait.length ? {trait} : {}),
		...(action.length ? {action} : {}),
	};
}

export function tryParseChineseMonster ({rawText, source = "", page = 0, entityTitle = null} = {}) {
	const lines = _lines(rawText);
	if (!lines.length || !lines.some(line => /^AC\s*\d+/iu.test(line)) || !lines.some(line => /^HP\s*\d+/iu.test(line))) return null;

	const nameLineIx = lines.findIndex((line, ix) => ix < 4 && /[A-Za-z]/.test(line));
	const nameInfo = _splitName(lines[nameLineIx >= 0 ? nameLineIx : 0]);
	if (entityTitle && !/[A-Za-z]/.test(entityTitle)) nameInfo.name = entityTitle;

	const out = {
		name: nameInfo.name,
		source,
		page,
		...(nameInfo.ENG_name ? {ENG_name: nameInfo.ENG_name} : {}),
	};

	const typeIx = lines.findIndex(line => /^(微型|小型|中型|大型|巨型|超巨型)\s/u.test(line));
	Object.assign(out, _parseSizeTypeAlignment(lines[typeIx] || ""));

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (/^AC\s*\d+/iu.test(line)) out.ac = _parseAc(line);
		if (/^HP\s*\d+/iu.test(line)) out.hp = _parseHp(line);
		if (/^速度\s*/u.test(line)) out.speed = _parseSpeed(line);
		if (/^力量/u.test(line)) Object.assign(out, _parseAbilities(line, lines[i + 1]) || {});
		if (/^豁免[：:]/u.test(line)) out.save = _parseBonusMap(line, "豁免");
		if (/^技能\s/u.test(line)) out.skill = _parseBonusMap(line, "技能");
		if (/^伤害免疫[：:]/u.test(line)) out.immune = _parseDamageTypes(line, "伤害免疫");
		if (/^感官\s/u.test(line)) Object.assign(out, _parseSenses(line));
		if (/^语言\s/u.test(line)) out.languages = line.replace(/^语言\s*/u, "").split(/[、,，]/u).map(it => it.trim()).filter(Boolean);
		if (/^挑战等级\s/u.test(line)) out.cr = _parseCr(line);
	}

	Object.assign(out, _parseSections(lines));

	return out;
}

const _RARITY_MAP = {
	"普通": "common",
	"非普通": "uncommon",
	"珍稀": "rare",
	"极珍稀": "very rare",
	"传说": "legendary",
	"神器": "artifact",
};

export function tryParseChineseItem ({rawText, source = "", page = 0, entityTitle = null} = {}) {
	const lines = _lines(rawText);
	if (lines.length < 3 || !/(奇物|普通|非普通|珍稀|极珍稀|传说|神器)/u.test(lines[1] || "")) return null;

	const nameInfo = _splitName(lines[0]);
	if (entityTitle && !/[A-Za-z]/.test(entityTitle)) nameInfo.name = entityTitle;

	const tags = (lines[1] || "").split(/[,，]/u).map(it => it.trim()).filter(Boolean);
	const out = {
		name: nameInfo.name,
		source,
		page,
		...(nameInfo.ENG_name ? {ENG_name: nameInfo.ENG_name} : {}),
		entries: lines.slice(2),
	};

	if (tags.some(it => it === "奇物")) out.wondrous = true;
	const rarityTag = tags.find(it => Object.keys(_RARITY_MAP).some(rarity => it.startsWith(rarity)));
	if (rarityTag) {
		const rarity = Object.keys(_RARITY_MAP).find(it => rarityTag.startsWith(it));
		out.rarity = _RARITY_MAP[rarity];
	}

	const weightMatch = /(?<weight>\d+(?:\.\d+)?)\s*磅/u.exec(lines[1] || "");
	if (weightMatch) out.weight = Number(weightMatch.groups.weight);

	return out;
}
