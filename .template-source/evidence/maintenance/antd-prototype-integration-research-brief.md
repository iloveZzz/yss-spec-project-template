# Ant Design 原型集成研究简报

## Research Scope

采用 `technical-evidence / evidence-audited`，只为当前模板维护提供事实。实际起始时间由 clock 工具读取为 **2026-09-14 15:52:30 UTC**（上海时间23:52:30）；不使用旧会话日期推测。目录复核于2026-09-14 16:00:46 UTC完成（上海时间2026-09-15 00:00:46），因此这次采集跨过本地午夜。范围包括官方全量目录、React依赖、CLI知识与版本解析、主题Token和zeroRuntime；不执行组件实现、插件安装或产品生命周期审批。

来源限定官方文档与固定源码。[证据文件](antd-prototype-integration-evidence.yaml)记录检索、反向限制及审计；[组件目录](../../../.agents/skills/yss-prototype-stage/references/antd-component-catalog.json)为独立机器可读资产。

## Executive Read

官方当前总览与固定AntD源码共同支持 **73个基础目录条目、6个外部重型条目**。73项包含废弃List、独立Icon包和Util工具入口，不能称为73个已验证组件。全目录登记用于发现能力，具体原型只按业务场景选用。

AntD组件依赖React，`zeroRuntime`只停止运行时生成样式；制作工具可使用Node，不表示接收方也需要Node。是否能交付本地双击、断网可运行的资源包，仍取决于实际打包、资源路径及浏览器验收，研究没有提供这项通过证据。

## Findings

