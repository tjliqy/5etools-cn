"use strict";

import {Ro_Lexer, Ro_Parser, Ro_Lang} from "./rolang.js";

class LangDemoUi {
	static init () {
		veEs(`#btn__run`).vee.onn("click", () => LangDemoUi.pRun());
		veEs(`#btn__validate`).vee.onn("click", async () => {
			const msg = await Ro_Lang.pValidate(LangDemoUi._ipt.vee.val(), LangDemoUi.RESOLVER);
			LangDemoUi._handleInvalidMessage(msg);
		});
		veEs(`#btn__resolve_dynamics`).vee.onn("click", async () => {
			const val = await Ro_Lang.pResolveDynamics(LangDemoUi._ipt.vee.val(), LangDemoUi.RESOLVER);
			LangDemoUi._ipt.vee.val(val);
		});
		veEs(`#btn__validate_dynamics`).vee.onn("click", async () => {
			const msg = await Ro_Lang.pValidateDynamics(LangDemoUi._ipt.vee.val(), LangDemoUi.RESOLVER);
			LangDemoUi._handleInvalidMessage(msg);
		});

		// region select sample
		const selSample = veEs(`#sel__sample`);
		LangDemoUi._SAMPLES.forEach((it, i) => {
			selSample.vee.appends(`<option value="${i}">${it.name}</option>`);
		});
		selSample.vee.onn("change", () => {
			const sample = LangDemoUi._SAMPLES[selSample.vee.val()];
			LangDemoUi._ipt.vee.val(sample.code).vee.trigger("change");
		});
		selSample.vee.val("-1");
		// endregion

		// region input
		LangDemoUi._ipt = veEs(`#ipt`);
		LangDemoUi._ipt.vee.onn("change", () => {
			StorageUtil.syncSetForPage("input", LangDemoUi._ipt.vee.val());
		});
		const prevInput = StorageUtil.syncGetForPage("input");
		if (prevInput && prevInput.trim()) LangDemoUi._ipt.vee.val(prevInput.trim());
		// endregion

		// region context
		const saveContext = () => {
			const toSave = LangDemoUi._metasContext.map(it => ({name: it.iptName.vee.val(), val: it.iptVal.vee.val()}));
			StorageUtil.syncSetForPage("context", toSave);
		};

		const loadContext = () => {
			const loaded = StorageUtil.syncGetForPage("context");
			if (loaded != null) {
				loaded.forEach(it => addContextRow(it.name, it.val));
			}
		};

		const addContextRow = (name, value) => {
			const iptName = veT`<input class="ve-form-control form-control--minimal ve-input-xs ve-mr-2 ve-code" placeholder="标识符">`
				.vee.onn("change", () => saveContext())
				.vee.val(name);

			const iptVal = veT`<input class="ve-form-control form-control--minimal ve-input-xs ve-mr-2 ve-code" type="number" placeholder="值">`
				.vee.onn("change", () => saveContext())
				.vee.val(value);

			const btnDel = veT`<button class="ve-btn ve-btn-xs ve-btn-danger" tabindex="-1"><span class="glyphicon glyphicon-trash"></span></button>`
				.vee.onn("click", () => {
					const ix = LangDemoUi._metasContext.indexOf(out);
					if (~ix) {
						LangDemoUi._metasContext.splice(ix, 1);
						row.remove();
						saveContext();
					}
				});

			const out = {iptName, iptVal};
			LangDemoUi._metasContext.push(out);
			const row = veT`<div class="ve-mb-2 ve-flex-v-center">${iptName}<span class="ve-mr-2">=</span>${iptVal}${btnDel}</div>`.vee.appendTo(LangDemoUi._wrpContext);
		};

		LangDemoUi._wrpContext = veEs(`#wrp_context`);
		const btnAdd = veT`<button class="ve-btn ve-btn-xs ve-btn-default">添加上下文</button>`
			.vee.onn("click", () => addContextRow());
		veT`<div class="ve-mb-2 ve-flex-v-center">${btnAdd}</div>`.vee.appendTo(LangDemoUi._wrpContext);

		loadContext();
		// endregion

		window.dispatchEvent(new Event("toolsLoaded"));
	}

