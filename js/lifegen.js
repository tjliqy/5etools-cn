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

			out.unshift(`<i><b title="Generated using the random name tables found in Xanathar's Guide to Everything">名字:</b> ${resultFirst.result}${lastName ? ` ${lastName}` : ""}</i>`);
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

		out.unshift(`<i><b>种族：</b> ${race}</i>`);
		const gender = opts.gender ? opts.gender : rollUnofficialGender().result;
		out.unshift(`<i><b>性别：</b> ${gender}</i>`);

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
	{min: 56, max: 63, result: () => `医生或助产士的家${choose("医生", "助产士")}`, display: "Home of a healer or midwife"},
	{min: 64, max: 65, result: () => `马车、手推车或货车${choose("马车", "手推车", "货车")}`, display: "Carriage, cart, or wagon"},
	{min: 66, max: 68, result: () => `谷仓、棚屋或室外建筑${choose("谷仓", "棚屋", "室外建筑")}`, display: "Barn, shed, or other outbuilding"},
	{min: 69, max: 70, result: "洞穴"},
	{min: 71, max: 72, result: "田野"},
	{min: 73, max: 74, result: "森林"},
	{min: 75, max: 77, result: "寺庙"},
	{min: 78, result: "战场"},
	{min: 79, max: 80, result: () => `小巷或街道${choose("小巷", "街道")}`, display: "Alley or street"},
	{min: 81, max: 82, result: () => `妓院、酒馆或客栈${choose("妓院", "酒馆", "客栈")}`, display: "Brothel, tavern, or inn"},
	{min: 83, max: 84, result: () => `城堡、要塞、塔楼或宫殿${choose("城堡", "要塞", "塔楼", "宫殿")}`, display: "Castle, keep, tower, or palace"},
	{min: 85, result: () => `下水道或垃圾堆${choose("下水道", "垃圾堆")}`, display: "Sewer or rubbish heap"},
	{min: 86, max: 88, result: "在不同种族的人中"},
	{min: 89, max: 91, result: () => `在船上${choose("帆船", "轮船")}`, display: "On board a boat or a ship"},
	{min: 92, max: 93, result: () => `在监狱或秘密组织的总部${choose("监狱", "秘密组织的总部")}`, display: "In a prison or in the headquarters of a secret organization"},
	{min: 94, max: 95, result: "在智者的实验室里"},
	{min: 96, result: "在妖精荒野"},
	{min: 97, result: "在堕影冥界"},
	{min: 98, result: () => `在星界位面或以太位面${choose("星界位面", "以太位面")}`, display: "On the Astral Plane or the Ethereal Plane"},
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
	{min: 1, result: () => `无。 ${absentBothParents()}`, display: "None"},
	{min: 2, result: () => `福利机构，如庇护所。 ${absentBothParents()}`, display: "Institution, such as an asylum"},
	{min: 3, result: () => `寺庙。 ${absentBothParents()}`, display: "Temple"},
	{min: 4, max: 5, result: () => `孤儿院。 ${absentBothParents()}`, display: "Orphanage"},
	{min: 6, max: 7, result: () => `监护人。 ${absentBothParents()}`, display: "Guardian"},
	{min: 8, max: 15, result: () => `父亲或母亲的姑姑、叔叔，或者两者都有；或者是大家族，如部落或氏族 ${choose("叔叔", "姑姑", "叔叔和姑姑", "大家族，如部落或氏族")}. ${absentBothParents()}`, display: "Paternal or maternal aunt, uncle, or both; or extended family such as a tribe or clan"},
	{min: 16, max: 25, result: () => `祖父母或外祖父母 ${choose("祖父", "祖母", "祖父和祖母")}. ${absentBothParents()}`, display: "Paternal or maternal grandparent(s)"},
	{min: 26, max: 35, result: () => `寄养家庭（相同或不同种族） ${choose("相同种族", "不同种族")}. ${absentBothParents()}`, display: "Adoptive family (same or different race)"},
	{min: 36, max: 55, result: () => singleParentOrStep("父亲"), display: "Single father or stepfather"},
	{min: 56, max: 75, result: () => singleParentOrStep("母亲"), display: "Single mother or stepmother"},
	{min: 76, max: 100, result: "父亲和母亲"},
];

