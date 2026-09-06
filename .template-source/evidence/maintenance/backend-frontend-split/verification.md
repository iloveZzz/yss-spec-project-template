# 本轮验证结果

五个受影响仓库的本轮校验均以退出码 0 完成。主模板和三个研发模板因核心资产变化自动从 fast 升级为 release 检查集；这只表示验证范围，不表示发布获批。

| 仓库 | 耗时 | 退出码 | 日志 |
|---|---:|---:|---|
| . | 64.67s | 0 | [root](root-verification.log) |
| submodules/yss-harness-design-agent | 23.61s | 0 | [design](design-verification.log) |
| submodules/yss-harness-dev-agent | 36.48s | 0 | [dev](dev-verification.log) |
| submodules/yss-harness-backend-agent | 36.66s | 0 | [backend](backend-verification.log) |
| submodules/yss-harness-frontend-agent | 36.71s | 0 | [frontend](frontend-verification.log) |

主模板日志含 8 项交付场景和独立生成实例接力；三个研发模板也分别执行同组交付场景。服务为合成维护测试进程，不是产品部署验收。

[L3 checkpoint](checkpoint.yaml) 与[维护者自检](self-check.md)记录范围及限制。四个子仓库模板代码均已提交并推送；主仓随本次提交更新 gitlink 与 Skill 来源版本，见 [GitHub 交付记录](git-delivery.md)。未发布 npm 包，未宣称产品验收完成。
