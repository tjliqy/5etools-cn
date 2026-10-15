import {pBootstrap5etoolsNode} from "./bootstrap-5etools-node.js";

export async function runItemConverter (
	{
		rawText,
		mode = "txt",
		source = "",
		page = 0,
		styleHint = "classic",
		inputMeta = null,
	} = {},
) {
	const {ConverterItem} = await pBootstrap5etoolsNode();

	const warnings = [];
	let initialJson = null;

	const opts = {
		cbWarning: warning => warnings.push(warning),
		cbOutput: output => { initialJson = output; },
		isAppend: false,
		source,
		page,
		styleHint,
	};

	switch (mode) {
		case "txt":
		case "md":
			ConverterItem.doParseText(rawText, opts);
			break;

		default:
			throw new Error(`不支持的物品转换模式："${mode}"`);
	}

	return {
		entityKind: "item",
		mode,
		rawText,
		source,
		page,
		styleHint,
		inputMeta,
		initialJson,
		warnings,
	};
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const rawText = process.argv.slice(2).join(" ").trim();
	if (!rawText) throw new Error(`请通过命令行参数传入物品文本，或在其他脚本中导入 runItemConverter()。`);

	const out = await runItemConverter({rawText});
	process.stdout.write(`${JSON.stringify(out, null, "\t")}\n`);
}
