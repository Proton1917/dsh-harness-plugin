# DSH Live Stats

独立的 DeepSeek Harness 实时统计插件。Host 端统计 system、developer、user、assistant 与独立 tool-role 消息，通过 DSH `0.2.0-rc.1` session projection 的 `stateSchema` 与 Client `wire` 注册从已提交 stream 重建的用量；Web Client 叠加 Session Controller 的 `assistant/live-chunk` 临时帧，显示轮次、步骤、LLM/工具耗时、TTFT、累计 token 和 TPS。缓存命中率由内置用量面板展示。当前步骤形成连续输出采样后，TPS 会随真实临时帧实时变化，结算后使用提供方用量校正累计值；新步骤尚无连续采样或提供方仅返回最终内容时，显示 DSH 已完成步骤的解码平均 TPS。

输入框下方使用两个紧凑统计按钮：速度按钮显示轮次、步骤和实时 TPS，用量按钮显示实时累计 token 和已结算缓存命中率。点击按钮可查看详情；按钮与展开的详情共享同一份实时数据，生成期间持续更新，估算用量带有 `~` 标记，结束后显示提供方结算值。详情支持点击外部或按 Escape 关闭，并保持在窗口可见区域内。右侧上下文占用按钮由 Harness 提供。

安装 `v0.1.0` 预构建包：

```sh
dsh plugin --profile web add https://github.com/Proton1917/dsh-harness-plugin/releases/download/v0.1.0/proton1917-dsh-live-stats-0.1.0.tgz
```

从仓库 checkout 安装：

```sh
dsh plugin --profile web add ./packages/live-stats
```

当前源码面向 DSH `0.2.0-rc.1`。`v0.1.0` 发布 tarball 仍面向 DSH `0.1.1-rc.2`，两套产物不能混装。
