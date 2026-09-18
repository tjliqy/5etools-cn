# 实体类型与 JSON 文件检索指南

本文用于快速判断：要查找某种 5etools 实体时，应当搜索 `data/` 下的哪个 JSON 文件。

> `data/` 是中文数据，`data-bak/` 是英文上游/参考数据。除特别说明外，两者的目录结构和文件名相同；查英文原文时，将下表中的 `data/` 替换为 `data-bak/` 即可。

## 快速规则

1. 大多数实体位于 `data/<类型>.json`。
2. 怪物、法术、职业按来源或职业拆分到子目录，先查对应目录的 `index.json`。
3. `fluff-*.json` 存放背景介绍、长描述和图片等补充内容；规则/stat block 仍在非 `fluff` 文件中。
4. 分来源文件名中的 `<source>` 是实体 `source` 字段的小写形式。例如 `"source": "MM"` 对应 `bestiary-mm.json`。
5. 搜索实体名称时，中文数据通常应同时检查 `name` 和 `ENG_name` 字段。

## 按来源拆分的核心实体

| 实体类型 | 规则/主体数据 | Fluff/补充描述 | 定位方式 |
| --- | --- | --- | --- |
| 怪物（monster） | `data/bestiary/bestiary-<source>.json` | `data/bestiary/fluff-bestiary-<source>.json` | 先查 `data/bestiary/index.json`；fluff 文件映射见 `fluff-index.json` |
| 传奇生物组（legendaryGroup） | `data/bestiary/legendarygroups.json` | 通常随怪物 fluff | 不按来源拆分 |
| 法术（spell） | `data/spells/spells-<source>.json` | `data/spells/fluff-spells-<source>.json` | 先查 `data/spells/index.json`；fluff 文件映射见 `fluff-index.json` |
| 职业（class） | `data/class/class-<class>.json` | `data/class/fluff-class-<class>.json` | 先查 `data/class/index.json`；`<class>` 是英文职业名小写，如 `wizard` |
| 子职（subclass） | 与所属职业相同：`data/class/class-<class>.json` | `data/class/fluff-class-<class>.json` | 顶层键为 `subclass` / `subclassFluff` |
| 职业特性（classFeature） | 与所属职业相同：`data/class/class-<class>.json` | — | 顶层键为 `classFeature` |
| 子职特性（subclassFeature） | 与所属职业相同：`data/class/class-<class>.json` | — | 顶层键为 `subclassFeature` |
| 冒险正文 | `data/adventure/adventure-<source>.json` | — | 冒险目录和元数据在 `data/adventures.json`；正文顶层键为 `data` |
| 规则书正文 | `data/book/book-<source>.json` | — | 书籍目录和元数据在 `data/books.json`；正文顶层键为 `data` |

`<source>` 不一定只含一个缩写段，例如 `AitFR-DN` 对应文件名 `bestiary-aitfr-dn.json`。不要自行猜缩写，优先读取目录中的 `index.json`。

## 单文件实体

