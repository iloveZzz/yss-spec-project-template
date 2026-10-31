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

新精简接口的 `upgrade` 在线使用 `--to`、`--tool-root`，离线使用 `--artifact`、`--sha256`、`--tool-root`，均可 `--dry-run`。接口未正式发行前明确称为开发构建，不宣称旧版或旧插件支持它，不为兼容旧 plan/apply 重建工具链。

发行来源固定为 `https://gitlab.yss.test:9443/yss/yss-cli`，模板来源仅允许同 origin 的 `yss/yss-spec-project-template`。按完整项目路径动态解析并核验正数 ID、path_with_namespace 和 web_url，仅采用本次核验 ID，不复用旧实例的 37/38 等映射；数值 ID URL 必须匹配该已核验 ID；不使用任意来源覆盖、HTTP、跨域跳转或 GitHub fallback。显式 `YSS_GITLAB_CA_FILE` 验证 CA，PAT 从 `YSS_GITLAB_TOKEN` 读取；CLI 虽保留 `YSS_GITLAB_CI_AUTH=1` 且 `CI_SERVER_URL` 精确匹配的显式 Job Token 模式，但当前 Job Token 无项目详情 API 权限，在线升级会在项目核验 HTTP 404 时以 `NOT_READY` 停止；在线升级应使用具备必要项目详情、Release 与资产读取权限的受限 PAT。不得把 PAT 注入日常 CI；CI 仅用 Job Token 经受支持的 `/api/v4/job` 核验本作业项目/job ID/SHA，再用固定规范 HTTPS Git 路径读取跨仓源码，显式 CA 且私有来源禁代理/重定向。此通道不放宽升级器身份核验，也不提供发行写入授权。token 不进 URL、argv、日志或产物，请求只发送到核验后的同项目地址。

`upgrade` 保留 manifest schema 2、统一 `SHA256SUMS`、归档与载荷摘要、权限、安装所有权、并发和事务校验，不恢复来源锁、平台资格或退休字段。Release 资产使用该项目上传文件或 `/api/v4/projects/<已核验ID>/packages/generic/yss/v<版本>/<文件名>`；可设置同版本的直接下载链接。服务须支持 HEAD 并返回准确 Content-Length。来源或 Release 404 时报告未就绪，不创建替代发行或修改既有标签。

用户授权发布且目标明确时，用 GitLab API 创建对应 Release 并上传真实产物；提交、推送和 tag 使用各自真实授权。已有授权继续有效，仅构建不产生远端发行。报告实际源码状态、产物、摘要、发布链接，以及未执行的平台运行检查。
