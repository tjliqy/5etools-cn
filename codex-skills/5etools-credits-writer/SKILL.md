---
name: 5etools-credits-writer
description: Add explicitly requested translator, proofreader, editor, or other credit rows to the 5e-translator MySQL `credits` table for 5etools source files. Use when the user asks to record credits; do not use for changing translation entries in `words` or syncing Chinese JSON.
---

# 写入 5etools credits

将用户明确指定的 credits 记录写入 `/data/5e-translator` 使用的数据库，并逐条回查确认。不要把此流程用于 `words` 表译文更新；译文同步使用 `sync-cn`。

## 执行前确认

- 用户必须明确要求写入，并能确定目标文件、`job_type`、`names`。不得根据译者字段或文件内容自行推断贡献者。
- 核对目标 JSON 确实存在，并将 `credits.file` 写成相对于 5etools `data` 根目录的路径。例如 `data/adventure/adventure-foo.json` 对应 `adventure/adventure-foo.json`。
- 如果用户用通配符或数量描述文件，先展开并列出全部匹配文件，确认数量与范围符合要求；不要把未确认的文件纳入写入。
- `credits.category` 是必填项。根据目标数据类型及现有同类记录确定它（例如冒险记录使用 `adventure`）。不能可靠确定时先询问，不要留空或猜测。
- 读取并保留该文件现有 credits。完全相同的 `(file, job_type, names, category)` 已存在时跳过；其他已有记录不覆盖、不删除。若 `(file, job_type, names)` 相同但 `category` 不同，停止并报告冲突，先确认是否要修正。若用户的要求看起来像替换现有记录，先区分“追加”与“替换”。

## 写入方式

使用 `/data/5e-translator/.venv/bin/python`，工作目录设为 `/data/5e-translator`，通过项目的 `DBDictionary` 和 `MySQLDatabase` 封装访问数据库。不要打印或复制 `.env`、数据库密码或其他凭据。

先查询 credits 表结构，确认 `id` 为自增主键，且待写字段为 `file`、`job_type`、`names`、`category`。当前已知表结构中后三个文本字段长度有限（`job_type` 和 `category` 为 `char(10)`，`file` 和 `names` 为 `varchar(255)`）；写入前检查值不会超长。

对全部目标记录使用参数化 SQL，在一个数据库事务中先检查完全相同的记录，再插入缺失行。项目连接器可通过 `DBDictionary().db_list[0].execute_transaction(callback)` 执行事务；`callback` 接收游标。不要将用户值插入 SQL 字符串，也不要分散提交半批记录。

写入模式示例（将 `rows` 替换为已经确认的记录列表）：

```python
from app.core.database import DBDictionary

db = DBDictionary()
if not db.ok:
    raise RuntimeError("数据库连接失败")

rows = [
    {
        "file": "adventure/adventure-foo.json",
        "job_type": "翻译&校对",
        "names": "译者名",
        "category": "adventure",
    },
]

def insert_missing(cursor):
    inserted, existing = [], []
    for row in rows:
        cursor.execute(
            "SELECT id, category FROM credits WHERE file=%s AND job_type=%s AND names=%s LIMIT 1",
            (row["file"], row["job_type"], row["names"]),
        )
        found = cursor.fetchone()
        if found:
            if found["category"] != row["category"]:
                raise ValueError(f"credits category 不匹配: {row['file']}")
            existing.append(row["file"])
            continue
        cursor.execute(
            "INSERT INTO credits (file, job_type, names, category) VALUES (%s, %s, %s, %s)",
            (row["file"], row["job_type"], row["names"], row["category"]),
        )
        inserted.append(row["file"])
    return inserted, existing

inserted, existing = db.db_list[0].execute_transaction(insert_missing)
```

## 写入后回查

- 对每个目标 `file` 调用 `db.get_credits(file)` 或用参数化查询回查整行，确认 `job_type`、`names`、`category` 与请求完全一致。
- 汇报新增条数、已存在而跳过的条数和逐文件结果。若事务失败或回查不符，明确报告失败；不要通过删除记录或再次盲目写入来掩盖问题。
- 该 skill 只操作 credits 表，不自动重跑 translate，也不改写 `data` 或 `data-bak` JSON。用户另行要求生成文件时，再按其指定范围执行并核对输出。
