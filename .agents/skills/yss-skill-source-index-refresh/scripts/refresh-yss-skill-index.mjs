#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const BACKEND = {
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
  "yss-validation": ["yss-microservice-components/yss-component-validation-jsr303"],
  "yss-security-algorithm": ["yss-microservice-components/yss-component-security-algorithm"],
  "yss-userinfo": ["yss-microservice-components/yss-component-userinfo-starter"],
  "yss-exception": ["yss-microservice-components/yss-component-exception"],
};

export const BACKEND_PLATFORM_LINES = Object.freeze({
  "boot2-java8": Object.freeze({
    env: "YSS_SOURCE_ROOT_BOOT2_JAVA8",
    label: "Spring Boot 2.7 / Java 8 maintenance line",
  }),
  "boot3-java17": Object.freeze({
    env: "YSS_SOURCE_ROOT_BOOT3_JAVA17",
    label: "Spring Boot 3.5 / Java 17 mainline",
  }),
});

const BACKEND_PATH_OVERRIDES = Object.freeze({
  "boot2-java8": Object.freeze({}),
  "boot3-java17": Object.freeze({
    "yss-excel-mvc": Object.freeze(["yss-microservice-components/yss-component-excel-mvc"]),
  }),
});

export function backendComponentPaths(skill, platformLine) {
  if (!BACKEND_PLATFORM_LINES[platformLine]) throw new TypeError(`unknown backend component platform line: ${platformLine}`);
  if (!BACKEND[skill]) throw new TypeError(`unknown backend component skill: ${skill}`);
  return BACKEND_PATH_OVERRIDES[platformLine][skill] ?? BACKEND[skill];
}

export function backendPlatformIndexPath(skillsRoot, skill, platformLine) {
  if (!BACKEND_PLATFORM_LINES[platformLine]) throw new TypeError(`unknown backend component platform line: ${platformLine}`);
  return path.join(skillsRoot, skill, "references", `source-index.${platformLine}.md`);
}

const FRONTEND = {
  "yss-ui": ["components", "hooks", "skills"],
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

async function configuredSourceRoots() {
  const entries = [];
  for (const [platformLine, contract] of Object.entries(BACKEND_PLATFORM_LINES)) {
    const configured = process.env[contract.env];
    if (!configured) continue;
    const root = path.resolve(configured);
    if (!await exists(path.join(root, "yss-microservice-components"))) {
      throw new Error(`${contract.env} must point to the repository root containing \`yss-microservice-components\`: ${root}`);
    }
    entries.push([platformLine, root]);
  }
  if (entries.length === Object.keys(BACKEND_PLATFORM_LINES).length) return Object.fromEntries(entries);
  if (entries.length) {
    const missing = Object.values(BACKEND_PLATFORM_LINES).filter((item) => !process.env[item.env]).map((item) => item.env);
    throw new Error(`dual-track refresh requires both backend source roots; missing ${missing.join(", ")}`);
  }
  throw new Error(`Set both ${Object.values(BACKEND_PLATFORM_LINES).map((item) => item.env).join(" and ")} to clean, generation-specific YSS source roots.`);
}

async function files(bases) {
  const output = { docs: [], poms: [], java: [], metadata: [] };
  for (const base of bases) {
    for (const target of await walk(base)) {
      if (DOCS.has(path.basename(target))) output.docs.push(target);
      else if (path.basename(target) === "pom.xml") output.poms.push(target);
      else if (target.endsWith(".java") && target.includes(`${path.sep}src${path.sep}main${path.sep}java${path.sep}`)) output.java.push(target);
      else if (["spring.factories", "org.springframework.boot.autoconfigure.AutoConfiguration.imports"].includes(path.basename(target))) output.metadata.push(target);
    }
  }
  for (const items of Object.values(output)) items.sort();
  return output;
}

function xmlText(contents, tag) {
  const match = contents.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].trim() : null;
}

