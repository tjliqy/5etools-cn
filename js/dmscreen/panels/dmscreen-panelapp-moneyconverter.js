import {DmScreenPanelAppBase} from "./dmscreen-panelapp-base.js";

class _MoneyConverterUnit {
	constructor (name, multiplier, abbreviation) {
		this.n = name;
		this.mult = multiplier;
		this.abbv = abbreviation;
	}
}

/**
 * A simple money converter, i.e.: input x electrum, y silver, z copper and get the total in gold, or in any other type of coin chosen.
 */
export class MoneyConverter extends DmScreenPanelAppBase {
	constructor (...args) {
		super(...args);

		this._selOut = null;
		this._iptSplit = null;
		this._wrpRows = null;
		this._disabledCurrency = null;
	}

	_getPanelElement (board, state) {
		this._disabledCurrency = state.d || {};

		const COIN_WEIGHT = 0.02;
		const CURRENCY = [
			new _MoneyConverterUnit("铜币", 1, "cp"),
			new _MoneyConverterUnit("银币", 10, "sp"),
			new _MoneyConverterUnit("银金币", 50, "ep"),
			new _MoneyConverterUnit("金币", 100, "gp"),
			new _MoneyConverterUnit("铂金币", 1000, "pp"),
			new _MoneyConverterUnit(`尖儿 (${Parser.sourceJsonToAbv(Parser.SRC_WDH)})`, 1, "nib"),
			new _MoneyConverterUnit(`碎子 (${Parser.sourceJsonToAbv(Parser.SRC_WDH)})`, 10, "shard"),
			new _MoneyConverterUnit(`陶尔 (${Parser.sourceJsonToAbv(Parser.SRC_WDH)})`, 200, "taol"),
			new _MoneyConverterUnit(`龙 (${Parser.sourceJsonToAbv(Parser.SRC_WDH)})`, 100, "dgn"),
			new _MoneyConverterUnit(`太阳 (${Parser.sourceJsonToAbv(Parser.SRC_WDH)})`, 1000, "sun"),
			new _MoneyConverterUnit(`湾月 (${Parser.sourceJsonToAbv(Parser.SRC_WDH)})`, 5000, "moon"),
		];
		const CURRENCY_INDEXED = [...CURRENCY].map((it, i) => {
			it.ix = i;
			return it;
		}).reverse();
		const DEFAULT_CURRENCY = 3;

		const wrpConverter = veT`<div class="dm_money dm__panel-bg ve-split-column"></div>`;

		const doUpdate = () => {
			if (!this._wrpRows.vee.findAll(`.dm-money__row`)) {
				addRow();
			}

			Object.entries(this._disabledCurrency).forEach(([currency, disabled]) => {
				this._selOut.vee.find(`option[value="${currency}"]`).vee.toggle(!disabled);
			});
			// if the current choice is disabled, deselect it, and restart
			if (this._disabledCurrency[this._selOut.vee.val()]) {
				this._selOut.vee.val("-1");
				doUpdate();
				return;
			}

			const elesRows = this._wrpRows.vee.findAll(`.dm-money__row`);
			elesRows.forEach(ele => ele.vee.removeClass("form-control--error"));
			this._iptSplit.vee.removeClass("form-control--error");

			const outCurrency = Number(this._selOut.vee.val()) || 0;

			const outParts = [];
			let totalWeight = 0;

			const splitBetweenStr = (this._iptSplit.vee.val() || "").trim();
			let split = 1;
			if (splitBetweenStr) {
				const splitBetweenNum = Number(splitBetweenStr);
				if (isNaN(splitBetweenNum)) this._iptSplit.vee.addClass("form-control--error");
				else split = splitBetweenNum;
			}

			if (outCurrency === -1) { // only split, don't convert
				const totals = [];
				const extras = [];
				const allowedCategories = new Set();

				elesRows.forEach((ele) => {
					const strVal = (ele.vee.find(`input`).vee.val() || "").trim();
					if (strVal) {
						const asNum = Number(strVal);
						if (isNaN(asNum)) ele.vee.addClass("form-control--error");
						else {
							const ix = Number(ele.vee.find(`select`).vee.val());
							totals[ix] = (totals[ix] || 0) + asNum;
							allowedCategories.add(CURRENCY[ix]._cat);
						}
					}
				});

				if (split > 1) {
					CURRENCY_INDEXED.forEach((c, i) => {
						const it = totals[c.ix];
						if (it) {
							let remainder = (it % split) * c.mult;
							totals[c.ix] = Math.floor(it / split);

							for (let j = i + 1; j < CURRENCY_INDEXED.length; ++j) {
								const nxtCurrency = CURRENCY_INDEXED[j];

								// skip and convert to a smaller denomination as required
								if (this._disabledCurrency[nxtCurrency.ix]) continue;

								if (remainder >= nxtCurrency.mult) {
									totals[nxtCurrency.ix] = (totals[nxtCurrency.ix] || 0) + Math.floor(remainder / nxtCurrency.mult);
									remainder %= nxtCurrency.mult;
								}
							}
						}
					});
				}

				CURRENCY_INDEXED.forEach(c => {
					const it = totals[c.ix] || 0;
					const itExtra = extras[c.ix] || 0;
					if (it || itExtra) {
						const val = it + itExtra;
						totalWeight += val * COIN_WEIGHT;
						outParts.push(`${val.toLocaleStringVe()} ${c.abbv}`);
					}
				});
			} else {
				let total = 0;
				elesRows.forEach((ele) => {
					const strVal = (ele.vee.find(`input`).vee.val() || "").trim();
					if (strVal) {
						const asNum = Number(strVal);
						if (isNaN(asNum)) ele.vee.addClass("form-control--error");
						else {
							total += asNum * (CURRENCY[ele.vee.find(`select`).vee.val()] || CURRENCY).mult;
						}
					}
				});

				const totalSplit = Math.floor(total / split);

				const toCurrencies = CURRENCY_INDEXED.filter(it => !this._disabledCurrency[it.ix] && it.ix <= outCurrency);
				let copper = totalSplit;
				toCurrencies.forEach(c => {
					if (copper >= c.mult) {
						const remainder = copper % c.mult;
						const theseCoins = Math.floor(copper / c.mult);
						totalWeight += COIN_WEIGHT * theseCoins;
						copper = remainder;
						outParts.push(`${theseCoins.toLocaleStringVe()} ${c.abbv}`);
					}
				});
			}

			iptOut.vee.val(`${outParts.join("; ")}${totalWeight ? ` (${totalWeight.toLocaleStringVe()} lb.)` : ""}`);

			board.doSaveStateDebounced();
		};

		const buildCurrencySelect = (isOutput) => veT`<select class="ve-form-control ve-input-sm ve-p-2">${isOutput ? `<option value="-1">(未指定)</option>` : ""}${CURRENCY.map((c, i) => `<option value="${i}">${c.n.qq()}</option>`).join("")}</select>`;

		const addRow = (currency, count) => {
			const eleRow = veT`<div class="dm-money__row"></div>`.vee.appendTo(this._wrpRows);
			const iptCount = veT`<input type="number" step="1" placeholder="数量" class="ve-form-control ve-input-sm">`.vee.appendTo(eleRow).vee.onn("change", doUpdate);
			if (count != null) iptCount.vee.val(count);
			const selCurrency = buildCurrencySelect()
				.vee.val(currency == null ? `${DEFAULT_CURRENCY}` : currency)
				.vee.appendTo(eleRow)
				.vee.onn("change", doUpdate);
			const btnRemove = veT`<button class="ve-btn ve-btn-sm ve-btn-danger" title="删除此行"><span class="glyphicon glyphicon-trash"></span></button>`
				.vee.appendTo(eleRow)
				.vee.onn("click", () => {
					eleRow.remove();
					doUpdate();
				});
		};

		this._wrpRows = veT`<div class="dm-money__rows"></div>`.vee.appendTo(wrpConverter);

		const wrpCtrl = veT`<div class="ve-split dm-money__ctrl"></div>`.vee.appendTo(wrpConverter);
		const wrpCtrlLhs = veT`<div class="dm-money__ctrl__lhs ve-split-child" style="width: 66%;"></div>`.vee.appendTo(wrpCtrl);
		const wrpBtnAddSettings = veT`<div class="ve-split"></div>`.vee.appendTo(wrpCtrlLhs);
		const btnAddRow = veT`<button class="ve-btn ve-btn-primary ve-btn-sm" title="添加一行"><span class="glyphicon glyphicon-plus"></span></button>`
			.vee.appendTo(wrpBtnAddSettings)
			.vee.onn("click", () => {
				addRow();
				doUpdate();
			});
		const btnSettings = veT`<button class="ve-btn ve-btn-default ve-btn-sm" title="设置"><span class="glyphicon glyphicon-cog"></span></button>`
			.vee.appendTo(wrpBtnAddSettings)
			.vee.onn("click", () => {
				const {eleModalInner} = UiUtil.getShowModal({
					title: "设置",
					cbClose: () => doUpdate(),
				});
				[...CURRENCY_INDEXED].reverse().forEach(cx => {
					UiUtil.getAddModalRowCb(eleModalInner, `在输出中禁用 ${cx.n}`, this._disabledCurrency, cx.ix);
				});
			});
		const iptOut = veT`<input class="ve-form-control ve-input-sm dm-money__out" disabled/>`
			.vee.appendTo(wrpCtrlLhs)
			.vee.onn("mousedown", async () => {
				await MiscUtil.pCopyTextToClipboard(iptOut.vee.val());
				JqueryUtil.showCopiedEffect(iptOut);
			});

		const wrpCtrlRhs = veT`<div class="dm-money__ctrl__rhs ve-split-child" style="width: 33%;"></div>`.vee.appendTo(wrpCtrl);
		this._iptSplit = veT`<input type="number" min="1" step="1" placeholder="分成...份" class="ve-form-control ve-input-sm">`.vee.appendTo(wrpCtrlRhs).vee.onn("change", doUpdate);
		this._selOut = buildCurrencySelect(true)
			.vee.val(`${DEFAULT_CURRENCY}`)
			.vee.appendTo(wrpCtrlRhs)
			.vee.onn("change", doUpdate);

		if (state) {
			this._selOut.vee.val(state.c == null ? `${DEFAULT_CURRENCY}` : state.c);
			this._iptSplit.vee.val(state.s);
			(state.r || []).forEach(r => addRow(r.c, r.n));
		}

		doUpdate();

		return wrpConverter;
	}

	getState () {
		return {
			c: this._selOut.vee.val(),
			s: this._iptSplit.vee.val(),
			r: this._wrpRows.vee.findAll(`.dm-money__row`)
				.map((ele) => {
					return {
						c: ele.vee.find(`select`).vee.val(),
						n: ele.vee.find(`input`).vee.val(),
					};
				}),
			d: this._disabledCurrency,
		};
	}
}