1. **claim-001：目录已核对。** [总览](https://ant.design/components/overview-cn/)分类为通用4、布局7、导航7、数据录入18、数据展示21、反馈11、其他5。源码[Overview](https://github.com/ant-design/ant-design/blob/db0488c167154941ce4686074ef69e757e1f3492/.dumi/theme/builtins/ComponentOverview/index.tsx)从文档frontmatter生成基础组，再追加[六个Pro外链](https://github.com/ant-design/ant-design/blob/db0488c167154941ce4686074ef69e757e1f3492/.dumi/theme/builtins/ComponentOverview/ProComponentsList.ts)。目录保存每项源码path/blob SHA；仅Masonry6.0.0、Listy6.6.0、BorderBeam6.4.0具有可直接采集的版本tag，其余不猜测。
2. **claim-002：React是组件运行依赖。** [AntD package.json](https://github.com/ant-design/ant-design/blob/db0488c167154941ce4686074ef69e757e1f3492/package.json)在6.6.4要求React与ReactDOM均为`>=18.0.0`。这是peer约束，不是任意符合范围的版本都已经通过目标原型测试。
3. **claim-003：CLI查询需核实际知识版本。** [CLI文档](https://github.com/ant-design/ant-design/blob/db0488c167154941ce4686074ef69e757e1f3492/docs/react/cli.zh-CN.md)提供list/info/doc/demo/token/design.md/semantic/changelog及JSON输出；但[loader](https://github.com/ant-design/ant-design-cli/blob/bf8c683eec626e810e8cb190c2d21daba928dd75/src/data/loader.ts#L89-L173)按同minor快照、较早minor、major回退。本次固定CLI源码的6.6映射6.6.4，不能由此泛化“所有patch精确可查”。
4. **claim-004：目录与CLI覆盖有差异。** [CLI v6元数据](https://github.com/ant-design/ant-design-cli/blob/bf8c683eec626e810e8cb190c2d21daba928dd75/data/v6.json)自带version6.6.4，共72项；与本目录名称集合对比，只有`Util`在目录中但不在CLI元数据中。建议全量目录以官方页面/固定文档为准，具体组件知识按需查询并补固定源码证据。
5. **claim-005：视觉映射以项目规范为准。** [主题文档](https://github.com/ant-design/ant-design/blob/db0488c167154941ce4686074ef69e757e1f3492/docs/react/customize-theme.zh-CN.md)允许ConfigProvider全局Token、组件Token及算法；[CLI design.md加载器](https://github.com/ant-design/ant-design-cli/blob/bf8c683eec626e810e8cb190c2d21daba928dd75/src/data/loader.ts#L51-L65)说明其设计语言为major级默认light描述。建议保留YSS视觉，明确项目Token→AntD映射；不以默认设计语言覆盖根DESIGN.md。
6. **claim-006：zeroRuntime仍需样式交付。** [主题文档零运行时章节](https://ant.design/docs/react/customize-theme-cn/#zero-runtime)要求显式CSS；默认CSS没有hashed className，定制prefix等配置可能需要静态抽取。建议默认先让项目主题正常运行，只有主题与CSS组合经过验证后再选zeroRuntime；它不是去除React或自动离线的开关。
7. **claim-007：独立包必须单列。** [Icon文档](https://github.com/ant-design/ant-design/blob/db0488c167154941ce4686074ef69e757e1f3492/components/icon/index.zh-CN.md)要求`@ant-design/icons`并提示配套6.x；[Pro包声明](https://github.com/ant-design/pro-components/blob/fabe5aeb1c671b2b03531029bbadc276f6f3d21d/package.json)核实`@ant-design/pro-components`归属。六个Pro条目单列`external_entries`，不承诺其版本组合兼容。
8. **claim-008：知识工具与交付运行环境分开。** [For Agents](https://github.com/ant-design/ant-design/blob/db0488c167154941ce4686074ef69e757e1f3492/docs/react/for-agents.zh-CN.md)把CLI/MCP作为知识入口。建议只采纳本轮需要的查询与事实提取，固定CLI与目标库版本、记录实际解析来源；不为获取知识自动执行setup、升级或安装新的Skill。制作期使用这些工具不意味着离线接收包需要运行CLI。

## Counter-Signals

[CLI加载器](https://github.com/ant-design/ant-design-cli/blob/bf8c683eec626e810e8cb190c2d21daba928dd75/src/data/loader.ts)的minor/major回退限制了“精确版本查询”的字面解释；默认light设计语言也不能覆盖项目视觉。List仍被计入目录但已废弃，Icon与Pro条目不是同一包，Util未进入当前CLI元数据，因此不能用一个数量代替所有能力覆盖。

[MDN Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)说明file URL模块加载的CORS限制；[localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)说明file URL下行为未定义。这些本会话已核官方材料意味着必须验证产物，不能从“CLI知识可离线”或“zeroRuntime”推导“原型已离线可用”。

## Source Map

- AntD：源码固定`db0488c167154941ce4686074ef69e757e1f3492`，package和当前页面均为6.6.4。
- CLI：源码固定`bf8c683eec626e810e8cb190c2d21daba928dd75`，package6.6.4，Node>=20；本任务未安装或运行CLI。
- Pro Components：源码固定`fabe5aeb1c671b2b03531029bbadc276f6f3d21d`，仅核包归属。
- 目录：按固定tree读取73份带group的中文文档，兼容group字符串/对象写法；与官方页面逐分类计数一致。外部条目取独立ProComponentsList。
- 失败记录：css-variables页面读取失败；猜测的Pro子目录package路径404，随后以官方tree定位root package，失败路径不作为结论来源。

固定源码是本次检查点，不承诺之后仍为最新版本；线上页面可能变化。没有二手组件清单或未核版本进入证据。

## Decision Handoff

主控负责将用户已确认的方向转成模板生成器、主题映射、验证器和分发修改，并记录实际浏览器与供应链结果。建议维持全部目录可发现、组件按需使用、废弃项禁止用于新原型、外部Pro显式选择的边界。具体初始组件集与复杂控件范围应消费用户当前决定，研究不代为批准。

本研究只写指定临时目录，不改共享仓，不安装第三方Skill、不复制第三方实现；目录仅提取名称、分类、链接、状态、包归属和定位信息。

## Evidence Limitations

目录结构与事实审计可验证，不等于原型实现或发布通过。没有实际浏览器离线兼容、主题还原、键盘焦点、性能或跨版本组合结果。CLI元数据即使声明6.6.4也可能存在字段/示例遗漏；出现新API疑问时应回到固定组件源码。研究包校验器仅验证格式与引用闭合，主控仍须执行Fresh Verification。

## 集成阶段结果

以上限制描述研究阶段。主控随后按用户确认完成固定作者工具、组件知识采集与离线打包；实际浏览器证据见 [维护验证结果](antd-html-prototype-2026-09-15/workbench-result.json)，可复用执行方式见 [AntD 集成说明](../../../.agents/skills/yss-prototype-stage/references/antd-integration.md)。这些结果仍不等于具体产品的批准或生产组件兼容性。
