import {Option} from "commander";
import {getAllJsonFiles} from "./util-json-files.js";

const _FILE_FILTER_CHOICES = ["partnered", "sample"];

const _getCliFiles_getFilteredByFilter = ({jsonFiles, filter = null}) => {
	if (!filter) return jsonFiles;

	switch (filter) {
		case "partnered": return jsonFiles.filter(jsonFile => jsonFile.isPartnered());
		case "sample": return jsonFiles.filter(jsonFile => jsonFile.isSampleFile());
		default: throw new Error(`未处理的筛选模式：“${filter}”`);
	}
};

const _getCliFiles_getFilteredByConvertedByAuthor = ({jsonFiles, convertedBy = null, author = null}) => {
	if (!convertedBy && !author) return jsonFiles;

	return jsonFiles.filter(jsonFile => {
		if (convertedBy && jsonFile.isConvertedBy({name: convertedBy})) return true;
		return author && jsonFile.isAuthor({name: author});
	});
};

export const getCliJsonFiles = (
	{
		dirs,
		files,
		fnMutDefaultSelection = null,
		convertedBy = null,
		author = null,
		filter = null,
		fnIsBlocklisted = null,
	},
) => {
	dirs = [...(dirs || [])];
	files = [...(files || [])];

	// If no options specified, use default selection
	if (!dirs.length && !files.length) {
		if (fnMutDefaultSelection) fnMutDefaultSelection({files, dirs});
	}

	return _getCliFiles_getFilteredByConvertedByAuthor({
		jsonFiles: _getCliFiles_getFilteredByFilter({
			jsonFiles: getAllJsonFiles({dirs, files, fnIsBlocklisted}),
			filter,
		}),
		convertedBy,
		author,
	});
};

export const mutCommanderJsonFileOptions = ({command}) => {
	return command
		.option("--file <file...>", "输入文件")
		.option("--dir <dir...>", "输入目录")

		.addOption(
			new Option("--filter <filter>", "按指定模式筛选文件")
				.choices(_FILE_FILTER_CHOICES),
		)
		.option("--converted-by <name>", "按转换者名称筛选文件")
		.option("--author <name>", "按作者名称筛选文件")
	;
};

let _isInitConsoleOut = false;
export const pInitConsoleOut = async () => {
	if (_isInitConsoleOut) return;
	_isInitConsoleOut = true;

	// Arbitrary initial delay to allow IntelliJ console to properly init(?!)
	await MiscUtil.pDelay(500);
};
