# L3 REFACTOR 验证

将部署平台、凭据、沙箱和回滚约束从 `backend-agent` skill 的散文说明抽出为独立默认约束文档，并由 Harness profile 引用；同步 `skills-lock.json` 后重新执行 fast 验证，避免重复维护规则。
