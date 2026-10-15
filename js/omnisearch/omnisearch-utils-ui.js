import {OmnisearchBacking} from "./omnisearch-backing.js";
import {PARTNERED_CONTENT_MODE_NONE, PARTNERED_CONTENT_MODE_TEXT, PARTNERED_CONTENT_MODE_TOOLTIP, PARTNERED_CONTENT_MODES} from "./omnisearch-consts.js";

export class OmnisearchUtilsUi {
	static _isFauxPage (resultDoc) {
		return !!resultDoc.hx;
	}

	static getResultHref (resultDoc) {
		const isFauxPage = this._isFauxPage(resultDoc);
		if (isFauxPage) return null;
		return resultDoc.c === Parser.CAT_ID_PAGE ? resultDoc.u : `${Renderer.get().baseUrl}${UrlUtil.categoryToPage(resultDoc.c)}#${resultDoc.uh || resultDoc.u}`;
	}

	static getResultLink (resultDoc) {
		const isFauxPage = this._isFauxPage(resultDoc);

		if (isFauxPage) return veT`<span tabindex="0" ${resultDoc.h ? this._getResultLink_getHoverString(resultDoc.c, resultDoc.u, resultDoc.s, {isFauxPage}) : ""} class="omni__lnk-name ve-help">${resultDoc.cf}: ${resultDoc.n}</span>`;

		const href = this.getResultHref(resultDoc);
		return veT`<a href="${href}" ${resultDoc.h ? this._getResultLink_getHoverString(resultDoc.c, resultDoc.u, resultDoc.s, {isFauxPage}) : ""} class="omni__lnk-name">${resultDoc.cf}: ${resultDoc.cn ?? resultDoc.n}</a>`;
	}

	static _getResultLink_getHoverString (category, url, src, {isFauxPage = false} = {}) {
		return Renderer.hover.getHoverElementAttributes({
			page: UrlUtil.categoryToHoverPage(category),
			source: src,
			hash: url,
			isFauxPage,
		});
	}

	/* -------------------------------------------- */

	static bindBtnCyclePartneredMode ({btn, omnisearchState, fnDoSearch}) {
		btn
			.vee.onn("click", () => {
				omnisearchState.setPartneredMode(PARTNERED_CONTENT_MODES.getNext(omnisearchState.getPartneredMode()));
			})
			.vee.onn("contextmenu", evt => {
				evt.preventDefault();
				omnisearchState.setPartneredMode(PARTNERED_CONTENT_MODES.getPrevious(omnisearchState.getPartneredMode()));
			});

		omnisearchState.addHookPartnered((val) => {
			btn
				.vee.tooltip(PARTNERED_CONTENT_MODE_TOOLTIP[omnisearchState.getPartneredMode()] || "")
				.vee.txt(PARTNERED_CONTENT_MODE_TEXT[omnisearchState.getPartneredMode()])
				.vee.toggleClass("ve-active", omnisearchState.getPartneredMode() !== PARTNERED_CONTENT_MODE_NONE);
			if (val != null) fnDoSearch().then(null);
		})();
	}

	/* -------------------------------------------- */

	static addScrollTopFloat () {
		// "To top" button
		const btnToTop = veT`<button class="ve-btn ve-btn-sm ve-btn-default" title="回到顶部"><span class="glyphicon glyphicon-arrow-up"></span></button>`
			.vee.onn("click", () => MiscUtil.scrollPageTop());

		const wrpTop = veT`<div class="bk__to-top ve-print__hidden">
			${btnToTop}
		</div>`.vee.appendTo(document.body);

		veE({ele: window})
			.vee.onn("scroll", () => {
				wrpTop.vee.toggleClass("bk__to-top--scrolled", window.scrollY > 50);
			});

		return wrpTop;
	}

	/* -------------------------------------------- */

