---
name: java-backend-commit
description: 分析并提交 Java、Spring Boot、Maven、Gradle、单体服务和多模块后端项目的 Git 改动；当用户要求生成 commit message、检查提交规范、拆分原子提交、暂存并执行 git commit，或修复 commitlint 与 commit-msg hook 拒绝时使用。读取仓库实际规则、模块结构和 diff，选择服务或业务域 scope，生成英文 type/scope 与中文标题和正文，并安全验证提交。
---

# Java 后端规范提交

## 触发条件

- 用户要求为 Java 后端项目生成 commit message、检查提交规范或执行 `git commit`。
- 需要将跨层改动（接口、领域、持久化、迁移、测试）拆分为可独立构建和回滚的原子提交。
- commitlint、`commit-msg` 或 `pre-commit` hook 拒绝提交，需要按规则修复。
- 适用于 Java、Spring Boot、Maven、Gradle、单体服务和多模块后端仓库。

## 不适用场景

- Vue、React 等前端或微前端仓库：使用 `../frontend-commit/SKILL.md`。
- yss-ui 组件库仓库自身的提交与发版：使用 `../commit-linting/SKILL.md`。
- 仅请求代码实现，不涉及提交信息或 `git commit` 操作。
- 无代码改动，或改动内容与提交请求不匹配。
- 合并提交、发布提交、自动依赖机器人提交和数据库基线发布：遵循仓库专用流程，不套用本技能的常规模板。

## 硬约束（禁止/必须）

- 必须把仓库规则视为最高优先级：依次遵循 `AGENTS.md`、`CONTRIBUTING.md`、Git hooks、解析后的 commitlint 配置、本地配置和近期历史；通用规则只作回退。
- 只在用户明确要求提交时执行暂存和 `git commit`；若仅要求提交信息或审查，只输出候选消息与依据。
- 必须保留用户和他人的既有改动。禁止默认使用 `git add -A`、`git add .`、`git commit -a`、`--no-verify`，也不要自动 amend、rebase、push 或改写已发布历史。
- 提交必须是可独立理解、构建和回滚的逻辑变更。不要按 `controller/service/repository` 技术分层拆成无法工作的提交。
- 遇到密钥、令牌、私钥、证书、keystore、生产口令、`.env` 实值或意外大文件时停止提交并报告具体路径，不要在输出中泄露内容。
- 已有暂存内容视为用户选择，除非用户授权，不要擅自取消暂存或混入其他文件。
- 不提交 `target/`、`build/`、IDE 缓存、日志或本地运行产物。只提交项目本来就跟踪且由本次意图产生的生成源码。
- 已在共享环境执行的版本化数据库迁移（Flyway、Liquibase）通常不可重写；发现修改既有迁移时先报告风险。
- `fixup!` 只用于用户明确要求的评审或 autosquash 工作流；revert 优先使用 Git 生成的回滚信息并保留被回滚 SHA，不要把普通反向修改伪装成 revert。

## 工作流

### 1. 建立仓库契约

1. 确认仓库根目录、当前分支和工作树状态。
2. 搜索并读取仓库级说明、贡献指南、提交模板、commitlint 配置和 `commit-msg`、`pre-commit` hooks。
3. 读取根 `pom.xml`、`settings.gradle` 或 `settings.gradle.kts` 以及相关模块构建文件，确认 Maven `artifactId`、Gradle 子项目、服务和限界上下文。
4. 如果仓库使用 commitlint，优先使用本地依赖读取解析后的配置；不要为了校验联网安装依赖。没有 Node 工具时，直接读取 hook 和配置文件并按仓库命令验证。
5. 查看相关模块近期的非 merge 提交，了解仓库已经形成的 scope、工单 footer、DCO 和语言习惯，但不要复制历史中的明显错误。

### 2. 审查真实改动

至少检查：

```bash
git status --short --branch
git diff --cached --name-status
git diff --cached
git diff --name-status
git diff
git ls-files --others --exclude-standard
```

- 同时理解暂存区、未暂存区和未跟踪文件；结合 API、领域模型、持久化、配置和测试判断真实行为。
- 将同一业务能力所需的接口、应用服务、领域逻辑、持久化、迁移和测试作为候选原子单元，而不是按目录机械拆分。
- 检查 Flyway、Liquibase 等数据库变更是否触碰既有版本化迁移。
- 若无改动、改动与请求不符、多个逻辑变更无法安全拆分，先说明并停止。需要逐行拆分同一文件时，不要靠猜测改写暂存区。

