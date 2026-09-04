# 技能迁移说明

本文记录已退役技能入口的迁移路径。退役技能不保留物理目录、投影或 lock 条目；本文件是历史名称的唯一持久兼容说明。

## 实现合同与源码索引技能硬替换（2026-09-04）

`yss-router` 已由 `yss-implementation-contract-compiler` 硬替换；`yss-source-index` 已由 `yss-skill-source-index-refresh` 硬替换。两个旧 ID 不保留 alias、兼容目录、投影或 lock 条目，也不能作为 Recipe、合同、模板或脚本的正向输入。

同步升级内容：

- 技能注册表和调用者使用新 canonical ID；Registry、编译器合同、Slice Implementation Contract 与 YSS Skill Execution Result 使用 schema v2。
- Recipe 只引用 dotted capability；类型化依赖只由 `docs/agents/yss-skill-registry.yaml` 持有。
- 旧 schema v1 输入明确拒绝并返回迁移提示，不自动升级。
- 历史冻结证据和不可变候选快照不改写。旧 ID 仅可继续出现在本迁移记录、`OBSOLETE` 阻断集合及负向测试中。

## high-fidelity-html-prototype

`high-fidelity-html-prototype` 已退役，不再作为 实现合同编译器 alias、默认发现入口或独立物理技能存在。

新工作迁移到：

- 阶段合同：`yss-prototype-stage`
- 原型档位与主入口：`yss-prototype-stage` 的 H1/H2 路由
- Codex 产品设计能力：按档位条件使用 `product-design:index`
- Ant Design v6 事实与 CLI：仅相关 H2 使用 `yss-antd-design`
- 真实组件核验：不属于原型档位；进入已批准切片后由 `yss-ui` 基于目标 lockfile 执行，并写入前端实现验证
- 独立低保真评审：`prototype-review`

已关闭的 schema v1/v2、旧 artifact ID、AntD CLI、浏览器验证和确认记录只读保留。在途工作迁移到 schema v3 与 `artifact.prototype-deliverable` 后再关闭门禁；不得创建同名兼容目录或删除历史证据。
