import "./locale/i18n.js";
import fs from "fs";
import {simpleGit} from "simple-git";
import "../js/parser.js";
import "../js/utils.js";

const git = simpleGit();

const FILES_TO_REPLACE_VERSION_IN = ["js/utils.js"];
const VERSION_MARKER_START = "/* 5ETOOLS_VERSION__OPEN */";
const VERSION_MARKER_END = "/* 5ETOOLS_VERSION__CLOSE */";
const VERSION_REPLACE_REGEXP = new RegExp(`${VERSION_MARKER_START.escapeRegexp()}.*?${VERSION_MARKER_END.escapeRegexp()}`, "g");

async function main () {
	const version = JSON.parse(fs.readFileSync("package.json", "utf-8")).version;
	const versionReplaceString = `${VERSION_MARKER_START}"${version}"${VERSION_MARKER_END}`;
	console.log("正在将文件中的版本号替换为 ", version, "：", FILES_TO_REPLACE_VERSION_IN);

	for (const fileName of FILES_TO_REPLACE_VERSION_IN) {
		let fileContents = fs.readFileSync(fileName, "utf8");
		const contentsWithReplacedVersion = fileContents.replace(VERSION_REPLACE_REGEXP, versionReplaceString);
		fs.writeFileSync(fileName, contentsWithReplacedVersion, "utf8");
		await git.add(fileName);
	}
}

main()
	.then(() => console.log("已替换所有文件中的版本号。"))
	.catch(e => { throw e; });
