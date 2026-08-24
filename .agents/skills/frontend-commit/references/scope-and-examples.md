# 前端 Type、Scope 与示例

## 目录

- [规则优先级](#规则优先级)
- [Type 选择](#type-选择)
- [Scope 选择](#scope-选择)
- [原子提交边界](#原子提交边界)
- [消息示例](#消息示例)
- [前端验证](#前端验证)
- [规范依据](#规范依据)

## 规则优先级

1. 仓库 commitlint 的 resolved config 和 hooks。
2. 仓库 `AGENTS.md`、`CONTRIBUTING.md`、提交模板及明确文档。
3. 当前 monorepo 的包或应用名称，以及目标路径近期的有效提交。
4. 本参考的通用回退规则。

仓库允许空 scope 时仍优先使用能帮助团队定位业务影响的 scope；跨全仓且没有清晰主域时可以省略。只有 commitlint 明确支持且团队历史稳定使用时才采用多 scope。

## Type 选择

| Type | 使用条件 | 不要用于 |
|---|---|---|
| `feat` | 增加用户、调用方或运维人员可感知的能力 | 纯重构或依赖升级 |
| `fix` | 修复错误、回归、异常状态或不符合预期的行为 | 仅格式化代码 |
| `docs` | 只修改文档 | 代码行为变化 |
| `style` | 仅空格、格式、分号等，不改变语义 | UI 样式或视觉功能变更 |
| `refactor` | 不增功能、不修 bug 的结构调整 | 性能优化或行为修复 |
| `perf` | 有明确性能收益的代码变化 | 无证据的“优化”措辞 |
| `test` | 只增加或修正测试 | 功能代码及其配套测试 |
| `build` | 构建系统、外部依赖、打包或编译配置 | 一般业务配置 |
| `ci` | CI/CD 配置和流水线脚本 | 本地构建配置 |
| `chore` | 其他不改变产品行为的维护工作 | 无法理解改动时的兜底 |
| `revert` | 明确回滚一个或多个既有提交 | 普通修复 |

## Scope 选择

按以下顺序选择首个清晰候选：

1. **仓库限定值**：若 `scope-enum` 生效，只能使用允许值或按规则省略。
2. **monorepo 包或应用**：`apps/admin-portal` 使用 `admin-portal`；`packages/design-system` 使用 `design-system`。
3. **业务模块**：`views/DataPush`、相关 API、hook 和测试共同实现推送任务时使用 `data-push`，不使用 `views`。
4. **共享能力**：确实跨业务复用时使用 `auth`、`router`、`store`、`i18n`、`api-client`、`design-system` 等已有名称。
5. **工程边界**：依赖升级可用 `deps`，构建和 CI 可用 `build`、`ci`；scope 不应重复无意义信息。

命名使用小写 kebab-case。优先采用仓库或产品已有术语，不自行翻译稳定模块名。`components`、`hooks`、`utils`、`views`、`index` 和具体文件名通常信息不足，只有它们本身就是对外包或仓库既定 scope 时才使用。

## 原子提交边界

- 同一功能的页面、API 适配、状态逻辑、测试和最小测试配置可以同提交。
- `package.json` 与对应 lockfile 必须同提交；与业务功能无关的批量依赖升级单独使用 `build(deps)`。
- 生成 API 客户端和消费端若共同实现同一契约能力，可按业务域提交；无关的大规模重新生成必须拆分。
- 顺手格式化、调试日志、个人 IDE 配置和无关文件不要混入。
- 两个独立业务模块或不同发布风险的改动应拆分；同一文件内无法安全分离时先请求用户决定。

## 消息示例

```text
feat(data-push): 优化推送任务数据源与调度规则展示

- 将英文星期转换为中文调度描述
- 按数据源目录映射业务名称并补充单元测试
```

```text
fix(auth): 修复令牌刷新并发请求重复跳转登录的问题

- 复用进行中的刷新请求，避免多个失败响应重复触发跳转
- 保持刷新失败后的退出流程不变
```

```text
build(deps): 升级 Vue 与类型检查工具链
```

```text
feat(api-client)!: 统一分页响应字段命名

- 将列表响应统一为 items 和 total
- 更新调用方与契约测试

BREAKING CHANGE: 原 records 字段改为 items，所有自定义适配器需同步迁移
```

错误与修正：

| 错误 | 修正方向 |
|---|---|
| `fix：修复问题` | 使用 ASCII 冒号并说明具体行为 |
| `fixL 新增下载` | 选择合法 type，例如 `feat(download): 支持导出任务文件` |
| `fix: useDataPushTasks.ts` | 描述修复结果，而不是文件名 |
| `feat(views): 新增用户管理` | 优先使用 `feat(user-management): ...` |
| `chore: 修改代码` | 先理解真实意图，再选择准确 type 和摘要 |

## 前端验证

- 根据 lockfile 选择 `pnpm`、`npm`、`yarn` 或 `bun`，优先运行 `package.json` 已有脚本。
- 功能或修复至少运行相关测试；类型相关变更运行 type-check；lint、format 只使用不会意外重写无关文件的检查模式。
- monorepo 优先运行受影响包的过滤命令，除非仓库要求全量检查。
- 不把“hook 会跑”当作跳过必要验证的理由；也不要编造不存在的脚本。

## 规范依据

- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
- [commitlint：AI Agents](https://commitlint.js.org/guides/ai-agents.html)
- [commitlint 官方 committing-with-commitlint skill](https://github.com/conventional-changelog/commitlint/tree/master/skills/committing-with-commitlint)
- [Angular Commit Message Guidelines](https://github.com/angular/angular/blob/main/contributing-docs/commit-message-guidelines.md)
- [Git SubmittingPatches](https://git-scm.com/docs/SubmittingPatches)

