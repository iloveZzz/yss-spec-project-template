# YSS 技能导出

以 .agents/skills 为内容源，yss-public-skills.json 为公开清单。Agent 直接将本次选定技能复制到目标仓 skills/，保留文件权限和许可证；.workbuddy 与 .claude 只是平台副本，不作为第二份来源。

将内部路径改成包内可用的相对引用，必要的技术资料一同整理。不复制 AGENTS.md、CONTEXT.md、用户数据、凭据或无关源码。不新增导出器、测试或发布门禁。

## 独立消费者的图解参考

`yss-product-lifecycle`、`yss-design-system` 等消费者使用 `.agents/skills/i-have-adhd/references/visual-explanation.md`。项目安装已有共享技能时直接引用，不在每个源技能中复制。独立导出且不能保证安装了 `i-have-adhd` 时，在选定包中整理下列资源：

| 唯一内容源 | 独立包中的路径 |
|---|---|
| `.agents/skills/i-have-adhd/references/visual-explanation.md` | `references/shared/visual-explanation.md` |
| `.agents/skills/i-have-adhd/references/show-me-LICENSE.txt` | `references/shared/show-me-LICENSE.txt` |
| `.agents/skills/i-have-adhd/references/yss-adaptation.md` 的 ShowMe 来源信息 | `references/shared/show-me-source.md`，只记录来源、固定提交、访问日期、适配范围和投影关系 |

从实际消费者正文和模板追踪引用，将图解链接改成相对上述包内路径；方法与许可保持源字节，方法中的许可相对链接保持有效。`show-me-source.md` 链接同目录的方法和许可，不依赖原仓适配说明。主技能的调用权限和对外授权边界保持不变，不因复制参考创建 ShowMe 入口或强制补装共享技能。

这些文件是分发投影，不在目标仓独立改写方法；源变更时同步受影响投影并核对引用和字节。既有其他必要引用仍按原导出约定整理，不能以本次图解引用已修复宣称整个包的所有历史引用都已检查。

沿用目标仓的 README、skills.sh.json 和版本习惯。提交与推送按用户授权执行；仅本地整理时报告尚未发布。
