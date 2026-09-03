# DSH Live Stats

独立的 DeepSeek Harness 实时统计插件。Host 端通过 DSH `0.1.2-rc.1` session projection 的 `stateSchema` 与 Client `wire` 注册可回放的实时 token 流；Web Client 通过拆分后的 Session Controller 读取 Projection，显示轮次、步骤、LLM/工具耗时、TTFT、缓存命中率、累计 token 和 TPS。当前步骤形成连续输出采样后，TPS 会随 wire 帧实时变化；新步骤尚无连续采样或提供方仅返回最终内容时，显示 DSH 已完成步骤的解码平均 TPS。

安装 `v0.1.0` 预构建包：

```sh
dsh plugin --profile web add https://github.com/Proton1917/dsh-harness-plugin/releases/download/v0.1.0/proton1917-dsh-live-stats-0.1.0.tgz
```

从仓库 checkout 安装：

```sh
dsh plugin --profile web add ./packages/live-stats
```

当前源码面向 DSH `0.1.2-rc.1`。`v0.1.0` 发布 tarball 仍面向 DSH `0.1.1-rc.2`，两套产物不能混装。
