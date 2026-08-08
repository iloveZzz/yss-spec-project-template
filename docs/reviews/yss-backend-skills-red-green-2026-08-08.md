# YSS 后端 Skills RED / GREEN / REFACTOR 记录（2026-08-08）

## 范围

- 权威技能：`.agents/skills` 中用户确认的 12 个去重 YSS skills，以及本次入口 `grill-with-docs`。
- 源码基线：`yss-cloud-microservice` commit `0057b9bec6a54c7b98e3f889fd37afe15d6c0257`，工作树为 `clean`。
- 架构决策：新 DDD profile 为默认；legacy `core/client/repository` 只作为显式兼容 profile。

## RED

独立源码审计记录见 [yss-backend-skills-source-audit-2026-08-08.md](yss-backend-skills-source-audit-2026-08-08.md)。旧技能/生成器暴露的可复现失败包括：

1. `yss-web-controller` 将新增、更新、删除编译为 Controller 直连 Gateway，且请求体没有 `@Valid`。
2. `yss-log` 把只记录 DEBUG 入参与成功耗时的切面描述成异常日志能力。
3. `yss-userinfo` 把未验签 JWT payload 当作可信用户上下文，且没有提示 `userCode` header 条件反向缺陷。
4. `yss-audit-log` 要求按方法参数名排查 SpEL，但源码 context 只有 `参数审计` / `结果审计`。
5. `yss-security-algorithm` 未阻断硬编码 RSA 私钥、进程级 SM2/JWK 密钥和默认 `noop` 密码编码风险。
6. Application skill 指导用 `RuntimeException` 表示已知系统异常，与 `ExceptionFactory.sysException` 冲突。

GREEN 测试首次运行仍失败：生成的 Java 类名是 `QualityRulePageQuery`，文件名却保持 `QualityRulePage.java`，测试以 `StopIteration` 退出。这证明输出契约仍有遗漏。

## GREEN

- Controller 生成器默认注入 Application Service，写操作不再生成 Gateway 调用。
- 请求 DTO 加载 `@Valid`，validation namespace 由 `--validation-namespace=javax|jakarta` 决定。
- `PageQuery` 类名、文件名和 SKILL 输出约定一致。
- 组件 skills 明确当前源码能力、已知缺陷和安全阻断条件。
- Router backend contract 增加 `component_impacts`，并提供长尾组件的可执行路由闭包。
- 源码索引记录 commit/worktree state，commit 不匹配时标记 `stale` 并阻断精确实现指导。

验证：

```text
python3 .agents/skills/yss-web-controller/scripts/test_generate_controller.py
Ran 1 test ... OK

uv run --with pyyaml python .../skill-creator/scripts/quick_validate.py <skill>
14 个修改技能均返回 Skill is valid!
```

## REFACTOR

- GREEN 测试发现 PageQuery 文件名残余后，已统一生成文件名并复跑通过。
- 后端索引刷新增加 `YSS_REFRESH_FRONTEND=false`，避免只更新后端事实时制造前端时间戳噪声。
- 索引关键入口匹配补充 `Advice`，确保 `GlobalExceptionAdvice` 进入异常组件索引。
- `grill-with-docs` 移除非标准 frontmatter 字段，改用合法触发描述，并补充确认门槛和文档输出合同。

## 最终门禁结果

- 已执行 `scripts/sync-skills`、`scripts/update-skill-lock`，并通过各自的 `--check`；共享投影和 `skills-lock.json` 一致。
- 已执行 `scripts/verify-yss-router-scenarios`，Router 的 `component_impacts` 与技能依赖闭包场景通过。
- 已 fresh execution `scripts/verify-template`，退出码为 `0`，结果为“模板发布校验通过”。
- 已执行 `git diff --check`，未发现空白错误。

## 独立审查

独立 Reviewer 基于已读取的仓库状态与 diff stat 审查后，结论为“未发现可确认的 P0-P3 finding”。Reviewer 同时指出其未逐项内容级核验 Controller 生成器、Router `component_impacts`、source-index freshness 和投影测试，因此保留残余风险。

上述残余项已有本轮 fresh 自动化证据覆盖：Controller 生成器 smoke test、Router 场景验证、source-index commit/worktree freshness gate、共享投影与 lock 一致性检查、`scripts/verify-template` 全量门禁均通过。独立审查受本地 Codex CLI 插件认证和模型缓存告警影响，审查深度有限；发布前仍建议保留人工内容级 checkpoint。

## 本轮增量 RED / GREEN / REFACTOR（公开发布与生成器）

### RED

- `scripts/test-export-yss-skills.rb` 新增路径语义回归断言；基线导出复现了 `/absolute./path` 和 `YSS_SKILLS_ROOT=$YSS_SKILLS_ROOT`。
- 加入带引号的 `export YSS_SKILLS_ROOT="$YSS_SKILLS_ROOT"` 变体后再次复现同一问题，确认回归测试覆盖了 CLI 文档的实际写法。
- `yss-web-controller` 生成器测试新增 Controller 查询 DTO 导入断言；基线复现了导入不存在的 `*Page` 而实际文件为 `*PageQuery`。
- `yss-source-index` 未设置 `YSS_SKILLS_ROOT` 时的刷新基线把索引写进 `yss-source-index/yss-*`，并触发投影漂移。

### GREEN

- 导出器只转换独立的 `/path/` 占位符，不再改写 `/absolute/path/...`；刷新示例改为独立 `export` 变量。
- Controller 生成器导入 `${Domain}PageQuery`，新增回归测试通过。
- 源码索引默认根修正为共享 `.agents/skills`；以未设置环境变量的命令刷新 17 个后端索引，当前源码 HEAD 记录为 `a34644e2dfc4eb2bfa2b0a1c69dc6b61cc98539a`，工作树状态如实记录为 `dirty`。
- `yss-audit-log`、`yss-security-algorithm`、`yss-exception` 和 Application skill 增加当前源码缺陷的阻断 / 警告边界。

### REFACTOR / Fresh Verification

- 已执行 `ruby scripts/test-export-yss-skills.rb`：5 runs, 69 assertions, 0 failures。
- 已执行 `python3 .agents/skills/yss-web-controller/scripts/test_generate_controller.py`：1 test, OK。
- 已执行 `scripts/sync-skills`、`scripts/update-skill-lock` 和 `scripts/verify-template`：投影、锁文件、生命周期压力场景、Router/UI 场景及模板发布校验均通过。
- 已执行公开仓库 `scripts/export-yss-skills --check`、`npx --yes skills@latest add . --list` 和 `git diff --check`；公开仓库发现 46 个技能且无导出漂移。
- 公开 README 说明了 `skills@latest` 的单 Agent 自动检测、`--agent codex` 和 `--all` 的差异；`--agent '*'` 不再被描述为“检测到的 Agent”。
