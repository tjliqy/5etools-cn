import {GenUtil} from "./utils-generate.js";

const RNG = RollerUtil.randomise.bind(RollerUtil);

// usage: _testRng(() => GenUtil.getFromTable(PARENTS_TIEFLING, RNG(8)))
function _testRng (rollFn) {
	const counts = {};
	for (let i = 0; i < 10000; ++i) {
		const roll = rollFn();
		const it = roll.display || roll.result;
		if (!counts[it]) counts[it] = 1;
		else counts[it]++;
	}
	return counts;
}

function rollSuppAlignment () {
	return GenUtil.getFromTable(SUPP_ALIGNMENT, RNG(6) + RNG(6) + RNG(6));
}
function rollSuppDeath () {
	return GenUtil.getFromTable(SUPP_DEATH, RNG(12));
}
function rollSuppClass () {
	return GenUtil.getFromTable(SUPP_CLASS, RNG(100));
}
function rollSuppOccupation () {
	return GenUtil.getFromTable(SUPP_OCCUPATION, RNG(100));
}
function rollSuppRace () {
	return GenUtil.getFromTable(SUPP_RACE, RNG(100));
}
function rollSuppRelationship () {
	return GenUtil.getFromTable(SUPP_RELATIONSHIP, RNG(4) + RNG(4) + RNG(4));
}
function rollSuppStatus () {
	return GenUtil.getFromTable(SUPP_STATUS, RNG(6) + RNG(6) + RNG(6));
}

/**
 * @param [opts] Options object.
 * @param [opts.isParent] If this person is a parent.
 * @param [opts.race] Race for this person (parent only).
 * @param [opts.gender] Gender for this person (parent only).
 * @param [opts.isSibling] If this person is a sibling.
 * @param opts.gender The gender of this person.
 * @param opts.parentRaces List of parent races for this person.
 * @param opts.isAdventurer Is the person is an adventurer (and therefore has a class as opposed to an occupation).
 */
async function getPersonDetails (opts) {
	opts = opts || {};

	async function pAddName (race, gender) {
		const raceSlug = Parser.stringToSlug(race);
		if (nameTables[raceSlug]) {
			const availNameTables = nameTables[raceSlug];

			const maleFirstTables = [];
			const femaleFirstTables = [];
			const surnameTables = [];

			availNameTables.tables.forEach(tbl => {
				// const nameParts = tbl.option.replace(/,/g, " ").toLowerCase().split(/\s+/);
				// if (nameParts.includes("男性")) maleFirstTables.push(tbl);
				// else if (nameParts.includes("女性")) femaleFirstTables.push(tbl);
				// else if (!nameParts.includes("儿童")) surnameTables.push(tbl);
				const nameParts = tbl.option;
				if (nameParts.indexOf("男性") !== -1) maleFirstTables.push(tbl);
				else if (nameParts.indexOf("女性") !== -1) femaleFirstTables.push(tbl);
				else if (nameParts.indexOf("儿童") === -1) surnameTables.push(tbl);
			});

			const chooseFrom = gender === "Other"
				? maleFirstTables.concat(femaleFirstTables)
				: gender === "Male" ? maleFirstTables : femaleFirstTables;
			const nameTableMeta = rollOnArray(chooseFrom);
			const resultFirst = GenUtil.getFromTable(
				nameTableMeta.table,
				await Renderer.dice.parseRandomise2(nameTableMeta.diceExpression),
			);
			const resultLast = await (async () => {
				if (surnameTables.length) {
					const nameTableMeta = rollOnArray(chooseFrom);
					return GenUtil.getFromTable(
						nameTableMeta.table,
						await Renderer.dice.parseRandomise2(nameTableMeta.diceExpression),
					);
				} else return null;
			})();

			if (opts.isParent && !ptrParentLastName._) ptrParentLastName._ = resultLast ? resultLast.result : null;
			const lastName = (() => {
				if (ptrParentLastName._) {
					if (opts.isParent) return ptrParentLastName._;
					else if (opts.isSibling) {
						// 20% chance of sibling not having the same last name
						if (RNG(5) !== 5) return ptrParentLastName._;
					}
				}
				return resultLast ? resultLast.result : "";
			})();

			out.unshift(`<i><b title="使用《珊娜萨的万事指南》中的随机名字表生成">名字:</b> ${resultFirst.result}${lastName ? ` ${lastName}` : ""}</i>`);
		}
	}

	const status = rollSuppStatus();
	const align = rollSuppAlignment().result;
	const occ = rollSuppOccupation().result;
	const cls = rollSuppClass().result;
	const relate = rollSuppRelationship().result;
	const out = [
		`<b>阵营:</b> ${align}`,
		opts.isAdventurer ? `<b>职业:</b> ${cls}` : `<b>工作:</b> ${occ}`,
		`<b>关系:</b> ${relate}`,
	];
	if (!opts.isParent) {
		out.push(`<b>状态:</b> ${status.result}`);
	}

	if (!opts.isParent) {
		const race = opts.parentRaces ? (() => {
			const useParent = RNG(100) > 15;
			if (useParent) return rollOnArray(opts.parentRaces);
			else return rollSuppRace().result;
		})() : rollSuppRace().result;

		out.unshift(`<i><b>种族：</b> ${{Orc: "兽人", Devil: "魔鬼"}[race] || race}</i>`);
		const gender = opts.gender ? opts.gender : rollUnofficialGender().result;
		const genderDisplay = {Male: "男性", Female: "女性", Other: "其他"}[gender] || gender;
		out.unshift(`<i><b>性别：</b> ${genderDisplay}</i>`);

		await pAddName(race, gender);
	} else if (opts.race) {
		await pAddName(opts.race, opts.gender || "Other");
	}
	return out;
}

function rollEvtAdventure () {
	return GenUtil.getFromTable(LIFE_EVENTS_ADVENTURES, RNG(100));
}
function rollEvtArcaneMatter () {
	return GenUtil.getFromTable(LIFE_EVENTS_ARCANE_MATTERS, RNG(10));
}
function rollEvtBoon () {
	return GenUtil.getFromTable(LIFE_EVENTS_BOONS, RNG(10));
}
function rollEvtCrime () {
	return GenUtil.getFromTable(LIFE_EVENTS_CRIME, RNG(8));
}
function rollEvtPunishment () {
	return GenUtil.getFromTable(LIFE_EVENTS_PUNISHMENT, RNG(12));
}
function rollEvtSupernatural () {
	return GenUtil.getFromTable(LIFE_EVENTS_SUPERNATURAL, RNG(100));
}
function rollEvtTragedy () {
	return GenUtil.getFromTable(LIFE_EVENTS_TRAGEDIES, RNG(12));
}
function rollEvtWar () {
	return GenUtil.getFromTable(LIFE_EVENTS_WAR, RNG(12));
}
function rollEvtWeird () {
	return GenUtil.getFromTable(LIFE_EVENTS_WEIRD_STUFF, RNG(12));
}

function rollUnofficialGender () {
	const GENDERS = [
		{min: 1, max: 49, result: "Male"},
		{min: 50, max: 98, result: "Female"},
		{min: 98, max: 100, result: "Other"},
	];
	return GenUtil.getFromTable(GENDERS, RNG(100));
}

function choose (...lst) {
	return fmtChoice(rollOnArray(lst));
}

function chooseRender (...lst) {
	return fmtChoice(rollOnArray(lst), true);
}

function fmtChoice (str, render) {
	const raw = `({@i ${str}})`;
	return render ? Renderer.get().render(raw) : raw;
}

function rollOnArray (lst) {
	return lst[RNG(lst.length) - 1];
}

const RACES_SELECTABLE = ["矮人", "精灵", "半精灵", "半兽人", "提夫林"];
const RACES_UNSELECTABLE = ["人类", "矮人", "龙裔", "侏儒"];