const ABSENT_PARENT = [
	{min: 1, result: () => `你的父母死了 (${rollSuppDeath().result.lowercaseFirst()}).`, display: "Your parent died (roll on the {@table Supplemental Tables; Cause of Death|XGE|Cause of Death} supplemental table)."},
	{min: 2, result: () => `你的父母被监禁、奴役或以其他方式被带走 ${choose("监禁", "奴役", "以其他方式被带走")}.`, display: "Your parent was imprisoned, enslaved, or otherwise taken away."},
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
	{min: 31, max: 40, result: () => `在野外的营地或村庄${choose("营地", "村庄")}`, display: "Encampment or village in the wilderness"},
	{min: 41, max: 50, result: "位于破旧街区的公寓"},
	{min: 51, max: 70, result: "小房子"},
	{min: 71, max: 90, result: "大房子"},
	{min: 91, max: 110, result: "高级公寓"},
	{min: 111, result: () => `宫殿或城堡${choose("宫殿", "城堡")}`, display: "Palace or castle"},
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
	{min: 1, max: 10, result: "You suffered a tragedy. Roll on the Tragedies table.", pNextRoll: () => _pLifeEvtResult("Tragedy", rollEvtTragedy())},
	{min: 11, max: 20, result: "You gained a bit of good fortune. Roll on the Boons table.", pNextRoll: () => _pLifeEvtResult("Boon", rollEvtBoon())},
	{min: 21, max: 30, result: "You fell in love or got married. If you get this result more than once, you can choose to have a child instead. Work with your DM to determine the identity of your love interest.", pNextRoll: async () => _lifeEvtPerson(marriageIndex++ === 0 ? "Spouse" : "Spouse/Child", await getPersonDetails())},
	{min: 31, max: 40, result: () => `You made an enemy of an adventurer. Roll a {@dice d6} ${fmtChoice(RNG(6))}. An odd number indicates you are to blame for the rift, and an even number indicates you are blameless. Use the supplemental tables and work with your DM to determine this hostile character's identity and the danger this enemy poses to you.`, display: "You made an enemy of an adventurer. Roll a {@dice d6}. An odd number indicates you are to blame for the rift, and an even number indicates you are blameless. Use the supplemental tables and work with your DM to determine this hostile character's identity and the danger this enemy poses to you.", pNextRoll: async () => _lifeEvtPerson("Enemy", await getPersonDetails({isAdventurer: true}))},
	{min: 41, max: 50, result: "You made a friend of an adventurer. Use the supplemental tables and work with your DM to add more detail to this friendly character and establish how your friendship began.", pNextRoll: async () => _lifeEvtPerson("Friend", await getPersonDetails({isAdventurer: true}))},
	{min: 51, max: 70, result: () => `You spent time working in a job related to your background. Start the game with an extra {@dice 2d6} ${fmtChoice(RNG(6) + RNG(6))} gp.`, display: "You spent time working in a job related to your background. Start the game with an extra {@dice 2d6} gp."},
	{min: 71, max: 75, result: "You met someone important. Use the supplemental tables to determine this character's identity and how this individual feels about you. Work out additional details with your DM as needed to fit this character into your backstory.", pNextRoll: async () => _lifeEvtPerson("Meeting", await getPersonDetails())},
	{min: 76, max: 80, result: "You went on an adventure. Roll on the Adventures table to see what happened to you. Work with your DM to determine the nature of the adventure and the creatures you encountered.", pNextRoll: () => _pLifeEvtResult("Adventure", rollEvtAdventure())},
	{min: 81, max: 85, result: "You had a supernatural experience. Roll on the Supernatural Events table to find out what it was.", pNextRoll: () => _pLifeEvtResult("Supernatural Experience", rollEvtSupernatural())},
	{min: 86, max: 90, result: "You fought in a battle. Roll on the War table to learn what happened to you. Work with your DM to come up with the reason for the battle and the factions involved. It might have been a small conflict between your community and a band of orcs, or it could have been a major battle in a larger war.", pNextRoll: () => _pLifeEvtResult("War", rollEvtWar())},
	{min: 91, max: 95, result: "You committed a crime or were wrongly accused of doing so. Roll on the Crime table to determine the nature of the offense and on the Punishment table to see what became of you.", pNextRoll: () => _lifeEvtResultArr("Crime and Punishment", ["Crime", "Punishment"], rollEvtCrime(), rollEvtPunishment())},
	{min: 96, max: 99, result: "You encountered something magical. Roll on the Arcane Matters table.", pNextRoll: () => _pLifeEvtResult("Arcane Matter", rollEvtArcaneMatter())},
	{min: 100, result: "Something truly strange happened to you. Roll on the Weird Stuff table.", pNextRoll: () => _pLifeEvtResult("Weird Stuff", rollEvtWeird())},
];

