import "./locale/i18n.js";
import "../js/parser.js";
import "../js/utils.js";
import "../js/render.js";
import "../js/render-dice.js";
import "../js/utils-dataloader.js";
import "../js/hist.js";
import "../js/utils-config.js";
import {Command} from "commander";
import {listJsonFiles, writeJsonSync} from "5etools-utils/lib/UtilFs.js";
import * as ut from "./util.js";
import {FoundryDataMigrator, UNHANDLED_KEYS} from "../js/foundry/foundry-migrate-data.js";
import {isSiteFoundryFile} from "./util.js";
import {getCliJsonFiles, mutCommanderJsonFileOptions} from "./util-commander.js";

const program = mutCommanderJsonFileOptions({command: new Command()})
	.option("--prefix-props", `为属性添加“foundry”前缀。例如，若文件中的属性为“spell”而非“foundrySpell”，则需要此选项。`);

program.parse(process.argv);
const params = program.opts();

async function main () {
	ut.patchLoadJson();

	console.log(`正在迁移 Foundry 数据…`);

	await getCliJsonFiles(
		{
			dirs: params.dir,
			files: params.file,
			convertedBy: params.convertedBy,
			author: params.author,
			filter: params.filter,
			fnMutDefaultSelection: ({files}) => {
				files.push(
					...listJsonFiles("data")
						.filter(filename => isSiteFoundryFile(filename)),
				);
			},
		},
	)
		.pSerialAwaitMap(async jsonFile => {
			const path = jsonFile.getFilePath();
			const json = jsonFile.getContents();

			const isPrefixProps = params.prefixProps || isSiteFoundryFile(path);

			const foundryMigrator = new FoundryDataMigrator({json, isPrefixProps});

			await foundryMigrator.pMutMigrate();

			writeJsonSync(path, json, {isClean: true});

			console.log(`\t已迁移“${path}”…`);
		});

	if (UNHANDLED_KEYS.size) {
		console.warn(
			`未处理的键：\n${[...UNHANDLED_KEYS]
				.sort(SortUtil.ascSortLower)
				.map(k => `\t${k}`)
				.join("\n")}`,
		);
	}

	console.log(`Foundry 数据迁移完成。`);

	ut.unpatchLoadJson();
}

main()
	.then(null);
