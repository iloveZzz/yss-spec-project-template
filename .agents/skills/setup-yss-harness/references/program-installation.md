# 程序安装与升级

仅在安装、升级、诊断或恢复 CLI 程序时读取。程序来源和事务规则由 [统一协议](operation-contract.md#程序来源与安装) 定义。以下命令在任意工作目录运行，二进制、工具根、归档和计划使用绝对路径；`<固定yss>` 是本轮核验过的实际文件，Windows 使用 `yss.exe`。

## 取得最新正式版本并固定来源

1. 默认读取 `https://api.github.com/repos/iloveZzz/yss-cli/releases/latest`，或 [最新 Release 页面](https://github.com/iloveZzz/yss-cli/releases/latest)。有对应能力的已安装 CLI 可运行 `<固定yss> upgrade --check --json`，只查询、不下载程序包、不写入。不要把查询成功或 `updateAvailable=false` 当作安装一致性通过。
2. 记录实际 `tag_name`、Release URL、草稿/预发布标记，下载该固定 tag 下的 `checksums.json`。从清单取得 `cliCommit` 完整 SHA、目标平台归档名、大小、包/二进制摘要、来源锁和发行资格；不将 `target_commitish` 的分支名当完整提交。核对 tag、清单和包内 manifest 同源、同版本，当前平台具有实际发行验收。旧或未知清单格式先诊断，不猜字段。
3. 平台由当前运行环境确定；不能把交叉编译当该平台原生验收。后续下载用固定 tag 的资产 URL，校验长度、SHA-256、包内 manifest 和来源锁；归档保存在工具目录及项目外。下载后远程出现更新 Release 不改变本批次来源。
4. 网络失败、限流、缺校验清单或来源校验失败时停止该下载分支，保留准确错误。已取得可信固定包时可走离线入口；缺平台包时才按下文构建备用。不静默换镜像、npm、预发布或 main。

## 选择工具根及检查已有安装

优先解析实际入口的符号链接，找到受管二进制目录；对该目录执行 `<固定yss> update status --tool-root <工具根> --json`。比对 `version --json`、`installation.json`、`release-manifest.json`、实际文件摘要和权限。较新版本提供安装一致性诊断，较旧版本缺诊断字段时从清单逐项核对，不能把缺字段当通过。

首次安装选择用户级独立目录：macOS/Linux 默认 `~/.local/share/yss`，Windows 默认 `%LOCALAPPDATA%\yss`，先展开为绝对路径并确认不存在或为空。工具根不能是 Git 仓库根或治理项目根；用户指定的独立工具目录可优先使用。现有未受管文件或裸二进制不能直接接管覆盖。

发现未完成程序事务时先 `update status`，按授权检查材料后 `update recover`。其他不一致保留旧目录、原链接及事务材料，在全新工具目录安装；验证新目录后再切换入口。不能改旧收据来制造一致。`CONFLICT`、`INSTALLATION`、`ARTIFACT` 等错误保留其真实区别，不统一伪报成输入漂移。

## 首次安装、旧版本升级与离线安装

没有 CLI 时，将已校验发行包在仓外新临时目录安全展开：拒绝绝对/越界路径、链接及非预期成员；核对 manifest 文件摘要和 mode 后，使用其中的二进制作为本轮引导执行器。不要先把裸二进制复制进目标工具根，否则会触发首次安装冲突。已有 CLI 缺 `upgrade` 或不能读取新包协议时，同样使用核验过的新引导执行器。

```text
<固定yss> update plan --tool-root <绝对工具根> --artifact <绝对归档路径> --sha256 <归档SHA-256> --out <工具根外全新计划.json> --json
<固定yss> update apply --tool-root <绝对工具根> --plan-file <保存的计划.json> --json
<新工具根中的yss> version --json
<新工具根中的yss> update status --tool-root <绝对工具根> --json
```

核对保存计划的来源、写入范围、输入和回退材料后，按当前授权应用；计划和应用使用相同引导二进制。安装后再核对来源、四 Profile 的 `bundle inspect` 及受管文件一致性。

将验证后的程序接入用户 PATH：Unix 保留正确的既有链接；首次安装可创建用户 bin 中的链接。Windows 使用用户 PATH 中的工具目录。入口存在且指向其他程序时先展示切换差异，不删除未知文件、不改系统级目录；用实际命令路径检查遮蔽。切换失败保留新安装与原入口，提供绝对路径使用及恢复方式。

## 已安装 CLI 的在线升级

能力以固定二进制的 `capabilities --json`、`upgrade --help` 为准，不能仅凭版本号推测。先记录最新查询的版本和归档摘要，再使用明确版本及工具根：

```text
<固定yss> upgrade --check --json
<固定yss> upgrade --to <查询得到的稳定版本> --tool-root <绝对工具根> --json
```

`upgrade` 没有 `plan/apply` 子命令、`--plan-file` 或预期摘要参数；`--to` 固定版本，但执行会重新读取该 tag 的远程清单。需要严格绑定本次已审阅 SHA-256 或保存可复核计划时，使用上节下载后的 `update plan/apply`，不能声称在线两次调用锁住了同 tag 的原摘要。直接在线执行后比对回执的目标版本、归档摘要及安装 manifest 的完整提交；与查询记录失配时停止后续项目操作并保留证据，另行处置程序事务。

已是最新且受管安装及来源一致时，原生在线入口返回 `unchanged`，不重复下载或创建事务；仍需检查安装一致性。程序升级结束后重新取得实际二进制摘要，再独立生成实例同步计划，不复用旧项目计划或自动迁移项目。

## 缺少平台包时的固定源码备用

从选定 Release 的校验清单取得完整源码 SHA，在仓外隔离检出官方仓库该提交；复核 Git HEAD、干净状态、该版本 `AGENTS.md`、Go 工具链和来源锁。清单缺 SHA 时只读解析并核对 Release tag 的完整提交，不能改用当前 main。无法证明对应提交时停止构建。

按该提交 README 使用 `CGO_ENABLED=0` 构建，执行该版本要求的测试及本机适用竞态检查；用该提交的 `tools/package` 输出到仓外新目录，选择本机包。保留四 Profile 的固定来源锁，不以本地模板工作树重新生成 Bundle。Go 或依赖不可取得、包协议不兼容、编译或测试失败时报告阻断，不改旧安装。

本地构建记录源码 SHA、工具链、包和二进制摘要、实际平台运行与未覆盖项；打包默认的 `stableReady=false` 保持原值，不能把交叉编译或一次安装改成官方发行资格。用同一固定二进制生成离线安装计划；本机通过不代表其他平台通过，也不发布构建产物。

## 程序恢复与回退

```text
<固定yss> update status --tool-root <绝对工具根> --json
<固定yss> update recover --tool-root <绝对工具根> --json
<固定yss> update rollback --tool-root <绝对工具根> --json
```

后两项直接写入，不加 `--apply`，只处理 `program-update` 事务。恢复唯一未完成事务，回退最近成功安装；重复回退不继续回退更早安装。文件或权限被用户改动时拒绝整体覆盖，保留诊断和备份。它们不恢复项目 `sync/migrate`，项目回退也不改变程序安装版本。
