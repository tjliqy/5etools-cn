import {UtilsOmnisearch} from "./utils-omnisearch.js";
import {OmnisearchBacking} from "./omnisearch/omnisearch-backing.js";
import {OmnisearchUtilsUi} from "./omnisearch/omnisearch-utils-ui.js";

class TermsPage {
	static _TERMS_DATA_URL = "docs/terms-20260922-142718.json";
	static _TERMS_CACHE_NAME = "5etools-terms-v1";
	static _BUQUANSHU_API_URL = "https://5echmsearch.kagangtuya.top/api/search";
	static _BUQUANSHU_SITE_URL = "https://5echm.kagangtuya.top/";
	static _PAGE_SIZE = 10;
	static _BUQUANSHU_PAGE_SIZE = 10;

	static _els = {};
	static _requestId = 0;
	static _termsData = null;
	static _termsLoadError = null;

	static async pInit () {
		await Promise.all([
			PrereleaseUtil.pInit(),
			BrewUtil2.pInit(),
		]);
		ExcludeUtil.pInitialise().then(null);

		this._render();
		this._setFormFromUrl();
		try {
			await this._pLoadTermsData();
		} catch (error) {
			this._termsLoadError = error;
		}
		await this._pSearch({isSetUrl: false});
		window.dispatchEvent(new Event("toolsLoaded"));
	}

	static _render () {
		const main = document.getElementById("main_content");
		main.innerHTML = `
			<div class="ve-flex-col pg-terms__layout">
				<div class="pg-terms__banner">参与术语库共建，请加入QQ群1045869232</div>
				<div id="terms-download" class="pg-terms__download pg-terms__panel ve-hidden">
					<div id="terms-download-label" class="ve-mb-1">正在准备术语库……</div>
					<progress id="terms-download-progress" class="ve-w-100" max="100"></progress>
				</div>
				<section class="pg-terms__panel">
					<form id="terms-form">
						<div class="ve-flex ve-input-group">
							<input id="terms-query" class="ve-form-control" type="search" autocomplete="off" placeholder="输入英文或中文术语，同时查询三个资料库……">
							<button class="ve-btn ve-btn-primary" type="submit"><span class="glyphicon glyphicon-search"></span> 查询</button>
						</div>
						<details class="pg-terms__filter-details ve-mt-2">
							<summary class="ve-btn ve-btn-default pg-terms__filter-toggle">术语库筛选</summary>
							<div class="pg-terms__filters ve-mt-2">
								<label class="pg-terms__label">分类编码<input id="terms-category" class="ve-form-control" placeholder="如 spell"></label>
								<label class="pg-terms__label">来源<input id="terms-source" class="ve-form-control" placeholder="如 PHB, XPHB"></label>
								<label class="pg-terms__label">状态<select id="terms-status" class="ve-form-control"><option value="">全部</option><option value="0">已确定</option><option value="1">待讨论</option></select></label>
								<label class="pg-terms__label">排序<select id="terms-sort" class="ve-form-control"><option value="+en">英文升序</option><option value="-en">英文降序</option><option value="+cn">中文升序</option><option value="-cn">中文降序</option><option value="-modified_at">最近修改</option><option value="+modified_at">最早修改</option></select></label>
							</div>
							<label class="ve-flex-v-center ve-mt-2"><input id="terms-exact" type="checkbox"> <span class="ve-ml-1">精确匹配术语</span></label>
						</details>
					</form>
				</section>

				<section class="pg-terms__panel">
					<div class="ve-flex-v-center ve-flex-h-between"><h2 class="ve-my-0">术语库</h2><span id="terms-count" class="ve-muted"></span></div>
					<div id="terms-results" class="ve-mt-2"></div>
					<div id="terms-pagination" class="ve-flex-vh-center ve-mt-2"></div>
				</section>

				<div class="ve-flex ve-mobile-md__flex-col pg-terms__layout">
					<section class="pg-terms__panel ve-w-50 ve-mobile-md__w-100">
						<div class="ve-flex-v-center ve-flex-h-between"><h2 class="ve-my-0">本站搜索</h2><span id="site-count" class="ve-muted"></span></div>
						<div id="site-results" class="ve-mt-2"></div>
					</section>
					<section class="pg-terms__panel ve-w-50 ve-mobile-md__w-100">
						<div class="ve-flex-v-center ve-flex-h-between"><h2 class="ve-my-0">5E 不全书</h2><span id="bqs-count" class="ve-muted"></span></div>
						<div id="bqs-results" class="ve-mt-2"></div>
						<div id="bqs-pagination" class="ve-flex-vh-center ve-mt-2"></div>
					</section>
				</div>
			</div>`;

		this._els = {
			form: document.getElementById("terms-form"),
			download: document.getElementById("terms-download"),
			downloadLabel: document.getElementById("terms-download-label"),
			downloadProgress: document.getElementById("terms-download-progress"),
			query: document.getElementById("terms-query"),
			category: document.getElementById("terms-category"),
			source: document.getElementById("terms-source"),
			status: document.getElementById("terms-status"),
			sort: document.getElementById("terms-sort"),
			exact: document.getElementById("terms-exact"),
			termsCount: document.getElementById("terms-count"),
			termsResults: document.getElementById("terms-results"),
			pagination: document.getElementById("terms-pagination"),
			siteCount: document.getElementById("site-count"),
			siteResults: document.getElementById("site-results"),
			bqsCount: document.getElementById("bqs-count"),
			bqsResults: document.getElementById("bqs-results"),
			bqsPagination: document.getElementById("bqs-pagination"),
		};

		this._els.form.addEventListener("submit", evt => {
			evt.preventDefault();
			this._pSearch({page: 1, bqsPage: 1, isSetUrl: true}).then(null);
		});
	}