const LIFE_EVENTS_ADVENTURES = [
	{min: 1, max: 10, result: () => `You nearly died. You have nasty scars on your body, and you are missing an ear, {@dice 1d3} ${fmtChoice(RNG(3))} fingers, or {@dice 1d4} ${fmtChoice(RNG(4))} toes.`, display: "You nearly died. You have nasty scars on your body, and you are missing an ear, {@dice 1d3} fingers, or {@dice 1d4} toes."},
	{min: 11, max: 20, result: "You suffered a grievous injury. Although the wound healed, it still pains you from time to time."},
	{min: 21, max: 30, result: "You were wounded, but in time you fully recovered."},
	{min: 31, max: 40, result: "You contracted a disease while exploring a filthy warren. You recovered from the disease, but you have a persistent cough, pockmarks on your skin, or prematurely gray hair."},
	{min: 41, max: 50, result: "You were poisoned by a trap or a monster. You recovered, but the next time you must make a saving throw against poison, you make the saving throw with disadvantage."},
	{min: 51, max: 60, result: "You lost something of sentimental value to you during your adventure. Remove one trinket from your possessions."},
	{min: 61, max: 70, result: "You were terribly frightened by something you encountered and ran away, abandoning your companions to their fate."},
	{min: 71, max: 80, result: "You learned a great deal during your adventure. The next time you make an ability check or a saving throw, you have advantage on the roll."},
	{min: 81, max: 90, result: () => `You found some treasure on your adventure. You have {@dice 2d6} ${fmtChoice(RNG(6) + RNG(6))} gp left from your share of it.`, display: "You found some treasure on your adventure. You have {@dice 2d6} gp left from your share of it."},
	{min: 91, max: 99, result: () => `You found a considerable amount of treasure on your adventure. You have {@dice 1d20 + 50} ${fmtChoice(RNG(20) + 50)} gp left from your share of it.`, display: "You found a considerable amount of treasure on your adventure. You have {@dice 1d20 + 50} gp left from your share of it."},
	{min: 100, result: "You came across a common magic item (of the DM's choice)."},
];

const LIFE_EVENTS_ARCANE_MATTERS = [
	{min: 1, result: "You were charmed or frightened by a spell."},
	{min: 2, result: "You were injured by the effect of a spell."},
	{min: 3, result: "You witnessed a powerful spell being cast by a cleric, a druid, a sorcerer, a warlock, or a wizard."},
	{min: 4, result: "You drank a potion (of the DM's choice)."},
	{min: 5, result: "You found a spell scroll (of the DM's choice) and succeeded in casting the spell it contained."},
	{min: 6, result: "You were affected by teleportation magic."},
	{min: 7, result: "You turned invisible for a time."},
	{min: 8, result: "You identified an illusion for what it was."},
	{min: 9, result: "You saw a creature being conjured by magic."},
	{min: 10, result: () => `Your fortune was read by a diviner. Roll twice on the Life Events table, but don't apply the results. Instead, the DM picks one event as a portent of your future (which might or might not come true). ${fmtChoice(GenUtil.getFromTable(LIFE_EVENTS, RNG(100)).display || GenUtil.getFromTable(LIFE_EVENTS, RNG(100)).result)} ${fmtChoice(GenUtil.getFromTable(LIFE_EVENTS, RNG(100)).display || GenUtil.getFromTable(LIFE_EVENTS, RNG(100)).result)}`, display: "Your fortune was read by a diviner. Roll twice on the Life Events table, but don't apply the results. Instead, the DM picks one event as a portent of your future (which might or might not come true)."},
];

