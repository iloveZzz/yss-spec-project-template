# Spec Profile TDD 验证记录

日期：2026-10-30（Asia/Shanghai）。本轮使用 Superpowers TDD、writing-good-tests 和 requesting-code-review；在既有隔离工作树继续，不提交、不推送。

## 本轮缺陷及修复

tracker 配置中的可选 repository、host、project 若填写数字，会被类型断言静默转换为空字符串；有效的 local-markdown 配置因此错误地接受了损坏字段。应拒绝已填写但类型不正确的配置，避免初始化后才暴露目标信息丢失。

RED：新增 `TestSpecTrackerRejectsNonStringFields`，直接运行真实解析器，以 local-markdown/.work 加三个数字字段分别验证拒绝；三个子用例均按预期失败，输出 malformed field accepted。未通过 mock 或源码关键词验证。

GREEN：在解析受支持字段前，验证所有已出现的 platform、root、repository、host、project 必须是字符串；缺省可选字段仍允许。worklayout 全包测试通过，独立审查者再次运行亦通过。

最小修复没有引入新的发布适配器、额外审批或配置字段。

## 审查与检查

独立聚焦审查结论：无 Critical、Important 或 Minor，批准本次修复。审查未重审上一轮整体改造、未验证远程写入、未重新裁定既有字段规则，也不独立证明历史 RED 输出；这些边界保留，本轮 RED 由执行器实际运行记录。

`gofmt`、`git diff --check`、worklayout 的 `go vet -composites=false`、`CGO_ENABLED=0 go build ./...` 均通过。Go 使用 `/workspace/spec-redesign-tools/go/bin/go`，测试 umask 022；系统 go 不是 Go 编译器。

全量候选 Go 测试 `go test -timeout 5m ./...` 通过（进程退出码 0）；CLI 包 76.047 秒，超过仓库 30 秒目标，仍为待优化项。全量候选回归日志：`/workspace/spec-redesign-tools/logs/tdd-validation-all.log`。使用与上一轮一致的 working-tree 来源及真实基线 BuildCommit flags，未改写正式 source-lock。

## 后续推荐验证

1. 在获授权的测试仓库中验证 GitHub/GitLab 创建、更新、超时后查询与重复执行；没有远程目标时不以 mock 通过代替验收。
2. 在实际宿主中验证初始化后技能发现、刷新和按需加载；文件存在不等于宿主已加载。
3. 使用简单规则和复杂交互两类真实任务，验证 AI 的设计深度选择及批准内容变化后的审批行为。
4. 获得提交/发行授权后，固定真实来源，执行官方 CLI 所需的完整模板和发行检查。

本轮不重写已有功能以制造 RED，也不为纯技能文案增加逐字镜像测试。后续发现行为缺陷时继续先复现，再最小修复，最后回归。

## 2026-10-30 外部验证进展

见 [外部验证记录](spec-profile-external-validation-2026-10-30.md)：GitHub 测试沙箱已真实创建、更新并演练恢复定位；真实超时、宿主发现、真实业务审批及正式发行检查仍待完成。
