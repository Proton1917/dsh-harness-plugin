# DSH Web Background

背景持续跟踪当前会话滚动元素；切换会话替换 DOM、折叠侧栏或调整窗口后，清晰图层保持与当前会话区域横向对齐。卸载时撤销观察器、图层和主题覆盖。

独立的 DeepSeek Harness Web 背景与玻璃主题插件。它以内联资源提供蓝天花束背景，并按实时对话区域调整清晰图层的位置和宽度。

安装 `v0.1.0` 预构建包：

```sh
dsh plugin --profile web add https://github.com/Proton1917/dsh-harness-plugin/releases/download/v0.1.0/proton1917-dsh-web-background-0.1.0.tgz
```

从仓库 checkout 安装：

```sh
dsh plugin --profile web add ./packages/web-background
```

本包是第三方社区主题，不表示 DeepSeek 官方赞助、合作或授权。图片许可见 [ASSET_NOTICE.md](ASSET_NOTICE.md)。
