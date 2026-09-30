# 工程覆盖矩阵

工程结果与 Agent 效果分别记录。可运行页面位于 patterns/index.html、low-fidelity/index.html；正式原型交付仍使用原有流程。

| 检查 | 状态 | 本轮证据及边界 |
|---|---|---|
| JSON 场景、数据摘要、来源绑定、未知/缺失 ID | 通过 | unit-final.log；comparison-browser.json；不得静默回退 |
| 初始化成功/异常/错误场景/迟到消息/丢失资源/超时 | 通过 | comparison-browser.json；成功信号仅表示声明初始化 |
| 切换、重复重置、深链接、数据隔离 | 通过 | comparison-browser.json、patterns-browser.json（104 项记录） |
| 原生/shadcn 冲突取消、完整重载、再次保存 | 通过 | workbench-browser.json、workbench-webkit.json；旧三组正反例亦完成取消/确认/再次操作 |
| 配置、多文件、本地图片、依赖、边界、符号链接、摘要漂移、拒绝覆盖、失败清理 | 通过 | unit-final.log；负向探针有预期报错，不属于正向 console 错误 |
| 独立目录 file:// 离线 | 通过，有浏览器例外 | Chromium offline=true；WebKit 的 offline 标志拒绝本地 file 导航，改为阻断全部 HTTP(S) 并断言零远程请求；不是物理网卡断网证明 |
| Chromium/WebKit 双视口与键盘 | 通过 | 五模式、低保真三候选；Select/弹窗焦点、错误定位、可操作恢复；具体自动步骤见测试源码 |
| 200% 缩放 | 通过 | browser-zoom.json：隔离扩展调用 chrome.tabs.setZoom/getZoom，五模式实际流程；不是 CSS zoom 或仅 DPR 模拟 |
| 减少动效 | 通过 | 真实计算样式 animationName/transitionDuration，操作仍可完成 |
| Token/文本对比度 | 通过，按列明元素范围 | 控件计算高度/颜色与当前 Token 相等；五模式各声明场景检查可见 h1/h2/p/label/button/td/th/tab，普通文本 4.5:1、大文本 3:1，跳过禁用、隐藏、inert；不宣称完整 WCAG 合规认证 |
| H1/H2、Evidence v4、Visual Baseline v1、历史 AntD | 通过 | contract scenarios、旧资产显式只读验证；禁止新 AntD 输出 |
| 比较 v1/v2 | 通过 | 三 CLI 共 12 项：v2、v1 opt-in、默认拒绝 v1、拒绝重新封存 v1 |
| 三 CLI 新建/配置构建/迁移/自定义保留 | 通过 | cli-verification.json；均为 working-tree 快照，不是固定提交发布证据 |
| 局部修改保持项实际 A/B | 未执行 | 校准失败后正式任务未启动；没有伪造前后视觉验证 |
| 用户视觉确认 | 未获得 | 无完整可比 A/B；视觉收益未确认 |

对比度标准来源：[W3C WCAG 2.2 Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)。免除项仅用于禁用等适用对象，不把未执行检查写成通过。
