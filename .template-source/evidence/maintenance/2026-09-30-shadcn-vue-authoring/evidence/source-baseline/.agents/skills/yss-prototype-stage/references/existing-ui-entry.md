## 既有 UI 的交接入口

现有工程需要跨仓交接且确认 UI、交互、状态和权限体验均无改动时，先读取 `.template-spec/process/existing-ui-baseline.md`，使用独立 `existing-ui-baseline` v1，不进入 H1/H2 原型构建。绑定固定源码、锁文件、实际构建、原始动作、PNG 截图和真实 API 交换证据；可离线审阅不等于可离线运行原型。

通过 `gate.product-design-approved` 的现有用户决定协议确认当前基线 manifest 原字节，Handoff v5 明确声明 `ui_baseline_kind: existing-ui-baseline`。截图、代码可运行或旧原型批准都不能替代该确认；本技能只能准备审阅资产，不代答或批准。发现任何 UI 改动，包括后端行为导致的体验变化，回到上述原型流程；新设计继续保留现有原型与验证要求。

消费者以 `scripts/preflight-delivery` 检查交付前提，再由 `scripts/lib/ui-baseline.mjs` 分派原型与既有基线。前端使用 Strategic Preflight v2 和 Delivery Acceptance v3 的通用 `baseline_case_ids` 承接；通过仅说明输入可核验，不授予写代码权限。
