# 统一 CLI 操作说明

现行 Profile 使用同一固定 `yss` 二进制，仅提供 `spec` 综合研发主控与 `backend` 专职交付；产品与业务设计由 Spec 承担。旧 Design 实例按其固定版本和迁移合同处理。前端 Profile 已移除，旧前端实例升级/同步会被明确拒绝且不改动文件。

## 分册

| 分册 | 内容 |
|---|---|
| [安装、接管、升级与恢复](cli/install-and-verify.md) | 安装与来源核验、新建、接管和补装、升级与回退、Bundle 与历史恢复 |
| [日常交付与正式功能目标](cli/daily-and-targets.md) | 日常交付能力、正式功能的可续推目标、Context 校验与快照、正式路径中的 Ticket 边界 |
| [教程：快速开始、日常与正式路径](cli/tutorial-daily-governed.md) | 教程：quickstart、教程：daily、教程：governed |
| [教程：Spec 主控](cli/tutorial-spec.md) | 教程：spec |
| [教程：Backend](cli/tutorial-backend.md) | 教程：backend |
| [教程：维护与案例](cli/tutorial-maintenance.md) | 教程：maintenance、案例材料与验证 |
| [命令参考](cli/command-reference.md) | 命令参考 |
| [错误索引](cli/error-index.md) | 错误索引 |

## 安装与来源核验

