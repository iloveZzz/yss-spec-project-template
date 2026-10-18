# Git 忽略与过程材料管理优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让非核心本地配置和仓内 worktree 被仓库规则稳定排除，同时保留用户文件、现行流程依据与必要工程证据。

**Architecture:** 复用根忽略文件的模板源专用区、现有留存政策和 Git 单文件索引操作；不新增工具或材料登记系统。用独立临时仓验证忽略语义，隔离本机全局规则与 `.git/info/exclude`，并检查受保护路径。

**Tech Stack:** Git、Node.js 标准库；现行 Node `>=22.13 <27`；Markdown。

**Spec:** [优化设计](../specs/2026-10-19-gitignore-hygiene-design.md)。执行者同时读取设计与本计划。

## Global Constraints

- 只修改当前模板仓的根 `.gitignore`、现有留存政策和单个本地配置的索引条目；不改 yss-cli、Profile 覆盖层、Bundle、CLI pin、分发清单或锁文件。
- 根 `.gitignore` 的 managed 区间逐字节保持不变；新增规则只放在 template-source 专用区。
- 保留工作区文件、原有暂存修改和其他未跟踪文档；不执行 reset、clean、restore、stash、强制移出索引或历史重写。
- 复用 Git 与 Node.js 标准库；Node 沿用现行 `>=22.13 <27`，不新增依赖、测试文件、CI 检查项、Schema、Ticket 或 checkpoint。
- 只核验当前改动及必要消费者，记录实际命令和未覆盖边界；不自动提交、推送、归档、发布或修改全局 Git 配置。

## Review Focus

1. 本机全局规则或本地 exclude 掩盖仓库缺项：独立临时仓的四个正向断言必须通过。
2. 相近路径被宽泛忽略：共享 hook、Skill 投影、现行文档与工程证据的七个反向断言必须保持不忽略。
3. 模板源规则泄漏到共同规则：源仓 `.work` 正向断言与共同规则片段的三个工作包断言分别通过；不把片段检查写成实际 Bundle 验收。
4. 本地配置存在工作区编辑或暂存编辑：工作区字节、权限保持不变；暂存编辑阻断移出操作。
5. 过程材料仍被引用：本轮索引变化只有指定配置；AR 文档、例外清单、工程证据和原有未跟踪文档保持原状。

---

## 文件结构与实施基线

| 路径 | 职责与动作 |
|---|---|
| `.gitignore:54-75` | 仅在模板源专用区增加设计第 2 节的四条规则 |
| `.codex/settings.local.json:1-3` | 只移出 Git 索引；工作区文件保留 |
| `.template-source/process/runtime-storage.md:5-17` | 在“产物与留存”后加入设计第 3 节的跟踪边界 |
| `tests/template-wiki-untracked.test.mjs` | 复用现有测试；不修改 |
| 本设计与本计划 | 记录实施进度、实际验证和未覆盖边界；不新增另一套记录 |

调研基线为 `e1337581036f55f66c00c7d40c042ad60f6c8190`，当时索引无差异，另有五份原有未跟踪 Superpowers 文档。实施时刷新基线；若目标文件或引用关系已变，先校正本计划，不能把调研结果当成当前通过。

维护强度按现行 `maintenance-intensity.yaml` 的 `local-rule` 归为 L2；不将本地规则变更谎报为纯文字修改。任务集中在同一组文件，建议 Native 执行，一个任务完成。

### Task 1: 补齐本地排除规则并收敛材料跟踪边界

**Files:**
- Modify: `.gitignore:54-75`
- Modify: `.template-source/process/runtime-storage.md:5-17`
- Index-only: `.codex/settings.local.json:1-3`
- Test: 本节的一次性 Git 探针、`tests/template-wiki-untracked.test.mjs`；不创建测试文件。

**Interfaces:**
- Consumes: 根 managed 区间、设计第 2 节四条路径、设计第 3 节材料分类、Git 当前索引与工作区状态。
- Produces: 四条可随仓库共享的 source-only 忽略规则；保留本机字节的未跟踪 Codex 配置；现有留存政策中的跟踪边界；本计划 AC1–AC6 的实际验证结果。
- 外部交付边界：共同规则片段与 Profile 源文件不变；不生成或认证新 Bundle。

- [x] **Step 1: 记录原始状态并确认保护边界**

在仓根执行 `git rev-parse HEAD`、`git status --short --untracked-files=all`、`git diff --cached --name-status`、`git ls-files --stage -- .codex/settings.local.json`。记录该文件工作区 SHA-256、权限、索引 mode/blob、完整已跟踪路径集合，以及根 managed 区间原字节；记录留在当前会话或现有仓外维护目录。若本配置已有暂存差异，暂停该路径的索引操作并保留阻断；不清理其他修改。

