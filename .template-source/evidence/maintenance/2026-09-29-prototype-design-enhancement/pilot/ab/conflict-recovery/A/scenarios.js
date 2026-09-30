/* fixture/data.json copied as offline data; no request or storage required. */
window.fixtureRecords = [
  {
    "id": "M-001",
    "name": "季度经营分析资料",
    "owner": "张明",
    "status": "待核对",
    "checks": 120,
    "errors": 4,
    "updated": "2026-09-29 09:30"
  },
  {
    "id": "M-002",
    "name": "跨部门业务协作与异常处理说明（长名称示例）",
    "owner": "李华",
    "status": "待核对",
    "checks": 80,
    "errors": 3,
    "updated": "2026-09-29 10:00"
  },
  {
    "id": "M-003",
    "name": "归档清单",
    "owner": "",
    "status": "待处理",
    "checks": 40,
    "errors": 2,
    "updated": "2026-09-29 10:30"
  }
];
window.prototypeScenarios = [
  { id: "primary", label: "正常保存", hint: "编辑名称与负责人后保存，查看保存结果。" },
  { id: "failure", label: "保存失败", hint: "首次保存模拟失败，输入保留；重试后成功。" },
  { id: "conflict", label: "并发冲突", hint: "首次保存触发冲突；主动重新加载当前版本后可再次保存。" }
];