见 [安装与来源核验](cli/install-and-verify.md#安装与来源核验)。

## 新建、接管和补装

见 [新建、接管和补装](cli/install-and-verify.md#新建接管和补装)。

## 日常交付能力

见 [日常交付能力](cli/daily-and-targets.md#日常交付能力)。

## 正式功能的可续推目标

见 [正式功能的可续推目标](cli/daily-and-targets.md#正式功能的可续推目标)。

## 升级与回退

见 [升级与回退](cli/install-and-verify.md#升级与回退)。

## Bundle 与历史恢复

见 [Bundle 与历史恢复](cli/install-and-verify.md#bundle-与历史恢复)。

## Context 校验与快照

见 [Context 校验与快照](cli/daily-and-targets.md#context-校验与快照)。

## 正式路径中的 Ticket 边界

见 [正式路径中的 Ticket 边界](cli/daily-and-targets.md#正式路径中的-ticket-边界)。

## 入口导航

```text
yss — Spec / Backend 统一入口（版本以 .template-source/distribution/yss-cli-pin.json 为准）
──────────────────────

用法: yss [选项] <命令> [参数]

Profile 职责:
  spec 综合研发主控；支持目标政策的完整正式功能默认推进业务验收。
  产品与业务设计在 spec 内完成；backend 承担技术设计与专职交付。
  本次目标、本端职责与整体业务分别核验；旧实例先核对能力并显式同步。

快速上手（选择一个 Profile，在独立新目录运行）:
  yss init --profile spec --root ./demo-spec --project-name 演示项目
  yss init --profile backend --root ./demo-backend --project-name 演示项目
  yss doctor --root ./demo-spec --human
  yss context verify --root ./demo-spec --json

生命周期导航:
  正式：入口分诊 → Plan（战略规划） → Spec / 功能架构 → 产品设计与业务 Ticket 正式化 → 系统 / 数据架构与工程契约 → 实现切片拆分与合同准入 → 垂直切片实现 → 验证 / 发布 / 复盘
  固定模板：d947b648aa5feac74bd17ddb407a666a28cf5dd2；来源摘要：39a8e314412faa8e3ffe82d6f834dbe81d512105df9ae2c49f17b70f21fb892c
  日常：需求与验收 → 技术技能 → 实现 → 测试 → 独立审查 → verify-daily（当前 Spec 政策）
  教程：yss help tutorial governed | yss help tutorial daily
  先 Spec、再设计、再交付：yss help tutorial spec
  目标设置与续推：yss lifecycle target --help | yss help examples lifecycle target

通用选项:
  -h, --help       显示离线帮助
  -V, --version    显示程序及来源
  --human          强制中文摘要；终端默认中文，管道保持原格式
  --json           输出机器协议 1；与 --human 互斥
  --diagnostics    与 --json 同用，失败时附加诊断

命令:
  [项目]
    init             创建固定模板来源的项目实例。
    profile          准备独立的下游 Profile 工程并登记显式关联。
    attach           首次接管已有工程的模板受管资产；原生实例使用 sync，旧实例使用 migrate。
    doctor           检查项目身份、受管基线和冲突。
    diff             查看当前文件相对固定模板的差异和同步计划。
    sync             将项目模板升级到本 CLI 内置固定 Bundle。
    migrate          显式迁移旧实例 metadata、受管基线及 binding。
    recover          查询或恢复未完成的项目事务。
    rollback         查询或整体回退最近一次成功项目事务。
  [资源]
    skills           查询或补装 Skill 及其依赖闭包。
    assets           查询或补装 阶段资源和 Skill 闭包。
    bundle           读取或导出完整固定 Bundle 与 manifest。
  [程序]
    version          查看 CLI、协议和固定来源身份。
    capabilities     查看原生能力、治理接口与发行证据边界。
    upgrade          从 GitHub 下载并事务安装稳定版 CLI。
    update           安装、恢复或回退指定本地发行包。
  [治理]
    context          查询或校验唯一 CONTEXT.md 及词汇快照。
    lifecycle        查询当前生命周期、配置本次推进目标并核验门禁。
    stage            查询、登记或更新既有阶段工作项。
    contract         校验 contract 的结构或原生领域语义。
    evidence         校验 evidence 的结构或原生领域语义。
    handoff          校验 handoff 的结构或原生领域语义。
    project-ci       核验或配置项目 CI。
  [工具]
    runtime          管理独立运行记录与保护标记。
    archive          安全打包、读取或核验 ZIP 资产。
    xml              读取 Maven project XML。
    compat           显式旧命令兼容适配。
    compat-api       供现役 JavaScript 消费者使用的原生传输接口。
  help [命令/子命令]  显示对应帮助；help tutorial 查看完整离线教程

项目常用参数（程序升级不接受这些参数）:
  --root <目录>    项目根，默认当前目录
  --profile <Profile>  spec|backend；init 必需，其余从身份检测

升级、同步与恢复:
  yss upgrade --check                         查询 CLI 稳定版本
  yss upgrade                                 升级 CLI 程序
  yss update status --tool-root ./tools/yss    诊断离线安装与事务
  yss sync --root ./demo-spec --plan --out /tmp/yss-sync-plan.json
  yss sync --root ./demo-spec --apply --plan-file /tmp/yss-sync-plan.json

帮助: yss -h | yss <命令/子命令> --help | yss help <命令/子命令>
完整离线教程: yss help tutorial
按主题阅读: yss help tutorial quickstart|daily|governed|spec|backend|maintenance
示例索引: yss help examples [命令/子命令]
错误索引: yss help errors [错误码]
入口区别: upgrade 升级程序；sync 同步模板；migrate 迁移旧实例；recover 恢复未完成事务；rollback 回退最近成功事务。
能力与限制: yss capabilities --json；未迁移行为返回 UNPORTED。
帮助不读取项目、不访问网络、不创建资产。

```

## 教程：quickstart

见 [教程：quickstart](cli/tutorial-daily-governed.md#教程quickstart)。

## 教程：governed

见 [教程：governed](cli/tutorial-daily-governed.md#教程governed)。

## 教程：daily

见 [教程：daily](cli/tutorial-daily-governed.md#教程daily)。

## 教程：spec

见 [教程：spec](cli/tutorial-spec.md#教程spec)。

## 教程：backend

见 [教程：backend](cli/tutorial-backend.md#教程backend)。

## 教程：maintenance

见 [教程：maintenance](cli/tutorial-maintenance.md#教程maintenance)。

## 案例材料与验证

见 [案例材料与验证](cli/tutorial-maintenance.md#案例材料与验证)。

## 命令参考

见 [命令参考](cli/command-reference.md#命令参考)。

## 错误索引

见 [错误索引](cli/error-index.md#错误索引)。
