function _getTextFromBlock (block) {
	if (!block) return "";
	if (block.type === "paragraph" || block.type === "heading" || block.type === "list_item") return block.text || "";
	if (block.type === "json") return JSON.stringify(block.json);
	if (block.type === "table") return JSON.stringify(block.rows || []);
	return "";
}

function _cleanText (text) {
	return `${text || ""}`.trim();
}

function _getRawTextFromBlocks (blocks) {
	return (blocks || [])
		.map(_getTextFromBlock)
		.filter(Boolean)
		.join("\n\n")
		.trim();
}

function _guessTitle ({document, rawText}) {
	const heading = document.blocks.find(it => it.type === "heading" && it.text?.trim());
	if (heading) return heading.text.trim();

	const firstParagraph = rawText.split(/\n+/).map(it => it.trim()).find(Boolean);
	return firstParagraph || "（未命名条目）";
}

function _sliceBlocksByRange (blocks, startBlockIndex, endBlockIndex) {
	if (!Array.isArray(blocks)) return [];
	if (startBlockIndex == null || endBlockIndex == null) return [];
	if (startBlockIndex < 0 || endBlockIndex < startBlockIndex) return [];

	return blocks.slice(startBlockIndex, endBlockIndex + 1);
}

function _toPlanEntity ({document, entity}) {
	const startBlockIndex = Number(entity.startBlock ?? entity.startBlockIndex);
	const endBlockIndex = Number(entity.endBlock ?? entity.endBlockIndex);

	if (!Number.isInteger(startBlockIndex) || !Number.isInteger(endBlockIndex)) return null;

	const blocks = _sliceBlocksByRange(document.blocks, startBlockIndex, endBlockIndex);
	const rawText = _getRawTextFromBlocks(blocks);
	if (!rawText) return null;

	return {
		kind: entity.kind || "unknown",
		role: entity.role || "embedded",
		title: entity.title || _cleanText(blocks.find(it => it?.type === "heading")?.text) || "（未命名条目）",
		blocks,
		raw_text: rawText,
		startBlockIndex,
		endBlockIndex,
		confidence: entity.confidence ?? null,
		notes: entity.notes || [],
		detection: {
			method: "codex-entity-plan",
			confidence: entity.confidence ?? "unknown",
		},
	};
}

function _normalizePlannedEntities ({document, entityPlan}) {
	const entities = entityPlan?.entities;
	if (!Array.isArray(entities) || !entities.length) return [];

	return entities
		.map(entity => _toPlanEntity({document, entity}))
		.filter(Boolean);
}

function _sliceSectionBlocks (blocks, headingIx) {
	const heading = blocks[headingIx];
	if (!heading || heading.type !== "heading") return [];

	const out = [heading];
	for (let i = headingIx + 1; i < blocks.length; i++) {
		const block = blocks[i];
		if (block?.type === "heading" && Number(block.level || 1) <= Number(heading.level || 1)) break;
		out.push(block);
	}

	return out;
}

function _countMonsterSignals (text) {
	const signals = [
		/(?:^|\n)\s*(?:护甲等级|Armor Class|AC)\b/u,
		/(?:^|\n)\s*(?:生命值|Hit Points|HP)\b/u,
		/(?:^|\n)\s*(?:速度|Speed)\b/u,
		/(?:力量|STR)\s*\d+.*(?:敏捷|DEX)\s*\d+.*(?:体质|CON)\s*\d+/us,
		/(?:智力|INT)\s*\d+.*(?:感知|WIS)\s*\d+.*(?:魅力|CHA)\s*\d+/us,
		/(?:^|\n)\s*STR\s*\n.*\n\s*DEX\s*\n.*\n\s*CON\s*\n.*\n\s*INT\s*\n.*\n\s*WIS\s*\n.*\n\s*CHA\b/us,
		/(?:^|\n)\s*(?:挑战等级|Challenge)\b/u,
		/(?:^|\n)\s*(?:熟练加值|Proficiency Bonus)\b/u,
		/(?:^|\n)\s*(?:感官|Senses)\b/u,
		/(?:^|\n)\s*(?:语言|Languages)\b/u,
	];

	return signals.reduce((acc, re) => acc + (re.test(text) ? 1 : 0), 0);
}

