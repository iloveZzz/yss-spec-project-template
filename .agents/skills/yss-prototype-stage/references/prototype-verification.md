# 原型验证入口

维护验证统一由 `scripts/verify-prototype-design` 执行；分发实例可直接调用本 Skill 的同名 `.mjs`。`verify-yss-prototype-contract-scenarios` 和历史 `antd-reference.test.mjs` 转调相同 contract 实现。

```sh
node .agents/skills/yss-prototype-stage/scripts/verify-prototype-design.mjs \
  --scope all --toolchain "$AUTHOR_TOOLS" \
  --browser-tools "$PLAYWRIGHT_DIR" --output "$EXTERNAL_EMPTY_OUTPUT"
```

作者工具：复制当前 `assets/shadcn-vue-authoring/package.json`、`pnpm-lock.yaml` 到独立目录，`pnpm install --frozen-lockfile --ignore-scripts`。浏览器工具：固定 Playwright 安装目录（内含 index.mjs），事先物化其对应 Chromium 和 WebKit。入口记录实际版本，不自动安装或降级。兼容 `YSS_VUE_TOOLCHAIN` 和 `YSS_PLAYWRIGHT_MODULE`；显式参数优先。

主 CLI 精简实例先用 `assets ensure stage.product-design --apply` 安装阶段，再用 `skills ensure prototype-review yss-design-system --apply` 补齐本专项所核验的三个 Skill；Design/Frontend 保留各自默认编排。维护夹具引用可分发的 `scripts/lib/testing/user-decision-fixture.mjs`；其中模拟批准仅用于测试，不是产品或人的真实决定。

| 范围 | 检查 |
|---|---|
| contract | 精确依赖/锁、27 组原始组件、H1/H2 构建、场景/工作区、便携资源、比较工具、legacy 拒绝、验证入口反例 |
| browser | 用当前来源构建并复制到独立目录，真实交互、工作区、布局/焦点、缩放、离线与原模式回归 |
| all | 串行执行二者；任一失败不能得到通过 |

所选范围缺工具、浏览器、输入或执行结果时非零退出。`report.json` 记录 passed/failed/not-executed/not-applicable 数量、源码前后摘要、包摘要、工具版本、命令/退出码及原始日志与截图报告路径。未命中项须给出理由；缺环境不能记作不适用。输出目录必须位于仓库外且为空，保留失败运行，不覆盖重跑。来源漂移后固定输入重新运行。

W01–W14 / T01–T07 的可操作部分由 `tests/workspace-browser.mjs`、原模式、组件、缩放和比较浏览器检查组合覆盖。320 CSS px 重排与浏览器真实 200% 缩放分别记录；缩放用隔离测试 profile 的 `chrome.tabs.setZoom/getZoom`，不以 CSS zoom 或 DPR 模拟代替。WebKit 对本地文件使用 HTTP(S) 拦截阻断网络，报告该机制与 Chromium offline 的差别。

运行证据经现有 `design_qa.report_ref`、场景/离线/视觉证据字段引用，不是第二套生命周期状态。首次截图仅为待审输入；维护者按当前 DESIGN/保持项观察后记录六轴结论，不与自身比较宣称视觉回归通过。自动化不能替代读屏、真实用户测试或用户视觉确认。