const LIFE_EVENTS_BOONS = [
	{min: 1, result: "A friendly wizard gave you a spell scroll containing one cantrip (of the DM's choice)."},
	{min: 2, result: "You saved the life of a commoner, who now owes you a life debt. This individual accompanies you on your travels and performs mundane tasks for you, but will leave if neglected, abused, or imperiled. Determine details about this character by using the supplemental tables and working with your DM.", pNextRoll: async () => _lifeEvtPerson("Commoner", await getPersonDetails())},
	{min: 3, result: "You found a {@item riding horse}."},
	{min: 4, result: () => `You found some money. You have {@dice 1d20} ${fmtChoice(RNG(20))} gp in addition to your regular starting funds.`, display: "You found some money. You have {@dice 1d20} gp in addition to your regular starting funds."},
	{min: 5, result: "A relative bequeathed you a simple weapon of your choice."},
	{min: 6, result: () => `You found something interesting. You gain one additional trinket ${fmtChoice(rollTrinket())}.`, display: "You found something interesting. You gain one additional trinket."},
	{min: 7, result: "You once performed a service for a local temple. The next time you visit the temple, you can receive healing up to your hit point maximum."},
	{min: 8, result: "A friendly alchemist gifted you with a potion of healing or a flask of acid, as you choose."},
	{min: 9, result: "You found a treasure map."},
	{min: 10, result: () => `A distant relative left you a stipend that enables you to live at the comfortable lifestyle for {@dice 1d20} ${fmtChoice(RNG(20))} years. If you choose to live at a higher lifestyle, you reduce the price of the lifestyle by 2 gp during that time period.`, display: "A distant relative left you a stipend that enables you to live at the comfortable lifestyle for {@dice 1d20} years. If you choose to live at a higher lifestyle, you reduce the price of the lifestyle by 2 gp during that time period."},
];

const LIFE_EVENTS_CRIME = [
	{min: 1, result: "Murder"},
	{min: 2, result: "Theft"},
	{min: 3, result: "Burglary"},
	{min: 4, result: "Assault"},
	{min: 5, result: "Smuggling"},
	{min: 6, result: "Kidnapping"},
	{min: 7, result: "Extortion"},
	{min: 8, result: "Counterfeiting"},
];

const LIFE_EVENTS_PUNISHMENT = [
	{min: 1, max: 3, result: "You did not commit the crime and were exonerated after being accused."},
	{min: 4, max: 6, result: "You committed the crime or helped do so, but nonetheless the authorities found you not guilty."},
	{min: 7, max: 8, result: "You were nearly caught in the act. You had to flee and are wanted in the community where the crime occurred."},
	{min: 9, max: 12, result: () => `You were caught and convicted. You spent time in jail, chained to an oar, or performing hard labor. You served a sentence of {@dice 1d4} years ${fmtChoice(RNG(4))} or succeeded in escaping after that much time.`, display: "You were caught and convicted. You spent time in jail, chained to an oar, or performing hard labor. You served a sentence of {@dice 1d4} years or succeeded in escaping after that much time."},
];

const LIFE_EVENTS_SUPERNATURAL = [
	{min: 1, max: 5, result: () => `You were ensorcelled by a fey and enslaved for {@dice 1d6} ${fmtChoice(RNG(6))} years before you escaped.`, display: "You were ensorcelled by a fey and enslaved for {@dice 1d6} years before you escaped."},
	{min: 6, max: 10, result: "You saw a demon and ran away before it could do anything to you."},
	{min: 11, max: 15, result: () => `A devil tempted you. Make a DC 10 Wisdom saving throw. On a failed save, your alignment shifts one step toward evil (if it's not evil already), and you start the game with an additional {@dice 1d20 + 50} ${fmtChoice(RNG(20) + 50)} gp.`, display: "A devil tempted you. Make a DC 10 Wisdom saving throw. On a failed save, your alignment shifts one step toward evil (if it's not evil already), and you start the game with an additional {@dice 1d20 + 50} gp."},
	{min: 16, max: 20, result: "You woke up one morning miles from your home, with no idea how you got there."},
	{min: 21, max: 30, result: "You visited a holy site and felt the presence of the divine there."},
	{min: 31, max: 40, result: "You witnessed a falling red star, a face appearing in the frost, or some other bizarre happening. You are certain that it was an omen of some sort."},
	{min: 41, max: 50, result: "You escaped certain death and believe it was the intervention of a god that saved you."},
	{min: 51, max: 60, result: "You witnessed a minor miracle."},
	{min: 61, max: 70, result: "You explored an empty house and found it to be haunted."},
	{min: 71, max: 75, result: () => { const p = RNG(6); return `You were briefly possessed. Roll a {@dice d6} to determine what type of creature possessed you: 1, celestial; 2, devil; 3, demon; 4, fey; 5, elemental; 6, undead ${fmtChoice(`${p}; ${["celestial", "devil", "demon", "fey", "elemental", "undead"][p - 1]}`)}.`; }, display: "You were briefly possessed. Roll a {@dice d6} to determine what type of creature possessed you: 1, celestial; 2, devil; 3, demon; 4, fey; 5, elemental; 6, undead."},
	{min: 76, max: 80, result: "You saw a ghost."},
	{min: 81, max: 85, result: "You saw a ghoul feeding on a corpse."},
	{min: 86, max: 90, result: "A celestial or a fiend visited you in your dreams to give a warning of dangers to come."},
	{min: 91, max: 95, result: () => `You briefly visited the Feywild or the Shadowfell ${choose("Feywild", "Shadowfell")}.`, "results": "You briefly visited the Feywild or the Shadowfell."},
	{min: 96, max: 100, result: "You saw a portal that you believe leads to another plane of existence."},
];

