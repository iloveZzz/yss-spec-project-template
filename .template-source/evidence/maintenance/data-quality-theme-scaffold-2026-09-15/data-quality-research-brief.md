# Data Quality主题与脚手架采用决定

按用户要求，Data Quality的全局浅色主题成为默认设计标准，源码工程作为通用骨架的参考来源。框架实际是Vue3 + Ant Design Vue4.2.6 + YSS UI；Ant Design v6仅为设计基础。默认主色3371ff、正文14px、控件32px、Card内距20px；暗色和compact为显式选择。YSS主操作白字高对比颜色保留并标明为适配。

采用随Skill分发的data-quality-v1，锁定文件白名单与manifest摘要，兼容原精确Git commit输入。保留packages工作区、Pinia/Router、Qiankun与standalone、容器主题桥接、冻结JSON到Orval入口。移除业务页面/默认管理员/接口地址/网络同步/凭证/残缺JSP脚本。主题统一从根DESIGN派生到HTML与Vue配置。

原TS6与旧parser、Orval/Formily的peer范围冲突，新骨架选择TypeScript5.9.3与parser8.70；双Vite收敛到6.0.5，Node最低22.12。具体来源、反证和40份摘要见source-analysis.md；结构化审计见data-quality-evidence.yaml。实测记录见verification-summary.md；它们不构成产品或发布批准。

## Research Scope

Profile: `technical-evidence`；Mode: `evidence-audited`。范围仅为用户指定Data Quality项目的主题、机械工程和当前模板技能；排除业务资产与生产凭证。

## Executive Read

采用Data Quality全局浅色默认与白名单重建骨架，保留YSS生命周期批准和模板来源摘要边界。

## Findings

`claim-001`：实际Vue4运行时与AntD6设计参考分开。`claim-002`：采用bundled机械资产，移除业务耦合。来源和字节依据见 [source-analysis.md](source-analysis.md)；[官方主题文档](https://ant.design/docs/react/customize-theme-cn/) 仅说明AntD6算法。

## Counter-Signals

原锁不一致、旧解析器与TS6冲突、JSP缺文件，证明不能整仓复制；客户主题/玻璃样式不构成全局默认。全部反证见evidence-003 / evidence-005。

## Source Map

源码和lock确认事实；官方文档确认AntD6主题层；npm元数据与实际安装确认兼容调整。AntDV网页访问失败，改用安装包公开类型和真实浏览器核验。

## Decision Handoff

下游由maintaining-skills维护yss-design-system和yss-frontend-scaffold-generator。本研究不批准或直接修改产品资产；用户已授权的模板修改与实际验证另行记录。

## Evidence Limitations

源工作树有已有业务修改，摘要区分HEAD与working-tree。私网访问依赖本机缓存。安装保留Formily传递vue-frag旧peer警告；空骨架验证不覆盖业务Formily功能。详细限制见data-quality-evidence.yaml。
