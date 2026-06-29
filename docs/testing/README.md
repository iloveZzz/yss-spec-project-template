# 测试策略 (Testing Strategy)

> **覆盖全流程：单元 → 集成 → E2E → 性能 → 安全**

---

## 测试金字塔

```
           ┌──────┐
           │ E2E  │  ← Playwright (关键流程 100% 覆盖)
           ├──────┤
           │ 集成  │  ← pytest + httpx (API 端点)
           ├──────┤
           │ 单元  │  ← pytest + vitest (Service/Hook/组件)
           └──────┘
```

---

## 各层测试策略

### 单元测试 (Unit)

| 层级 | 工具 | 覆盖率 | Mock 策略 |
|------|------|--------|----------|
| 后端 Service | pytest | ≥90% | Mock DB/外部API，不 mock 内部 Service |
| 后端 Model | pytest | ≥90% | 验证字段定义/约束 |
| 前端 Hook | vitest | ≥90% | Mock API 调用 |
| 前端 工具函数 | vitest | ≥90% | 纯函数不 mock |

### 集成测试 (Integration)

| 层级 | 工具 | 覆盖率 | 策略 |
|------|------|--------|------|
| API 端点 | pytest + httpx + ASGITransport | ≥80% | 真实路由 + Mock 数据层 |
| 数据库 (未来) | pytest + test DB | ≥80% | 每测试独立事务，自动回滚 |

### E2E 测试

| 场景 | 工具 | 策略 |
|------|------|------|
| 关键业务流程 | Playwright | 100% 覆盖 |
| 视觉回归 | Playwright + screenshot | 关键页面 |
| 跨浏览器 | Playwright (Chromium + Firefox) | 关键流程 |

### 性能测试

| 指标 | 工具 | 目标 |
|------|------|------|
| API 响应时间 | locust / k6 | P99 ≤ 200ms |
| 并发用户 | locust | 1000 并发 P99 ≤ 500ms |

### 安全测试

| 检查项 | 工具 | 频率 |
|--------|------|------|
| 依赖漏洞 | pip audit / npm audit | 每次 PR |
| 代码安全 | bandit (Python) | 每次 PR |
| SAST | semgrep | 每次 PR |

---

## AI 在测试中的角色

### 1. 测试生成 Agent — 分析影响范围，自动生成测试

```python
delegate_task(
    goal="分析本次 PR diff，生成被修改代码的针对性测试",
    context="""
    分析 git diff，对每个修改的函数：
    1. 识别未覆盖的代码路径
    2. 生成单元测试 (边界值/等价类/异常路径)
    3. 如果修改了 API 端点，生成集成测试
    
    输出：可直接运行的测试代码
    """,
    toolsets=["terminal", "file"]
)
```

### 2. 失败诊断 Agent — 测试失败时辅助定位

```python
delegate_task(
    goal="分析测试失败日志，定位根因",
    context="""
    失败测试输出：[贴入 pytest/vitest 输出]
    
    1. 归类失败 (代码bug / 测试bug / 环境问题)
    2. 定位最可能的根因文件+行号
    3. 给出修复建议
    """,
    toolsets=["terminal", "file"]
)
```

---

## 质量门禁

| 门禁 | 条件 | 阻断级别 |
|------|------|---------|
| 单元测试 | 100% pass | 🔴 阻断合入 |
| 集成测试 | 100% pass | 🔴 阻断合入 |
| 覆盖率 | ≥80% (新增代码) | 🟡 警告 |
| Lint | 0 error | 🔴 阻断合入 |
| 安全扫描 | 0 high/critical | 🔴 阻断合入 |
| 发布门禁 | 项目定义的质量门禁通过 | 🔴 阻断合入 |