	static _handleInvalidMessage (msg) {
		if (msg) JqueryUtil.doToast({content: `无效：${msg}`, type: "danger"});
		else JqueryUtil.doToast({content: "有效！", type: "success"});
	}

	static async pRun () {
		const ipt = LangDemoUi._ipt.vee.val().trim();

		// Check if valid, but continue execution regardless to ease debugging
		const invalidMsg = await Ro_Lang.pValidate(ipt, LangDemoUi.RESOLVER);
		if (invalidMsg) LangDemoUi._handleInvalidMessage(invalidMsg);

		const dispOutLexed = veEs(`#out_lexed`).vee.html("");
		const dispOutParsed = veEs(`#out_parsed`).vee.html("");
		const dispOutResult = veEs(`#out_result`).vee.html("");

		const lexer = new Ro_Lexer();
		const lexed = lexer.lex(ipt);

		dispOutLexed.vee.html(lexed.map(it => it ? it.toDebugString() : "").join("\n"));

		const parser = new Ro_Parser(lexed);
		const parsed = parser.parse();

		dispOutParsed.vee.html(`${parsed}`);

		const ctx = LangDemoUi._metasContext
			.mergeMap(it => ({[it.iptName.vee.val().trim()]: Number(it.iptVal.vee.val()) || 0}));
		const result = await parsed.pEvl(ctx, LangDemoUi.RESOLVER);
		if (result.isCancelled) dispOutResult.vee.txt("已取消！");
		else dispOutResult.vee.txt(result.val == null ? `(null)` : result.val);
	}
}
LangDemoUi._ipt = null;
LangDemoUi._wrpContext = null;
LangDemoUi._metasContext = [];
LangDemoUi._SAMPLES = [
	{
		name: "空白",
		code: `



`,
	},
	{
		name: "数字",
		code: `1`,
	},
	{
		name: "求和",
		code: `1 + 1`,
	},
	{
		name: "乘法",
		code: `2 * 3`,
	},
	{
		name: "指数",
		code: `3^3^2  # 结果应为 19683`,
	},
	{
		name: "如果／否则如果／否则",
		code: `if r == 20: 1
elif r > 1:
  2
else:
  3
4`,
	},
	{
		name: "如果／否则如果",
		code: `if r == 20: 1
elif r > 1:
  2`,
	},
	{
		name: "如果／否则",
		code: `if r == 20: 1
else:
  2`,
	},
	{
		name: "如果",
		code: `if r == 20: 1`,
	},
	{
		name: "如果（后续返回值）",
		code: `if r == 20: 1
2`,
	},
	{
		name: "条件取反",
		code: `if not r: 2`,
	},
	{
		name: "括号",
		code: `(2 + 3) * 4  # 结果应为 20`,
	},
	{
		name: "动态整数",
		code: `if @user_int > 10: 2`,
	},
	{
		name: "带标签的动态整数",
		code: `if (@user_int|请输入数字 /*+-^,!=（数字）) > 10: 2`,
	},
	{
		name: "可选择的动态整数",
		code: `if (@user_int|| 1 = 一个苹果| 2 = 两根香蕉 |3|4|11=11 个橙子) > 10: 2`,
	},
	{
		name: "动态布尔值",
		code: `if not @user_bool: 3`,
	},
	{
		name: "带标签的动态布尔值",
		code: `if not (@user_bool|Choose: /*+-^,!= (Yes\\No)): 4`,
	},
	{
		name: "自定义按钮的动态布尔值",
		code: `if (@user_bool||Good | Evil): 2`,
	},
	{
		name: "可选择的动态布尔值",
		code: `if not (@user_bool|Pick| true = Good| false = Evil |true|false|true=Lawful): 2`,
	},
];
LangDemoUi.RESOLVER = class {
	static has = () => true;

	static get = (path) => {
		const out = Math.round(Math.random() * 50);
		JqueryUtil.doToast(`已将 ${path} 随机设为 ${out}`);
		return out;
	};
};

window.addEventListener("load", () => LangDemoUi.init());
