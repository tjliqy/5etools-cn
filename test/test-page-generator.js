import fs from "fs";
import "../js/parser.js";
import "../js/utils.js";
import {PAGE_GENERATORS} from "../node/generate-pages/generate-pages-page-generator-config.js";

function main () {
	const htmlFiles = new Set(
		fs.readdirSync(".")
			.filter(fname => fname.endsWith(".html")),
	);

	PAGE_GENERATORS
		.forEach(generator => htmlFiles.delete(generator.getPage()));

	if (!htmlFiles.size) return console.log(`所有页面都有生成器！`);

	console.warn(`以下页面没有生成器：\n${Array.from(htmlFiles).sort(SortUtil.ascSortLower).map(it => `\t${it}`).join("\n")}`);
}

main();
