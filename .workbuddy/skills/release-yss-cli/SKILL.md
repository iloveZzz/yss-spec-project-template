---
name: release-yss-cli
description: 按用户指定范围用 Go 工具构建 YSS CLI、打包发行产物，并在获得对应授权时发布。
---

# YSS CLI 构建与发布

依据用户指定的 CLI 仓库、模板源、版本、平台和发布范围执行。先读仓库实际构建入口与产物读取格式；不运行或补建 shell/Node/Python 发布脚本、测试套件、资格报告或阶段门禁。

固定实际使用的 CLI 与模板源码来源。干净提交可记录对应 SHA；工作树存在改动时记录真实工作树状态与内容摘要，不能把当前 HEAD 冒称产物完整来源。保留无关修改，不覆盖已有发行资产。

当前 Go Bundle 工具入口位于 CLI 仓库，按其实际参数执行：

```text
go run -tags yss_nobundle ./tools/bundle --source-root <模板源绝对路径> --out internal/bundle/assets
CGO_ENABLED=0 go build -trimpath -o <产物路径> ./cmd/yss
```

版本与来源注入参数先读取实际 Go 变量和构建说明，不猜 ldflags。多平台使用标准 `GOOS`、`GOARCH` 和适用 `CGO_ENABLED`，按发行包读取代码准备 manifest 与必要文件，再用标准 `tar` / `zip` 打包并以 `shasum -a 256` 等标准工具生成摘要。仅支持实际构建的平台；交叉编译成功不等于目标平台运行通过。发行包结构和摘要必须与实际 `upgrade` 读取格式一致。

CLI 3.0.3 起，`upgrade` 在线默认 GitHub，支持 `--source github|gitlab` 显式选源，GitLab 为次级选项；在线使用 `--to`、`--tool-root`，离线使用 `--artifact`、`--sha256`、`--tool-root`，均可 `--dry-run`；离线不与 `--source` 混用。未发布的新接口明确称为开发构建，不宣称旧版或旧插件支持它，不为兼容旧 plan/apply 重建工具链。

发布默认选择 GitHub。用户授权发布且目标明确时，用已连接 GitHub 工具或 `gh release` 创建对应 Release 并上传真实产物；明确仓库并核验既有标签，避免隐式创建未授权标签。只有用户明确选择 GitLab 时才使用其连接器或 `glab`，核对 HTTPS 实例、项目和资产；不自动双发或在失败后改投另一平台。提交、推送和 tag 使用各自真实授权。已有授权继续有效，仅构建不产生远端发行。报告实际源码状态、产物、摘要、发布链接，以及未执行的平台运行检查。

选择 GitLab 时，按完整项目路径核验动态项目 ID、Web URL 和同项目资产；使用显式受信 CA 与受限 PAT，不关闭 TLS，不向其他来源发送凭据。保留 schema 2、统一 `SHA256SUMS`、归档与载荷摘要、权限、安装所有权、并发和事务校验；资产须支持 HEAD 并返回准确 Content-Length。GitLab Job Token 不支持在线升级所需的项目详情 API，不向日常 CI 注入 PAT。
