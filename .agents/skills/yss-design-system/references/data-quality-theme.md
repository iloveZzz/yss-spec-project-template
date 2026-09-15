# Data Quality 默认主题

根 `DESIGN.md` 是唯一视觉事实源。此参考解释采用依据，不定义第二份主题。

采用 Data Quality `packages/src/store/theme.ts` 的全局浅色主题：主色 / info `#3371ff`，正文14px，默认 / small / large控件32 / 24 / 40px，圆角6 / 4 / 8px，Card内距20px。`isDarkMode=false`、`isCompactMode=false`。页面玻璃效果、广大发行主题与人保红色 JSP 主题均为局部选择。

Ant Design v6 提供设计语义与 HTML 原型算法参考；Data Quality 真实运行时为 Vue3 + ant-design-vue4.2.6 + YSS UI。实现主题通过目标库公开 ConfigProvider API 适配，不能把 React API 或 v6版本号移植为 Vue 依赖结论。

`primary-control` / hover 是 YSS 为白色小字保留的可访问性变体，品牌 seed 保持 Data Quality 蓝；它们是已声明适配，不是 Data Quality 原值。默认32px，显式 compact28px，seed不得以28px再次压缩。暗色使用算法生成中性色，不能把浅色 text/surface 固定覆盖带入暗色。

更新顺序：修改根 DESIGN.md → 更新 design-system-sync.yaml 摘要 → 在独立作者目录提供固定 antd6.6.4 → `node .template-source/tooling/node/scripts/design-md.mjs export dtcg --write --write-manifest --antd-toolchain <作者目录>` → lint / drift → 刷新 frontend scaffold baseline → 浏览器核对 HTML 和 Vue 两条实现。禁止手改 token 快照或生成投影。

采集依据：Data Quality commit `532509a59856fc02f3b9bcb28a062663ce887d71`；theme.ts SHA256 `8bdb5d13a0dabccc0771bac07d6e28e29d23dcc70fc72adfe04825b5a5ae16e1`。详细研究位于模板维护证据 `data-quality-theme-scaffold-2026-09-15/`。
