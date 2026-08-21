# DSH Harness Plugins

这个开源仓库包含四个可独立安装、启用、关闭和升级的 DeepSeek Harness 插件。根目录是 pnpm workspace，不是 DSH 插件；每个 `packages/*` 子目录都是一个完整 npm 包，并通过自己的 Bundle patch 向 Profile 插入一个 Cordis 插件条目。

## 插件目录

| 目录 | npm 包 | Bundle 条目 | 作用范围 |
|---|---|---|---|
| `packages/live-stats` | `@proton1917/dsh-live-stats` | `live-stats` | Host 实时 token projection，以及 Web 端轮次、耗时、缓存命中、token 和 TPS 展示 |
| `packages/web-background` | `@proton1917/dsh-web-background` | `web-background` | 蓝天花束背景、对话区对齐和语义玻璃主题 token |
| `packages/brand-mascot` | `@proton1917/dsh-brand-mascot` | `brand-mascot` | 侧栏完整品牌角色卡、官方 `DeepSeek HARNESS` 字标叠层、收起态人物缩略标识，以及普通 Agent Preset 可见的鲸鱼娘人设 |
| `packages/medical` | `@proton1917/dsh-medical` | `medical` | 默认关闭的结构化病例面板，以及正式第五个 Agent Preset“医学模式”的 Fable 直接投递 |

四个插件不相互导入源码或运行时状态。删除或关闭其中一个插件不会移除其他插件的能力。

## 安装到 Web Profile

首次从旧的单包结构迁移时，先删除旧包：

```sh
dsh plugin --profile web remove @proton1917/dsh-harness-plugin
```

再分别安装四个子包，并同步医学 Agent Preset：

```sh
dsh plugin --profile web add ./packages/live-stats
dsh plugin --profile web add ./packages/web-background
dsh plugin --profile web add ./packages/brand-mascot
dsh plugin --profile web add ./packages/medical
pnpm run medical:preset:install
```

仓库根目录不声明 `dsh.bundle`，不能作为额外插件安装。安装后用以下命令验证四个独立配置层和条目：

```sh
dsh --profile web --dump-config
dsh web
```

任一插件可以单独移除。例如只关闭品牌角色：

```sh
dsh plugin --profile web remove @proton1917/dsh-brand-mascot
```

## 开发验证

从仓库根目录安装依赖并运行全部门禁：

```sh
pnpm install
pnpm run ci
pnpm run pack:check
git diff --check
```

`pnpm run ci` 依次运行四个包的类型检查、单元测试和完整构建。`pnpm run pack:check` 分别检查四个 npm 包的实际打包清单，防止遗漏 Client bundle、类型声明、图片或 tokenizer 文件。

用户可见改动还需要在真实 Harness Web 中验证。四个插件同时安装时，应当看到实时统计、背景、品牌角色和医学入口；逐一移除后，只能撤回对应插件拥有的 DOM、主题 token、projection、字典、命令和插槽注册。

## 医学病例分析

医学插件安装后默认关闭。在设置 → 通用中启用后，它提供两条路径：侧栏底部“医学分析”只做结构化病例录入；新会话页的 Agent Preset 菜单新增排序第 5 的“医学模式”，用来把未整理文字直接交给 Fable，不增加预处理模型调用。

结构化病例每次执行以下流程：

1. 通过官方 `session.create` 创建新的 DSH 会话；
2. 通过 `/medical-analyze` 准备下一条标准 `user/message`；病例正文不进入命令参数，准入失败不会改标题或打开失败会话；
3. 在发送病例前写入确定性标题，避免额外标题模型调用；
4. 该轮临时使用 `cc-api` / `claude-fable-5` / `high`，不暴露或执行工具；切换 Agent Preset 会立即撤销尚未开始的医学作用域；
5. 最多执行一个模型请求，Agent 回到 idle 后撤销全部医学作用域；
6. 纯文本病例结束后恢复会话原有模型路由。

医学模式使用官方 Agent Preset 发现、选择和日志机制。模式会话持续采用相同医学提示与 Fable 路由，但每条用户消息仍然最多一个模型步骤且没有工具。用户可直接粘贴零散病史、检查转写、用药和矛盾记录；会话建立后也可通过 DSH 原生图片粘贴或拖入提交图文。

关闭开关只拒绝新的医学分析，不会中断已经开始的模型请求。病例提交前必须去标识化；固定提示词禁止臆造病例事实、伪称实时检索或编造 PMID、DOI 和指南出处。详细契约见 `packages/medical/README.md`。

## 兼容性边界

DSH `rc.8` 通过 `sidebar.brand.mark` 和 `sidebar.brand.name` 提供正式品牌扩展点，品牌插件以优先级 `-1` 覆盖本地构建的默认标识。插件不保留旧版 DOM 选择器；上游修改品牌插槽时必须同步更新此插件。

## 许可证与公开分发

仓库源码采用 [BSD-3-Clause](LICENSE)。各 npm package 保留 `"private": true`，仅用于阻止意外发布到 npm registry，不限制 GitHub 上的源码使用和再分发。

`packages/web-background/src/assets/background.webp` 和 `packages/brand-mascot/src/assets/mascot.webp` 是仓库所有者授权随本仓库公开发布的图片衍生文件，并按 BSD-3-Clause 分发；该授权不授予任何第三方商标、角色或原始作品中超出仓库所有者控制范围的权利。详见 [ASSET_NOTICE.md](ASSET_NOTICE.md) 和各包的通知文件。

`packages/live-stats/assets/deepseek-v3/` 中 tokenizer 的来源、校验和与随附 MIT 许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
