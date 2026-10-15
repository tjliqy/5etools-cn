export function mergeLlmPatch (
	{
		initialJson,
		patch,
	},
) {
	if (!initialJson || typeof initialJson !== "object" || Array.isArray(initialJson)) {
		throw new Error(`“initialJson”必须是对象`);
	}

	if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
		throw new Error(`“patch”必须是对象`);
	}

	return {
		mergedJson: {
			...initialJson,
			...patch,
		},
		patchedFields: Object.keys(patch),
	};
}

if (import.meta.url === `file://${process.argv[1]}`) {
	throw new Error(`此脚本是库封装。请从其他脚本导入并调用 mergeLlmPatch()。`);
}
