window.addEventListener("load", async () => {
	await Promise.all([
		PrereleaseUtil.pInit(),
		BrewUtil2.pInit(),
	]);
	ExcludeUtil.pInitialise().then(null); // don't await, as this is only used for search

	const [changelog, cnChangelog] = await Promise.all([
		DataUtil.loadJSON(`${Renderer.get().baseUrl}data/changelog.json`),
		DataUtil.loadJSON(`${Renderer.get().baseUrl}data/changelog-cn.json`),
	]);
	const wrp = veEs(`#pagecontent`).vee.empty();
	const allChangelog = [...changelog, ...cnChangelog]
		.sort((a, b) => {
			const parseVersion = version => {
				const [, major, minor, patch, channel, revision] = /^(\d+)\.(\d+)\.(\d+)(?:-([a-z]+)\.(\d+))?$/.exec(version) || [];
				return {
					major: Number(major) || 0,
					minor: Number(minor) || 0,
					patch: Number(patch) || 0,
					channel: channel || "",
					revision: Number(revision) || 0,
				};
			};
			const versionA = parseVersion(a.ver);
			const versionB = parseVersion(b.ver);
			return versionA.major - versionB.major
				|| versionA.minor - versionB.minor
				|| versionA.patch - versionB.patch
				|| Number(Boolean(versionA.channel)) - Number(Boolean(versionB.channel))
				|| versionA.channel.localeCompare(versionB.channel)
				|| versionA.revision - versionB.revision;
		});
	UtilsChangelog.renderChangelog(allChangelog, wrp);

	window.dispatchEvent(new Event("toolsLoaded"));
});
