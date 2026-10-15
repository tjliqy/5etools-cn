/**
 * Generator script which creates stub per-entity pages for SEO.
 */

import fs from "fs";
import {execFileSync} from "child_process";
import "./locale/i18n.js";
import "../js/parser.js";
import "../js/utils.js";
import "../js/utils-dataloader.js";
import "../js/utils-config.js";
import "../js/render.js";
import "../js/render-dice.js";
import * as ut from "./util.js";
import {PAGE_GENERATORS} from "./generate-pages/generate-pages-page-generator-config.js";

const BASE_SITE_URL = `${(process.env.VET_BASE_SITE_URL || "https://5e.kiwee.top").replace(/\/+$/, "")}/`;
const LOG_EVERY = 1000; // Certain stakeholders prefer less logspam
const isSkipUaEtc = !!process.env.VET_SEO_IS_SKIP_UA_ETC;
const isOnlyVanilla = !!process.env.VET_SEO_IS_ONLY_VANILLA;
const BAIDU_TONGJI_ID = process.env.BAIDU_TONGJI_ID || null;

const templateHeadInner = fs.readFileSync("node/generate-pages/template/seo/template-seo-index-head-inner.hbs", "utf-8");
const templateBody = fs.readFileSync("node/generate-pages/template/seo/template-seo-index-body.hbs", "utf-8");

const lastModFallback = (() => {
	const date = new Date();
	return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
})();

const baseSitemapData = (() => {
	const out = {};

	PAGE_GENERATORS
		.map(it => it.getPage())
		.filter(Boolean)
		.filter(it => it !== "index.html")
		.filter(page => {
			const generator = PAGE_GENERATORS.find(it => it.getPage() === page);
			return generator && !generator.isExcludedFromSitemap();
		})
		.forEach(page => out[page] = true);

	return out;
})();

const _PATH_LAST_MOD_CACHE = new Map();
const _JSON_CACHE = new Map();

