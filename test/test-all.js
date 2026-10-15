import "../node/locale/i18n.js";
import "../js/parser.js";
import "../js/utils.js";
import "../js/utils-config.js";

function handleFail () {
	console.error("测试失败！");
	process.exit(1);
}

async function main () {
	if (!(await (await import("./test-tags.js")).default)) handleFail();
	if (!(await (await import("./test-images.js")).default)) handleFail();
	if (!(await (await import("./test-image-paths.js")).default)) handleFail();
	await (await import("./test-pagenumbers.js")).default; // don't fail on missing page numbers
	await (await import("./test-image-credits.js")).default; // don't fail on missing image credits
	if (!(await (await import("./test-json.js")).default)) handleFail();
	if (!(await (await import("./test-misc.js")).default)) handleFail();
	if (!(await (await import("./test-multisource.js")).default)) handleFail();
	if (!(await (await import("./test-language-fonts.js")).default)) handleFail();
	if (!(await (await import("./test-map-names.js")).default)) handleFail();
	if (!(await (await import("./test-adventure-book-contents.js")).default)) handleFail();
	await (await import("./test-map-grids-parents.js")).default; // don't fail on missing map grids
	if (!(await (await import("./test-foundry.js")).default)) handleFail();
	process.exit(0);
}

main()
	.then(() => console.log("测试完成。"))
	.catch(e => {
		console.error(e);
		throw e;
	});
