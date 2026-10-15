import "./locale/i18n.js";
import fs from "fs";
import "../js/parser.js";
import "../js/utils.js";
import probe from "probe-image-size";
import {ObjectWalker} from "5etools-utils";
import {Command} from "commander";
import {readJsonSync} from "5etools-utils/lib/UtilFs.js";
import {getCliJsonFiles, mutCommanderJsonFileOptions} from "./util-commander.js";

function getFileProbeTarget (path) {
	const target = fs.createReadStream(path);
	return {
		target,
		location: path,
		fnCleanup: () => target.destroy(), // stream cleanup
	};
}

function getProbeTarget (imgEntry, {localBrewDir = null, localBrewDirImg = null, isAllowExternal = false}) {
	if (imgEntry.href.type === "internal") {
		return getFileProbeTarget(`img/${imgEntry.href.path}`);
	}

	if (imgEntry.href.type === "external") {
		if (localBrewDir && imgEntry.href.url.startsWith(VeCt.URL_ROOT_BREW)) {
			return getFileProbeTarget(
				decodeURI(imgEntry.href.url.replace(`${VeCt.URL_ROOT_BREW}_img`, `${localBrewDir}/_img`)),
			);
		}

		if (localBrewDirImg && imgEntry.href.url.startsWith(VeCt.URL_ROOT_BREW_IMG)) {
			return getFileProbeTarget(
				decodeURI(imgEntry.href.url.replace(VeCt.URL_ROOT_BREW_IMG, `${localBrewDirImg}/`)),
			);
		}

		if (!isAllowExternal) { // Local files are not truly "external"
			console.warn(`跳过外部图片（URL：“${imgEntry.href.url}”）；如需检测外部 URL，请使用 --allow-external 选项。`);
			return null;
		}

		return {
			target: imgEntry.href.url,
			location: imgEntry.href.url,
		};
	}

	throw new Error(`未处理的图片 href.type：“${imgEntry.href.type}”！`);
}

function getImageEntries (imageEntries, obj) {
	if (obj.type === "image" && obj.href) {
		imageEntries.push(obj);
	}
	return obj;
}

async function pMutImageDimensions (imgEntry, {localBrewDir = null, localBrewDirImg = null, isAllowExternal = false}) {
	const probeMeta = getProbeTarget(imgEntry, {localBrewDir, localBrewDirImg, isAllowExternal});
	if (probeMeta == null) return;

	const {target, location, fnCleanup} = probeMeta;
	try {
		const dimensions = await probe(target);
		if (fnCleanup) fnCleanup();

		imgEntry.width = dimensions.width;
		imgEntry.height = dimensions.height;
	} catch (e) {
		console.error(`无法设置 ${location} 的尺寸：${e.message}`);
	}
}

async function main (
	{
		dirs,
		files,
		convertedBy = null,
		author = null,
		filter = null,
		localBrewDir = null,
		localBrewDirImg = null,
		isAllowExternal = false,
	},
) {
	const tStart = Date.now();

	const allFiles = getCliJsonFiles(
		{
			dirs,
			files,
			convertedBy,
			author,
			filter,
			fnMutDefaultSelection: ({files, dirs}) => {
				const addAllFilesFluffDir = (dir) => {
					return Object.values(readJsonSync(`./data/${dir}/fluff-index.json`))
						.forEach((fname) => files.push(`./data/${dir}/${fname}`));
				};

				dirs.push("./data/adventure");
				dirs.push("./data/book");

				files.push("./data/decks.json");

				files.push("./data/fluff-backgrounds.json");
				files.push("./data/fluff-bastions.json");
				files.push("./data/fluff-charcreationoptions.json");
				files.push("./data/fluff-conditionsdiseases.json");
				files.push("./data/fluff-feats.json");
				files.push("./data/fluff-homecrafts.json");
				files.push("./data/fluff-items.json");
				files.push("./data/fluff-languages.json");
				files.push("./data/fluff-objects.json");
				files.push("./data/fluff-optionalfeatures.json");
				files.push("./data/fluff-races.json");
				files.push("./data/fluff-recipes.json");
				files.push("./data/fluff-rewards.json");
				files.push("./data/fluff-trapshazards.json");
				files.push("./data/fluff-vehicles.json");

				addAllFilesFluffDir("class");
				addAllFilesFluffDir("bestiary");
				addAllFilesFluffDir("spells");
			},
		},
	);
	console.log(`正在处理 ${allFiles.length} 个 JSON 文件…`);

	const imageEntries = [];
	allFiles.forEach(jsonFile => {
		ObjectWalker.walk({
			filePath: jsonFile.getFilePath(),
			obj: jsonFile.getContents(),
			primitiveHandlers: {
				object: getImageEntries.bind(this, imageEntries),
			},
		});
	});

	await Promise.all(
		[...new Array(4)]
			.map(async () => {
				while (imageEntries.length) {
					const imageEntry = imageEntries.pop();
					await pMutImageDimensions(imageEntry, {localBrewDir, localBrewDirImg, isAllowExternal});
				}
			}),
	);

	allFiles.forEach(jsonFile => fs.writeFileSync(jsonFile.getFilePath(), CleanUtil.getCleanJson(jsonFile.getContents()), "utf-8"));

	const tEnd = Date.now();
	console.log(`已完成，耗时 ${((tEnd - tStart) / 1000).toFixed(2)} 秒。`);
}

const program = mutCommanderJsonFileOptions({command: new Command()})
	.option("--allow-external", "允许检测外部 URL。")
	.option("--local-brew-dir <localBrewDir>", "使用本地自制内容目录查找相关 URL。")
	.option("--local-brew-dir-img <localBrewDirImg>", "使用本地自制内容图片目录查找相关 URL。")
;

program.parse(process.argv);
const params = program.opts();

main({
	dirs: params.dir,
	files: params.file,
	convertedBy: params.convertedBy,
	author: params.author,
	filter: params.filter,
	localBrewDir: params.localBrewDir,
	localBrewDirImg: params.localBrewDirImg,
	isAllowExternal: params.allowExternal,
})
	.catch(e => console.error(e));
