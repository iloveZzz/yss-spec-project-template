#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BACKEND = {
  "yss-cache": ["yss-microservice-components/yss-component-cache-parent"],
  "yss-mybatis": ["yss-microservice-components/yss-component-persistence"],
  "yss-dto": ["yss-microservice-components/yss-component-dto"],
  "yss-audit-log": ["yss-microservice-components/yss-component-audit-log"],
  "yss-excel-mvc": [
    "yss-microservice-components/yss-component-excel-mvc",
    "yss-microservice-components/yss-component-excel-starter",
  ],
  "yss-distributed-id": [
    "yss-microservice-components/yss-component-distributed-id",
    "yss-microservice-components/yss-component-leaf",
  ],
  "yss-resilience4j": ["yss-microservice-components/yss-component-resilience4j-starter"],
  "yss-validation": [
    "yss-microservice-components/yss-component-validation-engine-parent",
    "yss-microservice-components/yss-component-validation-jsr303",
  ],
  "yss-security-algorithm": ["yss-microservice-components/yss-component-security-algorithm"],
  "yss-userinfo": ["yss-microservice-components/yss-component-userinfo-starter"],
  "yss-exception": ["yss-microservice-components/yss-component-exception"],
};

const FRONTEND = {
  "yss-ui": ["components", "hooks", "skills"],
  "yss-components": ["components"],
  "yss-hook": ["hooks"],
  "yss-ui-business-page-generation": ["components", "hooks", "skills"],
  "yss-use-table-height": ["hooks"],
  "yss-use-tree-height": ["hooks"],
};

const URLS = {
  components: "http://192.168.164.27:3200/components",
  hooks: "http://192.168.164.27:3200/hooks",
  skills: "http://192.168.164.27:3200/skills",
};

const KEYS = [
  "Audit", "Cache", "Clear", "Command", "Configuration", "Controller", "DTO", "Data", "Enable", "Excel",
  "Handler", "Interceptor", "Jdbc", "Mapper", "Mybatis", "Page", "Properties", "Query", "Repository", "Request",
  "Response", "Result", "Update", "Aspect", "Leaf", "Id", "Dir", "Dic", "Dictionary", "File", "Upload", "Log",
  "Message", "Mail", "Liquibase", "Circuit", "Breaker", "Sql", "Tpl", "Tag", "Task", "Flow", "Report",
  "Validation", "Validator", "Security", "Crypto", "User", "Variable", "Quality", "Search", "Similarity",
  "Scheduler", "Runner", "Duck", "Dynamic", "Factory", "Client", "Feign", "Gateway", "Convertor", "Adapter",
  "Advice", "Bridge", "Route", "Uploader", "Sftp", "Minio", "Parser", "Express", "Rule", "Template", "Generator",
  "Importer", "Engine", "Event", "Submitter", "Executor", "Context", "Status", "Type", "State",
];

const DOCS = new Set(["README.md", "readme.md", "HELP.md", "TECHNICAL_DESIGN.md"]);
const SKIPPED_DIRECTORIES = new Set([".git", "node_modules", "target", "build", "out", "${project.build.directory}"]);