function xmlSection(contents, tag) {
  const match = contents.match(new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${tag}>`));
  return match?.[0] ?? null;
}

function xmlProperties(contents) {
  const block = xmlText(contents, "properties");
  if (!block) return {};
  return Object.fromEntries([...block.matchAll(/<([A-Za-z0-9_.-]+)(?:\s[^>]*)?>([^<]*)<\/\1>/g)]
    .map((match) => [match[1], match[2].trim()]));
}

function pomCoordinateText(contents, tag) {
  let direct = contents;
  for (const nested of ["parent", "properties", "modules", "dependencyManagement", "dependencies", "build", "profiles", "repositories", "pluginRepositories", "distributionManagement", "reporting"]) {
    direct = direct.replace(new RegExp(`<${nested}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${nested}>`, "g"), "");
  }
  return xmlText(direct, tag);
}

function resolveProperties(value, properties) {
  let result = value;
  for (let round = 0; result && round < 8; round += 1) {
    const next = result.replace(/\$\{([^}]+)\}/g, (whole, key) => properties[key] ?? whole);
    if (next === result) break;
    result = next;
  }
  return result;
}

export async function assertSourcePlatformLine(source, platformLine) {
  if (!BACKEND_PLATFORM_LINES[platformLine]) throw new TypeError(`unknown backend component platform line: ${platformLine}`);
  const rootPom = path.join(source, "pom.xml");
  if (!await exists(rootPom)) throw new Error(`backend source root has no pom.xml: ${source}`);
  const contents = (await readFile(rootPom, "utf8")).replace(/<!--[\s\S]*?-->/g, "");
  const parent = xmlSection(contents, "parent");
  const parentVersion = parent ? xmlText(parent, "version") : null;
  const properties = {
    ...xmlProperties(contents),
    "project.parent.version": parentVersion,
    "parent.version": parentVersion,
  };
  const javaVersion = resolveProperties(properties["java.version"] ?? properties["maven.compiler.release"] ?? properties["maven.compiler.source"], properties);
  const bootVersion = resolveProperties(properties["spring-boot.version"] ?? parentVersion, properties);
  const matches = platformLine === "boot2-java8"
    ? /^(?:1\.)?8(?:\D|$)/.test(javaVersion ?? "") && /^2\./.test(bootVersion ?? "")
    : /^17(?:\D|$)/.test(javaVersion ?? "") && /^3\./.test(bootVersion ?? "");
  if (!matches) throw new Error(`source root does not match ${platformLine}: java=${javaVersion ?? "unknown"}, spring-boot=${bootVersion ?? "unknown"}`);
  return { platformLine, javaVersion, bootVersion };
}

async function pomLineage(source, target, seen = new Set()) {
  const normalized = path.resolve(target);
  if (seen.has(normalized) || !await exists(normalized)) return [];
  seen.add(normalized);
  const contents = (await readFile(normalized, "utf8")).replace(/<!--[\s\S]*?-->/g, "");
  const parent = xmlSection(contents, "parent");
  let inherited = [];
  if (parent && !/<relativePath\s*\/>/.test(parent)) {
    const relativePath = xmlText(parent, "relativePath") ?? "../pom.xml";
    const parentPath = path.resolve(path.dirname(normalized), relativePath);
    const withinSource = path.relative(source, parentPath);
    if (!withinSource.startsWith("..") && !path.isAbsolute(withinSource)) inherited = await pomLineage(source, parentPath, seen);
  }
  const body = parent ? contents.replace(parent, "") : contents;
  const parentCoordinates = parent ? {
    groupId: xmlText(parent, "groupId"),
    artifactId: xmlText(parent, "artifactId"),
    version: xmlText(parent, "version"),
  } : {};
  return [...inherited, {
    path: relative(source, normalized),
    groupId: pomCoordinateText(body, "groupId"),
    artifactId: pomCoordinateText(body, "artifactId"),
    version: pomCoordinateText(body, "version"),
    parent: parentCoordinates,
    properties: xmlProperties(contents),
  }];
}

async function mavenAndPlatformFacts(source, pomFiles, javaFiles, metadataFiles) {
  const gavLines = [];
  const javaVersions = new Set();
  const bootVersions = new Set();
  for (const target of pomFiles) {
    const lineage = await pomLineage(source, target);
    const inheritedProperties = {};
    for (const item of lineage) {
      const itemParent = item.parent ?? {};
      const itemResolution = {
        ...inheritedProperties,
        ...item.properties,
        "project.groupId": item.groupId ?? itemParent.groupId,
        "project.artifactId": item.artifactId,
        "project.version": item.version ?? itemParent.version,
        "project.parent.groupId": itemParent.groupId,
        "project.parent.artifactId": itemParent.artifactId,
        "project.parent.version": itemParent.version,
        "parent.groupId": itemParent.groupId,
        "parent.artifactId": itemParent.artifactId,
        "parent.version": itemParent.version,
      };
      for (const [key, value] of Object.entries(item.properties)) inheritedProperties[key] = resolveProperties(value, itemResolution);
    }
    const current = lineage.at(-1) ?? {};
    const parent = current.parent ?? {};
    const properties = {
      ...inheritedProperties,
      "project.groupId": current.groupId ?? parent.groupId,
      "project.artifactId": current.artifactId,
      "project.version": current.version ?? parent.version,
      "project.parent.groupId": parent.groupId,
      "project.parent.artifactId": parent.artifactId,
      "project.parent.version": parent.version,
      "parent.groupId": parent.groupId,
      "parent.artifactId": parent.artifactId,
      "parent.version": parent.version,
    };
    const groupId = resolveProperties(current.groupId ?? parent.groupId ?? "unknown", properties);
    const artifactId = resolveProperties(current.artifactId ?? "unknown", properties);
    const version = resolveProperties(current.version ?? parent.version ?? "unknown", properties);
    const parentGav = parent.artifactId
      ? `${resolveProperties(parent.groupId ?? "unknown", properties)}:${resolveProperties(parent.artifactId, properties)}:${resolveProperties(parent.version ?? "unknown", properties)}`
      : "none";
    gavLines.push(`- \`${relative(source, target)}\` — GAV \`${groupId}:${artifactId}:${version}\`; parent \`${parentGav}\``);
    const javaVersion = inheritedProperties["java.version"] ?? inheritedProperties["maven.compiler.release"] ?? inheritedProperties["maven.compiler.source"];
    const bootVersion = inheritedProperties["spring-boot.version"]
      ?? (parent.groupId === "org.springframework.boot" ? parent.version : null);
    if (javaVersion) javaVersions.add(resolveProperties(javaVersion, properties));
    if (bootVersion) bootVersions.add(resolveProperties(bootVersion, properties));
  }
  let javaxFiles = 0;
  let jakartaFiles = 0;
  for (const target of javaFiles) {
    const contents = await readFile(target, "utf8");
    if (/\b(?:import|extends|implements|new)\s+javax\.|\bjavax\./.test(contents)) javaxFiles += 1;
    if (/\b(?:import|extends|implements|new)\s+jakarta\.|\bjakarta\./.test(contents)) jakartaFiles += 1;
  }
  const springFactories = metadataFiles.filter((target) => path.basename(target) === "spring.factories").length;
  const autoConfigurationImports = metadataFiles.filter((target) => path.basename(target) === "org.springframework.boot.autoconfigure.AutoConfiguration.imports").length;
  return {
    gavLines,
    platformLines: [
      `- Inherited Java signals: ${javaVersions.size ? [...javaVersions].map((item) => `\`${item}\``).join(", ") : "not declared in the local POM lineage"}.`,
      `- Inherited Spring Boot signals: ${bootVersions.size ? [...bootVersions].map((item) => `\`${item}\``).join(", ") : "not declared in the local POM lineage"}.`,
      `- Namespace source signals: \`javax.*\` in ${javaxFiles} main Java files; \`jakarta.*\` in ${jakartaFiles} main Java files.`,
      `- Auto-configuration metadata: ${springFactories} \`spring.factories\`; ${autoConfigurationImports} \`AutoConfiguration.imports\` files.`,
      "- These are source observations, not compatibility certification. Use the approved `platform_configuration` and verified compatibility evidence before integration or generation.",
    ],
  };
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

