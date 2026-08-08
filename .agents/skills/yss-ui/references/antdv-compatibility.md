# Ant Design Vue 兼容策略

快照日期：2026-08-08。

## 当前已知基线

- Ant Design Vue 官网组件概览当日展示版本：`4.2.6`。
- 本地 YSS UI 安装快照声明：YSS UI `1.x`、Vue `3.3+`、Ant Design Vue `4.0+`、VXE Table `4.5+`。
- 上述范围不是目标项目的实际版本，生产实现必须读取目标仓库 lockfile。

## 资料来源与新鲜度

| 资料 | 快照 / 检查时间 | SHA-256 / 版本信号 |
|---|---|---|
| `references/frontend-docs.md` | 2026-06-29 | `062d818a8d9f3c3ee6a62e6ac561cff00e5bfe7033d60c1e0a10dc7fd4c32b1e` |
| `assets/docs/guide/installation.md` | 2026-08-08 校验 | `53ebe138efeb3b7e4a66ae9f5d87e9aad895649c22cab429e8c09ed248580c3f` |
| AntDV Components Overview | 2026-08-08 浏览器核对 | 页面版本信号 `4.2.6` |

本地文档内容变化时必须更新哈希、版本矩阵和三个索引；仅更新时间而没有 fresh verification 不构成已同步。

## 实现前命令

```bash
pnpm why vue @yss-ui/components @yss-ui/hooks ant-design-vue vxe-table
```

记录包管理器、lockfile、精确版本和验证命令。若目标项目未安装某依赖，不得自行添加或升级，除非批准合同明确允许。

## 事实优先级

项目冻结基线 → lockfile/类型 → 已验证项目用法 → 对应版本 YSS 文档 → 对应版本 AntDV 官方文档 → 最新官网。

## Ant Design v6 边界

Ant Design v6 可以作为产品原型的视觉和 token 语义参考；Vue 生产实现使用 Ant Design Vue 4.x。禁止复制 React hooks、JSX、组件 props、theme algorithm API 或事件模型到 Vue 代码。

## 兼容性证据

任何版本升级至少执行 lint、type-check、组件测试和受影响页面验证，并记录破坏性变化、回滚版本和 YSS Wrapper 影响。