function _countSpellSignals (text) {
	const signals = [
		/(?:^|\n)\s*(?:施法时间|Casting Time)\b/u,
		/(?:^|\n)\s*(?:施法范围|施法距离|范围|距离|Range)\b/u,
		/(?:^|\n)\s*(?:法术成分|成分|Components?)\b/u,
		/(?:^|\n)\s*(?:持续时间|Duration)\b/u,
		/(?:^|\n)\s*(?:职业|施法职业|Classes?)\b/u,
		/(?:^|\n)\s*(?:\d+(?:st|nd|rd|th)?[- ]level|Level \d+|[一二三四五六七八九十\d]+\s?环|cantrip|戏法)\b/ui,
	];

	return signals.reduce((acc, re) => acc + (re.test(text) ? 1 : 0), 0);
}

function _countItemSignals (text) {
	const signals = [
		/(?:奇物|wondrous item)/ui,
		/(?:法杖|staff|魔杖|wand|卷轴|scroll|药水|potion|戒指|ring)/ui,
		/(?:普通|非普通|珍稀|极珍稀|传说|神器|common|uncommon|rare|very rare|legendary|artifact)/ui,
		/(?:需要?同调|requires attunement)/ui,
		/(?:子弹|弹药|ammunition|冒险装备|adventuring gear)/ui,
	];

	return signals.reduce((acc, re) => acc + (re.test(text) ? 1 : 0), 0);
}

function _isLikelyMonsterSection ({heading, text}) {
	if (!heading?.text || !text) return false;
	if (_cleanText(heading.text).length > 80) return false;

	return _countMonsterSignals(text) >= 5;
}

function _isLikelySpellSection ({heading, text}) {
	if (!heading?.text || !text) return false;
	if (_cleanText(heading.text).length > 120) return false;

	return _countSpellSignals(text) >= 4;
}

function _isLikelyItemSection ({heading, text}) {
	if (!heading?.text || !text) return false;
	if (_cleanText(heading.text).length > 120) return false;

	return _countItemSignals(text) >= 2;
}

function _detectEmbeddedMonsters ({document}) {
	const out = [];
	const blocks = document.blocks || [];

	for (let i = 0; i < blocks.length; i++) {
		const heading = blocks[i];
		if (heading?.type !== "heading") continue;

		const sectionBlocks = _sliceSectionBlocks(blocks, i);
		const rawText = _getRawTextFromBlocks(sectionBlocks);
		if (!_isLikelyMonsterSection({heading, text: rawText})) continue;

		out.push({
			kind: "monster",
			role: "embedded",
			detection: {
				method: "fallback-heading-statblock",
				confidence: "medium",
			},
			title: _cleanText(heading.text),
			blocks: sectionBlocks,
			raw_text: rawText,
			startBlockIndex: i,
			endBlockIndex: i + sectionBlocks.length - 1,
		});

		i += Math.max(sectionBlocks.length - 1, 0);
	}

	return out;
}

function _detectEmbeddedSpells ({document}) {
	const out = [];
	const blocks = document.blocks || [];

	for (let i = 0; i < blocks.length; i++) {
		const heading = blocks[i];
		if (heading?.type !== "heading") continue;

		const sectionBlocks = _sliceSectionBlocks(blocks, i);
		const rawText = _getRawTextFromBlocks(sectionBlocks);
		if (!_isLikelySpellSection({heading, text: rawText})) continue;

		out.push({
			kind: "spell",
			role: "embedded",
			detection: {
				method: "fallback-heading-spellblock",
				confidence: "medium",
			},
			title: _cleanText(heading.text),
			blocks: sectionBlocks,
			raw_text: rawText,
			startBlockIndex: i,
			endBlockIndex: i + sectionBlocks.length - 1,
		});

		i += Math.max(sectionBlocks.length - 1, 0);
	}

	return out;
}

