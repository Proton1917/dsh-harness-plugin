# DSH Medical

`@proton1917/dsh-medical` 是一个默认关闭、可独立安装的 DeepSeek Harness 医学插件。它提供两个入口：侧栏“医学分析”负责结构化病例录入；正式的第五个 Agent Preset“医学模式”负责把未整理文本直接交给 Fable。两个入口共用同一套医学提示、模型设置、隐私边界和标准 Session Log，不调用预处理模型，也不维护第二份病历数据库。

## 安装、启用与卸载

先把插件包安装到 Web Profile，再把随包维护的第五模式同步到 DSH 的用户 Agent Preset 目录：

```sh
dsh plugin --profile web add ./packages/medical
pnpm run medical:preset:install
```

同步命令把 `packages/medical/agent-presets/medical/` 写入 `${DSH_HOME:-$HOME/.dsh}/.agent-presets/medical/`。目标带有插件管理标记；脚本只更新自己管理的目录，发现同名但非本插件管理的 preset 时会拒绝覆盖。Preset roster 每次读取目录，正常情况下不需要重启即可看到排序第 5 的“医学模式”。

安装不会自动允许医学请求。在 Harness Web 的设置 → 通用中打开“医学病例分析”。关闭开关后，新请求被拒绝，已经进入 Agent Loop 的请求继续完成。

完全卸载时先移除受管 preset，再移除插件包，避免留下无法解析的第五模式：

```sh
pnpm run medical:preset:remove
dsh plugin --profile web remove @proton1917/dsh-medical
```

## 两个入口

| 入口 | 用途 | 会话与模型行为 |
|---|---|---|
| 侧栏“医学分析” | 结构化录入年龄、性别、主诉、现病史、既往史、用药、过敏史、查体、检查、危险因素和分析重点；可在首条病例中同时选择图片 | 每次创建新的 `standard` 会话，先写确定性标题，再临时装入医学作用域，只让下一条病例消息调用一次 Fable；结束后恢复原会话路由 |
| 第五项“医学模式” | 直接粘贴零散病史、检查单转写、用药记录、会诊意见和互相矛盾的备注；Fable 自行抽取事实、时间线、重复项和冲突 | 同一会话持续使用医学完整提示与 Fable，可连续多轮并保持稳定请求头以复用缓存；不暴露或执行工具 |

医学模式使用 DSH 原生输入器。文字可在新会话页直接发送；会话建立后可用原生图片粘贴或拖入继续提交图文。DSH 当前的无 Session 新会话页不能持有草稿图片；首条资料必须图文同轮时，使用结构化入口的图片选择器。此限制属于官方无会话输入生命周期，不是 Fable 的视觉能力限制。

## 结构化病例数据流

1. Client 通过官方 `session.create` 创建全新 `standard` 会话；优先沿用当前会话所属 Workspace，其次使用最近 Workspace，没有 Workspace 时创建未分组会话。
2. Client 在新会话执行 `/medical-analyze text|image`。命令 `recordInput: false`，病例内容不进入 command 参数或 command 记录；准入失败时不改标题，也不打开失败会话。
3. 命令只为该 Agent 的下一条标准 Prompt 安装医学完整提示、关闭运行时上下文、隐藏并拒绝全部工具，并准备精确 Fable 路由。病例 Prompt 前发生任何 Agent Preset 切换都会撤销这份临时作用域。
4. Client 在病例消息前写入 `医学病例 · <主诉摘要>` 确定性标题。标题写入失败则停止，不调用标题模型。
5. Client 通过标准 `SessionFace.prompt` 提交结构化文本和可选原图；附件服务保存图片字节，Session Log 保存标准引用。Prompt 被接受后才打开病例会话。
6. 第一个 `agent/request` 使用配置的医学路由，并删除继承的 `maxTokens`；第二个模型步骤被拒绝。Agent 回到 idle、准备超时或被销毁时，临时作用域全部撤销。
7. 纯文本病例恢复提交前路由；含图片病例保留 Fable 请求头，避免把已有图像历史切回文本模型。