const LIFE_EVENTS_TRAGEDIES = [
	{min: 1, max: 2, result: () => `A family member or a close friend died. Roll on the {@table Supplemental Tables; Cause of Death|XGE|Cause of Death} supplemental table to find out how.`, display: "A family member or a close friend died. Roll on the Cause of Death supplemental table to find out how.", pNextRoll: () => _pLifeEvtResult("Cause of Death", rollSuppDeath())},
	{min: 3, result: "A friendship ended bitterly, and the other person is now hostile to you. The cause might have been a misunderstanding or something you or the former friend did."},
	{min: 4, result: "You lost all your possessions in a disaster, and you had to rebuild your life."},
	{min: 5, result: () => `You were imprisoned for a crime you didn't commit and spent {@dice 1d6} ${fmtChoice(RNG(6))} years at hard labor, in jail, or shackled to an oar in a slave galley.`, display: "You were imprisoned for a crime you didn't commit and spent {@dice 1d6} years at hard labor, in jail, or shackled to an oar in a slave galley."},
	{min: 6, result: "War ravaged your home community, reducing everything to rubble and ruin. In the aftermath, you either helped your town rebuild or moved somewhere else."},
	{min: 7, result: "A lover disappeared without a trace. You have been looking for that person ever since."},
	{min: 8, result: "A terrible blight in your home community caused crops to fail, and many starved. You lost a sibling or some other family member."},
	{min: 9, result: "You did something that brought terrible shame to you in the eyes of your family. You might have been involved in a scandal, dabbled in dark magic, or offended someone important. The attitude of your family members toward you becomes indifferent at best, though they might eventually forgive you."},
	{min: 10, result: "For a reason you were never told, you were exiled from your community. You then either wandered in the wilderness for a time or promptly found a new place to live."},
	{min: 11, result: () => `A romantic relationship ended. Roll a {@dice d6} ${fmtChoice(RNG(6))}. An odd number means it ended with bad feelings, while an even number means it ended amicably.`, display: "A romantic relationship ended. Roll a {@dice d6}. An odd number means it ended with bad feelings, while an even number means it ended amicably."},
	{min: 12, result: () => `A current or prospective romantic partner of yours died. Roll on the {@table Supplemental Tables; Cause of Death|XGE|Cause of Death} supplemental table to find out how. If the result is murder, roll a {@dice d12}. On a 1, you were responsible, whether directly or indirectly.`, display: "A current or prospective romantic partner of yours died. Roll on the {@table Supplemental Tables; Cause of Death|XGE|Cause of Death} supplemental table to find out how. If the result is murder, roll a {@dice d12}. On a 1, you were responsible, whether directly or indirectly.", pNextRoll: () => _pLifeEvtResult("Cause of Death", (() => { const r = RNG(12); const p = GenUtil.getFromTable(SUPP_DEATH, r); return {result: `${p.result}${r === 2 && RNG(12) === 1 ? ` ${fmtChoice("you were responsible")}` : ""}`}; })())},
];

const LIFE_EVENTS_WAR = [
	{min: 1, result: "You were knocked out and left for dead. You woke up hours later with no recollection of the battle."},
	{min: 2, max: 3, result: "You were badly injured in the fight, and you still bear the awful scars of those wounds."},
	{min: 4, result: "You ran away from the battle to save your life, but you still feel shame for your cowardice."},
	{min: 5, max: 7, result: "You suffered only minor injuries, and the wounds all healed without leaving scars."},
	{min: 8, max: 9, result: "You survived the battle, but you suffer from terrible nightmares in which you relive the experience."},
	{min: 10, max: 11, result: "You escaped the battle unscathed, though many of your friends were injured or lost."},
	{min: 12, result: "You acquitted yourself well in battle and are remembered as a hero. You might have received a medal for your bravery."},
];

