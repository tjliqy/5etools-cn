function _cleanText (text) {
	return `${text || ""}`.trim();
}

function _summarizeBlock (block, index) {
	const base = {
		index,
		type: block?.type || "unknown",
	};

	if (block?.type === "heading") {
		return {
			...base,
			level: Number(block.level || 1),
			text: _cleanText(block.text),
		};
	}

	if (block?.type === "paragraph" || block?.type === "list_item") {
		const text = _cleanText(block.text);
		return {
			...base,
			text,
			preview: text.slice(0, 220),
		};
	}

	if (block?.type === "table") {
		return {
			...base,
			rowCount: Array.isArray(block.rows) ? block.rows.length : 0,
			preview: JSON.stringify((block.rows || []).slice(0, 2)),
		};
	}

	return base;
}

function _getHeadingIndex (blocks) {
	return (blocks || [])
		.map((block, index) => ({block, index}))
		.filter(({block}) => block?.type === "heading")
		.map(({block, index}) => ({
			index,
			level: Number(block.level || 1),
			text: _cleanText(block.text),
		}));
}

const _SUPPORTED_REFERENCE_KINDS = [
	"monster",
	"spell",
	"item",
	"feat",
	"background",
	"language",
	"reward",
	"race",
	"deity",
	"subclass",
	"table",
];

export function prepareEntityBundle (
	{
		document,
		defaultDocumentKind = "adventureDocument",
		maxBlockPreviewChars = 220,
	} = {},
) {
	if (!document?.blocks?.length) throw new Error(`缺少 document.blocks`);

	const blocks = document.blocks.map((block, index) => {
		const summarized = _summarizeBlock(block, index);
		if (summarized.preview) summarized.preview = summarized.preview.slice(0, maxBlockPreviewChars);
		return summarized;
	});

	return {
		source_file: document.source_file || "",
		format: document.format || "",
		meta: document.meta || {},
		defaultDocumentKind,
		blockCount: document.blocks.length,
		headingIndex: _getHeadingIndex(document.blocks),
		blocks,
		supportedReferenceKinds: _SUPPORTED_REFERENCE_KINDS,
		instructions: [
			"Identify one primary document-level entity if present, such as an adventure or long-form rules text.",
			"Also identify any standalone embedded entities such as monster, spell, item, feat, background, language, reward, race, deity, subclass, or table, even if they appear in the middle of the document.",
			"Prefer conservative boundaries. Do not classify ordinary narrative subsections as standalone entities.",
			"Prefer marking entities as standalone only when the block contains converter-like structure or is clearly an independent rules/content block, not mere mentions in prose.",
			"Prefer these kind labels when possible: adventureDocument, monster, spell, item, feat, background, language, reward, race, deity, subclass, table, unknown.",
			"Return entity boundaries in block indexes using startBlock and endBlock.",
		],
		expectedPlanShape: {
			entities: [
				{
					kind: "adventureDocument|monster|spell|item|feat|background|language|reward|race|deity|subclass|table|unknown",
					title: "entity title",
					startBlock: 0,
					endBlock: 12,
					role: "document|embedded",
					confidence: 0.95,
					notes: ["optional notes"],
				},
			],
			notes: ["optional document-level notes"],
		},
	};
}

if (import.meta.url === `file://${process.argv[1]}`) {
	throw new Error(`此脚本是库封装。请从其他脚本导入并调用 prepareEntityBundle()。`);
}
