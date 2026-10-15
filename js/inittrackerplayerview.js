import {
	InitiativeTrackerPlayerMessageHandlerV0,
	InitiativeTrackerPlayerMessageHandlerV1,
	InitiativeTrackerPlayerUiV0,
	InitiativeTrackerPlayerUiV1,
} from "./initiativetracker/initiativetracker-player.js";

window.addEventListener("load", async () => {
	await Promise.all([
		PrereleaseUtil.pInit(),
		BrewUtil2.pInit(),
	]);
	ExcludeUtil.pInitialise().then(null); // don't await, as this is only used for search

	const hash = window.location.hash.slice(1);

	const views = new InitTrackerPlayerViews();
	views.init({hash});

	Hist.replaceHistoryHash("");

	window.dispatchEvent(new Event("toolsLoaded"));
});

/// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

class InitTrackerPlayerViews extends BaseComponent {
	constructor () {
		super();

		TabUiUtil.decorate(this, {isInitMeta: true});
	}

	init ({hash}) {
		const {v0: tokenV0, v1: tokenV1} = this.constructor._getTokens({hash});

		const wrpContent = veEs(`#page-content`).vee.empty();

		const iptTabMetas = [
			new TabUiUtil.TabMeta({name: "标准", hasBorder: true, hasBackground: true}),
			new TabUiUtil.TabMeta({name: "手动（旧版）", hasBorder: true, hasBackground: true}),
		];

		const tabMetas = this._renderTabs(iptTabMetas, {eleParent: wrpContent, additionalClassesWrpHeads: "initp__fullscreen-hidden"});
		const [tabMetaV1, tabMetaV0] = tabMetas;

		const viewV1 = new InitTrackerPlayerViewV1({parent: this});
		const viewV0 = new InitTrackerPlayerViewV0({parent: this});

		viewV1.render({tabMeta: tabMetaV1, token: tokenV1});
		viewV0.render({tabMeta: tabMetaV0, token: tokenV0});
	}

	static _getTokens ({hash}) {
		hash = (hash || "").trim();
		if (!hash) return {v0: null, v1: null};

		if (hash.startsWith("v1:")) return {v0: null, v1: hash.slice(3)};
		if (hash.startsWith("v0:")) return {v0: hash.slice(3), v1: null};
		return {v0: null, v1: hash};
	}
}

/// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

class InitiativeTrackerPlayerMessageHandlerPageV1 extends InitiativeTrackerPlayerMessageHandlerV1 {
	constructor (wrpTab) {
		super(false);
		this._wrpTab = wrpTab;
	}

	initUi () {
		if (this._isUiInit) return;

		this._isUiInit = true;
		this._wrpTab.vee.findAll(`.initp__initial`).forEach(ele => ele.remove());
		this._wrpTab.vee.findAll(`.initp__wrp_active`).forEach(ele => ele.vee.show());

		this._eleMeta = this._wrpTab.vee.find(`.initp__meta`);
		this._eleHead = this._wrpTab.vee.find(`.initp__header`);
		this._eleRows = this._wrpTab.vee.find(`.initp__rows`);
	}

	static initUnloadMessage () {
		window.addEventListener("beforeunload", evt => {
			const message = `连接将会关闭`;
			(evt || window.event).message = message;
			return message;
		});
	}
}

/**
 * PeerJS implementation.
 */
class InitTrackerPlayerViewV1 {
	constructor ({parent}) {
		this._parent = parent;
	}

	render ({tabMeta, token}) {
		const view = new InitiativeTrackerPlayerMessageHandlerPageV1(tabMeta.wrpTab);

		const iptPlayerName = veT`<input class="ve-form-control ve-code">`
			.vee.onn("change", () => iptServerToken.vee.removeClass("form-control--error"))
			.vee.disableSpellcheck();

		const iptServerToken = veT`<input class="ve-form-control ve-code">`
			.vee.onn("change", () => iptPlayerName.vee.removeClass("form-control--error"))
			.vee.disableSpellcheck();

		if (token) iptServerToken.vee.val(token);

		const btnConnect = veT`<button class="ve-btn ve-btn-xs ve-btn-primary">连接</button>`
			.vee.onn("click", async () => {
				if (!iptPlayerName.vee.val().trim()) return iptPlayerName.vee.addClass("form-control--error");
				if (!iptServerToken.vee.val().trim()) return iptServerToken.vee.addClass("form-control--error");

				try {
					btnConnect.vee.attr("disabled", true);
					const ui = new InitiativeTrackerPlayerUiV1(view, iptPlayerName.vee.val(), iptServerToken.vee.val());
					await ui.pInit();
					InitiativeTrackerPlayerMessageHandlerPageV1.initUnloadMessage();
					view.initUi();
				} catch (e) {
					btnConnect.vee.attr("disabled", false);
					throw e;
				}
			});

		veT(tabMeta.wrpTab)`<div class="ve-flex-col initp__content ve-px-2 ve-py-3 ve-min-h-0">
			<div class="initp__initial row">
				<div class="ve-col-12">
					<p>
						先攻追踪器玩家视图使用点对点连接，让玩家查看<a href="dmscreen.html">地下城主屏幕</a>中的先攻追踪器。玩家的操作步骤如下：
					<ol>
						<li>在“玩家姓名”输入框中填写姓名。</li>
						<li>将地下城主提供的服务端令牌粘贴到“服务端令牌”输入框。</li>
						<li>点击“连接”。</li>
					</ol>
					<p>稍等片刻，即可连接到地下城主并查看先攻追踪器。<i>此功能仍处于实验阶段，实际体验可能有所不同。</i></p>
				</div>
			</div>

			<hr class="initp__initial">

			<div class="initp__initial row ve-w-100 ve-flex">
				<div class="ve-col-5 ve-bold ve-mr-4">玩家姓名</div>
				<div class="ve-col-5 ve-bold">服务端令牌</div>
				<div class="ve-col-2 ve-text-center"></div>
			</div>
			<div class="initp__initial row ve-w-100 ve-flex ve-mb-4">
				<div class="ve-col-5 ve-bold ve-mr-4">${iptPlayerName}</div>
				<div class="ve-col-5 ve-bold">${iptServerToken}</div>
				<div class="ve-col-2 ve-flex-vh-center">${btnConnect}</div>
			</div>

			<div class="initp__wrp_active">
				<div class="initp__meta"></div>
				<div class="initp__header"></div>
				<div class="initp__rows"></div>
			</div>
		</div>`;

		const eleBody = veE(document.body);
		eleBody
			.vee.onn("keypress", (evt) => {
				if (this._parent._getActiveTab() !== tabMeta) return;

				if (EventUtil.getKeyIgnoreCapsLock(evt) === "f" && EventUtil.noModifierKeys(evt) && !EventUtil.isInInput(evt)) {
					evt.preventDefault();

					if (view.isActive) eleBody.vee.toggleClass("is-fullscreen");
				}
			});
	}
}

/// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

class InitiativeTrackerPlayerMessageHandlerPageV0 extends InitiativeTrackerPlayerMessageHandlerV0 {
	constructor (wrpTab) {
		super(false);
		this._wrpTab = wrpTab;
	}

	initUi () {
		if (this._isUiInit) return;

		this._isUiInit = true;
		this._wrpTab.vee.findAll(`.initp__initial`).forEach(ele => ele.remove());
		this._wrpTab.vee.findAll(`.initp__wrp_active`).forEach(ele => ele.vee.show());

		this._eleMeta = this._wrpTab.vee.find(`.initp__meta`);
		this._eleHead = this._wrpTab.vee.find(`.initp__header`);
		this._eleRows = this._wrpTab.vee.find(`.initp__rows`);

		window.addEventListener("beforeunload", evt => {
			if (this._clientData.client.isActive) {
				const message = `连接将会关闭`;
				(evt || window.event).message = message;
				return message;
			}
		});
	}
}

/**
 * Legacy implementation.
 */
class InitTrackerPlayerViewV0 {
	constructor ({parent}) {
		this._parent = parent;
	}

	render ({tabMeta, token}) {
		const view = new InitiativeTrackerPlayerMessageHandlerPageV0(tabMeta.wrpTab);

		const iptServerToken = veT`<input class="ve-form-control ve-code">`.vee.disableSpellcheck();

		if (token) iptServerToken.vee.val(token);

		const btnGenClientToken = veT`<button class="ve-btn ve-btn-xs ve-btn-primary">生成客户端令牌</button>`
			.vee.onn("click", () => dispWarning.remove());

		const iptClientToken = veT`<input class="ve-form-control ve-code ve-copyable" readonly disabled>`.vee.disableSpellcheck();

		const ui = new InitiativeTrackerPlayerUiV0(view, iptServerToken, btnGenClientToken, iptClientToken);
		ui.init();

		const dispWarning = veT`<div class="alert alert-warning ve-my-3">
			<p>强烈建议使用&quot;标准&quot;模式，因为它更简单。 如果标准模式不可用，&quot;手动（旧版）&quot;模式可以代替使用。</p>
		</div>`;

		veT(tabMeta.wrpTab)`<div class="ve-flex-col initp__content ve-px-2 ve-py-3 ve-min-h-0">
			${dispWarning}

			<div class="initp__initial ve-flex">
				<div class="ve-col-12">
					<p>
						先攻追踪器玩家视图使用点对点连接，让玩家查看地下城主的先攻追踪器。玩家的操作步骤如下：
					<ol>
						<li>将地下城主提供的服务端令牌粘贴到“服务端令牌”输入框，然后点击“生成客户端令牌”。</li>
						<li>等待“客户端令牌”显示，复制其中的内容并发送给地下城主。</li>
					</ol>
					<p>地下城主接受你的令牌后，此页面会显示先攻追踪器中的战斗。</p>
				</div>
			</div>

			<hr class="initp__initial">

			<div class="initp__initial ve-flex-h-center ve-w-100">
				<div class="ve-col-5 ve-bold">服务端令牌</div>
				<div class="ve-col-2 ve-text-center"></div>
				<div class="ve-col-5 ve-bold">客户端令牌</div>
			</div>
			<div class="initp__initial ve-flex-h-center ve-w-100 flex ve-mb-4">
				<div class="ve-col-5 ve-bold">${iptServerToken}</div>
				<div class="ve-col-2 ve-flex-vh-center">${btnGenClientToken}</div>
				<div class="ve-col-5 ve-bold">${iptClientToken}</div>
			</div>

			<div class="initp__wrp_active">
				<div class="initp__meta"></div>
				<div class="initp__header"></div>
				<div class="initp__rows"></div>
			</div>
		</div>`;

		const eleBody = veE(document.body);
		eleBody.vee.onn("keypress", (evt) => {
			if (this._parent._getActiveTab() !== tabMeta) return;

			if (EventUtil.getKeyIgnoreCapsLock(evt) === "f" && EventUtil.noModifierKeys(evt) && !EventUtil.isInInput(evt)) {
				evt.preventDefault();

				if (view.isActive) eleBody.vee.toggleClass("is-fullscreen");
			}
		});
	}
}