async function backendIndex({ skill, parts, source, platformLine, found, now, stateResolver }) {
  const currentState = stateResolver(source, parts);
  const bases = parts.map((item) => path.join(source, item));
  const baseHints = await Promise.all(bases.map(async (target) =>
    `- \`${relative(source, target)}\` (${await exists(target) ? "existed" : "missing"} when indexed)`,
  ));
  const treeLines = currentState.componentTrees.map(({ path: componentPath, tree }) =>
    `Component tree \`${componentPath}\`: \`${tree}\``,
  );
  const facts = await mavenAndPlatformFacts(source, found.poms, found.java, found.metadata);
  const lines = [
    `# ${skill} Source Index`,
    "",
    "Index schema: `backend-component-source-index-v2`",
    `Platform line: \`${platformLine}\``,
    `Generated: ${now}`,
    `Source commit: \`${currentState.commit}\``,
    `Component worktree: \`${currentState.componentWorktree}\``,
    ...treeLines,
    `Indexed source root: resolved at refresh time; set \`${BACKEND_PLATFORM_LINES[platformLine].env}\` to reproduce or refresh.`,
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
    ...(facts.gavLines.length ? facts.gavLines : ["- No Maven modules found."]),
    "",
    "## Platform Signals",
    "",
    ...facts.platformLines,
    "",
  ];

  if (skill === "yss-mybatis") lines.push(...await mybatisCapabilityMatrix(source, found.java, found.metadata));
  else lines.push("## Key Java Entry Points", "", ...await genericJavaEntries(source, found.java), "");

  lines.push(
    "## Freshness and Use",
    "",
    `- Locate the current source root using \`${BACKEND_PLATFORM_LINES[platformLine].env}\`, CodeGraph, Maven artifact names or repository search.`,
    "- Compare each indexed `Component tree` with `git rev-parse HEAD:<component-path>` and require the current component subtree to be clean before exact guidance.",
    `- Run \`node ../yss-skill-source-index-refresh/scripts/check-backend-skill-source-index.mjs --skill <skill-id> --platform-line ${platformLine} --source-root <root>\` from the canonical skill root before exact integration guidance.`,
    "- A repository commit difference alone is not stale when the component tree is unchanged; a component tree mismatch or component-local dirty state is stale.",
    "- Read only the source entries needed for the current decision or troubleshooting path.",
    "",
  );
  return lines.join("\n");
}