	static _setFormFromUrl () {
		const params = new URLSearchParams(location.search);
		this._els.query.value = params.get("q") || "";
		this._els.category.value = params.get("category") || "";
		this._els.source.value = params.get("source") || "";
		this._els.status.value = params.get("status") || "";
		this._els.sort.value = params.get("sort") || "+en";
		this._els.exact.checked = params.get("exact") === "1";
	}

	static _getState ({page = null, bqsPage = null} = {}) {
		const urlParams = new URLSearchParams(location.search);
		return {
			query: this._els.query.value.trim(),
			category: this._els.category.value.trim(),
			source: this._els.source.value.trim(),
			status: this._els.status.value,
			sort: this._els.sort.value,
			exact: this._els.exact.checked,
			page: page || Math.max(Number(urlParams.get("page")) || 1, 1),
			bqsPage: bqsPage || Math.max(Number(urlParams.get("bqsPage")) || 1, 1),
		};
	}

	static _setUrl (state) {
		const params = new URLSearchParams();
		if (state.query) params.set("q", state.query);
		if (state.category) params.set("category", state.category);
		if (state.source) params.set("source", state.source);
		if (state.status !== "") params.set("status", state.status);
		if (state.sort !== "+en") params.set("sort", state.sort);
		if (state.exact) params.set("exact", "1");
		if (state.page > 1) params.set("page", state.page);
		if (state.bqsPage > 1) params.set("bqsPage", state.bqsPage);
		history.replaceState(null, "", `${location.pathname}${params.size ? `?${params}` : ""}`);
	}

	static async _pSearch ({page = null, bqsPage = null, isSetUrl = false} = {}) {
		const state = this._getState({page, bqsPage});
		if (isSetUrl) this._setUrl(state);
		const requestId = ++this._requestId;

		this._setLoading();
		const [termsMeta, siteMeta, bqsMeta] = await Promise.all([
			this._pGetTerms(state),
			this._pGetSiteResults(state.query),
			this._pGetBuquanshuResults(state.query, state.bqsPage),
		]);
		if (requestId !== this._requestId) return;

		this._renderTerms(termsMeta, state);
		this._renderSiteResults(siteMeta);
		this._renderBuquanshuResults(bqsMeta, state);
	}

	static _setLoading () {
		[this._els.termsResults, this._els.siteResults, this._els.bqsResults]
			.forEach(ele => ele.innerHTML = `<div class="ve-muted ve-py-3">查询中...</div>`);
		[this._els.termsCount, this._els.siteCount, this._els.bqsCount]
			.forEach(ele => ele.textContent = "");
		this._els.pagination.innerHTML = "";
		this._els.bqsPagination.innerHTML = "";
	}

