# YSS 需求到产品设计

开发插件 `yss-product-design`，唯一公开入口 `product-design`。

Plan → Spec / 功能架构 → 产品设计与验证 → Handoff v5 正式方案包。接收方为 `yss-backend-delivery`，接收后继续工程设计和后端实现；导入成功不授予实现权限。

初始化使用固定 `create-yss-harness-design` 原始包和显式开发覆盖层，绑定战略设计 profile。项目内容保存在独立治理目录；更新插件不自动升级项目。

## 命令

从插件实际目录执行 `node scripts/plugin.mjs`：

- `verify`、`doctor`：包完整性与依赖检查。
- `project-plan --target-dir <空目录> --project-name <名称> --business-domain <领域>`：预览初始化；`project-apply --plan <JSON>` 应用已授权计划。
- `project-check --target-dir <治理根>`：核验来源、核心文件、词汇合同与绑定。
- `project-bind-plan --target-dir <治理根>`、`project-bind-apply --plan <JSON>`：只绑定精确匹配的既有实例。
- `project-entry --target-dir <治理根> --mode new|reuse|resume --input <JSON>`：交给项目本地主控。复用传 `artifact_refs` 或 `checkpoint`，恢复必须有 `checkpoint`。

支持新原型与既有 UI 基线；纯无 UI 正式交付不在首版范围。终点复用战略交接 checkpoint 和实际整包验证，不另建状态机。模板代码、包或批准漂移会阻断接入；业务文档修改由生命周期重新判断新鲜度。

## 构建与接收

`node .template-source/plugins/yss-product-design/build.mjs --output .template-source/cache/product-design/yss-product-design`

后端通过 `project-import-design --target-dir <后端治理根> --bundle <交付目录或ZIP>` 导入，再以 `project-entry --mode reuse --input <包含 import_receipt_ref 的 JSON>` 继续。目录导入使用 Import Receipt v3；运输用 package.zip 沿用现有导入协议，保留原包摘要与批准，不伪造源交付记录。

包内技能资源不等于外部提供者在当前会话可用。机制 fixture 与真实设备借用示例的业务批准和验收分别记录；开发构建不代表正式发布就绪。
