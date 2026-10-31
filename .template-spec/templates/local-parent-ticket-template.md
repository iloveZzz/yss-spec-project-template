---
tracker: "<local-markdown | github | gitlab>"
publication: "<local | pending>"
pending_publication_to: "<none | github | gitlab>"
---

# 功能父 Ticket：<功能名称>

默认 Local Markdown 填写 `tracker: local-markdown`、`publication: local`、`pending_publication_to: none`；若选定的远程平台不可用，填写目标平台、`publication: pending` 和对应的 `pending_publication_to`。

> Local Markdown 主 tracker 的功能父 Ticket。文件位于配置的功能包根，示例为 `.work/<feature>/parent-ticket.md`。
> 若明确选择的 GitHub / GitLab 暂不可用，将 `tracker` 改为目标平台、`publication` 改为 `pending`，并填写 `pending_publication_to`；不得改投另一平台。

## 功能包

| 字段 | 值 |
|---|---|
| feature | `<feature>` |
| spec | `.work/<feature>/spec.md` |
| map | `.work/<feature>/map.md` |
| remote_mirror | none / GitHub URL / GitLab URL |
| last_sync | local / `<timestamp>` |
| publication | local / pending |
| pending_publication_to | none / github / gitlab |

## 生命周期查询

查询不写文件，也不授予执行权限。批准依据仍读取下方批准记录。

## 资产与证据

- Plan：`.work/<feature>/plan/`
- Spec Delta：`.work/<feature>/spec-delta/`
- Design：`.work/<feature>/design/`
- API：`.work/<feature>/api/`
- Architecture：`.work/<feature>/architecture/`
- Gates：`.work/<feature>/gates/`
- Verification：`.work/<feature>/verification/`
- Vertical slices：`.work/<feature>/issues/`

## 批准记录

|---|---|---|

## 拆分与就绪

| 维度 | 资产与证据入口 |
|---|---|
| 业务拆分 | <business-ticket-set.yaml / 业务正式化记录> |
| 实现拆分 | <issues/ 与 Ticket 正式化记录> |
| 实现就绪 | <当前合同批准、仓库准备与就绪检查引用> |

如声明业务集合已同步，在 frontmatter 增加 business_ticket_set_ref 与 business_ticket_set_digest（当前集合原字节），不复制票据正文。
