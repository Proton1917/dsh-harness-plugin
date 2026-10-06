# DSH Live Stats

独立的 DeepSeek Harness 实时统计插件。Host 端统计 system、developer、user、assistant 与独立 tool-role 消息，通过 DSH `0.2.0-rc.2` session projection 的 `stateSchema` 与 Client `wire` 注册从已提交 stream 重建的用量和计时起点；Web Client 叠加 Session Controller 的 `assistant/live-chunk` 临时帧，显示轮次、步骤、LLM/工具耗时、TTFT、累计 token、缓存命中率和 TPS。当前步骤形成连续输出采样后，TPS 随真实临时帧实时变化，结算后使用提供方用量校正累计值；新步骤尚无连续采样或提供方仅返回最终内容时，显示 DSH 已完成步骤的解码平均 TPS。

输入框下方使用两个紧凑统计按钮：速度按钮显示轮次、步骤和实时 TPS，用量按钮显示实时累计 token 和已报告缓存命中率。轮次和步骤在进入步骤时计入；模型和工具用时包含正在进行的任务，取消任务保留实际耗时。首 token 平均值在等待输出时包含带 `~` 的当前等待时间，首个非空输出到达后按其真实时间计算。输入与缓存数量随请求和提供方用量报告更新，输出及累计用量随流式增量更新；收到报告后立即校正估算，缓存命中百分比保留两位小数。按钮与展开详情共享数据，点击外部或按 Escape 可关闭详情，面板保持在窗口可见区域内。右侧上下文占用按钮由 Harness 提供。

Profile 中的 `refreshIntervalMs` 控制正在进行的用时刷新间隔，默认 250 毫秒，允许 16–1000 毫秒。计时结束或组件卸载时释放刷新定时器。统计从完整会话日志重建，历史分页和压缩不改变累计数量。

安装 `v0.1.0` 预构建包：

```sh
dsh plugin --profile web add https://github.com/Proton1917/dsh-harness-plugin/releases/download/v0.1.0/proton1917-dsh-live-stats-0.1.0.tgz
```

从仓库 checkout 安装：

```sh
dsh plugin --profile web add ./packages/live-stats
```

当前源码面向 DSH `0.2.0-rc.2`。`v0.1.0` 发布 tarball 仍面向 DSH `0.1.1-rc.2`，安装时应使用对应的 DSH 版本。

Client 构建包含 UI primitives 的数学渲染依赖，KaTeX 使用 `0.18.2` 或更新的兼容版本；工作区 override 使 `micromark-extension-math` 使用同一修复版本。
