import fs from "fs";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_LINES = 10;
const OUTPUT_DIR = path.join(__dirname, "..", "urls");

const sitemap = fs.readFileSync(path.join(__dirname, "..", "sitemap.xml"), "utf-8");
const matches = sitemap.match(/<loc>(.*?)<\/loc>/g) || [];
const urls = matches.map(m => m.replace(/<\/?loc>/g, ""));

const formatDate = (date) => {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
};

const today = formatDate(new Date());

// 检查是否需要重新生成
const shouldRegenerate = () => {
	if (!fs.existsSync(OUTPUT_DIR)) return true;

	const existingFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith(".txt")).sort();
	if (existingFiles.length === 0) return true;

	// 读取已有的所有 URL
	const existingUrls = [];
	existingFiles.forEach(file => {
		const content = fs.readFileSync(path.join(OUTPUT_DIR, file), "utf-8");
		content.split("\n").filter(Boolean).forEach(url => existingUrls.push(url));
	});

	// 比较数量
	if (existingUrls.length !== urls.length) return true;

	// 比较内容
	for (let i = 0; i < urls.length; i++) {
		if (urls[i] !== existingUrls[i]) return true;
	}

	return false;
};

if (!shouldRegenerate()) {
	console.log(`urls/ 目录已存在且内容一致，无需重新生成`);
} else {
	// 清空目录
	if (!fs.existsSync(OUTPUT_DIR)) {
		fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	} else {
		fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith(".txt")).forEach(f => {
			fs.unlinkSync(path.join(OUTPUT_DIR, f));
		});
	}

	const startDate = new Date();
	const totalFiles = Math.ceil(urls.length / MAX_LINES);

	for (let i = 0; i < totalFiles; i++) {
		const chunk = urls.slice(i * MAX_LINES, (i + 1) * MAX_LINES);
		const fileDate = new Date(startDate);
		fileDate.setDate(fileDate.getDate() + i);
		const filename = `urls-${formatDate(fileDate)}.txt`;
		fs.writeFileSync(path.join(OUTPUT_DIR, filename), chunk.join("\n") + "\n", "utf-8");
		console.log(`已将 ${chunk.length} 个 URL 写入 urls/${filename}`);
	}

	console.log(`总计：${totalFiles} 个文件，共 ${urls.length} 个 URL`);
}

// 提交当日 URL 到百度
const todayFile = path.join(OUTPUT_DIR, `urls-${today}.txt`);
if (fs.existsSync(todayFile)) {
	console.log(`\n正在提交当日 URL 到百度...`);
	const body = fs.readFileSync(todayFile, "utf-8");
	const req = http.request(
		{
			hostname: "data.zz.baidu.com",
			path: "/urls?site=https://5e.kiwee.top&token=m7Qx5vYCOiSOoCAV",
			method: "POST",
			headers: {
				"Content-Type": "text/plain",
				"Content-Length": Buffer.byteLength(body),
				"User-Agent": "curl/7.12.1",
			},
		},
		res => {
			let data = "";
			res.on("data", chunk => (data += chunk));
			res.on("end", () => console.log(`百度推送结果: ${data}`));
		}
	);
	req.on("error", e => console.error(`百度推送失败: ${e.message}`));
	req.write(body);
	req.end();
} else {
	console.log(`当日文件 urls-${today}.txt 不存在，跳过百度推送`);
}
