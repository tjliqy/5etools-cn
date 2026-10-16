import {getFormatGuideForEntities} from "./ai-generator-format-guides.js";
import {SourceUiUtil} from "./utils-ui/utils-ui-sourcebuilder.js";

const STORAGE_KEY = "aiGeneratorSettings";
const SESSIONS_STORAGE_KEY = "aiGeneratorSessions";
const SOURCE_STORAGE_KEY = "aiGeneratorSource";
const MAX_INPUT_LENGTH = 16000;
const CLASSIFIER_PROMPT = `你是输入分析器，只负责识别用户最新输入，不生成实体 JSON。只输出一个 JSON 对象：{"inputType":"entity|idea|mixed|other","title":"若有多个实体，用简体中文概括会话主题，最多20字；否则为空字符串","question":"若实体类型或用户意图存在关键歧义，提出一个简短问题，否则为空字符串","entities":[{"type":"monster|item","description":"该实体的简短需求摘要","features":["trait|action|reaction|bonus|legendary|mythic|spellcasting|weapon|armor|charges"]}]}。只列出用户实际提到或创意明显需要的特征；未提到时 features 可为空数组。复合文本要分别列出支持的怪物和物品；暂不支持的实体不要冒充为 monster/item。不要为普通字段缺失追问，后续会按格式说明补充。若信息不足以判定是怪物还是物品，先在 question 中追问并返回空 entities。`;
const SYSTEM_PROMPT = `你是 5etools 中文版的怪物与物品 JSON 生成助手。系统会提供最新输入的实体识别结果，以及只针对这些实体选择的格式说明；按识别结果生成，不要重新扩大或更改实体范围。请先流式输出一段面向用户的简短中文说明，不要在说明里写 JSON；然后换行输出标记 @@JSON@@，紧接着输出一个 JSON 对象，不要代码围栏，结构为 {"question":"若仍有关键歧义则写追问，否则为空字符串","supplemented":["根据上下文推断或补齐的内容"],"entities":[{"type":"monster|item","data":{...}}]}。不得虚构用户明确提供的关键设定；可为创意补充合理的规则数值，并在 supplemented 中逐项说明。source 字段使用本轮提供的来源标识。JSON 中所有面向玩家的文本（名称、描述、entries 等）必须使用简体中文；JSON 字段名和 5etools 标签按格式保留英文。条目正文使用 5etools entries 结构。只生成 monster 和 item，不要把冒险正文当作实体。`;

const els = Object.fromEntries([
	"settings", "settings-panel", "settings-form", "base-url", "model", "api-key", "settings-cancel", "test", "test-status", "source", "source-edit", "source-add", "sessions", "shell", "sessions-list", "sessions-close", "session-new", "session-export", "session-import", "session-import-file", "messages", "form", "input", "status", "send", "preview", "json", "validation", "copy", "download",
].map(id => [id, document.getElementById(`ai-gen-${id}`)]));

let conversation = [];
let sessions = [];
let activeSession = null;
let activeTab = "json";
let isBusy = false;
let isSessionReady = false;
let isSourceReady = false;
let selectedSource = "";
els.send.disabled = true;
els.sessions.setAttribute("aria-expanded", `${!window.matchMedia("(width <= 800px)").matches}`);

const pSaveSessionsDebounced = MiscUtil.debounce(() => {
	if (!activeSession) return;
	StorageUtil.pSetForPage(SESSIONS_STORAGE_KEY, {activeSessionId: activeSession.id, sessions}).catch(e => console.error("Failed to save AI generator sessions", e));
}, 400);

function pMarkSessionChanged () {
	if (!activeSession) return;
	activeSession.updatedAt = Date.now();
	pSaveSessionsDebounced();
}

function pSetSessionTitleFromEntities (entities, fallbackTitle) {
	if (!activeSession || activeSession.title !== "新会话" || !entities?.length) return;
	if (entities.length === 1) activeSession.title = entities[0]?.data?.name || entities[0]?.name || fallbackTitle || "未命名实体";
	else activeSession.title = fallbackTitle?.trim() || "多个实体";
	pMarkSessionChanged();
}

function pCreateSession () {
	const session = {id: CryptUtil.uid(), title: "新会话", createdAt: Date.now(), updatedAt: Date.now(), conversation: [], messages: [], snapshots: [], json: ""};
	sessions.unshift(session);
	sessions = sessions.slice(0, 30);
	activeSession = session;
	conversation = session.conversation;
	return session;
}

