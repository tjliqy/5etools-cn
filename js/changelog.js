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
	UtilsChangelog.renderChangelog(changelog, wrp);
	UtilsChangelog.renderChangelog(cnChangelog, wrp);

	window.dispatchEvent(new Event("toolsLoaded"));
});
