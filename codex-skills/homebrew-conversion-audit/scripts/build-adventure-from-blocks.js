function _cleanHeadingText (text) {
	return `${text || ""}`.trim().replace(/[：:]$/, "");
}

function _splitParagraphText (text) {
	return `${text || ""}`
		.split("\n")
		.map(it => it.trim())
		.filter(Boolean)
		.map(it => _cleanInlineText(it));
}

function _cleanInlineText (text) {
	return `${text || ""}`
		// Strip common DOCX-export hyperlink control text while preserving visible labels.
		.replace(/HYPERLINK\s+\\l\s+"[^"]*"\s*([^\\\n]+?)(?=\s*(?:HYPERLINK|$))/g, "$1")
		.replace(/HYPERLINK\s+"[^"]*"\s+\\l\s+"[^"]*"\s+\\h\s*([^\\\n]+?)(?=\s*(?:HYPERLINK|$))/g, "$1")
		.replace(/HYPERLINK\s+"([^"]+)"/g, "$1")
		.replace(/HYPERLINK\s+/g, "")
		.replace(/\\[a-z]\b/g, "")
		.trim();
}

function _buildTreeFromBlocks (blocks) {
	const root = {level: 0, name: null, children: [], entries: []};
	const stack = [root];

	for (const block of blocks) {
		if (block.type === "page_break") continue;

		if (block.type === "heading") {
			const level = Number(block.level || 1);
			const node = {level, name: _cleanHeadingText(block.text), children: [], entries: []};

			while (stack.length && stack.at(-1).level >= level) stack.pop();
			stack.at(-1).children.push(node);
			stack.push(node);
			continue;
		}

		const tgt = stack.at(-1);
		if (block.type === "paragraph") {
			tgt.entries.push(..._splitParagraphText(block.text));
			continue;
		}

		if (block.type === "list_item") {
			const list = tgt.entries.at(-1);
			if (list?.type === "list") {
				list.items.push(block.text.trim());
			} else {
				tgt.entries.push({type: "list", items: [block.text.trim()]});
			}
			continue;
		}

		if (block.type === "entry") {
			tgt.entries.push(block.entry);
			continue;
		}
	}

	return root;
}

function _parseLevelRange (str) {
	const m = /适合\s*(?<start>\d+)\s*[-到至~]\s*(?<end>\d+)\s*级角色/u.exec(str || "");
	if (m) {
		return {
			start: Number(m.groups.start),
			end: Number(m.groups.end),
		};
	}

	const mPlus = /(?:推荐等级是|推荐等级|适用于|适合)[^\d]*(?<level>\d+)\s*级以上/u.exec(str || "");
	if (mPlus) return {custom: `${Number(mPlus.groups.level)}级以上`};

	return null;
}

function _getTopMatter (blocks) {
	const titleBlock = blocks.find(it => it.type === "heading" && it.level === 1);
	const firstHeadingIx = blocks.findIndex(it => it.type === "heading" && it.level === 1 && _cleanHeadingText(it.text) !== _cleanHeadingText(titleBlock?.text));

	const preBlocks = firstHeadingIx > 0
		? blocks.slice(0, firstHeadingIx)
		: blocks.slice(0, Math.min(blocks.length, 3));

	const subtitle = preBlocks.find(it => it.type === "paragraph")?.text?.trim() || "";
	const level = _parseLevelRange(subtitle);

	return {
		title: _cleanHeadingText(titleBlock?.text || ""),
		subtitle,
		level,
	};
}

function _getSectionNodes (tree, {title}) {
	const titleNode = tree.children.find(it => _cleanHeadingText(it.name) === title) || null;
	const siblingSections = tree.children.filter(it => _cleanHeadingText(it.name) !== title);

	// Treat sub-sections under the document title as real adventure sections
	// instead of dropping them with the title wrapper.
	if (titleNode?.children?.length) return [...titleNode.children, ...siblingSections];

	return siblingSections;
}

function _shouldPromoteHeaders (section) {
	return new Set(["情景", "附录"]).has(_cleanHeadingText(section?.name));
}

function _findChildByName (node, name) {
	return node?.children?.find(it => _cleanHeadingText(it.name) === name) || null;
}

