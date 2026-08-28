# DSH Harness Plugins

这个开源仓库包含三个可独立安装、启用、关闭和升级的 DeepSeek Harness 插件。根目录是 pnpm workspace，不是 DSH 插件；每个 `packages/*` 子目录都是一个完整 npm 包，并通过自己的 Bundle patch 向 Profile 插入一个 Cordis 插件条目。

## 插件目录

| 目录 | npm 包 | Bundle 条目 | 作用范围 |
|---|---|---|---|
| `packages/live-stats` | `@proton1917/dsh-live-stats` | `live-stats` | Host 实时 token projection，以及 Web 端轮次、耗时、缓存命中、token 和 TPS 展示 |
| `packages/web-background` | `@proton1917/dsh-web-background` | `web-background` | 蓝天花束背景、对话区对齐和语义玻璃主题 token |
| `packages/brand-mascot` | `@proton1917/dsh-brand-mascot` | `brand-mascot` | 侧栏完整品牌角色卡、官方 `DeepSeek HARNESS` 字标叠层和收起态人物缩略标识 |

三个插件不相互导入源码或运行时状态。删除或关闭其中一个插件不会移除另外两个插件的能力。

## 安装到 Web Profile

首次从旧的单包结构迁移时，先删除旧包：

```sh
dsh plugin --profile web remove @proton1917/dsh-harness-plugin
```

再分别安装三个子包：

```sh
dsh plugin --profile web add ./packages/live-stats
dsh plugin --profile web add ./packages/web-background
dsh plugin --profile web add ./packages/brand-mascot
```

根目录不声明 `dsh.bundle`，不能作为第四个插件安装。安装后用以下命令验证三个独立配置层和条目：

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

`pnpm run ci` 依次运行三个包的类型检查、单元测试和完整构建。`pnpm run pack:check` 分别检查三个 npm 包的实际打包清单，防止遗漏 Client bundle、类型声明、图片或 tokenizer 文件。

用户可见改动还需要在真实 Harness Web 中验证。三个插件同时启用时，应当看到实时统计、背景和品牌角色；逐一移除后，只能撤回对应插件拥有的 DOM、主题 token、projection、字典和插槽注册。

## 兼容性边界

插件支持 DSH `0.1.0-rc.8`，并通过正式的 `sidebar.brand.mark` 和 `sidebar.brand.name` 插槽装入人物标识与 `deepseek HARNESS` 字标。插件不保留旧版 DOM 选择器；上游修改品牌插槽时需要同步更新插件。

## 许可证与公开分发

仓库源码采用 [BSD-3-Clause](LICENSE)。`package.json` 保留 `"private": true`，仅用于阻止意外发布到 npm registry，不限制 GitHub 上的源码使用和再分发。

`packages/web-background/src/assets/background.webp` 和 `packages/brand-mascot/src/assets/mascot.webp` 是仓库所有者授权随本仓库公开发布的图片衍生文件，并按 BSD-3-Clause 分发；该授权不授予任何第三方商标、角色或原始作品中超出仓库所有者控制范围的权利。详见 [ASSET_NOTICE.md](ASSET_NOTICE.md) 和各包的通知文件。

`packages/live-stats/assets/deepseek-v3/` 中 tokenizer 的来源、校验和与随附 MIT 许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
