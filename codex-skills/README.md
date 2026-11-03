# Codex Skills

这个目录放的是我给当前仓库准备的本地 Codex skill 和测试素材。

当前 skill：
- `homebrew-conversion-audit`
- `5etools-json-translate`：按单个 `data-bak` JSON 的 Git diff 增量更新对应的 `data` 中文 JSON，并执行构建与数据测试。
- `5etools-credits-writer`：将用户明确指定的贡献者记录追加到 `/data/5e-translator` 的 credits 表，并回查确认。

对应路径：
- [homebrew-conversion-audit/SKILL.md](/data/5etools-mirror-2.github.io/codex-skills/homebrew-conversion-audit/SKILL.md:1)
- [5etools-json-translate/SKILL.md](/data/5etools-mirror-2.github.io/codex-skills/5etools-json-translate/SKILL.md:1)
- [5etools-credits-writer/SKILL.md](/data/5etools-mirror-2.github.io/codex-skills/5etools-credits-writer/SKILL.md:1)

## 这是什么

`homebrew-conversion-audit` 是一套给 Codex 用的半自动转换工作流，目标是把：
- `doc`
- `docx`
- `raw text`
- `md`
- `pdf`

这类输入，整理成 5etools 风格 JSON 或 `/data/homebrew/collection` 风格的 collection 草稿。

它的核心思路是：
1. 先抽取文档结构。
2. 让当前对话中的 Codex 识别实体边界。
3. 先跑现有 converter。
4. 再做检查。
5. 失败时由当前对话中的 Codex 生成 repair patch。
6. 再自动并回 collection。

## 如何部署到 Codex

Codex 的本地 skill 本质上就是一个目录，目录里至少要有一个 `SKILL.md`。

目标目录通常是：

```text
$CODEX_HOME/skills/<skill-name>/
```

如果你没有单独设置 `CODEX_HOME`，一般就是：

```text
~/.codex/skills/<skill-name>/
```

对这个 skill 来说，最终目标路径应当类似：

```text
~/.codex/skills/homebrew-conversion-audit/
```

### 方式一：复制

适合稳定使用。

也可以直接用脚本：

```bash
bash /data/5etools-mirror-2.github.io/codex-skills/install-skill.sh
```

手动方式：

```bash
mkdir -p ~/.codex/skills
cp -R /data/5etools-mirror-2.github.io/codex-skills/homebrew-conversion-audit ~/.codex/skills/
```

如果你使用了自定义 `CODEX_HOME`，把上面的 `~/.codex` 换成对应目录即可。

### 方式二：软链接

适合边开发边调试，改完仓库里的文件后，Codex 直接看到新版本。

也可以直接用脚本：

```bash
bash /data/5etools-mirror-2.github.io/codex-skills/install-skill.sh --mode link
```

手动方式：

```bash
mkdir -p ~/.codex/skills
ln -s /data/5etools-mirror-2.github.io/codex-skills/homebrew-conversion-audit ~/.codex/skills/homebrew-conversion-audit
```

如果目标已存在，先删掉旧链接或旧目录再重建。

## 安装后怎么用

当 Codex 能看到这个 skill 后，在对话里提到类似这些需求时就应该会触发：
- 把模组文档转换成 5etools JSON
- 审核 converter 输出是否可靠
- 生成 repair prompt
- 用当前对话中的 Codex 修复失败实体
- 把修复结果自动并回 collection

你也可以直接明确提这个 skill 的用途，比如：

```text
用 homebrew-conversion-audit 处理这个 docx
```

## 这个 skill 依赖什么

这个 skill 不是纯提示词，它依赖仓库里的脚本和当前项目的 5etools 代码。

关键文件包括：
- [homebrew-conversion-audit/scripts/homebrew-conversion-cli.js](/data/5etools-mirror-2.github.io/codex-skills/homebrew-conversion-audit/scripts/homebrew-conversion-cli.js:1)
- [homebrew-conversion-audit/scripts/build-collection-from-plan-cli.js](/data/5etools-mirror-2.github.io/codex-skills/homebrew-conversion-audit/scripts/build-collection-from-plan-cli.js:1)
- [homebrew-conversion-audit/scripts/run-entity-audit.js](/data/5etools-mirror-2.github.io/codex-skills/homebrew-conversion-audit/scripts/run-entity-audit.js:1)
- [homebrew-conversion-audit/scripts/extract-input.js](/data/5etools-mirror-2.github.io/codex-skills/homebrew-conversion-audit/scripts/extract-input.js:1)
- [homebrew-conversion-audit/scripts/prepare-entity-bundle.js](/data/5etools-mirror-2.github.io/codex-skills/homebrew-conversion-audit/scripts/prepare-entity-bundle.js:1)
- [homebrew-conversion-audit/scripts/split-entities.js](/data/5etools-mirror-2.github.io/codex-skills/homebrew-conversion-audit/scripts/split-entities.js:1)

所以最稳的用法是：
- 在这个仓库里运行脚本
- 把 skill 安装到 `~/.codex/skills/`
- 让 Codex 在对话中调用这套工作流

## 推荐使用流程

### 1. 导出 entity bundle

```bash
node codex-skills/homebrew-conversion-audit/scripts/homebrew-conversion-cli.js bundle \
  --input codex-skills/寂静挽歌.docx \
  --kind adventureDocument \
  --entity-bundle /tmp/module.bundle.json
```

### 2. 把 bundle 给当前对话中的 Codex，让 Codex 返回 `entityPlan`

返回的 `kind` 建议优先用这些值：
- `adventureDocument`
- `monster`
- `spell`
- `item`
- `feat`
- `background`
- `language`
- `reward`
- `race`
- `deity`
- `subclass`
- `table`
- `unknown`

### 3. 用 plan 构建 collection 草稿

```bash
node codex-skills/homebrew-conversion-audit/scripts/homebrew-conversion-cli.js build-collection \
  --input codex-skills/寂静挽歌.docx \
  --entity-plan /tmp/module.plan.json \
  --output /tmp/module.collection.json \
  --source SiEl \
  --name "寂静挽歌" \
  --repair-dir /tmp/repairs \
  --llm-result-dir /tmp/repairs
```

### 4. 如果某些实体失败，就把 Codex repair 结果存成文件后重跑

命名约定：
- `<title>.monster.result.json`
- `<title>.spell.result.json`
- `<title>.item.result.json`

例如：
- `False_Hydra.monster.result.json`
- `Sending.spell.result.json`
- `Wand_of_Smiles.item.result.json`

重跑 `build-collection` 后，脚本会自动尝试读取并回这些结果。

## 目前能力边界

目前最成熟的是：
- `monster`

已经接上最小链路的是：
- `spell`
- `item`

已经接上通用引用/`statblock` 后处理的是：
- `feat`
- `background`
- `language`
- `reward`
- `race`
- `deity`
- `subclass`

还没完全打通的部分包括：
- `pdf` 真正提取实现
- `doc` 直接解析
- 更完整的正式 schema 校验
- 更多实体类型的独立 converter/checker/repair 流程