const PARENTS_HALF_ELF = [
	{min: 1, max: 5, result: () => { const p = RNG(2); return `父母中的一位${fmtChoice(p === 1 ? "母亲" : "父亲")}是精灵， 另一位${fmtChoice(p === 1 ? "父亲" : "母亲")}是人类。`; }, display: "父母中的一位是精灵， 另一位是人类。", _races: ["精灵", "人类"]},
	{min: 6, result: () => { const p = RNG(2); return `父母中的一位${fmtChoice(p === 1 ? "母亲" : "父亲")}是精灵， 另一位${fmtChoice(p === 1 ? "父亲" : "母亲")}是半精灵。`; }, display: "父母中的一位是精灵， 另一位是半精灵。", _races: ["精灵", "半精灵"]},
	{min: 7, result: () => { const p = RNG(2); return `父母中的一位${fmtChoice(p === 1 ? "母亲" : "父亲")}是人类， 另一位${fmtChoice(p === 1 ? "父亲" : "母亲")}是半精灵。`; }, display: "父母中的一位是人类， 另一位是半精灵。", _races: ["半精灵", "人类"]},
	{min: 8, result: "父母都是半精灵。", _races: ["半精灵", "半精灵"]},
];

const PARENTS_HALF_ORC = [
	{min: 1, max: 3, result: () => { const p = RNG(2); return `父母中的一位${fmtChoice(p === 1 ? "母亲" : "父亲")}是兽人， 另一位${fmtChoice(p === 1 ? "父亲" : "母亲")}是人类。`; }, display: "父母中的一位是兽人， 另一位是人类。", _races: ["Orc", "人类"]},
	{min: 4, max: 5, result: () => { const p = RNG(2); return `父母中的一位${fmtChoice(p === 1 ? "母亲" : "父亲")}是兽人， 另一位${fmtChoice(p === 1 ? "父亲" : "母亲")}是半兽人`; }, display: "父母中的一位是兽人， 另一位是半兽人", _races: ["Orc", "半兽人"]},
	{min: 6, max: 7, result: () => { const p = RNG(2); return `父母中的一位${fmtChoice(p === 1 ? "母亲" : "父亲")}是人类， 另一位${fmtChoice(p === 1 ? "父亲" : "母亲")}是半兽人`; }, display: "父母中的一位是人类， 另一位是半兽人", _races: ["人类", "半兽人"]},
	{min: 8, display: "父母都是半兽人。", _races: ["半兽人", "半兽人"]},
];

const PARENTS_TIEFLING = [
	{min: 1, max: 4, display: "父母都是人类，他们的地狱遗产在你出生之前一直处于休眠状态。", _races: ["人类", "人类"]},
	{min: 5, max: 6, result: () => { const p = RNG(2); return `父母中的一位${fmtChoice(p === 1 ? "母亲" : "父亲")}是提夫林， 另一位${fmtChoice(p === 1 ? "父亲" : "母亲")}是人类。`; }, display: "父母中的一位是提夫林， 另一位是人类。", _races: ["人类", "提夫林"]},
	{min: 7, result: () => { const p = RNG(2); return `父母中的一位${fmtChoice(p === 1 ? "母亲" : "父亲")}是提夫林， 另一位${fmtChoice(p === 1 ? "父亲" : "母亲")}是恶魔。`; }, display: "父母中的一位是提夫林， 另一位是恶魔。", _races: ["Devil", "提夫林"]},
	{min: 8, result: () => { const p = RNG(2); return `父母中的一位${fmtChoice(p === 1 ? "母亲" : "父亲")}是人类， 另一位${fmtChoice(p === 1 ? "父亲" : "母亲")}是恶魔。`; }, display: "父母中的一位是人类， 另一位是恶魔。", _races: ["人类", "Devil"]},
];

const BIRTHPLACES = [
	{min: 1, max: 50, result: "家"},
	{min: 51, max: 55, result: "朋友家"},
	{min: 56, max: 63, result: () => `医生或助产士的家${choose("医生", "助产士")}`, display: "医生或助产士的家"},
	{min: 64, max: 65, result: () => `马车、手推车或货车${choose("马车", "手推车", "货车")}`, display: "马车、手推车或货车"},
	{min: 66, max: 68, result: () => `谷仓、棚屋或室外建筑${choose("谷仓", "棚屋", "室外建筑")}`, display: "谷仓、棚屋或其他附属建筑"},
	{min: 69, max: 70, result: "洞穴"},
	{min: 71, max: 72, result: "田野"},
	{min: 73, max: 74, result: "森林"},
	{min: 75, max: 77, result: "寺庙"},
	{min: 78, result: "战场"},
	{min: 79, max: 80, result: () => `小巷或街道${choose("小巷", "街道")}`, display: "小巷或街道"},
	{min: 81, max: 82, result: () => `妓院、酒馆或客栈${choose("妓院", "酒馆", "客栈")}`, display: "妓院、酒馆或客栈"},
	{min: 83, max: 84, result: () => `城堡、要塞、塔楼或宫殿${choose("城堡", "要塞", "塔楼", "宫殿")}`, display: "城堡、要塞、塔楼或宫殿"},
	{min: 85, result: () => `下水道或垃圾堆${choose("下水道", "垃圾堆")}`, display: "下水道或垃圾堆"},
	{min: 86, max: 88, result: "在不同种族的人中"},
	{min: 89, max: 91, result: () => `在船上${choose("帆船", "轮船")}`, display: "在小船或大船上"},
	{min: 92, max: 93, result: () => `在监狱或秘密组织的总部${choose("监狱", "秘密组织的总部")}`, display: "在监狱或秘密组织的总部"},
	{min: 94, max: 95, result: "在智者的实验室里"},
	{min: 96, result: "在妖精荒野"},
	{min: 97, result: "在堕影冥界"},
	{min: 98, result: () => `在星界位面或以太位面${choose("星界位面", "以太位面")}`, display: "在星界位面或以太位面"},
	{min: 99, result: "在你选择的内层位面"},
	{min: 100, result: "在你选择的外层位面"},
];

function absentParent (parent) {
	return GenUtil.getFromTable(ABSENT_PARENT, RNG(4)).result.replace("parent", `$& ${fmtChoice(parent)}</i>`);
}

function absentBothParents () {
	const p = ["母亲", "父亲"][RNG(2) - 1];
	return `${absentParent(p)} ${absentParent(otherParent(p))}`;
}

function otherParent (parent) {
	return parent === "母亲" ? "父亲" : "母亲";
}

function singleParentOrStep (parent) {
	const p = RNG(2);
	return `单亲${parent}或继${parent[0]} ${fmtChoice(p === 1 ? parent : `继${parent[0]}`)}. ${p === 1 ? `${absentParent(otherParent(parent))}` : absentBothParents()}`;
}

const FAMILY = [
	{min: 1, result: () => `无。 ${absentBothParents()}`, display: "无"},
	{min: 2, result: () => `福利机构，如庇护所。 ${absentBothParents()}`, display: "福利机构，例如收容所"},
	{min: 3, result: () => `寺庙。 ${absentBothParents()}`, display: "神殿"},
	{min: 4, max: 5, result: () => `孤儿院。 ${absentBothParents()}`, display: "孤儿院"},
	{min: 6, max: 7, result: () => `监护人。 ${absentBothParents()}`, display: "监护人"},
	{min: 8, max: 15, result: () => `父亲或母亲的姑姑、叔叔，或者两者都有；或者是大家族，如部落或氏族 ${choose("叔叔", "姑姑", "叔叔和姑姑", "大家族，如部落或氏族")}. ${absentBothParents()}`, display: "叔伯、姑姨或双方的大家族，例如部落或氏族"},
	{min: 16, max: 25, result: () => `祖父母或外祖父母 ${choose("祖父", "祖母", "祖父和祖母")}. ${absentBothParents()}`, display: "祖父母或外祖父母"},
	{min: 26, max: 35, result: () => `寄养家庭（相同或不同种族） ${choose("相同种族", "不同种族")}. ${absentBothParents()}`, display: "寄养家庭（同族或异族）"},
	{min: 36, max: 55, result: () => singleParentOrStep("父亲"), display: "单身父亲或继父"},
	{min: 56, max: 75, result: () => singleParentOrStep("母亲"), display: "单身母亲或继母"},
	{min: 76, max: 100, result: "父亲和母亲"},
];

