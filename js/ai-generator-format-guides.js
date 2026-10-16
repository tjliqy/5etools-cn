const _GUIDES = {
	monster: {
		core: `## 怪物基础结构
每只怪物是一个对象。常用字段：name（简体中文名称）；source 由页面按用户选择的来源写入，不要自行编造；size 为体型代码数组，只能使用 T（微型）、S（小型）、M（中型）、L（大型）、H（巨型）、G（超巨型）、V（不定）；type 为类型字符串或对象。type 的标准值只能是 aberration、beast、celestial、construct、dragon、elemental、fey、fiend、giant、humanoid、monstrosity、ooze、plant、undead；类人亚种可写在 tags 中，例如 {"type":"humanoid","tags":["goblinoid"]}；tags 是内容标签，不属于固定枚举。alignment 数组中的每个代码只能是 L（守序）、N（中立）、NX（守序/混乱轴中立）、NY（善良/邪恶轴中立）、C（混乱）、G（善良）、E（邪恶）、U（无阵营）、A（任意阵营）；需要组合阵营时组合这些代码，特殊说明使用 {"special":"说明"}，不要把中文阵营名称放入代码数组。ac 为数字数组或带有 ac、from 说明的对象数组；hp 为 {"average":数字,"formula":"骰式"}；speed 为移动方式对象，只能使用 walk、burrow、climb、fly、swim 作为移动方式键，例如 {"walk":30,"fly":{"number":30,"condition":"悬浮"}}；str、dex、con、int、wis、cha 为 1–30 的整数。save 的键只能是 str、dex、con、int、wis、cha；skill 的键只能是 acrobatics、animalHandling、arcana、athletics、deception、history、insight、intimidation、investigation、medicine、nature、perception、performance、persuasion、religion、sleightOfHand、stealth、survival；senses 的键只能是 blindsight、darkvision、tremorsense、truesight。immune、resist、vulnerable 的标准伤害类型只能是 acid、bludgeoning、cold、fire、force、lightning、necrotic、piercing、poison、psychic、radiant、slashing、thunder；conditionImmune 只能使用 blinded（目盲）、charmed（魅惑）、deafened（耳聋）、exhaustion（力竭）、frightened（恐慌）、grappled（受擒）、incapacitated（失能）、invisible（隐形）、paralyzed（麻痹）、petrified（石化）、poisoned（中毒）、prone（倒地）、restrained（束缚）、stunned（震慑）、unconscious（昏迷）。cr 可为数字、字符串或对象，如 "1/4"、"5"。不要用字符串替代这些字段要求的对象或数组，也不要输出以上白名单以外的枚举值。`,
		traits: `## 怪物特质与动作
trait、action、reaction、bonus、legendary、mythic 均为可选数组；本生成器至少要求 trait 或 action 有一项。数组元素使用 {"name":"简体中文标题","entries":["简体中文规则描述"]}。entries 可使用 5etools 标签，例如 {@hit 5}、{@damage 1d6 + 2}、{@dc 13}、{@condition 中毒}。只生成输入提到或创意确实需要的章节；攻击描述应说明攻击类型、命中加值、触及/射程、目标和伤害。`,
		spellcasting: `## 怪物施法字段
施法能力放在 spellcasting 数组中；每项常用结构为 {"name":"施法","type":"spellcasting","headerEntries":["说明施法属性、豁免 DC 等"],"ability":"int","will":["{@spell 法师护甲|PHB}"],"daily":{"1":["{@spell 火球术|PHB}"]},"displayAs":"action"}。type 固定为 "spellcasting"；ability 只能是 str、dex、con、int、wis、cha；displayAs 只能是 action、bonus、reaction、legendary。按需使用 will、daily、rest、weekly 或 spells 等结构字段；频次字段的值是法术标签字符串数组。不要把 spellcasting 塞进普通 entries 对象。`
	},
	item: {
		core: `## 物品基础结构
每件物品是一个对象。name 为简体中文名称；source 由页面按用户选择的来源写入，不要自行编造；entries 为非空数组，放置简体中文说明或规则描述。type 只能从以下物品类型代码中选择：$（宝藏）、$A（艺术品）、$C（钱币）、$G（宝石）、A（弹药）、AF（现代弹药）、AIR（飞行载具）、AT（工匠工具）、EXP（爆炸物）、FD（食物饮品）、G（冒险用品）、GS（游戏套装）、GV（通用变体）、HA（重甲）、IDG（非法药物）、INS（乐器）、LA（轻甲）、M（近战武器）、MA（中甲）、MNT（坐骑）、OTH（其他）、P（药水）、R（远程武器）、RD（权杖）、RG（戒指）、S（盾牌）、SC（卷轴）、SCF（施法焦点）、SPC（太空载具）、SHP（水上载具）、T（工具）、TAH（马具）、TB（贸易金属条）、TG（贸易商品）、VEH（陆地载具）、WD（魔杖）；不得输出清单外代码或自由文本分类。wondrous 为布尔值。rarity 只能是 none、common、uncommon、rare、very rare、legendary、artifact、varies、unknown (magic)、unknown。reqAttune 可省略、不需要时为 false，需要时为 true 或简体中文条件描述；此字段是布尔值或条件文本，不是枚举。仅输出与该物品相关的字段。entries 中可使用 {@damage ...}、{@item ...} 等 5etools 标签。`,
		weapon: `## 武器字段
武器常用字段包括 weaponCategory（只能是 simple 或 martial）、dmg1（伤害骰式字符串）、dmgType（只能是 A 强酸、B 钝击、C 寒冷、F 火焰、O 力场、L 闪电、N 暗蚀、P 穿刺、I 毒素、Y 心灵、R 光耀、S 挥砍、T 雷鸣）、property（属性代码数组，只能使用 2H 双手、A 弹药、AF 现代弹药、BF 扫射、ER 延伸触及、F 灵巧、H 重型、L 轻型、LD 装填、OTH 其他、R 触及、RLD 弹容、S 特殊、T 投掷、V 多用、Vst 诀别遗物）、range（射程数字）及 type（只能是 M 或 R）。property 的代码大小写必须完全一致；不要创造新代码或把属性说明塞进字段名。`,
		armor: `## 护甲字段
护甲 type 只能是 LA（轻甲）、MA（中甲）或 HA（重甲）；盾牌使用 type "S"，不要把盾牌写成护甲类型。按需提供 ac（基础护甲等级数字）、strength（力量需求字符串）和 stealth（潜行劣势时为 true）。`,
		charges: `## 次数与充能
若物品有次数或充能，在 entries 中说明补充/消耗规则，并按需使用 charges（次数上限数字）、recharge（补充说明字符串）和 rechargeAmount（补充数量范围/说明）。避免只给数值却不说明如何消耗或恢复。`
	},
};

const _FEATURE_GUIDES = {
	monster: {
		trait: "traits",
		action: "traits",
		reaction: "traits",
		bonus: "traits",
		legendary: "traits",
		mythic: "traits",
		spellcasting: "spellcasting",
	},
	item: {
		weapon: "weapon",
		armor: "armor",
		charges: "charges",
	},
};

export function getFormatGuideForEntities (entities) {
	const byType = new Map();
	for (const entity of entities || []) {
		if (!Object.hasOwn(_GUIDES, entity?.type)) continue;
		if (!byType.has(entity.type)) byType.set(entity.type, new Set());
		if (entity.type === "monster") byType.get(entity.type).add("traits");
		for (const feature of entity.features || []) {
			const guideKey = _FEATURE_GUIDES[entity.type][feature];
			if (typeof guideKey === "string") byType.get(entity.type).add(guideKey);
		}
	}

	return [...byType].map(([type, guides]) => [
		_GUIDES[type].core,
		...[...guides].map(key => _GUIDES[type][key]),
	].join("\n\n")).join("\n\n---\n\n");
}
