# 5e-translator CLI 改进需求：sync-cn 预演工具化 + 非交互决策文件

> 背景：2026-09-20 对 `data/book/book-bmt.json` 执行 sync-cn-to-db 技能时暴露的两个流程缺口。
> 实现仓库：`/data/5e-translator`。涉及文件：`app/cli/sync_from_cn.py`、`main.py`、`app/cli/tests/test_sync_from_cn.py`。
> 环境事实：须用 `.venv/bin/python` 且 cwd 为仓库根（否则 dotenv/logger_config 导入失败）；`MySQLDatabase(**DB_CONFIG)` 需先 `{k.lower(): v}` 转小写键；表结构见 `sql/create_mysql.sql`（words / word_usage / term）。

---

## 需求一：sync-cn 只读预演（--preview / preview_sync_from_cn）

### 背景与现状
`sync_from_cn()`（app/cli/sync_from_cn.py L381-608）没有只读模式，分类逻辑内联在函数里：

- 分类循环 L414-438：missing（`sql_id is None or tag_sync_required`）/ matching（`cn_str == manual`）/ auto_keep（`manual == en_str` 或 `_differs_only_by_quote_style`）/ auto_modify（`_differs_only_inside_tags`）/ 其余为 conflict；
- 自动与人工决策交织在 L446-491，随后 L571 `apply_sync_batch` 写库。

外部要预演只能复刻这套逻辑并 import 私有函数（`_differs_only_by_quote_style`、`_differs_only_inside_tags`），与实现存在漂移风险（本次预演即靠复刻，CLI 若改动预演就会失真）。

### 目标
同一份分类代码既服务预演也服务真实同步；预演产出机器可读 JSON 报告（含决策所需全部证据），不写任何数据。

### 功能需求
1. **CLI**：`main.py sync-cn` 新增 `--preview` 与 `--report <path>`：
   - `--preview`：执行分析 + 对齐 + 分类，不调用 `apply_sync_batch`，不触发文件表更新（analyzer 保持 `read_only=True` 路径），不进入冲突决策，打印人类可读摘要后退出码 0。
   - `--report <path>`：报告落盘路径；未指定时 JSON 打到 stdout。
2. **程序化 API**：`preview_sync_from_cn(en_path, cn_path=None, mode="5et", source_root=None) -> dict`，与 `sync_from_cn` 同参。
3. **单一事实来源**：把分类重构为共享函数（如 `classify_alignment(alignment, jobs_by_uid) -> ClassifyResult`），`sync_from_cn` 与 preview 共同调用；`_differs_only_by_quote_style` / `_differs_only_inside_tags` 提供公开名称（去下划线或公开别名）。
4. **报告 schema**：
   ```json
   {
     "en_path": "", "cn_path": "", "mode": "5et",
     "summary": {"total_jobs": 0, "translated": 0, "missing": 0, "matching": 0,
                  "auto_keep": 0, "auto_modify": 0, "conflict": 0, "alignment_errors": 0},
     "entries": {
       "missing": [], "auto_keep": [], "auto_modify": [], "conflict": []
     },
     "evidence": {
       "candidates": {"<en>": [{"id":0,"cn":"","proofread":false,"is_key":false,"usage_count":0,"json_file":""}]},
       "usage_files": {"<sql_id>": {"<file>": 0}}
     },
     "collisions": [{"word_id":0,"uids":[],"distinct_file_values":[],"kind":"conflict-vs-conflict|conflict-vs-auto_modify"}],
     "alignment_errors": []
   }
   ```
   - 条目字段：`uid`、`en`（完整字符串）、`cn_db`、`cn_file`、`sql_id`、`is_proofread`、`tag`、`key_path`、`tag_child`（key_path 是否以 `/<tag>[N]` 形式结尾，识别标签子任务用）。
   - **matching 默认只计数不展开**（本次案例 4850 条，全量会撑爆报告）；加 `--include-matching` 才展开。
   - `evidence.candidates`：conflict + missing 涉及的去重英文 → words 精确匹配候选列表（按 usage_count 降序）。
   - `evidence.usage_files`：conflict + auto_modify 涉及的 sql_id → word_usage 按文件分布（跨文件影响评估的关键证据）。
   - `collisions`：同一 word_id 在待决条目中出现多个不同 cn_file 值，或 auto_modify 与 conflict 共享 word_id 且值不同——即真实运行会触发"同一记录不能改成两个值"拦截的位置，提前暴露。
5. **查询批量执行**：en 列表 / word_id 列表分块 `IN` 查询，参数化，禁止 SQL 拼接。
6. **输出确定性**：条目按 `(section, en, cn_db, cn_file, uid)` 排序，保证两次预演 diff 稳定。
7. **目录模式**：`sync_from_cn_path` 同样支持预演，逐文件报告合并并标注 rel path。

### 验收标准
- 预演后 words / word_usage 零变化（测试断言；用 MemoryDBDictionary 或事务回滚验证）。
- 分类一致性：同一夹具下，预演各 section 计数与真实同步（给定决策后）的汇报口径可对上：`matched == matching`、`kept_database == auto_keep + keep决策`、`added == missing + add决策`、`updated == auto_modify与modify决策的word_id去重并集`。
- 报告可 `json.load` 且含全部字段。
- 现有 `test_sync_from_cn.py` 全过；新增测试覆盖：分类正确、无写库、collisions 检出、matching 默认不展开。