const LIFE_EVENTS_WEIRD_STUFF = [
	{min: 1, result: () => `You were turned into a toad and remained in that form for {@dice 1d4} ${fmtChoice(RNG(4))} weeks.`, display: "You were turned into a toad and remained in that form for {@dice 1d4} weeks."},
	{min: 2, result: "You were petrified and remained a stone statue for a time until someone freed you."},
	{min: 3, result: () => `You were enslaved by a hag, a satyr, or some other being and lived in that creature's thrall for {@dice 1d6} ${fmtChoice(RNG(6))} years.`, display: "You were enslaved by a hag, a satyr, or some other being and lived in that creature’s thrall for {@dice 1d6} years."},
	{min: 4, result: () => `A dragon held you as a prisoner for {@dice 1d4} ${fmtChoice(RNG(4))} months until adventurers killed it.`, display: "A dragon held you as a prisoner for {@dice 1d4} months until adventurers killed it."},
	{min: 5, result: "You were taken captive by a race of evil humanoids such as drow, kuo-toa, or quaggoths. You lived as a slave in the Underdark until you escaped."},
	{min: 6, result: "You served a powerful adventurer as a hireling. You have only recently left that service. Use the supplemental tables and work with your DM to determine the basic details about your former employer.", pNextRoll: async () => _lifeEvtPerson("Employer", await getPersonDetails({isAdventurer: true}))},
	{min: 7, result: () => `You went insane for {@dice 1d6} ${fmtChoice(RNG(6))} years and recently regained your sanity. A tic or some other bit of odd behavior might linger.`, display: "You went insane for {@dice 1d6} years and recently regained your sanity. A tic or some other bit of odd behavior might linger."},
	{min: 8, result: "A lover of yours was secretly a silver dragon."},
	{min: 9, result: "You were captured by a cult and nearly sacrificed on an altar to the foul being the cultists served. You escaped, but you fear they will find you."},
	{min: 10, result: () => `You met a demigod, an archdevil, an archfey, a demon lord, or a titan, ${choose("demigod", "archdevil", "archfey", "demon lord", "titan")} and you lived to tell the tale.`, display: "You met a demigod, an archdevil, an archfey, a demon lord, or a titan, and you lived to tell the tale."},
	{min: 11, result: "You were swallowed by a giant fish and spent a month in its gullet before you escaped."},
	{min: 12, result: () => `A powerful being granted you a wish, but you squandered it on something frivolous.`, display: "A powerful being granted you a wish, but you squandered it on something frivolous."},
];

const SUPP_ALIGNMENT = [
	{min: 1, max: 3, result: () => rollOnArray(["混乱邪恶", "混乱中立"]), display: "Chaotic evil (50%) or chaotic neutral (50%)"},
	{min: 4, max: 5, result: "守序邪恶"},
	{min: 6, max: 8, result: "中立邪恶"},
	{min: 9, max: 12, result: "绝对中立"},
	{min: 13, max: 15, result: "中立善良"},
	{min: 16, max: 17, result: () => rollOnArray(["守序善良", "中立善良"]), display: "Lawful good (50%) or lawful neutral (50%)"},
	{min: 18, result: () => rollOnArray(["混乱善良", "混乱中立"]), display: "Chaotic good (50%) or chaotic neutral (50%)"},
];

const SUPP_DEATH = [
	{min: 1, result: "未知原因"},
	{min: 2, result: "被谋杀"},
	{min: 3, result: "死于战争"},
	{min: 4, result: "与阶级或职业有关的事故"},
	{min: 5, result: "与阶级或职业无关的事故"},
	{min: 6, max: 7, result: "自然死亡，例如疾病或衰老"},
	{min: 8, result: "自杀"},
	{min: 9, result: () => `因动物或自然灾害而死${choose("动物", "自然灾害")}`, display: "Torn apart by an animal or a natural disaster"},
	{min: 10, result: () => "被怪物吞噬"},
	{min: 11, result: () => `因犯罪被处决或折磨致死${choose("犯罪被处决", "折磨致死")}`, display: "Executed for a crime or tortured to death"},
	{min: 12, result: "奇异的事件，比如被陨石击中、被愤怒的神灵击倒，或者被孵化中的史拉蟾蛋杀死"},
];

