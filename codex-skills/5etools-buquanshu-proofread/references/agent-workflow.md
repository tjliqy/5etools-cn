# Agent 工作协议

## 写入 Agent

主 Agent 为每个任务提供：source、实体类型、互斥目标文件、实体身份清单、不全书参考文件及位置、对应英文 JSON、锁定术语表、用户裁决和任务开始时相关 diff。

写入 Agent必须：

1. 先验证每个实体的英文 `name`/`source` 与目标的 `ENG_name` 或稳定身份；不能唯一匹配时报告而不编辑。
2. 只校对获分配实体的人类可读字段。保留 JSON 结构、数组顺序、非文本标量、英文身份、5etools 标签和用户既有无关改动。
3. 参考文本与英文语义共同约束修改：不全书决定中文译法，英文 JSON 防止错配、漏义或把排版噪声写入数据。
4. 严格应用锁定术语表。遇到表外专名或规则术语时，先回报 `NEW_TERM`（英文、建议中文、类别、实体、参考位置、受影响文件），等待主 Agent裁决后再继续受影响内容。
5. 用 `apply_patch` 编辑；每轮实质修改后解析获分配 JSON。
6. 回报修改文件、实体、关键字段、新术语、解析结果和无法处理项，不运行全仓 build/test，不写术语库。

同一个目标 JSON 文件只能有一个写入所有者。一个实体类型横跨多个文件时可继续细分 Agent，但文件集合必须互斥。

## 回归 Agent

回归 Agent必须是没有参与对应写入的新 Agent，只读检查，不得调用编辑、格式化、build、数据库写入操作。输入应包含与写入 Agent相同的证据，以及最终 diff 和共享术语表。

逐个实体检查：

- 不全书中的名称、动作、特性和正文译法是否完整落入正确字段；
- 所有锁定术语是否一致，尤其是用户指定“术语库优先”的例外；
- 英文 JSON 的语义、数字、目标、次数、时机和条件是否保持；
- JSON 结构、标签语法、身份字段及范围外实体是否未被破坏；
- 是否有不全书排版页眉、页脚、断行或 OCR 噪声误入译文。

无问题时只返回 `PASS` 和已检查实体数。否则每项按以下格式返回：

```text
FILE: data/...
ENTITY: English Name | SRC | type
PATH: $.topLevel[...].field
EXPECTED: ...
ACTUAL: ...
EVIDENCE: <reference:line/chapter and/or English JSON path>
REASON: missing | mistranslation | terminology | structure | tag | scope
```

不得只给风格偏好；finding 必须有可复核证据。
