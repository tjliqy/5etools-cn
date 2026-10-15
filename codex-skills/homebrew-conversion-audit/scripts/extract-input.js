import fs from "fs/promises";
import path from "path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";

const _TEXTUAL_FORMATS = new Set(["raw", "txt", "text", "md", "markdown", "json"]);
const _RICH_FORMATS = new Set(["doc", "docx", "pdf"]);
const _pExecFile = promisify(execFile);

export function detectFormat ({inputPath = null, formatHint = null} = {}) {
	if (formatHint) return formatHint.toLowerCase();
	if (!inputPath) return "raw";

	const ext = path.extname(inputPath).toLowerCase().replace(/^\./, "");
	if (!ext) return "raw";
	if (ext === "txt") return "raw";
	return ext;
}

export async function extractInput (
	{
		inputPath = null,
		formatHint = null,
		rawText = null,
	},
) {
	const format = detectFormat({inputPath, formatHint});

	if (rawText != null) return _extractFromString({rawText, format, inputPath});

	if (!inputPath) throw new Error(`需要“inputPath”或“rawText”`);

	if (_TEXTUAL_FORMATS.has(format)) {
		const text = await fs.readFile(inputPath, "utf8");
		return _extractFromString({rawText: text, format, inputPath});
	}

	if (_RICH_FORMATS.has(format)) {
		return _extractRich({inputPath, format});
	}

	throw new Error(`不支持的输入格式："${format}"`);
}

async function _extractRich ({inputPath, format}) {
	switch (format) {
		case "docx": return _extractDocx({inputPath, format});
		case "doc": throw new Error(`尚未实现 DOC 提取。请先将文件转为 DOCX 或纯文本。`);
		case "pdf": throw new Error(`当前环境未实现 PDF 提取。请安装 PDF 文本提取工具，或先将文件转为纯文本／DOCX。`);
		default: throw new Error(`不支持的富文本输入格式："${format}"`);
	}
}

function _extractFromString ({rawText, format, inputPath}) {
	switch (format) {
		case "raw":
		case "txt":
		case "text": return _extractText({rawText, format: "raw", inputPath});
		case "md":
		case "markdown": return _extractMarkdown({rawText, format: "md", inputPath});
		case "json": return _extractJson({rawText, format: "json", inputPath});
		default: return _extractText({rawText, format, inputPath});
	}
}

function _extractText ({rawText, format, inputPath}) {
	const paragraphs = rawText
		.replace(/\r\n?/g, "\n")
		.split(/\n\s*\n/g)
		.map(it => it.trim())
		.filter(Boolean);

	return {
		source_file: inputPath || null,
		format,
		blocks: paragraphs.map(text => ({type: "paragraph", text})),
		meta: {
			extract_quality: "high",
			block_count: paragraphs.length,
		},
	};
}

function _extractMarkdown ({rawText, format, inputPath}) {
	const lines = rawText.replace(/\r\n?/g, "\n").split("\n");
	const blocks = [];
	let buffer = [];

	const flush = () => {
		if (!buffer.length) return;
		blocks.push({type: "paragraph", text: buffer.join("\n").trim()});
		buffer = [];
	};

	for (const line of lines) {
		if (!line.trim()) {
			flush();
			continue;
		}

		const mHeading = /^(?<hashes>#{1,6})\s+(?<text>.+)$/.exec(line);
		if (mHeading) {
			flush();
			blocks.push({type: "heading", level: mHeading.groups.hashes.length, text: mHeading.groups.text.trim()});
			continue;
		}

		if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
			flush();
			blocks.push({type: "list_item", text: line.trim()});
			continue;
		}

		buffer.push(line);
	}

	flush();

	return {
		source_file: inputPath || null,
		format,
		blocks,
		meta: {
			extract_quality: "high",
			block_count: blocks.length,
		},
	};
}

function _extractJson ({rawText, format, inputPath}) {
	const parsed = JSON.parse(rawText);

	return {
		source_file: inputPath || null,
		format,
		blocks: [{type: "json", json: parsed}],
		meta: {
			extract_quality: "high",
			block_count: 1,
		},
	};
}

async function _extractDocx ({inputPath, format}) {
	const {stdout: documentXml} = await _pExecFile("unzip", ["-p", inputPath, "word/document.xml"], {maxBuffer: 10_000_000});
	const stylesXml = await _pTryReadZipEntry({inputPath, zipEntry: "word/styles.xml"});

	if (!documentXml?.trim()) throw new Error(`无法从 DOCX 提取 document.xml："${inputPath}"`);

	const styleMap = _parseDocxStyles(stylesXml || "");
	const blocks = _parseDocxDocument({documentXml, styleMap});
	const blocksProcessed = _postProcessDocxBlocks(blocks);

	return {
		source_file: inputPath || null,
		format,
		blocks: blocksProcessed,
		meta: {
			extract_quality: blocksProcessed.length ? "medium" : "low",
			block_count: blocksProcessed.length,
		},
	};
}

async function _pTryReadZipEntry ({inputPath, zipEntry}) {
	try {
		const {stdout} = await _pExecFile("unzip", ["-p", inputPath, zipEntry], {maxBuffer: 10_000_000});
		return stdout;
	} catch {
		return null;
	}
}

