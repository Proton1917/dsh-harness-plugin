# DSH Live Stats

独立的 DeepSeek Harness 实时统计插件。Host 端统计 system、developer、user、assistant 与独立 tool-role 消息，通过 DSH `0.2.1-rc.3` session projection 的 `stateSchema` 与 Client `wire` 注册从已提交 stream 重建的用量和计时起点；Web Client 叠加 Session Controller 的 `assistant/live-chunk` 临时帧，显示轮次、步骤、LLM/工具耗时、TTFT、累计 token、缓存命中率和 TPS。OpenRouter 调用完成后，Host 根据原始 `gen-…` ID 查询 Generation API，以 `native_tokens_completion × 1000 / generation_time` 计算该次速度，并将原始计数、毫秒时长、调用位置和服务商保存为 Session 插件记录。界面优先显示最近一次 OpenRouter 统计，详情标明所属轮次、步骤及服务商；本地单次流式采样速度以 `~` 标记估算值。

在 Profile 的 `live-stats` 条目中配置 Host 可读的密钥文件：

```yaml
- id: live-stats
  config:
    openRouter:
      apiKeyFile: /absolute/path/to/openrouter-api-key
```

密钥文件由 Host 在每次查询时读取。`timeoutMs` 控制每次查询超时，默认 10000 毫秒；`maxAttempts` 默认 3 次，允许 1–5 次；`retryDelayMs` 默认 1000 毫秒。404 或统计字段待补充时按该策略重试，其他错误写入 Host 日志。Session 关闭和插件卸载会中止查询，卸载等待查询任务退出。生成调用使用保留 OpenRouter 原始 generation ID 的接口，例如 Chat Completions；Anthropic Messages 的 `msg_…` ID 由该接口独立编号。配置记录保存文件路径，密钥值保持在 Host 内存。

输入框下方使用两个紧凑统计按钮：速度按钮显示轮次、步骤和实时 TPS，用量按钮显示实时累计 token 和已报告缓存命中率。轮次和步骤在进入步骤时计入；模型和工具用时包含正在进行的任务，取消任务保留实际耗时。首 token 平均值在等待输出时包含带 `~` 的当前等待时间，首个非空输出到达后按其真实时间计算。输入与缓存数量随请求和提供方用量报告更新，输出及累计用量随流式增量更新；收到报告后立即校正估算，缓存命中百分比保留两位小数。按钮与展开详情共享数据，点击外部或按 Escape 可关闭详情，面板保持在窗口可见区域内。右侧上下文占用按钮由 Harness 提供。

插件通过 `conversation.composer.dock` 的 `activity` 与 `usage` 条目管理这两个统计按钮；移除插件后恢复 Harness 自带统计项。

Profile 中的 `refreshIntervalMs` 控制正在进行的用时刷新间隔，默认 250 毫秒，允许 16–1000 毫秒。计时结束或组件卸载时释放刷新定时器。统计从完整会话日志重建，历史分页和压缩不改变累计数量。

安装 `v0.1.0` 预构建包：

```sh
dsh plugin --profile web add https://github.com/Proton1917/dsh-harness-plugin/releases/download/v0.1.0/proton1917-dsh-live-stats-0.1.0.tgz
```

从仓库 checkout 安装：

```sh
dsh plugin --profile web add ./packages/live-stats
```

当前源码面向 DSH `0.2.1-rc.3`。`v0.1.0` 发布 tarball 仍面向 DSH `0.1.1-rc.2`，安装时应使用对应的 DSH 版本。

Client 构建包含 UI primitives 的数学渲染依赖，KaTeX 使用 `0.18.2` 或更新的兼容版本；工作区 override 使 `micromark-extension-math` 使用同一修复版本。
