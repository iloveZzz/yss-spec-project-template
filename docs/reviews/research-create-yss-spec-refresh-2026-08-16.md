# `create-yss-spec` 与 YSS 公开技能生态刷新研究

> 访问时间：2026-08-16 23:51（Asia/Shanghai）。
> 研究边界：只核对官方 GitHub、npm registry / tarball、当前仓库事实源，并在 `/tmp` 做只读 clone、打包检查和临时安装；未修改外部仓库，也未把 2026-08-10 研究直接当作当前事实。

## 结论先行

截至本次取证，2026-08-10 的三个主要 CLI 缺口已经实质修复：`.qoder` 投影进入 npm 包，`attach` / `sync` 已实现已知旧路径迁移和冲突 fail closed，`sync` 写入后会重新运行三项模板门禁并在失败时回滚。正式包也从浮动 `main` 改为绑定 40 位模板 commit 和快照 hash。CLI 默认固定快照的 fresh `npm test` 为 **28/28 通过**。

仍有两个跨仓库新鲜度缺口：

1. npm `latest` `2.1.3` 固定在模板 commit `41c68b5...`，而模板当前 `main` 已到 `5859e1e...`；固定快照提高了可复现性，但发布包不会自动包含 8 月 13 日之后的模板变化。按本仓库合同，新的模板 commit 仍应完成 CLI 集成验证后再发版，不能把“固定旧快照测试通过”解释为“当前模板 main 已兼容”。
2. 官方公开技能仓库当前能发现 **46** 个技能，而本地 [`yss-public-skills.json`](../../yss-public-skills.json) 冻结 **44** 个。44 个本地公开项都存在于远端，但远端还保留 `yss-domain-modeling` 和 `yss-openapi`；其中本地当前测试已明确把 `yss-openapi` 列为退休公开项。因此公开仓库不是当前 44 项清单的精确投影，需要重新导出、审查和发布。

## 一、当前可复核版本

