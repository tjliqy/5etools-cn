function _getNowUnix () {
	return Math.floor(Date.now() / 1000);
}

function _getHashStub () {
	return `${Date.now().toString(16)}`.slice(-10);
}

function _uniq (arr) {
	return [...new Set((arr || []).filter(Boolean))];
}

function _normalizeSources (sourceInfo, metaSources = []) {
	const sources = [...metaSources];
	if (!sourceInfo) return sources;

	return [
		...sources,
		{
			json: sourceInfo.json || sourceInfo.abbreviation || sourceInfo.source,
			abbreviation: sourceInfo.abbreviation || sourceInfo.json || sourceInfo.source,
			full: sourceInfo.full || sourceInfo.name || sourceInfo.title || sourceInfo.source,
			...(sourceInfo.authors?.length ? {authors: _uniq(sourceInfo.authors)} : {}),
			...(sourceInfo.convertedBy?.length ? {convertedBy: _uniq(sourceInfo.convertedBy)} : {}),
			...(sourceInfo.url ? {url: sourceInfo.url} : {}),
			...(sourceInfo.version ? {version: sourceInfo.version} : {}),
			...(sourceInfo.translator ? {translator: sourceInfo.translator} : {}),
			...(sourceInfo.color ? {color: sourceInfo.color} : {}),
			...(sourceInfo.partnered != null ? {partnered: !!sourceInfo.partnered} : {}),
			...(sourceInfo.dateReleased ? {dateReleased: sourceInfo.dateReleased} : {}),
		},
	];
}

function _pushEntity (out, entity) {
	if (!entity) return;

	if (entity.kind === "adventureBundle") {
		if (entity.adventure) (out.adventure ||= []).push(entity.adventure);
		if (entity.adventureData) (out.adventureData ||= []).push(entity.adventureData);
		return;
	}

	if (!entity.kind || !entity.json) return;
	(out[entity.kind] ||= []).push(entity.json);
}

export function buildCollection (
	{
		entities = [],
		meta = {},
		sourceInfo = null,
		edition = null,
		dateAdded = null,
		dateLastModified = null,
	} = {},
) {
	const now = _getNowUnix();
	const normalizedSources = _normalizeSources(sourceInfo, meta.sources);
	const translators = _uniq([
		...(meta.translators || []),
		sourceInfo?.translator,
	]);

	const out = {
		_meta: {
			...meta,
			...(normalizedSources.length ? {sources: normalizedSources} : {}),
			...(translators.length ? {translators} : {}),
			...(edition || meta.edition ? {edition: edition || meta.edition} : {}),
			dateAdded: dateAdded ?? meta.dateAdded ?? now,
			dateLastModified: dateLastModified ?? meta.dateLastModified ?? now,
			_dateLastModifiedHash: meta._dateLastModifiedHash || _getHashStub(),
		},
	};

	for (const entity of entities) _pushEntity(out, entity);

	return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	throw new Error(`此脚本是库封装。请从其他脚本导入并调用 buildCollection()。`);
}
