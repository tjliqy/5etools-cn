import { transferLangConfig } from "../../config.js";

const config = {
	// feats
	"manage_prerelease_content": ["管理预发布内容", "", "Manage Prerelease Content"],
	"manage_prerelease_content_subtitle": ["查看、新增或删除预发布内容", "", "View, Add, and Delete Prerelease Content."],

	// utils-brew-impl-prerelease.js
	"prerelease_content": ["预发布内容", "预发布内容", "prerelease content"],
	"prerelease": ["预发布", "预发布", "prerelease"],
	"homebrew_content": ["自制内容", "自制内容", "homebrew"],
	"homebrew_contents": ["自制内容", "自制内容", "homebrews"],

	// utils-brew-ui-manage.js
	"load_all_partnered_content": ["加载所有合作内容", "加载所有合作内容", "Load All Partnered Content"],
	"load_partnered_content": ["加载合作内容", "加载合作内容", "Load Partnered Content"],
	"are_you_sure_you_want_to_load_all_partnered_content": [
		"确定要加载所有合作内容吗？",
		"确定要加载所有合作内容吗？",
		"Are you sure you want to load all partnered content?",
	],
	"export_prerelease_content_homebrew_list_as_url": ["导出预发布/自制内容列表为URL", "导出预发布/自制内容列表为URL", "`Export Prerelease Content/Homebrew List as URL`"],
	"view_source": ["查看源", "查看源", "View Source"],

};

export default transferLangConfig(config);
