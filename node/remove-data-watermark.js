import fs from "node:fs";
import path from "node:path";

// Keep these values in sync with node/watermark-data.js. Older formats are
// included so this script can also undo watermarks added by earlier versions.
const WATERMARKS = new Set([
	"数据来源: [https://5e.kiwee.top](https://5e.kiwee.top) 数据协议 CC BY-NC-SA 4.0",
	"数据来源: [5etools中文站](https://5e.kiwee.top) 数据协议 CC BY-NC-SA 4.0",
	"数据来源: {@link 5etools中文站|https://5e.kiwee.top} 数据协议 CC BY-NC-SA 4.0",
]);
const BESTIARY_WATERMARKS = new Set([
	"[https://5e.kiwee.top](https://5e.kiwee.top) 数据协议 CC BY-NC-SA 4.0 ",
	"{@link 5etools中文站|https://5e.kiwee.top} 数据协议 CC BY-NC-SA 4.0 ",
]);
const DATA_DIR = path.resolve("data");

/** @param {string} dir */
function listJsonFiles (dir) {
	return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) return listJsonFiles(fullPath);
		return entry.isFile() && entry.name.endsWith(".json") ? [fullPath] : [];
	});
}

/** @param {unknown} json */
function removeWatermarks (json, {isBestiary = false} = {}) {
	if (!json || typeof json !== "object" || Array.isArray(json)) return false;

	let isChanged = false;
	for (const [listName, list] of Object.entries(json)) {
		if (!Array.isArray(list)) continue;

		for (const entity of list) {
			if (!entity || typeof entity !== "object" || Array.isArray(entity)) continue;

			if (isBestiary && listName === "monster" && Array.isArray(entity.action)) {
				const oldLength = entity.action.length;
				entity.action = entity.action.filter(action => {
					if (action?.ENG_name !== "source" || action?.name !== "数据来源" || !Array.isArray(action?.entries)) return true;
					return !action.entries.some(entry => BESTIARY_WATERMARKS.has(entry));
				});
				if (entity.action.length !== oldLength) {
					isChanged = true;
					if (!entity.action.length) delete entity.action;
				}
				continue;
			}

			if (!Array.isArray(entity.entries)) continue;
			const filteredEntries = entity.entries.filter(entry => !WATERMARKS.has(entry));
			if (filteredEntries.length === entity.entries.length) continue;
			entity.entries = filteredEntries;
			isChanged = true;
		}
	}

	return isChanged;
}

/** Infer the file's existing JSON formatting to avoid reformatting minified data. */
function getIndent (text) {
	if (!text.includes("\n")) return 0;
	if (/\n\t+\S/.test(text)) return "\t";
	const match = text.match(/\n( +)\S/);
	return match ? match[1] : "\t";
}

let changedFiles = 0;
for (const file of listJsonFiles(DATA_DIR)) {
	const original = fs.readFileSync(file, "utf8");
	const json = JSON.parse(original);
	const isBestiary = path.dirname(file) === path.join(DATA_DIR, "bestiary")
		&& /^bestiary-.*\.json$/.test(path.basename(file));
	if (!removeWatermarks(json, {isBestiary})) continue;

	const newline = original.includes("\r\n") ? "\r\n" : "\n";
	const serialized = JSON.stringify(json, null, getIndent(original)).replace(/\n/g, newline);
	fs.writeFileSync(file, `${serialized}${original.endsWith("\n") ? newline : ""}`, "utf8");
	changedFiles++;
}

console.log(`已从 ${changedFiles} 个 JSON 文件中移除水印。`);
