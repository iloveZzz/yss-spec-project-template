# 历史机器证据退役执行记录

日期：2026-10-03（Asia/Shanghai）
仓库：`yss-spec-project-template`，`repository_mode: template-source`
执行 HEAD：`60b5acca332a05fc09de647ff18c0c3fb0fa87a7`（分支 `main`）
状态：P0–P3 已执行并留证；P4 生成侧规则已落策略，后续任务观察未完成；未提交、未推送、未发布。

本记录是 [执行方案](./plan.md) 的实施结果，机器可读明细见 [batch-record.json](./p1/batch-record.json)，唯一仓内归档索引见 [.template-source/evidence/archive-index.json](../../archive-index.json)。

## 1. 实施范围与授权

用户指令要求执行本方案。本轮落实范围：`.template-source/evidence/` 下三个优先目录的历史运行材料，按批次整体移出工作树并留可恢复归档。未包含：永久销毁原始证据、改写 Git 历史、提交、推送、发布、修改项目实例、修改核心生命周期注册表 / Schema / 批准语义。

写范围：`.template-source/evidence/**`、`.template-source/scripts/evidence-archive`、`.template-source/scripts/tests/evidence-archive.test.mjs`、`.template-source/process/runtime-storage.md`。未触碰其它并行任务的未跟踪目录，未使用 `reset`、`clean`、`stash`。

## 2. 批次结果

| 批次 | 阶段 | 单元 | 成员 | 归档字节 | 包摘要核验 | 移除后残留 |
|---|---|---|---:|---:|---|---:|
| `2026-10-02-b1-profile-verification` | P2 试点 | `2026-09-12-existing-project-delivery/preflight` | 105 | 1,739,877 | pass（105/105） | 0 |
| `2026-10-02-b2-lifecycle-core-optimization` | P3a | `2026-09-28-lifecycle-core-optimization` | 598 | 170,725,428 | pass（598/598） | 0 |
| `2026-10-02-b3-plan-spec-inputs` | P3b | `2026-09-30-plan-spec-iteration` 三个旧尝试目录 | 97 | 1,765,098 | pass（97/97） | 0 |

执行顺序固定为 plan → pack → verify → remove；每个移除都以绑定该批次包摘要的 pass 报告为前置，工具在缺报告、摘要不符、成员缺失或多余、路径逃逸、打包后并发修改时拒绝执行。

### P2 试点结论

`sync09/cli-results.json` 的四项 `results` 与 `cli-{backend,design,frontend,spec}-result.json` 各自完整对象相等（顶层另有 `recorded_at`、`scratch`、`synthetic_only`）。历史重放脚本 `sync10/verify.py` 与聚合原件整体归档；在归档解包树中该脚本的相对读取 `E.parent/'sync09/cli-results.json'` 解析成功，5,615,201 字节原件可读，未改写脚本、未伪造历史退出码。未发现当前消费者，因此没有新增兼容读取入口，改由 [归档索引](../../archive-index.json) 与轮次索引记录访问方式。

### P3 保留项

- `2026-09-12-existing-project-delivery/maven-adapters-04.json`：被分发模板字面引用，保留在工作树可读；轮次 `evidence-index.md` 改为指向归档索引，无新增断链。
- `2026-09-30-plan-spec-iteration/continuation-verification/`：当前 `maintenance-checkpoint.yaml` 绑定的验证闭包，保留。
- `maintenance-checkpoint.yaml`、`human-evaluation.md`：当前状态与 `pending-human-feedback` 的人工反馈未完成状态，保留，未被当作已解决事项。
- `2026-09-28-lifecycle-core-optimization` 的失败、暂停、完整 Agent 轨迹与未完成边界随归档整体保留，未改写。

## 3. 验证证据