const SUPP_CLASS = [
	{min: 1, max: 7, result: "Barbarian"},
	{min: 8, max: 14, result: "Bard"},
	{min: 15, max: 29, result: "Cleric"},
	{min: 30, max: 36, result: "Druid"},
	{min: 37, max: 52, result: "Fighter"},
	{min: 53, max: 58, result: "Monk"},
	{min: 59, max: 64, result: "Paladin"},
	{min: 65, max: 70, result: "Ranger"},
	{min: 71, max: 84, result: "Rogue"},
	{min: 85, max: 89, result: "Sorcerer"},
	{min: 90, max: 94, result: "Warlock"},
	{min: 95, max: 100, result: "Wizard"},
];

const SUPP_OCCUPATION = [
	{min: 1, max: 5, result: "科研人员"},
	{min: 6, max: 10, result: () => `冒险家(${rollSuppClass().result})`, display: "Adventurer (roll on the Class table)"},
	{min: 11, result: "贵族"},
	{min: 12, max: 26, result: () => `工匠或公会成员 ${choose("工匠", "工会成员")}`, display: "Artisan or guild member"},
	{min: 27, max: 31, result: "罪犯"},
	{min: 32, max: 36, result: "艺人"},
	{min: 37, max: 38, result: () => `流浪者、隐士或难民${choose("流浪者", "隐士", "难民")}`, display: "Exile, hermit, or refugee"},
	{min: 39, max: 43, result: () => `探险家或漫游者${choose("探险家", "漫游者")}`, display: "Explorer or wanderer"},
	{min: 44, max: 55, result: () => `农民或牧民${choose("农民", "牧民")}`, display: "Farmer or herder"},
	{min: 56, max: 60, result: () => `猎人或捕猎者${choose("猎人", "捕猎者")}`, display: "Hunter or trapper"},
	{min: 61, max: 75, result: "工人"},
	{min: 76, max: 80, result: "商人"},
	{min: 81, max: 85, result: () => `政治家或官僚${choose("政治家", "官僚")}`, display: "Politician or bureaucrat"},
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
	{min: 81, max: 85, result: "Half-elf"},
	{min: 86, max: 90, result: "Half-orc"},
	{min: 91, max: 95, result: "提夫林"},
	{min: 96, max: 100, result: "DM’s choice"},
];

const SUPP_RELATIONSHIP = [
	{min: 3, max: 4, result: "敌对"},
	{min: 5, max: 10, result: "友好"},
	{min: 11, max: 12, result: "漠不关心"},
];

const SUPP_STATUS = [
	{min: 3, result: () => { return `Dead (${rollSuppDeath().result.lowercaseFirst()})`; }, display: "Dead (roll on the Cause of Death table)", "dead": true},
	{min: 4, max: 5, result: () => `失踪或失联${choose("失踪", "失联")}`, display: "Missing or status unknown"},
	{min: 6, max: 8, result: () => `活着，但由于受伤、经济困难或关系问题而状况不佳${choose("受伤", "经济困难", "关系问题")}`, display: "Alive, but doing poorly due to injury, financial trouble, or relationship difficulties"},
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
		parents.vee.html(concatSentences(`<b>种族:</b> 其他 ${fmtChoice(`${race}; generated using the {@table Supplemental Tables; Race|XGE|Supplemental Race} table`, true)}`, knowParentsStr, parentage));
	} else {
		parents.vee.html(concatSentences(`<b>种族:</b> ${race}${selRace === "Random" ? ` ${fmtChoice("generated using the {@table Supplemental Tables; Race|XGE|Supplemental Race} table", true)}` : ""}`, knowParentsStr, parentage));
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

	const strangeBirth = RNG(100) === 100 ? "A strange event coincided with your birth: the moon briefly turning red, all the milk within a mile spoiling, the water in the area freezing solid in midsummer, all the iron in the home rusting or turning to silver, or some other unusual event of your choice" : "";
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
					gender: siblingType === "兄弟" ? "男性" : "女性",
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

			const btnRemove = veT`<button class="ve-btn ve-btn-xxs ve-print__hidden ve-btn-danger" title="Delete"><span class="glyphicon glyphicon-trash"></span></button>`
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
				const btnReroll = veT`<button class="ve-btn ve-btn-default ve-btn-xxs ve-print__hidden">Reroll</button>`
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
