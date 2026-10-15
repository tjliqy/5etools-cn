import path from "node:path";
import {spawn} from "node:child_process";

function _getArgValue (flag) {
	const ix = process.argv.indexOf(flag);
	if (!~ix) return null;
	return process.argv[ix + 1] ?? null;
}

function _getArgsAfterCommand () {
	const [, , , ...rest] = process.argv;
	return rest;
}

function _getScriptPath (name) {
	return path.join(path.dirname(process.argv[1]), name);
}

async function _runNodeScript (scriptName, args) {
	const scriptPath = _getScriptPath(scriptName);

	await new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [scriptPath, ...args], {
			stdio: "inherit",
		});

		child.on("error", reject);
		child.on("exit", code => {
			if (code === 0) return resolve();
			reject(new Error(`子命令“${scriptName}”退出，状态码为 ${code}`));
		});
	});
}

function _printUsage () {
	process.stdout.write(`用法：
  node scripts/homebrew-conversion-cli.js bundle --input <路径> [通用选项...]
  node scripts/homebrew-conversion-cli.js audit --input <路径> --entity-plan <路径> [通用选项...]
  node scripts/homebrew-conversion-cli.js build-collection --input <路径> --entity-plan <路径> --output <路径> [通用选项...]

子命令：
  bundle            提取输入文件并导出供 Codex 使用的条目包。
  audit             使用可选的 Codex 条目计划审核所选条目。
  build-collection  根据条目计划构建合集草稿，并自动合并已验证的 *.result.json 文件。

示例：
  node scripts/homebrew-conversion-cli.js bundle --input module.docx --kind adventureDocument --entity-bundle /tmp/module.bundle.json
  node scripts/homebrew-conversion-cli.js audit --input module.docx --entity-plan /tmp/module.plan.json --entity-kind monster --repair-prompt /tmp/monster.repair.txt
  node scripts/homebrew-conversion-cli.js build-collection --input module.docx --entity-plan /tmp/module.plan.json --output /tmp/module.collection.json --repair-dir /tmp/repairs --llm-result-dir /tmp/repairs

结果文件自动合并：
  将 Codex 的修复结果保存为以下文件名形式：
  - False_Hydra.monster.result.json
  - Sending.spell.result.json
  - Wand_of_Smiles.item.result.json
  然后使用 --llm-result-dir 或 --repair-dir 重新运行 build-collection。
`);
}

async function _main () {
	const command = process.argv[2];

	if (!command || command === "--help" || command === "-h") {
		_printUsage();
		return;
	}

	const passthroughArgs = _getArgsAfterCommand();

	switch (command) {
		case "bundle": {
			const entityBundlePath = _getArgValue("--entity-bundle");
			if (!entityBundlePath) {
				throw new Error(`bundle 需要 --entity-bundle <path>`);
			}

			await _runNodeScript("audit-file-cli.js", [...passthroughArgs, "--bundle-only"]);
			return;
		}

		case "audit": {
			await _runNodeScript("audit-file-cli.js", passthroughArgs);
			return;
		}

		case "build-collection": {
			await _runNodeScript("build-collection-from-plan-cli.js", passthroughArgs);
			return;
		}

		default:
			throw new Error(`未知命令：“${command}”`);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await _main();
}
