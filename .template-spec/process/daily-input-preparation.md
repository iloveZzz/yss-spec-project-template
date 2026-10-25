## 输入摘要准备

先读取 `yss capabilities --json`。仅当 `result.governanceCandidate.interfaces` 包含 `lifecycle.route:prepare-inputs`，且当前记录为 `delivery_path: daily`、`api.mode: none`（Backend 另须 `business_input.mode: standalone`）时，可以使用：

```bash
yss lifecycle route --root __GOVERNANCE_ROOT__ --task __TASK_RELATIVE_PATH__ --implementation-root __ABSOLUTE_IMPLEMENTATION_GIT_ROOT__ --base __FULL_BASE_SHA__ --prepare-inputs --json
```

命令只读返回 `input_preparation.record` 与 `changes`：只更新既有 `skills[].digest`、`inputs[].digest` 及 Backend standalone 的 `business_input.digest`，不改变引用列表、正文或完成证据。审阅每项输入变化后，在已授权的同一 Ticket 写范围内更新 footer，再运行原 route 确认保存后的当前候选；摘要直接消费工具结果，无需手抄。缺少这项可选能力时，CLI 仍须支持当前实例身份与日常政策，才能继续原有输入填写及 route / verify-daily 流程；不使用新参数，也不跳过必要验证。身份或政策不支持时按项目入口处理，不能强行降级。

准备不执行测试，不生成批准，不刷新 tests / review、日志、时间、provenance、标准变更决定或 API Freeze。输入变化使旧候选证据陈旧时，重新执行受影响的实际验证与复核，再登记真实结果并 verify-daily；不能仅回填新摘要续期。standard、API、正式上游和已绑定正式任务继续各自当前流程；不支持、不可读或输入漂移时保留修改与诊断，不转用 Node 校验或自动降级。新参数不能与 `--view agent` 同用；默认 route 输出保持原义。


## 与测试收证的边界

输入摘要准备与真实测试收证分别处理输入和结果。已安装的 `scripts/lib/daily-test-evidence.mjs` 仅供宿主整理无 API 的 record2/policy2 daily / standard 实测结果，操作顺序见当前编排技能的 `references/daily-delivery.md`。它不调用本页命令，不补造时间、批准、实施 provenance 或审查。standard 保持原输入与真实决定，不能传 `--prepare-inputs` 或临时改成 daily 来登记测试。
