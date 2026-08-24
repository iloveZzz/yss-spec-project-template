# llm-wiki 接入 — focused-independent 双轴审查

日期：2026-08-23  
模式：worktree · 基线 `HEAD` `47eaf46`  
digest：`014603093828085c0b3996564283c8944edb3eb42b2b8f3d29e2304e7f6a3470`  
规格：计划「接入 llm-wiki」

本文件是接入候选的非实施者双轴审查记录。后续按 finding 的修复不在此审查范围内，不得据此宣布修复可发布。

## Standards（摘要）

硬违规：checkpoint 预填独立审查 `pass`；`lint.md` 承诺的 sha256 / 跨路径 wikilink 检查脚本未实现；`schema.md` 把本仓简体中文写进通用 skill。

判断性味道：`exists()` 重复；`CLAUDE.md` 职责混杂；入口表重复。

## Spec（摘要）

缺失：fresh verify 只有自述 pass；独立审查未按「待非实施者」留下。  
越界：checkpoint 写成已完成独立审查；`documents` profile 混入 `code-surface`；`CLAUDE.md` 超出模板。  
做错：若干文章 H1 与文章 ID 不一致。