| 对象 | 当前事实 | 一手证据 |
|---|---|---|
| `create-yss-spec` 默认分支 | `main` 当前 commit 为 `01fbcb2c927a0ef7912a6656960f09413f8eaecb`，提交信息 `fix: support ASCII locales during template verification` | [GitHub commit](https://github.com/iloveZzz/create-yss-spec/commit/01fbcb2c927a0ef7912a6656960f09413f8eaecb)、[GitHub commits API](https://api.github.com/repos/iloveZzz/create-yss-spec/commits/main) |
| npm `latest` | `create-yss-spec@2.1.3`，发布时间 `2026-08-14T06:24:59.711Z`，`gitHead` 正是 `01fbcb2...` | [npm registry 全量元数据](https://registry.npmjs.org/create-yss-spec)、[2.1.3 元数据](https://registry.npmjs.org/create-yss-spec/2.1.3) |
| npm tarball | `create-yss-spec-2.1.3.tgz`；registry `shasum` 为 `2e6461df8d25a54b266f5c3c3174953cb11967d9`，`integrity` 为 `sha512-/0gfygVyWg024tz8PVMoENbAIenmm6y/XUQPpN4ywcsUtJb8M0UtiQWNu/ITCXi8w0AZ1VebRHViro2c+e68IA==` | [官方 tarball](https://registry.npmjs.org/create-yss-spec/-/create-yss-spec-2.1.3.tgz)、[2.1.3 元数据](https://registry.npmjs.org/create-yss-spec/2.1.3) |
| npm 包绑定模板 | tarball 内 `template.snapshot.json` 的 `requestedRef` / `templateCommit` 都是 `41c68b545caaa439a999ec9d6786bf80a06c70ba`，`snapshotHash` 为 `8817d7689fe6ac5fff6c94ada86f7db25394133a7094108afefcde24fffcfaa5` | [模板固定 commit](https://github.com/iloveZzz/yss-spec-project-template/commit/41c68b545caaa439a999ec9d6786bf80a06c70ba)、[官方 tarball](https://registry.npmjs.org/create-yss-spec/-/create-yss-spec-2.1.3.tgz) |
| 模板当前默认分支 | `main` 当前 commit 为 `5859e1e5d54e41a7995e9c1eed0a6aeae3c62042`，提交信息 `feat: adopt YAML-first OpenAPI JSON governance` | [GitHub commit](https://github.com/iloveZzz/yss-spec-project-template/commit/5859e1e5d54e41a7995e9c1eed0a6aeae3c62042)、[GitHub commits API](https://api.github.com/repos/iloveZzz/yss-spec-project-template/commits/main) |

事实：CLI `package.json` 版本与 npm `latest` 均为 `2.1.3`；npm registry 的 `gitHead` 与 GitHub `main` 一致。[package.json](https://github.com/iloveZzz/create-yss-spec/blob/01fbcb2c927a0ef7912a6656960f09413f8eaecb/package.json#L1-L27)

推断：当前 GitHub `main` 与已发布 npm 包源码处于同一 CLI commit，但包内模板是发布时审查过的固定快照，并非模板仓库当前 `main`。这是可复现发布设计的结果，不是源码漂移；只有在使用者误把 `@latest` 等同于“模板 main 的实时内容”时才构成认知风险。

## 二、2026-08-10 缺口复核

### 1. `.qoder` 投影：已修复

当前 CLI 不再从 manifest 排除 `.qoder`；运行时投影根显式包含 `.qoder/skills`。[template.manifest.json](https://github.com/iloveZzz/create-yss-spec/blob/01fbcb2c927a0ef7912a6656960f09413f8eaecb/template.manifest.json#L1-L33)、[src/cli.js](https://github.com/iloveZzz/create-yss-spec/blob/01fbcb2c927a0ef7912a6656960f09413f8eaecb/src/cli.js#L27-L35)

从 npm `2.1.3` tarball 解包实测：`template/.qoder/skills/yss-product-lifecycle/SKILL.md` 存在，`.qoder/skills` 下有 101 个一级技能目录。CLI 测试也断言生成项目包含 `.qoder/skills/to-spec/SKILL.md` 和 `.qoder/skills/yss-product-lifecycle/SKILL.md`。[init-cli.test.js](https://github.com/iloveZzz/create-yss-spec/blob/01fbcb2c927a0ef7912a6656960f09413f8eaecb/tests/init-cli.test.js#L57-L166)

判定：2026-08-10 “manifest 排除 `.qoder` 导致 init 失败”已经修复。

### 2. 固定 commit / tag 发布：commit 已落实，tag 未见证据

CLI 同步脚本的默认模板引用已经固定为 `41c68b5...`，仍允许开发测试通过 `YSS_SPEC_TEMPLATE_REF` 覆盖；同步时 detach checkout，并把实际 commit 与 tree hash 写入快照 metadata。[sync-template.js](https://github.com/iloveZzz/create-yss-spec/blob/01fbcb2c927a0ef7912a6656960f09413f8eaecb/scripts/sync-template.js#L8-L16)、[sync-template.js](https://github.com/iloveZzz/create-yss-spec/blob/01fbcb2c927a0ef7912a6656960f09413f8eaecb/scripts/sync-template.js#L225-L254)

CLI 启动时强制快照包含 40 位 `templateCommit`、64 位 `snapshotHash`，并重算 bundled tree hash；不满足即 fail closed。[src/cli.js](https://github.com/iloveZzz/create-yss-spec/blob/01fbcb2c927a0ef7912a6656960f09413f8eaecb/src/cli.js#L57-L112)

本轮 `git ls-remote --tags` 对 CLI、模板和公开技能仓库均未返回 tag，GitHub Releases API 对公开技能仓库返回空数组。判定：**固定 commit 发布已完成；固定 tag / GitHub Release 没有当前一手证据**。这不阻断 commit-pinned 模式，但缺少人类可读发布锚点。

### 3. 迁移与 `attach`：已实现，且危险歧义 fail closed

源码已实现：

- `to-prd → to-spec`、`to-issues → to-tickets`，遍历 `.agents`、`.claude`、`.codex`、`.hermes`、`.pi`、`.qoder`、`.trae`；
- `prd-template.md → spec-template.md`、旧 vertical-slice 模板路径；
- `docs/requirements/issues → docs/requirements/tickets`、`*-prd.md → *-spec.md`、根 `.scratch/* → docs/.scratch/*`；
- 已存在且内容不同的目标进入 conflict；无法推断功能归属的扁平 Ticket 进入 unsafe，不允许 `--force` 绕过。

对应一手源码见 [src/cli.js](https://github.com/iloveZzz/create-yss-spec/blob/01fbcb2c927a0ef7912a6656960f09413f8eaecb/src/cli.js#L27-L46)、[迁移计划](https://github.com/iloveZzz/create-yss-spec/blob/01fbcb2c927a0ef7912a6656960f09413f8eaecb/src/cli.js#L721-L813) 与 [`attach` 阻断/事务](https://github.com/iloveZzz/create-yss-spec/blob/01fbcb2c927a0ef7912a6656960f09413f8eaecb/src/cli.js#L1522-L1606)。测试覆盖已知模板路径、issues 目录、冲突不覆盖、扁平 Ticket unsafe、备份和未受管文件保护。[init-cli.test.js](https://github.com/iloveZzz/create-yss-spec/blob/01fbcb2c927a0ef7912a6656960f09413f8eaecb/tests/init-cli.test.js#L828-L1028)

判定：2026-08-10 “README 声称迁移但源码/测试无实现”的缺口已修复。边界仍然成立：迁移只覆盖已编码规则；归属不明的旧资产必须人工整理，不能把“具备迁移能力”理解为任意旧项目自动升级。

### 4. `sync` 后 fresh verification 与回滚：已修复

`verifyGeneratedTemplate` 依次运行 `scripts/sync-skills --check`、`scripts/update-skill-lock --check`、`scripts/verify-template --check`。[src/cli.js](https://github.com/iloveZzz/create-yss-spec/blob/01fbcb2c927a0ef7912a6656960f09413f8eaecb/src/cli.js#L1083-L1107)

`sync` 在受管文件和迁移变更写入后、metadata 写入前执行该验证；验证或写入失败会执行事务 rollback，并保留临时备份路径。[src/cli.js](https://github.com/iloveZzz/create-yss-spec/blob/01fbcb2c927a0ef7912a6656960f09413f8eaecb/src/cli.js#L1622-L1686)。本仓库跨仓库合同也明确要求这三项门禁和固定 commit 集成测试。[implementation-repo-integration.md](../process/implementation-repo-integration.md#fresh-verification-与-checkpoint)

判定：2026-08-10 “sync 只做 hash 同步、结束后不 fresh verify”的缺口已修复。

## 三、Fresh verification 结果与限制

### 已实际执行

在临时 clone 的 CLI `01fbcb2...` 上执行默认固定模板 ref：

```bash
cd /tmp/yss-cli-refresh.uSVd7K/create-yss-spec
npm test
```

结果：`tests 28`、`pass 28`、`fail 0`、`duration_ms 299693.04775`。pretest 明确输出从 `yss-spec-project-template#41c68b5...` 同步模板快照。28 项覆盖 init、ASCII locale、身份 fail closed、`.qoder`、sync 更新/补回/跳过本地修改、attach、迁移冲突、备份、未受管文件保护、符号链接边界和快照 hash；测试列表可从官方 [`init-cli.test.js`](https://github.com/iloveZzz/create-yss-spec/blob/01fbcb2c927a0ef7912a6656960f09413f8eaecb/tests/init-cli.test.js) 与 [`sync-template.test.js`](https://github.com/iloveZzz/create-yss-spec/blob/01fbcb2c927a0ef7912a6656960f09413f8eaecb/tests/sync-template.test.js) 复核。

还执行了：

```bash
npm view create-yss-spec dist-tags versions time --json
npm view create-yss-spec@2.1.3 gitHead dist.tarball dist.shasum dist.integrity --json
npm pack create-yss-spec@2.1.3 --pack-destination /tmp/yss-cli-refresh.uSVd7K
```

### 未完成

未完成 `YSS_SPEC_TEMPLATE_REF=5859e1e... npm test`。第一次调用因命令工作目录误在 `/tmp`，npm 报 `ENOENT /private/tmp/package.json`，这不是 CLI 或模板测试失败；改正工作目录后的第二次调用按主控要求停止，以优先交付研究记录。因此当前模板 `main` 与 CLI `main` 的完整集成兼容性是 **未验证**，不能从默认固定快照 28/28 外推。

本轮也未执行 `npm pack --dry-run`（已直接下载并解包 registry 的真实 `2.1.3` tarball），未在解包后的 npm 包上另做一轮 init/attach/sync；这些仍属于发布前建议补齐的跨仓库验证，而非本记录已证明事项。

## 四、`yss-spec-dev-skills` 公开生态

### 当前默认分支与清单差异

官方仓库默认分支是 `main`，当前 commit 为 `e669478e6fd6d78617fe01bc0d92279e23f81d70`（`docs(install): 修正 Agent 自动检测安装说明`）。[GitHub 仓库 API](https://api.github.com/repos/iloveZzz/yss-spec-dev-skills)、[commit](https://github.com/iloveZzz/yss-spec-dev-skills/commit/e669478e6fd6d78617fe01bc0d92279e23f81d70)

对该 commit 的 `.yss-export-manifest.json` 与实际 `skills/*/SKILL.md` 统计均为 46 项；本地 `yss-public-skills.json` 为 44 项。集合比较结果：

- 本地 44 项全部存在于远端；
- 远端额外存在 `yss-domain-modeling`、`yss-openapi`；
- 目录 `yss-api-integration` 的 frontmatter 名为 `api-integration`，目录 `yss-microapp-commit` 的 frontmatter 名为 `microapp-commit`，因此 CLI `--list` 展示的是兼容名称，不是目录名。

一手清单见 [远端导出 manifest](https://github.com/iloveZzz/yss-spec-dev-skills/blob/e669478e6fd6d78617fe01bc0d92279e23f81d70/.yss-export-manifest.json)、[skills.sh 分组](https://github.com/iloveZzz/yss-spec-dev-skills/blob/e669478e6fd6d78617fe01bc0d92279e23f81d70/skills.sh.json) 与本地 [`yss-public-skills.json`](../../yss-public-skills.json)。本地导出测试把期望数固定为 44，并显式禁止再导出 `yss-openapi`。[test-export-yss-skills.rb](../../scripts/test-export-yss-skills.rb#L11-L47)

判定（事实）：远端是本地 44 项的超集，不是精确对齐。判定（推断）：公开发布投影至少落后于 2026-08-16 的本地 YAML-first OpenAPI 治理变化；`yss-domain-modeling` 是否应退休或重新纳入 44 项属于维护决策，不能仅凭差异自动删除。

### 可复核安装验证

在空临时目录使用 npm `skills@1.5.22` 实测：

```bash
npx --yes skills@latest add iloveZzz/yss-spec-dev-skills --list
npx --yes skills@latest add iloveZzz/yss-spec-dev-skills \
  --skill yss-validation --agent codex --yes
```

两条命令均 exit `0`。`--list` 输出 `Found 46 skills`；指定安装输出 `Installed 1 skill`，生成 `./.agents/skills/yss-validation/{SKILL.md,agents/openai.yaml,references/source-index.md}` 与 `skills-lock.json`。安装命令与官方 README 一致。[README](https://github.com/iloveZzz/yss-spec-dev-skills/blob/e669478e6fd6d78617fe01bc0d92279e23f81d70/README.md#L7-L31)

限制：生成的 `skills-lock.json` 记录 GitHub source、skillPath 与 computedHash，但不记录 `e669478...` commit；仓库也未发现 tag / GitHub Release。因而安装当前可复核、内容 hash 可记录，但默认分支安装不是 commit-pinned、跨时间不可完全复现。这是公开技能发布链仍需增强的点。

## 五、当前能力与优化建议

| 能力 | 当前状态 | 建议 |
|---|---|---|
| 可复现 CLI 发布 | 已有固定模板 commit、snapshot hash、npm integrity | 保持 commit-pinned；增加模板 tag / release note 作为人类可读锚点 |
| 初始化与六投影 | `.qoder` 已随六个共享投影进入真实 tarball | 发布前继续对真实 tarball 做六根 tree/hash 检查 |
| 已有项目接管 | `attach` 支持 dry-run、显式 apply、冲突阻断、备份与回滚 | 补真实历史仓库 fixture；不要扩大为猜测式迁移 |
| 持续同步 | managed baseline、局部更新、迁移、三门禁、失败回滚已具备 | 增加当前模板 `main` 固定 commit 的持续跨仓库 CI，避免只测发布内置旧快照 |
| 发布门禁 | 默认固定快照 fresh 测试 28/28 | 按跨仓库合同补 `npm pack --dry-run` 与解包后 init/attach/sync；记录两个仓库 commit 和独立审查 |
| 公开技能分发 | `skills` CLI 能发现 46 项并成功安装 | 先用当前 44 项重新导出并 PR；明确处置额外两项；发布后再做 `--list` / 安装 smoke test |
| 公开技能版本化 | 当前跟随 GitHub `main`，安装 lock 无 commit | 发布 tag 或 commit-pinned 安装指引；让 lock/发布 manifest 能追溯 export source commit |

## 六、相对 2026-08-10 的最终差距表

| 2026-08-10 缺口 | 2026-08-16 判定 |
|---|---|
| `.qoder` 被排除、init 失败 | **已修复并由 tarball + 28/28 测试验证** |
| npm `2.0.0` 过旧 | **已修复到 `2.1.3`**；但仍需对模板当前 `main` 重新集成验证后再发新版 |
| 模板引用浮动 `main` | **已修复为默认固定 commit**；没有 tag / Release 证据 |
| README 声称迁移但源码未实现 | **已修复**；已知迁移、conflict / unsafe 和回滚有源码与测试 |
| `sync` 后不重新验证 | **已修复**；三门禁在 metadata 前执行，失败事务回滚 |
| 发布包与当前模板同步 | **仍未完成当前性证明**；`2.1.3` 固定 `41c68b5...`，当前模板为 `5859e1e...`，本轮未跑完后者集成测试 |
| 公开技能清单一致性 | **新增/仍在缺口**；远端 46，本地允许 44，需重新导出发布 |
| 公开技能可复现安装 | **部分具备**；实际安装成功，但无 tag 且安装 lock 不记 commit |

## 实际命令摘要

```bash
git ls-remote https://github.com/iloveZzz/create-yss-spec.git refs/heads/main
git ls-remote https://github.com/iloveZzz/yss-spec-project-template.git refs/heads/main
git ls-remote https://github.com/iloveZzz/yss-spec-dev-skills.git refs/heads/main
npm view create-yss-spec dist-tags versions time --json
npm view create-yss-spec@2.1.3 gitHead dist.tarball dist.shasum dist.integrity --json
npm pack create-yss-spec@2.1.3 --pack-destination /tmp/yss-cli-refresh.uSVd7K
cd /tmp/yss-cli-refresh.uSVd7K/create-yss-spec && npm test
npx --yes skills@latest add iloveZzz/yss-spec-dev-skills --list
npx --yes skills@latest add iloveZzz/yss-spec-dev-skills --skill yss-validation --agent codex --yes
```

本记录是研究证据，不是模板、CLI 或公开技能仓库的发布批准，也不替代独立审查。
