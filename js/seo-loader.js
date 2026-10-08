import {RenderBestiary} from "./render-bestiary.js";
import {RenderBackgrounds} from "./render-backgrounds.js";
import {RenderConditionDiseases} from "./render-conditionsdiseases.js";
import {RenderFeats} from "./render-feats.js";
import {RenderSpells, RenderSpellsSettings} from "./render-spells.js";
import {RenderItems} from "./render-items.js";
import {RenderRaces} from "./render-races.js";

const _pGetRenderOpts = async () => {
	switch (globalThis._SEO_PAGE) {
		case "spells": {
			const subclassLookup = await DataUtil.class.pGetSubclassLookup();
			return {
				subclassLookup,
				settings: SettingsUtil.getDefaultSettings(RenderSpellsSettings.SETTINGS),
				isSkipExcludesRender: true,
			};
		}

		default: return {isSkipExcludesRender: true};
	}
};

const onLoadSeo = async () => {
	await I18nUtil.loadProperties(I18nUtil.LANGUAGES_INDEX);

	const fullPage = `${globalThis._SEO_PAGE}.html`;
	const [it, renderOpts] = await Promise.all([
		DataLoader.pCacheAndGet(fullPage, globalThis._SEO_SOURCE, globalThis._SEO_HASH),
		_pGetRenderOpts(),
	]);

	document.title = `${it.name} - 5etools`;
	veEs(`.page__title`).vee.txt(`${UrlUtil.PG_TO_NAME[fullPage] || globalThis._SEO_PAGE.toTitleCase()}: ${it.name}`);

	veT`<div class="ve-col-12 ve-flex-vh-center ve-my-2 ve-pt-3 ve-print__hidden">
		<button class="ve-btn ve-btn-primary">
			<a href="/${globalThis._SEO_PAGE}.html" style="font-size: 1.7em; color: white;">查看全部</a>
		</button>
	</div>`.vee.appendTo(veEs(`#link-page`));

	const wrpContent = veEs(`#wrp-pagecontent`);

	const eleContent = veEs(`#pagecontent`).vee.addClass("ve-shadow-big").vee.empty();

	veEm(`.nav__link`)
		.forEach((ele) => {
			const href = ele.vee.attr("href");
			if (!href.startsWith("http") && href.endsWith(".html")) ele.vee.attr("href", `../${href}`);

			if (href.startsWith("https://wiki.tercept.net")) ele.remove();
		});

	switch (globalThis._SEO_PAGE) {
		case "backgrounds": eleContent.vee.appends(RenderBackgrounds.getRenderedBackground(it, renderOpts)); break;
		case "spells": eleContent.vee.appends(RenderSpells.getRenderedSpell(it, renderOpts)); break;
		case "bestiary": {
			Renderer.utils.bindPronounceButtons();
			eleContent.vee.appends(RenderBestiary.getRenderedCreature(it, {...renderOpts, isSkipTokenRender: true}));
			break;
		}
		case "conditionsdiseases": eleContent.vee.appends(RenderConditionDiseases.getRenderedConditionDisease(it, renderOpts)); break;
		case "feats": eleContent.vee.appends(RenderFeats.getRenderedFeat(it, renderOpts)); break;
		case "items": eleContent.vee.appends(RenderItems.getRenderedItem(it, renderOpts)); break;
		case "races": {
			Renderer.utils.bindPronounceButtons();
			eleContent.vee.appends(RenderRaces.getRenderedRace(it, renderOpts));
			break;
		}
		case "items": eleContent.vee.appends(RenderItems.getRenderedItem(it, {isSkipExcludesRender: true})); break;

		// TODO expand this as required
		// case "races": {
		// 	Renderer.utils.bindPronounceButtons();
		// 	break;
		// }
	}

	if (globalThis._SEO_FLUFF) {
		const fluff = await DataLoader.pCacheAndGet(`${fullPage}fluff`, globalThis._SEO_SOURCE, globalThis._SEO_HASH);
		if (fluff) {
			const eleFluff = Renderer.hover.getHoverContent_fluff(globalThis._SEO_PAGE, fluff, null, {isSkipNameRow: true, isSkipPageRow: true})
				.vee.addClass("ve-shadow-big")
				.vee.addClass("ve-stats--book")
				.vee.addClass("ve-stats--book-large");
			veT`<div class="ve-mt-5 ve-py-2">${eleFluff}</div>`.vee.insertAfter(wrpContent);
		}
	}
};

window.addEventListener("load", () => {
	onLoadSeo().then(null);
});
