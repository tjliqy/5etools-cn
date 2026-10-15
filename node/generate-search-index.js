import fs from "fs";
import {Command} from "commander";
import "./locale/i18n.js";
import "../js/parser.js";
import "../js/utils.js";
import "../js/utils-ui.js";
import "../js/utils-config.js";
import "../js/render.js";
import "../js/render-dice.js";
import "../js/hist.js";
import "../js/filter.js";
import "../js/utils-brew.js";
import * as utS from "./util-search-index.js";
import {Timer} from "./util.js";

const program = new Command()
	.option("--partnered", `同时生成合作内容索引。`)
	.option("--uncompressed", `以易读格式输出。`)
;

program.parse(process.argv);
const params = program.opts();

const getJsonString = (data) => {
	if (!params.uncompressed) return JSON.stringify(data);
	return JSON.stringify(data, null, "\t");
};

async function pMain () {
	const t = Timer.start();

	console.log("##### 正在创建主索引… #####");
	const index = await utS.UtilSearchIndex.pGetIndex();
	fs.writeFileSync("search/index.json", getJsonString(index), "utf8");
	console.log("##### 正在创建次级索引… #####");
	const indexAdditionalItems = await utS.UtilSearchIndex.pGetIndexAdditional(Parser.CAT_ID_ITEM);
	fs.writeFileSync("search/index-item.json", getJsonString(indexAdditionalItems), "utf8");
	console.log("##### 正在创建法术备用索引… #####");
	const indexAltSpells = await utS.UtilSearchIndex.pGetIndexAlternate("spell");
	fs.writeFileSync("search/index-alt-spell.json", getJsonString(indexAltSpells), "utf8");
	console.log("##### 正在创建 Foundry 索引… #####");
	const indexFoundry = await utS.UtilSearchIndex.pGetIndexFoundry();
	fs.writeFileSync("search/index-foundry.json", getJsonString(indexFoundry), "utf8");

	if (params.partnered) {
		console.log("##### 正在创建合作内容索引… #####");
		const indexPartnered = await utS.UtilSearchIndex.pGetIndexPartnered();
		fs.writeFileSync("search/index-partnered.json", getJsonString(indexPartnered), "utf8");
	}

	console.log(`索引已生成，耗时 ${Timer.stop(t)}`);
}

export default pMain();
