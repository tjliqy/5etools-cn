import {rmDirRecursiveSync} from "./util.js";

if (process.argv.length < 3) throw new Error(`至少需要一个参数！`);

process.argv.slice(2)
	.forEach(tgt => {
		console.log(`正在删除：${tgt}`);
		rmDirRecursiveSync(tgt);
	});
