---
name: yss-file
description: 用于 YSS 文件基础组件、文件客户端、文件公共模型、文件管理服务、文件解析、上传下载和文件元数据排障。
---

# yss-file

Use this skill for YSS 文件组件. Keep implementation grounded in the local project and resolvable YSS backend component source.

中文说明：本技能用于 YSS 文件组件。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-source-index/references/source-location.md`.
- Generated index: `references/source-index.md`
- Component path hints: `yss-microservice-components/yss-component-file`, `yss-microservice-components/yss-component-file-parser`, `yss-microservice-components/yss-component-filemanager-common`

Read `references/source-index.md` as a path-hint index whenever the task depends on exact modules, annotations, auto configuration, properties, controllers, clients, repositories, DTOs, handlers, or troubleshooting.

## Workflow

1. Identify whether the task is storage client integration, file-manager API, file parser/import job, SFTP common support, or file metadata management.
2. Read `references/source-index.md`, then choose the right submodule before editing.
3. For storage backends, inspect storage modules: adapter, ftp, henghefs, local, minio, s3, sftp.
4. For file manager APIs, inspect `FileController`, `FileConfigController`, `FileGroupController`, `FileService`, repositories, DTOs, and release/history/tag entities.
5. For file parsing, inspect `DataImportFileJob`, `DataImportDataJob`, and readers for CSV, DBF, Excel, MDB, PDF, Word, and Map data.
6. For Camel upload route/starter behavior, inspect the file-related entries in this skill's `references/source-index.md` and the local filemanager source directly.

## Capability Split

- Storage client: `storage-local`, `storage-minio`, `storage-s3`, `storage-sftp`, `storage-ftp`, `storage-henghefs`.
- Common file protocol: `FsResponse`, command objects, file object DTO, status/result models.
- File manager: file/group/config controllers, file history/tag/release state, permission and user services.
- File parser: import jobs, execution context, multi-format readers, PDF Tabula extraction classes.

## Checklist

- Required dependency or starter module is present.
- Storage backend is chosen before adding configuration.
- File metadata and physical storage operations stay consistent.
- Stream/download paths close resources and handle large files.
- Parser jobs validate file type and encoding before import.
- User/permission context is explicit for file-manager operations.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.
