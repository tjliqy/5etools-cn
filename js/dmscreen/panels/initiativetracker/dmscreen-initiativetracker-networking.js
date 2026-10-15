
class _InitiativeTrackerNetworkingP2pMetaV1 {
	constructor () {
		this.rows = [];
		this.serverInfo = null;
		this.serverPeer = null;
	}
}

class _InitiativeTrackerNetworkingP2pMetaV0 {
	constructor () {
		this.rows = [];
		this.serverInfo = null;
	}
}

export class InitiativeTrackerNetworking {
	constructor ({board}) {
		this._board = board;

		this._p2pMetaV1 = new _InitiativeTrackerNetworkingP2pMetaV1();
		this._p2pMetaV0 = new _InitiativeTrackerNetworkingP2pMetaV0();
	}

	/* -------------------------------------------- */

	sendStateToClients ({fnGetToSend}) {
		return this._sendMessageToClients({fnGetToSend});
	}

	sendShowImageMessageToClients ({imageHref}) {
		return this._sendMessageToClients({
			fnGetToSend: () => ({
				type: "showImage",
				payload: {
					imageHref,
				},
			}),
		});
	}

	_sendMessageToClients ({fnGetToSend}) {
		let toSend = null;

		// region V1
		if (this._p2pMetaV1.serverPeer) {
			if (!this._p2pMetaV1.serverPeer.hasConnections()) return;

			toSend ||= fnGetToSend();
			this._p2pMetaV1.serverPeer.pSendMessage(toSend);
		}
		// endregion

		// region V0
		if (this._p2pMetaV0.serverInfo) {
			this._p2pMetaV0.rows = this._p2pMetaV0.rows.filter(row => !row.isDeleted);
			this._p2pMetaV0.serverInfo = this._p2pMetaV0.serverInfo.filter(row => {
				if (row.isDeleted) {
					row.server.close();
					return false;
				}
				return true;
			});

			toSend ||= fnGetToSend();
			try {
				this._p2pMetaV0.serverInfo.filter(info => info.server.isActive).forEach(info => info.server.sendMessage(toSend));
			} catch (e) { setTimeout(() => { throw e; }); }
		}
		// endregion
	}

	/* -------------------------------------------- */

	/**
	 * @param opts
	 * @param opts.doUpdateExternalStates
	 * @param [opts.btnStartServer]
	 * @param [opts.btnGetToken]
	 * @param [opts.btnGetLink]
	 * @param [opts.fnDispServerStoppedState]
	 * @param [opts.fnDispServerRunningState]
	 */
	async startServerV1 (opts) {
		opts = opts || {};

		if (this._p2pMetaV1.serverPeer) {
			await this._p2pMetaV1.serverPeer.pInit();
			return {
				isRunning: true,
				token: this._p2pMetaV1.serverPeer?.token,
			};
		}

		try {
			if (opts.btnStartServer) opts.btnStartServer.vee.prop("disabled", true);
			this._p2pMetaV1.serverPeer = new PeerVeServer();
			await this._p2pMetaV1.serverPeer.pInit();
			if (opts.btnGetToken) opts.btnGetToken.vee.prop("disabled", false);
			if (opts.btnGetLink) opts.btnGetLink.vee.prop("disabled", false);

			this._p2pMetaV1.serverPeer.on("connection", connection => {
				const pConnected = new Promise(resolve => {
					connection.on("open", () => {
						resolve(true);
						opts.doUpdateExternalStates();
					});
				});
				const pTimeout = MiscUtil.pDelay(5 * 1000, false);
				Promise.race([pConnected, pTimeout])
					.then(didConnect => {
						if (!didConnect) {
							JqueryUtil.doToast({content: `连接“${connection.label.escapeQuotes()}”已超过 5 秒，可能需要重试。`, type: "warning"});
						}
					});
			});

			window.addEventListener("beforeunload", evt => {
				const message = `连接将被关闭`;
				(evt || window.event).message = message;
				return message;
			});

			if (opts.fnDispServerRunningState) opts.fnDispServerRunningState();

			return {
				isRunning: true,
				token: this._p2pMetaV1.serverPeer?.token,
			};
		} catch (e) {
			if (opts.fnDispServerStoppedState) opts.fnDispServerStoppedState();
			if (opts.btnStartServer) opts.btnStartServer.vee.prop("disabled", false);
			this._p2pMetaV1.serverPeer = null;
			JqueryUtil.doToast({content: `启动服务器失败！ ${VeCt.STR_SEE_CONSOLE}`, type: "danger"});
			setTimeout(() => { throw e; });
		}

		return {
			isRunning: false,
			token: this._p2pMetaV1.serverPeer?.token,
		};
	}

