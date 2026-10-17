import fs from "node:fs";
import path from "node:path";
import { parseDocument } from "../vendor/yaml.mjs";
import { workScanRoots } from "./work-layout.mjs";

// 只读统计项目实例里已有的记录：正式功能的 checkpoint 与日常任务记录。
// 记录里没有的字段输出 null 并写明原因，不推测，也不要求新增记录字段。
export const DAILY_EVIDENCE_MARKER = "<!-- yss-task-evidence -->";

function walk(directory, visit) {
  let entries;
  try { entries = fs.readdirSync(directory, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".work" || entry.name === "node_modules") continue;
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) walk(full, visit);
    else if (entry.isFile()) visit(full);
  }
}

function readCheckpoint(file) {
  try {
    const text = fs.readFileSync(file, "utf8");
    const doc = file.endsWith(".json") ? JSON.parse(text) : parseDocument(text).toJS();
    return doc && typeof doc === "object" && doc.repository_mode === "project-instance" && typeof doc.stage === "string" && typeof doc.status === "string" ? doc : null;
  } catch { return null; }
}

// 日常 / standard 记录的证据段：标记后紧跟一个 fenced JSON；解析失败只计入 unparsed，不猜字段。
export function dailyEvidence(text) {
  const at = text.indexOf(DAILY_EVIDENCE_MARKER);
  if (at < 0) return null;
  const match = text.slice(at + DAILY_EVIDENCE_MARKER.length).match(/^\s*```json\n([\s\S]*?)\n```/);
  if (!match) return undefined;
  try { const value = JSON.parse(match[1]); return value && typeof value === "object" ? value : undefined; } catch { return undefined; }
}

// 进度只按记录里已有的证据判定：无实现 → planned；有实现无通过审查 → implemented；审查通过且无开放阻断项 → reviewed-passed。
function progress(record) {
  const review = record.review;
  if (review && review.result === "passed" && Array.isArray(review.blocking_findings) && review.blocking_findings.length === 0) return "reviewed-passed";
  return record.implementation ? "implemented" : "planned";
}

// 澄清记录表格行：| CQ-n | … | 状态 |，按最后一列统计。
function clarificationRows(text) {
  const rows = { open: 0, decided: 0, superseded: 0, other: 0 };
  for (const line of text.split("\n")) {
    const cells = line.split("|").map((cell) => cell.trim());
    if (!/^CQ-\d+$/.test(cells[1] ?? "")) continue;
    const state = cells[cells.length - 2];
    rows[state in rows ? state : "other"] += 1;
  }
  return rows;
}

export function collectDeliveryMetrics(root = process.cwd()) {
  const base = fs.realpathSync(root);
  const result = {
    schema_version: 1,
    scan_roots: [],
    governed: { checkpoints: 0, by_status: {}, by_stage: {}, blocked: 0, not_applicable: {}, blockers_open: 0 },
    daily: { records: 0 },
    single_record: {
      by_path: {}, by_progress: {}, unparsed: 0,
      open_blocking_findings: 0, standard_decisions: 0,
    },
    clarification: { logs: 0, open: 0, decided: 0, superseded: 0, other: 0 },
    unavailable: {
      daily_rejection_reasons: "路径判定是只读命令，不落盘；被拒原因只在命令输出里，这里无法统计",
      rework_rounds: "记录只保存当前证据，不保留历次审查或测试轮次",
      cycle_time: "记录没有开始时间，无法计算周期",
    },
  };
  const roots = workScanRoots(base).filter((ref) => fs.existsSync(path.join(base, ref)));
  result.scan_roots = roots;
  for (const ref of roots) {
    walk(path.join(base, ref), (file) => {
      const relative = path.relative(base, file).split(path.sep).join("/");
      if (/\.(json|ya?ml)$/.test(file)) {
        // checkpoint 位于 <根>/<功能>/ 下一层，避免把证据和模板文件误当 checkpoint。
        if (relative.split("/").length - ref.split("/").length !== 2) return;
        const doc = readCheckpoint(file);
        if (!doc) return;
        const governed = result.governed;
        governed.checkpoints += 1;
        governed.by_status[doc.status] = (governed.by_status[doc.status] ?? 0) + 1;
        governed.by_stage[doc.stage] = (governed.by_stage[doc.stage] ?? 0) + 1;
        if (doc.status === "blocked") governed.blocked += 1;
        if (Array.isArray(doc.blockers)) governed.blockers_open += doc.blockers.length;
        const items = doc.human_review?.not_applicable;
        if (Array.isArray(items)) for (const item of items) {
          const key = typeof item === "string" ? item : item?.gate ?? item?.id ?? "unknown";
          governed.not_applicable[key] = (governed.not_applicable[key] ?? 0) + 1;
        }
      } else if (file.endsWith(".md")) {
        const text = fs.readFileSync(file, "utf8");
        if (file.endsWith("/clarification-log.md")) {
          const rows = clarificationRows(text);
          result.clarification.logs += 1;
          for (const [key, count] of Object.entries(rows)) result.clarification[key] += count;
        }
        if (!text.includes(DAILY_EVIDENCE_MARKER)) return;
        result.daily.records += 1;
        const record = dailyEvidence(text);
        const single = result.single_record;
        if (!record) { single.unparsed += 1; return; }
        const pathName = typeof record.delivery_path === "string" ? record.delivery_path : "undeclared";
        single.by_path[pathName] = (single.by_path[pathName] ?? 0) + 1;
        const stage = progress(record);
        single.by_progress[stage] = (single.by_progress[stage] ?? 0) + 1;
        if (Array.isArray(record.review?.blocking_findings)) single.open_blocking_findings += record.review.blocking_findings.length;
        if (record.standard_decision?.decision === "approved") single.standard_decisions += 1;
      }
    });
  }
  const total = result.governed.checkpoints + result.daily.records;
  result.daily.share = total ? Math.round((result.daily.records / total) * 1000) / 1000 : null;
  return result;
}