function _detectEmbeddedItems ({document}) {
	const out = [];
	const blocks = document.blocks || [];

	for (let i = 0; i < blocks.length; i++) {
		const heading = blocks[i];
		if (heading?.type !== "heading") continue;

		const sectionBlocks = _sliceSectionBlocks(blocks, i);
		const rawText = _getRawTextFromBlocks(sectionBlocks);
		if (!_isLikelyItemSection({heading, text: rawText})) continue;

		out.push({
			kind: "item",
			role: "embedded",
			detection: {
				method: "fallback-heading-itemblock",
				confidence: "medium",
			},
			title: _cleanText(heading.text),
			blocks: sectionBlocks,
			raw_text: rawText,
			startBlockIndex: i,
			endBlockIndex: i + sectionBlocks.length - 1,
		});

		i += Math.max(sectionBlocks.length - 1, 0);
	}

	return out;
}

function _getPackedParagraphMonsterStarts (lines) {
	const out = [];
	for (let i = 0; i < lines.length - 3; i++) {
		if (!/HYPERLINK|[A-Za-z]/.test(lines[i])) continue;
		if (!/^(微型|小型|中型|大型|巨型|超巨型)\s/u.test(lines[i + 1] || "")) continue;
		if (!/^AC\s*\d+/iu.test(lines[i + 2] || "")) continue;
		if (!/^HP\s*\d+/iu.test(lines[i + 3] || "")) continue;
		out.push(i);
	}
	return out;
}

function _cleanHyperlinkLabel (line) {
	return `${line || ""}`
		.replace(/HYPERLINK\s+"[^"]*"\s+\\l\s+"[^"]*"\s+\\h\s*/g, "")
		.replace(/HYPERLINK\s+"[^"]*"\s*/g, "")
		.replace(/\\[a-z]\b/g, "")
		.trim();
}

