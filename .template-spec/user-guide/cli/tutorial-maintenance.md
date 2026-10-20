# 教程：维护与案例

本页是[统一 CLI 操作说明](../unified-cli.md)的一部分。

## 教程：maintenance

```text
维护与恢复
前置条件：分别确认程序、项目模板、旧实例及插件绑定的来源与事务范围。
程序升级：upgrade；当前原生实例同步：sync；受支持的旧统一实例治理迁移：migrate --plan/--apply。
项目 recover/rollback 默认只读，增加 --apply 写入；程序 update recover/rollback 本身写入。未完成治理迁移用 recover --apply，已完成迁移不支持降级。
先核对状态及归档，在已确认范围内恢复；当前支持的插件先核验接口与实际代际相容，不能套用退役插件。仅检查请求不执行写入。
预期结果：计划、应用与恢复均绑定实际输入；后续用户修改阻止覆盖。
下一步：核对 doctor/diff 或 update status，保留本次真实验证与恢复材料。
失败恢复：冲突与输入漂移先保留现场，再检查诊断并重新规划；原始旧事务由对应固定旧执行器恢复。

YSS 离线入门教程

1. 查看程序与选择模板
   yss version --json
   yss capabilities --json
   yss init --profile spec --root ./demo-spec --project-name 演示项目
   也可选择 backend；当前只支持 Spec/Backend。

2. 检查实例（只读）
   yss doctor --root ./demo-spec --json
   yss diff --root ./demo-spec --json

3. 升级项目模板（先检查计划，再应用）
   yss sync --root ./demo-spec --plan --out /absolute/path/yss-sync-plan.json
   yss sync --root ./demo-spec --apply --plan-file /absolute/path/yss-sync-plan.json
   计划文件须不存在；输入或定制冲突变化时重新生成计划。

4. 查询和补装资源
   yss skills list --root ./demo-spec --json
   yss skills ensure yss-research --root ./demo-spec --plan --out /absolute/path/yss-skill-plan.json
   yss skills --root ./demo-spec --apply --plan-file /absolute/path/yss-skill-plan.json
   yss assets list --root ./demo-spec --json
   使用 list 的实际标识；阶段资源以当前 Profile 登记为准。

5. 旧统一实例治理迁移（仅 Spec/Backend 的 metadata3 / identity1 / policy1）
   yss doctor --root ./old-project --json
   yss recover --root ./old-project --json
   yss migrate --root ./old-project --profile spec --plan --out /absolute/path/yss-migrate-plan.json --json
   yss migrate --root ./old-project --profile spec --apply --plan-file /absolute/path/yss-migrate-plan.json --json
   未完成迁移在恢复授权内 recover --apply；已完成迁移不支持降级。
   原政策和历史批准封存，不授予新资格；仅旧 npm 家族、Design 等不提供当前迁移。

6. 升级 CLI 程序
   yss upgrade --check
   yss upgrade --to <本批固定版本> --tool-root /absolute/path/tools/yss --json
   自动识别实际运行的受管工具目录；未受管裸二进制须显式选择新工具目录。

   1.0.0 没有 upgrade 命令：首次进入新版从
   https://github.com/iloveZzz/yss-cli/releases 下载本机包和 checksums.json，
   读取其中对应归档 SHA-256，再执行现有离线入口：
   yss update plan --tool-root ./tools/yss --artifact /path/yss_<本批固定版本>_darwin_arm64.tar.gz --sha256 "<SHA-256>" --out /absolute/path/yss-install-plan.json --json
   yss update apply --tool-root ./tools/yss --plan-file /absolute/path/yss-install-plan.json --json
   ./tools/yss/yss version --json
   将该受管目录的 yss 链接到 PATH 后即可使用 upgrade。

7. 程序恢复和回退
   yss update status --tool-root ./tools/yss --json
   yss update recover --tool-root ./tools/yss --json
   yss update rollback --tool-root ./tools/yss --json
   自动安装用户应使用 upgrade 输出的 toolRoot，示例目录只是显式安装案例。
   后续用户修改会阻止覆盖；程序事务与项目 sync/migrate 事务分别恢复。

   出现“受管程序文件与安装清单不一致”时：
   先对错误中实际 toolRoot 执行 update status，查看 diagnostic.files 的
   expected/actual 摘要、权限以及 recordedVersion/runningVersion。
   运行版本仅在查询当前执行程序所在目录时比较；其他目录不会混用版本。
   有未完成程序事务先检查状态与归档，再执行 update recover。
   没有未完成事务但文件或版本不一致时，保留旧目录，选择不存在的新目录：
   yss upgrade --tool-root ./tools/yss-clean
   ./tools/yss-clean/yss version --json
   ./tools/yss-clean/yss update status --tool-root ./tools/yss-clean --json
   确认一致后再将 PATH 入口指向新目录的完整受管安装。
   离线安装使用第 6 步的 update plan/apply，tool-root 改为新目录。
   不要只替换 yss 文件、改写安装收据或删除旧归档；回退仍可能因后续修改而拒绝。

8. 治理入口
   yss context verify --root ./demo-spec --json
   yss lifecycle query --root ./demo-spec --id work-unit.entry-triage --json
   yss lifecycle route --help
   日常路由需已确认任务、实现仓和完整基线；机器校验不创建批准。

每个命令都有 -h / --help，例如 yss update apply -h。
本教程只输出文本；示例需由用户在适当目录显式执行。

```

## 案例材料与验证

公开示例的占位符须替换为真实目录、合同、完整基线和当前证据。批准、独立审查和外部操作由对应负责人取得。源码中的 `internal/cli/testdata/tutorial`、日常测试和治理测试是内部案例，不构成业务批准。

案例实际执行结果记录在候选验证报告，区分通过、预期阻断和未执行。CLI 核验消费已有测试记录，不代替执行测试。阶段计划重定向保存原始结果，不添加 `--json`；envelope 不能当作 `--plan-file` 输入。项目计划用 `--out` 保存。
