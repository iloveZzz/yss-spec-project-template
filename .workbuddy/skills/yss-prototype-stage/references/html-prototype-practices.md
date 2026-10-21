# HTML 原型实践与来源

这些方法补充既有状态矩阵、六轴 QA 和 Visual Baseline，不引入新的生命周期或整套第三方技能。2026-09-14 核查；外部 main 是观察来源，不是自动更新授权。不复制第三方实现代码。

| 来源 | 采纳 | 边界 |
|---|---|---|
| [Google design.md](https://github.com/google-labs-code/design.md/blob/main/README.md) | 规范 Token、lint、diff 和派生导出 | alpha；沿用项目锁定工具，导出成功不替代 lint，规范不承载业务状态 |
| [GOV.UK 场景数据](https://prototype-kit.service.gov.uk/pass-data/) | 场景初值、输入保留、切换和清空 | 借鉴行为，服务端 session 不进入离线包 |
| [WAI APG](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/) 与 [Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | 原生语义、键盘与焦点承诺 | ARIA 本身不实现交互；按实际采用模式复验 |
| [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots) | 同环境、同场景的截图比较 | 首版截图不是已通过的回归；环境变化可能产生渲染差异 |
| [MDN modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) 与 [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) | 普通脚本、随包数据、内存场景与 file:// 复验 | 不依赖模块本地加载或 file: 持久化保证 |
| [Frontend Design](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md) | 内容、用户任务、数据密度驱动的设计 | 不采用其营销 hero 或改变 YSS 字体/品牌的默认倾向 |

Owl-Listener/designer-skills 四项方法已融合，固定 revision 与原型策略见 [档位合同](prototype-profile-routing.md)。页面行为根据实际 Spec 编写；场景与重置示例为 YSS 自行实现，不代表生产能力。
