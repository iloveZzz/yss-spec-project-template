---
name: skill-development
description: 在 yss-ui 仓库新建、修改或评审 packages/skills 官方 Skill，并修复 Skill description 触发冲突，覆盖分类配置、trigger eval、文档同步、安全扫描和 Skills changelog。
---

# YSS UI Skill 开发

## 触发条件

- 在 `packages/skills` 新建、修改、拆分、合并或废弃官方 Skill。
- 修复 Skill 触发冲突、错误代码骨架、断链、安全扫描或同步校验失败。
- 评审 YSS Skills 的描述、约束、评测和分发边界。

## 不适用场景

- 只使用已有 Skill 完成组件或业务页面开发。
- 只同步未变更的 Skills 到本机 IDE：使用仓库已有同步命令。
- 创建不属于 yss-ui 仓库的个人通用 Skill。

## 硬约束（禁止/必须）

- `packages/skills/*` 是唯一源码；禁止直接修改 `docs/skills`、`.agents/skills` 或其他 IDE 派生目录中的 YSS Skill。
- 新 Skill 名称必须使用小写 kebab-case，frontmatter 只能包含 `name` 和中文 `description`；description 必须写清真实任务和触发词，避免吸附普通开发请求。
- `SKILL.md` 必须包含触发条件、不适用场景、硬约束、标准代码骨架、交付检查清单和失败兜底策略，且不超过仓库校验允许的 500 行。
- 只写会改变 agent 决策的仓库知识；通用常识、重复规范、一次性故障细节和大段 API 手册不得堆进入口文件。
- 条件性细节放入 `references/`，可重复执行且需要确定性的操作才放入 `scripts/`，生成产物模板才放入 `assets/`；所有资源必须由 `SKILL.md` 明确路由。
- 每个 Skill 必须在 `skills.config.json` 分类。业务消费 Skill 是否进入默认同步由真实使用范围决定；维护者 Skill 放入 `library` 并加入 `excludeFromDefaultSync`。
- 每个 Skill 必须新增或更新 `evals/<skill-name>/trigger-cases.json`，至少包含真实正例和相邻 near-miss 负例；不得用无关负例制造虚假高分。
- 只有语义上刻意重叠的成对 Skill 才能加入碰撞白名单，必须说明原因；禁止用白名单掩盖宽泛 description。
- 示例中的组件、Hooks、Utils、Props、Events 与 Expose 必须从当前真实导出和文档核验；禁止复制旧项目代码后直接当成标准骨架。
- 新增脚本必须可在隔离目录验证，不得读取凭据、覆盖用户目录、执行远程脚本管道或隐含安装操作。
- Skill 变更必须同步 `docs/skills`，补充 `docs/changelog/skills.md` 的目标版本记录，并运行完整 Skills 门禁。

## 标准代码骨架

```text
packages/skills/example-skill/
├── SKILL.md
└── references/        # 仅在存在条件性详细资料时创建

packages/skills/evals/example-skill/
└── trigger-cases.json
```

```yaml
---
name: example-skill
description: 描述具体能力、仓库范围和真实触发场景。
---
```

最小验证链路：

```bash
pnpm sync:skills-docs
pnpm validate:skills
git diff --check
```

## 交付检查清单

- [ ] 名称、description、触发条件与不适用场景边界清晰。
- [ ] 内容只包含仓库特有且会改变决策的知识，没有无意义重复。
- [ ] 新增或修改的 references、scripts、examples 均有入口路由和真实用途。
- [ ] `skills.config.json` 分类、默认同步和排除范围正确。
- [ ] trigger eval 同时覆盖真实正例和相邻 near-miss。
- [ ] `docs/skills` 已由脚本同步，Skills changelog 已补目标版本。
- [ ] `pnpm validate:skills` 与 `git diff --check` 通过。

## 失败兜底策略

- 与已有 Skill 边界重叠时，先收窄 description 和职责；只有确实共享主入口/子能力关系时才建立路由，不直接复制内容。
- 触发评测失败时，检查真实用户措辞与相邻 Skill 的判别词；不得降低全局阈值或添加无依据白名单。
- 文档同步产生额外变化时，确认其都来自 `packages/skills` 当前源码；若出现手工派生改动，丢弃派生改动后重新同步。
- 安全扫描命中时先判断是否为必要示例；不能证明安全边界时删除危险模式，不以注释或编码方式规避扫描。