	static doShowHelp ({isIncludeHotkeys = false} = {}) {
		const {eleModalInner} = UiUtil.getShowModal({
			title: "帮助",
			isMinHeight0: true,
			isUncappedHeight: true,
			isMaxWidth640p: true,
		});

		const ptCategoriesShort = Object.entries(OmnisearchBacking.getCategoryAliasesShort())
			.sort(([shortA], [shortB]) => SortUtil.ascSortLower(shortA, shortB))
			.map(([short, longs]) => {
				return `<li class="ve-flex">
					<span class="ve-inline-block ve-min-w-60p ve-text-right"><code>in:${short}</code></span>
					<span class="ve-mx-2">&rarr;</span>
					<span class="ve-flex-wrap">${longs.map(long => `<code>in:${long.toLowerCase()}</code>`).join("/")}</span>
				</li>`;
			})
			.join("");

		eleModalInner.vee.appends(`
			<p>支持以下搜索语法：</p>
			<ul>
				<li><code>source:&lt;缩写&gt;</code>：<code>&lt;缩写&gt;</code> 为来源或书籍名称的缩写（如 &quot;PHB&quot;、&quot;MM&quot;）</li>
				<li><code>page:&lt;页码&gt;</code> 或 <code>page:&lt;起始页&gt;-&lt;结束页&gt;</code></li>
				<li>
					<code>in:&lt;类别&gt;</code>：<code>&lt;类别&gt;</code> 可使用 &quot;spell&quot;、&quot;item&quot;、&quot;bestiary&quot; 等类别代码。
					<br>
					可使用以下 <code>&lt;类别&gt;</code> 简写：
				</li>
				<ul>
					${ptCategoriesShort}
				</ul>
			</ul>
			${this._doShowHelp_getPtHotkeys({isIncludeHotkeys})}
			<p>在值前加 <code>!</code> 可以反选，例如 <code>in:!bestiary</code> 或 <code>page:!1-100</code>。</p>
		`);
	}

	static _doShowHelp_getPtHotkeys ({isIncludeHotkeys}) {
		if (!isIncludeHotkeys) return ``;

		const keysInput = [
			{keys: ["↵"], description: `打开第一项结果`},
			{keys: ["CTRL", "↵"], description: `<span>${Renderer.get().render(`在{@5etools 搜索页面|search.html}查看结果`)}</span>`},
			{keys: ["↓"], description: `选中第一项结果`},
			{keys: ["PgUp"], description: `查看上一页结果`},
			{keys: ["PgDn"], description: `查看下一页结果`},
		];

		const keysResults = [
			{keys: ["↑"], description: `选中上一项结果`},
			{keys: ["↓"], description: `选中下一项结果`},
			{keys: ["←"], description: `跳转到上一页结果`},
			{keys: ["→"], description: `跳转到下一页结果`},
			{keys: ["PgUp"], description: `跳转到上一页结果`},
			{keys: ["PgDn"], description: `跳转到下一页结果`},
			{keys: ["Home"], description: `跳转到第一页结果`},
			{keys: ["End"], description: `跳转到最后一页结果`},
		];

		const getPtKeys = keys => {
			return keys
				.map(({keys, description}) => {
					return `<div class="ve-flex">
					<span class="ve-inline-block ve-min-w-60p ve-text-right">${keys.map(it => `<kbd>${it}</kbd>`).join("+")}</span>
					<span class="ve-mx-2">&rarr;</span>
					<span class="ve-flex-wrap">${description}</span>
				</div>`;
				})
				.join("");
		};

		return `<hr class="ve-hr-2">
		<div class="ve-mb-1">可使用以下快捷键：</div>
		<div class="ve-ml-2 ve-mb-1"><i>焦点位于搜索框时：</i></div>
		<div class="ve-pl-80p ve-mb-2">${getPtKeys(keysInput)}</div>
		<div class="ve-ml-2 ve-mb-1"><i>焦点位于结果链接时：</i></div>
		<div class="ve-pl-80p ve-mb-2">${getPtKeys(keysResults)}</div>`;
	}
}
