# Data Quality 默认主题

根 `DESIGN.md` 是唯一视觉事实源。此参考解释采用依据，不定义第二份主题。

以下更新顺序用于模板源维护；项目实例按其现行合同维护设计基线，不依赖模板源的跨仓同步元数据。脚本的 YAML 解析器随技能携带；仓外复制后以 `--project-root <项目根>` 指定目标，缺少 DESIGN 或 Token 时说明缺口。`drift` 可离线执行，lint 和完整派生分别需要上游工具与文中指定的作者工具链。

采用 Data Quality `packages/src/store/theme.ts` 的全局浅色主题：主色 / info `#3371ff`，正文14px，默认 / small / large控件32 / 24 / 40px，圆角6 / 4 / 8px，Card内距20px。`isDarkMode=false`、`isCompactMode=false`。页面玻璃效果、广大发行主题与人保红色 JSP 主题均为局部选择。

Ant Design v6 提供设计语义与历史算法来源参考；Data Quality 真实运行时为 Vue3 + ant-design-vue4.2.6 + YSS UI。实现主题通过目标库公开 ConfigProvider API 适配，不能把 React API 或 v6版本号移植为 Vue 依赖结论。

`primary-control` / hover 是 YSS 为白色小字保留的可访问性变体，品牌 seed 保持 Data Quality 蓝；它们是已声明适配，不是 Data Quality 原值。生产默认使用根规范普通控件，显式 compact 才应用算法一次；新原型默认采用命名紧凑变体，窄屏和 comfortable 使用普通变体，不应用生产 compact 算法。暗色使用算法生成中性色，不能把浅色 text/surface 固定覆盖带入暗色。

更新顺序：修改根 DESIGN.md → 更新 design-system-sync.yaml 摘要 → 在独立作者目录提供固定 antd6.6.4 → `node "<技能目录>/scripts/design-md.mjs" export dtcg --project-root "<项目根>" --write --write-manifest --antd-toolchain "<作者目录>"` → lint / drift → 按受影响范围和现行前端合同更新相关基线、浏览器核对 HTML 和 Vue 实现。禁止手改 token 快照或生成投影。

采集依据：Data Quality commit `532509a59856fc02f3b9bcb28a062663ce887d71`；theme.ts SHA256 `8bdb5d13a0dabccc0771bac07d6e28e29d23dcc70fc72adfe04825b5a5ae16e1`。详细研究位于模板维护证据 `data-quality-theme-scaffold-2026-09-15/`。
