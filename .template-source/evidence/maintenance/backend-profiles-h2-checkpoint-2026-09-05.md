# MVC / DDD Profile 与 H2 维护检查点

维护强度：L3（generation-semantics、cross-repo-contract、core-validator、aggregate-behavior-change）。本轮为 template-source 维护，不创建产品 Spec、OpenAPI 或 Ticket；context_reconciliation 为 not-applicable，原因是仅修改可复用工具/合同。根 CONTEXT 合同已由聚合检查验证。

## 已落地

- 注册三个显式 Profile，DDD/MVC Recipe 分流，旧统一 Recipe 拒绝执行；工程基线/登记/Manifest 身份不一致时阻断，draft Profile 不可 ready-for-agent。
- DDD、通用 MVC 和新数据分析初始化器统一 H2 本地/测试、生产 not-bound；拒绝 --database/--with-mock，普通配置不激活默认数据库。Java 8 及 Lombok/MapStruct 处理器基线保留。
- Application/Repository/Web 按 Profile 加载参考文件；Domain 仍 DDD-only。MVC service/core、Repository、server/client 的事务/DTO/校验/异常边界明确。
- 数据分析旧入口退役，历史实现及测试保留在 references/history；新入口生成独立 Git/project-instance、完整 skillUtils 和根 Context handoff。
- Web 生成器支持 server/service 和 server/core/client 两种 MVC 布局，校验身份/写范围。首切片验证核心加入 MVC 适配器。
- 主体和 yss-harness-dev-agent 共享资产、投影、锁及派生边界已同步；保留子模板专有编排器和合同，不复制主项目生命周期覆盖子模板角色体系。

## Fresh Verification

- 主体 `scripts/verify-template-fast`：exit 0。因既有 AGENTS.md 脏改动触发保护性升级，实际执行 release 聚合检查；这不是发布授权，也不证明真实 Maven 兼容。
- 子模板 `scripts/verify-template-fast`：exit 0，同样自动升级聚合检查。
- 主体专项 Node 测试：51 项，48 pass / 0 fail / 3 skipped；涵盖 DDD/MVC 生成、架构分流、身份漂移、Web 路径、退役旧入口和 DDD 首切片结构。跳过项明确是受控 Maven/异常 starter 真实集成。
- 两个 CLI `node scripts/sync-template.js`：exit 0，快照来自本地工作树；没有提交或推送，不得称为不可变发布快照。
- `git diff --check`（本轮共享 Skill / helper / registry 范围）、Skill 投影及锁检查：exit 0。
- CLI 完整实例测试：`create-yss-harness-dev` 56/56 pass，`create-yss-spec` 57/57 pass，均 exit 0（`node --test --test-concurrency=1 tests/*.test.js`）。
- 可选离线 Maven 可行性检查（Java 8，`YSS_BACKEND_OFFLINE_PROBE=1`）：`./mvnw -o validate` exit 0；`./mvnw -o test` exit 1，缺少已缓存的 `ch.qos.logback:logback-classic:1.2.13`，离线模式不能访问未配置的 YSS 仓库；`package` 未执行。此结果不替代受控仓库验收，也不能证明 Java 编译或行为兼容。
- 最后增加可选离线探测测试后，主/子模板已重新同步投影、锁并通过聚合检查（均 exit 0）；MVC 生成器及架构合同专项重跑 15 项，14 pass / 0 fail / 1 skipped（默认不启动离线探测）。两个 CLI 快照已再次同步。上述 CLI 完整实例测试先于这一次仅测试文件及锁的同步，不将它冒充为最后快照的完整重验。
- 最后同步后的 CLI 快照专项 `node --test tests/sync-template.test.js`：`create-yss-harness-dev` 7/7 pass，`create-yss-spec` 8/8 pass，均 exit 0。

## 未闭合与下一步

整体推荐尚未完成兼容验收；三个 Profile 都保留 draft，不声明 supported、first-slice-verified 或可发布。

1. 环境只确认 JAVA_HOME 已设置；YSS_MAVEN_REPOSITORY_URL、MAVEN_REPO_USERNAME、MAVEN_REPO_PASSWORD 未设置。未读取或输出凭据，真实 Maven 验证没有执行成功。
2. 两种 MVC 的完整 CompatibilityProbe golden fixture 仍需补齐并执行；当前 MVC 证据是编译器、路径和机械生成测试，不能替代 HTTP→service/core→Repository、回滚、校验、错误和字段转换的真实行为证据。既有 DDD golden fixture 已适配 H2/身份，但未完成本轮真实 Maven 重验。
3. 需要在受控 Java 8 / YSS 仓库环境中完成三个 Profile 的 validate/test/package、首切片及异常 starter 集成，再决定成熟度晋升。
4. Git commit/push、CLI 固定 commit 发布快照和真实发布均未授权、未执行。

维护者自检：旧入口不再生成 Oracle/Mock；新默认不绑定生产库；不靠目录推断架构；不存在新增 Domain 对 MVC 的强制依赖；不以 Node 结构检查代替 Java 运行兼容。当前是部分实现且验收未闭合，不创建冻结候选或 formal review，不伪报 implementation-ready。