| 实体类型 | 主数据文件 | Fluff/补充描述 | JSON 顶层键 |
| --- | --- | --- | --- |
| 动作 | `data/actions.json` | — | `action` |
| 背景 | `data/backgrounds.json` | `data/fluff-backgrounds.json` | `background` / `backgroundFluff` |
| 堡垒设施 | `data/bastions.json` | `data/fluff-bastions.json` | `facility` / `facilityFluff` |
| 角色创建选项 | `data/charcreationoptions.json` | `data/fluff-charcreationoptions.json` | `charoption` / `charoptionFluff` |
| 状态 | `data/conditionsdiseases.json` | `data/fluff-conditionsdiseases.json` | `condition` / `conditionFluff` |
| 疾病 | `data/conditionsdiseases.json` | 通常无独立 fluff | `disease` |
| 其他状态标记 | `data/conditionsdiseases.json` | 通常无独立 fluff | `status` |
| 专长 | `data/feats.json` | `data/fluff-feats.json` | `feat` / `featFluff` |
| 种族 | `data/races.json` | `data/fluff-races.json` | `race` / `raceFluff` |
| 亚种 | `data/races.json` | 通常合并在种族 fluff 中 | `subrace` |
| 物品 | `data/items.json` | `data/fluff-items.json` | `item` / `itemFluff` |
| 物品组 | `data/items.json` | `data/fluff-items.json` | `itemGroup` / `itemFluff` |
| 基础物品 | `data/items-base.json` | `data/fluff-items.json` | `baseitem` / `itemFluff` |
| 物品类型、属性、精通等基础定义 | `data/items-base.json` | — | `itemType`、`itemProperty`、`itemMastery` 等 |
| 魔法物品变体 | `data/magicvariants.json` | `data/fluff-items.json` | `magicvariant` |
| 可选特性 | `data/optionalfeatures.json` | `data/fluff-optionalfeatures.json` | `optionalfeature` / `optionalfeatureFluff` |
| 灵能 | `data/psionics.json` | — | `psionic` |
| 奖励 | `data/rewards.json` | `data/fluff-rewards.json` | `reward` / `rewardFluff` |
| 变体规则 | `data/variantrules.json` | — | `variantrule` |
| 神祇 | `data/deities.json` | — | `deity` |
| 物件 | `data/objects.json` | `data/fluff-objects.json` | `object` / `objectFluff` |
| 陷阱 | `data/trapshazards.json` | `data/fluff-trapshazards.json` | `trap` / `trapFluff` |
| 危害 | `data/trapshazards.json` | `data/fluff-trapshazards.json` | `hazard` / `hazardFluff` |
| 邪教 | `data/cultsboons.json` | — | `cult` |
| 恩赐 | `data/cultsboons.json` | — | `boon` |
| 表格 | `data/tables.json` | — | `table` |
| 卡组 | `data/decks.json` | 卡牌也在同一文件 | `deck` |
| 卡牌 | `data/decks.json` | — | `card` |
| 载具 | `data/vehicles.json` | `data/fluff-vehicles.json` | `vehicle` / `vehicleFluff` |
| 载具升级 | `data/vehicles.json` | — | `vehicleUpgrade` |
| 语言 | `data/languages.json` | `data/fluff-languages.json` | `language` / `languageFluff` |
| 文字/书写系统 | `data/languages.json` | — | `languageScript` |
| 配方 | `data/recipes.json` | `data/fluff-recipes.json` | `recipe` / `recipeFluff` |
| 技能 | `data/skills.json` | — | `skill` |
| 感官 | `data/senses.json` | — | `sense` |
| 遭遇表 | `data/encounters.json` | — | `encounter` |
| 姓名表 | `data/names.json` | — | `name` |
| 钩织图样（homecraft） | `data/homecrafts.json` | `data/fluff-homecrafts.json` | `crochetPattern` / `crochetPatternFluff` |

## 容易混淆的文件

| 文件 | 用途 |
| --- | --- |
| `data/adventures.json` | 冒险列表和元数据，不是冒险正文 |
| `data/books.json` | 规则书列表和元数据，不是书籍正文 |
| `data/*/index.json` | 来源/职业到实际数据文件的映射，不是实体集合 |
| `data/*/fluff-index.json` | fluff 文件映射 |
| `data/foundry-*.json`、`data/class/foundry.json`、`data/spells/foundry.json` | Foundry VTT 专用覆盖或附加数据；一般不作为实体主数据搜索入口 |
| `data/generated/*.json` | 构建脚本生成的索引、查找表、地图或快速参考；不要作为手工维护实体的首选位置 |
| `data/loot.json` | 战利品生成表，不是具体物品实体；具体物品查 `items*.json` |
| `data/life.json` | 角色生平生成器数据，不是背景实体；背景查 `backgrounds.json` |
| `data/msbcr.json`、`data/monsterfeatures.json` | CR 计算器辅助数据，不是怪物实体 |
| `data/bestiary/template.json` | 怪物和传奇组模板，不是正式实体 |

## 推荐搜索方法

已知实体类型但不知道来源时，可直接搜索相应文件或目录。例如：

```bash
# 搜索种族
rg -n '目标名称' data/races.json data/fluff-races.json

# 搜索怪物（主体和 fluff）
rg -n '目标名称' data/bestiary/bestiary-*.json data/bestiary/fluff-bestiary-*.json

# 搜索法术（主体和 fluff）
rg -n '目标名称' data/spells/spells-*.json data/spells/fluff-spells-*.json

# 中英文名称一起搜索
rg -n '中文名|English Name' data/
```

已知 `source` 时应缩小到对应文件。例如怪物的 `source` 为 `MM`：

```bash
rg -n '目标名称' data/bestiary/bestiary-mm.json data/bestiary/fluff-bestiary-mm.json
```

部分实体没有独立 fluff 记录；找不到对应 `fluff` 文件或条目是正常情况。