### 3. 选择 type、scope 与正文

先读取 `./references/scope-and-examples.md`，再按「标准代码骨架」的格式生成。

- type 默认从 `feat/fix/docs/style/refactor/perf/test/chore/revert/build/ci` 中选择，但仓库枚举优先。
- scope 优先级为：仓库枚举 → Maven artifactId 或 Gradle 子项目 → 服务或限界上下文 → 跨模块能力。使用小写 kebab-case；不要仅使用 `controller`、`service`、`repository` 或类名。
- 标题使用英文 type/scope、ASCII `:` 和中文摘要；描述业务、调用方或运维可感知的结果，不写“修改代码”或单个 Java 类名。
- 默认将完整 header 控制在 72 个字符内；仓库存在更严格限制时服从仓库。标题末尾不加句号，不用 emoji 或全角冒号。
- 简单单文件变更可以没有 body；跨层实现、数据迁移、并发或事务修复、重要功能和行为变化使用 body 解释做了什么、为什么以及如何验证。
- REST/GraphQL/RPC 契约、事件格式、公共 Java API、配置语义或数据库兼容性发生真实破坏时，使用 `!` 和 `BREAKING CHANGE:` 并写迁移方式。
- 仅在已知编号或仓库要求时加入工单、DCO、`Signed-off-by` 等 footer，禁止编造；不要因为 Spring 项目采用 DCO 就推断所有 Java 项目都必须签署。

### 4. 验证并提交

1. 优先使用仓库 wrapper：Maven 使用 `./mvnw`，Gradle 使用 `./gradlew`；根据模块和变更运行已有的最小充分测试、编译、静态检查和格式检查。
2. 通过仓库已有命令校验完整候选消息。commitlint 存在时使用 stdin 校验 header、body 和 footer；退出码为 0 才继续。
3. 仅暂存属于当前原子提交的明确路径或安全 hunks，再重新检查 `git diff --cached --check`、`--name-status` 和完整 staged diff。
4. 执行正常 `git commit`，允许 hooks 运行。
5. hook 若格式化或修改文件，重新检查 staged 与 working tree，确认实际提交内容没有漂移。
6. 提交成功后检查 `git show --stat --oneline --decorate HEAD` 和 `git status --short`，向用户报告 commit hash、消息、已运行检查以及剩余未提交改动。

## 标准代码骨架

```text
type(scope)!: 中文行为摘要

- 说明关键行为或原因
- 说明兼容性、迁移、测试或必要约束

BREAKING CHANGE: 说明不兼容影响和迁移方式
Refs: 已知工单号
```

示例：

```text
fix(settlement): 修复重复回调导致结算流水重复入账的问题

- 使用业务幂等键拦截已处理回调
- 保留失败回调的可重试能力
```

## 交付检查清单

- [ ] type 与 scope 通过仓库校验规则，完整消息经仓库命令校验通过。
- [ ] scope 来自仓库枚举、构建模块或业务域，未使用 `controller`、`service`、`repository` 或类名兜底。
- [ ] 标题为英文 type/scope + ASCII 冒号 + 中文摘要，完整 header 不超过 72 字符。
- [ ] 提交可独立理解、构建和回滚；数据库迁移与对应实体、查询和测试同提交。
- [ ] 暂存区不包含 `target/`、`build/`、日志或本地运行产物。
- [ ] 已使用仓库 wrapper 运行与变更范围匹配的最小充分检查。
- [ ] 提交后已核对 `git show --stat` 与 `git status --short`，并向用户报告 hash 与剩余改动。

## 失败兜底策略

- 无法区分 `feat`、`fix`、`refactor` 时继续检查需求和行为；仍有高影响歧义则询问用户，不自动降级为 `chore`。
- hook 拒绝时按输出修正并重新校验，绝不使用 `--no-verify`。
- 仓库 parser 或 hook 不支持标准破坏性标记时，不要绕过校验或静默删掉标记；报告规则冲突，并采用仓库明确批准的兼容方案。
- 两个独立业务域或不同发布风险的改动无法安全拆分时，先给出拆分方案并停止；同一文件内无法分离时请求用户决定。
- 发现修改既有版本化迁移、密钥或意外大文件时停止提交，报告具体路径并等待用户处理。