const _formatDate = (date) => `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;

const _readJson = (filePath) => {
	if (_JSON_CACHE.has(filePath)) return _JSON_CACHE.get(filePath);
	const json = JSON.parse(fs.readFileSync(filePath, "utf-8"));
	_JSON_CACHE.set(filePath, json);
	return json;
};

const _getLastModFromFs = (paths) => {
	const existingPaths = [...new Set(paths)].filter(path => fs.existsSync(path));
	if (!existingPaths.length) return lastModFallback;

	const latestMtime = existingPaths
		.map(path => fs.statSync(path).mtime)
		.sort((a, b) => b.getTime() - a.getTime())[0];

	return _formatDate(latestMtime);
};

const _getLastMod = (...paths) => {
	const cleanPaths = [...new Set(paths.flat().filter(Boolean))];
	if (!cleanPaths.length) return lastModFallback;

	const cacheKey = cleanPaths.join("::");
	if (_PATH_LAST_MOD_CACHE.has(cacheKey)) return _PATH_LAST_MOD_CACHE.get(cacheKey);

	let out = null;
	try {
		const gitDatesRaw = execFileSync("git", ["log", "--format=%ct", "--", ...cleanPaths], {
			cwd: process.cwd(),
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();

		if (gitDatesRaw) {
			const latestUnixTs = gitDatesRaw
				.split("\n")
				.map(it => Number(it.trim()))
				.filter(it => !Number.isNaN(it))
				.sort((a, b) => b - a)[0];

			if (latestUnixTs != null) out = _formatDate(new Date(latestUnixTs * 1000));
		}
	} catch (e) { /* noop */ }

	if (!out) out = _getLastModFromFs(cleanPaths);

	_PATH_LAST_MOD_CACHE.set(cacheKey, out);
	return out;
};

const _getMultiSourceSourceFiles = ({dir, source}) => {
	const index = _readJson(`data/${dir}/index.json`);
	const fluffIndexPath = `data/${dir}/fluff-index.json`;
	const out = [];

	if (index[source]) out.push(`data/${dir}/${index[source]}`);

	if (fs.existsSync(fluffIndexPath)) {
		const fluffIndex = _readJson(fluffIndexPath);
		if (fluffIndex[source]) out.push(`data/${dir}/${fluffIndex[source]}`);
	}

	return out;
};

const _getMetaDescription = (description) => {
	if (!description) return "";
	return Renderer.stripTags(description)
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 160);
};

const _getCleanPart = (part) => {
	if (!part) return null;

	const clean = Renderer.stripTags(`${part}`)
		.replace(/\s+/g, " ")
		.trim()
		.replace(/^[,;:，；：\s]+|[,;:，；：\s]+$/g, "");

	return clean || null;
};

const _joinDescriptionParts = (...parts) => _getMetaDescription(parts.map(_getCleanPart).filter(Boolean).join("；"));

const _getFallbackDescription = ({fluff, entries}) => getGenericDescription({fluff, entries});

const _getDescriptionSpells = ({entity: ent}) => _joinDescriptionParts(
	Parser.spLevelSchoolMetaToFull(ent.level, ent.school, ent.meta, ent.subschools),
	`施法时间 ${Parser.spTimeListToFull(ent.time)}`,
	`距离 ${Parser.spRangeToFull(ent.range)}`,
	`持续时间 ${Parser.spDurationToFull(ent.duration, {isPlainText: true})}`,
);

const _getDescriptionBestiary = ({entity: ent, fallbackDescription}) => {
	const typeText = Parser.monTypeToFullObj(ent.type).asText;
	const sizeText = Renderer.utils.getRenderedSize(ent.size);
	const alignmentText = ent.alignment?.length ? Parser.alignmentListToFull(ent.alignment) : null;
	const crText = ent.cr == null
		? null
		: typeof ent.cr === "string"
			? ent.cr
			: ent.cr.cr || ent.cr.special || ent.cr.xp || null;
	const speedText = ent.speed != null ? Parser.getSpeedString(ent, {isLongForm: true}) : null;

	return _joinDescriptionParts(
		[sizeText, typeText, alignmentText].filter(Boolean).join(" "),
		crText ? `挑战等级 ${crText}` : null,
		speedText ? `速度 ${speedText}` : null,
		fallbackDescription,
	);
};

const _getDescriptionItems = ({entity: ent, fallbackDescription}) => {
	const {typeRarityHtml, subTypeHtml, tierHtml} = Renderer.item.getTypeRarityAndAttunementHtmlParts(ent);
	const typeRarityText = Renderer.stripTags(
		Renderer.item.getTypeRarityAndAttunementHtml(
			{typeRarityHtml, subTypeHtml, tierHtml},
		),
	);
	const valueWeightText = [Parser.itemValueToFullMultiCurrency(ent), Parser.itemWeightToFull(ent)]
		.map(_getCleanPart)
		.filter(Boolean)
		.join("，");

	return _joinDescriptionParts(
		typeRarityText,
		valueWeightText,
		fallbackDescription,
	);
};

const _getDescriptionBackgrounds = ({entity: ent, fallbackDescription}) => {
	const skillText = ent._skillDisplay
		|| Renderer.generic.getSkillSummary({skillProfs: ent.skillProficiencies || [], isShort: true}).summary;

	return _joinDescriptionParts(
		"角色背景",
		skillText ? `技能 ${skillText}` : null,
		fallbackDescription,
	);
};

const _getDescriptionConditionsDiseases = ({entity: ent, fallbackDescription}) => _joinDescriptionParts(
	ent.type || Parser.getPropDisplayName(ent.__prop),
	fallbackDescription,
);

const _getDescriptionFeats = ({entity: ent, fallbackDescription}) => {
	const categoryText = ent.category ? Parser.featCategoryToFull(ent.category) : null;
	const prerequisiteText = Renderer.utils.prerequisite.getHtml(ent.prerequisite, {isListMode: false});

	return _joinDescriptionParts(
		categoryText ? `${categoryText}${["FS:P", "FS:R"].includes(ent.category) ? "" : "专长"}` : "专长",
		prerequisiteText ? `先决条件 ${prerequisiteText}` : null,
		fallbackDescription,
	);
};

const _getDescriptionRaces = ({entity: ent, fallbackDescription}) => {
	const sizeText = ent.size ? Renderer.utils.getRenderedSize(ent.size) : null;
	const speedText = ent.speed != null ? Parser.getSpeedString(ent, {isLongForm: true}) : null;

	return _joinDescriptionParts(
		"角色种族",
		sizeText ? `体型 ${sizeText}` : null,
		speedText ? `速度 ${speedText}` : null,
		fallbackDescription,
	);
};

const _DESCRIPTION_GETTERS = {
	spells: _getDescriptionSpells,
	bestiary: _getDescriptionBestiary,
	items: _getDescriptionItems,
	backgrounds: _getDescriptionBackgrounds,
	conditionsdiseases: _getDescriptionConditionsDiseases,
	feats: _getDescriptionFeats,
	races: _getDescriptionRaces,
};

const _getTemplateHeadInner = ({titleFull, metaDescription, canonicalUrl, img, jsonLd}) => {
	const ogImageMeta = img ? `<meta property="og:image" content="${new URL(img, BASE_SITE_URL).href}">` : "";
	const twitterCard = img ? "summary_large_image" : "summary";

	return templateHeadInner
		.replace(/\{\{#if baiduTongjiId\}\}([\s\S]*?)\{\{\/if\}\}/g, BAIDU_TONGJI_ID ? "$1" : "")
		.replace(/\{\{baiduTongjiId\}\}/g, BAIDU_TONGJI_ID || "")
		.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${metaDescription.qq()}">`)
		.replace(/<title>[\s\S]*?<\/title>/, `<title>${titleFull}</title>`)
		.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${canonicalUrl}">`)
		.replace("<meta property=\"og:type\" content=\"website\">", "<meta property=\"og:type\" content=\"article\">")
		.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${titleFull}">`)
		.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${metaDescription.qq()}">`)
		.replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${canonicalUrl}">`)
		.replace(/<meta name="twitter:card" content="[^"]*">/, `<meta name="twitter:card" content="${twitterCard}">`)
		.replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${titleFull}">`)
		.replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${metaDescription.qq()}">`)
		.replace("{{{jsonLd}}}", jsonLd)
		.replace("<link rel=\"stylesheet\" href=\"/css/bootstrap.css\">", `${ogImageMeta}\n<link rel="stylesheet" href="/css/bootstrap.css">`);
};

