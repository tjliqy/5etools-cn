import fs from "fs";
import vm from "vm";
import path from "path";
import {fileURLToPath} from "url";
import {Command, Option} from "commander";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(repoRoot);

const program = new Command()
	.name("search-entities")
	.description("Search the site's global entity index and print each result's JSON source file.")
	.argument("<query...>", "Search text; supports the site's in:, source:, and page: filters")
	.addOption(new Option("-l, --limit <number>", "Maximum number of results").default(20).argParser(Number))
	.option("--json", "Output machine-readable JSON")
	.option("--files-only", "Print unique JSON source file paths only")
;

program.parse();
const params = program.opts();
const query = program.args.join(" ").trim();

if (!Number.isInteger(params.limit) || params.limit < 1) program.error("--limit must be a positive integer");

const loadBrowserLibrary = (file) => vm.runInThisContext(fs.readFileSync(file, "utf8"), {filename: file});

loadBrowserLibrary("lib/elasticlunr.js");
loadBrowserLibrary("lib/lunr.min.js");
loadBrowserLibrary("lib/tinyseg.js");
loadBrowserLibrary("lib/lunr.stemmer.support.min.js");
loadBrowserLibrary("lib/lunr.zh.min.js");

await import("./locale/i18n.js");
await import("../js/parser.js");
await import("../js/utils.js");
await import("../js/utils-ui.js");
await import("../js/utils-config.js");
await import("../js/render.js");
await import("../js/render-dice.js");
await import("../js/hist.js");
await import("../js/filter.js");
await import("../js/utils-brew.js");
await import("../js/omnidexer.js");

const {UtilSearchIndex} = await import("./util-search-index.js");

const indexGroup = await UtilSearchIndex.pGetIndex({doLogging: false, isIncludeSourceFile: true});
const docs = Omnidexer.decompressIndex(indexGroup);

