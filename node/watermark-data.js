import fs from "node:fs";
import path from "node:path";

const WATERMARK = "数据来源: {@link 5etools中文站|https://5e.kiwee.top} 数据协议 CC BY-NC-SA 4.0";
const BESTIARY_WATERMARK = {
	ENG_name: "source",
	name: "数据来源",
	entries: ["{@link 5etools中文站|https://5e.kiwee.top} 数据协议 CC BY-NC-SA 4.0 "],
};
const DATA_DIR = path.resolve("data");

/** @param {string} dir */
function listJsonFiles (dir) {
	return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) return listJsonFiles(fullPath);
		return entry.isFile() && entry.name.endsWith(".json") ? [fullPath] : [];
	});
}

/**
 * Add the watermark to the top-level `entries` array of each object in every
 * top-level array (e.g. `item`, `spell`) in a JSON file.
 * @param {unknown} json
 */
function addWatermark (json, {isBestiary = false} = {}) {
	if (!json || typeof json !== "object" || Array.isArray(json)) return false;

	let isChanged = false;
	for (const [listName, list] of Object.entries(json)) {
		if (!Array.isArray(list)) continue;

		for (const entity of list) {
			if (!entity || typeof entity !== "object" || Array.isArray(entity)) continue;

			if (isBestiary && listName === "monster") {
				// `null` is meaningful source data; leave it untouched rather than
				// replacing it with an array just to attach the watermark.
				if (entity.action === null) continue;
				if (entity.action === undefined) entity.action = [];
				if (!Array.isArray(entity.action)) continue;
				const hasWatermark = entity.action.some(action =>
					action?.ENG_name === BESTIARY_WATERMARK.ENG_name
					&& action?.name === BESTIARY_WATERMARK.name
					&& Array.isArray(action?.entries)
					&& action.entries.includes(BESTIARY_WATERMARK.entries[0]),
				);
				if (!hasWatermark) {
					entity.action.push(structuredClone(BESTIARY_WATERMARK));
					isChanged = true;
				}
				continue;
			}

			if (!Array.isArray(entity.entries) || entity.entries.includes(WATERMARK)) continue;

			entity.entries.push(WATERMARK);
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
	if (!addWatermark(json, {isBestiary})) continue;

	const newline = original.includes("\r\n") ? "\r\n" : "\n";
	const serialized = JSON.stringify(json, null, getIndent(original)).replace(/\n/g, newline);
	fs.writeFileSync(file, `${serialized}${original.endsWith("\n") ? newline : ""}`, "utf8");
	changedFiles++;
}

console.log(`已为 ${changedFiles} 个 JSON 文件添加水印。`);