const _getJsonLd = ({page, name, canonicalUrl, metaDescription, img, listUrl}) => {
	const imageUrl = img ? new URL(img, BASE_SITE_URL).href : null;

	const graph = [
		{
			"@type": "Article",
			headline: name,
			name: `${name} - 5etools`,
			description: metaDescription,
			url: canonicalUrl,
			inLanguage: "zh-CN",
			isPartOf: {
				"@type": "WebSite",
				name: "5etools",
				url: BASE_SITE_URL,
			},
			mainEntity: {
				"@type": "DefinedTerm",
				name,
				description: metaDescription,
				url: canonicalUrl,
				inDefinedTermSet: listUrl,
			},
			...(imageUrl ? {image: imageUrl} : {}),
		},
		{
			"@type": "BreadcrumbList",
			itemListElement: [
				{
					"@type": "ListItem",
					position: 1,
					name: "首页",
					item: BASE_SITE_URL,
				},
				{
					"@type": "ListItem",
					position: 2,
					name: UrlUtil.PG_TO_NAME[`${page}.html`] || page.toTitleCase(),
					item: listUrl,
				},
				{
					"@type": "ListItem",
					position: 3,
					name,
					item: canonicalUrl,
				},
			],
		},
	];

	return `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@graph": graph,
	}).replace(/<\/script/gi, "<\\/script")}</script>`;
};

const getTemplate = ({page, name, source, hash, img, description, isFluff, path}) => {
	const metaDescription = _getMetaDescription(description);
	const canonicalUrl = `${BASE_SITE_URL}${path}`;
	const listUrl = `${BASE_SITE_URL}${page}.html`;
	const titleFull = `${name.qq()} - 5etools`;
	const jsonLd = _getJsonLd({page, name, canonicalUrl, metaDescription, img, listUrl});
	const templateHead = _getTemplateHeadInner({titleFull, metaDescription, canonicalUrl, img, jsonLd});

	return `<!DOCTYPE html><head>
${templateHead}
<script>globalThis._SEO_PAGE="${page}";globalThis._SEO_SOURCE="${source}";globalThis._SEO_HASH="${hash}";globalThis._SEO_FLUFF=${isFluff};globalThis._SEO_CANONICAL_URL="${canonicalUrl}";globalThis._SEO_LIST_URL="${listUrl}"</script>
</head>
${templateBody}
</html>`;
};

const filterSkipUaEtc = (ent) => !isSkipUaEtc || !SourceUtil.isNonstandardSourceWotc(SourceUtil.getEntitySource(ent));

const filterOnlyVanilla = (ent) => !isOnlyVanilla || Parser.SOURCES_VANILLA.has(SourceUtil.getEntitySource(ent));

const _DESCRIPTION_WALKER = MiscUtil.getWalker({isNoModification: true, isBreakOnReturn: true, keyBlocklist: MiscUtil.GENERIC_WALKER_ENTRIES_KEY_BLOCKLIST});