function _applyAppendixCreditsHeuristic (section) {
	if (_cleanHeadingText(section?.name) !== "附录") return;

	const adviceNode = _findChildByName(section, "带团建议");
	if (!adviceNode) return;

	const lastAdviceChild = adviceNode.children?.at(-1);
	if (!lastAdviceChild?.entries?.length) return;

	const creditStartIx = lastAdviceChild.entries.findIndex(it => typeof it === "string" && /感谢你看到这里|如果这个模组让你和你的玩家度过了一段不错的时光|我的B站账号/u.test(it));
	if (creditStartIx < 0) return;

	const creditEntries = lastAdviceChild.entries.slice(creditStartIx);
	lastAdviceChild.entries = lastAdviceChild.entries.slice(0, creditStartIx);

	if (!creditEntries.length) return;

	section.children.push({
		level: section.level + 1,
		name: "制作组",
		children: [],
		entries: creditEntries,
	});
}

function _applyAdventureHeuristics (sectionNodes) {
	sectionNodes.forEach(section => {
		_applyAppendixCreditsHeuristic(section);
		_dedupeNodeStrings(section);
	});
}

function _dedupeNodeStrings (node) {
	if (!node?.entries) return;

	node.entries = node.entries.filter((entry, ix, arr) => {
		if (typeof entry !== "string") return true;
		if (typeof arr[ix - 1] !== "string") return true;
		return entry !== arr[ix - 1];
	});

	node.children?.forEach(child => _dedupeNodeStrings(child));
}

function _toAdventureContents (sectionNodes) {
	return sectionNodes.map(section => {
		const out = {
			name: section.name,
		};

		const level2Headers = section.children
			.filter(ch => ch.level === section.level + 1)
			.map(ch => ch.name);

		if (_shouldPromoteHeaders(section) && level2Headers.length) out.headers = level2Headers;
		return out;
	});
}

function _toAdventureSectionEntry (node) {
	const entries = _normalizeEntries([
		...node.entries,
		...node.children.map(ch => _toNestedSection(ch)),
	]);

	return {
		type: "section",
		name: node.name,
		entries,
	};
}

function _toNestedSection (node) {
	return {
		type: "section",
		name: node.name,
		entries: _normalizeEntries([
			...node.entries,
			...node.children.map(ch => _toNestedSection(ch)),
		]),
	};
}

function _normalizeEntries (entries) {
	const out = [];

	for (const entry of entries) {
		if (typeof entry === "string") {
			const cleaned = _cleanInlineText(entry);
			if (!cleaned) continue;
			if (typeof out.at(-1) === "string" && out.at(-1) === cleaned) continue;
			out.push(cleaned);
			continue;
		}

		if (entry?.type === "list") {
			const items = (entry.items || []).map(it => _cleanInlineText(it)).filter(Boolean);
			if (items.length) out.push({...entry, items});
			continue;
		}

		if (entry?.type === "section") {
			out.push({
				...entry,
				entries: _normalizeEntries(entry.entries || []),
			});
			continue;
		}

		out.push(entry);
	}

	return out;
}

export function buildAdventureFromBlocks (
	{
		blocks,
		source,
		id = null,
		name = null,
		group = "other",
		translator = null,
		published = null,
		storyline = null,
		edition = "one",
		engName = "",
	} = {},
) {
	if (!Array.isArray(blocks) || !blocks.length) throw new Error(`“blocks”必须是非空数组`);
	if (!source) throw new Error(`缺少“source”`);

	const {title, level} = _getTopMatter(blocks);
	const tree = _buildTreeFromBlocks(blocks);
	const sectionNodes = _getSectionNodes(tree, {title});
	_applyAdventureHeuristics(sectionNodes);

	const adventure = {
		name: name || title,
		id: id || `${source}-1`,
		source,
		group,
		...(engName ? {ENG_name: engName} : {}),
		...(translator ? {translator} : {}),
		...(published ? {published} : {}),
		...(storyline ? {storyline} : {}),
		...(level ? {level} : {}),
		contents: _toAdventureContents(sectionNodes),
	};

	const adventureData = {
		id: adventure.id,
		source,
		data: sectionNodes.map(it => _toAdventureSectionEntry(it)),
	};

	return {
		adventure,
		adventureData,
	};
}

if (import.meta.url === `file://${process.argv[1]}`) {
	throw new Error(`此脚本是库封装。请从其他脚本导入并调用 buildAdventureFromBlocks()。`);
}
