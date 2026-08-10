# `create-yss-spec` 与当前模板初始化契约兼容性研究

> 访问时间：2026-08-10 16:22（Asia/Shanghai，GitHub / npm 一手来源）。
> 研究范围：只核对当前工作区模板与 `iloveZzz/create-yss-spec` 默认分支及 npm `latest` 发布包；本笔记之外未修改仓库文件。

## 结论先行

需要迭代，而且当前不是“只需重新发布 npm 包”的级别：`create-yss-spec` `main` 与当前模板 `main` 已出现可复现的初始化阻断。

- 现有 CLI 对 `yss-project.yaml` 的初始化转换已经覆盖当前契约：模板保留 `template-source`，生成实例改写为 `project-instance`，并严格要求 `schema_version: 1` 与两个字段。
- 但当前模板的 `skills-lock.json` / `scripts/sync-skills` 已加入 `.qoder/skills` 投影，CLI 的 `template.manifest.json` 仍排除整个 `.qoder`。新鲜集成测试实际得到 13 个测试 7 失败、6 通过；初始化失败在 `scripts/sync-skills --check`，大量报 `missing projection: .qoder/skills/...`。
- npm `create-yss-spec@2.0.0` 的发布时间是 2026-07-21，而模板 `main` 当前提交为 2026-08-10；已发布包是旧模板快照，不能代表当前模板。
- README 声称升级时会迁移 Spec / Ticket 旧路径、删除旧 skill 并在冲突时 fail closed，但当前 `src/cli.js` / `sync-template.js` 中未发现对应迁移逻辑；`sync` 实际是基于 `.yss-template.json` 的文件哈希同步。该声明与源码和测试不一致，应在发布前修复或降级为未支持能力。

## 证据与事实

### 1. 仓库身份与当前模板契约

本地事实：