| 验证项 | 方法 | 结果 |
|---|---|---|
| 工具反例 | `node --test .template-source/scripts/tests/evidence-archive.test.mjs` | 14/14 pass |
| 原始材料保真 | 每批在新隔离目录解包后逐文件比对字节、类型、必要 mode | 800/800 成员一致 |
| 当前引用 | 全仓 tracked 文本扫描 Markdown 硬链接与路径引用 | 移除前每批硬引用为 0；被引用入口改为引用归档索引 |
| CLI 汇总等价 | 归档树中比较聚合对象与四份子报告 | 四项内容相等 |
| 历史可恢复 | 归档解包后解析原 `verify.py` 输入相对路径 | 可读，路径保持成立 |
| 拒绝异常归档 | 缺报告 / 摘要不符 / 缺成员 / 多余成员 / 路径逃逸 / 并发修改 | 工具全部拒绝，原材料可恢复 |
| 范围保护 | 对比执行前后 Git index、HEAD 与子仓状态 | 仅本批授权路径变化；子仓未变 |

### 模板核验的限制（必须如实记录）

执行前的一次 `scripts/verify-template-fast` 运行在 `pnpm --dir .template-source/tooling/node test` 阶段以 `tooling-input-drift` 失败。该守卫对 Git 可见的**全部**文件（含未跟踪）取输入摘要，而本次分析在运行期间写入了本轮的 `.p0/` 与工具文件，因此这次"修改前"基线被自己的并发写入作废；其内部 241 项工具测试全部通过，失败仅来自漂移守卫。这不是被改动引入的缺陷，也不能当作修改前的通过证据。收尾验证在全部写入停止后单独执行，见第 5 节。

## 4. 量化结果

基线取执行前同一 HEAD 的 `git ls-files` 统计，范围 `.template-source/evidence/`。

| 指标 | 基线 | 执行后 | 差值 |
|---|---:|---:|---:|
| 机器文件（json/yaml/yml） | 2,396 | 2,211 | −185 |
| 机器文件字节 | 98,318,361 | 59,345,424 | −38,972,937（−39.64%） |
| 证据范围工作树文件 | 14,864 | 14,137 | −727 |
| 证据范围字节 | 588,855,054 | 371,671,141 | −217,183,913 |
| 字节重复组 / 额外副本 | 78 / 306 | 75 / 303 | −3 / −3 |

机器文件数量与体积的减少是本次目标；人工维护成本、Agent token 与等待时间未实测，不从字数或 MB 推算，也不宣称效率提升比例。工作树以外的归档另有约 174 MB，净收益需扣除保留副本与索引。

## 5. 收尾验证

- 目录布局与证据索引：`scripts/verify-governance-layout`、`.template-source/scripts/evidence-index --check`。
- 工具反例：`node --test .template-source/scripts/tests/evidence-archive.test.mjs`。
- 模板核验：`scripts/verify-template-fast`，在全部写入停止后执行，报告与退出码按实际记录。
- 不宣称 `release-ready`；未执行 `scripts/verify-template`，未进入发布范围。

## 6. 回滚与恢复

1. 每批按 `tar -xzf <archive> -C <repo root>` 恢复到原相对路径，成员清单与原路径见 `archive-index.json` 与各批 `*.manifest.json`。
2. 恢复前若原路径已被后续任务修改或占用，停止覆盖，保留两份材料并交回主控。
3. 工具源码与策略改动仅涉及本记录第 1 节列出的文件，可按本轮精确差异单独回退。

## 7. 未闭合项

| 项 | 说明 |
|---|---|
| P4 观察 | 新生成规则已在 `.template-source/process/runtime-storage.md` 落地，但尚未在后续真实维护任务中观察新机器文件数量与人工步骤。 |
| 归档可访问性 | 归档位于维护者本机 `/Users/zhudaoming/Documents/yss-template-evidence-archive/`，共享获取方式与访问责任未登记，其他机器不可直接访问。 |
| 重复副本去重 | C4 的 306 个字节重复副本未在归档存储中跨包去重，仅在批次内整体归档。 |
| 未提交 | 工作树删除未暂存；提交、推送与发布仍需按授权规则单独执行。 |