- [x] **Step 2: 运行失败探针，确认缺口来自仓库规则**

在仓根执行以下命令。只建立并清除本探针新建的系统临时仓，不写业务仓文件或索引。当前基线预期只有四个 source 本地路径失败；出现额外失败时先查明原因，不修改受保护路径或放宽断言。

```bash
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const rules = readFileSync('.gitignore', 'utf8');
const marker = '# <<< create-yss-spec managed rules';
assert.equal(rules.split(marker).length, 2, 'managed 区间结束标记必须唯一');
const base = mkdtempSync(path.join(tmpdir(), 'yss-ignore-probe-'));
const cases = [
  ['source', '.claude/settings.local.json', true],
  ['source', '.codex/settings.local.json', true],
  ['source', '.claude/worktrees/probe.md', true],
  ['source', '.worktrees/probe.md', true],
  ...['.codex/hooks.json', '.claude/settings.json', '.claude/skills/yss-product-lifecycle/SKILL.md',
      '.codegraph/.gitignore', '.template-source/contracts/architecture-iteration-v1-ar10-summary.md',
      '.template-spec/engineering/evidence/scaffold-3.2.0/ddd/startup.stdout.log',
      'docs/superpowers/plans/current-plan.md'].map(p => ['source', p, false]),
  ['source', '.work/task/spec.md', true],
  ['common', '.work/task/spec.md', false],
  ['common', '.work/task/verification/result.log', false],
  ['common', '.work/task/cache/result.json', true]
];
try {
  const empty = path.join(base, 'empty-ignore'); writeFileSync(empty, '');
  for (const scope of ['source', 'common']) {
    const dir = path.join(base, scope); mkdirSync(dir);
    const init = spawnSync('git', ['init', '-q', '--template=', dir], { encoding: 'utf8' });
    assert.equal(init.status, 0, init.stderr);
    writeFileSync(path.join(dir, '.gitignore'), scope === 'source' ? rules : rules.split(marker)[0] + marker + '\n');
  }
  const failures = [];
  for (const [scope, ref, ignored] of cases) {
    const result = spawnSync('git', ['-C', path.join(base, scope), '-c', 'core.excludesFile=' + empty,
      'check-ignore', '--no-index', '-q', '--', ref], { encoding: 'utf8' });
    if (result.status !== Number(!ignored)) failures.push(scope + ':' + ref + ' expected=' + Number(!ignored) + ' actual=' + result.status + ' ' + result.stderr);
  }
  assert.deepEqual(failures, []);
  console.log('PASS: ' + cases.length + ' Git ignore boundary checks');
} finally { rmSync(base, { recursive: true, force: true }); }
NODE
```

- [x] **Step 3: 修改两个事实源文件**

在根 `.gitignore` 的 `# Template-source only` 区域加入设计第 2 节原文四条规则及注释，保留 managed 区间和现有例外。在现有留存政策的“产物与留存”后增加“源码跟踪边界”短节，完整落实设计第 3 节五项分类；不复制整份运行存储政策，不忽略或移动 AR、Superpowers 与工程证据目录。

- [x] **Step 4: 仅将 Codex 本地配置移出索引**

先执行 `git diff --cached --quiet -- .codex/settings.local.json`，必须返回 0，并确认 Step 1 的该路径索引条目仍相同。然后执行 `git rm --cached -- .codex/settings.local.json`，禁止 `-f`。立即比较文件 SHA-256 与权限，必须与 Step 1 相同；若操作拒绝，保留原状，不通过删除文件或覆盖索引解决。

- [x] **Step 5: 运行相同探针及必要消费者检查**

重跑 Step 2，预期输出 `PASS: 15 Git ignore boundary checks`。执行 `node --test tests/template-wiki-untracked.test.mjs`，预期 2 项通过、0 项失败。运行 `scripts/verify-template-fast --plan --base e1337581036f55f66c00c7d40c042ad60f6c8190` 查看实际影响面；若 Step 1 已调整基线，使用对应完整 SHA。只补执行现行政策对本差异要求的必要消费者，记录命令及依据；不自动启动发布或全量回归。

- [x] **Step 6: 核验用户文件、索引与共同规则**

以 Step 1 为对照，确认已跟踪路径集合只减少 `.codex/settings.local.json`，其他索引差异未变；根 managed 区间原字节相同，Profile 覆盖层、分发清单、锁文件及现有材料没有本轮改动。Step 1 记录的全部原有未跟踪文档及执行期间并行新增的无关材料均保留。执行 `git diff --check` 与 `git diff --cached --check`，均应返回 0。