const ABSENT_PARENT = [
	{min: 1, result: () => `你的父母死了 (${rollSuppDeath().result.lowercaseFirst()}).`, display: "你的父母去世了（在{@table Supplemental Tables; Cause of Death|XGE|死因}补充表上掷骰）。"},
	{min: 2, result: () => `你的父母被监禁、奴役或以其他方式被带走 ${choose("监禁", "奴役", "以其他方式被带走")}.`, display: "你的父母被监禁、奴役或以其他方式带走。"},
	{min: 3, result: "你的父母抛弃了你。"},
	{min: 4, result: "你的父母失踪了，命运未知。"},
];

const FAMILY_LIFESTYLE = [
	{min: 3, result: "悲惨 (-40)", "modifier": -40},
	{min: 4, max: 5, result: "肮脏 (-20)", "modifier": -20},
	{min: 6, max: 8, result: "贫穷 (-10)", "modifier": -10},
	{min: 9, max: 12, result: "谦虚 (+0)", "modifier": 0},
	{min: 13, max: 15, result: "舒适 (+10)", "modifier": 10},
	{min: 16, max: 17, result: "富有 (+20)", "modifier": 20},
	{min: 18, result: "贵族 (+40)", "modifier": 40},
];

const CHILDHOOD_HOME = [
	{min: 0, result: "在街上"},
	{min: 1, max: 20, result: "破旧的棚屋"},
	{min: 21, max: 30, result: "无永久居留权；你经常搬家"},
	{min: 31, max: 40, result: () => `在野外的营地或村庄${choose("营地", "村庄")}`, display: "荒野中的营地或村庄"},
	{min: 41, max: 50, result: "位于破旧街区的公寓"},
	{min: 51, max: 70, result: "小房子"},
	{min: 71, max: 90, result: "大房子"},
	{min: 91, max: 110, result: "高级公寓"},
	{min: 111, result: () => `宫殿或城堡${choose("宫殿", "城堡")}`, display: "宫殿或城堡"},
];

const CHILDHOOD_MEMORIES = [
	{min: 3, result: "我仍未走出童年时的阴影，那时我受到了同龄人的霸凌。"},
	{min: 4, max: 5, result: "我的童年大部分时间都是独自度过的，没有朋友。"},
	{min: 6, max: 8, result: "其他人认为我与众不同或行为怪异，所以我几乎没有朋友。"},
	{min: 9, max: 12, result: "我有几个朋友，过着平凡的童年。"},
	{min: 13, max: 15, result: "我有几个朋友，我的童年大部分时间都很快乐。"},
	{min: 16, max: 17, result: "我总是发现交朋友很容易，我喜欢和人在一起。"},
	{min: 18, result: "每个人都知道我是谁，我所到之处都有朋友。"},
];

const LIFE_EVENTS_AGE = [
	{min: 1, max: 20, age: () => RNG(20), result: "20岁或更小", events: 1},
	{min: 21, max: 59, age: () => RNG(10) + 20, result: "21\u201430岁", events: () => RNG(4)},
	{min: 60, max: 69, age: () => RNG(10) + 30, result: "31\u201440岁", events: () => RNG(6)},
	{min: 70, max: 89, age: () => RNG(10) + 40, result: "41\u201450岁", events: () => RNG(8)},
	{min: 90, max: 99, age: () => RNG(10) + 50, result: "51\u201460岁", events: () => RNG(10)},
	{min: 100, age: () => RNG(690) + 60, result: "61岁或更老", events: () => RNG(12)}, // max age = 750; max elven age
];

async function _pLifeEvtResult (title, rollResult) {
	return {
		result: `${title}: ${rollResult.result}`,
		pNextRoll: rollResult.pNextRoll,
	};
}

function _lifeEvtResultArr (title, titles, ...rollResults) {
	return {
		title: title,
		result: titles.map((it, i) => `${it}: ${rollResults[i].result}`),
	};
}

let marriageIndex = 0;
function _lifeEvtPerson (title, personDetails) {
	return {
		title: title,
		result: personDetails,
	};
}

const LIFE_EVENTS = [
	{min: 1, max: 10, result: "你遭遇了一场悲剧。请在“悲剧”表上掷骰。", pNextRoll: () => _pLifeEvtResult("悲剧", rollEvtTragedy())},
	{min: 11, max: 20, result: "你获得了一点好运。请在“恩惠”表上掷骰。", pNextRoll: () => _pLifeEvtResult("恩惠", rollEvtBoon())},
	{min: 21, max: 30, result: "你坠入爱河或结了婚。如果多次掷出此结果，可以改为拥有一个孩子。与你的 DM 一起确定爱人的身份。", pNextRoll: async () => _lifeEvtPerson(marriageIndex++ === 0 ? "配偶" : "配偶／孩子", await getPersonDetails())},
	{min: 31, max: 40, result: () => `你与一名冒险者结仇。掷 {@dice d6} ${fmtChoice(RNG(6))}：奇数表示裂痕由你造成，偶数表示你没有过错。使用补充表并与你的 DM 一起确定仇敌的身份及其对你的威胁。`, display: "你与一名冒险者结仇。掷 {@dice d6}：奇数表示裂痕由你造成，偶数表示你没有过错。使用补充表并与你的 DM 一起确定仇敌的身份及其对你的威胁。", pNextRoll: async () => _lifeEvtPerson("仇敌", await getPersonDetails({isAdventurer: true}))},
	{min: 41, max: 50, result: "你与一名冒险者成为朋友。使用补充表并与你的 DM 一起补充其背景，确定友谊从何开始。", pNextRoll: async () => _lifeEvtPerson("朋友", await getPersonDetails({isAdventurer: true}))},
	{min: 51, max: 70, result: () => `你曾从事与背景相关的工作。开始游戏时额外获得 {@dice 2d6} ${fmtChoice(RNG(6) + RNG(6))} 金币。`, display: "你曾从事与背景相关的工作。开始游戏时额外获得 {@dice 2d6} 金币。"},
	{min: 71, max: 75, result: "你遇到了一位重要人物。使用补充表确定其身份和对你的态度，并视需要与你的 DM 一起将其融入背景故事。", pNextRoll: async () => _lifeEvtPerson("重要人物", await getPersonDetails())},
	{min: 76, max: 80, result: "你踏上了一次冒险。请在“冒险”表上掷骰，看看发生了什么；与你的 DM 一起确定冒险的性质和遭遇的生物。", pNextRoll: () => _pLifeEvtResult("冒险", rollEvtAdventure())},
	{min: 81, max: 85, result: "你经历了一次超自然事件。请在“超自然事件”表上掷骰，确定具体经历。", pNextRoll: () => _pLifeEvtResult("超自然事件", rollEvtSupernatural())},
	{min: 86, max: 90, result: "你参加过一场战斗。请在“战争”表上掷骰，了解发生了什么。与你的 DM 一起确定战斗的起因和参战势力；这可能是你所在社区与兽人小队的小规模冲突，也可能是一场大战中的重要战役。", pNextRoll: () => _pLifeEvtResult("战争", rollEvtWar())},
	{min: 91, max: 95, result: "你犯下罪行，或受到错误指控。请在“罪行”表上确定指控内容，再在“惩罚”表上确定结局。", pNextRoll: () => _lifeEvtResultArr("罪行与惩罚", ["罪行", "惩罚"], rollEvtCrime(), rollEvtPunishment())},
	{min: 96, max: 99, result: "你遇到了一件魔法事件。请在“奥术事件”表上掷骰。", pNextRoll: () => _pLifeEvtResult("奥术事件", rollEvtArcaneMatter())},
	{min: 100, result: "你遇到了一件真正离奇的事。请在“怪事”表上掷骰。", pNextRoll: () => _pLifeEvtResult("怪事", rollEvtWeird())},
];

