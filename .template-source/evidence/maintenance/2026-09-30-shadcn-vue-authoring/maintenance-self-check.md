# 维护者自检

本轮按用户明确选择新增 Vue 作者路线，迁移查询与表单；不是独立评审或视觉批准。

- 根 DESIGN 只调整作者路线说明。Token CSS 与开工快照逐字节一致，根 CONTEXT 未改；生产 Vue/YSS 合同不变。
- shadcn-vue 官方当前默认分支 dev 固定到 67c9a3926dc0a854507b325c6337ff2210d16379。24 组共 150 个原始文件，未修改上游源码，映射及外观写在本地层。
- Vue 与 compiler-sfc 同版锁定，工具链在临时独立目录，源码及交付包没有 node_modules。构建器编译 SFC、图片及 CSS，输出本地 IIFE；Vue 错误处理接入场景失败，不允许错误后 ready。
- 样例沿用同一场景文件和业务行为。查询的 Select、Checkbox、DropdownMenu、Pagination、Sheet，表单的 Field、InputGroup、Textarea、Alert 等是真实 Vue 组件。原生 select 仅留在独立评审工具。
- 主题继续读取项目 Token；轻玻璃为局部研究选项，未取得用户视觉批准，未变更正式默认。
- 旧 React 四包保持原封存内容；旧作者构建和测试保留。原生及旧 AntD 只读兼容继续通过现有测试。
- profile 初次预检正确拒绝未提交目标；通过本轮 canonical 前后快照与目标做三方增量合并，重叠即停止，保留目标独有编排文字，并保存逐文件 before/after 摘要及旧字节。随后现有 profile 检查零差异，来源 hash、锁、投影及三 CLI 通过原有工具刷新。
- 当前工程和总体验证证据见 report.md。没有提交、推送、发布、真实 Agent 试点或用维护者意见代替用户确认。

插件兼容修复：Browser 作者资产仍按原字节复制和摘要记录，不作为 Node 入口；实际构建 CLI 仍进入模块分析。原始新增失败已通过既有固定 CLI 依赖的 7 项插件回归关闭。最终全量复验输出放仓库外，禁止验证期间写本仓证据。
