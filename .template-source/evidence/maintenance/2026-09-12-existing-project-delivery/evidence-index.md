# 当前实施证据索引

状态：实施中。真实 S0–S6/O1 未开始；不宣布本次修复完成。

|证据|含义|
|---|---|
|plan.md / compatibility.md|已授权范围、版本策略和完成边界|
|maven-adapters-04.json / maven-*-04.log|两类既有 Maven 适配器实际测试和打包；前几次失败保留|
|preflight/result.json / preflight/profile-verification/|只读预检、批准后增量、安装职责及分发回归；各轮与未完成项分开记录|
|ui-handoff/|既有 UI 来源、v5/v2/v3 协议及源码策略回归|
|task-package-v2-tests-06.log|Slice v2、整数/字符串版本隔离、真实派发路径和失效负例|
|strategic-distribution-02.log|四个 CLI 真初始化；旧战略包移除源后跨接收方核验/导入/对账/合同消费|
|pilot-preflight-prepare-01.json|原 Java 固定工程 prepare 通过，同时报告后续批准、构建、部署缺项|
|pilot-*-sync-* / pilot-sync-*|隔离治理仓经正常 CLI 的预览与应用结果，不覆盖 docs/.scratch 产品资产|
|verify-template-fast-01.log / *-01-interruption.json|首次全量扩大运行：保留旧 fixture 分发失败与 schema 进程挂起，未判通过|
|verify-template-fast-02.log|新预检及既有架构/原型回归执行；真实源策略测试快照被退役ID检查误报，已单独修复并复验；committed 发布来源检查仍不满足|
|retired-skill-check-02.log|仅将完整源策略回归 fixture 从活跃技能路由扫描中区分；物理退役技能检查保留|
|baseline-java-launch.json / baseline-port-forward.json|原真实 Java 服务与原隔离数据库恢复记录；端口转发只转发到原容器，不伪造数据库或探针响应|

真实产品资产位于隔离试验根 `/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-preview-pilot-20260912-0k_x_zmm`：

- `backend-governance/docs/.scratch/target-preview-pilot/existing-v2/`：三份原始架构证据、真实独立边界审查、已批准工程技术设计、已编译 Slice 候选、独立复审与规范化原 Freeze 决定来源。
- `strategy-governance/docs/.scratch/target-preview-existing-ui/baseline-v1/`：本次新构建及真实五步 Vue/API/截图，manifest 为 `sha256:996435165b1e471926034b6ff499bbed6edfe6103a41a6c6d3ba943f73581c0f`；原字节待真实产品确认。
- `strategy-governance/docs/.scratch/target-preview-existing-ui/handoff-draft/`：从真实来源重建的局部战略事实、方案、Spec 审阅内容、业务验收条目和 v5 草案。独立审查与真实决定未完成前不能导出。

固定 Java 提交 `714fd4223d202b29c410d4d5533913e44874b3f1`、Vue 提交 `76f2d1627f797d5b12a99c48cf49125544933b18`；API 为原 `1.0.0-pilot.3`，原字节 SHA-256 `8d696f69a62bee50545d418a458f848941e4e84647fea465b524779c8708259b`。本次还没有探针实现补丁、实际五字段部署身份或接收成功记录。

原 `.template-source/evidence/maintenance/2026-09-11-oss-landscape/` 未改写；早期失败、旧测试、未执行场景均不借新结果覆盖。

后续新增证据：

- `preflight/profile-verification/sync07/schema-hang-diagnosis.json`：原挂起堆栈、EOF 桥接 RED/GREEN、输入输出规模观测与未确定事项。
- `preflight/profile-verification/sync09/cli-results.json`：四个 CLI 真实初始化、新预检与 UI 11 场景通过；runtime 与快照关键文件逐字节核验。测试 harness 仅在隔离副本加入，未向接收端增加创作职责。
- `repair-pilot-slice-metadata.mjs`：只修实际候选结构并保全历史。旧会签不能继续覆盖修正内容。
- 当前修正 Slice 原字节 `sha256:adcb7f3096569ee1bb03071550afee5706f7d852d604e5648cd099ede904b4b9`，独立重新会签原字节 `sha256:ee09f925afa52efc1f3685831db73a4953686d7171f52e08be591bd7a1cc71a3`；真实人类实施范围仍未产生。
- `prepare-current-asset-review.mjs` / `prepare-review-request.mjs`：将新形成的原始事实、Plan/Spec、UI、交付范围和实施范围形成集中审阅包。请求草稿没有 presented_source、回复或批准；不得将它解释为真实确认。

最终当前快照验证：

- `sync-final-10.json`、`shared-sync-check-10.log`、`profile-sync-check-10.json`、`skill-projections-check-10.log`：共享源、三个接收模板、四 CLI 快照和技能投影检查均通过。
- `preflight/profile-verification/sync10/result.md`：四 CLI 对先前真初始化实例执行正常同步，三方运行时/锁字节相符、完整快照摘要重算通过；新增结构测试和源删除后的 UI 收集回归通过。
- `pilot-preflight-current-10.json`：实际后端 build 预检退出 0；实际战略 export 退出 1，当前仅 UI 基线与交付批准阻断。后端 8411 文件、战略 8821 文件的预检前后摘要分别一致；其他下游缺项不错误阻断当前阶段。
- `verify-template-fast-03.log` / `fresh-verification-10.json`：fast 因核心验证配置变化自动扩大到 release；调度层唯一失败是 `--require-committed`，其余已运行检查通过。脚手架成功场景中的预期失败命令按场景结果判定，不混为额外回归失败。本轮只获本地工作树交付授权，未绕过发布来源检查。
- `syntax-check-10.json`：38 个本轮相关 JavaScript 文件语法检查通过；`git diff --check` 通过。
- `current-review-self-check.json`：7 项当前请求与嵌套依据 41 项只读检查通过。没有生成真实人类回复或批准。
- Git 交付前复验发现 `approved-execution-context` 已分发而其直接依赖的 `lifecycle-checkpoint.schema.json` 未进入接收模板分发清单；补齐依赖后要求三个接收模板重新通过各自 Fresh Verification。

当前状态：等待本次固定资产的真实确认。下一步是正常实施 R3、建立 S0/S1 后独立派生全部故障场景，再据真实 S3a 决定是否修补目标授权。这里不宣布原计划完成。