const LIFE_EVENTS_ADVENTURES = [
	{min: 1, max: 10, result: () => `你险些丧命，身上留下可怕的伤疤，还失去了一只耳朵、{@dice 1d3} ${fmtChoice(RNG(3))} 根手指，或 {@dice 1d4} ${fmtChoice(RNG(4))} 根脚趾。`, display: "你险些丧命，身上留下可怕的伤疤，还失去了一只耳朵、{@dice 1d3} 根手指，或 {@dice 1d4} 根脚趾。"},
	{min: 11, max: 20, result: "你受了重伤。伤口虽然愈合，却仍不时隐隐作痛。"},
	{min: 21, max: 30, result: "你受了伤，但最终完全康复。"},
	{min: 31, max: 40, result: "你在探索肮脏的巢穴时染上疾病。虽然痊愈，却留下持续咳嗽、皮肤麻点或头发早白等后遗症。"},
	{min: 41, max: 50, result: "你曾被陷阱或怪物下毒。你已康复，但下一次对抗毒素的豁免检定具有劣势。"},
	{min: 51, max: 60, result: "你在冒险中失去了一件有纪念意义的物品。从随身物品中移除一件饰品。"},
	{min: 61, max: 70, result: "你被遭遇的事物吓坏了，丢下同伴逃跑，让他们独自面对命运。"},
	{min: 71, max: 80, result: "你在冒险中获益良多。下一次进行属性检定或豁免检定时，你的掷骰具有优势。"},
	{min: 81, max: 90, result: () => `你在冒险中发现了一些宝藏。分得的财宝中还剩 {@dice 2d6} ${fmtChoice(RNG(6) + RNG(6))} 金币。`, display: "你在冒险中发现了一些宝藏。分得的财宝中还剩 {@dice 2d6} 金币。"},
	{min: 91, max: 99, result: () => `你在冒险中发现了大量宝藏。分得的财宝中还剩 {@dice 1d20 + 50} ${fmtChoice(RNG(20) + 50)} 金币。`, display: "你在冒险中发现了大量宝藏。分得的财宝中还剩 {@dice 1d20 + 50} 金币。"},
	{min: 100, result: "你找到了一件普通魔法物品（由 DM 选择）。"},
];

const LIFE_EVENTS_ARCANE_MATTERS = [
	{min: 1, result: "你受到法术魅惑或恐慌。"},
	{min: 2, result: "你受到法术效果伤害。"},
	{min: 3, result: "你亲眼见证了一位牧师、德鲁伊、术士、邪术师或法师施展强大法术。"},
	{min: 4, result: "你喝下了一瓶药水（由 DM 选择）。"},
	{min: 5, result: "你找到了一张法术卷轴（由 DM 选择），并成功施展了其中的法术。"},
	{min: 6, result: "你受到了传送魔法的影响。"},
	{min: 7, result: "你曾隐形一段时间。"},
	{min: 8, result: "你识破了一处幻术。"},
	{min: 9, result: "你看见一个生物被魔法召唤出来。"},
	{min: 10, result: () => `一位预言者为你占卜了命运。在“人生事件”表上掷骰两次，但不立即应用结果。由 DM 从中选出一项作为你未来的预兆；它可能成真，也可能不会。 ${fmtChoice(GenUtil.getFromTable(LIFE_EVENTS, RNG(100)).display || GenUtil.getFromTable(LIFE_EVENTS, RNG(100)).result)} ${fmtChoice(GenUtil.getFromTable(LIFE_EVENTS, RNG(100)).display || GenUtil.getFromTable(LIFE_EVENTS, RNG(100)).result)}`, display: "一位预言者为你占卜了命运。在“人生事件”表上掷骰两次，但不立即应用结果。由 DM 从中选出一项作为你未来的预兆；它可能成真，也可能不会。"},
];

const LIFE_EVENTS_BOONS = [
	{min: 1, result: "一位友善的法师送给你一张记载着一种戏法的法术卷轴（由 DM 选择）。"},
	{min: 2, result: "你救了一位平民的命，对方因此欠你人情。这位平民陪你旅行并处理琐事，但若遭到忽视、虐待或置于险境，就会离开。使用补充表并与你的 DM 一起确定此人的详情。", pNextRoll: async () => _lifeEvtPerson("平民", await getPersonDetails())},
	{min: 3, result: "你找到了一匹{@item riding horse|PHB|骑乘马}。"},
	{min: 4, result: () => `你找到了一些钱。除正常的起始资金外，你还获得 {@dice 1d20} ${fmtChoice(RNG(20))} 金币。`, display: "你找到了一些钱。除正常的起始资金外，你还获得 {@dice 1d20} 金币。"},
	{min: 5, result: "一位亲属留给你一件由你选择的简易武器。"},
	{min: 6, result: () => `你找到了一件有趣的东西。额外获得一件饰品 ${fmtChoice(rollTrinket())}。`, display: "你找到了一件有趣的东西。额外获得一件饰品。"},
	{min: 7, result: "你曾为当地神殿效劳。下次到访时，可以获得治疗，最多恢复至生命值上限。"},
	{min: 8, result: "一位友善的炼金术师送你一瓶治疗药水或一瓶强酸，由你选择。"},
	{min: 9, result: "你找到了一张藏宝图。"},
	{min: 10, result: () => `一位远亲留给你一笔津贴，足以让你以舒适的生活方式生活 {@dice 1d20} ${fmtChoice(RNG(20))} 年。在此期间，如果选择更高档的生活方式，其费用减少 2 金币。`, display: "一位远亲留给你一笔津贴，足以让你以舒适的生活方式生活 {@dice 1d20} 年。在此期间，如果选择更高档的生活方式，其费用减少 2 金币。"},
];

const LIFE_EVENTS_CRIME = [
	{min: 1, result: "谋杀"},
	{min: 2, result: "盗窃"},
	{min: 3, result: "入室盗窃"},
	{min: 4, result: "袭击"},
	{min: 5, result: "走私"},
	{min: 6, result: "绑架"},
	{min: 7, result: "勒索"},
	{min: 8, result: "伪造货币"},
];

const LIFE_EVENTS_PUNISHMENT = [
	{min: 1, max: 3, result: "你没有犯罪，在受到指控后获判无罪。"},
	{min: 4, max: 6, result: "你犯下罪行或参与其中，但当局仍判你无罪。"},
	{min: 7, max: 8, result: "你差点被当场抓获，被迫逃离，并在案发地遭到通缉。"},
	{min: 9, max: 12, result: () => `你被捕并定罪，在监狱、划桨船或苦役场度过了一段时光。你服刑 {@dice 1d4} ${fmtChoice(RNG(4))} 年，或在同样长的时间后成功逃脱。`, display: "你被捕并定罪，在监狱、划桨船或苦役场度过了一段时光。你服刑 {@dice 1d4} 年，或在同样长的时间后成功逃脱。"},
];

const LIFE_EVENTS_SUPERNATURAL = [
	{min: 1, max: 5, result: () => `你被一名妖精施法奴役了 {@dice 1d6} ${fmtChoice(RNG(6))} 年，之后才逃脱。`, display: "你被一名妖精施法奴役了 {@dice 1d6} 年，之后才逃脱。"},
	{min: 6, max: 10, result: "你看见一只恶魔，在它伤害你之前逃走了。"},
	{min: 11, max: 15, result: () => `一只魔鬼诱惑了你。进行一次 DC 10 的感知豁免检定。若失败，你的阵营向邪恶偏移一级（若尚非邪恶），并在开始游戏时额外获得 {@dice 1d20 + 50} ${fmtChoice(RNG(20) + 50)} 金币。`, display: "一只魔鬼诱惑了你。进行一次 DC 10 的感知豁免检定。若失败，你的阵营向邪恶偏移一级（若尚非邪恶），并在开始游戏时额外获得 {@dice 1d20 + 50} 金币。"},
	{min: 16, max: 20, result: "一天早晨，你在离家数英里的地方醒来，完全不知道自己是怎么到那里的。"},
	{min: 21, max: 30, result: "你到访了一处圣地，在那里感受到了神圣的存在。"},
	{min: 31, max: 40, result: "你看见一颗坠落的红星、霜花中浮现的人脸，或其他离奇现象。你确信那是某种预兆。"},
	{min: 41, max: 50, result: "你逃过了必死的命运，相信是神明的干预救了你。"},
	{min: 51, max: 60, result: "你见证了一场小小的奇迹。"},
	{min: 61, max: 70, result: "你探索了一栋空屋，发现里面闹鬼。"},
	{min: 71, max: 75, result: () => { const p = RNG(6); return `你曾短暂地被附身。掷 {@dice d6} 确定附身生物的类型：1，天界生物；2，魔鬼；3，恶魔；4，妖精；5，元素生物；6，不死生物 ${fmtChoice(`${p}; ${["天界生物", "魔鬼", "恶魔", "妖精", "元素生物", "不死生物"][p - 1]}`)}.`; }, display: "你曾短暂地被附身。掷 {@dice d6} 确定附身生物的类型：1，天界生物；2，魔鬼；3，恶魔；4，妖精；5，元素生物；6，不死生物。"},
	{min: 76, max: 80, result: "你看见了一个幽灵。"},
	{min: 81, max: 85, result: "你看见一只食尸鬼啃食尸体。"},
	{min: 86, max: 90, result: "一位天界生物或邪魔在梦中造访，警告你即将到来的危险。"},
	{min: 91, max: 95, result: () => `你曾短暂造访妖精荒野或堕影冥界 ${choose("妖精荒野", "堕影冥界")}。`, "results": "你曾短暂造访妖精荒野或堕影冥界。"},
	{min: 96, max: 100, result: "你看见一道传送门，相信它通往另一个位面。"},
];

