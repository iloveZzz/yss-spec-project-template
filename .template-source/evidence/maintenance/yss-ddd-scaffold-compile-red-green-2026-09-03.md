# YSS DDD 脚手架编译闭环 RED / GREEN / REFACTOR

> 决策更新（2026-09-03）：本文记录的是 Target Profile 冻结前的编译修复过程。其旧合同默认值结论已被后续严格边界取代；当前 scaffold contract schema v1、缺失 `maven_coordinates`、旧项目迁移和模板升级均为 `unsupported`，不自动升级或回退。权威结论见 [Target Profile 决策记录](yss-ddd-scaffold-target-profile-decision-2026-09-03.md)。

## RED

在修改生成语义前，为公开 seam 增加了真实生成工程构建测试：

```bash
node --test --test-name-pattern='生成工程通过真实 Maven Wrapper 三命令验证' \
  .agents/skills/yss-ddd-scaffold-generator/scripts/scaffold-generator.test.mjs
```

测试返回非 0。`./mvnw validate` 与 `./mvnw test` 通过，`./mvnw package` 在 Bootstrap 模块执行 `spring-boot-maven-plugin:repackage` 时失败，关键诊断为 `Unable to find main class`。这证明旧结构测试通过并不能证明生成工程可打包。

随后新增的两个合同测试也先失败：CLI 不识别 `--group-id`；验证报告没有 `failure_category` 与 `preflight`，无法区分内部仓库解析失败和测试/编译失败。

## GREEN

完成机械启动入口、Maven 坐标合同、项目级内部仓库接线、验证分类和一键生成验证入口后执行：

```bash
node --test .agents/skills/yss-ddd-scaffold-generator/scripts/scaffold-generator.test.mjs
```

最终 fresh run 结果：14/14 通过，退出码 0，总耗时约 55 秒。其中一键工作流在临时生成工程中实际执行 `./mvnw validate`、`./mvnw test`、`./mvnw package`，三条命令全部返回 0；该用例耗时约 53 秒。

## REFACTOR

- 删除未被生成器读取的第二份父 POM 模板，只保留 `assets/templates/pom/parent-pom.xml.template`。
- 把 Java `base_package` 与 Maven `group_id` 分开校验，避免从包名前缀静默推导构件坐标。
- 将 `metadata-platform` 中可复用的通用 YSS 依赖与测试 seam 纳入模板，但未复制 Client 模块、业务扫描、业务依赖、数据库结构或业务代码。
- 将底层生成器的成功文案改为“工程文件生成完成，等待受控 Maven 验证”；只有一键工作流三阶段全部通过才输出最终完成。

## 压力场景

以下场景均通过：

- 非空目录覆盖、回滚备份、gitlink、空挂载点和 detached HEAD 仍按原边界阻断。
- 合同 `base_package` 或 Maven 坐标与 CLI 不一致时阻断。
- 仓库解析错误分类为 `repository-access`，不误报为 Java 编译错误。
- Java 编译错误与缺失 Bootstrap 主类分别分类为 `compilation`、`bootstrap-entrypoint`。
- scaffold contract schema v1 或缺少 `maven_coordinates` 时返回 `unsupported`，不使用默认 Maven 坐标，也不生成 Manifest。
