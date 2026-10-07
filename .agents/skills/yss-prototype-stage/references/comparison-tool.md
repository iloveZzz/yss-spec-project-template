# 离线候选比较工具 v2

比较包仅为 review-only 辅助快照，不取代正式原型、Prototype Evidence v4、Visual Baseline v1 或用户决定。2–3 个候选逐个原尺寸显示；条件探索仍使用三个。

## 共同输入

每个候选包含字节相同的 `scenarios.json`、由工具生成的 `scenarios.js`、`scenario-runtime.js` 及项目 `tokens.css`。场景 JSON 使用 schema_version=1，scenarios 中每项包含唯一 id、label、state_ref 与 initial_data 对象；至少有 primary。state_ref 引用已有状态说明；不新增另一套业务状态或批准字段。UI 与模拟服务端快照均来自 initial_data，不能在候选代码另写一套 seed。

页面通过 `window.prototypeRuntime.initialize()` 读取 hash 并取得 `{id, data, ticket}`，data 是初始数据副本。完成数据重置与首次渲染后调用 `ready(ticket)`；异常调用 `fail(error)`。原生和 shadcn starter 已接入。未知、缺失或多余的 hash 参数报错；没有 hash 时才使用 primary。异步初始化也必须等渲染完成后确认，不能在 load 事件直接报成功。

```json
{
  "schema_version": 2,
  "comparison_id": "task-options",
  "title": "资料处理方案",
  "comparison_ref": ".work/demo/design/interaction.md",
  "scenario_ref": ".work/demo/design/shared-scenarios.json",
  "cases": [{"id": "normal", "label": "正常处理", "scenario": "primary"}],
  "variants": [
    {"id": "a", "label": "逐项处理", "root": ".work/demo/design/candidates/a", "entry": "index.html", "cases": ["normal"]},
    {"id": "b", "label": "批量处理", "root": ".work/demo/design/candidates/b", "entry": "index.html", "cases": ["normal"]}
  ]
}
```

比较问题、差异轴、事前标准、保持项与选择代价写在 comparison_ref 中。scenario 引用 JSON 的既有场景 ID，case.id 只是比较入口，不重新定义 Visual Baseline case_id。

```bash
node .agents/skills/yss-prototype-stage/scripts/prototype-comparison.mjs prepare --project-root <项目根> --feature demo --input <比较输入.json>
node .agents/skills/yss-prototype-stage/scripts/prototype-comparison.mjs validate --root <比较包> --project-root <项目根>
node .agents/skills/yss-prototype-stage/scripts/prototype-comparison.mjs seal --root <未批准的v2比较包>
```

输出位于配置的功能包根（示例 `.work/<feature>/design/comparisons/<comparison-id>/`）。prepare 检查 ID 存在、各候选共同数据及派生脚本一致、Token 和资源完整；非空目录拒绝覆盖，失败删除临时包。manifest v2 只保存来源、入口、场景与摘要，不保存批准。

## 初始化与实际评审

候选切换或重置会重建 frame，清除上一个候选的临时数据。外层在页面加载后发送本次初始化标识，候选返回该标识、场景 ID、输入摘要与 pending/ready/error。外层校验来源 frame、标识及预期输入，忽略迟到回复；启动错误、资源错误、初始化错误或 8 秒超时显示失败。收到 load 事件不代表初始化成功。

该确认只证明应用报告了预期初始化，不证明业务逻辑正确。浏览器仍检查实际字段、列表和动作结果，尤其失败保留、取消恢复、确认重载与再次保存。临时内部操作不反向改变外层初始场景。

`#variant=a&case=normal` 为稳定链接；未知候选/场景直接报错。iframe 不缩放，使用当前可用宽度。正式截图通过“原尺寸单独打开”进入候选，设置 1440×900 或 390×844，不把工具外框当成产品基线。工具不跨 frame 读取 DOM，不依赖网络、服务器或 localStorage。

validate 不带 project-root 时仅验证便携快照；带项目根时再检查来源漂移。seal 不更新来源、不产生批准，变更来源需新建比较包。

## 兼容

v1 仅允许 `validate --allow-legacy` 只读检查，结果提示“未验证应用初始化”。默认校验、prepare 和 seal 不接受 v1，不批量改写历史资产。迁移时保留旧包，依据原始候选和当前状态来源生成新的 v2 比较；旧 AntD 资产仍遵守其只读边界。