	handleClick_playerWindowV1 ({doUpdateExternalStates}) {
		const {eleModalInner} = UiUtil.getShowModal({
			title: "配置玩家视图",
			isUncappedHeight: true,
			isHeight100: true,
			cbClose: () => {
				if (this._p2pMetaV1.rows.length) {
					this._p2pMetaV1.rows
						.filter(row => !row.isStub)
						.forEach(row => row.eleRow.vee.detach());
				}
				if (this._p2pMetaV1.serverPeer) this._p2pMetaV1.serverPeer.offTemp("connection");
			},
		});

		const wrpHelp = UiUtil.getAddModalRow(eleModalInner, "div");

		const fnDispServerStoppedState = () => {
			btnStartServer.vee.html(`<span class="glyphicon glyphicon-play"></span> 启动服务端`).vee.prop("disabled", false);
			btnGetToken.vee.prop("disabled", true);
			btnGetLink.vee.prop("disabled", true);
		};

		const fnDispServerRunningState = () => {
			btnStartServer.vee.html(`<span class="glyphicon glyphicon-play"></span> 服务端运行中`).vee.prop("disabled", true);
			btnGetToken.vee.prop("disabled", false);
			btnGetLink.vee.prop("disabled", false);
		};

		const btnStartServer = veT`<button class="ve-btn ve-btn-default ve-mr-2"></button>`
			.vee.onn("click", async () => {
				const {isRunning} = await this.startServerV1({doUpdateExternalStates, btnStartServer, btnGetToken, btnGetLink, fnDispServerStoppedState, fnDispServerRunningState});
				if (!isRunning) return;

				this._p2pMetaV1.serverPeer.onTemp("connection", showConnected);
				showConnected();
			});

		const btnGetToken = veT`<button class="ve-btn ve-btn-default" disabled><span class="glyphicon glyphicon-copy"></span> 复制令牌</button>`.vee.appendTo(wrpHelp)
			.vee.onn("click", async () => {
				await MiscUtil.pCopyTextToClipboard(this._p2pMetaV1.serverPeer.token);
				JqueryUtil.showCopiedEffect(btnGetToken);
			});

		const btnGetLink = veT`<button class="ve-btn ve-btn-default ve-mr-2" disabled><span class="glyphicon glyphicon-link"></span> 复制链接</button>`.vee.appendTo(wrpHelp)
			.vee.onn("click", async () => {
				const cleanOrigin = window.location.origin.replace(/\/+$/, "");
				const cleanPathname = window.location.pathname.split("/").slice(0, -1).join("/");
				const url = `${cleanOrigin}${cleanPathname}/inittrackerplayerview.html#v1:${this._p2pMetaV1.serverPeer.token}`;
				await MiscUtil.pCopyTextToClipboard(url);
				JqueryUtil.showCopiedEffect(btnGetLink);
			});

		if (this._p2pMetaV1.serverPeer) fnDispServerRunningState();
		else fnDispServerStoppedState();

		veT`<div class="row ve-w-100">
			<div class="ve-col-12">
				<p>
				先攻追踪器玩家视图是一个P2P系统，允许玩家连接到DM的先攻追踪器。玩家应该使用<a href="inittrackerplayerview.html">先攻追踪器玩家视图</a>页面连接到DM的实例。作为DM，使用方法如下：
				<ol>
					<li>启动服务器。</li>
					<li>复制链接或令牌并与玩家分享。</li>
					<li>等待他们连接！</li>
				</ol>
				</p>
				<p>${btnStartServer}${btnGetLink}${btnGetToken}</p>
				<p><i>请注意！这是一个实验性功能。你的使用体验可能会有所不同。</i></p>
			</div>
		</div>`.vee.appendTo(wrpHelp);

		UiUtil.addModalSep(eleModalInner);

		const wrpConnected = UiUtil.getAddModalRow(eleModalInner, "div").vee.addClass("flx-col");

		const showConnected = () => {
			if (!this._p2pMetaV1.serverPeer) return wrpConnected.vee.html(`<div class="ve-w-100 ve-flex-vh-center"><i>客户端未连接。</i></div>`);

			let stack = `<div class="ve-w-100"><h5>已连接的客户端：</h5><ul>`;
			this._p2pMetaV1.serverPeer.getActiveConnections()
				.map(it => it.label || "（未知）")
				.sort(SortUtil.ascSortLower)
				.forEach(it => stack += `<li>${it.escapeQuotes()}</li>`);
			stack += "</ul></div>";
			wrpConnected.vee.html(stack);
		};

		if (this._p2pMetaV1.serverPeer) this._p2pMetaV1.serverPeer.onTemp("connection", showConnected);

		showConnected();
	}