	static async _pLoadTermsData () {
		const url = new URL(this._TERMS_DATA_URL, location.href).href;
		let cache = null;
		let cachedResponse = null;
		let previousCachedResponse = null;

		if ("caches" in globalThis) {
			try {
				cache = await caches.open(this._TERMS_CACHE_NAME);
				cachedResponse = await cache.match(url);
				if (!cachedResponse) previousCachedResponse = await this._pGetLatestCachedTermsResponse(cache);
			} catch (ignored) {
				// Continue without persistent caching when Cache Storage is unavailable.
			}
		}

		if (cachedResponse) {
			try {
				this._termsData = await this._pParseTermsResponse(cachedResponse);
				return;
			} catch (ignored) {
				if (cache) await cache.delete(url);
			}
		}

		let downloadedResponse = null;
		try {
			downloadedResponse = await this._pDownloadTermsData(url);
		} catch (error) {
			if (!previousCachedResponse) throw error;
			this._termsData = await this._pParseTermsResponse(previousCachedResponse);
			return;
		}
		this._termsData = await this._pParseTermsResponse(downloadedResponse.clone());
		if (cache) {
			try {
				await cache.put(url, downloadedResponse);
				await this._pDeleteOldTermsCacheEntries(cache, url);
			} catch (ignored) {
				// The current session can still use the downloaded data if persistence fails.
			}
		}
	}

	static async _pGetLatestCachedTermsResponse (cache) {
		const requests = (await cache.keys())
			.map(request => ({request, timestamp: this._getTermsFileTimestamp(request.url)}))
			.filter(meta => meta.timestamp)
			.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
		return requests.length ? cache.match(requests[0].request) : null;
	}

	static async _pDeleteOldTermsCacheEntries (cache, currentUrl) {
		const requests = await cache.keys();
		await Promise.all(requests
			.filter(request => request.url !== currentUrl && this._getTermsFileTimestamp(request.url))
			.map(request => cache.delete(request)));
	}