export async function refresh({
  skillsRoot,
  sources,
  now = new Date().toISOString(),
  frontend = true,
  backendSkills = Object.keys(BACKEND),
  stateResolver = sourceState,
}) {
  const unknownSkills = backendSkills.filter((skill) => !(skill in BACKEND));
  if (unknownSkills.length) throw new Error(`Unknown backend source-index skill: ${unknownSkills.join(", ")}`);
  const sourceEntries = Object.entries(sources ?? {});
  const unknownLines = sourceEntries.filter(([platformLine]) => !BACKEND_PLATFORM_LINES[platformLine]).map(([platformLine]) => platformLine);
  if (unknownLines.length) throw new Error(`Unknown backend platform line: ${unknownLines.join(", ")}`);
  if (backendSkills.length && sourceEntries.length === 0) throw new Error("Backend source-index refresh requires at least one explicit platform source root.");
  for (const [platformLine, source] of sourceEntries) await assertSourcePlatformLine(source, platformLine);
  for (const skill of backendSkills) {
    const referenceRoot = path.join(skillsRoot, skill, "references");
    await mkdir(referenceRoot, { recursive: true });
    for (const [platformLine, source] of sourceEntries) {
      const parts = backendComponentPaths(skill, platformLine);
      const bases = parts.map((item) => path.join(source, item));
      const found = await files(bases);
      const target = backendPlatformIndexPath(skillsRoot, skill, platformLine);
      await writeFile(target, await backendIndex({ skill, parts, source, platformLine, found, now, stateResolver }), "utf8");
    }
    await writeFile(path.join(referenceRoot, "source-index.md"), [
      `# ${skill} Source Index Router`,
      "",
      "Index schema: `backend-component-source-index-router-v1`",
      "",
      "Select the source index from the approved `platform_configuration.component_platform_line`; do not infer a line from imports, a branch name or a requested upgrade.",
      "",
      ...Object.entries(BACKEND_PLATFORM_LINES).map(([platformLine, contract]) =>
        `- \`${platformLine}\` — [${contract.label}](source-index.${platformLine}.md)`,
      ),
      "",
      "Run the freshness checker with the same explicit `--platform-line` and its matching clean source root before exact integration guidance.",
      "",
    ].join("\n"), "utf8");
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
  return { backend: backendSkills.length, backendTracks: backendSkills.length * sourceEntries.length, frontend: frontend ? Object.keys(FRONTEND).length : 0 };
}

async function main() {
  try {
    const script = path.dirname(fileURLToPath(import.meta.url));
    const result = await refresh({
      skillsRoot: path.resolve(process.env.YSS_SKILLS_ROOT || path.join(script, "../..")),
      sources: await configuredSourceRoots(),
      frontend: !["0", "false", "no"].includes((process.env.YSS_REFRESH_FRONTEND || "true").toLowerCase()),
      backendSkills: process.env.YSS_REFRESH_BACKEND_SKILLS
        ? process.env.YSS_REFRESH_BACKEND_SKILLS.split(",").map((skill) => skill.trim()).filter(Boolean)
        : Object.keys(BACKEND),
    });
    console.log(`Updated ${result.backendTracks} backend platform indexes for ${result.backend} skills and ${result.frontend} frontend doc references.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
