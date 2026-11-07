---
name: setup-yss-harness
description: 安装或升级 YSS CLI，配置项目或用户级 Skills，初始化、接管、同步项目并处理安装冲突。
---

# 安装与同步 YSS

先区分程序安装、项目受管技能、用户级技能与工程同步，复用目标路径和已有授权。只要求查询时保持只读；不要因为调用本技能就升级程序、同步工程或改用户级配置。

本技能面向纯 Rust YSS CLI 3.2.0，不兼容旧 Go 安装记录或旧插件。先读实际 `yss version`、`yss help` 和目标命令帮助，按安装程序真实能力操作；模板与 Skills 更新不会替换已有二进制。是否正式发布以所选来源的实际 Release 为准，尚未发布的版本或功能必须称开发构建。

## 安装或升级程序

Rust 在线默认使用 `https://github.com/iloveZzz/yss-cli` 的公开 Release，支持 `--source github|gitlab`；GitLab 次级来源固定为 `https://gitlab.yss.test:9443/yss/yss-cli`。选择用户指定版本；未指定时查询所选来源最新正式 Release，排除草稿、预发布与未来发行，固定版本、源码来源、target 和归档摘要。平台包名是 `yss_<版本>_<完整Rust target>.tar.gz`，Windows 为 `.zip`；以实际发布资产为准，不能从设计目标推断已有包。

GitHub 公开读取不需要凭据，不读取或发送 GitLab token。仅选用 GitLab 时配置显式 CA `YSS_GITLAB_CA_FILE` 和具备项目、Release、资产读取权限的受限 PAT `YSS_GITLAB_TOKEN`。每次核验完整项目路径、Web URL 和动态正数项目 ID；token 只在内存及受限请求头中传递，不进入 URL、参数、日志或产物。`--source` 仅用于在线升级，不与 `--artifact` 混用；不自动跨来源回退，不提供在线 Job Token 模式。来源不可用返回 NOT_READY，不自动创建发行或向日常 CI 注入 PAT。

首次安装或从旧接口切换时，由 Agent 下载匹配的归档及 `SHA256SUMS`，核验实际 SHA-256，在临时目录安全解包。拒绝越界、链接和重复路径，核对包内 `release-manifest.json` 的 `format: yss.release`、`formatVersion: 1`、实际程序构建记录、精确 target 与载荷摘要，再用新程序查看版本和帮助。使用新程序安装到独立工具目录，不调用旧升级器或仅覆盖旧可执行文件：

```text
<新程序> upgrade --artifact <归档绝对路径> --sha256 <实际归档摘要> --tool-root <新的工具目录> --dry-run
<新程序> upgrade --artifact <归档绝对路径> --sha256 <实际归档摘要> --tool-root <新的工具目录>
```

确认新目录的程序与 `.yss/tool.json` 新格式收据后，按宿主环境配置 PATH 或入口链接；已有入口先读取并保留恢复方式。不要手改收据、删除旧目录或把开发构建当正式版。已有 Rust 格式安装时可运行 `upgrade --to <固定版本> --tool-root <目录>`；本地包使用 `--artifact` 与 `--sha256`。`upgrade` 只改程序，项目和技能更新另行处理。

## 项目中的受管 Skills

`spec` 用于业务规格和产品设计，`backend` 用于后端工程，`frontend` 用于前端应用工程与设计还原。frontend 从 CLI 3.2.0 开始支持，需内嵌对应 Bundle；3.1.4 及以前的程序不会随模板更新获得该能力，先以实际帮助确认。新建或接管时明确 Profile；已有项目沿用安装记录，`sync` 不切换 Profile。

- `project` 安装技能和必要项目文档，是新安装默认值。
- `skills` 安装技能、宿主入口及必要引用资源，不创建项目治理流程。它仍是项目目录中的受管安装，不等于用户级全局安装。
- 两种范围均不要求阶段门禁、批准、合同、checkpoint 或测试套件。

```text
yss init --root <新目录> --profile spec --installation skills
yss attach --root <普通已有工程> --profile backend --installation skills
yss skills list --root <受管目录>
yss skills ensure setup-yss-harness yss-validation --root <受管目录>
yss sync --root <受管目录> --installation project --dry-run
yss sync --root <受管目录> --installation project
```

`init` 只用于新目录或空目录；普通已有目录使用 `attach`，已有受管项目使用 `sync`。`skills ensure` 的技能名是位置参数，只安装所选技能及必要资源。`sync` 默认沿用原安装范围，只有显式 `--installation project|skills` 才切换。模板与技能来自该 CLI 的内嵌 Bundle，不会另拉模板 main；需要新 Bundle 时先升级 CLI。

## 独立或用户级 Skills

仅安装 Agent 技能无需安装 YSS CLI，也无需初始化受管工程。从 [公开技能仓](https://github.com/iloveZzz/yss-spec-dev-skills) 选择实际存在的技能及资源；使用 [skills CLI](https://github.com/vercel-labs/skills) 时先查看其帮助：

```text
npx skills@latest add iloveZzz/yss-spec-dev-skills --list
npx skills@latest add iloveZzz/yss-spec-dev-skills --skill setup-yss-harness --agent codex
```

默认安装到当前项目；只有用户要求跨项目可用时才加 `--global`。目标 Agent 按实际宿主选择，Claude Code 使用 `--agent claude-code`；不要自动使用 `--all`。缺少 Node 或 skills CLI 时，可由 Agent 将选定技能、必要资源与许可证直接放入宿主实际支持的技能目录。

同名技能先检查来源、已有内容及宿主发现路径；不得直接覆盖用户定制。独立 Skills 的更新通过原安装来源完成，不对用户级技能目录运行 `yss init/attach/sync`，也不改成治理工程。模板源的技能修改与公开发布按维护任务处理，不因安装请求自动提交或发布。

## 诊断与其他操作

所有写入命令默认直接执行；同一命令加 `--dry-run` 仅预览，不创建目标、控制目录或保存计划。`doctor` 查看安装来源、目标文件差异、冲突与未完成事务；`recover` 仅安全恢复未完成事务，参数以实际帮助为准，不提供已完成操作的通用回滚；已提交事务仅重试安全清理。Windows 更新可能保留仍被旧进程占用的程序，提交和清理结果分别报告；若中断导致主入口暂缺，从已核验发行包取得独立新程序执行 `recover --root <工具根>`。

脚手架使用 `scaffold catalog`、`scaffold ddd`、`scaffold mvc`。先确定项目、平台和 Maven 坐标，仅生成新目标，不要求合同或批准，不自动执行 Maven。

旧插件、保存计划、`plan/apply`、`migrate`、`assets`、`update`、`rollback` 和 `project` 等已退役；不要构造兼容命令。Rust 使用 `.yss/project.json`（`format: yss.project`、`formatVersion: 1`）；发现旧 `.yss.json`、家族标记或旧工具收据时只读拒绝，不迁移、不复用旧事务。保留旧目录，在新的目录重新接入；不删状态或覆盖用户修改。

保留路径、符号链接、权限、摘要、子模块和目标文件保护；无关工作区修改不构成统一阻断。报告实际版本与来源、程序/项目/技能各自的修改、宿主发现结果和未完成事项，不把文件复制等同于宿主已经加载。