const LIFE_EVENTS_TRAGEDIES = [
	{min: 1, max: 2, result: () => `一位家人或密友去世。请在{@table Supplemental Tables; Cause of Death|XGE|死因}补充表上掷骰，确定死因。`, display: "一位家人或密友去世。请在“死因”补充表上掷骰，确定死因。", pNextRoll: () => _pLifeEvtResult("死因", rollSuppDeath())},
	{min: 3, result: "一段友谊以痛苦告终，对方如今与你敌对。原因可能是一场误会，也可能是你或昔日好友做过的事。"},
	{min: 4, result: "你在一场灾难中失去了所有财物，不得不重新开始生活。"},
	{min: 5, result: () => `你因莫须有的罪名入狱，在苦役场、监狱或奴隶桨船上度过了 {@dice 1d6} ${fmtChoice(RNG(6))} 年。`, display: "你因莫须有的罪名入狱，在苦役场、监狱或奴隶桨船上度过了 {@dice 1d6} 年。"},
	{min: 6, result: "战争摧毁了你的家乡，一切化为废墟。此后，你要么帮助重建家园，要么迁往别处。"},
	{min: 7, result: "你的爱人消失得无影无踪。此后你一直在寻找对方。"},
	{min: 8, result: "家乡遭遇严重枯萎病，农作物歉收，许多人饿死。你失去了一位兄弟姐妹或其他家人。"},
	{min: 9, result: "你做了一件让家人深感羞耻的事：可能卷入丑闻、涉足黑暗魔法，或得罪了重要人物。家人对你至多保持冷淡，不过最终或许会原谅你。"},
	{min: 10, result: "你因不明原因被社区放逐。此后你可能在荒野中流浪了一阵，也可能很快找到了新的住处。"},
	{min: 11, result: () => `一段恋情结束了。掷 {@dice d6} ${fmtChoice(RNG(6))}：奇数表示分手时心存芥蒂，偶数表示和平分手。`, display: "一段恋情结束了。掷 {@dice d6}：奇数表示分手时心存芥蒂，偶数表示和平分手。"},
	{min: 12, result: () => `你现在或未来可能成为伴侣的人去世了。请在{@table Supplemental Tables; Cause of Death|XGE|死因}补充表上掷骰，确定死因。如果结果是谋杀，再掷 {@dice d12}；若掷出 1，你对此负有直接或间接责任。`, display: "你现在或未来可能成为伴侣的人去世了。请在{@table Supplemental Tables; Cause of Death|XGE|死因}补充表上掷骰，确定死因。如果结果是谋杀，再掷 {@dice d12}；若掷出 1，你对此负有直接或间接责任。", pNextRoll: () => _pLifeEvtResult("死因", (() => { const r = RNG(12); const p = GenUtil.getFromTable(SUPP_DEATH, r); return {result: `${p.result}${r === 2 && RNG(12) === 1 ? ` ${fmtChoice("你对此负有责任")}` : ""}`}; })())},
];

const LIFE_EVENTS_WAR = [
	{min: 1, result: "你被击昏，别人以为你已经死了。数小时后你醒来，却完全不记得那场战斗。"},
	{min: 2, max: 3, result: "你在战斗中身受重伤，至今仍留有可怕的伤疤。"},
	{min: 4, result: "你为了活命逃离战场，至今仍为自己的怯懦感到羞愧。"},
	{min: 5, max: 7, result: "你只受了轻伤，伤口全部愈合，没有留下疤痕。"},
	{min: 8, max: 9, result: "你从战斗中幸存，却常做噩梦，在梦中重历当时的经历。"},
	{min: 10, max: 11, result: "你毫发无伤地离开战场，但许多朋友受伤或丧生。"},
	{min: 12, result: "你在战斗中表现出色，被人们铭记为英雄。你可能因勇敢而获颁勋章。"},
];

const LIFE_EVENTS_WEIRD_STUFF = [
	{min: 1, result: () => `你被变成一只蟾蜍，并保持这个形态 {@dice 1d4} ${fmtChoice(RNG(4))} 周。`, display: "你被变成一只蟾蜍，并保持这个形态 {@dice 1d4} 周。"},
	{min: 2, result: "你被石化成雕像，过了一段时间才有人将你解救。"},
	{min: 3, result: () => `你被鬼婆、萨梯或其他生物奴役，在其控制下生活了 {@dice 1d6} ${fmtChoice(RNG(6))} 年。`, display: "你被鬼婆、萨梯或其他生物奴役，在其控制下生活了 {@dice 1d6} 年。"},
	{min: 4, result: () => `一条龙囚禁了你 {@dice 1d4} ${fmtChoice(RNG(4))} 个月，直到冒险者杀死了它。`, display: "一条龙囚禁了你 {@dice 1d4} 个月，直到冒险者杀死了它。"},
	{min: 5, result: "你被卓尔、寇涛鱼人或夸格斯等邪恶类人生物俘虏，在幽暗地域沦为奴隶，直到成功逃脱。"},
	{min: 6, result: "你曾受雇于一名强大的冒险者，直到最近才离开。使用补充表并与你的 DM 一起确定前雇主的基本情况。", pNextRoll: async () => _lifeEvtPerson("雇主", await getPersonDetails({isAdventurer: true}))},
	{min: 7, result: () => `你精神失常了 {@dice 1d6} ${fmtChoice(RNG(6))} 年，最近才恢复理智。你可能仍有抽搐或其他怪异举止。`, display: "你精神失常了 {@dice 1d6} 年，最近才恢复理智。你可能仍有抽搐或其他怪异举止。"},
	{min: 8, result: "你的爱人其实是一条银龙。"},
	{min: 9, result: "你曾被邪教俘虏，差点在祭坛上被献给他们侍奉的邪恶存在。你逃了出来，却担心他们会找到你。"},
	{min: 10, result: () => `你遇见过一位半神、大魔鬼、大妖精、恶魔领主或泰坦——${choose("半神", "大魔鬼", "大妖精", "恶魔领主", "泰坦")}，而且活着讲述了这段经历。`, display: "你遇见过一位半神、大魔鬼、大妖精、恶魔领主或泰坦，而且活着讲述了这段经历。"},
	{min: 11, result: "你被一条巨鱼吞下，在它的肚子里待了一个月才逃脱。"},
	{min: 12, result: () => `一位强大的存在赐予你一个愿望，你却把它浪费在一件无关紧要的小事上。`, display: "一位强大的存在赐予你一个愿望，你却把它浪费在一件无关紧要的小事上。"},
];

