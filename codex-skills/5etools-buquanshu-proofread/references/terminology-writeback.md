# 术语库写回

MySQL 写回属于独立的外部状态变更。完成 JSON 校对和最终测试后才可进行，并且必须先得到用户对候选清单的明确同意。

## 准备候选

为本次裁决生成 UTF-8 CSV，列为 `English,中文,category`；只包含用户同意写回的新增或修改项。写回前使用 `lookup_reference.py translations` 再查询一次现值，展示新增、同值跳过和冲突/覆盖三类预览。不得把临时实体片段或未经用户裁决的冲突项写入。

## 执行

使用 5e-translator 的受支持入口，不直接拼 SQL：

```bash
cd /data/5e-translator
/data/5e-translator/.venv/bin/python main.py term --mode sync --en <候选.csv>
```

该命令可能对冲突项交互式询问覆盖、改分类新增或跳过。严格按用户已批准的逐项动作回答；出现未预览的新冲突时停止并询问用户，不临场扩大授权。不得打印数据库配置或凭据。

写回后重新执行只读查询验证每个获批术语，报告 inserted、updated、skipped、failed。MySQL 写回不改变已经通过的 JSON/build/test 结果；若用户因写回结果要求改 JSON，则该改动重新触发相应实体类型的回归和两项最终测试。