## 医学模式数据流

1. Agent Preset roster 从 `${DSH_HOME:-$HOME/.dsh}/.agent-presets/medical/` 读取 `preset.yml` 和 `agent.cordis.yml`，因此它与标准、PTC、极简、创造模式处于同一个官方菜单。
2. 用户选择医学模式时，DSH 通过标准 `agent-preset/selected` 事件把选择写入会话日志；插件只对当前解析结果为 `medical` 的 Agent 写入 Fable 请求头，并通过官方 `session.selectModel` 同步客户端模型控件与图片能力门。
3. Preset 装入完整医学系统提示、抑制运行时编码上下文，并通过工具白名单和执行 guard 双层限制全部工具；不添加步骤或轮次门禁。
4. 同一会话的后续用户消息继续携带既有医学对话历史，并沿用相同 Fable 请求头，使提供方可以复用稳定前缀缓存。用户消息不做本地重写；提示要求 Fable 自行整理时间线、合并重复信息、并列矛盾描述，并把无法确定的字段列为待补充。
5. 新鲜医学会话的第一条用户文本触发确定性标题，立即覆盖并取消自动标题工作；不会增加标题模型调用。
6. 普通 Agent Preset 不经过医学路由。空白会话从医学模式切回其他模式时，插件恢复切换前的请求配置。

## 默认模型路由

| 设置 | 默认值 |
|---|---|
| `enabled` | `false` |
| `provider` | `cc-api` |
| `model` | `claude-fable-5` |
| `reasoningEffort` | `high` |
| `armTimeoutMs` | `30000` |

插件不设置 `maxTokens`、温度或重试次数。适配器和部署已有的上限继续生效。使用图片时，部署必须把该模型的输入能力声明为 `text` 与 `image`；当前 `cc-api / claude-fable-5` 已通过真实视觉请求验证。

## 医学输出规则

固定提示要求依次处理紧急风险、病例摘要与信息缺口、初步诊断、逐项诊断依据、鉴别诊断、诊疗计划、用药安全、待补问题和知识边界。病例未提供的事实必须标为“未提供/待补充”，不能补写症状、体征、检查、病史或用药。

首程病历模板要求诊断依据与诊断编号一一对应；鉴别诊断同时给出相同点、不同点和下一步区分证据；诊疗计划覆盖护理与监测、一般处理、检查、药物原则与药名、非药物治疗、复查和随访。

两个入口都不提供联网检索或其他工具。输出不得声称已查询最新指南、数据库或实时文献，不得编造 PMID、DOI、指南年份或出处。涉及可能变化的指南和药品信息时，必须提示使用当前权威指南和说明书复核。

## 隐私与临床边界

结构化面板持续显示非阻断的去标识化提醒；医学模式菜单说明也明确要求提交前去标识化。不要输入姓名、身份证号、电话、住址、住院号或其他直接身份标识。允许提交真实临床资料不等于模型服务商承诺符合医疗数据法规；使用者必须自行确认组织政策、患者授权、服务商数据条款和适用法律。

输出服务于医学教学、研究和临床决策辅助，不能替代执业医师对患者的直接评估。存在红旗征象时，模型必须先给出紧急处置优先级。

## 验证

```sh
pnpm --filter @proton1917/dsh-medical run typecheck
pnpm --filter @proton1917/dsh-medical run test
pnpm --filter @proton1917/dsh-medical run build
pnpm --filter @proton1917/dsh-medical pack --dry-run
```

真实验收覆盖：默认关闭、设置启用、结构化面板、第五模式菜单、全新会话、确定性标题、标准用户消息、精确且缓存稳定的 Fable 路由、医学模式连续多轮、无工具、关闭后拒绝新任务、已开始任务继续完成、普通模式不受影响、结构化首条图片和医学模式会话图片，以及无重复命令、DOM、字典或插槽注册。
