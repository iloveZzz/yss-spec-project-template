# 安装、接入与升级

本页以 Rust CLI `3.8.0` 与内嵌 Template `5.8.0` 为操作基线。已有程序先运行 `yss version` 和 `yss --help`，核对版本、target、源码来源及 Bundle 摘要。用户程序运行时使用单个 yss，Windows 为 yss.exe，处理 Git 工作树时还需 Git。

## 首次安装程序

首次安装交给 Agent。用户提供平台、安装位置及指定版本，未指定版本时由 Agent 查询所选来源的最新正式 Release。默认来源为 GitHub `iloveZzz/yss-cli`，GitLab 是显式选择的次级来源。正式发行资产和原生验证范围以对应 Release 为准，当前发行目标为 macOS ARM64 和 Windows x64。

1. 下载匹配完整 Rust target 的发行归档及 SHA256SUMS，核对实际 SHA-256。
2. 在临时目录安全展开，核对 release-manifest.json、程序构建来源、版本、target 与载荷摘要。
3. 用取得的新程序查看 version 和帮助，再安装到独立的新目录或空目录。
4. 核对安装收据与 doctor 结果，按用户安装授权配置 PATH 或入口链接，并验证实际调用的程序。

```text
<已校验的新程序> version
<已校验的新程序> upgrade --artifact <归档绝对路径> --sha256 <实测SHA-256> --tool-root <新工具目录>
<新工具目录中的程序> doctor --root <新工具目录> --json
yss version
```

工具目录须位于 Git 工作树外，与项目目录分开。首次安装显式指定 tool-root，已有 Rust 安装可沿用其工具目录和 `.yss/tool.json` 收据。旧 Go 安装、旧收据和旧事务使用独立目录保留，Rust CLI 在新目录接入。由新程序完成安装可建立完整收据和事务记录。

## 接入项目

| 现状 | 命令 | root 要求 |
| --- | --- | --- |
| 新方法项目或新 Home | `init` | 不存在的目录或空目录，父目录已存在 |
| 已有普通工程 | `attach` | 已存在且尚未接入 YSS 的工程 |
| 已有受管安装 | `sync` | 保留有效 `.yss/project.json` 的安装根 |

以下命令分别演示新 Home、已有后端和已有前端，选择与本次目标对应的一项。

```text
yss init --root ./my-home --profile spec --installation project
yss attach --root ./existing-service --profile backend --installation skills
yss attach --root ./existing-web --profile frontend --installation skills
```

三个 Profile 分别承担 Spec/Home、后端和前端职责。project 安装技能及项目资料，是新安装默认范围。skills 安装项目内技能、宿主入口和必要引用。接入后查看实际技能与诊断结果。

root、工具目录和输出父目录使用经过核实的真实路径。CLI 拒绝经过符号链接的受保护路径，系统临时目录也应先解析到实际位置，再核对该位置属于本次任务。

```text
yss skills list --root <受管项目目录>
yss doctor --root <受管项目目录> --json
```

init/attach 成功后的 nextSteps 提供后续行动。Spec project 需由 Agent 核实已有索引、工程位置和 Git 身份，按目标维护 Home 地图。已有工程继续使用自己的职责与入口，详细操作见 [Spec / Home](tutorial-spec.md)、[Backend](tutorial-backend.md) 与 [Frontend](tutorial-frontend.md)。

## 升级程序与同步项目

新版 CLI 的技能库和工程当前启用的入口可能不同。下列是本次改名及适用范围。

- `yss-product-lifecycle` → `yss-build-spec`，编制产品规格与原型，Spec 默认提供。
- `wayfinder` → `yss-map-decisions`，从模糊目标建立或接续决策地图，Spec 默认提供，Backend 可按需补装。
- `handoff` → `yss-deliver-pr-mr`，通过 PR/MR 交付选定材料，三个 Profile 默认提供。

默认技能随项目同步更新。曾手动补装的技能请核对新名，仍需使用时执行 `yss skills ensure <新ID> --root <工程>`。写作、业务分析、UI 设计与逻辑原型的旧称及各项中文提示词见[技能地图](../../agents/profile-skills.md#技能改名)。

程序升级和项目同步分别执行。在线升级默认使用 GitHub 正式 Release，选择固定版本后执行。

```text
yss upgrade --to <正式版本> --tool-root <已有工具目录>
yss version
yss sync --root <受管项目目录> --dry-run
yss sync --root <受管项目目录>
```

离线升级使用已核验的归档及摘要。

```text
yss upgrade --artifact <归档绝对路径> --sha256 <实测SHA-256> --tool-root <已有工具目录>
```

显式选择 GitLab 时使用 `upgrade --source gitlab --to <正式版本> --tool-root <目录>`，并提供 `YSS_GITLAB_CA_FILE` 与 `YSS_GITLAB_TOKEN`。不同来源分别核验，来源故障按实际错误处理。令牌只交给所选来源使用，避免写入命令示例、文档或日志。

sync 使用当前程序内嵌的模板与技能，默认沿用项目 Profile、安装范围和变量。需要切换范围时显式使用 `sync --installation project|skills`，Profile 参数仅校验原身份。模板源码新提交要进入项目，需要包含该内容的 CLI Bundle 和成功同步。

所有支持预览的写命令均可加 `--dry-run`。预览只读取和校验本次输入，执行时去掉该参数。在线 upgrade 预览仍会访问发行信息。发生冲突或中断时，保留用户文件、收据和事务资料，按 [维护与恢复](tutorial-maintenance.md) 处理。
