# `create-yss-spec` 仓库身份与迁移契约

本文定义模板仓库与外部 `create-yss-spec` CLI 仓库之间的跨仓库发布契约。模板治理父 Ticket 为 [#24](https://github.com/iloveZzz/yss-spec-project-template/issues/24)，CLI 交接子 Ticket 为 [#26](https://github.com/iloveZzz/yss-spec-project-template/issues/26)。

## 契约目标

- 模板源仓库保留 `repository_mode: template-source`。
- CLI 创建的产品仓库必须写入 `repository_mode: project-instance`，不得原样保留模板源身份。
- 清单只包含 `schema_version` 与 `repository_mode`；项目名称、团队规模、Tracker 和实现仓库信息不得写入清单。
- CLI 初始化与升级后的落地文档正文以简体中文为标准语言。

## 初始化转换

CLI 从模板内容生成目标仓库时，必须在写入目标目录后、执行模板验证前完成以下转换：

1. 将根目录 `yss-project.yaml` 的 `repository_mode` 从 `template-source` 改为 `project-instance`。
2. 保持 `schema_version: 1`，拒绝未知 schema 版本或未知模式。
3. 保持 `.agents/skills` 为共享技能权威内容，并保留其他 Agent root 的生成投影与平台专属技能。
4. 执行目标仓库的 `scripts/sync-skills --check`、`scripts/update-skill-lock --check` 和 `scripts/verify-template`。

## 旧版升级转换

升级已有仓库时必须执行 `docs/user-guide/规格与任务迁移指南.md` 中的路径迁移，删除过时 skill 目录且不创建兼容别名。若目标路径已存在或旧、新资产内容冲突，CLI 必须停止并输出冲突清单，不得静默覆盖用户内容。

## 外部仓库验收测试

CLI 仓库至少补充以下集成场景：

1. 从当前模板初始化空目录，断言输出清单为 `project-instance` 且只含两个字段。
2. 断言初始化输出不存在过时 skill、旧模板路径和单数 Agent skill root。
3. 断言共享 skill 投影及 `skills-lock.json` 完整目录树哈希校验通过。
4. 用旧版 fixture 执行升级，断言 Spec / Ticket 新路径生效；存在内容冲突时 fail closed。
5. 在初始化后的仓库运行 `scripts/verify-template`，断言五类压力场景、Markdown 链接和 YAML 解析全部通过。

## 发布顺序

1. 模板仓库完成 fresh verification 与独立审查，形成待发布 commit / tag，但暂不声明整体可发布。
2. CLI 仓库按本契约实现身份转换与升级测试，并绑定模板的确定 commit / tag。
3. 两个仓库共同执行初始化和升级集成测试。
4. 先发布模板兼容版本或确定模板引用，再发布 CLI major 版本；最后同步父 Ticket、迁移说明和发布记录。

任一仓库未通过共同集成验证时，只能声明“本仓库实现完成，跨仓库发布受阻”，不得声明整体可发布。

## 当前责任边界

- 本仓库负责：清单 schema、流程事实源、迁移指南、skills 投影与锁定、模板验证脚本。
- `create-yss-spec` 仓库负责：初始化转换、升级转换、冲突处理、CLI 集成测试、CLI major 发布。
- 模板实现 PR：[#30](https://github.com/iloveZzz/yss-spec-project-template/pull/30)，修正 Ticket 目录、空 skill 锁登记和无 Git 初始化时的模板校验。
- CLI 实现 PR：[`create-yss-spec` #10](https://github.com/iloveZzz/create-yss-spec/pull/10)，实现身份转换、旧版迁移、fail closed、skill 投影复制和 `2.0.0` 版本准备。
- 共同验证：`YSS_SPEC_TEMPLATE_REF=codex/ticket-directory-contract npm test`，20/20 通过；生成实例执行 `scripts/verify-template` 通过；`npm pack --dry-run` 通过。
- 下一责任人：模板与 CLI 独立 reviewer；合并后由发布负责人绑定确定 commit / tag 重跑验证并确认 npm `2.0.0` 发布。
- 建议 skills：`cross-repo-implementation-routing`、`tdd`、`code-review`。

## 当前阻断条件

- 模板 PR #30 尚未独立 review 与合并。
- CLI PR #10 尚未独立 review 与合并。
- 当前共同测试绑定开发分支；合并后必须改绑确定 commit / tag 再执行 fresh verification。
- npm `2.0.0` 尚未获得发布确认，本轮不执行 npm 发布。
