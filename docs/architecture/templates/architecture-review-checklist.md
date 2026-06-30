# 架构审查检查清单

> 每次技术方案评审时逐项检查。AI 预审 + 架构师终审。

---

## 1. 可扩展性 (Scalability)

- [ ] 服务是否可独立部署和水平扩展？
- [ ] 数据库是否支持读写分离 / 分库分表规划？
- [ ] 是否有无状态设计（状态外置到 Redis/DB）？
- [ ] 服务边界是否合理（单一职责，不过大也不过度拆分）？
- [ ] 是否有服务发现 / 负载均衡方案？

## 2. 安全性 (Security)

- [ ] 认证链路完整：用户 → API Gateway → Service → DB
- [ ] 授权模型明确：RBAC / ABAC / OAuth2 Scope
- [ ] 密码存储：bcrypt / argon2（禁止明文/SHA/MD5）
- [ ] Token 管理：JWT 含 exp / 支持 refresh / 黑名单机制
- [ ] API 输入校验：所有外部输入经过 Schema 校验
- [ ] SQL 注入防护：100% 参数化查询（禁止字符串拼接）
- [ ] XSS 防护：前端禁止 innerHTML / v-html 直接渲染用户输入
- [ ] CSRF 防护：SameSite Cookie / CSRF Token
- [ ] 敏感数据：PII 加密存储，日志脱敏
- [ ] 依赖安全：定期 npm audit / pip audit

## 3. 性能 (Performance)

- [ ] 数据库查询有索引计划（explain analyze 验证）
- [ ] 热点数据有缓存策略（Redis / 本地缓存 / CDN）
- [ ] N+1 查询已识别并消除（eager loading / batch query）
- [ ] 连接池配置合理（DB pool size / HTTP keep-alive）
- [ ] 大列表分页（cursor-based > offset-based）
- [ ] 大文件流式处理（不一次性加载到内存）
- [ ] 异步处理：耗时操作走消息队列（Kafka / Celery）
- [ ] 静态资源 CDN + 压缩 (gzip/brotli)

## 4. 可靠性 (Reliability)

- [ ] 关键路径有降级方案（服务不可用时的 fallback）
- [ ] 外部依赖有超时 + 重试 + 熔断
- [ ] 数据一致性方案明确（强一致 / 最终一致 / 补偿）
- [ ] 幂等性：支付/下单等关键操作支持幂等
- [ ] 健康检查端点：/health 返回依赖状态
- [ ] 优雅关闭：SIGTERM 时完成进行中的请求

## 5. 可维护性 (Maintainability)

- [ ] 架构决策已记录为 ADR
- [ ] OpenAPI Draft 已经架构 / OpenSpec 校验，并在开发前 Freeze
- [ ] 关键流程有日志 (结构化日志，含 trace_id)
- [ ] 监控指标已定义 (RED: Rate/Errors/Duration)
- [ ] 告警规则已配置 (P99 延迟、错误率、磁盘)
- [ ] 数据库迁移脚本可回滚 (含 downgrade)

## 6. 成本 (Cost)

- [ ] 是否引入了不必要的技术组件？（YAGNI）
- [ ] 云资源是否按需配置？（避免 over-provisioning）
- [ ] 是否有冷数据归档策略？
- [ ] 团队是否有维护该技术栈的能力？

---

## 审查结论

| 维度 | AI 预审评分 | 人工终审评分 | 备注 |
|------|-----------|------------|------|
| 可扩展性 | /5 | /5 | |
| 安全性 | /5 | /5 | |
| 性能 | /5 | /5 | |
| 可靠性 | /5 | /5 | |
| 可维护性 | /5 | /5 | |
| 成本 | /5 | /5 | |

### 是否通过

- [ ] ✅ 通过 — 进入 Build 阶段
- [ ] ⚠️ 有条件通过 — 需在 Sprint X 前解决以下问题：
- [ ] ❌ 不通过 — 需要重新设计

### 待解决项

| 问题 | 严重程度 | 解决方案 | Due | Owner |
|------|---------|---------|-----|-------|
| | | | | |