const SUPP_ALIGNMENT = [
	{min: 1, max: 3, result: () => rollOnArray(["混乱邪恶", "混乱中立"]), display: "混乱邪恶（50%）或混乱中立（50%）"},
	{min: 4, max: 5, result: "守序邪恶"},
	{min: 6, max: 8, result: "中立邪恶"},
	{min: 9, max: 12, result: "绝对中立"},
	{min: 13, max: 15, result: "中立善良"},
	{min: 16, max: 17, result: () => rollOnArray(["守序善良", "中立善良"]), display: "守序善良（50%）或中立善良（50%）"},
	{min: 18, result: () => rollOnArray(["混乱善良", "混乱中立"]), display: "混乱善良（50%）或混乱中立（50%）"},
];

const SUPP_DEATH = [
	{min: 1, result: "未知原因"},
	{min: 2, result: "被谋杀"},
	{min: 3, result: "死于战争"},
	{min: 4, result: "与阶级或职业有关的事故"},
	{min: 5, result: "与阶级或职业无关的事故"},
	{min: 6, max: 7, result: "自然死亡，例如疾病或衰老"},
	{min: 8, result: "自杀"},
	{min: 9, result: () => `因动物或自然灾害而死${choose("动物", "自然灾害")}`, display: "死于动物袭击或自然灾害"},
	{min: 10, result: () => "被怪物吞噬"},
	{min: 11, result: () => `因犯罪被处决或折磨致死${choose("犯罪被处决", "折磨致死")}`, display: "因犯罪被处决或遭折磨致死"},
	{min: 12, result: "奇异的事件，比如被陨石击中、被愤怒的神灵击倒，或者被孵化中的史拉蟾蛋杀死"},
];

const SUPP_CLASS = [
	{min: 1, max: 7, result: "野蛮人"},
	{min: 8, max: 14, result: "吟游诗人"},
	{min: 15, max: 29, result: "牧师"},
	{min: 30, max: 36, result: "德鲁伊"},
	{min: 37, max: 52, result: "战士"},
	{min: 53, max: 58, result: "武僧"},
	{min: 59, max: 64, result: "圣武士"},
	{min: 65, max: 70, result: "游侠"},
	{min: 71, max: 84, result: "游荡者"},
	{min: 85, max: 89, result: "术士"},
	{min: 90, max: 94, result: "邪术师"},
	{min: 95, max: 100, result: "法师"},
];

const SUPP_OCCUPATION = [
	{min: 1, max: 5, result: "科研人员"},
	{min: 6, max: 10, result: () => `冒险家(${rollSuppClass().result})`, display: "冒险者（在职业表上掷骰）"},
	{min: 11, result: "贵族"},
	{min: 12, max: 26, result: () => `工匠或公会成员 ${choose("工匠", "工会成员")}`, display: "工匠或公会成员"},
	{min: 27, max: 31, result: "罪犯"},
	{min: 32, max: 36, result: "艺人"},
	{min: 37, max: 38, result: () => `流浪者、隐士或难民${choose("流浪者", "隐士", "难民")}`, display: "流放者、隐士或难民"},
	{min: 39, max: 43, result: () => `探险家或漫游者${choose("探险家", "漫游者")}`, display: "探险家或漫游者"},
	{min: 44, max: 55, result: () => `农民或牧民${choose("农民", "牧民")}`, display: "农民或牧民"},
	{min: 56, max: 60, result: () => `猎人或捕猎者${choose("猎人", "捕猎者")}`, display: "猎人或捕猎者"},
	{min: 61, max: 75, result: "工人"},
	{min: 76, max: 80, result: "商人"},
	{min: 81, max: 85, result: () => `政治家或官僚${choose("政治家", "官僚")}`, display: "政治家或官僚"},
	{min: 86, max: 90, result: "牧师"},
	{min: 91, max: 95, result: "水手"},
	{min: 96, max: 100, result: "士兵"},
];

const SUPP_RACE = [
	{min: 1, max: 40, result: "人类"},
	{min: 41, max: 50, result: "矮人"},
	{min: 51, max: 60, result: "精灵"},
	{min: 61, max: 70, result: "矮人"},
	{min: 71, max: 75, result: "龙裔"},
	{min: 76, max: 80, result: "侏儒"},
	{min: 81, max: 85, result: "半精灵"},
	{min: 86, max: 90, result: "半兽人"},
	{min: 91, max: 95, result: "提夫林"},
	{min: 96, max: 100, result: "由 DM 选择"},
];

const SUPP_RELATIONSHIP = [
	{min: 3, max: 4, result: "敌对"},
	{min: 5, max: 10, result: "友好"},
	{min: 11, max: 12, result: "漠不关心"},
];

const SUPP_STATUS = [
	{min: 3, result: () => { return `已死亡（${rollSuppDeath().result}）`; }, display: "已死亡（在死因表上掷骰）", "dead": true},
	{min: 4, max: 5, result: () => `失踪或失联${choose("失踪", "失联")}`, display: "失踪或下落不明"},
	{min: 6, max: 8, result: () => `活着，但由于受伤、经济困难或关系问题而状况不佳${choose("受伤", "经济困难", "关系问题")}`, display: "活着，但因伤病、经济或关系问题而处境不佳"},
	{min: 9, max: 12, result: "活得很好"},
	{min: 13, max: 15, result: "活着并且非常成功"},
	{min: 16, max: 17, result: "声名狼藉的活着"},
	{min: 18, result: "名声显赫的活着"},
];

let classList;
let bgList;
let trinketList;
let nameTables;
let selCha;
let selRace;
let selBg;
let selClass;
let selAge;

function rollTrinket () {
	return rollOnArray(trinketList);
}

function onJsonLoad (lifeData, nameData) {
	bgList = lifeData.lifeBackground.sort((a, b) => SortUtil.ascSort(a.name, b.name));
	classList = lifeData.lifeClass.sort((a, b) => SortUtil.ascSort(a.name, b.name));
	trinketList = lifeData.lifeTrinket;

	selRace = veEs(`#race`).vee.empty().vee.attr("disabled", false);
	selCha = veEs(`#cha`).vee.empty().vee.attr("disabled", false);
	selBg = veEs(`#background`).vee.empty().vee.attr("disabled", false);
	selClass = veEs(`#class`).vee.empty().vee.attr("disabled", false);
	selAge = veEs(`#age`).vee.empty().vee.attr("disabled", false);

	selRace.vee.appends(`<option value="Random" selected>随机</option>`);
	selRace.vee.appends(`<option value="Other">其他</option>`);
	RACES_SELECTABLE.forEach(r => selRace.vee.appends(`<option value="${r}">${r}</option>`));
	RACES_UNSELECTABLE.forEach(r => selRace.vee.appends(`<option class="ve-italic" value="${r}">${r}</option>`));
	selCha.vee.appends(`<option value="Random">随机</option>`);
	for (let i = -5; i <= 5; ++i) {
		selCha.vee.appends(`<option value="${i}" ${i === 0 ? "selected" : ""}>${i >= 0 ? "+" : ""}${i}</option>`);
	}
	selBg.vee.appends(`<option value="-1" selected>随机</option>`);
	bgList.forEach((b, i) => selBg.vee.appends(`<option value="${i}">${b.name}</option>`));
	selClass.vee.appends(`<option value="-1" selected>随机</option>`);
	classList.forEach((c, i) => selClass.vee.appends(`<option value="${i}">${c.name}</option>`));

	[
		{val: "", text: "随机", style: "font-style: normal;"},
		{val: "1", text: "20岁或更小", class: "ve-italic"},
		{val: "21", text: "21&mdash;30岁", class: "ve-italic"},
		{val: "60", text: "31&mdash;40岁", class: "ve-italic"},
		{val: "70", text: "41&mdash;50岁", class: "ve-italic"},
		{val: "90", text: "51&mdash;60岁", class: "ve-italic"},
		{val: "100", text: "61岁或更老", class: "ve-italic"},
	].forEach(age => selAge.vee.appends(`<option value="${age.val}" ${age.style ? `style="${age.style}"` : ""} ${age.class ? `class="${age.class}"` : ""}>${age.text}</option>`));

	nameTables = {};
	nameData.name.filter(it => it.source === Parser.SRC_XGE)
		.forEach(nameMeta => {
			nameTables[Parser.stringToSlug(nameMeta.name)] = nameMeta;

			if (nameMeta.name === "精灵" || nameMeta.name === "人类") {
				const cpy = MiscUtil.copy(nameMeta);
				if (nameTables["halfelf"]) nameTables["halfelf"].tables.push(...cpy.tables);
				else nameTables["halfelf"] = cpy;
			} else if (nameMeta.name === "半兽人") {
				nameTables["orc"] = MiscUtil.copy(nameMeta);
			} else if (nameMeta.name === "提夫林") {
				const cpy = MiscUtil.copy(nameMeta);
				cpy.tables = cpy.tables.filter(it => it.option !== "Virtue");
				nameTables["devil"] = MiscUtil.copy(nameMeta);
			}
		});
}

