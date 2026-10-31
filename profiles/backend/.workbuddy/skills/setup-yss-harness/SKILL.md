---
name: setup-yss-harness
description: 安装或升级 YSS CLI，配置项目或用户级 Skills，初始化、接管、同步项目并处理安装冲突。
---

# 安装与同步 YSS

先区分程序安装、项目受管技能、用户级技能与工程同步，复用目标路径和已有授权。只要求查询时保持只读；不要因为调用本技能就升级程序、同步工程或改用户级配置。

精简接口自 CLI 3.0.1 提供；私有 GitLab 迁移代码在正式 Release 发布前仍属于开发构建。先读实际 `yss version`、`yss help` 和目标命令帮助；旧版 3.0.0 及更早版本的命令、安装收据和插件接口不能套用到新版。模板或 Skills 更新不会自动替换已安装的二进制。

## 安装或升级程序

仅从固定私有 [GitLab Release](https://gitlab.yss.test:9443/yss/yss-cli/-/releases) 选择用户指定版本；未指定时查询最新已发布稳定版，排除预发布与未来发行，并在本次操作中固定版本、源码提交、平台和归档摘要。每次通过固定 origin 的 API 按完整路径 `yss/yss-cli` 解析项目，核验正数 ID、完整路径与 Web URL；不复用旧实例的 37/38 等映射，数值 ID URL 必须匹配本次已核验 ID；拒绝 HTTP、任意来源覆盖、跨域跳转和 GitHub 自动 fallback。仅允许同源同项目且与版本和文件名一致的资产 URL，动态解析完成前不向数字 ID 地址发送 token。平台包以该 Release 的实际资产为准：`yss_<版本>_<GOOS>_<GOARCH>.tar.gz`，Windows 使用 `.zip`，不要假定所有平台都有发行包。

设置 `YSS_GITLAB_CA_FILE` 指向受信 CA PEM，PAT 只从 `YSS_GITLAB_TOKEN` 安全环境读取；不关闭 TLS，不把 token 放入 URL、argv、日志或产物。在线升级需要具备项目详情、Release 与资产读取权限的受限 PAT。CLI 保留仅显式 `YSS_GITLAB_CI_AUTH=1` 且 `CI_SERVER_URL` 精确等于 `https://gitlab.yss.test:9443` 时启用的 Job Token 模式，但当前 Job Token 不支持项目详情 API，会在项目核验 HTTP 404 时返回 `NOT_READY` 并停止；不得宣称该模式可完成在线升级，也不得把 PAT 注入日常 CI。日常 CI 另用受支持的固定 `/api/v4/job` 核验本作业身份与 SHA，并从固定规范 HTTPS Git 路径读取跨仓源码；显式 CA、私有来源禁代理及禁止重定向，不能替代在线升级器的项目详情核验。项目或 Release 不存在（HTTP 404）时报告“尚未就绪或没有读取权限”，停止在线安装与升级；不造 Release、不改标签、不改用 GitHub。已另获可信本地归档时可执行离线安装。

首次安装或从旧接口切换时，由 Agent 下载匹配的归档及 `SHA256SUMS`，核验实际 SHA-256，在临时目录安全解包。拒绝越界、链接和重复路径，核对包内 `release-manifest.json` 的版本、平台与载荷摘要，再用新程序查看版本和帮助。使用新程序安装到独立工具目录，不调用旧升级器或仅覆盖旧可执行文件：

```text
<新程序> upgrade --artifact <归档绝对路径> --sha256 <实际归档摘要> --tool-root <新的工具目录> --dry-run
<新程序> upgrade --artifact <归档绝对路径> --sha256 <实际归档摘要> --tool-root <新的工具目录>
```

确认新目录的程序和安装记录后，按宿主环境配置 PATH 或入口链接；已有入口先读取并保留恢复方式。不要手改收据、删除旧目录或把开发构建当正式版。已使用精简接口时可运行 `upgrade --to <固定版本> --tool-root <目录>`；本地包使用 `--artifact` 与 `--sha256`。`upgrade` 只改程序，项目和技能更新另行处理。

## 项目中的受管 Skills

`spec` 用于业务规格和产品设计，`backend` 用于后端工程。新建或接管时明确 Profile；已有项目沿用安装记录。

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

`init` 只用于新目录；普通已有目录使用 `attach`，已有受管项目使用 `sync`。`skills ensure` 的技能名是位置参数，只安装所选技能及必要资源。`sync` 默认沿用原安装范围，只有显式 `--installation project|skills` 才切换。模板与技能来自该 CLI 的内嵌 Bundle，不会另拉模板 main；需要新 Bundle 时先升级 CLI。

## 独立或用户级 Skills

仅安装 Agent 技能无需安装 YSS CLI，也无需初始化受管工程。从 [公开技能仓](https://github.com/iloveZzz/yss-spec-dev-skills) 选择实际存在的技能及资源；使用 [skills CLI](https://github.com/vercel-labs/skills) 时先查看其帮助：

```text
npx skills@latest add iloveZzz/yss-spec-dev-skills --list
npx skills@latest add iloveZzz/yss-spec-dev-skills --skill setup-yss-harness --agent codex
```

默认安装到当前项目；只有用户要求跨项目可用时才加 `--global`。目标 Agent 按实际宿主选择，Claude Code 使用 `--agent claude-code`；不要自动使用 `--all`。缺少 Node 或 skills CLI 时，可由 Agent 将选定技能、必要资源与许可证直接放入宿主实际支持的技能目录。

同名技能先检查来源、已有内容及宿主发现路径；不得直接覆盖用户定制。独立 Skills 的更新通过原安装来源完成，不对用户级技能目录运行 `yss init/attach/sync`，也不改成治理工程。模板源的技能修改与公开发布按维护任务处理，不因安装请求自动提交或发布。

## 诊断与其他操作

所有写入命令默认直接执行；同一命令加 `--dry-run` 仅预览，不创建目标、控制目录或保存计划。`doctor` 查看安装来源、目标文件差异、冲突与未完成事务；`recover` 仅安全恢复未完成事务，参数以实际帮助为准，不提供已完成操作的通用回滚。

脚手架使用 `scaffold catalog`、`scaffold ddd`、`scaffold mvc`。先确定项目、平台和 Maven 坐标，仅生成新目标，不要求合同或批准，不自动执行 Maven。

旧插件、保存计划、`plan/apply`、`migrate`、`assets`、`update`、`rollback` 和 `project` 等已退役；不要构造兼容命令。受支持的 metadata 3/4/5 由新版 `sync` 处理；发现冲突或旧未完成事务时保留现场，不删状态、猜身份或覆盖用户修改。

保留路径、符号链接、权限、摘要、子模块和目标文件保护；无关工作区修改不构成统一阻断。报告实际版本与来源、程序/项目/技能各自的修改、宿主发现结果和未完成事项，不把文件复制等同于宿主已经加载。
