# Matt skills 1.3.2 复审修订 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 用户此前选择 `superpowers:executing-plans`，本计划沿用主执行者顺序实施；仓库约束优先，不推导强制 TDD、逐任务审查或自动提交。

**Goal:** 修复复审识别的两项 P2 方法缺口和一项 P3 重复确认问题，并补充现有 GitHub 关系命令示例与 PR/复盘发现描述。

**Architecture:** 在五个现有技能内补齐判断规则，同任务同步共享副本和 Backend 有效内容。复用既有标签、tracker 字段、平台元数据和哈希规则，不增加技能入口、跨技能依赖或执行框架。

**Tech Stack:** Markdown、YAML、JSON、Git、Node 标准库、已安装 `gh`/`glab` 的只读帮助。

**Spec:** [已批准的适配设计](2026-10-31-matt-skills-convergence-design.md) 第 5.4、5.5、6、7、8、9 节，以及下文“本次修订依据”。[前次实施计划](2026-10-31-matt-skills-convergence-plan.md) 仅用于了解已完成工作，不重跑其 11 项任务。

**Status:** 用户已批准执行；四项任务及收尾核对已完成；独立只读审查 Critical 0 / Important 0 / Minor 0。未提交或发布。计划沿用本轮 `.template-source/design` 存放位置，默认 `docs/superpowers/plans` 在本仓被忽略。

## Global Constraints

- 本次工作目录为 `/Users/zhudaoming/.codex/worktrees/matt-skills-convergence/yss-spec-project-template`，分支 `codex/matt-skills-convergence`；在当前未提交适配之上修订，不切回原仓或用 HEAD 覆盖已有结果。
- 前次计划约束：“共享技能入口集合保持 62 个，默认安装集合、公开技能名单和现有显式调用政策不扩大。”Backend 当前 61 个技能也保持不变。
- 原设计：“不自动复制整段会话，也不只发送缺少范围和约束的裸路径。”独立上下文规则仅作用于已授权、实际需要且宿主支持的委派。
- 原设计：“用户明确指定的新目标可在本次授权中使用，并明确与已存配置的差异”；只暂停存在实际定位歧义的部分。
- 前次计划约束：“不恢复阶段门禁、批准包、常驻采集、脚本、测试套件或 CI”；本文核对仅服务于本次修订，不新增长期测试或维护脚本。
- 保留 `sourceRevision`、`upstreamHash`、targets、许可证和调用政策。Matt 原始来源仍为 `0ab1b63a410a03d3627979a109c8695de27af954`，比较基线仍为 `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d`（1.3.2）。
- 不修改 `yss-cli`、用户安装实例、业务词汇、持久 tracker 目标、默认技能列表或全局插件；不创建远程标签、票据、评论或关系。
- 提交、推送、发布和其他外部写入沿用各自动作的真实授权。本计划没有提供这些动作的授权，不安排自动 commit 步骤。
- 文本核对、帮助输出、实际 Agent 行为和平台运行结果分别报告；不把静态检查称为端到端通过。

## Review Focus

| 输入或条件 | 预期行为 | 场景归属 |
|---|---|---|
| 直接进入审查/提问/研究分支，没有先读 implement；宿主不能提供独立子代理 | 不继承完整会话；最小任务说明足够；能力不足顺序完成 | S1，任务 1 |
| 已有票的正文不能反映类型，或类型缺失/冲突；远程原生 Issue Type 与方法类型并存 | 读取明确的 wayfinder 标签映射或本地 Type，不重新猜测、不混淆字段 | S2，任务 2 |
| 默认仓库 A，当前明确 URL 指向 B；或只有多目标中的裸编号 | 明确 URL 用于本次请求且不改配置；有歧义才询问；只读无写入 | S3，任务 3 |
| gh 缺少某参数、服务端关系不支持、数据库 ID 与 issue number 不同 | 先读帮助，选受支持 API；正确使用数据库 ID；权限失败不伪装成能力缺失 | S4，任务 2 |
| PR/复盘请求、纯代码请求、用户禁用技能；两种安装方式与平台副本 | 写作入口可发现且不扩大触发；副本、元数据、哈希和既有策略一致 | S5，任务 4 |

每个场景在所属任务中给出具体输入和观察点；只做文本推演时明确标注，不把预期输出当实际 Agent 轨迹。

---

## 本次修订依据

