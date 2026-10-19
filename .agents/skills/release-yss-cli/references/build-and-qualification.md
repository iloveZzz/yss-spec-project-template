# 构建与逐平台验收

用于准备已明确确认的新版本。先完成 [版本查询与确认](version-selection.md)；未确认时不执行本文件的版本更新、来源写入、构建或验收。所有命令在已核验的隔离 CLI 根执行，变量从本轮确认记录取得，不直接使用示例历史值。

## 来源准备

1. 先从 GitHub 读取仓库身份、默认分支、Release/tag 和所需模板 remote，再 fetch。记录每仓完整 SHA；不要在用户工作区直接 pull 覆盖本地工作。模板源遵守其身份、固定来源与发布合同，CLI 独立仓不补造产品 Ticket/阶段资产。
2. 消费 `docs/source-lock.json`：分别记录程序版本、协议版本、Spec/Backend 提交及 `skillsSource`。若 Backend 使用组合技能来源，先固定 Spec canonical/投影/锁提交，再更新相应 Profile 来源锁与提交，然后刷新 CLI 锁及 Bundle，最后处理父仓 gitlink；避免来源循环。
3. 版本及来源更新采用现有工具。读取当前 `tools/refresh-source-lock.mjs --help`，按受影响 Profile 预演；`--skills-source` 用于实际需要更新的组合来源，不能漏掉也不能无关重写。正式来源必须远端可取，不用 `--allow-unpushed` 生成发行资格。
4. 使用现行生成入口更新 Bundle、helpview、CLI 帮助及对应派生；例如有该能力的版本使用 `node tools/artifacts.mjs generate --scope all --source-root "$source_root" --out "$generation_evidence_dir"`，再以 `check` 和另一仓外新证据目录核验。必须先检查当前参数/目录布局；工具失败即保留错误，不手工改生成文件凑通过。
5. 完成必要源码验证和适用独立审查后，只提交授权文件，推送并核验远端可读。记录最终 clean SHA；正式包从该 SHA 构建，构建中不再生成或改写源码。

## 原生构建

优先当前标准构建器，保留 build receipt 的输入清单、工具版本、sourceState、CGO、目标平台、binary SHA 与两个 Profile inspect：

```sh
# Mac ARM 原生宿主；输出必须为仓外新目录
CGO_ENABLED=0 node tools/build-candidate.mjs --out "$build_dir"
```

```powershell
# Windows x64 runner；源码 checkout 固定最终完整 SHA，关闭自动换行转换
$env:CGO_ENABLED = '0'
node tools/build-candidate.mjs --out "$env:RUNNER_TEMP/windows-build"
if ($LASTEXITCODE -ne 0) { throw 'YSS candidate build failed' }
```

通过 `go.mod` 和仓库环境工具选择 Go/Node 版本，保留标准构建参数，不能改用裸 `go build` 丢掉 provenance、strip 或来源检查。检查实际宿主/运行平台与 manifest 相符；交叉编译只证明可编译。Windows runner 缺失时保留候选并报告该平台尚未取得资格，不能写成功收据。

生产源码与发行辅助工具分开 checkout、分开固定提交。GitHub workflow 的源码 ref 必须为最终 CLI SHA；工具 ref 为审查后的工具 SHA。最小权限运行，凭据使用宿主/Actions secret，不能进入源码、归档、日志或发布正文。

## 资格与证据

从当前 `tools/release/README.md`、装配器输入 schema、模板 verification profiles 和平台分发声明生成本次检查集合。实现已删除测试入口时先寻找可信固定历史工具并核验其与当前合同的兼容性，不能把“没有测试文件”写成门禁已满足。

v1.3.6/1.3.7 的已验证模式如下，仅作为当前合同调查的起点：

| 平台 | qualificationScope | 该历史模式的实际范围 |
| --- | --- | --- |
| Mac ARM64 | `local-platform-impacted-consumers` | 原生入口 82、真实中断恢复 12、插件命令 44、安装 5、旧实例恢复 48、受影响模板消费者 9 |
| Windows x64 | `windows-program-installation` | 5 项安装验收、实际命令：version、两个 Profile inspect、预览、安装、安装后版本/状态、回滚、两次无操作恢复；只读用户文件保留 |
| 双平台聚合 | `platform-qualified-installation` | 共同来源与资格索引绑定两个独立平台收据，不把 Windows 安装资格扩成 Mac 完整范围 |

若原始说明仍只声明 Mac，而当前已认可的补充发行合同明确允许上述逐平台模式，应保留原文并附可追溯范围声明。仅有历史样例、没有当前依据时不能自行换 qualificationScope；需要变更合同则先形成具体差异并处理真实授权/批准。

每项保留实际命令、cwd、起止时间、观察到的退出码/信号/超时、stdout/stderr 原字节和 SHA-256、输入前后摘要、case/label 覆盖与未执行范围。平台工具的 `status=passed` 还需核验对应日志，不能以自述或 fixture 代替实际执行。未知输入映射先修复；必要检查通过后不无理由扩大或重复测试。

候选包 `stableReady=false`。用候选完成安装资格，核对只读预览、真实安装、`update status` 一致、rollback、recover 及用户字节/权限。全部使用隔离工具目录，不复制其他安装的 `.yss` WAL。重复无操作 recover 不能证明强制中断恢复；后者必须另有实际杀进程/恢复证据。

## 正式装配

读取当前装配器要求构造输入；例如原生 Mac 合同使用：

```sh
CGO_ENABLED=0 go run ./tools/package --native-candidate-manifest "$native_input" --required-platforms darwin/arm64 "$candidate_dir"
CGO_ENABLED=0 go run ./tools/package --native-manifest "$native_input" --required-platforms darwin/arm64 "$release_dir"
```

输入的 Identity、七份文档、binary、原生收据、稳定 gate 及其所有依赖必须存在且摘要匹配，不能只改平台参数让同一套 Mac 证据替 Windows 通过。逐平台聚合使用当前可信适配器；缺少时参考工具谱系，在独立工具工作区适配、验证并审查，不修改生产装配器绕过约束。

逐一验证 `yss_<version>_darwin_arm64.tar.gz`、`yss_<version>_windows_amd64.zip`：无重复/越界/符号链接成员；binary、文档模式及全部 digest 满足当前合同；manifest 的完整 CLI SHA、sourceState、CGO、平台、source-lock、required platforms、native receipt、release gate 与 `checksums.json` 一致。SHA256SUMS 覆盖发布清单中的包与证明文件。

独立审查关注源码/工具/收据是否真正同源、跨平台声明、现有安装兼容性及失败恢复。为声明发布准备的任何源码或工具改动使受影响审查和证据重新绑定；未提交工具不得伪报固定工具提交。
