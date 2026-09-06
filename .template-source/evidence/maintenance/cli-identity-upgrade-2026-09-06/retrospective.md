# 验证返工复盘

新增 family-identity 模块后，locale 测试夹具仍只复制旧的两个 src 文件，导致两个 CLI 的同一测试失败。已将夹具改为复制完整 src，并为执行身份检查的最小模板补真实 YAML vendor/profile；重跑 spec 全套 8 项、dev 全套 7 项 sync 测试通过。今后新增模块无需逐项维护文件复制名单。

包级验收初稿对所有模板调用 verify-entry-alignment，但 spec 分发不提供该命令。已改成所有模板的通用 Skill 检查，加 dev/design 专属 verify-harness-profile；实际包验收及 Node 22/24 验证通过。规则落实在 verify-cli-upgrade.mjs，独立审查已重新绑定修正候选。

早期并行测试运行被中断，不能确定根因是交互读取；独立交互检查通过。后续按固定输入、串行测试文件、等待完整输出处理，不将中断记录计入验收成功。快照可变测试与打包/跨仓验收保持串行，避免输入漂移。
