---
name: yss-mail
description: 用于 YSS mail starter、邮件发送、邮件配置、SMTP 集成和邮件发送失败排障。
---

# yss-mail

Use this skill for YSS 邮件组件. Keep implementation grounded in the local project and resolvable YSS backend component source.

中文说明：本技能用于 YSS 邮件组件。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-source-index/references/source-location.md`.
- Generated index: `references/source-index.md`
- Component path hints: `yss-microservice-components/yss-component-mail-starter`

Read `references/source-index.md` as a path-hint index whenever the task depends on exact modules, annotations, auto configuration, properties, controllers, clients, repositories, DTOs, handlers, or troubleshooting.

## Workflow

1. Identify whether the task is SMTP sending, attachment sending, validation, configuration, or send-failure troubleshooting.
2. Read `references/source-index.md`, then inspect `SendMail`, `SmtpEmailRequest`, and `MailParamsConstants`.
3. Use `SendMail.sendEmailBySmtp(SmtpEmailRequest)` for SMTP sends; it builds a JavaMail `Session`, MIME body, and optional attachments.
4. Build requests with host, port, username, password, from, to, subject, content, `useSSL`, and optional `mapFile`.
5. Externalize SMTP credentials and host/port; do not hardcode them in business code.
6. Surface `MessagingException` to the caller or map it through the project's exception policy.

## Source-Backed Notes

- `SmtpEmailRequest` uses validation annotations for required fields.
- Attachments are provided as `Map<String, byte[]>`.
- The current send method sets `mail.smtp.auth=true` and controls `mail.smtp.starttls.enable` with `useSSL`.

## Checklist

- Required dependency or starter module is present.
- SMTP host/port/auth/TLS settings match the mail server.
- Passwords and SMTP tokens are externalized.
- Attachment filenames and byte arrays are non-null.
- Multiple recipients are formatted correctly for `InternetAddress.parse`.
- Sensitive content is not logged.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.
