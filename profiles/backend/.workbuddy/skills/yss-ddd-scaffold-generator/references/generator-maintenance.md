# 生成器维护与历史审计

仅维护生成器或审计历史 Manifest 时读取；新生成默认使用直接生成入口，显式合同调用消费批准合同与当前 schema。

生成器必须先调用 `gitSubmoduleScaffoldViolation`，再在 exists / `--force` / rename 之前调用 `refuseGitlinkAsRegularDirectory`。

历史 schema v3/v2 仅用于 Manifest 只读验证和补齐 API 对账后的恢复审计，不用于新生成。
