# 原型验证入口

作者工具：复制当前 `assets/shadcn-vue-authoring/package.json`、`pnpm-lock.yaml` 到独立目录，`pnpm install --frozen-lockfile --ignore-scripts`。浏览器工具：固定 Playwright 安装目录（内含 index.mjs），事先物化其对应 Chromium 和 WebKit。入口记录实际版本，不自动安装或降级。兼容 `YSS_VUE_TOOLCHAIN` 和 `YSS_PLAYWRIGHT_MODULE`；显式参数优先。

| 范围 | 检查 |
|---|---|
| contract | 精确依赖/锁、27 组原始组件、H1/H2 构建、场景/工作区、便携资源、比较工具、legacy 拒绝、验证入口反例 |
| browser | 用当前来源构建并复制到独立目录，真实交互、工作区、布局/焦点、缩放、离线与原模式回归 |
| all | 串行执行二者；任一失败不能得到通过 |

所选范围缺工具、浏览器、输入或执行结果时非零退出。`report.json` 记录 passed/failed/not-executed/not-applicable 数量、源码前后摘要、包摘要、工具版本、命令/退出码及原始日志与截图报告路径。未命中项须给出理由；缺环境不能记作不适用。输出目录必须位于仓库外且为空，保留失败运行，不覆盖重跑。来源漂移后固定输入重新运行。

运行证据经现有 `design_qa.report_ref`、场景/离线/视觉证据字段引用，不是第二套生命周期状态。首次截图仅为待审输入；维护者按当前 DESIGN/保持项观察后记录六轴结论，不与自身比较宣称视觉回归通过。自动化不能替代读屏、真实用户测试或用户视觉确认。
