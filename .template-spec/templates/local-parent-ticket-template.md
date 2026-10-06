---
tracker: "<local-markdown | github | gitlab>"
status: ready-for-human
publication: "<local | pending>"
pending_publication_to: "<none | github | gitlab>"
---

# 功能父 Ticket：<功能名称>

本模板以下阶段包适用于 `governed`。已按 `request_triage.delivery_path` 核验的 `daily` 只维护同一记录的范围、验收、工程基线、Skills、实际测试、独立审查、回滚及适用 API 契约审查段；格式见生命周期 `references/daily-delivery.md`，不要创建下方阶段包或批准占位符。正式绑定任务仍使用原路径。

默认 Local Markdown 填写 `tracker: local-markdown`、`publication: local`、`pending_publication_to: none`；若选定的远程平台不可用，填写目标平台、`publication: pending` 和对应的 `pending_publication_to`。

Status: ready-for-human

> Local Markdown 主 tracker 的功能父 Ticket。文件位置固定为 `docs/.scratch/<feature>/parent-ticket.md`。
> 若明确选择的 GitHub / GitLab 暂不可用，将 `tracker` 改为目标平台、`publication` 改为 `pending`，并填写 `pending_publication_to`；不得改投另一平台。

## 功能包

| 字段 | 值 |
|---|---|
| feature | `<feature>` |
| spec | `docs/.scratch/<feature>/spec.md` |
| map | `docs/.scratch/<feature>/map.md` |
| remote_mirror | none / GitHub URL / GitLab URL |
| last_sync | local / `<timestamp>` |
| publication | local / pending |
| pending_publication_to | none / github / gitlab |

## 生命周期查询

Checkpoint：`docs/.scratch/<feature>/checkpoint.yaml`（填写实际存在的路径）。

阶段、阻塞、门禁摘要与下一工作单元从同一 checkpoint 按需查询；本票只保存 Ticket 五态、业务说明与资产入口。

```sh
scripts/lifecycle-status --root . --checkpoint docs/.scratch/<feature>/checkpoint.yaml
scripts/stage-tracking check --root . --checkpoint docs/.scratch/<feature>/checkpoint.yaml
```

查询不写文件，也不授予执行权限。批准依据仍读取下方会签记录。

## 资产与证据

- Plan：`docs/.scratch/<feature>/plan/`
- Spec Delta：`docs/.scratch/<feature>/spec-delta/`
- Design：`docs/.scratch/<feature>/design/`
- API：`docs/.scratch/<feature>/api/`
- Architecture：`docs/.scratch/<feature>/architecture/`
- Gates：`docs/.scratch/<feature>/gates/`
- Verification：`docs/.scratch/<feature>/verification/`
- Vertical slices：`docs/.scratch/<feature>/issues/`

## 会签

会签记录写在 `docs/.scratch/<feature>/gates/<gate-id>-approval.yaml`。会签桶内门禁标为 `approved` 前必须通过 `scripts/verify-approval-record`。

| 门禁 | 记录路径 | 会签角色 |
|---|---|---|
|  | `docs/.scratch/<feature>/gates/<gate-id>-approval.yaml` | 见 `.template-spec/agents/digital-human-roles.yaml` |

会签结果读取记录原件；阻塞关系与下一工作单元读取上述 checkpoint，不在本票重填状态表。

## Comments

## 拆分与就绪

| 维度 | 资产与证据入口 |
|---|---|
| 业务拆分 | <business-ticket-set.yaml / 业务正式化记录> |
| 实现拆分 | <issues/ 与 Ticket 正式化记录> |
| 实现就绪 | <当前合同批准、仓库准备与就绪检查引用> |

如声明业务集合已同步，在 frontmatter 增加 business_ticket_set_ref 与 business_ticket_set_digest（当前集合原字节），不复制票据正文。