const getGenericDescription = ({fluff, entries}) => {
	// Prefer fluff, where provided
	const entriesAvailable = fluff?.entries || entries;
	if (!entriesAvailable?.length) return null;

	if (typeof entriesAvailable[0] === "string") return Renderer.stripTags(entriesAvailable[0]);

	let strPrime;
	_DESCRIPTION_WALKER.walk(entriesAvailable, {string: str => {
		strPrime = str;
		return true;
	}});
	if (!strPrime) return null;

	return Renderer.stripTags(strPrime);
};

const _getEntityDescription = ({page, entity, fluff, entries}) => {
	const fallbackDescription = _getFallbackDescription({fluff, entries});
	const fnGetDescription = _DESCRIPTION_GETTERS[page];
	if (!fnGetDescription) return fallbackDescription;
	return fnGetDescription({entity, fluff, entries, fallbackDescription}) || fallbackDescription;
};

const toGenerate = [
	{
		page: "spells",
		pGetEntityMetas: async () => {
			const entities = (await DataUtil.spell.pLoadAll())
				.filter(filterSkipUaEtc)
				.filter(filterOnlyVanilla);
			return entities.pSerialAwaitMap(async ent => ({
				entity: ent,
				fluff: await Renderer.spell.pGetFluff(ent),
				description: _getEntityDescription({page: "spells", entity: ent, entries: ent.entries}),
				sourceFiles: _getMultiSourceSourceFiles({dir: "spells", source: ent.source}),
			}));
		},
		isFluff: 1,
	},
	{
		page: "bestiary",
		pGetEntityMetas: async () => {
			const entities = (await DataUtil.monster.pLoadAll())
				.filter(filterSkipUaEtc)
				.filter(filterOnlyVanilla);
			return entities.pSerialAwaitMap(async ent => {
				const fluff = await Renderer.monster.pGetFluff(ent);
					return {
						entity: ent,
						fluff,
						img: Renderer.monster.hasToken(ent) ? Renderer.monster.getTokenUrl(ent) : null,
						description: _getEntityDescription({page: "bestiary", entity: ent, fluff, entries: ent.entries}),
						sourceFiles: _getMultiSourceSourceFiles({dir: "bestiary", source: ent.source}),
					};
				});
			},
		isFluff: 1,
	},
	{
		page: "items",
		pGetEntityMetas: async () => {
			const entities = (await Renderer.item.pBuildList()).filter(it => !it._isItemGroup)
				.filter(filterSkipUaEtc)
				.filter(filterOnlyVanilla);
			return entities.pSerialAwaitMap(async ent => {
				const fluff = await Renderer.item.pGetFluff(ent);
				return {
					entity: ent,
					fluff,
					description: _getEntityDescription({page: "items", entity: ent, fluff, entries: ent._fullEntries || ent.entries}),
					sourceFiles: ["data/items.json", "data/items-base.json", "data/magicvariants.json", "data/fluff-items.json"],
				};
			});
		},
		isFluff: 1,
	},
	{
		page: "backgrounds",
		pGetEntityMetas: async () => {
			const entities = ((await DataUtil.background.loadJSON()).background || [])
				.filter(filterSkipUaEtc)
				.filter(filterOnlyVanilla);
			return entities.pSerialAwaitMap(async ent => {
				const fluff = await Renderer.background.pGetFluff(ent);
				return {
					entity: ent,
					fluff,
					description: _getEntityDescription({page: "backgrounds", entity: ent, fluff, entries: ent.entries}),
					sourceFiles: ["data/backgrounds.json", "data/fluff-backgrounds.json"],
				};
			});
		},
		isFluff: 1,
	},
	{
		page: "conditionsdiseases",
		pGetEntityMetas: async () => {
			const data = await DataUtil.loadJSON("data/conditionsdiseases.json");
			const entities = [
				...(data.condition || []).map(ent => ({...ent, __prop: "condition"})),
				...(data.disease || []).map(ent => ({...ent, __prop: "disease"})),
				...(data.status || []).map(ent => ({...ent, __prop: "status"})),
			]
				.filter(filterSkipUaEtc)
				.filter(filterOnlyVanilla);

			return entities.pSerialAwaitMap(async ent => {
				const fluff = await Renderer.conditionDisease.pGetFluff(ent);
				return {
					entity: ent,
					fluff,
					description: _getEntityDescription({page: "conditionsdiseases", entity: ent, fluff, entries: ent.entries}),
					sourceFiles: ["data/conditionsdiseases.json", "data/fluff-conditionsdiseases.json"],
				};
			});
		},
		isFluff: 1,
	},
	{
		page: "feats",
		pGetEntityMetas: async () => {
			const entities = ((await DataUtil.feat.loadJSON()).feat || [])
				.filter(filterSkipUaEtc)
				.filter(filterOnlyVanilla);
			return entities.pSerialAwaitMap(async ent => {
				Renderer.feat.initFullEntries(ent);
				return {
					entity: ent,
					fluff: await Renderer.feat.pGetFluff(ent),
					description: _getEntityDescription({page: "feats", entity: ent, entries: ent._fullEntries || ent.entries}),
					sourceFiles: ["data/feats.json", "data/fluff-feats.json"],
				};
			});
		},
		isFluff: 1,
	},
	{
		page: "races",
		pGetEntityMetas: async () => {
			const entities = ((await DataUtil.race.loadJSON({isAddBaseRaces: true})).race || [])
				.filter(filterSkipUaEtc)
				.filter(filterOnlyVanilla);
			return entities.pSerialAwaitMap(async ent => {
				const fluff = await Renderer.race.pGetFluff(ent);
				return {
					entity: ent,
					fluff,
					description: _getEntityDescription({page: "races", entity: ent, fluff, entries: ent.entries}),
					sourceFiles: ["data/races.json", "data/fluff-races.json"],
				};
			});
		},
		isFluff: 1,
	},

	// TODO expand this as required
];