function concatSentences (...lst) {
	const stack = [];
	lst.filter(it => it).forEach(it => {
		if (typeof it === "string" || typeof it === "number") {
			stack.push(it);
		} else if (typeof it === "function") {
			stack.push(it());
		} else { // array
			Array.prototype.push.apply(stack, ...it);
		}
	});
	return joinParaList(stack);
}

function joinParaList (lst) {
	if (lst.join) return lst.join(`<br>`);
	return lst;
}

const _VOWELS = ["a", "e", "i", "o", "u"];
function addN (name) {
	const c = name[0].toLowerCase();
	return _VOWELS.includes(c) ? "n" : "";
}

// SECTIONS ============================================================================================================
// generated in Parents, but used throughout
let knowParents;
let race;
let parentRaces;
let ptrParentLastName = {}; // store the last name so we can use it for both parents, maybe
// PARENTS
async function pSectParents () {
	knowParents = RNG(100) > 5;
	const valRace = selRace.vee.val();
	race = (() => {
		if (valRace === "Random") return GenUtil.getFromTable(SUPP_RACE, RNG(100)).result;
		else if (valRace === "Other") {
			// generate anything besides the values displayed in the dropdown
			let out;
			do out = GenUtil.getFromTable(SUPP_RACE, RNG(100)).result;
			while (RACES_SELECTABLE.includes(out));
			return out;
		} else return valRace;
	})();

	const parents = veEs(`#parents`);
	const knowParentsStr = knowParents ? "<b>父母:</b> 你知道你的父母是谁。" : "<b>父母:</b> 你不知道你的父母是谁。";

	let parentage = null;
	if (knowParents) {
		switch (race.toLowerCase()) {
			case "半精灵": {
				const rolled = GenUtil.getFromTable(PARENTS_HALF_ELF, RNG(8));
				parentage = `<b>${race} 父母:</b> ${rolled.result}`;
				parentRaces = rolled._races;
				break;
			}
			case "半兽人": {
				const rolled = GenUtil.getFromTable(PARENTS_HALF_ORC, RNG(8));
				parentage = `<b>${race} 父母:</b> ${rolled.result}`;
				parentRaces = rolled._races;
				break;
			}
			case "提夫林": {
				const rolled = GenUtil.getFromTable(PARENTS_TIEFLING, RNG(8));
				parentage = `<b>${race} 父母:</b> ${rolled.result}`;
				parentRaces = rolled._races;
				break;
			}
			default:
				parentRaces = [race];
				break;
		}
	}

	if (selRace === "Other") {
		parents.vee.html(concatSentences(`<b>种族:</b> 其他 ${fmtChoice(`${race}；使用{@table Supplemental Tables; Race|XGE|种族}补充表生成`, true)}`, knowParentsStr, parentage));
	} else {
		parents.vee.html(concatSentences(`<b>种族:</b> ${race}${selRace === "Random" ? ` ${fmtChoice("使用{@table Supplemental Tables; Race|XGE|种族}补充表生成", true)}` : ""}`, knowParentsStr, parentage));
	}

	if (knowParents) {
		parentRaces.shuffle();
		const mum = await getPersonDetails({
			isParent: true,
			race: parentRaces[0],
			gender: "Female",
		});
		if (RNG(2) === 1) delete ptrParentLastName._; // 50% chance not to share a last name
		const dad = await getPersonDetails({
			isParent: true,
			race: parentRaces.length > 1 ? parentRaces[1] : parentRaces[0],
			gender: "Male",
		});
		parents.vee.appends(veT`<h5>母亲</h5>`);
		parents.vee.appends(`<div>${joinParaList(mum)}</div>`);
		parents.vee.appends(veT`<h5>父亲</h5>`);
		parents.vee.appends(`<div>${joinParaList(dad)}</div>`);
	}
}

// BIRTHPLACE
function sectBirthplace () {
	const birthplace = veEs(`#birthplace`);
	const rollBirth = RNG(100);
	const birth = `<b>出生地:</b> ${GenUtil.getFromTable(BIRTHPLACES, rollBirth).result}`;

	const strangeBirth = RNG(100) === 100 ? "你出生时发生了一件怪事：月亮短暂变红，一英里内的牛奶全部变质，附近的水在盛夏结冰，家中所有铁器生锈或变成白银，或者发生了由你选择的其他异象" : "";
	birthplace.vee.html(concatSentences(birth, strangeBirth));
}

// SIBLINGS
async function pSectSiblings () {
	const siblings = veEs(`#siblings`);
	function getBirthOrder () {
		const rollBirthOrder = RNG(6) + RNG(6);
		if (rollBirthOrder < 3) {
			return "多胞胎 ";
		} else if (rollBirthOrder < 8) {
			return "年长的";
		} else {
			return "年幼的";
		}
	}

	const rollSibCount = RNG(5);
	let sibCount = 0;
	switch (rollSibCount) {
		case 2:
			sibCount = RNG(3);
			break;
		case 3:
			sibCount = RNG(4) + 1;
			break;
		case 4:
			sibCount = RNG(6) + 2;
			break;
		case 5:
			sibCount = RNG(8) + 3;
			break;
	}
	if (race === "精灵" || race === "矮人") {
		sibCount = Math.max(sibCount - 2, 0);
	}

	if (sibCount > 0) {
		siblings.vee.empty();
		siblings.vee.appends(`<p>你有${sibCount}个兄弟姐妹。</p>`);

		for (let i = 0; i < sibCount; ++i) {
			const dispTitle = veT`<h5 class="ve-my-0 ve-mr-2"></h5>`;
			const dispDetails = veT`<div></div>`;

			const pDoRollAndDisplay = async () => {
				const siblingType = rollOnArray(["兄弟", "姐妹"]);
				dispTitle.vee.html(`${getBirthOrder()}兄弟姐妹${fmtChoice(siblingType, true)}`);
				dispDetails.vee.html(joinParaList(await getPersonDetails({
					gender: siblingType === "兄弟" ? "Male" : "Female",
					parentRaces: parentRaces,
					isSibling: true,
				})));
			};

			const btnReroll = veT`<button class="ve-btn ve-btn-default ve-btn-xxs ve-print__hidden">重骰</button>`
				.vee.onn("click", () => pDoRollAndDisplay());

			veT`<div class="ve-flex-col life__output-wrp-border ve-p-3 ve-my-2">
				<div class="ve-split-v-center ve-mb-1">
					${dispTitle}
					${btnReroll}
				</div>
				${dispDetails}
			</div>`.vee.appendTo(siblings);

			await pDoRollAndDisplay();
		}
	} else {
		siblings.vee.html("你是独生子。");
	}
}

