---
name: yss-security-algorithm
description: 用于 YSS security algorithm、RSA/AES/JWT、SecurityCryptoUtil、KeyPairUtil、DefaultJwtConfiguration 和加解密排障。
---

# yss-security-algorithm

Use this skill for YSS 安全算法组件. Keep implementation grounded in the local project and resolvable YSS backend component source.

中文说明：本技能用于 YSS 安全算法组件。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-source-index/references/source-location.md`.
- Generated index: `references/source-index.md`
- Component path hints: `yss-microservice-components/yss-component-security-algorithm`

Read `references/source-index.md` as a path-hint index whenever the task depends on exact modules, annotations, auto configuration, properties, controllers, clients, repositories, DTOs, handlers, or troubleshooting.

## Workflow

1. Identify whether the task is symmetric encryption, asymmetric encryption, SM algorithms, JWT key generation/configuration, or decryption troubleshooting.
2. Read `references/source-index.md`, then inspect `CryptoType`, `SecurityCryptoUtil`, `KeyGeneratorUtils`, and `DefaultJwtConfiguration`.
3. Use `CryptoType` to route algorithm-specific behavior; current enum values include `RSA`, `AES`, `DES`, `SM2`, and `SM4`.
4. Treat `SecurityCryptoUtil` as a utility implementation reference, not automatically as a production key-management design.
5. For production changes, externalize keys/secrets and avoid copying hardcoded sample keys into business modules.

## Security Notes

- The current utility contains built-in/static key material and fixed key-style behavior in places; do not introduce new hardcoded secrets.
- Verify whether callers need encryption for storage, transport, signing, or compatibility; choose algorithm and key lifecycle accordingly.
- Prefer environment/config/secret-manager backed keys for deployable code.
- Keep plaintext, ciphertext, encoding format, and key type explicit in API contracts.

## Checklist

- Required dependency or starter module is present.
- Algorithm choice is explicit and compatible with the caller.
- Key source and rotation story are documented for production code.
- Encoding format is clear: Base64, hex, UTF-8 string, or raw bytes.
- Decrypt path uses the matching algorithm/key type.
- No passwords, private keys, or long-lived secrets are added to source files.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.
