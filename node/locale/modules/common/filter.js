import { transferLangConfig } from "../../config.js";

const config = {
	// Tab Names
	"filter_search_for": ["筛选/搜索", "筛选/搜索", "Filter/Search for"],
	// Snapshot
	"manage_defaults": ["管理默认配置", "管理默认配置", "Manage Defaults"],
	"take_snapshot": ["保存配置", "", "Take Snapshot"],
	"take_snapshot_and_make_default": ["保存配置并设为默认", "", "Take Snapshot and Make Default"],
	"manage_snapshot": ["管理配置", "", "Manage Snapshot"],

	// spells.js
	"include_variants": ["包含变体", "包含变体", "Include Variants"],

	// filter-filter-source.js
	"include_references": ["包含引用", "包含引用", "Include References"],
	"include_references_tooltip": [
		"将实体视为属于它们出现的每个来源（如：被重制）以及它们的主要来源",
		"",
		"Consider entities as belonging to every source they appear in (i.e. reprints) as well as their primary source"],
};

export default transferLangConfig(config);