| 编号 | 已定位问题或建议 | 本轮决定 |
|---|---|---|
| R1 / P2 | `code-review/references/review-axis-checklists.md:3`、`grilling/SKILL.md:26`、`wayfinder/references/ticket-types.md:5` 存在委派入口，但未要求独立上下文 | 三处各补最小完整规则，不新增共享框架或依赖另一个技能入口 |
| R2 / P2 | `wayfinder/references/work-map.md:8` 只说按问题类型；远程种子未定义子票方法类型的保存与恢复 | 打通创建、保存、读取与分支选择；沿用四种类型 |
| R3 / P3 | GitHub 种子及配置决定无条件要求澄清 URL 与已有配置的差异 | 当前明确目标用于本次动作；持久配置保持不变，实际歧义才询问 |
| O1 / 可选优化 | GitHub 原生关系主要描述 API 原则，缺少简短 CLI 示例 | 推荐纳入任务 2；只补已核对帮助的现有命令，不新增封装 |
| O2 / 可选优化 | `i-have-adhd` 正文含 PR/复盘方法，发现描述没有明确表达 | 推荐纳入任务 4；只调整描述与对应 Codex 显示元数据 |

O1、O2 是此次计划建议范围，可分别省略；R1—R3 不依赖它们。上游依据为固定比较版本的 [code-review](https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/code-review/SKILL.md)、[wayfinder](https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/wayfinder/SKILL.md)、[GitHub tracker](https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/setup-matt-pocock-skills/issue-tracker-github.md)。这些资料不是本仓动作授权。

## 文件职责与同步范围

以下路径相对上述工作目录。`S` 仅为 `.agents/skills` 的路径缩写。

| 内容源 | 职责与改动范围 |
|---|---|
| `S/code-review/references/review-axis-checklists.md`、`S/grilling/SKILL.md`、`S/wayfinder/references/ticket-types.md` | 实际委派入口的上下文和权限要求 |
| `S/wayfinder/references/{map-format,chart-map,work-map,ticket-types}.md` | 四种类型的保存、恢复、缺口处理和选路 |
| `S/setup-matt-pocock-skills/issue-tracker-{github,gitlab,local}.md` | 对应平台的类型载体、明确目标和受支持关系操作 |
| `S/setup-matt-pocock-skills/references/configuration-decisions.md` | 当前目标与持久配置的优先级 |
| `.template-spec/agents/issue-tracker.md` 及 Backend 同路径 | 当前配置说明与种子一致；frontmatter 不变 |
| `S/i-have-adhd/SKILL.md`、`S/i-have-adhd/agents/openai.yaml` | PR/MR 与复盘的发现描述；不修改正文方法和调用政策 |
| `.template-spec/agents/matt-skills-adaptation.md` 及 Backend 同路径 | 记录实际修订结果，关闭已修复的 P3 说明，保留未验证范围 |
| `profiles/backend/skills-lock.json` | 更新五个受影响技能的 `skills.shared.<id>.effectiveHash` |

每项任务只同步自己的改动：

1. 源文件对应到 `.workbuddy/skills/<id>/<相对路径>` 及 `profiles/backend/.workbuddy/skills/<id>/<相对路径>`，保持字节与文件权限一致。上述五个技能当前均无 Backend 专有覆盖；执行时复核，若出现新覆盖则按实际有效内容处理，不能覆盖他人工作。
2. 根 `.claude/skills/<id>` 保持指向共享源的符号链接。Backend 当前 targets 没有 Claude，不补建 Backend Claude 目录或新的 `.agents` 覆盖。
3. 按[维护说明](../agents/skills-maintenance.md)重算本任务涉及的 Backend 有效树哈希。根锁没有 `effectiveHash`，不补字段；`sourceRevision`、`upstreamHash` 不改。
4. 两份来源说明同步。两份 registry 与 bundle 只读核对：本计划不新增引用、技能或资源，不应产生清单改动。任务 4 允许变化的是描述字段，保留 `allow_implicit_invocation: true` 和 `lifecycle-document-output` 及现有排除条件。

## 任务 1：补齐三个委派入口的独立上下文规则

**Files:** 修改 `S/code-review/references/review-axis-checklists.md`、`S/grilling/SKILL.md`、`S/wayfinder/references/ticket-types.md`；同步三者对应副本及 Backend 锁的 `code-review`、`grilling`、`wayfinder` 条目。

**Interfaces:** 消费当前任务授权、宿主委派能力和实际来源；产出独立任务说明，必须含目标、完成条件、权限、负责路径、来源/版本、输出与限制。当前 Codex API 支持时指定 `fork_turns: "none"`；不假定其他宿主接受同名参数。

