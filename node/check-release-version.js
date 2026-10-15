import fs from "node:fs";

const upstreamVersion = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const {upstreamVersion: cnUpstreamVersion, revision} = JSON.parse(fs.readFileSync("cn-version.json", "utf8"));

if (cnUpstreamVersion !== upstreamVersion || !Number.isInteger(revision) || revision < 1) {
	throw new Error("cn-version.json must match package.json and contain a positive integer revision");
}

const releaseVersion = `${upstreamVersion}-cn.${revision}`;
const utils = fs.readFileSync("js/utils.js", "utf8");
if (!utils.includes(`/* 5ETOOLS_VERSION__OPEN */"${releaseVersion}"/* 5ETOOLS_VERSION__CLOSE */`)) {
	throw new Error(`js/utils.js VERSION_NUMBER must be ${releaseVersion}; run node node/version-bump.js`);
}

const changelog = JSON.parse(fs.readFileSync("data/changelog-cn.json", "utf8"));
if (changelog.filter(it => it.ver === releaseVersion && it.txt).length !== 1) {
	throw new Error(`data/changelog-cn.json must contain one entry for ${releaseVersion}`);
}

const tag = process.argv[2];
if (tag && tag !== `v${releaseVersion}`) {
	throw new Error(`Release tag ${tag} does not match v${releaseVersion}`);
}

console.log(`Chinese release version validated: ${releaseVersion}`);