const siteMapData = {};

async function main () {
	ut.patchLoadJson();

	let total = 0;
	console.log(`正在生成搜索引擎页面…`);
	await Promise.all(toGenerate.map(async meta => {
		try {
			fs.mkdirSync(`./${meta.page}`, { recursive: true });
		} catch (err) {
			if (err.code !== "EEXIST") throw err;
		}

		const entityMetas = await meta.pGetEntityMetas();
		const builder = UrlUtil.URL_TO_HASH_BUILDER[`${meta.page}.html`];
		entityMetas.forEach(({entity, fluff, img, description, sourceFiles}) => {
			let offset = 0;
			let html;
			let path;
			while (true) {
				const hash = builder(entity);
				const sluggedHash = UrlUtil.getSluggedHash(hash);
				path = `${meta.page}/${sluggedHash}${offset ? `-${offset}` : ""}.html`;
				if (siteMapData[path]) {
					++offset;
					continue;
				}

				if (!img && fluff?.images?.length) {
					img = Renderer.utils.getEntryMediaUrl(fluff.images[0], "href", "img");
				}

				html = getTemplate({
					page: meta.page,
					name: entity.name,
					source: entity.source,
					hash,
					img,
					description,
					textStyle: meta.style,
					isFluff: meta.isFluff,
					path,
				});

				siteMapData[path] = {
					lastMod: _getLastMod(sourceFiles),
				};
				break;
			}

			if (offset > 0) console.warn(`\t已使用后缀消除重复 URL：${path}`);

			fs.writeFileSync(`./${path}`, html, "utf-8");

			total++;
			if (total % LOG_EVERY === 0) console.log(`已写入 ${total} 个文件…`);
		});
	}));
	console.log(`已写入 ${total} 个文件。`);

	let sitemapLinkCount = 0;
	let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
	sitemap += `<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">\n`;

	sitemap += `<url>
	<loc>${BASE_SITE_URL}</loc>
	<lastmod>${_getLastMod("index.html")}</lastmod>
	<changefreq>monthly</changefreq>
</url>\n`;
	sitemapLinkCount++;

	Object.keys(baseSitemapData).forEach(url => {
		sitemap += `<url>
	<loc>${BASE_SITE_URL}${url}</loc>
	<lastmod>${_getLastMod(url)}</lastmod>
	<changefreq>monthly</changefreq>
</url>\n`;
		sitemapLinkCount++;
	});

	Object.keys(siteMapData).forEach(url => {
		sitemap += `<url>
	<loc>${BASE_SITE_URL}${url}</loc>
	<lastmod>${siteMapData[url].lastMod}</lastmod>
	<changefreq>weekly</changefreq>
</url>\n`;
		sitemapLinkCount++;
	});

	sitemap += `</urlset>\n`;

	fs.writeFileSync("./sitemap.xml", sitemap, "utf-8");
	console.log(`已向 sitemap.xml 写入 ${sitemapLinkCount.toLocaleStringVe()} 个 URL`);

	ut.unpatchLoadJson();
}

main().then(() => console.log(`SEO page generation complete.`)).catch(e => console.error(e));
