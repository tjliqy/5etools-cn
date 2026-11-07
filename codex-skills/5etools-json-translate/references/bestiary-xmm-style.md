# `bestiary-xmm.json` 怪物翻译规范

本规范从 `data-bak/bestiary/bestiary-xmm.json` 与 `data/bestiary/bestiary-xmm.json` 的英中对照中归纳，仅用于 `data-bak/bestiary/**/*.json`。

## 使用原则

1. `XMM` 是怪物规则文本的首选风格语料。先复用相同机制的句式，再处理当前怪物的专名、数值和细节。
2. 固定术语应保持一致；同一术语不要在“豁免/豁免检定”“受擒/擒抱状态”等近义表达间随意切换。
3. `XMM` 不是可无条件复制的真值。若对照片段出现专名串用、数值变化、重复词或标点差异，以当前英文的数值、目标、时点、次数、距离、伤害类型和标签为准，只借用可靠措辞。
4. 保留 5etools 标签类型、参数顺序和来源缩写。翻译标签中的实体名和显示文本，但不得改动 `{@hit ...}`、`{@dc ...}`、`{@damage ...}`、`{@recharge ...}`、`{@actSave...}` 等机械参数。
5. 优先采用中文全角标点和紧凑格式；若目标文件的相邻条目已有统一格式，则跟随局部格式。不要为了模仿个别 XMM 条目而引入多余空格或标签后的冒号。

## 核心机械术语

| English | 固定译法 |
| --- | --- |
| attack roll | 攻击检定 |
| ability check | 属性检定 |
| saving throw | 豁免检定；具体语境可简称“豁免” |
| spell save | 法术豁免 |
| spell attack | 法术攻击 |
| Hit Points | 生命值 |
| Temporary Hit Points | 临时生命值 |
| Armor Class / AC | 护甲等级 / AC |
| Speed | 速度 |
| Fly Speed | 飞行速度 |
| Swim Speed | 游泳速度 |
| Burrow Speed | 掘穴速度 |
| Climb Speed | 攀爬速度 |
| Advantage / Disadvantage | 优势 / 劣势 |
| Resistance / Immunity / Vulnerability | 抗性 / 免疫 / 易伤 |
| D20 Test | D20检定（标签显示采用语料中的 `D20 检定`） |
| Initiative | 先攻 |
| Concentration | 专注 |
| Bloodied | 浴血 |
| Opportunity Attack | 借机攻击 |
| Bonus Action / Reaction | 附赠动作 / 反应 |
| Long Rest / Short Rest | 长休 / 短休 |
| Difficult Terrain | 困难地形 |
| Bright Light / Dim Light / Darkness | 明亮光照 / 微光光照 / 黑暗 |
| Heavily Obscured | 重度遮蔽 |
| Critical Hit | 重击 |

六项属性固定为“力量、敏捷、体质、智力、感知、魅力”。距离统一使用“尺”，不要在新译文中混用“英尺”。

## 状态与区域

| English | 固定译法 |
| --- | --- |
| Blinded | 目盲 |
| Charmed | 魅惑 |
| Deafened | 耳聋 |
| Exhaustion | 力竭 |
| Frightened | 恐慌 |
| Grappled | 受擒 |
| Incapacitated | 失能 |
| Invisible | 隐形 |
| Paralyzed | 麻痹 |
| Petrified | 石化 |
| Poisoned | 中毒 |
| Prone | 倒地 |
| Restrained | 束缚 |
| Stunned | 震慑 |
| Unconscious | 昏迷 |

| Area of Effect | 固定译法 |
| --- | --- |
| Emanation | 光环 |
| Cone | 锥状 |
| Cube | 立方 |
| Cylinder | 柱状 |
| Line | 线状 |
| Sphere | 球状 |

区域标签沿用完整结构，例如 `{@variantrule 光环 [效应区域]|XPHB|光环}`。不要只翻译首段而遗留英文显示文本。

## 伤害类型

| English | 固定译法 |
| --- | --- |
| Acid | 强酸 |
| Bludgeoning | 钝击 |
| Cold | 寒冷 |
| Fire | 火焰 |
| Force | 力场 |
| Lightning | 闪电 |
| Necrotic | 暗蚀 |
| Piercing | 穿刺 |
| Poison | 毒素 |
| Psychic | 心灵 |
| Radiant | 光耀 |
| Slashing | 挥砍 |
| Thunder | 雷鸣 |

常用组合：`X damage plus Y damage` 译为“X伤害外加Y伤害”；条件触发的替代伤害用“若……，则改为……伤害”。不要把数值、骰式或伤害类型合并丢失。

## 攻击动作句式

保留攻击标签，用下列骨架：

```text
{@atkr m} 命中{@hit N}，触及X尺。{@h}A（{@damage ...}）点伤害。
{@atkr r} 命中{@hit N}，射程X/Y尺。{@h}A（{@damage ...}）点伤害。
{@atkr m,r} 命中{@hit N}，触及X尺或射程Y尺。{@h}A（{@damage ...}）点伤害。
```

