# 版本兼容与事实归属

本轮维护源码与 CLI 使用工作树内容，未提交、推送或发布。原试验目录只作为历史证据读取。

|协议|本轮处理|校验边界|
|---|---|---|
|根仓库身份、生命周期状态 v1|版本与职责不变|模板维护与隔离 project-instance 分开|
|原生成式架构身份/脚手架合同|原格式及生成器、模块闭包、H2/not-bound、成熟度保留|没有把原 draft 生成 profile 升级|
|既有架构身份 v2|新增 existing-registration；支持 DDD/MVC Maven|原始登记、基线、独立观测逐文件核验；未知来源/profile/摘要漂移拒绝|
|Technical Design v2|保留架构分支；新增 engineering-only 限定分支|真实样本探针不涉及业务领域模型，不能伪造聚合/网关；须绑定构建单元、写路径、只读一致性和测试 seam|
|Slice Contract v2|绑定原始身份/设计与批准后的允许输出|编译只起草，批准与实施决定另存；改变固定输入仍失效|
|Task Package v1|contract_version 接受历史正整数或非空字符串，严格区分类型；真实 task_package_ref 可读复验|不把 1、字符串 1、v1 转成同一版本；保留旧工作单元 ID 引用兼容，新的实际派发采用文件引用|
|只读预检 v1|prepare/build/export/accept；退出 0/1/2|不构建、启动、批准、发请求、解压或写接收状态；后续缺项不误阻断准备阶段|
|Existing UI Baseline v1|新增无 UI 改动来源|原 manifest 保持已展示的 ready-for-human 字节；当前外部批准与真实决定建立有效承接，不能改状态后挪用旧摘要|
|Strategic Handoff v5 / Export v2|显式 UI 来源类型|原型路径仍保留原要求；既有 UI 不冒充离线原型；按源 profile 产品确认 gate 核验|
|Frontend Strategic Preflight v2 / Acceptance v3|通用 case 引用和基线类型|源码、动作、截图、API 与批准均绑定|
|Backend Delivery v1|当前仍保留|S0 前没有 S3a 实测，尚未启用目标授权 v2，不能宣称错仓防护已验证|

主模板拥有共享 wire 校验代码、身份和编译能力；战略模板持有产品事实与真实确认；后端模板持有技术设计/实现；前端接收已导出的受控证据。非拥有 profile 对原始后端技术资产明确报 unsupported，不安装后端或原型创作职责来补测试。

生成式工程与既有工程的 supported 依据分开。两类 Maven 适配器有真实合成 Git/Maven 构建测试；真实 Java 工程也已完成原始证据、独立边界和工程技术设计审查。这些结果不等于生产数据库兼容，不等于 S0–S6/O1。

当前 backend profile 的 Slice gate 显式会签策略与主模板 orchestrator checkpoint 不同。新 helper 读取实际源策略，不把一个 profile 的批准格式伪装成另一个。原 API Freeze 已从原任务的原始展示及确认消息补齐可追溯来源，当前 API 字节不变；这不批准新的 UI、交付范围或 Slice 实施范围。

同步范围为主模板、战略/后端/前端接收模板和四个现存 CLI。已移除的旧 dev 子模块没有恢复。CLI 的 working-tree 快照不是 committed 发布来源；`verify-template-fast` 因验证配置变化会自动扩大到 release，发布专属 committed 检查仍不可被工作树快照替代。

本轮真实候选还发现 Slice 元数据序列化缺陷：把生命周期引用与就绪信息初始化为数组后附加命名属性，会在 JSON 持久化时丢失。修复生成脚本；既有 v2 的批准与预检入口共用结构检查。原错误合同与当时审查会签保留在隔离后端的 `history/slice-invalid-array-metadata/`；修正后的专业审查不自动建立当前人类实施范围。动态生命周期入口的九项 readiness 和 current_version 仍由流转状态表达，不硬塞入已固定的 Slice 原始合同形成批准循环。

schema 子进程历史挂起已捕获 Python 等待 stdin EOF、Node 等待子进程的实际堆栈。改为按 UTF-8 字节长度读取完整输入并设置 30 秒上限；没有变更外部命令运行语义，没有用降低并发冒充修复。刻意保持 stdin 写端不关闭的真实桥接复现从 RED 变为 GREEN；具体哪个外围进程保留原写端尚未确定。sync09 四 CLI 真初始化、新协议回归和三个接收模板回归均通过；这些属于合成机制验证。
