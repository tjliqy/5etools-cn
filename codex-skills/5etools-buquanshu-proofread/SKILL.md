---
name: 5etools-buquanshu-proofread
description: Proofread Chinese 5etools JSON under data against a user-supplied 5E 不全书 book or adventure folder, including source resolution, entity mapping, terminology adjudication, parallel entity-type editing, independent regression review, repository validation, and optional terminology write-back. Use for corpus-backed proofreading; do not use for ordinary data-bak incremental translation.
---

# 5etools 不全书校对

以用户给出的不全书文件夹为权威译文参考，校对当前仓库 `data/` 中同来源实体。只改已由参考文本和对应英文 JSON 支持的内容；保留无关改动。

## 输入与前置检查

用户必须给出一个可读的不全书根目录。若未给出，先询问路径。解析为绝对路径，确认它是目录，并列出其中支持的文本文件（通常为 `.txt`、`.md`；其他格式先说明无法可靠读取，不能静默跳过）。记录开始时的 `git status --short`，现有改动均属于用户。

从仓库根目录执行：

```bash
node <skill-dir>/scripts/resolve_source.mjs <不全书目录>
```

脚本直接读取当前 `js/parser.js` 的 `Parser.SOURCE_JSON_TO_FULL`。仅在唯一 `exact` 或 `normalized` 结果时确认 source；只有 `contains` 结果、无结果或多个结果时，展示候选并让用户确认，禁止猜测。记录中文全名与 source 简写。

读取仓库的 `docs/entity-json-search-guide.md`，再进行实体盘点。不要修改该指南、英文 `data-bak/` 或生成文件。

## 建立实体清单

递归读取参考目录中的全部支持文件，按标题、条目边界和上下文拆分实体。为每个实体记录：

- 实体类型、英文名、参考中文名；
- 参考文件与足以复核的位置（行号或章节）；
- source 与页码（若有）；
- `npm run search:entity -- "<英文名> source:<SRC> in:<type>" --json` 的结果；
- 英文 JSON 文件/顶层属性/实体身份，以及对应 `data/` 目标；
- 状态：唯一匹配、待消歧、未收录或仅正文提及。

优先以英文名查询；只有中文名时，先结合不全书上下文和英文 JSON 确认英文名。搜索结果必须核对 `json_obj.name`、`source`、实体类型和目标文件，不得因模糊命中直接修改。遇到同名、多 source、只在正文提及、或搜索索引缺项时，使用指南定位 `data-bak/` 后人工核对。无法唯一对应的实体先向用户消歧。

`book`/`adventure` 正文、fluff 和规则实体分别记账；不要把正文中的一次提及误当成独立实体。最终形成“实体类型 → 目标 JSON 文件 → 实体列表”的工作清单。若同一目标文件含多种类型，整个文件只分配给一个写入 Agent，避免并发覆盖。

## 术语门禁

从不全书与已确认英文实体中提取会影响一致性的完整短语：实体名、动作/特性名、人名、地名、组织名、物品、法术和规则术语。不要把普通虚词或脱离上下文的碎片收入表中。

用下列只读工具分批（每批不超过十项）查询术语库和不全书证据：

```bash
/data/5e-translator/.venv/bin/python <skill-dir>/scripts/lookup_reference.py translations \
  "Fireball" "saving throw" --category spell --limit 5 \
  --reference <不全书文本文件>

/data/5e-translator/.venv/bin/python <skill-dir>/scripts/lookup_reference.py entities \
  "Fireball" --entity-type spell --limit 3 \
  --reference <不全书文本文件>
```

汇总为共享术语表：英文、拟用中文、类别、来源证据、不全书位置、术语库候选、裁决状态。相同译法可直接锁定；术语库缺失，或不全书与术语库/当前 data 不一致时，必须在任何 JSON 编辑前一次性提交给用户选择。记录每项裁决及适用范围。用户选择“术语库优先”的项即使与不全书不同，也必须覆盖所有 Agent 的工作。

## 并行校对

术语门禁全部裁决后，读取 [references/agent-workflow.md](references/agent-workflow.md)，启动多个写入 Agent；每个 Agent 负责一种实体类型，但必须按目标文件划定互斥所有权。把 source、实体清单、参考路径、共享术语表和用户裁决完整传给每个 Agent。

写入 Agent 只修改其获分配的 `data/**/*.json`，用对应 `data-bak/` 英文实体确定字段语义与 5etools 标签，使用不全书译法校对人类可读中文。不得改结构、英文身份锚点、数值、标签语法或无关实体。修改后解析 JSON 并回报改动实体、文件和新术语候选。

主 Agent 是共享术语表的唯一维护者。收到新术语时暂停受影响的写入：先查库；若缺失或冲突，询问用户；锁定裁决后通知所有仍在工作的 Agent，并让已完成但受影响的 Agent复查。不得让子 Agent 自行决定冲突术语或写数据库。

## 独立回归门禁

所有写入 Agent 完成且 JSON 可解析后，启动一组全新的只读回归 Agent，仍按实体类型分工。回归 Agent 不得复用写入 Agent，也不得编辑文件；它们逐实体对照不全书、英文 JSON、共享术语表和实际 diff，检查遗漏、误改、术语不一致、标签/结构/数值漂移。

每个回归 Agent 必须返回 `PASS`，或包含文件、实体身份、JSON 路径、期望、实际和证据的 findings。主 Agent验证 findings 后让对应写入 Agent修复；任何修复都使受影响类型的旧 `PASS` 失效，必须由新的只读 Agent 重跑。重复直到所有类型同时为 `PASS`。同一争议连续两轮无法用证据解决时交给用户裁决，禁止无限循环。

## 最终验证

门禁通过后，从仓库根目录依次执行：

```bash
npm run build
npm run test:data
```

修复本次目标改动导致的失败；若修复改变译文，重新运行受影响类型的回归门禁，再从 `npm run build` 开始完整验证。若是基线或其他用户改动导致的失败，保留证据并报告，不扩大范围。不要回滚或格式化用户已有改动。

## 可选术语写回

生成仅含本次新增/修改术语的候选清单，列出英文、中文、category、source、写入动作及可能覆盖的现值。读取 [references/terminology-writeback.md](references/terminology-writeback.md)。必须向用户明确询问是否写入 MySQL；未得到肯定答复时止于预览，不连接或修改数据库。用户同意后按参考流程写回并报告逐项结果。

## 交付

报告 source 解析结果、参考文件数、按类型统计的实体数、修改文件与实体、用户术语裁决、新发现术语、写入/回归 Agent 数和最终门禁结果、`npm run build` 与 `npm run test:data` 的准确结果，以及 MySQL 写回是未执行、成功、部分失败还是失败。列出仍未唯一对应或用户暂缓的实体。
