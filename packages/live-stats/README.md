# DSH Live Stats

独立的 DeepSeek Harness 实时统计插件。Host 端注册可回放的实时 token projection；Web Client 显示轮次、步骤、LLM/工具耗时、TTFT、缓存命中率、累计 token 和 TPS。当前步骤形成连续输出采样后优先显示流式 TPS；新步骤尚无连续采样或提供方仅返回最终内容时，显示 DSH 已完成步骤的解码平均 TPS。

从仓库根目录安装：

```sh
dsh plugin --profile web add ./packages/live-stats
```
