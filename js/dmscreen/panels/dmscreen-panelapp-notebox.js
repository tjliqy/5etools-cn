import {DmScreenPanelAppBase} from "./dmscreen-panelapp-base.js";

export class NoteBox extends DmScreenPanelAppBase {
	constructor (...args) {
		super(...args);

		this._iptText = null;
	}

	async _pDoHandleCtrlQ () {
		if (this._iptText.selectionStart !== this._iptText.selectionEnd) return;

		const pos = this._iptText.selectionStart - 1;
		const text = this._iptText.value;
		const l = text.length;
		let beltStack = [];
		let braceStack = [];
		let belts = 0;
		let braces = 0;
		let beltsAtPos = null;
		let bracesAtPos = null;
		let lastBeltPos = null;
		let lastBracePos = null;
		outer: for (let i = 0; i < l; ++i) {
			const c = text[i];
			switch (c) {
				case "[":
					belts = Math.min(belts + 1, 2);
					if (belts === 2) beltStack = [];
					lastBeltPos = i;
					break;
				case "]":
					belts = Math.max(belts - 1, 0);
					if (belts === 0 && i > pos) break outer;
					break;
				case "{":
					if (text[i + 1] === "@") {
						braces = 1;
						braceStack = [];
						lastBracePos = i;
					}
					break;
				case "}":
					braces = 0;
					if (i >= pos) break outer;
					break;
				default:
					if (belts === 2) {
						beltStack.push(c);
					}
					if (braces) {
						braceStack.push(c);
					}
			}
			if (i === pos) {
				beltsAtPos = belts;
				bracesAtPos = braces;
			}
		}

		if (beltsAtPos === 2 && belts === 0) {
			const str = beltStack.join("");
			await Renderer.dice.pRoll2(str.replace(`[[`, "").replace(`]]`, ""), {
				isUser: false,
				name: "DM 帷幕",
			});
			return;
		}

		if (bracesAtPos === 1 && braces === 0) {
			const str = braceStack.join("");
			const tag = str.split(" ")[0].replace(/^@/, "");
			const text = str.split(" ").slice(1).join(" ");
			if (Renderer.tag.getPage(tag)) {
				const {source, page, hash, isFauxPage} = Renderer.utils.getTagMeta(`@${tag}`, text);

				const bcr = this._iptText.getBoundingClientRect().toJSON();

				const ent = await DataLoader.pCacheAndGet(page, source, hash);
				if (!ent) return;

				Renderer.hover.getShowWindow(
					Renderer.hover.getHoverContent_stats(page, ent),
					Renderer.hover.getWindowPositionExact(bcr.left, bcr.top),
					{
						title: ent.name || "",
						isPermanent: true,
						pageUrl: isFauxPage ? null : `${Renderer.get().baseUrl}${page}#${hash}`,
						sourceData: ent,
					},
				);
				return;
			}

			if (tag === "link") {
				const [txt, link] = Renderer.splitTagByPipe(text);
				window.open(link && link.trim() ? link : txt);
			}
		}
	}

	_getPanelElement (board, state) {
		this._iptText = veT`<textarea class="panel-content-textarea" placeholder="支持文本内掷骰和内容标签(将光标置于标签内，按下 CTRL+q 组合键激活嵌入的功能及内容。):\n • 文本内掷骰,  [[1d20+2]]\n • 内容标签 (和渲染器演示中的一样), {@creature 地精}, {@spell 火球术}\n • 链接标签, {@link https://5e.kiwee.top}">${state.x || ""}</textarea>`
			.vee.onn("keydown", async evt => {
				const key = EventUtil.getKeyIgnoreCapsLock(evt);

				const isCtrlQ = (EventUtil.isCtrlMetaKey(evt)) && key === "q";

				if (!isCtrlQ) {
					board.doSaveStateDebounced();
					return;
				}

				await this._pDoHandleCtrlQ();
			});

		return this._iptText;
	}

	getState () {
		return {x: this._iptText?.vee.val()};
	}
}
