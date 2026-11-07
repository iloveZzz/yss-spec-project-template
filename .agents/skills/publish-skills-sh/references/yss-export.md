# YSS 技能导出

以 .agents/skills 为内容源，yss-public-skills.json 为公开清单。Agent 直接将本次选定技能复制到目标仓 skills/，保留文件权限和许可证；.workbuddy 与 .claude 只是平台副本，不作为第二份来源。

将内部路径改成包内可用的相对引用，必要的技术资料一同整理。不复制 AGENTS.md、CONTEXT.md、用户数据、凭据或无关源码。不新增导出器、测试或发布门禁。

## 范围与独立包

先固定本次选定集合与真实源快照。完整对齐按已确认白名单整理全部技能、README、安装说明和分组；部分同步仅更新选定项，不能宣称全仓来自新源。公开版本使用真实模板提交；工作树候选未进入该提交时只报告本地候选，不把 HEAD 冒称全部内容来源。

保留技能正文、必要参考和静态资产、已有 agents/openai.yaml、权限与许可证，不为源中没有的运行时元数据补造统一格式。公开版本使用清单指定的共享源，不用 Backend 专有覆盖或平台副本覆盖共享技能职责。

逐项追踪正文、模板、元数据与资产的必要引用。跨技能方法按既有 references/shared/skills/…、模板资料按 references/shared/template/… 整理为包内资源，并继续修正它们的必要引用，使单项安装也可读取。必要方法使用普通参考文件名，不新增嵌套 SKILL.md 或另一个可发现入口；读取参考不等于安装或执行整个技能。消费项目的 AGENTS、CONTEXT、DESIGN、业务 Spec 和接口仍由消费项目提供，不能用模板样例代替。

历史构建、资格与运行日志只作为来源时，引用实际固定源码链接，不沿链接整目录复制；其中的本机路径和原始环境记录不属于独立包运行资源。区分教学反例故意保留的缺失引用、消费项目输入与真正缺失的包内资源。

保留实际使用资源的第三方许可、来源与归属，增量维护已有 THIRD-PARTY-NOTICES.md；投影方法不在目标仓独立改写，也不把外部内容重新标成分发仓自身许可。独立包完整性按实际引用核对，不以全量预装掩盖缺失。

## 独立消费者的图解参考

`yss-product-lifecycle`、`yss-design-system` 等消费者使用 `.agents/skills/i-have-adhd/references/visual-explanation.md`。项目安装已有共享技能时直接引用，不在每个源技能中复制。独立导出且不能保证安装了 `i-have-adhd` 时，在选定包中整理下列资源：

| 唯一内容源 | 独立包中的路径 |
|---|---|
| `.agents/skills/i-have-adhd/references/visual-explanation.md` | `references/shared/visual-explanation.md` |
| `.agents/skills/i-have-adhd/references/show-me-LICENSE.txt` | `references/shared/show-me-LICENSE.txt` |
| `.agents/skills/i-have-adhd/references/yss-adaptation.md` 的 ShowMe 来源信息 | `references/shared/show-me-source.md`，只记录来源、固定提交、访问日期、适配范围和投影关系 |

从实际消费者正文和模板追踪引用，将图解链接改成相对上述包内路径；方法与许可保持源字节，方法中的许可相对链接保持有效。`show-me-source.md` 链接同目录的方法和许可，不依赖原仓适配说明。主技能的调用权限和对外授权边界保持不变，不因复制参考创建 ShowMe 入口或强制补装共享技能。

这些文件是分发投影，不在目标仓独立改写方法；源变更时同步受影响投影并核对引用和字节。既有其他必要引用仍按原导出约定整理，不能以本次图解引用已修复宣称整个包的所有历史引用都已检查。

## 目录、旧入口与来源记录

README、安装示例和 skills.sh.json 分组使用同一选定集合，保留元数据格式与无关内容。仅当本次范围明确要求停止分发时，移除旧入口、其独占的已管理资源及对应目录/分组/来源记录；共享资源按实际引用保留。未知文件或用户定制先保留并说明冲突，不整仓清空。README 说明替代技能或流程取消，不创建兼容空技能，也不自动删除消费项目的旧文件。

目标仓已有 .yss-export-manifest.json 时沿用其格式：source 记录真实仓库、内容源和提交；skills 的逐项 source_commit、files 与实际包一致；generated_files_sha256 记录最终公开文件的真实摘要，包括改写正文和投影资源，删除失效记录。全量同步使用同一实际源提交；部分同步保留未更新项的真实来源，不新增 schema、旁路锁或生成器。

公开仓更新与 CLI Bundle 更新是两条路径。README 记录真实同步日期与来源，区分模板源提交和分发提交；尚未发行的新 Bundle 不冒称当前 CLI 已携带。受管项目需要相应 CLI 和明确的项目同步，独立技能通过原安装来源更新；同名路径先确认所有权和定制，不互相覆盖。

沿用目标仓版本习惯。提交与推送按用户授权执行；仅本地整理时报告尚未发布，不将 GitHub 推送等同于宿主加载、安装成功或 skills.sh 收录。
