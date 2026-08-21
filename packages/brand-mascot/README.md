# DSH Brand Mascot

独立的 DeepSeek Harness 侧栏品牌角色插件。Client 通过正式的 `sidebar.brand.mark` 和 `sidebar.brand.name` 插槽装入人物标识及 `deepseek HARNESS` 字标。展开侧栏显示完整角色卡，收起侧栏显示同一人物图的缩略标识，悬停时恢复官方展开按钮。

Host 以独立的 `brand-mascot:persona` section 为标准、PTC 和创造模式追加紧凑的鲸鱼娘人设。极简模式的 preset 使用完整提示词，会屏蔽普通追加段；插件因此在该 Agent 的精确作用域用同名 `deployment:persona` 覆盖它，保留极简模式原句并追加鲸鱼娘标签，切换 preset 时立即撤销。医学模式不安装这份覆盖，继续只使用医学完整提示。

从仓库根目录安装：

```sh
dsh plugin --profile web add ./packages/brand-mascot
```
