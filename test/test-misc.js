import "../js/parser.js";
import "../js/utils.js";

function testCatIds () {
	const errors = [];
	Object.keys(Parser.CAT_ID_TO_FULL).forEach(catId => {
		if (Parser.CAT_ID_TO_PROP[catId] === undefined) errors.push(`Missing property for ID: ${catId} (${Parser.CAT_ID_TO_FULL[catId]})`);
		if (UrlUtil.CAT_TO_PAGE[catId] === undefined) errors.push(`Missing page for ID: ${catId} (${Parser.CAT_ID_TO_FULL[catId]})`);
	});
	return errors;
}

async function main () {
	let anyErrors = false;

	const errorsCatIds = testCatIds();
	if (errorsCatIds.length) {
		anyErrors = true;
		console.error(`分类 ID 错误：`);
		errorsCatIds.forEach(it => console.error(`\t${it}`));
	}

	if (!anyErrors) console.log("##### 杂项测试通过 #####");
	return !anyErrors; // invert the result as this is what the test runner expects
}

const pMain = main();

if (import.meta.main && !(await pMain)) process.exitCode = 1;

export default pMain;
