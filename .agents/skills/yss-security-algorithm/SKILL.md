---
name: yss-security-algorithm
description: Use when YSS RSA/AES/DES/SM2/SM4 encryption, JWT/JWK configuration, password encoding, key loading, rotation, or decryption failures are involved.
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
4. Treat `SecurityCryptoUtil` and `Jwks` as compatibility/legacy references only. The current `Jwks.generateRsa()` decodes hardcoded `PK`/`SK` constants rather than generating or loading a managed key, while EC/secret keys can be process-local or regenerated at startup; none is production key management.
5. For production changes, externalize keys/secrets and avoid copying hardcoded sample keys into business modules.

## Security Notes

- The current utility contains a complete hardcoded RSA private key and fixed key material; do not use it for production data. Existing exposure requires rotation/revocation planning, not merely avoiding new constants.
- `Jwks.generateRsa()` contains a complete hardcoded RSA private key; the key identifier is static and must be treated as compromised until rotated.
- `DefaultJwtConfiguration` generates or selects JWK material at startup and currently selects `noop` as the DelegatingPasswordEncoder default; persistence, rotation, an external secret source, and an explicit password-encoder override are production prerequisites.
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

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.