const englishJsonCache = new Map();
const getEnglishEntity = (doc) => {
	const englishFile = doc.f.replace(/^data\//, "data-bak/");
	if (!fs.existsSync(englishFile)) return {englishFile, json_obj: null};

	if (!englishJsonCache.has(englishFile)) englishJsonCache.set(englishFile, JSON.parse(fs.readFileSync(englishFile, "utf8")));
	const locator = doc._entityLocator;
	const englishJson = englishJsonCache.get(englishFile);
	const entities = locator ? Omnidexer.getProperty(englishJson, locator.prop) : null;
	const isMatch = ent => ent?.name === locator.name && (locator.source == null || ent.source === locator.source);
	const sourcePageMatches = entities?.filter(ent => ent.source === locator.source && ent.page === locator.page) || [];
	const json_obj = entities?.find(isMatch)
		|| Object.values(englishJson).filter(Array.isArray).flat().find(isMatch)
		|| (entities?.length === locator.count ? entities[locator.ix] : null)
		|| sourcePageMatches[locator.ixSourcePage]
		|| null;
	return {englishFile, json_obj};
};

elasticlunr.clearStopWords();
elasticlunr.utils.warn = () => {};
const searchIndex = elasticlunr(function () {
	this.use(lunr.zh);
	this.addField("n");
	this.addField("cn");
	this.addField("sA");
	this.setRef("id");
});
SearchUtil.removeStemmer(searchIndex);

docs.forEach(doc => {
	doc.cf = Parser.pageCategoryToFull(doc.c);
	doc.sA ||= doc.s ? Parser.sourceJsonToAbv(doc.s) : null;
	searchIndex.addDoc(doc);
});

const categoryAliases = {
	creature: [Parser.CAT_ID_CREATURE],
	monster: [Parser.CAT_ID_CREATURE],
	spell: [Parser.CAT_ID_SPELL],
	item: [Parser.CAT_ID_ITEM],
	background: [Parser.CAT_ID_BACKGROUND],
	feat: [Parser.CAT_ID_FEAT],
	class: [Parser.CAT_ID_CLASS],
	subclass: [Parser.CAT_ID_SUBCLASS],
	condition: [Parser.CAT_ID_CONDITION],
	book: [Parser.CAT_ID_BOOK],
	adventure: [Parser.CAT_ID_ADVENTURE],
	mon: [Parser.CAT_ID_CREATURE],
	sp: [Parser.CAT_ID_SPELL],
	itm: [Parser.CAT_ID_ITEM],
	bg: [Parser.CAT_ID_BACKGROUND],
	ft: [Parser.CAT_ID_FEAT],
	bk: [Parser.CAT_ID_BOOK],
	adv: [Parser.CAT_ID_ADVENTURE],
};

const filters = {categories: [], sources: [], pages: []};
const searchTerm = query
	.replace(/\bsource:\s*(!)?([^\s]+)/ig, (...match) => {
		filters.sources.push({isNegate: !!match[1], value: match[2].toLowerCase()});
		return "";
	})
	.replace(/\bpage:\s*(!)?(\d+)\s*(?:-\s*(\d+))?/ig, (...match) => {
		filters.pages.push({isNegate: !!match[1], min: Number(match[2]), max: Number(match[3] || match[2])});
		return "";
	})
	.replace(/\bin:\s*(!)?([^\s]+)/ig, (...match) => {
		filters.categories.push({isNegate: !!match[1], value: match[2].toLowerCase()});
		return "";
	})
	.replace(/\s+/g, " ")
	.trim()
	.toAscii();

const isMatchingGroup = (metas, fnIsMatch) => {
	const positive = metas.filter(({isNegate}) => !isNegate);
	const negative = metas.filter(({isNegate}) => isNegate);
	return (!positive.length || positive.some(fnIsMatch)) && !negative.some(fnIsMatch);
};

const isMatchingFilter = (doc) => {
	if (!isMatchingGroup(filters.sources, ({value}) => [doc.s, doc.sA].filter(Boolean).some(it => it.toLowerCase() === value))) return false;

	if (!isMatchingGroup(filters.pages, ({min, max}) => doc.p != null && doc.p >= min && doc.p <= max)) return false;

	if (!isMatchingGroup(filters.categories, ({value}) => {
		const ids = categoryAliases[value];
		return ids ? ids.includes(doc.c) : doc.cf.toLowerCase() === value.replace(/s$/, "");
	})) return false;

	return true;
};

let results = searchTerm
	? searchIndex.search(searchTerm, {
		fields: {
			n: {boost: 5, expand: true},
			cn: {boost: 5, expand: true},
			sA: {expand: true},
		},
		bool: "AND",
		expand: true,
	})
	: docs.map(doc => ({doc, score: 0}));

if (searchTerm && /\p{Script=Han}/u.test(searchTerm)) {
	const byId = new Map(results.map(result => [result.doc.id, result]));
	docs
		.filter(doc => doc.cn?.includes(searchTerm) || doc.n?.includes(searchTerm))
		.forEach(doc => {
			if (!byId.has(doc.id)) byId.set(doc.id, {doc, score: 0.65});
		});
	results = [...byId.values()].sort((a, b) => b.score - a.score);
}

const output = results
	.filter(({doc}) => doc.f && isMatchingFilter(doc))
	.slice(0, params.limit)
	.map(({doc, score}) => {
		const {englishFile, json_obj} = getEnglishEntity(doc);
		return {
			name: doc.cn || doc.n,
			englishName: doc.n !== doc.cn ? doc.n : undefined,
			category: doc.cf,
			source: doc.s,
			page: doc.p,
			file: doc.f,
			englishFile,
			json_obj,
			score,
		};
	});

if (!output.length) {
	console.error(`No matching entities found for "${query}".`);
	process.exitCode = 1;
} else if (params.filesOnly) {
	console.log([...new Set(output.flatMap(it => [it.file, it.englishFile]))].join("\n"));
} else if (params.json) {
	console.log(JSON.stringify(output, null, "\t"));
} else {
	console.table(output.map(({score, json_obj, ...rest}) => rest));
}
