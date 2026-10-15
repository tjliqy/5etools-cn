import {ManageExternalUtils} from "./manageexternal/manageexternal-utils.js";

class IndexPage {
	static async _pOnLoad_pInitGeneric () {
		await Promise.all([
			PrereleaseUtil.pInit(),
			BrewUtil2.pInit(),
		]);
		ExcludeUtil.pInitialise().then(null);
	}

	static _pOnLoad_initElements () {
		const AFDIAN_URL = "";

		veEs(`#current_year`).vee.txt((new Date()).getFullYear());

		veEs(`#version_number`).vee.txt(VERSION_NUMBER).vee.attr("href", `https://github.com/5etools-mirror-3/5etools-src/releases/latest`);

		veEs(`#wrp-donate`)
			.vee.html(`
				<div class="home__donation">
					<div class="home__donation-block">
						<p class="home__donation-lead">本站无广告、无付费墙，所有内容都可以免费使用。如果你愿意帮忙分担一部分服务器、CDN 和持续维护成本，欢迎自愿支持本站运营。</p>
						<div class="home__donation-tags">
							<span class="home__donation-tag">服务器</span>
							<span class="home__donation-tag">CDN/带宽</span>
							<span class="home__donation-tag">站点维护与更新</span>
						</div>
						<p class="home__donation-note">捐赠完全自愿，不影响任何功能使用。希望在支持者名单中留名、留言或保留更清晰的支持记录，建议使用爱发电；若希望低调匿名支持，可直接使用微信或支付宝二维码。</p>
					</div>
					<div class="home__donation-grid">
						<section class="home__donation-card">
							<div class="home__donation-card-head">
								<div class="fab fa-alipay home__donation-icon" aria-hidden="true"></div>
								<div>
									<h4 class="home__donation-title">支付宝</h4>
									<p class="home__donation-subtitle">适合匿名、直接扫码支持</p>
								</div>
							</div>
							<div class="home__donation-qr-wrap">
								<img class="home__donation-qr" src="${Renderer.get().getMediaUrl("img", "alipay.jpg")}" alt="支付宝捐赠二维码" loading="lazy">
							</div>
							<p class="home__donation-caption">可截图保存后在支付宝内识别，或直接使用手机扫码。</p>
						</section>
						<section class="home__donation-card">
							<div class="home__donation-card-head">
								<div class="fab fa-weixin home__donation-icon" aria-hidden="true"></div>
								<div>
									<h4 class="home__donation-title">微信支付</h4>
									<p class="home__donation-subtitle">适合匿名、移动端快速支持</p>
								</div>
							</div>
							<div class="home__donation-qr-wrap">
								<img class="home__donation-qr" src="${Renderer.get().getMediaUrl("img", "wechat.png")}" alt="微信支付捐赠二维码" loading="lazy">
							</div>
							<p class="home__donation-caption">微信扫码即可完成支持，也可以先保存二维码再进入微信识别。</p>
						</section>
						<section class="home__donation-card home__donation-card--link">
							<div class="home__donation-card-head">
								<div class="fal fa-heart home__donation-icon" aria-hidden="true"></div>
								<div>
									<h4 class="home__donation-title">爱发电</h4>
									<p class="home__donation-subtitle">适合希望留名、留言或长期支持的朋友</p>
								</div>
							</div>
							<p class="home__donation-caption">如果你希望通过创作者平台支持本站，并在后续支持者名单中更方便地留名，建议使用爱发电。</p>
							<div class="home__donation-link-wrap">
								${AFDIAN_URL
									? `<a class="ve-btn ve-btn-default home__donation-link-btn" href="${AFDIAN_URL}" target="_blank" rel="noopener noreferrer">前往爱发电支持</a>`
									: `<span class="home__donation-link-placeholder">待配置爱发电主页链接</span>`}
							</div>
						</section>
					</div>
					<div class="home__donation-support">
						<div class="home__donation-support-copy">
							<h4 class="home__donation-title">也欢迎非金钱支持</h4>
							<p class="home__donation-caption">反馈错译、提交建议、参与搬运或分享给团友，都会直接帮助本站变得更好。</p>
						</div>
						<div class="home__donation-actions">
							<a class="ve-btn ve-btn-default" href="https://qm.qq.com/cgi-bin/qm/qr?k=zo7jw88cLsqp2hAkK3ssn_kEbtvy8vu4&jump_from=webapi&authKey=yyG97ItP+M1BGl171cFJ+vzAmHZGRMdvKompSckZjpj8gYcCUV/3efeHvaD3850/" target="_blank" rel="noopener noreferrer">反馈问题</a>
							<a class="ve-btn ve-btn-default" href="https://github.com/tjliqy/5etools-cn/tree/cn2.0" target="_blank" rel="noopener noreferrer">查看开源代码</a>
						</div>
					</div>
				</div>
			`);
		// es(`#wrp-patreon`)
		// 	.vee.html(`<a href="https://www.patreon.com/bePatron?u=22018559" rel="noopener noreferrer"><img src="${Renderer.get().getMediaUrl("img", "patreon.webp")}" alt="Become a Patron" style="width: 217px; height: 51px"></a>`);

		veEm(`[data-link-type="better20"]`)
			.forEach(lnk => lnk.vee.attr("href", `${lnk.vee.attr("href")}?v=${VERSION_NUMBER}_${Date.now()}`));

		window.__cmp2 = () => {
			alert("此功能只能在正式部署的网站上使用！");
		};
	}

	static async _pOnLoad_pAddHashChangeListener () {
		window.addEventListener("hashchange", () => this._pOnHashChange());
		await this._pOnHashChange();
	}

	static async pOnLoad () {
		await this._pOnLoad_pInitGeneric();
		this._pOnLoad_initElements();
		await this._pOnLoad_pAddHashChangeListener();

		window.dispatchEvent(new Event("toolsLoaded"));
	}

	/* -------------------------------------------- */

	static _HASHCHANGE_LOCK = null;

	static async _pOnHashChange () {
		this._HASHCHANGE_LOCK ||= new VeLock();
		try {
			await this._HASHCHANGE_LOCK.pLock();
			await this._pOnHashChange_();
		} finally {
			this._HASHCHANGE_LOCK.unlock();
		}
	}

	static async _pOnHashChange_ () {
		await ManageExternalUtils.pAddSourcesFromHash();
	}
}

window.addEventListener("load", () => IndexPage.pOnLoad());
