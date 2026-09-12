# 跨仓交付真实样本：本轮结果

本轮按已确认试验约定收尾，结论为 **基线未就绪**。真实 Java API 与 Vue 页面已经跑通，v3 OpenAPI 已获本次真实确认并冻结；新增身份探针无法通过既有工程的实现合同编译前置，因此跨仓接收与拒收恢复尚未执行。不能把这个结果写成机制通过，也不能写成接收器误拒收。

## 已完成与证据

| 工作 | 实际结果 | 证据 |
|---|---|---|
| 独立治理与源码登记 | 三个 project-instance 初始化；两份固定源码副本，未混入原仓脏改动 | [初始化](governance-initializations.json)、[隔离基线](baseline.json) |
| Java/Vue 原版构建 | 完整 Java starter 与 Vue standalone 构建成功；Java预览7项、前端API8项及弹窗源码断言3项通过 | [运行准备](runtime-preparation/report.md) |
| Java＋PostgreSQL | 两轮各6项真实HTTP：省略/CURRENT为1行、ALL为2行、空表0行，非法scope400、未知任务404 | [实际响应](runtime-preparation/preview-http-observations-02.json) |
| Vue真实交互 | 打开、ALL、刷新、空表、重新打开，五次API响应均200，行数1/2/2/0/1；有截图与网络记录 | [浏览器记录](browser-preparation/preview-interactions-04/verification.json) |
| 本次Freeze | 原始回复“确认”绑定已展示六项资产；精确v3字节仍一致，当前批准及artifact binding核验通过 | [真实确认](freeze-confirmation.json)、[核验](freeze-approval-verification.json) |
| 身份数据准备 | 两个合成case，18条固定SQL；psql与真实JDBC读回相同，各库只读/REPEATABLE READ/UTC验证通过 | [数据准备](runtime-preparation/probe-data/report.md) |
| R3实现准备 | 12个公开验证seam、五字段真实来源、有限写范围与恢复设计；合同草案未编译、未批准 | [编译结果](r3-compilation-result.json) |
| 接入阻塞复现 | 主控分别执行DDD/MVC HTTP Recipe，均退出1；独立审计得到相同错误 | [实际命令与退出码](compiler-fresh-reproduction.json)、[独立审计](independent-continuation-audit.md) |

冻结接口为 `1.0.0-pilot.3`，SHA-256：`8d696f69a62bee50545d418a458f848941e4e84647fea465b524779c8708259b`。正式当前批准记录位于后端治理实例的 `docs/.scratch/target-preview-pilot/gates/gate.openapi-freeze-confirmed-approval.yaml`。其批准范围不包括尚未形成的Slice或战略交接包。

## 确切阻塞与根因

两条正常编译入口的错误均为：`缺少 architecture_identity；请从工程基线重新编译`。没有删除Recipe、弱化影响条件或生成假身份。独立审查和主控均已重现；[可重跑脚本](reproduce-existing-project-compiler.mjs)直接读取真实登记。

技术设计验证器允许 `existing-registration`，但下一层实现编译仍要求生成器Profile、固定模块闭包，以及工程基线、仓库登记、Manifest三份架构身份一致；身份还固定声明H2和not-bound。这个旧工程没有可读的原始生成记录，不能仅凭Web/Application/Domain等目录或已成功PG测试补造这些事实。**PostgreSQL能运行，缺的是对既有工程来源的合规表达能力。** 三个关键文件与主模板当前字节一致，见[源码对比](compiler-source-comparison.json)，不是简单升级到当前模板即可解决的问题。

另有后续前提：真实Backend Delivery强制引用战略包，当前战略包又强制原型、视觉基线和离线浏览批准。现有页面没有改动，并不自动获得这些新资产的批准。当前六资产确认不能改名复用为新战略/视觉/交接批准。由于R3已有确定阻塞，本轮没有为验包而新造整套战略流程；此项按源码确认的适用性缺口记录，尚未执行战略导出。

## 场景矩阵

| 场景 | 本轮状态 |
|---|---|
| S0 正确首次接收 | 未执行：探针与有效交付包前提未就绪 |
| S1 幂等 | 未执行：无S0正例 |
| S2 接收方已知新版后的旧包 | 未执行：无S0正例 |
| S3a 错仓自洽包、S3b 错切片自洽包 | 未执行：无S0正例 |
| S4 当前内容＋旧批准 | 未执行：无S0正例 |
| S5 修正后正常恢复 | 未执行：未发生正式故障注入 |
| S6 干净环境重放 | 未执行 |
| O1 上游变化未同步 | 未执行 |

没有创建有效交付收据或前端accepted状态，因此也没有伪造“两侧拒收前后差异”。原先9项模板合成测试仅是维护证据，不计入该矩阵。

## 收尾核验与限制

[本轮最终核验](final-pilot-verification.json)退出0：59项检查覆盖六项冻结资产、独立审计来源、33个基线文件、两源码副本干净状态、三仓Context、SQL/JDBC快照、实际编译失败日志与服务停止状态。该检查证明证据当前一致，不把未启动的服务宣称在线。

本轮专用PostgreSQL和Redis已停止并保留卷；Java/Vite未重新启动，61111/61112无监听。[停止记录](runtime-preparation/probe-data/stop-commands.json)保留真实命令。Docker恢复后动态端口会变，下一轮必须重新核验，不能复用旧连接端口。

完整前端suite曾有无关失败；当前starter曾有无关后台缺表和重复Mapper日志。局部成功不证明全应用健康。浏览器唯一console error来自隔离策略阻止外部模板头像，不是预览API错误。两数据库分别取只读快照，不宣称跨库原子快照。probe的缺字段/错JAR/错数据503行为仍未实现、未验证。

原业务工作区、编译器和接收机制均未修改；没有Git提交、推送或发布。产品治理资产保存在隔离路径 `/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-preview-pilot-20260912-0k_x_zmm`；该目录可能被系统清理，后续须凭固定提交重建并重新验证。本报告与原始运行/编译/审计证据保存在当前维护证据目录。

## 下一步与停止依据

优先补齐“既有工程身份＋端到端前置预检”，再用同一固定样本恢复R3和S0–S6。具体事实源范围、兼容边界与验收建议见[机会收敛方案](opportunity-refinement.md)；该建议尚未实施。

停止依据是已确认[试验约定](../trial-agreement.md)的Q10与“通过、完成与停止”：可执行前置完成并留证后允许结束为“基线未就绪”，本轮不直接修机制。同时本实例 [yss-implementation-contract-compiler/SKILL.md](/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-preview-pilot-20260912-0k_x_zmm/backend-governance/.agents/skills/yss-implementation-contract-compiler/SKILL.md:16) 明确要求：“输入缺失、未批准或过期时返回 blocked。” 这里缺失的是可据实消费的工程身份；现有范围授权与Freeze继续保留，未再次请求同一批准。