- [`yss-project.yaml`](../../yss-project.yaml#L1) 当前为 `schema_version: 1`、`repository_mode: template-source`。
- [`docs/implementation/create-yss-spec-repository-mode-contract.md`](../implementation/create-yss-spec-repository-mode-contract.md) 明确要求 CLI 生成实例改写为 `project-instance`，保留 `.agents/skills` 权威内容和所有声明的投影，并在写入后执行 `scripts/sync-skills --check`、`scripts/update-skill-lock --check`、`scripts/verify-template`。
- 当前 [`skills-lock.json`](../../skills-lock.json#L1-L12) 为 v3，canonical root 是 `.agents/skills`，投影根包含 `.claude/skills`、`.codex/skills`、`.hermes/skills`、`.pi/skills`、`.qoder/skills`、`.trae/skills`。
- 当前 [`scripts/sync-skills`](../../scripts/sync-skills#L12-L19) 同样遍历上述六个投影根；本地执行 `scripts/sync-skills --check` 和 `scripts/update-skill-lock --check` 均通过。
- 当前模板 `main` 的最近提交是 [`a85560614536aa6fb20bbada91a08a1b89ea6e`](https://github.com/iloveZzz/yss-spec-project-template/commit/a85560614536aa6fb20bbada91a08a1b89ea6e)，提交信息为 `fix: unify local tracker artifacts under docs/.scratch`；其 [`AGENTS.md`](https://github.com/iloveZzz/yss-spec-project-template/blob/main/AGENTS.md#L80) 已把完整 Local Markdown 功能包定位到 `docs/.scratch/<feature>/`。

### 2. CLI 发布入口、模板来源与版本绑定

外部一手源码：

- [`package.json`](https://github.com/iloveZzz/create-yss-spec/blob/main/package.json#L1-L28) 当前 `version` 为 `2.0.0`；`files` 包含 `bin`、`src`、`template`、`template.manifest.json`；发布入口是 `bin.create-yss-spec: ./bin/create-yss-spec.js`；`prepack` 会执行 `node scripts/sync-template.js`。
- [`bin/create-yss-spec.js`](https://github.com/iloveZzz/create-yss-spec/blob/main/bin/create-yss-spec.js#L1-L10) 只负责把参数转交给 `src/cli.runCli`，没有另一个隐藏入口。
- [`scripts/sync-template.js`](https://github.com/iloveZzz/create-yss-spec/blob/main/scripts/sync-template.js#L7-L16) 的默认模板仓库固定为 `https://github.com/iloveZzz/yss-spec-project-template.git`，默认引用固定为 `main`；两者可分别由 `YSS_SPEC_TEMPLATE_REPO`、`YSS_SPEC_TEMPLATE_REF` 覆盖。
- 同一脚本 [`scripts/sync-template.js`](https://github.com/iloveZzz/create-yss-spec/blob/main/scripts/sync-template.js#L150-L166) 在打包前执行 `git clone --depth 1 --branch <ref>`，以 `git ls-files` 获取跟踪文件，把模板快照替换进 npm 包的 `template/`。因此：构建时依赖远程 Git、发布包运行时不再访问模板仓库；当前默认是浮动的 `main`，不是不可变 commit / tag。
- 该脚本会解析内部目录 symlink 并复制其目标文件到投影路径（[`scripts/sync-template.js`](https://github.com/iloveZzz/create-yss-spec/blob/main/scripts/sync-template.js#L34-L71)、[`#L73-L110`](https://github.com/iloveZzz/create-yss-spec/blob/main/scripts/sync-template.js#L73-L110)）。生成的实例因此得到物理文件树，不保留模板仓库中的 symlink 语义；后续由 `scripts/sync-skills` 按哈希检查 / 修复。
- CLI `main` 当前提交是 [`87cd7207e3e0d3b8dc29c0df2817d8bac7ff31ea`](https://github.com/iloveZzz/create-yss-spec/commit/87cd7207e3e0d3b8dc29c0df2817d8bac7ff31ea)，默认分支页面确认是 `main`：[`create-yss-spec`](https://github.com/iloveZzz/create-yss-spec/tree/main)。

npm 一手发布元数据：

- [`https://registry.npmjs.org/create-yss-spec`](https://registry.npmjs.org/create-yss-spec) 当前 `latest` 是 `2.0.0`，发布时间 `2026-07-21T04:04:14.128Z`，tarball 为 [`create-yss-spec-2.0.0.tgz`](https://registry.npmjs.org/create-yss-spec/-/create-yss-spec-2.0.0.tgz)。
- 对该 tarball 的只读核验显示包内仍有 `template/yss-project.yaml`，内容是 `repository_mode: template-source`；这不是错误，初始化阶段源码会再渲染为 `project-instance`。但包发布时间早于当前模板 `main`，所以 `npx create-yss-spec@latest` 当前不会得到 2026-08-10 模板快照。

### 3. 初始化实际复制、渲染和验证什么

依据 [`template.manifest.json`](https://github.com/iloveZzz/create-yss-spec/blob/main/template.manifest.json#L1-L33) 与 [`src/cli.js`](https://github.com/iloveZzz/create-yss-spec/blob/main/src/cli.js#L314-L373)：

- 从 npm 包内的 `template/` 递归复制文件；根排除项包括 `.git`、`.codegraph`、`.codebuddy`、`.idea`、`.uploads`、`node_modules`、`.qoder`、`.qwen`、`packages`；根排除文件包括 `package-lock.json`、`package.json`、`template.manifest.json`。
- 额外排除 `.claude/settings.local.json`、`.codex/hooks.json`、`.codex/settings.local.json`、`.codex/skills/.DS_Store`、`.pi/settings.json`。
- `AGENTS.md`、`README.md`、`yss-project.yaml` 是渲染文件；可选的 `docs/discovery/IDEATION.md` 由 `--include-example-docs` / `--no-example-docs` 控制。
- 初始化后写入 `.yss-template.json`，记录 CLI 包版本、模板来源、变量和受管文件 hash；它是后续 `sync` 的前置条件。
- `yss-project.yaml` 渲染逻辑见 [`src/cli.js`](https://github.com/iloveZzz/create-yss-spec/blob/main/src/cli.js#L194-L243)：只接受两个字段、`schema_version: 1`，要求源模式为 `template-source`，然后把它改写为 `project-instance`。
- 初始化写入完成后，CLI 依次执行 `scripts/sync-skills --check`、`scripts/update-skill-lock --check`、`scripts/verify-template --check`（[`src/cli.js`](https://github.com/iloveZzz/create-yss-spec/blob/main/src/cli.js#L483-L509)、[`#L749-L785`](https://github.com/iloveZzz/create-yss-spec/blob/main/src/cli.js#L749-L785)）。这使得遗漏的投影或过时锁文件会直接阻断初始化。

### 4. 覆盖、保留与 sync 行为

- 初始化目标不存在时创建目录；目标非空且未传 `--force` 时拒绝（[`src/cli.js`](https://github.com/iloveZzz/create-yss-spec/blob/main/src/cli.js#L385-L405)）。
- 传 `--force` 时会遍历并递归删除目标目录下的全部已有条目，再写入模板（[`src/cli.js`](https://github.com/iloveZzz/create-yss-spec/blob/main/src/cli.js#L407-L447)）。因此 `--force` 不保留用户文件，属于全量清空后初始化。
- `--dry-run` 只打印复制计划，不写入或删除目标目录。
- `sync` 只接受带 `.yss-template.json` 的受管实例；比较受管文件 hash，未被本地修改的文件可更新，缺失文件可补回；本地已修改文件跳过并报告，模板已删除文件只报告、不自动删除（[`src/cli.js`](https://github.com/iloveZzz/create-yss-spec/blob/main/src/cli.js#L535-L624)、[`#L626-L747`](https://github.com/iloveZzz/create-yss-spec/blob/main/src/cli.js#L626-L747)）。
- 事实：`runSync` 只调用 `syncTemplateInstance`（[`src/cli.js`](https://github.com/iloveZzz/create-yss-spec/blob/main/src/cli.js#L786-L797)），同步完成后没有再次执行三个模板验证脚本。

## 可复现兼容性核验

在临时目录 clone CLI `main`，设置 `YSS_SPEC_TEMPLATE_REPO=https://github.com/iloveZzz/yss-spec-project-template.git`、`YSS_SPEC_TEMPLATE_REF=main`，执行 `npm test`。结果：13 个测试中 6 个通过、7 个失败；所有失败的初始化路径均在 `生成项目校验失败：scripts/sync-skills` 阶段报告 `.qoder/skills/*` 缺失。

原因链是可直接对齐的：

1. 当前模板 [`skills-lock.json`](https://github.com/iloveZzz/yss-spec-project-template/blob/main/skills-lock.json#L5-L12) 与 [`scripts/sync-skills`](https://github.com/iloveZzz/yss-spec-project-template/blob/main/scripts/sync-skills#L12-L19) 都声明 `.qoder/skills`。
2. CLI 当前 [`template.manifest.json`](https://github.com/iloveZzz/create-yss-spec/blob/main/template.manifest.json#L2-L11) 排除 `.qoder`，所以打包快照和初始化目标都不会有该投影。
3. CLI 当前初始化测试只断言五个投影根 `.claude`、`.codex`、`.hermes`、`.pi`、`.trae`，没有 `.qoder`（[`tests/init-cli.test.js`](https://github.com/iloveZzz/create-yss-spec/blob/main/tests/init-cli.test.js#L58-L74)），与当前模板的六根投影契约已经漂移。

这是实测事实，不只是静态推断。

## 升级迁移核验

README 的声明与源码不一致：

- README 声称升级会迁移 Spec / Ticket 路径、删除 `to-prd` / `to-issues`，并在旧新资产冲突时 fail closed（[`README.md`](https://github.com/iloveZzz/create-yss-spec/blob/main/README.md#L27-L34)、[`#L47-L56`](https://github.com/iloveZzz/create-yss-spec/blob/main/README.md#L47-L56)）。
- 当前 `src/cli.js` 的 `sync` 实现只有受管文件 hash 分类、更新、跳过和删除差异报告；当前源码中没有 `to-prd`、`to-issues`、旧 Spec / Ticket 路径迁移函数或迁移目标冲突处理。
- 当前 [`tests/init-cli.test.js`](https://github.com/iloveZzz/create-yss-spec/blob/main/tests/init-cli.test.js) 与 [`tests/sync-template.test.js`](https://github.com/iloveZzz/create-yss-spec/blob/main/tests/sync-template.test.js) 覆盖身份转换、投影、哈希同步、跳过本地修改和 symlink 展开，但没有 README 所述旧路径迁移与迁移冲突测试。

结论：对已经由旧 CLI 初始化的实例，不能仅凭 README 断言 `sync` 会完成从旧路径到当前 `docs/.scratch/<feature>` 或其他新路径的迁移；这是高风险的未实现 / 未验证能力。该判断是“源码未发现 + 测试未覆盖”的推断，需维护者确认是否存在未检出的运行时模块；基于当前默认分支源码，未发现该模块。

## 差距矩阵

| 兼容点 | 当前模板契约 | CLI 当前实现 / 发布状态 | 判定 | 风险与建议 |
|---|---|---|---|---|
| `yss-project.yaml` 身份 | `template-source` 仅存在模板源；实例必须是 `project-instance` | 已严格校验并在初始化渲染转换 | 兼容 | 保留现实现；schema 或新增字段时必须同步 CLI，当前代码会 fail closed |
| `.qoder` 投影 | v3 lock 和 `sync-skills` 声明六个投影根 | manifest 排除 `.qoder`；初始化校验仍检查 lock 中的 `.qoder` | 不兼容（已实测） | 更新 manifest、测试、快照和发布包；或明确从模板契约中移除 `.qoder`，不能只改一边 |
| 共享 skill / 平台 skill | `.agents/skills` 权威内容，投影按 lock 管理 | 内部 symlink 会被展开为物理文件；旧五根快照可工作 | 部分兼容 | 重新打包后对每个 projection root 做 tree hash、`sync-skills --check`、`update-skill-lock --check` |
| 验证门禁 | 初始化后需执行三个检查；模板 `verify-template` 还含压力场景 | 初始化执行三个检查；`sync` 完成后不再执行检查 | 部分兼容 | `sync` 后补 fresh verification，或明确同步可能留下未验证状态 |
| 模板版本来源 | 当前模板 `main` 已在 2026-08-10 更新 | npm latest 仍为 2026-07-21 发布的 2.0.0 快照 | 不兼容 / 已过期 | 绑定已验证的模板 commit/tag，构建并发布新 CLI；不要仅依赖浮动 `main` |
| `docs/.scratch` 新路径 | 当前模板把 Local Markdown 功能包放在 `docs/.scratch/<feature>` | 已发布 2.0.0 快照早于该提交；当前 sync 源码无显式路径迁移 | 未完成 | 对旧实例补一次性迁移及冲突矩阵测试，或明确不支持旧实例迁移 |
| 非空目录与覆盖 | 初始化应避免误伤；`--force` 是显式破坏性操作 | 默认拒绝；`--force` 清空目标全部条目 | 行为明确但高风险 | README 和 CLI help 应明确“全量删除”；发布前增加用户确认 / 更强路径保护测试 |
| README 与实现一致性 | 文档应反映可验证能力 | README 宣称迁移与冲突 fail closed，但源码 / 测试未体现 | 不一致 | 在实现完成前修正文档，避免把未实现升级能力当成兼容承诺 |

## 迭代建议（仅研究结论，不在本轮实施）

1. 先修复 CLI 与当前模板的投影集合：将 `.qoder` 纳入生成快照并更新初始化断言，或者在模板侧回滚该投影；随后以当前模板 `main` 的确定 commit 做一次 fresh `npm test`。
2. 将 `YSS_SPEC_TEMPLATE_REF` 从发布流程中的默认浮动 `main` 改为已审查 commit / tag；环境变量保留给开发测试，不作为正式发布基线。
3. 选择并落实升级策略：实现 `docs/.scratch` 等旧路径的一次性迁移、目标已存在时冲突停止、旧 skill 删除与测试；或删除 README 中尚未实现的迁移承诺。
4. `sync` 完成后运行 `scripts/sync-skills --check`、`scripts/update-skill-lock --check`、`scripts/verify-template --check`，并将结果写进集成测试；同步不应只更新 hash 元数据。
5. 发布前核对 npm tarball 的实际内容，而不是只看 GitHub `main`：至少检查 `yss-project.yaml`、六个 projection roots、`skills-lock.json`、三个验证脚本、`docs` 新路径和 `.yss-template.json` 行为。

## 待验证问题

- `.qoder/skills` 是否是当前模板对所有实例的正式投影，还是只应在模板源仓库保留、由 CLI 有意排除？当前 lock / sync 脚本给出的事实是“正式声明”，但需要维护者确认产品决策。
- `docs/.scratch` 迁移的旧源路径、文件归属、已存在目标的冲突规则和删除规则是什么？当前模板文档已给出新目标路径，但 CLI 默认分支源码未给出迁移实现。
- 正式发布是否允许模板包跟随 `main`，还是必须由模板 tag / commit 驱动？当前 CLI 支持环境变量覆盖，但默认 `main` 仍会产生不可复现构建。
- 是否要求 `sync` 对没有 `.yss-template.json` 的旧实例提供 attach / migration 模式？当前实现直接拒绝缺少元数据的目录。
- 模板新增或变更验证脚本时，CLI 是否应从模板 manifest 动态发现门禁，而不是在 `src/cli.js` 固定三个脚本？

## 实际读取的源

### 本地源

- `/Users/zhudaoming/Projects/yss-spec-project-template/yss-project.yaml`
- `/Users/zhudaoming/Projects/yss-spec-project-template/CONTEXT.md`
- `/Users/zhudaoming/Projects/yss-spec-project-template/docs/implementation/create-yss-spec-repository-mode-contract.md`
- `/Users/zhudaoming/Projects/yss-spec-project-template/AGENTS.md`
- `/Users/zhudaoming/Projects/yss-spec-project-template/skills-lock.json`
- `/Users/zhudaoming/Projects/yss-spec-project-template/scripts/sync-skills`
- `/Users/zhudaoming/Projects/yss-spec-project-template/scripts/update-skill-lock`
- `/Users/zhudaoming/Projects/yss-spec-project-template/scripts/verify-template`

### 外部一手源

- [`create-yss-spec` GitHub 默认分支](https://github.com/iloveZzz/create-yss-spec/tree/main)
- [`README.md`](https://github.com/iloveZzz/create-yss-spec/blob/main/README.md)
- [`package.json`](https://github.com/iloveZzz/create-yss-spec/blob/main/package.json)
- [`bin/create-yss-spec.js`](https://github.com/iloveZzz/create-yss-spec/blob/main/bin/create-yss-spec.js)
- [`src/cli.js`](https://github.com/iloveZzz/create-yss-spec/blob/main/src/cli.js)
- [`scripts/sync-template.js`](https://github.com/iloveZzz/create-yss-spec/blob/main/scripts/sync-template.js)
- [`template.manifest.json`](https://github.com/iloveZzz/create-yss-spec/blob/main/template.manifest.json)
- [`tests/init-cli.test.js`](https://github.com/iloveZzz/create-yss-spec/blob/main/tests/init-cli.test.js)
- [`tests/sync-template.test.js`](https://github.com/iloveZzz/create-yss-spec/blob/main/tests/sync-template.test.js)
- [`npm registry metadata`](https://registry.npmjs.org/create-yss-spec)
- [`npm 2.0.0 tarball`](https://registry.npmjs.org/create-yss-spec/-/create-yss-spec-2.0.0.tgz)
- [`yss-spec-project-template` 当前 `main` 的 `AGENTS.md`](https://github.com/iloveZzz/yss-spec-project-template/blob/main/AGENTS.md)
- [`yss-spec-project-template` 当前 `main` 的 `skills-lock.json`](https://github.com/iloveZzz/yss-spec-project-template/blob/main/skills-lock.json)
- [`yss-spec-project-template` 当前 `main` 的 `scripts/sync-skills`](https://github.com/iloveZzz/yss-spec-project-template/blob/main/scripts/sync-skills)