- [x] **Step 1：定位当前缺口。** 读取三个实际委派分支及 `S/implement/SKILL.md:15` 的既有约定，确认每个分支独立加载时能否得到完整规则；记录缺失项，不改 implement。
- [x] **Step 2：补规则。** 每个分支各补一段短说明，保留“授权、必要、宿主支持”条件；指针不可读时补最小必要原文或顺序处理，不复制完整会话。审查保持只读；其他分支不得借委派扩大写入范围，有写入时说明共享代码库和路径责任。
- [x] **Step 3：核对 S1。** 分别使用“只读审查，允许独立检查”“澄清方案时独立调查环境事实”“决策票独立研究”三种输入；独立任务说明应包含 Interfaces 中各项，不携带主会话预设结论。再核对无子代理能力、来源指针不可读和未授权委派三个反例：顺序处理或补事实，不停掉独立可做工作，也不擅自派发。
- [x] **Step 4：同步并检查。** 完成共同同步；运行下文结构核对命令，参数为 `code-review grilling wayfinder`，预期 `PASS: code-review, grilling, wayfinder`。记录 S1 是文本核对还是实际运行观察。

## 任务 2：按保存类型恢复决策票，补齐关系操作示例

**Files:** 修改 `S/wayfinder/references/{map-format,chart-map,work-map,ticket-types}.md` 与 `S/setup-matt-pocock-skills/issue-tracker-{github,gitlab,local}.md`；同步对应副本及 Backend 锁的 `wayfinder`、`setup-matt-pocock-skills` 条目。

**Interfaces:** 消费任务 1 的委派规则、实际票据及所选 tracker；产出唯一明确的方法类型 `research | prototype | grilling | task`，供当前票据处理使用。GitHub/GitLab 沿用明确的既有映射，新约定使用 `wayfinder:<type>` 标签；Local Markdown 使用已有 `Type:`。这不是 GitHub 原生 Issue Type，也不是 triage 分类或执行授权。

- [x] **Step 1：固定读取规则。** 在地图格式和推进地图写明：恢复时先读取已保存类型，再选择方法，不能只按正文重新分类；缺失时可使用用户已明确的本次类型。多个冲突类型或仍无法确定时仅澄清相关选择，独立事实调查可继续。明确的本次纠正只作用于本次，持久标签修改仍需授权。
- [x] **Step 2：补齐保存和平台说明。** 建立地图及三种 tracker 文档采用同一类型约定；新增票取得真实 ID 后，在授权范围保存类型和关系。沿用已有映射；无标签创建权限时说明未保存，不声称标签已创建，不向 triage 表增加 ready 类状态。保留任务 1 的独立上下文规则。
- [x] **Step 3：落实 O1。** 运行 `gh --version`、`gh issue create --help`、`gh issue edit --help`。当前预期支持 `--parent`、`--add-sub-issue`、`--add-blocked-by`；在 GitHub 种子补显式 `--repo OWNER/REPO` 的最小示例，如 `gh issue edit PARENT --repo OWNER/REPO --add-sub-issue CHILD` 和 `gh issue edit CHILD --repo OWNER/REPO --add-blocked-by BLOCKER`。企业实例用 `HOST/OWNER/REPO`。帮助不支持时保留已支持的 API 路径；API 参数分别是 `sub_issue_id`、`issue_id`，取真实数据库 `id`，不用界面 number/node_id。示例只写文档，不执行远程关系写入。
- [x] **Step 4：核对 S2、S4。** 对正文同为“失败重试应该怎样处理？”的票，分别赋予 `wayfinder:prototype`、`wayfinder:grilling`、本地 `Type: research`，预期按保存类型进入对应方法。再核对无类型、两个冲突类型及 GitHub 原生 Type=Task 的情况，不能静默猜测或混用。关系示例核对参数支持、显式目标、ID 类型；服务端能力不足才考虑文本回退，鉴权失败或超时保持缺口，不推断原生关系不存在。
- [x] **Step 5：同步并检查。** 完成共同同步；结构核对参数为 `wayfinder setup-matt-pocock-skills`，预期对应两项 PASS。单独报告 CLI 帮助结果、文本场景结果和未验证的服务端写入。

## 任务 3：消除明确目标的重复确认

**Files:** 修改 `S/setup-matt-pocock-skills/issue-tracker-github.md`、`issue-tracker-gitlab.md`、`references/configuration-decisions.md`；根及 Backend `.template-spec/agents/issue-tracker.md`、`.template-spec/agents/matt-skills-adaptation.md`；同步技能副本及 Backend 锁的 `setup-matt-pocock-skills` 条目。

