import "./locale/i18n.js";
import {Command} from "commander";
import "../js/parser.js";
import "../js/utils.js";
import "../js/utils-dataloader.js";
import "../js/utils-config.js";
import "../js/render.js";
import "../js/render-dice.js";
import {setUp, loadSpells, run, teardown} from "./util-tag-jsons.js";
import {TagJsons} from "../js/converter/converterutils-entries.js";

const program = new Command()
	.option("--file [file]", `文件路径（例如“./data/my-file.json”）`)
	.option("--file-prefix [filePrefix]", `一个或多个文件的路径前缀（例如“./data/dir/”）`)
	.option("--dir [dir]", `根目录（例如“./other/dir/”）`)
	.option("--inplace", `直接修改原文件`)
	.option("--bestiary-file [bestiaryFile]", `生成具名生物标签时使用的关联怪物图鉴 JSON（例如“./data/my-file.json”）`)
	.option("--style-hint [style-hint]", `指定转换器的输入格式提示`)
	.option("--strict", `仅使用严格匹配或大写匹配的标签器`)
;

program.parse(process.argv);
const params = program.opts();

async function main () {
	setUp();
	await TagJsons.pInit({
		spells: loadSpells(),
	});
	run({
		file: params.file,
		filePrefix: params.filePrefix,
		dir: params.dir,
		inplace: params.inplace,
		bestiaryFile: params.bestiaryFile,
		styleHint: params.styleHint,
		strict: params.strict,
	});
	teardown();
	console.log("运行完成。");
}

await main();