function pExportActiveSession () {
	if (isBusy) return JqueryUtil.doToast({content: "请等本轮生成完成后再导出会话。", type: "warning"});
	if (!activeSession) return JqueryUtil.doToast({content: "当前没有可导出的会话。", type: "warning"});
	activeSession.json = els.json.value;
	activeSession.updatedAt = Date.now();
	const payload = {
		format: "5etools-ai-generator-session",
		version: 1,
		exportedAt: new Date().toISOString(),
		generatedJson: activeSession.json,
		session: JSON.parse(JSON.stringify(activeSession)),
	};
	const blob = new Blob([JSON.stringify(payload, null, "\t")], {type: "application/json"});
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	const filename = (activeSession.title || "AI生成会话").replace(/[\\/:*?\"<>|]/g, "_").slice(0, 80);
	link.href = url;
	link.download = `${filename || "AI生成会话"}.json`;
	document.body.append(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
	pMarkSessionChanged();
}

async function pImportSessionFile (file) {
	if (!file) return;
	if (isBusy) throw new Error("请等本轮生成完成后再导入会话。");
	const payload = JSON.parse(await file.text());
	if (payload?.format !== "5etools-ai-generator-session" || payload.version !== 1 || !payload.session || typeof payload.session !== "object") throw new Error("文件不是受支持的 AI 生成会话导出文件。");
	const imported = payload.session;
	if (!Array.isArray(imported.messages) || !Array.isArray(imported.conversation) || !Array.isArray(imported.snapshots)) throw new Error("会话文件缺少消息、对话记录或 JSON 快照。");
	const session = JSON.parse(JSON.stringify(imported));
	session.id = CryptUtil.uid();
	session.title = typeof session.title === "string" && session.title.trim() ? session.title : "导入的会话";
	session.createdAt = Number.isFinite(session.createdAt) ? session.createdAt : Date.now();
	session.updatedAt = Date.now();
	session.json = typeof payload.generatedJson === "string" ? payload.generatedJson : typeof session.json === "string" ? session.json : "";
	session.conversation = session.conversation.filter(it => ["user", "assistant"].includes(it?.role) && typeof it.content === "string").map(it => ({role: it.role, content: it.content}));
	const snapshotIdMap = new Map();
	session.snapshots = session.snapshots.filter(it => it && typeof it.json === "string").map(it => {
		const oldId = it.id;
		const id = CryptUtil.uid();
		if (oldId) snapshotIdMap.set(oldId, id);
		return {...it, id, label: typeof it.label === "string" ? it.label : "JSON 快照", errors: Array.isArray(it.errors) ? it.errors.filter(error => typeof error === "string") : []};
	});
	session.messages = session.messages.filter(it => ["user", "assistant"].includes(it?.role) && typeof it.content === "string").map(it => ({
		...it,
		snapshotIds: Array.isArray(it.snapshotIds) ? it.snapshotIds.map(id => snapshotIdMap.get(id)).filter(Boolean) : [],
	}));
	session.jsonSnapshotId = snapshotIdMap.get(session.jsonSnapshotId) || null;
	sessions.unshift(session);
	sessions = sessions.slice(0, 30);
	pRenderSessionsList();
	await pRestoreSession(session.id);
}

function pSetSessionsOpen (isOpen) {
	const isMobile = window.matchMedia("(width <= 800px)").matches;
	els.sessions.setAttribute("aria-expanded", `${isOpen}`);
	if (isMobile) els.shell.classList.toggle("ai-gen--sessions-open", isOpen);
	else els.shell.classList.toggle("ai-gen--sessions-collapsed", !isOpen);
}

function pGetAvailableSources () {
	return BrewUtil2.getSources()
		.sort((a, b) => SortUtil.ascSortLower(a.full, b.full))
	.map(it => it.json);
}

function pRenderSourceOptions (sourceJson = selectedSource) {
	els.source.replaceChildren();
	for (const source of pGetAvailableSources()) {
		const option = document.createElement("option");
		option.value = source;
		option.textContent = Parser.sourceJsonToFull(source);
		els.source.append(option);
	}
	if (sourceJson && BrewUtil2.hasSourceJson(sourceJson)) {
		selectedSource = sourceJson;
		els.source.value = sourceJson;
	}
	els["source-edit"].disabled = true;
}

async function pSelectSource (source) {
	selectedSource = source.json;
	await StorageUtil.pSetForPage(SOURCE_STORAGE_KEY, selectedSource);
	pRenderSourceOptions(selectedSource);
	isSourceReady = true;
	els.send.disabled = !isSessionReady;
	els["source-edit"].disabled = !(await BrewUtil2.pIsEditableSourceJson(selectedSource));
}


function pOpenSourceSetup ({mode = "select", isRequired = true, source = null} = {}) {
	const modalMeta = UiUtil.getShowModal({isHeight100: true, isUncappedHeight: true});
	SourceUiUtil.render({
		mode,
		isRequired,
		source,
		eleParent: modalMeta.eleModalInner,
		cbConfirm: async (source, isNewSource) => {
			if (mode === "edit") await BrewUtil2.pEditSource(source);
			else if (isNewSource) await BrewUtil2.pAddSource(source);
			pRenderSourceOptions(source.json);
			await pSelectSource(source);
			modalMeta.doClose();
		},
		cbConfirmExisting: async source => {
			await pSelectSource(source);
			modalMeta.doClose();
		},
		cbCancel: () => modalMeta.doClose(),
	});
}

async function pInitSource () {
	await Promise.all([PrereleaseUtil.pInit(), BrewUtil2.pInit()]);
	const savedSource = await StorageUtil.pGetForPage(SOURCE_STORAGE_KEY);
	pRenderSourceOptions(savedSource || "");
	if (savedSource && BrewUtil2.hasSourceJson(savedSource)) {
		await pSelectSource(BrewUtil2.sourceJsonToSource(savedSource));
		return;
	}
	pOpenSourceSetup({mode: pGetAvailableSources().length ? "select" : "add", isRequired: true});
}
function addMessage (role, content) {
	const ele = document.createElement("div");
	ele.className = `ai-gen__message ai-gen__message--${role}`;
	ele.textContent = content;
	els.messages.append(ele);
	activeSession?.messages.push({role, content, snapshotIds: []});
	els.messages.scrollTop = els.messages.scrollHeight;
	pMarkSessionChanged();
	return ele;
}

function addAssistantProgress () {
	const wrap = document.createElement("div");
	wrap.className = "ai-gen__assistant-wrap";
	const bubble = document.createElement("div");
	bubble.className = "ai-gen__message ai-gen__message--assistant";
	const content = document.createElement("span");
	content.textContent = "正在分析并生成…";
	bubble.append(content);
	const thinking = document.createElement("div");
	thinking.className = "ai-gen__thinking";
	thinking.textContent = "思考中...";
	wrap.append(bubble, thinking);
	els.messages.append(wrap);
	els.messages.scrollTop = els.messages.scrollHeight;
	const record = {role: "assistant", content: "正在分析并生成…", streamedJson: "", snapshotIds: [], isPending: true};
	activeSession?.messages.push(record);
	pMarkSessionChanged();
	return {bubble, content, thinking, record, isPlaceholder: true};
}

function finishAssistantProgress (progress) {
	progress.record.isPending = false;
	progress.thinking.remove();
	pMarkSessionChanged();
}

function appendAssistantText (progress, text) {
	if (!text) return;
	if (progress.isPlaceholder) {
		progress.content.append(document.createTextNode("\n"));
		progress.record.content += "\n";
		progress.isPlaceholder = false;
	}
	progress.content.append(document.createTextNode(text));
	progress.record.content += text;
	els.messages.scrollTop = els.messages.scrollHeight;
	pMarkSessionChanged();
}

function getStreamingJsonWriter (progress) {
	let isStarted = false;
	let lastLength = 0;
	let details;
	let contentEle;
	return content => {
		const markerIx = content.indexOf("@@JSON@@");
		if (markerIx < 0) return;
		const streamedJson = content.slice(markerIx + "@@JSON@@".length);
		if (!isStarted) {
			isStarted = true;
			details = document.createElement("details");
			details.className = "ai-gen__streamed-json";
			const summary = document.createElement("summary");
			summary.setAttribute("aria-label", "展开或收起生成的 JSON");
			const icon = document.createElement("span");
			icon.className = "glyphicon glyphicon-chevron-down";
			icon.setAttribute("aria-hidden", "true");
			summary.append(icon);
			contentEle = document.createElement("pre");
			details.append(summary, contentEle);
			progress.bubble.append(details);
		}
		const nextText = streamedJson.slice(lastLength);
		lastLength = streamedJson.length;
		if (!nextText) return;
		contentEle.append(document.createTextNode(nextText));
		progress.record.streamedJson += nextText;
		pMarkSessionChanged();
	};
}

function getVisibleNarrative (content) {
	const marker = "@@JSON@@";
	const markerIx = content.indexOf(marker);
	if (~markerIx) return content.slice(0, markerIx);
	if (content.trimStart().startsWith("{")) return "";
	for (let len = Math.min(marker.length - 1, content.length); len > 0; --len) {
		if (content.endsWith(marker.slice(0, len))) return content.slice(0, -len);
	}
	return content;
}

function pRestoreSnapshot (snapshotId) {
	const snapshot = activeSession?.snapshots.find(it => it.id === snapshotId);
	if (!snapshot) return;
	els.json.value = snapshot.json;
	activeSession.json = snapshot.json;
	activeSession.jsonSnapshotId = snapshot.id;
	void renderOutput();
	pMarkSessionChanged();
}

function addSnapshotControls (record, parent) {
	if (!record.snapshotIds?.length) return;
	const controls = document.createElement("div");
	controls.className = "ai-gen__snapshot-controls";
	for (const snapshotId of record.snapshotIds) {
		const snapshot = activeSession?.snapshots.find(it => it.id === snapshotId);
		if (!snapshot) continue;
		const button = document.createElement("button");
		button.className = "ve-btn ve-btn-default";
		button.type = "button";
		button.textContent = `恢复 ${snapshot.label}`;
		button.addEventListener("click", () => pRestoreSnapshot(snapshot.id));
		controls.append(button);
	}
	if (controls.childElementCount) parent.append(controls);
}

function pAddSnapshot (progress, json, errors = []) {
	if (!activeSession || !json) return;
	const snapshot = {
		id: CryptUtil.uid(),
		label: `JSON 快照 ${activeSession.snapshots.length + 1}`,
		createdAt: Date.now(),
		json,
		isValid: !errors.length,
		errors: [...errors],
	};
	activeSession.snapshots.push(snapshot);
	progress.record.snapshotIds.push(snapshot.id);
	addSnapshotControls(progress.record, progress.bubble);
	pMarkSessionChanged();
}

async function pStoreGeneratedIteration (progress, result) {
	if (!result.output) return;
	const json = JSON.stringify(result.output, null, "\t");
	els.json.value = json;
	await renderOutput();
	if (result.errors.length) els.validation.textContent = `实体校验未通过：\n${result.errors.join("\n")}`;
	activeSession.json = json;
	activeSession.jsonSnapshotId = null;
	pAddSnapshot(progress, json, result.errors);
	pMarkSessionChanged();
}

function pRenderSavedMessages (session) {
	els.messages.replaceChildren();
	for (const record of session.messages || []) {
		if (record.role === "user") {
			const message = document.createElement("div");
			message.className = "ai-gen__message ai-gen__message--user";
			message.textContent = record.content;
			els.messages.append(message);
			continue;
		}
		const wrap = document.createElement("div");
		wrap.className = "ai-gen__assistant-wrap";
		const bubble = document.createElement("div");
		bubble.className = "ai-gen__message ai-gen__message--assistant";
		const content = document.createElement("span");
		content.textContent = record.content;
		bubble.append(content);
		if (record.streamedJson) {
			const details = document.createElement("details");
			details.className = "ai-gen__streamed-json";
			const summary = document.createElement("summary");
			summary.setAttribute("aria-label", "展开或收起生成的 JSON");
			const icon = document.createElement("span");
			icon.className = "glyphicon glyphicon-chevron-down";
			icon.setAttribute("aria-hidden", "true");
			summary.append(icon);
			const jsonContent = document.createElement("pre");
			jsonContent.textContent = record.streamedJson;
			details.append(summary, jsonContent);
			bubble.append(details);
		}
		wrap.append(bubble);
		addSnapshotControls(record, bubble);
		els.messages.append(wrap);
	}
	els.messages.scrollTop = els.messages.scrollHeight;
}

async function pRestoreSession (sessionId) {
	if (isBusy) return;
	const session = sessions.find(it => it.id === sessionId);
	if (!session) return;
	activeSession = session;
	conversation = activeSession.conversation || (activeSession.conversation = []);
	pRenderSessionsList();
	els.json.value = activeSession.json || "";
	pRenderSavedMessages(activeSession);
	if (els.json.value.trim()) await renderOutput();
	else {
		els.validation.textContent = "";
		els.preview.innerHTML = '<p class="ve-muted">生成的内容会显示在这里。</p>';
	}
	if (window.matchMedia("(width <= 800px)").matches) pSetSessionsOpen(false);
	setStatus(`已恢复会话：${activeSession.title}`);
	pMarkSessionChanged();
}

function pRenderSessionsList () {
	els["sessions-list"].replaceChildren();
	const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
	if (!sortedSessions.length) {
		const empty = document.createElement("p");
		empty.className = "ve-muted";
		empty.textContent = "还没有保存的会话。";
		els["sessions-list"].append(empty);
		return;
	}
	for (const session of sortedSessions) {
		const row = document.createElement("button");
		row.className = "ai-gen__session-row";
		row.type = "button";
		row.setAttribute("aria-current", `${session.id === activeSession?.id}`);
		const info = document.createElement("div");
		info.className = "ai-gen__session-title";
		const title = document.createElement("strong");
		title.textContent = session.title || "未命名会话";
		const meta = document.createElement("div");
		meta.className = "ai-gen__session-meta";
		meta.textContent = `${(session.messages || []).length} 条消息 · ${(session.snapshots || []).length} 个 JSON 快照`;
		info.append(title, meta);
		row.disabled = isBusy;
		row.append(info);
		row.addEventListener("click", () => void pRestoreSession(session.id));
		els["sessions-list"].append(row);
	}
}

async function pLoadSessions () {
	const saved = await StorageUtil.pGetForPage(SESSIONS_STORAGE_KEY);
	sessions = Array.isArray(saved?.sessions) ? saved.sessions : [];
	activeSession = sessions.find(it => it.id === saved?.activeSessionId) || sessions[0] || null;
	if (!activeSession) activeSession = pCreateSession();
	conversation = activeSession.conversation || (activeSession.conversation = []);
	activeSession.messages ||= [];
	activeSession.snapshots ||= [];
	activeSession.json ||= "";
	for (const message of activeSession.messages) {
		if (!message.isPending) continue;
		message.isPending = false;
		message.content += "\n（上次会话结束前生成尚未完成）";
	}
	pRenderSessionsList();
	pRenderSavedMessages(activeSession);
	els.json.value = activeSession.json;
	if (els.json.value.trim()) await renderOutput();
	else els.preview.innerHTML = '<p class="ve-muted">生成的内容会显示在这里。</p>';
	pMarkSessionChanged();
}

function setStatus (text, isError = false) {
	els.status.textContent = text;
	els.status.classList.toggle("ve-text-danger", isError);
}

async function pGetSettings () {
	return await StorageUtil.pGetForPage(STORAGE_KEY) || {};
}

async function pSaveSettings (settings) {
	await StorageUtil.pSetForPage(STORAGE_KEY, settings);
	setStatus(settings.baseUrl && settings.model && settings.apiKey ? `已配置模型：${settings.model}` : "请先配置 OpenAI 兼容接口");
}

function getEndpoint (baseUrl) {
	const clean = baseUrl.trim().replace(/\/+$/, "");
	return /\/chat\/completions$/i.test(clean) ? clean : `${clean}/chat/completions`;
}

function parseJsonResponse (content) {
	const normalized = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
	return JSON.parse(normalized);
}

function parseAssistantResponse (content) {
	const marker = "@@JSON@@";
	const markerIx = content.indexOf(marker);
	if (!~markerIx) {
		const answer = parseJsonResponse(content);
		return {answer, narrative: answer.message || ""};
	}
	const narrative = content.slice(0, markerIx).trim();
	const answer = parseJsonResponse(content.slice(markerIx + marker.length));
	return {answer, narrative};
}

async function pRequestModel (messages, {isStream = true, onChunk = null, settingsOverride = null} = {}) {
	const settings = settingsOverride || await pGetSettings();
	if (!settings.baseUrl || !settings.model || !settings.apiKey) throw new Error("请先填写接口地址、模型和 API Key。");
	const response = await fetch(getEndpoint(settings.baseUrl), {
		method: "POST",
		headers: {"Content-Type": "application/json", Authorization: `Bearer ${settings.apiKey}`},
		body: JSON.stringify({model: settings.model, messages, temperature: 0.35, stream: isStream}),
	});
	if (!response.ok) {
		const detail = (await response.text()).slice(0, 500);
		throw new Error(`接口返回 HTTP ${response.status}${detail ? `：${detail}` : ""}`);
	}
	if (!isStream) {
		const payload = await response.json();
		const content = payload?.choices?.[0]?.message?.content;
		if (typeof content !== "string" || !content.trim()) throw new Error("接口没有返回可读取的文本内容。");
		return content;
	}
	if (response.headers.get("content-type")?.includes("application/json")) {
		const payload = await response.json();
		const content = payload?.choices?.[0]?.message?.content;
		if (typeof content !== "string" || !content.trim()) throw new Error("接口没有返回可读取的文本内容。");
		onChunk?.(content);
		return content;
	}
	if (!response.body) throw new Error("接口未提供流式响应。请确认该接口支持 OpenAI Chat Completions 流式输出。");
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let output = "";
	let isDone = false;
	const handleLine = line => {
		if (!line.startsWith("data:")) return;
		const data = line.slice(5).trim();
		if (!data || data === "[DONE]") {
			if (data === "[DONE]") isDone = true;
			return;
		}
		let payload;
		try {
			payload = JSON.parse(data);
		} catch (e) {
			throw new Error(`无法解析接口的流式数据：${e.message}`, {cause: e});
		}
		if (payload.error) throw new Error(payload.error.message || "模型接口返回流式错误。");
		const delta = payload.choices?.[0]?.delta?.content;
		if (typeof delta === "string") {
			output += delta;
			onChunk?.(output);
		} else if (Array.isArray(delta)) {
			for (const part of delta) {
				if (typeof part?.text !== "string") continue;
				output += part.text;
				onChunk?.(output);
			}
		}
	};
	while (true) {
		const {done, value} = await reader.read();
		buffer += decoder.decode(value || new Uint8Array(), {stream: !done});
		const lines = buffer.split(/\r?\n/);
		buffer = lines.pop() || "";
		lines.forEach(handleLine);
		if (isDone || done) {
			if (buffer) handleLine(buffer);
			break;
		}
	}
	if (!output.trim()) throw new Error("接口没有返回可读取的流式文本。");
	return output;
}

function pGetEntityIssues (type, entity) {
	const issues = [];
	if (!entity || typeof entity !== "object" || Array.isArray(entity)) return ["实体必须是对象"];
	if (!entity.name || typeof entity.name !== "string") issues.push("缺少名称 name");
	if (type === "monster") {
		for (const field of ["type", "ac", "hp", "speed", "cr", "str", "dex", "con", "int", "wis", "cha"]) if (entity[field] == null) issues.push(`生物缺少 ${field}`);
		if (!entity.trait?.length && !entity.action?.length) issues.push("生物缺少特质或动作内容");
	} else if (type === "item" && !entity.entries?.length) issues.push("物品缺少条目内容 entries");
	issues.push(...pGetEntityTagIssues(entity));
	return issues;
}

function pGetEntityTagIssues (entity) {
	const issues = [];
	const pCheckValue = (value, path) => {
		if (typeof value === "string") {
			for (const part of Renderer.splitByTags(value)) {
				if (!part.startsWith("{@")) continue;
				const isClosed = part.endsWith("}");
				const tagContents = part.slice(1, isClosed ? -1 : undefined);
				const [tag, text] = Renderer.splitFirstSpace(tagContents);
				try {
					if (!isClosed) throw new Error("标签缺少结束符 }");
					const tagInfo = Renderer.tag.getTagInfo(tag, {isRequired: true});
					if (!tagInfo.isStandalone && !text.trim()) throw new Error(`标签 @${tag.replace(/^@/, "")} 缺少内容`);
					const stripped = tagInfo.getStripped(tag, text);
					pCheckValue(stripped, `${path} {@${tag}}`);
				} catch (e) {
					issues.push(`${path}：${e.message}`);
				}
			}
			return;
		}
		if (Array.isArray(value)) return value.forEach((it, ix) => pCheckValue(it, `${path}[${ix}]`));
		if (value && typeof value === "object") Object.entries(value).forEach(([key, it]) => pCheckValue(it, `${path}.${key}`));
	};
	pCheckValue(entity, "实体");
	return issues;
}

async function normalizeAndValidate (entities) {
	const output = {};
	for (const item of entities || []) {
		if (!["monster", "item"].includes(item?.type) || !item.data || typeof item.data !== "object" || Array.isArray(item.data)) throw new Error("模型返回了无法识别的实体结构。");
		const data = {...item.data, source: selectedSource, translator: "原创内容"};
		(output[item.type] ||= []).push(data);
	}
	if (!Object.keys(output).length) return {output: null, errors: []};
	const errors = Object.entries(output).flatMap(([type, rows]) => rows.flatMap((entity, ix) => pGetEntityIssues(type, entity).map(issue => `${type}[${ix}]: ${issue}`)));
	if (!errors.length) {
		try {
			for (const [type, rows] of Object.entries(output)) Renderer.hover.getHoverContent_generic({type: "entries", entries: rows.map(data => ({type: "statblockInline", statblockType: type, statblockData: {...data, name: data.name || "（未命名）", source: data.source || selectedSource}}))});
		} catch (e) { errors.push(`实体预览渲染失败：${e.message}`); }
	}
	return {output, errors};
}

async function renderOutput () {
	let json;
	try {
		json = JSON.parse(els.json.value);
	} catch (e) {
		els.validation.textContent = `JSON 语法错误：${e.message}`;
		els.preview.replaceChildren();
		return false;
	}
	if (!json || typeof json !== "object" || Array.isArray(json)) {
		els.validation.textContent = "JSON 顶层必须是对象。";
		return false;
	}
	const errors = [];
	for (const type of ["monster", "item"]) {
		if (json[type] == null) continue;
		if (!Array.isArray(json[type])) errors.push(`${type} 必须是数组。`);
		else json[type].forEach((entity, ix) => errors.push(...pGetEntityIssues(type, entity).map(issue => `${type}[${ix}]: ${issue}`)));
	}
	const unknownKeys = Object.keys(json).filter(key => !["monster", "item", "_meta"].includes(key));
	if (unknownKeys.length) errors.push(`不支持的顶层字段：${unknownKeys.join("、")}`);
	els.validation.replaceChildren();
	if (errors.length) {
		els.validation.textContent = `实体校验未通过：\n${errors.join("\n")}`;
		els.preview.replaceChildren();
		return false;
	}
	els.validation.textContent = Object.keys(json).some(key => ["monster", "item"].includes(key) && json[key]?.length) ? "实体字段检查通过，预览已尝试渲染。" : "目前没有可校验的实体。";
	const entries = [];
	for (const type of ["monster", "item"]) {
		for (const data of json[type] || []) {
			entries.push({type: "statblockInline", statblockType: type, statblockData: {...data, name: data.name || "（未命名）", source: data.source || selectedSource}});
		}
	}
	els.preview.replaceChildren();
	if (!entries.length) {
		const empty = document.createElement("p");
		empty.className = "ve-muted";
		empty.textContent = "生成的内容会显示在这里。";
		els.preview.append(empty);
	} else {
		try {
			const html = Renderer.hover.getHoverContent_generic({type: "entries", entries});
			if (typeof html === "string") els.preview.innerHTML = html;
			else if (html instanceof Node) els.preview.append(html);
			else if (html?.jquery) els.preview.append(...html.toArray());
			else throw new Error("预览渲染器返回了无法显示的内容。");
		} catch (e) {
			els.preview.textContent = `预览渲染失败：${e.message}`;
			els.validation.textContent = `实体预览渲染失败：${e.message}`;
			return false;
		}
	}
	return true;
}

async function pHandleUserMessage (text) {
	if (text.length > MAX_INPUT_LENGTH) {
		addMessage("user", text);
		addMessage("assistant", `单次输入最多 ${MAX_INPUT_LENGTH} 个字符，请拆分后再发送。`);
		return;
	}
	conversation.push({role: "user", content: text});
	addMessage("user", text);
	let progress = addAssistantProgress();
	let generationMessages = conversation;
	let formatGuide = "";
	els.send.disabled = true;
	try {
		const classificationRaw = await pRequestModel([{role: "system", content: CLASSIFIER_PROMPT}, ...conversation], {isStream: false});
		const classification = parseJsonResponse(classificationRaw);
		if (classification.question) {
			finishAssistantProgress(progress);
			appendAssistantText(progress, classification.question);
			conversation.push({role: "assistant", content: classification.question});
			pMarkSessionChanged();
			return;
		}
		classification.entities = (Array.isArray(classification.entities) ? classification.entities : [])
			.filter(it => ["monster", "item"].includes(it?.type))
			.map(it => ({...it, features: Array.isArray(it.features) ? it.features : []}));
		if (!classification.entities.length) {
			const message = "我目前可以生成怪物或物品。请描述其中一种实体，或补充一下复合文本中需要生成的怪物/物品。";
			finishAssistantProgress(progress);
			appendAssistantText(progress, message);
			conversation.push({role: "assistant", content: message});
			pMarkSessionChanged();
			return;
		}
		formatGuide = getFormatGuideForEntities(classification.entities);
		generationMessages = conversation.map((message, ix) => ix === conversation.length - 1 && message.role === "user"
			? {...message, content: `用户原始输入：\n${text}\n\n实体识别结果：\n${JSON.stringify(classification.entities)}`}
			: message);
		let fnWriteJson = getStreamingJsonWriter(progress);
		let raw = await pRequestModel([{role: "system", content: SYSTEM_PROMPT}, {role: "system", content: `本轮来源标识：${selectedSource}`}, {role: "system", content: formatGuide}, ...generationMessages], {
			onChunk: content => {
				fnWriteJson(content);
				const visibleText = getVisibleNarrative(content);
				const nextText = visibleText.slice(progress.streamedLength || 0);
				progress.streamedLength = visibleText.length;
				appendAssistantText(progress, nextText);
			},
		});
		let {answer, narrative} = parseAssistantResponse(raw);
		let result = await normalizeAndValidate(answer.entities);
		await pStoreGeneratedIteration(progress, result);
		if (result.errors.length) {
			finishAssistantProgress(progress);
			progress = addAssistantProgress();
			progress.content.textContent = "正在校验结果并尝试修复…";
			progress.isPlaceholder = true;
			const repairRequest = `请修复下面的 JSON，使实体通过 5etools 实体字段检查并可由 5etools 预览渲染。所有面向玩家的文本仍须使用简体中文。保留用户意图，只修改必要字段。问题：${result.errors.join("\n")}\n待修复对象：${JSON.stringify(result.output)}`;
			fnWriteJson = getStreamingJsonWriter(progress);
			raw = await pRequestModel([{role: "system", content: SYSTEM_PROMPT}, {role: "system", content: `本轮来源标识：${selectedSource}`}, {role: "system", content: formatGuide}, ...generationMessages, {role: "assistant", content: raw}, {role: "user", content: repairRequest}], {
				onChunk: content => {
					fnWriteJson(content);
					const visibleText = getVisibleNarrative(content);
					const nextText = visibleText.slice(progress.streamedLength || 0);
					progress.streamedLength = visibleText.length;
					appendAssistantText(progress, nextText);
				},
			});
			({answer, narrative} = parseAssistantResponse(raw));
			result = await normalizeAndValidate(answer.entities);
			await pStoreGeneratedIteration(progress, result);
		}
		pSetSessionTitleFromEntities(answer.entities, classification.title);
		finishAssistantProgress(progress);
		conversation.push({role: "assistant", content: raw});
		pMarkSessionChanged();
		if (narrative && progress.streamedLength === undefined) appendAssistantText(progress, narrative);
		if (answer.question) addMessage("assistant", `需要补充信息：${answer.question}`);
		if (answer.supplemented?.length) addMessage("assistant", `根据上下文补充：\n• ${answer.supplemented.join("\n• ")}`);
		if (result.errors.length) appendAssistantText({content: progress.content, isPlaceholder: false}, "\n生成内容未通过实体检查，请查看右侧 JSON 下方的问题详情。");
	} catch (e) {
		if (progress.record.streamedJson && !progress.record.snapshotIds.length) pAddSnapshot(progress, progress.record.streamedJson, [e.message]);
		finishAssistantProgress(progress);
		appendAssistantText({content: progress.content, isPlaceholder: false}, `\n生成失败：${e.message}`);
		setStatus(e.message, true);
	} finally {
		els.send.disabled = false;
	}
}

els.sessions.addEventListener("click", () => {
	if (isBusy) return;
	const isMobile = window.matchMedia("(width <= 800px)").matches;
	const isOpen = isMobile ? els.shell.classList.contains("ai-gen--sessions-open") : !els.shell.classList.contains("ai-gen--sessions-collapsed");
	if (!isOpen) pRenderSessionsList();
	pSetSessionsOpen(!isOpen);
});
els["sessions-close"].addEventListener("click", () => pSetSessionsOpen(false));
els.shell.addEventListener("click", evt => {
	if (evt.target === els.shell && els.shell.classList.contains("ai-gen--sessions-open")) pSetSessionsOpen(false);
});
els["session-new"].addEventListener("click", () => {
	if (isBusy) return;
	pCreateSession();
	els.messages.replaceChildren();
	els.json.value = "";
	els.validation.textContent = "";
	els.preview.innerHTML = '<p class="ve-muted">生成的内容会显示在这里。</p>';
	if (window.matchMedia("(width <= 800px)").matches) pSetSessionsOpen(false);
	setStatus("已创建新会话");
	pRenderSessionsList();
	pMarkSessionChanged();
});
els["session-export"].addEventListener("click", pExportActiveSession);
els["session-import"].addEventListener("click", () => {
	if (isBusy) return JqueryUtil.doToast({content: "请等本轮生成完成后再导入会话。", type: "warning"});
	els["session-import-file"].click();
});
els["session-import-file"].addEventListener("change", async () => {
	const [file] = els["session-import-file"].files || [];
	try {
		await pImportSessionFile(file);
		JqueryUtil.doToast({content: `已导入会话：${activeSession.title}`, type: "success"});
	} catch (e) {
		JqueryUtil.doToast({content: `导入失败：${e.message}`, type: "danger"});
	} finally {
		els["session-import-file"].value = "";
	}
});
els.source.addEventListener("change", async () => {
	const source = BrewUtil2.sourceJsonToSource(els.source.value);
	if (source) await pSelectSource(source);
});
els["source-edit"].addEventListener("click", () => {
	const source = selectedSource && BrewUtil2.sourceJsonToSource(selectedSource);
	if (!source) return;
	pOpenSourceSetup({mode: "edit", isRequired: false, source: MiscUtil.copy(source)});
});
els["source-add"].addEventListener("click", () => pOpenSourceSetup({mode: "add", isRequired: false}));

els.settings.addEventListener("click", async () => {
	const settings = await pGetSettings();
	els["base-url"].value = settings.baseUrl || "";
	els.model.value = settings.model || "";
	els["api-key"].value = settings.apiKey || "";
	els["settings-panel"].classList.remove("ve-hidden");
});
els["settings-cancel"].addEventListener("click", () => els["settings-panel"].classList.add("ve-hidden"));
els["settings-panel"].addEventListener("click", evt => { if (evt.target === els["settings-panel"]) els["settings-panel"].classList.add("ve-hidden"); });
els.test.addEventListener("click", async () => {
	els["test-status"].textContent = "正在测试连接…";
	els.test.disabled = true;
	try {
		const testSettings = {baseUrl: els["base-url"].value.trim(), model: els.model.value.trim(), apiKey: els["api-key"].value.trim()};
		if (!testSettings.baseUrl || !testSettings.model || !testSettings.apiKey) throw new Error("请先填写接口地址、模型和 API Key。");
		await pRequestModel([{role: "user", content: "请只回复 OK。"}], {isStream: false, settingsOverride: testSettings});
		els["test-status"].textContent = "连接成功，接口已正常返回。";
	} catch (e) {
		els["test-status"].textContent = `连接失败：${e.message}`;
	} finally {
		els.test.disabled = false;
	}
});
els["settings-form"].addEventListener("submit", async evt => {
	evt.preventDefault();
	await pSaveSettings({baseUrl: els["base-url"].value.trim(), model: els.model.value.trim(), apiKey: els["api-key"].value.trim()});
	els["settings-panel"].classList.add("ve-hidden");
});
els.form.addEventListener("submit", async evt => {
	evt.preventDefault();
	const text = els.input.value.trim();
	if (!text || isBusy || !isSessionReady || !isSourceReady) return;
	els.input.value = "";
	isBusy = true;
	try {
		await pHandleUserMessage(text);
	} catch (e) {
		addMessage("assistant", `生成失败：${e.message}`);
		setStatus(e.message, true);
	} finally {
		isBusy = false;
		els.send.disabled = !isSessionReady || !isSourceReady;
		els.input.focus();
	}
});

for (const button of document.querySelectorAll("[data-tab]")) {
	button.addEventListener("click", () => {
		activeTab = button.dataset.tab;
		document.querySelectorAll("[data-tab]").forEach(it => it.classList.toggle("ve-active", it === button));
		els.preview.classList.toggle("ve-hidden", activeTab !== "preview");
		els.json.classList.toggle("ve-hidden", activeTab !== "json");
	});
}
els.json.addEventListener("input", () => {
	void renderOutput();
	if (!activeSession) return;
	activeSession.json = els.json.value;
	activeSession.jsonSnapshotId = null;
	pMarkSessionChanged();
});
els.copy.addEventListener("click", async evt => {
	if (!els.json.value.trim()) return JqueryUtil.doToast({content: "当前没有可复制的 JSON。", type: "warning"});
	await MiscUtil.pCopyTextToClipboard(els.json.value);
	JqueryUtil.showCopiedEffect(evt.currentTarget);
});
els.download.addEventListener("click", () => {
	if (!els.json.value.trim()) return JqueryUtil.doToast({content: "当前没有可下载的 JSON。", type: "warning"});
	try {
		const json = JSON.parse(els.json.value);
		DataUtil.userDownload("ai-generator", json);
	} catch (e) {
		JqueryUtil.doToast({content: `JSON 语法错误，无法下载：${e.message}`, type: "danger"});
	}
});

await pInitSource();
await pLoadSessions();
isSessionReady = true;
els.send.disabled = !isSourceReady;
const initialSettings = await pGetSettings();
setStatus(initialSettings.baseUrl && initialSettings.model && initialSettings.apiKey ? `已配置模型：${initialSettings.model}` : "请先配置 OpenAI 兼容接口");
if (!initialSettings.apiKey) els["settings-panel"].classList.remove("ve-hidden");