- [x] **Step 7: 留下可审阅差异和验证结果**

在本计划记录 AC1–AC6 对应的实际命令、结果及未覆盖项。没有独立的提交授权时，保留未提交差异与指定的索引删除，不提交、推送或发布；如用户另行授权提交，按现行 `yss git` 计划与提交流程处理。任务失败时保留证据和用户内容，只暂停受影响部分。

## 回滚与验收边界

回滚只撤销本轮新增忽略规则及政策短节，恢复 Step 1 记录的该文件单条索引 mode/blob；不覆盖工作区当前文件或其他索引项。未执行回滚时不宣称已验证恢复。

本轮不实施历史归档、批量停止跟踪、Git 历史瘦身、Profile/CLI 迁移、实际 Bundle 构建或跨平台验收。现有 60 份 specialist 工程日志虽然匹配通用忽略规则，仍是已跟踪证据；不把它们纳入移出范围。

## 编写时自检与实施记录

- 设计 AC1–AC6 分别落到 Step 2/5、Step 2/5、Step 6、Step 1/4/6、Step 3/6、Step 5/6。
- Review Focus 1–3 由 15 项探针覆盖；Focus 4 由索引前置与字节/权限比对覆盖；Focus 5 由路径集合与原差异比对覆盖。
- 2026-10-19 已执行的是当前缺口探针：退出码 1，仅四类新增规则断言失败；尚未实施优化，尚未运行实施后的 Wiki 测试或声明验收通过。
- 文档自检已核对本地引用、代码块、必需章节、一个任务与七个可核验步骤；确认本轮仅新增设计和计划，实施文件与索引保持原状。期间出现的其他并行新增文档已保留。
- 用户于 2026-10-19 明确要求使用 executing-plans 执行本计划，实施方式为 Native；不包含提交、合入、推送或发布授权。


## 实施结果（2026-10-19）

执行工作区：`/Users/zhudaoming/.codex/worktrees/gitignore-hygiene/yss-spec-project-template`，基线与 HEAD 均为 `e1337581036f55f66c00c7d40c042ad60f6c8190`；未提交。主工作区的索引和原有文档已核对保留。

发现的计划遗漏：指定配置移出索引后，原验证计划因 `UNKNOWN_VERIFICATION_PATH: .codex/settings.local.json` 拒绝。按根 AGENTS 的“未知路径先登记”要求，额外修改现有 `template-verification-profiles.yaml` 的两条精确输入/路由映射及 `tests/verification-selection.test.mjs` 的一个反例；不新增检查、选择器逻辑或测试文件。这是执行范围相对设计原三项范围的显式补充，不表示修改了原设计审阅时的字节或新增产品批准。

| 验收 | 实际结果 |
|---|---|
| AC1–AC3 | 相同 15 项探针先因四条规则缺失失败，实施后全部通过；共同规则原字节及受保护输入不变 |
| AC4 | 配置索引条目移出前的暂存与漂移检查通过；工作区文件 SHA-256 和权限 0644 保持不变；索引仅减少该路径 |
| AC5 | 现有留存政策已加入五项跟踪边界；原 AR 材料、兼容例外、工程证据及并行文档保留 |
| AC6 | Wiki、selection、hook 三文件定向测试 42/42；必要 fast 选集 14/14；工作区及索引 diff 空白检查均为 0 |

运行记录包含第一次计划编译拒绝及第一次缺少固定 CLI 路径的预检失败。随后复用本机已有、SHA-256 等于 pin 的二进制 `b2ef6280e566228a9ac23c77761a25c6be7b2ef531a87e9f8988c3acc8bf696d`，未重建、改动或安装 CLI。

本段依据已完成的定向与 fast 运行填写；记录收敛后的最终运行、独立复核及任何后续修复只保存在下列仓外台账，避免为更新结果反复改动被验证输入。

仓外证据：`/Users/zhudaoming/.yss-harness/runtime/e3cb0239a184ce7c14b631cd80cf9d32f1ed87696b80ceb1f9c4e7ade77193e4/maintenance/research/2026-10-19-gitignore-hygiene/`。其中 `progress.md` 为执行台账，`task-1-red.log` / `task-1-green.log` 为原探针，`routing-red.log` 为路径登记反例，`task-1-tests.log` 为 42 项定向结果，`preservation-check.json` 为文件保全结果，`fast-report-pinned/report.json` 为首次通过报告。

当前交付仅为本机必要验证的 `limited` 结果；未合入 main，未做历史归档、实际 Bundle 或跨平台验收。
