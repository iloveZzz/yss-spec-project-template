# Skills 维护说明

本文说明项目级 skills 的权威目录、投影方式、锁文件语义和升级验证。Agent 实际加载的入口仍是各目录中的 `SKILL.md`。

## 权威内容与投影

- `.agents/skills` 是跨 Agent 共享技能的唯一权威内容。
- `.claude/skills`、`.codex/skills`、`.hermes/skills`、`.pi/skills`、`.trae/skills` 中的同名共享技能是生成投影，不得分别手工修改。
- 只属于某个平台的 skill 继续保留在对应 root，并由 `skills-lock.json` 的 `platform` 分组记录。
- 共享技能投影可以是指向权威目录的符号链接，也可以是完整同步副本；`scripts/sync-skills --check` 会检查链接目标或完整目录哈希。

## 来源与锁定

| 来源 | 固定版本 / 路径 | 用途 |
|---|---|---|
| `mattpocock/skills` | `272f99b22574f50e4266791c86b9302682970e23` / `skills/engineering` | 通用工程流程 skills |
| `anthropics/knowledge-work-plugins` | `sales/skills/competitive-intelligence` | 竞品与市场事实研究 |
| 项目本地 | `.agents/skills` 或平台专属 root | YSS 适配与项目治理 skills |

`skills-lock.json` 是技能清单、来源、上游哈希、当前有效内容哈希和投影目标的权威记录：

- `upstreamHash`：能够追溯时记录未经项目适配的上游内容哈希。
- `effectiveHash`：当前实际生效的完整 skill 目录树哈希。
- `targets`：权威内容应投影到的 Agent roots。

项目允许按 YSS 流程适配上游 skill，但必须同时保留可追溯的上游信息和适配后的有效哈希。

## 维护流程

1. 在临时目录读取或下载锁定来源，不直接覆盖工作区。
2. 只在 `.agents/skills/<skill-name>/` 修改共享技能；平台专属技能只在所属 root 修改。
3. 修改流程型 skill 时按 `writing-skills` 记录 RED 基线、压力场景、GREEN 结果和 REFACTOR 检查。
4. 生成共享投影并更新锁文件：

   ```bash
   scripts/sync-skills
   scripts/update-skill-lock
   ```

   新增共享 skill 时先显式登记：`scripts/update-skill-lock --add=<skill-name>`；新增平台专属 skill 使用 `scripts/update-skill-lock --add-platform=<root>:<skill-name>`。脚本不会把工作区中偶然出现的未跟踪目录自动纳入发布清单。

5. 执行发布阻断校验：

   ```bash
   scripts/verify-template
   ```

6. 需要重新加载技能的客户端在变更落地后重启或刷新项目。

## 单独检查

```bash
scripts/sync-skills --check
scripts/update-skill-lock --check
```

前者检查所有共享投影是否指向或匹配权威内容，后者检查 `skills-lock.json` 是否与当前完整目录树一致。过时技能不会保留兼容别名；旧版项目按 `docs/user-guide/规格与任务迁移指南.md` 一次性迁移。

## 外部工作流工具

维护者可按需使用本机的 `gitlab-workflow`、`glab`、`gh` 或 `scripts/gitworks`。这些工具不是共享技能投影的一部分；平台选择与发布规则见 `docs/agents/issue-tracker.md`。
