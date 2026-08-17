# DSH Harness Plugin

一个完整的 DeepSeek Harness 插件：同一个 Host 插件注册实时 token projection，同一个 Client 入口提供实时统计、蓝天花束背景和 DeepSeek 品牌角色卡。Harness profile 只挂载一个 package 和一个 bundle 条目。

## 功能

- **实时统计**：以 DeepSeek tokenizer 估算进行中的输入、输出与总 token；最终 provider usage 替换同一步估算；独立 TPS 行只使用真实流式输出增量及到达时间。
- **背景主题**：904 × 1200、约 170 KB 的蓝天花束 WebP 内联进入 Client bundle；模糊满幅环境层、完整清晰人像层和明暗遮罩层共同构成背景。清晰层以对话滚动区的实时矩形为坐标系，侧栏、详情栏和窗口尺寸变化时自动重新居中。主题 token 将画布、侧栏、输入框、菜单和气泡变成可读的玻璃层。
- **品牌角色**：原始 1024 × 1536 高清眼镜角色竖图以高质量 WebP 铺满展开侧栏的 216 × 324 品牌卡，角色、鱼尾、桌子和环境均保留，官方 `DeepSeek HARNESS` 完整字标叠在图片上层；折叠侧栏仍恢复紧凑控制栏。品牌按钮的“新建会话”行为和无障碍标签不变。

图片以内联 data URL 打包，不需要额外静态路由。明暗模式、高对比度和减少动态效果偏好均有独立样式。所有 DOM、observer、主题 token 和字典注册都由 Cordis effect disposer 撤回，HMR 不会叠加副本。

## 安装到 Harness profile

```sh
dsh plugin --profile web add link:/Users/gordongauerk/Projects/dsh-harness-plugin
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