	// nop on receiving a message; we want to send only
	// TODO expand this, to allow e.g. players to set statuses or assign damage/healing (at DM approval?)
	_playerWindowV0_DM_MESSAGE_RECEIVER = function () {};

	_playerWindowV0_DM_ERROR_HANDLER = function (err) {
		if (!this.isClosed) {
			// TODO: this could be better at handling `err.error == "RTCError: User-Initiated Abort, reason=Close called"`
			JqueryUtil.doToast({
				content: `服务器错误：\n${err ? (err.message || err.error || err) : "（未知错误）"}`,
				type: "danger",
			});
		}
	};

	async _playerWindowV0_pGetServerTokens ({rowMetas}) {
		const targetRows = rowMetas
			.filter(it => !it.isDeleted)
			.filter(it => !it.isActive);
		if (targetRows.every(it => it.isActive)) {
			return JqueryUtil.doToast({
				content: "没有需要生成服务端令牌的行！",
				type: "warning",
			});
		}

		let anyInvalidNames = false;
		targetRows
			.filter(row => !row.isStub)
			.forEach(row => {
				row.iptName.vee.removeClass("error-background");
				if (!row.iptName.vee.val().trim()) {
					anyInvalidNames = true;
					row.iptName.vee.addClass("error-background");
				}
			});
		if (anyInvalidNames) return;

		const names = targetRows
			.map(row => {
				row.isActive = true;

				if (row.isStub) return "";

				row.iptName.vee.attr("disabled", true);
				row.btnGenServerToken.vee.attr("disabled", true);

				return row.iptName.vee.val();
			});

		if (this._p2pMetaV0.serverInfo) {
			await this._p2pMetaV0.serverInfo;

			const serverInfo = await PeerUtilV0.pInitialiseServersAddToExisting(
				names,
				this._p2pMetaV0.serverInfo,
				this._playerWindowV0_DM_MESSAGE_RECEIVER,
				this._playerWindowV0_DM_ERROR_HANDLER,
			);

			return targetRows.map((row, i) => {
				row.name = serverInfo[i].name;
				row.serverInfo = serverInfo[i];
				if (!row.isStub) row.iptTokenServer.vee.val(serverInfo[i].textifiedSdp).vee.attr("disabled", false);

				serverInfo[i].rowMeta = row;

				if (!row.isStub) row.iptTokenClient.vee.attr("disabled", false);
				if (!row.isStub) row.btnAcceptClientToken.vee.attr("disabled", false);

				return serverInfo[i].textifiedSdp;
			});
		} else {
			this._p2pMetaV0.serverInfo = (async () => {
				this._p2pMetaV0.serverInfo = await PeerUtilV0.pInitialiseServers(names, this._playerWindowV0_DM_MESSAGE_RECEIVER, this._playerWindowV0_DM_ERROR_HANDLER);

				targetRows.forEach((row, i) => {
					row.name = this._p2pMetaV0.serverInfo[i].name;
					row.serverInfo = this._p2pMetaV0.serverInfo[i];
					if (!row.isStub) row.iptTokenServer.vee.val(this._p2pMetaV0.serverInfo[i].textifiedSdp).vee.attr("disabled", false);

					this._p2pMetaV0.serverInfo[i].rowMeta = row;

					if (!row.isStub) row.iptTokenClient.vee.attr("disabled", false);
					if (!row.isStub) row.btnAcceptClientToken.vee.attr("disabled", false);
				});
			})();

			await this._p2pMetaV0.serverInfo;
			return targetRows.map(row => row.serverInfo.textifiedSdp);
		}
	}

