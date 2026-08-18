# DSH Harness Plugin

一个完整的 DeepSeek Harness 插件：同一个 Host 插件注册实时 token projection，同一个 Client 入口提供实时统计、蓝天花束背景和 DeepSeek 品牌角色卡。Harness profile 只挂载一个 package 和一个 bundle 条目。

## 功能

- **实时统计**：以 DeepSeek tokenizer 估算进行中的输入、输出与总 token；最终 provider usage 替换同一步估算；独立 TPS 行只使用真实流式输出增量及到达时间。
- **背景主题**：904 × 1200、约 170 KB 的蓝天花束 WebP 内联进入 Client bundle；模糊满幅环境层、完整清晰人像层和明暗遮罩层共同构成背景。清晰层以对话滚动区的实时矩形为坐标系，侧栏、详情栏和窗口尺寸变化时自动重新居中。主题 token 将画布、侧栏、输入框、菜单和气泡变成可读的玻璃层。
- **品牌角色**：官方 DeepSeek 鲸鱼和字标保持不变，原 `HARNESS` 小牌替换为最大 84 × 84 的大图标；展开侧栏的品牌行随之增高，折叠侧栏仍恢复紧凑控制栏。图标底部继续显示 `HARNESS`，品牌按钮的“新建会话”行为和无障碍标签不变。

图片以内联 data URL 打包，不需要额外静态路由。明暗模式、高对比度和减少动态效果偏好均有独立样式。所有 DOM、observer、主题 token 和字典注册都由 Cordis effect disposer 撤回，HMR 不会叠加副本。

## 安装到 Harness profile

```sh
dsh plugin --profile web add .
```

`dsh.bundle.patch` 只插入一个 `harness-plugin` 条目。当前 Client 功能在 Web profile 呈现，Host projection 与整个 Harness session 日志协同。正常运行：

```sh
dsh web
```

## 开发验证

```sh
pnpm install
pnpm run ci
pnpm pack --dry-run
```

已安装的 link bundle 始终指向本目录。修改后运行 `pnpm run build`；已有插件条目可由 DSH Client HMR 重载，package 首次加入或名称变化需要重启一次服务。

## 兼容性边界

官方侧栏当前没有品牌子插槽，因此品牌模块以 `BrandWordmark` 的原生 SVG `viewBox="0 0 182 24"` 作为挂载点。Harness 更新不会覆盖本仓库；如果上游彻底替换这枚字标，角色卡会安全地不显示，需要同步更新识别特征。

## 许可证与公开分发

仓库源码采用 [BSD-3-Clause](LICENSE)。`package.json` 保留 `"private": true`，仅用于阻止意外发布到 npm registry，不限制 GitHub 上的源码使用和再分发。

`src/assets/background.webp` 和 `src/assets/mascot.webp` 是仓库所有者授权随本仓库公开发布的图片衍生文件，并按 BSD-3-Clause 分发；该授权不授予任何第三方商标、角色或原始作品中超出仓库所有者控制范围的权利。详见 [ASSET_NOTICE.md](ASSET_NOTICE.md)。

`assets/deepseek-v3/` 中 tokenizer 的来源、校验和与随附 MIT 许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
