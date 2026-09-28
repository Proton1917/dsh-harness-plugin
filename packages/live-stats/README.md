# DSH Live Stats

独立的 DeepSeek Harness 实时统计插件。Host 端统计 system、developer、user、assistant 与独立 tool-role 消息，通过 DSH `0.2.0-rc.1` session projection 的 `stateSchema` 与 Client `wire` 注册从已提交 stream 重建的用量；Web Client 叠加 Session Controller 的 `assistant/live-chunk` 临时帧，显示轮次、步骤、LLM/工具耗时、TTFT、累计 token 和 TPS。缓存命中率由内置用量面板展示。当前步骤形成连续输出采样后，TPS 会随真实临时帧实时变化，结算后使用提供方用量校正累计值；新步骤尚无连续采样或提供方仅返回最终内容时，显示 DSH 已完成步骤的解码平均 TPS。

用量统计和 TPS 在输入框下方的同一个插槽项目内上下居中排列，窄窗口中的用量文字可换行；右侧上下文占用按钮由 Harness 保持原有位置。

安装 `v0.1.0` 预构建包：

```sh
dsh plugin --profile web add https://github.com/Proton1917/dsh-harness-plugin/releases/download/v0.1.0/proton1917-dsh-live-stats-0.1.0.tgz
```

从仓库 checkout 安装：

```sh
dsh plugin --profile web add ./packages/live-stats
```

当前源码面向 DSH `0.2.0-rc.1`。`v0.1.0` 发布 tarball 仍面向 DSH `0.1.1-rc.2`，两套产物不能混装。
