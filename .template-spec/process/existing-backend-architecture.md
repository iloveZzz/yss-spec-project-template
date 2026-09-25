# 既有后端工程的架构身份

既有工程以 `source_kind: existing-registration` / 身份 schema v2 接入，不反推生成器历史。原生成式身份与脚手架合同继续使用原字段和 H2/not-bound 语义。外层 Slice Contract v2、Technical Design v2、根身份/生命周期状态 v1 不改变。

支持 Java/Maven 的 `existing-domain-driven-maven`、`existing-layered-mvc-maven`。适配 Profile 由技能注册表的 `existing_project_profiles` 持有，不与生成器 Profile 共用成熟度。编译器复用对应架构 Recipe/capability，并将实际责任路径传给实现者；单 JAR 内多个包可以分别承担职责，不生成伪 Maven 层模块。

## 三份原始证据

编译输入的 `architecture_evidence` 包含 `repository_registration`、`engineering_baseline`、`manifest`，每项均为 `{ref,digest}`。引用相对治理根，摘要为原字节 SHA-256。实现者不得传三个内联身份对象替代原文件。

- 登记含 `repository_id/project_id`、`status: current`、`local_worktree`、`project_root`、`repository_url`、`owner`、`allowed_write_paths`、`verification_commands`、`architecture_identity`。`architecture_evidence` 引用工程基线与 manifest，自身不自引用。实际 Git 根、origin、HEAD 必须与登记和固定基线一致；origin 只用于核对已登记来源，不产生授权。
- 工程基线使用 `schema_version: 1/kind: existing-engineering-baseline`，含 `id/version/status: current/author`、项目身份、`architecture_identity`、`source`、`build_units`、`boundary_scope`、验证命令、数据库声明及 `boundary_review`。仅将有证据的功能范围登记为 DDD/MVC，不宣称混合仓整体同构。
- 观测 manifest 使用 `schema_version: 1/kind: existing-project-observation`，含同一项目身份、`architecture_identity`、`source`、`build_units`。它记录当前可重复读取的事实，不记录虚构的生成器完成状态。

`source` 含真实 `base_commit`、`roots`、`files`；每个文件含 `path/base_blob/sha256`。Git 树必须覆盖声明范围，源码实际字节必须匹配；初始有限补丁另外登记 `patches` 的 `path/base_blob/sha256`，并由基线审查覆盖。排除 `.git`、`target`、`node_modules`。固定构建输入必须覆盖父 POM、Wrapper、所选单元及实际构建消费的受管源码；不能只取两个修改文件声称固定完整工程。

`build_units` 每项含 `id/artifact_id/pom_ref/roles/role_paths/depends_on`。直接解析 POM 核对 artifact、声明的仓内依赖和 reactor 模块闭包；角色路径必须存在于冻结源码及 `boundary_scope`。Profile/父 POM的动态解析、私有 SNAPSHOT 实际字节、完整构建结果另由构建验证证据证明，静态 POM 观测不能代替 Maven 构建。

身份仅保存 `schema_version/source_kind/architecture_family/architecture_profile/repository_id/project_id/source_digest/build_units_digest`。后两个摘要使用规范 JSON（对象键排序、数组保持顺序）的 SHA-256。三份文件保存同一身份，编译器必须重新读取原引用核验，不能仅比较身份副本。

## 审查与数据库

`boundary_review` 引用所属治理仓角色策略中的真实架构审查会签记录：主模板为 `check.architecture-reviewed`，专用后端模板为 `gate.technical-design-approved`。两者均必须绑定工程基线本身，且通过本地角色与门禁策略核验；不能凭记录自述跨职责替代，审查必须来自不同于基线作者的执行者，附可读审查证据。`artifact_bindings` 绑定基线 id/version 及去除 `boundary_review` 后的规范 JSON 摘要，避免自引用。基线的完整文件摘要再由仓库登记、合同绑定。此审查不替代当前 Slice 合同批准。

`databases.verification` 与 `databases.production` 分别记录 `declared/verified/unknown/not-applicable`。`verified` 必须包含 engine/version/environment_id 及原字节 verification 引用；被引用记录绑定 source_digest、相同环境/引擎/版本、实际命令/退出码/时间和原始日志摘要。声明 PostgreSQL、装有驱动或 H2 通过均不能当作 PostgreSQL 实库验证；生产未知据实保留未知。

## 新鲜度与恢复

编译时只接受固定输入；基线、登记、观测、审查或原始源码改变，必须补证并重新编译/批准。合同 `resolution.architecture_evidence` 冻结三方引用，在复验时重新加载。技术设计的 `existing-registration` 引用必须指向同一正式登记。

批准后验证输出时，只允许合同与登记允许路径的交集作为源码增量；构建角色与依赖仍须一致。原始输入仍保持不变，输出作为本轮执行结果核验，不把每次正常业务编辑判为基线替换。新增架构、未声明依赖、身份改变或越界输出继续失效并重路由。错误以 `ARCH_*` 原因区分证据缺失、来源不支持、三方冲突、源码漂移、构建冲突、审查过期和数据库未验证，正常恢复是修正事实源、复验、重新编译及取得必要批准。