**Interfaces:** 消费用户当前明确对象、已存 `tracker` 配置和动作授权；产出本次动作的确定目标。无明确当前目标时沿用配置；配置不能覆盖明确请求，当前请求也不自动改写持久配置。

- [x] **Step 1：统一优先级表述。** 修改配置决定和两个远程种子：明确 URL 或明确仓库/实例用于本次任务，说明与配置的差异即可；多个候选仍无法确定时才询问。访问失败不回退到默认仓库，不把失败当不存在；授权仍限定原请求动作。
- [x] **Step 2：同步当前配置说明。** 根与 Backend 的 issue-tracker 正文使用相同原则，保留各自 frontmatter 原字节；不更改 `.work`、平台、账号或目标。读取 setup 入口和 implement 的 Ticket 规则，确认无需额外修改即可消费此约定。
- [x] **Step 3：核对 S3。** 输入“默认 A，但只读分析明确的 B Issue URL”：直接定位 B，无确认、配置写入或远程写入。输入“处理 #42”，且目标确有多个无法消歧候选：只询问定位。输入“B 无访问权限”：报告访问缺口，不能去 A 找同号票。明确 GitLab host/project 时行为一致。
- [x] **Step 4：更新实际记录并同步。** 在 S3 核对后，将来源说明中的“已知 P3 留待后续”改为本次实际修订与验证范围，保留历史发生事实；两份说明字节相同。完成共同同步，结构核对参数为 `setup-matt-pocock-skills`，预期 PASS；确认两份 tracker frontmatter 与本轮开始前一致。

## 任务 4：让 PR/复盘方法在发现描述中可见

**Files:** 修改 `S/i-have-adhd/SKILL.md` 的 description、`S/i-have-adhd/agents/openai.yaml` 的 `interface.short_description` 与 `interface.default_prompt`；同步对应副本及 Backend 锁的 `i-have-adhd` 条目。两份 registry 只读核对。

**Interfaces:** 消费现有 `references/pr-and-retro.md` 和文档触发范围；产出涵盖普通研发文档、PR/MR 描述与复盘的发现文本。名称、display_name、`allow_implicit_invocation: true`、`lifecycle-document-output` 与现有排除项不变。

- [x] **Step 1：调整发现描述。** description 明确包含“PR/MR 描述、复盘”，保留当前研发文档范围；short_description 与 default_prompt 同步表达该用途。正文第 9、13 行已经提供方法指针和触发约束，不重复扩写方法。
- [x] **Step 2：核对 S5。** “为这次改动写 PR 描述”“复盘刚才的返工”能从发现文本定位技能内方法；“只修这行代码”“执行命令”“本次不使用此技能”仍遵循现有排除或用户决定。写描述不能推导创建 PR、评论、提交或发布授权。
- [x] **Step 3：同步元数据和哈希。** 共享源、根 WorkBuddy、Backend WorkBuddy 的改动字段一致，调用政策保持不变；完成共同同步。禁止直接使用前轮临时 verify.py 判断本项，因为它要求 Backend agents 元数据始终等于旧 HEAD，会将本次预期变动误判为失败。
- [x] **Step 4：完成结构核对。** 下文命令参数为 `i-have-adhd`，预期 PASS；确认 registry 和 bundle 没有产生改动。这里只证明描述、文件与策略一致，宿主目录发现及实际触发未观察时明确写未验证。

## 结构核对命令

各任务在仓库根运行，将命令首行的技能参数替换为该任务列出的集合。它只读文件、比较副本并复算已有哈希，不修改锁；哈希更新按维护说明完成。检查代码随本计划保存在源维护文档中，不安装为脚本或测试套件。

