# DSH 社区插件

[English](README.md) | 中文

[![CI](https://github.com/Proton1917/dsh-harness-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/Proton1917/dsh-harness-plugin/actions/workflows/ci.yml)

这个公开仓库包含四个可独立安装的 DeepSeek Harness 插件。每个包拥有一个 `dsh.bundle` 配置层，可单独安装、移除和升级，不修改 Harness 源码。本项目由社区维护，不属于 DeepSeek 官方产品，也不表示官方背书。

## 插件

| 包 | 功能 |
|---|---|
| `@proton1917/dsh-live-stats` | 实时显示输入、输出、总 token、缓存、耗时和流式吞吐率 |
| `@proton1917/dsh-web-background` | 提供与对话区域对齐的背景和语义玻璃主题 |
| `@proton1917/dsh-brand-mascot` | 提供可选的侧栏角色、品牌样式和 Agent 人设 |
| `@proton1917/dsh-medical` | 提供默认关闭的医学病例面板和不使用工具的医学模式 |

四个包不相互导入源码或共享可变运行状态。移除一个包时，只撤回它拥有的 Cordis 注册、DOM、样式、Projection、命令和插槽。

## 安装正式发布包

`v0.1.0` 面向 registry 可安装的 DSH `0.1.1-rc.2`。可将一个或多个预构建 tarball 直接安装到 Web Profile：

```sh
dsh plugin --profile web add https://github.com/Proton1917/dsh-harness-plugin/releases/download/v0.1.0/proton1917-dsh-live-stats-0.1.0.tgz
dsh plugin --profile web add https://github.com/Proton1917/dsh-harness-plugin/releases/download/v0.1.0/proton1917-dsh-web-background-0.1.0.tgz
dsh plugin --profile web add https://github.com/Proton1917/dsh-harness-plugin/releases/download/v0.1.0/proton1917-dsh-brand-mascot-0.1.0.tgz
dsh plugin --profile web add https://github.com/Proton1917/dsh-harness-plugin/releases/download/v0.1.0/proton1917-dsh-medical-0.1.0.tgz
```

Profile 的 Bundle 成员变化后需要重启 `dsh web`。以下命令可以在不启动服务的情况下检查组合结果：

```sh
dsh --profile web --dump-config
```

### 启用医学 Agent Preset

用户 Agent Preset 不属于 Profile 依赖，因此医学包附带独立的 Preset 安装命令。安装医学包后运行：

```sh
pnpm --dir "${DSH_HOME:-$HOME/.dsh}/profiles/web" exec dsh-medical-preset install
```

打开设置 → 通用，填写 DSH 模型选择器中存在的 Provider ID、Model ID 和推理强度，再启用医学病例分析。当前 `main` 源码默认使用已验证的 AI Code 路由 `cc-api / claude-fable-5-1 / high`；不可变的 `v0.1.0` 资产保留发布时的默认值。插件也接受其他已配置的 DSH 路由，Fable 不是运行前提。

移除医学包前，先删除受管 Preset：

```sh
pnpm --dir "${DSH_HOME:-$HOME/.dsh}/profiles/web" exec dsh-medical-preset remove
dsh plugin --profile web remove @proton1917/dsh-medical
```

安装程序只更新或删除带有自身管理标记的目录。遇到非本插件管理的同名 `medical` Preset 时，它会拒绝覆盖或删除。

## 从源码安装

克隆仓库后，安装所需的包目录：

```sh
git clone https://github.com/Proton1917/dsh-harness-plugin.git
cd dsh-harness-plugin
pnpm install
pnpm run build
dsh plugin --profile web add ./packages/live-stats
dsh plugin --profile web add ./packages/web-background
dsh plugin --profile web add ./packages/brand-mascot
dsh plugin --profile web add ./packages/medical
pnpm run medical:preset:install
```

workspace 根目录不是 DSH Bundle，不能作为第五个包安装。

## 医学数据和输出边界

医学分析安装后保持关闭。在当前 `main` 源码中，每个结构化病例都会创建新的医学模式 Session，写入确定性标题并使用标准 Session Log。完整医学提示、已配置路由和对话历史会在后续追问中保持稳定以复用缓存，同时继续向模型隐藏全部工具。

病例提交前必须去标识化。请勿填写姓名、身份证号、电话、住址、住院号或其他直接身份标识。使用者需要确认组织政策、患者授权、模型服务商数据条款和适用法律。

输出用于医学教学、研究和经临床人员复核的决策辅助。紧急风险需要线下临床评估。模型必须标注缺失信息，不得补写病例事实，也不得声称执行了未发生的实时指南或文献检索。

## 兼容性

不可变的 `v0.1.0` 发布资产仍面向 DSH `0.1.1-rc.2` 构建并完成验证。当前 `main` 源码面向 DSH `0.1.2-rc.1`：开发依赖固定使用 npm `next` 包，Client 实现沿用 `0.1.2` 拆分后的 Session Controller、Workspace Controller、Settings 和 renderer API。rc.2 请继续使用正式发布 tarball；新的发布声明兼容前，当前源码只与 rc.1 搭配安装。

## 开发

```sh
pnpm install
pnpm run ci
pnpm run pack:check
git diff --check
```

`pnpm run ci` 运行各包的类型检查、单元测试和构建。`pnpm run pack:check` 检查每个 tarball 的实际文件。涉及界面的改动还需要在真实 Harness Web 中确认。

## 品牌与许可证

源码采用 BSD-3-Clause。Tokenizer 来源见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)，图片许可和限制见 [ASSET_NOTICE.md](ASSET_NOTICE.md) 及各包通知文件。

“DeepSeek Harness”仅用于说明与上游项目的兼容关系。项目名称和官方品牌素材仍受上游[品牌使用规范](https://github.com/deepseek-ai/deepseek-harness/blob/master/BRAND_GUIDELINES.zh.md)约束。本仓库不表示官方赞助、合作或授权。