function _parseDocxStyles (stylesXml) {
	const out = new Map();
	if (!stylesXml?.trim()) return out;

	const reStyle = /<w:style\b[^>]*w:styleId="(?<styleId>[^"]+)"[^>]*>(?<body>[\s\S]*?)<\/w:style>/g;
	for (const m of stylesXml.matchAll(reStyle)) {
		const {styleId, body} = m.groups;
		const name = /<w:name\b[^>]*w:val="(?<name>[^"]+)"/.exec(body)?.groups?.name || styleId;
		out.set(styleId, name);
	}

	return out;
}

function _parseDocxDocument ({documentXml, styleMap}) {
	const blocks = [];
	const reParagraph = /<w:p\b[\s\S]*?<\/w:p>/g;

	for (const paragraphXml of documentXml.match(reParagraph) || []) {
		const block = _parseDocxParagraph({paragraphXml, styleMap});
		if (!block) continue;
		blocks.push(block);
	}

	return _coalesceDocxParagraphs(blocks);
}

function _parseDocxParagraph ({paragraphXml, styleMap}) {
	const styleId = /<w:pStyle\b[^>]*w:val="(?<styleId>[^"]+)"/.exec(paragraphXml)?.groups?.styleId || null;
	const styleName = styleId ? (styleMap.get(styleId) || styleId) : null;
	const hasNumPr = /<w:numPr\b/.test(paragraphXml);
	const hasPageBreak = /<w:br\b[^>]*w:type="page"/.test(paragraphXml);
	const headingLevel = _getHeadingLevel({styleId, styleName});
	const text = _getDocxParagraphText(paragraphXml).trim();

	if (!text && hasPageBreak) return {type: "page_break"};
	if (!text) return null;

	if (headingLevel != null) return {type: "heading", level: headingLevel, text};
	if (hasNumPr) return {type: "list_item", text};
	return {type: "paragraph", text};
}

function _getHeadingLevel ({styleId, styleName}) {
	const match = `${styleId || ""} ${styleName || ""}`.match(/heading\s*(?<level>\d)/i);
	if (!match?.groups?.level) return null;
	return Number(match.groups.level);
}

function _getDocxParagraphText (paragraphXml) {
	let text = paragraphXml;

	text = text
		.replace(/<w:tab\b[^>]*\/>/g, "\t")
		.replace(/<w:br\b[^>]*\/>/g, "\n")
		.replace(/<w:cr\b[^>]*\/>/g, "\n")
		.replace(/<\/w:t>\s*<w:t\b[^>]*>/g, "")
		.replace(/<w:t\b[^>]*>/g, "")
		.replace(/<\/w:t>/g, "");

	text = text.replace(/<[^>]+>/g, "");
	text = _decodeXmlEntities(text);
	text = text.replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n");
	text = text.replace(/[ \t]{2,}/g, " ");

	return text;
}

function _decodeXmlEntities (text) {
	return text
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, "\"")
		.replace(/&apos;/g, "'")
		.replace(/&#x([0-9a-fA-F]+);/g, (...m) => String.fromCodePoint(Number.parseInt(m[1], 16)))
		.replace(/&#(\d+);/g, (...m) => String.fromCodePoint(Number(m[1])));
}

function _coalesceDocxParagraphs (blocks) {
	const out = [];

	for (const block of blocks) {
		if (block.type !== "paragraph") {
			out.push(block);
			continue;
		}

		const prev = out.at(-1);
		if (prev?.type === "paragraph") {
			prev.text = `${prev.text}\n${block.text}`.trim();
			continue;
		}

		out.push(block);
	}

	return out;
}

function _postProcessDocxBlocks (blocks) {
	return _explodeFrontMatterParagraphs(blocks);
}

function _explodeFrontMatterParagraphs (blocks) {
	const out = [];
	let isBeforeFirstHeading = true;

	for (const block of blocks) {
		if (block.type === "heading") isBeforeFirstHeading = false;

		if (!isBeforeFirstHeading || block.type !== "paragraph" || !block.text.includes("\n")) {
			out.push(block);
			continue;
		}

		const lines = block.text
			.split("\n")
			.map(it => it.trim())
			.filter(Boolean);

		if (lines.length <= 1) {
			out.push(block);
			continue;
		}

		lines.forEach((line, ix) => {
			if (ix === 0 && _isLikelyFrontMatterTitle(line)) {
				out.push({type: "heading", level: 1, text: line});
				return;
			}

			if (_isLikelyInlineHeading(line)) {
				out.push({type: "heading", level: 1, text: line.replace(/[：:]$/, "").trim()});
				return;
			}

			out.push({type: "paragraph", text: line});
		});
	}

	return out;
}

function _isLikelyFrontMatterTitle (line) {
	return line.length <= 24
		&& !/[。！？.!?:：]$/.test(line)
		&& !/\s{2,}/.test(line);
}

function _isLikelyInlineHeading (line) {
	return line.length <= 32
		&& /[：:]$/.test(line)
		&& !/[。！？.!?]/.test(line.slice(0, -1));
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const inputPath = process.argv[2];
	const formatHint = process.argv[3] || null;
	const out = await extractInput({inputPath, formatHint});
	process.stdout.write(`${JSON.stringify(out, null, "\t")}\n`);
}