// FAMILY
function sectFamily () {
	function getChaVal () {
		const raw = selCha.vee.val();
		if (raw === "Random") return RollerUtil.randomise(11) - 6;
		else return Number(raw);
	}

	const family = veEs(`#family`);
	family.vee.empty();
	family.vee.appends(veT`<div>${`<b>家庭成员：</b> ${GenUtil.getFromTable(FAMILY, RNG(100)).result}<br>`}</div>`);

	let ixFamily = 1;
	const btnSuppFam = veT`<button class="ve-btn ve-btn-xs ve-btn-default ve-btn-supp-fam ve-print__hidden"></button>`
		.vee.onn("click", async () => {
			const dispDetails = veT`<div></div>`;

			const pDoRollAndDisplay = async () => dispDetails.vee.html(joinParaList(await getPersonDetails()));

			const btnReroll = veT`<button class="ve-btn ve-btn-default ve-btn-xxs ve-print__hidden">重骰</button>`
				.vee.onn("click", () => pDoRollAndDisplay());

			const btnRemove = veT`<button class="ve-btn ve-btn-xxs ve-print__hidden ve-btn-danger" title="删除"><span class="glyphicon glyphicon-trash"></span></button>`
				.vee.onn("click", () => wrpRes.remove());

			const wrpRes = veT`<div class="life__output-wrp-border ve-p-3 ve-my-2">
				<div class="ve-split-v-center ve-mb-1">
					<h5 class="ve-my-0 ve-mr-2">随机家庭成员${ixFamily++}</h5>
					<div class="ve-btn-group ve-flex-v-center">
						${btnReroll}
						${btnRemove}
					</div>
				</div>
				${dispDetails}
			</div>`;
			btnSuppFam.after(wrpRes);

			await pDoRollAndDisplay();
		});

	family.vee.appends(`<span class="note">你可以在“关系表”上掷骰子来确定你的家庭成员或你生活中其他重要人物对你的感觉。你还可以使用“种族”、“职业”和“阵营”表来了解更多关于抚养你的家庭成员或监护人的信息。</span>`);
	family.vee.appends(btnSuppFam);

	const rollFamLifestyle = GenUtil.getFromTable(FAMILY_LIFESTYLE, RNG(6) + RNG(6) + RNG(6));
	family.vee.appends(veT`<div><b>家庭类型：</b> ${rollFamLifestyle.result}<br></div>`);
	const rollFamHome = Math.min(Math.max(RNG(100) + rollFamLifestyle.modifier, 0), 111);
	const rollFamHomeRes = GenUtil.getFromTable(CHILDHOOD_HOME, rollFamHome).result;
	family.vee.appends(veT`<div><b>儿时的家：</b> ${rollFamHomeRes}<br></div>`);

	const rollChildMems = Math.min(Math.max(RNG(6) + RNG(6) + RNG(6) + getChaVal(), 3), 18);
	family.vee.appends(veT`<div><b>儿时记忆：</b> ${GenUtil.getFromTable(CHILDHOOD_MEMORIES, rollChildMems).result}</div>`);
}

// PERSONAL DECISIONS
function sectPersonalDecisions () {
	const personal = veEs(`#personal`).vee.empty();
	const valBg = Number(selBg.vee.val());
	const myBg = valBg === -1 ? rollOnArray(bgList) : bgList[valBg];
	personal.vee.appends(veT`<div>${`<b>背景：</b> ${myBg.name}<br>`}</div>`);
	personal.vee.appends(veT`<div>${`<b>我成为一名${myBg.name}的原因：</b> ${rollOnArray(myBg.reasons)}`}</div>`);
}

// CLASS TRAINING
function sectClassTraining () {
	const clss = veEs(`#clss`).vee.empty();
	const valClass = Number(selClass.vee.val());
	const myClass = valClass === -1 ? rollOnArray(classList) : classList[valClass];
	clss.vee.appends(veT`<div>${`<b>职业：</b> ${myClass.name}<br>`}</div>`);
	clss.vee.appends(veT`<div>${`<b>我成为一名${myClass.name}的原因：</b> ${rollOnArray(myClass.reasons)}`}</div>`);
}

// LIFE EVENTS
async function pSectLifeEvents () {
	const events = veEs(`#events`).vee.empty();
	marriageIndex = 0;
	const age = GenUtil.getFromTable(LIFE_EVENTS_AGE, Number(selAge.vee.val()) || RNG(100));
	events.vee.appends(veT`<div>${`<b>当前年龄:</b> ${age.result} ${fmtChoice(`${age.age} 岁`, true)}`}</div>`);

	for (let i = 0; i < age.events; ++i) {
		const dispResult = veT`<div></div>`;
		const dispNextRoll = veT`<div></div>`;

		const pRecurseNextRolls = async ({lifeEvent, wrpOutput}) => {
			wrpOutput.vee.empty();

			if (!lifeEvent.pNextRoll) return;

			const nextRoll = await lifeEvent.pNextRoll();
			if (!nextRoll) return;

			const wrpNextRoll = veT`<div></div>`;

			if (nextRoll.title) {
				const btnReroll = veT`<button class="ve-btn ve-btn-default ve-btn-xxs ve-print__hidden">重骰</button>`
					.vee.onn("click", () => pRecurseNextRolls({lifeEvent, wrpOutput}));

				veT`<div class="life__output-wrp-border ve-p-3 ve-my-2">
					<div class="ve-split-v-center ve-mb-1">
						<h5 class="ve-my-0 ve-mr-2">${nextRoll.title}</h5>
						${btnReroll}
					</div>
					${joinParaList(nextRoll.result)}
					${wrpNextRoll}
				</div>`
					.vee
					.appendTo(wrpOutput);
			} else {
				wrpOutput.vee.appends(
					veT`<div>${`${joinParaList(nextRoll.result)}<br>`}</div>`,
					wrpNextRoll,
				);
			}

			return pRecurseNextRolls({lifeEvent: nextRoll, wrpOutput: wrpNextRoll});
		};

		const pDoRollAndDisplay = async ({isScrollIntoView = false} = {}) => {
			const lifeEvent = GenUtil.getFromTable(LIFE_EVENTS, RNG(100));
			dispResult.vee.html(lifeEvent.result);
			await pRecurseNextRolls({lifeEvent, wrpOutput: dispNextRoll});
			if (isScrollIntoView) wrpEvent.scrollIntoView({block: "nearest", inline: "nearest"});
		};

		const btnReroll = veT`<button class="ve-btn ve-btn-default ve-btn-xxs">重骰</button>`
			.vee.onn("click", () => pDoRollAndDisplay({isScrollIntoView: true}));

		const wrpEvent = veT`<div class="ve-flex-col">
			<div class="ve-split-v-center ve-mb-1 ve-mt-2">
				<h5 class="ve-my-0 ve-mr-2">人生大事 ${i + 1}</h5>
				${btnReroll}
			</div>
			${dispResult}
			${dispNextRoll}
		</div>`.vee.appendTo(events);

		await pDoRollAndDisplay();
	}
}

async function pRoll () {
	veEm(`.life__output`).map(ele => ele.vee.removeClass("ve-hidden"));

	await pSectParents();
	sectBirthplace();
	await pSectSiblings();
	sectFamily();
	sectPersonalDecisions();
	sectClassTraining();
	await pSectLifeEvents();
}

class Lifegen {
	async pInit () {
		veEs(`#btn-generate`).vee.onn("click", () => pRoll());
		veEs(`#btn-reroll-parents`).vee.onn("click", () => pSectParents());
		veEs(`#btn-reroll-birthplace`).vee.onn("click", sectBirthplace);
		veEs(`#btn-reroll-siblings`).vee.onn("click", () => pSectSiblings());
		veEs(`#btn-reroll-family`).vee.onn("click", sectFamily);
		veEs(`#btn-reroll-personal`).vee.onn("click", sectPersonalDecisions);
		veEs(`#btn-reroll-class`).vee.onn("click", sectClassTraining);
		veEs(`#btn-reroll-events`).vee.onn("click", () => pSectLifeEvents());

		const selAge = veEs(`#age`).vee.onn("change", () => selAge.vee.toggleClass("ve-italic", !!selAge.vee.val()));

		await Promise.all([
			PrereleaseUtil.pInit(),
			BrewUtil2.pInit(),
		]);
		ExcludeUtil.pInitialise().then(null); // don't await, as this is only used for search
		const [lifeData, nameData] = await Promise.all([
			DataUtil.loadJSON("./data/life.json"),
			DataUtil.loadJSON("./data/names.json"),
		]);
		onJsonLoad(lifeData, nameData);

		veEs(`#xge_link`).replaceWith(veE({outer: (Renderer.get().render(`{@book 《珊娜萨的万事指南》|XGE|1|This Is Your Life}`))}));
	}
}

window.addEventListener("load", async () => {
	const lifegen = new Lifegen();
	await lifegen.pInit();

	window.dispatchEvent(new Event("toolsLoaded"));
});
