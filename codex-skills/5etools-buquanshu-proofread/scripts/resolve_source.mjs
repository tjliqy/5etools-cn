#!/usr/bin/env node

import fs from "fs";
import path from "path";
import vm from "vm";
import {fileURLToPath} from "url";

const skillDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(skillDir, "../..");
const input = process.argv.slice(2).join(" ").trim();

if (!input) {
	console.error("Usage: node resolve_source.mjs <buquanshu-folder>");
	process.exit(2);
}

const target = path.resolve(input);
if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
	console.error(`Not a readable directory: ${target}`);
	process.exit(2);
}

process.chdir(repoRoot);
const load = file => vm.runInThisContext(fs.readFileSync(file, "utf8"), {filename: file});
await import(path.join(repoRoot, "node/locale/i18n.js"));
load("js/parser.js");

const normalize = value => value
	.normalize("NFKC")
	.toLowerCase()
	.replace(/[\s:_：·•—–\-（）()《》【】\[\]]+/g, "")
	.replace(/[，。！？、；;,.!?]/g, "");

const basename = path.basename(target.replace(/[\\/]+$/, ""));
const normalizedName = normalize(basename);
const entries = Object.entries(Parser.SOURCE_JSON_TO_FULL)
	.map(([source, full]) => ({source, full, normalized: normalize(full)}));

let matchKind = "none";
let matches = entries.filter(it => it.full === basename);
if (matches.length) matchKind = "exact";
if (!matches.length) {
	matches = entries.filter(it => it.normalized === normalizedName);
	if (matches.length) matchKind = "normalized";
}
if (!matches.length) {
	matches = entries.filter(it => normalizedName.includes(it.normalized) || it.normalized.includes(normalizedName));
	if (matches.length) matchKind = "contains";
}

const payload = {
	input: target,
	basename,
	normalizedName,
	matchKind,
	matches: matches.map(({source, full}) => ({source, full})),
};
process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
process.exit(matches.length === 1 && ["exact", "normalized"].includes(matchKind) ? 0 : 1);
