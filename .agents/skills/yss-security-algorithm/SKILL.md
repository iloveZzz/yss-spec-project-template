---
name: yss-security-algorithm
description: "审查、迁移或排查既有 YSS 加解密、JWT/JWK、密码编码与密钥使用；当前组件禁止新生产接入。"
---

# yss-security-algorithm

Use this skill as the governance, migration, and troubleshooting entry for the existing YSS 安全算法组件. Keep conclusions grounded in the local project, the approved platform catalog, and resolvable component source.

中文说明：本技能用于 YSS 安全算法组件。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-skill-source-index-refresh/references/source-location.md`.
- Generated index: `references/source-index.md`
- Component path hints: `yss-microservice-components/yss-component-security-algorithm`

Read `references/source-index.md` as a path-hint index whenever the task depends on exact modules, annotations, auto configuration, properties, controllers, clients, repositories, DTOs, handlers, or troubleshooting.

## 当前准入结论

- `yss-component-security-algorithm` 当前只允许既有工程只读盘点、故障分诊、风险收敛和迁移；禁止为新项目、新 Slice 或新生产能力接入。
- Registry provider 使用 `new_adoption: forbidden`，即 new-adoption-forbidden 语义；新接入必须返回稳定失败码 `component-new-adoption-forbidden`，不得因构件可编译、索引 fresh 或平台基础能力通过而放行。
- 硬编码私钥、固定 key id、进程启动时临时生成密钥以及 `noop` password encoder 均不构成生产密钥管理。组件源码可定位或可编译也不能解除该结论。
- 只有平台目录中的 `component.security-algorithm` 对目标架构为 `verified`，精确构件绑定仍有效，并且外部 KMS / Secret Manager、轮换撤销、兼容迁移、行为测试和安全责任人审查全部闭合后，才能通过独立决策重新开放新接入；本 Skill 不自行修改该状态。
- 新接入请求返回 `component-new-adoption-forbidden` / `blocked-for-production`，并给出迁移或外部密钥服务方案；不得生成基于遗留工具类的生产代码。

## Workflow

1. 识别任务是新接入、既有故障、风险止血还是迁移；新接入直接按上述准入结论阻断。
2. 读取 `references/source-index.md`，再按需检查 `CryptoType`、`SecurityCryptoUtil`、`KeyGeneratorUtils` 和 `DefaultJwtConfiguration`，记录实际算法、模式、编码、key id、密钥来源、调用方和持久化数据范围。
3. 对既有使用先完成暴露面和兼容盘点：源码/配置中的密钥材料、JWT 签发与验签方、密码散列格式、密文格式、历史数据、下游消费者及回滚要求。
4. 在 `boot3-java17` 中，`Jwks.generateRsa()`、`generateEc()` 和 `generateSecret()` 是 deprecated fail-closed 入口：它们不生成、不解码密钥，必须抛出错误并要求 managed `JWKSource`。Boot 2 中可能存在的硬编码/临时密钥实现只用于风险盘点，不得迁入 Boot 3。
5. `SecurityCryptoUtil` 是兼容 facade，只有显式安装获批 `SecurityCryptoProvider` 后才委派 encrypt/decrypt；未配置 provider 时 fail closed。provider 必须是外部 KMS / Secret Provider 或经批准的托管加密适配器。
6. `RsaEcbOAEPWithSHA` 保留 deprecated 的 public constructor、`TextEncryptor` 类型和实例 `encrypt` / `decrypt` 签名作为二进制/源码兼容适配器；实现只委派 `SecurityCryptoUtil`，不得恢复内置私钥或自行执行遗留加密。
7. 迁移目标必须使用批准的外部 KMS / Secret Manager 或等价受控密钥服务，应用只保存 key reference/version；密钥材料不得进入源码、普通配置、日志、证据文件或聊天记录。
8. 设计分阶段轮换：冻结新旧写入边界，建立新 key version，双读/多版本解密或离线重加密，验证存量数据和 JWT 消费者，再撤销旧 key；不得直接覆盖旧密钥导致数据或令牌不可恢复。
9. Boot 3 默认密码 Bean 与兼容 public static factory 都调用 `PasswordEncoderFactories.createDelegatingPasswordEncoder()`；不得把 delegating encoder 的默认 id 改回 `noop`。密码迁移仍需兼容升级策略。
10. JWT 必须验证 signature、issuer、audience、expiry 和允许算法，payload parsing 不能充当认证。
11. 输出迁移清单、数据/调用方影响、回滚点、验证结果和安全审查引用；缺任一生产前提时保持 `blocked-for-production`。

## Security Notes

- Boot 2 历史实现中的硬编码 RSA 私钥、固定 key id、临时 JWK 与 noop 默认值必须视为已暴露风险并进入轮换/撤销盘点；不得把这些历史事实误写成 Boot 3 当前实现。
- Boot 3 `Jwks` fail closed，`DefaultJwtConfiguration` 只提供 `PasswordEncoderFactories` 的 delegating encoder；JWT/JWK 必须由应用安全层或外部 KMS 提供。
- 兼容适配器只保留公开类型和方法契约，不恢复旧密钥、旧密文解密或隐式 provider。存量兼容仍需代表性 ciphertext/JWT/password fixtures、回滚点和安全责任人审查。
- Verify whether callers need encryption for storage, transport, signing, or compatibility; choose algorithm and key lifecycle accordingly.
- Prefer environment/config/secret-manager backed keys for deployable code.
- Keep plaintext, ciphertext, encoding format, and key type explicit in API contracts.

## Checklist

- Required dependency or starter module is present.
- Algorithm choice is explicit and compatible with the caller.
- Key source and rotation story are documented for production code.
- JWT signatures are verified with issuer/audience/expiry policy; payload parsing alone is never authentication.
- Encoding format is clear: Base64, hex, UTF-8 string, or raw bytes.
- Decrypt path uses the matching algorithm/key type.
- No passwords, private keys, or long-lived secrets are added to source files.
- If external key storage, rotation/revocation, algorithm parameters, compatibility tests, or security-owner review is missing, return `blocked-for-production` instead of generating crypto code.
- `Jwks` without a managed source and `SecurityCryptoUtil` without an approved `SecurityCryptoProvider` both fail closed.
- Deprecated compatibility adapters delegate to the approved provider and preserve public signatures only; they do not make the component eligible for new adoption.
- Existing ciphertext/JWT/password compatibility is demonstrated with representative fixtures before disabling an old key or encoder.
- Logs and verification evidence contain only key references and redacted metadata, never plaintext, private keys, seeds, shared secrets, or complete tokens.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.
- Do not approve a new integration because the component compiles, a source index is fresh, or an existing project already depends on it.
- Do not copy, print, rotate in place, or reissue any key material through Agent output.

## 平台与源码门禁

接入、修改、代码生成或给出精确类名/配置前，读取 [后端组件平台与源码门禁](../yss-skill-source-index-refresh/references/backend-component-platform-compatibility.md)，从批准的 `platform_configuration.component_platform_line` 选择 `source-index.boot2-java8.md` 或 `source-index.boot3-java17.md`，并以 `--skill yss-security-algorithm --platform-line <line> --source-root <matching-root>` 运行统一 freshness 校验。平台线与源码根不匹配、组件 tree 不一致、组件子树 dirty、索引缺少平台信号，或 Manifest / 组件 GAV 缺少 verified 兼容证据时返回 `blocked`；不得回退另一代索引，也不在业务实现中升级、降级或替换 YSS 组件。既有工程只读分诊可继续，但不得据此宣称跨 Boot/JDK 兼容。
