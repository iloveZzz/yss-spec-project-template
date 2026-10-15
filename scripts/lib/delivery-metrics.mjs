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

export function collectDeliveryMetrics(root = process.cwd()) {
  const base = fs.realpathSync(root);
  const result = {
    schema_version: 1,
    scan_roots: [],
    governed: { checkpoints: 0, by_status: {}, by_stage: {}, blocked: 0, not_applicable: {}, blockers_open: 0 },
    daily: { records: 0 },
    unavailable: {
      daily_rejection_reasons: "路径判定是只读命令，不落盘；被拒原因只在命令输出里，这里无法统计",
      rework_rounds: "现行记录没有返工轮次字段",
      review_blocking_findings: "审查结论以自由文本写在任务记录里，没有可机读的阻断项计数",
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
      } else if (file.endsWith(".md") && fs.readFileSync(file, "utf8").includes(DAILY_EVIDENCE_MARKER)) {
        result.daily.records += 1;
      }
    });
  }
  const total = result.governed.checkpoints + result.daily.records;
  result.daily.share = total ? Math.round((result.daily.records / total) * 1000) / 1000 : null;
  return result;
}