### 非目标
- 预演不做冲突"决策"（决策由需求二的规则文件表达）。
- 不改 Redis / 缓存行为。

---

## 需求二：非交互决策文件（--decisions / --decision-log）

### 背景与现状
冲突决策依赖 `_prompt_conflict`（L279-299，input 循环）。非 TTY 且有未决冲突且未传 `decision_provider` 时直接 `RuntimeError`（L442-443："发现译文冲突，但当前不是交互终端"）。agent/CI 无法走 CLI 入口，只能写 Python 调 `decision_provider`——人审决策清单与执行代码分离，存在转录错误风险，且没有统一审计日志。

### 目标
决策以机器可读规则文件表达，CLI 直接执行；规则不命中即 fail-closed（写库前中止）；全程产出决策日志。

### 功能需求
1. **CLI**：`sync-cn` 新增 `--decisions <path.json>` 与 `--decision-log <path.json>`。
2. **决策文件 schema**：
   ```json
   {
     "default": {"action": "modify", "reason": "库中记录仅本书使用，采用文件译文"},
     "rules": [
       {"match": {"en_in": ["Skeleton", "Wight"]}, "action": "keep", "reason": "标签重排序错位，库中正确"},
       {"match": {"sql_id": 251108}, "action": "add", "reason": "关联文件未更新，本书语境独立新增"},
       {"match": {"en": "Rogue"}, "action": "add", "fallback": "keep", "reason": "重绑到已有 (Rogue, 浪客) 记录"}
     ]
   }
   ```
   - match 字段（同一对象内 AND 组合）：`en`（精确）、`en_in`（数组）、`sql_id`、`sql_id_in`、`tag_child`（布尔）、`file`（相对路径，目录模式用）。
   - rules 按序匹配，首个命中生效；无命中且无 `default` → 启动即报错退出（发生在任何写库之前）。
   - `action` ∈ {add, modify, keep}；未知 action / 未知 match 键 / 缺 `reason` → 校验错误。
3. **碰撞语义**（对应现有 L446-491 的"同一 word_id 已被改为另一值"拦截）：
   - 命中规则带 `fallback` → 改用 fallback 动作继续，并记录 `fallback_used: true`；
   - 否则整体中止（决策阶段在 `apply_sync_batch` 之前，中止保证零写入），错误信息列出 word_id、冲突的两个值、命中的规则。
4. **决策日志**（`--decision-log`）：每个到达决策的冲突记录 `index`、`uid`、`sql_id`、`en`、db 值、file 值、命中规则（或 default）、`action`、`fallback_used`、`reason`；运行结束随摘要落盘。未传该参数时仅打印摘要。
5. **程序化 API**：`build_decision_provider_from_rules(rules_dict) -> decision_provider`；CLI 与库调用同一实现；`_prompt_conflict` 保留为 TTY 回退；现有 `decision_provider` 参数继续可用（向后兼容）。
6. **与 --preview 协同**（依赖需求一，非阻塞）：`--decisions` + `--preview` 组合可干跑校验规则覆盖度与碰撞，不写库。
7. **目录模式**：同一规则集逐文件应用，`file` 匹配键可区分文件；维持现有"目录逐文件提交、单文件失败不回滚"语义并在 `--help` 注明。
8. **退出码**：验证通过 0；校验失败 / fail-closed 中止 / 验证失败非 0，错误消息含首个差异或冲突位置。

### 验收标准
- TTY + 无 `--decisions`：交互行为与现在完全一致。
- 非 TTY + `--decisions`：完整执行并通过内建重生成验证；决策日志条目与实际写入一致（如 add 决策数 = 摘要 added 中对应部分）。
- fail-closed：缺 default 且存在未命中冲突 → 写库前退出，DB 零变化。
- 碰撞：同 word_id 两个不同值都判 modify → 无 fallback 时中止零写入；有 fallback 时按 fallback 执行并记日志。
- schema 校验：未知 action / 缺 reason / 未知 match 键 → 启动即报错。
- 测试加入 `app/cli/tests/test_sync_from_cn.py`，沿用现有 MemoryDBDictionary 夹具方式。

### 参考锚点（本次真实运行的等价 provider 逻辑，可作测试样例）
- keep 集：en ∈ {Skeleton, skeletons, Wight, wights, Warhorse Skeleton, warhorse skeletons}（标签重排序错位的假冲突）；
- add 集：{Rogue, Star, Flames, Skull, Talons, Astral Sea, Malaxxix the Shackler, 9: Boss Delour's Quarters, Effect, Mask, Calamity, Mishap, Clockwork Armor} + sql_id=251108；
- 其余 modify；modify 被同记录先行修改拦截时降级 add。
- 真实规模参考：366 项决策 = 328 modify / 32 add / 6 keep；汇总 added 291（其中 14 条真正新建 words、277 条复用已有 (en, cn) 重绑）、updated 804、kept 22、matched 4850。
