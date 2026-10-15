import "./locale/i18n.js";
/**
 * Rename bestiary fluff images to match the source they originate from.
 *
 * This script assumes the user has a symlink to the image repo as "img".
 */

import fs, { symlinkSync } from "fs";
import path from "path";
import "../js/parser.js";
import "../js/utils.js";

function getTokenUrl (ent, name, mediaDir) {
	if (ent.tokenUrl) return ent.tokenUrl; // TODO(Future) legacy; remove
	if (ent.token) {
		// throw new Error(`Could not process ent.token!`);
		return `./img/${mediaDir}/${ent.token.source}/${Parser.nameToTokenName(ent.token.name)}.webp`;
	}
	if (ent.tokenHref) {
		throw new Error(`无法处理 ent.token！`);
		// return Renderer.utils.getEntryMediaUrl(ent, "tokenHref", "img");
	}
	return `./img/${mediaDir}/${ent.source}/${Parser.nameToTokenName(name)}.webp`;
}

function cleanBestiaryFluffImages () {
	console.log(`##### 正在生成怪物中文标记图 #####`);

	// read all the image dirs and track which images are actually in use
	const _ALL_IMAGE_PATHS = new Set();
	const PATH_BESTIARY_IMAGES = `./img/bestiary/`;
	fs.readdirSync(PATH_BESTIARY_IMAGES).forEach(f => {
		const path = `${PATH_BESTIARY_IMAGES}/${f}`;
		if (fs.lstatSync(path).isDirectory()) {
			fs.readdirSync(path).forEach(img => _ALL_IMAGE_PATHS.add(`bestiary/${f}/${img}`));
		}
	});

	function getCleanName (name) {
		return name
			.replace(/"/g, "")
			.replace(/\//g, " ");
	}

	const folderPath = "./data/bestiary";
	const files = fs.readdirSync(folderPath);

	files.forEach((file) => {
		const filePath = path.join(folderPath, file);
		const fileExt = path.extname(file).toLowerCase();

		if (file.startsWith("bestiary-")) {
			const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
			data.monster.forEach(mon => {
				if (mon.hasToken) {
					const tokenUrl = getTokenUrl(mon, mon.ENG_name, "bestiary/tokens");
					const symlinkUrl = getTokenUrl(mon, mon.name, "bestiary/tokens");
					if (fs.existsSync(tokenUrl) && tokenUrl !== symlinkUrl) {
						if (fs.existsSync(symlinkUrl)) {
							fs.rmSync(symlinkUrl);
						}
						fs.copyFileSync(tokenUrl, symlinkUrl);
						// try {
						// 	const stats = fs.lstatSync(symlinkUrl);
						// 	if (stats.isSymbolicLink()) {
						// 		fs.unlinkSync(symlinkUrl);
						// 		fs.symlinkSync(tokenUrl, symlinkUrl);

						// 		// console.log('软连接存在');
						// 	} else {
						// 		console.log('该路径不是软连接');
						// 	}
						// } catch (err) {
						// 	if (err.code === 'ENOENT') {
						// 		fs.symlinkSync(tokenUrl, symlinkUrl);
						// 	} else {
						// 		console.error('检查软连接时出现其他错误:', err);
						// 	}
						// }
					}
				}
			});
		}
	});

	console.log(`完成！`);
}

cleanBestiaryFluffImages();