	handleClick_playerWindowV0 ({doUpdateExternalStates}) {
		const {eleModalInner} = UiUtil.getShowModal({
			title: "配置玩家视图",
			isUncappedHeight: true,
			isHeight100: true,
			cbClose: () => {
				if (!this._p2pMetaV0.rows.length) return;
				this._p2pMetaV0.rows
					.filter(row => !row.isStub)
					.forEach(row => row.eleRow.vee.detach());
			},
		});

		const wrpHelp = UiUtil.getAddModalRow(eleModalInner, "div");
		const btnAltAddPlayer = veT`<button class="ve-btn ve-btn-primary ve-btn-text-insert">添加玩家</button>`.vee.onn("click", () => btnAddClient.vee.trigger("click"));
		const btnAltGenAll = veT`<button class="ve-btn ve-btn-primary ve-btn-text-insert">生成全部</button>`.vee.onn("click", () => btnGenServerTokens.vee.trigger("click"));
		const btnAltCopyAll = veT`<button class="ve-btn ve-btn-primary ve-btn-text-insert">复制服务端令牌</button>`.vee.onn("click", () => btnCopyServers.vee.trigger("click"));
		veT`<div class="ve-flex ve-w-100">
			<div class="ve-col-12">
				<p>
				先攻追踪器玩家视图使用点对点连接，让玩家连接到地下城主的先攻追踪器。玩家应在<a href="inittrackerplayerview.html">先攻追踪器玩家视图</a>页面建立连接。地下城主的操作步骤如下：
				<ol>
						<li>添加所需数量的玩家("${btnAltAddPlayer}")，并输入玩家姓名（最好唯一）。</li>
						<li>点击“${btnAltGenAll}”为每位玩家生成服务端令牌。点击“${btnAltCopyAll}”可一次复制所有令牌，也可以逐个点击“服务端令牌”的值来复制。将令牌发给对应玩家，让他们粘贴到<a href="inittrackerplayerview.html">先攻追踪器玩家视图</a>页面并按照说明操作。</li>
						<li>
							获取每位玩家的客户端令牌，然后对每个令牌执行以下操作：
							<ol type="a">
								<li>点击“批量接受客户端”，粘贴包含多个客户端令牌的文本。<b>系统会从文本中提取令牌并忽略其他内容。</b>可以直接粘贴包含用户名和时间戳的聊天记录。</li>
								<li>也可以将令牌逐个粘贴到对应的“客户端令牌”字段，再点击“接受客户端”。令牌开头的几个字符包含玩家姓名，可用于辨认。</li>
							</ol>
						</li>
					</ol>
				</p>
					<p>接受玩家客户端后，玩家便会收到地下城主先攻追踪器的更新。<i>此功能仍处于实验阶段，实际体验可能有所不同。</i></p>
			</div>
		</div>`.vee.appendTo(wrpHelp);

		UiUtil.addModalSep(eleModalInner);

		const wrpTop = UiUtil.getAddModalRow(eleModalInner, "div");

		const btnAddClient = veT`<button class="ve-btn ve-btn-xs ve-btn-primary" title="添加客户端">${I18nUtil.get("page.dmscreen.add_player")}</button>`.vee.onn("click", () => addClientRow());

		const btnCopyServers = veT`<button class="ve-btn ve-btn-xs ve-btn-primary" title="复制所有未使用的服务端令牌">复制服务端令牌</button>`
			.vee.onn("click", async () => {
				const targetRows = this._p2pMetaV0.rows
					.filter(row => !row.isStub)
					.filter(it => !it.isDeleted && !it.iptTokenClient.vee.attr("disabled"));
				if (!targetRows.length) {
					JqueryUtil.doToast({
						content: "没有可复制的空闲服务端令牌，请先生成。",
						type: "warning",
					});
				} else {
					await MiscUtil.pCopyTextToClipboard(targetRows.map(it => it.iptTokenServer.vee.val()).join("\n\n"));
					JqueryUtil.showCopiedEffect(btnGenServerTokens);
				}
			});

		const btnAcceptClients = veT`<button class="ve-btn ve-btn-xs ve-btn-primary" title="可以粘贴包含客户端令牌的文本">批量接受客户端</button>`
			.vee.onn("click", () => {
				const {eleModalInner, doClose} = UiUtil.getShowModal({title: "批量接受客户端"});

				const iptText = veT`<textarea class="ve-form-control dm-init-pl__textarea ve-block ve-mb-2"></textarea>`
					.vee.onn("keydown", () => iptText.vee.removeClass("error-background"));

				const btnAccept = veT`<button class="ve-btn ve-btn-xs ve-btn-primary ve-block ve-text-center" title="添加客户端">批量接受客户端</button>`
					.vee.onn("click", async () => {
						iptText.vee.removeClass("error-background");
						const txt = iptText.vee.val();
						if (!txt.trim() || !PeerUtilV0.containsAnyTokens(txt)) {
							iptText.vee.addClass("error-background");
						} else {
							const connected = await PeerUtilV0.pConnectClientsToServers(this._p2pMetaV0.serverInfo, txt);
							this._board.doBindAlertOnNavigation();
							connected.forEach(serverInfo => {
								serverInfo.rowMeta.iptTokenClient.vee.val(serverInfo._tempTokenToDisplay || "").vee.attr("disabled", true);
								serverInfo.rowMeta.btnAcceptClientToken.vee.attr("disabled", true);
								delete serverInfo._tempTokenToDisplay;
							});
							doClose();
							doUpdateExternalStates();
						}
					});

				veT`<div>
					<p>粘贴包含一个或多个客户端令牌的文本，然后点击“批量接受客户端”。</p>
					${iptText}
					<div class="ve-flex-vh-center">${btnAccept}</div>
				</div>`.vee.appendTo(eleModalInner);
			});

		veT`
			<div class="ve-flex ve-w-100">
				<div class="ve-col-12">
					<div class="ve-flex-inline-v-center ve-mr-2">
						<span class="ve-mr-1">添加一个玩家(客户端):</span>
						${btnAddClient}
					</div>
					<div class="ve-flex-inline-v-center ve-mr-2">
						<span class="ve-mr-1">复制所有未使用的服务端令牌：</span>
						${btnCopyServers}
					</div>
					<div class="ve-flex-inline-v-center ve-mr-2">
						<span class="ve-mr-1">批量接受客户端:</span>
						${btnAcceptClients}
					</div>
				</div>
			</div>
		`.vee.appendTo(wrpTop);

		UiUtil.addModalSep(eleModalInner);

		const btnGenServerTokens = veT`<button class="ve-btn ve-btn-primary ve-btn-xs">生成所有</button>`
			.vee.onn("click", () => this._playerWindowV0_pGetServerTokens({rowMetas: this._p2pMetaV0.rows}));

		veT`<div class="ve-flex ve-w-100">
			<div class="ve-col-2 ve-bold">玩家名字</div>
			<div class="ve-col-3-5 ve-bold">服务端令牌</div>
			<div class="ve-col-1 ve-text-center">${btnGenServerTokens}</div>
			<div class="ve-col-3-5 ve-bold">客户端令牌</div>
		</div>`
			.vee.appendTo(UiUtil.getAddModalRow(eleModalInner, "div"));

		const _getEleRowTemplate = (
			iptName,
			iptTokenServer,
			btnGenServerToken,
			iptTokenClient,
			btnAcceptClientToken,
			btnDeleteClient,
		) => veT`<div class="ve-w-100 ve-mb-2 ve-flex">
			<div class="ve-col-2 ve-pr-1">${iptName}</div>
			<div class="ve-col-3-5 ve-px-1">${iptTokenServer}</div>
			<div class="ve-col-1 ve-px-1 ve-flex-vh-center">${btnGenServerToken}</div>
			<div class="ve-col-3-5 ve-px-1">${iptTokenClient}</div>
			<div class="ve-col-1-5 ve-px-1 ve-flex-vh-center">${btnAcceptClientToken}</div>
			<div class="ve-col-0-5 ve-pl-1 ve-flex-vh-center">${btnDeleteClient}</div>
		</div>`;

		const clientRowMetas = [];
		const addClientRow = () => {
			const rowMeta = {id: CryptUtil.uid()};
			clientRowMetas.push(rowMeta);

			const iptName = veT`<input class="ve-form-control ve-input-sm">`
				.vee.onn("keydown", evt => {
					iptName.vee.removeClass("error-background");
					if (evt.key === "Enter") btnGenServerToken.vee.trigger("click");
				});

			const iptTokenServer = veT`<input class="ve-form-control ve-input-sm ve-copyable ve-code" readonly disabled>`
				.vee.onn("click", async () => {
					await MiscUtil.pCopyTextToClipboard(iptTokenServer.vee.val());
					JqueryUtil.showCopiedEffect(iptTokenServer);
				}).vee.disableSpellcheck();

			const btnGenServerToken = veT`<button class="ve-btn ve-btn-xs ve-btn-primary" title="生成服务端令牌">生成</button>`
				.vee.onn("click", () => this._playerWindowV0_pGetServerTokens({rowMetas: [rowMeta]}));

			const iptTokenClient = veT`<input class="ve-form-control ve-input-sm ve-code" disabled>`
				.vee.onn("keydown", evt => {
					iptTokenClient.vee.removeClass("error-background");
					if (evt.key === "Enter") btnAcceptClientToken.vee.trigger("click");
				}).vee.disableSpellcheck();

			const btnAcceptClientToken = veT`<button class="ve-btn ve-btn-xs ve-btn-primary" title="接受客户端令牌" disabled>接受客户端</button>`
				.vee.onn("click", async () => {
					const token = iptTokenClient.vee.val();
					if (PeerUtilV0.isValidToken(token)) {
						try {
							await PeerUtilV0.pConnectClientsToServers([rowMeta.serverInfo], token);
							this._board.doBindAlertOnNavigation();
							iptTokenClient.vee.prop("disabled", true);
							btnAcceptClientToken.vee.prop("disabled", true);
							doUpdateExternalStates();
						} catch (e) {
							JqueryUtil.doToast({
								content: "接受客户端令牌失败！请确认令牌有效；详情见日志。",
								type: "danger",
							});
							setTimeout(() => { throw e; });
						}
					} else iptTokenClient.vee.addClass("error-background");
				});

			const btnDeleteClient = veT`<button class="ve-btn ve-btn-xs ve-btn-danger"><span class="glyphicon glyphicon-trash"></span></button>`
				.vee.onn("click", () => {
					rowMeta.eleRow.remove();
					rowMeta.isDeleted = true;
					if (rowMeta.serverInfo) {
						rowMeta.serverInfo.server.close();
						rowMeta.serverInfo.isDeleted = true;
					}
					const ix = clientRowMetas.indexOf(rowMeta);
					if (~ix) clientRowMetas.splice(ix, 1);

					if (!clientRowMetas.length) addClientRow();
				});

			rowMeta.eleRow = _getEleRowTemplate(
				iptName,
				iptTokenServer,
				btnGenServerToken,
				iptTokenClient,
				btnAcceptClientToken,
				btnDeleteClient,
			).vee.appendTo(wrpRowsInner);

			rowMeta.iptName = iptName;
			rowMeta.iptTokenServer = iptTokenServer;
			rowMeta.btnGenServerToken = btnGenServerToken;
			rowMeta.iptTokenClient = iptTokenClient;
			rowMeta.btnAcceptClientToken = btnAcceptClientToken;
			this._p2pMetaV0.rows.push(rowMeta);

			return rowMeta;
		};

		const wrpRows = UiUtil.getAddModalRow(eleModalInner, "div");
		const wrpRowsInner = veT`<div class="ve-w-100"></div>`.vee.appendTo(wrpRows);

		if (!this._p2pMetaV0.rows.length) {
			addClientRow();
			return;
		}

		this._p2pMetaV0.rows
			.filter(row => !row.isStub)
			.forEach(row => row.eleRow.vee.appendTo(wrpRowsInner));
	}

	async pHandleDoConnectLocalV0 ({clientView}) {
		const rowMeta = {
			id: CryptUtil.uid(),
			iptName: veT`<input value="local">`,
			isStub: true,
		};

		this._p2pMetaV0.rows.push(rowMeta);

		const serverTokens = await this._playerWindowV0_pGetServerTokens({rowMetas: [rowMeta]});
		const clientData = await PeerUtilV0.pInitialiseClient(
			serverTokens[0],
			msg => clientView.handleMessage(msg),
			() => {}, // ignore local errors
		);
		clientView.clientData = clientData;
		await PeerUtilV0.pConnectClientsToServers([rowMeta.serverInfo], clientData.textifiedSdp);
	}
}
