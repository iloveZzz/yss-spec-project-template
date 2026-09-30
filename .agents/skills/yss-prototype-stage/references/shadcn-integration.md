# React shadcn 原型历史路线

React 作者依赖、组件源码和构建入口已退役。新高保真使用 [shadcn-vue](shadcn-vue-integration.md)，轻量原型可用原生 HTML。生产 Vue/YSS 合同不变。

已封存 `react-shadcn-prebuilt` 包和旧 React AntD 证据保留只读：仅通过 `prototype-contract.mjs validate-project --allow-legacy`（证据使用 `validate-evidence --allow-legacy`）核验原有内容与摘要。只读通过不代表当前门禁通过，不能使用 `seal-project` 重封存 React 包。继续修改时，从业务交互与场景输入构建新 Vue 包，重新进行当前 QA 和用户确认；不改旧批准资产。
