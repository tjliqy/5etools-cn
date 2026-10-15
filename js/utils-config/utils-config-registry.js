import {ConfigSettingsGroup} from "./util-config-settings-group.js";
import {ConfigSettingBoolean, ConfigSettingEnum, ConfigSettingExternal} from "./utils-config-setting-base.js";
import {SITE_STYLE__CLASSIC, SITE_STYLE__ONE, SITE_STYLE_DISPLAY} from "../consts.js";
import {StyleSwitcher} from "../styleswitch.js";

const settingsGroupStyleSwitcher = new ConfigSettingsGroup({
	groupId: "styleSwitcher",
	name: I18nUtil.get("common.preferences.appearance"),
	configSettings: [
		new (
			class extends ConfigSettingExternal {
				_configId = "theme";
				_name = I18nUtil.get("common.preferences.theme");
				_help = "应用的颜色主题。";
				_isRowLabel = true;

				_getEleExternal () { return StyleSwitcher.getSelStyle(); }
			}
		)(),
		new ConfigSettingEnum({
			configId: "style",
			name: `<span>${I18nUtil.get("common.preferences.style")} <span class="ve-small">（另见：<a href="https://2014.5e.tools" rel="noopener noreferrer" target="_blank">2014.5e.tools</a>）</span></span>`,
			help: `渲染资料卡等内容时使用的样式。它只影响显示方式，不改变可用内容。另见：https://2014.5e.tools。`,
			isRowLabel: true,
			isReloadRequired: true,
			default: SITE_STYLE__ONE,
			values: [
				SITE_STYLE__CLASSIC,
				SITE_STYLE__ONE,
			],
			fnDisplay: it => SITE_STYLE_DISPLAY[it] || it,
		}),
		new (
			class extends ConfigSettingExternal {
				_configId = "styleRollbox";
				_name = "掷骰器位置";
				_help = "掷骰器出现在页面的哪个位置。";
				_isRowLabel = true;

				_getEleExternal () { return StyleSwitcher.getSelRollboxPosition(); }
			}
		)(),
		new (
			class extends ConfigSettingExternal {
				_configId = "isWideMode";
				_name = I18nUtil.get("common.preferences.wide_mode");
				_help = "此功能尚未正式支持，可能出现问题。";
				_isRowLabel = true;

				_getEleExternal () { return StyleSwitcher.getCbWide(); }
			}
		)(),
	],
});

const settingsGroupUi = new ConfigSettingsGroup({
	groupId: "ui",
	name: "界面",
	configSettings: [
		new ConfigSettingBoolean({
			configId: "isNotifyUpdates",
			name: `内容更新后显示通知`,
			help: `后台内容更新完成后是否显示通知，提示重新加载或查看更新日志。`,
			isRowLabel: true,
			default: true,
		}),
	],
});

const _MARKDOWN_TAG_RENDER_MODES = {
	"convertMarkdown": "转换为Markdown",
	"ignore": "保持原样",
	"convertText": "转换为文本",
};

const settingsGroupMarkdown = new ConfigSettingsGroup({
	groupId: "markdown",
	name: "Markdown 导出",
	configSettings: [
		new ConfigSettingEnum({
			configId: "tagRenderMode",
			name: `Tag 处理方式(<code>@tag</code>)`,
			help: `对5etools中"@tag"格式的处理方法。`,
			isRowLabel: true,
			default: "convertMarkdown",
			values: [
				"convertMarkdown",
				"ignore",
				"convertText",
			],
			fnDisplay: it => _MARKDOWN_TAG_RENDER_MODES[it] || it,
		}),
		new ConfigSettingBoolean({
			configId: "isAddColumnBreaks",
			name: `添加 GM Binder 列间隔符 (<code>\\\\columnbreak</code>)`,
			help: `如果要求导出的Markdown包含列间隔符，则在会列间隔处添加"\\\\columnbreak"。`,
			isRowLabel: true,
			default: false,
		}),
		new ConfigSettingBoolean({
			configId: "isAddPageBreaks",
			name: `添加 GM Binder 页间隔符 (<code>\\\\pagebreak</code>)`,
			help: `如果要求导出的Markdown包含页间隔符，则在会页间隔处添加"\\\\pagebreak"。`,
			isRowLabel: true,
			default: false,
		}),
	],
});

export const SETTINGS_GROUPS = [
	settingsGroupStyleSwitcher,
	settingsGroupUi,
	settingsGroupMarkdown,
];
