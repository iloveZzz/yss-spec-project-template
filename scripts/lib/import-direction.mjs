import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Node 治理内核的导入方向检查：只读、纯文本解析，不加载任何模块。
 *   1. scripts/lib 与 .template-source/scripts/lib 之间不得有导入环（强连通分量大于 1 的模块集合）；
 *   2. 登记在 core 层的模块只能导入 core 层模块（以及 node: 内置与 ../vendor）。
 * core 层登记在 .template-source/process/node-core-layer.json，只列最底层的读写、schema、注册表、摘要与决定 IO。
 */
export const CORE_LAYER_REGISTRY = ".template-source/process/node-core-layer.json";
const IMPORT = /(?:from\s+|import\s*\(\s*|import\s+)["'](\.\.?\/[^"']+\.mjs)["']/g;

export function scanImports(root) {
  const graph = new Map(), files = new Map();
  const name = ref => ref.startsWith('scripts/lib/') ? ref.slice('scripts/lib/'.length, -4) : ref.slice(0, -4);
  for (const directory of ['scripts/lib', '.template-source/scripts/lib']) {
    const dir = path.join(root, directory);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter(file => file.endsWith('.mjs')).sort()) {
      const ref = `${directory}/${file}`;
      files.set(path.resolve(root, ref), name(ref));
    }
  }
  for (const [file, id] of files) {
    const deps = [...readFileSync(file, 'utf8').matchAll(IMPORT)].map(match => files.get(path.resolve(path.dirname(file), match[1]))).filter(Boolean);
    graph.set(id, [...new Set(deps)]);
  }
  return graph;
}

/** 返回大小大于 1 的强连通分量，每个分量附内部的边（Tarjan，迭代无关，模块数百个以内）。 */
export function findCycles(graph) {
  let counter = 0;
  const index = new Map(), low = new Map(), stack = [], onStack = new Set(), components = [];
  const visit = (node) => {
    index.set(node, counter); low.set(node, counter); counter += 1;
    stack.push(node); onStack.add(node);
    for (const next of graph.get(node) ?? []) {
      if (!index.has(next)) { visit(next); low.set(node, Math.min(low.get(node), low.get(next))); }
      else if (onStack.has(next)) low.set(node, Math.min(low.get(node), index.get(next)));
    }
    if (low.get(node) === index.get(node)) {
      const members = [];
      let member;
      do { member = stack.pop(); onStack.delete(member); members.push(member); } while (member !== node);
      if (members.length > 1 || graph.get(node)?.includes(node)) components.push(members.sort());
    }
  };
  for (const node of graph.keys()) if (!index.has(node)) visit(node);
  return components.map((members) => {
    const set = new Set(members);
    return { modules: members, edges: members.flatMap((from) => graph.get(from).filter((to) => set.has(to)).map((to) => `${from} -> ${to}`)) };
  });
}

export function loadCoreLayer(root) {
  const file = path.join(root, CORE_LAYER_REGISTRY);
  if (!existsSync(file)) throw new TypeError(`缺少 core 层登记: ${CORE_LAYER_REGISTRY}`);
  const registry = JSON.parse(readFileSync(file, "utf8"));
  if (registry.schema_version !== 1 || !Array.isArray(registry.core) || registry.core.some((name) => typeof name !== "string")) throw new TypeError(`core 层登记格式无效: ${CORE_LAYER_REGISTRY}`);
  return new Set(registry.core);
}

export function checkImportDirection(root) {
  const graph = scanImports(root);
  const core = loadCoreLayer(root);
  const violations = [];
  for (const name of core) {
    if (!graph.has(name)) { violations.push({ kind: "unknown-core-module", detail: `${name}：登记在 core 层但 scripts/lib 里没有这个模块` }); continue; }
    for (const dep of graph.get(name)) if (!core.has(dep)) violations.push({ kind: "core-imports-upper", detail: `${name} -> ${dep}：core 层模块不得导入非 core 模块` });
  }
  const cycles = findCycles(graph).map((cycle) => ({ kind: "import-cycle", detail: `${cycle.modules.length} 个模块构成导入环，环内的边：${cycle.edges.join("; ")}` }));
  return { modules: graph.size, core: core.size, violations: [...cycles, ...violations], ok: !cycles.length && !violations.length };
}
