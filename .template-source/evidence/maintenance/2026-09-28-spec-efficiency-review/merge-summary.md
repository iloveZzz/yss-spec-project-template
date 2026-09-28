# 本地主分支合并依据

研发规格性能与执行效率优化已完成两轮独立审查。第二轮 Standards / Spec 通过，无未关闭阻断；当前维护候选可按用户授权合并到本地 main。审查实现 HEAD 为 c56ed09a1c4d8555e4d775e1e2b3dbb86b72ef92，候选摘要为 f6f863a4e8ba14ffbebe96d519ba8f7819f60d0b657b228a9277ff7d2951fae8。详细结论见 reviewer-round2/review.md，结构化校验见 review-validation.txt。

第一轮 SPEC-1 已修复：默认 review 保留 raw v2/v3 的全局约束，包含人工审阅点、重路由条件及嵌套未知约束。新增测试先红后绿。完整回归发现旧整体压缩指标与必需约束冲突，现分别核验摘要预算和完整约束，总视图仍小于原完整视图；不再声称总字节减少 70%。原始失败、修复及独立裁决全部保留。

最终完整验证命令为 scripts/verify-template --concurrency 2 --report-dir /tmp/yss-efficiency-merge-full-r2-final，205 条结果、204 条唯一执行命令、1 条复用，385392 ms，input_drift=false，全部通过。报告见 full-verification-r2/report.json。此前并行来源状态竞态和材料写入导致的漂移均保留失败记录，不计为通过。

三个专职模板与四个 CLI 均绑定已提交来源，版本清单见 subrepo-candidates-r2/fixed-source-metadata.json；canonical、投影、锁与分发通过适用检查。候选完成后只新增本审查目录的证据，不再修改实现。

用户原主工作区及子仓存在 llm-wiki 等无关改动，合并前已保存逐文件摘要、原始差异和完整备份；合并流程额外创建可恢复 stash。合并采用本地 fast-forward；恢复原始权威内容后只重新生成锁与快照。保全日志在 /Users/zhudaoming/.codex/tmp/spec-efficiency-merge-preserve/merge-journal.json。

本轮不推送远端、不执行 npm 发布、不升级全局 CLI，也不宣布产品可发布。白名单继续 shadow；真实项目、Token 与人工等待收益未获得新证据。历史实施 checkpoint 中的 working-tree 和待验证记录保留原样，由本次固定来源审查和完整报告说明最新状态。