- 英文 `{@hit N} to hit` 译为“命中{@hit N}”，将“命中”放在命中加值标签前；不要写成“{@hit N} 命中”。例如：`{@atkr m} 命中{@hit 7}，触及 5 尺。{@h}21 ({@damage 5d6 + 4}) 点穿刺伤害。`
- `reach` → “触及”；`range` → “射程”。
- 不要擅自在 `{@atkr ...}`、`{@h}` 后增加解释性文字；这些标签由渲染器生成标题。
- `If the target is a Large or smaller creature` → “若目标为体型不超过大型的生物”。其他体型照此替换。
- `it has the Grappled condition (escape DC N)` → “其陷入受擒状态（逃脱DC N）”。若由触须、锁链等具体部位擒抱，应保留该施事信息。
- `and it has the Restrained condition until the grapple ends` → “且目标陷入束缚状态直至擒抱结束”。
- `the target's Hit Point maximum decreases by an amount equal to ... damage taken` → “目标的生命值上限减少等于其所受……伤害的数值”。

高频动作名优先使用：

| English | 固定译法 |
| --- | --- |
| Multiattack | 多重攻击 |
| Bite | 啃咬 |
| Rend | 撕裂 |
| Claw / Claws | 爪击 |
| Slam | 猛击 |
| Gore | 顶撞 |
| Hooves | 蹄击 |
| Talons | 禽爪 |
| Tail | 尾击 |
| Beak | 喙啄 |
| Ram | 冲撞 |
| Constrict | 绞缠 |
| Tentacle / Tentacles | 触须 |
| Pseudopod | 伪足 |
| Sting | 钉刺 |
| Fist | 拳击 |
| Scratch | 抓挠 |
| Swallow | 吞咽 |

`The creature makes two/three ... attacks` 使用“该生物发动两/三次……攻击”；`It can replace one attack with ...` 使用“其可以将其中一次攻击替换为……”。数量、动作名及是否可替换必须逐项核对。

## 豁免与持续效应句式

- 保留 `{@actSave str|dex|con|int|wis|cha}`、`{@actSaveFail}`、`{@actSaveSuccess}`、`{@actSaveSuccessOrFail}` 标签及顺序。
- `one creature ... within N feet` → “N尺内……的单一生物”或按语境使用“一名生物”。
- `each creature in a N-foot ...` → “N尺……区域内的每名生物”。
- `The target has the X condition` → “目标陷入X状态”。
- `until the start/end of its next turn` → “直至其下个回合开始/结束”。主语不是目标时必须明确写出对应生物。
- `The target repeats the save at the end of each of its turns, ending the effect on itself on a success.` → “目标在其每个回合结束时重复豁免，成功则终止其身上的该效应。”
- `After 1 minute, it succeeds automatically.` → “1分钟后，其豁免自动成功。”
- `The target is immune to this ... for 24 hours.` → “目标在24小时内免疫此……”。
- `Half damage.` → “半伤。”；`Half damage only.` → “仅半伤。”
- `If ... fails a saving throw, it can choose to succeed instead.` → “……豁免失败时，可以将其改为豁免成功。”

## 特性、移动、施法与反应

高频特性名：

| English | 固定译法 |
| --- | --- |
| Magic Resistance | 魔法抗性 |
| Legendary Resistance | 传奇抗性 |
| Amphibious | 水陆两栖 |
| Pack Tactics | 集群战术 |
| Spider Climb | 蛛行术 |
| Sunlight Sensitivity | 日照敏感 |
| Flyby | 飞掠 |
| Regeneration | 再生 |
| Water Breathing | 水下呼吸 |
| Hold Breath | 屏息 |
| Incorporeal Movement | 虚体移动 |
| Siege Monster | 攻城怪物 |
| Web Walker | 蛛网行者 |
| Nimble Escape | 迅捷逃逸 |
| Shadow Stealth | 幽影隐匿 |
| Evasion | 反射闪避 |
| Shape-Shift | 变形 |
| Parry | 格挡 |

固定句式：

- `has Advantage on saving throws against spells and other magical effects` → “对抗法术和其他魔法效应时进行的豁免检定具有优势”。标签已有“优势”显示文本时，不要在标签后重复“优势”。
- `moves up to its Speed` → “移动至多等于其速度的距离”；`half its Speed` → “移动至多等于其速度一半的距离”。
- `without provoking Opportunity Attacks` → “且不会引发借机攻击”。
- `teleports up to N feet to an unoccupied space it can see` → “传送至多N尺至一处其可见的未占据空间”。
- `casts one of the following spells` → “施展以下一道法术”。
- `requiring no Material components and using X as the spellcasting ability` → “无需材料成分并使用X作为施法属性”。
- `(spell save DC N, +N to hit with spell attacks)` → “（法术豁免DC N，+N法术攻击命中）”，保留原标签形式。
- `using the same spellcasting ability as Spellcasting` → “使用与施法动作相同的施法属性”。
- `{@actTrigger}` 与 `{@actResponse}` 原样保留，分别在其后翻译触发条件与响应效果。不要把触发条件中的攻击者、可见性、距离或时点挪到响应段。
- `possibly causing it to miss` → “可能令该次攻击改为失手”。
- `can't take this action again until the start of its next turn` → “直至其下个回合开始都无法再执行此动作”。

## 对照检索

遇到本文件未覆盖的句式时，运行：

```bash
python3 <skill-dir>/scripts/lookup_bestiary_xmm.py "English phrase" --section action --limit 10
```

检索结果用于确认措辞。采用前必须逐项比较英文机制；若多条中文不一致，优先选择重复出现、语义完整且没有专名或数值串用的版本。
