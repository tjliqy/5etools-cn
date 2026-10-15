window.addEventListener("DOMContentLoaded", () => {
	if (typeof [].flat === "function") return;

	document.body.classList.add("edge__body");

	const btnClose = document.createElement("button");
	btnClose.className = "ve-btn ve-btn-danger edge__btn-close";
	btnClose.innerHTML = `<span class="glyphicon glyphicon-remove"></span>`;
	btnClose.addEventListener("click", () => {
		eleOverlay.remove();
		document.body.classList.remove("edge__body");
	});

	const eleOverlay = document.createElement("div");
	eleOverlay.className = "ve-flex-col ve-flex-vh-center edge__overlay";
	eleOverlay.innerHTML = `<div class="ve-flex-col ve-flex-vh-center">
		<div class="edge__title ve-mb-2">请更新浏览器</div>
		<div><i>您使用的浏览器版本过旧或不受支持。<br>
		5etools 推荐使用最新版 <a href="https://www.google.com/chrome/" class="edge__link">Chrome</a> 或 <a href="https://www.mozilla.org/firefox/" class="edge__link">Firefox</a>。</i></div>
	</div>`;

	eleOverlay.prepend(btnClose);

	document.body.appendChild(eleOverlay);
});

window.addEventListener("load", () => {
	if (!navigator.userAgent.includes("FoundryVirtualTabletop")) return;

	const btnGoBack = veT`<button class="ve-btn ve-btn-default ve-btn-xxs">返回</button>`
		.vee.onn("click", () => {
			history.back();
		});

	JqueryUtil.doToast({
		content: veT`<div>您正在使用 Foundry 应用程序！部分模组功能可能无法使用或运行异常。建议改用<a href="https://foundryvtt.com/article/installation/#dedicated">独立或无界面服务器</a>，并通过浏览器连接。您也可以点击${btnGoBack}。</div>`
			.vee.onn("click", evt => {
				evt.stopPropagation();
			}),
		type: "warning",
		isAutoHide: false,
	});
});