```bash
node --input-type=module - code-review grilling wayfinder setup-matt-pocock-skills i-have-adhd <<'JS'
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const ids = process.argv.slice(2);
const lock = JSON.parse(fs.readFileSync('profiles/backend/skills-lock.json', 'utf8')).skills.shared;
function files(root, rel = '') {
  return fs.readdirSync(path.join(root, rel), {withFileTypes: true}).flatMap(e => {
    if (e.name === '.DS_Store' || e.name === '__pycache__' || /\.(iml|pyc|pyo)$/.test(e.name)) return [];
    const p = path.posix.join(rel, e.name);
    return e.isDirectory() ? files(root, p) : [p];
  }).sort((a, b) => a.localeCompare(b));
}
for (const id of ids) {
  const src = `.agents/skills/${id}`, backend = `profiles/backend/.workbuddy/skills/${id}`;
  assert(!fs.existsSync(`profiles/backend/.agents/skills/${id}`), `new override: ${id}; inspect before syncing`);
  const names = files(src);
  for (const copy of [`.workbuddy/skills/${id}`, backend]) {
    assert.deepEqual(files(copy), names, `file set: ${copy}`);
    for (const name of names) {
      assert.deepEqual(fs.readFileSync(`${copy}/${name}`), fs.readFileSync(`${src}/${name}`), `${copy}/${name}`);
      assert.equal(fs.statSync(`${copy}/${name}`).mode & 0o777, fs.statSync(`${src}/${name}`).mode & 0o777);
    }
  }
  const link = `.claude/skills/${id}`;
  assert(fs.lstatSync(link).isSymbolicLink());
  assert.equal(fs.realpathSync(link), fs.realpathSync(src));
  const hash = crypto.createHash('sha256');
  for (const name of files(backend)) {
    let bytes = fs.readFileSync(`${backend}/${name}`);
    if (!bytes.includes(0)) bytes = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'));
    hash.update(name).update('\0').update(bytes).update('\0');
  }
  assert.equal(hash.digest('hex'), lock[id].effectiveHash, `effectiveHash: ${id}`);
}
console.log(`PASS: ${ids.join(', ')}`);
JS
```

## 收尾与交付

- [x] 四项任务完成后，对五个技能一起运行结构核对，并运行 `git diff --check`；预期前者输出五项 PASS，后者退出 0 且无输出。
- [x] 对照执行前工作树差异检查新增范围；两份锁的来源字段、targets、根 62 / Backend 61 集合、两份 bundle 和 registry、公开清单、两份 tracker frontmatter 均保持原值。不要用整个 HEAD 差异误删前轮未提交适配。
- [x] 将本计划任务状态与两份来源说明更新为真实结果，区分 R1—R3 和 O1/O2 的实际完成情况。前次计划的历史审查结论保留，不伪装成当时已经发现或修复本轮问题。
- [x] 交付实际修改、S1—S5 的检查方式与结果、结构核对结果及未完成事项；默认不提交、不发布。没有运行真实宿主场景和远程写入时明确保留这两类限制。

## 计划自检

R1、R2、R3 分别由任务 1、2、3 承接；O1 并入任务 2，O2 由任务 4 承接；S1—S5 均有具体输入和观察点。任务 2、3 顺序修改同一 tracker 种子，任务 1、2 顺序修改 wayfinder；按 1→2→3→4 执行并保留前项结果。五个技能当前无 Backend 覆盖，故共同字节核对适用；若执行时出现新覆盖，先调整该项核对而非删除覆盖。没有新增业务接口、依赖或技能，未将文本核对等同实际模型行为。计划完成不表示修订已完成。

## 实施核验记录（2026-11-01）

四项任务均已完成，R1—R3 与 O1/O2 均已实施。本轮相对获批计划开始时修改 42 个文件：12 个技能源文件、24 个平台副本、4 个 tracker/来源说明、Backend 锁及本计划；此前未提交适配保持。

| 项目 | 实际结果与边界 |
|---|---|
| S1 独立委派入口 | 三个入口的文本场景核对完成；完整 brief、只读权限、指针缺口和顺序回退明确；未运行真实派发场景 |
| S2 方法类型 | 文本核对覆盖相同正文的不同标签/本地 Type、缺失、未知、冲突、原生 Issue Type 及本次纠正；未执行真实 tracker 恢复 |
| S3 当前目标 | 文本核对覆盖明确 B URL、默认 A、多候选裸编号及访问失败；两份持久 tracker frontmatter 原字节不变 |
| S4 关系命令 | 实际运行 gh 2.102.0 create/edit 帮助，确认示例参数；未执行远程关系写入或验证服务端能力 |
| S5 发现入口 | 描述与 Codex 显示元数据已同步；调用政策、display_name、正文及 registry/bundle 不变；宿主实际发现与触发未验证 |
| 分发结构 | 五技能副本字节/权限、Claude 链接、Backend 哈希均通过；根 62 / Backend 61、来源字段、targets、清单不变 |
| 范围与格式 | 本轮 42 文件均在计划范围，14 个受影响本地链接可达，相关 YAML/JSON 可解析，git diff --check 退出 0 |

独立只读审查已完成：使用独立上下文的 gpt-6-astra，Critical 0、Important 0、Minor 0。审查另核对分支中 53 个改动技能源文件的根 WorkBuddy 副本、两安装模式来源资源闭包及 GitHub 官方 REST 参数；无遗留修复项。标签未获授权时不补建、无独立代理时顺序完成均符合已批准范围；真实宿主、远程写入和升级兼容继续列为未验证。未提交、推送、合并、发布或更新用户安装实例。
