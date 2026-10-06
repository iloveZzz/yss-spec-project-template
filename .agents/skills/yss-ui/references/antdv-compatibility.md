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

记录包管理器、lockfile、精确版本和验证命令。交付路径沿用 `yss-ui` 消费的当前生命周期 `route`；目标项目未安装的依赖不能自行添加或升级，`daily` 须由同一任务的现有授权与允许范围覆盖，`governed` 须由批准合同明确允许。引入的新影响仍按唯一政策核验，不因普通路径获得额外授权。

## 事实优先级

项目冻结基线 → lockfile/类型 → 已验证项目用法 → 对应版本 YSS 文档 → 对应版本 AntDV 官方文档 → 最新官网。

## Ant Design v6 边界

Ant Design v6 是产品原型默认的主题样式、视觉和 token 语义标准；Vue 生产实现使用 Ant Design Vue 4.x。版本号不同本身不是冲突。任务实际采用原型时，生产映射须消费原型证据中的 `visual_semantic_mapping`；已核验 `daily` 的既有界面小改按当前任务验收与已有工程参照核对视觉语义，不补建原型包。两者均用实现仓 lockfile/类型验证 YSS 或 AntDV 目标，禁止复制 React hooks、JSX、组件 props、theme algorithm API 或事件模型到 Vue 代码。

## 兼容性证据

任何版本升级至少执行 lint、type-check、组件测试和受影响页面验证，并记录破坏性变化、回滚版本和 YSS Wrapper 影响。
