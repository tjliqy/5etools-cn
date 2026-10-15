import "../js/parser.js";
import "../js/utils.js";
import * as ut from "../node/util.js";
import {BLOCKLIST_SOURCES_CREDITS} from "../node/consts-credits.js";

async function main () {
	console.log(`##### 正在验证冒险／书籍署名 #####`);

	const cnt = [
		{filename: "adventures.json", prop: "adventure"},
		{filename: "books.json", prop: "book"},
	]
		.map(({filename, prop}) => {
			const json = ut.readJson(`./data/${filename}`);

			const noCredits = json[prop]
				.filter(meta => {
					if (BLOCKLIST_SOURCES_CREDITS.has(meta.source)) return false;
					return meta.contents && !meta.contents.some(it => it.name === "Credits");
				});
			if (!noCredits.length) return 0;

			console.error(`\n“${filename}”中缺少“署名”章节：\n${noCredits.map(meta => `\t${meta.id}`).join("\n")}`);
			return noCredits.length;
		})
		.sum();

	if (!cnt) console.log("署名检查通过。");

	return true;
}

export default main();
