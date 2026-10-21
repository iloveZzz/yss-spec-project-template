# GitHub 发布、补发与恢复

仅在 [版本查询与确认](version-selection.md) 已为本次新版本取得有效确认、当前请求授权对应外部动作且必要门禁已通过时执行。原 1.3.7 或其他历史发版授权不替代新版本确认；明确补发既有平台范围按下节保留原版本。保存逐平台资产清单（名称、字节数、SHA-256、binary SHA）、固定 CLI/模板/工具提交、资格、实际测试和未覆盖边界；写好可审阅的 Release 正文后再变更远端。

## 新版本发布

1. 发布前重新读取远端目标 tag 和 Release，检查并发变更。已存在且匹配则续做未完成验证；存在但身份不符时停止受影响写入。不能移动已有 tag，不能把 API 连接失败当作不存在。
2. 核验提交已推送、源码 clean、资产来自最终 SHA、所需 CI/审批实际通过。CI `queued` / `in_progress` 单独记录；合同要求其通过时等待，失败先修复，不能靠发行对象已创建豁免。
3. 新 tag 使用当前仓库规则，通常为 `v<version>` 的 annotated tag，绑定最终完整 CLI SHA。推送精确 tag ref，禁止强推；发布后回读 peeled commit。
4. 用 GitHub 连接器或 `gh` 创建本版本草稿，上传明确清单内的两平台包、`checksums.json`、`SHA256SUMS`、资格索引及必要证据。示例命令形状如下，`assets` 必须是已经核验的显式数组，不用包含临时/旧包的目录通配符：

```sh
gh release create "$tag" "${assets[@]}" --repo "$repo" --verify-tag --draft --title "YSS CLI $version" --notes-file "$notes_file"
```

5. 回读草稿资产名称、大小、上传状态和 GitHub SHA-256，与本地清单逐项一致后发布为正式 Release；是否设置 latest 依据版本顺序与用户目标，历史补发不能把更新的正式版降级。

```sh
gh release edit "$tag" --repo "$repo" --draft=false --prerelease=false --latest --notes-file "$notes_file"
```

上例 `--latest` 仅用于确认应为最新版的场景。远端没有提供 digest 时下载计算，不把缺字段当作匹配。tag/Release/上传任一操作结果未知，先回读实际状态；只续传明确缺失资产，同名不同摘要停止，不盲目 `--clobber`。

## 已发布版本补充平台

用户明确要求补平台时可复用原生产 tag、源码及已合格同字节证据。先下载并核验原资产，保存 Release ID、asset ID/digest、旧正文、共同校验文件及原始包；补发必须仍来自原 tag 的完整生产 SHA，不能用较新的 main 冒充该版本。源码行为需要改变时另发新版本。

两包 manifest 的 `releaseGateSha256` 与共同 checksums 绑定，新增平台通常需要重新装配两包的证明元数据。核对原 binary/文档字节不变；如需替换已发布归档，必须落在这次明确补发授权内，先保存并上传旧归档/校验备份，再上传新增平台和证明，最后按精确名称更新受影响的旧资产及共同校验文件。不要把 `--clobber` 用作普通失败重试。

此过程非原子，短暂不一致时安装器应拒绝，不能放宽摘要检查。中途失败保存新旧资产映射并回读远端；仅恢复到已验证的一致旧集合，或续做已核验的新集合。无法证明恢复安全时停止远端写入并报告部分发布状态，不删除证据或移动 tag。完成后重新验证两个平台公开安装路径。

## 发布后必做

- 回读 tag → 完整 CLI SHA、Release ID/tag/draft/prerelease/latest、全部资产元数据及正文。确认与发布前预期一致。
- 使用公开下载 URL 在仓外新目录下载两平台包及校验/证明文件；公开仓按无认证下载验证分发可用性。设置连接、总超时及有界重试；校验 SHA256SUMS、checksums、manifest 和来源。下载部分成功不算完整通过。
- 各平台使用从该 Release 下载且已校验的执行器，在隔离工具目录执行 `upgrade --to <固定版本> --tool-root <隔离目录> --json`，再验证已装版本、receipt、`update status`、rollback、重复 recover 和用户文件保护。`upgrade --to` 会重读远端清单，需核对实际安装包摘要仍等于预期；漂移时拒绝。不能只重测本地候选包。
- Windows 使用真实 Windows runner 下载公开包、核验传入的 archive SHA，再运行同一原生安装检查。取回 CI 原始报告和日志，核对 workflow/tools SHA、生产 SHA、run/attempt、实际退出及摘要；Actions artifact 也校验 GitHub 提供的 digest。下载网络失败与测试失败分别报告。
- 旧执行器无法解析新版 `skillsSource` 时，使用已核验的新发行包内执行器引导隔离升级；声明旧执行器限制，不能隐瞒为所有旧版直接自升级均通过。
- 发布后门禁失败时报告“已发布但验收未完成”，保留失败与部分状态，修复下载/分发问题后定向复验；源码缺陷需新版本，不覆盖同 tag 二进制假装修复。必要时按已有授权执行经核验的分发恢复。

## 完成记录

记录查询到的最新正式版本及原始快照、建议、用户版本确认、动作授权，以及实际版本、remote、默认分支、CLI/各模板/skillsSource/工具完整 SHA、CGO、构建收据、逐平台资格与未覆盖项、原生及安装结果、独立审查、CI URL/结论、tag/Release URL、每个资产摘要、公开下载和安装回环证据。交付直接下载链接并注明已知限制；不笼统写“全平台验证通过”。

若任务由一次性自动安排触发，终态后使用宿主自动化工具停用该安排，避免重发；没有明确预约要求时不新建定时任务。
