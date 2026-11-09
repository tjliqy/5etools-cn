import fs from "fs";
import path from "path";
import "./locale/i18n.js";
import "../js/parser.js";
import "../js/utils.js";
import "../js/render.js";

const getJsonFiles = (dir) => fs.readdirSync(dir, {withFileTypes: true})
	.flatMap(it => {
		const filePath = path.join(dir, it.name);
		if (it.isDirectory()) return ["adventure", "book", "generated"].includes(it.name) ? [] : getJsonFiles(filePath);
		return it.isFile() && filePath.endsWith(".json") ? [filePath] : [];
	});

const files = getJsonFiles("data");
const jsons = files.map(file => ({file, json: JSON.parse(fs.readFileSync(file, "utf8"))}));

const translatorsBySource = new Map();

for (const {file, json} of jsons) {
	if (file !== "data/adventures.json" && file !== "data/books.json") continue;
	const prop = file === "data/adventures.json" ? "adventure" : "book";
	for (const entity of json[prop]) {
		if (!entity.source || !entity.translator || entity.translator === "机翻") continue;
		translatorsBySource.set(entity.source, entity.translator);
	}
}

const syncEntity = (entity) => {
	if (!entity || typeof entity !== "object") return false;
	let isModified = false;

	if (typeof entity.source === "string" && typeof entity.name === "string") {
		const translator = translatorsBySource.get(entity.source);
		if (translator && (!entity.translator || entity.translator === "机翻") && entity.translator !== translator) {
			entity.translator = translator;
			isModified = true;
		}
	}

	for (const value of Object.values(entity)) {
		if (Array.isArray(value)) {
			for (const child of value) isModified = syncEntity(child) || isModified;
		} else if (value && typeof value === "object") {
			isModified = syncEntity(value) || isModified;
		}
	}

	return isModified;
};

for (const {file, json} of jsons) {
	let isModified = false;
	isModified = syncEntity(json);

	if (!isModified) continue;

	fs.writeFileSync(file, CleanUtil.getCleanJson(json), "utf8");
	console.log(`已同步 ${file} 中的译者信息。`);
}