const MYBATIS_CAPABILITIES = [
  {
    title: "Repository abstractions",
    sources: [
      {
        suffix: "/support/BaseRepository.java",
        patterns: [/public interface BaseRepository/, /int (insert|insertSelective|insertList|updateList|updateListSelective)\(/],
      },
      {
        suffix: "/support/BasePlusRepository.java",
        patterns: [/public interface BasePlusRepository/, /insertBatchSomeColumn/],
      },
    ],
  },
  {
    title: "Pagination and activation",
    sources: [
      { suffix: "/aop/EntityQueryAspect.java", patterns: [/@Around\(/, /PageHelper\.offsetPage/] },
      { suffix: "/config/PageQueryEntityConfigration.java", patterns: [/@ConditionalOnProperty/] },
      {
        suffix: "/YssMybatisMapperProperties.java",
        patterns: [
          /@ConfigurationProperties/,
          /private (String mapperLocation|String mapperScan|Integer batchSize|String dbType|PageHelper pageHelper|MybatisPlusPagination mybatisPlusPagination)/,
          /public static class (PageHelper|MybatisPlusPagination)/,
          /private Boolean enabled/,
        ],
      },
      {
        suffix: "/config/MapperConfiguration.java",
        patterns: [/new PageInterceptor\(/, /new PaginationInnerInterceptor\(/, /setBatchSize\(/, /setDbType\(/],
      },
    ],
  },
  {
    title: "SQL-level batch insertion",
    sources: [
      { suffix: "/config/BatchInsertSettings.java", patterns: [/DEFAULT_BATCH_SIZE/, /configuredBatchSize/] },
      { suffix: "/config/BatchSqlInjector.java", patterns: [/public class BatchSqlInjector/, /insertBatchSomeColumnInternal/, /FieldFill\.UPDATE/] },
      { suffix: "/config/DialectInsertBatchSomeColumn.java", patterns: [/public class DialectInsertBatchSomeColumn/, /DbType\.(ORACLE|ORACLE_12C|DM)/] },
    ],
  },
  {
    title: "Multi-data-source capability boundary",
    sources: [
      {
        suffix: "/MultiDataSourceHolder.java",
        patterns: [/public class MultiDataSourceHolder/, /Map<String, DataSource>/, /getMultiDataSource\(/],
      },
    ],
  },
];

const exists = async (target) => {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
};

async function walk(root) {
  if (!await exists(root)) return [];
  const output = [];
  for (const item of await readdir(root, { withFileTypes: true })) {
    const target = path.join(root, item.name);
    if (item.isDirectory() && !SKIPPED_DIRECTORIES.has(item.name)) output.push(...await walk(target));
    else if (item.isFile()) output.push(target);
  }
  return output;
}

function relative(root, target) {
  const value = path.relative(root, target).replaceAll(path.sep, "/");
  return value && !value.startsWith("..") ? value : target;
}

function runGit(root, args) {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

export function sourceState(root, componentPaths) {
  try {
    const commit = runGit(root, ["rev-parse", "HEAD"]);
    const componentWorktree = runGit(root, ["status", "--porcelain", "--", ...componentPaths]) ? "dirty" : "clean";
    const componentTrees = componentPaths.map((componentPath) => {
      let tree = "missing";
      try {
        tree = runGit(root, ["rev-parse", `HEAD:${componentPath}`]);
      } catch {
        // The path can be newly added or absent in the indexed commit.
      }
      return { path: componentPath, tree };
    });
    return { commit, componentWorktree, componentTrees };
  } catch {
    return {
      commit: "unavailable",
      componentWorktree: "unknown",
      componentTrees: componentPaths.map((componentPath) => ({ path: componentPath, tree: "unavailable" })),
    };
  }
}

async function sourceRoot() {
  if (process.env.YSS_SOURCE_ROOT) {
    const root = path.resolve(process.env.YSS_SOURCE_ROOT);
    if (await exists(path.join(root, "yss-microservice-components"))) return root;
    throw new Error(`YSS_SOURCE_ROOT must point to the repository root containing \`yss-microservice-components\`: ${root}`);
  }

  const home = os.homedir();
  const candidates = [
    process.cwd(),
    ...ancestors(process.cwd()),
    path.join(home, "Documents/yss-project/yss-cloud-microservice"),
    path.join(home, "Documents/yss-project"),
    path.join(home, "Projects/yss-cloud-microservice"),
    path.join(home, "Projects"),
  ];
  for (const base of [path.join(home, "Projects"), path.join(home, "Documents"), path.join(home, "Documents/yss-project")]) {
    if (!await exists(base)) continue;
    for (const entry of await readdir(base, { withFileTypes: true })) {
      if (entry.isDirectory()) candidates.push(path.join(base, entry.name));
    }
  }
  for (const root of candidates) {
    if (await exists(path.join(root, "yss-microservice-components"))) return path.resolve(root);
  }
  throw new Error("Could not find a YSS source repository containing `yss-microservice-components`. Export YSS_SOURCE_ROOT=/absolute/path/to/yss-cloud-microservice and rerun.");
}

function ancestors(start) {
  const output = [];
  let current = path.resolve(start);
  while (path.dirname(current) !== current) {
    current = path.dirname(current);
    output.push(current);
  }
  return output;
}

async function files(bases) {
  const output = { docs: [], poms: [], java: [], metadata: [] };
  for (const base of bases) {
    for (const target of await walk(base)) {
      if (DOCS.has(path.basename(target))) output.docs.push(target);
      else if (path.basename(target) === "pom.xml") output.poms.push(target);
      else if (target.endsWith(".java") && target.includes(`${path.sep}src${path.sep}main${path.sep}java${path.sep}`)) output.java.push(target);
      else if (path.basename(target) === "spring.factories") output.metadata.push(target);
    }
  }
  for (const items of Object.values(output)) items.sort();
  return output;
}

async function sha256(target) {
  return createHash("sha256").update(await readFile(target)).digest("hex");
}

function list(items, render, empty) {
  return items.length ? items.map(render) : [empty];
}

async function genericJavaEntries(source, javaFiles) {
  const selected = javaFiles
    .filter((target) => KEYS.some((key) => path.basename(target, ".java").includes(key)))
    .slice(0, 120);
  const output = [];
  for (const target of selected) {
    output.push(`- \`${relative(source, target)}\` — \`sha256:${await sha256(target)}\``);
  }
  return output.length ? output : ["- No key Java entry points matched the configured name patterns."];
}

function matchingLines(contents, patterns) {
  return contents
    .split(/\r?\n/)
    .map((line, index) => ({ line: index + 1, text: line.trim().replace(/\s+/g, " ") }))
    .filter(({ text }) => text && patterns.some((pattern) => pattern.test(text)))
    .slice(0, 14);
}

async function mybatisCapabilityMatrix(source, javaFiles, metadataFiles) {
  const output = ["## Capability Matrix", ""];
  for (const capability of MYBATIS_CAPABILITIES) {
    output.push(`### ${capability.title}`, "");
    for (const expected of capability.sources) {
      const target = javaFiles.find((candidate) => relative(source, candidate).endsWith(expected.suffix));
      if (!target) {
        output.push(`- \`${path.basename(expected.suffix)}\` — source not found.`);
        continue;
      }
      const sourcePath = relative(source, target);
      output.push(`- \`${sourcePath}\` — \`sha256:${await sha256(target)}\``);
      const lines = matchingLines(await readFile(target, "utf8"), expected.patterns);
      if (!lines.length) output.push("  - No configured public fact matched; refresh rules may need maintenance.");
      else for (const fact of lines) output.push(`  - \`${sourcePath}:${fact.line}\` — \`${fact.text.replaceAll("`", "'")}\``);
    }
    output.push("");
  }

  output.push("### Auto-configuration registration", "");
  for (const target of metadataFiles) {
    const sourcePath = relative(source, target);
    output.push(`- \`${sourcePath}\` — \`sha256:${await sha256(target)}\``);
    const registrations = (await readFile(target, "utf8"))
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
    for (const registration of registrations.slice(0, 12)) output.push(`  - \`${registration.replaceAll("`", "'")}\``);
  }
  if (!metadataFiles.length) output.push("- No `spring.factories` registration found.");
  output.push("");
  return output;
}

async function backendIndex({ skill, parts, source, found, now, stateResolver }) {
  const currentState = stateResolver(source, parts);
  const bases = parts.map((item) => path.join(source, item));
  const baseHints = await Promise.all(bases.map(async (target) =>
    `- \`${relative(source, target)}\` (${await exists(target) ? "existed" : "missing"} when indexed)`,
  ));
  const treeLines = currentState.componentTrees.map(({ path: componentPath, tree }) =>
    `Component tree \`${componentPath}\`: \`${tree}\``,
  );
  const lines = [
    `# ${skill} Source Index`,
    "",
    `Generated: ${now}`,
    `Source commit: \`${currentState.commit}\``,
    `Component worktree: \`${currentState.componentWorktree}\``,
    ...treeLines,
    "Indexed source root: resolved at refresh time; set `YSS_SOURCE_ROOT` to reproduce or refresh.",
    "",
    "This file is generated by `yss-skill-source-index-refresh/scripts/refresh-yss-skill-index.mjs`. Do not hand-edit generated sections.",
    "",
    "Paths are relocatable source hints. Exact guidance requires a matching component tree and a clean indexed component subtree; the repository commit is trace metadata and may differ when unrelated components change.",
    "",
    "## Component Path Hints",
    "",
    ...baseHints,
    "",
    "## Documentation Files",
    "",
    ...list(found.docs, (target) => `- \`${relative(source, target)}\``, "- No component documentation files found."),
    "",
    "Component documentation is a discovery aid. For API signatures, conditions and defaults, prefer the indexed source facts below when documentation differs.",
    "",
    "## Maven Modules",
    "",
    ...list(found.poms, (target) => `- \`${relative(source, path.dirname(target))}\``, "- No Maven modules found."),
    "",
  ];

  if (skill === "yss-mybatis") lines.push(...await mybatisCapabilityMatrix(source, found.java, found.metadata));
  else lines.push("## Key Java Entry Points", "", ...await genericJavaEntries(source, found.java), "");

  lines.push(
    "## Freshness and Use",
    "",
    "- Locate the current source root using `YSS_SOURCE_ROOT`, CodeGraph, Maven artifact names or repository search.",
    "- Compare each indexed `Component tree` with `git rev-parse HEAD:<component-path>` and require the current component subtree to be clean before exact guidance.",
    "- A repository commit difference alone is not stale when the component tree is unchanged; a component tree mismatch or component-local dirty state is stale.",
    "- Read only the source entries needed for the current decision or troubleshooting path.",
    "",
  );
  return lines.join("\n");
}

export async function refresh({
  skillsRoot,
  source,
  now = new Date().toISOString(),
  frontend = true,
  backendSkills = Object.keys(BACKEND),
  stateResolver = sourceState,
}) {
  const unknownSkills = backendSkills.filter((skill) => !(skill in BACKEND));
  if (unknownSkills.length) throw new Error(`Unknown backend source-index skill: ${unknownSkills.join(", ")}`);
  for (const skill of backendSkills) {
    const parts = BACKEND[skill];
    const bases = parts.map((item) => path.join(source, item));
    const found = await files(bases);
    const target = path.join(skillsRoot, skill, "references", "source-index.md");
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, await backendIndex({ skill, parts, source, found, now, stateResolver }), "utf8");
  }

  if (frontend) {
    for (const [skill, keys] of Object.entries(FRONTEND)) {
      if (!await exists(path.join(skillsRoot, skill))) continue;
      const target = path.join(skillsRoot, skill, "references", "frontend-docs.md");
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, [
        `# ${skill} Frontend Documentation`,
        "",
        `Generated: ${now}`,
        "",
        "Use these YSS UI documentation entry points as authoritative references when local repo examples are insufficient.",
        "",
        ...keys.map((key) => `- ${key}: ${URLS[key]}`),
        "",
        "When documentation and local code differ, inspect the current project code before editing and prefer established local usage.",
        "",
      ].join("\n"), "utf8");
    }
  }
  return { backend: backendSkills.length, frontend: frontend ? Object.keys(FRONTEND).length : 0 };
}

async function main() {
  try {
    const script = path.dirname(fileURLToPath(import.meta.url));
    const result = await refresh({
      skillsRoot: path.resolve(process.env.YSS_SKILLS_ROOT || path.join(script, "../..")),
      source: await sourceRoot(),
      frontend: !["0", "false", "no"].includes((process.env.YSS_REFRESH_FRONTEND || "true").toLowerCase()),
      backendSkills: process.env.YSS_REFRESH_BACKEND_SKILLS
        ? process.env.YSS_REFRESH_BACKEND_SKILLS.split(",").map((skill) => skill.trim()).filter(Boolean)
        : Object.keys(BACKEND),
    });
    console.log(`Updated ${result.backend} backend indexes and ${result.frontend} frontend doc references.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