function _getChineseTitlePart (line) {
	return _cleanHyperlinkLabel(line).replace(/[A-Z][A-Za-z0-9'’() .,\-:]+$/u, "").trim();
}

function _detectPackedMonstersInParagraph ({block, blockIndex}) {
	const lines = (block?.text || "").replace(/\r\n?/g, "\n").split("\n").map(it => it.trim()).filter(Boolean);
	const starts = _getPackedParagraphMonsterStarts(lines);
	if (!starts.length) return [];

	return starts.map((start, ix) => {
		const end = ix + 1 < starts.length ? Math.max(start, starts[ix + 1] - 2) : lines.length - 1;
		const preceding = lines[start - 1] || "";
		const title = preceding && !/[.:。]$/.test(preceding) && _cleanText(preceding).length <= 40
			? _cleanText(preceding)
			: _getChineseTitlePart(lines[start]) || "（未命名生物）";
		const rawText = lines.slice(start, end + 1).join("\n");

		return {
			kind: "monster",
			role: "embedded",
			detection: {
				method: "fallback-packed-paragraph-monster",
				confidence: "medium",
			},
			title,
			blocks: [{type: "paragraph", text: rawText}],
			raw_text: rawText,
			startBlockIndex: blockIndex,
			endBlockIndex: blockIndex,
		};
	});
}

function _detectPackedItemsInParagraph ({block, blockIndex}) {
	const lines = (block?.text || "").replace(/\r\n?/g, "\n").split("\n").map(it => it.trim()).filter(Boolean);
	if (lines.length < 3) return [];
	if (lines[0].length > 80 || /[。！？]/u.test(lines[0])) return [];
	if (!/^(?:奇物|武器|护甲|戒指|法杖|魔杖|卷轴|药水|弹药|冒险装备)\b|^(?:奇物|武器|护甲|戒指|法杖|魔杖|卷轴|药水|弹药|冒险装备)?\s*[,，]?\s*(?:普通|非普通|珍稀|极珍稀|传说|神器)(?:\s|[,，]|$)/u.test(lines[1] || "")) return [];

	return [{
		kind: "item",
		role: "embedded",
		detection: {
			method: "fallback-packed-paragraph-item",
			confidence: "medium",
		},
		title: _getChineseTitlePart(lines[0]) || lines[0],
		blocks: [block],
		raw_text: lines.join("\n"),
		startBlockIndex: blockIndex,
		endBlockIndex: blockIndex,
	}];
}

function _detectPackedParagraphEntities ({document}) {
	const out = [];
	const blocks = document.blocks || [];

	for (let i = 0; i < blocks.length; i++) {
		const block = blocks[i];
		if (block?.type !== "paragraph") continue;
		out.push(..._detectPackedMonstersInParagraph({block, blockIndex: i}));
		out.push(..._detectPackedItemsInParagraph({block, blockIndex: i}));
	}

	return out;
}

function _detectEmbeddableEntitiesFallback ({document}) {
	const monsters = _detectEmbeddedMonsters({document});
	const spells = _detectEmbeddedSpells({document});
	const items = _detectEmbeddedItems({document});
	const packed = _detectPackedParagraphEntities({document});

	const all = [...packed, ...monsters, ...spells, ...items];
	const seenRanges = new Set();
	const packedCoveredBlocks = new Set(packed.map(entity => entity.startBlockIndex));

	return all.filter(entity => {
		if (entity.detection?.method?.startsWith("fallback-heading") && (document.blocks || [])
			.slice(entity.startBlockIndex, entity.endBlockIndex + 1)
			.some((_block, ix) => packedCoveredBlocks.has(entity.startBlockIndex + ix))) return false;

		const key = `${entity.kind}:${entity.title}:${entity.startBlockIndex}:${entity.endBlockIndex}`;
		if (seenRanges.has(key)) return false;
		seenRanges.add(key);
		return true;
	});
}

function _toEmbeddedMeta (entity) {
	return {
		kind: entity.kind,
		role: entity.role,
		title: entity.title,
		startBlockIndex: entity.startBlockIndex,
		endBlockIndex: entity.endBlockIndex,
		detection: entity.detection,
	};
}

export function splitEntities (
	{
		document,
		defaultKind = "monster",
		includePrimaryDocument = true,
		entityPlan = null,
	} = {},
) {
	if (!document?.blocks?.length) return [];

	if (document.blocks.length === 1 && document.blocks[0].type === "json") {
		return [
			{
				kind: "json",
				role: "document",
				title: document.source_file || "（JSON 输入）",
				blocks: document.blocks,
				raw_text: JSON.stringify(document.blocks[0].json, null, "\t"),
			},
		];
	}

	const rawText = _getRawTextFromBlocks(document.blocks);
	if (!rawText) return [];

	const embeddedEntities = _normalizePlannedEntities({document, entityPlan});
	const finalEmbeddedEntities = embeddedEntities.length
		? embeddedEntities
		: _detectEmbeddableEntitiesFallback({document});
	const hasPlannedDocumentEntity = finalEmbeddedEntities.some(it => it.role === "document");

	const out = [];

	if (includePrimaryDocument && !hasPlannedDocumentEntity) {
		out.push({
			kind: defaultKind,
			role: "document",
			title: _guessTitle({document, rawText}),
			blocks: document.blocks,
			raw_text: rawText,
			embeddedEntitiesMeta: finalEmbeddedEntities.map(_toEmbeddedMeta),
			splittingStrategy: embeddedEntities.length ? "codex-plan" : "fallback-script",
		});
	}

	out.push(...finalEmbeddedEntities);
	return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	throw new Error(`此脚本是库封装。请从其他脚本导入并调用 splitEntities()。`);
}
