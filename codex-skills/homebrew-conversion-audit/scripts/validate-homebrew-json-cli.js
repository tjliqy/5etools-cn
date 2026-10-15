import path from "node:path";
import {spawn} from "node:child_process";

function _getArgValue (flag) {
	const ix = process.argv.indexOf(flag);
	if (!~ix) return null;
	return process.argv[ix + 1] ?? null;
}

function _printUsage () {
	process.stdout.write(`用法：
  node scripts/validate-homebrew-json-cli.js --file <path> [--homebrew-dir /data/homebrew]

使用运行时加载的中文 5etools 架构扩展验证自制内容 JSON。
此操作不会修改已安装的 5etools-utils 架构。
`);
}

async function _main () {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		_printUsage();
		return;
	}

	const file = _getArgValue("--file");
	if (!file) throw new Error(`缺少 --file <path>`);

	const homebrewDir = _getArgValue("--homebrew-dir") || "/data/homebrew";
	const shimPath = path.join(path.dirname(process.argv[1]), "validate-homebrew-json-shim.mjs");
	const existingNodeOptions = process.env.NODE_OPTIONS || "";
	const nodeOptions = [existingNodeOptions, `--import ${shimPath}`].filter(Boolean).join(" ");

	await new Promise((resolve, reject) => {
		const child = spawn("npm", ["run", "test:json", "--", file], {
			cwd: homebrewDir,
			env: {
				...process.env,
				NODE_OPTIONS: nodeOptions,
			},
			stdio: "inherit",
		});

		child.on("error", reject);
		child.on("exit", code => {
			if (code === 0) return resolve();
			reject(new Error(`自制内容 JSON 验证失败，退出状态码为 ${code}`));
		});
	});
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await _main();
}
