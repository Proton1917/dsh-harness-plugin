# DSH Brand Mascot

独立的 DeepSeek Harness 侧栏品牌角色插件。Client 通过正式的 `sidebar.brand.mark` 和 `sidebar.brand.name` 插槽装入人物标识及 `deepseek HARNESS` 字标。展开侧栏显示完整角色卡，收起侧栏显示同一人物图的缩略标识，悬停时恢复官方展开按钮。

Host 以独立的 `brand-mascot:persona` section 追加紧凑的鲸鱼娘人设，不占用会被 Agent Preset 遮蔽的 `deployment:persona`。标准、PTC、极简和创造模式在保留自身工作规则的同时收到这段人设；声明完整系统提示词的医学模式继续只使用医学提示。

从仓库根目录安装：

```sh
dsh plugin --profile web add ./packages/brand-mascot
```