	static _getTermsFileTimestamp (url) {
		return /\/terms-(\d{8}-\d{6})\.json(?:$|[?#])/u.exec(url)?.[1] || null;
	}

	static async _pDownloadTermsData (url) {
		this._setDownloadProgress({isVisible: true, loaded: 0, total: 0});
		try {
			const response = await fetch(url, {cache: "no-store"});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			if (!response.body) return response;

			const total = Number(response.headers.get("content-length")) || 0;
			const reader = response.body.getReader();
			const chunks = [];
			let loaded = 0;

			while (true) {
				const {done, value} = await reader.read();
				if (done) break;
				chunks.push(value);
				loaded += value.byteLength;
				this._setDownloadProgress({isVisible: true, loaded, total});
			}

			return new Response(new Blob(chunks, {type: "application/json"}), {
				status: response.status,
				statusText: response.statusText,
				headers: response.headers,
			});
		} finally {
			this._setDownloadProgress({isVisible: false});
		}
	}

	static _setDownloadProgress ({isVisible, loaded = 0, total = 0}) {
		this._els.download.classList.toggle("ve-hidden", !isVisible);
		if (!isVisible) return;

		const loadedText = this._getDisplayFileSize(loaded);
		if (total) {
			const percent = Math.min(Math.round(loaded / total * 100), 100);
			this._els.downloadProgress.value = percent;
			this._els.downloadLabel.textContent = `正在下载术语库：${percent}%（${loadedText} / ${this._getDisplayFileSize(total)}）`;
			return;
		}

		this._els.downloadProgress.removeAttribute("value");
		this._els.downloadLabel.textContent = `正在下载术语库：${loadedText}`;
	}

	static _getDisplayFileSize (bytes) {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
	}

	static async _pParseTermsResponse (response) {
		const data = await response.json();
		if (!data || !Array.isArray(data.items)) throw new Error("术语库文件格式不正确");
		return data;
	}

	static async _pGetTerms (state) {
		if (!this._termsData) return {error: this._termsLoadError || new Error("术语库尚未加载")};

		const query = state.query.toLocaleLowerCase();
		const isChinese = /[\u3400-\u9fff]/u.test(state.query);
		const sourceQueries = state.source.split(/[,，\n]+/u).map(it => it.trim().toLocaleLowerCase()).filter(Boolean);
		const items = this._termsData.items
			.filter(item => {
				if (query) {
					const value = String(isChinese ? item.cn : item.en).toLocaleLowerCase();
					if (state.exact ? value !== query : !value.includes(query)) return false;
				}
				if (state.category && !String(item.category).toLocaleLowerCase().includes(state.category.toLocaleLowerCase())) return false;
				if (sourceQueries.length) {
					const itemSources = String(item.source).toLocaleLowerCase();
					if (!sourceQueries.some(source => itemSources.includes(source))) return false;
				}
				return state.status === "" || Number(item.to_be_discussed) === Number(state.status);
			})
			.sort(this._getTermsSort(state.sort));
		const start = (state.page - 1) * this._PAGE_SIZE;
		return {data: {count: items.length, items: items.slice(start, start + this._PAGE_SIZE)}};
	}

	static _getTermsSort (sort) {
		const direction = sort.startsWith("-") ? -1 : 1;
		const field = sort.slice(1);
		return (a, b) => direction * String(a[field] ?? "").localeCompare(String(b[field] ?? ""), "zh-CN", {numeric: true, sensitivity: "base"});
	}

	static async _pGetSiteResults (query) {
		if (!query) return {results: []};
		try {
			return {results: (await OmnisearchBacking.pGetResults(query)).slice(0, 10)};
		} catch (error) {
			return {error};
		}
	}

	static async _pGetBuquanshuResults (query, page) {
		if (!query) return {results: [], total: 0, page};
		const url = new URL(this._BUQUANSHU_API_URL);
		url.search = new URLSearchParams({keyword: query, titleOnly: "false", category: "all", page, pageSize: this._BUQUANSHU_PAGE_SIZE});
		try {
			const response = await fetch(url, {headers: {Accept: "application/json"}});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const payload = await response.json();
			if (!Array.isArray(payload.results)) throw new Error("接口返回格式不正确");
			return {results: payload.results, total: Number(payload.total) || 0, page: Number(payload.page) || page};
		} catch (error) {
			return {error};
		}
	}

	static _renderTerms (meta, state) {
		if (meta.error) {
			this._renderError(this._els.termsResults, meta.error);
			return;
		}

		const count = Number(meta.data.count) || 0;
		this._els.termsCount.textContent = `${count} 条`;
		this._els.termsResults.innerHTML = "";
		if (!meta.data.items.length) {
			this._renderEmpty(this._els.termsResults, "没有符合条件的术语。");
			return;
		}

		meta.data.items.forEach(item => {
			const row = document.createElement("article");
			row.className = "pg-terms__term";
			const heading = document.createElement("div");
			heading.className = "pg-terms__term-name";
			heading.textContent = `${item.en || "—"} · ${item.cn || "—"}`;
			row.append(heading);

			const metaLine = document.createElement("div");
			metaLine.className = "ve-flex-v-center ve-flex-wrap ve-mt-1";
			this._appendBadge(metaLine, item.category_label || item.category || "未分类");
			this._appendBadge(metaLine, item.source_label || item.source || "来源未知");
			if (item.to_be_discussed === 1) this._appendBadge(metaLine, "待讨论", true);
			row.append(metaLine);

			if (item.note) this._appendTextLine(row, "备注", item.note);
			if (item.modified_reson) this._appendTextLine(row, "修改说明", item.modified_reson);
			if (item.modified_at || item.modified_by_nickname) {
				this._appendTextLine(row, "最后修改", [item.modified_at, item.modified_by_nickname].filter(Boolean).join(" · "));
			}
			this._els.termsResults.append(row);
		});

		this._renderPagination({count, state});
	}

	static _appendBadge (parent, text, isPending = false) {
		const badge = document.createElement("span");
		badge.className = `pg-terms__badge ve-mr-1 ve-mb-1${isPending ? " pg-terms__badge--pending" : ""}`;
		badge.textContent = text;
		parent.append(badge);
	}

	static _appendTextLine (parent, label, text) {
		const line = document.createElement("div");
		line.className = "ve-small ve-mt-1";
		const strong = document.createElement("strong");
		strong.textContent = `${label}：`;
		line.append(strong, document.createTextNode(text));
		parent.append(line);
	}

	static _renderPagination ({count, state}) {
		const totalPages = Math.max(Math.ceil(count / this._PAGE_SIZE), 1);
		if (totalPages <= 1) return;
		const previous = this._getPageButton("上一页", state.page <= 1, () => this._pChangePage(state.page - 1));
		const label = document.createElement("span");
		label.className = "ve-mx-2";
		label.textContent = `第 ${state.page} / ${totalPages} 页`;
		const next = this._getPageButton("下一页", state.page >= totalPages, () => this._pChangePage(state.page + 1));
		this._els.pagination.replaceChildren(previous, label, next);
	}

	static _getPageButton (text, isDisabled, onClick) {
		const button = document.createElement("button");
		button.className = "ve-btn ve-btn-default";
		button.type = "button";
		button.disabled = isDisabled;
		button.textContent = text;
		button.addEventListener("click", onClick);
		return button;
	}

	static async _pChangePage (page) {
		await this._pSearch({page, isSetUrl: true});
		this._els.termsResults.closest("section").scrollIntoView({behavior: "smooth", block: "start"});
	}

	static _renderSiteResults (meta) {
		if (meta.error) return this._renderError(this._els.siteResults, meta.error);
		this._els.siteCount.textContent = meta.results.length ? `前 ${meta.results.length} 条` : "";
		this._els.siteResults.innerHTML = "";
		if (!meta.results.length) return this._renderEmpty(this._els.siteResults, "输入关键词以查询本站资料。");

		meta.results.forEach(result => {
			const doc = result.doc;
			const unpacked = UtilsOmnisearch.getUnpackedSearchResult(doc);
			const row = document.createElement("div");
			row.className = "pg-terms__result";
			const title = document.createElement("div");
			title.append(OmnisearchUtilsUi.getResultLink(doc));
			const detail = document.createElement("div");
			detail.className = "ve-muted ve-small ve-mt-1";
			detail.textContent = [doc.cf, unpacked.sourceFull, unpacked.page ? `${unpacked.page}页` : ""].filter(Boolean).join(" · ");
			row.append(title, detail);
			this._els.siteResults.append(row);
		});
	}

	static _renderBuquanshuResults (meta, state) {
		if (meta.error) return this._renderError(this._els.bqsResults, meta.error);
		this._els.bqsCount.textContent = meta.total ? `${meta.total} 条` : "";
		this._els.bqsResults.innerHTML = "";
		if (!meta.results.length) return this._renderEmpty(this._els.bqsResults, "输入关键词以查询不全书。");

		meta.results.forEach(item => {
			const row = document.createElement("article");
			row.className = "pg-terms__result";
			const link = document.createElement("a");
			link.target = "_blank";
			link.rel = "noopener noreferrer";
			link.href = new URL(String(item.path || "").replace(/^\/+/, ""), this._BUQUANSHU_SITE_URL);
			link.textContent = item.title || item.rawTitle || "未命名页面";
			row.append(link);
			if (item.category || item.sourcePath) this._appendTextLine(row, item.category || "来源", item.sourcePath || "");
			if (item.preview) {
				const preview = document.createElement("div");
				preview.className = "pg-terms__preview ve-small ve-muted ve-mt-1";
				preview.textContent = this._getTruncatedText(item.preview, 260);
				row.append(preview);
			}
			this._els.bqsResults.append(row);
		});

		this._renderBuquanshuPagination({count: meta.total, state});
	}

	static _renderBuquanshuPagination ({count, state}) {
		const totalPages = Math.max(Math.ceil(count / this._BUQUANSHU_PAGE_SIZE), 1);
		if (totalPages <= 1) return;
		const previous = this._getPageButton("上一页", state.bqsPage <= 1, () => this._pChangeBuquanshuPage(state.bqsPage - 1));
		const label = document.createElement("span");
		label.className = "ve-mx-2";
		label.textContent = `第 ${state.bqsPage} / ${totalPages} 页`;
		const next = this._getPageButton("下一页", state.bqsPage >= totalPages, () => this._pChangeBuquanshuPage(state.bqsPage + 1));
		this._els.bqsPagination.replaceChildren(previous, label, next);
	}

	static async _pChangeBuquanshuPage (bqsPage) {
		await this._pSearch({bqsPage, isSetUrl: true});
		this._els.bqsResults.closest("section").scrollIntoView({behavior: "smooth", block: "start"});
	}

	static _getTruncatedText (text, maxLength) {
		const clean = String(text).replace(/\s+/g, " ").trim();
		return clean.length > maxLength ? `${clean.slice(0, maxLength).trim()}…` : clean;
	}

	static _renderError (parent, error) {
		parent.innerHTML = "";
		const message = document.createElement("div");
		message.className = "ve-alert ve-alert-danger ve-my-2";
		message.textContent = `查询失败：${error.message || error}`;
		parent.append(message);
	}

	static _renderEmpty (parent, text) {
		parent.innerHTML = "";
		const message = document.createElement("div");
		message.className = "ve-muted ve-py-3";
		message.textContent = text;
		parent.append(message);
	}
}

window.addEventListener("load", () => TermsPage.pInit());
